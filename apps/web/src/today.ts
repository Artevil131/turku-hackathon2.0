import type { IsoDate } from "@ahead/contract";

/** The real date, unless the URL says `?today=YYYY-MM-DD`: the demo phone is dated, so the demo can pin the day. */
export function today(search = location.search): IsoDate {
  const pinned = new URLSearchParams(search).get("today");
  return pinned && /^\d{4}-\d{2}-\d{2}$/.test(pinned) ? pinned : new Date().toISOString().slice(0, 10);
}
