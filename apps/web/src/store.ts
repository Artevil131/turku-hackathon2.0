import { type Journey, type LedgerEntry, SOURCES, type SourceState, type Store } from "@ahead/contract";
import { type IDBPDatabase, openDB } from "idb";

const DB_NAME = "ahead";

type Db = IDBPDatabase;

function open(name: string): Promise<Db> {
  return openDB(name, 1, {
    upgrade(db) {
      db.createObjectStore("sources", { keyPath: "source" });
      db.createObjectStore("ledger", { keyPath: "event.id" });
      db.createObjectStore("journeys", { keyPath: "eventId" });
    },
  });
}

/** The app's single store, over IndexedDB. Nothing is enabled until the user turns it on. */
export function createStore(name = DB_NAME): Store {
  let db: Promise<Db> | undefined;
  const get = () => {
    db ??= open(name);
    return db;
  };
  return {
    async sources() {
      const saved = new Map<string, SourceState>(((await (await get()).getAll("sources")) as SourceState[]).map((s) => [s.source, s]));
      return SOURCES.map((source) => saved.get(source) ?? { source, enabled: false });
    },
    async setSource(state) {
      await (await get()).put("sources", state);
    },
    async ledger() {
      return (await (await get()).getAll("ledger")) as LedgerEntry[];
    },
    async upsertLedger(entry) {
      await (await get()).put("ledger", entry);
    },
    async journey(eventId) {
      return (await (await get()).get("journeys", eventId)) as Journey | undefined;
    },
    async putJourney(journey) {
      await (await get()).put("journeys", journey);
    },
    /** One transaction over every object store, so nothing survives a half-finished erase. */
    async eraseAll() {
      const d = await get();
      const names = Array.from(d.objectStoreNames);
      const tx = d.transaction(names, "readwrite");
      await Promise.all([...names.map((n) => tx.objectStore(n).clear()), tx.done]);
    },
  };
}
