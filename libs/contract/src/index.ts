// The contract between the on-device core (adapters, embedding, detection),
// the journeys and the app. Both machines code against this file; change it
// in its own small commit and tell the other side (WORK.md).

/** Where a snippet came from. Each source is a separate consent toggle. */
/**
 * Where a snippet came from. Each source is a separate consent toggle.
 * `sms` (Android: messages from services, never from people) and `wifi`
 * (networks the phone joined: a new network is a new place) are read on
 * the device like the rest; both are off by default and absent on iOS.
 */
export type Source = "calendar" | "mail" | "bank" | "places" | "photos" | "notifications" | "sms" | "wifi";

export const SOURCES: readonly Source[] = ["calendar", "mail", "bank", "places", "photos", "notifications", "sms", "wifi"];

/** Life events the detector knows. The first three are the demo (PLAN.md). */
export type EventType = "move" | "first_car" | "long_trip" | "child" | "pet" | "renovation";

export const EVENT_TYPES: readonly EventType[] = ["move", "first_car", "long_trip", "child", "pet", "renovation"];

/** ISO 8601 date, `YYYY-MM-DD`. Times of day are never needed. */
export type IsoDate = string;

/**
 * The minimised form of one item read from a source. This is the only
 * shape that reaches the embedder: a short text, a date, a source. The
 * adapter that produced it has already dropped bodies, attachments,
 * pixels and anything beyond the cap (ARCHITECTURE.md §2).
 */
export interface Snippet {
  id: string;
  source: Source;
  date: IsoDate;
  /** At most SNIPPET_MAX_CHARS characters. */
  text: string;
  /**
   * Free-form, source-specific and small: merchant, place name, amount band.
   * Calendar entries carry `created` (IsoDate): the entry is invisible before it.
   */
  meta?: Record<string, string | number>;
}

export const SNIPPET_MAX_CHARS = 300;

/** One piece of evidence behind a detected event. */
export interface Evidence {
  snippetId: string;
  /** Similarity to the best-matching prototype of the event, 0..1. */
  score: number;
  /** Which prototype matched, for explaining and for tuning. */
  prototype: string;
}

export interface DetectedEvent {
  id: string;
  type: EventType;
  /**
   * The detector's aggregated score that crossed its threshold: an unbounded
   * sum of evidence margins (typically 2 to 15), not a probability. Show the
   * evidence count and sources rather than this number.
   */
  score: number;
  /** Best guess of the event date, from dates found in the evidence; absent when unknown. */
  estimatedDate?: IsoDate;
  /** Best guess of a place (municipality or postcode) when the evidence names one. */
  place?: string;
  evidence: Evidence[];
  firstSignal: IsoDate;
  detectedAt: IsoDate;
}

export type LedgerStatus = "pending" | "confirmed" | "dismissed" | "never";

/** The user's answer to a detected event, and whether anything was shared. */
export interface LedgerEntry {
  event: DetectedEvent;
  status: LedgerStatus;
  /** Snippet ids the user marked "not this". They are excluded from re-detection. */
  rejectedEvidence: string[];
  /** True only after the user pressed the share button. Default false. */
  shared: boolean;
  answeredAt?: IsoDate;
}

export interface SourceState {
  source: Source;
  enabled: boolean;
  lastSync?: IsoDate;
}

export type JourneyItemKind = "todo" | "warning" | "insurance" | "compare" | "info";

export interface JourneyItem {
  id: string;
  kind: JourneyItemKind;
  title: string;
  body: string;
  /** When it should be done or when it applies. */
  due?: IsoDate;
  /** Where the fact comes from: an FMI feed, a DVV page, an If T&C clause. Shown to the user. */
  sourceUrl?: string;
  sourceName?: string;
  /** True when `sourceUrl` is the service that does the task (the card offers to open it), not where a fact comes from. */
  sourceIsService?: boolean;
  done?: boolean;
}

export interface Journey {
  eventId: string;
  eventType: EventType;
  title: string;
  items: JourneyItem[];
  builtAt: IsoDate;
}

/** What a journey builder is given. Everything here was confirmed by the user. */
export interface JourneyContext {
  event: DetectedEvent;
  /** Municipality name, e.g. "Turku", when known. */
  municipality?: string;
  postcode?: string;
  locale: "fi" | "en";
}

// ---- Interfaces implemented by the core ----

/** On-device sentence embedder. `id` names the model for the ledger and benchmarks. */
export interface Embedder {
  readonly id: string;
  readonly dim: number;
  embed(texts: readonly string[]): Promise<Float32Array[]>;
}

export interface ReadWindow {
  from: IsoDate;
  to: IsoDate;
}

/** Reads one source and returns minimised snippets. */
export interface Adapter {
  readonly source: Source;
  read(window: ReadWindow): Promise<Snippet[]>;
}

export interface DetectorOptions {
  /** Snippets rejected by the user are not evidence again. */
  rejectedSnippetIds?: readonly string[];
  /** Event types the user said "never" to. */
  mutedTypes?: readonly EventType[];
}

export interface Detector {
  detect(snippets: readonly Snippet[], today: IsoDate, options?: DetectorOptions): Promise<DetectedEvent[]>;
}

export interface JourneyBuilder {
  readonly eventType: EventType;
  build(context: JourneyContext): Promise<Journey>;
}

/** The single store the app reads and writes. Implemented over IndexedDB in the app. */
export interface Store {
  sources(): Promise<SourceState[]>;
  setSource(state: SourceState): Promise<void>;
  ledger(): Promise<LedgerEntry[]>;
  upsertLedger(entry: LedgerEntry): Promise<void>;
  journey(eventId: string): Promise<Journey | undefined>;
  putJourney(journey: Journey): Promise<void>;
  /** The erase button. Everything, including cached snippets and vectors. */
  eraseAll(): Promise<void>;
}

export type {
  Analyst,
  ChangePoint,
  Cluster,
  CrossInsight,
  CrossInsightKind,
  EventTimeline,
  Horizon,
  Novelty,
  Recurring,
  SourceContribution,
  TimelineSignal,
} from "./insights.ts";
