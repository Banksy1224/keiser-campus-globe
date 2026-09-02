import { Suspense, useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, useTexture } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import * as THREE from "three";
import { campusById, FLAME_GOLD, type Campus } from "../lib/campus-data";
import {
  FLORIDA_MAP_ASSET,
  LEGEND_HITS,
  MAP_HEIGHT,
  MAP_HOTSPOTS,
  MAP_WIDTH,
  focusOf,
  hotspotsFor,
  sameMapCampus,
  uvToWorld,
} from "../lib/florida-map";

const asset = (path: string) => `${import.meta.env.BASE_URL}${path}`;

const INTRO_SECONDS = 7.2;
const FLY_SECONDS = 1.45;
const GOLD = new THREE.Color(FLAME_GOLD);

const OVERVIEW_LOOK = uvToWorld(0.38, 0.4);
const OVERVIEW_POS: [number, number, number] = [
  OVERVIEW_LOOK[0] + 0.15,
  7.35,
  OVERVIEW_LOOK[2] + 4.85,
];

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function cameraForFocus(campusId: string): { pos: THREE.Vector3; look: THREE.Vector3 } {
  const f = focusOf(campusId);
  const dist = 2.15 + f.span * 0.55;
  const look = new THREE.Vector3(f.x, 0.02, f.z);
  const pos = new THREE.Vector3(f.x + 0.05, dist * 0.72, f.z + dist * 0.62);
  return { pos, look };
}

function MapPlane() {
  const texture = useTexture(asset(FLORIDA_MAP_ASSET));
  useMemo(() => {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 8;
    texture.needsUpdate = true;
  }, [texture]);

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[MAP_WIDTH, MAP_HEIGHT]} />
      <meshBasicMaterial map={texture} toneMapped={false} />
    </mesh>
  );
}

