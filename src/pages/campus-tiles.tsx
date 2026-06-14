import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { Html, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { TilesAttributionOverlay, TilesPlugin, TilesRenderer } from "3d-tiles-renderer/r3f";
import {
  GoogleCloudAuthPlugin,
  ReorientationPlugin,
  TilesFadePlugin,
} from "3d-tiles-renderer/plugins";
import type { Campus } from "../lib/campus-data";
import { GOOGLE_KEY, TILES_ENABLED, useResolvedLatLng } from "../lib/campus-location";

export { TILES_ENABLED };

// Google Photorealistic 3D Tiles, recentered so the campus sits at the origin
// (ENU frame, +Y up) for a simple orbit-around-the-campus camera.
function Tiles({ lat, lng, reKey }: { lat: number; lng: number; reKey: string }) {
  const latR = THREE.MathUtils.degToRad(lat);
  const lonR = THREE.MathUtils.degToRad(lng);
  return (
    <TilesRenderer key={reKey}>
      <TilesPlugin plugin={GoogleCloudAuthPlugin} args={[{ apiToken: GOOGLE_KEY, autoRefreshToken: true }]} />
      <TilesPlugin plugin={ReorientationPlugin} args={[{ lat: latR, lon: lonR, up: "+y", recenter: true }]} />
      <TilesPlugin plugin={TilesFadePlugin} />
      <TilesAttributionOverlay />
    </TilesRenderer>
  );
}

/**
 * Full-screen overlay that renders real Google Photorealistic 3D tiles of a
 * campus's actual location. Lives in its own Canvas (meters-scale) so it's
 * isolated from the globe's unit-scale camera.
 */
export default function CampusTilesOverlay({ campus }: { campus: Campus }) {
  const { lat, lng } = useResolvedLatLng(campus);
  return (
    <Canvas
      className="absolute inset-0"
      camera={{ position: [0, 320, 620], near: 1, far: 1e7, fov: 55 }}
      gl={{ antialias: true, logarithmicDepthBuffer: true }}
      dpr={[1, 2]}
    >
      <color attach="background" args={["#0b1c33"]} />
      <hemisphereLight intensity={1.0} />
      <ambientLight intensity={0.5} />
      <directionalLight position={[500, 800, 400]} intensity={1.6} />
      <Suspense
        fallback={
          <Html center>
            <div className="rounded-full bg-keiser-navy/85 px-3 py-1.5 text-xs font-semibold text-keiser-gold">
              Loading 3D campus…
            </div>
          </Html>
        }
      >
        {/* Re-key on resolved coords so the tileset recenters once geocoding lands. */}
        <Tiles lat={lat} lng={lng} reKey={`${campus.id}:${lat.toFixed(5)},${lng.toFixed(5)}`} />
      </Suspense>
      <OrbitControls
        makeDefault
        target={[0, 30, 0]}
        minDistance={120}
        maxDistance={6000}
        maxPolarAngle={Math.PI / 2.05}
      />
    </Canvas>
  );
}
