// Runtime extraction of a 3D Florida peninsula + standing campus cutouts
// from the official illustrated poster. One JPEG is the source of truth:
// land is flood-filled and extruded; each yellow-badge building is lifted
// off the page as an alpha-cutout that stands on the terrain.

import * as THREE from "three";
import {
  LAND_MAX_Y,
  LAND_MIN_Y,
  MAP_HOTSPOTS,
  WATER_Y,
  uvToWorld,
  type MapHotspot,
} from "./florida-map";

export interface CampusSprite {
  campusId: string;
  number: number;
  u: number;
  v: number;
  texture: THREE.CanvasTexture;
  width: number;
  height: number;
}

export interface FloridaArt {
  geometry: THREE.BufferGeometry;
  landTexture: THREE.CanvasTexture;
  sprites: CampusSprite[];
  heightAt: (u: number, v: number) => number;
  isLand: (u: number, v: number) => boolean;
  dispose: () => void;
}

const MASK_W = 320;
const MASK_H = 214;

function pixel(data: Uint8ClampedArray, w: number, x: number, y: number, iw: number, ih: number) {
  const px = Math.max(0, Math.min(iw - 1, x));
  const py = Math.max(0, Math.min(ih - 1, y));
  const o = (py * w + px) * 4;
  return [data[o], data[o + 1], data[o + 2]] as const;
}

/** True for vegetation, roads, beaches, and painted buildings — not water/UI. */
function landish(r: number, g: number, b: number, u: number, v: number): boolean {
  if (u > 0.752) return false;
  if (v < 0.072 && u < 0.44) return false;
  if (v > 0.905 && u < 0.4) return false;
  if (u < 0.065 && (v < 0.11 || v > 0.3)) return false;
  if (r < 42 && g < 52 && b < 88 && b >= r) return false;
  // Open water / sky
  if (b > r + 18 && b > 72 && g < b + 12 && r < 168) {
    if (g < 172 || b > g + 6) return false;
  }
  // Gold lettering over the gulf
  if (r > 145 && g > 115 && b < 95 && v > 0.82) return false;
  if (g > 48 && g >= r - 18 && g > b - 35 && r < 195) return true;
  if (r > 40 && r < 190 && g > 40 && g < 190 && b < 132 && Math.abs(r - g) < 56) return true;
  if (r > 148 && g > 138 && b > 98 && g >= b - 12) return true;
  return false;
}

function walkableForSprite(r: number, g: number, b: number): boolean {
  // Punch out lush forest
  if (g > 58 && g > r + 16 && g > b + 8 && b < 145 && r < 155) return false;
  // Punch out open water (keep glass / teal building accents — those have higher R or lower B-delta)
  if (b > r + 28 && b > 85 && g < 200 && r < 130) return false;
  if (r < 28 && g < 36 && b < 64) return false;
  return true;
}

function bilinearMask(mask: Uint8Array, w: number, h: number, u: number, v: number): number {
  const x = u * (w - 1);
  const y = v * (h - 1);
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const x1 = Math.min(w - 1, x0 + 1);
  const y1 = Math.min(h - 1, y0 + 1);
  const tx = x - x0;
  const ty = y - y0;
  const s00 = mask[y0 * w + x0];
  const s10 = mask[y0 * w + x1];
  const s01 = mask[y1 * w + x0];
  const s11 = mask[y1 * w + x1];
  return s00 * (1 - tx) * (1 - ty) + s10 * tx * (1 - ty) + s01 * (1 - tx) * ty + s11 * tx * ty;
}

function bilinearHeight(heights: Float32Array, w: number, h: number, u: number, v: number): number {
  const x = u * (w - 1);
  const y = v * (h - 1);
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const x1 = Math.min(w - 1, x0 + 1);
  const y1 = Math.min(h - 1, y0 + 1);
  const tx = x - x0;
  const ty = y - y0;
  const s00 = heights[y0 * w + x0];
  const s10 = heights[y0 * w + x1];
  const s01 = heights[y1 * w + x0];
  const s11 = heights[y1 * w + x1];
  return s00 * (1 - tx) * (1 - ty) + s10 * tx * (1 - ty) + s01 * (1 - tx) * ty + s11 * tx * ty;
}

