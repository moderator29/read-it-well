# Brand marks: the glass system

**Rewritten 16 September 2026, and the thing it used to say is now wrong.**

This file used to open by saying there are two 3D languages in the brand, that
the logo is glass and neon and the 87 objects are soft matte clay, and that **new
marks must match the clay, not the logo**. That was correct when it was written
and the world moved. The founder has supplied ten sheets of glass artwork in the
logo's own language, and the clay set is what is being replaced. **The
instruction is now the opposite: match the logo.**

The old section 3 of this file was a commission for twenty four transaction and
status marks. **That commission has been delivered.** Section 4 below says which
arrived, under which names, and which one must not be used.

Read `docs/archive/HANDOFF_03_FRONTEND.md` for the direction, `docs/ICON_SYSTEM.md` for
the two tiers, and `docs/archive/FRONTEND_REVAMP.md` for the full replacement map.

---

## 1. The house style, and it is the logo's style now

**Glass.** A transparent object lit from inside, rendered on black, with an
electric blue body, a bright rim where the light catches an edge, white where a
surface is nearly normal to the light, and a soft bloom around the whole thing.
No plinth, no white paper, no contact shadow. Three-quarter view from slightly
above, same as before.

The important property, and the one every rule below follows from: **these
objects are additive light.** The render is close to `object + black`, so the
glow is not decoration around the mark, **the glow is part of the mark**, and its
brightness is its opacity. Crop it off and the object stops looking like the
logo.

**And "brightness" means the brightest channel, never luminance.** Luminance
weights blue at 0.0722 and the subject here is blue, so a luminance key reads the
most saturated parts of the mark as background and keeps the white highlights.
The first cut of these objects made exactly that mistake and came back pale cyan.
`scripts/cut-icon-ground.mjs` carries the full account.

The clay set is the other language: soft matte white, brand blue only on the
part carrying the meaning, on a white rounded-square plinth, lit as a studio
photograph. **The two cannot coexist in one product.** Every surface moves
together or the set reads as two sets.

---

## 2. What exists today

Ten unique sheets, in `assets/brand-sheets/`. Twelve were supplied and two were
byte-for-byte duplicates, confirmed by checksum before deletion.

**210 objects, all sliced, keyed to alpha and named.** 139 are delivered as
files in `apps/web/public/brand/glass/`: 103 objects at 256px, 24 light twins,
and 12 wide hero scenes at source resolution. 3.3MB in total, against 6.5MB for
the 87 clay objects still live in `apps/web/public/brand/icons/`.

`scripts/icon-manifest.mjs` is the authority on what each of the 210 is and which
drawing of a repeated object wins. `assets/README.md` says how to rebuild the
whole set from the sheets, which is three commands.

**Nothing is wired up.** The glass set sits beside the clay set rather than on
top of it, so it can be reviewed in place, at real sizes, in both themes, before
anything moves.

---

## 3. Light and dark, which is a pairing and not a filter

**This was tested rather than assumed**, and the evidence is two images in this
repository: `docs/img/glass-on-four-grounds.png` and
`docs/img/glass-in-daylight.png`. Both artworks, against all four real surfaces
in `packages/design-tokens/src/tokens.css`.

| | Dark surfaces | Light surfaces |
| --- | --- | --- |
| **The dark artwork** | Excellent. No halo, no edge anywhere | Usable, but its glow becomes a soft blue field around a roughly square footprint |
| **The light twin** | **Fails.** The white tick inside `seal-check` turns black | Excellent |

**No filter crosses that gap.** Not `invert()`, not `hue-rotate()`, not an
opacity change, because the difference between the two is **which parts of the
object are transparent**. A frosted white object keyed off white leaves the white
as the transparent part, so on a dark ground it inverts.

So a mark that must work in both themes needs **two files, not one recolouring**,
and the two share a name: `glass/<name>.png` and `glass/light/<name>.png`.

**Only the 24 transaction marks have a twin today.** For the other 79 objects the
answer is not 79 more files. **The dark artwork on a navy chip in daylight was
tested and is visibly the most premium the set looks anywhere**, and it removes
the square halo the bare object leaves on white. `--nf-icon-ground` is already the flat plate `BrandIcon`
draws behind an untiled object, and it already resolves to `transparent` in the
light theme because the clay artwork needs nothing there. Pointing it at the base
navy solves 79 objects with one token.

