import type { Journey, JourneyBuilder, JourneyContext, JourneyItem } from "@ahead/contract";
import { addDays, daysBetween, FMI_SOURCE, moveNotificationWindow, regionOfMunicipality, warningsFor } from "@ahead/opendata";
import {
  type BuilderOptions,
  cachedWarnings,
  cachedWarningsFetchedAt,
  IF_HOME_TERMS_URL,
  IF_MOVE_CHECKLIST,
  IF_MOVE_PAGE,
  type ItemSpec,
  item,
  type Locale,
  minus,
  shortDate,
  todayIso,
} from "./common.ts";

/** Service links: a todo card opens the service itself, not a page about it (WORK.md, A to B). */
const MOVE_NOTICE_SERVICE = {
  name: { fi: "Muuttoilmoitus (Posti ja DVV)", en: "Change of address (Posti and DVV)" },
  url: "https://www.posti.fi/muuttaminen/muuttoilmoitus",
  service: true,
};
const ELECTRICITY_SERVICE = {
  name: { fi: "Sähkönhinta.fi, Energiavirasto", en: "Sähkönhinta.fi, Energy Authority" },
  url: "https://www.sahkonhinta.fi/",
  service: true,
};

const LT_URL = "https://www.lahitapiola.fi/henkilo/vakuutukset/kotivakuutus/kotivakuutus-ja-muutto/";
const OP_URL = "https://www.op.fi/en/private-customers/insurance/home-insurance/moving-home-and-home-insurance";

/**
 * The move journey. Every card carries its source (WORK.md): DVV and Traficom rules and cached FMI data
 * from @ahead/opendata, and clauses from If's public terms and pages (libs/journeys/terms/*.md).
 */
