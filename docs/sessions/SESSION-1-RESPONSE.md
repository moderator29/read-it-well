# SESSION 1: Master product architect and system strategist

**Date:** 5 October 2026. **Branch:** `claude/rentme-v2-platform-audit-xuvg0a`.
**Base commit audited:** `8541e25da`.
**Role:** audit, challenge, architect, prioritise, hand off. No implementation.

Read sections 1 to 4 if you read nothing else. Section 1 is the verdict,
section 2 is what the platform measurably is, section 3 is what is actually
wrong, section 4 is the one decision that blocks the largest piece of the
brief.

Companion documents written by this session:

| Document | What it holds |
|---|---|
| `docs/payments/VALLO_PAYMENTS_ARCHITECTURE.md` | The Payluk, Paystack and Yellow Card architecture, the provider interface, the ledger, and the legal gate |
| `docs/design/VISUAL_NORTH_STAR_2026-10-05.md` | All 79 reference images classified, the visual direction, and the asset generation prompts |
| `docs/sessions/SESSION-2-HANDOFF.md` | Backend, money and trust execution prompt |
| `docs/sessions/SESSION-3-HANDOFF.md` | Frontend and experience execution prompt |
| `docs/sessions/SESSION-4-HANDOFF.md` | QA, release and store execution prompt |

---

## 1. The verdict, in one page

**The brief assumes Vallo is half-built and needs a generational rebuild. That
assumption is wrong, and acting on it would be the most expensive mistake
available right now.**

Measured, not guessed: 200 live product pages, 55 route handlers, 579
migrations, 284 tables, 494 row-level-security policies, 416 triggers, about
1,044 database functions, 5,773 unit tests across about 690 test files, 95
end-to-end specs, a 38-page admin console with nine staff scopes, four
locales, two themes, an AML/CFT control set with eight SCUML obligations live
and probed, and a motion system with its own token scale. This is not an MVP.
It is a mature, audited, compliance-aware platform.

**What is missing is not architecture. It is supply, one legal letter, and
three integrations that are still stubs.**

- **There is no inventory.** Roughly 16 accounts exist, no agent has been
  approved, and no real listing is published. The 64 listings in the database
  are all `is_demo = true`. Every discovery surface is correctly, honestly
  empty. A guest can sign up today and find nothing to book.
- **The platform cannot take a payment today**, because
  `PAYSTACK_GUARANTEE_SUBACCOUNT` is unset and no lister has a subaccount, so
  `payment_split_for_booking` opens nothing.
- **Identity verification runs on a stub.** `lib/identity/provider.ts` offers
  `unconfigured` (the production default) and `stub`. No vNIN aggregator has
  been chosen. So "verified" currently means a staff member looked at an
  uploaded photograph.
- **The abuse word list ships empty.** `blocked_terms` has no rows, and
  `docs/safety/BLOCKED_TERMS_PROPOSAL.md` is still a proposal. An empty filter
  is an Apple 1.2 and Google UGC exposure on a platform that already carries
  user-generated posts, stories and messages.
- **The wallet, escrow and referral economics the brief asks for are the exact
  things a founder-ratified architecture decision deleted eleven days ago**,
  for stated legal reasons that have not changed. See section 4.

**So the order of work is not "rebuild". It is:**

1. Fill the shop (supply), and build the two tools that make filling it
   possible for one person.
2. Turn the money rail on in test mode and prove one real split end to end.
3. Get the legal letter that decides whether wallets and escrow may exist at
   all, then build the Payluk track that the answer permits.
4. Raise the craft to the standard of the reference images on the screens that
   already exist, starting with startup, onboarding and receipts.
5. Ship to both stores.

**What I am refusing to do, and why.** I am not writing an implementation plan
for a custodial naira wallet as the launch architecture. Section 4 explains the
alternative that gets most of the product value with none of the licensing
exposure, and what has to be true before the custodial version may be built.
If the instruction after reading section 4 is still "build the wallet", that is
the founder's call to make, and it should be made in writing with a solicitor's
letter beside it.

---

## 2. What Vallo actually is today

### 2.1 Measured inventory

| Layer | Measured state |
|---|---|
| Routes | 200 non-dev pages, 55 route handlers, plus 216 developer preview pages behind `VALLO_PREVIEW_HARNESS` |
| Member surfaces | 79 pages: discovery, bookings, rent and tenancy, messages, social, profile, 16 settings screens |
| Supply surfaces | Agent workspace 21 pages, host workspace 17 pages |
| Admin | 38 pages, 12 nav sections, 9 staff scopes, passkey step-up, append-only `audit_log` |
| Public site | 27 pages: company, legal, supply doors, move-in calculator, area prices, verification doors |
| API | 46 handlers: 18 cron, 6 webhook/inbound, push, member data, AI, telemetry, compliance |
| Database | 579 migrations, 284 tables, 246 RLS-enabled, 494 policies, 416 triggers, about 1,044 functions |
| Scheduled work | pg_cron inside Postgres (ADR-014), not Vercel cron |
| Tests | 5,773 unit tests, about 690 test files, 95 Playwright specs, CI with typecheck, lint, audit, build, a11y, db-probes |
| i18n | English typed source plus Yoruba, Hausa, Igbo drafts; 57 untranslated sentences per locale |
| Design | Tokens in a 4,235-line stylesheet, dark default plus light, motion token scale, Poppins display and Inter text |
| Native | Capacitor 8.5 shell loading the live origin, iOS signed archive proven to TestFlight, Android debug only |

### 2.2 What is genuinely excellent and must not be touched

These are the parts where the codebase is better than its own brief, and where
a rebuild would destroy real value:

1. **The money correctness discipline.** Integer kobo everywhere (ADR-004), one
   `formatMoney`, basis points for percentages, a check constraint that refuses
   a `ledger_entries` row whose parts do not sum to the gross, frozen move-in
   quotes, frozen cancellation terms, a three-stamp refund clock, idempotency
   records with 15 call sites, one open payment attempt per payer and charge.
2. **The trust separation.** Five separate trust signals that are deliberately
   forbidden from collapsing into one tick, timestamps rendered as dates rather
   than flags, a ranking formula with a test asserting that no featured, boost,
   sponsor or premium input exists.
3. **The compliance layer.** Eight SCUML obligations live and probed, two-person
   decisions, tipping-off protection, append-only case records, holds expressed
   as per-desk claims, a threshold observer on every settled charge.
