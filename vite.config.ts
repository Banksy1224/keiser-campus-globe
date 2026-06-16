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
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        // Split the heavy 3D dependencies into their own long-lived vendor
        // chunks so they cache across app deploys and load in parallel with the
        // app code — instead of one ~900 kB campus-map bundle. (3d-tiles stays
        // in its lazy chunk; it only loads when a photoreal tour is opened.)
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (id.includes("@react-three")) return "r3f-vendor";
          if (id.includes("three-stdlib") || id.includes("/node_modules/three/")) {
            return "three-vendor";
          }
          if (/\/node_modules\/(react|react-dom|scheduler)\//.test(id)) {
            return "react-vendor";
          }
        },
      },
    },
  },
}));
