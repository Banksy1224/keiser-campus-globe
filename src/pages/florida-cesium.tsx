import { useEffect, useRef, useState } from "react";
import "../lib/cesium-base";
import {
  CallbackProperty,
  Cartesian2,
  Cartesian3,
  Color,
  ConstantProperty,
  createGooglePhotorealistic3DTileset,
  defined,
  Entity,
  GoogleMaps,
  HeightReference,
  HorizontalOrigin,
  LabelStyle,
  Math as CesiumMath,
  NearFarScalar,
  ScreenSpaceEventHandler,
  ScreenSpaceEventType,
  VerticalOrigin,
  Viewer,
  type Cartesian3 as Cartesian3Type,
} from "cesium";
import "cesium/Build/Cesium/Widgets/widgets.css";
import "./florida-cesium.css";
import { FLAME_GOLD, campusById, type Campus } from "../lib/campus-data";
import { campusLatLng, GOOGLE_KEY } from "../lib/campus-location";
import {
  FLORIDA_INTRO_SEATS,
  campusApproachSeat,
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

const GOLD = Color.fromCssColorString(FLAME_GOLD);
const PIN_PREFIX = "campus:";
const PULSE_PREFIX = "pulse:";

function seatDestination(seat: CameraSeat): Cartesian3Type {
  return Cartesian3.fromDegrees(seat.lng, seat.lat, seat.height);
}

function seatOrientation(seat: CameraSeat) {
  return {
    heading: CesiumMath.toRadians(seat.heading),
    pitch: CesiumMath.toRadians(seat.pitch),
    roll: 0,
  };
}

function applySeat(viewer: Viewer, seat: CameraSeat, animate: boolean): Promise<void> {
  if (!animate || seat.duration <= 0) {
    viewer.camera.setView({
      destination: seatDestination(seat),
      orientation: seatOrientation(seat),
    });
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    viewer.camera.flyTo({
      destination: seatDestination(seat),
      orientation: seatOrientation(seat),
      duration: seat.duration,
      complete: () => resolve(),
      cancel: () => resolve(),
    });
  });
}

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

