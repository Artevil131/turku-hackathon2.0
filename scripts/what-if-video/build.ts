// Builds the 2-minute pitch video (pitch/PITCH.md) from the live site: the script voiced sentence by
// sentence, the site recorded frame by frame in a phone-sized headless Chrome, captions, and ffmpeg to
// put it together. Synthetic ads only (AGENTS.md). The screenshot part asks the team's AI reader, so a
// run spends 2 of the team's 120 ads an hour.
//
//   FFMPEG=…/ffmpeg.exe KOKORO=…/say.mjs node scripts/what-if-video/build.ts --voice kokoro:am_michael --speed 1.05
//   FFMPEG=…/ffmpeg.exe PIPER=…/piper.exe PIPER_VOICES=…/voices node scripts/what-if-video/build.ts --voice en_US-ryan-high
//
// Voices: Kokoro's am_michael is the one in the video (D-030; open weights, Apache-2.0; KOKORO points at a
// copy of the say.mjs beside this file, in a folder where kokoro-js is installed), Piper, or --voice none for
// a silent, captioned video timed for reading the lines aloud over it. Voiced lines are kept between runs;
// --plan prints each line's length and stops, and a script over 2:00 stops before anything is filmed.
// Output (git-ignored): pitch/video/out/what-if-pitch.mp4, 1920×1080, 25 fps, H.264 and AAC.
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFileSync, existsSync, linkSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { type Cdp, LOADED, launchChrome, root, sleep } from "../cdp.ts";

const SITE = "https://what-if.what-if.workers.dev/";
const FPS = 25;
const LINE_GAP = 0.28; // silence after each line
const SEG_GAP = 0.55; // and after each segment
const LIMIT = 119.5; // the organisers: not a second over 2 minutes

const arg = (name: string, fallback: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? (process.argv[i + 1] ?? fallback) : fallback;
};
const voice = arg("voice", "en_US-ryan-high");
const speed = Number(arg("speed", "1.0"));
const ffmpeg = process.env.FFMPEG ?? "ffmpeg";
const out = join(root, "pitch", "video", "out");
// A fresh folder each run: Windows won't remove one that a shell or a viewer still has open.
const work = join(out, `work-${Date.now()}`);
const fwd = (p: string) => p.replaceAll("\\", "/");

// ---- the script: what is shown, and what the voice says where it must be spelled for speech ----

// marks: words of the caption shown in the colour of a who-pays label.
type Line = { show: string; say?: string; marks?: [string, Tone][] };
type Tone = "pay" | "covered";
const TONE: Record<Tone, string> = { pay: "#c2412d", covered: "#0054f0" };
type Scene = (r: Recorder, seconds: number) => Promise<void>;
type Segment = { label: string; card?: "title" | "end"; lines: Line[]; scene: Scene };

