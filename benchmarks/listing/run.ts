// The listing analyst against the synthetic ads (data/synthetic/listings.json):
// per field, correct, wrong, missed and invented, plus what validation
// dropped and seconds per ad. Needs an OpenAI-compatible server; on chili
// that is NInfer on 127.0.0.1:8010, reached with `ssh -N -L 8010:127.0.0.1:8010 chili`.
// Usage: node benchmarks/listing/run.ts [--url http://127.0.0.1:8010] [--model qwen3.8-27b] [--thinking] [--out file.json]

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { extractListing, normalise } from "@ahead/listing";

const args = process.argv.slice(2);
const opt = (name: string, dflt: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? (args[i + 1] ?? dflt) : dflt;
};
const baseUrl = opt("url", "http://127.0.0.1:8010");
const model = opt("model", "qwen3.8-27b");
const thinking = args.includes("--thinking");
const out = opt("out", "");

interface Ad {
  id: string;
  text: string;
  truth: Record<string, string | number> & { kind: string };
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

const tally = { correct: 0, wrong: 0, missed: 0, invented: 0, kindOk: 0 };
const dropped: Record<string, number> = {};
const rows: unknown[] = [];
const times: number[] = [];

for (const ad of ads) {
  const { kind, ...fields } = ad.truth;
  let res: Awaited<ReturnType<typeof extractListing>>;
  try {
    res = await extractListing(ad.text, { baseUrl, model, thinking });
  } catch (e) {
    console.log(`${ad.id.padEnd(28)} FAILED ${e instanceof Error ? e.message : e}`);
    tally.missed += Object.keys(fields).length;
    continue;
  }
  times.push(res.ms);
  if (res.listing.kind === kind) tally.kindOk++;
  const got = (res.listing.car ?? res.listing.flat ?? {}) as Record<string, { value: unknown; quote: string }>;
  const notes: string[] = [];
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
  for (const name of Object.keys(got))
    if (!(name in fields)) {
      tally.invented++;
      notes.push(`+${name}=${JSON.stringify(got[name]?.value)}`);
    }
  for (const d of res.dropped) dropped[d.reason] = (dropped[d.reason] ?? 0) + 1;
  rows.push({ id: ad.id, kind: res.listing.kind, ms: res.ms, attempts: res.attempts, notes, dropped: res.dropped, listing: res.listing });
  console.log(
    `${ad.id.padEnd(28)} ${res.listing.kind.padEnd(5)} ${(res.ms / 1000).toFixed(1).padStart(5)} s  ${notes.join(" ") || "ok"}${res.dropped.length ? `  [dropped ${res.dropped.map((d) => `${d.field}:${d.reason}`).join(", ")}]` : ""}`,
  );
}

const stated = tally.correct + tally.wrong + tally.missed;
const sorted = [...times].sort((a, b) => a - b);
const summary = {
  model,
  thinking,
  ads: ads.length,
  kindAccuracy: `${tally.kindOk}/${ads.length}`,
  fields: stated,
  correct: tally.correct,
  wrong: tally.wrong,
  missed: tally.missed,
  invented: tally.invented,
  dropped,
  medianSeconds: sorted.length ? (sorted[Math.floor(sorted.length / 2)] ?? 0) / 1000 : undefined,
};
console.log("\n", summary);
if (out) writeFileSync(out, JSON.stringify({ summary, rows }, null, 2));
