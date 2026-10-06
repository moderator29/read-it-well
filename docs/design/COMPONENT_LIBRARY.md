# The component library: adoption and porting

**Written by Session 1, 6 October 2026.** The founder supplied a component library
and asked that it be used widely, in Vallo's own style. This document says what to
take, where to use it, and what must change before any of it ships.

---

## 0. The honest state of these components

They are **excellent references and good engineering**: real accessibility, real
reduced-motion handling, controlled and uncontrolled modes, proper ARIA. They are also
**written for a different design system**, and dropping them in as they are would fail
this repository's own checks on the first commit.

**The code itself is in `docs/design/component-library-source/`**, one file per
component, as the founder supplied it, with a README listing what is wrong with each.
It is reference material: it is outside every gate in this repository and none of it
compiles. Read it rather than building from this document's prose.

**Verified on 6 October:**

| Dependency they need | In this repo? |
|---|---|
| Tailwind 4 | **Yes** |
| `framer-motion` | **Not yet, and it is being added.** D34 authorised it and D39 settles it: Session 3 installs it once, through `LazyMotion` with `domAnimation`, in a commit of its own |
| `lucide-react` | **No** |
| `cn()` / `clsx` / `tailwind-merge` | **No** |
| shadcn registry | **No** |

### What must change before any of them ships

1. **Every colour is hardcoded and the lint will fail.** `#0E0E0E`, `#1F1F1F`,
   `#82ff22`, `#FAFAFA`, plus Tailwind palette classes like `emerald-400`,
   `rose-500`, `sky-400`. `scripts/check-css-tokens.mjs` runs in `npm run lint` and
   **fails the build on a raw colour**. Every one becomes a `--nf-*` token.
2. **They use `lucide-react`. Vallo has its own icon tier.** Do not add lucide. Swap
   every glyph for `UiIcon`. An imported icon family is a second visual language and
   D28 forbids making the product feel like a different platform.
3. **They contain fabricated data.** "EasyUI Store", `tx_9842a8d11c7f`, a drawn
   barcode, "AUTH #99824". The claims lint exists because this repository once shipped
   23 invented places. **Strip every invented value**, and a barcode is only ever drawn
   from a real reference.
4. **Infinite spinners.** `animate={{ rotate: 360 }} repeat: Infinity` appears in the
   payment components. **Vallo bans spinners**: shaped skeletons, or the real
   three-step processing sequence.
5. **The lime `#82ff22` accent is not a Vallo colour.** The palette is one blue family
   plus emerald for success, rose for error, cyan for attention, and one warm spark.
6. **`DragToConfirm` auto-resets after confirming.** For a payment that is wrong: a
   confirmed transfer must not quietly return to an unconfirmed-looking control.
   `autoResetDelay` is disabled on anything that moves money.
7. **Radii and spacing are theirs, not ours.** `rounded-xl`, `rounded-md`,
   `rounded-full` become the Vallo scale: 14 for controls, 18 for cards, 26 to 32 for
   islands, 999 only for chips, segments and circles per D2.

### The dependency decision

**Add `framer-motion`, but only through `LazyMotion` with the `domAnimation` feature
bundle.** That is roughly 18KB rather than the ~50KB of the full import, and it is
justified by three things CSS genuinely cannot do well:

- **`layoutId` shared-element transitions.** The sliding pagination indicator, the
  Dynamic Island morph and the search-pill-to-header transition are all this. Hand
  rolling it is where CSS stops being the cheaper option.
- **Drag with spring-on-release.** `DragToConfirm` and sheet grabbers.
- **Interruptible springs.** A gesture reversed mid-flight settles correctly.

**Everything else stays CSS.** Entrances, exits, press, stagger, fades and the whole
motion inventory in `MOTION_SYSTEM.md` section 2 are CSS and stay CSS. **If a
component can be built without framer-motion, it is.**

**That sentence is about the component, never about the dependency, and D39 exists
because it was read the other way.** framer-motion is installed either way: four of
the nine pieces need primitives with no CSS equivalent worth writing, so declining
the dependency means declining the library. The rule is a split, not a veto. CSS for
a transition on a known track with a known end, which is most of them.
framer-motion for gesture-driven, interruptible, spring or layout-shared motion,
which is the drag, the island morph, the sliding indicator and a shared element
crossing routes. Hand-rolling a spring for the drag is as wrong as pulling in
framer-motion to fade a toast.

**Do not add `lucide-react`, `clsx` or `tailwind-merge`.** Vallo has `UiIcon`, and a
two-line local `cn` helper replaces the rest.

**This does not reopen the GSAP decision.** GSAP stays out of the bundle and is
dynamically imported for the two orchestrated timelines only.

---

## 1. The components, where each goes

### Glass navigation

**The founder's note: this is not the main side navigation. It is for inner areas,
inner features and inner pages**, and the pull on the hamburger is what he likes.

The main dock and side navigation are settled by D28 and do not change. This is a
**second-level navigation** for places with their own internal structure:

| Use it in |
|---|
| Admin desks, where each desk has its own sections |
| The host and agent workspaces, inside calendar, decide, rooms, earnings |
| Settings, inside each of the sixteen screens |
| The wallet, across transactions, methods, statements, limits |
| Escrow, across conditions, milestones, evidence, dispute |
| Space detail, across overview, costs, amenities, trust, location |
| Analytics, across each metric |
| Support, across tickets and the help centre |

