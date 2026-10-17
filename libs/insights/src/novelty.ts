// What changed this month: the last 30 days against the 30 before, from
// the snippets and their vectors. Names (senders, merchants, places) are
// compared as text; topics and clusters in the embedding space.

import type { ChangePoint, Cluster, EventType, IsoDate, Novelty, Recurring, Snippet, Source, TimelineSignal } from "@ahead/contract";
import type { PrototypeDetector } from "@ahead/detect";
import { placeIn } from "@ahead/detect";
import { cosine } from "@ahead/embed";
import { addDays, daysBetween } from "@ahead/opendata";
import { changePoint } from "./changepoint.ts";
import { kmeans } from "./kmeans.ts";
import { EVENT_LABEL, STRINGS } from "./strings.ts";
import { enteredBetween, enteredOn, round3 } from "./window.ts";

export const PERIOD_DAYS = 30;
export const TOPICS_CAP = 8;
export const CLUSTERS_K = 5;
export const KMEANS_ITERATIONS = 20;
export const KMEANS_SEED = 1;

/** Interval steadiness: the median gap may differ from the mean gap by this many days. */
export const STEADY_TOLERANCE_DAYS = 4;
export const MIN_OCCURRENCES = 3;
/** A gap longer than this times the usual interval is an anomaly. */
export const ANOMALY_FACTOR = 1.5;
/** Intervals that mean something to a person: weekly, fortnightly, monthly. Near-daily names are habit, not routine worth listing. */
export const INTERVAL_BANDS: readonly { min: number; max: number }[] = [
  { min: 5, max: 9 },
  { min: 11, max: 17 },
  { min: 26, max: 33 },
];
export const RECURRING_CAP = 8;

const STOPWORDS = new Set([
  "and",
  "the",
  "for",
  "your",
  "you",
  "with",
  "from",
  "that",
  "this",
  "has",
  "are",
  "was",
  "ja",
  "on",
  "ei",
  "se",
  "tai",
  "kun",
  "oli",
  "että",
  "sekä",
  "myös",
  "sinun",
  "sinulle",
  "klo",
  "photo",
]);
/** Company suffixes that say nothing about the topic. */
const SUFFIXES = new Set(["oy", "ab", "oyj", "ltd", "inc"]);

/** The name a snippet recurs under: who sent the mail, which merchant, which place. */
export function nameOf(s: Snippet): string | undefined {
  if (s.source === "mail") return typeof s.meta?.from === "string" ? s.meta.from : undefined;
  if (s.source === "bank" || s.source === "places" || s.source === "wifi") return s.text.trim();
  return undefined;
}

const key = (name: string) => name.toLowerCase().replace(/\s+/g, " ").trim();

function namesIn(snippets: readonly Snippet[], source: Source): Map<string, string> {
  const out = new Map<string, string>();
  for (const s of snippets) {
    if (s.source !== source) continue;
    const n = nameOf(s);
    if (n && !out.has(key(n))) out.set(key(n), n);
  }
  return out;
}

/** Names of `source` seen in `current` but not in `previous`, in order of first appearance. */
export function newNames(current: readonly Snippet[], previous: readonly Snippet[], source: Source): string[] {
  const before = namesIn(previous, source);
  return [...namesIn(current, source)].filter(([k]) => !before.has(k)).map(([, n]) => n);
}

function median(xs: readonly number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? (s[m] as number) : ((s[m - 1] as number) + (s[m] as number)) / 2;
}

/**
 * Merchants, senders and places seen at least `MIN_OCCURRENCES` times on distinct days at a steady weekly, fortnightly
 * or monthly interval, most frequent first, at most `RECURRING_CAP`. `anomaly` is "changed" when the latest gap broke
 * the interval and "stopped" when the next occurrence is overdue on `today` by more than one interval.
 */