// The lines follow what the live site shows for its own examples (pitch/PITCH.md has the same words).
const SEGMENTS: Segment[] = [
  {
    label: "",
    card: "title",
    lines: [
      { show: "Insurers find out how it ends when the claim comes in." },
      { show: "What if… tells you before you sign.", say: "What if tells you before you sign." },
    ],
    scene: async (r, s) => r.hold(s),
  },
  {
    label: "A car",
    lines: [
      {
        show: "I'm 18, buying my first car: a 2009 BMW for €6,900.",
        say: "I'm eighteen, buying my first car: a two thousand nine B M W, for six thousand nine hundred euros.",
      },
      { show: "What if… checks the ad against real data.", say: "What if checks the ad against real data." },
      {
        show: "Is the clutch the original? If it slips on the test drive, ask for €700 off.",
        say: "Is the clutch the original? If it slips on the test drive, ask for seven hundred euros off.",
      },
      { show: "Almost half of these BMWs failed their last inspection.", say: "Almost half of these B M Ws failed their last inspection." },
    ],
    scene: async (r, s) => {
      const t0 = r.time;
      const lines = spokenSeconds(1);
      await r.hold(0.5);
      await r.click('[data-example="car"]');
      await r.holdUntil(t0 + lines[1]); // the ad in the box while the buyer says what it is
      await r.check(true); // the "Checking…" steps, in real time, while "checks the ad against real data"
      await r.holdUntil(t0 + lines[2] - 0.3);
      await r.scrollTo(((await r.y("“Is the clutch the original")) ?? 456) - 110, 1.0);
      await r.holdUntil(t0 + lines[2] + 0.45 * (lines[3] - lines[2]));
      await r.scrollTo(((await r.y("If it’s the original and it slips")) ?? 820) - 420, 0.9); // the €700 tip
      await r.holdUntil(t0 + lines[3] - 0.3);
      await r.scrollTo(((await r.y("“Can I see the last inspection")) ?? 980) - 110, 1.0);
      await r.hold(s - (r.time - t0));
    },
  },
  {
    label: "What it really costs",
    lines: [
      {
        show: "Over two years, it really costs about €12,000.",
        say: "Over two years, it really costs about twelve thousand euros.",
      },
      { show: "When the seller replies, it writes my answer for me." },
      {
        show: "That's €700 in my pocket, before I even own the car.",
        say: "That's seven hundred euros in my pocket, before I even own the car.",
      },
    ],
    scene: async (r, s) => {
      const t0 = r.time;
      const lines = spokenSeconds(2);
      await r.scrollTo(((await r.y("What it really costs you")) ?? 2093) - 70, 1.2);
      await r.holdUntil(t0 + lines[1] - 0.5);
      await r.scrollTo(((await r.y("The seller replied?")) ?? 2745) - 60, 1.0);
      await r.hold(0.5);
      await r.click("#replyBtn", 900); // the page scrolls to the answer by itself
      await r.scrollTo(((await r.y("Your answer to the seller")) ?? 2745) - 40, 0.6);
      await r.holdUntil(t0 + lines[2] - 0.3);
      await r.scrollTo(((await r.y("You keep")) ?? 3100) - 420, 0.9);
      await r.hold(s - (r.time - t0));
    },
  },
  {
    label: "Who pays",
    lines: [
      { show: "Every what-if says who pays." },
      { show: "What if I crash? Covered with full kasko, after the excess.", marks: [["Covered with full kasko", "covered"]] },
      { show: "What if the gearbox breaks? That's not covered: I pay.", marks: [["not covered", "pay"]] },
    ],
    scene: async (r, s) => {
      const t0 = r.time;
      await r.scrollTo(((await r.y("What if something goes wrong")) ?? 3066) - 30, 1.0);
      await r.holdUntil(t0 + spokenAt(3, 1, "Covered") - 0.15); // ring each label as the voice says it
      await r.circle("Your own car is damaged in a crash", "covered");
      await r.holdUntil(t0 + spokenAt(3, 2, "not covered") - 0.15);
      await r.circle("It breaks down", "pay");
      await r.hold(s - (r.time - t0));
    },
  },
  {
    label: "A flat",
    lines: [
      {
        show: "Same for a home: if the pipe renovation starts next year, my share is about €51,600.",
        say: "Same for a home: if the pipe renovation starts next year, my share is about fifty-one thousand six hundred euros.",
      },
    ],
    scene: async (r, s) => {
      const t0 = r.time;
      await r.click("#backBtn");
      await r.hold(0.4);
      await r.click('[data-example="home"]');
      await r.hold(0.6);
      await r.check(false); // cut the wait this time
      await r.hold(1.0);
      await r.scrollTo(((await r.y("“Has the pipe renovation")) ?? 456) - 110, 1.0);
      await r.hold(s - (r.time - t0));
    },
  },
  {
    label: "How you use it",
    lines: [
      {
        show: "All you do is paste the text from the ad, or attach up to 4 screenshots.",
        say: "All you do is paste the text from the ad, or attach up to four screenshots.",
      },
      { show: "It asks before anything is sent." },
      {
        show: "Our own AI model reads it, and every fact has to quote the ad.",
        say: "Our own A.I. model reads it, and every fact has to quote the ad.",
      },
    ],
    scene: async (r, s) => {
      const t0 = r.time;
      const lines = spokenSeconds(5);
      await r.click("#backBtn");
      await r.click("#clearBtn");
      await r.holdUntil(t0 + spokenAt(5, 0, "or attach") - 0.1); // the empty box while "paste the text"
      await r.dropScreenshots([
        join(root, "pitch", "demo", "moped-screenshot-1.png"),
        join(root, "pitch", "demo", "moped-screenshot-2.png"),
      ]);
      await r.holdUntil(t0 + lines[2] - 0.5); // the check stays up while "it asks before anything is sent"
      await r.click("#shotSend", 0);
      await r.hold(0.6);
      await r.waitForResult();
      await r.hold(1.4);
      await r.scrollTo(((await r.y("What if something goes wrong")) ?? 1200) - 30, 1.0);
      await r.hold(s - (r.time - t0));
    },
  },
  {
    label: "Why If wins",
    lines: [
      { show: "For If, the check is free, and it reaches people right when they need insurance." },
      { show: "The quote comes already filled in, so winning that customer costs almost nothing." },
      {
        show: "After signing, If customers get reminders that prevent claims, a logbook (huoltokirja) for the car or home, and a guarantee behind every who-pays label.",
        say: "After signing, If customers get reminders that prevent claims, a logbook for the car or the home, and a guarantee behind every who-pays label.",
      },
      { show: "So they stay longer, add a policy at every life event, and claim less: the customers who bring If the most money." },
    ],
    scene: async (r, s) => {
      const t0 = r.time;
      const lines = spokenSeconds(6);
      await r.click("#backBtn");
      await r.click('[data-example="car"]');
      await r.check(false);
      await r.scrollTo(((await r.y("Drive it home")) ?? 4459) - 40, 0.04); // straight to the hand-over to If
      await r.holdUntil(t0 + lines[2] - 0.4);
      await r.scrollTo(((await r.y("After you buy")) ?? 3786) - 40, 1.2); // the reminders that prevent claims
      await r.hold(s - (r.time - t0));
    },
  },
  {
    label: "",
    card: "end",
    lines: [{ show: "", say: "What if. See the what-ifs before you sign." }],
    scene: async (r, s) => r.hold(s),
  },
];

