// The risk map: what an ad implies that a buyer should know, from three
// places: what the ad itself says (each mention with its quote), rules on
// its facts with a named source, and open data (lookups.ts). Lookup only,
// no model. Sources marked `secondary` are a thesis, a trade survey or a
// press figure and need a primary source before the pitch
// (research/sources.md).

import { areaPrice, inspectionStats } from "./lookups.ts";
import { type Fields, HOMES, type Listing, type Mention, type MentionRisk } from "./schema.ts";

export interface Source {
  name: string;
  url: string;
  /** Not a primary source; do not put on a slide as is. */
  secondary?: true;
}

export type Text = { fi: string; en: string };

export interface Cost {
  eur: number;
  per: "total" | "year";
  basis: Text;
}

export interface Risk {
  id: string;
  title: Text;
  why: Text;
  cost?: Cost;
  /** A rule's or a statistic's source. */
  source?: Source;
  /** The ad's own words, when the ad said it. */
  quote?: string;
}

/** Pipes in Finnish blocks are renewed at roughly 40–55 years; most current projects are in 1970s–80s buildings. */
export const PIPE_RENOVATION_AGE = 40;
/** Median total cost of a traditional pipe renovation per m² of living area (Isännöintiliitto 2026). */
export const PIPE_RENOVATION_EUR_PER_M2 = { country: 890, capitalRegion: 1000 } as const;
const CAPITAL_REGION = ["helsinki", "espoo", "vantaa", "kauniainen"];

export const SOURCES = {
  pipes: {
    name: "Isännöintiliitto, Putkiremonttibarometri 2026",
    url: "https://www.isannointiliitto.fi/wp-content/uploads/2026/05/Putkiremonttibaro-2026-tulokset.pdf",
  },
  leaks: {
    name: "Finanssiala ry, vuotovahingot 2021 (20.5.2022)",
    url: "https://www.sttinfo.fi/tiedote/69941993/vuotovahingot-kaantyivat-nousuun-putkiremontin-suunnittelu-kannattaa-aloittaa-jo-ennen-kuin-putket-vanhenevat-kasiin",
  },
  asbestos: {
    name: "Isännöintiliitto, Osakkaan asbestiohje; hinta: Urakkamaailma 4–6/2025",
    url: "https://www.isannointiliitto.fi/wp-content/uploads/2020/05/osakkaan-asbestiohje.pdf",
  },
  falsePlinth: {
    name: "Theseus, 1970- ja 1980-luvun asuinrakennusten korjaustarve",
    url: "https://www.theseus.fi/handle/10024/347668",
    secondary: true,
  },
  radon: { name: "STUK, radon", url: "https://stuk.fi/radon" },
  inspectionRule: {
    name: "Traficom, katsastusajankohdat ajoneuvoluokittain",
    url: "https://traficom.fi/fi/autoilijat/katsastus/katsastusajankohdat-ajoneuvoluokittain",
  },
  carUpkeep: {
    name: "Moottori / Beely 2022",
    url: "https://moottori.fi/uutinen/suomalaiset-korjaavat-autojaan-keskimaarin-1-070-eurolla-kulut-kasvaneet-10-vuodessa/",
    secondary: true,
  },
  dog: {
    name: "Suomen Kennelliitto ja Taloustutkimus, koiranomistajatutkimus 2/2025",
    url: "https://www.sttinfo.fi/files/1744/70976680/195916/fi",
    secondary: true,
  },
} satisfies Record<string, Source>;

/** What the app calls each risk an ad can mention. */
export const MENTION_TITLES: Record<MentionRisk, Text> = {
  pipe_renovation: { fi: "Putkiremontti", en: "Pipe renovation" },
  facade_renovation: { fi: "Julkisivuremontti", en: "Facade renovation" },
  roof_renovation: { fi: "Kattoremontti", en: "Roof renovation" },
  balcony_renovation: { fi: "Parvekeremontti", en: "Balcony renovation" },
  window_renovation: { fi: "Ikkunaremontti", en: "Window renovation" },
  elevator_renovation: { fi: "Hissiremontti", en: "Lift renovation" },
  drainage_renovation: { fi: "Salaojaremontti", en: "Drainage renovation" },
  moisture_damage: { fi: "Kosteusvaurio", en: "Moisture damage" },
  mould: { fi: "Home", en: "Mould" },
  false_plinth: { fi: "Valesokkeli", en: "False plinth" },
  oil_heating: { fi: "Öljylämmitys", en: "Oil heating" },
  asbestos: { fi: "Asbesti", en: "Asbestos" },
  radon: { fi: "Radon", en: "Radon" },
  flood: { fi: "Tulvariski", en: "Flood risk" },
  rust: { fi: "Ruoste", en: "Rust" },
  accident_damage: { fi: "Kolarivaurio", en: "Accident damage" },
  engine_fault: { fi: "Moottorivika", en: "Engine fault" },
  timing_belt: { fi: "Jakohihna", en: "Timing belt" },
  battery_condition: { fi: "Akun kunto", en: "Battery condition" },
  imported: { fi: "Tuontiajoneuvo", en: "Imported vehicle" },
  service_history: { fi: "Huoltohistoria", en: "Service history" },
  sold_as_is: { fi: "Myydään sellaisena kuin on", en: "Sold as is" },
  hereditary_disease: { fi: "Perinnöllinen sairaus", en: "Hereditary disease" },
  health_tests: { fi: "Terveystutkimukset", en: "Health tests" },
};

