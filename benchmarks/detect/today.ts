// What the app would show on the demo day: the detector's output on one
// phone with the default parameters. Usage: node benchmarks/detect/today.ts [--persona student] [--today 2026-10-17]

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { readEnabled, syntheticAdapters, windowEnding } from "@ahead/adapters";
import type { Snippet } from "@ahead/contract";
import { SOURCES } from "@ahead/contract";
import { PrototypeDetector } from "@ahead/detect";
import { embedder } from "@ahead/embed";

const args = process.argv.slice(2);
const opt = (name: string, dflt: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? (args[i + 1] ?? dflt) : dflt;
};
const persona = opt("persona", "student");
const today = opt("today", "2026-10-17");
const phone = JSON.parse(readFileSync(join(import.meta.dirname, `../../data/synthetic/${persona}.json`), "utf8")) as {
  snippets: Snippet[];
};
const snippets = await readEnabled(syntheticAdapters(phone.snippets), new Set(SOURCES), windowEnding(today));
const byId = new Map(snippets.map((s) => [s.id, s]));
const t0 = performance.now();
const events = await new PrototypeDetector(embedder("e5")).detect(snippets, today);
console.log(
  `${persona} on ${today}: ${snippets.length} snippets in the window, ${events.length} events, ${Math.round(performance.now() - t0)} ms including model load\n`,
);
for (const e of events) {
  console.log(`${e.type}  score ${e.score}  date ${e.estimatedDate ?? "?"}  place ${e.place ?? "?"}  first signal ${e.firstSignal}`);
  for (const ev of e.evidence) {
    const s = byId.get(ev.snippetId);
    console.log(`   ${ev.score.toFixed(2).padStart(5)}  ${s?.source.padEnd(9)} ${s?.date}  ${s?.text.slice(0, 72)}`);
  }
  console.log();
}
