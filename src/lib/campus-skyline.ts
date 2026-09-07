// Shared volumetric campus skyline used by the stylized Three.js Florida
// peninsula and the Cesium / Google Photorealistic overlay. Layout numbers
// match the prior CampusCluster (plaza, ring of boxes, gold pole / flame).

import { FLAME_GOLD, type Campus } from "./campus-data";

export const SKYLINE_PLAZA = "#1a2744";
export const SKYLINE_BUILDING_A = "#1d2e57";
export const SKYLINE_BUILDING_B = "#2a4686";
export const SKYLINE_GOLD = FLAME_GOLD;

/**
 * One prior Florida-map layout unit → meters on the photoreal globe.
 * Plaza ~18–25 m, tallest buildings ~80–90 m — readable on fly-to, small
 * enough not to swallow neighboring campuses on the Fort Lauderdale corridor.
 */
export const SKYLINE_UNIT_METERS = 90;

export interface SkylineBox {
  x: number;
  z: number;
  h: number;
  w: number;
}

/** Ring of building masses from each campus's catalog `skyline` heights. */
export function campusLayout(campus: Campus): SkylineBox[] {
  const flagship = Boolean(campus.flagship);
  const count = Math.max(1, campus.skyline.length);
  const ring = flagship ? 0.2 : 0.15;
  return campus.skyline.map((h, i) => {
    const angle = (i / count) * Math.PI * 2 - Math.PI / 2;
    return {
      x: Math.cos(angle) * ring,
      z: Math.sin(angle) * ring,
      h: (flagship ? 0.32 : 0.2) + h * (flagship ? 0.72 : 0.5),
      w: flagship ? 0.11 : 0.085,
    };
  });
}

export function plazaRadius(campus: Campus): number {
  return campus.flagship ? 0.28 : 0.2;
}

function hexToRgba(hex: string): [number, number, number, number] {
  const n = hex.replace("#", "");
  const v = Number.parseInt(n.length === 3 ? n.split("").map((c) => c + c).join("") : n, 16);
  return [((v >> 16) & 255) / 255, ((v >> 8) & 255) / 255, (v & 255) / 255, 1];
}

interface MeshPart {
  positions: number[];
  normals: number[];
  indices: number[];
  material: number;
}

function pushBox(parts: MeshPart[], cx: number, cy: number, cz: number, sx: number, sy: number, sz: number, material: number) {
  const hx = sx / 2;
  const hy = sy / 2;
  const hz = sz / 2;
  const faces: Array<{ n: [number, number, number]; q: Array<[number, number, number]> }> = [
    { n: [0, 0, 1], q: [[-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]] },
    { n: [0, 0, -1], q: [[1, -1, -1], [-1, -1, -1], [-1, 1, -1], [1, 1, -1]] },
    { n: [0, 1, 0], q: [[-1, 1, 1], [1, 1, 1], [1, 1, -1], [-1, 1, -1]] },
    { n: [0, -1, 0], q: [[-1, -1, -1], [1, -1, -1], [1, -1, 1], [-1, -1, 1]] },
    { n: [1, 0, 0], q: [[1, -1, 1], [1, -1, -1], [1, 1, -1], [1, 1, 1]] },
    { n: [-1, 0, 0], q: [[-1, -1, -1], [-1, -1, 1], [-1, 1, 1], [-1, 1, -1]] },
  ];
  const part: MeshPart = { positions: [], normals: [], indices: [], material };
  for (const face of faces) {
    const base = part.positions.length / 3;
    for (const [x, y, z] of face.q) {
      part.positions.push(cx + x * hx, cy + y * hy, cz + z * hz);
      part.normals.push(...face.n);
    }
    part.indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }
  parts.push(part);
}

