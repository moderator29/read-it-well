# The 25 September tracks: the closing ledger

This ledger covers the founder directive of 25 September 2026, Tracks A to L. It was worked by two agents: this session (A, B, C, K and the leftovers of F) and one subagent (D, E, F UI, G, H, I, J, L). Everything is on branch `claude/vallo-platform-rebuild-t4jh4b`.

Each track has one entry in the same shape:

- **Shipped:** what was built or changed.
- **Survived the re-audit:** what was tried against it and held.
- **Corrected:** what the re-audit found and fixed.
- **Still open:** what is not done, with the reason.

"Live" means applied to the Supabase project `uccixoonmbhrnyczyigt` and confirmed there. Credentials were used only as shell environment variables and never written to the repository.

---

## A. Money architecture: Vallo never holds customer money

### Shipped

**Split at payment.** Every charge is split by Paystack in the same transaction:

- the lister's share goes to their own subaccount;
- 150 bps (bounded 100 to 200) goes to the Vallo Guarantee reserve subaccount;
- Vallo's commission (zero today) goes to Vallo.

The pieces:

- `lib/payments/split-attempt.ts` opens every card and saved-card attempt with the split.
- `payment_split_for_booking` computes it.
- The `transactions` check refuses a row whose parts do not add up.
- The `transactions_00_payment_gate` trigger refuses a charge row that has no split or no approved agreement.

A payout account gets its Paystack subaccount when it is added or made the default (`lib/payments/payee-subaccount.ts`).

**The agreement gate** (live: `20260925121219`):

- A rental's agreement is drawn up by `agreement_open_rent_as` only from a submitted inspection report: all eight items, and at least `min_inspection_photos` photos.
- A stay's agreement is drawn up when the host accepts.
- Both parties confirm the same version. An agent confirms only under a live mandate.
- An admin, or staff holding the `agreements` scope, approves or rejects with a reason (`admin_decide_agreement`). Nobody decides their own agreement.
- Both parties are told in the app and by email.
- Every event goes to the append-only `deal_agreement_events` and to `audit_log`.
- Screens:
  - `/agreements` and `/agreements/[id]`: terms, confirm, amend, cancel, pay, claim;
  - `/admin/agreements`: approve or reject on the row, with quick reasons;
  - the pay panels show the gate until the agreement is approved.

**The Vallo Guarantee:**

- `guarantee_reserve_entries` is an append-only ledger, fed by `settle_booking_charge`.
- Claims are filed within 72 hours of move-in or check-in, with evidence in the private `guarantee-evidence` bucket.
- `admin_decide_guarantee_claim` caps the approved amount by what was paid and by the reserve balance, under an advisory lock. It is scoped to rentals and stays, not purchases.
- The Money desk shows the reserve and the claims.

**Refunds** go back to the card through Paystack `/refund` (`lib/payments/refund.ts`). `booking_refunds.processor_status` records where each one stands.

**Crypto** is naira-only through Yellow Card:

- It stays closed unless `YELLOWCARD_DIRECT_SETTLEMENT=confirmed`.
- A completed collection settles one booking.
- One that cannot be applied raises a critical `return_needed` alert.
- There is never a Vallo crypto address or balance.

**Custody is unreachable on live:**

| Migration | What it did |
|---|---|
| `20260925114741` | Custody flags off. |
| `20260925130806` | Rent-to-wallet trigger disabled. |
| `20260925130904` | Execute on 28 custody functions revoked from anon, authenticated and service_role; custody tables revoked from app roles. |
| `20260925140456` | The refund notification names the card, not a wallet. |
| `20260925140518` | The inspection-confirmation trigger no longer feeds escrow. |
| `20260925141824` | No flag can turn custody back on, super admin included. |

**App code:**

- `lib/wallet`, `lib/escrow`, every wallet, escrow and held-payment screen, component, email, notification template and dev preview are deleted.
- Custody tables are out of `database.types.ts`, so no code can name them.
- `/wallet`, `/escrow` and `/admin/escrow` redirect to the agreement surfaces.
- Agreements replaces Wallet in the side nav, the tab bar, the profile tab, the PWA manifest and the support chat.
- The Paystack transfer calls are deleted.

