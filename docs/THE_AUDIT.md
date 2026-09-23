# THE AUDIT

Vallo: VALLO SPACES LTD, RC 9870413. Audited 23 September 2026 against `origin/main` at `85c5471` and the live platform at www.vallospaces.com, including the live Supabase project `uccixoonmbhrnyczyigt`.

Ten audit areas each ran twice. In pass one an agent audited its own area. In pass two a different agent re-audited those findings adversarially: it tried to kill each finding, reproduced it independently, and searched the same ground for what pass one had missed. Two more agents cleaned the repository. Every finding below carries its address, its evidence, its fix and its pass-two verdict. How it was run, and what it left behind, is in section 9.

---

## 1. SUMMARY (THREE MINUTES)

**The count.**
- **Active findings:** 219, all with evidence and a fix, and all re-audited in pass two.
  - 11 CRITICAL
  - 52 HIGH
  - 83 MEDIUM
  - 73 LOW
- **Merged:** 21 more were merged into another finding as duplicates.
- **Withdrawn outright as wrong:** none. One measurement, DB-13's 41 ms planning time, was withdrawn because it did not reproduce.
- **Changed in pass two:** 39 active findings had their severity changed, in both directions, and 65 had their fix amended. Several pass-one fixes were proven in pass two to break something the first agent never looked at.
  - The most important of these: the shared fix for self-publishing would have stopped every admin decision (SEC-P2-03).
  - The proposed fix for the listing blockage recursed forever (42P17).

**Correctly empty, not broken.** All 64 listings and all 5 stays are examples, and there have never been any bookings, reservations or escrows. Most money findings are therefore **latent**: they cannot hurt anyone today and will hurt the first real customer. Each finding says which it is. The empty screens are judged one by one in each area's "CORRECTLY EMPTY vs BROKEN" table. Most are correctly empty. The broken ones are listed as findings.

**The three worst things.**
1. **The trust marks can be forged, and one of them is exploitable right now (DB-01, DB-02).**
   - **Businesses (DB-01):** any signed-in member can publish a business that shows as *verified* to the public.
   - **Listings (DB-02):** any approved lister can stamp their own listing "physically inspected", "address verified" and "featured", skipping review.
   - **Why it is the worst:** Vallo's whole promise is that its marks mean something, and today they are self-service.
2. **Guests set their own prices, and admins can mint money (ESC-02, ESC-01, ESC-P2-01).**
   - **Guest prices:** checkout charges whatever total sits on the booking row, and the guest writes that row. A 3-night ₦765,000 stay was confirmed for 3 kobo in a rolled-back probe.
   - **Minted money:** an admin ruling on a dispute over an escrow that was never funded credits the full amount from nothing.
   - **Rewritten bookings:** any admin can rewrite any booking's price or status over the API, with no audit row.
   - **Exposure today:** none, because there are no real listings. On the day the first real listing publishes, both are live.
3. **No agent or owner can create a listing, and has not been able to since 22 September 23:05 UTC (DB-03).**
   - **How it fails:** the first draft save asks for the new row back. The listings policy checks ownership by looking the row up by its own id, and it cannot see a row that does not exist yet.
   - **What the person sees:** "We could not save this listing just now."
   - **Why nobody noticed:** it is the third total supply blockage, invisible for the same reason as the first two. There are no real agents to hit it, and every read looks correct.

**What I could not check.** These are covered in full in section 8.
- **Devices:** no native build and no device run.
  - Everything said about the iOS and Android shells comes from reading source.
  - The microphone crash (STORE-P2-03) and the offline screen (STORE-01) are unproven on hardware.
- **Payments:** no real payment. Paystack's hosted pages were not driven.
- **Vercel:** its connection returned 404 for the Vallo project. **Confirmed after the audit (founder's read of Vercel, 23 September):** `EMAIL_REPLY_TO`, `SENTRY_DSN` and `NEXT_PUBLIC_SUPPORT_EMAIL` are **NOT SET**. `ANTHROPIC_API_KEY` is set (production and preview). `FCM_*` is set on production only, so preview correctly reports Android push unconfigured (environment, not a defect). VAPID, `RESEND_API_KEY`, both Paystack keys, `CRON_SECRET` and `RECONCILE_CRON_SECRET` are set.
- **Permission blocks:** two probes were refused by this session's permission policy.
  - A signed-out API read of the member directory (UX-24). Its exposure is proven from the catalogue but not over the wire.
  - Some signed-in PostgREST writes. Their conclusions rest on rolled-back SQL probes run as the `authenticated` role instead.
- **Real sign-up:** no real sign-up and OTP flow. No new accounts were created.
- **Backups:** no restore test. The plan is Free, so there is nothing to restore (OPS-07).

**THE SINGLE THING I WOULD FIX FIRST.** Revoke anonymous read of `occupation_code`, `lga_code`, `state_code` and `home_area_id` on `public.social_profiles` (UX-24), after checking that no anonymous `select('*')` depends on them. It is ten minutes of work. It is the only finding where real people's personal data is, on the evidence, readable by anyone on the internet today. The very next thing, the same hour, is the guard trigger on `businesses` and `listings` (DB-01, DB-02). That is the only other hole a stranger can use today.

## 2. DANGER NOW: READ THIS FIRST

The brief allowed one exception to "fix nothing": something actively dangerous right now, where money is leaking or data is publicly exposed. Two findings meet that bar. **Neither has been fixed.**

I prepared the fix for the first as a guarded trigger on `public.businesses`. When I started to apply it to the live database, this session's permission controls refused. I did not try another route. Both fixes are written out below. **Apply them first, before anything else in this document.**

1. **DB-01: any signed-in member can publish a "verified" business that the public sees.**
   - **The hole:** `businesses_owner_all` lets an owner write every column, including `status` and `verification_tier`. `derive_business_badge` then turns whatever tier the client sent into `verified = true`.
   - **What an attacker gets:** a free account gives a restaurant, hotel or shortlet page that is PUBLISHED and verified at tier 3, visible to signed-out visitors, and taking table reservations. It also gives its owner a public "checked person" badge.
   - **Proof:** three independent agents proved this. Two used rolled-back probes with controls. One did it live and then deleted the row, which broke the audit's own rule; see section 9.
   - **Fix:** see DB-01 in section 5, as amended in pass two. It is a BEFORE INSERT/UPDATE trigger, not a column-grant revoke. Admins write through their own signed-in client, so a grant revoke would stop every admin decision; SEC-P2-03 proved this.
2. **UX-24: the member directory is very probably readable by anyone on the internet.**
   - **The hole:**
     - The table: `anon` holds SELECT on `public.social_profiles`, including `display_label`, `occupation_code`, `lga_code`, `state_code` and `home_area_id`.
     - The policy: the read policy is `TO public USING (NOT private.blocked_with(user_id))`, and `anon` holds EXECUTE on that function.
     - The rows: seven of the ten rows are real members, not QA accounts.
   - **What leaks:** their names, occupations and home local government areas. The publishable key that unlocks this ships in every page. Sign-up told these people their local government was only used to choose their home screen.
   - **How far it is proven:** fully from the catalogue. The final over-the-wire read was not run: this session's permission policy blocked it for the agent that tried, so I did not repeat it.
   - **Fix:**
     1. Check `apps/web/src` for any anonymous `select('*')` on `social_profiles`. Column revokes fail the whole select otherwise, exactly like `listings`.
     2. Then run `revoke select (occupation_code, lga_code, state_code, home_area_id) on public.social_profiles from anon;`.
     3. Then add a privacy control and a notice at sign-up.

Two more are **not dangerous today but arm themselves on a known day**. They must be fixed before the first real stay listing and before the Paystack upgrade:
- **ESC-02:** a guest writes the price of their own booking, and checkout charges it. This was proven four separate times: three nights listed at ₦255,000 each were confirmed at 3 kobo.
- **ESC-01:** an admin ruling on a dispute over a never-funded proposal mints money. This was proven: ₦5,000,000 was created from nothing and the escrow float went negative.

## 3. ARE WE READY FOR THE STORES?

**No.**

On today's tree, a submission to Apple would almost certainly come back rejected under at least one of:
- **4.8:** Google sign-in without Apple.
- **4.2:** too little native capability.
- **5.1.1(v) and 2.1:** no browsable content without an account, no reviewer account, and a catalogue made only of examples.

Google Play would stop at the Financial Services declaration and the organisation-account requirement before content review even began.

**What is sound.** None of this is a rewrite.
- Target API 36, and the declared permissions.
- In-app deletion with a public `/delete-account` page.
- Report, block and 24-hour terms.
- No digital goods, so no in-app purchase problem.
- No tracking SDK, so no ATT prompt.
- Export compliance.
- The legal pages are reachable signed out.

The list below is ordered by what blocks what. Each item names its finding.

### What stands between here and submission, in order

**A. Before anything else. These are safety, not store items, but a reviewer or a first user can hit every one.**
1. Close the live holes:
   - UX-24: the member directory readable by anyone.
   - DB-01 and DB-02: self-published and self-verified businesses and listings. Use the trigger fix, not the grant fix.
2. Make supply possible again: DB-03, the listing insert with RETURNING. Also fix SUP-P2-01, the `firm_members` recursion.
3. Stop guest-priced bookings and the unfunded-dispute mint before the first real stay publishes: ESC-02, ESC-01 and ESC-P2-01.
4. Fix the build pipeline so that what gets tested is what ships:
   - DOC-01: repair the lockfile (`@capacitor/push-notifications`) and restore GitHub billing. Then protect `main`.
   - DOC-02: move Next.js to 16.3.3 or later, and `sharp` to 0.35.4 or later.

**B. Company and accounts. Only the founder can do these, and they have the longest lead times. Start them today, in parallel with A.**
5. D-U-N-S number for VALLO SPACES LTD (1 to 2 weeks), then:
   - Apple Developer Program as an Organisation (99 USD a year).
   - Google Play Console as an Organisation (25 USD).
   - STORE-09.
6. A written legal position on holding wallet funds and on wallet-to-wallet transfers under the CBN rules. It decides the Play Financial Services declaration and whether Send, Request and pots ship in v1 (STORE-09).
7. Move the Supabase project and the Vercel team under company-owned accounts (OPS-P2-02). Upgrade Supabase from Free to Pro so there are backups and point-in-time recovery (OPS-07, OPS-P2-01).
8. APNs key, Sign in with Apple Services ID, signing and provisioning, a Play upload keystore, and the Firebase Android key (STORE-15). NDPC registration number (`company.ts:76` is null).

**C. The store rejections themselves.**
9. Sign in with Apple, or hide Google sign-in on iOS for v1. Either way it must be enforced server-side, not only hidden (STORE-02).
10. Let signed-out visitors browse the catalogue, with `/u` still gated and the private address still hidden. Open the app on `/welcome` or the catalogue, not the marketing page (STORE-P2-04, STORE-04).
11. Build the native argument for 4.2 so it is visible in the first 30 seconds (STORE-04):
    - push, actually registered;
    - the native share sheet;
    - haptics;
    - camera capture;
    - an offline screen that is ours.
12. Fix the offline and error screen. It currently shows a developer message, and its retry reloads itself (STORE-01).
13. Remove the App Store and Google Play badges from inside the app (STORE-06).
14. Add the microphone usage string, and correct the camera string that says the app never records video (STORE-P2-03).
15. Disclose Anthropic processing and ask consent before the assistant runs, enforced server-side. Give support a path that uses no AI (STORE-07).
16. Rewrite the privacy policy to describe what the code does. Then fill the Apple privacy label and the Play Data safety form from the derived table in the A08 section, not from memory (STORE-08, SEC-13).
17. Apply the content filter to every surface users write to, and add report controls to reviews and businesses (SEC-05, STORE-P2-01). Add the discriminatory-listing detector (SEC-06).
18. Remove or honestly label every "verified" claim until verification is real (UI-03, STORE-05). Label example stays and restaurants as examples one tap deeper, where they are booked (UX-09, UI-P2-01). Remove the placebo controls: "Download my data" (UX-P2-01) and "Biometric app lock" (UX-P2-02).
19. Put 10 to 20 real listings live before submission (STORE-11). Seed and test the reviewer account (STORE-10). Ship iPhone only for v1 (STORE-13).
20. Store assets: screenshots, feature graphic, description, keywords, a support mailbox, and a full-bleed icon master (STORE-18, STORE-20).

**D. Before the first real naira moves.** These are not store blockers, but they are this audit's money findings:
- MON-01, 02 and 03 must be fixed before payouts are enabled.
- MON-05, MON-P2-02, OPS-02 and OPS-03 must be fixed before the first real booking.
- DOC-03 means the database gets automated tests before the first real escrow.

A realistic estimate: **A** takes 3 to 5 working days. **C** is 2 to 3 weeks of engineering. **B** gates the calendar: about 2 weeks for D-U-N-S and organisation enrolment, and an unknown time for the legal position.

## 4. HOW TO READ A FINDING

Every finding has this shape:

```
ID | AREA | SEVERITY | TITLE
WHAT IS WRONG · WHERE · EVIDENCE · WHY IT MATTERS · THE FIX · EFFORT · PASS TWO
```

**Severity**, as it stands after pass two:
- **CRITICAL:** money can be lost, data exposed, or a store will refuse us.
- **HIGH:** a user hits it and the product is broken for them.
- **MEDIUM:** wrong but survivable.
- **LOW:** craft.

Where a finding is latent, for example harmless until the first real booking or until payouts open, it says so in WHY IT MATTERS.

**PASS TWO** is the verdict of the agent that re-audited that area. It is one of:
- CONFIRMED;
- CONFIRMED with the fix amended;
- SEVERITY CHANGED;
- MERGED INTO another finding, as a duplicate;
- WITHDRAWN;
- NEW IN PASS TWO, for a finding the reviewer added.

Each area in section 6 also carries its own lists, in this order:
- DANGER NOW;
- CHECKED AND FOUND SOUND, which records what was verified to work;
- CORRECTLY EMPTY vs BROKEN;
- NOT COVERED;
- FOR THE FOUNDER;
- cleanup notes.

## 5. EVERY FINDING AT A GLANCE
Counts exclude findings marked MERGED or WITHDRAWN (they are counted under their canonical ID). DB-13 (partially withdrawn: one claim withdrawn, the duplicate-index part stands) is counted as active.

| Severity | Count |
|---|---|
| CRITICAL | 11 |
| HIGH | 52 |
| MEDIUM | 83 |
| LOW | 73 |
| **Total active** | **219** |

Merged or withdrawn (not counted): 21. All findings listed below: 240.

**Per area (active findings):**

| Area | Where | CRITICAL | HIGH | MEDIUM | LOW | Active total | Merged/withdrawn |
|---|---|---|---|---|---|---|---|
| A01 Money | section 6 | 0 | 7 | 9 | 7 | 23 | 0 |
| A02 Escrow | section 6 | 2 | 5 | 7 | 6 | 20 | 1 |
| A03 Schema | section 6 | 3 | 3 | 9 | 7 | 22 | 1 |
| A04 Security | section 6 | 0 | 4 | 12 | 4 | 20 | 2 |
| A05 UX | section 6 | 1 | 6 | 11 | 9 | 27 | 4 |
| A06 Interface | section 6 | 0 | 3 | 5 | 12 | 20 | 3 |
| A07 Supply | section 6 | 0 | 6 | 7 | 3 | 16 | 4 |
| A08 Stores | section 6 | 4 | 10 | 4 | 6 | 24 | 2 |
| A09 Ops | section 6 | 1 | 6 | 6 | 7 | 20 | 3 |
| A10 Truth | section 6 | 0 | 2 | 13 | 12 | 27 | 1 |

### All findings, by severity then ID
| ID | Area | Final severity | Title | Pass-two verdict |
|---|---|---|---|---|
| DB-01 | A03 Schema | CRITICAL | Any member can create a PUBLISHED, verified (tier 3) business that anon sees, and take reservations for it | CONFIRMED (danger now), fix amended to trigger; absorbs SEC-01 (businesses) + SUP-02 |
| DB-02 | A03 Schema | CRITICAL | A lister can publish, feature and self-stamp "inspected / address verified / mandate verified" on their own listing | CONFIRMED (latent, not danger now), fix amended to trigger; absorbs SEC-01 (listings) + SUP-02 |
| DB-03 | A03 Schema | CRITICAL | Creating a listing fails for every agent: `new row violates row-level security policy` | CONFIRMED; severity HIGH→CRITICAL via merge of SUP-01; fix amended (definer helpers, 42P17) |
| ~~DB-P2-01~~ | A03 Schema | CRITICAL | A guest writes the price of their own booking, and wallet checkout charges that price and confirms the stay | MERGED INTO ESC-02 |
| ESC-01 | A02 Escrow | CRITICAL | A dispute on a never-funded proposal, once ruled on, credits the full amount from nothing | CONFIRMED by execution, fix amended |
| ESC-02 | A02 Escrow | CRITICAL | A guest writes their own nightly price into `bookings`, and payment charges that price | CONFIRMED by execution, fix amended; absorbs SUP-03, DB-P2-01, SEC-P2-01 |
| OPS-07 | A09 Ops | CRITICAL | Backups have never been restored and the Supabase plan is unverified. There is no restore runbook. | SEVERITY CHANGED HIGH→CRITICAL (Free plan), fix amended |
| ~~SEC-01~~ | A04 Security | CRITICAL | Owners can write their own review, verification, publish and fee columns (businesses live-proved; accommodations and listings by schema) | MERGED INTO DB-01 (businesses) and DB-02 (listings) |
| ~~SEC-P2-01~~ | A04 Security | CRITICAL | Guest-authored booking rows carry their own price, and checkout charges the stored price | MERGED INTO ESC-02 |
| STORE-02 | A08 Stores | CRITICAL | Google sign-in is offered and Sign in with Apple is not | CONFIRMED, fix amended |
| STORE-04 | A08 Stores | CRITICAL | The native case is thin, push is not in the native projects, and the app opens on a marketing website | CONFIRMED, fix amended |
| STORE-07 | A08 Stores | CRITICAL | User messages go to Anthropic with no disclosure and no consent, and the privacy policy is silent about it | CONFIRMED, fix amended |
| STORE-09 | A08 Stores | CRITICAL | A custodial naira wallet with wallet-to-wallet transfer: an organisation account is required and the licensing position is open | CONFIRMED, evidence and fix amended |
| ~~STORE-P2-05~~ | A08 Stores | CRITICAL | The "verified" and "inspected" marks the store listing and the app rely on can be self-granted | MERGED INTO DB-01 / DB-02 (cross-reference) |
| ~~SUP-01~~ | A07 Supply | CRITICAL | THE THIRD BLOCKAGE: every first draft save fails 42501 because the listings policy looks the new row up by id | MERGED INTO DB-03 |
| ~~SUP-02~~ | A07 Supply | CRITICAL | Listers and hosts can change moderator-owned columns on their own rows | MERGED INTO DB-01 and DB-02 |
| ~~SUP-03~~ | A07 Supply | CRITICAL | Checkout charges whatever total is stored on a bookings row, and guests can insert bookings rows directly | MERGED INTO ESC-02 |
| UX-24 | A05 UX | CRITICAL | The people directory shows every new member's occupation and local government; sign-up said the LGA was for your home screen | CONFIRMED; SEVERITY HIGH→CRITICAL (orchestrator catalogue evidence); fix amended |
| DB-05 | A03 Schema | HIGH | A client can insert a bank account with a forged `resolved_account_name` and `recipient_code`, and the withdrawal path trusts both | CONFIRMED, fix amended |
| DB-06 | A03 Schema | HIGH | RLS is the only gate on ~100 tables: anon and authenticated hold table-wide INSERT/UPDATE/DELETE on ledgers, wallets, roles and badges | CONFIRMED (counts moved), fix amended |
| DB-10 | A03 Schema | HIGH | Any signed-in account reads every published listing's street address, landmark and review notes, and every firm's CAC, TIN and representative phone | CONFIRMED (latent) |
| DOC-01 | A10 Truth | HIGH | CI has given no verdict since 09:57Z. It is red on the lockfile, then dead on billing, and `main` has no protection | CONFIRMED; absorbs OPS-P2-05; fix addition |
| DOC-03 | A10 Truth | HIGH | No automated test reaches the database. Escrow, the ledger, refunds and every RLS policy have zero regression coverage, and the "check" that answered the 11-hour outage is run by hand | CONFIRMED; absorbs DOC-04 |
| ~~DOC-04~~ | A10 Truth | HIGH | Would the current suite catch a regression of the named incidents? In five of nine cases, no | MERGED INTO DOC-03 |
| ESC-03 | A02 Escrow | HIGH | Any member can squat a host's whole calendar for free, renewable every 48 hours | CONFIRMED, fix amended |
| ESC-04 | A02 Escrow | HIGH | A host can mark a paid stay NO_SHOW from 00:00 WAT on check-in day, which frees the nights for resale | CONFIRMED by execution, fix amended |
| ESC-06 | A02 Escrow | HIGH | The account purge never rechecks held money, so an escrow can auto-release into a tombstoned account | CONFIRMED, fix amended |
| ESC-07 | A02 Escrow | HIGH | One admin, on a password alone, can rule on a dispute they are party to, and the ruling cannot be reversed | CONFIRMED |
| ESC-08 | A02 Escrow | HIGH | The escrow gate lives in one writable table row that any admin can create over the wire, with no database audit | CONFIRMED by execution |
| MON-01 | A01 Money | HIGH | A withdrawal that times out is marked FAILED and refunded even if Paystack paid it | CONFIRMED, fix amended |
| MON-02 | A01 Money | HIGH | The admin "sweep stuck holds" button releases in-flight payouts without asking Paystack | CONFIRMED |
| MON-03 | A01 Money | HIGH | A reversal that arrives after a success never credits the member back | CONFIRMED, fix amended |
| MON-04 | A01 Money | HIGH | Money can enter the wallet and cannot leave it, while the Terms promise it can | CONFIRMED |
| MON-05 | A01 Money | HIGH | A stay (or a rent charge) can be paid twice, and a late card payment on a cancelled booking is kept silently | CONFIRMED, fix amended; absorbs OPS-01 |
| MON-09 | A01 Money | HIGH | Deleting an account ignores money in pots, so that money is stranded on a tombstone | CONFIRMED, fix amended |
| MON-P2-02 | A01 Money | HIGH | A paid stay cannot be refunded once it is CANCELLED, NO_SHOW or COMPLETED, and refunds cannot be partial without cancelling | NEW |
| ~~OPS-01~~ | A09 Ops | HIGH | A booking can be paid twice. The second charge is recorded as a success, with no refund, no alert and no guard. | MERGED INTO MON-05 (severity CRITICAL→HIGH) |
| OPS-02 | A09 Ops | HIGH | A payment that lands after the booking left PENDING is recorded as "host accepted". A lost webhook plus a lost callback means the guest's money is held while the hold is released. | CONFIRMED, fix amended (part (b) is the new core) |
| OPS-03 | A09 Ops | HIGH | Nothing pages a human. A total payment outage today would be noticed only by someone opening /admin/alerts, or by a customer. | CONFIRMED, fix amended |
| OPS-04 | A09 Ops | HIGH | Catalogue reads turn every database error into "0 properties" or "listing not found". An outage looks exactly like an empty marketplace and logs nothing. | CONFIRMED |
| OPS-05 | A09 Ops | HIGH | If Supabase Auth is slow or down, every signed-in user is logged out and every navigation hangs. | CONFIRMED, fix amended (strengthened) |
| OPS-06 | A09 Ops | HIGH | vallospaces.com has no DMARC record and no MX. Mail is DKIM-signed, but replies to the From address go nowhere. | CONFIRMED |
| OPS-P2-01 | A09 Ops | HIGH | Production runs on Supabase's Free tier: tiny compute, 60 connections, and quotas that real supply will exceed | NEW |
| ~~OPS-P2-05~~ | A09 Ops | HIGH | Nothing stands between a push to `main` and production: CI cannot run, `main` is unprotected, and the live dependency tree differs from the one tested | MERGED INTO DOC-01 (cross-reference) |
| SEC-02 | A04 Security | HIGH | Admins' personal inbox lists every user's private conversations; "Mark all read" marks other people's messages read | CONFIRMED, fix amended |
| SEC-04 | A04 Security | HIGH | Host and stay photos keep EXIF/GPS and are public; no server-side metadata stripping anywhere | CONFIRMED; absorbs SUP-07; fix amended |
| SEC-05 | A04 Security | HIGH | The seeded blocked-terms list is applied only to social posts and bios; not to listings, messages, reviews, stories, comments, events or display names | SEVERITY: pass two lowered to MEDIUM; orchestrator restored HIGH (see STORE-P2-01) |
| SEC-P2-03 | A04 Security | HIGH | The shared remedy for SEC-01, DB-01, DB-02 and SUP-02 (column-grant revoke) would stop every admin decision | NEW (addressed in DB-01/DB-02 amended fixes) |
| STORE-01 | A08 Stores | HIGH | The airplane-mode screen tells the reviewer "This build has no server", and its retry button reloads itself | SEVERITY CHANGED CRITICAL→HIGH, fix amended |
| STORE-03 | A08 Stores | HIGH | "Continue with Google" cannot complete in either native app; universal links and App Links are placeholders | CONFIRMED, fix amended |
| STORE-05 | A08 Stores | HIGH | The public landing page (the shell's first screen) shows example listings with no "Example" label, under a "Verified homes" headline | CONFIRMED; absorbs STORE-21 |
| STORE-06 | A08 Stores | HIGH | The iOS app shows a "GET IT ON Google Play" badge (and "Download on the App Store") | CONFIRMED |
| STORE-08 | A08 Stores | HIGH | The policy does not describe what the code does, so the nutrition label and the Data safety form cannot be answered truthfully | CONFIRMED, fix amended |
| STORE-10 | A08 Stores | HIGH | No reviewer account exists; the whole product is behind sign-in | CONFIRMED |
| STORE-11 | A08 Stores | HIGH | All 64 listings and all 5 stays are examples: a marketplace with no supply reads as "placeholder content" | CONFIRMED |
| STORE-P2-01 | A08 Stores | HIGH | The objectionable-content filter covers posts and bios only; public comments, stories, reviews, events and DMs are unfiltered, and reviews and businesses cannot be reported | NEW (overlaps SEC-05) |
| STORE-P2-03 | A08 Stores | HIGH | The listing-video upload offers "Take Video" on iOS, but the app has no microphone usage string and its camera string promises it never records video | NEW (unverified on device) |
| STORE-P2-04 | A08 Stores | HIGH | Every catalogue screen requires an account: a signed-out reviewer cannot browse a single listing, stay or restaurant | NEW |
| SUP-05 | A07 Supply | HIGH | "Needs more information" is a dead end, and the founder's own application is stuck there | CONFIRMED, fix amended |
| SUP-06 | A07 Supply | HIGH | Real listings are never given coordinates, so they never appear on the map | CONFIRMED, fix amended |
| ~~SUP-07~~ | A07 Supply | HIGH | Host property photos go raw (with GPS) into a PUBLIC bucket | MERGED INTO SEC-04 |
| SUP-08 | A07 Supply | HIGH | Hotel and shortlet rooms cannot be booked at all | CONFIRMED |
| SUP-09 | A07 Supply | HIGH | The same rental can be charged in full to several tenants | CONFIRMED, fix amended |
| SUP-P2-01 | A07 Supply | HIGH | `firm_members` SELECT policy recurses: every non-definer read fails with 42P17, including the admin supply desk's firm roster | NEW |
| SUP-P2-02 | A07 Supply | HIGH | Any user can hold every night of any nightly listing for a year at ₦0, locking out real guests; repeatable after the 48-hour sweep | NEW (overlaps ESC-03) |
| UI-03 | A06 Interface | HIGH | "Verified" is promised on first screens while every live listing is an unverified example | CONFIRMED, partly merged into STORE-05, fix amended |
| ~~UI-07~~ | A06 Interface | HIGH | App Store and Google Play badges on the landing page link to sign-up and render inside the native app | MERGED INTO STORE-06 (CRITICAL→HIGH) |
| UI-08 | A06 Interface | HIGH | Around feed reading text is 8.5–9.2px and ignores the app's own Text size setting | CONFIRMED, fix amended |
| UI-P2-01 | A06 Interface | HIGH | Example hotels and restaurants carry no example disclosure and offer booking controls; A06 recorded the opposite as sound | NEW (overlaps UX-09) |
| ~~UX-01~~ | A05 UX | HIGH | A stranger can open nothing: every landing CTA ends at a carousel and then a sign-in wall | MERGED INTO STORE-P2-04 |
| ~~UX-03~~ | A05 UX | HIGH | The landing page presents example listings as real, "verified" inventory | MERGED INTO STORE-05 |
| UX-05 | A05 UX | HIGH | "Add a workspace" shows completely different choices depending on the invisible side | CONFIRMED |
| UX-08 | A05 UX | HIGH | Picking dates on a hotel sends you away to search, which has no date field | CONFIRMED |
| UX-09 | A05 UX | HIGH | Example hotels carry no example disclosure, offer "Book now", and fail at checkout | CONFIRMED, fix amended (overlaps UI-P2-01) |
| UX-10 | A05 UX | HIGH | Yearly rentals of kind "villa" render as nightly stays: "₦50m Total for 2 nights" | CONFIRMED (overlaps UI-P2-03) |
| ~~UX-26~~ | A05 UX | HIGH | App Store / Google Play badges on the landing link to the web intro, not the stores | MERGED INTO STORE-06 |
| UX-P2-01 | A05 UX | HIGH | "Download my data" downloads nothing and says Vallo holds nothing about you off the device | NEW |
| UX-P2-02 | A05 UX | HIGH | "Biometric app lock" is a switch that does nothing | NEW |
| DB-04 | A03 Schema | MEDIUM | Anonymous `storage.objects` reads now die with 42501 (introduced today) | SEVERITY CHANGED HIGH→MEDIUM |
| DB-07 | A03 Schema | MEDIUM | A guest can confirm their own table reservation (and edit any column) | CONFIRMED, fix amended |
| DB-08 | A03 Schema | MEDIUM | An applicant can mark their own application APPROVED and stamp `reviewer_id` | CONFIRMED, fix amended (insert variant) |
| DB-09 | A03 Schema | MEDIUM | `person_badge` (definer view) lets anyone list every staff account's user id | CONFIRMED |
| DB-11 | A03 Schema | MEDIUM | The migration history does not match the repo: 70 files are not in the live history under their version, 3 live migrations have no file, and 2 pending files are unapplied | CONFIRMED, why-it-matters amended |
| DB-12 | A03 Schema | MEDIUM | `stays_search` takes 250-290 ms to return 5 rows, and it is the catalogue's search | CONFIRMED |
| DB-16 | A03 Schema | MEDIUM | Deleting a user from the dashboard cascades away the *other* party's conversations, flagged messages and reports | CONFIRMED (wider), fix amended |
| DB-17 | A03 Schema | MEDIUM | KYC documents can be overwritten or deleted by the applicant after approval | CONFIRMED, fix amended |
| DB-20 | A03 Schema | MEDIUM | The policy-caller probe is manual, text-matching and role-blind, and it missed today's regression (DB-04) | CONFIRMED over the wire |
| DOC-02 | A10 Truth | MEDIUM | Production runs the lockfile tree (Next 16.2.12, flagged CRITICAL). Every gate ran a newer, different tree | SEVERITY CHANGED HIGH→MEDIUM |
| DOC-05 | A10 Truth | MEDIUM | The Paystack signature check has no test of its own. Every webhook test mocks it to `true` | SEVERITY CHANGED HIGH→MEDIUM |
| DOC-06 | A10 Truth | MEDIUM | Money actions with no test, and money tests that test their mocks | CONFIRMED, evidence amended |
| DOC-07 | A10 Truth | MEDIUM | 372 tests in 35 files check the source text, not the behaviour. A comment satisfies some of them | CONFIRMED (count slightly off) |
| DOC-08 | A10 Truth | MEDIUM | The terminology ban is an empty list, and its test loops over nothing | CONFIRMED |
| DOC-09 | A10 Truth | MEDIUM | 88 browser "specs" that nothing runs, described as the platform's main proof | CONFIRMED |
| DOC-10 | A10 Truth | MEDIUM | Six places say a check "fails the build". None of them is in the build | CONFIRMED |
| DOC-12 | A10 Truth | MEDIUM | `docs/PRODUCT.md`, the doc marked "Read this first", is wrong on theme, vocabulary and enforcement | CONFIRMED |
| DOC-13 | A10 Truth | MEDIUM | The deep-link gate is red and in no gate | CONFIRMED (likely overlaps STORE-03) |
| DOC-15 | A10 Truth | MEDIUM | `SESSIONS_CLOSE_OUT` and `BUILD_06_LEDGER` claim gates that did not run | CONFIRMED, evidence and fix amended |
| DOC-20 | A10 Truth | MEDIUM | The ID-document upload on `/verification` has no accessible name | CONFIRMED |
| DOC-22 | A10 Truth | MEDIUM | Hardcoded English bypasses the dictionary on money and auth screens, and 70 hand-written English plurals cannot be translated | CONFIRMED |
| DOC-P2-02 | A10 Truth | MEDIUM | The CI build runs with no env, so it compiles a different `next.config` from production. The green build cannot fail for production's reasons | NEW |
| ESC-05 | A02 Escrow | MEDIUM | Money leaves escrow when nobody should release it: the sweeper and confirm ignore the kill switch, payee suspension and payee deletion | SEVERITY CHANGED HIGH→MEDIUM, fix amended |
| ESC-09 | A02 Escrow | MEDIUM | Disputes and proposals never time out and nothing alerts on their age | CONFIRMED |
| ESC-11 | A02 Escrow | MEDIUM | "Pays out on <date>" is rendered in server UTC, hides the hour, and differs between surfaces | CONFIRMED, fix amended |
| ESC-13 | A02 Escrow | MEDIUM | The Terms and the escrow copy disagree with what the feature does on the day it opens | CONFIRMED, fix amended |
| ESC-14 | A02 Escrow | MEDIUM | A stay the host accepted but the guest never paid has no timeout | CONFIRMED |
| ESC-P2-01 | A02 Escrow | MEDIUM | Any admin can rewrite any booking's price and status straight over the API, with no record | NEW |
| ESC-P2-02 | A02 Escrow | MEDIUM | A year's tenancy is stored as a one-night stay, so it "completes" the next day, gets announced publicly, and can no longer be refunded through support | NEW |
| MON-10 | A01 Money | MEDIUM | The ledger is not append-only in the database: entries are edited in place, and only RLS stops a browser trying | CONFIRMED (wider), fix amended; absorbs ESC-18 |
| MON-11 | A01 Money | MEDIUM | Idempotency keys are not tied to the request's contents or to the ledger references, so a retry can still move money twice | CONFIRMED |
| MON-12 | A01 Money | MEDIUM | The typed-account withdrawal still has the unlocked fallback, and "missing function" is matched too loosely | CONFIRMED |
| MON-13 | A01 Money | MEDIUM | The reconciliation check still cannot raise an alarm when the reconciler never replies | CONFIRMED, fix amended |
| MON-14 | A01 Money | MEDIUM | Processor fees on top-ups are paid by Vallo and recorded nowhere | CONFIRMED (+ inconsistency) |
| MON-15 | A01 Money | MEDIUM | "Refunds reach your wallet in 3 to 5 business days" is on the send page, is enforced by nothing, and is untrue | CONFIRMED |
| MON-16 | A01 Money | MEDIUM | A member cannot get a receipt, statement or agreement out as a document | CONFIRMED |
| MON-P2-01 | A01 Money | MEDIUM | Commission is priced when money is released, not when it is agreed, and one admin can set it to 100% of money already held | NEW |
| MON-P2-03 | A01 Money | MEDIUM | The only real top-up ever was credited 16h44m late, by the reconciler, not by the webhook or the redirect | NEW; absorbs OPS-P2-04 |
| OPS-08 | A09 Ops | MEDIUM | Migrations go straight to the live database from working sessions, with no CI check, no staging and no down path. `main` auto-deploys to production while several sessions push to it. | CONFIRMED, fix amended |
| OPS-09 | A09 Ops | MEDIUM | Functions run in iad1 (Washington), the database is in eu-west-1 (Ireland) and users are in Nigeria. Every request crosses the Atlantic several times. | CONFIRMED |
| OPS-10 | A09 Ops | MEDIUM | A cold page costs 0.66 to 1.5 MB. `/search` ships 945 KB of raw HTML (391 KB of inline RSC payload). Under emulated 3G the first paint is about 7 to 8 s and the landing LCP was 26 s. | CONFIRMED (partially re-checked) |
| OPS-11 | A09 Ops | MEDIUM | What breaks first as the catalogue grows: the 200-row cap with no pagination (at about 1,000 listings), then the 5,000-row join caps (about 10,000), then the uncached landing and search fan-out under concurrency. | CONFIRMED, fix amended |
| OPS-12 | A09 Ops | MEDIUM | The retention schedule is mostly unenforced, including its own "sharpest case" (rejected applicants' ID documents and NINs). There is no subject-access or data-export path. | CONFIRMED |
| OPS-P2-02 | A09 Ops | MEDIUM | The production database and hosting sit under personal, unrelated account names, not the company | NEW |
| ~~OPS-P2-04~~ | A09 Ops | MEDIUM | A reconcile recovery is proof the webhook failed, and nothing says so | MERGED INTO MON-P2-03 |
| SEC-03 | A04 Security | MEDIUM | Unauthenticated email relay: anyone can make Vallo mail any address with attacker-chosen name and text | SEVERITY CHANGED HIGH→MEDIUM, fix amended |
| SEC-06 | A04 Security | MEDIUM | Nothing detects or prevents discriminatory rental preferences ("No Igbo", "Muslims only", "Married couples only") | SEVERITY CHANGED HIGH→MEDIUM |
| SEC-07 | A04 Security | MEDIUM | Auth cookie is not `Secure`, not `HttpOnly` and lives 400 days; the apex domain lacks HSTS `includeSubDomains`/`preload` | CONFIRMED, fix amended |
| SEC-08 | A04 Security | MEDIUM | Sign-out is global; password change revokes nothing; a revoked device keeps PostgREST access for up to an hour | CONFIRMED |
| SEC-09 | A04 Security | MEDIUM | App-level limits exist only on auth, money, support and AI. They fail open, are per-IP only, and GoTrue is directly reachable around them | CONFIRMED, evidence corrected |
| SEC-10 | A04 Security | MEDIUM | The canonical-email recorder: what it catches, what gets through, and it is erased on deletion | CONFIRMED, fix amended |
| SEC-12 | A04 Security | MEDIUM | KYC documents can be swapped or deleted by the applicant after review; admin storage reads bypass the audit trail | CONFIRMED, fix amended |
| SEC-13 | A04 Security | MEDIUM | Account deletion leaves device fingerprints, the pre-deletion email in the outbox, and price-check history; privacy policy claims analytics cookies that do not exist | CONFIRMED |
| SEC-14 | A04 Security | MEDIUM | Sign-up metadata is attacker-controlled; direct GoTrue sign-up skips the app's terms gate, and display names are never filtered | CONFIRMED |
| SEC-15 | A04 Security | MEDIUM | "Email can never change" leaves no recovery path for a lost mailbox, and phone is unverified free text | CONFIRMED |
| SEC-18 | A04 Security | MEDIUM | The member `/verification` submit is a stub that always refuses | SEVERITY CHANGED LOW→MEDIUM |
| SEC-P2-02 | A04 Security | MEDIUM | Any member can open a message thread with any user id and write into it, bypassing every rule `startConversation` enforces | NEW |
| STORE-12 | A08 Stores | MEDIUM | A wallet balance blocks in-app deletion, and withdrawal depends on Paystack transfers that the current plan cannot make | CONFIRMED, fix amended |
| STORE-13 | A08 Stores | MEDIUM | The app is declared universal (iPhone + iPad), which forces iPad screenshots and iPad review | CONFIRMED |
| STORE-15 | A08 Stores | MEDIUM | Push is written but cannot be demonstrated: plugin not synced, lockfile missing it, FCM key a placeholder, APNs not provisioned | CONFIRMED (partial duplicate; founder checklist) |
| STORE-P2-02 | A08 Stores | MEDIUM | The account purge has never run for real, keeps the email in canonical form, and leaves device tokens, fingerprints and saved coordinates | NEW (overlaps SEC-13, ESC-06) |
| SUP-04 | A07 Supply | MEDIUM | A server action posted with a dead session gets a 307 to /sign-in, the page crashes to "Nothing you were doing was lost", and the answers are gone | SEVERITY CHANGED HIGH→MEDIUM |
| SUP-10 | A07 Supply | MEDIUM | "Registered firm" is a door with nothing behind it | CONFIRMED (worse: see SUP-P2-01) |
| SUP-11 | A07 Supply | MEDIUM | Documents filed from /profile/setup/professional never attach | CONFIRMED |
| SUP-12 | A07 Supply | MEDIUM | Nights a host has closed are enforced only in the date picker | CONFIRMED |
| SUP-13 | A07 Supply | MEDIUM | "We check who you are before anything is published" is not enforced anywhere | CONFIRMED (more false copy) |
| SUP-14 | A07 Supply | MEDIUM | Approving an application ignores failures to create the agent row or the role | CONFIRMED |
| SUP-P2-03 | A07 Supply | MEDIUM | Self-publishing mints a public reference, a feed announcement and badges, so SUP-02's blast radius reaches social | NEW (fix folded into DB-02) |
| UI-02 | A06 Interface | MEDIUM | Profile → "Reviews" leads to a 404 | SEVERITY CHANGED HIGH→MEDIUM |
| ~~UI-04~~ | A06 Interface | MEDIUM | The Terms say Vallo never holds money in escrow; the product holds money in escrow | MERGED INTO ESC-13 (HIGH→MEDIUM) |
| UI-05 | A06 Interface | MEDIUM | Home hero: the search field is wider than its plate, which clips the Filters button | CONFIRMED |
| UI-06 | A06 Interface | MEDIUM | Listing spec tiles break words mid-word ("Parkin g", "Backu p power") | CONFIRMED |
| UI-09 | A06 Interface | MEDIUM | Controls under 44pt, confirmed by hit-testing rather than box size | CONFIRMED, fix amended (one sub-claim removed) |
| UI-P2-03 | A06 Interface | MEDIUM | Listings render under the wrong template: rentals as stays, restaurant *units* as places to eat | NEW (shares fix with UX-10) |
| UX-02 | A05 UX | MEDIUM | New accounts lose where they were going: "Create account" / "Sign up" drop `next` | SEVERITY CHANGED HIGH→MEDIUM |
| UX-04 | A05 UX | MEDIUM | The side flips silently when you open a card, and stays flipped everywhere | SEVERITY CHANGED HIGH→MEDIUM |
| UX-06 | A05 UX | MEDIUM | The centre ⇄ dock button looks like the side switch but switches profile; the real side switch is buried | SEVERITY CHANGED HIGH→MEDIUM |
| UX-07 | A05 UX | MEDIUM | "Rent" returns nightly stays, hotel rooms and a restaurant; the filter chip says "Any market" | SEVERITY CHANGED HIGH→MEDIUM |
| UX-11 | A05 UX | MEDIUM | Supplier doors are mislabelled and the agent console tells a signed-in person to "Sign in" | SEVERITY CHANGED HIGH→MEDIUM |
| UX-12 | A05 UX | MEDIUM | The phone field truncates pasted or autofilled numbers in the two most common written forms | CONFIRMED |
| ~~UX-13~~ | A05 UX | MEDIUM | Withdraw is promised everywhere but has no control; delete-account then tells you to "Withdraw it" | MERGED INTO MON-04 |
| UX-14 | A05 UX | MEDIUM | A refused sign-up clears "Where did you hear about us" and the terms tick; validation only on submit | CONFIRMED (from code) |
| UX-15 | A05 UX | MEDIUM | "Get an answer from a person" opens the marketing FAQ; the drawer has no Help; the support "agent" is an AI | CONFIRMED |
| UX-16 | A05 UX | MEDIUM | Bookings, Trips and Inspections: three homes that point at each other | CONFIRMED |
| UX-20 | A05 UX | MEDIUM | The inspection sheet is hardcoded English, accepts past or 3 a.m. times, and never says whose time zone it uses | CONFIRMED, fix addition |
| UX-25 | A05 UX | MEDIUM | Auth email templates make claims that are false today | CONFIRMED, fix amended |
| DB-13 | A03 Schema | LOW | Listings carry 31 indexes, and a trivial anon read took 41 ms to plan versus 0.2 ms to execute | PARTIALLY WITHDRAWN (planning claim); duplicates stand |
| DB-14 | A03 Schema | LOW | 18 foreign keys without a covering index | UNCHALLENGED (not re-run) |
| DB-15 | A03 Schema | LOW | 411 "multiple permissive policies" and 5 per-row `auth.uid()` policies | CONFIRMED |
| DB-18 | A03 Schema | LOW | Remaining advisor lines, triaged | CONFIRMED |
| DB-19 | A03 Schema | LOW | An open HIGH risk alert says the content filter is empty. It is not (133 terms). | CONFIRMED, fix amended (different cause) |
| DB-21 | A03 Schema | LOW | Several names mislead a new engineer | CONFIRMED (spot check) |
| DB-P2-02 | A03 Schema | LOW | Three open risk alerts were created in the last hour by audit probes, including "Cron: account purge, unauthorised" | NEW |
| DOC-11 | A10 Truth | LOW | Four docs cite a "standing pre-commit scan". No pre-commit hook of any kind exists | SEVERITY CHANGED MEDIUM→LOW |
| DOC-14 | A10 Truth | LOW | Every doc that describes the test and CI setup describes a world before 19 September | SEVERITY CHANGED MEDIUM→LOW |
| DOC-16 | A10 Truth | LOW | `docs/ENVIRONMENT.md` omits live production credentials | CONFIRMED |
| DOC-17 | A10 Truth | LOW | The `vitest.config.ts` header describes a suite that no longer exists | CONFIRMED |
| DOC-18 | A10 Truth | LOW | The lint gate cannot fail on its 335 warnings, including React correctness rules | CONFIRMED, fix amended |
| DOC-19 | A10 Truth | LOW | `next build` rewrites the tracked `apps/web/tsconfig.json` | CONFIRMED |
| DOC-21 | A10 Truth | LOW | Keyboard and semantics defects on listing, stay and landing pages | CONFIRMED (+ one more rule) |
| DOC-23 | A10 Truth | LOW | `cancel-in-progress` means most commits were never checked, even while CI worked | CONFIRMED |
| DOC-24 | A10 Truth | LOW | Outdated majors; nothing abandoned found | CONFIRMED |
| DOC-P2-01 | A10 Truth | LOW | The `ci.yml` header gives a false reason for the most important structural decision in the workflow | NEW |
| DOC-P2-03 | A10 Truth | LOW | Nothing watches for advisories, so DOC-02 will recur silently | NEW |
| DOC-P2-04 | A10 Truth | LOW | A recorded test failure was never identified. The suite's flake rate is unknown and unrecorded | NEW |
| ESC-10 | A02 Escrow | LOW | The payer picks the hold window (1–180 days) at funding time, and the payee never agreed to it | SEVERITY CHANGED MEDIUM→LOW |
| ESC-12 | A02 Escrow | LOW | The gate's own record contradicts itself, and the HTTP probe does not test the live door and scores a 404 as a pass | SEVERITY CHANGED MEDIUM→LOW |
| ESC-15 | A02 Escrow | LOW | The sweeper takes no lock, ignores settle's answer, and one raise rolls back the whole batch | CONFIRMED, fix amended |
| ESC-16 | A02 Escrow | LOW | `ruleOnHeldPayment` is dead code that would refuse every ruling | CONFIRMED |
| ESC-17 | A02 Escrow | LOW | Assorted day-boundary slips and 13 copies of "today in Lagos" | CONFIRMED |
| ~~ESC-18~~ | A02 Escrow | LOW | Money tables grant INSERT/UPDATE to anon and authenticated, and only RLS stands in front | MERGED INTO MON-10 |
| ESC-P2-03 | A02 Escrow | LOW | Escrow credits use a different reference format from the one the app parses, so release and refund receipts never name the property | NEW |
| MON-06 | A01 Money | LOW | The balance a member is shown is not the balance the money doors use | SEVERITY CHANGED MEDIUM→LOW |
| MON-07 | A01 Money | LOW | The "spendable is defined in one place" guard is decoration: it cannot see the copy that is still live in pots | SEVERITY CHANGED MEDIUM→LOW, fix amended |
| MON-08 | A01 Money | LOW | "No balance columns" is false: pot balances are stored, and nothing checks them against the ledger | SEVERITY CHANGED MEDIUM→LOW |
| MON-17 | A01 Money | LOW | A payment-request link rounds the kobo away | CONFIRMED |
| MON-18 | A01 Money | LOW | Moving money into or out of a pot has no idempotency key | CONFIRMED |
| MON-19 | A01 Money | LOW | The Yellow Card webhook credits whatever amount it is told, from a float, in any currency | CONFIRMED, dormant (verified) |
| MON-20 | A01 Money | LOW | The funding check tells people with an unknown reference to wait for money that will never come | CONFIRMED |
| OPS-13 | A09 Ops | LOW | Listing photos go up in one non-resumable request, with no server-side enforcement and no orphan sweep | SEVERITY CHANGED MEDIUM→LOW (orchestrator correction: wizard re-encodes) |
| OPS-14 | A09 Ops | LOW | Direct transactional sends are fire-and-forget with no retry, and there is no List-Unsubscribe header on any mail. | CONFIRMED |
| OPS-15 | A09 Ops | LOW | Every page load raises a CSP violation: one script tag in the HTML has no nonce. | CONFIRMED |
| OPS-16 | A09 Ops | LOW | Every shared listing link previews as the generic Vallo card. The og:image (294 KB) sits just under WhatsApp's roughly 300 KB thumbnail limit. There is no og:url or canonical. | CONFIRMED (premise noted) |
| OPS-17 | A09 Ops | LOW | A missing listing is a soft 404 (200, then a streamed not-found). Signed-out unknown paths get a 307 to sign-in instead of a 404. | CONFIRMED (re-check limited) |
| OPS-18 | A09 Ops | LOW | Assistant and support calls to Anthropic have no server-side timeout. | CONFIRMED |
| OPS-P2-03 | A09 Ops | LOW | Alert state is internally inconsistent: an "open" alert carries a resolution time | NEW (overlaps DB-19) |
| SEC-11 | A04 Security | LOW | The guard protects the wrong spelling, in only three files; the real private address appears nowhere today | SEVERITY CHANGED MEDIUM→LOW |
| SEC-16 | A04 Security | LOW | Public buckets accept arbitrary image uploads from any signed-in user, unlinked to any listing, with declared-only content type | SEVERITY CHANGED MEDIUM→LOW |
| SEC-17 | A04 Security | LOW | Small oracles and gaps in exposed functions and actions | CONFIRMED |
| SEC-P2-04 | A04 Security | LOW | Card checkout proves the caller can read the booking, not that they are its guest | NEW |
| STORE-14 | A08 Stores | LOW | The documented release build produces an APK; Play requires an AAB, and nothing builds natively in CI | SEVERITY CHANGED MEDIUM→LOW |
| STORE-16 | A08 Stores | LOW | The native share sheet and page title carry the agent's free-text listing title, which can name a street | SEVERITY CHANGED MEDIUM→LOW |
| STORE-17 | A08 Stores | LOW | `/preview` answers 200 signed out in production with a 404 body, and its RSC payload lists the preview harness | CONFIRMED |
| STORE-18 | A08 Stores | LOW | The icon art is a rounded tile inside a square, so both OS masks crop around a second rounded rectangle; the Android adaptive foreground is double-inset | CONFIRMED, fix amended |
| STORE-19 | A08 Stores | LOW | The Terms require 18+ but sign-up asks nothing about age; the age-rating answers must match | CONFIRMED |
| STORE-20 | A08 Stores | LOW | No store screenshots, feature graphic, description, keywords or support mailbox exist | CONFIRMED |
| ~~STORE-21~~ | A08 Stores | LOW | The "Invest" tile on home is a second link to the buy search | MERGED INTO STORE-05 |
| SUP-15 | A07 Supply | LOW | Wrong destinations and wrong words on the supply path | CONFIRMED (not re-walked) |
| SUP-16 | A07 Supply | LOW | The listing draft in localStorage is not scoped to the user and not cleared at sign-out | CONFIRMED |
| SUP-17 | A07 Supply | LOW | A restaurant can be submitted with no photos | CONFIRMED |
| UI-01 | A06 Interface | LOW | Text-bearing capsules: the 14px "control" radius turns anything shorter than 28px into a pill | SEVERITY CHANGED MEDIUM→LOW, fix amended |
| UI-10 | A06 Interface | LOW | Long unbroken names overflow the People list; initials break on names that start with an emoji | CONFIRMED |
| UI-11 | A06 Interface | LOW | Wallet "Recent Transactions" title jammed against the panel rim when empty; several screens have no h1 | CONFIRMED |
| ~~UI-12~~ | A06 Interface | LOW | One Next framework chunk has no nonce and is blocked by CSP on every page | MERGED INTO OPS-15 (MEDIUM→LOW) |
| UI-13 | A06 Interface | LOW | Compact money changes the figure at the edges; `<Amount>` without showFraction rounds kobo; nairaExact drops the minus sign | CONFIRMED |
| UI-14 | A06 Interface | LOW | Hydration error on every load of `/u/<handle>/edit` | CONFIRMED |
| UI-15 | A06 Interface | LOW | "Not found" is drawn four different ways, one with a green success shield | CONFIRMED (not re-driven) |
| UI-16 | A06 Interface | LOW | notFound() pages answer HTTP 200 (soft 404) with duplicate robots meta | CONFIRMED (overlaps STORE-17, OPS-17) |
| UI-17 | A06 Interface | LOW | Appearance still promises "Theme" | CONFIRMED |
| UI-18 | A06 Interface | LOW | Local materials remain beside the shared layer: eight overlays hand-roll their sheet, and spec tiles hand-draw the panel | SEVERITY CHANGED MEDIUM→LOW, fix amended |
| UI-19 | A06 Interface | LOW | Native chrome and page canvas are two different near-blacks; the "no rubber-band" rule sits on body, where it has no effect | CONFIRMED (device unverified) |
| UI-20 | A06 Interface | LOW | An unknown URL asks for sign-in instead of a 404 (the first-visit carousel half is merged into STORE-P2-04) | SPLIT: carousel half MERGED INTO STORE-P2-04 (via UX-01); unknown-URL half CONFIRMED LOW |
| UI-P2-02 | A06 Interface | LOW | The interface sweep's overflow and colour checks cannot fail for the reasons the features would fail | NEW |
| UX-17 | A05 UX | LOW | User-facing strings written for engineers | SEVERITY CHANGED MEDIUM→LOW |
| UX-18 | A05 UX | LOW | Old brand "RentMe" on every example card, detail page, the inbox and the people directory | SEVERITY CHANGED MEDIUM→LOW |
| UX-19 | A05 UX | LOW | Sheets do not own history: browser/Android Back with a sheet open leaves the screen | SEVERITY CHANGED MEDIUM→LOW, fix amended |
| UX-21 | A05 UX | LOW | The empty-state system is good, with four wrong notes | CONFIRMED |
| UX-22 | A05 UX | LOW | Home tiles that lie: "Invest" = Buy, "Manage" = become a supplier, "Nearby" = the social feed | CONFIRMED (overlaps STORE-05/STORE-21) |
| UX-23 | A05 UX | LOW | One concept, eight names; supply jargon a Nigerian landlord would not use | CONFIRMED |
| UX-27 | A05 UX | LOW | A failed JS chunk gets "Try again", which cannot recover it (the CSP half is merged into OPS-15) | SPLIT: CSP half MERGED INTO OPS-15; error-boundary half CONFIRMED, MEDIUM→LOW, fix amended |
| UX-28 | A05 UX | LOW | Small inconsistencies on flow screens | CONFIRMED (partly re-checked) |
| UX-P2-03 | A05 UX | LOW | Tapping "Message" creates a conversation on page load (GET), so empty threads pile up in both inboxes | NEW |

## 6. THE FINDINGS, AREA BY AREA

### A01 — MONEY AND THE LEDGER: merged pass one + pass two

Sources: `pass1/A01-money.md` (Audit Agent 1) and its pass-two review `pass2/R-A01-by-A02.md` (Audit Agent 2). Pass-one checkout `85c5471` (origin/main `0ab215f` changed none of the money files); treat line numbers as subject to churn. Pass two was taken 2026-09-23 20:35–21:05 UTC against the live project `uccixoonmbhrnyczyigt`; no pass-one finding turned out wrong against the live bodies.

> **Correction made by A01 during pass two.** Pass one's AREA SUMMARY said the Supabase MCP could not reach the live database. That was wrong (a wrong project id). With `uccixoonmbhrnyczyigt` the MCP reads the live database, and A01 has since confirmed live: MON-07 (`move_into_pot` still contains `settled - pending_out`) and MON-10 (`wallet_entries` has only two AFTER notification triggers and no guard trigger).

#### DANGER NOW

None. No money can leak today. The dangerous paths (MON-01, MON-02, MON-03) sit on payouts, and Paystack refuses every payout on the Starter Business account. The live ledger shows exactly that: the founder's one withdrawal attempt is `FAILED` with `"failure": "You cannot initiate third party payouts as a starter business"`. **They become CRITICAL on the day the Registered Business upgrade switches payouts on.** Fix them before that switch, not after it.

*Pass-two note:* the reviewer found nothing that changes this. Live money state (pass two): 1 wallet, 2 wallet entries (a ₦1,000 bank top-up `COMPLETED` with `metadata.recovered_by: "sweep"`, and a ₦1,000 withdrawal `FAILED` with "You cannot initiate third party payouts as a starter business"), 0 transactions, 0 ledger entries, 0 refunds, 1 pot (a QA account's, balance 0, archived). Money findings the reviewer says pass one missed and that are filed in A02: ESC-02 (CRITICAL, canonical for guest-priced bookings), ESC-01 (CRITICAL), ESC-05, ESC-06 (pairs with MON-09).

#### FINDINGS (pass one, with pass-two verdicts)

#### MON-01 | MONEY/PAYOUTS | HIGH | A withdrawal that times out is marked FAILED and refunded even if Paystack paid it
- **WHAT IS WRONG:** `initiateTransfer` turns every failure into the same `PaystackError`: a network failure, a 15-second abort, a 5xx or a refusal. The withdraw action then immediately flips the hold to `FAILED`, which puts the money back in the member's spendable balance. If Paystack actually accepted the transfer, the payout lands too. When the `transfer.success` webhook arrives later, the entry is no longer `PENDING`, so it is dropped as a "duplicate". The member has the money twice.
- **WHERE:**
  - `apps/web/src/lib/payments/paystack.ts:64-78`: the `fetch` with `AbortSignal.timeout`; the `catch` throws the generic "could not be reached" error.
  - `apps/web/src/lib/wallet/actions.ts:743` (typed-account path) and `:963` (saved-account path): `setEntryStatus(admin, reference, "FAILED", …)` inside the `catch` around `initiateTransfer`.
  - `apps/web/src/lib/wallet/ledger.ts:176-194` (`settleWithdrawal` only moves `.eq("status","PENDING")`).
  - `apps/web/src/app/api/paystack/webhook/route.ts:420`: `if (!settled) return verdict("duplicate", "withdrawal_not_pending", 200);`
- **EVIDENCE:** Code read, quoted above. `setEntryStatus` (ledger.ts:141-170) updates by reference with no status guard. The sweeper in `reconciliation.ts:650-800` does verify with Paystack before releasing, but withdraw() does not wait for it; it releases on the spot. Also, the withdraw form mints no idempotency key: `schema.ts` says "NO WITHDRAWAL FORM MINTS A KEY YET". So a double tap is two payouts.
- **WHY IT MATTERS:** On payout day, every flaky-network withdrawal can pay out twice. Nigerian bank rails and a 15-second timeout make this routine, not rare. Vallo absorbs every loss.
  - *Severity note (pass one's heading said "HIGH (CRITICAL on payout day)"):* CRITICAL on payout day.
- **THE FIX:** (amended in pass two)
  - *Pass-one fix, retained:* 
    1. In `request()`, give a transport or abort failure its own error class, e.g. `PaystackUnknownOutcome`. Only an explicit `status:false` envelope with a 4xx counts as "definitely not started".
    2. In both withdraw catches, on an unknown outcome, leave the hold `PENDING` and let `sweepStaleWithdrawalHolds` (which calls `verifyTransfer`) decide.
    3. Make `setEntryStatus` refuse anything but `PENDING` → X.
    4. Mint an idempotency key in `WithdrawForm` (WalletDeck.tsx:477) and make the withdrawal reference a function of that key.
  - *Pass-two amendments:*
    - Step 3 (`setEntryStatus` refuses anything but PENDING) breaks `labelTransferLegs` (`actions.ts:1294-1295`), which writes `COMPLETED` over `COMPLETED` legs just to add a caption. It must ship together with MON-10's step on `labelTransferLegs`, or every wallet-to-wallet send starts throwing after the money has moved.
    - Step 2 relies on `sweepStaleWithdrawalHolds` → `verifyTransfer` answering "not found" for a transfer that never started. That is UNVERIFIED against Paystack. Until it is verified, an unknown-outcome hold can stay PENDING for ever: add an operator alert for any withdrawal PENDING longer than 24h.
- **EFFORT:** 1 day with tests.
- **PASS TWO:** CONFIRMED — fix amended (step 3 must ship with MON-10's trigger/`labelTransferLegs` change; add a >24h PENDING-withdrawal operator alert). Reviewer (A02) re-read `paystack.ts:64-78` (transport failure and abort thrown as the same `PaystackError` as a refusal), `actions.ts:743`, `settleWithdrawal`'s `.eq("status","PENDING")` and the webhook's `withdrawal_not_pending` drop (`route.ts:420`); dormant today, because the one live withdrawal failed synchronously with a Paystack 4xx, which is correctly FAILED.

#### MON-02 | MONEY/PAYOUTS | HIGH | The admin "sweep stuck holds" button releases in-flight payouts without asking Paystack
- **WHAT IS WRONG:** `public.admin_expire_stale_withdrawal_holds` calls `public.expire_stale_withdrawal_holds`. That function flips every `PENDING` withdrawal older than N minutes to `FAILED` on age alone, with a floor of 10 minutes in the UI and 1 minute in SQL. The function's own comment admits the danger: "releasing a hold whose transfer actually paid out would hand back money that has already left". The action's header claims it "does not cancel a transfer that is genuinely in flight", which is false. A transfer sitting in Paystack `pending` or `otp` for more than 10 minutes gets released, then pays, and the success webhook is dropped as in MON-01.
- **WHERE:**
  - `supabase/migrations/20260809080815_the_locking_money_paths_get_a_public_door.sql`: body of `expire_stale_withdrawal_holds`.
  - `supabase/migrations/20260809084116_the_operations_desk_can_see_the_money_it_is_responsible_for.sql`: `admin_expire_stale_withdrawal_holds`, granted to `authenticated`.
  - `apps/web/src/lib/admin/payments-actions.ts:74-100`.
  - `apps/web/src/app/admin/payments/SweepHolds.tsx`.
- **EVIDENCE:** Called live as the QA member: `POST /rest/v1/rpc/admin_expire_stale_withdrawal_holds {"p_older_than_minutes":999999} -> 200 {"status": "forbidden"}`. The door is reachable by any signed-in user, and the has_role check inside it holds. I did not call it as admin, because it mutates.
- **WHY IT MATTERS:** One well-meant click by support can double-pay every in-flight withdrawal.
  - *Severity note (pass one's heading said "HIGH (CRITICAL on payout day)"):* CRITICAL on payout day.
- **THE FIX:** Delete the SQL age-only sweep, or make it private and uncallable. Point the admin button at the TypeScript `sweepStaleWithdrawalHolds(admin, {apply:true})`, which verifies each reference with Paystack and releases only on `failed`, `reversed`, `abandoned` or not-found.
- **EFFORT:** 3 to 4 hours.
- **PASS TWO:** CONFIRMED. Reviewer read live `pg_proc`: `expire_stale_withdrawal_holds` sets PENDING withdrawals to FAILED on age alone (`created_at < now() - make_interval(mins => greatest(older_than_minutes, 1))`) with no Paystack check; `admin_expire_stale_withdrawal_holds` has acl `authenticated=X` and calls it after the has_role check; it is not in `cron.job` (all 14 jobs read), so only the admin button or an admin JWT over PostgREST triggers it. Severity and fix sound.

#### MON-03 | MONEY/PAYOUTS | HIGH | A reversal that arrives after a success never credits the member back
- **WHAT IS WRONG:** `transfer.reversed` (and a late `transfer.failed`) only settles `PENDING` entries. Paystack commonly sends `transfer.success` first and `transfer.reversed` hours or days later, when the beneficiary bank bounces the funds. At that point the entry is `COMPLETED`, so the reversal is logged as "withdrawal_not_pending" and ignored. The money is back in Vallo's Paystack balance and the member's wallet never gets it.
- **WHERE:** `apps/web/src/app/api/paystack/webhook/route.ts:437-446`; `apps/web/src/lib/wallet/ledger.ts:176-194`.
- **EVIDENCE:** Code read. No other handler writes a compensating credit for a reversed payout. The kind enum has `refund` but nothing posts one for a withdrawal.
- **WHY IT MATTERS:** Members silently lose withdrawals that bounced, and the ledger understates what Vallo owes them.
  - *Severity note (pass one's heading said "HIGH (on payout day)"):* on payout day.
- **THE FIX:** (amended in pass two)
  - *Pass-one fix, retained:* On `transfer.reversed` for an entry that is already `COMPLETED`, post a new `COMPLETED` credit of kind `refund`, reference `rm-wd-<uuid>-reversal`, which is idempotent through the unique reference. Leave the original row as it is (append-only). Raise an alert as well.
  - *Pass-two amendments:*
    - The compensating credit is for an entry that is already `COMPLETED` only. It must **not** credit when the entry is already `FAILED` (released by MON-01 or MON-02), or the member is paid three times. Say so explicitly in the fix.
- **EFFORT:** 3 hours.
- **PASS TWO:** CONFIRMED — fix amended (never credit a reversal when the entry is already FAILED). Reviewer traced `route.ts` `handleTransferEvent` → `settleWithdrawal(admin, reference, "REVERSED")` → `.eq("status","PENDING")` → `null` → `verdict("duplicate","withdrawal_not_pending")`. How often Paystack sends a reversal after a success is UNVERIFIED; the code path is real either way.

#### MON-04 | MONEY/PRODUCT+LEGAL | HIGH | Money can enter the wallet and cannot leave it, while the Terms promise it can
- **WHAT IS WRONG:** Every route in is live: card or bank top-up, the ₦100 card-save top-up, and stay refunds, which go only to the wallet. The only route out to a bank is `withdraw`. It is deliberately not drawn in the UI (reachable only by `?action=withdraw`), and Paystack refuses it anyway on the Starter account. Despite that, the Terms (§5) say "Refunds go to your Vallo wallet in naira, and you move money from there to your bank". The cancellations page says it "is not a store credit: move it to your Nigerian bank account from the wallet whenever you want … Card reversals are slower … which is why they are not the default". There is no card-reversal path at all.
- **WHERE:**
  - `apps/web/src/app/(app)/wallet/WalletDeck.tsx:54-55` ("The withdraw sheet is still reachable by `?action=withdraw` and is not drawn as a tile while bank payouts do not complete").
  - `apps/web/src/lib/legal/terms.tsx` §5.
  - `apps/web/src/app/(site)/cancellations/page.tsx:160-175`.
  - Live ledger row: `{"kind":"withdrawal","status":"FAILED","metadata":{"failure":"You cannot initiate third party payouts as a starter business",…}}`, read as the QA admin over PostgREST.
- **EVIDENCE:**
  - The live `/wallet` as the QA member shows "Send / Receive / Add money / History" and no Withdraw.
  - `GET /rest/v1/wallet_entries …` as the QA admin returns the failed withdrawal above.
  - The only live wallet holds ₦1,000 (`balance_minor: 100000`) of real money that cannot be withdrawn.
- **WHY IT MATTERS:** This traps customer funds, and the Terms describe a capability that does not exist. That is a consumer-protection and store-review risk (misleading functionality). Every refund issued today is money the guest cannot get back to a bank.
- **THE FIX:** Pick one (founder decision):
  - (a) Hide "Add money" and card-save top-ups until payouts work. Refund card-paid stays by Paystack refund API (`POST /refund`) rather than to the wallet. Change Terms §5 and the cancellations page to say so.
  - (b) Keep top-up, but put "Withdrawals open on <date>; until then support returns your balance by bank transfer on request" on the wallet and in the Terms, and staff that promise.
- **EFFORT:** Copy change 2 hours. Paystack refund path 1 to 2 days.
- **PASS TWO:** CONFIRMED. Reviewer read the live ledger: the ₦1,000 deposit is COMPLETED and the ₦1,000 withdrawal is FAILED with the Starter-business message, so the balance cannot be withdrawn; Terms read "from there to your bank" (`lib/legal/terms.tsx:283`), cancellations read "not a store credit: move it to your Nigerian bank account from the wallet whenever you want" (`cancellations/page.tsx:168-169`); withdraw is still reachable through `?action=withdraw` (`WalletDeck.tsx:54,292-296`). HIGH is honest.
  - *Also reported as UX-13 (A05 UX, MERGED INTO this ID in pass two):* withdraw is promised on the landing ("One naira wallet — Top up, pay, withdraw, on both sides"), in the help centre, in emails and escrow emails, and the account-deletion blocker's CTA is "Withdraw it" — but the wallet has no withdraw control. Add these copy sites to MON-04's fix: `packages/i18n/src/locales/en.ts:609, 891, 1709`; `lib/email/messages.ts:460, 728, 1496`; `lib/email/escrow-messages.ts:265, 298`; `app/(site)/help/page.tsx:187-188`. Give the delete-account blocker an "Ask support to refund my balance" route instead of "Withdraw it" — the store-relevant part (Apple 5.1.1(v), Play deletion policy), which MON-04's owner carries.

#### MON-05 | MONEY/BOOKINGS | HIGH | A stay (or a rent charge) can be paid twice, and a late card payment on a cancelled booking is kept silently
- **WHAT IS WRONG:** The only "already paid?" check is at checkout start (`guardPayable`: is there a `SUCCESSFUL` transaction?). Open two card checkouts, in two tabs or on two devices (each click mints a new `rm-book-` reference), or open a card checkout and then pay from the wallet. Both succeed. `settleBookingCharge` never asks whether another attempt for the booking already succeeded, never compares the amount with `total_minor`, and never checks the booking is not `CANCELLED`. A card charge that lands after the 48-hour hold sweep cancelled the booking is marked `SUCCESSFUL` against a cancelled stay. The guest is charged, the stay is gone, and nothing alerts or refunds.
- **WHERE:**
  - `apps/web/src/lib/bookings/checkout.ts:227-280` (guard only at start) and `:309` (new reference per click).
  - `apps/web/src/lib/bookings/settlement.ts:166-270` (the `update … .in("status", ["PENDING","FAILED"])` at :218 is per reference, not per booking).
  - `private.pay_booking_from_wallet` (20260730122108) checks `already_paid`, but only under its own lock, and the card path takes no lock.
  - The rent path reuses these doors (`lib/rent/actions.ts` header).
  - (from OPS-01) `apps/web/src/app/(app)/checkout/[bookingId]/PayPanel.tsx:193`: `const cardKey = useMemo(() => newKey(), []);`. The idempotency key lives only in component memory, so a reload (what a person does when the connection dies mid-payment) mints a new key, and `withIdempotency` does not dedupe across the two.
  - (from OPS-01) `supabase/migrations/*`: the only index on `public.transactions` besides the PK and the `provider_ref` unique is `transactions_booking_idx` (non-unique, `20260728152358_bookings_payments.sql:93`). There is no partial unique on `(booking_id) where status='SUCCESSFUL'`.
  - (from OPS-01) `apps/web/src/app/api/paystack/webhook/route.ts:342-360`: the only alerts raised are for outcome `failed` or `reference_not_ours`. A second settlement is outcome `posted`, so no alert.
- **EVIDENCE:** Code read. UNVERIFIED live: zero real bookings exist, and example listings refuse transactions.
  - (from OPS-01, code read) The realistic path: (1) the guest opens checkout and picks bank transfer, Paystack shows "awaiting transfer"; (2) the 3G connection drops, the guest reloads (new key, new reference) and pays by card, which settles and CONFIRMS the booking; (3) the bank transfer from step 1 lands, `charge.success` for reference A wins the PENDING→SUCCESSFUL update, a second `ledger_entries` row is inserted and "host had already accepted" is written; (4) the guest has paid twice and nobody knows.
  - (pass two, A10, live indexes) `transactions_pkey (id) UNIQUE`, `transactions_provider_ref_key (provider_ref) UNIQUE`, `transactions_booking_idx (booking_id)` NOT unique, `ledger_entries_transaction_uniq (transaction_id)`; triggers on `transactions`: only `transactions_set_updated_at`. Live `transactions` and `bookings` both have 0 rows, so this is latent until the first real booking.
- **WHY IT MATTERS:** Double-charging guests for stays, or for rent in the millions of naira, is a chargeback and store-review problem, and there is no automated way back.
- **THE FIX:** (amended in pass two)
  1. Move card settlement into one SQL function, `private.settle_booking_charge`, that takes `FOR UPDATE` on the booking row, as the wallet path does. Inside it, after winning the attempt: if another SUCCESSFUL transaction already exists for the booking, or the booking is CANCELLED, EXPIRED, NO_SHOW or COMPLETED, record the charge with a new status such as `SUCCESSFUL_DUPLICATE` (the money did move), write no ledger entry, set `metadata.overpayment=true`, append a `refund` credit to the guest's wallet under the booking lock (or queue a Paystack `POST /refund`, or an admin one-click refund — founder's ruling), and raise a critical alert (`payment.booking.duplicate_charge`). Do not write the "host had already accepted" note for a booking that is not CONFIRMED.
  2. The refund cannot go through the existing refund door: live `private.refund_and_cancel_booking` returns `already_cancelled` for a CANCELLED booking and raises `booking % could not be cancelled from %` for COMPLETED or NO_SHOW. It must be written by the settlement function itself, or by the new refund door in MON-P2-02.
  3. Add `create unique index transactions_one_success_per_booking on public.transactions(booking_id) where status = 'SUCCESSFUL';` as a backstop, not as the control flow. (OPS-01's original step, "catch the 23505 and mark the row DUPLICATE", cannot work as written: the money has already moved at Paystack, the second update would fail, the webhook would answer 500, Paystack would retry for 72h, reconcile would report the charge as unsettled for ever and the row would stay PENDING.)
  4. Adding `status` enum values touches every reader of `transactions.status`, including `expire_booking_holds`, the admin money desk and reconciliation. List and update those callers in the same change.
  5. Verify the amount: compare the processor's amount with the **listing-derived** price, not `bookings.total_minor` (which the guest can write, ESC-02), and alert critical on a mismatch.
  6. At checkout, reuse an open PENDING attempt per booking (younger than about 30 minutes; return its stored `authorization_url`/`access_code`, stored on the attempt row) instead of minting a new reference each click, and derive the idempotency key server-side from the booking id plus attempt number instead of `useMemo`.
- **EFFORT:** 1 to 1.5 days.
- **PASS TWO:** CONFIRMED — fix amended (A02: the refund must be written by the settlement itself, because `refund_and_cancel_booking` cannot refund a CANCELLED/COMPLETED/NO_SHOW booking, and the amount must be checked; A10 via OPS-01: choose the duplicate status inside one SQL function with the unique index only as a backstop, and list every reader of `transactions.status`). Absorbs OPS-01 (MERGED INTO this ID: same defect; pass one rated OPS-01 CRITICAL, its reviewer lowered it to HIGH, so the canonical severity stays HIGH). Reviewer evidence: `settlement.ts` Key 1 updates `transactions` by `provider_ref` only; the `else` branch writes a `CONFIRMED → CONFIRMED` "Payment received. The host had already accepted this stay." event even when the booking is CANCELLED, so the history also lies; live indexes show no one-success-per-booking rule (`transactions_booking_idx` is non-unique; the only other guard is one ledger row per transaction).

#### MON-06 | MONEY/LEDGER | LOW | The balance a member is shown is not the balance the money doors use
- **WHAT IS WRONG:** Every screen reads `wallet_balances.balance_minor`, which is `COMPLETED` credits minus `COMPLETED` debits. The UI calls it "Available Balance", and `readBalanceBreakdown` stores it as `availableMinor`. Every money door decides on `private.wallet_spendable_locked`, which also subtracts `PENDING` debits. So while a withdrawal is in flight, the wallet shows money that cannot be spent. SendFlow's `enough = after >= 0` (SendFlow.tsx:168) lets the member confirm a send that the database then refuses as `insufficient`.
  - **Every place a balance is derived (seven):**
  1. `private.wallet_balance` (view `wallet_balances`, screens, account-deletion blockers)
  2. `private.wallet_spendable_locked` (transfer, booking, withdrawal and escrow doors)
  3. `availableBalanceMinor` in TypeScript (`ledger.ts:103`): two separate PostgREST reads, not atomic; used by the webhook email, the checkout pre-check and the refusal messages
  4. the inline copy in `public.move_into_pot` (see MON-07)
  5. the inline sum in `private.wallets_overdrawn`
  6. the stored `wallet_pots.balance_minor` (MON-08)
  7. `private.escrow_float_components` (the escrow float)
- **WHERE:** `apps/web/src/lib/wallet/repository.ts:48-90`; `breakdown.ts` (`availableMinor` param); `app/(app)/wallet/send/page.tsx:67`; `components/app/wallet/SendFlow.tsx:166-168`.
- **EVIDENCE:** Code read. Live, the one real wallet has no `PENDING` debit, so the figures agree today. The live send page printed "Available Balance ₦0.00" from `wallet.balanceMinor`.
- **WHY IT MATTERS:** Members see "available" money they cannot use, and receipts and emails can quote different figures for the same moment.
  - *Pass two: becomes MEDIUM on payout day, when withdrawal holds (the only PENDING debits) can exist.*
- **THE FIX:** Add `spendable_minor` to the `wallet_balances` view (call `private.wallet_spendable_locked` inside a security-definer wrapper) and use it wherever the word "available" appears. Make `availableBalanceMinor` read that column in one query and delete its arithmetic.
- **EFFORT:** Half a day.
- **PASS TWO:** SEVERITY CHANGED MEDIUM→LOW (the only thing that creates a PENDING debit is a withdrawal hold; escrow holds, pots and transfers all post COMPLETED, and withdrawals fail synchronously today, so "shown ≠ spendable" cannot occur until payouts work). Reviewer read the live bodies of `escrow_fund_proposal_as`, `move_into_pot` and `pay_booking_from_wallet`, and confirmed the finding itself: live `private.wallet_balance` sums COMPLETED only, while `wallet_spendable_locked` also subtracts PENDING debits.

#### MON-07 | MONEY/LEDGER | LOW | The "spendable is defined in one place" guard is decoration: it cannot see the copy that is still live in pots
- **WHAT IS WRONG:** Migration `20260922221800` asserts that no function contains `status\s*=\s*'PENDING'\s*and\s*direction\s*=\s*'debit'`. `public.move_into_pot` spells it with an alias, `e.status = 'PENDING' and e.direction = 'debit'`. After `and\s*` the regex needs `direction` but finds `e.direction`, so it does not match. The assertion passed while a copy survived. Neither consolidation migration (F-9 or F-9b) touched pots.
- **WHERE:** `supabase/migrations/20260922221800_the_fourth_copy_of_spendable_was_in_send_money.sql:80-97`; `supabase/migrations/20260812090100_pots_move_money_under_the_wallet_lock.sql`, `move_into_pot` body ("spendable := settled - pending_out").
- **EVIDENCE:** `grep -ln "move_into_pot" supabase/migrations/*.sql` returns only `20260812090100_…`, so pots was never rewritten.
- **WHY IT MATTERS:** The next fix to spendable, for example subtracting live escrow holds or a reserve, will silently skip pots. The check that exists to stop that cannot fail for the reason it exists.
- **THE FIX:** (amended in pass two)
  - *Pass-one fix, retained:* Replace the pots arithmetic with `spendable := private.wallet_spendable_locked(target_wallet);`. Change the guard regex to `(\w+\.)?status\s*=\s*'PENDING'\s*and\s*(\w+\.)?direction\s*=\s*'debit'`, and prove it with a negative control run on a scratch function inside the migration.
  - *Pass-two amendments:*
    - The amended regex still misses the reversed order, `direction = 'debit' and status = 'PENDING'`. Match both orders, or better, assert that no function other than `wallet_spendable_locked` contains both `'PENDING'` and `direction\s*=\s*'debit'` together with `sum(`. That broader test also returns exactly `public.move_into_pot` live today.
- **EFFORT:** 2 hours.
- **PASS TWO:** SEVERITY CHANGED MEDIUM→LOW — fix amended (match both clause orders). Reviewer ran the guard's own regex against live `pg_proc`: original pattern hits = null; the amended pattern hits = `public.move_into_pot`. So the guard is decoration as claimed, but the live `move_into_pot` arithmetic (`settled - pending_out`) equals `wallet_spendable_locked` today: no money is wrong now, the risk is future drift. (A01 also confirmed live that `move_into_pot` still contains `settled - pending_out`.)

#### MON-08 | MONEY/LEDGER | LOW | "No balance columns" is false: pot balances are stored, and nothing checks them against the ledger
- **WHAT IS WRONG:** `wallet_pots.balance_minor bigint` is written beside each `pot_hold`/`pot_release` entry. The migration argues this is safe because both writes are in one transaction. But no invariant compares Σ `pot_hold` − Σ `pot_release` per `metadata.pot_id` with `balance_minor`. `private.escrow_invariants_check` checks the escrow float and overdrawn wallets and nothing about pots. A service-role bug, or a repair made by hand, drifts silently.
- **WHERE:** `supabase/migrations/20260812090100_pots_move_money_under_the_wallet_lock.sql:97`; `supabase/migrations/20260923011000_the_float_identity_is_asserted_on_a_schedule.sql` (no pot arm).
- **EVIDENCE:** Grep. `pot_hold` appears only in the two pots migrations and in the TypeScript types/actions.
- **WHY IT MATTERS:** The pot balance is what the member sees and what `move_out_of_pot` pays from. If it drifts, money is created or destroyed.
- **THE FIX:** Add invariant I-9 to `escrow_invariants_check`: for each pot, `balance_minor = coalesce(sum(pot_hold) - sum(pot_release) where metadata->>'pot_id' = id, 0)`. Raise a high alert on any row.
- **EFFORT:** 2 hours.
- **PASS TWO:** SEVERITY CHANGED MEDIUM→LOW. The invariant is missing (live `escrow_invariants_check` has no pot arm), but the reviewer found two guards pass one did not see: the BEFORE UPDATE trigger `wallet_pots_guard`, which raises 'A pot balance changes only by moving money.' unless `pots.moving = 'yes'` (set only by `move_into_pot`/`move_out_of_pot`), and the INSERT policy `own pots creatable` (WITH CHECK `user_id = auth.uid() AND balance_minor = 0`). Drift therefore needs a new, buggy service-role function. The cheap invariant is still worth adding.

#### MON-09 | MONEY/ACCOUNT DELETION | HIGH | Deleting an account ignores money in pots, so that money is stranded on a tombstone
- **WHAT IS WRONG:** `private.account_deletion_blockers` blocks deletion on `wallet_balances.balance_minor > 0`. Money in a pot has been debited as `pot_hold`, so a member with all their money in pots shows a balance of 0 and is not blocked. The purge then tombstones the auth user: banned, unrecoverable. The pot row survives because `auth.users` is not deleted, and its money can never be moved again.
- **WHERE:** `supabase/migrations/20260919210000_p1_a_business_is_never_left_ownerless.sql:1062-1064` (the `v_balance` sum) and `:1127` (`blocked`); `20260919160100_b5_the_purge_runs_in_one_transaction.sql` (no pot handling).
- **EVIDENCE:** Code read. `grep -ln wallet_pots supabase/migrations/*.sql` returns only the pots migration, so no deletion code knows pots exist.
- **WHY IT MATTERS:** Customer money is lost to the customer, and it remains an unreconciled liability.
- **THE FIX:** (amended in pass two)
  - *Pass-one fix, retained:* Add `v_pots := sum(balance_minor) from wallet_pots where user_id = p_user` to the blockers, return it as `pots_minor`, and include `v_pots > 0` in `blocked`. Show "Empty your pots first" on the deletion screen.
  - *Pass-two amendments:*
    - Adding pots to the blockers is not enough, because blockers are only checked when deletion is requested. Money can be moved into a pot, or can arrive, during the 30-day grace. The purge must re-call `account_deletion_blockers`, including pots, inside its transaction and abort if anything is non-zero. This is the same fix as ESC-06; implement the two as one change.
- **EFFORT:** 2 hours.
- **PASS TWO:** CONFIRMED — fix amended (the purge must re-run the blockers inside its transaction; same change as ESC-06). Reviewer: live `account_deletion_blockers` reads `wallet_balances` plus escrows, bookings, reservations, payouts, listings and businesses, and never `wallet_pots`; live `due_account_purges`, `purge_account_rows` and `finish_account_purge` all return `prosrc ~* 'blockers' = false`.

#### MON-10 | MONEY/LEDGER | MEDIUM | The ledger is not append-only in the database: entries are edited in place, and only RLS stops a browser trying
- **WHAT IS WRONG:** (1) `wallet_entries` has no trigger preventing UPDATE or DELETE. `booking_refunds` has one. Status, metadata, and in principle `amount_minor`, are rewritten in place: `setEntryStatus` flips any reference to any status with no guard, and `labelTransferLegs` calls it to write `COMPLETED` on both legs just to add a caption.
  - (2) The `authenticated` role holds table-level INSERT, UPDATE and DELETE on `wallet_entries`, `wallets` and `booking_refunds`. Only the absence of a policy stops them.
- **WHERE:** `apps/web/src/lib/wallet/ledger.ts:141-170`; `apps/web/src/lib/wallet/actions.ts:1290-1296`; the migrations (no `before update` trigger on `wallet_entries`).
- **EVIDENCE:** Live, as the QA member:
  - `POST /rest/v1/wallet_entries {…"amount_minor":-1…} -> 403 42501 "new row violates row-level security policy"`. That is RLS, not a grant refusal, so the INSERT grant exists.
  - `PATCH /rest/v1/wallet_entries?reference=eq.nonexistent-audit -> 204 range=*/0`
  - `DELETE /rest/v1/wallet_entries?reference=eq.nonexistent-audit -> 204`
  - `DELETE /rest/v1/booking_refunds?id=eq.0000… -> 204`

  Control: `GET /rest/v1/idempotency_records -> 403 "permission denied for table"`, which is what a real grant refusal looks like.
  - (from ESC-18) `has_table_privilege` rows: INSERT/UPDATE = true for anon and authenticated on `wallet_entries`, `bookings` and `feature_flags`. Wire: `anon GET wallet_entries → HTTP 200 []` (the grant exists and RLS filters). Separately, anon listing the `escrow-evidence` bucket gets `400 {"statusCode":"403","error":"Unauthorized","message":"permission denied for function inspection_photo_path_access"}`: an internal function name in an error, instead of an empty list.
- **WHY IT MATTERS:** One RLS policy mistake away from members editing money. One service-role bug away from history being rewritten with no trace. The "append-only" claim in the code and comments is not true.
- **THE FIX:** (amended in pass two)
  1. Revoke INSERT, UPDATE and DELETE from `anon, authenticated` on `wallet_entries`, `wallets`, `ledger_entries`, `transactions` and `booking_refunds`. (`platform_revenue` has no grants; drop it from the list.) The revoke breaks nothing the reviewers could find: every write to these tables goes through the service-role `admin` client (e.g. `checkout.ts:313,415`).
  2. `wallet_pots`: **do not** revoke INSERT or UPDATE from `authenticated` — `createPot` and pot renames go through the member's own RLS client (`lib/wallet/pot-actions.ts`). Revoke DELETE on it, and revoke everything from `anon`.
  3. `bookings`: revoke UPDATE and DELETE now, and INSERT together with the ESC-02 rewire. `feature_flags`: revoke from `anon` entirely.
  4. Add a `before update` trigger on `wallet_entries` that allows only `status` `PENDING`→`COMPLETED`/`FAILED`/`REVERSED` plus metadata *additions*, and refuses DELETE.
  5. Make `setEntryStatus` require `.eq("status","PENDING")`, and stop `labelTransferLegs` writing status (ship together with MON-01 step 3).
  6. (from ESC-18) Give the storage policy helper `inspection_photo_path_access` an anon-safe short-circuit, so anon gets an empty list rather than an internal function name (see also DB-04).
- **EFFORT:** Half a day, plus a read-back migration.
- **PASS TWO:** CONFIRMED, wider than stated — fix amended (merged fix of MON-10 and ESC-18; keep pot INSERT/UPDATE). Absorbs ESC-18 (MERGED INTO this ID; ESC-18 was LOW, so MEDIUM stands). Reviewer (live `has_table_privilege`): `anon` and `authenticated` hold INSERT, UPDATE and DELETE on `wallet_entries`, `wallets`, `transactions`, `ledger_entries`, `booking_refunds` and `wallet_pots`; RLS is on and the first five have SELECT-only policies; `platform_revenue` has no grants; `wallet_entries` has only two AFTER triggers (`wallet_entries_enqueue_withdrawal_email`, `wallet_entries_notify_after_change`) and no guard — also confirmed by A01's own pass-two correction. A grep of every `session.supabase`/`access.supabase` use of these tables found only `select`.

#### MON-11 | MONEY/IDEMPOTENCY | MEDIUM | Idempotency keys are not tied to the request's contents or to the ledger references, so a retry can still move money twice
- **WHAT IS WRONG:** (1) `withIdempotency` stores `(scope, subject, key)` and no fingerprint of the request. Replaying the same key with *different* contents (another amount or another recipient, from the same mounted SendFlow within 15 minutes) returns the first receipt, and the second instruction is silently not executed.
  - (2) The ledger references are fresh `randomUUID()`s per run (`pairId`, `rm-fund-`, `rm-book-`, `rm-pot-`), so the database's unique reference never sees the key. If a run outlives the 15-minute in-flight TTL, or the process dies after committing but before `record()`, the next tap claims `fresh` and posts a second transfer. When the claim RPC errors, `degraded:true` runs the work unguarded.
- **WHERE:** `apps/web/src/lib/security/idempotency.ts` (the whole function); `private.claim_idempotency` in `20260730013758_rate_limit_fix_ambiguous_columns.sql`; `apps/web/src/lib/wallet/actions.ts:1080-1100` and `:1125-1128`.
- **EVIDENCE:** Code read. `claim_idempotency` resets an expired in-flight row to `fresh`.
- **WHY IT MATTERS:** "Network timeout, the client doesn't know if it succeeded" is exactly the case this exists for, and it covers it only within 15 minutes and only if the server survived.
- **THE FIX:**
  - Derive the ledger references from the key: `rm-p2p-${uuidv5(userId+':'+key)}-out` / `-in`, and the same for fund and booking. The database's unique constraint then makes a replay a `duplicate` for ever.
  - Store `sha256(canonical request)` with the claim and return `conflict` ("That button already sent something different, refresh") when a replay's hash differs.
  - Fail closed for transfers when the claim errors.
- **EFFORT:** 1 day.
- **PASS TWO:** CONFIRMED. Reviewer read live `private.claim_idempotency`: when `existing.expires_at <= now()` and `completed_at is null` it rewrites the row and returns `fresh`; `lib/security/idempotency.ts:129` returns `{ … degraded: true }` after running `work()` unguarded when the claim errors. MEDIUM honest; fix correct.

#### MON-12 | MONEY/PAYOUTS | MEDIUM | The typed-account withdrawal still has the unlocked fallback, and "missing function" is matched too loosely
- **WHAT IS WRONG:** When `hold_wallet_withdrawal` comes back as `missing`, `withdraw()` runs the old non-atomic path: `availableBalanceMinor`, then `postEntry` in separate round trips. `isMissing` classifies any error message containing "does not exist" or "schema cache" as missing. That includes PostgREST's transient schema-cache reloads during a migration push, and any `relation/column … does not exist` raised *inside* the function. Transfers had this fallback removed. Withdraw keeps it.
- **WHERE:** `apps/web/src/lib/wallet/actions.ts:672-720`; `apps/web/src/lib/wallet/rpc.ts:130-138`.
- **EVIDENCE:** Code read. The function is applied live: calling it as the member gets `42501 permission denied for function hold_wallet_withdrawal`, so it exists.
- **WHY IT MATTERS:** Two concurrent withdrawals during a deploy window can both pass the balance check, and the wallet overdraws.
- **THE FIX:** Delete the fallback branch (lines 672-720) and treat `missing` as a refusal, as `withdrawToSavedAccount` already does. Restrict `isMissing` to `PGRST202`/`42883` codes only.
- **EFFORT:** 1 hour.
- **PASS TWO:** CONFIRMED. Reviewer: `lib/wallet/actions.ts:672-720` holds the unlocked fallback (`availableBalanceMinor` then `postEntry`); `lib/wallet/rpc.ts:130-138` `isMissing` matches `message.includes("does not exist")`, which also catches a `relation … does not exist` raised inside the function. Live `hold_wallet_withdrawal` exists, so the branch only runs on misclassification; MEDIUM fine because the harm is an overdraw on payout day.

#### MON-13 | MONEY/RECONCILIATION | MEDIUM | The reconciliation check still cannot raise an alarm when the reconciler never replies
- **WHAT IS WRONG:** (1), the body test The body predicate introduced in `20260923104415` works for "a web page answered 200" (proved inside the migration). But when pg_net got no status at all (timeout, connection refused), the verdict is `no_reply` only if `previous_at > now() - interval '1 hour'`, and `aged_out` otherwise. `aged_out` raises nothing. The job is hourly (`47 * * * *`), so the previous request is about one hour old on every run, and the branch is a coin flip on millisecond jitter. A reconciler that always times out can therefore look healthy for ever.
  - (2), timeouts pg_net waits 30 seconds (`timeout_milliseconds := 30000`). The route pages up to 10 Paystack list calls plus one verify call per stale hold, which can exceed that.
  - (3), the "ok" test `like '%"ok"%'` also matches `"ok":false`.
  - (4), row cap `listSuccessfulCharges` stops at 1,000 rows (`maxPages` 10 × 100, `paystack.ts:292`). The report does not say it was truncated, and the audit row says `"clean"`.
  - (5), dry run The Vercel cron hits the same route hourly at :10 with no `apply=1`, so it is a dry run.
- **WHERE:** `supabase/migrations/20260923104415_the_money_job_judged_a_web_page_a_successful_reconciliation.sql:89-99`; `apps/web/vercel.json`; `apps/web/src/lib/payments/paystack.ts:285-335`.
- **EVIDENCE:**
  - Live `audit_log` as the QA admin shows the job running: `{"action":"wallet.reconciliation.run","created_at":"2026-09-23T19:47:02…","metadata":{"apply":true,"outcome":"clean","charges_seen":0,…}}` and the :10 run `"apply": false`.
  - Earlier breakage was caught: risk_alert `"vallo_reconcile_payments … invalid URL \"https://www.vallospaces.com\n/api/paystack/reconcile…\""` (22 Sep).
- **WHY IT MATTERS:** This is the same class of fault the migration set out to close: a green scheduler with nothing reconciled.
- **THE FIX:** (amended in pass two)
  - *Pass-one fix, retained:* 
    - Replace the time test with: `previous_status is null and previous_at < now() - interval '2 minutes'` → `no_reply` (alert).
    - Match `'%"ok":true%'`.
    - Raise pg_net's timeout to 120 seconds, or make the route return 202 and write its verdict to a table the job reads.
    - Return `truncated: rows.length === maxPages*100` and alert on it.
    - Drop the Vercel cron entry, or give it `?apply=1`, so one scheduler owns the job.
  - *Pass-two amendments:*
    - pg_net records `timed_out` and `error_msg` on `net._http_response`. Judge with `r.timed_out or r.error_msg is not null or r.id is null` rather than inferring from a null status plus a clock comparison.
- **EFFORT:** 3 hours.
- **PASS TWO:** CONFIRMED — fix amended (use pg_net's own `timed_out`/`error_msg`). Reviewer read live `request_money_reconciliation` (verdict `when previous_at > now() - interval '1 hour' then 'no_reply' else 'aged_out'`; body test `like '%"ok"%'`; `timeout_milliseconds := 30000`) and showed the coin flip is real on live timings: cron starts at 19:47:00.152 and 20:47:00.259 UTC (`cron.job_run_details`, job 33), so a missing reply at 20:47:00.259 would have read `aged_out`, which is silent. The job is healthy right now (`reconciliation_watch.last_verdict = ok_200`, body `{"ok":true,"apply":true,…"reason":"clean"…}`).

#### MON-14 | MONEY/FEES | MEDIUM | Processor fees on top-ups are paid by Vallo and recorded nowhere
- **WHAT IS WRONG:** A ₦10,000 top-up charges the member ₦10,000 and credits ₦10,000. Paystack keeps its fee, about 1.5% + ₦100 and capped, from Vallo's settlement. The webhook's funding handler ignores `data.fees`. There is no platform fee or loss account. Result: the sum of wallet liabilities exceeds Vallo's Paystack balance by every fee ever paid, and nothing reconciles liability against the processor balance. The booking path does record `processor_fee_minor` and gives it to the host, so the two paths are inconsistent. The same applies to the ₦100 card-save top-up.
  - (added in pass two) `decomposeCharge` (`settlement.ts:114-126`) makes the host bear the card fee (`agent = gross - platform - processor`), while `pay_booking_from_wallet` records `processor_fee_minor = 0`. So a host is paid more for the same stay when the guest pays from the wallet, whose fee Vallo already absorbed at top-up.
- **WHERE:** `apps/web/src/app/api/paystack/webhook/route.ts`, `handleFundingChargeSuccess` (no fee use); `apps/web/src/lib/bookings/settlement.ts:104-128` (booking fees handled).
- **EVIDENCE:** Code read. `WebhookEvent.data.fees` is declared and read only in the booking handler.
- **WHY IT MATTERS:** It is a guaranteed float shortfall that grows with volume. Top-up then wallet-send then (future) withdraw is a loop that costs Vallo a fee every time around.
- **THE FIX:** Founder decision (below). Either pass the fee to the payer, by charging `amount + fee` via Paystack's `bearer` or by computing the fee, or absorb it but record `processor_fee_minor` on every funding into a `platform_costs` table. Then add a daily check: Σ wallet balances + Σ pots + escrow float ≤ Paystack balance.
- **EFFORT:** Half a day to record the fee. 1 day to pass it on, including copy.
- **PASS TWO:** CONFIRMED, and the reviewer added an inconsistency (now in WHAT IS WRONG). Reviewer: the funding handler never reads `data.fees`; `route.ts:350` reads it only for bookings; there is no `bearer` anywhere in `lib/payments/paystack.ts`.

#### MON-15 | MONEY/COPY | MEDIUM | "Refunds reach your wallet in 3 to 5 business days" is on the send page, is enforced by nothing, and is untrue
- **WHAT IS WRONG:** The send page's trust list says "Refunds reach your wallet in 3 to 5 business days." Every refund path posts an instant `COMPLETED` credit: `refund_and_cancel_booking` and `escrow_settle`. Wallet-to-wallet sends are not refundable at all: the same list says "A completed send cannot be recalled". No card-refund path exists, and nothing times or chases a refund.
- **WHERE:** `packages/i18n/src/locales/en.ts:4748`; `apps/web/src/components/app/wallet/SendFlow.tsx:761`; `supabase/migrations/20260805102702_support_can_cancel_a_paid_stay_and_the_money_comes_back.sql` (refund inserted `'COMPLETED'`).
- **EVIDENCE:** Live `/wallet/send` as the QA member printed: "A completed send cannot be recalled. Only the person you paid can send it back. / Refunds reach your wallet in 3 to 5 business days."
- **WHY IT MATTERS:** It is a false financial promise on the screen where money leaves, and it contradicts the line above it and the cancellations page ("fastest route available").
- **THE FIX:** Delete `trustRefund`, or replace it with "A refund from a cancelled stay lands in your wallet the moment support approves it." If a real service level is wanted, store `refund_requested_at`, alert when a refund request is older than 3 business days, and show that promise only where the timer exists.
- **EFFORT:** 30 minutes for the copy.
- **PASS TWO:** CONFIRMED. Reviewer: `packages/i18n/src/locales/en.ts:4748` `trustRefund: "Refunds reach your wallet in 3 to 5 business days."`, rendered at `SendFlow.tsx:761`; live `refund_and_cancel_booking` inserts the refund as `'COMPLETED'` immediately.

#### MON-16 | PRINTING AND SAVING | MEDIUM | A member cannot get a receipt, statement or agreement out as a document
- **WHAT IS WRONG:** The receipt screen (`/wallet/transactions/[id]`) offers only "Copy reference" and "Share". The shared text is `"<kind> · <date> · <reference>"`, which has **no amount, no counterparty and no Vallo identity** (RC number, address), so it proves nothing to a landlord.
  - **Also missing:**
  - no print stylesheet for receipts, no PDF, no download;
  - the Capacitor shell has no print path;
  - the "full statement" is silently capped at the newest 100 entries (`STATEMENT_LIMIT = 100`) with no paging or export;
  - no document exists for a tenancy, escrow agreement or booking confirmation that a person can keep.
- **WHERE:** `apps/web/src/components/app/wallet/ReceiptActions.tsx`; `apps/web/src/components/app/wallet/Receipt.tsx:192-195`; `apps/web/src/lib/wallet/repository.ts:27`; `apps/web/src/app/(app)/wallet/transactions/page.tsx`. No hit for `window.print|application/pdf|jspdf|pdf-lib|react-pdf` outside admin evidence.
- **EVIDENCE:** Live as the QA member: `/wallet/transactions` shows "No transactions yet" (correctly empty). `/wallet/transactions/00000000-0000-4000-8000-000000000000` and `/not-a-uuid` both render "No such receipt … not yours to read", which is correct and leaks nothing. There is no member with a real entry, so a populated receipt could not be rendered live.
- **WHY IT MATTERS:** Nigerian tenants are routinely asked for proof of payment. Today the answer is a screenshot.
- **THE FIX:**
  - Add `GET /api/receipts/[entryId].pdf` (server-side, RLS-scoped read, then a PDF built with `pdf-lib` from cdn or npm). It carries the amount, date and time (Africa/Lagos), kind, counterparty display name, reference, property, and "VALLO SPACES LTD, RC 9870413".
  - Put the amount and parties into the share text.
  - Add `@media print` rules for `Receipt`.
  - Add statement export (CSV/PDF by month) with paging past 100.
  - On native, open the PDF through `@capacitor/share` or Filesystem.
- **EFFORT:** 2 to 3 days.
- **PASS TWO:** CONFIRMED. Reviewer: `STATEMENT_LIMIT = 100` (`repository.ts:27`); `ReceiptActions.tsx` has no print or PDF.

#### MON-17 | MONEY/ARITHMETIC | LOW | A payment-request link rounds the kobo away
- **WHAT IS WRONG:** ReceiveCard builds `?amount=` with `String(Math.round(kobo / 100))`. A request for ₦5,000.50 produces a link carrying `amount=5001`, while the share text beside it says ₦5,000.50. The payer is pre-filled with the wrong figure. `canonicalNaira` (AmountField.tsx:23) has the same drop, but it is fed only whole-naira presets.
- **WHERE:** `apps/web/src/components/app/wallet/ReceiveCard.tsx:59`.
- **EVIDENCE:** Code read. `parseNairaToKobo("5000.50")` = 500050, and `Math.round(500050/100)` = 5001.
- **WHY IT MATTERS:** Payers overpay or underpay by up to 50 kobo, and the text and the link disagree.
- **THE FIX:** Use `koboToNairaInput(kobo)` (it already exists in `lib/agent/listings-schema.ts:488`), or pass `amount_minor=<kobo>`.
- **EFFORT:** 30 minutes.
- **PASS TWO:** CONFIRMED. Reviewer: `ReceiveCard.tsx:59` `params.set("amount", String(Math.round(kobo / 100)))`.

#### MON-18 | MONEY/POTS | LOW | Moving money into or out of a pot has no idempotency key
- **WHAT IS WRONG:** Every pot move mints a fresh `rm-pot-<uuid>` reference, and no form key is passed. A double tap moves the money twice.
- **WHERE:** `apps/web/src/lib/wallet/pot-actions.ts:175`.
- **EVIDENCE:** Code read.
- **WHY IT MATTERS:** It is the member's own money, so nothing is lost, but it is wrong and confusing.
- **THE FIX:** The same key pattern as SendFlow, with the reference derived from the key.
- **EFFORT:** 1 hour.
- **PASS TWO:** CONFIRMED. Reviewer: `pot-actions.ts:175` `` `${POT_PREFIX}${randomUUID()}` ``.

#### MON-19 | MONEY/CRYPTO | LOW | The Yellow Card webhook credits whatever amount it is told, from a float, in any currency
- **WHAT IS WRONG:** `parseWebhook` reads `Number(row.amount)` and credits `Math.round(amount*100)` kobo. It does not check `currency`, and it does not compare the amount with what `startCryptoDeposit` requested. If the provider ever reports USDT, or a partial settlement, the wallet is credited that number as naira. The seam is marked "confirm against live docs when keys arrive".
- **WHERE:** `apps/web/src/lib/payments/yellowcard.ts:285-310`.
- **EVIDENCE:** Code read. I did not verify whether Yellow Card keys are configured live.
- **WHY IT MATTERS:** The wallet could be credited in the wrong currency, or for an amount nobody paid.
  - *Pass one marked this UNVERIFIED; pass two verified it is dormant: Yellow Card keys are not set in production.*
- **THE FIX:** Record the requested `amount_minor` against the `rm-yc-` reference at start. In the webhook, require `currency === "NGN"`, credit `min(settled, requested)`, and alert on any mismatch.
- **EFFORT:** 2 hours.
- **PASS TWO:** CONFIRMED, and dormant (now verified). Reviewer: `parseWebhook` (`yellowcard.ts:282-310`) has no currency check and uses `Math.round(amount*100)`; live `POST https://www.vallospaces.com/api/yellowcard/webhook` → `HTTP 500 {"received":false,"reason":"unconfigured"}` (an empty secret makes `verifyWebhookSignature` return false). LOW is right. Side note: "unconfigured" answers 500; if that is not deliberate (so the provider retries), use 503.

#### MON-20 | MONEY/COPY | LOW | The funding check tells people with an unknown reference to wait for money that will never come
- **WHAT IS WRONG:** `verifyFunding` answers every `verifyTransaction` error, including "reference not found", with "The payment could not be checked just now. If you completed it, your balance updates automatically in a moment."
- **WHERE:** `apps/web/src/lib/wallet/actions.ts` (`verifyFunding`, the first catch).
- **EVIDENCE:** Live: `/wallet?funded=1&reference=rm-fund-00000000-0000-4000-8000-000000000000` as the QA member rendered exactly that sentence.
- **WHY IT MATTERS:** It sends someone to wait for a credit that cannot arrive.
- **THE FIX:** On `PaystackError.status === 404` or 400, say "We have no payment under that reference. Nothing was charged."
- **EFFORT:** 30 minutes.
- **PASS TWO:** CONFIRMED. Reviewer: `actions.ts:1372`, with the exact sentence.

#### NEW IN PASS TWO

#### MON-P2-01 | MONEY/FEES | MEDIUM | Commission is priced when money is released, not when it is agreed, and one admin can set it to 100% of money already held
- **WHAT IS WRONG:**
  - `private.escrow_settle` computes the commission with `private.compute_fee('commission', e.amount_minor, now())`, at **release** time. So a rate set after both parties agreed and funded applies to money already held. The only purpose that permits commission is `agency_fee`, which is also the only purpose that can be opened.
  - `fee_rates` allows `basis_points` up to 10000 (100%), and `compute_fee` caps the fee at the amount, so the payee can receive ₦0.
  - `public.set_fee_rate` is granted to `authenticated` and checks only `has_role(admin|super_admin)`. That means one admin, on a password with no second factor, from a browser console, and effective in one minute: `cannot_backdate` only refuses a start more than 1 minute in the past.
- **WHERE:** live `private.escrow_settle` (`fee := private.compute_fee('commission', e.amount_minor, now())`); live `private.compute_fee` (`if fee > p_amount_minor then fee := p_amount_minor`); live `public.set_fee_rate`, acl `{postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}`; constraint `CHECK ((basis_points >= 0) AND (basis_points <= 10000))`; `lib/admin/money-actions.ts` `setFeeRate`.
- **EVIDENCE:** Bodies and acl read from live `pg_proc` on 2026-09-23. Current `fee_rates` rows are commission 0 bps / ₦0 flat and listing_fee 0 / 0, both effective 1970-01-01. Nothing was executed: setting a rate would mutate production.
- **WHY IT MATTERS:** An agent who agreed to a zero-commission hold can have part or all of the fee taken by a rate change made during the hold. That is a retroactive change to a money agreement, and a single-admin lever over held funds.
- **THE FIX:**
  - Snapshot the rate at funding: in `escrow_fund_proposal_as`, write `commission_rate_id` and the computed `commission_minor` for the agreed amount.
  - In `escrow_settle`, use the stored figures, not `now()`.
  - Show the commission to both sides on the proposal.
  - Cap `basis_points` at a sane ceiling (e.g. 2000) in `private.set_fee_rate`, and require super_admin for any rise.
  - Revoke `set_fee_rate` from `authenticated` behind a service-role `_as` door once MFA exists.
- **EFFORT:** 3 hours.
- **PASS TWO:** NEW IN PASS TWO (found by the reviewer, A02). Live `pg_proc` bodies and acl read; nothing executed (setting a rate would mutate production).

#### MON-P2-02 | MONEY/REFUNDS | HIGH | A paid stay cannot be refunded once it is CANCELLED, NO_SHOW or COMPLETED, and refunds cannot be partial without cancelling
- **WHAT IS WRONG:** The only refund door, `private.refund_and_cancel_booking`, is refund-and-cancel in one act.
  - It returns `already_cancelled` for a CANCELLED booking.
  - It **raises** for COMPLETED or NO_SHOW, because `update … where status in ('PENDING','CONFIRMED')` then `if not found then raise exception 'booking % could not be cancelled from %'`.
  - So these cases have no refund path at all:
  - a card charge that settles after the 48h sweep cancelled the booking (MON-05);
  - a host who marks a paid guest NO_SHOW at 00:01 on arrival day (ESC-04);
  - a stay that ended and turned out not as listed;
  - a duplicate charge on a completed stay;
  - any goodwill partial refund on a stay that goes ahead.
- **WHERE:** live `private.refund_and_cancel_booking` (quoted above; `public.refund_and_cancel_booking` is service-role only).
- **EVIDENCE:** Body read from live `pg_proc` on 2026-09-23. No other function writes a `refund` wallet entry for a booking. I searched live `pg_proc` for `'refund'` credits: only this function and `escrow_settle`.
- **WHY IT MATTERS:** Each of these is a real support case. The operator's only options are "service down" or hand-editing the ledger with the service key, and there is no append-only guard (MON-10) to stop that.
- **THE FIX:** Split the door.
  - Add `private.refund_booking_payment(acting_admin, booking, amount, reference, reason, note)`. It locks the booking, bounds the refund by `sum(SUCCESSFUL transactions) - sum(booking_refunds.refund_minor)` (cumulative, not per call), appends the `refund` credit, the negative `ledger_entries` row and the `booking_refunds` row, and works in any status.
  - Keep cancellation as a separate state change.
  - Surface both on the admin bookings desk.
- **EFFORT:** 1 day.
- **PASS TWO:** NEW IN PASS TWO (found by the reviewer, A02). Live body of `private.refund_and_cancel_booking` read; a search of live `pg_proc` for `'refund'` credits found only this function and `escrow_settle`. Related: ESC-P2-02 (tenancies lose the refund path), MON-05 (late/duplicate charges).

#### MON-P2-03 | MONEY/WEBHOOK | MEDIUM | The only real top-up ever was credited 16h44m late, by the reconciler, not by the webhook or the redirect
- **WHAT IS WRONG:**
  - The one real deposit reads `paid_at: 2026-08-09T01:26:26Z` in metadata, but was written at `2026-08-09 18:10:06Z` with `metadata.recovered_by: "sweep"`.
  - Its audit trail is a single `wallet.funding.recovered` at 18:10:06, one second before the **first ever** `wallet.reconciliation.run`, at 18:10:07.
  - Neither the Paystack `charge.success` webhook nor `verifyFunding` on the redirect credited it.
  - In the whole `audit_log` there is no row showing a webhook- or redirect-driven funding credit. Agent 1 lists "the webhook and the verify race cleanly" as sound, but production has never demonstrated either path working.
- **WHERE:** live `wallet_entries` (reference `rm-fund-59cbcc…`); `audit_log` grouped by action: `wallet.reconciliation.run` 530, `wallet.funding.started` 2, `wallet.funding.recovered` 1, `wallet.withdrawal.hold_placed` 1, `wallet.withdrawal.not_started` 1.
- **EVIDENCE:** The queries above, read-only. The route is alive and holds a key today: `POST https://www.vallospaces.com/api/paystack/webhook` with a bad signature → `HTTP 401 {"received":false,"reason":"signature_invalid"}`. **UNVERIFIED:** whether the webhook URL is registered in the Paystack dashboard for the live key. I cannot see that from here, and that is the most likely cause.
- **WHY IT MATTERS:**
  - If the webhook URL is not registered, every top-up whose tab closes before the redirect waits up to an hour for the reconciler.
  - Every booking card payment likewise waits up to an hour for its CONFIRMED state, while the 48h hold keeps ticking.
  - The reconciler only looks back 48h (`hours=48`), so anything older than 48h at the time the reconciler first runs is never recovered.
  - *Severity note (pass one's heading said "MEDIUM (UNVERIFIED cause)"):* UNVERIFIED cause.
- **THE FIX:**
  - Founder: confirm the webhook URL in the Paystack dashboard (live mode) is `https://www.vallospaces.com/api/paystack/webhook`, and send a test event.
  - Code: make every recovery by the reconciler (`wallet.funding.recovered` or a booking heal) open a `risk_alerts` row, "the webhook missed this", because a recovery is proof the primary path failed.
  - Have the webhook write an audit row on every credited funding, so the question can be answered from the database.
  - (from OPS-P2-04, A10's ops-side restatement) Any `recovered` funding or unsettled booking charge raises a `payment.webhook.missed` alert at **critical** (today the reconcile outcome goes out at `warning`, `app/api/paystack/reconcile/outcome.ts:39`). After the founder registers the webhook in the Paystack dashboard, one test event from that dashboard must show a webhook-actor funding row.
- **EFFORT:** 1 hour of code plus 10 minutes in the dashboard.
- **PASS TWO:** NEW IN PASS TWO (found by the reviewer, A02). Read-only queries of live `wallet_entries` and `audit_log`; `POST /api/paystack/webhook` with a bad signature → `HTTP 401 {"received":false,"reason":"signature_invalid"}`. Absorbs OPS-P2-04 (MERGED INTO this ID; A10 asked for MON-P2-03 to stay the primary ID). Whether the webhook URL is registered for the live key is UNVERIFIED.

#### CHECKED AND FOUND SOUND

- **Kobo types.** 101 `bigint` money columns, no `int4`. ₦500,000,000 = 50,000,000,000 kobo fits `bigint`, and JS `Number.isSafeInteger` holds to about ₦90 trillion. `compute_fee` is bigint `(amount*bps)/10000 + flat`, truncating: 5e10 × 10000 = 5e14, no overflow. SQL `to_char` formats up to ₦999bn.
- **Edge values at the wallet boundary.** `MIN_MOVE_KOBO = 10_000` (₦100) and `MAX_MOVE_KOBO = 1_000_000_000` (₦10m). An amount of 0, 1 kobo or 999 kobo is refused. Parsing is regex-bounded to two decimals, and `Math.round(naira*100)` is exact inside that bound. Database checks: `amount_minor > 0`, and `balance_minor >= 0` on pots.
- **Money RPCs are refused for signed-in users, proved over the wire as the QA member.** `transfer_between_wallets`, `hold_wallet_withdrawal`, `move_into_pot`, `pay_booking_from_wallet`, `escrow_hold`, `wallets_overdrawn` and `stale_withdrawal_holds` all return `403 42501 permission denied for function …`. Control in the same session: `admin_expire_stale_withdrawal_holds` returned `200 {"status":"forbidden"}`, so the JWT did reach the database.
- **Direct client writes are refused by RLS** (with the caveat in MON-10). Wallet, entry and pot inserts return `42501 new row violates row-level security policy`. The member cannot read other wallets: `GET /wallets`, `/wallet_balances` and `/wallet_entries` return `range=*/0`.
- **Locks.** Transfer, booking-from-wallet, withdrawal hold, pots, escrow fund and escrow settle all take `FOR UPDATE` on the wallet (or escrow) row before reading spendable, and write both legs of a transfer in one INSERT.
- **Webhook authentication.** HMAC-SHA512 is compared with `timingSafeEqual` before any database work. It answers 401 on a bad signature, 503 when a key is missing (so Paystack retries), and 500 when a write fails. Replays are idempotent on the unique `reference`.
- **Top-up flow.** The top-up is initialised server-side (amount and `metadata.user_id` come from the session). `verifyFunding` on redirect and the webhook race cleanly: the loser is a `duplicate`.
- **Escrow float and invariants are scheduled and clean live.** `escrow_float_snapshots` for 2026-09-23 shows `difference_minor: 0`.
- **The reconciler runs hourly and records its runs** (the `audit_log` rows quoted in MON-13).
- **Commission.** Integer maths, and it is zero today. A refund charges no commission.

*Pass-two note:* the "webhook and verify race cleanly" line is contested by MON-P2-03 — production has never shown either path crediting a top-up; the only real top-up was credited by the reconciler 16h44m late.

#### CORRECTLY EMPTY vs BROKEN

| Screen (live) | Account | State | Verdict |
|---|---|---|---|
| `/wallet` | member & admin | ₦0.00, "Nothing has moved through your wallet yet" | CORRECTLY EMPTY: neither QA account has a `wallets` row (`GET /wallets` → `[]`). |
| `/wallet/transactions` | member | "No transactions yet" | CORRECTLY EMPTY: same reason. |
| `/wallet/transactions/<unknown id>` | member | "No such receipt" | CORRECT refusal: no leak for another person's id or for a malformed id. |
| `/wallet/send` | member | Available ₦0.00, form renders | Works, but the "3 to 5 business days" copy is false (MON-15), and "Available" is the settled figure (MON-06). |
| `/wallet/receive` | member | handle, email, request link | Works. Kobo rounding in the link (MON-17). |
| `/settings/payments` | member | "No card or bank account saved yet" | CORRECTLY EMPTY. |
| `/escrow` | member | "Nothing is set aside" | CORRECTLY EMPTY: zero escrows ever (float snapshot `escrow_count: 0`). |
| `/bookings` | member | "Nothing booked yet" | CORRECTLY EMPTY: zero real bookings. Example listings refuse transactions. |
| `/rent` | member | 64 example cards | CORRECTLY populated with examples. Aside for another agent: the cards say "Listed by RentMe Example Collection", the old brand name. |
| `/wallet?funded=1&reference=<unknown>` | member | "could not be checked … updates automatically" | Misleading copy (MON-20). |
| Withdraw | member | not drawn | By design, but it leaves money trapped (MON-04). |

#### NOT COVERED

- **Live function bodies, grants and `cron.job`.** Not read from the catalogue: the MCP cannot reach the live project `uccixoonmbhrnyczyigt`. Bodies were rebuilt from migrations, and three of those migrations regex-rewrite live bodies. Grants were proven only for the functions probed over the wire.
- **Populated screens.** No QA account has a ledger entry, so I did not render a populated receipt, the pot UI with money, the balance breakdown sheet, the "Add money" sheet with a real Paystack popup, or the withdrawal sheet. I moved no money: I opened no Paystack checkout and made no pot.
- **Paystack behaviour** was not checked against its API (for example whether `/transfer/verify` of an unknown reference returns 404, which `sweepStaleWithdrawalHolds` relies on to release orphans; if it returns 400 instead, orphan holds stay `PENDING` for ever). Also not checked: whether transfers need OTP, and whether the live key is live or test.
- **Other areas I only skimmed:**
  - escrow dispute and ruling flows beyond `escrow_settle`, `escrow_hold` and the invariants;
  - the rent-charge SQL (`open_rent_charge`);
  - admin money desks other than the hold sweep;
  - the Yellow Card start path and whether its flag is on.
- **The admin "Naira transacted: ₦0 over 12 months" tile** ignores the real ₦1,000 top-up of 9 August. Whether that tile is meant to count bookings only was not established.
- **Load and concurrency** were reasoned from the SQL. No concurrent requests were fired.

*Pass-two note:* the first bullet is superseded — the MCP does reach the live project; the reviewer read the live bodies of `expire_stale_withdrawal_holds`, `admin_expire_stale_withdrawal_holds`, `move_into_pot`, `move_out_of_pot`, `wallet_spendable_locked`, `wallet_balance`, `account_deletion_blockers`, `request_money_reconciliation`, `claim_idempotency`, `refund_and_cancel_booking`, `compute_fee` and `set_fee_rate`, and all 14 `cron.job` rows. Pass two was read-only except two `POST`s with a bad signature to the two webhook routes.

#### FOR THE FOUNDER

1. **Payout day checklist (Registered Business upgrade).** Before switching payouts on:
   - MON-01, MON-02 and MON-03 must be fixed.
   - The withdraw form must mint an idempotency key.
   - The withdraw tile goes back in `WalletDeck.tsx`.
   - The Paystack OTP requirement on transfers must be disabled, or handled (`initiateTransfer` returns `status:"otp"` and nothing finalises it).
   - An actual agent or host payout job must be built. Today `ledger_entries.agent_share_minor` records what hosts are owed, and nothing ever pays it, credits a host wallet, or reconciles it. Stay and rent money collected by card settles into Vallo's Paystack balance with no path out to the lister.
2. **Money in, no money out (MON-04).** Decide now: either stop taking top-ups and refund cards to cards, or publish, and staff, a manual cash-out promise. The Terms and cancellations page must match whichever you choose.
3. **Who pays the Paystack fee on top-ups (MON-14).** Charge it to the member, or absorb it and book it as a cost. Either is fine; unrecorded is not.
4. **Rent through Vallo vs the Terms.** Terms §5 says "no money for [a tenancy] passes through Vallo". The rent-pay flow (`/rent/pay/[inspectionId]`, `lib/rent/actions.ts`) collects the move-in total through the booking checkout. One of the two has to change before the first real rental is published. The licensing concern in the removed bank-send code (holding and moving third parties' funds) applies here too.
5. **Receipts (MON-16).** Confirm the legal identity lines a receipt must carry (RC 9870413, registered address, TIN if VAT ever applies) so the PDF can be built once.

#### CLEANUP NOTES

- Pass two (A02): a QA account created a pot at 20:37:20 UTC and archived it at 20:37:42 UTC on 2026-09-23, balance 0. It was not the reviewer; it matches the pot A04 records creating (`47925737-…`, "QA A04 probe", see `merged/A04-security.md` CLEANUP). Harmless, but on the cleanup list.
- No credentials appear in either source file.

---

### A02 — ESCROW, END TO END (+ TIME, + the stays double-booking constraint): merged pass one + pass two

Sources: `pass1/A02-escrow.md` (Audit Agent 2, taken 2026-09-23 19:40–20:30 UTC at HEAD `85c5471`) and its pass-two review `pass2/R-A02-by-A01.md` (Audit Agent 1). Pass two used read-only SQL on the live project plus four rolled-back `apply_migration` probes, each ending in `raise exception 'ROLLED BACK ON PURPOSE …'`; a read-back proved nothing survived (`escrows 0`, `bookings 0`, `wallets 1`, `wallet_entries 2`, `transactions 0`, listing `ed…0003` still `is_demo = true`, no probe migration recorded, no notifications in the last 10 minutes).

Pass-two tally: 14 confirmed (4 by execution: ESC-01, 02, 04, 08), 3 severity changes (ESC-05 HIGH→MEDIUM, ESC-10 MEDIUM→LOW, ESC-12 MEDIUM→LOW), 1 withdrawn as a duplicate (ESC-18 → MON-10), 3 new findings.

#### DANGER NOW

**None that moves money today.** Everything below that loses money needs one of: the `held_payments` flag row to exist (it does not: `select * from feature_flags` has no such key), an escrow row to exist (there are 0), or a real, non-example listing to exist (there are 0; the demo trigger refused my over-the-wire insert).

**One item arms itself with no further code change: ESC-02.** The first real stay listing published makes it live. A signed-in guest can then write their own nightly price into `bookings` through PostgREST and pay that price. It must be fixed before the first real stay listing goes live, not before launch day.

*Pass-two note:* ESC-02 was executed in pass two (3 nights at ₦255,000 CONFIRMED for 3 kobo) and is now the canonical ID for the guest-priced booking defect (it absorbs SUP-03, DB-P2-01 and SEC-P2-01). It remains latent until the first real stay listing.

#### FINDINGS (pass one, with pass-two verdicts)

#### ESC-01 | ESCROW | CRITICAL | A dispute on a never-funded proposal, once ruled on, credits the full amount from nothing
- **WHAT IS WRONG:**
  - `escrow_raise_dispute_as` accepts `INITIATED`, which is legal in the transition table.
  - `escrow_admin_resolve` checks only `state = 'DISPUTED'`.
  - `private.escrow_settle` credits `e.amount_minor` to the payer (refund) or the payee (release, minus commission) without checking that an `escrow_hold` debit was ever posted.
  - So a proposal for any amount (no max), disputed before funding and then ruled on either way, mints naira into a wallet. That wallet can then spend it or transfer it wallet-to-wallet.
- **WHERE:** live `public.escrow_raise_dispute_as` (`if e.state not in ('INITIATED','FUNDED','HELD','RELEASE_REQUESTED')`); live `public.escrow_admin_resolve`; live `private.escrow_settle` (no hold check before `insert into public.wallet_entries ... 'credit', net`). Migrations: `supabase/migrations/20260923013000_a_ruling_is_twenty_characters_and_reaches_both_parties_verbatim.sql`, `20260922221000_escrow_the_seven_remaining_fixes_before_any_product.sql`.
- **EVIDENCE:**
  - Transition table, verbatim from `pg_proc`: `('INITIATED', 'DISPUTED'), ... ('DISPUTED', 'RESOLVED')`.
  - The team already knows the row can be unfunded. From `private.escrow_float_components`, verbatim: *"`INITIATED -> DISPUTED` is a legal transition and an agreement can therefore reach DISPUTED having never taken a single kobo out of anybody's balance. Counting it would put money in the float that the ledger has never seen."* The float excludes such rows, but settle does not.
  - `escrow_settle` refuses only `('RELEASED','REFUNDED','RESOLVED','CANCELLED')`. DISPUTED passes, and it inserts the credit.
  - Reachability: the UI offers dispute only on HELD/RELEASE_REQUESTED (`components/app/escrow/HeldPaymentControls.tsx:116`). But `disputeHeldPayment` in `lib/escrow/actions.ts:212` is a public server action with no state or kill-switch check, so any party can POST it for an INITIATED id.
  - The admin desk's held total counts every DISPUTED row, funded or not (`lib/admin/reads/escrow.ts:190`), so the operator sees "held ₦X".
  - Detection exists only after the fact: `escrow_invariants_check` I-2 would see ledger float −X vs escrow float 0 at the next :23 run.
  - **Execution UNVERIFIED.** A rolled-back `DO` probe (propose ₦5,000,000 → dispute → admin refund → count holds/credits → `raise exception`) was refused by this session's permission classifier. The proof is the three live bodies above.
  - **Pass two executed it (A01, rolled-back probe):** insert an INITIATED escrow of ₦5,000,000 (payer = QA member, payee = QA admin, no hold) → `public.escrow_raise_dispute_as(payer, id, …)` → with `request.jwt.claims` set to the admin, `public.escrow_admin_resolve(id,'refund', …)`; control inside the block: `private.has_role(admin,'admin')` must be true. Result, verbatim:
    ```
    dispute={"state": "DISPUTED", "status": "ok", ...} | resolve={"state": "RESOLVED", "status": "ok", "direction": "refund", "net_minor": 500000000, "gross_minor": 500000000, ...} | holds=0 | credited_minor=500000000 | payer_balance_now=500000000 | float={... "difference_minor": -500000000, "ledger_float_minor": -500000000}
    ```
    ₦5,000,000 minted into a wallet that never paid anything in. Reach: live `escrow_propose_as` lets either party create the INITIATED row (`p_actor_pays` false makes the counterparty the payer), and `disputeHeldPayment` (`lib/escrow/actions.ts:211`) has no state or kill-switch check, so one person with two accounts needs only one admin ruling in either direction.
- **WHY IT MATTERS:** Unbounded money creation for anyone who can get one ruling (honest operator error, or collusion). It is latent only because `held_payments` is closed.
- **THE FIX:** (amended in pass two)
  - *Pass-one fix, retained:* 
    1. Remove `('INITIATED','DISPUTED')` from `escrow_transition_is_legal`.
    2. Change `escrow_raise_dispute_as` to accept only `('HELD','RELEASE_REQUESTED')`, plus FUNDED only when a hold exists.
    3. Defence in depth in `escrow_settle`, right after the lock: `if not exists (select 1 from wallet_entries where kind='escrow_hold' and status='COMPLETED' and metadata->>'escrow_id'=e.id::text) then return jsonb_build_object('status','never_funded'); end if;`
    4. Map `never_funded` in `lib/admin/money-actions.ts`.
    5. Add a P-8c probe that attempts exactly this path and must end with zero credits.
  - *Pass-two amendments:*
    - Step 3, the `never_funded` guard in `escrow_settle`, is the load-bearing part. It must key on `kind='escrow_hold' and status='COMPLETED'`, as written.
    - The same phantom shows in two reads, which should not count a DISPUTED row with no hold as held money: the member's balance breakdown (`lib/wallet/breakdown.ts` `HELD_STATES` includes DISPUTED, so the payer would see "₦5m held out") and the admin desk total.
    - Run the float check before any ruling: `escrow_admin_resolve` can call `escrow_float_components()` and refuse when a ruling would push the difference below zero.
- **EFFORT:** 3–4 hours including the probe.
- **PASS TWO:** CONFIRMED (by execution) — fix amended. CRITICAL stands: latent while `held_payments` is closed, but the rolled-back probe proves unbounded money creation (₦5,000,000 credited with zero holds; float difference −500000000), so it must block the flag. Amendment: the `never_funded` guard in `escrow_settle` is the load-bearing step; the phantom must also be excluded from reads that count DISPUTED as held; run the float check before any ruling.

#### ESC-02 | STAYS / MONEY | CRITICAL | A guest writes their own nightly price into `bookings`, and payment charges that price
- **WHAT IS WRONG:**
  - Bookings are inserted under the guest's own RLS client.
  - The insert policy checks only `auth.uid() = guest_id AND status = 'PENDING'`, and `authenticated` holds INSERT on every column.
  - The check constraints only demand internal consistency (`subtotal = price × nights`, `total = subtotal + fees`), not that the price is the listing's.
  - `pay_booking_from_wallet` (and the card path via `lib/bookings/checkout.ts:308/408/533`) charges `booking_row.total_minor` from that row and moves it to CONFIRMED.
  - The same direct insert also skips the server action's past-date check (`lib/bookings/schema.ts:82`), the availability/host-blocked-dates check, min-stay, max-guests and the money rate limiter.
- **WHERE:**
  - Policy `bookings_guest_insert`.
  - Grants: `has_column_privilege('authenticated', bookings, *, 'INSERT')` is true for all 21 columns, including `price_per_night_minor` and `total_minor`.
  - `apps/web/src/lib/bookings/actions.ts:279-300` (the price is computed server-side but written by the guest's client).
  - Live `private.pay_booking_from_wallet`.
  - (from SUP-03 / DB-P2-01 / SEC-P2-01) Card checkout `lib/bookings/checkout.ts:227-270, 239-308, 408, 520-560` (`payWithWalletWork` reads `booking.total_minor` from the row and calls the RPC with the admin client; the card path initialises Paystack for the same stored `total_minor`). The server action `reserve()` computes the price correctly (`lib/bookings/actions.ts:216,264-296`), but nothing forces bookings to be created through it.
  - (from DB-P2-01) The only BEFORE triggers on `bookings` are `refuse_transaction_on_demo_listing` and `set_updated_at`; no trigger recomputes the price. Payment then upserts `availability` to `booked` (`on conflict … do update`) over nights that may already be sold.
- **EVIDENCE:** Over the wire as the QA member, 2026-09-23T20:25:44Z (`work/A02/booking_wire.log`):

  ```
  POST /rest/v1/bookings {price_per_night_minor:1,total_minor:2,check_in:"2026-01-01",status:"PENDING",listing_id:<nonexistent>}
  HTTP 409 {"code":"23503",...,"message":"insert or update on table \"bookings\" violates foreign key constraint \"bookings_listing_id_fkey\""}
  same, listing_id = example listing ed000000-...0003
  HTTP 400 {"code":"23514",...,"message":"This listing is an example of what the catalogue will hold..."}
  CONTROL, same row with status CONFIRMED
  HTTP 403 {"code":"42501",...,"message":"new row violates row-level security policy for table \"bookings\""}
  ```

  The control proves RLS is evaluated before the FK. The 1-kobo, past-dated row passed RLS and was stopped only by the missing or example listing. Nothing was written.
  - **Pass two, A01 (rolled-back probe; example listing `ed…0003`, ₦85,000/night, flipped to `is_demo=false` inside the transaction; acting as the QA member under `set local role authenticated`):**
    ```
    A(today,price1)=inserted P(past-dated)=inserted CONTROL_confirmed=42501 B(overlap)=23P01 C(adjacent)=inserted
    pay={"status": "ok", "amount_minor": 3, "confirmed_by_this_payment": true} A.status=CONFIRMED A.total=3
    ```
    Three nights listed at ₦255,000 were CONFIRMED for 3 kobo through `private.pay_booking_from_wallet`; a booking dated 10 days in the past was accepted; inserting with `status CONFIRMED` was refused by RLS.
  - **Pass two, A08 reviewing A03 (DB-P2-01, probe `audit_p2_a08_booking_price_probe3`):** a non-demo PUBLISHED shortlet at `rate_minor=15000000`/night and 1000 kobo in the QA member's wallet → `guest insert 7 nights total_minor=7 kobo: ACCEPTED` → `pay_booking_from_wallet -> {"status": "ok", "amount_minor": 7, "confirmed_by_this_payment": true, …} ; booking status=CONFIRMED`. A week worth ₦1,050,000 paid for 7 kobo.
  - **Pass two, A07 reviewing A04 (SEC-P2-01):** `SUP-03 guest-authored booking accepted, stored total_minor=2 vs listing rate 5000000 per night`.
  - **Pass two, A04 reviewing A07 (SUP-03):** a booking can also be written against an unpublished (DRAFT) listing: `GUEST DIRECT BOOKING total_minor=2 (2 kobo) on a listing it has not seen priced: ok`. `bookings_guest_insert` never checks `listings.status`.
- **WHY IT MATTERS:** On the first real stay listing, a guest books a week for ₦0.02, pays it, and holds a CONFIRMED stay. The host's ledger records ₦0.02. The guest can also book dates the host blocked, or dates in the past.
- **THE FIX:** (amended in pass two)
  1. Revoke INSERT on `public.bookings` from `authenticated` and `anon` — in the **same deploy** as the rewire below, because the only current writer, `lib/bookings/actions.ts:279`, inserts under the guest's RLS client; revoking first breaks booking.
  2. Move creation into a SECURITY DEFINER function — `public.reserve_stay_as(p_actor, listing, check_in, check_out, adults, children, arriving…)` (service_role only, called from `lib/bookings/actions.ts`), or an equivalent `create_booking(...)` RPC. It must:
     - refuse any listing that is not a PUBLISHED, non-demo **stay** listing with a nightly rate period (live `bookings` checks neither publication nor kind, and nothing enforces the `vallo.rent_charge` GUC — only `private.notify_booking_change` reads it — so today a direct insert creates a "booking" against a DRAFT, rent or sale listing at any price);
     - recompute `nights = check_out - check_in` (≥ 1) and every price column (`price_per_night_minor, cleaning_fee_minor, service_fee_minor, subtotal_minor, total_minor`) from `listings` / `rate_calendar` and the fee tables, ignoring client values;
     - refuse `check_in < (now() at time zone 'Africa/Lagos')::date`, host-blocked `availability` rows, already-booked nights and overlap with CONFIRMED bookings;
     - enforce min-stay and max-guests, and carry the ESC-03 / SUP-P2-02 limits (per-guest open-hold cap, maximum stay length, rate limit).
  3. Minimum alternative, or belt and braces: a BEFORE INSERT **and BEFORE UPDATE** trigger (e.g. `private.price_booking()`) that overwrites every price column from the same source the action uses — the rate calendar; copying a single nightly rate would reject legitimate weekend or seasonal prices — unless `vallo.rent_charge` is set (the pattern `open_rent_charge` already uses), and raises on a past check-in. BEFORE UPDATE matters because of ESC-P2-01 (admins can rewrite price over PostgREST).
  4. In `pay_booking_from_wallet` and the card path, re-derive the expected total and refuse on a mismatch, as defence in depth (see also MON-05 step 5).
  5. Change the `availability` upsert to `on conflict do nothing` and fail when a night is already booked.
  6. Probes: a direct REST insert as `authenticated` must answer 42501; the rolled-back price probe above must come out with `total_minor = nights × listing rate + fees`.
- **EFFORT:** 1 day (function, action rewire, probe, tests).
- **PASS TWO:** CONFIRMED (by execution) — fix amended. Absorbs SUP-03 (A07 pass one), DB-P2-01 (new in A08's review of A03) and SEC-P2-01 (new in A07's review of A04), all MERGED INTO this ID; every one was CRITICAL (latent), so CRITICAL stands. It arms itself on the first real stay listing, with no flag needed. Reviewer (A01) executed the attack in a rolled-back probe: 3 nights at ₦255,000 CONFIRMED for 3 kobo, a past-dated booking accepted, the CONFIRMED-status control refused 42501. Amendments: the definer function must check the listing's kind and publication; the fallback trigger must also run BEFORE UPDATE and price from the rate calendar; the revoke must ship in the same deploy as the rewire of `lib/bookings/actions.ts:279`; the booking RPC must refuse non-PUBLISHED and non-nightly listings (A04 via SUP-03).

#### ESC-03 | STAYS | HIGH | Any member can squat a host's whole calendar for free, renewable every 48 hours
- **WHAT IS WRONG:**
  - The exclusion constraint counts PENDING rows, and PENDING holds live 48 hours (`release_stale_booking_holds` → `expire_booking_holds(interval '48 hours')`; Vercel `hold-sweep` with `HOLD_TTL_HOURS = 48`).
  - Because of ESC-02, a member can POST PENDING rows directly, bypassing `guardMoney` and every server-side limit.
  - Enough adjacent rows block every night on a listing, and they can be re-posted when they expire.
- **WHERE:** constraint `bookings_no_overlap EXCLUDE USING gist (listing_id WITH =, during WITH &&) WHERE (status = ANY (ARRAY['PENDING','CONFIRMED']))`; policy `bookings_guest_insert`.
- **EVIDENCE:** Same wire run as ESC-02: an insert passes RLS with no rate limit in the path. The exclusion semantics were checked read-only: `daterange('2026-10-01','2026-10-03','[)') && daterange('2026-10-02','2026-10-04','[)')` → `true`. The actual squat was not executed (no real listing exists; live writes are not permitted).
- **WHY IT MATTERS:** A competitor can take a host off the market indefinitely at zero cost.
- **THE FIX:** (amended in pass two)
  - *Pass-one fix, retained:* 
    - The ESC-02 fix, which removes direct insert.
    - Inside the reserve function, cap open PENDING rows per guest (e.g. 3) and per guest per listing (1).
    - Shorten an unpaid instant-book hold to about 30 minutes. 48 hours is right only for request-to-book.
  - *Pass-two amendments:*
    - The per-guest cap is required even after ESC-02, because the squat also works through the legitimate server action.
    - Squatting also blocks rentals: `private.open_rent_charge` inserts a 1-night booking at `move_in` on the rental's `listing_id`. A squatted date makes that insert raise `23P01`, which nothing in the function handles, so the tenant sees a generic "could not be opened". In `open_rent_charge`, catch `exclusion_violation` and answer `date_taken`.
- **EFFORT:** 2–3 hours on top of ESC-02.
- **PASS TWO:** CONFIRMED — fix amended. Reviewer's rolled-back probe inserted unlimited PENDING rows from one guest back to back (C adjacent to A) with no rate limit anywhere in the database path. HIGH stands: the squat also works through the legitimate server action, only slower (`guardMoney`), so fixing ESC-02 alone does not close it. See also SUP-P2-02 (A04's review of A07: 365 nights held at ₦0 in a rolled-back probe) — the same abuse, filed separately; not merged here.

#### ESC-04 | STAYS | HIGH | A host can mark a paid stay NO_SHOW from 00:00 WAT on check-in day, which frees the nights for resale
- **WHAT IS WRONG:**
  - `record_booking_no_show` allows NO_SHOW once `check_in <= today` (Lagos date), so from 00:00 WAT on the arrival day, hours before any guest could arrive.
  - It deletes the `availability` rows.
  - NO_SHOW is **outside** the exclusion constraint's `WHERE`, so the same nights can immediately be booked again.
  - Nothing refunds or holds the first guest's payment.
- **WHERE:** live `private.record_booking_no_show` (`if bk.check_in > today then return 'not_arrived'`, then `update ... set status = 'NO_SHOW'`, then `delete from public.availability ...`); constraint `bookings_no_overlap`.
- **EVIDENCE:** Function body quoted above, read from `pg_proc` 2026-09-23. Constraint def: `WHERE ((status = ANY (ARRAY['PENDING'::booking_status, 'CONFIRMED'::booking_status])))`. Not executed (no real listing exists).
  - **Pass two executed it (A01, rolled-back probe):** the host user of the listing called `private.record_booking_no_show(A, host, …)` on the paid, CONFIRMED booking on the check-in day; then the member inserted a new PENDING booking over the same nights: `noshow={"outcome": "recorded"} E(resale of no-show nights)=inserted`.
- **WHY IT MATTERS:**
  - This is a double-sale of a paid stay by the host.
  - The guest learns of it from a notification, possibly at 00:01.
  - Their only remedy is "contact support".
- **THE FIX:** (amended in pass two)
  - *Pass-one fix, retained:* 
    - Allow NO_SHOW only after the listing's check-in time plus a grace period (for example, not before 12:00 WAT the day after check-in, or `check_in + check_in_time + 6h` in Lagos).
    - Keep the nights protected: either include `NO_SHOW` in the exclusion `WHERE` until `check_out`, or require an admin to release them.
    - Define what happens to the payment. Today it stays with the host by default.
  - *Pass-two amendments:*
    - The same function works on **rent charges**, which are bookings with `check_in = move_in`, `check_out = move_in + 1` (live `open_rent_charge`). A lister can mark a tenant's paid move-in total NO_SHOW from 00:00 WAT on the move-in day, and the rent stays with the payment. The fix must refuse NO_SHOW on any booking that has a `rent_payments` row: a missed tenancy is a support matter, not a host button. (See ESC-P2-02.)
- **EFFORT:** 3 hours plus a founder decision on the no-show money rule.
- **PASS TWO:** CONFIRMED (by execution) — fix amended (refuse NO_SHOW on rent charges). HIGH stands. Reviewer's rolled-back probe recorded NO_SHOW on a paid CONFIRMED booking on the check-in day and then resold the same nights (`noshow={"outcome": "recorded"} E(resale of no-show nights)=inserted`).

#### ESC-05 | ESCROW | MEDIUM | Money leaves escrow when nobody should release it: the sweeper and confirm ignore the kill switch, payee suspension and payee deletion
- **WHAT IS WRONG:**
  - `private.escrow_sweep_timeouts` (pg_cron job 32, `17 * * * *`) releases every HELD/RELEASE_REQUESTED row past `auto_release_at`. It checks no flag, no `agent_suspensions` row and no deletion state.
  - `escrow_confirm_as` does the same.
  - The kill switch lives only in two server actions (`lib/escrow/actions.ts:505,549`, propose and fund). No database function reads it.
  - So "turn held payments off" cannot freeze outflows during an incident, such as a fraud ring of agents, a wrong commission rate or a compromised payee.
- **WHERE:** live `private.escrow_sweep_timeouts`, `private.escrow_settle`, `public.escrow_confirm_as`; `apps/web/src/lib/escrow/actions.ts:250` (comment: cancel is "NOT BEHIND THE KILL SWITCH"). Confirm, request-release and dispute are also outside it.
- **EVIDENCE:**
  - Sweeper body verbatim: `where state in ('HELD','RELEASE_REQUESTED') and auto_release_at is not null and auto_release_at <= now() ... perform private.escrow_settle(e.id,'release','RELEASED',null, ...)`. No other predicate.
  - `grep -c` of any flag or `agent_suspensions` reference in `escrow_settle`, the sweeper or `confirm_as` finds nothing.
  - `cron.job` row: `32 | vallo_escrow_sweep_timeouts | 17 * * * * | select private.escrow_sweep_timeouts(); | true`.
- **WHY IT MATTERS:** The first real incident will be one where you want to stop payouts and cannot without a migration. A suspended agent keeps being paid by a cron job.
- **THE FIX:** (amended in pass two)
  - *Pass-one fix, retained:* 
    1. Add a DB-level flag, a row `held_payments_payouts` read by a `private.escrow_payouts_open()` that fails closed. The sweeper and `confirm_as` skip (not refund) when it is closed and log an `escrow.payout_paused` audit row.
    2. In `escrow_settle` (release direction only), refuse when the payee has an active `agent_suspensions` row or an `account_deletion_requests` row, returning `payee_blocked` and opening a `risk_alerts` row.
    3. Put `propose_as` / `fund_proposal_as` behind the same DB flag so the gate is not only in TypeScript.
  - *Pass-two amendments:*
    - Step 2 (returning `payee_blocked` from `escrow_settle`) would leave a HELD row past `auto_release_at`: the sweeper picks it up every hour, opens a new `risk_alerts` row each time and, because it takes no lock (ESC-15), keeps it at the front of the queue. Instead, move a blocked row to DISPUTED with `disputed_by = null` and `dispute_reason = 'Paused by Vallo: payee suspended'` (HELD→DISPUTED is legal), and alert once.
- **EFFORT:** 4–6 hours.
- **PASS TWO:** SEVERITY CHANGED HIGH→MEDIUM — fix amended. Confirmed from the live bodies: `escrow_sweep_timeouts` and `escrow_confirm_as` read no flag and no suspension; `agent_suspensions` and `account_deletion_requests` both exist. Why MEDIUM: reachable only once the flag is open (zero escrows today); paying a suspended payee is not wrong by default (a suspension does not cancel a fee already earned, and the payer can freeze any hold with a dispute); the real gap is an operational incident freeze where nobody loses money; the deletion half is ESC-06. ESC-05 is not a duplicate of MON-01/02/03 (those are Paystack bank payouts; escrow release is an internal wallet credit).

#### ESC-06 | ESCROW / ACCOUNTS | HIGH | The account purge never rechecks held money, so an escrow can auto-release into a tombstoned account
- **WHAT IS WRONG:**
  - `account_deletion_blockers` counts escrows only in `FUNDED, HELD, RELEASE_REQUESTED, DISPUTED`, and INITIATED is omitted.
  - It is checked when deletion is **requested**. None of `due_account_purges`, `purge_account_rows`, `finish_account_purge`, `lib/account-deletion/purge.ts` or `lib/cron/jobs/account-purge.ts` rechecks blockers, balances or escrows 30 days later.
  - In between, the counterparty can fund an INITIATED proposal naming the leaving user as payee. `escrow_fund_proposal_as` checks nothing about the payee.
  - The purge then tombstones the payee (banned until infinity), and the sweeper later releases into the dead wallet.
- **WHERE:** live `public.account_deletion_blockers` (`e.state in ('FUNDED','HELD','RELEASE_REQUESTED','DISPUTED')`); the purge functions above.
- **EVIDENCE:**
  - `select proname, prosrc ~* 'blockers' from pg_proc where proname in ('due_account_purges','purge_account_rows','finish_account_purge')` → all `false`.
  - The same query with `~* 'escrow'` → all `false`.
  - `grep -n "balance|wallet|recheck" lib/account-deletion/purge.ts lib/cron/jobs/account-purge.ts` returns no recheck.
  - End-to-end not executed.
- **WHY IT MATTERS:** Real naira is stranded in an account nobody can sign into. A payer's protection disappears when the payee leaves.
  - *Pass two: reachable today, not only when escrow opens — a wallet-to-wallet send works now (`transferToUserWork` checks nothing about the recipient's deletion request), so a payment sent to a member during their 30-day grace lands after the only check has run, and the purge then tombstones that money.*
- **THE FIX:** (amended in pass two)
  - *Pass-one fix, retained:* 
    - Add INITIATED to the blockers (and CANCEL the user's INITIATED proposals when the deletion request is made).
    - Call `account_deletion_blockers(user)` again inside the purge transaction and abort the purge (`fail_account_purge`, reason `money_arrived`) if anything is non-zero.
    - Refuse `escrow_fund_proposal_as` when the payee has an open deletion request.
  - *Pass-two amendments:*
    - The purge-time recheck must include wallet balance, pots and pending payouts, not only escrow.
    - `transferToUser` must refuse a recipient with an open `account_deletion_requests` row.
    - Fix together with MON-09 (one change).
- **EFFORT:** 3 hours.
- **PASS TWO:** CONFIRMED — fix amended (recheck everything at purge time; refuse sends to a leaving member; fix together with MON-09). HIGH stands. Reviewer confirmed live: `due_account_purges`, `purge_account_rows` and `finish_account_purge` contain no match for `blocker` or `escrow`; the blockers count only FUNDED, HELD, RELEASE_REQUESTED and DISPUTED escrows; live `account_deletion_blockers` also ignores `wallet_pots` (MON-09, the same hole). STORE-12's pass-two amendment (A03) reaches the same conclusion.

#### ESC-07 | ESCROW / ADMIN | HIGH | One admin, on a password alone, can rule on a dispute they are party to, and the ruling cannot be reversed
- **WHAT IS WRONG:**
  - `escrow_admin_resolve` checks `has_role(actor,'admin'|'super_admin')` and nothing else. The actor may be the payer or the payee.
  - It is granted to `authenticated` and reachable directly over PostgREST, not just via the console.
  - There is no second factor on the platform: `lib/security/sessions.ts:36-37` says "Every session on this platform is aal1 because there is no second factor to reach aal2".
  - There is no two-person rule at any amount, and RESOLVED is terminal.
- **WHERE:** live `public.escrow_admin_resolve`, proacl `{postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}`.
- **EVIDENCE:** Wire run 2026-09-23T20:20:36Z with an admin password-grant JWT:

  ```
  admin   rpc/escrow_admin_resolve  HTTP 200  {"status": "not_found"}
  admin   rpc/escrow_admin_resolve  HTTP 200  {"status": "needs_a_reason", "minimum": 20}
  admin   rpc/escrow_admin_resolve  HTTP 200  {"status": "bad_direction"}
  member  rpc/escrow_admin_resolve  HTTP 200  {"status": "forbidden"}
  ```

  So the body runs for an admin at aal1, straight from a browser console, bypassing the console's server action.
- **WHY IT MATTERS:** One phished admin password decides every dispute, and a staff member can pay themselves.
- **THE FIX:**
  - In the function, add `if actor in (e.payer_id, e.payee_id) then return 'conflicted'`.
  - Require `(auth.jwt()->>'aal') = 'aal2'` once MFA exists. Until then, revoke from `authenticated` and call it only from the server action through a service-role `_as` variant that takes the verified admin id.
  - Above a threshold (e.g. ₦500k), require a second admin's approval row.
  - Add a documented correction path: a `RESOLVED` correction is an explicit reversing ledger pair plus audit, done by super_admin.
- **EFFORT:** 1 day (excluding building MFA itself).
- **PASS TWO:** CONFIRMED. Reviewer checked live: the body of `escrow_admin_resolve` has no check against `e.payer_id`/`e.payee_id`, its `proacl` includes `authenticated=X`, and ESC-01's probe shows an admin JWT alone drives it to a credit. HIGH stands as a gate condition; the fix is correct (moving to a service-role `_as` variant means rewiring `resolveEscrow`, `lib/admin/money-actions.ts:53`, which today uses the session client).

#### ESC-08 | ESCROW | HIGH | The escrow gate lives in one writable table row that any admin can create over the wire, with no database audit
- **WHAT IS WRONG:**
  - Whether naira can be held depends on one `feature_flags` row, `held_payments`.
  - Policy `feature_flags_admin_write` (ALL, admin or super_admin) plus table INSERT/UPDATE grants to `authenticated` (and to `anon`) let any admin JWT **INSERT** that row with `enabled=true` through PostgREST.
  - The console only toggles existing rows, and its audit write is "best effort" (`lib/admin/actions.ts` `toggleFeatureFlag`, `catch { // Best effort. }`).
  - There is no trigger on `feature_flags` other than `set_updated_at`.
  - The founder's conditions (custody decided, `custodySentence()` non-null) are enforced by nobody.
- **WHERE:** `pg_policies` for `feature_flags`; `pg_trigger` on `feature_flags`; `apps/web/src/lib/escrow/flag.ts:40`.
- **EVIDENCE:**
  - `feature_flags_admin_write | ALL | {public} | has_role(... 'admin') OR has_role(... 'super_admin')`.
  - `has_table_privilege('authenticated','public.feature_flags','INSERT')` → true.
  - The only trigger is `feature_flags_set_updated_at`.
  - The member and anon both read the flag table over the wire (HTTP 200), which confirms no `held_payments` row exists today.
  - I did **not** attempt the insert: it would open the gate on production.
  - **Pass two executed it (A01, rolled-back probe inserting `('held_payments', true)` into `feature_flags`):** as the QA member → `42501` (control); as the QA admin → `inserted`; `audit_log` rows written in the transaction → `0`.
- **WHY IT MATTERS:** A single click or curl by any admin opens held payments before custody is decided, and the record of who did it may not exist.
- **THE FIX:**
  - Add a DB trigger on `feature_flags` that writes `audit_log` on every insert, update or delete.
  - Restrict writes to key `held_payments` to `super_admin`.
  - Add a check in `escrow_propose_as` / `escrow_fund_proposal_as` against a DB-side `custody_structure` setting (`private.platform_settings`) that must be non-`undecided`. That makes the TypeScript `CUSTODY_STRUCTURE` constant and the DB agree, and the gate holds in both places.
  - Revoke table INSERT/UPDATE on `feature_flags` from `anon`.
- **EFFORT:** 3 hours.
- **PASS TWO:** CONFIRMED (by execution). HIGH stands: one admin request opens the gate onto ESC-01. Reviewer's rolled-back probe: member insert → 42501, admin insert → inserted, 0 audit rows. Live grants: `anon` and `authenticated` both hold INSERT and UPDATE on `feature_flags`; the policy is `feature_flags_admin_write` (ALL); the only trigger is `feature_flags_set_updated_at`; `heldPaymentsAreOpen()` reads only `enabled`, and nothing ties it to `CUSTODY_STRUCTURE`.

#### ESC-09 | ESCROW | MEDIUM | Disputes and proposals never time out and nothing alerts on their age
- **WHAT IS WRONG:**
  - `escrow_raise_dispute_as` sets `auto_release_at = null`.
  - No function, job or alert looks at `disputed_at` age. `select ... where prosrc ~* 'DISPUTED' and prosrc ~* 'disputed_at\s*<|interval'` → `[]`.
  - INITIATED has no expiry either, and it blocks the thread through the one-live-agreement rule.
  - The UI copy promises "Somebody at Vallo is reading what both of you have filed", with no SLA behind it.
- **WHERE:** live `escrow_raise_dispute_as`, `escrow_propose_as` (`already_open`); `lib/escrow/copy.ts` `stateLine('DISPUTED')`.
- **EVIDENCE:** Query above returned `[]`. The `cron.job` list (14 jobs) contains no dispute or proposal ageing job.
- **WHY IT MATTERS:** A dispute filed on a Friday night with no one watching holds the money indefinitely. A stale proposal can be funded months later.
- **THE FIX:**
  - Add a pg_cron job hourly: open a `risk_alerts` row for DISPUTED older than 48h (high at 7d).
  - CANCEL INITIATED rows older than 14 days, with the note "Expired before anybody set it aside".
  - Publish the dispute SLA in `docs` and on the sheet.
- **EFFORT:** 2–3 hours.
- **PASS TWO:** CONFIRMED. Reviewer checked live: the sweeper selects only HELD and RELEASE_REQUESTED; `cron.job` (14 jobs, ids 26–39) has no job that ages disputes or proposals; `escrow_propose_as` counts INITIATED and DISPUTED as live, so either blocks the thread for ever. MEDIUM stands.

#### ESC-10 | ESCROW | LOW | The payer picks the hold window (1–180 days) at funding time, and the payee never agreed to it
- **WHAT IS WRONG:**
  - The proposal row carries no hold window.
  - `fundHeldPaymentProposal` accepts `holdDays` from the client (`lib/escrow/actions.ts:545-559`) and the DB clamps it to 1–180.
  - The shipped UI passes none (default 21, `ProposeHeldPayment.tsx:125`). But the server action is a public endpoint, so a payer can fund with 180 days and lock an agent's fee for six months.
  - A careless client could also pass 1.
- **WHERE:** as above; live `escrow_fund_proposal_as` (`hold_days := greatest(1, least(coalesce(p_hold_days, 21), 180))`).
- **EVIDENCE:** Code read. Not executed.
- **WHY IT MATTERS:** A material term of the agreement is set unilaterally after acceptance.
- **THE FIX:** Add `hold_days` to `escrows` and set it at `escrow_propose_as`. Both sides then see "pays out on <date> if funded today" before funding. `escrow_fund_proposal_as` ignores the caller and uses the row. Drop `holdDays` from the action's input.
- **EFFORT:** 2 hours.
- **PASS TWO:** SEVERITY CHANGED MEDIUM→LOW. Confirmed (`lib/escrow/actions.ts:544-556` passes `clampHoldDays(input.holdDays)`). Why LOW: only the payer can set the window and the money is the payer's; a payer who wants to lock an agent's fee can already freeze it indefinitely with one dispute (ESC-09); a 1-day window only speeds payment to the payee, by the payer's own choice. Storing `hold_days` on the proposal is still right as craft.

#### ESC-11 | TIME | MEDIUM | "Pays out on <date>" is rendered in server UTC, hides the hour, and differs between surfaces
- **WHAT IS WRONG:**
  - `formatDate` in `packages/i18n/src/index.ts:278-284` builds `Intl.DateTimeFormat` with **no `timeZone`**.
  - The escrow sheet (`HeldPaymentSheet`, rendered by the server page `app/(app)/escrow/[id]/page.tsx`) and the emails (`lib/email/escrow-messages.ts:162,206`) therefore print the UTC date on Vercel.
  - The proposal composer (`"use client"` `ProposeHeldPayment.tsx:145` → `payoutDateIfFundedNow`) prints the viewer's device date. A Londoner and a Lagosian see different dates for one agreement.
  - The real deadline is an instant (`now() + N days`, released at the next :17), but copy rule 2 forbids anything but a date. A payer who reads "pays out on 14 Oct" and objects at 18:00 WAT on 14 Oct may find it already paid at 09:17.
- **WHERE:** files above; live `escrow_fund_proposal_as` (`auto_release_at = now() + make_interval(days => hold_days)`); `SHOW TimeZone` → `UTC`, `cron.timezone` → `GMT`.
- **EVIDENCE:** `select current_setting('TimeZone'), (select setting from pg_settings where name='cron.timezone')` → `UTC | GMT`. `formatDate` source quoted above.
- **WHY IT MATTERS:** It shortens the objection window by up to a day without anyone noticing, and it is exactly the case a dispute will argue about.
  - *Pass two: the harm is narrower than stated. The UTC date differs from the Lagos date only between 23:00 and 24:00 UTC, and then shows the earlier date, which errs in the payer's favour. What actually hurts is the missing hour: release happens at whatever time of day the hold was funded, plus up to 59 minutes to the next :17 sweep.*
- **THE FIX:** (amended in pass two)
  - *Pass-one fix, retained:* 
    - Default `timeZone: "Africa/Lagos"` in `formatDate` (or an explicit Lagos option for every money date).
    - Set `auto_release_at` to the **end of the WAT day**: `((now() at time zone 'Africa/Lagos')::date + hold_days + 1)::timestamp at time zone 'Africa/Lagos'`. The date shown is then the last full day to object.
    - Or print "on 14 Oct at 10:17 (Lagos time)".
  - *Pass-two amendments:*
    - Keep the "snap `auto_release_at` to the end of the WAT day" option. The sweeper then releases at 00:17 WAT the next day, which matches "last full day to object".
    - Existing HELD rows need a one-off backfill, or the old and new semantics mix.
- **EFFORT:** 2 hours.
- **PASS TWO:** CONFIRMED — fix amended (snap to end of WAT day, with a one-off backfill). Reviewer confirmed `formatDate` (`packages/i18n/src/index.ts:278-284`) has no `timeZone`, and narrowed the harm (see WHY IT MATTERS).

#### ESC-12 | ESCROW GATE | LOW | The gate's own record contradicts itself, and the HTTP probe does not test the live door and scores a 404 as a pass
- **WHAT IS WRONG:**
  - `docs/escrow/PROBE_STATE.md` says at the top "THE SENTENCE IS NOW TESTED, AND IT PASSES". Lower down it still says "State of the whole gate ... NOT MET, and one probe half is the reason", "P-7's HTTP half has never run, and this machine cannot run it", "P-7 HTTP | Nothing. It has never run" and "Item 4 ... alone is enough to keep the gate shut".
  - `scripts/probes/escrow_revoke.sh` header still says "STILL NOT RUN AS OF 23 SEPTEMBER 2026".
  - The HTTP probe covers 7 verbs. It omits the live door (`escrow_propose_as`, `escrow_fund_proposal_as`), `escrow_confirm_as`, `escrow_request_release_as`, `escrow_raise_dispute_as`, `escrow_file_evidence_as`, `escrow_open`, `escrow_release`, `escrow_refund` and `escrow_admin_resolve`.
  - It counts HTTP **404 as PASS**. A 404 is PostgREST's PGRST202 "function not found with those argument names", which is what a typo in the probe's JSON produces (demonstrated below). That green can pass for a reason unrelated to the grant.
- **WHERE:** `docs/escrow/PROBE_STATE.md` (sections "State of the whole gate", "P-7's HTTP half has never run", "WHICH TREE", "What is owed"); `scripts/probes/escrow_revoke.sh:20-27,56-66,103-109`.
- **EVIDENCE:** My signed-in run (`work/A02/wire.log`) shows wrong argument names answer 404:

  ```
  member  rpc/escrow_confirm  HTTP 404  {"code":"PGRST202","details":"Searched for the function public.escrow_confirm with parameters p_actor, p_escrow ... no matches were found in the schema cache."
  ```

  **The signed-in half, now run: 21 RPCs × {anon, member, admin}.** Every revoked verb answered `anon → 401 42501` and `member/admin → 403 42501 permission denied for function <name>`, including `escrow_propose_as`, `escrow_fund_proposal_as` and all `_as` siblings. `escrow_admin_resolve` answered as in ESC-07. `private.*` via Content-Profile answered `406 PGRST106 Only the following schemas are exposed: public, graphql_public`. Direct `PATCH/POST /rest/v1/escrows` answered 403 `permission denied for table escrows` for member and admin. Control: `GET listings` 200.
- **WHY IT MATTERS:** A founder reading the file cannot tell whether the gate is met. A probe that passes on a 404 would stay green if an argument were renamed.
- **THE FIX:**
  - Rewrite the stale sections to one verdict.
  - In `escrow_revoke.sh`: treat 404 as FAIL unless the body is `PGRST202` **and** the verb is listed as intentionally absent. Add all 20 public verbs. Add signed-in passes (member and admin tokens via env).
  - Append my matrix as the "P-7 HTTP, signed-in" row.
- **EFFORT:** 2 hours.
- **PASS TWO:** SEVERITY CHANGED MEDIUM→LOW. Confirmed: `PROBE_STATE.md:10` says "NOW TESTED, AND IT PASSES" while `:47` says "NOT MET" and `:334` says "Nothing. It has never run"; `escrow_revoke.sh:61` treats `404` as PASS. Why LOW: internal documentation and tooling, no user affected; the gate is decided by the flag row (ESC-08), not by this file. The fix is right.

#### ESC-13 | ESCROW COPY / LEGAL | MEDIUM | The Terms and the escrow copy disagree with what the feature does on the day it opens
- **WHAT IS WRONG:**
  - Terms §4 say "**We do not hold your money in escrow** ... When you pay, the money reaches the person you are paying" (`lib/legal/terms.tsx:225-231`), and "we hold no part of that money" for tenancy-side payments (`:270`).
  - With `held_payments` open, an agency fee is set aside for 1–180 days in a Vallo-controlled ledger, and a Vallo operator decides where it goes.
  - The escrow copy module's rule 5 forbids implying "that Vallo decides who is right", yet `STATE_LABEL.RESOLVED = "Settled by Vallo"` and `stateLine('RESOLVED') = "Vallo has made a decision and the money has moved"` (`lib/escrow/copy.ts`).
  - `custodySentence()` correctly returns null. `CUSTODY_STRUCTURE = "undecided"` is confirmed, and the terms match **today's** closed state.
- **WHERE:** files and lines above.
- **EVIDENCE:** Source quoted verbatim above.
- **WHY IT MATTERS:** On flag day the Terms become false about money, which is a consumer-protection and App Store accuracy problem.
- **THE FIX:** (amended in pass two)
  - *Pass-one fix, retained:* 
    - Make a Terms rewrite of §4 (held payments, adjudication, timing, what happens on dispute) a hard precondition of the `held_payments` row, listed in PROBE_STATE's non-probe conditions.
    - Reword RESOLVED to the effect rather than the decider, or accept that Vallo adjudicates and say so in the Terms.
  - *Pass-two amendments:*
    - The Terms are **already false today**, not only on flag day. Money for a stay or a rent charge settles into Vallo's Paystack balance, and nothing credits the host or lister: `settleBookingCharge` and `pay_booking_from_wallet` only write `ledger_entries.agent_share_minor`, and no payout job exists (MON-04; A01's FOR THE FOUNDER item 1). The §4 rewrite must describe today's reality too, not wait for the flag.
- **EFFORT:** 2 hours of copy plus solicitor time.
- **PASS TWO:** CONFIRMED — fix amended (the Terms are already false today). MEDIUM kept, because there are zero real payments today. Reviewer confirmed `lib/legal/terms.tsx:225-231` ("We do not hold your money in escrow … When you pay, the money reaches the person you are paying").
  - *Also reported as UI-04 (A06 interface, MERGED INTO this ID in pass two; HIGH→MEDIUM):* the Terms' bold "We do not hold your money in escrow" (`lib/legal/terms.tsx:224-231`) against the member `/escrow` empty state ("you can set the money aside until the work is done. It stays out of both balances until then", `app/(app)/escrow/page.tsx:92-96`), the admin Escrow desk ("Escrow float", lede "Secure transactions. Fair outcomes.", `en.ts:3930`, `EscrowDesk.tsx:87`) and the Fees desk's "Commission on released escrow". A05 re-measured `/escrow` live and noted the Terms sentence is true today while the gate is closed. Fix addition: while the held-payments gate is closed, the `/escrow` empty state must say "Held payments are not open yet", not "you can set the money aside"; remove "Secure transactions. Fair outcomes."

#### ESC-14 | STAYS | MEDIUM | A stay the host accepted but the guest never paid has no timeout
- **WHAT IS WRONG:**
  - `expire_booking_holds` cancels only PENDING.
  - A request-to-book the host has CONFIRMED is payable (`checkout.ts` comment, "CONFIRMED is deliberately payable"), but if the guest vanishes, the row stays CONFIRMED and blocks the nights under the exclusion constraint until checkout.
  - `complete_ended_stays` then reports it only as `unpaid_ended`.
- **WHERE:** live `private.expire_booking_holds` (`where bk.status = 'PENDING'`), `private.complete_ended_stays`.
- **EVIDENCE:** Bodies read from `pg_proc`.
- **WHY IT MATTERS:** A host loses every night of a no-pay acceptance.
- **THE FIX:** In `expire_booking_holds`, also cancel `CONFIRMED` rows with no SUCCESSFUL transaction when `confirmed_at + 24h < now()` or `check_in <= lagos today`, and notify both parties.
- **EFFORT:** 2 hours.
- **PASS TWO:** CONFIRMED. Reviewer checked live: the body of `private.expire_booking_holds` selects `where bk.status = 'PENDING'` only. MEDIUM stands; the fix is correct.

#### ESC-15 | ESCROW | LOW | The sweeper takes no lock, ignores settle's answer, and one raise rolls back the whole batch
- **WHAT IS WRONG:**
  - `escrow_sweep_timeouts` selects up to 200 rows without `FOR UPDATE SKIP LOCKED`.
  - It counts `moved` whatever `escrow_settle` returns.
  - A dispute committing between its select and settle's lock makes settle attempt DISPUTED→RELEASED. The trigger raises, and all 200 releases in that run roll back until the next hour.
- **WHERE:** live `private.escrow_sweep_timeouts`.
- **EVIDENCE:** Body quoted in ESC-05. P-5 proves money safety, not batch liveness.
- **WHY IT MATTERS:** Not stated separately in pass one.
- **THE FIX:** (amended in pass two)
  - *Pass-one fix, retained:* Use `for update skip locked` in the loop query, wrap each settle in `begin … exception when others then` (log a risk alert, continue), and count only `status = 'ok'`.
  - *Pass-two amendments:*
    - Besides the dispute race, a single row whose settle *always* raises poisons every run — e.g. a pre-existing credit with reference `escrow:release:<id>` makes the settle insert raise `unique_violation`; the whole 200-row batch then rolls back every hour, for ever, and **no escrow on the platform releases**. The per-row `begin … exception` fixes this only if the failing row is also taken out of the queue (set it to DISPUTED "Paused by Vallo", as in ESC-05); otherwise it stays at the front of `order by auto_release_at`.
- **EFFORT:** 1 hour.
- **PASS TWO:** CONFIRMED — fix amended (a poison row must also leave the queue). Reviewer confirmed live: the sweeper loop has no `FOR UPDATE SKIP LOCKED`, discards what `escrow_settle` returns, and counts every row. The dispute race itself needs two sessions and was not executed.

#### ESC-16 | ADMIN | LOW | `ruleOnHeldPayment` is dead code that would refuse every ruling
- **WHAT IS WRONG:** `lib/admin/escrow-actions.ts:90-132` calls `escrow_admin_resolve` through the **service-role** client, where `auth.uid()` is null, so it always answers `forbidden`. Its comment says the function "reads auth.uid() for itself" as if that worked. It has no importers: `grep -rn ruleOnHeldPayment` finds only its own file. The live desk uses `resolveEscrow` in `lib/admin/money-actions.ts:53`, which uses the session client and works.
- **WHERE:** as above.
- **EVIDENCE:** See WHERE (pass one gave them together).
- **WHY IT MATTERS:** Not stated separately in pass one.
- **THE FIX:** Delete the file (or make it call `resolveEscrow`) before someone wires it up.
- **EFFORT:** 15 minutes.
- **PASS TWO:** CONFIRMED. Reviewer: `lib/admin/escrow-actions.ts:90-132` calls through `getAdminClient()` (service role, `auth.uid()` null); grep finds no importer. It is an exported `"use server"` function, so a reachable endpoint, but it can only ever answer `forbidden`. LOW stands.

#### ESC-17 | TIME | LOW | Assorted day-boundary slips and 13 copies of "today in Lagos"
- **WHAT IS WRONG:**
  - `private.open_rent_charge` uses `if p_move_in < current_date`, which is the UTC date. From 00:00 to 00:59 WAT it accepts yesterday's move-in.
  - `account_deletion_blockers` uses `check_out >= current_date` (UTC). This errs conservative.
  - `private.announce_completed_stays` (cron 05:20 UTC = 06:20 WAT) counts `status='CONFIRMED' and check_out <= today`. It posts "a guest finished a stay" on the morning of checkout, before the guest has left, and includes unpaid CONFIRMED stays.
  - "Today in Lagos" is reimplemented 13 times: `components/app/threads/booking-steps.ts:41`, `app/admin/listings/page.tsx:217`, `app/(app)/trips/trip-spine.ts:73`, `lib/admin/examples-queries.ts:109`, `lib/rent/schema.ts:17`, `lib/agent/bookings-queries.ts:122`, `lib/agent/listings-queries.ts:639`, `lib/agent/bookings-actions.ts:330`, `lib/agent/calendar-schema.ts:75`, `lib/stays/filters.ts:78`, `lib/bookings/schema.ts:15`, `lib/bookings/lifecycle.ts:57`, plus `TripSpine.tsx:54`. All are correct today, which is exactly how they drift.
- **WHERE:** Not stated separately in pass one.
- **EVIDENCE:** Lines read from `pg_proc` via `regexp_split_to_table`, verbatim: `if p_move_in < current_date then`; `... b.check_out >= current_date);`; `where b.status = 'CONFIRMED' and b.check_out <= today`.
- **WHY IT MATTERS:** Not stated separately in pass one.
- **THE FIX:**
  - Replace `current_date` with `(now() at time zone 'Africa/Lagos')::date` in both functions.
  - Change `announce_completed_stays` to `status='COMPLETED' and check_out < today`.
  - Export one `lagosToday` from `@vallo/i18n` and delete the rest.
- **EFFORT:** 2 hours.
- **PASS TWO:** CONFIRMED. Reviewer confirmed live: `open_rent_charge` has `if p_move_in < current_date`; `announce_completed_stays` has `b.status = 'CONFIRMED' and b.check_out <= today`. LOW stands; ESC-P2-02 makes the announcement bug worse for tenancies.

#### ESC-18 | DEFENCE IN DEPTH | LOW | Money tables grant INSERT/UPDATE to anon and authenticated, and only RLS stands in front

**Money tables grant INSERT/UPDATE to anon and authenticated, and only RLS stands in front.** Withdrawn by the pass-two reviewer as a duplicate of MON-10 and merged into it. The reviewer confirmed it by `has_table_privilege` (`anon` and `authenticated` hold INSERT, UPDATE and DELETE on `wallet_entries`, `bookings`, `feature_flags`, `wallets` and `wallet_pots`; `escrows` holds none and is the model to copy). ESC-18's evidence (including the `escrow-evidence` bucket error that leaks `inspection_photo_path_access` to anon) and its fix (bookings, feature_flags) now live in MON-10's merged fix, which also corrects both reports: DELETE and the wallets/pots tables are included, and pot INSERT/UPDATE for `authenticated` must be kept.

- **PASS TWO:** MERGED INTO MON-10 (A01 in pass two: "WITHDRAWN (duplicate of MON-10) + fix merged"). Canonical severity MEDIUM (MON-10).

#### NEW IN PASS TWO

#### ESC-P2-01 | STAYS / ADMIN | MEDIUM | Any admin can rewrite any booking's price and status straight over the API, with no record
- **WHAT IS WRONG:** Policy `bookings_admin_all` gives admins FOR ALL on `bookings`, and `authenticated` holds UPDATE on every column. An admin JWT can therefore mark a booking CONFIRMED without payment, or set `total_minor` to 0 after the guest paid. It happens through PostgREST, outside every server action. Nothing records it: `bookings` has no audit trigger, and the state-event row is written by application code, which this path skips.
- **WHERE:** live `pg_policy`: `bookings_admin_all | * | has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin')` (USING and WITH CHECK).
- **EVIDENCE:** Rolled-back probe. Inserted a PENDING booking at ₦85,000 × 3 on the temporarily un-demoed listing, then:
  - control: the guest's own UPDATE to CONFIRMED affected `0` rows;
  - the admin's UPDATE `status='CONFIRMED', price=0, total=0` affected `1` row.

  ```
  guest_update_rows=0 admin_update_rows=1 now status=CONFIRMED total=0 state_events=0 audit_rows=0 paid_tx=0
  ```
- **WHY IT MATTERS:** It is the ESC-07 risk (a phished or rogue admin) applied to stays and rent. A stay is confirmed for free, or a paid booking's recorded total becomes zero. Refunds (`refund_and_cancel_booking` bounds by transactions, not by the total) and host earnings reports then disagree. There is no trace.
- **THE FIX:**
  - Replace `bookings_admin_all` with `bookings_admin_select` (SELECT only).
  - Route every admin change through the existing SECURITY DEFINER functions, which write state events: `refund_and_cancel_booking`, `record_booking_no_show`, and a new `admin_set_booking_status` if the console needs one.
  - Add an AFTER UPDATE trigger on `bookings` that writes `booking_state_events` when status changes and `audit_log` when any `*_minor` column changes.
- **EFFORT:** 3 hours, plus checking which console screens write bookings directly.
- **PASS TWO:** NEW IN PASS TWO (found by the reviewer, A01). Rolled-back probe: guest's own UPDATE to CONFIRMED affected 0 rows (control); the admin's UPDATE `status='CONFIRMED', price=0, total=0` affected 1 row, with 0 state events, 0 audit rows and 0 paid transactions.

#### ESC-P2-02 | STAYS / RENT | MEDIUM | A year's tenancy is stored as a one-night stay, so it "completes" the next day, gets announced publicly, and can no longer be refunded through support
- **WHAT IS WRONG:** The live `private.open_rent_charge` inserts the rent charge as a booking with `check_in = p_move_in` and `check_out = p_move_in + 1`. Once paid, every stay-lifecycle job treats it as a finished one-night stay:
  1. **The morning after move-in**, `private.announce_completed_stays` (05:20 UTC) posts a public SYSTEM post in the area: "A guest finished a stay around <area>". Its selector is `CONFIRMED and check_out <= today`, and the tenancy still matches it.
  2. **The next night**, `private.complete_ended_stays` (`check_out < today`, no rent exclusion: `prosrc ~ 'rent'` is false) marks the tenancy COMPLETED. The tenant's year-long tenancy moves to the "Completed" tab of `/bookings`.
  3. **Refunds stop working.** `private.refund_and_cancel_booking` only cancels `status in ('PENDING','CONFIRMED')` (confirmed live). Otherwise it raises "could not be cancelled". Support loses its refund tool for a tenancy two days after move-in.
  4. `record_booking_no_show` applies on the move-in day (ESC-04).
- **WHERE:** live `private.open_rent_charge` (the insert with `p_move_in + 1`), `private.complete_ended_stays`, `private.announce_completed_stays`, `private.refund_and_cancel_booking`.
- **EVIDENCE:** Live bodies read through `pg_proc`, quoted above. Not executed end to end: it needs a real accepted inspection on a published rental, and zero exist.
- **WHY IT MATTERS:**
  - The largest payments on the platform (move-in totals in the millions of naira) are the ones the lifecycle mishandles.
  - The tenant sees their tenancy as "Completed".
  - A public post falsely announces a stay.
  - The refund path closes within two days of the tenant paying.
- **THE FIX:**
  - Give rent charges their own kind: a `bookings.kind` column (`stay` | `tenancy`) set by `open_rent_charge`, or exclusion by `exists (select 1 from rent_payments where booking_id = b.id)`.
  - Exclude tenancies from `complete_ended_stays`, `announce_completed_stays` and `record_booking_no_show`.
  - Let `refund_and_cancel_booking` accept a tenancy in COMPLETED, or better, give tenancies their own refund function.
  - Consider not using the stays exclusion constraint for tenancies at all. Two tenants picking the same move-in day on one rental currently collide on `bookings_no_overlap`.
- **EFFORT:** 1 day.
- **PASS TWO:** NEW IN PASS TWO (found by the reviewer, A01). Live bodies of `open_rent_charge`, `complete_ended_stays`, `announce_completed_stays` and `refund_and_cancel_booking` read; not executed end to end (needs a real accepted inspection on a published rental; zero exist). Related: MON-P2-02, ESC-04, ESC-17.

#### ESC-P2-03 | ESCROW / RECEIPTS | LOW | Escrow credits use a different reference format from the one the app parses, so release and refund receipts never name the property
- **WHAT IS WRONG:** The live `private.escrow_settle` writes credits with reference `'escrow:' || direction || ':' || id` (for example `escrow:release:<uuid>`). The hold uses `rm-esc-<id>-hold`. The app's `isEscrowReference` (`lib/payments/references.ts`) accepts only `rm-esc-<uuid>-(hold|release|refund)`. So `readPropertyNamesForReferences` (`lib/wallet/breakdown.ts`) never matches a release or refund row. On the payee's receipt and statement, "Released to you on Vallo" has no property against it, while the payer's hold row does. Any future reconciliation keyed on the `rm-` prefix will also miss escrow credits.
- **WHERE:** live `escrow_settle` (the insert); `apps/web/src/lib/payments/references.ts` (`escrowReference`, `isEscrowReference`); `apps/web/src/lib/wallet/breakdown.ts`.
- **EVIDENCE:** Live body quoted (`'escrow:' || p_direction || ':' || e.id::text`) against the TypeScript regex. Not rendered: zero escrows.
- **WHY IT MATTERS:** The receipt someone keeps says less than it should. There are two reference formats for one money leg, and reports keyed on either format will not agree.
- **THE FIX:** Make `escrow_settle` use `'rm-esc-' || e.id || '-' || p_direction`, which matches `escrowReference()`. Keep the unique constraint as it is. Also add a `refund` and `release` arm to I-3c, so the invariant keys on the new format.
- **EFFORT:** 1 hour, plus a one-line data migration if any rows exist (none do).
- **PASS TWO:** NEW IN PASS TWO (found by the reviewer, A01). Live `escrow_settle` insert (`'escrow:' || p_direction || ':' || e.id::text`) compared with the TypeScript `isEscrowReference` regex; not rendered (zero escrows).

#### THE STATE MACHINE AS THE DATABASE DRAWS IT (carried from pass one)

```
INITIATED ──fund_proposal_as──▶ FUNDED ──(same txn)──▶ HELD ──request_release_as──▶ RELEASE_REQUESTED
    │ cancel_as (no hold)          │ cancel_as (no hold)   │  │                              │
    ▼                              ▼                       │  │ confirm_as (both) / sweeper  │ confirm_as (both) / sweeper
 CANCELLED                     CANCELLED                   │  └──────────▶ RELEASED ◀───────┘
    │                                                      │ (HELD→REFUNDED, RR→REFUNDED legal but NO caller does it: escrow_refund is service-only, unused by app)
    └── raise_dispute_as ──▶ DISPUTED ◀── from FUNDED / HELD / RELEASE_REQUESTED
                                │ escrow_admin_resolve (release|refund)
                                ▼
                             RESOLVED   (terminal; no appeal, no reversal)
```

14 legal pairs, and P-8b's table agrees with them. The transitions nobody drew:
- **INITIATED → DISPUTED** is legal, and **DISPUTED → RESOLVED pays out money that was never taken** (ESC-01).
- **No clock on INITIATED.** A proposal lives forever and blocks the thread (`already_open`).
- **No clock on DISPUTED.** `auto_release_at` is nulled and nothing ages it (ESC-09).
- **No path out of RESOLVED** for an operator's mistake.
- **REFUNDED is only reachable via DISPUTED→RESOLVED.** The HELD→REFUNDED edge exists but no app caller uses it, so a payee who wants to give the money back must be "disputed".

##### Abandonment matrix (read from the live bodies)

| Situation | What happens | Verdict |
|---|---|---|
| Guest/payer vanishes after funding | Sweeper releases to payee at `auto_release_at` (default 21 d; 1–180 d, payer-chosen) | By design. The date copy hides the hour (ESC-11). |
| Host/payee vanishes without delivering | **Money still auto-releases to the payee** unless the payer disputes before the instant | By design ("silence = release"). The payer must act, and the copy tells them a date, not a time. |
| Both vanish, HELD | Released to payee on the date | By design |
| Both vanish, INITIATED | Row sits forever and blocks the thread. It can be funded months later at a stale amount. | ESC-09 |
| Anyone vanishes, DISPUTED | Money held forever. No SLA, no alert. | ESC-09 |
| Payee's account purged while a proposal is INITIATED, then funded in the 30-day grace | Purge does not recheck. Tombstoned payee, auto-release into a dead wallet. | ESC-06 |
| Payee suspended by admin | Sweeper and confirm still pay them | ESC-05 |
| Dispute opens mid-release (sweeper vs dispute) | Serialised by the row lock. Worst case, settle raises on DISPUTED→RELEASED and the **whole sweep batch** rolls back. Money is safe. | ESC-15 (LOW) |
| Dispute opens mid-confirm | `FOR UPDATE` in both verbs; the second sees the new state and refuses | Sound |

#### CHECKED AND FOUND SOUND

- **Signed-in P-7 over HTTP (new):**
  - 20 revoked public verbs refuse anon (401 42501) and **both** member and admin (403 42501) *before the body runs*. None answered in escrow's own vocabulary.
  - The verbs covered: `escrow_open`, `escrow_hold`, `escrow_release`, `escrow_refund`, `escrow_confirm(_as)`, `escrow_request_release(_as)`, `escrow_raise_dispute(_as)`, `escrow_cancel_as`, `escrow_file_evidence_as`, `escrow_fund_from_wallet(_as)`, `escrow_propose_as`, `escrow_fund_proposal_as`, `refund_and_cancel_booking`, `release_idempotency`, `release_room_nights` and `email_outbox_settle`.
  - The live catalogue agrees: `has_function_privilege('authenticated', …)` = false for all of them.
  - Could this green fail for the right reason? Yes: the same harness returned 200 bodies for `escrow_admin_resolve`, so a reachable verb does show up as reachable.
- **Private schema not exposed:** `Content-Profile: private` → 406 PGRST106 for `escrow_sweep_timeouts`, `escrow_settle` and `escrow_evidence_path_access`, for all roles.
- **No direct table writes to `escrows`:** PATCH and POST give 401/403 `permission denied for table escrows` for anon, member and admin. Reads are party-or-admin via RLS (member [] and admin [], because 0 rows exist).
- **The transition guard:** a BEFORE UPDATE trigger `escrows_guard_transition` raises `check_violation` on any illegal pair and audits every legal one, with an actor fallback for the service role.
- **Funding:** it locks the escrow row, then the wallet (`wallet_for_update`), reads spendable under the lock, uses a derived reference `rm-esc-<id>-hold` behind a unique index (so a retry answers `duplicate`), and moves FUNDED→HELD in one transaction. The `STUCK` invariant watches FUNDED for more than 1 minute.
- **Cancel tests the ledger, not the state:** `already_funded` when a hold exists.
- **Confirm needs both parties:** a single confirm only stamps a timestamp.
- **A dispute stops the clock:** `auto_release_at = null`. Evidence is facts or files only, append-only by trigger, open in HELD/RR/DISPUTED, and its shape is enforced by check constraints.
- **Refunds carry no commission.** Commission is computed only when `escrow_commission_is_permitted(purpose)`. Only `agency_fee` can be opened (`escrow_purpose_is_open`).
- **The kill switch fails closed** (`lib/escrow/flag.ts`). No config, a thrown read, an error, a missing row or `false` all mean closed. It is not cached. The flag table is readable by every role (a `select true` policy), so "unreadable" is not a realistic path. **Today: no `held_payments` row, so propose and fund are refused.** Scope limits are in ESC-05 and ESC-08.
- **`custodySentence()`** returns null for `undecided`. The escrow page and emails render nothing in its place (`app/(app)/escrow/[id]/page.tsx:72`, `lib/email/escrow-messages.ts:100`). `SET_ASIDE_SENTENCE` claims only the effect.
- **Invariant and float jobs are scheduled:** `vallo_escrow_invariants` (hourly at :23) and `vallo_escrow_book_the_float` (03:05 UTC). The float correctly excludes unfunded DISPUTED rows. The admin reads its snapshot (1 row); the member gets [].
- **The double-booking exclusion `bookings_no_overlap`, read-only semantics:**
  - Overlap is refused: `[10-01,10-03) && [10-02,10-04)` = true.
  - Same-day turnover is allowed: `[10-01,10-03) && [10-03,10-05)` = false.
  - Null ends are impossible: `check_out` is NOT NULL and `check(check_out > check_in)`, so `during` is never empty or infinite. A null end would have been infinite (`daterange('2026-10-01',null) && …2030` = true), which is why that NOT NULL matters.
  - CANCELLED, COMPLETED and NO_SHOW are excluded. That is right for CANCELLED and COMPLETED; NO_SHOW is the hole (ESC-04).
  - The constraint is scoped per `listing_id`. The pending M6 (`supabase/migrations/pending/m06_bookings_extension.sql`) is not applied, so room-type bookings cannot hit it yet.
  - Break attempts inside a rolled-back transaction were **not executed** (permission refused).
- **Two hold sweepers:** pg_cron job 27 (every 15 min) and Vercel `hold-sweep` (hourly at :05). Both use a 48h TTL with `for update skip locked`, so there is no double-cancel.
- **Quiet hours** (`lib/push/quiet-hours.ts`): the zone is stored, defaulting to `Africa/Lagos`, and evaluated through the runtime zone DB. The window wraps midnight. Money and security go straight through. Email and in-app are never delayed. Read only; not executed.
- **Cron clock:** the DB `TimeZone=UTC`, `cron.timezone=GMT`. WAT mapping:

  | Job | UTC | WAT |
  |---|---|---|
  | badges | 02:20 | 03:20 |
  | float | 03:05 | 04:05 |
  | announce | 05:20 | 06:20 |
  | daily note | 06:00 | 07:00 |
  | Vercel complete-stays | 02:30 | 03:30 |
  | saved-search | 07:40 | 08:40 |
  | account-purge | 03:15 | 04:15 |

  Every day-sensitive function among them uses `now() at time zone 'Africa/Lagos'`, except those listed in ESC-17.
- **Booking-side "today" in the app** uses `lagosToday()` everywhere I checked (`ReservePanel` min date, schema past-date check, cancel window).
- **Account deletion** is blocked while escrow money is FUNDED, HELD, RR or DISPUTED, checked at request time. The gaps are in ESC-06.

#### CORRECTLY EMPTY vs BROKEN

| Surface | Observed | Verdict | Reason |
|---|---|---|---|
| `GET /rest/v1/escrows` as member / admin | `[]` / `[]` | CORRECTLY EMPTY | 0 escrow rows ever; admin RLS `escrows_select_admin` would show all |
| `escrow_evidence` as member / admin | `[]` / `[]` | CORRECTLY EMPTY | no escrows |
| storage `escrow-evidence` list as member / admin | `[]` / `[]` | CORRECTLY EMPTY | no uploads |
| `escrow_float_snapshots` admin / member | 1 row / `[]` | CORRECT | admin-only, snapshot of a zero float |
| `/escrow`, `/admin/escrow` | not loaded in a browser | UNVERIFIED | the reads above say they will be empty; the render was not seen |
| Propose control in a thread | not rendered | CORRECTLY ABSENT | no `held_payments` row, so the kill switch is closed (`messages/[id]/page.tsx:128`); every thread is also on an example listing |
| `bookings` | 0 rows | CORRECTLY EMPTY | all 64 listings are examples; the demo trigger refuses (seen over the wire) |

#### NOT COVERED

- **Rolled-back write probes on live** (the ESC-01 mint, exclusion-constraint break attempts, the ESC-03 squat, the ESC-04 resale): the permission classifier refused `apply_migration` with a `raise exception` rollback. It also refused my attempt to reuse the local Postgres harness (`scripts/probes/escrow_concurrency.sh`), so I stopped pursuing execution. These findings rest on live `pg_proc` bodies and read-only expressions.
- **Browser walk** of `/escrow`, `/escrow/[id]`, the thread composer, `/admin/escrow` and `/admin/money`. I did not render them.
- `escrow_enqueue_emails` content and `email_outbox` delivery. Evidence upload storage policies beyond the list call. The Paystack/card legs of booking payment.
- The concurrency probes P-1 to P-9: I did not re-run them. I relied on their log plus reading the bodies.
- Whether `private.notify` / push for escrow at 03:00 WAT behaves as intended. Quiet hours were read, not run.
- The London-user rendering of dates in the browser. Inferred from `formatDate` having no `timeZone` and components being client or server, not observed.
- **Side effects of my run:** 3 password sign-ins (member ×2, admin ×1) created auth sessions and may have triggered new-device emails to the QA inboxes. **No rows were created.** Every write attempt was refused (FK, demo trigger, RLS or grant). Scratch scripts and logs are in `scratchpad/work/A02/` and contain no credentials; they read them from env.

**Pass two (A01) did not cover:**

- **ESC-15's race** (a dispute committing between the sweeper's select and settle's lock) needs two sessions. I did not execute it; it rests on the live bodies.
- **ESC-09, ESC-10, ESC-11, ESC-12, ESC-13, ESC-16 and ESC-17** were verified by reading live bodies, code and docs, not by execution.
- **ESC-P2-02** was not executed end to end, for the reason given in that finding.
- **The email and notification content** of escrow events (`escrow_enqueue_emails`) was not reviewed.
- **Side effects:** four `apply_migration` calls, every one raised and rolled back. The read-back above shows no rows and no recorded migrations. No QA sign-in happened in this pass.

#### FOR THE FOUNDER

1. **Custody structure** (`CUSTODY_STRUCTURE`: trustee vs licensed partner). Until you choose, `custodySentence()` stays null and **Terms §4 must be rewritten** before the `held_payments` row is written (ESC-13). Make the Terms rewrite a named gate condition.
2. **Who may open the gate.** Today any admin can, with a password and no audit trigger (ESC-08). Decide: super_admin only? Two people?
3. **The dispute SLA and who staffs it.** Disputes have no clock (ESC-09). Also decide whether an operator may rule above some amount alone (ESC-07), and when MFA for staff lands.
4. **Silence pays the payee.** An agent who vanishes gets the fee on day 21 unless the guest objects. Confirm that is the product you want for `agency_fee`. If yes, the payout moment must be shown as a Lagos date *and time*, or snapped to end-of-day WAT (ESC-11).
5. **No-show money rule for stays** (ESC-04): who keeps a no-show's payment, and from what hour a host may record one.
6. **Before the first real stay listing goes live, ESC-02 must be fixed.** The guest-priced insert is the only item here that needs no flag to arm it.

#### CLEANUP NOTES

- Pass one: 3 password sign-ins (member ×2, admin ×1) created auth sessions and may have triggered new-device emails to the QA inboxes. No rows were created; every write attempt was refused. Scratch scripts and logs are in `scratchpad/work/A02/` and read credentials from env (none stored).
- Pass two: four `apply_migration` probes, every one raised and rolled back; read-back shows no rows and no recorded migrations. No QA sign-in happened in pass two.

---

### A03 — SUPABASE, THE SCHEMA AND THE SQL: merged pass one + pass two

Sources: `pass1/A03-schema.md` (Agent 3; live project `uccixoonmbhrnyczyigt`, Postgres 17.6, eu-west-1; repo origin/main `0ab215f`) and its pass-two review `pass2/R-A03-by-A08.md` (Agent 8). Both passes proved RLS behaviour with `DO` blocks through `apply_migration` that `set local role authenticated|anon`, set `request.jwt.claims`, ran a control, and always ended in `raise exception 'ROLLED BACK ON PURPOSE …'`; nothing was committed (pass one: no `audit_a03_*` migration; pass two: 0 `audit_%` rows in `schema_migrations`). Only side effect: sequence gaps (`agent_ref_seq`, listing reference sequence).

> **The key fact for every fix in this area (from the pass-two review).** Admins write as `authenticated`: `requireAdmin()` returns `session.supabase` (`lib/admin/guard.ts:73-75`), and business approve/reject (`business-actions.ts:150`), listing review (`actions.ts:533`), agent application review (`actions.ts:296`), badges (`standing-actions.ts:98`), reports and risk alerts all go through `access.supabase`. So any fix that is only a column-GRANT revoke from `authenticated` breaks the admin console. The guard has to be a BEFORE trigger that asks `private.has_role(auth.uid(),'admin'|'super_admin')`, or the admin writes must move to RPCs or the service role first. (A07 proved the break in a rolled-back probe; see SEC-P2-03.)

Pass-two tally: confirmed with no change 8; confirmed with fix amended 9; severity changed 2 (DB-02 danger-now removed; DB-04 HIGH→MEDIUM); partially withdrawn 1 (DB-13); unchallenged 1 (DB-14); new 2 (DB-P2-01, now merged into ESC-02; DB-P2-02).

#### DANGER NOW

1. **DB-01: any signed-in member can publish a VERIFIED business (tier 3) that anonymous visitors see in the catalogue, and it can take table reservations.** No review, no KYC. Proven with a rolled-back probe (below). All it takes is a free sign-up and the publishable key. The fake business also makes its owner a "checked person" (`public.is_checked_person` reads `businesses.verified`), so they get a public verified badge tier through `public.person_badge`.
2. **DB-02: any approved lister (tier-0 agent, unverified) can insert or flip a listing straight to `PUBLISHED`, `featured = true`, with "physically inspected", "address verified" and "mandate verified" stamps set on it.** This skips admin review, the listing fee and every trust mark. Proven with a rolled-back probe. Today there are no real agents, so the exposure is limited to whoever is approved next.

Both come from the same root cause (DB-06): write grants on the whole table, plus a permissive "owner can do ALL" policy, with no column-level or state-transition guard.

*Pass-two note:* item 1 (DB-01) stands and is the canonical ID for A04's SEC-01 DANGER NOW (live-proved over the wire). Item 2 (DB-02) is no longer DANGER NOW: it stays CRITICAL but latent, because agents are admin-created and no non-demo agent exists. The root-cause fix proposed in pass one (column grants) must be replaced by the trigger fix carried in DB-01/DB-02.

#### FINDINGS (pass one, with pass-two verdicts)

#### DB-01 | RLS / businesses | CRITICAL | Any member can create a PUBLISHED, verified (tier 3) business that anon sees, and take reservations for it
- **WHAT IS WRONG:** `businesses_owner_all` is `FOR ALL USING/CHECK (owner_id = auth.uid())`, and `authenticated` holds INSERT and UPDATE on **every** column of `businesses`, including `status`, `verification_tier`, `source`, `reviewed_at` and `published_at`. The trigger `derive_business_badge` then turns the client-supplied tier into `verified = true`. No trigger guards status transitions.
- **WHERE:** live policy `public.businesses.businesses_owner_all`; grants on `public.businesses`; `private.derive_business_badge()`; `private.reservation_is_valid()` accepts any first_party, PUBLISHED, non-demo restaurant.
- **EVIDENCE:** (rolled-back probe, set local role authenticated, sub = QA member)
  ```
  insert into public.businesses(owner_id, kind, name, slug, status, verification_tier, source, published_at)
  values ('<QA member>','restaurant','probe biz','probe-biz-a03','PUBLISHED',3,'first_party',now())
  → member_business_insert: {"status":"PUBLISHED","verified":true,"verification_tier":3,"source":"first_party"}
  | anon_sees_probe_biz=1
  ```
  Second probe: the member also inserted `service_windows` (`member_restaurant_with_windows=ok`), and then a *different* user reserved a table there and self-confirmed it (`guest_self_confirm=CONFIRMED`, see DB-07).
  Existing owner (the example lister): `update businesses set verification_tier = 3` → `business_tier_rows=1 (true/first_party/3)`.
  - **Pass two, A08 (independent rolled-back probe `audit_p2_a08_db01_probe`):** `CONTROL draft ok; ATTACK insert: {"tier": 3, "status": "PUBLISHED", "verified": true}; ATTACK update draft->published rows=1; windows ok; anon sees biz=1; anon catalogue rows=1; person_badge=gold; reservation by other user + self-confirm=CONFIRMED;`. No guard was found: `derive_business_badge` *derives* `verified` from the client tier; `catalogue_on_business` publishes to the catalogue; the demo triggers police only `is_demo`/`agent_id`; `sync_row_location`, `fan_out_business_source` and `refresh_agent_badge_tier_on_business` do not guard. Correction: the badge the owner earns is `gold`, not "tier 3 platinum".
  - **From SEC-01 (A04 pass one, live over the wire with the QA member's JWT against PostgREST, then deleted):**
    ```
    insert draft business 201 [{"id":"955163b4-…","status":"DRAFT","verified":false,"verification_tier":0}]
    self-set verification_tier=4 + reviewer 200 [{"id":"955163b4-…","status":"DRAFT","verified":true,"verification_tier":4,"reviewer_id":"957b3bd2-…(the member)","reviewed_at":"2026-09-23T20:36:32.02+00:00"}]
    self-set status UNDER_REVIEW 200 [{"id":"955163b4-…","status":"UNDER_REVIEW"}]
    cleanup delete 200 […]      after delete []
    ```
    SQL afterwards: `left_over 0, catalogue rows 0, audit rows null` — the self-verification left no audit trail. The `accommodations` under a business are equally owner-writable (`status, featured, star_rating, reviewed_at, reviewer_id, published_at, is_demo`, via `accommodations_owner_all` = `private.owns_business(business_id)`).
  - **Pass two, A07 (rolled-back probe):** `SEC-01 member self-set tier -> verified=true tier=3`.
  - **From SUP-02 (A07 pass one, catalog):** `has_column_privilege('authenticated', …, 'UPDATE')` is true for `businesses.status`, `verification_tier`, `verified`, `is_demo`, `source`, and for `accommodations.status`.
- **WHY IT MATTERS:** a fraudster gets a green "verified" hotel, restaurant or serviced-apartment page in the public catalogue within seconds. Guests book tables or stays against it. `person_badge` then publishes the fraudster as a "checked person". For Nigerian property this is the exact threat the product sells protection from, and it hands an App Store reviewer a guideline 1.1.6/5.x problem.
  - *Pass two (A07 on SEC-01): "guests can reserve against it" is true only for restaurant tables; hotel and shortlet rooms have no booking path at all (SUP-08). Unprobed: whether a member-published hotel's `accommodations` → `room_types` could take paid stays (A08's NOT COVERED); if so, this is also a money finding.*
- **THE FIX:** (amended in pass two)
  1. Add a BEFORE INSERT OR UPDATE trigger `private.guard_business_owner_write()` on `businesses`. It returns NEW unchanged when `current_setting('role')` is `service_role` or `postgres`, or when `private.has_role(auth.uid(),'admin') or private.has_role(auth.uid(),'super_admin')`.
     - Why a trigger and not column grants: **admins write as `authenticated`**. `requireAdmin()` returns `session.supabase` (`lib/admin/guard.ts:73-75`), and business approve/reject/more-info (`lib/admin/business-actions.ts:149-158`), `publishAccommodation` (`:277`), room types (`:320`) and publish (`:349`, `:536`) all run through it. The column-GRANT-only revoke that pass one proposed here (and SEC-01 steps 1–2, and SUP-02) stops every admin decision; A07 proved it in a rolled-back probe (`T1 admin status update after the proposed column-grant fix: ERR 42501 permission denied for table listings`, control `rows=1`). See SEC-P2-03.
  2. For everyone else, on INSERT the trigger forces `status='DRAFT'`, `verification_tier=0`, `source='first_party'` and `is_demo=false`, and nulls `reviewed_at`, `reviewer_id`, `review_notes`, `published_at` and `submitted_at`.
  3. On UPDATE it raises 42501 if any of `verification_tier, verified, source, is_demo, reviewed_at, reviewer_id, review_notes, published_at, owner_id, agent_id` changed. It allows `status` to move only from `DRAFT`, `MORE_INFO_REQUIRED` or `REJECTED` to `SUBMITTED` (stamping `submitted_at := now()`), from `PUBLISHED`/`APPROVED` to `DRAFT` (owner unpublish), or to stay the same. Owner submit and unpublish (`submitHostApplication`, `lib/host/actions.ts:362-364`) must keep working.
  4. Put the same trigger on `accommodations` (including `featured` and `star_rating`), `room_types`, `rate_plans`, `restaurant_profiles` and `service_windows`: an owner cannot set status PUBLISHED there either.
  5. Keep the table grants as they are until the app no longer sends those columns. Pass one's owner grant list omitted `owner_id`, `slug`, `source` and `status`, which the host app's first insert sends (`lib/host/actions.ts:243-252`: `owner_id, source:"first_party", status:"DRAFT", kind, name, slug`), so every host sign-up would have failed 42501. Alternatively, first move every admin decision to `createAdminClient()`, then narrow grants.
  6. Regression probes: this exact ATTACK insert as `authenticated` must end with `status='DRAFT', verified=false`; an owner PATCH of each protected column expects 0 rows or 42501, with a control PATCH of `description` that must succeed; one admin approve as `authenticated` with the QA admin's claims must still succeed after the migration.
  7. (from SEC-01) Check whether any businesses were already self-verified: `select id, owner_id, verification_tier from businesses where verification_tier>0 and not exists (select 1 from business_verification_checks c where c.business_id=businesses.id)`.
- **EFFORT:** 1 day, including the host workspace and admin RPC adjustments and the probe.
- **PASS TWO:** CONFIRMED — DANGER NOW stands — fix amended (a role-aware BEFORE trigger instead of column grants, because admins write through their own `authenticated` client via `requireAdmin`; see SEC-P2-03). Absorbs SEC-01 (businesses half; A04's DANGER NOW, live-proved over the wire) and SUP-02 (businesses half), both MERGED INTO this ID; all CRITICAL. Reviewer (A08) independent rolled-back probe: member inserted a PUBLISHED, `verified=true`, tier-3 business, anon saw it in the catalogue, the owner's person badge became `gold` (correcting pass one's "platinum"), and another user reserved a table there and self-confirmed it.

#### DB-02 | RLS / listings | CRITICAL | A lister can publish, feature and self-stamp "inspected / address verified / mandate verified" on their own listing
- **WHAT IS WRONG:** `listings_owner_all` (FOR ALL) has WITH CHECK "agent is mine", and `authenticated` holds INSERT and UPDATE on all 83 listing columns. Nothing stops the owner writing `status='PUBLISHED'`, `featured`, `physically_inspected_at`, `address_verified_at`, `verified_by`, `mandate_verified_at`, `supply_verified_by`, `reviewed_at` or `listing_fee_*`. `listing_supply_proof_gate` only refuses when a document was *rejected*, and the demo CHECKs only cover `is_demo = true`.
- **WHERE:** `supabase/migrations/20260922230500_track_g_6_the_firm_arm_on_owns_listing_and_the_publish_gate.sql:85-90`; grants on `public.listings`.
- **EVIDENCE:** (rolled-back; the QA member is made an ordinary, unverified agent row inside the transaction, as an approved application would)
  ```
  insert into listings(agent_id,title,property_type,status,state_code,city,featured,physically_inspected_at,address_verified_at,verified_by,mandate_verified_at,supply_verified_by,published_at,reviewed_at) values (...,'PUBLISHED',...,true,now(),now(),'<self>',now(),'<self>',now(),now())
  → agent_insert_published: {"status":"PUBLISHED","featured":true,"listing_role":"agent","insp":true,"addr":true,"mandate":true,"is_demo":false}
  | anon_sees_probe_catalogue=1
  ```
  Existing owner, update path: `draft->published=1(PUBLISHED)`. CONTROL (other member updating that listing): `member_update_others_listing=0`.
  - **Pass two, A08:** `audit_p2_a08_db02_db03_probe`: `DB02 update draft->PUBLISHED rows=1; anon sees forged published=1; anon catalogue rows=1`; `audit_p2_a08_db02b_probe`: `DB02 insert PUBLISHED with self-decider OK`. The one guard that exists, `listings_supply_proof_has_a_decider_chk` (a supply stamp needs `supply_verified_by IS NOT NULL`), is satisfied by the lister's own uid.
  - **Pass two, A04 reviewing SUP-02 (rolled-back probe `selfpublish2`, agent-role owner):**
    ```
    A: DRAFT->PUBLISHED + featured rows=1;
    B: self-stamp inspected+address verified rows=1;
    C: self-stamp mandate verified by self (supply_verified_by = self) rows=1;
    final: PUBLISHED featured=true inspected=true mandate=true ref=VL-X76Q5D;
    system announcement posts=1
    ```
    From the `sup02_fix` probe: `OWNER FAKES LISTING FEE CHARGED (0 minor): rows=1`. Self-publishing also issues a public reference, fires `announce_published_listing` (area feed) and `award_listing_badges` (SUP-P2-03). The CHECK constraints `listings_owner_proves_ownership_chk`, `listings_agent_proves_mandate_chk` and `listings_supply_proof_has_a_decider_chk` constrain which stamp goes with which role, not who may stamp.
  - **From SEC-01 / SUP-02 (catalog):** owner-writable listing columns include `status, featured, reviewed_at, reviewer_id, published_at, address_verified_at, verified_by, listing_fee_minor, listing_fee_rate_id, listing_fee_charged_at, ownership_verified_at, mandate_verified_at, supply_verified_by, is_demo, listing_role`; the only listing status triggers are `listing_supply_proof_gate` (refuses only a *rejected* document) and `suspended_agent_cannot_go_live`.
- **WHY IT MATTERS:** the review queue, the listing fee and every trust mark shown to renters ("physically inspected") can be forged by the lister. The only people with agent rows today are the example lister, so the reach is "the next approved agent". Anyone approved can then forge inspection marks on fake properties.
  - *Pass two: not DANGER NOW. Agents are created only by admins (`agents_manage_admin` is the only write policy; member self-insert → 42501; agent self-verify → 0 rows) and 0 non-demo agents exist, so it becomes exploitable by the first approved lister. A07 also trimmed SEC-01's revenue claim: no code charges a listing fee (`listing_fee_minor` is null everywhere; migration `20260809051502_what_the_platform_charges_and_it_is_nothing`), so faking the fee is a record-integrity problem, not revenue loss today.*
- **THE FIX:** (amended in pass two)
  1. A BEFORE INSERT OR UPDATE trigger on `listings` with the same shape as DB-01: `service_role`/`postgres` and admins (`private.has_role(auth.uid(),'admin'|'super_admin')`) pass. Admin listing review writes `status, reviewer_id, …` as `authenticated` (`lib/admin/actions.ts:533-540`; agent application review `:296`), so a column-grant-only revoke breaks it (SEC-P2-03, proved 42501).
  2. Non-staff INSERT forces `status='DRAFT'`, `featured=false` and null trust stamps.
  3. Non-staff UPDATE may move `status` only DRAFT/MORE_INFO_REQUIRED/REJECTED→SUBMITTED, or PUBLISHED/APPROVED→DRAFT (withdraw/unpublish). The agent writer inserts `status:"DRAFT"` and later updates `status:"SUBMITTED", submitted_at` and `status:"DRAFT"` (`lib/agent/listings-actions.ts:377, 1025, 1061`); `submitListing` and `unpublishListing` must keep working.
  4. Non-staff UPDATE may not touch `featured, published_at, reviewed_at, reviewer_id, review_notes, address_verified_at, physically_inspected_at, ownership_verified_at, mandate_verified_at, verified_by, supply_verified_by, listing_fee_minor, listing_fee_rate_id, listing_fee_charged_at, is_demo, demo_retire_after, reference, listing_role, firm_id, agent_id`.
  5. Narrow the grants (revoke table-wide INSERT/UPDATE; grant only descriptive and price columns) only once the app no longer sends protected columns; drop the table-level INSERT/UPDATE grants `anon` holds on `listings` now.
  6. (from SUP-P2-03) Make `listings_assign_reference`, `listings_announce_after_publish` and `listings_award_badges_after_write` act only on a staff publish (reviewer set by staff, or `current_setting('vallo.publishing')` set by the admin publish RPC), so a future grant slip cannot re-open self-announcement.
  7. Probes: an owner PATCH of each protected column expects 0 rows or 42501, with a control PATCH of `description` that must succeed; one admin review decision as `authenticated` must still succeed after the migration.
  8. Fix DB-03 first or in the same change: once the guard forces DRAFT, the insert…RETURNING refusal makes listing creation fail harder.
- **EFFORT:** 1 day (check the wizard's update column list against the new grant).
- **PASS TWO:** CONFIRMED — SEVERITY CHANGED: CRITICAL/DANGER NOW → CRITICAL (latent; not DANGER NOW) — fix amended (role-aware trigger; the grant-only fix breaks agent submit and admin review). Absorbs SEC-01 (listings half) and SUP-02 (listings half), both MERGED INTO this ID. Reviewer (A08) probes: a draft updated to PUBLISHED and visible to anon; a PUBLISHED insert with a self-decider accepted. A04's review of SUP-02 adds the self-stamped inspected/address/mandate marks, a faked listing-fee charge, a minted reference and an area-feed post.

#### DB-03 | RLS / listings | CRITICAL | Creating a listing fails for every agent: `new row violates row-level security policy`
- **WHAT IS WRONG:** the app creates a draft with `.insert({... status:"DRAFT"}).select("id, status").single()`, which is `INSERT … RETURNING`, and that must also satisfy a SELECT policy on the new row. Since track_g_6 the owner USING clause is `private.owns_listing(listings.id)`, a STABLE SECURITY DEFINER function that looks the listing up **by id in the statement's snapshot**, where the row being inserted is invisible. `status='PUBLISHED'` is false for a draft, so the RETURNING check fails.
- **WHERE:** `apps/web/src/lib/agent/listings-actions.ts:360-379` (last touched `244ff7c`, ~4 h); `supabase/migrations/20260922230500_track_g_6_…sql:86-90`. It is the only policy of this shape (`select … from pg_policies where qual ~ '\((id)\)'` → only `listings_owner_all`).
- **EVIDENCE:** (rolled-back, as an agent)
  ```
  CONTROL draft insert WITHOUT returning rows=1 (owner can then read it back: 1)
  | draft insert WITH returning (what the app does) ERR 42501 new row violates row-level security policy for table "listings"
  ```
  - (from SUP-01) Scratch PG16 repro with the verbatim live function and policies, as `authenticated` with an agent's claims: `A: insert WITHOUT returning (control) -> INSERT ok, visible_after_insert = 1`; `B: WITH pgrst_source AS (INSERT ... RETURNING *) SELECT id, status -> ERROR: new row violates row-level security policy for table "listings"`. Live Postgres log, 2026-09-23T20:36:01Z (A03's own rolled-back probe): `CONTROL draft insert WITHOUT returning rows=1 (owner can then read it back: 1) | draft insert WITH returning (what the app does) ERR 42501 …`. Live data: 64 listings, all `PUBLISHED / is_demo=true`; `max(created_at) where not is_demo` = null.
  - **Pass two, A08:** `CONTROL draft insert no-returning ok, read back=1; DB03 insert RETURNING ERR 42501 new row violates row-level security policy for table "listings"`.
  - **Pass two, A04 reviewing SUP-01 (probe `sup01`, QA member made an owner-role agent in-transaction exactly as approval does, `saveDraft` column subset):** `APP PATH insert...returning (WITH pgrst_source AS (INSERT … RETURNING *) SELECT id): ERR 42501 …; STOPGAP client id + separate select: ok status DRAFT;` (agent role behaves identically). With SUP-01's proposed column-based policy in place: `ERR 42P17 infinite recursion detected in policy for relation "firm_members"`. With the amended definer-helper policy below: `AMENDED FIX app path insert...returning: ok; owner sees own rows=2; stranger update rows=0; stranger sees draft rows=0`.
- **WHY IT MATTERS:** the supply side cannot create its first listing. The user sees the generic `SAVE_FAILED_MESSAGE`. Nobody has hit it only because there are no real agents. This is the same class as the 22 Sep `listing_role` outage that the migration ledger says was fixed. That fix got the insert past 23502, and it now dies on 42501. Also note: when DB-02 is fixed by forcing DRAFT, this makes it fail harder.
  - (from SUP-01) Every approved owner or agent opens `/agent/list`, types a title, and on the first step change sees `SAVE_FAILED_MESSAGE` ("We could not save this listing just now. Nothing you typed was lost. Please try again."). Retrying never works. Photos need a listing id (`ListingWizard.tsx:1312`), so no photo attaches and `submitListing` is unreachable. Zero real supply can enter; it looks healthy because search, the map and the home feed show the 64 examples. Broken since 22 Sep 23:05 UTC, hidden behind the 23502 until 23 Sep 13:45. SUP-01 rated it CRITICAL because it stops all supply entering the business ("THE THIRD BLOCKAGE").
- **THE FIX:** (amended in pass two)
  Use SECURITY DEFINER helpers that take the row's own columns, so the policy never looks the row up by its id and never queries `firm_members` under RLS (proved in A04's rolled-back probe):
  ```sql
  create function private.listing_agent_is_me(p_agent uuid) returns boolean
    language sql stable security definer set search_path = public as
    $$ select exists (select 1 from public.agents a where a.id = p_agent and a.user_id = (select auth.uid())) $$;
  create function private.firm_member_is_me(p_firm uuid) returns boolean
    language sql stable security definer set search_path = public as
    $$ select p_firm is not null and exists (select 1 from public.firm_members m join public.agents a on a.id = m.agent_id
         where m.firm_id = p_firm and m.status = 'active' and a.user_id = (select auth.uid())) $$;
  grant execute on function private.listing_agent_is_me(uuid), private.firm_member_is_me(uuid) to authenticated;
  drop policy listings_owner_all on public.listings;
  create policy listings_owner_all on public.listings for all
    using (private.listing_agent_is_me(agent_id) or private.firm_member_is_me(firm_id))
    with check (private.listing_agent_is_me(agent_id));
  ```
  - Do **not** use a policy that selects from `firm_members` directly (SUP-01's proposed SQL): `firm_members_select_principal` is self-referential and fails with 42P17 (SUP-P2-01).
  - Keep `owns_listing(id)` for child tables (their parent row already exists).
  - Commit the regression probe as `scripts/probes/listing-insert-returning.sql`: `WITH s AS (INSERT INTO listings ... RETURNING *) SELECT` as `authenticated` with an agent's claims, rolled back; it must succeed.
  - Interim, app-only unblock if the migration waits: in `saveDraft`, insert without `.select()` and read back by a client-generated `id` (`crypto.randomUUID()`) — proved working in the `sup01` probe. The policy fix is better.
  - Land this before, or with, the DB-02 guard.
- **EFFORT:** 2 hours plus the probe.
- **PASS TWO:** CONFIRMED — SEVERITY CHANGED HIGH→CRITICAL by merge (SUP-01, MERGED INTO this ID, was CRITICAL as "the third blockage" and was confirmed CRITICAL in pass two) — fix amended (A04 proved SUP-01's column-based policy recurses with 42P17 through `firm_members`; the SECURITY DEFINER helper policy above was proved to work). Reviewer (A08): `DB03 insert RETURNING ERR 42501` with the no-returning control succeeding; the app does `.insert(...).select("id, status").single()` (`listings-actions.ts:377-378`). A08 also noted the interim app-only unblock (client-generated id).

#### DB-04 | Storage / policy grants | MEDIUM | Anonymous `storage.objects` reads now die with 42501 (introduced today)
- **WHAT IS WRONG:** migration `20260923135847_i1_…` created `inspection_photos_objects_party_read` and `_party_insert` on `storage.objects` **without `TO authenticated`**, so they apply to PUBLIC. It then revoked EXECUTE on `private.inspection_photo_path_access(text,boolean)` from anon (lines 283-284). Postgres checks EXECUTE at expression init, so every anon statement that evaluates `storage.objects` SELECT policies fails outright, whatever the bucket.
- **WHERE:** `supabase/migrations/20260923135847_i1_the_inspection_report_its_items_its_photos_and_the_tick_that_closes_it.sql:283-301`.
- **EVIDENCE:**
  - Rolled-back probe: `CONTROL authenticated storage.objects select ok n=0 | anonERR 42501 permission denied for function inspection_photo_path_access`.
  - Over the wire (publishable key, no session):
  ```
  POST /storage/v1/object/list/avatars            → 400 {"statusCode":"403","error":"Unauthorized","message":"permission denied for function inspection_photo_path_access"}
  POST /storage/v1/object/sign/social-media       → 400 same message
  POST /storage/v1/object/sign/listing-videos     → 400 same message
  GET  /storage/v1/object/public/avatars/<obj>    → 200 (public-bucket fetches are unaffected)
  GET  /storage/v1/render/image/public/avatars/…  → 200
  ```
  App paths that sign as anon: `apps/web/src/lib/app/home-queries.ts:453` (`social-media` thumbnails via `anonClient()`), `lib/social/posts-media.ts:81`, `lib/listings/supabase-repository.ts:522` (listing walkthrough videos on the public detail page). All wrap it in try/catch, so the failure is silent.
- **WHY IT MATTERS:** the `social-media` and `listing-videos` buckets have 0 objects today, so nothing looks broken yet (latent). As soon as someone posts a photo or a lister uploads a walkthrough, signed-out visitors (App Store reviewers included) see empty tiles, with no error surfaced. The repo's own probe did not catch it (see DB-20).
- **THE FIX:** `alter policy inspection_photos_objects_party_read on storage.objects to authenticated; alter policy inspection_photos_objects_party_insert on storage.objects to authenticated; alter policy inspection_photos_objects_admin_read on storage.objects to authenticated;`. Then re-run the pg_depend-based check (DB-20) and require 0 anon gaps.
- **EFFORT:** 30 minutes.
- **PASS TWO:** CONFIRMED over the wire — SEVERITY CHANGED HIGH→MEDIUM. Reviewer (publishable key, no session): `POST /storage/v1/object/list/{avatars,social-media,listing-videos,listing-photos}` and `POST /object/sign/social-media/x/y.jpg` all returned `permission denied for function inspection_photo_path_access`; the three `inspection_photos_objects_*` policies still have roles `{public}`. Why lower: the app callers pass one named are not anon — `home-queries.ts:465-468 anonClient()` is the cookie-session client, and every page that signs social media or listing videos now requires sign-in — so no product surface signs as anon today; only raw anon API users hit it. Still a 30-minute correctness fix; the fix is correct.

#### DB-05 | Grants / money | HIGH | A client can insert a bank account with a forged `resolved_account_name` and `recipient_code`, and the withdrawal path trusts both
- **WHAT IS WRONG:** UPDATE on `bank_accounts` is correctly narrowed to `is_default, deleted_at, updated_at`, but **INSERT is granted on every column** (`id,user_id,bank_code,bank_name,account_number,resolved_account_name,resolved_at,recipient_code,…`). The withdrawal code reads `recipient_code` and pays it. If it is null, it creates a recipient from the stored `account_number` and `resolved_account_name` without re-resolving. The code comment at `apps/web/src/lib/wallet/actions.ts:946-948` claims "the owner's column grant does not include recipient_code". That is true for UPDATE and false for INSERT.
- **WHERE:** grants on `public.bank_accounts`; `apps/web/src/lib/wallet/actions.ts:839-960`; the legit insert is at `apps/web/src/lib/payments/bank-accounts-actions.ts:225-234`. `payout_accounts` has the same shape, and there it is worse: table-wide INSERT/UPDATE plus `payout_accounts_own` FOR ALL.
- **EVIDENCE:** (rolled-back, QA member)
  ```
  insert into bank_accounts(user_id,bank_code,bank_name,account_number,resolved_account_name,resolved_at,recipient_code)
  values ('<self>','058','GTBank','0123456789','SOMEBODY ELSE ENTIRELY',now(),'RCP_forged_by_client')
  → member_insert_forged_bank_account: {"resolved_account_name":"SOMEBODY ELSE ENTIRELY","recipient_code":"RCP_forged_by_client"}
  | CONTROL update recipient_code refused: 42501
  ```
- **WHY IT MATTERS:** the Paystack name check is skipped, so a wallet balance can be withdrawn to any third-party NUBAN. That brings back the "send to external banks" feature that was removed permanently, gives a laundering and scam cash-out route, and makes it possible to target another user's recipient code. It is latent now only because payouts are blocked (Starter Business) and no wallet holds real money.
  - *Severity note (pass one's heading said "HIGH (CRITICAL on the Paystack-upgrade day)"):* CRITICAL on the Paystack-upgrade day.
- **THE FIX:** (amended in pass two)
  - *Pass-one fix, retained:* `revoke insert on public.bank_accounts from authenticated; grant insert (user_id, bank_code, account_number) …`. Better: do the insert with the service role inside the server action, after `resolveBankAccountName`, and give `authenticated` no INSERT at all. In the withdraw path, re-resolve the account (or check `resolved_at` was written by the server) before paying. Treat `payout_accounts` the same way: revoke from anon, narrow authenticated, and route writes through the server.
  - *Pass-two amendments:*
    - A narrowed grant `grant insert (user_id, bank_code, account_number)` would break adding a bank account: the legitimate writer is the user client (`payments/bank-accounts-actions.ts:225-234`) and it inserts `bank_name, resolved_account_name, resolved_at`. Move the insert to `createAdminClient()` first, then revoke INSERT from `authenticated`.
    - Compare the Paystack-resolved name with the verified profile/KYC name (normalised token overlap) and refuse, or hold for review, on a mismatch — at add time and again at withdraw time. Without this, any user can honestly add a third-party NUBAN and withdraw to it even after the grant is fixed.
- **EFFORT:** 3-4 hours.
- **PASS TWO:** CONFIRMED — fix amended (move the insert server-side before revoking; compare the resolved name to the account holder). Reviewer: `authenticated` has INSERT on `bank_accounts.recipient_code`, `resolved_account_name`, `resolved_at`, `account_number` (UPDATE false); `payout_accounts` has INSERT and UPDATE on all of them. A08 found the legitimate path has the same hole: it resolves the name but never compares it to the account holder, while Terms §15 promises "a bank account in your own name" (see STORE-09's amendment).

#### DB-06 | Grants | HIGH | RLS is the only gate on ~100 tables: anon and authenticated hold table-wide INSERT/UPDATE/DELETE on ledgers, wallets, roles and badges
- **WHAT IS WRONG:** apart from about 25 tables that were hand-narrowed, `anon` and `authenticated` hold table-wide write privileges on almost everything. That includes `ledger_entries`, `wallet_entries`, `wallets`, `transactions`, `rent_payments`, `user_roles`, `user_badges`, `agents`, `payout_accounts`, `bookings`, `reservations`, `listings`, `businesses` and `profiles`. Every protection against a column being forged depends on no permissive policy ever covering that command. DB-01, DB-02, DB-05, DB-07 and DB-08 are this pattern hitting real policies. The money tables are safe **today** only because no INSERT/UPDATE policy exists on them. One careless `FOR ALL` policy added later would open them.
- **WHERE:** query below; `docs/security/GRANT_STATE.md` describes the write bits as "Supabase's own default grant … a revoke there would be a change to something nobody has shown is reachable". DB-01 and DB-02 show it is reachable.
- **EVIDENCE:** `has_table_privilege('anon', c.oid, 'insert,update,delete')` is true for 96 of 118 public tables. Column-level check: `ledger_entries anon INSERT/UPDATE: id,booking_id,transaction_id,gross_minor,platform_fee_minor,agent_share_minor,…`, `user_roles anon INSERT/UPDATE: user_id,role,granted_at`, `wallet_entries anon INSERT/UPDATE: …amount_minor,…`. TRUNCATE/REFERENCES/TRIGGER are 0 for both roles (fixed by `20260923175705`).
- **WHY IT MATTERS:** defence in depth for money and privilege tables is zero, and the audit cost of every future policy is "re-prove every column".
- **THE FIX:** (amended in pass two)
  - *Pass-one fix, retained:* one migration. `revoke insert, update, delete on all tables in schema public from anon;` then re-grant only what the anon flows need (`post_views`, `story_views` inserts). For `authenticated`, revoke table-wide writes on all money and privilege tables (`ledger_entries, wallet_entries, wallets, transactions, rent_payments, escrows, escrow_evidence, platform_revenue, user_roles, user_badges, agents, agent_badges, fee_rates, audit_log, risk_alerts`). Re-grant column lists on the owner-writable tables per DB-01, DB-02 and DB-05. Change `alter default privileges` so new tables start closed. Add a CI probe that lists every (role, table, column, INSERT|UPDATE) pair against a checked-in allowlist.
  - *Pass-two amendments:*
    - Revoking from **anon** is safe as proposed.
    - For `authenticated`, the proposed list breaks the admin console: revoking writes on `user_badges` breaks the standing console (`standing-actions.ts:98`, `access.supabase…upsert`), and `businesses`, `listings`, `agent_applications`, `reports` and `risk_alerts` are written by admins as `authenticated`. (Revoking on `agents` breaks nothing: the admin writes it via `createAdminClient`, `actions.ts:347`.)
    - So: keep the grants on tables whose admin path is `authenticated`, and guard them with triggers (the DB-01/DB-02 pattern). Revoke `authenticated` writes only on tables with no policy-backed client writer: `ledger_entries, wallet_entries, wallets, transactions, rent_payments, escrows, platform_revenue, fee_rates, audit_log` (see MON-10 for the money-table list and the `wallet_pots` exception). `user_roles` and `user_badges` stay granted, because their admin policies are the gate.
- **EFFORT:** 1-2 days (the work is enumerating the app's write columns, which DB-01, DB-02 and DB-05 partly do).
- **PASS TWO:** CONFIRMED (counts moved) — fix amended (revoke from anon as proposed; for authenticated, revoke only on tables with no policy-backed client or admin writer, and guard the rest with triggers). Reviewer: today anon has some write on 88 of 118 tables and authenticated on 100 of 118; anon INSERT is granted on `ledger_entries, user_badges, user_roles, wallet_entries, wallets`; only 2 write policies exist across the money and privilege set (`user_roles_admin_manage`, `user_badges_admin_write`).

#### DB-07 | RLS / reservations | MEDIUM | A guest can confirm their own table reservation (and edit any column)
- **WHAT IS WRONG:** `reservations_update_own` is `USING/CHECK guest_id = auth.uid()` with a table-wide UPDATE grant, and `reservation_is_valid()` does not guard the status transition. The guest can set `status='CONFIRMED'` and `responded_at`, which is the venue's answer.
- **WHERE:** live policy `reservations_update_own`; `private.reservation_is_valid()`.
- **EVIDENCE:** (rolled-back, the QA admin account acting as guest) `insert … reservations(business_id, guest_id, party_size, reserved_for)` then `update reservations set status='CONFIRMED', responded_at=now()` → `guest_self_confirm=CONFIRMED`.
- **WHY IT MATTERS:** the guest's "confirmed" screen and the notification (the trigger `notify_reservation` fires) say the venue accepted when it did not. The venue's capacity is consumed.
- **THE FIX:** (amended in pass two)
  - *Pass-one fix, retained:* grant UPDATE to authenticated only on `(status, note, party_size, reserved_for)`, and add a transition trigger: the guest may only go PENDING/CONFIRMED→CANCELLED and edit their own note; the host may go PENDING→CONFIRMED/CANCELLED/NO_SHOW/COMPLETED. Also fix `auth_rls_initplan` here: five reservation policies use bare `auth.uid()` (advisor).
  - *Pass-two amendments:*
    - Keep the UPDATE grant. Add a transition trigger instead: a guest (`guest_id = auth.uid()` and not the owner of the business or listing) may only set `status` to CANCELLED from PENDING/CONFIRMED, plus `note` and `conversation_id`. The host/owner may set CONFIRMED/CANCELLED/NO_SHOW/COMPLETED. Staff pass. (Pass one's grant `(status, note, party_size, reserved_for)` omitted `responded_at` and `conversation_id`.)
- **EFFORT:** 3 hours.
- **PASS TWO:** CONFIRMED — fix amended (keep the grant; add a transition trigger). Reproduced inside A08's DB-01 probe: another user reserved and then set `status='CONFIRMED'` → `CONFIRMED`. Pass one's grant list would break the app: guest cancel writes `status, responded_at` (`reservations/actions.ts:309`), host respond writes `status, responded_at` (`:229-231`), both write `conversation_id` (`:196, :256, :324`), and admin writes `status, responded_at` (`admin/bookings-actions.ts:416`).

#### DB-08 | RLS / agent_applications | MEDIUM | An applicant can mark their own application APPROVED and stamp `reviewer_id`
- **WHAT IS WRONG:** `agent_applications_update_draft` has USING `user_id = auth.uid() AND status = 'DRAFT'` but WITH CHECK only `user_id = auth.uid()`, and every column is grantable. So a DRAFT can be written to `APPROVED` with `reviewed_at` and `reviewer_id` set to anyone.
- **WHERE:** Not stated separately in pass one.
- **EVIDENCE:** (rolled-back, QA member) `insert agent_applications(...)` then `update … set status='APPROVED', reviewed_at=now(), reviewer_id='<self>'` → `application_self_status=APPROVED`. It does **not** create an `agents` row (no trigger), so there is no direct privilege gain. The application does, however, skip the SUBMITTED queue and reads as approved everywhere status is shown.
- **WHY IT MATTERS:** the review queue silently loses applications, and admin screens show an approval nobody made, with a forged reviewer.
- **THE FIX:** (amended in pass two)
  - *Pass-one fix, retained:* `with check (user_id = auth.uid() and status in ('DRAFT','SUBMITTED'))`. Remove `status, reviewed_at, reviewer_id, review_notes, submitted_at, reference` from the authenticated UPDATE grant (submission via RPC).
  - *Pass-two amendments:*
    - Also set the INSERT policy WITH CHECK to `status in ('DRAFT','SUBMITTED') and reviewer_id is null and reviewed_at is null`. The legitimate writers insert `status:"SUBMITTED"` (`agent/application.ts:220`, `supply/registration-actions.ts:233`), so this does not break them. Pass one's update check is right.
    - (from SEC-01 / SUP-05 amendments) Freeze `agency_fee_bps`/`legal_fee_bps`, `reviewer_id`, `reviewed_at`, `review_notes` after submit.
- **EFFORT:** 1 hour.
- **PASS TWO:** CONFIRMED — fix amended (pass one missed the INSERT variant). Reviewer probe `audit_p2_a08_misc_probe`: `applicant INSERT straight to APPROVED with forged reviewer`; `agent_applications_insert_own` checks only `auth.uid() = user_id`. A07 (on SEC-01) confirms nothing grants supply access from that status, but it can wedge the admin queue because `reviewAgentApplication` refuses anything already "decided". See also SUP-05's amendment (the MORE_INFO_REQUIRED path must tighten WITH CHECK at the same time).

#### DB-09 | Views / privacy | MEDIUM | `person_badge` (definer view) lets anyone list every staff account's user id
- **WHAT IS WRONG:** `public.person_badge` has `reloptions = null`, which means it runs as its owner (not `security_invoker`) over `user_roles ∪ agents ∪ businesses`. It is granted to anon and returns `user_id, tier` for every staff and checked person. `public.is_platform_staff(uuid)` is anon-executable as a staff oracle. `social_profiles` (public, `NOT blocked_with`) carries `user_id → handle`, so staff handles are also exposed. `GRANT_STATE.md §3.1` lists this as "UNPROVEN … worth somebody's next hour". It is now proven.
- **WHERE:** Not stated separately in pass one.
- **EVIDENCE:** (rolled-back, `set local role anon`) `select … from public.person_badge` → `2255d905-…=platinum ; 03f3dd52-…=platinum` (the super admin and the QA admin). `is_platform_staff(QA admin)=t`. CONTROL: `anon published listings=64`, `anon profiles rows=0`. The security advisor lists all three views as `security_definer_view` ERROR.
- **WHY IT MATTERS:** it tells an attacker exactly whose account to phish or social-engineer. It also contradicts the explicit design goal in migration `r_sh4 … still no user id`.
- **THE FIX:** stop publishing `user_id`. Either expose tier through `listing_lister_tier` (listing_id → tier, already done) and a `social_profiles`-keyed projection (`handle → tier`), or make the view `security_invoker` and restrict it to `authenticated`. Revoke EXECUTE on `is_platform_staff` and `is_checked_person` from anon (the view is their only anon caller). Also: `fee_rates.created_by` and `user_badges.granted_by` are anon-readable admin uuids, so drop those columns from the anon grant.
- **EFFORT:** 3 hours.
- **PASS TWO:** CONFIRMED. Reviewer anon probe: `CONTROL anon published=64; anon person_badge=2255d905=platinum,03f3dd52=platinum`; the advisor (re-run 20:59Z) still lists `person_badge` under `security_definer_view` and `is_platform_staff` as anon-executable (`has_function_privilege('anon',…)=true`).

#### DB-10 | Grants / privacy | HIGH | Any signed-in account reads every published listing's street address, landmark and review notes, and every firm's CAC, TIN and representative phone
- **WHAT IS WRONG:** `anon` is correctly narrowed on `listings` (address, landmark, reviewer_id, review_notes, verified_by, firm_id and the fee columns are withheld). `authenticated` still holds SELECT on all columns, and `listings_select_published` applies to PUBLIC. Sign-up is free, so "signed-in" is effectively "public". `GRANT_STATE.md §4.1` records the businesses half as a deliberate residual. The listings half (`address`, `landmark`, `review_notes`) is not recorded.
- **WHERE:** Not stated separately in pass one.
- **EVIDENCE:** `has_column_privilege('authenticated','public.listings', …)`: denied columns = `null` (none). Anon denied = `address,landmark,reviewer_id,review_notes,verified_by,listing_fee_minor,listing_fee_rate_id,listing_fee_charged_at,firm_id,ownership_verified_at,mandate_verified_at,supply_verified_by`.
- **WHY IT MATTERS:** the exact address of an occupied rental or a for-sale house, plus the moderator's private notes, is readable by any throwaway account through `/rest/v1/listings?select=address,landmark,review_notes`. All 64 rows are examples today, so nothing real leaks yet.
  - *Severity note (pass one's heading said "HIGH (CRITICAL at the first real listing)"):* CRITICAL at the first real listing.
  - *Pass two: because the product is now sign-in only, anon narrowing protects nothing in practice; the `authenticated` grant is the only line that matters.*
- **THE FIX:** revoke SELECT on `listings` from authenticated and re-grant the anon column list plus the columns an owner or admin needs *through a function or view*: an owner/admin reads address and notes via SECURITY DEFINER RPCs `my_listing_detail(id)` and `admin_listing_detail(id)`, or via a `listing_private` side table with owner/staff-only RLS. Move `address, landmark, review_notes, reviewer_id` out of `listings` into `listing_private(listing_id pk, …)`. That is the clean version. Do the same for `businesses` (cac_number, tin, representative_*).
- **EFFORT:** 1-2 days (the admin and host reads must move).
- **PASS TWO:** CONFIRMED (latent). Reviewer: `has_column_privilege('authenticated','public.listings','address','SELECT')=true` (anon false); `businesses.tin` readable by authenticated; today 0 published listings carry `address`, `landmark` or `review_notes`, and 0 of 7 published businesses carry tin, cac or representative phone, so nothing real leaks yet.

#### DB-11 | Schema drift | MEDIUM | The migration history does not match the repo: 70 files are not in the live history under their version, 3 live migrations have no file, and 2 pending files are unapplied
- **WHAT IS WRONG:** `supabase_migrations.schema_migrations` has 306 rows and `supabase/migrations/*.sql` has 303 files. Comparing by **version**: 73 live versions have no file with that version, and 70 files have versions that are not live. Most are the same name with a synthetic timestamp in the file (e.g. file `20260812090100_pots_move_money_under_the_wallet_lock.sql` vs a live version from 22 Sep). Comparing by **name**: live migrations with **no file of any version** are `the_two_qa_accounts_are_named_excluded_and_one_of_them_is_an_admin` (creates `public.qa_accounts`, confirmed by `grep -rl qa_accounts supabase/` → nothing), `the_invariant_dedup_guard_stands` and `two_push_drain_alerts_outlived_the_fault_they_reported`. Three are renamed (`nine_identical_rows_fold_into_one…`, `nine_private_functions_were_never_born_locked…`, `one_bad_character_in_a_blocked_term…` vs file `blocked_terms_guard_against_regex_metacharacters`). `supabase/migrations/pending/` holds `20260918150300_b5_verification_is_required_is_not_a_client_call.sql` and `20260919101800_b4_the_flags_already_written_lose_their_digits.sql`, which are not live. The live state agrees they are unapplied: `public.verification_is_required(uuid)` is still EXECUTE-able by authenticated.
- **WHERE:** `list_migrations` result versus `ls supabase/migrations`. The diff lists are in my scratch folder `work/A03/{live_v,file_v,ln,fn_all}.txt`.
- **EVIDENCE:** Not stated separately in pass one.
- **WHY IT MATTERS:** `supabase db push` would try to apply about 70 "new" local migrations (many not idempotent) against prod. `supabase db reset` or a branch would build a schema without `qa_accounts` or the dedup guard. Disaster recovery "from the repo" does not reproduce prod.
  - *Pass two amendment: `supabase db push` does not blindly apply the ~70 "new" files — the CLI first refuses with "Remote migration versions not found in local migrations directory" and asks for `migration repair`. The real risks are a wrong `repair --status applied`, and `db reset` or branching building a different schema.*
- **THE FIX:** dump the three missing migrations' SQL from `schema_migrations.statements` into files. Rename the 70 files to their live versions (or `supabase migration repair --status applied <version>` per file and delete the duplicates). Decide on the two pending files (apply or delete). Add a CI step that diffs `schema_migrations` (version and name) against the directory.
- **EFFORT:** half a day.
- **PASS TWO:** CONFIRMED — why-it-matters amended (see the note under WHY IT MATTERS). MEDIUM stands. Reviewer: 306 live rows vs 303 files on origin/main; the 3 named live-only migrations exist in the live table (`named=3`) with no file; `pending/` still holds the two unapplied files. (A10, reviewing OPS-08, also counted 306 live vs 304 files and left the diff to this finding.)

#### DB-12 | Performance | MEDIUM | `stays_search` takes 250-290 ms to return 5 rows, and it is the catalogue's search
- **WHAT IS WRONG:** `pg_stat_statements`: `stays_search` via PostgREST has mean **236 ms** (94 calls) and **254 ms** (69 calls) with only `p_entity_kinds, p_limit` passed, and 120 ms with filters. `explain analyze select * from stays_search(array['accommodation'], 12)` gives `Execution Time: 291.020 ms, rows=5, shared hit=3237`. The same data accessed inline takes **1.6 ms** (index scans on `catalogue_entries_shelf_idx`, `room_types_accommodation_idx`). So the cost is inside the function, not in the data. It is a `LANGUAGE sql STABLE` function with `SET search_path = ''`, which prevents inlining and forces a re-plan of a very large query on every call. Cause is **UNVERIFIED** (I could not get the inner plan); the measurement is verified.
- **WHERE:** Not stated separately in pass one.
- **EVIDENCE:** Not stated separately in pass one.
- **WHY IT MATTERS:** at 71 catalogue rows it already costs a quarter of a second, and anon has a `statement_timeout=3s`. With a dated query it runs a lateral per row with `generate_series` over nights, so this is the first query to hit anon's 3 s timeout as the catalogue grows. At 10,000 rows, a dated search without city filter evaluates the accommodation lateral 10k times.
- **THE FIX:** rewrite it as `plpgsql` (cached plan) or drop the `SET search_path` and schema-qualify, so the SQL function inlines. Push `limit` into `base` when no price or date filter applies. Replace `count(*) over ()` with a capped count. Then re-measure with `auto_explain`.
- **EFFORT:** 1 day.
- **PASS TWO:** CONFIRMED. Reviewer: `explain analyze select * from stays_search(p_entity_kinds => array['accommodation'], p_limit => 12)` → `Execution Time: 170.622 ms, rows=5, shared hit=3237` — warmer than pass one's 291 ms, still two orders of magnitude over inline; `LANGUAGE sql STABLE` with `search_path=""`, called from `lib/stays/search.ts:336` and `lib/stays/queries.ts:84`.

#### DB-13 | Performance | LOW | Listings carry 31 indexes, and a trivial anon read took 41 ms to plan versus 0.2 ms to execute
- **WHAT IS WRONG:** As the title states (no separate statement in the source).
- **WHERE:** Not stated separately in pass one.
- **EVIDENCE:** (rolled-back, `set local role anon`, bbox query on listings) `Planning Time: 40.913 ms | Execution Time: 0.222 ms`. The plan shows RLS short-circuits correctly (`status = 'PUBLISHED' OR owns_listing(id) OR has_role(...)`, with status first). PostgREST listing-card reads have mean 22-49 ms for 64 rows. The advisor reports 74 unused indexes (13 on listings). With 64 rows `idx_scan=0` proves nothing, so **do not drop on this evidence**. There are 5 true duplicates: `local_governments_state_idx` = `local_governments_state_code_name_key`, `business_photos_business_idx` = `business_photos_business_id_position_key`, `escrow_float_snapshots_as_of_idx`, `fee_rates_kind_effective_idx` (DESC twins of unique keys), and `payout_accounts_agent_idx` (prefix of `payout_accounts_agent_number_uq`).
- **WHY IT MATTERS:** planning dominates every catalogue request, and every listing write maintains 31 indexes. The planning measurement was taken in a cold backend and may overstate (UNVERIFIED on a warm pooled connection).
- **THE FIX:** drop the 5 duplicates now. Revisit the listing partial indexes after real traffic (keep `pg_stat_statements` and `pg_stat_user_indexes` snapshots weekly).
- **EFFORT:** 1 hour.
- **PASS TWO:** PARTIALLY WITHDRAWN. The "41 ms planning" claim did not reproduce (two bbox runs planned in 1.7 ms and 3.7 ms, as the bypass role without RLS expressions; likely a cold-backend artefact, as pass one half-suspected) and is withdrawn. The 5 duplicate indexes stand (LOW); the reviewer did not re-verify them individually.

#### DB-14 | Performance | LOW | 18 foreign keys without a covering index
- **WHAT IS WRONG:** As the title states (no separate statement in the source).
- **WHERE:** Not stated separately in pass one.
- **EVIDENCE:** `unindexed_foreign_keys` (advisor): `email_outbox.user_id`, `escrow_evidence.author_id`, `escrows.{disputed_by,opened_by,release_requested_by,resolved_by}`, `fee_rates.created_by`, `inspection_reports.author_id`, `platform_revenue.{listing_id,rate_id}`, `price_check_events.{lga_code,listing_id,user_id}`, `price_check_shares.{created_by,lga_code}`, `price_check_watches.{lga_code,state_code}`, `push_queue.collapsed_into`.
- **WHY IT MATTERS:** deleting or anonymising a user or listing seq-scans these tables under lock. That is harmless at today's sizes, and the account purge will slow down as they grow.
- **THE FIX:** `create index concurrently` on each (the admin-actor ones can be partial `where col is not null`).
- **EFFORT:** 1 hour.
- **PASS TWO:** UNCHALLENGED — the reviewer did not re-run the performance advisor (low stakes); pass-one severity stands.

#### DB-15 | RLS performance/craft | LOW | 411 "multiple permissive policies" and 5 per-row `auth.uid()` policies
- **WHAT IS WRONG:** As the title states (no separate statement in the source).
- **WHERE:** Not stated separately in pass one.
- **EVIDENCE:** advisor `multiple_permissive_policies` WARN ×411. The `*_admin_all` and `*_owner_all` FOR ALL policies also apply to SELECT, so every read evaluates admin and owner functions as well. `auth_rls_initplan` ×5, all on `reservations` (`guest_id = auth.uid()` rather than `(select auth.uid())`).
- **WHY IT MATTERS:** Not stated separately in pass one.
- **THE FIX:** split the `*_all` policies into per-command policies. Wrap `auth.uid()` in `(select …)` on reservations.
- **EFFORT:** half a day.
- **PASS TWO:** CONFIRMED. Reviewer's policy dump: `reservations_insert_own`, `reservations_select_host`, `reservations_select_own`, `reservations_update_host` and `reservations_update_own` use bare `auth.uid()`.

#### DB-16 | Constraints / deletion | MEDIUM | Deleting a user from the dashboard cascades away the *other* party's conversations, flagged messages and reports
- **WHAT IS WRONG:** money is protected: `bookings.guest_id`, `escrows.payer_id/payee_id`, `rent_payments.*`, `wallets.user_id` and `escrow_evidence.author_id` are RESTRICT, and `transactions`, `ledger_entries` and `wallet_entries` are RESTRICT up the chain. The app's own purge anonymises `auth.users` (`purge_account_rows` updates email and phone rather than deleting), so it never fires cascades. But a dashboard or Admin-API delete does: `conversations.{guest_id,agent_id}` CASCADE → `messages` → `message_flags` and `message_attachments` CASCADE. `reports.reporter_id` CASCADE. `agents.user_id` CASCADE → `listings` CASCADE → `reviews`, `inspection_requests`, `reservations` and `saved_items` CASCADE. It is blocked only if a booking exists (RESTRICT, which then aborts the delete).
- **WHERE:** Not stated separately in pass one.
- **EVIDENCE:** Not stated separately in pass one.
- **WHY IT MATTERS:** one deletion destroys the counterparty's message history and the moderation evidence (`message_flags`) that a dispute or law-enforcement request would need.
- **THE FIX:** (amended in pass two)
  - *Pass-one fix, retained:* change `conversations.guest_id/agent_id`, `messages.sender_id`, `reports.reporter_id` and `message_flags` parents to `ON DELETE SET NULL` (make the columns nullable), or RESTRICT, and document "never delete users from the dashboard; use the purge". Consider RESTRICT on `agents.user_id` so a lister cannot vanish with their listings' reviews.
  - *Pass-two amendments:*
    - Also change `conversations_booking_id_fkey` and `conversations_reservation_id_fkey` to SET NULL: today an admin deleting a booking or reservation row silently deletes its whole message thread.
- **EFFORT:** half a day.
- **PASS TWO:** CONFIRMED, and wider — fix amended. Reviewer's `pg_constraint` read shows CASCADE on `conversations_agent_id_fkey` and `conversations_guest_id_fkey` → auth.users, `messages_sender_id_fkey`, `messages_conversation_id_fkey`, `message_flags_message_id_fkey`, `reports_reporter_id_fkey`, `agents_user_id_fkey`, `listings_agent_id_fkey`; missed by pass one: `conversations_booking_id_fkey` and `conversations_reservation_id_fkey` are also CASCADE.

#### DB-17 | Storage | MEDIUM | KYC documents can be overwritten or deleted by the applicant after approval
- **WHAT IS WRONG:** `agent_documents_objects_update_own`, `_delete_own` and the same pair on `host-documents` let the owner replace or delete any object in their own folder at any time. `agent_documents` rows carry `storage_path` and `review_status` but no content hash, so an approved ID can be swapped for another file after the reviewer looked.
- **WHERE:** Not stated separately in pass one.
- **EVIDENCE:** storage policy dump (`agent_documents_objects_update_own … UPDATE Q: bucket_id='agent-documents' AND foldername(name)[1]=auth.uid()`). `agent_documents` columns include no hash.
- **WHY IT MATTERS:** Not stated separately in pass one.
- **THE FIX:** (amended in pass two)
  - *Pass-one fix, retained:* drop the UPDATE and DELETE policies (uploads are new paths, as `inspection-photos` already does: "a photograph … is evidence"). Or restrict them to objects whose row is still `pending` via a helper. Store `sha256` at review time.
  - *Pass-two amendments:*
    - Dropping UPDATE breaks uploads as written: the uploaders use `upsert: true` (`components/agent/ApplyWizard.tsx:355`, `components/supply/UploadCard.tsx:107`), and upsert on an existing path needs the UPDATE policy, so every retry of the same path would fail. Switch both uploaders to a unique path per attempt (`<uid>/<uuid>-<name>`) with `upsert:false` first. Then drop UPDATE and DELETE, or restrict them to objects with no reviewed `agent_documents` row.
- **EFFORT:** 2 hours.
- **PASS TWO:** CONFIRMED — fix amended (switch uploaders to unique paths before dropping UPDATE). Reviewer: the storage policies `agent_documents_objects_{update,delete}_own` and `host_documents_objects_{update,delete}_own` exist (authenticated, folder = uid). The same issue is SEC-12 (A04), confirmed there with the same amendment; not in the known-duplicate list, so both IDs are kept.

#### DB-18 | Security advisor | LOW | Remaining advisor lines, triaged
- **WHAT IS WRONG:**
  - `security_definer_view` ERROR ×3: `person_badge` (real, see DB-09), `listing_lister` and `listing_lister_tier`. The last two are intentional one-fact projections over PUBLISHED listings, so no fix is needed beyond a comment.
  - `function_search_path_mutable` ×2: `private.escrow_evidence_is_append_only` and `public.badge_tier`. Neither is SECURITY DEFINER, so the risk is low. Fix with `alter function … set search_path = ''`.
  - `anon_security_definer_function_executable` ×3: `platform_stats` (intended), `is_platform_staff` and `is_checked_person` (revoke from anon, see DB-09).
  - `authenticated_security_definer_function_executable` ×21: I read all 21. The admin ones (`admin_*`, `escrow_admin_resolve`, `set_fee_rate`, `review_kyc_document`, `admin_user_id_by_email`) check `has_role(auth.uid(), admin|super_admin)` before acting. The self-scoped ones (`open_account_deletion`, `business_transfer_board`, `end_session`, `my_sessions`) check `auth.uid() = p_user`. `agent_trust(uuid)` and `verification_is_required(uuid)` answer for **any** user id (reply-time median, deal count, signup role). That is low sensitivity, but `verification_is_required` was meant to be revoked (see the pending file in DB-11).
  - `auth_leaked_password_protection` WARN: HaveIBeenPwned check disabled. Enable it in Auth settings (MEDIUM for an app that holds money; it is a dashboard toggle).
  - `rls_enabled_no_policy` INFO ×7 (`blocked_terms, email_outbox, idempotency_records, known_devices, platform_revenue, rate_limits, private.reconciliation_watch`): correct. They are service-role-only tables and anon/authenticated hold no grants on them.
- **WHERE:** Not stated separately in pass one.
- **EVIDENCE:** Not stated separately in pass one.
- **WHY IT MATTERS:** Not stated separately in pass one.
- **THE FIX:** Not stated separately in pass one.
- **EFFORT:** 1 hour total.
- **PASS TWO:** CONFIRMED. Advisor re-run: 3 `security_definer_view` ERROR, 2 `function_search_path_mutable`, 3 anon definer, 21 authenticated definer, `auth_leaked_password_protection`. The reviewer spot-checked 5 of the 21 (`account_deletion_blockers`, `admin_expire_stale_withdrawal_holds`, `admin_payment_health`, `admin_retire_demo_listings`, `enter_place`): each guards on self or admin, or is benign.

#### DB-19 | pg_cron / alerts | LOW | An open HIGH risk alert says the content filter is empty. It is not (133 terms).
- **WHAT IS WRONG:** As the title states (no separate statement in the source).
- **WHERE:** Not stated separately in pass one.
- **EVIDENCE:** `risk_alerts where status='open'` → 1 row, `content.filter.empty … public.blocked_terms holds no rows …`, created 2026-09-22 22:20. `select count(*) from blocked_terms` → **133**.
- **WHY IT MATTERS:** the admin desk shows a false "App Store submission blocker", which trains operators to ignore alerts.
- **THE FIX:** (amended in pass two)
  - *Pass-one fix, retained:* resolve it, and have the check that raised it auto-resolve when `terms > 0`.
  - *Pass-two amendments:*
    - Set `status='resolved'` where `resolved_at is not null and status='open'`.
    - Add `check (status <> 'open' or resolved_at is null)` (OPS-P2-03 proposes the stricter `check ((status = 'resolved') = (resolved_at is not null))`), and find the writer that set `resolved_at` alone.
- **EFFORT:** 15 minutes.
- **PASS TWO:** CONFIRMED — fix amended (the cause is different). The row shows `status='open'` but `resolved_at='2026-09-23T11:50:27Z'`, `resolved_by=null`: something stamped `resolved_at` without flipping `status` (probably migration `20260923115027_the_desk_stops_saying_the_filter_is_empty…`), a half-resolve bug rather than a missing auto-resolve. OPS-P2-03 (A10's review of A09) found the same row independently. See also DB-P2-02.

#### DB-20 | Process / probe | MEDIUM | The policy-caller probe is manual, text-matching and role-blind, and it missed today's regression (DB-04)
- **WHAT IS WRONG:** `scripts/probes/policy_callers_hold_execute.sql` finds functions by `LIKE '%private.fn(%'` over `pg_get_expr`, checks only `private` and `public`, and ignores `pg_policy.polroles`. As a result it "allowlists" `attachment_path_access` and `escrow_evidence_path_access` for anon even though those policies are `TO authenticated`, so anon never evaluates them. It is run by hand through `apply_migration` and is not in CI. Its last recorded run predates or ignores migration `i1`, which introduced the anon gap on `inspection_photo_path_access`.
- **WHERE:** Not stated separately in pass one.
- **EVIDENCE:** my independent version uses `pg_depend` (every function any policy depends on, any schema), honours `polroles`, and counts a role as reaching a table if it holds any of SELECT/INSERT/UPDATE/DELETE or any column SELECT. Result: `total_pairs 791, ok_pairs 788, bad: anon cannot private.can_see_listing_access(uuid) on listing_access.listing_access_select ; anon cannot private.inspection_photo_path_access(text,boolean) on storage.objects.inspection_photos_objects_party_read ; …_party_insert`. Over the wire, `GET /rest/v1/listing_access` as anon → `401 42501 permission denied for function can_see_listing_access` (harmless: no anon caller in the app, but it is an error rather than an empty set).
- **WHY IT MATTERS:** Not stated separately in pass one.
- **THE FIX:** replace the probe's pair query with the `pg_depend` + `polroles` version (SQL in this finding's evidence). Run it in CI against a shadow database built from the migrations, and as a post-deploy check that fails the deploy. Make `listing_access_select` `TO authenticated`.
- **EFFORT:** half a day.
- **PASS TWO:** CONFIRMED over the wire. Reviewer: `GET /rest/v1/listing_access?select=*` with the publishable key returned `{"code":"42501",…"message":"permission denied for function can_see_listing_access"}`.

#### DB-21 | Naming / coherence | LOW | Several names mislead a new engineer
- **WHAT IS WRONG:**
  - `conversations.agent_id` is an **auth user id** (FK to auth.users), not `agents.id`. Every other `agent_id` in the schema is `agents.id`.
  - `agents` also holds owners and landlords (`role`), and `listing_role` distinguishes them. The table name no longer describes its rows.
  - `listing_status` is reused as the status enum for `businesses` and `catalogue_entries`, and `booking_status` for restaurant `reservations`.
  - There are five money ledgers with overlapping purposes: `transactions` + `ledger_entries` (the original booking-payment path, 0 rows), `wallet_entries`, `platform_revenue`, `escrows` and `escrow_float_snapshots`. Nothing in the schema says which is authoritative.
  - Migration names are prose sentences ("a_column_called_price_per_night_that_held_annual_rent"). They are readable, but you cannot grep them for an object.
- **WHERE:** Not stated separately in pass one.
- **EVIDENCE:** Not stated separately in pass one.
- **WHY IT MATTERS:** Not stated separately in pass one.
- **THE FIX:** `comment on column/table` for each of the above (cheap). Rename `conversations.agent_id` → `host_user_id` when next touching messaging. Write a one-page `docs/schema/MONEY.md` naming the authoritative ledger.
- **EFFORT:** 2 hours for comments and doc.
- **PASS TWO:** CONFIRMED (spot check). Reviewer: `conversations_agent_id_fkey` references `auth.users`, not `agents`.

#### NEW IN PASS TWO

#### DB-P2-01 | RLS / bookings / money | CRITICAL | A guest writes the price of their own booking, and wallet checkout charges that price and confirms the stay

**A guest writes the price of their own booking, and wallet checkout charges that price and confirms the stay.** New in A08's review of A03, and the same defect as ESC-02 (A02 pass one; also SUP-03 and SEC-P2-01). Merged into ESC-02, which now carries this finding's probe (`audit_p2_a08_booking_price_probe3`: a 7-night stay at 15,000,000 kobo/night inserted with `total_minor = 7`, paid through `pay_booking_from_wallet` and CONFIRMED) and its fix points (a BEFORE INSERT pricing trigger or definer `create_booking` RPC, re-derivation in `pay_booking_from_wallet`, and `availability` upsert changed to `on conflict do nothing`).

- **PASS TWO:** MERGED INTO ESC-02 (known cross-area duplicate; canonical severity CRITICAL). Found new in pass two by A08.

#### DB-P2-02 | Alerts hygiene | LOW | Three open risk alerts were created in the last hour by audit probes, including "Cron: account purge, unauthorised"
- **WHAT IS WRONG:** `risk_alerts` now holds 4 open alerts:
  - A03's stale `content.filter.empty`
  - `webhook.paystack.signature_invalid {"http_status":401}` at 20:49:00Z
  - `webhook.yellowcard.unconfigured {"http_status":500}` at 20:49:02Z
  - `cron.account_purge.unauthorised {"http_status":401,"scheduler":"unknown","ran":false,"reason":"secret-mismatch"}` at 20:52:17Z

  The timestamps fall inside the pass-one audit window, and the purge cron's real schedule is `15 3 * * *` (`vercel.json`). So these are almost certainly auditors calling the endpoints unsigned. That shows the alerting works, but it leaves the admin desk showing a false "account purge unauthorised".
- **WHERE:** `public.risk_alerts` (query above).
- **EVIDENCE:** Not stated separately by the pass-two reviewer.
- **WHY IT MATTERS:** Operators learn to ignore the desk, and a real purge failure at 03:15 would look like the one already there.
- **THE FIX:** The orchestrator or founder resolves the three after confirming no real caller. Tomorrow after 03:15 UTC, check that `/api/cron/account-purge` ran authorised (Vercel cron logs), because that is the job App Store 5.1.1(v) relies on. Longer term, tag alerts with a request source so probes are distinguishable.
- **EFFORT:** 15 minutes.
- **PASS TWO:** NEW IN PASS TWO (found by the reviewer, A08). `risk_alerts` query read-only. Related: DB-19, OPS-P2-03, and OPS-03 (whose reviewer saw the same probe-caused alerts).

#### CHECKED AND FOUND SOUND

- **RLS enabled on all 118 public tables.** No table has RLS off. `forced` is false everywhere, which is fine because the owner is `postgres`. `using (true)` for PUBLIC SELECT exists only on reference or public-by-design tables: `agent_badges, amenities, badges, cancellation_policies, feature_flags, fee_rates, follows, landmarks, local_governments, occupations, post_reposts, states, price_check_shares` (the last has no grant to anon or authenticated, so it is unreachable).
- **TRUNCATE/REFERENCES/TRIGGER:** 0 tables for anon or authenticated (migration `20260923175705` works).
- **Money tables have no client write policy:** `ledger_entries`, `wallet_entries`, `wallets`, `transactions`, `escrows`, `rent_payments` and `platform_revenue` have SELECT-only policies. Writes go through SECURITY DEFINER RPCs. (The grants are still too wide, see DB-06.)
- **`wallet_pots`:** balance changes are refused by `wallet_pots_guard` unless `pots.moving='yes'`. Only `move_into_pot` and `move_out_of_pot` set it, and neither is executable by authenticated (`has_function_privilege` false).
- **`user_roles`:** writes only for `super_admin`. `bank_accounts` and `payment_methods` UPDATE are narrowed to `is_default, deleted_at, updated_at` (CONTROL in the DB-05 probe was refused 42501). `payment_methods` INSERT is refused for authenticated.
- **Reviews** require a CONFIRMED booking whose `check_out` is in the past, and the guest cannot update bookings (no policy).
- **Cross-tenant control:** a member updating another lister's listing gets 0 rows. Anon reading `profiles` gets 0 rows.
- **SECURITY DEFINER hygiene:** 0 of 321 definer functions in public and private lack a pinned `search_path`. `pg_graphql` is not installed.
- **`listings` anon column grants cover what the app selects:** `LISTING_SELECT` and `LISTING_DETAIL_SELECT` (`apps/web/src/lib/listings/supabase-repository.ts:159-289`) use only granted columns (`reference, listing_role, has_estate_access, address_verified_at, physically_inspected_at, …` all granted). Embedded `listing_photos`, `listing_amenities` and `listing_videos` are anon-selectable. `outbox.ts:362` selects `address` but runs server-side.
- **Storage bucket flags:** `agent-documents`, `host-documents`, `escrow-evidence`, `inspection-photos`, `message-attachments`, `listing-videos` and `social-media` are private. `avatars`, `social-covers`, `listing-photos` and `accommodation-photos` are public (by design). All buckets have size limits and MIME allowlists. Object-write policies are folder-scoped to `auth.uid()`.
- **pg_cron:** 14 jobs, all active. In the retained history (~31 h): `vallo_release_stale_holds` 126/126 ok, `vallo_push_drain` 126/126 ok, `vallo_reconcile_payments` 32 runs with 1 failure (`invalid URL "https://www.vallospaces.com\n/api/…"`, the pasted-newline bug, fixed and recovered). The HTTP jobs judge the *previous reply's body*, not just the send: `reconciliation_watch.last_verdict = ok_200` with body `{"ok":true,"apply":true,…"charges":{"seen":0,…"reason":"clean"}}`, and `push_drain_watch.last_verdict = ok_200`. `net._http_response` has 78 responses in 6 h, all 200. They currently run over empty tables (0 real bookings, 0 escrows). That is correct, not dry by fault. Overlap: each job completes in under 0.3 s against its interval. The sweeps (`release_stale_booking_holds`, `escrow_sweep_timeouts`) were not re-read for advisory locks, so their idempotence under overlap is UNVERIFIED. `vallo_purge_email_outbox` has never run yet (created after its 02:25 slot).
- **Account purge** anonymises `auth.users` in place rather than deleting, so the RESTRICT FKs on money never trip and financial records survive.
- **NOT NULL without default:** scanning migrations for `add column … not null` without a default finds none. `set not null` appears on `agents.role` (has default `'agent'`), `listings.listing_role` (filled by trigger `listings_fill_listing_role`) and `blocked_terms.category/reason` (service-only table). The app's `support_tickets.reference` insert supplies it (`lib/support/actions.ts:155`).
- **Hot-path indexes exist:** `messages(conversation_id, created_at)`, `notifications(user_id, created_at desc)` plus a partial unread index, `conversations(agent_id)` and the unique `(guest_id, agent_id, listing_id)`, the `listings` GiST on location plus partial btrees, and the `catalogue_entries` GiST/GIN/shelf indexes.

#### CORRECTLY EMPTY vs BROKEN

| Surface | State | Reason |
|---|---|---|
| Agent "create listing" | **BROKEN** | DB-03: INSERT…RETURNING refused 42501 for every agent. There are no real agents yet, so nobody has hit it. |
| Signed-out social-post thumbnails, listing walkthrough videos | Empty now; **BROKEN the moment files exist** | DB-04: anon sign → 42501. Buckets hold 0 objects today. |
| Money reconciliation / push drain | CORRECTLY EMPTY | Jobs run and reply ok. `charges.seen = 0` because there are no real payments. |
| Wallet pots, bank accounts, payment methods | CORRECTLY EMPTY | 0 rows. The tables and policies work. |
| Admin risk desk "content filter empty" | WRONG (stale) | DB-19. |

*Pass-two note:* "Agent create listing — BROKEN" is now DB-03 at CRITICAL (merged with SUP-01). The signed-out storage row is MEDIUM (DB-04): no product surface signs as anon today.

#### NOT COVERED

- A signed-in over-the-wire PostgREST proof of DB-01, DB-02, DB-05, DB-07 and DB-08. The permission classifier refused the script. The SQL `set local role authenticated` proofs stand, but PostgREST adds nothing that would change them (same role, same claims). A pass-two agent with the QA member JWT could confirm DB-01 with a duplicate-slug insert, which creates nothing.
- The inner plan of `stays_search` (cause of the ~290 ms, DB-12).
- Advisory locking and idempotence inside `release_stale_booking_holds`, `escrow_sweep_timeouts` and `escrow_invariants_check` under overlap.
- Every private SECURITY DEFINER function (231) read line by line. I read the ones called by policies or triggers on the tables above and all 21 authenticated-executable public ones.
- Full dead-object sweep. Low-reference tables found: `rate_calendar` (0 app references outside types, so the host cannot edit per-date rates in the app?), `qa_accounts`, `idempotency_records`, `known_devices`, `admin_bootstrap` and `account_deletion_requests` (used via RPC or triggers). Dead columns and types were not enumerated.
- Realtime publication and `realtime.messages` policies (not checked).
- Backups/PITR: the MCP `get_project` returns no plan or backup fields. `archive_mode=on` with a WAL-G `archive_command`, so WAL archiving exists, but whether PITR is enabled, and the retention, is **UNVERIFIED**. `max_connections=60`, `shared_buffers=224MB` suggests the smallest compute tier. DB size is 40 MB.

**Pass two (A08) did not cover:**

- `inspection_requests_update_party` is `USING/CHECK requester_id = uid OR lister_id = uid` with no visible transition guard. A requester might be able to set the inspection's `state` to a completed or passed value. I saw the policy but did not probe it. It is UNVERIFIED and worth one probe.
- The DB-01 chain into `accommodations` → `room_types` → stay bookings with money (the owner-all policies are keyed on `owns_business`). Not probed. If a member-published hotel can take paid stays, DB-01 becomes a money finding too.
- The DB-14 advisor re-run, and the individual DB-13 duplicate indexes.
- An over-the-wire signed-in proof of DB-01, DB-02 or DB-P2-01. The SQL role-switch proofs used the same role and claims PostgREST would.

#### FOR THE FOUNDER

1. **Decide today on DB-01/DB-02**: close them before any real host or agent is approved. They let anyone mint "verified" and "inspected" marks.
2. **Paystack upgrade day** (DB-05): before payouts are switched on, the bank-account insert must be server-only and withdrawals must re-verify the account name. Otherwise "send to external bank" is back.
3. **Backups**: open Supabase → Project Settings → Add-ons/Database → Backups and confirm (a) the plan, (b) whether PITR is enabled and its window. If a table were dropped at 3 am on the free or Pro daily-backup plan, you would restore the whole database to the last daily snapshot and lose up to 24 h of wallet and ledger writes. PITR (a paid add-on) is the only way to get back to 02:59. Only you can see or buy this.
4. **Leaked-password protection** (DB-18): an Auth dashboard toggle. Turn it on.
5. **Address privacy policy** (DB-10): decide whether a signed-in stranger may see a listing's street address before an inspection is booked. The current schema says yes.

*Pass-two note on item 3 (backups):* A10's review of A09 read the Supabase organisation plan: **Free** (OPS-07, raised to CRITICAL). There are no customer-restorable backups or PITR on that plan.

#### CLEANUP NOTES

- DB-P2-02: three open `risk_alerts` created during the audit window by auditors calling endpoints unsigned (`webhook.paystack.signature_invalid` 20:49:00Z, `webhook.yellowcard.unconfigured` 20:49:02Z, `cron.account_purge.unauthorised` 20:52:17Z). Resolve them after confirming no real caller, and after 03:15 UTC check that `/api/cron/account-purge` ran authorised.
- No rows were committed by either pass; pass two used only the two QA uids, never the QA credentials.

---

### A04 — SECURITY AND ABUSE: merged pass one + pass two

Sources: `pass1/A04-security.md` (Agent 4; repo `85c5471`, live https://www.vallospaces.com and project `uccixoonmbhrnyczyigt`) and its pass-two review `pass2/R-A04-by-A07.md` (Agent 7). QA accounts are referred to only as "the QA member account" and "the QA admin account"; no credential appears in either source or in this file. Pass two ran three rolled-back `DO` probes as `authenticated` with QA uids in `request.jwt.claims`, each with a control; afterwards 0 probe businesses, 0 probe listings, 0 bookings, 0 `a07%` migrations, and `authenticated` still holds UPDATE on `listings` (the in-transaction REVOKE rolled back). No live HTTP writes in pass two.

Pass-two tally: confirmed 12 (6 with fix amended); severity changed 6 (SEC-03, 05, 06 HIGH→MEDIUM; SEC-11, 16 MEDIUM→LOW; SEC-18 LOW→MEDIUM); withdrawn 0; merged 2 (SEC-01 → DB-01/DB-02; SUP-07 → SEC-04); new 4.

#### DANGER NOW

**SEC-01: any signed-in member can self-verify a business (hotel, shortlet, guest house) to tier 4 and write its `status` column directly. No admin review is involved.** Proved live with the QA member's own JWT against PostgREST. Transcript is in SEC-01.

Steps I ran:
1. Created a DRAFT business.
2. PATCHed `verification_tier=4`. The DB derived `verified=true`.
3. Wrote myself in as `reviewer_id`/`reviewed_at`.
4. Moved `status` to `UNDER_REVIEW`.
5. Deleted the row. The deletion is confirmed via SQL: 0 rows, 0 catalogue rows.

I deliberately did not set `PUBLISHED`. Nothing in the schema would have stopped it: there is no policy clause, no column-grant restriction and no BEFORE-UPDATE guard. The `accommodations` under that business are equally owner-writable (`status`, `featured`, `star_rating`, `published_at`).

So today, a stranger can put a "verified" hotel into the stays catalogue in about a minute, and guests can reserve against it. One migration fixes it (see SEC-01).

*Pass-two note:* this DANGER NOW stands, now under the canonical ID **DB-01** (businesses; with accommodations) — SEC-01 is merged there. The "one migration" pass one proposed (column-grant revoke) must not ship as written: it stops the admin review desk (SEC-P2-03). DB-01 carries the role-aware trigger fix.

#### FINDINGS (pass one, with pass-two verdicts)

#### SEC-01 | Authorization / RLS | CRITICAL | Owners can write their own review, verification, publish and fee columns (businesses live-proved; accommodations and listings by schema)

**Owners can write their own review, verification, publish and fee columns (businesses live-proved; accommodations and listings by schema).** This was A04's DANGER NOW: with the QA member's own JWT against PostgREST, a DRAFT business was self-set to `verification_tier=4` (the DB derived `verified=true`), the member stamped themselves `reviewer_id`/`reviewed_at`, moved `status` to `UNDER_REVIEW`, and deleted the row (0 rows and 0 catalogue rows left, and no audit row ever written). It is the same defect as A03's DB-01 (businesses, including `accommodations` and the other owner-writable host tables) and DB-02 (listings), and A07's SUP-02; it is merged into those two canonical IDs, which now carry this finding's wire transcript and schema evidence. **Its pass-one fix (revoke UPDATE from `authenticated`, re-grant content columns) is superseded:** the pass-two reviewer (A07) proved in a rolled-back probe that a column-grant revoke stops every admin decision (`T1 admin status update after the proposed column-grant fix: ERR 42501 permission denied for table listings`), because admins write through their own `authenticated` client via `requireAdmin` (SEC-P2-03). DB-01 and DB-02 carry the amended, role-aware trigger fix. The lower-impact parts of SEC-01 live elsewhere: `agent_applications` self-status and fee columns → DB-08 (and SUP-05's amendment); `payout_accounts_own` rewrite of number/name/recipient → DB-05. A07 also trimmed two claims: "guests can reserve against it" is true only for restaurant tables (rooms have no booking path, SUP-08), and "revenue loss via `listing_fee_*`" is overstated (no code charges a listing fee).

- **PASS TWO:** MERGED INTO DB-01 (businesses half) and DB-02 (listings half) — known cross-area duplicate; canonical severity CRITICAL. A07 in pass two: CONFIRMED, FIX AMENDED (reproduced in a rolled-back probe: `SEC-01 member self-set tier -> verified=true tier=3`); CRITICAL stands for businesses because any member qualifies today.

#### SEC-02 | Authorization / privacy | HIGH | Admins' personal inbox lists every user's private conversations; "Mark all read" marks other people's messages read
- **WHAT IS WRONG:** The inbox query has no participant filter and trusts RLS. RLS gives admins SELECT on all conversations and messages. So the founder (super_admin) and the QA admin see everyone's DMs in their *own* inbox as if they were a party. `markInboxRead` then reads those ≤200 conversation ids through the admin's RLS client and marks every message not sent by the admin as read, using the **service role**.
- **WHERE:**
  - `apps/web/src/lib/messages/live.ts:221-228`: `.from("conversations").select(...).order(...).limit(50)` with no `.or(guest_id.eq.me,agent_id.eq.me)`.
  - `apps/web/src/lib/messages/actions.ts:641-678` (`markInboxRead`): the session read is at `:650`, then `createAdminClient()…update({read_at})…in("conversation_id", ids)`.
  - Policies: `conversations_select` and `messages_select` include `has_role(admin|super_admin)`.
  - Trigger: the "Mark all read" button at `app/(app)/messages/Inbox.tsx:231-240`.
- **EVIDENCE:**
  - Live, with the QA admin's cookie, GET `/messages` returned 200. The HTML contained all four founder conversation ids I checked (`abe1f2fc…`, `f692ed15…`, `2cbd8d72…`, `75822c07…`), counterparts' names, and previews such as `"lastMessage":"im looking to book a room at you guys hotel and im in abuja rn"`.
  - PostgREST as the QA admin: `conversations?select=id,guest_id,agent_id` returned the founder's conversations (guest `2255d905…`).
  - DB: 7 conversations, 15 messages, 15 unread. I did **not** press Mark all read; it would have mutated real users' state.
- **WHY IT MATTERS:**
  - Every admin reads users' private messages as a side effect of opening their own inbox. There is no audit, and it is not a deliberate moderation view. That is an NDPA purpose-limitation problem and a trust problem.
  - One click by the founder silently clears unread state for other users, so they miss replies.
  - The same class affects realtime (the admin's subscription receives all rows) and `lib/rent/queries.ts:152`: an unfiltered `wallet_entries` PENDING-debit sum, so an admin's own rent-pay screen subtracts everyone's pending withdrawals from their balance.
- **THE FIX:** (amended in pass two)
  - *Pass-one fix, retained:* 
    1. In `loadConversationSummaries` add `.or(\`guest_id.eq.${user.id},agent_id.eq.${user.id}\`)`, and filter the recent-messages sweep by those ids (already done).
    2. In `markInboxRead` do the same on the conversation read, and add `.or(...)` participant filtering before the service-role update.
    3. In `lib/rent/queries.ts:152` add `.eq("wallet_id", <own wallet>)`.
    4. Longer term: drop the admin clause from `messages_select`/`conversations_select` and give moderation a separate audited SECURITY DEFINER read (`message_flags` already exists for that).
    5. Grep for every `.from(<table with an admin SELECT policy>)` in non-admin code without an owner filter. The table list is in the evidence query.
  - *Pass-two amendments:*
    - The same unfiltered `wallet_entries` PENDING-debit read also sits in `lib/bookings/checkout-view.ts:141-145`, besides `lib/rent/queries.ts:152`. Both need `.eq("wallet_id", <own wallet>)`, or should go through `wallet_spendable_locked`.
    - `markThreadRead` uses the same "RLS says it's mine" rule: opening another user's thread from the admin inbox clears that user's unread state too. Filter it by participant as well.
- **EFFORT:** 2–3 hours for the three call sites; 1 day for the policy split.
- **PASS TWO:** CONFIRMED (HIGH) — fix amended (two more call sites). Reviewer's rolled-back probe: `SEC-02 admin sees non-party conversations=8 non-party messages=15 | CONTROL member sees non-party conversations=0`. Not by design: the code's own comments contradict it (`markInboxRead`: "RLS answers 'which conversations are yours' and nothing else has to", `lib/messages/actions.ts:650`; `loadConversationSummaries` documented as "The signed-in user's conversations", `lib/messages/live.ts:207`). The admin clause in `conversations_select`/`messages_select` exists for moderation; the inbox wrongly inherits it.

#### SEC-03 | Abuse / email | MEDIUM | Unauthenticated email relay: anyone can make Vallo mail any address with attacker-chosen name and text
- **WHAT IS WRONG:** `fileSupportTicket` and `subscribeToUpdates` are exported server actions reachable signed out (from `/contact`, `/help` and the footer). They send `supportTicketFiled` from Vallo's verified sending domain to **whatever `email` the caller typed**. The email echoes `name` (up to 120 chars) in the greeting and up to 300 chars of `body` under "Your message". The newsletter "subscription" also files a ticket and mails an arbitrary address with no double opt-in.
- **WHERE:**
  - `apps/web/src/lib/support/actions.ts:106-172`: `sendMessage(email, message)` at ~`:160`, limit 10/h per IP.
  - `apps/web/src/lib/site/newsletter.ts:32-47`: no limit of its own.
  - `apps/web/src/lib/email/messages.ts:1528-1560`: the template echoes the name and body.
  - The `/contact` wrapper's 5/h limit (`support/actions.ts:264-289`) is bypassable because `fileSupportTicket` is itself an exported action.
- **EVIDENCE:** Code as cited. Not fired live, because it would send real mail to a third party. The limiter keys on `x-forwarded-for` (`lib/security/rate-limit.ts` `ipFromHeaders`), and every call fails open when the RPC errors (`consume` returns `{allowed:true, degraded:true}`).
- **WHY IT MATTERS:**
  - Phishing under Vallo's DKIM/SPF, for example a name of "Your Vallo wallet is frozen, verify at evil.example".
  - Harassment mail to any address.
  - The sender domain's reputation (Resend) degrades until auth and booking emails land in spam.
  - Unsolicited marketing mail without consent breaches NDPA/NDPC rules.
  - *Pass two narrowed what a signed-out caller controls: recipient (any valid address up to 200 chars) yes; subject fixed ("We have your message (VAL-SUP-nnnnn)"); greeting name only the first whitespace-free token, capped at 40 chars, dropped if it contains "@" (`greetingName`, `lib/email/render.ts:166-173`) — so pass one's "name up to 120 chars" and its phishing example (which renders as "Hello Your.") are wrong; topic up to 140 chars (a field pass one missed); body up to 300 chars; everything HTML-escaped. The newsletter door fixes name and body, controls only the recipient, and inherits `fileSupportTicket`'s 10/hour/IP limit. What remains: a labelled acknowledgement echoing up to 440 characters of attacker text under Vallo's sending domain to any address — real reputation and harassment risk, not free-form phishing.*
- **THE FIX:** (amended in pass two)
  1. For signed-out filers, stop echoing `topic` and `body`; send the reference only.
  2. Add a per-recipient cap of 3 per 24 hours alongside the per-IP one.
  3. Make the newsletter double opt-in: send a confirm link only, and store nothing marketing-related until it is clicked.
  4. Keep the throttle inside `fileSupportTicket` (it is already there); moving the helper out of the `"use server"` module and exporting only the rate-limited `submitContactForm` is still correct.
  5. Consider Turnstile/hCaptcha on the signed-out form.
- **EFFORT:** Half a day.
- **PASS TWO:** SEVERITY CHANGED HIGH→MEDIUM — fix amended. Reviewer read `lib/support/actions.ts:48-58,106-185`, `lib/email/messages.ts:1528-1560` and `render.ts:166-173` (see WHY IT MATTERS for what is actually attacker-controlled). The 10/hour/IP limit fails open; `x-forwarded-for` is set by Vercel's edge, so it cannot be spoofed, but it rotates with the attacker's IPs.

#### SEC-04 | Uploads / privacy | HIGH | Host and stay photos keep EXIF/GPS and are public; no server-side metadata stripping anywhere
- **WHAT IS WRONG:** `PhotoManager` uploads the chosen file byte-for-byte into the **public** `accommodation-photos` bucket. Message attachments are also raw, in a private bucket but readable by the counterparty. Only the agent `ListingWizard` and the social/profile paths re-encode through a canvas, which strips EXIF, and that happens client-side only. The bucket policies let any user upload directly to their own folder with the API and skip the canvas, so nothing on the server strips metadata. `allowed_mime_types` trusts the declared content type; there is no sniffing.
  - (from SUP-07) `accommodation-photos` also accepts HEIC and HEIF, which do not render in Chrome or Android browsers. Raw uploads also happen in the private buckets shared with a counterparty or staff: inspection report photos (`InspectionSheet.tsx:250`), escrow evidence (`EvidenceFiler`), message attachments, and supply and host documents (`UploadCard`).
- **WHERE:**
  - `apps/web/src/components/host/PhotoManager.tsx:99-103`: `.upload(path, chosen, { contentType: chosen.type })`. Changed 4 hours ago (d07b59a3).
  - `app/(app)/messages/[id]/ThreadView.tsx:405` (message-attachments).
  - Canvas re-encode exists only in `app/agent/list/ListingWizard.tsx:1264-1294` and `components/social/profile/reencode.ts`.
  - `storage.buckets`: `accommodation-photos public=true`, `listing-photos public=true`, `avatars public=true`, `social-covers public=true`.
- **EVIDENCE:**
  - SQL: `accommodation-photos … public:true … n:0`, so there is no live file to inspect yet.
  - I downloaded the four live public images (2 avatars, 2 social covers). All carry a small APP1 Exif block (76 bytes) plus an APP13 "Photos" block, and **no GPS**. These came through the re-encoding path or an iOS crop, so they do not exercise the raw paths.
  - The listing bucket is empty (all 64 listings are examples on Unsplash URLs), so the raw-path GPS leak is proved by code, not by a live file. UNVERIFIED on a real upload.
  - (from SUP-07) `storage.buckets`: `accommodation-photos public=true mime [jpeg,png,webp,heic,heif]`; `listing-photos public=true`. A grep for reencode/stripMetadata in `PhotoManager.tsx`, `InspectionSheet`, `EvidenceFiler`, `ThreadView` and `UploadCard` found nothing.
  - (pass two, A07) `components/host/PhotoManager.tsx:99-103` uploads raw to a public bucket that accepts HEIC and HEIF; inspection report photos and escrow evidence are also raw.
- **WHY IT MATTERS:** A shortlet host photographing their own flat publishes its exact coordinates to anyone who opens the image URL, as does a guest sending a photo in a thread. For a private home this is a safety issue, and NDPA treats it as personal data. It also contradicts the privacy notice.
- **THE FIX:** (amended in pass two)
  - *Pass-one fix, retained:* Strip metadata on the server, because a client-side strip can be bypassed.
    1. Make the four public photo buckets write-only for clients through a signed-upload flow into a private "incoming" bucket.
    2. A route handler or Edge Function then runs `sharp(buf).rotate().jpeg({quality:85})`, with **no** `.withMetadata()`, and writes the result into the public bucket with the service role.
    3. Alternatively, at minimum, route `PhotoManager` and `ThreadView` through the same `reencodeToJpeg` the social path uses, and add a nightly job that re-encodes any object in a public bucket whose first bytes carry an APP1 Exif block with GPS IFD.
    4. Add a test that uploads a GPS-tagged fixture and asserts the stored bytes have no `GPS`.
  - *Pass-two amendments:*
    - Narrow the public buckets' MIME types to `image/jpeg` and `image/webp` (HEIC/HEIF do not render in Chrome or Android browsers) — from SUP-07.
    - Extend the server-side re-encode (or at least the client re-encode stopgap, `components/social/profile/reencode.ts`) to inspection photos, escrow evidence, message attachments and supply/host document images.
- **EFFORT:** 1 day for server-side; 2 hours for the client-only stopgap.
- **PASS TWO:** CONFIRMED (HIGH) — fix amended (narrow public MIME types). Absorbs SUP-07 (A07 pass one, HIGH), MERGED INTO this ID. Reviewer (A07) re-read `PhotoManager.tsx:99-103` and added that inspection report photos (`InspectionSheet.tsx:250`, private bucket shared with the counterparty) and escrow evidence are also raw; A04 (reviewing SUP-07) agreed to keep SEC-04's server-side re-encode as the fix.
  - *Resolved by orchestrator (cross-area conflict):* the orchestrator read `apps/web/src/app/agent/list/ListingWizard.tsx:1257-1299`: the listing wizard re-encodes every photo client-side (`createImageBitmap` → canvas → `toBlob` JPEG 0.9, long edge ≤ 2560px) and refuses the upload if re-encoding fails, which strips EXIF — so this finding's statement that the wizard strips metadata client-side is correct, and OPS-13's "listing photos upload raw" is wrong for the wizard (OPS-13 lowered to LOW). Still true, and the core of this finding: nothing strips metadata on the server (a direct Storage upload with the user's JWT bypasses the wizard), and host/stay photos via `PhotoManager` are genuinely raw in a public bucket.

#### SEC-05 | Abuse filter / store UGC | HIGH | The seeded blocked-terms list is applied only to social posts and bios; not to listings, messages, reviews, stories, comments, events or display names
- **WHAT IS WRONG:** `blocked_terms` is now seeded (133 terms, 16 categories). But `private.objectionable_pattern()` is called only by `scan_post` and `scan_social_profile`. The other scanners (`scan_message`, `scan_review`, `scan_review_response`, `scan_story`, `scan_story_comment`, `scan_event`) look only for account numbers and payment words. `listings` has no scan trigger at all, and neither do display names, which come from user metadata at sign-up.
- **WHERE:**
  - SQL: `select … from pg_proc where prosrc ilike '%objectionable_pattern%'` returns only `objectionable_pattern`, `scan_post` and `scan_social_profile`.
  - Trigger list on public tables: `events_scan, messages_scan_after_insert, posts_scan, review_responses_scan, reviews_scan_after_write, social_profiles_scan, stories_scan, story_comments_scan`, and nothing on `listings`.
- **EVIDENCE:** Matching test, replicating `'\m(' || string_agg(term,'|') || ')\M'` with `~*` on 30 strings (the function itself is not executable by the read-only role).
  - **Correctly not matched:**
    - `Scunthorpe road`
    - `Pakistan embassy`
    - `spice market`
    - `raccoon`
    - `Lolita Estate`
    - `Kafiru Street, Kano`
  - **Correctly matched:** `NIGGER`, `nyamiri`, `Please pay to inspect`, `whatsapp me directly!!`.
  - **Over-catches:**
    - `Mrs Loli Adeyemi, landlady` (Loli is a real given name; category child-safety, severity high)
    - `Paki shop by the junction`
    - `Coon Street`
    - `Wog Estate`
    - `I will deal with you if you break the tap` (a common Nigerian idiom, in violence-threat, high)
    - `Call me on WhatsApp for inspection` (medium)
  - **Evasions that pass:** `n1gger`, `n i g g e r`, `chi1d porn`, `childporn`, `Ñyamiri`, `call  girl` (double space), `whatsapp  me  directly` (double spaces).
- **WHY IT MATTERS:** Apple 1.2 and Play's UGC policy require filtering of objectionable content across *user-generated* surfaces, and listings, messages and reviews are the main ones. Over-catching real Nigerian names on a high-severity child-safety rule will hold honest content and embarrass the platform. Trivial spacing defeats the filter.
  - *Pass two (A07): the store requirement is filtering plus reporting plus blocking. Report and block exist (`lib/reports/actions.ts`, `lib/safety/blocks-actions.ts`); messages are private one-to-one threads with both; listings are human-moderated before publish once DB-02 is fixed; public UGC (posts, bios) is filtered. A real gap, not a store refusal. Note: A03's review of A08 filed the overlapping STORE-P2-01 at HIGH (filter on 2 of 8 surfaces; reviews, businesses and events cannot be reported). Orchestrator ruling: the store-facing severity wins — a reviewer who posts a slur in an unfiltered comment surface sees it published, which is an Apple 1.2 / Play UGC rejection — so both SEC-05 and STORE-P2-01 are HIGH. The two IDs are kept and cross-referenced.*
- **THE FIX:** (amended in pass two)
  - *Pass-one fix, retained:* 
    1. Call a shared `private.scan_text(text) returns (held bool, category, severity)` from every scanner and add a scanner on `listings` (title, description, on INSERT/UPDATE of those columns: hold by setting status back to `SUBMITTED` with a reason) and on `profiles.display_name`/`nickname`.
    2. Normalise before matching: lower-case, NFKD and strip accents, collapse whitespace runs to one space, and map common leetspeak (`1→i/l, 0→o, 3→e, 4→a, 5→s, @→a, $→s`). Also match a whitespace-stripped copy for multi-letter single words.
    3. Demote or remove `loli` (use `lolicon`), move `paki`, `coon` and `wog` to "hold for review, medium" rather than high, and drop `i will deal with you` to medium.
    4. Add a pure fixture test of about 60 strings (the lists above plus Nigerian names and places) that runs against the SQL via a probe.
  - *Pass-two amendments:*
    - The proposed listings scanner "hold by setting status back to SUBMITTED" would push a DRAFT into the review queue and fight the status guard (DB-02). Raise a flag row for the reviewer instead (`risk_alerts` or a `listing_flags` table).
- **EFFORT:** 1 day.
- **PASS TWO:** SEVERITY CHANGED: pass two (A07) lowered HIGH→MEDIUM (report and block exist; listings are human-moderated) — the orchestrator restored it to HIGH because STORE-P2-01 (A03's review of A08, HIGH) shows the store consequence: the objectionable-content list applies to 2 of 8 UGC surfaces, and reviews, businesses and events cannot be reported. Fix amended in pass two (flag for the reviewer instead of pushing a listing back to SUBMITTED). Reproduced: only `scan_post` and `scan_social_profile` call `objectionable_pattern()`; the regex misses "n i g g e r"; it over-matches "Mrs Loli Adeyemi", "Coon Street" and "Call me on WhatsApp for inspection"; "Scunthorpe road" correctly does not match. Cross-reference: STORE-P2-01 (HIGH), same gap from the store side.

#### SEC-06 | Content / legal | MEDIUM | Nothing detects or prevents discriminatory rental preferences ("No Igbo", "Muslims only", "Married couples only")
- **WHAT IS WRONG:** The Standards page forbids refusing people "on the grounds of ethnicity, religion, state of origin, gender or disability" (marital status is not listed). Nothing enforces it: listings are not scanned (SEC-05), `blocked_terms` has no such category, and the admin listing review has no prompt for it.
- **WHERE:** `blocked_terms` categories (full list in the evidence of SEC-05); no trigger on `listings`; `/standards` live copy, "Harassment, threats or discrimination".
- **EVIDENCE:** The regex test returned `false` for `No Igbo tenants`, `Muslims only`, `Christians only please`, `Married couples only` and `No Hausa, no Fulani`.
- **WHY IT MATTERS:** This is the most common real-world content problem in Nigerian rental ads, and it is exactly what an app reviewer or journalist screenshots. Such statements breach Vallo's own standards and the Constitution s.42 non-discrimination principle, and create exposure under consumer and anti-discrimination rules.
- **THE FIX:**
  1. Add a `listing.discriminatory-preference` category that is *hold for review, not reject*, since phrasing like "only" and "no" is context-dependent. Use a pattern set: `(no|not for)\s+(igbo|yoruba|hausa|fulani|ijaw|tiv|efik|ibibio|edo|urhobo|muslims?|christians?|pentecostals?|catholics?|alhaji|northerners?|southerners?|easterners?|singles?|unmarried|bachelors?|spinsters?|women|ladies|men|students?)`, and `(igbo|yoruba|hausa|…|muslims?|christians?|married couples?|families)\s+only`.
  2. Show the lister an inline warning in the wizard with the Standards link.
  3. Add marital status to the Standards text if the founder agrees (see FOR THE FOUNDER).
  4. Add a checkbox in the admin listing review: "No tribal, religious or marital preference stated".
- **EFFORT:** Half a day, on top of SEC-05.
- **PASS TWO:** SEVERITY CHANGED HIGH→MEDIUM. Reproduced: "No Igbo tenants", "Muslims only" and "Married couples only" all fail to match. There are zero real listings, and every listing passes a human reviewer before publish, so this is a checklist and policy gap, not a live exposure.

#### SEC-07 | Auth / sessions | MEDIUM | Auth cookie is not `Secure`, not `HttpOnly` and lives 400 days; the apex domain lacks HSTS `includeSubDomains`/`preload`
- **WHAT IS WRONG:** The Supabase session cookies carry the refresh token. They are set with `secure:false`, `httpOnly:false`, `SameSite=Lax` and an expiry of about 400 days.
- **WHERE:** `apps/web/src/lib/supabase/server.ts:30` and `proxy.ts:336` pass `@supabase/ssr` defaults (no `cookieOptions`). Apex `https://vallospaces.com/` answers `308` with `strict-transport-security: max-age=63072000` only; www has `; includeSubDomains; preload`.
- **EVIDENCE:** Chromium sign-in as the QA member, then `ctx.cookies()`: `[{"n":"sb-uccixoonmbhrnyczyigt-auth-token.0","h":false,"s":false,"ss":"Lax","exp":"2027-10-28T20:21:25Z"},{"n":"…-auth-token.1","h":false,"s":false,…}]`.
- **WHY IT MATTERS:** Without `Secure`, the first plain-HTTP request (before HSTS is cached, or on a captive-portal network) can carry the refresh token in clear. Without `HttpOnly`, any XSS reads a 400-day refresh token; the nonce + `strict-dynamic` CSP mitigates but does not remove this. On a wallet product this is the single most valuable token.
- **THE FIX:** (amended in pass two)
  - *Pass-one fix, retained:* 
    1. Pass `cookieOptions: { secure: true, sameSite: 'lax', path: '/', maxAge: 60*60*24*30 }` to `createServerClient` in both `lib/supabase/server.ts` and `proxy.ts`, and to `createBrowserClient`.
    2. Evaluate `httpOnly: true`. It requires that no browser code reads the session; `lib/supabase/client.ts` realtime would need a token endpoint.
    3. Set the apex HSTS header to `max-age=63072000; includeSubDomains; preload` (Vercel domain settings / `vercel.json` headers) and submit the domain to hstspreload.org.
  - *Pass-two amendments:*
    - `httpOnly:true` would break every browser Supabase call, not only realtime: listing photo uploads (`ListingWizard.tsx` `createClient()`), host photo and document uploads (`PhotoManager`, `HostDocumentUploader`) and `UploadCard` all use the browser session. Ship `secure:true` plus a shorter `maxAge` (and the apex HSTS) now, and treat `httpOnly` as a separate project.
- **EFFORT:** 2 hours for `Secure`/maxAge/HSTS; 1–2 days if going `HttpOnly`.
- **PASS TWO:** CONFIRMED (MEDIUM) — fix amended (`httpOnly` is a project, not a quick win). Reviewer confirmed the `@supabase/ssr` defaults at `node_modules/@supabase/ssr/dist/main/utils/constants.js:4-11` (`httpOnly:false`, `maxAge` 400 days, no `secure`); no `cookieOptions` is passed in `lib/supabase/server.ts` or `proxy.ts`.

#### SEC-08 | Auth / sessions | MEDIUM | Sign-out is global; password change revokes nothing; a revoked device keeps PostgREST access for up to an hour
- **WHAT IS WRONG:**
  - `signOut()` uses supabase-js's default `scope:'global'`, so signing out on the phone signs out the browser and every other device.
  - `updatePassword` calls `auth.updateUser({password})` and never ends other sessions. After a reset because of a stolen device, the thief's session keeps working.
  - Ending a session (`end_session`) invalidates its refresh token and GoTrue `/user`, but the access JWT still works against PostgREST until expiry (`expires_in: 3600`).
  - GoTrue also accepts `PUT /user {password}` straight from any live access token without re-authentication. That is UNVERIFIED as a project setting ("Secure password change"), because the auth config is not readable with this role.
- **WHERE:**
  - `apps/web/src/lib/profile/actions.ts:209` (`session.supabase.auth.signOut()`).
  - `node_modules/@supabase/auth-js/dist/main/GoTrueClient.js:3417` (`signOut(options = { scope: 'global' })`, v2.117.1).
  - `apps/web/src/lib/auth/actions.ts:935-974` (`updatePassword`).
- **EVIDENCE:** Live, two QA member sessions A and B (`t3.mjs`):
  ```
  A ends B: 200 {"status": "ok", "was_current": false}
  B GoTrue /user after revoke: 403 {"error_code":"session_not_found"}
  B PostgREST profiles after revoke: 200 [{"id":"957b3bd2-…","display_name":"omojuni PHANTOM"}]
  B refresh after revoke: 400 {"error_code":"refresh_token_not_found"}
  ```
  **Two devices signed in, one changes something:** the other device sees server-rendered changes on its next navigation, because every page re-reads through RLS. A sign-out on one device throws the other out at its next navigation: the middleware's `getUser()` returns `session_not_found` and the page redirects to `/sign-in`. I did not run a live global sign-out, because other audit agents share the QA member account.
- **WHY IT MATTERS:**
  - Users expect "sign out" to mean this device only.
  - Anyone recovering from a lost phone expects a password change to throw out the thief. It doesn't, and the devices screen is the only way.
  - The one-hour PostgREST tail matters for a wallet.
- **THE FIX:**
  1. `signOut({ scope: 'local' })` in `profile/actions.ts`, with a separate "Sign out everywhere" that uses `'global'` (the devices screen already has `end_other_sessions`).
  2. In `updatePassword`, after success call `supabase.rpc('end_other_sessions')`, or `auth.signOut({scope:'others'})`, and say so on screen.
  3. Turn on "Secure password change" (reauthentication) in Supabase Auth settings.
  4. Lower the JWT expiry to 10–15 minutes (Auth settings) to shrink the revoked-token window.
- **EFFORT:** 2–3 hours.
- **PASS TWO:** CONFIRMED (MEDIUM). Reviewer: `lib/profile/actions.ts:209` calls `signOut()` with no scope, and the default is `{ scope: 'global' }` (`GoTrueClient.js:3417`); `updatePassword` (`lib/auth/actions.ts:970`) only calls `updateUser`. (A04's review of A07 notes that fixing this also removes most occurrences of SUP-04.)

#### SEC-09 | Rate limits | MEDIUM | App-level limits exist only on auth, money, support and AI. They fail open, are per-IP only, and GoTrue is directly reachable around them
- **WHAT IS WRONG:**
  - **What is limited:**
    - sign-in: 10/min per IP
    - sign-up: 5/h per IP
    - verify: 10/min per email, 20/min per IP
    - resend: 3/15 min per email
    - password reset: 10/h per IP, 3/h per email
    - password update: 10/h per IP
    - email probe: 60/h per IP
    - contact form: 5/h
    - support ticket: 10/h
    - deletion restore code: 10/h per IP
    - assistant: per user and per IP
    - map: per IP
    - every wallet/payment action: `guardMoney` per user (`lib/security/money-limits.ts:85-262`)
  - **Not limited at all:** sending a message (a direct PostgREST insert is allowed by `messages_insert`), creating or updating listings, reviews, reports, social posts, stories, comments, follows, saves, and push registration.
  - **Keying:** IP only for auth, with no per-account lockout, so credential stuffing from rotating IPs is unlimited at our layer.
  - **Fail-open:** `consume()` returns `{allowed:true, degraded:true}` when the RPC fails (`lib/security/rate-limit.ts` ~L205).
  - **Bypass:** sign-in, sign-up and password reset are all callable directly on GoTrue with the public publishable key, which skips every app limit. I signed in about 15 times this way during the audit. Only Supabase's own per-IP auth limits apply.
- **WHERE:** As listed. The call sites come from `grep -rn "throttle(\|consume(" src`.
- **EVIDENCE:** The call-site grep (in scratch, `A04`), and a live `POST /auth/v1/token?grant_type=password` with the publishable key, which returned tokens.
  - **Corrected in pass two (A07):** "Not limited at all: sending a message … social posts, stories, comments, follows" is wrong at the server-action layer. `consume()` is called in `lib/messages/actions.ts:189`, `lib/social/posts-actions.ts` (`toggleMark` and others), `stories-actions.ts` (`commentOnStory`), `follows-actions.ts`, `lib/reports/actions.ts` and `lib/safety/blocks-actions.ts`. The true statement: every one of those writes is also directly insertable over PostgREST under RLS, which skips the action and its limit (worst case: SEC-P2-02, threads to any user). Money limits failing open is confirmed: `money-limits.ts:284` passes `degraded` through as allowed. The appendix table does not show server-side rate limits, which is how pass one came to call these writes unlimited.
- **WHY IT MATTERS:** Message spam and harassment at scale, review-bombing once reviews exist, listing flooding, and credential stuffing limited only by Supabase's defaults.
- **THE FIX:**
  1. Put DB-side limits where the write happens, since that is the only layer PostgREST cannot skip. Add a BEFORE INSERT trigger on `messages`, `posts`, `story_comments`, `reviews`, `reports` and `listings` that calls `private.consume_rate_limit('<table>', auth.uid(), N, window)`, for example messages 60/10 min and 300/day, posts 20/h, and listings 20/day.
  2. Add a per-email failure counter to `signInWithEmail` (e.g. 10 fails per 15 min per address).
  3. In Supabase Auth → Rate limits, set sign-in/sign-up/OTP/reset explicitly and enable CAPTCHA (Turnstile) on sign-up and reset, which covers the direct-GoTrue path.
  4. Make money limits fail **closed** (`guardMoney` should refuse when `degraded`).
- **EFFORT:** 1 day.
- **PASS TWO:** CONFIRMED (MEDIUM) — evidence corrected (the server actions do rate-limit; the gap is the direct PostgREST path). The DB-side-limit fix stands. See the correction under EVIDENCE.

#### SEC-10 | Multi-account | MEDIUM | The canonical-email recorder: what it catches, what gets through, and it is erased on deletion
- **WHAT IS WRONG:** `private.canonical_email_parts` handles Gmail/Googlemail dots and plus-tags and plus-tags for about 22 providers. It is a signal only, and it has these gaps:
  - Yahoo's disposable aliases use `-` (`seyi-listing2@yahoo.com` stays distinct). Yahoo does not support `+` at all, so stripping it is harmless but pointless.
  - A trailing dot on the domain (`seyi@gmail.com.`) stays distinct.
  - Fastmail subdomain aliases (`anything@seyi.fastmail.com`) stay distinct.
  - Custom domains and catch-alls keep `+` (`seyi+x@mycompany.ng`).
  - There is no disposable-domain list.
  - `.co.ng` Yahoo variants are not in the provider list.
  - Worst: on account deletion, `scrubAuth` rewrites `auth.users.email` to `deleted+<uuid>@deleted.invalid`. The `users_record_account_identity` trigger fires on `UPDATE OF email` and **overwrites** the canonical row, so the link between a deleted or banned person and their mailbox is erased. Deletion then "frees the person's real address for a new account" (`service.ts` comment), so delete-and-rejoin is a clean ban-evasion path.
- **WHERE:** `private.canonical_email_parts`, `private.record_account_identity` (trigger `users_record_account_identity AFTER INSERT OR UPDATE OF email ON auth.users`), `apps/web/src/lib/account-deletion/service.ts:80-95`.
- **EVIDENCE:** Replica of the function in read-only SQL:
  ```
  S.E.Y.I+x@GMAIL.com → seyi@gmail.com       seyi@googlemail.com → seyi@gmail.com
  seyi@gmail.com.     → seyi@gmail.com.      seyi-listing2@yahoo.com → seyi-listing2@yahoo.com
  seyi+x@mycompany.ng → seyi+x@mycompany.ng  seyi@sub.fastmail.com → seyi@sub.fastmail.com
  ```
  Live: all 10 users have an identity row, and both QA accounts map to `<the founder's Gmail mailbox (redacted in merge)>` together with the founder's account.
- **WHY IT MATTERS:** It is the only link between accounts, and the one moment it matters most (after a ban or deletion) is when it is wiped. Separately, no ban exists for members at all: `ban_duration` is used only by deletion (grep), and suspensions attach to `agents` rows only.
- **THE FIX:** (amended in pass two)
  - *Pass-one fix, retained:* 
    1. In `record_account_identity`, on UPDATE keep the old canonical: add `previous_canonicals text[]`, or insert a history row instead of `on conflict do update`, and skip the rewrite when the new domain is `deleted.invalid`.
    2. Strip a trailing dot.
    3. For `yahoo.*`/`ymail.com`, strip from the first `-`.
    4. Add a small disposable-domain list (as a signal).
    5. Add `private.denied_identities(canonical_email, reason, created_by)` and check it at sign-up in the trigger (flag, don't block) and at the agent/business application.
    6. Add a member-level ban (auth `ban_duration` plus a row in the deny list).
  - *Pass-two amendments:*
    - Keeping the plaintext previous canonical email after an erasure request conflicts with NDPA erasure. Keep a keyed HMAC of the canonical email in a deny or rejoin table instead: enough to match a returning address, and not the address. Take a founder or legal decision on the lawful basis. (STORE-P2-02 reaches the same conclusion for `account_identities` left behind by the purge.)
- **EFFORT:** Half a day for the recorder fixes; 1 day with the deny list.
- **PASS TWO:** CONFIRMED (MEDIUM) — fix amended (keep an HMAC, not the plaintext). Reviewer: `private.record_account_identity` does `on conflict (user_id) do update set email_canonical = excluded…`, and `scrubAuth` rewrites the email (`service.ts:79-95`).

#### SEC-11 | Support address | LOW | The guard protects the wrong spelling, in only three files; the real private address appears nowhere today
- **WHAT IS WRONG:** Every guard asserts `not.toContain("<private address, with-s spelling (redacted in merge)>")` (with an s). The founder says the real private address is `<private address, no-s spelling (redacted in merge)>` (no s). The guard would pass even if the real one were pasted into every page. The brand-domain guard also reads only three files.
- **WHERE:**
  - `apps/web/src/lib/brand-domain.test.ts:66-77` (files: `lib/email/client.ts`, `lib/support-email.ts`, `lib/brand-domain.ts`).
  - `apps/web/src/lib/notify/outbox-delivery.test.ts:475,554,555`.
  - `apps/web/src/lib/notify/templates.test.ts:268,269`.
  - `docs/BUILD_06_LEDGER.md:945,959`.
- **EVIDENCE:**
  - `git grep -i <no-s spelling>` (no s): **0 hits** in the tree.
  - Full history (`git log --all -S <no-s spelling>`): **0 commits**.
  - The with-s spelling occurs only in the tests and ledger above.
  - Live: public and signed-in HTML plus 50 JS chunks contain no `vallospaces?ltd` and no `@gmail.com`. The only `mailto:` is the template `mailto:${s.SUPPORT_EMAIL}`, and the value is not inlined, so `NEXT_PUBLIC_SUPPORT_EMAIL` is unset in that build.
  - DB: `email_outbox`, `support_tickets` and `auth.users` have 0 rows matching `%vallospace%ltd%`.
  - **So the real address does not leak anywhere I could reach.**
- **WHY IT MATTERS:** The protection is decoration, per rule 3: it cannot fail for the reason it exists.
- **THE FIX:** Replace every literal with one shared regex and sweep the whole tracked tree plus the built output.
  ```ts
  // apps/web/src/lib/brand-domain.test.ts
  const PRIVATE_ADDRESS = /vallospaces?ltd@gmail\.com/i;
  it("keeps the private address (either spelling) off every tracked file", () => {
    const out = execSync("git ls-files", { cwd: ROOT }).toString().split("\n")
      .filter((p) => p && !p.endsWith("brand-domain.test.ts") && !/\.(png|jpe?g|webp|ico|woff2?)$/.test(p));
    for (const p of out) expect(readFileSync(join(ROOT, p), "utf8"), p).not.toMatch(PRIVATE_ADDRESS);
  });
  ```
  - Use the same regex in `outbox-delivery.test.ts` and `templates.test.ts` (`.not.toMatch(PRIVATE_ADDRESS)`).
  - Rewrite the ledger lines to describe the rule without spelling the address, so the sweep can include docs.
  - Add a post-build check in CI: `grep -rEi 'vallospaces?ltd@gmail' apps/web/.next && exit 1`.
  - **EMAIL_REPLY_TO:** `lib/email/client.ts:105` uses `EMAIL_REPLY_TO` if set; otherwise no `reply_to` is sent and a user's reply goes to the From address, default `Vallo <hello@vallospaces.com>` (`client.ts:25`). I could **not** check Vercel: the Vercel MCP connection sees only team `boosthubservice-2204s-projects` with one project, `v0-viticulture-labs-app`, and zero env vars; the Vallo project is not visible. MX for vallospaces.com was also unreachable (dns.google blocked by the egress proxy). If there is no MX for `vallospaces.com` or `hello@` is not routed, every user reply to every Vallo email bounces. **Confirmed after the audit (founder's read of Vercel, 23 September):** `EMAIL_REPLY_TO` is NOT SET in Vercel, so no `reply_to` is sent and replies go to the From address; with no MX (OPS-06) they reach no one. See FOR THE FOUNDER.
- **EFFORT:** 1 hour.
- **PASS TWO:** SEVERITY CHANGED MEDIUM→LOW. Confirmed: 0 hits for the no-s spelling in the tree, and the with-s spelling appears only in the three tests and the ledger. No leak exists; it is a decorative guard, which makes it craft rather than a risk.

#### SEC-12 | KYC storage | MEDIUM | KYC documents can be swapped or deleted by the applicant after review; admin storage reads bypass the audit trail
- **WHAT IS WRONG:**
  - `agent-documents` and `host-documents` are private, and the admin viewer route is good: admin-only, proxied, `no-store`, `nosniff`, audited, and filenames normalised to `idFront.jpg`. The user's filename does not survive.
  - But the storage policies `agent_documents_objects_update_own`/`_delete_own` (and host equivalents) let the owner overwrite or delete the object at the same path **after** an admin approved it. The approved identity document can be silently replaced.
  - `*_objects_admin_select` lets any admin fetch documents straight from Storage with their JWT, which skips `/api/documents/[id]` and its `document.viewed` audit row.
- **WHERE:** `storage.objects` policies (listed in the SQL evidence); `apps/web/src/app/api/documents/[id]/route.ts:65-120`.
- **EVIDENCE:**
  - SQL policy dump: `agent_documents_objects_update_own UPDATE … foldername[1] = auth.uid()`, and `agent_documents_objects_admin_select SELECT … has_role admin`.
  - The public URL of a live KYC object returns 400, so it is not public.
  - Member GET `/api/documents/<uuid>` returns 403.
  - There are 4 live objects, all the founder's.
- **WHY IT MATTERS:** A KYC document needs integrity after review, and every access should be logged. Neither holds.
- **THE FIX:** (amended in pass two)
  - *Pass-one fix, retained:* 
    1. Drop the UPDATE and DELETE owner policies on `agent-documents`/`host-documents`. Deletion happens only via the purge (service role), and a resubmission gets a new path.
    2. Drop `*_objects_admin_select` so admin reads go only through the audited route (it uses the service role).
    3. Store a SHA-256 of the object on the document row at review, and have the viewer route compare it.
  - *Pass-two amendments:*
    - `components/supply/UploadCard.tsx:106-107` uploads with `upsert: true` to a fixed path `<uid>/<batch>/<slot>.<ext>`. Re-choosing a file in the same slot needs the UPDATE policy. Change it to a unique path per attempt with `upsert:false` before dropping the policy, or the owner, agent and firm registration forms break on a second pick.
- **EFFORT:** 2–3 hours.
- **PASS TWO:** CONFIRMED (MEDIUM) — fix amended (unique upload paths before dropping UPDATE). Reviewer confirmed the policies from `pg_policies` (`*_objects_update_own`, `*_delete_own`, `*_admin_select` on both document buckets). The same storage-policy issue is DB-17 (A03), amended the same way in its own review; not in the known-duplicate list, so both IDs are kept.

#### SEC-13 | Privacy / NDPA | MEDIUM | Account deletion leaves device fingerprints, the pre-deletion email in the outbox, and price-check history; privacy policy claims analytics cookies that do not exist
- **WHAT IS WRONG:**
  - The purge keeps the `auth.users` row, scrubbed, so `ON DELETE CASCADE` never fires.
  - `purge_account_rows` does not touch `known_devices` (fingerprint, device words, first and last seen), `email_outbox` (payloads with the address and content; only a time-based retention purge applies), `price_check_events` (geohash5, area and property searches) or `account_identities` (see SEC-10).
  - Separately, `/privacy` §9 says Vallo uses "analytics that help us understand how the product is used". Live, there are no analytics: the only cookies are functional (the auth token, `nf_side`, locale, mode/workspace, search view, saved-items and first-run, `nf_admin_entry`), there is nothing in `localStorage` on landing, and zero third-party hosts are requested.
- **WHERE:**
  - `apps/web/src/lib/account-deletion/plan.ts` (the lists).
  - `public.purge_account_rows` (SQL: `kd=false, eo=false, ai=false, pce=false`).
  - FK `on delete` for those tables is `c`/`n`, which is moot because the row is never deleted.
  - `/privacy` live text.
- **EVIDENCE:**
  - SQL as quoted.
  - Chromium on `/`: `LANDING cookies []`, `third-party hosts www.vallospaces.com`.
  - After sign-in, only the two `sb-…-auth-token` chunks.
- **WHY IT MATTERS:** NDPA 2023 s.34 erasure: "your account is deleted" should cover device and behavioural data. An inaccurate privacy notice is also a problem for NDPC and for Apple's privacy nutrition label, which must match. No consent banner is needed today, since everything is strictly necessary or functional, but the notice must stop claiming analytics.
- **THE FIX:**
  1. Add `delete from known_devices where user_id = p_user; delete from email_outbox where user_id = p_user and status in ('SENT','FAILED'); update price_check_events set user_id = null where user_id = p_user;` to `purge_account_rows`, and list them in `plan.ts`.
  2. Rewrite privacy §9 to "strictly necessary and preference cookies only; no analytics or advertising cookies". Revisit if analytics are ever added, and add a consent banner then.
- **EFFORT:** 2 hours.
- **PASS TWO:** CONFIRMED (MEDIUM). Reviewer: `purge_account_rows` references none of `known_devices`, `email_outbox`, `price_check_events` or `account_identities`, and `lib/account-deletion/` doesn't either; live `/privacy` still says "analytics that help us understand how the product is used"; there is no analytics package in `apps/web`. (STORE-P2-02 adds `push_tokens` and `price_check_watches` to the list.)

#### SEC-14 | Auth / impersonation | MEDIUM | Sign-up metadata is attacker-controlled; direct GoTrue sign-up skips the app's terms gate, and display names are never filtered
- **WHAT IS WRONG:** `handle_new_user` copies `display_name`, `first_name`, `surname`, `nickname`, `phone` and `terms_version` straight from `raw_user_meta_data`. A direct `POST /auth/v1/signup` with the public key can therefore:
  - set `display_name` to "Vallo Support" or "Vallo Admin", or a slur (no filter; see SEC-05)
  - set an unverified `phone`
  - stamp `terms_accepted_at = now()` with any `terms_version` string, never having seen the terms
  - skip the app's sign-up rate limit
  After sign-up, `profiles` UPDATE is granted on every column including `terms_accepted_at`/`terms_version`, so consent evidence is user-editable.
- **WHERE:** `handle_new_user` (live definition, quoted in scratch). Profiles column grants (`has_column_privilege` shows all 19 columns updatable); `profiles_update_own`.
- **EVIDENCE:** SQL as above. The QA member's live `user_metadata` contains `display_name`, `terms_version`, `hear_about` and so on, all client-supplied.
- **WHY IT MATTERS:** Impersonation of staff in messages is a classic marketplace scam. Consent evidence that the user can edit is not evidence.
- **THE FIX:**
  1. Revoke UPDATE on `profiles.terms_accepted_at`, `terms_version`, `signup_role` (after onboarding), `created_at` and `id`.
  2. Record terms acceptance only via `terms_acceptances` from a server action (the table exists).
  3. In `handle_new_user`, reject a `terms_version` not in a `terms_versions` table.
  4. Run display names through the SEC-05 scanner and a reserved-words list (`vallo`, `support`, `admin`, `official`, `staff`), matched case-insensitively and allowing spaces.
- **EFFORT:** Half a day.
- **PASS TWO:** CONFIRMED (MEDIUM). Reviewer: `handle_new_user` copies `display_name` and `terms_version`; `authenticated` can UPDATE `profiles.terms_accepted_at` and `terms_version`.

#### SEC-15 | Account recovery | MEDIUM | "Email can never change" leaves no recovery path for a lost mailbox, and phone is unverified free text
- **WHAT IS WRONG:** Email is enforced immutable three ways:
  - no `updateUser({email})` in code (`lib/auth/email-immutable.test.ts`)
  - the callback refuses `email_change` tokens (`lib/auth/actions.ts:707`)
  - the email hook drops every `email_change*` send (`app/api/auth/email-hook/route.ts:211`)

  Password reset goes only to that email. There is no MFA and no phone login; `phone_verified:false`, and `profiles.phone` is self-editable text. So:
  - **Changed phone number:** harmless, because the phone is not an auth factor. But it is also not a recovery factor.
  - **Lost device:** the user can sign in elsewhere and end sessions at `/settings/devices`. A password reset does not end the thief's sessions (SEC-08).
  - **Lost email access:** permanent lockout. `/delete-account` says "If you have lost access to the email address … write" to support, but support cannot move the account to a new address by rule, so the only outcome is deletion and the wallet balance is stranded behind the deletion blockers.
- **WHERE:** As cited.
- **EVIDENCE:** Code as cited; the live `user_metadata` shows `"phone_verified":false`.
- **WHY IT MATTERS:** For a wallet product, "we can never move your account to a new email" means that a person whose Gmail is hacked or lost loses access to their money. Honest verdict: **the rule is not survivable as absolute.** It is survivable as "email cannot be changed by the user", provided there is a staff-only, audited, identity-verified email move (NIN or selfie match against the KYC on file, plus a 7-day hold and notice to the old address). Whether the rule stays absolute is the founder's call.
- **THE FIX:**
  1. Keep user-initiated change blocked.
  2. Add a super-admin-only RPC `admin_move_account_email(user, new_email, evidence_ref)`. It requires a verified identity rung, writes `audit_log`, notifies the old address, holds wallet withdrawals for 7 days, and appends to the SEC-10 identity history rather than overwriting.
  3. Enable TOTP MFA (Supabase supports it; `aal` is already carried in `my_sessions`) as a second recovery factor.
  4. Verify the phone by OTP before it is shown to counterparties.
- **EFFORT:** 1–2 days.
- **PASS TWO:** CONFIRMED (MEDIUM). A product-rule decision; the code is as described.

#### SEC-16 | Uploads | LOW | Public buckets accept arbitrary image uploads from any signed-in user, unlinked to any listing, with declared-only content type
- **WHAT IS WRONG:** `listing-photos`, `accommodation-photos`, `avatars` and `social-covers` allow INSERT by any authenticated user into their own uid folder. Three of them allow public read. There is no size check beyond 5–10 MB, no content sniffing, and no link to a moderated object. Anyone with an account gets free, unmoderated public image hosting on Vallo's Supabase domain.
- **WHERE:** `storage.objects` policies `listing photos owner insert`, `accommodation photos owner insert` + `accommodation photos public read`, `social covers read`, and `avatars owner insert`.
- **EVIDENCE:** SQL policy dump (checked above). Not exercised live, to avoid creating objects.
- **WHY IT MATTERS:** An abuse-content hosting vector that no moderation queue ever sees. It is also a store-review risk.
- **THE FIX:** Move to the signed-upload plus server re-encode flow from SEC-04, so an object only becomes public once it is attached to a row that passed moderation. Add a nightly sweep that deletes public objects not referenced by any `*_photos`, `avatar_url` or `cover_path` after 24 h.
- **EFFORT:** Half a day, on top of SEC-04.
- **PASS TWO:** SEVERITY CHANGED MEDIUM→LOW. Confirmed: public buckets accept uploads into the uploader's own folder. It needs an account, is capped at 5–10 MB and limited to the image MIME list — standard Supabase exposure — and the SEC-04 fix closes it.

#### SEC-17 | Authorization | LOW | Small oracles and gaps in exposed functions and actions
- **WHAT IS WRONG:**
  1. `public.agent_trust(p_user)` and `public.verification_is_required(p_user)` are SECURITY DEFINER, EXECUTE to authenticated, with no caller check. `verification_is_required` answers for any uuid whether that user is a seller, landlord or agent. Live: `rpc/verification_is_required {p_user: example collection}` → `true`. There is already a pending migration `supabase/migrations/pending/20260918150300_b5_verification_is_required_is_not_a_client_call.sql`, not applied.
  2. `signUpMethodForEmail` is an unauthenticated service-role oracle ("google" / "email" / "none") at 60/h per IP. That is account enumeration (`lib/auth/actions.ts:629-668`).
  3. `cancel` in `lib/bookings/actions.ts:406-470` reads the booking with the caller's RLS client (so a host or an admin can read it) and then cancels it with the service role, without checking `guest_id = caller`. The host can cancel through the guest's path.
  4. `/api/client-error` is unauthenticated, and its dedupe can be defeated by varying the message, so the error sink can be flooded.
  5. `X-Powered-By: Next.js` is sent.
- **WHERE:** As listed. The live RPC transcript is in `t2.mjs` output (`rpc_verif_required_other 200 true`, `rpc_agent_trust_other 200 []`).
- **EVIDENCE:** See WHERE (pass one gave them together).
- **WHY IT MATTERS:** Low individually. Together they widen reconnaissance.
- **THE FIX:**
  1. Apply the pending migration and add `if auth.uid() is distinct from p_user then return null` to `agent_trust`.
  2. Return "unknown" from the email probe unless a pending sign-up cookie is present.
  3. Add `.eq("guest_id", session.user.id)` to the `cancel` read.
  4. Add a per-IP `consume` to client-error.
  5. Set `poweredByHeader: false` in `next.config.ts`.
- **EFFORT:** 2 hours.
- **PASS TWO:** CONFIRMED (LOW). Item 3 verified: `cancel` reads through the caller's RLS client (so a host or admin can read the booking), then updates with the service role without a `guest_id` check; it is limited to unpaid bookings.

#### SEC-18 | KYC flow | MEDIUM | The member `/verification` submit is a stub that always refuses
- **WHAT IS WRONG:** `submitVerification` ignores its payload and returns "We cannot accept documents right now…" in every case.
- **WHERE:** `apps/web/src/app/(app)/verification/actions.ts:36-60`.
- **EVIDENCE:** Code, `void submission; return { ok:false, … }`.
- **WHY IT MATTERS:** Any member asked to verify hits a permanent "try again in a few minutes". Probably owned by the flows agent; noted here because it is the KYC entry point.
- **THE FIX:** Wire the upload into `agent-documents` with the path convention and policies (minus SEC-12's update/delete), or hide the entry point.
- **EFFORT:** Half a day.
- **PASS TWO:** SEVERITY CHANGED LOW→MEDIUM. The stub is confirmed (`app/(app)/verification/actions.ts:36-60`), and `/verification` is live and reachable (it rendered "Step 1 of 5 Your ID" for the QA member). It tells every user "Try again in a few minutes" for ever, which is false copy on the KYC entry point. Hide it or wire it.

#### NEW IN PASS TWO

#### SEC-P2-01 | Authorization / money | CRITICAL | Guest-authored booking rows carry their own price, and checkout charges the stored price

**Guest-authored booking rows carry their own price, and checkout charges the stored price.** Filed new in A07's review of A04 (the reviewer noted it was SUP-03 in its own pass one, now proved). It is the same defect as ESC-02, and is merged there with its probe (`SUP-03 guest-authored booking accepted, stored total_minor=2 vs listing rate 5000000 per night`) and its fix (revoke INSERT; create bookings via a pricing SECURITY DEFINER RPC; a BEFORE INSERT pricing trigger unless `vallo.rent_charge` is set).

- **PASS TWO:** MERGED INTO ESC-02 (known cross-area duplicate; canonical severity CRITICAL). Found new in pass two by A07.

#### SEC-P2-02 | Authorization / abuse | MEDIUM | Any member can open a message thread with any user id and write into it, bypassing every rule `startConversation` enforces
- **WHAT IS WRONG:**
  - `conversations_insert` checks only that the caller is one of the two parties.
  - `conversation_context_is_valid` validates only reservation and booking contexts. A default `listing` context with a null or arbitrary `listing_id` and an arbitrary counterpart passes.
  - `messages_insert` then accepts messages.
  - This skips `startConversation`'s checks: the listing must exist, the counterpart must be that listing's lister, the per-action rate limit, and the daily new-thread limit.
  - Blocks are still honoured (`conversations_insert_not_across_block`).
- **WHERE:** live policies `conversations_insert`, `messages_insert`; trigger function `private.conversation_context_is_valid`; `lib/messages/actions.ts:116-190`.
- **EVIDENCE:** rolled-back probe as the QA member: `T2 conversation with arbitrary user, no listing: CREATED | T2 message into it: INSERTED`. The counterpart was the QA admin's uid. Control: the member's own-profile read = 1.
- **WHY IT MATTERS:** it enables unsolicited direct messages to any user whose id is known, at a volume the app's limits never see. That means spam, harassment and scam outreach that pretends to be an enquiry. It also triggers the new-enquiry email to the target.
- **THE FIX:**
  - In `conversation_context_is_valid`, for `context_kind='listing'`, require a non-null `listing_id` whose lister's `user_id` equals `agent_id` and whose `guest_id` is not that lister.
  - Move thread creation to a SECURITY DEFINER RPC that carries the daily limit, and revoke INSERT on `conversations` from `authenticated`.
  - Add a DB-side per-sender rate limit on `messages` (as in the SEC-09 fix).
- **EFFORT:** half a day.
- **PASS TWO:** NEW IN PASS TWO (found by the reviewer, A07). Rolled-back probe as the QA member: `T2 conversation with arbitrary user, no listing: CREATED | T2 message into it: INSERTED` (counterpart = the QA admin's uid; control: member's own-profile read = 1). Related: SEC-09.

#### SEC-P2-03 | Fix safety | HIGH | The shared remedy for SEC-01, DB-01, DB-02 and SUP-02 (column-grant revoke) would stop every admin decision
- **WHAT IS WRONG:** three pass-one agents proposed revoking UPDATE on `listings`, `businesses` and `accommodations` from `authenticated`, and re-granting only content columns. Every admin review and publish action updates those protected columns through the admin's own `authenticated` client. The listed call sites are under SEC-01 above.
- **WHERE:** Not stated separately by the pass-two reviewer.
- **EVIDENCE:** rolled-back probe. The control is an admin no-op status update, `rows=1`. After `revoke update on public.listings from authenticated; grant update (title, description) …` the same update fails with `ERR 42501 permission denied for table listings`.
- **WHY IT MATTERS:** shipped as written, the fix silently stops the review desk. Agent approval, listing approval and publish, and business approval and publish would all return "The console could not reach the platform data just now". That would be a fourth "total blockage" introduced by a security fix.
- **THE FIX:**
  - Use a guard trigger keyed on `private.has_role(auth.uid(), admin|super_admin)` or `service_role`, instead of, or before, column revokes.
  - Or first switch those admin updates to `createAdminClient()`.
  - Add a probe that runs one admin decision as `authenticated` with admin claims after the migration.
- **EFFORT:** 2 hours, on top of the SEC-01 migration.
- **PASS TWO:** NEW IN PASS TWO (found by the reviewer, A07). Rolled-back probe: admin no-op status update `rows=1` (control); after `revoke update on public.listings from authenticated; grant update (title, description) …` the same update fails `ERR 42501 permission denied for table listings`. A08 reached the same conclusion independently in its review of A03. In this merged record the canonical fixes (DB-01, DB-02, and the DB-05/DB-06/DB-07 amendments) already carry the trigger-based remedy, so no merged fix still proposes a grant-only revoke on an admin-written table.

#### SEC-P2-04 | Authorization | LOW | Card checkout proves the caller can read the booking, not that they are its guest
- **WHAT IS WRONG:** `guardPayable` (`lib/bookings/checkout.ts:218-262`) calls the booking "yours" if the caller's RLS client can read it. The listing's host (`bookings_host_select`) and admins (`bookings_admin_all`) can read it, so either can start a card payment for someone else's booking. The wallet path is safe: `private.pay_booking_from_wallet` requires `guest_id = payer`.
- **WHERE:** Not stated separately by the pass-two reviewer.
- **EVIDENCE:** code as cited, and the live function body.
- **WHY IT MATTERS:** low direct harm, because the payer spends their own money. It is still a gap on a money path: a host can "pay" their own guest's booking and move money through escrow without a real guest.
- **THE FIX:** add `if (booking.guest_id !== session.user.id) return NOT_FOUND` in `guardPayable` (the column is already selected).
- **EFFORT:** 15 minutes.
- **PASS TWO:** NEW IN PASS TWO (found by the reviewer, A07). Code as cited (`guardPayable`, `lib/bookings/checkout.ts:218-262`) and the live `pay_booking_from_wallet` body (requires `guest_id = payer`, so the wallet path is safe).

#### CHECKED AND FOUND SOUND

- **Admin gate:**
  - All 44 admin-area exported actions call `requireAdmin` (static table).
  - `requireAdmin` reads `user_roles` through the caller's RLS client (`lib/admin/guard.ts:54-83`).
  - Live as the member: `/admin`, `/admin/kyc`, `/admin/agents`, `/admin/money` and `/admin/audit` render only "This area is for the Vallo operations team…". `/admin/enter` returns 303 to `/admin`, and `/api/documents/<id>` returns 403.
- **Member → admin paths:** none found.
  - Member POST `user_roles {role:'admin'}` gets `403 42501 new row violates row-level security policy`.
  - A PATCH of the member's own role affects `[]` rows.
  - `admin_bootstrap` has no grants to anon or authenticated (`has_table_privilege` all false). Its `admin_all` policy would otherwise let a plain admin mint super_admin rows, so keep those grants revoked.
  - Only super_admin can manage `user_roles`. Agent approval grants only `agent`.
  - `user_metadata` is never used in RLS or in any authorization decision; greps find only display and name uses.
- **Admin RPCs refuse a member live:** `admin_payment_health`, `admin_revenue_summary`, `escrow_admin_resolve` and `review_kyc_document` return `{"status":"forbidden"}`. `admin_user_id_by_email` returns `null`. `account_deletion_blockers(other)` returns `403 may only be asked about yourself`. `end_session(other)` returns `not_found`.
- **IDOR reads:** the member reading the admin's profile gets `[]`, `account_identities` returns `403 permission denied`, and `feature_flags` PATCH affects 0 rows.
- **Pot balance guard:** a member PATCH of `wallet_pots.balance_minor` returns `400 23514 A pot balance changes only by moving money.` (live).
- **`bank_accounts`:** the client can update only `is_default`, `deleted_at` and `updated_at`, so the account number and resolved name are not client-writable.
- **Service-role actions used by non-admins:** I reviewed `markThreadRead`, `startConversation`/booking/reservation threads, `offerBusinessTransfer`, `confirm`, `declineBooking`/`recordStay`, `addPayoutAccount`, `fileSupportTicket` and `restoreWithCode`. Each checks ownership before the service-role write, except the items in SEC-02, SEC-03 and SEC-17.
- **Open redirects:**
  - `safeReturnPath` run against payloads: `//evil.example`, `/\evil.example`, `/%5Cevil.example`, `/%2F%2Fevil.example`, `/\t/evil.example` and `https://evil.example` all return `null`.
  - Live: `/home-or-landing?next=//evil.example` returns 307 to `https://www.vallospaces.com/`, and `/admin/enter?next=//evil.example` stays on-site.
- **Webhooks and cron (live):**
  - Paystack with a bad signature: `401 signature_invalid`.
  - Email hook unsigned: `401 unauthorised`.
  - Cron with a bad bearer: `401 unauthorised`.
  - Yellow Card: `500 unconfigured`. That is the intended refusal until configured.
- **Headers (live `/sign-in`):**
  - CSP with a per-request nonce and `strict-dynamic`, `object-src 'none'`, `frame-ancestors 'none'`, `base-uri 'self'`, and `form-action` limited to self and Paystack
  - `X-Frame-Options DENY`
  - `nosniff`
  - `Referrer-Policy strict-origin-when-cross-origin`
  - `Permissions-Policy`
  - HSTS preload on www
- **CORS:** `/api/support` OPTIONS and `/api/push/key` GET with `Origin: evil.example` return no `Access-Control-Allow-*` headers.
- **Secrets:**
  - Full history, 1,642 commits: no `sk_live`/`sk_test` key other than obvious test fixtures in `no-committed-secrets.test.ts`, `scrub.test.ts` and `BUILD_07_LEDGER.md`.
  - No service-role JWT, `sb_secret_`, `re_` Resend key, AWS or GitHub token, VAPID private key, cron secret or real private key. The "BEGIN PRIVATE KEY" hits are only in `no-committed-secrets.test.ts`.
  - `google-services.json` holds a `PASTE_…` placeholder.
  - Live bundles contain only the anon JWT (`role: anon`), which is public by design.
  - `NEXT_PUBLIC_*` vars are all legitimately public. `NEXT_PUBLIC_MAPTILER_KEY` should be domain-restricted in MapTiler's dashboard (founder check).
- **KYC delivery:** admin-only, proxied, audited, `no-store`, `nosniff`, served under an id-based filename. The stored names are `idFront.jpg`/`idBack.png`, so a user's filename like "Seyi-NIN-slip.pdf" never reaches a URL. The KYC bucket is private (public URL returns 400).
- **Listing wizard photos:** re-encoded through a canvas to JPEG, which strips EXIF, in the normal UI path.
- **Consent:** no analytics, trackers or third-party hosts on landing or after sign-in; all cookies are strictly necessary or preference. No consent banner is required today; only the privacy text is wrong (SEC-13).

**Pass-two spot-check of the pass-one server-action authorization table (A07; 16 rows, every 16th row, offset 3):** 16 of 16 columns correct, with one wrong annotation (`subscribeToUpdates` marked "no limit (SEC-03)"; it inherits `fileSupportTicket`'s 10 per hour per IP). The table does not show server-side rate limits, which is how SEC-09 came to call those writes unlimited. The full pass-one table (all 246 exports) is in `pass1/A04-security.md` APPENDIX and is not reproduced here.

#### CORRECTLY EMPTY vs BROKEN

| Screen / data | Verdict | Reason |
|---|---|---|
| Member `/messages` (PostgREST `conversations`, `messages` → `[]`) | CORRECTLY EMPTY | The QA member is party to no conversation. |
| Admin `/messages` | BROKEN (SEC-02) | Shows the founder's conversations, of which the admin is not a party. |
| `accommodation-photos`, `listing-photos` buckets (0 objects) | CORRECTLY EMPTY | No real listings or businesses; examples use Unsplash URLs. |
| Member `wallets`, `bank_accounts`, `agent_applications` → `[]` | CORRECTLY EMPTY | The QA member has none. |
| `/verification` submit | BROKEN (SEC-18) | Stub always refuses. |

#### CLEANUP (things pass one created)

- The business `955163b4-a23c-4b20-a02a-990b8b7ec5b6` (QA member) was created and **deleted**; confirmed with 0 rows.
- The wallet pot `47925737-30d4-4c5a-a54c-1c8f4c2c5fb7` "QA A04 probe" (QA member, balance 0) was created. Owners cannot delete pots (no DELETE policy), so I **archived** it (`archived_at` set). An admin can delete it: `delete from wallet_pots where id='47925737-30d4-4c5a-a54c-1c8f4c2c5fb7'`.
- There are about 10 `auth.sessions` rows with user_agent `node` on the QA member and 2 on the QA admin, created 20:15–20:45Z by my scripts (one was already ended by the SEC-08 test). They were left in place because other agents may share the same UA and account; end them from `/settings/devices` or with `delete from auth.sessions where user_agent='node' and created_at between '2026-09-23 20:10' and '2026-09-23 20:50'`.

#### NOT COVERED

- **Live direct invocation of server actions over HTTP** (the POST with a `Next-Action` id). I did not harvest action ids from bundles. Server-action authorization rests on the full static table (appendix) plus manual reading of every service-role action, and the underlying data-layer refusals were proved live over PostgREST. Pass two should drive the UI in a real browser as the member against admin-owned ids for 3–4 service-role actions.
- **Supabase Auth settings:** secure email/password change, JWT expiry, auth rate limits, redirect-URL allowlist, CAPTCHA and whether email confirmation is required. They are not readable with the read-only role, and I did not probe email change live because it could alter a QA account's address. The host-header route (`authOrigin()` trusts `x-forwarded-host`, `lib/site.ts:53-66`) is only as safe as that allowlist.
- **Vercel env vars:** `EMAIL_REPLY_TO`, `NEXT_PUBLIC_SUPPORT_EMAIL` and so on. The connected Vercel team does not contain the Vallo project. **Confirmed after the audit (founder's read of Vercel, 23 September):** both are NOT SET.
- **DNS** (MX/SPF/DMARC for replies) and HSTS preload status: egress was blocked.
- **RLS was not audited table by table** beyond the tables named here. That is another agent's area; SEC-01's column-grant query should be run across every table.
- **Credential stuffing and brute force** were not exercised. **iOS home-screen and Capacitor cookie-store behaviour** is taken from code comments (`proxy.ts` VAPID note: "a home screen web app keeps its own cookie store") and not tested on a device.
- **The realtime channel** as an admin (SEC-02 extension) is reasoned, not captured.
- **Message-attachment EXIF:** no live object exists.

**Also noted by pass two (A07):** listing creation 42501 is filed as SUP-01 and DB-03 (canonical DB-03) and was reproduced independently; the live Postgres log shows a continuous `new row violates row-level security policy for table "post_views"` (dozens per hour) — an unowned social-area defect, not security, but noise that hides real refusals.

#### FOR THE FOUNDER

1. **SEC-01 is live now.** Approve the column-grant migration today.
2. **Email-can-never-change (SEC-15):** decide whether an audited, staff-only, identity-verified email move is allowed. Without one, a user who loses their Gmail loses their wallet.
3. **Support inbox:** `EMAIL_REPLY_TO` is confirmed NOT SET in Vercel Production; set it once a mailbox exists, and confirm that `hello@vallospaces.com` actually receives mail. Also confirm the real private address, so the SEC-11 guard can be written with a regex covering both spellings, never the literal.
4. **Discrimination policy (SEC-06):** should "married couples only", "students only" and gender-only (e.g. "ladies only" for a shared female flat) be held for review or allowed? Add marital status to /standards?
5. **Abuse list tuning (SEC-05):** approve demoting `loli`, `paki`, `coon`, `wog` and "i will deal with you".
6. **Vendor for NIN verification:** gates the real fix to multi-account abuse (per `docs/ONE_PERSON_MANY_ACCOUNTS.md`), which is unchanged by this audit.
7. **Sign-out semantics (SEC-08):** confirm "this device" versus "everywhere".
8. **MapTiler key:** restrict it to vallospaces.com in the MapTiler dashboard.

*Pass-two note on item 1:* do **not** approve a column-grant migration for SEC-01; it would stop every admin decision (SEC-P2-03). Approve the role-aware trigger fix carried in DB-01 and DB-02 instead.

---

### A05 — USER EXPERIENCE AS ITS OWN DISCIPLINE: merged pass one + pass two

Sources: `pass1/A05-ux.md` (Agent 5; Playwright + Chromium at 390x844, iPhone UA, signed out and as the QA member; code at origin/main `0ab215f`; browser wall-clock times are not site performance — server speed is from `curl` TTFB) and its pass-two review `pass2/R-A05-by-A06.md` (Agent 6; code at `0ab215f`, live checks at 390px signed out and as the QA member; nothing created apart from sessions). Screenshots: `scratchpad/work/A05/shots/` and `work/A06/shots/p2-*.png`; the QA email was blacked out or deleted from every screenshot.

Pass-two tally (28 findings): confirmed 23 (15 severity unchanged; 8 severity changed — HIGH→MEDIUM: UX-02, 04, 06, 07, 11; MEDIUM→LOW: UX-17, 18, 19); fix amended 4 (UX-09, 19, 24, 25); merged 5 (UX-01 → STORE-P2-04; UX-03 → STORE-05; UX-13 → MON-04; UX-26 → STORE-06; UX-27 CSP half → OPS-15, error-boundary half kept at LOW); withdrawn 0; new 3. The orchestrator then raised UX-24 HIGH→CRITICAL on catalogue evidence.

#### DANGER NOW

None found in my area. No money path could be driven: every listing is an example, and the example hotel checkout refuses (see "Checked and found sound"). One trust item borders on data exposure, UX-24 (the people directory shows every member's occupation and local government). It goes to the privacy/security agent as HIGH, not DANGER.

*Orchestrator note:* UX-24 is now CRITICAL. The catalogue shows `social_profiles` (name, handle, occupation, LGA, state, home area, bio) readable by the `anon` role under a policy open to `public`, so it is probably exposed to anyone holding the publishable key, which ships in every page. An over-the-wire anonymous read was not performed. Treat it as the first privacy fix in this area.

#### FINDINGS (pass one, with pass-two verdicts)

#### UX-01 | First run / IA | HIGH | A stranger can open nothing: every landing CTA ends at a carousel and then a sign-in wall

**A stranger can open nothing: every landing CTA ends at a carousel and then a sign-in wall.** Signed out, every product route redirects to sign-in, and a first-time device is first sent through a 4-slide welcome carousel; the landing's CTAs, city chips, tiles, hero card, search box and footer links all hit the wall, after a search-results skeleton that promises results. The pass-two reviewer (A06) reproduced it (`/search` → `/welcome?next=%2Fsign-in%3Fnext%3D%252Fsearch%26notice%3Dsign-in-required`) and merged it into STORE-P2-04 (the same gate, the same 5.1.1(v) argument, the same fix). STORE-P2-04 now carries an "Also reported as UX-01" line with the reviewer's fix amendments: keep `/u/*` and people search gated (UX-24); test that public pages render no GET-creates-row links (UX-P2-03); verify the private address stays out of the anon select; rate-limit anon catalogue reads; and, if the wall stays, skip the carousel on `notice=sign-in-required`. Part (b) of this finding's fix (carrying `next` into sign-up) belongs to UX-02.

- **PASS TWO:** MERGED INTO STORE-P2-04 (fix amended). Canonical severity HIGH. A06 in pass two reproduced the redirect chain and the carousel's last slide (`Sign in->/sign-in?next=%2Fsearch&notice=sign-in-required | Create account->/sign-up`).

#### UX-02 | First run | MEDIUM | New accounts lose where they were going: "Create account" / "Sign up" drop `next`
- **WHAT IS WRONG:** The gate keeps `next` in `/sign-in`, but both ways to create an account throw it away. The welcome carousel's "Create account" links to bare `/sign-up`. The sign-in card's "New to Vallo? Sign up" links to bare `/sign-up`. The email-link confirmation hardcodes `/home`.
- **WHERE:** `apps/web/src/components/app/welcome/FirstRun.tsx:355` (`signUpHref = next && /^\/sign-up/.test(next) ? next : "/sign-up"`: when next is `/sign-in?next=/search…` it falls back to `/sign-up`); `apps/web/src/components/auth/AuthChoices.tsx:139-142` and `EmailAuthForm.tsx` (bottom swap link: `href={isSignUp ? "/sign-in" : "/sign-up"}`); `apps/web/src/lib/auth/actions.ts:381` (`emailRedirectTo: …/auth/callback?next=${encodeURIComponent("/home")}`).
- **EVIDENCE:** The live DOM of slide 4 with `next` set: `Sign in->/sign-in?next=%2Fsearch&notice=sign-in-required | Create account->/sign-up`. The code path for an OTP sign-up keeps next only if the sign-up form received it (`actions.ts` `redirect('/sign-up/verify?next=…landingAfterAuth')`), and it never does.
- **WHY IT MATTERS:** The people most likely to arrive through a shared listing are new people, and every one of them lands on generic Home after a 9-field form and an email code, with the listing gone.
  - *Pass two (A06): the new user still reaches a working product; they lose their destination, not access — a funnel loss (MEDIUM), not "broken for them".*
- **THE FIX:** Carry the inner `next` through: in FirstRun, parse `next`, and if it is `/sign-in?next=X`, build `/sign-up?next=X`. In AuthChoices and EmailAuthForm, append `?next=${encodeURIComponent(next)}` to the swap link. In `signUpWithEmail`, use `landingAfterAuth(formData)` in `emailRedirectTo` as well.
  - (from UX-01's fix, part (b), moved here by the pass-two reviewer) If the sign-in wall stays, send gated deep links straight to `/sign-up?next=…`.
- **EFFORT:** 2 hours plus a test.
- **PASS TWO:** CONFIRMED — SEVERITY CHANGED HIGH→MEDIUM. Code confirmed: `FirstRun.tsx:355` only honours `next` if it starts `/sign-up`; `AuthChoices.tsx:168` and `EmailAuthForm.tsx:429` link to bare `/sign-up`; `actions.ts:386` and `:792` hard-code `emailRedirectTo … next=/home`. Live: on `/sign-in?next=%2Flisting%2F…3a` (and `/sign-in/email?next=…`), "Sign up" goes to `/sign-up` with no next. The fix is correct as written.

#### UX-03 | Trust / honesty | HIGH | The landing page presents example listings as real, "verified" inventory

**The landing page presents example listings as real, "verified" inventory.** The same finding as A08's STORE-05 (the claim half also appears in A06's UI-03). The pass-two reviewer (A06) merged it; its one addition — the landing line "Any figure on this page is read from the platform as the page loads" — and its evidence (`curl … | grep -o "Example[^<]{0,40}"` → no output) are now in STORE-05's "Also reported as UX-03" line, together with its fix option (show no listing cards until a real one exists; truthful replacement wording).

- **PASS TWO:** MERGED INTO STORE-05 (known duplicate). Severity HIGH stands under STORE-05.

#### UX-04 | Two-side model | MEDIUM | The side flips silently when you open a card, and stays flipped everywhere
- **WHAT IS WRONG:** The side is a cookie that is rewritten from the path (`/stay/*`, `/trips`, `/restaurants`, `/host` = stays). Property Home's "Featured properties" link shortlets, a hotel room *and two yearly rentals* to `/stay/…`. One tap on a property card therefore turns Settings, Profile, the ⇄ sheet and Add a workspace into the Stays side. Nothing says it happened, and browser Back does not undo it.
- **WHERE:** `apps/web/src/lib/side.constants.ts` (`STAYS_PATHS`, `sideOfPath`, `writeSideCookie`); `apps/web/src/lib/listings/href.ts:51-60` (`STAY_KINDS = hotel, shortlet, villa, apartment` → `/stay/`).
- **EVIDENCE:** `back.mjs` output: `home dock Home,Search,Feed,Profile` → open first featured card `/stay/ed…3a` → `settings dock after opening a featured property from Home: Stays,Search,Feed,Profile` → `profile dock: Stays,Search,Feed,Profile` (`bk-03-settings-after-featured.png`). Also `m-trips.png`, then `m-settings.png`: visiting My Bookings → "Open Trips" flips the dock to Stays. The drawer "Switch to Stays" uses history replace: `after flip /stays`, `goBack` → previous history entry is gone (`bk-02-back-after-flip.png`). Home link list: `Example For rent Five bedroom villa on B->/stay/ed…3d`, `Example For rent Four bedroom villa in M->/stay/ed…3e`.
- **WHY IT MATTERS:** The person does not know which side they are on or how they got there. It decides what the dock, the drawer (Bookings vs Trips) and the supplier chooser show (UX-05).
  - *Pass two (A06): on its own this is disorientation; its harmful consequence is UX-05, which keeps HIGH.*
- **THE FIX:** Only an explicit switch (drawer FLIP or a visible side control) should write `nf_side`. Detail pages must not. Route by intent, not by kind: `hrefForListing` should send `intent==='rent'` with a yearly or monthly price to `/listing/`. Property Home's shelf should query property intents only. Add a persistent side indicator (e.g. the header wordmark reads "VALLO · Stays" on the stays side) and make the FLIP use `push` so Back returns.
- **EFFORT:** 1 day.
- **PASS TWO:** CONFIRMED — SEVERITY CHANGED HIGH→MEDIUM. Live with `nf_side` cleared: the `/home` dock reads Home, Search, Switch profile: Personal, Feed, Profile; opening the first featured card goes to `/stay/ed…3a` and the cookie becomes `nf_side=stays`; `/settings` then shows the dock "Stays, Search, …". Featured "For rent" villas link to `/stay/ed…3d` and `/stay/ed…3e`.

#### UX-05 | Two-side model / supply | HIGH | "Add a workspace" shows completely different choices depending on the invisible side
- **WHAT IS WRONG:** The same screen, title and subtitle ("Tell us what kind of supplier you are") offer "I own the property / I am an agent / We are a registered firm" on the property side, and "We are a hotel / I run a shortlet / We are a restaurant" on the stays side. Nothing says why or how to see the other set. A landlord who last tapped a shortlet cannot find "I own the property".
- **WHERE:** `apps/web/src/components/supply/AddWorkspaceChooser.tsx:298-305` (`hrefFor(door, side)`), `apps/web/src/components/app/nav-model.ts:360`.
- **EVIDENCE:** `chooser.mjs` with `nf_side=property` → owner/agent/firm (`ch-property-selected.png`). `chooser2.mjs` with `nf_side=stays` → "We are a hotel | I run a shortlet | We are a restaurant" (`ch-stays-chooser.png`).
- **WHY IT MATTERS:** This is the supply funnel, the thing the marketplace needs most, and it depends on a cookie the user cannot see.
- **THE FIX:** Show all six doors on one chooser in two labelled groups ("Property — rent or sell" / "Stays and tables — by the night"). Pre-open the group for the current side, but never hide the other.
- **EFFORT:** 3-4 hours.
- **PASS TWO:** CONFIRMED (HIGH). Live, same session: after the card tap, `/profile/setup` offers only "We are a hotel / I run a shortlet / We are a restaurant"; with `nf_side=property` it offers "I own the property / I am an agent / We are a registered firm". One tap on the Property Home shelf hides every property supply door. The fix stands.

#### UX-06 | Two-side model / IA | MEDIUM | The centre ⇄ dock button looks like the side switch but switches profile; the real side switch is buried
- **WHAT IS WRONG:** The dock's centre ⇄ control (no label) opens "Switch profile: Personal". For a normal member the sheet holds one checked option and "Add a workspace — Register as a supplier or business". The Property↔Stays switch (the product's headline "Two worlds. One platform. Flip between Property and Stays") is only a card at the *bottom of the hamburger drawer*, 2 taps away and below the fold of the drawer on shorter phones.
- **WHERE:** `apps/web/src/components/app/MobileTabBar.tsx` (slots comment "THE SWITCH"), `components/supply/ProfileSwitcher.tsx`; drawer `components/app/nav-model.ts`.
- **EVIDENCE:** `nav-02-switch-sheet.png` (aria-label "Switch profile: Personal"); `nav-01-drawer.png` (FLIP card at the bottom). Welcome slide 1 promises the flip (`fr-10-welcome-slide1.png`).
- **WHY IT MATTERS:** The one thing the onboarding teaches, "flip", is not what the prominent control does. Personal vs working mode and property vs stays are two orthogonal switches drawn with the same ⇄ idea. Three supply roles plus the host console make it four vocabularies (UX-23).
- **THE FIX:** Make the dock's centre control the Property↔Stays flip (that is what "switch" means to every user). Move the personal/working switch to the avatar and profile header, where account identity lives. If the founder keeps the current layout, at least label the ⇄ ("Mode") and put "Switch to Stays / Property" at the top of that same sheet.
- **EFFORT:** 4-6 hours.
- **PASS TWO:** CONFIRMED — SEVERITY CHANGED HIGH→MEDIUM. Live: the centre button's accessible name is `Switch profile: Personal`; the Stays flip is only in the drawer (FLIP card at the bottom). Why lower: an information-architecture choice that confuses but breaks no task, and a founder decision.

#### UX-07 | Find a flat to rent | MEDIUM | "Rent" returns nightly stays, hotel rooms and a restaurant; the filter chip says "Any market"
- **WHAT IS WRONG:** Home → Rent → `/search?market=rent` returns 52 of 64 listings. The first three are "Per night" shortlets and a hotel room, and "Restaurant unit in Bodija — Per head" appears too. The market chip still reads "Any market" while the filter count badge says 1.
- **WHERE:** `apps/web/src/components/app/search/shelf-query.ts:38-67` (market → `intent`, and nightly stays carry intent rent); `components/app/search/ShelfBar.tsx:81` (`on: Boolean(query.intent || query.kind)`, but the label is not updated).
- **EVIDENCE:** `fa-01-rent-results.png`, text: "1 | Any market | … | 52 properties found | Example Per night One bedroom shortlet in Wuse 2 … ₦70,000/night | … Hotel room in Ikeja … ₦45,000/night"; link list includes `Example Per head Restaurant unit in Bodija->/restaurant/ed…2a`.
- **WHY IT MATTERS:** The core renter job ("a flat to rent by the year") is polluted by nightly stays on the first screen, and the filter UI contradicts itself.
- **THE FIX:** On the property side, `market=rent` should mean tenancy kinds (`rental, shop, office, land`, plus `home/apartment/villa` whose price period is year/month/quarter) and exclude `hotel, shortlet, restaurant` and nightly periods. Set the chip label to "Rent" or "Buy" when `intent` is set.
- **EFFORT:** 3-4 hours.
- **PASS TWO:** CONFIRMED — SEVERITY CHANGED HIGH→MEDIUM. Live `/search?market=rent`: "1 | Any market | … 52 properties found", the first three results "Per night" shortlets and a hotel room. Why lower: results are polluted and the chip label is wrong, but a renter can still reach rentals. The underlying rule (nightly stays carry intent rent) will still be wrong on real listings, so the fix remains needed.

#### UX-08 | Book a stay | HIGH | Picking dates on a hotel sends you away to search, which has no date field
- **WHAT IS WRONG:** On `/stay/[id]` the Check in, Check out, Guests fields and the "Pick your dates" CTA all link to `/stays/search`. The hotel is lost. The search page shows no date input (dates are inside "Filters"), so the guest must set dates in Filters and then find the same hotel again.
- **WHERE:** `apps/web/src/app/(app)/stay/[id]/page.tsx:203` (`datesHref={toStaysSearchHref({ checkIn, checkOut, guests })}`); `StayDetailView.tsx:208-230`.
- **EVIDENCE:** `flowB3.mjs`: tapping "Pick your dates" goes to `https://www.vallospaces.com/stays/search` (`fb-04-after-pick-dates.png`, controls: `q->INPUT | Search stays | Filters | Hotels…`, no date). With `?checkIn=2026-10-10&checkOut=2026-10-12` on the stay URL the page works ("Book now", "Total for 2 nights: ₦170,000", `bb-01-stay-with-dates.png`), so the fix is only the control. About 12 taps against about 5.
- **WHY IT MATTERS:** This is the booking funnel's first step. Guests abandon.
- **THE FIX:** Open an in-page date-range sheet (reuse the `StayFilterSheet` date group with `min={today}`) that writes `checkIn/checkOut/guests` onto the **same** `/stay/[id]` URL with `router.replace`. Also put a dates row on `/stays/search` above the categories.
- **EFFORT:** 4-6 hours.
- **PASS TWO:** CONFIRMED (HIGH). Live `/stay/ea…01`: `Check in Select date->/stays/search | Check out Select date->/stays/search | Guests 2 guests->/stays/search | Pick your dates->/stays/search`. The hotel is lost at the first booking step. The fix stands.

#### UX-09 | Trust / honesty | HIGH | Example hotels carry no example disclosure, offer "Book now", and fail at checkout
- **WHAT IS WRONG:** The property detail page shows "This is an example listing…" and hides booking. The stays detail page for the example hotels (`ea…` ids) shows neither the disclosure nor any "not bookable" notice. It shows a host card with a "Message" button and a person-with-tick glyph, and a live "Book now" with a total. Only the checkout says "Vallo cannot hold this room".
- **WHERE:** `apps/web/src/app/(app)/stay/[id]/page.tsx` / `StayDetailView.tsx` (no `is_demo` branch; grep for demo/example finds only a comment at page.tsx:90).
- **EVIDENCE:** `fb-02-stay-detail.png` / `fb-02b-stay-detail-full.png`: the text contains no "example". `bb-02-checkout.png`: "Vallo cannot hold this room | Rooms at this property are not reserved through Vallo, so nothing has been held and nothing has been charged … Money moves inside Vallo only once a booking exists and its total is stored to the kobo." (Correctly no charge.)
- **WHY IT MATTERS:** The user is told late, after committing. A store reviewer tapping "Book now" meets a refusal, which looks broken. The tick glyph near "Hotel / Grand Vista Hotel" reads as "verified". UNVERIFIED whether the glyph is the verified mark or a decorative avatar: `hostVerified` should be false for examples. Check it in pass two.
- **THE FIX:** (amended in pass two)
  - *Pass-one fix, retained:* Add the same example banner the property page uses, and replace the reserve card with "Nothing here can be booked" when `is_demo` is true, or when the stay is not first-party or has no bookable rate. Decide bookability on the detail page, not at checkout. Use a neutral building glyph for the host avatar when the host is not verified.
  - *Pass-two amendments:*
    - Use a neutral glyph (a building for a business, a person without a check for a person) when `!host.verified`. This also affects every property listing that uses `DetailAnatomy`, not only stays.
    - See UI-P2-01 for the shared `<ExampleNotice>` on `/stay/[id]` and `/restaurant/[id]`.
- **EFFORT:** 3-4 hours.
- **PASS TWO:** CONFIRMED (HIGH) — fix amended. Live: `/stay/ea…01` text contains no "example" (`p2-stay-ea01.png`); "Book now" links to `/checkout?stay=…`, where checkout correctly refuses ("Vallo cannot hold this room … nothing has been charged"). Pass one's UNVERIFIED point resolved: the person-with-tick glyph is drawn for every host, verified or not — `components/app/listing/DetailAnatomy.tsx:181` renders `<BrandIcon name="user-check" fill />` unconditionally; only the text badge at `:185-188` is gated on `host.verified`. Overlaps UI-P2-01 (A05's review of A06: example hotels **and restaurants** carry no disclosure); both kept and cross-referenced.

#### UX-10 | Two-side model / pricing | HIGH | Yearly rentals of kind "villa" render as nightly stays: "₦50m Total for 2 nights"
- **WHAT IS WRONG:** "Five bedroom villa on Banana Island" is a rental (₦25m / year, minimum tenancy 12 months). It shows as "For rent · ₦36.3m to move in" in search, but its detail page (both `/stay/` and `/listing/`) says "For stays", draws nightly booking, and its sticky bar reads **"₦50m Total for 2 nights"**. Its reviews box says "Nobody has stayed here".
- **WHERE:** `apps/web/src/app/(app)/listing/[id]/page.tsx:153-157` (`MARKET_PILL.villa/home/apartment = "For stays"`) and `:293-309` (`isBookable = !isRental && !isRestaurant && !isSale`, keyed on `kind==='rental'` rather than intent or price period); `lib/agent/listings-schema.ts:196-198` (agents can pick "Villa: A large private home with grounds" with no period guidance).
- **EVIDENCE:** `m-stay_ed000000_0000_4000_8000_00000000003d.png` / `m-listing_ed…3d.png` text: "For stays … ₦25,000,000 / year … Minimum tenancy 12 months … ₦50m Total for 2 nights".
- **WHY IT MATTERS:** This is an absurd total on a money screen. Today it only affects example data, but any agent who lists a home or villa to let by the year gets the same nightly UI, and the booking path would compute a 2-night total from the yearly rent.
- **THE FIX:** Decide bookability by price period, not kind: `isBookable = period === 'night'` (plus not sale, not restaurant). `rentPeriodOf` already exists. Derive the market pill from the same rule. In the listing wizard, make Home/Villa/Apartment ask "By the night or on a tenancy?" and store the intent. Fix the two example rows.
- **EFFORT:** 4 hours plus data fix.
- **PASS TWO:** CONFIRMED (HIGH). Live: both `/stay/ed…3d` and `/listing/ed…3d` show "For stays", "/ year", the example banner, and "₦50m Total for 2 nights" (`p2-stay-3d.png`, `p2-listing-3d.png`). A nightly total computed from a yearly rent on a money screen is correctly HIGH. Related: UI-P2-03 (the same kind-based routing puts rentals under the stay template and restaurant premises under the restaurant template); fixes shared.

#### UX-11 | Supply onboarding | MEDIUM | Supplier doors are mislabelled and the agent console tells a signed-in person to "Sign in"
- **WHAT IS WRONG:** On `/agent/list`, "Become an agent" links to `/profile/setup/owner` ("Register as an owner"). "Apply to list" on `/agent/dashboard` also goes to the owner form. A personal member can open `/agent/dashboard` and sees "Add New Listing / View Bookings / Manage Listings / Earnings Report" plus a sidebar footer "Not signed in as an agent — [Sign in]" (→ `/sign-in`) and "Switch to Personal Mode" while already personal. The console logo "Vallo home" goes to the marketing landing `/`. Copy also contradicts itself: `/agent/list` says "Listing is open to approved agents", and the help FAQ says "Apply from Become an agent… only approved agents can publish", while the chooser says "I own the property — List it yourself. No agency fee."
- **WHERE:** `apps/web/src/app/agent/list/page.tsx`, `apps/web/src/app/agent/dashboard/*`, agent layout nav; `packages/i18n/src/locales/en.ts:942-944` (FAQ "Can I list my property?"); `app/(site)/help/page.tsx`.
- **EVIDENCE:** `links.mjs`: `== /agent/list … Become an agent->/profile/setup/owner … Sign in->/sign-in | Switch to Personal Mode`; `== /agent/dashboard … Apply to list->/profile/setup/owner … Vallo home->/`. Screens: `m-agent_dashboard.png`, `sup-agent_list.png`.
- **WHY IT MATTERS:** An agent taps "Become an agent" and gets an owner form. A signed-in user is told they are not signed in. Owners are told only agents can list.
- **THE FIX:** Point "Become an agent" at `/profile/setup/agent` and "Apply to list" at `/profile/setup`. For a personal member, redirect `/agent/*` to `/profile/setup?role=agent` (or render one explainer). Replace "Not signed in as an agent / Sign in" with "You have no agent workspace yet — Add one". Point the console logo at `/home`. Rewrite the FAQ and the `/agent/list` copy to "Owners, agents and firms can list after a person checks them."
- **EFFORT:** 3-4 hours.
- **PASS TWO:** CONFIRMED — SEVERITY CHANGED HIGH→MEDIUM. Live as the member: `/agent/list`: `Become an agent->/profile/setup/owner`, `Sign in->/sign-in`, `Switch to Personal Mode`, `Vallo home->/`; `/agent/dashboard`: `Apply to list->/profile/setup/owner`. Why lower: the doors are mislabelled and the copy wrong, but the owner form they reach works, so no one is locked out. (Overlaps SUP-15 in part.)

#### UX-12 | Forms / Nigerian data | MEDIUM | The phone field truncates pasted or autofilled numbers in the two most common written forms
- **WHAT IS WRONG:** `PhoneField` has `maxLength={12}`. Browsers apply maxlength to paste and autofill *before* `onChange`, so "+234 803 123 4567" and "0803 123 4567" arrive cut short. The code comment claims a longer paste "is still accepted".
- **WHERE:** `apps/web/src/components/app/PhoneField.tsx:126-137` (used by `components/agent/ApplyWizard.tsx` and `app/(app)/listing/[id]/ReservePanel.tsx`).
- **EVIDENCE:** `paste.mjs` (Chromium, `<input type=tel maxlength=12>`, insertText): `"+234 803 123 4567" -> field receives "+234 803 123" -> national 803123 INCOMPLETE`; `"+2348031234567" -> "+23480312345" INCOMPLETE`; `"0803 123 4567" -> "0803 123 456" INCOMPLETE`; `"08031234567" -> OK`. The validator itself (`lib/phone.ts`, +234/0/10-digit, network prefixes) is sound.
- **WHY IT MATTERS:** Contacts on phones store "+234…". Chrome and iOS autofill `tel` as "+234803…". The user sees a half number and a "keep typing" note.
- **THE FIX:** Remove `maxLength` (or set it to 20) and let `maskNational` trim. It already strips 234/0 and slices to 10.
- **EFFORT:** 15 minutes plus a test.
- **PASS TWO:** CONFIRMED (MEDIUM). Code: `PhoneField.tsx:135` has `maxLength={12}`; the comment at `:130-134` claims a longer paste "is still accepted", but browsers clip pasted and inserted text to `maxlength` before `onChange` (`"+234 803 123 4567"` → `"+234 803 123"`). The fix stands.

#### UX-13 | Trust / money | MEDIUM | Withdraw is promised everywhere but has no control; delete-account then tells you to "Withdraw it"

**Withdraw is promised everywhere but has no control; delete-account then tells you to "Withdraw it".** Merged by the pass-two reviewer (A06) into A01's MON-04, which owns the defect. MON-04 now carries an "Also reported as UX-13" line with this finding's copy sites (`en.ts:609, 891, 1709`; `lib/email/messages.ts:460, 728, 1496`; `lib/email/escrow-messages.ts:265, 298`; help `page.tsx:187-188`) and the store-relevant delete-account blocker CTA "Withdraw it" (Apple 5.1.1(v)), with the interim fix ("Ask support to refund my balance").

- **PASS TWO:** MERGED INTO MON-04 (canonical severity HIGH).

#### UX-14 | Forms | MEDIUM | A refused sign-up clears "Where did you hear about us" and the terms tick; validation only on submit
- **WHAT IS WRONG:** After a server refusal, names, email and passwords survive, but the hear-about select resets to "Select an option" and the agreement checkbox unticks. Fixing the named error and resubmitting then fails again on those two. All validation waits for submit (`noValidate`, server-only), and the form is 9 fields plus 3 pickers in 4 groups.
- **WHERE:** `apps/web/src/components/auth/EmailAuthForm.tsx` (hearAbout `SelectField` is uncontrolled, and React 19 resets uncontrolled fields after an action; `AcceptTerms` is state-driven but is reset too).
- **EVIDENCE:** `signup.mjs` (invalid referral "!!", nothing created; the validator refuses before `auth.signUp`). Before submit: `su-03c-filled-bottom.png` (Instagram, ticked). After: `AFTER REFUSAL … hearAbout= | referralCode=!! | acceptTerms=false` (`su-04c-after-refusal-bottom.png`).
- **WHY IT MATTERS:** Every sign-up error costs two round trips. People quit long forms that forget their answers.
- **THE FIX:** Make hearAbout controlled (`bind("hearAbout")`) and keep `accepted` across action results (do not key or remount the form). Validate each field on blur with the same messages. Consider moving occupation, hear-about and referral to after verification.
- **EFFORT:** 3 hours.
- **PASS TWO:** CONFIRMED (MEDIUM), from code; not re-driven live (to avoid extra auth attempts). `hearAbout` is an uncontrolled `SelectField` (`EmailAuthForm.tsx:314-321`), which React 19 resets after a form action; names are controlled, which is why they survive; `accepted` is `useState` (`:129`) and survives unless the form remounts — pass one observed `acceptTerms=false`, so a remount or reset is happening. The evidence is credible.

#### UX-15 | Help / IA | MEDIUM | "Get an answer from a person" opens the marketing FAQ; the drawer has no Help; the support "agent" is an AI
- **WHAT IS WRONG:** Profile and Settings row "Help — Get an answer from a person" → `/help`, the public site page with the site header "Get Started" shown to a signed-in user. The drawer has no Help entry on either side. Settings → Help & Support → "Open chat" introduces itself as "Hello, I am Vallo's support agent", and the card says "An agent that reads your own bookings" ("agent" means estate agent in this product). It does not say it is AI. A separate "AI Assistant" also exists.
- **WHERE:** `components/app/nav-model.ts` (no help node); `/settings/help`; `components/app/account/SupportChat.tsx`.
- **EVIDENCE:** `links.mjs`: `Help Get an answer from a person->/help`; `m-contact.png` (/contact signed in shows "Get Started"); `hp-01-support-chat.png` text.
- **WHY IT MATTERS:** The confused person, the one who most needs help, is sent to marketing FAQs or to a bot that implies it is a person.
- **THE FIX:** Add "Help" to the drawer (both sides) → an in-app `/settings/help`. Relabel the row "Help centre" when it goes to FAQs, and make "Talk to a person" go straight to the support form. Change the chat greeting to "I'm Vallo's AI helper. I can read your bookings and wallet, and I'll bring in a person when you need one." Hide "Get Started" in the site header when signed in.
- **EFFORT:** 3 hours.
- **PASS TWO:** CONFIRMED (MEDIUM). Live: `/profile` has `Help Get an answer from a person->/help`; `/settings/help` says "An agent that reads your own bookings and hands you to a person"; `SupportChat.tsx:55` opens "Hello, I am Vallo's support agent" and never says it is AI. The fix stands; the AI disclosure is worth doing for trust (see also STORE-07).

#### UX-16 | IA | MEDIUM | Bookings, Trips and Inspections: three homes that point at each other
- **WHAT IS WRONG:** Profile's "My Bookings — View your property and stays bookings" → `/bookings`, which says "Your stays and tables … are on Trips", while its empty state and "How booking works" describe stays ("Choose your dates… Check-in details"). `/trips` says "Tenancies and inspections are on Bookings". Inspections have their own `/inspections`, but the inspection sheet's confirmation says "It is on your bookings screen". The drawer shows Bookings and Inspections on property and only Trips on stays.
- **WHERE:** `m-bookings.png`, `m-trips.png`, `m-inspections.png`; `components/app/inspections/RequestInspection.tsx:171` (`TRACK_IT`); nav-model.ts:180-197.
- **EVIDENCE:** The texts are quoted above, verbatim from the crawls.
- **WHY IT MATTERS:** "Where is my thing?" is the commonest support ticket. Here the answer depends on the side you happen to be on.
- **THE FIX:** One "Bookings" hub with segments (Stays & tables | Tenancies | Inspections), the same in both drawers. Make TRACK_IT link to `/inspections`. Rewrite the `/bookings` empty state for the tenancy side.
- **EFFORT:** 1 day (hub) or 2 hours (copy and link fixes only).
- **PASS TWO:** CONFIRMED (MEDIUM). Live: `/bookings` says "Your stays and tables … are on Trips" and `/trips` says "Tenancies and inspections are on Bookings". Code: `RequestInspection.tsx:172` `TRACK_IT = "It is on your bookings screen."`, although inspections live on `/inspections`.

#### UX-17 | Microcopy / voice | LOW | User-facing strings written for engineers
- **WHAT IS WRONG:** Several user-facing strings are in engineering register.
- **WHERE:**
  - `en.ts:1737` (Settings → Help, `m-settings_help.png`): "Account preferences are protected with row level security, so only you can read or change your own row."
  - Settings → Account: "Your occupation comes from the platform's own list of 749, so it can be searched on."
  - Checkout (`bb-02-checkout.png`): "Money moves inside Vallo only once a booking exists and its total is stored to the kobo."
  - `en.ts:2646`: "What has settled from your stays, taken straight from the ledger."; `:2649` "We could not read the ledger just now".
  - Landing: "Any figure on this page is read from the platform as the page loads".
  - Error boundary `app/error.tsx:48` says "tell support and quote the reference" but renders a reference only when `error.digest` exists, which client errors (e.g. a failed chunk) never have (`so-help.png`: the sentence shows, no reference).
  - Settings → Help: "Version 0.1.0 · Open source licences Next.js, React, Tailwind CSS (MIT)" (fine for licences, but "0.1.0" in a store build reads unfinished).
- **EVIDENCE:** See WHERE (pass one gave them together).
- **WHY IT MATTERS:** A first-time Nigerian renter does not know "row", "ledger" or "kobo-stored totals". The engineering voice lowers trust.
- **THE FIX:** Rewrite: "Only you can see or change your preferences." / drop the 749 sentence / "You are only charged once your booking is confirmed." / "Earnings from your completed stays." For the error page, show "quote the reference" only when a digest exists; otherwise "tell support what you were doing". The version string comes from the native build.
- **EFFORT:** 2 hours.
- **PASS TWO:** CONFIRMED — SEVERITY CHANGED MEDIUM→LOW. All strings confirmed: `en.ts:1737` ("row level security … your own row"), `en.ts:1440` ("list of 749"), `checkout/page.tsx:126` ("stored to the kobo"), `error.tsx:48-52` ("quote the reference" shown although the reference renders only when `digest` exists). Voice and register problems; nothing false or blocking, so craft.

#### UX-18 | Microcopy / brand | LOW | Old brand "RentMe" on every example card, detail page, the inbox and the people directory
- **WHAT IS WRONG:** The example lister's display name is "RentMe Example Collection" (handle `@example_collect`). `lib/legal/company.ts` rules RentMe "dead. Nowhere, in anything new".
- **WHERE:** `supabase/migrations/20260809080755_the_example_collection_is_listed_by_the_platform_not_by_a_person.sql:51,70,82`. Neither later "stops saying rentme" migration (20260915090000, 20260922130000) renames it.
- **EVIDENCE:** `fa-01-rent-results.png` "Listed by RentMe Example Collection, agent" on every card; `m-messages.png` inbox "RentMe Example Collection — Mini flat in Yaba"; `m-u.png`.
- **WHY IT MATTERS:** A second brand name on every card confuses people and looks unfinished to reviewers.
- **THE FIX:** Migration: `update profiles set display_name='Vallo examples' where id=<example lister>`, and the same for `auth.users.raw_user_meta_data`. Also rename the handle if it is visible.
- **EFFORT:** 30 minutes.
- **PASS TWO:** CONFIRMED — SEVERITY CHANGED MEDIUM→LOW. Live: every card on `/search?market=rent` reads "Listed by RentMe Example Collection, agent"; source migration `20260809080755_…:51,70,82`. No OPS finding to merge with (A09 and A01 mention it only as asides); UX-18 is the owning finding. Lower because it sits only on example rows, which should not be public at launch; still a 30-minute fix worth doing before review.

#### UX-19 | Back button | LOW | Sheets do not own history: browser/Android Back with a sheet open leaves the screen
- **WHAT IS WRONG:** Opening Add money (and other `Sheet`s) pushes no history entry, so Back skips the sheet and navigates away. The side FLIP uses replace, so Back cannot return to the previous side.
- **WHERE:** `components/ui/Sheet.tsx`; drawer flip in `components/app/flip/SideFlip.tsx`.
- **EVIDENCE:** `back.mjs`: `sheet open? 1 https://…/wallet` → `goBack` → `after back from open sheet -> about:blank dialog count 0` (the page was left, not the sheet closed; `bk-01-back-from-sheet.png`). `after flip /stays` → `goBack` → `about:blank` (the /home entry was replaced).
- **WHY IT MATTERS:** On Android, Back is the primary gesture. Users lose the page (and any half-typed amount) when they mean to close a sheet. In the Capacitor shell this becomes an app exit on the first screen. Native behaviour UNVERIFIED: I did not run the shell.
- **THE FIX:** (amended in pass two)
  - *Pass-one fix, retained:* On sheet open, `history.pushState({sheet:id})`; on `popstate` close the sheet; on programmatic close, `history.back()` if the sheet state is on top. Make the FLIP a `push`.
  - *Pass-two amendments:*
    - Keep the `pushState` approach for the web only, and do not double-handle Back inside Capacitor. Making the FLIP a push rather than a replace stands.
    - (A05, reviewing UI-18) Fix `Sheet` first, before porting the hand-rolled overlays to it, or every ported sheet inherits this bug.
- **EFFORT:** 4 hours.
- **PASS TWO:** CONFIRMED — SEVERITY CHANGED MEDIUM→LOW — fix amended. Live on the web: with "Add money" open on `/wallet`, Back left `/wallet` with 0 dialogs open, as described. The native claim is wrong: in the Capacitor shell, Android hardware Back is intercepted by `lib/native/back-button.ts` — `overlayIsOpen()` checks `document.body.style.overflow === "hidden"` (set by `use-overlay.ts:37` for every overlay) and dispatches Escape to close the top one — so Back does not exit the app or leave the page. What remains is browser-only (Android Chrome back gesture on the website/PWA).

#### UX-20 | Request an inspection | MEDIUM | The inspection sheet is hardcoded English, accepts past or 3 a.m. times, and never says whose time zone it uses
- **WHAT IS WRONG:** All copy is module constants (not the dictionary), so Yoruba, Hausa and Igbo users get English. `<input type="datetime-local">` has no `min`, no step and no hint about sensible hours. The note placeholder "Coming from Yaba, so late morning is easier" appears on every property wherever it is. 31 other components carry module-level English constants the same way (e.g. `components/host/HostWizard.tsx`, `components/supply/OwnerRegisterForm.tsx`, `app/agent/list/ListingWizard.tsx`, `components/app/assistant/AssistantChat.tsx`, `components/app/account/SupportChat.tsx`). The grep list is in my notes; each file was not individually confirmed user-facing.
- **WHERE:** `apps/web/src/components/app/inspections/RequestInspection.tsx:90-111, 157-172`.
- **EVIDENCE:** Code as quoted. The live flow could not be driven because example listings correctly hide the control ("Nothing here can be booked or paid for", `fe-01-rental-detail.png`).
- **WHY IT MATTERS:** This is the product's key trust step ("Talk first. Inspect before you pay"). A request for a past time or 2 a.m. gets a server refusal or an embarrassed agent.
- **THE FIX:** (amended in pass two)
  - *Pass-one fix, retained:* Move the strings to `t.inspections.*` in all four locales. Set `min` to now plus 2 hours (Africa/Lagos) and offer day chips plus Morning/Afternoon/Evening slots instead of a raw datetime. Use a neutral placeholder ("Anything the agent should know").
  - *Pass-two amendments:*
    - Add a server-side check that the requested time is at least now plus 2 hours (Africa/Lagos).
- **EFFORT:** 4-6 hours.
- **PASS TWO:** CONFIRMED (MEDIUM). Code: `RequestInspection.tsx:113-119` is a bare `type="datetime-local"` with no `min` and no `step`; `:159-172` are English module constants; `:165` has the placeholder "Coming from Yaba, so late morning is easier". Neither pass checked whether the server refuses a past time; the reviewer adds a server-side check to the fix.

#### UX-21 | Empty states | LOW | The empty-state system is good, with four wrong notes
- **WHAT IS WRONG:** Most empty states explain what, why and what to do (see Sound). The exceptions:
  - (a) "Browse real listings" on every example page → `/search`, which contains only examples (a loop).
  - (b) Rentals say "Nobody has stayed here through Vallo yet" (stay voice on a tenancy; `fe-01-rental-detail.png`).
  - (c) The `/inspections` header "Check the property, confirm details, submit your report." is inspector voice on the renter's list (`m-inspections.png`).
  - (d) Notifications "Find a place" CTA is fine, but Saved has a "Saved searches" link with no count (`m-saved.png`).
- **WHERE:** as cited.
- **EVIDENCE:** The texts are in the crawl outputs above.
- **WHY IT MATTERS:** Small confusions stack up.
- **THE FIX:** (a) While zero real listings exist, remove the "Browse real listings" CTA, or change it to "Get told when real homes arrive" (saved search). (b) Say "No reviews yet. Tenants can review after they move in." for tenancies. (c) Say "Your inspections — the times you asked for and the agent's answer".
- **EFFORT:** 1-2 hours.
- **PASS TWO:** CONFIRMED (LOW). "Browse real listings" loops back to example-only search, and the `/inspections` header "Check the property, confirm details, submit your report." appears live.

#### UX-22 | IA / home tiles | LOW | Home tiles that lie: "Invest" = Buy, "Manage" = become a supplier, "Nearby" = the social feed
- **WHAT IS WRONG:** The Property Home quick tiles are Buy → `/search?market=buy`, Rent, Manage → `/profile/setup`, and Invest → `/search?market=buy` (identical to Buy). The Stays Home tile "Nearby — Discover local" → `/around` (the social feed). The dock says "Feed" while the page title says "Around". The profile tab "Belongings" holds bookings, saved and wallet.
- **WHERE:** `components/app/home/HomeScreen.tsx:139-158`; stays home tiles; `en.ts:387`.
- **EVIDENCE:** `s9.mjs` home links: `Manage->/profile/setup | Invest->/search?market=buy`; `flowB.mjs`: `Nearby Discover local->/around`. Also the "Manage" tile icon renders as a faint empty ring (`m-home.png`).
- **WHY IT MATTERS:** Tapping a tile and getting something else teaches people not to trust tiles.
- **THE FIX:** Remove "Invest" until it filters something distinct (e.g. land plus sale with yield). Rename "Manage" to "List a property". Point "Nearby" at `/stays/search?near=me`, or rename it "Local talk". Use one name for the feed ("Around" or "Feed"), and rename "Belongings" to "Your things" or "Account".
- **EFFORT:** 1-2 hours.
- **PASS TWO:** CONFIRMED (LOW). Code: `HomeScreen.tsx:139` and `:158` point Buy and Invest to the same `/search?market=buy`; live, the dock label "Feed" goes to a page titled "Around". The "Invest" tile half overlaps STORE-21 (merged into STORE-05); kept here for the other tiles.

#### UX-23 | Cognitive load / jargon | LOW | One concept, eight names; supply jargon a Nigerian landlord would not use
- **WHAT IS WRONG:** Becoming a lister is called: Switch role, Switch profile, Add a workspace, Manage, Apply to list, Become an agent, "Register as a supplier or business", Personal Mode / Agent Mode, and the host flow "Become a host". Words like "supplier", "workspace", "Third party / Partner inventory", "Held payments", "pot / Set aside", "Flip" and "Band A" (well known in NEPA-speak, fine) are not how a first-time renter or landlord talks.
- **WHERE:** `/profile` ("Switch role"), ⇄ sheet, `/profile/setup`, `/agent/list`, `/host`; `en.ts` (19 "workspace", 2 "supplier").
- **EVIDENCE:** The screens `nav-02-switch-sheet.png`, `sup-profile_setup.png`, `sup-agent_list.png`, `sup-host.png`, and the profile row text "Switch role — Add an owner, agent or firm workspace".
- **WHY IT MATTERS:** People cannot find a feature whose name keeps changing.
- **THE FIX:** One verb, "List a property" (door) and "Your listings" (mode). Replace "supplier/workspace" with "listing account". Pick "Mode: Personal / Listing" for the switch.
- **EFFORT:** 2-3 hours of copy.
- **PASS TWO:** CONFIRMED (LOW). The copy inventory matches what the reviewer saw: Switch profile, Add a workspace, Manage, Apply to list, Become an agent/host, and "supplier".

#### UX-24 | Trust / privacy | CRITICAL | The people directory shows every new member's occupation and local government; sign-up said the LGA was for your home screen
- **WHAT IS WRONG:** `/u` "People who just arrived" lists real members with name, handle, occupation and LGA/state to any signed-in user. Sign-up asked for LGA with "Your local government decides which places your home screen opens on" and occupation with no disclosure that either becomes public. Privacy settings have no control for it (only "Hide my activity").
- **WHERE:** `apps/web/src/app/(app)/u/page.tsx:105`; `lib/social/people-queries.ts`; `en.ts:1199-1200` (placeNote).
- **EVIDENCE:** `m-u.png` (real members' names shown with occupation such as "Nurse", "Student", "Software Engineer" and LGA/state; I am not reproducing their identities here); `/settings/privacy` text: "Hide my activity — Keep your reviews and recent stays off your public profile." (nothing about occupation or location).
  - **Pass two (A06):** live as the QA member, `/u` "PEOPLE WHO JUST ARRIVED" lists real members with display name, handle, occupation and LGA/state (six rows seen; identities not reproduced). `/settings/privacy` offers only "Hide my activity". Sign-up says only "Your local government decides which places your home screen opens on" (`en.ts:1199`). By design the exposure is wider than one screen: migration `20260804152426_a_public_profile_can_say_who_and_where.sql` projects `occupation_code`, `lga_code` and `state_code` into `public.social_profiles` so others can see them; the select policy (`20260804115403…:186-188`) is `using (not private.blocked_with(user_id))` with no role restriction; `20260809044346…:34` states "`social_profiles_select` is granted to the `public` role" and `:48` says the table "is already readable … by the same anonymous role".
  - **Orchestrator catalogue evidence (read-only):** `has_table_privilege('anon','public.social_profiles','SELECT')` = true; anon holds column SELECT on `display_label`, `occupation_code`, `lga_code`, `state_code`, `home_area_id`, `bio`, `handle` (and more); policy `social_profiles_select` is `FOR SELECT TO public USING (NOT private.blocked_with(user_id))`; anon holds EXECUTE on `private.blocked_with`; the table has 10 rows, 7 of them not QA accounts, 9 with occupation or LGA set. An over-the-wire anon read was **not** performed (the permission policy blocked it in both pass two and the orchestrator's check).
- **WHY IT MATTERS:** What users were told is not true. Occupation plus LGA plus full name is enough to locate a person, and people with money on the platform are targets. NDPA purpose-limitation exposure. This goes to the privacy/security agent to verify the RLS and scope.
  - *Severity (orchestrator): CRITICAL — probable public exposure of members' names, occupations and home LGA to anyone holding the publishable key, which ships in every page. A06 had kept HIGH (LGA-level, no phone, email or address) pending proof of the anonymous read; the catalogue now shows every precondition for that read is in place. NDPA 2023 s.24/25 purpose limitation plus a transparency failure: data given for one stated purpose (home-screen location) is published for another, without notice or control.*
- **THE FIX:** (amended in pass two)
  1. `revoke select (occupation_code, lga_code, state_code, home_area_id) on public.social_profiles from anon;` (and consider the same for `authenticated`, since `/u` is gated anyway). First check every anon select of `social_profiles` in `apps/web/src` so no `select('*')` breaks.
  2. Add a privacy setting, "Show my area and occupation on my profile", off by default and applied in the projection trigger; backfill: hide the fields for all existing members until they opt in.
  3. Give notice at sign-up: rewrite the LGA/occupation note to say what is shown to others.
  4. Show only name and handle in the `/u` directory.
  5. Prove the fix with the anon read that could not be run: `GET /rest/v1/social_profiles?select=display_label,occupation_code,lga_code,state_code` with the publishable key must refuse the columns.
- **EFFORT:** 4-6 hours.
- **PASS TWO:** CONFIRMED — SEVERITY CHANGED HIGH→CRITICAL by the orchestrator — fix amended. A06 (pass two) confirmed the directory live and traced the migrations that make `social_profiles` readable by the public role, keeping HIGH until the anon read was proven. The orchestrator then read the catalogue: `has_table_privilege('anon','public.social_profiles','SELECT')` = true; anon holds column SELECT on `display_label, occupation_code, lga_code, state_code, home_area_id, bio, handle` (and more); policy `social_profiles_select` is `FOR SELECT TO public USING (NOT private.blocked_with(user_id))`; anon holds EXECUTE on `private.blocked_with`; 10 rows, 7 not QA accounts, 9 with occupation or LGA set. Over-the-wire anon read NOT performed (permission policy blocked it). CRITICAL: probable public exposure of members' names, occupations and home LGA to anyone with the publishable key, which ships in every page.

#### UX-25 | Honesty / emails | MEDIUM | Auth email templates make claims that are false today
- **WHAT IS WRONG:** The confirmation and invite emails say "Every listing was put up by a real person on Vallo. Nothing is imported from an outside feed, so there is always somebody to message." All 64 listings are examples from one platform account. The invite also says "Browse as much as you like before you tell anybody anything about yourself", but browsing is gated behind sign-up (UX-01).
- **WHERE:** `supabase/templates/confirmation.txt`, `invite.txt` (and the matching `.html`).
- **EVIDENCE:** The template text is read verbatim above.
- **WHY IT MATTERS:** The first email a new user gets contradicts what they see on their first screen.
- **THE FIX:** (amended in pass two)
  - *Pass-one fix, retained:* Replace it with "Every listing on Vallo is put up by a person we can reach; examples are marked Example." Drop the browse-freely sentence while the wall exists.
  - *Pass-two amendments:*
    - Confirm which templates are live (Supabase → Auth → Email Templates) and change both the repository copies and the live ones.
- **EFFORT:** 30 minutes plus a Supabase template redeploy.
- **PASS TWO:** CONFIRMED (MEDIUM) — fix amended (confirm which templates are live). Files confirmed: `supabase/templates/confirmation.html:90` / `.txt:20`, `invite.html:74,91` / `.txt:15,27`. Caveat: these are the repository copies; whether the live project uses them or dashboard-edited templates was not verified.

#### UX-26 | First run | HIGH | App Store / Google Play badges on the landing link to the web intro, not the stores

**App Store / Google Play badges on the landing link to the web intro, not the stores.** The same finding as A08's STORE-06 and A06's UI-07. The pass-two reviewer (A06) merged it and noted that pass one's LOW understated it: the badges render in the native iOS shell for signed-out users ("GET IT ON Google Play" inside an iOS app, Apple 2.3.10), so it carries STORE-06's HIGH. STORE-06 now carries an "Also reported as UX-26" line (badge terms require linking to the store listing; hide until the store URLs exist).

- **PASS TWO:** MERGED INTO STORE-06 (canonical severity HIGH; pass one had LOW).

#### UX-27 | Waiting / error recovery | LOW | A failed JS chunk gets "Try again", which cannot recover it (the CSP half is merged into OPS-15)
- **WHAT IS WRONG:** On `/`, `/welcome` and others, Chromium logs `Refused to load the script '…/_next/static/chunks/11-v4cdswovuj.js' because it violates … "script-src 'self' https: 'nonce-…' 'strict-dynamic'"`. The HTML carries `<script src="/_next/static/chunks/11-v4cdswovuj.js?dpl=…" async="">` with no nonce. The chunk contains `useMergedRef` and friends. Separately, when any chunk fails (common on Nigerian mobile data), the route boundary shows "This screen did not load … Try again", and `reset()` does not refetch a failed chunk.
- **WHERE:** CSP in `apps/web/src/proxy.ts` (`withSecurityPolicy`); `app/error.tsx`.
- **EVIDENCE:** `s4.mjs` console output, quoted. `curl -s …/welcome | grep -o '<script[^>]*11-v4cdswovuj[^>]*>'` → `<script src="/_next/static/chunks/11-v4cdswovuj.js?dpl=dpl_7tf6nMQVEPdFt8ffUhQ8yUpQyGXj" async="">`. The functional impact is UNVERIFIED: the pages I used still hydrated and worked, so the chunk may be a duplicate that is also loaded another way. Cross-reference for Agent 6 (render) and the security agent.
- **WHY IT MATTERS:** If a feature depends on that chunk, it silently fails in production. Chunk-load failures leave the user on a dead "Try again".
  - *Pass two: the CSP half (nonce-less `11-v4cdswovuj.js`) is the same finding as OPS-15 and UI-12 and is merged into OPS-15 (LOW; all 10 module ids are also present in another loaded chunk, so no functional loss). What stays here is the error-boundary half, a separate LOW: when a chunk fails (common on Nigerian mobile data), the route boundary's "Try again" calls `reset` only (`app/error.tsx:56`), which cannot refetch a failed chunk.*
- **THE FIX:** (amended in pass two)
  1. In `app/error.tsx`, detect `error.name === "ChunkLoadError"` or a message matching `/Loading chunk|dynamically imported module/`, and make the primary button call `location.reload()`.
  2. The CSP half's fix lives in OPS-15. Pass one's CSP suggestion ("pass the nonce to `<Script>`/`next/script`") would do nothing: no `next/script` is used and the tag is Next's own chunk.
- **EFFORT:** 2-4 hours.
- **PASS TWO:** SPLIT. CSP half MERGED INTO OPS-15 (known duplicate; OPS-15 carries an "Also reported as UX-27" line). Error-boundary half CONFIRMED — SEVERITY CHANGED MEDIUM→LOW — fix amended: `app/error.tsx:56` wires "Try again" to `reset` only. The reviewer's own pass one had also confirmed the browser never retries the refused chunk (`FAIL csp`).

#### UX-28 | Craft | LOW | Small inconsistencies on flow screens
- **WHAT IS WRONG:**
  - (a) `/profile/setup` draws two stacked back controls (a bare arrow and a boxed arrow; `ch-stays-chooser.png`, link dump `Back->btn | Back->btn`).
  - (b) Checkout shows ISO dates "2026-10-10" after the stay page showed "Sat 10 Oct" (`bb-02-checkout.png`).
  - (c) Sign-in answers a short password with "Use at least 8 characters", which is a sign-up rule on a sign-in form (`err.mjs`).
  - (d) Settings shows "84 devices" and Privacy shows "86 signed in" for one person. Every sign-in is a new device row. Inflated here by the audit's own sign-ins, but a real user who signs in on the web weekly will see scary numbers.
  - (e) The owner form draws "Optional" as a separate line under "Phone number *" (it belongs to NIN; `sup-profile_setup_owner.png`).
- **WHERE:** Not stated separately in pass one.
- **EVIDENCE:** Not stated separately in pass one.
- **WHY IT MATTERS:** Craft.
- **THE FIX:** (a) Remove the duplicate back. (b) Use `formatDate` at checkout. (c) Skip the length rule on sign-in and just answer "email and password do not match". (d) Group sessions by device and user agent. (e) Put the Optional chip in the NIN label row.
- **EFFORT:** 2 hours total.
- **PASS TWO:** CONFIRMED (LOW). Live: (a) `/profile/setup` has two Back buttons, at y=92 and y=124; (b) checkout shows `Check in 2026-10-10 Check out 2026-10-12` (ISO dates); (d) `/settings/privacy` shows "88 signed in" (up from 86, the audit's own sessions). (c) and (e) were not re-checked.

#### NEW IN PASS TWO

#### UX-P2-01 | Privacy / honesty | HIGH | "Download my data" downloads nothing and says Vallo holds nothing about you off the device
- **WHAT IS WRONG:** Settings → Privacy & Security → "Download my data — A copy of everything Vallo holds about you." Tapping it downloads no file. Instead it shows: "Right now everything Vallo knows about you lives in this browser, and nothing has left this device. Full data export ships with the launch release." That is false. Vallo stores the member's account, name, email, phone, occupation, LGA, wallet ledger, sessions and ID documents server-side. Some of these are even public (UX-24).
- **WHERE:**
  - `apps/web/src/components/app/account/SettingsGroups.tsx:403-408`: `onClick={() => setExportNote(true)}` and nothing else.
  - `packages/i18n/src/locales/en.ts:1580-1583`: `exportNote`, `download`, `downloadSub`.
  - Live at https://www.vallospaces.com/settings/privacy.
- **EVIDENCE:** `p2c.mjs` as the QA member: `download btn 1` → `file downloaded? false`. The page then shows "Right now everything Vallo knows about you lives in this browser, and nothing has left this device. Full data export ships with the launch release." Screenshot: `p2-download-my-data.png`.
- **WHY IT MATTERS:**
  - A false statement about data handling sits on the privacy screen.
  - The NDPA 2023 right of access (s.34) has no working path; this relates to OPS-12, "no subject-access or data-export path". The control exists, but it is a placebo that misinforms.
  - Apple 5.1.1 and Play User Data policy require accurate privacy disclosures.
  - The app is heading to store review, so "ships with the launch release" is now.
- **THE FIX:**
  - Immediately: change the note to "We will email you a copy of your data within 30 days. Request it here." Wire it to the support form with a `data_access_request` category, and record the request with a timestamp.
  - Properly: build a server route that assembles `profiles`, `social_profiles`, `wallet_entries`, bookings, conversations and messages, verification rows (metadata only) and sessions into a JSON zip for the signed-in user.
  - Remove the "lives in this browser" sentence in all four locales.
- **EFFORT:** 1 hour for the honest interim; 2–3 days for a real export.
- **PASS TWO:** NEW IN PASS TWO (found by the reviewer, A06). `p2c.mjs` as the QA member: `download btn 1` → `file downloaded? false`, then the "lives in this browser" note (`p2-download-my-data.png`). Related: OPS-12 (no subject-access or export path — still stands; this control is a placebo, not an export path), STORE-08 (privacy disclosures).

#### UX-P2-02 | Security claim / honesty | HIGH | "Biometric app lock" is a switch that does nothing
- **WHAT IS WRONG:** `/settings/privacy` shows the toggle "Biometric app lock — Ask for fingerprint or face unlock when the app opens, on devices that support it." It saves `appLock` to the local settings store, and nothing reads it. There is no biometric plugin, no lock screen, and no use of the value anywhere. A user who turns it on believes their wallet is behind Face ID or a fingerprint. It is not.
- **WHERE:**
  - `apps/web/src/components/app/account/SettingsGroups.tsx:352-356` (`set("appLock", next)`).
  - `components/app/account/settings-store.ts:34,58`.
  - `packages/i18n/src/locales/en.ts:1498-1500`.
- **EVIDENCE:**
  - `grep -rn "appLock" apps/web/src` returns only the store definition, its default, and the toggle. There are no readers.
  - `grep -rln biometric apps/web/src` returns only `components/verification/kyc.ts` (KYC copy).
  - `package.json` has no biometric Capacitor plugin (a grep for `biometric` or `native-biometric` in the manifests found nothing).
  - Live switch state read by `p2c.mjs`: `'Biometric app lock Ask for fingerprint o=false'`, a working toggle.
- **WHY IT MATTERS:** A security control that silently does nothing, sitting beside the line "Your wallet sits behind this account", is a false security claim under the claims rule. Apple 2.3.1 and Guideline 1.x cover apps that misrepresent functionality. It is also a real risk to a user who relies on it and lends their phone.
- **THE FIX:** Remove the row now. If it is wanted later, implement it with a native biometric plugin: gate on app resume in `lib/native/boot.ts`, hide the row on the web, and store the preference server-side or in secure storage.
- **EFFORT:** 15 minutes to remove; 1–2 days to build.
- **PASS TWO:** NEW IN PASS TWO (found by the reviewer, A06). `grep -rn "appLock" apps/web/src` → only the store definition, its default and the toggle; no biometric plugin in the manifests; the live switch toggles (`'Biometric app lock Ask for fingerprint o=false'`). Related: STORE-04 (biometric wallet lock is one of the suggested native capabilities).

#### UX-P2-03 | Messaging | LOW | Tapping "Message" creates a conversation on page load (GET), so empty threads pile up in both inboxes
- **WHAT IS WRONG:** `/messages/new?listing=X` calls `startConversation()` while rendering the page and inserts a `conversations` row before the person types anything. Every "Message" tap that is abandoned leaves an empty thread in the guest's inbox and in the agent's inbox. The QA member's inbox already shows one: "RentMe Example Collection — Mini flat in Yaba — No messages yet". The daily new-conversation rate limit is consumed by page views.
- **WHERE:**
  - `apps/web/src/app/(app)/messages/new/page.tsx:105-108`.
  - `lib/messages/actions.ts:176-199` (insert).
  - Linked from `listing/[id]/page.tsx:285`, `RentalPanel.tsx:144`, `ChatCard.tsx:197,283`, `Feed.tsx:337`, and the stay host card (`/messages/new?listing=ea…01`, seen live).
- **EVIDENCE:** code as cited. The live member inbox shows the empty thread (my pass-one snapshot: "Inbox … R RentMe Example Collection Mini flat in Yaba No messages yet").
- **WHY IT MATTERS:** Agents see ghost enquiries. Guests see threads they never started. It is also a state change on GET: link unfurlers or any future prefetch could create rows.
- **THE FIX:** Render a draft thread view for `/messages/new?listing=X` without inserting. Create the conversation in the send-message action on the first message. Hide conversations with zero messages from both inboxes.
- **EFFORT:** 3–4 hours.
- **PASS TWO:** NEW IN PASS TWO (found by the reviewer, A06). Code as cited (`app/(app)/messages/new/page.tsx:105-108`, `lib/messages/actions.ts:176-199`); the QA member's live inbox shows the empty thread "RentMe Example Collection — Mini flat in Yaba — No messages yet". Related: SEC-P2-02 (threads can be opened to any user over PostgREST), STORE-P2-04 (must be tested before pages are public).

#### NAVIGATION MODEL (carried from pass one)

```
HEADER (every in-app page): [≡ drawer] [VALLO → /home or /stays] ........ [bell → /notifications] [avatar → /profile]

DOCK (5 slots, labels visible)
  Property side:  Home(/home)  Search(/search)  [⇄ "Switch profile: Personal" sheet]  Feed(/around)  Profile(/profile)
  Stays side:     Stays(/stays) Search(/stays/search) [⇄ same sheet]                  Feed(/around)  Profile(/profile)
  Signed out: no dock (every app route is gated).

⇄ SHEET: "Switch profile" → Personal ✓ | "Add a workspace — Register as a supplier or business" (/profile/setup)

DRAWER (≡), property side: profile card(View profile) · Home · Search · Feed · Bookings · Inspections · Messages ·
  Notifications · Saved · Wallet · AI Assistant · Add a workspace · Settings · [FLIP card "Switch to Stays"]
  Stays side swaps Bookings/Inspections for Trips. NO Help row on either side.

PROFILE: Belongings tab → My Bookings(/bookings) · Saved · Wallet · Inspections · Switch role(sheet) · Edit profile ·
  Your public page · ... · Messages("Chats with hosts") · Notifications · Help("Get an answer from a person" → /help FAQ site page)
```

Screens you can reach but not find (no inbound link in the app UI, confirmed by grep): `/price` (Price Check, the most useful renter tool), `/escrow` (Held payments), `/wallet?action=withdraw`, `/crypto` (404 "This page has checked out", yet it is still in `TAB_BAR_ROUTES`, MobileTabBar.tsx:120), `/host` (reachable only through the stays-side chooser → `/host/apply`), and `/agent/*` for a personal member (renders the full agent console, see UX-11).

Dead ends: "Browse real listings" (on every example page) → `/search`, which holds only examples. Stay "Pick your dates" → `/stays/search`, which has no date field (UX-08). Checkout for a non-bookable stay (UX-09). The Stays home "Nearby — Discover local" tile → the social feed.

##### Tap counts (member, from /home unless noted)

| Task | Taps (observed) | Notes |
|---|---|---|
| Stranger: from landing to seeing any listing detail | ≥ 25 plus an email round trip | Explore (1) → carousel Get Started/Next/Next (4) → Create account (5) → email + Continue (6) → 9-field form (~15) → code from email → lands on **/home**, not what they tapped (UX-01, UX-02) |
| Find a flat to rent | 1 to results, but the first 3 results are nightly stays | Rent tile → `/search?market=rent`: 52 results incl. hotel rooms and a restaurant; chip says "Any market" (UX-07) |
| Book a stay | ~12 (ideal 5) | ≡ (1) → Switch to Stays (2) → hotel (3) → Pick your dates (4) **leaves the hotel** → Filters (5) → dates (6-9) → apply (10) → find the hotel again (11) → Book now (12) (UX-08) |
| Request an inspection | 3 to the sheet + date/time + send ≈ 7 | Not walkable live: examples hide the control. This is correct. Read from code (UX-20) |
| List as an owner | Profile → Switch role → "I own the property" → Continue → "What we will ask" Continue → 4-step form = 5 taps to step 1 | **Only if the hidden side is Property**; on Stays the owner card does not exist (UX-05) |
| List as an agent | 5 as above; "Become an agent" on /agent/list leads to the **owner** form (UX-11) | |
| Pay for something (top up) | Wallet (2 via drawer or profile) → Add money (3) → amount → Continue to payment (Paystack) | Stopped before Paystack. Wallet is not in the dock |
| Withdraw | impossible from the UI | No control; only `?action=withdraw` (UX-13) |
| Get help when confused | Profile → Help = 2, and it lands on the marketing FAQ; Settings → Help & Support → Open chat = 3, and that is an AI | No Help in the drawer (UX-15) |

#### CHECKED AND FOUND SOUND

- **Founder vocabulary rulings.** `grep -rniE "viewing|look around|look-around"` over `apps/web/src`, `packages/i18n/src` and `supabase/templates` found no user-facing hit. The only hits are enum values (`viewing_attended`, `viewing_missed`) whose labels read "The inspection happened / did not happen" (`en.ts:3766-3767`, `lib/escrow/copy.ts:370-371`), a variable name in `lib/email/messages.ts:764`, and a code comment (`en.ts:91`). "Inspection" is used consistently.
- **Email voice.** A grep for "the user / the guest / the tenant / they will / their booking" in `lib/email` and `supabase/templates` found only doc comments, one fixture (`fixtures.ts:161`, not a production string), and second-person sentences that name the *other* party ("while the host reviews your request"). All user-facing strings address the recipient as "you". Sound.
- **Auth autocomplete and password managers.** Sign-in uses `email`/`current-password`. Sign-up uses `given-name`, `family-name`, `nickname`, `email`, `new-password` ×2. Reset uses `new-password` ×2. Forgot uses `email`. The OTP field is `type=text inputmode=numeric autocomplete=one-time-code` with no maxlength, so paste works and a surplus is explained. Contact form: `name`, `email`. Owner and agent phone: `type=tel inputmode=tel autocomplete=tel`. Wallet amount: `inputmode=decimal`.
- **Sign-in errors** are plain and fixable: empty → "Enter your email address. / Enter your password."; wrong → "That email and password do not match. Check them and try again." The email is kept (`er-01…`, `er-02…`). Throttle messages give a time.
- **Double submit.** `Button` sets `disabled={disabled||loading}` and `aria-busy` (`components/ui/Button.tsx:278-280`). All auth and money forms pass `loading={pending}`.
- **Names.** Sign-up accepts `Ọlábísí-Adé` and `O'Neil Nwachukwu-Okonkwo` (diacritics, hyphen, apostrophe, spaces): no character rules, only 80 characters max (`lib/auth/actions.ts:92-96`). Minor point for the founder: "Surname" is required, so a mononymous person must invent one.
- **Nigerian phone validation** (`lib/phone.ts`): accepts `+234`, `234`, leading `0`, spaces; requires 10 national digits starting 7/8/9; carrier prefixes for MTN/Glo/Airtel/9mobile/Smile/ntel. Only the input's maxlength is wrong (UX-12).
- **Nigerian addresses.** The listing wizard asks State (select) → City → Area ("Lekki Phase 1") → Address ("12 Admiralty Way", private until confirmed) → Landmark ("Opposite the Lekki roundabout"). No postcode anywhere. Firm uses a single "Office address". Sign-up and Price Check use State → LGA. This fits Nigerian practice.
- **Example gating on property listings.** `/listing/ed…2b` shows the example banner, hides Request inspection and payment, and says "Nothing here can be booked or paid for" (`fe-01-rental-detail.png`). The server refuses too (`lib/inspections/actions.ts:88` `is_demo → EXAMPLE_LISTING_MESSAGE`).
- **Money cannot move on example stays.** Checkout for example hotel `ea…01` shows "Vallo cannot hold this room … nothing has been held and nothing has been charged", with no pay control (`bb-02-checkout.png`). The UX is late (UX-09), but it is safe.
- **Move-in cost transparency** on rentals is very good: an itemised rent, agency, legal, agreement, caution and service charge list, with who each is paid to, and a total (`fe-01b-rental-detail-full.png`).
- **Top-up sheet** is honest about the provider: "By card or bank transfer through a secure Paystack window, or with a card you have already saved." It has quick amounts, and the button says "Continue to payment", not "Pay" (`fw-01-add-money.png`).
- **Most empty states** say what, why and what to do: Notifications ("You are all caught up … land here the moment they happen" + Find a place), Saved ("Tap the heart on any card…"), Bookings, Trips, Inspections, Wallet ("Nothing has moved through your wallet yet. Add money and it appears here."), Held payments, and the public profile ("Nothing here yet … Add your bio").
- **Server speed.** `curl` TTFB: `/` 0.92 s, `/help` 0.29 s, gated redirects 0.17-0.54 s. Long browser times in this report come from the sandbox proxy.

#### CORRECTLY EMPTY vs BROKEN

| Screen (QA member) | State | Verdict | Reason |
|---|---|---|---|
| /bookings | "Nothing booked yet" | CORRECTLY EMPTY | zero bookings exist; copy is stay-flavoured (UX-16) |
| /trips | "No trips yet" | CORRECTLY EMPTY | zero reservations |
| /inspections | "Nothing booked to see yet" | CORRECTLY EMPTY | examples cannot be inspected |
| /notifications | "You are all caught up" | CORRECTLY EMPTY | |
| /saved | "Nothing saved yet" | CORRECTLY EMPTY | the QA member has no saves |
| /wallet recent transactions | "Nothing has moved…" | CORRECTLY EMPTY | zero ledger rows for the member |
| /escrow | "Nothing is set aside" | CORRECTLY EMPTY | zero escrows ever |
| /messages | 1 thread "RentMe Example Collection — No messages yet" | CORRECTLY EMPTY-ish | a thread shell created by an earlier QA run with no message; brand wrong (UX-18) |
| /agent/dashboard (personal member) | "You are not listing yet" plus active action tiles | BROKEN | a personal member should not be in the console, and the tiles lead to empty agent screens (UX-11) |
| /crypto | 404 "This page has checked out" | CORRECTLY EMPTY (feature off) | but still listed in `TAB_BAR_ROUTES` |
| /search, /stays/search | 64 / 69 example results | CORRECT | all inventory is examples; ordering puts nightly stays under "Rent" (UX-07) |
| "Browse real listings" CTA | → the same examples | BROKEN (loop) | UX-21a |

*Pass-two note:* the `/messages` thread shell ("No messages yet") is explained by UX-P2-03: opening "Message" creates a conversation on page load.

#### NOT COVERED

- The **Capacitor shell** (Android hardware back, iOS swipe-back, native sheets, push prompts). Everything here is the web origin in mobile Chromium, not WebKit.
- **Real sign-up submit and email OTP** (instructed not to create an account). The post-verify landing was read in code (`/home`, UX-02). The QA member's first-run "question" beat (interests) was not seen, because the member had already passed it.
- **The QA admin account**: I did not sign in as admin. The admin console UX is not assessed.
- **Paystack window, card save, the wallet send flow to another wallet, and refunds**: stopped before any money screen beyond the Add money sheet. The withdraw sheet (`?action=withdraw`) was not opened.
- **Live inspection request, messaging an agent, and agent inspection confirmation**: blocked by example-only inventory. Read from code only.
- **YO/HA/IG locales**, screen reader, dynamic type and dark/light: only spot-checked through code (UX-20).
- **Two tabs of the same flow**, live: the shared-cookie consequence (a flip in one tab changes the other's next navigation) follows from `document.cookie` path `/` (`side.constants.ts`) and was not driven live.
- **Refresh after POST**: server actions post via fetch, so there is no browser resubmit prompt. I did not verify what state survives a reload mid-form beyond UX-14.
- **The AI assistant's answer quality**, and the support chat's hand-off to a person.
- **Owner/agent/firm/host forms past step 1**: seen, but I submitted nothing, so step 2-4 validation copy was not read.
- **Timing of waits** (spinners, `MoneyWait`, optimistic UI) under real mobile networks: sandbox network timings are not representative.

**Pass two (A06) did not cover:**

- UX-14 and UX-28(c)/(e) were not re-driven live.
- The inspection flow cannot be driven with example-only stock.
- The native shell was not run: UX-19's native half was judged from `back-button.ts`.
- UX-24 anonymous PostgREST proof is left to the security agent (see above).

**Also missed by pass one, already filed elsewhere (per A06):** Profile "Reviews" row → 404 (UI-02); a first visit to `/sign-in` goes through the carousel and unknown signed-out URLs ask for sign-in (UI-20, OPS-17); home hero Filters clipped and spec tiles breaking mid-word (UI-05, UI-06); a "Download my data" control exists but is a placebo (UX-P2-01), so OPS-12 still stands.

#### FOR THE FOUNDER

1. **The sign-in wall (UX-01).** Keep "nothing visible without an account", or open read-only browsing? It is the biggest lever on first-run conversion and a live App Store 5.1.1 risk. If you keep it, accept a likely review round-trip and make the demo account prominent in the review notes.
2. **What is "the switch"? (UX-06).** Should the centre dock button flip Property↔Stays (what the onboarding teaches), with the personal/working mode on the avatar? Or the reverse, with labels?
3. **Examples on the landing (UX-03).** Label them "Example", or show no listings until real ones exist?
4. **Withdraw copy until the Paystack upgrade (UX-13).** Approve interim wording, and decide how a user with a balance deletes their account in the meantime (refund via support?).
5. **The people directory (UX-24).** Should occupation and LGA ever be public? Default recommendation: private, opt-in.
6. **One name for "becoming a lister" (UX-23)** and one for the feed ("Around" vs "Feed").
7. **Surname required.** Allow a single-name registration ("I only use one name")?
8. **Store badges (UX-26)**: supply the App Store and Play URLs once they exist.

Data I created or touched on the live system: several new sessions on the QA member (the device counts rose from 71 to 86 across all agents, part of that mine); one deliberately failed sign-in (wrong password) for the QA member; one refused sign-up attempt for `<the founder's Gmail mailbox (redacted in merge)>`, refused by validation before `auth.signUp`, so no account exists. The `nf_side` cookie changes lived only in my throwaway browser contexts. No saves, messages, pots or money actions.

*Pass-two/orchestrator notes:* item 1 (the wall) is now tracked as STORE-P2-04; item 3 as STORE-05; item 4 as MON-04; item 8 as STORE-06; item 5 (the directory) is now CRITICAL (UX-24) — at minimum revoke anon access to occupation, LGA, state and home area now.

#### CLEANUP NOTES

- Pass one (A05): several new sessions on the QA member (device counts rose from 71 to 86 across all agents, part of that A05's); one deliberately failed sign-in (wrong password) for the QA member; one refused sign-up attempt for a plus-addressed variant of the founder's mailbox (redacted here), refused by validation before `auth.signUp`, so no account exists. `nf_side` cookie changes lived only in throwaway browser contexts. No saves, messages, pots or money actions.
- Pass two (A06): only sessions on the QA member ("88 signed in" at review time); no messages, sign-ups or other records.

---

### A06 — THE INTERFACE, SCREEN BY SCREEN, SIGNED IN: merged pass one + pass two

Sources: `pass1/A06-interface.md` (Agent 6; 127 non-dev routes opened live at 390, 768 and 1280px — about 540 page loads — as the QA member, the QA admin and signed out, with a scripted shape/touch/colour/overflow/claims sweep; screenshots in `scratchpad/work/A06/shots/`, Playwright session files deleted) and its pass-two review `pass2/R-A06-by-A05.md` (Agent 5; re-measured at 390px as the QA member and signed out; no QA admin session, so admin-only claims were checked in code or taken from pass one).

Pass-two tally: confirmed 13 (8 unchanged; 5 with a severity change or amended fix); severity changed 6 (UI-07 CRITICAL→HIGH, UI-04 HIGH→MEDIUM, UI-02 HIGH→MEDIUM, UI-01 MEDIUM→LOW, UI-12 MEDIUM→LOW, UI-18 MEDIUM→LOW); merged 4 (UI-07 → STORE-06, UI-04 → ESC-13, UI-12 → OPS-15, UI-20 carousel half → STORE-P2-04 via UX-01); fix amended 6; withdrawn 0 (one sub-claim of UI-09 dropped); new 3. The route table's status and final-URL columns are reliable; 6 of 10 sampled notes were wrong.

#### DANGER NOW

Pass one: "No DANGER NOW items from this area." Pass two found nothing that changes this.

#### FINDINGS (pass one, with pass-two verdicts)

#### UI-07 | Interface / Store | HIGH | App Store and Google Play badges on the landing page link to sign-up and render inside the native app

**App Store and Google Play badges on the landing page link to sign-up and render inside the native app.** Re-measured by the pass-two reviewer (A05): signed-out `/` returns `{"badges":["Download on the App Store->/start","GET IT ON Google Play->/start"], "points":["Full access to all features","Secure and fast"]}`. The same defect as A08's STORE-06 (confirmed HIGH by A03) and A05's UX-26, and merged into STORE-06. The reviewer lowered it CRITICAL→HIGH: a 2.3.10 rejection here is a one-hour fix and a resubmit, not lost money, exposed data or a structural refusal, and its premise (the shell opening on `/`) is already STORE-04's start-path change. STORE-06 now carries an "Also reported as UI-07" line with this finding's evidence and its fix addition: render each badge only when its store URL is set, render neither on a native platform, and delete the unbackable claims "Full access to all features" and "Secure and fast".

- **PASS TWO:** MERGED INTO STORE-06 — SEVERITY CHANGED CRITICAL→HIGH — fix amended (the claim deletions are added to STORE-06). Canonical severity HIGH.

#### UI-04 | Claims | MEDIUM | The Terms say Vallo never holds money in escrow; the product holds money in escrow

**The Terms say Vallo never holds money in escrow; the product holds money in escrow.** The same contradiction as A02's ESC-13, merged there. The pass-two reviewer (A05) re-measured `/escrow` live ("Held payments | Nothing is set aside | … you can set the money aside until the work is done. It stays out of both balances until then.") and lowered it HIGH→MEDIUM: `custodySentence()` returns null and `CUSTODY_STRUCTURE="undecided"`, so the held-payments gate is closed and the Terms statement is true **today**; the member-facing contradiction is an empty-state sentence about a feature that cannot be used; the admin lede "Secure transactions. Fair outcomes." is staff-only and was not re-verified as admin. ESC-13 now carries an "Also reported as UI-04" line with the fix addition: while the gate is closed, the `/escrow` empty state must say "Held payments are not open yet", and "Secure transactions. Fair outcomes." (`en.ts:3930`) goes.

- **PASS TWO:** MERGED INTO ESC-13 — SEVERITY CHANGED HIGH→MEDIUM. Canonical severity MEDIUM (ESC-13).

#### UI-03 | Claims | HIGH | "Verified" is promised on first screens while every live listing is an unverified example
- **WHAT IS WRONG:** All 64 published listings are examples. Each example's own page says "This is an example listing… Vallo has not verified anything on this page." Yet these surfaces promise verification:
  - Landing page: "Verified homes, land, hotels and shortlets across Nigeria" (en.ts:533).
  - Home hero, the first screen after sign-in: "Rent, buy or invest in verified properties across Nigeria" (en.ts:5388).
  - `/rent`: "Verified listings only" and "Listings and agents are verified before they go live" (`app/(app)/rent/page.tsx:68,88`). Yet `/rent` lists example rentals such as `/listing/ed…2b`, whose page says "Vallo has not verified anything".
  - The agent pitch, shown on 10 `/agent/*` routes to non-agents: "Verified supply only", "Chats, inspections and payments stay on the platform, where they are protected" (en.ts:2439-2446).
  - "Track earnings and get paid securely" (en.ts:1971), although third-party payouts cannot run on the current Paystack plan.
- **WHERE:** See the paths above. Live on `/`, `/home`, `/rent` and `/agent/list` (and nine other agent routes as the QA admin account).
- **EVIDENCE:** Claims captured by the walker:
  - `/home`: `['Rent, buy or invest in verified properties across Nigeria']`
  - `/rent`: `['Verified listings only', 'Deals made outside the platform are not protected by us', 'Listings and agents are verified before they go live, and the whole conversation stays inside Vallo']`
  - `/listing/ed000000-…-000000000004`: `['Vallo has not verified anything on this page']`
  - Screenshots: `listing-top.png`, `member-390-rent.png`, `admin-390-agent_list.png`.
- **WHY IT MATTERS:** This breaks the claims rule. The screens contradict each other, and Apple 2.3.1 covers misleading marketing. The mechanism exists for real listings (admin review plus identity checks) but not for the stock actually on screen.
- **THE FIX:** (amended in pass two)
  - *Pass-one fix, retained:* Make the word conditional on the data. Say "verified" only when the listing or supply shown carries the verified mark. Otherwise use "Listings are reviewed by a person before they go live; examples are marked." For the pitch, change "where they are protected" to "where there is a record". Change "get paid securely" to "see what you are owed". Remove "verified" from en.ts:533 and en.ts:5388 until real verified stock exists.
  - *Pass-two amendments:*
    - "Show 'verified' only when the row says so" is unsafe until DB-01 is fixed: any member can self-publish a business at `verified=true` / tier 3. List DB-01 (and DB-02) as a precondition. In the meantime, delete the word rather than make it conditional.
    - Drop "real" from "Homes for real rent" on `/rent` while the stock is examples.
- **EFFORT:** 2 hours.
- **PASS TWO:** CONFIRMED (HIGH), PARTLY MERGED — fix amended. The landing lede ("Verified homes…", `en.ts:533`) and the home hero ("verified properties", `en.ts:5388`) are STORE-05 (and UX-03) and go there (STORE-05 carries an "Also reported in part by UI-03" line). What stays here, re-verified live: `/rent` h1 "Rent" — "Homes for real rent, priced per year. Message the agent, inspect the property, then pay. Verified listings only." over example-only stock ("real rent" is a second false word), and the agent pitch "Chats, inspections and payments stay on the platform, where they are protected" (`en.ts:2445`, seen on `/agent/list`).

#### UI-02 | Navigation | MEDIUM | Profile → "Reviews" leads to a 404
- **WHAT IS WRONG:** The Activity group on `/profile` has a "Reviews" row linking to `/reviews`. No `/reviews` route exists, so tapping it lands on "404 This page has checked out".
- **WHERE:** `apps/web/src/app/(app)/profile/AccountBody.tsx:299-304` (`href="/reviews"`). No `app/**/reviews/page.tsx` exists outside `/agent/reviews` and `/bookings/[id]/review`.
- **EVIDENCE:** `rv.mjs`: `reviews links on /profile: 1` → `landed https://www.vallospaces.com/reviews This page has checked out`. The walker shows `/reviews [404]` for the member at 390, 768 and 1280. Screenshots: `profile-reviews-tap.png`, `member-390-reviews.png`.
- **WHY IT MATTERS:** Every signed-in user sees this row on their own profile, and it dead-ends.
- **THE FIX:** Point the row at a real surface: the member's reviews written or received, or `/bookings?tab=completed` with the review prompts. Otherwise hide the row until that surface exists. Add `/reviews` to the route-parents or nav proof so a dead `href` fails CI.
- **EFFORT:** 30 minutes to hide; about a day to build a reviews list.
- **PASS TWO:** CONFIRMED — SEVERITY CHANGED HIGH→MEDIUM. Re-measured: `links to /reviews on /profile: 1`, then `/reviews status 404 … This page has checked out` (href at `AccountBody.tsx:300`). One row in a secondary group; the user reaches a clean 404 with "Back to home" and nothing else breaks. The fix is correct. Correction to the route table: anon `/reviews` gets a 307 to sign-in, not a 404; the 404 is signed-in only.

#### UI-08 | Type / Accessibility | HIGH | Around feed reading text is 8.5–9.2px and ignores the app's own Text size setting
- **WHAT IS WRONG:** The social feed sizes its main reading text in fixed pixels copied off a reference image: post body 9.2px, handle 8.6px, time 8.5px, action counts 8.5px, story-ring names 9.1px, "For you/Following" 10.5px. The in-app Text size setting works by scaling the root font size (`settings-store.ts:210-212`: `document.documentElement.style.fontSize = "93.75%"/"106.25%"`). Pixel sizes do not follow the root font size, so a user who picks "Large" still gets 9.2px posts.
- **WHERE:** `apps/web/src/app/social-feed.css:296` (`.nf-post__act` 8.5px), `:3080` (`.nf-story-ring__name` 9.1px), `:3259` (`.nf-post__handle` 8.6px), `:3267` (`.nf-post__when` 8.5px), `:3292-3293` (`.nf-post__body` 9.2px / 14.1px), `:3299` (system body 9.2px), `:3629` (`.nf-bloom__item` 10.3px). The file changed 42 minutes before this audit.
- **EVIDENCE:** `fs.mjs` computed font sizes under 11px on `/around`: `{"8.5px nf-post__when":20,"9.2px nf-post__body nf-post__body--system":17,"8.5px nf-numeric":60,"8.6px nf-post__handle":3,"9.2px nf-post__body":3,"9.1px nf-story-ring__name":1,"10.5px nf-feed-seg__link":2}`. `/home`, `/wallet`, `/listing` and `/u/deprince` return `{}`, so the problem is confined to the feed. Screenshot: `around-feed.png`.
- **WHY IT MATTERS:** Body text at about 9px on a 390pt phone is below every legibility guideline (Apple's minimum is 11pt), and it cannot be enlarged. The Around feed is one of the five dock tabs.
- **THE FIX:** (amended in pass two)
  - *Pass-one fix, retained:* Move the feed onto the type tokens: body `var(--nf-text-body-sm)` (≥ 13px), meta and counts `var(--nf-text-caption)` (≥ 11px), all in rem. If the reference's density matters, tighten line-height and padding rather than font size. Also sweep the other 12 pixel literals in social-feed.css (lines 2936-3386).
  - *Pass-two amendments:*
    - The rem conversion must include the 60 `nf-numeric` count labels at 8.5px, the largest group; pass one's list names `.nf-post__act`, which matches only part of them.
- **EFFORT:** 3–4 hours including a visual pass.
- **PASS TWO:** CONFIRMED (HIGH) — fix amended. Re-measured on `/around`: text nodes below 11px `{"9.1px nf-story-ring__name":1,"10.5px nf-feed-seg__link":2,"8.5px nf-post__when":20,"9.2px nf-post__body":20,"8.5px nf-numeric":60,"8.6px nf-post__handle":3}`. With `html{font-size:125%}`, `.nf-post__body` is still 9.2px, so the in-app Text size setting cannot enlarge feed text (`p2-ui08-around.png`).

#### UI-05 | Layout | MEDIUM | Home hero: the search field is wider than its plate, which clips the Filters button
- **WHAT IS WRONG:** On `/home` at 390px, the hero search form measures 334px inside a 308px content box. The plate is `overflow:hidden`, so it clips the right side of the Filters button (the button spans x 328–372, the plate ends at 366). The cause is a grid item with `min-width:auto` in `.nf-hero-plate__body`.
- **WHERE:** `apps/web/src/app/css/home.css:779-786` (`.nf-hero-plate__search`), `components/app/home/HomeHero.tsx:70,102`.
- **EVIDENCE:** `hero2.mjs` ancestor chain: `A.nf-btn … [328-372]` / `FORM.nf-glass nf-glass--well nf-hero-plate__search [41-375]` / `DIV.nf-hero-plate__body [25-365] pad=16px` / `SECTION.nf-panel nf-hero-plate [24-366] ov=hidden`. `hero3.mjs`: `{"w":"334px","minw":"auto","disp":"grid", parentW:"340px"}`. Same measurement at 1.5s, 4s and 8s. Screenshot: `home-hero-8000.png`.
- **WHY IT MATTERS:** This is the primary search on the first screen after sign-in, and its control is visibly cut at the plate's edge.
- **THE FIX:** Add `min-width: 0;` to `.nf-hero-plate__search`, or give `.nf-hero-plate__body` `grid-template-columns: minmax(0, 1fr)`.
- **EFFORT:** 15 minutes.
- **PASS TWO:** CONFIRMED (MEDIUM). Re-measured on `/home`: `form l41 r375 w334 | body l25 r365 | plate l24 r366 overflow:hidden | Filters button l328 r372 | form min-width:auto`; the right 6px of the 44px Filters control are clipped. The fix (`min-width:0`) is correct.

#### UI-06 | Layout | MEDIUM | Listing spec tiles break words mid-word ("Parkin g", "Backu p power")
- **WHAT IS WRONG:** On every listing and stay page, the five-across fact row squeezes tiles to about 55px and sets `overflow-wrap: anywhere`, so words split at arbitrary letters.
- **WHERE:** `apps/web/src/app/css/catalogue.css:1059-1066` (`.nf-spec-row--fit .nf-spec-tile { flex:1 1 0; min-width:0; … overflow-wrap:anywhere }`), rendered by `components/app/listing/ListingSpecChips.tsx:61`.
- **EVIDENCE:** `probe-el.mjs` on "Parking": `SPAN ow:"anywhere" w:37.2` inside `LI.nf-spec-tile w:55.2`. Screenshot: `listing-top.png` shows "Parkin / g" and "Backu / p / power".
- **WHY IT MATTERS:** This is the first data block on every property page, and broken words read as a bug.
- **THE FIX:** Use `overflow-wrap: normal; hyphens: auto;` and let the row wrap to three columns (`flex-wrap: wrap; flex-basis: calc(33% - gap)`), or cap the fit row at four tiles and move the rest to the amenity row below.
- **EFFORT:** 1 hour.
- **PASS TWO:** CONFIRMED (MEDIUM). Re-measured on `/listing/ed…04`: `"Parking w=55 lines=2 ow=anywhere"` and `"Backup power w=55 lines=3 ow=anywhere"`; the same tiles appear on stay pages. The fix is fine.

#### UI-01 | Shape law | LOW | Text-bearing capsules: the 14px "control" radius turns anything shorter than 28px into a pill
- **WHAT IS WRONG:** `--nf-radius-control` is `--nf-radius-md` = 14px (tokens.css:2101, 2152). Applied to a badge 27px tall or less, the ratio is ≥ 0.5, which makes a capsule. Found live:
  - "Agent Mode" badge: 135×27, radius 14px, ratio 0.53. Appears on every `/agent/*` route for both accounts, at all three widths.
  - Admin reference count badges "749" and "774": 41×25, radius 14px, ratio 0.57.
  - Landing step numbers "1–4" (`.nf-landing-step-num`): 20×20, radius 50%, round with text.
  - Found in code but not rendered with current data: `app/admin/social/page.tsx:134,198,258,285` (same badge class); `components/agent/ApplyWizard.tsx:417` (numbered step disc, `rounded-full` h-8 w-8); `ApplyWizard.tsx:808` (small badge with control radius); `app/(app)/listing/[id]/RentalPanel.tsx:124` (numbered `rounded-full` h-6 w-6).
- **WHERE:** `components/agent/AgentNav.tsx:32`, `app/admin/reference/ReferenceEditors.tsx:167,348`, `app/css/landing.css:1388`, plus the code-only sites above.
- **EVIDENCE:** The walker's shape sweep (radius ÷ short side): `('span','Agent Mode','14px','135x27',0.53,'inline-flex w-fit items-center gap-xs rounded-[var(--nf-radius-control)]…')`, `('span','749','14px','41x25',0.57,'nf-numeric rounded-[var(--nf-radius-control)] border…')`, `('span','1','50%','20x20',0.5,'nf-landing-step-num nf-numeric')`. Screenshots: `admin-390-agent_dashboard.png`, `admin-390-admin_reference.png`, `anon-390-root.png`.
- **WHY IT MATTERS:** This is a craft finding under the founder's absolute shape law. The root cause is systemic: every future small badge that uses the control radius will be a capsule.
- **THE FIX:** (amended in pass two)
  - *Pass-one fix, retained:* Add a badge radius token (for example `--nf-radius-badge: 6px`) and use it for anything under 32px tall. Alternatively make the control radius self-limiting: `border-radius: min(var(--nf-radius-control), 0.3em + 4px)`. Turn the numbered step discs into rounded squares at `--nf-radius-sm`. Add the sweep's ratio test to `scripts/design` so a new capsule fails.
  - *Pass-two amendments:*
    - Prefer the self-limiting token (`border-radius: min(var(--nf-radius-control), 0.3em + 4px)`) over a new badge token: one line fixes every present and future instance with no call-site churn.
- **EFFORT:** 2 hours.
  - Checked and allowed: `.nf-bloom__fab` (58×58, 50%) and `.nf-dock-island` are icon-only with no visible text. Inbox rings, post monograms, story rings and the `/settings` "O" are avatars.
- **PASS TWO:** CONFIRMED — SEVERITY CHANGED MEDIUM→LOW — fix amended. Re-measured: "Agent Mode" `SPAN 135×27 radius 14px ratio 0.53` on `/agent/dashboard`; landing step discs `20×20 radius 50%` ×4. The shape law (`docs/BUILD_06_LEDGER.md:1743-1760`) governs text-bearing controls; "Agent Mode" is a non-interactive label and the numerals are decorative. The token is used as the law prescribes; its arithmetic yields a capsule — real, but craft (LOW). The admin badges "749"/"774" were not re-measured (no admin session).

#### UI-09 | Touch targets | MEDIUM | Controls under 44pt, confirmed by hit-testing rather than box size
- **WHAT IS WRONG:** `.nf-tap` adds a 44px `::after` hit area, so I tested four points 21px from each control's centre with `elementFromPoint`, not just the box size. Genuine failures:
  - **Save heart on every property card** (`.nf-pcard__heart`): 36×36, no expansion, 0 of 4 hits. A tap 21px left or below lands on the card image or link and opens the listing instead of saving it.
  - **Header avatar** (`.nf-app-header__avatar`): `.nf-tap` gives a 44px `::after`, but the element is `overflow:hidden`, which clips it back to 40×40. 0 of 4 hits, on every app screen.
  - **Site footer links**: 40px tall (`.nf-site-footer-link`, `min-height:2.5rem`). Newsletter "Subscribe" is 40×40. The newsletter email input is 25px tall on `/`.
  - **Settings switches** (`.nf-switch`): 52×32, 3 of 4 hits.
  - **Welcome step dots** (`.nf-gs-dot`): 28×44, 2 of 4 hits.
  - **Inline text links used as standalone controls**, 20–26px tall with 2 of 4 hits: "See all" (home, 73×22), "Saved searches" (108×22), "Open Trips" / "Open Bookings" (94×22), "Read more" (92×22), "Report this listing" (130×20), the location link on listings (308×26).
  - **Admin**: brand link 104×38; pager 36×36; range select 36 tall; filter chips 42×44.
- **WHERE:** `app/css/catalogue.css:292-296`, `app/css/chrome.css:859-865`, `app/css/site.css:77-80`, `app/welcome/welcome.css:445-449`. The rest are listed in `hit-member.json`, `hit-anon.json` and `hit-admin.json`.
- **EVIDENCE:** `hit2.mjs`: `/home .nf-pcard__heart {box:[36,36], center:'child:svg', left:'IMG.object-cover', right:'A.flex h-full flex-col', …}` and `.nf-app-header__avatar {box:[40,40], left:'DIV.nf-app-header__row…', overflow:'hidden', after:'44px/auto'}`.
- **WHY IT MATTERS:** The save heart is one of the most-used controls, and a near miss opens the listing. The header avatar is on every screen.
- **THE FIX:** (amended in pass two)
  - *Pass-one fix, retained:* 
    - Heart: add `nf-tap` or a `::before{inset:-4px}`, and keep it inside the image's padding.
    - Avatar: move `overflow:hidden` to an inner span that wraps the image, leaving the anchor unclipped.
    - Footer links: set `min-height: 2.75rem`.
    - Subscribe: `h-11 w-11`.
    - Switch: wrap in a 44px label row.
    - Standalone text links: add `nf-tap`.
  - *Pass-two amendments:*
    - Drop the newsletter-input sub-item (the input is 272×40, not 25px); "Subscribe" at 40×40 still wants `h-11 w-11`.
- **EFFORT:** 3 hours.
- **PASS TWO:** CONFIRMED (MEDIUM) — fix amended. Re-measured with the same 21px offsets on `/home`: save heart `.nf-pcard__heart 36×36`, hits `c:SELF l:IMG r:A.flex h-full flex-col u:A… d:IMG` (three of four near-misses land on the card link); header avatar `40×40 overflow:hidden`, 0 of 4 offset hits. Footer links 40px tall: confirmed. **Withdrawn sub-claim:** "The newsletter email input is 25px tall on `/`" — re-measured signed out it is `email:272×40`, and "Subscribe" is `40×40`.

#### UI-12 | Console / CSP | LOW | One Next framework chunk has no nonce and is blocked by CSP on every page

**One Next framework chunk has no nonce and is blocked by CSP on every page.** The same defect as A09's OPS-15 (and UX-27's CSP half), merged there. OPS-15 went further — all 10 module ids in `11-v4cdswovuj.js` are also present in another loaded chunk, so there is no functional loss — and rated LOW, so the reviewer (A05) lowered this MEDIUM→LOW. OPS-15 now carries an "Also reported as UI-12" line with this finding's useful addition: a CI check that fails on any `<script src>` without a nonce, and the suggestion to set a `content-security-policy` request header carrying the nonce in `proxy.ts` so Next stamps its own tags.

- **PASS TWO:** MERGED INTO OPS-15 — SEVERITY CHANGED MEDIUM→LOW — fix amended (CI nonce check added to OPS-15). Canonical severity LOW.

#### UI-18 | Containers / consistency | LOW | Local materials remain beside the shared layer: eight overlays hand-roll their sheet, and spec tiles hand-draw the panel
- **WHAT IS WRONG:** `components/ui/Sheet.tsx` is used by 28 files, but eight overlays each draw their own scrim, blur and surface:
  - `components/app/ReportSheet.tsx:132-145`
  - `components/app/stays/StayFilterSheet.tsx:292-298`
  - `components/app/filters/FilterDrawer.tsx:507`
  - `components/app/place/ChoicePicker.tsx:249-253`
  - `components/agent/AgentMobileNav.tsx:102`
  - `components/site/MobileMenu.tsx:95`
  - `app/(app)/settings/DeleteAccountPanel.tsx:354`
  - `components/social/ReportSheet.tsx` (its own `nf-social-sheet`)

  Each writes `bg-[var(--nf-overlay-backdrop)] backdrop-blur-sm` plus `bg-[var(--nf-surface-primary)]` locally, so focus trap, scroll lock, safe-area and grip behaviour can drift per sheet. On the listing page, `.nf-spec-tile` (catalogue.css:1032-1050) re-declares the panel material by hand (`--nf-panel-edge`, `--nf-panel-fill-card`, `--nf-panel-rim`). The amenity tiles directly below use `nf-panel nf-panel--card`, so the same object is spelled two ways on one screen. The shared layer is also applied incorrectly in `components/app/wallet/RecentActivity.tsx:44` (see UI-11).
  - The same thing is also spelled several ways elsewhere:
  - **Type:** 209 arbitrary `text-[0.9375rem]`-style sizes in TSX against 848 tokenised ones. The worst files are `(site)/safety/page.tsx` (28), `standards` (23) and `cancellations` (19). There are also 21 pixel `font-size` literals in CSS (19 of them in social-feed.css).
  - **Not-found states:** see UI-15.
- **WHERE:** Not stated separately in pass one.
- **EVIDENCE:** `grep -rln 'from "@/components/ui/Sheet"'` → 28. Per-file `grep -c ui/Sheet` → 0 for all eight. The grep counts above.
- **WHY IT MATTERS:** Two sessions are moving surfaces onto the shared layer, and these files are what is left. Each one is a place where the next fix (focus, safe area, keyboard) will be missed.
- **THE FIX:** (amended in pass two)
  - *Pass-one fix, retained:* Port the eight overlays to `<Sheet>`, or add a `side="left|full"` variant for the drawers. Replace `.nf-spec-tile`'s material with `panelClass({variant:"card"})`. Map arbitrary font sizes onto `--nf-text-*` tokens.
  - *Pass-two amendments:*
    - Porting to `<Sheet>` does not fix the Back-button behaviour: the shared `Sheet` itself pushes no history entry (UX-19). Fix `Sheet` first, then port, or every ported sheet inherits the bug.
- **EFFORT:** 1–2 days.
- **PASS TWO:** CONFIRMED — SEVERITY CHANGED MEDIUM→LOW — fix amended. Re-measured: `grep -rln 'from "@/components/ui/Sheet"'` → 31 today (pass one said 28; the code is moving); seven of the eight named files carry `overlay-backdrop` and import no `ui/Sheet`, and `components/social/ReportSheet.tsx` is its own `nf-social-sheet`; arbitrary `text-[…rem]` sizes in TSX: 185 (pass one said 209). Maintainability and craft, not a defect a user hits.

#### UI-10 | Long text | LOW | Long unbroken names overflow the People list; initials break on names that start with an emoji
- **WHAT IS WRONG:** The `/u` people card sets the name as `<span class="truncate-none">` with no `min-w-0` or overflow-wrap on its row. I injected a 200-character unbroken name. It ran under the Follow button and past the card edge; the offending element's right edge reached 1829px, but the page does not scroll because of the root clip. Avatars take the initial with `displayLabel.charAt(0)`. For a name starting with an emoji, that returns a lone surrogate (`"👩🏾‍💻 Ada".charAt(0)` → `"\ud83d"`), which renders as �. `charAt(0)` appears at 36 call sites.
- **WHERE:** `apps/web/src/app/(app)/u/page.tsx:146,150-152`. Also `components/social/profile/ProfileHeader.tsx:200` and `components/social/feed/PostCard.tsx:498` (`truncate-none`).
- **EVIDENCE:** `inject4.mjs` people: `offenders:["SPAN.truncate-none R=1829", …]`. Screenshot: `inject-people.png`. Node: `"\ud83d"`.
- **WHY IT MATTERS:** Not stated separately in pass one.
- **THE FIX:** Put `min-w-0` on the name row and `overflow-wrap:anywhere` or `truncate` on the name. Replace `charAt(0)` with `Array.from(name.trim())[0] ?? "?"` (or `Intl.Segmenter`) in one shared `initial()` helper.
  - What held up: a listing title of 200 characters or unbroken text is safe. The card title uses `line-clamp: 2`, the H1 uses `overflow-wrap:anywhere`, and there was no overflow. Emoji, Arabic, CJK and Yoruba diacritics render in the injected text.
- **EFFORT:** 1–2 hours.
- **PASS TWO:** CONFIRMED (LOW). Re-measured: injecting a 200-character unbroken name into `/u`'s first `span.truncate-none` gives `{"right":2411,"vw":390,"scrollW":390}` (`p2-ui10-inject.png`). The `charAt(0)` surrogate claim is a language fact and is accepted.

#### UI-11 | Wallet / structure | LOW | Wallet "Recent Transactions" title jammed against the panel rim when empty; several screens have no h1
- **WHAT IS WRONG:** `.nf-tx-card__head` gets `padding-top: 0.125rem`. The comment says the 44px "See all" link supplies the height. In the empty state there is no link, so the title sits about 2px under the border. Separately, no `<h1>` exists on:
  - `/wallet`
  - `/host/photos`
  - `/host/rooms`
  - `/agent/inspections` (admin)
  - `/admin/bookings/<id>` not-found
- **WHERE:** `apps/web/src/app/css/wallet.css:1162-1166`, `components/app/wallet/RecentActivity.tsx:44-45` (`panelClass({variant:"card", className:"nf-tx-panel p-0"})`).
- **EVIDENCE:** Screenshot `wallet-recent.png`. The walker records `h1=[]` for those routes.
- **WHY IT MATTERS:** Not stated separately in pass one.
- **THE FIX:** Scope the reduced padding to `.nf-tx-card__head:has(.nf-wallet-link)`, and otherwise use `0.875rem`. Give each listed screen a visually hidden or real h1.
- **EFFORT:** 1 hour.
- **PASS TWO:** CONFIRMED (LOW). Re-measured on `/wallet`: h1 count 0; the empty "Recent Transactions" head sits 1px below the panel top with `padding-top:2px`.

#### UI-13 | Money formatting | LOW | Compact money changes the figure at the edges; `<Amount>` without showFraction rounds kobo; nairaExact drops the minus sign
- **WHAT IS WRONG:** This came out of a unit test of every formatter (`money-test.mjs`, via jiti against the repo source).
  - **Compact rounding.** `formatMoney(…,{compact:true})` rounds across the magnitude boundary. Its own comment says "A reader cannot tell a short way of writing a number from a different number":
    - 1 kobo → `₦0`
    - 99 kobo → `₦1`
    - ₦999,999.99 → `₦1m`
    - −50 kobo → `-₦0.5`
  - **Kobo lost in `<Amount>`.** `<Amount>` without `showFraction` rounds kobo to whole naira. Only 7 of 88 call sites pass `showFraction`. The wallet's month-change figure is one that does not (`app/(app)/wallet/WalletDeck.tsx:223`): ₦42,000.75 would show ₦42,001. And when `showFraction` IS passed, a whole-naira amount still prints `.00`, unlike `formatMoney`.
  - **Sign dropped.** `nairaExact(-100050)` returns `₦1,000.50` with no sign (`lib/payments/money.ts:13-18`). It is only called with positive amounts today.
  - **Screen readers.** Map pins expose "₦1.1m" as their accessible name, which a screen reader may say as "metres" (UNVERIFIED on device). The wallet balance splits into "₦", a hidden "0", then ".00".
  - The plain formatter is correct at every requested magnitude, in all four locales:

  | kobo | formatMoney | compact | glance | yo | ha | ig |
  |---|---|---|---|---|---|---|
  | 0 | ₦0 | ₦0 | ₦0 | ₦0 | ₦ 0 | ₦0 |
  | 1 | ₦0.01 | **₦0** | ₦0.01 | ₦0.01 | ₦ 0.01 | ₦0.01 |
  | 99900 | ₦999 | ₦999 | ₦999 | ₦999 | ₦ 999 | ₦999 |
  | 100000 | ₦1,000 | ₦1k | ₦1,000 | ₦1,000 | ₦ 1,000 | ₦1,000 |
  | 100000000 | ₦1,000,000 | ₦1m | ₦1m | ₦1,000,000 | ₦ 1,000,000 | ₦1,000,000 |
  | 50000000000 | ₦500,000,000 | ₦500m | ₦500m | ₦500,000,000 | ₦ 500,000,000 | ₦500,000,000 |
  | 99999999 | ₦999,999.99 | **₦1m** | ₦999,999.99 | … | … | … |
- **WHERE:** `packages/i18n/src/index.ts:82-137`, `apps/web/src/components/ui/Amount.tsx`, `apps/web/src/lib/payments/money.ts:13`.
- **EVIDENCE:** Not stated separately in pass one.
- **WHY IT MATTERS:** Not stated separately in pass one.
- **THE FIX:**
  - Compact: fall back to full `formatMoney` when `|minor| < 100_000` (under ₦1,000), and floor rather than round so a figure never rounds up across 1,000k→1m.
  - `<Amount>`: default `showFraction` to "only when there is kobo", as `formatMoney` does.
  - `nairaExact`: keep the sign.
  - Accessible name: give money controls an `aria-label` built from the full `formatMoney`.
  - Layout under injection: ₦500,000,000 in a property card and in the wallet hero caused no overflow (`inject-home-card.png`, `inject-wallet-balance.png`). The wallet also has a `.nf-wallet-figure--long` mode, which I did not trigger because I injected into the DOM directly.
- **EFFORT:** 3 hours.
- **PASS TWO:** CONFIRMED (LOW). Re-ran through jiti against the repo: `1 → "₦0"`, `99 → "₦1"`, `99999999 → "₦1m"`, `-50 → "-₦0.5"`, `nairaExact(-100050) = ₦1,000.50`; `<Amount` call sites 91, 7 passing `showFraction`. Severity honest: compact form is used on large prices, where the edge cases are rare.

#### UI-14 | Console | LOW | Hydration error on every load of `/u/<handle>/edit`
- **WHAT IS WRONG:** `PAGEERROR Minified React error #418 (args[]=text)` fires on every load of the edit-profile page at 390, 768 and 1280. React reports a server/client text mismatch and re-renders the tree on the client.
- **WHERE:** `app/(app)/u/[handle]/edit/page.tsx`, `components/social/profile/ProfileEditor.tsx` and `ProfilePhotos.tsx`. The exact node is unidentified in the minified build.
- **EVIDENCE:** The walker's console capture in `res-member-{390,768,1280}-*.json` for `/u/omojuni_phantom/edit`.
- **WHY IT MATTERS:** Not stated separately in pass one.
- **THE FIX:** Run `next dev` on this route to get the unminified message. Likely causes are a locale- or time-formatted string, or a counter derived from `window`.
- **EFFORT:** 1–2 hours.
- **PASS TWO:** CONFIRMED (LOW). Re-measured: two loads of `/u/omojuni_phantom/edit` both raised `Minified React error #418 … args[]=text`.

#### UI-15 | Consistency | LOW | "Not found" is drawn four different ways, one with a green success shield
- **WHAT IS WRONG:** A missing record renders as one of:
  - (a) the global 404 "This page has checked out": listing, messages, escrow, stories, around, crypto
  - (b) a rose ✕ with red heading, "We could not find that stay/booking/inspection": review, checkout, rent/pay
  - (c) a calm illustration, "That booking is not here": `/bookings/[id]`
  - (d) admin "That stay is not there" under an emerald shield-check, the success/verified glyph: `/admin/bookings/[id]`
- **WHERE:** `app/admin/bookings/[bookingId]/page.tsx`, `app/(app)/bookings/[bookingId]/review`, `checkout/[bookingId]`, `rent/pay/[inspectionId]`.
- **EVIDENCE:** Screenshots `vp-member-390-bookings_…`, `vp-member-390-…_review.png`, `vp-member-390-checkout_…`, `vp-admin-390-admin_bookings_….png`.
- **WHY IT MATTERS:** Not stated separately in pass one.
- **THE FIX:** Use one `NotFoundState` primitive with a neutral tone. Reserve rose for failures the user can act on, and never pair "not there" with a success glyph.
- **EFFORT:** 2 hours.
- **PASS TWO:** CONFIRMED (LOW), not re-driven in full. Zero-UUID `/stay/…000` and `/restaurant/…000` both give the global 404 (variant a); variants b, c and d rely on pass one's screenshots, and d is admin-only.

#### UI-16 | HTTP | LOW | notFound() pages answer HTTP 200 (soft 404) with duplicate robots meta
- **WHAT IS WRONG:** Because the root `loading.tsx` streams the shell first, `notFound()` inside a page returns status 200. This applies to `/listing/<missing>`, `/messages/<missing>`, `/profile/setup/bogus`, and the dev harness `/gallery`, `/preview` and `/preview/f1`. The head then carries both `<meta name="robots" content="index, follow"/>` and `<meta name="robots" content="noindex"/>`. Only truly unmatched paths such as `/reviews` return 404.
- **WHERE:** Not stated separately in pass one.
- **EVIDENCE:** `curl -w %{http_code}` → `200 /gallery`, `200 /preview`, `200 /preview/f1`. The walker records `[200]` with h1 "This page has checked out".
- **WHY IT MATTERS:** Not stated separately in pass one.
- **THE FIX:** Resolve not-found before the streamed boundary (for example in `generateMetadata`/layout, or by moving `loading.tsx` below the dynamic segments). Drop the default `index, follow` when `noindex` applies.
- **EFFORT:** 2 hours.
- **PASS TWO:** CONFIRMED (LOW). Re-measured: `curl` → `/gallery 200`, `/preview 200`, `/preview/f1 200`; `/gallery`'s head carries both `index, follow` and `noindex` robots meta. The `/preview` half duplicates STORE-17 (A08); keep UI-16 for the app-wide soft-404 and duplicate robots. (OPS-17 covers the listing soft-404.)

#### UI-17 | Copy | LOW | Appearance still promises "Theme"
- **WHAT IS WRONG:** The Settings row sub-label reads "Theme, text size, motion", but light mode was removed and the screen has no theme control.
- **WHERE:** `packages/i18n/src/locales/en.ts:1396` (`appearanceSub`), plus yo/ha/ig equivalents.
- **EVIDENCE:** Not stated separately in pass one.
- **WHY IT MATTERS:** Not stated separately in pass one.
- **THE FIX:** "Text size, motion, data".
- **EFFORT:** 10 minutes.
- **PASS TWO:** CONFIRMED (LOW). Live: the Appearance header says "Theme, text size, motion" while the screen has only Text size, Reduce motion, Use less data and Language, with the footnote "Dark is the designed default"; `en.ts:1396` and yo/ha/ig say the same.

#### UI-19 | Native chrome | LOW | Native chrome and page canvas are two different near-blacks; the "no rubber-band" rule sits on body, where it has no effect
- **WHAT IS WRONG:** `CHROME_COLOUR` is `#010118` and the iOS shell background, splash and status bar use it. The page canvas `--nf-surface-canvas` is `#000612`, the computed `html` background `rgb(0, 6, 18)`. The overscroll strip and status bar are therefore a slightly different, bluer black than the page. `base.css:132` puts `overscroll-behavior-y: none` on `body`. By spec only the root element's value applies to the viewport, and computed `html` is `auto`, so the intent to stop the rubber band does not apply. There is no pull-to-refresh in the native shell, so a user cannot refresh a stale screen except through navigation or realtime.
- **WHERE:** `apps/web/src/lib/theme/chrome.ts` (`#010118`), `apps/web/capacitor.config.ts` (three hard-coded `#010118`), `packages/design-tokens/src/tokens.css:452` (`#000612`), `apps/web/src/app/css/base.css:132`.
- **EVIDENCE:** The walker's `htmlBg: rgb(0, 6, 18)`, `bodyBg: rgba(0,0,0,0)`, `overscroll: ['auto','none']`.
- **WHY IT MATTERS:** Not stated separately in pass one.
- **THE FIX:** Pick one colour and set `CHROME_COLOUR` to the canvas token's value. Move `overscroll-behavior-y` to `html` if the bounce should be off. Decide on pull-to-refresh for the native shell (inbox, bookings, wallet).
- **EFFORT:** 1 hour, plus a product decision.
  - UNVERIFIED: not tested on a physical iOS device.
- **PASS TWO:** CONFIRMED (LOW), device UNVERIFIED. Code: `CHROME_COLOUR = "#010118"` (`lib/theme/chrome.ts:45`); `capacitor.config.ts:92,115,125` use `#010118`; `--nf-surface-canvas: #000612` (`tokens.css:452`); `overscroll-behavior-y: none` sits on body (`base.css:132`).

#### UI-20 | Flow | LOW | An unknown URL asks for sign-in instead of a 404 (the first-visit carousel half is merged into STORE-P2-04)
- **WHAT IS WRONG:** When a signed-out visitor opens `/sign-in` for the first time, the client routes them to `/welcome?next=/sign-in`. A returning user on a new phone has to Skip a four-step carousel before signing in. Any unknown path redirects signed-out visitors to `/sign-in?next=…` (307), so a mistyped link asks for credentials before it can say "not found".
- **WHERE:** Not stated separately in pass one.
- **EVIDENCE:** The walker: `/sign-in → /welcome?next=%2Fsign-in`. `curl /this-route-does-not-exist` → `307 …/sign-in?next=…&notice=sign-in-required`.
- **WHY IT MATTERS:** Not stated separately in pass one.
  - *Pass two split this finding. The first-visit-to-`/sign-in` carousel half is the same as A05's UX-01, which is merged into STORE-P2-04; STORE-P2-04 carries an "Also reported as UI-20, carousel half" line with its fix (exempt `/sign-in` and `/sign-in/email` from the first-run gate). What stays here is the unknown-URL half. It overlaps OPS-17 (A09: signed-out unknown paths get a 307 to sign-in).*
- **THE FIX:** (split in pass two)
  1. In `proxy.ts`, let unmatched paths fall through to `not-found` instead of the auth gate.
  2. (Carousel half, now under STORE-P2-04) Exempt `/sign-in` and `/sign-in/email` from the first-run gate (`components/app/welcome/first-run-seen.ts:80` already exempts `/welcome` and `/start`).
- **EFFORT:** 1 hour.
- **PASS TWO:** SPLIT. Carousel half MERGED INTO STORE-P2-04 (via UX-01). Unknown-URL half CONFIRMED LOW: re-measured `curl /this-route-does-not-exist → 307 …/sign-in?next=…`, and the same for `/reviews` signed out.

#### NEW IN PASS TWO

#### UI-P2-01 | Claims / Interface | HIGH | Example hotels and restaurants carry no example disclosure and offer booking controls; A06 recorded the opposite as sound
- **WHAT IS WRONG:** The "This is an example listing … Vallo has not verified anything on this page" banner exists only on the property-listing template. `/stay/[id]` for catalogue hotels (`ea…`) and every `/restaurant/[id]` render as live venues: "Book now" with a total, or "Hold a table / Request a table / Pick a time and the restaurant answers". They show no example wording at all. The list cards on `/restaurants` and `/stays` do say "Example", so the label vanishes one tap deeper.
- **WHERE:** `apps/web/src/app/(app)/restaurant/[id]/page.tsx` (grep for demo or example finds one comment, line 337); `apps/web/src/app/(app)/stay/[id]/page.tsx` and `StayDetailView.tsx` (no `is_demo` branch). The server refuses correctly: `lib/reservations/actions.ts:140-142` returns `EXAMPLE_RESTAURANT_MESSAGE`, and checkout refuses example hotels (`bb-02-checkout.png` in pass one).
- **EVIDENCE:**
  - `p2c.mjs`: `restaurant has "example": false | has Reserve/Book: [ 'Hold a table', 'Book a table' ]`
  - `p2d.mjs`: `/restaurants` shows `Example` on all 4 cards, while the detail page controls include `Request a table->btn`
  - `p2g.mjs` on `/restaurant/ed…2a`: `example? false […'Hold a table','Pick a time and the restaurant answers. Nothing is charged to hold a table.','Book a table','Request a table'…]`
  - Screenshots: `p2-restaurant-eb06.png`, `p2-restaurant-eb06-full.png`, `p2rt-_stay_ea…01.png`
- **WHY IT MATTERS:** The user fills in a request and is refused only at the end, after the page presented the venue as real. A reviewer who taps into any hotel or restaurant sees what looks like live inventory with no disclosure (2.3.1 / Play Misrepresentation). This is the same class of problem as STORE-05, but on the detail pages the reviewer actually uses.
- **THE FIX:** Extract the example banner from the listing page into a shared `<ExampleNotice>` and render it on `/stay/[id]` and `/restaurant/[id]` when `is_demo` is true (both the `businesses` and `listings` sources). When `is_demo` is true, replace Book now and Request a table with "Nothing here can be booked or held", as the property page already does. This merges naturally with my UX-09, which covers the hotel half from the booking-flow side.
- **EFFORT:** 3-4 hours.
- **PASS TWO:** NEW IN PASS TWO (found by the reviewer, A05). `p2c.mjs`: `restaurant has "example": false | has Reserve/Book: [ 'Hold a table', 'Book a table' ]`; `/restaurants` shows `Example` on all 4 cards while the detail page offers `Request a table`; `/restaurant/ed…2a`: `example? false`. Overlaps UX-09 (A05 pass one: the hotel half, from the booking-flow side); per the orchestrator both are kept and cross-referenced. It also overturns pass one's CHECKED AND FOUND SOUND claim that every example listing carries the disclosure.

#### UI-P2-02 | Test quality | LOW | The interface sweep's overflow and colour checks cannot fail for the reasons the features would fail
- **WHAT IS WRONG:**
  - Overflow is judged by `scrollingElement.scrollWidth === innerWidth` while the root is `overflow-x: clip`, so no overflow can ever register.
  - Clipping by an inner `overflow:hidden` container, the actual failure mode in UI-05, is not measured at all.
  - The colour sweep reads solid properties only, so gradients, `box-shadow` and `background-image` escape it.
  - This matters beyond A06's report: `scripts/design` sweeps and `docs/design/SWEEP.md` rely on the same kinds of check.
- **WHERE:** A06's `work/A06/sweep.js`; `apps/web/src/app/css/base.css` (root `overflow-x: clip`).
- **EVIDENCE:** `p2e.mjs`: an injected element with `right: 2411` beside `scrollW: 390`. `p2c.mjs`: `htmlOx:"clip", bodyOx:"clip"` on all 10 routes. `.nf-hero-plate` clips the Filters button (UI-05) without any sweep flagging it.
- **WHY IT MATTERS:** Rule 3. A green light that cannot turn red hides the next UI-05 or UI-10.
- **THE FIX:** In the design sweep, add (a) and (b):
  - (a) Flag any visible element whose bounding rect extends past `clientWidth`, or past its nearest `overflow:hidden|clip` ancestor's rect, excluding `sr-only` and off-screen transforms.
  - (b) Parse `background-image` gradients and `box-shadow` colours into the hue check.
  Then prove the new check fails with an injected long name (the UI-10 case) before trusting it.
- **EFFORT:** 3-4 hours.
- **PASS TWO:** NEW IN PASS TWO (found by the reviewer, A05). `p2e.mjs`: an injected element with `right: 2411` beside `scrollW: 390`; `p2c.mjs`: `htmlOx:"clip", bodyOx:"clip"` on all 10 routes; `.nf-hero-plate` clips the Filters button (UI-05) without any sweep flagging it.

#### UI-P2-03 | Interface / data | MEDIUM | Listings render under the wrong template: rentals as stays, restaurant *units* as places to eat
- **WHAT IS WRONG:**
  - `/stay/ed…01` renders "Three bedroom flat in Lekki Phase 1" under the "For stays" pill with nightly booking UI.
  - `/restaurants` lists "Restaurant unit in Bodija" and "Restaurant space in Jabi", which by their names are commercial premises. Their detail pages read "₦6,500 a head, typically" and offer "Hold a table".
  - The routing decision (`lib/listings/href.ts` `STAY_KINDS`, `hrefForListing`) and the page templates key on `kind` alone.
  - My UX-10 covers the villa or rental-as-nightly price math. This finding is the template mismatch across three templates.
- **WHERE:** `apps/web/src/lib/listings/href.ts:51-60`; `app/(app)/listing/[id]/page.tsx:153-157, 293-309`; the example seed rows `ed…01`, `ed…2a`, `ed…1e`.
- **EVIDENCE:** `p2rt.mjs`: `/stay/ed…01 → h1="Three bedroom flat in Lekki Phase 1" | For stays`. `/restaurant/ed…2a → h1="Restaurant unit in Bodija" | ₦6,500 | a head, typically | … | Hold a table`. `p2d.mjs` `/restaurants` list: `Example | Restaurant unit in Bodija | Bodija, Ibadan | Price on request | … | Example | Restaurant space in Jabi`.
- **WHY IT MATTERS:** Every surface that routes by kind shows a tenancy as a nightly stay or as a dining table. On real supply, an agent listing a commercial "restaurant space" to let gets diners asking for tables.
- **THE FIX:**
  - Route and template by intent plus price period: tenancy goes to `/listing`, nightly to `/stay`, per-head dining to `/restaurant`.
  - Add a listing-wizard distinction between "a restaurant (tables)" and "premises for a restaurant (to let)", with the latter filed as `shop`/`office`.
  - Fix the three seed rows (rename, or re-kind as `shop`).
- **EFFORT:** 4-6 hours, shared with UX-10's fix.
- **PASS TWO:** NEW IN PASS TWO (found by the reviewer, A05). `p2rt.mjs`: `/stay/ed…01 → h1="Three bedroom flat in Lekki Phase 1" | For stays`; `/restaurant/ed…2a → h1="Restaurant unit in Bodija" | ₦6,500 | a head, typically | … | Hold a table`; `/restaurants` lists "Restaurant unit in Bodija" and "Restaurant space in Jabi". Related: UX-10 (price math), UX-04 (kind-based routing).

#### CHECKED AND FOUND SOUND

- **No horizontal scroll anywhere.** `scrollingElement.scrollWidth === innerWidth` on every route load at 390, 768 and 1280, for all three accounts (about 540 loads). The root uses `overflow-x: clip`.
- **Reduced motion is honoured.** With `reducedMotion:'reduce'` there were 0 running animations on `/`, `/welcome`, `/sign-up`, `/home`, `/wallet`, `/around`, `/listing`, `/messages` and `/search`. The control run without it showed `nf-drift-a` (34s, infinite) on every page and `nf-gs-coin-turn` on `/welcome`, so the check can fail.
- **Colour discipline.** Grepping TSX, TS and CSS for Tailwind amber, yellow, orange, purple, violet, pink, red, green, teal, indigo, lime, fuchsia and sky classes found 0 hits. The live computed-hue sweep of text, fill, stroke and border found nothing outside blue, cyan, emerald and rose, except the error badge (hue about 359°). That badge is the project's own rose token `--nf-rose-400: #FF1744`. See FOR THE FOUNDER.
- **Safe areas.** `viewport-fit=cover` is set. `.nf-safe-top` is on the app header (`AppShell.tsx:313`), the listing gallery and actions, and the photo viewer. The bottom dock, sheets, admin and auth all use `env(safe-area-inset-*)`. Capacitor sets `Keyboard.resize: Native`, so the web view shrinks above the keyboard. The submit-under-keyboard case is not device-verified.
- **Back controls.** I opened 24 deep links cold and pressed Back; each landed on the expected parent. Examples: `/wallet/transactions → /wallet`, `/listing/x → /search`, `/stay/x → /stays`, `/restaurant/x → /restaurants`, `/messages/share/listing/x → /listing/x`, `/u/h/followers → /u/h`, `/profile/setup/agent → /profile/setup`, `/escrow → /wallet`, `/verification → /profile`, `/trips → /stays`.
- **Fake and missing IDs are handled.** Every dynamic route renders a proper not-found state rather than crashing or leaking: bookings, checkout, review, receipts, rent/pay, escrow, stories, around, price/area and messages.
- **The admin console refuses the member account.** `/admin` shows "You do not have console access". The admin's first desk in a session is gated to the overview by design (`/admin/social → /admin?next=…`).
- **Overlays open and sweep clean.** The app menu drawer, search filters, stay filters, the bloom FAB menu, the report sheet and Add money all opened with no horizontal scroll, no capsules and no off-palette hues (`interact-*.png`).
- **Card layout under stress.** A 200-character title plus ₦500,000,000 in a home property card changed neither the card's size (259.9×349.2 before and after) nor caused overflow. The title clamps at 2 lines.
- **Honest copy that holds up.** Every example listing states "This is an example listing… Vallo has not verified anything on this page". The Terms define verification scope carefully ("not a guarantee against fraud…"). The wallet trust copy was rewritten under the claims rule (en.ts:2928-2934). "Your card details never touch our servers" is backed by Paystack's hosted window (CSP `frame-src checkout.paystack.com`). The Help page's "protected with row level security" describes the actual mechanism.
- **The dev harness is closed on Vercel.** `previewHarnessIsOpen` returns false when `VERCEL` is set, so `/gallery` and `/preview/**` render not-found. They return 200 rather than 404; see UI-16.
- **Crypto is dark by design.** `/crypto` calls `notFound()` (`app/(app)/crypto/page.tsx:32`). This is CORRECTLY EMPTY.

**Pass-two re-check of these claims (A05):**

- **"No horizontal scroll anywhere": TRUE, BUT THE CHECK IS DECORATION.** Both `html` and `body` compute `overflow-x: clip`, so `scrollingElement.scrollWidth === innerWidth` can never fail. My injection proves it: a name whose right edge is at 2411px still leaves `scrollW` at 390. I ran the check that can fail, elements whose rect passes the viewport with no clipping ancestor below the root, on 10 routes (`/home`, `/around`, `/u`, `/wallet`, `/listing/ed…04`, `/stays`, `/settings`, `/search`, `/messages`, `/profile`). Result: `n:0` on every one. So the conclusion holds on those 10, but the ~540-load sweep proved nothing. It also could not see UI-05, which is clipping by an inner `overflow:hidden`; A06 found that by hand. See UI-P2-02.
- **"Colour discipline … nothing outside blue, cyan, emerald and rose": FALSE AS STATED, but sanctioned.**
  - Source contains amber and orange: the gold tier badge (`--nf-badge-gold-top #ffdc20`, `#ffd323`, `#ffba0c`; tick `#f58207`/`#d95c00`, tokens.css:3248-3252; `trust-badge.css:12-14` also cites `#F37B02`/`#E86700`/`#BA4600`) and a platinum grey.
  - `trust-badge.css` documents it as a named founder exception to rule 8 ("the only place amber exists in the product").
  - A06's sweep reads solid colour properties only, and the badge is a gradient. So a gradient-borne colour could drift anywhere and the sweep would call it clean.
  - The other off-palette hex values my scan found (`#7C2251`, `#351B40`, `#047E70`, `#4D3C64`) are in comments, not rules.
  - Not a defect. It is a blind spot, and A06's statement should name the exception.
- **"Fake and missing IDs are handled": TRUE for genuine zero UUIDs,** which I re-checked on `/stay/…000` and `/restaurant/…000` (global 404). But at least 4 of the rows cited as evidence were real ids (table above), so the claim rests on fewer checks than it appears to.
- **"Honest copy that holds up: Every example listing states 'This is an example listing…'": FALSE.** It holds for `/listing/*` and for `ed…` rows rendered on `/stay/*`. It does not hold for catalogue hotels (`/stay/ea…`) or for restaurants (`/restaurant/eb…06`, `/restaurant/ed…2a`), which carry no example wording and offer Book now or Request a table. See UI-P2-01.
- **"The Help page's 'protected with row level security' describes the actual mechanism":** true, but it is engineer-voice copy on a consumer screen (my UX-17). Accurate is not the same as sound for a first-time renter.
- **Reduced motion, safe areas, back controls, admin refusal:** not re-tested by me. No challenge.

#### ROUTE TABLE (pass-two sample; the full pass-one table is not reproduced)

The full pass-one route table (390px, by account) is in `pass1/A06-interface.md`, ROUTE TABLE. The pass-two reviewer sampled 10 rows: the HTTP status and final-URL columns were all correct, but 6 of the 10 notes were wrong (including 4 "fake id" labels on ids that are real). Use the status column and ignore the notes.

| Row as filed | Re-measured | Verdict on the row |
|---|---|---|
| `/stay/ea…01` "fake id -> in-page not found" | 200, h1 "Grand Vista Hotel", a full hotel page with Book now (`p2rt-_stay_ea…01.png`) | **Note wrong.** It is a real example hotel, and it carries no example disclosure (UI-P2-01) |
| `/stay/ed…01` "fake id -> in-page not found" | 200, h1 "Three bedroom flat in Lekki Phase 1", "For stays", example banner | **Note wrong.** A real example rental drawn as a stay (UI-P2-03 / UX-10) |
| `/restaurant/eb…06` "fake id -> in-page not found" | 200, h1 "Harbour Lights Kitchen", "Hold a table / Request a table", no "example" word anywhere on the page | **Note wrong** (UI-P2-01) |
| `/messages/share/listing/ed…04` "fake id -> in-page not found" | 200, "Share to chat … Four bedroom detached house, Lekki Phase 1 … ₦250,000,000 View listing" | **Note wrong.** It renders a real share card |
| `/rent/move-in/ed…04` "fake id -> in-page not found" | 200, "Move-in cost … Only a home to rent has a move-in cost" | **Verdict OK, reason wrong.** ed…04 is a real sale listing; the refusal is correct |
| anon `/home` "hero filters button clipped (UI-05); verified claim" | Anon gets 307 → `/welcome` (carousel) | **Note wrong.** The member note was pasted onto the anon row |
| anon `/wallet` "CORRECTLY EMPTY ₦0.00, no h1 (UI-11)" | Anon is redirected to `/welcome` | **Verdict wrong.** Should be "OK (gate)" |
| `/u/nonexistent_handle_zz` OK | "That is not a handle — A handle is 3 to 20 characters" | **Test does not test what it says.** The handle is 21 characters, so it hits the format refusal, not the missing-user state. A missing valid handle was never tried |
| `/agents` (member) → `/profile/setup/owner` "redirect by design" | Confirmed: lands on "Register as an owner" | **Status right.** But the footer's "List your property" puts a member straight into the *owner* form, whatever they are (see UX-11) |
| `/rent` OK "Verified listings only claim" | Confirmed | Correct |

Conclusion: the HTTP status and final-URL columns are reliable. The note column is not: 6 of 10 sampled notes are wrong, including 4 "fake id" labels on ids that are real. Any pass-two reader should use the status column and ignore the notes.

#### CORRECTLY EMPTY vs BROKEN

| Screen | Verdict | Reason |
|---|---|---|
| /saved, /saved/searches | CORRECTLY EMPTY | The member has saved nothing |
| /bookings, /trips, /checkout | CORRECTLY EMPTY | Zero bookings or reservations exist platform-wide |
| /inspections, /rent/pay | CORRECTLY EMPTY | No inspection has been requested |
| /escrow | CORRECTLY EMPTY (copy contradicts the Terms, UI-04) | Zero escrows |
| /wallet, /wallet/transactions | CORRECTLY EMPTY | No movements; ₦0.00 |
| /notifications | CORRECTLY EMPTY | Nothing has happened to the account |
| /messages | OK | One thread with the example agent, "No messages yet" |
| /host/* | CORRECTLY EMPTY | No host application or venue on either QA account |
| /agent/* | CORRECTLY EMPTY | Neither QA account is an agent, so the listing pitch shows (with claims issue UI-03) |
| /profile/application | CORRECTLY EMPTY | No agent application |
| /crypto | CORRECTLY EMPTY | Deliberately dark for v1 |
| /reviews | BROKEN | 404, linked from Profile (UI-02) |
| /u/<h>/edit | BROKEN (minor) | Hydration error (UI-14) |

*Pass-two notes:* the `/escrow` contradiction is now tracked under ESC-13 (MEDIUM); `/reviews` is BROKEN for signed-in members only (anon gets a 307).

#### NOT COVERED

- **Physical devices.** I tested no physical iOS or Android device and no Capacitor build. Safe areas, notch, keyboard covering submit, rubber-band colour and pull-to-refresh are judged from code and config, marked UNVERIFIED.
- **Real screen readers.** I did not run VoiceOver or TalkBack. The "₦1.1m" read-out and wallet balance announcement are inferred from DOM names.
- **Loading states.** I did not throttle the network to watch each loading skeleton, and did not force failing fetches per screen. I saw the offline page (`/offline`) and every not-found state, but not partial-data states.
- **Real-data layouts.** Screens that need real data were not observed with data: a booking or checkout with a real amount, a receipt, a thread with messages, a 10,000-character message, agent listings, host rooms and photos. For the 10,000-character message I read `threads.css` (`overflow-wrap:anywhere` at lines 335, 545, 614 and 1105) rather than rendering one. I sent no messages and created no records.
- **Gradients, shadows and images.** `background-image` gradients, `box-shadow` colours and imagery were not colour-sampled; the sweep reads solid colour properties only.
- **Intermittent server errors.** 502 responses and `text/plain` MIME errors appeared on some static assets (`/fonts/inter-latin.woff2`, some chunks, a `/help` RSC prefetch) only while nine browsers ran in parallel through the agent proxy. Six sequential `curl` requests to the font returned 200 with `font/woff2`. I attribute them to the environment and filed no finding. Pass two may want to watch Vercel logs for 502s.
- **Map tiles and realtime.** Map tiles (`api.maptiler.com`) and the Supabase realtime websocket failed with `ERR_TUNNEL_CONNECTION_FAILED` from this sandbox's proxy, so map rendering and live updates were not verified.
- **Dev preview routes.** The 250 `(dev)` preview routes were not walked individually; three samples confirmed the harness is closed on Vercel.
- **Light mode.** Not audited, per the brief.

**Pass two (A05) did not cover:**

- The QA admin account (UI-01 admin badges, UI-04 admin escrow lede, UI-15 variant d, the admin rows of the route table).
- 768px and 1280px.
- Devices (UI-19).
- Reduced motion, safe-area and back-control claims were not re-tested.
- I did not submit "Request a table" on an example restaurant. I relied on the server refusal in code, so that no reservation rows were created.

The QA member signed in once more for this pass. No records were created.

#### FOR THE FOUNDER

1. **Escrow (UI-04).** Does Vallo hold agency-fee money or not? The Terms and the product say opposite things. Your answer decides which one gets rewritten, and may carry licensing implications.
2. **"Verified" (UI-03).** Until real verified stock exists, do you want "verified" removed from the landing page, home hero, `/rent` and the agent pitch? Or made conditional on what is on screen?
3. **Store badges (UI-07).** Supply the App Store and Play Store URLs once the listings exist. Until then, the badges should not render. Confirm they must never render inside the native app.
4. **The error colour.** The "rose" token is `#FF1744`, a saturated red (hue about 348°, computed about 359° on badge text). If "rose" was meant as Tailwind's rose (`#F43F5E` / `#FB7185`), this token reads as red and is the one place the palette strays.
5. **Pull-to-refresh.** Should the native shell have pull-to-refresh on the inbox, bookings and wallet? At present there is no way to refresh a screen in the app except by navigating away.
6. **Feed type (UI-08).** The feed's 9px type came from matching a reference render pixel for pixel. Confirm legibility wins over the reference.

*Pass-two notes:* item 1 is now ESC-13 (true today while the gate is closed; the `/escrow` empty state must say held payments are not open yet); item 2 — delete "verified" rather than make it conditional until DB-01 is fixed; item 3 is now STORE-06.

#### CLEANUP NOTES

- Pass one: no records created; no messages sent; the Playwright session files were deleted when the work ended.
- Pass two: the QA member signed in once more; no records were created ("Request a table" was not submitted on an example restaurant).

---

### A07 — SUPPLY PIPELINE (owner, agent, firm, host): from nothing to booked: merged pass one + pass two

Sources: `pass1/A07-supply.md` (Agent 7) and its pass-two review `pass2/R-A07-by-A04.md` (Agent 4). Pass one could not run rolled-back writes (read-only MCP; PostgREST does not honour `Prefer: tx=rollback`), so it used a scratch Postgres 16 repro, live Postgres logs and a live owner-registration walk. Pass two ran four rolled-back `DO` probes through `apply_migration` (`a04_pass2_probe_sup01_rolled_back`, `…_sup02_fix_…`, `…_selfpublish2_…`, `…_calendar_squat_…`; a fifth, `…_selfpublish_…`, failed on a check constraint and is superseded), each building a real agent row the way approval does, setting `request.jwt.claims` and `SET LOCAL ROLE authenticated`, running a control and ending in `raise exception 'ROLLED BACK ON PURPOSE: …'`. Cleanup verified: `recorded a04 migrations: 0 | QA member agents: 0 | 'QA probe%' listings: 0 | a04_* functions: 0 | original listings_owner_all (owns_listing) intact: 1`.

Pass-two tally: 17 confirmed, 0 withdrawn; 1 severity change (SUP-04 HIGH→MEDIUM); 6 fixes amended (SUP-01, 02, 03, 05, 06, 09); duplicates merged: SUP-01 → DB-03, SUP-02 → DB-01/DB-02, SUP-03 → ESC-02, SUP-07 → SEC-04; 3 new findings.

#### DANGER NOW

Nothing here is leaking money or exposing data at this moment. There are zero non-example listings and zero bookings, so SUP-02 and SUP-03 cannot be used against anybody today. **Both become live the moment the first real listing or business is published**, so fix them before launch rather than after. SUP-01 is a live total blockage right now: no new supply can enter the product.

*Pass-two note:* SUP-01 is now tracked as **DB-03** (CRITICAL, live total blockage, with a proved non-recursive fix); SUP-02 as **DB-01**/**DB-02** (live for businesses today — any member qualifies — latent for listings); SUP-03 as **ESC-02** (latent).

#### FINDINGS (pass one, with pass-two verdicts)

#### SUP-01 | Listing create (owner + agent) | CRITICAL | THE THIRD BLOCKAGE: every first draft save fails 42501 because the listings policy looks the new row up by id

**THE THIRD BLOCKAGE: every first draft save fails 42501 because the listings policy looks the new row up by id.** The same defect as A03's DB-03, merged into it; DB-03 is raised to this finding's CRITICAL and now carries its scratch-Postgres repro, the live log line and its WHY IT MATTERS (no owner or agent can create a listing since 2026-09-22 23:05 UTC; the wizard says "Nothing you typed was lost"; no photo can attach and nothing can be submitted). **Its proposed policy does not work:** the pass-two reviewer (A04) put it in place in a rolled-back probe and got `ERR 42P17 infinite recursion detected in policy for relation "firm_members"`, because its firm arm queries `firm_members` from inside a policy and `firm_members_select_principal` is self-referential (SUP-P2-01). DB-03 carries the amended fix — SECURITY DEFINER helpers `private.listing_agent_is_me(agent_id)` and `private.firm_member_is_me(firm_id)` — which A04 proved: `AMENDED FIX app path insert...returning: ok; owner sees own rows=2; stranger update rows=0; stranger sees draft rows=0`. The stopgap (client-generated id, then a separate select) was also proved: `STOPGAP client id + separate select: ok status DRAFT`.

- **PASS TWO:** MERGED INTO DB-03 (known cross-area duplicate; canonical severity CRITICAL, the highest of the two). A04 in pass two: CONFIRMED (CRITICAL stands) — FIX AMENDED: the proposed policy fails with 42P17 and must use SECURITY DEFINER helpers; the `sup01` probe reproduced the app path `ERR 42501` with the no-returning control succeeding.

#### SUP-02 | Review queue and trust marks | CRITICAL | Listers and hosts can change moderator-owned columns on their own rows

**Listers and hosts can change moderator-owned columns on their own rows.** The same defect as A03's DB-01 (businesses, accommodations, room types) and DB-02 (listings), and A04's SEC-01; merged into DB-01 and DB-02. Its catalog evidence (`has_column_privilege('authenticated', …, 'UPDATE')` true for the moderator columns on `listings`, `businesses` and `accommodations`) and the pass-two probe evidence (A04's `selfpublish2`: DRAFT→PUBLISHED plus featured, self-stamped inspected, address-verified and mandate-verified marks, a minted reference `VL-X76Q5D` and an area-feed system post; and `OWNER FAKES LISTING FEE CHARGED (0 minor): rows=1`) are carried in DB-02. Its fix already carried a pass-two correction (a column REVOKE alone breaks admin review and publish, which run on the admin's own `authenticated` JWT — SEC-P2-03); A04's amendments (add `listing_fee_*`, `supply_verified_by`, `mandate_verified_at` and `accommodations.star_rating` to the protected set; `agent_applications` WITH CHECK; `payout_accounts` number and name non-writable) are folded into DB-01, DB-02, DB-08 and DB-05.

- **PASS TWO:** MERGED INTO DB-01 (businesses half) and DB-02 (listings half) — known cross-area duplicate; canonical severity CRITICAL. A04 in pass two: CONFIRMED, CRITICAL (latent for listings, live for businesses), duplicate of SEC-01, fix amended (SEC-01's fix, with the additions listed).

#### SUP-03 | Booking price integrity | CRITICAL | Checkout charges whatever total is stored on a bookings row, and guests can insert bookings rows directly

**Checkout charges whatever total is stored on a bookings row, and guests can insert bookings rows directly.** The same defect as A02's ESC-02 (and the pass-two findings DB-P2-01 and SEC-P2-01); merged into ESC-02. The pass-two reviewer (A04) added one fact, now in ESC-02's evidence: a booking can also be written against an **unpublished (DRAFT) listing** (`GUEST DIRECT BOOKING total_minor=2 (2 kobo) on a listing it has not seen priced: ok`), because `bookings_guest_insert` never checks `listings.status`; and one fix amendment, now in ESC-02's fix: the booking RPC must refuse listings that are not PUBLISHED and whose `listing_intent`/`rate_period` is not nightly. The "belt and braces" BEFORE INSERT pricing trigger (unless `vallo.rent_charge` is set) is also in ESC-02's fix.

- **PASS TWO:** MERGED INTO ESC-02 (known cross-area duplicate; canonical severity CRITICAL). A04 in pass two: CONFIRMED (CRITICAL, latent), duplicate of ESC-02, fix amended.

#### SUP-04 | Session expiry mid-form | MEDIUM | A server action posted with a dead session gets a 307 to /sign-in, the page crashes to "Nothing you were doing was lost", and the answers are gone
- **WHAT IS WRONG:**
  - `proxy.ts:347-386` redirects every non-API request from a signed-out user to `/sign-in`, including server action POSTs.
  - The action fetch follows the 307, gets a page back, and React throws "An unexpected response was received from the server".
  - The route error boundary says "Nothing you were doing was lost". Its "Try again" remounts the form empty at step 1.
  - The registration forms (`OwnerRegisterForm`, and by the same code `AgentRegisterForm` and `FirmRegisterForm`) keep all their state in React only.
  - The listing wizard does keep a device copy (`ListingWizard.tsx:1067-1101`). But once a listing id exists, the restore discards that copy (`if (parsed.listingId) removeItem`) or ignores it when `initial` is present. Everything typed since the last autosave, which happens only on step change, is lost.
- **WHERE:** `apps/web/src/proxy.ts:347-386`; `components/supply/OwnerRegisterForm.tsx:192-218` (no try/catch, no persistence); `app/agent/list/ListingWizard.tsx:1067-1101, 1204-1223`.
- **EVIDENCE:** (live, QA member)
  - Sequence: filled owner registration steps 1-3 (name, phone, Lagos / Eti-Osa, "I have none of these"), cleared cookies (`COOKIES LEFT 0`), pressed Finish.
  - Result:
    ```
    POST 307 https://www.vallospaces.com/profile/setup/owner -> /sign-in?next=%2Fprofile%2Fsetup%2Fowner&notice=sign-in-required
    POST 200 https://www.vallospaces.com/sign-in?next=...  application/json
    CONSOLE Error: An unexpected response was received from the server.
    screen: "SOMETHING WENT WRONG | That screen did not load | ... Nothing you were doing was lost, and trying again usually settles it. | Try again"
    after Try again: "Register as an owner | Step 1 of 4 | About you ..." (form reset)
    ```
  - Nothing was filed (the QA member has 0 applications, 0 businesses, 0 agent notifications afterwards).
- **WHY IT MATTERS:** a landlord who takes a long time over the form, or whose refresh token was revoked, loses everything and is told the opposite. The same thing happens to every server action form behind the proxy.
  - *Pass two (A04): the trigger needs a session that is already dead mid-form. The proxy refreshes on every navigation and the refresh cookie lives 400 days (SEC-07), so this is uncommon; the main real-world cause is a sign-out on another device, because `signOut()` is global (SEC-08). Fixing SEC-08 removes most occurrences.*
- **THE FIX:**
  - In `proxy.ts`, when the request carries a `Next-Action` header (or is a non-GET), do not redirect. Pass it through so the action returns `SIGNED_OUT_MESSAGE`, or return 401.
  - On the client, handle the signed-out result by opening sign-in in a sheet or new tab, keeping state.
  - Persist the three registration forms to sessionStorage.
  - In the listing wizard, store a `savedAt` with the device copy and restore it over `initial` when it is newer.
  - Change the error-boundary copy so it never promises nothing was lost.
- **EFFORT:** 1 day.
- **PASS TWO:** CONFIRMED — SEVERITY CHANGED HIGH→MEDIUM (see WHY IT MATTERS). The evidence is real: the live 307 transcript, and `proxy.ts:347-386` redirects any non-API path regardless of method. The fix is correct.

#### SUP-05 | Application review | HIGH | "Needs more information" is a dead end, and the founder's own application is stuck there
- **WHAT IS WRONG:**
  - The admin action (`lib/admin/actions.ts:252-460`) can send an application back as MORE_INFO_REQUIRED. The email says "Open your application, add it, and send it back" (`lib/email/messages.ts:1087`).
  - `/profile/application` only displays the note and has no edit, upload or resubmit control.
  - RLS `agent_applications_update_draft` allows updates only while `status='DRAFT'`.
  - `agent_documents_insert_own` allows attaching documents only to DRAFT or SUBMITTED applications.
  - No action exists to resubmit.
- **WHERE:** `app/(app)/profile/application/page.tsx`; live policies on `agent_applications` and `agent_documents`.
- **EVIDENCE:** live row `VL-AGT-10016 | MORE_INFO_REQUIRED | owner | reviewed 2026-09-22 18:05 | note "your  bvn" | docs 0`. The owner form has no BVN field anywhere either.
- **WHY IT MATTERS:** every applicant who is asked a question is stranded. Filing a second application is their only way out, and nothing guards against duplicate applications.
- **THE FIX:** (amended in pass two)
  - *Pass-one fix, retained:* 
    - Add a `respondToReview` action and UI on `/profile/application` for MORE_INFO_REQUIRED: edit the fields, attach documents, set status to SUBMITTED.
    - Extend the update policy's USING to `status in ('DRAFT','MORE_INFO_REQUIRED')`, with a column guard.
    - Allow document insert on MORE_INFO_REQUIRED.
    - Block a second application while one is open.
  - *Pass-two amendments:*
    - "Extend the update policy's USING to MORE_INFO_REQUIRED" **widens a hole** unless WITH CHECK is tightened at the same time: today it is only `auth.uid() = user_id`, so an applicant can already set their own status to anything, including APPROVED (DB-08). Write it as:
      ```sql
      using (auth.uid() = user_id and status in ('DRAFT','MORE_INFO_REQUIRED'))
      with check (auth.uid() = user_id and status in ('DRAFT','MORE_INFO_REQUIRED','SUBMITTED'))
      ```
    - Also revoke UPDATE on `reviewer_id, reviewed_at, review_notes, agency_fee_bps, legal_fee_bps` after submit (or guard them in a trigger; see the admin-client caveat in DB-01).
- **EFFORT:** 1 day.
- **PASS TWO:** CONFIRMED (HIGH) — fix amended (widening the update policy must tighten WITH CHECK at the same time). Reviewer verified live: row `VL-AGT-10016 MORE_INFO_REQUIRED owner "your  bvn"`; `agent_documents_insert_own` allows only `status IN ('DRAFT','SUBMITTED')`; `agent_applications_update_draft` has USING `status='DRAFT'`; `app/(app)/profile/application/page.tsx` renders status only, with no respond control.

#### SUP-06 | Search and map | HIGH | Real listings are never given coordinates, so they never appear on the map
- **WHAT IS WRONG:**
  - The listing wizard's "location" step collects state, city, area, address and landmark only. `saveDraft`'s column set has no `latitude` or `longitude` (`lib/agent/listings-actions.ts:258-335`), and nothing else in `lib/agent` or `app/agent` writes them.
  - `listings_in_bounds` requires `location is not null`.
  - The owner form promises "The exact spot on the map belongs to the property itself, and you set it when you list" (seen live, step 2).
  - The stays host wizard does require a pin (`lib/host/onboarding.ts:647`).
- **WHERE:** Not stated separately in pass one.
- **EVIDENCE:** `select count(*) filter (where location is not null), count(*) from listings` -> `64 | 64`. All 64 are seeded examples, which is why the map looks correct.
- **WHY IT MATTERS:** the first real listing will be missing from the map and from any geo search. The catalogue gets null lat/lng too.
- **THE FIX:** (amended in pass two)
  - *Pass-one fix, retained:* add a pin picker to the location step (reuse the host pin component), add `latitude` and `longitude` to `draftInputSchema` and to the columns, and add `hasPin` to `submitRequirements`.
  - *Pass-two amendments:*
    - An exact pin on a residential rental, shown publicly on the map, is a safety and privacy issue (the same class as SEC-04 GPS). Collect the exact pin, but have `listings_in_bounds` and the catalogue return a coarsened point (for example rounded to 3 decimals, about 110 m) for listings that are not hotels; show the exact point only after a confirmed inspection.
    - Add `hasPin` to `submitRequirements` **and** to the admin approve gate.
- **EFFORT:** 0.5-1 day.
- **PASS TWO:** CONFIRMED (HIGH) — fix amended (coarsen the public point). Reviewer: the `saveDraft` column set (`lib/agent/listings-actions.ts:256-335`) has no latitude or longitude; the admin review screen already says "The lister did not drop a pin, so there is no point to show." (`app/admin/listings/[id]/ListingReview.tsx:280-283`), so the gap is known on the admin side and not enforced.

#### SUP-07 | Upload paths, EXIF | HIGH | Host property photos go raw (with GPS) into a PUBLIC bucket

**Host property photos go raw (with GPS) into a PUBLIC bucket.** The same defect as A04's SEC-04, merged into it. SUP-07's two valid additions — HEIC/HEIF (accepted by `accommodation-photos`) do not render in Chrome or Android browsers, and raw uploads also go to `inspection-photos`, `escrow-evidence`, message attachments and supply/host documents — and its fix point (narrow the public buckets' MIME types to jpeg and webp) are carried in SEC-04, whose server-side re-encode remains the fix.

- **PASS TWO:** MERGED INTO SEC-04 (known cross-area duplicate; canonical severity HIGH). A04 in pass two: CONFIRMED (HIGH), duplicate of SEC-04; keep SEC-04's server-side re-encode and narrow the public MIME types.

#### SUP-08 | Stays booking | HIGH | Hotel and shortlet rooms cannot be booked at all
- **WHAT IS WRONG:**
  - Every room "Reserve" control goes to `/checkout?stay=&room=&rate=`, which always shows "Vallo cannot hold this room ... Rooms at this property are not reserved through Vallo".
  - The host wizard still collects rooms, rates, inventory, cancellation policies and a payout bank account, as if bookings would come.
  - `bookings` has only `listing_id` (NOT NULL), so the double-booking exclusion (`bookings_no_overlap`) cannot apply to rooms. Room-level oversell protection exists only as `room_inventory.units_booked`, which nothing books.
- **WHERE:** `app/(app)/checkout/page.tsx:18-33, 108-125` (its header comment says M6 is waiting on the founder); `git log` shows it was last touched 4 hours ago.
- **EVIDENCE:** Not stated separately in pass one.
- **WHY IT MATTERS:** hosts onboard for a product that cannot take a booking, and guests hit a dead end on every stay.
- **THE FIX:** founder decision on M6, `supabase/migrations/pending/m06_bookings_extension.sql`. Until then, say plainly in the host wizard and on the stay page that booking is by contact only, and hide "Reserve".
- **EFFORT:** M6 is days. The copy is 1 hour.
- **PASS TWO:** CONFIRMED (HIGH). Reviewer: `app/(app)/checkout/page.tsx:111-114` always says "Vallo cannot hold this room … Rooms at this property are not reserved through Vallo". The fix is correct: a founder decision on M6, and until then hide Reserve.

#### SUP-09 | Rent charge | HIGH | The same rental can be charged in full to several tenants
- **WHAT IS WRONG:**
  - `private.open_rent_charge` holds the calendar only for `[move_in, move_in+1)` as a PENDING booking.
  - Two tenants with confirmed inspections and different move-in dates can both open and pay the full move-in amount.
  - Nothing takes a let property off the market after rent is paid: there is no trigger on `rent_payments` or `transactions` that touches `listings`.
  - When two tenants pick the same date, the exclusion raises 23P01, which `startRentPayment` maps to `SERVICE_DOWN_MESSAGE`.
- **WHERE:** Not stated separately in pass one.
- **EVIDENCE:** live function body (insert `check_in = p_move_in, check_out = p_move_in + 1`); triggers on `rent_payments` are only the demo refusal and `set_updated_at`.
- **WHY IT MATTERS:** Not stated separately in pass one.
- **THE FIX:** (amended in pass two)
  Refusing at open time "when any PENDING or CONFIRMED rent booking exists" is not enough on its own: two tenants can each open a charge before either pays, and a tenant with an unpaid charge could block everyone else for the 48-hour hold, repeatedly. Do three things:
  1. At open: refuse only if a SUCCESSFUL rent transaction already exists for the listing (`already_let`).
  2. At settlement (the webhook and wallet pay paths): in the same transaction as crediting, `select … for update` the listing. If another rent payment for the listing is already SUCCESSFUL, mark this one for refund instead of confirming (see MON-P2-02 for the refund door).
  3. On first success, set the listing to a let state (unpublish), which cancels the other PENDING charges.
  Also map 23P01 to a sentence (today `startRentPayment` maps it to `SERVICE_DOWN_MESSAGE`; see ESC-03 for `date_taken`).
- **EFFORT:** 0.5 day.
- **PASS TWO:** CONFIRMED (HIGH) — fix amended (decide at settlement, not only at open). Reviewer verified the live `private.open_rent_charge` body: the only duplicate guard is `rent_payments where inspection_id = p_inspection` (per inspection, not per listing); the hold is `check_in = p_move_in, check_out = p_move_in + 1`; no trigger on `rent_payments` touches `listings`.

#### SUP-10 | Firm role | MEDIUM | "Registered firm" is a door with nothing behind it
- **WHAT IS WRONG:**
  - Approval narrows firm to person role `agent` (`lib/admin/actions.ts`, `personRoleFrom`).
  - Nothing creates the `businesses` row with `kind='agency'` or any `firm_members` row. The firm's team is kept only as `agent_applications.firm_team` JSON.
  - `listing_role_from_its_lister` never derives `firm`.
  - So no listing can ever say "listed by <firm>", which `lib/supply/roles.ts` calls "the whole point of the exercise". No `firms` table exists either.
- **WHERE:** Not stated separately in pass one.
- **EVIDENCE:** Not stated separately in pass one.
- **WHY IT MATTERS:** Not stated separately in pass one.
- **THE FIX:** on approving a firm application, create the agency business and an owner `firm_members` row, set `agents.firm_id`, and let the wizard choose "list under firm", which sets `listing_role='firm'` and `firm_id`. Or remove the firm door until this exists.
- **EFFORT:** 1-2 days.
- **PASS TWO:** CONFIRMED (MEDIUM), and worse than stated: any firm feature built on `firm_members` would fail today, because the table's own SELECT policy recurses (SUP-P2-01).

#### SUP-11 | Professional application | MEDIUM | Documents filed from /profile/setup/professional never attach
- **WHAT IS WRONG:**
  - `lib/agent/application.ts:249-255` inserts `agent_documents` with kinds `idFront`, `idBack` or `registration`. The live CHECK `agent_documents_kind_known` allows only identity, address, business, selfie, association, ownership, mandate.
  - It also omits `uploader_id`, which `agent_documents_insert_own` requires to equal `auth.uid()`.
  - The route is live (rendered as the QA member: "Work as an agent or estate manager ... 1 / 6") and is linked from the profile's RoleSwitcher (`components/roles/roles.ts:127`, `RoleSwitcher.tsx:370`).
- **WHERE:** Not stated separately in pass one.
- **EVIDENCE:** Not stated separately in pass one.
- **WHY IT MATTERS:** Not stated separately in pass one.
- **THE FIX:** map the kinds (idFront/idBack to identity, registration to business) and set `uploader_id`. Or redirect `/profile/setup/professional` to `/profile/setup/agent`.
- **EFFORT:** 1 hour.
- **PASS TWO:** CONFIRMED (MEDIUM). Reviewer: `lib/agent/application.ts:69` has `DOCUMENT_KINDS = ["idFront","idBack","registration"]` while the live CHECK `agent_documents_kind_known` allows `identity,address,business,selfie,association,ownership,mandate`; the insert at `:249-255` omits `uploader_id`, which `agent_documents_insert_own` requires. The fix is correct.

#### SUP-12 | Calendar | MEDIUM | Nights a host has closed are enforced only in the date picker
- **WHAT IS WRONG:**
  - `reserve()` never reads `availability`. `getBlockedDates` only feeds the client picker, so a stale page or a crafted request books a closed night.
  - `writeBookedNights` then upserts that night from `unavailable` to `booked`. On cancellation, `releaseNights` deletes only `booked` rows, so the host's closure is silently lost.
- **WHERE:** `lib/bookings/actions.ts:141-296`; `lib/bookings/settlement.ts:57-90`.
- **EVIDENCE:** Not stated separately in pass one.
- **WHY IT MATTERS:** Not stated separately in pass one.
- **THE FIX:** in `reserve()` (or the booking RPC from SUP-03), refuse if any night in the range is `unavailable` or `booked`. Never overwrite `unavailable`.
- **EFFORT:** 2 hours.
- **PASS TWO:** CONFIRMED (MEDIUM). Reviewer: `reserve()` (`lib/bookings/actions.ts:141-300`) never reads `availability`; `writeBookedNights` upserts `status: 'booked'` over any existing row (`settlement.ts:57-72`); `releaseBookedNights` deletes only `booked` rows, so a host's `unavailable` night is lost after a booking and a cancellation. The fix is correct; with ESC-02, the whole check must live in the booking RPC.

#### SUP-13 | Verification claims | MEDIUM | "We check who you are before anything is published" is not enforced anywhere
- **WHAT IS WRONG:**
  - The owner form states this. But an application is approvable with zero documents and the NIN is optional; the founder's own application had 0 documents.
  - The agent's `verification_tier` stays 0 after approval.
  - No database or server gate ties `PUBLISHED` to an identity rung (`listing_supply_proof_gate` only refuses a publish where a document was *rejected*).
  - The claim holds only if the reviewer is careful.
  - (added in pass two) The copy is at `packages/i18n/src/locales/en.ts:5723` ("We check who you are before anything is published."). Related claims are also false while DB-02 stands: `:2379` and `:2470` ("We check every listing by hand") and `standards/page.tsx:43` ("Duplicate and stolen photographs are checked before anything is published").
- **WHERE:** Not stated separately in pass one.
- **EVIDENCE:** Not stated separately in pass one.
- **WHY IT MATTERS:** Not stated separately in pass one.
- **THE FIX:** either gate publish on `agents.verification_tier >= 1` (a trigger on listings status -> PUBLISHED, examples excepted), or change the copy to what is true.
- **EFFORT:** 2 hours.
- **PASS TWO:** CONFIRMED (MEDIUM). Reviewer located the copy and found three more false claims (now in WHAT IS WRONG). The fix is correct; prefer the gate, and fix DB-02 first, otherwise any publish gate can be walked around.

#### SUP-14 | Approval side effects | MEDIUM | Approving an application ignores failures to create the agent row or the role
- **WHAT IS WRONG:** `lib/admin/actions.ts` awaits `admin.from("agents").upsert(...)` and the `user_roles` upsert without checking `error` (supabase-js does not throw). If either fails, the application still says APPROVED and the email says "Agent Mode is open", while `requireAgent` answers "Only approved agents can manage listings".
- **WHERE:** Not stated separately in pass one.
- **EVIDENCE:** Not stated separately in pass one.
- **WHY IT MATTERS:** Not stated separately in pass one.
- **THE FIX:** check both errors and roll the status back, or better, do all three writes in one SECURITY DEFINER RPC in a single transaction.
- **EFFORT:** 2 hours.
- **PASS TWO:** CONFIRMED (MEDIUM). Reviewer: `lib/admin/actions.ts:347-366`, both `upsert` calls awaited with no `error` check. The fix is correct (one SECURITY DEFINER RPC).

#### SUP-15 | Doors and copy | LOW | Wrong destinations and wrong words on the supply path
- **WHAT IS WRONG:**
  - The "Become an agent" CTA on `/agent/list` links to `/profile/setup/owner` (seen live).
  - The `/agent/list` sidebar says "Not signed in as an agent | Sign in" to a signed-in member.
  - The approval notice and email title reads "Your agent application is approved" for owner and firm applicants too.
  - Nothing stops a second owner, agent or firm application while one is open.
- **WHERE:** Not stated separately in pass one.
- **EVIDENCE:** Not stated separately in pass one.
- **WHY IT MATTERS:** Not stated separately in pass one.
- **THE FIX:** point the CTA to `/profile/setup`; make the sidebar say "Not an agent yet"; use role-aware titles; guard `submitSupplyRegistration` against an open application.
- **EFFORT:** 2 hours.
- **PASS TWO:** CONFIRMED (LOW). Not re-walked live; the code is consistent with the finding.

#### SUP-16 | Device drafts | LOW | The listing draft in localStorage is not scoped to the user and not cleared at sign-out
- **WHAT IS WRONG:**
  - The `nf_listing_draft` key (`ListingWizard.tsx:129`) holds the address, the gate code and the security phone. It is shared by every account on the device and never removed at sign-out.
- **WHERE:** Not stated separately in pass one.
- **EVIDENCE:** Not stated separately in pass one.
- **WHY IT MATTERS:** Not stated separately in pass one.
- **THE FIX:** key it by user id and clear it on sign-out.
- **EFFORT:** 1 hour.
- **PASS TWO:** CONFIRMED (LOW). Reviewer: `ListingWizard.tsx:129` sets `DRAFT_KEY = "nf_listing_draft"`, a global key, removed only inside the wizard (`:1080`, `:1464`), never at sign-out.

#### SUP-17 | Restaurant onboarding | LOW | A restaurant can be submitted with no photos
- **WHAT IS WRONG:**
  - `missingFrom` (`lib/host/onboarding.ts:614-660`) requires a photo only for accommodations.
- **WHERE:** Not stated separately in pass one.
- **EVIDENCE:** Not stated separately in pass one.
- **WHY IT MATTERS:** Not stated separately in pass one.
- **THE FIX:** add at least one business photo to the restaurant branch.
- **EFFORT:** 30 minutes.
- **PASS TWO:** CONFIRMED (LOW). Reviewer: `lib/host/onboarding.ts` requires a photo only on the accommodation branch.

#### NEW IN PASS TWO

#### SUP-P2-01 | Firms / admin desk | HIGH | `firm_members` SELECT policy recurses: every non-definer read fails with 42P17, including the admin supply desk's firm roster
- **WHAT IS WRONG:** `firm_members_select_principal` has USING `EXISTS (SELECT 1 FROM firm_members p JOIN agents pa … WHERE p.firm_id = firm_members.firm_id …)`. That reads its own table under RLS, so Postgres refuses every query on `firm_members` from `authenticated`. Admins are not spared: permissive policies are OR-ed, and all of them are expanded.
- **WHERE:**
  - `supabase/migrations/20260922230300_track_g_4_the_firms_staff_and_the_two_doors_into_it.sql`, the `firm_members_select_principal` policy.
  - The admin reader is `apps/web/src/lib/admin/reads/supply.ts:385-398` (`getFirmRosters`, which reads `firm_members` through the admin's RLS client).
- **EVIDENCE:**
  - Live GET as the QA member: `firm_members?select=firm_id` → `500 {"code":"42P17","message":"infinite recursion detected in policy for relation \"firm_members\""}`.
  - The same GET as the QA admin gives the same 500.
  - Also hit by Agent 7's own proposed SUP-01 policy (see above).
- **WHY IT MATTERS:** The admin supply desk's firm roster always returns UNAVAILABLE. Any future firm feature, or any policy that consults `firm_members`, breaks. It stayed hidden because `owns_listing` is SECURITY DEFINER and there are 0 rows.
- **THE FIX:** Replace the self-join with a SECURITY DEFINER helper:
  ```sql
  create function private.is_firm_principal(p_firm uuid) returns boolean language sql stable security definer set search_path=public as
  $$ select exists (select 1 from public.firm_members p join public.agents pa on pa.id=p.agent_id
       where p.firm_id=p_firm and p.member_role='principal' and p.status='active' and pa.user_id=(select auth.uid())) $$;
  drop policy firm_members_select_principal on public.firm_members;
  create policy firm_members_select_principal on public.firm_members for select using (private.is_firm_principal(firm_id));
  ```
  Add a probe that selects from `firm_members` as `authenticated`.
- **EFFORT:** 1 hour.
- **PASS TWO:** NEW IN PASS TWO (found by the reviewer, A04). Live GET as the QA member and as the QA admin: `firm_members?select=firm_id` → `500 {"code":"42P17","message":"infinite recursion detected in policy for relation \"firm_members\""}`; also hit by SUP-01's proposed policy in a rolled-back probe.

#### SUP-P2-02 | Calendar / abuse | HIGH | Any user can hold every night of any nightly listing for a year at ₦0, locking out real guests; repeatable after the 48-hour sweep
- **WHAT IS WRONG:** A direct PostgREST insert into `bookings` needs no payment, no price check and no rate limit. `bookings_no_overlap` then protects the squatter's PENDING hold against every real guest. The hold-sweep releases it after 48 hours, and the attacker re-inserts.
- **WHERE:**
  - Policy `bookings_guest_insert`.
  - Exclusion `bookings_no_overlap … WHERE status IN ('PENDING','CONFIRMED')`.
  - There is no insert rate limit (SEC-09).
- **EVIDENCE:** (probe `calendar_squat`, rolled back; a listing published at ₦50,000/night inside the transaction)
  ```
  STRANGER holds 365 nights at 0 naira: ok;
  honest guest refused: 23P01 conflicting key value violates exclusion constraint "bookings_no_overlap";
  CONTROL honest guest outside squat window: ok
  ```
- **WHY IT MATTERS:** A competitor, or one angry person, can take any host's calendar off the market indefinitely at zero cost. The same exclusion also blocks the rent move-in hold.
  - *Severity note (pass one's heading said "HIGH (latent)"):* latent.
- **THE FIX:** The ESC-02/SUP-03 booking RPC, plus these limits inside it:
  - a maximum stay length (for example 30 nights, or per-listing `max_nights`);
  - at most N open PENDING bookings per guest (for example 2);
  - a per-user rate limit;
  - a PENDING hold that counts against the calendar only once payment has started, or a short TTL (for example 30 minutes) for unpaid holds instead of 48 hours.
- **EFFORT:** Half a day, on top of ESC-02.
- **PASS TWO:** NEW IN PASS TWO (found by the reviewer, A04). Rolled-back probe `calendar_squat` (a listing published at ₦50,000/night inside the transaction): `STRANGER holds 365 nights at 0 naira: ok; honest guest refused: 23P01 …; CONTROL honest guest outside squat window: ok`. Overlaps ESC-03 (A02, HIGH; same squat abuse, filed first). Not in the known-duplicate list, so it is kept here with a cross-reference; its extra limits (maximum stay length, open-hold cap, short TTL for unpaid holds) belong in the ESC-02 booking RPC.

#### SUP-P2-03 | Trust marks | MEDIUM | Self-publishing mints a public reference, a feed announcement and badges, so SUP-02's blast radius reaches social
- **WHAT IS WRONG:** On the owner's PATCH to PUBLISHED, these triggers fire without any staff involvement:
  - `listings_assign_reference`, which issued `VL-X76Q5D` in the probe;
  - `listings_announce_after_publish`, which inserted 1 system post into the area feed;
  - `listings_award_badges_after_write`.
- **WHERE:** Probe `selfpublish2`: `ref=VL-X76Q5D; system announcement posts=1`.
- **EVIDENCE:** See WHERE (pass one gave them together).
- **WHY IT MATTERS:** The unreviewed listing is advertised to the neighbourhood under Vallo's own system voice, and earns "first listing"-type badges.
- **THE FIX:** Covered by SEC-01. Additionally, have these triggers act only when `reviewer_id` is set by staff (or when `current_setting('vallo.publishing')` is set by the admin publish RPC), so a future grant slip cannot re-open it.
- **EFFORT:** 1 hour.
- **PASS TWO:** NEW IN PASS TWO (found by the reviewer, A04). Probe `selfpublish2`: `ref=VL-X76Q5D; system announcement posts=1`. Its additional fix (triggers act only on a staff publish) is also carried in DB-02's amended fix, step 6.

#### CHECKED AND FOUND SOUND

- `submitSupplyRegistration` column set vs live `agent_applications`: `user_id` is the only NOT NULL column without a default and it is supplied; `reference` defaults from `agent_ref_seq` and `authenticated` holds USAGE/UPDATE on the sequence; the enum and CHECK values (supply_role, ownership_document, association_proof, fee bps) match. Its insert-returning is safe (the SELECT policy is `user_id = auth.uid()`). The document kinds (identity, selfie, association) are allowed and the path prefix is checked.
- The admin approval upsert column set is valid against `agents` (role and status enums, CHECKs, firm trigger no-op when `firm_id` is null).
- `listing_role_from_its_lister` fills owner or agent on insert; the 23502 is fixed.
- Inspection request insert: lister filled by trigger, requester-visible RETURNING, the demo refusal gives a clear sentence, and there is a self-listing guard. The inspection report, host business, accommodation, room type and rate plan inserts have no self-referencing SELECT policies.
- The `bookings_no_overlap` exclusion, `daterange(check_in, check_out, '[)')` over PENDING and CONFIRMED, is correct for listing nights; the hold-sweep cron releases PENDING after 48 hours.
- Review decisions reach the lister on both channels (in-app `notifications` row plus email via `announce`, `lib/notify/junction.ts:139-178`), with a template for all 7 decisions. APPROVED listings sit in the admin "waiting" bucket until published.
- The listing wizard strips photo metadata (canvas re-encode to JPEG, max 2560, size check against the bucket limit).
- `agent_listings` feature flag is ON. `authenticated` has the needed grants on every pipeline table.

#### CORRECTLY EMPTY vs BROKEN

| Surface | State | Why |
|---|---|---|
| Map and search | Shows only the 64 examples | Correct today. BROKEN for the first real listing (SUP-06), and no real listing can exist anyway (SUP-01). |
| Admin listing queue | Empty | BROKEN in effect: nobody can create a draft (SUP-01). |
| Admin application queue | 1 row, MORE_INFO_REQUIRED | BROKEN: the applicant cannot answer (SUP-05). |
| `/profile/application` (QA member) | "No application on file" | CORRECTLY EMPTY. |
| `/agent/list` (QA member) | Pitch page | CORRECT (not an agent). The CTA goes to the wrong door (SUP-15). |
| Stay room checkout | "Vallo cannot hold this room" | BROKEN by design, pending M6 (SUP-08). |
| Bookings, escrow, payouts | Empty | CORRECTLY EMPTY: examples are refused by trigger, and no real listing exists. |

#### NOT COVERED

- A live walk of the listing wizard as an agent: there is no agent QA account, and the QA member cannot become one without the admin approving a real application. Nothing was created.
- Over-the-wire proof of SUP-02 and SUP-03: PostgREST does not honour `tx=rollback` here and MCP is read-only, so these rest on catalog evidence. SUP-01 has a local repro plus a live log line.
- Escrow, completion and payout internals past `open_rent_charge` (the money agent's area), and Paystack.
- The host console after publish (editing rooms and rates, `/host/rooms`, `/host/transfer`), the admin business review desk, restaurant reservation internals, and the search role filter.
- The AgentRegisterForm and FirmRegisterForm walks (same code shape as the owner form, not clicked).

Noticed outside my area:
- The live Postgres log is flooded with `new row violates row-level security policy for table "post_views"` (dozens per hour).
- A CSP console error on page load: `Refused to load the script .../_next/static/chunks/11-v4cdswovuj.js ... script-src ... 'strict-dynamic'`. The form still worked.

Cleanup: the scratch Postgres at `/tmp/a07pg` was stopped and deleted. No live rows were created (checked: the QA member has 0 applications, 0 businesses, 0 agent notifications).

**Pass two (A04) did not cover:**

- A browser walk of the listing wizard as an agent. Not possible without committing an agent row; the SQL probe replicates the exact request.
- SUP-15's live copy was not re-walked.
- The host console after publish.

**Cross-references already in pass one, not re-filed by pass two:** `payout_accounts` rows are client-rewritable after Paystack resolution (see DB-05, formerly in SEC-01); `agent_applications` status and fees can be self-set (see DB-08 and SUP-05 amended).

#### FOR THE FOUNDER

- M6 (rooms bookable through `bookings`): decide, or remove "Reserve" from stays (SUP-08).
- Your own owner application VL-AGT-10016 is stuck in MORE_INFO_REQUIRED asking for a BVN that no form collects (SUP-05).
- Is "firm" a real role at launch? If not, hide the door (SUP-10).
- Should publishing require a passed ID rung? The copy currently says it does (SUP-13).
- To let pass two walk the pipeline end to end: approve an owner application for the QA member account once SUP-01 is fixed, and delete it afterwards.

*Pass-two note on the last item:* the owner application approval for the QA member should wait until DB-03 (formerly SUP-01) is fixed, and it creates live rows that must be removed afterwards.

#### CLEANUP NOTES

- Pass one: the scratch Postgres at `/tmp/a07pg` was stopped and deleted. No live rows were created (the QA member has 0 applications, 0 businesses, 0 agent notifications). The owner-registration walk killed the session before the final submit.
- Pass two: no live row persisted (verified by SQL, above); stranger and guest identities in the rolled-back blocks were existing user uuids used only as JWT `sub` values. No QA credential in any file.

---

### A08 — APPLE AND GOOGLE: what stops us shipping: merged pass one + pass two

Sources: `pass1/A08-stores.md` (Agent 8, 23 September 2026, repo `85c5471`) and its pass-two review `pass2/R-A08-by-A03.md` (Agent 3). Pass two reproduced each claim from source, the Capacitor 8.5.2 sources, curl with no session and read-only SQL; nothing was written anywhere except scratch copies of public HTML; no credentials used.

Pass-two tally: 21 reviewed; 10 confirmed as written (STORE-15 and STORE-21 are partial or full duplicates); 8 confirmed with fix amended (STORE-09 also evidence amended); 3 severity changed (STORE-01 CRITICAL→HIGH, STORE-14 MEDIUM→LOW, STORE-16 MEDIUM→LOW); 0 withdrawn. PASS rows: 4 challenged, 3 overturned or narrowed. New: 5 (STORE-P2-05 is a cross-reference, merged into DB-01/DB-02).

#### DANGER NOW

Nothing found that leaks money or exposes data right now. Everything below is a store blocker, not a live-safety issue.

*Pass-two note:* unchanged. Pass one's iOS verdict listed four independent first-submission rejections (STORE-01, 02, 04, 07); pass two lowers STORE-01 to HIGH and adds STORE-P2-04 (browse needs an account) and STORE-P2-03 (video capture without a microphone string) at HIGH.

#### FINDINGS (pass one, with pass-two verdicts)

#### STORE-01 | NATIVE SHELL | HIGH | The airplane-mode screen tells the reviewer "This build has no server", and its retry button reloads itself
- **WHAT IS WRONG:** `native-shell/index.html` decides between the "You are offline" card and the "This build has no server" card by reading `window.Capacitor.getConfig().server.url`. **No such API exists in Capacitor 8**, so `configured` is always falsy. Every shipping build therefore shows the developer card, with text telling the reader to set `CAPACITOR_SERVER_URL` and read `docs/MOBILE.md`. The button on that card calls `window.location.reload()`, which reloads the packaged error page and never retries the live origin. On iOS the web `/offline` page cannot rescue this either: service workers are unavailable in WKWebView unless App-Bound Domains are enabled, and `capacitor.config.ts` sets `limitsNavigationsToAppBoundDomains: false`. So on iOS every failed load, cold or warm, lands on this card.
- **WHERE:** `apps/web/native-shell/index.html:477-481` (the detection), `:440-465` (the developer card), `:497-499` (the reload). The error path is wired at `apps/web/capacitor.config.ts:200` (`errorPath: "index.html"`).
- **EVIDENCE:** `grep -c getConfig node_modules/@capacitor/ios/Capacitor/Capacitor/assets/native-bridge.js node_modules/@capacitor/android/capacitor/src/main/assets/native-bridge.js node_modules/@capacitor/core/dist/index.js` → `0 / 0 / 0`. The injected globals are `window.Capacitor = { DEBUG…, Plugins: {} }; window.WEBVIEW_SERVER_URL = '<localUrl>'` (`ios/Capacitor/Capacitor/JSExport.swift:19`, `android/…/Bridge.java:1031`). That is the local `capacitor://localhost`, not `server.url`. The shell script is `var configured = window.Capacitor && window.Capacitor.getConfig && window.Capacitor.getConfig().server && …; if (!configured) document.body.setAttribute("data-state","unconfigured");`.
- **WHY IT MATTERS:** Apple's standard airplane-mode test (and Play's pre-launch report on a flaky network) sees a screen that says the app is broken. That is a guaranteed 2.1 rejection with a screenshot attached, and on a real Nigerian network every user on a dropped connection sees it too.
  - *Pass two (A03): no guideline makes an airplane-mode test mandatory, so "guaranteed rejection" overstates it. A reviewer sees this card only if they lose network or the first load fails (e.g. a Vercel cold 5xx or slow DNS on review Wi-Fi); when they do, it is a clean 2.1 screenshot. Likely to be seen at some point, not certain at submission.*
- **THE FIX:** (amended in pass two)
  - *Pass-one fix, retained:* Stop inferring. Write the origin into the shell at sync time. Add a step before `cap sync`, for example `scripts/write-shell-config.mjs`, that writes `native-shell/shell-config.js` containing `window.__VALLO_ORIGIN__="https://www.vallospaces.com";` and fails if `CAPACITOR_SERVER_URL` is unset. Load it in `index.html` with a `<script src="shell-config.js">`. Base `configured` on `window.__VALLO_ORIGIN__`, and have the retry do `location.replace(window.__VALLO_ORIGIN__ + "/home")`. Keep the "no server" card only for a build where that global is missing. Also add a `navigator.onLine`/`online` event listener that retries automatically. Then prove it on a device: cold start in airplane mode, and a warm session with Wi-Fi toggled.
  - *Pass-two amendments:*
    - The sync-time `shell-config.js` is required: on Android `window.WEBVIEW_SERVER_URL` already equals the origin, but on iOS it does not.
    - `location.replace(origin + "/home")` sends a signed-out user through the sign-in wall (STORE-P2-04). Prefer `origin + "/"`, or the start path chosen in STORE-04.
    - Add the `online` listener, as pass one says.
    - Add a unit test that fails if `index.html` references any `window.Capacitor.*` member absent from `node_modules/@capacitor/core/types/definitions-internal.d.ts`.
- **EFFORT:** 2–3 hours, plus a device test.
- **PASS TWO:** SEVERITY CHANGED CRITICAL→HIGH — fix amended. Evidence is real: Capacitor 8.5.2 has no `getConfig` (0 hits in `core/dist/*.js` and both `native-bridge.js`); the bridge exposes only `cap.getServerUrl = () => webviewServerUrl` (native-bridge.js:824-825) plus `window.WEBVIEW_SERVER_URL`, which on iOS is `capacitor://localhost` (`CapacitorBridge.swift:218` → `JSExport.swift:18`) and on Android is the server origin (`Bridge.java:626-637`); Android's `getErrorUrl()` is `https://localhost/index.html`, so the card appears on Android too.

#### STORE-02 | APPLE 4.8 | CRITICAL | Google sign-in is offered and Sign in with Apple is not
- **WHAT IS WRONG:** The live sign-up screen shows Email and "Continue with Google" only. Guideline 4.8 requires an equivalent privacy-preserving option (in practice, Sign in with Apple) whenever a third-party social login is offered.
- **WHERE:** `apps/web/src/lib/auth/providers.ts:69` (`const DEFAULT_SOCIALS = ["google"] as const;`). Live `https://www.vallospaces.com/sign-up`.
- **EVIDENCE:** Playwright at 390px as the iPhone UA on `/sign-up` found the buttons "Continue / Continue with Google / Sign in / What Vallo is / Terms / Privacy Policy / Community Rules". There is no Apple button (screenshot `work/A08/shots/signup.png`). The code path for Apple exists (`lib/auth/actions.ts:823 startOAuth("apple")`) and is switched off.
- **WHY IT MATTERS:** This is a certain rejection on first submission.
- **THE FIX:** (amended in pass two)
  - *Pass-one fix, retained:* Pick one of two.
    - **(a) Ship Apple.** Apple Developer (org) → Services ID + Sign in with Apple key. Supabase → Auth → Apple provider (client ID = Services ID, secret JWT from the key). Set `NEXT_PUBLIC_AUTH_PROVIDERS=google,apple` in Vercel. On iOS native, use native Sign in with Apple (`@capacitor-community/apple-sign-in`) plus `supabase.auth.signInWithIdToken({provider:'apple', token})` rather than the web redirect; the web redirect has the return problem in STORE-03.
    - **(b) For v1 only, hide Google on iOS native.** In `AuthChoices`, skip social buttons when `looksNative() && Capacitor.getPlatform()==='ios'`. With email/password only, 4.8 does not apply.
    (b) is an hour and unblocks submission. (a) is the real answer.
  - *Pass-two amendments:*
    - The equivalent service need not be Apple: any login meeting the three properties satisfies 4.8. Sign in with Apple is simply the practical one.
    - Option (b), "hide Google when native iOS": `AuthChoices` is fed by `getProviderStates()` on the server, so a client-only `looksNative()` hide renders Google for a frame, then removes it. Gate it on the server as well: the shell can append a UA suffix via Capacitor's `appendUserAgent`/`overrideUserAgent` config, and the server can check that.
- **EFFORT:** (b) 1–2 h. (a) 1–2 days, including the Apple portal work.
- **PASS TWO:** CONFIRMED (CRITICAL) — fix amended. Reviewer: `providers.ts:69` `DEFAULT_SOCIALS = ["google"]`; live `/sign-up` contains "Continue with Google" (×2 in HTML) and no Apple option. Under current 4.8, an app using a third-party login for the primary account must also offer an equivalent login service that limits data to name and email, allows keeping email private and does not track; Vallo's own email/password is not "another login service", so the rule applies.

#### STORE-03 | DEEP LINKS / OAUTH | HIGH | "Continue with Google" cannot complete in either native app; universal links and App Links are placeholders
- **WHAT IS WRONG:** On native, OAuth leaves the web view for the system browser. The return to `https://www.vallospaces.com/auth/callback` must be caught by a verified universal link or App Link, and both association files carry placeholders:
  - AASA `appIDs: ["PLACEHOLDER_REPLACE_WITH_APPLE_TEAM_ID.com.vallospaces.app"]`.
  - assetlinks `"PLACEHOLDER_REPLACE_WITH_PLAY_APP_SIGNING_SHA256_…"`.
  - `App.entitlements` is not referenced by the Xcode project, by design until the Apple account exists.

  So the person authenticates in Safari or Chrome and the app stays signed out. Even with the files filled, a server-side 302 to a universal link inside SFSafariViewController is not reliably handed to the app by iOS. The robust pattern is ASWebAuthenticationSession or native SDK sign-in plus `signInWithIdToken`.
- **WHERE:** live `https://www.vallospaces.com/.well-known/apple-app-site-association` and `/.well-known/assetlinks.json` (both 200, placeholders). `apps/web/ios/App/App/App.entitlements` (comment: "This file is INERT"). `apps/web/android/app/src/main/AndroidManifest.xml` intent-filter `autoVerify="true"`.
- **EVIDENCE:** curl output of both files, quoted above in the verdict table (B5).
- **WHY IT MATTERS:** If a reviewer taps Google and nothing happens, that is a 2.1 rejection. Shared links open the browser, not the app.
- **THE FIX:** (amended in pass two)
  - *Pass-one fix, retained:* 
    1. Founder values: Team ID into the AASA, and Play app-signing SHA-256 plus upload SHA-256 into assetlinks. Add the Associated Domains capability in Xcode.
    2. Replace redirect OAuth on native with native Google Sign-In (e.g. `@capgo/capacitor-social-login`) plus `supabase.auth.signInWithIdToken({provider:'google', token})`. That removes the dependency on the return journey completely.
    3. Until 1 and 2 are done, hide social buttons on native (same guard as STORE-02 (b)).
  - *Pass-two amendments:*
    - A cause pass one did not state: PKCE's code verifier is a cookie set in the **WKWebView** jar, while the callback runs in the **SFSafariViewController** jar. Even with a verified universal link, the only working path is one where the callback URL is handed back to the WKWebView (via `appUrlOpen` → webview navigation). If iOS does not hand it over (a server 302 inside SFSafariViewController often does not trigger universal links), `exchangeCodeForSession` fails for lack of the verifier. So native SDK sign-in plus `signInWithIdToken` is the fix, not filling the AASA alone.
- **EFFORT:** 1 day of code, plus founder portal steps.
- **PASS TWO:** CONFIRMED (HIGH) — fix amended (PKCE verifier lives in the wrong cookie jar). Reviewer reproduced the live AASA `appIDs: ["PLACEHOLDER_REPLACE_WITH_APPLE_TEAM_ID.com.vallospaces.app"]` and assetlinks `PLACEHOLDER_REPLACE_WITH_PLAY_APP_SIGNING_SHA256…`; OAuth is handed to `Browser.open` (SFSafariViewController / Custom Tab) by `lib/native/external-links.ts`, because Google refuses embedded web views. Partly the same fix as STORE-02 (b). (DOC-13 is the deep-link gate for the same placeholders.)

#### STORE-04 | APPLE 4.2 | CRITICAL | The native case is thin, push is not in the native projects, and the app opens on a marketing website
- **WHAT IS WRONG:** Each capability is listed with what is actually wired.

  | Capability | package.json | Native project | Called from JS | Reachable in UI |
  |---|---|---|---|---|
  | Splash | yes | yes (SPM + gradle) | `lib/native/splash.ts` | at launch |
  | Status bar | yes | yes | `status-bar.ts` | always |
  | Keyboard inset | yes | yes | `keyboard.ts` | forms |
  | Hardware back (Android) | `@capacitor/app` | yes | `back-button.ts` | Android only |
  | System-browser handoff | `@capacitor/browser` | yes | `external-links.ts` | payment and OAuth |
  | Deep links | `@capacitor/app` | yes | `deep-links.ts` | **inert** (STORE-03) |
  | **Push** | yes (`^8.0.4`, but **missing from package-lock**, so `npm ci` fails) | **NO**: absent from `ios/App/CapApp-SPM/Package.swift` and `android/app/capacitor.build.gradle`. `aps-environment` is in an unlinked entitlements file. `google-services.json` has a placeholder key. | `components/app/push/enrol.ts:240` | only Settings → Notifications → "Yes, tell me" |
  | Share sheet | no plugin | — | `navigator.share` (WebKit's, not native) | listing, profile, post, story |
  | Haptics | no | — | `navigator.vibrate(8)` (a no-op on iOS) | — |
  | Biometrics | no | — | — | — |
  | Camera | no plugin | WebKit file input only | — | uploads |
  | Location | no plugin | WebView geolocation + plist string | map locate and listing pin | yes |
  | Offline content | none on iOS (no SW in WKWebView) | — | — | STORE-01 |

  The app's first screen is `/`, the public landing page. It has a site header, a "Stay connected" newsletter, a Careers link and store badges (STORE-06). A reviewer's first thirty seconds look like a website in a frame.
- **WHERE:** `apps/web/capacitor.config.ts` (`server.url` = origin, start `/`), `apps/web/ios/App/CapApp-SPM/Package.swift` (5 plugins, no PushNotifications), `apps/web/android/app/capacitor.build.gradle` (5 plugins), `apps/web/src/lib/native/boot.ts`.
- **EVIDENCE:** The Package.swift dependency list is `CapacitorApp, CapacitorBrowser, CapacitorKeyboard, CapacitorSplashScreen, CapacitorStatusBar`. The capacitor.build.gradle `dependencies` block lists the same five. Live Playwright on `/` found the footer links "About Us, Careers, List your property … Delete account" and the badges `['Download on the App Store','GET IT ON Google Play']`.
- **WHY IT MATTERS:** 4.2 (and 4.2.2, "repackaged website") is the most common rejection for Capacitor remote-origin shells. Today the argument is status bar plus splash plus keyboard, which reviewers routinely reject.
- **THE FIX:** (amended in pass two)
  - *Pass-one fix, retained:* (in order of value to the argument)
    1. **Push working end to end.** Run `npx cap sync` with the plugin, commit the regenerated SPM and gradle files, link the entitlements, set up the APNs key and FCM key, and set the server env (APNS_*). Ask for permission at a real moment, such as after the first saved listing or the first sent message, not only in Settings.
    2. **Native share sheet** via `@capacitor/share` in `ListingActions.shareElsewhere` and ProfileShare/StoryViewer/Feed when native.
    3. **Haptics** via `@capacitor/haptics` in `Button` when native.
    4. **Biometric lock on the wallet**, for example `@aparajita/capacitor-biometric-auth`, required before Send or Add money.
    5. **Native camera** via `@capacitor/camera` for listing photos and KYC capture.
    6. **Native start at `/home`** (or `/welcome` signed out), never `/`. In native, hide the site header, footer, newsletter and AppBand (a `data-native` attribute set in `boot.ts` plus CSS).
    7. **Offline content**: cache saved listings and upcoming bookings for offline reading with `@capacitor/preferences`.
    8. **Review notes plus a 30-second screen recording** showing push arriving, the biometric wallet, the share sheet and camera capture.

    Items 1, 2, 4 and 6 together make a defensible case. The long-term alternative (an Expo app) is priced in `docs/MOBILE.md`.
  - *Pass-two amendments:*
    - Item 6 can be done in config: Capacitor 8 supports `server.appStartPath`. Set it to `/welcome` (public, 200 signed out) rather than the landing page. The `home-or-landing` route answers `/` for strangers, so do not use it.
    - A reviewer demo that includes "list a property" would fail today: the create-listing flow is broken for every agent (DB-03).
- **EFFORT:** 3–5 days of code, plus a device test on both platforms.
- **PASS TWO:** CONFIRMED (CRITICAL, a probable-rejection judgement) — fix amended. Reviewer: `Package.swift` depends on exactly `CapacitorApp, CapacitorBrowser, CapacitorKeyboard, CapacitorSplashScreen, CapacitorStatusBar`, and `capacitor.build.gradle` on the same five; `@capacitor/push-notifications@8.1.2` is installed and in `apps/web/package.json:20` but has 0 mentions in `package-lock.json`; `/` is the landing page for everyone (`proxy.ts:163` `PUBLIC_PATHS` has "/", `app/page.tsx` renders `LandingBody` unconditionally, no signed-in redirect).

#### STORE-05 | 2.3.1 / PLAY MISREPRESENTATION | HIGH | The public landing page (the shell's first screen) shows example listings with no "Example" label, under a "Verified homes" headline
- **WHAT IS WRONG:** The landing hero cards are drawn from example rows (ids `ed000000-…`) and render title, place and price with no Example badge. Next to them the copy says "Verified homes, land, hotels and shortlets across Nigeria". The signed-in home hero says "Rent, buy or invest in verified properties across Nigeria". There are 0 real listings and 0 verified ones. Inside the catalogue every card correctly says "Example".
  - (from STORE-21) The home tiles are `Buy>/search?market=buy`, `Rent>/search?market=rent`, `Manage>/profile/setup`, `Invest>/search?market=buy`. "Invest" promises an investment product that does not exist — the same "invest" claim as the `heroLede` ("Rent, buy or invest in verified properties…", `en.ts:5388`) — which is awkward next to the Play financial declaration (STORE-09); a reviewer may ask about investment licensing.
- **WHERE:** `apps/web/src/components/site/landing/LandingBody.tsx:41` (`cards: featured.map((l) => toMiniListing(l, t))`) and `apps/web/src/lib/site/listing-card.ts`, which carries no example flag (grep for demo or example returns 0). Hero copy is in `packages/i18n/src/locales/en.ts` (landing sub) and the home hero.
- **EVIDENCE:** The live `/` RSC payload contains `"cards":[{"id":"ed000000-0000-4000-8000-00000000003a","href":"/listing/ed000000-…3a","title":"One bedroom shortlet in Wuse 2","place":"Wuse 2, Abuja","priceMinor":7000000,…,"verified":false,"market":"Per night"}`. The badge rendered is only "Per night" (`work/A08/shots/landing.png`). The rendered page includes `<p class="nf-rise nf-rise-3 nf-landing-sub">Verified homes, land, hotels and shortlets across Nigeria.` `/home` screenshot: "Rent, buy or invest in verified properties across Nigeria."
- **WHY IT MATTERS:** This is the one public surface and the app's first screen. An unlabelled fake price next to "Verified" is exactly what 2.3.1, 1.1.6 and Play's Misrepresentation policy name. It is also a consumer-protection (FCCPC) exposure.
- **THE FIX:** (amended in pass two)
  - *Pass-one fix, retained:* Add `isExample` to `MiniListing` and render the same Example badge the catalogue uses. Better, for the landing page: show no listing cards until real supply exists. Replace "Verified" in both heroes with a true claim, e.g. "Homes, land, hotels and shortlets across Nigeria, with the person behind each listing named".
  - *Pass-two amendments:*
    - (from STORE-21) Fix both "invest" strings together: rename the "Invest" tile to "Land" or "Commercial" and point it at that market, or remove it, and drop "invest" from `heroLede`.
- **EFFORT:** 1–2 hours.
- **PASS TWO:** CONFIRMED (HIGH). Absorbs STORE-21 (LOW), MERGED INTO this ID at the reviewer's recommendation. Reviewer: live `/` HTML contains the five `ed000000-…3a/3b/3c/3d/3f` example ids with titles ("One bedroom shortlet in Wuse 2", "Five bedroom villa on Banana Island", …), and a case-insensitive grep for "example" over the whole page returns 0; `en.ts:533` is the "Verified homes…" lede and `en.ts:5388` the `heroLede`.
  - *Also reported as UX-03 (A05 UX, MERGED INTO this ID in pass two):* the same unlabelled example cards under "Verified homes…". Added evidence: `curl -s https://www.vallospaces.com/ | grep -o "Example[^<]{0,40}"` → no output, and the landing line "Any figure on this page is read from the platform as the page loads" (true of the numbers, not of the implied realness). Fix option carried: show no listing cards on the landing until a real one exists, and say "Homes, land, hotels and shortlets across Nigeria, with every lister checked by a person before they publish".
  - *Also reported in part by UI-03 (A06 interface, partly merged):* the landing lede (`en.ts:533`) and the home hero (`en.ts:5388`) strings belong here. A05's amendment: making "verified" conditional on the row's flag is unsafe until DB-01 is fixed (any member can self-publish `verified=true`), so delete the word rather than make it conditional. UI-03 stays active for the `/rent` and agent-pitch claims.

#### STORE-06 | APPLE 2.3.10 | HIGH | The iOS app shows a "GET IT ON Google Play" badge (and "Download on the App Store")
- **WHAT IS WRONG:** `AppBand` renders both store badges on the landing page. The landing page is what the shell loads. With the store URLs unset, both link to `/start`.
- **WHERE:** `apps/web/src/components/site/landing/AppBand.tsx:11-12, 55-68`, mounted at `LandingBody.tsx:85`. Copy is in `packages/i18n/src/locales/en.ts:721-724`.
- **EVIDENCE:** Live Playwright text on `/`: `storebadges: [ 'Download on the App Store', 'GET IT ON Google Play' ]`.
- **WHY IT MATTERS:** 2.3.10 forbids references to other mobile platforms in the app. A "download the app" badge inside the app is also a 4.2 "website" tell.
- **THE FIX:** Do not render `AppBand` when native (a `looksNative()` check in a small client wrapper, or the `data-native` CSS hide from STORE-04 item 6). Better, do not load `/` in the shell at all.
- **EFFORT:** 1 hour.
- **PASS TWO:** CONFIRMED (HIGH). Reviewer: live `/` contains "App Store" ×2 and "Google Play" ×2 ("GET IT ON"); `AppBand.tsx:32-33` fall back to `/start`. Largely resolved by the STORE-04 start-path change, but keep the native hide for any in-app route that renders `AppBand`.
  - *Also reported as UI-07 (A06 interface, pass one CRITICAL; MERGED INTO this ID in pass two at HIGH):* both badges fall back to `/start` → `/welcome?next=/sign-up` (`AppBand.tsx:32-33`, `IOS_HREF = process.env.NEXT_PUBLIC_APP_STORE_URL || "/start"`); no `isNativePlatform`/`data-native` guard exists on the landing. Fix addition: render each badge only when its store URL env var is set, render neither when `Capacitor.isNativePlatform()` is true, and delete the unbackable band claims "Full access to all features" and "Secure and fast" (`AppBand.tsx:48`, `en.ts:724-729`).
  - *Also reported as UX-26 (A05 UX, pass one LOW; MERGED INTO this ID, which carries HIGH):* the badges sit beside "Vallo installs from your browser"; Apple's and Google's badge terms require the badge to link to the store listing. Hide them until the store URLs exist, then link `apps.apple.com/…` / `play.google.com/…`; keep "Add to home screen" as plain text.

#### STORE-07 | APPLE 5.1.2(i) | CRITICAL | User messages go to Anthropic with no disclosure and no consent, and the privacy policy is silent about it
- **WHAT IS WRONG:** The AI assistant (`/api/assistant`), the support desk (`/api/support`) and the social bot (`lib/social/bot-actions.ts`) send user-authored text to `https://api.anthropic.com/v1/messages`. The live `/assistant` screen shows only "AI Assistant. Always here. Ask anything…" and suggestion chips. There is no statement that a third-party AI processes what is typed, and no consent step. The privacy policy mentions AI, assistant, Anthropic or Claude 0 times. Since November 2025, guideline 5.1.2(i) requires clear disclosure of sharing personal data with third-party AI and explicit permission before doing so.
- **WHERE:** `apps/web/src/app/api/assistant/route.ts:53` (`ANTHROPIC_URL`), `apps/web/src/lib/social/bot-actions.ts:87`, `apps/web/src/app/api/support/route.ts`, `apps/web/src/lib/legal/privacy.tsx` (no mention). Live `https://www.vallospaces.com/assistant`.
- **EVIDENCE:** Assistant page text as the QA member: "Skip to content AI Assistant Always here. Ask anything. How can I help today? Ask about somewhere to rent or buy… Message Vallo AI". Counting mentions in `privacy.tsx` (grep -ci): `assistant 0, artificial 0, Anthropic 0, Claude 0`. Whether the production Anthropic key is set is UNVERIFIED: I did not send a message.
- **WHY IT MATTERS:** This is a named rejection ground under 5.1.2(i). The Play Data safety form must also list "Messages / other in-app content → processed by a service provider". It is an NDPA transparency gap too (cross-border transfer to the US).
- **THE FIX:** (amended in pass two)
  - *Pass-one fix, retained:* 
    1. On first use of `/assistant`, and on the support form when AI triage is used, show a one-time sheet: "Vallo AI is powered by Anthropic. What you type here is sent to Anthropic to answer you and is not used to train their models. [Continue] [Not now]". Store consent in `profiles.settings.ai_consent_at` and refuse server-side without it.
    2. Add a privacy policy subsection "AI features" naming Anthropic, the US transfer and the retention.
    3. Label bot posts in the social feed as automated.
  - *Pass-two amendments:*
    - Enforce consent server-side in both `/api/assistant` **and** `/api/support` (return 403 `ai-consent-required`), not only in the UI.
    - Make the support form usable without AI (a human-only path): consent that gates getting help is not freely given.
- **EFFORT:** 4–6 hours.
- **PASS TWO:** CONFIRMED (CRITICAL) — fix amended (enforce consent server-side on both routes; keep a human-only support path). Reviewer: `api.anthropic.com` appears in `app/api/assistant/route.ts`, `app/api/support/route.ts` and `lib/social/bot-actions.ts`; `privacy.tsx` has 0 hits for anthropic, claude, artificial, assistant or " AI"; in the live `/privacy` visible text (10,138 chars) the only "AI"/"assistant" hits are the site nav.

#### STORE-08 | PRIVACY POLICY vs CODE | HIGH | The policy does not describe what the code does, so the nutrition label and the Data safety form cannot be answered truthfully
- **WHAT IS WRONG:**

  | The policy says | The code does |
  |---|---|
  | "Service providers: Hosting, **analytics** and communication providers" (`privacy.tsx` §5) | No analytics SDK exists. Crash reporting goes to Sentry (`lib/observability/report.ts`, when `SENTRY_DSN` is set), and the policy never names crash data. |
  | Nothing about location | The listing "use my location" pin posts device coordinates, which are stored on the listing (Info.plist string and AndroidManifest comment both say so). |
  | Nothing about AI | Anthropic (STORE-07) |
  | Nothing about push | `push_tokens` stores FCM, APNs and Web Push tokens with a device label (`lib/push/devices.ts`) |
  | "Technical data… how you move through the product" | Server logs only, no product analytics |
  | Posts, stories, follows, public profile | 1 mention of "posts". Public social content and its visibility are not described. |
  | Processors are unnamed | Supabase (EU, Ireland), Vercel (US), Paystack, Resend (email), MapTiler (map tiles, which see the IP and viewport), OpenStreetMap tiles (`lib/maps/tiles.ts`), LiteAPI (stays inventory), FCM (Google), APNs (Apple), Anthropic, Sentry. Termii and Google Places: 0 references in `src`, so not used. |
  | NDPC registration | `COMPANY_NDPC_REGISTRATION = null` (`lib/legal/company.ts:76`) |
- **WHERE:** `apps/web/src/lib/legal/privacy.tsx:75-200`, `apps/web/src/lib/legal/company.ts:76`, and `docs/MOBILE_READINESS.md` §5, which is stale: it says "Analytics, crash reporting: None" and "Push notifications are not wired".
- **EVIDENCE:** grep counts in `privacy.tsx`: `location 0, coordinates 0, push 0, Anthropic 0, Paystack 0, Supabase 0, Resend 0, MapTiler 0, LiteAPI 0, Firebase 0`. Processor grep in `src`: anthropic 3 files, maptiler 4, resend 16, paystack.co 7, googleapis (FCM) 1, push.apple.com 1, liteapi 3, sentry (observability) 3, termii 0.
- **WHY IT MATTERS:** 5.1.1(i) and Play's User Data policy both require the policy to match collection. Reviewers compare the policy with the label, and a mismatch is a rejection or a later takedown. Under NDPA the notice is "defective", in the policy file's own words.
- **THE FIX:** (amended in pass two)
  - *Pass-one fix, retained:* Rewrite §2, §5 and §6 from the derived inventory below. List the processors by name with country. Remove "analytics". Add location, AI, push tokens, crash data and public social content. Bump `PRIVACY_VERSION`, which triggers re-acceptance, and then re-run the reviewer seed so its hardcoded `2026-09-22` receipts match (`scripts/seed/store-reviewer.mjs:62-63`). Correct `docs/MOBILE_READINESS.md` §5.
  - *Pass-two amendments:*
    - Add to the inventory three data sets pass one missed: `account_identities.email_canonical` (a canonical copy of every account's email, created in `20260923163049` and **not removed by the account purge**, STORE-P2-02); `known_devices` (device fingerprint and "device words"); `price_check_watches.lat/lng` (a user's saved coordinates).
    - Remove the analytics-cookie claim (there are no analytics cookies), not only the "analytics providers" line.
    - Name MapTiler: map-locate sends the user's area to MapTiler through zoom-13 tile fetches (see the A19 note under PASS-TWO CHALLENGES).
- **EFFORT:** 3–4 hours of drafting, plus solicitor review.
- **PASS TWO:** CONFIRMED (HIGH) — fix amended (three more data sets; remove the analytics-cookie claim too). Reviewer reproduced it in the live `/privacy` text: "Hosting, **analytics** and communication providers" and a cookies paragraph claiming "analytics that help us understand how the product is used"; no processor names; grep counts in `privacy.tsx`: 0 for location, push, Paystack, Supabase, Sentry and crash. (A04's SEC-13 covers the same analytics claim.)

#### STORE-09 | REGULATED FINANCE (Apple 5.1.1(ix), Play Financial Services) | CRITICAL | A custodial naira wallet with wallet-to-wallet transfer: an organisation account is required and the licensing position is open
- **WHAT IS WRONG:** The live wallet offers Add money, "Send / To a wallet", "Request / Send a link", Cards and banks, and "New pot". Its ledger kinds are `deposit, withdrawal, payment, refund, transfer_in, transfer_out, escrow_hold, escrow_release, escrow_refund, pot_hold, pot_release`. Apple 5.1.1(ix) requires such an app to be submitted by the legal entity providing the service, so an individual enrolment would be rejected. Play requires the Financial features declaration: answer "digital wallet / P2P money transfer: yes", "crypto: no" (the route is `notFound()`), "loans: no". Play also requires financial-services apps to come from an organisation developer account. The terms admit the regulatory question is open: `lib/legal/terms.tsx:47` says "Holding client funds between two parties is regulated by the Central Bank of Nigeria, and whether this company may operate such a service at all is an open question the owner has not had answered". Either store can ask for the licence.
- **WHERE:** `apps/web/src/app/(app)/wallet/page.tsx`, `supabase/migrations/20260812090000_a_wallet_can_set_money_aside.sql`, `apps/web/src/lib/legal/terms.tsx:47-58, 495-510`.
- **EVIDENCE:** Live `/wallet` text as the QA member: "Total Balance ₦ 0 … Send Receive Add money History Quick Actions Send To a wallet Request Send a link Cards And banks … SET ASIDE New pot". SQL on `pg_enum` returned `wallet_entry_kind = deposit,withdrawal,payment,refund,transfer_in,transfer_out,escrow_hold,escrow_release,escrow_refund,pot_hold,pot_release`.
  - **Corrected in pass two (A03):** the quoted admission at `terms.tsx:47` ("Holding client funds … regulated by the Central Bank of Nigeria … an open question") is a **source-code comment**, not text a user or reviewer sees (`curl /terms | grep -i "central bank"` returns nothing). The *user-facing* Terms §15 (`terms.tsx:493-511`) says the wallet is "a record … of money you have funded or been refunded … You can move it out to a Nigerian bank account in your own name" and that Vallo "is not a bank or a licensed financial institution". That is worse for review: the live wallet offers "Send / To a wallet" and "Request / Send a link", which the Terms do not describe at all, and "in your own name" is enforced nowhere (DB-05).
- **WHY IT MATTERS:** Enrolling the wrong account type costs weeks (Apple org enrolment needs D-U-N-S, which takes 1–2 weeks). A licence request from review with no answer stalls the app indefinitely.
- **THE FIX:** (amended in pass two)
  - *Pass-one fix, retained:* 
    1. Enrol both stores as **VALLO SPACES LTD (RC 9870413)** with a D-U-N-S number, not as an individual.
    2. Before submission, get a written legal position. Either hold the stored value through a licensed partner (a PSSP/MMO/PSB virtual-account or wallet-as-a-service) and name it in the terms and the review notes, or, for v1, **switch off wallet-to-wallet Send/Request and pots** so the wallet is only a record of card top-ups spent on bookings and refunds received.
    3. Answer the Play Financial features declaration truthfully from whatever ships.
  - *Pass-two amendments:*
    - Bring Terms §15 into line with what ships (P2P transfer, request links, pots, escrow), or switch those features off for v1.
    - Enforce "a bank account in your own name" by comparing the Paystack-resolved name with the KYC name server-side (DB-05's amendment).
- **EFFORT:** Code toggle 2–4 h. Legal: founder and solicitor, weeks.
- **PASS TWO:** CONFIRMED (CRITICAL) — evidence amended (the CBN admission is a code comment; the published Terms under-describe the money product) and fix amended (align Terms §15 or switch features off; enforce "own name").

#### STORE-10 | APPLE 2.1 / PLAY APP ACCESS | HIGH | No reviewer account exists; the whole product is behind sign-in
- **WHAT IS WRONG:** After item 8, nothing past the landing page and the policies is visible signed out, so both review forms need credentials. The seed script is written but has never been run.
- **WHERE:** `scripts/seed/store-reviewer.mjs`, `docs/STORE_SUBMISSION_NOTES.md` §2.
- **EVIDENCE:** SQL `select count(*) filter (where email ilike '%review%' or email ilike '%apple%' or email ilike '%store%'), count(*) from auth.users` returned `reviewerish 0, total 10`. The QA member account signs in through the live `/sign-in/email` and lands on `/home` (Playwright), so the mechanism works.
- **WHY IT MATTERS:** This is the first rejection reason on both stores.
- **THE FIX:** The founder runs the script (`--dry-run` first) with a dedicated address such as `appreview@vallospaces.com` and a 12+ character password, and pastes it into App Store Connect "Sign-In Information" and Play "App access". The review notes are the five facts in STORE_SUBMISSION_NOTES §2. **Re-run the script after any legal version bump** (STORE-08).
- **EFFORT:** 15 minutes (founder).
- **PASS TWO:** CONFIRMED (HIGH). Reviewer re-queried: `auth.users` total 10, reviewer-like addresses 0; `scripts/seed/store-reviewer.mjs` hardcodes terms and privacy `2026-09-22`, which equals `lib/legal/versions.ts:29,36`, so there is no re-acceptance gate today.

#### STORE-11 | APPLE 2.1 / 4.2 | HIGH | All 64 listings and all 5 stays are examples: a marketplace with no supply reads as "placeholder content"
- **WHAT IS WRONG:** The labelling is honest (Example badge; listing meta "This is an example listing. No such property is available. Vallo has not verified anything on this page."). But a reviewer who books nothing and finds nothing real can apply 2.1 ("placeholder content") or 4.2 ("not useful yet").
- **WHERE:** live `/search` and `/listing/ed000000-0000-4000-8000-00000000003f` (banner true, meta as quoted).
- **EVIDENCE:** Playwright: the first listing page has `example banner: true`, `og:title=An example listing on Vallo`. `STORE_SUBMISSION_NOTES.md` §2 counts real supply = 0.
- **WHY IT MATTERS:** This is a judgement call by the reviewer. It is likely to cost one rejection round, not a wall.
- **THE FIX:** Before submission, publish at least 10–20 real, verified listings in Lagos and Abuja (the founder's own network) and one real stay, so the catalogue has real rows next to the examples. Keep the examples labelled. Say it plainly in the review notes: "launch market; example listings are labelled as such". Fix STORE-05 so the one unlabelled place is gone.
- **EFFORT:** Founder supply work, days.
- **PASS TWO:** CONFIRMED (HIGH). The judgement call is honestly described.

#### STORE-12 | APPLE 5.1.1(v) | MEDIUM | A wallet balance blocks in-app deletion, and withdrawal depends on Paystack transfers that the current plan cannot make
- **WHAT IS WRONG:** `blockersFrom` refuses deletion while `walletBalanceMinor > 0` and points to `/wallet`. The brief says payouts to third parties are not possible on the current Paystack plan. Anyone with a balance on that day cannot finish deletion in the app. Apple requires deletion without "unnecessary hoops". Otherwise deletion is sound (read only, never executed): `purge_account_rows` deletes social content, saved items, notifications, devices, documents and payment methods; scrubs the profile, bookings contact details and wallet metadata; bans and scrubs `auth.users` and deletes identities and sessions; and the Vercel cron `/api/cron/account-purge` runs daily. Messages sent are kept (`messages_kept` count), and the policy says so (§7).
- **WHERE:** `apps/web/src/lib/account-deletion/preconditions.ts:80-81`, `supabase/migrations/20260919160100_b5_the_purge_runs_in_one_transaction.sql`, `apps/web/vercel.json` (cron `15 3 * * *`).
- **EVIDENCE:** `if (reading.walletBalanceMinor > 0) { blockers.push({ kind: "wallet-balance", href: "/wallet", … }) }`. Live SQL: `wallets_with_balance = 0`, `account_deletion_requests = 0`. The in-app path "Delete my account" was seen under Settings → Account Information.
- **WHY IT MATTERS:** Today it affects nobody (0 balances). After launch, a reviewer's re-test or a user complaint could cite it.
- **THE FIX:** (amended in pass two)
  - *Pass-one fix, retained:* When a balance exists, let the deletion be *requested* anyway. Create the request, freeze the wallet, and open a support ticket that refunds to the original funding card through a Paystack refund (which works on the current plan, unlike a transfer), or to a named bank account once transfers are enabled. Purge after the refund settles. The screen should say that.
  - *Pass-two amendments:*
    - `purge_account_rows` does **not** re-check the blockers 30 days later. A balance received during the grace period (a wallet-to-wallet Send *into* the account) is purged over, stranding the money on a banned account. Re-run `account_deletion_blockers` in `due_account_purges` and route blocked requests to support (the same fix as ESC-06/MON-09).
- **EFFORT:** 1 day.
- **PASS TWO:** CONFIRMED (MEDIUM) — fix amended (re-check blockers at purge time). Reviewer: `account_deletion_blockers()` counts `wallet_balances > 0`, held escrow, active bookings or reservations, pending withdrawals, **published listings** and live businesses — checked only when deletion is requested. Same root cause as ESC-06 and MON-09.

#### STORE-13 | APPLE | MEDIUM | The app is declared universal (iPhone + iPad), which forces iPad screenshots and iPad review
- **WHAT IS WRONG:** `TARGETED_DEVICE_FAMILY = "1,2"` in both build configurations. The product is designed at 390px, and no iPad layout was ever verified.
- **WHERE:** `apps/web/ios/App/App.xcodeproj/project.pbxproj:316, 337`.
- **EVIDENCE:** `grep TARGETED_DEVICE_FAMILY` → `"1,2"` twice.
- **WHY IT MATTERS:** iPad 13" screenshots become mandatory, and Apple reviews iPhone-plus-iPad apps on iPad. Any layout gap at 1024px or wider (and split view) is a 2.1/4.0 rejection.
- **THE FIX:** Set it to `1` for v1. The app still runs on iPads in iPhone compatibility mode.
- **EFFORT:** 5 minutes.
- **PASS TWO:** CONFIRMED (MEDIUM). Reviewer: `project.pbxproj:316,337` `TARGETED_DEVICE_FAMILY = "1,2"`.

#### STORE-14 | PLAY | LOW | The documented release build produces an APK; Play requires an AAB, and nothing builds natively in CI
- **WHAT IS WRONG:** `docs/MOBILE_READINESS.md:188` and `docs/MOBILE.md:121` say `./gradlew assembleRelease`. New Play apps must upload an Android App Bundle. No workflow builds either native app (`.github/workflows` holds only `ci.yml`).
- **WHERE:** as cited.
- **EVIDENCE:** `grep -n "bundleRelease|assembleRelease" docs/MOBILE*.md` → only `assembleRelease`.
- **WHY IT MATTERS:** The first upload is refused, and it is a confusing afternoon for whoever is building.
- **THE FIX:** Document `./gradlew bundleRelease` → `app/build/outputs/bundle/release/app-release.aab` and enrol in Play App Signing. Add a Codemagic or GitHub Actions macOS job that runs `npm ci && npm run build && npx cap sync && xcodebuild archive` and `bundleRelease`. This also depends on the lockfile fix Agent 10 owns.
- **EFFORT:** Docs 15 min. CI 1 day.
- **PASS TWO:** SEVERITY CHANGED MEDIUM→LOW. `docs/MOBILE_READINESS.md:188` uses `assembleRelease` as a local R8 smoke test, not as an upload instruction, and Play's console tells whoever uploads that it needs an AAB: a one-command learning cost, not a blocker. The "no native CI" half is real but belongs with A10's CI findings (DOC-01).

#### STORE-15 | PUSH (NATIVE) | MEDIUM | Push is written but cannot be demonstrated: plugin not synced, lockfile missing it, FCM key a placeholder, APNs not provisioned
- **WHAT IS WRONG:** `@capacitor/push-notifications` is in `package.json`, but it is absent from the package-lock (so `npm ci` fails; Agent 10 owns this), from `Package.swift` and from `capacitor.build.gradle`. `google-services.json` carries `PASTE_THE_ANDROID_API_KEY_FROM_FIREBASE_HERE`, and `build.gradle:186-200` then fails any release build (correctly). `aps-environment` sits in the unlinked `App.entitlements`. `Info.plist` declares `UIBackgroundModes: remote-notification`. The server transports exist (`lib/push/transport/apns.ts`, `fcm.ts`).
- **WHERE:** as cited. Live `/settings/notifications` says "No device is set up for notifications yet."
- **EVIDENCE:** the Package.swift and gradle lists quoted in STORE-04. `head google-services.json` → `"current_key": "PASTE_THE_ANDROID_API_KEY_FROM_FIREBASE_HERE"`.
- **WHY IT MATTERS:** Push is the strongest single 4.2 argument, and today it cannot be shown. A Play release build cannot be produced at all until the key is pasted.
- **THE FIX:** Founder: Firebase Android API key into `google-services.json` (it is not a secret); Apple APNs `.p8` into server env `APNS_KEY_ID/APNS_TEAM_ID/APNS_PRIVATE_KEY` with `APNS_PRODUCTION=true` for App Store builds; Push capability on the App ID. Code: `npm install` to fix the lock, `CAPACITOR_SERVER_URL=… npx cap sync`, commit the regenerated native files. Device-test a real notification on both platforms.
- **EFFORT:** 3–4 hours once the accounts exist.
- **PASS TWO:** CONFIRMED (MEDIUM), a partial duplicate: the push row of STORE-04 and A10's lockfile finding (DOC-01) cover the same facts. Keep it as the founder checklist item only. (Not in the known-duplicate list; not merged.)

#### STORE-16 | SHARE ARTEFACTS | LOW | The native share sheet and page title carry the agent's free-text listing title, which can name a street
- **WHAT IS WRONG:** `ListingActions.shareElsewhere` calls `navigator.share({ title, url })` with `title = listing.title`, and the page `<title>` is "Example listing: {listing.title} | Vallo". Titles are agent free text, capped only by length. A live example is "Four bedroom detached house for sale on Chevron Drive". The standing rule is that no share artefact carries a specific address. OG and Twitter meta are already generic ("An example listing on Vallo"), and a crawler following the link is redirected to sign-in, so unfurls are safe.
- **WHERE:** `apps/web/src/components/app/listing/ListingActions.tsx:208-214`, `apps/web/src/components/app/listing/ListingGallery.tsx:249-251`, `apps/web/src/app/(app)/listing/[id]/page.tsx:694-696`.
- **EVIDENCE:** Playwright listing page `title=Example listing: Four bedroom detached house for sale on Chevron Drive | Vallo`. SQL: 2 of 64 published titles contain a street word (`Chevron Drive`, `a main road in Yaba`). None has a house number, but nothing prevents one.
- **WHY IT MATTERS:** A tenant-safety and privacy rule breach the first time an agent writes "3 Adeola Odeku Street" into a title. Store policies are not triggered, but it is a product rule.
- **THE FIX:** Build the share title from structured fields only: `${bedrooms}-bedroom ${kind} in ${area}, ${city} on Vallo`. Use it for `navigator.share` and `<title>`. Also add a submit-time validator that rejects titles matching `\d+\s+\w+\s+(street|road|close|avenue|crescent|drive|lane|way)`.
- **EFFORT:** 2 hours.
- **PASS TWO:** SEVERITY CHANGED MEDIUM→LOW. Pass one itself says store policies are not triggered; it is a product privacy rule, out of scope for a store-readiness severity. The evidence (two titles with street words) is fine.

#### STORE-17 | DEV SURFACES IN PROD | LOW | `/preview` answers 200 signed out in production with a 404 body, and its RSC payload lists the preview harness
- **WHAT IS WRONG:** `(dev)/preview` renders the not-found card with HTTP 200 (a soft 404). The streamed payload still contains "Preview harness" and the list of preview routes (lead, f1, f2, f3…). `/preview/session-b/signin` answers 200 with title "Preview: Welcome back | Vallo".
- **WHERE:** `apps/web/src/app/(dev)/preview/*`. Live `https://www.vallospaces.com/preview`.
- **EVIDENCE:** curl `/preview` returned 200 and 41,299 bytes, and grep found `Preview harness\"}],[\"$\",\"ul\"…preview/lead…preview/f1`. The Playwright screenshot shows "404 This page has checked out".
- **WHY IT MATTERS:** A reviewer is unlikely to find it. It is a craft and information leak, and Agent 5/9 may own it.
- **THE FIX:** Exclude `(dev)` from production builds (for example `pageExtensions` gated by env, or `notFound()` in `(dev)/layout.tsx` when `VERCEL_ENV==='production'`, returning a real 404 status).
- **EFFORT:** 30 minutes.
- **PASS TWO:** CONFIRMED (LOW). Reviewer: `curl /preview` → `200 41299` bytes containing "Preview harness"; `/preview/session-b/signin` → 200. The `proxy.ts` comment claims the harness answers not-found on Vercel "unconditionally", but it answers a 200 soft-404 whose payload still lists the harness. (A10's CHECKED AND FOUND SOUND says the preview routes serve the not-found body in production; both are true — the body is not-found, the status is 200.)

#### STORE-18 | ICON / SPLASH | LOW | The icon art is a rounded tile inside a square, so both OS masks crop around a second rounded rectangle; the Android adaptive foreground is double-inset
- **WHAT IS WRONG:**
  - iOS `AppIcon-512@2x.png` (1024 RGB) draws its own glowing rounded-rect border about 4% in from the edge. iOS applies its squircle mask on top, which gives a visible ring and dark corners inside the mask.
  - The Android `ic_launcher_foreground` already places the tile at about 55% of the canvas, and `mipmap-anydpi-v26/*.xml` insets it a further 16.7%, so on the launcher the tile and its "VALLO" wordmark are small.
  - The splash PNG shows a faint square around the tile where the tile's ground differs from `#010118`.
  - The shell's `theme-color` is `#000612` against `#010118` everywhere else.
- **WHERE:** `apps/web/ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png`, `apps/web/android/app/src/main/res/mipmap-*/ic_launcher_foreground.png`, `…/mipmap-anydpi-v26/ic_launcher.xml`, `…/drawable-port-xxhdpi/splash.png`, `native-shell/index.html:7`.
- **EVIDENCE:** Viewed the files. `file` → iOS icon `1024 x 1024, 8-bit/color RGB` (valid, no alpha).
- **WHY IT MATTERS:** Craft only. Stores accept it. First impressions on the home screen suffer.
- **THE FIX:** (amended in pass two)
  - *Pass-one fix, retained:* Commission a full-bleed square master (the mark on the navy ground, no drawn tile border, no text or a larger wordmark), plus a transparent foreground for Android. Regenerate with `scripts/build-native-icons.mjs` and `@capacitor/assets`. Re-cut the splash on exactly `#010118`.
  - *Pass-two amendments:*
    - `mipmap-anydpi-v26/ic_launcher.xml` insets the **background** by 16.7% as well as the foreground. The background layer must be full-bleed (108dp): an inset background leaves an unpainted ring that launchers reveal during parallax and animation. Drop the `<inset>` on the background.
- **EFFORT:** 2 hours, plus the founder artwork.
- **PASS TWO:** CONFIRMED (LOW) — fix amended (Android background layer must be full-bleed). The iOS icon is 1024×1024 RGB with no alpha. The reviewer read the XML and PNG metadata, not the pixels.

#### STORE-19 | AGE | LOW | The Terms require 18+ but sign-up asks nothing about age; the age-rating answers must match
- **WHAT IS WRONG:** `terms.tsx:198` says "You must be at least 18 years old". The sign-up agreement line (`en.ts:1099`) does not mention age. There is no date-of-birth or affirmation.
- **WHERE:** as cited.
- **EVIDENCE:** grep of `en.ts` for "18 or over|at least 18|aged 18|18+" returned 0.
- **WHY IT MATTERS:** Play "Target audience" and Apple age-rating (13+/16+/18+) answers must be consistent with what the app enforces. A money app with UGC should declare 18+ and at least ask.
- **THE FIX:** Add "I am 18 or older" to the existing agreement sentence and record it with the terms receipt. Declare the Play target audience as 18+. Answer the Apple questionnaire truthfully: UGC yes, messaging yes, social yes, no mature content. Apple will likely compute 13+ or 16+; choosing 18+ is allowed.
- **EFFORT:** 1 hour.
- **PASS TWO:** CONFIRMED (LOW). Reviewer: `terms.tsx:198` "at least 18"; `en.ts` has 0 age-affirmation strings.

#### STORE-20 | STORE LISTING ASSETS | LOW | No store screenshots, feature graphic, description, keywords or support mailbox exist
- **WHAT IS WRONG:** The repo has the icon masters and PWA shots (780x1688 and 2560x1600), but no App Store screenshot set (6.9" 1320x2868 required, and 13" iPad if STORE-13 is not taken), no Play phone screenshots or 1024x500 feature graphic, no description, subtitle, keywords, promo text or "what's new". There is no `mailto:` on `/help`, `/contact` or `/privacy`.
- **WHERE:** `find . -iname "*feature-graphic*" -o -iname "*store-listing*" -o -iname fastlane …` → nothing.
- **EVIDENCE:** as above. The live pages have 0 `mailto:` links.
- **WHY IT MATTERS:** Submission cannot be completed without them. Screenshots must come from the shipped build (2.3.3).
- **THE FIX:** After STORE-01/04/05 land, capture from a device or simulator at the required sizes (Playwright at 440x956@3x can pre-draft). Write the metadata. Create `support@vallospaces.com` as a real mailbox, set `NEXT_PUBLIC_SUPPORT_EMAIL`, and use it as the Play developer contact.
- **EFFORT:** 1 day.
- **PASS TWO:** CONFIRMED (LOW). The `mailto:` links exist in code (`contact/page.tsx:78`, `ContactForm.tsx:65,166`) but render only when `NEXT_PUBLIC_SUPPORT_EMAIL` is set, so the live absence is a config fact. The fix is right.

#### STORE-21 | COPY | LOW | The "Invest" tile on home is a second link to the buy search

**The "Invest" tile on home is a second link to the buy search.** The home tile `Invest>/search?market=buy` promises an investment product that does not exist; it is the same "invest" claim as STORE-05's `heroLede` ("Rent, buy or invest in verified properties…"). The pass-two reviewer recommended merging it into STORE-05, which now carries its evidence and fix (rename the tile to "Land" or "Commercial" and point it at that market, or remove it; fix both strings together).

- **PASS TWO:** MERGED INTO STORE-05 (known duplicate; canonical severity HIGH). A03 in pass two: CONFIRMED (LOW), duplicate — merge into STORE-05.

#### NEW IN PASS TWO

#### STORE-P2-01 | APPLE 1.2 / PLAY UGC | HIGH | The objectionable-content filter covers posts and bios only; public comments, stories, reviews, events and DMs are unfiltered, and reviews and businesses cannot be reported
- **WHAT IS WRONG:** 1.2 requires "a method for filtering objectionable material from being posted". The abuse list applies to 2 of 8 UGC surfaces. A slur or sexual solicitation in a story comment, a story headline, an event, a public review or a host's review reply goes live immediately. In a DM it is not even flagged. Reviews, stays, restaurants and events have no report control.
- **WHERE:** `private.scan_story_comment/scan_story/scan_event/scan_review/scan_review_response/scan_message` (live function sources). `lib/reports/schema.ts:88`. `components/app/listing/ListingReviews.tsx`.
- **EVIDENCE:**
  ```
  select t.tgrelid::regclass, p.proname, position('objectionable_pattern' in p.prosrc)>0
  → posts/scan_post t, social_profiles/scan_social_profile t,
    reviews/scan_review f, messages/scan_message f, review_responses f,
    stories/scan_story f, story_comments/scan_story_comment f, events/scan_event f
  ```
  The body of `scan_story_comment` is entirely `keyword_pattern '(payment|transfer|pay me|account number|acct|bank)'` plus `\d{10}`. `blocked_terms`: 133 rows, 12 categories.
- **WHY IT MATTERS:** a reviewer who posts a test slur as a comment (a common 1.2 probe) sees it published. Pass one marked this PASS, so the founder believes it is done.
- **THE FIX:** add `abuse_pattern := private.objectionable_pattern(); if abuse_pattern is not null and <text> ~* abuse_pattern then new.status := 'HELD' …` to `scan_story`, `scan_story_comment` and `scan_event`, as BEFORE triggers the way `scan_post` does. Make `scan_review` and `scan_review_response` BEFORE triggers that hold (or reject with a message) on a match. In `scan_message`, insert a `message_flags` row with reason `abuse` (DMs should flag, not silently drop). Extend `REPORT_TARGETS` with `review`, `business` and `event`, and mount `ReportSheet` on `ListingReviews`, the stay and restaurant pages, and the event page. Add a probe that inserts one blocked term through each surface in a rolled-back transaction and asserts HELD or a flag.
- **EFFORT:** 1 day.
- **PASS TWO:** NEW IN PASS TWO (found by the reviewer, A03). Live `pg_trigger`/`pg_proc` read: only `scan_post` and `scan_social_profile` consult `objectionable_pattern`; the other six scanners only look for 10-digit numbers and payment words; `REPORT_TARGETS = ["listing","conversation","message"]` for the app sheet. Overlaps SEC-05 (A04). A07's review had lowered SEC-05 to MEDIUM; the orchestrator ruled that the store-facing severity wins (a reviewer who posts a slur in an unfiltered comment surface sees it published — a 1.2 / Play UGC rejection) and set **both** to HIGH. Both IDs kept and cross-referenced.

#### STORE-P2-02 | APPLE 5.1.1(v) / PLAY DATA DELETION | MEDIUM | The account purge has never run for real, keeps the email in canonical form, and leaves device tokens, fingerprints and saved coordinates
- **WHAT IS WRONG:** see the challenged A16 row. The purge scrubs `auth.users.email` but leaves `account_identities.email_canonical` (for Gmail that is the actual mailbox) tied to the same uuid. It also leaves `push_tokens`, `known_devices`, `price_check_watches` and `email_outbox`. Blockers are not re-checked at purge time.
- **WHERE:** `public.purge_account_rows(uuid)` (live source). The migration `20260923163049_one_mailbox_many_accounts…` added `account_identities` after the purge was written. `apps/web/src/lib/account-deletion/*` has 0 references to these tables.
- **EVIDENCE:** `grep -rn "push_tokens|known_devices|account_identities|price_check_watches|email_outbox" apps/web/src/lib/account-deletion/` → nothing. `audit_log` purge actions: `cron.account-purge.ok ×1` (0 requests processed).
- **WHY IT MATTERS:** both stores require deletion of the account "and associated data". The privacy policy (§7) will then misstate retention. A dry run is the only way to know the one-transaction purge actually commits against today's constraints.
- **THE FIX:** add `delete from public.push_tokens / known_devices / price_check_watches / email_outbox where user_id = v_user;` and `delete from public.account_identities where user_id = v_user`. If the fraud signal must survive, store an HMAC of the canonical email instead and say so in the policy. Re-check `account_deletion_blockers` in `due_account_purges`. Then run one end-to-end purge on a throwaway account (created, requested, `purge_after` set to the past, cron fired) and record the `counts` JSON as evidence.
- **EFFORT:** half a day.
- **PASS TWO:** NEW IN PASS TWO (found by the reviewer, A03). Live `purge_account_rows` source read; `grep -rn "push_tokens|known_devices|account_identities|price_check_watches|email_outbox" apps/web/src/lib/account-deletion/` → nothing; `audit_log` purge actions: `cron.account-purge.ok ×1` (0 requests processed). Related: SEC-13 (same purge gaps for `known_devices`, `email_outbox`, `account_identities`), SEC-10 (HMAC instead of plaintext), ESC-06/MON-09 (re-check blockers at purge time).

#### STORE-P2-03 | APPLE 5.1.1 / CRASH | HIGH | The listing-video upload offers "Take Video" on iOS, but the app has no microphone usage string and its camera string promises it never records video
- **WHAT IS WRONG:** `VideoWalkthrough.tsx:284-288` renders `<input type="file" accept="video/mp4,video/quicktime,video/webm">`. In WKWebView this opens the iOS picker with a "Take Video" option. Recording video with sound requires `NSMicrophoneUsageDescription`, which `Info.plist:181` deliberately omits ("Nothing records audio"). An app that accesses a privacy-protected resource without its usage string is terminated by iOS. Separately, `NSCameraUsageDescription` says "Vallo never records video", which becomes false the moment "Take Video" is offered. That is itself a 5.1.1 accuracy problem.
- **WHERE:** `apps/web/src/components/agent/VideoWalkthrough.tsx:284-288`; `apps/web/src/lib/agent/listings-schema.ts:133`; `apps/web/ios/App/App/Info.plist:176-181`.
- **EVIDENCE:** source as quoted. This is the only `accept` containing video in `src` (grep of `accept=`). Device behaviour is **UNVERIFIED**: there is no Xcode in the container.
- **WHY IT MATTERS:** an agent adding a walkthrough on iPhone crashes the app. A reviewer given an agent account who taps "Take Video" crashes it too, which is a 2.1 rejection.
  - *Severity note (pass one's heading said "HIGH (UNVERIFIED on device)"):* UNVERIFIED on device.
- **THE FIX:** either add an accurate `NSMicrophoneUsageDescription` ("Vallo uses the microphone only while you record a walkthrough video of a property you are listing") and correct the camera string, or pass `capture` handling so only the library is offered for video. Verify on a device.
- **EFFORT:** 30 minutes plus a device test.
- **PASS TWO:** NEW IN PASS TWO (found by the reviewer, A03). Source as quoted (`VideoWalkthrough.tsx:284-288`, the only `accept` containing video in `src`; `Info.plist:176-181`). Device behaviour UNVERIFIED: no Xcode in the container.

#### STORE-P2-04 | APPLE 5.1.1(v) | HIGH | Every catalogue screen requires an account: a signed-out reviewer cannot browse a single listing, stay or restaurant
- **WHAT IS WRONG:** guideline 5.1.1(v) says "If your app doesn't include significant account-based features, let people use it without a login", and apps may not require personal information to function except where directly relevant to core functionality. Vallo has account features (messaging, wallet, booking), but *browsing listings* is not one of them. Apple regularly rejects apps that "require users to register before accessing content that is not account-based". Pass one recorded the gate as a fact (STORE-10) and treated it only as "needs a demo account".
- **WHERE:** `apps/web/src/proxy.ts:117-163` (`PUBLIC_SEGMENTS` / `PUBLIC_PATHS`; everything else redirects).
- **EVIDENCE:** (live, no session)
  ```
  /search 307 → /sign-in?next=%2Fsearch
  /stays 307 → /sign-in?next=%2Fstays
  /restaurants 307 → /sign-in…
  /listing/ed000000-…3a 307 → /sign-in…
  /u/test 307 → /sign-in…
  /welcome 200
  ```
  The landing page's own primary CTA "Explore Properties" links to `/search`, which is a sign-in wall.
- **WHY IT MATTERS:** this is a standard first-round rejection for marketplace and catalogue apps. It compounds with STORE-04: the reviewer sees a website, taps Explore and is asked for an account.
- **THE FIX:** open `search`, `stays`, `restaurants`, `listing/[id]`, `stay/[id]` and `restaurant/[id]` read-only to anon. The data layer already supports anon reads: `listings` anon column grants cover `LISTING_SELECT` and the detail select (verified in A03), and `catalogue_entries` / `stays_search` are anon-callable. Gate only the actions (message, save, book, pay, report) behind sign-in, with `next=` preserved. If the founder wants the wall for the web, exempt it at least for the native user agent. This is the founder's decision (below).
- **EFFORT:** 1 day, including re-checking anon reads for each detail page's embeds.
- **PASS TWO:** NEW IN PASS TWO (found by the reviewer, A03). Live curl with no session: `/search`, `/stays`, `/restaurants`, `/listing/ed000000-…3a` and `/u/test` all 307 → `/sign-in…`; `/welcome` 200. Founder decision (browse without an account). A10 recorded the same redirect as a product decision in its CORRECTLY EMPTY table.
  - *Also reported as UX-01 (A05 UX, MERGED INTO this ID in pass two, fix amended):* every landing CTA (Explore Properties/Stays, city chips, category tiles, the hero card, the search box, footer links) ends at a 4-slide welcome carousel and then the sign-in wall, after showing a search-results skeleton; from landing to any listing detail took ≥ 25 taps plus an email round trip. Fix amendments (A06): keep `/u/*` and people search gated (UX-24); test that public listing/stay/restaurant pages render no links whose GET creates rows (`/messages/new?listing=` creates a conversation on GET, UX-P2-03); verify the anon select does not include the private address; rate-limit anon catalogue reads before opening them. If the wall stays: skip the carousel when `notice=sign-in-required`, send gated deep links to `/sign-up?next=…`, and word landing CTAs "Create a free account to search". (Carrying `next` into sign-up is UX-02.)
  - *Also reported as UI-20, carousel half (A06 interface, merged here via UX-01):* a first visit to `/sign-in` is routed to `/welcome?next=/sign-in`, so a returning user on a new phone must skip the carousel. Fix: exempt `/sign-in` and `/sign-in/email` from the first-run gate (`components/app/welcome/first-run-seen.ts:80` already exempts `/welcome` and `/start`). The unknown-URL half of UI-20 stays in A06.

#### STORE-P2-05 | APPLE 1.1.6 / PLAY MISREPRESENTATION | CRITICAL | The "verified" and "inspected" marks the store listing and the app rely on can be self-granted

**The "verified" and "inspected" marks the store listing and the app rely on can be self-granted.** Filed by the pass-two reviewer (A03) as a cross-reference, not a new defect: it is A03's DB-01 (any member can publish a `verified`, tier-3 business visible to anon) and DB-02 (an approved agent can publish a listing already stamped inspected, address-verified and mandate-verified). Its store angle — the marketing, the store description and STORE-05's copy fix all lean on "verified"; a self-appliable trust mark is the deception Apple 1.1.6 and Play's Misrepresentation policy describe, and a takedown risk after launch even if review passes — is recorded here. Where, evidence, fix and effort: see DB-01, DB-02 (and DB-06, the root cause).

- **PASS TWO:** MERGED INTO DB-01 and DB-02 — the reviewer labelled it "CRITICAL (cross-reference, not a new fix)"; counted under the canonical IDs, not here.

#### VERDICT TABLE (carried from pass one)

PASS means the code or live check shows it is met. FAIL means it is not met as the tree stands. UNKNOWN means it depends on something I could not see; the row says what.

##### Apple App Store

| # | Guideline | Verdict | What makes it so | Finding |
|---|---|---|---|---|
| A1 | 4.2 Minimum functionality (remote-origin shell) | **FAIL (probable)** | These native features are in the shipping build: splash, status bar, keyboard inset, Android back, system-browser handoff, and an `appUrlOpen` listener. Push is written in JS but its plugin is absent from `ios/App/CapApp-SPM/Package.swift` and `android/app/capacitor.build.gradle`, and the entitlements are not linked. There is no share plugin, no haptics (`navigator.vibrate` does nothing on iOS), no biometrics, no native camera and no offline content. The app opens on `/`, the marketing landing page, which has a newsletter footer and store badges. | STORE-04 |
| A2 | 2.1 Completeness: airplane-mode test | **FAIL** | The error page always renders "This build has no server". `window.Capacitor.getConfig` does not exist in Capacitor 8. | STORE-01 |
| A3 | 2.1: placeholder / "coming soon" | PASS | I grepped for "coming soon", "lorem", "under construction" and "TBD": every hit is in a comment. Live pages flagged nothing (my regex check ran on 25 pages). | — |
| A4 | 2.1: demo account supplied and working | **FAIL (founder)** | The reviewer account does not exist. `auth.users` has 10 users and 0 with review/apple/store in the address. `scripts/seed/store-reviewer.mjs` has never been run (`docs/STORE_SUBMISSION_NOTES.md` §2). The QA member account signs in and works (verified). | STORE-10 |
| A5 | 2.1: all 64 listings are examples | **UNKNOWN, leaning risk** | Every example is labelled "Example" on cards and pages and in OG. A marketplace with 0 real supply can be read as "placeholder content". Mitigation below. | STORE-11 |
| A6 | 2.1: broken flows a reviewer will tap | **FAIL** | "Continue with Google" cannot complete on the native shell, because the association files are placeholders. | STORE-03 |
| A7 | 2.3 / 2.3.1 Accurate metadata, no misleading claims | **FAIL** | The landing page shows example listings with no Example label. It says "Verified homes" and the home screen says "verified properties", while 0 listings are verified. | STORE-05 |
| A8 | 2.3.10 No other platforms in the app | **FAIL** | The landing page, which is the first screen in the shell, shows "GET IT ON Google Play" and "Download on the App Store" badges. | STORE-06 |
| A9 | 2.3 Screenshots and metadata | **FAIL (not made)** | No store-size screenshots, description, keywords or promo text exist in the repo. The PWA shots are 780x1688, which is not an App Store size. | STORE-20 |
| A10 | 2.5.1 Private APIs | PASS | Stock Capacitor 8.5 and five first-party plugins. No custom native code beyond the AppDelegate/SceneDelegate boilerplate and the push delegate. | — |
| A11 | 2.5.2 Downloading executable code | PASS (argued) | JS runs only inside WKWebView/WebKit, which 2.5.2 allows. No native code is fetched and no interpreter is shipped. The live risk here is 4.2, not 2.5.2. | — |
| A12 | 3.1.1 IAP: nothing digital sold | PASS | `fee_rates` holds commission 0 and listing_fee 0. `revenue-queries.ts:32` says "`listing_fee` has no charging path yet". Wallet entry kinds are deposit, withdrawal, payment, refund, transfer, escrow and pot, and all are spent on stays, rent, tables or escrow, which are real-world. There are no boosts, featured-for-pay, premium or badges for sale. Crypto is `notFound()` (`(app)/crypto/page.tsx`). **Watch:** if the listing fee or a boost is ever charged in the iOS app, it needs IAP. | — |
| A13 | 3.1.3(e) Goods and services outside the app | PASS | Paystack card and wallet payments are for physical stays and property. | — |
| A14 | 4.8 Login services | **FAIL** | Live `/sign-up` shows "Continue with Google" and no Apple option. `providers.ts:69` has `DEFAULT_SOCIALS = ["google"]`. | STORE-02 |
| A15 | 5.1.1(i) Privacy policy accurate | **FAIL** | The policy claims analytics providers the code does not have. It omits location, AI processing, push tokens, crash reporting and public social content. | STORE-08 |
| A16 | 5.1.1(v) In-app account deletion | PASS, with a MEDIUM caveat | Live: Settings → Account Information → "Delete my account" (seen as the QA member; I did not press it). SQL `purge_account_rows` deletes or scrubs rows and storage, bans and scrubs `auth.users`, and is scheduled by the Vercel cron `account-purge 15 3 * * *` after 30 days. **Caveat:** a positive wallet balance blocks deletion, and withdrawals depend on Paystack transfers. | STORE-12 |
| A17 | 5.1.1(ix) Regulated financial services | **FAIL (founder)** | Custodial naira wallet, wallet-to-wallet transfer and pots. Apple expects submission by the legal entity, so enrol as an organisation (D-U-N-S), not as an individual. The CBN licensing question is open by the terms' own admission. | STORE-09 |
| A18 | 5.1.2(i) Sharing with third-party AI | **FAIL** | `/api/assistant`, `/api/support` and `lib/social/bot-actions.ts` POST user text to `api.anthropic.com`. The live `/assistant` page shows no disclosure and asks no consent. The privacy policy has 0 mentions of AI or Anthropic. | STORE-07 |
| A19 | 5.1.5 Location | PASS | `NSLocationWhenInUseUsageDescription` truthfully states both uses, including the listing pin that is stored. No background mode for location. | — |
| A20 | 1.2 UGC: filter | PASS | 133 `blocked_terms`. Scan triggers are live on posts, messages, stories, story_comments, reviews, review_responses, social_profiles and events (pg_trigger query below). | — |
| A21 | 1.2 UGC: report | PASS | `ReportSheet` is mounted on listings, posts, comments, stories, profiles and message threads. The `reports` table exists (0 rows: correctly empty). | — |
| A22 | 1.2 UGC: block | PASS | `blocks-actions.ts` is used from ProfileMenu, Feed, CommentsSheet, StoryViewer, ThreadView and ThreadOptionsSheet. | — |
| A23 | 1.2 UGC: terms with zero tolerance, 24h | PASS | `/eula` (Community rules) is live. `eula.tsx:128` says "We act on every report within 24 hours". Sign-up agreement copy (`en.ts:1099`) names Terms, Privacy and Community Rules. `admin/overdue-reports.ts` measures the 24-hour promise. The promise only holds if somebody reads the queue daily. | — |
| A24 | Privacy nutrition labels | UNKNOWN until filled | Derived below. Fill them only after STORE-08 is fixed, so the label and the policy agree. | STORE-08 |
| A25 | Age rating | UNKNOWN (questionnaire) | UGC, messaging and social force 13+ at least. The Terms say 18+ but sign-up has no age affirmation. | STORE-19 |
| A26 | Export compliance | PASS | `Info.plist` has `ITSAppUsesNonExemptEncryption` = false. HTTPS only, no custom crypto (Node `crypto` is server-side HMAC only). | — |
| A27 | ATT | PASS (not required) | No analytics, ad or pixel SDK. `@vercel/analytics`, gtag, posthog and fbq all return 0. Sentry is a server-side, scrubbed first-party relay, which is not tracking. | — |
| A28 | Privacy manifest (PrivacyInfo.xcprivacy) | PASS (not required) | The app target has none. Capacitor ships an empty one. None of the synced plugins' Swift code calls a required-reason API (grep for UserDefaults, systemUptime, file timestamps and disk space: 0). Adding an app-level one is good practice, not a blocker. | — |
| A29 | App icon | PASS (valid), LOW craft | 1024x1024 RGB with no alpha, so it is accepted. The art has its own rounded tile inside the square. | STORE-18 |
| A30 | iPad | **RISK** | `TARGETED_DEVICE_FAMILY = "1,2"`, so iPad screenshots are required and review may run on iPad. | STORE-13 |

##### Google Play

| # | Policy / requirement | Verdict | What makes it so | Finding |
|---|---|---|---|---|
| G1 | Target API 36 | PASS | `android/variables.gradle` sets `targetSdkVersion = 36` and `compileSdkVersion = 36`. | — |
| G2 | AAB | **FAIL (process)** | Docs instruct `./gradlew assembleRelease` (an APK). Play requires an AAB for new apps. | STORE-14 |
| G3 | 64-bit / 16 KB pages | PASS | No `.so` or NDK in the project. Capacitor is pure Java/Kotlin. | — |
| G4 | Permissions declared = used = justified | PASS | INTERNET. COARSE_LOCATION (locate-me and the listing pin). FINE_LOCATION capped at `maxSdkVersion="30"`, with the reason written in the manifest (a bridge defect below Android 12). POST_NOTIFICATIONS (push). No background location, no READ_MEDIA_*, no camera permission (the system picker is used). | — |
| G5 | Photo/video permissions policy | PASS | No READ_MEDIA_IMAGES or READ_MEDIA_VIDEO. File inputs use the system picker. | — |
| G6 | Background location | PASS | Absent. The manifest says it must stay absent. | — |
| G7 | Foreground service declarations | PASS (n/a) | No `<service>` of foreground type. | — |
| G8 | Play Integrity | n/a | Not used and not required. Optional hardening for the wallet. | — |
| G9 | Data safety form truthful | UNKNOWN until STORE-08 | Derived table below. The privacy policy must be corrected first or the two contradict. | STORE-08 |
| G10 | Account deletion in-app + public web URL | PASS | `/delete-account` answers 200 signed out and explains the whole process, with a restore form. It is linked in the landing footer. One curl attempt out of five timed out at 30 s; four others answered in under 1 s (network or proxy noise, not reproduced). In-app path as in A16. | STORE-12 (caveat) |
| G11 | UGC policy | PASS | Same as A20–A23. | — |
| G12 | Financial Services / Financial features declaration | **FAIL (founder)** | The app holds and moves money: a custodial wallet, wallet-to-wallet transfer, pots and escrow tables. The declaration must say "digital wallet / money transfer". Play expects compliance with local law (CBN), and since 2024 financial-services apps must come from an organisation account. | STORE-09 |
| G13 | Personal and sensitive data (NIN, KYC docs) | PASS, subject to G9 | Collected only in the agent/host application with explicit upload. Named in the privacy policy (NIN ×3). Documents are read by short-lived signed URL. Declare them in Data safety. | STORE-08 |
| G14 | App Links | **FAIL (founder values)** | `assetlinks.json` is live but carries `PLACEHOLDER_REPLACE_WITH_PLAY_APP_SIGNING_SHA256…`, so `autoVerify` fails. | STORE-03 |
| G15 | FCM | **FAIL until supplied** | `google-services.json` `current_key` = `PASTE_THE_ANDROID_API_KEY_FROM_FIREBASE_HERE`. `build.gradle:186` then deliberately fails every release build. | STORE-15 |
| G16 | Misrepresentation | **FAIL** | Same as A7 (unlabelled examples on the landing page, the "Verified" claims). | STORE-05 |
| G17 | Target audience / content rating | UNKNOWN | IARC questionnaire. Declare 18+ target audience to match the Terms. | STORE-19 |

##### Both stores

| # | Item | Verdict | Evidence |
|---|---|---|---|
| B1 | Legal docs exist and are reachable signed out | PASS | `/privacy`, `/terms`, `/eula`, `/cancellations`, `/delete-account`, `/help` and `/contact` all return 200 signed out. All are in the landing footer. In-app: `/legal/privacy` (200 signed in) and links on sign-up. |
| B2 | Legal docs describe what the code does | **FAIL** | STORE-08, STORE-07 |
| B3 | Support URL | PASS | `/help` and `/contact` (form). No `mailto:` anywhere on `/help`, `/contact` or `/privacy`, so the Play console developer email must be a real mailbox (STORE-20). |
| B4 | Deep links: every meaningful screen has a URL | PASS | `/listing/[id]`, `/stay/[id]`, `/restaurant/[id]`, `/u/[handle]`, `/post/[id]`, `/stories/…`. Signed out, `/listing/…` → 307 `/sign-in?next=%2Flisting%2F…`, so the return is preserved. |
| B5 | AASA and assetlinks at /.well-known | PASS (served), **FAIL (content)** | Both return 200 `application/json`. Both carry placeholders. STORE-03 |
| B6 | Shared link opens the app | **FAIL** | Not until B5 is filled and Associated Domains is on the App ID. |
| B7 | No share artefact carries a specific address | **FAIL (partial)** | OG and meta are clean ("An example listing on Vallo"). The native share sheet sends `listing.title`, which is agent free text (e.g. "…on Chevron Drive"). STORE-16 |
| B8 | Reviewer walk: believable and finished? | Mostly yes, with 3 visible problems | Polished and coherent. Every catalogue card says "Example". The problems: unlabelled examples on the landing page, the store badges, and the "Invest" tile, which goes to the buy search. |
| B9 | Icon, splash, favicon, PWA manifest | PASS, LOW craft | Live `/manifest.webmanifest` is valid (192, 512 and maskable 512 all 200). Favicon 200. `apple-touch-icon` is declared at `/pwa/apple-touch-icon.png`. The bare `/apple-touch-icon.png` 307s to sign-in, which is harmless because the `<link>` points elsewhere. STORE-18 |

#### PASS-TWO CHALLENGES TO THE PASS ROWS

**A16 / G10 "In-app account deletion: PASS" is a partial blind light.**
- **It has never run.** The purge SQL has **never executed against a real request in production**. `audit_log` has exactly one purge-related action, `cron.account-purge.ok` at 2026-09-23 03:15, and that run covered 0 due requests. `account_deletion_requests` has 0 rows. The function carries an inline comment that its first version "would have failed for every account" (handle length) and was "corrected by the lead on apply day". Nothing live proves the corrected version completes.
- **It leaves personal data behind** (read from `purge_account_rows` source):
  - `account_identities` (canonical email, i.e. the email the purge scrubs from `auth.users`, kept linked to the uuid).
  - `push_tokens` (device tokens: a purged account's phone can still be targeted if any row is later queued for that user id).
  - `known_devices` (fingerprints).
  - `price_check_watches` (saved lat/lng).
  - `email_outbox` payloads.
  - `inspection_confirmations`, and `reports` filed.
- `listings` are blocked from purge only at request time (see STORE-12 amendment).
- This becomes **STORE-P2-02**.

**A20 / G11 "UGC filter PASS, scan triggers live on 8 tables" is a blind light.**
- There are 8 scan triggers, but only **2** of them consult the objectionable-content list: `scan_post` (posts) and `scan_social_profile` (bios). `position('objectionable_pattern' in prosrc)` is false for `scan_story`, `scan_story_comment`, `scan_event`, `scan_review`, `scan_review_response` and `scan_message`.
- Those six only look for 10-digit numbers and the words payment, transfer, pay me, account number, acct and bank. Reviews and review responses do not even hold: they only raise a risk alert.
- `blocked_terms` *is* seeded (133 terms across 12 categories, including child-safety 14 and sexual-solicitation 12). `objectionable_pattern()` builds `\m(term|…)\M` from all of them. So the list exists and is applied to 2 of 8 surfaces.
- This becomes **STORE-P2-01**.

**A21 "UGC report PASS" is narrowed.**
- `lib/reports/schema.ts:88` `REPORT_TARGETS = ["listing","conversation","message"]` for the app sheet. The social sheet covers posts, comments, stories and profiles.
- **Reviews** (public, on listing pages: `ListingReviews.tsx` has no report control), **stays and restaurants** (business pages) and **events** have no report control.
- Folded into STORE-P2-01.

**A19 "Location PASS" is a qualified pass.**
- The Info.plist string says map-locate location "stays on this device". `MapCanvas.tsx:490-495` then `setView([lat,lng], 13)`, which makes the map fetch zoom-13 tiles around the user from MapTiler (`lib/maps/tiles.ts`). A third party therefore learns the user's area to within a few km.
- It is not a rejection ground as written (the string is substantially true about Vallo's own collection), but the privacy policy must name MapTiler (STORE-08). Also, `FacilitiesStep.tsx:40` (host stays pin) is a third location use; it is covered only loosely by "listing a property". I left the verdict PASS with this note.

The other PASS rows I spot-checked stand: A10, A12 (fee_rates 0, crypto `notFound()` at `(app)/crypto/page.tsx:32`), A26, A27, A28 (Capacitor's `PrivacyInfo.xcprivacy` is present and empty, and 0 required-reason API calls in plugin Swift), G4, B1, B4.

#### DERIVED: App Privacy (Apple) and Data safety (Play), from the code (carried from pass one)

Nothing is used for tracking and nothing is sold. Everything is linked to the user unless marked otherwise.

| Data type (Apple / Play) | Collected by | Purpose | Shared (Play sense) |
|---|---|---|---|
| Name, email, phone (Contact info / Personal info) | `profiles`, `auth.users`, `EmailAuthForm`, `settings/account` | App functionality, account | No (service providers only) |
| Address-level location of a listed property; device coordinates when a host taps "use my location" (Precise location / Location) | Listing wizard pin → `listings` geo | App functionality | No |
| Approximate device location for the map locate control | `MapCanvas.tsx`; stays on the device, **not collected** | — | — |
| State/LGA, occupation, interests (Other user info) | `profiles` (welcome cards) | Personalisation | No |
| Payment info: Paystack reference, amounts, card token and last4, bank account number (Financial info) | `payments`, `payment_methods`, `bank_accounts`, `wallet_entries` | App functionality, fraud prevention | Paystack (processor) |
| Wallet balance and transaction history (Other financial info) | ledger | App functionality | No |
| Government ID / NIN, CAC documents (Apple: Other data. Play: Personal info → Other, plus Files and docs) | `agent_documents`, `business_documents`, `agent_applications.id_number` | Identity verification | No |
| Photos and videos (User content) | listing, avatar, story and message uploads → storage buckets | App functionality | No |
| In-app messages, posts, comments, reviews (User content: messages, other UGC) | `messages`, `posts`, `story_comments`, `reviews` | App functionality | No |
| AI assistant and support conversations (User content) | `ai_conversations`, `/api/assistant`, `/api/support` → Anthropic | App functionality | Anthropic as processor; must be disclosed (STORE-07) |
| Customer support (User content) | `support_tickets` | Support | No |
| Search history, saved searches, saved items (Search history / App activity) | `saved_searches`, search memory | App functionality, alerts | No |
| Product interaction (App activity) | follows, reactions, saves | App functionality | No |
| User ID (Identifiers) | Supabase uid | App functionality | No |
| Device ID: push token (Identifiers / Device IDs) | `push_tokens` | Notifications | FCM and APNs (processors) |
| Crash data (Diagnostics), not linked (scrubbed) | Sentry relay, only when `SENTRY_DSN` is set (confirmed NOT SET in production, so nothing is sent today) | App functionality | Sentry (processor) |

Play security answers: encrypted in transit, yes (HTTPS, HSTS). Deletion can be requested, yes (in-app and at `/delete-account`).

*Pass-two note (STORE-08 amendment):* add `account_identities.email_canonical`, `known_devices` and `price_check_watches.lat/lng`, and name MapTiler as a processor that learns the user's area.

#### CHECKED AND FOUND SOUND

- `capacitor.config.ts`:
  - `appId` com.vallospaces.app is consistent in gradle and the pbxproj (`PRODUCT_BUNDLE_IDENTIFIER = com.vallospaces.app`).
  - `webContentsDebuggingEnabled:false`.
  - `cleartext:false`.
  - The `errorPath` wiring is correct (only the page it loads is wrong: STORE-01).
- Android:
  - `allowBackup="false"` and `usesCleartextTraffic="false"`.
  - minSdk 24, target 36.
  - R8 minify on, `shrinkResources` off, with the reason written in `build.gradle`.
  - The release build refuses a bad `google-services.json`.
  - Signing is read from a gitignored `keystore.properties`.
- iOS:
  - ATS `NSAllowsArbitraryLoads=false`.
  - The three usage strings are specific and truthful.
  - `ITSAppUsesNonExemptEncryption=false`.
  - The push delegate methods exist in `AppDelegate.swift`.
  - The iOS 1024 icon has no alpha.
- UGC:
  - Scan triggers are live on 8 content tables. SQL on `pg_trigger` returned `events_scan, messages_scan_after_insert, posts_scan, review_responses_scan, reviews_scan_after_write, social_profiles_scan, stories_scan, story_comments_scan`.
  - 133 blocked terms.
  - Report and block are in every social surface and in message threads.
  - `/eula` is published with the 24-hour promise, and there is an overdue-report instrument.
- Account deletion: reachable in-app (Settings → Account Information → "Delete my account", live), public `/delete-account` (200 signed out), a 30-day grace with a restore code, a purge that scrubs `auth.users` and storage, and a daily cron. The SQL was read, not run.
- 3.1.1: nothing digital is for sale; `listing_fee` is 0 with no charging path; crypto returns `notFound()`.
- Legal and support pages are all public: `/privacy`, `/terms`, `/eula`, `/cancellations`, `/help`, `/contact`, `/about`, `/standards`, `/safety`. The RC number shows on `/privacy` ("RC 9870413").
- OG and meta for listings are generic and carry no address. Unfurlers get the sign-in page.
- Deep-link continuity: signed out, `/listing/<id>` → 307 → `/sign-in?next=%2Flisting%2F<id>&notice=sign-in-required`.
- Live PWA manifest is valid: `start_url:"/"`, standalone, portrait, `#010118`, three icons (all 200) and four screenshots (all 200).
- No analytics or ad SDK, so ATT is not needed.
- The QA member walk (16 signed-in screens) found no placeholder, "coming soon", `undefined`, `NaN` or `null` text on any screen. Every catalogue card and listing page is labelled Example.

*Pass-two note:* the UGC bullet ("scan triggers are live on 8 content tables") is narrowed by STORE-P2-01: only 2 of the 8 consult the objectionable-content list. The account-deletion bullet is narrowed by STORE-P2-02 and STORE-12's amendment.

#### CORRECTLY EMPTY vs BROKEN

| Screen | State | Verdict | Why |
|---|---|---|---|
| `/wallet` Recent transactions | "Nothing has moved through your wallet yet" | CORRECTLY EMPTY | 0 money has ever moved |
| `/bookings`, `/trips` | empty | CORRECTLY EMPTY | 0 bookings or reservations |
| `/settings/notifications` devices | "No device is set up…" | CORRECTLY EMPTY on web. On native it would be BROKEN until STORE-15. | No VAPID/APNs/FCM device has ever registered |
| `reports` table | 0 rows | CORRECTLY EMPTY | no reports filed |
| `account_deletion_requests` | 0 rows | CORRECTLY EMPTY | nobody has asked |
| Native offline card | shows "This build has no server" | **BROKEN** | STORE-01 |

#### NOT COVERED

- No native build, simulator or device was run. There is no Xcode and no Android SDK in this container. Every native claim is from source.
- The WKWebView service-worker limit is stated from known WebKit behaviour, not tested on a device.
- I did not press "Delete my account" and did not execute any purge SQL (by instruction).
- I did not send a message to `/assistant`. **Confirmed after the audit (founder's read of Vercel, 23 September):** `ANTHROPIC_API_KEY` is set on production and preview.
- `SENTRY_DSN` is NOT SET in production (Confirmed after the audit (founder's read of Vercel, 23 September)). Crash reports are not sent anywhere today.
- I did not test Google sign-in end to end (it would need the native app).
- I did not check the ha, ig or yo locales for store-policy wording.
- I did not audit iPad layouts.
- The admin console was not walked as the QA admin account (it is out of reviewer scope). The QA admin credentials were not used.
- I did not verify Play's current country-specific rules for Nigeria wallets beyond the general Financial Services policy and the organisation-account requirement. I had no web access to re-read the live policy pages today.

**Pass two (A03) did not cover:**

- No device or simulator, so STORE-P2-03 and every native runtime claim remain source-derived.
- I did not re-run A08's Playwright walk as the QA member (signed-in screens: wallet, assistant). I relied on its quoted text for the wallet buttons.
- I did not view the icon and splash pixels (STORE-18 art claims), only the XML and PNG metadata.
- I did not fetch the live App Store Review Guidelines or Play policy pages. Guideline wording is quoted from knowledge as of the model cutoff: 4.8 (the 2024 revision), 5.1.1(v), 5.1.1(ix), 5.1.2(i) (November 2025) and 1.2. Treat exact wording as UNVERIFIED.

#### FOR THE FOUNDER

**What exists vs. what is missing:**

| Item | State |
|---|---|
| Legal entity VALLO SPACES LTD, RC 9870413 | EXISTS |
| D-U-N-S number for the entity (Apple org enrolment and Play org account) | **MISSING.** Free from Dun & Bradstreet via Apple's lookup, 1–2 weeks. Needed first. |
| Apple Developer Program, **Organisation** (99 USD per year) | **MISSING** |
| Apple Team ID → AASA; App ID `com.vallospaces.app` with Associated Domains, Push and Sign in with Apple | **MISSING** |
| APNs auth key (.p8) → server env `APNS_KEY_ID`, `APNS_TEAM_ID`, `APNS_PRIVATE_KEY`, `APNS_PRODUCTION=true` | **MISSING** |
| Sign in with Apple Services ID and key → Supabase Apple provider | **MISSING** |
| Distribution certificate and provisioning profiles (Xcode automatic signing is fine) | **MISSING** |
| A Mac with Xcode 26 / iOS 26 SDK, or Codemagic | **MISSING** |
| Google Play Console, **Organisation** account (25 USD one-off) plus developer verification | **MISSING** |
| Play upload keystore → `android/keystore.properties`; Play App Signing SHA-256 plus upload SHA-256 → `assetlinks.json` | **MISSING** |
| Firebase project `vallo-44059` | EXISTS (per `google-services.json`). The Android API key is **MISSING** from the file. |
| Production domain `www.vallospaces.com` | EXISTS, with HSTS |
| Reviewer demo account (run `scripts/seed/store-reviewer.mjs`) | **MISSING** |
| Support mailbox (`support@…`) and `NEXT_PUBLIC_SUPPORT_EMAIL` | **MISSING** |
| NDPC registration number (`company.ts:76` is null) | **MISSING** |
| A written legal position on holding wallet funds and wallet-to-wallet transfer (CBN) | **MISSING.** Decides STORE-09. |
| Store screenshots, feature graphic, copy, keywords | **MISSING** |
| Full-bleed icon master for iOS and Android | **MISSING** (STORE-18) |
| 10–20 real listings before submission | **MISSING** (STORE-11) |

**Decisions only you can make:**
1. Ship Sign in with Apple, or hide Google on iOS for v1 (STORE-02).
2. Keep wallet-to-wallet Send, Request and pots in v1, or switch them off until the licensing answer (STORE-09).
3. Accept the Capacitor 4.2 risk with the STORE-04 list done, or fund the Expo path for iOS.
4. iPhone only for v1 (STORE-13, recommended).

**Additions from pass two:**

1. **Browse without an account (P2-04).** Decide whether signed-out people may see listings. Apple will very likely require it for the iOS app.
2. **Deletion proof (P2-02).** Approve one real end-to-end purge on a throwaway account before submission. It is the only way to show deletion works.
3. **Wallet terms (STORE-09 amendment).** The public Terms do not mention wallet-to-wallet Send, Request or pots. Either the Terms grow or those features switch off for v1.

#### CLEANUP NOTES

- Pass one: no rows written; the QA member was used for a read-only Playwright walk; the QA admin credentials were not used; "Delete my account" was not pressed and no purge SQL was executed.
- Pass two: nothing written except scratch copies of public HTML in `work/A03p2/`.

---

### A09 — RESILIENCE, OPERATIONS AND WHAT HAPPENS AT 2AM: merged pass one + pass two

Sources: `pass1/A09-ops.md` (Agent 9, evening of 2026-09-23 UTC, repo `85c5471`; `git diff HEAD origin/main` empty for every cited file; the production deployment changed mid-audit from `dpl_63XHRTnz...` to `dpl_7tf6nMQV...`) and its pass-two review `pass2/R-A09-by-A10.md` (Agent 10). Pass one could not reach the real Vercel project or the live Supabase project through its MCP connections and used PostgREST as the QA accounts. Pass two used read-only SQL on the live project, the Supabase management API, curl and raw UDP DNS; the Vercel connection lists `read-it-well-web` but answers 404 for it, so Vercel env vars (`SENTRY_DSN`, `EMAIL_REPLY_TO`) remain UNVERIFIED. Live baseline: `public.transactions` 0 rows, `public.bookings` 0 rows — every payment finding is latent.

Pass-two tally: confirmed 14; severity changed OPS-01 (CRITICAL→HIGH, merged into MON-05) and OPS-07 (HIGH→CRITICAL); OPS-16/17 re-rated with no change; fix amended 7 (OPS-01, 02, 03, 05, 07, 08, 11); withdrawn 0; new 5 (OPS-P2-04 merged into MON-P2-03, OPS-P2-05 into DOC-01).

#### DANGER NOW

Pass one: "No DANGER NOW item. Zero bookings or real payments have ever happened, so the money findings below have not yet cost anyone anything. They will be live on the first real booking."

*Pass-two note:* OPS-07 is now CRITICAL — production runs on Supabase's **Free** plan (organisation `Naijafinds`), with no customer-restorable backups or PITR for the wallet ledger, escrow and KYC store. The reviewer did not label it DANGER NOW, but it is the one ops item where money and records could be lost today with no way back. OPS-P2-02: the production database and hosting sit under personal, unrelated account names.

#### FINDINGS (pass one, with pass-two verdicts)

#### OPS-01 | Payments / resilience | HIGH | A booking can be paid twice. The second charge is recorded as a success, with no refund, no alert and no guard.

**A booking can be paid twice. The second charge is recorded as a success, with no refund, no alert and no guard.** The same defect as A01's MON-05 (every checkout attempt mints a new reference; settlement is keyed per reference, not per booking; the database has no one-success-per-booking rule; nothing refunds or alerts). The pass-two reviewer (A10) confirmed it against the live indexes (`transactions_booking_idx` is non-unique; the only duplicate guard is one ledger row per transaction) and the code path (`settlement.ts:214-219`, `:257-270`), lowered it to HIGH to match MON-05 (it needs two concurrent live payment sessions on one booking, zero transactions exist, and payouts are not live), and asked for it to be merged into MON-05 so one defect does not carry two severities. MON-05 now carries OPS-01's WHERE lines (`PayPanel.tsx:193` `useMemo` key, the missing partial unique index, the webhook's alert gap), its step-by-step realistic path, and its fix — amended by the reviewer: the partial unique index is a backstop, not the control flow (catching the 23505 after the money moved would make the webhook answer 500 and Paystack retry for 72h); the duplicate status must be chosen inside one SQL function under `FOR UPDATE` on the booking; the refund cannot use `refund_and_cancel_booking` (MON-P2-02); every reader of `transactions.status` must be listed; and any amount check must compare against the listing-derived price, not `bookings.total_minor` (ESC-02).

- **PASS TWO:** MERGED INTO MON-05 (known cross-area duplicate). A10 in pass two: CONFIRMED, DUPLICATE OF MON-05, SEVERITY CHANGED CRITICAL→HIGH, FIX AMENDED. Canonical severity HIGH (the higher of MON-05 HIGH and OPS-01's post-pass-two HIGH).

#### OPS-02 | Payments / resilience | HIGH | A payment that lands after the booking left PENDING is recorded as "host accepted". A lost webhook plus a lost callback means the guest's money is held while the hold is released.
- **WHAT IS WRONG:** This has three linked parts.
  - (a) Late payment on a cancelled booking. If the booking is CANCELLED (the guest cancelled, or the 48 h hold sweep ran) before the charge settles, `settleBookingCharge` still marks the transaction SUCCESSFUL and writes a ledger entry. The booking does not move, and the history note falsely says "The host had already accepted this stay". The dates may already be resold. There is no refund and no alert.
  - (b) Booking charges the reconcile job finds unsettled are "Reported, never posted". They are written as a `wallet.booking.unsettled` audit row and a warning alert only. Meanwhile `expire_booking_holds` cancels any PENDING booking older than 48 h whose transaction is not SUCCESSFUL. So if the webhook never lands AND the guest's browser never returns to `?paid=1&reference=...` (the connection died on Paystack's page), the charge is taken, the hold is released, and the guest is told the booking was cancelled.
  - (c) There is no check that the paid amount equals the expected amount. The ledger uses the stored `row.amount_minor`, never the processor's amount.
- **WHERE:** `apps/web/src/lib/bookings/settlement.ts:244-272` (the else branch). `apps/web/src/lib/wallet/reconciliation.ts:565-590` ("Reported, never posted"). `supabase/migrations/20260918151000_b4_booking_lifecycle_sweeps.sql` (`private.expire_booking_holds`, which only spares bookings with `t.status = 'SUCCESSFUL'`). `apps/web/src/app/(app)/checkout/[bookingId]/page.tsx:51-57` (settle-on-return only runs when `paid=1&reference=` is present). `apps/web/src/app/api/paystack/webhook/route.ts:368-370` (a settlement outcome of `unknown-reference` is labelled `duplicate` and returns 200, so there is no alert and no Paystack retry).
- **EVIDENCE:** Code read. Live `audit_log` shows the reconcile running hourly (`wallet.reconciliation.run`, 20:10 `apply:false`, and 19:47 `apply:true` from pg_cron), all `charges_seen: 0`, as expected with zero payments. So the path is unexercised.
- **WHY IT MATTERS:** A guest's money is taken with no stay attached. The product tells them the host accepted, or that their booking was cancelled. Support can only find it by reading audit rows.
  - *Pass two (A10): part (a) duplicates MON-05 and part (c) is covered by MON-05's amount check; part (b) — the 48h hold sweep cancels a booking whose charge is PENDING, while reconcile only reports unsettled booking charges — is genuinely new and carries the HIGH. MON-P2-03 makes (b) more likely: if the webhook is unregistered, every booking card payment depends on the browser return alone. The `unknown-reference → "duplicate" 200` sub-claim is confirmed but narrow (LOW within the finding): `settleBookingCharge` returns `unknown-reference` only when there is no attempt row and the metadata has no `booking_id` (`settlement.ts:192-194`), and every checkout sets `booking_id`.*
- **THE FIX:** (amended in pass two)
  - *Pass-one fix, retained:* 
    1. In `settleBookingCharge`, when the booking row is not PENDING and not CONFIRMED (CANCELLED, EXPIRED, NO_SHOW), do not write the "host accepted" note. Mark the transaction `SUCCESSFUL` with a note, raise `recordAlert({kind:"payment.booking.paid_after_release", severity:"critical"})`, and trigger an automatic refund (or queue it for an admin one-click refund).
    2. In reconciliation, settle unsettled booking charges the same way the return path does: call `settleBookingCharge` with the processor's verified amount, not just report them. At minimum, raise a critical alert, not a warning.
    3. In `expire_booking_holds`, before cancelling, skip bookings with any PENDING transaction younger than 72 h (Paystack's retry window), or have the hold sweep call Paystack verify for those references first.
    4. In `settleBookingCharge`, compare `params.amountMinor` with `row.amount_minor` and alert critical on a mismatch.
    5. On the checkout page, when the booking has a PENDING attempt and no `reference` param, run `settleCardPayment` for the latest attempt on load. That covers "the connection died after paying".
  - *Pass-two amendments:*
    - Step 3 as written (spare the hold while a PENDING attempt is younger than 72h) lets a guest block dates indefinitely by opening checkouts without paying. Spare only while the attempt is younger than 72h **and** Paystack `verify` says `ongoing` or `pending`, and make the sweep call `verify` for such references before cancelling.
    - Step 2: raise the reconcile's booking-unsettled alert to `critical`, because only a person can resolve it today.
    - Step 4 (amount check): compare against the listing-derived price, not `bookings.total_minor` (ESC-02); see MON-05 step 5.
- **EFFORT:** 1 to 1.5 days.
- **PASS TWO:** CONFIRMED — fix amended. HIGH stands for part (b), confirmed live: `private.expire_booking_holds` (run every 15 minutes by `vallo_release_stale_holds`) spares a PENDING booking only when a SUCCESSFUL transaction exists — a PENDING transaction (a bank transfer awaiting settlement, or a card whose webhook is late) does not protect it; `lib/wallet/reconciliation.ts:565-590` handles booking charges as `// Reported, never posted`, and the alert goes out at `severity: "warning"` (`app/api/paystack/reconcile/outcome.ts:39`), which `record.ts` maps to medium. Parts (a) and (c) overlap MON-05, MON-P2-02 and MON-P2-03 (not in the known-duplicate list; kept).

#### OPS-03 | Observability | HIGH | Nothing pages a human. A total payment outage today would be noticed only by someone opening /admin/alerts, or by a customer.
- **WHAT IS WRONG:** All alerting (`recordAlert`) writes rows to `public.risk_alerts`, which is readable on `/admin/alerts` with a badge. No trigger, cron or code sends an alert anywhere (no email, push or SMS to the founder). There is no external uptime monitor. Crash reporting depends on `SENTRY_DSN`, and I could not verify it is set: the Vercel MCP connected to this session only sees an unrelated project, and `filter_project_envs` returned `[]`. If the whole Vercel app is down, the crons that write alerts are down too, so nothing is written at all.
- **WHERE:** `apps/web/src/lib/alerts/record.ts` (the file header says it is the "one door into risk_alerts"). `grep -rn "on public.risk_alerts" supabase/migrations` finds only a policy (`20260728152539_admin_trust.sql:71`), with no insert trigger. No `uptime|betterstack|pingdom|statuspage` anywhere in `docs/`.
- **EVIDENCE:**
  - The platform's own history shows it. `docs/BUILD_07_LEDGER.md:9151-9165` (§67): "The entire public catalogue was refused to everybody, for about eleven and a half hours". The section opens "The founder was right on every count", meaning a human reported it and no alert did.
  - `docs/ENVIRONMENT.md:82`: "On 22 September this project held `CRONS_SECRET` … all seven jobs were refused 401 by our own door for four days, and 262 alerts said 'unauthorised'". Four days of red alerts in the table, and nobody was told.
  - Live: `risk_alerts?status=neq.resolved` returns 1 open **high** alert created `2026-09-22T22:20` ("Content: filter, empty"), still open 22 h later.
  - Health checks are decoration by rule 3. `pg-cron-watch` and `lib/cron/freshness.ts` prove jobs RAN, using the service role that bypasses RLS. They stayed green through the 11.5 h outage, because that outage was a grant failure that only `anon` and `authenticated` hit. There is no `/api/health`: `curl https://www.vallospaces.com/api/health` returns `401 {"error":"Sign in to use this."}` from the proxy.
- **WHY IT MATTERS:** The first real payment failure, webhook signature storm, or catalogue outage after launch will run for hours before anyone knows. In a two-sided marketplace, hosts and guests find out first, and they find out on social media.
- **THE FIX:** (amended in pass two)
  - *Pass-one fix, retained:* 
    1. Add an `after insert on public.risk_alerts for each row when (new.severity = 'high')` trigger that enqueues an `email_outbox` row, and later a push, to an ops address (a founder-supplied `OPS_ALERT_EMAIL`). Dedupe per kind per hour. The outbox already exists and retries.
    2. Sign up for an external uptime monitor (Better Stack or UptimeRobot, free tier) that hits a NEW public `/api/health/catalogue` route. Build that route to run the real catalogue read AS ANON (the publishable key, `select id from listings where status='PUBLISHED' limit 1`) plus one `auth/v1/health` call, returning 503 if either fails. That makes it a check that fails for the same reason the feature would. Also point the monitor at `/` and `/sign-in`.
    3. Set `SENTRY_DSN` in Production (confirmed NOT SET on 23 September) and set a Sentry alert rule for new issues to email the founder.
    4. Add a Vercel Log Drain, or at least turn on Vercel's "Deployment failed" and function-error notifications.
  - *Pass-two amendments:*
    - A trigger that enqueues into `email_outbox` cannot page on the failures that matter most: if Vercel is down, the outbox drain (a Vercel cron) is down too. The page must leave through something that does not depend on the app.
    - Keep the external uptime monitor pointed at a health route that runs the real anon catalogue read.
    - Add a Supabase-side `pg_net` call to a paging webhook (Better Stack, ntfy or Telegram) from a trigger on `risk_alerts`, so a DB-side alert pages even when Vercel does not.
    - Make `recordAlert` also call `report()` at `critical`, so Sentry alert rules apply.
- **EFFORT:** 4 to 6 hours of code, plus 30 minutes of founder account setup.
- **PASS TWO:** CONFIRMED — fix amended (page through something that does not depend on the app). Live: `select count(*) from pg_trigger where tgrelid='public.risk_alerts'::regclass and not tgisinternal` → 0; only `private.request_push_drain` and `private.request_money_reconciliation` mention both `risk_alerts` and an outbound channel, and both only write alerts about their own HTTP call; `grep -rn "OPS_ALERT|ALERT_EMAIL|notifyAdmin|ops@"` → nothing; `lib/alerts/record.ts` does not call `report()`, so critical alerts do not reach Sentry. Open alerts now: 2 high, 2 medium, including probe-caused `webhook.yellowcard.unconfigured` (20:49Z) and `cron.account_purge.unauthorised` (20:52Z) — nobody was told about either. Correction: pass one's example alert ("Content: filter, empty") has `status: open` **and** `resolved_at: 2026-09-23T11:50:27Z`, so it is not simply "open for 22 hours" (see OPS-P2-03, DB-19).

#### OPS-04 | Resilience / observability | HIGH | Catalogue reads turn every database error into "0 properties" or "listing not found". An outage looks exactly like an empty marketplace and logs nothing.
- **WHAT IS WRONG:** `SupabaseListingRepository.search` returns `[]` on any PostgREST error AND on any thrown exception. `byId` returns `null` (which renders not-found). The amenity join returns `[]`, which empties every amenity-filtered search. None of these paths logs or alerts. This is exactly why the 11.5-hour `42501 permission denied for function owns_listing` outage (ledger §67) raised nothing: the code read "permission denied" as "no listings".
- **WHERE:** `apps/web/src/lib/listings/supabase-repository.ts:1282` `if (error || !data) return [];`, `:1286-1287` `} catch { return []; }`, `:1321` and `:1325` `return null` in `byId`, `:636` and `:650-651` amenity join, `:527`, `:1068`, `:1324`, `:1352` (more silent catches). The landing page (`components/site/landing/LandingBody.tsx:30-36`) and `/search` (`app/(app)/search/page.tsx:154-156`) consume these.
- **EVIDENCE:** Code read as above. Rule-3 consequence: an empty `/search` today is CORRECTLY EMPTY only if nothing errored, and the page cannot tell the two cases apart.
- **WHY IT MATTERS:** Users see "no homes in Lagos" and leave. Hosts think their listing was unpublished. The team finds out when the founder notices.
- **THE FIX:** In each catch or error branch, call `recordAlert({kind:"catalogue.read_failed", severity:"critical", detail:{code:error.code, surface:"search"}})` (it is deduped for 10 min by `record.ts`) and `console.error`. Then either throw, so `error.tsx` shows "We could not load listings, try again", or return a typed `{ok:false}` so the page renders a "couldn't load" state instead of "0 found". `byId` must distinguish "not found" (`data === null`, no error) from an error.
- **EFFORT:** 3 to 4 hours.
- **PASS TWO:** CONFIRMED (HIGH). Reviewer: `supabase-repository.ts:1282` `if (error || !data) return [];`, `:1286-1287` `catch { return []; }`, and `byId` at `:1321/:1325` returns `null` on error — matching the 11.5 h outage story (ledger §67) and SESSION_B_SCOPE EX-1, which asks for exactly this and is still open.

#### OPS-05 | Resilience | HIGH | If Supabase Auth is slow or down, every signed-in user is logged out and every navigation hangs.
- **WHAT IS WRONG:** The proxy calls `supabase.auth.getUser()` (a network round-trip to GoTrue in eu-west-1 from functions in iad1) on every request, including Next's link prefetches, with no timeout. Its `error` is ignored: `const { data: { user } } = await supabase.auth.getUser(); if (!user) { … redirect /sign-in?notice=sign-in-required }`. A GoTrue 5xx, a timeout or a network blip is therefore indistinguishable from "not signed in".
- **WHERE:** `apps/web/src/proxy.ts:343-387`.
- **EVIDENCE:** Code read. Server-side full HTML time measured from here (near iad1), with every request including this round-trip: `/search` 1158 to 2232 ms, `/home` 1237 to 2212 ms, listing 1142 to 1683 ms (4 samples each), against `/about` (public, no DB) at 219 to 282 ms.
- **WHY IT MATTERS:** Short GoTrue incidents become "Vallo logged me out" for every user at once. A one-second GoTrue slowdown adds a second to every tap.
- **THE FIX:** (amended in pass two)
  - *Pass-one fix, retained:* 
    1. Use `supabase.auth.getClaims()` (supabase-js ≥2.110 is installed). With the project's asymmetric signing keys this verifies the JWT locally from the cached JWKS, with no per-request network call, and it only refreshes when the token is near expiry.
    2. If `getUser()`/refresh returns an `error` that is not an auth error (status ≥500, fetch failure, timeout), do NOT redirect. Pass the request through and let the page's own reads fail visibly.
    3. Wrap the call in a roughly 3 s `Promise.race` timeout that behaves as in step 2.
  - *Pass-two amendments:*
    - The comment at `proxy.ts:341` ("this call is the refresh") is load-bearing. `getClaims()` still refreshes a near-expiry session through the cookie adapter, but the fix must keep the `setAll` cookie write path. Test the refresh path explicitly.
- **EFFORT:** 3 to 4 hours, plus testing of the refresh-cookie path.
- **PASS TWO:** CONFIRMED (HIGH) — fix amended (strengthened). Reviewer: `proxy.ts:343-345` destructures only `data.user` and ignores `error`; verified the precondition for `getClaims()`: the project's JWKS is asymmetric (`GET …/auth/v1/.well-known/jwks.json` → `{"keys":[{"alg":"ES256","crv":"P-256",…}]}`), so `getClaims()` verifies locally with no GoTrue round-trip.

#### OPS-06 | Email deliverability | HIGH | vallospaces.com has no DMARC record and no MX. Mail is DKIM-signed, but replies to the From address go nowhere.
- **WHAT IS WRONG:** There is no `_dmarc.vallospaces.com` TXT record. There is no MX on the apex, so mail to `hello@vallospaces.com` (the default From, `lib/email/client.ts:25`) has nowhere to go: SMTP falls back to the A record, which is Vercel (216.150.16.1) and runs no mail server. DKIM (`resend._domainkey`) and the SPF/MX on the `send.` Return-Path subdomain (Amazon SES, eu-west-1) are correct.
- **WHERE:** DNS for vallospaces.com (nameservers `ns1/ns2.vercel-dns.com`, so the records are managed in Vercel → Domains).
- **EVIDENCE:** (dnspython against 8.8.8.8)
  ```
  vallospaces.com TXT ERR NoAnswer
  _dmarc.vallospaces.com TXT ERR NoAnswer
  resend._domainkey.vallospaces.com TXT ['"p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDDX45GHH/eLPVZ2Kcu..."']
  vallospaces.com MX ERR NoAnswer
  send.vallospaces.com MX ['10 feedback-smtp.eu-west-1.amazonses.com.']
  send.vallospaces.com TXT ['"v=spf1 include:amazonses.com ~all"']
  vallospaces.com A ['216.150.16.1', '216.150.1.193']
  vallospaces.com NS ['ns2.vercel-dns.com.', 'ns1.vercel-dns.com.']
  ```
- **WHY IT MATTERS:**
  - Gmail and Yahoo require a DMARC record for bulk senders and weigh its absence for everyone. Sign-up confirmations and password resets landing in spam mean users who cannot finish sign-up, which a store reviewer will also hit.
  - With no MX, every reply to a booking email bounces unless `EMAIL_REPLY_TO` is set to a mailbox on another domain. **Confirmed after the audit (founder's read of Vercel, 23 September):** it is NOT SET, so today every reply bounces. Agent 4 owns the spelling of that address; I only note the wiring (`lib/email/client.ts:108-131`, used at `:187`).
  - Without DMARC, anyone can send mail as `@vallospaces.com` (phishing "Vallo payment" emails) with no policy telling receivers to reject it.
- **THE FIX:**
  1. Add TXT `_dmarc.vallospaces.com` = `v=DMARC1; p=none; rua=mailto:dmarc@<a mailbox you read>; fo=1`. Move it to `p=quarantine` after 2 to 4 weeks of clean reports.
  2. Add MX records for a real inbox (Google Workspace, Zoho free, or Cloudflare/ImprovMX forwarding) so `hello@` and `support@` receive mail.
  3. Add apex SPF only if the apex will ever send (for example Workspace: `v=spf1 include:_spf.google.com ~all`).
  4. Set `EMAIL_REPLY_TO` to that inbox.
- **EFFORT:** 1 hour of DNS work, plus the founder choosing a mailbox provider.
- **PASS TWO:** CONFIRMED (HIGH). Re-checked by raw UDP to 8.8.8.8 (DNS-over-HTTPS blocked by the proxy): `_dmarc.vallospaces.com TXT answers 0 rcode 0 (NOERROR/NODATA)`, `vallospaces.com MX answers 0`, `vallospaces.com TXT answers 0`. Sign-up confirmation and reset mail goes through the Send Email hook to Resend from `@vallospaces.com`, so this hits the sign-up funnel and store review.

#### OPS-07 | Data lifecycle | CRITICAL | Backups have never been restored and the Supabase plan is unverified. There is no restore runbook.
- **WHAT IS WRONG:** The repository itself records that backup and restore have never been tested, and that backup handling is "Not documented anywhere". The Supabase plan (which decides whether daily backups or PITR exist at all; the Free plan has none) could not be checked, because the Supabase MCP here only reaches an unrelated inactive project. `docs/DEPLOY.md` has no restore section. Storage buckets (ID documents, listing photos) are not covered by Supabase database backups at all.
- **WHERE:** `docs/HANDOFF_08_THE_NEW_WEEK.md:673-675` ("Backups and restore have never been tested … This is a founder item"). `docs/HANDOFF_01_COMPANY.md:407` ("Backup | … | Supabase managed. Not documented anywhere").
- **EVIDENCE:** `grep -rni "backup\|PITR\|restore" docs/DEPLOY.md docs/ENVIRONMENT.md` shows no backup or restore content. `mcp__Supabase__list_projects` returned only `oepdbzejvrrqxgynfcdh` ("INACTIVE"), not `uccixoonmbhrnyczyigt`.
  - **Pass two (A10, Supabase management API):** `get_project uccixoonmbhrnyczyigt` → `organization_id: tsyqgrfidyjwdefxvdbb`, `name: "<a personal Gmail address>'s Project"`; `get_organization tsyqgrfidyjwdefxvdbb` → `{"name":"Naijafinds","plan":"free","tier":"tier_free"}`; `current_setting('max_connections')` = `60` (smallest compute); `archive_mode = on` is Supabase's internal WAL archiving, not a customer-restorable backup. UNVERIFIED: Supabase's exact current Free-tier backup policy (pricing page not read that day).
- **WHY IT MATTERS:** 304 migrations have been applied by hand to production (OPS-08). One bad migration or a mistaken `delete` in a session, with no tested restore, means permanent loss of wallets, ledgers and KYC.
  - *Pass two: the plan is now known — **Free**. On Supabase's Free plan there are no project backups you can restore and no PITR, for the store that holds the wallet ledger, escrow and KYC. One bad `apply_migration` from a working session (which has already caused an 11.5 h outage) could destroy them with no way back. A store will not refuse the app over this, but "money can be lost" is the brief's CRITICAL test.*
- **THE FIX:** (amended in pass two)
  - *Pass-one fix, retained:* 
    1. The founder confirms the Supabase plan is Pro or higher and enables PITR, which is worth it once money moves.
    2. Run one restore drill into a new project, time it, and write `docs/RESTORE_RUNBOOK.md` (who, how, how long, what the DNS and env switch looks like).
    3. Add a nightly job that copies the `agent-documents` and `listing-photos` buckets to an off-platform bucket (S3 or R2) with versioning.
  - *Pass-two amendments:*
    - Step 1 becomes "upgrade to Pro **before the first real payment**", then enable PITR and do the restore drill.
    - Until then, add a nightly `pg_dump` of `public` + `private` + `auth` from a GitHub Action (needs CI billing fixed, DOC-01) or another scheduler, to off-platform storage.
    - The storage copy job stands. There are 11 buckets today; `agent-documents`, `host-documents` and `escrow-evidence` are the irreplaceable ones.
- **EFFORT:** half a day for the drill and runbook, 1 day for the storage copy job.
- **PASS TWO:** SEVERITY CHANGED HIGH→CRITICAL — fix amended. The reviewer read the organisation plan through the Supabase management API: Free (see EVIDENCE).

#### OPS-08 | Deployment | MEDIUM | Migrations go straight to the live database from working sessions, with no CI check, no staging and no down path. `main` auto-deploys to production while several sessions push to it.
- **WHAT IS WRONG:** There are 304 migration files, and CI (`.github/workflows/ci.yml`) never applies, lints or tests them: it only runs typecheck, lint, vitest and build, and Agent 10 has already found that `npm ci` fails. Migrations are applied by `apply_migration` from agent sessions directly to production. Vercel deploys every push to main to production (I watched the deployment ID change mid-audit). A Vercel instant rollback restores the code but not the schema, so a code rollback after a destructive migration leaves old code running against a new schema.
- **WHERE:** `.github/workflows/ci.yml:42-90`. `docs/DEPLOY.md:10-12` states "main is never pushed to from a working session", which is contradicted by today's practice. `docs/BUILD_07_LEDGER.md` §67 is a production outage caused by a migration. `scripts/probes/policy_callers_hold_execute.sql` exists but is not in CI.
- **EVIDENCE:** The chunk URLs on the landing changed from `dpl_63XHRTnz2zBFv8mwLHHuTg4gujoC` (20:16 UTC) to `dpl_7tf6nMQVEPdFt8ffUhQ8yUpQyGXj` (by about 20:30 UTC) during this audit. The `ci.yml` steps are listed above.
- **WHY IT MATTERS:** The one production outage on record came from exactly this path. Store builds load the remote origin, so a bad push is a bad app in both stores within minutes.
- **THE FIX:** (amended in pass two)
  - *Pass-one fix, retained:* 
    1. Add a CI job that starts `supabase start` (or a `postgres:17` service), applies all migrations in order, then runs `scripts/probes/*.sql` (including `policy_callers_hold_execute.sql`) and fails on any flagged row.
    2. Protect `main` (required checks), and make sessions work on branches with Vercel preview deployments.
    3. Use a Supabase branch or a staging project for migrations, promoted by the founder.
    4. Write migrations expand/contract style: add first, remove only after the code no longer reads it. Then a Vercel rollback is always safe.
  - *Pass-two amendments:*
    - Pass one writes as if CI runs. It does not: CI has been red since 10:16Z on `npm ci` and unable to start since 15:48Z on GitHub billing (DOC-01). A DB job added to CI would not run either. Step 0 is DOC-01: fix billing and the lockfile.
    - Step 3 ("use a Supabase branch") requires a paid plan; branching is not on Free, which ties this to OPS-07.
- **EFFORT:** 1 day for the CI DB job. Branch protection is 10 minutes of founder time.
- **PASS TWO:** CONFIRMED (MEDIUM) — fix amended (step 0 is DOC-01; branching needs a paid plan). Live `schema_migrations` count = 306 vs 304 repo files (diff left to DB-11). Overlaps DOC-01 and DOC-03 (A10 and A09 both say: DOC-01 is canonical for CI/branch protection, DOC-03 for the test harness, OPS-08 keeps only the migration-process angle — staging and expand/contract).

#### OPS-09 | Performance / deployment | MEDIUM | Functions run in iad1 (Washington), the database is in eu-west-1 (Ireland) and users are in Nigeria. Every request crosses the Atlantic several times.
- **WHAT IS WRONG:** `vercel.json` sets no `regions`, so functions default to `iad1`. The database is `eu-west-1` (`docs/DEPLOY.md:9`). Each dynamic page makes the proxy `getUser` call plus between 5 and about 15 sequential or parallel PostgREST calls (`/search` runs three catalogue reads, and each fans out to four more queries in `mapRows`, `supabase-repository.ts:1025-1040`). Each call is an iad1 to Dublin round-trip (about 75 to 80 ms). Lagos to iad1 is itself about 150 to 200 ms.
- **WHERE:** `apps/web/vercel.json` (no `regions`). `x-vercel-id: iad1::iad1::…` on the landing response.
- **EVIDENCE:** `curl -sI https://www.vallospaces.com/` gives `x-vercel-id: iad1::iad1::8g5sw-…` and `x-vercel-cache: MISS`, `cache-control: private, no-cache, no-store`. Server full-response times from a US vantage point: `/search` 1158 to 2232 ms, `/home` 1237 to 2212 ms, `/` 662 to 1087 ms, `/about` 219 to 282 ms.
- **WHY IT MATTERS:** The bulk of `/search` server time is region latency. From Lagos, add one Lagos to US round-trip per request.
- **THE FIX:** Add `"regions": ["dub1"]` to `apps/web/vercel.json` (Dublin sits next to eu-west-1, and London/Dublin is the closest major PoP to Lagos). Expect about 50 to 70 % less server time on DB-heavy pages. Re-measure after.
- **EFFORT:** 15 minutes plus a verification deploy.
- **PASS TWO:** CONFIRMED (MEDIUM). Reviewer: `curl -sI https://www.vallospaces.com/` → `x-vercel-id: iad1::iad1::6vdv4-…`; `apps/web/vercel.json` has no `regions`; the DB is eu-west-1 (`get_project` region). Caveat: `dub1` also moves where the cron jobs run — harmless.

#### OPS-10 | Performance on Nigerian networks | MEDIUM | A cold page costs 0.66 to 1.5 MB. `/search` ships 945 KB of raw HTML (391 KB of inline RSC payload). Under emulated 3G the first paint is about 7 to 8 s and the landing LCP was 26 s.
- **WHAT IS WRONG:** This has four parts.
  - Pages serialise whole catalogue arrays into the HTML: `/search` inlines three reads of the catalogue, one for results, one for the filter-count pool and one for the map (`app/(app)/search/page.tsx:151-157`).
  - Six font files are `<link rel=preload>`ed on every page (about 155 KB), and they compete with the critical CSS and JS on a 94 KB/s link.
  - Images are `next/image` (good), but WebP only (no AVIF), and sources are larger than they are displayed: `w=640` for cards drawn 155 CSS px wide, and `vallo-wordmark.png&w=1920` for a 78 px logo.
  - The example listing photos are low resolution (natural width 195 px) and get upscaled to 390 px.
- **WHERE:** `app/(app)/search/page.tsx:151-157`. The root layout font preloads (the `link:` response header lists 6 woff2 files). `apps/web/next.config.ts:49-85` (`images` has no `formats`).
- **EVIDENCE:** (Playwright + CDP, cold cache, isMobile 390×844)
  - Unthrottled, bytes on the wire: landing 657 KB to 1065 KB (JS 282 to 361, images 240 to 532, fonts 21 to 155, CSS 3 to 90). `/home` signed-in 994 KB. `/search` signed-in 1136 KB, rising to 1552 KB in the throttled run (images 891 KB). Listing detail 829 KB (JS 421 KB).
  - Largest script everywhere: `0o3k6xfjpe_co.js` at 177 KB.
  - HTML sizes (raw / brotli / inline RSC): `/search` 945 KB / 72 KB / 391 KB, `/home` 346 / 61 / 254, listing 380 / 64 / 283, `/` 203 / 16.
  - Throttled (750/250 kbps, 100 ms RTT, 4x CPU):
    - Landing: FCP 8236 ms, LCP 26536 ms (an IMG), load 51.9 s. What the user sees at FCP is the dark hero ("Rent, buy or stay. Without the runaround." with a fallback system font), the CTA buttons and city chips. The listing card below has an empty dark image box until the images arrive.
    - `/search`: FCP 7040 ms, and the LCP element is `H1.sr-only "Explore properties"`, invisible text, so LCP understates it. At about 30 s the viewport showed a single full-bleed blurred photograph with no visible controls (cause not established, UNVERIFIED).
  - CAVEAT: the sandbox egress proxy is itself slow and flaky (a curl of `/` once took 30 s, and many subresources failed with `ERR_TOO_MANY_RETRIES`). Absolute timings are noisy and probably pessimistic. Byte counts are accurate. The one throttled landing run that ended in `global-error.tsx` ("Vallo did not load") coincided with the deployment swap plus proxy failures, and I did NOT reproduce it on a clean run.
  - A typical 10-page session (landing, sign-in, home, search, 3 listings, messages, saved, wallet) is about 8 to 10 MB cold. With the service worker's cache-first `/_next/static/` (`public/sw.js:78`) and warm fonts, repeat pages cost about 150 to 450 KB each (HTML plus images).
- **WHY IT MATTERS:** At Nigerian data prices, and on low-end Android (Tecno/Itel CPUs, where 4x throttle is generous), parsing 1 MB of HTML plus 400 KB of JS delays interaction by seconds. Store reviewers on hotel Wi-Fi see a blank dark screen.
- **THE FIX:**
  1. `/search`: stop sending the "whole" catalogue for the map in the HTML. Load map pins from the existing `/api/map/listings` (bbox-bounded, `MAX_PINS=300`) after mount, and compute the filter counts with SQL `count` per facet instead of shipping the pool.
  2. Preload only the two fonts used above the fold (`inter-latin`, `poppins-700-latin`). Drop the `-ext` preloads, and keep `font-display: swap`.
  3. `images: { formats: ['image/avif','image/webp'] }`, give card `sizes="(max-width:640px) 45vw, 300px"`, and pass the wordmark an explicit small `width`.
  4. Add a "Lite mode" (the repo already has `lib/save-data.ts`) that honours `navigator.connection.saveData` and skips decorative images.
- **EFFORT:** 1 to 2 days.
- **PASS TWO:** CONFIRMED (MEDIUM), partially re-checked. The reviewer did not re-run the throttled measurements; it confirmed the byte-size inputs (the `/about` HTML carries 18 `<script src>`) and accepts pass one's byte counts, which pass one itself labelled reliable (timings noisy).

#### OPS-11 | Load / scale | MEDIUM | What breaks first as the catalogue grows: the 200-row cap with no pagination (at about 1,000 listings), then the 5,000-row join caps (about 10,000), then the uncached landing and search fan-out under concurrency.
- **WHAT IS WRONG:**
  - (1) Every catalogue read is capped at `CATALOGUE_LIMIT = 200`, ordered featured, then published_at, then created_at, and there is no offset/cursor or "load more" on `/search`. Past 200 matching listings, the older ones never appear in results or on the map, and the count reads "200 properties found" with no hint of truncation. Results are also post-filtered in JS (`listings.filter(matchesFilter)`) after the cap, so a filter applied only client-side can return fewer than exist.
  - (2) The amenity filter pulls `listing_amenities` rows for the wanted amenities up to `JOIN_ROW_LIMIT = 5000` and intersects them in JS. Review stats pull every review row for up to 200 listings (5000 cap) and average in JS. Past the caps, the results are silently wrong (only a `console.warn`).
  - (3) The landing page (the only public page, force-dynamic, `no-store`) runs `recommended(5)` (a 50-row catalogue read, fanning out), `search()` (200 rows, fanning out) and `platform_stats()` on EVERY hit. That is about 11 PostgREST calls per anonymous visitor, uncached.
  - (4) `/search` runs three 200-row reads, each with 4 follow-ups: about 15 PostgREST calls, plus the idempotency and rate-limit RPCs on actions.
  - At 100 concurrent users this means roughly 1,500 PostgREST queries per wave of page loads. The first thing to saturate is probably PostgREST/Postgres CPU on the three 58-column 200-row selects with their joins. UNVERIFIED, because I did not load-test production and would not.
- **WHERE:** `apps/web/src/lib/listings/supabase-repository.ts:72` (`CATALOGUE_LIMIT`), `:94-99` (`rowCap`), `:1278-1285`, `:591-651` (`JOIN_ROW_LIMIT`, amenity intersection, review stats), `:1025-1040` (`mapRows` fan-out). `components/site/landing/LandingBody.tsx:30-36`. `app/(app)/search/page.tsx:151-157`.
- **EVIDENCE:** Code read. Sound on the other side: trigram indexes exist on title, city and area (`20260809081657_…:55-63`) and there is a catalogue order index (`:51`), so text search does not seq-scan at 100k. The map API is bbox-bounded with `MAX_SPAN_DEGREES = 1.5`, `MAX_PINS = 300` (`lib/listings/bounds.ts:82-85`).
- **WHY IT MATTERS:** The day supply passes about 200 listings, the product silently hides inventory from buyers, which is a marketplace-integrity problem hosts will notice. A single press or Instagram spike on the landing page hits the DB directly.
- **THE FIX:** (amended in pass two)
  - *Pass-one fix, retained:* 
    1. Keyset pagination on `/search`: `(featured, published_at, id)` cursor, page size 24, "Show more", and a real total from `count: "estimated"`.
    2. Move the amenity AND-filter into SQL: `id in (select listing_id from listing_amenities where amenity_id = any($1) group by listing_id having count(*) = $n)`, as an RPC.
    3. Review stats: a `listing_review_stats` view or materialised columns (`rating_avg`, `rating_count`) maintained by trigger.
    4. Cache `landingData` with `unstable_cache(…, ['landing'], { revalidate: 300, tags: ['catalogue'] })` (the data is identical for every anonymous visitor) and revalidate the tag on publish.
  - *Pass-two amendments:*
    - Add step 0: move off Free compute (OPS-07, OPS-P2-01).
- **EFFORT:** 2 to 3 days.
- **PASS TWO:** CONFIRMED (MEDIUM) — fix amended. The code caps are as cited. The first thing to saturate is more likely Free-plan compute and 60 max connections (live `max_connections=60`) than PostgREST CPU.

#### OPS-12 | Data lifecycle / NDPA | MEDIUM | The retention schedule is mostly unenforced, including its own "sharpest case" (rejected applicants' ID documents and NINs). There is no subject-access or data-export path.
- **WHAT IS WRONG:**
  - `docs/RETENTION_SCHEDULE.md` says in its own words "Nothing in the database enforces that". The only enforcing jobs found are: rate-limit and idempotency purges (`rentme_purge_rate_limits`, `rentme_purge_idempotency`), `vallo_sweep_price_check_events` / `_watches`, `vallo_purge_email_outbox`, and the 30-day account purge (`/api/cron/account-purge`, which ran `2026-09-23T03:15` ok).
  - There is NO job for rejected applicant documents or ID numbers (30 days), abandoned draft applications (12 months), messages (3 years), assistant conversations (12 months), story/post views (90 days), notifications (12 months), or reports/risk_alerts (3 years). §5.1 also notes that storage objects survive the account cascade.
  - The privacy notice promises "Ask for a copy of the personal data we hold about you" and "Ask for your data in a portable format" (`lib/legal/privacy.tsx:288,296`), but there is no export feature and no SAR runbook in `docs/`.
- **WHERE:** `docs/RETENTION_SCHEDULE.md:16-31, 54-160`. `supabase/migrations/*` cron names (listed above). `apps/web/src/lib/legal/privacy.tsx:283-297`.
- **EVIDENCE:** `grep -A2 -h "cron.schedule(" supabase/migrations/*.sql` gives: rentme-daily-note, rentme_announce_completed_stays, rentme_escrow_sweep_timeouts, rentme_purge_idempotency, rentme_purge_rate_limits, rentme_reconcile_payments, rentme_release_stale_holds, vallo_escrow_book_the_float, vallo_escrow_invariants, vallo_sweep_price_check_events, vallo_sweep_price_check_watches (plus vallo_push_drain, vallo_purge_email_outbox). `grep -rli "export my data\|data export\|subject access" apps/web/src` gives nothing.
- **WHY IT MATTERS:** An NDPC audit finding is easy to prove from the record's own timestamps. The retention document says so itself.
- **THE FIX:**
  1. pg_cron job `vallo_purge_rejected_applications` as specified in `RETENTION_SCHEDULE.md` §4: storage objects first, then redact the row, then an audit row. Prove it on a branch first, as the document requires.
  2. Nightly purges for `story_views`/`post_views` older than 90 days, `ai_messages` older than 12 months, and `notifications` older than 12 months.
  3. A `docs/SUBJECT_ACCESS_RUNBOOK.md` plus an admin-only "export user" action that dumps the user's rows across the ~30 personal tables to JSON. A self-serve download can come later. A 30-day manual response is lawful.
- **EFFORT:** 1 to 2 days (the purge job needs the careful proof the document asks for).
- **PASS TWO:** CONFIRMED (MEDIUM). Live `cron.job` holds 14 jobs; none purges rejected applications, messages, views or notifications (names are now `vallo_*` rather than `rentme_*`). `vallo_purge_email_outbox` has never run (last_run null; scheduled ~10:01Z with `25 2 * * *`, first run tonight): CORRECTLY EMPTY, not broken. A09, reviewing A10's truth table, also confirmed `RETENTION_SCHEDULE.md:19` "Nothing enforces" is still true for the rejected-applicant case.

#### OPS-13 | Nigerian networks / uploads | LOW | Listing photos go up in one non-resumable request, with no server-side enforcement and no orphan sweep
- **WHAT IS WRONG:** *Corrected by the orchestrator.* Pass one's title was "Listing photos upload raw (up to 10 MB each) in one non-resumable request. On a 250 kbps uplink that is about 5.5 minutes per photo." The "raw" part is wrong for the listing wizard: `apps/web/src/app/agent/list/ListingWizard.tsx:1257-1299` re-encodes every photo client-side (`createImageBitmap` → canvas → `toBlob` JPEG 0.9, long edge capped at 2560px) and refuses the upload if re-encoding fails, which also strips EXIF. What survives from pass one:
  - **No server-side enforcement.** A direct Storage upload with the user's JWT bypasses the wizard, so the bucket still accepts an original file up to `MAX_PHOTO_BYTES = 10 MB` (`listings-schema.ts:120`).
  - **No resume.** Video uses a proper TUS resumable upload; photos go as a single `storage.upload`, so a drop at 90 % restarts the photo from zero.
  - **Orphans.** Objects left behind by a failed `registerPhoto` are never cleaned up.
  - **Host/stay photos are genuinely raw:** `PhotoManager` uploads the original file (SEC-04).
- **WHERE:** `apps/web/src/lib/agent/listings-schema.ts:120`, `apps/web/src/lib/agent/listings-actions.ts:~460-495`, `apps/web/src/lib/agent/resumable-upload.ts` (video only).
- **EVIDENCE:** Code read. `grep -rln "toBlob\|createImageBitmap" components lib` only hits social and restaurant components, not the listing wizard.
  - *Orchestrator correction:* that grep covered only `components` and `lib`; the listing wizard lives in `app/agent/list/ListingWizard.tsx`, whose lines 1257-1299 call `createImageBitmap` and `toBlob` (JPEG 0.9, long edge ≤ 2560px) and refuse the upload if re-encoding fails.
- **WHY IT MATTERS:** A host listing a flat with 12 phone photos (3 to 6 MB each on modern phones) faces 20 to 60 minutes of fragile upload. Most will give up, and supply is the thing the platform lacks.
  - *Orchestrator correction: pass one's "12 photos of 3 to 6 MB each, 20 to 60 minutes" does not apply to wizard uploads, which are re-encoded to ≤ 2560px JPEG before upload. What remains: a dropped connection still restarts a photo from zero, a direct upload can still push an original of up to 10 MB, and failed registrations leave orphan objects.*
- **THE FIX:** (amended by the orchestrator's correction)
  1. Keep the wizard's client re-encode; add the server-side guarantee from SEC-04 (signed upload to a private staging bucket, server re-encode into the public bucket), so a direct upload cannot bypass it.
  2. Run photos through `resumable-upload.ts` when they are over 1 MB (after re-encode most will be well under).
  3. Add a nightly sweep for `listing-photos` objects with no `listing_photos` row older than 24 h.
  4. Route `PhotoManager` (host/stay photos) through the same re-encode (SEC-04).
- **EFFORT:** 1 day.
- **PASS TWO:** SEVERITY CHANGED MEDIUM→LOW (orchestrator correction). A10 had CONFIRMED it in pass two (`MAX_PHOTO_BYTES = 10 * 1024 * 1024`; `reencode.ts` not imported by the wizard), but the orchestrator read `ListingWizard.tsx:1257-1299`: the wizard has its own canvas re-encode (JPEG 0.9, ≤ 2560px) and refuses the upload if it fails, so wizard photos are neither raw nor 10 MB. *Resolved by orchestrator:* the A04/A07 statement (the wizard re-encodes) is correct; the A09/A10 statement (listing photos upload raw) is wrong for the wizard and survives only for direct Storage uploads and for host/stay photos via `PhotoManager` (SEC-04). What remains is LOW: no server-side enforcement, no resumable photo upload, no orphan sweep. See OPS-P2-01 for the storage-quota angle.

#### OPS-14 | Email | LOW | Direct transactional sends are fire-and-forget with no retry, and there is no List-Unsubscribe header on any mail.
- **WHAT IS WRONG:** This has two parts.
  - (a) 11 modules send through `bestEffortEmail`/`sendMessage` directly: wallet funded, booking confirmation, escrow messages and others. A Resend 429 or 5xx, or the 10 s timeout, loses that email forever (a `console.warn` only). The outbox path does retry, but these sends bypass it.
  - (b) `sendEmail` has no `headers` field, so no mail carries `List-Unsubscribe` or `List-Unsubscribe-Post`. `render.ts:431-434` says so itself. Saved-search alerts are notification-driven and effectively recurring marketing-like mail.
- **WHERE:** `apps/web/src/lib/email/client.ts:159-209` (`sendEmail`), `:248-255` (`bestEffortEmail`). `apps/web/src/lib/email/render.ts:425-440`.
- **EVIDENCE:** Code read. The preheader IS present (`render.ts:534`), and a text/plain part IS always built (`render.ts` `Composed.text`, and `sendMessage` passes it). Both are sound.
- **WHY IT MATTERS:** A guest never receives their booking confirmation during a Resend blip. Gmail's bulk-sender rules require one-click unsubscribe on recurring mail, and recurring mail without it goes to the Promotions tab or to spam.
- **THE FIX:** Route every transactional send through `email_outbox` (enqueue instead of sending inline). In `sendEmail`, accept `headers` and, for preference-controlled categories, send `List-Unsubscribe: <https://www.vallospaces.com/settings/notifications?u=…>, <mailto:unsubscribe@…>` and `List-Unsubscribe-Post: List-Unsubscribe=One-Click`, backed by a signed one-click endpoint. To reduce Promotions-tab risk: keep transactional mail image-light, keep one primary link, and send saved-search alerts from a separate subdomain (for example `alerts.vallospaces.com`) so their reputation is kept apart from auth mail.
- **EFFORT:** 1 day.
- **PASS TWO:** CONFIRMED (LOW). 16 non-test modules call `bestEffortEmail`/`sendMessage` directly (pass one said 11); there is no `List-Unsubscribe` anywhere, and `render.ts:432` admits it.

#### OPS-15 | Frontend ops | LOW | Every page load raises a CSP violation: one script tag in the HTML has no nonce.
- **WHAT IS WRONG:** The HTML carries `<script src="/_next/static/chunks/11-v4cdswovuj.js?dpl=…" async="">` without the nonce, so `script-src 'nonce-…' 'strict-dynamic'` blocks it on every page. I checked the 10 module IDs it defines, and all are also present in another loaded chunk, so I saw no functional breakage. But every page view logs a console error and fires a report at `/api/csp-report`: the "reporting channel full of a known non-event" that `instrumentation-client.ts` was written to prevent.
- **WHERE:** Live HTML of `/`, `/about`, `/sign-in`, `/home`, `/search`, `/listing/<id>`.
- **EVIDENCE:** The console reads "Refused to load the script 'https://www.vallospaces.com/_next/static/chunks/11-v4cdswovuj.js?dpl=dpl_7tf6nMQVEPdFt8ffUhQ8yUpQyGXj' because it violates the following Content Security Policy directive: "script-src 'self' https: 'nonce-…' 'strict-dynamic'"". `grep -o '<script[^>]*>'` over the landing HTML gives 42 inline plus 15 src scripts WITH a nonce, and this one without.
- **WHY IT MATTERS:** It buries real CSP reports in noise and wastes 15 KB per cold load. It may become a real break if a future build stops duplicating those modules.
- **THE FIX:** Find which component emits it, probably a React `preinit`/`<script>` rendered from a client boundary or a `next/script` without `nonce`. Pass the nonce (`headers().get(NONCE_HEADER)`) to it. Then add a Playwright check to `tests/` that fails on any `securitypolicyviolation`.
- **EFFORT:** 2 to 4 hours.
- **PASS TWO:** CONFIRMED (LOW). Live `/about`: `<script src="/_next/static/chunks/11-v4cdswovuj.js?dpl=dpl_7tf6nMQVEPdFt8ffUhQ8yUpQyGXj" async="">` is the only src script without a nonce.
  - *Also reported as UI-12 (A06 interface, MEDIUM; MERGED INTO this ID at LOW in pass two):* the same nonce-less `11-v4cdswovuj.js` (Next's `use-merged-ref` module), `FAIL csp`, never retried. Fix addition: a CI check that fails when any `<script src>` lacks a nonce (alongside the Playwright `securitypolicyviolation` check); A06 also suggested setting a `content-security-policy` request header carrying the nonce in `proxy.ts`, which is what Next parses to stamp its own tags.
  - *Also reported as UX-27, CSP half (A05 UX, merged here):* the same refusal on `/`, `/welcome` and others. Its suggested fix ("pass the nonce to `<Script>`/`next/script`") would do nothing: no `next/script` is used and the tag is Next's own chunk. UX-27's separate error-boundary half ("Try again" cannot recover a failed chunk) stays in A05 at LOW.

#### OPS-16 | Brand / sharing | LOW | Every shared listing link previews as the generic Vallo card. The og:image (294 KB) sits just under WhatsApp's roughly 300 KB thumbnail limit. There is no og:url or canonical.
- **WHAT IS WRONG:** With the platform closed to signed-out visitors, `/listing/<id>` returns 307 to `/sign-in?next=…`, and WhatsApp follows it. So every shared listing shows the sign-in page's metadata: the title "Vallo. Rent, buy or stay, without the runaround.", the site description, and the brand image, with no listing title, price or photo. This is deliberate (the proxy.ts comment accepts it), but it removes the strongest organic growth loop in Nigeria, WhatsApp sharing. The og:image is 1200×630 PNG at 294,075 bytes, and WhatsApp tends to drop previews for images over about 300 KB. There is no `og:url` and no `<link rel=canonical>` on any page.
- **WHERE:** `https://www.vallospaces.com/opengraph-image.png`, `apps/web/src/app/opengraph-image.png`, `proxy.ts` gate.
- **EVIDENCE:** `curl -sL -A 'WhatsApp/2.23.20.0' https://www.vallospaces.com/listing/ed000000-0000-4000-8000-000000000003` ends at `…/sign-in?next=%2Flisting%2Fed…` with `<title>Sign in | Vallo`, `og:title "Vallo. Rent, buy or stay, without the runaround."`, `og:image https://www.vallospaces.com/opengraph-image.png?…`, and `robots noindex, nofollow`. `file og.png` shows `PNG image data, 1200 x 630, 8-bit colormap`, 294075 bytes. The image renders correctly: a dark skyline, the VALLO mark, "Real Estate reimagined!". Note that its tagline ("Rent, buy or sell…") differs from the site copy ("Rent, buy or stay").
- **WHY IT MATTERS:** This is the first brand impression in Nigerian group chats, and the listing itself is invisible in it.
  - *Pass two: the "~300 KB WhatsApp limit" is folklore rather than documented; the JPEG fix is kept because it is cheap, not because the limit is proven.*
- **THE FIX:**
  1. Re-export the OG image as JPEG at about 120 KB.
  2. The founder decides whether to exempt social crawler user agents (`WhatsApp`, `facebookexternalhit`, `Twitterbot`) on `/listing/*` so they get a metadata-only response with the listing's title, price and cover photo. This is a product and privacy decision, because it partly reopens the closed platform.
  3. Add `alternates: { canonical: '/' }` and `openGraph.url` in the root metadata.
- **EFFORT:** 1 hour for the image and canonical. Half a day for the crawler exemption, if approved.
- **PASS TWO:** CONFIRMED (LOW); premise noted. `opengraph-image.png` → 200, 294075 bytes; the WhatsApp UA on `/listing/ed…003` → 200 at `/sign-in?next=…`.

#### OPS-17 | 404 handling | LOW | A missing listing is a soft 404 (200, then a streamed not-found). Signed-out unknown paths get a 307 to sign-in instead of a 404.
- **WHAT IS WRONG:** For a signed-in user, `/definitely-not-a-page-xyz` returns a real 404 with the branded "This page has checked out" page, which is good. But `/listing/00000000-0000-4000-8000-000000000000` returns HTTP 200: the `loading.tsx` Suspense boundary commits the status before `notFound()` streams in. Signed out, every unknown path returns 307 to `/sign-in?next=…`. That is intentional (born locked), and robots.txt disallows the product paths, so crawler harm is small, but it means no signed-out 404 ever exists. The 404 page also carries `robots: index, follow`.
- **WHERE:** `apps/web/src/app/not-found.tsx`, the `app/(app)/listing/[id]` loading boundary, and `proxy.ts:347-386`.
- **EVIDENCE:** As the member: `/definitely-not-a-page-xyz 404 … h1= This page has checked out robots= index, follow` and `/listing/00000000-… 200 title= Listing | Vallo … NEXT_HTTP_ERROR true`. Signed out: `curl -sI https://www.vallospaces.com/definitely-not-a-page-xyz` gives `307 → /sign-in?next=%2Fdefinitely-not-a-page-xyz&notice=sign-in-required`.
- **WHY IT MATTERS:** Minor today. It matters if listings ever become crawlable (a soft 404 gets indexed) and for monitoring, where a 200 on a broken link hides dead links.
- **THE FIX:** In `listing/[id]/page.tsx`, resolve the listing before any Suspense boundary (move the `byId` read above `loading.tsx` by removing the route-level `loading.tsx`, or call `notFound()` in `generateMetadata`, which runs before streaming). Set `robots: { index: false }` in `not-found.tsx` metadata.
- **EFFORT:** 1 to 2 hours.
- **PASS TWO:** CONFIRMED (LOW, no change); re-check limited. `app/(app)/listing/[id]/loading.tsx` exists, so the status is committed before `notFound()`; the signed-in request was not re-run.

#### OPS-18 | External dependency | LOW | Assistant and support calls to Anthropic have no server-side timeout.
- **WHAT IS WRONG:** `streamOneRound` passes only `req.signal`, so a stalled upstream stream (no bytes, socket open) holds the function until Vercel's maximum duration. There is no `export const maxDuration` on either route. `bot-actions.ts` does it right, with a 20 s `AbortController`.
- **WHERE:** `apps/web/src/app/api/assistant/route.ts:697-705, 977`, and `apps/web/src/app/api/support/route.ts:~257`.
- **EVIDENCE:** `grep -n "maxDuration\|AbortSignal.timeout" app/api/assistant/route.ts app/api/support/route.ts` finds no timeout.
- **WHY IT MATTERS:** Cost (billed function seconds) and a spinner that never resolves for the user.
- **THE FIX:** `signal: AbortSignal.any([req.signal, AbortSignal.timeout(45_000)])`, an idle-chunk watchdog of 15 s without an event, and `export const maxDuration = 60`.
- **EFFORT:** 1 hour.
- **PASS TWO:** CONFIRMED (LOW). `api/assistant/route.ts:699` and `api/support/route.ts:257` take only the passed `signal: AbortSignal`; neither route exports `maxDuration`.

#### NEW IN PASS TWO

#### OPS-P2-01 | OPS / CAPACITY | HIGH | Production runs on Supabase's Free tier: tiny compute, 60 connections, and quotas that real supply will exceed
- **WHAT IS WRONG:** Beyond backups (OPS-07), the Free organisation `Naijafinds` puts the live marketplace on the smallest compute (`max_connections` = 60 live). It also carries Free-tier quotas: roughly 500 MB database, 1 GB file storage, a monthly egress cap, and auth email rate limits. The limits are from Supabase's published tiers as I know them; UNVERIFIED against today's pricing page.
  - **The numbers:** listing photos upload raw at up to 10 MB each (OPS-13), and there is a `listing-videos` bucket. A few dozen real listings would fill the storage quota. Today the DB is 40 MB and storage holds 8 objects.
- **WHERE:** `get_organization tsyqgrfidyjwdefxvdbb` → `"plan":"free"`. Live `current_setting('max_connections')` → `60`. Live `select count(*) from storage.objects` → `8`. `pg_database_size` → `40 MB`.
- **EVIDENCE:** Not stated separately by the pass-two reviewer.
- **WHY IT MATTERS:** On the first busy day (a press spike, which is exactly what launch is), the landing page's roughly 11 uncached PostgREST calls per visitor (OPS-11) meet the smallest compute. Uploads start failing when storage fills. A store reviewer hitting a throttled or paused project sees a broken app.
- **THE FIX:** Upgrade the organisation to Pro before store submission. Set a spend cap. Pick at least Small compute. Add the downscale from OPS-13. Put storage and egress usage on the admin console.
- **EFFORT:** 15 minutes of founder time plus the monthly cost.
- **PASS TWO:** NEW IN PASS TWO (found by the reviewer, A10). `get_organization` → `"plan":"free"`; live `max_connections` 60; `storage.objects` count 8; `pg_database_size` 40 MB. Free-tier quota figures are from general knowledge, UNVERIFIED against the pricing page. *Orchestrator note:* its "listing photos upload raw at up to 10 MB each (OPS-13)" premise is corrected — wizard photos are re-encoded to ≤ 2560px JPEG; the quota pressure now comes mainly from direct uploads, host/stay photos (`PhotoManager`, SEC-04) and videos.

#### OPS-P2-02 | OPS / OWNERSHIP | MEDIUM | The production database and hosting sit under personal, unrelated account names, not the company
- **WHAT IS WRONG:** The live Vallo database is the Supabase project `"<a personal Gmail address>'s Project"`, in an organisation named `"Naijafinds"`. Vercel hosts it in team `"boosthubservice-2204's projects"`, alongside unrelated projects (`bank-app`, `rigidinvestments`, `private-country`, `kivo-5cfj`). Nothing in `docs/` records who owns these accounts or how to recover them. This is also why Agent 9's MCP connections landed on the wrong projects.
- **WHERE:** `mcp__Supabase__get_project` and `get_organization`; `mcp__Vercel__list_teams` and `list_projects`.
- **EVIDENCE:** Not stated separately by the pass-two reviewer.
- **WHY IT MATTERS:** VALLO SPACES LTD's customer data, wallet ledger and KYC documents are controlled by a personal Gmail-named account. That matters for NDPA controller accountability, continuity (a lost login or a lapsed card means a lost platform), and any investor or payment-partner due diligence. It is the same failure shape as the GitHub billing lapse that has stopped CI today (DOC-01).
- **THE FIX:** Create a company-owned Supabase organisation and Vercel team (on a company email with 2FA and at least two owners), and transfer the project and team into them. Record the account owners and recovery paths in `docs/DEPLOY.md`.
- **EFFORT:** 1 to 2 hours plus a transfer window.
- **PASS TWO:** NEW IN PASS TWO (found by the reviewer, A10). `mcp__Supabase__get_project`/`get_organization` and `mcp__Vercel__list_teams`/`list_projects`.

#### OPS-P2-03 | OPS / ALERTS | LOW | Alert state is internally inconsistent: an "open" alert carries a resolution time
- **WHAT IS WRONG:** `risk_alerts` row `c60f5d48-…` ("Content: filter, empty", high) has `status: open` and `resolved_at: 2026-09-23T11:50:27Z` with `resolved_by: null`. No constraint ties `status` to `resolved_at`, and something resolved it without an actor and without flipping the status (or reopened it without clearing the time).
- **WHERE:** live `select to_jsonb(r) from risk_alerts r where status <> 'resolved'`.
- **EVIDENCE:** Not stated separately by the pass-two reviewer.
- **WHY IT MATTERS:** Desks that count by `status` and desks that count by `resolved_at` disagree, and the audit trail has no actor. It is also the one Apple guideline 1.2 blocker alert, so its true state matters. Owner: the moderation or alerts agent.
- **THE FIX:** Add `check ((status = 'resolved') = (resolved_at is not null))`. Make `resolved_by` required when resolved (or allow system with an explicit `resolved_by_kind`). Find the writer that set `resolved_at` alone.
- **EFFORT:** 1 hour.
- **PASS TWO:** NEW IN PASS TWO (found by the reviewer, A10). Live `select to_jsonb(r) from risk_alerts r where status <> 'resolved'`. The same row was diagnosed independently in DB-19's pass-two amendment (A08); not in the known-duplicate list, so kept with a cross-reference.

#### OPS-P2-04 | OPS / RECONCILIATION | MEDIUM | A reconcile recovery is proof the webhook failed, and nothing says so

**A reconcile recovery is proof the webhook failed, and nothing says so.** An extension of A01's-area MON-P2-03 to ops (the only real top-up was recovered by the sweep 16h44m late; live `audit_log` shows no webhook-credited funding ever; the reconcile verdict does not distinguish "healthy" from "healthy because I patched what the webhook dropped"). The reviewer itself wrote "Keep MON-P2-03 as the primary ID and treat this as its ops fix". Its fix (any `recovered` funding or unsettled booking charge raises `payment.webhook.missed` at critical; after the founder registers the webhook, one dashboard test event must show a webhook-actor funding row) is carried in MON-P2-03.

- **PASS TWO:** MERGED INTO MON-P2-03 (at the reviewer's own instruction). Canonical severity MEDIUM.

#### OPS-P2-05 | OPS / DEPLOY SAFETY | HIGH | Nothing stands between a push to `main` and production: CI cannot run, `main` is unprotected, and the live dependency tree differs from the one tested

**Nothing stands between a push to `main` and production: CI cannot run, `main` is unprotected, and the live dependency tree differs from the one tested.** Filed by the reviewer (A10) as a cross-reference from its own pass one so the ops owner sees it, because OPS-08 assumes CI exists. Its evidence (every CI job since 15:48Z annotated "The job was not started because recent account payments have failed…"; runs 403 to 578 failed at `npm ci`; `GET /branches/main` → `"protected": false`; live JS serves Next `16.2.12` while every gate ran 16.3.6; the deployment id changed mid-audit) and its fix are DOC-01 and DOC-02.

- **PASS TWO:** MERGED INTO DOC-01 (and DOC-02 for the dependency-tree half) — the reviewer wrote "THE FIX: See DOC-01 and DOC-02. Listed here so the ops owner sees it in the ops file." Canonical severity HIGH (DOC-01).

#### EXTERNAL DEPENDENCY TABLE (carried from pass one)

| Dependency | Client code | Timeout | Retry / backoff | Fallback / what the user sees when it is slow, down or returns garbage |
|---|---|---|---|---|
| **Supabase (DB / PostgREST)** | `lib/supabase/{server,admin,client}.ts` | **None.** No `global.fetch` with a signal anywhere in `lib/supabase/` | None | Catalogue reads catch every error and return `[]` or `null`, so the user sees "0 properties" or a not-found listing (OPS-04). Server actions return `SERVICE_DOWN_MESSAGE`, which is honest. |
| **Supabase Auth (GoTrue)** | `proxy.ts:343-345` `supabase.auth.getUser()` on EVERY request, including prefetches | **None** | None | An error is treated the same as "no user", so a signed-in user is redirected to `/sign-in?notice=sign-in-required` (OPS-05). A hang holds every navigation for as long as GoTrue does. |
| **Supabase Storage (uploads)** | Photos: one direct POST, then `registerPhoto` (`lib/agent/listings-actions.ts:~460`). Video: TUS resumable (`lib/agent/resumable-upload.ts`) | none / per-chunk | Video resumes via HEAD offset. **Photos have no resume and no downscale** (OPS-13) | A dropped photo upload starts again from zero. |
| **Paystack** | `lib/payments/paystack.ts:19-20` | 15 s `AbortSignal.timeout` | None in the client. Recovery is: webhook (Paystack retries on non-2xx), return-path verify (`settleCardPayment`), and the hourly reconcile. | A timeout is shown as "could not be reached", and the attempt is marked FAILED (`checkout.ts:343-356`). Garbage (a non-JSON envelope) becomes a `PaystackError`. |
| **Paystack webhook** | `app/api/paystack/webhook/route.ts` | n/a | Idempotent by reference. A thrown error returns 500, so Paystack redelivers. | See the webhook section. |
| **Resend** | `lib/email/client.ts:21-22` | 10 s | **Direct sends: none** (`bestEffortEmail` swallows). The outbox (`lib/notify/outbox.ts`, drained every 15 min) retries with attempt caps and dead-letter alerts. | The user's action succeeds and the email is silently lost (direct path, OPS-14). |
| **MapTiler** | `lib/maps/tiles.ts:76-79`, `components/app/search/MapCanvas.tsx:244-262` | 6 s "no tile painted" timer | Leaflet default | Shows an explicit "offline imagery" state. No runtime fallback to another provider. Sound for a map. |
| **Google Places / Routes, LiteAPI** | Removed 2026-08-09 (`docs/ENVIRONMENT.md:85`, ADR-013). No code reads them. | — | — | Not a dependency. The founder should delete the env vars. |
| **Termii** | Not shipped (`docs/ENVIRONMENT.md:105`) | — | — | No SMS/phone OTP exists. |
| **Firebase FCM / APNs / WebPush** | `lib/push/transport/{fcm,apns,webpush}.ts` | 10 s (fcm.ts:204, webpush.ts:396). APNs has a timeout path (apns.ts:224). | `lib/push/drain.ts:72-75`: 4 queue attempts, 3 per device | Push is lost after the caps, and `push_queue_health` records it. Sound. |
| **Anthropic** | `app/api/assistant/route.ts:697-705`, `app/api/support/route.ts:~257`, `lib/social/bot-actions.ts:189-190` | Assistant and support: **only `req.signal`** (client abort), no server timeout (OPS-18). Bot: 20 s. | None | A slow upstream holds a streaming function open until Vercel's max duration. |
| **Sentry** | `lib/observability/report.ts` (a hand-rolled envelope POST) | 2 s | 60 s dedupe | Silent `{sent:false}` when `SENTRY_DSN` is unset. **It is NOT SET in production** (confirmed by the founder's read of Vercel, 23 September), so every call is a silent no-op. |
| **Yellow Card / CoinGecko** | `lib/payments/yellowcard.ts:61`, `lib/crypto/upstream.ts:18` | 15 s / 8 s | None | Typed errors. |

No dependency has a circuit breaker. Nothing retries with backoff inside a request, which I think is acceptable for a request-scoped app. The retry burden sits on crons and outboxes, which exist.

#### WEBHOOKS: specific answers (carried from pass one)

| Question | Paystack | Yellow Card |
|---|---|---|
| Signature verification | HMAC-SHA512 over the raw body with `timingSafeEqual`, length checked first (`lib/payments/paystack.ts:461-472`). A bad signature returns 401 plus a warning alert plus a per-IP spray limit. **SOUND.** | `verifyWebhookSignature` over the raw body, 401 on failure (`app/api/yellowcard/webhook/route.ts:57-97`). Sound as far as read. |
| Replay | A signed body replayed is harmless: funding dedupes on `wallet_entries` reference (`recordFunding` returns `duplicate`), and booking settlement dedupes on the PENDING/FAILED to SUCCESSFUL transition (`settlement.ts:214-219`). Paystack does not sign a timestamp, so replay protection has to be idempotency, and it is. **SOUND.** | not examined in depth |
| Out of order | `charge.failed` after `charge.success` is safe (`markChargeFailed` only touches PENDING, `settlement.ts:292-304`). `success` after `failed` moves the money in (FAILED is included). Transfers use `settleWithdrawal` on pending only. **SOUND.** | — |
| Duplicate delivery | As for replay. **SOUND.** | — |
| Never delivered | Funding: the user-side `FundingVerifier` on return, plus the hourly reconcile with `apply:true` from pg_cron (live audit rows at :47 each hour) posts gaps. **SOUND.** Booking: the return-path verify only, and reconcile **reports but never settles** (OPS-02). | — |
| Our endpoint fails | Throws produce 500, and Paystack retries for up to 72 h. A missing key or service role produces 503 plus a critical alert. But booking `unknown-reference` returns 200 labelled "duplicate" with no alert (OPS-02). | — |

#### CHECKED AND FOUND SOUND

- **Crons are running now.** Live `audit_log` as the QA admin account: `cron.email-outbox.ok` every 15 min through 20:15 UTC, `cron.push-drain.ok` every 5 min, `cron.hold-sweep.ok` hourly at :05, `cron.pg-cron-watch.ok` at :20, `wallet.reconciliation.run` hourly (Vercel `apply:false` at :10, pg_cron `apply:true` at :47, both `outcome: clean`), and on 2026-09-23 daily `cron.account-purge.ok` 03:15, `complete-stays.ok` 02:30, `inventory-drift.ok` 02:45, `saved-search-alerts.ok` 07:40. The `CRONS_SECRET` typo has been fixed.
- **Reconciliation's "Paystack unreachable" state is not reported as clean.** `charges.unavailable` makes `needsAttention` true (`lib/wallet/reconciliation.ts:910-917`), which raises a `cron.reconcile.needs_attention` alert.
- **The Paystack client** has a 15 s timeout. A non-JSON or `status:false` envelope becomes a typed error, and a failed initialize marks the attempt FAILED with the message "Nothing was charged and your dates are still held" (`checkout.ts:343-356`). Return-path copy is honest for every Paystack status (`checkout.ts:681-708`).
- **The email outbox** has attempt caps, dead-letter, stuck and backlog alerts (`lib/cron/jobs/email-outbox.ts`). Every catalogue message has a text/plain part and a preheader (`render.ts:534`).
- **DKIM** (`resend._domainkey`) is published. **SPF and bounce MX** on the `send.` Return-Path subdomain are correct.
- **Error pages exist and are branded:** `app/not-found.tsx`, `app/error.tsx`, `app/global-error.tsx`, and route-group `error.tsx` for `(app)`, `(site)`, `(auth)`, `admin`, `agent`. All of them report to `/api/client-error`, which forwards to Sentry when configured. The global error offers "try again" and shows a digest reference.
- **Skew protection** is on: chunk URLs carry `?dpl=`, so a deployment swap mid-session does not 404 old chunks.
- **The service worker** is network-first for documents with a designed `/offline` page, and cache-first for `/_next/static/`, brand and icons (`public/sw.js:52-96, 263-300`), so repeat visits are cheap.
- **Video upload is resumable** (TUS with a HEAD resume, `lib/agent/resumable-upload.ts`).
- **The map** degrades to an explicit "offline" imagery state after 6 s or 3 tile errors (`MapCanvas.tsx:244-262`). Map pins API is bbox and pin capped (`bounds.ts:82-85`) and rate-limited (`api/map/listings/route.ts:56`).
- **Text search is indexed** (pg_trgm on title, city and area) and there is a catalogue order index.
- **robots.txt and sitemap are consistent.** The sitemap lists the 13 public pages, and every one answers 200 to a Googlebot UA. robots disallows every gated product path, so crawlers are not fed 307s from the sitemap. Apex and http 308 to `https://www.` HSTS is preloaded.
- **Account deletion** runs daily with idempotent purges and an unfinished-purge alert (`lib/cron/jobs/account-purge.ts:30-44`).
- **Sentry transport** (when configured) has a 2 s timeout, a scrub allowlist and dedupe, and it cannot throw into the failing request (`lib/observability/report.ts`, `instrumentation.ts`).

#### CORRECTLY EMPTY vs BROKEN

| Surface | State | Verdict |
|---|---|---|
| `wallet.reconciliation.run` `charges_seen: 0` | zero Paystack charges ever | CORRECTLY EMPTY (no payments exist). It cannot prove the sweep sees real charges; see NOT COVERED. |
| `risk_alerts` open list | 1 open high ("Content: filter, empty") | Not empty. The alert is real and 22 h old, and belongs to the moderation owner. Evidence for OPS-03. |
| Vercel runtime errors (7 d) | "No runtime errors found" | NOT EVIDENCE. The MCP is connected to the wrong project (`v0-viticulture-labs-app`). |
| `/search` results | 64 example listings shown | CORRECT today. But an error would render as empty, and the two cannot be told apart (OPS-04). |

*Pass-two note:* the open "Content: filter, empty" alert also carries a `resolved_at` (OPS-P2-03, DB-19); four alerts were open at review time, two of them created by auditors' probes (DB-P2-02).

#### NOT COVERED

- **Vercel runtime logs, errors, env vars and deployment history for the real project.** The Vercel MCP only exposes team `boosthubservice-2204's projects` / project `v0-viticulture-labs-app` (one deployment from February). So I could not see what is erroring in production right now, whether `SENTRY_DSN`, `EMAIL_REPLY_TO`, `CRON_SECRET` or `RESEND_API_KEY` are set, or which Vercel plan applies (function duration limits, image-optimisation quota).
- **The Supabase plan, backups, PITR, compute size and connection limits.** The Supabase MCP only sees an inactive unrelated project.
- **Real 3G timings from Lagos.** My runs went through a slow, flaky sandbox proxy from a US vantage point. Byte counts are reliable; timings are indicative only. The one global-error render was not reproduced.
- **Load testing.** I did not generate load against production. OPS-11 is analysis.
- **Supabase Auth email sending** (SMTP provider for confirmation and reset mails) and Resend plan limits (free tier: 100/day).
- **The Yellow Card webhook**, beyond its signature check.
- **Firebase and APNs credentials being configured.** I read only the transport timeouts.
- **Deep check of the `/api/csp-report` storage or rate limiting.**
- Observed in passing, for Agent 4 (brand): signed-in `/search` cards read "Listed by **RentMe** Example Collection, agent". That is the old brand name on a live screen.

**Pass two (A10) did not cover:**

- Vercel env vars (`SENTRY_DSN`, `EMAIL_REPLY_TO`, `RESEND_API_KEY`) and the Vercel plan. The connection returns 404 for the project even though it lists it. **Confirmed after the audit (founder's read of Vercel, 23 September):** `SENTRY_DSN` and `EMAIL_REPLY_TO` NOT SET; `RESEND_API_KEY` set. The plan is still unverified.
- The throttled 3G timings (OPS-10) and the signed-in soft-404 (OPS-17) were not re-run.
- Supabase Free-tier quota figures are from general knowledge and were not read from their pricing page today.
- The 306 applied migrations versus 304 files were not diffed (belongs to Agent 3).

*Pass-two note on the second bullet:* now covered — the Supabase plan is Free, `max_connections` 60 (OPS-07, OPS-P2-01).

#### FOR THE FOUNDER

1. **Connect the right accounts to the tooling**, or tell us the Vercel project and Supabase ref are under another login. Two areas (production errors and backups) could not be audited because of this.
2. **Supabase plan and backups:** confirm Pro plus PITR, and book one restore drill (OPS-07).
3. **Pick an alerts inbox or phone** (for example `ops@`) and sign up for an uptime monitor (Better Stack or UptimeRobot, free). Set `SENTRY_DSN` (it is not set) and make Sentry email you (OPS-03).
4. **DNS:** add DMARC, and choose a mailbox provider so `hello@` and `support@vallospaces.com` can receive mail. Set `EMAIL_REPLY_TO`, which is not set today (OPS-06).
5. **Region:** approve moving functions to `dub1` (OPS-09).
6. **Sharing vs closed platform:** decide whether WhatsApp and Facebook crawlers may see a listing's title, price and cover photo (OPS-16).
7. **Process:** protect `main` and have sessions deploy via previews. Migrations go through a staging branch (OPS-08).
8. **Refund policy for duplicate or late payments:** automatic refund, or admin one-click (OPS-01 and OPS-02 need your ruling on which).
9. **On Paystack upgrade day:** re-run the reconcile with `?apply=1&hours=720` once, confirm `charges_seen > 0` for the first real charge, and watch `/admin/alerts` for `payment.*` kinds.

*Pass-two notes:* item 2 becomes "upgrade to Pro before the first real payment" (the plan is Free); item 1 is explained by OPS-P2-02 (the live Supabase project is `"<a personal Gmail address>'s Project"` in organisation `Naijafinds`, and Vercel hosts it in team `"boosthubservice-2204's projects"` beside unrelated projects) — move both into company-owned accounts with two owners and 2FA.

#### CLEANUP NOTES

- Neither pass wrote to the live database. Pass one read live data over PostgREST as the QA accounts (no credentials recorded); pass two used read-only SQL only.

---

### A10 — THE DOCUMENTS, THE TESTS AND THE TRUTH: merged pass one + pass two

Sources: `pass1/A10-truth.md` (Agent 10; tree `/home/user/read-it-well` at `85c5471c` = origin/main after a read-only fetch; shallow clone, so history questions went to the GitHub API) and its pass-two review `pass2/R-A10-by-A09.md` (Agent 9; local `85c5471`, origin/main `0ab215f`, no audited path differs). Pass one restored the `tsconfig.json` that `next build` rewrote and deleted its own `.next-a10`; `git status` was clean at the end of both passes.

Pass-two tally: confirmed 14 (DOC-01, 03, 04, 07, 08, 09, 10, 12, 13, 16, 17, 19, 23, 24); severity changed 4 (DOC-02 HIGH→MEDIUM, DOC-05 HIGH→MEDIUM, DOC-11 MEDIUM→LOW, DOC-14 MEDIUM→LOW); fix or evidence amended 6 (DOC-06, 15, 18, 20, 21, 22 — the last three are confirmed with evidence only refined); withdrawn 0; new 4. DOC-04 is merged into DOC-03 (known duplicate) and OPS-P2-05 into DOC-01.

**Gates measured in pass one at `85c5471c` (local tree Next 16.3.6 / React 19.3.0, NOT the production tree):** typecheck exit 0; lint exit 0 with 0 errors and 335 warnings; vitest 242 files, 3859 passed, 1 skipped, 0 failed; `next build` (no env) exit 0; `npm ci` FAILS (`Missing: @capacitor/push-notifications@8.1.2 from lock file`); `check-deep-links.mjs` exit 1 (placeholder fingerprints). Pass two re-ran vitest (3859 passed, 1 skipped, 37.6 s) and lint (0 errors, 335 warnings), but not typecheck or build.

#### DANGER NOW

None meets the brief's bar: no money is leaking and no data is exposed. Two items come close and the orchestrator should read them first:
- **DOC-01**: CI has not given a verdict on any commit since 09:57Z today. From 10:16Z every run failed on `npm ci` because of the lockfile. From 15:48Z no job gets a runner at all, because GitHub billing has lapsed. `main` has no branch protection. Everything since this morning has shipped with no gate running.
- **DOC-02**: production runs the lockfile's dependency tree: Next **16.2.12** (confirmed from the live JS bundle). `npm audit` flags that version CRITICAL (GHSA-2xp9-vwfh-vxw4, RCE in the Image Optimization API with AVIF, through sharp <0.35.4). Every gate run today, including all of mine, used a different tree (Next 16.3.6). I have NOT verified whether the vulnerable path can be exploited on Vercel's hosted image optimiser.

*Pass-two note:* DOC-01 stands (HIGH). DOC-02 is lowered to MEDIUM: the reviewer showed from response headers that `/_next/image` on this deployment is served by Vercel's own optimiser, not the function's bundled sharp, so the CRITICAL AVIF RCE does not reach production as deployed; the tree drift and the pinned vulnerable version remain.

#### FINDINGS (pass one, with pass-two verdicts)

#### DOC-01 | CI / GATES | HIGH | CI has given no verdict since 09:57Z. It is red on the lockfile, then dead on billing, and `main` has no protection
- **WHAT IS WRONG:** From run 403 (10:16Z) onward, every CI run failed at `Install` (`npm ci`). From run 579 (15:48Z) onward, jobs never start at all, because the GitHub account's payments have failed or its spending limit is reached. `main` is unprotected and has no required checks. All 648 runs were direct `push` events; no pull request has ever run. Nothing in any status doc tells the founder any of this.
- **WHERE:** `.github/workflows/ci.yml:55` and `:87` (`npm ci`). GitHub `moderator29/read-it-well` Actions. The branch protection API.
- **EVIDENCE:**
  - Conclusions across all 648 runs: `398 cancelled, 191 failure, 59 success`. The last success was **run 394, 2026-09-23T09:57:10Z, `e032cb53`**.
  - Run 403 (10:16Z) jobs: `Typecheck, lint, test: Install:failure, Typecheck:skipped, Lint:failure, Test:failure` and `Build: Install:failure, Build:skipped`. Run 578 (15:45Z) shows the same.
  - The lockfile break came in with `7da4b0d0` (2026-09-23T10:15:47Z, "Push, the rest of it..."). That commit touched `apps/web/package.json`, but the last commit to `package-lock.json` is `7994d9b7` (22 Sept 22:34Z).
  - Runs 579 to 648: `steps=0` on every job, `runner_id: 0`, finished in about 5 s. Check-run annotation, verbatim: `"The job was not started because recent account payments have failed or your spending limit needs to be increased. Please check the 'Billing & plans' section in your settings"`.
  - `GET /repos/moderator29/read-it-well/branches/main` returned `"protected": false, "required_status_checks": {"enforcement_level": "off", "contexts": []}`. The rulesets API returned 403 "Upgrade to GitHub Pro or make this repository public".
  - 72 runs carried real steps and 68 had none, across the 140 failures after run 403.
  - (from OPS-P2-05, A10's cross-reference in the ops file) Live JS serves Next `16.2.12` (lockfile) while every gate ran 16.3.6 (DOC-02); A09 watched the production deployment id change mid-audit (`dpl_63XH…` → `dpl_7tf6…`).
- **WHY IT MATTERS:** A red test, lint, typecheck or build can reach production unseen. Vercel deploys on push whatever CI says. Every doc line that says "a test fails the build" (DOC-10) is void while this holds. Even when CI worked, `cancel-in-progress` cancelled 398 of 648 runs, so most commits in a burst were never checked (DOC-23).
- **THE FIX:** (amended in pass two)
  - *Pass-one fix, retained:* 
    1. The founder settles GitHub billing (Settings, Billing & plans) or sets a spending limit above zero.
    2. At the repo root, run `npm install` to regenerate `package-lock.json` with `@capacitor/push-notifications@8.x`, and commit it by pathspec. Confirm with `rm -rf node_modules && npm ci`.
    3. Turn on branch protection for `main`. It needs GitHub Pro/Team on a private repo, or a ruleset. Require `Typecheck, lint, test` and `Build`. If protection cannot be bought, set Vercel's "Ignored Build Step" to wait on the GitHub check (or use Vercel's Deployment Checks) so a red CI blocks promotion.
    4. Add a line to `FOUNDER_OPEN_ITEMS.md` that CI is dead and why.
  - *Pass-two amendments:*
    - Vercel production builds do not use `npm ci`; they succeed today and serve the lockfile's Next 16.2.12, so Vercel's default `npm install` honours the lock and resolves the missing entry on its own. Repairing the lockfile is also what makes CI and Vercel install the same tree. After the repair, set Vercel's Install Command to `npm ci` explicitly so the two cannot drift again.
- **EFFORT:** Billing: minutes, founder only. Lockfile: 15 minutes. Protection or deployment checks: 1 hour.
- **PASS TWO:** CONFIRMED (HIGH), reproduced independently through the GitHub MCP and REST API — fix addition. Latest runs 649 (`0ab215f`, 20:25Z) back to 642 all `conclusion: failure`, each job ~3–4 s; run 649's check-run annotation verbatim "The job was not started because recent account payments have failed or your spending limit needs to be increased…" (`get_job_logs` 404: no log for a job that never started); run 403's log: `npm error Missing: @capacitor/push-notifications@8.1.2 from lock file` at 10:17:16Z; `GET /branches/main` → `protected False`, no required checks; last success run 394 (`e032cb53`, 09:57:10Z); totals cancelled 398, success 59, failure 192 (incl. run 649). Absorbs OPS-P2-05 (MERGED INTO this ID). DOC-01 is also the canonical entry for the CI/branch-protection half of OPS-08, which keeps only the migration angle.

#### DOC-02 | DEPENDENCIES | MEDIUM | Production runs the lockfile tree (Next 16.2.12, flagged CRITICAL). Every gate ran a newer, different tree
- **WHAT IS WRONG:** `npm ci` fails, so every local session installed without the lockfile. The build sessions did this, the brief says the audit setup did it, and so did I. The gates therefore ran Next 16.3.6, React 19.3.0 and supabase-js 2.117.1. Production is built from the lockfile and serves Next 16.2.12. `npm audit --omit=dev` flags the locked tree with 1 critical and 2 high.
- **WHERE:** `package-lock.json` versus `node_modules`. Live bundle at https://www.vallospaces.com/_next/static/chunks/*.js.
- **EVIDENCE:**
  - Locked versus installed:
    ```
    next                     lock=16.2.12  installed=16.3.6
    sharp                    lock=0.35.3   installed=0.35.4
    nanoid                   lock=3.3.16   installed=3.3.19
    react                    lock=19.2.8   installed=19.3.0
    @supabase/supabase-js    lock=2.110.9  installed=2.117.1
    ```
  - The live chunks contain `version:"16.2.12"` and `19.3.0-canary-3f0b9e61-20260317` (the React canary bundled with that Next).
  - `npm audit --omit=dev`, verbatim:
    ```
    next  9.5.6-canary.0 - 10.0.7 || 14.3.0-canary.0 - 15.5.23 || 15.6.0-canary.0 - 16.3.2
    Severity: critical
    Next.js: Unauthenticated Remote Code Execution on windows-hosted servers - GHSA-p293-qw3h-jr36
    Next.js: Unauthenticated Remote Code Execution in Image Optimization API when AVIF files are used - GHSA-2xp9-vwfh-vxw4
    sharp  <0.35.4  Severity: high  (libheif GHSA-g89c-p67h-r497, GHSA-2jg2-4ch7-h545)
    nanoid  <3.3.18 Severity: high  (GHSA-2v37-7h3g-55p8)
    3 vulnerabilities (2 high, 1 critical)
    ```
  - Root `package.json` overrides pin `"sharp": "^0.35.3"`, which the lock resolves to 0.35.3.
- **WHY IT MATTERS:**
  - Every test, typecheck and build result in this repository, including the green build reported above, describes a dependency tree that does not run in production.
  - The Windows RCE does not apply on Vercel's Linux runtime.
  - Whether the AVIF path can be exploited depends on whether Vercel's hosted optimiser, rather than the function's sharp, handles `/_next/image`. **UNVERIFIED.**
  - *Pass two (A09): the CRITICAL RCE does not reach this deployment. On Vercel, `/_next/image` is served by Vercel's Image Optimization service, not by the function's bundled sharp: page and API responses carry a two-part `x-vercel-id` (edge + function region, e.g. `iad1::iad1::92lm5-…`), while every `/_next/image` response carries a single edge segment (`iad1::db4vt-…`) with `x-matched-path: /brand/scenes/house.jpg` and `content-disposition: attachment; filename="house.jpg"`; a disallowed remote source is refused `400` at that edge layer; `next.config.ts` has no `loader`, `loaderFile`, global `unoptimized` or `formats`. The Windows RCE does not apply on Linux; nanoid is not imported by app code (`crypto.randomUUID` is used). What stands: every gate tests a different dependency tree from the one Vercel ships, and a known-CRITICAL version is pinned in the lock — hygiene debt that becomes live the day anyone self-hosts or adds a custom loader. The Vercel-optimiser question is now verified from headers (Vercel does not publish its optimiser internals).*
- **THE FIX:**
  1. Bump `next` to at least 16.3.3 (today 16.3.6) in `apps/web/package.json`.
  2. Change the sharp override to `^0.35.4` and run `npm install`, which also fixes DOC-01's lockfile.
  3. Commit the lockfile.
  4. Add `npm audit --omit=dev --audit-level=high` as a CI step.
  5. Local sessions must use `npm ci` from then on, never `--no-package-lock`.
- **EFFORT:** 1 hour including a build and deploy check.
- **PASS TWO:** SEVERITY CHANGED HIGH→MEDIUM (the drift is real; the CRITICAL RCE does not reach this deployment). Reviewer confirmed the served version (`version:"16.2.12"` in live chunks of `dpl_7tf6nMQVEPdFt8ffUhQ8yUpQyGXj`), the lock (`next 16.2.12, sharp 0.35.3, nanoid 3.3.16`) vs installed `next 16.3.6`, and the npm audit JSON (`{'high': 2, 'critical': 1, 'total': 3}`; next critical `>=16.0.0 <16.3.3`); fetched the advisory text (GHSA-2xp9-vwfh-vxw4, patched in 16.3.3). The fix is unchanged: do it with the DOC-01 lockfile repair, not as an emergency.

#### DOC-03 | TESTS | HIGH | No automated test reaches the database. Escrow, the ledger, refunds and every RLS policy have zero regression coverage, and the "check" that answered the 11-hour outage is run by hand
- **WHAT IS WRONG:** Vitest runs in `environment: "node"` with no database. No `supabase/tests`, no pgTAP and no SQL runner exists. Money correctness lives in plpgsql. That includes the escrow state machine (`escrow_guard_transition`, `escrow_transition_is_legal`, `escrow_settle`), `transfer_between_wallets`, `refund_and_cancel_booking`, `pay_booking_from_wallet`, `wallet_balance` and `wallets_overdrawn`. Authorization lives in RLS and SECURITY DEFINER bodies. All of it is tested only by one-off SQL probes that a human pastes into `mcp__Supabase__apply_migration`.
- **WHERE:**
  - `apps/web/vitest.config.ts` (`environment: "node"`, include `src/**/*.test.ts`).
  - `scripts/probes/*.sql` and `*.sh`: 50+ files including `policy_callers_hold_execute.sql`, `escrow_concurrency.sh` and `escrow_invariants.sql`. Their `.log` files are committed.
  - `docs/BUILD_07_LEDGER.md` about line 9224: "`scripts/probes/policy_callers_hold_execute.sql` now **enforces** the half of this that a migration can break".
  - `docs/SESSIONS_CLOSE_OUT.md` section A5.3: "It shipped anyway because it was in prose where it needed to be in a check. **There is a check now.**"
  - `docs/SESSION_B_SCOPE.md:492`: "EX-2. Put the policy-caller EXECUTE probe (1c61ea00) in CI so a revoke ... fails the build". That request is still open.
- **EVIDENCE:**
  - `ls supabase/tests` returned `No such file or directory`. `grep -rln "pgtap" supabase` found nothing.
  - 358 distinct `create function` names exist in `supabase/migrations`. 74 match escrow, wallet, ledger, withdraw, fund, transfer, refund, charge, settle or pot.
  - `grep -rln "request_money_reconciliation\|wrong_body\|owns_listing\|policy_callers" apps/web/src --include=*.test.ts` returned nothing.
  - `grep -rn policy_callers_hold_execute --include=*.{mjs,ts,yml,json,sh}` returned nothing, so nothing invokes the probe.
  - The probe's own header reads "HOW TO RUN. Through `mcp__Supabase__apply_migration` on project `uccixoonmbhrnyczyigt`".
  - The TS tests that touch money mock the database half. `lib/wallet/transfer-idempotency.test.ts` has 14 `vi.mock` calls, including `../security/service-rpc` (the idempotency store), `./ledger`, `./rpc`, and `../security/money-limits` → `guardMoney: async () => ({ allowed: true })`.
  - **(from DOC-04, merged) Would the current suite catch a regression of the named incidents? In five of nine cases, no.** Incidents are from `docs/SESSIONS_CLOSE_OUT.md` A0 and A5, `docs/BUILD_06_LEDGER.md` 7.0, the migration `20260923104415_the_money_job_judged_a_web_page_a_successful_reconciliation.sql`, and `docs/SESSION_B_SCOPE.md` EX-1 to EX-3.


    | # | Incident | Would a current test catch it? | Evidence |
    |---|---|---|---|
    | 1 | **About 11 hours: the public catalogue refused to anon and authenticated**, after a revoke of EXECUTE on `private.owns_listing` (called by 17 policies on 10 tables) | **NO** | No DB test exists. The probe is manual (DOC-03). |
    | 2 | **`listings.listing_role` made NOT NULL with no default**, so every agent listing creation failed on 23502 for about a day, hidden by the backfill | **NO** | Tests that mention `listing_role` (`lister-role-read`, `lister-role-filter`, `lister-role-line`) test TS mapping only. No insert-shaped test exists. |
    | 3 | **`listing_role` added without an anon column grant** (22e544f5), giving 42501 on public reads | **NO** | `lib/security/anon-columns.test.ts` checks only that selected columns are not in the August migration's `denied` array. A NEW column with no grant passes it. |
    | 4 | **Money reconciliation judged `ok_200` on an HTML page** | **NO** | The fix is plpgsql in `private.request_money_reconciliation`. `app/api/paystack/reconcile/outcome.test.ts` tests alert shaping only. |
    | 5 | **19 Sept: `export type {}` in a "use server" module** took production down for about 20 minutes | **YES, if lint runs** | Probed: piping that file through `npx eslint --stdin` gives `error ... nf/server-actions-export-only-actions`. Lint runs only in CI, which is dead (DOC-01). `next build` on Vercel also sees it. |
    | 6 | **Webhook answered 200 when `SUPABASE_SERVICE_ROLE_KEY` was missing**, and a funding was lost | **YES** | `app/api/paystack/webhook/route.test.ts:121` "answers 503, NOT 200". |
    | 7 | **`/api/push/key` missing from `PUBLIC_API_PATHS`**: a push "blind light" | **YES** | `proxy.test.ts:371`. |
    | 8 | **"Main is green" three times, from a suite run in the shared worktree** | **NO** | Only a clean-checkout CI run prevents this, and CI is dead. The docs' remedy is a manual `git worktree add` ritual. |
    | 9 | **Lint red on main and unnoticed** (2 errors hidden by a falling warning count) | **NO today** | Lint is not gating: CI is dead, and warnings never fail (DOC-18). |
- **WHY IT MATTERS:** Every database-shaped incident in this platform's history (DOC-04) can recur with 3,860 green tests: the catalogue refused to everyone, listing creation blocked, a column without an anon grant, reconciliation fooled by a 200. Escrow has never processed a real agreement (zero escrows ever), so no production path has exercised it either.
  - (from DOC-04) The suite is strong on TypeScript pure functions and route status codes. It is blind on the layer where this platform's actual outages happened.
- **THE FIX:** (pass-one fix, with DOC-04's incident tests merged in pass two)
  - *Pass-one fix, retained:* 
    1. Add a `db` CI job. Start a local stack with `supabase start` in Actions using the Supabase CLI, apply `supabase/migrations`, then run SQL tests with pgTAP (`supabase test db`) from a new `supabase/tests/`.
    2. Port `policy_callers_hold_execute.sql` first. Its `raise exception` becomes a pgTAP `is(count, 0)`.
    3. Add the four incident tests from DOC-04.
    4. Add escrow transition-legality and ledger-balance invariants, with `escrow_invariants.sql` as the seed.
    5. Add an RLS matrix (anon, authenticated owner, authenticated stranger) for `listings`, `wallets`, `escrows` and `bookings`, each with a control that must succeed.
  - *Merged from DOC-04 and the pass-two reviews:*
    - (from DOC-04) Incident tests:
        - Incidents 1 to 4: pgTAP tests in the DOC-03 job.
          - (1) Every policy-called function is executable by every role that can reach the table.
          - (2) For every NOT NULL column on `listings`, `bookings`, `reservations` and `escrows` without a default, an insert shaped like the app's payload succeeds in a rolled-back transaction.
          - (3) `set local role anon; select <LISTING_SELECTS columns> from listings limit 1` succeeds, generated from `LISTING_SELECTS`.
          - (4) Call `request_money_reconciliation` with a stubbed previous response of `200` plus an HTML body and assert the `wrong_body_200` verdict.
        - Incidents 8 and 9: restore CI (DOC-01) and add `--max-warnings` (DOC-18).
    - (from DOC-04) Effort: 1 day on top of the harness.
    - (A09 and A10 in pass two) Merge with OPS-08's CI-DB-job idea: DOC-03 carries the test-harness half; OPS-08 keeps staging and expand/contract.
- **EFFORT:** 2 to 3 days for the harness plus the first 20 tests. Ongoing after that.
- **PASS TWO:** CONFIRMED (HIGH). Reviewer: `ls supabase/tests` → "No such file or directory"; `grep -rln pgtap supabase` → nothing; nothing invokes `policy_callers_hold_execute`. The HIGH is fair: money and authorisation live in plpgsql and RLS, and both outages on record were database-shaped. Absorbs DOC-04 (MERGED INTO this ID at the reviewer's recommendation: "it is DOC-03's evidence table rather than a separate defect"); its incident table and tests are carried above.

#### DOC-04 | TESTS | HIGH | Would the current suite catch a regression of the named incidents? In five of nine cases, no

**Would the current suite catch a regression of the named incidents? In five of nine cases, no.** Confirmed in pass two (A09 spot-checked incident 3: `lib/security/anon-columns.test.ts` only parses the `denied` block of the single August migration, so a new column with no anon grant passes; incident 5 holds per A10's `eslint --stdin` proof, which also makes the `ci.yml` header claim false — DOC-P2-01). The reviewer judged it to be DOC-03's evidence table rather than a separate defect and recommended merging. The full nine-incident table and the four incident pgTAP tests (policy-called functions executable by every role that can reach the table; app-shaped inserts for every NOT NULL column without a default; anon `LISTING_SELECTS` read; `request_money_reconciliation` judging a 200 HTML body as `wrong_body_200`) are carried in DOC-03.

- **PASS TWO:** MERGED INTO DOC-03 (known duplicate; canonical severity HIGH). A09 in pass two: CONFIRMED (HIGH), recommend merging into DOC-03.

#### DOC-05 | TESTS / MONEY | MEDIUM | The Paystack signature check has no test of its own. Every webhook test mocks it to `true`
- **WHAT IS WRONG:** `verifyWebhookSignature` is the only thing between the public internet and "credit this wallet". No test ever runs its real body. The webhook route tests mock it (`verifyWebhookSignature: vi.fn(() => true)`) and flip it to `false` for the 401 case. A regression that returns `true` (for example a lost `timingSafeEqual`, or `key.length === 0` returning true) would pass all 3,860 tests.
- **WHERE:** `apps/web/src/lib/payments/paystack.ts:461-474`. `apps/web/src/app/api/paystack/webhook/route.test.ts:19,57,110,158`.
- **EVIDENCE:** `grep -rn "verifyWebhookSignature\|createHmac" --include=*.test.ts` outside `route.test.ts` finds only `lib/push/transport/webpush.test.ts`, which is unrelated. The Yellow Card webhook (`app/api/yellowcard/webhook/route.ts`) is referenced only in `proxy.test.ts` (public-path listing) and has no handler test.
- **WHY IT MATTERS:** A forged `charge.success` would credit a wallet. This is the highest-value line in the codebase and it has no pin.
  - *Pass two (A09): the implementation is correct today (`paystack.ts:461-472`: HMAC-SHA512, a length check, `timingSafeEqual`, `false` on an empty key or empty signature; a bad signature also raises an alert). A missing unit test is regression exposure, not a present defect.*
- **THE FIX:** Add `lib/payments/paystack-signature.test.ts` with these cases:
  - With `vi.stubEnv("PAYSTACK_SECRET_KEY","sk_test_x")`, an HMAC-SHA512 of a body is accepted.
  - The same body with one byte changed is refused.
  - An empty signature is refused.
  - An empty key is refused.
  - A non-hex signature is refused.
  - A signature of the wrong length is refused.

  Do the same for Yellow Card's verifier, and add a Yellow Card webhook route test covering 401, 503 and 500, mirroring the Paystack one.
- **EFFORT:** 2 hours.
- **PASS TWO:** SEVERITY CHANGED HIGH→MEDIUM. The evidence is right: `route.test.ts:19` has `verifyWebhookSignature: vi.fn(() => true)` and `:110`/`:158` flip it; no test runs the real body; the other `createHmac` hits (`app/api/auth/email-hook/route.test.ts`, `lib/push/transport/webpush.test.ts`) are unrelated; `app/api/yellowcard/webhook/` has no test file. The fix as written is correct (1–2 hours).

#### DOC-06 | TESTS / MONEY | MEDIUM | Money actions with no test, and money tests that test their mocks
- **WHAT IS WRONG:** Some money-moving server actions have no test at all. Where tests exist, they stub the database half (the idempotency store, the ledger RPCs and the rate limit), so they prove the TypeScript orchestration only.
- **WHERE:**
  - Untested files (exported functions in brackets): `lib/bookings/actions.ts` (3), `lib/rent/actions.ts` (2), `lib/wallet/pot-actions.ts` (3), `lib/payments/bank-accounts-actions.ts` (6).
  - `lib/wallet/actions.ts` (8) has tests only for `transferToUser` and `fundWallet`.
  - Most mock-heavy money tests: `transfer-idempotency.test.ts` (14 mocks), `fund-idempotency.test.ts` (14), `withdraw-door.test.ts` (12), `rent/return-path.test.ts` (12) and `checkout-idempotency.test.ts` (11).
  - **Amended in pass two (A09):** for bookings the claim "no test file references `bookings/actions`" is wrong — `lib/bookings/example-listing.test.ts:52` has `const { reserve } = await import("./actions");` with three tests on `reserve` (refuses before it writes; translates the trigger's refusal; blames the arithmetic when the constraint is ours). Read the bookings entry as "`lib/bookings/actions.ts` (`cancel`, `confirm`; `reserve` covered only for the example-listing refusal)". `rent/actions`, `pot-actions` and `bank-accounts-actions` really have no dedicated test.
- **EVIDENCE:**
  - No test file references `bookings/actions`, `rent/actions`, `pot-actions` or `bank-accounts-actions`. I checked both static imports and `await import("./actions")`.
  - `transfer-idempotency.test.ts:55` has `vi.mock("../security/money-limits", () => ({ guardMoney: async () => ({ allowed: true }) }))`. Its "moves the money once" (line 158) depends on the mocked `service-rpc` store behaving like the real `withIdempotency` table.
  - The "treats a replayed delivery as a duplicate" test in the webhook suite takes `"duplicate"` from a mocked `recordFunding`. The real duplicate guard is a DB unique constraint that no test reaches.
  - Across the suite, 53 files and about 481 declared tests use `vi.mock`.
- **WHY IT MATTERS:** If the real idempotency table, rate limit or ledger function changes behaviour, these tests stay green. Double-spend and replay protection is proved only in TypeScript.
- **THE FIX:**
  - Keep the TS tests; they are good at what they do.
  - Add DB-level tests (DOC-03): replay of the same Paystack reference gives exactly one ledger row, and a concurrent `transfer_between_wallets` never overdraws (port `scripts/probes/escrow_concurrency.sh`).
  - Add unit tests for the four untested action files, covering the auth refusal path (no session means no RPC call) and the schema refusal path.
- **EFFORT:** 1 day.
- **PASS TWO:** CONFIRMED (MEDIUM) — evidence amended (see the correction under WHERE). `cancel` (`actions.ts:406`) and `confirm` (`:538`) are untested; the reviewer's grep hits for the other three files were only incidental imports in unrelated tests.

#### DOC-07 | TESTS | MEDIUM | 372 tests in 35 files check the source text, not the behaviour. A comment satisfies some of them
- **WHAT IS WRONG:** 35 test files `readFileSync` source code (`.ts`, `.tsx`, `.sql`, `.css`, `.mjs`) and assert that strings are present or absent. Some strip comments first (`lib/copy/source-scan.ts`). Others do not. `lib/security/money-limits-call-sites.test.ts` passes when the literal `guardMoney("<action>"` appears anywhere in any non-test file. That could be a comment, dead code, or a call made after the money has already moved.
- **WHERE:**
  - `apps/web/src/lib/security/money-limits-call-sites.test.ts:33-38` (`file.text.includes(\`guardMoney("${action}"\`)`).
  - The same check also counts `shouldRecord: (result) => result.ok` by string split.
  - Other source-reading files: `lib/trust/agent-badge-derivation.test.ts` (37 tests), `lib/email/shell.test.ts`, `lib/auth/email-immutable.test.ts`, `lib/listings/lister-role-read.test.ts`, `lib/price-check/share-card.test.ts`, `app/admin/_components/session-b-admin-back.test.ts` and others.
- **EVIDENCE:**
  - Declared `it(`/`test(` counts: 372 of 2,499 in source-reading files. The runtime count is 3,860 because of loops and `each`.
  - For balance: there are **0** files without `expect(`, **0** snapshot tests, **0** `expect(true)`. The 10 `toBeTruthy()` uses all have real subjects.
  - 2 `context.skip()` calls, both documented live-proof gates.
- **WHY IT MATTERS:** Source-text tests are useful tripwires. They cannot prove that a guard runs, or that it runs before the money moves, and they give false confidence precisely on money limits.
- **THE FIX:**
  - Convert `money-limits-call-sites` into a behaviour test. For each money action, call it with `guardMoney` mocked to `{allowed:false}` and assert that the ledger or RPC mock was **never** called.
  - For the remaining source-text tests, run `withoutComments()` from `lib/copy/source-scan.ts` before matching.
- **EFFORT:** 4 hours.
- **PASS TWO:** CONFIRMED (MEDIUM), with the count slightly off. Reviewer: `money-limits-call-sites.test.ts:60-64` is exactly as described (so `// guardMoney("fundWallet"` would satisfy it) and `:73-88` counts `shouldRecord` by `split`; `lib/auth/email-immutable.test.ts:61,92-99` and `lib/listings/lister-role-read.test.ts:162-199` are text-over-behaviour as claimed. Its count: 33 files with `readFileSync` (36 with `readdirSync`) and 361 declared tests vs pass one's 35 and 372 (regex scope). 18 test files already use `withoutComments`, so part of the fix is already practice.

#### DOC-08 | TESTS / DOCS | MEDIUM | The terminology ban is an empty list, and its test loops over nothing
- **WHAT IS WRONG:** `docs/PRODUCT.md` section 7's "Banned synonyms" column (Trip, Host, landlord, vendor, user, feed and others) is described as enforced. The enforcing table is `BANNED_SYNONYMS = []`, so the test's `for (const ... of BANNED_SYNONYMS)` asserts nothing. `PRODUCT.md:305` still bans "Trip", while `/trips` is a shipped route by founder ruling.
- **WHERE:** `apps/web/src/lib/copy/banned-phrases.ts:195`. `banned-phrases.test.ts:302`. `docs/PRODUCT.md:305`. `docs/FRONTEND_REVAMP.md:1475-1476` ("enforced by five specs").
- **EVIDENCE:** The line reads verbatim `export const BANNED_SYNONYMS: { label: string; pattern: RegExp; instead: string }[] = [];`. The comment above it records that "TRIP LEFT THE TABLE ON 18 SEPTEMBER 2026". The build output lists `ƒ /trips`.
- **WHY IT MATTERS:** A green check over an empty list is the "blind light" pattern this repository names itself.
- **THE FIX:**
  - Either populate `BANNED_SYNONYMS` with the synonyms still banned (fix the copy in the same change), or add `expect(BANNED_SYNONYMS.length).toBeGreaterThan(0)` so that emptiness is red.
  - Correct `PRODUCT.md:305` to drop "Trip" from the Stay row.
- **EFFORT:** 1 hour for the guard. The copy work depends on how many synonyms remain live.
- **PASS TWO:** CONFIRMED (MEDIUM). Reviewer: `banned-phrases.ts:195` `export const BANNED_SYNONYMS: … = [];`; `banned-phrases.test.ts:302` loops over it; `PRODUCT.md` (Stay row) still bans "Trip, reservation, unless it is a restaurant table".

#### DOC-09 | TESTS | MEDIUM | 88 browser "specs" that nothing runs, described as the platform's main proof
- **WHAT IS WRONG:** `apps/web/tests/*.spec.mjs` are 88 standalone node scripts with a hand-rolled `check()` helper. There is no runner, no npm script and no CI job for them. `_catalogue.mjs` says 15 of them fail on the deliberate absence of the seed catalogue. Meanwhile `vitest.config.ts` opens with: "Nearly everything on this platform is proved by a Playwright spec against a running server, and that stays the rule."
- **WHERE:** `apps/web/tests/` (88 `.mjs` files). `apps/web/vitest.config.ts:6-9`. `apps/web/package.json` scripts (none run them). `.github/workflows/ci.yml` (none run them).
- **EVIDENCE:** `find tests -type f | wc -l` gives 88, all `.mjs`. `grep -rl "@playwright/test" tests` gives 0. `admin.spec.mjs` header: "Self-contained Playwright script: no runner, no config... Run with the dev server already up".
- **WHY IT MATTERS:** Screens have no automated end-to-end check. The prose says the opposite, so readers overestimate coverage.
- **THE FIX:**
  1. Pick the 10 or so specs that pass today: sign-up, sign-in, listing, search, wallet read-only.
  2. Run them in a CI job against the Vercel preview URL (`BASE_URL=${{ deployment url }}`), with `playwright-core` and the pinned Chromium.
  3. Delete the ones that assert on the removed seed catalogue.
  4. Rewrite the `vitest.config.ts` header (DOC-17).
- **EFFORT:** 1 day.
- **PASS TWO:** CONFIRMED (MEDIUM). Reviewer: `ls apps/web/tests | wc -l` → 88, all `.mjs`; neither `package.json` nor `ci.yml` runs them.

#### DOC-10 | DOCS / GATES | MEDIUM | Six places say a check "fails the build". None of them is in the build
- **WHAT IS WRONG:** The Vercel build is the root `build` script: the `prebuild` scene manifest followed by `next build`. Next 16 does not lint during a build, and nothing runs vitest there. Lint and tests run only in CI, which is dead (DOC-01). Every "fails the build" claim below is therefore false.
- **WHERE:**
  - `docs/PRODUCT.md:373`: "A lint rule now fails the build on a raw colour".
  - `docs/DESIGN_DIRECTION.md:69`: "`check-css-tokens.mjs` rule 10 fails the build on a pill radius".
  - `packages/design-tokens/README.md:53`: "that script already fails the build".
  - `docs/ADMIN_CONSOLE.md:657`: "a new job fails the build until it is written down here" (this is a vitest test).
  - `docs/BUILD_07_LEDGER.md:7282`: "`agent-badge-derivation.test.ts` now fails the build".
  - Commit `cb8a3679`: "Price Check: the build fails if the regulated word reaches product code" (that is `check-valuation-words.mjs`, which runs in `lint`).
- **EVIDENCE:** `apps/web/package.json`: `"prebuild": "node ../../scripts/build-scene-manifest.mjs"` and `"build": "next build"`. My `build.log` shows the scene manifest, then `next build`, with no eslint, css-tokens or valuation-words output.
- **WHY IT MATTERS:** Readers believe a guard stops deploys when it does not.
- **THE FIX:**
  - Either change the wording in all six places to "fails `npm run lint`" or "fails `npm test` in CI", or make it true: set `"prebuild": "node ../../scripts/build-scene-manifest.mjs && node scripts/check-css-tokens.mjs && node scripts/check-valuation-words.mjs"` in `apps/web/package.json`. These scripts are fast and need no environment.
  - Do not put vitest in the Vercel build. Restore CI instead.
- **EFFORT:** 30 minutes.
- **PASS TWO:** CONFIRMED (MEDIUM). Reviewer read the five doc lines (`PRODUCT.md:373`, `DESIGN_DIRECTION.md:69`, `design-tokens/README.md:53`, `ADMIN_CONSOLE.md:657`, `BUILD_07_LEDGER.md:7282`); `build` is `next build` with a `prebuild` of `build-scene-manifest.mjs` only. The fix (append the two checks to `prebuild`) is sound; both scripts are pure node with no env.

#### DOC-11 | DOCS | LOW | Four docs cite a "standing pre-commit scan". No pre-commit hook of any kind exists
- **WHAT IS WRONG:** As the title states (no separate statement in the source).
- **WHERE:**
  - `docs/ICON_SYSTEM.md:281`: "the standing pre-commit scan greps for it and must return empty".
  - `docs/HANDOFF.md:194`.
  - `docs/HANDOFF_02_PLATFORM.md:701`.
  - `docs/BRANCH_AUDIT.md:107`.
- **EVIDENCE:** `ls .husky .githooks` gives no such files. `.git/hooks` holds only samples. `git config core.hooksPath` is empty. No husky, lefthook or simple-git-hooks appears in either `package.json`. `RECOMMENDATIONS.md:834` agrees: "A2-142 There is no pre-commit hook of any kind | OPEN".
- **WHY IT MATTERS:** Not stated separately in pass one.
- **THE FIX:** Add `Icon3D` to the eslint `no-restricted-imports` rule, which then gates wherever lint gates. Change the four docs to point at that rule.
- **EFFORT:** 30 minutes.
- **PASS TWO:** SEVERITY CHANGED MEDIUM→LOW. Confirmed: no `.husky` or `.githooks`, `core.hooksPath` empty, `.git/hooks` samples only; `ICON_SYSTEM.md:281` makes the claim. But `grep -rn "import.*Icon3D" apps/web/src` returns nothing today, so the unenforced rule is not being broken: a false sentence with no live violation is LOW. The fix (eslint `no-restricted-imports`) is right.

#### DOC-12 | DOCS | MEDIUM | `docs/PRODUCT.md`, the doc marked "Read this first", is wrong on theme, vocabulary and enforcement
- **WHAT IS WRONG:**
  - `:365-367` says "Light mode is a designed paper twin ... Both are real themes and both must be verified". Light mode was removed on 23 Sept (`docs/design/LIGHT_MODE_REMOVED.md`; `tokens.css:22` "DO NOT ADD A `[data-theme="light"]` BLOCK BACK").
  - `:305` bans "Trip" (see DOC-08).
  - `:316` says banned copy is "enforced by five specs". Those specs are the unrun `.mjs` scripts. The real enforcement is the vitest `UNREAL_WORDS` scan, which does exist.
  - `:373` says "fails the build" (DOC-10).
- **WHERE:** Not stated separately in pass one.
- **EVIDENCE:** Not stated separately in pass one.
- **WHY IT MATTERS:** Not stated separately in pass one.
- **THE FIX:** Rewrite section 8 ("Language and theme") to say dark only. Fix the three lines above.
- **EFFORT:** 30 minutes.
- **PASS TWO:** CONFIRMED (MEDIUM). Reviewer: `PRODUCT.md:363-366` ("Light mode is a designed paper twin … both must be verified"), `docs/design/LIGHT_MODE_REMOVED.md` exists, `tokens.css` says "DO NOT ADD A `[data-theme="light"]` BLOCK BACK", `:314` says "enforced by five specs". MEDIUM kept because this is the doc agents are told to read first and it instructs them to verify a theme that must not exist.

#### DOC-13 | GATES / STORE | MEDIUM | The deep-link gate is red and in no gate
- **WHAT IS WRONG:** `check-deep-links.mjs` exits 1 because `assetlinks.json` holds placeholder SHA-256 fingerprints. Android App Links will not verify. It is not in CI or lint. `PLATFORM_STATUS.md:870` already says so ("One line in `ci.yml`") and it is still not done.
- **WHERE:** Not stated separately in pass one.
- **EVIDENCE:** `node scripts/check-deep-links.mjs; echo $?` gives `EXIT 1`, with `"PLACEHOLDER_REPLACE_WITH_PLAY_APP_SIGNING_SHA" is not a SHA-256 fingerprint`. `npm run sync:versions -- --check` gives "in sync".
- **WHY IT MATTERS:** Not stated separately in pass one.
- **THE FIX:** The founder supplies the Play app-signing SHA-256 and the upload key SHA-256 (see FOR THE FOUNDER). Then add `npm run check:deep-links --workspace @vallo/web` as a CI step.
- **EFFORT:** Minutes once the fingerprints exist.
- **PASS TWO:** CONFIRMED (MEDIUM). Reviewer: `node apps/web/scripts/check-deep-links.mjs` → `exit=1`. Likely a duplicate of A08's STORE-03 (same assetlinks/AASA placeholders); not in the known-duplicate list, so kept here as the gate half, with STORE-03 as the store half.

#### DOC-14 | DOCS | LOW | Every doc that describes the test and CI setup describes a world before 19 September
- **WHAT IS WRONG:** (WHAT IS TRUE TODAY)
  - 242 vitest files and 3,860 tests, run in CI when CI runs.
  - 88 unrun `.mjs` scripts.
  - CI exists and was green through run 394.
  - Red since 10:16Z, dead since 15:48Z.
- **WHERE:** (AND WHAT EACH SAYS)
  - `docs/HANDOFF.md:560-586` (the "working contract"): "83 standalone node specs", "**8 vitest files**", `npx vitest run # 8 files`.
  - `ROADMAP.md:80,201`: "vitest files ... No CI runs any of them", "8 files".
  - `KNOWN_GAPS.md:270-273,379`: "83 node specs and 8 vitest files ... No CI runs any", and a row "No test suite".
  - `docs/DEPLOY.md:468`: "`npm test` finds no Vitest files". `:595`: "**No CI.** There is no `.github/workflows` directory".
  - `RECOMMENDATIONS.md:1206`: "T-1 | 83 browser specs, 8 vitest files, and no CI runs any of them | OPEN".
  - `docs/PLATFORM_STATUS.md:526`: "CI has ever gone green | No session has confirmed a run on GitHub". CI went green 59 times, the first on 18 Sept 23:58Z.
  - `:165`: "206 files, 3,455 tests". Today it is 242 files and 3,860 tests.
- **EVIDENCE:** Not stated separately in pass one.
- **WHY IT MATTERS:** Not stated separately in pass one.
- **THE FIX:** Replace every one of these passages with one sentence pointing at a single generated source (for example `npm test -- --reporter=json` counts written by CI to a status badge). Hand-typed test counts go stale within hours on this repository.
- **EFFORT:** 1 hour.
- **PASS TWO:** SEVERITY CHANGED MEDIUM→LOW (the lines are confirmed: `HANDOFF.md:560-583` "83 standalone node specs", "8 vitest files"; `DEPLOY.md:595` "No CI"; `PLATFORM_STATUS.md:526`; `ROADMAP.md:80`; `RECOMMENDATIONS.md:1206` T-1). `KNOWN_GAPS.md:270-273` is explicitly dated ("counted 2026-08-09 … re-count rather than quoting this") and `PLATFORM_STATUS.md:165` names its commit (`f70c0bbe`): honest historical records whose only false clause now is "No CI runs any". Stale counts are LOW; the operational truth that matters (CI is dead) is DOC-01.

#### DOC-15 | DOCS | MEDIUM | `SESSIONS_CLOSE_OUT` and `BUILD_06_LEDGER` claim gates that did not run
- **WHAT IS WRONG:**
  - `BUILD_06_LEDGER.md` 7.0: "`next build` is the only gate that sees it ... **It is now run before every push**". The brief records that neither build session ever ran `next build`. The only automated build is CI's, and it is dead.
  - `SESSIONS_CLOSE_OUT.md` A5.3: "There is a check now". The check is a manual probe (DOC-03).
  - **Amended in pass two (A09):** the premise that the build sessions never ran `next build` is out of date. Commit `6e0ee6d` (2026-09-23 18:02Z, "PART D: the gates re-run, and next build is no longer a gap") records in `SESSIONS_CLOSE_OUT.md` "At origin/main 56bb587a in a freshly cut isolated worktree: next build exit 0 … 380 routes". So `next build` was run once, on a date and commit, not before every push, and on the non-lockfile tree (DOC-02). `BUILD_06_LEDGER.md:528` "It is now run before every push" is still false as a standing claim.
- **WHERE:** Not stated separately in pass one.
- **EVIDENCE:** Not stated separately in pass one.
- **WHY IT MATTERS:** Not stated separately in pass one.
- **THE FIX:** (amended in pass two)
  - *Pass-one fix, retained:* Append a correction to each: "run by hand; not automated; see EX-2". Point both at the DOC-03 CI job once it exists.
  - *Pass-two amendments:*
    - Amend the correction text to: "run by hand at 56bb587a on 23 Sept against an unlocked dependency tree; not run per push; no automated build since CI died." (`BUILT_VS_PROVEN.md:996` "`next build` is unknown" is also superseded by `6e0ee6d`.)
- **EFFORT:** 15 minutes.
- **PASS TWO:** CONFIRMED (MEDIUM kept) — evidence and fix amended (see WHAT IS WRONG).

#### DOC-16 | DOCS | LOW | `docs/ENVIRONMENT.md` omits live production credentials
- **WHAT IS WRONG:** ENVIRONMENT.md is described as compiled by grepping `process.env` across the tree. It never mentions `VAPID_PRIVATE_KEY` / `NEXT_PUBLIC_VAPID_PUBLIC_KEY` (grep "VAPID" gives 0), `SUPABASE_AUTH_HOOK_SECRET`, `YELLOWCARD_API_KEY`, `YELLOWCARD_API_SECRET`, `YELLOWCARD_API_BASE`, `VALLO_INSPECTION_REPORTS`, `NEXT_PUBLIC_APP_STORE_URL`, `NEXT_PUBLIC_PLAY_STORE_URL`, `NEXT_PUBLIC_VALLO_X_URL` or `NEXT_PUBLIC_VALLO_TELEGRAM_URL`. All of these are read by `apps/web/src`.
- **WHERE:** Not stated separately in pass one.
- **EVIDENCE:**
  - `app/api/push/key/route.ts:58` reads `VAPID_PRIVATE_KEY`.
  - `app/api/auth/email-hook/route.ts:121` reads `SUPABASE_AUTH_HOOK_SECRET`.
  - `lib/payments/yellowcard.ts:75` reads `YELLOWCARD_API_KEY`.
  - `apps/web/.env.example:216-280` does document VAPID and the auth hook, so the two files disagree.
- **WHY IT MATTERS:** Not stated separately in pass one.
- **THE FIX:** Add these rows, or generate the table from `.env.example`.
- **EFFORT:** 30 minutes.
- **PASS TWO:** CONFIRMED (LOW). Reviewer: `grep -c VAPID docs/ENVIRONMENT.md` → 0; `grep -c "SUPABASE_AUTH_HOOK_SECRET\|YELLOWCARD_API_KEY"` → 0; the code reads them at `app/api/push/key/route.ts:58`, `lib/push/transport/webpush.ts:363` and `app/api/auth/email-hook/route.ts:121`.

#### DOC-17 | DOCS / TESTS | LOW | The `vitest.config.ts` header describes a suite that no longer exists
- **WHAT IS WRONG:** The header calls the suite "for the handful of things a browser cannot reach". It says "Every module under `lib/inventory` opens with `import "server-only"`" and that "partner providers map Google and Amadeus responses". `lib/inventory` does not exist. The suite is 242 files covering most of `lib/`. The claim "a Playwright spec ... stays the rule" is false (DOC-09).
- **WHERE:** Not stated separately in pass one.
- **EVIDENCE:** `ls apps/web/src/lib/inventory` gives No such file. `grep -rli amadeus apps/web/src --include=*.ts` finds nothing.
- **WHY IT MATTERS:** Not stated separately in pass one.
- **THE FIX:** Rewrite the header in 5 lines: what it runs, the react-server aliasing reason (still true and important), and that there is no database.
- **EFFORT:** 15 minutes.
- **PASS TWO:** CONFIRMED (LOW). `lib/inventory` is absent (also removed per `docs/ENVIRONMENT.md:85`, ADR-013).

#### DOC-18 | GATES | LOW | The lint gate cannot fail on its 335 warnings, including React correctness rules
- **WHAT IS WRONG:** `eslint .` exits 0 with 335 warnings. Most are design migration: 186 `nf/no-arbitrary-font-size` and 104 `nf/no-raw-spacing`. The rest are correctness warnings: 3 `react-hooks/exhaustive-deps` (for example `lib/ui/use-overlay.ts:128`), 1 `react-hooks/set-state-in-effect` (`lib/messages/useRealtime.ts:179`), 2 `@next/next/no-location-assign-relative-destination` and 3 `import/no-anonymous-default-export`. `SESSIONS_CLOSE_OUT` A5.9 records that a warning count moving "the way an improvement moves" hid a red lint once already.
- **WHERE:** Not stated separately in pass one.
- **EVIDENCE:** Not stated separately in pass one.
- **WHY IT MATTERS:** Not stated separately in pass one.
- **THE FIX:** (amended in pass two)
  1. Add `--max-warnings=335` to `lint` now, so the count can only fall; lower the number as the design migration lands.
  2. Promote only `@next/next/*` and `react-hooks/exhaustive-deps` (5 sites) to `error`, after fixing them.
  3. Schedule the 24 `set-state-in-effect` and 10 `refs` warnings (React-compiler correctness) as a ticket before promoting those rules.
- **EFFORT:** 1 hour.
- **PASS TWO:** CONFIRMED (LOW stands) — fix amended (41 react-hooks/@next warnings, not 6). Reviewer's `eslint . -f json` tally (0 errors, 335 warnings): 186 `nf/no-arbitrary-font-size`, 104 `nf/no-raw-spacing`, 24 `react-hooks/set-state-in-effect`, 10 `react-hooks/refs`, 3 `import/no-anonymous-default-export`, 3 `react-hooks/exhaustive-deps`, 2 `@next/next/no-location-assign-relative-destination`, 2 `react-hooks/immutability`, 1 `jsx-a11y/role-supports-aria-props`. Promoting `react-hooks/*` to `error` as proposed would turn lint red with 39 errors on day one.

#### DOC-19 | GATES | LOW | `next build` rewrites the tracked `apps/web/tsconfig.json`
- **WHAT IS WRONG:** As the title states (no separate statement in the source).
- **WHERE:** Not stated separately in pass one.
- **EVIDENCE:** After `NEXT_DIST_DIR=.next-a10 npm run build`, `git status` showed ` M apps/web/tsconfig.json` with `+ ".next-a10/types/**/*.ts", + ".next-a10/dev/types/**/*.ts"`. The build log says "We detected TypeScript in your project and reconfigured your tsconfig.json". The committed file already carries 10 dead `.next-a2b` to `.next-nav2` literals, left over from earlier commits of the same mutation. I restored the file.
- **WHY IT MATTERS:** Parallel workers commit noise, and a pathspec slip can sweep it into unrelated commits (the "repository ate seven files" incident, `SESSIONS_CLOSE_OUT` A5.2).
- **THE FIX:** Build into `.next` in isolated worktrees rather than into custom dist dirs. Or add `apps/web/tsconfig.json` to a post-build `git checkout` step in the worker script. Delete the 10 dead literals.
- **EFFORT:** 15 minutes.
- **PASS TWO:** CONFIRMED (LOW). Reviewer: `apps/web/tsconfig.json` holds a wildcard `".next-*/types/**/*.ts"` plus 10 dead literals (`.next-a2b`, `-b1b`, `-b2`, `-c1`, `-nav2`, each with `types` and `dev/types`), so pass one's count is exact; no build was run in pass two.

#### DOC-20 | ACCESSIBILITY | MEDIUM | The ID-document upload on `/verification` has no accessible name
- **WHAT IS WRONG:** As the title states (no separate statement in the source).
- **WHERE:** https://www.vallospaces.com/verification, signed in as the QA member account. The element is `<input id="_R_3clubssj5ulb_" type="file" accept="image/jpeg,image/png,image/heic,application/pdf" class="sr-only">` under `<h3>Government issued ID</h3>`.
- **EVIDENCE:** axe-core 4.x (wcag2a, wcag2aa, wcag21a, wcag21aa, best-practice) reported `label (critical, 1)` and `heading-order (moderate, 1)` on `/verification`.
- **WHY IT MATTERS:** A VoiceOver or TalkBack user reaches an unnamed file control on the step that gates trust. Apple's review can test with VoiceOver.
- **THE FIX:** Give the input `aria-label={copy.verification.idUploadLabel}`, or wrap it in the visible `<label>` that the styled button already imitates.
- **EFFORT:** 30 minutes.
- **PASS TWO:** CONFIRMED (MEDIUM). Reviewer's own axe run, live, as the QA member on `/verification`: `{"id":"label","impact":"critical","n":1,…<input id="_R_3clubssj5ulb_" type="file" …class="sr-only">}` plus `heading-order` on `h3 "Government issued ID"` — identical to pass one.

#### DOC-21 | ACCESSIBILITY | LOW | Keyboard and semantics defects on listing, stay and landing pages
- **WHAT IS WRONG:** As the title states (no separate statement in the source).
- **WHERE:** Not stated separately in pass one.
- **EVIDENCE:** (axe on live, 390 px)
  - `/stay/ea000000-...0003`: `scrollable-region-focusable (serious, 2)`. The photo gallery `div.nf-scroll-x ... snap-x` and the `ul.nf-detail-capsules` (Amenities) cannot be scrolled by keyboard.
  - `/stays`: the same rule, 6 nodes (`ul.nf-stay-card__chips`).
  - `/stay/ed000000-...003a`: `definition-list (serious, 1)` and `dlitem (serious, 6)`. `<dt>`/`<dd>` are wrapped in a `div.flex-1` inside `div` rows under `<dl class="divide-y ...">`.
  - `/`: `aria-hidden-focus (serious, 1)`. `div.nf-landing-phones[aria-hidden=true]` contains focusable content.
  - `/wallet`: `page-has-heading-one`.
  - `heading-order` on `/`, `/search` and `/verification`.
  - (added in pass two) `/wallet` also has `landmark-unique` on `nav[aria-label="Primary"]` — a duplicate "Primary" nav landmark.
- **WHY IT MATTERS:** Not stated separately in pass one.
- **THE FIX:**
  - Add `tabIndex={0}` plus `aria-label` to the two horizontal scrollers, or give them prev/next buttons.
  - Make each dl row `<div>` a direct child of `<dl>` containing only `dt`/`dd`. The inner wrapper breaks it.
  - Add `inert` to `.nf-landing-phones`.
  - Add an `sr-only` `<h1>` on `/wallet`.
- **EFFORT:** 2 hours.
- **PASS TWO:** CONFIRMED (LOW), with one flake noted. `/stays`: `scrollable-region-focusable` (serious) on 6 `ul.nf-stay-card__chips`, matching; `/stay/ea…0003`: 2 nodes on the gallery (first run returned `[]` on a flaky proxy load, second matched); `/wallet` has `page-has-heading-one` and additionally `landmark-unique`. `/stay/ed…003a`'s `definition-list` claim and the landing `aria-hidden-focus` were not re-verified (proxy failure; landing not run).

#### DOC-22 | I18N | MEDIUM | Hardcoded English bypasses the dictionary on money and auth screens, and 70 hand-written English plurals cannot be translated
- **WHAT IS WRONG:** This is not the known draft gap, where locales are incomplete by design. It is strings that never enter the i18n layer at all, so no translator can ever reach them.
  - `plural()` exists in `@vallo/i18n` and is tested for four nouns in four locales.
  - Components still hand-roll English plurals and concatenate them into sentences.
- **WHERE:** (examples)
  - Hardcoded JSX text:
    - `app/(app)/checkout/[bookingId]/CheckoutSummary.tsx:56` and `PayPanel.tsx:478`: "Total to pay".
    - `app/(app)/wallet/FundingVerifier.tsx:70`: "Confirming your payment".
    - `app/(app)/wallet/WalletDeck.tsx:621`: "Name on the account".
    - `components/auth/VerifyCodeForm.tsx:115,214`: "Enter your code".
    - `components/auth/Verifying.tsx:134`.
    - `app/(auth)/error.tsx:43`.
    - `app/agent/list/ListingWizard.tsx:2253`.
  - English plurals, and concatenated plurals:
    - `components/app/listing/ListingAmenities.tsx:60,68`: `${bedrooms} ${bedrooms === 1 ? "bedroom" : "bedrooms"}`.
    - `components/app/listing/ListingUtilities.tsx:95`: `${backup}, running ${hours} ${hours === 1 ? "hour" : "hours"} a day`. A sentence built from fragments, so word order is fixed to English.
    - `components/social/feed/PostCard.tsx:252`.
    - `components/social/PlacePicker.tsx:274,304,309`.
    - `components/social/comments/CommentsSheet.tsx:244`.
    - `lib/email/messages.ts` (3).
    - `lib/bookings/actions.ts` (2).
- **EVIDENCE:**
  - A regex for single-line JSX text of 3+ words (outside admin, preview and styleguide) matched **143** lines. 42 are in `app/(site)/docs/chapters.tsx`; the rest are spread over 60+ component files.
  - `grep -E "=== 1 \?"` with an English noun or `"s"` matched **70** lines in non-test source.
  - Heuristic counts: they undercount multi-line JSX and copy held in TS objects.
  - With the Hausa cookie set, the live landing search placeholder is translated (`Ina kake son zuwa?`), while every amenity line on a listing stays English by construction.
- **WHY IT MATTERS:** A Yoruba, Hausa or Igbo user sees English on checkout and in auth even after the native speakers deliver.
- **THE FIX:**
  1. Move these strings into `packages/i18n/src/locales/en.ts` under their surface keys.
  2. Replace every `n === 1 ? "x" : "xs"` with `plural(locale, n, copy.units.x)`, extending the plural table with bedroom, bathroom, toilet, hour, member, comment and reply.
  3. Give whole-sentence templates (`"{backup}, running {hours} a day"`) to the dictionary rather than concatenating.
  4. Add eslint `react/jsx-no-literals` (warn, with an allowlist) to stop new ones.
- **EFFORT:** 1 to 2 days.
- **PASS TWO:** CONFIRMED (MEDIUM). Reviewer: `ListingAmenities.tsx:60` `` `${bedrooms} ${bedrooms === 1 ? "bedroom" : "bedrooms"}` ``; `ListingUtilities.tsx:95` `` `${backup}, running ${hours} ${hours === 1 ? "hour" : "hours"} a day` ``; `CheckoutSummary.tsx:56` `Total to pay` as a JSX literal; its plural regex count is 68 vs pass one's 70.

#### DOC-23 | CI | LOW | `cancel-in-progress` means most commits were never checked, even while CI worked
- **WHAT IS WRONG:** As the title states (no separate statement in the source).
- **WHERE:** Not stated separately in pass one.
- **EVIDENCE:** 398 of 648 runs were `cancelled`. For example, runs 395 to 402 (10:02 to 10:16Z) were all cancelled by the next push. `ci.yml`: `concurrency: group: ci-${{ github.ref }}, cancel-in-progress: true`.
- **WHY IT MATTERS:** With two sessions pushing to `main` every minute or two, a regression in commit N is judged only if commit N is the last of its burst. Bisecting which commit broke main is then manual.
- **THE FIX:** On `main`, set `cancel-in-progress: ${{ github.event_name == 'pull_request' }}`. Better, move writers to short-lived PRs, which also enables DOC-01's protection.
- **EFFORT:** 10 minutes.
- **PASS TWO:** CONFIRMED (LOW). `ci.yml:35` `cancel-in-progress: true`; the API's `status=cancelled` total_count is 398.

#### DOC-24 | DEPENDENCIES | LOW | Outdated majors; nothing abandoned found
- **WHAT IS WRONG:** As the title states (no separate statement in the source).
- **WHERE:** Not stated separately in pass one.
- **EVIDENCE:** `npm outdated` shows only dev tooling behind a major: `@types/node 22.20.4 → 26.6.2`, `eslint 9.39.5 → 10.11.0`, `typescript 5.9.3 → 7.0.2`, `vitest 3.2.7 → 5.0.1`.
  - The runtime dependency list is short, 19 packages.
  - `leaflet` 1.9.x is mature and slow-moving, not abandoned.
  - `server-only` is a one-file guard, by design.
  - `@paystack/inline-js` is pinned exactly to `2.25.0`, deliberately (see `PaystackCheckout.tsx:33`).
  - I found no dependency pulled in for a single trivial function.
- **WHY IT MATTERS:** Not stated separately in pass one.
- **THE FIX:** None urgent beyond DOC-02. Schedule vitest 5 and TS 7 after launch.
- **EFFORT:** Not now.
- **PASS TWO:** CONFIRMED (LOW). Not re-run beyond noting that nanoid is not imported by app code (DOC-02).

#### NEW IN PASS TWO

#### DOC-P2-01 | GATES / DOCS | LOW | The `ci.yml` header gives a false reason for the most important structural decision in the workflow
- **WHAT IS WRONG:** `ci.yml:15-19` justifies decoupling the build job from `checks` because "`next build` is the ONLY gate that sees a type re-export from a "use server" module: TypeScript erases it, no test can reach it". The custom lint rule `nf/server-actions-export-only-actions` catches exactly that shape (A10 proved it via `eslint --stdin`). Readers therefore undervalue lint, which is the gate that is cheapest to run locally.
- **WHERE:** `.github/workflows/ci.yml:15-19`.
- **EVIDENCE:** The header text is quoted above. For the rule, see A10's CHECKED AND FOUND SOUND and DOC-04 row 5.
- **WHY IT MATTERS:** Sessions skip lint "because only build catches it", and lint only runs in dead CI.
- **THE FIX:** Reword the header to "lint (`nf/server-actions-export-only-actions`) and `next build` both catch it". Keep the independent build job; that decision is still right.
- **EFFORT:** 5 minutes.
- **PASS TWO:** NEW IN PASS TWO (found by the reviewer, A09). Header text of `.github/workflows/ci.yml:15-19` quoted; the rule proof is A10's `eslint --stdin` run (CHECKED AND FOUND SOUND; DOC-04 row 5, now in DOC-03).

#### DOC-P2-02 | GATES | MEDIUM | The CI build runs with no env, so it compiles a different `next.config` from production. The green build cannot fail for production's reasons
- **WHAT IS WRONG:** `ci.yml` builds "without any env" by design. But `apps/web/next.config.ts:8-15` derives `supabaseImageHost` from `NEXT_PUBLIC_SUPABASE_URL` and **omits** the Supabase `remotePatterns` entry when it is empty. `lib/images/optimisable.ts` does the same at runtime. The CSP host list and several `NEXT_PUBLIC_*`-gated branches also fold at build time. So CI proves that a config which never ships compiles. A malformed production value (for example a URL with a trailing path, or a typo that makes `new URL` throw, which returns `""` and silently drops the image host) passes CI and breaks every listing photo in production. It is the rule-3 "decoration" shape.
- **WHERE:** `.github/workflows/ci.yml:10-12` (no env). `apps/web/next.config.ts:8-15, 75-85`.
- **EVIDENCE:** Code read. A10's green build line says "`npm run build` (… NO env vars) exit 0".
- **WHY IT MATTERS:** The CI build and the Vercel build are different programs. Only Vercel's build exercises the real config, and Vercel deploys whatever it gets.
- **THE FIX:** In CI, set the non-secret public values as repository variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (a publishable key), `NEXT_PUBLIC_SITE_URL` and `NEXT_PUBLIC_MAPTILER_KEY`. Pass them to the Build job. Keep a second no-env build only if the "runs before credentials" property is still wanted. Add a unit test asserting that `next.config` `images.remotePatterns` contains the Supabase host when the env var is set.
- **EFFORT:** 1 hour.
- **PASS TWO:** NEW IN PASS TWO (found by the reviewer, A09). Code read: `ci.yml:10-12` (no env) and `apps/web/next.config.ts:8-15, 75-85`; pass one's green build line says "NO env vars".

#### DOC-P2-03 | GATES / DEPENDENCIES | LOW | Nothing watches for advisories, so DOC-02 will recur silently
- **WHAT IS WRONG:** There is no `.github/dependabot.yml`, no Renovate config and no `npm audit` step. The Next and sharp CRITICAL was found only because an auditor ran `npm audit` by hand.
- **WHERE:** `.github/` (contains only `workflows/`).
- **EVIDENCE:** `ls .github/dependabot.yml .github/renovate.json renovate.json` returns "No such file" for all three.
- **WHY IT MATTERS:** The next Next or Supabase advisory will sit unnoticed. This matters most because the lockfile is currently unrepaired.
- **THE FIX:** Add `.github/dependabot.yml` (`npm`, `/`, weekly, security updates, grouping `next`/`react*`). It works even with Actions billing lapsed, because Dependabot PRs are created server-side; their CI still needs billing. Add A10's `npm audit --omit=dev --audit-level=high` step as well.
- **EFFORT:** 15 minutes.
- **PASS TWO:** NEW IN PASS TWO (found by the reviewer, A09). `ls .github/dependabot.yml .github/renovate.json renovate.json` → "No such file" for all three.

#### DOC-P2-04 | TESTS | LOW | A recorded test failure was never identified. The suite's flake rate is unknown and unrecorded
- **WHAT IS WRONG:** `docs/SESSIONS_CLOSE_OUT.md:709-712` records "`vitest run src/lib` in the working tree reported **1 failure out of 3,327**, and I lost its name by piping the output to `tail`". Three later runs were clean, so the failure was accepted as a flake with no name and no ticket. My run and A10's were clean (3859/3860), so it has not recurred in two more runs. But nothing captures failures by name, CI keeps no JUnit/JSON reports, and the dead CI means no history exists.
- **WHERE:** `docs/SESSIONS_CLOSE_OUT.md:709-712`. `ci.yml` Test step (plain `npm run test`).
- **EVIDENCE:** The quoted text. My run: `Test Files 242 passed (242) | Tests 3859 passed | 1 skipped (3860)`.
- **WHY IT MATTERS:** A money test that flakes is a money test that gets re-run until it is green. The platform's own history ("main is green" three times, A10 incident 8) shows that pattern.
- **THE FIX:** In CI, `vitest run --reporter=default --reporter=junit --outputFile=vitest.xml` and upload it as an artifact. Add `retry: 0` explicitly so flakes surface. Sessions should record failures with `--reporter=json`, never `| tail`.
- **EFFORT:** 30 minutes.
- **PASS TWO:** NEW IN PASS TWO (found by the reviewer, A09). `docs/SESSIONS_CLOSE_OUT.md:709-712` quoted; the reviewer's run: `Test Files 242 passed (242) | Tests 3859 passed | 1 skipped (3860)`.

#### DOCUMENT TRUTH TABLE (carried from pass one)

Verdict key: **T** = true as far as I checked. **P** = partly true (specific false lines named). **F** = the headline claim is false. **H** = a dated historical record (true about its date, misleading if read as current). **U** = not verified line by line (spot checks only).

| Doc | Verdict | Evidence | Correct or delete |
|---|---|---|---|
| `ARCHITECTURE_DECISIONS.md` | U | Spot check only; the ADRs are reasoned records. | Keep. |
| `AUTH_EMAILS.md` | T (spot) | `supabase/templates/` holds the 5 html and txt pairs it names. | Keep. |
| `CRYPTO_DEPOSITS.md` | T (spot) | `lib/payments/yellowcard.ts` is env-gated as stated. | Keep. |
| `KNOWN_GAPS.md` | P | :270-273 and :379 "8 vitest files, No CI, No test suite" are false (DOC-14). | Correct. |
| `RECOMMENDATIONS.md` | P | T-1 (:1206) is stale. A2-142 "no pre-commit hook" is TRUE. | Correct T-1. |
| `ROADMAP.md` | P | :80 and :201 test and CI lines are false. | Correct. |
| `SAVINGS_POTS.md` | T (spot) | `lib/wallet/pot-actions.ts` and `pots.ts` exist. | Keep. |
| `docs/ADMIN_CONSOLE.md` | P | :657 "fails the build" is false (DOC-10). The rest is U. | Correct the line. |
| `docs/API_INVENTORY.md` | U / H | A plan dated 18 Sept. | Keep, label as plan. |
| `docs/BADGES.md` | U | – | Keep. |
| `docs/BRANCH_AUDIT.md` | H | Snapshot of 15 Sept. :107 "pre-commit grep" is false. | Move to archive. |
| `docs/BRAND_MARKS.md` | U | – | Keep. |
| `docs/BUILD_05_LEDGER.md` | H | Session ledger. | Archive after launch. |
| `docs/BUILD_06_LEDGER.md` | H + P | 7.0 "It is now run before every push" is false (DOC-15). | Append correction. Archive. |
| `docs/BUILD_07_LEDGER.md` | H + P | :7282 "fails the build" and :9224 "enforces" are overstated (DOC-10, DOC-03). | Append correction. |
| `docs/BUILD_SESSION_B_LEDGER.md` | H | Session ledger. | Keep until Session B closes, then archive. |
| `docs/BUILT_VS_PROVEN.md` | H + P | :996 "`next build` is unknown" is now known: it passes, but on the local tree only (DOC-02). Lint "red" at 92d6eb2b is green now. | Correct or re-measure. |
| `docs/DATABASE_AUDIT.md` | H | Run on 2026-08-07. | Move to archive. |
| `docs/DEPLOY.md` | P | :468 and :595-596 "No CI", "no Vitest files" are false. | Correct. |
| `docs/DESIGN_DIRECTION.md` | P | :203 light theme; :69 "fails the build". | Correct. |
| `docs/ENVIRONMENT.md` | P | 10 read variables are undocumented, including VAPID and the auth hook (DOC-16). | Correct. |
| `docs/FOUNDER_ARTWORK_NEEDED.md` | F (self-struck) | Opens with "STRUCK, 23 SEPTEMBER 2026". | Delete (archive). |
| `docs/FOUNDER_OPEN_ITEMS.md` | P | "Updated 22 September". Omits GitHub billing, the dead CI and the deep-link fingerprints as a gate. | Correct. |
| `docs/FRONTEND_REVAMP.md` | F | "Nothing in this document has been implemented. The product renders exactly..." Multiple sweeps have since landed. 36 light-mode references. | Delete (archive). |
| `docs/HANDOFF.md` | P | :560-586 "83 specs / 8 vitest files"; :119 light mode; :194 pre-commit grep. This is the "working contract". | Correct (priority). |
| `docs/HANDOFF_01_COMPANY.md` | H + P | 4.3 "nothing enforces retention" is now partly enforced (account purge, price-check sweep). | Correct 4.3 or archive. |
| `docs/HANDOFF_02_PLATFORM.md` | H + P | :701 pre-commit grep. | Archive. |
| `docs/HANDOFF_03_FRONTEND.md` | H | Superseded by 05, 08 and 09. | Archive. |
| `docs/HANDOFF_04_MARKETPLACE.md` | H | Superseded. | Archive. |
| `docs/HANDOFF_05_UPGRADED_WIDE_PLATFORM_BUILD.md` | H / live brief | 08 and 09 say it is still live. | Keep until closed. |
| `docs/HANDOFF_06.md` | H | Summary of Build 06. | Archive. |
| `docs/HANDOFF_07_LAUNCH_AND_MOBILE.md` | U | – | Keep. |
| `docs/HANDOFF_08_THE_NEW_WEEK.md`, `HANDOFF_09_THE_DIRECT_PLATFORM.md` | Live briefs, U | – | Keep. |
| `docs/ICON_SYSTEM.md` | P | :281 "standing pre-commit scan" does not exist (DOC-11). | Correct. |
| `docs/IMAGERY.md` | H | Shopping list, 15 Sept. | Archive. |
| `docs/MOBILE.md`, `docs/MOBILE_READINESS.md` | U / P | Deep-link placeholders are confirmed still present (DOC-13). The CI lines are aspirational. | Correct CI wording. |
| `docs/ONBOARDING_A_RESTAURANT.md` | U | – | Keep. |
| `docs/ONE_PERSON_MANY_ACCOUNTS.md` | U | – | Keep. |
| `docs/PLATFORM_STATUS.md` | P | :526 "CI has ever gone green: none confirmed" is false (59 greens). :165 counts are stale. It does not say CI is red and then dead. | Correct, or regenerate. |
| `docs/PLATFORM_SURVEY_2026-09-22.md` | H | Dated snapshot. | Archive. |
| `docs/PRICE_CHECK_STAGE_ONE_STATE.md` | H / U | Dated 23 Sept, with queries. | Keep. |
| `docs/PRODUCT.md` | P (important) | Light mode, "Trip", "five specs", "fails the build" (DOC-12). | Correct (priority). |
| `docs/PROMPTS_2026-09-22.md`, `PROMPTS_THE_FINISH.md` | H | Verbatim prompts. | Archive. |
| `docs/PROOF_RUN_2026-09-22.md` | H | Dated run. | Archive. |
| `docs/RETENTION_SCHEDULE.md` | P | :19 "Nothing in the database enforces that". The account-purge cron (`vercel.json`, 03:15) and `vallo_sweep_price_check_events` now enforce part of it (the doc's own :140-150 says so). The 30-day purge of rejected applicants' ID documents is UNVERIFIED. | Correct :19. |
| `docs/SESSIONS_CLOSE_OUT.md` | P | A5.3 "There is a check now" is manual only (DOC-15). The rest is carefully hedged. | Correct one line. |
| `docs/SESSION_B_SCOPE.md` | T (as a request list) | EX-2 is still open. | Keep. |
| `docs/SOCIAL_DESIGN.md` | U | – | Keep. |
| `docs/STORE_SUBMISSION_NOTES.md` | U | `scripts/seed/store-reviewer.mjs` exists. | Keep. |
| `docs/VALLO_DISCOVERY_REPORT.md` | H | Snapshot of 18 Sept; contains "no CI". | Archive. |
| `docs/WITHDRAWAL_PATH.md` | U | Paystack payouts are out of scope per the brief. | Keep; update on the upgrade day. |
| `docs/adr/0001-*.md` | U | – | Keep. |
| `docs/audit/AGENT1-3_*.md` (8,800 lines) | H | Point-in-time audits. | Archive. |
| `docs/email/WHAT_SENDS.md`, `docs/escrow/*`, `docs/push/*`, `docs/security/GRANT_STATE.md`, `docs/safety/*` | H / U | Dated state docs. The DB was not re-queried by me. | Keep with dates. |
| `docs/i18n/LOCALE_STATE.md` | T (method) | Numbers come from `locale-completeness.ts`, not a hand count. | Keep. |
| `docs/design/LIGHT_MODE_REMOVED.md` | T | Matches `tokens.css:15-46`. | Keep. |
| `docs/design/CATALOGUE.md` | H | Light-theme defect captures for a removed theme. | Correct the header. |
| `docs/design/*` (others) and `docs/design/proofs/**` (about 2,500 images) | H | Proof screenshots. | Move proofs out of the repo, or to LFS. |
| `docs/research/*` (21 files, about 25,000 lines) | H | Research as of its date. | Archive, or add a "point-in-time" banner. |
| `docs/archive/*` | H | Has a README, as intended. | Keep. |
| `packages/design-tokens/README.md` | P | :53 "fails the build" (DOC-10). | Correct. |
| `apps/web/vitest.config.ts` header (prose) | F | DOC-17. | Correct. |
| `.github/workflows/ci.yml` header (prose) | P | "`npm run lint` is `eslint . && node scripts/check-css-tokens.mjs`" omits the valuation-words step. "next build passes without any env" is TRUE. | Correct one line. |
| 13 PNGs at the repo root (`01F7DFC7-...png`, `IMG_6169.png`, and others) | – | Founder reference images at the root. | Move to `docs/design/references/founder/`. |

**Every place the pattern "a doc says X is enforced by Y" failed, where Y does not exist or does not run:**
1. The pre-commit Icon3D scan (DOC-11).
2. "Fails the build" ×6 (DOC-10).
3. The terminology ban (DOC-08).
4. "Enforced by five specs" (DOC-12).
5. The policy-caller probe "enforces" and "there is a check now" (DOC-03, DOC-15).
6. "`next build` run before every push" (DOC-15).
7. CI as the gate for everything (DOC-01).
8. Playwright specs as "the rule" (DOC-09).
9. The deep-link gate "exists" but is wired to nothing (DOC-13).

**Pass-two sample of the truth table (A09, 10 entries plus one extra):** 8 of 10 agree outright. Amended: `KNOWN_GAPS.md :270-273` → **H + P** (an honest dated record; only "No CI runs any" is false now); `RETENTION_SCHEDULE.md :19` → remove UNVERIFIED — every `cron.schedule(` name and `vercel.json` has no rejected-applicant or ID-document purge, so ":19 Nothing enforces" is still TRUE for the doc's own sharpest case (verdict "P: true for its headline case"). Extra sample: the `ci.yml` header `:15` claim that `next build` is the ONLY gate that sees a type re-export from a "use server" module is also false (DOC-P2-01). `BUILT_VS_PROVEN.md :996` is additionally superseded by commit `6e0ee6d` (DOC-15). A09 also spot-checked incident-table rows 1, 3, 5 and 6 (hold) and the three sampled source-text tests (confirmed).

#### CHECKED AND FOUND SOUND

- **Typecheck:** clean across both workspaces (exit 0).
- **Lint:** 0 errors. The css-token checker and valuation-words scanner are clean and print their own coverage limits honestly.
- **The server-actions lint rule catches the 19 September outage shape.** I proved it with stdin: `2:1 error A "use server" module may export async functions and nothing else ... nf/server-actions-export-only-actions`.
- **Vitest:** 3,859 of 3,860 pass. There are no tests without `expect`, no snapshot tests and no `expect(true)`. The 2 skips are documented live-proof gates.
- **`next build`:** succeeds with no env vars, on the local tree.
- **Paystack webhook status codes:** well tested. 503 without the service key, 500 on a write throw, 401 on a bad signature, 400 on non-JSON, and a non-NGN charge is not credited.
- **Colour contrast (WCAG 2.x), computed from `packages/design-tokens/src/tokens.css`:**
  - On the canvas `#000612`: content-primary `#FFFFFF` 20.29:1, secondary `#D5DEFF` 15.19:1, subtle `#B4C0E0` 11.17:1, muted `#8E9CC4` 7.44:1, link `#5C9FFF` 7.59:1. On the lightest surface `#000060`, muted is still 6.59:1. All pass AA, and AAA except muted and link on the raised surfaces.
  - White on the primary button fill `#0069FE` is 4.72:1 (AA).
  - The one weak pair: `--nf-brand-primary` `#0069FE` used as text or icon colour on the canvas is **4.30:1**, which fails AA for body text. The 28 uses I found are icons or accents (non-text needs 3:1). LOW, not filed.
- **Keyboard and focus on `/sign-in/email`:**
  - The first Tab reaches "Skip to content".
  - The order is Back, language select, home, other ways, email, password, show password, Sign in, Forgot, Sign up, legal links.
  - Every stop shows a 2 px solid outline.
- **Sign-up form semantics:**
  - Every field has a programmatic `<label>` and correct `autocomplete` (given-name, family-name, email, new-password).
  - Submitting empty sets `aria-invalid="true"` on each field, with `<p role="alert">` messages.
  - axe on `/sign-in`, `/sign-in/email`, `/sign-up`, `/sign-up/email`, `/wallet/send`, `/wallet/receive`, `/settings/payments`, `/messages` and `/settings` found **0 violations**.
- **Four locales at 360 px:** `/`, `/sign-up/email`, `/sign-in/email` and `/welcome` in en, yo, ha and ig have no horizontal scroll (`scrollWidth == clientWidth == 360`), and `<html lang>` follows the cookie.
- **Pluralisation for the four nouns covered by `plural()`:** asserted literally for 0, 1 and 2 in all four locales (`lib/plurals.test.ts`), with a CLDR-category guard. Gaps are in DOC-22.
- **Preview harness routes** (about 200 `/preview/*` routes in the production build) serve the not-found body on production (`previewHarnessIsOpen` returns false when `VERCEL` is set). Checked on `/preview/e/wallet`.
- **Versions:** `npm run sync:versions -- --check` is in sync.

#### CORRECTLY EMPTY vs BROKEN

| Screen / check | Verdict | Reason |
|---|---|---|
| `/checkout` with no booking id (QA member) | CORRECTLY EMPTY | Redirects to `/stays`. The QA member has no booking; zero bookings exist. So I could not axe-audit a real payment panel. |
| `/search` and `/stays` signed out | NOT EMPTY, REDIRECTED | Redirects to `/welcome?next=/sign-in?...notice=sign-in-required`. Whether browsing must require sign-in is a product decision; flagged to the relevant agent, not filed here. |
| `email_outbox`, escrow and push drains "green over nothing" | CORRECTLY EMPTY | Per the docs and the brief. I did not re-query. **Update, 23 September:** `email_outbox` now holds two rows, one SENT at 16:00:05 after a real sign-up and one PENDING, so the email path is proven end to end against a real event. `push_tokens` is still 0: no push has been proven. |

*Pass-two note:* the signed-out redirect on `/search` and `/stays` is now filed as STORE-P2-04 (HIGH) in the stores area.

#### NOT COVERED

- I did not read line by line the ledgers (BUILD_07 is 11,778 lines, SESSION_B is 7,905), `docs/research/*`, `docs/audit/*` or `docs/design/proofs/**`. They were grepped for enforcement, CI, test, light-mode and incident claims and classified by type.
- Vercel deployment state: `list_deployments` returned 403 for this token, so I could not confirm whether the latest commits' Vercel builds are READY. The GitHub commit-status API also returned 403. The live site serves Next 16.2.12, which is consistent with lockfile builds succeeding.
- Whether the Next or sharp AVIF advisory can be exploited on Vercel's hosted image optimiser (DOC-02) is UNVERIFIED.
- The payment panel (`/checkout/[bookingId]`, `/rent/pay/[inspectionId]`) was not reachable without creating a booking, so it was not axe-audited.
- VoiceOver and TalkBack, and the native Capacitor shell, were not tested. axe is an automated subset.
- Layout under the longer locales was checked only on four public pages. Signed-in screens were not checked per locale.
- RTL is not applicable (no RTL locale).
- `npm audit` covers production dependencies only (`--omit=dev`).
- I did not attempt a lockfile-faithful local build (it needs a repaired lockfile). My build and test results are for Next 16.3.6.
- Artifacts created: none on the live site. I signed in as the QA member account three times (read-only page views). No records were created.

**Pass two (A09) did not cover:**

- I did not run `npm run typecheck` or `next build`. A10's build result is taken as reported (and see the DOC-15 amendment).
- DOC-21's `definition-list` and landing `aria-hidden-focus` nodes were not re-verified: the proxy failed that page load, and I did not run the landing page.
- I did not verify inside Vercel's platform what software its image optimiser runs. The DOC-02 conclusion rests on the response-header evidence and on `next.config.ts` having no custom loader.
- The ledgers and research docs were not read line by line, as in A10.

Artifacts: none created on the live site. Only the QA member account was used, for read-only page views and axe.

#### FOR THE FOUNDER

1. **GitHub billing:** "recent account payments have failed or your spending limit needs to be increased". Until this is fixed, no CI job starts. It is under Settings, Billing & plans on the account that owns `moderator29/read-it-well`.
2. **Branch protection on `main` needs GitHub Pro or Team** for a private repo (the API answered "Upgrade to GitHub Pro"). Decide whether to pay for it, or accept Vercel deployment checks as the substitute.
3. **The Play Console SHA-256 fingerprints** (app signing key and upload key) for `assetlinks.json`. The deep-link gate is red without them, and Android App Links will not verify.
4. **Decide whether the database-level test job (DOC-03) is a launch requirement.** My recommendation is yes, before the first real escrow. Escrow and the ledger have never been exercised by a real agreement or by any automated test.
5. **After the fixes, read a doc cleanup list:** archive about 25 superseded or snapshot docs, and correct `PRODUCT.md`, `HANDOFF.md`, `DEPLOY.md`, `ROADMAP.md`, `KNOWN_GAPS.md` and `PLATFORM_STATUS.md` (see the truth table). A separate agent is reorganising docs in another worktree. This table is the input it needs.

#### CLEANUP NOTES

- Pass one: no artifacts on the live site; three read-only QA-member sign-ins; the rewritten `apps/web/tsconfig.json` was restored with `git checkout`, and `.next-a10` was deleted.
- Pass two: no artifacts on the live site; only the QA member account, for read-only page views and axe; no `next build`, so `tsconfig.json` was never touched.

## 7. WITHDRAWN, MERGED AND CORRECTED
ESC-18 was marked WITHDRAWN by its reviewer (A01) as a duplicate of MON-10, and is recorded below as merged into MON-10. No finding was withdrawn as wrong. One claim was withdrawn in part: **DB-13** — the "41 ms planning" measurement did not reproduce (1.7 ms and 3.7 ms in pass two; a cold-backend artefact) and is withdrawn; its five duplicate indexes stand at LOW.

Merged findings (kept in place in their area files with a one-paragraph body):

| ID | Area | Merged into | Reason |
|---|---|---|---|
| ESC-18 | A02 Escrow | MON-10 | Duplicate of MON-10 (reviewer A01 withdrew it in favour of MON-10; fixes merged there). |
| DB-P2-01 | A03 Schema | ESC-02 | Same defect as ESC-02 (guest-written booking price charged by checkout); evidence and fix merged there. |
| SEC-01 | A04 Security | DB-01 (businesses) and DB-02 (listings) | Same defect as DB-01 (businesses) and DB-02 (listings), and SUP-02; canonical IDs carry the evidence and the amended trigger fix. |
| SEC-P2-01 | A04 Security | ESC-02 | Same defect as ESC-02 (and SUP-03, DB-P2-01); the probe evidence is carried there. |
| UX-01 | A05 UX | STORE-P2-04 | Same sign-in wall and Apple 5.1.1(v) argument as STORE-P2-04 (A08 area); reviewer's fix amendments carried there. |
| UX-03 | A05 UX | STORE-05 | Same unlabelled example cards under "Verified homes" as STORE-05; its extra evidence is carried there. |
| UX-26 | A05 UX | STORE-06 | Same store badges linking to `/start` as STORE-06 (and UI-07); the reviewer says pass one's LOW understated it. |
| UX-13 | A05 UX | MON-04 | MON-04 owns the defect (money can enter and cannot leave; Terms promise it can); UX-13's copy sites and the delete-account dead end are carried there. |
| UI-07 | A06 Interface | STORE-06 (CRITICAL→HIGH) | Same defect as STORE-06 (store badges on the landing, rendered inside the native app); A05 lowered it to HIGH on merge and added a fix point carried there. |
| UI-04 | A06 Interface | ESC-13 (HIGH→MEDIUM) | Same Terms-vs-escrow contradiction as ESC-13, analysed more deeply there; A05 lowered it to MEDIUM and amended ESC-13's fix. |
| UI-12 | A06 Interface | OPS-15 (MEDIUM→LOW) | Same nonce-less chunk as OPS-15, which went further (no functional loss) and rated LOW; A06's CI check is carried there. |
| SUP-01 | A07 Supply | DB-03 | Same defect as DB-03 (INSERT…RETURNING refused 42501 by `owns_listing(id)`); DB-03 raised to CRITICAL and carries the amended (non-recursive) fix. |
| SUP-02 | A07 Supply | DB-01 and DB-02 | Same defect as DB-01 (businesses) and DB-02 (listings) and SEC-01; evidence and the trigger-based fix carried there. |
| SUP-03 | A07 Supply | ESC-02 | Same defect as ESC-02 (guest-written booking price); the new DRAFT-listing fact and fix amendment are carried there. |
| SUP-07 | A07 Supply | SEC-04 | Same defect as SEC-04 (raw host photos with GPS in a public bucket); SUP-07's additions carried there. |
| STORE-P2-05 | A08 Stores | DB-01 / DB-02 (cross-reference) | Filed by the reviewer explicitly as a cross-reference to DB-01/DB-02 ("not a new fix"); counted there. |
| STORE-21 | A08 Stores | STORE-05 | Same "invest"/misleading-claim copy family as STORE-05; fix both strings together there. |
| OPS-01 | A09 Ops | MON-05 (severity CRITICAL→HIGH) | Same defect as MON-05 (a booking can be paid twice; late/duplicate charges recorded as success); A10 lowered it CRITICAL→HIGH and asked for one ID. |
| OPS-P2-05 | A09 Ops | DOC-01 (cross-reference) | Cross-reference of DOC-01/DOC-02 placed in the ops file by the reviewer; counted under DOC-01. |
| OPS-P2-04 | A09 Ops | MON-P2-03 | Ops-side restatement of MON-P2-03; the reviewer asked for MON-P2-03 to stay the primary ID. |
| DOC-04 | A10 Truth | DOC-03 | DOC-03's evidence table rather than a separate defect (reviewer's recommendation; known duplicate). |

Canonical severities after merging (the highest of the merged set, using post-pass-two severities): DB-01 CRITICAL; DB-02 CRITICAL; DB-03 raised HIGH→CRITICAL (from SUP-01); ESC-02 CRITICAL; MON-05 HIGH (OPS-01 was CRITICAL in pass one but its reviewer lowered it to HIGH); MON-10 MEDIUM (ESC-18 was LOW); SEC-04 HIGH; STORE-05 HIGH (also absorbs UX-03 and part of UI-03); STORE-06 HIGH (absorbs UI-07, which its reviewer lowered CRITICAL→HIGH, and UX-26, raised from LOW); STORE-P2-04 HIGH (absorbs UX-01 and UI-20's carousel half); MON-04 HIGH (absorbs UX-13); ESC-13 MEDIUM (absorbs UI-04, lowered HIGH→MEDIUM); OPS-15 LOW (absorbs UI-12, lowered MEDIUM→LOW, and UX-27's CSP half); DOC-03 HIGH; MON-P2-03 MEDIUM; DOC-01 HIGH. Each canonical finding in its area file carries an "Also reported as <ID>" line for every A05/A06 finding merged into it.

Split findings (kept active for the half that is not merged): UX-27 (CSP half → OPS-15; the error-boundary half stays at LOW), UI-20 (carousel half → STORE-P2-04; the unknown-URL half stays at LOW), UI-03 (landing/home strings → STORE-05; the `/rent` and agent-pitch claims stay at HIGH).

### Orchestrator corrections applied

1. **OPS-13 (A09): SEVERITY CHANGED MEDIUM→LOW.** The orchestrator read `apps/web/src/app/agent/list/ListingWizard.tsx:1257-1299`: the listing wizard re-encodes every photo client-side (`createImageBitmap` → canvas → `toBlob` JPEG 0.9, long edge ≤ 2560px) and refuses the upload if re-encoding fails, which strips EXIF. "Listing photos upload raw" is wrong for the wizard. What survives: no server-side enforcement (a direct Storage upload with the user's JWT bypasses the wizard), no resumable photo upload, no orphan sweep; host/stay photos via `PhotoManager` (SEC-04) are genuinely raw. The earlier "unresolved" cross-area note is replaced by this resolution in both OPS-13 and SEC-04.
2. **SEC-05 (A04) restored to HIGH; STORE-P2-01 (A08) stays HIGH.** Pass two had lowered SEC-05 to MEDIUM. The store-facing severity wins: a reviewer who posts a slur in an unfiltered comment surface sees it published, which is an Apple 1.2 / Play UGC rejection. Both IDs kept and cross-referenced.
3. **UX-24 (A05) raised HIGH→CRITICAL.** Catalogue evidence: `has_table_privilege('anon','public.social_profiles','SELECT')` = true; anon holds column SELECT on `display_label, occupation_code, lga_code, state_code, home_area_id, bio, handle` (and more); policy `social_profiles_select` is `FOR SELECT TO public USING (NOT private.blocked_with(user_id))`; anon holds EXECUTE on `private.blocked_with`; 10 rows, 7 not QA accounts, 9 with occupation or LGA set. No over-the-wire anonymous read was performed (the permission policy blocked it). Probable public exposure of members' names, occupations and home LGA to anyone with the publishable key. Fix: revoke those columns from anon (after checking every anon select of `social_profiles` in `apps/web/src`), a privacy setting, and notice at sign-up.

Fix corrections carried into canonical findings: DB-01 and DB-02 carry the role-aware BEFORE-trigger fix, because admins write through their own `authenticated` client via `requireAdmin` and a column-grant revoke stops every admin decision (R-A03-by-A08; R-A04-by-A07, SEC-P2-03 — proved 42501 in a rolled-back probe). DB-03 carries the SECURITY DEFINER helper policy, because SUP-01's column-based policy recurses with 42P17 through `firm_members` (R-A07-by-A04). The same admin-client caveat is reflected in the amended fixes of DB-05, DB-06, DB-07 and SUP-05.

### Possible further duplicates (flagged by reviewers or visible across areas; NOT merged)

These were not in the known-duplicate list, so each ID is kept and cross-referenced in its finding:

- **ESC-03 (HIGH) and SUP-P2-02 (HIGH):** the same calendar-squat abuse (direct PENDING bookings held 48h, renewable). SUP-P2-02 adds the 365-night probe and extra limits for the ESC-02 booking RPC.
- **SEC-05 (HIGH) and STORE-P2-01 (HIGH):** the objectionable-content filter covers only posts and bios; the severity conflict was resolved by the orchestrator (both HIGH).
- **UX-09 (HIGH) and UI-P2-01 (HIGH):** example hotels (and, in UI-P2-01, restaurants) carry no example disclosure and offer booking controls. Kept both, cross-referenced (orchestrator instruction).
- **UX-10 (HIGH) and UI-P2-03 (MEDIUM):** kind-based routing renders rentals as nightly stays (price math in UX-10, template mismatch in UI-P2-03); shared fix.
- **UX-11 (MEDIUM) and SUP-15 (LOW):** the same mislabelled supply doors ("Become an agent" → owner form; "Sign in" shown to a signed-in member).
- **UX-22 (LOW) and STORE-21 (merged into STORE-05):** the "Invest" tile; UX-22 also covers the other misleading tiles.
- **UI-16 (LOW), STORE-17 (LOW) and OPS-17 (LOW):** soft 404s (`/preview` half is STORE-17; listing soft-404 is OPS-17); **UI-20 (LOW) and OPS-17:** unknown signed-out URLs redirect to sign-in.
- **UX-P2-01 (HIGH) and OPS-12 (MEDIUM):** "Download my data" is a placebo; OPS-12's "no export path" still stands.
- **SEC-12 (MEDIUM) and DB-17 (MEDIUM):** KYC documents can be overwritten or deleted after approval; both amended identically (unique upload paths before dropping UPDATE).
- **SEC-13 (MEDIUM), STORE-P2-02 (MEDIUM), ESC-06 (HIGH), MON-09 (HIGH), STORE-12 (MEDIUM):** the account purge leaves data behind and never re-checks the deletion blockers; ESC-06 and MON-09 are explicitly to be fixed as one change, and STORE-12's amendment is the same fix.
- **DB-19 (LOW) and OPS-P2-03 (LOW):** the same `risk_alerts` row that is `open` with a `resolved_at`.
- **DOC-13 (MEDIUM) and STORE-03 (HIGH):** the same deep-link placeholders (gate half and store half).
- **OPS-02 (HIGH)** overlaps MON-05, MON-P2-02 and MON-P2-03 in parts (a) and (c); part (b) is its own.
- **OPS-08 (MEDIUM)** overlaps DOC-01 and DOC-03; both reviewers keep OPS-08 for the migration-process angle only.
- **STORE-15 (MEDIUM)** is a partial duplicate of STORE-04's push row and DOC-01's lockfile; kept as a founder checklist item.
- **SEC-P2-03 (HIGH)** is about the proposed fixes, not the platform; the canonical fixes in this merge already avoid it.

**Resolved by orchestrator:** A04 and A07 recorded that the listing wizard re-encodes photos through a canvas; A09 and A10 recorded that listing photos upload raw (OPS-13). The orchestrator read `ListingWizard.tsx:1257-1299` and confirmed the wizard re-encodes; OPS-13 is lowered to LOW (see ORCHESTRATOR CORRECTIONS).

## 8. WHAT THIS AUDIT DID NOT COVER

Each area section has its own detailed NOT COVERED list. These are the gaps that cut across areas.

- **No native build and no device.** The claims about the iOS and Android shells were made by reading source, not by running an app. That includes the offline screen (STORE-01), the microphone crash (STORE-P2-03), push, the back button and safe areas. No real screen reader was used either; the accessibility checks were axe runs plus reading the code.
- **No real money moved.** Paystack's checkout iframe, a real top-up, a real withdrawal and a real webhook were never driven. The webhook routes were probed only with bad signatures.
- **Some writes were only simulated.** Every write-shaped proof, whether an insert, an update or a checkout, ran as a SQL `DO` block as `authenticated` or `anon`. The block set the JWT claims, included a control step that had to succeed, and ended in a deliberate exception so it rolled back. These prove what the database allows. They do not exercise the Next.js server actions over HTTP. Server-action authorisation for all 246 actions was established by reading the code; the pass-two review sampled 16 of them and all 16 were correct.
- **Two probes were blocked by this session's permission policy and were not repeated:**
  - the signed-out API read of `social_profiles` (UX-24);
  - some signed-in PostgREST inserts (DB-01 and SUP-01 used rolled-back SQL instead).
- **Vercel settings were not visible.** Environment variables, runtime logs, the plan and the production branch are all unverified. The Vercel connection lists the project but returns 404 on it. So `EMAIL_REPLY_TO`, `SENTRY_DSN`, `ANTHROPIC_API_KEY` and `NEXT_PUBLIC_SUPPORT_EMAIL` could not be confirmed during the audit. **Confirmed after the audit (founder's read of Vercel, 23 September):** `EMAIL_REPLY_TO`, `SENTRY_DSN` and `NEXT_PUBLIC_SUPPORT_EMAIL` are NOT SET; `ANTHROPIC_API_KEY` is set.
- **DNS was checked only partly.** It was queried from one resolver; the sandbox blocks DNS-over-HTTPS. DMARC and MX are absent, and SPF and DKIM are present (OPS-06). Inbox placement, meaning Gmail's Promotions tab, was not measured, because no mail was sent to a seeded inbox.
- **Load was not tested.** Statements about what breaks at 1,000, 10,000 and 100,000 listings come from query plans, code reading and the 200-row cap in search. No synthetic load was generated.
- **No restore test.** There is nothing to restore on the Free plan (OPS-07).
- **Timing figures are indicative.** 3G timings went through a slow sandbox proxy, so treat them as rough. The byte counts are reliable.
- **Admin views were covered by one agent only.** Admin screens were walked by A06 as the QA admin. The pass-two review of A06 did not sign in as admin, so the admin-screen findings rest on one agent's evidence.
- **Other locales were not tested for layout.** The four locales were checked for hard-coded strings and plurals, but not for layout under the longer languages. There are no native-speaker translations yet to test with.
- **Parts of the brief were checked only partly:**
  - printing (MON-16: receipts cannot be exported);
  - two devices signed in at once (SEC-08: sign-out logs out every device; a revoked session works against the database for up to an hour);
  - clock skew between the app, the server and Postgres, which was read from code only;
  - iOS pull-to-refresh and rubber-band, which were read from CSS only (UI-19).
- **Code moved during the audit.** Two build sessions were pushing to `main` throughout, and the production deployment changed at least once. Every finding is pinned to `85c5471` or to the live state at the moment of its evidence. Several findings sit in files edited today, which is flagged in each one. Re-verify before fixing.

## 9. HOW THE AUDIT WAS CONDUCTED, AND WHAT IT LEFT BEHIND

- **The agents.** Twelve were used:
  - ten audited the platform;
  - two cleaned the repository.

  In pass two, each audit agent re-audited a different agent's area. The pairs were:
  - money and escrow;
  - schema and stores;
  - security and supply;
  - UX and interface;
  - ops and docs.

  An editor merged the results without adding findings. I made three corrections of my own after reading the code or the catalogue myself:
  - OPS-13 (the photo re-encode) was lowered.
  - SEC-05 was restored to HIGH.
  - UX-24 was raised to CRITICAL.

  Section 7 records all three.
- **Rule breaches, reported honestly.**
  - **A live row was written.** In pass one, the security agent created a real business row as the QA member to prove DB-01, then deleted it; zero rows remain. That broke the "rolled-back only" rule. It was not repeated.
  - **Alerts were created.** Unsigned probes by the auditors raised three `risk_alerts`:
    - `webhook.paystack.signature_invalid`;
    - `webhook.yellowcard.unconfigured`;
    - `cron.account_purge.unauthorised`, at 20:49 to 20:52 UTC.

    These are auditors, not attackers. Resolve them, and check after 03:15 UTC tomorrow that the real account purge cron ran authorised.
- **Things to clean up on live:**
  - Wallet pot `47925737-30d4-4c5a-a54c-1c8f4c2c5fb7` ("QA A04 probe", balance 0, archived) on the QA member. An admin can delete it.
  - About twelve `auth.sessions` rows with `user_agent = 'node'` on the two QA accounts, created 20:10 to 20:50 UTC, plus browser sessions from the walk-throughs. End them from `/settings/devices`.
  - An empty conversation ("Mini flat in Yaba") in the QA member's inbox. Opening `/messages/new?listing=` creates one (UX-P2-03).
  - Sequence gaps in `agent_ref_seq` and the listing-reference sequence, from rolled-back probes. They are harmless.
- **Credentials.** The QA credentials appear nowhere: not in this file, not in the repository, not in the scratch work. Scripts read them from environment variables set on the command line. Screenshots showing the QA email were deleted or redacted. The private support address is deliberately not written in this file in either spelling. It is referred to as the "with-s" and "no-s" spellings.
- **Nothing was fixed.** The one attempted exception, the DB-01 trigger, was refused by this session's permission controls and was not retried by another route (section 2).

## 10. THE REPOSITORY CLEANUP (AGENTS 11 AND 12)

**The goal.** A developer hired tomorrow should think a serious team built this. What was done is below, and so is what was held while two build sessions were still running (both have since closed, and the held work is done: see the end of this section).

**Removed.** All of it is still in git history at `85c5471`.
- **Build-proof screenshots:** 565 files in 35 run folders under `docs/design/proofs/`, 439.6 MB in all. These were artefacts of the build process, not design documentation. The scripts that made them still exist:
  - `scripts/design/proof-*.mjs`;
  - `scripts/design/session-b-shots/*`;
  - `scripts/probes/state-colours.mjs`;
  - `apps/web/tests/session-b-*-live.spec.mjs`;
  - and others, listed in the agent report.
- **Duplicate references:** 13 byte-identical files in `docs/design/references/`, 26.8 MB, checked by md5. `CATALOGUE.md` had already flagged each one.
- **Stale root documents:** `KNOWN_GAPS.md` and `ROADMAP.md`, both last updated 9 August and superseded by `docs/PLATFORM_STATUS.md`. They were moved to `docs/archive/`.

**Moved.**
- **Founder artwork:** `IMG_6169.png` and `IMG_6170.png` are the founder's platinum and gold tier-badge artwork, and the badges were measured from them. They now live at `docs/design/references/trust-badges/tier-badge-{platinum,gold}-source.png`. The two code comments that cite them were updated.
- **Loose root documents:**
  - `ARCHITECTURE_DECISIONS.md` and `RECOMMENDATIONS.md` → `docs/`.
  - `CRYPTO_DEPOSITS.md` and `SAVINGS_POTS.md` → `docs/wallet/`.
- **Closed session scaffolding** → `docs/archive/`:
  - `HANDOFF.md`, and `HANDOFF_01`, `_02`, `_03` and `_06`;
  - `BUILD_06_LEDGER`;
  - `FRONTEND_REVAMP`;
  - `VALLO_DISCOVERY_REPORT`;
  - `BRANCH_AUDIT`;
  - `DATABASE_AUDIT`;
  - `docs/audit/`, now `docs/archive/audit-2026-09-15/`.

  `docs/archive/README.md` explains what the archive is. Every inbound path reference was updated, 28 files in all. No migration was edited.
- **Tools rescued from the proofs tree:** `scripts/design/no-light/` and `scripts/design/paper/`, with their paths fixed.

**Rewritten.** About 30 files had comment-only changes, where a comment narrated sessions, workers or rounds instead of the code. The substantive explanatory comments were kept. The AI assistant is a product feature, and its code was not touched:
- `api/assistant/`;
- `api/support/`;
- `lib/social/bot-actions.ts`.

About 177 files still contain process narration, 268 lines in all. Most of it sits in files the live sessions are editing right now. This command finds them:

```
git grep -nE "Session [A-Z]\b|session [AB]\b|worker|Build 0[0-9]|handoff|ledger|round [0-9]" -- 'apps/**/*.ts' 'apps/**/*.tsx' 'apps/**/*.css'
```

Review each hit by hand. "Service worker" and "worker thread" are real code terms.

**Written new.**
- `README.md`:
  - what Vallo is, the stack and the architecture: the two sides, the modes and roles, and the money model as the code actually does it;
  - every environment variable by name, with its purpose and who supplies it;
  - the layout, the migration rules, the gates and deployment;
  - an honest note that CI is currently red.
- `CONTRIBUTING.md`.
- `docs/README.md`, an index of the live documentation.
- `.github/pull_request_template.md` and `.github/ISSUE_TEMPLATE/{bug_report,feature_request}.md`.
- No LICENSE. That is the founder's decision; see section 11.

**Size.** `docs/` went from 824 MB to 357 MB, and the images under `docs/` from 2,476 to 1,939. **`.git` does not shrink:** it is 831 MB before and after, because deleted files live on in history. Every clone stays roughly that size until history is rewritten. That was forbidden, and it was not done.

**Held for the live sessions, to move when they close.**
- **Scope and ledger files:** `docs/SESSION_B_SCOPE.md`, `BUILD_SESSION_B_LEDGER.md`, `BUILD_07_LEDGER.md` and `BUILD_05_LEDGER.md`.
- **Live briefs:** `HANDOFF_04`, `_05`, `_07`, `_08` and `_09`.
- **Session outputs:** `SESSIONS_CLOSE_OUT`, `BUILT_VS_PROVEN`, `FOUNDER_OPEN_ITEMS`, `PLATFORM_STATUS`, `WITHDRAWAL_PATH`, `PROMPTS_*`, `PROOF_RUN`, `PLATFORM_SURVEY` and `FOUNDER_ARTWORK_NEEDED`.
- **Design and research files:** `docs/design/REFERENCE_UPLOADS_2026-09-22.md`, `TRACK_G_STATE.md`, the root `AUTH_EMAILS.md` and `docs/research/`.
- **Proof screenshots:** `docs/design/proofs/session-b/`, 202 MB, which Session B is still writing to.
- **Root PNGs:** the 10 UUID-named PNGs at the repository root. Session B scripts read them by root path.
  - Six are byte-identical to files already in `docs/design/references/`. Delete the root copies after close.
  - Four are admin renders that exist only at root. They move to `docs/design/references/admin/` under descriptive names.

When all of that is done, `docs/` should be about 155 MB, nearly all of it the governing design references.

**Found by the repository agents and recorded as findings.** Nothing here was fixed.
- CI fails at `npm ci` (DOC-01).
- Env templates:
  - `.env.example` is missing `YELLOWCARD_API_BASE`, `YELLOWCARD_API_KEY`, `YELLOWCARD_API_SECRET` and `VALLO_INSPECTION_REPORTS`.
  - `apps/web/.env.local.example` is a second committed template whose header wrongly says it is not committed.
  - `apps/web/.env.example` names a model identifier as the assistant's default.
- `.gitignore` does not ignore `docs/design/proofs/`, which is how 640 MB of screenshots got committed.
- Stale deployment docs:
  - `DEPLOY.md` still describes a hosted-checkout redirect, the old `middleware.ts` name, and env vars the code no longer reads (`AMADEUS_*`, `GOOGLE_PLACES_API_KEY`).
  - `DEPLOY.md` numbers two sections 2.4.
  - The `EMAIL_FROM` default differs between `.env.example` (`hello@vallo.ng`) and `DEPLOY.md` (`hello@vallospaces.com`).
- 24 image links in the held `BUILD_07_LEDGER.md` now point at deleted `proofs/imgc` shots. They still resolve in history at `85c5471`.

**Completed after both build sessions closed (fix pass, 23 September, after 22:25 UTC).** Everything held above has been done:
- **Root PNGs.** The six byte-identical copies (`2A49E2F7`, `50E032EA`, `55A56F21`, `6AF37222`, `77A54EA3`, `F6A8A482`, md5 re-checked) were deleted from the root. The four admin renders were viewed and moved to `docs/design/references/admin/`: `5EAA44CB` → `admin-01-overview.png`, `C1D98B3C` → `admin-02-listings-review-money.png`, `8E9602E2` → `admin-03-escrow-verification-supply.png`, `01F7DFC7` → `admin-04-moderation-operations-analytics.png`. `CATALOGUE.md` maps the short ids to the new names. `scripts/design/session-b-crops.mjs`, `session-b-shots/admin-money.mjs` and `admin-review-shots.mjs`, the three `public/brand/session-b/*/SOURCES.md` and every comment that said "repository root" now point at `docs/design/references/`.
- **Archived** to `docs/archive/` (each with a row in its README): `SESSION_B_SCOPE`, `BUILD_SESSION_B_LEDGER`, `BUILD_05_LEDGER`, `BUILD_07_LEDGER`, `HANDOFF_04`, `_05`, `_07`, `_08`, `_09`, `SESSIONS_CLOSE_OUT`, `BUILT_VS_PROVEN`, `PROMPTS_*`, `PROOF_RUN_*`, `PLATFORM_SURVEY_*`, `FOUNDER_ARTWORK_NEEDED`, `REFERENCE_UPLOADS_*`, `TRACK_G_STATE`, `design/SWEEP.md` (generated from the proofs, which are gone), `PLATFORM_STATUS.md` (a cycle report of one moment; correcting 1,375 lines to today would duplicate this audit) and `FOUNDER_OPEN_ITEMS.md` (its still-open items are folded into section 11 below).
- **Moved:** `AUTH_EMAILS.md` → `docs/email/AUTH_EMAILS.md` (the two code comments and `WHAT_SENDS.md` updated); `WITHDRAWAL_PATH.md` → `docs/wallet/`.
- **Kept:** `docs/research/`, with a new `README.md` saying it is evidence, not documentation, because code comments and `check-deep-links.mjs` cite it by path.
- **Deleted:** `docs/design/proofs/session-b/` (≈202 MB). `docs/design/proofs/` is now in `.gitignore`; the scripts that write there still run and their output stays local.
- **Comments:** every hit of the section's grep was read and rewritten by hand to describe the code (about 180 files, comment-only). The design rules the comments cite as R-A to R-G are now written down in `docs/DESIGN_DIRECTION.md` section 1.1. Left on purpose: "worker" where it means the service worker, a drain worker or a test worker; "this session" where it means a browser session; two lint messages in `eslint-rules/server-actions-export-only-actions.mjs` and three admin-facing strings that still name the build sessions (code, not comments; recorded as a separate finding).
- **Size:** `docs/` was 387 MB in the fix worktree before this pass and is **162 MB** after (151 MB of it the governing references, including the four admin renders that moved in from the root).

## 11. TO THE FOUNDER

Everything I would have said out loud is here.

**What I need from you, in order of lead time.**
1. **D-U-N-S number for VALLO SPACES LTD.** It is free through Apple's lookup and takes 1 to 2 weeks. Nothing else in store enrolment can start without it.
2. **The two developer accounts, both as an Organisation:** Apple Developer Program (99 USD a year) and Google Play Console (25 USD), plus developer verification. Then:
   - the APNs key;
   - the Sign in with Apple Services ID and key;
   - a Play upload keystore;
   - the Firebase Android API key.
3. **A written legal opinion on whether Vallo may hold customer naira in a wallet and move it between users without a CBN licence.**
   - This is the question the whole Play Financial Services declaration turns on (STORE-09).
   - If the answer is "not without a licence", switch off Send, Request and pots for v1. Keep top-up to pay and refunds to wallet only if counsel is comfortable with that.
   - I would not submit to Play until this exists in writing.
4. **Ownership of the infrastructure.**
   - **The problem:** the live database is in a Supabase project named after a personal Gmail account, inside an organisation called "Naijafinds". Hosting is in a personal Vercel team next to unrelated projects (OPS-P2-02). Customer data, the wallet ledger and KYC documents are controlled by a personal login.
   - **What to do:** move both into company-owned accounts with two owners and two-factor authentication.
   - **Plan and backups:** upgrade Supabase to Pro while you are there. On Free there are **no restorable backups** of a money ledger (OPS-07). This is the finding I would lose sleep over.
5. **GitHub billing.**
   - **The problem:** since 15:48 UTC today, CI jobs do not start: "recent account payments have failed or your spending limit needs to be increased" (DOC-01). `main` has no protection. At this moment nothing at all gates what ships.
   - **What to do:** fix the billing. Then decide whether to pay for branch protection or use Vercel deployment checks instead.
6. **Email.**
   - **The problem:** `vallospaces.com` has no MX record, so `hello@` cannot receive mail, and a user who replies to a Vallo email reaches no one. There is also no DMARC record (OPS-06).
   - **What to do:**
     - Choose a mailbox provider (Google Workspace or Zoho) for `hello@` and `support@vallospaces.com`.
     - Add MX and a DMARC record (`p=none` first, then `quarantine`).
     - Set `EMAIL_REPLY_TO` in Vercel Production to `support@vallospaces.com`. It is **not set today** (founder's read of Vercel, 23 September). The code only uses it if it is set (`lib/email/client.ts:105`).
     - Set `NEXT_PUBLIC_SUPPORT_EMAIL` to the same address (also not set today).
7. **The support address spelling.**
   - **What I found:** the repository's guards protect the *with-s* spelling, in three test files only. The *no-s* spelling, which you say is the real private address, appears nowhere in the tree, in the full git history, in the database or on the live pages. So nothing is leaking today, but nothing would catch it either.
   - **The fix, in SEC-11:**
     - Replace the literal in the guard with a regex that matches both spellings, e.g. `/vallospaces?ltd@/i`, so the private address is never written into the repository even as a test string.
     - Widen the guard from three files to every file under `apps/web/src` and every email template.
   - **What only you can do:** confirm which spelling is real.
8. **An NDPC registration number** for `company.ts:76`, and a Data Protection Officer contact, for the privacy policy.
9. **Real supply before submission.** You need 10 to 20 real listings (STORE-11). Your own agent application, VL-AGT-10016, has been stuck at "needs more information" since 22 September, because that state has no way forward (SUP-05). Nobody can create a listing right now anyway (DB-03). Both are engineering fixes, but only you can recruit the listers.
10. **A LICENSE.**
    - **Where it stands:** no licence was added. The README says all rights are reserved until the company decides.
    - **For a private commercial codebase:** the usual choice is no open-source licence at all, with a short proprietary notice ("Copyright VALLO SPACES LTD. All rights reserved."), which I would recommend.
    - **If you ever intend to open any part of it:** say so, and we will pick one deliberately.

**Carried from your working list** (`docs/archive/FOUNDER_OPEN_ITEMS.md`, archived 23 September; only what is still open and not already above):
- **Rotate the Firebase service account key.** A private key for project `vallo-44059` was pasted into a working session on 23 September. Firebase console → Project settings → Service accounts → Generate new private key; then Google Cloud → IAM → Service accounts → the `firebase-adminsdk` account → Keys → delete the key whose id begins `79a7286`; then replace `FCM_SERVICE_ACCOUNT_JSON` in Vercel Production with the new file's contents and redeploy. Nothing has yet proved that the FCM credential authenticates; the first real push will.
- **Turn on Secure Email Change** (Supabase Dashboard → Authentication → Providers → Email). It does not forbid a change (the code does that), but with it on a stolen session alone cannot move an address.
- **Leaked password protection** needs the Supabase Pro plan; it is not a free toggle. It comes with the Pro upgrade in item 4.
- **Deleting an account frees its email address** for a new sign-up, which resets the one-person-one-mailbox link `account_identities` records. Decide whether that stays.

**Decisions only you can make.**
- **Sign in with Apple, or hide Google on iOS for v1?** I would ship Sign in with Apple. It is a day's work with Supabase, and it removes the argument permanently.
- **Open the catalogue to signed-out visitors?** Apple will very probably require it (STORE-P2-04). My view: yes, open it read-only. Keep `/u`, messages and exact addresses behind sign-in, and rate-limit anonymous reads.
- **Capacitor, or rebuild the iOS client natively?** My view: stay with Capacitor for v1 but do the whole STORE-04 list. Real push, share sheet, camera, haptics, an offline screen that is ours, and opening on the app rather than the marketing page together make a defensible 4.2 case. If Apple still refuses, *then* fund the native client, with the rejection letter in hand.
- **iPhone only for v1?** Yes (STORE-13).
- **Discriminatory listing language** (SEC-06):
  - Decide the policy wording.
  - Decide whether matches are hard-blocked or held for review. I would hold them for review, with the reason shown to the lister.
- **Who may open escrow, and who rules disputes?** Today one admin with a password can do both, can rule on their own dispute, and a ruling cannot be reversed (ESC-07, ESC-08). My view: super_admin only, two-person approval for rulings above a threshold, and an audit row on every change.
- **The "email can never change" rule.**
  - **Why it is not survivable as absolute:** a member who loses their email loses their wallet with it (SEC-15). In Nigeria, people lose phones, SIMs and Gmail accounts all the time.
  - **What I would do:** keep the rule for self-service, and add a staff-assisted recovery path with KYC re-verification against the NIN on file, a cooling-off period, and notice to the old address. Without that, the first customer who loses their Gmail with money in the wallet becomes a complaint to the regulator.

**What I would do if it were mine.** One week, in this order, and nothing new built until it is done:
1. **Day 1:**
   - The UX-24 revoke.
   - The DB-01 and DB-02 guard trigger.
   - The DB-03 listing insert and the `firm_members` recursion (SUP-P2-01).
   - The lockfile and GitHub billing.
   - Order the D-U-N-S.
2. **Days 2 to 3:** close the four money holes that arm themselves on the first real booking: ESC-02, ESC-01, ESC-P2-01 and MON-05. Add a database test harness (DOC-03), so every one of these fixes ships with a test that reads the live policy shape. Five of the nine incidents in this repository's history would recur today with every test green. That is the pattern to break.
3. **Days 4 to 5:**
   - The Supabase Pro upgrade.
   - A human-paging alert: a Slack or email hook that works when Vercel is down (OPS-03).
   - The privacy policy rewrite and the Anthropic disclosure (STORE-07, STORE-08).
4. **Then** the store list in section 3, part C.

**What worried me.**
- **The pattern repeated three times in one day.** DB-03, the listing blockage, is the third total supply outage that nobody could see because there is no real supply to fail. The only defence is a probe that performs the real insert shape against the live policies on every deploy. Today that probe does not exist; the equivalent is a script someone pastes in by hand.
- **Green lights that could not go red.** These are listed in each area:
  - The interface sweep's "no horizontal scroll" check could not fail, because the root is `overflow-x: clip`.
  - A money guard passes if its name appears in a comment.
  - The terminology ban tests an empty list.
  - `information_schema` reported that `anon` had *no* grants on `social_profiles`. `has_table_privilege` says it has SELECT. The view reports about the observer, exactly the blind light you warned about.
  - The reconciliation job cannot tell "no reply" from "aged out" (MON-13).
- **Fixes can be worse than the finding.** Three agents independently proposed the same fix for self-publishing. It would have stopped every admin decision on the platform, and only the adversarial pass caught it. Keep the two-pass rule for fixes too.
- **Two build sessions were pushing to `main` with CI dead.** Both have since closed (the last close-out was written at 22:25 UTC on 23 September). Until billing is restored and `main` is protected, every push still goes to production untested.

**What this audit means for the git history.** 945 of the 1,021 commits carry a `Co-Authored-By` trailer naming an AI model. No amount of file cleaning changes that. Removing them would mean rewriting every commit in history, which would invalidate every clone and every open branch. You have been told and have chosen to leave it. History was not rewritten.

**Where the fixing starts.** When you come back with instructions, section 3 is the order of work. Each finding's THE FIX is written so it can be implemented without rediscovering the problem. Re-verify each one against current `main` first: two sessions are changing the code under these findings as you read.
