import type { IsoDate } from "@ahead/contract";

// Calendar arithmetic on ISO dates, in UTC so the result never depends on the phone's time zone.

function parse(iso: IsoDate): { y: number; m: number; d: number } {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) throw new Error(`Not an ISO date: ${iso}`);
  return { y, m, d };
}

function format(y: number, m: number, d: number): IsoDate {
  return new Date(Date.UTC(y, m - 1, d)).toISOString().slice(0, 10);
}

export function addDays(iso: IsoDate, days: number): IsoDate {
  const { y, m, d } = parse(iso);
  return format(y, m, d + days);
}

/** Adds calendar months; a day that does not exist in the target month falls back to its last day (31 Mar - 1 month = 28 Feb). */
export function addMonths(iso: IsoDate, months: number): IsoDate {
  const { y, m, d } = parse(iso);
  const index = y * 12 + (m - 1) + months;
  const ty = Math.floor(index / 12);
  const tm = (index % 12) + 1;
  const lastDay = new Date(Date.UTC(ty, tm, 0)).getUTCDate();
  return format(ty, tm, Math.min(d, lastDay));
}

export function addYears(iso: IsoDate, years: number): IsoDate {
  return addMonths(iso, years * 12);
}

/** Whole days from `a` to `b`; negative when `b` is earlier. */
export function daysBetween(a: IsoDate, b: IsoDate): number {
  const pa = parse(a);
  const pb = parse(b);
  return Math.round((Date.UTC(pb.y, pb.m - 1, pb.d) - Date.UTC(pa.y, pa.m - 1, pa.d)) / 86_400_000);
}
