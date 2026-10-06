# The component system, in one page

Written in Session 3 (B-33, "component inventory governance") so the next session finds
every primitive, its single definition point, when to reach for it and when not to, and a
route where it can be looked at, without reading the response file.

**How to use this page.** Find the primitive in the first column. Open its file; that file
is the only definition, so a change is made there and nowhere else. Open the gallery route
in the last column on a dev server (`/gallery/<route>`, development only, see the gate
below) and look at every state in both themes before and after any change. If a primitive
you need is not here, look in `docs/design/COMPONENT_LIBRARY.md` before building one.

**The gallery is the storyboard** (craft doctrine section 7): a surface is judged rendered,
not described. Every route has a Theme switch (Dark default, Light) and a Motion switch
(Full, Calm, Off; Calm and Off are what reduced motion collapses to). Both switches change
only that tab's root element and never write the member's real preference.

**The gallery's data rule.** Labels are structural (slot names, state names), never a name,
a reference, a rating or a real amount. Where a figure needs digits to be seen turning, the
number is a test value the viewer types or steps, or zero. A gallery full of plausible data
is one where nobody notices the data is not real.

**The gate.** Every gallery route calls `openOrNotFound()` (`app/(dev)/gallery/_system/gate.ts`)
first, which is `previewHarnessIsOpen`: open in development, or with `VALLO_PREVIEW_HARNESS=1`,
and never on Vercel. It is a 404, not a redirect. The shared frame, the family list and the
gallery stylesheet are in `app/(dev)/gallery/_system/`; a new family adds a directory and one
line in `_system/families.ts`.

Paths below are under `apps/web/src/` unless they start with `packages/` or `docs/`.

