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
const flatChecks = read("flat-checks.json");
const rentAreas = read("rent-areas.json");
// Statistics Finland's prices of old flats by postcode (table 13mu), read from libs/listing so the two never drift apart.
const salePrices = JSON.parse(readFileSync(join(root, "..", "..", "libs", "listing", "data", "prices-postcode.json"), "utf8"));
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
  nedcBefore: vt.basicTax.table1AScope.nedcBeforeYear,
  lawUrl: vt.basicTax.source.find((s) => s.ref === "AVL").url,
  calcUrl: vt.officialCalculator.url,
};
if (tax.nedc.length !== 400 || tax.wltp.length !== 400) throw new Error("vehicle tax tables must have 400 rows (0–399 g/km)");
for (const ex of vt.examples) if (!(ex.eurPerYear > 0)) throw new Error(`vehicle tax example without eurPerYear: ${ex.label}`);

// Model keys that are electric only (powertrain-models.json, each with the maker's page).
const ev = powertrain.electricOnly.map((e) => e.key);
for (const k of ev) if (!m[k]) throw new Error(`powertrain-models.json: ${k} is not a Traficom model key`);

// Running a used car for two years (car-running-costs.json): energy, an electric car's services, battery test and
// warranty, Toyota-group hybrid battery cover, and the link to Traficom's recall search. Every value keeps its source
// id; the sources the page shows are copied with them, and a secondary source is marked as an estimate.
// car-recalls-eu.json is not shipped: it is EU-wide, not "sold in Finland".
const rc = read("car-running-costs.json");
const rcUsed = new Set();
const rcSrc = (s) => { for (const id of [s].flat()) { if (!rc.meta.sources[id]) throw new Error(`car-running-costs.json: unknown source ${id}`); rcUsed.add(id); } return [s].flat(); };
const E = rc.energy, EC = rc.electricCars;
const gapRow = (p) => E.consumption.realWorldGapWLTP.rows.find((r) => r.powertrain === p).gapPct;
const nedcGap = E.consumption.realWorldGapWLTP.caveats.match(/NEDC gap had grown to around (\d+) % by (\d{4})/);
const band = E.electricityPrices.householdTypes.D.label.match(/^household, ([\d,]+–[\d,]+ kWh a year)/);
const startAll = EC.batteryWarranty.note.match(/runs from (first registration or delivery)/);
if (!nedcGap || !band || !startAll) throw new Error("car-running-costs.json: the NEDC gap, electricity band D or the warranty start note changed shape");
// When a battery warranty starts, in the maker's terms where the row states it, else the file's general note.
const startOf = (r) => {
  const t = r.conditions ?? "";
  if (/from the delivery date on the warranty certificate/i.test(t)) return "from the delivery date on its warranty certificate";
  if (/from first use or first registration, whichever is earlier/i.test(t)) return "from first use or first registration, whichever is earlier";
  if (/from the date the car was put into use/i.test(t)) return "from the date the car was put into use";
  return `from ${startAll[1]}`;
};
// Which ads a battery warranty row is for. `base` matches the model in the ad's title, `variant` the version anywhere
// in the ad, `my` the model year; a make with one row for all its electric cars has no `base`. Every row of the file
// must be listed here, so a new row can't be shown for the wrong car.
const WARRANTY_MATCH = {
  "Tesla|Model S, Model X": { base: String.raw`model ?[sx](?![a-z0-9])` },
  // Checked before the RWD row, so "Long Range RWD" is a Long Range.
  "Tesla|Model 3 / Model Y Premium Long Range RWD and AWD, Performance AWD": { first: true, base: String.raw`model ?[3y](?![a-z0-9])`, variant: String.raw`long range|performance|dual motor|(?<![a-z])awd(?![a-z])|premium` },
  "Tesla|Model 3 RWD, Model Y RWD": { base: String.raw`model ?[3y](?![a-z0-9])`, variant: String.raw`(?<![a-z])rwd(?![a-z])|standard range|(?<![a-z])sr\+?(?![a-z])` },
  "Volkswagen|ID models (BEV)": { base: String.raw`(?<![a-z])id\. ?\d|id\. ?buzz` },
  "Škoda|Enyaq, Elroq": { base: "enyaq|elroq" },
  "Audi|all BEV (e-tron, Q4 e-tron, Q6 e-tron …)": {},
  "CUPRA|Born, Tavascan": { base: "born|tavascan" },
  "Nissan|Leaf, Ariya": { base: "leaf|ariya" },
  "Hyundai|all BEV": {},
  "Kia|model year 2026 and newer (EV, HEV, PHEV)": { my: [2026, null] },
  "Kia|model year 2025 and older (EV, HEV, PHEV)": { my: [null, 2025] },
  "BMW|BMW i models (BEV); i3 60 Ah: 100,000 km": {},
  "Mercedes-Benz|EQA, EQB, EQC, electric CLA, GLB, GLC, G 580": { base: String.raw`eq[abc]|(?<![a-z])(?:cla|glb|glc)(?![a-z])|g ?580` },
  "Mercedes-Benz|EQE, EQE SUV, EQS, EQS SUV, Maybach EQS 680": { base: "eq[es]|maybach" },
  "Volvo|all BEV": {},
  "Polestar|all": {},
  "Toyota|bZ4X, Urban Cruiser and other BEV passenger cars (not Proace)": { base: String.raw`^(?!.*proace)` },
  "Toyota|EV-akkuturva extension for BEV passenger cars": { skip: true },
  "Ford|all Ford BEVs (Mustang Mach-E, Explorer …)": {},
  "Renault|R4, R5, Megane, Scenic E-Tech": { base: String.raw`(?<![a-z])r[45](?![a-z0-9])|megane|scenic` },
  "Peugeot|BEV": {},
  "Opel|BEV": {},
  "Citroën|BEV and PHEV": {},
  "MG|MG4, MGS5, MGS6, Cyberster": { base: String.raw`mg ?4|mgs ?[56]|cyberster|^mg 4` },
  "BYD|all models (Dolphin, Dolphin Surf, Seal, Seal U, Sealion 7, Atto 2, Atto 3, Tang, Han, DM-i)": {},
};
const warranty = [];
for (const r of EC.batteryWarranty.rows) {
  const id = `${r.make}|${r.models}`;
  const match = WARRANTY_MATCH[id];
  if (!match) throw new Error(`car-running-costs.json: no WARRANTY_MATCH entry for battery warranty row ${id}`);
  if (match.skip) continue;
  if (!(r.years > 0 && r.km > 0)) throw new Error(`battery warranty row without years and km: ${id}`);
  const row = { make: fold(r.make), maker: r.make, models: r.models, years: r.years, km: r.km, soh: r.minSoHPct, start: startOf(r),
    defectOnly: /only when a manufacturing or material defect causes it/i.test(r.conditions ?? ""), src: rcSrc(r.source), ...match };
  // BMW's i3 60 Ah has a lower km limit, stated in the same row.
  const i3 = r.make === "BMW" && r.models.match(/i3 60 Ah: ([\d,]+) km/);
  if (i3) warranty.push({ ...row, models: "BMW i3 60 Ah", km: +i3[1].replace(/,/g, ""), base: String.raw`(?<![a-z])i3(?![a-z0-9])`, variant: String.raw`60 ?ah` });
  warranty.push({ ...row, models: r.make === "BMW" ? "BMW i models" : r.models });
}
warranty.sort((a, b) => (b.first ? 1 : 0) - (a.first ? 1 : 0));
for (const w of warranty) delete w.first;
const hyb = (make, re) => {
  const r = EC.hybridBatteryWarranty.rows.find((x) => x.make === make && re.test(x.models));
  if (!r || r.years !== 10 || r.km !== 350000) throw new Error(`car-running-costs.json: the ${make} hybrid battery cover changed`);
  return { years: r.years, km: r.km, src: rcSrc(r.source), ...(r.checkCostEur === 0 ? { freeCheck: true } : {}) };
};
const svcRows = EC.servicePrices.rows.map((r) => ({ make: fold(r.make), model: r.model, avg: r.avgEur, low: r.lowEur, high: r.highEur, src: rcSrc(r.source) }));
const sohTest = EC.batteryHealthTest.rows.find((r) => /^SOH test/.test(r.what));
const aviloo = EC.batteryHealthTest.rows.filter((r) => /AVILOO/.test(r.what) && r.date).sort((a, b) => b.date.localeCompare(a.date))[0];
const flash = aviloo.what.match(/^(AVILOO \w+ test)/)?.[1];
if (!sohTest || !flash) throw new Error("car-running-costs.json: the battery test rows changed shape");
const recallPattern = rc.recalls.traficom.linkPatterns.searchByKeyword;
if (!/\{model\}/.test(recallPattern)) throw new Error("car-running-costs.json: the recall search link has no {model}");
const run = {
  km: { v: E.kmPerYear.national.valueKm, year: E.kmPerYear.national.year, src: rcSrc(E.kmPerYear.national.source) },
  fuel: { month: E.fuelPrices.latest.month, petrol: E.fuelPrices.latest.petrol95E10, diesel: E.fuelPrices.latest.diesel, src: rcSrc(E.fuelPrices.source) },
  elec: { month: E.electricityPrices.householdTypes.D.latest.month, c: E.electricityPrices.householdTypes.D.latest.total, band: band[1], src: rcSrc(E.electricityPrices.source) },
  gap: { petrol: gapRow("petrol"), diesel: gapRow("diesel"), phevPetrol: gapRow("plug-in hybrid (petrol)"), phevDiesel: gapRow("plug-in hybrid (diesel)"),
    nedc: +nedcGap[1], nedcYear: +nedcGap[2], src: rcSrc(E.consumption.realWorldGapWLTP.source) },
  service: svcRows,
  test: { avg: sohTest.avgEur, low: sohTest.lowEur, high: sohTest.highEur, src: rcSrc(sohTest.source),
    aviloo: { what: flash, eur: aviloo.priceEur, date: aviloo.date, src: rcSrc(aviloo.source) } },
  warranty,
  hybrid: { toyota: hyb("Toyota", /hybridiakkuturva/), lexus: hyb("Lexus", /hybridiakkuturva/), suzuki: hyb("Suzuki", /Across and Swace/) },
  recall: { url: recallPattern, src: rcSrc(rc.recalls.traficom.source.filter((id) => id !== "traficom-open-data")) },
};
for (const [k, v] of Object.entries({ km: run.km.v, petrol: run.fuel.petrol, diesel: run.fuel.diesel, elec: run.elec.c, gap: run.gap.petrol, test: run.test.avg }))
  if (!(typeof v === "number" && v > 0)) throw new Error(`car-running-costs.json: ${k} is not a positive number`);