export function createMoveBuilder(options: Partial<BuilderOptions> = {}): JourneyBuilder {
  return {
    eventType: "move",
    async build(context: JourneyContext): Promise<Journey> {
      const today = options.today ?? todayIso();
      const { locale, event } = context;
      const moveDate = event.estimatedDate;
      const place = context.municipality ?? event.place;
      const t = (s: ItemSpec) => item(locale, s);

      const items: JourneyItem[] = [];

      const window = moveDate ? moveNotificationWindow(moveDate) : undefined;
      items.push(
        t({
          id: "dvv",
          kind: "todo",
          title: { fi: "Tee muuttoilmoitus", en: "File your change of address" },
          body: {
            fi: window
              ? `Ilmoituksen voi tehdä aikaisintaan kuukautta ennen muuttoa (${shortDate(window.opensOn, "fi")}) ja viimeistään viikon kuluessa muutosta (${shortDate(window.deadline, "fi")}). Samalla ilmoituksella voi ilmoittaa sekä DVV:lle että Postille (DVV:n sääntö).`
              : "Ilmoituksen voi tehdä aikaisintaan kuukautta ennen muuttoa ja viimeistään viikon kuluessa muutosta. Samalla ilmoituksella voi ilmoittaa sekä DVV:lle että Postille (DVV:n sääntö).",
            en: window
              ? `You can file from one month before the move (${shortDate(window.opensOn, "en")}) and must do so within a week after it (${shortDate(window.deadline, "en")}). One notice can go to both DVV and Posti (DVV's rule).`
              : "You can file from one month before the move and must do so within a week after it. One notice can go to both DVV and Posti (DVV's rule).",
          },
          due: window?.deadline,
          source: MOVE_NOTICE_SERVICE,
        }),
        t({
          id: "electricity",
          kind: "todo",
          title: { fi: "Sähkösopimus uuteen osoitteeseen", en: "Electricity contract for the new address" },
          body: {
            fi: "Ifin muuttajan muistilista neuvoo irtisanomaan vanhan sähkösopimuksen ja tekemään uuden noin kaksi viikkoa ennen muuttoa, jotta sähköt ovat päällä muuttopäivänä. Energiaviraston vertailu näyttää uuden postinumeron tarjoukset; sopimus tehdään myyjän kanssa.",
            en: "If's mover's checklist says to end the old contract and make a new one about two weeks before the move, so the power is on on moving day. The Energy Authority's comparison lists the offers for the new postcode; the contract is made with the seller.",
          },
          due: moveDate ? minus(moveDate, 14) : undefined,
          source: ELECTRICITY_SERVICE,
        }),
        t({
          id: "insurance-move",
          kind: "insurance",
          title: { fi: "Siirrä kotivakuutus uuteen osoitteeseen", en: "Move your home insurance to the new address" },
          body: {
            fi: "Ifin sivujen mukaan kotivakuutus ei siirry uuteen osoitteeseen itsestään: siirto tehdään Omilla sivuilla tai soittamalla. Jos irtaimisto on vakuutettu Ifissä, vakuutus on voimassa sekä vanhassa että uudessa kodissa kolme kuukautta. Omakotitaloon muutettaessa siirto tehdään soittamalla.",
            en: "According to If's pages the policy does not move by itself: do it in Omat sivut or by phone. If your contents are insured at If, the policy covers both the old and the new home for three months. For a detached house, call to change it.",
          },
          due: moveDate,
          source: IF_MOVE_PAGE,
        }),
        t({
          id: "compare-if",
          kind: "compare",
          title: {
            fi: "Muuttoturva: If (tämän haasteen järjestäjä)",
            en: "Cover while moving: If (the provider of this challenge)",
          },
          body: {
            fi: "Kolme kuukautta kummassakin kodissa, kun irtaimisto on vakuutettu Ifissä. Vakuutus pitää itse siirtää uuteen osoitteeseen.",
            en: "Three months in both homes when the contents are insured at If. You have to move the policy yourself.",
          },
          source: IF_MOVE_PAGE,
        }),
        t({
          id: "compare-lt",
          kind: "compare",
          title: { fi: "Muuttoturva: LähiTapiola", en: "Cover while moving: LähiTapiola" },
          body: {
            fi: "Kaksi kuukautta kummassakin asunnossa, kun muutat Suomessa ja asunnot ovat hallinnassasi. Vakuutus ei siirry automaattisesti.",
            en: "Two months in both homes when you move within Finland and both are in your possession. The policy does not move automatically.",
          },
          source: { name: { fi: "LähiTapiola, kotivakuutus ja muutto", en: "LähiTapiola, home insurance and moving" }, url: LT_URL },
        }),
        t({
          id: "compare-op",
          kind: "compare",
          title: { fi: "Muuttoturva: OP", en: "Cover while moving: OP" },
          body: {
            fi: "Enintään kaksi kuukautta molempien asuntojen tavaroille ja osille. Uusi vakuutus pitää ottaa käyttöön jo muuttopäivänä.",
            en: "Up to two months for the items and parts of both flats. Activate the new policy already on the day of the move.",
          },
          source: { name: { fi: "OP, kotivakuutus ja muutto", en: "OP, moving home and home insurance" }, url: OP_URL },
        }),
        t({
          id: "empty-home",
          kind: "warning",
          title: { fi: "Tyhjä vanha koti: vesi ja lämpö", en: "Empty old home: water and heat" },
          body: {
            fi: "Ifin kotivakuutusehtojen kohdan 5.5 mukaan asumattomana yli viikon olevassa rakennuksessa pääsulkuventtiili suljetaan, ja kylmänä vuodenaikana rakennuksen lämmitys hoidetaan tai putkisto tyhjennetään ja lämpö tarkastetaan kerran viikossa.",
            en: "Under clause 5.5 of If's home insurance terms, a building left uninhabited for over a week needs its main valve closed, and in the cold season it must be heated, or drained and checked weekly.",
          },
          due: moveDate,
          source: {
            name: { fi: "If, kotivakuutusehdot OMA 200.27, kohta 5.5", en: "If, home insurance terms OMA 200.27, clause 5.5" },
            url: IF_HOME_TERMS_URL,
          },
        }),
        t({
          id: "locks",
          kind: "todo",
          title: { fi: "Vaihdata tai sarjoita lukot", en: "Change or re-key the locks" },
          body: {
            fi: "Ifin ehtojen kohdan 5.1 mukaan lukko vaihdetaan tai sarjoidaan heti, jos avain on joutunut ulkopuolisten haltuun. Kulut korvataan vain, jos avain joutui toiselle varkauden, ryöstön tai murron yhteydessä (kohta 6.1.1). Vuokra-asunnossa sovi vuokranantajan kanssa.",
            en: "Clause 5.1 of If's terms says to change or re-key a lock at once if a key reached outsiders. The cost is paid only if the key was taken in a theft, robbery or break-in (clause 6.1.1). In a rental, agree it with the landlord.",
          },
          due: moveDate ? addDays(moveDate, 2) : undefined,
          source: {
            name: {
              fi: "If, kotivakuutusehdot OMA 200.27, kohdat 5.1 ja 6.1.1",
              en: "If, home insurance terms OMA 200.27, clauses 5.1 and 6.1.1",
            },
            url: IF_HOME_TERMS_URL,
          },
        }),
        t({
          id: "new-home-safety",
          kind: "todo",
          title: { fi: "Uuden kodin turvatarkastus", en: "Safety check of the new home" },
          body: {
            fi: "Asenna toimivat palovaroittimet, laita vuotokaukalot astianpesukoneen sekä jääkaapin ja pakastimen alle ja tarkista ulko-ovien lukot.",
            en: "Fit working smoke alarms, put leak trays under the dishwasher and the fridge and freezer, and check the outer-door locks.",
          },
          due: moveDate ? addDays(moveDate, 7) : undefined,
          source: IF_MOVE_CHECKLIST,
        }),
      );

      items.push(...fmiItems({ locale, place, moveDate, today, options }));

      const title = {
        fi: place ? `Muutto: ${place}${moveDate ? ` ${shortDate(moveDate, "fi")}` : ""}` : "Muutto",
        en: place ? `Move to ${place}${moveDate ? `, ${shortDate(moveDate, "en")}` : ""}` : "Your move",
      }[locale];
      return { eventId: event.id, eventType: "move", title, items, builtAt: today };
    },
  };
}

