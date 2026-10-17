import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import basicSsl from "@vitejs/plugin-basic-ssl";
import react from "@vitejs/plugin-react";
import { defineConfig, type PluginOption } from "vite";

// `--mode phone` serves over HTTPS on the local network (WORK.md, "Running on a phone"). With a certificate the
// phone trusts in certs/ (mkcert: cert.pem and key.pem, git-ignored) the service worker registers; without one it
// falls back to a self-signed certificate, which gives HTTPS but no service worker on the phone.
const certDir = fileURLToPath(new URL("./certs/", import.meta.url));
const trusted = existsSync(`${certDir}cert.pem`) && existsSync(`${certDir}key.pem`);
const https = trusted ? { cert: readFileSync(`${certDir}cert.pem`), key: readFileSync(`${certDir}key.pem`) } : undefined;

export default defineConfig(({ mode }) => {
  const phone = mode === "phone";
  const plugins: PluginOption[] = [react()];
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
