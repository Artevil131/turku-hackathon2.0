import { describe, expect, it } from "vitest";
import { IcsAdapter, parseIcs } from "./ics.ts";
import { windowEnding } from "./index.ts";

const ics = [
  "BEGIN:VCALENDAR",
  "VERSION:2.0",
  "BEGIN:VEVENT",
  "UID:abc@google.com",
  "DTSTART;VALUE=DATE:20261101",
  "CREATED:20261009T101500Z",
  "SUMMARY:Muutto Turkuun\\, iso päivä",
  "LOCATION:Yo-kylä 12 B 7\\, Turku",
  "DESCRIPTION:this is never read",
  "END:VEVENT",
  "BEGIN:VEVENT",
  "UID:def",
  "DTSTART;TZID=Europe/Helsinki:20261018T140000",
  "SUMMARY:Koeajo Yaris",
  " \\, Laakkonen",
  "END:VEVENT",
  "BEGIN:VEVENT",
  "SUMMARY:no start",
  "END:VEVENT",
  "END:VCALENDAR",
].join("\r\n");

describe("ics", () => {
  it("parses dates, unescapes, unfolds and skips broken events", () => {
    const events = parseIcs(ics);
    expect(events.map((e) => [e.start, e.summary, e.location, e.created])).toEqual([
      ["2026-11-01", "Muutto Turkuun, iso päivä", "Yo-kylä 12 B 7, Turku", "2026-10-09"],
      ["2026-10-18", "Koeajo Yaris, Laakkonen", undefined, undefined],
    ]);
  });
  it("is an adapter that honours the window and creation date", async () => {
    const a = new IcsAdapter(ics);
    expect((await a.read(windowEnding("2026-10-17"))).map((s) => s.text).sort()).toEqual([
      "Koeajo Yaris, Laakkonen",
      "Muutto Turkuun, iso päivä, Yo-kylä 12 B 7, Turku",
    ]);
    expect((await a.read(windowEnding("2026-10-01"))).map((s) => s.text)).toEqual(["Koeajo Yaris, Laakkonen"]);
  });
});
