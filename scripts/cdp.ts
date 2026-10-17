// Shared by the headless-Chrome scripts (offline-check.ts, demo-capture.ts): serve apps/web/dist with
// `vite preview`, start Chrome without a window, and drive one page over the DevTools Protocol.
import { type ChildProcess, spawn } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const root = join(dirname(fileURLToPath(import.meta.url)), "..");
export const web = join(root, "apps", "web");

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function waitFor(url: string, ms = 30_000): Promise<void> {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    try {
      if ((await fetch(url)).ok) return;
    } catch {}
    await sleep(300);
  }
  throw new Error(`${url} did not answer`);
}

/** `vite preview` of the production build; throws if there is no build. */
export function startPreview(port: number): ChildProcess {
  if (!existsSync(join(web, "dist", "index.html"))) throw new Error("apps/web/dist is missing; build first");
  return spawn(process.execPath, [join(web, "node_modules/vite/bin/vite.js"), "preview", "--port", String(port), "--strictPort"], {
    cwd: web,
    stdio: "ignore",
  });
}

export type Cdp = Awaited<ReturnType<typeof connect>>;

/** A minimal DevTools Protocol client over Node's built-in WebSocket. */
export async function connect(wsUrl: string) {
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

/** Headless Chrome with a throwaway profile; `close` kills it and deletes the profile. */
export async function launchChrome(debugPort = 9333): Promise<{ cdp: Cdp; close(): Promise<void> }> {
  const chromePath =
    process.env.CHROME ??
    [
      "C:/Program Files/Google/Chrome/Application/chrome.exe",
      "/usr/bin/google-chrome",
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    ].find((p) => existsSync(p));
  if (!chromePath) throw new Error("Chrome not found; set CHROME to its path");
  const profile = mkdtempSync(join(tmpdir(), "ahead-chrome-"));
  const chrome = spawn(
    chromePath,
    ["--headless=new", `--remote-debugging-port=${debugPort}`, `--user-data-dir=${profile}`, "--no-first-run", "about:blank"],
    { stdio: "ignore" },
  );
  await waitFor(`http://127.0.0.1:${debugPort}/json/version`);
  const targets = (await (await fetch(`http://127.0.0.1:${debugPort}/json/list`)).json()) as {
    type: string;
    webSocketDebuggerUrl: string;
  }[];
  const page = targets.find((t) => t.type === "page");
  if (!page) throw new Error("no page target");
  const cdp = await connect(page.webSocketDebuggerUrl);
  return {
    cdp,
    async close() {
      cdp.close();
      chrome.kill();
      await sleep(1000);
      try {
        rmSync(profile, { recursive: true, force: true });
      } catch {}
    },
  };
}

/** Resolves when the page has loaded and the app has rendered its main area. */
export const LOADED = `new Promise((r) => { const t = () => (document.readyState === "complete" && document.querySelector("main") ? r(true) : setTimeout(t, 200)); t(); })`;
