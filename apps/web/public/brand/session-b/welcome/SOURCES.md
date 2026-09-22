# Get started crops

Cut by `scripts/design/session-b-crops.mjs` (block WELCOME). Do not edit by
hand; change the script and re-run it.

| File | Render | Box (left, top, w, h, render px) | Treatment | Drawn at 390 |
|---|---|---|---|---|
| `stage-worlds.webp` | `2A49E2F7-F99C-47D3-BB79-075DCC1A0F5D.png` | 194, 560, 636, 530 | Stage with its dark ground. PROPERTY, STAYS and the HOTEL lettering retouched out by harmonic fill from the surrounding glass; the coin's body retouched out (the live CSS coin stands there); edges feathered to transparent (12/12/44/56 px, smoothstep). WebP q90 with alpha. | 380 x 317 css |
| `stage-tiles.webp` | `2A49E2F7-F99C-47D3-BB79-075DCC1A0F5D.png` | same | As above, and the house and the hotel retouched out of the two tiles, so slides two to four stand their own glass objects in them. | 380 x 317 css |

The coin's faces are `public/brand/glass/flip-coin.png`, the pack's crop of the
same two-faced glass coin from the drawer render, so no new coin crop exists.

Resolution: the source box is 636 px wide for 380 css px, 1.67 source px per
css px. A 3x phone asks for 1140, so the stage is visibly softer than live
text at 3x and matches it at 2x. Nothing is upscaled.
