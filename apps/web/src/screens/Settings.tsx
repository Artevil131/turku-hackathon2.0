import { useEffect, useState } from "react";
import { useI18n } from "../i18n.tsx";
import { readListingServer, saveListingServer } from "../listing.ts";

export type Theme = "light" | "dark" | "system";

function readTheme(): Theme {
  try {
    const saved = localStorage.getItem("ahead.theme");
    if (saved === "light" || saved === "dark" || saved === "system") return saved;
  } catch {}
  // The night chart is the default scene; "system" is a choice, not the starting point (PRODUCT.md: projector first).
  return "dark";
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(readTheme);
  useEffect(() => {
    const system = matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const resolved = theme === "system" ? (system.matches ? "dark" : "light") : theme;
      document.documentElement.dataset.theme = resolved;
      document.querySelector('meta[name="theme-color"]')?.setAttribute("content", resolved === "dark" ? "#16233d" : "#f2f2e9");
    };
    apply();
    system.addEventListener("change", apply);
    try {
      localStorage.setItem("ahead.theme", theme);
    } catch {}
    return () => system.removeEventListener("change", apply);
  }, [theme]);
  return { theme, setTheme };
}

export function Settings({
  theme,
  onTheme,
  onBack,
  onMonth,
}: {
  theme: Theme;
  onTheme(theme: Theme): void;
  onBack(): void;
  /** "This month", reachable from here as well as from Home; absent before onboarding. */
  onMonth?(): void;
}) {
  const { t, locale, setLocale } = useI18n();
  const [server, setServer] = useState(readListingServer);
  const updateServer = (next: typeof server) => {
    setServer(next);
    saveListingServer(next);
  };
  return (
    <section className="settings-screen">
      <button type="button" className="back quiet" onClick={onBack}>
        {t("journey.back")}
      </button>
      <h1>{t("settings.title")}</h1>
      <p className="screen-lead">{t("settings.lead")}</p>
      <fieldset className="preference">
        <legend>{t("settings.language")}</legend>
        <div className="segmented language-options">
          {(["en", "fi"] as const).map((value) => (
            <label key={value}>
              <input type="radio" name="language" value={value} checked={locale === value} onChange={() => setLocale(value)} />
              <span lang={value}>{value === "en" ? "English" : "Suomi"}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset className="preference">
        <legend>{t("settings.theme")}</legend>
        <div className="segmented">
          {(["light", "dark", "system"] as const).map((value) => (
            <label key={value}>
              <input type="radio" name="theme" value={value} checked={theme === value} onChange={() => onTheme(value)} />
              <span>{t(`settings.${value}`)}</span>
            </label>
          ))}
        </div>
        <p className="muted">{t("settings.systemHint")}</p>
      </fieldset>
      <fieldset className="preference">
        <legend>{t("settings.server")}</legend>
        <label className="field">
          <span>{t("settings.serverUrl")}</span>
          <input
            type="url"
            inputMode="url"
            autoComplete="off"
            spellCheck={false}
            value={server.url}
            onChange={(e) => updateServer({ ...server, url: e.target.value })}
          />
        </label>
        <label className="field">
          <span>{t("settings.serverToken")}</span>
          <input
            type="password"
            autoComplete="off"
            spellCheck={false}
            value={server.token}
            onChange={(e) => updateServer({ ...server, token: e.target.value })}
          />
        </label>
        <p className="muted">{t("settings.serverHint")}</p>
      </fieldset>
      {onMonth && (
        <ul className="list plate-links">
          <li>
            <button type="button" className="plate-link" onClick={onMonth}>
              <span className="row-title serif">{t("home.month")}</span>
              <svg
                className="event-arrow"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                aria-hidden="true"
              >
                <path d="M5 12h14m-6-6 6 6-6 6" />
              </svg>
            </button>
          </li>
        </ul>
      )}
      <p className="local-note">{t("settings.local")}</p>
    </section>
  );
}
