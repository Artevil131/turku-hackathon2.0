// The risk map: what an ad's facts imply that the ad does not say, each
// rule with its named source and, where a source gives one, what it is
// likely to cost. Lookup only, no model: a rule fires on extracted fields
// and enrich() facts. Sources marked `secondary` are a thesis, a trade
// survey or a press figure and need a primary source before the pitch
// (research/sources.md).

import type { CarFacts, FlatFacts } from "./enrich.ts";
import type { CarFields, Fields, FlatFields, Listing } from "./schema.ts";

export interface Source {
  name: string;
  url: string;
  /** Not a primary source; do not put on a slide as is. */
  secondary?: true;
}

type Text = { fi: string; en: string };

export interface Cost {
  /** Euros, as the source gives them; `perYear` for running costs. */
  eur: number;
  per: "total" | "year";
  basis: Text;
}

export interface Risk {
  id: string;
  title: Text;
  why: Text;
  cost?: Cost;
  source: Source;
}

interface FlatRule {
  id: string;
  applies: (f: Fields<FlatFields>, facts: FlatFacts) => boolean;
  title: Text;
  why: Text;
  cost?: (f: Fields<FlatFields>, facts: FlatFacts) => Cost | undefined;
  source: Source;
}

interface CarRule {
  id: string;
  applies: (c: Fields<CarFields>, facts: CarFacts) => boolean;
  title: Text;
  why: Text;
  cost?: (c: Fields<CarFields>, facts: CarFacts) => Cost | undefined;
  source: Source;
}

/** Median total cost of a traditional pipe renovation per m² of living area (Isännöintiliitto 2026). */
export const PIPE_RENOVATION_EUR_PER_M2 = { country: 890, capitalRegion: 1000 } as const;
const CAPITAL_REGION = ["helsinki", "espoo", "vantaa", "kauniainen"];

const PUTKIBARO: Source = {
  name: "Isännöintiliitto, Putkiremonttibarometri 2026",
  url: "https://www.isannointiliitto.fi/wp-content/uploads/2026/05/Putkiremonttibaro-2026-tulokset.pdf",
};
const FINANSSIALA_LEAKS: Source = {
  name: "Finanssiala ry, vuotovahingot 2021 (20.5.2022)",
  url: "https://www.sttinfo.fi/tiedote/69941993/vuotovahingot-kaantyivat-nousuun-putkiremontin-suunnittelu-kannattaa-aloittaa-jo-ennen-kuin-putket-vanhenevat-kasiin",
};

const pipeCost = (f: Fields<FlatFields>): Cost | undefined => {
  if (!f.sizeM2 || f.deal?.value !== "sale") return undefined;
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
};

