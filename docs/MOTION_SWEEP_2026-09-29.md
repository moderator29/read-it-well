# Motion sweep, 29 September 2026

Lane: motion and transitions across the platform (phone, tablet, desktop). Built on the Track M system (`docs/TRACK_M_MOTION_PLAN.md`), not beside it.

## What already exists

- **Tokens** (`packages/design-tokens/src/tokens.css`): the duration ladder (`--nf-duration-instant` to `-cinematic`, plus `-press` and `-entrance`), five eases (`--nf-ease-standard`, `-entrance`, `-exit`, `-spring`, `-press`) and three press scales (`--nf-press-scale-sm`, `--nf-press-scale`, `--nf-press-scale-lg`). Under OS reduced motion every duration collapses to 1ms and the press scales to 1.
- **The Motion setting** (`lib/motion/motion-pref.ts`, `app/css/motion-pref.css`): Cinematic, Standard, Calm and Off. It is painted on the root as `data-motion`. `lib/motion/gate.ts` and `useMotionGate` give scripts the same answer.
- **Press** on buttons, chips, tiles, cards, the dock and drawer items (`:active` using the press tokens).
- **Sheets and drawers** spring in and ease out (`overlays.css`, `Sheet.tsx`).
- **The side flip** (`SideFlip.tsx`) and the **threshold moments** (splash, door, welcome).
- **Inner entrances** (`inner-m.css`): titles, empty states, settings groups and inbox and notification rows.
- **Between pages:** only a 240ms opacity fade on `.nf-page-stage > *`. It has no direction, the same fade plays for drilling in, going back and switching tabs, and immersive routes get nothing.

## Gaps found

1. **No route transition with meaning.** Next 16.3 ships React canary, so `ViewTransition` works in the App Router with no config flag. I read `node_modules/next/dist/compiled/react` and `dist/docs/01-app/02-guides/view-transitions.md` to confirm this. Nothing in the app uses it yet.
2. **The listing photo morph is broken and risky.** `ListingCard` calls `document.startViewTransition(() => router.push(href))`. The callback returns before the route commits, so the browser captures the new state while it is still the old page, and nothing morphs. Every card also carries a permanent `view-transition-name`. The same listing appearing twice on one screen gives a duplicate name, and a duplicate name aborts any view transition on that page. The card also ignores Calm and Off.
3. **Rows had no press.** Settings rows, inbox rows, notification rows and side-nav rows answered a tap with a colour change only.
4. **The toast** has no entrance. It pops.
5. **Sub-tab underlines** jump rather than slide (profile account tabs).

## Plan (what this sweep does)

| Piece | How | Motion | Gates |
|---|---|---|---|
| Route transitions | A `template.tsx` in each route group wraps the page in `<ViewTransition enter exit default="none">` (the `RouteTransition` component) | Forward: the old page drifts 24px left and fades, and the new page arrives 32px from the right. Back: mirrored. Tab: a crossfade with a 6px rise. The chrome (header, dock, rail) does not move. | OS reduce: instant (existing `base.css` rule). Off: no view transition at all. Calm: a short crossfade (`--nf-duration-fast`) only. The flip passes the `nf-flip` type and gets none. |
| Direction | `lib/motion/nav-direction.ts` classifies from and to using `lib/nav/resolve.ts` (`isAncestor`, `isAppRoot`). A click listener, `popstate` and `performBack` write `data-nav-dir` on the root. | Not applicable | Not applicable |
| Listing morph | The name is set only on the clicked card, at click time. React's navigation transition captures it and the gallery's lead pane receives it. | The group morph uses `--nf-duration-slow` with `--nf-ease-entrance` | Skipped when quiet |
| Row press | `:active` scale `--nf-press-scale-lg` plus a tint | `--nf-duration-press` | The tokens collapse under reduce, and Off already zeroes transitions |
| Toast | A rise and fade on mount | `--nf-duration-base`, spring | Reduce, Calm and Off |
| Sub-tab ink | One indicator that slides with `transform` (`TabInk`) | `--nf-duration-base`, standard ease | The tokens collapse |

