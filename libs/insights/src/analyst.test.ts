// The whole Analyst over the synthetic student phone with the fake
// embedder: the move builds up and fires, mail carries it, the month's
// novelty is the move, the car and Lisbon, and the horizon says what
// they mean together.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Snippet } from "@ahead/contract";
import { PrototypeDetector } from "@ahead/detect";
import { describe, expect, it } from "vitest";
import { OnDeviceAnalyst } from "./analyst.ts";
import { fake } from "./fake-embedder.ts";
import { visibleOn } from "./window.ts";

const today = "2026-10-17";
const phone = JSON.parse(readFileSync(join(import.meta.dirname, "../../../data/synthetic/student.json"), "utf8")) as {
  snippets: Snippet[];
};
const example = JSON.parse(readFileSync(join(import.meta.dirname, "../../opendata/data/fmi-example-warnings.json"), "utf8")) as {
  warnings: import("@ahead/opendata").FmiWarning[];
};

describe("OnDeviceAnalyst on the student phone", () => {
  const detector = new PrototypeDetector(fake);
  const analyst = new OnDeviceAnalyst({ detector, snippets: phone.snippets, warnings: example.warnings });

  it("replays the move day by day and embeds nothing twice", async () => {
    const embed = fake.embed;
    let calls = 0;
    fake.embed = (texts) => {
      calls += texts.length;
      return embed(texts);
    };
    try {
      const t = await analyst.timeline("move", today);
      expect(t.points.length).toBe(61);
      // Nothing fires in the first weeks (a friend's move is one source); the move fires between its first signal and the lease.
      expect(t.points.slice(0, 30).some((p) => p.fired)).toBe(false);
      const first = t.points.find((p) => p.fired);
      expect(first?.date ?? "").toMatch(/^2026-(09-2[89]|09-30|10-0[1-9])$/);
      expect(t.points.at(-1)?.fired).toBe(true);
      expect(t.points.at(-1)?.score ?? 0).toBeGreaterThan(t.points[30]?.score ?? 0);
      expect(t.signals.map((s) => s.snippetId)).toContain("mail-0077");
      expect(t.signals.every((s) => s.margin >= detector.params.floor)).toBe(true);
      const before = calls;
      await analyst.timeline("move", today);
      expect(calls).toBe(before);
    } finally {
      fake.embed = embed;
    }
  });

  it("splits a detected move's score by source", async () => {
    const move = (await detector.detect(visibleOn(phone.snippets, today), today)).find((e) => e.type === "move");
    if (!move) throw new Error("the move did not fire");
    const c = await analyst.contributions(move);
    expect(c[0]?.source).toBe("mail");
    expect(c.map((x) => x.source)).toContain("calendar");
    expect(c.reduce((a, x) => a + x.count, 0)).toBe(move.evidence.length);
    for (const x of c) {
      const scores = move.evidence.filter((e) => e.snippetId.startsWith(x.source)).map((e) => e.score);
      expect(x.strongest?.margin).toBe(Math.max(...scores));
      expect(x.total).toBeCloseTo(
        scores.reduce((a, b) => a + b, 0),
        2,
      );
    }
  });

  it("finds what is new this month", async () => {
    const n = await analyst.novelty(today);
    expect(n.from).toBe("2026-09-18");
    expect(n.newSenders).toContain("TYS");
    expect(n.newMerchants.length).toBeGreaterThan(0);
    expect(n.newTopics.length).toBe(8);
    expect(n.newTopics[0]?.margin ?? 0).toBeGreaterThanOrEqual(n.newTopics[7]?.margin ?? 1);
    expect(n.recurring.some((r) => r.source === "places" && r.name === "Sali")).toBe(true);
    expect(n.clusters.length).toBe(5);
    expect(n.clusters.find((c) => c.nearest === "move")?.label).toBe("Moving to Turku");
    expect(n.clusters.find((c) => c.nearest === "first_car")).toBeDefined();
    for (const c of n.clusters) expect(c.novelty).toBeGreaterThanOrEqual(0);
    const ids = new Set(n.clusters.flatMap((c) => c.snippetIds));
    expect(ids.has("mail-0077")).toBe(true);
  });

  it("puts the events on the horizon with the lapse, the empty home and the example frost", async () => {
    const events = await detector.detect(visibleOn(phone.snippets, today), today);
    const h = await analyst.horizon(events, today);
    expect(h.events.map((e) => e.event.type)).toEqual(["first_car", "move", "long_trip"]);
    const kinds = h.insights.map((i) => i.kind);
    expect(kinds).toContain("lapse");
    expect(kinds).toContain("empty-home");
    expect(kinds).toContain("weather-at-event");
    expect(h.insights.find((i) => i.kind === "empty-home")).toMatchObject({ from: "2027-01-10", to: "2027-05-30" });
    expect(h.insights.find((i) => i.kind === "lapse")).toMatchObject({ from: "2026-10-31", to: "2026-11-01" });
  });
});
