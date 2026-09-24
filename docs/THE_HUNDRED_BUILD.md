# The Hundred: the build ledger

The running record of building `docs/THE_HUNDRED.md`. Every V-number, what shipped, the evidence it works, and its
state. Updated as work lands.

**States.** SHIPPED: built, adversarially reviewed by a second agent, and every gate green on the build branch.
PARTIAL: some of it shipped and the entry says which half. DEFERRED: not built, with the reason. FOUNDER: built to the
boundary and switched off, waiting on one of the sixteen founder decisions, with the one step that turns it on.
AUDIT: owned by the audit session and not touched here.

**Where it lives.** Branch `claude/vallo-hundred-recommendations-xclnva`. Database changes are migration files proven
against the live schema by a probe that ends in a deliberate raise (nothing persists); they apply when the branch
merges to `main`.

## Gates

| When | Tree | tsc | eslint | vitest | next build |
|---|---|---|---|---|---|
| 23 Sep 23:08 UTC, baseline | `0afb9b0` (origin/main `e1395cf` merged) | 0 errors | 0 errors, 333 warnings | 242 files, 3,859 passed, 1 skipped | green |
| 24 Sep 07:20 UTC, builders 1, 3, 4, 6 merged | `66568a3e` | 0 errors | 0 errors, 318 warnings | 292 files, 4,289 passed, 1 skipped | green (2m44s) |
| 24 Sep, builder 2 merged on top | `136c5aaa` (builder 2's own gates) | 0 errors | 0 errors | 311 files, 4,475 passed, 1 skipped | pending central build |

## Where it stands

- **Branch:** everything merged so far is on `claude/vallo-hundred-recommendations-xclnva`. Builders 1, 2, 3, 4 and 6 are merged; builder 5 is merging the integration into its branch now (its V-76 deletes `/inspections`, which four other builders extended).
- **main:** NOT yet pushed. The push to `main` was refused by the session's permission system; it needs the founder to allow `git push origin HEAD:main` or to merge the branch himself.
- **Smoke:** the merged build, served locally against the live database with none of the new migrations applied, rendered 32 member pages (home, search, map, listing, stays, saved, messages, inspections, bookings, wallet, profile, settings, devices, phone, notifications, price, verification, offline, standards, people, agent listings and analytics) with no error and no horizontal scroll at 390px. The features are therefore inert, not broken, until the migrations apply.
- **Migrations:** 48 new files, none applied. Each was proven against the live schema by a probe ending in a deliberate raise. Order matters: `20260924130000` (anon date grant) before or with the code; `20260924130300` (agent_trust without trust_score) and anything depending on it (`130800`) after the code is live; the rest in timestamp order.
- **Review:** every item below was written by one agent and attacked by another before merge. Items marked SHIPPED passed or passed with fixes that were then made; PARTIAL items name what is left.

## The ledger

| V | Title | Builder | State | What shipped | Evidence |
|---|---|---|---|---|---|
| V-01 | The catalogue canary | audit | AUDIT | Owned by the audit session. |  |
| V-02 | The claims rule becomes a build check | audit | AUDIT | Owned by the audit session. |  |
| V-03 | The proof strip | 3 | SHIPPED | ProofStrip on card (compact) and listing page (full); only dated facts, null renders nothing, examples get none; anon grant of the two supply dates. | proof-strip.test.ts (18), proof-read.test.ts (9); PROBE_OK V-03; review PASS WITH FIXES, fixes verified in round 2 |
| V-04 | The account-number moment | 3 | SHIPPED | Receiver-side NUBAN check (match / no match only, last four + boolean stored, rate-limited, fails closed) plus the real charge offer in the thread card. | account-check (15), account-moment (11), charge-offer (5), name-match (24); PROBE_OK V-04; round-2 review PASS |
| V-05 | Four truth questions close every inspection | 3 | FOUNDER | Truth answers, auto-report on money asked outside, distinct-renter counts at n>=5, frozen agreed slot; public count and autopause behind truth_public_count / truth_autopause (off until V-35 attendance and V-50 phones). | truth.test.ts; PROBE_OK V-05 fixes; round-2 review: one MAJOR (slot freeze on PROPOSED->CONFIRMED) being fixed |
| V-06 | No paid placement, ever | 3 | SHIPPED | Nothing orders on featured (a CHECK forbids setting it); Recommended is a published formula on /standards#ranking from the same constants; the column drop is handed to the audit. | ranking.test.ts; PROBE_OK V-06 (audit's live bounds functions still run); round-2 review PASS |
| V-07 | The share door | 2 | SHIPPED | /s/[token] public card and OG image, same for humans and unfurlers; title composed from facts, area from the closed list, never lister free text; stay door; counter server-only. | door.test.ts, public-text cases; PROBE_OK v07 / rule ten; round-3 review running |
| V-08 | The code on the gate | 2 | FOUNDER | TO LET board (square PNG, A3 print) with the VL- code, no phone, no address; code resolves to the door only with the flag on. | board.test.ts; flag listing_board; waits on founder question 12 |
| V-09 | Paste your broadcast | 2 | SHIPPED | Deterministic reader fills only draftInputSchema fields, kobo server-side, contacts stripped after normalisation, per-field Looks right kept on the server; optional model pass behind broadcast_model. | broadcast.test.ts (incl. reviewer cases); round-3 review running |
| V-10 | The demand board | 2 | SHIPPED | Searches recorded server-side by cell (closed-list area), k counts distinct people via salted weekly hash, approved agents only, completed weeks. | cell.test.ts, words.test.ts; PROBE_OK v10; round-3 review running |
| V-11 | The app never opens on the website | 2 | PARTIAL | ValloShell user agent, proxy sends the shell's / to /home-or-landing?app=1, site chrome hidden in the shell. Offline shell half (@capacitor/network) is the audit's package.json. Takes effect in a new binary. | shell.test.ts, proxy tests |
| V-12 | Every fee as a share of the rent | 3 | SHIPPED | Each fee in integer basis points of a year's rent, total only when all three declared, Lagos rule as a sourced fact, Lowest fees sort. | fee-share.test.ts; round-2 PASS |
| V-13 | The quote is binding | 4 | SHIPPED | move_in_quotes frozen at CONFIRMED; open_rent_charge = live body + quote branch (VQ013 guard fails closed); unexplained remainder line and publish gate. | ledger.test.ts, remainder gate; PROBE_OK V-13 (body equals live incl. ESC-03); review PASS |
| V-14 | Is it still available? in one tap | 2 | PARTIAL | One-tap ask and one-tap answer in the thread; no re-ask after a recent let. Closing on Let is V-48. | check.test.ts; PROBE_OK v14 |
| V-15 | New-match alerts in minutes | 2 | SHIPPED | Publish queues a match job; every 5 minutes (not at :40), 3 a Lagos day, rest in the digest. | instant-alerts.test.ts; PROBE_OK v15 |
| V-16 | Run the server beside the database | 6 | FOUNDER | Not changed. Add "regions": ["dub1"] under $schema in apps/web/vercel.json once Paystack and Yellow Card are confirmed not to allowlist US egress (founder question 15). |  |
| V-17 | Error screens tell the truth | audit | AUDIT | Owned by the audit session. |  |
| V-18 | Arrivals skip the slides | 5 | PARTIAL | First run opens on the account choice naming the destination; sign-in never shows the carousel; first-interest cookie. The 404 half is audit OPS-17; post-signup redirect is audit UX-02. | plan.test.ts, wall-heading.test.ts; review PASS WITH FIXES, fixed |
| V-19 | A new sign-in buzzes the phone | 6 | PARTIAL | New-device notification and push, 'This was not me' ends other sessions and writes the audit's account_money_holds (reason not_me); devices grouped per type; UA forwarded without versions. /reset-password without the current password is the audit's. | account-hold, session-groups, policy tests; PROBE_OK V-19b |
| V-20 | Stays cancellation visible and frozen | 4 | SHIPPED | Refundability under the total, cancelStanding compares with now, cheapest refundable Book now, terms frozen at payment in a side table. | cancellation.test.ts, book-now-choice.test.ts; PROBE_OK V-20; review PASS WITH FIXES, fixed |
| V-21 | Delete the trust score | 3 | SHIPPED | agent_trust without trust_score; the cell and key removed. Migration must apply AFTER the code. | no-trust-score.test.ts; PROBE_OK V-21 |
| V-22 | Listed N days ago and Newest | 5 | SHIPPED | Lagos-day age on card and page, never on examples; Newest ordered in the read; first publish date kept. | listed-age.test.ts |
| V-23 | The thread names the person | 3 | SHIPPED | Person line from thread_counterpart_facts, parties only, null renders nothing. | PROBE_OK V-23; fix for date source in progress |
| V-24 | Money dates and measured refunds | 4 | PARTIAL | Weekday dates; refund_requests with DB-stamped due_by, decisions answer the clock, hourly alert. Send-page line is audit MON-15; escrow release dates and the ISO lint not built. | business-days (12), dates (7); PROBE_OK V-24 ask |
| V-25 | The pay panel knows the amount is large | 4 | SHIPPED | Bank transfer leads above ₦500,000; wallet hidden only when it cannot cover and exceeds the move ceiling. | large-payment.test.ts |
| V-26 | Delete /rent as a second shelf | 5 | SHIPPED | /rent 308 to /search?market=rent keeping the query; one tenancy predicate. | rent-market.test.ts |
| V-27 | Delete the Guardian badge | 5 | SHIPPED | Badge, award trigger and function removed. | PROBE_OK V-27 |
| V-28 | Compound facts | 5 | SHIPPED | Five optional compound answers in the wizard, 'Lister says' on page and card, strict filters. | compound.test.ts; PROBE_OK V-28 |
| V-29 | List another like this | 2 | SHIPPED | 1 to 20 draft copies in one call, honest count. | duplicate.test.ts |
| V-30 | Haptics and one feedback grammar | 6 | PARTIAL | feedback(kind) with five kinds; Button no longer buzzes by default. @capacitor/haptics dependency is the audit's pipeline. | feedback.test.ts |
| V-31 | The owner confirms vacancy | 1 | FOUNDER | Consent capture live on the mandate desk; fortnightly/weekly-capped question, reply door, inbound, 21-day Not reconfirmed; owner in-app heartbeat. Behind landlord_line (founder question 2). | loop.test.ts (whole loop with the stub); PROBE_OK chain 110000-110400; round-3 fixes in progress |
| V-32 | The landlord countersigns the rent | 1 | FOUNDER | Paid rent charge queues the landlord question with the frozen figures; tenant sees a dated fact. Behind landlord_line. | PROBE_OK rent half |
| V-33 | Rent never rests at Vallo | audit | AUDIT | Owned by the audit session. |  |
| V-34 | The Vallo Record | 3 | SHIPPED | Counted, dated facts with denominators (n>=5), VR- record code and /record/[code]; shadow enquiries and self-reported checks excluded; doors rate limited, never answer for a stopped lister. | PROBE_OK V-34 (3 probes); record.test.ts 13 tests; reviews rv3, rv3b PASS |
| V-35 | The gate handshake and the offline pack | 6 | PARTIAL | Per-inspection TOTP seed, offline match, delegates only after acceptance, per-account packs, area not title. QR, photos, offline checklist, 18:00 refresh not built. | totp (14), pack (9); PROBE_OK V-35b |
| V-36 | The caution register | 4 | SHIPPED | Caution obligations, itemised deductions, key-bound return (a retry answers already_returned), clamp at 100%, lister record counts overdue and excludes examples; money lock wiring on caution return. | zz_probe_rv4_a4_money_doors; review of 69c7fa4c..8e372b87 PASS |
| V-37 | One flat, one page | 1 | SHIPPED | Properties keyed on the HMAC of approved-mandate principals, reviewer match panel, offers side by side, search collapse. | PROBE_OK; collapse representative fix in progress |
| V-38 | The flat remembers | 4 | SHIPPED | Relist from the let flat; last-let line hidden when the successor differs in state, area, type or bedrooms; softened exit copy. | review c7a6967d PASS |
| V-39 | Price Check learns what people paid | 4 | SHIPPED | area_paid_summary at >=5 tenancies from >=3 listers, fixed window, banded count, rounded. | paid-prices.test.ts; PROBE_OK V-39 |
| V-40 | The outbox | 6 | PARTIAL | Offline outbox for saves, messages, inspection requests, reviews and new posts, bound to the tapping user, idempotent by a 120s lease and a 3-day kept answer; payment references resolved on reconnect. Not built: replies and posts with pictures, bell dot. | PROBE_OK lease/keep; replay-guard.test, outbox.test; review d5261d41 MERGE-READY |
| V-41 | The neighbours' account | 5 | FOUNDER | Neighbours account behind flag neighbours_account: area pulses, flood answer, No flooding reported filter (positive evidence only). Not built: push delivery, private note to contradicted lister. | PROBE_OK V-41 flag off/on; pulse.test; review d5f37826 PASS. On: update public.feature_flags set enabled = true where key = 'neighbours_account'; |
| V-42 | The owner's buildings | 1 | PARTIAL | /agent/portfolio, invitations to verified agents in the place, pitches, award. Award does not write a mandate yet. | PROBE_OK V-42; review pending |
| V-43 | Commute by the clock | 5 | FOUNDER | Commute by the clock behind flag commute_by_the_clock: residents report (one per member median, n>=5), guide bands, card line, Location section, drawer count. Needs the route guide and landmark seed written by a person. | PROBE_OK V-43 per-member; commute.test; review 9872f58d. On: update public.feature_flags set enabled = true where key = 'commute_by_the_clock'; |
| V-44 | A licensed lender pays the frozen charge | - | DEFERRED | Needs a licensed lending partner with an embedded API; not started. |  |
| V-45 | Taken in Vallo | 3 | PARTIAL | 64-bit photo hashes (service role), staff-only matches across listers and rejected listings, coverage line and bounded backfill. In-app camera deferred (needs @capacitor/camera). | PROBE_OK V-45 hashes and coverage; dhash.test, hash-server.test |
| V-46 | The money map | 4 | PARTIAL | Captions name a landlord only with a dated staff check; 'all goes to the agent's account' withheld until V-33. | money-map.test.ts |
| V-47 | The tenancy file | 4 | SHIPPED | /tenancy/[id] file, pin control scoped to the one tenant-lister-listing thread, retention six years. | pin probe PASS (all refusals 42501) |
| V-48 | Let is an event | 1 | SHIPPED | Close with a reason; let cascades only with payment proof or the same approved principal; closed stays closed; staff reopen with audit. | PROBE_OK (no resurrection, key-scoped cascade) |
| V-49 | vNIN identity and payout-name matching | 3 | FOUNDER | Stub provider behind vnin_identity (founder question 4); name matcher live as a desk suggestion. No liveness capture. | name-match (24); PROBE_OK V-49 |
| V-50 | The phone is the scarcity anchor | 3 | FOUNDER | OTP with hashed codes, one phone per account, gates at three moments, behind phone_confirmation (founder question 7). | PROBE_OK V-50 |
| V-51 | CI that runs what exists | 6 | PARTIAL | scripts/check-migrations.mjs and the smoke-tier runner; the workflow file is the audit's pipeline (CI is dead). | check-migrations.test.ts, spec-runner.test.ts |
| V-52 | A store readiness desk | 2 | SHIPPED | Store tab: eight live checks and a manual step, nightly run. | readiness.test.ts (20); PROBE_OK v52 |
| V-53 | Native push through Vallo's drain | 6 | PARTIAL | Tap listener, same-origin hrefs, one button per notification on web push; APNs behind native_push_apns (Apple account). | push tests |
| V-54 | Inspection report stages | 4 | SHIPPED | Tenancy move-in and move-out reports, 8-tick submit, countersign, private evidence bucket (authenticated-only policies). | PROBE_OK; storage blocker fixed |
| V-55 | A verifiable receipt | 4 | SHIPPED | Receipts verifiable at /r by hashed code, service-role RPC with hashed IP, public place from closed lists, lister shown as first name and initial with contact-shaped words dropped. | public-place-model.test; review 97c7b94a |
| V-56 | Held agency fee by default | 4 | FOUNDER | To be built to the boundary behind a flag (founder question 9). |  |
| V-57 | Nothing at the door | 4 | PARTIAL | Hosts declare five arrival charges; frozen per booking at payment (append-only, delete-guarded); At the door line on stays only; guest report after check-in with alerts at 3 in 90 days; publish refused until declared. Not built: confirmation email line (audit-named), support ticket (needs name/email). | zz_probe_v57_a4_frozen, zz_probe_a4_review4 |
| V-58 | The collusion graph | 3 | PARTIAL | Mailbox, phone, card, bank keys (device removed as a user-agent hash); fix round in progress. | PROBE_OK V-58 |
| V-59 | The rental review asks about the door | 3 | SHIPPED | Tenant only, 30 days after move-in, door question first, alert at two distinct yes, public count at 5+. | PROBE_OK V-59 |
| V-60 | Scam-exposure recall | 3 | SHIPPED | Recall only on an upheld scam or pay-outside report tied to this stop by p_report; desk shows the report; audience from real contacts; wording never names the account. | PROBE_OK V-60; recall.test |
| V-61 | Is this a Vallo agent? | 1 | SHIPPED | /check with VA- codes and phone; per-address and platform miss budgets reserved before lookup, refunded to the reserved window, fail closed; limited reveals nothing. | agent-check-actions.test 4 tests; review r4 PASS |
| V-62 | Going to an inspection alone | 1 | SHIPPED | /safe/[token] trusted-contact page, controls for every live share, WITHDRAWN quiet, COMPLETED live, MOVED not overdue, no names on the page. | PROBE_OK fourth review; review 8cfc5658 PASS |
| V-63 | I feel unsafe | 3 | SHIPPED | I feel unsafe sheet (112, leave and block, tell Vallo); safety hold scoped to the filer, lapses at 72h, cleared or extended on the queue held lane; refusal identical to RLS. Known limit recorded in the migration. | PROBE_OK V-63 indistinct; unsafe.test |
| V-64 | Supplier trust page; member page shrinks | 5 | PARTIAL | Occupation and home town opt-in per field; people-search leak being closed; supplier page deferred to V-34/V-49/V-87 data. | PROBE_OK V-64 |
| V-65 | Cash in hand | 5 | PARTIAL | Budget on the cash at the door, upfront line and filter; the charge taking the demanded months is audit money work. | upfront.test.ts (17) |
| V-66 | Search in the words Nigerians use | 5 | PARTIAL | Unit shapes, en-suite, BQ, shorthand reader; tokeniser fixes in progress. | query-parse (23), unit-shape (10); PROBE_OK V-66 |
| V-67 | Side-true property search | 5 | SHIPPED | Stays out of the property shelf, redirects to Stays, Instant book and Top rated removed, ceilings per market. | property-side.test.ts |
| V-68 | Serviced, defined | 5 | PARTIAL | Covers, reconciled, estate type, derived is_serviced; must also require a stated service charge (fix in progress). | service.test.ts; PROBE_OK V-68 |
| V-69 | Show me | 5 | FOUNDER | Show me behind flag show_me: renter asks for clips, lister uploads (30s, 25 MB, private bucket), data saver waits for a tap and states only the stored size; examples refused. | PROBE_OK V-69 real storage inserts. On: update public.feature_flags set enabled = true where key = 'show_me'; |
| V-70 | The shot list | 4 | PARTIAL | Photo slot labels, shot list in the wizard, Photographed line on listing and search cards (only while claimed, never on examples). Not built: submit gate and gallery deep link (audit-named). | zz_probe; photographed test |
| V-71 | The Status kit | 2 | SHIPPED | 1080x1920 Status image, per-listing first touch, attribution to the lister's own door, cached route. | first-touch.test.ts; PROBE_OK v71 |
| V-72 | The enquiry desk | 2 | SHIPPED | Stages from New to Let or Lost with reason, auto-advanced by events. In review. | migration 121100 |
| V-73 | Per-listing funnel | 5 | SHIPPED | Per-listing funnel at k>=5 peers, salted daily hashes, prefetches and staff not counted, 300/day cap. | prefetch.test; funnel.test; PROBE_OK V-73 |
| V-74 | Pricing guidance in the wizard | 2 | SHIPPED | Area's usual fees beside the fee lines, refusal when thin. In review. | migration 121200 |
| V-75 | One word: workspace | 5 | PARTIAL | One noun, one chooser, dock centre; glyph and caption fixes in progress. | workspace-terms.test.ts |
| V-76 | Plans: one dated list | 5 | SHIPPED | /bookings is Plans; /inspections, /trips redirect; only ?from= moves the shell. | side-paths.test |
| V-77 | The shortlist works on the bus | 6 | PARTIAL | IndexedDB shelf with owner key, offline compare; no photos, no SW routing of /saved. | shelf.test.ts |
| V-78 | The data diet | 6 | SHIPPED | SW asset cache key without dpl, naira font subset (1.2 KB), wordmark at drawn size, image widths, AVIF/WebP, TTLs. | sw-cache.test.ts |
| V-79 | A data saver people can find | 6 | PARTIAL | Switch at the top of Settings and first run, server honours the vallo_lite cookie, meter in MB. | lite-cookie, data-meter tests |
| V-80 | Weight budget and field vitals | 6 | PARTIAL | web_vitals_samples, /api/vitals, /admin/field-speed; budgets null until recorded; CI wiring is the audit's. | PROBE_OK V-80 |
| V-81 | Face ID and fingerprint on money | 6 | PARTIAL | WebAuthn money lock checked on the server, each proof bound to one action digest; gates on withdraw, send, wallet pay, held payments, bank and payout accounts, caution and share returns; emailed-code fallback. Not built: native Face ID plugin, app-switcher blur. | money-step-up.test, money-intent.test, webauthn.test; review PASS |
| V-82 | Area price pages | 2 | SHIPPED | /areas/[state]/[area] only for closed-list areas with 5 real listings; zero pages today by design; noindex soft 404. | pages.test.ts (11); PROBE_OK v82 |
| V-83 | Crypto out of the shipped app | 6 | SHIPPED | 2,959 lines removed; parked on branch claude/parked-crypto-deferred; Yellow Card top-up kept. The 204 preview routes are the audit's cleanup. |  |
| V-84 | The wallet leads with what money is for | 4 | PARTIAL | Coming up strip from cautions, accepted shares, renewals and held payments; WalletDeck changes are audit-named. | upcoming-model.test |
| V-85 | The tribunal pack | 4 | SHIPPED | Printable complaint pack and caution demand letter from the record, no lister free text (place from closed lists, name as first and initial, pins only when ticked). | letter.test; review 97c7b94a |
| V-86 | Split the move-in between flatmates | 4 | SHIPPED | Rent shares are invitations accepted or declined, rate limited, paid only while payable, returnable in one tap when the charge goes void. | zz_probe_rv4_a4_money_doors |
| V-87 | LASRERA, ESVARBON, CAC as dated credentials | 3 | PARTIAL | Staff-recorded dated credentials; CAC director wording fix in progress. | PROBE_OK V-87 |
| V-88 | One desk: queue lanes | 5 | SHIPPED | Reports, Flags and Held are lanes of /admin/queue; old pages redirect. | merge reviews PASS |
| V-89 | The queue becomes a desk | 6 | SHIPPED | Queue desk: claims, due order, weighted reports, lanes, bulk with audit rows, saved views, reporters can withdraw. Deviations: no j/k keys; spam classified at read. | queue-desk.test; PROBE_OK |
| V-90 | The person file and the ban that follows the person | 1 | PARTIAL | /admin/people/[id] with timeline and HMAC-linked accounts; super_admin-only fraud uphold; deny-list checks. | PROBE_OK V-90; review pending |
| V-91 | Arrival check and host payout | 1 | PARTIAL | Arrival check: Is it as listed? in the window, photos in a private bucket, ticket, refund ask and high alert; staff ruling on the check. Host payout at check-in plus 24h is the audit's (private.arrival_report_open provided). | PROBE_OK V-91 and follow-ups |
| V-92 | Shortlet caution hold | 4 | FOUNDER | To be built to the boundary behind a flag (founder question 8). |  |
| V-93 | The renewal clock | 4 | PARTIAL | Renewal clock with offers, notices on first offer or change at most daily, per-viewer copy. Paying the renewal needs the audit's charge schema. | review PASS |
| V-94 | Viewing windows and the Saturday route | 2 | PARTIAL | Viewing windows, slot booking under an advisory lock, group viewings allowed, Saturday route, running-late. Not built: back-to-back homes. | PROBE_OK v94 review |
| V-95 | The brief | 2 | SHIPPED | Renter briefs answered only with matching listings by verified listers, three answers, rate limited. | PROBE_OK V-95 |
| V-96 | WhatsApp is a doorbell | 6 | FOUNDER | WhatsApp doorbell: five events, one link each, flag whatsapp_doorbell, opt-in, confirmed phone, quiet hours, signed inbound with dedupe. Needs number, Meta credentials, template approval. | PROBE_OK; whatsapp.test, drain and inbound tests. On: update public.feature_flags set enabled = true where key = 'whatsapp_doorbell'; |
| V-97 | One state kit and one voice | 3 | PARTIAL | State kit (State.tsx), voice rules and sweep, VOICE.md, 404 copy; owed lines down to 3 (wallet, audit-owned). Remaining: SystemMoment and loading files. | voice.test; state-sweep |
| V-98 | Next up widget | 6 | PARTIAL | /api/plans/next with hashed 90-day tokens revoked on deletion, holds and end_other_sessions; area-only answer. Native Glance and WidgetKit deferred (no SDK here). | PROBE_OK V-98; route.test |
| V-99 | The firm desk | 2 | PARTIAL | Firm desk with routing recorded on each enquiry (no access widened), team counts. Coordinator role blocked on the audit's admit_firm_member. | PROBE_OK V-99 |
| V-100 | The renter passport | 3 | SHIPPED | Opt-in renter passport shown per thread: phone confirmed, NIMC match date, inspections attended (both phones, no shadows), tenancies paid. | PROBE_OK V-100; passport.test |