4. **The honesty rules.** `demo`, `sample`, `preview`, `coming soon` and `lorem`
   are banned from UI copy and the ban is enforced by a test. Money sentences
   all read from one file. A valuation-words lint. A no-em-dash lint. These
   exist because the repository once shipped 23 invented places, 22 of them
   carrying `verified: true`.
5. **The security posture.** Service-role key throws if evaluated in a browser,
   `resolveSession()` uses `getUser()` not `getSession()` across 110 call sites,
   Postgres-backed rate limiting at 77 call sites, WebAuthn step-up on anything
   that moves where money lands, a grant-state audit enforced by tests.
6. **The admin console.** 38 desks is not scaffolding. It is an operations
   product, with a handbook a unit test reads.

**Rule for every later session: these are KEEP. Extend them, obey them, do not
re-litigate them.**

### 2.3 The honest weak spots

| Area | State |
|---|---|
| Supply | 0 approved agents, 0 published listings, 64 demo listings, roughly 16 accounts |
| Fiat provider abstraction | None. Paystack is called directly across about 149 files |
| Identity (vNIN) | Stub. No aggregator chosen. Flag `vnin_identity` off |
| BVN, selfie, liveness | Not built |
| Abuse word list | Empty |
| Referral economics | Attribution only. A code, a door, admin counts. No reward, by deliberate copy |
| Entitlements, subscriptions, boosts | Do not exist. Paid placement is forbidden by a check constraint (V-06) |
| Host analytics | None. Agents have a funnel; hotel hosts have no analytics page |
| Third-party analytics and error reporting | None installed. No PostHog, no Sentry client, `SENTRY_DSN` unset |
| Push notifications | Built end to end, zero tokens live, nothing ever delivered to a device |
| Android release | Debug builds only. No signing workflow. `assetlinks.json` SHA-256 values are placeholders. Firebase key is a placeholder |
| Device testing | Every row of the native test matrix reads NOT RUN |
| Startup | `/open` still calls `resolveSession()` with no deadline: the same hang class that was fixed in `/home-or-landing` |
| Onboarding | Cold-start sign-up never carries `next=/welcome`, so interests and arrival questions are reached only by an indirect redirect from `/home` |
| Docs | 60 top-level documents, five overlap clusters, 21 live documents linking to `archive/HANDOFF_*` files that no longer exist |
| Legal | No NDPC registration number, no cookie consent, no payout terms page, no dispute policy, no KYC/KYB policy, legal pages English only |

---

## 3. The six things that are actually wrong, ranked

Ranked by what kills the company soonest, not by what is most interesting.

### R1. There is nothing to book, and nothing in the plan fixes that

Every surface works. Nobody can use any of them, because no agent has been
approved and no listing is published. The founder's own agent application
VL-AGT-10016 has been stuck at "needs more information" since 22 September
because that state had no way forward.

This is the only problem that cannot be solved by writing code, and it is also
the one where code helps most. A single founder cannot onboard 20 listers
through a seven-step web wizard by asking them to do it themselves. Nigerian
supply arrives over WhatsApp, in photographs, in voice notes, in person.

**What engineering owes this problem:**

- A **concierge listing tool** in the admin console: a staff member creates a
  listing on behalf of a lister from photographs and a phone call, and the
  lister confirms by a signed link. The mandate machinery for acting on
  somebody's behalf already exists (`listing_mandates`, SCUML item 17), so this
  is lawful and auditable rather than a back door.
- A **stuck-application escape**: `MORE_INFO_REQUIRED` must have a forward path
  for both sides.
- A **photo intake that accepts a WhatsApp dump**: many images, HEIC included,
  in one go, with the server doing the resizing and EXIF strip that already
  exists.

Nothing else on the roadmap matters as much as this. Twenty real listings
change the product from a demonstration into a marketplace.

### R2. The money rail has never carried one real naira

The split path is well built and completely unproven. `PAYSTACK_GUARANTEE_SUBACCOUNT`
is unset, so nothing opens. The only real top-up ever recorded was credited by
the reconciler 16 hours late rather than by the webhook, which means the webhook
has never been proven in production. Paystack 3-D Secure inside the Capacitor
WebView is untested and is flagged in the native audit as the single most likely
failure.

**One end-to-end test-mode payment, from a real device, through the WebView,
with the webhook landing, is worth more than any new payments feature.**

### R3. Trust is a promise the stack cannot currently keep

The product's entire argument is the verified badge, the inspection and the
agent ladder. Identity verification runs on a stub. So the strongest claim
Vallo makes is backed today by a staff member looking at a JPEG.

Separately, `blocked_terms` is empty, no real sanctions list is loaded (every
screening records `no_list`, never `clear`), and there is no BVN, selfie or
liveness check.

### R4. The brief's money architecture contradicts the platform's own constitution

See section 4. This is the largest single item in the brief and it is blocked on
something nobody has yet obtained.

### R5. Startup and first run are still the weakest 20 seconds in the product

The splash hang was root-caused and fixed in `/home-or-landing`, but `/open`,
which is the actual native entry path, still makes an unbounded auth round trip.
The fix is three lines and it has not been applied.

Then the first run itself: a new member signs up, sets a passcode, and lands on
`/home` having never been asked what they are looking for, where they are, or
how they found Vallo, unless an indirect redirect happens to fire. The questions
exist, the components are built, and the wiring is a missing query parameter.

And interests, once collected, do not personalise `/home` at all. They only tune
`/search`. So the platform asks for data it then ignores on the screen the member
sees most.

### R6. The repository's own memory is decaying

21 live documents link to `archive/HANDOFF_*` files that were deleted. The docs
README calls one of them "the only written record of the company's obligations".
`docs/MONEY_ARCHITECTURE.md` says the custody retirement migration is still
pending when it has been applied. Five document clusters overlap and
contradict: three design directions, four icon specs, two navigation specs.

The 3D icon direction contradicts itself across three documents: glass, then
matte clay with an orange accent, then line glyphs on flat plates. A later
session will pick one of the three at random unless this is resolved first.

---

## 4. The decision that blocks the brief: Payluk against ADR-0002

### 4.1 The conflict, stated plainly

**The brief asks for:** user wallets, escrow holds on bookings, host payouts
from balances, referral payouts with a ₦80 minimum withdrawal, and an immutable
ledger behind it.

**The platform decided on 25 September 2026, by founder directive:** no wallet,
no balance, no escrow, no held payment, no withdrawal. Recorded as ADR-0002,
superseding ADR-0001. Enforced in four places:

1. The custody tables were moved into a `retired_custody` schema with no grants.
2. Execute was revoked on every custody function.
3. The `wallet`, `held_payments` and `held_payments_payouts` flags were switched
   off, with a guard that refuses to turn them back on.
