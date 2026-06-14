import { Suspense, useEffect, useState } from "react";
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

// Client-side Google Maps Platform key (Map Tiles API). Must be HTTP-referrer
// restricted in the Google Cloud console, since it ships in the bundle.
const GOOGLE_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;

/** True when a Google key is configured at build time. */
export const TILES_ENABLED = Boolean(GOOGLE_KEY);

// Verified precise coordinates (campus id → [lat, lng]). These render exactly
// even without the Geocoding API enabled.
const PRECISE: Record<string, [number, number]> = {
  flagship: [26.7156, -80.1105], // 2600 N Military Trail, West Palm Beach
  "fort-lauderdale": [26.186, -80.1638], // 1500 NW 49th St
  orlando: [28.5389, -81.3117], // 5600 Lake Underhill Rd
  jacksonville: [30.259, -81.6028], // 6430 Southpoint Pkwy
  sarasota: [27.3845, -82.4459], // 6151 Lake Osprey Dr, Lakewood Ranch
  daytona: [29.2045, -81.0745], // 1800 Business Park Blvd
  lakeland: [28.0765, -81.9806], // 2400 Interstate Dr
};

// Real street addresses for the remaining campuses — geocoded on demand (and
// cached) to land the camera on the actual building. Falls back to "<name>,
// <city>" for any campus not listed here.
const ADDRESSES: Record<string, string> = {
  tampa: "5002 W Waters Ave, Tampa, FL 33634",
  miami: "2101 NW 117th Ave, Miami, FL 33172",
  tallahassee: "1700 Halstead Blvd, Tallahassee, FL 32309",
  melbourne: "900 S Babcock St, Melbourne, FL 32901",
  naples: "3909 Tamiami Trail E, Naples, FL 34112",
  "port-st-lucie": "9400 SW Discovery Way, Port St. Lucie, FL 34987",
  "west-palm-beach": "2085 Vista Pkwy, West Palm Beach, FL 33411",
  "e-campus": "1900 W Commercial Blvd, Fort Lauderdale, FL 33309",
};

async function geocode(query: string, key: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
      query,
    )}&key=${key}`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.status === "OK" && data.results?.[0]?.geometry?.location) {
      return data.results[0].geometry.location;
    }
  } catch {
    /* ignore — fall back to static coords */
  }
  return null;
}

/** Resolve a campus's lat/lng: verified precise coords → cached geocode →
 *  live geocode of its address → the static coords from the dataset. */
function useResolvedLatLng(campus: Campus): { lat: number; lng: number } {
  const [loc, setLoc] = useState<{ lat: number; lng: number }>(() => {
    const p = PRECISE[campus.id];
    return p ? { lat: p[0], lng: p[1] } : { lat: campus.lat, lng: campus.lng };
  });

  useEffect(() => {
    const p = PRECISE[campus.id];
    if (p) {
      setLoc({ lat: p[0], lng: p[1] });
      return;
    }
    setLoc({ lat: campus.lat, lng: campus.lng });

    const cacheKey = `kcg-geo-${campus.id}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      try {
        setLoc(JSON.parse(cached));
        return;
      } catch {
        /* refetch */
      }
    }
    if (!GOOGLE_KEY) return;

    let alive = true;
    const query = ADDRESSES[campus.id] ?? `${campus.name}, ${campus.city}`;
    geocode(query, GOOGLE_KEY).then((r) => {
      if (r && alive) {
        setLoc(r);
        try {
          localStorage.setItem(cacheKey, JSON.stringify(r));
        } catch {
          /* storage full / disabled — fine */
        }
      }
    });
    return () => {
      alive = false;
    };
  }, [campus.id, campus.lat, campus.lng, campus.name, campus.city]);

  return loc;
}

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
