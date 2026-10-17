import { icsToSnippets, parseIcs } from "@ahead/adapters";
import type { Journey as JourneyData, LedgerEntry, LedgerStatus, Snippet, SourceState } from "@ahead/contract";
import { createBuilders } from "@ahead/journeys";
import type { FmiWarning } from "@ahead/opendata";
import exampleWarnings from "@ahead/opendata/data/fmi-example-warnings.json" with { type: "json" };
import cachedWarnings from "@ahead/opendata/data/fmi-warnings.json" with { type: "json" };
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { type Analysis, createAnalysis, type SkyDot } from "./analysis.ts";
import { checkNow } from "./detect.ts";
import { createEngine, type Engine, readSnippets, withCalendar } from "./engine.ts";
import { useI18n } from "./i18n.tsx";
import { useOutboundCount } from "./netcounter.ts";
import { Home } from "./screens/Home.tsx";
import { Horizon } from "./screens/Horizon.tsx";
import { Journey } from "./screens/Journey.tsx";
import { Ledger } from "./screens/Ledger.tsx";
import { Month } from "./screens/Month.tsx";
import { Notice } from "./screens/Notice.tsx";
import { Settings, useTheme } from "./screens/Settings.tsx";
import { Onboarding, SourceList } from "./screens/Sources.tsx";
import { type SharePayload, share } from "./share.ts";
import { type AppStore, createStore } from "./store.ts";
import { today } from "./today.ts";

type Tab = "home" | "ledger" | "sources" | "sky";
type View = { kind: "notice"; eventId: string } | { kind: "journey"; eventId: string } | { kind: "month" } | null;

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
  /** The warnings the horizon reads: the same choice as the journeys (the example set on stage, the cache otherwise). */
  const fmiWarnings = useMemo(() => {
    const example = new URLSearchParams(location.search).get("fmi") === "example";
    return (example ? exampleWarnings.warnings : cachedWarnings.warnings) as FmiWarning[];
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
  /** The sky: every snippet in the window with its margin, and a counter that replays the reveal after each check. */
  const [sky, setSky] = useState<SkyDot[]>([]);
  const [revealKey, setRevealKey] = useState(0);
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
  /** One analysis over the session's engine: the plates, the numbers and the two extra views read through it. */
  const analysisRef = useRef<Promise<Analysis> | undefined>(undefined);
  const getAnalysis = useCallback(() => {
    analysisRef.current ??= getEngine().then((engine) => createAnalysis(engine, { warnings: fmiWarnings }));
    return analysisRef.current;
  }, [getEngine, fmiWarnings]);
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
    // The next destination must read the current permissions, including when the last source is revoked.
    setSnippets([]);
    setSky([]);
    analysisRef.current = undefined;
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
    analysisRef.current = undefined;
    setSnippets([]);
    setSky([]);
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
      // The sky plate: every snippet scored (the vectors are cached now, so this is instant), then the reveal.
      const all = (await store.ledger()).map((e) => e.event);
      setSky(await (await getAnalysis()).sky(result.snippets, all, { score: true }));
      await reload();
      setChecked(true);
      setRevealKey((k) => k + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setChecking(false);
      setProgress(null);
    }
  };

  // After a reload there are no snippets yet: read them again through the adapters (nothing is stored), so the sky
  // and a notice have their signals. Without a check this session the dots keep their evidence margins only; the
  // model is never loaded for the plate alone.
  const anyOn = sources.some((s) => s.enabled);
  useEffect(() => {
    if (!onboarded || !anyOn || snippets.length > 0) return;
    const enabled = sources.filter((s) => s.enabled).map((s) => s.source);
    let cancelled = false;
    void getEngine()
      .then(async (engine) => {
        const read = await readSnippets(engine, enabled, today());
        const dots = await (await getAnalysis()).sky(
          read,
          ledger.map((e) => e.event),
          { score: false },
        );
        if (cancelled) return;
        // A check that finished first has scored the sky already; this read never overwrites it.
        setSnippets((cur) => (cur.length > 0 ? cur : read));
        setSky((cur) => (cur.length > 0 ? cur : dots));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [onboarded, anyOn, snippets.length, sources, ledger, getEngine, getAnalysis]);

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
    analysisRef.current = undefined;
    try {
      localStorage.removeItem("ahead.onboarded");
    } catch {}
    setOnboarded(false);
    setChecked(false);
    setSnippets([]);
    setSky([]);
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
  const screenKey = settingsOpen
    ? "settings"
    : !onboarded
      ? "onboarding"
      : view
        ? view.kind === "month"
          ? "month"
          : `${view.kind}:${view.eventId}`
        : tab;

  let body: React.ReactNode;
  if (settingsOpen) {
    body = (
      <Settings
        theme={theme}
        onTheme={setTheme}
        onBack={() => setSettingsOpen(false)}
        onMonth={
          onboarded
            ? () => {
                setSettingsOpen(false);
                setView({ kind: "month" });
              }
            : undefined
        }
      />
    );
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
        sky={sky}
        analysis={getAnalysis}
        onRejectEvidence={(id) => rejectEvidence(current, id)}
        onAnswer={(status) => answer(current, status)}
        onBack={() => setView(null)}
      />
    );
  } else if (view?.kind === "month") {
    body = <Month analysis={getAnalysis} snippets={snippets} onBack={() => setView(null)} />;
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
  } else if (tab === "sky") {
    body = <Horizon ledger={ledger} snippets={snippets} analysis={getAnalysis} onOpen={openFromLedger} />;
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
        sky={sky}
        sources={sources}
        revealKey={revealKey}
        anySourceOn={anyOn}
        checked={checked}
        checking={checking}
        progress={progress}
        error={error}
        onCheck={onCheck}
        onOpenNotice={(e) => setView({ kind: "notice", eventId: e.event.id })}
        onOpenJourney={(e) => openJourney(e.event.id)}
        onHorizon={() => {
          setTab("sky");
          setView(null);
        }}
        onMonth={() => setView({ kind: "month" })}
      />
    );
  }

  return (
    <div className="app">
      <header className="top">
        <strong className="wordmark">
          <svg className="brand-mark" width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
            <circle cx="9" cy="9" r="2.4" fill="var(--amber)" />
            <circle cx="9" cy="9" r="7.5" fill="none" stroke="var(--amber)" strokeWidth="1" />
          </svg>
          {t("appName")}
        </strong>
        <button type="button" className="settings-toggle" aria-expanded={settingsOpen} onClick={() => setSettingsOpen(!settingsOpen)}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
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
            {(["home", "sky", "ledger", "sources"] as const).map((k) => (
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
