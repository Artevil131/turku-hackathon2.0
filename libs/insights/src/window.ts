// What the phone could see on a given day. Mirrors the adapters' window
// rule (libs/adapters): the last `windowDays` days, calendar entries up to
// `lookaheadDays` ahead, and nothing before its `meta.created`.

import type { IsoDate, Snippet } from "@ahead/contract";
import { addDays } from "@ahead/opendata";

export const WINDOW_DAYS = 60;
export const CALENDAR_LOOKAHEAD_DAYS = 240;

/** The day a snippet entered the phone: a calendar entry's creation date, otherwise its date. */
export function enteredOn(s: Snippet): IsoDate {
  const created = s.meta?.created;
  return typeof created === "string" && created < s.date ? created : s.date;
}

export function visibleOn(
  snippets: readonly Snippet[],
  day: IsoDate,
  windowDays = WINDOW_DAYS,
  lookaheadDays = CALENDAR_LOOKAHEAD_DAYS,
): Snippet[] {
  const from = addDays(day, -windowDays);
  const calendarTo = addDays(day, lookaheadDays);
  return snippets.filter((s) => {
    if (s.date < from) return false;
    if (s.date > (s.source === "calendar" ? calendarTo : day)) return false;
    return enteredOn(s) <= day;
  });
}

/** Snippets that entered the phone within [from, to], both inclusive. */
export function enteredBetween(snippets: readonly Snippet[], from: IsoDate, to: IsoDate): Snippet[] {
  return snippets.filter((s) => {
    const d = enteredOn(s);
    return d >= from && d <= to;
  });
}

export function round3(x: number): number {
  return Number(x.toFixed(3));
}
