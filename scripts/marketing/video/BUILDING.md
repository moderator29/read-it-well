# Building the films

Read, in this order: `STORYBOARD.md` (what to build), `FACTS.md` (the only source for words and numbers on screen), `../DESIGN.md` (brand and copy rules), then this page. The engine is in `engine/`, the scenes in `scenes/`.

## How a film is made

- `engine/film.html?film=mobile|desktop&ending=soon|live` builds one paused GSAP timeline from the scene modules listed in `scenes/index.js`, and exposes `window.__film.seek(t)`.
- `engine/render.mjs` opens the page in headless Chromium, seeks every frame and pipes the screenshots into ffmpeg. The sound comes from `scripts/marketing/audio/mix.py`, fed with the voice plan in `timeline.json` and the effect cues the scenes register.
- **One clock:** `timeline.json` (104 BPM from t = 0, beat 0.5769 s). The rows in `rows.py` start and end on beats. Anchor everything to `ctx.beat(k)`, `ctx.bar(n)` or `ctx.word(sentence, "word")`, never to typed-in seconds.

## Determinism (a frame must render the same every time, in any order)

- Every animated value comes from the timeline (`ctx.tl`) or a per-frame hook (`ctx.onFrame(t => ...)`) that reads only `t` and GSAP-driven values.
- No `setTimeout`, `requestAnimationFrame`, `Date`, `Math.random` (use `ctx.random(seed)`), CSS animations or transitions, videos or GIFs.
- Use `fromTo` (or `set` then `to`) so starting values never depend on history.
- Check with: `node engine/render.mjs --film mobile --check 8 --from <a> --to <b>`. It must say 8/8.

## The context (`ctx`, engine/core.js)

- **Size:** `ctx.film`, `ctx.isMobile`, `ctx.W`, `ctx.H`.
- **Time:**
  - `ctx.T`: timeline.json.
  - `ctx.beat(k)`, `ctx.bar(n, beats)`, `ctx.sentence(i)`, `ctx.word(i, "word", nth)`.
- **Scenes:** `ctx.scene(id, start, end, { z })` returns a full-stage layer shown for `start ≤ t < end`.
  - Let neighbouring scenes overlap by a few frames at a transition.
  - Never tween a scene root's visibility; animate its children.
- **DOM:** `ctx.el(tag, props, parent)` and `ctx.img(src, props, parent)` (always use this for images: they are decoded before frame one and painted synchronously).
- **Assets:**
  - `ctx.sticker(code, size, parent)` for Fluent stickers, at most about 220 px on screen.
  - `ctx.icon(name, { size, stroke }, parent)` for lucide icons.
- **Paths** (`ctx.src`):
  - `capture(id)`: `docs/marketing/source/<id>.webp`, 1320 × 2682 web view, or 2880 × 1800 for `d-*`.
  - `display(id, "ios"|"android")`: the full phone display with its status bar, 1320 × 2868.
  - `photo(name)`, `art(name)`, `brand(name)`, `asset(name)`.
- **Text and sound:**
  - `ctx.text(node, t => string)`: text that changes with time.
  - `ctx.sfx(name, t, { offset, pan })`: sound cues from the audio kit (index in `scratchpad/audio/out/sfx/index.json`), only for real on-screen actions and scene changes. `offset` is dB relative to the kit's own calibrated level (0 = the kit's level); the storyboard's Sound column gives the offsets, and the mixer caps every effect under the voice.
  - `ctx.hideCaptions(t0, t1)`: for rows marked "off".
- **Timeline:** `ctx.tl`, the master timeline. Eases: `land`, `leave`, `glide`, `whip`, `drift`, plus GSAP's own. Nothing linear.

## Components (engine/components.js, engine/phone.js)

- **Backgrounds:** `bgNavy`, `bgDusk`, `bgStudio`, `glow`.
- **Type:** `words(ctx, text, { cls, style, parent })` returns masked words to reveal (`yPercent: 115 → 0`).
- **Pop-ups:** `popup(ctx, { theme, sticker | icon, title, line, example })` and `popIn(ctx, card, t, { from, tOut })`. There are at most two notification cards per film, and they are listed in the storyboard.
- **Numbers:** `countUp(ctx, node, { from, to, t0, t1 })` and `naira(n)`.
- **Taps and pointer:** `tap(ctx, phone.screen, { x, y, t })` (display px); `cursor(ctx, parent)` and `click(ctx, pointer, t, { ringParent, x, y })`.
- **Windows:** `browserWindow(ctx, { parent, width, url })` returns `{ root, content, url }`. The content is 1440 × 900 CSS px; put `d-*` captures in it at 1440 × 900.
- **Question cards:** `questionCard(ctx, parent, { q, a, box, mark })` has `.turn(t)`. Take the boxes and texts from `scenes/layout.js` (`LAYOUT`, `QUESTIONS`).
- **The phone:** `phone(ctx, { model: "island"|"android", parent, z, edge })`.
  - Animate `p.pose` (`cx, cy, height, rx, ry, rz, fov, opacity`) with GSAP, never the elements.
  - Put the screen's content in `p.screen` (1320 × 2868 display px, status bar included when you use `ctx.src.display`).
  - It is the photoreal 3D phone (three.js, `phone3d/browser/live.js`) with the HTML display mapped onto it, so anything in `p.screen` (taps, overlays, scrolls) is under the glass.
  - Set `edge` to the display's top colour (for example `#030a2a`) so the bleed matches.