export function recurring(snippets: readonly Snippet[], today: IsoDate): Recurring[] {
  const groups = new Map<string, { source: Source; name: string; dates: Set<IsoDate> }>();
  for (const s of snippets) {
    const n = nameOf(s);
    if (!n || s.date > today) continue;
    const k = `${s.source}\u0000${key(n)}`;
    const g = groups.get(k) ?? { source: s.source, name: n, dates: new Set() };
    g.dates.add(s.date);
    groups.set(k, g);
  }
  const out: Recurring[] = [];
  for (const g of groups.values()) {
    if (g.dates.size < MIN_OCCURRENCES) continue;
    const dates = [...g.dates].sort();
    const gaps = dates.slice(1).map((d, i) => daysBetween(dates[i] as IsoDate, d));
    const mean = gaps.reduce((a, b) => a + b, 0) / gaps.length;
    const med = median(gaps);
    if (Math.abs(med - mean) > STEADY_TOLERANCE_DAYS) continue;
    const intervalDays = Math.round(med);
    if (!INTERVAL_BANDS.some((b) => intervalDays >= b.min && intervalDays <= b.max)) continue;
    const lastDate = dates[dates.length - 1] as IsoDate;
    const r: Recurring = { source: g.source, name: g.name, intervalDays, occurrences: dates.length, lastDate };
    const latestGap = gaps[gaps.length - 1] as number;
    if (daysBetween(lastDate, today) > 2 * intervalDays) r.anomaly = "stopped";
    else if (latestGap > ANOMALY_FACTOR * intervalDays) r.anomaly = "changed";
    out.push(r);
  }
  return out
    .sort((a, b) => b.occurrences - a.occurrences || b.intervalDays - a.intervalDays || a.name.localeCompare(b.name))
    .slice(0, RECURRING_CAP);
}

/** Per source, a level shift in daily counts over the `days` days ending `today`. */
export function changePoints(snippets: readonly Snippet[], today: IsoDate, days = 2 * PERIOD_DAYS): ChangePoint[] {
  const from = addDays(today, -(days - 1));
  const counts = new Map<Source, number[]>();
  for (const s of snippets) {
    const d = enteredOn(s);
    if (d < from || d > today) continue;
    const row = counts.get(s.source) ?? new Array<number>(days).fill(0);
    const i = daysBetween(from, d);
    row[i] = (row[i] ?? 0) + 1;
    counts.set(s.source, row);
  }
  const out: ChangePoint[] = [];
  for (const [source, row] of counts) {
    const cp = changePoint(row);
    if (cp) out.push({ source, date: addDays(from, cp.index), beforePerWeek: cp.beforePerWeek, afterPerWeek: cp.afterPerWeek });
  }
  return out.sort((a, b) => a.date.localeCompare(b.date));
}

/** The three most frequent words across `texts` (stop words and company suffixes left out), longest-first on ties. */
export function frequentWords(texts: readonly string[], n = 3): string[] {
  const counts = new Map<string, number>();
  for (const t of texts) {
    const seen = new Set<string>();
    for (const w of t.toLowerCase().split(/[^\p{L}\p{N}]+/u)) {
      if (w.length < 3 || /^\d+$/.test(w) || STOPWORDS.has(w) || SUFFIXES.has(w) || seen.has(w)) continue;
      seen.add(w);
      counts.set(w, (counts.get(w) ?? 0) + 1);
    }
  }
  return [...counts]
    .sort((a, b) => b[1] - a[1] || b[0].length - a[0].length || a[0].localeCompare(b[0]))
    .slice(0, n)
    .map(([w]) => w);
}

const textKey = (s: Snippet) => `${s.source}\u0000${s.text.toLowerCase().replace(/\s+/g, " ").trim()}`;

/** One representative per distinct text, with every id that shares it. */
function uniqueTexts(snippets: readonly Snippet[]): { rep: Snippet; ids: string[] }[] {
  const m = new Map<string, { rep: Snippet; ids: string[] }>();
  for (const s of snippets) {
    const k = textKey(s);
    const u = m.get(k);
    if (u) u.ids.push(s.id);
    else m.set(k, { rep: s, ids: [s.id] });
  }
  return [...m.values()];
}

