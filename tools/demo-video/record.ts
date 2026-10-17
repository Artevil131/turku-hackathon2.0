// A synthetic-phone backup of PLAN.md's demo. Node 22's type stripping and built-in WebSocket only.
import { type ChildProcess, spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { copyFile, mkdir, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const out = join(root, "tools/demo-video/out");
const origin = "http://localhost:4195";
let interrupted = false;
let cleaningUp = false;
const sleep = async (ms: number) => {
  await new Promise<void>((resolve) => setTimeout(resolve, ms));
  if (interrupted && !cleaningUp) throw new Error("Recording interrupted");
};
const chromePath = process.env.CHROME ?? "google-chrome";

async function waitFor<T>(label: string, probe: () => Promise<T | false>, timeout = 30_000): Promise<T> {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const value = await probe();
    if (value !== false) return value;
    await sleep(200);
  }
  throw new Error(`Timed out waiting for ${label}`);
}

function launch(command: string, args: string[], quiet = false) {
  const child = spawn(command, args, { cwd: root, detached: true, stdio: quiet ? "ignore" : "inherit" });
  let error: Error | undefined;
  child.on("error", (e) => {
    error = e;
  });
  return {
    child,
    check() {
      if (error) throw error;
      if (child.exitCode !== null || child.signalCode !== null) throw new Error(`${command} exited before recording finished`);
    },
  };
}

async function stop(child: ChildProcess) {
  if (!child.pid) return;
  // pnpm launches Vite as a descendant; stop the entire process group, not just its wrapper.
  try {
    process.kill(-child.pid, "SIGTERM");
  } catch {}
  await Promise.race([new Promise<void>((resolve) => child.once("exit", () => resolve())), sleep(1000)]);
  try {
    process.kill(-child.pid, "SIGKILL");
  } catch {}
}

async function connect(url: string) {
  const ws = new WebSocket(url);
  await new Promise<void>((resolve, reject) => {
    ws.onopen = () => resolve();
    ws.onerror = () => reject(new Error("Cannot connect to Chrome DevTools"));
  });
  let id = 0;
  const pending = new Map<number, { resolve(value: Record<string, unknown>): void; reject(error: Error): void }>();
  ws.onmessage = (event) => {
    const message = JSON.parse(String(event.data));
    const request = pending.get(message.id);
    if (!request) return;
    pending.delete(message.id);
    if (message.error) request.reject(new Error(message.error.message));
    else request.resolve(message.result);
  };
  ws.onclose = () => {
    for (const request of pending.values()) request.reject(new Error("Chrome disconnected"));
    pending.clear();
  };
  const send = (method: string, params: object = {}) =>
    new Promise<Record<string, unknown>>((resolve, reject) => {
      const n = ++id;
      const timer = setTimeout(() => {
        pending.delete(n);
        reject(new Error(`CDP timeout: ${method}`));
      }, 30_000);
      pending.set(n, {
        resolve(value) {
          clearTimeout(timer);
          resolve(value);
        },
        reject(error) {
          clearTimeout(timer);
          reject(error);
        },
      });
      ws.send(JSON.stringify({ id: n, method, params }));
    });
  const evaluate = async <T>(expression: string): Promise<T> => {
    const result = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
    if (result.exceptionDetails) throw new Error(`Page evaluation failed: ${JSON.stringify(result.exceptionDetails)}`);
    return (result.result as { value: T }).value;
  };
  return { send, evaluate, close: () => ws.close() };
}

type CDP = Awaited<ReturnType<typeof connect>>;

// Search visible controls by accessible label or text. Missing copy must not abort the rest of the demo.
async function click(cdp: CDP, label: string, selectors: string[], texts: string[] = []) {
  const found = await cdp.evaluate<boolean>(`(() => {
    const visible = (el) => el && el.getClientRects().length && !el.disabled;
    const selectors = ${JSON.stringify(selectors)};
    const texts = ${JSON.stringify(texts)};
    const controls = [...document.querySelectorAll('button, a, [role="tab"], [role="button"]')];
    const el = selectors.map(s => document.querySelector(s)).find(visible) ||
      texts.map(t => controls.find(el => visible(el) &&
        (el.getAttribute('aria-label') || el.textContent).trim().toLowerCase().startsWith(t.toLowerCase()))).find(Boolean);
    if (!el) return false;
    el.scrollIntoView({block: 'center'});
    el.click();
    return true;
  })()`);
  console.log(`${found ? "Clicked" : "Missing control (continuing):"} ${label}`);
  await sleep(1200);
  return found;
}

async function scrollToTop(cdp: CDP) {
  await cdp.evaluate(`(() => {
    window.scrollTo(0, 0);
    for (const el of document.querySelectorAll('main, main *, #root, body')) {
      if (el.scrollTop) el.scrollTop = 0;
    }
  })()`);
}

if (!existsSync(join(root, "apps/web/dist/index.html"))) {
  throw new Error("apps/web/dist is missing. Run pnpm --filter @ahead/web assets && pnpm --filter @ahead/web build first.");
}

const temp = await mkdtemp(join(tmpdir(), "ahead-demo-video-"));
const profile = join(temp, "chrome");
const frames = join(temp, "frames");
const keys = join(temp, "keys");
await mkdir(frames);
await mkdir(keys);
const preview = launch("pnpm", ["--filter", "@ahead/web", "exec", "vite", "preview", "--port", "4195", "--strictPort"]);
const chrome = launch(
  chromePath,
  [
    "--headless=new",
    "--remote-debugging-port=0",
    `--user-data-dir=${profile}`,
    "--no-first-run",
    "--no-default-browser-check",
    "--hide-scrollbars",
    "about:blank",
  ],
  true,
);
let cdp: CDP | undefined;
let recording = false;
let capture: Promise<void> | undefined;
let captureError: unknown;
let frameCount = 0;
let stepCount = 0;
const onInterrupt = () => {
  interrupted = true;
};
process.once("SIGINT", onInterrupt);
process.once("SIGTERM", onInterrupt);
try {
  await waitFor("Vite preview", async () => {
    preview.check();
    try {
      return (await fetch(origin)).ok;
    } catch {
      return false;
    }
  });
  const port = await waitFor("Chrome debugging port", async () => {
    chrome.check();
    try {
      return (await readFile(join(profile, "DevToolsActivePort"), "utf8")).split("\n")[0] || false;
    } catch {
      return false;
    }
  });
  const targets = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()) as { type: string; webSocketDebuggerUrl: string }[];
  const target = targets.find((t) => t.type === "page");
  if (!target) throw new Error("Chrome has no page target");
  const client = await connect(target.webSocketDebuggerUrl);
  cdp = client;
  await client.send("Page.enable");
  await client.send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  await client.send("Emulation.setTouchEmulationEnabled", { enabled: true });
  await client.send("Page.navigate", { url: `${origin}/?engine=core&today=2026-10-17` });
  await waitFor("app", () => client.evaluate<boolean>(`document.readyState === 'complete' && !!document.querySelector('main')`));

  const screenshot = async (file: string) => {
    const result = await client.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
    await writeFile(file, Buffer.from(result.data as string, "base64"));
  };
  recording = true;
  capture = (async () => {
    while (recording) {
      const start = Date.now();
      await screenshot(join(frames, `${String(++frameCount).padStart(6, "0")}.png`));
      await sleep(Math.max(0, 250 - (Date.now() - start)));
    }
  })().catch((error) => {
    captureError = error;
    recording = false;
  });
  const step = async (name: string) => {
    await sleep(2000);
    await screenshot(join(keys, `${String(++stepCount).padStart(2, "0")}-${name}.png`));
    console.log(`Key frame: ${name}`);
  };
  await step("onboarding");
  for (const source of ["Calendar", "Places", "Photos"]) {
    await click(client, source, [`[aria-label="${source}"]`]);
    await step(source.toLowerCase());
  }
  for (const source of ["Mail", "Bank"]) {
    await click(client, source, [`[aria-label="${source}"]`]);
    await step(`${source.toLowerCase()}-consent`);
    await click(client, "Allow", [], ["Allow"]);
    await step(source.toLowerCase());
  }
  await click(client, "Continue", [], ["Continue"]);
  await scrollToTop(client);
  await step("home");
  await click(client, "Check now", [], ["Check now"]);
  await step("checking");
  await waitFor(
    "detected event (120 s)",
    () => client.evaluate<boolean>(`!!document.querySelector('.row-button, .event-card, [data-testid="event-card"], [data-event-id]')`),
    120_000,
  );
  await step("events");
  // The move, when listed (second by date after the test drive): its share carries a municipality.
  await click(client, "the move, else the first event", [
    ".event-list li:nth-child(2) .row-button",
    ".row-button",
    ".event-card button",
    "button.event-card",
    '[data-testid="event-card"]',
    "[data-event-id]",
  ]);
  await scrollToTop(client);
  await step("evidence");
  await click(client, "Not this", [], ["Not this"]);
  await step("evidence-rejected");
  await click(client, "Yes, help me", [], ["Yes, help me", "Help me with this"]);
  // The primary class is a fallback for copy changes, but only on a notice with evidence.
  if (await client.evaluate<boolean>(`!![...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Not this')`)) {
    await click(client, "notice primary", ["main button.primary", "button.primary"]);
  }
  await scrollToTop(client);
  await step("journey");
  // Scroll the page or a redesigned app's nested scrolling main, in small timed increments.
  for (let i = 0; i < 160; i++) {
    const moved = await client.evaluate<boolean>(`(() => {
      const el = [...document.querySelectorAll('main, main *, #root, body')].find(el =>
        el.scrollHeight > el.clientHeight + 1 && /auto|scroll/.test(getComputedStyle(el).overflowY)) || document.scrollingElement;
      if (!el) return false;
      const before = el.scrollTop;
      el.scrollBy(0, 48);
      return el.scrollTop > before;
    })()`);
    if (!moved) break;
    await sleep(250);
  }
  await step("journey-end");
  // The share: the one message that can leave the phone (PLAN.md demo script, 2:10). Needs apps/api running.
  if (await click(client, "Share this event with If", [".share-button"], ["Share this event with If", "Jaa tämä tapahtuma"])) {
    await step("share-sheet");
    await click(client, "Share with If", ["dialog.share-sheet button.primary"], ["Share with If", "Jaa Ifille"]);
    await sleep(1800);
    await step("share-sent");
    await click(client, "Done", ["dialog.share-sheet button.primary"], ["Done", "Valmis"]);
    await step("journey-shared");
  }
  await click(client, "Back", ['[aria-label="Back"]'], ["Back", "← Back"]);
  await scrollToTop(client);
  await step("back");
  await click(client, "Ledger", ['[aria-label="Ledger"]'], ["Ledger"]);
  await scrollToTop(client);
  await step("ledger");
  await click(client, "Settings (Sources in the current app)", ['[aria-label="Settings"]'], ["Settings", "Sources"]);
  await scrollToTop(client);
  await step("settings");
  recording = false;
  await capture;
  if (captureError) throw captureError;
  if (frameCount <= 100) throw new Error(`Only ${frameCount} captured frames; expected more than 100`);
  await mkdir(join(out, "frames"), { recursive: true });
  const encoder = spawn(
    "ffmpeg",
    [
      "-hide_banner",
      "-loglevel",
      "error",
      "-y",
      "-framerate",
      "4",
      "-i",
      join(frames, "%06d.png"),
      "-r",
      "8",
      "-c:v",
      "libx264",
      "-preset",
      "ultrafast",
      "-threads",
      "2",
      "-crf",
      "20",
      "-pix_fmt",
      "yuv420p",
      "-movflags",
      "+faststart",
      join(out, "demo.mp4"),
    ],
    { stdio: "inherit" },
  );
  await new Promise<void>((resolve, reject) => {
    encoder.once("error", reject);
    encoder.once("exit", (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg exited ${code}`))));
  });
  for (const name of await readdir(join(out, "frames"))) {
    if (/^\d+-[a-z-]+\.png$/.test(name)) await rm(join(out, "frames", name));
  }
  for (const name of await readdir(keys)) await copyFile(join(keys, name), join(out, "frames", name));
  console.log(`Saved ${join(out, "demo.mp4")}: ${frameCount} captured frames, approximately ${frameCount / 4} s at 8 fps.`);
} finally {
  cleaningUp = true;
  recording = false;
  await capture;
  cdp?.close();
  await Promise.all([stop(preview.child), stop(chrome.child)]);
  await rm(temp, { recursive: true, force: true });
  process.removeListener("SIGINT", onInterrupt);
  process.removeListener("SIGTERM", onInterrupt);
}