const STATUS: Record<Mention["status"], Text> = {
  done: { fi: "tehty", en: "done" },
  planned: { fi: "tulossa", en: "coming" },
  present: { fi: "ilmoitettu", en: "reported" },
  not_done: { fi: "ei tehty", en: "not done" },
};

const mention = (listing: Listing, risk: MentionRisk) => listing.mentions.find((m) => m.risk === risk);

/** Years since the ad's year, counted from `today`. */
export const ageOf = (f: Fields, today: string) => (f.year ? Number(today.slice(0, 4)) - f.year.value : undefined);

/** "due" when old enough and the ad states no renovation done or coming. */
export function pipeStatus(listing: Listing, today: string): "done" | "planned" | "due" | undefined {
  if (!listing.category || !HOMES.includes(listing.category)) return undefined;
  const m = mention(listing, "pipe_renovation");
  if (m?.status === "done" || m?.status === "planned") return m.status;
  const age = ageOf(listing.fields, today);
  return age !== undefined && age >= PIPE_RENOVATION_AGE ? "due" : undefined;
}

export function pipeCost(f: Fields): Cost | undefined {
  if (!f.sizeM2 || f.priceKind?.value !== "sale") return undefined;
  const capital = CAPITAL_REGION.includes((f.municipality?.value ?? "").toLowerCase());
  const perM2 = capital ? PIPE_RENOVATION_EUR_PER_M2.capitalRegion : PIPE_RENOVATION_EUR_PER_M2.country;
  return {
    eur: Math.round((f.sizeM2.value * perM2) / 100) * 100,
    per: "total",
    basis: {
      fi: `${f.sizeM2.value} m² × ${perM2} €/m², perinteisen putkiremontin mediaani ${capital ? "pääkaupunkiseudulla" : "koko maassa"} 2026`,
      en: `${f.sizeM2.value} m² × ${perM2} €/m², median traditional pipe renovation ${capital ? "in the capital region" : "nationally"} 2026`,
    },
  };
}

const fmt = (n: number) => n.toLocaleString("fi-FI").replace(/ /g, " ");

