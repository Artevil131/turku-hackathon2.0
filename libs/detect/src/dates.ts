import type { IsoDate } from "@ahead/contract";

const MONTHS: Record<string, number> = {
  jan: 1,
  feb: 2,
  mar: 3,
  apr: 4,
  may: 5,
  jun: 6,
  jul: 7,
  aug: 8,
  sep: 9,
  sept: 9,
  oct: 10,
  nov: 11,
  dec: 12,
  tammi: 1,
  helmi: 2,
  maalis: 3,
  huhti: 4,
  touko: 5,
  kesä: 6,
  heinä: 7,
  elo: 8,
  syys: 9,
  loka: 10,
  marras: 11,
  joulu: 12,
};

function iso(y: number, m: number, d: number): IsoDate | undefined {
  if (m < 1 || m > 12 || d < 1 || d > 31) return undefined;
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/**
 * Dates written in a snippet: "1.11.2026", "31.10.", "2026-11-01",
 * "10 Jan 2027", "10. tammikuuta". A day-month without a year is placed in
 * the next twelve months from `today`.
 */
export function datesIn(text: string, today: IsoDate): IsoDate[] {
  const year = Number(today.slice(0, 4));
  const out: IsoDate[] = [];
  const push = (d: IsoDate | undefined) => d && out.push(d);
  for (const m of text.matchAll(/\b(\d{4})-(\d{2})-(\d{2})\b/g)) push(iso(Number(m[1]), Number(m[2]), Number(m[3])));
  for (const m of text.matchAll(/\b(\d{1,2})\.(\d{1,2})\.(\d{4})\b/g)) push(iso(Number(m[3]), Number(m[2]), Number(m[1])));
  for (const m of text.matchAll(/\b(\d{1,2})\.(\d{1,2})\.(?!\d)/g)) {
    const cand = iso(year, Number(m[2]), Number(m[1]));
    if (cand) push(cand < today ? iso(year + 1, Number(m[2]), Number(m[1])) : cand);
  }
  for (const m of text.matchAll(/\b(\d{1,2})\.?\s+([a-zäö]+)\.?(?:kuuta)?\s*(\d{4})?/gi)) {
    const mon = MONTHS[(m[2] ?? "").toLowerCase().replace(/kuuta$/, "")];
    if (!mon) continue;
    const y = m[3] ? Number(m[3]) : year;
    const cand = iso(y, mon, Number(m[1]));
    if (cand) push(!m[3] && cand < today ? iso(y + 1, mon, Number(m[1])) : cand);
  }
  return [...new Set(out)];
}

/** Municipalities and cities that may name the event's place. Small on purpose; extend as needed. */
export const PLACES: readonly string[] = [
  "Helsinki",
  "Espoo",
  "Tampere",
  "Vantaa",
  "Oulu",
  "Turku",
  "Jyväskylä",
  "Lahti",
  "Kuopio",
  "Pori",
  "Kouvola",
  "Joensuu",
  "Lappeenranta",
  "Hämeenlinna",
  "Vaasa",
  "Seinäjoki",
  "Rovaniemi",
  "Mikkeli",
  "Kotka",
  "Salo",
  "Porvoo",
  "Kokkola",
  "Lohja",
  "Hyvinkää",
  "Järvenpää",
  "Rauma",
  "Kajaani",
  "Kerava",
  "Savonlinna",
  "Nokia",
  "Kaarina",
  "Raisio",
  "Naantali",
  "Lisbon",
  "Lissabon",
  "Berlin",
  "Berliini",
  "Stockholm",
  "Tukholma",
  "London",
  "Lontoo",
  "Barcelona",
  "Madrid",
  "Paris",
  "Pariisi",
];

const STEMS = PLACES.map((p) => ({ name: p, re: new RegExp(`\\b${p.replace(/i$/, "")}\\w*`, "i") }));

export function placeIn(text: string): string | undefined {
  for (const { name, re } of STEMS) if (re.test(text)) return name;
  return undefined;
}
