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
| Route transitions | A `template.tsx` in each route group wraps the page in `<ViewTransition enter exit default="none">` (the `RouteTransition` component) | Forward: the old page drifts 24px left and fades, and the new page arrives 32px from the right. Back: mirrored. Tab: a crossfade with a 6px rise. The chrome (header, dock, rail) does not move. | OS reduce: instant (existing `base.css` rule). Off: no view transition at all. Calm: a 140ms crossfade only. The flip passes the `nf-flip` type and gets none. |
| Direction | `lib/motion/nav-direction.ts` classifies from and to using `lib/nav/resolve.ts` (`isAncestor`, `isAppRoot`). A click listener, `popstate` and `performBack` write `data-nav-dir` on the root. | Not applicable | Not applicable |
| Listing morph | The name is set only on the clicked card, at click time. React's navigation transition captures it and the gallery's lead pane receives it. | The group morph uses `--nf-duration-slow` with `--nf-ease-entrance` | Skipped when quiet |
| Row press | `:active` scale `--nf-press-scale-lg` plus a tint | `--nf-duration-press` | The tokens collapse under reduce, and Off already zeroes transitions |
| Toast | A rise and fade on mount | `--nf-duration-base`, spring | Reduce, Calm and Off |
| Sub-tab ink | One indicator that slides with `transform` (`TabInk`) | `--nf-duration-base`, standard ease | The tokens collapse |

Rules kept: only transform and opacity; nothing waits on an animation; `::view-transition` never takes pointer events, so taps during a transition reach the live page; no new dependencies.

## Left for later

- A back-navigation morph (gallery back to card), which needs the card to be named on return.
- Swipe-driven sub-tabs.
