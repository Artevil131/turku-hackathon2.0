import type { IsoDate } from "@ahead/contract";
import { addDays, addYears, daysBetween } from "./dates.ts";

export const TRAFICOM_SOURCE = {
  name: "Traficom, katsastusajankohdat ajoneuvoluokittain",
  url: "https://traficom.fi/fi/autoilijat/katsastus/katsastusajankohdat-ajoneuvoluokittain",
} as const;

/** An inspection done this many days before the deadline or less keeps the existing schedule. */
const KEEP_SCHEDULE_DAYS = 30;

/**
 * Passenger car and van periodic inspection, "4-2-2-2-1" (Traficom, checked 2026-10-17):
 * first inspection within 4 years of the commissioning date (käyttöönottopäivä), then within 2 years
 * of the previous one, and yearly once more than 10 years have passed since commissioning.
 * The date counted from is the commissioning date, which can differ from the first registration date;
 * the car's own certificate decides.
 *
 * `inspections` are the dates of inspections already done. An inspection in the 30 days before its
 * deadline keeps the original schedule; an earlier one restarts the count from its own date. An
 * inspection at 8-9 years still leaves the next due by the 10-year mark, and one after 9 years
 * leaves it due within a year.
 */
export function nextInspectionDue(commissioned: IsoDate, inspections: readonly IsoDate[] = []): IsoDate {
  const tenYears = addYears(commissioned, 10);
  let due = addYears(commissioned, 4);
  for (const done of [...inspections].sort()) {
    const daysEarly = daysBetween(done, due);
    const base = daysEarly >= 0 && daysEarly <= KEEP_SCHEDULE_DAYS ? due : done;
    due = daysBetween(addYears(commissioned, 9), done) > 0 ? addYears(base, 1) : minDate(addYears(base, 2), tenYears);
  }
  return due;
}

function minDate(a: IsoDate, b: IsoDate): IsoDate {
  return a <= b ? a : b;
}

/** A first car is usually bought used, so the useful numbers are days left and the warning start. */
export function inspectionReminder(commissioned: IsoDate, inspections: readonly IsoDate[], today: IsoDate) {
  const due = nextInspectionDue(commissioned, inspections);
  return { due, daysLeft: daysBetween(today, due), remindFrom: addDays(due, -KEEP_SCHEDULE_DAYS) };
}
