// Three synthetic phones (DATA.md §2). Each persona has a span, noise, a
// home place list, and planted signals: dated snippets that a real phone
// would show on the way to a life event. `truth` is what the detector
// should find, used by the benchmark. Traps are signals that look like an
// event but are not the user's (a friend's move, a relative's car).

import type { EventType, IsoDate, Source } from "@ahead/contract";
import { familyNoise, type NoiseTemplate, studentNoise } from "./noise.ts";

export interface Planted {
  source: Source;
  /** Calendar entries: the day the entry was created; the adapter hides it before that (meta.created). */
  date: IsoDate;
  text: string;
  meta?: Record<string, string | number>;
}

export interface TruthEvent {
  type: EventType;
  /** The date the event happens. */
  date: IsoDate;
  /** The date of the earliest planted signal. */
  firstSignal: IsoDate;
  place?: string;
}

export interface Persona {
  id: string;
  seed: number;
  description: string;
  /** Snippets are generated for this span. Calendar may be later than `to`. */
  from: IsoDate;
  to: IsoDate;
  noise: NoiseTemplate[];
  fills: Record<string, readonly string[]>;
  planted: Planted[];
  traps: Planted[];
  truth: TruthEvent[];
}

const oulu = ["Kaijonharju", "Linnanmaa", "Keskusta", "Tuira"];
const turku = ["Yo-kylä", "Keskusta", "Kupittaa", "Varissuo"];

