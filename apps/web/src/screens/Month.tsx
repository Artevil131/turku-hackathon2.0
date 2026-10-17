import type { Novelty, Snippet } from "@ahead/contract";
import { useEffect, useState } from "react";
import type { Analysis } from "../analysis.ts";
import { formatShort, type Key, useI18n } from "../i18n.tsx";
import { today } from "../today.ts";
import { MAGNITUDE_RADII } from "./Sky.tsx";

interface Props {
  analysis(): Promise<Analysis>;
  snippets: Snippet[];
  onBack(): void;
}

/** "This month": what is new, what recurs, what shifted, and the month's constellations. */
export function Month({ analysis, snippets, onBack }: Props) {
  const { t, locale } = useI18n();
  const now = today();
  const [novelty, setNovelty] = useState<Novelty | null>(null);
  const [example, setExample] = useState(false);
  useEffect(() => {
    let cancelled = false;
    void analysis()
      .then(async (a) => {
        const n = await a.novelty(now, snippets);
        if (cancelled) return;
        setNovelty(n);
        setExample(a.mocked.novelty);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [analysis, now, snippets]);

  const chips = (title: string, items: string[]) => (
    <div className="chip-group">
      <h2>{title}</h2>
      {items.length === 0 ? (
        <p className="muted">{t("month.none")}</p>
      ) : (
        <ul className="chips">
          {items.map((x) => (
            <li key={x} className="chip-outline">
              {x}
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  return (
    <section className="month-screen">
      <button type="button" className="back quiet" onClick={onBack}>
        {t("journey.back")}
      </button>
      <h1>{t("month.title")}</h1>
      {novelty && (
        <p className="screen-lead">{t("month.lead", { from: formatShort(novelty.from, locale), to: formatShort(novelty.to, locale) })}</p>
      )}
      {example && <p className="muted example-note">{t("month.example")}</p>}
      {novelty && (
        <>
          {chips(t("month.newSenders"), novelty.newSenders)}
          {chips(t("month.newMerchants"), novelty.newMerchants)}
          {chips(t("month.newPlaces"), novelty.newPlaces)}

          <h2>{t("month.recurring")}</h2>
          {novelty.recurring.length === 0 ? (
            <p className="muted">{t("month.none")}</p>
          ) : (
            <table className="timetable">
              <tbody>
                {novelty.recurring.map((r) => (
                  <tr key={`${r.source}-${r.name}`} className={r.anomaly ? "anomaly" : undefined}>
                    <th scope="row">{r.name}</th>
                    <td className="num">{t("month.every", { n: r.intervalDays })}</td>
                    <td className="num">{t("month.times", { n: r.occurrences })}</td>
                    <td className="num">
                      {r.anomaly ? (
                        <span className="amber">{t(`month.${r.anomaly}` as Key)}</span>
                      ) : (
                        t("month.last", { date: formatShort(r.lastDate, locale) })
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {novelty.changePoints.length > 0 && (
            <>
              <h2>{t("month.changes")}</h2>
              <ul className="list change-points">
                {novelty.changePoints.map((c) => {
                  const max = Math.max(c.beforePerWeek, c.afterPerWeek, 0.01);
                  return (
                    <li key={`${c.source}-${c.date}`} className="change-point">
                      <div className="contribution-head">
                        <span className="chip">{t(`source.${c.source}` as Key)}</span>
                        <span className="event-date">{t("month.from", { date: formatShort(c.date, locale) })}</span>
                      </div>
                      <div className="before-after">
                        <span className="muted">{t("month.before")}</span>
                        <div className="bar" aria-hidden="true">
                          <span className="bar-fill fog" style={{ width: `${(100 * c.beforePerWeek) / max}%` }} />
                        </div>
                        <span className="num">{t("month.perWeek", { n: c.beforePerWeek.toFixed(1) })}</span>
                        <span className="muted">{t("month.after")}</span>
                        <div className="bar" aria-hidden="true">
                          <span className="bar-fill" style={{ width: `${(100 * c.afterPerWeek) / max}%` }} />
                        </div>
                        <span className="num amber">{t("month.perWeek", { n: c.afterPerWeek.toFixed(1) })}</span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </>
          )}

          {novelty.clusters.length > 0 && (
            <>
              <h2>{t("month.clusters")}</h2>
              <ul className="list clusters">
                {[...novelty.clusters]
                  .sort((a, b) => b.novelty - a.novelty)
                  .map((c) => (
                    <li key={c.label} className="cluster row">
                      <svg className="novelty-dot" width="28" height="28" viewBox="0 0 28 28" aria-hidden="true">
                        <circle
                          cx="14"
                          cy="14"
                          r={MAGNITUDE_RADII[Math.min(4, Math.floor(c.novelty * 5))] ?? 2}
                          className={c.novelty >= 0.5 ? "bright" : "faint"}
                        />
                        {c.nearest && <circle cx="14" cy="14" r="11" className="ring" />}
                      </svg>
                      <div className="grow">
                        <span className="row-title serif">{c.label}</span>
                        <div className="muted">
                          {t("month.members", { n: c.snippetIds.length })}
                          {c.nearest && <> · {t(`event.${c.nearest}` as Key)}</>}
                        </div>
                      </div>
                      <span className="num muted">
                        {t("month.novelty")} {c.novelty.toFixed(2)}
                      </span>
                    </li>
                  ))}
              </ul>
            </>
          )}

          {novelty.newTopics.length > 0 && (
            <>
              <h2>{t("month.topics")}</h2>
              <ul className="list topics">
                {novelty.newTopics.map((s) => (
                  <li key={s.snippetId} className="row topic-row">
                    <span className="event-date">
                      <time dateTime={s.date}>{formatShort(s.date, locale)}</time>
                    </span>
                    <div className="grow">
                      <div className="chip">{t(`source.${s.source}` as Key)}</div>
                      <div className="evidence-text">{s.text}</div>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      )}
    </section>
  );
}
