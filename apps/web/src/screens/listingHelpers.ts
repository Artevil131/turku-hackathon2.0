import type { Timeline } from "@ahead/listing";
import type { Locale } from "../i18n.tsx";

export interface QuotePart {
  start: number;
  text: string;
  highlighted: boolean;
  selected: boolean;
}

/** Literal, case-insensitive substrings, including repeated and overlapping quotes. No HTML from the ad is interpreted. */
export function quoteParts(text: string, quotes: readonly string[], selected = ""): QuotePart[] {
  const ranges: { from: number; to: number; selected: boolean }[] = [];
  for (const quote of new Set([...quotes, selected])) {
    if (!quote.trim()) continue;
    const pattern = new RegExp(quote.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
    let match = pattern.exec(text);
    while (match) {
      ranges.push({ from: match.index, to: match.index + match[0].length, selected: quote.toLowerCase() === selected.toLowerCase() });
      pattern.lastIndex = match.index + 1;
      match = pattern.exec(text);
    }
  }
  const cuts = [...new Set([0, text.length, ...ranges.flatMap((r) => [r.from, r.to])])].sort((a, b) => a - b);
  return cuts.slice(0, -1).map((start, i) => {
    const covering = ranges.filter((r) => r.from <= start && r.to >= (cuts[i + 1] ?? text.length));
    return {
      start,
      text: text.slice(start, cuts[i + 1]),
      highlighted: covering.length > 0,
      selected: covering.some((r) => r.selected),
    };
  });
}

export function formatEuro(eur: number, locale: Locale): string {
  return new Intl.NumberFormat(locale === "fi" ? "fi-FI" : "en-GB", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(eur);
}

/** One baseline and one scale for all years; an empty timeline never divides by zero. */
export function costBars(timeline: Pick<Timeline, "from" | "to" | "byYear">, height: number) {
  const years = Array.from({ length: Math.max(0, timeline.to - timeline.from + 1) }, (_, i) => timeline.from + i);
  const values = years.map((year) => Math.max(0, timeline.byYear[year] ?? 0));
  const max = Math.max(0, ...values);
  return {
    max,
    bars: years.map((year, i) => ({ year, eur: values[i] ?? 0, height: max === 0 ? 0 : ((values[i] ?? 0) / max) * height })),
  };
}
