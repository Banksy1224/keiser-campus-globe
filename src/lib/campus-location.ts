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
  "flagship-wpb": [26.71421, -80.11063], // 2600 N Military Trail (OSM address)
  "west-palm-beach": [26.71366, -80.15117], // 2085 Vista Pkwy (OSM named campus)
  "fort-lauderdale": [26.18639, -80.16361], // 1500 NW 49th St (OSM Keiser College)
  "graduate-school": [26.18842, -80.1672], // 1600 W Commercial Blvd
  "online-global": [26.18806, -80.1686], // 1900 W Commercial Blvd
  miami: [25.79354, -80.38417], // 2101 NW 117th Ave
  "pembroke-pines": [25.99413, -80.3393], // 1640 SW 145th Ave (USGS)
  tampa: [28.02456, -82.52941], // 5002 W Waters Ave (OSM building)
  clearwater: [27.91921, -82.73006], // 16120 US Hwy 19 N (BBB / USGS)
  "new-port-richey": [28.2482, -82.7178], // 6300 US Hwy 19 N
  orlando: [28.53816, -81.31195], // 5600 Lake Underhill Rd
  lakeland: [28.07478, -81.97914], // 2400 Interstate Dr
  jacksonville: [30.25925, -81.60298], // 6430 Southpoint Pkwy
  daytona: [29.20453, -81.07451], // 1800 Business Park Blvd
  melbourne: [28.09482, -80.62302], // 900 S Babcock St (Babcock & NASA)
  "port-st-lucie": [27.25496, -80.41993], // 9400 SW Discovery Way (Google place)
  sarasota: [27.38453, -82.44578], // 6151 Lake Osprey Dr (OSM named campus)
  "fort-myers": [26.62862, -81.80211], // 9100 Forum Corporate Pkwy
  naples: [26.11776, -81.75783], // 3909 Tamiami Trail E
  tallahassee: [30.50386, -84.24771], // 1700 Halstead Blvd (OSM named campus)
  ocala: [29.20224, -82.10317], // 1601 NE 25th Ave
};

// Real street addresses for the remaining campuses — geocoded on demand (and
// cached) to land the camera on the actual building. Falls back to "<name>,
// <city>" for any campus not listed here.
const ADDRESSES: Record<string, string> = {
  "flagship-wpb": "2600 North Military Trail, West Palm Beach, FL 33409",
  "fort-lauderdale": "1500 Northwest 49th Street, Fort Lauderdale, FL 33309",
  orlando: "5600 Lake Underhill Road, Orlando, FL 32807",
  jacksonville: "6430 Southpoint Parkway, Jacksonville, FL 32216",
  sarasota: "6151 Lake Osprey Drive, Sarasota, FL 34240",
  daytona: "1800 Business Park Boulevard, Daytona Beach, FL 32114",
  lakeland: "2400 Interstate Drive, Lakeland, FL 33805",
  tampa: "5002 West Waters Avenue, Tampa, FL 33634",
  miami: "2101 NW 117th Avenue, Miami, FL 33172",
  tallahassee: "1700 Halstead Boulevard, Building 2, Tallahassee, FL 32309",
  melbourne: "900 South Babcock Street, Melbourne, FL 32901",
  naples: "3909 Tamiami Trail East, Naples, FL 34112",
  "port-st-lucie": "9400 SW Discovery Way, Port St. Lucie, FL 34987",
  "west-palm-beach": "2085 Vista Parkway, West Palm Beach, FL 33411",
  "online-global": "1900 West Commercial Boulevard, Suite 100, Fort Lauderdale, FL 33309",
  "pembroke-pines": "1640 SW 145th Avenue, Pembroke Pines, FL 33027",
  "new-port-richey": "6300 US Highway 19 North, New Port Richey, FL 34652",
  clearwater: "16120 U.S. Highway 19 North, Clearwater, FL 33764",
  "fort-myers": "9100 Forum Corporate Parkway, Fort Myers, FL 33905",
  "graduate-school": "1600 West Commercial Boulevard, Fort Lauderdale, FL 33309",
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