| Primitive | File | When to use | When not to | Rules (radii, motion, honesty) | Gallery route |
|---|---|---|---|---|---|
| Plate (container tier) | tokens `--nf-tier-plate-*` in `packages/design-tokens/src/tokens.css`; read by `app/side-nav.css` rows | A row inside something: navigation rows, list rows, a quiet well | A standalone surface that carries content (that is a Card) | Radius 14. One edge: the hairline. Never a shadow. Hover and press are tokens, not new fills | `/gallery/containers` |
| Card (container tier) | `components/ui/Panel.tsx` over `.nf-panel` / `.nf-card` (`app/css/glass.css`); tokens `--nf-tier-card-*` | The default surface for a unit of content | Nesting a Card in a Card; wrapping a single icon (use a Plate) | Radius 18. One edge: the hairline at night, the blue-tinted shadow alone on Paper (the hairline is transparent there). No glow of its own | `/gallery/containers` |
| Card figure | `Panel` with `.nf-panel--figure`; token `--nf-tier-card-radius-figure` | A Card whose subject is a figure (a balance, a hero count) | A Card with only text | Radius 22; only the corner changes, the edge is the Card's | `/gallery/containers` |
| Island (container tier) | `.nf-island` (`app/css/glass.css`), also `.nf-navy-glass`; tokens `--nf-tier-island-*` | The one floating, glassy thing: the dock, the rail, a hero band | More than one per screen; anything that scrolls with the content | Radius 28 (the north star allows 26 to 32). One edge: the ring of light on the border box at night, the shadow on Paper. Blur 16px, dropped by data saver | `/gallery/containers` |
| Sheet (container tier) | `components/ui/Sheet.tsx` over `.nf-sheet` (`app/css/overlays.css`); tokens `--nf-tier-sheet-*` | A task that rises from the bottom and returns to where it came from | A destination (that is a route) | Radius 32 on the leading corners only. One edge: hairline at night, the upward shadow on Paper. Rises on the spring, leaves on the exit curve; drag is on the grip only | `/gallery/containers` |
| Figure, Amount | `components/ui/Amount.tsx` | Any number or naira figure a person reads: two-tone, the number at full weight and the tail (kobo, suffix) muted | Free text; a figure inside a chart (the chart prints its own ticks) | Tabular numerals always. Naira only through `formatMoney` / `moneyParts`; money sentences only from `lib/money/copy.ts`. Muted tail never under 12px. `count` only where the figure is the hero of its card | `/gallery/figures` |
| CountUp, CountUpMoney | `components/motion/CountUp.tsx` | A hero figure that should arrive: 0 to the value once, on first view | Rows, lists, anything that repeats; a figure that is not the hero | 620ms on the glide curve, once per mount. The server prints the final figure. A later change rolls (Odometer), never recounts. Off under reduced motion, Calm and Off | `/gallery/figures` |
| Odometer | `components/ui/Odometer.tsx`, `lib/motion/odometer.ts` | A figure that changes while it is on screen | A first arrival (that is CountUp); an optimistic balance | Only the changed digits roll, 380ms `land`, 20ms stagger, up if the value rose and down if it fell. A money figure changes only when the server has confirmed it: an odometer on an optimistic balance is a lie told in motion | `/gallery/figures` |
| HeroFigure | `components/ui/HeroFigure.tsx` | The one big figure of a band or a card, with a caption and a quiet line | A second figure on the same view | 44px (`lg`) or 34px (`md`, a long money figure); takes the band's night palette; the figure is the caller's | `/gallery/figures`, `/gallery/today-hero` |
| Segmented, SegmentedPanel | `components/ui/Segmented.tsx` | Switching between views of one screen (`tabs`), or choosing one value in a form (`radio`); filters | Navigation between destinations (the dock and the side nav own that) | The pill is the one capsule D2 allows beside chips. The thumb is one element moved by transform only, 240ms `drift`, interruptible; the panel under it crossfades 160ms. Jumps under reduced motion. Variants `quiet` (default) and `solid` (the one page-level mode switch); a label is required | `/gallery/segmented` |
| Button | `components/ui/Button.tsx`, styles `app/css/buttons.css` | Every action. One primary per screen | A link that navigates (use `ButtonLink`); a toggle (use Segmented or a switch) | A text button is a rounded rectangle: radius 10, 12 and 14 on `sm`, `md` and `lg` (D2 reads 14), never a pill. Icon buttons are circles with a required `aria-label`. Heights 44, 48, 56; sentence case; 44px touch floor. `glow` is the view's one glow | `/gallery/buttons` |
| Button `morph` | `components/ui/Button.tsx` (`morph`, `useMorphState`, `MORPH_SETTLE_MS`) | The one action a screen exists for when it is confirm, verify, unlock, release or earn | Every button; an action whose outcome is not yet known to the server | Loading closes to a circle and draws the arc once, then holds (never a spinner); done closes the ring and draws the tick; settle reopens the rectangle in 240ms. The box never changes size. `done` is the server's word, never the press | `/gallery/buttons` |
| Toast | `components/ui/ToastHost.tsx`, `lib/ui/toast.ts`, `app/css/overlays.css` | Telling a person what just happened: "Saved", "Link copied", with an optional Undo | Anything that must be read or decided (use a Sheet or an inline message); a queue of messages | One host in the root layout, one placement (above the dock on a phone). Rises 16px on `land` 240ms, leaves in 160ms. Dwell 2,400ms, 6,000ms for an error or an action; holding it stops the clock. Newest replaces. Error is announced at once | `/gallery/toast` |
| StatusChip | `components/ui/StatusChip.tsx` over `components/ui/StatusPill.tsx` | Any money or trust state a member meets: success, pending, failed, protected, disputed, neutral | A decorative label; a state the server has not stated | A word, a shape and a colour, always: filled circle, hollow circle, filled square, hollow square, diamond, bar. Failed is the only red; disputed is attention, never an error. A change swaps all three on one 240ms crossfade. It presents, it never decides | `/gallery/status-chip` |
| Skeleton, SkeletonText, SkeletonCard, SkeletonSwap | `components/ui/Skeleton.tsx` | While data is on its way: draw the shape of what is coming, then `SkeletonSwap` fades the content in | A spinner, ever; a skeleton that does not match the final layout | The one shimmer; stops under reduced motion, Calm and Off. Swap fades 160ms on glide. The page must not shift when the content lands | `/gallery/skeleton` |
| DocumentSheet (+ `DocHead`, `DocFigure`, `DocRows`, `DocRow`, `DocState`, `DocSection`, `DocPerforation`, `DocNote`, `DocActions`) | `components/app/money/DocumentSheet.tsx`, `document-sheet.ts`, `app/css/document.css`, `app/css/print.css`; tokens `--nf-doc-*` | A receipt, an agreement's terms or a statement: a thing somebody screenshots, prints or hands over | Any ordinary screen; a receipt for money that has not moved | Paper on the member's theme, identical in both. `document` has the Card radius and solid rules; `receipt` has the serrated tear, square corners and dashed rules. One edge: a shadow. Never draws a barcode, hash, id or confirmation the caller did not pass; no defaults. Figures never count or roll. A state is words plus a shape. One `printable` sheet per page | `/gallery/document-sheet` |
| PeriodBars | `components/ui/charts/PeriodBars.tsx`; rules at the top of `chart-rules.ts` | "How much in each period": discrete buckets (a month, a week) | Movement between points (TrendLine); one number (a Figure); a share of a whole | One hue. `null` is a hatched slot the full plot height (nothing on record); `0` is no bar; any real value is at least 2px. Bars grow from the baseline 620ms, 30ms apart; a period change morphs 380ms. Top corners 4px. 12px minimum axis type, tabular. One tab stop, arrows move, a table twin always | `/gallery/charts` |
| TrendLine | `components/ui/charts/TrendLine.tsx` | "Which way is it moving": continuous values over days | Discrete periods (PeriodBars); a short series where the shape between points is not the point | A 2px line, a 10% wash, one direct label at the last point. A null is a gap, never bridged. One optional second series (the same measure, previous period): grey, dashed, hollow end marker, legend names both. Draws 620ms, morphs 380ms | `/gallery/charts` |
| CompareBars | `components/ui/charts/CompareBars.tsx` | "This period against the last", each row one measure | Comparing a member with another member; ranking; different measures on one scale | Each row has its own shared scale, each figure printed beside its bar, so the rows are the table. Previous is grey and hatched. A missing previous says so in the caller's words | `/gallery/charts` |
| ChartTable | `components/ui/charts/ChartTable.tsx` | The table twin every chart carries; `visible` where a layout wants the columns | Replacing the chart for sighted readers | A null prints as the caller's word, never a zero. Server-safe and dumb: it prints exactly what it is handed | `/gallery/charts` |
| TodayHero | `components/workspace/TodayHero.tsx`, styles `app/css/agent.css` | The top of a workspace home: what needs me today, then the one next action | A page without a queue behind it; a figure nobody read | The count is the sum of the count cards that were read, so it always decomposes into what can be tapped. `count` null draws nothing, never a zero. Counts once on arrival. The next action leaves the list beneath | `/gallery/today-hero` |
| BrandIcon (tiered objects) | `design-system/icons/BrandIcon.tsx`, `design-system/icons/object-assets.ts`, art in `public/brand/tier-{a,b}/` | The object a thing is about: a content icon in a list row, a card, an empty state (tier B matte symbols, tier A real things) | Navigation or controls under 32px (use `UiIcon`); the two scenes anywhere but a hero slot | Never a tile unless the object is the subject. On Paper a matte or real object stands on the ground plate (radius 14, about 4% brand fill, a blue contact shadow); on night the ground paints nothing. A name with no accepted replacement keeps its glass art; never hand it a near miss | `/gallery/brand-icons` |
| MotionProvider | `components/app/MotionProvider.tsx`, `motion-features.ts` | Mounted once in the root layout; nothing calls it | Mounting a second `LazyMotion`; importing `motion`, `domMax` or `LazyMotion` elsewhere (eslint fails) | The only LazyMotion. Import `m`, hooks and `AnimatePresence` only. `MotionConfig` does not stop `animate()`: read `useMotionGate().quiet` | None (a provider has no state to look at) |
| DragToConfirm | `components/ui/DragToConfirm.tsx` | An irreversible action, money included | Anything reversible | `money` makes auto-reset a type error; confirmed only after the server resolves. Keyboard path on the handle | `/gallery/ported` |
| Unfold | `components/ui/Unfold.tsx` | Progressive detail the reader may skip | Price, fees, trust facts or money state, ever | One open at a time by default; `multiple` allows several | `/gallery/ported` |
| SlidePagination | `components/ui/SlidePagination.tsx` | Desktop tables | A phone (it is not drawn below 768px) | Segments radius 14 | `/gallery/ported` |
| LiveIsland | `components/ui/LiveIsland.tsx` | A status surface with steps that tick when the host says so | A profile card; covering the dock | Steps tick only on the host's word. Sits clear of the dock | `/gallery/ported` |
| InnerNav | `components/ui/InnerNav.tsx` | Second-level navigation inside an inner area | The main navigation (the dock and the side nav own it) | The toggle follows the finger and settles on the spring; Escape closes | `/gallery/ported` |
| BatchTray | `components/ui/BatchTray.tsx` | Bulk actions when something is selected | A single-item action | Rises on selection; drag the grip down, Clear or Escape dismisses. The count and sentence are the host's | `/gallery/ported` |
| ActionSheetIllustrated | `components/ui/ActionSheetIllustrated.tsx` | A list of actions with an illustrated header (north star 15.2) | A plain list sheet with nothing to illustrate | Composes `Sheet`, so rise, scrim, drag and focus are Sheet's. One quiet dismiss | `/gallery/ported` |
| ParticleDelete | `components/ui/ParticleDelete.tsx` | Removing something trivial from a list | Money, a payout method, a transaction record or an account | Deletes first, dissolves only if that worked. Reduced motion and data saver get a fade | `/gallery/ported` |
| BookCallButton | `components/ui/BookCallButton.tsx` | Marketing surfaces only | Inside the product | A capsule, the one marketing exception | `/gallery/ported` |
| AIResponse | `components/ui/AIResponse.tsx` | The shape of a streamed assistant answer | Anything that is not an assistant answer | Thinking is the one permitted loop and is a shaped skeleton, never a spinner | `/gallery/ported` |
| PaymentSteps | `components/app/payments/PaymentSteps.tsx` | The real steps of a payment as the server reports them | A timer standing in for a state | Real states only; the founder's infinite spinner was replaced | None yet (needs a payment record to look at) |
| Vector mark and wordmark | `public/brand/vallo-{mark,wordmark}.svg`, `components/auth/vector-mark.ts` | The brand mark where a raster would blur | Recolouring by hand | Hand-authored on the raster's viewBox | None yet |

## Findings recorded while writing this page

- **`Button loading` without `morph` still draws `.nf-spinner`** (`components/ui/Button.tsx`,
  the non-morph branch of `Content`). The rules say no spinners. The gallery does not show
  that path. Prefer `morph` on the one action and a shaped state elsewhere; the old branch
  is the lead's to retire or to re-draw as a held arc.
- **`/gallery` itself does not link to the family routes.** The shared frame links them to
  one another and back to `/gallery`, but `app/(dev)/gallery/page.tsx` (not owned by the
  gallery agent) has no index of them.
- **The nav hierarchy has no pattern for `/gallery/*`.** `lib/nav/route-parents.ts` matches
  routes exactly, so each static gallery route is a `NON_NAVIGABLE` entry (listed in the
  Session 3 response), like `/gallery/ported`.
- **Not mounted anywhere:** `PaymentSteps` and the vector mark. The first needs a payment
  record to render honestly; add a route when one exists.
