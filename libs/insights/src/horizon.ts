// The next 90 days, and what the events say together: rules over the
// detected events, the dates in their evidence, the bank's change points
// and the FMI warnings the app passes in. Every sentence comes from
// strings.ts.

import type { ChangePoint, CrossInsight, DetectedEvent, Horizon, IsoDate, Snippet } from "@ahead/contract";
import { datesIn } from "@ahead/detect";
import { addDays, daysBetween, FMI_SOURCE, type FmiWarning, regionOfMunicipality } from "@ahead/opendata";
import { EVENT_LABEL, formatDate, STRINGS } from "./strings.ts";

export const HORIZON_DAYS = 90;
/** An exchange semester with no end date in the evidence is assumed to last this long. */
export const ASSUMED_TRIP_DAYS = 120;
/** A warning counts for an event when it overlaps the event's date by this many days either way. */
export const WEATHER_SLACK_DAYS = 3;

const END_WORDS = /päätty|irtisano|loppu|\bends?\b|terminat|last day|expir/i;
const START_WORDS = /alka|\bstarts?\b|begin|\bfrom\b|muutto|\bmove/i;
const UNTIL = /(?:until|till|to|asti|saakka)\s+([^()\n,;]{3,40})/i;
const RANGE =
  /(\d{1,2}\.\d{1,2}\.(?:\d{4})?|\d{1,2}\.?\s+[a-zäö]+\.?\s*(?:\d{4})?)\s*[–-]\s*(\d{1,2}\.\d{1,2}\.(?:\d{4})?|\d{1,2}\.?\s+[a-zäö]+\.?\s*(?:\d{4})?)/i;

export interface HorizonInputs {
  snippets: readonly Snippet[];
  warnings?: readonly FmiWarning[];
  changePoints?: readonly ChangePoint[];
}

function evidenceTexts(event: DetectedEvent, byId: ReadonlyMap<string, Snippet>): string[] {
  return event.evidence.map((e) => byId.get(e.snippetId)?.text).filter((t): t is string => t !== undefined);
}

/** When a trip ends, from "until 30 May", "(till 1.6.)", "10 Jan 2027 – 30 May 2027" in the evidence, or the first later date. */
export function tripEnd(texts: readonly string[], start: IsoDate, today: IsoDate): { end: IsoDate; assumed: boolean } {
  for (const t of texts) {
    const u = UNTIL.exec(t);
    const r = RANGE.exec(t);
    const cand = [...(u ? datesIn(u[1] ?? "", today) : []), ...(r ? datesIn(r[2] ?? "", today) : [])].filter((d) => d > start).sort();
    if (cand[0]) return { end: cand[0], assumed: false };
  }
  const later = texts
    .flatMap((t) => datesIn(t, today))
    .filter((d) => d > addDays(start, 1))
    .sort();
  if (later[0]) return { end: later[0], assumed: false };
  return { end: addDays(start, ASSUMED_TRIP_DAYS), assumed: true };
}

/** The old lease end and the new start in a move's evidence, when both are there. */
export function leaseDates(texts: readonly string[], today: IsoDate, start?: IsoDate): { end: IsoDate; start: IsoDate } | undefined {
  const ends: IsoDate[] = [];
  const starts: IsoDate[] = [];
  for (const t of texts) {
    const ds = datesIn(t, today);
    if (END_WORDS.test(t)) ends.push(...ds);
    else if (START_WORDS.test(t)) starts.push(...ds);
  }
  const s = start ?? starts.sort()[0];
  if (!s) return undefined;
  const end = ends
    .filter((d) => d <= addDays(s, 1))
    .sort()
    .at(-1);
  return end ? { end, start: s } : undefined;
}

function sameMonth(a: IsoDate, b: IsoDate): boolean {
  return a.slice(0, 7) === b.slice(0, 7);
}

