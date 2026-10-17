// Smooth backup of the synthetic share moment. Needs the production preview on :4173 and demo API on :8787.
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { LOADED, launchChrome, root, sleep } from "./cdp.ts";

const out = join(root, "tools/demo-video/out/share-motion.mp4");
mkdirSync(join(root, "tools/demo-video/out"), { recursive: true });
const frames = mkdtempSync(join(tmpdir(), "ahead-share-frames-"));
const chrome = await launchChrome(9335);
try {
  const { cdp } = chrome;
  const times: number[] = [];
  cdp.on((m) => {
    if (m.method !== "Page.screencastFrame") return;
    const data = m.params.data as string;
    writeFileSync(join(frames, `${String(times.length).padStart(5, "0")}.png`), Buffer.from(data, "base64"));
    times.push((m.params.metadata as { timestamp: number }).timestamp);
    void cdp.send("Page.screencastFrameAck", { sessionId: m.params.sessionId });
  });
  const click = (text: string) =>
    cdp.evaluate(`(() => {
      const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim().startsWith(${JSON.stringify(text)}));
      if (!b) throw new Error('Missing control: ' + ${JSON.stringify(text)});
      const box = b.getBoundingClientRect();
      if (box.top < 0 || box.bottom > innerHeight) b.scrollIntoView({block:'nearest'});
      b.click();
    })()`);
  await cdp.send("Page.enable");
  await cdp.send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  await cdp.send("Page.navigate", { url: "http://localhost:4173/?engine=core&fmi=example&today=2026-10-17" });
  await cdp.evaluate(LOADED);
  for (const source of ["Calendar", "Places", "Photos", "Messages", "Wi-Fi", "Mail", "Bank"]) {
    await cdp.evaluate(`document.querySelector('[aria-label="${source}"]').click()`);
    await sleep(200);
    if (source === "Mail" || source === "Bank") {
      await click("Allow");
      await sleep(200);
    }
  }
  await click("Continue");
  await sleep(300);
  await click("Check now");
  const deadline = Date.now() + 120_000;
  while (!(await cdp.evaluate<boolean>("!!document.querySelector('.event-list .row-button')"))) {
    const error = await cdp.evaluate<string | undefined>("document.querySelector('[role=alert]')?.textContent");
    if (error || Date.now() > deadline) throw new Error(error ?? "Detection timed out");
    await sleep(500);
  }
  await cdp.evaluate(`(() => {
    const move = [...document.querySelectorAll('.row-button')].find(b => b.textContent.includes('a move'));
    if (!move) throw new Error('Move missing'); move.click();
  })()`);
  await sleep(400);
  await click("Yes, help me");
  await sleep(600);
  await cdp.evaluate("document.querySelector('main').scrollTo({top:1e6})");
  await sleep(300);
  await cdp.send("Page.startScreencast", { format: "png", maxWidth: 780, maxHeight: 1688, everyNthFrame: 1 });
  await sleep(600);
  await click("Share this event with If");
  await sleep(1400);
  await click("Share with If");
  await sleep(2600);
  const sent = await cdp.evaluate<boolean>(
    `(() => {
      const counter = document.querySelector('.net');
      const box = counter.getBoundingClientRect();
      return document.body.innerText.includes('Sent. If received exactly this:') &&
        counter.innerText.includes('1 request') && box.top >= 0 && box.bottom <= innerHeight;
    })()`,
  );
  if (!sent) throw new Error("Share failed; recording is not a successful demo");
  await click("Done");
  await sleep(1200);
  await cdp.send("Page.stopScreencast");
  await sleep(300);
  if (!times.length) throw new Error("No screencast frames");
  const file = (i: number) => `file '${join(frames, `${String(i).padStart(5, "0")}.png`)}'`;
  const list = times.map((t, i) => `${file(i)}\nduration ${Math.max(0.02, (times[i + 1] ?? t + 0.04) - t).toFixed(3)}`).join("\n");
  writeFileSync(join(frames, "list.txt"), `${list}\n${file(times.length - 1)}\n`);
  execFileSync("ffmpeg", [
    "-y",
    "-loglevel",
    "error",
    "-f",
    "concat",
    "-safe",
    "0",
    "-i",
    join(frames, "list.txt"),
    "-vf",
    "fps=25,format=yuv420p,scale=780:1688",
    "-c:v",
    "libx264",
    "-crf",
    "20",
    out,
  ]);
  console.log(`Saved ${out}: ${times.length} frames, ${((times.at(-1) ?? 0) - (times[0] ?? 0)).toFixed(1)} seconds`);
} finally {
  await chrome.close();
  rmSync(frames, { recursive: true, force: true });
}
