import { icsToSnippets, parseIcs } from "@ahead/adapters";
import type { Journey as JourneyData, LedgerEntry, LedgerStatus, Snippet, SourceState } from "@ahead/contract";
import { createBuilders } from "@ahead/journeys";
import type { FmiWarning } from "@ahead/opendata";
import exampleWarnings from "@ahead/opendata/data/fmi-example-warnings.json" with { type: "json" };
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { checkNow } from "./detect.ts";
import { createEngine, type Engine, readSnippets, withCalendar } from "./engine.ts";
import { useI18n } from "./i18n.tsx";
import { useOutboundCount } from "./netcounter.ts";
import { Home } from "./screens/Home.tsx";
import { Journey } from "./screens/Journey.tsx";
import { Ledger } from "./screens/Ledger.tsx";
import { Notice } from "./screens/Notice.tsx";
import { Settings, useTheme } from "./screens/Settings.tsx";
import { Onboarding, SourceList } from "./screens/Sources.tsx";
import { type SharePayload, share } from "./share.ts";
import { type AppStore, createStore } from "./store.ts";
import { today } from "./today.ts";

type Tab = "home" | "ledger" | "sources";
type View = { kind: "notice"; eventId: string } | { kind: "journey"; eventId: string } | null;

function wasOnboarded(): boolean {
  try {
    return localStorage.getItem("ahead.onboarded") === "1";
  } catch {
    return false;
  }
}

