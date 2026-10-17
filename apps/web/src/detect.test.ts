import { syntheticAdapters } from "@ahead/adapters";
import type { Detector, DetectorOptions, Embedder, LedgerEntry, Snippet, Source } from "@ahead/contract";
import { mockMove, mockSnippets } from "@ahead/contract/mock";
import { PrototypeDetector } from "@ahead/detect";
import { expect, test } from "vitest";
import { checkNow } from "./detect.ts";
import { createMockEngine, type Engine, readSnippets, withCalendar } from "./engine.ts";

const TODAY = "2026-10-17";
const entry = (status: LedgerEntry["status"], rejected: string[] = []): LedgerEntry => ({
  event: mockMove,
  status,
  rejectedEvidence: rejected,
  shared: false,
});

test("only enabled sources are read, and the window ends today", async () => {
  const seen: Source[] = [];
  const engine: Engine = {
    adapters: syntheticAdapters(mockSnippets).map((a) => ({
      source: a.source,
      read: (w) => {
        seen.push(a.source);
        expect(w.to).toBe(TODAY);
        expect(w.from).toBe("2026-08-18");
        return a.read(w);
      },
    })),
    detector: { detect: async () => [] },
  };
  await checkNow({ engine, enabled: ["mail", "calendar"], today: TODAY, ledger: [] });
  expect(seen.sort()).toEqual(["calendar", "mail"]);
});

test("rejected evidence and muted types reach the detector", async () => {
  let got: DetectorOptions | undefined;
  const detector: Detector = {
    detect: async (_s, _t, o) => {
      got = o;
      return [];
    },
  };
  const engine: Engine = { adapters: syntheticAdapters(mockSnippets), detector };
  await checkNow({ engine, enabled: ["mail"], today: TODAY, ledger: [entry("never", ["bank-1207"]), entry("pending", ["cal-88"])] });
  expect(got?.mutedTypes).toEqual(["move"]);
  expect(got?.rejectedSnippetIds).toEqual(["bank-1207", "cal-88"]);
});

test("mock engine needs two sources before it fires, and honours 'not this'", async () => {
  const engine = createMockEngine();
  const run = (enabled: Source[], ledger: LedgerEntry[] = []) => checkNow({ engine, enabled, today: TODAY, ledger });

  expect((await run(["calendar"])).events).toEqual([]);
  const both = await run(["calendar", "mail"]);
  expect(both.events).toHaveLength(1);
  expect(both.snippets.length).toBeGreaterThan(0);

  const rejected = await run(["calendar", "mail"], [entry("pending", ["cal-88", "mail-0412", "mail-0420"])]);
  expect(rejected.events).toEqual([]);
  expect((await run(["calendar", "mail"], [entry("never")])).events).toEqual([]);
});

// The real detector class behind the same seam, with a deterministic stand-in for the model.
class HashEmbedder implements Embedder {
  readonly id = "hash";
  readonly dim = 16;
  async embed(texts: readonly string[]): Promise<Float32Array[]> {
    return texts.map((t) => {
      const v = new Float32Array(this.dim);
      for (let i = 0; i < t.length; i++) v[t.charCodeAt(i) % this.dim] = (v[t.charCodeAt(i) % this.dim] ?? 0) + 1;
      const n = Math.hypot(...v) || 1;
      return v.map((x) => x / n);
    });
  }
}

test("A's PrototypeDetector plugs into the engine seam", async () => {
  const snippets: Snippet[] = mockSnippets;
  const engine: Engine = { adapters: syntheticAdapters(snippets), detector: new PrototypeDetector(new HashEmbedder()) };
  const result = await checkNow({ engine, enabled: ["mail", "calendar", "bank"], today: TODAY, ledger: [] });
  expect(Array.isArray(result.events)).toBe(true);
  expect(result.snippets.length).toBeGreaterThan(0);
});

test("a calendar file replaces the phone's calendar and can be taken back", async () => {
  const base = createMockEngine();
  const mine: Snippet[] = [{ id: "cal-mine", source: "calendar", date: "2026-10-20", text: "Muuttoauto haettava" }];
  const withFile = withCalendar(base, mine);
  expect((await readSnippets(withFile, ["calendar"], TODAY)).map((s) => s.id)).toEqual(["cal-mine"]);
  const back = withCalendar(withFile, undefined);
  expect((await readSnippets(back, ["calendar"], TODAY)).map((s) => s.id)).toEqual(["cal-88"]);
  expect(back.detector).toBe(base.detector);
});
