// Wording for the notice, Finnish and English, from templates: the only
// numbers and names on screen are the ones code puts into the slots
// (the lesson of the first entry, D-019 there). The app shows `title`,
// then `why` above the evidence list, then `question` with the three
// answers.

import type { DetectedEvent, EventType, IsoDate } from "@ahead/contract";

export type Locale = "fi" | "en";

export interface Description {
  title: string;
  why: string;
  question: string;
  answers: { confirm: string; notNow: string; never: string; notThis: string };
}

const MONTHS_EN = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/** "2026-11-01" → "1.11." (fi, same year) / "1.11.2027" / "1 November" / "10 January 2027". */
export function formatDate(date: IsoDate, locale: Locale, today: IsoDate): string {
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  const sameYear = date.slice(0, 4) === today.slice(0, 4);
  if (locale === "fi") return sameYear ? `${d}.${m}.` : `${d}.${m}.${y}`;
  return sameYear ? `${d} ${MONTHS_EN[m - 1]}` : `${d} ${MONTHS_EN[m - 1]} ${y}`;
}

// {when} and {where} are filled only when known; the template without them must read well too.
const TITLES: Record<EventType, Record<Locale, { base: string; when: string; where: string }>> = {
  move: {
    fi: { base: "Näyttää siltä, että muutto on tulossa", when: " noin {date}", where: ", suuntana {place}" },
    en: { base: "It looks like a move is coming", when: " around {date}", where: ", to {place}" },
  },
  first_car: {
    fi: { base: "Näyttää siltä, että olet hankkimassa autoa", when: ", koeajo {date}", where: "" },
    en: { base: "It looks like you are getting a car", when: ", test drive {date}", where: "" },
  },
  long_trip: {
    fi: { base: "Näyttää siltä, että olet lähdössä pidemmälle matkalle", when: " {date}", where: ", kohteena {place}" },
    en: { base: "It looks like a long trip is coming up", when: " on {date}", where: ", to {place}" },
  },
  child: {
    fi: { base: "Näyttää siltä, että perheeseen on tulossa lapsi", when: "", where: "" },
    en: { base: "It looks like a baby is on the way", when: "", where: "" },
  },
  pet: {
    fi: { base: "Näyttää siltä, että olet hankkimassa lemmikin", when: " {date}", where: "" },
    en: { base: "It looks like a pet is joining you", when: " on {date}", where: "" },
  },
  renovation: {
    fi: { base: "Näyttää siltä, että remontti on alkamassa", when: " {date}", where: "" },
    en: { base: "It looks like a renovation is starting", when: " on {date}", where: "" },
  },
};

const COMMON: Record<Locale, Omit<Description, "title">> = {
  fi: {
    why: "Päättelimme tämän näistä:",
    question: "Haluatko apua tähän?",
    answers: { confirm: "Kyllä, auta", notNow: "Ei nyt", never: "Älä kysy tästä enää", notThis: "Ei tämä" },
  },
  en: {
    why: "Here is why we think so:",
    question: "Want a hand with this?",
    answers: { confirm: "Yes, help me", notNow: "Not now", never: "Never ask about this", notThis: "Not this" },
  },
};

export function describe(event: DetectedEvent, locale: Locale, today: IsoDate): Description {
  const t = TITLES[event.type][locale];
  let title = t.base;
  if (event.place && t.where) title += t.where.replace("{place}", event.place);
  if (event.estimatedDate && t.when) title += t.when.replace("{date}", formatDate(event.estimatedDate, locale, today));
  // A Finnish date already ends with a period ("1.11.").
  return { title: title.endsWith(".") ? title : `${title}.`, ...COMMON[locale] };
}
