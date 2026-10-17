import { readEnabled, SyntheticAdapter, syntheticAdapters, windowEnding } from "@ahead/adapters";
import type { Adapter, DetectedEvent, Detector, IsoDate, Snippet, Source } from "@ahead/contract";
import { mockMove, mockSnippets } from "@ahead/contract/mock";
import type { VectorSnapshot } from "@ahead/detect";

/** What "Check now" needs from the core: where snippets come from and what turns them into events. */
export interface Engine {
  adapters: readonly Adapter[];
  /** The adapters before a calendar file replaced the calendar one, so removing the file restores them. */
  baseAdapters?: readonly Adapter[];
  detector: Detector;
  /** The detector's vector cache, when it has one (the real core): saved after a check, restored at start. */
  vectors?: {
    snapshot(): VectorSnapshot;
    restore(snapshot: VectorSnapshot): number;
    clear(): void;
  };
}

/** First-use model download, as reported by @ahead/embed (WORK.md, A to B). */
export type EngineProgress = (p: { status: string; progress?: number; file?: string }) => void;

/**
 * Mock core: the real adapters over the contract's mock phone, and a stand-in detector that fires Emma's move
 * once two sources show its evidence (the two-source rule of D-008). Replaced by `createCoreEngine`.
 */
export function createMockEngine(): Engine {
  const detector: Detector = {
    async detect(snippets, _today, options) {
      const rejected = new Set(options?.rejectedSnippetIds ?? []);
      if (options?.mutedTypes?.includes(mockMove.type)) return [];
      const present = new Map(snippets.filter((s) => !rejected.has(s.id)).map((s) => [s.id, s]));
      const evidence = mockMove.evidence.filter((e) => present.has(e.snippetId));
      const sources = new Set(evidence.map((e) => present.get(e.snippetId)?.source));
      return sources.size >= 2 ? [{ ...mockMove, evidence }] : [];
    },
  };
  return { adapters: syntheticAdapters(mockSnippets), detector };
}

/**
 * The real core: A's prototype detector over the synthetic student phone. Loaded on demand so the model code
 * stays out of the main bundle. The model (~120 MB) downloads on the first `embed`, which is why `onProgress`
 * exists; one detector instance is kept so later checks reuse its vector cache.
 */
export async function createCoreEngine(onProgress?: EngineProgress): Promise<Engine> {
  // The student phone is committed (data/synthetic); loaded on demand like the model code.
  const phone = (await import("../../../data/synthetic/student.json")).default as { snippets: Snippet[] };
  const [{ PrototypeDetector }, { embedder, useLocalModels: serveModelsFrom }, { env }] = await Promise.all([
    import("@ahead/detect"),
    import("@ahead/embed"),
    import("@huggingface/transformers"),
  ]);
  // D-015: the model and the ONNX Runtime come from this app, never from huggingface.co or a CDN.
  // Renamed on import: it is not a React hook, whatever its name says.
  serveModelsFrom("/models/", "/ort/");
  // When the service worker caches everything, the library's own cache would only store the model twice.
  env.useBrowserCache = !navigator.serviceWorker?.controller;
  const detector = new PrototypeDetector(embedder("e5", onProgress));
  return {
    adapters: syntheticAdapters(phone.snippets),
    detector,
    vectors: { snapshot: () => detector.snapshot(), restore: (s) => detector.restore(s), clear: () => detector.clearCache() },
  };
}

/** `?engine=core` selects the real core; anything else is the mock, so the app always runs. */
export function createEngine(onProgress?: EngineProgress, search = location.search): Promise<Engine> {
  return new URLSearchParams(search).get("engine") === "core" ? createCoreEngine(onProgress) : Promise.resolve(createMockEngine());
}

/**
 * Uses the user's own calendar (snippets from an .ics file) instead of the phone's, or goes back to the phone's
 * when `calendar` is undefined. The detector, and with it the vector cache, stays the same.
 */
export function withCalendar(engine: Engine, calendar: readonly Snippet[] | undefined): Engine {
  const base = engine.baseAdapters ?? engine.adapters;
  const adapters = calendar ? [...base.filter((a) => a.source !== "calendar"), new SyntheticAdapter("calendar", calendar)] : base;
  return { ...engine, adapters, baseAdapters: base };
}

/** How far back the adapters read (D-009); the notice says it. */
export const WINDOW_DAYS = 60;

/** Reads the enabled sources through their adapters over the default window (D-009). */
export function readSnippets(engine: Engine, enabled: readonly Source[], today: IsoDate): Promise<Snippet[]> {
  return readEnabled(engine.adapters, new Set(enabled), windowEnding(today, WINDOW_DAYS));
}

export type { DetectedEvent };