/** FMI warnings for the new place around the move; an honest "none" when the cache has none. */
function fmiItems(args: {
  locale: Locale;
  place?: string;
  moveDate?: string;
  today: string;
  options: Partial<BuilderOptions>;
}): JourneyItem[] {
  const { locale, place, moveDate, today, options } = args;
  if (!place) return [];
  const warnings = options.warnings ?? cachedWarnings;
  const fetchedAt = options.warnings ? options.warningsFetchedAt : (options.warningsFetchedAt ?? cachedWarningsFetchedAt);
  const source = options.warningsAreExample
    ? {
        name: { fi: "Esimerkki demoa varten, ei voimassa oleva varoitus", en: "Example for the demo, not a current warning" },
        url: FMI_SOURCE.url,
      }
    : { name: { fi: "Ilmatieteen laitos, avoin data", en: "Finnish Meteorological Institute, open data" }, url: FMI_SOURCE.url };

  if (!regionOfMunicipality(place)) {
    return [
      item(locale, {
        id: "fmi-unknown-place",
        kind: "info",
        title: { fi: "Säävaroitukset: paikkaa ei tunnistettu", en: "Weather warnings: place not recognised" },
        body: {
          fi: `Ilmatieteen laitoksen varoituksia ei voitu hakea paikkakunnalle ${place}.`,
          en: `Could not look up Finnish Meteorological Institute warnings for ${place}.`,
        },
        source,
      }),
    ];
  }

  const horizon = Math.max(14, (moveDate ? daysBetween(today, moveDate) : 0) + 7);
  const found = warningsFor(place, warnings, today, horizon);
  if (found.length === 0) {
    const when = fetchedAt?.slice(0, 10);
    return [
      item(locale, {
        id: "fmi-none",
        kind: "info",
        title: { fi: `Ei säävaroituksia: ${place}`, en: `No weather warnings: ${place}` },
        body: {
          fi: `Ilmatieteen laitoksella ei ollut voimassa tai tulossa varoituksia alueelle${when ? ` (data haettu ${when})` : ""}.`,
          en: `The Finnish Meteorological Institute had no current or upcoming warnings for the area${when ? ` (data fetched ${when})` : ""}.`,
        },
        source,
      }),
    ];
  }
  return found.map((w) => {
    const text = w.text[locale] ?? w.text.fi ?? w.text.en;
    return item(locale, {
      id: `fmi-${w.id.slice(-12)}`,
      kind: "warning",
      title: { fi: text?.event ?? w.eventCode, en: text?.event ?? w.eventCode },
      body: { fi: text?.description || text?.headline || "", en: text?.description || text?.headline || "" },
      due: w.onset.slice(0, 10),
      source,
    });
  });
}
