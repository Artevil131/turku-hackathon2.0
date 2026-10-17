// What if… on Cloudflare. Static assets serve the page; this Worker runs only for /api/*.
//
// POST /api/read {text} passes an ad the page's rules can't read to the team's listing reader on
// chili (Qwen3.8-27B, D-024–D-027) and answers in What if…'s own fields, or, for kinds we have no
// facts for, a short draft (D-028). The reader only reports what the ad says (every field quotes
// the ad); costs and who pays still come from the page's sourced data. The reader's address and
// team token are Worker secrets, never in the repo or the page. The ad's text is used for this
// one answer; nothing is stored or logged. Contract: apps/what-if/README.md.

const MAX_CHARS = 12000;
const READER_TIMEOUT_MS = 11000; // the page stops waiting at 12 s
const MODEL = "Qwen3.8-27B";

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);
    if (pathname === "/api/read") return readAd(request, env);
    return reply({ ok: false, error: "not_found" }, 404);
  },
};

async function readAd(request, env) {
  if (request.method !== "POST") return reply({ ok: false, error: "bad_request" }, 405);
  let body;
  try {
    body = await request.json();
  } catch {
    return reply({ ok: false, error: "bad_request" }, 400);
  }
  if (typeof body?.text !== "string") return reply({ ok: false, error: "bad_request" }, 400);
  if (body.text.length > MAX_CHARS) return reply({ ok: false, error: "too_long" }, 413);
  // The page strips contact details first; this is the second line of defence.
  const text = stripContacts(body.text).trim();
  if (text.length < 20) return reply({ ok: false, error: "bad_request" }, 400);
  if (!env.AHEAD_ADDRESS || !env.AHEAD_TEAM_TOKEN) return reply({ ok: false, error: "ai_unavailable" }, 503);

  let res;
  try {
    res = await withTimeout(
      fetch(new URL("/api/listing", env.AHEAD_ADDRESS), {
        method: "POST",
        headers: { authorization: `Bearer ${env.AHEAD_TEAM_TOKEN}`, "content-type": "application/json" },
        body: JSON.stringify({ text }),
      }),
      READER_TIMEOUT_MS,
    );
  } catch {
    return reply({ ok: false, error: "ai_unavailable" }, 503);
  }
  // 401 (token replaced), 429 (the team's hourly limit), 502 (model restarting): the page uses its rules.
  if (!res.ok) return reply({ ok: false, error: "ai_unavailable", status: res.status }, 503);
  let answer;
  try {
    answer = await res.json();
  } catch {
    return reply({ ok: false, error: "unreadable" }, 502);
  }
  const out = fromListing(answer, text);
  if (!out) return reply({ ok: false, error: "unreadable" }, 502);
  return reply({ ok: true, model: MODEL, ...out });
}

export function stripContacts(s) {
  return s
    .replace(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g, "[email removed]")
    .replace(/(?:\+|\b00)\d{1,3}[\s-]?(?:\(?\d{1,4}\)?[\s-]?){2,5}\d{2,4}\b/g, "[phone removed]")
    .replace(/\b0\d{1,3}[\s-]?\d{3}[\s-]?\d{2,4}(?:[\s-]?\d{2,4})?\b/g, "[phone removed]");
}

function withTimeout(promise, ms) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error("timeout")), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

// ---- the reader's answer, in What if…'s fields (apps/what-if/test/reader.test.mjs, CORE) ----

// Kinds What if… has no facts for, even when the reader files them as vehicles: they get a draft.
const NOT_OURS = /(?<!\p{L})(?:mopo|mopedi?|moped|skootteri 50|am-kortti|am licence|moottorikelkka|snowmobile|mönkijä|atv|quad)(?!\p{L})|(?<!\d)50 ?(?:cc|cm³|cm3)(?!\p{L})/iu;

