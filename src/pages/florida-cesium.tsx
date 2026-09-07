import { useEffect, useRef, useState } from "react";
import "../lib/cesium-base";
import "cesium/Build/Cesium/Widgets/widgets.css";
import "./florida-cesium.css";
import { FLAME_GOLD, campusById, type Campus } from "../lib/campus-data";
import { campusLatLng, resolveCampusLatLng, GOOGLE_KEY } from "../lib/campus-location";
import {
  FLORIDA_INTRO_SEATS,
  campusApproach,
  drawCampusPin,
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
type Cartesian3 = import("cesium").Cartesian3;

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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

/** Heading/pitch from `from` looking at `to` in the local ENU frame. */
function headingPitchFromTo(C: CesiumNS, from: Cartesian3, to: Cartesian3) {
  const enu = C.Transforms.eastNorthUpToFixedFrame(from);
  const inv = C.Matrix4.inverseTransformation(enu, new C.Matrix4());
  const local = C.Matrix4.multiplyByPoint(inv, to, new C.Cartesian3());
  return {
    heading: Math.atan2(local.x, local.y),
    pitch: Math.atan2(local.z, Math.hypot(local.x, local.y)),
    roll: 0,
  };
}

function seatDestination(C: CesiumNS, seat: CameraSeat) {
  return C.Cartesian3.fromDegrees(seat.lng, seat.lat, seat.height);
}

function seatOrientation(C: CesiumNS, seat: CameraSeat) {
  if (seat.lookLat != null && seat.lookLng != null) {
    const dest = seatDestination(C, seat);
    const target = C.Cartesian3.fromDegrees(seat.lookLng, seat.lookLat, seat.lookHeight ?? 20);
    return headingPitchFromTo(C, dest, target);
  }
  return {
    heading: C.Math.toRadians(seat.heading ?? 0),
    pitch: C.Math.toRadians(seat.pitch ?? -35),
    roll: 0,
  };
}

function applySeat(C: CesiumNS, viewer: Viewer, seat: CameraSeat, animate: boolean): Promise<void> {
  const destination = seatDestination(C, seat);
  const orientation = seatOrientation(C, seat);
  if (!animate || seat.duration <= 0) {
    viewer.camera.setView({ destination, orientation });
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    viewer.camera.flyTo({
      destination,
      orientation,
      duration: seat.duration,
      complete: () => resolve(),
      cancel: () => resolve(),
    });
  });
}

async function samplePoiHeight(C: CesiumNS, viewer: Viewer, lat: number, lng: number): Promise<number> {
  const carto = C.Cartographic.fromDegrees(lng, lat);
  try {
    await Promise.race([viewer.scene.sampleHeightMostDetailed([carto]), sleep(1800)]);
  } catch {
    /* ellipsoid / no tile yet */
  }
  return Number.isFinite(carto.height) ? carto.height : 0;
}

function poiCartesian(C: CesiumNS, lat: number, lng: number, height: number, lookUpM: number) {
  return C.Cartesian3.fromDegrees(lng, lat, height + lookUpM);
}

function flyToSphere(
  C: CesiumNS,
  viewer: Viewer,
  target: Cartesian3,
  headingDeg: number,
  pitchDeg: number,
  rangeM: number,
  duration: number,
): Promise<void> {
  const sphere = new C.BoundingSphere(target, 24);
  const offset = new C.HeadingPitchRange(C.Math.toRadians(headingDeg), C.Math.toRadians(pitchDeg), rangeM);
  if (duration <= 0) {
    viewer.camera.viewBoundingSphere(sphere, offset);
    viewer.camera.lookAtTransform(C.Matrix4.IDENTITY);
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    viewer.camera.flyToBoundingSphere(sphere, {
      offset,
      duration,
      complete: () => resolve(),
      cancel: () => resolve(),
    });
  });
}

