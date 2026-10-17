// The analyses as the app would show them on the demo day: the real
// Analyst with the e5 model over one synthetic phone.
// Usage: node benchmarks/insights/run.ts [--persona student] [--today 2026-10-17] [--fmi example|live]

import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Snippet, TimelineSignal } from "@ahead/contract";
import { PrototypeDetector } from "@ahead/detect";
import { embedder } from "@ahead/embed";
import { OnDeviceAnalyst, visibleOn } from "@ahead/insights";
import type { FmiWarning } from "@ahead/opendata";

const args = process.argv.slice(2);
const opt = (name: string, dflt: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? (args[i + 1] ?? dflt) : dflt;
};
const persona = opt("persona", "student");
const today = opt("today", "2026-10-17");
const fmi = opt("fmi", "example");
const root = join(import.meta.dirname, "../..");
const phone = JSON.parse(readFileSync(join(root, `data/synthetic/${persona}.json`), "utf8")) as { snippets: Snippet[] };
const warnings = (
  JSON.parse(readFileSync(join(root, `libs/opendata/data/fmi-${fmi === "live" ? "" : "example-"}warnings.json`), "utf8")) as {
    warnings: FmiWarning[];
  }
).warnings;

const detector = new PrototypeDetector(embedder("e5"));
const analyst = new OnDeviceAnalyst({ detector, snippets: phone.snippets, warnings });
const t0 = performance.now();
const events = await detector.detect(visibleOn(phone.snippets, today), today);
const ms = () => `${Math.round(performance.now() - t0)} ms`;
const sig = (s: TimelineSignal) => `${s.margin.toFixed(2).padStart(5)}  ${s.source.padEnd(9)} ${s.date}  ${s.text.slice(0, 64)}`;

console.log(
  `${persona} on ${today}: ${phone.snippets.length} snippets on the phone, ${events.length} events (${ms()} including model load)`,
);
console.log(events.map((e) => `  ${e.type} ${e.estimatedDate ?? "?"} ${e.place ?? ""} score ${e.score}`).join("\n"));

console.log(`\n== Timeline: move (${ms()})`);
const tl = await analyst.timeline("move", today);
const fired = tl.points.find((p) => p.fired);
console.log(
  `window ${tl.from}..${tl.to}, threshold ${tl.threshold}, first fired ${fired?.date ?? "never"}, today ${tl.points.at(-1)?.score}`,
);
const changes = tl.points.filter((p, i) => i === 0 || p.score !== tl.points[i - 1]?.score);
console.log(changes.map((p) => `  ${p.date}  ${p.score.toFixed(2).padStart(6)}  ${p.fired ? "fired" : ""}`).join("\n"));
console.log("signals:");
console.log(tl.signals.map((s) => `  ${sig(s)}`).join("\n"));

const move = events.find((e) => e.type === "move");
if (move) {
  console.log(`\n== Contributions: ${move.id} (${ms()})`);
  for (const c of await analyst.contributions(move))
    console.log(
      `  ${c.source.padEnd(9)} total ${c.total.toFixed(2).padStart(6)}  n ${String(c.count).padStart(2)}  strongest: ${c.strongest?.text.slice(0, 60)}`,
    );
}

const n = await analyst.novelty(today);
console.log(`\n== Novelty ${n.from}..${n.to} (${ms()})`);
console.log(`new senders:   ${n.newSenders.join(", ") || "-"}`);
console.log(`new merchants: ${n.newMerchants.join(", ") || "-"}`);
console.log(`new places:    ${n.newPlaces.join(", ") || "-"}`);
console.log("new topics (distance from the previous 30 days):");
console.log(n.newTopics.map((s) => `  ${sig(s)}`).join("\n"));
console.log("recurring:");
console.log(
  n.recurring
    .map(
      (r) =>
        `  ${r.source.padEnd(9)} ${r.name.padEnd(24)} every ${String(r.intervalDays).padStart(2)} d  x${r.occurrences}  last ${r.lastDate}${r.anomaly ? `  ${r.anomaly}` : ""}`,
    )
    .join("\n") || "  -",
);
console.log("change points:");
console.log(
  n.changePoints.map((c) => `  ${c.source.padEnd(9)} ${c.date}  ${c.beforePerWeek} -> ${c.afterPerWeek} per week`).join("\n") || "  -",
);
console.log("clusters:");
const byId = new Map(phone.snippets.map((s) => [s.id, s]));
for (const c of n.clusters) {
  console.log(`  ${c.label}${c.nearest ? ` [${c.nearest}]` : ""}  novelty ${c.novelty}  ${c.snippetIds.length} snippets`);
  const texts = [...new Set(c.snippetIds.map((id) => byId.get(id)?.text.slice(0, 40)))];
  console.log(`     ${texts.slice(0, 6).join(" | ")}${texts.length > 6 ? ` | +${texts.length - 6}` : ""}`);
}

console.log(`\n== Horizon (${ms()})`);
const h = await analyst.horizon(events, today);
console.log(`${h.from}..${h.to}: ${h.events.map((e) => `${e.event.type} ${e.date}`).join(", ") || "no dated events"}`);
for (const i of h.insights) {
  console.log(`  [${i.kind}] ${i.title}  (${i.from ?? ""}..${i.to ?? ""}; ${i.eventIds.join(", ")})`);
  console.log(`     ${i.body}`);
}
console.log(`\ndone in ${ms()}`);