export const student: Persona = {
  id: "student",
  seed: 20261017,
  description:
    "Emma, 22, studies CS in Oulu; moves to Turku on 1 Nov 2026, looks at a used car in October, leaves for an exchange term in January.",
  from: "2026-07-01",
  to: "2026-10-17",
  noise: studentNoise,
  fills: {
    course: ["Tietorakenteet ja algoritmit", "Lineaarialgebra", "Ohjelmistotekniikka", "Tilastotiede I"],
    item: ["headphones", "USB-C cable", "desk lamp"],
    name: ["Matti", "Anna", "Sara"],
    place: oulu,
  },
  planted: [
    // ---- move: Oulu -> Turku, 1 Nov ----
    { source: "mail", date: "2026-09-28", text: "Asuntohakemuksesi on vastaanotettu – TYS", meta: { from: "TYS" } },
    { source: "places", date: "2026-10-03", text: "Turku, Yo-kylä" },
    { source: "photos", date: "2026-10-03", text: "Photo: Turku, Yo-kylä" },
    // The flat viewing: the phone joined the student housing guest network.
    { source: "wifi", date: "2026-10-03", text: "Liityit verkkoon TYS-Guest" },
    {
      source: "mail",
      date: "2026-10-09",
      text: "Vuokrasopimus allekirjoitettavaksi – Yo-kylä 12 B 7, Turku. Hei Emma, liitteenä vuokrasopimus, vuokrasuhde alkaa 1.11.2026.",
      meta: { from: "TYS" },
    },
    { source: "calendar", date: "2026-11-01", text: "Muutto Turkuun 🚚", meta: { created: "2026-10-09" } },
    {
      source: "mail",
      date: "2026-10-12",
      text: "Tilausvahvistus: sähkösopimus, Yo-kylä 12 B 7, Turku, alkaen 1.11.2026",
      meta: { from: "Turku Energia" },
    },
    { source: "bank", date: "2026-10-14", text: "Muuttopalvelu Siirto Oy", meta: { amountBand: "200-500" } },
    { source: "mail", date: "2026-10-15", text: "Vahvistus: muuttoauto varattu la 31.10.", meta: { from: "Siirto Oy" } },
    {
      source: "mail",
      date: "2026-10-16",
      text: "Irtisanomisilmoitus vastaanotettu – PSOAS, vuokrasuhde päättyy 31.10.2026",
      meta: { from: "PSOAS" },
    },
    {
      source: "sms",
      date: "2026-10-16",
      text: "Siirto Oy: Muuttoauto tulossa la 31.10. klo 9. Kuljettaja soittaa ennen saapumista.",
      meta: { from: "Siirto Oy" },
    },
    {
      source: "sms",
      date: "2026-10-16",
      text: "DVV/Posti: Muuttoilmoituksesi on käsitelty. Uusi osoite on voimassa 1.11.2026 alkaen.",
      meta: { from: "DVV" },
    },
    // ---- first car: looking, test drive 18 Oct, buy later ----
    {
      source: "mail",
      date: "2026-10-02",
      text: "Nettiauto: uusia hakuvahtiosumia – Toyota Yaris 2014, 6 900 €",
      meta: { from: "Nettiauto" },
    },
    {
      source: "mail",
      date: "2026-10-06",
      text: "Nettiauto: uusia hakuvahtiosumia – Skoda Fabia 2015, 7 400 €",
      meta: { from: "Nettiauto" },
    },
    {
      source: "mail",
      date: "2026-10-11",
      text: "Autosi hintapyyntö: Toyota Yaris 1.33 2014 – Autotalo Laakkonen",
      meta: { from: "dealer" },
    },
    { source: "places", date: "2026-10-11", text: "Autotalo Laakkonen, Oulu" },
    { source: "wifi", date: "2026-10-11", text: "Liityit verkkoon Laakkonen-Guest" },
    { source: "calendar", date: "2026-10-18", text: "Koeajo Yaris, Laakkonen klo 14", meta: { created: "2026-10-11" } },
    {
      source: "mail",
      date: "2026-10-16",
      text: "Kysymys: mitä ensimmäisen auton vakuutus maksaa? – vastaus If asiakaspalvelusta",
      meta: { from: "If" },
    },
    // After the test drive, past the phone's end: the demo day never sees it, a later replay does.
    {
      source: "sms",
      date: "2026-10-24",
      text: "Traficom: Omistajanvaihdos rekisteröity, Toyota Yaris. Rekisteröintitodistus postitetaan.",
      meta: { from: "Traficom" },
    },
    // ---- long trip: exchange in Lisbon from 10 Jan ----
    // No "Finnair-WiFi" join: she has not travelled yet.
    {
      source: "mail",
      date: "2026-09-20",
      text: "Nomination confirmed: Erasmus+ exchange, Universidade de Lisboa, spring 2027",
      meta: { from: "University of Oulu" },
    },
    { source: "mail", date: "2026-10-13", text: "Your booking confirmation AY1741 Helsinki–Lisbon 10 Jan 2027", meta: { from: "Finnair" } },
    { source: "bank", date: "2026-10-13", text: "Finnair", meta: { amountBand: "200-500" } },
    {
      source: "sms",
      date: "2026-10-13",
      text: "Finnair: Your booking AY1741 HEL–LIS 10 Jan is confirmed. Check-in opens 36 hours before departure.",
      meta: { from: "Finnair" },
    },
    { source: "calendar", date: "2027-01-10", text: "✈️ Lisbon – exchange semester (until 30 May)", meta: { created: "2026-10-13" } },
    { source: "mail", date: "2026-10-15", text: "Learning Agreement signed – Erasmus+ spring 2027", meta: { from: "University of Oulu" } },
  ],
  traps: [
    { source: "mail", date: "2026-08-12", text: "Voitko auttaa mua muutossa lauantaina? Tarjoan pizzaa 🍕", meta: { from: "Matti" } },
    { source: "calendar", date: "2026-08-15", text: "Matin muuttoapu", meta: { created: "2026-08-12" } },
    { source: "mail", date: "2026-09-05", text: "Isä kysyy: tuleeko Saran uusi auto tällä viikolla?", meta: { from: "Äiti" } },
    // A service text about a friend's move: a payment request, not her own move.
    {
      source: "sms",
      date: "2026-08-16",
      text: 'MobilePay: Matti pyytää sinulta 15,00 € – "muuttoauto, kiitos avusta"',
      meta: { from: "MobilePay" },
    },
  ],
  truth: [
    { type: "move", date: "2026-11-01", firstSignal: "2026-09-28", place: "Turku" },
    { type: "first_car", date: "2026-10-18", firstSignal: "2026-10-02" },
    { type: "long_trip", date: "2027-01-10", firstSignal: "2026-09-20", place: "Lisbon" },
  ],
};

