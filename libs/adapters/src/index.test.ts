import type { Snippet } from "@ahead/contract";
import { describe, expect, it } from "vitest";
import { minimise, readEnabled, syntheticAdapters, windowEnding } from "./index.ts";

const items: Snippet[] = [
  { id: "m1", source: "mail", date: "2026-10-01", text: " hello " },
  { id: "m2", source: "mail", date: "2026-07-01", text: "old" },
  { id: "c1", source: "calendar", date: "2026-12-24", text: "future entry" },
  { id: "c2", source: "calendar", date: "2027-09-01", text: "too far" },
  { id: "b1", source: "bank", date: "2026-10-10", text: "x".repeat(400) },
];

describe("adapters", () => {
  const w = windowEnding("2026-10-17");
  it("filters by window, trims and caps", () => {
    expect(minimise("mail", items, w).map((s) => s.text)).toEqual(["hello"]);
    expect(minimise("bank", items, w)[0]?.text.length).toBe(300);
  });
  it("reads calendar ahead but not forever", () => {
    expect(minimise("calendar", items, w).map((s) => s.id)).toEqual(["c1"]);
  });
  it("reads only enabled sources", async () => {
    const out = await readEnabled(syntheticAdapters(items), new Set(["mail", "bank"]), w);
    expect(out.map((s) => s.id)).toEqual(["m1", "b1"]);
  });
});
