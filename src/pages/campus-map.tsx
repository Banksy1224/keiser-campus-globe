import { Suspense, lazy, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Html, OrbitControls, Stars, useTexture } from "@react-three/drei";

// Real Google Photorealistic 3D tiles overlay — lazy so the 3d-tiles library
// only downloads when a campus tour is opened (and only when a key is set).
const CampusTilesOverlay = lazy(() => import("./campus-tiles"));
// AI concierge chat — lazy; only loads when opened.
const AIConcierge = lazy(() => import("./ai-concierge"));
// Admissions inquiry modal — lazy; only loads when "Request info" is opened.
const LeadForm = lazy(() => import("../components/lead-form"));
// A Google Maps key (Map Tiles API) enables the photoreal 3D campus tour;
// without it we fall back to the stylized 3D scene. Kept local so the heavy
// tiles module stays out of the main chunk.
const TILES_ENABLED = Boolean(import.meta.env.VITE_GOOGLE_MAPS_API_KEY);
// A configured backend endpoint enables the AI concierge.
const AI_ENABLED = Boolean(import.meta.env.VITE_AI_ENDPOINT);
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import * as THREE from "three";
import {
  CAMPUSES,
  FLAME_GOLD,
  REGIONS,
  getFlagship,
  type Campus,
  type CampusRegion,
} from "../lib/campus-data";
import { GLOBE_RADIUS, arcCurvePoints, arcPoint, latLngToVec3 } from "../lib/globe-utils";
import { speak, speechSupported, stopSpeaking } from "../lib/narration";
import { GOOGLE_KEY, useResolvedLatLng, useStreetViewAvailable } from "../lib/campus-location";

// Base-aware asset URL (works under the GitHub Pages project sub-path).
const asset = (path: string) => `${import.meta.env.BASE_URL}${path}`;

/** Resolve a campus's photo URL: explicit `photo`, else the `<id>.jpg`
 *  convention. With `alt`, prefer the secondary `photoAlt` (3D billboard).
 *  Always base-aware so it works on the Pages sub-path. */
const campusPhotoSrc = (campus: Campus, alt = false) =>
  asset((alt ? campus.photoAlt : undefined) ?? campus.photo ?? `campuses/${campus.id}.jpg`);

/** Base-aware flag image URL for a campus, derived from its city's country
 *  (US for Florida/US campuses, a globe for the online/global node). */
function flagSrc(campus: Campus): string {
  const city = campus.city.toLowerCase();
  const byCountry: Array<[string, string]> = [
    ["nicaragua", "ni"],
    ["bolivia", "bo"],
    ["ecuador", "ec"],
    ["peru", "pe"],
    ["el salvador", "sv"],
    ["spain", "es"],
    ["india", "in"],
    ["indonesia", "id"],
    ["sri lanka", "lk"],
    ["vietnam", "vn"],
    ["china", "cn"],
  ];
  for (const [name, cc] of byCountry) if (city.includes(name)) return asset(`flags/${cc}.svg`);
  if (campus.region === "Online & Global" && city.includes("anywhere")) return asset("globe.svg");
  return asset("flags/us.svg"); // Florida + US campuses
}

/** Load a texture without suspending; resolves to null if the file is absent. */
function useOptionalTexture(url: string): THREE.Texture | null {
  const [tex, setTex] = useState<THREE.Texture | null>(null);
  useEffect(() => {
    let alive = true;
    const loader = new THREE.TextureLoader();
    loader.load(
      url,
      (t) => {
        t.colorSpace = THREE.SRGBColorSpace;
        if (alive) setTex(t);
        else t.dispose();
      },
      undefined,
      () => alive && setTex(null),
    );
    return () => {
      alive = false;
    };
  }, [url]);
  return tex;
}

// ---- Tunable feel knobs ---------------------------------------------------
const FLIGHT_SECONDS = 1.8; // duration of a single campus-to-campus flight
const FOCUS_DISTANCE = 3.4; // camera distance when settled on a campus
const ORBIT_DISTANCE = 6.2; // resting "drone" altitude over the whole globe
const PULLBACK = 1.6; // extra altitude gained at mid-flight (the swoop)
const TRAIL_SEGMENTS = 128; // resolution of the flight arc / comet trail
const TRAIL_FADE = 26; // how many segments stay lit behind the aircraft
const TOUR_DWELL_MS = 5400; // guided-tour pause at each campus before moving on
const GOLD = new THREE.Color(FLAME_GOLD);

