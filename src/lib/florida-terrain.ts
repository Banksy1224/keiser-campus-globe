// Build a volumetric Florida landmass from the coastline MultiPolygon.
// Height comes from inland distance + a gentle central ridge — not from
// any painted poster.

import * as THREE from "three";
import {
  LAND_MAX_Y,
  LAND_MIN_Y,
  WATER_Y,
  coastWorldBounds,
  indexCoast,
  mapToLatLng,
  pointInFlorida,
  type IndexedPolygon,
} from "./florida-geo";

export interface FloridaTerrain {
  geometry: THREE.BufferGeometry;
  heightAt: (x: number, z: number) => number;
  isLand: (x: number, z: number) => number;
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
  dispose: () => void;
}

function bilinear(grid: Float32Array, w: number, h: number, u: number, v: number): number {
  const x = THREE.MathUtils.clamp(u, 0, 1) * (w - 1);
  const y = THREE.MathUtils.clamp(v, 0, 1) * (h - 1);
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const x1 = Math.min(w - 1, x0 + 1);
  const y1 = Math.min(h - 1, y0 + 1);
  const tx = x - x0;
  const ty = y - y0;
  const s00 = grid[y0 * w + x0];
  const s10 = grid[y0 * w + x1];
  const s01 = grid[y1 * w + x0];
  const s11 = grid[y1 * w + x1];
  return s00 * (1 - tx) * (1 - ty) + s10 * tx * (1 - ty) + s01 * (1 - tx) * ty + s11 * tx * ty;
}

function blur(src: Uint8Array | Float32Array, w: number, h: number, passes: number): Float32Array {
  let cur = new Float32Array(w * h);
  for (let i = 0; i < src.length; i++) cur[i] = src[i];
  for (let p = 0; p < passes; p++) {
    const next = new Float32Array(w * h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let sum = 0;
        let n = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
            sum += cur[ny * w + nx];
            n++;
          }
        }
        next[y * w + x] = sum / n;
      }
    }
    cur = next;
  }
  return cur;
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

function landColor(inland: number, lat: number, lng: number): [number, number, number] {
  const beach = 1 - THREE.MathUtils.smoothstep(0.08, 0.38, inland);
  const everglades = lat < 26.6 && lng > -81.6 && inland > 0.25 ? 1 : 0;
  const ridge = lat > 27.2 && lat < 28.6 && lng > -82.0 && lng < -81.2 ? 0.35 : 0;
  const sand: [number, number, number] = [0.86, 0.78, 0.55];
  const grass: [number, number, number] = [0.38, 0.58, 0.28];
  const pine: [number, number, number] = [0.26, 0.46, 0.24];
  const wet: [number, number, number] = [0.22, 0.42, 0.32];
  const hill: [number, number, number] = [0.42, 0.52, 0.3];
  const inlandMix = THREE.MathUtils.smoothstep(0.2, 0.85, inland);
  let r = grass[0] * (1 - inlandMix) + pine[0] * inlandMix;
  let g = grass[1] * (1 - inlandMix) + pine[1] * inlandMix;
  let b = grass[2] * (1 - inlandMix) + pine[2] * inlandMix;
  r = r * (1 - beach) + sand[0] * beach;
  g = g * (1 - beach) + sand[1] * beach;
  b = b * (1 - beach) + sand[2] * beach;
  if (everglades) {
    r = r * 0.55 + wet[0] * 0.45;
    g = g * 0.55 + wet[1] * 0.45;
    b = b * 0.55 + wet[2] * 0.45;
  }
  r = r * (1 - ridge) + hill[0] * ridge;
  g = g * (1 - ridge) + hill[1] * ridge;
  b = b * (1 - ridge) + hill[2] * ridge;
  return [r, g, b];
}

