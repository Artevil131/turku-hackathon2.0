// On-device sentence embeddings with Transformers.js (D-005, D-007). The
// same code runs in Node for the benchmark and in the browser for the
// app; the model is downloaded once and cached by the library (browser
// Cache API, or ~/.cache/huggingface in Node).

import type { Embedder } from "@ahead/contract";
import { type FeatureExtractionPipeline, pipeline } from "@huggingface/transformers";

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

export type ProgressCallback = (p: { status: string; progress?: number; file?: string }) => void;

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
      progress_callback: this.onProgress as any,
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

/** Cosine similarity of two L2-normalised vectors is their dot product. */
export function cosine(a: Float32Array, b: Float32Array): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += (a[i] ?? 0) * (b[i] ?? 0);
  return s;
}