4. An event trigger refuses the creation of any new custody-named object.

**The stated reason was not aesthetic.** Holding client funds between two
parties is regulated by the Central Bank of Nigeria, and VALLO SPACES LTD's
objects clause does not cover it. Every sentence in the product that described
escrow was, in the words of the decision, "a promise the company could not
lawfully keep". `THE_AUDIT.md` section 11 item 3 asked for a written legal
opinion on exactly this question. **That opinion has still not been obtained.**

So the brief asks a team to rebuild, with a new provider, the precise thing that
was deleted for legal reasons that remain unresolved.

**Two further findings from the Payluk research, either of which would change the
plan on its own.** Both carry the evidence warning in
`docs/payments/VALLO_PAYMENTS_ARCHITECTURE.md` section 0: Payluk's documentation
could not be reached from this environment, so section 3 of that file is a
hypothesis reconstructed from npm, search snippets and a third-party copy of
Payluk's agent skill. Session 2 must verify both against the live docs.

1. **Payluk cannot do Vallo's three-way split.** One escrow pays one seller. The
   Guarantee contribution has no atomic third leg and would need a second,
   reconciled transfer. Payluk is therefore not a drop-in second rail: it is a
   different product for a different flow, with custody at its centre.
2. **Vallo, not Payluk, would arbitrate every money dispute.** `dispute/resolve`
   is a merchant endpoint and the merchant decides `COMPLETED`, `REFUNDED` or
   `SPLIT`. Payluk does not arbitrate. **That makes Vallo the judge of who keeps a
   guest's money**, which is a consumer-protection posture rather than a feature,
   and it requires a published dispute policy, two-person rulings, an append-only
   record, and counsel's view on whether arbitrating third-party-held funds
   changes Vallo's regulatory character.

**And one question outranks the rest:** can a funded Payluk escrow be refunded
without opening a dispute? A guest cancelling three weeks before check-in is
routine, not a dispute. If the answer is no, every ordinary cancellation becomes a
ruling Vallo must make, and Payluk is the wrong tool for bookings. It is one email
to find out, and it should be sent before any further Payluk work.

### 4.2 The resolution: Payluk is the custodian, Vallo is never one

There is a lawful shape, and it is not a loophole. It is a different architecture
with a different liability owner.

**Vallo does not hold money. Payluk does, under Payluk's licence, in accounts
Payluk owns and controls.** Vallo orchestrates and keeps its own books. What a
member sees as "my Vallo balance" is a **read-through view of a balance held at
a licensed provider**, and every sentence of product copy must say so.

That distinction is legally load-bearing and it changes four things:

| Thing | Today | Under the Payluk track |
|---|---|---|
| Who owes the member their money | Nobody. Money never stops moving | Payluk, under its licence |
| What Vallo stores | A record of payments that moved | A mirror of a provider-held balance, reconciled, never authoritative |
| What the copy says | "Vallo never holds your money" | "Your money is held by Payluk, a licensed payments provider. Vallo never holds it" |
| What has to be true first | Nothing | A written legal opinion, a new ADR, a Terms version bump and re-acceptance |

**The naming rule is structural, not cosmetic.** The new tables must not be
called `wallets` or `escrows`. They must be named for what they are, so that the
architecture is self-documenting and the existing custody guard stays intact:
`payluk_balances`, `payluk_ledger_mirror`, `payluk_holds`, `payluk_payouts`.
Anybody reading the schema should be unable to mistake a provider mirror for a
Vallo liability. The event trigger that refuses custody-named objects should
stay exactly as it is.

### 4.3 The two-track plan

**Track 1: ships now, no legal dependency.**

- **A real fiat `PaymentProvider` interface.** This does not exist today:
  Paystack is called directly across about 149 files, while the crypto path has
  a proper interface. That asymmetry is the single highest-value refactor in the
  money layer, and it is worth doing whether or not Payluk ever ships, because
  it is also what makes Paystack replaceable and testable.
- **Payluk on staging only.** Corrected after reading the Payluk digest:
  **Payluk cannot perform Vallo's three-way split.** One escrow pays one seller.
  So Payluk is not a second rail for the existing model; it is an escrow product,
  and escrow means custody. What ships now is the full adapter built against
  `staging.api.payluk.ng` with a test key and Payluk Test Bank: no real customer
  money at any point. That proves the adapter, the webhook signature, the dispute
  path and the reconciler against a real API, and answers most of the open
  questions empirically. It is the most valuable Payluk work available before the
  letter exists, and it is entirely safe.
- **Referral rewards as booking credit, not cash.** A ₦76 reward expressed as a
  credit applied at checkout against a future booking is a discount on Vallo's
  own revenue. It is not client funds, it needs no custodian, it cannot be
  withdrawn, and it is therefore outside the regulated activity entirely. It
  also converts far better than cash, because it only pays out when the referred
  member transacts.
- **The existing agreement gate plus the Vallo Guarantee already deliver the
  protection escrow was for**: payment opens only after both parties confirm and
  an admin approves, and a reserve stands behind the booking. This is escrow's
  product benefit without escrow's licence.

**Track 2: designed now, built behind a flag, switched on only when the letter
exists.**

- Provider-custodied balances, holds and release-on-checkout.
- Cash referral withdrawal.
- Everything in section 4.2's right-hand column.

The flag must fail closed, the way `lib/crypto/gate.ts` already does: five
independent conditions, checked on every render and again in every server
action, so a half-configured custody feature cannot appear in the interface.

### 4.4 What the founder must obtain before Track 2 may be built

1. **A written legal opinion** on whether Vallo may operate a provider-custodied
   balance with Payluk as custodian, without its own CBN licence, and whether
   the objects clause needs amending. This is the same item THE_AUDIT asked for
   on 23 September.
2. **Payluk's own licence position in writing**: what it is licensed to do, who
   the regulated entity is, and what Payluk's terms say about whose money it is.
3. **A new ADR-0003** superseding ADR-0002, written before any code, saying what
   changed and why.
4. **A Terms and Privacy version bump with re-acceptance**, because the answer to
   "who holds your money" is changing.
5. **Confirmation that Payluk cNGN is excluded.** The brief says so and I agree
   emphatically. Section 7.3 of the payments document explains why a stablecoin
   balance in a Nigerian property app is a trust catastrophe regardless of its
   engineering.

### 4.5 My recommendation

**Build Track 1 now. Design Track 2 and do not build it until the letter exists.**

