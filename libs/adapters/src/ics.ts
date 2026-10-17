// A real source without OAuth: an iCalendar export (.ics) from Google
// Calendar, Apple Calendar or Outlook, chosen by the user with a file
// picker or the share sheet. Only SUMMARY, LOCATION, DTSTART and CREATED
// are read; DESCRIPTION, attendees and alarms are never looked at, which
// is the minimisation rule (ARCHITECTURE.md §2) applied before the
// snippet exists. Recurring events contribute their first occurrence.

import type { Adapter, IsoDate, ReadWindow, Snippet } from "@ahead/contract";
import { minimise } from "./index.ts";

/** Unfolds continuation lines (CRLF followed by a space or tab) per RFC 5545 §3.1. */
function unfold(text: string): string[] {
  return text.replace(/\r?\n[ \t]/g, "").split(/\r?\n/);
}

function unescapeText(value: string): string {
  return value.replace(/\\n/gi, " ").replace(/\\([,;\\])/g, "$1");
}

/** "20261101", "20261101T120000Z" or "2026-11-01" → "2026-11-01". Time of day is dropped. */
function toIsoDate(value: string): IsoDate | undefined {
  const m = /^(\d{4})-?(\d{2})-?(\d{2})/.exec(value.trim());
  return m ? `${m[1]}-${m[2]}-${m[3]}` : undefined;
}

export interface IcsEvent {
  uid: string;
  summary: string;
  location?: string;
  start: IsoDate;
  created?: IsoDate;
}

/** Parses the VEVENTs of an .ics text. Tolerant: an event without a start or summary is skipped. */
export function parseIcs(text: string): IcsEvent[] {
  const events: IcsEvent[] = [];
  let cur: Partial<IcsEvent> | undefined;
  let n = 0;
  for (const line of unfold(text)) {
    if (line === "BEGIN:VEVENT") {
      cur = {};
      continue;
    }
    if (line === "END:VEVENT") {
      if (cur?.summary && cur.start) {
        n++;
        const ev: IcsEvent = { uid: cur.uid ?? `ics-${n}`, summary: cur.summary, start: cur.start };
        if (cur.location) ev.location = cur.location;
        if (cur.created) ev.created = cur.created;
        events.push(ev);
      }
      cur = undefined;
      continue;
    }
    if (!cur) continue;
    const colon = line.indexOf(":");
    if (colon < 0) continue;
    const name = line.slice(0, colon).split(";")[0]?.toUpperCase();
    const value = line.slice(colon + 1);
    if (name === "SUMMARY") cur.summary = unescapeText(value).trim();
    else if (name === "LOCATION") cur.location = unescapeText(value).trim();
    else if (name === "UID") cur.uid = value.trim();
    else if (name === "DTSTART") cur.start = toIsoDate(value);
    else if (name === "CREATED") cur.created = toIsoDate(value);
  }
  return events;
}

export function icsToSnippets(events: readonly IcsEvent[]): Snippet[] {
  return events.map((e) => {
    const s: Snippet = {
      id: `cal-${e.uid}`,
      source: "calendar",
      date: e.start,
      text: e.location ? `${e.summary}, ${e.location}` : e.summary,
    };
    if (e.created) s.meta = { created: e.created };
    return s;
  });
}

/** The user's own calendar, from an export they chose to give the app. */
export class IcsAdapter implements Adapter {
  readonly source = "calendar" as const;
  private readonly items: Snippet[];
  constructor(icsText: string) {
    this.items = icsToSnippets(parseIcs(icsText));
  }
  async read(window: ReadWindow): Promise<Snippet[]> {
    return minimise("calendar", this.items, window);
  }
}
