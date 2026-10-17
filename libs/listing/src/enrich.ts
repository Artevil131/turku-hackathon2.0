// Facts that follow from an ad by rule, not by model: how old the car is
// and which inspection interval applies (Traficom's 4-2-2-2-1), how long
// its current inspection lasts, how old the building is and whether its
// pipes are near the age at which Finnish blocks usually renovate them.
// The journey turns these into cards; the wording is not made here.

import type { IsoDate } from "@ahead/contract";
import { daysBetween } from "@ahead/opendata";
import type { Listing } from "./schema.ts";

/** Pipes in Finnish blocks of flats are typically renewed at 40 to 50 years (Kiinteistöliitto). */
export const PIPE_RENOVATION_AGE = 40;

export interface CarFacts {
  ageYears?: number;
  /** Over 10 years: inspected every year. */
  yearlyInspection?: boolean;
  /** Days from today to the end of the month the inspection is valid until; negative when lapsed. */
  inspectionDaysLeft?: number;
}

export interface FlatFacts {
  buildingAgeYears?: number;
  /** "due": old enough and no renovation stated as done; "done"; "planned": a cost the buyer or tenant will meet. */
  pipes?: "due" | "done" | "planned" | "young";
}

export interface Facts {
  car?: CarFacts;
  flat?: FlatFacts;
}

function endOfMonth(yyyyMm: string): IsoDate {
  const [y, m] = yyyyMm.split("-").map(Number) as [number, number];
  return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
}

export function enrich(listing: Listing, today: IsoDate): Facts {
  const year = Number(today.slice(0, 4));
  if (listing.kind === "car" && listing.car) {
    const c = listing.car;
    const car: CarFacts = {};
    if (c.year) {
      car.ageYears = year - c.year.value;
      car.yearlyInspection = car.ageYears > 10;
    }
    if (c.inspectedUntil) car.inspectionDaysLeft = daysBetween(today, endOfMonth(c.inspectedUntil.value));
    return { car };
  }
  if (listing.kind === "flat" && listing.flat) {
    const f = listing.flat;
    const flat: FlatFacts = {};
    if (f.builtYear) flat.buildingAgeYears = year - f.builtYear.value;
    const pipes = f.pipeRenovation?.value;
    if (pipes === "done" || pipes === "planned") flat.pipes = pipes;
    else if (flat.buildingAgeYears !== undefined) flat.pipes = flat.buildingAgeYears >= PIPE_RENOVATION_AGE ? "due" : "young";
    return { flat };
  }
  return {};
}