Track 1 delivers: a second payment rail that reduces single-provider risk, a
referral programme that actually pays, and a provider abstraction that makes the
money layer testable. That is most of the brief's business value, available in
weeks, with no regulatory exposure.

Track 2's extra value over Track 1 is convenience: funds in a balance between
transactions. That convenience is what carries the licence.

---

## 5. The inventory: KEEP, IMPROVE, REFACTOR, REPLACE, DEPRECATE, MISSING

| Area | Verdict | Note |
|---|---|---|
| Money: integer kobo, `formatMoney`, basis points | KEEP | ADR-004. Non-negotiable |
| Money: split charge, attempts, abandoned sweep, refund clock | KEEP | Prove it live; do not redesign |
| Money: Paystack called directly in ~149 files | REFACTOR | Behind a `PaymentProvider` interface. Highest-value money refactor |
| Money: `platform_revenue`, `listing_fee` fee kind with no charging path | DEPRECATE | Historical. Remove or wire deliberately |
| Money: Yellow Card crypto, fully built, off, 5 gates | KEEP as-is | Do not touch. It is correct and correctly disabled. SEC VASP question still open |
| Money: Yellow Card webhook has no replay window | IMPROVE | A timestamp window, per the TODO at `yellowcard.ts:246` |
| Money: Payluk | MISSING | Section 4. Track 1 only |
| Money: custody guard and `retired_custody` schema | KEEP | It is the thing stopping an accident. Amend deliberately, never bypass |
| Money: `revalidatePath("/wallet")` in 4 places | IMPROVE | Dead path. Clean up |
| Trust: five separate signals, dates not flags | KEEP | The product's whole argument |
| Trust: vNIN on a stub | REPLACE | Choose an aggregator. Section 3 R3 |
| Trust: manual document review | KEEP | It works. It is the floor, not the ceiling |
| Trust: `renter_passports`, `passport_shares` | KEEP and EXTEND | This **is** the Space Passport the brief asks for. Section 8 |
| Trust: badges, nightly sweep, admin grant | KEEP | The earned-moment UI is MISSING |
| Trust: `blocked_terms` empty | MISSING | Store exposure. Seed it |
| Trust: no real sanctions list | MISSING | Founder input. Every screening records `no_list` |
| Trust: BVN, selfie, liveness | MISSING | Decide whether launch needs them |
| Supply: listing model, 60 columns, Nigerian realities | KEEP | Power band, water, prepaid meter, estate access. This is the moat |
| Supply: move-in total as a first-class indexed column | KEEP | The differentiator. Lead with it everywhere |
| Supply: `listing_intent` has 2 values for 4 markets | REFACTOR | Known rough edge, P-7 |
| Supply: buy and sell in schema, absent from UI | MISSING | Decide: build or park. Do not leave half-present |
| Supply: `listing_videos` exists, nothing writes to it | DEPRECATE or build | With a server-enforced 50 MB cap |
| Supply: PostGIS `listings_in_bounds` exists, nothing calls it | IMPROVE | Make the map pin mandatory first |
| Supply: concierge listing tool | MISSING | Section 3 R1. Highest business value in the whole document |
| Supply: `MORE_INFO_REQUIRED` has no forward path | MISSING | Blocks the founder's own application |
| Discovery: search, filters, map, empty states | KEEP | Correct and empty for the right reason |
| Discovery: `/home` ignores interests | IMPROVE | Section 3 R5 |
| Social (Around): posts, stories, places, follows, kill switch | KEEP | Behind the switch. It is ready before it is needed |
| Social: tab stays visible when paused | IMPROVE | Hide it, per SOCIAL_DESIGN §7.7 |
| Admin: 38 desks, 9 scopes, passkey step-up, audit log | KEEP | Genuinely strong |
| Admin: desk-first, wide tables scroll sideways on mobile | IMPROVE | Section 9 |
| Analytics: agent listing funnel (V-73) | KEEP and EXTEND | The model for everything else |
| Analytics: hosts have none | MISSING | Section 9 |
| Analytics: no third-party, no error reporting | MISSING | Founder must create a Sentry project |
| Entitlements, subscriptions, boosts | MISSING by policy | Section 7. Keep paid placement banned |
| Referrals: code, door, admin counts | KEEP | The attribution half is done and correct |
| Referrals: no economics | MISSING | Section 6 |
| Native: Capacitor shell on the live origin | KEEP | Defensible for v1 |
| Native: `/open` unbounded auth call | IMPROVE | Three lines. Do it first |
| Native: Android signing workflow | MISSING | Section 10 |
| Native: `assetlinks.json` and Firebase placeholders | MISSING | Founder holds the values |
| Native: push built, never delivered | IMPROVE | APNs key is the founder's |
| Native: zero device tests | MISSING | Every matrix row reads NOT RUN |
| Startup: static splash, no branded animation | MISSING | Section 11 |
| Onboarding: questions built, not wired on cold start | IMPROVE | One query parameter |
| Design: tokens, motion scale, two themes, four locales | KEEP | Strong foundation |
| Design: 3D icon direction contradicts itself across 3 docs | REPLACE | One decision, one document. Section 12 |
| Design: no SVG logo, PNG only | IMPROVE | A vector mark is needed for a crisp startup animation |
| Docs: 60 top-level files, 5 overlap clusters, 21 broken links | REFACTOR | Section 13 |
| Legal: NDPC number, cookie consent, payout terms, dispute policy, KYC/KYB policy | MISSING | Section 14 |

---

## 6. Referral economics: the ₦76 hypothesis, challenged

The brief proposes roughly ₦76 per qualified referral and an ₦80 minimum
withdrawal, marked as a hypothesis rather than final. Taking it seriously:

**The arithmetic is hostile by construction.** One referral earns ₦76 and the
minimum withdrawal is ₦80. A member who refers one person can never withdraw.
If that friction is deliberate, it will be read as a trick the first time it is
noticed, and it will be noticed, screenshotted and posted. If it is accidental,
fix it. Either way the gap between one reward and the withdrawal floor should
not be a number a member discovers for themselves.

**Paying cash on sign-up, on a marketplace with no supply, funds fraud.** With
zero listings, a referred account cannot transact, so the only thing ₦76 buys is
an account. That is an invitation to farm. The qualification event must be tied
to real money moving, not to a sign-up:

> A referral qualifies when the referred member completes their first paid
> booking, and the reward is released after the Guarantee claim window closes.

That timing matters: paying before the claim window shuts means paying out on
bookings that are later refunded.

**The reward should be booking credit, not cash, at launch.** Section 4.3. It
removes the custodian, removes the withdrawal floor problem entirely, costs
Vallo less in real terms, and only pays when the referred member transacts.