function pushLathe(
  parts: MeshPart[],
  cx: number,
  cy: number,
  cz: number,
  radiusBottom: number,
  radiusTop: number,
  height: number,
  segments: number,
  material: number,
) {
  const part: MeshPart = { positions: [], normals: [], indices: [], material };
  const y0 = cy - height / 2;
  const y1 = cy + height / 2;
  for (let i = 0; i < segments; i++) {
    const a0 = (i / segments) * Math.PI * 2;
    const a1 = ((i + 1) / segments) * Math.PI * 2;
    const c0 = Math.cos(a0);
    const s0 = Math.sin(a0);
    const c1 = Math.cos(a1);
    const s1 = Math.sin(a1);
    const base = part.positions.length / 3;
    part.positions.push(
      cx + c0 * radiusBottom, y0, cz + s0 * radiusBottom,
      cx + c1 * radiusBottom, y0, cz + s1 * radiusBottom,
      cx + c1 * radiusTop, y1, cz + s1 * radiusTop,
      cx + c0 * radiusTop, y1, cz + s0 * radiusTop,
    );
    const nx0 = c0;
    const nz0 = s0;
    const nx1 = c1;
    const nz1 = s1;
    part.normals.push(nx0, 0, nz0, nx1, 0, nz1, nx1, 0, nz1, nx0, 0, nz0);
    part.indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }
  parts.push(part);
}

function pushSphere(parts: MeshPart[], cx: number, cy: number, cz: number, r: number, segs: number, material: number) {
  const part: MeshPart = { positions: [], normals: [], indices: [], material };
  const stacks = Math.max(6, Math.floor(segs / 2));
  for (let yi = 0; yi < stacks; yi++) {
    const v0 = yi / stacks;
    const v1 = (yi + 1) / stacks;
    const yA = Math.cos(v0 * Math.PI);
    const yB = Math.cos(v1 * Math.PI);
    const rA = Math.sin(v0 * Math.PI);
    const rB = Math.sin(v1 * Math.PI);
    for (let xi = 0; xi < segs; xi++) {
      const u0 = (xi / segs) * Math.PI * 2;
      const u1 = ((xi + 1) / segs) * Math.PI * 2;
      const p00: [number, number, number] = [rA * Math.cos(u0), yA, rA * Math.sin(u0)];
      const p10: [number, number, number] = [rA * Math.cos(u1), yA, rA * Math.sin(u1)];
      const p01: [number, number, number] = [rB * Math.cos(u0), yB, rB * Math.sin(u0)];
      const p11: [number, number, number] = [rB * Math.cos(u1), yB, rB * Math.sin(u1)];
      const base = part.positions.length / 3;
      for (const p of [p00, p10, p11, p01]) {
        part.positions.push(cx + p[0] * r, cy + p[1] * r, cz + p[2] * r);
        part.normals.push(...p);
      }
      part.indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
    }
  }
  parts.push(part);
}

