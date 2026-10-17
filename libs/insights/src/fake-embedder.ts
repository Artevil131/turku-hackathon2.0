// A fake embedder for tests, after libs/detect/src/detector.test.ts: each
// event's prototypes sit on their own axis, ordinary life on another, and a
// snippet picks an axis by a keyword ("move 0.9", or Finnish words a
// synthetic phone uses) with a strength. Texts that match nothing become a
// hashed bag of words in the remaining dimensions, so clusters and novelty
// have real structure to find. No model is loaded.

import type { Embedder } from "@ahead/contract";
import { ordinary, prototypes } from "@ahead/detect";

export const AXES = ["move", "first_car", "long_trip", "child", "pet", "renovation", "ordinary"] as const;
export const DIM = 64;

const KEYWORDS: [RegExp, (typeof AXES)[number]][] = [
  [/muutt|vuokrasopimus|sähkösopimus|irtisanomis|asuntohakemus|yo-kylä/i, "move"],
  [/nettiauto|yaris|fabia|koeajo|laakkonen|auton vakuutus|autosi/i, "first_car"],
  [/lisbon|erasmus|exchange|booking confirmation|learning agreement/i, "long_trip"],
];

function unit(axis: number, strength = 1): Float32Array {
  const v = new Float32Array(DIM).fill((1 - strength) / Math.sqrt(DIM));
  v[axis] = (v[axis] ?? 0) + strength;
  return normalise(v);
}

function normalise(v: Float32Array): Float32Array {
  let n = 0;
  for (const x of v) n += x * x;
  n = Math.sqrt(n);
  return n > 0 ? v.map((x) => x / n) : v;
}

function hash(word: string): number {
  let h = 2166136261;
  for (const c of word) h = Math.imul(h ^ (c.codePointAt(0) ?? 0), 16777619);
  return (h >>> 0) % (DIM - AXES.length);
}

function bagOfWords(text: string): Float32Array {
  const v = new Float32Array(DIM);
  for (const w of text.toLowerCase().split(/[^\p{L}\p{N}]+/u)) {
    if (w.length < 2) continue;
    const i = AXES.length + hash(w);
    v[i] = (v[i] ?? 0) + 1;
  }
  return normalise(v);
}

export const fake: Embedder = {
  id: "fake",
  dim: DIM,
  async embed(texts) {
    return texts.map((t) => {
      for (const [i, axis] of AXES.entries()) if (axis !== "ordinary" && prototypes[axis].includes(t)) return unit(i, 1);
      if (ordinary.includes(t)) return unit(AXES.indexOf("ordinary"), 1);
      const [axis, s] = t.split(" ");
      const i = AXES.indexOf(axis as (typeof AXES)[number]);
      if (i >= 0 && s !== undefined && !Number.isNaN(Number(s))) return unit(i, Number(s));
      for (const [re, name] of KEYWORDS) if (re.test(t)) return unit(AXES.indexOf(name), 0.9);
      return bagOfWords(t);
    });
  },
};
