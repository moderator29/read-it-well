# Handoffs between sections

Each builder records here the exact state of the objects it hands over. At the
hand-off time both sections render the same pixels: the outgoing section's
scenes end at the hand-off time (exclusive), the incoming section's start at it.

## A → B (t = 30.577 = ctx.beat(53))

Written by builder A. **Mobile follows builder B's `A_OUT` in `b-m-talk.js` exactly**, so
nothing on B's side needs to change. Everything is at rest at 30.577 (A's moves
end with zero velocity there; B's moves start from rest).

### Mobile

- **Ground:** the shared mist (same string as `b-kit.js` / `c-kit.js` `mist()`):
  `radial-gradient(70% 45% at 50% 42%, rgb(0 105 254 / 0.07) 0%, rgb(0 105 254 / 0) 70%), linear-gradient(180deg, #ffffff 0%, #f6f9ff 38%, #f3f7ff 70%, #ecf2ff 100%)`.
  Nothing else on the ground (no sparkles, no rings).
- **The phone** (`a-m-receipt.js` `A_OUT.phone`): island, `env: "light"`, `edge: "#f3f4f1"`.
  **Round 2 / v3.2: the film's one phone size.** Pose `{ cx: 540, cy: 1500, height: 1400, rx: 0, ry: 0, rz: 0, fov: 24, opacity: 0.3 }`.
  **b-m-talk.js `A_OUT.phone` still says `height: 1180`: it must change to 1400** (nothing else changes).
  - The phone fades to 0 as the receipt lifts (23.77-24.07; no ghost under the receipt), sinks to the pose above
    while invisible, and fades back 0 -> 0.3 over 30.207-30.557 (power1.inOut), so it is at rest at 0.3 at the cut.
  - Screen: `thread-light`, full (1320 × 2868), shown from 29.39 (while invisible), with the member's unsent bubble
    covered by the same patch B lays (display `{ x: 101, y: 2395, w: 1058, h: 252 }`, `#f3f4f1`).
