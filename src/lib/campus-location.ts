// Shared campus → lat/lng resolution (no Three.js, so it stays out of the heavy
// 3D-tiles chunk). Used by both the photoreal tiles tour and the Street View.

import { useEffect, useState } from "react";
import type { Campus } from "./campus-data";

// Client-side Google Maps Platform key. Must be HTTP-referrer restricted in the
// Google Cloud console, since it ships in the bundle.
export const GOOGLE_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;

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
  "pembroke-pines": "1640 SW 145th Ave, Pembroke Pines, FL 33027",
  "new-port-richey": "6300 US Hwy 19 N, New Port Richey, FL 34652",
  clearwater: "16120 US Hwy 19 N, Clearwater, FL 33764",
  "fort-myers": "9100 Forum Corporate Pkwy, Fort Myers, FL 33905",
  "graduate-school": "1500 NW 49th St, Fort Lauderdale, FL 33309",

  // International campuses & global partners (geocoded from the institution's
  // published street address). El Salvador is intentionally omitted — no
  // verifiable physical street address — so it falls back to "<name>, <city>".
  "latin-american": "Gasolinera UNO, 2 c. al Sur, San Marcos, Carazo 45000, Nicaragua",
  "managua-language-center": "Offiplaza San Dionisio, Pista Suburbana, Managua, Nicaragua",
  "santa-cruz": "Calle Los Pinos 473, Barrio Sirari, Santa Cruz de la Sierra, Bolivia",
  "ista-ecuador": "Balsas 416, Urdesa Central, Guayaquil, Ecuador",
  "usil-peru": "Av. La Fontana 550, La Molina, Lima, Peru",
  spain: "CC La Alzambra, Urb. La Alzambra, 29660 Puerto Banús, Marbella, Málaga, Spain",
  "garodia-india": "55, 90 Feet Road, Garodia Nagar, Ghatkopar East, Mumbai 400077, India",
  "sampoerna-indonesia": "Jl. Raya Pasar Minggu Kav. 16, Pancoran, Jakarta 12780, Indonesia",
  "sri-lanka": "502 Peradeniya Road, Kandy, Sri Lanka",
  "vietnam-hue": "28 Nguyen Tri Phuong Street, Thuan Hoa Ward, Hue, Vietnam",
  "vietnam-hcmc": "21 Le Quy Don, Vo Thi Sau Ward, District 3, Ho Chi Minh City, Vietnam",
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