// Seconds from a segment's start to the start of each of its lines, for scenes that move with the voice.
let LINE_STARTS: number[][] = [];
const spokenSeconds = (segment: number) => LINE_STARTS[segment] ?? [];
// About when, from the segment's start, the voice reaches `words` in a line: its share of the line's letters,
// close enough to time a ring or a drop.
let LINE_WORDS: { text: string; start: number; seconds: number }[][] = [];
const spokenAt = (segment: number, line: number, words: string) => {
  const l = LINE_WORDS[segment]?.[line];
  if (!l) return 0;
  return l.start + (Math.max(0, l.text.indexOf(words)) / l.text.length) * l.seconds;
};

// ---- voice ----

// format 1 is integer PCM (Piper), 3 is 32-bit float (Kokoro); silence is zeros in both.
type Wav = { format: number; channels: number; rate: number; bits: number; data: Buffer; seconds: number };

function readWav(file: string): Wav {
  const b = readFileSync(file);
  let p = 12;
  let fmt: Omit<Wav, "data" | "seconds"> | null = null;
  while (p + 8 <= b.length) {
    const id = b.toString("ascii", p, p + 4);
    const size = b.readUInt32LE(p + 4);
    if (id === "fmt ")
      fmt = { format: b.readUInt16LE(p + 8), channels: b.readUInt16LE(p + 10), rate: b.readUInt32LE(p + 12), bits: b.readUInt16LE(p + 22) };
    if (id === "data" && fmt) {
      const data = b.subarray(p + 8, p + 8 + size);
      return { ...fmt, data, seconds: data.length / (fmt.rate * fmt.channels * (fmt.bits / 8)) };
    }
    p += 8 + size + (size % 2);
  }
  throw new Error(`${file}: not a PCM WAV`);
}

function writeWav(file: string, w: Omit<Wav, "data" | "seconds">, pcm: Buffer) {
  const h = Buffer.alloc(44);
  const block = w.channels * (w.bits / 8);
  h.write("RIFF", 0);
  h.writeUInt32LE(36 + pcm.length, 4);
  h.write("WAVEfmt ", 8);
  h.writeUInt32LE(16, 16);
  h.writeUInt16LE(w.format, 20);
  h.writeUInt16LE(w.channels, 22);
  h.writeUInt32LE(w.rate, 24);
  h.writeUInt32LE(w.rate * block, 28);
  h.writeUInt16LE(block, 32);
  h.writeUInt16LE(w.bits, 34);
  h.write("data", 36);
  h.writeUInt32LE(pcm.length, 40);
  writeFileSync(file, Buffer.concat([h, pcm]));
}

// Each voiced line is kept in out/voice under its voice, speed and words, so a run voices only the lines that
// changed. New lines are voiced in the work folder first, so a failed run leaves no half-written file behind.
const voiceDir = join(out, "voice");
const voiceFile = (text: string) =>
  join(
    voiceDir,
    `${createHash("sha256")
      .update(JSON.stringify([voice, speed, text]))
      .digest("hex")
      .slice(0, 24)}.wav`,
  );