- **The villa card** (B's `A_OUT.villa`): at rest on the stage rect `{ x: 160, y: 498, w: 760, h: 548 }`,
  rotation 0, opacity 1. A crop of `thread-light` display `{ x: 52, y: 1602, w: 1088, h: 784 }`, radius 40 px,
  box-shadow b-kit `SHADOW.l`, placed as a 2D `matrix()`.
  - The receipt (RECEIPT_M `{ x: 150, y: 390, w: 780, h: 820 }`) folds into it in one scaling move, 30.117-30.577
    (power3.inOut, arrives at rest); the villa crop cross-fades in over the last 0.2 s.
- **Gone before 30.577:** the receipt, the pointer. Card 1 stays at rest (below). The chapter pill "The full cost, **up front**"
  ends at 30.577 (the engine fades it).

### Desktop

- **Ground:** the same mist string as mobile.
- **The window:** A's `browserWindow` (light, `vallospaces.com`, the same geometry as round 1) at WINDOW_LEFT, flat: root `x: 80, y: 150, scale 0.708333` (transform-origin 0 0), opacity 1, undimmed,
  showing `d-thread-lt` with its unsent bubble covered (css `{ x: 851, y: 763, w: 495, h: 64 }`, `#f3f4f1`).
  - Round 2: the window only moves (LOW_REST `{ x: 153.6, y: 236.7, s: 1.12 }` -> WINDOW_LEFT), swaps to the thread
    (cross-fade 0.25 s) and undims under the fold, 30.117-30.577 (power3.inOut; at rest at the cut). Nothing moves
    behind the payoff before that. The pointer is hidden.
- **The villa card:** at rest on the stage rect `{ x: 1206, y: 330, w: 600, h: 405.5 }`, rotation 0, opacity 1:
  a crop of `d-thread-lt` capture `{ x: 1884, y: 980, w: 796, h: 538 }`, radius 26 px, `SHADOW.l`, 2D `matrix()`.
  The receipt folds into it in one scaling move, 30.117-30.577, the crop cross-fading in over the last 0.2 s.

### Card 1: at rest, answer up, at the cut (section b takes it over)

A leaves card 1 still on screen at 30.577; B rebuilds it answer-side-up in the same rest box, holds it to 31.30, and
flies it out to section c's end points (mobile centre (1300, −105), 24°, 0.9; desktop centre (2070, −330), 22°, 0.9).

Both films: `questionCard(ctx, parent, { q: QUESTIONS[0].q, a: QUESTIONS[0].a, box, fontSize })`, root transform-origin
the engine default (50% 50%), scale 1, opacity 1, inner scaleX 1, the back face showing (turned by the engine's flat
turn at 28.566; the answer opened at 28.866 and has been still since about 29.19). Faces restyled after building:
`front`: `justifyContent: "center", textAlign: "center", textWrap: "balance"`; `back`: the same plus
`lineHeight: "1.22"` and the `fontSize` below. It came in with its question at 24.947 (0.5 s) and has not moved since 25.45.

- **Mobile:** `box: { x: 230, y: 1246, w: 620, h: 170 }`, `fontSize: 40`, back `fontSize: "33px"`. Rest transform
  `x 0, y 0, rotation −2°` (centre (540, 1331)), under the receipt and above the v3.3 caption band (1520–1640).
  (Round 3: moved up from y 1380 for the new caption band.)
- **Desktop:** `box: { x: 1384, y: 150, w: 500, h: 160 }`, `fontSize: 34`, back `fontSize: "28px"`. Rest transform
  `x 0, y 0, rotation 3°` (centre (1634, 230)), at the right of the receipt. During A's fold (30.117–30.577) the
  folding receipt passes under it (card z above); at the cut the villa card `{ x: 1206, y: 330, w: 600, h: 405.5 }`
  sits just below it (the card's lowest corner is at about y 323).

## B → C (t = 62.885 = ctx.beat(109))

Written by builder B (round 3, storyboard v3.3). Section b's scenes end at 62.885 (exclusive).

### The coin (section c's `coin()` from `c-kit.js`, which B imports)

Card 2's verified mark spins off at 62.57 (`markToCoin`, flip 0.06): the badge turns edge-on (rotateY to
90°) by 62.63, then the coin carries on from 90°, rises to its peak and falls. At 62.885 it is exactly on
c's `COIN_IN`:

- **Mobile** (`b-m-checked.js` `COIN_OUT`): centre (330, 470), size 110, spin 720 (≡ 0), tilt 0, opacity 1,
  shadow 0; moving down at 233 px/s (`power2.in` from y 450 at 62.713) and spinning at 1,400 °/s; x and size
  arrive at rest. Matches `COIN_IN.mobile` (vy 233, vspin 1400).
- **Desktop** (`b-d-checked.js` `COIN_OUT_D`): centre (1500, 420), size 88, spin 720 (≡ 0); 200 px/s down
  (from y 400 at 62.685) and 1,200 °/s; x and size at rest. Matches `COIN_IN.desktop`.

### Card 2 leaves to the top left (for section c, row 31)

`questionCard(ctx, parent, { q: QUESTIONS[1].q, a: QUESTIONS[1].a, box, mark: true, fontSize })` (the
engine's flat turn), in on "person" (59.30), turned at 60.40, answer held to 62.55 (2.15 s). Its back: the
engine's inline mark and "Checked by a real person at Vallo.", balanced on two lines. From 62.55
(`ctx.beat(108.42)`) it flies out over 0.3 s (`power3.in`), gone by 62.85, answer side up; its own mark
hides from 62.57 (the spinning twin takes over).

- **Mobile:** box `{ x: 60, y: 380, w: 640, h: 228 }` (over the live phone's left third), fontSize 44 (back
  38 px, line height 1.22); out to centre (−575, −6), rotation −24°, scale 0.8 = c's `CARD_OUT.mobile.c2`.
- **Desktop:** box `{ x: 1200, y: 400, w: 600, h: 160 }`, fontSize 40; out to centre (−560, −200), rotation
  −22°, scale 0.8 = c's `CARD_OUT.desktop.c2`.

### Devices

- **Mobile:** B's phone (verification-lt at PHONE_HIGH, live, no wash) sinks out of the bottom from 62.55
  and is below the frame by 62.79. Nothing of B's but the coin and the ground is on screen at the cut.
- **Desktop:** B's window shows `d-verification-lt` at the hero scale under card 2 (its right third under a
  30% veil until 62.85), then settles from 62.48 (`ctx.beat(108.3)`) back to WINDOW_LEFT (flat, scale
  0.708333, x 80, y 150, opacity 1), at rest on the cut, so c's lock window can start at full opacity in the
  same place (an in-place page cut on beat 109).
- **Pointer:** hidden since 46.6 (both films).
- **Pill:** "Checked by a **person**", unchanged across the cut.

### A note for section a (A → B, both films)

B covers the member's sent bubble at full opacity from 30.577 (same patch as A's), so A's cover from 29.39
carries straight across the cut. B takes card 1 over at the cut: it holds A's end state to 31.30, then flies
out to the top right (c's return geometry unchanged), so A should drop its own card 1 exit.
The chapter pill "Talk straight to the **lister**" starts at b(53) (`chapters.js`), so the pill rolls from
"The full cost, up front" to it on the cut instead of fading out at 30.28.
