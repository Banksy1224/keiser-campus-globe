// Must load before `cesium`. Vite also defines CESIUM_BASE_URL at build time
// so workers/assets resolve under the GitHub Pages project path.
declare const CESIUM_BASE_URL: string;

const url =
  typeof CESIUM_BASE_URL === "string" ? CESIUM_BASE_URL : `${import.meta.env.BASE_URL}cesium/`;

(globalThis as unknown as { CESIUM_BASE_URL: string }).CESIUM_BASE_URL = url;
