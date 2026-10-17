// Copies the ONNX Runtime WASM files that Transformers.js loads into apps/web/public/ort/, so the app serves
// them itself instead of fetching them from cdn.jsdelivr.net (D-015). The version is the one Transformers.js
// depends on, so the .mjs glue and the .wasm always match the library.
//   node scripts/copy-ort.ts
import { copyFileSync, mkdirSync, readdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, "apps", "web", "public", "ort");

/** The package directory of `name`, resolved from `from` (neither package exports ./package.json). */
function packageDir(from: string, name: string): string {
  const entry = createRequire(from).resolve(name).replaceAll("\\", "/");
  const marker = `/node_modules/${name}/`;
  const i = entry.lastIndexOf(marker);
  if (i < 0) throw new Error(`cannot find ${name} in ${entry}`);
  return entry.slice(0, i + marker.length - 1);
}

// Resolve onnxruntime-web the way @huggingface/transformers does, from its own package.
const transformers = packageDir(join(root, "libs", "embed", "package.json"), "@huggingface/transformers");
const ort = packageDir(join(transformers, "package.json"), "onnxruntime-web");
const { version } = JSON.parse(readFileSync(join(ort, "package.json"), "utf8")) as { version: string };
const dist = join(ort, "dist");

mkdirSync(out, { recursive: true });
const files = readdirSync(dist).filter((f) => /^ort-wasm-simd-threaded.*\.(mjs|wasm)$/.test(f));
if (files.length === 0) throw new Error(`no ort-wasm files in ${dist}`);
for (const f of files) copyFileSync(join(dist, f), join(out, f));
console.log(`onnxruntime-web ${version}: ${files.length} files -> ${out}`);
