# Campus photos

Drop a real campus photo here named after the campus `id`, and it will appear
automatically as the hero image in that campus's info panel.

| File name              | Campus                          |
| ---------------------- | ------------------------------- |
| `flagship.jpg`         | Flagship Residential Campus      |
| `fort-lauderdale.jpg`  | Fort Lauderdale Campus           |
| `orlando.jpg`          | Orlando Campus                   |
| `tampa.jpg`            | Tampa Campus                     |
| `miami.jpg`            | Miami Campus                     |
| `jacksonville.jpg`     | Jacksonville Campus              |
| `tallahassee.jpg`      | Tallahassee Campus               |
| `sarasota.jpg`         | Sarasota Campus                  |
| `daytona.jpg`          | Daytona Beach Campus             |
| `melbourne.jpg`        | Melbourne Campus                 |
| `lakeland.jpg`         | Lakeland Campus                  |
| `naples.jpg`           | Naples Campus                    |
| `port-st-lucie.jpg`    | Port St. Lucie Campus            |
| `new-port-richey.jpg`  | New Port Richey Campus           |
| `latin-american.jpg`   | Latin American Campus (Nicaragua)|
| `santa-cruz.jpg`       | International University of Santa Cruz (Bolivia) |
| `ista-ecuador.jpg`     | Instituto Superior Técnico Americano (Ecuador) |
| `usil-peru.jpg`        | Center for Global Education at USIL (Peru) |
| `spain.jpg`            | American College in Spain        |
| `garodia-india.jpg`    | Garodia International College (India) |
| `sampoerna-indonesia.jpg` | Sampoerna University (Indonesia) |
| `sri-lanka.jpg`        | American College of Higher Education (Sri Lanka) |
| `vietnam.jpg`          | Keiser University Vietnam        |
| `online.jpg`           | Keiser University Online         |

Provided so far: **Flagship** (`flagship.jpg` + `flagship-2.jpg` gallery +
`flagship-aerial.webp` billboard), **Fort Lauderdale** (`fort-lauderdale.jpg`),
**Tampa** (`tampa.webp`), **Miami** (`miami.jpg`),
**West Palm Beach – Jog Road** (`west-palm-beach.jpg` + `west-palm-beach-2.png`),
**Pembroke Pines** (`pembroke-pines.jpg`), **Port St. Lucie**
(`port-st-lucie.jpg`), **Melbourne** (`melbourne.jpg`), **New Port Richey** (`new-port-richey.jpg`), **Naples** (`naples.jpg`), **Orlando** (`orlando.jpg`), **Lakeland** (`lakeland.jpg`), **Clearwater** (`clearwater.png`), **Fort Myers** (`fort-myers.jpg`), **Jacksonville** (`jacksonville.jpg`), **Tallahassee** (`tallahassee.png`), **Graduate School –
Fort Lauderdale** (`graduate-school.jpg`), **eCampus – Online Undergraduate**
(`e-campus.jpg`), **Latin American Campus – San Marcos, Nicaragua**
(`latin-american.jpg`), and **Language Center – Managua, Nicaragua**
(`managua-language-center.png`).

Multiple photos per campus:
- `photo` (or the default `<id>.jpg`) is the primary hero image.
- `gallery: [...]` adds more hero images; the panel hero auto-rotates through them.
- `photoAlt` is shown on the 3D campus-scene billboard.
All paths are resolved base-aware, so they work on the GitHub Pages sub-path.

Notes:
- Default convention is `<id>.jpg`. For any other format/name (e.g. `.webp`,
  `.png`) or a remote URL, set the `photo` field on that campus in
  `src/lib/campus-data.ts` (e.g. Tampa uses `photo: "campuses/tampa.webp"`).
  Paths are resolved base-aware, so they work on the GitHub Pages sub-path.
- Landscape images around **1200×800** look best; they're cropped to fill.
- If a file is missing, the panel falls back to the brand gradient — nothing
  breaks.
- These should be **official Keiser University photography** (or properly
  licensed images). The app ships without any bundled photos.
