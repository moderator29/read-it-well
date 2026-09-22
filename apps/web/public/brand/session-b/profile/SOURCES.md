# Profile: paper renditions of the five row objects

Cut by `scripts/design/session-b-crops.mjs` (block PROFILE). Do not edit by hand;
change the script and re-run `node scripts/design/session-b-crops.mjs --surface profile`.

Render: `50E032EA-4141-4237-88D5-01B3720D87B6.png` (repo root), 1024x1536, phone
screen 658 image px wide (1.69 image px per CSS px at 390).

The night objects are the shared pack's own crops of this render
(`public/brand/glass/<name>.png`, boxes in `scripts/icon-manifest.mjs`). These
files are their PAPER renditions, cut from the same boxes: keyed with the
plane-fit ground and brightest-channel key; everything outside the tile's own
rounded square (measured: 84 px at 5,5 in each row box, radius 17; 73 px at 7,11
in the Switch role box, radius 15) dropped as bloom and page; faint pixels inside
the square kept as glass body so the tile has no holes; and every pixel re-inked on the brand ramp by how lit it was, from
`#9CC2FF` (glass body) to `#06379A` (the brightest line work and rim), the
method `docs/design/GLOW_IDENTITY.md` section 4 sets. A derived rendition, not
commissioned light artwork.

| File | Box (left, top, w, h) | Displayed at |
|---|---|---|
| `calendar-grid-day.webp` | 231, 657, 96, 96 | 57 CSS (its square on the 49 plate) |
| `bookmark-ribbon-day.webp` | 231, 781, 96, 96 | 57 |
| `wallet-tile-day.webp` | 231, 906, 96, 96 | 57 |
| `shield-check-tile-day.webp` | 231, 1031, 96, 96 | 57 |
| `role-switch-tile-day.webp` | 229, 1174, 84, 84 | 50 (its square on the 44 plate) |

Resolution: 96 source px for 57 CSS px is 1.7 px per CSS px, so at 2x and 3x the
files are upscaled by the browser and read slightly soft. Honest limit of the
render; nothing is sharpened.