run.sources = Object.fromEntries([...rcUsed].map((id) => {
  const s = rc.meta.sources[id];
  return [id, { text: s.name + (s.type === "secondary" ? " (estimate)" : ""), url: s.url }];
}));
// Flats: the price of old flats by postcode, as [name, studio, two rooms, three rooms or more, terraced], each [€/m², sales] or 0.
const SALE_TYPES = ["studio", "two_room", "three_room_plus", "terraced"];
const saleCell = (c) => (c && c.eurPerM2 > 0 && c.sales > 0 ? [c.eurPerM2, c.sales] : 0);
const areaPrices = {
  year: salePrices.year, url: salePrices.url,
  by: Object.fromEntries(Object.entries(salePrices.byPostcode).map(([pc, a]) => [pc, [a.name, ...SALE_TYPES.map((t) => saleCell(a.types[t]))]])),
};
// Rentals: average rent per m² a month for privately financed flats, by rooms 1, 2, 3+ (and every size for municipalities).
const RENT_ROOMS = ["1", "2", "3+", "all"];
const rentSrc = Object.fromEntries(rentAreas.meta.sources.map((s) => [s.id, s]));
const rentCell = (c) => (c && c.eurPerM2 > 0 ? [c.eurPerM2, c.obs ?? null, c.eurPerM2New ?? null, c.obsNew ?? null] : 0);
const rents = {
  muni: Object.fromEntries(Object.entries(rentAreas.municipalities).map(([name, m]) => [name, RENT_ROOMS.map((k) => rentCell(m[k]))])),
  // A postcode's name is left out (0) when the sale prices already have the same one.
  post: Object.fromEntries(Object.entries(rentAreas.postcodes).map(([pc, p]) => [pc, [areaPrices.by[pc]?.[0] === p.name ? 0 : p.name,
    ...RENT_ROOMS.slice(0, 3).map((k) => (p.rooms[k]?.eurPerM2 > 0 ? [p.rooms[k].eurPerM2, p.rooms[k].obs] : 0))]])),
  muniPeriod: rentSrc.municipalities.period, muniUrl: rentSrc.municipalities.url,
  postPeriod: rentSrc.postcodes.period, postUrl: rentSrc.postcodes.url,
};
if (!rents.muni.Tampere || !rents.post["33720"]) throw new Error("rent-areas.json: Tampere or 33720 missing; refetch with tools/fetch-rent-areas.mjs");
// The facts behind the questions a flat ad's own words raise, with their sources.
const fc = flatChecks;
const flat = {
  src: Object.fromEntries(Object.entries(fc.sources).map(([id, s]) => [id, { text: `${s.publisher}: ${s.title}${s.date ? ` (${s.date.slice(0, 4)})` : ""}`, url: s.url, secondary: s.type === "secondary" }])),
  plot: { pct: fc.plotLease.helsinki.yearlyRentPctOfPlotValue, fullAfter: fc.plotLease.helsinki.fullRentAfterYears, firstPct: fc.plotLease.helsinki.firstYearPctOfNewRent,
    upTo: fc.plotLease.press.upToTimes, exCity: fc.plotLease.press.example.city, exTimes: fc.plotLease.press.example.times, pressDate: fc.sources["yle-plot"].date },
  energyValid: fc.energy.validYearsMax,
  oilSaid: fc.oilHeating.goalYearSaid,
};

