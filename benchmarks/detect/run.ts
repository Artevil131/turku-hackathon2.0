// Runs the detector over every synthetic phone, day by day, for each
// model and a grid of parameters. Prints, per setting: for each planted
// event, the day it was first detected (lead time before the event), and
// the number of false episodes (an event type firing that is not in the
// truth, or firing before its first signal). Usage:
//   node benchmarks/detect/run.ts [--models e5,minilm] [--persona student]

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { readEnabled, syntheticAdapters, windowEnding } from "@ahead/adapters";
import type { EventType, Snippet } from "@ahead/contract";
import { SOURCES } from "@ahead/contract";
import { type DetectorParams, PrototypeDetector } from "@ahead/detect";
import { embedder, type ModelKey } from "@ahead/embed";

interface Phone {
  persona: string;
  from: string;
  to: string;
  snippets: Snippet[];
  truth: { type: EventType; date: string; firstSignal: string }[];
}

const args = process.argv.slice(2);
const opt = (name: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const models = (opt("models") ?? "e5,minilm").split(",") as ModelKey[];
const only = opt("persona");

const dir = join(import.meta.dirname, "../../data/synthetic");
const phones: Phone[] = readdirSync(dir)
  .filter((f) => f.endsWith(".json") && (!only || f === `${only}.json`))
  .map((f) => JSON.parse(readFileSync(join(dir, f), "utf8")));

const grid: Partial<DetectorParams>[] = [];
for (const floor of [0.45, 0.6, 0.75]) for (const threshold of [1.5, 2.0, 2.5, 3.5]) grid.push({ floor, threshold });

function addDays(s: string, n: number) {
  const d = new Date(`${s}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

interface Row {
  model: string;
  floor: number;
  threshold: number;
  persona: string;
  detected: Record<string, string | undefined>;
  lead: Record<string, number | undefined>;
  falseEpisodes: number;
  falseTypes: string;
}

const rows: Row[] = [];
for (const key of models) {
  const t0 = performance.now();
  const emb = embedder(key);
  await emb.embed(["warm up"]);
  for (const phone of phones) {
    const all = await readEnabled(syntheticAdapters(phone.snippets), new Set(SOURCES), { from: phone.from, to: addDays(phone.to, 400) });
    const cache = new Map<string, Float32Array>();
    await new PrototypeDetector(emb, {}, cache).score(all); // embed everything once; every setting shares the cache
    for (const p of grid) {
      const det = new PrototypeDetector(emb, p, cache);
      const firstDetected: Record<string, string> = {};
      let falseEpisodes = 0;
      const falseTypes = new Set<string>();
      const firing = new Set<string>();
      for (let day = addDays(phone.from, 30); day <= phone.to; day = addDays(day, 1)) {
        const w = windowEnding(day);
        const snippets = await readEnabled(syntheticAdapters(all), new Set(SOURCES), w);
        const events = await det.detect(snippets, day);
        const now = new Set(events.map((e) => e.type));
        for (const type of now) {
          const truth = phone.truth.find((t) => t.type === type);
          if (truth && day >= truth.firstSignal) {
            firstDetected[type] ??= day;
            continue;
          }
          if (firing.has(type)) continue;
          falseEpisodes++;
          falseTypes.add(type);
        }
        firing.clear();
        for (const t of now) firing.add(t);
      }
      const detected: Row["detected"] = {};
      const lead: Row["lead"] = {};
      for (const t of phone.truth) {
        detected[t.type] = firstDetected[t.type];
        const d = firstDetected[t.type];
        lead[t.type] = d ? Math.round((Date.parse(t.date) - Date.parse(d)) / 86400000) : undefined;
      }
      rows.push({
        model: key,
        floor: p.floor as number,
        threshold: p.threshold as number,
        persona: phone.persona,
        detected,
        lead,
        falseEpisodes,
        falseTypes: [...falseTypes].join(","),
      });
    }
  }
  console.error(`${key}: ${Math.round((performance.now() - t0) / 1000)} s`);
}

// One table per model: rows are parameter settings, columns are persona results.
for (const key of models) {
  console.log(`\n## ${key}\n`);
  console.log(`| floor | thr | ${phones.map((p) => `${p.persona}: detected (lead d) / false`).join(" | ")} |`);
  console.log(`|---|---|${phones.map(() => "---").join("|")}|`);
  for (const p of grid) {
    const cells = phones.map((ph) => {
      const r = rows.find((r) => r.model === key && r.floor === p.floor && r.threshold === p.threshold && r.persona === ph.persona);
      if (!r) return "";
      const hits = ph.truth.map((t) => `${t.type} ${r.lead[t.type] === undefined ? "MISS" : `+${r.lead[t.type]}`}`).join(", ");
      return `${hits || "–"} / ${r.falseEpisodes}${r.falseTypes ? ` (${r.falseTypes})` : ""}`;
    });
    console.log(`| ${p.floor} | ${p.threshold} | ${cells.join(" | ")} |`);
  }
}
