# Founder decisions of 13 October 2026

Confirmed by the founder on 13 October 2026. This file lists each decision,
says what the code does about it on the branch it was written against
(`claude/rentme-v2-platform-audit-xuvg0a`; statuses re-read on 13 October 2026 after the round 2 merges at `e054552a3`, and rows 2, 6, 14, 15 and 20 to 23 by the docs track the same day against the live database),
and says where the public documentation states it. When a decision's code
lands, change its status here in the same commit.

Status words: **BUILT** (read in the code), **PARTLY** (some of it), **NOT
BUILT** (decided, no code on this branch). Public docs and help (`/docs`,
`/help`) state only what is BUILT. Everything else is under "To document when
merged" at the end.

## The decisions

| # | Decision | Status | Where |
|---|---|---|---|
| 1 | Vallo is free to use. Listing is free. Vallo charges only on a completed deal. A Pro plan is optional and never required. No monthly subscription is required of anyone | PARTLY. Free listing and the optional plan (`lib/subscriptions`, flag `subscriptions_checkout`) exist. The fee itself is a separate matter, see "Open conflicts" | `/docs/what-vallo-costs`, help "Is Vallo free to use?" |
| 2 | Vallo does not hold customer money. Payments and escrow sit with licensed payment partners. The UI stays Vallo-native; a provider is named only where the law requires it | BUILT (ADR 0003, `lib/money/copy.ts`). The public docs and help name no provider (docs track, 13 October 2026): `/docs/money-and-the-guarantee`, which named the processor, was retired and redirects to `/docs/paying-on-vallo` | `/docs/paying-on-vallo`, `/docs/what-vallo-costs`, ADR 0003 |
| 3 | Money for a deal moves only after inspection and the renter's decision. Viewings never take money | BUILT (`PAYMENT_GATE_SENTENCE`, `NO_INSPECTION_FEE`) | `/docs/viewings` |
| 4 | Every cost is shown before booking; the guest sees the full total, including every charge at the door, before confirming | BUILT. A host's charges at the door (caution deposit, power, cleaning, extra guest, visitor) are listed before booking and the Host Agreement says so | `/docs/what-vallo-costs`, `/docs/hosting`, help "Will I see every cost before I book?". Not re-verified by the docs track: that the all-in total is drawn on checkout with every door charge |
| 5 | Hosts must not charge anything not listed on Vallo, and must not add a charge without a stated reason. Hosts agree to the Terms, the Privacy Policy and the Host Agreement before creating a host account or publishing | BUILT. Terms section 6, the Host Agreement page (`/host-agreement`, `lib/legal/host-agreement.tsx`), and the agreement tick on the wizard business step (`HOST_AGREEMENT_VERSION`) | Terms, `/host-agreement`, `/docs/hosting`. For the solicitor: the Host Agreement text was written by engineering |
| 6 | Viewings: free slot is booked at once; or request a time and the lister confirms, offers another time, or declines | BUILT (`lib/viewings`, `lib/inspections`). Schedule a visit at `/listing/[id]/visit`, in person or by video (merged 13 October, `45bf26e7`) | `/docs/viewings#two-ways` |
| 7 | Reminders to both sides the evening before (19:00 Lagos) and 2 hours before | BUILT for both sides. `private.send_viewing_reminders` writes `viewing_reminders` per audience (renter and lister), stages eve and soon | `/docs/viewings` |
| 8 | Either side marks a viewing complete (inspected, deal done, no deal) or reports a no-show; the other side can dispute within 48 hours; admin sees disputes | BUILT. `lib/inspections/no-show-actions.ts`: either party reports from the agreed time to 14 days after; the person reported disputes within 48 hours; staff resolve (upheld or overturned) with an audit row. Admin view exists | `/docs/viewings`, help "What if the renter or the lister does not turn up" |
| 9 | Listing media: photos and videos in one uploader, minimum 3 items, 5 recommended, cover must be a photo, up to 3 videos each up to 100 MB and 60 seconds (MP4, MOV, WebM) | BUILT. `MIN_MEDIA` 3, `RECOMMENDED_MEDIA` 5, cover must be a photo, `MAX_VIDEOS` 3, `MAX_VIDEO_SECONDS` 60, `MAX_UPLOAD_LABEL` 100MB; the video bucket limit was raised on the live database | `/docs/quick-start`, help "How many photos and videos does a listing need?" |
| 10 | Sale prices up to 50 billion naira | BUILT (`MAX_SALE_PRICE_KOBO`, 50 billion naira in kobo) | internal only |
| 11 | Listings are reviewed by Vallo before publishing (approve, ask for more, reject with a reason); a refused or sent-back lister can edit and resubmit | BUILT (`app/admin/listings/[id]/ReviewActionBar.tsx`; the wizard reopens with the reviewer's sentence) | `/docs/quick-start`, help "Is a listing reviewed before it is published?" |
| 12 | Hotels, shortlets and restaurants set up through the host wizard with ID and business papers, reviewed by Vallo; refused hosts edit the same application and resend | BUILT. A sent-back or rejected host application reopens with the reviewer note and "Send it again" resubmits the same application. The wizard asks before leaving unsaved changes (`wizard-memory.tsx`) | `/docs/hosting` |
| 13 | Cancellation presets Flexible, Moderate, Firm, Strict for stays | BUILT. Flexible, Moderate, Firm and Strict (`lib/host/cancellation-presets.ts`, migration `20261013090000`) | `/docs/hosting`, help "What cancellation policies can a host choose?" |
| 14 | Restaurants: free table booking; restaurant confirms; diner pays the bill at the restaurant or through Vallo; Vallo bills the restaurant a fixed fee per seated table; restaurants confirm seated or no-show; only seated diners can review | BUILT except paying the bill through Vallo. Check-in code, restaurant marks seated or no-show, diner asked "Did you dine" a day later if the restaurant never answers, disputes to Vallo, seated-only reviews (`reservation_reviews`), a flat fee per seated table billed monthly (`lib/reservations/seating.ts`, admin `restaurant-fees`). Paying a bill through Vallo: the commission is set to 2 percent (200 basis points, 13 October 2026) but it still needs the Paystack keys and each restaurant's payout subaccount before it can run: the public docs say it is not switched on yet | `/docs/restaurants`, `/docs/what-vallo-costs#restaurants`, help "What does Vallo charge a restaurant?". The fee (1,000 naira per seated table, `restaurant_money_settings.seated_fee_minor` = 100000 live, `SEATED_FEE_MINOR_DEFAULT` in code) is stated publicly at the lead's instruction of 13 October |
| 15 | An owner (landlord) account cannot also be an agent account; the roles are separate accounts. Landlords can upload an ownership document and get a small ownership badge once Vallo has seen it | BUILT. One side per account is enforced (`private.one_side_per_account`, applied). The ownership document upload and the "Ownership seen" mark are built (`OwnerRegisterForm`, `OwnershipSeenMark`); the two constraints were widened and applied (`20261013070812_owner_proof_constraints_widened`), and the mark reaches search cards (`20261013090700_listings_ownership_seen_at_batch`) | `/docs/for-owners#ownership-document`, `/docs/badges-and-verification#ownership-seen`, help "What does the Ownership seen mark mean" |
| 16 | Messaging: reply, forward, delete for me, delete for everyone within 2 days 12 hours, call (voice and video) from the thread, Requests for people you do not follow | BUILT (migrations `20261011142243` to `20261011142309`, `private.delete_for_everyone_window()`, `components/calls`) | `/docs/messages-and-notifications`, help "Messages" |
| 17 | Verification ladder and badges, what they do and do not mean | BUILT (`docs/BADGES.md`, `lib/trust/verification.ts`) | `/docs/badges-and-verification` |
| 18 | Safety: never pay outside Vallo, never share account numbers in chat (flagged) | BUILT | `/docs/trust-and-safety`, `/safety` |
| 19 | The company is VALLO SPACES LTD (RC 9870413); the product is Vallo. RentMe and NaijaFinds never appear in anything new | BUILT (`lib/legal/company.ts`) | Terms, Privacy |
| 20 | Every payment for a deal happens inside Vallo. Never pay outside Vallo; a payment made outside Vallo is not covered | BUILT as a rule (`OFF_PLATFORM_SENTENCE`, account numbers flagged in chat); recording rent paid outside Vallo (LANDLORD-01) was dropped | `/docs/paying-on-vallo#pay-inside`, `/docs/trust-and-safety` |
| 21 | For rent and shortlets the payer picks Escrow (selected by default, held by a licensed partner until the deal is confirmed) or Pay by card. A sale is always escrow | BUILT on `track/escrow-live`, not yet released. The choice card (`PayChoiceCard`), `payment_rail_choose` (pending `pov01` to `pov04`), the escrow step with a switch to card while nothing is paid, and the partner calls (create, pay, confirm, withdraw, dispute, resolve). Escrow shows only when `protectedRailLive()` reads it as working on the server; the docs carry one sentence for when it is paused (`ESCROW_PAUSED`). Release: `docs/payments/RELEASE_RUNBOOK.md` | `/docs/paying-on-vallo` |
| 22 | A hotel room is paid by card when booked, at the shown price. Vallo's commission on a hotel room is 10 percent, from the hotel's share, never added to the guest's price | PARTLY. Instant card payment for rooms is live (`room_bookings`, `stays_instant_pay` on). The 10 percent rate goes live with the payments track; the docs state it from one constant (`HOTEL_COMMISSION_PERCENT` in `app/(site)/docs/facts.ts`) | `/docs/what-vallo-costs#hotels`, `/docs/hosting#getting-paid` |
| 23 | Every workspace application and setup accepts the Terms and Privacy Policy and the rule that every payment happens inside Vallo | NOT BUILT (PAY-02); hosts already tick the Terms, Privacy Policy and Host Agreement | `/docs/getting-started#workspaces`, stated as the rule |

## How it works, for the next engineer

### Viewings (`lib/viewings`, `lib/inspections`, `components/app/inspections`)

- A lister publishes viewing windows (`v94_viewing_windows`). The listing page
  offers free slots; `book_viewing_slot` accepts only a slot the database would
  offer at that instant and writes a CONFIRMED `inspection_requests` row.
- Otherwise the renter calls `requestInspection` (REQUESTED). The lister calls
  `answerInspection` to confirm, decline or offer another time (PROPOSED); the
  renter takes it with `acceptProposedTime`.
- States: REQUESTED, PROPOSED, CONFIRMED, DECLINED, WITHDRAWN, COMPLETED.
  `closeInspection` sets WITHDRAWN or COMPLETED; COMPLETED may carry an
  `outcome` of `inspected`, `deal_done` or `no_deal`, recorded once.
- A BEFORE trigger (`20261013053148`) makes each column writable only by the
  party it belongs to.
- Reminders: the cron job `vallo_send_member_reminders` runs
  `private.send_member_reminders`, which calls `private.send_viewing_reminders`
  and then `private.send_rent_due_reminders`.
  The viewing function sends the `eve` stage from 19:00 Lagos the evening before and the `soon`
  stage two hours before, and the ledger `viewing_reminders` makes each send
  once per audience (renter and lister). `member_reminders` is the ledger of
  `send_rent_due_reminders` (rent due), not of viewings (read live, 13 October
  2026).
- No-show: `reportNoShow`, `disputeNoShow`, `resolveNoShow` in
  `lib/inspections/no-show-actions.ts`; each is a SECURITY DEFINER function that
  decides who, when and once from `auth.uid()`.

### Listing media and review

- One uploader for photos and videos. Limits are in
  `lib/agent/listings-model.ts` (`MIN_MEDIA`, `RECOMMENDED_MEDIA`, `MAX_VIDEOS`,
  `MAX_VIDEO_SECONDS`, `MAX_UPLOAD_BYTES`); the database counts videos under a
  lock and holds up to 1800 seconds, so the 60 second rule lives in the app.
- Review: admin `ListingReview` offers Approve (then Publish), Ask for more and
  Reject (a reason is required for both). A sent-back listing reopens in the
  wizard with the reviewer's sentence.

### Host setup (`components/host/HostWizard.tsx`, `lib/host`)

- One wizard for hotel, shortlet and restaurant. The business step ticks the
  Terms, the Privacy Policy and the Host Agreement (`HOST_AGREEMENT_VERSION`).
  A business is reviewed in the admin console. A refused host edits the same
  application and sends it again. Unsaved changes are guarded by
  `wizard-memory.tsx`.

### Restaurants

- A guest requests a table (free), the venue confirms. The booking has a check-in
  code; seating is decided by code, the restaurant, the diner's answer, a bill
  or admin (`lib/reservations/seating.ts`). Vallo bills the restaurant a flat
  fee per seated table at month end (default 1,000 naira in code; the database
  row wins). Paying the bill through Vallo is off until the commission is set.
  Card deposits (D75) are a separate, flagged-off feature.

### No-show disputes

- Viewings: see Viewings above. Stays: `esc04` keeps a no-show's nights; an
  escrow dispute uses `disputed_at` and a 48 hour alert
  (`esc05_esc09_esc15`). These are separate from the viewing dispute.

## To document when merged

- Paying a restaurant bill through Vallo (off until the commission is set).
- The escrow or card choice at checkout (PAY-01): add the screen to
  `/docs/paying-on-vallo` when `track/escrow-live` merges (`ESCROW_NOT_OPEN_YET`
  is already replaced by the paused sentence `ESCROW_PAUSED`).
- Workspace Terms and Privacy acceptance (PAY-02): name the screen in
  `/docs/getting-started#workspaces` when it merges.
- The hotel commission: point `HOTEL_COMMISSION_PERCENT` at the money policy
  row when the payments track lands it.
- A check that the all-in total on checkout shows every charge at the door.
- The fee: wording and percentage, once the Terms are settled.

## Open conflicts

1. The Terms (section 6) still say "Our commission is zero today" and take 1 to 2
   percent for the Guarantee reserve; the public docs say Vallo charges only on
   a completed deal. Solicitor.
2. Restaurant deposits (D75, off) versus free table booking.
