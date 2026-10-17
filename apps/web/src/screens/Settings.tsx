import { useEffect, useState } from "react";
import { useI18n } from "../i18n.tsx";

export type Theme = "light" | "dark" | "system";

function readTheme(): Theme {
  try {
    const saved = localStorage.getItem("ahead.theme");
    if (saved === "light" || saved === "dark") return saved;
  } catch {}
  return "system";
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(readTheme);
  useEffect(() => {
    const system = matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const resolved = theme === "system" ? (system.matches ? "dark" : "light") : theme;
      document.documentElement.dataset.theme = resolved;
      document.querySelector('meta[name="theme-color"]')?.setAttribute("content", resolved === "dark" ? "#102f36" : "#123e48");
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

export function Settings({ theme, onTheme, onBack }: { theme: Theme; onTheme(theme: Theme): void; onBack(): void }) {
  const { t, locale, setLocale } = useI18n();
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
      <p className="local-note">{t("settings.local")}</p>
    </section>
  );
}
