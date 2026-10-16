import type { DetectedEvent, EventType, JourneyContext } from "@ahead/contract";
import { mockMove } from "@ahead/contract/mock";
import type { FmiWarning } from "@ahead/opendata";
import { expect, test } from "vitest";
import { createBuilders } from "./index.ts";

const TODAY = "2026-10-17";

function ctx(event: DetectedEvent, locale: "fi" | "en" = "en", municipality?: string): JourneyContext {
  return { event, locale, municipality };
}

const frost: FmiWarning = {
  id: "urn:oid:frost-test-000000000001",
  sentAt: "2026-10-17T08:00:00+03:00",
  msgType: "Alert",
  eventCode: "coldWeather",
  severity: "Moderate",
  color: "yellow",
  onset: "2026-10-30T00:00:00+02:00",
  expires: "2026-11-02T00:00:00+02:00",
  regions: ["FI-19"],
  areas: ["Southwest Finland"],
  text: {
    fi: { event: "Pakkasvaroitus", headline: "Pakkasvaroitus", description: "Yöpakkasta." },
    en: { event: "Frost warning", headline: "Frost warning", description: "Night frost." },
  },
};

test("every card of every journey names its source, in both languages", async () => {
  const builders = createBuilders({ today: TODAY });
  for (const type of ["move", "first_car", "long_trip"] as EventType[]) {
    for (const locale of ["fi", "en"] as const) {
      const event: DetectedEvent = { ...mockMove, type };
      const journey = await builders[type]?.build(ctx(event, locale));
      expect(journey?.items.length).toBeGreaterThan(0);
      for (const it of journey?.items ?? []) {
        expect(it.sourceName, `${type}/${locale}/${it.id}`).toBeTruthy();
        expect(it.title).toBeTruthy();
        expect(it.body).toBeTruthy();
      }
    }
  }
});

test("move journey uses the DVV window and the move date", async () => {
  const j = await createBuilders({ today: TODAY }).move?.build(ctx(mockMove));
  const dvv = j?.items.find((i) => i.id === "dvv");
  expect(dvv?.due).toBe("2026-11-08");
  expect(dvv?.body).toContain("1 Oct");
  expect(j?.items.find((i) => i.id === "electricity")?.due).toBe("2026-10-18");
  expect(j?.title).toBe("Move to Turku, 1 Nov");
  expect(j?.eventId).toBe(mockMove.id);
});

test("move journey compares If, LähiTapiola and OP on their own pages", async () => {
  const j = await createBuilders({ today: TODAY }).move?.build(ctx(mockMove));
  const compare = j?.items.filter((i) => i.kind === "compare") ?? [];
  expect(compare.map((c) => c.id)).toEqual(["compare-if", "compare-lt", "compare-op"]);
  expect(new Set(compare.map((c) => new URL(c.sourceUrl ?? "").hostname)).size).toBe(3);
  expect(compare[0]?.title).toContain("If");
});

test("FMI warnings for the new place become warning cards", async () => {
  const j = await createBuilders({ today: TODAY, warnings: [frost] }).move?.build(ctx(mockMove, "en", "Turku"));
  const w = j?.items.find((i) => i.kind === "warning" && i.title === "Frost warning");
  expect(w?.due).toBe("2026-10-30");
  expect(w?.sourceUrl).toContain("ilmatieteenlaitos");
  expect(j?.items.some((i) => i.id === "fmi-none")).toBe(false);
});

test("no FMI warnings says so rather than inventing one", async () => {
  const j = await createBuilders({ today: TODAY, warnings: [], warningsFetchedAt: "2026-10-17T00:00:00Z" }).move?.build(ctx(mockMove));
  const none = j?.items.find((i) => i.id === "fmi-none");
  expect(none?.kind).toBe("info");
  expect(none?.body).toContain("2026-10-17");
});

test("an unknown place is reported, not silently skipped", async () => {
  const event = { ...mockMove, place: "Nowhereville" };
  const j = await createBuilders({ today: TODAY }).move?.build(ctx(event));
  expect(j?.items.some((i) => i.id === "fmi-unknown-place")).toBe(true);
});

test("a move without a date still builds, with no due dates that depend on it", async () => {
  const event = { ...mockMove, estimatedDate: undefined };
  const j = await createBuilders({ today: TODAY }).move?.build(ctx(event));
  expect(j?.items.find((i) => i.id === "dvv")?.due).toBeUndefined();
  expect(j?.items.find((i) => i.id === "electricity")?.due).toBeUndefined();
});

test("first car: inspection due date follows the Traficom rule when commissioning is known", async () => {
  const j = await createBuilders({ today: TODAY, commissioned: "2024-03-15" }).first_car?.build(ctx({ ...mockMove, type: "first_car" }));
  expect(j?.items.find((i) => i.id === "inspection")?.due).toBe("2028-03-15");
});

test("long trip: start date drives the cancellation-cover deadline", async () => {
  const j = await createBuilders({ today: TODAY }).long_trip?.build(ctx({ ...mockMove, type: "long_trip", estimatedDate: "2026-12-10" }));
  expect(j?.items.find((i) => i.id === "long-trip-cover")?.due).toBe("2026-12-07");
});
