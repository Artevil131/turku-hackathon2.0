// Builds the compact data the page reads offline and writes it into index.html, between
// <script id="wi-data" type="application/json"> and </script>. Run after changing anything in data/.
//   node apps/what-if/tools/build-data.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (f) => JSON.parse(readFileSync(join(root, "data", f), "utf8"));
const trafi = read("traficom-inspections.json");
const housing = read("housing-rules.json");
const car = read("car-rules.json");
const rent = read("rent-rules.json");
const powertrain = read("powertrain-models.json");
// Motorcycle facts are used as they are: every fact the page shows carries its own source id.
const { meta: _motoMeta, notes: _motoNotes, ...moto } = read("moto-rules.json");

const fold = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

// Traficom's fault areas, in words that fit in a sentence ("… usually fail on rust under the car").
const AREA_WORDS = {
  "Front axle (control arms, ball joints, bushings)": "front axle joints and bushings",
  "Springs and shock absorbers": "springs and shock absorbers",
  "Service brake": "brakes",
  "Service brake roller test": "brakes",
  "Parking brake roller test": "the parking brake",
  "Underbody box sections and floor panel (rust)": "rust under the car",
  "Petrol engine emissions test": "exhaust emissions",
  "Diesel engine smoke test": "diesel smoke",
  "Exhaust emissions": "exhaust emissions",
  "Tyres and rims": "tyres and rims",
  "On-board diagnostics (OBD)": "engine fault codes (OBD)",
  "Rear axle (control arms, bushings)": "rear axle joints and bushings",
  "Vehicle documents": "missing papers",
  "Steering joints and tie rods": "steering joints",
  "Other windows": "windows",
  "Headlamp": "headlamps",
  "Low beam": "low beams",
  "Manufacturer's plate": "the manufacturer's plate",
  "Body": "the body",
  "Frame": "the frame",
  "Seat belts and restraints": "seat belts",
  "Taxi equipment": "taxi equipment",
  "Electronic stability control (ESC)": "stability control (ESC)",
};
const areas = [];
const areaIndex = (en) => {
  const words = AREA_WORDS[en];
  if (!words) throw new Error(`No words for fault area "${en}"`);
  let i = areas.indexOf(words);
  if (i < 0) i = areas.push(words) - 1;
  return i;
};
const causes = (row) => [...new Set((row.topRejectionCauses || []).map((c) => areaIndex(c.areaEn)))];
const kkm = (n) => (n == null ? null : Math.round(n / 1000));

// Model rows: "make|model" (lowercase, no accents) -> { firstRegYear: [rejection %, inspections, median km / 1000, ...cause indices] }
const m = {};
for (const r of trafi.byModel) {
  const key = `${fold(r.make)}|${fold(r.model)}`;
  (m[key] ??= {})[r.firstRegYear] = [r.rejectionPct, r.inspections, kkm(r.medianKm), ...causes(r)];
}
const mk = {};
for (const r of trafi.byMake) (mk[fold(r.make)] ??= {})[r.firstRegYear] = [r.rejectionPct, r.inspections, kkm(r.medianKm)];
const avg = {};
for (const r of trafi.averageByAge) avg[r.firstRegYear] = [r.rejectionPct, r.inspections, kkm(r.medianKm), ...causes(r)];
const makes = [...new Set(trafi.byModel.map((r) => r.make))];

const srcUrl = (list, id) => list.find((s) => s.id === id)?.url;
const pipe = housing.renovations.find((r) => r.id === "pipe_renovation");
const leak = housing.leaks.latestNational;
const wear = (re) => car.wearItems.find((w) => re.test(w.item));
const firstUrl = (s) => (Array.isArray(s) ? s[0].url : s.url);
const belt = wear(/timing belt/), clutch = wear(/clutch/), service = wear(/periodic service/);
const fee = trafi.inspectionPrices.byYear.find((y) => y.year === 2025);
const disputes = car.extras.usedCarDisputes;

