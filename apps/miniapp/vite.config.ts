import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  build: { outDir: "dist", emptyOutDir: true },
  // `pnpm dev` in this folder: API calls go to `pnpm dev` of the Worker (wrangler dev on :8787).
  server: { proxy: { "/api": "http://127.0.0.1:8787" } },
});
