import type { Snippet } from "@ahead/contract";
import { SNIPPET_MAX_CHARS, SOURCES } from "@ahead/contract";
import { describe, expect, it } from "vitest";
import { minimise, readEnabled, syntheticAdapters, windowEnding } from "./index.ts";

const items: Snippet[] = [
  { id: "m1", source: "mail", date: "2026-10-01", text: " hello " },
  { id: "m2", source: "mail", date: "2026-07-01", text: "old" },
  { id: "c1", source: "calendar", date: "2026-12-24", text: "future entry" },
  { id: "c2", source: "calendar", date: "2027-09-01", text: "too far" },
  { id: "b1", source: "bank", date: "2026-10-10", text: "x".repeat(400) },
  { id: "s1", source: "sms", date: "2026-10-12", text: `DVV/Posti: Muuttoilmoituksesi on käsitelty. ${"y".repeat(400)}` },
  { id: "w1", source: "wifi", date: "2026-10-11", text: "  Liityit verkkoon Laakkonen-Guest  " },
  { id: "w2", source: "wifi", date: "2026-10-11", text: "   " },
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
  it("has one adapter per source, sms and wifi included", () => {
    expect(syntheticAdapters(items).map((a) => a.source)).toEqual(SOURCES);
  });
  it("caps, trims and drops empty sms and wifi texts like any other source", async () => {
    const sms = minimise("sms", items, w);
    expect(sms.map((s) => s.id)).toEqual(["s1"]);
    expect(sms[0]?.text.length).toBe(SNIPPET_MAX_CHARS);
    expect(sms[0]?.text.startsWith("DVV/Posti: Muuttoilmoituksesi on käsitelty.")).toBe(true);
    expect(minimise("wifi", items, w).map((s) => s.text)).toEqual(["Liityit verkkoon Laakkonen-Guest"]);
    const out = await readEnabled(syntheticAdapters(items), new Set(["sms", "wifi"]), w);
    expect(out.map((s) => s.id)).toEqual(["w1", "s1"]);
  });
});
