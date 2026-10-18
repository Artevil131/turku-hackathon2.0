// Checks data/car-running-costs.json and data/car-recalls-eu.json: every number has a known source id,
// statuses are from the agreed list, and the values pass simple sanity checks. Node, no browser.
//   node apps/what-if/test/car-running-costs.test.mjs
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const load = (f) => JSON.parse(readFileSync(join(root, "data", f), "utf8"));
const rc = load("car-running-costs.json");
const recalls = load("car-recalls-eu.json");
const sources = rc.meta.sources;

let pass = 0,
  fail = 0;
const ok = (label, cond, detail = "") => {
  if (cond) pass++;
  else fail++;
  if (!cond) console.log(`FAIL  ${label}${detail ? `  (${detail})` : ""}`);
};
const ids = (s) => (Array.isArray(s) ? s : [s]);
const STATUS = new Set(["primary", "secondary", "derived", "missing"]);

// 1. Sources: each has a name, a publisher, an https url and a type.
for (const [id, s] of Object.entries(sources)) {
  ok(`source ${id} has name and publisher`, !!s.name && !!s.publisher);
  ok(`source ${id} has an https url`, /^https:\/\//.test(s.url ?? ""), s.url);
  ok(`source ${id} type is primary or secondary`, s.type === "primary" || s.type === "secondary", s.type);
}

// 2. Every number sits in an object that has a 'source', or below one; every id is known.
let numbers = 0;
const walk = (v, path, sourced) => {
  if (typeof v === "number") {
    numbers++;
    ok(`number at ${path} has a source`, sourced);
    return;
  }
  if (Array.isArray(v)) {
    v.forEach((x, i) => {
      walk(x, `${path}[${i}]`, sourced);
    });
    return;
  }
  if (v && typeof v === "object") {
    let here = sourced;
    if ("source" in v) {
      const list = ids(v.source);
      ok(`source ids at ${path} are known`, list.length > 0 && list.every((id) => id in sources), list.join(", "));
      here = true;
    }
    if ("status" in v) ok(`status at ${path} is known`, STATUS.has(v.status), v.status);
    for (const [k, x] of Object.entries(v)) walk(x, `${path}.${k}`, here);
  }
};
const { meta, ...body } = rc;
walk(body, "$", false);
ok("the file has numbers to check", numbers > 100, String(numbers));

// 3. Sanity checks on values.
const near = (a, b, tol) => Math.abs(a - b) <= tol;
const mean = (xs) => Math.round((xs.reduce((s, x) => s + x, 0) / xs.length) * 10) / 10;
const fuel = rc.energy.fuelPrices;
ok("fuel: one price per month", fuel.months.length === fuel.petrol95E10.length && fuel.months.length === fuel.diesel.length);
ok(
  "fuel: prices 100–400 c/l",
  [...fuel.petrol95E10, ...fuel.diesel].every((x) => x >= 100 && x <= 400),
);
ok(
  "fuel: months ascending YYYY-MM",
  fuel.months.every((m, i) => /^\d{4}-\d\d$/.test(m) && (i === 0 || m > fuel.months[i - 1])),
);
ok("fuel: latest is the last month", fuel.latest.month === fuel.months.at(-1) && fuel.latest.petrol95E10 === fuel.petrol95E10.at(-1));
ok(
  "fuel: 12-month averages recompute",
  fuel.twelveMonthAverage.petrol95E10 === mean(fuel.petrol95E10) && fuel.twelveMonthAverage.diesel === mean(fuel.diesel),
);
for (const [t, h] of Object.entries(rc.energy.electricityPrices.householdTypes)) {
  ok(
    `electricity ${t}: total = energy + network + taxes`,
    h.total.every((x, i) => near(x, h.energy[i] + h.network[i] + h.taxes[i], 0.011)),
  );
  ok(
    `electricity ${t}: totals 5–60 c/kWh`,
    h.total.every((x) => x >= 5 && x <= 60),
  );
  ok(`electricity ${t}: 12-month average recomputes`, h.twelveMonthAverageTotal.value === mean(h.total));
}
const nat = rc.energy.kmPerYear.national;
ok("km/year: national 5,000–30,000", nat.valueKm >= 5000 && nat.valueKm <= 30000, String(nat.valueKm));
ok(
  "km/year: national recomputes",
  nat.valueKm === Math.round((nat.inputs.passengerCarKmMillion2025 * 1e6) / nat.inputs.passengerCarsInTraffic31Dec2025),
);
for (const r of rc.energy.kmPerYear.byPowertrainFromInspections.rows) {
  ok(
    `km by age ${r.powertrain} ${r.ageYears}: per year recomputes`,
    r.medianKmPerYearOfAge === Math.round(r.medianKm / r.ageYears / 100) * 100,
  );
}
for (const r of rc.energy.consumption.realWorldGapWLTP.rows) {
  ok(`gap ${r.powertrain}: real-world above WLTP`, r.realWorldLper100km > r.wltpLper100km);
  ok(
    `gap ${r.powertrain}: % matches the l/100 km within 1 point`,
    near((r.realWorldLper100km / r.wltpLper100km - 1) * 100, r.gapPct, 1.5),
    String(r.gapPct),
  );
}
for (const r of rc.electricCars.servicePrices.rows) {
  ok(`service ${r.make} ${r.model ?? ""}: low ≤ avg ≤ high`, r.lowEur <= r.avgEur && r.avgEur <= r.highEur);
}
for (const r of rc.electricCars.batteryHealthTest.rows) {
  const p = r.avgEur ?? r.priceEur;
  ok(`battery test ${r.what}: 20–500 €`, p >= 20 && p <= 500, String(p));
}
const warranties = [...rc.electricCars.batteryWarranty.rows, ...rc.electricCars.hybridBatteryWarranty.rows];
for (const w of warranties) {
  const label = `warranty ${w.make} ${w.models ?? ""}`;
  ok(`${label}: years 1–15 or null`, w.years == null || (w.years >= 1 && w.years <= 15), String(w.years));
  ok(`${label}: km 50,000–1,000,000 or null`, w.km == null || (w.km >= 50000 && w.km <= 1000000), String(w.km));
  ok(`${label}: minimum SoH 50–90 % or null`, w.minSoHPct == null || (w.minSoHPct >= 50 && w.minSoHPct <= 90), String(w.minSoHPct));
  ok(`${label}: has a source of its own`, "source" in w);
  ok(`${label}: a number without a quote is not primary`, w.years == null || w.status !== "primary" || !!w.quote);
}

// 4. The recall snapshot.
const a = recalls.alerts;
ok("recalls: meta source id is known", recalls.meta.source in sources, recalls.meta.source);
ok("recalls: count matches", recalls.meta.count === a.length, `${recalls.meta.count} vs ${a.length}`);
ok("recalls: at least 500 alerts", a.length >= 500, String(a.length));
ok("recalls: ids unique", new Set(a.map((x) => x.id)).size === a.length);
ok(
  "recalls: link pattern points to Safety Gate",
  /^https:\/\/ec\.europa\.eu\/safety-gate-alerts\/.*\{alert\}$/.test(recalls.meta.urlPattern),
);
ok(
  "recalls: every alert has an alert number",
  a.every((x) => Number.isInteger(x.alert) && x.alert > 0),
);
ok(
  "recalls: makes is a list, and almost every alert has one",
  a.every((x) => Array.isArray(x.makes)) && a.filter((x) => !x.makes.length).length <= 5,
);
ok(
  "recalls: weeks within the period",
  a.every((x) => x.week >= recalls.meta.period.from && x.week <= recalls.meta.period.to),
);
ok(
  "recalls: years ordered and plausible",
  a.every((x) => x.years == null || (x.years[0] <= x.years[1] && x.years[0] >= 1980 && x.years[1] <= 2049)),
);
ok(
  "recalls: no contact or personal fields",
  a.every((x) => !Object.keys(x).some((k) => /contact|name|person|email|phone/i.test(k))),
);
ok(
  "recalls: summaries are short",
  a.every((x) => x.summary.length <= 300),
);
const kb = Buffer.byteLength(readFileSync(join(root, "data", "car-recalls-eu.json")), "utf8") / 1024;
ok("recalls: file under 2 MB", kb < 2048, `${Math.round(kb)} KB`);

console.log(`\n${pass} passed, ${fail} failed (${numbers} numbers checked for a source)`);
process.exit(fail ? 1 : 0);
