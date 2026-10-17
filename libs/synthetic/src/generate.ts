import type { Snippet } from "@ahead/contract";
import { SNIPPET_MAX_CHARS } from "@ahead/contract";
import { addDays, daysBetween, fiDate, weekday } from "./dates.ts";
import type { Persona, TruthEvent } from "./personas.ts";
import { rng } from "./rng.ts";

export interface SyntheticPhone {
  persona: string;
  description: string;
  from: string;
  to: string;
  snippets: Snippet[];
  truth: TruthEvent[];
}

function fill(text: string, fills: Record<string, readonly string[]>, r: ReturnType<typeof rng>, date: string): string {
  return text.replace(/\{(\w+)\}/g, (_, key: string) => {
    if (key === "date") return fiDate(addDays(date, r.int(1, 10)));
    const xs = fills[key];
    return xs ? r.pick(xs) : key;
  });
}

/** Generates one persona's phone, deterministic by the persona's seed. */
export function generate(p: Persona): SyntheticPhone {
  const r = rng(p.seed);
  const days = daysBetween(p.from, p.to);
  const counters: Record<string, number> = {};
  const next = (source: string) => {
    counters[source] = (counters[source] ?? 0) + 1;
    return `${source}-${String(counters[source]).padStart(4, "0")}`;
  };
  const snippets: Snippet[] = [];

  for (const t of p.noise) {
    const perDay = t.rate / 30;
    for (let i = 0; i <= days; i++) {
      const date = addDays(p.from, i);
      if (t.weekdays && !t.weekdays.includes(weekday(date))) continue;
      // Poisson-ish: at most two per template per day.
      let n = 0;
      if (r.chance(perDay)) n++;
      if (r.chance(perDay * perDay)) n++;
      for (let k = 0; k < n; k++) {
        const s: Snippet = { id: next(t.source), source: t.source, date, text: fill(r.pick(t.texts), p.fills, r, date) };
        if (t.meta) s.meta = t.meta;
        // A calendar entry exists from the day it was made, up to two weeks before it happens.
        if (t.source === "calendar") s.meta = { ...s.meta, created: addDays(date, -r.int(0, 14)) };
        snippets.push(s);
      }
    }
  }
  for (const x of [...p.planted, ...p.traps]) {
    const s: Snippet = { id: next(x.source), source: x.source, date: x.date, text: x.text.slice(0, SNIPPET_MAX_CHARS) };
    if (x.meta) s.meta = x.meta;
    snippets.push(s);
  }
  snippets.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.id < b.id ? -1 : 1));
  return { persona: p.id, description: p.description, from: p.from, to: p.to, snippets, truth: p.truth };
}
