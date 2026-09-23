# Artwork the founder still has to commission

**One job for the founder in this file: order light renders.** Everything in it
was measured rather than judged by eye, and everything that could be fixed
without new artwork has been fixed already, so nothing below is waiting on
engineering.

Written 23 September 2026. Regenerate the numbers with:

```
node docs/design/proofs/paper/measure-object-ground.mjs
node docs/design/proofs/paper/sweep-untwinned.mjs --base http://127.0.0.1:3184
```

---

## 1. What the problem is, in one paragraph

The brand objects under `apps/web/public/brand/glass` are renders of glowing
glass objects **photographed on black**. 23 of the 144 have a second, separately
drawn version for daylight; **121 do not**, so on a white page those 121 paint
their night artwork on a navy plate. An object drawn for black is not recoverable
from a filter: the difference between the night object and the day object is
which parts of it are TRANSPARENT, and no colour transform moves a hole. That is
why this is a render order and not a stylesheet change.

## 2. What was fixed without new artwork, and what it bought

The plate under the object used to be one flat navy, `#052A6D`. It was carrying
two jobs that pull opposite ways: it is the ground the OBJECT is composited
against, where darker is strictly better, and it is the edge the PAGE sees,
where darker reads as a hole punched in white paper. A flat colour can only
answer one of them, and it had been retuned twice in opposite directions.

The plate is now lit from its edge: a radial from a deep core out to the same
navy at the rim (`--nf-icon-plate` in `packages/design-tokens/src/tokens.css`).

| | before | after |
|---|---|---|
| median contrast of the object's body against its plate, over all 121 | 2.37:1 | **3.40:1** |
| objects under 2:1 | 25 of 121 | **1 of 121** |
| objects under 3:1 | 110 of 121 | **29 of 121** |
| the plate's edge against a white card | 13.44:1 | **13.44:1, unchanged** |

The last row is the point: the objects got a third of their contrast back and
the page did not get a blacker square on it.

**This is the ceiling.** The best ground that exists without a render is the
black the artwork was shot on, and that scores 3.57:1. Anything above that needs
artwork, because a ground can only hand an object back the contrast it was drawn
with; it cannot add any.

## 3. The objects still under 3:1, which is the render order

29 objects, **256 by 256 PNGs with a real alpha channel, dropped into
`apps/web/public/brand/glass/light/` under exactly the same file name as the
dark original**. That is where the 23 existing twins live and it is the only
wiring a new one needs: add the name to `LIGHT_TWINS` in
`apps/web/src/design-system/icons/BrandIcon.tsx` and the plate switches itself
off for that mark. `brand-icon-assets.test.ts` fails if a name is added without
its file, which is deliberate: a twinned name with no file suppresses the plate
and leaves a person in daylight looking at nothing at all.

Do NOT send a recolour of the dark file. The difference between the two is
which parts of the object are TRANSPARENT, and no colour transform moves a
hole; a frosted-white mark keyed off white inverts on a dark ground, which is
the test that produced the 23.

"Was" is the flat plate, "now" is the lit plate; both are the median contrast of
the object's own body against the plate under it.

| object | was | now |
|---|---|---|
| `wallet-naira` | 1.53:1 | 1.84:1 |
| `bookmark-ribbon` | 1.62:1 | 2.00:1 |
| `chart-ring` | 1.58:1 | 2.09:1 |
| `home-ring` | 1.66:1 | 2.13:1 |
| `calendar-grid` | 1.67:1 | 2.13:1 |
| `shield-check-tile` | 1.83:1 | 2.14:1 |
| `chat-ring` | 1.64:1 | 2.19:1 |
| `calendar-ring` | 1.70:1 | 2.21:1 |
| `inspect-ring` | 1.78:1 | 2.21:1 |
| `brain-ring` | 1.76:1 | 2.24:1 |
| `key-ring` | 1.73:1 | 2.25:1 |
| `people-ring` | 1.81:1 | 2.27:1 |
| `wallet-tile` | 1.78:1 | 2.27:1 |
| `search-ring` | 1.79:1 | 2.29:1 |
| `bed-ring` | 1.84:1 | 2.29:1 |
| `building-chip` | 1.71:1 | 2.30:1 |
| `stays-hotel-palms` | 1.67:1 | 2.31:1 |
| `wallet-chip` | 1.84:1 | 2.38:1 |
| `manage-ring` | 1.80:1 | 2.40:1 |
| `shield-ring` | 1.81:1 | 2.42:1 |
| `brain-chip` | 1.83:1 | 2.43:1 |
| `flip-coin` | 1.97:1 | 2.48:1 |
| `bell-tile` | 2.10:1 | 2.56:1 |
| `wallet-ring` | 2.01:1 | 2.57:1 |
| `globe-chip` | 1.83:1 | 2.67:1 |
| `city-ring` | 1.98:1 | 2.71:1 |
| `headset` | 2.30:1 | 2.79:1 |
| `reviews` | 1.96:1 | 2.82:1 |
| `wallet` | 2.03:1 | 2.92:1 |

## 3a. The 29 are not scattered, and that is the useful part

The 121 untwinned objects come from two places. 80 were sliced from the supplied
sheets. **41 were cropped out of the reference renders**, on the ruling that an
object a governing render uses and the sheets lack is cropped, keyed and filed
under a name; `RENDER_CROPS` in `scripts/icon-manifest.mjs` records the render
and the region each came from.

Split the measurement by where the object came from:

| | objects | median on the lit plate | under 3:1 |
|---|---|---|---|
| sliced from the sheets | 80 | 3.54:1 | **2** |
| cropped from the renders | 41 | 2.43:1 | **27** |

