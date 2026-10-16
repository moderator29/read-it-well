# The 16 October upgrade: containers, deep transitions, more motion

The founder, 16 October 2026, with five pump.fun App Store images as the
blueprint:

> I need those pop op containers I circle the way it's but in our own brand
> identity the kind of container and tick edges it have I need them in the
> films I need more transition in the films like deep transition and also I
> need the films to be entirely upgrade!! Like so fucking slick think more
> deep more components moves more stuffs ... industry standard motion films
> ... make it A1

Three things, in this order of importance.

## 1. Deep transitions at every chapter boundary

Each film is a run of chapters, and each chapter opens its own `ground(...)`.
Where one ground ends and the next begins is a cut, and today most of those
cuts are nothing at all. Put ONE transition on each, from `kit.js`:

```js
slabWipe(ctx, t, { dir: "left" | "right" | "up" | "down", dur: 0.42 })
shutter(ctx, t, { bars: 7, dur: 0.4 })
irisTicks(ctx, t, { dur: 0.46 })      // four tick brackets close and bloom
tileFall(ctx, t, { cols: 6, rows: 10 })
whipPan(ctx, t, { dir: "left", dur: 0.26 })   // light only: pairs with a pose move
```

`t` is the cut itself: the frame where the stage is covered (or, for
`irisTicks`, at its tightest). Put it on the frame the next ground starts.

Rules:
- never the same transition twice in a row, and no transition more than four
  times in one film;
- `whipPan` is a light touch, for a quick move inside a chapter, not for a
  chapter change;
- `tileFall` and `shutter` are the loud ones: at most two each per film, and
  never over a sentence of voice that lands mid-transition;
- keep `flash(...)` where the film already uses it for a beat INSIDE a
  chapter; replace it only where it was standing in for a cut.

## 2. The pop-out container where the film holds something up

```js
popOut(ctx, parent, {
  kind: "line" | "stat" | "cells" | "counters",
  x, y,            // its CENTRE on the stage
  t0, t1,          // in and out
  size,            // the type's base size: 34 on the phone cut, 28 on desktop
  from: "below" | "above" | "left" | "right",
  tab: "Move-in total",     // the label astride the top rule (uppercased)
  tone: "dark" | "day",     // "day" on the white stages ONLY
  accent: "sky" | "electric",
  // line:     lucide, title, line, line2, amount, example
  // stat:     lucide, label, figure, unit, note
  // cells:    lucide, title, cells: [[label, value], ...], note
  // counters: items: [[lucide, text], ...]
})

figureOut(ctx, parent, { text: "₦26.1m", x, y, size, rot, t0, t1, tone })
```

Where to use it:
- anywhere the film currently lifts a rectangle off the screen only to show a
  figure: the container says it better and never cuts a sentence;
- the moments with one loud number, which get a `figureOut` beside the
  container, in the margin, never over the phone's screen;
- three to six containers per cut is the right number. It is a punctuation
  mark, not wallpaper.

Do NOT replace the drawn light bodies on the day stages (`momentCard`,
`calendarCard`, `noticeCard`, `priceCard`, `listCard`, `proofCard`,
`flowRail`). The founder chose those himself from the cut he liked. The
container joins them; it does not evict them.

## 3. More in motion

- Every container breathes already (`breathe`, default 1).
- Where a chapter has empty stage beside the phone, drift one of the brand's
  3D objects through it with `object3d(ctx, parent, { name, size, x, y, t0,
  t1, drift })`. One or two, never a cloud, never over 260 px on the phone
  cut.
- Where a number is spoken, roll it (`odometer`) rather than cutting to it.

## What must not change

- **Determinism.** Every value a function of `t`. No timers, no `Math.random`
  (use `ctx.random(seed)`), no CSS transitions.
- **The voice.** Sentence and word anchors (`s(i)`, `w(i, "word")`) are the
  clock. Nothing may move a beat off its word.
- **The captions and the chapter pill.** Captions sit at y 1580 on the phone
  cut and y 1012 on desktop; the pill is at the top. Nothing may cover
  either. Use `ctx.hideCaptions(t0, t1)` only where the film already does.
- **The copy rules** (`scripts/marketing/DESIGN.md` section 2): no invented
  numbers (every figure must be one the live screens print), no testimonials,
  no promise words, "verified" only about people, no em dashes.
- **The desktop cut shows desktop screens.** The founder's ruling, twice.

## Checking your work

```
cd scripts/marketing/video
node films/layout-check.mjs how mobile > /tmp/.../faults.json    # must be []
node engine/render.mjs --proj how --film mobile --fps 60 --ending live \
     --stills 7.0,12.5,26.1,... --out /tmp/.../x.mp4             # look at them
```

`layout-check.mjs` catches geometry (text cut with an ellipsis, a box hanging
off the frame, two labels on top of each other). It cannot see a label that
repeats the headline or a card that says what the screen beside it already
says. Look at the stills yourself, at every transition and every container
you added, before and after.

DO NOT run a full render: it takes over an hour and the session renders the
four cuts itself at the end.
