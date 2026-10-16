// Serves the smoke page with Vite, opens it in headless Chrome, waits for
// the page to post its result, prints it and exits. Usage:
//   node libs/embed/browser-smoke/run.ts [--local] [--no-chrome]   (--no-chrome: just serve, open it on a phone)
import { spawn } from "node:child_process";
import { createServer } from "vite";

const args = process.argv.slice(2);
const local = args.includes("--local");
const noChrome = args.includes("--no-chrome");

let resolveResult: (r: unknown) => void = () => {};
const result = new Promise<unknown>((r) => {
  resolveResult = r;
});

const server = await createServer({
  root: import.meta.dirname,
  publicDir: new URL("../models-public", import.meta.url).pathname,
  server: { host: true, port: 5179, strictPort: true },
  logLevel: "warn",
  plugins: [
    {
      name: "result-sink",
      configureServer(s) {
        s.middlewares.use("/result", (req, res) => {
          let body = "";
          req.on("data", (c) => {
            body += c;
          });
          req.on("end", () => {
            res.end("ok");
            resolveResult(JSON.parse(body));
          });
        });
      },
    },
  ],
});
await server.listen();
const url = `http://localhost:5179/?local=${local ? 1 : 0}`;
console.error(`serving ${url}`);
server.printUrls();

if (noChrome) {
  console.error("waiting for a browser to post a result…");
} else {
  const chrome = spawn(
    "google-chrome",
    ["--headless=new", "--no-sandbox", "--disable-gpu", "--user-data-dir=/tmp/claude-1000/embed-smoke-profile", url],
    { stdio: "ignore" },
  );
  result.finally(() => chrome.kill());
}
const timeout = setTimeout(() => {
  console.error("timed out");
  process.exit(2);
}, 600000);
const r = await result;
clearTimeout(timeout);
console.log(JSON.stringify(r, null, 2));
await server.close();
process.exit(0);