export const FLAT_RULES: readonly FlatRule[] = [
  {
    id: "pipes-due",
    applies: (_, facts) => facts.pipes === "due",
    title: { fi: "Putkiremontti edessä", en: "Pipe renovation ahead" },
    why: {
      fi: "Talo on yli 40 vuotta vanha eikä ilmoitus kerro putkiremontista. Putkiremontteja tehdään nyt eniten 1970- ja 80-luvun taloissa, ja työ kestää keskimäärin noin puoli vuotta, jona aikana asunnossa ei yleensä voi asua.",
      en: "The building is over 40 and the ad mentions no pipe renovation. Most pipe renovations now happen in buildings from the 1970s and 80s, and the work takes about six months, usually without living in the flat.",
    },
    cost: pipeCost,
    source: PUTKIBARO,
  },
  {
    id: "pipes-planned",
    applies: (_, facts) => facts.pipes === "planned",
    title: { fi: "Putkiremontti suunnitteilla", en: "Pipe renovation planned" },
    why: {
      fi: "Ilmoituksen mukaan putkiremontti on tulossa. Osakkaan osuus tulee vastikkeena tai kertasuorituksena, ja vuokralaiselle se tarkoittaa muuttoa remontin ajaksi.",
      en: "The ad says a pipe renovation is coming. An owner pays their share as a charge or a lump sum; a tenant moves out for the duration.",
    },
    cost: pipeCost,
    source: PUTKIBARO,
  },
  {
    id: "leaks-old-pipes",
    applies: (_, facts) => facts.pipes === "due" || facts.pipes === "planned",
    title: { fi: "Vuotovahinkojen riski", en: "Water damage risk" },
    why: {
      fi: "Vanhat putket vuotavat. Vuonna 2021 vakuutusyhtiöt korvasivat 34 800 vuotovahinkoa, yhteensä 171 M€, enemmän kuin palovahingoista. Vuotovahti ja kotivakuutuksen vuototurva kannattaa tarkistaa ennen muuttoa.",
      en: "Old pipes leak. In 2021 insurers paid for 34 800 leaks, 171 M€ in all, more than for fires. Check a leak sensor and your home policy's leak cover before you move in.",
    },
    cost: () => ({
      eur: Math.round(171_000_000 / 34_800 / 100) * 100,
      per: "total",
      basis: { fi: "keskimääräinen korvattu vuotovahinko 2021", en: "average paid water-damage claim, 2021" },
    }),
    source: FINANSSIALA_LEAKS,
  },
  {
    id: "asbestos",
    applies: (f) => (f.builtYear?.value ?? 9999) < 1994,
    title: { fi: "Asbestikartoitus ennen remonttia", en: "Asbestos survey before any renovation" },
    why: {
      fi: "Ennen vuotta 1994 valmistuneessa rakennuksessa mitään ei saa purkaa ilman asbestikartoitusta, ei edes yksittäisessä huoneistossa. Asbestia käytettiin rakennusmateriaaleissa 1922–1992. Kylpyhuone- tai keittiöremontin hintaan tulee kartoitus ja mahdollinen purku.",
      en: "In a building finished before 1994 nothing may be demolished without an asbestos survey, even inside one flat. Asbestos was used in building materials from 1922 to 1992. A bathroom or kitchen renovation costs the survey and possibly an asbestos removal on top.",
    },
    cost: () => ({
      eur: 1255,
      per: "total",
      basis: { fi: "asbestipurkutöiden mediaani, tarjouspyynnöt 4–6/2025", en: "median asbestos removal job, quote requests Apr–Jun 2025" },
    }),
    source: {
      name: "Isännöintiliitto, Osakkaan asbestiohje; hinta: Urakkamaailma 2025",
      url: "https://www.isannointiliitto.fi/wp-content/uploads/2020/05/osakkaan-asbestiohje.pdf",
    },
  },
  {
    id: "false-plinth",
    applies: (f) =>
      (f.buildingType?.value === "detached" || f.buildingType?.value === "terraced") &&
      (f.builtYear?.value ?? 0) >= 1960 &&
      (f.builtYear?.value ?? 9999) <= 1989,
    title: { fi: "Riskirakenne: valesokkeli", en: "Risk structure: false plinth" },
    why: {
      fi: "Valesokkeli oli 1970- ja 80-lukujen pientalojen yleisin perustamistapa. Puurungon alaosa jää maan kosteuden ulottuville. Kuntotarkastus ennen kauppaa.",
      en: "A false plinth was the most common foundation for small houses in the 1970s and 80s; the bottom of the wooden frame sits within reach of ground moisture. Get a condition inspection before buying.",
    },
    source: {
      name: "Theseus, 1970- ja 1980-luvun asuinrakennusten korjaustarve",
      url: "https://www.theseus.fi/handle/10024/347668",
      secondary: true,
    },
  },
  {
    id: "radon",
    applies: (f) => f.buildingType?.value === "detached" || f.buildingType?.value === "terraced",
    title: { fi: "Mittaa radon", en: "Measure radon" },
    why: {
      fi: "Maanvaraisessa talossa radon on mitattava, jotta tietää. Viitearvo on 300 Bq/m³, suomalaisten asuntojen keskiarvo noin 94. Luotettava mittaus kestää vähintään kaksi kuukautta syyskuun ja toukokuun välillä.",
      en: "In a house on the ground the only way to know radon is to measure it. The reference level is 300 Bq/m³; the Finnish average is about 94. A reliable measurement takes at least two months between September and May.",
    },
    source: { name: "STUK, radon", url: "https://stuk.fi/radon" },
  },
];

