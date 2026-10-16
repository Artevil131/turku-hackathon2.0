import { describe, expect, it } from "vitest";
import { datesIn, placeIn } from "./dates.ts";

describe("datesIn", () => {
  const today = "2026-10-17";
  it("reads Finnish and ISO dates", () => {
    expect(datesIn("vuokrasuhde alkaa 1.11.2026", today)).toEqual(["2026-11-01"]);
    expect(datesIn("alkaen 2026-11-01", today)).toEqual(["2026-11-01"]);
  });
  it("places a day-month without year in the coming year", () => {
    expect(datesIn("muuttoauto varattu la 31.10.", today)).toEqual(["2026-10-31"]);
    expect(datesIn("luovutus 3.1.", today)).toEqual(["2027-01-03"]);
  });
  it("reads English month names", () => {
    expect(datesIn("Helsinki–Lisbon 10 Jan 2027", today)).toEqual(["2027-01-10"]);
  });
  it("ignores prices and times", () => {
    expect(datesIn("Toyota Yaris 2014, 6 900 € klo 14", today)).toEqual([]);
  });
});

describe("placeIn", () => {
  it("finds inflected Finnish place names", () => {
    expect(placeIn("Muutto Turkuun")).toBe("Turku");
    expect(placeIn("Helsinki–Lisbon")).toBe("Helsinki");
    expect(placeIn("K-Market Kaijonharju")).toBeUndefined();
  });
});
