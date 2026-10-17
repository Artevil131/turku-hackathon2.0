import type { LedgerEntry } from "@ahead/contract";
import { describe } from "@ahead/detect/describe";
import { formatDate, useI18n } from "../i18n.tsx";
import { today } from "../today.ts";

interface Props {
  ledger: LedgerEntry[];
  anySourceOn: boolean;
  checked: boolean;
  checking: boolean;
  /** Model download progress 0..100 while the on-device model loads on first use; null otherwise. */
  progress: number | null;
  error: string | null;
  onCheck(): void;
  onOpenNotice(entry: LedgerEntry): void;
  onOpenJourney(entry: LedgerEntry): void;
}

/** Quiet by default: an empty state and a "Check now" button. The app does not nag. */
export function Home({ ledger, anySourceOn, checked, checking, progress, error, onCheck, onOpenNotice, onOpenJourney }: Props) {
  const { t, locale } = useI18n();
  // Soonest first, undated last: the nearest event is the one to act on, whatever its score.
  const byDate = (a: LedgerEntry, b: LedgerEntry) => (a.event.estimatedDate ?? "9999").localeCompare(b.event.estimatedDate ?? "9999");
  const pending = ledger.filter((e) => e.status === "pending").sort(byDate);
  const confirmed = ledger.filter((e) => e.status === "confirmed").sort(byDate);
  const label = (e: LedgerEntry) => describe(e.event, locale, today()).title;

  return (
    <section className="home-screen">
      {/* With something to answer, the question is the beat; the tagline belongs to the quiet state. */}
      {pending.length > 0 ? (
        <h1>{t("home.pending")}</h1>
      ) : (
        <>
          <h1>{t("home.title")}</h1>
          <p className="screen-lead">{t("home.lead")}</p>
        </>
      )}
      {pending.length === 0 && confirmed.length === 0 && (
        <p className="empty">{checked || ledger.length > 0 ? t("home.empty") : t("home.neverChecked")}</p>
      )}
      {pending.length > 0 && (
        <ul className="list event-list">
          {pending.map((e) => (
            <li key={e.event.id} className="event-row">
              <button type="button" className="row-button grow" onClick={() => onOpenNotice(e)}>
                {e.event.estimatedDate && (
                  <time className="event-date" dateTime={e.event.estimatedDate}>
                    {formatDate(e.event.estimatedDate, locale)}
                  </time>
                )}
                <span className="row-title">{label(e)}</span>
                <svg
                  className="event-arrow"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  aria-hidden="true"
                >
                  <path d="M5 12h14m-6-6 6 6-6 6" />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      )}
      {confirmed.length > 0 && (
        <>
          <h2>{t("home.journeys")}</h2>
          <ul className="list event-list">
            {confirmed.map((e) => (
              <li key={e.event.id} className="event-row">
                <button type="button" className="row-button grow" onClick={() => onOpenJourney(e)}>
                  {e.event.estimatedDate && (
                    <time className="event-date" dateTime={e.event.estimatedDate}>
                      {formatDate(e.event.estimatedDate, locale)}
                    </time>
                  )}
                  <span className="row-title">{label(e)}</span>
                  <svg
                    className="event-arrow"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    aria-hidden="true"
                  >
                    <path d="M5 12h14m-6-6 6 6-6 6" />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
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
    </section>
  );
}
