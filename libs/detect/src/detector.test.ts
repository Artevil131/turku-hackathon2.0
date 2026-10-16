// The rules of the detector, tested with a fake embedder whose vectors
// are hand-placed: prototypes of each event sit on their own axis,
// ordinary life on another, and a snippet's text picks an axis and a
// strength. No model is loaded.

import type { Embedder, Snippet } from "@ahead/contract";
import { describe, expect, it } from "vitest";
import { PrototypeDetector } from "./detector.ts";
import { ordinary, prototypes } from "./prototypes.ts";

const AXES = ["move", "first_car", "long_trip", "child", "pet", "renovation", "ordinary"] as const;
const DIM = AXES.length;

function unit(axis: number, strength = 1): Float32Array {
  // A vector mostly on `axis`, with the rest spread so cosines are smooth.
  const v = new Float32Array(DIM).fill((1 - strength) / Math.sqrt(DIM));
  v[axis] = (v[axis] ?? 0) + strength;
  let n = 0;
  for (const x of v) n += x * x;
  n = Math.sqrt(n);
  return v.map((x) => x / n);
}

/** Text "move 0.9" → on the move axis with strength 0.9. Prototypes map to their own axis. */
const fake: Embedder = {
  id: "fake",
  dim: DIM,
  async embed(texts) {
    return texts.map((t) => {
      for (const [i, axis] of AXES.entries()) {
        if (axis !== "ordinary" && prototypes[axis].includes(t)) return unit(i, 1);
      }
      if (ordinary.includes(t)) return unit(AXES.indexOf("ordinary"), 1);
      const [axis, s] = t.split(" ");
      const i = AXES.indexOf(axis as (typeof AXES)[number]);
      return unit(i < 0 ? AXES.indexOf("ordinary") : i, Number(s ?? 1));
    });
  },
};

const snip = (id: string, source: Snippet["source"], date: string, text: string): Snippet => ({ id, source, date, text });
const today = "2026-10-17";

describe("PrototypeDetector", () => {
  it("fires on strong evidence from two sources and reports it", async () => {
    const det = new PrototypeDetector(fake, { floor: 0.3, threshold: 1.0 });
    const events = await det.detect([snip("a", "mail", "2026-10-10", "move 0.9"), snip("b", "bank", "2026-10-14", "move 0.9")], today);
    expect(events.map((e) => e.type)).toEqual(["move"]);
    expect(events[0]?.evidence.map((e) => e.snippetId).sort()).toEqual(["a", "b"]);
    expect(events[0]?.firstSignal).toBe("2026-10-10");
  });
  it("does not fire from one source alone", async () => {
    const det = new PrototypeDetector(fake, { floor: 0.3, threshold: 1.0 });
    const events = await det.detect([snip("a", "mail", "2026-10-10", "move 0.9"), snip("b", "mail", "2026-10-14", "move 0.9")], today);
    expect(events).toEqual([]);
  });
  it("ignores ordinary life and weak snippets", async () => {
    const det = new PrototypeDetector(fake, { floor: 0.3, threshold: 1.0 });
    const events = await det.detect([snip("a", "mail", "2026-10-10", "ordinary 1"), snip("b", "bank", "2026-10-14", "move 0.05")], today);
    expect(events).toEqual([]);
  });
  it("decays old evidence", async () => {
    const det = new PrototypeDetector(fake, { floor: 0.3, threshold: 1.0, halfLifeDays: 10 });
    const fresh = await det.detect([snip("a", "mail", "2026-10-15", "move 0.6"), snip("b", "bank", "2026-10-16", "move 0.6")], today);
    const stale = await det.detect([snip("c", "mail", "2026-07-15", "move 0.6"), snip("d", "bank", "2026-07-16", "move 0.6")], today);
    expect(fresh.length).toBe(1);
    expect(stale).toEqual([]);
  });
  it("respects rejected snippets and muted types", async () => {
    const det = new PrototypeDetector(fake, { floor: 0.3, threshold: 1.0 });
    const s = [snip("a", "mail", "2026-10-10", "move 0.9"), snip("b", "bank", "2026-10-14", "move 0.9")];
    expect(await det.detect(s, today, { rejectedSnippetIds: ["a"] })).toEqual([]);
    expect(await det.detect(s, today, { mutedTypes: ["move"] })).toEqual([]);
  });
  it("lets a future calendar entry decide date and place over the mail", async () => {
    const det = new PrototypeDetector(fake, { floor: 0.3, threshold: 1.0 });
    const s = [
      snip("a", "mail", "2026-10-15", "long_trip 0.9 Helsinki–Lisbon 10 Jan 2027 and movers 31.10."),
      snip("b", "calendar", "2027-01-10", "long_trip 0.9 Lisbon"),
    ];
    const [ev] = await det.detect(s, today);
    expect(ev?.estimatedDate).toBe("2027-01-10");
    expect(ev?.place).toBe("Lisbon");
  });
  it("estimates the date from the evidence and a future calendar entry", async () => {
    const det = new PrototypeDetector(fake, { floor: 0.3, threshold: 1.0 });
    const s = [snip("a", "mail", "2026-10-10", "move 0.9 alkaen 1.11.2026 Turku"), snip("b", "calendar", "2026-11-01", "move 0.9")];
    const [ev] = await det.detect(s, today);
    expect(ev?.estimatedDate).toBe("2026-11-01");
    expect(ev?.place).toBe("Turku");
  });
});

describe("routine items", () => {
  it("counts an identical text once and drops it when it recurs", async () => {
    const det = new PrototypeDetector(fake, { floor: 0.3, threshold: 1.0, maxRepeats: 2 });
    const twice = [
      snip("a", "bank", "2026-10-10", "move 0.6"),
      snip("b", "bank", "2026-10-14", "move 0.6"),
      snip("c", "mail", "2026-10-15", "move 0.6"),
    ];
    const once = await det.detect(twice, today);
    expect(once[0]?.evidence.length).toBe(2); // bank counted once, mail once
    const routine = [...twice, snip("d", "bank", "2026-10-16", "move 0.6")];
    expect(await det.detect(routine, today)).toEqual([]); // bank text recurs 3 times: routine; mail alone is one source
  });
});
