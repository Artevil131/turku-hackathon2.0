// The only server there is, and the only thing that can ever receive
// anything from the app: a confirmed event the user chose to share
// (ARCHITECTURE.md §3). It accepts exactly three fields, appends them to
// a file, and serves counts per municipality and event type. No user
// id, no snippet, no vector, no cookie. Usage: node apps/api/src/server.ts
// (port 8787, or AHEAD_API_PORT).

import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { EVENT_TYPES, type EventType, type IsoDate } from "@ahead/contract";

const PORT = Number(process.env.AHEAD_API_PORT ?? 8787);
const FILE = process.env.AHEAD_API_FILE ?? join(dirname(fileURLToPath(import.meta.url)), "../../../data/shared/events.jsonl");

/** What a share contains, and nothing else. */
export interface SharedEvent {
  type: EventType;
  date?: IsoDate;
  municipality?: string;
}

interface Stored extends SharedEvent {
  receivedAt: string;
}

function isIsoDate(s: unknown): s is IsoDate {
  return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
}

/** Accepts the three fields, drops anything else, refuses the rest. */
export function parseShare(body: unknown): SharedEvent | undefined {
  if (!body || typeof body !== "object") return undefined;
  const b = body as Record<string, unknown>;
  if (!EVENT_TYPES.includes(b.type as EventType)) return undefined;
  const out: SharedEvent = { type: b.type as EventType };
  if (isIsoDate(b.date)) out.date = b.date;
  if (typeof b.municipality === "string" && b.municipality.length <= 40 && /^[\p{L} -]+$/u.test(b.municipality))
    out.municipality = b.municipality;
  return out;
}

function load(): Stored[] {
  if (!existsSync(FILE)) return [];
  return readFileSync(FILE, "utf8")
    .split("\n")
    .filter(Boolean)
    .map((l) => JSON.parse(l) as Stored);
}

export function counts(rows: readonly Stored[]) {
  const byType: Record<string, number> = {};
  const byMunicipality: Record<string, Record<string, number>> = {};
  for (const r of rows) {
    byType[r.type] = (byType[r.type] ?? 0) + 1;
    const m = r.municipality ?? "unknown";
    byMunicipality[m] ??= {};
    byMunicipality[m][r.type] = (byMunicipality[m][r.type] ?? 0) + 1;
  }
  return { total: rows.length, byType, byMunicipality };
}

function json(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { "content-type": "application/json", ...CORS });
  res.end(JSON.stringify(body));
}

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, POST, OPTIONS",
  "access-control-allow-headers": "content-type",
};

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (c) => {
      body += c;
      if (body.length > 1000) reject(new Error("too large"));
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

/** A page for the If side of the demo: the counts, nothing per person. */
function page(rows: readonly Stored[]): string {
  const c = counts(rows);
  const munis = Object.entries(c.byMunicipality)
    .map(([m, t]) => `<tr><td>${m}</td>${EVENT_TYPES.map((k) => `<td>${t[k] ?? ""}</td>`).join("")}</tr>`)
    .join("");
  return `<!doctype html><meta charset="utf-8"><title>Ahead, what If sees</title>
<style>body{font:22px/1.5 system-ui;max-width:860px;margin:48px auto;padding:0 24px;color:#0f2a30;background:#eaf3f4}h1{font-size:44px;margin:0 0 8px}.big{font-size:96px;font-weight:700;line-height:1;margin:16px 0 8px;color:#123e48}table{border-collapse:collapse;width:100%;font-size:22px;background:#fff;border-radius:12px;overflow:hidden}td,th{padding:12px 14px;border-bottom:1px solid #d7e3e5;text-align:left}th{font-weight:600;background:#f3f8f8}small{color:#5b6573}</style>
<h1>What If sees</h1>
<div class="big">${c.total}</div>
<p>shared event${c.total === 1 ? "" : "s"}. Each one is a type, a date and a municipality that a user chose to share. Nothing else ever arrives here.</p>
<table><tr><th>Municipality</th>${EVENT_TYPES.map((k) => `<th>${k}</th>`).join("")}</tr>${munis || `<tr><td colspan="7"><small>Nothing yet.</small></td></tr>`}</table>
<p><small>Last received: <span id="last">${rows.at(-1)?.receivedAt ?? "never"}</span>. Raw: <a href="/api/counts">/api/counts</a>. This page refreshes itself.</small></p>
<script>
  // The stage beat: when a phone shares, this page's number ticks without a reload.
  let shown = ${c.total};
  setInterval(async () => {
    try {
      const r = await fetch("/api/counts", { cache: "no-store" });
      const c = await r.json();
      if (c.total !== shown) location.reload();
    } catch {}
  }, 2000);
</script>`;
}

export function start(port = PORT) {
  mkdirSync(dirname(FILE), { recursive: true });
  const server = createServer(async (req, res) => {
    const url = new URL(req.url ?? "/", "http://x");
    if (req.method === "OPTIONS") {
      res.writeHead(204, CORS);
      res.end();
      return;
    }
    if (req.method === "POST" && url.pathname === "/api/share") {
      try {
        const share = parseShare(JSON.parse(await readBody(req)));
        if (!share) return json(res, 400, { error: "a share is {type, date?, municipality?} and nothing else" });
        const row: Stored = { ...share, receivedAt: new Date().toISOString() };
        appendFileSync(FILE, `${JSON.stringify(row)}\n`);
        return json(res, 200, { ok: true, received: share, total: load().length });
      } catch (e) {
        return json(res, 400, { error: String(e instanceof Error ? e.message : e) });
      }
    }
    if (req.method === "GET" && url.pathname === "/api/counts") return json(res, 200, counts(load()));
    if (req.method === "GET" && url.pathname === "/") {
      res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      res.end(page(load()));
      return;
    }
    json(res, 404, { error: "not found" });
  });
  server.listen(port, () => console.log(`ahead api on http://localhost:${port}  (file ${FILE})`));
  return server;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) start();
