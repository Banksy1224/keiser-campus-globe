import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// On GitHub Pages this app is served from a project sub-path
// (https://<user>.github.io/keiser-campus-globe/), so the production build
// needs a matching base. Dev/preview stay at root. Override with VITE_BASE
// if you later attach a custom domain.
// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  base: process.env.VITE_BASE ?? (command === "build" ? "/keiser-campus-globe/" : "/"),
  plugins: [react()],
  build: {
    // Three.js is large; give it its own chunk so the shell stays light.
    chunkSizeWarningLimit: 1200,
  },
}));
