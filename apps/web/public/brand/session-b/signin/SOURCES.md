# Welcome back: art cropped from the governing render

Render: `55A56F21-0654-4F2D-984B-60A8CE97BB17.png` (repo root), 1024 x 1536.
Cut by `node scripts/design/session-b-crops.mjs --surface signin`. Re-run that command to
rebuild both files; never edit them by hand.

| File | Box in render px (left, top, w, h) | Treatment | Display |
| --- | --- | --- | --- |
| `stage.webp` | 0, 0, 1024, 1536 (whole render), on a 3072 x 2304 canvas | Painted UI lifted out by normalised convolution (holes: 280, 170, 464, 516 for the tile, wordmark and slogan; 150, 664, 724, 674 for the card and its bloom), filled with the render's own light at three reaches. Plinth untouched. Extended 1024 px each side and 768 below by continuing the light from just inside the render's vignette (110 px sides, 40 px foot; the band eases into it), blurred at 20 then 64 px and dimmed up to 85 per cent with distance; feathered to transparent 260 px at the sides, 300 at the foot, 120 at the top. WebP q80 with alpha. | 3072/633 of the card wide, anchored so render y 1500 sits at the podium room's foot: 1165 CSS px at 390, so no edge is ever in frame on a phone |
| `lockup.webp` | 280, 176, 464, 452 | The app tile and the chrome wordmark as drawn, with the render's own gap between them. Keyed, not boxed: outside the tile (render box 380, 222 to 642, 502, corner 52) the sky is keyed out on the brightest channel (floor 110, span 150) so only light stays; inside the tile the glass is kept whole with a 6 px soft edge; a 30 px edge feather (14 at the foot). WebP q90 with alpha. | 464/633 of the card: 176 CSS px at 390, 205 at 640 and up |

What is NOT in either file, on purpose:
- The slogan "Real Estate reimagined!" (founder, 22 September; the claims
  rule). It sits inside the lifted hole in `stage.webp` and below the
  `lockup.webp` box, which ends at y 628, above the slogan's caps at y 636.
- The card, its words, the field, the buttons, OR and the sign-up line. All
  of it is live HTML over the stage.

Resolution: both files are only as sharp as the render. At 390 CSS px on a
3x screen the lockup draws 528 device px from 464 source px (1.14x) and the
render part of the stage 1164 from 1024 (1.14x); at 2x both are under 1x.
No upscaling filter has been applied.
