import { expect, test } from "vitest";
import { addMonths } from "./dates.ts";
import { moveNotificationState, moveNotificationWindow } from "./dvv.ts";

test("window opens a month before and closes a week after the move", () => {
  expect(moveNotificationWindow("2026-11-01")).toEqual({ opensOn: "2026-10-01", deadline: "2026-11-08" });
});

test("month arithmetic falls back to the last day of a shorter month", () => {
  expect(addMonths("2026-03-31", -1)).toBe("2026-02-28");
  expect(addMonths("2026-01-31", 1)).toBe("2026-02-28");
  expect(moveNotificationWindow("2026-01-05").opensOn).toBe("2025-12-05");
});

test("state follows today", () => {
  expect(moveNotificationState("2026-11-01", "2026-09-30")).toBe("not_open_yet");
  expect(moveNotificationState("2026-11-01", "2026-10-01")).toBe("open");
  expect(moveNotificationState("2026-11-01", "2026-11-08")).toBe("open");
  expect(moveNotificationState("2026-11-01", "2026-11-09")).toBe("overdue");
});
