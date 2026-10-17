import basicSsl from "@vitejs/plugin-basic-ssl";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// `--mode phone` serves over HTTPS with a self-signed certificate, so a phone on the same network gets a
// secure context (service worker, Cache API) at https://<this machine>:<port>.
export default defineConfig(({ mode }) => ({ plugins: [react(), ...(mode === "phone" ? [basicSsl()] : [])] }));