export const CAR_RULES: readonly CarRule[] = [
  {
    id: "yearly-inspection",
    applies: (_, facts) => facts.yearlyInspection === true,
    title: { fi: "Katsastus joka vuosi", en: "Inspected every year" },
    why: {
      fi: "Yli 10 vuotta käyttöönotosta henkilöauto katsastetaan vuosittain.",
      en: "A passenger car more than 10 years past commissioning is inspected every year.",
    },
    source: {
      name: "Traficom, katsastusajankohdat ajoneuvoluokittain",
      url: "https://traficom.fi/fi/autoilijat/katsastus/katsastusajankohdat-ajoneuvoluokittain",
    },
  },
  {
    id: "inspection-soon",
    applies: (_, facts) => facts.inspectionDaysLeft !== undefined && facts.inspectionDaysLeft < 90,
    title: { fi: "Katsastus pian umpeutumassa", en: "Inspection running out soon" },
    why: {
      fi: "Ilmoituksen katsastus on voimassa alle kolme kuukautta. Hylätty katsastus on ostajan kulu, joten kysy myyjältä viimeisin katsastuspöytäkirja.",
      en: "The ad's inspection is valid for less than three months. A failed inspection is the buyer's cost, so ask the seller for the last inspection report.",
    },
    source: {
      name: "Traficom, tarkista ajoneuvon tiedot",
      url: "https://traficom.fi/fi/autoilijat/ajoneuvon-osto-ja-myynti/tarkista-ajoneuvon-tiedot",
    },
  },
  {
    id: "upkeep",
    applies: () => true,
    title: { fi: "Huolto ja korjaukset", en: "Servicing and repairs" },
    why: {
      fi: "Suomalainen autonomistaja käyttää huoltoihin ja korjauksiin keskimäärin noin 1 070 € vuodessa (2022). Henkilöauton keski-ikä on 17,8 vuotta, joten vanha auto on tavallinen, mutta sen korjauksiin kannattaa varautua.",
      en: "A Finnish car owner spends about 1 070 € a year on servicing and repairs (2022). The average car is 17.8 years old, so an old car is normal, but budget for its repairs.",
    },
    cost: () => ({ eur: 1070, per: "year", basis: { fi: "keskiarvo 2022", en: "average, 2022" } }),
    source: {
      name: "Moottori / Beely 2022; autokannan keski-ikä: Tilastokeskus 2025",
      url: "https://moottori.fi/uutinen/suomalaiset-korjaavat-autojaan-keskimaarin-1-070-eurolla-kulut-kasvaneet-10-vuodessa/",
      secondary: true,
    },
  },
];

/** Every rule that applies to this ad, with its cost when the source gives one. */
export function risksFor(listing: Listing, facts: { car?: CarFacts; flat?: FlatFacts }): Risk[] {
  const out: Risk[] = [];
  if (listing.kind === "flat" && listing.flat) {
    const f = listing.flat;
    const fx = facts.flat ?? {};
    for (const r of FLAT_RULES)
      if (r.applies(f, fx)) out.push({ id: r.id, title: r.title, why: r.why, cost: r.cost?.(f, fx), source: r.source });
  }
  if (listing.kind === "car" && listing.car) {
    const c = listing.car;
    const fx = facts.car ?? {};
    for (const r of CAR_RULES)
      if (r.applies(c, fx)) out.push({ id: r.id, title: r.title, why: r.why, cost: r.cost?.(c, fx), source: r.source });
  }
  return out;
}
