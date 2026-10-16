import type { IsoDate, Journey, JourneyBuilder, JourneyContext } from "@ahead/contract";
import { daysBetween, nextInspectionDue, TRAFICOM_SOURCE } from "@ahead/opendata";
import { type BuilderOptions, IF_KASKO_TERMS_URL, IF_TRAFFIC_TERMS_URL, item, shortDate, todayIso } from "./common.ts";

export interface FirstCarOptions extends Partial<BuilderOptions> {
  /** Commissioning date (käyttöönottopäivä) from the registration certificate, when known. */
  commissioned?: IsoDate;
}

/** First-car journey: a template this weekend (PLAN.md), built only from If's terms and the Traficom rule. */
export function createFirstCarBuilder(options: FirstCarOptions = {}): JourneyBuilder {
  return {
    eventType: "first_car",
    async build({ event, locale }: JourneyContext): Promise<Journey> {
      const today = options.today ?? todayIso();
      const due = options.commissioned ? nextInspectionDue(options.commissioned) : undefined;
      const daysLeft = due ? daysBetween(today, due) : undefined;

      const items = [
        item(locale, {
          id: "traffic-insurance",
          kind: "insurance",
          title: { fi: "Liikennevakuutus on pakollinen", en: "Traffic insurance is compulsory" },
          body: {
            fi: "Ifin liikennevakuutusehtojen kohdan 7 mukaan sopimus on voimassa, kunnes omistajan tai haltijan vakuuttamisvelvollisuus päättyy tai sopimus irtisanotaan, ja se on voimassa vaikka maksu olisi maksamatta. Ensimmäinen kausi on enintään 13 kuukautta. Hinta muuttuu, kun kotiosoite muuttuu (kohta 9.2).",
            en: "Under clause 7 of If's traffic insurance terms the contract lasts until the owner's or holder's duty to insure ends or it is cancelled, and it stays in force even if the premium is unpaid. The first period is at most 13 months. The price follows your home address (clause 9.2).",
          },
          source: {
            name: {
              fi: "If, liikennevakuutusehdot LII 601.20, kohdat 7 ja 9.2",
              en: "If, traffic insurance terms LII 601.20, clauses 7 and 9.2",
            },
            url: IF_TRAFFIC_TERMS_URL,
          },
        }),
        item(locale, {
          id: "inspection",
          kind: "todo",
          title: { fi: "Katsastus", en: "Vehicle inspection" },
          body: {
            fi: due
              ? `Ensimmäinen katsastus viimeistään neljän vuoden kuluttua käyttöönotosta: ${shortDate(due, "fi")}${daysLeft !== undefined ? ` (${daysLeft} päivää)` : ""}. Sen jälkeen kahden vuoden välein ja yli 10-vuotiaana vuosittain. Tarkista oman auton päivä katsastustodistuksesta.`
              : "Ensimmäinen katsastus viimeistään neljän vuoden kuluttua käyttöönottopäivästä, sen jälkeen kahden vuoden välein ja yli 10-vuotiaana vuosittain. Käyttöönottopäivä on rekisteröintitodistuksessa.",
            en: due
              ? `First inspection within four years of commissioning: ${shortDate(due, "en")}${daysLeft !== undefined ? ` (${daysLeft} days)` : ""}. Then every two years, and yearly once the car is over 10. Check your own car's date on the inspection certificate.`
              : "First inspection within four years of the commissioning date, then every two years, and yearly once the car is over 10. The commissioning date is on the registration certificate.",
          },
          due,
          source: { name: { fi: TRAFICOM_SOURCE.name, en: "Traficom, inspection dates by vehicle class" }, url: TRAFICOM_SOURCE.url },
        }),
        item(locale, {
          id: "car-keys",
          kind: "warning",
          title: { fi: "Avaimet: älä jätä autoon", en: "Keys: never leave them in the car" },
          body: {
            fi: "Ifin kaskoehtojen mukaan, jos avaimet on saatu haltuun luvatta, vahinko korvataan vain kun avaimet saatiin murtautumalla tai ryöstämällä. Autoon jääneet tai kadonneet avaimet rajaavat korvausta myös hinaus- ja matkakulu-turvissa.",
            en: "Under If's kasko terms, if the keys were obtained without permission, damage is paid only when they were taken by break-in or robbery. Keys left in the car or lost also limit the towing and travel-cost covers.",
          },
          source: {
            name: { fi: "If, kaskovakuutusehdot AUT 640.35, kohdat 3.6.3 ja 4", en: "If, kasko terms AUT 640.35, clauses 3.6.3 and 4" },
            url: IF_KASKO_TERMS_URL,
          },
        }),
      ];

      return {
        eventId: event.id,
        eventType: "first_car",
        title: locale === "fi" ? "Ensimmäinen auto" : "Your first car",
        items,
        builtAt: today,
      };
    },
  };
}