// Every line voiced at once (Kokoro loads its model once); null for each line with --voice none.
function speakAll(texts: string[]): (Wav | null)[] {
  if (voice === "none") return texts.map(() => null);
  mkdirSync(voiceDir, { recursive: true });
  const todo = [...new Set(texts)]
    .filter((t) => !existsSync(voiceFile(t)))
    .map((text, i) => ({ text, file: join(work, `voice-${i}.wav`) }));
  console.log(`voicing ${todo.length} of ${texts.length} lines (the rest are kept from earlier runs)`);
  if (todo.length && voice.startsWith("kokoro:")) {
    const say = process.env.KOKORO;
    if (!say) throw new Error("set KOKORO to the say.mjs that runs kokoro-js, or use --voice none");
    const batch = join(work, "lines.json");
    writeFileSync(batch, JSON.stringify(todo.map((l) => ({ voice: voice.slice(7), text: l.text, out: l.file, speed }))));
    execFileSync(process.execPath, [say, "--batch", batch], { cwd: join(say, ".."), stdio: ["ignore", "ignore", "inherit"] });
  } else if (todo.length) {
    const piper = process.env.PIPER;
    const voices = process.env.PIPER_VOICES;
    if (!piper || !voices) throw new Error("set PIPER and PIPER_VOICES, or use --voice none");
    for (const l of todo) {
      execFileSync(
        piper,
        [
          "--model",
          join(voices, `${voice}.onnx`),
          "--output_file",
          l.file,
          "--length_scale",
          String(1 / speed),
          "--sentence_silence",
          "0.2",
        ],
        {
          input: `${l.text}\n`,
          stdio: ["pipe", "ignore", "ignore"],
        },
      );
    }
  }
  for (const l of todo) copyFileSync(l.file, voiceFile(l.text));
  return texts.map((t) => readWav(voiceFile(t)));
}

// ---- the site, frame by frame ----

