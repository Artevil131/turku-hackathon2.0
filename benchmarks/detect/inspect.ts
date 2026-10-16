// Prints per-snippet margins for one persona and model: the planted
// signals and traps by name, and the distribution over noise, so floor
// and threshold are chosen from numbers. Usage:
//   node benchmarks/detect/inspect.ts --model e5 --persona student

import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Snippet } from "@ahead/contract";
import { PrototypeDetector } from "@ahead/detect";
import { embedder, type ModelKey } from "@ahead/embed";
import { personas } from "@ahead/synthetic";

const args = process.argv.slice(2);
const opt = (name: string, dflt: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? (args[i + 1] ?? dflt) : dflt;
};
const model = opt("model", "e5") as ModelKey;
const personaId = opt("persona", "student");
const persona = personas.find((p) => p.id === personaId);
if (!persona) throw new Error(`no persona ${personaId}`);
const phone = JSON.parse(readFileSync(join(import.meta.dirname, `../../data/synthetic/${personaId}.json`), "utf8")) as {
  snippets: Snippet[];
};

const det = new PrototypeDetector(embedder(model));
const scored = await det.score(phone.snippets, true);
console.log(`scale ${(await det.scale()).toFixed(4)}`);
const planted = new Set(persona.planted.map((x) => x.text.slice(0, 300)));
const traps = new Set(persona.traps.map((x) => x.text.slice(0, 300)));

const fmt = (n: number) => n.toFixed(3).padStart(7);
console.log(`\n# ${model} / ${personaId}\n\n## planted\n`);
for (const x of scored.filter((x) => planted.has(x.snippet.text)).sort((a, b) => b.margin - a.margin))
  console.log(`${fmt(x.margin)}  ${x.type.padEnd(10)} ${x.snippet.source.padEnd(9)} ${x.snippet.text.slice(0, 70)}  ← ${x.prototype}`);
console.log("\n## traps\n");
for (const x of scored.filter((x) => traps.has(x.snippet.text)))
  console.log(`${fmt(x.margin)}  ${x.type.padEnd(10)} ${x.snippet.source.padEnd(9)} ${x.snippet.text.slice(0, 70)}  ← ${x.prototype}`);
const noise = scored.filter((x) => !planted.has(x.snippet.text) && !traps.has(x.snippet.text)).sort((a, b) => b.margin - a.margin);
const ms = noise.map((x) => x.margin);
const q = (p: number) => ms[Math.floor((ms.length - 1) * (1 - p))] ?? 0;
console.log(`\n## noise: n=${ms.length} max=${fmt(ms[0] ?? 0)} p99=${fmt(q(0.99))} p95=${fmt(q(0.95))} p50=${fmt(q(0.5))}\n`);
for (const x of noise.slice(0, 12))
  console.log(`${fmt(x.margin)}  ${x.type.padEnd(10)} ${x.snippet.source.padEnd(9)} ${x.snippet.text.slice(0, 70)}  ← ${x.prototype}`);