export const family: Persona = {
  id: "family",
  seed: 7,
  description: "Jere, 36, Turku, two kids; a bathroom renovation in spring, a puppy in November.",
  from: "2026-07-01",
  to: "2026-10-17",
  noise: familyNoise,
  fills: { name: ["Elli", "Onni", "mummi"], place: turku },
  planted: [
    { source: "mail", date: "2026-10-05", text: "Tarjous: kylpyhuoneremontti, Rakennus Virtanen Oy", meta: { from: "contractor" } },
    {
      source: "mail",
      date: "2026-10-12",
      text: "Taloyhtiö: muutostyöilmoitus vastaanotettu, märkätilaremontti",
      meta: { from: "housing" },
    },
    { source: "bank", date: "2026-10-10", text: "K-Rauta Turku", meta: { amountBand: "200-500" } },
    { source: "calendar", date: "2026-10-20", text: "Remonttipalaveri Virtanen", meta: { created: "2026-10-12" } },
    // At the meeting, past the phone's end: the demo day never sees it.
    { source: "wifi", date: "2026-10-20", text: "Liityit verkkoon Rakennus-Virtanen" },
    { source: "mail", date: "2026-09-30", text: "Pentueesta vapaana vielä yksi uros – luovutus 15.11.", meta: { from: "breeder" } },
    {
      source: "sms",
      date: "2026-10-14",
      text: "Kennel Tuulenpesä: Pentu voi hyvin, paino 2,4 kg. Luovutus 15.11., muistathan pentuvakuutuksen.",
      meta: { from: "breeder" },
    },
    { source: "calendar", date: "2026-11-15", text: "Haetaan koiranpentu 🐶", meta: { created: "2026-09-30" } },
    { source: "bank", date: "2026-10-08", text: "Musti ja Mirri", meta: { amountBand: "50-200" } },
  ],
  traps: [
    { source: "mail", date: "2026-09-14", text: "Veli: ostin uuden auton, tuun näyttää viikonloppuna", meta: { from: "Veli" } },
    { source: "mail", date: "2026-08-20", text: "Naapurin muutto: parkkipaikat varattu la 22.8.", meta: { from: "housing" } },
  ],
  truth: [
    { type: "renovation", date: "2026-10-20", firstSignal: "2026-10-05" },
    { type: "pet", date: "2026-11-15", firstSignal: "2026-09-30" },
  ],
};

export const control: Persona = {
  id: "control",
  seed: 99,
  description: "Noora, 27, Turku, nothing happening. Full noise, no events.",
  from: "2026-07-01",
  to: "2026-10-17",
  noise: studentNoise,
  fills: { course: ["Markkinoinnin perusteet", "Yritysjuridiikka"], item: ["candles", "yoga mat"], name: ["Ida", "Leo"], place: turku },
  planted: [],
  traps: [
    { source: "mail", date: "2026-09-03", text: "Muuttoapua tarvitaan! Serkku muuttaa Tampereelle 12.9.", meta: { from: "Ida" } },
    { source: "mail", date: "2026-10-01", text: "Matkavinkit: 10 syytä lentää Lissaboniin syksyllä", meta: { from: "newsletter" } },
    { source: "sms", date: "2026-09-13", text: 'MobilePay: Ida pyytää sinulta 20,00 € – "serkun muuttoauto"', meta: { from: "MobilePay" } },
  ],
  truth: [],
};

/** The same phones over a full year of noise, for a false-notice rate per year. */
export const controlYear: Persona = {
  ...control,
  id: "control-year",
  seed: 365,
  from: "2025-10-17",
  description: `${control.description} A full year.`,
};
export const studentYear: Persona = {
  ...student,
  id: "student-year",
  seed: 366,
  from: "2025-10-17",
  description: `${student.description} A full year of noise before.`,
};

