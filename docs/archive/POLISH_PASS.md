# The small stuff

> **ARCHIVED 2026-08-09. This does not govern any current decision.** Where it
> disagrees with the code, the database, `docs/PRODUCT.md`, `RECOMMENDATIONS.md`,
> `ROADMAP.md`, `KNOWN_GAPS.md` or `ARCHITECTURE_DECISIONS.md`, this file is
> wrong. See `docs/archive/README.md` for why it was retired and what survived it.


Written 2026-08-04 by the lead, on the owner's instruction.

The big features are paused. This is the small stuff, taken from the whole
recommendations pool: the 250 numbered items in `docs/recommendations-inbox.md`
(cited as `#N`) and `RECOMMENDATIONS.md` (cited as `R-NN`).

**Do them in order, top to bottom.** Smallest first. No tiers, no phases.

**The rule: nothing here adds a table and nothing here adds a screen.** If an
item seems to need a migration, it is in the wrong list. Say so in one line and
take the next one.

**Batch them.** These are small. Ship five or ten at a time, not one at a time.

Proof for a small item: it is real on the surface, it holds in both themes, it
holds at 390px and on desktop, and a spec or a screenshot stands behind it. "It
looks better" is not proof. If a change has no visible surface, the spec is the
proof.

---

## The list

1. **Icons: one weight, one size scale, everywhere.** `BrandIcon` for content,
   `UiIcon` for navigation, no `Icon3D` anywhere. `#147`, `docs/ICON_SYSTEM.md`
2. **An accessible name on every icon-only control.** The tab bar has them.
   Almost nothing else does. `#147`
3. **Vector sources checked in for the icon pack**, so nobody redraws one from a
   PNG. `R-19`
4. **A visible focus ring on every interactive element**, in the stride
   treatment, both themes. `#146`
5. **Every interactive target at least 44px.** `PageHeader` was 36. Nothing has
   checked the rest.
6. **Every overlay closes on Escape**, traps focus, and locks the page behind
   it.
7. **No sentence is ever truncated.** DONE, `truncation.spec.mjs`. Forty
   routes at 320, 390, 768 and 1280. Three checks, because with an empty
   catalogue the first two pass on rows that have never held anything: nothing
   is clipping, no sentence sits under a single-line truncation, and every
   truncating box still holds a long Nigerian name without bursting its
   container or giving the page a sideways scroll. It found the listing
   performance card in the agent workspace giving its title 167px for 169px of
   name at 320px, which now stacks. 1,480 elements reached of 75 source sites;
   the spec prints that gap on every run rather than implying coverage it does
   not have.
8. **Aspect-ratio boxes on every image.** DONE, and it already was, which is
   why it needed measuring rather than fixing: a sweep of 43 routes at 390 and
   1280 found ZERO images without a reserved box. The guard that holds it lives
   in `polish-overlays-copy-status.spec.mjs` and used to cover 22 routes, which
   proved half the platform. It covers all 43 now, because an unreserved image
   only ever shifts the page it is on.
9. **Status colours locked into tokens**: pending, approved, rejected, verified.
   One meaning per colour, platform-wide. `#50`
10. **Contrast of gradient text over glass**, both themes, against WCAG AA. `#148`
11. **Compact naira for glanceable UI** (₦1.2m), exact kobo in every breakdown,
    all through `formatMoney`. `#53`
12. **Number and currency formatting per locale**, using the four locale files
    already shipped. `#235`
13. **Total price first** (nightly plus cleaning plus service) with a per-night
    toggle. `#21`
14. **Service charge and caution deposit as separate labelled figures**, never
    folded into one. `#232`
15. **The price breakdown stays expandable at every step** of the booking
    wizard, not only the first. `#37`
