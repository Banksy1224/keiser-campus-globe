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
  heading?: number;
  pitch?: number;
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
 * Street / campus-scale look-at for a photoreal POI.
 *
 * Range 110–200 m + pitch ≈ −50° is close enough for Google Photorealistic
 * building LOD. 330–560 m (the previous framing) stayed in terrain/tree LOD
 * and looked like “no buildings.” Compact is slightly farther/steeper so the
 * POI sits above the mobile campus sheet.
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
    headingDeg: 28,
    pitchDeg: compact ? -52 : -48,
    rangeM: flagship ? (compact ? 200 : 180) : compact ? 150 : 110,
    lookUpM: flagship ? 12 : 8,
    duration: compact ? 1.35 : 1.55,
  };
}

/** Intro hops these real campuses at the same street-scale framing (not overlooks). */
export const INTRO_CAMPUS_IDS = ["miami", "fort-lauderdale", "flagship", "orlando"] as const;

export const TILE_FOCUS_SSE = { lowPower: 4, normal: 2 } as const;
export const TILE_OVERVIEW_SSE = { lowPower: 16, normal: 8 } as const;

const NAVY = "#0b1c33";

/** Small gold pin — almost hidden when landed so photoreal tiles stay the hero. */
export function drawCampusPin(opts: {
  number: number;
  selected: boolean;
  hovered: boolean;
  flagship?: boolean;
}): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = 48;
  canvas.height = 60;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  const hot = opts.selected || opts.hovered;
  const r = opts.selected ? 13 : opts.hovered ? 12 : opts.flagship ? 12 : 11;
  const cx = 24;
  const cy = 7 + r;

  ctx.beginPath();
  ctx.moveTo(cx - r * 0.55, cy + r * 0.38);
  ctx.quadraticCurveTo(cx - 2.5, cy + r + 5, cx, 56);
  ctx.quadraticCurveTo(cx + 2.5, cy + r + 5, cx + r * 0.55, cy + r * 0.38);
  ctx.closePath();
  ctx.fillStyle = FLAME_GOLD;
  ctx.fill();

  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = hot ? FLAME_GOLD : NAVY;
  ctx.fill();
  ctx.lineWidth = opts.selected ? 2.5 : 2;
  ctx.strokeStyle = FLAME_GOLD;
  ctx.stroke();

  ctx.fillStyle = hot ? NAVY : FLAME_GOLD;
  ctx.font = `700 ${opts.number > 9 ? 13 : 15}px "Barlow Condensed", system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(String(opts.number), cx, cy + 1);
  return canvas;
}
