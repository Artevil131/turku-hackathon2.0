// Adapters turn a source into minimised snippets (ARCHITECTURE.md §2).
// For the demo every source is backed by a synthetic phone (D-010); a
// real calendar adapter would implement the same interface.

import type { Adapter, IsoDate, ReadWindow, Snippet, Source } from "@ahead/contract";
import { SNIPPET_MAX_CHARS, SOURCES } from "@ahead/contract";

/** Calendar is forward-looking: entries this far after `window.to` are read too. */
export const CALENDAR_LOOKAHEAD_DAYS = 240;

function addDays(s: IsoDate, n: number): IsoDate {
  const d = new Date(`${s}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Applies the rules every adapter must: the window, the cap, no empty text. */
export function minimise(source: Source, items: readonly Snippet[], window: ReadWindow): Snippet[] {
  const to = source === "calendar" ? addDays(window.to, CALENDAR_LOOKAHEAD_DAYS) : window.to;
  return (
    items
      .filter((s) => s.source === source && s.date >= window.from && s.date <= to)
      // An entry that did not exist yet (calendar `meta.created`) is not visible.
      .filter((s) => typeof s.meta?.created !== "string" || s.meta.created <= window.to)
      .map((s) => ({ ...s, text: s.text.trim().slice(0, SNIPPET_MAX_CHARS) }))
      .filter((s) => s.text.length > 0)
  );
}

/** An adapter over an in-memory list, which is what a synthetic phone is. */
export class SyntheticAdapter implements Adapter {
  readonly source: Source;
  private readonly items: readonly Snippet[];
  constructor(source: Source, items: readonly Snippet[]) {
    this.source = source;
    this.items = items;
  }
  async read(window: ReadWindow): Promise<Snippet[]> {
    return minimise(this.source, this.items, window);
  }
}

/** One adapter per source over the same synthetic phone. */
export function syntheticAdapters(items: readonly Snippet[]): Adapter[] {
  return SOURCES.map((source) => new SyntheticAdapter(source, items));
}

/** Reads the enabled sources and merges them, sorted by date. */
export async function readEnabled(adapters: readonly Adapter[], enabled: ReadonlySet<Source>, window: ReadWindow): Promise<Snippet[]> {
  const parts = await Promise.all(adapters.filter((a) => enabled.has(a.source)).map((a) => a.read(window)));
  return parts.flat().sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

/** The default window: the last `days` days up to and including `today` (D-009). */
export function windowEnding(today: IsoDate, days = 60): ReadWindow {
  return { from: addDays(today, -days), to: today };
}

export { IcsAdapter, type IcsEvent, icsToSnippets, parseIcs } from "./ics.ts";
