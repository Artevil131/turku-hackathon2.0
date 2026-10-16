import type { IsoDate } from "@ahead/contract";

export function iso(d: Date): IsoDate {
  return d.toISOString().slice(0, 10);
}
export function parse(s: IsoDate): Date {
  return new Date(`${s}T00:00:00Z`);
}
export function addDays(s: IsoDate, n: number): IsoDate {
  const d = parse(s);
  d.setUTCDate(d.getUTCDate() + n);
  return iso(d);
}
export function daysBetween(a: IsoDate, b: IsoDate): number {
  return Math.round((parse(b).getTime() - parse(a).getTime()) / 86400000);
}
/** Finnish short date, "1.11.2026", as it appears in real mail. */
export function fiDate(s: IsoDate): string {
  const d = parse(s);
  return `${d.getUTCDate()}.${d.getUTCMonth() + 1}.${d.getUTCFullYear()}`;
}
export function weekday(s: IsoDate): number {
  return parse(s).getUTCDay();
}
