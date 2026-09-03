import { Suspense, useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Html, OrbitControls } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import * as THREE from "three";
import { FLAME_GOLD, type Campus } from "../lib/campus-data";
import { WATER_Y, latLngToMap } from "../lib/florida-geo";
import { buildFloridaTerrain, type FloridaTerrain } from "../lib/florida-terrain";
import {
  INTRO_WAYPOINTS,
  OVERVIEW_LOOK,
  OVERVIEW_POS,
  approachOf,
  floridaSitePoses,
  sameMapCampus,
  type HeightSampler,
  type SitePose,
} from "../lib/florida-map";

const INTRO_SECONDS = 11.2;
const FLY_SECONDS = 1.55;
const GOLD = new THREE.Color(FLAME_GOLD);

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function isMobile(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(max-width: 639px)").matches;
}

function setView(camera: THREE.Camera, pos: THREE.Vector3, look: THREE.Vector3, roll = 0) {
  camera.position.copy(pos);
  camera.up.set(0, 1, 0);
  camera.lookAt(look);
  if (roll) camera.rotateZ(roll);
}

function PaintedSky() {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        uniforms: {
          uZenith: { value: new THREE.Color("#2f6fb8") },
          uHorizon: { value: new THREE.Color("#b9daf2") },
          uHaze: { value: new THREE.Color("#e8d3a4") },
        },
        vertexShader: `
          varying vec3 vDir;
          void main() {
            vDir = normalize(position);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          varying vec3 vDir;
          uniform vec3 uZenith;
          uniform vec3 uHorizon;
          uniform vec3 uHaze;
          void main() {
            float h = clamp(vDir.y * 0.5 + 0.5, 0.0, 1.0);
            vec3 col = mix(uHaze, uHorizon, smoothstep(0.42, 0.55, h));
            col = mix(col, uZenith, smoothstep(0.58, 0.95, h));
            gl_FragColor = vec4(col, 1.0);
          }
        `,
      }),
    [],
  );
  return (
    <mesh>
      <sphereGeometry args={[90, 32, 20]} />
      <primitive object={mat} attach="material" />
    </mesh>
  );
}

function Ocean() {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uDeep: { value: new THREE.Color("#0a4e7a") },
          uShallow: { value: new THREE.Color("#2ec4ce") },
          uFoam: { value: new THREE.Color("#e7f8fb") },
        },
        vertexShader: `
          varying vec3 vWorld;
          uniform float uTime;
          void main() {
            vec3 p = position;
            p.y += sin(p.x * 1.35 + uTime * 0.7) * 0.02
                 + sin(p.z * 1.05 + p.x * 0.32 + uTime * 0.85) * 0.016;
            vec4 w = modelMatrix * vec4(p, 1.0);
            vWorld = w.xyz;
            gl_Position = projectionMatrix * viewMatrix * w;
          }
        `,
        fragmentShader: `
          varying vec3 vWorld;
          uniform float uTime;
          uniform vec3 uDeep;
          uniform vec3 uShallow;
          uniform vec3 uFoam;
          void main() {
            float d = length(vWorld.xz);
            float shore = smoothstep(3.2, 14.0, d);
            vec3 col = mix(uShallow, uDeep, shore);
            float w = sin(vWorld.x * 2.1 + uTime * 0.65) * cos(vWorld.z * 1.55 + uTime * 0.5);
            col += 0.045 * w;
            float foam = smoothstep(5.5, 2.2, d) * (0.28 + 0.22 * sin(uTime * 1.4 + d * 3.2));
            col = mix(col, uFoam, foam * 0.35);
            gl_FragColor = vec4(col, 1.0);
          }
        `,
      }),
    [],
  );
  useFrame((_, dt) => {
    if (prefersReducedMotion()) return;
    mat.uniforms.uTime.value += dt;
  });
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, WATER_Y, 0]} receiveShadow>
      <planeGeometry args={[72, 72, 80, 80]} />
      <primitive object={mat} attach="material" />
    </mesh>
  );
}

