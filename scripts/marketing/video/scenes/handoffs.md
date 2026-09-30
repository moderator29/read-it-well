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

## B → C (t = 62.885 = ctx.beat(109))

Written by builder B. Section b's scenes end at 62.885 (exclusive). What is on screen at the cut:
the mist ground (the same `mist()` string as `c-kit.js`), the chapter pill (the engine's), and the
naira coin, falling. Nothing else: B's phone, cards, pointer and type are all gone by then.

### The coin (section c's `coin()` from `c-kit.js`, which B imports)

B's coin is the verified mark on card 2's back spinning off: the badge turns edge-on (rotateY to 90°)
by 61.99, then the coin carries on from 90° and falls. At 62.885 it is exactly on c's `COIN_IN`:

- **Mobile** (`b-m-checked.js` `COIN_OUT`): centre (330, 470), size 110, spin 720 (≡ 0), tilt 0,
  opacity 1, shadow 0. Moving: vy ≈ +235 px/s (down; y is `power2.in` from 400 at 62.29), spin rate
  ≈ 1,410 °/s (`power1.in` from 90° at 61.99). x and size arrive at rest (`power1.inOut`, `power2.inOut`).
  Matches c's `COIN_IN.mobile` (vy 233, vspin 1400).
- **Desktop** (`b-d-checked.js` `COIN_OUT_D`): centre (1500, 420), size 88, spin 720 (≡ 0), tilt 0,
  opacity 1, shadow 0. Moving: vy ≈ +202 px/s (down; y is `power2.in` from 360 at 62.29), spin rate
  1,200 °/s. x and size arrive at rest. Matches c's `COIN_IN.desktop`.

### Card 2 leaves to the top left (for section c, row 31)

`questionCard(ctx, parent, { q: QUESTIONS[1].q, a: QUESTIONS[1].a, box, mark: true, fontSize })`, front
text centred, turned to its answer (inner rotationY 180) from 61.09 (0.62 s, `back.out(1.4)`). Its
back is the engine's inline mark (white badge, electric tick) and "Checked by a real person at Vallo."
From 61.81 the card flies out (0.5 s, `power3.in`); from 61.83 its mark hides (the spinning twin takes over);
gone by 62.31, answer side up:

- **Mobile:** box `{ x: 110, y: 640, w: 830, h: 228 }`, fontSize 52; out with
  `{ x: -1100, y: -760, rotation: -24, scale: 0.8 }` (transform-origin 50% 50%). Last position: centre
  (−575, −6), rotation −24°, scale 0.8 = c's `CARD_OUT.mobile.c2`.
- **Desktop:** box `{ x: 1200, y: 400, w: 600, h: 160 }` (RIGHT_PANEL), fontSize 40; out to centre
  (−560, −200), rotation −22°, scale 0.8 = c's `CARD_OUT.desktop.c2`.

### Devices

- **Mobile:** B's phone left the frame at 60.58 (to the right, opacity 0). No phone at the cut; c's
  phone rises into PHONE_HIGH.
- **Desktop:** B's window (`d-verification-lt` at WINDOW_LEFT, flat, scale 0.708333, B's own
  `browserWindow`) fades out from 62.585 and is at opacity 0 at 62.885, so c's lock window
  (rising from WINDOW_LEFT y + 40, fading in from 62.845) comes up over an empty ground: a dissolve
  through the mist between two different pages. If c would rather cut straight to its window at
  full opacity on WINDOW_LEFT, B can hold its window to the cut instead: tell B.
- **Pointer:** hidden since 46.6 (both films).

### A note for section a (A → B, both films)

A's last frames show the member's sent bubble in the thread ("I like these two as well. Could we view
all three on Saturday morning?", `thread-light` display y 2398–2637 / `d-thread-lt` css y 764–823).
In B that message is sent in row 15, so B covers the bubble from 30.577 (fading the cover in over
0.3 s so nothing pops). If a covers it too (a patch of `#f3f4f1` over it from 29.39), the cut is clean.
