# The polish pass

Written 2026-08-04 by the lead, replacing the remaining 28 items of
`docs/agent1-selection.md` on the owner's instruction.

The first 22 items were features: reviews, payouts, capacity, utilities, the
admin console, booking for somebody else. The remaining 28 were more of the
same, and the owner has called it: **from here the work is upgrades, not
features.** Small, unglamorous, everywhere. The kind of thing that separates a
product somebody uses from a product somebody trusts.

## The rule for this pass

Nothing here adds a table. Nothing here adds a screen. If an item needs a
migration, it is in the wrong list.

Every item must still close its loop, which for a polish item means: the change
is real on the surface, it holds in BOTH themes, it holds at 390px and at
desktop width, and a spec or a screenshot proves it. "It looks better" is not a
verification.

Batch them. These are five-minute changes with ten-minute verifications, so
doing them one commit at a time wastes the day. Group by theme, ship a group,
move on.

---

## Tier 1: things that are currently wrong

Not preferences. Defects that happen to be small.

| # | Item | Why it matters |
|---|---|---|
| P1 | **44px minimum on every interactive target, swept.** `PageHeader` was 36px and is fixed; nothing has checked the rest. Chips, icon buttons, close controls, tab bars, card action rows | A target under 44px is a control that misses on a phone. It is an accessibility failure and a rage-tap |
| P2 | **Every overlay closes on Escape, traps focus, and locks body scroll.** Sheets, drawers, the create ring, the action menu, the comments sheet, every modal | An overlay you cannot escape with a keyboard is a trap. A page that scrolls behind a sheet is the single most common mobile bug in the world |
| P3 | **Truncation sweep.** `PageHeader` was fixed; `grep` for `truncate` and `text-ellipsis` across every component and justify each one | Owner rule: never truncate a sentence. "Places on R..." tells nobody anything and cannot be recovered from |
| P4 | **Aspect-ratio boxes on every image.** Listing cards, post media, story rails, avatars, the media grid | Without one, every image load shifts the layout under somebody's thumb. This is measurable as CLS and felt as jank |
| P5 | **Focus-visible rings on every focusable element**, in both themes, meeting contrast against the surface behind them | Keyboard navigation is currently invisible on most surfaces |
| P6 | **`prefers-reduced-motion` honoured** by every transition, the create ring animation, and any auto-playing movement | Motion sickness is not a preference to ignore |
| P7 | **Safe-area insets** on every fixed element, top and bottom, not only the tab bar | An iPhone home indicator sitting over a primary action |

## Tier 2: states that are missing or thin

| # | Item | Why it matters |
|---|---|---|
| P8 | **Loading states on every async surface.** Skeletons that match the shape of what arrives, not spinners | A spinner says "something is happening". A skeleton says "here is what is coming", and it stops the layout jumping when it lands |
| P9 | **Empty state sweep.** Every list, every tab, every filter result, every search. Each names what would be here and offers the one action that would fill it | An empty box is the product failing to speak. Several were fixed already; nobody has checked them all |
| P10 | **Error state sweep.** Every failed read renders something designed, never a blank and never a raw message | A 500 that renders nothing is indistinguishable from an empty result |
| P11 | **Disabled controls say why.** A greyed button with no explanation is a dead end that looks like a bug | |
| P12 | **Optimistic feedback on every toggle** that does not have it: save, follow, like, mark read, notification switches | A control that waits a round trip before moving feels broken on a Nigerian mobile connection |
| P13 | **A toast or inline confirmation after every write.** One pattern, used everywhere, never two patterns on one screen | |

## Tier 3: consistency

| # | Item | Why it matters |
|---|---|---|
| P14 | **One number format.** Counts (1.2k), money (integer kobo through `formatMoney`), dates, relative time. Currently `whenLabel` and `lagosTimeLabel` are separate implementations | Two formats on one screen reads as two products |
| P15 | **Sentence case sweep** across every label, button and heading. No Title Case, no ALL CAPS except the deliberate overline | |
| P16 | **Icon audit**: `BrandIcon` for content, `UiIcon` for navigation, one weight, one size scale, no `Icon3D` anywhere | |
| P17 | **Back control on every sub-page**, going somewhere sensible rather than to history, which breaks on a deep link | A deep link with no way back is a dead end by definition |
| P18 | **Active navigation state correct on every route**, including nested ones and query-string routes like `/search?type=hotel` | |
| P19 | **Spacing scale audit.** One rhythm, from the tokens, no arbitrary pixel values sneaking into components | |
| P20 | **Both themes, every screen, looked at.** Not asserted: looked at. Hunting the lavender that `--nf-brand-primary-soft` produces over paper | It has broken the no-purple rule twice already |

## Tier 4: input and form feel

| # | Item | Why it matters |
|---|---|---|
| P21 | **`inputmode` and `enterkeyhint` on every input.** A phone field that opens a QWERTY keyboard is a small insult repeated every time | |
| P22 | **`autocomplete` attributes** on every field a browser or password manager could fill | |
| P23 | **Character counters** on every length-limited field, appearing before the limit rather than at it | |
| P24 | **Field errors beside their field**, never only at the top, and the first invalid field receives focus on submit | |
| P25 | **Password visibility toggle**, and never blocking paste | Blocking paste in a password field is hostile to anybody using a password manager |
| P26 | **Submit disabled only while in flight**, never as a validation strategy | A permanently disabled button with no explanation is P11 in its worst form |

## Tier 5: reach

| # | Item | Why it matters |
|---|---|---|
| P27 | **Skip-to-content link**, and one `h1` per page | |
| P28 | **`aria-label` on every icon-only control.** The tab bar has them; almost nothing else does | An icon-only button with no label is invisible to a screen reader |
| P29 | **`aria-live` on every region that changes without a navigation**: toasts, optimistic counts, search results | |
| P30 | **Colour is never the only signal.** Unread, held, error and required states each need a shape or a word beside the hue | |

---

## Not in this pass

Anything needing a migration. Anything needing a new route. Events, the AI
summon, seasons, WhatsApp share, the check-in and check-out filters: all still
open, all still ranked in `agent1-selection.md`, none of them polish.
