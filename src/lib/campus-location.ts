// Shared campus → lat/lng resolution (no Three.js, so it stays out of the heavy
// 3D-tiles chunk). Used by both the photoreal tiles tour and the Street View.

import { useEffect, useState } from "react";
import type { Campus } from "./campus-data";

// Client-side Google Maps Platform key. Must be HTTP-referrer restricted in the
// Google Cloud console, since it ships in the bundle. Vite exposes
// `VITE_GOOGLE_MAPS_API_KEY`; `GOOGLE_MAPS_API_KEY` is also accepted.
const rawGoogleKey =
  (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined) ??
  (import.meta.env.GOOGLE_MAPS_API_KEY as string | undefined);
export const GOOGLE_KEY = rawGoogleKey?.trim() || undefined;

/** True when a Google key is configured at build time. */
export const TILES_ENABLED = Boolean(GOOGLE_KEY);

/** Immediate campus coordinates: verified precise pin, else catalog lat/lng. */
export function campusLatLng(campus: Campus): { lat: number; lng: number } {
  const p = PRECISE[campus.id];
  return p ? { lat: p[0], lng: p[1] } : { lat: campus.lat, lng: campus.lng };
}

const resolvedCache = new Map<string, { lat: number; lng: number }>();

function cacheKey(campusId: string): string {
  return `kcg-geo-${campusId}`;
}

function readStoredLatLng(campusId: string): { lat: number; lng: number } | null {
  try {
    const cached = localStorage.getItem(cacheKey(campusId));
    if (!cached) return null;
    const parsed = JSON.parse(cached) as { lat?: number; lng?: number };
    if (typeof parsed.lat === "number" && typeof parsed.lng === "number") return parsed as { lat: number; lng: number };
  } catch {
    /* ignore */
  }
  return null;
}

function writeStoredLatLng(campusId: string, loc: { lat: number; lng: number }): void {
  try {
    localStorage.setItem(cacheKey(campusId), JSON.stringify(loc));
  } catch {
    /* storage full / disabled */
  }
}

/**
 * Best available campus lat/lng for camera / markers: precise pin → cached
 * geocode → live geocode of the street address → catalog coordinates.
 */
export async function resolveCampusLatLng(campus: Campus): Promise<{ lat: number; lng: number }> {
  const precise = PRECISE[campus.id];
  if (precise) return { lat: precise[0], lng: precise[1] };

  const memo = resolvedCache.get(campus.id);
  if (memo) return memo;

  const stored = typeof localStorage !== "undefined" ? readStoredLatLng(campus.id) : null;
  if (stored) {
    resolvedCache.set(campus.id, stored);
    return stored;
  }

  const fallback = { lat: campus.lat, lng: campus.lng };
  if (!GOOGLE_KEY) return fallback;

  const query = ADDRESSES[campus.id] ?? campus.address ?? `${campus.name}, ${campus.city}`;
  const loc = await geocode(query, GOOGLE_KEY);
  if (!loc) return fallback;
  resolvedCache.set(campus.id, loc);
  if (typeof localStorage !== "undefined") writeStoredLatLng(campus.id, loc);
  return loc;
}

// Verified precise coordinates (campus id → [lat, lng]). These render exactly
// even without the Geocoding API enabled.
const PRECISE: Record<string, [number, number]> = {
  "flagship-wpb": [26.7156, -80.1105], // 2600 N Military Trail, West Palm Beach
  "fort-lauderdale": [26.186, -80.1638], // 1500 NW 49th St
  orlando: [28.5389, -81.3117], // 5600 Lake Underhill Rd
  jacksonville: [30.259, -81.6028], // 6430 Southpoint Pkwy
  sarasota: [27.3845, -82.4459], // 6151 Lake Osprey Dr, Lakewood Ranch
  daytona: [29.2045, -81.0745], // 1800 Business Park Blvd
  lakeland: [28.0765, -81.9806], // 2400 Interstate Dr
  tampa: [28.02456, -82.52941], // 5002 W Waters Ave
  miami: [25.79355, -80.38423], // 2101 NW 117th Ave
  clearwater: [27.91921, -82.73006], // 16120 US Hwy 19 N
  "west-palm-beach": [26.7058, -80.1475], // 2085 Vista Pkwy
  "pembroke-pines": [26.0029, -80.3515], // 1640 SW 145th Ave
  "new-port-richey": [28.2482, -82.7178], // 6300 US Hwy 19 N
  "fort-myers": [26.6405, -81.8128], // 9100 Forum Corporate Pkwy
  "graduate-school": [26.1862, -80.1662], // 1600 W Commercial Blvd
  "online-global": [26.1865, -80.1698], // 1900 W Commercial Blvd
  tallahassee: [30.4809, -84.238], // 1700 Halstead Blvd
  melbourne: [28.0669, -80.6089], // 900 S Babcock St
  naples: [26.1196, -81.7735], // 3909 Tamiami Trail E
  "port-st-lucie": [27.2738, -80.3512], // 9400 SW Discovery Way
  ocala: [29.2015, -82.1118], // 1601 NE 25th Ave
};

