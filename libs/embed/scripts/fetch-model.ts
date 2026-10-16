// Puts the model files where the app can serve them itself, so the demo
// does not depend on the venue's wifi or on huggingface.co (PLAN.md risk 1).
// Copies from the Transformers.js Node cache when the benchmark has
// already downloaded the model, else downloads from the Hub. Usage:
//   node libs/embed/scripts/fetch-model.ts [--model e5] [--out apps/web/public/models]
// The app then calls `useLocalModels("/models/")` before the first embed.

import { copyFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { MODELS, type ModelKey } from "../src/index.ts";

const args = process.argv.slice(2);
const opt = (name: string, dflt: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? (args[i + 1] ?? dflt) : dflt;
};
const key = opt("model", "e5") as ModelKey;
const spec = MODELS[key];
const out = resolve(opt("out", join(import.meta.dirname, "../models")));
const files = ["config.json", "tokenizer.json", "tokenizer_config.json", "onnx/model_quantized.onnx"];

const root = resolve(import.meta.dirname, "../../..");
const cacheDirs = [
  ...(await import("node:fs"))
    .readdirSync(join(root, "node_modules/.pnpm"))
    .filter((d) => d.startsWith("@huggingface+transformers@"))
    .map((d) => join(root, "node_modules/.pnpm", d, "node_modules/@huggingface/transformers/.cache")),
];

for (const file of files) {
  const target = join(out, spec.id, file);
  mkdirSync(dirname(target), { recursive: true });
  const cached = cacheDirs.map((c) => join(c, spec.id, file)).find((p) => existsSync(p));
  if (cached) {
    copyFileSync(cached, target);
    console.log(`copied   ${file}`);
    continue;
  }
  const url = `https://huggingface.co/${spec.id}/resolve/main/${file}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: ${res.status}`);
  writeFileSync(target, new Uint8Array(await res.arrayBuffer()));
  console.log(`fetched  ${file}`);
}
console.log(`model ${spec.id} is under ${out}`);
