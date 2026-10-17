// Backup for the pitch (PLAN.md "record a backup video"): walks the demo script on the production build at
// phone size in headless Chrome and saves one PNG per step to demo-capture/ (git-ignored). Rerun it after
// any change to the screens; it finds things by their text and labels, so new styling does not break it.
//   pnpm --filter @ahead/web build && node scripts/demo-capture.ts
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { LOADED, launchChrome, root, sleep, startPreview, waitFor } from "./cdp.ts";

const PORT = 4192;
const ORIGIN = `http://localhost:${PORT}`;
const START = `${ORIGIN}/?engine=core&fmi=example&today=2026-10-17`;
const out = join(root, "demo-capture");
mkdirSync(out, { recursive: true });

// Page-side helpers: click a button by its visible text, or a switch by its label.
const HELPERS = `
  window.__w = (ms) => new Promise((r) => setTimeout(r, ms));
  window.__click = (t) => { const b = [...document.querySelectorAll("button, a")].find((x) => x.textContent.trim().startsWith(t)); if (!b) throw new Error("no button " + t); b.click(); };
  window.__switch = (label) => document.querySelector('[aria-label="' + label + '"]').click();
  true`;

const preview = startPreview(PORT);
const chrome = await launchChrome(9334);
const shots: string[] = [];
try {
  await waitFor(`${ORIGIN}/`);
  const { cdp } = chrome;
  await cdp.send("Page.enable");
  await cdp.send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });

  const run = (js: string) => cdp.evaluate(`(async () => { ${js} })()`);
  /** Saves the whole page, not only the visible part, so long journeys fit on one image. */
  const shot = async (name: string) => {
    await sleep(400);
    // A full-page image would show the sticky footer halfway down; for the capture only, let it sit at the end.
    await cdp.evaluate(
      `document.getElementById("ahead-capture-style") ?? document.head.insertAdjacentHTML("beforeend", "<style id=ahead-capture-style>footer{position:static!important}</style>")`,
    );
    const { cssContentSize } = (await cdp.send("Page.getLayoutMetrics")) as { cssContentSize: { width: number; height: number } };
    const { data } = (await cdp.send("Page.captureScreenshot", {
      format: "png",
      captureBeyondViewport: true,
      clip: { x: 0, y: 0, width: 390, height: Math.max(844, Math.ceil(cssContentSize.height)), scale: 1 },
    })) as { data: string };
    const file = `${String(shots.length + 1).padStart(2, "0")}-${name}.png`;
    writeFileSync(join(out, file), Buffer.from(data, "base64"));
    shots.push(file);
  };

  await cdp.send("Page.navigate", { url: START });
  await cdp.evaluate(LOADED);
  await cdp.evaluate(HELPERS);

  await shot("onboarding");
  await run(`__switch("Calendar"); await __w(150); __switch("Mail"); await __w(300);`);
  await shot("mail-consent-sheet");
  await run(`__click("Allow"); await __w(200); __switch("Bank"); await __w(300); __click("Allow"); await __w(300);`);
  await shot("sources-on");
  await run(`__click("Continue"); await __w(400);`);
  await shot("home-quiet");
  await run(`
    __click("Check now");
    const t0 = Date.now();
    await __w(500);
    while (document.body.innerText.includes("Checking")) { if (Date.now() - t0 > 600000) throw new Error("check timed out"); await __w(500); }`);
  await shot("home-notices");
  await run(`__click("It looks like a move"); await __w(500);`);
  await shot("notice-move");
  await run(`__click("Not this"); await __w(400);`);
  await shot("notice-not-this");
  await run(`__click("Yes, help me"); await __w(800);`);
  await shot("journey-move");
  await run(`__click("Ledger"); await __w(400);`);
  await shot("ledger");
  await run(`window.confirm = () => true; __click("Erase everything"); await __w(600);`);
  await shot("after-erase");
} finally {
  preview.kill();
  await chrome.close();
}
console.log(`${shots.length} screenshots in ${out}\n${shots.join("\n")}`);