function PulseMarks({ campusId }: { campusId: string | null }) {
  const group = useRef<THREE.Group>(null);
  const spots = useMemo(() => (campusId ? hotspotsFor(campusId) : []), [campusId]);

  useFrame((state) => {
    if (!group.current) return;
    const t = state.clock.elapsedTime;
    const pulse = 1 + 0.2 * (0.5 + 0.5 * Math.sin(t * 3.4));
    const glow = 0.28 + 0.32 * (0.5 + 0.5 * Math.sin(t * 3.4));
    group.current.children.forEach((child) => {
      child.scale.setScalar(pulse);
      child.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        const mat = mesh.material as THREE.MeshBasicMaterial | undefined;
        if (!mat || !("opacity" in mat)) return;
        mat.opacity = mesh.geometry?.type === "RingGeometry" ? 0.25 + glow : glow * 0.85;
      });
    });
  });

  if (!spots.length) return null;

  return (
    <group ref={group}>
      {spots.map((s, i) => {
        const [x, , z] = uvToWorld(s.u, s.v + 0.018, 0.08);
        return (
          <group key={`${s.campusId}-${i}`} position={[x, 0.08, z]}>
            <mesh rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[0.18, 0.28, 40]} />
              <meshBasicMaterial
                color={GOLD}
                transparent
                opacity={0.55}
                depthWrite={false}
                blending={THREE.AdditiveBlending}
              />
            </mesh>
            <mesh>
              <sphereGeometry args={[0.22, 16, 12]} />
              <meshBasicMaterial
                color={FLAME_GOLD}
                transparent
                opacity={0.32}
                depthWrite={false}
                blending={THREE.AdditiveBlending}
              />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

function HotspotHits({
  hoveredId,
  onHover,
  onSelect,
}: {
  hoveredId: string | null;
  onHover: (id: string | null) => void;
  onSelect: (campus: Campus) => void;
}) {
  return (
    <group>
      {MAP_HOTSPOTS.map((s, i) => {
        const [x, , z] = uvToWorld(s.u, s.v + 0.02, 0.06);
        const campus = campusById(s.campusId);
        if (!campus) return null;
        const hot = sameMapCampus(hoveredId, campus.id);
        return (
          <mesh
            key={`${s.campusId}-${i}`}
            position={[x, 0.06, z]}
            onClick={(e) => {
              e.stopPropagation();
              onSelect(campus);
            }}
            onPointerOver={(e) => {
              e.stopPropagation();
              onHover(campus.id);
              document.body.style.cursor = "pointer";
            }}
            onPointerOut={() => {
              onHover(null);
              document.body.style.cursor = "auto";
            }}
          >
            <sphereGeometry args={[hot ? 0.42 : 0.36, 12, 10]} />
            <meshBasicMaterial transparent opacity={0} depthWrite={false} />
          </mesh>
        );
      })}
      {LEGEND_HITS.map((hit) => {
        const campus = campusById(hit.campusId);
        if (!campus) return null;
        const [x0, , z0] = uvToWorld(hit.u0, hit.v0);
        const [x1, , z1] = uvToWorld(hit.u1, hit.v1);
        const cx = (x0 + x1) / 2;
        const cz = (z0 + z1) / 2;
        const w = Math.abs(x1 - x0);
        const d = Math.abs(z1 - z0);
        return (
          <mesh
            key={`legend-${hit.number}`}
            position={[cx, 0.05, cz]}
            rotation={[-Math.PI / 2, 0, 0]}
            onClick={(e) => {
              e.stopPropagation();
              onSelect(campus);
            }}
            onPointerOver={(e) => {
              e.stopPropagation();
              onHover(campus.id);
              document.body.style.cursor = "pointer";
            }}
            onPointerOut={() => {
              onHover(null);
              document.body.style.cursor = "auto";
            }}
          >
            <planeGeometry args={[w, d]} />
            <meshBasicMaterial transparent opacity={0} depthWrite={false} />
          </mesh>
        );
      })}
    </group>
  );
}

function MapRig({
  selectedId,
  playIntro,
  onIntroFinished,
  controlsRef,
}: {
  selectedId: string | null;
  playIntro: boolean;
  onIntroFinished: () => void;
  controlsRef: React.MutableRefObject<OrbitControlsImpl | null>;
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

  // Opening cinematic: Miami → peninsula sweep → overview.
  useEffect(() => {
    const f = flight.current;
    if (f.introDone && !playIntro) return;
    if (!playIntro || prefersReducedMotion()) {
      camera.position.set(...OVERVIEW_POS);
      look.current.set(...OVERVIEW_LOOK);
      camera.lookAt(look.current);
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
    const miami = cameraForFocus("miami");
    camera.position.copy(miami.pos).add(new THREE.Vector3(0.4, -0.35, 0.9));
    look.current.copy(miami.look);
    camera.lookAt(look.current);
  }, [playIntro, camera, controlsRef]);

  // Fly to a campus (or back to overview) after the intro.
  useEffect(() => {
    const f = flight.current;
    if (!f.introDone || playIntro) return;
    if (selectedId === f.lastId) return;
    f.lastId = selectedId;

    f.fromPos.copy(camera.position);
    f.fromLook.copy(look.current);
    if (selectedId) {
      const next = cameraForFocus(selectedId);
      f.toPos.copy(next.pos);
      f.toLook.copy(next.look);
    } else {
      f.toPos.set(...OVERVIEW_POS);
      f.toLook.set(...OVERVIEW_LOOK);
    }
    f.t = 0;
    f.mode = "fly";
    if (controlsRef.current) controlsRef.current.enabled = false;
  }, [selectedId, playIntro, camera, controlsRef]);

  useFrame((_, delta) => {
    const f = flight.current;

    if (f.mode === "intro") {
      f.t = Math.min(1, f.t + delta / INTRO_SECONDS);
      const t = f.t;
      const ease = t * t * (3 - 2 * t);

      const miami = cameraForFocus("miami");
      const mid = cameraForFocus("orlando");
      const north = cameraForFocus("jacksonville");
      const endPos = new THREE.Vector3(...OVERVIEW_POS);
      const endLook = new THREE.Vector3(...OVERVIEW_LOOK);

      const p0 = miami.pos.clone().add(new THREE.Vector3(0.35, -0.4, 1.1));
      const p1 = mid.pos.clone().add(new THREE.Vector3(-0.2, 1.4, 1.6));
      const p2 = north.pos.clone().add(new THREE.Vector3(0.1, 2.2, 2.4));

      // Piecewise: south → central → north → overview.
      let pos: THREE.Vector3;
      let tgt: THREE.Vector3;
      if (t < 0.34) {
        const u = ease / 0.34;
        pos = p0.clone().lerp(p1, u);
        tgt = miami.look.clone().lerp(mid.look, u);
      } else if (t < 0.62) {
        const u = (ease - 0.34) / 0.28;
        pos = p1.clone().lerp(p2, u);
        tgt = mid.look.clone().lerp(north.look, u);
      } else {
        const u = (ease - 0.62) / 0.38;
        pos = p2.clone().lerp(endPos, u);
        tgt = north.look.clone().lerp(endLook, u);
      }
      camera.position.copy(pos);
      look.current.copy(tgt);
      camera.lookAt(look.current);

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
      camera.lookAt(look.current);
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
      camera={{ position: OVERVIEW_POS, fov: 42, near: 0.1, far: 80 }}
      gl={{ antialias: true }}
      dpr={[1, 2]}
      aria-label="Interactive illustrated map of Keiser University Florida campuses"
    >
      <color attach="background" args={["#0b1c33"]} />
      <ambientLight intensity={1} />
      <Suspense fallback={null}>
        <MapPlane />
        <PulseMarks campusId={selectedId} />
        <HotspotHits hoveredId={hoveredId} onHover={onHover} onSelect={onSelect} />
        <MapRig
          selectedId={selectedId}
          playIntro={playIntro}
          onIntroFinished={onIntroFinished}
          controlsRef={controlsRef}
        />
      </Suspense>
      <OrbitControls
        ref={controlsRef}
        makeDefault
        enablePan
        enableDamping
        dampingFactor={0.08}
        minDistance={1.6}
        maxDistance={13}
        minPolarAngle={0.18}
        maxPolarAngle={Math.PI / 2.12}
        target={OVERVIEW_LOOK}
      />
    </Canvas>
  );
}