function homeRisks(listing: Listing, today: string): Risk[] {
  const f = listing.fields;
  const out: Risk[] = [];
  const pipes = pipeStatus(listing, today);
  const builtYear = f.year?.value;
  const small = f.buildingType && f.buildingType.value !== "apartment";

  if (pipes === "due" || pipes === "planned")
    out.push({
      id: pipes === "due" ? "pipes-due" : "pipes-planned",
      title:
        pipes === "due"
          ? { fi: "Putkiremontti edessä", en: "Pipe renovation ahead" }
          : { fi: "Putkiremontti tulossa", en: "Pipe renovation coming" },
      why:
        pipes === "due"
          ? {
              fi: "Talo on yli 40 vuotta vanha eikä ilmoitus kerro putkiremontista. Putkiremontteja tehdään nyt eniten 1970- ja 80-luvun taloissa; työ kestää noin puoli vuotta, jona aikana asunnossa ei yleensä voi asua.",
              en: "The building is over 40 and the ad mentions no pipe renovation. Most pipe renovations now happen in buildings from the 1970s and 80s; the work takes about six months, usually without living in the flat.",
            }
          : {
              fi: "Osakkaan osuus tulee vastikkeena tai kertasuorituksena; vuokralainen muuttaa remontin ajaksi.",
              en: "An owner pays their share as a charge or a lump sum; a tenant moves out for the duration.",
            },
      cost: pipeCost(f),
      source: SOURCES.pipes,
      quote: mention(listing, "pipe_renovation")?.quote,
    });
  if (pipes === "due" || pipes === "planned")
    out.push({
      id: "leaks",
      title: { fi: "Vuotovahinkojen riski", en: "Water damage risk" },
      why: {
        fi: "Vanhat putket vuotavat. Vuonna 2021 vakuutusyhtiöt korvasivat 34 800 vuotovahinkoa, 171 M€, enemmän kuin palovahingoista. Tarkista vuotovahti ja kotivakuutuksen vuototurva ennen muuttoa.",
        en: "Old pipes leak. In 2021 insurers paid for 34 800 leaks, 171 M€, more than for fires. Check a leak sensor and your home policy's leak cover before you move in.",
      },
      cost: {
        eur: Math.round(171_000_000 / 34_800 / 100) * 100,
        per: "total",
        basis: { fi: "keskimääräinen korvattu vuotovahinko 2021", en: "average paid water-damage claim, 2021" },
      },
      source: SOURCES.leaks,
    });
  if (builtYear !== undefined && builtYear < 1994)
    out.push({
      id: "asbestos",
      title: { fi: "Asbestikartoitus ennen remonttia", en: "Asbestos survey before any renovation" },
      why: {
        fi: "Ennen vuotta 1994 valmistuneessa rakennuksessa mitään ei saa purkaa ilman asbestikartoitusta, ei edes yhdessä huoneistossa. Asbestia käytettiin 1922–1992.",
        en: "In a building finished before 1994 nothing may be demolished without an asbestos survey, even inside one flat. Asbestos was used from 1922 to 1992.",
      },
      cost: { eur: 1255, per: "total", basis: { fi: "asbestipurkutyön mediaani 2025", en: "median asbestos removal job, 2025" } },
      source: SOURCES.asbestos,
      quote: mention(listing, "asbestos")?.quote,
    });
  const plinth = mention(listing, "false_plinth");
  if (plinth || (small && builtYear !== undefined && builtYear >= 1960 && builtYear <= 1989))
    out.push({
      id: "false-plinth",
      title: { fi: "Riskirakenne: valesokkeli", en: "Risk structure: false plinth" },
      why: {
        fi: `${plinth ? "Ilmoitus mainitsee valesokkelin. " : ""}Valesokkeli oli 1970- ja 80-lukujen pientalojen yleisin perustamistapa; puurungon alaosa jää maan kosteuden ulottuville. Kuntotarkastus ennen kauppaa.`,
        en: `${plinth ? "The ad mentions a false plinth. " : ""}It was the most common foundation of small houses in the 1970s and 80s; the bottom of the wooden frame sits within reach of ground moisture. Get a condition inspection before buying.`,
      },
      source: SOURCES.falsePlinth,
      quote: plinth?.quote,
    });
  if (small)
    out.push({
      id: "radon",
      title: { fi: "Mittaa radon", en: "Measure radon" },
      why: {
        fi: "Maanvaraisessa talossa radon selviää vain mittaamalla. Viitearvo on 300 Bq/m³, suomalaisten asuntojen keskiarvo noin 94. Mittaus kestää vähintään kaksi kuukautta syys–toukokuussa.",
        en: "In a house on the ground radon is only known by measuring. The reference level is 300 Bq/m³; the Finnish average is about 94. A measurement takes at least two months between September and May.",
      },
      source: SOURCES.radon,
    });
  const price = areaPrice(listing);
  if (price)
    out.push({
      id: "area-price",
      title: { fi: "Hinta alueeseen verrattuna", en: "Price against the area" },
      why: {
        fi: `Ilmoituksen ${fmt(price.adEurPerM2)} €/m² on ${price.diffPct >= 0 ? `${price.diffPct} % yli` : `${-price.diffPct} % alle`} alueen ${price.area} vanhojen asuntojen keskineliöhinnan ${fmt(price.areaEurPerM2)} €/m² (${price.year}, ${price.sales} kauppaa).`,
        en: `The ad's ${fmt(price.adEurPerM2)} €/m² is ${price.diffPct >= 0 ? `${price.diffPct} % above` : `${-price.diffPct} % below`} the ${price.year} average for old flats in ${price.area}, ${fmt(price.areaEurPerM2)} €/m² (${price.sales} sales).`,
      },
      source: price.source,
    });
  return out;
}