function packGlb(parts: MeshPart[], materialDefs: Array<{ color: string; metal: number; rough: number; emissive?: string; emissiveGain?: number }>): Uint8Array {
  const positions: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];
  const primitives: Array<{ firstIndex: number; indexCount: number; material: number }> = [];

  for (const part of parts) {
    const vertexBase = positions.length / 3;
    positions.push(...part.positions);
    normals.push(...part.normals);
    const firstIndex = indices.length;
    for (const idx of part.indices) indices.push(vertexBase + idx);
    primitives.push({ firstIndex, indexCount: part.indices.length, material: part.material });
  }

  const posBytes = new Uint8Array(new Float32Array(positions).buffer);
  const nrmBytes = new Uint8Array(new Float32Array(normals).buffer);
  const idxBytes = new Uint8Array(new Uint32Array(indices).buffer);

  const align = (n: number) => (n + 3) & ~3;
  const posOff = 0;
  const nrmOff = align(posBytes.length);
  const idxOff = align(nrmOff + nrmBytes.length);
  const binLen = align(idxOff + idxBytes.length);
  const bin = new Uint8Array(binLen);
  bin.set(posBytes, posOff);
  bin.set(nrmBytes, nrmOff);
  bin.set(idxBytes, idxOff);

  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
  for (let i = 0; i < positions.length; i += 3) {
    minX = Math.min(minX, positions[i]);
    minY = Math.min(minY, positions[i + 1]);
    minZ = Math.min(minZ, positions[i + 2]);
    maxX = Math.max(maxX, positions[i]);
    maxY = Math.max(maxY, positions[i + 1]);
    maxZ = Math.max(maxZ, positions[i + 2]);
  }

  const accessors: object[] = [
    {
      bufferView: 0,
      componentType: 5126,
      count: positions.length / 3,
      type: "VEC3",
      min: [minX, minY, minZ],
      max: [maxX, maxY, maxZ],
    },
    { bufferView: 1, componentType: 5126, count: normals.length / 3, type: "VEC3" },
  ];
  const bufferViews: object[] = [
    { buffer: 0, byteOffset: posOff, byteLength: posBytes.length, target: 34962 },
    { buffer: 0, byteOffset: nrmOff, byteLength: nrmBytes.length, target: 34962 },
  ];
  const meshPrimitives = primitives.map((p) => {
    const byteOffset = idxOff + p.firstIndex * 4;
    const byteLength = p.indexCount * 4;
    const viewIndex = bufferViews.length;
    bufferViews.push({ buffer: 0, byteOffset, byteLength, target: 34963 });
    const accIndex = accessors.length;
    accessors.push({
      bufferView: viewIndex,
      componentType: 5125,
      count: p.indexCount,
      type: "SCALAR",
    });
    return {
      attributes: { POSITION: 0, NORMAL: 1 },
      indices: accIndex,
      material: p.material,
      mode: 4,
    };
  });

  const gltf = {
    asset: { version: "2.0", generator: "keiser-campus-skyline" },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ mesh: 0 }],
    meshes: [{ primitives: meshPrimitives }],
    materials: materialDefs.map((m) => ({
      pbrMetallicRoughness: {
        baseColorFactor: hexToRgba(m.color),
        metallicFactor: m.metal,
        roughnessFactor: m.rough,
      },
      emissiveFactor: m.emissive
        ? hexToRgba(m.emissive).slice(0, 3).map((c) => c * (m.emissiveGain ?? 0.55))
        : [0, 0, 0],
      doubleSided: true,
    })),
    accessors,
    bufferViews,
    buffers: [{ byteLength: binLen }],
  };

  const json = new TextEncoder().encode(JSON.stringify(gltf));
  const jsonPad = align(json.length) - json.length;
  const jsonChunk = json.length + jsonPad;
  const total = 12 + 8 + jsonChunk + 8 + binLen;
  const out = new Uint8Array(total);
  const view = new DataView(out.buffer);
  view.setUint32(0, 0x46546c67, true); // glTF
  view.setUint32(4, 2, true);
  view.setUint32(8, total, true);
  view.setUint32(12, jsonChunk, true);
  view.setUint32(16, 0x4e4f534a, true); // JSON
  out.set(json, 20);
  for (let i = 0; i < jsonPad; i++) out[20 + json.length + i] = 0x20;
  const binHeader = 20 + jsonChunk;
  view.setUint32(binHeader, binLen, true);
  view.setUint32(binHeader + 4, 0x004e4942, true); // BIN
  out.set(bin, binHeader + 8);
  return out;
}

/** Binary glTF of the prior Florida campus cluster, Y-up, origin on the plaza. */
export function campusSkylineGlb(campus: Campus): Uint8Array {
  const u = SKYLINE_UNIT_METERS;
  const buildings = campusLayout(campus);
  const parts: MeshPart[] = [];

  const plazaR = plazaRadius(campus) * u;
  pushLathe(parts, 0, 0.4, 0, plazaR, plazaR, 0.8, 22, 0);

  buildings.forEach((b, i) => {
    pushBox(parts, b.x * u, (b.h * u) / 2, b.z * u, b.w * u, b.h * u, b.w * 0.92 * u, i % 3 === 0 ? 1 : 2);
  });

  if (campus.flagship) {
    pushLathe(parts, 0, 0.55 * u, 0, 0.055 * u, 0.001, 0.16 * u, 8, 3);
  }
  pushLathe(parts, 0, 0.42 * u, 0, 0.018 * u, 0.018 * u, 0.36 * u, 10, 3);
  pushSphere(parts, 0, 0.64 * u, 0, 0.045 * u, 10, 3);

  return packGlb(parts, [
    { color: SKYLINE_PLAZA, metal: 0.02, rough: 0.85 },
    { color: SKYLINE_BUILDING_A, metal: 0.18, rough: 0.55 },
    { color: SKYLINE_BUILDING_B, metal: 0.18, rough: 0.55 },
    { color: SKYLINE_GOLD, metal: 0.45, rough: 0.35, emissive: SKYLINE_GOLD, emissiveGain: 0.45 },
  ]);
}

const skylineUrls = new Map<string, string>();

export function campusSkylineUrl(campus: Campus): string {
  const cached = skylineUrls.get(campus.id);
  if (cached) return cached;
  const bytes = campusSkylineGlb(campus);
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  const url = URL.createObjectURL(new Blob([copy.buffer], { type: "model/gltf-binary" }));
  skylineUrls.set(campus.id, url);
  return url;
}
