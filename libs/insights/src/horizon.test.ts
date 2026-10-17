import type { DetectedEvent, Snippet } from "@ahead/contract";
import type { FmiWarning } from "@ahead/opendata";
import { describe, expect, it } from "vitest";
import { horizon, leaseDates, tripEnd } from "./horizon.ts";

const today = "2026-10-17";
const snip = (id: string, source: Snippet["source"], date: string, text: string): Snippet => ({ id, source, date, text });
const event = (type: DetectedEvent["type"], date: string | undefined, ids: string[], place?: string): DetectedEvent => ({
  id: `${type}-1`,
  type,
  score: 3,
  evidence: ids.map((snippetId) => ({ snippetId, score: 1, prototype: "p" })),
  firstSignal: "2026-10-01",
  detectedAt: today,
  ...(date ? { estimatedDate: date } : {}),
  ...(place ? { place } : {}),
});

const snippets = [
  snip("lease-new", "mail", "2026-10-09", "Vuokrasopimus allekirjoitettavaksi – Yo-kylä 12 B 7, Turku, vuokrasuhde alkaa 1.11.2026."),
  snip("lease-old", "mail", "2026-10-16", "Irtisanomisilmoitus vastaanotettu – PSOAS, vuokrasuhde päättyy 31.10.2026"),
  snip("van", "mail", "2026-10-15", "Vahvistus: muuttoauto varattu la 31.10."),
  snip("flight", "mail", "2026-10-13", "Your booking confirmation AY1741 Helsinki–Lisbon 10 Jan 2027"),
  snip("cal-trip", "calendar", "2027-01-10", "✈️ Lisbon – exchange semester (until 30 May)"),
];

const frost: FmiWarning = {
  id: "w1",
  sentAt: "2026-10-28T09:00:00+02:00",
  msgType: "Alert",
  eventCode: "frost",
  severity: "Moderate",
  color: "yellow",
  onset: "2026-10-30T18:00:00+02:00",
  expires: "2026-11-02T09:00:00+02:00",
  regions: ["FI-19"],
  areas: ["Varsinais-Suomi"],
  text: { en: { event: "Frost warning", headline: "Night frost in Southwest Finland", description: "Check the water points." } },
};

describe("dates in evidence", () => {
  it("reads a trip end from 'until', a range, or assumes one", () => {
    expect(tripEnd(["Lisbon – exchange semester (until 30 May)"], "2027-01-10", today)).toEqual({ end: "2027-05-30", assumed: false });
    expect(tripEnd(["Interrail 1.7.2027 – 20.7.2027"], "2027-07-01", today)).toEqual({ end: "2027-07-20", assumed: false });
    expect(tripEnd(["Flight to Lisbon 10 Jan 2027"], "2027-01-10", today)).toEqual({ end: "2027-05-10", assumed: true });
  });
  it("pairs the old lease end with the new start", () => {
    const texts = snippets.slice(0, 3).map((s) => s.text);
    expect(leaseDates(texts, today)).toEqual({ end: "2026-10-31", start: "2026-10-31" });
    expect(leaseDates(texts, today, "2026-11-01")).toEqual({ end: "2026-10-31", start: "2026-11-01" });
    expect(leaseDates([texts[0] as string], today)).toBeUndefined();
  });
});

describe("horizon rules", () => {
  it("places dated events within 90 days and leaves the rest out", () => {
    const h = horizon([event("move", "2026-11-01", []), event("long_trip", "2027-03-01", []), event("pet", undefined, [])], today, {
      snippets,
    });
    expect(h.events.map((e) => e.event.type)).toEqual(["move"]);
    expect(h.to).toBe("2027-01-15");
  });
  it("lapse: adjacent lease dates in a move's evidence", () => {
    const h = horizon([event("move", "2026-11-01", ["lease-new", "lease-old", "van"])], today, { snippets });
    const lapse = h.insights.find((i) => i.kind === "lapse");
    expect(lapse).toMatchObject({ from: "2026-10-31", to: "2026-11-01", eventIds: ["move-1"] });
    expect(lapse?.body).toContain("31 October 2026");
    expect(horizon([event("move", "2026-11-01", ["lease-new"])], today, { snippets }).insights.filter((i) => i.kind === "lapse")).toEqual(
      [],
    );
  });
  it("empty-home: a trip with its end from the calendar entry", () => {
    const h = horizon([event("long_trip", "2027-01-10", ["flight", "cal-trip"])], today, { snippets });
    expect(h.insights.find((i) => i.kind === "empty-home")).toMatchObject({
      from: "2027-01-10",
      to: "2027-05-30",
      eventIds: ["long_trip-1"],
    });
  });
  it("same-month: two events in one calendar month", () => {
    const h = horizon([event("move", "2026-11-01", []), { ...event("first_car", "2026-11-20", []), id: "car" }], today, { snippets });
    expect(h.insights.find((i) => i.kind === "same-month")).toMatchObject({
      eventIds: ["move-1", "car"],
      from: "2026-11-01",
      to: "2026-11-20",
    });
    expect(
      horizon([event("move", "2026-11-01", []), { ...event("first_car", "2026-12-01", []), id: "car" }], today, { snippets }).insights,
    ).toEqual([]);
  });
  it("weather-at-event: a warning for the event's region within three days of its date", () => {
    const hit = horizon([event("move", "2026-11-01", [], "Turku")], today, { snippets, warnings: [frost] });
    expect(hit.insights.find((i) => i.kind === "weather-at-event")).toMatchObject({
      title: "Night frost in Southwest Finland",
      from: "2026-10-30",
    });
    const far = horizon([event("move", "2026-11-10", [], "Turku")], today, { snippets, warnings: [frost] });
    expect(far.insights).toEqual([]);
    const elsewhere = horizon([event("move", "2026-11-01", [], "Oulu")], today, { snippets, warnings: [frost] });
    expect(elsewhere.insights).toEqual([]);
    const nowhere = horizon([event("move", "2026-11-01", [])], today, { snippets, warnings: [frost] });
    expect(nowhere.insights).toEqual([]);
  });
  it("spend-shift: a bank change point in the last 30 days", () => {
    const cp = { source: "bank" as const, date: "2026-10-01", beforePerWeek: 5, afterPerWeek: 12 };
    const h = horizon([event("move", "2026-11-01", [])], today, { snippets, changePoints: [cp] });
    expect(h.insights.find((i) => i.kind === "spend-shift")).toMatchObject({ from: "2026-10-01", eventIds: ["move-1"] });
    const old = horizon([], today, { snippets, changePoints: [{ ...cp, date: "2026-09-01" }] });
    expect(old.insights).toEqual([]);
    const mail = horizon([], today, { snippets, changePoints: [{ ...cp, source: "mail" }] });
    expect(mail.insights).toEqual([]);
  });
});
