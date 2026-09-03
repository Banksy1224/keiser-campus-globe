// Build a volumetric Florida landmass from the coastline MultiPolygon.
// Height comes from inland distance + a gentle central ridge — not from
// any painted poster.

import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import {
  LAND_MAX_Y,
  LAND_MIN_Y,
  WATER_Y,
  coastWorldBounds,
  indexCoast,
  latLngToMap,
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
  const beach = 1 - THREE.MathUtils.smoothstep(0.04, 0.22, inland);
  const everglades = lat < 26.55 && lng > -81.55 && inland > 0.18 ? 0.55 : 0;
  const ridge = lat > 27.2 && lat < 28.6 && lng > -82.0 && lng < -81.2 ? 0.28 : 0;
  const sand: [number, number, number] = [0.82, 0.74, 0.48];
  const grass: [number, number, number] = [0.28, 0.52, 0.2];
  const pine: [number, number, number] = [0.2, 0.4, 0.18];
  const wet: [number, number, number] = [0.18, 0.38, 0.28];
  const hill: [number, number, number] = [0.34, 0.46, 0.22];
  const inlandMix = THREE.MathUtils.smoothstep(0.15, 0.8, inland);
  let r = grass[0] * (1 - inlandMix) + pine[0] * inlandMix;
  let g = grass[1] * (1 - inlandMix) + pine[1] * inlandMix;
  let b = grass[2] * (1 - inlandMix) + pine[2] * inlandMix;
  r = r * (1 - beach) + sand[0] * beach;
  g = g * (1 - beach) + sand[1] * beach;
  b = b * (1 - beach) + sand[2] * beach;
  r = r * (1 - everglades) + wet[0] * everglades;
  g = g * (1 - everglades) + wet[1] * everglades;
  b = b * (1 - everglades) + wet[2] * everglades;
  r = r * (1 - ridge) + hill[0] * ridge;
  g = g * (1 - ridge) + hill[1] * ridge;
  b = b * (1 - ridge) + hill[2] * ridge;
  return [r, g, b];
}

function ringToPoints(ring: number[][]): THREE.Vector2[] {
  const pts = ring.map(([lng, lat]) => {
    const [x, , z] = latLngToMap(lat, lng);
    return new THREE.Vector2(x, z);
  });
  if (pts.length > 1 && pts[0].distanceTo(pts[pts.length - 1]) < 1e-6) pts.pop();
  if (THREE.ShapeUtils.isClockWise(pts)) pts.reverse();
  return pts;
}

function extrudeCoast(polys: IndexedPolygon[], heightAt: (x: number, z: number) => number): THREE.BufferGeometry {
  const geos: THREE.BufferGeometry[] = [];
  const depth = LAND_MIN_Y - (WATER_Y - 0.08);
  for (const poly of polys) {
    if (poly.outer.length < 4) continue;
    const outer = ringToPoints(poly.outer);
    if (outer.length < 3) continue;
    const shape = new THREE.Shape(outer);
    for (const hole of poly.holes) {
      const hp = ringToPoints(hole);
      if (hp.length < 3) continue;
      if (!THREE.ShapeUtils.isClockWise(hp)) hp.reverse();
      shape.holes.push(new THREE.Path(hp));
    }
    let geo: THREE.ExtrudeGeometry;
    try {
      geo = new THREE.ExtrudeGeometry(shape, {
        depth,
        bevelEnabled: false,
        curveSegments: 1,
        steps: 1,
      });
    } catch {
      continue;
    }
    // Shape is XZ in the XY plane; extrude +Z, then map Z → Y.
    geo.rotateX(-Math.PI / 2);
    geo.translate(0, WATER_Y - 0.08, 0);
    const pos = geo.getAttribute("position") as THREE.BufferAttribute;
    const colors = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);
      const top = y > LAND_MIN_Y - 0.08;
      if (top) {
        const lifted = heightAt(x, z);
        pos.setY(i, lifted);
        const { lat, lng } = mapToLatLng(x, z);
        const inland = THREE.MathUtils.clamp((lifted - LAND_MIN_Y) / (LAND_MAX_Y - LAND_MIN_Y), 0, 1);
        const [r, g, b] = landColor(inland, lat, lng);
        colors[i * 3] = r;
        colors[i * 3 + 1] = g;
        colors[i * 3 + 2] = b;
      } else {
        colors[i * 3] = 0.42;
        colors[i * 3 + 1] = 0.36;
        colors[i * 3 + 2] = 0.2;
      }
    }
    geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    geos.push(geo);
  }
  const merged = mergeGeometries(geos, false);
  for (const g of geos) g.dispose();
  if (!merged) {
    return new THREE.BoxGeometry(0.1, 0.1, 0.1);
  }
  return merged;
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

  const coverage = blur(land, mw, mh, 4);
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

  const geometry = extrudeCoast(polys, heightAt);

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
