import type { LedgerEntry } from "@ahead/contract";
import { describe } from "@ahead/detect/describe";
import { formatDate, type Key, useI18n } from "../i18n.tsx";
import { payloadFor } from "../share.ts";
import { today } from "../today.ts";

interface Props {
  ledger: LedgerEntry[];
  onOpen(entry: LedgerEntry): void;
  onEraseAll(): void;
}

/** Every event ever inferred, its status, what was shared (by default nothing), and one-tap erase. */
export function Ledger({ ledger, onOpen, onEraseAll }: Props) {
  const { t, locale } = useI18n();
  // Soonest first, undated last: the same order as Home.
  const entries = [...ledger].sort((a, b) => (a.event.estimatedDate ?? "9999").localeCompare(b.event.estimatedDate ?? "9999"));
  return (
    <section className="ledger-screen">
      <h1>{t("ledger.title")}</h1>
      <p className="screen-lead">{t("ledger.lead")}</p>
      {entries.length === 0 ? (
        <p className="empty">{t("ledger.empty")}</p>
      ) : (
        <ul className="list">
          {entries.map((e) => (
            <li key={e.event.id} className="row">
              <button type="button" className="row-button grow" onClick={() => onOpen(e)}>
                <div className="row-title">{describe(e.event, locale, today()).title}</div>
                <div className="muted">
                  {t(`status.${e.status}` as Key)} ·{" "}
                  {e.shared
                    ? t("ledger.sharedWhat", {
                        what: [
                          t(`event.${e.event.type}` as Key),
                          payloadFor(e.event).date ? formatDate(payloadFor(e.event).date as string, locale) : t("share.unknown"),
                          payloadFor(e.event).municipality ?? t("share.unknown"),
                        ].join(", "),
                      })
                    : t("ledger.shared", { answer: t("ledger.no") })}
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