**What the platform already has.** `referral_codes` with a readable six-character
alphabet, a rate-limited `/join/<code>` door that reveals only a first name,
`admin_referral_counts`, and the code landing in user metadata at sign-up. The
attribution layer is done and well built. Only the economics are missing. The
current copy says "No reward is promised", which is the correct thing to say
until the economics exist.

**One real datum worth building on:** of the 14 accounts that answered "how did
you hear about Vallo", 6 said friend or family. Word of mouth is already the
loop. It had no way to be recorded until 30 September, and no way to be rewarded
yet.

**Economics the founder must set, with my recommended defaults:**

| Question | Recommended default |
|---|---|
| Reward form | Booking credit at launch; cash only on Track 2 |
| Qualification | Referred member's first paid booking, released after the claim window |
| Reward size | Expressed as a percentage of Vallo's take, not a flat naira figure, so it can never exceed revenue |
| Referrer cap | A monthly ceiling, so one person cannot become an unbudgeted channel |
| Expiry | Credit expires; say the date on the screen that grants it |
| Self-referral and farms | One reward per verified identity, not per account. `identity_denylist` already exists |

---

## 7. Monetisation and entitlements

### 7.1 The distinction that matters

The platform forbids paid placement with a check constraint forcing
`listings.featured = false`, a published ranking formula, and a test asserting
that no featured, boost, sponsor, premium or subscription input exists in
ranking. **That is right and it should stay.** In a market where trust is the
product, a listing that paid to be first poisons every listing behind it.

**But "no paid placement" is not "no revenue".** The permissible lines are
services with a real cost and a real deliverable, where what is bought is work
rather than rank:

| Permitted | Why it is clean |
|---|---|
| Commission on a transaction | The `fee_rates` engine already exists, set to zero, with effective dates. Switch it on with the 30-day notice the product already promises |
| Paid professional inspection | A real person goes to a real property. The badge depends on the outcome, never on the payment |
| Professional photography | A real deliverable |
| Concierge listing creation | Staff time |
| Verification fast-track | The queue position, never the outcome |
| Tools for professional listers: calendar sync, bulk actions, statements | Software, priced as software |

| Forbidden, permanently | Why |
|---|---|
| Featured, boosted, sponsored or promoted placement | Destroys ranking trust |
| A purchasable badge or tier that implies verification | The moment a badge can be bought, every badge is worth nothing |
| Paying to appear verified, inspected or recommended | Same |

### 7.2 Entitlements as infrastructure

There is no entitlement system, and the fee engine is the precedent for how to
build one: **build it now, exercise it at zero, switch it on later.** A plan
table with effective dates, an entitlement check that every gated feature calls,
and a default plan that grants everything currently free. Then nothing has to be
retrofitted the day a paid tier exists, and no transaction is ever priced by a
rule the system cannot explain.

The reference images point at tier UI repeatedly (hero object, three stats,
benefit rows, sticky CTA). That template should serve **trust tiers**, which are
earned, before it ever serves paid plans.

### 7.3 On cNGN and crypto

The brief says do not build the launch architecture on Payluk cNGN and do not
create a generic crypto wallet in Vallo. **Agreed, and stronger:** in a market
where MMM and a decade of coin schemes have burned people, a stablecoin balance
inside a property app reads as a scam signal to exactly the cautious, careful
renter Vallo most needs. The reference images contain this anti-pattern
explicitly, with "lock 100,000 XPL" language, and it is classified AVOID in the
visual document.

The existing Yellow Card integration is the right shape for crypto and should
not be extended: it is a way to pay an existing naira charge, it never holds
crypto, Vallo never has an address or a key, and it is off behind five gates
pending an SEC VASP legal answer. Leave it exactly as it is.

---

## 8. Trust, the Space Passport, and the Space OS layers

### 8.1 The Space Passport already exists

The brief describes a Space Passport with an identifier such as
`VSP-ABJ-000184`. The platform has `renter_passports` and `passport_shares`,
built as V-100, showing phone confirmed, NIMC match, inspections attended,
tenancies and member since, with a share mechanism.

**This is the Space Passport. Extend it; do not build a second one.** What it
needs:

- A human-readable identifier, if the founder wants one. A caution: an
  identifier encoding a city and a sequence number leaks how few members there
  are. `VSP-ABJ-000184` tells a reader that Abuja has fewer than 200 members.
  Either accept that or make the identifier opaque.
- The space side. Today the passport is about a person. A listing deserves the
  same treatment: what has been checked, when, by whom, rendered as dates.
- The earned moment. Badges are awarded nightly by a sweep and nobody is ever
  shown the moment. The reference images are full of reveal moments, and this is
  the one the product has genuinely earned the right to use.

### 8.2 The Space OS layers, mapped to what exists

The brief's layers are a useful frame. Mapped honestly:

| Layer | What exists | Verdict |
|---|---|---|
| DISCOVER | Search, 12-filter stay search, map, areas, Price Check, saved searches, demand events | Built. Empty for lack of supply |
| TRUST | Five signals, ladder, badges, passport, reviews with withheld weight, SCUML | Built, resting on a stub identity provider |
| UNDERSTAND | Move-in calculator, price context, area prices, honest-cost columns | Built, and genuinely differentiated |
| TRANSACT | Agreement gate, split payment, refund clock, caution register, flatmate shares | Built, never proven live |
| OPERATE | Host and agent workspaces, calendar, decide list, statements, admin desks | Built |
| INTELLIGENCE | Agent listing funnel, admin analytics, assistant | Partial. No host analytics, no third-party events |
| ECOSYSTEM | Referral attribution, social layer, invite door, supply front doors | Attribution only |

**The frame is sound and the layers are mostly already there.** What the brief
calls a new operating system is, in this codebase, a naming and completion
exercise rather than a build. That is good news and it should be said plainly
rather than dressed up.

---

## 9. Space Analytics

**What exists:** the per-listing funnel (V-73) is the right model, with daily
impressions and opens, HMAC-salted viewer deduplication, a service-role-only
recorder capped at 300 calls a day, and a comparison against at least five other
listers' listings so a single lister cannot infer another's numbers. That privacy
care is unusual and should be the template.

**What is missing:**

1. **Hosts have no analytics at all.** Agents have a funnel; the host workspace
   has earnings, bookings and reviews, and no analytics page.
2. **No event layer.** `instrumentation-client.ts` sets one Zod option and
   nothing else. There is no product event stream, so no funnel beyond the two
   hand-built ones, and no retention or cohort view.
