import { Suspense, lazy } from "react";
import { TILES_ENABLED } from "../lib/campus-location";
import type { FloridaViewProps } from "../lib/florida-map";

const FloridaCesiumView = lazy(() => import("./florida-cesium"));
const FloridaStylizedView = lazy(() => import("./florida-map"));

function MissingKeyNotice() {
  return (
    <div className="pointer-events-none absolute inset-x-3 top-[7.25rem] z-30 flex justify-center desk:top-24">
      <div className="pointer-events-auto max-w-lg rounded-2xl border border-keiser-gold/45 bg-keiser-navy/95 p-4 text-sm text-slate-100 shadow-2xl backdrop-blur">
        <p className="font-display text-base font-bold uppercase tracking-wide text-keiser-gold">
          Photoreal 3D Florida needs an API key
        </p>
        <p className="mt-2 leading-relaxed text-slate-200/90">
          Set <code className="text-keiser-gold">VITE_GOOGLE_MAPS_API_KEY</code> (or{" "}
          <code className="text-keiser-gold">GOOGLE_MAPS_API_KEY</code>) to a browser key
          with the <strong>Map Tiles API</strong> enabled. Restrict it to{" "}
          <code className="text-[11px] text-keiser-gold">https://banksy1224.github.io/*</code> and{" "}
          <code className="text-[11px] text-keiser-gold">https://www.keiseruniversity.edu/*</code>.
          Until then, the stylized 3D peninsula stays on so campuses remain usable.
        </p>
      </div>
    </div>
  );
}

export default function FloridaView(props: FloridaViewProps) {
  if (!TILES_ENABLED) {
    return (
      <>
        <MissingKeyNotice />
        <Suspense fallback={null}>
          <FloridaStylizedView {...props} />
        </Suspense>
      </>
    );
  }

  return (
    <Suspense
      fallback={
        <div className="absolute inset-0 flex items-center justify-center bg-keiser-navy text-xs font-semibold text-keiser-gold">
          Preparing photoreal 3D Florida…
        </div>
      }
    >
      <FloridaCesiumView {...props} />
    </Suspense>
  );
}