export async function novelty(detector: PrototypeDetector, snippets: readonly Snippet[], today: IsoDate): Promise<Novelty> {
  const from = addDays(today, -(PERIOD_DAYS - 1));
  const current = enteredBetween(snippets, from, today);
  const previous = enteredBetween(snippets, addDays(from, -PERIOD_DAYS), addDays(from, -1));

  const cur = uniqueTexts(current);
  const prev = uniqueTexts(previous);
  const vecs = await detector.vectors([...cur, ...prev].map((u) => u.rep));
  const vec = (s: Snippet) => vecs.get(s.id) as Float32Array;
  const prevVectors = prev.map((u) => vec(u.rep));

  // Distance of each current text from the previous period: 1 - max cosine, 1 when there was nothing before.
  const distance = cur.map((u) => {
    if (prevVectors.length === 0) return 1;
    let best = -1;
    for (const p of prevVectors) best = Math.max(best, cosine(vec(u.rep), p));
    return Math.min(1, Math.max(0, 1 - best));
  });
  const newTopics: TimelineSignal[] = cur
    .map((u, i) => ({ u, d: distance[i] as number }))
    .sort((a, b) => b.d - a.d || a.u.rep.date.localeCompare(b.u.rep.date))
    .slice(0, TOPICS_CAP)
    .map(({ u, d }) => ({ date: u.rep.date, source: u.rep.source, snippetId: u.rep.id, text: u.rep.text, margin: round3(d) }));

  // Clusters over the current period's distinct texts; identical texts join the cluster of their representative.
  const km = kmeans(
    cur.map((u) => vec(u.rep)),
    CLUSTERS_K,
    KMEANS_ITERATIONS,
    KMEANS_SEED,
  );
  const clusters: Cluster[] = [];
  for (let c = 0; c < km.centroids.length; c++) {
    const members = cur.map((u, i) => ({ u, i })).filter(({ i }) => km.assignment[i] === c);
    if (members.length === 0) continue;
    // The cluster takes an event's name when its best single snippet would count as evidence for that event.
    const best = (
      await detector.score(
        members.map(({ u }) => u.rep),
        true,
      )
    ).sort((a, b) => b.margin - a.margin)[0];
    const nearest: EventType | undefined = best && best.margin >= detector.params.floor ? best.type : undefined;
    const texts = members.map(({ u }) => u.rep.text);
    let label: string;
    if (nearest) {
      label = EVENT_LABEL[nearest];
      // Only a move or a trip goes somewhere.
      const place =
        nearest === "move" || nearest === "long_trip"
          ? mostFrequent(texts.map(placeIn).filter((p): p is string => p !== undefined))
          : undefined;
      if (place) label = STRINGS.clusterWithPlace(label, place);
    } else label = frequentWords(texts).join(", ");
    const nov = members.reduce((a, { i }) => a + (distance[i] as number), 0) / members.length;
    const cluster: Cluster = { label, snippetIds: members.flatMap(({ u }) => u.ids), novelty: round3(nov) };
    if (nearest) cluster.nearest = nearest;
    clusters.push(cluster);
  }
  const merged = mergeClusters(clusters);

  const window = enteredBetween(snippets, addDays(from, -PERIOD_DAYS), today);
  return {
    from,
    to: today,
    newSenders: newNames(current, previous, "mail"),
    newMerchants: newNames(current, previous, "bank"),
    newPlaces: newNames(current, previous, "places"),
    newTopics,
    recurring: recurring(window, today),
    changePoints: changePoints(snippets, today),
    clusters: merged,
  };
}

/**
 * Clusters that ended up with the same label become one (union of snippets, novelty as the member-weighted
 * mean), most novel first, at most `CLUSTERS_K`.
 */
export function mergeClusters(clusters: readonly Cluster[]): Cluster[] {
  const byLabel = new Map<string, Cluster>();
  for (const c of clusters) {
    const m = byLabel.get(c.label);
    if (!m) {
      byLabel.set(c.label, { ...c, snippetIds: [...c.snippetIds] });
      continue;
    }
    const n = m.snippetIds.length + c.snippetIds.length;
    m.novelty = round3((m.novelty * m.snippetIds.length + c.novelty * c.snippetIds.length) / n);
    m.snippetIds.push(...c.snippetIds);
  }
  return [...byLabel.values()].sort((a, b) => b.novelty - a.novelty || b.snippetIds.length - a.snippetIds.length).slice(0, CLUSTERS_K);
}

function mostFrequent(xs: readonly string[]): string | undefined {
  const counts = new Map<string, number>();
  let best: string | undefined;
  for (const x of xs) {
    const c = (counts.get(x) ?? 0) + 1;
    counts.set(x, c);
    if (best === undefined || c > (counts.get(best) ?? 0)) best = x;
  }
  return best;
}