3. **No error reporting.** `SENTRY_DSN` is unset. Nobody finds out when a member
   hits an exception.

**What to build, in order:** the host analytics page on the agent funnel's
model; then one first-party event table with a recorder that obeys the same
privacy rules; then a Sentry project, which only the founder can create.

**What not to build:** a third-party analytics SDK that ships a tracker to the
browser before the privacy policy and the store privacy answers describe it. The
store privacy form currently answers no to performance data, and that answer has
to change before any such SDK ships.

The reference images are explicit about what good looks like here: a single hero
figure, a period toggle on a sliding pill, an odometer numeral, a line chart that
reflows between periods, and hatched bars for the periods with no data yet. That
last one matters most, because every chart in this product will be mostly empty
for months.

---

## 10. Release: where the two stores actually stand

**iOS: close.** The signed archive workflow works, build 100044 passed Beta
Review, testers are installing, the splash hang is fixed. What remains: device
testing against a matrix where every row reads NOT RUN, 3-D Secure inside the
WebView, the APNs key, store screenshots from a shipped build, the privacy form
answer for performance data, and a reviewer account.

**Android: not started in any real sense.** Debug builds only. No signing
workflow despite reserved secret names. `assetlinks.json` carries
`PLACEHOLDER_` SHA-256 values and the strict `cap:sync` refuses to pass until
they are real. The Firebase `current_key` is a placeholder and `bundleRelease`
refuses. The Play account is unconfirmed and the $25 unpaid. On Android 12 and
above the system splash will show the launcher icon rather than the splash PNG,
because `windowSplashScreenAnimatedIcon` is not set, and this has never been
checked on a device.

**The sequence for Android** is: pay the $25 and enrol as the organisation,
generate an upload keystore, enable Play App Signing, put the real SHA-256
values into `assetlinks.json`, replace the Firebase key, add a release signing
workflow mirroring the iOS one, build an AAB, then internal testing before
production.

---

## 11. The startup experience

**Root-cause first, animation second.** `/open` must get the same deadline
`/home-or-landing` received. An animation over an unbounded network call is a
longer hang with better production values.

**Where the animation lives.** Not the iOS launch screen, which cannot animate
by rule. Not the native shell, which only loads when offline. It belongs in the
first route, as an inline, nonce-carrying, CSS-only overlay in the root layout,
the way the landing intro already works, so it does not wait on a JavaScript
chunk.

**The specification already exists** in `docs/TRACK_M_MOTION_PLAN.md` §1a: the
mark turns, the letters arrive from depth, the lockup settles from 0.86 to 1, a
door opens. The infrastructure exists too: `ThresholdStage` is already mounted in
the root layout and `lib/motion/threshold.ts` has `door` and `leave` kinds. It
needs an `open` kind.

**The rules it must obey:** once per cold start, gated on sessionStorage and on
the native shell; tap to skip; 160 ms crossfade under reduced motion; total
budget 1,000 to 1,500 ms and never blocking interaction; the native splash hides
on first paint so the two never fight. The Android 12 system splash should be
configured to match the animation's first frame, so the handoff is invisible.

**One asset blocker:** there is no SVG logo. The mark is a 614 by 587 PNG. A
startup animation that scales and rotates a raster mark will be visibly soft on a
3x screen. A vector mark is a prerequisite, not a nice-to-have.

---

## 12. Visual direction

Full matrix of all 79 images, the recurring patterns, the anti-patterns and the
asset generation prompts are in
`docs/design/VISUAL_NORTH_STAR_2026-10-05.md`. The summary:

**What the mood board actually is.** Not a feature specification. It is a craft
reference, and it is overwhelmingly about **money screens**: wallet balances,
receipts, itemised breakdowns, payment processing states, tier pages, referral
reveals, earnings analytics. The founder's visual instincts and the payments
brief are pointing at the same place, which is a strong signal that this is the
real priority.

**The five patterns worth adopting as primitives:** one large honest figure as
the headline; sliding-pill segmented controls; odometer numerals that recount on
change; itemised receipts with dual confirmation rows; a primary button that
morphs into a check.

**The one piece of copy worth taking almost verbatim** is a payment-processing
screen that says it will never double-charge you, with the steps ticking off as
they complete. That is a trust pattern, not a decoration, and it belongs in
Vallo's checkout.

**What to refuse:** token and staking language, streaks, countdown urgency,
mascots, badge walls, neumorphism, four-hue charts. Several of these appear in
the references. They are wrong here for a specific reason: a Nigerian renter
deciding whether to send real money to a stranger is reading the screen for
signals that this is not a scheme, and gamification reads as a scheme.

**The direction, in one line:** a well-run Nigerian bank app that happens to be
beautiful. Calm surfaces, one honest naira figure, receipts worth screenshotting
as proof, real photographs of real spaces instead of 3D ornament, motion as the
personality, and dark mode earned rather than assumed.

### 12.1 The four decisions the founder locked on 5 October

These are settled and no later session may reopen them.

| # | Decision |
|---|---|
| **D1** | **Theme leads by surface.** Night for landing, startup, auth, home, search, stays, restaurants, detail, Around, profile and the lister dashboards. **Paper** for checkout, pay, receipts, payments, earnings, statements, agreements, the move-in ledger, tenancy, the caution register, the Money desk, the legal pages and every emailed receipt. Both themes keep working everywhere; this sets which one leads, and an explicit member choice always wins. A receipt should read like a document, and the founder's own references split exactly this way without being asked to |
| **D2** | **Icons: matte clay 3D for content objects at 32px and above, line glyphs on flat plates for all chrome below 32px.** Glossy, bevelled, chrome, neon-rimmed and glass 3D are banned, because gloss is the strongest visual marker of betting and crypto products and it costs Vallo the cautious renter it most needs. This resolves the three-way contradiction across `BRAND_MARKS.md`, the two `ICONS_3D_*` documents and `ICON_SYSTEM.md`, all of which are archived by the north star |
| **D3** | **Full redesign, surface by surface, every single page audited, with motion as half the specification.** Layouts, order, hierarchy and position may all change. The capsule bottom dock and the side navigation are both kept and both upgraded. End-to-end specs will break and Session 4 repairs them; that cost is accepted |
| **D4** | **The signature is oversized live figures:** large tabular naira figures leading every screen that has a number, counting up on arrival, re-rolling like an odometer on change, with sliding-pill segmented controls and a primary action that morphs into a tick. Typography stays Poppins display and Inter text, because ADR-006 chose Inter for coverage four locales genuinely need: ₦, Yorùbá `ẹ ọ ṣ`, Igbo `ị ọ ụ`, Hausa `ɓ ɗ ƙ ƴ`, and tone marks over vowels that already carry a dot below |

