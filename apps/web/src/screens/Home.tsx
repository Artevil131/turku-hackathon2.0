import type { LedgerEntry } from "@ahead/contract";
import { formatDate, type Key, useI18n } from "../i18n.tsx";

interface Props {
  ledger: LedgerEntry[];
  anySourceOn: boolean;
  checked: boolean;
  checking: boolean;
  onCheck(): void;
  onOpenNotice(entry: LedgerEntry): void;
  onOpenJourney(entry: LedgerEntry): void;
}

/** Quiet by default: an empty state and a "Check now" button. The app does not nag. */
export function Home({ ledger, anySourceOn, checked, checking, onCheck, onOpenNotice, onOpenJourney }: Props) {
  const { t, locale } = useI18n();
  const pending = ledger.filter((e) => e.status === "pending");
  const confirmed = ledger.filter((e) => e.status === "confirmed");
  const label = (e: LedgerEntry) =>
    t(`notice.${e.event.type}` as Key, { date: e.event.estimatedDate ? formatDate(e.event.estimatedDate, locale) : "" });

  return (
    <section>
      {pending.length === 0 && <p className="empty">{checked || ledger.length > 0 ? t("home.empty") : t("home.neverChecked")}</p>}
      {pending.length > 0 && (
        <>
          <h2>{t("home.pending")}</h2>
          <ul className="list">
            {pending.map((e) => (
              <li key={e.event.id} className="row">
                <button type="button" className="row-button grow" onClick={() => onOpenNotice(e)}>
                  <div className="row-title">{label(e)}</div>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
      {confirmed.length > 0 && (
        <>
          <h2>{t("home.journeys")}</h2>
          <ul className="list">
            {confirmed.map((e) => (
              <li key={e.event.id} className="row">
                <button type="button" className="row-button grow" onClick={() => onOpenJourney(e)}>
                  <div className="row-title">{label(e)}</div>
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
      {!anySourceOn && <p className="muted">{t("home.noSources")}</p>}
    </section>
  );
}
