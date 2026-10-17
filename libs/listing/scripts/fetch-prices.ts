// Fetches Statistics Finland table 13mu (old housing-company flats: price
// per m² and number of sales by postcode, yearly; CC BY 4.0) for one year
// into libs/listing/data/prices-postcode.json, so the app compares an ad
// with its area without any request at run time.
// Usage: node libs/listing/scripts/fetch-prices.ts [year]

import { writeFileSync } from "node:fs";
import { join } from "node:path";

const year = process.argv[2] ?? "2025";
const URL = "https://pxdata.stat.fi/PxWeb/api/v1/fi/StatFin/ashi/13mu.px";
const TYPES: Record<string, string> = { "1": "studio", "2": "two_room", "3": "three_room_plus", "5": "terraced" };

const meta = (await (await fetch(URL)).json()) as { variables: { code: string; values: string[]; valueTexts: string[] }[] };
const postcodes = meta.variables.find((v) => v.code.startsWith("postinumeroalue"));
if (!postcodes) throw new Error("no postcode variable in 13mu");

const res = await fetch(URL, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    query: [
      { code: "timeperiod_y", selection: { filter: "item", values: [year] } },
      { code: postcodes.code, selection: { filter: "all", values: ["*"] } },
      { code: "talotyyppi_6_20131021", selection: { filter: "item", values: Object.keys(TYPES) } },
      { code: "contentscode", selection: { filter: "item", values: ["keskihinta_aritm_nw", "lkm_julk20"] } },
    ],
    response: { format: "json" },
  }),
});
if (!res.ok) throw new Error(`13mu ${res.status}: ${await res.text()}`);
const body = (await res.json()) as { data: { key: string[]; values: string[] }[] };

const names: Record<string, string> = {};
postcodes.values.forEach((v, i) => {
  names[v] = (postcodes.valueTexts[i] ?? "").replace(/^\d+\s+/, "");
});
const byPostcode: Record<string, { name: string; types: Record<string, { eurPerM2: number; sales: number }> }> = {};
for (const { key, values } of body.data) {
  const [, code, type] = key as [string, string, string];
  const [price, sales] = values.map(Number) as [number, number];
  if (!Number.isFinite(price) || !TYPES[type]) continue;
  byPostcode[code] ??= { name: names[code] ?? "", types: {} };
  byPostcode[code].types[TYPES[type]] = { eurPerM2: price, sales: Number.isFinite(sales) ? sales : 0 };
}

const out = {
  source: "Tilastokeskus, taulukko 13mu: vanhojen osakeasuntojen neliöhinnat ja kauppojen lukumäärät postinumeroalueittain (CC BY 4.0)",
  url: "https://pxdata.stat.fi/PxWeb/pxweb/fi/StatFin/StatFin__ashi/statfin_ashi_pxt_13mu.px/",
  year: Number(year),
  fetched: new Date().toISOString().slice(0, 10),
  byPostcode,
};
const file = join(import.meta.dirname, "../data/prices-postcode.json");
writeFileSync(file, `${JSON.stringify(out)}\n`);
console.log(`${Object.keys(byPostcode).length} postcodes with a price in ${year} -> ${file}`);
