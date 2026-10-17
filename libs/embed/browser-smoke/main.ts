// Browser smoke test for the embedder: loads e5 in this browser (WASM or
// WebGPU), embeds the student phone's window, and posts timings to the
// runner. Open it on a phone over the LAN to measure there.
import phone from "../../../data/synthetic/student.json";
import { embedder, useLocalModels } from "../src/index.ts";

const log = document.getElementById("log") as HTMLPreElement;
const say = (s: string) => {
  log.textContent += `\n${s}`;
  console.log(s);
};

const params = new URLSearchParams(location.search);
const local = params.get("local") === "1";
if (local) useLocalModels("/models/");
const texts = (phone.snippets as { text: string; date: string }[]).filter((s) => s.date >= "2026-08-18").map((s) => s.text);
const result: Record<string, unknown> = { ua: navigator.userAgent, local, n: texts.length, webgpu: "gpu" in navigator };

try {
  let last = "";
  const emb = embedder("e5", (p) => {
    const line = `${p.status} ${p.file ?? ""} ${p.progress ? `${Math.round(p.progress)}%` : ""}`;
    if (line !== last) {
      last = line;
      say(line);
    }
  });
  let t = performance.now();
  await emb.embed(["warm up"]);
  result.loadMs = Math.round(performance.now() - t);
  say(`loaded in ${result.loadMs} ms`);
  t = performance.now();
  const v = await emb.embed(texts);
  result.embedMs = Math.round(performance.now() - t);
  result.dim = v[0]?.length;
  say(`embedded ${texts.length} snippets in ${result.embedMs} ms (${Math.round((result.embedMs as number) / texts.length)} ms each)`);
  t = performance.now();
  await emb.embed(texts.slice(0, 20));
  result.secondMs = Math.round(performance.now() - t);
  say(`second batch of 20 in ${result.secondMs} ms`);
} catch (e) {
  result.error = String(e);
  say(`ERROR ${String(e)}`);
}
await fetch("/result", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(result) });
say("done");