// Radon by municipality (STUK) and significant flood risk areas (SYKE), for houses and, through areaRisks(), flats.
// Sources become "r-<id>" and "f-<id>" in the page's source list.
const radonFile = read("radon-municipalities.json");
const floodFile = read("flood-risk-areas.json");
const srcList = (sources, prefix) => Object.fromEntries(Object.entries(sources).map(([id, s]) => [`${prefix}${id}`, { text: s.name, url: s.url }]));
const ids = (s) => (Array.isArray(s) ? s : [s]);
const radon = {
  ref: radonFile.referenceLevel.bqM3, refNew: radonFile.referenceLevel.newBuildingBqM3, refSrc: ids(radonFile.referenceLevel.source).map((x) => `r-${x}`),
  national: [radonFile.national.avgBqM3, radonFile.national.shareOver300Pct, radonFile.national.measurements],
  allHomes: radonFile.national.allDwellings?.avgBqM3 ?? null, allHomesSrc: `r-${radonFile.national.allDwellings?.source}`,
  src: "r-stuk-radon-municipalities",
  // municipality -> [average Bq/m³, % above 300, dwellings measured, last measurement year]; null where STUK has no figure
  m: Object.fromEntries(Object.entries(radonFile.municipalities).filter(([, r]) => r.avgBqM3 != null).map(([k, r]) => [k, [r.avgBqM3, r.shareOver300Pct, r.measurements]])),
  alias: radonFile.aliases ?? {},
  sources: srcList(radonFile.meta.sources, "r-"),
};
for (const [k, r] of Object.entries(radonFile.municipalities)) if (r.avgBqM3 != null && r.source !== "stuk-radon-municipalities") throw new Error(`radon ${k}: unexpected source`);
const flood = {
  src: "f-syke-flood-risk-areas", mapSrc: "f-syke-flood-map", lawSrc: "f-law-620-2010",
  a: floodFile.areas.map((x) => [x.name, x.floodTypes, x.designated]),
  m: Object.fromEntries(Object.entries(floodFile.byMunicipality).map(([k, list]) => [k, list.map((id) => floodFile.areas.findIndex((x) => x.id === id))])),
  sources: srcList(floodFile.meta.sources, "f-"),
};
for (const [k, list] of Object.entries(flood.m)) if (list.some((i) => i < 0)) throw new Error(`flood ${k}: unknown area`);
for (const id of [flood.src, flood.mapSrc, flood.lawSrc]) if (!flood.sources[id]) throw new Error(`flood source ${id} missing`);

