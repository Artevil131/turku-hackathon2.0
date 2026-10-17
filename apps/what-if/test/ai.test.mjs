// Tests for the AI-reader side of the page, with a mocked /api/read, in Node, no browser:
// contact stripping, when to call, results built from AI-style fields, a draft card, and the fallback.
//   node apps/what-if/test/ai.test.mjs
// Like reader.test.mjs it runs the engine from index.html itself.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const html = readFileSync(join(root, "index.html"), "utf8");
const data = JSON.parse(html.match(/<script id="wi-data" type="application\/json">([\s\S]*?)<\/script>/)[1]);
const code = html.slice(html.indexOf("/* engine:start */"), html.indexOf("/* engine:end */"));
const engine = new Function(`${code}\nreturn createEngine;`)()(data, new Date("2026-10-17T12:00:00"));
const load = (...p) => JSON.parse(readFileSync(join(root, ...p), "utf8"));
const samples = [...load("data", "sample-ads.json").tests, ...load("data", "sample-ads-moto.json").tests];
const unsupported = load("data", "sample-ads-moto.json").notSupported;
const draftFixture = load("test", "fixtures", "ai-draft-moped.json");

let pass = 0, fail = 0;
const ok = (label, cond, detail = "") => {
  if (cond) pass++; else fail++;
  console.log(`${cond ? "pass" : "FAIL"}  ${label}${cond || !detail ? "" : `  (${detail})`}`);
};

// 1. Contact details never leave the page.
const KEEP = "Hinta 13 900 €\n189 000 km\nID 16000001\n00100 Helsinki\nPäivitetty 12.10.2026\nklo 17:00 - 17:25\nVuokra 1 090 €/kk\nVakuus 2 kk:n vuokra\nABC-123";
const STRIP = [
  ["Finnish mobile with spaces", "Soita 040 123 4567 iltaisin", ["123 4567"]],
  ["mobile without spaces", "puh 0401234567", ["0401234567"]],
  ["+358", "Call +358 40 123 4567", ["123 4567"]],
  ["landline in brackets", "Tiedustelut (09) 123 4567", ["123 4567"]],
  ["e-mail", "Kysy lisää: matti.meikalainen@example.com", ["meikalainen@example"]],
  ["Netti* seller block", "Myyjä\nJäsenenä 9 vuotta\nMatti Meikäläinen\nTunnistettu yksityinen myyjä", ["Meikäläinen"]],
  ["Oikotie contact block", "Ota yhteyttä\nMaija Esimerkki\nNäytä numero", ["Esimerkki"]],
  ["a name before a phone number", "Maija Esimerkki, puh. 050 765 4321", ["Esimerkki", "765 4321"]],
];
for (const [label, text, gone] of STRIP) {
  const s = engine.stripContacts(text);
  ok(`strip: ${label}`, gone.every((g) => !s.includes(g)), s.replace(/\n/g, " | "));
}
ok("strip: keeps prices, km, ids, postcodes, dates, times and plates", engine.stripContacts(KEEP) === KEEP, engine.stripContacts(KEEP).replace(/\n/g, " | "));
ok("strip: keeps 'Tunnistettu yksityinen myyjä' (the seller type)", engine.stripContacts("Jäsenenä 2 vuotta\nMatti Meikäläinen\nTunnistettu yksityinen myyjä").includes("Tunnistettu yksityinen myyjä"));

// 2. When to call: never for an ad the rules read in full, always when they can't.
const notCalled = samples.filter((t) => engine.plan(t.text).callAI);
ok(`plan: none of the ${samples.length} sample ads calls the AI`, notCalled.length === 0, notCalled.map((t) => t.id).join(", "));
for (const x of unsupported) ok(`plan: ${x.id} calls the AI`, engine.plan(x.text).callAI === true);
const CALL = [
  ["a sofa", "Myydään kolmen istuttava sohva, harmaa kangas. Nouto Turusta. Hinta 120 €", true],
  ["a car the rules can't name", "Myydään Volkkari Passatti 2008, ajettu 240tkm, hyvä kunto, 3500e, Lahti", true],
  ["a Lada (make known, no model data)", "Lada Niva 1.7 4x4\n2005\n120 000 km\nBensiini, manuaali\nHinta 3 000 €\nKuopio", true],
  ["a flat without a building year", "Myydään kaksio Turku\n52 m²\nVelaton hinta 99 000 €\nHoitovastike 210 € / kk", true],
  ["a rental without a rent", "Vuokrataan kaksio Tampereelta\n48 m²\nVuokrasopimus toistaiseksi voimassa\nVakuus 2 kk", true],
  ["a link", "https://www.nettiauto.com/skoda/octavia/16000001", false],
  ["a scrap", "Golf 2010", false],
];
for (const [label, text, want] of CALL) ok(`plan: ${label} ${want ? "calls" : "doesn't call"} the AI`, engine.plan(text).callAI === want);

