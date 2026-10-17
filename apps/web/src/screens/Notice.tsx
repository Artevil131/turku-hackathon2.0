import type { EventTimeline, LedgerEntry, LedgerStatus, Snippet, Source, SourceContribution } from "@ahead/contract";
import { describe } from "@ahead/detect/describe";
import { useEffect, useMemo, useState } from "react";
import { type Analysis, addDays, type SkyDot } from "../analysis.ts";
import { WINDOW_DAYS } from "../engine.ts";
import { formatMonth, formatShort, type Key, useI18n } from "../i18n.tsx";
import { today } from "../today.ts";
import { constellationName } from "./Home.tsx";
import { type Constellation, Sky } from "./Sky.tsx";
import { useChartWidth } from "./useChartWidth.ts";

interface Props {
  entry: LedgerEntry;
  snippets: Snippet[];
  sky: SkyDot[];
  analysis(): Promise<Analysis>;
  onRejectEvidence(snippetId: string): void;
  onAnswer(status: Exclude<LedgerStatus, "pending">): void;
  onBack(): void;
}

/** A detected event as a question, with the evidence behind it: its constellation, the numbers, the timetable, the timeline. */
export function Notice({ entry, snippets, sky, analysis, onRejectEvidence, onAnswer, onBack }: Props) {
  const { t, locale } = useI18n();
  const { event } = entry;
  const now = today();
  const text = describe(event, locale, now);
  const byId = useMemo(() => new Map(snippets.map((s) => [s.id, s])), [snippets]);
  // The detector's score is an unbounded sum, not a probability, so the notice states its basis instead.
  const sources = new Set(event.evidence.map((e) => byId.get(e.snippetId)?.source ?? e.snippetId)).size;

  const [numbers, setNumbers] = useState<{ timeline: EventTimeline; contributions: SourceContribution[] } | null>(null);
  useEffect(() => {
    if (snippets.length === 0) return;
    let cancelled = false;
    void analysis()
      .then(async (a) => {
        const [timeline, contributions] = await Promise.all([a.timeline(event, snippets, now), a.contributions(event, snippets)]);
        if (!cancelled) setNumbers({ timeline, contributions });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [analysis, event, snippets, now]);

  // The event's own constellation: its evidence (what the user has not struck) plus the timeline's signals.
  const plate = useMemo(() => {
    const kept = event.evidence.filter((ev) => !entry.rejectedEvidence.includes(ev.snippetId));
    const dotsById = new Map<string, SkyDot>();
    for (const ev of kept) {
      const s = byId.get(ev.snippetId);
      const known = sky.find((d) => d.id === ev.snippetId);
      if (s) dotsById.set(s.id, { id: s.id, source: s.source, date: s.date, margin: known?.margin ?? ev.score, type: event.type });
    }
    for (const sig of numbers?.timeline.signals ?? []) {
      if (!dotsById.has(sig.snippetId))
        dotsById.set(sig.snippetId, { id: sig.snippetId, source: sig.source, date: sig.date, margin: sig.margin, type: event.type });
    }
    const dots = [...dotsById.values()];
    const from = addDays(now, -WINDOW_DAYS);
    let to = addDays(now, 7);
    for (const d of dots) if (d.date > to) to = d.date;
    if (event.estimatedDate && event.estimatedDate > to) to = event.estimatedDate;
    const order: Source[] = ["calendar", "mail", "bank", "places", "photos", "notifications", "sms", "wifi"];
    const present = new Set(dots.map((d) => d.source));
    const bands = order.filter((s) => present.has(s)).map((source) => ({ source, label: t(`source.${source}` as Key) }));
    const constellation: Constellation = {
      id: event.id,
      type: event.type,
      label: constellationName(entry, t),
      date: event.estimatedDate ? formatShort(event.estimatedDate, locale) : undefined,
      signalIds: dots.map((d) => d.id),
      ringed: true,
    };
    return { dots, from, to, bands, constellations: [constellation] };
  }, [entry, event, sky, numbers, now, t, locale, byId]);
  const monthLabel = useMemo(() => (iso: string) => formatMonth(iso, locale), [locale]);

  return (
    <section className="notice-screen">
      <button type="button" className="back quiet" onClick={onBack}>
        {t("journey.back")}
      </button>
      {plate.dots.length > 0 && (
        <div className="sky-frame sky-frame-small">
          <Sky
            dots={plate.dots}
            constellations={plate.constellations}
            from={plate.from}
            to={plate.to}
            today={now}
            bands={plate.bands}
            monthLabel={monthLabel}
            revealKey={0}
            description={t("notice.plate", { n: plate.dots.length })}
          />
        </div>
      )}
      <h1>{text.title}</h1>
      <p className="muted">{t("notice.basis", { items: event.evidence.length, sources, days: WINDOW_DAYS })}</p>
      <p className="question">{text.question}</p>
      <div className="actions answer-actions">
        <button type="button" className="primary" onClick={() => onAnswer("confirmed")}>
          {text.answers.confirm}
        </button>
        <button type="button" onClick={() => onAnswer("dismissed")}>
          {text.answers.notNow}
        </button>
        <button type="button" onClick={() => onAnswer("never")}>
          {text.answers.never}
        </button>
      </div>

      {numbers && numbers.contributions.length > 0 && (
        <>
          <h2>{t("notice.numbers")}</h2>
          <Contributions contributions={numbers.contributions} />
        </>
      )}

      <h2>{text.why}</h2>
      <ul className="list evidence-list">
        {event.evidence.map((ev) => {
          const snippet = byId.get(ev.snippetId);
          const rejected = entry.rejectedEvidence.includes(ev.snippetId);
          return (
            <li key={ev.snippetId} className={`row evidence-row ${rejected ? "struck" : ""}`}>
              <span className="event-date">
                {snippet ? <time dateTime={snippet.date}>{formatShort(snippet.date, locale)}</time> : <span aria-hidden="true">—</span>}
              </span>
              <div className="grow">
                <div className="chip">{snippet ? t(`source.${snippet.source}` as Key) : ev.snippetId}</div>
                <div className="evidence-text">{snippet?.text ?? ev.prototype}</div>
              </div>
              {rejected ? (
                <span className="muted">{t("notice.removed")}</span>
              ) : (
                <button type="button" onClick={() => onRejectEvidence(ev.snippetId)}>
                  {text.answers.notThis}
                </button>
              )}
            </li>
          );
        })}
      </ul>

      {numbers && numbers.timeline.points.length > 1 && (
        <>
          <h2>{t("notice.timeline")}</h2>
          <TimelineChart timeline={numbers.timeline} />
          <p className="muted">{t("notice.score", { days: WINDOW_DAYS })}</p>
        </>
      )}
    </section>
  );
}

/** Per-source contribution bars: the sum of margins, the count, and the strongest snippet's text. */
function Contributions({ contributions }: { contributions: SourceContribution[] }) {
  const { t } = useI18n();
  const max = Math.max(...contributions.map((c) => c.total), 0.01);
  return (
    <ul className="list contributions">
      {contributions.map((c) => (
        <li key={c.source} className="contribution">
          <div className="contribution-head">
            <span className="chip">{t(`source.${c.source}` as Key)}</span>
            <span className="contribution-total">
              {c.total.toFixed(1)} <span className="muted">· {t("notice.signals", { n: c.count })}</span>
            </span>
          </div>
          <div className="bar" aria-hidden="true">
            <span className="bar-fill" style={{ width: `${(100 * c.total) / max}%` }} />
          </div>
          {c.strongest && (
            <p className="muted contribution-strongest">
              {t("notice.strongest")}: {c.strongest.text}
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}

/** The score per day as a line, the threshold as a hairline, the fired day marked, the signals as dots on the line. */
function TimelineChart({ timeline }: { timeline: EventTimeline }) {
  const { t, locale } = useI18n();
  const { ref, width: W } = useChartWidth();
  const H = 210;
  const left = 36;
  const right = 12;
  const top = 14;
  const bottom = 26;
  const pts = timeline.points;
  const max = Math.max(timeline.threshold * 1.4, ...pts.map((p) => p.score)) * 1.08;
  const x = (i: number) => left + (i / Math.max(1, pts.length - 1)) * (W - left - right);
  const y = (v: number) => top + (1 - v / max) * (H - top - bottom);
  const path = pts.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.score).toFixed(1)}`).join(" ");
  const fired = pts.find((p) => p.fired);
  const indexOf = (date: string) =>
    Math.max(
      0,
      pts.findIndex((p) => p.date >= date),
    );
  const months: { i: number; label: string }[] = [];
  for (const [i, p] of pts.entries()) if (p.date.endsWith("-01") || i === 0) months.push({ i, label: formatMonth(p.date, locale) });
  const ty = y(timeline.threshold);
  return (
    <figure className="plate timeline-plate">
      <svg
        ref={ref}
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={t("notice.score", { days: pts.length - 1 })}
        className="timeline-chart"
      >
        <g className="hair">
          <line x1={left} x2={W - right} y1={y(0) + 0.5} y2={y(0) + 0.5} />
          {months.map((m) => (
            <line key={m.i} x1={x(m.i) + 0.5} x2={x(m.i) + 0.5} y1={top} y2={y(0)} />
          ))}
        </g>
        <g className="rule-text">
          {months.map((m) => (
            <text key={m.i} x={x(m.i) + 4} y={H - 8}>
              {m.label.toUpperCase()}
            </text>
          ))}
          <text x={left - 6} y={ty + 4} textAnchor="end">
            {timeline.threshold}
          </text>
        </g>
        <line className="threshold" x1={left} x2={W - right} y1={ty} y2={ty} strokeDasharray="3 5" />
        <path className="score-line" d={path} />
        {timeline.signals.map((s) => (
          <circle
            key={`${s.snippetId}-${s.date}`}
            className="signal"
            cx={x(indexOf(s.date))}
            cy={y(pts[indexOf(s.date)]?.score ?? 0)}
            r={3.2}
          />
        ))}
        {fired && (
          <g className="fired">
            <circle cx={x(pts.indexOf(fired))} cy={y(fired.score)} r={9} />
            <text
              x={x(pts.indexOf(fired)) + (x(pts.indexOf(fired)) > W * 0.6 ? -14 : 14)}
              y={y(fired.score) - 12}
              textAnchor={x(pts.indexOf(fired)) > W * 0.6 ? "end" : "start"}
            >
              {t("notice.fired", { date: formatShort(fired.date, locale) })}
            </text>
          </g>
        )}
      </svg>
      <figcaption className="plate-legend">
        <span>
          <i className="legend-line" /> {t("notice.threshold", { n: timeline.threshold })}
        </span>
      </figcaption>
    </figure>
  );
}