function StylizedCloud({
  position,
  scale = 1,
}: {
  position: [number, number, number];
  scale?: number;
}) {
  const ref = useRef<THREE.Group>(null);
  const drift = useRef(Math.random() * 10);
  useFrame((_, dt) => {
    if (!ref.current || prefersReducedMotion()) return;
    drift.current += dt * 0.12;
    ref.current.position.x += Math.sin(drift.current) * 0.002;
  });
  const puff = { roughness: 1, color: "#f7fbff" } as const;
  return (
    <group ref={ref} position={position} scale={scale}>
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[1.1, 12, 10]} />
        <meshStandardMaterial {...puff} />
      </mesh>
      <mesh position={[1.05, 0.18, 0.15]}>
        <sphereGeometry args={[0.78, 12, 10]} />
        <meshStandardMaterial {...puff} />
      </mesh>
      <mesh position={[-0.95, 0.12, -0.1]}>
        <sphereGeometry args={[0.7, 12, 10]} />
        <meshStandardMaterial {...puff} />
      </mesh>
      <mesh position={[0.15, 0.45, -0.2]}>
        <sphereGeometry args={[0.62, 12, 10]} />
        <meshStandardMaterial {...puff} />
      </mesh>
    </group>
  );
}

function Peninsula({ terrain }: { terrain: FloridaTerrain }) {
  return (
    <mesh geometry={terrain.geometry} receiveShadow castShadow>
      <meshStandardMaterial
        vertexColors
        roughness={0.9}
        metalness={0.02}
        polygonOffset
        polygonOffsetFactor={1}
        polygonOffsetUnits={1}
      />
    </mesh>
  );
}

