// Prints the pitch deck (pitch/deck/deck.html) to pitch/what-if-deck.pdf with headless Chrome, in the app's own
// font, and writes a picture of each slide to pitch/deck/out (git-ignored) for checking.
//
//   node scripts/what-if-deck/build.ts
import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { launchChrome, root } from "../cdp.ts";

const deck = join(root, "pitch", "deck");
const pdf = join(root, "pitch", "what-if-deck.pdf");
const out = join(deck, "out");
const app = readFileSync(join(root, "apps", "what-if", "index.html"), "utf8");
const font = (app.match(/@font-face\s*\{[^}]*\}/) ?? [""])[0];
// Next to deck.html, so the pictures in shots/ load; removed when done.
const printable = join(deck, "print.html");
writeFileSync(printable, readFileSync(join(deck, "deck.html"), "utf8").replace("/* font */", font));

const { cdp, close } = await launchChrome(9351);
try {
  await cdp.send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false });
  await cdp.send("Page.navigate", { url: `file:///${printable.replaceAll("\\", "/")}` });
  await cdp.evaluate(`new Promise((r) => { const t = () => (document.readyState === "complete" ? r(true) : setTimeout(t, 100)); t(); })`);
  await cdp.evaluate("document.fonts.ready.then(() => true)");
  await cdp.evaluate(
    "Promise.all([...document.images].map((i) => (i.complete ? 1 : new Promise((r) => { i.onload = i.onerror = r; })))).then(() => true)",
  );
  const missing = await cdp.evaluate<string[]>("[...document.images].filter((i) => !i.naturalWidth).map((i) => i.getAttribute('src'))");
  if (missing.length) throw new Error(`missing pictures: ${missing.join(", ")}`);

  const printed = (await cdp.send("Page.printToPDF", { preferCSSPageSize: true, printBackground: true })) as { data: string };
  writeFileSync(pdf, Buffer.from(printed.data, "base64"));

  // The old pictures go, not the folder: Windows won't remove a folder a shell or a viewer has open.
  mkdirSync(out, { recursive: true });
  for (const f of readdirSync(out)) if (/^slide-\d+\.png$/.test(f)) rmSync(join(out, f));
  const slides = await cdp.evaluate<{ x: number; y: number }[]>(
    `[...document.querySelectorAll(".slide")].map((s) => { const r = s.getBoundingClientRect(); return { x: r.left + scrollX, y: r.top + scrollY }; })`,
  );
  for (const [i, { x, y }] of slides.entries()) {
    const shot = (await cdp.send("Page.captureScreenshot", {
      format: "png",
      clip: { x, y, width: 1280, height: 720, scale: 1 },
      captureBeyondViewport: true,
    })) as { data: string };
    writeFileSync(join(out, `slide-${String(i + 1).padStart(2, "0")}.png`), Buffer.from(shot.data, "base64"));
  }
  console.log(`${pdf}: ${slides.length} slides; pictures in ${out}`);
} finally {
  await close();
  rmSync(printable, { force: true });
}
