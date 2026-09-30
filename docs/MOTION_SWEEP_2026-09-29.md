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
