// Offline check for the demo build (D-015, WORK.md "Integration"). Serves apps/web/dist with `vite preview`,
// opens it in headless Chrome, runs "Check now" on the real core while recording every request, then stops
// the server and runs it again from the service worker's cache alone. Prints one JSON summary.
//   pnpm --filter @ahead/web build && node scripts/offline-check.ts
// Needs the model and runtime under apps/web/public (pnpm --filter @ahead/web assets) before the build.
import { type ChildProcess, spawn } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const web = join(root, "apps", "web");
const PORT = 4191;
const ORIGIN = `http://localhost:${PORT}`;
const URL_UNDER_TEST = `${ORIGIN}/?engine=core&today=2026-10-17`;
const CHROME =
  process.env.CHROME ??
  [
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "/usr/bin/google-chrome",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  ].find((p) => existsSync(p));

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function waitFor(url: string, ms = 30_000): Promise<void> {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    try {
      if ((await fetch(url)).ok) return;
    } catch {}
    await sleep(300);
  }
  throw new Error(`${url} did not answer`);
}

function startPreview(): ChildProcess {
  return spawn(process.execPath, [join(web, "node_modules/vite/bin/vite.js"), "preview", "--port", String(PORT), "--strictPort"], {
    cwd: web,
    stdio: "ignore",
  });
}

/** A minimal DevTools Protocol client over Node's built-in WebSocket. */
async function connect(wsUrl: string) {
  const ws = new WebSocket(wsUrl);
  await new Promise((r, j) => {
    ws.onopen = r;
    ws.onerror = j;
  });
  let id = 0;
  const pending = new Map<number, (v: { result?: unknown; error?: { message: string } }) => void>();
  const handlers: ((m: { method: string; params: Record<string, unknown> }) => void)[] = [];
  ws.onmessage = (e) => {
    const msg = JSON.parse(String(e.data));
    if (msg.id && pending.has(msg.id)) pending.get(msg.id)?.(msg);
    else if (msg.method) for (const h of handlers) h(msg);
  };
  const send = (method: string, params: object = {}) =>
    new Promise<Record<string, unknown>>((resolve, reject) => {
      const n = ++id;
      pending.set(n, (m) => (m.error ? reject(new Error(m.error.message)) : resolve(m.result as Record<string, unknown>)));
      ws.send(JSON.stringify({ id: n, method, params }));
    });
  const evaluate = async <T>(expression: string): Promise<T> => {
    const r = (await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true })) as {
      result: { value: T };
      exceptionDetails?: { exception?: { description?: string } };
    };
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? "evaluate failed");
    return r.result.value;
  };
  return { send, evaluate, on: (h: (typeof handlers)[number]) => handlers.push(h), close: () => ws.close() };
}

// Runs in the page: onboards with every source on (first time only), presses "Check now" and waits for it.
const CHECK = `(async () => {
  const w = (ms) => new Promise((r) => setTimeout(r, ms));
  const click = (t) => { const b = [...document.querySelectorAll("button")].find((x) => x.textContent.trim().startsWith(t)); if (!b) throw new Error("no button " + t); b.click(); };
  if (document.body.innerText.includes("What may Ahead")) {
    for (const s of ["Calendar", "Places", "Photos"]) { document.querySelector('[aria-label="' + s + '"]').click(); await w(100); }
    for (const s of ["Mail", "Bank"]) { document.querySelector('[aria-label="' + s + '"]').click(); await w(200); click("Allow"); await w(200); }
    click("Continue"); await w(300);
  }
  click("Check now");
  const t0 = Date.now();
  await w(500);
  while (document.body.innerText.includes("Checking")) { if (Date.now() - t0 > 600000) throw new Error("check timed out"); await w(500); }
  return {
    seconds: Math.round((Date.now() - t0) / 100) / 10,
    events: [...document.querySelectorAll(".row-button")].map((r) => r.innerText.trim()),
    counter: document.querySelector(".net").innerText,
    error: document.querySelector("[role=alert]")?.innerText ?? null,
  };
})()`;

const LOADED = `new Promise((r) => { const t = () => (document.readyState === "complete" && document.querySelector("main") ? r(true) : setTimeout(t, 200)); t(); })`;

if (!CHROME) throw new Error("Chrome not found; set CHROME to its path");
if (!existsSync(join(web, "dist", "index.html"))) throw new Error("apps/web/dist is missing; build first");

const profile = mkdtempSync(join(tmpdir(), "ahead-chrome-"));
const preview = startPreview();
const chrome = spawn(
  CHROME,
  ["--headless=new", "--remote-debugging-port=9333", `--user-data-dir=${profile}`, "--no-first-run", "about:blank"],
  {
    stdio: "ignore",
  },
);
const summary: Record<string, unknown> = {};
try {
  await waitFor(`${ORIGIN}/`);
  await waitFor("http://127.0.0.1:9333/json/version");
  const targets = (await (await fetch("http://127.0.0.1:9333/json/list")).json()) as { type: string; webSocketDebuggerUrl: string }[];
  const page = targets.find((t) => t.type === "page");
  if (!page) throw new Error("no page target");
  const cdp = await connect(page.webSocketDebuggerUrl);

  const outbound: string[] = [];
  cdp.on((m) => {
    if (m.method !== "Network.requestWillBeSent") return;
    const url = (m.params.request as { url: string }).url;
    if (!url.startsWith(ORIGIN) && !url.startsWith("data:") && !url.startsWith("blob:")) outbound.push(url);
  });
  await cdp.send("Network.enable");
  await cdp.send("Page.enable");

  // 1. Online: first visit installs the service worker; a reload puts the page under its control.
  await cdp.send("Page.navigate", { url: URL_UNDER_TEST });
  await cdp.evaluate(LOADED);
  summary.serviceWorker = await cdp.evaluate<string>(
    `Promise.race([navigator.serviceWorker.ready.then(() => "ready"), new Promise((r) => setTimeout(() => r("not ready after 20 s"), 20000))])`,
  );
  await cdp.send("Page.reload");
  await sleep(500);
  await cdp.evaluate(LOADED);
  summary.controlled = await cdp.evaluate<boolean>("!!navigator.serviceWorker.controller");
  summary.online = await cdp.evaluate(CHECK);
  summary.cachedFiles = await cdp.evaluate<number>(`caches.open("ahead-v1").then((c) => c.keys()).then((k) => k.length)`);

  // 2. Offline: the server is gone; the app, the phone, the model and the runtime must come from the cache.
  preview.kill();
  await sleep(1000);
  summary.serverStopped = await fetch(`${ORIGIN}/`).then(
    () => false,
    () => true,
  );
  await cdp.send("Page.reload");
  await sleep(500);
  await cdp.evaluate(LOADED);
  summary.offline = await cdp.evaluate(CHECK);
  summary.outboundRequests = outbound;
  cdp.close();
} finally {
  preview.kill();
  chrome.kill();
  await sleep(1000);
  try {
    rmSync(profile, { recursive: true, force: true });
  } catch {}
}
console.log(JSON.stringify(summary, null, 2));
