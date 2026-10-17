// Fixed sample data so screens and journeys can be built before the core
// exists. Emma's move, as in the demo script (PLAN.md). Dates are the demo's.

import type { DetectedEvent, Journey, LedgerEntry, Snippet, SourceState } from "./index.ts";
import type { EventTimeline, Horizon, Novelty, SourceContribution } from "./insights.ts";

export const mockSnippets: Snippet[] = [
  {
    id: "mail-0412",
    source: "mail",
    date: "2026-10-09",
    text: "Vuokrasopimus allekirjoitettavaksi – Yo-kylä 12 B 7, Turku. Hei Emma, liitteenä vuokrasopimus, muutto 1.11.2026 alkaen.",
    meta: { from: "TYS" },
  },
  { id: "cal-88", source: "calendar", date: "2026-11-01", text: "Muutto Turkuun 🚚", meta: { allDay: 1 } },
  { id: "bank-1207", source: "bank", date: "2026-10-14", text: "Muuttopalvelu Siirto Oy", meta: { amountBand: "200-500" } },
  {
    id: "mail-0420",
    source: "mail",
    date: "2026-10-12",
    text: "Tilausvahvistus: sähkösopimus, Yo-kylä 12 B 7",
    meta: { from: "Turku Energia" },
  },
  {
    id: "mail-0398",
    source: "mail",
    date: "2026-10-03",
    text: "Kurssin Tietorakenteet ja algoritmit tenttitulokset",
    meta: { from: "Peppi" },
  },
  { id: "bank-1180", source: "bank", date: "2026-10-05", text: "K-Market Kaijonharju", meta: { amountBand: "10-50" } },
];

export const mockMove: DetectedEvent = {
  id: "evt-move-1",
  type: "move",
  score: 0.83,
  estimatedDate: "2026-11-01",
  place: "Turku",
  evidence: [
    { snippetId: "mail-0412", score: 0.81, prototype: "Allekirjoitin vuokrasopimuksen uuteen asuntoon" },
    { snippetId: "cal-88", score: 0.78, prototype: "Muuttopäivä" },
    { snippetId: "bank-1207", score: 0.69, prototype: "Maksoin muuttofirmalle" },
    { snippetId: "mail-0420", score: 0.62, prototype: "Sähkösopimus uuteen osoitteeseen" },
  ],
  firstSignal: "2026-10-09",
  detectedAt: "2026-10-14",
};

export const mockLedger: LedgerEntry[] = [{ event: mockMove, status: "pending", rejectedEvidence: [], shared: false }];

export const mockSources: SourceState[] = [
  { source: "calendar", enabled: true, lastSync: "2026-10-17" },
  { source: "mail", enabled: true, lastSync: "2026-10-17" },
  { source: "bank", enabled: true, lastSync: "2026-10-17" },
  { source: "places", enabled: false },
  { source: "photos", enabled: false },
  { source: "notifications", enabled: false },
  { source: "sms", enabled: false },
  { source: "wifi", enabled: false },
];

/** How the phone saw Emma's move build up over the last 60 days (synthetic, shaped like the detector's output). */
export const mockMoveTimeline: EventTimeline = {
  type: "move",
  from: "2026-08-18",
  to: "2026-10-17",
  threshold: 2.5,
  points: Array.from({ length: 61 }, (_, i) => {
    const d = new Date(Date.UTC(2026, 7, 18 + i)).toISOString().slice(0, 10);
    const score =
      d < "2026-09-28"
        ? 0
        : d < "2026-10-09"
          ? 0.66
          : d < "2026-10-12"
            ? 2.9
            : d < "2026-10-14"
              ? 4.3
              : d < "2026-10-15"
                ? 5.5
                : d < "2026-10-16"
                  ? 7.7
                  : 8.9;
    return { date: d, score, fired: score >= 2.5 };
  }),
  signals: [
    { date: "2026-09-28", source: "mail", snippetId: "mail-0398b", text: "Asuntohakemuksesi on vastaanotettu – TYS", margin: 0.66 },
    {
      date: "2026-10-09",
      source: "mail",
      snippetId: "mail-0412",
      text: "Vuokrasopimus allekirjoitettavaksi – Yo-kylä 12 B 7, Turku",
      margin: 1.15,
    },
    { date: "2026-10-09", source: "calendar", snippetId: "cal-88", text: "Muutto Turkuun 🚚", margin: 1.21 },
    { date: "2026-10-12", source: "mail", snippetId: "mail-0420", text: "Tilausvahvistus: sähkösopimus, Yo-kylä 12 B 7", margin: 1.52 },
    { date: "2026-10-14", source: "bank", snippetId: "bank-1207", text: "Muuttopalvelu Siirto Oy", margin: 1.22 },
    { date: "2026-10-15", source: "mail", snippetId: "mail-0431", text: "Vahvistus: muuttoauto varattu la 31.10.", margin: 2.26 },
    { date: "2026-10-16", source: "mail", snippetId: "mail-0440", text: "Irtisanomisilmoitus vastaanotettu – PSOAS", margin: 1.19 },
  ],
};

