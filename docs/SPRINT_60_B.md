# The second sixty

**What is left in `docs/FRONTEND_REVAMP.md`, ranked again by what a person
actually sees.** Same three owners, same non-overlapping scopes, same rule that
the lead re-audits and commits everything.

---

## How many are available, answered honestly

**303 findings are filed** in `docs/FRONTEND_REVAMP.md`. That is the count of
unique ids, checked for duplicates: 150 `L`, 78 `F1`, 75 `F2`, and no id
appears twice. As filed they are 28 Critical, 115 High, 126 Medium, 21 Low and
13 Nice-to-have.

**There is no per-id ledger of what the first sixty closed, and I am not going
to invent one.** The first sixty were written thematically: they name surfaces
and jobs ("Wallet", "The button set, rebuilt", "One admin queue frame"), not
finding ids. Searching every sprint commit message and `docs/SPRINT_60.md` for
a finding id returns exactly one match. So any table claiming "item 31 closed
L-55, L-56 and F1-089" would be me reconstructing it after the fact, and the
founder's standing rule is that nothing is called done unless it is true.

**What can be stated as fact:**

- **8 findings are provably closed**, because the file they are about no longer
  exists: F1-001, F1-009, F1-010, F1-014, F1-016, F1-019, L-128, L-132.
- **The sixty went almost entirely at Critical and High.** Its three queues map
  onto the fifty in section 9 of the revamp, which is itself drawn from the
  Critical and High bands. The Medium band, 126 findings, was barely touched.
- **Every one of the sixty below was checked against the tree today**, by
  grep, by reading the file, or by rendering it. They are all still open. That
  is a floor established by verification, not an estimate.
- **There is a third sixty in the file after this one.** 126 Medium plus 21 Low
  plus 13 Nice-to-have is 160 findings, and this list spends about 45 of them.

So the answer to "how many would be available" is: **at least 60, verified one
by one, and realistically about 180 once the untouched Medium band is counted.**
The first number is proved. The second is an estimate and is labelled as one.

---

| Owner | Scope | Files it may touch |
| --- | --- | --- |
| **A** | The material, motion, and the system's debt | `apps/web/src/app/css/**`, `apps/web/src/design-system/**`, `apps/web/src/components/ui/**`, `packages/design-tokens/**` |
| **B** | The in-app surfaces, money and the console | `apps/web/src/app/(app)/**`, `apps/web/src/components/app/**`, `components/verification/**`, `components/social/**`, `app/agent/**`, `app/admin/**` |
| **L** | Words, brand, identity and the legal pages | `apps/web/src/app/(site)/**`, `app/page.tsx`, `app/layout.tsx`, `components/site/**`, `packages/i18n/**`, `apps/web/public/brand/**`, `app/manifest.ts`, `docs/**` |

**Nobody touches another owner's files.** A finding outside your scope is a
line in your report, not an edit.

---

## Owner A: the material, and the debt under it

The first sixty built the scales. This queue is the part nobody enjoys: making
every call site actually use them, and closing the two ideas that are still
duplicated inside the material itself.

1. **`.nf-stride` is renamed or folded into the ladder.** `glass.css:272`
   carries its own brand-bloom shadow stack and is a fourth elevation idea
   beside the ladder. It also now collides by name with the edge strides
   shipped today, which is a trap for the next person. L-68
2. **The legacy shadow aliases die.** `--nf-shadow-card`, `--nf-shadow-lifted`
   and `--nf-shadow-float` are documented as aliases to be migrated and are
   still read by `app/social-feed.css`, `app/settings-rows.css`, `chips.css`
   and `light.css`. Six live references, counted. L-67
3. **`.nf-glass--thin` gets its own shadow rung.** It changes fill and blur and
   leaves the shadow of the thick surface behind it, so the depth modifier
   modifies two thirds of the depth. L-64
4. **The glass shadows join the elevation ladder.** `--nf-glass-shadow` is two
   layers, `--nf-elev-5` is three, and they are used on surfaces a rung apart.
   L-66
5. **One light angle for the whole material.** `--nf-glass-specular` is at
   152 degrees and the card's own highlight is at 160. Nothing in the product
   is lit from two directions on purpose. L-140
