# Everything new we are building

**From Session 1, 5 October 2026.** The complete list of what does not exist in
the codebase today and is being built. 46 items.

Existing work is not listed here: 200 pages, 579 migrations, the admin console, the
agreement gate, the Paystack split, the social layer, the compliance controls and
the rest are KEEP, and `SESSION-1-RESPONSE.md` section 5 is the inventory.

**Owner key:** S2 backend, money and trust. S3 experience. S4 QA, release and
docs. F founder.

---

## A. Money: the two-rail model

The founder's decision, 5 October: **escrow for rent, shortlet, apartment, land
and sale; direct Paystack split for hotels and restaurants.** Architecture in
`docs/payments/VALLO_PAYMENTS_ARCHITECTURE.md` section 3A.

| # | Feature | Owner |
|---|---|---|
| 1 | **Fiat `PaymentProvider` interface** with capability declaration. Does not exist: Paystack is called directly across ~149 files | S2 |
| 2 | **Payment rail router** as a policy table with effective dates. Resolves escrow or direct per listing and lister, fails closed, writes `transactions.rail` | S2 |
| 3 | **Payluk escrow rail**: create, fund, hold, release on confirmed arrival or move-in | S2 |
| 4 | **Milestone escrow for property sale**: deposit, title verified, completion | S2 |
| 5 | **Escrow cancellation and refund path**, honouring the frozen cancellation terms. Blocked on open question 3 | S2 + F |
| 6 | **Dispute desk for escrow**, because Payluk does not arbitrate and Vallo must: two-person rulings, append-only record, nobody rules their own case | S2 |
| 7 | **Provider balance mirror + reconciler**. Mirror is never truth; every row carries its observation time | S2 |
| 8 | **Payluk payouts** to lister bank accounts, with name resolution | S2 |
| 9 | **Vallo-owned idempotency** on the Payluk boundary, since Payluk documents none | S2 |
| 10 | **Payluk webhook verification**, HMAC-SHA512 over raw body, plus a replay window | S2 |
| 11 | **One protection per rail**: the hold protects escrow payers, the Guarantee protects direct payers. Needs a founder yes | S2 + F |
| 12 | **Escrow payer and lister interfaces**: held state, release action, dispute, milestone progress | S3 |
| 13 | **Buy and sell transaction flow**. Schema exists, no screen renders it, no Buy in navigation | S2 + S3 |
| 14 | **Referral rewards as booking credit** + append-only credit ledger, qualified on first paid booking, released after the claim window | S2 |
| 15 | **Entitlement and plan infrastructure**, exercised at zero. Paid placement stays banned | S2 |
| 16 | **Escrow switch-on gate**, fail-closed, founder-controlled | S2 |

## B. Trust

| # | Feature | Owner |
|---|---|---|
| 17 | **vNIN identity provider**: choose an aggregator and integrate. Production runs on a stub today | S2 + F |
| 18 | **Blocked terms list** + admin management. Ships empty today, which is a store risk | S2 |
| 19 | **Sanctions list loaded**, so screenings can read `clear` instead of `no_list` | F |
| 20 | **Space Passport extension**: identifier, space-side passport, share card | S2 + S3 |
| 21 | **Earned badge moment**. Badges are awarded nightly and nobody is ever shown it | S3 |
| 22 | **BVN, selfie, liveness**: decide whether launch needs them | F |

## C. Supply, which is the real blocker

| # | Feature | Owner |
|---|---|---|
| 23 | **Concierge listing tool**: staff create on a lister's behalf under the existing mandate machinery, lister confirms by signed link. Never pre-verified | S2 + S3 |
| 24 | **`MORE_INFO_REQUIRED` forward path**. Blocks the founder's own application since 22 September | S2 |
| 25 | **Bulk photo intake**, a WhatsApp dump in one go, HEIC included | S2 + S3 |
| 26 | **Listing video**, server-enforced 50 MB cap. Table exists, nothing writes to it | S2 + S3 |

## D. Intelligence

| # | Feature | Owner |
|---|---|---|
| 27 | **Host analytics**. Does not exist at all | S2 + S3 |
| 28 | **First-party event layer**, on the listing funnel's privacy rules | S2 |
| 29 | **Space Analytics**: listing insights, demand signals, pricing guidance from real paid tenancies | S2 + S3 |
| 30 | **Error reporting and a pager**. `SENTRY_DSN` unset, nobody is paged | S4 + F |

## E. Experience: the platform-wide sweep

Spec: `docs/design/VISUAL_NORTH_STAR_2026-10-05.md`.

| # | Feature | Owner |
|---|---|---|
| 31 | **Container system**, four tiers, both themes | S3 |
| 32 | **Figure and odometer primitives**, the signature | S3 |
| 33 | **Motion system**, 24 moments | S3 |
| 34 | **Startup branded animation**, after the `/open` deadline fix | S2 then S3 |
| 35 | **Vector logo mark**. PNG only today, so the animation would be soft | S3 |
| 36 | **Capsule dock and side nav upgrade**, both kept | S3 |
| 37 | **Onboarding wiring**, and interests actually used on `/home` | S2 + S3 |
| 38 | **Checkout, processing and receipts in Paper**, worth screenshotting as proof | S3 |
| 39 | **Referral hub** with the code unfold | S3 |
| 40 | **Landing page rebuild**, the first thing an investor opens | S3 |
| 41 | **Admin console material pass**, mobile-usable | S3 |
| 42 | **Email templates**, Paper receipts matching the screen exactly | S3 |
| 43 | **Offline card rebuild**, real logo | S3 |
| 44 | **Clay asset set**, matte, per the generation prompts | S3 |
| 45 | **Full sweep of all 200 pages** against the 24-point audit | S3 |

## F. Release, legal and docs

| # | Feature | Owner |
|---|---|---|
| 46 | **Android release lane**: keystore, Play App Signing, real `assetlinks.json` and Firebase key, signed AAB workflow | S4 + F |
| | Device test matrix executed. Every row reads NOT RUN today | S4 |
| | Store submission, both platforms | S4 + F |
| | Push proven to a real device | S4 + F |
| | Payout terms page. Does not exist | S4 + F |
| | Dispute policy page. Urgent now escrow is in | S4 + F |
| | KYC and KYB policy | F |
| | Cookie consent | S4 + F |
| | `COMPANY.md` reconstruction. 21 docs link to deleted files | S4 + F |
| | Doc consolidation, five overlap clusters | S4 |

---

## The order that matters

Nothing in money or experience outranks these three:

1. **One real payment proven** on a real phone through the WebView, including
   3-D Secure. The money layer has never carried a naira.
2. **Twenty real listings.** Every surface is empty. Item 23 halves the work;
   only the founder can recruit.
3. **The `/open` deadline fix.** Three lines, and the startup animation waits on
   it.
