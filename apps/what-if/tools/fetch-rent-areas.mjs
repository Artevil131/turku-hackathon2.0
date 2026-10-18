// Fetches Statistics Finland's average rents per m² for privately financed (vapaarahoitteinen) rental flats and
// writes data/rent-areas.json: only what the page needs, the period, the area, rooms, €/m² a month and the number
// of observations. A few small requests to the open PxWeb API, under 1 MB, free. Run again to refresh:
//   node apps/what-if/tools/fetch-rent-areas.mjs
//
// Two tables, because Statistics Finland has no current table by postcode:
//   - municipalities: StatFin asvu 15fa (rent index 2025=100 and average rents, quarterly), the latest quarter;
//   - postcodes: 13eb (average rents by postal code area, 2015Q1–2025Q4), moved to the archive database
//     StatFin_Passiivi when the statistic was renewed in 2026; its last quarter is the latest by postcode.
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const API = "https://pxdata.stat.fi/PxWeb/api/v1/fi";
const MUNI_TABLE = "StatFin/asvu/15fa.px";
const POST_TABLE = "StatFin_Passiivi/asvu/statfinpas_asvu_pxt_13eb_2025q4.px";
const MIN_POSTCODE_OBS = 20; // postcode rows with fewer observations are left out to keep the file small

const getJson = async (url, body) => {
  const res = await fetch(url, body ? { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) } : {});
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  return res.json();
};
const item = (code, values) => ({ code, selection: { filter: "item", values } });
// json-stat2 to rows of { dimension code: value code, …, value }
function rows(js) {
  const ids = js.id, sizes = js.size;
  const codes = ids.map((id) => Object.entries(js.dimension[id].category.index).sort((a, b) => a[1] - b[1]).map(([k]) => k));
  const out = [];
  js.value.forEach((v, flat) => {
    const r = { value: v };
    let rest = flat;
    for (let d = ids.length - 1; d >= 0; d--) { r[ids[d]] = codes[d][rest % sizes[d]]; rest = Math.floor(rest / sizes[d]); }
    out.push(r);
  });
  return out;
}
const ROOMS = { 1: "1", 2: "2", 3: "3+" };

// Municipalities: the 3-digit codes (Espoo and Kauniainen are one area, 049), not the regions or the city sub-areas.
const muniMeta = await getJson(`${API}/${MUNI_TABLE}`);
const v = (code) => muniMeta.variables.find((x) => x.code === code || x.code.startsWith(code));
const area = v("alue"), fund = v("rahoitus"), rooms = v("huoneluku"), quarter = v("timeperiod"), info = v("contentscode");
const muniCodes = area.values.filter((c) => /^\d{3}$/.test(c));
const latestQ = quarter.values[quarter.values.length - 1];
const muniJs = await getJson(`${API}/${MUNI_TABLE}`, { query: [item(area.code, muniCodes), item(fund.code, ["1"]), item(rooms.code, ["SSS", "1", "2", "3"]),
  item(quarter.code, [latestQ]), item(info.code, ["asvu_keskineliovuokra", "asvu_keskineliovuokra_lkm", "asvu_keskineliovuokra_u", "asvu_keskineliovuokra_u_lkm"])], response: { format: "json-stat2" } });
const municipalities = {};
for (const r of rows(muniJs)) {
  if (r.value == null) continue;
  const name = area.valueTexts[area.values.indexOf(r[area.code])];
  const m = (municipalities[name] ??= {});
  const key = r[rooms.code] === "SSS" ? "all" : ROOMS[r[rooms.code]];
  const cell = (m[key] ??= {});
  const field = { asvu_keskineliovuokra: "eurPerM2", asvu_keskineliovuokra_lkm: "obs", asvu_keskineliovuokra_u: "eurPerM2New", asvu_keskineliovuokra_u_lkm: "obsNew" }[r[info.code]];
  cell[field] = r.value;
}

