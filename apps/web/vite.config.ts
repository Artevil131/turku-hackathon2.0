import { createReadStream, existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import basicSsl from "@vitejs/plugin-basic-ssl";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin, type PluginOption } from "vite";

// `--mode phone` serves over HTTPS on the local network (WORK.md, "Running on a phone"). With a certificate the
// phone trusts in certs/ (mkcert: cert.pem and key.pem, git-ignored) the service worker registers; without one it
// falls back to a self-signed certificate, which gives HTTPS but no service worker on the phone.
const certDir = fileURLToPath(new URL("./certs/", import.meta.url));
const trusted = existsSync(`${certDir}cert.pem`) && existsSync(`${certDir}key.pem`);
const https = trusted ? { cert: readFileSync(`${certDir}cert.pem`), key: readFileSync(`${certDir}key.pem`) } : undefined;

/**
 * Dev only: Vite will not let code import() files from public/, but ONNX Runtime loads its .mjs glue that way
 * from /ort/ (D-015). Serve those files as they are, before Vite's own middleware. The build is unaffected.
 */
function serveOrtAsIs(): Plugin {
  const dir = fileURLToPath(new URL("./public/ort/", import.meta.url));
  return {
    name: "ahead-serve-ort-as-is",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const path = req.url?.split("?")[0] ?? "";
        const name = path.startsWith("/ort/") ? path.slice(5) : "";
        if (!name || name.includes("/") || name.includes("..") || !existsSync(dir + name)) return next();
        res.setHeader("Content-Type", name.endsWith(".wasm") ? "application/wasm" : "text/javascript");
        createReadStream(dir + name).pipe(res);
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const phone = mode === "phone";
  const plugins: PluginOption[] = [react(), serveOrtAsIs()];
  if (phone && !trusted) plugins.push(basicSsl());
  return {
    plugins,
    server: phone && https ? { https } : {},
    preview: phone && https ? { https } : {},
    resolve: {
      alias: {
        // The notice wording without the rest of @ahead/detect, which would pull Transformers.js into the main
        // bundle (862 kB instead of 266 kB). Goes away once @ahead/detect exports "./describe" (WORK.md, B to A).
        "@ahead/detect/describe": fileURLToPath(new URL("../../libs/detect/src/describe.ts", import.meta.url)),
      },
    },
  };
});
