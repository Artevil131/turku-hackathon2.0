// Writes every persona to data/synthetic/<persona>.json. Deterministic:
// rerunning produces the same files, so a diff means the generator changed.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { generate } from "./generate.ts";
import { personas } from "./personas.ts";

const out = join(dirname(fileURLToPath(import.meta.url)), "../../../data/synthetic");
mkdirSync(out, { recursive: true });
for (const p of personas) {
  const phone = generate(p);
  writeFileSync(join(out, `${p.id}.json`), `${JSON.stringify(phone, null, 2)}\n`);
  const bySource: Record<string, number> = {};
  for (const s of phone.snippets) bySource[s.source] = (bySource[s.source] ?? 0) + 1;
  console.log(`${p.id}: ${phone.snippets.length} snippets`, bySource, `${phone.truth.length} events`);
}
