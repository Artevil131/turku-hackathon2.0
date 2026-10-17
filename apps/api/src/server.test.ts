import { describe, expect, it } from "vitest";
import { counts, parseShare } from "./server.ts";

describe("share endpoint", () => {
  it("accepts only the three fields and valid values", () => {
    expect(parseShare({ type: "move", date: "2026-11-01", municipality: "Turku", snippet: "secret", userId: 7 })).toEqual({
      type: "move",
      date: "2026-11-01",
      municipality: "Turku",
    });
    expect(parseShare({ type: "divorce" })).toBeUndefined();
    expect(parseShare({ type: "move", date: "1.11.2026", municipality: "Yo-kylä 12 B 7" })).toEqual({ type: "move" });
    expect(parseShare("x")).toBeUndefined();
  });
  it("counts per type and municipality", () => {
    const rows = [
      { type: "move" as const, municipality: "Turku", receivedAt: "" },
      { type: "move" as const, municipality: "Turku", receivedAt: "" },
      { type: "pet" as const, receivedAt: "" },
    ];
    expect(counts(rows)).toEqual({ total: 3, byType: { move: 2, pet: 1 }, byMunicipality: { Turku: { move: 2 }, unknown: { pet: 1 } } });
  });
});
