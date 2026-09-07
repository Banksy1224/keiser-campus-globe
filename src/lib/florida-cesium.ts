// Camera framing, intro path, and pin art for the Cesium / Google 3D Florida view.
// Geographic constants only — Cesium stays in the lazy page chunk.

import { FLAME_GOLD } from "./campus-data";

/** Peninsula rectangle used to keep the default camera on Florida campuses. */
export const FLORIDA_WEST = -87.65;
export const FLORIDA_SOUTH = 24.38;
export const FLORIDA_EAST = -79.85;
export const FLORIDA_NORTH = 31.05;

export interface CameraSeat {
  lng: number;
  lat: number;
  height: number;
  /** Used when lookLat/lookLng are omitted. */
  heading?: number;
  pitch?: number;
  /** Look-at target so the intro actually points at land / a campus, not empty Gulf. */
  lookLng?: number;
  lookLat?: number;
  lookHeight?: number;
  duration: number;
}

/** Tilted Gulf-side seat that frames Keys → panhandle. Compact sits higher. */
export function floridaOverviewSeat(compact: boolean): CameraSeat {
  return compact
    ? {
        lng: -83.85,
        lat: 25.2,
        height: 640_000,
        lookLng: -83.35,
        lookLat: 28.05,
        lookHeight: 40,
        duration: 1.4,
      }
    : {
        lng: -84.45,
        lat: 24.68,
        height: 305_000,
        lookLng: -83.35,
        lookLat: 27.8,
        lookHeight: 40,
        duration: 1.6,
      };
}

/**
 * Look-at framing for a campus POI.
 *
 * The previous approach placed the camera south of the pin (`lat - offset`)
 * with a fixed heading/pitch. That look ray hit the ground hundreds of meters
 * past (and east of) the campus — empty lots, not the Google buildings.
 * `flyToBoundingSphere` + this offset keeps the photoreal campus centered.
 *
 * Compact uses a steeper pitch so the POI sits in the upper half of the
 * viewport, above the mobile campus sheet.
 */
export interface CampusApproach {
  headingDeg: number;
  pitchDeg: number;
  rangeM: number;
  lookUpM: number;
  duration: number;
}

export function campusApproach(compact: boolean, flagship: boolean): CampusApproach {
  return {
    headingDeg: 22,
    pitchDeg: compact ? -38 : -30,
    rangeM: flagship ? (compact ? 560 : 440) : compact ? 430 : 330,
    lookUpM: 18,
    duration: compact ? 1.3 : 1.55,
  };
}

/** Intro drone path: Keys → Miami → east coast → I-4 → panhandle, each looking at land. */
export const FLORIDA_INTRO_SEATS: CameraSeat[] = [
  { lng: -81.78, lat: 24.5, height: 9_500, lookLng: -81.45, lookLat: 24.7, lookHeight: 20, duration: 0 },
  { lng: -80.18, lat: 25.42, height: 14_000, lookLng: -80.384, lookLat: 25.794, lookHeight: 20, duration: 2.15 },
  { lng: -80.0, lat: 26.02, height: 16_000, lookLng: -80.164, lookLat: 26.186, lookHeight: 20, duration: 1.7 },
  { lng: -79.98, lat: 26.48, height: 20_000, lookLng: -80.11, lookLat: 26.716, lookHeight: 20, duration: 1.75 },
  { lng: -80.22, lat: 27.55, height: 26_000, lookLng: -80.609, lookLat: 28.067, lookHeight: 20, duration: 1.8 },
  { lng: -81.0, lat: 28.05, height: 36_000, lookLng: -81.312, lookLat: 28.539, lookHeight: 20, duration: 1.85 },
  { lng: -83.15, lat: 30.05, height: 72_000, lookLng: -84.238, lookLat: 30.481, lookHeight: 20, duration: 2.05 },
];

const NAVY = "#0b1c33";

/** Small gold pin — readable on the overview, tiny when landed so tiles stay the hero. */
export function drawCampusPin(opts: {
  number: number;
  selected: boolean;
  hovered: boolean;
  flagship?: boolean;
}): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = 56;
  canvas.height = 70;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  const hot = opts.selected || opts.hovered;
  const r = opts.selected ? 16 : opts.hovered ? 15 : opts.flagship ? 14 : 13;
  const cx = 28;
  const cy = 8 + r;

  ctx.beginPath();
  ctx.moveTo(cx - r * 0.55, cy + r * 0.38);
  ctx.quadraticCurveTo(cx - 3, cy + r + 6, cx, 66);
  ctx.quadraticCurveTo(cx + 3, cy + r + 6, cx + r * 0.55, cy + r * 0.38);
  ctx.closePath();
  ctx.fillStyle = FLAME_GOLD;
  ctx.fill();

  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = hot ? FLAME_GOLD : NAVY;
  ctx.fill();
  ctx.lineWidth = opts.selected ? 3 : 2;
  ctx.strokeStyle = FLAME_GOLD;
  ctx.stroke();

  ctx.fillStyle = hot ? NAVY : FLAME_GOLD;
  ctx.font = `700 ${opts.number > 9 ? 15 : 17}px "Barlow Condensed", system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(String(opts.number), cx, cy + 1);
  return canvas;
}
