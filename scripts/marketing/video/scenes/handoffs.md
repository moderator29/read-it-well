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
- **The phone** (B's `A_OUT.phone`): island, black-titanium, `env: "light"`, `edge: "#f3f4f1"`.
  Pose `{ cx: 540, cy: 1500, height: 1180, rx: 0, ry: 0, rz: 0, fov: 24, opacity: 0.3 }`: sunk and
  dimmed under the receipt since row 11 (A holds it still from 29.6 on).
  Screen: the `thread-light` display, full (1320 × 2868, `ctx.src.display("thread-light")`), no
  overlays, shown since 29.39.
- **The villa card** (B's `A_OUT.villa`): at rest on the stage rect `{ x: 160, y: 498, w: 760, h: 548 }`,
  rotation 0, opacity 1.
  - It is a crop of the `thread-light` display: `{ x: 52, y: 1602, w: 1088, h: 784 }` (display px, 1320
    wide), the Maitama card in the thread.
  - Its box is the crop's own size (1088 × 784), radius 40 px, box-shadow b-kit `SHADOW.l`
    (`0 40px 90px -40px rgb(16 32 80 / 0.42), 0 10px 24px -12px rgb(16 32 80 / 0.18)`), placed with
    `quadMatrix` (engine/phone.js) onto the rect.
  - A's receipt folds into it between 30.25 and 30.577 (power3.inOut, so it arrives at rest).
  - B flies it from 30.577 into the phone and lands it on the same display rect of the thread,
    on the rising phone (B's `talk()`, card_slide at 30.8).
- **Gone before 30.577:** card 1 (see below), the receipt, the pointer. The chapter pill "The full
  cost, **up front**" ends at 30.577 (the engine fades it from 30.28).

### Desktop

- **Ground:** the same mist string as mobile.
- **The window:** `browserWindow(ctx, { width: 1020, theme: "light", url: "vallospaces.com" })` at
  WINDOW_LEFT, flat: root `x: 80, y: 150` (scale 0.708333, transform-origin 0 0), opacity 1, not
  dimmed, showing `d-thread-lt` (2880 × 1800 in the 1440 × 900 content). The pointer is hidden.
- **The villa card:** at rest on the stage rect `{ x: 1206, y: 330, w: 600, h: 405.5 }`, rotation 0,
  opacity 1.
  - It is a crop of the `d-thread-lt` capture: `{ x: 1884, y: 980, w: 796, h: 538 }` (capture px,
    2880 wide), the Maitama card in the thread.
  - Its box is the crop's own size (796 × 538), radius 26 px, box-shadow b-kit `SHADOW.l`, placed with
    `quadMatrix` onto the rect.
  - It lands on the thread's Maitama card in the window, stage rect
    `{ x: 747.25, y: 536.75, w: 281.92, h: 190.54 }` (WINDOW_LEFT: stage = 80 + css × 0.708333,
    150 + (56 + css) × 0.708333, with the card at css x 942–1340, y 490–759).

### Card 1 leaves to the top right (for section c, row 31)

Both films restyle the card's faces after building it, so it reads centred:
`front`: `justifyContent: "center", textAlign: "center", textWrap: "balance"`;
`back`: the same plus `lineHeight: "1.22"` and `fontSize` 33 px (mobile) / 31 px (desktop).

- **Mobile:** `questionCard(ctx, parent, { q: QUESTIONS[0].q, a: QUESTIONS[0].a, box: { x: 230, y: 470, w: 620, h: 170 }, fontSize: 40 })`,
  turned to its answer (inner rotationY 180) at 29.21–29.83.
  - From 30.12 it flies out with `to(root, { x: 760, y: -660, rotation: 24, scale: 0.9, duration: 0.36, ease: "power3.in" })`.
  - It crosses the frame's top edge at about x 1000, heading up and right at about 40°, and is gone
    by 30.48. Its last position: centre (1300, −105), rotation 24°, scale 0.9, answer side up.
  - Section c brings it back from there (the top right).
- **Desktop:** `questionCard(ctx, parent, { q: QUESTIONS[0].q, a: QUESTIONS[0].a, box: { x: 1250, y: 150, w: 600, h: 160 }, fontSize: 38 })`
  (top right, beside the receipt), turned to its answer at 29.21–29.83.
  - From 30.12 it flies out with `to(root, { x: 520, y: -560, rotation: 22, scale: 0.9, duration: 0.36, ease: "power3.in" })`.
  - It leaves the frame over the top right corner by about 30.45. Its last position: centre (2070, −330),
    rotation 22°, scale 0.9, answer side up.
  - Section c brings it back from there (the top right).