**What premium means here**, since the founder asked for investor-grade and for
everyone to feel safe at the same time, and those usually pull against each other:

> **Vallo earns premium by being the most honest screen in the room.**

Not ornament. The confidence to show the whole number, name the fee, date the
inspection, tick the steps as they actually complete, and leave air around all of
it. Cheap products hide the total and decorate the edges.

---

## 13. Documentation

60 top-level documents, five overlap clusters, 21 documents linking to deleted
files. The repository's memory is its biggest non-code asset and it is decaying.

**What to do:**

1. **Fix the 21 broken `archive/HANDOFF_*` links.** The company-obligations
   content the docs README calls the only written record is gone. It needs
   reconstructing into a live `docs/COMPANY.md` from the founder's knowledge.
2. **Collapse the five clusters** into one document each: design direction,
   icons, mobile, recommendations, navigation.
3. **Archive the dated sweeps.** Everything from 29 and 30 September whose work
   is done: audit fixes, UI/UX recommendations, the motion, pixel, performance,
   responsive, integration and e2e sweeps, the founder trace, the gap audit.
4. **Correct the known stale statements**, starting with
   `MONEY_ARCHITECTURE.md`'s claim that the custody retirement is pending when it
   has been applied.
5. **Keep `THE_HUNDRED.md` and `RECOMMENDATIONS.md`**, because code comments cite
   their identifiers. Merge `recs/` into `RECOMMENDATIONS.md`.

**The rule going forward:** a document that disagrees with the code is a bug,
fixed in the change that found it. Dated records go straight to `archive/`.

---

## 14. Legal and compliance

Custody retirement reduced CBN exposure substantially. What remains open, and
most of it is founder work rather than engineering:

| Gap | Owner |
|---|---|
| Written legal opinion on provider-custodied balances with Payluk | Founder, blocking Track 2 |
| NDPC registration number and NDPA audit filing; a Data Protection Officer who is not the founder | Founder |
| Cookie consent mechanism | Engineering, after a policy decision |
| Host and agent payout terms page: settlement timing, fees, chargebacks, reversals, withholding | Engineering, needs the commercial answers |
| Dispute resolution policy: SLA, escalation, forum, FCCPC reference | Founder plus engineering |
| KYC/KYB policy document: NIN, BVN, CAC for agents and hosts | Founder plus counsel |
| CBN position on payment facilitator versus commercial agent, given split settlement plus the Guarantee | Counsel |
| LASRERA and Lagos agency licensing statements | Counsel |
| Real sanctions list loaded; every screening currently records `no_list` | Founder |
| SEC VASP opinion before crypto may be switched on | Counsel |
| Legal pages in four locales; 57 untranslated sentences per locale | Engineering plus native reviewers |
| Cancellation page carries no date | Engineering |

---

## 15. Priorities: NOW, NEXT, LATER, VISION

### NOW: the next two weeks

| # | Item | Owner |
|---|---|---|
| 1 | Deadline on `/open`, matching `/home-or-landing` | Session 2 |
| 2 | Wire cold-start sign-up to return to `/welcome`; use interests on `/home` | Session 3 |
| 3 | Seed `blocked_terms` | Session 2 |
| 4 | Concierge listing tool and a forward path out of `MORE_INFO_REQUIRED` | Session 2 |
| 5 | One test-mode payment proven end to end on a real device through the WebView | Session 4 |
| 6 | `PaymentProvider` interface; Paystack behind it, unchanged in behaviour | Session 2 |
| 7 | Startup animation, after item 1, with a vector mark | Session 3 |
| 8 | Foundations: container tiers, figure and odometer, segmented pill, button morph (before any surface work) | Session 3 |
| 9 | Legal opinion requested in writing | Founder |
| 10 | 20 real listings | Founder, with item 4 |

### NEXT: weeks three to six

Payluk as a second rail behind the interface. Referral rewards as booking
credit. vNIN aggregator chosen and integrated. Host analytics. One first-party
event table. Android signing workflow and an internal-testing release. Receipts
and checkout rebuilt to the reference standard. The earned badge moment. Doc
consolidation. Payout terms and dispute policy pages.

### LATER

Entitlement infrastructure exercised at zero. Buy and sell surfaced, or
deliberately parked. Listing video with a server-enforced cap. PostGIS viewport
queries once pins are mandatory. Space analytics for listings. Native biometric
unlock. Offline catalogue. Push proven to a real device. Locale review by native
speakers.

### VISION

Track 2 custody, if and only if the letter permits it. A space-side passport
with inspection history. The intelligence layer: pricing guidance from real
paid tenancies, which `price_check_events` is already shaped for. The ecosystem
layer: partner services around a booking.

---

## 16. Risk register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Building custody before the legal opinion | High if the brief is followed literally | Existential: a regulator can stop the payment rail | Track 1 only. Section 4 |
| No supply at launch | Certain today | Fatal to retention; every surface is empty | R1. Concierge tooling plus founder recruitment |
| First real payment fails in the WebView | Medium | Nobody can pay on the app | Prove it in test mode on a device before anything else |
| Referral cash farmed with no supply | High if cash ships early | Direct financial loss | Booking credit, qualification on first paid booking |
| Empty `blocked_terms` at store review | Medium | Apple 1.2 or Google UGC rejection | Seed before submission |
| "Verified" resting on a stub | Certain today | Trust claim unsupported; reputational if challenged | Choose an aggregator; until then say what was actually checked |
| Vallo becomes arbiter of every money dispute under Payluk | High if Track 2 ships | Consumer-protection and regulatory exposure; staff burden | Dispute policy published, two-person rulings, counsel's view, before Track 2 |
| A funded Payluk escrow cannot be refunded outside a dispute | Unknown, unverified | Every guest cancellation becomes a ruling | Ask Payluk before building. Open question 3 |
| Payluk section 3 was reconstructed from unverifiable sources | Certain | Code written against wrong field names | Session 2 reads the live docs first and corrects the file |
| Full redesign breaks the e2e suite | Certain, accepted | Temporary loss of regression cover | Session 4 repairs with role-based selectors |
| Rebuild instinct destroys audited work | Medium | Months lost, compliance regressions | This document. KEEP list in section 5 |
| Supabase on Free with a money ledger and no restorable backups | Certain | Unrecoverable data loss | Pro plus point-in-time recovery before the first real payment |
| Infrastructure in personal accounts | Certain | Access and continuity risk | Move to company-owned accounts with two owners and 2FA |
| Nobody is paged when production breaks | Certain | Silent outages | Sentry project, ops alert webhook |
| Android 12 splash shows the launcher icon | Likely | Cheap-feeling first impression | Configure the system splash; test on a device |
| Docs decay into contradiction | In progress | Future sessions act on stale truth | Section 13 |

