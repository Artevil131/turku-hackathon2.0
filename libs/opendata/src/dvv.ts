import type { IsoDate } from "@ahead/contract";
import { addDays, addMonths, daysBetween } from "./dates.ts";

export const DVV_SOURCE = {
  name: "DVV, asuinpaikan muuttaminen",
  url: "https://www.suomi.fi/services/asuinpaikan-muuttaminen-maistraatti/86f39ee0-4138-4c35-a2c8-085c1b5c33f1",
} as const;

export interface MoveNotificationWindow {
  /** The move notification can be made from this day: one month before the move. */
  opensOn: IsoDate;
  /** It must be made by this day: a week after the move. */
  deadline: IsoDate;
}

/** DVV rule (DATA.md): at the earliest one month before the move, at the latest a week after it. */
export function moveNotificationWindow(moveDate: IsoDate): MoveNotificationWindow {
  return { opensOn: addMonths(moveDate, -1), deadline: addDays(moveDate, 7) };
}

export type MoveNotificationState = "not_open_yet" | "open" | "overdue";

export function moveNotificationState(moveDate: IsoDate, today: IsoDate): MoveNotificationState {
  const w = moveNotificationWindow(moveDate);
  if (daysBetween(today, w.opensOn) > 0) return "not_open_yet";
  return daysBetween(today, w.deadline) < 0 ? "overdue" : "open";
}
