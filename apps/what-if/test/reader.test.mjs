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
    "flags.timingBeltReplaced", "flags.timingChain", "flags.serviceBook", "flags.rustMentioned"],
  home: ["buildingYear", "livingAreaM2", "debtFreePrice", "sellingPrice", "debtShare", "maintenanceCharge", "financingCharge", "plotRentCharge",
    "city", "district", "rooms", "pipeRenovation.status", "pipeRenovation.years"],
  rent: ["rent", "deposit", "depositMonths", "buildingYear", "livingAreaM2", "homeInsuranceRequired", "city", "district", "rooms"],
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
  ["capital-region rental", "Vuokrataan yksiö, Helsinki Kallio\nKerrostalo 1961\n27 m²\nVuokra 890 €/kk\nVakuus 3 kk:n vuokra\nKotivakuutus vaaditaan"],
  ["motorbike, short", "Yamaha MT-07 689 cm³\n2019\n15 000 km\nMoottoripyörä, katupyörä\nHinta 5 900 €\nTampere"],
];
const ODD = [
  ["link", "https://www.nettiauto.com/skoda/octavia/16000001", /link to Nettiauto/],
  ["motorbike link", "https://www.nettimoto.com/yamaha/mt-07/1234567", /link to Nettimoto.*paste it here/],
  ...motoSamples.notSupported.map((x) => [x.id, x.text, new RegExp(`looks like an? ${x.want === "atv" ? "ATV" : x.want}.*full version`)]),
  ["detached house", "Omakotitalo, Kaarina\n5h, k, s, 142 m²\nRakennusvuosi 1979\nHinta 245 000 €\nTontti 1 200 m², oma", /house or cottage/],
  // Oikotie puts the house type far down the page, under the site's own menu.
  ["house, Oikotie", "Kirjaudu\nMyytävät asunnot\nTurku\nTurku\nEsimerkkitie 1, 20900 Turku\nPalaa hakutuloksiin\n557 000 €\n●\n142,5 m²\nMyyntihinta\n557 000 €\nAsuinpinta-ala\n142,5 m²\nRakennusvuosi\n2026\nRakennuksen tyyppi\nOmakotitalo\nKohde on\nKiinteistö\nTontin omistus\nVuokralla", /house or cottage/],
  ["unknown", "Selling my sofa, three seats, grey fabric, a few years old. Pick up in Turku. 120 €", /couldn’t tell/],
  ["too short", "Golf 2010", /Paste the whole ad/],
];
let structural = 0;
const check = (label, r) => {
  const problems = [];
  if (r.message) problems.push(`message instead of a result: ${r.message}`);
  else {
    if (r.asks.length !== 3) problems.push(`${r.asks.length} asks`);
    r.asks.forEach((a, i) => { if (!a.who) problems.push(`ask ${i + 1} has no who-pays`); if (!a.tag) problems.push(`ask ${i + 1} has no tag`); });
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

// How ads spell models that Traficom names differently.
const SPELLINGS = [["BMW 320d Touring", "bmw|3-sarja"], ["BMW M340i xDrive", "bmw|3-sarja"], ["Mercedes-Benz C 220 CDI", "mercedes-benz|c"],
  ["Kia Cee'd SW 1.6", "kia|ceed"], ["Kia pro_cee'd GT", "kia|proceed"], ["Mazda3 2.0 Skyactiv", "mazda|3"], ["Mazda 6 Wagon", "mazda|6"],
  ["Volkswagen e-Golf", "volkswagen|golf"], ["VW Up 1.0", "volkswagen|up!"], ["Hyundai Ioniq 5", "hyundai|ioniq5"],
  ["Citroën Grand C4 Picasso", "citroen|c4 picasso"], ["Renault Scénic 1.6", "renault|megane scenic"], ["Toyota Prius+ 1.8", "toyota|prius plus"],
  ["Škoda Octavia Combi", "skoda|octavia"], ["Volvo V40 Cross Country", "volvo|v40 cross country"]];
const spellBad = SPELLINGS.map(([title, key]) => [title, key, engine.read(`${title}\n2012\n150 000 km\nDiesel\nHinta 8 900 €`).modelKey]).filter(([, key, got]) => key !== got);
if (spellBad.length) structural++;
console.log(`${spellBad.length ? "FAIL" : "pass"}  model spellings  ${spellBad.map(([t, k, g]) => `${t}: expected ${k}, got ${g}`).join("; ")}`);

console.log(`\nSample ads: ${pass} of ${pass + fail} pass. Results and odd ads: ${structural ? `${structural} problem(s)` : "all fine"}.`);
process.exit(fail || structural ? 1 : 0);