16. **Smart default dates** in search: the upcoming weekend. `#29`
17. **`+234` phone input mask** with carrier-aware validation. `#33`
18. **Every error says what happened and what to do next**, in plain language.
    DONE, `error-copy.spec.mjs`. 202 refusals, every one reached through the
    `ActionResult` envelope, including the ones routed through shared
    constants: `SIGNED_OUT_MESSAGE` alone is used 58 times. Eighteen said only
    what happened. The rule is structural plus a vocabulary, so a bark cannot
    pass by being short and an instruction cannot fail by using a verb nobody
    predicted. `#40`
19. **Every empty state offers a next action.** Discovery DONE: the search
    empty state now tells three different nothings apart, because they need
    different answers. A filter that matched nothing offers Clear filters, a
    search term offers Clear this search, and an empty catalogue says so
    plainly and offers listing a place, since "browse everything from the home
    screen" pointed at the same empty catalogue and led straight back. The
    remaining surfaces are not swept yet. `#35`
20. **Skeletons shaped like the real cards**, using the stride ring. DONE,
    `skeletons.spec.mjs`. 60 loading states across 84 routes, and the 28 that
    were missing are the ones that mattered: profile, settings, checkout, a
    message thread, the assistant, a listing's calendar and every agent and
    admin console screen. Each one shows the PREVIOUS screen until its data
    lands otherwise, which on a slow connection reads as a tap that did nothing
    followed by a page that jumps. Four rules hold now: every route that reads
    has one, none of them is a spinner, every one announces itself with
    `aria-busy` and a live region, and none hand-draws a grey box outside the
    shared `Skeleton` that carries the shimmer. Static routes are exempt BY
    NAME, so an exemption that stops being true is a failure rather than a
    silence. `#41`, `#205`
21. **Search state survives the back button.** `#27`
22. **Search scroll position survives coming back from a listing.** `#214`
23. **The last chosen view, list or map, is remembered.** `#155`
24. **Recent searches as chips** under the search bar. `#160`
25. **A recently-viewed rail** on home and search. `#23`
26. **Undo instead of a confirm dialog** on unsave and draft delete. Unsave was
    already done and unmarked. Draft delete now inverts the order, because the
    action deletes the row and its photos and cannot be undone afterwards: the
    row leaves at once, the slot offers six seconds with a draining bar, and
    nothing reaches the server until that runs out. Timing in
    `lib/ui/undo-window.ts` with nine unit tests. NOT PROVED IN A BROWSER: the
    workspace needs an approved agent with a draft. `#26`
27. **Verified listings rank above unverified** at equal relevance. `#158`
28. **`aria-live` for form errors, result counts and booking status changes.**
    DONE. Form errors were already covered (`Field`, `fields`, all four auth
    forms), as were booking status changes (`ReservePanel`, `PayPanel`,
    `BookingsWorkspace`) and the map's own place count. The gap was the search
    result count, which changed silently on every filter: `polite` because it
    answers something the reader just did, `atomic` because a changed digit
    without "match your filters" is worse than silence. `#149`
29. **A sticky mobile booking bar** on listing detail: price, dates, action.
    `#42`
30. **The tab bar hides on scroll down and returns on scroll up.** DONE,
    `dock-autohide.spec.mjs`. Never in the top 96px, never at the end of a
    page, ignores movements under 8px, and returns on focus so a hidden dock
    leaves the tab order. The spec found two real faults: a new screen opened
    still hidden, because an app navigation is a transition and a render-phase
    reset does not survive it (the dock is keyed on the route and remounts);
    and `scroll-behavior: smooth` ends a page in one and two pixel steps, every
    one under the jitter threshold, which left the dock hidden at the very
    bottom of a list. `#212`
31. **Long-press quick actions on a listing card**: save, share, hide. `#218`
32. **Haptic feedback** on save, book and send, where the device has it. `#213`
33. **Prefetch listing detail on card press-down.** `#141`
34. **Self-host and preload the exact Inter subsets in use.** DONE,
    `fonts.spec.mjs`. Both faces were already self-hosted through next/font and
    NOT ONE preload link ever reached a browser. Nineteen files existed, ten
    were fetched on every load, four of those were never painted. Seven files
    now, checked in, preloaded per locale, immutable for a year. The declared
    subset list was also wrong: the Yoruba and Igbo dotted vowels live in
    `vietnamese`, which was never asked for. `#145`