### Survived the re-audit

- **Local money flow.** `supabase/tests/track_a/a2_money_flow.sql` walks one rental on a Postgres copy of the live schema slice, from inspection to claim, in 27 steps. Every gate refused what it should and allowed what it should. The steps include:
  - paying before approval;
  - an agent without a mandate;
  - approving one's own agreement;
  - a claim over the cap;
  - a claim outside the window.
- **Live, as the QA member and QA admin:**
  - calling a retired wallet function is refused: no app role, including service_role, has execute;
  - turning the `wallet` flag on as the QA admin answers `403 custody_retired`.
- **Tests:** 5,549 unit tests, typecheck, lint, the CSS gate, the claims gate, the regulated-words gate and a production build are all green.

### Corrected

- A refund whose Paystack answer was unknown (timeout, 5xx or unreadable) was recorded as `failed`, which invited a second refund. It now stays pending and raises a critical `refund.outcome_unknown` alert.
- Three live triggers were still doing custody work because the A.1 migration never landed. Each was fixed with a narrow, reversible migration:
  - the rent-to-wallet credit, which would also have blocked a card refund;
  - the escrow feed on inspection confirmations;
  - the refund notification's "back in your Vallo wallet" text.
- The flag guard still let a super admin turn `wallet` on. It no longer does.
- The Yellow Card webhook test still mocked the retired wallet credit. It now proves settlement, the repeat delivery and the return-needed alert.

### Still open (for the founder)

1. **`supabase/migrations/pending/20260925120000_track_a1_vallo_never_holds_customer_money_custody_retired.sql` is not live.** The live apply was refused by this environment's permission classifier. It was not retried and was not worked around. What it would do:
   - move the custody tables into a `retired_custody` schema with no grants;
   - drop about 80 functions and the 4 escrow cron jobs;
   - add an event trigger that refuses any new custody-named object.

   Until it is applied, the six live migrations above keep custody unreachable. Apply it from the Supabase dashboard's SQL editor when ready.
2. **About 63 older backlog migrations** from the "hundred" and SCUML work are on the branch but were never applied live. Two consequences:
   - `queue_take`, `queue_release` and `queue_assign` do not exist live, so claiming and assigning in the unified queue fail. This is not new.
   - If they are ever applied, apply A.1 first: its event trigger stops the backlog recreating custody objects.
3. **Set `PAYSTACK_GUARANTEE_SUBACCOUNT`** in Vercel after creating the reserve subaccount in Paystack. Until it is set, no payment opens, by design.
4. **Payout accounts filed before today have no Paystack subaccount.** Each gets one the next time the lister adds an account or changes the default. Until then, payment against that lister does not open.
5. **The founder's own ₦1,000 test deposit** is the only live wallet balance: one completed deposit and one failed withdrawal. It is archived with the custody tables and unreachable. Refund it in the Paystack dashboard if wanted.
6. **The commission is zero** (`fee_rates`). Changing it is a Terms change (section 6 promises notice).

## B. Legal documents, the no-fee notice and Help from every lane

### Shipped

- **Terms rewritten.**
  - Section 4 describes the split at payment.
  - Section 5 says refunds go back to the card.
  - New section 13 covers agreements and approval.
  - New section 14 is the Vallo Guarantee: capped, reviewed, not insurance.
  - Section 9 states that Vallo charges no inspection fee and that private fees are not ours.
  - Section 15 excludes anything off the platform and points to the Disclaimer.
  - The old wallet section is gone.
- **Privacy updated** for split data, agreements, Guarantee claims and Yellow Card. The deletion and retention text now matches.
- **New Disclaimer** at `/disclaimer` and `/legal/disclaimer`, linked from the site footer and Settings. It says off-platform dealings are not Vallo's responsibility.
- The Terms and Privacy versions moved to `2026-09-25`, so the next acceptance writes a new row.
- **"VALLO CHARGES NO INSPECTION FEE"** is on the inspection screen itself: the closed inspection card, the expanded card and the request-inspection sheet.
- **Help and support** is a row in:
  - the member side nav, on both sides, signed in or not;
  - the agent workspace;
  - the operator console;
  - the staff console.