function floodLand(mask: Uint8Array, w: number, h: number): Uint8Array {
  const seen = new Uint8Array(w * h);
  const q: number[] = [];
  const seeds: Array<[number, number]> = [
    [0.38, 0.42],
    [0.22, 0.18],
    [0.55, 0.72],
    [0.32, 0.55],
    [0.48, 0.22],
    [0.6, 0.62],
  ];
  for (const [u, v] of seeds) {
    const x = Math.round(u * (w - 1));
    const y = Math.round(v * (h - 1));
    const i = y * w + x;
    if (mask[i] && !seen[i]) {
      seen[i] = 1;
      q.push(i);
    }
  }
  let head = 0;
  while (head < q.length) {
    const i = q[head++];
    const x = i % w;
    const y = (i - x) / w;
    const nbrs = [x > 0 ? i - 1 : -1, x + 1 < w ? i + 1 : -1, y > 0 ? i - w : -1, y + 1 < h ? i + w : -1];
    for (const n of nbrs) {
      if (n >= 0 && mask[n] && !seen[n]) {
        seen[n] = 1;
        q.push(n);
      }
    }
  }
  // Close small holes so the peninsula is a solid landmass.
  const closed = seen.slice();
  for (let pass = 0; pass < 2; pass++) {
    const src = closed.slice();
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const i = y * w + x;
        if (src[i]) continue;
        let n = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) n += src[(y + dy) * w + (x + dx)];
        }
        if (n >= 5) closed[i] = 1;
      }
    }
  }
  return closed;
}

function coastDistance(land: Uint8Array, w: number, h: number): Float32Array {
  const dist = new Float32Array(w * h);
  const q: number[] = [];
  for (let i = 0; i < land.length; i++) {
    if (!land[i]) {
      dist[i] = 0;
      continue;
    }
    const x = i % w;
    const y = (i - x) / w;
    const edge =
      (x > 0 && !land[i - 1]) ||
      (x + 1 < w && !land[i + 1]) ||
      (y > 0 && !land[i - w]) ||
      (y + 1 < h && !land[i + w]);
    if (edge) {
      dist[i] = 0;
      q.push(i);
    } else {
      dist[i] = 1e6;
    }
  }
  let head = 0;
  while (head < q.length) {
    const i = q[head++];
    const x = i % w;
    const y = (i - x) / w;
    const nbrs = [x > 0 ? i - 1 : -1, x + 1 < w ? i + 1 : -1, y > 0 ? i - w : -1, y + 1 < h ? i + w : -1];
    const nd = dist[i] + 1;
    for (const n of nbrs) {
      if (n >= 0 && land[n] && nd < dist[n]) {
        dist[n] = nd;
        q.push(n);
      }
    }
  }
  return dist;
}

function cropFor(spot: MapHotspot) {
  const wide = spot.campusId === "flagship" || spot.number === 19 || spot.campusId === "orlando";
  const hu = wide ? 0.052 : 0.046;
  const up = spot.campusId === "flagship" ? 0.05 : 0.04;
  const down = spot.campusId === "flagship" ? 0.1 : 0.086;
  return {
    u0: Math.max(0, spot.u - hu),
    v0: Math.max(0, spot.v - up),
    u1: Math.min(0.75, spot.u + hu),
    v1: Math.min(0.99, spot.v + down),
  };
}