35. **Confirm Leaflet is lazy** and no eager chunk survived the dynamic import.
    `#245`
36. **A data-saver toggle**: no ambient canvas, no grain, no autoplay. `#20`
37. **`save-data` and connection-aware media**. DONE, `save-data.spec.mjs`.
    /home was 3,676KB at 390px with an empty catalogue, 3,520KB of it imagery,
    almost all of it two raw background PNGs. Under the `Save-Data` header or a
    2g connection it is 28KB: the artwork is never requested rather than hidden,
    which is the whole design, and the Ken Burns pan, the blooms, the grain and
    the aurora go with it. Every colour, control and heading stays. `#246`
38. **The map viewport in the URL** (lat, lng, zoom), so a map link is
    shareable. `#153`
39. **A "search this area" chip** when somebody pans the map. `#154`
40. **A locate-me control** that centres on the person, with permission. `#163`
41. **A listing preview card docked at the foot of the map** when a pin is
    tapped. `#164`
42. **Map and list hover synchronised**: a card highlight lights its pin, and
    back. `#36`
43. **Skip-to-map, and keyboard map controls.** DONE, `map-keyboard.spec.mjs`.
    Arrow pan, plus and minus zoom, visible zoom buttons at 44px, and a skip
    link. Two faults were hiding here: `zoomControl: false` had removed the
    only zoom affordance and nothing replaced it, and Leaflet's own arrow
    handling was bound to the `aria-hidden` container, so a keyboard could
    never reach it. `#247`
44. **Map pin counts and the selected city announced.** DONE, and already was:
    `MapCanvas` carries a polite live region on the "N places on this map"
    chip and another on the locate status. Verified rather than assumed.
    `#248`
45. **Alt text required on listing photos**, with inline guidance at upload.
    `#150`
46. **Power and water filters in discovery.** DONE. Backup power, Band A feeder
    and water source, in the drawer, in the URL (`power=`, `water=`), pushed
    down to the partial indexes, removable as chips, proved end to end by
    `apps/web/tests/light-and-water.spec.mjs`. All three are strict: a host who
    did not answer is never offered to somebody who asked, and because that
    makes an all-unanswered pool unfilterable, the section only appears when
    the pool in front of the reader holds an answer.
47. **The cancellation policy as a timeline**, not a paragraph. The timeline
    was built and rendered only on /cancellations and /safety, which are where
    somebody goes after they want out. It is now on the listing as the plain
    policy and at checkout against the guest's own dates and total. NEITHER
    PLACEMENT IS PROVED: /listing 404s with an empty catalogue and a checkout
    needs a booking. `trust-surfaces` skips out loud on both. `#66`
48. **`globals.css` split into partials.** DONE. 4,544 lines became eighteen
    ordered imports. Byte identical: the emitted stylesheet is 259,411 bytes
    before and after with an empty diff. THE ORDER IS THE CASCADE, and three
    selectors are declared twice on purpose. `#226`
49. **A `/styleguide` route.** DONE, `styleguide.spec.mjs`. Twelve sections,
    every swatch painting its own token rather than a copied value, so the page
    cannot drift from the sheet. Noindex. It immediately earned its keep: the
    spec that holds it to its own rules found the site footer's links were
    17px targets. `#210`
50. **Odometer-roll digits** on the numbers band. `#204`

---

## Left for later, deliberately

These are the big ones. They stay ranked in `docs/agent1-selection.md` and
nothing here touches them: seasons (`#5`), diaspora currency (`#6`), WhatsApp
share cards (`#8`, `#31`, `#244`), SMS fallback (`#9`), escrow (`#55`), split
pay (`#89`), the image pipeline and blurhash (`#105`, `#138`), PostGIS (`#104`),
corporate accounts (`#96`), the assistant's tool actions (`#167`), events, and
anything else that needs a migration or a new route.
