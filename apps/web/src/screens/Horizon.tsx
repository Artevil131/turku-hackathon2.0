import type { CrossInsight, Horizon as HorizonData, LedgerEntry } from "@ahead/contract";
import { useEffect, useMemo, useState } from "react";
import { type Analysis, addDays, daysBetween } from "../analysis.ts";
import { formatDate, formatMonth, formatShort, type Key, useI18n } from "../i18n.tsx";
import { bySoonest } from "../order.ts";
import { today } from "../today.ts";
import { constellationName } from "./Home.tsx";

interface Props {
  ledger: LedgerEntry[];
  analysis(): Promise<Analysis>;
  onOpen(entry: LedgerEntry): void;
}

const KINDS: readonly CrossInsight["kind"][] = ["weather-at-event", "lapse", "empty-home", "same-month", "spend-shift"];

/** The next 90 days: a plate with the events as ringed stars on their dates and the insights as bands over their periods. */
export function Horizon({ ledger, analysis, onOpen }: Props) {
  const { t, locale } = useI18n();
  const now = today();
  const [horizon, setHorizon] = useState<HorizonData | null>(null);
  const [example, setExample] = useState(false);
  const live = useMemo(() => bySoonest(ledger.filter((e) => e.status === "pending" || e.status === "confirmed")), [ledger]);
  useEffect(() => {
    let cancelled = false;
    void analysis()
      .then(async (a) => {
        const h = await a.horizon(
          live.map((e) => e.event),
          now,
        );
        if (cancelled) return;
        setHorizon(h);
        setExample(a.mocked.horizon);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [analysis, live, now]);

  const byId = new Map(live.map((e) => [e.event.id, e]));
  const events = horizon?.events ?? [];
  const insights = horizon?.insights ?? [];
  const to = horizon?.to ?? addDays(now, 90);
  const span = Math.max(1, daysBetween(now, to));

  // The plate's geometry: a horizontal axis from today to +90, bands stacked under it.
  const W = 720;
  const left = 12;
  const right = 12;
  const axisY = 76;
  const bandH = 30;
  const H = axisY + 24 + Math.max(1, insights.length) * bandH + 8;
  const x = (iso: string) => left + (Math.min(span, Math.max(0, daysBetween(now, iso))) / span) * (W - left - right);
  const months: string[] = [];
  for (let d = addDays(now, 1); d <= to; d = addDays(d, 1)) if (d.endsWith("-01")) months.push(d);
  const label = (entry: LedgerEntry | undefined) => (entry ? constellationName(entry, t) : "");
  const insightTitle = (i: CrossInsight) => (KINDS.includes(i.kind) ? t(`insight.${i.kind}` as Key) : i.kind);

  return (
    <section className="horizon-screen">
      <h1>{t("horizon.title")}</h1>
      <p className="screen-lead">{t("horizon.lead")}</p>
      <figure className="plate horizon-plate">
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={t("horizon.title")} className="horizon-chart">
          <g className="hair">
            <line x1={left} x2={W - right} y1={axisY + 0.5} y2={axisY + 0.5} />
            {months.map((m) => (
              <line key={m} x1={x(m) + 0.5} x2={x(m) + 0.5} y1={axisY - 6} y2={H - 8} />
            ))}
          </g>
          <g className="rule-text">
            <text x={left} y={axisY + 18}>
              {t("horizon.today").toUpperCase()}
            </text>
            {months.map((m) => (
              <text key={m} x={x(m) + 4} y={axisY + 18}>
                {formatMonth(m, locale).toUpperCase()}
              </text>
            ))}
            <text x={W - right} y={axisY + 18} textAnchor="end">
              +90
            </text>
          </g>
          <line className="today-rule" x1={x(now) + 0.5} x2={x(now) + 0.5} y1={axisY - 40} y2={H - 8} strokeDasharray="2 4" />
          {insights.map((i, k) => {
            const from = i.from ?? now;
            const until = i.to ?? i.from ?? to;
            const y0 = axisY + 28 + k * bandH;
            const w = Math.max(6, x(until) - x(from));
            return (
              <g key={i.id} className={`band band-${i.kind}`}>
                <rect x={x(from)} y={y0} width={w} height={bandH - 8} rx={2} />
                <text
                  x={x(from) + w + 8 > W * 0.7 ? x(from) - 8 : x(from) + w + 8}
                  y={y0 + 15}
                  textAnchor={x(from) + w + 8 > W * 0.7 ? "end" : "start"}
                >
                  {insightTitle(i)}
                </text>
              </g>
            );
          })}
          {events.map(({ event, date }, k) => {
            const ex = x(date);
            const anchor = ex > W * 0.72 ? "end" : "start";
            const tx = ex + (anchor === "end" ? -14 : 14);
            return (
              <g key={event.id} className="star">
                <circle cx={ex} cy={axisY} r={4.5} className="star-dot" />
                <circle cx={ex} cy={axisY} r={11} className="star-ring" />
                <text className="star-name" x={tx} y={axisY - 30 + (k % 2) * 0} textAnchor={anchor}>
                  {label(byId.get(event.id))}
                </text>
                <text className="star-date" x={tx} y={axisY - 12} textAnchor={anchor}>
                  {formatShort(date, locale)}
                </text>
              </g>
            );
          })}
        </svg>
      </figure>
      {events.length === 0 && horizon && <p className="empty">{t("horizon.empty")}</p>}
      {events.length > 0 && (
        <ul className="list event-list">
          {events.map(({ event, date }) => {
            const entry = byId.get(event.id);
            if (!entry) return null;
            return (
              <li key={event.id} className="event-row">
                <button type="button" className="row-button grow" onClick={() => onOpen(entry)}>
                  <span className="event-date">
                    <time dateTime={date}>{formatDate(date, locale)}</time>
                  </span>
                  <span className="row-title serif">{label(entry)}</span>
                  <svg
                    className="event-arrow"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    aria-hidden="true"
                  >
                    <path d="M5 12h14m-6-6 6 6-6 6" />
                  </svg>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {insights.length > 0 && (
        <>
          <h2>{t("horizon.insights")}</h2>
          {example && <p className="muted example-note">{t("horizon.example")}</p>}
          <ul className="list insights">
            {insights.map((i) => (
              <li key={i.id} className={`insight insight-${i.kind}`}>
                <div className="insight-head">
                  <span className="chip">{insightTitle(i)}</span>
                  {(i.from || i.to) && (
                    <span className="event-date">
                      {i.from && <time dateTime={i.from}>{formatShort(i.from, locale)}</time>}
                      {i.from && i.to && i.to !== i.from && <>–</>}
                      {i.to && i.to !== i.from && <time dateTime={i.to}>{formatShort(i.to, locale)}</time>}
                    </span>
                  )}
                </div>
                <h3>{i.title}</h3>
                <p>{i.body}</p>
                <div className="card-foot">
                  {i.sourceName &&
                    (i.sourceUrl ? (
                      <a href={i.sourceUrl} target="_blank" rel="noreferrer">
                        {t("journey.source")}: {i.sourceName}
                      </a>
                    ) : (
                      <span className="muted">
                        {t("journey.source")}: {i.sourceName}
                      </span>
                    ))}
                  {i.eventIds.length > 0 && (
                    <span className="muted">
                      {t("horizon.about", {
                        events: i.eventIds
                          .map((id) => label(byId.get(id)))
                          .filter(Boolean)
                          .join(", "),
                      })}
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
