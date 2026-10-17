// Turns the model's reply into a Listing, keeping only what the ad
// supports: the reply must be JSON, each field must pass its check, and
// each quote must occur in the ad (ignoring case, spacing and dash style).
// What was dropped is reported, so the benchmark can count invention.

import {
  CATEGORIES,
  type Category,
  CHECKS,
  type Fields,
  type Listing,
  type ListingFields,
  MENTION_RISKS,
  type Mention,
  type MentionRisk,
} from "./schema.ts";

export interface Dropped {
  field: string;
  reason: "bad_value" | "quote_not_in_ad" | "value_not_in_quote" | "not_a_field";
}

export interface Validated {
  listing: Listing;
  dropped: Dropped[];
}

/** Lower case, one space, plain hyphens and quotes, no thousands separators in numbers. */
export function normalise(s: string): string {
  return s
    .toLowerCase()
    .replace(/[‐-―−]/g, "-")
    .replace(/[‘’“”"']/g, "")
    .replace(/(\d)[\s  .](?=\d{3}\b)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

/** The JSON object in a reply, tolerating code fences and text around it. */
export function jsonIn(reply: string): unknown {
  const start = reply.indexOf("{");
  const end = reply.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("no JSON object in the reply");
  return JSON.parse(reply.slice(start, end + 1));
}

/** A number written in the quote: as is, in thousands ("185 tkm") or as a two-digit year ("-09"). */
function numberIn(value: number, q: string): boolean {
  const forms = [String(value)];
  if (value >= 1000 && value % 1000 === 0) forms.push(String(value / 1000));
  if (value >= 1950 && value <= 2099) forms.push(String(value).slice(2));
  return forms.some((f) => new RegExp(`(^|\\D)${f.replace(".", "\\.")}(\\D|$)`).test(q));
}

/**
 * A quote in the ad is not enough when the value is read into it: "vapaa
 * heti" is in the ad but no date is, "kaksio" is but "2h+kk" is not. So a
 * number must be written in its quote, a date's quote must hold a number,
 * rooms must be copied as written, a private seller and a building type
 * must be named.
 */
function grounded(name: string, value: unknown, quote: string): boolean {
  const q = normalise(quote).replace(/,/g, ".");
  if (typeof value === "number") return numberIn(value, q);
  if (name === "availableFrom" || name === "inspectedUntil") return /\d/.test(q);
  if (name === "rooms") return q.replace(/\s/g, "").includes(normalise(String(value)).replace(/\s/g, ""));
  // "Myydään" says something is sold, not who sells it; "kaksio" is a size, not a building.
  if (name === "seller" && value === "private") return /yksityi|privat|private/.test(q);
  if (name === "buildingType") return /talo|mökki|hus|house|apartment|flat|cottage|villa|stuga/.test(q);
  return true;
}

const quoted = (quote: unknown, ad: string): quote is string =>
  typeof quote === "string" && quote.trim().length > 0 && ad.includes(normalise(quote));

export function validate(reply: string, ad: string): Validated {
  const raw = jsonIn(reply) as { kind?: unknown; category?: unknown; fields?: unknown; mentions?: unknown };
  const dropped: Dropped[] = [];
  if (raw.kind !== "listing") return { listing: { kind: "other", fields: {}, mentions: [] }, dropped };
  const norm = normalise(ad);

  const fields: Record<string, unknown> = {};
  for (const [name, f] of Object.entries((raw.fields ?? {}) as Record<string, unknown>)) {
    const check = CHECKS[name as keyof ListingFields];
    if (!check) {
      dropped.push({ field: name, reason: "not_a_field" });
      continue;
    }
    if (f === null || typeof f !== "object") continue;
    const { value, quote } = f as { value?: unknown; quote?: unknown };
    if (value === null || value === undefined) continue;
    if (!check(value)) dropped.push({ field: name, reason: "bad_value" });
    else if (!quoted(quote, norm)) dropped.push({ field: name, reason: "quote_not_in_ad" });
    else if (!grounded(name, value, quote)) dropped.push({ field: name, reason: "value_not_in_quote" });
    else fields[name] = { value, quote: quote.trim() };
  }

  const mentions: Mention[] = [];
  for (const m of Array.isArray(raw.mentions) ? raw.mentions : []) {
    const { risk, status, year, quote } = (m ?? {}) as Record<string, unknown>;
    const field = `mention.${String(risk)}`;
    if (!MENTION_RISKS.includes(risk as MentionRisk) || !["done", "planned", "present", "not_done"].includes(status as string))
      dropped.push({ field, reason: "bad_value" });
    else if (!quoted(quote, norm)) dropped.push({ field, reason: "quote_not_in_ad" });
    else {
      const out: Mention = { risk: risk as MentionRisk, status: status as Mention["status"], quote: quote.trim() };
      // A year is kept only when the quote writes it.
      if (typeof year === "number" && numberIn(year, normalise(quote))) out.year = year;
      if (!mentions.some((x) => x.risk === out.risk)) mentions.push(out);
    }
  }

  const category = CATEGORIES.includes(raw.category as Category) ? (raw.category as Category) : "other_item";
  return { listing: { kind: "listing", category, fields: fields as Fields, mentions }, dropped };
}