class Recorder {
  cdp: Cdp;
  dir: string;
  frames: { file: string; dur: number }[] = [];
  n = 0;
  constructor(cdp: Cdp, dir: string) {
    this.cdp = cdp;
    this.dir = dir;
  }
  get time() {
    return this.frames.reduce((s, f) => s + f.dur, 0);
  }
  js<T>(expression: string) {
    return this.cdp.evaluate<T>(expression);
  }
  async shot() {
    const r = (await this.cdp.send("Page.captureScreenshot", { format: "jpeg", quality: 90 })) as { data: string };
    const file = join(this.dir, `f${String(++this.n).padStart(5, "0")}.jpg`);
    writeFileSync(file, Buffer.from(r.data, "base64"));
    return file;
  }
  async hold(seconds: number) {
    if (seconds > 0.02) this.frames.push({ file: await this.shot(), dur: seconds });
  }
  async holdUntil(time: number) {
    await this.hold(time - this.time);
  }
  // "Check this ad": the example's "Checking…" steps, filmed in real time, or cut.
  async check(film: boolean) {
    await this.click("#checkBtn", 0);
    const done = `!!document.getElementById("backBtn")`;
    let last = Date.now();
    for (let i = 0; i < 400 && !(await this.js<boolean>(done)); i++) {
      if (!film) {
        await sleep(100);
        continue;
      }
      const file = await this.shot();
      const now = Date.now();
      if (this.frames.length && this.frames[this.frames.length - 1].dur === 0)
        this.frames[this.frames.length - 1].dur = (now - last) / 1000;
      this.frames.push({ file, dur: 0 });
      last = now;
    }
    if (this.frames.length && this.frames[this.frames.length - 1].dur === 0)
      this.frames[this.frames.length - 1].dur = Math.max(0.04, (Date.now() - last) / 1000);
    await sleep(450);
  }
  // Clicks, then waits for the page's 0.22 s view animation, so no frame is caught halfway.
  async click(selector: string, settle = 450) {
    const ok = await this.js<boolean>(
      `(() => { const el = document.querySelector(${JSON.stringify(selector)}); if (!el) return false; el.click(); return true; })()`,
    );
    if (!ok) throw new Error(`nothing to click at ${selector}`);
    await sleep(settle);
  }
  // The page y of the first element whose text starts with `text`.
  y(text: string) {
    return this.js<number | null>(`(() => {
      const el = [...document.querySelectorAll("p, h1, h2, h3, li, span, dt, button, strong")].find((e) => e.textContent.trim().startsWith(${JSON.stringify(text)}));
      return el ? Math.round(el.getBoundingClientRect().top + window.scrollY) : null;
    })()`);
  }
  async scrollTo(target: number, seconds: number) {
    const from = await this.js<number>("window.scrollY");
    const max = await this.js<number>("document.documentElement.scrollHeight - window.innerHeight");
    const to = Math.max(0, Math.min(max, target));
    const steps = Math.max(1, Math.round(seconds * FPS));
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const e = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
      await this.js(`window.scrollTo({ top: ${Math.round(from + (to - from) * e)}, behavior: "instant" })`);
      this.frames.push({ file: await this.shot(), dur: 1 / FPS });
    }
  }
  // Rings the who-pays label of a "What if something goes wrong" item, drawn like a pen stroke one frame at a
  // time. The ring lives inside the item, so it is gone when the page changes.
  async circle(item: string, tone: Tone, seconds = 0.5) {
    const ok = await this.js<boolean>(`(() => {
      const li = [...document.querySelectorAll(".cover li")].find((l) => l.querySelector(".what")?.textContent.startsWith(${JSON.stringify(item)}));
      const chip = li?.querySelector(".who");
      if (!chip) return false;
      const c = chip.getBoundingClientRect(), o = li.getBoundingClientRect();
      const pad = 7, m = 6, w = c.width + 2 * pad, h = c.height + 2 * pad, r = h / 2;
      const ns = "http://www.w3.org/2000/svg";
      const svg = document.createElementNS(ns, "svg");
      svg.setAttribute("width", w + 2 * m);
      svg.setAttribute("height", h + 2 * m);
      svg.style.cssText = "position:absolute; pointer-events:none; overflow:visible; transform:rotate(-1.2deg); left:" + (c.left - o.left - pad - m) + "px; top:" + (c.top - o.top - pad - m) + "px";
      const p = document.createElementNS(ns, "path");
      // Around the label and a little past where it started, as a hand would.
      p.setAttribute("d", "M" + (m + r) + " " + m + " H" + (m + w - r) + " A" + r + " " + r + " 0 0 1 " + (m + w - r) + " " + (m + h) + " H" + (m + r) + " A" + r + " " + r + " 0 0 1 " + (m + r) + " " + m + " l34 -4");
      p.setAttribute("fill", "none");
      p.setAttribute("stroke", ${JSON.stringify(TONE[tone])});
      p.setAttribute("stroke-width", "3.2");
      p.setAttribute("stroke-linecap", "round");
      svg.appendChild(p);
      li.style.position = "relative";
      li.appendChild(svg);
      window.__pen = p;
      window.__penLength = p.getTotalLength();
      p.style.strokeDasharray = window.__penLength;
      p.style.strokeDashoffset = window.__penLength;
      return true;
    })()`);
    if (!ok) throw new Error(`no who-pays label for "${item}" on the page`);
    const steps = Math.max(1, Math.round(seconds * FPS));
    for (let i = 1; i <= steps; i++) {
      const left = (1 - i / steps) ** 2; // quick at first, slow at the end
      await this.js(`window.__pen.style.strokeDashoffset = window.__penLength * ${left.toFixed(4)}`);
      this.frames.push({ file: await this.shot(), dur: 1 / FPS });
    }
  }
  // Drops pictures on the form as a person would drag them from the desktop.
  async dropScreenshots(files: string[]) {
    const data = files.map((f) => readFileSync(f).toString("base64"));
    await this.js(`(async () => {
      const files = ${JSON.stringify(data)}.map((b, i) => new File([Uint8Array.from(atob(b), (c) => c.charCodeAt(0))], "Screenshot " + (i + 1) + ".png", { type: "image/png" }));
      const dt = new DataTransfer();
      for (const f of files) dt.items.add(f);
      const form = document.getElementById("checkForm");
      form.dispatchEvent(new DragEvent("dragenter", { dataTransfer: dt, bubbles: true, cancelable: true }));
      form.dispatchEvent(new DragEvent("drop", { dataTransfer: dt, bubbles: true, cancelable: true }));
    })()`);
    for (let i = 0; i < 40; i++) {
      if (await this.js<boolean>(`!!document.getElementById("shotSend")`)) return sleep(450);
      await sleep(250);
    }
    throw new Error("the screenshot check did not open");
  }
  // The AI's answer, in real time; the wait is cut from the video.
  async waitForResult() {
    for (let i = 0; i < 160; i++) {
      const state = await this.js<string>(
        `document.querySelector("#screen .notice")?.textContent?.includes("couldn’t read") ? "failed" : document.getElementById("backBtn") ? "done" : "waiting"`,
      );
      if (state === "done") return sleep(450);
      if (state === "failed") throw new Error("the AI reader could not read the screenshots: is Aapo's server up?");
      await sleep(250);
    }
    throw new Error("no answer from the AI reader within 40 s");
  }
}

// ---- captions, cards and the phone frame, drawn by Chrome in the page's own font ----

