// Builds data/car-recalls-eu.json: a compact snapshot of EU Safety Gate alerts for passenger cars.
// Source: the Safety Gate weekly reports in XML, which data.europa.eu lists under CC0
// (dataset "rapex-rapid-alert-system-non-food", distribution "Weekly Reports - XML format").
//   node apps/what-if/tools/recalls-snapshot.mjs CACHE_DIR [FROM=2016-10-01]
// CACHE_DIR holds the downloaded weekly XML files (about 100 MB for ten years). Keep it outside the repo.
// Files already in CACHE_DIR are not downloaded again, so a rerun only fetches the new weeks.
// The page contacts no other server, so the app ships this file instead of calling Safety Gate.
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const [cache, from = "2016-10-01"] = process.argv.slice(2);
if (!cache) {
  console.error("usage: node apps/what-if/tools/recalls-snapshot.mjs CACHE_DIR [FROM=YYYY-MM-DD]");
  process.exit(2);
}
mkdirSync(cache, { recursive: true });

const LIST = "https://ec.europa.eu/safety-gate-alerts/api/download/weeklyReport/list/xml/en";
const unxml = (s) =>
  s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
const field = (block, tag) => {
  const m = block.match(new RegExp(`<${tag}(?:\\s[^>]*)?>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?</${tag}>`));
  return m ? unxml(m[1]).replace(/\s+/g, " ").trim() : "";
};

// 1. The list of weekly reports, then every report from FROM on.
const listXml = await (await fetch(LIST)).text();
const reports = [...listXml.matchAll(/<weeklyReport>([\s\S]*?)<\/weeklyReport>/g)]
  .map(([, b]) => {
    const [d, m, y] = field(b, "publicationDate").split("/");
    return { ref: field(b, "reference"), date: `${y}-${m}-${d}`, url: field(b, "URL") };
  })
  .filter((r) => r.date >= from)
  .sort((a, b) => a.date.localeCompare(b.date));
console.log(`${reports.length} weekly reports from ${from}`);
for (const r of reports) {
  const file = join(cache, `${r.date}_${r.ref}.xml`);
  if (existsSync(file) && statSync(file).size > 500) continue;
  const res = await fetch(r.url);
  if (!res.ok) throw new Error(`${r.ref}: HTTP ${res.status}`);
  writeFileSync(file, await res.text());
  await new Promise((ok) => setTimeout(ok, 300));
}

// 2. Passenger-car alerts. Parts, tyres, child seats, lorries, buses and motorcycles are left out.
const isCar = (product) =>
  /passenger car|passenger van|\bcar\b|camper van|motorhome|pick-?up/i.test(product) &&
  !/part|tyre|tire|seat|accessor|rim|charger|cable|toy|children|lorry|truck|bus\b/i.test(product);

// Make names as Safety Gate writes them vary ("VW", "Bmw.", "Mercedes- Benz", "Citroen, Ds, Peugeot").
// Our own normalisation: split on , / & "and" "et", then map spellings to one name per make.
const MAKE = {
  vw: "Volkswagen",
  "vw-volkswagen ag": "Volkswagen",
  "vw-volkswagen": "Volkswagen",
  "volkswagen (vw)": "Volkswagen",
  "volkswagen ag": "Volkswagen",
  "vw commercial vehicles": "Volkswagen",
  "vw nutzfahrzeuge": "Volkswagen",
  bmw: "BMW",
  "bmw ag": "BMW",
  "bmw alpina": "Alpina",
  mini: "MINI",
  mercedes: "Mercedes-Benz",
  "mercedes benz": "Mercedes-Benz",
  "mercedes-amg": "Mercedes-AMG",
  citroen: "Citroën",
  skoda: "Škoda",
  seat: "SEAT",
  cupra: "CUPRA",
  "ds automobiles": "DS",
  "ds automobile": "DS",
  ds: "DS",
  "opel/vauxhall": "Opel",
  vauxhall: "Opel",
  mg: "MG",
  kia: "Kia",
  "niesmann & bischoff": "Niesmann+Bischoff",
  "niesmann+bischoff": "Niesmann+Bischoff",
  "eura-mobil": "Eura Mobil",
  "mg motor": "MG",
  mg3: "MG",
  byd: "BYD",
  gmc: "GMC",
  levc: "LEVC",
  "range rover": "Land Rover",
  "jaguar land rover limited": "Jaguar Land Rover",
  "ferrari spa": "Ferrari",
  peugot: "Peugeot",
  hyunai: "Hyundai",
  "fiat professional": "Fiat",
  "dodge ram": "Dodge",
  "general motors company llc": "General Motors",
};
const titleCase = (s) => s.toLowerCase().replace(/(^|[\s-])(\p{L})/gu, (_, a, b) => a + b.toUpperCase());
const oneMake = (raw) => {
  const k = raw
    .toLowerCase()
    .replace(/^\d+\.\s*/, "")
    .replace(/[.\s]+$/, "")
    .replace(/\s*[-–]\s*/g, "-")
    .replace(/\s+/g, " ")
    .trim();
  if (!k || k === "unknown") return null;
  return MAKE[k] ?? (k.length <= 3 ? k.toUpperCase() : titleCase(k));
};
const makes = (brand) => {
  const whole = oneMake(brand);
  if (
    whole &&
    MAKE[
      brand
        .toLowerCase()
        .replace(/[.\s]+$/, "")
        .trim()
    ]
  )
    return [whole];
  const parts = brand
    .split(/\s*(?:,|\/|&|\band\b|\bet\b|\s[-–]\s|\d+\.)\s*/i)
    .map(oneMake)
    .filter(Boolean);
  return [...new Set(parts)];
};

