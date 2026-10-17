// Fetches Traficom's periodic inspections of passenger cars by make, model
// and commissioning year (PxWeb table 040_kats_tau_104) for one inspection
// year into libs/listing/data/inspections.json: number inspected, failure
// percentage and median kilometres. "Merkit yhteensä - Mallit yhteensä" is
// kept as `all`, the comparison for every model.
// Usage: node libs/listing/scripts/fetch-inspections.ts [year]

import { writeFileSync } from "node:fs";
import { join } from "node:path";

const year = process.argv[2] ?? "2025";
const URL = "https://trafi2.stat.fi/PXWeb/api/v1/fi/TraFi/Katsastuksen_vikatilastot/040_kats_tau_104.px";

const res = await fetch(URL, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    query: [
      { code: "Katsastusvuosi", selection: { filter: "item", values: [year] } },
      { code: "Merkki ja mallisarja", selection: { filter: "all", values: ["*"] } },
      { code: "Käyttöönottovuosi", selection: { filter: "all", values: ["*"] } },
      { code: "Tiedot", selection: { filter: "item", values: ["Lkm", "Hylkaysprosentti", "Mediaani"] } },
    ],
    response: { format: "json" },
  }),
});
if (!res.ok) throw new Error(`Traficom ${res.status}: ${await res.text()}`);
const body = (await res.json()) as { columns: { code: string }[]; data: { key: string[]; values: string[] }[] };

type Row = { n: number; failPct: number; medianKm: number };
const FIELD: Record<string, keyof Row> = { Lkm: "n", Hylkaysprosentti: "failPct", Mediaani: "medianKm" };
const models: Record<string, Record<string, Row>> = {};
// One value per cell: key is [inspection year, model, commissioning year, measure].
for (const { key, values } of body.data) {
  const [, model, commissioned, measure] = key as [string, string, string, string];
  const v = Number((values[0] ?? "").replace(",", "."));
  const field = FIELD[measure];
  if (!field || !Number.isFinite(v)) continue;
  const name = model === "Merkit yhteensä - Mallit yhteensä" ? "all" : model.replace(" - Mallit yhteensä", "").toUpperCase();
  const y = commissioned === "Vuodet yhteensä" ? "all" : commissioned;
  models[name] ??= {};
  models[name][y] ??= { n: 0, failPct: Number.NaN, medianKm: 0 };
  models[name][y][field] = v;
}
for (const rows of Object.values(models))
  for (const [y, r] of Object.entries(rows)) if (!r.n || !Number.isFinite(r.failPct)) delete rows[y];

const out = {
  source: "Traficom, henkilöautojen määräaikaiskatsastukset malleittain 2023–2025 (040_kats_tau_104)",
  url: "https://trafi2.stat.fi/PXWeb/pxweb/fi/TraFi/TraFi__Katsastuksen_vikatilastot/040_kats_tau_104.px/",
  year: Number(year),
  fetched: new Date().toISOString().slice(0, 10),
  models,
};
const file = join(import.meta.dirname, "../data/inspections.json");
writeFileSync(file, `${JSON.stringify(out)}\n`);
console.log(`${Object.keys(models).length} makes and models inspected in ${year} -> ${file}`);
