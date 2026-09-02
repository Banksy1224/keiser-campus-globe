// Illustrated Florida-campus map: artwork UV hotspots and roster.
//
// Coordinates are image-space fractions from the TOP-LEFT of
// `public/maps/keiser-florida-campuses.jpeg` (1536×1024). They were
// measured from the yellow numbered badges on that artwork so the
// pulse sits on the real illustration, not a lat/lng guess.
//
// Miami (#19) has two building+badge groups; both share campusId "miami".
// Flagship (#6) and West Palm Beach (#17) are separate entries.

import { CAMPUSES, type Campus } from "./campus-data";

export const FLORIDA_MAP_ASSET = "maps/keiser-florida-campuses.jpeg";

/** Plane size in scene units. Matches the JPEG aspect (1536×1024). */
export const MAP_WIDTH = 15;
export const MAP_HEIGHT = 10;

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
  { campusId: "clearwater", number: 1, u: 0.207, v: 0.329 },
  { campusId: "jacksonville", number: 2, u: 0.525, v: 0.082 },
  { campusId: "daytona", number: 3, u: 0.547, v: 0.167 },
  { campusId: "fort-myers", number: 4, u: 0.286, v: 0.513 },
  { campusId: "ocala", number: 5, u: 0.388, v: 0.197 },
  { campusId: "flagship", number: 6, u: 0.615, v: 0.469 },
  { campusId: "orlando", number: 7, u: 0.453, v: 0.270 },
  { campusId: "pembroke-pines", number: 8, u: 0.502, v: 0.546 },
  { campusId: "new-port-richey", number: 9, u: 0.288, v: 0.253 },
  { campusId: "lakeland", number: 10, u: 0.375, v: 0.329 },
  { campusId: "port-st-lucie", number: 11, u: 0.639, v: 0.379 },
  { campusId: "melbourne", number: 12, u: 0.612, v: 0.305 },
  { campusId: "naples", number: 13, u: 0.292, v: 0.611 },
  { campusId: "sarasota", number: 14, u: 0.242, v: 0.442 },
  { campusId: "tallahassee", number: 15, u: 0.205, v: 0.087 },
  { campusId: "tampa", number: 16, u: 0.288, v: 0.339 },
  { campusId: "west-palm-beach", number: 17, u: 0.624, v: 0.62 },
  { campusId: "fort-lauderdale", number: 18, u: 0.543, v: 0.69 },
  { campusId: "miami", number: 19, u: 0.538, v: 0.791 },
  { campusId: "miami", number: 19, u: 0.573, v: 0.877 },
];

/** Clickable rows on the illustrated right-hand legend. */
const LEGEND_V = [
  0.134, 0.17, 0.206, 0.242, 0.278, 0.314, 0.351, 0.387, 0.424, 0.46, 0.496, 0.532, 0.568, 0.603,
  0.639, 0.675, 0.71, 0.745, 0.781,
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
    u0: 0.795,
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

export const FLORIDA_MAP_IDS = new Set(FLORIDA_MAP_ROSTER.map((r) => r.campusId));

export function floridaMapCampuses(): Campus[] {
  return FLORIDA_MAP_ROSTER.map((r) => CAMPUSES.find((c) => c.id === r.campusId)).filter(
    (c): c is Campus => Boolean(c),
  );
}

export function hotspotsFor(campusId: string): MapHotspot[] {
  return MAP_HOTSPOTS.filter((h) => h.campusId === campusId);
}

/** World position of a UV point on the map plane (XZ, Y up). */
export function uvToWorld(u: number, v: number, y = 0): [number, number, number] {
  return [(u - 0.5) * MAP_WIDTH, y, (v - 0.5) * MAP_HEIGHT];
}

/** Centroid (and optional span) of one or more hotspots, in world space. */
export function focusOf(campusId: string): { x: number; z: number; span: number } {
  const spots = hotspotsFor(campusId);
  if (!spots.length) return { x: -1.2, z: -0.4, span: 2.4 };
  const pts = spots.map((s) => uvToWorld(s.u, s.v + 0.02));
  const x = pts.reduce((a, p) => a + p[0], 0) / pts.length;
  const z = pts.reduce((a, p) => a + p[2], 0) / pts.length;
  let span = 1.1;
  if (pts.length > 1) {
    const dx = pts[0][0] - pts[1][0];
    const dz = pts[0][2] - pts[1][2];
    span = Math.max(1.6, Math.hypot(dx, dz) * 1.8);
  }
  return { x, z, span };
}
