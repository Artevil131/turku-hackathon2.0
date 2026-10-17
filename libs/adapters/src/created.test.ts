import type { Snippet } from "@ahead/contract";
import { describe, expect, it } from "vitest";
import { minimise, windowEnding } from "./index.ts";

describe("calendar creation dates", () => {
  const items: Snippet[] = [{ id: "c1", source: "calendar", date: "2026-11-01", text: "Muutto", meta: { created: "2026-10-09" } }];
  it("hides an entry before it was created", () => {
    expect(minimise("calendar", items, windowEnding("2026-10-01"))).toEqual([]);
    expect(minimise("calendar", items, windowEnding("2026-10-09")).length).toBe(1);
  });
});