function extractSprite(
  imgData: ImageData,
  iw: number,
  ih: number,
  spot: MapHotspot,
): { canvas: HTMLCanvasElement; width: number; height: number } | null {
  const box = cropFor(spot);
  const x0 = Math.floor(box.u0 * iw);
  const y0 = Math.floor(box.v0 * ih);
  const x1 = Math.ceil(box.u1 * iw);
  const y1 = Math.ceil(box.v1 * ih);
  const cw = x1 - x0;
  const ch = y1 - y0;
  if (cw < 8 || ch < 8) return null;

  const keep = new Uint8Array(cw * ch);
  const src = imgData.data;
  for (let y = 0; y < ch; y++) {
    for (let x = 0; x < cw; x++) {
      const [r, g, b] = pixel(src, iw, x0 + x, y0 + y, iw, ih);
      keep[y * cw + x] = walkableForSprite(r, g, b) ? 1 : 0;
    }
  }

  // Flood from the badge (and a point just below it) so we keep the building, not nearby roads.
  const seedX = Math.round(spot.u * iw) - x0;
  const seedY = Math.round(spot.v * ih) - y0;
  const seen = new Uint8Array(cw * ch);
  const q: number[] = [];
  const trySeed = (sx: number, sy: number) => {
    if (sx < 0 || sy < 0 || sx >= cw || sy >= ch) return;
    const i = sy * cw + sx;
    if (!keep[i] || seen[i]) return;
    seen[i] = 1;
    q.push(i);
  };
  trySeed(seedX, seedY);
  trySeed(seedX, seedY + 10);
  trySeed(seedX, seedY + 22);
  let head = 0;
  while (head < q.length) {
    const i = q[head++];
    const x = i % cw;
    const y = (i - x) / cw;
    if (x > 0) trySeed(x - 1, y);
    if (x + 1 < cw) trySeed(x + 1, y);
    if (y > 0) trySeed(x, y - 1);
    if (y + 1 < ch) trySeed(x, y + 1);
  }

  // Dilate once so window frames and badge rims survive the chroma key.
  const dil = seen.slice();
  for (let y = 1; y < ch - 1; y++) {
    for (let x = 1; x < cw - 1; x++) {
      if (seen[y * cw + x]) continue;
      if (
        seen[y * cw + x - 1] ||
        seen[y * cw + x + 1] ||
        seen[(y - 1) * cw + x] ||
        seen[(y + 1) * cw + x]
      ) {
        dil[y * cw + x] = 1;
      }
    }
  }

  const canvas = document.createElement("canvas");
  canvas.width = cw;
  canvas.height = ch;
  const ctx = canvas.getContext("2d")!;
  const out = ctx.createImageData(cw, ch);
  for (let y = 0; y < ch; y++) {
    for (let x = 0; x < cw; x++) {
      const i = y * cw + x;
      const o = i * 4;
      const [r, g, b] = pixel(src, iw, x0 + x, y0 + y, iw, ih);
      out.data[o] = r;
      out.data[o + 1] = g;
      out.data[o + 2] = b;
      if (!dil[i]) {
        out.data[o + 3] = 0;
        continue;
      }
      // Feather: fewer land-neighbors → softer edge.
      let n = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= cw || ny >= ch) continue;
          n += dil[ny * cw + nx];
        }
      }
      out.data[o + 3] = n >= 8 ? 255 : Math.round((n / 8) * 255);
    }
  }
  ctx.putImageData(out, 0, 0);

  const opaque = out.data.reduce((a, _, i) => a + (i % 4 === 3 && out.data[i] > 16 ? 1 : 0), 0);
  if (opaque < 80) return null;

  const worldH = 0.62 + (ch / ih) * 4.2;
  const worldW = worldH * (cw / ch);
  return { canvas, width: worldW, height: worldH };
}

function inpaintBuildings(ctx: CanvasRenderingContext2D, iw: number, ih: number) {
  // Soft-stamp nearby forest color over each building so the terrain isn't a flat painting of the same cutout.
  for (const spot of MAP_HOTSPOTS) {
    const box = cropFor(spot);
    const x0 = Math.floor(box.u0 * iw);
    const y0 = Math.floor(box.v0 * ih);
    const w = Math.ceil((box.u1 - box.u0) * iw);
    const h = Math.ceil((box.v1 - box.v0) * ih);
    const sampleX = Math.max(2, x0 - 8);
    const sampleY = Math.min(ih - 2, y0 + h + 4);
    const pix = ctx.getImageData(sampleX, sampleY, 1, 1).data;
    ctx.fillStyle = `rgba(${pix[0]},${Math.max(pix[1], 70)},${Math.min(pix[2], 80)},0.82)`;
    ctx.fillRect(x0, y0, w, h);
  }
}