6. **The 205 remaining raw colour literals go through the scale.** Down from
   304 before the sprint and 208 this morning. `check-css-tokens` counts them
   and does not yet enforce them.
7. **987 arbitrary font sizes migrate to the ten step scale.** 45 distinct
   `text-[…rem]` values. L-90. Measured again on 16 September: 979, of which
   five are in owner A's scope and all five are correct (an iOS zoom threshold
   and four em-relative sub-parts). The other 974 belong to owners B and L, so
   this is not the material owner's item to finish. See the correction under
   item 9: the rule meant to hold it at zero does not exist yet.
8. **2,635 raw spacing steps migrate to the eleven step ladder.** L-138
9. **Then the design-system lint rules become errors.** This is the close of
   items 6, 7 and 8 rather than a job of its own, and `eslint.config.mjs`
   says so in its own header. Until it lands, none of the three stays fixed.
   L-135
   **Correction, 16 September.** This item and item 7 both assumed three
   design-system rules. There are two. `apps/web/eslint-rules/` holds
   `no-raw-colour.mjs` and `no-raw-spacing.mjs`, the config registers those two,
   and **`nf/no-arbitrary-font-size` has never existed**, so the 979 arbitrary
   font sizes item 7 counts have nothing watching them and cannot be held at
   zero once cleared. Writing the rule is now the first item of owner A's
   second block. Verified by reading the rules directory and the config, not
   inferred from the warning output.
10. **`.nf-overline` stops being 11.5px uppercase in muted ink.** At that size,
    that tracking and that contrast it is the least readable text in the
    product, and it labels most sections on the landing page. L-96
11. **The three decimal rem values leave the type scale.** `0.90625rem` and
    `0.8125rem` do not round to a device pixel at any common ratio. L-95
12. **The layout tokens grow up.** Three exist, and call sites hand-write the
    header height and the rail width beside them. L-139
13. **A measure token.** `max-w-[42ch]`, `max-w-[46ch]` and `max-w-[52ch]` are
    hand-written answers to one question. L-28
14. **`Sheet` takes an `initialFocus` prop.** It focuses the first focusable
    node, which in every wallet drawer is Close, so opening a drawer puts the
    keyboard on the dismiss control. F2-052
15. **`Sheet` reads the visual viewport.** Its detents and its dismissal
    threshold come from `window.innerHeight` at `Sheet.tsx:116`, which is the
    wrong number whenever a mobile keyboard is up, which on a withdrawal form
    is always. F2-051
16. **The sheet backdrop stops being one hard-coded black for both themes.**
    F2-038
17. **`.nf-reveal` loses one of its two paths.** A CSS scroll timeline and an
    IntersectionObserver run the same animation, which is the fault the
    entrance choreography already fixed once. L-104
18. **`Reveal` stops gating content behind an observer with a per element
    blur.** A visitor whose observer never fires gets a blank section. F2-054
19. **`UI_ICON_SIZES` and the documents agree.** Code says
    `[16, 20, 24, 28, 32, 40]`, `ICON_SYSTEM.md` and `HANDOFF.md` rule 18 both
    say 12 to 32. One of them is wrong and neither knows which. F1-100
20. **`PostGlyph` folds into `UiIcon`.** A fourth icon namespace surviving as
    an adapter, outside the three files the system documents. F1-103

---

## Owner B: money, the queues, and the words inside the product

21. **"Switches on shortly" leaves the product.** Ten live strings. It is
    "coming soon" in other words, and the ban is enforced by five specs that
    the synonym walks straight past. F2-003
22. **"Trips" leaves the product.** Three live strings, a banned synonym.
    F2-002
23. **"Card payment switches on the moment payment keys land" stops being
    shown to somebody holding a card.** `PayPanel.tsx:211`. Our infrastructure
    problem, told to a customer in our words. F2-023
24. **The wallet speaks four languages.** `STATUS_LABEL` and `KIND_NOUN` are
    hard-coded English maps, and the ledger's status pill prints the raw enum
    in lower case. F2-008
25. **Withdraw and transfer stop succeeding into a dead end.** Both success
    states replace the form and leave the person with nowhere to go. F2-012
26. **Both money paths get a timeout.** If the call never settles, the person
    sits on a spinner for as long as they are willing to. F2-018
27. **`result.error` stops reaching the user unfiltered.** Whatever string the
    server returns is painted on the screen, on the card path. F2-022
