import type { LedgerEntry } from "@ahead/contract";
import { mockMove } from "@ahead/contract/mock";
import { expect, test } from "vitest";
import { bySoonest } from "./order.ts";

const at = (id: string, estimatedDate?: string): LedgerEntry => ({
  event: { ...mockMove, id, estimatedDate },
  status: "pending",
  rejectedEvidence: [],
  shared: false,
});

test("soonest event first, undated last", () => {
  const order = bySoonest([at("trip", "2027-01-10"), at("undated"), at("move", "2026-11-01"), at("car", "2026-10-18")]);
  expect(order.map((e) => e.event.id)).toEqual(["car", "move", "trip", "undated"]);
});
