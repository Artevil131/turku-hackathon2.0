// Offline check for the demo build (D-015, WORK.md "Integration"). Serves apps/web/dist with `vite preview`,
// opens it in headless Chrome, runs "Check now" on the real core while recording every request, then stops
// the server and runs it again from the service worker's cache alone. Prints one JSON summary.
//   pnpm --filter @ahead/web build && node scripts/offline-check.ts
// Needs the model and runtime under apps/web/public (pnpm --filter @ahead/web assets) before the build.
import { LOADED, launchChrome, sleep, startPreview, waitFor } from "./cdp.ts";

const PORT = 4191;
const ORIGIN = `http://localhost:${PORT}`;
const URL_UNDER_TEST = `${ORIGIN}/?engine=core&today=2026-10-17`;

// Runs in the page: onboards with every source on (first time only), presses "Check now" and waits for it.
const CHECK = `(async () => {
  const w = (ms) => new Promise((r) => setTimeout(r, ms));
  const click = (t) => { const b = [...document.querySelectorAll("button")].find((x) => x.textContent.trim().startsWith(t)); if (!b) throw new Error("no button " + t); b.click(); };
  if (document.body.innerText.includes("What may Ahead")) {
    for (const s of ["Calendar", "Places", "Photos", "Messages", "Wi-Fi"]) { document.querySelector('[aria-label="' + s + '"]').click(); await w(100); }
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

const preview = startPreview(PORT);
const summary: Record<string, unknown> = {};
const chrome = await launchChrome();
try {
  await waitFor(`${ORIGIN}/`);
  const { cdp } = chrome;

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
  summary.revoked = await cdp.evaluate(`(async () => {
    const wait = (ms) => new Promise(r => setTimeout(r, ms));
    const click = (text) => [...document.querySelectorAll('button')].find(b => b.textContent.trim() === text).click();
    click('Sources'); await wait(200);
    for (const source of ['Calendar', 'Mail', 'Bank', 'Places', 'Photos', 'Messages', 'Wi-Fi']) {
      const control = document.querySelector('[aria-label="' + source + '"]');
      if (control.getAttribute('aria-checked') === 'true') control.click();
      await wait(150);
    }
    click('Home'); await wait(300);
    const signals = Number(document.querySelector('.sky-plate').dataset.dots);
    const checkDisabled = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Check now').disabled;
    click('Ledger'); await wait(200);
    window.confirm = () => true;
    click('Erase everything'); await wait(300);
    return {signals, checkDisabled, erased: document.querySelectorAll('[role=switch][aria-checked=true]').length === 0 && document.body.innerText.includes('What may Ahead')};
  })()`);
} finally {
  preview.kill();
  await chrome.close();
}
console.log(JSON.stringify(summary, null, 2));
const online = summary.online as { events: string[]; error: string | null };
const offline = summary.offline as { events: string[]; error: string | null };
const revoked = summary.revoked as { signals: number; checkDisabled: boolean; erased: boolean };
if (
  !summary.controlled ||
  !summary.serverStopped ||
  online.error ||
  offline.error ||
  online.events.length !== 3 ||
  JSON.stringify(online.events) !== JSON.stringify(offline.events) ||
  revoked.signals !== 0 ||
  !revoked.checkDisabled ||
  !revoked.erased ||
  (summary.outboundRequests as string[]).length > 0
) {
  throw new Error("Offline verification failed: expected the same three events online and offline, with no errors or outbound requests.");
}
