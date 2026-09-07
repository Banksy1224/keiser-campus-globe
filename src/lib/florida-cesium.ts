// Camera framing for the Cesium / Google 3D Florida view.
// Geographic constants only — Cesium stays in the lazy page chunk.

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
  const height = flagship ? (compact ? 1700 : 1300) : compact ? 1400 : 1050;
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

