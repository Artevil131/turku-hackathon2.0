import type { LedgerEntry } from "@ahead/contract";

/** Soonest event first, undated last (A's review: the move, not the highest score, leads the home screen). */
export function bySoonest(entries: readonly LedgerEntry[]): LedgerEntry[] {
  return [...entries].sort((a, b) => {
    const x = a.event.estimatedDate;
    const y = b.event.estimatedDate;
    if (x === y) return 0;
    if (!x) return 1;
    if (!y) return -1;
    return x < y ? -1 : 1;
  });
}
