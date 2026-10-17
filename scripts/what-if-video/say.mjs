// Speaks text with Kokoro (open weights, Apache-2.0) on this computer into WAV files, for build.ts (D-030).
// Copy this file to a folder of its own, run `npm install kokoro-js@1.2.1` there, and point KOKORO at the
// copy. The first run downloads the model from Hugging Face.
//   node say.mjs --batch lines.json                  [{ voice, text, out, speed? }, …], one model load
//   node say.mjs --samples <dir> "text" v1 v2 ...     the same text in several voices
import { readFileSync } from "node:fs";
import { KokoroTTS } from "kokoro-js";

const tts = await KokoroTTS.from_pretrained("onnx-community/Kokoro-82M-v1.0-ONNX", { dtype: "q8", device: "cpu" });
const [a, b, c, ...rest] = process.argv.slice(2);
if (a === "--batch") {
  for (const line of JSON.parse(readFileSync(b, "utf8"))) {
    const audio = await tts.generate(line.text, { voice: line.voice, speed: line.speed ?? 1 });
    audio.save(line.out);
    console.log("wrote", line.out);
  }
} else if (a === "--samples") {
  for (const voice of rest) {
    const audio = await tts.generate(c, { voice });
    audio.save(`${b}/voice-sample-kokoro-${voice}.wav`);
    console.log("wrote", voice);
  }
}
