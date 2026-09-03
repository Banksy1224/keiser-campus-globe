// Geographic projection and coastline helpers for Florida map mode.
// Land comes from a public US-state outline (lat/lng), never from the
// promotional poster JPEG.

import floridaFeature from "../data/florida.json";

export type LngLat = [number, number];
export type Ring = LngLat[];
export type Polygon = Ring[];
export type MultiPolygonCoords = Polygon[];

export interface FloridaCoast {
  type: "MultiPolygon";
  coordinates: MultiPolygonCoords;
}

const feature = floridaFeature as unknown as {
  geometry: { type: string; coordinates: MultiPolygonCoords };
};

export const FLORIDA_COAST: FloridaCoast = {
  type: "MultiPolygon",
  coordinates: feature.geometry.coordinates,
};

/** Scene scale: 1° of latitude ≈ this many world units. */
export const DEG_SCALE = 2.68;
export const LAT_ORIGIN = 27.72;
export const LNG_ORIGIN = -83.55;

export const WATER_Y = -0.16;
export const LAND_MIN_Y = 0.32;
export const LAND_MAX_Y = 0.92;

/** Equirectangular projection centered on Florida. +X east, +Z south, +Y up. */
export function latLngToMap(lat: number, lng: number, y = 0): [number, number, number] {
  const cos = Math.cos((LAT_ORIGIN * Math.PI) / 180);
  const x = (lng - LNG_ORIGIN) * cos * DEG_SCALE;
  const z = (LAT_ORIGIN - lat) * DEG_SCALE;
  return [x, y, z];
}

export function mapToLatLng(x: number, z: number): { lat: number; lng: number } {
  const cos = Math.cos((LAT_ORIGIN * Math.PI) / 180);
  return {
    lat: LAT_ORIGIN - z / DEG_SCALE,
    lng: LNG_ORIGIN + x / (cos * DEG_SCALE),
  };
}

function ringBBox(ring: Ring): [number, number, number, number] {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const [x, y] of ring) {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  return [minX, minY, maxX, maxY];
}

/** Ray-cast point-in-ring. `ring` is [lng, lat][]. */
export function pointInRing(lng: number, lat: number, ring: Ring): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0];
    const yi = ring[i][1];
    const xj = ring[j][0];
    const yj = ring[j][1];
    const denom = yj - yi;
    if (Math.abs(denom) < 1e-12) continue;
    const inter = yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / denom + xi;
    if (inter) inside = !inside;
  }
  return inside;
}

export interface IndexedPolygon {
  outer: Ring;
  holes: Ring[];
  bbox: [number, number, number, number];
}

export function indexCoast(coast: FloridaCoast = FLORIDA_COAST): IndexedPolygon[] {
  return coast.coordinates.map((poly) => ({
    outer: poly[0],
    holes: poly.slice(1),
    bbox: ringBBox(poly[0]),
  }));
}

export function pointInFlorida(lng: number, lat: number, polys: IndexedPolygon[]): boolean {
  for (const p of polys) {
    const [minX, minY, maxX, maxY] = p.bbox;
    if (lng < minX || lng > maxX || lat < minY || lat > maxY) continue;
    if (!pointInRing(lng, lat, p.outer)) continue;
    let inHole = false;
    for (const hole of p.holes) {
      if (pointInRing(lng, lat, hole)) {
        inHole = true;
        break;
      }
    }
    if (!inHole) return true;
  }
  return false;
}

export function coastWorldBounds(polys: IndexedPolygon[]): {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
} {
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (const p of polys) {
    for (const [lng, lat] of p.outer) {
      const [x, , z] = latLngToMap(lat, lng);
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (z < minZ) minZ = z;
      if (z > maxZ) maxZ = z;
    }
  }
  return { minX, maxX, minZ, maxZ };
}
