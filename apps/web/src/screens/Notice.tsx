import type { LedgerEntry, LedgerStatus, Snippet } from "@ahead/contract";
import { formatDate, type Key, useI18n } from "../i18n.tsx";

interface Props {
  entry: LedgerEntry;
  snippets: Snippet[];
  onRejectEvidence(snippetId: string): void;
  onAnswer(status: Exclude<LedgerStatus, "pending">): void;
}

/** A detected event as a question, with the evidence behind it. */
export function Notice({ entry, snippets, onRejectEvidence, onAnswer }: Props) {
  const { t, locale } = useI18n();
  const { event } = entry;
  const byId = new Map(snippets.map((s) => [s.id, s]));
  // The detector's score is an unbounded sum, not a probability, so the notice states its basis instead.
  const sources = new Set(event.evidence.map((e) => byId.get(e.snippetId)?.source ?? e.snippetId)).size;
  const date = event.estimatedDate ? formatDate(event.estimatedDate, locale) : "";

  return (
    <section>
      <h1>{t(`notice.${event.type}` as Key, { date })}</h1>
      <p className="muted">{t("notice.basis", { items: event.evidence.length, sources })}</p>
      <h2>{t("notice.why")}</h2>
      <ul className="list">
        {event.evidence.map((ev) => {
          const snippet = byId.get(ev.snippetId);
          const rejected = entry.rejectedEvidence.includes(ev.snippetId);
          return (
            <li key={ev.snippetId} className={`row ${rejected ? "struck" : ""}`}>
              <div className="grow">
                <div className="chip">{snippet ? t(`source.${snippet.source}` as Key) : ev.snippetId}</div>
                <div>{snippet?.text ?? ev.prototype}</div>
              </div>
              {rejected ? (
                <span className="muted">{t("notice.removed")}</span>
              ) : (
                <button type="button" onClick={() => onRejectEvidence(ev.snippetId)}>
                  {t("notice.notThis")}
                </button>
              )}
            </li>
          );
        })}
      </ul>
      <div className="actions">
        <button type="button" className="primary" onClick={() => onAnswer("confirmed")}>
          {t("notice.confirm")}
        </button>
        <button type="button" onClick={() => onAnswer("dismissed")}>
          {t("notice.later")}
        </button>
        <button type="button" className="quiet" onClick={() => onAnswer("never")}>
          {t("notice.never")}
        </button>
      </div>
    </section>
  );
}