## The reference film's devices, in Vallo's form (engine/components.js; see REFERENCES.md)

- **The glossy pointer:** `orb(ctx, parent)` (animate its x and y: its centre) and `press(ctx, pointer, t, { ringParent, x, y })`. It stands in for the finger in both films; on mobile it hovers just above the phone's glass, and the tap ripple (`tap`) goes under the glass.
- **Bodies:** `bodyFromImage(ctx, parent, { src, crop: { x, y, w, h, iw }, scale, x, y, light })` lifts a real part of a capture off the screen as a floating card (crop in capture px; `iw` is the capture's width). Add `bob(ctx, node, { seed })` for the slow float. Use real components only.
- **Type:** `words(...)` for kinetic words (give each word its own small y offset and size for the staggered look; the key word electric blue). `squiggle(ctx, parent, { x, y, w, t })` draws an underline, used only in rows 13 and 40.
- **Rings and sparkles:** `ringBurst(ctx, parent, { cx, cy, r, t })` only in rows 04, 19, 23 and 40. `sparkles(ctx, parent, { area, count, seed, t0, t1 })`, a few per chapter.
- **Numbers:** `odometer(ctx, parent, { value, t0, t1, fontSize })` rolls a total into place, left to right, blurred while it rolls.
- **The chapter pill** is installed by the engine from `scenes/chapters.js` (the schedule and the ground's light or dark, `ctx.groundAt(t)`). Don't build your own. Your big opening words must shrink into the PILL box (layout.js) just before the pill's start.
- **Light chapters** use the light-theme captures: `<id>-lt` (and the older `home-light`, `search-light`, `listing-light` (the Karsana terrace), `listing-cost-light`, `stays-light`, `stay-light`, `restaurant-light`, `thread-light`, `saved-light`, `d-*-light`). In a light chapter the phone uses `phone(ctx, { env: "light", edge: "#ffffff" })`.
- **Vallo's 3D icons** (`/repo/apps/web/public/brand/3d/<name>@2x.webp`) appear in the films **only as part of a real component** (the home tiles, the rows of "Add a workspace", an empty state), at most about 180 px. The founder's ruling.

## Layout and safe zones

`scenes/layout.js` holds the handoff boxes (`PHONE_HERO`, `PHONE_HIGH`, `WINDOW_HERO`, `CARDS_OPEN`, `CARD_SLOT`, `RECEIPT`, `PILL`, `PILL_SWITCH`, ...). Where a number in STORYBOARD.md and layout.js differ, layout.js wins (it was corrected after the storyboard to keep the pill, the receipt and the answered cards apart). A carried object ends its row exactly on the box the next row starts from.
- **Mobile:** key content inside y 285–1635 and x 44–940; the captions band y 1230–1360 stays clear while captions are on; phone UI to be read inside y 130–1430.
- **Desktop:** the captions band is y 915–1005.

## Performance (every frame is rendered on a CPU)

- No CSS `filter: blur()` on large elements. Use radial gradients for glows; `glow()` already does.
- Use `backdrop-filter` only on small cards (pop-ups, captions).
- No full-stage blend modes.
- Keep big images at their natural size or smaller.
- Aim for under 350 ms per frame for the page (the 3D phone adds about 400 ms when it moves).

## Previews

Run everything from `scripts/marketing`:
```
node video/engine/render.mjs --film mobile --stills 12.3,14.0 --out <dir>/x.mp4       # PNG stills at those times
node video/engine/render.mjs --film mobile --sheet 0.2 --from 8.65 --to 15 --out <dir>/x.mp4   # a contact sheet, one frame every 0.2 s
node video/engine/render.mjs --film mobile --from 8.65 --to 15 --scale 0.5 --fps 30 --workers 2 --out <dir>/clip.mp4   # a quick clip
node video/engine/render.mjs --film desktop --scenes a --check 6 --from 0 --to 30.58   # determinism
```
- `--scenes a` builds only section a.
- Clips come out silent, and `sfx-<film>.json` next to the clip lists the cues.
- Put preview output in your own folder under `/tmp/claude-0/-home-user-read-it-well/e877abda-8aaf-57c8-a7aa-c0953c2acde6/scratchpad/renders/`.