Commission the light pass of the remaining six sheets only for the places an
object must sit bare on paper with no chip allowed: **email, print, and a
light-theme empty state where a chip would read as a hole.**

One honest limit. **A glass object is see-through by design**, so its alpha is
partial across the interior. That is correct on a dark surface and reads thin on
a pale one, and it is exactly why the chip works: the chip gives the glass
something to be glass against.

---

## 4. The commission, delivered

The old section 3 of this file ordered twenty four marks by name, each with the
state it serves and a description of the object to build. **Sheet `CF5A4150` is
that order, filled.** Twenty three of the twenty four are on it, and several
match the written description object for object: mark nine was specified as a
"blue-banded strongbox with a naira note half inside", and index 09 is a
blue-banded strongbox with a naira note half inside.

**The delivered marks keep the names this file gave them**, because a document
that already specifies a name is the authority and renaming a delivered
commission strands the document that ordered it. Three deviations:

| Ordered as | Delivered as | Why |
| --- | --- | --- |
| `hourglass-blue` | `hourglass` | A colour does not belong in an object's name. The light twin of this object is not blue |
| `info-round` | `info` | The roundness is not the meaning |
| `payment-pending` | **not delivered** | Index 03 is a plain naira coin, not a pending state, so it is named `coin-naira` rather than pressed into a role it does not play |

**`payment-pending` needs no commission.** Pending is covered twice over by
`seal-pending` and `hourglass`.

### One mark is delivered and withheld

**`escrow-hold`, mark nine.** This file said of it: build it, do not ship it
until escrow exists. **Escrow does not exist**, and
`apps/web/src/lib/legal/terms.tsx` now says in as many words that Vallo does not
hold your money in escrow, so an escrow mark on a screen would be the artwork
contradicting the contract.

It is cut, named, and in `WITHHELD` in the manifest so that nothing can reach for
it by accident. **Keep it.** The day the product does hold money, it is already
drawn.

### There is a live defect this mark points at

`apps/web/src/components/app/wallet/BalanceBreakdownSheet.tsx` renders, to a
user: "Escrow moves money out of it and holds it until both sides are done",
"Money in escrow", "What you have in escrow", and "You have paid this into
escrow. It comes back if the deal does not happen." **The wallet screen and the
terms of service say opposite things about where somebody's rent money is.** That
is not an artwork problem and it is the highest-priority item in
`docs/archive/FRONTEND_REVAMP.md`.

---

## 5. What is still to commission

Small, and much smaller than expected.

**Two objects**, both in live use, both with no glass equivalent anywhere on the
ten sheets:

| Name | What it is for | Interim |
| --- | --- | --- |
| `homes-sparkle` | Several homes, recommended | `cluster-home` |
| `house-sparkle` | One home, featured | `modern-house` |

**One improvement rather than a gap.** `support-chat` is currently taken from
`2676C1FC` index 14, which is a bare headset, where the object it replaces is a
headset with a speech bubble. The headset is a fair drawing of support and it
keeps four live call sites working with no edit. A bubble-and-headset object
would be better.

**The light pass of six sheets**, per section 3 above, and only for the surfaces
named there.

Everything else is either already drawn, substituted in
`docs/archive/FRONTEND_REVAMP.md` section 2.6, or dead artwork that should be deleted
rather than redrawn.

---

## 6. Rules when new files come back

- **Rendered on black, not on white, and not on transparent.** The cutout is
  computed from the black ground; an object supplied on a transparent background
  has already had that decision made for it, usually badly. Give us the render.
- **Square, at least 1024px** for an object; a hero scene may be wider than it is
  tall and must not be squared.
- **The glow must be inside the frame.** A generous margin is not wasted space,
  it is the mark. The commonest way to ruin one of these is to crop tight.
- **No text, no letters, no numbers, anywhere in the artwork.** This platform
  ships `packages/i18n` and text baked into an image cannot be translated.
  `9795AD6E` index 23 is a hotel with the word HOTEL rendered into it as pixels;
  it is named `hotel-sign` and is used by nothing, for exactly this reason.
- **Filenames are lowercase with hyphens**, and where an object replaces one that
  exists, **it keeps that object's name**. That is what makes a swap a file change
  rather than a code change.
