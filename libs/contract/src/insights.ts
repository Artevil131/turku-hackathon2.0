// Deeper analysis of what the phone holds, all computed on the device from
// the same snippets and vectors the detector uses (ARCHITECTURE.md §2).
// Every type here is derived data: it lives in the app's store, is shown
// to the user, and is erased with everything else. Nothing here leaves
// the phone.

import type { DetectedEvent, EventType, IsoDate, Source } from "./index.ts";

/** One signal on an event's timeline: a snippet that counted, with its margin over ordinary life. */
export interface TimelineSignal {
  date: IsoDate;
  source: Source;
  snippetId: string;
  text: string;
  margin: number;
}

/** How the phone saw an event build up: the event's score per day over the window, and the signals behind it. */
export interface EventTimeline {
  type: EventType;
  from: IsoDate;
  to: IsoDate;
  /** One point per day; `score` is the detector's decayed sum on that day, `fired` whether it crossed the threshold. */
  points: { date: IsoDate; score: number; fired: boolean }[];
  signals: TimelineSignal[];
  threshold: number;
}

/** "Why we think so, as numbers": what each source contributed to an event's score. */
export interface SourceContribution {
  source: Source;
  /** Sum of margins from this source. */
  total: number;
  count: number;
  /** The single strongest snippet from this source. */
  strongest?: TimelineSignal;
}

/** A merchant or sender that recurs at a steady interval: routine, not an event. */
export interface Recurring {
  source: Source;
  /** Merchant, sender or place name as it appears in the snippet. */
  name: string;
  intervalDays: number;
  occurrences: number;
  lastDate: IsoDate;
  /** Present when the last interval broke the pattern (a payment that stopped or doubled). */
  anomaly?: "stopped" | "changed";
}

/** A shift in how much a source is used: activity before and after `date` (per week), found by a change-point test. */
export interface ChangePoint {
  source: Source;
  date: IsoDate;
  beforePerWeek: number;
  afterPerWeek: number;
}

/** A group of this month's snippets that belong together, labelled by their nearest prototype or their common words. */
export interface Cluster {
  label: string;
  /** The event type the cluster is nearest to, when any prototype is close; otherwise ordinary life. */
  nearest?: EventType;
  snippetIds: string[];
  /** 0..1, how far the cluster sits from everything seen in the previous period. */
  novelty: number;
}

/** "What changed in your life this month": the last 30 days against the 30 before. */
export interface Novelty {
  from: IsoDate;
  to: IsoDate;
  newSenders: string[];
  newMerchants: string[];
  newPlaces: string[];
  /** Snippets far from everything in the previous period, nearest first. */
  newTopics: TimelineSignal[];
  recurring: Recurring[];
  changePoints: ChangePoint[];
  clusters: Cluster[];
}

export type CrossInsightKind = "empty-home" | "same-month" | "weather-at-event" | "spend-shift" | "lapse";

/** Something two or more findings say together, that neither says alone. */
export interface CrossInsight {
  id: string;
  kind: CrossInsightKind;
  title: string;
  body: string;
  /** The period it concerns, when it has one. */
  from?: IsoDate;
  to?: IsoDate;
  eventIds: string[];
  /** Where the fact behind it comes from, when it is open data (an FMI warning, a rule). */
  sourceName?: string;
  sourceUrl?: string;
}

/** The next 90 days as the phone sees them: the events, the periods between them, and the risks in those periods. */
export interface Horizon {
  from: IsoDate;
  to: IsoDate;
  events: { event: DetectedEvent; date: IsoDate }[];
  insights: CrossInsight[];
}

// ---- Interfaces implemented by the analysis core ----

export interface Analyst {
  timeline(type: EventType, today: IsoDate): Promise<EventTimeline>;
  contributions(event: DetectedEvent): Promise<SourceContribution[]>;
  novelty(today: IsoDate): Promise<Novelty>;
  horizon(events: readonly DetectedEvent[], today: IsoDate): Promise<Horizon>;
}