// Real street addresses for the remaining campuses — geocoded on demand (and
// cached) to land the camera on the actual building. Falls back to "<name>,
// <city>" for any campus not listed here.
const ADDRESSES: Record<string, string> = {
  tampa: "5002 W Waters Ave, Tampa, FL 33634",
  miami: "2101 NW 117th Ave, Miami, FL 33172",
  tallahassee: "1700 Halstead Blvd, Building 2, Tallahassee, FL 32309",
  melbourne: "900 S Babcock St, Melbourne, FL 32901",
  naples: "3909 Tamiami Trail E, Naples, FL 34112",
  "port-st-lucie": "9400 SW Discovery Way, Port St. Lucie, FL 34987",
  "west-palm-beach": "2085 Vista Pkwy, West Palm Beach, FL 33411",
  "online-global": "1900 W Commercial Blvd, Suite 100, Fort Lauderdale, FL 33309",
  "pembroke-pines": "1640 SW 145th Ave, Pembroke Pines, FL 33027",
  "new-port-richey": "6300 US Hwy 19 N, New Port Richey, FL 34652",
  clearwater: "16120 US Hwy 19 N, Clearwater, FL 33764",
  "fort-myers": "9100 Forum Corporate Pkwy, Fort Myers, FL 33905",
  "graduate-school": "1600 W Commercial Blvd, Fort Lauderdale, FL 33309",
  ocala: "1601 NE 25th Avenue, Suite 602, Ocala, FL 34470",
  "latin-american": "Gasolinera UNO, 2 c. al Sur, San Marcos, Carazo 45000, Nicaragua",
  managua: "Offiplaza San Dionisio, Pista Suburbana, Managua, Nicaragua",
  "san-salvador": "Millennium Plaza, Paseo General Escalón 3675, San Salvador, El Salvador",
  shanghai: "Guan Hai Lu Road No. 505, Pudong, Shanghai, China 201300",
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
export function useResolvedLatLng(campus: Campus): { lat: number; lng: number } {
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

    const cached = readStoredLatLng(campus.id);
    if (cached) {
      setLoc(cached);
      return;
    }
    if (!GOOGLE_KEY) return;

    let alive = true;
    const query = ADDRESSES[campus.id] ?? campus.address ?? `${campus.name}, ${campus.city}`;
    geocode(query, GOOGLE_KEY).then((r) => {
      if (r && alive) {
        resolvedCache.set(campus.id, r);
        writeStoredLatLng(campus.id, r);
        setLoc(r);
      }
    });
    return () => {
      alive = false;
    };
  }, [campus.id, campus.lat, campus.lng, campus.name, campus.city, campus.address]);

  return loc;
}

/** Whether Google Street View has a panorama near a campus (so we only offer
 *  the Street View toggle where there's real ground-level imagery). Uses the
 *  free Street View metadata endpoint; cached per session. */
export function useStreetViewAvailable(campus: Campus): boolean {
  const { lat, lng } = useResolvedLatLng(campus);
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    setAvailable(false);
    if (!GOOGLE_KEY) return;

    const cacheKey = `kcg-sv-${campus.id}`;
    const cached = sessionStorage.getItem(cacheKey);
    if (cached !== null) {
      setAvailable(cached === "1");
      return;
    }

    let alive = true;
    const url = `https://maps.googleapis.com/maps/api/streetview/metadata?location=${lat},${lng}&radius=150&source=outdoor&key=${GOOGLE_KEY}`;
    fetch(url)
      .then((r) => r.json())
      .then((d) => {
        if (!alive) return;
        const ok = d.status === "OK";
        setAvailable(ok);
        try {
          sessionStorage.setItem(cacheKey, ok ? "1" : "0");
        } catch {
          /* ignore */
        }
      })
      .catch(() => {
        /* leave unavailable */
      });
    return () => {
      alive = false;
    };
  }, [campus.id, lat, lng]);

  return available;
}
