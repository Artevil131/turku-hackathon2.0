import type { DetectedEvent, Source } from "@ahead/contract";
import { mockMove } from "@ahead/contract/mock";

/**
 * "Check now". Mock until machine A publishes @ahead/detect (WORK.md, Integration):
 * then this becomes `detector.detect(adapterSnippets, today)`.
 */
export async function checkNow(_enabled: readonly Source[]): Promise<DetectedEvent[]> {
  await new Promise((r) => setTimeout(r, 600));
  return [mockMove];
}
