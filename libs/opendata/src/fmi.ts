import type { IsoDate } from "@ahead/contract";

export const FMI_SOURCE = {
  name: "Ilmatieteen laitos, avoin data (CC BY 4.0)",
  url: "https://en.ilmatieteenlaitos.fi/open-data",
} as const;

/** The CAP Atom feed carries every warning in fi, sv and en. It sends no CORS headers, so only scripts/ fetch it. */
export const FMI_FEED_URL = "https://alerts.fmi.fi/cap/feed/atom_en-GB.xml";

export type FmiLanguage = "fi" | "sv" | "en";

export interface FmiText {
  event: string;
  headline: string;
  description: string;
}

export interface FmiWarning {
  id: string;
  sentAt: string;
  /** Alert, Update or Cancel. Cancelled and superseded warnings are dropped by parseCapFeed. */
  msgType: string;
  /** FMI's own code, e.g. wind, seaWind, seaWaveHeight. */
  eventCode: string;
  severity: string;
  /** yellow, orange or red, when FMI gives one. */
  color?: string;
  onset: string;
  expires: string;
  /** ISO 3166-2 region codes for land warnings, e.g. FI-19 for Southwest Finland. Empty for sea areas. */
  regions: string[];
  areas: string[];
  text: Partial<Record<FmiLanguage, FmiText>>;
}

export interface FmiWarningsFile {
  source: typeof FMI_SOURCE;
  feedUrl: string;
  fetchedAt: string;
  warnings: FmiWarning[];
}

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };

function decode(s: string): string {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(Number.parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&(amp|lt|gt|quot|apos);/g, (_, n) => ENTITIES[n] ?? "");
}

function blocks(xml: string, tag: string): string[] {
  return [...xml.matchAll(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, "g"))].map((m) => m[1] ?? "");
}

function first(xml: string, tag: string): string | undefined {
  const b = blocks(xml, tag)[0];
  return b === undefined ? undefined : decode(b.trim());
}

function toLanguage(tag: string | undefined): FmiLanguage | undefined {
  const l = tag?.slice(0, 2).toLowerCase();
  return l === "fi" || l === "sv" || l === "en" ? l : undefined;
}

/** Parses the CAP Atom feed. Cancelled warnings, and warnings a later one updates, are left out. */
export function parseCapFeed(xml: string): FmiWarning[] {
  const parsed: { warning: FmiWarning; references: string[] }[] = [];
  const cancelledIds = new Set<string>();

  for (const alert of blocks(xml, "alert")) {
    const id = first(alert, "identifier");
    const msgType = first(alert, "msgType");
    if (!id || !msgType) continue;
    const references = (first(alert, "references") ?? "")
      .split(/\s+/)
      .map((r) => r.split(",")[1])
      .filter((r): r is string => !!r);
    if (msgType === "Cancel") {
      for (const r of references) cancelledIds.add(r);
      continue;
    }

    const infos = blocks(alert, "info");
    const lead = infos[0];
    if (!lead) continue;
    const text: FmiWarning["text"] = {};
    for (const info of infos) {
      const lang = toLanguage(first(info, "language"));
      if (lang)
        text[lang] = {
          event: first(info, "event") ?? "",
          headline: first(info, "headline") ?? "",
          description: first(info, "description") ?? "",
        };
    }

    const areas = blocks(lead, "area");
    const regions = areas.flatMap((a) =>
      blocks(a, "geocode")
        .filter((g) => first(g, "valueName") === "ISO 3166-2")
        .map((g) => first(g, "value") ?? ""),
    );
    const params = new Map(blocks(lead, "parameter").map((p) => [first(p, "valueName") ?? "", first(p, "value") ?? ""]));
    const effective = first(lead, "effective") ?? first(alert, "sent") ?? "";

    parsed.push({
      references,
      warning: {
        id,
        sentAt: first(alert, "sent") ?? effective,
        msgType,
        eventCode: first(blocks(lead, "eventCode")[0] ?? "", "value") ?? "",
        severity: first(lead, "severity") ?? "",
        color: params.get("color"),
        onset: first(lead, "onset") ?? effective,
        expires: first(lead, "expires") ?? "",
        regions: [...new Set(regions.filter(Boolean))],
        areas: areas.map((a) => first(a, "areaDesc") ?? "").filter(Boolean),
        text,
      },
    });
  }

  const superseded = new Set([...cancelledIds, ...parsed.flatMap((p) => p.references)]);
  return parsed.map((p) => p.warning).filter((w) => !superseded.has(w.id));
}

/** ISO 3166-2 region of each demo municipality. A small table on purpose: the demo needs Turku, not all of Finland. */
const REGION_BY_MUNICIPALITY: Record<string, string> = {
  turku: "FI-19",
  raisio: "FI-19",
  naantali: "FI-19",
  kaarina: "FI-19",
  salo: "FI-19",
  helsinki: "FI-18",
  espoo: "FI-18",
  vantaa: "FI-18",
  tampere: "FI-11",
  oulu: "FI-14",
  jyväskylä: "FI-08",
  lahti: "FI-16",
  kuopio: "FI-15",
  pori: "FI-17",
  rovaniemi: "FI-10",
  vaasa: "FI-12",
  joensuu: "FI-13",
  kouvola: "FI-09",
  lappeenranta: "FI-02",
  hämeenlinna: "FI-06",
  seinäjoki: "FI-03",
  mikkeli: "FI-04",
  kajaani: "FI-05",
  kokkola: "FI-07",
  mariehamn: "FI-01",
};

export function regionOfMunicipality(name: string): string | undefined {
  return REGION_BY_MUNICIPALITY[name.trim().toLowerCase()];
}

/** Land warnings for a municipality that are active, or start within `horizonDays`, on `today`. */
export function warningsFor(municipality: string, warnings: readonly FmiWarning[], today: IsoDate, horizonDays = 14): FmiWarning[] {
  const region = regionOfMunicipality(municipality);
  if (!region) return [];
  const dayStart = Date.parse(`${today}T00:00:00Z`);
  const horizon = dayStart + horizonDays * 86_400_000;
  return warnings
    .filter((w) => w.regions.includes(region))
    .filter((w) => Date.parse(w.expires) >= dayStart && Date.parse(w.onset) <= horizon)
    .sort((a, b) => Date.parse(a.onset) - Date.parse(b.onset));
}