function buildMesh(
  coverage: Float32Array,
  heights: Float32Array,
  mw: number,
  mh: number,
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number },
  segsX: number,
  segsZ: number,
): THREE.BufferGeometry {
  const positions: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];
  const spanX = bounds.maxX - bounds.minX;
  const spanZ = bounds.maxZ - bounds.minZ;

  const sampleC = (u: number, v: number) => bilinear(coverage, mw, mh, u, v);
  const sampleH = (u: number, v: number) => bilinear(heights, mw, mh, u, v);
  const worldOf = (u: number, v: number): [number, number] => [
    bounds.minX + u * spanX,
    bounds.minZ + v * spanZ,
  ];

  const cols = segsX + 1;
  const gridY: number[] = [];
  const gridC: number[] = [];
  for (let iz = 0; iz <= segsZ; iz++) {
    for (let ix = 0; ix <= segsX; ix++) {
      const u = ix / segsX;
      const v = iz / segsZ;
      const cov = sampleC(u, v);
      const t = THREE.MathUtils.smoothstep(0.28, 0.66, cov);
      gridC.push(cov);
      gridY.push(THREE.MathUtils.lerp(LAND_MIN_Y, Math.max(LAND_MIN_Y, sampleH(u, v)), t));
    }
  }

  const vertId = new Int32Array((segsX + 1) * (segsZ + 1)).fill(-1);
  const ensure = (ix: number, iz: number) => {
    const gi = iz * cols + ix;
    if (vertId[gi] >= 0) return vertId[gi];
    const u = ix / segsX;
    const v = iz / segsZ;
    const [x, z] = worldOf(u, v);
    const { lat, lng } = mapToLatLng(x, z);
    const inland = THREE.MathUtils.clamp(sampleH(u, v) / LAND_MAX_Y, 0, 1);
    const [cr, cg, cb] = landColor(inland, lat, lng);
    positions.push(x, gridY[gi], z);
    colors.push(cr, cg, cb);
    vertId[gi] = positions.length / 3 - 1;
    return vertId[gi];
  };

  for (let iz = 0; iz < segsZ; iz++) {
    for (let ix = 0; ix < segsX; ix++) {
      const c00 = gridC[iz * cols + ix];
      const c10 = gridC[iz * cols + ix + 1];
      const c11 = gridC[(iz + 1) * cols + ix + 1];
      const c01 = gridC[(iz + 1) * cols + ix];
      if (c00 + c10 + c11 + c01 < 0.7) continue;
      const a = ensure(ix, iz);
      const b = ensure(ix + 1, iz);
      const c = ensure(ix + 1, iz + 1);
      const d = ensure(ix, iz + 1);
      indices.push(a, b, c, a, c, d);
    }
  }

  const wall = (ax: number, az: number, bx: number, bz: number) => {
    const u0 = ax / segsX;
    const v0 = az / segsZ;
    const u1 = bx / segsX;
    const v1 = bz / segsZ;
    const [x0, z0] = worldOf(u0, v0);
    const [x1, z1] = worldOf(u1, v1);
    const y0 = gridY[az * cols + ax];
    const y1 = gridY[bz * cols + bx];
    if (y0 <= LAND_MIN_Y + 0.01 && y1 <= LAND_MIN_Y + 0.01) return;
    const base = positions.length / 3;
    positions.push(x0, y0, z0, x1, y1, z1, x1, WATER_Y - 0.08, z1, x0, WATER_Y - 0.08, z0);
    colors.push(0.34, 0.32, 0.2, 0.34, 0.32, 0.2, 0.16, 0.18, 0.12, 0.16, 0.18, 0.12);
    indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
  };

  for (let iz = 0; iz <= segsZ; iz++) {
    for (let ix = 0; ix < segsX; ix++) {
      const a = gridC[iz * cols + ix] > 0.35;
      const b = gridC[iz * cols + ix + 1] > 0.35;
      if (a !== b) wall(ix, iz, ix + 1, iz);
    }
  }
  for (let iz = 0; iz < segsZ; iz++) {
    for (let ix = 0; ix <= segsX; ix++) {
      const a = gridC[iz * cols + ix] > 0.35;
      const b = gridC[(iz + 1) * cols + ix] > 0.35;
      if (a !== b) wall(ix, iz, ix, iz + 1);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

export function buildFloridaTerrain(quality: "high" | "low" = "high"): FloridaTerrain {
  const polys: IndexedPolygon[] = indexCoast();
  const raw = coastWorldBounds(polys);
  const padX = (raw.maxX - raw.minX) * 0.04;
  const padZ = (raw.maxZ - raw.minZ) * 0.04;
  const bounds = {
    minX: raw.minX - padX,
    maxX: raw.maxX + padX,
    minZ: raw.minZ - padZ,
    maxZ: raw.maxZ + padZ,
  };

  const mw = quality === "high" ? 340 : 200;
  const mh = quality === "high" ? 280 : 168;
  const land = new Uint8Array(mw * mh);
  const spanX = bounds.maxX - bounds.minX;
  const spanZ = bounds.maxZ - bounds.minZ;

  for (let y = 0; y < mh; y++) {
    for (let x = 0; x < mw; x++) {
      const wx = bounds.minX + (x / (mw - 1)) * spanX;
      const wz = bounds.minZ + (y / (mh - 1)) * spanZ;
      const { lat, lng } = mapToLatLng(wx, wz);
      land[y * mw + x] = pointInFlorida(lng, lat, polys) ? 1 : 0;
    }
  }

  const coverage = blur(land, mw, mh, 2);
  const cdist = coastDistance(land, mw, mh);
  const heights = new Float32Array(mw * mh);
  for (let y = 0; y < mh; y++) {
    for (let x = 0; x < mw; x++) {
      const i = y * mw + x;
      if (!land[i]) {
        heights[i] = WATER_Y;
        continue;
      }
      const wx = bounds.minX + (x / (mw - 1)) * spanX;
      const wz = bounds.minZ + (y / (mh - 1)) * spanZ;
      const { lat, lng } = mapToLatLng(wx, wz);
      const inland = Math.min(1, cdist[i] / 16);
      const rise = inland * inland * (3 - 2 * inland);
      // Lake Wales Ridge / central high — modest, real-ish, gives the drone altitude.
      const ridge = Math.exp(-(((lng + 81.55) / 0.55) ** 2) - (((lat - 27.85) / 0.85) ** 2));
      const panhandle = lat > 30.1 && lng < -84.2 ? 0.08 : 0;
      heights[i] = LAND_MIN_Y + (LAND_MAX_Y - LAND_MIN_Y) * (0.72 * rise + 0.22 * ridge + panhandle);
    }
  }

  const segsX = quality === "high" ? 220 : 130;
  const segsZ = quality === "high" ? 180 : 108;
  const geometry = buildMesh(coverage, heights, mw, mh, bounds, segsX, segsZ);

  const uvOf = (wx: number, wz: number) => ({
    u: (wx - bounds.minX) / spanX,
    v: (wz - bounds.minZ) / spanZ,
  });

  const heightAt = (wx: number, wz: number) => {
    const { u, v } = uvOf(wx, wz);
    const cov = bilinear(coverage, mw, mh, u, v);
    const t = THREE.MathUtils.smoothstep(0.28, 0.66, cov);
    const peak = Math.max(LAND_MIN_Y, bilinear(heights, mw, mh, u, v));
    return THREE.MathUtils.lerp(LAND_MIN_Y, peak, t);
  };

  const isLand = (wx: number, wz: number) => {
    const { u, v } = uvOf(wx, wz);
    return bilinear(coverage, mw, mh, u, v);
  };

  return {
    geometry,
    heightAt,
    isLand,
    bounds,
    dispose() {
      geometry.dispose();
    },
  };
}
