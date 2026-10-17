import { describe, expect, it } from "vitest";
import { areaPrice, extractFromImage, extractListing, inspectionStats, type Listing, risksFor, timeline, validate } from "./index.ts";

const AD =
  "Myydään Toyota Yaris 1.33 VVT-i 2012, ajettu 185 tkm, hinta 6 900 €. Katsastettu 5/2026. Turku, yksityinen myyjä. Jakohihna vaihdettu 2023.";

const reply = (o: unknown) => JSON.stringify(o);
const f = <T>(value: T, quote: string) => ({ value, quote });

describe("validate", () => {
  it("keeps fields and mentions whose quotes are in the ad, ignoring spacing in numbers", () => {
    const { listing, dropped } = validate(
      reply({
        kind: "listing",
        category: "car",
        fields: {
          make: f("Toyota", "Toyota"),
          priceEur: f(6900, "6900 €"),
          mileageKm: f(185000, "185 tkm"),
          seller: f("private", "yksityinen myyjä"),
        },
        mentions: [{ risk: "timing_belt", status: "done", year: 2023, quote: "Jakohihna vaihdettu 2023" }],
      }),
      AD,
    );
    expect(Object.keys(listing.fields).sort()).toEqual(["make", "mileageKm", "priceEur", "seller"]);
    expect(listing.mentions).toEqual([{ risk: "timing_belt", status: "done", year: 2023, quote: "Jakohihna vaihdettu 2023" }]);
    expect(dropped).toEqual([]);
  });

  it("drops invented fields and mentions, bad values, unknown fields and values read into a quote", () => {
    const flat = "Kaksio vuokralle keskustasta heti, 48,5 m², rakennettu -72.";
    const { listing, dropped } = validate(
      `\`\`\`json\n${reply({
        kind: "listing",
        category: "home",
        fields: {
          rooms: f("2h+kk", "Kaksio"),
          availableFrom: f("2024-05-15", "heti"),
          sizeM2: f(48.5, "48,5 m²"),
          year: f(1972, "-72"),
          fuel: f("petrol", "bensiini"),
          colour: f("red", "punainen"),
        },
        mentions: [{ risk: "mould", status: "present", quote: "hometta kylpyhuoneessa" }],
      })}\n\`\`\``,
      flat,
    );
    expect(Object.keys(listing.fields).sort()).toEqual(["sizeM2", "year"]);
    expect(listing.mentions).toEqual([]);
    expect(dropped.map((d) => d.reason).sort()).toEqual([
      "not_a_field",
      "quote_not_in_ad",
      "quote_not_in_ad",
      "value_not_in_quote",
      "value_not_in_quote",
    ]);
  });

  it("treats anything but a listing as other and keeps nothing", () => {
    expect(validate('{"kind":"news","fields":{}}', AD).listing).toEqual({ kind: "other", fields: {}, mentions: [] });
  });
});

const flat = (over: Partial<Listing> = {}): Listing => ({
  kind: "listing",
  category: "home",
  fields: {
    priceKind: f("sale" as const, "Myydään"),
    municipality: f("Turku", "Turku"),
    postcode: f("20100", "20100"),
    rooms: f("2h+kk", "2h+kk"),
    sizeM2: f(55, "55 m²"),
    priceEur: f(165000, "165 000 €"),
    year: f(1972, "1972"),
    monthlyChargeEur: f(250, "250 €/kk"),
  },
  mentions: [],
  ...over,
});

describe("risksFor", () => {
  it("prices an old flat's pipe renovation, flags leaks and asbestos and compares with its postcode", () => {
    const risks = risksFor(flat(), "2026-10-17");
    expect(risks.map((r) => r.id)).toEqual(["pipes-due", "leaks", "asbestos", "area-price"]);
    expect(risks[0]?.cost?.eur).toBe(49000);
    expect(areaPrice(flat())?.areaEurPerM2).toBeGreaterThan(1000);
  });

  it("lists what the ad says in its own words and takes a stated renovation as done", () => {
    const listing = flat({
      mentions: [
        { risk: "pipe_renovation", status: "done", year: 2016, quote: "linjasaneeraus tehty 2016" },
        { risk: "facade_renovation", status: "planned", year: 2027, quote: "julkisivuremontti tulossa 2027" },
      ],
    });
    const ids = risksFor(listing, "2026-10-17").map((r) => r.id);
    expect(ids).toContain("ad-facade_renovation");
    expect(ids).not.toContain("pipes-due");
  });
});

describe("lookups", () => {
  it("finds Traficom's figures for a 2012 Yaris and its mileage against the median", () => {
    const car: Listing = {
      kind: "listing",
      category: "car",
      fields: {
        make: f("Toyota", "Toyota"),
        model: f("Yaris 1.33 VVT-i", "Yaris 1.33 VVT-i"),
        year: f(2012, "2012"),
        mileageKm: f(185000, "185 tkm"),
      },
      mentions: [],
    };
    const s = inspectionStats(car);
    expect(s?.model).toBe("TOYOTA YARIS");
    expect(s?.failPct).toBeGreaterThan(0);
    expect(s?.mileageVsMedianPct).toBeGreaterThan(0);
    expect(risksFor(car, "2026-10-17").map((r) => r.id)).toContain("insurance-traffic");
  });
});

describe("timeline", () => {
  it("adds the charge every year and the pipe renovation once, in the window", () => {
    const t = timeline(flat(), "2026-10-17");
    expect(t.from).toBe(2026);
    expect(t.to).toBe(2035);
    const pipe = t.entries.find((e) => e.id === "pipe-renovation");
    expect(pipe).toMatchObject({ year: 2027, eur: 49000, estimated: true });
    expect(t.total).toBe(10 * 3000 + 49000);
  });

  it("puts a 14-year-old car on yearly inspections after its current one", () => {
    const car: Listing = {
      kind: "listing",
      category: "car",
      fields: { year: f(2012, "2012"), inspectedUntil: f("2027-05", "5/2027") },
      mentions: [],
    };
    const years = timeline(car, "2026-10-17")
      .entries.filter((e) => e.id === "inspection")
      .map((e) => e.year);
    expect(years).toEqual([2027, 2028, 2029, 2030, 2031, 2032, 2033, 2034, 2035]);
  });
});

describe("extract", () => {
  const server = (replies: string[]) =>
    (async () => new Response(JSON.stringify({ choices: [{ message: { content: replies.shift() } }] }))) as unknown as typeof fetch;
  const ok = reply({ kind: "listing", category: "car", fields: { make: f("Toyota", "Toyota") }, mentions: [] });

  it("retries once when the first reply is not JSON", async () => {
    const out = await extractListing(AD, { baseUrl: "http://x", model: "m", fetch: server(["Sorry...", ok]) });
    expect(out.attempts).toBe(2);
    expect(out.listing.fields.make?.value).toBe("Toyota");
  });

  it("checks a screenshot's quotes against its transcript", async () => {
    const out = await extractFromImage("data:image/png;base64,AAAA", { baseUrl: "http://x", model: "m", fetch: server([AD, ok]) });
    expect(out.text).toBe(AD);
    expect(out.listing.fields.make?.value).toBe("Toyota");
  });
});