// ---------------------------------------------------------------------------
// Globe: photoreal Earth — real day map, terrain normals, ocean sun-glint,
// glowing night-side city lights, a drifting cloud layer, and atmosphere glow.
// Textures: NASA Visible Earth (public domain), via the three.js asset set.
// ---------------------------------------------------------------------------
function Globe({ globeRef }: { globeRef: React.MutableRefObject<THREE.Mesh | null> }) {
  const [dayMap, normalMap, specMap, nightMap, cloudsMap] = useTexture([
    asset("textures/earth_atmos_2048.jpg"),
    asset("textures/earth_normal_2048.jpg"),
    asset("textures/earth_specular_2048.jpg"),
    asset("textures/earth_lights_2048.png"),
    asset("textures/earth_clouds_1024.png"),
  ]);

  useMemo(() => {
    dayMap.colorSpace = THREE.SRGBColorSpace;
    nightMap.colorSpace = THREE.SRGBColorSpace;
    cloudsMap.colorSpace = THREE.SRGBColorSpace;
  }, [dayMap, nightMap, cloudsMap]);

  const cloudsRef = useRef<THREE.Mesh>(null);
  useFrame((_, delta) => {
    if (cloudsRef.current) cloudsRef.current.rotation.y += delta * 0.008;
  });

  return (
    <group>
      <mesh ref={globeRef}>
        <sphereGeometry args={[GLOBE_RADIUS, 96, 96]} />
        <meshStandardMaterial
          map={dayMap}
          normalMap={normalMap}
          // Oceans are bright in the specular map → slightly metallic → catch a
          // sun-glint; landmasses stay matte.
          metalnessMap={specMap}
          metalness={0.32}
          roughness={0.66}
          // City lights glow on the night side.
          emissiveMap={nightMap}
          emissive={"#ffcf8f"}
          emissiveIntensity={1.05}
        />
      </mesh>

      {/* Cloud layer, drifting a touch faster than the surface. */}
      <mesh ref={cloudsRef} scale={1.01}>
        <sphereGeometry args={[GLOBE_RADIUS, 64, 64]} />
        <meshStandardMaterial
          map={cloudsMap}
          transparent
          opacity={0.4}
          depthWrite={false}
        />
      </mesh>

      {/* Atmosphere: a slightly larger back-facing shell with additive glow. */}
      <mesh scale={1.16}>
        <sphereGeometry args={[GLOBE_RADIUS, 48, 48]} />
        <meshBasicMaterial
          color="#5a8bd6"
          transparent
          opacity={0.2}
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  );
}

// ---------------------------------------------------------------------------
// Static gold great-circle network linking the flagship to every campus.
// ---------------------------------------------------------------------------
function NetworkArcs() {
  const flagship = useMemo(() => getFlagship(), []);
  const geometries = useMemo(() => {
    const start = latLngToVec3(flagship.lat, flagship.lng);
    return CAMPUSES.filter((c) => c.id !== flagship.id).map((c) => {
      const end = latLngToVec3(c.lat, c.lng);
      const pts = arcCurvePoints(start, end, 48, 0.28);
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      return geo;
    });
  }, [flagship]);

  return (
    <group>
      {geometries.map((geo, i) => (
        <primitive
          key={i}
          object={
            new THREE.Line(
              geo,
              new THREE.LineBasicMaterial({
                color: GOLD,
                transparent: true,
                opacity: 0.22,
              }),
            )
          }
        />
      ))}
    </group>
  );
}

// ---------------------------------------------------------------------------
// Clickable, geolocated campus pins.
// ---------------------------------------------------------------------------
function CampusPins({
  campuses,
  selectedId,
  hoveredId,
  showCity,
  onHover,
  onSelect,
  globeRef,
}: {
  campuses: Campus[];
  selectedId: string | null;
  hoveredId: string | null;
  showCity: boolean;
  onHover: (id: string | null) => void;
  onSelect: (campus: Campus) => void;
  globeRef: React.MutableRefObject<THREE.Mesh | null>;
}) {
  return (
    <group>
      {campuses.map((campus) => {
        const pos = latLngToVec3(campus.lat, campus.lng, GLOBE_RADIUS * 1.02);
        const active = selectedId === campus.id || hoveredId === campus.id;
        // Declutter: at the wide view show just a dot; reveal the flag marker
        // when zoomed in, hovered, or selected.
        const showMarker = active || showCity;
        return (
          <group key={campus.id} position={pos}>
            {/* Larger invisible hit target (easy to tap on mobile). */}
            <mesh
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
              <sphereGeometry args={[0.06, 10, 10]} />
              <meshBasicMaterial transparent opacity={0} depthWrite={false} />
            </mesh>
            {/* Visible location dot. */}
            <mesh scale={active ? 1.9 : 1}>
              <sphereGeometry args={[0.02, 12, 12]} />
              <meshBasicMaterial color={active ? FLAME_GOLD : "#ffffff"} />
            </mesh>
            {/* Flag + city marker — constant readable size (no distance scaling),
                only shown when zoomed in / hovered / selected. */}
            {showMarker && (
              <Html
                position={[0, 0.06, 0]}
                center
                occlude={globeRef.current ? [globeRef] : undefined}
                zIndexRange={[30, 0]}
                style={{ pointerEvents: "none" }}
              >
                <div
                  className={`flex -translate-y-2 items-center gap-1 whitespace-nowrap rounded-full border px-1.5 py-0.5 shadow-lg ${
                    active
                      ? "border-keiser-gold bg-keiser-gold text-keiser-navy"
                      : "border-white/25 bg-keiser-navy/90 text-white"
                  }`}
                >
                  <img
                    src={flagSrc(campus)}
                    alt=""
                    className="h-3.5 w-5 shrink-0 rounded-[1px] object-cover ring-1 ring-black/20"
                  />
                  <span className="px-0.5 font-display text-[11px] font-semibold uppercase tracking-wide">
                    {active ? campus.name : campus.city.split(",")[0]}
                  </span>
                </div>
              </Html>
            )}
          </group>
        );
      })}
    </group>
  );
}

