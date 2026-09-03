import { Suspense, useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, useTexture } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import * as THREE from "three";
import { campusById, FLAME_GOLD, type Campus } from "../lib/campus-data";
import { buildFloridaArt, type FloridaArt } from "../lib/florida-art";
import {
  FLORIDA_MAP_ASSET,
  MAP_HOTSPOTS,
  OVERVIEW_LOOK,
  OVERVIEW_POS,
  WATER_Y,
  approachOf,
  hotspotFoot,
  sameMapCampus,
  uvToWorld,
  type HeightSampler,
} from "../lib/florida-map";

const asset = (path: string) => `${import.meta.env.BASE_URL}${path}`;

const INTRO_SECONDS = 8.6;
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

function useFloridaArtFromTexture(texture: THREE.Texture): FloridaArt {
  const art = useMemo(() => {
    const img = texture.image as CanvasImageSource;
    return buildFloridaArt(img, isMobile() ? "low" : "high");
  }, [texture]);
  useEffect(() => () => art.dispose(), [art]);
  return art;
}

function PaintedSky() {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        uniforms: {
          uZenith: { value: new THREE.Color("#3d7ec8") },
          uHorizon: { value: new THREE.Color("#c8e4f6") },
          uHaze: { value: new THREE.Color("#f0d9a8") },
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
      <sphereGeometry args={[80, 32, 20]} />
      <primitive object={mat} attach="material" />
    </mesh>
  );
}

