import * as THREE from "three";

export const GLOBE_RADIUS = 2;

/**
 * Convert geographic lat/lng (degrees) to a point on a sphere of `radius`.
 * Uses the standard texture-friendly mapping so it lines up with an
 * equirectangular globe texture (lng 0 facing +Z front).
 */
export function latLngToVec3(lat: number, lng: number, radius = GLOBE_RADIUS): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180); // polar angle from +Y
  const theta = (lng + 180) * (Math.PI / 180); // azimuth
  const x = -radius * Math.sin(phi) * Math.cos(theta);
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);
  return new THREE.Vector3(x, y, z);
}

/**
 * Great-circle interpolation between two surface points, lifted into a gentle
 * arc above the globe. `t` in [0,1]; `lift` is the peak height added at the
 * midpoint (as a fraction of radius).
 */
export function arcPoint(
  start: THREE.Vector3,
  end: THREE.Vector3,
  t: number,
  lift = 0.35,
  radius = GLOBE_RADIUS,
): THREE.Vector3 {
  // Spherical linear interpolation of the two unit direction vectors.
  const from = start.clone().normalize();
  const to = end.clone().normalize();
  let dot = THREE.MathUtils.clamp(from.dot(to), -1, 1);
  const omega = Math.acos(dot);
  let point: THREE.Vector3;
  if (omega < 1e-4) {
    point = from.clone();
  } else {
    const sinOmega = Math.sin(omega);
    const a = Math.sin((1 - t) * omega) / sinOmega;
    const b = Math.sin(t * omega) / sinOmega;
    point = from.multiplyScalar(a).add(to.multiplyScalar(b));
  }
  // Parabolic lift: 0 at the endpoints, `lift` at the midpoint.
  const height = radius * (1 + lift * Math.sin(Math.PI * t));
  return point.normalize().multiplyScalar(height);
}

/** Build a smooth poly-line of arc points for drawing a flight path. */
export function arcCurvePoints(
  start: THREE.Vector3,
  end: THREE.Vector3,
  segments = 64,
  lift = 0.35,
): THREE.Vector3[] {
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= segments; i++) {
    pts.push(arcPoint(start, end, i / segments, lift));
  }
  return pts;
}

/**
 * Procedurally draw a stylized "hologram" Earth texture on a canvas:
 * a deep-navy ocean gradient overlaid with a gold lat/long dot matrix and
 * brighter landmass blobs. Reliable across devices (no external image fetch)
 * and on-brand for an admissions tool.
 */
export function createEarthTexture(): THREE.Texture {
  const w = 2048;
  const h = 1024;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;

  // Ocean base gradient.
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, "#0a1733");
  grad.addColorStop(0.5, "#13285a");
  grad.addColorStop(1, "#0a1733");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // Soft landmass blobs (rough, stylized — not geographically exact).
  const land: Array<[number, number, number]> = [
    // [centerLngFrac, centerLatFrac, radiusFrac]
    [0.27, 0.36, 0.12], // North America
    [0.31, 0.62, 0.09], // South America
    [0.52, 0.42, 0.07], // Europe / N. Africa
    [0.56, 0.6, 0.13], // Africa
    [0.7, 0.45, 0.16], // Asia
    [0.82, 0.72, 0.06], // Australia
  ];
  for (const [lx, ly, lr] of land) {
    const cx = lx * w;
    const cy = ly * h;
    const r = lr * w;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, "rgba(40, 70, 130, 0.85)");
    g.addColorStop(1, "rgba(40, 70, 130, 0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(cx, cy, r, r * 0.8, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Gold lat/long dot matrix for the holographic grid feel.
  ctx.fillStyle = "rgba(200, 169, 81, 0.5)";
  const stepX = 18;
  const stepY = 18;
  for (let y = 0; y < h; y += stepY) {
    for (let x = 0; x < w; x += stepX) {
      // Slight jitter so it doesn't look mechanical.
      const r = 0.9;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

/** Camera position that frames a given surface point head-on at `distance`. */
export function cameraForPoint(point: THREE.Vector3, distance: number): THREE.Vector3 {
  return point.clone().normalize().multiplyScalar(distance);
}
