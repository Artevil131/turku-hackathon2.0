import { describe, expect, it } from "vitest";
import { changePoint } from "./changepoint.ts";

describe("changePoint", () => {
  it("finds the day the level shifted and reports both rates per week", () => {
    const counts = [...new Array(20).fill(1), ...new Array(20).fill(4)];
    expect(changePoint(counts)).toEqual({ index: 20, beforePerWeek: 7, afterPerWeek: 28 });
  });
  it("reports nothing on a flat series or a small shift", () => {
    expect(changePoint(new Array(40).fill(2))).toBeUndefined();
    const small = [...new Array(20).fill(2), ...new Array(20).fill(2.2)];
    expect(changePoint(small)).toBeUndefined();
    const quiet = [...new Array(20).fill(0), ...new Array(20).fill(0.1)]; // under 2 per week
    expect(changePoint(quiet)).toBeUndefined();
  });
  it("needs a minimum segment on each side", () => {
    expect(changePoint([0, 0, 0, 5, 5, 5])).toBeUndefined();
    expect(changePoint([...new Array(7).fill(0), ...new Array(7).fill(5)])).toMatchObject({ index: 7 });
  });
});
