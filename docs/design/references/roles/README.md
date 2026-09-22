# The role and supply reference set, 22 September 2026

**Twelve governing images. They are the target for HANDOFF 09 Tracks G, N, O
and P, and the founder's standing bar applies to every one of them: almost
identical if not identical.**

`docs/DESIGN_DIRECTION.md` governs HOW to match them. This file says what each
one is and what must be translated rather than copied.

---

## What each image governs

| File | Screens | What it governs |
| --- | --- | --- |
| `GOVERNING-01-switch-home-sheet-drawer.png` | 3 | The property home page, the dock with the raised centre switch, the Switch profile sheet, and the side drawer carrying the same switch |
| `GOVERNING-02-add-workspace-chooser.png` | 3 | Add a workspace: the three supplier doors, the selected state, and the "what we will ask you for" overview |
| `GOVERNING-03-register-owner.png` | 4 | Owner registration: about you, where do you own, proof of ownership with "I have none of these", and the set-up confirmation |
| `GOVERNING-04-register-agent.png` | 4 | Agent registration: about you, prove who you are, your fees in the open with the live tenant total, and submitted |
| `GOVERNING-05-register-firm.png` | 4 | Firm registration: your firm with RC and LASRERA, prove you work here, your team, and under review |
| `GOVERNING-06-list-property-1-the-property.png` | 4 | Listing wizard: what are you listing, where is it with the map pin, the rooms, condition and availability |
| `GOVERNING-07-list-property-2-light-water-media.png` | 4 | Listing wizard: light, water, amenities, and photos with the video walkthrough uploading |
| `GOVERNING-08-list-property-3-money-and-id.png` | 4 | Listing wizard: the price, what a tenant actually pays, check it over, and **the listing ID screen** |
| `GOVERNING-09-stays-home-switch-and-doors.png` | 4 | The Stays home page, the Stays switch sheet, the three stays doors, and the first hotel page |
| `GOVERNING-10-set-up-hotel.png` | 4 | Hotel setup: details, room types, rates with cancellation, facilities and photos |
| `GOVERNING-11-set-up-shortlet-and-restaurant.png` | 4 | Shortlet: your place and house rules. Restaurant: your restaurant and tables and hours |
| `GOVERNING-12-review-desk-notification-search-by-id.png` | 4 | The admin review queue, the listing under review with its actions, the lister's notification centre, and **search by listing ID** |

---

## What is translated rather than copied

`DESIGN_DIRECTION.md` Rule 4 is absolute and these renders break it in several
places. **The composition, the palette, the glow, the glass, the icon style and
the layout are the target. The shapes below are translated.**

1. **Every capsule becomes a rounded rectangle on `--nf-radius-control`.** In
   these images that means: the "Verified", "Pending review", "Under review",
   "Optional" and "Usually two working days" labels; the status pills in the
   review queue; the cuisine chips; the price band selector; the theme control;
   and the numeric count badges in the drawer. The test is the ratio of radius
   to short side, and anything at or above 0.5 is a capsule however it is
   spelled.
2. **The round avatars stay round.** That is the one standing exception, along
   with a bare icon button drawn round in a governing image.
3. **The dock reads "Saved" in these renders and it ships as "Feed"**, on the
   founder's correction of 22 September.
4. **The stays renders read "Explore" where the property renders read
   "Search".** One word ships on both sides. See HANDOFF 09 Track P.
5. **"Short Let" appears in image 01's category row and does not ship there.**
   The property row is Buy, Rent, Manage, Invest. Shortlets live on the Stays
   side.
6. **The Apple Maps mark in image 03 is not copied.** Our tiles come from our
   own provider and carry our own attribution.
7. **Any count, price or statistic in these renders is example content.** The
   product prints what the database returns, and prints nothing when the
   database returns nothing.

---

## THE RULE THAT OUTRANKS EVERY OTHER RULE IN THIS FILE

**The images govern FORM. They never govern CLAIMS.**

These renders are generated. A generator will happily draw a regulatory badge,
a licence, a guarantee, a partner logo, a certification, a statistic or a
product tile that has no counterpart in reality, because it is completing a
picture rather than stating a fact.

**So: anything in a render that asserts something about the world is not a
design element. It is a statement, and statements come from us.** Insurance,
licensing, certification, guarantees, partnerships, counts, percentages,
awards, ratings, and features we do not sell. **None of it ships because a
render drew it.** It ships only when somebody can point at the evidence.

This was found live on 22 September, in a render of the send money screen that
drew an **"NDIC INSURED" badge**. The Nigeria Deposit Insurance Corporation
insures deposits at licensed institutions. **VALLO SPACES LTD is not a bank,
holds no such cover, and drawing that badge would be a false statement to a
user about whether their money is protected**, of exactly the kind a regulator
reads literally. The same render carried **Buy Airtime, Pay Bills and Swap**
tiles for products this platform does not sell, and Swap reads as crypto,
which this build took dark on purpose.

**When you meet one of these in a render, do not draw it, and write it into
the ledger as refused with the reason.** If you think it should exist, it is a
product decision for the founder, never a pixel decision for a worker.

---

## What is NOT in these images, and inherits from them

Every surface these twelve do not draw still has to read as the same product.
The register is: the deep navy ground, the glass panel with its lit top rim,
the one blue family, the 3D glass objects on their rounded plates, the rounded
rectangle controls, the progress row of small filled rectangles, and the calm
explanatory panel with a small round glyph that appears on almost every screen
in this set. Carry that register into every area the set does not cover, and
record in the ledger which surfaces were extended this way.