export const mockMoveContributions: SourceContribution[] = [
  { source: "mail", total: 6.78, count: 5, strongest: mockMoveTimeline.signals[5] },
  { source: "bank", total: 1.22, count: 1, strongest: mockMoveTimeline.signals[4] },
  { source: "calendar", total: 1.21, count: 1, strongest: mockMoveTimeline.signals[2] },
];

export const mockNovelty: Novelty = {
  from: "2026-09-17",
  to: "2026-10-17",
  newSenders: ["TYS", "Turku Energia", "Siirto Oy", "Nettiauto", "Finnair"],
  newMerchants: ["Muuttopalvelu Siirto Oy", "Finnair"],
  newPlaces: ["Turku, Yo-kylä", "Autotalo Laakkonen, Oulu"],
  newTopics: mockMoveTimeline.signals.slice(1, 4),
  recurring: [
    { source: "bank", name: "Vuokra", intervalDays: 30, occurrences: 3, lastDate: "2026-10-01" },
    { source: "bank", name: "DNA", intervalDays: 30, occurrences: 3, lastDate: "2026-10-05" },
    { source: "bank", name: "Spotify", intervalDays: 30, occurrences: 3, lastDate: "2026-10-12" },
  ],
  changePoints: [{ source: "mail", date: "2026-10-09", beforePerWeek: 5.2, afterPerWeek: 9.8 }],
  clusters: [
    {
      label: "Moving to Turku",
      nearest: "move",
      snippetIds: ["mail-0412", "cal-88", "mail-0420", "bank-1207", "mail-0431", "mail-0440"],
      novelty: 0.92,
    },
    { label: "Looking at a car", nearest: "first_car", snippetIds: ["mail-0402", "mail-0411"], novelty: 0.81 },
    { label: "Exchange in Lisbon", nearest: "long_trip", snippetIds: ["mail-0390", "mail-0433"], novelty: 0.88 },
    { label: "Courses and exams", snippetIds: ["mail-0398", "cal-70"], novelty: 0.05 },
    { label: "Groceries and cafés", snippetIds: ["bank-1180", "bank-1181"], novelty: 0.02 },
  ],
};

export const mockHorizon: Horizon = {
  from: "2026-10-17",
  to: "2027-01-15",
  events: [{ event: mockMove, date: "2026-11-01" }],
  insights: [
    {
      id: "weather-move",
      kind: "weather-at-event",
      title: "Frost on the move week",
      body: "Night frost is forecast for Varsinais-Suomi from 30 October. Make sure no water is left on in the old flat.",
      from: "2026-10-30",
      to: "2026-11-02",
      eventIds: ["evt-move-1"],
      sourceName: "Ilmatieteen laitos, avoin data",
      sourceUrl: "https://en.ilmatieteenlaitos.fi/open-data",
    },
    {
      id: "lapse-home",
      kind: "lapse",
      title: "A gap in home cover is possible",
      body: "The old lease ends 31 October and the new one starts 1 November. If the home insurance is not moved by then, the new flat is uncovered from day one.",
      from: "2026-10-31",
      to: "2026-11-01",
      eventIds: ["evt-move-1"],
    },
  ],
};

export const mockMoveJourney: Journey = {
  eventId: "evt-move-1",
  eventType: "move",
  title: "Muutto Turkuun 1.11.",
  builtAt: "2026-10-17",
  items: [
    {
      id: "dvv",
      kind: "todo",
      title: "Tee muuttoilmoitus DVV:lle",
      body: "Aikaisintaan kuukautta ennen muuttoa, viimeistään viikon kuluessa muutosta. Sama ilmoitus menee Postille.",
      due: "2026-11-08",
      sourceName: "DVV",
      sourceUrl: "https://www.suomi.fi/services/asuinpaikan-muuttaminen-maistraatti/86f39ee0-4138-4c35-a2c8-085c1b5c33f1",
    },
    {
      id: "insurance-overlap",
      kind: "insurance",
      title: "Kotivakuutus vanhassa osoitteessa päättyy muuttopäivänä",
      body: "Nykyinen kotivakuutus kattaa tavarat muuton aikana rajoitetun ajan. Siirrä vakuutus uuteen osoitteeseen 1.11. alkaen.",
      due: "2026-10-31",
      sourceName: "If, kotivakuutuksen ehdot",
    },
    {
      id: "fmi-freeze",
      kind: "warning",
      title: "Pakkasvaroitus Varsinais-Suomeen muuttoviikolla",
      body: "Ilmatieteen laitos varoittaa yöpakkasista 30.10.–2.11. Tarkista, ettei vanhan asunnon vesipisteitä jää päälle.",
      due: "2026-10-30",
      sourceName: "Ilmatieteen laitos, avoin data",
      sourceUrl: "https://en.ilmatieteenlaitos.fi/open-data",
    },
    {
      id: "locks",
      kind: "todo",
      title: "Vaihdata tai sarjoita lukot",
      body: "Edellisiltä asukkailta voi olla avaimia liikkeellä. Vuokra-asunnossa sovi vuokranantajan kanssa.",
      due: "2026-11-03",
    },
    {
      id: "compare",
      kind: "compare",
      title: "Vertaile kotivakuutukset uuteen osoitteeseen",
      body: "If, LähiTapiola ja OP rinnakkain julkisten ehtojen perusteella. Ifin tarjous on merkitty.",
    },
  ],
};
