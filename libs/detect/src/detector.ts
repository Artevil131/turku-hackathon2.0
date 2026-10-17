// The matching rule (D-008). Every snippet is embedded once (cached by
// id). For each event type, a snippet's event score is its best cosine to
// that event's prototypes minus its best cosine to the ordinary-life
// prototypes. That margin is divided by `scale`, the typical margin a
// prototype itself has over ordinary life, so floor and threshold mean
// the same thing for every embedding model (e5's cosines span a fifth of
// MiniLM's). A snippet is evidence for its best event when its normalised
// margin clears `floor`. An event's score is the decayed sum of its
// evidence margins over the window; it fires above `threshold` when at
// least `minSources` sources contribute. Identical texts (the monthly rent,
// the usual shop) count once, and when they recur more than `maxRepeats`
// times in the window they are routine and count for nothing.

import type { DetectedEvent, Detector, DetectorOptions, Embedder, EventType, Evidence, IsoDate, Snippet } from "@ahead/contract";
import { EVENT_TYPES } from "@ahead/contract";
import { cosine } from "@ahead/embed";
import { datesIn, placeIn } from "./dates.ts";
import { ordinary, prototypes } from "./prototypes.ts";
import { fromSnapshot, toSnapshot, type VectorSnapshot } from "./snapshot.ts";

export interface DetectorParams {
  /** A text seen more often than this in the window is routine and never evidence; otherwise it counts once. */
  maxRepeats: number;
  /** Minimum margin (event similarity minus ordinary similarity) for a snippet to count. */
  floor: number;
  /** Event score needed to fire. */
  threshold: number;
  /** Half-life in days of a snippet's weight, counted from its date to today (future dates count as today). */
  halfLifeDays: number;
  /** Sources that must contribute evidence. */
  minSources: number;
}

export const DEFAULT_PARAMS: DetectorParams = { maxRepeats: 2, floor: 0.75, threshold: 2.5, halfLifeDays: 30, minSources: 2 };

export interface Scored {
  snippet: Snippet;
  type: EventType;
  margin: number;
  prototype: string;
}

/** The most frequent value; ties go to the one seen first in `xs`. */
function mostFrequent<T>(xs: readonly T[]): T | undefined {
  const counts = new Map<T, number>();
  for (const x of xs) counts.set(x, (counts.get(x) ?? 0) + 1);
  let best: T | undefined;
  let n = 0;
  for (const [x, c] of counts) {
    if (c > n) {
      best = x;
      n = c;
    }
  }
  return best;
}

function daysBetween(a: IsoDate, b: IsoDate): number {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86400000);
}

export class PrototypeDetector implements Detector {
  private readonly embedder: Embedder;
  readonly params: DetectorParams;
  private readonly cache: Map<string, Float32Array>;
  private protoVectors:
    | Promise<{ events: Map<EventType, { text: string; v: Float32Array }[]>; ordinary: Float32Array[]; scale: number }>
    | undefined;

  /** `cache` may be shared between detectors over the same embedder (the benchmark does). */
  constructor(embedder: Embedder, params: Partial<DetectorParams> = {}, cache = new Map<string, Float32Array>()) {
    this.embedder = embedder;
    this.params = { ...DEFAULT_PARAMS, ...params };
    this.cache = cache;
  }

  /** The model's margin unit (see the header comment); loads the prototypes. */
  async scale(): Promise<number> {
    return (await this.loadPrototypes()).scale;
  }

  /** The cached vectors, for persisting on the device (see snapshot.ts). */
  snapshot(): VectorSnapshot {
    return toSnapshot(this.embedder.id, this.embedder.dim, this.cache);
  }

  /** Loads vectors persisted earlier; ignored if they came from another model. Returns how many were loaded. */
  restore(snapshot: VectorSnapshot): number {
    const vs = fromSnapshot(snapshot, this.embedder.id, this.embedder.dim);
    for (const [id, v] of vs) this.cache.set(id, v);
    return vs.size;
  }

  /** Forget cached vectors, for the erase button. */
  clearCache(): void {
    this.cache.clear();
  }

  private loadPrototypes() {
    this.protoVectors ??= (async () => {
      const events = new Map<EventType, { text: string; v: Float32Array }[]>();
      for (const type of EVENT_TYPES) {
        const texts = prototypes[type];
        const vs = await this.embedder.embed(texts);
        events.set(
          type,
          texts.map((text, i) => ({ text, v: vs[i] as Float32Array })),
        );
      }
      const ord = await this.embedder.embed(ordinary);
      // Scale: the median, over event prototypes, of (best cosine to another prototype of the
      // same event) minus (best cosine to an ordinary sentence). A model-intrinsic unit.
      const margins: number[] = [];
      for (const ps of events.values()) {
        for (const p of ps) {
          let same = -1;
          for (const q of ps) if (q !== p) same = Math.max(same, cosine(p.v, q.v));
          let o = -1;
          for (const x of ord) o = Math.max(o, cosine(p.v, x));
          margins.push(same - o);
        }
      }
      margins.sort((a, b) => a - b);
      const scale = Math.max(1e-6, margins[Math.floor(margins.length / 2)] ?? 1);
      return { events, ordinary: ord, scale };
    })();
    return this.protoVectors;
  }

