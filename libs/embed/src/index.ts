// On-device sentence embeddings with Transformers.js (D-005, D-007). The
// same code runs in Node for the benchmark and in the browser for the
// app; the model is downloaded once and cached by the library (browser
// Cache API, or ~/.cache/huggingface in Node).

import type { Embedder } from "@ahead/contract";
import { env, type FeatureExtractionPipeline, pipeline } from "@huggingface/transformers";

export interface ModelSpec {
  /** Hugging Face id of an ONNX export. */
  id: string;
  dim: number;
  /** e5 models want this before every text. */
  prefix?: string;
  /** Quantisation to load, "q8" for phones. */
  dtype?: "fp32" | "fp16" | "q8" | "int8" | "uint8" | "q4";
}

export const MODELS = {
  e5: { id: "Xenova/multilingual-e5-small", dim: 384, prefix: "query: ", dtype: "q8" },
  minilm: { id: "Xenova/paraphrase-multilingual-MiniLM-L12-v2", dim: 384, dtype: "q8" },
} as const satisfies Record<string, ModelSpec>;

export type ModelKey = keyof typeof MODELS;

/**
 * Download progress for the app's bar. `progress` is 0..100 over every file
 * of the model together (Transformers.js reports per file; this adds them
 * up), `file` names the file currently moving, `status` is "progress" while
 * downloading, "ready" when the model is loaded.
 */
export type ProgressCallback = (p: { status: string; progress?: number; file?: string }) => void;

/** Turns the library's per-file events into one overall percentage. */
function overallProgress(
  cb: ProgressCallback,
): (e: { status: string; file?: string; loaded?: number; total?: number; progress?: number }) => void {
  const files = new Map<string, { loaded: number; total: number }>();
  return (e) => {
    if (e.status === "ready") {
      cb({ status: "ready", progress: 100 });
      return;
    }
    if (!e.file) return;
    if (e.status === "progress" || e.status === "done" || e.status === "initiate") {
      const total = e.total ?? files.get(e.file)?.total ?? 0;
      const loaded = e.status === "done" ? total : (e.loaded ?? files.get(e.file)?.loaded ?? 0);
      files.set(e.file, { loaded, total });
      let l = 0;
      let t = 0;
      for (const f of files.values()) {
        l += f.loaded;
        t += f.total;
      }
      cb({ status: "progress", file: e.file, progress: t > 0 ? Math.min(100, Math.round((100 * l) / t)) : 0 });
    }
  };
}

/** Lazily loads the pipeline on first `embed`; vectors are mean-pooled and L2-normalised. */
export class TransformersEmbedder implements Embedder {
  readonly id: string;
  readonly dim: number;
  private pipe: Promise<FeatureExtractionPipeline> | undefined;

  private readonly spec: ModelSpec;
  private readonly onProgress: ProgressCallback | undefined;

  constructor(spec: ModelSpec, onProgress?: ProgressCallback) {
    this.spec = spec;
    this.onProgress = onProgress;
    this.id = spec.id;
    this.dim = spec.dim;
  }

  private load(): Promise<FeatureExtractionPipeline> {
    this.pipe ??= pipeline("feature-extraction", this.spec.id, {
      dtype: this.spec.dtype ?? "q8",
      // biome-ignore lint/suspicious/noExplicitAny: the library's progress event type is not exported
      progress_callback: (this.onProgress ? overallProgress(this.onProgress) : undefined) as any,
    });
    return this.pipe;
  }

  async embed(texts: readonly string[]): Promise<Float32Array[]> {
    if (texts.length === 0) return [];
    const pipe = await this.load();
    const inputs = texts.map((t) => `${this.spec.prefix ?? ""}${t}`);
    const out = await pipe(inputs, { pooling: "mean", normalize: true });
    const data = out.data as Float32Array;
    const vectors: Float32Array[] = [];
    for (let i = 0; i < texts.length; i++) vectors.push(data.slice(i * this.dim, (i + 1) * this.dim));
    out.dispose();
    return vectors;
  }
}

export function embedder(key: ModelKey, onProgress?: ProgressCallback): TransformersEmbedder {
  return new TransformersEmbedder(MODELS[key], onProgress);
}

/**
 * Serve the model from our own server instead of huggingface.co: call it once
 * before the first `embed`. `path` is where `scripts/fetch-model.ts` put the
 * files, as a URL path (browser) or directory (Node); `ortPath` likewise for
 * the ONNX Runtime files (the app uses "/ort/").
 */
export function useLocalModels(path = "/models/", ortPath?: string): void {
  env.allowRemoteModels = false;
  env.allowLocalModels = true;
  env.localModelPath = path;
  // The ONNX Runtime WASM files are otherwise fetched from a CDN (D-015); `scripts/copy-ort.ts` puts them under /ort/.
  if (ortPath && env.backends.onnx.wasm) env.backends.onnx.wasm.wasmPaths = ortPath;
}

/** Cosine similarity of two L2-normalised vectors is their dot product. */
export function cosine(a: Float32Array, b: Float32Array): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += (a[i] ?? 0) * (b[i] ?? 0);
  return s;
}
