import "fake-indexeddb/auto";
import { mockLedger, mockMoveJourney } from "@ahead/contract/mock";
import { expect, test } from "vitest";
import { createStore } from "./store.ts";

test("every source starts off", async () => {
  const s = createStore("t1");
  const sources = await s.sources();
  expect(sources.length).toBeGreaterThan(0);
  expect(sources.every((x) => !x.enabled)).toBe(true);
});

test("ledger and journey round-trip, and eraseAll clears them", async () => {
  const s = createStore("t2");
  await s.setSource({ source: "mail", enabled: true });
  const [entry] = mockLedger;
  if (!entry) throw new Error("mock ledger is empty");
  await s.upsertLedger(entry);
  await s.putJourney(mockMoveJourney);
  expect(await s.ledger()).toHaveLength(1);
  expect((await s.journey("evt-move-1"))?.items.length).toBeGreaterThan(0);
  await s.eraseAll();
  expect(await s.ledger()).toHaveLength(0);
  expect(await s.journey("evt-move-1")).toBeUndefined();
  expect((await s.sources()).every((x) => !x.enabled)).toBe(true);
});

test("vectors persist and are erased with everything else", async () => {
  const s = createStore("t3");
  expect(await s.vectors()).toBeUndefined();
  const snapshot = { modelId: "m", dim: 2, ids: ["a", "b"], data: new Float32Array([1, 0, 0, 1]) };
  await s.putVectors(snapshot);
  const back = await s.vectors();
  expect(back?.ids).toEqual(["a", "b"]);
  expect(Array.from(back?.data ?? [])).toEqual([1, 0, 0, 1]);
  await s.eraseAll();
  expect(await s.vectors()).toBeUndefined();
});