28. **The hold clock stops ticking seconds for 48 hours**, and its expired
    branch stops telling you to pay anyway. F2-021
29. **Money in and money out get different marks.** `KIND_ICON` draws
    `transfer_in` and `transfer_out` with the same object. F2-009
30. **The wallet drawer header stops putting a decorative object on the close
    button's baseline at the close button's size.** F2-013
31. **A message that failed to send stops looking sent.** F2-069
32. **A read state exists.** There is none at all today. F2-070
33. **Settings gets a way to jump.** 4,143px of twelve stacked cards, measured.
    F2-071
34. **One empty-state action pair, and the second action stops being wrong.**
    F2-073
35. **Three screens stop orphaning the last word of the same headline
    pattern.** F2-072
36. **`MomentScreen`'s last call site goes through `ResultSheet`, and the
    component is deleted.** One call site left, in `ListingWizard.tsx:993`.
    F2-025 goes with it: the `state` prop it passes to `BrandIcon` is honoured
    only in the tiled branch, so today it is silently discarded.
37. **`QueueFilters` reaches the other eighteen queues.** Two of twenty console
    destinations have it. F2-055
38. **`/admin/bookings`'s status filter narrows the query, not the rows already
    returned.** Carried forward from the sixty, named there.
39. **Four admin surfaces stop printing raw database values as chip labels.**
    `label={entry.status}` gives the operator `PENDING` in capitals. F2-060
40. **Stat tiles stop carrying their meaning in colour alone.** F2-064
41. **The console's navigation stops truncating**, the queue count badge
    becomes visible on the active row, and on a phone the nineteen chips get
    their bands back instead of one horizontal scroller. F2-062, F2-063
42. **`MORE_INFO_REQUIRED` gets a screen**, and the rejection's "try again"
    stops returning to the rejection. Both are the supply side dead ending on
    the two states where the applicant has to act. F2-067, F2-068
43. **An agent can record that a stay happened.** `booking_status` is
    `PENDING, CONFIRMED, CANCELLED`, verified live, so there is no completion
    to record. This is a schema recommendation with SQL attached, for the
    founder to approve, not a migration to run. F2-066
44. **The raw `.nf-icon-tile` at `agent/dashboard/page.tsx:154` goes**, with
    the four other tinted tiles the standard bans. F2-034

---

## Owner L: the marketplace scope, finished properly

The landing page says marketplace now. Nothing else does. This queue is that
correction carried into the pages a person reads when they are deciding whether
to trust us, plus the brand assets still carrying the old direction.

45. **"Host" leaves public copy.** `PRODUCT.md` section 7 says the word is
    Agent. It is live in `/cancellations`, `/safety`, `/help` and the docs
    chapters. F1-083
46. **The "cleaning charge" sentence leaves `/safety`, `/help` and the docs.**
    It describes the total before confirming as "the nightly rate and the
    cleaning charge", which is a shortlet's total presented as the whole
    marketplace's. Four live places. This is the scope correction, in the
    pages that carry legal weight. F1-084
47. **`/contact`'s response-time promises go, or get something behind them.**
    "We reply within one business day" with no rota and no queue. F1-085
48. **`/about` stops saying "we earn only when a booking completes".** It is
    not true of a sale, a lease or a land listing, and it describes a fee model
    the product does not run. F1-080
49. **`/about` stops saying every listing is checked and every agent is
    identity-verified.** Zero listings are verified, enforced by a check
    constraint. F1-082
50. **`/around` and `/u` stop saying "the platform keys" and "mock up".** Our
    words for our own internals, on a public page. F1-095
51. **`/around` loses its second Vallo mark**, about 100px below the first.
    F1-096
52. **`/around` and `/u` get one empty-state anatomy between them.** F1-097
53. **The docs chapters, the terms and the privacy policy take the marketplace
    scope.** The landing page now says nine markets and one account; the legal
    pages still describe a booking product. They are the same promise or they
    are a contradiction somebody will screenshot.
54. **`homes-sparkle` and `house-sparkle` are commissioned.** The last two of
    the 87 in live use with no glass equivalent on any of the ten sheets.
    Named in the sixty's close-out.
