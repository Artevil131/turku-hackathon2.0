// The analysis seam: what the sky plate, the evidence timeline, the contribution bars, "This month" and the
// horizon read. Everything is computed on the phone from the same snippets the detector saw; nothing here
// leaves it. The real core (`?engine=core`) gives per-snippet scores for the sky and the on-device Analyst
// (@ahead/insights) for the rest; the mock engine's analyses are the contract's mock data, and say so.

import type {
  CrossInsight,
  DetectedEvent,
  EventTimeline,
  EventType,
  Horizon,
  IsoDate,
  Novelty,
  Snippet,
  Source,
  SourceContribution,
  TimelineSignal,
} from "@ahead/contract";
import { mockHorizon, mockMove, mockMoveContributions, mockMoveTimeline, mockNovelty } from "@ahead/contract/mock";
import type { FmiWarning } from "@ahead/opendata";
import type { Engine } from "./engine.ts";

/** One snippet as a star: where it sits (date, source) and how bright (its margin over ordinary life). */
export interface SkyDot {
  id: string;
  source: Source;
  date: IsoDate;
  /** The detector's normalised margin; undefined when the engine cannot score (drawn at the smallest magnitude). */
  margin?: number;
  /** The event type the snippet is nearest to, when scored. */
  type?: EventType;
}

/** The detector's thresholds the charts draw (the real core's DEFAULT_PARAMS; the mock timeline uses the same). */
export const THRESHOLD = 2.5;
export const HALF_LIFE_DAYS = 30;
const FLOOR = 0.75;

export interface Analysis {
  /**
   * Every snippet in the window with its margin, for the sky plate. With `score`, the detector scores them all
   * (the real core embeds, so only after a check); otherwise the events' evidence margins are all the plate knows.
   */
  sky(snippets: readonly Snippet[], events: readonly DetectedEvent[], options?: { score?: boolean }): Promise<SkyDot[]>;
  /** The event's score per day over the window, with the signals behind it. */
  timeline(event: DetectedEvent, snippets: readonly Snippet[], today: IsoDate): Promise<EventTimeline>;
  /** What each source contributed to the event's score. */
  contributions(event: DetectedEvent, snippets: readonly Snippet[]): Promise<SourceContribution[]>;
  /** The last 30 days against the 30 before. */
  novelty(today: IsoDate, snippets: readonly Snippet[]): Promise<Novelty>;
  /** The next 90 days: the events on their dates and the insights between them. */
  horizon(events: readonly DetectedEvent[], today: IsoDate, snippets: readonly Snippet[]): Promise<Horizon>;
  /** True while novelty and the horizon's insights are the contract's mock rather than computed from this phone. */
  readonly mocked: { novelty: boolean; horizon: boolean };
}

export function addDays(date: IsoDate, n: number): IsoDate {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function daysBetween(a: IsoDate, b: IsoDate): number {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86400000);
}

type Scored = { snippet: Snippet; type: EventType; margin: number; prototype: string };

/** The real detector exposes per-snippet scores; the mock does not. */
function scorer(engine: Engine): ((snippets: readonly Snippet[]) => Promise<Scored[]>) | undefined {
  const d = engine.detector as { score?: (s: readonly Snippet[], all?: boolean) => Promise<Scored[]> };
  return typeof d.score === "function" ? (s) => d.score?.(s, true) ?? Promise.resolve([]) : undefined;
}

/** Without a scorer, the evidence margins the detector already wrote into the event are the signals. */
function signalsFromEvidence(event: DetectedEvent, byId: ReadonlyMap<string, Snippet>): TimelineSignal[] {
  return event.evidence
    .map((ev) => {
      const s = byId.get(ev.snippetId);
      return s ? { date: s.date, source: s.source, snippetId: s.id, text: s.text, margin: ev.score } : undefined;
    })
    .filter((x): x is TimelineSignal => x !== undefined)
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** The detector's decayed sum, replayed day by day: the score the event had on each day of the window. */
export function replayTimeline(type: EventType, signals: readonly TimelineSignal[], from: IsoDate, to: IsoDate): EventTimeline {
  const points: EventTimeline["points"] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) {
    let score = 0;
    for (const s of signals) {
      if (s.date > d) continue;
      score += s.margin * 2 ** (-Math.max(0, daysBetween(s.date, d)) / HALF_LIFE_DAYS);
    }
    points.push({ date: d, score, fired: score >= THRESHOLD });
  }
  return { type, from, to, points, signals: [...signals], threshold: THRESHOLD };
}

