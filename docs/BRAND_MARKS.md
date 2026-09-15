# Brand marks: the transaction and status set

What to commission so every success, pending, verified and failed moment in the
product has a mark that belongs to Vallo.

This file exists because of `docs/HANDOFF_02_PLATFORM.md` section 24. Read that
section before using this one: it explains the confirmation system these marks
sit inside, and why a generic orange tick is the wrong answer.

---

## 1. The house style, and it is not the logo style

There are two 3D languages in this brand and confusing them is the easy mistake.

**The logo** is glass and neon: a dark navy tile, electric blue rim light, chrome
and glow. It is the app icon and the identity.

**The 87 brand objects are something else, and the new marks must match them, not
the logo.** Looking at `wallet-secure.png` and `user-verified.png`, the actual
house style is:

- A **soft matte white object**, rounded and clay-like, no sharp edges
- **Brand blue only on the part that carries the meaning.** The wallet is white,
  the lock shield is blue. The person is white, the verified rosette is blue
- Sitting on a **white rounded-square plinth**, which every object shares and
  which is what makes 87 different objects read as one set
- **Pure white background**, soft studio lighting, gentle contact shadow, subtle
  ambient occlusion
- **Three-quarter view from slightly above**, consistent across the set
- Friendly and calm, not technical

**`user-verified.png` already solves the verified tick.** It is a scalloped
rosette with a white tick, in brand blue, on a white figure. That is exactly the
mark the reference screenshot did in orange. Use it, do not replace it.

---

## 2. What already exists. Check here first

Twenty of the 87 already serve a status or transaction meaning. **Do not
commission a duplicate.**

| Mark | Use it for |
| --- | --- |
| `user-verified` | Identity verified, the verified badge, a verified agent |
| `user-check` | Profile complete, application approved |
| `home-check` | Listing verified, property approved |
| `calendar-check` | Booking confirmed, inspection booked |
| `clock-check` | Completed on time, history |
| `calendar-clock` | Scheduled, upcoming, awaiting a date |
| `calendar-time` | Duration, tenancy period |
| `luggage-check` | Check-in complete, stay confirmed |
| `shield-check` | Protected, safe to proceed, trust |
| `shield-lock` | Secured, encrypted |
| `shield-home` | Property protection |
| `doc-shield` | Document protected |
| `doc-lock` | Document private, under lock |
| `card-lock` | Card secured |
| `wallet-secure` | Wallet, secured balance |
| `naira-hand` | Money, payment, payout |
| `bell-alert` | Attention needed, alert |
| `bell-badge` | New notification, unread |
| `gift-star` | Reward earned, referral |
| `tag-percent` | Discount, offer |

---

## 3. The gap. Twenty-four marks to commission

Grouped by the moment each one appears. Every row says the state, where it is
used, and the object to build.

### 3.1 Money moving. The highest value group

| # | Name | State | Object |
| ---: | --- | --- | --- |
| 1 | `payment-sent` | Payment made, rent paid | Naira note lifting off an open palm with a blue motion arc |
| 2 | `payment-received` | Money in, payout landed | Naira note dropping into an open blue-lipped pouch |
| 3 | `payment-pending` | Processing, in flight | Naira coin mid-spin inside a soft blue ring, slightly blurred |
| 4 | `payment-failed` | Declined, reversed | Naira note with a blue cross seal resting against it |
| 5 | `transfer-arrow` | Wallet to wallet, send money | Two rounded blue arrows curving between two white pads |
| 6 | `wallet-plus` | Wallet funded, top up | Wallet with a blue plus badge |
| 7 | `wallet-out` | Withdrawal, cash out | Wallet with a blue arrow leaving it |
| 8 | `receipt-check` | Receipt issued, proof of payment | Curled receipt with a blue tick seal |
| 9 | `escrow-hold` | Funds held safely. **Build it, do not ship it until escrow exists** | Blue-banded strongbox with a naira note half inside |
| 10 | `savings-pot` | Savings, rent set aside | Round white pot with a blue lid slot and one coin entering |
| 11 | `ledger-book` | Transaction history, statement | Open book with blue ruled lines and a small blue tick |

### 3.2 States that are not money