// Postcodes: the last quarter of the archived table.
const postMeta = await getJson(`${API}/${POST_TABLE}`);
const pq = postMeta.variables.find((x) => x.code === "Vuosineljännes");
const pc = postMeta.variables.find((x) => x.code === "Postinumero");
const postQ = pq.values[pq.values.length - 1];
const postJs = await getJson(`${API}/${POST_TABLE}`, { query: [item("Vuosineljännes", [postQ]), item("Postinumero", pc.values), item("Huoneluku", ["01", "02", "03"]),
  item("Tiedot", ["keskivuokra", "lkm_ptno"])], response: { format: "json-stat2" } });
const postcodes = {};
let dropped = 0;
for (const r of rows(postJs)) {
  if (r.value == null) continue;
  const code = r.Postinumero;
  const text = pc.valueTexts[pc.values.indexOf(code)].replace(/\s+/g, " ").trim(); // "00100 Helsinki Keskusta - Etu-Töölö (Helsinki )"
  const name = text.replace(/^\d{5}\s*/, "").replace(/\s*\)$/, ")").replace(/\(\s*/, "(");
  const p = (postcodes[code] ??= { name, rooms: {} });
  const cell = (p.rooms[ROOMS[+r.Huoneluku]] ??= {});
  if (r.Tiedot === "keskivuokra") cell.eurPerM2 = r.value; else cell.obs = r.value;
}
for (const [code, p] of Object.entries(postcodes)) {
  for (const [k, c] of Object.entries(p.rooms)) if (c.eurPerM2 == null || !(c.obs >= MIN_POSTCODE_OBS)) { delete p.rooms[k]; dropped++; }
  if (!Object.keys(p.rooms).length) delete postcodes[code];
}
for (const m of Object.values(municipalities)) for (const [k, c] of Object.entries(m)) if (c.eurPerM2 == null) delete m[k];

const today = new Date().toISOString().slice(0, 10);
const out = {
  meta: {
    title: "Average rents per m² a month for privately financed rental flats, by municipality and by postal code area, and number of rooms",
    publisher: "Statistics Finland (Tilastokeskus), Rents of dwellings (Asuntojen vuokrat)",
    licence: "CC BY 4.0",
    licenceUrl: "https://creativecommons.org/licenses/by/4.0/",
    fetched: today,
    notes: [
      "eurPerM2 is Statistics Finland's average rent per m² a month (keskineliövuokra) for privately financed (vapaarahoitteinen) rental flats; obs is the number of observations behind it. Statistics Finland counts separately paid water and heating charges as rent.",
      "Municipalities also have eurPerM2New and obsNew: new tenancies only (keskineliövuokra uusille vuokrasuhteille), the closer comparison for an ad's asking rent. The table by postal code has no such split.",
      "Rooms: 1 = studios (yksiöt), 2 = two rooms (kaksiot), 3+ = three rooms or more (kolmiot+); 'all' = every size.",
      `Postal code rows with fewer than ${MIN_POSTCODE_OBS} observations are left out to keep the file small (${dropped} cells dropped).`,
      "Statistics Finland renewed the statistic in 2026 (rent index 2025=100). The table by postal code was moved to the archive database with 2025Q4 as its last quarter; the municipal figures come from the current table.",
    ],
    sources: [
      { id: "municipalities", table: "15fa", name: `Statistics Finland, StatFin asvu table 15fa: rent index (2025=100) and average rents per m², ${latestQ}`, period: latestQ,
        url: "https://pxdata.stat.fi/PxWeb/pxweb/fi/StatFin/StatFin__asvu/statfin_asvu_pxt_15fa.px/", api: `${API}/${MUNI_TABLE}` },
      { id: "postcodes", table: "13eb", name: `Statistics Finland, StatFin asvu table 13eb: average rents per m² for non-subsidised rental dwellings by postal code area, ${postQ}`, period: postQ,
        url: "https://pxdata.stat.fi/PxWeb/pxweb/fi/StatFin_Passiivi/StatFin_Passiivi__asvu/statfinpas_asvu_pxt_13eb_2025q4.px/", api: `${API}/${POST_TABLE}` },
    ],
  },
  municipalities,
  postcodes,
};
writeFileSync(join(root, "data", "rent-areas.json"), JSON.stringify(out, null, 2) + "\n");
console.log(`rent-areas.json: ${Object.keys(municipalities).length} municipalities (${latestQ}), ${Object.keys(postcodes).length} postcodes (${postQ}), ${dropped} small cells dropped`);