export function horizon(events: readonly DetectedEvent[], today: IsoDate, inputs: HorizonInputs): Horizon {
  const to = addDays(today, HORIZON_DAYS);
  const byId = new Map(inputs.snippets.map((s) => [s.id, s]));
  const placed = events
    .filter((e): e is DetectedEvent & { estimatedDate: IsoDate } => !!e.estimatedDate && e.estimatedDate >= today && e.estimatedDate <= to)
    .map((event) => ({ event, date: event.estimatedDate }))
    .sort((a, b) => a.date.localeCompare(b.date));
  const insights: CrossInsight[] = [];

  for (const { event, date } of placed) {
    if (event.type === "long_trip") {
      const { end, assumed } = tripEnd(evidenceTexts(event, byId), date, today);
      insights.push({
        id: `empty-home-${event.id}`,
        kind: "empty-home",
        title: STRINGS.emptyHome.title,
        body: STRINGS.emptyHome.body(formatDate(date), formatDate(end), daysBetween(date, end), assumed),
        from: date,
        to: end,
        eventIds: [event.id],
      });
    }
    if (event.type === "move") {
      const lease = leaseDates(evidenceTexts(event, byId), today, date);
      if (lease && daysBetween(lease.end, lease.start) <= 1) {
        insights.push({
          id: `lapse-${event.id}`,
          kind: "lapse",
          title: STRINGS.lapse.title,
          body: STRINGS.lapse.body(formatDate(lease.end), formatDate(lease.start)),
          from: lease.end,
          to: lease.start,
          eventIds: [event.id],
        });
      }
    }
    const region = event.place ? regionOfMunicipality(event.place) : undefined;
    if (region) {
      const lo = addDays(date, -WEATHER_SLACK_DAYS);
      const hi = addDays(date, WEATHER_SLACK_DAYS);
      for (const w of inputs.warnings ?? []) {
        const onset = w.onset.slice(0, 10);
        const expires = w.expires.slice(0, 10);
        if (!w.regions.includes(region) || onset > hi || expires < lo) continue;
        const text = w.text.en ?? w.text.fi ?? w.text.sv;
        insights.push({
          id: `weather-${event.id}-${w.id}`,
          kind: "weather-at-event",
          title: STRINGS.weather.title(text?.headline || text?.event || w.eventCode),
          body: STRINGS.weather.body(EVENT_LABEL[event.type], formatDate(date), text?.description ?? ""),
          from: onset,
          to: expires,
          eventIds: [event.id],
          sourceName: FMI_SOURCE.name,
          sourceUrl: FMI_SOURCE.url,
        });
      }
    }
  }

  for (let i = 0; i < placed.length; i++) {
    for (let j = i + 1; j < placed.length; j++) {
      const a = placed[i];
      const b = placed[j];
      if (!a || !b || !sameMonth(a.date, b.date)) continue;
      insights.push({
        id: `same-month-${a.event.id}-${b.event.id}`,
        kind: "same-month",
        title: STRINGS.sameMonth.title(EVENT_LABEL[a.event.type], EVENT_LABEL[b.event.type].toLowerCase()),
        body: STRINGS.sameMonth.body(
          EVENT_LABEL[a.event.type],
          formatDate(a.date),
          EVENT_LABEL[b.event.type].toLowerCase(),
          formatDate(b.date),
        ),
        from: a.date,
        to: b.date,
        eventIds: [a.event.id, b.event.id],
      });
    }
  }

  const recent = addDays(today, -30);
  for (const cp of inputs.changePoints ?? []) {
    if (cp.source !== "bank" || cp.date < recent) continue;
    insights.push({
      id: `spend-shift-${cp.date}`,
      kind: "spend-shift",
      title: STRINGS.spendShift.title,
      body: STRINGS.spendShift.body(formatDate(cp.date), cp.beforePerWeek, cp.afterPerWeek),
      from: cp.date,
      to: today,
      eventIds: events.filter((e) => e.firstSignal <= today && e.firstSignal >= addDays(cp.date, -30)).map((e) => e.id),
    });
  }

  return { from: today, to, events: placed, insights };
}
