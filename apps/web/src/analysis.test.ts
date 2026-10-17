import { mockMove, mockMoveTimeline, mockSnippets } from "@ahead/contract/mock";
import { describe, expect, it } from "vitest";
import { contributionsOf, createAnalysis, replayTimeline } from "./analysis.ts";
import { createMockEngine } from "./engine.ts";

const TODAY = "2026-10-17";

describe("analysis over the mock engine", () => {
  const analysis = createAnalysis(createMockEngine());

  it("gives every snippet a star, with the evidence margins and the rest at the faintest magnitude", async () => {
    const dots = await analysis.sky(mockSnippets, [mockMove]);
    expect(dots).toHaveLength(mockSnippets.length);
    expect(dots.find((d) => d.id === "mail-0412")?.margin).toBe(0.81);
    expect(dots.find((d) => d.id === "bank-1180")?.margin).toBeUndefined();
  });

  it("returns the authored timeline and contributions for Emma's move and says the rest is the mock", async () => {
    expect(await analysis.timeline(mockMove, mockSnippets, TODAY)).toBe(mockMoveTimeline);
    const [first] = await analysis.contributions(mockMove, mockSnippets);
    expect(first?.source).toBe("mail");
    expect(analysis.mocked).toEqual({ novelty: true, horizon: true });
  });

  it("puts the phone's dated events on the horizon and attaches the example insights to its move", async () => {
    const event = { ...mockMove, id: "evt-on-this-phone" };
    const h = await analysis.horizon([event], TODAY, mockSnippets);
    expect(h.events.map((e) => e.event.id)).toEqual(["evt-on-this-phone"]);
    expect(h.insights.every((i) => i.eventIds.includes("evt-on-this-phone"))).toBe(true);
  });
});

describe("replayed timeline", () => {
  it("replays the detector's decayed sum day by day and marks the day it crossed", () => {
    const signals = [
      { date: "2026-10-01", source: "mail" as const, snippetId: "a", text: "a", margin: 2 },
      { date: "2026-10-10", source: "bank" as const, snippetId: "b", text: "b", margin: 1 },
    ];
    const t = replayTimeline("move", signals, "2026-09-28", "2026-10-12");
    expect(t.points[0]).toEqual({ date: "2026-09-28", score: 0, fired: false });
    expect(t.points.find((p) => p.date === "2026-10-01")?.score).toBe(2);
    expect(t.points.find((p) => p.fired)?.date).toBe("2026-10-10");
    expect(contributionsOf(signals).map((c) => c.source)).toEqual(["mail", "bank"]);
  });
});