### Survived the re-audit

At 390px, signed out and signed in:

- `/terms`, `/disclaimer`, `/privacy`, `/help`, `/safety` and `/cancellations` render with no horizontal overflow and no custody sentence.
- The only remaining matches are negations such as "There is no Vallo wallet".

### Corrected

- The device pass found the cancellation timeline, used on `/safety`, `/cancellations` and every listing, still promising a refund "to your Vallo wallet". Fixed.
- A `Secure` cookie flag and the Guarantee's name tripped the claims gate. Each now has a named mechanism.

### Still open

- The Terms clauses the solicitor must read are listed in the header of `lib/legal/terms.tsx`: sections 2, 4, 5, 6, 13, 14, 15, 16 and 19.
- The host lane (`/host`) has no side nav, so its Help link is the global one in the app shell.

## C. Documents and everything the assistant reads

### Shipped

- **The assistant and support prompts** (`app/api/assistant`, `app/api/support`):
  - they read every money sentence from `lib/money/copy.ts`;
  - the support tool `my_wallet` is replaced by `my_agreements`.
- **The FAQ store** is rewritten: payments, charges, rent and inspection, refunds, cancellations, wallet ("there is no wallet") and a new Guarantee entry.
- **Site pages:** the help centre, safety centre, cancellations page and docs chapter 6 (now "Money, agreements and the Guarantee"; the old slug redirects).
- **Dictionaries:** dead wallet, escrow and savings-pot keys are removed from all four locales, and live copy is rewritten. For the rewritten keys, the Hausa, Igbo and Yoruba overrides are removed so the new English shows.
- **New documents:**
  - `docs/MONEY_ARCHITECTURE.md`;
  - ADR 0002, which supersedes ADR 0001.
- **Updated documents:**
  - `docs/wallet` and `docs/escrow` are archived to `docs/archive/retired-custody`;
  - `PRODUCT.md`, the docs index, `ENVIRONMENT.md`, `schema/NAMES.md`, the store privacy labels and the store listing copy are rewritten;
  - every other doc that mentions a wallet or escrow carries a Track A banner (53 files);
  - `LIGHT_MODE_REMOVED.md` is marked as history;
  - `ICON_SYSTEM.md` lists the new icons.

### Still open

- The Hausa, Igbo and Yoruba text for the rewritten keys needs a native speaker. English shows until then.

## D. The listing page: always a way out

Shipped by the subagent: the photo viewer is a history entry, with swipe-down to dismiss, a safe-area close and a sticky back. The details are in the subagent's report, quoted in the Track D to J section below.

- **Proof:** `apps/web/tests/listing-exits.spec.mjs` passes twice, in normal and in reduced motion.

## E. Light mode

Shipped by the subagent:

- five root causes answered;
- a full light palette;
- a dark tile behind night artwork;
- a Light / Dark / System control at the foot of the side nav, defaulting to Dark.

On this session's device pass, the control switched the document to `data-theme="light"` at 390px.

## F. Message a hotel or a restaurant

- **Shipped:**
  - The UI and actions came from the subagent.
  - The database change is live from this session (`20260925133109`, `20260925133143`): a `business` thread context and `conversations.business_id`, with its shape check, one-thread-per-guest index, foreign-key index and trigger rules. Only the guest can open the thread, only with a published, non-example business, and it counts against the shared 20-a-day limit.
  - The generated types carry the column, and the inbox names the venue.
- **Still open:**
  - Every live business is an example today, so no real venue shows the button yet.
  - The thread header for a business thread shows the counterpart but no venue card.

## G. Inbox tabs, the Recent / Archived / Reported view and Settings

Pending the subagent's report.

## H. Emails that render dark everywhere, and a better welcome email

Pending the subagent's report.

## I. Animation

Shipped by the subagent:

