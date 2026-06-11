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
| `online.jpg`           | Keiser University Online         |

Notes:
- Any web-image format works if you match the extension the data expects
  (`.jpg` by default). To use a different name or a remote URL, set the
  `photo` field on that campus in `src/lib/campus-data.ts`.
- Landscape images around **1200×800** look best; they're cropped to fill.
- If a file is missing, the panel falls back to the brand gradient — nothing
  breaks.
- These should be **official Keiser University photography** (or properly
  licensed images). The app ships without any bundled photos.
