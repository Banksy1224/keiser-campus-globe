import { useEffect, useRef, useState } from "react";
import "../lib/cesium-base";
import "cesium/Build/Cesium/Widgets/widgets.css";
import "./florida-cesium.css";
import { FLAME_GOLD, campusById, type Campus } from "../lib/campus-data";
import { campusLatLng, GOOGLE_KEY } from "../lib/campus-location";
import { campusSkylineUrl, plazaRadius, SKYLINE_UNIT_METERS } from "../lib/campus-skyline";
import {
  FLORIDA_INTRO_SEATS,
  campusApproachSeat,
  floridaOverviewSeat,
  type CameraSeat,
} from "../lib/florida-cesium";
import {
  floridaMapCampuses,
  rosterRowFor,
  sameMapCampus,
  type FloridaViewProps,
} from "../lib/florida-map";
import { prefersReducedMotion } from "../lib/runtime";

type CesiumNS = typeof import("cesium");
type Viewer = import("cesium").Viewer;
type Entity = import("cesium").Entity;

const PIN_PREFIX = "campus:";
const PULSE_PREFIX = "pulse:";

function pinId(campusId: string): string {
  return `${PIN_PREFIX}${campusId}`;
}

function pulseId(campusId: string): string {
  return `${PULSE_PREFIX}${campusId}`;
}

function campusIdFromEntity(entity: Entity | undefined): string | null {
  if (!entity?.id) return null;
  if (entity.id.startsWith(PIN_PREFIX)) return entity.id.slice(PIN_PREFIX.length);
  if (entity.id.startsWith(PULSE_PREFIX)) return entity.id.slice(PULSE_PREFIX.length);
  return null;
}

function seatDestination(C: CesiumNS, seat: CameraSeat) {
  return C.Cartesian3.fromDegrees(seat.lng, seat.lat, seat.height);
}

function seatOrientation(C: CesiumNS, seat: CameraSeat) {
  return {
    heading: C.Math.toRadians(seat.heading),
    pitch: C.Math.toRadians(seat.pitch),
    roll: 0,
  };
}

function applySeat(C: CesiumNS, viewer: Viewer, seat: CameraSeat, animate: boolean): Promise<void> {
  if (!animate || seat.duration <= 0) {
    viewer.camera.setView({
      destination: seatDestination(C, seat),
      orientation: seatOrientation(C, seat),
    });
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    viewer.camera.flyTo({
      destination: seatDestination(C, seat),
      orientation: seatOrientation(C, seat),
      duration: seat.duration,
      complete: () => resolve(),
      cancel: () => resolve(),
    });
  });
}

function pulseScale(selected: boolean): number {
  if (!selected || prefersReducedMotion()) return 1;
  const t = performance.now() / 1000;
  return 1 + 0.12 * (0.5 + 0.5 * Math.sin(t * 3.6));
}

function styleSkyline(C: CesiumNS, entity: Entity, selected: boolean, hovered: boolean) {
  const hot = selected || hovered;
  if (entity.model) {
    entity.model.scale = new C.CallbackProperty(() => pulseScale(selected), false);
    entity.model.silhouetteSize = new C.ConstantProperty(hot ? 2.4 : 0);
    entity.model.silhouetteColor = new C.ConstantProperty(C.Color.fromCssColorString(FLAME_GOLD));
    entity.model.color = new C.ConstantProperty(
      selected ? C.Color.fromCssColorString(FLAME_GOLD) : C.Color.WHITE,
    );
    entity.model.colorBlendAmount = new C.ConstantProperty(selected ? 0.28 : 0);
  }
  if (entity.label) {
    entity.label.show = new C.ConstantProperty(hot);
  }
}

