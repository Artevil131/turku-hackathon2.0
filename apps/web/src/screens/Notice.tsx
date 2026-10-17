import type { LedgerEntry, LedgerStatus, Snippet } from "@ahead/contract";
import { describe } from "@ahead/detect/describe";
import { type Key, useI18n } from "../i18n.tsx";
import { today } from "../today.ts";

interface Props {
  entry: LedgerEntry;
  snippets: Snippet[];
  onRejectEvidence(snippetId: string): void;
  onAnswer(status: Exclude<LedgerStatus, "pending">): void;
}

/** A detected event as a question, with the evidence behind it. The wording is A's templates (`describe`). */
export function Notice({ entry, snippets, onRejectEvidence, onAnswer }: Props) {
  const { t, locale } = useI18n();
  const { event } = entry;
  const text = describe(event, locale, today());
  const byId = new Map(snippets.map((s) => [s.id, s]));
  // The detector's score is an unbounded sum, not a probability, so the notice states its basis instead.
  const sources = new Set(event.evidence.map((e) => byId.get(e.snippetId)?.source ?? e.snippetId)).size;

  return (
    <section className="notice-screen">
      <h1>{text.title}</h1>
      <p className="muted">{t("notice.basis", { items: event.evidence.length, sources })}</p>
      <p className="muted">{t("notice.window")}</p>
      <h2>{text.why}</h2>
      <ul className="list evidence-list">
        {event.evidence.map((ev) => {
          const snippet = byId.get(ev.snippetId);
          const rejected = entry.rejectedEvidence.includes(ev.snippetId);
          return (
            <li key={ev.snippetId} className={`row evidence-row ${rejected ? "struck" : ""}`}>
              <div className="grow">
                <div className="chip">{snippet ? t(`source.${snippet.source}` as Key) : ev.snippetId}</div>
                <div>{snippet?.text ?? ev.prototype}</div>
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
      <p>{text.question}</p>
      <div className="actions answer-actions">
        <button type="button" className="primary" onClick={() => onAnswer("confirmed")}>
          {text.answers.confirm}
        </button>
        <button type="button" onClick={() => onAnswer("dismissed")}>
          {text.answers.notNow}
        </button>
        <button type="button" className="quiet" onClick={() => onAnswer("never")}>
          {text.answers.never}
        </button>
      </div>
    </section>
  );
}