// 3. Results from AI-style fields: each sample's expected values, as if the AI had returned them.
const full = (r) => r && !r.message && r.asks?.length === 3 && r.asks.every((a) => a.who) && /reminders/i.test(r.insure?.title ?? "") && r.cover?.items?.length > 0;
for (const t of samples) {
  const fields = { ...t.expected };
  delete fields.licence; // not in the contract: the rules work it out from cm³ and kW
  const r = engine.fromAI(t.kind, fields, "", "test-model");
  ok(`AI fields: ${t.id} gives a full ${t.kind} result`, full(r) && r.kind === t.kind && /AI model/.test(r.aiNote ?? ""), r ? `kind ${r.kind}, ${r.asks?.length} asks` : "no result");
  if (t.kind === "moto" && t.expected.licence) {
    const want = t.expected.licence === "A" ? "Needs an A licence" : `Needs an ${t.expected.licence} licence`;
    ok(`AI fields: ${t.id} licence class worked out as ${t.expected.licence}`, (r?.specs ?? "").includes(want), r?.specs);
  }
}
const mixed = engine.fromAI("car", { make: "Toyota", model: "Corolla", year: 2011, km: 150000, price: 4000 }, "Toyota Corolla\n2010\nHinta 5 000 €", "test-model");
ok("AI fields: the rules' values win (year 2010 and €5,000 from the ad), the AI fills the km", mixed && mixed.specs.startsWith("2010") && mixed.price === 5000 && mixed.specs.includes("150,000 km"), mixed?.specs);
ok("AI fields: garbage gives no result", engine.fromAI("car", { make: 42, model: ["x"], year: "soon" }, "", "m") === null);
const evil = engine.fromAI("car", { make: "<img src=x onerror=alert(1)>", model: "<b>X</b>" }, "", "m");
ok("AI fields: HTML from the AI is escaped", !evil || !/<img|<b>/.test(JSON.stringify(evil)), JSON.stringify(evil?.name));

// 4. A draft card from a fixture.
const d = engine.draftResult(draftFixture.draft, draftFixture.model);
ok("draft: built from the fixture", d && d.kind === "draft" && d.item === "a 50 cc moped" && d.asks.length === 3);
ok("draft: the what-if with a € figure is dropped", d && d.whatIfs.length === 3 && !d.whatIfs.some((w) => /€/.test(w.text)), d?.whatIfs.map((w) => w.text).join(" | "));
ok("draft: who-pays labels", d && d.whatIfs.map((w) => w.who).join(" / ") === "Covered by insurance · after your excess / Not covered · you pay / Depends on the policy · check before you sign");
ok("draft: HTML is escaped", d && d.whatIfs[2].text.includes("&lt;b&gt;") && !d.whatIfs[2].text.includes("<b>"));
ok("draft: says it was written by AI", d && /Written by AI from the ad/.test(d.disclaimer));
ok("draft: the hand-over is If's", d && /If/.test(d.insure.title));
ok("draft: no asks means no draft", engine.draftResult({ item: "x", asks: [], whatIfs: [{ text: "What if?", whoPays: "you" }] }, "m") === null);

// 5. The page with a mocked endpoint: what goes out, what comes back, and every way it can fail.
const moped = unsupported.find((x) => x.id === "moped-1").text;
const sofa = "Myydään kolmen istuttava sohva, harmaa kangas. Nouto Turusta, soita 040 123 4567. Hinta 120 €";
const messyCar = "Myydään Volkkari Passatti 2008, ajettu 240tkm, hyvä kunto, 3500e, Lahti. Soita 040 111 2222 tai matti@example.com";
const reply = (status, body) => async () => ({ ok: status >= 200 && status < 300, status, json: async () => (typeof body === "function" ? body() : body) });
const sent = [];
const recording = (status, body) => async (url, opts) => { sent.push({ url, opts }); return reply(status, body)(); };