| # | Name | State | Object |
| ---: | --- | --- | --- |
| 12 | `seal-check` | Generic success. The hero mark | Scalloped blue rosette with a thick white tick, floating slightly off its plinth |
| 13 | `seal-pending` | Under review, awaiting a decision | Same rosette in soft white with a blue hourglass in the centre |
| 14 | `seal-cross` | Rejected, declined, failed | Same rosette with a blue cross |
| 15 | `hourglass-blue` | Processing, please wait | Rounded hourglass, white frame, blue sand mid-fall |
| 16 | `progress-ring` | Step 2 of 4, partial completion | Thick white ring two thirds filled in blue |
| 17 | `alert-triangle` | Attention, action required | Rounded triangle, white body, blue exclamation |
| 18 | `info-round` | Explanation, disclosure, tooltip | Rounded disc, white, blue lowercase i |
| 19 | `clock-expired` | Offer expired, hold released, session timed out | Clock with a soft blue slash across it |

### 3.3 Identity and documents

| # | Name | State | Object |
| ---: | --- | --- | --- |
| 20 | `id-card-check` | NIN or ID verified | Rounded ID card, blue photo block, blue tick corner |
| 21 | `doc-review` | Document under review | Document with a blue magnifier resting over it |
| 22 | `doc-cross` | Document rejected, resubmit | Document with a blue cross seal |

### 3.4 Property flow

| # | Name | State | Object |
| ---: | --- | --- | --- |
| 23 | `keys-handover` | Tenancy started, keys released | Two white hands, one passing a blue key |
| 24 | `contract-sign` | Agreement signed, tenancy agreement | Document with a blue pen resting on a signature line |

---

## 4. The prompt to generate them

One master style block, then one subject line per mark. **Keep the style block
identical every time**, or the set will not match.

### Style block, use verbatim

> A single 3D icon rendered in a soft matte clay style. The object sits on a
> small white rounded-square plinth with softly rounded corners. Pure white
> seamless background. The object itself is soft matte white with smooth
> rounded edges and no sharp corners, and ONLY the element that carries the
> meaning is rendered in a rich electric royal blue, roughly #0010E0. Soft
> studio lighting from above and slightly left, gentle contact shadow beneath
> the plinth, subtle ambient occlusion, a faint soft highlight on the top
> surfaces. Three-quarter view from slightly above eye level. Clean, calm,
> friendly, premium, tactile. No text, no letters, no numbers, no gradients
> in the background, no reflections on the floor, no extra props. Square
> image, centred, generous white margin around the object.

### Then the subject line

> The object is: [subject from the table above].

### Worked example

> A single 3D icon rendered in a soft matte clay style. [full style block]
>
> The object is: a curled paper receipt with softly rounded edges, standing
> upright on the plinth, with a small scalloped blue seal bearing a white tick
> pressed onto its lower half.

---

## 5. Rules when the files come back

- **Square, transparent or pure white, and at least 1024px.** The existing set is
  square with a white ground
- **Filenames are lowercase with hyphens**, matching the names in section 3, and
  they go in `apps/web/public/brand/icons/`
- They are used through **`BrandIcon`** with props `name`, `size`, `fill`,
  `label`, `priority`, `className`. There is no `ramp` prop. See
  `docs/ICON_SYSTEM.md`
- **Never mix these with `UiIcon`.** `UiIcon` is the 40 stroked navigation
  glyphs. These are content objects. The two tiers do not mix in one row
- **Check the render against the set before accepting it.** Open it next to
  `wallet-secure.png` and `user-verified.png`. If the plinth, the lighting angle
  or the blue is different, regenerate rather than ship an object that looks like
  a visitor
- **No orange, amber, gold or purple**, ever, in any of them

---

## 6. Where these get used

`docs/HANDOFF_02_PLATFORM.md` section 24 defines the confirmation sheet these sit
inside: the mark in a glass container, the verdict in two words, the fact, the
line saying what happens next, and at most two actions.

Build the shared component once and let it take the mark by name. **Do not build
a bespoke success screen per flow**, which is what the product does today.

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

Even the good ones. This is where the marks in section 3 earn their place.

1. **A mark.** Every pending state in this product is a spinner. A spinner is
   the absence of a design. `payment-pending`, `seal-pending` and
   `hourglass-blue` in section 3 exist for exactly this and none is used yet.
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

Check section 2 before commissioning anything. `user-verified.png` is already
the blue scalloped rosette with a white tick, which is precisely the mark the
founder's reference screenshot rendered in orange. **It does not need
replacing.** The reference's anatomy is worth taking; its execution is
everything this brand is not.