// Houses and cottages (house-rules.json): the law, the transfer tax, prices, risk structures and If's terms. Each fact
// keeps its plain-English rule and its sources, which become "h-<id>"; a fact the research couldn't confirm is left out.
const hr = read("house-rules.json");
const rcost = read("car-running-costs.json");
const uniq = (a) => [...new Set(a)];
const hs = (s) => (s == null ? [] : ids(s).map((x) => `h-${x}`));
const need = (v, what) => { if (v == null) throw new Error(`house-rules.json: ${what} missing`); return v; };
const fact = (o) => (o && o.rule ? { rule: o.rule, src: hs(o.source) } : null);
const P = (path) => path.split(".").reduce((o, k) => (o == null ? o : o[k]), hr);
const elecBand = (band, key) => band && { cents: band.latest.total, month: band.latest.month, label: band.label.replace(/ \(.*\)$/, ""), key };
const ehh = rcost.energy.electricityPrices.householdTypes;
const house = {
  sources: srcList(hr.meta.sources, "h-"),
  land: { years: need(P("landCode.noticeTime.maxYearsFromPossession"), "landCode.noticeTime"), src: hs(P("landCode.noticeTime.source")) },
  tt: { pct: need(P("transferTax.ratePct"), "transferTax.ratePct"), src: hs(P("transferTax.source")) },
  title: P("titleRegistration.feeEur.value") != null ? { fee: P("titleRegistration.feeEur.value"), year: +P("titleRegistration.feeEur.validFrom").slice(0, 4), src: hs(P("titleRegistration.feeEur.source")) } : null,
  ptax: { src: hs(P("propertyTax.source")).find((x) => /2026/.test(x)) ?? hs(P("propertyTax.source"))[0] },
  ww: {
    near: P("wastewater.nearWaterOrGroundwater.rule"), elsewhere: P("wastewater.elsewhere.rule"), docs: P("wastewater.documents.rule"),
    exemption: P("wastewater.exemption.rule") ? "An exemption granted to the seller lapses when the property changes owner." : null,
    src: uniq([...hs(P("wastewater.nearWaterOrGroundwater.source")), ...hs(P("wastewater.elsewhere.source")), ...hs(P("wastewater.documents.source")), ...hs(P("wastewater.exemption.source"))]),
  },
  cottage: { use: P("cottage.useChange.rule"), useSrc: hs(P("cottage.useChange.source")), road: P("cottage.privateRoad.rule"), roadSrc: hs(P("cottage.privateRoad.source")) },
  kt: {
    low: need(P("conditionInspection.rangeEur"), "conditionInspection.rangeEur")[0], high: P("conditionInspection.rangeEur")[1],
    src: uniq(P("conditionInspection.prices").flatMap((x) => hs(x.source))),
    what: P("conditionInspection.what.rule"), whatSrc: hs(P("conditionInspection.what.source")),
  },
  risk: Object.fromEntries([["plinth", "falsePlinth"], ["crawl", "crawlSpace"], ["flat", "flatRoof"], ["slab", "slabOnGround"], ["basement", "basement"]]
    .map(([k, key]) => { const r = P(`riskStructures.${key}`); return [k, r?.rule ? { rule: r.rule, from: r.eraFrom ?? null, to: r.eraTo ?? null, src: hs(r.source) } : null]; })),
  radon: {
    months: need(P("radon.howToMeasure.minMonths"), "radon.howToMeasure"), season: "between the start of September and the end of May",
    price: P("radon.measurementPriceEur.value"), src: uniq([...hs(P("radon.howToMeasure.source")), ...hs(P("radon.measurementPriceEur.source"))]),
    well: P("radon.drilledWell.rule"), wellSrc: hs(P("radon.drilledWell.source")),
  },
  oil: {
    tank: { rule: `${P("oilHeating.tankInspection.rule")} ${P("oilHeating.tankInspection.insurerRule.rule") ?? ""}`.trim(), src: uniq([...hs(P("oilHeating.tankInspection.source")), ...hs(P("oilHeating.tankInspection.insurerRule.source"))]) },
    spill: fact(P("oilHeating.spill")),
    ground: P("oilHeating.switch.groundSourceEur"), air: P("oilHeating.switch.airToWaterEur"), switchSrc: hs(P("oilHeating.switch.source")),
  },
  well: { rule: P("well.rule"), every: P("well.testEveryYears"), src: uniq([...hs(P("well.source")), ...hs(P("well.secondary.source"))]) },
  life: {
    roof: { felt: P("lifetimes.roof.byMaterial.felt"), "sheet metal": P("lifetimes.roof.byMaterial.sheet"), tile: P("lifetimes.roof.byMaterial.tile"), src: hs(P("lifetimes.roof.source")) },
    drain: { years: need(P("lifetimes.drainage.lifeYears"), "lifetimes.drainage"), src: hs(P("lifetimes.drainage.source")) },
  },
  ins: {
    fire: fact(P("insurance.fire")), leak: fact(P("insurance.leak")), storm: fact(P("insurance.storm")), defects: fact(P("insurance.defects")),
    flood: P("insurance.flood.rule") ? { ...fact(P("insurance.flood")), covered: true, who: "Covered by home insurance · if the flood counts as exceptional" } : null,
    empty: P("insurance.emptyBuilding.rule") ? { ...fact(P("insurance.emptyBuilding")),
      short: `If the building stands empty for over ${P("insurance.emptyBuilding.uninhabitedOverDays") === 7 ? "a week" : `${P("insurance.emptyBuilding.uninhabitedOverDays")} days`}, close the main water valve and switch off the water pump: If’s home insurance terms require it.` } : null,
    hdi: P("insurance.hiddenDefectInsurance.exists") ? { rule: `A seller can insure their own hidden-defect liability: one such policy, sold with a condition inspection, covers up to €${P("insurance.hiddenDefectInsurance.sumInsuredEur").toLocaleString("en-GB")} for ${P("insurance.hiddenDefectInsurance.periodYears")} years after the handover (secondary source).`, src: hs(P("insurance.hiddenDefectInsurance.source")) } : null,
  },
  elec: {
    D: elecBand(ehh.D, "D"), E: P("electricity.totalCents") != null ? { cents: P("electricity.totalCents"), month: P("electricity.month"), label: "household, over 15,000 kWh a year" } : null,
    src: ["h-sf-13rb"],
    oil: P("heatingOil.centsPerLitre") != null ? { cents: P("heatingOil.centsPerLitre"), month: P("heatingOil.month") } : P("electricity.heatingOil.centsPerLitre") != null ? { cents: P("electricity.heatingOil.centsPerLitre"), month: P("electricity.heatingOil.month") } : null,
    oilSrc: ["h-sf-12ge"],
  },
};
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
    run,
    rentDepositMaxMonths: rent.deposit.maxMonthsOfRent.value,
    areaPrices,
    rents,
    flat,
    moto,
    radon,
    flood,
    house,
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
