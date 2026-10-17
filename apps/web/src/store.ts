import { type Journey, type LedgerEntry, SOURCES, type SourceState, type Store } from "@ahead/contract";
import type { VectorSnapshot } from "@ahead/detect";
import { type IDBPDatabase, openDB } from "idb";

const DB_NAME = "ahead";

type Db = IDBPDatabase;

function open(name: string): Promise<Db> {
  return openDB(name, 2, {
    upgrade(db, oldVersion) {
      if (oldVersion < 1) {
        db.createObjectStore("sources", { keyPath: "source" });
        db.createObjectStore("ledger", { keyPath: "event.id" });
        db.createObjectStore("journeys", { keyPath: "eventId" });
      }
      // v2: the detector's embedded vectors, one snapshot (derived personal data: on this device only, erased with the rest).
      if (oldVersion < 2) db.createObjectStore("vectors");
    },
  });
}

/** The contract's Store plus the app's vector cache, so "Check now" is instant after a reload (WORK.md, A to B). */
export interface AppStore extends Store {
  vectors(): Promise<VectorSnapshot | undefined>;
  putVectors(snapshot: VectorSnapshot): Promise<void>;
}

const SNAPSHOT_KEY = "snapshot";

/** The app's single store, over IndexedDB. Nothing is enabled until the user turns it on. */
export function createStore(name = DB_NAME): AppStore {
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
    async vectors() {
      return (await (await get()).get("vectors", SNAPSHOT_KEY)) as VectorSnapshot | undefined;
    },
    async putVectors(snapshot) {
      await (await get()).put("vectors", snapshot, SNAPSHOT_KEY);
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
