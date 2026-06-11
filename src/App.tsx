import { Suspense, lazy } from "react";

// Code-split the 3D experience so the Three.js bundle only loads with the globe.
const CampusMap = lazy(() => import("./pages/campus-map"));

function LoadingScreen() {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-4 bg-keiser-navy text-keiser-gold">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-keiser-gold/30 border-t-keiser-gold" />
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