**27 of the 29 are render crops**, and 20 of those 27 are crops whose native
size is 56 pixels or under: the `-ring`, `-chip` and `-tile` marks, which are
thin strokes of light with almost no body to them. Two are the opposite
extreme, `wallet-naira` at 186 and `stays-hotel-palms` at 252.

So this is not "the pack is too dark for paper". **The pack is fine and the
crops are not**, because a mark cut out of a render at 36 pixels was drawn to
sit in a composition on a dark screen, not to be an icon on a white page. The
two sheet objects that fail, `reviews` and `wallet`, are the only part of this
that is a surprise.

**What that means for the order.** The 27 crops want to be REDRAWN for daylight
rather than re-rendered at size: giving a 36px ring more pixels does not give it
more body. The two sheet objects want the ordinary light twin the other 23
already have.

## 4. The rest of the 121

The other 92 clear 3:1 on the lit plate and are legible on paper today. They
still want a light twin eventually, because a navy plate on a white page is a
container decision rather than a drawing, but **they are not blocking anything**
and they are not part of this order.


## 5. The surfaces, so the order can be placed against screens rather than names

Read off the rendered DOM rather than off the source, because 63 of the call
sites take their object name from a table and the table is the interesting
half. `BrandIcon` writes `data-object` and `data-twinned` onto every plate for
exactly this purpose, and `sweep-untwinned.mjs` walks the whole preview harness
in daylight and collects them.

**136 harness routes swept. 82 of them draw at least one object with no light
twin. 19 of those 82 draw one that is still under 3:1** on the lit plate, and
those 19 are the screens this order is actually for. Three routes could not be
opened and are named at the foot of the sweep's own output rather than counted
as clean: `/preview/f4/assistant` and `/preview/g4/error` timed out, and
`/preview/g4/not-found` serves a not-found body at HTTP 200, which is what that
route is for.

| surface | untwinned objects on it | the ones still under 3:1 |
|---|---|---|
| `/preview/session-b/profile` | 6 | `bookmark-ribbon`, `calendar-grid`, `shield-check-tile`, `wallet-tile` |
| `/preview/f4/profile` | 5 | `bookmark-ribbon`, `calendar-grid`, `shield-check-tile`, `wallet-tile` |
| `/preview/f4/settings` | 6 | `bell-tile`, `headset`, `shield-check-tile` |
| `/preview/session-b/wallet` | 6 | `shield-check-tile`, `wallet-naira` |
| `/preview/b1b/chooser` | 3 | `home-ring`, `key-ring` |
| `/preview/f5/agent-list` | 15 | `home-ring` |
| `/preview/f3/listing` | 9 | `manage-ring` |
| `/preview/e/wallet` | 5 | `wallet-naira` |
| `/preview/e/wallet-topup` | 5 | `wallet-naira` |
| `/preview/f5/agent-analytics` | 5 | `reviews` |
| `/preview/f1/home` | 4 | `manage-ring` |
| `/preview/e/send` | 2 | `wallet-naira` |
| `/preview/f5/agent-reviews` | 2 | `reviews` |
| `/preview/o3/agent-calendar` | 2 | `calendar-grid` |
| `/preview/session-b/wallet/send` | 2 | `wallet-naira` |
| `/preview/session-b/wallet/send-filled` | 2 | `wallet-naira` |
| `/preview/b1b/agent-done` | 1 | `key-ring` |
| `/preview/b1b/owner` | 1 | `home-ring` |
| `/preview/imgc/hotel` | 1 | `stays-hotel-palms` |

**Read the middle column before the right one.** A route that draws fifteen
untwinned objects and none under 3:1, like `/preview/f5/agent-list`, is not a
problem screen: the plate is carrying those fifteen. The screens that want
artwork are the ones in the right-hand column, and they concentrate hard:
`shield-check-tile`, `wallet-naira`, `bookmark-ribbon`, `calendar-grid` and
`wallet-tile` between them account for most of the list, and four of those five
sit on the profile and the wallet, which are the two surfaces the founder looks
at most.

**The harness is a stand-in for the product, not the product.** A preview route
is built to draw a surface's components with fixture data, so an object that
appears here appears on the real screen; an object drawn only in a state the
harness does not cover would be missed. `/preview/session-b/profile` and
`/preview/f4/profile` draw the same four, which is the harness agreeing with
itself about one screen.


## 6. How to check a delivered render before it is wired

Two commands, in this order, and neither needs a designer's eye.

```
node docs/design/proofs/paper/measure-object-ground.mjs
npm --prefix apps/web test -- brand-icon-assets
```

The first reports the object's median contrast against the plate it will sit
on. A delivered twin should not need the plate at all: a light twin is drawn
for paper, so once its name is in `LIGHT_TWINS` the plate switches off for that
mark and the object is composited on the white card directly. Measure it
against white before wiring it, not against the plate.

The second is the correspondence test. It fails if a name is in `LIGHT_TWINS`
with no file, which is the worst of the three ways this can go wrong: the
component sets `data-twinned="true"`, the plate is suppressed as though a
paper-ready mark were about to paint, and a person in daylight gets a missing
image on a white page with nothing behind it.

**And one mark is deliberately withheld.** `escrow-hold` has a light twin in
`glass/light/` with no dark original and no entry in either list. It is not an
oversight: `docs/BRAND_MARKS.md` says build it and do not ship it until escrow
exists, because `lib/legal/terms.tsx` states that Vallo does not hold your
money. Do not wire it while that is true.
