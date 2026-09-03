// Illustrated Florida-campus map: artwork UV hotspots and roster.
//
// Coordinates are image-space fractions from the TOP-LEFT of
// `public/maps/keiser-florida-campuses.jpeg` (1536×1024). They were
// measured from the yellow numbered badges on that artwork so each
// standing campus sits on the real illustration, not a lat/lng guess.
//
// Miami (#19) has two southern building illustrations (plus a third
// yellow badge just south of Fort Lauderdale on this poster); all share
// campusId "miami" and all pulse. Flagship (#6) and West Palm Beach (#17)
// stay separate. No other campuses are invented.

import { campusById, resolveCampusId, type Campus } from "./campus-data";

/** Official catalog id (`flagship` → `flagship-wpb` on main). */
export function mapCampusId(id: string): string {
  return resolveCampusId(id) ?? id;
}

export function sameMapCampus(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false;
  return mapCampusId(a) === mapCampusId(b);
}

export const FLORIDA_MAP_ASSET = "maps/keiser-florida-campuses.jpeg";

/** Peninsula footprint in scene units (artwork is 1536×1024). */
export const MAP_WIDTH = 18;
export const MAP_HEIGHT = 12;

/** Water surface. Land sits above this so the coast has a cliff. */
export const WATER_Y = -0.1;
export const LAND_MIN_Y = 0.14;
export const LAND_MAX_Y = 0.52;

export interface MapHotspot {
  campusId: string;
  number: number;
  /** Badge center, 0–1 from the left edge. */
  u: number;
  /** Badge center, 0–1 from the top edge. */
  v: number;
}

export interface LegendHit {
  campusId: string;
  number: number;
  u0: number;
  v0: number;
  u1: number;
  v1: number;
}

/** One row per numbered building illustration on the artwork. */
export const MAP_HOTSPOTS: MapHotspot[] = [
  { campusId: "clearwater", number: 1, u: 0.191, v: 0.297 },
  { campusId: "jacksonville", number: 2, u: 0.475, v: 0.13 },
  { campusId: "daytona", number: 3, u: 0.492, v: 0.207 },
  { campusId: "fort-myers", number: 4, u: 0.371, v: 0.577 },
  { campusId: "ocala", number: 5, u: 0.336, v: 0.257 },
  { campusId: "flagship", number: 6, u: 0.607, v: 0.509 },
  { campusId: "orlando", number: 7, u: 0.428, v: 0.31 },
  { campusId: "pembroke-pines", number: 8, u: 0.534, v: 0.666 },
  { campusId: "new-port-richey", number: 9, u: 0.221, v: 0.408 },
  { campusId: "lakeland", number: 10, u: 0.436, v: 0.438 },
  { campusId: "port-st-lucie", number: 11, u: 0.538, v: 0.439 },
  { campusId: "melbourne", number: 12, u: 0.561, v: 0.338 },
  { campusId: "naples", number: 13, u: 0.303, v: 0.674 },
  { campusId: "sarasota", number: 14, u: 0.256, v: 0.498 },
  { campusId: "tallahassee", number: 15, u: 0.223, v: 0.159 },
  { campusId: "tampa", number: 16, u: 0.316, v: 0.344 },
  { campusId: "west-palm-beach", number: 17, u: 0.66, v: 0.609 },
  { campusId: "fort-lauderdale", number: 18, u: 0.659, v: 0.7 },
  // #19 — badge just south of Fort Lauderdale (on the poster).
  { campusId: "miami", number: 19, u: 0.658, v: 0.805 },
  // #19 — the two southern Miami buildings (both pulse).
  { campusId: "miami", number: 19, u: 0.524, v: 0.858 },
  { campusId: "miami", number: 19, u: 0.604, v: 0.861 },
];

/** Clickable rows on the illustrated right-hand legend (2D overlay / leftover). */
const LEGEND_V = [
  0.092, 0.127, 0.161, 0.196, 0.231, 0.266, 0.301, 0.336, 0.371, 0.406, 0.441, 0.475, 0.511, 0.546,
  0.581, 0.615, 0.651, 0.685, 0.72,
];

const LEGEND_IDS: Array<{ campusId: string; number: number }> = [
  { campusId: "clearwater", number: 1 },
  { campusId: "jacksonville", number: 2 },
  { campusId: "daytona", number: 3 },
  { campusId: "fort-myers", number: 4 },
  { campusId: "ocala", number: 5 },
  { campusId: "flagship", number: 6 },
  { campusId: "orlando", number: 7 },
  { campusId: "pembroke-pines", number: 8 },
  { campusId: "new-port-richey", number: 9 },
  { campusId: "lakeland", number: 10 },
  { campusId: "port-st-lucie", number: 11 },
  { campusId: "melbourne", number: 12 },
  { campusId: "naples", number: 13 },
  { campusId: "sarasota", number: 14 },
  { campusId: "tallahassee", number: 15 },
  { campusId: "tampa", number: 16 },
  { campusId: "west-palm-beach", number: 17 },
  { campusId: "fort-lauderdale", number: 18 },
  { campusId: "miami", number: 19 },
];

export const LEGEND_HITS: LegendHit[] = LEGEND_IDS.map((row, i) => {
  const mid = LEGEND_V[i];
  const half = 0.017;
  return {
    ...row,
    u0: 0.775,
    v0: mid - half,
    u1: 0.992,
    v1: mid + half,
  };
});

