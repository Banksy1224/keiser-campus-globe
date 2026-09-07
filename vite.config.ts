import { createReadStream, existsSync, statSync } from "node:fs";
import { cp } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Plugin } from "vite";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const cesiumBuild = path.join(rootDir, "node_modules/cesium/Build/Cesium");
const cesiumPublicDir = "cesium";

const MIME: Record<string, string> = {
  ".js": "text/javascript",
  ".mjs": "text/javascript",
  ".json": "application/json",
  ".css": "text/css",
  ".wasm": "application/wasm",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".xml": "application/xml",
};

function withTrailingSlash(value: string): string {
  return value.endsWith("/") ? value : `${value}/`;
}

/**
 * Serve / copy Cesium workers, assets, and widgets without injecting the
 * full Cesium.js script on every page. The Florida view lazy-imports Cesium.
 */
function cesiumStaticAssets(base: string): Plugin {
  const cesiumBaseUrl = `${withTrailingSlash(base)}${cesiumPublicDir}/`;
  let outDir = "dist";

  return {
    name: "cesium-static-assets",
    config() {
      return {
        define: {
          CESIUM_BASE_URL: JSON.stringify(cesiumBaseUrl),
        },
      };
    },
    configResolved(config) {
      outDir = path.resolve(config.root, config.build.outDir);
    },
    configureServer(server) {
      const prefix = `/${cesiumPublicDir}/`;
      server.middlewares.use((req, res, next) => {
        const url = req.url?.split("?")[0] ?? "";
        if (!url.startsWith(prefix)) {
          next();
          return;
        }
        const file = path.join(cesiumBuild, decodeURIComponent(url.slice(prefix.length)));
        if (!existsSync(file) || !statSync(file).isFile()) {
          next();
          return;
        }
        const ext = path.extname(file).toLowerCase();
        res.setHeader("Content-Type", MIME[ext] ?? "application/octet-stream");
        res.setHeader("Access-Control-Allow-Origin", "*");
        createReadStream(file).pipe(res);
      });
    },
    async closeBundle() {
      const dest = path.join(outDir, cesiumPublicDir);
      for (const dir of ["Assets", "Workers", "ThirdParty", "Widgets"]) {
        await cp(path.join(cesiumBuild, dir), path.join(dest, dir), { recursive: true });
      }
    },
  };
}

// On GitHub Pages this app is served from a project sub-path
// (https://<user>.github.io/keiser-campus-globe/), so the production build
// needs a matching base. Dev/preview stay at root. Override with VITE_BASE
// if you later attach a custom domain.
// https://vite.dev/config/
export default defineConfig(({ command }) => {
  const base = process.env.VITE_BASE ?? (command === "build" ? "/keiser-campus-globe/" : "/");
  return {
    base,
    // So `GOOGLE_MAPS_API_KEY` in `.env.local` works alongside `VITE_GOOGLE_MAPS_API_KEY`.
    envPrefix: ["VITE_", "GOOGLE_MAPS_"],
    plugins: [react(), cesiumStaticAssets(base)],
    optimizeDeps: {
      exclude: ["cesium"],
    },
    server: {
      proxy: {
        "/api": "http://localhost:8787",
      },
      headers: {
        // Allow the university site (and local preview frames) to embed us.
        // Do NOT send X-Frame-Options: SAMEORIGIN — that would block Contact / Campuses.
        "Content-Security-Policy":
          "frame-ancestors 'self' https://keiseruniversity.edu https://www.keiseruniversity.edu",
      },
    },
    preview: {
      headers: {
        "Content-Security-Policy":
          "frame-ancestors 'self' https://keiseruniversity.edu https://www.keiseruniversity.edu",
      },
    },
    build: {
      chunkSizeWarningLimit: 4000,
      rollupOptions: {
        output: {
          // Split the heavy 3D dependencies into their own long-lived vendor
          // chunks so they cache across app deploys and load in parallel with the
          // app code. Cesium only loads with the Florida photoreal view.
          manualChunks(id) {
            if (!id.includes("node_modules")) return;
            if (id.includes("/cesium/") || id.includes("/@cesium/")) return "cesium-vendor";
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
  };
});