function Vegetation({ terrain }: { terrain: FloridaTerrain }) {
  const meshes = useMemo(() => {
    const items: Array<{ x: number; y: number; z: number; s: number }> = [];
    if (isMobile()) return items;
    const { minX, maxX, minZ, maxZ } = terrain.bounds;
    let seed = 7;
    const rand = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };
    for (let i = 0; i < 70 && items.length < 48; i++) {
      const x = minX + rand() * (maxX - minX);
      const z = minZ + rand() * (maxZ - minZ);
      if (terrain.isLand(x, z) < 0.72) continue;
      const y = terrain.heightAt(x, z);
      items.push({ x, y, z, s: 0.7 + rand() * 0.55 });
    }
    return items;
  }, [terrain]);

  return (
    <group>
      {meshes.map((t, i) => (
        <group key={i} position={[t.x, t.y, t.z]} scale={t.s}>
          <mesh position={[0, 0.12, 0]} castShadow>
            <cylinderGeometry args={[0.018, 0.024, 0.24, 5]} />
            <meshStandardMaterial color="#3a2b1a" />
          </mesh>
          <mesh position={[0, 0.32, 0]} castShadow>
            <coneGeometry args={[0.14, 0.32, 6]} />
            <meshStandardMaterial color="#2d6a38" roughness={1} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function campusLayout(campus: Campus) {
  const flagship = Boolean(campus.flagship);
  const count = campus.skyline.length;
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

function CampusCluster({
  site,
  groundY,
  selected,
  hovered,
  onHover,
  onSelect,
}: {
  site: SitePose;
  groundY: number;
  selected: boolean;
  hovered: boolean;
  onHover: (id: string | null) => void;
  onSelect: (campus: Campus) => void;
}) {
  const group = useRef<THREE.Group>(null);
  const buildings = useMemo(() => campusLayout(site.campus), [site.campus]);
  const hot = selected || hovered;

  useFrame((state) => {
    if (!group.current) return;
    if (prefersReducedMotion()) {
      group.current.scale.setScalar(1);
      return;
    }
    const t = state.clock.elapsedTime;
    const s = selected ? 1 + 0.12 * (0.5 + 0.5 * Math.sin(t * 3.6)) : 1;
    group.current.scale.setScalar(s);
  });

  return (
    <group ref={group} position={[site.x, groundY, site.z]} userData={{ campusId: site.id }}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]} receiveShadow>
        <circleGeometry args={[site.campus.flagship ? 0.28 : 0.2, 22]} />
        <meshStandardMaterial color="#1a2744" roughness={0.85} />
      </mesh>
      {buildings.map((b, i) => (
        <mesh key={i} position={[b.x, b.h / 2, b.z]} castShadow>
          <boxGeometry args={[b.w, b.h, b.w * 0.92]} />
          <meshStandardMaterial
            color={i % 3 === 0 ? "#1d2e57" : "#2a4686"}
            roughness={0.55}
            metalness={0.18}
            emissive={selected ? FLAME_GOLD : "#000000"}
            emissiveIntensity={selected ? 0.22 : 0}
          />
        </mesh>
      ))}
      {site.campus.flagship && (
        <mesh position={[0, 0.55, 0]} castShadow>
          <coneGeometry args={[0.055, 0.16, 5]} />
          <meshStandardMaterial
            color={FLAME_GOLD}
            emissive={FLAME_GOLD}
            emissiveIntensity={0.55}
            roughness={0.3}
          />
        </mesh>
      )}
      <mesh position={[0, 0.42, 0]}>
        <cylinderGeometry args={[0.018, 0.018, 0.36, 8]} />
        <meshStandardMaterial color={FLAME_GOLD} metalness={0.45} roughness={0.35} />
      </mesh>
      <mesh position={[0, 0.64, 0]}>
        <sphereGeometry args={[0.045, 12, 10]} />
        <meshStandardMaterial
          color={FLAME_GOLD}
          emissive={FLAME_GOLD}
          emissiveIntensity={hot ? 0.7 : 0.25}
        />
      </mesh>
      <mesh
        position={[0, 0.28, 0]}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(site.campus);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          onHover(site.id);
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          onHover(null);
          document.body.style.cursor = "auto";
        }}
      >
        <sphereGeometry args={[hot ? 0.38 : 0.28, 12, 10]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      {selected && (
        <>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
            <ringGeometry args={[0.22, 0.34, 36]} />
            <meshBasicMaterial
              color={GOLD}
              transparent
              opacity={0.55}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
          <mesh position={[0, 0.3, 0]}>
            <sphereGeometry args={[0.22, 16, 12]} />
            <meshBasicMaterial
              color={FLAME_GOLD}
              transparent
              opacity={0.22}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
        </>
      )}
      {(hot || selected) && (
        <Html position={[0, 0.92, 0]} center style={{ pointerEvents: "none" }}>
          <div className="whitespace-nowrap rounded-full border border-keiser-gold/60 bg-keiser-navy/90 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-keiser-gold shadow-lg">
            {site.number} · {site.campus.city}
          </div>
        </Html>
      )}
    </group>
  );
}

function CampusMarkers({
  sites,
  terrain,
  selectedId,
  hoveredId,
  onHover,
  onSelect,
}: {
  sites: SitePose[];
  terrain: FloridaTerrain;
  selectedId: string | null;
  hoveredId: string | null;
  onHover: (id: string | null) => void;
  onSelect: (campus: Campus) => void;
}) {
  return (
    <group>
      {sites.map((site) => (
        <CampusCluster
          key={site.id}
          site={site}
          groundY={terrain.heightAt(site.x, site.z)}
          selected={sameMapCampus(selectedId, site.id)}
          hovered={sameMapCampus(hoveredId, site.id)}
          onHover={onHover}
          onSelect={onSelect}
        />
      ))}
    </group>
  );
}

function introCurves() {
  const posPts = INTRO_WAYPOINTS.map((w) => {
    const [x, , z] = latLngToMap(w.lat, w.lng);
    return new THREE.Vector3(x, w.alt, z);
  });
  const lookPts = INTRO_WAYPOINTS.map((w) => {
    const [x, , z] = latLngToMap(w.lookLat, w.lookLng);
    return new THREE.Vector3(x, w.lookY, z);
  });
  posPts.push(new THREE.Vector3(...OVERVIEW_POS));
  lookPts.push(new THREE.Vector3(...OVERVIEW_LOOK));
  return {
    pos: new THREE.CatmullRomCurve3(posPts, false, "catmullrom", 0.25),
    look: new THREE.CatmullRomCurve3(lookPts, false, "catmullrom", 0.25),
  };
}

function MapRig({
  selectedId,
  playIntro,
  onIntroFinished,
  controlsRef,
  heightAt,
  sites,
}: {
  selectedId: string | null;
  playIntro: boolean;
  onIntroFinished: () => void;
  controlsRef: React.MutableRefObject<OrbitControlsImpl | null>;
  heightAt: HeightSampler;
  sites: SitePose[];
}) {
  const { camera } = useThree();
  const flight = useRef({
    mode: "idle" as "intro" | "fly" | "idle",
    t: 0,
    fromPos: new THREE.Vector3(),
    toPos: new THREE.Vector3(),
    fromLook: new THREE.Vector3(),
    toLook: new THREE.Vector3(),
    lastId: null as string | null | undefined,
    introDone: false,
  });
  const look = useRef(new THREE.Vector3(...OVERVIEW_LOOK));
  const doneRef = useRef(onIntroFinished);
  doneRef.current = onIntroFinished;
  const curves = useMemo(() => introCurves(), []);

  useEffect(() => {
    const f = flight.current;
    if (f.introDone && !playIntro) return;
    if (!playIntro || prefersReducedMotion()) {
      if (selectedId) {
        const next = approachOf(selectedId, heightAt, sites);
        camera.position.set(...next.pos);
        look.current.set(...next.look);
      } else {
        camera.position.set(...OVERVIEW_POS);
        look.current.set(...OVERVIEW_LOOK);
      }
      setView(camera, camera.position, look.current);
      f.introDone = true;
      f.mode = "idle";
      if (controlsRef.current) {
        controlsRef.current.target.copy(look.current);
        controlsRef.current.enabled = true;
        controlsRef.current.update();
      }
      doneRef.current();
      return;
    }
    f.mode = "intro";
    f.t = 0;
    f.introDone = false;
    if (controlsRef.current) controlsRef.current.enabled = false;
    const p = curves.pos.getPoint(0);
    const l = curves.look.getPoint(0);
    camera.position.copy(p);
    look.current.copy(l);
    setView(camera, p, l, 0.14);
  }, [playIntro, camera, controlsRef, heightAt, selectedId, curves, sites]);

  useEffect(() => {
    const f = flight.current;
    if (!f.introDone || playIntro) return;
    if (selectedId === f.lastId) return;
    f.lastId = selectedId;
    f.fromPos.copy(camera.position);
    f.fromLook.copy(look.current);
    if (selectedId) {
      const next = approachOf(selectedId, heightAt, sites);
      f.toPos.set(...next.pos);
      f.toLook.set(...next.look);
    } else {
      f.toPos.set(...OVERVIEW_POS);
      f.toLook.set(...OVERVIEW_LOOK);
    }
    f.t = 0;
    f.mode = "fly";
    if (controlsRef.current) controlsRef.current.enabled = false;
  }, [selectedId, playIntro, camera, controlsRef, heightAt, sites]);

  useFrame((_, delta) => {
    const f = flight.current;
    if (f.mode === "intro") {
      f.t = Math.min(1, f.t + delta / INTRO_SECONDS);
      const t = f.t;
      const ease = t * t * (3 - 2 * t);
      const pos = curves.pos.getPoint(ease);
      const tgt = curves.look.getPoint(ease);
      const bank = 0.22 * Math.sin(ease * Math.PI * 1.8) * (1 - ease);
      camera.position.copy(pos);
      look.current.copy(tgt);
      setView(camera, pos, tgt, bank);
      if (t >= 1) {
        f.mode = "idle";
        f.introDone = true;
        if (controlsRef.current) {
          controlsRef.current.target.copy(look.current);
          controlsRef.current.enabled = true;
          controlsRef.current.update();
        }
        doneRef.current();
        f.lastId = undefined;
      }
      return;
    }

    if (f.mode === "fly") {
      f.t = Math.min(1, f.t + delta / FLY_SECONDS);
      const t = f.t * f.t * (3 - 2 * f.t);
      camera.position.lerpVectors(f.fromPos, f.toPos, t);
      look.current.lerpVectors(f.fromLook, f.toLook, t);
      const midBank = 0.1 * Math.sin(Math.PI * t);
      setView(camera, camera.position, look.current, midBank);
      if (f.t >= 1) {
        f.mode = "idle";
        if (controlsRef.current) {
          controlsRef.current.target.copy(look.current);
          controlsRef.current.enabled = true;
          controlsRef.current.update();
        }
      }
    }
  });

  return null;
}

function FloridaWorld({
  selectedId,
  hoveredId,
  playIntro,
  onIntroFinished,
  onHover,
  onSelect,
  controlsRef,
}: {
  selectedId: string | null;
  hoveredId: string | null;
  playIntro: boolean;
  onIntroFinished: () => void;
  onHover: (id: string | null) => void;
  onSelect: (campus: Campus) => void;
  controlsRef: React.MutableRefObject<OrbitControlsImpl | null>;
}) {
  const terrain = useMemo(() => buildFloridaTerrain(isMobile() ? "low" : "high"), []);
  useEffect(() => () => terrain.dispose(), [terrain]);
  const sites = useMemo(() => floridaSitePoses(), []);

  return (
    <>
      <PaintedSky />
      <fog attach="fog" args={["#9ec9e6", 28, 78]} />
      <hemisphereLight args={["#d5e8ff", "#3d5a28", 0.62]} />
      <ambientLight intensity={0.16} />
      <directionalLight
        position={[12, 16, 7]}
        intensity={1.35}
        castShadow={!isMobile()}
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-near={1}
        shadow-camera-far={40}
        shadow-camera-left={-14}
        shadow-camera-right={14}
        shadow-camera-top={14}
        shadow-camera-bottom={-14}
      />
      <directionalLight position={[-8, 4, -6]} intensity={0.28} color="#8fb7e8" />
      <Ocean />
      <Peninsula terrain={terrain} />
      <Vegetation terrain={terrain} />
      <CampusMarkers
        sites={sites}
        terrain={terrain}
        selectedId={selectedId}
        hoveredId={hoveredId}
        onHover={onHover}
        onSelect={onSelect}
      />
      <StylizedCloud position={[-9, 7.4, -7]} scale={1.4} />
      <StylizedCloud position={[7, 6.6, -9]} scale={1.1} />
      <StylizedCloud position={[2.5, 8.2, 5]} scale={0.85} />
      <MapRig
        selectedId={selectedId}
        playIntro={playIntro}
        onIntroFinished={onIntroFinished}
        controlsRef={controlsRef}
        heightAt={terrain.heightAt}
        sites={sites}
      />
    </>
  );
}

export default function FloridaMapView({
  selectedId,
  hoveredId,
  playIntro,
  onIntroFinished,
  onHover,
  onSelect,
}: {
  selectedId: string | null;
  hoveredId: string | null;
  playIntro: boolean;
  onIntroFinished: () => void;
  onHover: (id: string | null) => void;
  onSelect: (campus: Campus) => void;
}) {
  const controlsRef = useRef<OrbitControlsImpl | null>(null);

  return (
    <Canvas
      className="absolute inset-0"
      camera={{ position: OVERVIEW_POS, fov: 46, near: 0.08, far: 180 }}
      gl={{ antialias: true }}
      dpr={[1, 2]}
      shadows
      aria-label="Interactive 3D geographic flyover of Keiser University Florida campuses"
    >
      <color attach="background" args={["#6ea8d6"]} />
      <Suspense fallback={null}>
        <FloridaWorld
          selectedId={selectedId}
          hoveredId={hoveredId}
          playIntro={playIntro}
          onIntroFinished={onIntroFinished}
          onHover={onHover}
          onSelect={onSelect}
          controlsRef={controlsRef}
        />
      </Suspense>
      <OrbitControls
        ref={controlsRef}
        makeDefault
        enablePan
        enableDamping
        dampingFactor={0.08}
        minDistance={1.8}
        maxDistance={18}
        minPolarAngle={0.72}
        maxPolarAngle={1.28}
        target={OVERVIEW_LOOK}
      />
    </Canvas>
  );
}
