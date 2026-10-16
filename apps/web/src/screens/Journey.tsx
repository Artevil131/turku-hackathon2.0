import type { Journey as JourneyData } from "@ahead/contract";
import { formatDate, type Key, useI18n } from "../i18n.tsx";

interface Props {
  journey: JourneyData | undefined;
  onBack(): void;
  onToggleDone(itemId: string): void;
}

/** Journey items as cards by kind, each with its due date and source link. */
export function Journey({ journey, onBack, onToggleDone }: Props) {
  const { t, locale } = useI18n();
  return (
    <section>
      <button type="button" className="quiet" onClick={onBack}>
        ← {t("journey.back")}
      </button>
      {!journey ? (
        <p className="muted">{t("journey.none")}</p>
      ) : (
        <>
          <h1>{journey.title}</h1>
          <p className="muted">{t("journey.share")}</p>
          <ul className="cards">
            {journey.items.map((item) => (
              <li key={item.id} className={`card kind-${item.kind} ${item.done ? "done" : ""}`}>
                <div className="card-head">
                  <span className="chip">{t(`kind.${item.kind}` as Key)}</span>
                  {item.due && <span className="muted">{t("journey.due", { date: formatDate(item.due, locale) })}</span>}
                </div>
                <h3>{item.title}</h3>
                <p>{item.body}</p>
                <div className="card-foot">
                  {item.sourceName &&
                    (item.sourceUrl ? (
                      <a href={item.sourceUrl} target="_blank" rel="noreferrer">
                        {t("journey.source")}: {item.sourceName}
                      </a>
                    ) : (
                      <span className="muted">
                        {t("journey.source")}: {item.sourceName}
                      </span>
                    ))}
                  {item.kind === "todo" && (
                    <label className="check">
                      <input type="checkbox" checked={!!item.done} onChange={() => onToggleDone(item.id)} />
                    </label>
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