const html = readFileSync(join(root, "apps", "what-if", "index.html"), "utf8");
const FONT = (html.match(/@font-face\s*\{[^}]*\}/) ?? [""])[0];
const INK = "#331e11";
const BLUE = "#0054f0";
const GROUND = "#f6f2ee";
const PHONE = { x: 336, y: 98, w: 408, h: 884, bezel: 14, radius: 46 }; // even sizes for H.264
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
const page = (body: string, background = "transparent") => `<!doctype html><meta charset="utf-8"><style>${FONT}
  html, body { margin: 0; width: 1920px; height: 1080px; background: ${background}; overflow: hidden; }
  body { font-family: "Figtree", "Segoe UI", sans-serif; color: ${INK}; position: relative; }
  .mark { font-weight: 800; letter-spacing: -0.02em; }
  .mark b { color: ${BLUE}; }
</style>${body}`;

// The phone's frame: the ground all round, with a hole where the phone shows through.
const frameBody = `
  <div style="position:absolute; left:${PHONE.x}px; top:${PHONE.y}px; width:${PHONE.w}px; height:${PHONE.h}px; border-radius:${PHONE.radius}px; box-shadow: 0 0 0 4000px ${GROUND};"></div>
  <div style="position:absolute; left:${PHONE.x - PHONE.bezel}px; top:${PHONE.y - PHONE.bezel}px; width:${PHONE.w + 2 * PHONE.bezel}px; height:${PHONE.h + 2 * PHONE.bezel}px;
    box-sizing:border-box; border:${PHONE.bezel}px solid ${INK}; border-radius:${PHONE.radius + PHONE.bezel}px; box-shadow: 0 28px 70px rgba(51,30,17,.22);"></div>
  <div class="mark" style="position:absolute; left:80px; top:56px; font-size:44px;">What if<b>…</b></div>
  <div style="position:absolute; left:80px; bottom:52px; font-size:26px; color:#74655a;">what-if.what-if.workers.dev</div>`;

// The frame with one line's caption beside the phone, as one picture.
const plateHtml = (label: string, line: Line) => {
  const size = line.show.length > 130 ? 46 : line.show.length > 80 ? 52 : 58;
  let text = esc(line.show);
  for (const [words, tone] of line.marks ?? [])
    text = text.replace(esc(words), `<span style="color:${TONE[tone]}; font-weight:800;">${esc(words)}</span>`);
  return page(`${frameBody}
  <div style="position:absolute; left:860px; right:120px; top:0; bottom:0; display:flex; flex-direction:column; justify-content:center; gap:22px;">
    ${label ? `<div style="font-size:30px; font-weight:700; color:${BLUE}; letter-spacing:0.02em;">${esc(label)}</div>` : ""}
    <div style="font-size:${size}px; font-weight:600; line-height:1.22;">${text}</div>
  </div>`);
};

const cardHtml = (kind: "title" | "end", text: string) =>
  page(
    `<div style="position:absolute; inset:0; display:flex; flex-direction:column; justify-content:center; padding:0 160px; gap:28px;">
    <div class="mark" style="font-size:150px; line-height:1;">What if<b>…</b></div>
    <div style="font-size:58px; font-weight:600;">See the what-ifs before you sign.</div>
    ${kind === "end" ? `<div style="font-size:52px; font-weight:700; color:${BLUE};">what-if.what-if.workers.dev</div>` : ""}
    ${text ? `<div style="margin-top:36px; font-size:40px; font-weight:500; color:#74655a; max-width:1500px;">${esc(text)}</div>` : ""}
  </div>
  <div style="position:absolute; left:160px; bottom:70px; font-size:28px; color:#74655a;">${
    kind === "end"
      ? "Artem, Aapo and Vaishnav · JunctionX Turku 2026 · If Insurance Could Do More"
      : "JunctionX Turku 2026 · If Insurance Could Do More"
  }</div>`,
    GROUND,
  );

// Each picture page carries its own name, so the screenshot waits for that page, never the one before it.
async function render(cdp: Cdp, name: string, markup: string) {
  const file = join(work, `${name}.html`);
  writeFileSync(file, markup.replace('<meta charset="utf-8">', `<meta charset="utf-8"><meta name="card" content="${name}">`));
  await cdp.send("Page.navigate", { url: `file:///${fwd(file)}` });
  for (let i = 0; i < 100; i++) {
    const ready = await cdp
      .evaluate<boolean>(
        `document.readyState === "complete" && document.querySelector('meta[name="card"]')?.content === ${JSON.stringify(name)}`,
      )
      .catch(() => false);
    if (ready) break;
    await sleep(50);
  }
  await cdp.evaluate("document.fonts.ready.then(() => true)");
  await sleep(60);
  const r = (await cdp.send("Page.captureScreenshot", { format: "png" })) as { data: string };
  const png = join(work, `${name}.png`);
  writeFileSync(png, Buffer.from(r.data, "base64"));
  return png;
}