export function fromListing(answer, text = "") {
  const listing = answer?.listing;
  if (!listing || typeof listing !== "object") return null;
  if (listing.kind !== "listing") return { kind: "none", fields: null, draft: null };
  const f = listing.fields && typeof listing.fields === "object" ? listing.fields : {};
  const val = (k) => f[k]?.value ?? null;
  const quote = (k) => (typeof f[k]?.quote === "string" ? f[k].quote : "");
  const mentions = Array.isArray(listing.mentions) ? listing.mentions : [];
  const mention = (risk) => mentions.find((m) => m?.risk === risk)?.status ?? null;
  const cat = listing.category;
  const rent = val("priceKind") === "rent_month";
  const price = num(val("priceEur"));
  const city = str(val("municipality"));
  const seller = ["dealer", "private"].includes(val("seller")) ? val("seller") : null;
  const flat = cat === "home" && !["detached", "cottage"].includes(val("buildingType"));

  if ((cat === "car" || cat === "motorcycle") && !rent && !NOT_OURS.test(text)) {
    const common = {
      make: str(val("make")), model: str(val("model")), year: year(val("year")), km: int(val("mileageKm")),
      price, officeFee: null, sellerType: seller, city, lastInspection: lastInspection(val("inspectedUntil"), quote("inspectedUntil")),
    };
    if (cat === "motorcycle") {
      return { kind: "moto", fields: { ...common, engineCc: null, powerKw: null, abs: null, modified: null, modifications: [] }, draft: null };
    }
    const flagOf = (status, yes, no) => (yes.includes(status) ? true : no.includes(status) ? false : null);
    return {
      kind: "car",
      fields: {
        ...common, previousPrice: null, fuel: fuel(val("fuel"), quote("fuel")),
        gearbox: ["manual", "automatic"].includes(val("transmission")) ? val("transmission") : null,
        flags: {
          timingBeltReplaced: mention("timing_belt") === "done" ? true : null,
          timingChain: null,
          serviceBook: flagOf(mention("service_history"), ["done", "present"], ["not_done"]),
          rustMentioned: flagOf(mention("rust"), ["present", "done"], ["not_done"]),
        },
      },
      draft: null,
    };
  }
  if (flat && rent) {
    return {
      kind: "rent",
      fields: {
        rent: price, deposit: null, depositMonths: null, buildingYear: year(val("year")), livingAreaM2: num(val("sizeM2")),
        homeInsuranceRequired: null, city, district: null, rooms: rooms(val("rooms")),
      },
      draft: null,
    };
  }
  if (flat) {
    // Like the page's rules: a price the ad doesn't label is the debt-free price (Etuovi's header price).
    const selling = /myyntihinta|selling price|pyyntihinta/i.test(quote("priceEur"));
    const pipe = mention("pipe_renovation");
    const pipeYear = year(mentions.find((m) => m?.risk === "pipe_renovation")?.year);
    return {
      kind: "home",
      fields: {
        buildingYear: year(val("year")), livingAreaM2: num(val("sizeM2")), debtFreePrice: selling ? null : price,
        sellingPrice: selling ? price : null, debtShare: null, maintenanceCharge: num(val("monthlyChargeEur")),
        financingCharge: null, plotRentCharge: null, city, district: null, rooms: rooms(val("rooms")),
        pipeRenovation: pipe
          ? { status: { done: "done", planned: "planned", present: "mentioned" }[pipe] ?? "not-mentioned", years: pipeYear ? [pipeYear] : [] }
          : null,
      },
      draft: null,
    };
  }
  return { kind: "other", fields: null, draft: draftFor(cat, val("title"), answer.risks, mentions, text) };
}