/** Artwork order (legend 1–19). Graduate School / Online are not on this map. */
export const FLORIDA_MAP_ROSTER: Array<{ campusId: string; number: number; shortName: string }> = [
  { campusId: "clearwater", number: 1, shortName: "Clearwater" },
  { campusId: "jacksonville", number: 2, shortName: "Jacksonville" },
  { campusId: "daytona", number: 3, shortName: "Daytona Beach" },
  { campusId: "fort-myers", number: 4, shortName: "Fort Myers" },
  { campusId: "ocala", number: 5, shortName: "Ocala" },
  { campusId: "flagship", number: 6, shortName: "Flagship" },
  { campusId: "orlando", number: 7, shortName: "Orlando" },
  { campusId: "pembroke-pines", number: 8, shortName: "Pembroke Pines" },
  { campusId: "new-port-richey", number: 9, shortName: "New Port Richey" },
  { campusId: "lakeland", number: 10, shortName: "Lakeland" },
  { campusId: "port-st-lucie", number: 11, shortName: "Port St. Lucie" },
  { campusId: "melbourne", number: 12, shortName: "Melbourne" },
  { campusId: "naples", number: 13, shortName: "Naples" },
  { campusId: "sarasota", number: 14, shortName: "Sarasota" },
  { campusId: "tallahassee", number: 15, shortName: "Tallahassee" },
  { campusId: "tampa", number: 16, shortName: "Tampa" },
  { campusId: "west-palm-beach", number: 17, shortName: "West Palm Beach" },
  { campusId: "fort-lauderdale", number: 18, shortName: "Fort Lauderdale" },
  { campusId: "miami", number: 19, shortName: "Miami" },
];

export const FLORIDA_MAP_IDS = new Set(FLORIDA_MAP_ROSTER.map((r) => mapCampusId(r.campusId)));

export function floridaMapCampuses(): Campus[] {
  return FLORIDA_MAP_ROSTER.map((r) => campusById(r.campusId)).filter((c): c is Campus => Boolean(c));
}

export function rosterRowFor(campusId: string) {
  const resolved = mapCampusId(campusId);
  return FLORIDA_MAP_ROSTER.find((r) => mapCampusId(r.campusId) === resolved);
}

export function hotspotsFor(campusId: string): MapHotspot[] {
  const resolved = mapCampusId(campusId);
  return MAP_HOTSPOTS.filter((h) => mapCampusId(h.campusId) === resolved);
}

/** World position of a UV point on the peninsula (XZ, Y up). `v` is image-top. */
export function uvToWorld(u: number, v: number, y = 0): [number, number, number] {
  return [(u - 0.5) * MAP_WIDTH, y, (v - 0.5) * MAP_HEIGHT];
}

export type HeightSampler = (u: number, v: number) => number;

const DEFAULT_HEIGHT: HeightSampler = () => 0.22;

/** Building foot: a touch south of the yellow badge so the cutout sits on land. */
export function hotspotFoot(spot: MapHotspot): { u: number; v: number } {
  return { u: spot.u, v: Math.min(0.98, spot.v + 0.028) };
}

export interface CampusFocus {
  x: number;
  y: number;
  z: number;
  span: number;
}

/** Centroid (and optional span) of one or more hotspots, in world space. */
export function focusOf(campusId: string, heightAt: HeightSampler = DEFAULT_HEIGHT): CampusFocus {
  const spots = hotspotsFor(campusId);
  if (!spots.length) return { x: -1.4, y: 0.22, z: -0.3, span: 2.6 };
  const pts = spots.map((s) => {
    const foot = hotspotFoot(s);
    return uvToWorld(foot.u, foot.v, heightAt(foot.u, foot.v));
  });
  const x = pts.reduce((a, p) => a + p[0], 0) / pts.length;
  const y = pts.reduce((a, p) => a + p[1], 0) / pts.length;
  const z = pts.reduce((a, p) => a + p[2], 0) / pts.length;
  let span = 1.15;
  if (pts.length > 1) {
    let maxD = 0;
    for (let i = 0; i < pts.length; i++) {
      for (let j = i + 1; j < pts.length; j++) {
        maxD = Math.max(maxD, Math.hypot(pts[i][0] - pts[j][0], pts[i][2] - pts[j][2]));
      }
    }
    span = Math.max(1.7, maxD * 1.55);
  }
  return { x, y, z, span };
}

/** Resting aerial viewpoint after the intro — SW of the peninsula, looking NE. */
export const OVERVIEW_LOOK = uvToWorld(0.4, 0.46, 0.12);
export const OVERVIEW_POS: [number, number, number] = [
  OVERVIEW_LOOK[0] - 2.15,
  6.35,
  OVERVIEW_LOOK[2] + 7.05,
];

/** Approach a campus from the south-southeast and descend onto it. */
export function approachOf(campusId: string, heightAt: HeightSampler = DEFAULT_HEIGHT) {
  const f = focusOf(campusId, heightAt);
  const dist = 2.05 + f.span * 0.62;
  return {
    look: [f.x, f.y + 0.42, f.z] as [number, number, number],
    pos: [f.x - 0.22, f.y + dist * 0.58 + 0.35, f.z + dist * 0.82] as [number, number, number],
  };
}
