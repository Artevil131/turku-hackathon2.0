import { expect, test } from "vitest";
import { today } from "./today.ts";

test("?today= pins the date (A's report: an unescaped pattern once ignored it)", () => {
  expect(today("?engine=core&today=2026-10-17")).toBe("2026-10-17");
});

test("a malformed ?today= falls back to the real date", () => {
  const real = new Date().toISOString().slice(0, 10);
  expect(today("?today=17.10.2026")).toBe(real);
  expect(today("")).toBe(real);
});