- four finite moments, using transform and opacity only;
- all off under reduced motion and data saver;
- layout shift 0.0000 on every route checked;
- no overflow on any frame.

**Still open:** the shimmer on the verified avatar ring.

## J. Icon-tile filters

Shipped by the subagent: property type as a radio group and space as checkboxes. The selected state shows three ways, and the tiles work in both themes.

- **Proof:** an axe test.
- **Still open:** bedroom tiles and the stays room-type tiles are unchanged.

## K. The tiered staff console

### Shipped

Live migrations `20260925133647` and `20260925134322`.

**Who can grant:**

- Staff access is a set of named scopes, never an `app_role`: Listing approval, KYC review, Reports and moderation, Support, Agreement approval and Guarantee claims.
- Only a super admin can grant, change or revoke it. The functions decide on the caller's own `auth.uid()`.
- No API role can write `staff_grants` or `staff_handbook_acks`.

**Unlocking and notification:**

- Nothing unlocks until the current handbook is acknowledged (`private.staff_can`).
- The member is told in the app and by email, and the email names the exact access given (`staff.access_granted`).

**Logging:** every grant, change, revocation and acknowledgement is written to `audit_log`.

**KYC:** review is a staff scope, and nobody reviews their own document.

**The app:**

- `requireAdmin(scope)` admits a scoped staff member for that scope only, and only after the handbook. Without a scope it is exactly the old door, so every other desk refuses staff by default.
- Staff get a restricted console:
  - their desks, the handbook and Help;
  - a Console entry in the member side nav;
  - a staff home page instead of the operator overview.
- `/admin/staff`, for the super admin only: give access by email with checkboxes, end access with a reason, and see each member's scopes, handbook date, action count and recent actions.
- `/admin/handbook` holds the handbook itself.

### Survived the re-audit

- **Local probe.** `supabase/tests/track_k/k_escalation.sql`, 22 steps:
  - a member granting themselves, an admin granting, and staff granting themselves or others: all refused;
  - staff before the handbook, staff outside their scope and revoked staff: no access;
  - direct table writes as `authenticated`: permission denied.
- **Live** (`supabase/tests/track_k/live_escalation.mjs`, using the QA admin, who is not a super admin, and the QA member):
  - the admin granting and revoking staff: `forbidden`;
  - the member granting themselves: `forbidden`;
  - both writing `staff_grants` directly: 403;
  - both writing `user_roles`: 403 (RLS);
  - the member calling the legacy `grant_staff_role`: permission denied;
  - the member acknowledging the handbook: `not_staff`.
- **Unit test:** `lib/admin/guard-staff.test.ts` pins the door's default-deny.

### What already existed (not new)

The audit log viewer (`/admin/audit`), search (the console bar), the saved views and bulk actions in the unified queue, alerts and escalation (`/admin/alerts`, `lib/alerts/escalate`), the operations and health view (`/admin/operations`), and the abuse surfaces (queue lanes, standing, stops).

### Still open

- The unified queue's claim and assign functions do not exist live (see A, open item 2), so staff moderation can decide items but cannot claim them.
- No CSV export was added.

## L. Price Check in the nav

Pending the subagent's report.

---

## Real-device pass (this session)

- **Setup:** a production build (`next build` then `next start`), Chromium at 390×844, touch, DPR 2. Signed out, then signed in as the QA member.
- **Routes:** `/terms`, `/disclaimer`, `/privacy`, `/help`, `/safety`, `/cancellations`, `/docs/money-and-the-guarantee`, `/docs/your-wallet` (redirects), `/wallet` (redirects to sign-in, then to `/agreements`), `/agreements`, `/settings/help`, `/legal/disclaimer`, the inspections list, `/admin` as a member (access screen) and `/home`.
- **Results:** zero horizontal overflow on every route. The drawer shows Agreements and Help and support, with no Wallet row. The theme control switches to light.
- **Limits:** preview deployments on `*.vercel.app` are blocked by this container's network policy, so the pass ran locally against the live database with the public key only. The admin desks, which need the service key, and Paystack could not be exercised end to end here.
