import { fileURLToPath } from "node:url";
import basicSsl from "@vitejs/plugin-basic-ssl";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// `--mode phone` serves over HTTPS with a self-signed certificate, so a phone on the same network gets a
// secure context (service worker, Cache API) at https://<this machine>:<port>.
export default defineConfig(({ mode }) => ({
  plugins: [react(), ...(mode === "phone" ? [basicSsl()] : [])],
  resolve: {
    alias: {
      // The notice wording without the rest of @ahead/detect, which would pull Transformers.js into the main
      // bundle (862 kB instead of 266 kB). Goes away once @ahead/detect exports "./describe" (WORK.md, B to A).
      "@ahead/detect/describe": fileURLToPath(new URL("../../libs/detect/src/describe.ts", import.meta.url)),
    },
  },
}));