// ---------------------------------------------------------------------------
// FlightLayer: animates the camera + an aircraft marker + a comet trail
// along a great-circle arc whenever the selected campus changes.
// ---------------------------------------------------------------------------
function FlightLayer({
  target,
  controlsRef,
}: {
  target: Campus | null;
  controlsRef: React.MutableRefObject<OrbitControlsImpl | null>;
}) {
  const { camera } = useThree();
  const aircraftRef = useRef<THREE.Group>(null);

  // Mutable flight state kept in a ref so useFrame doesn't trigger re-renders.
  const flight = useRef({
    active: false,
    t: 0,
    fromSurface: new THREE.Vector3(),
    toSurface: new THREE.Vector3(),
    camStart: new THREE.Vector3(),
    camStartDist: ORBIT_DISTANCE,
    camEndDist: FOCUS_DISTANCE,
    lastTargetId: null as string | null,
  });

  // Pre-allocated trail geometry (positions + per-vertex colors for fade).
  const trailGeo = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute(
      "position",
      new THREE.BufferAttribute(new Float32Array((TRAIL_SEGMENTS + 1) * 3), 3),
    );
    geo.setAttribute(
      "color",
      new THREE.BufferAttribute(new Float32Array((TRAIL_SEGMENTS + 1) * 3), 3),
    );
    geo.setDrawRange(0, 0);
    return geo;
  }, []);

  const trailMat = useMemo(
    () =>
      new THREE.LineBasicMaterial({
        vertexColors: true,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    [],
  );

  // Kick off a new flight when the target campus changes.
  useEffect(() => {
    const f = flight.current;
    if (!target) {
      f.active = false;
      f.lastTargetId = null;
      trailGeo.setDrawRange(0, 0); // clear the trail on deselect
      if (aircraftRef.current) aircraftRef.current.visible = false;
      return;
    }
    if (target.id === f.lastTargetId) return;

    const toSurface = latLngToVec3(target.lat, target.lng);
    // Depart from the previous campus if we have one, else from straight under
    // the current camera (so the very first launch glides in, no pop).
    const fromSurface = f.lastTargetId
      ? f.toSurface.clone()
      : camera.position.clone().normalize().multiplyScalar(GLOBE_RADIUS);

    f.fromSurface.copy(fromSurface);
    f.toSurface.copy(toSurface);
    f.camStart.copy(camera.position);
    f.camStartDist = camera.position.length();
    f.camEndDist = FOCUS_DISTANCE;
    f.t = 0;
    f.active = true;
    f.lastTargetId = target.id;

    // Lay the full arc into the trail geometry up front; reveal it as we fly.
    const pts = arcCurvePoints(fromSurface, toSurface, TRAIL_SEGMENTS, 0.35);
    const posAttr = trailGeo.getAttribute("position") as THREE.BufferAttribute;
    for (let i = 0; i < pts.length; i++) {
      posAttr.setXYZ(i, pts[i].x, pts[i].y, pts[i].z);
    }
    posAttr.needsUpdate = true;
    trailGeo.setDrawRange(0, 0);

    if (controlsRef.current) controlsRef.current.enabled = false;
    if (aircraftRef.current) aircraftRef.current.visible = true;
  }, [target, camera, controlsRef, trailGeo]);

  useFrame((_, delta) => {
    const f = flight.current;
    if (!f.active) return;

    f.t = Math.min(1, f.t + delta / FLIGHT_SECONDS);
    const t = f.t;
    const ease = t * t * (3 - 2 * t); // smoothstep

    // --- Aircraft travels the surface arc ---
    if (aircraftRef.current) {
      const here = arcPoint(f.fromSurface, f.toSurface, t, 0.35);
      aircraftRef.current.position.copy(here);
      const ahead = arcPoint(f.fromSurface, f.toSurface, Math.min(1, t + 0.02), 0.35);
      aircraftRef.current.lookAt(ahead);
    }

    // --- Comet trail reveals + fades behind the aircraft ---
    const head = Math.floor(t * TRAIL_SEGMENTS);
    const colAttr = trailGeo.getAttribute("color") as THREE.BufferAttribute;
    for (let i = 0; i <= head; i++) {
      const age = head - i;
      const intensity = Math.max(0, 1 - age / TRAIL_FADE);
      colAttr.setXYZ(i, GOLD.r * intensity, GOLD.g * intensity, GOLD.b * intensity);
    }
    colAttr.needsUpdate = true;
    trailGeo.setDrawRange(0, head + 1);

    // --- Camera swoops along with it ---
    const startDir = f.camStart.clone().normalize();
    const endDir = f.toSurface.clone().normalize();
    const dir = startDir.lerp(endDir, ease).normalize();
    const dist =
      THREE.MathUtils.lerp(f.camStartDist, f.camEndDist, ease) + PULLBACK * Math.sin(Math.PI * t);
    camera.position.copy(dir.multiplyScalar(dist));
    camera.lookAt(0, 0, 0);

    if (t >= 1) {
      f.active = false;
      if (aircraftRef.current) aircraftRef.current.visible = false;
      if (controlsRef.current) {
        controlsRef.current.target.set(0, 0, 0);
        controlsRef.current.enabled = true;
        controlsRef.current.update();
      }
    }
  });

  return (
    <group>
      {/* Aircraft marker: a glowing cone + pulsing halo. */}
      <group ref={aircraftRef} visible={false}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.045, 0.13, 12]} />
          <meshBasicMaterial color="#fff4d6" />
        </mesh>
        <mesh>
          <sphereGeometry args={[0.09, 12, 12]} />
          <meshBasicMaterial
            color={FLAME_GOLD}
            transparent
            opacity={0.3}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      </group>
      <primitive object={new THREE.Line(trailGeo, trailMat)} />
    </group>
  );
}