async function flyToCampusPoi(
  C: CesiumNS,
  viewer: Viewer,
  campus: Campus,
  compact: boolean,
  animate: boolean,
): Promise<void> {
  const loc = await resolveCampusLatLng(campus);
  const approach = campusApproach(compact, Boolean(campus.flagship));
  const controller = viewer.scene.screenSpaceCameraController;
  const prevCollision = controller.enableCollisionDetection;
  controller.enableCollisionDetection = false;

  const firstHeight = await samplePoiHeight(C, viewer, loc.lat, loc.lng);
  const firstTarget = poiCartesian(C, loc.lat, loc.lng, firstHeight, approach.lookUpM);
  await flyToSphere(
    C,
    viewer,
    firstTarget,
    approach.headingDeg,
    approach.pitchDeg,
    approach.rangeM,
    animate ? approach.duration : 0,
  );

  // Tiles near the POI often finish after the first sample — refine so we
  // don't sit looking at the ellipsoid while buildings pop in beside us.
  await sleep(animate ? 450 : 0);
  const settledHeight = await samplePoiHeight(C, viewer, loc.lat, loc.lng);
  if (Math.abs(settledHeight - firstHeight) > 10) {
    const refined = poiCartesian(C, loc.lat, loc.lng, settledHeight, approach.lookUpM);
    await flyToSphere(
      C,
      viewer,
      refined,
      approach.headingDeg,
      approach.pitchDeg,
      approach.rangeM,
      animate ? 0.65 : 0,
    );
  }

  controller.enableCollisionDetection = prevCollision;
}

function stylePin(C: CesiumNS, entity: Entity, selected: boolean, hovered: boolean, number: number, flagship: boolean) {
  if (entity.billboard) {
    entity.billboard.image = new C.ConstantProperty(drawCampusPin({ number, selected, hovered, flagship }));
    entity.billboard.scale = new C.ConstantProperty(selected ? 1.08 : hovered ? 1.04 : 1);
  }
  if (entity.label) {
    entity.label.show = new C.ConstantProperty(selected || hovered);
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

      const gold = C.Color.fromCssColorString(FLAME_GOLD);
      for (const campus of floridaMapCampuses()) {
        const row = rosterRowFor(campus.id);
        const { lat, lng } = campusLatLng(campus);
        const position = C.Cartesian3.fromDegrees(lng, lat);
        const number = row?.number ?? 0;
        viewer.entities.add({
          id: pinId(campus.id),
          position,
          billboard: {
            image: drawCampusPin({
              number,
              selected: false,
              hovered: false,
              flagship: Boolean(campus.flagship),
            }),
            verticalOrigin: C.VerticalOrigin.BOTTOM,
            horizontalOrigin: C.HorizontalOrigin.CENTER,
            heightReference: C.HeightReference.CLAMP_TO_3D_TILE,
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
            // Small when landed (tiles stay visible); readable on the overview.
            scaleByDistance: new C.NearFarScalar(220, 0.4, 220_000, 0.78),
          },
          label: {
            text: `${number} · ${campus.city}`,
            font: "600 12px Roboto, system-ui, sans-serif",
            fillColor: C.Color.WHITE,
            outlineColor: C.Color.fromCssColorString("#0b1c33"),
            outlineWidth: 4,
            style: C.LabelStyle.FILL_AND_OUTLINE,
            verticalOrigin: C.VerticalOrigin.BOTTOM,
            pixelOffset: new C.Cartesian2(0, -42),
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
              return 8 + 16 * (0.5 + 0.5 * Math.sin(t * Math.PI * 2));
            }, false),
            semiMinorAxis: new C.CallbackProperty(() => {
              const t = (performance.now() / 1000) * 1.7;
              return 8 + 16 * (0.5 + 0.5 * Math.sin(t * Math.PI * 2));
            }, false),
            material: gold.withAlpha(0.28),
            outline: true,
            outlineColor: gold.withAlpha(0.75),
            heightReference: C.HeightReference.CLAMP_TO_3D_TILE,
          },
        });
      }

      void Promise.all(
        floridaMapCampuses().map(async (campus) => {
          const loc = await resolveCampusLatLng(campus);
          if (cancelled || !viewer || viewer.isDestroyed()) return;
          const position = C.Cartesian3.fromDegrees(loc.lng, loc.lat);
          const pin = viewer.entities.getById(pinId(campus.id));
          const pulse = viewer.entities.getById(pulseId(campus.id));
          if (pin) pin.position = new C.ConstantPositionProperty(position);
          if (pulse) pulse.position = new C.ConstantPositionProperty(position);
        }),
      );

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
        setEngineReady(true);
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
      const row = rosterRowFor(campus.id);
      const pin = viewer.entities.getById(pinId(campus.id));
      const pulse = viewer.entities.getById(pulseId(campus.id));
      if (pin) stylePin(C, pin, selected, hovered, row?.number ?? 0, Boolean(campus.flagship));
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
      return flyToCampusPoi(C, viewer, campus, compact, animate);
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
