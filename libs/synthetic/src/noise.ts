// Ordinary life: what a phone shows when nothing is happening. Finnish and
// English mixed, as real Finnish phones are. Nothing here should resemble
// a life event; the traps that do are in personas.ts on purpose.

import type { Source } from "@ahead/contract";

export interface NoiseTemplate {
  source: Source;
  /** Expected occurrences per 30 days. */
  rate: number;
  texts: readonly string[];
  meta?: Record<string, string | number>;
  /** Only on these weekdays (0 = Sunday). */
  weekdays?: readonly number[];
}

export const studentNoise: NoiseTemplate[] = [
  {
    source: "mail",
    rate: 6,
    texts: [
      "Kurssin {course} tenttitulokset",
      "Luento siirtyy: {course}",
      "Tehtävän palautus muistutus – {course}",
      "Moodle: uusi viesti kurssilla {course}",
    ],
    meta: { from: "Peppi" },
  },
  {
    source: "mail",
    rate: 4,
    texts: ["Your weekly digest", "Ylioppilaskunnan uutiskirje", "TYY:n viikkotiedote", "Nyyti ry: hyvinvointiviikko"],
    meta: { from: "newsletter" },
  },
  {
    source: "mail",
    rate: 3,
    texts: ["Tilauksesi on toimitettu", "Order shipped: {item}", "Your receipt from Wolt", "Pakettisi odottaa noutoa"],
    meta: { from: "shop" },
  },
  {
    source: "mail",
    rate: 2,
    texts: ["Laskusi on saapunut", "Uusi tiliote on saatavilla", "Kela: päätös opintotuesta", "Verokortti 2027 on valmis"],
    meta: { from: "official" },
  },
  {
    source: "mail",
    rate: 2,
    texts: ["Spotify: Your 2026 Wrapped is coming", "Netflix: uutta tällä viikolla", "Duolingo streak reminder", "GitHub: security alert"],
    meta: { from: "app" },
  },
  {
    source: "calendar",
    rate: 12,
    texts: ["{course} luento", "{course} harjoitukset", "Tentti: {course}", "Ryhmätyö {course}"],
    weekdays: [1, 2, 3, 4, 5],
  },
  { source: "calendar", rate: 5, texts: ["Sali", "Gym", "Futsal", "Juoksu"] },
  {
    source: "calendar",
    rate: 2,
    texts: ["Hammaslääkäri", "Kahvit Annan kanssa", "{name}n synttärit", "Lautapeli-ilta", "Board game night"],
  },
  {
    source: "bank",
    rate: 14,
    texts: ["K-Market {place}", "S-Market {place}", "Lidl {place}", "Prisma {place}"],
    meta: { amountBand: "10-50" },
  },
  { source: "bank", rate: 6, texts: ["Wolt", "Espresso House", "Hesburger", "Kahvila Sirius"], meta: { amountBand: "0-10" } },
  { source: "bank", rate: 3, texts: ["Waltti", "Föli", "VR", "Onnibus"], meta: { amountBand: "0-10" } },
  { source: "bank", rate: 1, texts: ["Vuokra", "DNA", "Spotify", "Netflix", "Kotipizza"], meta: { amountBand: "10-50" } },
  { source: "places", rate: 20, texts: ["Koti", "Yliopisto", "Kirjasto", "Sali", "K-Market {place}"] },
  { source: "photos", rate: 4, texts: ["Photo: {place}", "Photo: Koti", "Photo: Yliopisto"] },
];

export const familyNoise: NoiseTemplate[] = [
  {
    source: "mail",
    rate: 5,
    texts: ["Wilma: viikkotiedote", "Päiväkodin kuukausikirje", "Wilma: poissaolomerkintä"],
    meta: { from: "Wilma" },
  },
  {
    source: "mail",
    rate: 4,
    texts: ["Tilauksesi on toimitettu", "Laskusi on saapunut", "Your receipt from Wolt", "Uusi tiliote on saatavilla"],
    meta: { from: "shop" },
  },
  {
    source: "mail",
    rate: 3,
    texts: ["Taloyhtiön tiedote", "Isännöitsijä: vesikatko {date}", "Pihatalkoot lauantaina"],
    meta: { from: "housing" },
  },
  {
    source: "mail",
    rate: 2,
    texts: ["Palaveri siirtyy", "Q4 planning", "Lounas tiimin kanssa", "Kehityskeskustelu"],
    meta: { from: "work" },
  },
  { source: "calendar", rate: 10, texts: ["Tiimipalaveri", "1:1", "Asiakastapaaminen", "Standup"], weekdays: [1, 2, 3, 4, 5] },
  { source: "calendar", rate: 4, texts: ["Jalkkistreenit", "Muskari", "Uimakoulu", "Neuvola 3 v tarkastus"] },
  { source: "calendar", rate: 2, texts: ["Mummola", "Synttärit {name}", "Elokuvat", "Kampaaja"] },
  {
    source: "bank",
    rate: 16,
    texts: ["Prisma {place}", "K-Citymarket {place}", "Lidl {place}", "Tokmanni"],
    meta: { amountBand: "50-200" },
  },
  { source: "bank", rate: 4, texts: ["Neste", "ABC {place}", "St1"], meta: { amountBand: "50-200" } },
  { source: "bank", rate: 2, texts: ["Sähkö", "Vesi", "Vastike", "Elisa", "Yhtiölaina"], meta: { amountBand: "50-200" } },
  { source: "places", rate: 20, texts: ["Koti", "Työpaikka", "Päiväkoti", "Prisma {place}", "Uimahalli"] },
  { source: "photos", rate: 8, texts: ["Photo: Koti", "Photo: Leikkipuisto", "Photo: Mummola", "Photo: Uimahalli"] },
];

export const fills = {
  course: ["Tietorakenteet ja algoritmit", "Lineaarialgebra", "Ohjelmistotekniikka", "Tilastotiede I", "Johdatus tekoälyyn"],
  item: ["headphones", "USB-C cable", "desk lamp", "running shoes"],
  name: ["Matti", "Anna", "Sara", "Joel", "Emilia"],
  place: ["Kaijonharju", "Linnanmaa", "Keskusta", "Tuira"],
};
