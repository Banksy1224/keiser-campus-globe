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
  heading: number;
  pitch: number;
  duration: number;
}

/** Tilted Gulf-side seat that frames Keys → panhandle. Compact sits higher. */
export function floridaOverviewSeat(compact: boolean): CameraSeat {
  return compact
    ? { lng: -83.85, lat: 25.2, height: 640_000, heading: 12, pitch: -58, duration: 1.4 }
    : { lng: -84.45, lat: 24.68, height: 305_000, heading: 10, pitch: -43, duration: 1.6 };
}

/** Approach from the south so the photoreal campus stays in frame (never nadir). */
export function campusApproachSeat(
  lat: number,
  lng: number,
  compact: boolean,
  flagship: boolean,
): CameraSeat {
  const height = flagship ? (compact ? 1500 : 1150) : compact ? 1200 : 880;
  const offset = compact ? 0.015 : 0.011;
  return {
    lng,
    lat: lat - offset,
    height,
    heading: 8,
    pitch: -33,
    duration: compact ? 1.25 : 1.55,
  };
}

/** Intro drone path: Keys → Miami → east coast → I-4 → panhandle. */
export const FLORIDA_INTRO_SEATS: CameraSeat[] = [
  { lng: -81.78, lat: 24.5, height: 9_500, heading: 38, pitch: -27, duration: 0 },
  { lng: -80.22, lat: 25.42, height: 14_000, heading: 12, pitch: -31, duration: 2.15 },
  { lng: -80.04, lat: 26.28, height: 18_000, heading: 6, pitch: -33, duration: 1.75 },
  { lng: -80.28, lat: 27.55, height: 26_000, heading: 352, pitch: -36, duration: 1.8 },
  { lng: -81.4, lat: 28.35, height: 40_000, heading: 328, pitch: -40, duration: 1.85 },
  { lng: -83.55, lat: 29.55, height: 78_000, heading: 22, pitch: -42, duration: 2.05 },
];

const NAVY = "#0b1c33";

export function drawCampusPin(opts: {
  number: number;
  selected: boolean;
  hovered: boolean;
  flagship?: boolean;
}): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = 80;
  canvas.height = 100;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  const hot = opts.selected || opts.hovered;
  const r = opts.selected ? 26 : opts.hovered ? 24 : opts.flagship ? 23 : 21;
  const cx = 40;
  const cy = 10 + r;

  ctx.beginPath();
  ctx.moveTo(cx - r * 0.58, cy + r * 0.42);
  ctx.quadraticCurveTo(cx - 4, cy + r + 8, cx, 96);
  ctx.quadraticCurveTo(cx + 4, cy + r + 8, cx + r * 0.58, cy + r * 0.42);
  ctx.closePath();
  ctx.fillStyle = FLAME_GOLD;
  ctx.fill();

  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = hot ? FLAME_GOLD : NAVY;
  ctx.fill();
  ctx.lineWidth = opts.selected ? 4 : 3;
  ctx.strokeStyle = FLAME_GOLD;
  ctx.stroke();

  ctx.fillStyle = hot ? NAVY : FLAME_GOLD;
  ctx.font = `700 ${opts.number > 9 ? 22 : 26}px "Barlow Condensed", system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(String(opts.number), cx, cy + 1);
  return canvas;
}