function carRisks(listing: Listing, today: string): Risk[] {
  const f = listing.fields;
  const out: Risk[] = [];
  const age = ageOf(f, today);
  const stats = inspectionStats(listing);
  if (stats)
    out.push({
      id: "model-inspections",
      title: { fi: "Mallin katsastushistoria", en: "How this model does at inspection" },
      why: {
        fi: `Vuonna ${stats.year} katsastetuista ${stats.commissioned} käyttöön otetuista ${stats.model} -autoista (${fmt(stats.inspected)}) hylättiin ${stats.failPct} %, kaikista saman vuoden autoista ${stats.allFailPct} %. Mittarilukeman mediaani oli ${fmt(stats.medianKm)} km${stats.mileageVsMedianPct !== undefined ? `; ilmoituksen auto on ajanut ${stats.mileageVsMedianPct >= 0 ? `${stats.mileageVsMedianPct} % enemmän` : `${-stats.mileageVsMedianPct} % vähemmän`}` : ""}.`,
        en: `Of the ${fmt(stats.inspected)} ${stats.model} cars from ${stats.commissioned} inspected in ${stats.year}, ${stats.failPct} % failed, against ${stats.allFailPct} % of all cars that age. Their median reading was ${fmt(stats.medianKm)} km${stats.mileageVsMedianPct !== undefined ? `; this one has done ${stats.mileageVsMedianPct >= 0 ? `${stats.mileageVsMedianPct} % more` : `${-stats.mileageVsMedianPct} % less`}` : ""}.`,
      },
      source: stats.source,
    });
  if (age !== undefined && age > 10)
    out.push({
      id: "yearly-inspection",
      title: { fi: "Katsastus joka vuosi", en: "Inspected every year" },
      why: {
        fi: "Yli 10 vuotta käyttöönotosta henkilöauto katsastetaan vuosittain.",
        en: "A car more than 10 years past commissioning is inspected every year.",
      },
      source: SOURCES.inspectionRule,
    });
  out.push({
    id: "upkeep",
    title: { fi: "Huolto ja korjaukset", en: "Servicing and repairs" },
    why: {
      fi: "Autonomistaja käyttää huoltoihin ja korjauksiin keskimäärin noin 1 070 € vuodessa (2022).",
      en: "A Finnish car owner spends about 1 070 € a year on servicing and repairs (2022).",
    },
    cost: { eur: 1070, per: "year", basis: { fi: "keskiarvo 2022", en: "average, 2022" } },
    source: SOURCES.carUpkeep,
  });
  return out;
}

function petRisks(listing: Listing): Risk[] {
  if (listing.fields.species?.value !== "dog") return [];
  return [
    {
      id: "dog-costs",
      title: { fi: "Koiran vuosikulut", en: "What a dog costs a year" },
      why: {
        fi: "Koiran perustarpeisiin kuluu keskimäärin 1 561 € vuodessa; suurimmat erät ovat ruoka sekä eläinlääkäri ja lääkkeet, jotka kasvavat koiran vanhetessa.",
        en: "A dog's basic needs cost on average 1 561 € a year; the largest items are food and vet and medicine, which grow as the dog ages.",
      },
      cost: { eur: 1561, per: "year", basis: { fi: "keskiarvo 2025", en: "average, 2025" } },
      source: SOURCES.dog,
    },
  ];
}

/** Every mention the ad makes, in its own words, unless a rule above already carries the quote. */
function mentionRisks(listing: Listing, taken: Set<string>): Risk[] {
  return listing.mentions
    .filter((m) => !taken.has(m.quote))
    .map((m) => ({
      id: `ad-${m.risk}`,
      title: {
        fi: `${MENTION_TITLES[m.risk].fi}: ${STATUS[m.status].fi}${m.year ? ` ${m.year}` : ""}`,
        en: `${MENTION_TITLES[m.risk].en}: ${STATUS[m.status].en}${m.year ? ` ${m.year}` : ""}`,
      },
      why: { fi: `Ilmoituksessa lukee: “${m.quote}”.`, en: `The ad says: “${m.quote}”.` },
      quote: m.quote,
    }));
}

/** Every risk that applies to this ad. */
export function risksFor(listing: Listing, today: string): Risk[] {
  if (listing.kind !== "listing" || !listing.category) return [];
  const c = listing.category;
  const rules = HOMES.includes(c)
    ? homeRisks(listing, today)
    : c === "car"
      ? carRisks(listing, today)
      : c === "pet"
        ? petRisks(listing)
        : [];
  const taken = new Set(rules.map((r) => r.quote).filter((q): q is string => !!q));
  return [...mentionRisks(listing, taken), ...rules];
}
