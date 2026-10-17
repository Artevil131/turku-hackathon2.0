// Sends What if…'s sample ads to /api/read and scores the answer against the sample answers (D-028).
//   node scripts/what-if-ai-eval.mjs [--url https://what-if.what-if.workers.dev] [--show]
// /api/read passes each ad to the team's listing reader, so a run uses 21 of the team's 120 ads an hour.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const load = (file) => JSON.parse(readFileSync(join(root, "apps", "what-if", "data", file), "utf8"));
const samples = load("sample-ads.json");
const moto = load("sample-ads-moto.json");

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : fallback;
};
const url = arg("url", "https://what-if.what-if.workers.dev").replace(/\/$/, "");
const show = process.argv.includes("--show");

// The fields the rules are tested on (apps/what-if/test/reader.test.mjs), without licence, which the page works out.
const CORE = {
  car: [
    "make",
    "model",
    "year",
    "km",
    "price",
    "previousPrice",
    "officeFee",
    "fuel",
    "gearbox",
    "sellerType",
    "city",
    "lastInspection",
    "flags.timingBeltReplaced",
    "flags.timingChain",
    "flags.serviceBook",
    "flags.rustMentioned",
  ],
  home: [
    "buildingYear",
    "livingAreaM2",
    "debtFreePrice",
    "sellingPrice",
    "debtShare",
    "maintenanceCharge",
    "financingCharge",
    "plotRentCharge",
    "city",
    "district",
    "rooms",
    "pipeRenovation.status",
    "pipeRenovation.years",
  ],
  rent: ["rent", "deposit", "depositMonths", "buildingYear", "livingAreaM2", "homeInsuranceRequired", "city", "district", "rooms"],
  moto: [
    "make",
    "model",
    "year",
    "km",
    "price",
    "officeFee",
    "engineCc",
    "powerKw",
    "sellerType",
    "city",
    "lastInspection",
    "abs",
    "modified",
  ],
};

const tests = [
  ...samples.tests.map((t) => ({ id: t.id, kind: t.kind, text: t.text, expected: t.expected })),
  ...moto.tests.map((t) => ({ id: t.id, kind: t.kind, text: t.text, expected: t.expected, strictNull: true })),
  ...moto.notSupported.map((t) => ({ id: t.id, kind: "other", text: t.text, expected: {} })),
];

const get = (o, path) => path.split(".").reduce((v, k) => (v == null ? v : v[k]), o);
const norm = (s) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[\s-]+/g, "");
// Loose where the page is loose: it looks models and cities up by name, so "Octavia Combi" finds "Octavia".
const same = (want, have) => {
  if (typeof want === "number" && typeof have === "number") return Math.abs(want - have) <= Math.max(0.011, Math.abs(want) * 0.005);
  if (typeof want === "string" && typeof have === "string") return norm(have).includes(norm(want)) || norm(want).includes(norm(have));
  return JSON.stringify(want) === JSON.stringify(have);
};

let kindOk = 0,
  fieldOk = 0,
  fieldAll = 0,
  empty = 0,
  errors = 0,
  ms = 0;
const misses = [];
for (const t of tests) {
  const started = Date.now();
  let body;
  try {
    const res = await fetch(`${url}/api/read`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text: t.text }),
    });
    body = await res.json();
  } catch (e) {
    body = { ok: false, error: `fetch failed: ${e.message}` };
  }
  ms += Date.now() - started;
  if (!body.ok) {
    errors++;
    misses.push(`${t.id}: ${body.error}${body.status ? ` (reader ${body.status})` : ""}`);
    continue;
  }
  if (body.kind !== t.kind) {
    misses.push(`${t.id}: kind ${body.kind}, want ${t.kind}`);
    continue;
  }
  kindOk++;
  if (t.kind === "other") {
    if (show)
      console.log(
        `\n${t.id}: ${body.draft.item}\n  asks: ${body.draft.asks.join(" | ")}\n  what-ifs: ${body.draft.whatIfs.map((w) => `${w.text} [${w.whoPays}]`).join(" | ")}`,
      );
    continue;
  }
  for (const f of CORE[t.kind]) {
    const want = get(t.expected, f);
    const have = get(body.fields, f);
    if (want === null && t.strictNull && f in t.expected) {
      fieldAll++;
      if (have == null) fieldOk++;
      else misses.push(`${t.id}: ${f} should be empty, got ${JSON.stringify(have)}`);
      continue;
    }
    if (want == null) continue;
    fieldAll++;
    if (same(want, have)) fieldOk++;
    // The reader leaves out what it can't quote; an empty field is a gap the rules fill, not a wrong value.
    else if (have == null) empty++;
    else misses.push(`${t.id}: ${f} ${JSON.stringify(have)}, want ${JSON.stringify(want)}`);
  }
}
console.log(`\n${url}/api/read on ${tests.length} sample ads`);
console.log(
  `  kinds ${kindOk}/${tests.length}, fields right ${fieldOk}/${fieldAll}, left empty ${empty}, errors ${errors}, ${Math.round(ms / tests.length)} ms per ad`,
);
for (const m of misses) console.log(`  - ${m}`);
