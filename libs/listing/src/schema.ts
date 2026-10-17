// What the listing analyst may say about an ad, and how each claim is
// checked. Every field carries the words of the ad it came from; a field
// whose quote is not in the ad, or whose value is out of range, is dropped
// (validate.ts). That is the defence against a model inventing facts: it
// can only report what the ad says, and the app can highlight where.

import type { IsoDate } from "@ahead/contract";

export type ListingKind = "car" | "flat" | "other";

/** One extracted fact and the exact words of the ad it rests on. */
export interface Field<T> {
  value: T;
  quote: string;
}

export interface CarFields {
  make: string;
  model: string;
  /** Model year (vuosimalli) or year of first registration. */
  year: number;
  mileageKm: number;
  priceEur: number;
  fuel: "petrol" | "diesel" | "hybrid" | "electric" | "gas";
  transmission: "manual" | "automatic";
  seller: "dealer" | "private";
  /** Month the current inspection is valid until, `YYYY-MM`. */
  inspectedUntil: string;
  municipality: string;
}

export interface FlatFields {
  deal: "rent" | "sale";
  municipality: string;
  postcode: string;
  sizeM2: number;
  /** As written in Finnish ads: "2h+kk", "3h+k+s". */
  rooms: string;
  /** Monthly rent for a rental, debt-free price (velaton hinta) for a sale. */
  priceEur: number;
  builtYear: number;
  /** Pipe renovation (linjasaneeraus, putkiremontti): done, planned, or stated as not done. */
  pipeRenovation: "done" | "planned" | "not_done";
  pipeRenovationYear: number;
  availableFrom: IsoDate;
  buildingType: "apartment" | "terraced" | "detached";
}

export type Fields<T> = { [K in keyof T]?: Field<T[K]> };

export interface Listing {
  kind: ListingKind;
  car?: Fields<CarFields>;
  flat?: Fields<FlatFields>;
}

type Check = (v: unknown) => boolean;

const str =
  (max = 60): Check =>
  (v) =>
    typeof v === "string" && v.trim().length > 0 && v.length <= max;
const int =
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

export const CAR_CHECKS: Record<keyof CarFields, Check> = {
  make: str(),
  model: str(),
  year: int(1950, thisYear + 1),
  mileageKm: int(0, 2_000_000),
  priceEur: int(100, 1_000_000),
  fuel: oneOf("petrol", "diesel", "hybrid", "electric", "gas"),
  transmission: oneOf("manual", "automatic"),
  seller: oneOf("dealer", "private"),
  inspectedUntil: pattern(/^\d{4}-(0[1-9]|1[0-2])$/),
  municipality: str(40),
};

export const FLAT_CHECKS: Record<keyof FlatFields, Check> = {
  deal: oneOf("rent", "sale"),
  municipality: str(40),
  postcode: pattern(/^\d{5}$/),
  sizeM2: int(5, 1000),
  rooms: str(20),
  priceEur: int(50, 10_000_000),
  builtYear: int(1700, thisYear + 3),
  pipeRenovation: oneOf("done", "planned", "not_done"),
  pipeRenovationYear: int(1950, thisYear + 10),
  availableFrom: pattern(/^\d{4}-\d{2}-\d{2}$/),
  buildingType: oneOf("apartment", "terraced", "detached"),
};

/** The schema as the model sees it: field, type, meaning. */
export const SCHEMA_TEXT = `{
  "kind": "car" | "flat" | "other",
  "car": {            // only when kind is "car"
    "make": string, "model": string,
    "year": integer (model year or first registration),
    "mileageKm": integer (kilometres; "185 tkm" is 185000),
    "priceEur": integer,
    "fuel": "petrol" | "diesel" | "hybrid" | "electric" | "gas",
    "transmission": "manual" | "automatic",
    "seller": "dealer" | "private",
    "inspectedUntil": "YYYY-MM" (inspection valid until),
    "municipality": string
  },
  "flat": {           // only when kind is "flat"
    "deal": "rent" | "sale",
    "municipality": string, "postcode": "5 digits",
    "sizeM2": number, "rooms": string as written ("2h+kk"),
    "priceEur": integer (monthly rent, or debt-free price for a sale),
    "builtYear": integer,
    "pipeRenovation": "done" | "planned" | "not_done",
    "pipeRenovationYear": integer,
    "availableFrom": "YYYY-MM-DD",
    "buildingType": "apartment" | "terraced" | "detached"
  }
}
Every field is an object {"value": ..., "quote": "..."}.`;
