// Ten years of what an ad will cost and ask of you, year by year: the rent
// or the monthly charge, a pipe renovation when the ad says it is coming
// or the building's age says it is due, other renovations the ad names,
// the car's inspections and upkeep, a dog's yearly costs. Only costs with
// a source or from the ad carry euros; the rest are dated with no price,
// so the total is a floor, and says so.

import { inspectionStats } from "./lookups.ts";
import { ageOf, type Cost, MENTION_TITLES, pipeCost, pipeStatus, SOURCES, type Source, type Text } from "./risks.ts";
import { HOMES, type Listing, type MentionRisk } from "./schema.ts";

export interface TimelineEntry {
  year: number;
  id: string;
  title: Text;
  eur?: number;
  /** The year is an estimate from a rule, not from the ad. */
  estimated?: boolean;
  source?: Source;
  quote?: string;
}

export interface Timeline {
  from: number;
  to: number;
  entries: TimelineEntry[];
  /** Sum of every entry with euros, by year and in all. */
  byYear: Record<number, number>;
  total: number;
  /** Entries dated but not priced: the total does not include them. */
  unpriced: number;
}

const OTHER_RENOVATIONS: MentionRisk[] = [
  "facade_renovation",
  "roof_renovation",
  "balcony_renovation",
  "window_renovation",
  "elevator_renovation",
  "drainage_renovation",
];

export function timeline(listing: Listing, today: string, years = 10): Timeline {
  const from = Number(today.slice(0, 4));
  const to = from + years - 1;
  const f = listing.fields;
  const entries: TimelineEntry[] = [];
  const yearly = (id: string, title: Text, eur: number, extra: Partial<TimelineEntry> = {}) => {
    for (let y = from; y <= to; y++) entries.push({ year: y, id, title, eur, ...extra });
  };
  const once = (cost: Cost | undefined) => (cost?.per === "total" ? cost.eur : undefined);

  if (listing.kind === "listing" && listing.category && HOMES.includes(listing.category)) {
    if (f.priceKind?.value === "rent_month" && f.priceEur)
      yearly("rent", { fi: "Vuokra", en: "Rent" }, f.priceEur.value * 12, { quote: f.priceEur.quote });
    if (f.monthlyChargeEur)
      yearly("charge", { fi: "Hoitovastike", en: "Maintenance charge" }, f.monthlyChargeEur.value * 12, {
        quote: f.monthlyChargeEur.quote,
      });

    const pipes = pipeStatus(listing, today);
    const m = listing.mentions.find((x) => x.risk === "pipe_renovation");
    if (pipes === "planned" || pipes === "due") {
      // Due: about 50 years from building, kept inside the window; the barometer's projects are 40–55 years old.
      const built = f.year?.value ?? from;
      const year = m?.year ?? Math.min(to, Math.max(from + 1, built + 50));
      entries.push({
        year,
        id: "pipe-renovation",
        title: { fi: "Putkiremontti", en: "Pipe renovation" },
        eur: once(pipeCost(f)),
        estimated: !m?.year,
        source: SOURCES.pipes,
        quote: m?.quote,
      });
    }
    for (const risk of OTHER_RENOVATIONS) {
      const r = listing.mentions.find((x) => x.risk === risk && x.status === "planned");
      if (r)
        entries.push({
          year: r.year ?? from + 1,
          id: risk,
          title: MENTION_TITLES[risk],
          estimated: !r.year,
          quote: r.quote,
        });
    }
  }

  if (listing.category === "car") {
    const age = ageOf(f, today);
    const stats = inspectionStats(listing);
    const title: Text = stats
      ? { fi: `Katsastus (hylkäys ${stats.failPct} % tällä mallilla)`, en: `Inspection (${stats.failPct} % of this model fail)` }
      : { fi: "Katsastus", en: "Inspection" };
    let y = f.inspectedUntil ? Number(f.inspectedUntil.value.slice(0, 4)) : from;
    if (y < from) y = from;
    while (y <= to) {
      entries.push({ year: y, id: "inspection", title, source: stats?.source ?? SOURCES.inspectionRule });
      const carAge = age === undefined ? 0 : age + (y - from);
      y += carAge >= 10 ? 1 : 2;
    }
    yearly("car-upkeep", { fi: "Huolto ja korjaukset", en: "Servicing and repairs" }, 1070, { source: SOURCES.carUpkeep });
  }

  if (listing.category === "pet" && f.species?.value === "dog")
    yearly("dog", { fi: "Koiran perustarpeet", en: "A dog's basic needs" }, 1561, { source: SOURCES.dog });

  entries.sort((a, b) => a.year - b.year || (b.eur ?? 0) - (a.eur ?? 0));
  const byYear: Record<number, number> = {};
  for (let y = from; y <= to; y++) byYear[y] = 0;
  for (const e of entries) if (e.eur !== undefined && e.year <= to) byYear[e.year] = (byYear[e.year] ?? 0) + e.eur;
  return {
    from,
    to,
    entries: entries.filter((e) => e.year <= to),
    byYear,
    total: Object.values(byYear).reduce((a, b) => a + b, 0),
    unpriced: entries.filter((e) => e.eur === undefined && e.year <= to).length,
  };
}
