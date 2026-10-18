// Runs the page's own reader against data/sample-ads.json and a few extra ads, in Node, no browser.
//   node apps/what-if/test/reader.test.mjs          pass/fail per field
//   node apps/what-if/test/reader.test.mjs --show   also print each result's asks and who pays
// It takes the engine from index.html (between /* engine:start */ and /* engine:end */), so it tests
// exactly the code the page runs.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const html = readFileSync(join(root, "index.html"), "utf8");
const data = JSON.parse(html.match(/<script id="wi-data" type="application\/json">([\s\S]*?)<\/script>/)[1]);
const code = html.slice(html.indexOf("/* engine:start */"), html.indexOf("/* engine:end */"));
const createEngine = new Function(`${code}\nreturn createEngine;`)();
const engine = createEngine(data, new Date("2026-10-17T12:00:00"));
const samples = JSON.parse(readFileSync(join(root, "data", "sample-ads.json"), "utf8"));
const motoSamples = JSON.parse(readFileSync(join(root, "data", "sample-ads-moto.json"), "utf8"));
// In the motorcycle samples a null means "must not be read" (moto-4 has no year: the result asks for it).
const tests = [...samples.tests, ...motoSamples.tests.map((t) => ({ ...t, strictNull: true }))];
const show = process.argv.includes("--show");

// The fields the rules use. Only fields with a non-null expected value are compared.
const CORE = {
  car: ["make", "model", "year", "km", "price", "previousPrice", "officeFee", "fuel", "gearbox", "sellerType", "city", "lastInspection",
    "flags.timingBeltReplaced", "flags.timingChain", "flags.serviceBook", "flags.rustMentioned", "flags.hybridBatteryChecked", "flags.imported"],
  home: ["buildingYear", "livingAreaM2", "debtFreePrice", "sellingPrice", "debtShare", "maintenanceCharge", "financingCharge", "plotRentCharge",
    "city", "district", "rooms", "pipeRenovation.status", "pipeRenovation.years", "postcode", "plotLeaseEnds", "energyClass", "energyClassScale", "heating"],
  rent: ["rent", "deposit", "depositMonths", "buildingYear", "livingAreaM2", "homeInsuranceRequired", "city", "district", "rooms", "postcode"],
  moto: ["make", "model", "year", "km", "price", "officeFee", "engineCc", "powerKw", "licence", "sellerType", "city", "lastInspection", "abs", "modified"],
};
const get = (o, path) => path.split(".").reduce((v, k) => (v == null ? v : v[k]), o);
const same = (a, b) => {
  if (typeof a === "number" && typeof b === "number") return Math.abs(a - b) < 0.011;
  if (typeof a === "string" && typeof b === "string") return a.toLowerCase() === b.toLowerCase();
  return JSON.stringify(a) === JSON.stringify(b);
};

let pass = 0, fail = 0;
const failures = [];
for (const t of tests) {
  const got = engine.read(t.text);
  const bad = [];
  if (got.kind !== t.kind) bad.push(`kind: expected ${t.kind}, got ${got.kind}`);
  else {
    for (const f of CORE[t.kind]) {
      const want = get(t.expected, f);
      const have = get(got, f);
      if (want === null && t.strictNull && f in t.expected) { if (have != null) bad.push(`${f}: expected null, got ${JSON.stringify(have)}`); continue; }
      if (want == null) continue;
      if (!same(want, have)) bad.push(`${f}: expected ${JSON.stringify(want)}, got ${JSON.stringify(have)}`);
    }
  }
  const extras = got.kind ? CORE[got.kind].filter((f) => get(t.expected, f) == null && get(got, f) != null && get(got, f) !== false)
    .map((f) => `${f}=${JSON.stringify(get(got, f))}`) : [];
  if (bad.length) { fail++; failures.push([t.id, bad]); } else pass++;
  console.log(`${bad.length ? "FAIL" : "pass"}  ${t.id.padEnd(7)} ${t.site.padEnd(20)} ${bad.length ? bad.join("; ") : ""}${extras.length ? `  (also read: ${extras.join(", ")})` : ""}`);
}

