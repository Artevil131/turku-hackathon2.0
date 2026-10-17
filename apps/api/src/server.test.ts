import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { authorised, counts, parseShare, rateLimiter } from "./server.ts";

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

describe("listing auth", () => {
  const hash = createHash("sha256").update("team-secret").digest("hex");
  it("lets in only the token whose hash is configured", () => {
    expect(authorised("Bearer team-secret", hash)).toBe(true);
    expect(authorised("bearer team-secret", hash)).toBe(true);
    expect(authorised("Bearer wrong", hash)).toBe(false);
    expect(authorised(undefined, hash)).toBe(false);
    expect(authorised("team-secret", hash)).toBe(false);
  });
  it("is closed when no hash is configured", () => {
    expect(authorised("Bearer team-secret", "")).toBe(false);
  });
  it("allows so many requests an hour, then again after the hour", () => {
    let t = 0;
    const allow = rateLimiter(2, () => t);
    expect([allow(), allow(), allow()]).toEqual([true, true, false]);
    t = 3_600_001;
    expect(allow()).toBe(true);
  });
});
