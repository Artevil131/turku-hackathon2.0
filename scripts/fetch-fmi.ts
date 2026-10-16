// Fetches FMI's CAP warning feed and caches the parsed warnings for the offline demo.
// The feed sends no CORS headers (checked from the browser), so this runs in Node, not in the app.
//   node scripts/fetch-fmi.ts
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { FMI_FEED_URL, FMI_SOURCE, type FmiWarningsFile, parseCapFeed } from "../libs/opendata/src/fmi.ts";

const out = join(dirname(fileURLToPath(import.meta.url)), "..", "libs", "opendata", "data", "fmi-warnings.json");

const res = await fetch(FMI_FEED_URL, { signal: AbortSignal.timeout(30_000) });
if (!res.ok) throw new Error(`FMI feed answered ${res.status}`);
const warnings = parseCapFeed(await res.text());

const file: FmiWarningsFile = { source: FMI_SOURCE, feedUrl: FMI_FEED_URL, fetchedAt: new Date().toISOString(), warnings };
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, `${JSON.stringify(file, null, 2)}\n`);
console.log(`${warnings.length} warnings (${warnings.filter((w) => w.regions.length > 0).length} land) -> ${out}`);