function stylePin(entity: Entity, selected: boolean, hovered: boolean, number: number, flagship: boolean) {
  if (entity.billboard) {
    entity.billboard.image = new ConstantProperty(drawCampusPin({ number, selected, hovered, flagship }));
    entity.billboard.scale = new ConstantProperty(selected ? 1.12 : hovered ? 1.05 : 1);
  }
  if (entity.label) {
    entity.label.show = new ConstantProperty(selected || hovered);
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
}: FloridaViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Viewer | null>(null);
  const handlerRef = useRef<ScreenSpaceEventHandler | null>(null);
  const introGen = useRef(0);
  const lastFlyId = useRef<string | null | undefined>(undefined);
  const propsRef = useRef({ onHover, onSelect, onIntroFinished, compact });
  propsRef.current = { onHover, onSelect, onIntroFinished, compact };

  const [phase, setPhase] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const host = containerRef.current;
    const apiKey = GOOGLE_KEY;
    if (!host || !apiKey) return;

    let cancelled = false;
    const viewer = new Viewer(host, {
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
      msaaSamples: lowPower ? 1 : 4,
      useBrowserRecommendedResolution: true,
      targetFrameRate: lowPower ? 30 : undefined,
    });
    viewer.scene.backgroundColor = Color.fromCssColorString("#0b1c33");
    viewer.scene.fog.enabled = false;
    const controller = viewer.scene.screenSpaceCameraController;
    controller.minimumZoomDistance = 80;
    controller.maximumZoomDistance = compact ? 1.5e6 : 9.5e5;
    controller.enableCollisionDetection = true;
    viewer.clock.shouldAnimate = true;
    viewerRef.current = viewer;
    lastFlyId.current = undefined;

    const sites = floridaMapCampuses();
    for (const campus of sites) {
      const row = rosterRowFor(campus.id);
      const { lat, lng } = campusLatLng(campus);
      const position = Cartesian3.fromDegrees(lng, lat);
      const number = row?.number ?? 0;
      viewer.entities.add({
        id: pinId(campus.id),
        position,
        billboard: {
          image: drawCampusPin({ number, selected: false, hovered: false, flagship: Boolean(campus.flagship) }),
          verticalOrigin: VerticalOrigin.BOTTOM,
          horizontalOrigin: HorizontalOrigin.CENTER,
          heightReference: HeightReference.CLAMP_TO_3D_TILE,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
          scaleByDistance: new NearFarScalar(400, 1.1, 900_000, 0.32),
        },
        label: {
          text: `${number} · ${campus.city}`,
          font: "600 13px Roboto, system-ui, sans-serif",
          fillColor: Color.WHITE,
          outlineColor: Color.fromCssColorString("#0b1c33"),
          outlineWidth: 4,
          style: LabelStyle.FILL_AND_OUTLINE,
          verticalOrigin: VerticalOrigin.BOTTOM,
          pixelOffset: new Cartesian2(0, -56),
          show: false,
          heightReference: HeightReference.RELATIVE_TO_3D_TILE,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
      });
      viewer.entities.add({
        id: pulseId(campus.id),
        position,
        show: false,
        ellipse: {
          semiMajorAxis: new CallbackProperty(() => {
            const t = (performance.now() / 1000) * 1.7;
            return 28 + 70 * (0.5 + 0.5 * Math.sin(t * Math.PI * 2));
          }, false),
          semiMinorAxis: new CallbackProperty(() => {
            const t = (performance.now() / 1000) * 1.7;
            return 28 + 70 * (0.5 + 0.5 * Math.sin(t * Math.PI * 2));
          }, false),
          material: GOLD.withAlpha(0.28),
          outline: true,
          outlineColor: GOLD.withAlpha(0.75),
          heightReference: HeightReference.CLAMP_TO_3D_TILE,
        },
      });
    }

    const handler = new ScreenSpaceEventHandler(viewer.scene.canvas);
    handler.setInputAction((click: { position: Cartesian2 }) => {
      const picked = viewer.scene.pick(click.position);
      const id = defined(picked) ? campusIdFromEntity(picked.id as Entity | undefined) : null;
      const campus = id ? campusById(id) : null;
      if (campus) propsRef.current.onSelect(campus);
    }, ScreenSpaceEventType.LEFT_CLICK);
    handler.setInputAction((move: { endPosition: Cartesian2 }) => {
      const picked = viewer.scene.pick(move.endPosition);
      const id = defined(picked) ? campusIdFromEntity(picked.id as Entity | undefined) : null;
      propsRef.current.onHover(id);
      viewer.scene.canvas.style.cursor = id ? "pointer" : "default";
    }, ScreenSpaceEventType.MOUSE_MOVE);
    handlerRef.current = handler;

    const canvas = viewer.scene.canvas;
    canvas.setAttribute("aria-label", "Photorealistic 3D map of Keiser University Florida campuses");
    canvas.style.touchAction = "none";

    GoogleMaps.defaultApiKey = apiKey;
    void (async () => {
      try {
        const tileset = await createGooglePhotorealistic3DTileset(
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
        setPhase("ready");
      } catch (err) {
        if (cancelled) return;
        const detail = err instanceof Error ? err.message : "Unknown tileset error";
        setError(detail);
        setPhase("error");
      }
    })();

    return () => {
      cancelled = true;
      introGen.current += 1;
      handler.destroy();
      handlerRef.current = null;
      if (!viewer.isDestroyed()) viewer.destroy();
      viewerRef.current = null;
      host.replaceChildren();
    };
  }, [lowPower, compact]);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || viewer.isDestroyed()) return;

    for (const campus of floridaMapCampuses()) {
      const selected = sameMapCampus(selectedId, campus.id);
      const hovered = sameMapCampus(hoveredId, campus.id);
      const row = rosterRowFor(campus.id);
      const pin = viewer.entities.getById(pinId(campus.id));
      const pulse = viewer.entities.getById(pulseId(campus.id));
      if (pin) stylePin(pin, selected, hovered, row?.number ?? 0, Boolean(campus.flagship));
      if (pulse) pulse.show = selected;
    }
  }, [selectedId, hoveredId]);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || viewer.isDestroyed()) return;

    const gen = ++introGen.current;
    const reduce = prefersReducedMotion();
    const selected = selectedId ? campusById(selectedId) : null;

    const flyCampus = (campus: Campus, animate: boolean) => {
      lastFlyId.current = campus.id;
      const { lat, lng } = campusLatLng(campus);
      return applySeat(viewer, campusApproachSeat(lat, lng, compact, Boolean(campus.flagship)), animate);
    };

    const flyOverview = (animate: boolean) => {
      lastFlyId.current = null;
      return applySeat(viewer, floridaOverviewSeat(compact), animate);
    };

    viewer.camera.cancelFlight();

    if (playIntro && !reduce && !selected) {
      lastFlyId.current = undefined;
      void (async () => {
        for (const seat of FLORIDA_INTRO_SEATS) {
          if (introGen.current !== gen) return;
          await applySeat(viewer, seat, seat.duration > 0);
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
  }, [playIntro, selectedId, compact]);

  return (
    <div className="absolute inset-0 bg-keiser-navy">
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