function Ocean() {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: false,
        uniforms: {
          uTime: { value: 0 },
          uDeep: { value: new THREE.Color("#0c5a88") },
          uShallow: { value: new THREE.Color("#3ad4dc") },
          uFoam: { value: new THREE.Color("#e7f8fb") },
        },
        vertexShader: `
          varying vec3 vWorld;
          uniform float uTime;
          void main() {
            vec3 p = position;
            p.y += sin(p.x * 1.55 + uTime * 0.7) * 0.018
                 + sin(p.z * 1.15 + p.x * 0.35 + uTime * 0.85) * 0.014;
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
            vec2 c = vec2(-1.35, -0.15);
            float d = length(vWorld.xz - c);
            float shore = smoothstep(2.1, 10.5, d);
            vec3 col = mix(uShallow, uDeep, shore);
            float w = sin(vWorld.x * 2.3 + uTime * 0.65) * cos(vWorld.z * 1.7 + uTime * 0.5);
            col += 0.05 * w;
            float foam = smoothstep(2.6, 1.4, d) * (0.35 + 0.25 * sin(uTime * 1.4 + d * 4.0));
            col = mix(col, uFoam, foam * 0.45);
            float spec = pow(max(0.0, 1.0 - shore), 2.0) * 0.12;
            col += spec;
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
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, WATER_Y, 0]}>
      <planeGeometry args={[56, 56, 72, 72]} />
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

function TitlePlaque() {
  const texture = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 1024;
    c.height = 256;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#0b1c33";
    ctx.fillRect(0, 0, 1024, 256);
    ctx.strokeStyle = "#E8BC58";
    ctx.lineWidth = 10;
    ctx.strokeRect(8, 8, 1008, 240);
    ctx.fillStyle = "#E8BC58";
    ctx.textAlign = "center";
    ctx.font = "600 52px 'Barlow Condensed', Impact, sans-serif";
    ctx.fillText("KEISER UNIVERSITY", 512, 100);
    ctx.font = "700 78px 'Barlow Condensed', Impact, sans-serif";
    ctx.fillText("FLORIDA CAMPUSES", 512, 186);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);
  useEffect(() => () => texture.dispose(), [texture]);
  return (
    <group position={[-6.6, 2.35, -3.4]} rotation={[0, 0.55, 0]}>
      <mesh>
        <planeGeometry args={[4.4, 1.1]} />
        <meshBasicMaterial map={texture} toneMapped={false} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

function CompassRose() {
  return (
    <group position={[-6.2, 0.08, 3.6]} rotation={[0, 0.2, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.55, 0.64, 32]} />
        <meshStandardMaterial color={FLAME_GOLD} metalness={0.4} roughness={0.35} />
      </mesh>
      <mesh position={[0, 0.04, -0.28]} rotation={[0.15, 0, 0]}>
        <coneGeometry args={[0.09, 0.48, 4]} />
        <meshStandardMaterial color={FLAME_GOLD} />
      </mesh>
      <mesh position={[0, 0.04, 0.28]} rotation={[Math.PI - 0.15, 0, 0]}>
        <coneGeometry args={[0.08, 0.4, 4]} />
        <meshStandardMaterial color="#f4e7b8" />
      </mesh>
    </group>
  );
}

function Peninsula({ art }: { art: FloridaArt }) {
  return (
    <mesh geometry={art.geometry} receiveShadow castShadow>
      <meshStandardMaterial
        map={art.landTexture}
        vertexColors
        roughness={0.88}
        metalness={0.02}
        toneMapped={false}
        polygonOffset
        polygonOffsetFactor={1}
        polygonOffsetUnits={1}
      />
    </mesh>
  );
}

function YBillboard({
  position,
  children,
}: {
  position: [number, number, number];
  children: React.ReactNode;
}) {
  const ref = useRef<THREE.Group>(null);
  const { camera } = useThree();
  useFrame(() => {
    if (!ref.current) return;
    const p = ref.current.position;
    ref.current.lookAt(camera.position.x, p.y, camera.position.z);
  });
  return (
    <group ref={ref} position={position}>
      {children}
    </group>
  );
}

function CampusMarkers({
  art,
  selectedId,
  hoveredId,
  onHover,
  onSelect,
}: {
  art: FloridaArt;
  selectedId: string | null;
  hoveredId: string | null;
  onHover: (id: string | null) => void;
  onSelect: (campus: Campus) => void;
}) {
  const pulse = useRef<THREE.Group>(null);
  const buildings = useRef<THREE.Group[]>([]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const s = 1 + 0.14 * (0.5 + 0.5 * Math.sin(t * 3.5));
    const glow = 0.35 + 0.4 * (0.5 + 0.5 * Math.sin(t * 3.5));
    for (const g of buildings.current) {
      if (!g) continue;
      g.scale.setScalar(sameMapCampus(g.userData.campusId, selectedId) ? s : 1);
    }
    if (!pulse.current) return;
    pulse.current.children.forEach((child) => {
      child.scale.setScalar(s);
      child.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        const mat = mesh.material as THREE.MeshBasicMaterial | undefined;
        if (!mat || !("opacity" in mat) || !mat.userData?.pulse) return;
        mat.opacity = glow;
      });
    });
  });

  return (
    <group>
      {art.sprites.map((sprite, i) => {
        const campus = campusById(sprite.campusId);
        if (!campus) return null;
        const foot = hotspotFoot(sprite);
        const y = art.heightAt(foot.u, foot.v);
        const [x, , z] = uvToWorld(foot.u, foot.v, y);
        const selected = sameMapCampus(selectedId, campus.id);
        const hot = selected || sameMapCampus(hoveredId, campus.id);
        return (
          <group
            key={`${sprite.campusId}-${i}`}
            position={[x, y, z]}
            userData={{ campusId: campus.id }}
            ref={(el) => {
              if (el) buildings.current[i] = el;
            }}
          >
            <YBillboard position={[0, 0, 0]}>
              <mesh position={[0, sprite.height / 2, 0]} castShadow>
                <planeGeometry args={[sprite.width, sprite.height]} />
                <meshBasicMaterial
                  map={sprite.texture}
                  transparent
                  alphaTest={0.12}
                  toneMapped={false}
                  side={THREE.DoubleSide}
                  depthWrite
                />
              </mesh>
            </YBillboard>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0.02]}>
              <circleGeometry args={[0.22, 20]} />
              <meshBasicMaterial color="#0b1c33" transparent opacity={0.28} depthWrite={false} />
            </mesh>
            <mesh
              position={[0, sprite.height * 0.45, 0]}
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
              <sphereGeometry args={[hot ? 0.55 : 0.42, 12, 10]} />
              <meshBasicMaterial transparent opacity={0} depthWrite={false} />
            </mesh>
          </group>
        );
      })}

      <group ref={pulse}>
        {selectedId &&
          MAP_HOTSPOTS.filter((s) => sameMapCampus(s.campusId, selectedId)).map((s, i) => {
            const foot = hotspotFoot(s);
            const y = art.heightAt(foot.u, foot.v);
            const [x, , z] = uvToWorld(foot.u, foot.v, y);
            return (
              <group key={`pulse-${s.campusId}-${i}`} position={[x, y + 0.04, z]}>
                <mesh rotation={[-Math.PI / 2, 0, 0]}>
                  <ringGeometry args={[0.2, 0.36, 40]} />
                  <meshBasicMaterial
                    color={GOLD}
                    transparent
                    opacity={0.55}
                    depthWrite={false}
                    blending={THREE.AdditiveBlending}
                    userData={{ pulse: true }}
                  />
                </mesh>
                <mesh>
                  <sphereGeometry args={[0.28, 16, 12]} />
                  <meshBasicMaterial
                    color={FLAME_GOLD}
                    transparent
                    opacity={0.32}
                    depthWrite={false}
                    blending={THREE.AdditiveBlending}
                    userData={{ pulse: true }}
                  />
                </mesh>
              </group>
            );
          })}
      </group>
    </group>
  );
}

function introCurves(heightAt: HeightSampler) {
  const miami = approachOf("miami", heightAt);
  const flag = approachOf("flagship", heightAt);
  const orlando = approachOf("orlando", heightAt);
  const jax = approachOf("jacksonville", heightAt);
  const startPos = new THREE.Vector3(miami.pos[0] + 0.8, 1.05, miami.pos[2] + 1.35);
  const startLook = new THREE.Vector3(miami.look[0], miami.look[1], miami.look[2] - 0.2);
  const p1 = new THREE.Vector3(flag.pos[0] + 0.4, 2.15, flag.pos[2] + 0.9);
  const l1 = new THREE.Vector3(...flag.look);
  const p2 = new THREE.Vector3(orlando.pos[0] - 0.6, 3.4, orlando.pos[2] + 1.1);
  const l2 = new THREE.Vector3(...orlando.look);
  const p3 = new THREE.Vector3(jax.pos[0] - 0.2, 4.2, jax.pos[2] + 1.8);
  const l3 = new THREE.Vector3(...jax.look);
  const endPos = new THREE.Vector3(...OVERVIEW_POS);
  const endLook = new THREE.Vector3(...OVERVIEW_LOOK);
  return {
    pos: new THREE.CatmullRomCurve3([startPos, p1, p2, p3, endPos], false, "catmullrom", 0.25),
    look: new THREE.CatmullRomCurve3([startLook, l1, l2, l3, endLook], false, "catmullrom", 0.25),
  };
}

function MapRig({
  selectedId,
  playIntro,
  onIntroFinished,
  controlsRef,
  heightAt,
}: {
  selectedId: string | null;
  playIntro: boolean;
  onIntroFinished: () => void;
  controlsRef: React.MutableRefObject<OrbitControlsImpl | null>;
  heightAt: HeightSampler;
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
  const curves = useMemo(() => introCurves(heightAt), [heightAt]);

  useEffect(() => {
    const f = flight.current;
    if (f.introDone && !playIntro) return;
    if (!playIntro || prefersReducedMotion()) {
      if (selectedId) {
        const next = approachOf(selectedId, heightAt);
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
    setView(camera, p, l, 0.12);
  }, [playIntro, camera, controlsRef, heightAt, selectedId, curves]);

  useEffect(() => {
    const f = flight.current;
    if (!f.introDone || playIntro) return;
    if (selectedId === f.lastId) return;
    f.lastId = selectedId;
    f.fromPos.copy(camera.position);
    f.fromLook.copy(look.current);
    if (selectedId) {
      const next = approachOf(selectedId, heightAt);
      f.toPos.set(...next.pos);
      f.toLook.set(...next.look);
    } else {
      f.toPos.set(...OVERVIEW_POS);
      f.toLook.set(...OVERVIEW_LOOK);
    }
    f.t = 0;
    f.mode = "fly";
    if (controlsRef.current) controlsRef.current.enabled = false;
  }, [selectedId, playIntro, camera, controlsRef, heightAt]);

  useFrame((_, delta) => {
    const f = flight.current;
    if (f.mode === "intro") {
      f.t = Math.min(1, f.t + delta / INTRO_SECONDS);
      const t = f.t;
      const ease = t * t * (3 - 2 * t);
      const pos = curves.pos.getPoint(ease);
      const tgt = curves.look.getPoint(ease);
      const bank = 0.2 * Math.sin(ease * Math.PI * 1.6) * (1 - ease);
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
  const poster = useTexture(asset(FLORIDA_MAP_ASSET));
  useMemo(() => {
    poster.colorSpace = THREE.SRGBColorSpace;
    poster.anisotropy = 8;
  }, [poster]);
  const art = useFloridaArtFromTexture(poster);

  return (
    <>
      <PaintedSky />
      <fog attach="fog" args={["#9ec9e6", 22, 62]} />
      <hemisphereLight args={["#d7e9ff", "#3d5a2a", 0.55]} />
      <directionalLight
        position={[10, 14, 6]}
        intensity={1.35}
        castShadow={!isMobile()}
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <directionalLight position={[-8, 4, -6]} intensity={0.28} color="#8fb7e8" />
      <Ocean />
      <Peninsula art={art} />
      <CampusMarkers
        art={art}
        selectedId={selectedId}
        hoveredId={hoveredId}
        onHover={onHover}
        onSelect={onSelect}
      />
      <TitlePlaque />
      <CompassRose />
      <StylizedCloud position={[-8, 7.2, -6]} scale={1.4} />
      <StylizedCloud position={[6, 6.4, -8]} scale={1.1} />
      <StylizedCloud position={[2, 8.1, 4]} scale={0.85} />
      <MapRig
        selectedId={selectedId}
        playIntro={playIntro}
        onIntroFinished={onIntroFinished}
        controlsRef={controlsRef}
        heightAt={art.heightAt}
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
      camera={{ position: OVERVIEW_POS, fov: 46, near: 0.08, far: 160 }}
      gl={{ antialias: true }}
      dpr={[1, 2]}
      shadows
      aria-label="Interactive 3D flyover of Keiser University Florida campuses"
    >
      <color attach="background" args={["#7eb6e4"]} />
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
        minDistance={1.4}
        maxDistance={16}
        minPolarAngle={0.32}
        maxPolarAngle={1.32}
        target={OVERVIEW_LOOK}
      />
    </Canvas>
  );
}