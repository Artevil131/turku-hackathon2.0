// Fixed sample data so screens and journeys can be built before the core
// exists. Emma's move, as in the demo script (PLAN.md). Dates are the demo's.

import type { DetectedEvent, Journey, LedgerEntry, Snippet, SourceState } from "./index.ts";

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
];

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
