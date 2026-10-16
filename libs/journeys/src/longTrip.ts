import type { Journey, JourneyBuilder, JourneyContext } from "@ahead/contract";
import { type BuilderOptions, IF_HOME_TERMS_URL, IF_TRAVEL_TERMS_URL, item, minus, shortDate, todayIso } from "./common.ts";

/** Long-trip journey: a template this weekend (PLAN.md), built from If's travel and home terms. */
export function createLongTripBuilder(options: Partial<BuilderOptions> = {}): JourneyBuilder {
  return {
    eventType: "long_trip",
    async build({ event, locale }: JourneyContext): Promise<Journey> {
      const today = options.today ?? todayIso();
      const start = event.estimatedDate;
      const travel = (clauses: string) => ({
        name: { fi: `If, matkavakuutusehdot MAT 120.8, ${clauses}`, en: `If, travel insurance terms MAT 120.8, ${clauses}` },
        url: IF_TRAVEL_TERMS_URL,
      });

      const items = [
        item(locale, {
          id: "long-trip-cover",
          kind: "insurance",
          title: { fi: "Tarkista matkavakuutuksen kesto ja ehdot", en: "Check how long your travel insurance lasts" },
          body: {
            fi: "Matkavakuutus on voimassa vakuutuskirjaan merkityn pituisilla matkoilla (kohta 1.2). Yli kuusi kuukautta kalenterivuodesta ulkomailla oleskeleva ei ehtojen mukaan asu vakituisesti Suomessa (kohta 2.1). Matkan peruuntumiskorvaus edellyttää, että vakuutus on otettu viimeistään kolme vuorokautta ennen matkan alkua (kohta 3.1.2).",
            en: "Travel insurance applies to trips of the length stated in the policy (clause 1.2). Under the terms, staying abroad over six months of a calendar year means you no longer live permanently in Finland (clause 2.1). Cancellation cover needs the policy to be taken at least three days before the trip starts (clause 3.1.2).",
          },
          due: start ? minus(start, 3) : undefined,
          source: travel("1.2, 2.1, 3.1.2"),
        }),
        item(locale, {
          id: "long-trip-health",
          kind: "info",
          title: { fi: "Ennestään olleen sairauden paheneminen", en: "A worsening existing illness" },
          body: {
            fi: "Ennen matkaa olleen sairauden äkillisestä pahenemisesta korvataan matkakohteessa vain enintään viikon aikana annettu akuutti ensiapuluonteinen hoito (kohta 3.1.1).",
            en: "If an illness you had before the trip suddenly worsens, only acute first-aid-type treatment given within one week at the destination is paid (clause 3.1.1).",
          },
          source: travel("3.1.1"),
        }),
        item(locale, {
          id: "long-trip-home",
          kind: "warning",
          title: { fi: "Koti tyhjänä: sulje pääsulkuventtiili", en: "Home left empty: close the main valve" },
          body: {
            fi: "Ifin kotivakuutusehtojen kohdan 5.5 mukaan yli viikon asumattomana olevassa rakennuksessa pääsulkuventtiili suljetaan ja käyttövesipumppu kytketään pois. Kylmänä vuodenaikana lämmityksestä huolehditaan tai putkisto tyhjennetään.",
            en: "Under clause 5.5 of If's home insurance terms, a building uninhabited for over a week needs its main valve closed and the water pump switched off. In the cold season it must stay heated or be drained.",
          },
          due: start,
          source: {
            name: { fi: "If, kotivakuutusehdot OMA 200.27, kohta 5.5", en: "If, home insurance terms OMA 200.27, clause 5.5" },
            url: IF_HOME_TERMS_URL,
          },
        }),
      ];

      return {
        eventId: event.id,
        eventType: "long_trip",
        title: start
          ? locale === "fi"
            ? `Pitkä matka ${shortDate(start, "fi")}`
            : `Long trip, ${shortDate(start, "en")}`
          : locale === "fi"
            ? "Pitkä matka"
            : "Your long trip",
        items,
        builtAt: today,
      };
    },
  };
}