- **Add it to `scripts/icon-manifest.mjs` and rerun.** Never drop a file straight
  into `public/brand/glass/`: the manifest is what makes the set reproducible,
  and a file nobody recorded is a file nobody can regenerate.
- **Never mix these with `UiIcon`** in one row. `UiIcon` is the 40 stroked
  navigation glyphs, these are content objects, and the two tiers do not meet.
  See `docs/ICON_SYSTEM.md`.
- **No orange, amber, gold or purple**, ever, in any of them.
- **Check the render against the set before accepting it**, on the night canvas
  and on a white card, at 24px and at 96px. If the rim light, the bloom or the
  blue is different, regenerate rather than ship an object that looks like a
  visitor.

---

## 7. Every place money moves, and what the person sees while they wait

Added 15 September 2026. HANDOFF 02 section 24 calls pending "the most neglected
state in this product and the most anxious one for the user", and asks for every
place money moves with what the user sees while they wait. This is that list,
read from the code rather than from memory.

**The finding is not that pending states are missing. It is that they are
inconsistent, and that the worst one is on the screen carrying the most money.**

| Where | Action | What the person sees while it happens | Verdict |
| --- | --- | --- | --- |
| Wallet, fund | `fundWallet` | Button spinner **plus** a `role="status" aria-live="polite"` region | Good |
| Wallet, crypto top up | `startCryptoDeposit` | Button spinner plus a live region | Good |
| Wallet, withdraw | `withdraw` | Button spinner, a live region, and a sentence saying the withdrawal shows as pending until the bank confirms it | **Best in the product. This is the pattern** |
| Wallet, transfer to a user | `transferToUser` | Button spinner plus a live region | Good |
| Return from Paystack | `verifyFunding` | A banner with a live region and "Checking with the payment service. This takes a moment." | Good |
| **Checkout, pay by card** | `card-starting`, `card-redirecting` | **A `loading` prop on a button. No sentence, no amount, no live region** | **Worst, and it is the largest amount of money on the platform** |
| **Checkout, pay from wallet** | `wallet-paying` | **A `loading` prop on a button. Nothing else** | **Worst** |
| Agent application | submitted | A status page, no in-flight state | Weak |
| Listing submitted for review | `SUBMITTED` to `UNDER_REVIEW` | A status pill, no consequence line | Weak |

### The three things missing from every one of them

Even the good ones. This is where the marks in section 4 earn their place, and
**they now exist**: when this list was written they were a commission, and
`seal-pending` and `hourglass` have since been delivered on `CF5A4150`.

1. **A mark.** Every pending state in this product is a spinner. A spinner is
   the absence of a design. `seal-pending` and `hourglass` were drawn for exactly
   this and neither is used yet, because nothing is wired up.
2. **The amount.** A person who has just sent 850,000 naira wants to see
   850,000 naira on the screen that says it is going. Only the withdraw sheet
   does.
3. **The consequence, which is the line that removes fear.** "This usually takes
   a few seconds. If it takes longer, your money has not moved and nothing is
   lost." Only the withdraw sheet has anything like it, and it is the one people
   are least anxious about, because withdrawing is money coming back.

### One defect found and fixed while writing this

`PayPanel.tsx` painted the payment FAILURE branch in `--nf-state-warning`, which
resolves to `--nf-cyan-400`, which is this product's PENDING colour:
`--nf-status-pending` is defined as that same token. **A declined payment was
drawn in the pending colour**, on the one screen where the difference decides
whether somebody believes their rent money is gone. `--nf-state-error` existed,
resolves to rose and was reachable from nowhere on that path.

That is the same mistake the design system notes record about stars borrowing
the warning token to obtain a gold: a state token reused for the colour it
happens to be, rather than for the state it means.

It is now rose, with the cross glyph rather than a bell. **The missing pending
sentence and the missing mark are not fixed**, because those need the shared
confirmation component rather than another bespoke branch, and building a tenth
bespoke success screen is the thing section 24.3 says not to do.

### And the marks that are already right

`user-verified` is already the scalloped rosette with a white tick, which is
precisely the mark the founder's reference screenshot rendered in orange. **The
anatomy does not need redesigning**, and it survives the move to glass: it exists
on `B04429B0` index 17, under the same name, so the swap keeps it.

The generic version of the same shape is `seal-check`, and the reference's
anatomy is worth taking while its execution is everything this brand is not.
