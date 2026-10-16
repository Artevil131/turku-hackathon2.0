import { expect, test } from "vitest";
import { inspectionReminder, nextInspectionDue } from "./traficom.ts";

test("first inspection is due four years after commissioning", () => {
  expect(nextInspectionDue("2024-03-15")).toBe("2028-03-15");
});

test("an inspection well before the deadline restarts the two-year count", () => {
  expect(nextInspectionDue("2020-03-15", ["2023-06-01"])).toBe("2025-06-01");
});

test("an inspection in the last 30 days keeps the original schedule", () => {
  // deadline 2024-03-15; done 2024-03-01 keeps it, so the next is 2026-03-15, not 2026-03-01
  expect(nextInspectionDue("2020-03-15", ["2024-03-01"])).toBe("2026-03-15");
});

test("the next inspection never passes the 10-year mark when done at 8-9 years", () => {
  // commissioned 2016-05-10, ten years = 2026-05-10; done 2024-09-01 (8.3 years) would give 2026-09-01
  expect(nextInspectionDue("2016-05-10", ["2020-05-10", "2022-05-10", "2024-09-01"])).toBe("2026-05-10");
});

test("after 9 years inspections are yearly", () => {
  expect(nextInspectionDue("2015-01-20", ["2019-01-20", "2021-01-20", "2023-01-20", "2025-06-01"])).toBe("2026-06-01");
});

test("reminder reports days left", () => {
  const r = inspectionReminder("2024-03-15", [], "2028-02-15");
  expect(r.due).toBe("2028-03-15");
  expect(r.daysLeft).toBe(29);
  expect(r.remindFrom).toBe("2028-02-14");
});