Rules kept: only transform and opacity; nothing waits on an animation; `::view-transition` never takes pointer events, so taps during a transition reach the live page; no new dependencies.

## Found while building

- **React does not animate a history traversal.** The App Router answers `popstate` synchronously so the browser can restore scroll, and no view transition runs. I measured this on the dev server: the browser back button produced none. So `performBack` (`lib/nav/use-back.ts`) wraps the traversal in a view transition of its own, typed `nf-back`.
  - This covers the in-app back arrow (BackControl) and the Android back button (NativeRuntime).
  - It gives up after 350ms, so a route that is not cached never holds the screen.
  - The browser's own back button, and the iOS swipe back, keep the browser's native behaviour.
- **Tab switches stagger.** The first four sections of the new page rise 40ms apart. This runs only while `data-nav-dir="tab"` is set, so it never costs anything on a first load.

## Checked so far (Playwright, Chromium, dev server on :3000)

- **Sign-in to sign-up, at 390 and 1440:** a view transition ran with `data-nav-dir="forward"`. The animations were `nf-route-fade-out` 160 and `nf-route-out` 240 on the old page, and `nf-route-fade-in` 240 and `nf-route-in` 240 on the new one. No console errors.
- **About to Help, warm, at 1440:** the same four animations ran on both page groups. The site header stayed still in the mid-transition frame.
- **Cold first visit to a route in dev:** the page arrived under its loading skeleton with no page animation, only the root. That is a dev-compile artefact, not something the transition code does.
- **Sign-up back arrow to /welcome, at 820, after the root template:** `data-nav-dir="back"`, the same four animations, and the page arrives from the leading edge.
- **Calm, at 390:** fades only, at 100ms: `nf-route-fade-out` and `nf-route-fade-in`, with no travel.
- **Off, at 390:** no view-transition animation at all.
- **Pressing the browser back button:** no transition. This is expected (see above).
- **Signed-in surfaces were not checked in a browser:** the dock crossfade, the rail, the listing photo morph, the tab stagger and the row press.
  - The QA member's passcode gate did not clear on the dev server. There was no wrong-code message, and the keypad returned after the refresh.
  - I stopped rather than risk locking the account.
  - Those surfaces are covered only by the unit tests and by review.
- **One page error in the Off run:** "Router action dispatched before initialization". It did not recur in the other runs, and the dev server was reloading at the time.
- Screenshots are in the session scratchpad under `motion/`.

## Left for later

- A back-navigation morph (gallery back to card), which needs the card to be named on return.
- Swipe-driven sub-tabs.

---

# Second pass, 30 September 2026: origin, depth and proof

The founder still did not feel the first pass. Measured on the signed-in app, the reason was plain: every tap produced the same 24 to 32px slide of the page, wherever the tap happened, and the page leaving simply faded. Nothing said "you opened *this*".

## What changed

