import type { IsoDate, JourneyItem } from "@ahead/contract";
import { addDays, type FmiWarning } from "@ahead/opendata";
import cached from "@ahead/opendata/data/fmi-warnings.json" with { type: "json" };

export type Locale = "fi" | "en";
export type Text = Record<Locale, string>;

const cache = cached as { fetchedAt: string; warnings: FmiWarning[] };

/** The cached FMI warnings committed under libs/opendata/data (scripts/fetch-fmi.ts refreshes them). */
export const cachedWarnings: readonly FmiWarning[] = cache.warnings;
export const cachedWarningsFetchedAt: string = cache.fetchedAt;

export interface BuilderOptions {
  /** Today's date; builders never read the clock themselves, so tests and the demo are repeatable. */
  today: IsoDate;
  warnings?: readonly FmiWarning[];
  /** When `warnings` were fetched, shown to the user next to "no warnings". */
  warningsFetchedAt?: string;
  /** The warnings are a labelled example for the demo (`?fmi=example`), not FMI data: every card says so. */
  warningsAreExample?: boolean;
}

export const todayIso = (): IsoDate => new Date().toISOString().slice(0, 10);

export const minus = (date: IsoDate, days: number): IsoDate => addDays(date, -days);

export interface Source {
  name: Text;
  url?: string;
  /** The URL is the service that does the task, not where a fact comes from. */
  service?: boolean;
}

export const IF_MOVE_PAGE: Source = {
  name: { fi: "If, kotivakuutus ja muutto", en: "If, home insurance and moving" },
  url: "https://www.if.fi/henkiloasiakkaat/vakuutukset/kotivakuutus/muuttaminen",
};
export const IF_MOVE_CHECKLIST: Source = {
  name: { fi: "If, muuttajan muistilista", en: "If, mover's checklist" },
  url: "https://www.if.fi/henkiloasiakkaat/vakuutukset/kotivakuutus/muuttaminen/muuttajan-muistilista",
};
export const IF_HOME_TERMS_URL = "https://www.if.fi/globalassets/fi/pdf/ehdot/kotivakuutusehdot.pdf";
export const IF_TRAVEL_TERMS_URL = "https://www.if.fi/globalassets/fi/pdf/ehdot/matkavakuutusehdot.pdf";
export const IF_TRAFFIC_TERMS_URL = "https://www.if.fi/globalassets/fi/pdf/ehdot/liikennevakuutusehdot.pdf";
export const IF_KASKO_TERMS_URL = "https://www.if.fi/globalassets/fi/pdf/ehdot/kaskovakuutusehdot.pdf";

export interface ItemSpec {
  id: string;
  kind: JourneyItem["kind"];
  title: Text;
  body: Text;
  due?: IsoDate;
  source?: Source;
}

/** Turns a bilingual spec into a JourneyItem in one locale. */
export function item(locale: Locale, spec: ItemSpec): JourneyItem {
  const { title, body, source, ...rest } = spec;
  return {
    ...rest,
    title: title[locale],
    body: body[locale],
    ...(source
      ? {
          sourceName: source.name[locale],
          ...(source.url ? { sourceUrl: source.url } : {}),
          ...(source.service && source.url ? { sourceIsService: true } : {}),
        }
      : {}),
  };
}

/** "1.11." in Finnish, "1 November" in English. */
export function shortDate(iso: IsoDate, locale: Locale): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1));
  return locale === "fi"
    ? `${date.getUTCDate()}.${date.getUTCMonth() + 1}.`
    : date.toLocaleDateString("en-GB", { day: "numeric", month: "long", timeZone: "UTC" });
}
