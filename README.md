# Keiser University · Campus Globe

An interactive **3D model of the Keiser University campus ecosystem** — a drone /
aerial view of the world that you can zoom into to explore any individual campus.
Built as a **tour and admissions tool** for prospective students.

![globe](public/globe.svg)

## What it does

**Drone / aerial globe view**
- A rotating 3D Earth (Three.js + react-three-fiber) with a stylized holographic
  texture, atmosphere rim glow, and a starfield.
- Every Keiser campus is a glowing pin at its **real latitude/longitude** — the
  Florida campuses line the coast, the Latin American Campus sits in Nicaragua,
  and Keiser Online anchors the "global" node.
- Gold great-circle arcs link the Flagship campus to the rest of the network.
- Drag to orbit, scroll to zoom; the globe auto-rotates ("drone hover") when idle.

**Zoom into a campus → flight + 3D tour**
- Click a pin (or a campus in the left rail) and the camera **flies** there: a
  glowing aircraft marker travels a great-circle arc trailing a fading comet
  tail, while the camera swoops in and settles on the campus.
- An admissions panel opens with the campus tagline, description, established
  date, setting, signature programs, and highlights.
- **Enter 3D campus tour** drops into a stylized campus scene — buildings sized
  from each campus's skyline, a central Keiser "flame" monument, trees, and a
  plaza — with admissions CTAs.

**Guided tour (kiosk mode)**
- A **Guided tour** button auto-flies through every campus on a loop, dwelling at
  each so the flight lands and the info reads.
- A **progress indicator** along the bottom shows `Guided tour · 3 / 16`, the
  current campus name, **prev / next** skip buttons, and clickable progress dots
  for jumping straight to any campus.
- Any manual pin/list click, panel close, or entering a 3D scene pauses the tour
  so a human never fights the camera for control.

**For prospective students**
- Region filter (Florida / Latin America / Online & Global).
- Student-facing tour copy for the full campus roster.

## Tech stack

- **React 18 + TypeScript + Vite**
- **Three.js** via **@react-three/fiber** and **@react-three/drei**
- **Tailwind CSS** for the 2D admissions UI overlay

The 3D experience is code-split (lazy-loaded), so the Three.js bundle lands in
its own chunk and the initial shell stays light.

## Getting started

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check + production build
npm run preview    # preview the production build
```

## Live preview (GitHub Pages)

This repo auto-deploys to GitHub Pages on every push to `main` via
[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml).

**One-time setup:** in the repo on GitHub, go to **Settings → Pages → Build and
deployment** and set **Source = GitHub Actions**. After the next push to `main`
(or a manual run from the **Actions** tab), the site goes live at:

```
https://banksy1224.github.io/keiser-campus-globe/
```

The build runs on GitHub's runners, so it isn't affected by any local network
restrictions. The production base path is set to `/keiser-campus-globe/` in
[`vite.config.ts`](vite.config.ts); override it with the `VITE_BASE` env var if
you attach a custom domain.

## Tuning knobs

Most of the "feel" lives in constants at the top of
[`src/pages/campus-map.tsx`](src/pages/campus-map.tsx):

| Constant          | Meaning                                          |
| ----------------- | ------------------------------------------------ |
| `FLIGHT_SECONDS`  | Duration of a single campus-to-campus flight     |
| `FOCUS_DISTANCE`  | Camera distance when settled on a campus         |
| `ORBIT_DISTANCE`  | Resting "drone" altitude over the whole globe    |
| `TRAIL_FADE`      | Length of the comet tail behind the aircraft     |
| `TOUR_DWELL_MS`   | Guided-tour pause at each campus                  |

## Data caveat

Campus coordinates are real, and the roster reflects Keiser's known campuses, but
the descriptions, program lists, and details are written as **plausible
admissions copy**. Reconcile against official Keiser data before using with live
prospects.