| Piece | Where | What you see |
|---|---|---|
| The page travels as one image | `components/motion/RouteTransition.tsx`, `app/css/route-motion.css` | React no longer names the page (`enter`/`exit`/`default` are all `none`). The page moves as the browser's single full-screen root snapshot, so it can scale about a point and dim as a whole. The first pass named the page, which split a page with several top-level nodes into several groups, each moving about its own centre. |
| Keep the root snapshot | `RouteTransition.tsx` (`install`) | React cancels the root snapshot when no boundary animates (it sets `view-transition-name: none` on `<html>` and hides the root group), which left a blank frame on every push once the page was unnamed. React skips that when `<html>` carries an inline name, so the name the browser gives it anyway is written inline. Only the route templates use `<ViewTransition>`, so the root still moves only on a navigation. |
| Grows out of what you tapped | `lib/motion/nav-origin.ts` (new) | A forward tap on a card, a row or a tile (at least 120 by 44px, less than 60 percent of the screen) lends that element the name `nf-origin` for one navigation. Its snapshot lifts out of the old page, grows toward the screen (up to 2.4x) and dissolves, while the new page scales up from 0.9 about the element's centre. A smaller target (an icon, a chip, a text link, the bell) opens from its point: the page scales from 0.9 about it. A button that navigates with `router.push` opens from the last press, if it was under 1.2s ago. The listing card keeps its own photo morph into the gallery and opens from its point. |
| Depth | `route-motion.css` | The page behind a push recedes: it scales to 0.97 and dims to 0.28 opacity under the new one, over 380ms (`--nf-duration-slow`). A push with no tap point slides in 32px from the trailing edge. |
| Back reverses into the origin | `nav-origin.ts` (`prepareReturn`), `nav-direction.ts` (`animateBack`) | The in-app back finds the element the page was opened from in the page coming back, names it, and waits (checking every 16ms, never past the 350ms ceiling) until it is drawn. The page being left shrinks into it and fades while the element settles back into its place, and the page underneath comes forward out of its dim. Without an origin, the page on top slides out toward the trailing edge over the page beneath. |
| Tabs | `route-motion.css` | The dock, the rail and the drawer crossfade, and the new page lifts 12px. |
| Chrome into immersive pages | `route-motion.css` | When the header or the dock exists on one side only (into a listing, a thread), it fades instead of blinking (`:only-child`). |
| Every page staggers in | `route-motion.css` | The first six sections of every `.nf-page-stage` page rise 10px, 50ms apart. This runs on the first paint (after the splash hold) and on every move, not only tab switches. It uses `:where()` (no specificity), so any block with its own entrance keeps it. It uses `backwards` fill, never `both`, so nothing is left holding a transform. Sections that hold a fixed layer (`.fixed`, sheets, the floating back, the map pill, dialogs) are left still. |
| Press on every tappable | `app/css/press-motion.css` | A floor rule for every link, button, tab, menu item and summary with no press of its own: `scale: var(--nf-press-scale)` (0.97) plus `--nf-brand-tint-1` on controls without a fill. It is `:where()` throughout. Controls that already press, and anything inside a card that presses as a whole, are excluded, so nothing sinks twice. The row presses moved from `transform` to `scale`, because the inbox and notification rows' entrance animation holds `transform` and was overriding the press. |
| The listing card press was dead | `app/css/list-views.css` | The compiler folded `transform: none; scale: 0.98` into `transform: scale3d(.98,.98,1)`, and the card's `nf-card-in` entrance, which holds `transform` with `both` fill, overrode it. The value now goes through a custom property, which the compiler cannot fold. |
| FLIP on filter and sort | `components/app/search/ResultsFade.tsx` | When a filter or sort keeps a listing on the shelf, its card glides from its old cell to its new one. It uses the Web Animations API on `translate` only, for cards within a screen of the viewport. New cards arrive on the card entrance, and cards that left were already dimmed. The search page and the stays search page use it. |
| Marks come down after the transition | `nav-direction.ts`, `nav-origin.ts` | `data-nav-dir` and `data-nav-origin` clear when `document.activeViewTransition` finishes, where the browser exposes it. Otherwise they clear after the settle delay. Under data saver, a slow capture once outlived the 700ms settle, and a tab switch played as a push. |

Gates: Calm gets a short crossfade with no travel and no origin. Off and OS reduced motion get no view-transition animation at all, and `animateBack` starts none. Data saver lends no origin and runs no stagger, but keeps the plain slide. The side flip (`nf-flip`) swaps the root instantly under its own turn. Only `translate`, `scale` and `opacity` are authored. The UA's root group animation (width, height, transform, backdrop-filter) is identity-sized.

## Verified (Playwright on the shared dev server, Chromium 141, signed in as the QA member)

**Signing in.** The QA passcode gate unlocks locally. Sign in fresh with `QA_MEMBER_EMAIL` and `QA_MEMBER_PASSWORD`, then call `passcodeReady` (tests/_passcode.mjs) with the member code: a fresh session lets `/api/passcode/touch` write the unlock cookie. A reused storage state does NOT unlock, because the session is no longer fresh and the lock returns. That is why the first pass could not get in. The service role key is not needed.

