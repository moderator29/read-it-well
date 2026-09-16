# The sixty

**A full platform sweep, ranked by what a person actually sees.** Not by what is
most broken: by what changes how Vallo looks the moment it is done.

Three workers, strictly non-overlapping files, working their own queue in order
and never stopping between items. The lead re-audits and commits everything.

| Owner | Scope | Files it may touch |
| --- | --- | --- |
| **A** | The material and motion system | `apps/web/src/app/css/**`, `apps/web/src/design-system/**`, `apps/web/src/components/ui/**`, `components/app/AppShell.tsx`, `MobileTabBar.tsx`, `AppRail.tsx`, `AutoHideDock.tsx`, `Screen.tsx`, `ScreenSkeleton.tsx`, `PageHeader.tsx` |
| **B** | The in-app surfaces | `apps/web/src/app/(app)/**`, `apps/web/src/components/app/**` EXCEPT the seven files above, `components/agent/**`, `app/admin/**` |
| **L** | Landing, brand, identity | `apps/web/src/app/page.tsx`, `app/layout.tsx`, `components/site/**`, `packages/i18n/**`, `apps/web/public/brand/**`, `app/opengraph-image*`, `app/manifest.ts`, `docs/**` |

**Nobody touches another owner's files.** A finding outside your scope is a line
in your report, not an edit.

---

## The material layer, owner A

The single highest-visibility block on the list. Items 1 to 3 change every
content object on every screen at once.

1. **The glass icon swap.** `BrandIcon` points at `brand/glass` instead of `brand/icons`. 124 call sites, one template literal. 8 names substitute first per `docs/FRONTEND_REVAMP.md` 2.6, and `BRAND_ICONS` gains 30 and loses 14
2. **Delete `mix-blend-mode: multiply` and `--nf-icon-ground` on dark.** The new artwork has a real alpha channel. This is what stops every content object being a white sticker on navy
3. **Point `--nf-icon-ground` at the base navy in light.** One token, 79 objects
4. **A glow scale.** The brand glow is written by hand about 60 times at 15 alphas across four stylesheets. Until it is a token nothing about the material can be changed in one place
5. **`.nf-card` goes from six layers to two.** A radial bloom, a three stop fill, a four stop gradient border, a backdrop blur, an inset rim and an elevation shadow, around a 24px icon, 423 times
6. **The button set, rebuilt.** One size scale, one glow, real press physics. Six variants for five implementations today
7. **The radius collision.** Tailwind's `rounded-xl` is 12px and `--nf-radius-xl` is 22px, both in use. And 79 pills where the owner asked for rectangles
8. **The type scale, enforced** on the twenty highest-traffic components
9. **One elevation ladder**, applied. Seven distinct box-shadows on the landing page alone
10. **`.nf-sheet` becomes real glass.** Eight surfaces ride it and it is the best-engineered component in the product

### The platform starts breathing

11. **One motion system**, in one file, with named curves and durations, and `prefers-reduced-motion` honoured at the top rather than per rule
12. **Entrance choreography.** Sections and cards rise in on reveal, staggered, never more than four steps, 400 to 600ms
13. **Press physics everywhere.** Every tappable surface answers the finger with a spring, not a linear fade
14. **The bottom nav's active pill morphs** between tabs instead of cutting
15. **Filled nav glyphs.** `UiIcon` gains a solid variant for the nav set, so the active tab is a weight change and not only a colour change
16. **The bottom nav becomes real glass**, with the safe area, the hide-on-scroll and the press states all correct
17. **The canvas breathes.** A very slow ambient drift on the bloom, 20 to 40 seconds, one per viewport
18. **Skeletons shimmer on the brand angle**, directionally, instead of pulsing
19. **Toasts and live regions spring in** from the edge they belong to
20. **Two stacked headers, removed.** 116px of chrome before the wallet balance, and an empty bar above `lg`
21. **A focus ring that survives the glow.** Visible over a primary button, both themes
22. **Numbers count up on enter.** The wallet balance, the result counts, the stats
23. **The nav and rail glyph set, upgraded** so it reads as one family at 20px

---

## The in-app surfaces, owner B

24. **`ListingCard` leads with the move in total.** The product's one differentiator, absent from the surface that compares
25. **The market label.** "To rent", "For sale", "Per night". A sale and a rental are indistinguishable today
26. **The save control on the card.** The map dock has one and the grid does not
27. **No truncation in three of six slots** on one card
28. **`MediaFrame`, the 2030 preview.** Every listing has zero photographs, so this is not a fallback, it is what the product looks like. Make it an information surface that is proud rather than apologetic
29. **The listing detail page.** Gallery, move in panel, sticky bar, host panel, reviews empty state
30. **Home**
31. **Wallet.** Balance, ledger, the four drawers
32. **Delete the escrow copy from the wallet.** The product contradicts its own terms of service on the money screen
33. **Bookings**
34. **Messages**
35. **The assistant surface**
36. **Search.** Filters, chips, the result shelf
37. **One empty state component**, and never under the tab bar
38. **`ResultSheet`.** One confirmation component driven by state, replacing 43 bespoke ones. The marks exist
39. **The payment failure surface.** Verdict, mark, amount, "your card has not been charged", retry, help
40. **The three checkout pending states.** Mark, amount, consequence, live region
41. **Eight failure surfaces move off the pending colour**
42. **Pin the pay action.** `ActionBar` exists, does exactly this, and is used once on the platform
43. **The category rail**
44. **Saved**
45. **The agent workspace**
46. **One admin queue frame.** Search, a status filter on the real enum, a date range, pagination

---

## Landing, brand and identity, owner L

47. **The logo.** Re-derive the mark from the tile, key it to alpha, both themes. Every brand asset is an opaque rectangle today
48. **An Open Graph image.** In a WhatsApp-first market this is the first impression for most visitors and it is currently blank
49. **The landing page, rebuilt to seven sections** from eighteen bands and 10,862px
50. **The hero.** The offer, a real search field, real counts. Not a retired slogan and four generic tiles
51. **Six live listings on the landing page**
52. **The move in truth band.** The whole argument, currently a sub-clause in a grid
53. **Light, water and the gate.** Five structured columns no competitor has
54. **Become an agent**
55. **The footer**
56. **Delete `PlatformConsole`** and its fabricated numbers
57. **`StoryRail` replaced** by the hero scenes
58. **The slogan, landed properly**, in all ten places, with `HowItWorks` given its own three titles
59. **Four languages.** Every new string in English, Yorùbá, Hausa and Igbo
60. **The manifest and the PWA.** A static file and a typed route claim the same path and Next refuses both

---

## The standard, for all three

**It is not "does it work". It is "would a funded design team have shipped
this".**

- **390px first, in dark, then wider, then light.** A finding that only works in
  dark is half a finding
- **Motion is physics, not decoration.** Things arrive from where they came from,
  answer the finger, and settle. Nothing loops for its own sake
- **`prefers-reduced-motion: reduce` turns all of it off**, and the product is
  still complete without it
- **One ambient animation per viewport.** Everything else is event-driven
- **Zero em dashes. British spelling.** No orange, amber, gold or purple, ever.
  Emerald success, rose error, bright cyan pending
- **No new raw colours and no new raw spacing.** Use the scale or add to it
- **Never say tested, verified or done unless it is true**
