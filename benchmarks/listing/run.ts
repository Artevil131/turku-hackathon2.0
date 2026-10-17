// The listing analyst against the synthetic ads (data/synthetic/listings.json):
// per field, correct, wrong, missed and invented, plus what validation
// dropped and seconds per ad. Needs an OpenAI-compatible server; on chili
// that is NInfer on 127.0.0.1:8010, reached with `ssh -N -L 8010:127.0.0.1:8010 chili`.
// --images renders each ad as a phone-sized page in headless Chrome and
// sends the screenshot instead of the text: transcription, then extraction.
// Usage: node benchmarks/listing/run.ts [--url http://127.0.0.1:8010] [--model qwen3.8-27b] [--thinking] [--images] [--out file.json]

import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { extractFromImage, extractListing, normalise } from "@ahead/listing";

const args = process.argv.slice(2);
const opt = (name: string, dflt: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? (args[i + 1] ?? dflt) : dflt;
};
const baseUrl = opt("url", "http://127.0.0.1:8010");
const model = opt("model", "qwen3.8-27b");
const thinking = args.includes("--thinking");
const out = opt("out", "");
const images = args.includes("--images");
const shots = images ? mkdtempSync(join(tmpdir(), "listing-shots-")) : "";

/** The ad as a plain classified page, screenshotted at phone size; returns a data: URL. */
function screenshot(ad: { id: string; text: string }): string {
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
  const [head, ...rest] = ad.text.split(/(?<=[.!])\s+|\n/);
  const html = `<!doctype html><meta charset="utf-8"><body style="margin:0;font:16px/1.45 system-ui;background:#f4f4f2;color:#222">
<div style="background:#2d4a3e;color:#fff;padding:14px 18px;font-weight:600">Ilmoitus</div>
<div style="height:150px;background:linear-gradient(135deg,#c9d3cf,#9fb0a8)"></div>
<div style="padding:16px 18px"><h1 style="font-size:21px;margin:0 0 10px">${esc(head ?? "")}</h1>
${rest.map((l) => `<p style="margin:0 0 8px">${esc(l)}</p>`).join("")}</div></body>`;
  const page = join(shots, `${ad.id}.html`);
  const png = join(shots, `${ad.id}.png`);
  writeFileSync(page, html);
  execFileSync(
    "google-chrome",
    ["--headless", "--disable-gpu", "--hide-scrollbars", `--screenshot=${png}`, "--window-size=420,820", `file://${page}`],
    {
      stdio: "ignore",
    },
  );
  return `data:image/png;base64,${readFileSync(png).toString("base64")}`;
}

interface Ad {
  id: string;
  text: string;
  truth: {
    kind: "listing" | "other";
    category?: string;
    fields?: Record<string, string | number>;
    mentions?: { risk: string; status: string; year?: number }[];
  };
}

const root = join(import.meta.dirname, "../..");
const { ads } = JSON.parse(readFileSync(join(root, "data/synthetic/listings.json"), "utf8")) as { ads: Ad[] };

/** Names the ad may use for the same thing. */
const ALIASES: Record<string, string> = { vw: "volkswagen", vasa: "vaasa" };
const canon = (s: string) => ALIASES[normalise(s)] ?? normalise(s);

function same(truth: string | number, got: unknown): boolean {
  if (typeof truth === "number") return typeof got === "number" && Math.abs(got - truth) < 0.01;
  if (typeof got !== "string") return false;
  const t = canon(truth);
  const g = canon(got);
  return t === g || g.startsWith(`${t} `) || g.includes(t);
}

const tally = { correct: 0, wrong: 0, missed: 0, invented: 0, kindOk: 0, categoryOk: 0 };
const ment = { found: 0, statusOk: 0, missed: 0, invented: 0 };
const dropped: Record<string, number> = {};
const rows: unknown[] = [];
const times: number[] = [];

for (const ad of ads) {
  const fields = ad.truth.fields ?? {};
  const mentions = ad.truth.mentions ?? [];
  let res: Awaited<ReturnType<typeof extractListing>>;
  try {
    res = images
      ? await extractFromImage(screenshot(ad), { baseUrl, model, thinking })
      : await extractListing(ad.text, { baseUrl, model, thinking });
  } catch (e) {
    console.log(`${ad.id.padEnd(28)} FAILED ${e instanceof Error ? e.message : e}`);
    tally.missed += Object.keys(fields).length;
    ment.missed += mentions.length;
    continue;
  }
  times.push(res.ms);
  const { listing } = res;
  if (listing.kind === ad.truth.kind) tally.kindOk++;
  if (listing.category === ad.truth.category || ad.truth.kind === "other") tally.categoryOk++;
  const got = listing.fields as Record<string, { value: unknown; quote: string }>;
  const notes: string[] = [];
  if (ad.truth.category && listing.category !== ad.truth.category) notes.push(`category=${listing.category}≠${ad.truth.category}`);
  for (const [name, value] of Object.entries(fields)) {
    const g = got[name];
    if (!g) {
      tally.missed++;
      notes.push(`-${name}`);
    } else if (same(value, g.value)) tally.correct++;
    else {
      tally.wrong++;
      notes.push(`${name}=${JSON.stringify(g.value)}≠${JSON.stringify(value)}`);
    }
  }
  // The title is the model's own short summary; it is shown, not scored.
  for (const name of Object.keys(got))
    if (name !== "title" && !(name in fields)) {
      tally.invented++;
      notes.push(`+${name}=${JSON.stringify(got[name]?.value)}`);
    }
  for (const m of mentions) {
    const g = listing.mentions.find((x) => x.risk === m.risk);
    if (!g) {
      ment.missed++;
      notes.push(`-mention:${m.risk}`);
      continue;
    }
    ment.found++;
    if (g.status === m.status) ment.statusOk++;
    else notes.push(`mention:${m.risk}.status=${g.status}≠${m.status}`);
  }
  for (const g of listing.mentions)
    if (!mentions.some((m) => m.risk === g.risk)) {
      ment.invented++;
      notes.push(`+mention:${g.risk}(${g.status}, “${g.quote}”)`);
    }
  for (const d of res.dropped) dropped[d.reason] = (dropped[d.reason] ?? 0) + 1;
  rows.push({ id: ad.id, ms: res.ms, attempts: res.attempts, notes, dropped: res.dropped, listing });
  console.log(
    `${ad.id.padEnd(28)} ${(listing.category ?? listing.kind).padEnd(11)} ${(res.ms / 1000).toFixed(1).padStart(5)} s  ${notes.join(" ") || "ok"}${res.dropped.length ? `  [dropped ${res.dropped.map((d) => `${d.field}:${d.reason}`).join(", ")}]` : ""}`,
  );
}

const stated = tally.correct + tally.wrong + tally.missed;
const sorted = [...times].sort((a, b) => a - b);
const summary = {
  model,
  thinking,
  input: images ? "screenshot" : "text",
  ads: ads.length,
  kindAccuracy: `${tally.kindOk}/${ads.length}`,
  categoryAccuracy: `${tally.categoryOk}/${ads.length}`,
  fields: stated,
  correct: tally.correct,
  wrong: tally.wrong,
  missed: tally.missed,
  invented: tally.invented,
  mentions: {
    stated: ment.found + ment.missed,
    found: ment.found,
    statusRight: ment.statusOk,
    missed: ment.missed,
    invented: ment.invented,
  },
  dropped,
  medianSeconds: sorted.length ? (sorted[Math.floor(sorted.length / 2)] ?? 0) / 1000 : undefined,
};
console.log("\n", summary);
if (out) writeFileSync(out, JSON.stringify({ summary, rows }, null, 2));
