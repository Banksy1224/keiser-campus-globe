// Device / embed / GPU helpers shared by the globe, Florida flyover, and tiles.

import { useEffect, useState } from "react";
import * as THREE from "three";

type PowerPreference = "default" | "high-performance" | "low-power";

/** CSS breakpoint that matches Tailwind `sm` (640px). */
export const NARROW_MQ = "(max-width: 639px)";
/** Matches Tailwind `desk` — wide AND tall. Landscape phones stay compact. */
export const DESK_MQ = "(min-width: 900px) and (min-height: 700px)";

export function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function isNarrowViewport(): boolean {
  return typeof window !== "undefined" && window.matchMedia(NARROW_MQ).matches;
}

export function isCoarsePointer(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(pointer: coarse)").matches || window.matchMedia("(hover: none)").matches;
}

/** `?embed=1` wins; otherwise detect a framing window (cross-origin throws). */
export function readEmbedFlag(): boolean {
  if (typeof window === "undefined") return false;
  const v = new URLSearchParams(window.location.search).get("embed");
  if (v === "1" || v === "true" || v === "yes") return true;
  if (v === "0" || v === "false" || v === "no") return false;
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

export function isLowPowerDevice(): boolean {
  if (typeof window === "undefined") return false;
  if (isNarrowViewport() || isCoarsePointer()) return true;
  const cores = navigator.hardwareConcurrency ?? 8;
  const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  if (cores <= 4) return true;
  if (typeof mem === "number" && mem <= 4) return true;
  return false;
}

export function canvasDpr(lowPower: boolean): [number, number] {
  return lowPower ? [1, 1] : [1, 2];
}

/** Compact chrome: phone, landscape phone, tablet, or iframe embed. */
export function isCompactChrome(): boolean {
  if (typeof window === "undefined") return true;
  if (readEmbedFlag()) return true;
  return !window.matchMedia(DESK_MQ).matches;
}

export function useCompactChrome(): boolean {
  const [compact, setCompact] = useState(() => isCompactChrome());
  useEffect(() => {
    const mq = window.matchMedia(DESK_MQ);
    const sync = () => setCompact(readEmbedFlag() || !mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return compact;
}

export function canvasGlProps(lowPower: boolean): {
  antialias: boolean;
  powerPreference: PowerPreference;
  stencil: boolean;
  alpha: boolean;
} {
  return {
    antialias: !lowPower,
    powerPreference: lowPower ? "low-power" : "high-performance",
    stencil: false,
    alpha: false,
  };
}

/** One-finger rotate, two-finger pinch-zoom. With `enablePan={false}` the
 *  two-finger gesture only dollies (OrbitControls has no standalone DOLLY). */
export const TOUCH_ORBIT = {
  ONE: THREE.TOUCH.ROTATE,
  TWO: THREE.TOUCH.DOLLY_PAN,
} as const;

/** Same mapping; Florida keeps `enablePan` so two fingers may also pan. */
export const TOUCH_ORBIT_PAN = {
  ONE: THREE.TOUCH.ROTATE,
  TWO: THREE.TOUCH.DOLLY_PAN,
} as const;

export function applyDocumentEmbed(embedded: boolean): void {
  document.documentElement.classList.toggle("is-embed", embedded);
  document.body.classList.toggle("is-embed", embedded);
}
