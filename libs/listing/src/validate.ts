// Turns the model's reply into a Listing, keeping only what the ad
// supports: the reply must be JSON, each field must pass its check, and
// each quote must occur in the ad (ignoring case, spacing and dash style).
// What was dropped is reported, so the benchmark can count invention.

import { CAR_CHECKS, type Field, FLAT_CHECKS, type Listing, type ListingKind } from "./schema.ts";

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

/**
 * A quote in the ad is not enough when the value is read into it: "vapaa
 * heti" is in the ad but no date is, "kaksio" is but "2h+kk" is not. So a
 * number must be written in its quote (also as thousands, "185 tkm", or a
 * two-digit year, "-09"), a date's quote must hold a number, and rooms
 * must be copied as written.
 */
function grounded(name: string, value: unknown, quote: string): boolean {
  const q = normalise(quote).replace(/,/g, ".");
  if (typeof value === "number") {
    const forms = [String(value)];
    if (value >= 1000 && value % 1000 === 0) forms.push(String(value / 1000));
    if (value >= 1950 && value <= 2099) forms.push(String(value).slice(2));
    return forms.some((f) => new RegExp(`(^|\\D)${f.replace(".", "\\.")}(\\D|$)`).test(q));
  }
  if (name === "availableFrom" || name === "inspectedUntil") return /\d/.test(q);
  if (name === "rooms") return q.replace(/\s/g, "").includes(normalise(String(value)).replace(/\s/g, ""));
  return true;
}

function fields<T>(
  raw: unknown,
  checks: Record<string, (v: unknown) => boolean>,
  ad: string,
  prefix: string,
  dropped: Dropped[],
): Record<string, Field<T>> {
  const out: Record<string, Field<T>> = {};
  if (!raw || typeof raw !== "object") return out;
  for (const [name, f] of Object.entries(raw as Record<string, unknown>)) {
    const field = `${prefix}.${name}`;
    const check = checks[name];
    if (!check) {
      dropped.push({ field, reason: "not_a_field" });
      continue;
    }
    if (f === null || f === undefined) continue;
    const { value, quote } = (typeof f === "object" ? f : {}) as { value?: unknown; quote?: unknown };
    if (value === null || value === undefined) continue;
    if (!check(value)) {
      dropped.push({ field, reason: "bad_value" });
      continue;
    }
    if (typeof quote !== "string" || !quote.trim() || !ad.includes(normalise(quote))) {
      dropped.push({ field, reason: "quote_not_in_ad" });
      continue;
    }
    if (!grounded(name, value, quote)) {
      dropped.push({ field, reason: "value_not_in_quote" });
      continue;
    }
    out[name] = { value: value as T, quote: quote.trim() };
  }
  return out;
}

export function validate(reply: string, ad: string): Validated {
  const raw = jsonIn(reply) as { kind?: unknown; car?: unknown; flat?: unknown };
  const kind: ListingKind = raw.kind === "car" || raw.kind === "flat" ? raw.kind : "other";
  const dropped: Dropped[] = [];
  const norm = normalise(ad);
  const listing: Listing = { kind };
  if (kind === "car") listing.car = fields(raw.car, CAR_CHECKS, norm, "car", dropped);
  if (kind === "flat") listing.flat = fields(raw.flat, FLAT_CHECKS, norm, "flat", dropped);
  return { listing, dropped };
}