/** Emma's Swedish-speaking counterpart in Vasa: the same three events, signals in Swedish. */
export const studentSv: Persona = {
  id: "student-sv",
  seed: 46,
  description:
    "Elin, 23, studies in Vasa; moves to Åbo on 1 Nov 2026, looks at a used car in October, leaves for an exchange term in January. Swedish mail and calendar.",
  from: "2026-07-01",
  to: "2026-10-17",
  noise: studentNoise,
  fills: {
    course: ["Datastrukturer", "Linjär algebra"],
    item: ["headphones", "desk lamp"],
    name: ["Matias", "Hanna"],
    place: ["Vasa centrum", "Brändö", "Sandviken", "Gerby"],
  },
  planted: [
    // The flat viewing in Åbo: the phone joined the student housing guest network.
    { source: "wifi", date: "2026-10-03", text: "Ansluten till nätverket TYS-Guest" },
    {
      source: "mail",
      date: "2026-10-09",
      text: "Hyresavtal att underteckna – Studentbyn 12 B 7, Åbo. Hej Elin, hyresavtalet börjar 1.11.2026.",
      meta: { from: "TYS" },
    },
    { source: "calendar", date: "2026-11-01", text: "Flytt till Åbo 🚚", meta: { created: "2026-10-09" } },
    {
      source: "mail",
      date: "2026-10-12",
      text: "Orderbekräftelse: elavtal, Studentbyn 12 B 7, Åbo, från 1.11.2026",
      meta: { from: "Vasa Elektriska" },
    },
    { source: "bank", date: "2026-10-14", text: "Flyttfirma Snabb Ab", meta: { amountBand: "200-500" } },
    { source: "mail", date: "2026-10-16", text: "Uppsägning mottagen – hyresförhållandet upphör 31.10.2026", meta: { from: "VOAS" } },
    {
      source: "sms",
      date: "2026-10-16",
      text: "Flyttfirma Snabb: Flyttbilen kommer lö 31.10 kl. 9. Chauffören ringer före ankomst.",
      meta: { from: "Snabb Ab" },
    },
    {
      source: "sms",
      date: "2026-10-16",
      text: "DVV/Posti: Din flyttanmälan har behandlats. Den nya adressen gäller från 1.11.2026.",
      meta: { from: "DVV" },
    },
    {
      source: "mail",
      date: "2026-10-02",
      text: "Nettiauto: nya träffar i din bevakning – Toyota Yaris 2014, 6 900 €",
      meta: { from: "Nettiauto" },
    },
    { source: "mail", date: "2026-10-11", text: "Prisförfrågan: Toyota Yaris 1.33 2014 – Bilhuset Laakkonen", meta: { from: "dealer" } },
    { source: "wifi", date: "2026-10-11", text: "Ansluten till nätverket Laakkonen-Guest" },
    { source: "calendar", date: "2026-10-18", text: "Provkörning Yaris, Laakkonen kl. 14", meta: { created: "2026-10-11" } },
    {
      source: "mail",
      date: "2026-10-16",
      text: "Fråga: vad kostar försäkringen för min första bil? – svar från If kundtjänst",
      meta: { from: "If" },
    },
    // After the test drive, past the phone's end.
    {
      source: "sms",
      date: "2026-10-24",
      text: "Traficom: Ägarbyte registrerat, Toyota Yaris. Registreringsbeviset postas.",
      meta: { from: "Traficom" },
    },
    {
      source: "mail",
      date: "2026-09-20",
      text: "Nomination confirmed: Erasmus+ exchange, Universidade de Lisboa, spring 2027",
      meta: { from: "Åbo Akademi" },
    },
    {
      source: "mail",
      date: "2026-10-13",
      text: "Din bokningsbekräftelse AY1741 Helsingfors–Lissabon 10 jan 2027",
      meta: { from: "Finnair" },
    },
    { source: "bank", date: "2026-10-13", text: "Finnair", meta: { amountBand: "200-500" } },
    {
      source: "sms",
      date: "2026-10-13",
      text: "Finnair: Din bokning AY1741 HEL–LIS 10 jan är bekräftad. Incheckningen öppnar 36 timmar före avgång.",
      meta: { from: "Finnair" },
    },
    { source: "calendar", date: "2027-01-10", text: "✈️ Lissabon – utbytestermin (till 30 maj)", meta: { created: "2026-10-13" } },
  ],
  traps: [
    { source: "mail", date: "2026-08-12", text: "Kan du hjälpa mig flytta på lördag? Jag bjuder på pizza 🍕", meta: { from: "Matias" } },
    { source: "calendar", date: "2026-08-15", text: "Hjälpa Matias flytta", meta: { created: "2026-08-12" } },
    {
      source: "sms",
      date: "2026-08-16",
      text: 'MobilePay: Matias ber dig om 15,00 € – "flyttbilen, tack för hjälpen"',
      meta: { from: "MobilePay" },
    },
  ],
  truth: [
    { type: "move", date: "2026-11-01", firstSignal: "2026-10-03", place: "Åbo" },
    { type: "first_car", date: "2026-10-18", firstSignal: "2026-10-02" },
    { type: "long_trip", date: "2027-01-10", firstSignal: "2026-09-20", place: "Lissabon" },
  ],
};

export const personas: Persona[] = [student, family, control, controlYear, studentYear, studentSv];
