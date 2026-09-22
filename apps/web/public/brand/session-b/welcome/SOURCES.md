# Get started crops

Cut by `scripts/design/session-b-crops.mjs` (block WELCOME). Do not edit by
hand; change the script and re-run it.

| File | Render | Box (left, top, w, h, render px) | Treatment | Drawn at 390 |
|---|---|---|---|---|
| `stage-worlds.webp` | `2A49E2F7-F99C-47D3-BB79-075DCC1A0F5D.png` | 194, 560, 636, 530 | Stage with its dark ground. PROPERTY, STAYS and the HOTEL lettering retouched out by harmonic fill from the surrounding glass; the coin's body retouched out (the live CSS coin stands there); edges feathered to transparent (12/12/44/56 px, smoothstep). WebP q90 with alpha. | 380 x 317 css |
| `stage-tiles.webp` | `2A49E2F7-F99C-47D3-BB79-075DCC1A0F5D.png` | same | As above, and the house and the hotel retouched out of the two tiles, so slides two to four stand their own glass objects in them. | 380 x 317 css |

| `coin-face.webp` | `2A49E2F7-F99C-47D3-BB79-075DCC1A0F5D.png` | ellipse centre 515, 884, semi axes 80 and 52, long axis 20 deg from vertical | The drawn coin's front face, un-projected from its mid-turn ellipse to the circle it is a view of (short axis x 80/52), bilinear, masked to the circle with a 1 px soft edge. WebP q92 with alpha. Both faces of the live CSS coin. | 160 px source for a 96 css face: sharp at 1x, the browser scales it 2x at 2x |

Resolution: the source box is 636 px wide for 380 css px, 1.67 source px per
css px. A 3x phone asks for 1140, so the stage is visibly softer than live
text at 3x and matches it at 2x. Nothing is upscaled.
