import type { Snippet } from "@ahead/contract";
import { describe, expect, it } from "vitest";
import { changePoints, frequentWords, newNames, recurring } from "./novelty.ts";

const bank = (id: string, date: string, text: string): Snippet => ({ id, source: "bank", date, text, meta: { amountBand: "10-50" } });
const mail = (id: string, date: string, from: string): Snippet => ({ id, source: "mail", date, text: `From ${from}`, meta: { from } });

describe("recurring", () => {
  it("finds a monthly payment and its interval", () => {
    const s = [
      bank("a", "2026-07-01", "Vuokra"),
      bank("b", "2026-08-01", "Vuokra"),
      bank("c", "2026-09-01", "Vuokra"),
      bank("d", "2026-10-01", "Vuokra"),
    ];
    const [r] = recurring(s, "2026-10-17");
    expect(r).toMatchObject({ source: "bank", name: "Vuokra", intervalDays: 31, occurrences: 4, lastDate: "2026-10-01" });
    expect(r?.anomaly).toBeUndefined();
  });
  it("ignores names seen fewer than three times or at ragged intervals", () => {
    expect(recurring([bank("a", "2026-09-01", "X"), bank("b", "2026-10-01", "X")], "2026-10-17")).toEqual([]);
    const ragged = [bank("a", "2026-07-01", "Y"), bank("b", "2026-07-03", "Y"), bank("c", "2026-09-30", "Y"), bank("d", "2026-10-02", "Y")];
    expect(recurring(ragged, "2026-10-17")).toEqual([]);
  });
  it("flags a payment that stopped and one whose last gap changed", () => {
    const stopped = [bank("a", "2026-06-01", "Netflix"), bank("b", "2026-07-01", "Netflix"), bank("c", "2026-08-01", "Netflix")];
    expect(recurring(stopped, "2026-10-17")[0]?.anomaly).toBe("stopped");
    const changed = [
      bank("a", "2026-07-01", "Spotify"),
      bank("b", "2026-07-31", "Spotify"),
      bank("c", "2026-08-30", "Spotify"),
      bank("d", "2026-09-29", "Spotify"),
      bank("e", "2026-11-14", "Spotify"),
    ];
    expect(recurring(changed, "2026-11-15")[0]?.anomaly).toBe("changed");
  });
  it("uses the sender for mail", () => {
    const s = [mail("a", "2026-08-01", "DNA"), mail("b", "2026-09-01", "DNA"), mail("c", "2026-10-01", "DNA")];
    expect(recurring(s, "2026-10-17")[0]?.name).toBe("DNA");
  });
});

describe("newNames", () => {
  it("lists senders of this period not seen before, once each, in order", () => {
    const cur = [
      mail("a", "2026-10-01", "TYS"),
      mail("b", "2026-10-02", "Peppi"),
      mail("c", "2026-10-03", "TYS"),
      mail("d", "2026-10-04", "Finnair"),
    ];
    const prev = [mail("e", "2026-09-01", "Peppi")];
    expect(newNames(cur, prev, "mail")).toEqual(["TYS", "Finnair"]);
    expect(newNames(cur, prev, "bank")).toEqual([]);
  });
});

describe("changePoints", () => {
  it("finds per source the day activity jumped", () => {
    const s: Snippet[] = [];
    for (let i = 0; i < 60; i++) {
      const date = new Date(Date.UTC(2026, 7, 19 + i)).toISOString().slice(0, 10);
      s.push(bank(`b${i}`, date, "Lidl"));
      if (i >= 40) s.push(bank(`c${i}`, date, "Muuttopalvelu"), bank(`d${i}`, date, "Ikea"));
    }
    expect(changePoints(s, "2026-10-17")).toEqual([{ source: "bank", date: "2026-09-28", beforePerWeek: 7, afterPerWeek: 21 }]);
  });
});

describe("frequentWords", () => {
  it("drops short words, numbers and stopwords", () => {
    expect(frequentWords(["Tentti: Lineaarialgebra 2026", "Tentti: Tilastotiede I", "Lineaarialgebra luento ja harjoitukset"])).toEqual([
      "lineaarialgebra",
      "tentti",
      "harjoitukset",
    ]);
  });
});
