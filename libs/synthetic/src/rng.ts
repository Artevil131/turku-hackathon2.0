/** Small deterministic PRNG (mulberry32) so a persona is the same on every machine. */
export function rng(seed: number) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int: (lo: number, hi: number) => lo + Math.floor(next() * (hi - lo + 1)),
    pick: <T>(xs: readonly T[]): T => {
      const x = xs[Math.floor(next() * xs.length)];
      if (x === undefined) throw new Error("pick from empty array");
      return x;
    },
    chance: (p: number) => next() < p,
  };
}
export type Rng = ReturnType<typeof rng>;
