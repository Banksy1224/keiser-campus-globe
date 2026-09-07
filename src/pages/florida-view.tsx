import { Suspense, lazy, useState, type ReactNode } from "react";
import { TILES_ENABLED } from "../lib/campus-location";
import type { FloridaViewProps } from "../lib/florida-map";

const FloridaCesiumView = lazy(() => import("./florida-cesium"));
const FloridaStylizedView = lazy(() => import("./florida-map"));

function FloridaNotice({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="pointer-events-none absolute inset-x-3 top-[7.25rem] z-30 flex justify-center desk:top-24">
      <div className="pointer-events-auto max-w-lg rounded-2xl border border-keiser-gold/45 bg-keiser-navy/95 p-4 text-sm text-slate-100 shadow-2xl backdrop-blur">
        <p className="font-display text-base font-bold uppercase tracking-wide text-keiser-gold">
          {title}
        </p>
        <div className="mt-2 leading-relaxed text-slate-200/90">{children}</div>
      </div>
    </div>
  );
}

function FallbackFlorida(props: FloridaViewProps & { notice: ReactNode }) {
  const { notice, ...mapProps } = props;
  return (
    <>
      {notice}
      <Suspense fallback={null}>
        <FloridaStylizedView {...mapProps} />
      </Suspense>
    </>
  );
}

export default function FloridaView(props: FloridaViewProps) {
  const [tilesFailed, setTilesFailed] = useState<string | null>(null);

  if (!TILES_ENABLED) {
    return (
      <FallbackFlorida
        {...props}
        notice={
          <FloridaNotice title="Photoreal 3D Florida needs an API key">
            Set <code className="text-keiser-gold">VITE_GOOGLE_MAPS_API_KEY</code> (or{" "}
            <code className="text-keiser-gold">GOOGLE_MAPS_API_KEY</code>) to a browser key
            with the <strong>Map Tiles API</strong> enabled. Restrict it to{" "}
            <code className="text-[11px] text-keiser-gold">https://banksy1224.github.io/*</code> and{" "}
            <code className="text-[11px] text-keiser-gold">https://www.keiseruniversity.edu/*</code>.
            Until then, the stylized 3D peninsula stays on so campuses remain usable.
          </FloridaNotice>
        }
      />
    );
  }

  if (tilesFailed) {
    return (
      <FallbackFlorida
        {...props}
        notice={
          <FloridaNotice title="Photoreal 3D tiles unavailable">
            Google Photorealistic 3D Tiles did not load. Enable the{" "}
            <strong>Map Tiles API</strong>, confirm billing, and restrict HTTP referrers
            to this site. Showing the stylized 3D peninsula so campuses stay usable.
            {tilesFailed && (
              <p className="mt-2 break-words text-[11px] text-slate-400">{tilesFailed}</p>
            )}
          </FloridaNotice>
        }
      />
    );
  }

  return (
    <Suspense
      fallback={
        <div className="absolute inset-0 z-0 flex items-center justify-center bg-keiser-navy text-xs font-semibold text-keiser-gold">
          Preparing photoreal 3D Florida…
        </div>
      }
    >
      <FloridaCesiumView {...props} onTilesFailed={setTilesFailed} />
    </Suspense>
  );
}
