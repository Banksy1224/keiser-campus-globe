// Florida map mode: catalog campuses on a real lat/lng peninsula.
//
// Positions come from `campus-data.ts` — not from the promotional poster.
// Flagship and West Palm Beach stay separate. Miami is one site. Graduate
// School and Online sit on the Fort Lauderdale corridor because they already
// have pins in the catalog. No invented campuses.

import { campusById, resolveCampusId, type Campus } from "./campus-data";
import { latLngToMap } from "./florida-geo";

/** Official catalog id (`flagship` → `flagship-wpb` on main). */
export function mapCampusId(id: string): string {
  return resolveCampusId(id) ?? id;
}

export function sameMapCampus(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false;
  return mapCampusId(a) === mapCampusId(b);
}

export interface RosterRow {
  campusId: string;
  number: number;
  shortName: string;
}

/**
 * Official Keiser Florida-map numbers 1–19, plus Graduate School and Online
 * (already pinned on the globe / Fort Lauderdale corridor).
 */
export const FLORIDA_MAP_ROSTER: RosterRow[] = [
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
  { campusId: "graduate-school", number: 20, shortName: "Graduate School" },
  { campusId: "online-global", number: 21, shortName: "Online" },
];

export const FLORIDA_MAP_IDS = new Set(FLORIDA_MAP_ROSTER.map((r) => mapCampusId(r.campusId)));

export function floridaMapCampuses(): Campus[] {
  return FLORIDA_MAP_ROSTER.map((r) => campusById(r.campusId)).filter((c): c is Campus => Boolean(c));
}

export function rosterRowFor(campusId: string) {
  const resolved = mapCampusId(campusId);
  return FLORIDA_MAP_ROSTER.find((r) => mapCampusId(r.campusId) === resolved);
}

export type HeightSampler = (x: number, z: number) => number;

/** Resting aerial viewpoint — Gulf side, looking northeast across the peninsula. */
export const OVERVIEW_LOOK = latLngToMap(27.55, -82.35, 0.18);
export const OVERVIEW_POS: [number, number, number] = (() => {
  const [x, , z] = latLngToMap(25.35, -84.15);
  return [x - 0.4, 8.4, z + 1.15];
})();

export interface SitePose {
  id: string;
  campus: Campus;
  number: number;
  x: number;
  z: number;
}

/**
 * Project each roster campus to the map. Campuses closer than MIN_SEP
 * (Fort Lauderdale corridor; Flagship vs WPB at this scale) are nudged
 * apart so each stays a distinct 3D site without leaving its neighborhood.
 */
export function floridaSitePoses(): SitePose[] {
  const raw = FLORIDA_MAP_ROSTER.map((row) => {
    const campus = campusById(row.campusId);
    if (!campus) return null;
    const [x, , z] = latLngToMap(campus.lat, campus.lng);
    return { id: campus.id, campus, number: row.number, x, z };
  }).filter((s): s is SitePose => Boolean(s));

  const MIN = 0.34;
  const pts = raw.map((s) => ({ ...s }));
  for (let pass = 0; pass < 8; pass++) {
    for (let i = 0; i < pts.length; i++) {
      for (let j = i + 1; j < pts.length; j++) {
        const dx = pts[j].x - pts[i].x;
        const dz = pts[j].z - pts[i].z;
        const d = Math.hypot(dx, dz);
        if (d >= MIN || d < 1e-6) continue;
        const nx = dx / d;
        const nz = dz / d;
        const push = (MIN - d) * 0.52;
        pts[i].x -= nx * push;
        pts[i].z -= nz * push;
        pts[j].x += nx * push;
        pts[j].z += nz * push;
      }
    }
  }
  return pts;
}

export interface CampusFocus {
  x: number;
  y: number;
  z: number;
  span: number;
}

export function focusOf(
  campusId: string,
  heightAt: HeightSampler,
  sites: SitePose[] = floridaSitePoses(),
): CampusFocus {
  const resolved = mapCampusId(campusId);
  const site = sites.find((s) => s.id === resolved);
  if (!site) return { x: 0, y: 0.25, z: 0, span: 1.4 };
  const y = heightAt(site.x, site.z);
  return { x: site.x, y, z: site.z, span: site.campus.flagship ? 1.7 : 1.25 };
}

/** Approach a campus from the south-southeast and descend onto it — never nadir. */
export function approachOf(
  campusId: string,
  heightAt: HeightSampler,
  sites?: SitePose[],
) {
  const f = focusOf(campusId, heightAt, sites);
  const dist = 2.15 + f.span * 0.45;
  return {
    look: [f.x, f.y + 0.28, f.z] as [number, number, number],
    pos: [f.x - 0.35, f.y + dist * 0.72 + 0.45, f.z + dist * 0.95] as [number, number, number],
  };
}

/** Intro drone path: Keys → Miami → east coast → I-4 → panhandle. */
export const INTRO_WAYPOINTS: Array<{ lat: number; lng: number; alt: number; lookLat: number; lookLng: number; lookY: number }> =
  [
    { lat: 24.52, lng: -81.78, alt: 1.05, lookLat: 24.7, lookLng: -81.45, lookY: 0.18 },
    { lat: 25.42, lng: -80.18, alt: 1.45, lookLat: 25.79, lookLng: -80.39, lookY: 0.26 },
    { lat: 26.02, lng: -80.0, alt: 1.75, lookLat: 26.19, lookLng: -80.16, lookY: 0.28 },
    { lat: 26.48, lng: -79.98, alt: 2.15, lookLat: 26.73, lookLng: -80.13, lookY: 0.3 },
    { lat: 27.55, lng: -80.22, alt: 2.75, lookLat: 28.07, lookLng: -80.61, lookY: 0.3 },
    { lat: 28.05, lng: -81.0, alt: 3.35, lookLat: 28.54, lookLng: -81.31, lookY: 0.32 },
    { lat: 29.35, lng: -81.28, alt: 3.85, lookLat: 30.25, lookLng: -81.59, lookY: 0.3 },
    { lat: 30.05, lng: -83.15, alt: 4.25, lookLat: 30.44, lookLng: -84.22, lookY: 0.28 },
  ];

