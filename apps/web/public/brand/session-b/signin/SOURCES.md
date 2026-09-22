# Welcome back: art cropped from the governing render

Render: `55A56F21-0654-4F2D-984B-60A8CE97BB17.png` (repo root), 1024 x 1536.
Cut by `node scripts/design/session-b-crops.mjs --surface signin`. Re-run that command to
rebuild both files; never edit them by hand.

| File | Box in render px (left, top, w, h) | Treatment | Display |
| --- | --- | --- | --- |
| `stage.webp` | 0, 0, 1024, 1536 (whole render) | Painted UI lifted out by normalised convolution (holes: 280, 170, 464, 516 for the tile, wordmark and slogan; 150, 664, 724, 674 for the card and its bloom), filled with the render's own surrounding light at three reaches. Plinth from y 1338 down untouched. Edges feathered to transparent: 60 left and right, 120 top, 40 bottom. WebP q82 with alpha, 1024 wide. | Behind the auth stage at 1024/633 of the card's width, anchored so render y 1336 sits on the card's foot: 579 CSS px wide at 390, 680 at 640 and up |
| `lockup.webp` | 280, 176, 464, 452 | The app tile and the chrome wordmark as drawn, with the render's own gap between them. Keyed, not boxed: outside the tile (render box 380, 222 to 642, 502, corner 52) the sky is keyed out on the brightest channel (floor 70, span 150) so only light stays; inside the tile the glass is kept whole with a 6 px soft edge; a 12 px edge feather. WebP q90 with alpha. | 464/633 of the card: 262 CSS px at 390, 308 at 640 and up |

What is NOT in either file, on purpose:
- The slogan "Real Estate reimagined!" (founder, 22 September; the claims
  rule). It sits inside the lifted hole in `stage.webp` and below the
  `lockup.webp` box, which ends at y 628, above the slogan's caps at y 636.
- The card, its words, the field, the buttons, OR and the sign-up line. All
  of it is live HTML over the stage.

Resolution: both files are only as sharp as the render. At 390 CSS px on a
3x screen the lockup draws 786 device px from 464 source px (1.7x) and the
stage 1737 from 1024 (1.7x). At 2x both are about 1.1x. The lockup is
therefore slightly soft on 3x phones; no upscaling filter has been applied.
