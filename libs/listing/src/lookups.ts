// Open data looked up for an ad, bundled with the app so nothing is
// requested at run time: Statistics Finland's price per m² of old flats by
// postcode (table 13mu) and Traficom's periodic inspections by make, model
// and commissioning year. Refresh with libs/listing/scripts/fetch-*.ts.

import inspections from "../data/inspections.json" with { type: "json" };
import prices from "../data/prices-postcode.json" with { type: "json" };
import type { Listing } from "./schema.ts";

export interface AreaPrice {
  postcode: string;
  area: string;
  /** Which kind of flat the area figure is for. */
  type: "studio" | "two_room" | "three_room_plus" | "terraced";
  areaEurPerM2: number;
  sales: number;
  adEurPerM2: number;
  /** Ad over the area figure, in percent; negative is cheaper. */
  diffPct: number;
  year: number;
  source: { name: string; url: string };
}

export interface InspectionStats {
  model: string;
  commissioned: number;
  inspected: number;
  failPct: number;
  /** Every car of that commissioning year inspected the same year. */
  allFailPct: number;
  medianKm: number;
  /** The ad's mileage against that median, when the ad gives one; percent. */
  mileageVsMedianPct?: number;
  year: number;
  source: { name: string; url: string };
}

type PriceTable = {
  year: number;
  source: string;
  url: string;
  byPostcode: Record<string, { name: string; types: Record<string, { eurPerM2: number; sales: number }> }>;
};
type InspectionTable = {
  year: number;
  source: string;
  url: string;
  models: Record<string, Record<string, { n: number; failPct: number; medianKm: number }>>;
};

const PRICES = prices as PriceTable;
const INSPECTIONS = inspections as InspectionTable;

/** A flat for sale against the median €/m² of old flats of its size in its postcode. */
export function areaPrice(listing: Listing): AreaPrice | undefined {
  const f = listing.fields;
  if (listing.category !== "home" || f.priceKind?.value !== "sale" || !f.postcode || !f.sizeM2 || !f.priceEur) return undefined;
  const area = PRICES.byPostcode[f.postcode.value];
  if (!area) return undefined;
  const rooms = Number.parseInt(f.rooms?.value ?? "", 10);
  const type: AreaPrice["type"] =
    f.buildingType?.value === "terraced" ? "terraced" : rooms === 1 ? "studio" : rooms === 2 ? "two_room" : "three_room_plus";
  const row = area.types[type];
  if (!row) return undefined;
  const adEurPerM2 = Math.round(f.priceEur.value / f.sizeM2.value);
  return {
    postcode: f.postcode.value,
    area: area.name,
    type,
    areaEurPerM2: row.eurPerM2,
    sales: row.sales,
    adEurPerM2,
    diffPct: Math.round(((adEurPerM2 - row.eurPerM2) / row.eurPerM2) * 100),
    year: PRICES.year,
    source: { name: PRICES.source, url: PRICES.url },
  };
}

const MAKE_ALIASES: Record<string, string> = { VW: "VOLKSWAGEN", MERCEDES: "MERCEDES-BENZ" };

/** How cars of this model and year did in last year's periodic inspections. */
export function inspectionStats(listing: Listing): InspectionStats | undefined {
  const f = listing.fields;
  if (listing.category !== "car" || !f.make || !f.model || !f.year) return undefined;
  const make = MAKE_ALIASES[f.make.value.toUpperCase()] ?? f.make.value.toUpperCase();
  const words = f.model.value.toUpperCase().split(/\s+/);
  // The longest series name the ad's model starts with: "COROLLA TOURING SPORTS" -> "COROLLA".
  let model: string | undefined;
  for (let n = words.length; n > 0 && !model; n--) {
    const key = `${make} ${words.slice(0, n).join(" ")}`;
    if (INSPECTIONS.models[key]) model = key;
  }
  if (!model) return undefined;
  const year = String(f.year.value);
  const row = INSPECTIONS.models[model]?.[year];
  const all = INSPECTIONS.models.all?.[year];
  if (!row || !all) return undefined;
  const out: InspectionStats = {
    model,
    commissioned: f.year.value,
    inspected: row.n,
    failPct: row.failPct,
    allFailPct: all.failPct,
    medianKm: row.medianKm,
    year: INSPECTIONS.year,
    source: { name: INSPECTIONS.source, url: INSPECTIONS.url },
  };
  if (f.mileageKm && row.medianKm) out.mileageVsMedianPct = Math.round(((f.mileageKm.value - row.medianKm) / row.medianKm) * 100);
  return out;
}