const carAnswer = { ok: true, model: "@cf/test/model", kind: "car", draft: null,
  fields: { make: "Volkswagen", model: "Passat", year: 2008, km: 240000, price: 3500, fuel: null, gearbox: null, sellerType: null, city: "Lahti", lastInspection: null } };
const viaAI = await engine.analyseWithAI(messyCar, { fetch: recording(200, carAnswer) });
ok("fetch: a messy car ad becomes a car result from the AI's fields", full(viaAI) && viaAI.kind === "car" && /Volkswagen Passat/.test(viaAI.name) && /Traficom/.test(JSON.stringify(viaAI.asks)), viaAI?.name ?? viaAI?.message);
const req = sent.at(-1);
const body = req ? JSON.parse(req.opts.body) : {};
ok("fetch: POST to /api/read with {text}", req?.url === "/api/read" && req?.opts.method === "POST" && typeof body.text === "string");
ok("fetch: the text that went out has no phone number or e-mail", body.text && !/111 2222|matti@example/.test(body.text) && /\[phone removed\]/.test(body.text), body.text);
const long = await engine.analyseWithAI(`${messyCar}\n${"x".repeat(20000)}`, { fetch: recording(200, carAnswer) });
ok("fetch: at most 12,000 characters go out", JSON.parse(sent.at(-1).opts.body).text.length <= 12000 && !!long);

const draftViaAI = await engine.analyseWithAI(moped, { fetch: reply(200, draftFixture) });
ok("fetch: a moped becomes an AI draft", draftViaAI?.kind === "draft" && draftViaAI.asks.length === 3);

let calls = 0;
const counting = async () => { calls++; return reply(200, carAnswer)(); };
await engine.analyseWithAI(samples[0].text, { fetch: counting });
ok("fetch: an ad the rules read in full makes no call", calls === 0);

const rules = (text) => JSON.stringify(engine.analyse(text));
const FAILS = [
  ["network error", async () => { throw new TypeError("Failed to fetch"); }],
  ["500 ai_unavailable", reply(500, { ok: false, error: "ai_unavailable" })],
  ["413 too_long", reply(413, { ok: false, error: "too_long" })],
  ["broken JSON", reply(200, () => { throw new SyntaxError("Unexpected token"); })],
  ["ok: false", reply(200, { ok: false, error: "unreadable" })],
  ["kind none", reply(200, { ok: true, model: "m", kind: "none", fields: null, draft: null })],
  ["a car without make or model", reply(200, { ok: true, model: "m", kind: "car", fields: { year: 2001 }, draft: null })],
  ["an empty draft", reply(200, { ok: true, model: "m", kind: "other", fields: null, draft: { item: "", asks: [], whatIfs: [] } })],
  ["an unknown kind", reply(200, { ok: true, model: "m", kind: "spaceship", fields: {}, draft: null })],
];
for (const [label, fetchMock] of FAILS) {
  ok(`fallback: ${label} gives today's moped message`, JSON.stringify(await engine.analyseWithAI(moped, { fetch: fetchMock })) === rules(moped));
  ok(`fallback: ${label} gives today's sofa message`, JSON.stringify(await engine.analyseWithAI(sofa, { fetch: fetchMock })) === rules(sofa));
}
const t0 = Date.now();
const hung = await engine.analyseWithAI(moped, { fetch: () => new Promise(() => {}), timeoutMs: 60 });
ok("fallback: no answer within the time limit gives today's message", JSON.stringify(hung) === rules(moped) && Date.now() - t0 < 2000, `${Date.now() - t0} ms`);
ok("fallback: no fetch at all (the artifact, the file on disk) is rules only", JSON.stringify(await engine.analyseWithAI(moped, {})) === rules(moped));

console.log(`\nAI reader: ${pass} of ${pass + fail} pass.`);
process.exit(fail ? 1 : 0);
