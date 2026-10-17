import { describe, expect, it } from "vitest";
import { enrich, extractListing, risksFor, validate } from "./index.ts";

const AD = "Myydään Toyota Yaris 1.33 VVT-i 2012, ajettu 185 tkm, hinta 6 900 €. Katsastettu 5/2026. Turku, yksityinen myyjä.";

describe("validate", () => {
  it("keeps fields whose quotes are in the ad, ignoring spacing in numbers", () => {
    const reply = JSON.stringify({
      kind: "car",
      car: {
        make: { value: "Toyota", quote: "Toyota" },
        priceEur: { value: 6900, quote: "6900 €" },
        mileageKm: { value: 185000, quote: "185 tkm" },
        seller: { value: "private", quote: "yksityinen myyjä" },
      },
    });
    const { listing, dropped } = validate(reply, AD);
    expect(Object.keys(listing.car ?? {}).sort()).toEqual(["make", "mileageKm", "priceEur", "seller"]);
    expect(dropped).toEqual([]);
  });

  it("drops an invented field, a bad value and an unknown field", () => {
    const reply = `Here you go:\n\`\`\`json\n${JSON.stringify({
      kind: "car",
      car: {
        fuel: { value: "petrol", quote: "bensiini" },
        year: { value: 1850, quote: "2012" },
        colour: { value: "red", quote: "punainen" },
      },
    })}\n\`\`\``;
    const { listing, dropped } = validate(reply, AD);
    expect(listing.car).toEqual({});
    expect(dropped.map((d) => d.reason).sort()).toEqual(["bad_value", "not_a_field", "quote_not_in_ad"]);
  });

  it("drops values read into a quote that does not write them", () => {
    const flat = "Kaksio vuokralle keskustasta heti, 48,5 m², rakennettu -72.";
    const reply = JSON.stringify({
      kind: "flat",
      flat: {
        rooms: { value: "2h+kk", quote: "Kaksio" },
        availableFrom: { value: "2024-05-15", quote: "heti" },
        sizeM2: { value: 48.5, quote: "48,5 m²" },
        builtYear: { value: 1972, quote: "-72" },
      },
    });
    const { listing, dropped } = validate(reply, flat);
    expect(Object.keys(listing.flat ?? {}).sort()).toEqual(["builtYear", "sizeM2"]);
    expect(dropped.map((d) => d.reason)).toEqual(["value_not_in_quote", "value_not_in_quote"]);
  });

  it("treats anything but car or flat as other and keeps no fields", () => {
    expect(validate('{"kind":"news","car":{}}', AD).listing).toEqual({ kind: "other" });
  });
});

describe("enrich", () => {
  it("marks an old block without a stated pipe renovation as due", () => {
    const facts = enrich({ kind: "flat", flat: { builtYear: { value: 1972, quote: "1972" } } }, "2026-10-17");
    expect(facts.flat).toEqual({ buildingAgeYears: 54, pipes: "due" });
  });

  it("puts a 14-year-old car on yearly inspection and counts days to the end of its inspection month", () => {
    const facts = enrich(
      { kind: "car", car: { year: { value: 2012, quote: "2012" }, inspectedUntil: { value: "2026-11", quote: "11/2026" } } },
      "2026-10-17",
    );
    expect(facts.car).toEqual({ ageYears: 14, yearlyInspection: true, inspectionDaysLeft: 44 });
  });
});

describe("extractListing", () => {
  it("retries once when the first reply is not JSON", async () => {
    const replies = ["Sorry, thinking...", JSON.stringify({ kind: "car", car: { make: { value: "Toyota", quote: "Toyota" } } })];
    const fake = (async () =>
      new Response(JSON.stringify({ choices: [{ message: { content: replies.shift() } }] }))) as unknown as typeof fetch;
    const out = await extractListing(AD, { baseUrl: "http://x", model: "m", fetch: fake });
    expect(out.attempts).toBe(2);
    expect(out.listing.car?.make?.value).toBe("Toyota");
  });
});

describe("risksFor", () => {
  it("prices the pipe renovation of an old flat for sale and flags asbestos and leaks", () => {
    const listing = {
      kind: "flat" as const,
      flat: {
        deal: { value: "sale" as const, quote: "Myydään" },
        municipality: { value: "Turku", quote: "Turku" },
        sizeM2: { value: 55, quote: "55 m²" },
        builtYear: { value: 1972, quote: "1972" },
      },
    };
    const risks = risksFor(listing, enrich(listing, "2026-10-17"));
    expect(risks.map((r) => r.id)).toEqual(["pipes-due", "leaks-old-pipes", "asbestos"]);
    expect(risks[0]?.cost?.eur).toBe(49000);
  });
});
