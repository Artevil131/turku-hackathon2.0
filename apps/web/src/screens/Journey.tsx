import type { Journey as JourneyData, LedgerEntry } from "@ahead/contract";
import { useEffect, useRef, useState } from "react";
import { formatDate, type Key, useI18n } from "../i18n.tsx";
import { payloadFor, type SharePayload, type ShareResult } from "../share.ts";

interface Props {
  journey: JourneyData | undefined;
  entry: LedgerEntry | undefined;
  onBack(): void;
  onToggleDone(itemId: string): void;
  onShare(payload: SharePayload): Promise<ShareResult>;
}

type ShareState =
  | { kind: "closed" }
  | { kind: "asking" }
  | { kind: "sending" }
  | { kind: "sent"; result: ShareResult }
  | { kind: "failed"; reason: string };

/** Journey items as cards by kind, each with its due date and source link. */
export function Journey({ journey, entry, onBack, onToggleDone, onShare }: Props) {
  const { t, locale } = useI18n();
  const [shareState, setShareState] = useState<ShareState>({ kind: "closed" });
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (shareState.kind === "closed") dialogRef.current?.close();
    else if (!dialogRef.current?.open) dialogRef.current?.showModal();
  }, [shareState.kind]);
  const payload = entry ? payloadFor(entry.event) : undefined;
  const rows = (p: SharePayload) => [
    [t("share.type"), t(`event.${p.type}` as Key)],
    [t("share.date"), p.date ? formatDate(p.date, locale) : t("share.unknown")],
    [t("share.place"), p.municipality ?? t("share.unknown")],
  ];
  const send = async () => {
    if (!payload) return;
    setShareState({ kind: "sending" });
    try {
      setShareState({ kind: "sent", result: await onShare(payload) });
    } catch (e) {
      setShareState({ kind: "failed", reason: e instanceof Error ? e.message : String(e) });
    }
  };
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
          {payload && (
            <div className="share-card">
              <p>{t("journey.share")}</p>
              {entry?.shared ? (
                <p className="shared-line">
                  {t("ledger.sharedWhat", {
                    what: rows(payload)
                      .map((r) => r[1])
                      .join(", "),
                  })}
                </p>
              ) : (
                <button type="button" className="share-button" onClick={() => setShareState({ kind: "asking" })}>
                  {t("journey.shareButton")}
                </button>
              )}
            </div>
          )}
          {payload && shareState.kind !== "closed" && (
            <dialog
              ref={dialogRef}
              className="sheet share-sheet"
              aria-labelledby="share-title"
              onCancel={() => setShareState({ kind: "closed" })}
            >
              <h2 id="share-title">{shareState.kind === "sent" ? t("share.sent") : t("share.title")}</h2>
              {shareState.kind !== "sent" && <p className="muted">{t("share.lead")}</p>}
              <dl className={`payload ${shareState.kind === "sending" ? "leaving" : ""} ${shareState.kind === "sent" ? "arrived" : ""}`}>
                {rows(shareState.kind === "sent" ? shareState.result.received : payload).map(([k, v], i) => (
                  <div key={k} className="payload-row" style={{ "--i": i } as React.CSSProperties}>
                    <dt>{k}</dt>
                    <dd>{v}</dd>
                  </div>
                ))}
              </dl>
              {shareState.kind === "asking" && <p className="muted">{t("share.only")}</p>}
              {shareState.kind === "failed" && <p className="error">{t("share.failed", { reason: shareState.reason })}</p>}
              <div className="actions">
                {shareState.kind === "sent" ? (
                  <button type="button" className="primary" onClick={() => setShareState({ kind: "closed" })}>
                    {t("share.close")}
                  </button>
                ) : (
                  <>
                    <button type="button" className="primary" disabled={shareState.kind === "sending"} onClick={send}>
                      {shareState.kind === "sending" ? t("share.sending") : t("share.confirm")}
                    </button>
                    <button type="button" onClick={() => setShareState({ kind: "closed" })}>
                      {t("share.cancel")}
                    </button>
                  </>
                )}
              </div>
            </dialog>
          )}
        </>
      )}
    </section>
  );
}
