import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Three.js is large; give it its own chunk so the shell stays light.
    chunkSizeWarningLimit: 1200,
  },
});