**Scripts** are in the session scratchpad under `motion2/`: `cast1.mjs`, `verify.mjs`, `flip.mjs`, `press-audit.mjs` and `press-real.mjs`. Frames are there as well: `strip-*.png` and `pair-*.png`. There are two kinds of frame capture:

- **Compositor frames (CDP screencast) at 390.** They are aligned to the transition's `ready` and saved as `d-390-*` and `strip-d-*`.
- **Slow-motion captures at 1440.** These use `Animation.setPlaybackRate` at 0.04, with times reported in real animation milliseconds (`slow-1440-*`). At 1440 the screencast produced almost no frames on this loaded machine.

**Animations that ran, read from `document.getAnimations()` at `ready`:**

| Move | Animations |
|---|---|
| Home to a home tile | forward, `expand`: `nf-page-recede` (old root), `nf-page-grow` and `nf-route-fade-in` (new root), `nf-origin-grow` and `nf-route-fade-out` on `nf-origin` |
| In-app back from that page | `return`: `nf-page-shrink` and `nf-route-fade-out` (old root), `nf-page-surface` (new root), `nf-origin-settle` and `nf-route-fade-in` on `nf-origin` |
| A recently-viewed card to a listing | forward, `expand`, plus the chrome fading out (`:only-child`). The frames show the card lifting and growing across the dimmed home into the listing hero. |
| Listing card to a listing | forward, `point`, plus the listing photo morph |
| Dock (Around, Search, Home) | `tab`: `nf-route-fade-out`, then `nf-route-fade-in` and `nf-route-lift` |
| Bell | forward, `point` |
| Sort change on /search | FLIP `translate` on the cards that stayed, and no route transition (same page) |

**Motion modes:**

| Mode | What ran |
|---|---|
| Calm | fades only (`nf-route-fade-in` and `nf-route-fade-out`), no origin |
| Off | no view-transition animation on any move |
| OS reduced motion | no view-transition animation on any move |
| Data saver | slide and recede, no origin |

**Low end.** With the CPU throttled 4x (`Emulation.setCPUThrottlingRate`), every transition above still ran. The longest main-thread frame gap during a transition was 633ms, and 133 to 533ms unthrottled. That is the dev build committing the new page (unminified React, on-demand compile) at the same moment. The view-transition animations themselves are compositor animations of snapshots. This number needs re-measuring on a production build, which this lane may not run.

**No trapped fixed layers.** On every navigation in every mode, each `position: fixed` element was sampled 120ms and 300ms after `ready`. None had a transformed, filtered or contained ancestor. `data-splash` was never left on. There were no page errors.

**Press.** An audit on /home, /search, /messages, /profile, /settings, /notifications, /bookings, /saved and /around forced `:active` through CDP on 216 visible tappables. Before the floor rule, 17 control types had no press response. After it, three are left: the skip link (on purpose), and the listing card's link and photo button, which press through their card. With a real mouse-down: `.nf-pf-tab`, `.nf-segmented__link`, `.nf-home-door` and the sort items went to scale 0.97 with the tint, and `.nf-inbox-row` to 0.985.

**Unit tests:** `lib/motion/nav-origin.test.ts` (new, 10 tests) and the existing motion suites.

## Still open

- **Production-build frame timing on a real low-end phone.** Only the dev build could be measured here.
- **The browser's own back button and iOS swipe-back** still get no transition. React does not animate a history traversal (see the first pass). Only the in-app back and Android back reverse into the origin.
- **The return waits at most 350ms.** On a slow dev route the page coming back is not committed in time, and the back falls back to the plain slide.
- **A shared-element pair with a destination hero** (`data-vt-hero`) is not wired. Only the listing photo pairs. Everything else uses the expand-and-dissolve.
- **The `nf-card-in` entrance and other `both`-fill entrances hold `transform` after they finish.** That silently beats any `transform` press on the same element. The card press is fixed; the other transform-based presses should move to `scale` too.
- **Sheet and modal springs** are unchanged from the first pass (already on `--nf-ease-spring`). Count-ups are the existing `CountUp` (summary card, KPI tile, hero figure, saved board). Neither was re-verified in this pass.
