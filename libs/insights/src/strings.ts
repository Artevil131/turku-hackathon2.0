// Every sentence the analyses show, in one place, so the app can localise
// later by swapping this table. Dates are passed in already formatted.

import type { EventType } from "@ahead/contract";

export const EVENT_LABEL: Record<EventType, string> = {
  move: "Moving",
  first_car: "A first car",
  long_trip: "A long trip",
  child: "A child",
  pet: "A pet",
  renovation: "Renovation",
};

export const STRINGS = {
  clusterWithPlace: (label: string, place: string) => `${label} to ${place}`,
  emptyHome: {
    title: "The home stands empty while you are away",
    body: (from: string, to: string, days: number, assumed: boolean) =>
      `You are away from ${from} to ${to}, ${days} days${assumed ? " (the end is assumed; no end date was found)" : ""}. ` +
      "An empty home is where leaks and freezes go unnoticed: turn off the water, ask someone to look in, and check that the home insurance covers a long absence.",
  },
  sameMonth: {
    title: (a: string, b: string) => `${a} and ${b} in the same month`,
    body: (a: string, aDate: string, b: string, bDate: string) =>
      `${a} (${aDate}) and ${b} (${bDate}) fall in the same month. Two changes at once is when paperwork slips: do the insurance and address changes for both in one sitting.`,
  },
  weather: {
    title: (headline: string) => headline,
    body: (eventLabel: string, eventDate: string, description: string) =>
      `${eventLabel} is on ${eventDate}, inside the warning period. ${description}`,
  },
  lapse: {
    title: "A gap in home cover is possible",
    body: (end: string, start: string) =>
      `The old lease ends ${end} and the new one starts ${start}. If the home insurance is not moved by then, the new home is uncovered from day one.`,
  },
  spendShift: {
    title: "Spending pattern changed",
    body: (date: string, before: number, after: number) =>
      `Bank activity went from about ${before} to ${after} items a week around ${date}. A life event usually shows up in the bank first; check that the new costs are the ones you expect.`,
  },
} as const;

/** "17 October 2026" for a body sentence. */
export function formatDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}