export default function FloridaCesiumView({
  selectedId,
  hoveredId,
  playIntro,
  onIntroFinished,
  onHover,
  onSelect,
  lowPower = false,
  compact = false,
  onTilesFailed,
}: FloridaViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Viewer | null>(null);
  const cesiumRef = useRef<CesiumNS | null>(null);
  const introGen = useRef(0);
  const lastFlyId = useRef<string | null | undefined>(undefined);
  const propsRef = useRef({ onHover, onSelect, onIntroFinished, compact, onTilesFailed });
  propsRef.current = { onHover, onSelect, onIntroFinished, compact, onTilesFailed };

  const [phase, setPhase] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [engineReady, setEngineReady] = useState(false);

  useEffect(() => {
    const host = containerRef.current;
    const apiKey = GOOGLE_KEY;
    if (!host || !apiKey) return;

    let cancelled = false;
    let bootTimer = 0;
    let viewer: Viewer | null = null;
    let handler: import("cesium").ScreenSpaceEventHandler | null = null;

    const fail = (message: string) => {
      if (cancelled) return;
      window.clearTimeout(bootTimer);
      setError(message);
      setPhase("error");
      propsRef.current.onTilesFailed?.(message);
    };

    bootTimer = window.setTimeout(() => {
      fail("Timed out loading Google Photorealistic 3D Tiles. Check the Map Tiles API key.");
    }, 20000);

    void (async () => {
      let C: CesiumNS;
      try {
        C = await import("cesium");
      } catch (err) {
        fail(err instanceof Error ? err.message : "CesiumJS failed to load.");
        return;
      }
      if (cancelled) return;
      cesiumRef.current = C;

      try {
        viewer = new C.Viewer(host, {
          animation: false,
          baseLayerPicker: false,
          fullscreenButton: false,
          vrButton: false,
          geocoder: false,
          homeButton: false,
          infoBox: false,
          sceneModePicker: false,
          selectionIndicator: false,
          timeline: false,
          navigationHelpButton: false,
          navigationInstructionsInitiallyVisible: false,
          scene3DOnly: true,
          globe: false,
          baseLayer: false,
          skyBox: false,
          requestRenderMode: false,
          shouldAnimate: true,
          showRenderLoopErrors: false,
          msaaSamples: lowPower ? 1 : 4,
          useBrowserRecommendedResolution: true,
          targetFrameRate: lowPower ? 30 : undefined,
        });
      } catch (err) {
        fail(err instanceof Error ? err.message : "Cesium viewer failed to start.");
        return;
      }

      viewer.scene.backgroundColor = C.Color.fromCssColorString("#0b1c33");
      viewer.scene.fog.enabled = false;
      const controller = viewer.scene.screenSpaceCameraController;
      controller.minimumZoomDistance = 80;
      controller.maximumZoomDistance = compact ? 1.5e6 : 9.5e5;
      controller.enableCollisionDetection = true;
      viewer.clock.shouldAnimate = true;
      viewerRef.current = viewer;
      lastFlyId.current = undefined;
      setEngineReady(true);

      const gold = C.Color.fromCssColorString(FLAME_GOLD);
      for (const campus of floridaMapCampuses()) {
        const row = rosterRowFor(campus.id);
        const { lat, lng } = campusLatLng(campus);
        const position = C.Cartesian3.fromDegrees(lng, lat);
        const number = row?.number ?? 0;
        const plazaM = plazaRadius(campus) * SKYLINE_UNIT_METERS;
        viewer.entities.add({
          id: pinId(campus.id),
          position,
          model: {
            uri: campusSkylineUrl(campus),
            heightReference: C.HeightReference.CLAMP_TO_3D_TILE,
            minimumPixelSize: 56,
            maximumScale: 1600,
            scale: 1,
            color: C.Color.WHITE,
            colorBlendMode: C.ColorBlendMode.HIGHLIGHT,
            colorBlendAmount: 0,
            silhouetteColor: gold,
            silhouetteSize: 0,
          },
          label: {
            text: `${number} · ${campus.city}`,
            font: "600 13px Roboto, system-ui, sans-serif",
            fillColor: C.Color.WHITE,
            outlineColor: C.Color.fromCssColorString("#0b1c33"),
            outlineWidth: 4,
            style: C.LabelStyle.FILL_AND_OUTLINE,
            verticalOrigin: C.VerticalOrigin.BOTTOM,
            pixelOffset: new C.Cartesian2(0, -78),
            show: false,
            heightReference: C.HeightReference.RELATIVE_TO_3D_TILE,
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
          },
        });
        viewer.entities.add({
          id: pulseId(campus.id),
          position,
          show: false,
          ellipse: {
            semiMajorAxis: new C.CallbackProperty(() => {
              const t = (performance.now() / 1000) * 1.7;
              return plazaM * (1.15 + 0.7 * (0.5 + 0.5 * Math.sin(t * Math.PI * 2)));
            }, false),
            semiMinorAxis: new C.CallbackProperty(() => {
              const t = (performance.now() / 1000) * 1.7;
              return plazaM * (1.15 + 0.7 * (0.5 + 0.5 * Math.sin(t * Math.PI * 2)));
            }, false),
            material: gold.withAlpha(0.32),
            outline: true,
            outlineColor: gold.withAlpha(0.8),
            heightReference: C.HeightReference.CLAMP_TO_3D_TILE,
          },
        });
      }

      handler = new C.ScreenSpaceEventHandler(viewer.scene.canvas);
      handler.setInputAction((click: { position: import("cesium").Cartesian2 }) => {
        const picked = viewer!.scene.pick(click.position);
        const id = C.defined(picked) ? campusIdFromEntity(picked.id as Entity | undefined) : null;
        const campus = id ? campusById(id) : null;
        if (campus) propsRef.current.onSelect(campus);
      }, C.ScreenSpaceEventType.LEFT_CLICK);
      handler.setInputAction((move: { endPosition: import("cesium").Cartesian2 }) => {
        const picked = viewer!.scene.pick(move.endPosition);
        const id = C.defined(picked) ? campusIdFromEntity(picked.id as Entity | undefined) : null;
        propsRef.current.onHover(id);
        viewer!.scene.canvas.style.cursor = id ? "pointer" : "default";
      }, C.ScreenSpaceEventType.MOUSE_MOVE);

      const canvas = viewer.scene.canvas;
      canvas.setAttribute(
        "aria-label",
        "Photorealistic 3D map of Keiser University Florida campuses",
      );
      canvas.style.touchAction = "none";

      C.GoogleMaps.defaultApiKey = apiKey;
      try {
        const tileset = await C.createGooglePhotorealistic3DTileset(
          { key: apiKey, onlyUsingWithGoogleGeocoder: true },
          {
            showCreditsOnScreen: true,
            maximumScreenSpaceError: lowPower ? 16 : 8,
            enableCollision: true,
          },
        );
        if (cancelled) {
          tileset.destroy();
          return;
        }
        viewer.scene.primitives.add(tileset);
        let sawContent = false;
        tileset.tileLoad.addEventListener(() => {
          sawContent = true;
          window.clearTimeout(bootTimer);
        });
        tileset.tileFailed.addEventListener(() => {
          if (!sawContent) {
            fail("Map Tiles API rejected the Photorealistic 3D Tiles request.");
          }
        });
        setPhase("ready");
        window.clearTimeout(bootTimer);
        bootTimer = window.setTimeout(() => {
          if (!sawContent) {
            fail("Map Tiles API did not return photoreal tiles for this key.");
          }
        }, 12000);
      } catch (err) {
        fail(err instanceof Error ? err.message : "Unknown tileset error");
      }
    })();

    return () => {
      cancelled = true;
      window.clearTimeout(bootTimer);
      introGen.current += 1;
      handler?.destroy();
      if (viewer && !viewer.isDestroyed()) viewer.destroy();
      viewerRef.current = null;
      cesiumRef.current = null;
      setEngineReady(false);
      host.replaceChildren();
    };
  }, [lowPower, compact]);

  useEffect(() => {
    const viewer = viewerRef.current;
    const C = cesiumRef.current;
    if (!viewer || viewer.isDestroyed() || !C) return;

    for (const campus of floridaMapCampuses()) {
      const selected = sameMapCampus(selectedId, campus.id);
      const hovered = sameMapCampus(hoveredId, campus.id);
      const pin = viewer.entities.getById(pinId(campus.id));
      const pulse = viewer.entities.getById(pulseId(campus.id));
      if (pin) styleSkyline(C, pin, selected, hovered);
      if (pulse) pulse.show = selected;
    }
  }, [selectedId, hoveredId, engineReady]);

  useEffect(() => {
    const viewer = viewerRef.current;
    const C = cesiumRef.current;
    if (!viewer || viewer.isDestroyed() || !C) return;

    const gen = ++introGen.current;
    const reduce = prefersReducedMotion();
    const selected = selectedId ? campusById(selectedId) : null;

    const flyCampus = (campus: Campus, animate: boolean) => {
      lastFlyId.current = campus.id;
      const { lat, lng } = campusLatLng(campus);
      return applySeat(C, viewer, campusApproachSeat(lat, lng, compact, Boolean(campus.flagship)), animate);
    };

    const flyOverview = (animate: boolean) => {
      lastFlyId.current = null;
      return applySeat(C, viewer, floridaOverviewSeat(compact), animate);
    };

    viewer.camera.cancelFlight();

    if (playIntro && !reduce && !selected) {
      lastFlyId.current = undefined;
      void (async () => {
        for (const seat of FLORIDA_INTRO_SEATS) {
          if (introGen.current !== gen) return;
          await applySeat(C, viewer, seat, seat.duration > 0);
        }
        if (introGen.current !== gen) return;
        await flyOverview(true);
        if (introGen.current === gen) propsRef.current.onIntroFinished();
      })();
      return;
    }

    if (selected) {
      if (lastFlyId.current === selected.id) return;
      void flyCampus(selected, !reduce);
      if (playIntro) propsRef.current.onIntroFinished();
      return;
    }

    void flyOverview(!reduce && lastFlyId.current !== undefined);
    if (playIntro) propsRef.current.onIntroFinished();
  }, [playIntro, selectedId, compact, engineReady]);

  return (
    <div className="florida-cesium-root absolute inset-0 bg-keiser-navy">
      <div ref={containerRef} className="florida-cesium absolute inset-0" />
      {phase === "loading" && (
        <div className="pointer-events-none absolute inset-x-0 top-[7.25rem] z-20 flex justify-center px-3 desk:top-24">
          <div className="rounded-full border border-keiser-gold/40 bg-keiser-navy/85 px-3 py-1.5 text-xs font-semibold text-keiser-gold shadow-lg backdrop-blur">
            Loading photoreal 3D Florida…
          </div>
        </div>
      )}
      {phase === "error" && (
        <div className="absolute inset-x-3 top-[7.25rem] z-30 mx-auto max-w-lg desk:top-24">
          <div className="rounded-2xl border border-keiser-gold/40 bg-keiser-navy/95 p-4 text-sm text-slate-100 shadow-2xl backdrop-blur">
            <p className="font-display text-lg font-bold uppercase tracking-wide text-keiser-gold">
              Photoreal 3D tiles unavailable
            </p>
            <p className="mt-2 leading-relaxed text-slate-200/90">
              Google Photorealistic 3D Tiles did not load. Enable the{" "}
              <strong>Map Tiles API</strong> on this key, confirm billing, and restrict
              HTTP referrers to this site. The globe and campus catalog still work.
            </p>
            {error && <p className="mt-2 break-words text-[11px] text-slate-400">{error}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
