# Inspection crops: sources

Cut by `scripts/design/session-b-crops.mjs --surface inspection` and by nothing
else. Render: `F6A8A482-657B-4836-B30A-1A0578BC3FBA.png` at the repo root,
1024 x 1536, phone screen 668 render px wide (one CSS px at 390 is 0.584
render px). Boxes are left, top, width, height in render px.

Treatment for every file: plane-fit ground subtraction on a ring at the box
edge, brightest-channel key to alpha (floor 12, ceiling 210), unpremultiplied,
alpha feathered over the outer band of the box, WebP with alpha, never
upscaled. No lettering in it. Dark only: the daylight cut was withdrawn when
the founder removed light mode on 23 September.

| File | Box | Source size | Displayed at 390 | Sharpness at 2x / 3x |
|---|---|---|---|---|
| `house-check.webp` | 622, 196, 186, 140 | 186 x 140 | 100 x 75 CSS px | 0.93 / 0.62 of the pixels needed: slightly soft at 3x |

The checklist's round plates were cropped here until 23 September. Keyed at
48 render px they came out dim on the panel, where the render draws lit
discs, so they are now drawn in CSS to the render's measured size (27.5 CSS
px) and light; see `apps/web/src/app/css/inspection.css`, `.nf-ix-step__plate`.

Not cropped: the app icon tile and wordmark (shared app header, not this
surface), the status bar, the dock, the phone frame.
