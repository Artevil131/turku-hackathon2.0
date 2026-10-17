// What the listing analyst may say about an ad, and how each claim is
// checked. An ad is anything a person might buy or rent at a turning
// point: a car, a motorcycle, a boat, a home, a cottage, a pet, a bike.
// Every field carries the words of the ad it came from; a field whose
// quote is not in the ad, or whose value is not written in its quote, is
// dropped (validate.ts). So is every risk the ad mentions: it must quote
// the ad. The model can only report what the ad says.

import type { IsoDate } from "@ahead/contract";

export const CATEGORIES = [
  "car",
  "motorcycle",
  "boat",
  "caravan",
  "home",
  "cottage",
  "pet",
  "bicycle",
  "electronics",
  "other_item",
] as const;
export type Category = (typeof CATEGORIES)[number];

export const VEHICLES: readonly Category[] = ["car", "motorcycle", "boat", "caravan"];
export const HOMES: readonly Category[] = ["home", "cottage"];

/** One extracted fact and the exact words of the ad it rests on. */
export interface Field<T> {
  value: T;
  quote: string;
}

export interface ListingFields {
  // Any ad
  title: string;
  priceEur: number;
  /** "sale" or a monthly rent. */
  priceKind: "sale" | "rent_month";
  municipality: string;
  postcode: string;
  seller: "dealer" | "private";
  /** Year made: model year, first registration, year built, year of birth. */
  year: number;
  // Vehicles and goods
  make: string;
  model: string;
  mileageKm: number;
  engineHours: number;
  fuel: "petrol" | "diesel" | "hybrid" | "electric" | "gas";
  transmission: "manual" | "automatic";
  /** Month the current inspection is valid until, `YYYY-MM`. */
  inspectedUntil: string;
  // Homes
  sizeM2: number;
  /** As written in Finnish ads: "2h+kk", "3h+k+s". */
  rooms: string;
  buildingType: "apartment" | "terraced" | "detached" | "cottage";
  availableFrom: IsoDate;
  heating: "district" | "electric" | "oil" | "ground_source" | "air_water" | "wood";
  /** Hoitovastike, € a month. */
  monthlyChargeEur: number;
  plotM2: number;
  // Pets
  species: "dog" | "cat" | "horse" | "other";
  breed: string;
}

export type Fields = { [K in keyof ListingFields]?: Field<ListingFields[K]> };

/** Things an ad can say that matter for the buyer's risk and costs. */
export const MENTION_RISKS = [
  "pipe_renovation",
  "facade_renovation",
  "roof_renovation",
  "balcony_renovation",
  "window_renovation",
  "elevator_renovation",
  "drainage_renovation",
  "moisture_damage",
  "mould",
  "false_plinth",
  "oil_heating",
  "asbestos",
  "radon",
  "flood",
  "rust",
  "accident_damage",
  "engine_fault",
  "timing_belt",
  "battery_condition",
  "imported",
  "service_history",
  "sold_as_is",
  "hereditary_disease",
  "health_tests",
] as const;
export type MentionRisk = (typeof MENTION_RISKS)[number];

export interface Mention {
  risk: MentionRisk;
  /** done: fixed or renewed; planned: coming; present: a problem now; not_done: stated as not done or missing. */
  status: "done" | "planned" | "present" | "not_done";
  year?: number;
  quote: string;
}

export interface Listing {
  kind: "listing" | "other";
  category?: Category;
  fields: Fields;
  mentions: Mention[];
}

type Check = (v: unknown) => boolean;

const str =
  (max = 60): Check =>
  (v) =>
    typeof v === "string" && v.trim().length > 0 && v.length <= max;
const num =
  (min: number, max: number): Check =>
  (v) =>
    typeof v === "number" && Number.isFinite(v) && v >= min && v <= max;
const oneOf =
  (...values: string[]): Check =>
  (v) =>
    typeof v === "string" && values.includes(v);
const pattern =
  (re: RegExp): Check =>
  (v) =>
    typeof v === "string" && re.test(v);

const thisYear = new Date().getFullYear();

export const CHECKS: Record<keyof ListingFields, Check> = {
  title: str(120),
  priceEur: num(1, 10_000_000),
  priceKind: oneOf("sale", "rent_month"),
  municipality: str(40),
  postcode: pattern(/^\d{5}$/),
  seller: oneOf("dealer", "private"),
  year: num(1700, thisYear + 3),
  make: str(),
  model: str(),
  mileageKm: num(0, 2_000_000),
  engineHours: num(0, 100_000),
  fuel: oneOf("petrol", "diesel", "hybrid", "electric", "gas"),
  transmission: oneOf("manual", "automatic"),
  inspectedUntil: pattern(/^\d{4}-(0[1-9]|1[0-2])$/),
  sizeM2: num(5, 10_000),
  rooms: str(20),
  buildingType: oneOf("apartment", "terraced", "detached", "cottage"),
  availableFrom: pattern(/^\d{4}-\d{2}-\d{2}$/),
  heating: oneOf("district", "electric", "oil", "ground_source", "air_water", "wood"),
  monthlyChargeEur: num(1, 5000),
  plotM2: num(10, 10_000_000),
  species: oneOf("dog", "cat", "horse", "other"),
  breed: str(),
};

/** The schema as the model sees it. */
export const SCHEMA_TEXT = `{
  "kind": "listing" | "other",
  "category": ${CATEGORIES.map((c) => `"${c}"`).join(" | ")},
  "fields": {
    // any ad
    "title": string (what is offered, short),
    "priceEur": number (for a home for sale, the debt-free price "velaton hinta" when the ad gives one),
    "priceKind": "sale" | "rent_month",
    "municipality": string, "postcode": "5 digits",
    "seller": "dealer" | "private",
    "year": integer (model year, first registration, year built, or year of birth),
    // vehicles, boats, goods
    "make": string, "model": string,
    "mileageKm": integer ("185 tkm" is 185000), "engineHours": integer,
    "fuel": "petrol" | "diesel" | "hybrid" | "electric" | "gas",
    "transmission": "manual" | "automatic",
    "inspectedUntil": "YYYY-MM",
    // homes and cottages
    "sizeM2": number, "rooms": string as written ("2h+kk"),
    "buildingType": "apartment" | "terraced" | "detached" | "cottage",
    "availableFrom": "YYYY-MM-DD",
    "heating": "district" | "electric" | "oil" | "ground_source" | "air_water" | "wood",
    "monthlyChargeEur": number (hoitovastike), "plotM2": number,
    // pets
    "species": "dog" | "cat" | "horse" | "other", "breed": string
  },
  "mentions": [
    { "risk": ${MENTION_RISKS.map((r) => `"${r}"`).join(" | ")},
      "status": "done" | "planned" | "present" | "not_done",
      "year": integer (only if the ad gives one),
      "quote": string }
  ]
}
Every field is an object {"value": ..., "quote": "..."}.`;
