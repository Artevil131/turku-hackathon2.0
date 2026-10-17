// The Analyst over one phone's snippets and one detector. Everything is
// computed on the device from what the adapters already read; the
// detector's cache means a snippet is embedded once for detection and
// every analysis after it.

import type {
  Analyst,
  DetectedEvent,
  DetectorOptions,
  EventTimeline,
  EventType,
  Horizon,
  IsoDate,
  Novelty,
  Snippet,
  SourceContribution,
} from "@ahead/contract";
import type { PrototypeDetector } from "@ahead/detect";
import type { FmiWarning } from "@ahead/opendata";
import { horizon } from "./horizon.ts";
import { changePoints, novelty } from "./novelty.ts";
import { timeline } from "./timeline.ts";
import { round3 } from "./window.ts";

export interface AnalystOptions {
  detector: PrototypeDetector;
  /** Everything the adapters read; each analysis picks its own window. */
  snippets: readonly Snippet[];
  /** FMI warnings for the horizon: the live set or the example set, the app's choice. */
  warnings?: readonly FmiWarning[];
  /** Rejected snippets and muted types, as given to the detector. */
  detectorOptions?: DetectorOptions;
}

export class OnDeviceAnalyst implements Analyst {
  private readonly detector: PrototypeDetector;
  private readonly snippets: readonly Snippet[];
  private readonly warnings: readonly FmiWarning[];
  private readonly detectorOptions: DetectorOptions | undefined;

  constructor(options: AnalystOptions) {
    this.detector = options.detector;
    this.snippets = options.snippets;
    this.warnings = options.warnings ?? [];
    this.detectorOptions = options.detectorOptions;
  }

  timeline(type: EventType, today: IsoDate): Promise<EventTimeline> {
    return timeline(this.detector, this.snippets, type, today, { detector: this.detectorOptions });
  }

  async contributions(event: DetectedEvent): Promise<SourceContribution[]> {
    const byId = new Map(this.snippets.map((s) => [s.id, s]));
    const out = new Map<string, SourceContribution>();
    for (const e of event.evidence) {
      const s = byId.get(e.snippetId);
      if (!s) continue;
      const c = out.get(s.source) ?? { source: s.source, total: 0, count: 0 };
      c.total += e.score;
      c.count += 1;
      if (!c.strongest || e.score > c.strongest.margin)
        c.strongest = { date: s.date, source: s.source, snippetId: s.id, text: s.text, margin: e.score };
      out.set(s.source, c);
    }
    return [...out.values()].map((c) => ({ ...c, total: round3(c.total) })).sort((a, b) => b.total - a.total);
  }

  novelty(today: IsoDate): Promise<Novelty> {
    return novelty(this.detector, this.snippets, today);
  }

  async horizon(events: readonly DetectedEvent[], today: IsoDate): Promise<Horizon> {
    return horizon(events, today, { snippets: this.snippets, warnings: this.warnings, changePoints: changePoints(this.snippets, today) });
  }
}
