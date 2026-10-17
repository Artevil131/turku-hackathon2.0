import type { Source, SourceState } from "@ahead/contract";
import { useState } from "react";
import { type Key, useI18n } from "../i18n.tsx";

const NEEDS_CONSENT_SHEET: readonly Source[] = ["mail", "bank"];

interface Props {
  sources: SourceState[];
  onChange(state: SourceState): void;
}

/** One toggle per source, all off by default. Mail and bank open a mocked consent sheet (D-010). */
export function SourceList({ sources, onChange }: Props) {
  const { t } = useI18n();
  const [sheet, setSheet] = useState<Source | null>(null);

  const toggle = (s: SourceState) => {
    if (!s.enabled && NEEDS_CONSENT_SHEET.includes(s.source)) setSheet(s.source);
    else onChange({ ...s, enabled: !s.enabled });
  };

  return (
    <>
      <ul className="list">
        {sources.map((s) => (
          <li key={s.source} className="row">
            <div className="grow">
              <div className="row-title">{t(`source.${s.source}` as Key)}</div>
              <div className="muted">{t(`source.${s.source}.what` as Key)}</div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={s.enabled}
              aria-label={t(`source.${s.source}` as Key)}
              className={`switch ${s.enabled ? "on" : ""}`}
              onClick={() => toggle(s)}
            />
          </li>
        ))}
        {/* Never a source (AGENTS.md: no health signals, ever). Shown off and locked so the rule is visible. */}
        <li className="row locked">
          <div className="grow">
            <div className="row-title">{t("source.health")}</div>
            <div className="muted">{t("source.health.what")}</div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={false}
            aria-disabled="true"
            aria-label={t("source.health")}
            className="switch"
            disabled
          />
        </li>
      </ul>
      {sheet && (
        <div className="scrim">
          <div className="sheet" role="dialog" aria-modal="true">
            <h2>{t(sheet === "mail" ? "consent.mail.title" : "consent.bank.title")}</h2>
            <p className="muted">{t("consent.body")}</p>
            <div className="actions">
              <button
                type="button"
                className="primary"
                onClick={() => {
                  onChange({ source: sheet, enabled: true });
                  setSheet(null);
                }}
              >
                {t("consent.allow")}
              </button>
              <button type="button" onClick={() => setSheet(null)}>
                {t("consent.cancel")}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function Onboarding({ sources, onChange, onDone }: Props & { onDone(): void }) {
  const { t } = useI18n();
  return (
    <section>
      <h1>{t("onboarding.title")}</h1>
      <p className="muted">{t("onboarding.lead")}</p>
      <SourceList sources={sources} onChange={onChange} />
      <div className="actions">
        <button type="button" className="primary" onClick={onDone}>
          {t("onboarding.continue")}
        </button>
      </div>
    </section>
  );
}
