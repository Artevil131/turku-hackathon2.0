import type { Journey as JourneyData, LedgerEntry, LedgerStatus, Snippet, SourceState, Store } from "@ahead/contract";
import { createBuilders } from "@ahead/journeys";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { checkNow } from "./detect.ts";
import { createEngine, type Engine, readSnippets } from "./engine.ts";
import { useI18n } from "./i18n.tsx";
import { useOutboundCount } from "./netcounter.ts";
import { Home } from "./screens/Home.tsx";
import { Journey } from "./screens/Journey.tsx";
import { Ledger } from "./screens/Ledger.tsx";
import { Notice } from "./screens/Notice.tsx";
import { Onboarding, SourceList } from "./screens/Sources.tsx";
import { createStore } from "./store.ts";

type Tab = "home" | "ledger" | "sources";
type View = { kind: "notice"; eventId: string } | { kind: "journey"; eventId: string } | null;

/** The real date, unless the URL says `?today=YYYY-MM-DD`: the demo phone is dated, so the demo can pin the day. */
const today = () => {
  const pinned = new URLSearchParams(location.search).get("today");
  return pinned && /^d{4}-d{2}-d{2}$/.test(pinned) ? pinned : new Date().toISOString().slice(0, 10);
};

function wasOnboarded(): boolean {
  try {
    return localStorage.getItem("ahead.onboarded") === "1";
  } catch {
    return false;
  }
}

export function App() {
  const { t, locale, setLocale } = useI18n();
  const store: Store = useMemo(() => createStore(), []);
  const builders = useMemo(() => createBuilders({ today: today() }), []);
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
  /** One engine for the whole session: its detector keeps the vector cache, so later checks are instant. */
  const engineRef = useRef<Promise<Engine> | undefined>(undefined);
  const getEngine = useCallback(() => {
    engineRef.current ??= createEngine((p) => {
      if (typeof p.progress === "number") setProgress(Math.round(p.progress));
    }).catch((e) => {
      engineRef.current = undefined;
      throw e;
    });
    return engineRef.current;
  }, []);
  const outbound = useOutboundCount();

  const reload = useCallback(async () => {
    setSources(await store.sources());
    setLedger(await store.ledger());
  }, [store]);

  useEffect(() => {
    reload().then(() => setReady(true));
  }, [reload]);

  const onSource = async (s: SourceState) => {
    await store.setSource({ ...s, lastSync: s.enabled ? today() : undefined });
    await reload();
  };

  const onCheck = async () => {
    setChecking(true);
    setError(null);
    try {
      const enabled = sources.filter((s) => s.enabled).map((s) => s.source);
      const result = await checkNow({ engine: await getEngine(), enabled, today: today(), ledger: await store.ledger() });
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

  const eraseAll = async () => {
    await store.eraseAll();
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

  if (!ready) return null;

  const current = view?.kind === "notice" ? find(view.eventId) : undefined;

  let body: React.ReactNode;
  if (!onboarded) {
    body = <Onboarding sources={sources} onChange={onSource} onDone={finishOnboarding} />;
  } else if (view?.kind === "notice" && current) {
    body = (
      <Notice
        entry={current}
        snippets={snippets}
        onRejectEvidence={(id) => rejectEvidence(current, id)}
        onAnswer={(status) => answer(current, status)}
      />
    );
  } else if (view?.kind === "journey") {
    body = <Journey journey={journey} onBack={() => setView(null)} onToggleDone={toggleDone} />;
  } else if (tab === "ledger") {
    body = <Ledger ledger={ledger} onOpen={openFromLedger} onEraseAll={eraseAll} />;
  } else if (tab === "sources") {
    body = (
      <section>
        <h1>{t("sources.title")}</h1>
        <SourceList sources={sources} onChange={onSource} />
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
        <strong>{t("appName")}</strong>
        <button type="button" className="quiet" onClick={() => setLocale(locale === "en" ? "fi" : "en")}>
          {t("lang.toggle")}
        </button>
      </header>
      <main>{body}</main>
      <footer className="bottom">
        <div className="net" aria-live="polite">
          {t("net.label")}: <strong>{outbound === 1 ? t("net.one") : t("net.requests", { n: outbound })}</strong>
        </div>
        {onboarded && (
          <nav>
            {(["home", "ledger", "sources"] as const).map((k) => (
              <button
                key={k}
                type="button"
                className={tab === k && !view ? "active" : ""}
                onClick={() => {
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
