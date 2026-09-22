# Inspection crops: sources

Cut by `scripts/design/session-b-crops.mjs --surface inspection` and by nothing
else. Render: `F6A8A482-657B-4836-B30A-1A0578BC3FBA.png` at the repo root,
1024 x 1536, phone screen 668 render px wide (one CSS px at 390 is 0.584
render px). Boxes are left, top, width, height in render px.

Treatment for every file: plane-fit ground subtraction on a ring at the box
edge, brightest-channel key to alpha (floor 12, ceiling 210), unpremultiplied,
alpha feathered over the outer band of the box, WebP with alpha, never
upscaled. Each object also has a `-day` cut with the floor lifted (house 70,
plates 40) so the faint night bloom, which reads as a smudge on paper, drops
out; the light theme swaps to it. No lettering in any of them.

| File | Box | Source size | Displayed at 390 | Sharpness at 2x / 3x |
|---|---|---|---|---|
| `house-check.webp`, `-day` | 622, 196, 186, 140 | 186 x 140 | 110 x 83 CSS px | 0.85 / 0.56 of the pixels needed: slightly soft at 3x |
| `plate-exterior.webp`, `-day` | 226, 663, 50, 50 | 50 x 50 | 40 x 40 | 0.63 / 0.42: visibly soft at 3x |
| `plate-interior.webp`, `-day` | 226, 717, 50, 50 | 50 x 50 | 40 x 40 | same |
| `plate-safety.webp`, `-day` | 226, 989, 50, 50 | 50 x 50 | 40 x 40 | same |
| `plate-overall.webp`, `-day` | 226, 1045, 50, 50 | 50 x 50 | 40 x 40 | same |

The softness is the render's own resolution: the plates are 48 render px
across, so no crop of them can be sharper than that. Nothing was sharpened or
upscaled to hide it.

What each plate stands for in the built checklist (four rungs, see
`components/app/inspections/ladder.ts`): exterior (house) for "Viewing
requested", safety (shield with tick) for "Time agreed", interior (sofa) for
"Viewing happened", overall (document) for "Outcome recorded".

Not cropped: the app icon tile and wordmark (shared app header, not this
surface), the status bar, the dock, the phone frame.
