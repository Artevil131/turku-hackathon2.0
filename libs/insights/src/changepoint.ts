// A single change point in a daily count series, CUSUM style: the day
// where the cumulative sum of deviations from the overall mean is
// furthest from zero is where the level shifted. Reported only when the
// shift is large enough to mean something on a phone: at least half the
// earlier rate, and at least two items a week.

export interface Shift {
  /** Index of the first day of the "after" segment. */
  index: number;
  beforePerWeek: number;
  afterPerWeek: number;
}

export interface ChangePointParams {
  /** Days each segment must have at least. */
  minSegment: number;
  /** Relative change required, against the larger of the two rates. */
  minRelative: number;
  /** Absolute change required, per week. */
  minPerWeek: number;
}

export const DEFAULT_CHANGE_POINT: ChangePointParams = { minSegment: 7, minRelative: 0.5, minPerWeek: 2 };

/** The level shift in `counts` (one number per day), or undefined when there is none worth reporting. */
export function changePoint(counts: readonly number[], params: Partial<ChangePointParams> = {}): Shift | undefined {
  const p = { ...DEFAULT_CHANGE_POINT, ...params };
  const n = counts.length;
  if (n < 2 * p.minSegment) return undefined;
  let total = 0;
  for (const c of counts) total += c;
  const overall = total / n;
  let s = 0;
  let best = -1;
  let bestAbs = 0;
  for (let i = 0; i < n - 1; i++) {
    s += (counts[i] ?? 0) - overall;
    const after = i + 1;
    if (after < p.minSegment || n - after < p.minSegment) continue;
    if (Math.abs(s) > bestAbs) {
      bestAbs = Math.abs(s);
      best = after;
    }
  }
  if (best < 0) return undefined;
  let b = 0;
  for (let i = 0; i < best; i++) b += counts[i] ?? 0;
  const beforePerWeek = (7 * b) / best;
  const afterPerWeek = (7 * (total - b)) / (n - best);
  const diff = Math.abs(afterPerWeek - beforePerWeek);
  if (diff < p.minPerWeek || diff < p.minRelative * Math.max(beforePerWeek, afterPerWeek)) return undefined;
  return { index: best, beforePerWeek: round1(beforePerWeek), afterPerWeek: round1(afterPerWeek) };
}

function round1(x: number): number {
  return Math.round(x * 10) / 10;
}
