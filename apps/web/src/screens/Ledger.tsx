import type { LedgerEntry } from "@ahead/contract";
import { formatDate, type Key, useI18n } from "../i18n.tsx";

interface Props {
  ledger: LedgerEntry[];
  onOpen(entry: LedgerEntry): void;
  onEraseAll(): void;
}

/** Every event ever inferred, its status, what was shared (by default nothing), and one-tap erase. */
export function Ledger({ ledger, onOpen, onEraseAll }: Props) {
  const { t, locale } = useI18n();
  return (
    <section>
      <h1>{t("ledger.title")}</h1>
      <p className="muted">{t("ledger.lead")}</p>
      {ledger.length === 0 ? (
        <p className="muted">{t("ledger.empty")}</p>
      ) : (
        <ul className="list">
          {ledger.map((e) => (
            <li key={e.event.id} className="row">
              <button type="button" className="row-button grow" onClick={() => onOpen(e)}>
                <div className="row-title">
                  {t(`notice.${e.event.type}` as Key, { date: e.event.estimatedDate ? formatDate(e.event.estimatedDate, locale) : "" })}
                </div>
                <div className="muted">
                  {t(`status.${e.status}` as Key)} · {t("ledger.shared", { answer: t(e.shared ? "ledger.yes" : "ledger.no") })}
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="actions">
        <button
          type="button"
          className="danger"
          onClick={() => {
            if (window.confirm(t("ledger.eraseConfirm"))) onEraseAll();
          }}
        >
          {t("ledger.erase")}
        </button>
      </div>
    </section>
  );
}