export function App() {
  const { t, locale } = useI18n();
  const { theme, setTheme } = useTheme();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
  const store: AppStore = useMemo(() => createStore(), []);
  // `?fmi=example` swaps the live FMI cache for one labelled example warning, for the stage (WORK.md); every card says so.
  const builders = useMemo(() => {
    const example = new URLSearchParams(location.search).get("fmi") === "example";
    const warnings = example ? { warnings: exampleWarnings.warnings as FmiWarning[], warningsAreExample: true } : {};
    return createBuilders({ today: today(), ...warnings });
  }, []);
  const [sources, setSources] = useState<SourceState[]>([]);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [journey, setJourney] = useState<JourneyData | undefined>();
  const [ready, setReady] = useState(false);
  const [onboarded, setOnboarded] = useState(wasOnboarded);
  const [tab, setTab] = useState<Tab>("home");
  const [view, setView] = useState<View>(null);
  const [checking, setChecking] = useState(false);
  const [checked, setChecked] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const [calendarFile, setCalendarFile] = useState<number | null>(null);
  /** One engine for the whole session: its detector keeps the vector cache, so later checks are instant. */
  const engineRef = useRef<Promise<Engine> | undefined>(undefined);
  const getEngine = useCallback(() => {
    engineRef.current ??= createEngine((p) => {
      if (typeof p.progress === "number") setProgress(Math.round(p.progress));
    })
      .then(async (engine) => {
        // Vectors from an earlier session: no re-embedding of snippets already seen (ignored if the model changed).
        const saved = await store.vectors();
        if (saved && engine.vectors) engine.vectors.restore(saved);
        const calendar = await store.calendarEvents();
        return calendar ? withCalendar(engine, icsToSnippets(calendar)) : engine;
      })
      .catch((e) => {
        engineRef.current = undefined;
        throw e;
      });
    return engineRef.current;
  }, [store]);
  const outbound = useOutboundCount();

  const reload = useCallback(async () => {
    setSources(await store.sources());
    setLedger(await store.ledger());
    setCalendarFile((await store.calendarEvents())?.length ?? null);
  }, [store]);

  useEffect(() => {
    reload().then(() => setReady(true));
  }, [reload]);

  const onSource = async (s: SourceState) => {
    await store.setSource({ ...s, lastSync: s.enabled ? today() : undefined });
    await reload();
  };

  /** A calendar file chosen by the user: parsed here, minimised entries kept, the phone's calendar replaced. */
  const onCalendarFile = async (file: File | null) => {
    setError(null);
    const events = file ? parseIcs(await file.text()) : undefined;
    if (file && events?.length === 0) {
      setError(t("calendar.file.bad"));
      return;
    }
    await store.putCalendarEvents(events);
    if (events) await store.setSource({ source: "calendar", enabled: true, lastSync: today() });
    if (engineRef.current) {
      const snippetsFromFile = events ? icsToSnippets(events) : undefined;
      engineRef.current = engineRef.current.then((engine) => withCalendar(engine, snippetsFromFile));
    }
    setSnippets([]);
    await reload();
  };

  const onCheck = async () => {
    setChecking(true);
    setError(null);
    try {
      const enabled = sources.filter((s) => s.enabled).map((s) => s.source);
      const engine = await getEngine();
      const result = await checkNow({ engine, enabled, today: today(), ledger: await store.ledger() });
      if (engine.vectors) await store.putVectors(engine.vectors.snapshot());
      setSnippets(result.snippets);
      const known = new Set((await store.ledger()).map((e) => e.event.id));
      for (const event of result.events) {
        if (!known.has(event.id)) await store.upsertLedger({ event, status: "pending", rejectedEvidence: [], shared: false });
      }
      await reload();
      setChecked(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setChecking(false);
      setProgress(null);
    }
  };

  // A notice opened after a reload has no snippets yet: read them again through the adapters (nothing is stored).
  useEffect(() => {
    if (view?.kind !== "notice" || snippets.length > 0) return;
    const enabled = sources.filter((s) => s.enabled).map((s) => s.source);
    void getEngine()
      .then((engine) => readSnippets(engine, enabled, today()))
      .then(setSnippets)
      .catch(() => {});
  }, [view, snippets.length, sources, getEngine]);

  const find = (id: string) => ledger.find((e) => e.event.id === id);

  const answer = async (entry: LedgerEntry, status: Exclude<LedgerStatus, "pending">) => {
    await store.upsertLedger({ ...entry, status, answeredAt: today() });
    if (status === "confirmed") {
      await openJourney(entry.event.id);
    } else {
      setView(null);
    }
    await reload();
  };

  const rejectEvidence = async (entry: LedgerEntry, snippetId: string) => {
    await store.upsertLedger({ ...entry, rejectedEvidence: [...entry.rejectedEvidence, snippetId] });
    await reload();
  };

  /** Built from @ahead/journeys in the current language; the done flags come from the store, keyed by item id. */
  const buildJourney = useCallback(
    async (eventId: string) => {
      const entry = (await store.ledger()).find((e) => e.event.id === eventId);
      const built = entry && (await builders[entry.event.type]?.build({ event: entry.event, municipality: entry.event.place, locale }));
      if (!built) return undefined;
      const done = new Set(((await store.journey(eventId))?.items ?? []).filter((i) => i.done).map((i) => i.id));
      return { ...built, items: built.items.map((i) => (done.has(i.id) ? { ...i, done: true } : i)) };
    },
    [store, builders, locale],
  );

  const openJourney = async (eventId: string) => {
    setJourney(await buildJourney(eventId));
    setView({ kind: "journey", eventId });
  };

  useEffect(() => {
    if (view?.kind === "journey") void buildJourney(view.eventId).then(setJourney);
  }, [view, buildJourney]);

  const toggleDone = async (itemId: string) => {
    if (!journey) return;
    const next = { ...journey, items: journey.items.map((i) => (i.id === itemId ? { ...i, done: !i.done } : i)) };
    await store.putJourney(next);
    setJourney(next);
  };

  /** The one message that can leave the phone: three fields, after the user pressed Share (apps/api). */
  const shareEvent = async (entry: LedgerEntry, payload: SharePayload) => {
    const result = await share(payload);
    await store.upsertLedger({ ...entry, shared: true });
    await reload();
    return result;
  };

  const eraseAll = async () => {
    await store.eraseAll();
    // The stored snapshot is gone with the rest; the detector's in-memory copy goes too.
    (await engineRef.current?.catch(() => undefined))?.vectors?.clear();
    try {
      localStorage.removeItem("ahead.onboarded");
    } catch {}
    setOnboarded(false);
    setChecked(false);
    setView(null);
    setTab("home");
    await reload();
  };

  const finishOnboarding = () => {
    try {
      localStorage.setItem("ahead.onboarded", "1");
    } catch {}
    setOnboarded(true);
  };

  const openFromLedger = (entry: LedgerEntry) => {
    if (entry.status === "confirmed") void openJourney(entry.event.id);
    else setView({ kind: "notice", eventId: entry.event.id });
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: destination changes intentionally reset scroll and focus.
  useEffect(() => {
    // Every destination begins at its task heading, including when leaving a long journey.
    mainRef.current?.scrollTo({ top: 0 });
    mainRef.current?.focus({ preventScroll: true });
  }, [view, tab, onboarded, settingsOpen]);

  if (!ready) return null;

  const current = view?.kind === "notice" ? find(view.eventId) : undefined;
  // Each destination remounts once, so screen-local state (an open sheet, a share in flight) does not outlive its screen.
  const screenKey = settingsOpen ? "settings" : !onboarded ? "onboarding" : view ? `${view.kind}:${view.eventId}` : tab;

  let body: React.ReactNode;
  if (settingsOpen) {
    body = <Settings theme={theme} onTheme={setTheme} onBack={() => setSettingsOpen(false)} />;
  } else if (!onboarded) {
    body = (
      <Onboarding
        sources={sources}
        onChange={onSource}
        onDone={finishOnboarding}
        calendarFile={calendarFile}
        onCalendarFile={onCalendarFile}
      />
    );
  } else if (view?.kind === "notice" && current) {
    body = (
      <Notice
        entry={current}
        snippets={snippets}
        onRejectEvidence={(id) => rejectEvidence(current, id)}
        onAnswer={(status) => answer(current, status)}
        onBack={() => setView(null)}
      />
    );
  } else if (view?.kind === "journey") {
    const entry = find(view.eventId);
    body = (
      <Journey
        journey={journey}
        entry={entry}
        onBack={() => setView(null)}
        onToggleDone={toggleDone}
        onShare={(payload) => {
          if (!entry) throw new Error("no event");
          return shareEvent(entry, payload);
        }}
      />
    );
  } else if (tab === "ledger") {
    body = <Ledger ledger={ledger} onOpen={openFromLedger} onEraseAll={eraseAll} />;
  } else if (tab === "sources") {
    body = (
      <section>
        <h1>{t("sources.title")}</h1>
        <SourceList sources={sources} onChange={onSource} calendarFile={calendarFile} onCalendarFile={onCalendarFile} />
        {error && (
          <p className="muted" role="alert">
            {error}
          </p>
        )}
      </section>
    );
  } else {
    body = (
      <Home
        ledger={ledger}
        anySourceOn={sources.some((s) => s.enabled)}
        checked={checked}
        checking={checking}
        progress={progress}
        error={error}
        onCheck={onCheck}
        onOpenNotice={(e) => setView({ kind: "notice", eventId: e.event.id })}
        onOpenJourney={(e) => openJourney(e.event.id)}
      />
    );
  }

  return (
    <div className="app">
      <header className="top">
        <strong className="wordmark">
          {t("appName")}
          <span aria-hidden="true" className="brand-mark" />
        </strong>
        <button type="button" className="settings-toggle" aria-expanded={settingsOpen} onClick={() => setSettingsOpen(!settingsOpen)}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
            <path d="M4 7h16M4 17h16" />
            <circle cx="9" cy="7" r="3" fill="var(--shell)" />
            <circle cx="15" cy="17" r="3" fill="var(--shell)" />
          </svg>
          {t("settings.title")}
        </button>
      </header>
      <main ref={mainRef} tabIndex={-1}>
        <div key={screenKey} className="screen">
          {body}
        </div>
      </main>
      <footer className="bottom">
        <div className={`net ${outbound > 0 ? "net-live" : ""}`} aria-live="polite">
          <span>{t("net.label")}</span>
          <strong key={outbound} className="net-count">
            {outbound === 1 ? t("net.one") : t("net.requests", { n: outbound })}
          </strong>
        </div>
        {onboarded && (
          <nav>
            {(["home", "ledger", "sources"] as const).map((k) => (
              <button
                key={k}
                type="button"
                className={tab === k && !view && !settingsOpen ? "active" : ""}
                aria-current={tab === k && !view && !settingsOpen ? "page" : undefined}
                onClick={() => {
                  setSettingsOpen(false);
                  setTab(k);
                  setView(null);
                }}
              >
                {t(`nav.${k}`)}
              </button>
            ))}
          </nav>
        )}
      </footer>
    </div>
  );
}