function buildPeninsulaGeometry(
  land: Uint8Array,
  heights: Float32Array,
  mw: number,
  mh: number,
  segsX: number,
  segsZ: number,
): THREE.BufferGeometry {
  const positions: number[] = [];
  const uvs: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];

  const sampleH = (u: number, v: number) => bilinearHeight(heights, mw, mh, u, v);
  const sampleL = (u: number, v: number) => bilinearMask(land, mw, mh, u, v);

  const gridH: number[] = [];
  const gridL: number[] = [];
  for (let iz = 0; iz <= segsZ; iz++) {
    for (let ix = 0; ix <= segsX; ix++) {
      const u = ix / segsX;
      const v = iz / segsZ;
      gridL.push(sampleL(u, v));
      gridH.push(sampleL(u, v) > 0.45 ? sampleH(u, v) : WATER_Y);
    }
  }
  const idx = (ix: number, iz: number) => iz * (segsX + 1) + ix;

  const pushTop = (ix: number, iz: number) => {
    const u = ix / segsX;
    const v = iz / segsZ;
    const [x, , z] = uvToWorld(u, v);
    const y = gridH[idx(ix, iz)];
    positions.push(x, y, z);
    uvs.push(u, 1 - v);
    const coast = Math.min(1, gridL[idx(ix, iz)]);
    colors.push(0.92 + 0.08 * coast, 0.95, 0.88);
    return positions.length / 3 - 1;
  };

  const cornerCache = new Map<string, number>();
  const corner = (ix: number, iz: number) => {
    const key = `${ix},${iz}`;
    const hit = cornerCache.get(key);
    if (hit !== undefined) return hit;
    const id = pushTop(ix, iz);
    cornerCache.set(key, id);
    return id;
  };

  for (let iz = 0; iz < segsZ; iz++) {
    for (let ix = 0; ix < segsX; ix++) {
      const l00 = gridL[idx(ix, iz)];
      const l10 = gridL[idx(ix + 1, iz)];
      const l11 = gridL[idx(ix + 1, iz + 1)];
      const l01 = gridL[idx(ix, iz + 1)];
      if (l00 + l10 + l11 + l01 < 1.6) continue;
      const a = corner(ix, iz);
      const b = corner(ix + 1, iz);
      const c = corner(ix + 1, iz + 1);
      const d = corner(ix, iz + 1);
      indices.push(a, b, c, a, c, d);
    }
  }

  // Cliff walls along every land/water grid edge.
  const wall = (ax: number, az: number, bx: number, bz: number) => {
    const u0 = ax / segsX;
    const v0 = az / segsZ;
    const u1 = bx / segsX;
    const v1 = bz / segsZ;
    const [x0, , z0] = uvToWorld(u0, v0);
    const [x1, , z1] = uvToWorld(u1, v1);
    const y0 = Math.max(gridH[idx(ax, az)], LAND_MIN_Y);
    const y1 = Math.max(gridH[idx(bx, bz)], LAND_MIN_Y);
    const base = positions.length / 3;
    positions.push(x0, y0, z0, x1, y1, z1, x1, WATER_Y - 0.04, z1, x0, WATER_Y - 0.04, z0);
    uvs.push(u0, 1 - v0, u1, 1 - v1, u1, 1 - v1, u0, 1 - v0);
    colors.push(0.28, 0.36, 0.16, 0.28, 0.36, 0.16, 0.12, 0.18, 0.1, 0.12, 0.18, 0.1);
    indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
  };

  for (let iz = 0; iz <= segsZ; iz++) {
    for (let ix = 0; ix < segsX; ix++) {
      const a = gridL[idx(ix, iz)] > 0.45;
      const b = gridL[idx(ix + 1, iz)] > 0.45;
      if (a !== b) wall(ix, iz, ix + 1, iz);
    }
  }
  for (let iz = 0; iz < segsZ; iz++) {
    for (let ix = 0; ix <= segsX; ix++) {
      const a = gridL[idx(ix, iz)] > 0.45;
      const b = gridL[idx(ix, iz + 1)] > 0.45;
      if (a !== b) wall(ix, iz, ix, iz + 1);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

export function buildFloridaArt(image: CanvasImageSource, quality: "high" | "low" = "high"): FloridaArt {
  const iw = "width" in image ? Number(image.width) : 1536;
  const ih = "height" in image ? Number(image.height) : 1024;
  const src = document.createElement("canvas");
  src.width = iw;
  src.height = ih;
  const sctx = src.getContext("2d", { willReadFrequently: true })!;
  sctx.drawImage(image, 0, 0, iw, ih);
  const imgData = sctx.getImageData(0, 0, iw, ih);

  const mask = new Uint8Array(MASK_W * MASK_H);
  for (let y = 0; y < MASK_H; y++) {
    for (let x = 0; x < MASK_W; x++) {
      const u = x / (MASK_W - 1);
      const v = y / (MASK_H - 1);
      const [r, g, b] = pixel(imgData.data, iw, Math.round(u * (iw - 1)), Math.round(v * (ih - 1)), iw, ih);
      mask[y * MASK_W + x] = landish(r, g, b, u, v) ? 1 : 0;
    }
  }
  const land = floodLand(mask, MASK_W, MASK_H);
  const cdist = coastDistance(land, MASK_W, MASK_H);
  const heights = new Float32Array(MASK_W * MASK_H);
  for (let y = 0; y < MASK_H; y++) {
    for (let x = 0; x < MASK_W; x++) {
      const i = y * MASK_W + x;
      if (!land[i]) {
        heights[i] = WATER_Y;
        continue;
      }
      const u = x / (MASK_W - 1);
      const v = y / (MASK_H - 1);
      const [r, g, b] = pixel(imgData.data, iw, Math.round(u * (iw - 1)), Math.round(v * (ih - 1)), iw, ih);
      const luma = (r + g + b) / (3 * 255);
      const inland = Math.min(1, cdist[i] / 14);
      const rise = inland * inland * (3 - 2 * inland);
      heights[i] = LAND_MIN_Y + (LAND_MAX_Y - LAND_MIN_Y) * rise + (luma - 0.38) * 0.08;
    }
  }

  const landCanvas = document.createElement("canvas");
  landCanvas.width = iw;
  landCanvas.height = ih;
  const lctx = landCanvas.getContext("2d")!;
  lctx.drawImage(src, 0, 0);
  inpaintBuildings(lctx, iw, ih);
  const landTexture = new THREE.CanvasTexture(landCanvas);
  landTexture.colorSpace = THREE.SRGBColorSpace;
  landTexture.anisotropy = 8;
  landTexture.needsUpdate = true;

  const segsX = quality === "high" ? 148 : 88;
  const segsZ = quality === "high" ? 100 : 60;
  const geometry = buildPeninsulaGeometry(land, heights, MASK_W, MASK_H, segsX, segsZ);

  const sprites: CampusSprite[] = [];
  for (const spot of MAP_HOTSPOTS) {
    const extracted = extractSprite(imgData, iw, ih, spot);
    if (!extracted) continue;
    const texture = new THREE.CanvasTexture(extracted.canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    texture.needsUpdate = true;
    sprites.push({
      campusId: spot.campusId,
      number: spot.number,
      u: spot.u,
      v: spot.v,
      texture,
      width: extracted.width,
      height: extracted.height,
    });
  }

  const heightAt = (u: number, v: number) => bilinearHeight(heights, MASK_W, MASK_H, u, v);
  const isLandAt = (u: number, v: number) => bilinearMask(land, MASK_W, MASK_H, u, v) > 0.5;

  return {
    geometry,
    landTexture,
    sprites,
    heightAt,
    isLand: isLandAt,
    dispose() {
      geometry.dispose();
      landTexture.dispose();
      for (const s of sprites) s.texture.dispose();
    },
  };
}
