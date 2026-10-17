// Copies the What if… page into ./public, the folder Cloudflare serves. Wrangler runs this before
// `wrangler dev` and `wrangler deploy` (wrangler.jsonc, "build").
import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
mkdirSync(join(here, "public"), { recursive: true });
copyFileSync(join(here, "..", "..", "apps", "what-if", "index.html"), join(here, "public", "index.html"));
