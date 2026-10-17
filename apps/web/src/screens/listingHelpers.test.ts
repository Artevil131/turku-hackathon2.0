import { describe, expect, it } from "vitest";
import { costBars, formatEuro, quoteParts } from "./listingHelpers.ts";

describe("ad quote highlighting", () => {
  it("finds all literal occurrences without changing the transcript", () => {
    const text = "Auto [hyvä]. AUTO [hyvä]. <script>";
    const parts = quoteParts(text, ["auto", "[hyvä]", "", "missing"]);
    expect(parts.map((part) => part.text).join("")).toBe(text);
    expect(parts.filter((part) => part.highlighted).map((part) => part.text)).toEqual(["Auto", "[hyvä]", "AUTO", "[hyvä]"]);
  });
  it("keeps overlapping quotes and the selected fact distinct", () => {
    const parts = quoteParts("Hieno asunto Turussa", ["Hieno asunto", "asunto Turussa"], "ASUNTO TURUSSA");
    expect(parts.map((part) => part.text).join("")).toBe("Hieno asunto Turussa");
    expect(
      parts
        .filter((part) => part.selected)
        .map((part) => part.text)
        .join(""),
    ).toBe("asunto Turussa");
    expect(parts.every((part) => part.highlighted)).toBe(true);
  });
  it("preserves original offsets after Unicode case expansion and emoji", () => {
    const parts = quoteParts("İ 🚗 AUTO", ["🚗", "auto"]);
    expect(parts.filter((part) => part.highlighted).map((part) => part.text)).toEqual(["🚗", "AUTO"]);
    expect(parts.map((part) => part.text).join("")).toBe("İ 🚗 AUTO");
  });
  it("handles Finnish case, duplicates, absent quotes and empty transcripts", () => {
    expect(quoteParts("ÖLJYLÄMMITYS", ["öljylämmitys", "öljylämmitys"])).toEqual([
      { start: 0, text: "ÖLJYLÄMMITYS", highlighted: true, selected: false },
    ]);
    expect(quoteParts("no evidence", ["missing"])[0]?.highlighted).toBe(false);
    expect(quoteParts("", ["missing"])).toEqual([]);
  });
});

describe("euro formatting", () => {
  it("uses euros and each language's separators without losing cents", () => {
    expect(formatEuro(12345.5, "en")).toBe("€12,345.5");
    expect(formatEuro(12345.5, "fi").replaceAll(" ", " ")).toBe("12 345,5 €");
    expect(formatEuro(0, "en")).toBe("€0");
  });
});

describe("cost chart scaling", () => {
  it("includes each year and uses one shared zero baseline", () => {
    const result = costBars({ from: 2026, to: 2028, byYear: { 2026: 500, 2028: 1000 } }, 120);
    expect(result.max).toBe(1000);
    expect(result.bars).toEqual([
      { year: 2026, eur: 500, height: 60 },
      { year: 2027, eur: 0, height: 0 },
      { year: 2028, eur: 1000, height: 120 },
    ]);
  });
  it("keeps zero-cost and empty series finite", () => {
    expect(costBars({ from: 2026, to: 2026, byYear: {} }, 120)).toEqual({ max: 0, bars: [{ year: 2026, eur: 0, height: 0 }] });
    expect(costBars({ from: 2027, to: 2026, byYear: {} }, 120)).toEqual({ max: 0, bars: [] });
  });
});
