import type { LedgerEntry, Source, SourceState } from "@ahead/contract";
import { describe } from "@ahead/detect/describe";
import { useEffect, useMemo, useRef } from "react";
import { addDays, type SkyDot } from "../analysis.ts";
import { WINDOW_DAYS } from "../engine.ts";
import { formatDate, formatMonth, formatShort, type Key, useI18n } from "../i18n.tsx";
import { bySoonest } from "../order.ts";
import { today } from "../today.ts";
import { type Constellation, Sky } from "./Sky.tsx";

interface Props {
  ledger: LedgerEntry[];
  /** Every snippet in the window as a star; empty before the sources are read. */
  sky: SkyDot[];
  sources: SourceState[];
  /** Replays the reveal after each Check now. */
  revealKey: number;
  anySourceOn: boolean;
  checked: boolean;
  checking: boolean;
  /** Model download progress 0..100 while the on-device model loads on first use; null otherwise. */
  progress: number | null;
  error: string | null;
  onCheck(): void;
  onOpenNotice(entry: LedgerEntry): void;
  onOpenJourney(entry: LedgerEntry): void;
  onHorizon(): void;
  onMonth(): void;
}

/** The constellation's name: the event type and its place, both from code. */
export function constellationName(entry: LedgerEntry, t: (k: Key, v?: Record<string, string | number>) => string): string {
  const name = t(`event.${entry.event.type}` as Key);
  const label = name.charAt(0).toUpperCase() + name.slice(1);
  return entry.event.place ? `${label}, ${entry.event.place}` : label;
}

/** The sky plate, then what needs an answer as a timetable, then Check now. The app does not nag. */
export function Home({
  ledger,
  sky,
  sources,
  revealKey,
  anySourceOn,
  checked,
  checking,
  progress,
  error,
  onCheck,
  onOpenNotice,
  onOpenJourney,
  onHorizon,
  onMonth,
}: Props) {
  const { t, locale } = useI18n();
  const now = today();
  // Soonest first, undated last (order.ts): the nearest event is the one to act on, whatever its score.
  const pending = bySoonest(ledger.filter((e) => e.status === "pending"));
  const confirmed = bySoonest(ledger.filter((e) => e.status === "confirmed"));
  const label = (e: LedgerEntry) => describe(e.event, locale, now).title;

  const { constellations, from, to, dots } = useMemo(() => {
    const live = bySoonest(ledger.filter((e) => e.status === "pending" || e.status === "confirmed"));
    const soonest = live[0];
    const constellations: Constellation[] = live.map((e) => ({
      id: e.event.id,
      type: e.event.type,
      label: constellationName(e, t),
      date: e.event.estimatedDate ? formatShort(e.event.estimatedDate, locale) : undefined,
      signalIds: e.event.evidence.map((ev) => ev.snippetId).filter((id) => !e.rejectedEvidence.includes(id)),
      ringed: soonest !== undefined && e.event.id === soonest.event.id,
    }));
    // The plate spans the window and a little of what is ahead: the figures' own dates, never the whole look-ahead.
    const from = addDays(now, -WINDOW_DAYS);
    const signalIds = new Set(constellations.flatMap((c) => c.signalIds));
    let to = addDays(now, 14);
    for (const d of sky) if (signalIds.has(d.id) && d.date > to) to = d.date;
    for (const e of live) if (e.event.estimatedDate && e.event.estimatedDate > to) to = e.event.estimatedDate;
    const cap = addDays(now, 120);
    if (to > cap) to = cap;
    return { constellations, from, to, dots: sky.filter((d) => d.date >= from && d.date <= to) };
  }, [ledger, sky, now, t, locale]);
  const bandSources = useMemo(() => {
    const present = new Set<Source>(dots.map((d) => d.source));
    const on = sources.filter((s) => s.enabled || present.has(s.source)).map((s) => s.source);
    return on.length > 0 ? on : sources.slice(0, 3).map((s) => s.source);
  }, [dots, sources]);
  const bands = useMemo(() => bandSources.map((source) => ({ source, label: t(`source.${source}` as Key) })), [bandSources, t]);
  const monthLabel = useMemo(() => (iso: string) => formatMonth(iso, locale), [locale]);
  // The rows arrive after the constellations only on the render that follows a check; a revisit shows them in place.
  const seenReveal = useRef(revealKey);
  const reveal = revealKey !== seenReveal.current;
  useEffect(() => {
    seenReveal.current = revealKey;
  }, [revealKey]);

  const row = (e: LedgerEntry, open: (e: LedgerEntry) => void) => (
    <li key={e.event.id} className="event-row">
      <button type="button" className="row-button grow" onClick={() => open(e)}>
        <span className="event-date">
          {e.event.estimatedDate ? (
            <time dateTime={e.event.estimatedDate}>{formatDate(e.event.estimatedDate, locale)}</time>
          ) : (
            <span aria-hidden="true">—</span>
          )}
        </span>
        <span className="row-title">{label(e)}</span>
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

  return (
    <section className="home-screen">
      <h1 className="visually-hidden">{t("appName")}</h1>
      <div className="sky-frame">
        <Sky
          dots={dots}
          constellations={constellations}
          from={from}
          to={to}
          today={now}
          bands={bands}
          monthLabel={monthLabel}
          revealKey={revealKey}
          description={t("sky.description", { dots: dots.length, sources: bandSources.length, events: constellations.length })}
        />
        <div className="sky-caption" aria-hidden="true">
          <span>{t("sky.window", { days: WINDOW_DAYS })}</span>
          {dots.length === 0 && !checking && <span>{t("sky.unread")}</span>}
        </div>
      </div>
      {/* With something to answer, the question is the beat; the tagline belongs to the quiet state. */}
      {pending.length > 0 ? (
        <h2 className="task-heading">{t("home.pending")}</h2>
      ) : (
        <>
          <h2 className="task-heading">{t("home.title")}</h2>
          <p className="screen-lead">{t("home.lead")}</p>
        </>
      )}
      {pending.length === 0 && confirmed.length === 0 && (
        <p className="empty">{checked || ledger.length > 0 ? t("home.empty") : t("home.neverChecked")}</p>
      )}
      {pending.length > 0 && <ul className={`list event-list ${reveal ? "reveal" : ""}`}>{pending.map((e) => row(e, onOpenNotice))}</ul>}
      {confirmed.length > 0 && (
        <>
          <h2>{t("home.journeys")}</h2>
          <ul className={`list event-list ${reveal ? "reveal" : ""}`}>{confirmed.map((e) => row(e, onOpenJourney))}</ul>
        </>
      )}
      <div className="actions">
        <button type="button" className="primary" disabled={checking || !anySourceOn} onClick={onCheck}>
          {checking ? t("home.checking") : t("home.check")}
        </button>
      </div>
      {checking && (
        <p className="muted" role="status">
          {progress !== null && <progress max={100} value={progress} />}{" "}
          {progress !== null ? t("home.loadingModel", { pct: progress }) : t("home.reading")}
        </p>
      )}
      {error && (
        <p className="muted" role="alert">
          {t("home.failed", { reason: error })}
        </p>
      )}
      {!anySourceOn && <p className="muted">{t("home.noSources")}</p>}
      <ul className="list plate-links">
        <li>
          <button type="button" className="plate-link" onClick={onHorizon}>
            <span className="row-title serif">{t("home.horizon")}</span>
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
        <li>
          <button type="button" className="plate-link" onClick={onMonth}>
            <span className="row-title serif">{t("home.month")}</span>
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
      </ul>
    </section>
  );
}