---

## 17. Dependency map

```
Legal opinion ──────────────► Track 2 custody ───► cash referral withdrawal
                                               └─► provider-held balances

Payluk credentials ─► PaymentProvider interface ─► Payluk as second rail
                                   │
                   Paystack behind the interface (no behaviour change)

PAYSTACK_GUARANTEE_SUBACCOUNT ─► any payment at all ─► first real booking
                                                    └─► referral qualification

Concierge listing tool ─► real listings ─► every discovery surface
                                        └─► analytics with real data
                                        └─► referral rewards that can qualify

/open deadline ─► startup animation (never before)
Vector logo mark ─► startup animation

vNIN aggregator ─► real verification ─► the verified badge meaning what it says
Sanctions list ─► screenings that can read 'clear'

Keystore + Firebase key + assetlinks SHA-256 ─► Android release ─► Play listing
APNs key ─► push on iOS ─► notification-driven retention

Icon decision ─► any icon work in Session 3
Sentry project ─► knowing when production breaks
Supabase Pro ─► restorable backups ─► permission to take real money
```

**Read the first and last lines together.** The two things that gate the most
downstream work are a legal letter and a $25 Play enrolment, and neither is
engineering.

---

## 18. Kill and defer list

**Kill:**

- Any plan to rebuild existing, audited surfaces. 200 pages work.
- A Vallo-held wallet or Vallo-held escrow, in any form, ever. Only
  provider-custodied, only with the letter.
- cNGN or any generic crypto balance inside Vallo.
- Paid placement, boosts, featured listings, purchasable trust.
- Streaks, countdown urgency, confetti and mascots.
- Virtual accounts. The founder has deprecated the approach and there is no code
  to remove, only five documents to correct.
- A second passport system beside `renter_passports`.
- A third-party analytics SDK before the privacy policy and store answers cover
  it.

**Defer:**

- Buy and sell UI, until rent and stay carry real transactions.
- Listing video.
- Native biometric unlock and offline catalogue.
- Locale review by native speakers, until copy stops moving.
- Entitlement enforcement, though the infrastructure can be built at zero.
- Everything in Track 2.

---

## 19. The four-session operating model

| Session | Owns | Must not touch |
|---|---|---|
| **1 (this one)** | Audit, architecture, priorities, handoffs, decisions | Implementation |
| **2 Backend, money, trust** | Database, migrations, server actions, payments, Payluk Track 1, identity, compliance, supply tooling | Visual design, component styling |
| **3 Frontend, experience** | Startup, onboarding, checkout and receipts, wallet and referral UI, analytics screens, design system, icons, motion | Migrations, money logic, RLS |
| **4 QA, release, store** | Test matrices, device testing, e2e, Android signing, store submission, legal and docs pages | Feature work |

**Rules for every session:**

1. Maximum four agents each, with explicit file ownership declared before work
   starts. Two agents must never hold the same file.
2. Every session writes its response document in `docs/sessions/` before
   finishing.
3. The KEEP list in section 5 is binding. Anything it names is extended, not
   replaced, unless a session writes down why and waits for an answer.
4. No session may switch on a feature flag that is off, apply a pending
   migration, or rotate a credential.
5. A session that finds a document disagreeing with the code fixes the document
   in the same change.
6. Money, identity and compliance changes ship with a test that reads the live
   policy shape, because five of the nine incidents in this repository's history
   would recur today with every test green.

---

## 20. What only the founder can do

In lead-time order. Items 1 and 2 gate the most downstream work.

1. **Request the legal opinion** on provider-custodied balances with Payluk as
   custodian. Everything in Track 2 waits on it.
2. **Pay the $25 and enrol Google Play** as the organisation. Then the keystore,
   Play App Signing, the real `assetlinks.json` SHA-256 values and the Firebase
   key.
3. **Recruit 20 real listers.** Engineering can halve the work with the
   concierge tool; it cannot do this part.
4. **Finish moving Paystack to the company account, as an organisation** (in
   progress, 6 October), **then** create the Guarantee reserve subaccount on it
   against the reserve's own bank account and set `PAYSTACK_GUARANTEE_SUBACCOUNT`
   to its `ACCT_` code in Vercel, Production scope, and register the live
   webhook. In that order: a subaccount belongs to one Paystack account, so one
   made on the personal account dies with the migration. The migration is free
   today because no lister has a payout account and no naira has moved, and it
   stops being free the moment either changes. The code is built and proved on
   the sandbox account either way (D38), so this is a paste and a redeploy, not
   engineering work.
5. **Upgrade Supabase to Pro** with point-in-time recovery, before the first real
   payment. A money ledger with no restorable backup is the finding to lose sleep
   over.
6. **Move Supabase and Vercel into company-owned accounts** with two owners and
   two-factor authentication.
7. **Create a Sentry project** and set `OPS_ALERT_WEBHOOK_URL`, so production
   failures reach a person.
8. **Choose the identity aggregator** and obtain its credentials, plus
   `VALLO_NIMC_MERCHANT_CODE` and `VALLO_NIN_HMAC_KEY`.
9. **Obtain the NDPC registration number** and name a Data Protection Officer who
   is not the founder.
10. **Provide a real sanctions list**, so screenings can read `clear`.
11. **The APNs key**, for push on iOS.
12. **Email**: MX and DMARC on `vallospaces.com`, then `EMAIL_REPLY_TO` and
    `NEXT_PUBLIC_SUPPORT_EMAIL`.
13. **Decide the referral economics** in section 6.
14. **Answer the Payluk cancellation question** in `VALLO_PAYMENTS_ARCHITECTURE.md`
    section 7 question 3, by email to Payluk. It may disqualify Payluk for
    bookings and it is the cheapest decisive fact available.
15. **Rotate the Firebase service account key** pasted into a session on 23
    September.

---

## 21. Closing

The instruction was to audit first, challenge second, architect third,
prioritise fourth, then hand off. The honest finding is that this platform does
not need a generational rebuild. It needs inventory, one legal letter, three
integrations finished, and the craft on its money screens raised to the standard
of its own engineering.

The single most valuable sentence in this document: **Vallo is a very well-built
shop with nothing on the shelves.** Everything in section 15's NOW list is
chosen to change that.
