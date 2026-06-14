import { Suspense, lazy } from "react";

// Code-split the 3D experience so the Three.js bundle only loads with the globe.
const CampusMap = lazy(() => import("./pages/campus-map"));

function LoadingScreen() {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-5 bg-keiser-navy text-keiser-gold">
      <div className="relative h-24 w-24">
        <div className="absolute inset-0 animate-spin rounded-full border-2 border-keiser-gold/30 border-t-keiser-gold" />
        <div className="absolute inset-1.5 flex items-center justify-center rounded-full bg-white shadow-lg">
          <img
            src={`${import.meta.env.BASE_URL}brand/seal.png`}
            alt="Keiser University"
            className="h-16 w-16 object-contain"
          />
        </div>
      </div>
      <p className="text-sm font-medium tracking-wide text-keiser-gold/80">
        Preparing the campus ecosystem…
      </p>
    </div>
  );
}

export default function App() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <CampusMap />
    </Suspense>
  );
}