// ---- putting it together ----

async function main() {
  for (const old of existsSync(out) ? readdirSync(out).filter((d) => /^work(-\d+)?$/.test(d)) : []) {
    try {
      rmSync(join(out, old), { recursive: true, force: true });
    } catch {} // still open somewhere: left for next time
  }
  mkdirSync(join(work, "frames"), { recursive: true });

  const began = Date.now();
  const lap = (what: string) => console.log(`${what} (${((Date.now() - began) / 1000).toFixed(0)} s in)`);

  // 1. The voice, line by line; the timing follows it.
  const lines = SEGMENTS.flatMap((seg, si) => seg.lines.map((line) => ({ seg: si, line })));
  const wavs = speakAll(lines.map((l) => l.line.say ?? l.line.show));
  const spoken = lines.map((l, i) => {
    const words = (l.line.say ?? l.line.show).split(/\s+/).length;
    return { ...l, wav: wavs[i], seconds: wavs[i] ? (wavs[i] as Wav).seconds : words / 2.5 + 0.3 };
  });
  const segSeconds = SEGMENTS.map((_, si) => spoken.filter((l) => l.seg === si).reduce((s, l) => s + l.seconds + LINE_GAP, 0) + SEG_GAP);
  LINE_WORDS = SEGMENTS.map((_, si) => {
    let at = 0;
    return spoken
      .filter((l) => l.seg === si)
      .map((l) => {
        const start = at;
        at += l.seconds + LINE_GAP;
        return { text: l.line.say ?? l.line.show, start, seconds: l.seconds };
      });
  });
  LINE_STARTS = LINE_WORDS.map((seg) => seg.map((l) => l.start));
  const voiced = segSeconds.reduce((a, b) => a + b, 0);
  lap(`voice ${voice}: ${voiced.toFixed(1)} s of speech and pauses`);
  // --plan: each line's length, then stop; for fitting the script under 2:00 without filming.
  if (process.argv.includes("--plan")) {
    for (const l of spoken) console.log(`  ${l.seconds.toFixed(1).padStart(4)}  ${l.line.say ?? l.line.show}`);
    return;
  }
  // Too long already: stop before filming anything.
  if (voiced > LIMIT) throw new Error(`the voice alone is ${voiced.toFixed(1)} s, over ${LIMIT} s: shorten a line or raise --speed`);

  // 2. The site, segment by segment, each as long as its lines (or longer, if the site needs it).
  const { cdp, close } = await launchChrome(9341);
  const recorder = new Recorder(cdp, join(work, "frames"));
  const actual: number[] = [];
  try {
    await cdp.send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
    await cdp.send("Page.navigate", { url: SITE });
    await cdp.evaluate(LOADED);
    await sleep(800);
    for (const [si, seg] of SEGMENTS.entries()) {
      const before = recorder.time;
      await seg.scene(recorder, segSeconds[si]);
      actual.push(recorder.time - before);
      console.log(`  ${(seg.label || seg.card) ?? ""}: ${actual[si].toFixed(1)} s of picture for ${segSeconds[si].toFixed(1)} s of voice`);
    }
    lap(`filmed ${recorder.n} frames`);

    // 3. One picture per line at 1920×1080: the frame with that line's caption, or a title card.
    await cdp.send("Emulation.setDeviceMetricsOverride", { width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false });
    await cdp.send("Emulation.setDefaultBackgroundColorOverride", { color: { r: 0, g: 0, b: 0, a: 0 } });
    const plates: { png: string; start: number; end: number }[] = [];
    let t = 0;
    for (const [si, seg] of SEGMENTS.entries()) {
      const segStart = t;
      const own = spoken.filter((l) => l.seg === si);
      for (const [i, l] of own.entries()) {
        const png = await render(cdp, `plate-${si}-${i}`, seg.card ? cardHtml(seg.card, l.line.show) : plateHtml(seg.label, l.line));
        plates.push({ png, start: t, end: 0 });
        t += l.seconds + LINE_GAP;
      }
      t = segStart + Math.max(segSeconds[si], actual[si]); // the picture may run a little longer than the voice
    }
    plates.forEach((p, i) => {
      p.end = plates[i + 1]?.start ?? t;
    });
    // The script with each line's start.
    const mmss = (x: number) => `${Math.floor(x / 60)}:${(x % 60).toFixed(1).padStart(4, "0")}`;
    writeFileSync(
      join(out, "script.txt"),
      spoken
        .map((l, i) => `${mmss(plates[i].start)}  ${SEGMENTS[l.seg].label || SEGMENTS[l.seg].card}\n       ${l.line.say ?? l.line.show}`)
        .join("\n\n") + `\n\nEnds at ${mmss(t)}.\n`,
    );
    lap(`drew ${plates.length} captions and cards`);

    // 4. The sound: each line where its caption starts, silence between.
    const total = t;
    if (voice !== "none") {
      const first = spoken.find((l) => l.wav)?.wav as Wav;
      const bytesPerSecond = first.rate * first.channels * (first.bits / 8);
      const block = first.channels * (first.bits / 8);
      const pcm = Buffer.alloc(Math.ceil((total * bytesPerSecond) / block) * block);
      spoken.forEach((l, i) => {
        const at = Math.round((plates[i].start * bytesPerSecond) / block) * block;
        l.wav?.data.copy(pcm, at, 0, Math.min(l.wav.data.length, pcm.length - at));
      });
      writeWav(join(work, "voice.wav"), first, pcm);
    }

    // 5. ffmpeg, once. The phone's frames go on a fixed 25 fps clock (ffmpeg's playlist mode drops held
    //    pictures), and each line's picture lies over them in its turn. Each picture is one image that the
    //    overlay holds, so it is read once, not once per frame of the video.
    const run = (args: string[]) => execFileSync(ffmpeg, ["-y", "-hide_banner", "-loglevel", "error", ...args], { stdio: "inherit" });
    const T = total.toFixed(2);

    // The phone: each recorded frame linked once per video frame it lasts; a segment shorter than its voice
    // holds its last frame.
    const seq = join(work, "seq");
    mkdirSync(seq, { recursive: true });
    let n = 0;
    let clock = 0;
    let k = 0;
    const put = (file: string, seconds: number) => {
      const from = Math.round(clock * FPS);
      clock += seconds;
      for (let f = from; f < Math.round(clock * FPS); f++) {
        const to = join(seq, `p${String(++n).padStart(6, "0")}.jpg`);
        try {
          linkSync(file, to);
        } catch {
          copyFileSync(file, to);
        }
      }
    };
    for (const [si] of SEGMENTS.entries()) {
      let got = 0;
      let last = "";
      while (got < actual[si] - 1e-6 && k < recorder.frames.length) {
        put(recorder.frames[k].file, recorder.frames[k].dur);
        got += recorder.frames[k].dur;
        last = recorder.frames[k].file;
        k++;
      }
      const want = Math.max(segSeconds[si], actual[si]);
      if (want > got + 0.02 && last) put(last, want - got);
    }
    // The phone placed on the ground, then each line's picture switched on at its start and off at its end.
    const mp4 = join(out, "what-if-pitch.mp4");
    const chain = plates
      .map(
        (p, i) =>
          `[${i ? `v${i}` : "phone"}][${i + 1}:v]overlay=0:0:enable='gte(t,${p.start.toFixed(3)})*lt(t,${p.end.toFixed(3)})'[v${i + 1}]`,
      )
      .join(";");
    run([
      "-framerate",
      String(FPS),
      "-i",
      join(seq, "p%06d.jpg"),
      ...plates.flatMap((p) => ["-i", p.png]),
      ...(voice !== "none" ? ["-i", join(work, "voice.wav")] : []),
      "-filter_complex",
      `[0:v]scale=${PHONE.w}:${PHONE.h}:flags=lanczos,format=yuv420p,pad=1920:1080:${PHONE.x}:${PHONE.y}:color=0xf6f2ee[phone];${chain};[v${plates.length}]format=yuv420p[v]`,
      "-map",
      "[v]",
      ...(voice !== "none" ? ["-map", `${plates.length + 1}:a`, "-c:a", "aac", "-b:a", "160k"] : ["-an"]),
      "-t",
      T,
      "-r",
      String(FPS),
      "-c:v",
      "libx264",
      "-preset",
      "fast",
      "-crf",
      "18",
      "-movflags",
      "+faststart",
      mp4,
    ]);
    lap("put it together");
    console.log(`\n${mp4}\n${total.toFixed(1)} s${total > LIMIT ? `: OVER ${LIMIT} s, shorten a line or raise --speed` : ", under 2:00"}`);
  } finally {
    await close();
  }
}

if (!existsSync(join(root, "pitch", "demo", "moped-screenshot-1.png"))) throw new Error("pitch/demo/moped-screenshot-*.png are missing");
await main();