export function contributionsOf(signals: readonly TimelineSignal[]): SourceContribution[] {
  const by = new Map<Source, SourceContribution>();
  for (const s of signals) {
    const c = by.get(s.source) ?? { source: s.source, total: 0, count: 0 };
    c.total += s.margin;
    c.count += 1;
    if (!c.strongest || s.margin > c.strongest.margin) c.strongest = s;
    by.set(s.source, c);
  }
  return [...by.values()].sort((a, b) => b.total - a.total);
}

/** The horizon's events are this phone's; the insights are the mock's until the analyst computes them. */
function horizonFor(events: readonly DetectedEvent[], today: IsoDate, insights: readonly CrossInsight[]): Horizon {
  const to = addDays(today, 90);
  const dated = events
    .filter((e): e is DetectedEvent & { estimatedDate: IsoDate } => !!e.estimatedDate && e.estimatedDate >= today && e.estimatedDate <= to)
    .map((event) => ({ event, date: event.estimatedDate }))
    .sort((a, b) => a.date.localeCompare(b.date));
  const ids = new Set(dated.map((d) => d.event.id));
  // The mock insights name the mock move; on this phone they attach to the move the phone found.
  const move = dated.find((d) => d.event.type === "move")?.event.id;
  const attached = insights.map((i) => ({
    ...i,
    eventIds: i.eventIds.map((id) => (id === mockMove.id && move ? move : id)).filter((id) => ids.has(id)),
  }));
  return { from: today, to, events: dated, insights: attached };
}

export function createAnalysis(engine: Engine, options: { warnings?: readonly FmiWarning[] } = {}): Analysis {
  const score = scorer(engine);
  const WINDOW = 60;
  // The real analyst is built over the snippets of the moment; one per snippet set, since the detector caches the vectors.
  let last: { snippets: readonly Snippet[]; analyst: ReturnType<NonNullable<Engine["analyst"]>> } | undefined;
  const analyst = engine.analyst
    ? (snippets: readonly Snippet[]) => {
        if (last?.snippets !== snippets) last = { snippets, analyst: engine.analyst?.(snippets, { warnings: options.warnings }) as never };
        return last.analyst;
      }
    : undefined;
  return {
    mocked: { novelty: !analyst, horizon: !analyst },
    async sky(snippets, events, options = {}) {
      const byId = new Map(snippets.map((s) => [s.id, s]));
      const margins = new Map<string, { margin: number; type: EventType }>();
      if (score && options.score) {
        for (const x of await score(snippets)) margins.set(x.snippet.id, { margin: x.margin, type: x.type });
      } else {
        for (const e of events)
          for (const ev of e.evidence) if (byId.has(ev.snippetId)) margins.set(ev.snippetId, { margin: ev.score, type: e.type });
      }
      return snippets.map((s) => ({ id: s.id, source: s.source, date: s.date, ...margins.get(s.id) }));
    },
    async timeline(event, snippets, today) {
      if (analyst) return analyst(snippets).timeline(event.type, today);
      const from = addDays(today, -WINDOW);
      // The mock phone's move has an authored timeline (seven signals over 60 days); every other event is replayed.
      if (!score && event.id === mockMove.id) return mockMoveTimeline;
      const byId = new Map(snippets.map((s) => [s.id, s]));
      let signals: TimelineSignal[];
      if (score) {
        const scored = await score(snippets);
        signals = scored
          .filter((x) => x.type === event.type && x.margin >= FLOOR)
          .map((x) => ({ date: x.snippet.date, source: x.snippet.source, snippetId: x.snippet.id, text: x.snippet.text, margin: x.margin }))
          .sort((a, b) => a.date.localeCompare(b.date));
        if (signals.length === 0) signals = signalsFromEvidence(event, byId);
      } else {
        signals = signalsFromEvidence(event, byId);
      }
      return replayTimeline(event.type, signals, from, today);
    },
    async contributions(event, snippets) {
      if (analyst) return analyst(snippets).contributions(event);
      if (!score && event.id === mockMove.id) return mockMoveContributions;
      const byId = new Map(snippets.map((s) => [s.id, s]));
      return contributionsOf(signalsFromEvidence(event, byId));
    },
    async novelty(today, snippets) {
      if (analyst) return analyst(snippets).novelty(today);
      return { ...mockNovelty, to: today, from: addDays(today, -30) };
    },
    async horizon(events, today, snippets) {
      if (analyst) return analyst(snippets).horizon(events, today);
      return horizonFor(events, today, mockHorizon.insights);
    },
  };
}
