// Replays every persona day by day with one parameter setting and prints
// each episode (an event type starting to fire) with the evidence on
// that day, marked true (in the truth and after its first signal) or
// FALSE. Usage: node benchmarks/detect/episodes.ts --model e5 --floor 0.6 --threshold 2.5

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { readEnabled, syntheticAdapters, windowEnding } from "@ahead/adapters";
import type { EventType, Snippet } from "@ahead/contract";
import { SOURCES } from "@ahead/contract";
import { PrototypeDetector } from "@ahead/detect";
import { embedder, type ModelKey } from "@ahead/embed";

const args = process.argv.slice(2);
const opt = (name: string, dflt: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? (args[i + 1] ?? dflt) : dflt;
};
const model = opt("model", "e5") as ModelKey;
const params = { floor: Number(opt("floor", "0.75")), threshold: Number(opt("threshold", "2.5")) };

interface Phone {
  persona: string;
  from: string;
  to: string;
  snippets: Snippet[];
  truth: { type: EventType; date: string; firstSignal: string }[];
}
const dir = join(import.meta.dirname, "../../data/synthetic");
const phones: Phone[] = readdirSync(dir)
  .filter((f) => f.endsWith(".json"))
  .map((f) => JSON.parse(readFileSync(join(dir, f), "utf8")));

function addDays(s: string, n: number) {
  const d = new Date(`${s}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

const emb = embedder(model);
console.log(`# ${model} floor ${params.floor} threshold ${params.threshold}`);
for (const phone of phones) {
  const det = new PrototypeDetector(emb, params);
  const all = await readEnabled(syntheticAdapters(phone.snippets), new Set(SOURCES), { from: phone.from, to: addDays(phone.to, 400) });
  await det.score(all);
  const byId = new Map(all.map((s) => [s.id, s]));
  console.log(`\n## ${phone.persona}`);
  const firing = new Set<string>();
  for (let day = addDays(phone.from, 30); day <= phone.to; day = addDays(day, 1)) {
    const events = await det.detect(await readEnabled(syntheticAdapters(all), new Set(SOURCES), windowEnding(day)), day);
    const now = new Set(events.map((e) => e.type));
    for (const e of events) {
      if (firing.has(e.type)) continue;
      const truth = phone.truth.find((t) => t.type === e.type);
      const ok = truth && day >= truth.firstSignal;
      console.log(
        `\n${ok ? "true " : "FALSE"} ${e.type} on ${day} score ${e.score} date ${e.estimatedDate ?? "?"} place ${e.place ?? "?"}`,
      );
      for (const ev of e.evidence) {
        const s = byId.get(ev.snippetId);
        console.log(`   ${ev.score.toFixed(2).padStart(6)} ${s?.source.padEnd(9)} ${s?.date} ${s?.text.slice(0, 64)}  ← ${ev.prototype}`);
      }
    }
    firing.clear();
    for (const t of now) firing.add(t);
  }
}
