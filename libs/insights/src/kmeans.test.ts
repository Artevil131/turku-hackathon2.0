import { describe, expect, it } from "vitest";
import { kmeans, seeded } from "./kmeans.ts";

const v = (...xs: number[]) => {
  const a = new Float32Array(xs);
  let n = 0;
  for (const x of a) n += x * x;
  return a.map((x) => x / Math.sqrt(n));
};

describe("kmeans", () => {
  it("separates two obvious groups and is deterministic", () => {
    const vectors = [v(1, 0.1, 0), v(1, 0, 0.1), v(0.9, 0.1, 0.1), v(0, 1, 0.1), v(0.1, 1, 0), v(0, 0.9, 0.1)];
    const a = kmeans(vectors, 2);
    const b = kmeans(vectors, 2);
    expect(a.assignment).toEqual(b.assignment);
    expect(new Set(a.assignment.slice(0, 3)).size).toBe(1);
    expect(new Set(a.assignment.slice(3)).size).toBe(1);
    expect(a.assignment[0]).not.toBe(a.assignment[3]);
    expect(a.centroids.length).toBe(2);
  });
  it("uses at most as many clusters as vectors, and none for none", () => {
    expect(kmeans([v(1, 0), v(0, 1)], 5).centroids.length).toBe(2);
    expect(kmeans([], 5)).toEqual({ assignment: [], centroids: [] });
  });
  it("seeded PRNG repeats", () => {
    const a = seeded(7);
    const b = seeded(7);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });
});
