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
    <section className="journey-screen">
      <button type="button" className="back quiet" onClick={onBack}>
        {t("journey.back")}
      </button>
      {!journey ? (
        <p className="muted">{t("journey.none")}</p>
      ) : (
        <>
          <h1>{journey.title}</h1>
          <p className="muted">{t("journey.private")}</p>
          <ul className="cards">
            {journey.items.map((item) => (
              <li key={item.id} className={`card kind-${item.kind} ${item.done ? "done" : ""}`}>
                <div className="card-head">
                  <span className="chip">{t(`kind.${item.kind}` as Key)}</span>
                  {item.due && <span className="muted">{t("journey.due", { date: formatDate(item.due, locale) })}</span>}
                </div>
                <h3>{item.title}</h3>
                <p>{item.body.split(/(?<=[.!?])\s/)[0]}</p>
                {item.body.split(/(?<=[.!?])\s/).length > 1 && (
                  <details>
                    <summary>{t("journey.more")}</summary>
                    <p>
                      {item.body
                        .split(/(?<=[.!?])\s/)
                        .slice(1)
                        .join(" ")}
                    </p>
                  </details>
                )}
                <div className="card-foot">
                  {item.sourceName &&
                    (item.sourceUrl ? (
                      // A service link opens the service that does the task (WORK.md); other links show where a fact comes from.
                      <a href={item.sourceUrl} target="_blank" rel="noreferrer" className={item.sourceIsService ? "service" : undefined}>
                        {item.sourceIsService ? (
                          <>
                            {t("journey.open")}: {item.sourceName}
                            <svg className="open-icon" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
                              <path
                                d="M5 3h8v8M13 3 3 13"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          </>
                        ) : (
                          `${t("journey.source")}: ${item.sourceName}`
                        )}
                      </a>
                    ) : (
                      <span className="muted">
                        {t("journey.source")}: {item.sourceName}
                      </span>
                    ))}
                  {item.kind === "todo" && (
                    <label className="check">
                      <input
                        type="checkbox"
                        aria-label={`${t("journey.done")}: ${item.title}`}
                        checked={!!item.done}
                        onChange={() => onToggleDone(item.id)}
                      />
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
