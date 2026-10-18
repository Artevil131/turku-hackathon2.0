// Checks data/timing-drive.json against its sources and against Traficom's model names.
//   node apps/what-if/test/timing-drive.test.mjs           pass/fail per check, then coverage
//   node apps/what-if/test/timing-drive.test.mjs --show    also list every problem in full
// Coverage = share of Traficom's 2025 inspections (cars first registered 2005-2021) whose make, model and
// first-registration year has at least one entry. A covered model year may still have engines we left out.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const td = JSON.parse(readFileSync(join(root, "data", "timing-drive.json"), "utf8"));
const evidence = JSON.parse(readFileSync(join(root, "data", td.meta.evidenceFile), "utf8"));
const traficom = JSON.parse(readFileSync(join(root, "data", "traficom-inspections.json"), "utf8"));
const show = process.argv.includes("--show");
const ids = new Set();

const DRIVES = new Set(["belt", "chain", "wet belt"]);
const FUELS = new Set(["petrol", "diesel", "hybrid", "plug-in hybrid", "CNG"]);
const key = (make, model) => `${make}|${model}`;
const models = new Set(traficom.byModelAllYears.map((r) => key(r.make, r.model)));
const sources = new Map();
const problems = { sources: [], entries: [], models: [], overlaps: [] };

for (const s of td.meta.sources) {
  if (sources.has(s.id)) problems.sources.push(`duplicate source id ${s.id}`);
  if (!s.url?.startsWith("https://") && !s.url?.startsWith("http://")) problems.sources.push(`${s.id}: no URL`);
  if (typeof s.primary !== "boolean") problems.sources.push(`${s.id}: primary must be true or false`);
  sources.set(s.id, s);
}

const label = (e, i) => `#${i} ${e.make} ${e.model} ${e.engine?.badges?.join("/")} ${e.years?.join("-")}`;
td.entries.forEach((e, i) => {
  const bad = (msg) => problems.entries.push(`${label(e, i)}: ${msg}`);
  if (!models.has(key(e.make, e.model))) problems.models.push(`${label(e, i)}: not a Traficom make and model`);
  if (!sources.has(e.source)) bad(`unknown source id ${e.source}`);
  const extraIds = new Set([...sources.keys(), ...evidence.extraSourcesNotInMainFile.map((s) => s.id)]);
  for (const id of evidence.entries[e.id]?.extraSources ?? []) if (!extraIds.has(id)) bad(`unknown extra source id ${id}`);
  const src = sources.get(e.source);
  if (src && !src.primary && e.secondary !== true) bad(`source ${e.source} is secondary but the entry is not marked secondary: true`);
  if (typeof e.secondary !== "boolean") bad("secondary must be true or false");
  const [from, to] = e.years ?? [];
  if (!Number.isInteger(from) || !Number.isInteger(to) || from > to || from < 2005 || to > 2022)
    bad(`years ${e.years} not within 2005-2022`);
  if (!DRIVES.has(e.drive)) bad(`drive "${e.drive}"`);
  if (!FUELS.has(e.fuel)) bad(`fuel "${e.fuel}"`);
  if (!e.engine?.badges?.length) bad("no badges");
  if (e.drive === "chain" && (e.intervalKm != null || e.intervalYears != null)) bad("a chain has no change interval");
  for (const f of ["intervalKm", "intervalYears"]) if (e[f] != null && !(Number.isFinite(e[f]) && e[f] > 0)) bad(`${f} ${e[f]}`);
  if (!evidence.entries[e.id]?.evidence) bad("no evidence quote in the evidence file");
  if (ids.has(e.id)) bad(`duplicate id ${e.id}`);
  ids.add(e.id);
});

// Two entries overlap when make, model and fuel match, the years overlap and they share a badge: an ad could then
// match both. A model year whose engines differ must be split (or the shared badge left out) so this never happens.
// Two entries with the same make, model, fuel, years, engine codes and drive are duplicates.
const norm = (s) => s.toLowerCase().replace(/\s+/g, " ").trim();
for (let i = 0; i < td.entries.length; i++) {
  for (let j = i + 1; j < td.entries.length; j++) {
    const a = td.entries[i];
    const b = td.entries[j];
    if (a.make !== b.make || a.model !== b.model || a.fuel !== b.fuel) continue;
    if (a.years[1] < b.years[0] || b.years[1] < a.years[0]) continue;
    const badges = new Set(a.engine.badges.map(norm));
    const shared = b.engine.badges.map(norm).filter((x) => badges.has(x));
    if (shared.length) problems.overlaps.push(`${label(a, i)} and ${label(b, j)} share ${shared.join(", ")}`);
    const codes = (e) => (e.engine.codes ?? []).map(norm).sort().join(",");
    if (codes(a) && codes(a) === codes(b) && a.drive === b.drive && a.years.join() === b.years.join()) {
      problems.overlaps.push(`${label(a, i)} and ${label(b, j)} are duplicates`);
    }
  }
}

let failed = 0;
for (const [name, list] of Object.entries(problems)) {
  if (list.length) failed++;
  console.log(`${list.length ? "FAIL" : "pass"}  ${name.padEnd(9)} ${list.length ? `${list.length} problem(s)` : ""}`);
  for (const p of show ? list : list.slice(0, 5)) console.log(`      ${p}`);
}

// Coverage of 2025 inspections, from traficom-inspections.json.
const total = traficom.national.ages4to20.inspections;
let covered = 0;
let coveredPrimary = 0;
for (const r of traficom.byModel) {
  const hits = td.entries.filter(
    (e) => e.make === r.make && e.model === r.model && e.years[0] <= r.firstRegYear && r.firstRegYear <= e.years[1],
  );
  if (!hits.length) continue;
  covered += r.inspections;
  if (hits.some((e) => !e.secondary)) coveredPrimary += r.inspections;
}
const pct = (x) => `${((100 * x) / total).toFixed(1)} %`;
const primaryEntries = td.entries.filter((e) => !e.secondary).length;
const modelCount = new Set(td.entries.map((e) => key(e.make, e.model))).size;
console.log(
  `\n${td.entries.length} entries for ${modelCount} models from ${sources.size} sources; ${primaryEntries} rest on a primary source, ${td.entries.length - primaryEntries} on a secondary one.`,
);
console.log(
  `Model years with at least one entry: ${pct(covered)} of the ${total.toLocaleString("en")} inspections of 2025 (cars first registered 2005-2021).`,
);
console.log(`Model years with at least one primary-sourced entry: ${pct(coveredPrimary)}.`);
process.exit(failed ? 1 : 0);
