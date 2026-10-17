import type { DetectedEvent } from "@ahead/contract";
import { expect, describe as group, it } from "vitest";
import { describe, formatDate } from "./describe.ts";

const base: DetectedEvent = { id: "x", type: "move", score: 3, evidence: [], firstSignal: "2026-10-09", detectedAt: "2026-10-17" };
const today = "2026-10-17";

group("describe", () => {
  it("fills date and place when known", () => {
    expect(describe({ ...base, estimatedDate: "2026-11-01", place: "Turku" }, "fi", today).title).toBe(
      "Näyttää siltä, että muutto on tulossa, suuntana Turku noin 1.11..".replace("..", "."),
    );
    expect(describe({ ...base, estimatedDate: "2026-11-01", place: "Turku" }, "en", today).title).toBe(
      "It looks like a move is coming, to Turku around 1 November.",
    );
  });
  it("reads well without them", () => {
    expect(describe(base, "en", today).title).toBe("It looks like a move is coming.");
    expect(describe({ ...base, type: "first_car" }, "fi", today).title).toBe("Näyttää siltä, että olet hankkimassa autoa.");
  });
  it("formats dates per locale and year", () => {
    expect(formatDate("2027-01-10", "fi", today)).toBe("10.1.2027");
    expect(formatDate("2027-01-10", "en", today)).toBe("10 January 2027");
    expect(formatDate("2026-11-01", "fi", today)).toBe("1.11.");
  });
});
