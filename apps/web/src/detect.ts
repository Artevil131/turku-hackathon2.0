import type { DetectedEvent, EventType, IsoDate, LedgerEntry, Snippet, Source } from "@ahead/contract";
import { type Engine, readSnippets } from "./engine.ts";

export interface CheckInput {
  engine: Engine;
  enabled: readonly Source[];
  today: IsoDate;
  /** What the user already answered: rejected evidence and muted event types are not detected again. */
  ledger: readonly LedgerEntry[];
}

export interface CheckResult {
  events: DetectedEvent[];
  /** The snippets the events were detected from, so the notice can show its evidence. */
  snippets: Snippet[];
}

/** "Check now": `detector.detect(adapterSnippets, today)` (WORK.md, Integration). */
export async function checkNow({ engine, enabled, today, ledger }: CheckInput): Promise<CheckResult> {
  const snippets = await readSnippets(engine, enabled, today);
  const rejectedSnippetIds = ledger.flatMap((e) => e.rejectedEvidence);
  const mutedTypes: EventType[] = ledger.filter((e) => e.status === "never").map((e) => e.event.type);
  const events = await engine.detector.detect(snippets, today, { rejectedSnippetIds, mutedTypes });
  return { events, snippets };
}