// Every sample must also give a full result: three asks, each with who pays, the hand-over, known sources.
const strip = (s) => String(s).replace(/<[^>]+>/g, "");
const results = [];
for (const t of tests) results.push([t.id, t.text]);
// The curated examples' texts, as if someone edited them: they go through the reader then.
for (const m of html.matchAll(/^\s*ad: ("(?:[^"\\]|\\.)*"),$/gm)) results.push([`curated ${JSON.parse(m[1]).slice(0, 18)}…`, JSON.parse(m[1]) + "\n"]);
const EXTRA = [
  ["edited Mégane", "Renault Mégane 1.6, 2009\n156 000 km, petrol, manual\nKatsastettu 5/2026\nYksityinen myyjä, Oulu\nHinta 2 900 €"],
  ["BMW, dealer, English", "BMW 320d Touring\n€14,900\nYear model 2016 (first reg. 3-2016)\nMileage 178 000 km\nDiesel, automatic\nInspection date 11/2025\nSeller: Autotalo Esimerkki, Espoo\nOffice fee 249 €"],
  ["Mercedes, no seller", "Mercedes-Benz C 220 CDI\n2011\n265 000 km\nDiesel\nAutomaatti\nHinta 7 450 €\nVantaa"],
  ["old home, no pipes", "Myydään kaksio Pori\nKerrostalo, rakennusvuosi 1968\n52 m²\nVelaton hinta 79 000 €\nMyyntihinta 79 000 €\nHoitovastike 260 € / kk"],
  ["detached house, short", "Omakotitalo, Kaarina\n5h, k, s, 142 m²\nRakennusvuosi 1979\nHinta 245 000 €\nTontti 1 200 m², oma"],
  ["capital-region rental", "Vuokrataan yksiö, Helsinki Kallio\nKerrostalo 1961\n27 m²\nVuokra 890 €/kk\nVakuus 3 kk:n vuokra\nKotivakuutus vaaditaan"],
  ["motorbike, short", "Yamaha MT-07 689 cm³\n2019\n15 000 km\nMoottoripyörä, katupyörä\nHinta 5 900 €\nTampere"],
];
const ODD = [
  ["link", "https://www.nettiauto.com/skoda/octavia/16000001", /link to Nettiauto/],
  ["motorbike link", "https://www.nettimoto.com/yamaha/mt-07/1234567", /link to Nettimoto.*paste it here/],
  ...motoSamples.notSupported.map((x) => [x.id, x.text, new RegExp(`looks like an? ${x.want === "atv" ? "ATV" : x.want}.*full version`)]),
  // Houses and cottages are read now (the "houses" group below); a plot with nothing built on it is not.
  ["building plot", "Myydään rakentamaton tontti, Lieto\nTontin pinta-ala 1 400 m²\nHinta 45 000 €\nKunnallistekniikka tontin rajalla", /looks like a building plot.*Plots come in the full version/],
  ["unknown", "Selling my sofa, three seats, grey fabric, a few years old. Pick up in Turku. 120 €", /couldn’t tell/],
  ["too short", "Golf 2010", /Paste the whole ad/],
];
let structural = 0;
const check = (label, r) => {
  const problems = [];
  if (r.message) problems.push(`message instead of a result: ${r.message}`);
  else {
    if (r.asks.length !== 3) problems.push(`${r.asks.length} asks`);
    [...r.asks, ...(r.more ?? [])].forEach((a, i) => { if (!a.who) problems.push(`ask ${i + 1} has no who-pays`); if (!a.tag) problems.push(`ask ${i + 1} has no tag`); });
    if (!r.insure?.title || !/reminders/i.test(r.insure.title)) problems.push("no hand-over card");
    if (!r.cover?.items?.length) problems.push("no who-pays section");
    for (const id of r.sources) if (!engine.SRC[id]?.url) problems.push(`unknown source ${id}`);
    if (/undefined|NaN|null/.test(JSON.stringify(r).replace(/"(?:eur|cost|tip|link|safer|notif)":null/g, ""))) problems.push("undefined/NaN/null text in the result");
  }
  if (problems.length) { structural++; console.log(`FAIL  result ${label}: ${problems.join("; ")}`); }
  if (show && !r.message) {
    console.log(`\n=== ${label}: ${strip(r.stamp)} · ${strip(r.name)} · ${strip(r.specs)}`);
    r.asks.forEach((a, i) => console.log(`  ${i + 1}. ${strip(a.q)}  [${strip(a.who)}]  ${a.cost || ""}\n     ${strip(a.why)}\n     ${strip(a.whatif)}`));
    if (r.costs) console.log("  costs: " + r.costs.map((c) => `${c.what} ${c.eur == null ? "(quote)" : Math.round(c.eur)}`).join(" | "));
    if (r.safer) console.log("  safer: " + (r.safer.bars ? r.safer.bars.map((b) => `${strip(b.label)} ${b.pct}`) : r.safer.points).join(" | "));
    console.log("  later: " + r.later.list.map((l) => `${l.when}: ${l.text}`).join(" | "));
  }
};
for (const [id, text] of results) if (text) check(id, engine.analyse(text));
for (const [label, text] of EXTRA) check(label, engine.analyse(text));
for (const [label, text, want] of ODD) {
  const r = engine.analyse(text);
  const ok = r.message && want.test(r.message);
  if (!ok) structural++;
  console.log(`${ok ? "pass" : "FAIL"}  ${label.padEnd(15)} ${r.message ?? "(gave a result: " + r.name + ")"}`);
}

// Things real pages do that the samples don't: the site's menu names sister sites, "no rust found", a chain engine.
const real = engine.read("Siirry sisältöön\nAutotalli\nNettimoto\nNettivene\nNettikaravaani\nNettiauto\nMyydään\nToyota\nAvensis\nIlmoitus\nToyota Avensis\n3 695 €\nalk. 70,47 €/kk\nMustasaari, Pohjanmaa\nBensiini\n2005\n255 000 km\nManuaali\nBensa Avensis luotettavalla ketjukoneella.\nMittarilukema\n255 000 km\nVuosimalli\n2005 (ensirek. 1-2005)\nKatsastettu\n8/2026\nMerkittäviä peltiruosteita ei siis havaittu.\nMyyjä\nJäsenenä 9 vuotta\nTunnistettu yksityinen myyjä\nSINUA SAATTAISI KIINNOSTAA\nBMW M2\n45 000 €\n2016, 125 tkm");
const realBad = [["kind", "car"], ["model", "Avensis"], ["price", 3695], ["year", 2005], ["sellerType", "private"], ["city", "Mustasaari"]]
  .filter(([k, v]) => !same(v, real[k])).map(([k, v]) => `${k}: expected ${v}, got ${real[k]}`);
if (!real.flags?.timingChain) realBad.push("ketjukone not read as a timing chain");
if (real.flags?.rustMentioned) realBad.push("'no rust found' read as rust");
if (realBad.length) structural++;
console.log(`${realBad.length ? "FAIL" : "pass"}  real-page car    ${realBad.join("; ")}`);

// Vaishnav's YZF-R125 ad has no year: the result asks for it instead of guessing.
const yzf = engine.analyse(motoSamples.tests.find((t) => t.id === "moto-4").text);
const yzfOk = !yzf.message && /year/i.test(yzf.asks?.[0]?.q ?? "");
if (!yzfOk) structural++;
console.log(`${yzfOk ? "pass" : "FAIL"}  no year, asks     ${yzf.message ?? strip(yzf.asks?.[0]?.q ?? "")}`);

// Only parts the car has: no timing belt on an electric car, no clutch on an automatic. `must` is what the result
// has to name, `never` what it must not, anywhere in its asks, costs, sources, who pays or readout.
const POWERTRAINS = [
  ["electric", "Tesla Model 3 Long Range\n2019\n142 000 km\nSähkö\nAutomaatti\nHinta 21 900 €\nYksityinen myyjä, Turku", "electric", /battery/i, /timing belt|clutch/i],
  ["electric, English", "Nissan Leaf 40 kWh\n2018\n96 000 km\nFuel: Electric\nAutomatic\nPrice 9 900 €\nPrivate seller, Espoo\nBattery health (SoH) 87 %", "electric", /at 87%/, /timing belt|clutch/i],
  ["electric, dealer", "Volkswagen ID.3 Pro\n2021\n68 000 km\nTäyssähkö\nHinta 19 500 €\nAutoliike, Tampere\nToimistomaksu 199 €", "electric", /electric motor fails/, /timing belt|clutch/i],
  ["automatic petrol", "Mazda 2 1.5\n2012\n188 000 km\nBensiini\nAutomaatti\nHinta 7 900 €\nYksityinen myyjä, Oulu", "petrol", /timing belt/i, /clutch/i],
  // data/timing-drive.json: the Corolla's 1.6 has a chain, so no belt anywhere and "engine" in who pays.
  ["automatic petrol, chain", "Toyota Corolla 1.6\n2012\n188 000 km\nBensiini\nAutomaatti\nHinta 7 900 €\nYksityinen myyjä, Oulu", "petrol", /breaks down: engine, gearbox.*Timing chain \(/, /timing belt|clutch/i],
  ["hybrid", "Toyota Auris Hybrid\n2015\n180 000 km\nHybridi (bensiini/sähkö)\nAutomaatti\nHinta 10 900 €\nYksityinen myyjä, Turku", "hybrid-petrol", /hybrid battery/, /clutch/i],
  ["manual petrol", "Ford Focus 1.6\n2010\n160 000 km\nManuaali\nSähköikkunat, electric mirrors\nHinta 3 900 €\nYksityinen myyjä, Pori", null, /timing belt.*clutch/i, /battery/i],
];
const powerBad = [];
for (const [label, text, fuel, must, never] of POWERTRAINS) {
  const r = engine.analyse(text);
  check(label, r);
  const said = strip(JSON.stringify([r.asks, r.costs, r.sources, r.cover?.items, r.readout]));
  if ((engine.read(text).fuel ?? null) !== fuel) powerBad.push(`${label}: fuel read as ${engine.read(text).fuel}`);
  if (!must.test(said)) powerBad.push(`${label}: doesn't say ${must}`);
  if (never.test(said)) powerBad.push(`${label}: says ${said.match(never)[0]}`);
}
if (powerBad.length) structural++;
console.log(`${powerBad.length ? "FAIL" : "pass"}  powertrains      ${powerBad.join("; ")}`);

// Each ad must give a full result; `want` lists what must be true of it. `said` is everything a person reads.
const said = (r) => strip(JSON.stringify([r.asks, r.costs, r.safer, r.sources]));
const taxRow = (r) => r.costs?.find((x) => x.what === "Vehicle tax");
const group = (label, cases) => {
  const bad = [];
  for (const [name, text, ...wants] of cases) {
    const r = engine.analyse(text);
    check(`${label}: ${name}`, r);
    for (const [why, ok] of wants) if (!ok(r, engine.read(text))) bad.push(`${name}: ${why}`);
  }
  if (bad.length) structural++;
  console.log(`${bad.length ? "FAIL" : "pass"}  ${label.padEnd(16)} ${bad.join("; ")}`);
};

// 1. An electric car is compared only with electric models (data/powertrain-models.json). In 2018 no other electric
// model had 800 inspections, so the result says so instead of suggesting a petrol car.
const EV_NAMES = /^(?:Nissan Leaf|Tesla Model [3SXY]|Volkswagen ID\.[34]|\S+ Enyaq|Hyundai Ioniq ?5|Polestar 2|Mercedes-Benz EQA)$/i;
const evOnly = (r) => r.safer.bars.filter((b) => !/this ad|All cars/.test(b.label)).every((b) => EV_NAMES.test(strip(b.label)));
group("electric safer", [
  ["Leaf 2018", "Nissan Leaf 40 kWh\n2018\n96 000 km\nFuel: Electric\nAutomatic\nPrice 9 900 €\nPrivate seller, Espoo",
    ["says too few", (r) => /Too few electric cars from 2018/.test(r.safer?.title)], ["no petrol cars", (r) => !/Avensis|Auris|Golf/.test(said(r))]],
  ["Leaf 2019", "Nissan Leaf\n2019\n70 000 km\nSähkö\nAutomaatti\nHinta 13 900 €\nYksityinen myyjä, Turku",
    ["electric title", (r) => /electric cars from 2019/.test(r.safer?.title)], ["Model 3 in it", (r) => /Tesla Model 3/.test(said(r))], ["electric only", (r) => evOnly(r)]],
  ["Model 3, no fuel line", "Tesla Model 3 Long Range\n2021\n80 000 km\nAutomaatti\nHinta 26 900 €\nAutoliike, Vantaa",
    ["electric only", (r) => /electric cars from 2021/.test(r.safer?.title) && evOnly(r)], ["battery, no belt", (r) => /battery’s health/.test(said(r)) && !/timing belt/i.test(said(r)), ]],
  ["e-Golf stays mixed", "Volkswagen e-Golf\n2018\n90 000 km\nAutomaatti\nHinta 12 900 €\nYksityinen myyjä",
    ["old comparison", (r) => /^(Common cars|This one is among the cars) from 2018/.test(r.safer?.title)]],
]);

// 2. Vehicle tax: the worked examples in car-rules.json, then the same through ads, and the calculator when inputs are missing.
const carRules = JSON.parse(readFileSync(join(root, "data", "car-rules.json"), "utf8"));
const EXAMPLE_INPUTS = {
  "Petrol car, NEDC 150 g/km": { fuel: "petrol", co2: 150, co2Method: "NEDC", year: 2015 },
  "Diesel car, NEDC 120 g/km, total mass 1,900 kg": { fuel: "diesel", co2: 120, co2Method: "NEDC", year: 2015, totalMassKg: 1900 },
  "Electric car first used on or after 1.10.2021, total mass 2,200 kg": { fuel: "electric", firstUse: "2021-10-01", totalMassKg: 2200 },
};
const exBad = carRules.vehicleTax.examples.map((ex) => [ex, engine.vehicleTax(EXAMPLE_INPUTS[ex.label] ?? {})])
  .filter(([ex, got]) => got.eur !== ex.eurPerYear).map(([ex, got]) => `${ex.label}: expected ${ex.eurPerYear}, got ${JSON.stringify(got)}`);
if (!exBad.length && engine.vehicleTax({ fuel: "electric", firstUse: "2021-09-30", totalMassKg: 2200 }).eur !== Math.floor(((291 + 19 * 22) * 365) / 10) / 100) exBad.push("electric before 1.10.2021 has no extra");
if (exBad.length) structural++;
console.log(`${exBad.length ? "FAIL" : "pass"}  tax examples     ${exBad.join("; ")}`);
const ex = Object.fromEntries(carRules.vehicleTax.examples.map((e, i) => [i, e.eurPerYear]));
// A year's tax for a daily rate in cents, rounded down to the cent (the act's rule).
const yearOf = (cents) => Math.floor((Math.round(cents * 10) * 365) / 10) / 100;
const calcLink = (r) => taxRow(r)?.eur == null && /ajoneuvoverolaskuri/.test(taxRow(r)?.link?.href ?? "");
group("vehicle tax", [
  ["petrol NEDC", "Toyota Avensis 1.8\n2014\n150 000 km\nBensiini\nManuaali\nHinta 7 900 €\nCO2-päästöt (NEDC) 150 g/km\nYksityinen myyjä, Turku",
    ["two years of example 1", (r) => taxRow(r)?.eur === 2 * ex[0]]],
  ["diesel, Nettiauto labels", "Skoda Octavia\n2015\n189 000 km\nDiesel\nAutomaatti\nHinta 9 990 €\nKäyttöönottopäivä\n18.05.2015\nEnergiamerkintä\nB\n120 g/km (NEDC)\nKokonaismassa\n1 900 kg\nOmamassa\n1 340 kg\nAutoliike, Tampere",
    ["two years of example 2", (r) => taxRow(r)?.eur === 2 * ex[1]], ["reads 2015-05-18", (r, f) => f.firstUse === "2015-05-18" && f.totalMassKg === 1900]],
  ["electric, first reg. 11-2021", "Volkswagen ID.4 Pro\nVuosimalli 2022 (ensirek. 11-2021)\n40 000 km\nSähkö\nHinta 32 900 €\nKokonaismassa 2 200 kg\nAutoliike, Espoo",
    ["two years of example 3", (r) => taxRow(r)?.eur === 2 * ex[2]]],
  ["diesel, only omamassa", "Skoda Octavia\n2015\n189 000 km\nDiesel\nHinta 9 990 €\nCO2 120 g/km (NEDC)\nOmamassa 1 340 kg\nYksityinen myyjä, Turku",
    ["calculator, never the kerb weight", (r, f) => calcLink(r) && f.totalMassKg == null && /total mass/.test(taxRow(r).note)]],
  ["CO2 without a method, 2019", "Toyota Corolla\n2019\n43 000 km\nPetrol\nPrice 18 200 €\nEnergy label\nD\n154 g/km\nPrivate seller, Kuopio",
    ["both amounts, no total", (r) => calcLink(r) && /NEDC/.test(taxRow(r).note) && /WLTP/.test(taxRow(r).note)]],
  ["CO2 without a method, 2010: NEDC", "Toyota Avensis\n2010\n243 000 km\nPetrol\nPrice 6 200 €\nEnergy label\nD\n154 g/km\nPrivate seller, Kuopio",
    ["Table 1", (r) => taxRow(r)?.eur === 2 * yearOf(data.facts.tax.nedc[154]) && /NEDC, as for every car from before 2017/.test(taxRow(r).note)]],
  ["nothing about tax", "Ford Focus 1.6\n2010\n160 000 km\nBensiini\nManuaali\nHinta 3 900 €\nYksityinen myyjä, Pori",
    ["calculator", (r) => calcLink(r) && /CO2 figure/.test(taxRow(r).note)]],
  ["ordinary hybrid", "Toyota Auris Hybrid\n2015\n180 000 km\nHybridi (bensiini/sähkö)\nAutomaatti\nCO2 (NEDC) 79 g/km\nKokonaismassa 1 760 kg\nHinta 10 900 €\nYksityinen myyjä, Turku",
    ["calculator", (r) => calcLink(r)]],
]);

// 3. Far fewer km than the model's median for its year: worth checking, never an accusation.
group("low km", [
  ["Avensis at 12,000 km", "Toyota Avensis\n2010\n12 000 km\nBensiini\nManuaali\nHinta 6 000 €\nYksityinen myyjä, Kuopio",
    ["worth checking", (r) => /under half the median, which is worth checking/.test(strip(r.asks[0].why)) && /traficom/i.test(r.asks[0].link?.href ?? "")]],
  ["Avensis at 243,000 km", "Toyota Avensis\n2010\n243 000 km\nBensiini\nManuaali\nHinta 6 000 €\nYksityinen myyjä, Kuopio",
    ["nothing said", (r) => !/worth checking/.test(strip(r.asks[0].why))]],
]);

// 4. A hybrid's battery: a report if the ad says it was checked; below a timing belt that may be due.
group("hybrid battery", [
  ["chain, not checked", "Toyota Corolla 1.8 Hybrid\n2020\n60 000 km\nHybridi (bensiini/sähkö)\nAutomaatti\nJakoketju\nHinta 19 900 €\nAutoliike, Turku",
    ["asks about it second", (r) => /hybrid battery’s condition/.test(r.asks[1].q)]],
  // The Auris's 1.8 Hybrid has a chain (data/timing-drive.json), so the report comes straight after the inspection.
  ["checked, chain by the data", samples.tests.find((t) => t.id === "car-4").text,
    ["no belt, the report second", (r) => ![...r.asks, ...(r.more ?? [])].some((a) => /timing belt/.test(a.q)) && /report from the hybrid battery check/.test(r.asks[1].q)]],
  ["checked, belt unknown", "Kia Niro 1.6 Hybrid\n2017\n150 000 km\nHybridi (bensiini/sähkö)\nAutomaatti\nHybridiakku tarkastettu 2026.\nHinta 13 900 €\nAutoliike, Turku",
    ["belt first, then the report", (r) => /timing belt/.test(r.asks[1].q) && /report from the hybrid battery check/.test(r.asks[2].q)]],
]);

// 5. Imported cars, and the words that don't make one.
const imp = (r, f) => f.flags.imported === true && /before it came to Finland/.test(said(r));
const notImp = (r, f) => f.flags.imported === undefined && !/before it came to Finland/.test(said(r));
const golf = (line) => `Volkswagen Golf 1.4 TSI\n2016\n120 000 km\nBensiini\nAutomaatti\nHinta 11 900 €\nAutoliike, Espoo\n${line}`;
group("imported", [
  ["tuontiauto Saksasta", golf("Tuontiauto Saksasta, maahantuotu 2019."), ["imported", imp]],
  ["tuotu Ruotsista", golf("Auto on tuotu Ruotsista 2021, huoltokirja mukana."), ["imported", imp]],
  ["English", golf("Imported from Germany in 2020."), ["imported", imp]],
  ["importer's warranty", golf("Maahantuojan takuu voimassa 2027 asti."), ["not imported", notImp]],
  ["official importer", golf("Virallisen maahantuojan huoltama Suomi-auto."), ["not imported", notImp]],
  ["ei tuontiauto", golf("Suomi-auto, ei tuontiauto."), ["not imported", notImp]],
  ["not imported", golf("Not imported, first owner in Finland."), ["not imported", notImp]],
]);

// An inspection overdue by the ad's own date leads; one that isn't due yet changes nothing.
const avensis = (insp) => `Toyota Avensis\n2010\n243 000 km\nBensiini\nManuaali\nRekisterinumero\nABC-123\nKatsastettu\n${insp}\nHinta 4 900 €\nYksityinen myyjä, Turku`;
group("overdue", [
  ["last inspected 5/2024", avensis("5/2024"),
    ["leads", (r) => /since May 2024/.test(r.asks[0].q) && /due by May 2025/.test(r.asks[0].why)], ["plate pointed to", (r) => /plate, ABC-123/.test(r.asks[0].why)],
    ["stats kept", (r) => /26\.2% of 2010 Toyota Avensis/.test(r.asks[0].why)], ["use ban sourced", (r) => r.sources.includes("useban")],
    ["inspection now", (r) => r.costs.some((x) => /^Inspection now/.test(x.what))], ["later says when", (r) => r.later.list.some((l) => /was due by May 2025/.test(l.text))]],
  ["last inspected 8/2026", avensis("8/2026"),
    ["not overdue", (r) => /last inspection report/.test(r.asks[0].q) && !r.sources.includes("useban") && r.later.list.some((l) => l.when === "Aug 2027")]],
]);

// A changed car, from the ad's own words; negations and a repaired exhaust don't count.
const focus = (line) => `Ford Focus 2.0\n2012\n150 000 km\nBensiini\nManuaali\nJakoketju\nHinta 5 900 €\nYksityinen myyjä, Turku\n${line}`;
const modAsk = (r) => r.asks.find((a) => /What was changed/.test(a.q));
group("modified car", [
  ["chipattu, madallettu", focus("Chipattu ja madallettu, kierrejalat."),
    ["asks", (r) => /engine tuning and lowered suspension/.test(modAsk(r)?.why ?? "")], ["sources", (r) => r.sources.includes("m-traficom-modification") && r.sources.includes("m-vsl")]],
  ["muutoskatsastettu", focus("Tehoja nostettu, muutoskatsastettu 2023."), ["asks for the papers", (r) => /modification inspection papers/.test(modAsk(r)?.q ?? "")]],
  ["ei viritetty", focus("Täysin vakio, ei viritetty. Uusi pakoputkisto 2025."), ["nothing", (r, f) => !modAsk(r) && !f.modifications.length]],
]);

// A performance or variant badge that Traficom counts under the model: a caveat, and no everyday "safer choice".
const caveat = (badge, model) => [`says ${badge}`, (r, f) => f.badge === badge && new RegExp(`all ${model} cars together, not only the ${badge}`).test(r.asks[0].why) && !r.safer];
const plain = ["no badge", (r, f) => f.badge == null && !/not only the/.test(r.asks[0].why)];
group("variant badge", [
  ["Golf GTI", "Volkswagen Golf GTI\n2014\n140 000 km\nBensiini\nManuaali\nHinta 14 900 €\nYksityinen myyjä, Espoo", caveat("GTI", "Volkswagen Golf")],
  ["Focus ST", "Ford Focus ST 2.5\n2008\n180 000 km\nBensiini\nManuaali\nHinta 6 900 €\nYksityinen myyjä, Oulu", caveat("ST", "Ford Focus")],
  ["BMW M3", "BMW M3\n2010\n120 000 km\nBensiini\nManuaali\nHinta 29 900 €\nYksityinen myyjä, Vantaa", caveat("M3", "BMW 3 Series")],
  ["Golf R-Line is a trim", "Volkswagen Golf R-Line 1.4 TSI\n2016\n120 000 km\nBensiini\nAutomaatti\nHinta 13 900 €\nAutoliike, Espoo", plain],
  ["Focus ST-Line is a trim", "Ford Focus ST-Line 1.0\n2019\n60 000 km\nBensiini\nManuaali\nHinta 15 900 €\nAutoliike, Turku", plain],
]);

// Asks beyond the three go into `more`, in order: none is lost, and the three stay the top-ranked ones.
group("more to check", [
  ["imported, modified, rusty, belt due", "Volkswagen Golf 1.4 TSI\n2012\n160 000 km\nBensiini\nManuaali\nHinta 6 900 €\nYksityinen myyjä, Turku\nTuontiauto Saksasta. Chipattu. Pientä ruostetta helmoissa.",
    ["three asks, belt second", (r) => r.asks.length === 3 && /timing belt/.test(r.asks[1].q) && /What was changed/.test(r.asks[2].q)],
    ["the rest in more", (r) => ["before it came to Finland", "take it to a garage", "rust", "service history"].every((w) => r.more?.some((a) => a.q.includes(w)))],
    ["their sources too", (r) => r.sources.includes("kkv") && r.sources.includes("service")]],
]);

// A real Nettiauto ad (17.10.2026), as it was copied, with a made-up plate.
const IMPREZA = `Subaru Impreza
12 500 €
alk. 228,55 €/kk
Päivitetty 10.10.2026 Lieto, Varsinais-Suomi
ID 16009895
Large icon
Compare
Favorites
next
prev
Subaru Impreza
Subaru Impreza
Jaa
Vertaa
Bensiini
2005
272 000 km
Manuaali
Siisti ja ripeä WRX testimielessä myyntiin hetkellisestä aivohäiriöstä, kun on uutta harrastetta mielessä.
Perustiedot
Rekisterinumero
ABC-123
Mittarilukema
272 000 km
Moottori
2,0 l, Bensiini
Vuosimalli
2005
Vaihteisto
Manuaali
Vetotapa
Neliveto
Katsastettu
5/2024
Korimalli
Sedan
Auton tyyppi
Henkilöauto
Väri
Sininen metalliväri
Tekniset tiedot
Teho
207 kW / 282 Hv
Vääntö
400 Nm
Henkilömäärä
5
Ovien lkm
4
Ohjauslaite
Vasemmalla
Omamassa
1 445 kg
Kokonaismassa
1 850 kg
CO2 -päästöt
219 g/km
Polttoaineen kulutus
Maantie: 9 l/100 km
Energiamerkintä
Avaa
G
219 g/km`;
group("real Impreza ad", [
  ["Subaru Impreza WRX", IMPREZA,
    ["reads it", (r, f) => f.kind === "car" && f.modelKey === "subaru|impreza" && f.year === 2005 && f.km === 272000 && f.price === 12500 && f.lastInspection === "2024-05" && f.badge === "WRX"],
    ["overdue inspection first", (r) => /since May 2024/.test(r.asks[0].q) && /due by May 2025/.test(r.asks[0].why) && /plate, ABC-123/.test(r.asks[0].why)],
    ["belt asked, the general question: no Impreza in data/timing-drive.json", (r) => r.asks.some((a) => /Has the timing belt been changed\? Or does it have a chain\?/.test(a.q))
      && !Object.keys(data.facts.td.m).some((k) => k.startsWith("subaru|impreza"))],
    ["seller asked", (r) => r.asks.some((a) => /dealer or a private seller/.test(a.q))],
    ["WRX caveat", (r) => /all Subaru Impreza cars together, not only the WRX/.test(r.asks[0].why) && !r.safer],
    ["tax from 219 g/km, total mass not kerb weight", (r, f) => f.co2 === 219 && f.totalMassKg === 1850 && taxRow(r)?.eur === 2 * yearOf(data.facts.tax.nedc[219])],
    ["no power judged", (r, f) => !f.modifications.length && !r.asks.concat(r.more ?? []).some((a) => /What was changed/.test(a.q))]],
]);

// Timing belt or chain by engine (data/timing-drive.json): a claim only when every entry matching the model, year,
// fuel and the engine the ad names agrees; otherwise, and for a model or engine not in the data, the general question.
const beltQ = (r) => [...r.asks, ...(r.more ?? [])].find((a) => /timing belt/.test(a.q));
const drive = (r) => strip(r.readout.find(([k]) => /^Timing (?:drive|belt)$/.test(k))?.join(": ") ?? "");
const beltCost = (r) => r.costs.some((x) => x.what === "Timing belt, if due");
const breakdown = (r) => r.cover.items.find((i) => /breaks down/.test(i.what)).what;
const tdSourced = (r) => r.sources.some((s) => /^t-\d+$/.test(s) && engine.SRC[s].url);
const GENERAL = /Has the timing belt been changed\? Or does it have a chain\?/;
const general = (r) => GENERAL.test(beltQ(r)?.q ?? "") && /^Timing belt: /.test(drive(r)) && beltCost(r) && !r.sources.some((s) => s.startsWith("t-"));
group("timing drive", [
  ["Toyota Auris Hybrid 2015: chain", "Toyota Auris 1.8 Hybrid Active\n2015\n120 000 km\nHybridi (bensiini/sähkö)\nAutomaatti\nHinta 11 900 €\nYksityinen myyjä, Turku",
    ["no belt question or cost", (r) => !beltQ(r) && !beltCost(r)], ["readout", (r) => drive(r) === "Timing drive: Timing chain (Auris HSD press kit)"],
    ["engine, not timing belt, in who pays", (r) => breakdown(r) === "It breaks down: engine, gearbox, hybrid battery"], ["sourced", tdSourced]],
  ["VW Golf 1.6 TDI 2014: belt, no interval in the source", "Volkswagen Golf 1.6 TDI\n2014\n150 000 km\nDiesel\nManuaali\nHinta 7 900 €\nYksityinen myyjä, Oulu",
    ["names its belt", (r) => beltQ(r)?.q === "“Has the timing belt been changed?”" && /^This engine has a timing belt \(Volkswagen Self Study Program 820433\)\. Belts are usually changed around every/.test(strip(beltQ(r).why))],
    ["no interval stated", (r) => !/This engine’s belt is changed every/.test(strip(beltQ(r).why))],
    ["cost and readout", (r) => beltCost(r) && /^Timing drive: Timing belt \(Volkswagen/.test(drive(r)) && breakdown(r) === "It breaks down: timing belt, clutch, gearbox"], ["sourced", tdSourced]],
  ["Ford Focus 1.6 2010: belt with its interval", "Ford Focus 1.6\n2010\n160 000 km\nBensiini\nManuaali\nHinta 3 900 €\nYksityinen myyjä, Pori",
    ["states it with its source", (r) => /^This engine’s belt is changed every 160,000 km or 8 years, whichever comes first, says Haynes’s maintenance plan for the Ford Focus Mk II 2004-2012 \(estimate\)\./.test(strip(beltQ(r)?.why))],
    ["against the car's km and age", (r) => /This one has driven 160,000 km and is about 16 years old, so it is past that/.test(strip(beltQ(r).why))],
    ["readout", (r) => /^Timing drive: Timing belt, every 160,000 km or 8 years, whichever comes first \(Haynes’s maintenance plan for the Ford Focus Mk II 2004-2012, estimate\)$/.test(drive(r))],
    ["the source says estimate", (r) => r.sources.some((s) => /^t-/.test(s) && /\(estimate\)$/.test(engine.SRC[s].text))]],
  ["Peugeot 308 1.6 BlueHDi 2016: interval not for Finland", "Peugeot 308 SW 1.6 BlueHDi 120\n2016\n170 000 km\nDiesel\nManuaali\nHinta 8 900 €",
    ["belt, no interval", (r) => /^This engine has a timing belt \(Haynes’s/.test(strip(beltQ(r)?.why)) && !/175,000|every \d/.test(drive(r)) && !/175,000/.test(strip(beltQ(r).why))]],
  ["Ford Fiesta 1.0 EcoBoost 2014: wet belt", "Ford Fiesta 1.0 EcoBoost\n2014\n90 000 km\nBensiini\nManuaali\nHinta 6 900 €",
    ["says so", (r) => /^This engine has a wet belt, a timing belt that runs in engine oil \(/.test(strip(beltQ(r)?.why)) && /^Timing drive: Wet belt, in engine oil \(/.test(drive(r))]],
  ["engine code", "Volkswagen Golf\n2014\n150 000 km\nDiesel\nMoottorikoodi CRKB\nHinta 7 900 €", ["belt by its code", (r) => /^Timing drive: Timing belt \(/.test(drive(r))]],
  ["the ad's belt change with the data's belt", "Volkswagen Golf 1.6 TDI\n2014\n150 000 km\nDiesel\nManuaali\nJakohihna vaihdettu 120 000 km\nHinta 7 900 €",
    ["receipt", (r) => /This engine has a timing belt \(Volkswagen/.test(strip(beltQ(r)?.why)) && /changed at 120,000 km, says the ad$/.test(drive(r))]],
  ["the ad says belt, the data chain: the ad stands", "Toyota Auris 1.8 Hybrid\n2015\n150 000 km\nHybridi\nAutomaatti\nJakohihna vaihdettu 2022\nHinta 7 900 €",
    ["no claim", (r) => drive(r) === "Timing belt: changed in 2022, says the ad" && !r.sources.some((s) => s.startsWith("t-"))]],
  ["the ad says chain", "Toyota Corolla 1.8 Hybrid\n2020\n60 000 km\nHybridi (bensiini/sähkö)\nAutomaatti\nJakoketju\nHinta 19 900 €\nAutoliike, Turku",
    ["as before", (r) => drive(r) === "Timing belt: timing chain, says the ad" && !beltQ(r)]],
  // Audi's 2.0 TDI has a belt and its 2.7 TDI a chain: "TDI" alone matches both.
  ["entries disagree", "Audi A4 Avant TDI quattro\n2010\n200 000 km\nDiesel\nAutomaatti\nHinta 9 900 €", ["general question", general]],
  // A Golf 1.4 TSI of 2012 isn't in the data; its "1.4" must not match the 1.4 MPI entry.
  ["engine not in the data", "Volkswagen Golf 1.4 TSI\n2012\n160 000 km\nBensiini\nManuaali\nHinta 6 900 €", ["general question", general]],
  ["model not in the data", "Skoda Kodiaq 2.0 TDI\n2018\n150 000 km\nDiesel\nAutomaatti\nHinta 24 900 €", ["general question", general]],
  ["make not in Traficom's data", "Lada Niva 1.7\n2012\n100 000 km\nBensiini\nManuaali\nHinta 3 900 €", ["general question", general]],
  ["real Impreza ad", IMPREZA, ["general question", general]],
]);
{
  // Cars built from the AI's fields have no engine text: the general question, nothing undefined.
  const bad = [];
  for (const fields of [{ make: "Toyota", model: "Auris", year: 2015, km: 150000, price: 9000, fuel: "hybrid-petrol" },
    { make: "Volkswagen", model: "Golf", year: 2014, km: 150000, price: 7900, fuel: "diesel" }]) {
    const r = engine.fromAI("car", fields, "", "m");
    check(`AI ${fields.model}`, r);
    if (!general(r)) bad.push(`${fields.model}: ${drive(r)} · ${beltQ(r)?.q}`);
    if (/undefined|NaN/.test(JSON.stringify(r))) bad.push(`${fields.model}: undefined or NaN`);
  }
  if (bad.length) structural++;
  console.log(`${bad.length ? "FAIL" : "pass"}  AI-built belt    ${bad.join("; ")}`);
}

// Running costs (data/car-running-costs.json): energy for two years from the ad's own combined consumption, never
// a guessed one; an electric car's battery warranty, test price and service price; Toyota-group hybrid cover; recalls.
const run = data.facts.run;
const energyRow = (r) => r.costs?.find((x) => /^(?:Fuel|Electricity|Fuel and electricity)$/.test(x.what));
const serviceRow = (r) => r.costs?.find((x) => x.what === "Two services");
const allAsks = (r) => [...r.asks, ...(r.more ?? [])];
const batteryAsk = (r) => allAsks(r).find((a) => /battery’s health/.test(a.q));
const hybridAsk = (r) => allAsks(r).find((a) => /hybrid battery/.test(a.q));
const near1 = (a, b) => a != null && Math.abs(a - b) < 0.01;
group("energy", [
  ["petrol, combined", "Toyota Corolla 1.8\n2019\n60 000 km\nBensiini\nManuaali\nYhdistetty kulutus 6,5 l/100 km\nHinta 15 900 €\nYksityinen myyjä, Turku",
    ["km × l/100 km × June's petrol price", (r) => near1(energyRow(r)?.eur, 2 * run.km.v * 0.065 * run.fuel.petrol / 100) && /June 2026/.test(energyRow(r).note) && /petrol 95E10/.test(energyRow(r).note)],
    ["the WLTP gap said, not added", (r) => /\+24% for petrol cars/.test(energyRow(r).note) && /Not added here/.test(energyRow(r).note)],
    ["sourced", (r) => ["c-sf-12ge", "c-sf-12jx", "c-sf-11ie", "c-ec-com-2024-122"].every((s) => r.sources.includes(s))]],
  ["diesel, combined in English, NEDC era", "Volkswagen Golf 1.6 TDI\n2014\n150 000 km\nDiesel\nManual\nCombined consumption: 4.1 l/100 km\nPrice 7 900 €\nPrivate seller, Oulu",
    ["diesel price", (r) => near1(energyRow(r)?.eur, 2 * run.km.v * 0.041 * run.fuel.diesel / 100)], ["NEDC gap too", (r) => /\+18% for diesel/.test(energyRow(r).note) && /40% for older NEDC figures by 2017/.test(energyRow(r).note)]],
  ["electric, combined", "Tesla Model 3 Long Range\n2022\n40 000 km\nSähkö\nAutomaatti\nYhdistetty kulutus 14,9 kWh/100 km\nHinta 29 000 €\nAutoliike, Espoo",
    ["km × kWh/100 km × band D", (r) => near1(energyRow(r)?.eur, 2 * run.km.v * 0.149 * run.elec.c / 100) && energyRow(r).what === "Electricity"],
    ["names the band and month", (r) => /5,000–15,000 kWh a year/.test(energyRow(r).note) && /home charging/.test(energyRow(r).note) && /June 2026/.test(energyRow(r).note)],
    ["sourced", (r) => r.sources.includes("c-sf-13rb")]],
  ["Subaru: highway only", IMPREZA,
    ["no number, says why", (r, f) => energyRow(r)?.eur === null && /only a highway figure \(9 l\/100 km\)/.test(energyRow(r).note) && f.consumption == null]],
  ["city and highway", "Volkswagen Golf\n2015\n100 000 km\nDiesel\nManuaali\nKaupunki: 7 l/100 km\nMaantie: 4,5 l/100 km\nHinta 9 000 €\nYksityinen myyjä, Pori",
    ["no number", (r) => energyRow(r)?.eur === null && /only city and highway figures/.test(energyRow(r).note)]],
  ["no consumption", "Ford Focus 1.6\n2010\n160 000 km\nBensiini\nManuaali\nHinta 3 900 €\nYksityinen myyjä, Pori",
    ["no number", (r) => energyRow(r)?.eur === null && /doesn’t give its combined consumption/.test(energyRow(r).note) && energyRow(r).none]],
  ["plug-in hybrid", "Volkswagen Passat GTE\n2019\n90 000 km\nKäyttövoima: Bensiini/sähkö plug-in hybrid\nYhdistetty kulutus 1,6 l/100 km\nHinta 21 900 €\nAutoliike, Espoo",
    ["skipped, says why", (r) => energyRow(r)?.what === "Fuel and electricity" && energyRow(r).eur === null && /how often it’s charged/.test(energyRow(r).note)]],
]);
group("electric car", [
  ["within warranty", "Tesla Model 3 Long Range\n2022\n40 000 km\nSähkö\nAutomaatti\nHinta 29 000 €\nAutoliike, Espoo",
    ["Long Range terms", (r) => /8 years or 192,000 km/.test(batteryAsk(r).why) && /below 70%/.test(batteryAsk(r).why) && /counted from first registration or delivery/.test(batteryAsk(r).why)],
    ["within it", (r) => /By its year \(2022\) and km \(40,000\), this car is within it/.test(batteryAsk(r).why)],
    ["test price as its cost", (r) => batteryAsk(r).cost === `Test ≈ €${run.test.avg}` && /AVILOO Flash test cost €100 at one garage in March 2026/.test(batteryAsk(r).tip) && /estimate/.test(batteryAsk(r).tip)],
    ["EV service price, no 'may differ'", (r) => serviceRow(r).eur === 400 && /Tesla Model 3/.test(serviceRow(r).note) && !/may differ/.test(said(r))],
    ["sourced", (r) => ["c-w-tesla", "c-aj-soh-test", "c-moottori-2026-akkutesti", "c-aj-ev-service-tesla-model-3"].every((s) => r.sources.includes(s))]],
  ["first use from the ad", "Volkswagen ID.3 Pro\n2021\n68 000 km\nTäyssähkö\nKäyttöönottopäivä 15.03.2021\nHinta 19 500 €\nAutoliike, Tampere",
    ["within it by first use", (r) => /By its first use \(March 2021\) and km \(68,000\), this car is within it/.test(batteryAsk(r).why)]],
  ["past it by age", "Tesla Model S 85D\n2015\n110 000 km\nSähkö\nAutomaatti\nHinta 19 000 €\nYksityinen myyjä, Vantaa",
    ["S/X terms, past it", (r) => /8 years or 240,000 km/.test(batteryAsk(r).why) && /This car is past it: it is from 2015/.test(batteryAsk(r).why)]],
  ["past it by km", "Nissan Leaf\n2020\n172 000 km\nSähkö\nAutomaatti\nHinta 9 000 €\nYksityinen myyjä, Turku",
    ["past it, no threshold claimed", (r) => /This car is past it: it has 172,000 km/.test(batteryAsk(r).why) && /states no minimum capacity/.test(batteryAsk(r).why)]],
  ["version unknown", "Tesla Model 3\n2019\n90 000 km\nSähkö\nAutomaatti\nHinta 21 000 €\nYksityinen myyjä, Turku",
    ["both terms, may still be", (r) => /depends on the version/.test(batteryAsk(r).why) && /160,000 km/.test(batteryAsk(r).why) && /192,000 km/.test(batteryAsk(r).why) && /may still be within it/.test(batteryAsk(r).why)]],
  ["make not in the data", "Renault Zoe\n2019\n60 000 km\nSähkö\nAutomaatti\nHinta 11 000 €\nYksityinen myyjä, Turku",
    ["asks, claims nothing", (r) => /whether the maker’s battery warranty is still valid/.test(batteryAsk(r).why) && !/years or/.test(batteryAsk(r).why) && /no electric-car price/.test(serviceRow(r).note)]],
]);
group("hybrid cover", [
  ["Toyota hybrid", "Toyota Corolla 1.8 Hybrid\n2020\n60 000 km\nHybridi (bensiini/sähkö)\nAutomaatti\nJakoketju\nHinta 19 900 €\nAutoliike, Turku",
    ["10 years / 350,000 km with Toyota servicing", (r) => /renewed at each yearly service at an authorised Toyota workshop, up to 10 years or 350,000 km/.test(hybridAsk(r).why) && !/whether the maker’s hybrid battery warranty/.test(hybridAsk(r).why)],
    ["sourced", (r) => r.sources.includes("c-w-toyota-akkuturva")]],
  ["Toyota hybrid past it", "Toyota Auris Hybrid\n2012\n240 000 km\nHybridi (bensiini/sähkö)\nAutomaatti\nHinta 6 900 €\nYksityinen myyjä, Turku",
    ["past it", (r) => /This car is past it: it is from 2012/.test(hybridAsk(r).why)]],
  ["Lexus", "Lexus CT 200h\n2018\n120 000 km\nHybridi (bensiini/sähkö)\nAutomaatti\nHinta 16 900 €\nAutoliike, Espoo",
    ["free check, from first registration", (r) => /which is free, up to 10 years or 350,000 km from first registration/.test(hybridAsk(r).why)]],
  ["Suzuki Swace", "Suzuki Swace 1.8 Hybrid\n2022\n30 000 km\nHybridi (bensiini/sähkö)\nAutomaatti\nHinta 23 900 €\nAutoliike, Oulu",
    ["Across and Swace cover", (r) => /Suzuki’s hybrid battery cover for the Across and Swace/.test(hybridAsk(r).why)]],
  ["Hyundai hybrid: none claimed", "Hyundai Ioniq Hybrid\n2018\n110 000 km\nHybridi (bensiini/sähkö)\nAutomaatti\nHinta 13 900 €\nAutoliike, Espoo",
    ["general ask", (r) => /whether the maker’s hybrid battery warranty is still valid/.test(hybridAsk(r).why) && !/350,000/.test(hybridAsk(r).why)]],
]);
// Recalls: in "more", with Traficom's search for the model, never among the three. The EU snapshot isn't shipped.
const recallAsk = (r) => allAsks(r).find((a) => /recall work/.test(a.q));
const recallBad = [];
for (const t of [...samples.tests.filter((x) => x.kind === "car"), { id: "Subaru", text: IMPREZA }]) {
  const r = engine.analyse(t.text);
  const ask = recallAsk(r);
  if (!ask || r.asks.includes(ask)) recallBad.push(`${t.id}: ${ask ? "among the three" : "no recall ask"}`);
  else if (!ask.link?.href.startsWith("https://takaisinkutsut.traficom.fi/recall?keyword=") || !/c-traficom-recall-db/.test(r.sources.join(" "))) recallBad.push(`${t.id}: ${ask.link?.href}`);
}
if (recallAsk(engine.analyse("Tesla Model 3\n2020\n90 000 km\nSähkö\nHinta 21 000 €")).link.href !== "https://takaisinkutsut.traficom.fi/recall?keyword=Model%203") recallBad.push("keyword not encoded");
if (/safety-gate|webReport\/alertDetail/i.test(JSON.stringify(data))) recallBad.push("car-recalls-eu.json is in the page");
if (recallBad.length) structural++;
console.log(`${recallBad.length ? "FAIL" : "pass"}  recalls          ${recallBad.join("; ")}`);
// Cars built from the AI's fields have no consumption, first use or ad text: rows degrade, nothing reads undefined.
const aiBad = [];
for (const fields of [{ make: "Tesla", model: "Model 3", year: 2021, km: 50000, price: 25000, fuel: "electric" },
  { make: "Toyota", model: "Yaris", year: 2019, price: 12000, fuel: "hybrid-petrol" }, { make: "Volkswagen", model: "Passat", fuel: "plug-in hybrid" }]) {
  const r = engine.fromAI("car", fields, "", "m");
  check(`AI ${fields.make}`, r);
  if (/undefined|NaN/.test(JSON.stringify(r))) aiBad.push(`${fields.make}: undefined or NaN`);
  if (energyRow(r)?.eur !== null) aiBad.push(`${fields.make}: an energy number without a consumption`);
}
if (aiBad.length) structural++;
console.log(`${aiBad.length ? "FAIL" : "pass"}  AI-built costs   ${aiBad.join("; ")}`);
// Flats: what the ad's own words raise, ranked above the generic leak question, which moves to "more".
const qs = (r) => r.asks.map((a) => a.q);
const allQs = (r) => [...r.asks, ...(r.more ?? [])].map((a) => a.q);
const has = (r, re) => r.asks.some((a) => re.test(a.q));
const inMore = (r, re) => (r.more ?? []).some((a) => re.test(a.q));
const nowhere = (r, re) => !allQs(r).some((q) => re.test(q));
const flat = (lines) => `Myydään kaksio, Tampere\nKerrostalo, rakennusvuosi 1985\n2h, k, kph\n55 m²\nVelaton hinta 150 000 €\nHoitovastike 250 € / kk\n${lines}`;
const LEAK = /water damage/;
group("flat words", [
  ["kosteusvaurio", flat("Kylpyhuoneessa todettu kosteusvaurio 2023, korjattu 2024."),
    ["asks where", (r) => has(r, /moisture damage, and how was it repaired/)], ["quotes the ad", (r) => /“Kylpyhuoneessa todettu kosteusvaurio 2023, korjattu 2024”/.test(r.asks.find((a) => /moisture/.test(a.q))?.why ?? "")],
    ["slow damage not covered", (r) => /builds up slowly, such as mould/.test(said(r))], ["leak moves to more", (r) => !has(r, LEAK) && inMore(r, LEAK)]],
  ["hometta", flat("Makuuhuoneen nurkassa havaittu hometta."), ["asks about mould", (r) => has(r, /Where was the mould/)]],
  ["ei kosteusvaurioita", flat("Ei kosteusvaurioita. Kuntotarkastuksessa ei havaittu hometta."), ["nothing", (r) => nowhere(r, /moisture|mould/)]],
  ["ei ole havaittu", flat("Kosteusvaurioita ei ole havaittu."), ["nothing", (r) => nowhere(r, /moisture|mould/)]],
  ["English 'home'", flat("A sweet home in a quiet street, close to the tram."), ["no mould", (r) => nowhere(r, /mould/)]],
  ["kuntotutkimus done", flat("Julkisivujen kuntotutkimus tehty 2021."), ["asks for it", (r) => has(r, /Can I see the condition survey, and what did it find/)]],
  ["PTS", flat("PTS päivitetty 2024."), ["asks for the plan", (r) => allQs(r).some((q) => /long-term maintenance plan \(PTS\)/.test(q))]],
  ["öljylämmitys", flat("Lämmitys\nÖljylämmitys"),
    ["asks", (r, f) => f.heating === "oil" && allQs(r).some((q) => /oil heating/.test(q))], ["no heating cost", (r) => !/€/.test(JSON.stringify([...r.asks, ...(r.more ?? [])].filter((a) => /oil/.test(a.q))))],
    ["sourced", (r) => r.sources.includes("f-ym-oil")]],
  ["oil heating replaced", flat("Öljylämmitys vaihdettu maalämpöön 2019.\nLämmitys\nMaalämpö (ent. öljy)"), ["no oil", (r, f) => f.heating !== "oil" && nowhere(r, /oil heating/)]],
  ["loan-funded work", flat("Julkisivuremontti 2027 rahoitetaan yhtiölainalla."), ["asks about the new loan", (r) => allQs(r).some((q) => /taking a new loan/.test(q))]],
  ["no company loan", flat("Taloyhtiöllä ei ole lainaa."), ["nothing", (r) => nowhere(r, /loan/)]],
  ["asbestikartoitus", flat("Asbestikartoitus tehty 2022."),
    ["asks for the survey", (r) => allQs(r).some((q) => /asbestos survey, and what did it find/.test(q))], ["not twice", (r) => nowhere(r, /Has the flat been surveyed for asbestos/)]],
  ["energy F (2013)", flat("Energialuokka\nF (2013)"),
    ["reads it", (r, f) => f.energyClass === "F" && f.energyClassScale === 2013], ["still valid?", (r) => allQs(r).some((q) => /still valid/.test(q))],
    ["explains", (r) => /from A, the most efficient, to G/.test(said(r) + JSON.stringify(r.more)) && r.sources.includes("f-energy-act")]],
  ["energy C, no year", flat("Energialuokka C"), ["reads it", (r, f) => f.energyClass === "C" && f.energyClassScale == null]],
  ["nothing said", flat("Valoisa koti hyvien kulkuyhteyksien varrella."), ["leak still asked", (r) => has(r, LEAK)]],
]);

// A leased plot: when the lease ends and what the rent will be, with the city's and the press's facts.
group("plot lease", [
  ["vuokrasopimus päättyy 2035", flat("Vuokratontti, vuokrasopimus päättyy 2035.\nTontin vuokravastike 120 € / kk"),
    ["reads 2035", (r, f) => f.plotLeaseEnds === "2035" && f.plotRentCharge === 120],
    ["asks", (r) => has(r, /When does the plot lease end, and what will the rent be after that/)],
    ["says when", (r) => /ends in 2035, 9 years from now/.test(said(r))], ["sixfold what-if", (r) => /€120 a month would become about €720/.test(said(r))],
    ["sources", (r) => r.sources.includes("f-helsinki-plot") && r.sources.includes("f-yle-plot") && /secondary/.test(engine.SRC["f-yle-plot"].text)]],
  ["tontin vuokra, no date", flat("Tontin omistus\nVuokra"), ["asks", (r, f) => f.plotLeased && f.plotLeaseEnds == null && allQs(r).some((q) => /plot lease end/.test(q))]],
  ["a tenant's lease isn't the plot's", flat("Asunto on vuokrattu, vuokrasopimus päättyy 31.5.2027.\nTontin omistus\nOma"),
    ["nothing", (r, f) => f.plotLeaseEnds == null && nowhere(r, /plot lease/)]],
]);

// The price against Statistics Finland's average for the same kind of flat in the same postcode.
const raasepori = "Rivitalo, Raasepori\nEsimerkkitie 1, 10420 Raasepori\n3h, k, s\n80 m²\nRakennusvuosi 1980\nVelaton hinta 70 000 €\nHoitovastike 300 € / kk";
const kaleva = samples.tests.find((t) => t.id === "home-1").text;
group("area price", [
  ["home-1, 33500", kaleva,
    ["21% below", (r) => /€2,537 per m².*33500 Osmonmäki-Petsamo \(Tampere\).*€3,212 per m² in 2025, from 56 sales: this one is 21% below/.test(said(r))], ["sourced", (r) => r.sources.includes("areaprice")]],
  ["small sample", raasepori, ["says so", (r) => /Only 8 sales is a small sample/.test(said(r) + JSON.stringify(r.more))]],
  ["no postcode", samples.tests.find((t) => t.id === "home-4").text, ["nothing", (r) => !r.sources.includes("areaprice")]],
  ["type unknown", "Myydään kolmio\nEsimerkkikatu 1, 33500 Tampere\n3h, k\n70 m²\nRakennusvuosi 1990\nVelaton hinta 200 000 €\nHoitovastike 300 € / kk", ["nothing", (r) => !r.sources.includes("areaprice")]],
]);

// The rent against the same number of rooms in the postcode, or new leases in the municipality.
group("area rent", [
  ["rent-1, 90100", samples.tests.find((t) => t.id === "rent-1").text,
    ["27% above, first", (r) => /rent above the area’s average/.test(r.asks[0].q) && /€16\.29 per m².*90100 Oulu Keskus \(Oulu\) was €12\.82 per m² in 2025 Q4 \(299 rents\): this one is 27% above/.test(said(r))],
    ["water noted", (r) => /water fee comes on top/.test(said(r))], ["insurance in more", (r) => inMore(r, /own home insurance/) && !has(r, /own home insurance/)],
    ["sources", (r) => r.sources.includes("rentpost") && r.sources.includes("rentmuni")]],
  ["Helsinki, no postcode", "Vuokrataan yksiö, Helsinki\nKerrostalo 1961\n27 m²\nVuokra 890 €/kk\nVakuus 3 kk:n vuokra",
    ["new leases in Helsinki", (r) => /New leases for privately financed studios in Helsinki averaged €[\d.]+ per m² in 2026 Q3/.test(said(r))]],
  ["kosteusvaurio", "Vuokrataan kaksio, Tampere\nKerrostalo 2005\n50 m²\nVuokra 800 €/kk\nVakuus 2 kk:n vuokra\nKylpyhuoneessa kosteusvaurio, korjataan keväällä 2027.",
    ["asks", (r) => has(r, /moisture damage, and has it been fixed/)], ["rights", (r) => /reasonably reduced rent/.test(said(r))]],
]);
// Houses and cottages sold as real estate: synthetic ads in Etuovi's and Oikotie's real labels (observed 18.10.2026)
// and plain text. `fields` must be read exactly; `want` lists what must be true of the result. Negations count:
// "Ei kosteusvaurioita", oil heating replaced by a heat pump, "No condition inspection has been done".
const HOUSE_ETUOVI = `Omakotitalo | 4h, k, s, khh
Esimerkkitie 8, Muurame
Hinta
189 000 €
Koko
118 / 160 m²
Vuosi
1976
Tilava omakotitalo rauhallisella alueella. Öljylämmitys, öljysäiliö maan alla. Ei kosteusvaurioita.
Asunnon perustiedot
Kohdenumero
12345679
Sijainti
Muurame
Esimerkkitie 8, 40950
Tyyppi
Omakotitalo
(kiinteistö)
Omistusmuoto
Omistusasunto
Huoneita
4 huonetta
Asuintilojen pinta-ala
118 m²
Kokonaispinta-ala
160 m²
Rakennusvuosi
1976
Hinta ja kustannukset
Hinta
Myyntihinta
189 000,00 €
Velaton hinta
189 000,00 €
Muut maksut
Kiinteistövero
640,00 € / vuosi
Lisätietoa maksuista
Öljyä mennyt noin 2000 l/v.
Asunnon lisätiedot
Tehdyt remontit
2014 vesikatto uusittu.
Asunnon kunto
Tyydyttävä
Energialuokka
Ei lain edellyttämää energiatodistusta
Lämmitysjärjestelmän kuvaus
Öljylämmitys
Vesikiertoinen patterilämmitys.
Vesijohto
Kunnan vesijohto
Viemäri
Kunnan
Kattotyyppi
Harjakatto
Kattomateriaali
Huopa
Asunnon tontti
Tontin omistus
Oma
Tontin pinta-ala
1 210 m²
Tie perille
Kyllä`;
const COTTAGE_ETUOVI = `Mökki tai huvila | 2h, tupakeittiö, s
Esimerkkitie 120, Mäntyharju
Hinta
79 000 €
Koko
48 m²
Vuosi
1985
Kesämökki omalla rannalla. Ei talviasuttava. Yksityistie, tiemaksu 180 €/v.
Loma-asunnon perustiedot
Kohdenumero
12345680
Sijainti
Mäntyharju
Tyyppi
Mökki tai huvila
Rakennusvuosi
1985
Asuintilojen pinta-ala
48 m²
Hinta ja kustannukset
Myyntihinta
79 000,00 €
Lämmitysjärjestelmän kuvaus
Sähkölämmitys
Vesijohto
Porakaivo
Viemäri
Saostuskaivot ja imeytyskenttä
Kattomateriaali
Huopa
Rakennus- ja pintamateriaalit
Puu. Rossipohja.
Loma-asunnon tontti
Tontin omistus
Oma
Tontin tyyppi
Rantatontti
Tontin pinta-ala
0,6 ha
Tie perille
Kyllä`;
// Oikotie puts the house type far down the page, under the site's own menu.
const HOUSE_OIKOTIE_SHORT = "Kirjaudu\nMyytävät asunnot\nTurku\nTurku\nEsimerkkitie 1, 20900 Turku\nPalaa hakutuloksiin\n557 000 €\n●\n142,5 m²\nMyyntihinta\n557 000 €\nAsuinpinta-ala\n142,5 m²\nRakennusvuosi\n2026\nRakennuksen tyyppi\nOmakotitalo\nKohde on\nKiinteistö\nTontin omistus\nVuokralla";
const HOUSE_OIKOTIE = `Myytävät asunnot
Lahti
Esimerkkikatu 5, 15100 Lahti
265 000 €
●
126 m²
Perustiedot
Sijainti
Esimerkkikatu 5, 15100 Lahti
Kaupunginosa
Laune
Asuinpinta-ala
126 m²
Tontin pinta-ala
905 m²
Huoneiston kokoonpano
5h+k+s+khh
Huoneita
5
Kunto
Hyvä
Tehdyt remontit
2012 Salaojat ja sadevesiviemärit uusittu
2018 Ilma-vesilämpöpumppu asennettu
Asumistyyppi
Omistus
Kohde on
Kiinteistö
Hinta
Myyntihinta
265 000 €
Talon ja tontin tiedot
Rakennuksen tyyppi
Omakotitalo
Rakennusvuosi
1968
Rakennusmateriaali
Tiili
Kattotyyppi
Tasakatto
Kattomateriaali
Bitumikermi
Lämmitys
Ilma-vesilämpöpumppu
Energialuokka
E2018
Tontin omistus
Oma
Vesi ja jätevesi
Kunnallinen vesijohto ja viemäri
Kuntotarkastus
Tehty 2025
Lisätietoja
Kellarissa havaittu kohonneita kosteuslukemia, korjattu 2020.`;
const HOUSE_TEXT_FI = "Myydään omakotitalo, Nokia.\nRakennettu 1982, asuinpinta-ala 128 m², tontti 1 500 m² oma. Hinta 198 000 €.\nMaalämpö (vaihdettu öljylämmityksestä 2016, öljysäiliö poistettu). Valesokkeli korjattu 2019.\nKuntotarkastusta ei ole tehty. Kunnallinen vesi ja viemäri. Sähkönkulutus 14 000 kWh/v. Kosteusvaurioita ei ole havaittu.";
const HOUSE_TEXT_EN = "Detached house for sale in Espoo\nBuilt 1965, living area 135 m², plot 1,100 m², own\nAsking price €420,000\nDistrict heating. Municipal water and sewer.\nNo condition inspection has been done.\nRoof renewed in 1995. Crawl space foundation.\nNo moisture damage.";
const COTTAGE_TEXT_EN = "Summer cottage for sale, Kuopio\nLog cabin built 1978, 40 m², own shore\nPrice 59 000 €\nWood heating, dry toilet, carried water. No road access: reached by boat.\nPlot 0.8 ha, leased";
const asked = (r, re) => [...r.asks, ...(r.more ?? [])].some((a) => re.test(strip(a.q)));
const top = (r, re) => r.asks.some((a) => re.test(strip(a.q)));
const costOf = (r, re) => r.costs?.find((c) => re.test(c.what));
const HOUSES = [
  ["Etuovi house", HOUSE_ETUOVI, { kind: "house", cottage: false, buildingYear: 1976, livingAreaM2: 118, plotAreaM2: 1210, plot: "own", price: 189000, city: "Muurame",
    heating: ["oil"], oilLitresYear: 2000, roofRenewed: 2014, roofType: "gable", roofMaterial: "felt", wastewater: { type: "municipal", systems: [] }, water: "municipal",
    moisture: [], propertyTaxYear: 640, roadAccess: true, energy: { cls: null, none: true } },
    ["oil tank asked", (r) => top(r, /oil tank/)], ["inspection asked", (r) => top(r, /condition inspection/)], ["no moisture ask", (r) => !asked(r, /moisture/)],
    ["transfer tax 3%", (r) => costOf(r, /Transfer tax/)?.eur === 5670], ["property tax from the ad", (r) => costOf(r, /Property tax/)?.eur === 3200],
    ["oil cost from litres", (r) => !!costOf(r, /Heating oil/)?.eur], ["hidden defect is the seller's", (r) => r.cover.items.some((i) => /hidden defect/.test(i.who))]],
  ["Etuovi cottage", COTTAGE_ETUOVI, { kind: "house", cottage: true, buildingYear: 1985, livingAreaM2: 48, plotAreaM2: 6000, plot: "own", price: 79000, city: "Mäntyharju",
    winterUse: false, shore: true, privateRoad: true, roadFee: 180, water: "drilled well", wastewater: { type: "own", systems: ["septic tanks", "soil infiltration"] },
    foundation: ["crawl space"], roofMaterial: "felt", heating: ["electric"] },
    ["wastewater asked", (r) => top(r, /wastewater/)], ["winter use asked", (r) => asked(r, /over winter/)], ["road asked", (r) => asked(r, /road charge/)],
    ["well asked", (r) => asked(r, /well water/)], ["road charge cost", (r) => costOf(r, /Road charge/)?.eur === 900], ["stamp", (r) => r.stamp === "Cottage for sale"]],
  ["Oikotie house, short", HOUSE_OIKOTIE_SHORT, { kind: "house", buildingYear: 2026, livingAreaM2: 142.5, price: 557000, plot: "leased", city: "Turku" },
    ["lease asked", (r) => asked(r, /plot lease/)], ["flood area named", (r) => asked(r, /flooded/) && /Turun rannikkoalue/.test(strip(JSON.stringify(r.more.concat(r.asks))))]],
  ["Oikotie house", HOUSE_OIKOTIE, { kind: "house", buildingYear: 1968, livingAreaM2: 126, plotAreaM2: 905, plot: "own", price: 265000, city: "Lahti", district: "Laune",
    heating: ["air-to-water"], roofType: "flat", roofMaterial: "felt", drainsRenewed: 2012, foundation: ["basement"], water: "municipal",
    wastewater: { type: "municipal", systems: [] }, inspection: { done: true, year: 2025 }, energy: { cls: "E", version: 2018 } },
    ["moisture first, quoting the ad", (r) => /moisture/.test(r.asks[0].q) && /kohonneita kosteuslukemia/.test(r.asks[0].why)], ["report asked", (r) => asked(r, /report from 2025/)],
    ["flat roof asked", (r) => asked(r, /flat roof/)], ["radon with Lahti's numbers", (r) => [...r.asks, ...r.more].some((a) => /Lahti.*415 Bq/.test(strip(a.why)))]],
  ["plain Finnish", HOUSE_TEXT_FI, { kind: "house", buildingYear: 1982, livingAreaM2: 128, plotAreaM2: 1500, plot: "own", price: 198000, city: "Nokia", heating: ["ground-source"],
    oilGone: true, plinthRepaired: 2019, inspection: { done: false, year: null }, energyKwhYear: 14000, moisture: [], foundation: ["false plinth"] },
    ["no oil-tank age ask", (r) => !asked(r, /How old is the oil tank/)], ["old tank asked", (r) => asked(r, /old oil tank removed/)],
    ["electricity cost", (r) => !!costOf(r, /Electricity/)?.eur], ["no moisture ask", (r) => !asked(r, /moisture/)]],
  ["plain English", HOUSE_TEXT_EN, { kind: "house", buildingYear: 1965, livingAreaM2: 135, plotAreaM2: 1100, plot: "own", price: 420000, city: "Espoo", heating: ["district"],
    water: "municipal", wastewater: { type: "municipal", systems: [] }, inspection: { done: false, year: null }, roofRenewed: 1995, foundation: ["crawl space"], moisture: [] },
    ["crawl space asked", (r) => asked(r, /crawl space/)], ["Espoo flood area", (r) => asked(r, /flooded/)]],
  ["English cottage", COTTAGE_TEXT_EN, { kind: "house", cottage: true, buildingYear: 1978, livingAreaM2: 40, plotAreaM2: 8000, plot: "leased", price: 59000, city: "Kuopio",
    heating: ["wood"], water: "carried", wastewater: { type: "own", systems: ["dry toilet"] }, roadAccess: false },
    ["access asked", (r) => asked(r, /How do you get there/)], ["lease asked", (r) => asked(r, /plot lease/)]],
];
const houseBad = [];
for (const [name, text, fields, ...wants] of HOUSES) {
  const f = engine.read(text);
  for (const [k, v] of Object.entries(fields)) if (!same(v, f[k]) && JSON.stringify(v) !== JSON.stringify(f[k])) houseBad.push(`${name}: ${k} expected ${JSON.stringify(v)}, got ${JSON.stringify(f[k])}`);
  const r = engine.analyse(text);
  check(`house: ${name}`, r);
  if (!r.message) for (const [why, ok] of wants) if (!ok(r, f)) houseBad.push(`${name}: ${why}`);
}
// Still not houses: a rental house is a rental, a flat with charges is a flat.
if (engine.read("Vuokrataan omakotitalo, Tampere\n120 m²\nVuokra 1 450 €/kk\nVakuus 2 kk").kind !== "rent") houseBad.push("a house for rent isn't a rental");
for (const t of samples.tests.filter((x) => x.kind === "home")) if (engine.read(t.text).kind !== "home") houseBad.push(`${t.id} isn't a flat any more`);
if (houseBad.length) structural++;
console.log(`${houseBad.length ? "FAIL" : "pass"}  houses           ${houseBad.join("; ")}`);

// How ads spell models that Traficom names differently.
const SPELLINGS = [["BMW 320d Touring", "bmw|3-sarja"], ["BMW M340i xDrive", "bmw|3-sarja"], ["Mercedes-Benz C 220 CDI", "mercedes-benz|c"],
  ["Kia Cee'd SW 1.6", "kia|ceed"], ["Kia pro_cee'd GT", "kia|proceed"], ["Mazda3 2.0 Skyactiv", "mazda|3"], ["Mazda 6 Wagon", "mazda|6"],
  ["Volkswagen e-Golf", "volkswagen|golf"], ["VW Up 1.0", "volkswagen|up!"], ["Hyundai Ioniq 5", "hyundai|ioniq5"],
  ["Citroën Grand C4 Picasso", "citroen|c4 picasso"], ["Renault Scénic 1.6", "renault|megane scenic"], ["Toyota Prius+ 1.8", "toyota|prius plus"],
  ["Škoda Octavia Combi", "skoda|octavia"], ["Volvo V40 Cross Country", "volvo|v40 cross country"]];
const spellBad = SPELLINGS.map(([title, key]) => [title, key, engine.read(`${title}\n2012\n150 000 km\nDiesel\nHinta 8 900 €`).modelKey]).filter(([, key, got]) => key !== got);
if (spellBad.length) structural++;
console.log(`${spellBad.length ? "FAIL" : "pass"}  model spellings  ${spellBad.map(([t, k, g]) => `${t}: expected ${k}, got ${g}`).join("; ")}`);

// A pasted link (D-031): no network at all, the link's address for "Open the ad", and the bookmarklet that brings the
// ad's text over from the person's own browser in "#ad=…". fetch throws here, so any attempt to go out fails the test.
const realFetch = globalThis.fetch;
let netCalls = 0;
globalThis.fetch = async () => { netCalls++; throw new Error("no network in tests"); };
const linkBad = [];
const naLink = engine.analyse("https://www.nettiauto.com/skoda/octavia/16000001");
if (naLink.link?.url !== "https://www.nettiauto.com/skoda/octavia/16000001" || naLink.link?.site !== "Nettiauto") linkBad.push(`Nettiauto link: ${JSON.stringify(naLink.link)}`);
if (!/went nowhere/.test(naLink.message)) linkBad.push("the message doesn't say the link went nowhere");
if (engine.adLink("www.nettiauto.com/bmw/320/16000002")?.url !== "https://www.nettiauto.com/bmw/320/16000002") linkBad.push("www. link without https://");
if (engine.adLink("Katso tämä\nhttps://www.nettimoto.com/yamaha/mt-07/1234567")?.site !== "Nettimoto") linkBad.push("a link under a line of text");
if (engine.adLink(`https://www.nettiauto.com/a/b/1"><img src=x onerror=alert(1)>`)?.url !== "https://www.nettiauto.com/a/b/1") linkBad.push("a link with markup after it");
if (engine.adLink("javascript:alert(1)") !== null) linkBad.push("javascript: read as a link");
for (const t of samples.tests) if (engine.adLink(t.text)) linkBad.push(`${t.id} read as a link`);
// The bookmarklet, run against a fake ad page.
const app = "https://what-if.what-if.workers.dev/";
const bm = engine.bookmarklet(`${app}#old`);
if (!bm.startsWith("javascript:")) linkBad.push("bookmarklet isn't a javascript: link");
const runBookmarklet = ({ selection = "", main = null, body = "" }) => {
  const opened = [];
  const doc = { querySelector: (s) => (s === "main" && main != null ? { innerText: main } : null), body: { innerText: body } };
  const win = { open: (...a) => { opened.push(a); return null; } };
  new Function("document", "window", "getSelection", decodeURIComponent(bm.slice("javascript:".length)))(doc, win, () => selection);
  return opened;
};
const naAd = samples.tests.find((t) => /nettiauto/i.test(t.site)) ?? samples.tests[0];
const fromMain = runBookmarklet({ main: naAd.text, body: `Kirjaudu\nOma Netti\n${naAd.text}\nEvästeasetukset` });
const [openUrl, openTarget, openFeatures] = fromMain[0] ?? [];
if (fromMain.length !== 1 || openTarget !== "_blank" || !/noopener/.test(openFeatures) || !/noreferrer/.test(openFeatures)) linkBad.push(`bookmarklet open: ${JSON.stringify(fromMain)}`);
if (!openUrl?.startsWith(`${app}#ad=`)) linkBad.push(`bookmarklet opens ${openUrl?.slice(0, 60)}`);
const handed = engine.adFromHash(new URL(openUrl).hash);
if (handed !== naAd.text.trim()) linkBad.push("the text that arrived isn't the ad's main text");
const handedRead = engine.read(handed), pastedRead = engine.read(naAd.text);
if (JSON.stringify(handedRead) !== JSON.stringify(pastedRead)) linkBad.push("the handed-over ad reads differently from the pasted one");
const fromSel = runBookmarklet({ selection: "Skoda Octavia 1.6 TDI 2014, 189 000 km, valittu teksti", main: naAd.text, body: naAd.text });
if (engine.adFromHash(new URL(fromSel[0][0]).hash) !== "Skoda Octavia 1.6 TDI 2014, 189 000 km, valittu teksti") linkBad.push("a selection isn't preferred");
const fromBody = runBookmarklet({ main: "Valikko", body: naAd.text });
if (engine.adFromHash(new URL(fromBody[0][0]).hash) !== naAd.text.trim()) linkBad.push("a short <main> isn't skipped for the body");
const huge = runBookmarklet({ body: `${naAd.text}\n${"ä".repeat(40000)}` });
if (engine.adFromHash(new URL(huge[0][0]).hash).length !== engine.LINK_TEXT_MAX) linkBad.push("a long page isn't cut to LINK_TEXT_MAX");
for (const h of ["", "#", "#foo=bar", "#ad=", "#ad=%E0%A4%A"]) if (engine.adFromHash(h) !== null) linkBad.push(`adFromHash(${JSON.stringify(h)}) isn't null`);
if (netCalls) linkBad.push(`${netCalls} network call(s)`);
globalThis.fetch = realFetch;
if (linkBad.length) structural++;
console.log(`${linkBad.length ? "FAIL" : "pass"}  link, bookmarklet ${linkBad.join("; ")}`);

console.log(`\nSample ads: ${pass} of ${pass + fail} pass. Results and odd ads: ${structural ? `${structural} problem(s)` : "all fine"}.`);
process.exit(fail || structural ? 1 : 0);