// Years from the production dates ("08.09.2022 - 14.06.2023") or, failing that, "Model years: 2024-2025".
const yearsIn = (s) => (s.match(/\b(19[89]\d|20[0-4]\d)\b/g) || []).map(Number);
const years = (production, description) => {
  let ys = yearsIn(production);
  let basis = "production";
  if (!ys.length) {
    const m = description.match(/model years?:?\s*([^.]*)/i);
    ys = m ? yearsIn(m[1]) : [];
    basis = "modelYears";
  }
  return ys.length ? { years: [Math.min(...ys), Math.max(...ys)], yearsBasis: basis } : { years: null, yearsBasis: null };
};
const firstSentence = (s) => {
  const m = s.match(/^.*?[.!?](?=\s|$)/);
  const t = (m ? m[0] : s).trim();
  return t.length > 300 ? `${t.slice(0, 299).trimEnd()}…` : t;
};
const cap = (s, n) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);
const measure = (s) => [
  ...new Set([...s.matchAll(/Category of measure\(s\):\s*(.*?)(?=Date of entry|Type of economic|$)/g)].map((m) => m[1].trim())),
];

const alerts = new Map();
let carBlocks = 0;
for (const f of readdirSync(cache)
  .filter((f) => f.endsWith(".xml"))
  .sort()) {
  const date = f.slice(0, 10);
  if (date < from) continue;
  const xml = readFileSync(join(cache, f), "utf8");
  for (const [b] of xml.matchAll(/<notifications\b[\s\S]*?<\/notifications>/g)) {
    if (field(b, "category") !== "Motor vehicles" || !isCar(field(b, "product"))) continue;
    carBlocks++;
    const id = field(b, "caseNumber");
    if (alerts.has(id)) continue;
    const production = field(b, "productionDates");
    const description = field(b, "description");
    alerts.set(id, {
      id,
      week: date,
      makes: makes(field(b, "brand")),
      models: cap(field(b, "name"), 200),
      type: cap(field(b, "type_numberOfModel"), 80),
      production: cap(production, 200),
      ...years(production, description),
      risk: field(b, "riskType"),
      summary: firstSentence(field(b, "danger")),
      measures: measure(field(b, "measures")),
      notifiedBy: field(b, "notifyingCountry"),
      alert: Number(field(b, "reference").match(/alertDetail\/(\d+)/)?.[1]) || null,
    });
  }
}
const list = [...alerts.values()].sort((a, b) => b.week.localeCompare(a.week) || a.id.localeCompare(b.id));
const meta = {
  title: "EU Safety Gate alerts for passenger cars (snapshot)",
  builtWith: "apps/what-if/tools/recalls-snapshot.mjs",
  built: new Date().toISOString().slice(0, 10),
  period: { from, to: list[0]?.week ?? null },
  count: list.length,
  urlPattern: "https://ec.europa.eu/safety-gate-alerts/screen/webReport/alertDetail/{alert}",
  source: "safety-gate-weekly-xml",
  licence: "CC0 1.0 as listed on data.europa.eu for the weekly XML reports; pictures are not copied.",
  scope:
    "Alerts that EU/EEA authorities published in Safety Gate under 'Motor vehicles' whose product is a passenger car, passenger van or camper van. Safety Gate does not say whether a car was sold in Finland; Finnish recalls are in Traficom's database (see car-running-costs.json → recalls).",
  fields: {
    id: "Safety Gate case number",
    week: "date of the weekly report that published the alert",
    makes:
      "brand(s), split and normalised by us (e.g. 'VW' → 'Volkswagen', 'Citroen, Ds' → ['Citroën', 'DS']); empty if Safety Gate gives none",
    models: "Safety Gate 'name', cut at 200 characters (… marks a cut)",
    type: "type / type-approval numbers, cut at 80 characters (sometimes the only place the model is named)",
    production: "production dates as Safety Gate gives them, cut at 200 characters",
    years:
      "[first, last] year found in 'production' (yearsBasis 'production') or in the description's 'Model years' (yearsBasis 'modelYears'); our parsing, null if none",
    risk: "Safety Gate risk type",
    summary: "first sentence of Safety Gate's 'danger' text (cut at 300 characters)",
    measures: "measure categories, e.g. 'Recall of the product from end users'",
    notifiedBy: "notifying country",
    alert: "Safety Gate alert number; link = urlPattern with {alert} replaced",
  },
};
// Readable meta, one alert per line: small diffs when the snapshot is rebuilt.
const target = join(root, "data", "car-recalls-eu.json");
const metaJson = JSON.stringify(meta, null, 2).replace(/\n/g, "\n  ");
const alertLines = list.map((a) => `    ${JSON.stringify(a)}`).join(",\n");
writeFileSync(target, `{\n  "meta": ${metaJson},\n  "alerts": [\n${alertLines}\n  ]\n}\n`);
console.log(`${carBlocks} car alerts in reports, ${list.length} unique → ${target}`);
