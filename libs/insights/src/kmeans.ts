// Plain k-means on L2-normalised vectors, seeded so the same month always
// gives the same clusters. Distance is 1 - cosine, which on unit vectors
// orders the same as Euclidean distance; centroids are re-normalised.

import { cosine } from "@ahead/embed";

/** mulberry32: a small deterministic PRNG, enough to pick seeds. */
export function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface KMeansResult {
  /** Cluster index per input vector. */
  assignment: number[];
  centroids: Float32Array[];
}

export function normalise(v: Float32Array): Float32Array {
  let n = 0;
  for (const x of v) n += x * x;
  n = Math.sqrt(n);
  return n > 0 ? v.map((x) => x / n) : v;
}

export function mean(vectors: readonly Float32Array[], dim: number): Float32Array {
  const m = new Float32Array(dim);
  for (const v of vectors) for (let i = 0; i < dim; i++) m[i] = (m[i] ?? 0) + (v[i] ?? 0);
  if (vectors.length > 0) for (let i = 0; i < dim; i++) m[i] = (m[i] ?? 0) / vectors.length;
  return m;
}

/**
 * k-means++ seeding from `seed`, then `iterations` rounds of assign-and-update (fewer if nothing moves).
 * With fewer vectors than `k`, every vector is its own cluster.
 */
export function kmeans(vectors: readonly Float32Array[], k: number, iterations = 20, seed = 1): KMeansResult {
  const n = vectors.length;
  if (n === 0) return { assignment: [], centroids: [] };
  const dim = vectors[0]?.length ?? 0;
  k = Math.min(k, n);
  const rand = seeded(seed);
  const dist = (a: Float32Array, b: Float32Array) => Math.max(0, 1 - cosine(a, b));

  // k-means++: the first centre at random, each next one with probability proportional to its squared distance.
  const centroids: Float32Array[] = [vectors[Math.floor(rand() * n)] as Float32Array];
  const nearest = new Float64Array(n).fill(Number.POSITIVE_INFINITY);
  while (centroids.length < k) {
    const last = centroids[centroids.length - 1] as Float32Array;
    let total = 0;
    for (let i = 0; i < n; i++) {
      const d = dist(vectors[i] as Float32Array, last) ** 2;
      if (d < (nearest[i] as number)) nearest[i] = d;
      total += nearest[i] as number;
    }
    let r = rand() * total;
    let pick = n - 1;
    for (let i = 0; i < n; i++) {
      r -= nearest[i] as number;
      if (r <= 0) {
        pick = i;
        break;
      }
    }
    centroids.push(vectors[pick] as Float32Array);
  }

  const assignment = new Array<number>(n).fill(0);
  for (let it = 0; it < iterations; it++) {
    let moved = false;
    for (let i = 0; i < n; i++) {
      let best = 0;
      let bd = Number.POSITIVE_INFINITY;
      for (const [c, centroid] of centroids.entries()) {
        const d = dist(vectors[i] as Float32Array, centroid);
        if (d < bd) {
          bd = d;
          best = c;
        }
      }
      if (assignment[i] !== best) moved = true;
      assignment[i] = best;
    }
    for (let c = 0; c < k; c++) {
      const members = vectors.filter((_, i) => assignment[i] === c);
      if (members.length > 0) centroids[c] = normalise(mean(members, dim));
    }
    if (!moved && it > 0) break;
  }
  return { assignment, centroids };
}