**In Vallo's material:** navy glass at night, white with a blue-tinted shadow on paper,
the edge light on its leading border, `UiIcon` glyphs, Vallo radii. **The pull is the
part worth keeping** and it must feel physical: it follows the finger and settles on
`drift`.

### DragToConfirm

**The best fit in the whole library**, because Vallo has several genuinely irreversible
actions and a slide is the right ceremony for them.

| Use it for | Not for |
|---|---|
| **Releasing escrow**, the most consequential action in the product | Anything reversible |
| Confirming a withdrawal | Ordinary form submits |
| Sending a wallet transfer | Navigation |
| Deleting an account | Saving a draft |
| An admin ruling on a dispute | Anything a tap should do |

**Changes:** Vallo tokens throughout, `UiIcon`, **`autoResetDelay` off for money**, the
confirmed state persists, one haptic on completion and one on release, the track fill
using brand rather than `#141414`, and the keyboard fallback kept because it is already
correct.

### Unfold accordion

Where disclosure genuinely helps: the itemised cost breakdown, agreement clauses, help
centre answers, a listing's amenity groups, admin case history, a receipt's line items.

**Not** for hiding anything a person needs to decide: price, fees, trust facts and
money state are never behind a disclosure.

### Slide pagination

Admin tables, transaction history, search results on desktop, audit logs. **The sliding
indicator is the keeper**, and it is exactly the `layoutId` case framer-motion earns
its weight for. **Not on phone**, where infinite scroll with a shaped skeleton is
right.

### Dynamic Island

A genuinely strong pattern for Vallo, used for **live state that outlives a screen**:

| State | Shows |
|---|---|
| A payment processing | The three steps ticking, live |
| Escrow awaiting a condition | What is still needed |
| An upload running | Progress, with a cancel |
| An assistant answer streaming | The thinking state |
| A booking expiring | The clock |

**It is not a profile card for Vallo**, which is the reference's use. It is a status
surface that persists while a person navigates. Dark glass at night, white island on
paper, Vallo radii, and **it never covers the dock**.

### Payment status, and the receipt printer

**The founder wants the receipt printer "totally cool, in our way, different but same
vibes."**

The printer metaphor is right for Vallo because **a receipt a Nigerian guest can
screenshot as proof is a real product requirement**, not decoration. Take the
extrusion, the serrated edge, the perforation notches and the monospace ledger
feeling. **Leave the chassis.** A simulated POS-8000 with LEDs and a feed slot is a toy
on a property platform.

**The Vallo version:** the receipt unrolls downward on `glide` while the amount
odometer settles, on the Paper document treatment per D28.1, with real dual
confirmation rows, a real reference, the itemised breakdown, and Download, Share and
Dispute. **No drawn barcode unless it encodes a real reference. No invented
transaction ids. No fake auth numbers.** The verification door at `/r` already proves a
receipt, so the printed artefact and the verifier must agree.

Payment status feeds Stage 4's processing screen: keep the status taxonomy, **replace
the infinite spinner with the real three-step sequence** that ticks as each step
actually completes.

### Particle delete

**Use sparingly and never on money.** It is memorable and it suits removing a saved
item, a draft listing, an uploaded photo or a dismissed notification. **Never for
deleting an account, a payout method, a transaction record or anything in the ledger**,
where a slide-to-confirm and a plain, serious confirmation are correct. A playful
dissolve on a consequential deletion is the wrong emotional register.

### Book-a-call button

The expanding-capsule mechanic is lovely. **In Vallo's colours, not lime.** It is a
marketing-surface control: the landing page, the for-agents, for-hosts and
for-landlords doors, and the concierge or support call-to-action. **Not inside the
product**, where the button system in north star 5A governs.

### Batch gesture tray and AI response

**Batch gesture tray** for multi-select in admin queues, saved items, photo management
and the bulk actions the host workspace already has.

**AI response** for the assistant and the support summariser, where a streamed answer
needs a shape. It must obey the existing honesty rules: the assistant never invents a
listing, a price or a fact.

---

## 2. The porting checklist

Every component passes all of this before it is merged:

1. Every colour is a `--nf-*` token. `npm run lint` passes.
2. Every icon is `UiIcon`. No lucide import.
3. Radii follow the Vallo scale. 999 only for chips, segments and circles.
4. Motion uses the tokens in `MOTION_SYSTEM.md`. Durations and eases match the
   inventory.
5. Reduced motion collapses it. Data saver drops blur.
6. No invented data, anywhere, including in a default prop.
7. No spinner. Shaped skeleton or a real step sequence.
8. Works in both themes at 390, 768 and 1440.
9. Four locales do not overflow it, including the longest Hausa strings.
10. Keyboard reachable, focus visible, labelled.
11. Lives in `components/ui/` with a single owner, used everywhere, forked nowhere.
12. framer-motion only through `LazyMotion`, and only where CSS genuinely cannot.

**One component, one definition.** The failure mode for an adopted library is four
slightly different accordions. Session 3's agent B1 owns `components/ui/` and nobody
else edits it.