// ---------------------------------------------------------------------------
// Stylized 3D campus scene shown when a prospect "enters" a campus.
// ---------------------------------------------------------------------------
function CampusScene({ campus }: { campus: Campus }) {
  const buildings = useMemo(() => {
    const items: Array<{ x: number; z: number; h: number; w: number }> = [];
    const count = campus.skyline.length;
    const ring = 2.4;
    campus.skyline.forEach((h, i) => {
      const angle = (i / count) * Math.PI * 2;
      items.push({
        x: Math.cos(angle) * ring,
        z: Math.sin(angle) * ring,
        h: 0.6 + h * 2.4,
        w: 0.7,
      });
    });
    return items;
  }, [campus]);

  const flameRef = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (flameRef.current) {
      flameRef.current.rotation.y = state.clock.elapsedTime * 0.6;
      flameRef.current.position.y = 1.4 + Math.sin(state.clock.elapsedTime * 2) * 0.04;
    }
  });

  // Real campus photo, shown on a billboard "sign" when one is present.
  // Prefers the secondary photo so the panel hero and billboard can differ.
  const photo = useOptionalTexture(campusPhotoSrc(campus, true));

  return (
    <group>
      <ambientLight intensity={0.5} />
      <directionalLight position={[6, 10, 4]} intensity={1.1} castShadow />
      {/* Ground plaza */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <circleGeometry args={[6, 48]} />
        <meshStandardMaterial color="#16223f" roughness={1} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <ringGeometry args={[1.0, 1.15, 48]} />
        <meshBasicMaterial color={FLAME_GOLD} transparent opacity={0.5} />
      </mesh>

      {/* Buildings */}
      {buildings.map((b, i) => (
        <mesh key={i} position={[b.x, b.h / 2, b.z]} castShadow>
          <boxGeometry args={[b.w, b.h, b.w]} />
          <meshStandardMaterial
            color={i % 3 === 0 ? "#1d2e57" : "#24407a"}
            roughness={0.6}
            metalness={0.2}
          />
        </mesh>
      ))}

      {/* Central Keiser "flame" monument */}
      <mesh ref={flameRef} position={[0, 1.4, 0]}>
        <coneGeometry args={[0.35, 1.0, 5]} />
        <meshStandardMaterial
          color={FLAME_GOLD}
          emissive={FLAME_GOLD}
          emissiveIntensity={0.6}
          roughness={0.3}
        />
      </mesh>
      <mesh position={[0, 0.45, 0]}>
        <cylinderGeometry args={[0.45, 0.55, 0.9, 6]} />
        <meshStandardMaterial color="#0e1a36" roughness={0.8} />
      </mesh>

      {/* Trees */}
      {Array.from({ length: 10 }).map((_, i) => {
        const a = (i / 10) * Math.PI * 2 + 0.3;
        const r = 4.1;
        return (
          <group key={i} position={[Math.cos(a) * r, 0, Math.sin(a) * r]}>
            <mesh position={[0, 0.35, 0]}>
              <cylinderGeometry args={[0.05, 0.07, 0.7, 6]} />
              <meshStandardMaterial color="#3a2b1a" />
            </mesh>
            <mesh position={[0, 0.85, 0]}>
              <sphereGeometry args={[0.32, 10, 10]} />
              <meshStandardMaterial color="#2f6b3f" roughness={1} />
            </mesh>
          </group>
        );
      })}

      {/* Real campus photo on a raised billboard (only when a photo exists). */}
      {photo && (
        <group position={[0, 1.9, -3.6]}>
          {/* Posts */}
          <mesh position={[-1.7, -0.7, 0]}>
            <cylinderGeometry args={[0.07, 0.07, 2.6, 8]} />
            <meshStandardMaterial color="#0e1a36" />
          </mesh>
          <mesh position={[1.7, -0.7, 0]}>
            <cylinderGeometry args={[0.07, 0.07, 2.6, 8]} />
            <meshStandardMaterial color="#0e1a36" />
          </mesh>
          {/* Gold frame + photo */}
          <mesh position={[0, 0, -0.03]}>
            <planeGeometry args={[3.9, 2.3]} />
            <meshBasicMaterial color={FLAME_GOLD} />
          </mesh>
          <mesh>
            <planeGeometry args={[3.7, 2.1]} />
            <meshBasicMaterial map={photo} toneMapped={false} />
          </mesh>
        </group>
      )}
    </group>
  );
}

// ---------------------------------------------------------------------------
// Globe scene wrapper (everything shown in "drone" mode).
// ---------------------------------------------------------------------------
function GlobeScene({
  campuses,
  selectedId,
  hoveredId,
  target,
  controlsRef,
  onHover,
  onSelect,
}: {
  campuses: Campus[];
  selectedId: string | null;
  hoveredId: string | null;
  target: Campus | null;
  controlsRef: React.MutableRefObject<OrbitControlsImpl | null>;
  onHover: (id: string | null) => void;
  onSelect: (campus: Campus) => void;
}) {
  const globeRef = useRef<THREE.Mesh | null>(null);
  const groupRef = useRef<THREE.Group>(null);
  const { camera } = useThree();
  // Reveal city labels once the camera dollies in past this distance.
  const [zoomedIn, setZoomedIn] = useState(false);

  useFrame((_, delta) => {
    // Idle auto-rotation when nothing is selected (the "drone hover" feel).
    if (!selectedId && groupRef.current) {
      groupRef.current.rotation.y += delta * 0.04;
    }
    // Toggle city labels on zoom (only set state when the threshold is crossed).
    const near = camera.position.length() < 5;
    if (near !== zoomedIn) setZoomedIn(near);
  });

  return (
    <>
      {/* Low ambient so the night side goes dark and the city lights glow;
          a bright "sun" gives the terminator + ocean glint. */}
      <ambientLight intensity={0.18} />
      <directionalLight position={[6, 2, 4]} intensity={2.1} />
      <Stars radius={120} depth={60} count={4000} factor={4} saturation={0} fade speed={0.6} />
      <group ref={groupRef}>
        <Globe globeRef={globeRef} />
        <NetworkArcs />
        <CampusPins
          campuses={campuses}
          selectedId={selectedId}
          hoveredId={hoveredId}
          showCity={zoomedIn}
          onHover={onHover}
          onSelect={onSelect}
          globeRef={globeRef}
        />
      </group>
      <FlightLayer target={target} controlsRef={controlsRef} />
    </>
  );
}