  private async vectors(snippets: readonly Snippet[]): Promise<Map<string, Float32Array>> {
    const missing = snippets.filter((s) => !this.cache.has(s.id));
    if (missing.length > 0) {
      const vs = await this.embedder.embed(missing.map((s) => s.text));
      for (const [i, s] of missing.entries()) this.cache.set(s.id, vs[i] as Float32Array);
    }
    return this.cache;
  }

  /** Per-snippet scores, exposed for the benchmark and for explaining. With `all`, below-floor snippets are returned too. */
  async score(snippets: readonly Snippet[], all = false): Promise<Scored[]> {
    const [protos, vecs] = await Promise.all([this.loadPrototypes(), this.vectors(snippets)]);
    const out: Scored[] = [];
    for (const s of snippets) {
      const v = vecs.get(s.id) as Float32Array;
      let ord = -1;
      for (const o of protos.ordinary) ord = Math.max(ord, cosine(v, o));
      let best: Scored | undefined;
      for (const [type, ps] of protos.events) {
        for (const p of ps) {
          const margin = (cosine(v, p.v) - ord) / protos.scale;
          if (!best || margin > best.margin) best = { snippet: s, type, margin, prototype: p.text };
        }
      }
      if (best && (all || best.margin >= this.params.floor)) out.push(best);
    }
    return out;
  }

  async detect(snippets: readonly Snippet[], today: IsoDate, options: DetectorOptions = {}): Promise<DetectedEvent[]> {
    const rejected = new Set(options.rejectedSnippetIds ?? []);
    const muted = new Set(options.mutedTypes ?? []);
    const counts = new Map<string, number>();
    const keyOf = (s: Snippet) => `${s.source}\u0000${s.text.toLowerCase().replace(/\s+/g, " ").trim()}`;
    for (const s of snippets) counts.set(keyOf(s), (counts.get(keyOf(s)) ?? 0) + 1);
    const seen = new Set<string>();
    const latestFirst = [...snippets].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
    const unique = latestFirst.filter((s) => {
      const k = keyOf(s);
      if ((counts.get(k) ?? 0) > this.params.maxRepeats || seen.has(k)) return false;
      seen.add(k);
      return true;
    });
    const scored = (await this.score(unique)).filter((x) => !rejected.has(x.snippet.id) && !muted.has(x.type));
    const byType = new Map<EventType, Scored[]>();
    for (const x of scored) byType.set(x.type, [...(byType.get(x.type) ?? []), x]);

    const events: DetectedEvent[] = [];
    for (const [type, xs] of byType) {
      let score = 0;
      const sources = new Set<string>();
      for (const x of xs) {
        const age = Math.max(0, daysBetween(x.snippet.date, today));
        score += x.margin * 2 ** (-age / this.params.halfLifeDays);
        sources.add(x.snippet.source);
      }
      if (score < this.params.threshold || sources.size < this.params.minSources) continue;
      const sorted = [...xs].sort((a, b) => b.margin - a.margin);
      const evidence: Evidence[] = sorted.map((x) => ({
        snippetId: x.snippet.id,
        score: Number(x.margin.toFixed(3)),
        prototype: x.prototype,
      }));
      // Date and place: a future calendar entry is the user's own statement and wins;
      // otherwise the most frequent future date and place in the evidence.
      const calendar = sorted.filter((x) => x.snippet.source === "calendar" && x.snippet.date >= today);
      const calendarDate = calendar.map((x) => x.snippet.date).sort()[0];
      const calendarPlace = calendar.map((x) => placeIn(x.snippet.text)).find((p) => p !== undefined);
      const future = mostFrequent(sorted.flatMap((x) => datesIn(x.snippet.text, today)).filter((d) => d >= today));
      const place = calendarPlace ?? mostFrequent(sorted.map((x) => placeIn(x.snippet.text)).filter((p): p is string => p !== undefined));
      const estimatedDate = calendarDate ?? future;
      const firstSignal = xs.map((x) => x.snippet.date).sort()[0] as IsoDate;
      const ev: DetectedEvent = {
        id: `${type}-${firstSignal}`,
        type,
        score: Number(score.toFixed(3)),
        evidence,
        firstSignal,
        detectedAt: today,
      };
      if (estimatedDate) ev.estimatedDate = estimatedDate;
      if (place) ev.place = place;
      events.push(ev);
    }
    return events.sort((a, b) => b.score - a.score);
  }
}
