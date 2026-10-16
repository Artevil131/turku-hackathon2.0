import type { EventType, JourneyBuilder } from "@ahead/contract";
import type { BuilderOptions } from "./common.ts";
import { createFirstCarBuilder, type FirstCarOptions } from "./firstCar.ts";
import { createLongTripBuilder } from "./longTrip.ts";
import { createMoveBuilder } from "./move.ts";

export { type BuilderOptions, cachedWarnings, type Locale } from "./common.ts";
export { createFirstCarBuilder, createLongTripBuilder, createMoveBuilder };

/** One builder per demo event (D-009). Child, pet and renovation have no journey this weekend. */
export function createBuilders(options: Partial<BuilderOptions> & FirstCarOptions = {}): Partial<Record<EventType, JourneyBuilder>> {
  return {
    move: createMoveBuilder(options),
    first_car: createFirstCarBuilder(options),
    long_trip: createLongTripBuilder(options),
  };
}