// ===========================================================================
// Page component + 2D admissions UI overlay.
// ===========================================================================
export default function CampusMap() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [regionFilter, setRegionFilter] = useState<CampusRegion | "All">("All");
  const [inTour, setInTour] = useState(false); // inside a 3D campus scene
  const [tourPlaying, setTourPlaying] = useState(false); // guided auto-tour
  const [narrate, setNarrate] = useState(speechSupported()); // spoken tour guide
  const [listOpen, setListOpen] = useState(false); // mobile campus-list drawer
  const [aiOpen, setAiOpen] = useState(false); // AI concierge panel
  const [leadOpen, setLeadOpen] = useState(false); // "Request info" inquiry modal
  const controlsRef = useRef<OrbitControlsImpl | null>(null);

  const visibleCampuses = useMemo(
    () => (regionFilter === "All" ? CAMPUSES : CAMPUSES.filter((c) => c.region === regionFilter)),
    [regionFilter],
  );

  const selected = useMemo(
    () => CAMPUSES.find((c) => c.id === selectedId) ?? null,
    [selectedId],
  );

  // The tour walks the full roster in dataset order regardless of filter.
  const tourOrder = CAMPUSES;
  const tourIndex = selectedId ? tourOrder.findIndex((c) => c.id === selectedId) : -1;

  // --- selection -----------------------------------------------------------
  function handleSelect(campus: Campus) {
    setSelectedId(campus.id);
    setInTour(false);
  }

  // A user-initiated pin/list click should stop the guided tour so they don't
  // fight for control of the camera.
  function handleManualSelect(campus: Campus) {
    setTourPlaying(false);
    setListOpen(false); // close the mobile drawer after picking
    handleSelect(campus);
  }

  function closePanel() {
    setTourPlaying(false);
    setInTour(false);
    setSelectedId(null);
    stopSpeaking();
  }

  // --- guided tour ---------------------------------------------------------
  function startTour() {
    setInTour(false);
    setTourPlaying(true);
    // Begin from the current campus, or the first one.
    if (!selectedId) handleSelect(tourOrder[0]);
  }

  function stopTour() {
    setTourPlaying(false);
  }

  // The spoken tour guide: when a campus settles, read its intro aloud. The
  // short delay lets the camera land first so narration matches the arrival.
  useEffect(() => {
    if (!narrate || !selected) {
      stopSpeaking();
      return;
    }
    const handle = window.setTimeout(() => {
      speak(`${selected.name}. ${selected.tagline} ${selected.description}`);
    }, 1100);
    return () => window.clearTimeout(handle);
  }, [selected, narrate]);

  function toggleNarration() {
    setNarrate((on) => {
      if (on) stopSpeaking();
      return !on;
    });
  }

  function goToTourIndex(idx: number) {
    const next = (idx + tourOrder.length) % tourOrder.length;
    handleSelect(tourOrder[next]);
  }

  function tourNext() {
    goToTourIndex((tourIndex < 0 ? -1 : tourIndex) + 1);
  }

  function tourPrev() {
    goToTourIndex((tourIndex < 0 ? 0 : tourIndex) - 1);
  }

  // Auto-advance while the guided tour is playing (and not inside a 3D scene).
  useEffect(() => {
    if (!tourPlaying || inTour) return;
    const handle = window.setTimeout(() => {
      goToTourIndex((tourIndex < 0 ? -1 : tourIndex) + 1);
    }, TOUR_DWELL_MS);
    return () => window.clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tourPlaying, inTour, tourIndex]);

  // Entering a 3D campus scene yields camera control, so pause the tour.
  function enterTour() {
    setTourPlaying(false);
    setInTour(true);
  }

  // The AI concierge recommends campuses; fly to the first match.
  function handleConciergeFocus(ids: string[]) {
    const first = CAMPUSES.find((c) => c.id === ids[0]);
    if (!first) return;
    setTourPlaying(false);
    setInTour(false);
    handleSelect(first);
  }

  const subtitle = tourPlaying
    ? `Guided tour · ${selected ? selected.name : "starting…"}`
    : inTour && selected
      ? `3D tour · ${selected.name}`
      : "Drag to orbit · scroll to zoom · click a campus to fly in";

  // When showing the real Google 3D tiles, swap the whole globe canvas out for
  // the tiles canvas — never mount both WebGL contexts at once (that caused
  // "Context Lost"). The stylized fallback still lives inside the globe canvas.
  const tilesTour = Boolean(inTour && selected && TILES_ENABLED);

  return (
    <div className="relative h-full w-full overflow-hidden bg-keiser-navy">
      {/* ---- 3D canvas (globe / stylized scene) — hidden during a tiles tour ---- */}
      {!tilesTour && (
        <Canvas
          camera={{ position: [0, 1.6, ORBIT_DISTANCE], fov: 45 }}
          gl={{ antialias: true }}
          dpr={[1, 2]}
        >
          <color attach="background" args={["#0b1c33"]} />
          {inTour && selected ? (
            <>
              <Stars radius={80} depth={40} count={1500} factor={3} fade speed={0.4} />
              <CampusScene campus={selected} />
              <OrbitControls
                makeDefault
                enablePan={false}
                minDistance={4}
                maxDistance={12}
                maxPolarAngle={Math.PI / 2.1}
              />
            </>
          ) : (
            <Suspense fallback={null}>
              <GlobeScene
                campuses={visibleCampuses}
                selectedId={selectedId}
                hoveredId={hoveredId}
                target={selected}
                controlsRef={controlsRef}
                onHover={setHoveredId}
                onSelect={handleManualSelect}
              />
              <OrbitControls
                ref={controlsRef}
                makeDefault
                enablePan={false}
                minDistance={2.6}
                maxDistance={9}
                rotateSpeed={0.5}
              />
            </Suspense>
          )}
        </Canvas>
      )}

      {/* ---- Real Google 3D tiles / Street View (replaces the globe canvas) ---- */}
      {tilesTour && selected && <TourViewer key={selected.id} campus={selected} />}

      {/* ---- AI concierge chat ---- */}
      {AI_ENABLED && aiOpen && (
        <Suspense fallback={null}>
          <AIConcierge onFocus={handleConciergeFocus} onClose={() => setAiOpen(false)} />
        </Suspense>
      )}

      {/* ---- Admissions inquiry modal ---- */}
      {leadOpen && (
        <Suspense fallback={null}>
          <LeadForm campus={selected} onClose={() => setLeadOpen(false)} />
        </Suspense>
      )}

      {/* ---- Top bar ---- */}
      <header className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-3 sm:p-6">
        <div className="pointer-events-auto min-w-0">
          <BrandLogo />
          <p className="mt-1 hidden max-w-md text-xs text-slate-300/80 sm:block sm:text-sm">
            {subtitle}
          </p>
        </div>

        <div className="pointer-events-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
          {/* Campuses drawer toggle (mobile only) */}
          {!inTour && (
            <button
              onClick={() => setListOpen((v) => !v)}
              aria-label="Browse campuses"
              className="flex items-center rounded-full border border-keiser-gold/40 bg-keiser-navy/70 p-2 text-keiser-gold backdrop-blur transition hover:bg-keiser-gold/15 sm:hidden"
            >
              <ListIcon />
            </button>
          )}

          {/* Narration toggle (spoken tour guide) */}
          {speechSupported() && (
            <button
              onClick={toggleNarration}
              aria-pressed={narrate}
              title={narrate ? "Narration on" : "Narration off"}
              className={`flex items-center gap-2 rounded-full border p-2 text-sm font-semibold backdrop-blur transition sm:px-3 ${
                narrate
                  ? "border-keiser-gold/60 bg-keiser-gold/15 text-keiser-gold"
                  : "border-white/20 bg-keiser-navy/70 text-slate-300 hover:bg-white/10"
              }`}
            >
              {narrate ? <SpeakerIcon /> : <MuteIcon />}
              <span className="hidden sm:inline">{narrate ? "Voice on" : "Voice off"}</span>
            </button>
          )}

          {/* Guided-tour toggle */}
          <button
            onClick={tourPlaying ? stopTour : startTour}
            className="flex items-center gap-2 rounded-full border border-keiser-gold/40 bg-keiser-navy/70 p-2 text-sm font-semibold text-keiser-gold backdrop-blur transition hover:bg-keiser-gold/15 sm:px-4"
          >
            {tourPlaying ? <PauseIcon /> : <PlayIcon />}
            <span className="hidden sm:inline">{tourPlaying ? "Pause tour" : "Guided tour"}</span>
          </button>

          {/* AI concierge toggle */}
          {AI_ENABLED && (
            <button
              onClick={() => setAiOpen((v) => !v)}
              aria-pressed={aiOpen}
              className={`flex items-center gap-2 rounded-full border p-2 text-sm font-semibold backdrop-blur transition sm:px-4 ${
                aiOpen
                  ? "border-keiser-gold bg-keiser-gold/15 text-keiser-gold"
                  : "border-keiser-gold/40 bg-keiser-navy/70 text-keiser-gold hover:bg-keiser-gold/15"
              }`}
            >
              <GuideSparkleIcon />
              <span className="hidden sm:inline">Ask the guide</span>
            </button>
          )}
        </div>
      </header>

      {/* ---- Region filter + campus list (left rail; drawer on mobile) ---- */}
      {!inTour && listOpen && (
        <button
          aria-label="Close campus list"
          onClick={() => setListOpen(false)}
          className="absolute inset-0 z-20 bg-black/50 sm:hidden"
        />
      )}
      {!inTour && (
        <aside
          className={`absolute bottom-24 left-3 top-20 z-30 w-64 flex-col gap-3 sm:bottom-28 sm:left-6 sm:top-24 sm:flex ${
            listOpen ? "flex" : "hidden"
          }`}
        >
          <div className="flex flex-wrap gap-1.5">
            {(["All", ...REGIONS] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRegionFilter(r)}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                  regionFilter === r
                    ? "bg-keiser-gold text-keiser-navy"
                    : "border border-white/15 bg-white/5 text-slate-200 hover:bg-white/10"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
          <div className="scroll-slim flex-1 space-y-1.5 overflow-y-auto pr-1">
            {visibleCampuses.map((campus) => (
              <button
                key={campus.id}
                onClick={() => handleManualSelect(campus)}
                onMouseEnter={() => setHoveredId(campus.id)}
                onMouseLeave={() => setHoveredId(null)}
                className={`w-full rounded-lg border px-3 py-2 text-left transition ${
                  selectedId === campus.id
                    ? "border-keiser-gold/70 bg-keiser-gold/15"
                    : "border-white/10 bg-white/5 hover:border-keiser-gold/40 hover:bg-white/10"
                }`}
              >
                <div className="flex items-center gap-1.5">
                  {campus.flagship && <StarIcon />}
                  <span className="text-sm font-semibold text-white">{campus.name}</span>
                </div>
                <span className="text-[11px] text-slate-300/70">{campus.city}</span>
              </button>
            ))}
          </div>
        </aside>
      )}

      {/* ---- Campus info / admissions panel (right) ---- */}
      {selected && !inTour && (
        <section className="absolute right-4 top-24 bottom-28 w-[min(92vw,22rem)] animate-fade-in sm:right-6">
          <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-keiser-gold/30 bg-keiser-navy/85 shadow-2xl backdrop-blur-md">
            <CampusHero key={selected.id} campus={selected} onClose={closePanel} />

            <div className="scroll-slim flex-1 space-y-4 overflow-y-auto p-5">
              <p className="text-sm leading-relaxed text-slate-200/90">{selected.description}</p>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <Fact label="Established" value={selected.established} />
                <Fact label="Setting" value={selected.setting} />
              </div>

              <div>
                <h3 className="mb-1.5 text-xs font-bold uppercase tracking-wider text-keiser-gold/80">
                  Signature programs
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {selected.programs.map((p) => (
                    <span
                      key={p}
                      className="rounded-full border border-keiser-gold/30 bg-keiser-gold/10 px-2.5 py-1 text-[11px] font-medium text-keiser-gold"
                    >
                      {p}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="mb-1.5 text-xs font-bold uppercase tracking-wider text-keiser-gold/80">
                  Campus highlights
                </h3>
                <ul className="space-y-1.5">
                  {selected.highlights.map((h) => (
                    <li key={h} className="flex items-start gap-2 text-sm text-slate-200/90">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-keiser-gold" />
                      {h}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="space-y-2 border-t border-white/10 p-4">
              <button
                onClick={enterTour}
                className="w-full rounded-xl bg-keiser-gold py-3 text-sm font-bold text-keiser-navy transition hover:bg-keiser-flame"
              >
                Enter 3D campus tour →
              </button>
              <button
                onClick={() => setLeadOpen(true)}
                className="w-full rounded-xl border border-keiser-gold/50 py-3 text-sm font-bold text-keiser-gold transition hover:bg-keiser-gold/15"
              >
                Request info →
              </button>
              {selected.virtualTour && (
                <a
                  href={selected.virtualTour}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-keiser-gold/50 py-3 text-sm font-bold text-keiser-gold transition hover:bg-keiser-gold/15"
                >
                  Take the virtual tour ↗
                </a>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ---- In-tour back button ---- */}
      {inTour && selected && (
        <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 gap-3">
          <button
            onClick={() => setInTour(false)}
            className="rounded-full border border-keiser-gold/40 bg-keiser-navy/80 px-5 py-2.5 text-sm font-semibold text-keiser-gold backdrop-blur transition hover:bg-keiser-gold/15"
          >
            ← Back to globe
          </button>
          <button
            onClick={() => setLeadOpen(true)}
            className="rounded-full bg-keiser-gold px-5 py-2.5 text-sm font-bold text-keiser-navy transition hover:bg-keiser-flame"
          >
            Request info →
          </button>
        </div>
      )}

      {/* ---- Guided-tour progress indicator (bottom center) ---- */}
      {tourPlaying && !inTour && (
        <div className="absolute bottom-6 left-1/2 w-[min(92vw,30rem)] -translate-x-1/2 animate-fade-in">
          <div className="rounded-2xl border border-keiser-gold/30 bg-keiser-navy/85 px-4 py-3 shadow-2xl backdrop-blur-md">
            <div className="flex items-center justify-between gap-3">
              <button
                onClick={tourPrev}
                className="rounded-full bg-white/10 p-2 text-keiser-gold transition hover:bg-white/20"
                aria-label="Previous campus"
              >
                <PrevIcon />
              </button>

              <div className="min-w-0 flex-1 text-center">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-keiser-gold/70">
                  Guided tour · {Math.max(1, tourIndex + 1)} / {tourOrder.length}
                </div>
                <div className="truncate text-sm font-bold text-white">
                  {selected ? selected.name : "Starting…"}
                </div>
              </div>

              <button
                onClick={tourNext}
                className="rounded-full bg-white/10 p-2 text-keiser-gold transition hover:bg-white/20"
                aria-label="Next campus"
              >
                <NextIcon />
              </button>
            </div>

            {/* Progress dots */}
            <div className="mt-2.5 flex items-center justify-center gap-1">
              {tourOrder.map((c, i) => (
                <button
                  key={c.id}
                  onClick={() => goToTourIndex(i)}
                  aria-label={`Go to ${c.name}`}
                  className={`h-1.5 rounded-full transition-all ${
                    i === tourIndex ? "w-5 bg-keiser-gold" : "w-1.5 bg-white/25 hover:bg-white/50"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tour viewer: the photoreal aerial 3D tiles by default, with a Street View
// toggle wherever Google has ground-level imagery near the campus. Keyed by
// campus id in the parent, so it remounts (and resets to aerial) per campus —
// and only one of the two views (WebGL canvas vs. iframe) is ever mounted.
// ---------------------------------------------------------------------------
function TourViewer({ campus }: { campus: Campus }) {
  const [mode, setMode] = useState<"aerial" | "street">("aerial");
  const streetAvailable = useStreetViewAvailable(campus);

  return (
    <>
      {mode === "aerial" ? (
        <Suspense fallback={null}>
          <CampusTilesOverlay campus={campus} />
        </Suspense>
      ) : (
        <CampusStreetView campus={campus} />
      )}

      {/* View switch — only shown where Street View imagery actually exists. */}
      {streetAvailable && (
        <div className="absolute left-1/2 top-20 z-30 flex -translate-x-1/2 gap-1 rounded-full border border-keiser-gold/30 bg-keiser-navy/80 p-1 shadow-2xl backdrop-blur sm:top-24">
          <ViewTab active={mode === "aerial"} onClick={() => setMode("aerial")}>
            Aerial 3D
          </ViewTab>
          <ViewTab active={mode === "street"} onClick={() => setMode("street")}>
            Street View
          </ViewTab>
        </div>
      )}
    </>
  );
}

function ViewTab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition sm:text-sm ${
        active ? "bg-keiser-gold text-keiser-navy" : "text-slate-200 hover:bg-white/10"
      }`}
    >
      {children}
    </button>
  );
}

// Ground-level Google Street View panorama at the campus's resolved location,
// via the Maps Embed API (no extra JS bundle). Light enough to live here.
function CampusStreetView({ campus }: { campus: Campus }) {
  const { lat, lng } = useResolvedLatLng(campus);
  const src = `https://www.google.com/maps/embed/v1/streetview?key=${GOOGLE_KEY}&location=${lat},${lng}&heading=0&pitch=2&fov=80`;
  return (
    <div className="absolute inset-0 bg-keiser-navy">
      <iframe
        key={`${lat},${lng}`}
        title={`${campus.name} — Street View`}
        src={src}
        className="h-full w-full border-0"
        allowFullScreen
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      />
    </div>
  );
}

// ---- Campus panel hero: real photo when available, gradient fallback -------
function CampusHero({ campus, onClose }: { campus: Campus; onClose: () => void }) {
  // The hero shows the primary photo (explicit `photo` or the `<id>.jpg`
  // convention) plus any `gallery` images, auto-rotating between them. If
  // images are missing it falls back to the brand gradient, so the panel
  // always looks intentional. (Parent keys this by campus id, so state resets
  // per campus.)
  const images = useMemo(
    () => [campusPhotoSrc(campus), ...(campus.gallery ?? []).map((g) => asset(g))],
    [campus],
  );
  const [idx, setIdx] = useState(0);
  const [hasPhoto, setHasPhoto] = useState(true);

  useEffect(() => {
    if (images.length < 2) return;
    const handle = window.setInterval(() => setIdx((i) => (i + 1) % images.length), 4500);
    return () => window.clearInterval(handle);
  }, [images]);

  const src = images[idx];

  return (
    <div className="relative min-h-[8.5rem] overflow-hidden bg-gradient-to-br from-keiser-blue to-keiser-navy p-5">
      {hasPhoto && (
        <img
          key={src}
          src={src}
          alt={`${campus.name} campus`}
          onError={() => idx === 0 && setHasPhoto(false)}
          className="absolute inset-0 h-full w-full animate-fade-in object-cover"
        />
      )}
      {/* Dark overlay keeps text legible over any photo. */}
      <div className="absolute inset-0 bg-gradient-to-t from-keiser-navy via-keiser-navy/55 to-keiser-navy/10" />

      <div className="relative">
        <button
          onClick={onClose}
          className="absolute right-0 top-0 rounded-full bg-black/40 p-1.5 text-slate-100 transition hover:bg-black/60"
          aria-label="Close"
        >
          <CloseIcon />
        </button>
        <span className="text-[11px] font-semibold uppercase tracking-wider text-keiser-gold">
          {campus.region}
        </span>
        <h2 className="mt-1 font-display text-2xl font-bold uppercase tracking-wide text-white drop-shadow">
          {campus.name}
        </h2>
        <p className="text-sm text-slate-200 drop-shadow">{campus.city}</p>
        <p className="mt-2 text-sm italic text-keiser-gold drop-shadow">“{campus.tagline}”</p>

        {/* Gallery dots */}
        {hasPhoto && images.length > 1 && (
          <div className="mt-3 flex gap-1.5">
            {images.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i === idx ? "w-4 bg-keiser-gold" : "w-1.5 bg-white/40"
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ---- Brand wordmark: official logo on a white plate, text fallback ----------
function BrandLogo() {
  const [ok, setOk] = useState(true);
  return ok ? (
    <div className="inline-flex items-center rounded-lg bg-white/95 px-2.5 py-1 shadow-md ring-1 ring-black/5">
      <img
        src={asset("brand/wordmark.png")}
        onError={() => setOk(false)}
        alt="Keiser University"
        className="h-6 w-auto sm:h-9"
      />
    </div>
  ) : (
    <div className="flex items-center gap-2">
      <img src={asset("globe.svg")} alt="" className="h-6 w-6 sm:h-7 sm:w-7" />
      <span className="font-display text-base font-bold uppercase tracking-wide text-keiser-gold sm:text-2xl">
        Keiser University
      </span>
    </div>
  );
}

// ---- Small presentational helpers -----------------------------------------
function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
        {label}
      </div>
      <div className="mt-0.5 text-xs font-medium text-white">{value}</div>
    </div>
  );
}

// ---- Inline icons (no extra dependency) -----------------------------------
function PlayIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}
function ListIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}
function GuideSparkleIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2l1.7 4.9L18.5 8l-4.8 1.1L12 14l-1.7-4.9L5.5 8l4.8-1.1z" />
      <path d="M18.5 13l.9 2.4 2.4.9-2.4.9-.9 2.4-.9-2.4L15.2 16l2.4-.9z" />
    </svg>
  );
}
function SpeakerIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
      <path d="M3 10v4h4l5 5V5L7 10H3z" />
      <path d="M16 8a5 5 0 0 1 0 8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M18.5 5.5a8.5 8.5 0 0 1 0 13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
function MuteIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
      <path d="M3 10v4h4l5 5V5L7 10H3z" />
      <path d="M16 9l5 6M21 9l-5 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
function PauseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M6 5h4v14H6zM14 5h4v14h-4z" />
    </svg>
  );
}
function PrevIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M6 5h2v14H6zM20 5v14l-11-7z" />
    </svg>
  );
}
function NextIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M16 5h2v14h-2zM4 5l11 7-11 7z" />
    </svg>
  );
}
function StarIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill={FLAME_GOLD}>
      <path d="M12 2l2.9 6.3 6.9.7-5.2 4.6 1.5 6.8L12 17.8 5.9 20.4l1.5-6.8L2.2 9l6.9-.7z" />
    </svg>
  );
}
function CloseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
    </svg>
  );
}