// Vehicle tax from 1.1.2026 (Ajoneuvoverolaki 1281/2003 as amended by 814/2024): the tables and rates as they are in
// car-rules.json. The few numbers that are only in its text (the electric-car rule, 400 g/km and more) are read from
// that text, so a change there can't go unnoticed.
const vt = car.vehicleTax;
const evRule = vt.basicTax.evRule.match(/plus ([\d.]+) cents\/day/);
const evFrom = vt.basicTax.evRule.match(/on or after (\d{1,2})\.(\d{1,2})\.(\d{4})/);
const over400 = vt.basicTax.tableIndexNote.match(/400 g\/km or more: ([\d.]+) cents\/day/);
if (!evRule || !evFrom || !over400) throw new Error("car-rules.json vehicleTax: the electric-car rule or the 400 g/km rate changed shape");
const pad2 = (n) => String(n).padStart(2, "0");
const tax = {
  nedc: vt.basicTax.table1NEDC_centsPerDayByGkm,
  wltp: vt.basicTax.table1A_WLTP_centsPerDayByGkm,
  over400: +over400[1],
  mass: vt.basicTax.table2ByTotalMassKg.map((r) => [r.maxKg, r.centsPerDay]),
  motive: vt.motivePowerTax.centsPer100kgPerDay,
  evExtra: +evRule[1],
  evFrom: `${evFrom[3]}-${pad2(evFrom[2])}-${pad2(evFrom[1])}`,
  lawUrl: vt.basicTax.source.find((s) => s.ref === "AVL").url,
  calcUrl: vt.officialCalculator.url,
};
if (tax.nedc.length !== 400 || tax.wltp.length !== 400) throw new Error("vehicle tax tables must have 400 rows (0–399 g/km)");
for (const ex of vt.examples) if (!(ex.eurPerYear > 0)) throw new Error(`vehicle tax example without eurPerYear: ${ex.label}`);

// Model keys that are electric only (powertrain-models.json, each with the maker's page).
const ev = powertrain.electricOnly.map((e) => e.key);
for (const k of ev) if (!m[k]) throw new Error(`powertrain-models.json: ${k} is not a Traficom model key`);

const data = {
  v: 1,
  trafi: {
    year: trafi.national.year,
    url: trafi.source.url,
    national: [trafi.national.rejectionPct, trafi.national.inspections],
  },
  areas,
  m,
  mk,
  avg,
  makes,
  facts: {
    pipes: {
      median: pipe.costPerM2.median, year: pipe.costPerM2.year, low: pipe.costPerM2.low, high: pipe.costPerM2.high,
      capital: pipe.costByRegion.capitalRegion.median2026, life: pipe.typicalLifeYears,
      survey: pipe.conditionSurvey.firstAtAgeYears, resurvey: pipe.conditionSurvey.repeatEveryYears,
      url: housing.sources.S_PUTKI2026.url, surveyUrl: housing.sources.S_FA_2022.url,
    },
    leaks: { year: leak.year, count: leak.leakDamages, paid: leak.paidEUR, avg: leak.avgPaidPerDamageEUR, url: housing.sources.S_FA_2022.url },
    concreteUrl: housing.sources.S_RT103765.url,
    asbestosUrl: housing.sources.S_VNA798.url,
    belt: { low: belt.costEurLow, high: belt.costEurHigh, typical: belt.costEurTypical, km: belt.usualIntervalKm, kmRange: belt.intervalKmRange, url: firstUrl(belt.source) },
    clutch: { low: clutch.costEurLow, high: clutch.costEurHigh, typical: clutch.costEurTypical, url: firstUrl(clutch.source) },
    service: { low: service.costEurLow, high: service.costEurHigh, typical: service.costEurTypical, url: firstUrl(service.source) },
    inspectionFee: { walkIn: fee.periodicInspection, booked: fee.periodicInspectionBooked, year: fee.year, url: srcUrl(trafi.sources, "traficom-tilannekatsaus-2025") },
    disputes: { usedShare: disputes.facts[0].value, defectShare: disputes.facts[1].value, url: disputes.source.url },
    tax,
    ev,
    rentDepositMaxMonths: rent.deposit.maxMonthsOfRent.value,
    moto,
  },
};

const json = JSON.stringify(data);
const file = join(root, "index.html");
const html = readFileSync(file, "utf8");
const open = '<script id="wi-data" type="application/json">';
const start = html.indexOf(open);
const end = html.indexOf("</script>", start);
if (start < 0 || end < 0) throw new Error("index.html has no wi-data block");
writeFileSync(file, html.slice(0, start + open.length) + json + html.slice(end));
console.log(`wi-data: ${(json.length / 1024).toFixed(1)} KB, ${Object.keys(m).length} models, ${areas.length} fault areas`);
