// Puts the What if… page into ./public, the folder Cloudflare serves. Wrangler runs this before
// `wrangler dev` and `wrangler deploy` (wrangler.jsonc, "build"). It takes the page as last
// committed, so a half-edited working copy never goes live; set WHATIF_WORKTREE=1 to deploy the
// working copy instead (for a quick check with `wrangler dev`).
import { execFileSync } from "node:child_process";
import { copyFileSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, "public", "index.html");
mkdirSync(join(here, "public"), { recursive: true });
if (process.env.WHATIF_WORKTREE === "1") {
  copyFileSync(join(here, "..", "..", "apps", "what-if", "index.html"), out);
  console.log("build: the working copy of apps/what-if/index.html");
} else {
  const page = execFileSync("git", ["show", "HEAD:apps/what-if/index.html"], { cwd: here, maxBuffer: 64 * 1024 * 1024 });
  writeFileSync(out, page);
  const commit = execFileSync("git", ["rev-parse", "--short", "HEAD"], { cwd: here }).toString().trim();
  console.log(`build: apps/what-if/index.html as committed in ${commit}`);
}