55. **The light pass of the six untwinned sheets.** 24 of 103 glass objects
    have a daylight twin. The other 79 ride the navy chip, which was tested and
    is good, but a twin is better and half the users are in daylight.
56. **The mark-only logo render.** `build-brand-marks.mjs` already prefers it
    automatically the moment the file exists.
57. **The favicon and the splash.** The favicon is declared at 16, 32 and 48
    from a photographic tile, so at 16px it is a blue blur; the splash has
    never been checked against the current mark. L-21, L-15
58. **The manifest gains a `screenshots` array**, which is what turns the
    install prompt from a browser dialogue into a store card. L-14
59. **`vallo-wordmark.png` gets used or gets deleted**, and `BRAND_MARKS.md`
    stops instructing new marks to match the retired clay set. L-17, L-149
60. **One seeded environment with credentials.** Still the highest-leverage
    item on either list. Roughly a third of this product by surface area has
    never been looked at by anybody doing this work, because there is no way
    in. It was named independently by two agents in the first audit and it is
    still true this morning.

---

## Progress, updated as it lands

**Landed and committed: 9 of 60.** Items 43, 45, 46, 47, 48, 49, 53, 58 and 59.
Item 48 and item 59 were found already closed by earlier work and are counted
as landed rather than re-done. Owner A is working items 1 to 20 and owner B
items 21 to 44 plus 50 to 52, which moved to B because the files are in B's
scope and were assigned to L by mistake.

**Blocked on the founder, and they cannot be unblocked from this side:**

- **Item 54**, the two objects to commission. Interim aliases point
  `homes-sparkle` at `cluster-home` and `house-sparkle` at `modern-house`, so
  nothing is broken while they are missing.
- **Item 55**, the light pass of six icon sheets. There is no light source
  artwork for the 79 untwinned objects, so there is nothing to cut.
- **Item 56**, the mark-only logo render. `build-brand-marks.mjs` already
  prefers it automatically the moment the file exists.
- **Item 57**, the favicon at 16px. **Tested rather than assumed, and the
  answer is that it cannot be fixed by processing.** The script already does
  the right thing: it drops the wordmark below 48px and cuts the two favicon
  sizes from the mark alone. The mark itself is the problem. Five thin glass
  towers and an orbital swoosh, rendered photographically, carry more detail
  than sixteen pixels can hold. Three treatments were rendered and compared at
  ten times magnification: a plain downscale, a trimmed downscale, and a
  trimmed downscale with sharpening and a contrast lift. All three are a blue
  blob. `docs/img/favicon-16-at-10x.png` is the current one at 10x. What this
  needs is a purpose-drawn favicon glyph, most likely one tower and the swoosh
  at full contrast, and that is a design decision rather than an asset
  pipeline change.
- **Item 60**, one seeded login. Still the highest-leverage item on either
  list, and still the reason roughly a third of this product by surface area
  has never been rendered by anybody doing this work.

---

## The standard, unchanged

- **390px first, in dark, then wider, then light.** A finding that only works
  in dark is half a finding
- **Motion is physics, not decoration.** Things arrive from where they came
  from, answer the finger, and settle. Nothing loops for its own sake
- **`prefers-reduced-motion: reduce` turns all of it off**, and the product is
  still complete without it
- **One ambient animation per viewport.** Everything else is event driven
- **Zero em dashes. British spelling.** No orange, amber, gold or purple, ever.
  Emerald success, rose error, bright cyan pending
- **No new raw colours and no new raw spacing.** Use the scale or add to it
- **Never say tested, verified or done unless it is true**
- **This is a marketplace.** Rent, buy, sell, shortlet, land, commercial, and
  the money rails coming after them. Any sentence that reads as though we only
  let flats is a finding, wherever it is

---

## What is deliberately not in this sixty

**Anything needing a migration.** Item 43 is written as a recommendation with
SQL attached because the standing instruction is that this is an audit and the
founder decides schema.

**Escrow, again.** Three findings still touch it and the answer to all three is
still to stop mentioning it.

**The crypto and stablecoin rails.** They belong in the product roadmap, and
`NextBand` on the landing page already states them as the future in the future
tense with nothing linked. Writing screens for them before the decision is made
is how the first landing page ended up advertising a feature that did not
exist.

**Google sign-in copy.** Held pending the OAuth decision, which is N-4 and is
the founder's to make.