// Anything else (a moped, a boat, a cottage, a pet…): the reader's own risk cards where it has
// them, a few plain questions, and who pays in the page's three words. No figures.
const GROUP = {
  boat: "vehicle", caravan: "vehicle", motorcycle: "vehicle", car: "vehicle", home: "building", cottage: "building",
  pet: "pet", bicycle: "item", electronics: "item", other_item: "item",
};
const ITEM = {
  boat: "a boat", caravan: "a caravan", motorcycle: "a moped, snowmobile or ATV", car: "a vehicle", home: "a house",
  cottage: "a cottage", pet: "a pet", bicycle: "a bicycle", electronics: "an electronic device", other_item: "an item",
};
const ASKS = {
  vehicle: ["Can I see the service records and receipts?", "Has it been damaged or repaired?", "How has it been stored over the winter?"],
  building: ["Can I see the condition inspection report (kuntotarkastus)?", "What has been renovated, and when?", "Has there ever been moisture or water damage?"],
  pet: ["Can I see the health tests and the vaccination record?", "How healthy are the parents?", "Has the animal been ill or injured?"],
  item: ["Is there a receipt or a warranty left?", "Has it been repaired?", "Why is it being sold?"],
};
// Facts that hold for any policy; used when the reader names fewer than two risks.
const BASICS = {
  vehicle: [{ text: "It is stolen", whoPays: "insurance" }, { text: "The engine, clutch or tyres wear out", whoPays: "you" }],
  building: [{ text: "A pipe leaks and damages the building", whoPays: "insurance" }, { text: "Old pipes, roof or windows need renewing", whoPays: "you" }],
  pet: [{ text: "It falls ill or is injured", whoPays: "check" }, { text: "Food, routine care and vaccinations", whoPays: "you" }],
  item: [{ text: "It is stolen from your home", whoPays: "insurance" }, { text: "It breaks from wear and age", whoPays: "you" }],
};
// Renewals, wear and upkeep are never insured events; the rest depends on the policy.
const YOU_PAY = /renovation|timing_belt|engine_fault|battery|rust|service|inspection|tax|wear|plinth|oil_heating/;
const hasFigures = (s) => /[€%]|(?<!\p{L})euro|(?<!\p{L})eur(?!\p{L})|prosent|percent/iu.test(s);

function draftFor(cat, title, risks, mentions, text) {
  const group = NOT_OURS.test(text) ? "vehicle" : (GROUP[cat] ?? "item");
  const cards = (Array.isArray(risks) ? risks : [])
    .map((r) => ({ text: str(r?.title?.en ?? r?.title?.fi, 160), whoPays: YOU_PAY.test(String(r?.id)) ? "you" : "check" }))
    .filter((w) => w.text && !hasFigures(w.text));
  const whatIfs = (cards.length >= 2 ? cards : [...cards, ...BASICS[group]]).slice(0, 4);
  const asks = [
    ...mentions.map((m) => (m?.quote && !hasFigures(m.quote) ? `The ad says “${str(m.quote, 90)}”. What exactly does that mean?` : null)).filter(Boolean).slice(0, 1),
    ...ASKS[group],
  ].slice(0, 3);
  return { item: str(title, 80) ?? (NOT_OURS.test(text) ? ITEM.motorcycle : (ITEM[cat] ?? "this item")), asks, whatIfs };
}

// ---- small checks, in the page's formats ----

const thisYear = new Date().getFullYear();
function num(v) {
  if (typeof v === "number") return Number.isFinite(v) && v > 0 ? v : null;
  if (typeof v !== "string") return null;
  const n = Number.parseFloat(v.replace(/[\s ]/g, "").replace(/(\d),(\d)/, "$1.$2").replace(/[^\d.]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : null;
}
function int(v) {
  const n = num(v);
  return n == null ? null : Math.round(n);
}
function year(v) {
  const n = int(v);
  return n != null && n >= 1900 && n <= thisYear + 1 ? n : null;
}
function str(v, max = 80) {
  return typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null;
}
function fuel(v, q) {
  if (["petrol", "diesel", "electric", "gas"].includes(v)) return v;
  if (v !== "hybrid") return null;
  if (/plug-?in|ladattava|phev/i.test(q)) return "plug-in hybrid";
  return /diesel/i.test(q) ? "hybrid-diesel" : "hybrid-petrol";
}
// The reader keeps the month an ad gives for the inspection; What if… wants the last one done,
// so a "valid until" month is left out rather than read as the wrong thing.
function lastInspection(v, q) {
  if (typeof v !== "string" || !/^\d{4}-\d{2}$/.test(v)) return null;
  if (/voimassa|valid|asti|until|seuraava|next|erääntyy/i.test(q)) return null;
  return /katsastettu|katsastus|inspected|inspection|tarkastettu/i.test(q) ? v : null;
}
function rooms(v) {
  if (typeof v === "number") return int(v);
  if (typeof v !== "string") return null;
  const n = v.match(/(\d+)\s*(?:h|huone|room)/i);
  if (n) return Number(n[1]);
  const word = { yksiö: 1, kaksio: 2, kolmio: 3, neliö: 4 }[v.trim().toLowerCase()];
  return word ?? null;
}

function reply(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}
