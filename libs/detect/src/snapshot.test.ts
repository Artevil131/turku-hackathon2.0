import { describe, expect, it } from "vitest";
import { fromSnapshot, toSnapshot } from "./snapshot.ts";

describe("vector snapshot", () => {
  const cache = new Map([
    ["a", new Float32Array([1, 0, 0])],
    ["b", new Float32Array([0, 1, 0])],
  ]);
  it("round-trips", () => {
    const snap = toSnapshot("m", 3, cache);
    expect(snap.data.length).toBe(6);
    const back = fromSnapshot(snap, "m", 3);
    expect([...back.keys()]).toEqual(["a", "b"]);
    expect([...(back.get("b") as Float32Array)]).toEqual([0, 1, 0]);
  });
  it("refuses another model's vectors", () => {
    expect(fromSnapshot(toSnapshot("m", 3, cache), "other", 3).size).toBe(0);
  });
});
