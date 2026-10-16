import { describe, expect, it } from "vitest";
import { generate } from "./generate.ts";
import { personas, student } from "./personas.ts";

describe("synthetic phones", () => {
  it("is deterministic", () => {
    expect(generate(student)).toEqual(generate(student));
  });
  it("contains every planted signal and every trap", () => {
    for (const p of personas) {
      const texts = new Set(generate(p).snippets.map((s) => s.text));
      for (const x of [...p.planted, ...p.traps]) expect(texts.has(x.text.slice(0, 300))).toBe(true);
    }
  });
  it("has unique ids and dates within or after the span", () => {
    for (const p of personas) {
      const phone = generate(p);
      expect(new Set(phone.snippets.map((s) => s.id)).size).toBe(phone.snippets.length);
      for (const s of phone.snippets) expect(s.date >= p.from).toBe(true);
    }
  });
});
