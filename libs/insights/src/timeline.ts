// The detector replayed day by day over the window. Every day sees what
// the adapters would have given it that day; the detector's vector cache
// means the replay embeds nothing it has already seen.

import type { DetectorOptions, EventTimeline, EventType, IsoDate, Snippet, TimelineSignal } from "@ahead/contract";
import type { PrototypeDetector, Scored } from "@ahead/detect";
import { addDays } from "@ahead/opendata";
import { round3, visibleOn, WINDOW_DAYS } from "./window.ts";

export function toSignal(x: Scored): TimelineSignal {
  return { date: x.snippet.date, source: x.snippet.source, snippetId: x.snippet.id, text: x.snippet.text, margin: round3(x.margin) };
}

export async function timeline(
  detector: PrototypeDetector,
  snippets: readonly Snippet[],
  type: EventType,
  today: IsoDate,
  options: { days?: number; detector?: DetectorOptions } = {},
): Promise<EventTimeline> {
  const days = options.days ?? WINDOW_DAYS;
  const from = addDays(today, -days);
  const points: EventTimeline["points"] = [];
  const signals = new Map<string, TimelineSignal>();
  for (let i = 0; i <= days; i++) {
    const day = addDays(from, i);
    const e = (await detector.scoresOn(visibleOn(snippets, day), day, options.detector)).get(type);
    points.push({ date: day, score: round3(e?.score ?? 0), fired: e ? detector.fires(e) : false });
    for (const x of e?.evidence ?? []) if (!signals.has(x.snippet.id)) signals.set(x.snippet.id, toSignal(x));
  }
  return {
    type,
    from,
    to: today,
    points,
    signals: [...signals.values()].sort((a, b) => a.date.localeCompare(b.date) || a.snippetId.localeCompare(b.snippetId)),
    threshold: detector.params.threshold,
  };
}
