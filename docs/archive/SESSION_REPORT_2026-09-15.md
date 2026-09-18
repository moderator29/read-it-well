# Session report, 15 September 2026

Two tracks, run at the same time from the first hour. Track A was the identity,
asset and legal work and the lead session owned it. Track B was three agents,
never more, producing the recommendation mission.

**This file is the answer to "where are we". It is not a summary of the three
agent reports, which are in `docs/audit/` and are longer and more specific. It
is what the lead established, what it changed, what it got wrong, and what it
did not do.**

---

## 1. The answer first

**Vallo is a well-engineered platform that cannot yet complete its own core
transaction, and until today its terms of service promised a service it has
never performed.**

The engineering underneath is genuinely strong: RLS on every table with the
planner-friendly subquery form, SECURITY DEFINER functions in a private schema,
database-enforced idempotency, a locking settlement function that writes six
things atomically, a real escrow state machine. The database rates higher than
anything else in this audit and it deserves to.

What is not there is the loop on top of it. **Renting cannot be paid for at
all**: `lib/bookings/actions.ts` refuses a rental at two call sites and tells
the person to message the agent instead. **Buying and selling have a schema and
no screen.** And for 37 days **no administrator could approve a verification
document**, which means no agent could be verified, which means the supply side
of a marketplace with zero agents and zero listings could not start. That last
one is fixed in this session.

The gap between the quality of the parts and the state of the whole is the
single most important thing in this report.

---

## 2. What was pushed

Nine commits on `claude/zealous-brown-gn45mg`, each verified before it was made.

| Commit | What |
| --- | --- |
| `25dd658`..`68818dc` | Five commits cherry-picked from the previous session's branch: both handoffs, `BRAND_MARKS.md`, `RETENTION_SCHEDULE.md`, `legal/company.ts` and the controller identity correction |
| `4916cbd` | `docs/BRANCH_AUDIT.md`, every head SHA recorded before anything was attempted |
| `8a9ea32` | The name sweep, 242 files. RentMe and NaijaFinds out of every user-visible string |
| `a8e427e` | The Vallo logo, the four assets derived from it, both icon build scripts, every reference moved |
| `b522a55` | The domain out of twenty literals and into one constant |
| `6bff98c` | The npm scope becomes `@vallo`, on its own, 200 files |
| `6bc1742` | The terms stop promising escrow. Plus the missing clauses, a migration, and six corrupted historical records restored |
| `60b8fcf` | `docs/IMAGERY.md`, the scene manifest wiring, and the two dead admin actions |
| `c30ba86` | The three Track B reports |
| `1ebe837` | The branch audit corrected: the deletes were refused |
| `2ee803c` | The pending money inventory, and a declined payment stops being cyan |

**Every commit was verified before it was made**: `npm run typecheck`,
`npm run test` (44 files, 1,415 tests) and `npm run build`, with `npm run lint`
compared against the baseline each time.

### The baseline, recorded before anything changed

| Check | Result |
| --- | --- |
| `npm run typecheck` | **Passes**, all three workspaces |
| `npm run test` | **Passes**, 44 files, 1,415 tests |
| `npm run build` | **Passes** |
| `npm run lint` | **FAILS. 1,953 problems: 54 errors, 1,899 warnings** |

The lint failure is pre-existing and was not caused by this session. 1,872 of
the warnings are `nf/no-raw-spacing`. The 54 errors sit in 12 files, 51 of them
raw Tailwind spacing steps, 2 layer-1 palette tokens in a component and 1 raw
`rgb()`.

**Lint ended this session at exactly 1,953 problems and 54 errors.** That number
was checked after every single commit. Nothing was made worse and nothing was
quietly fixed to make a number look better.

---

## 3. What I got wrong, and corrected

Stated first rather than buried, because the handoff asks for it and because two
of these would have cost the next session real time.

**The brief says escrow is zero percent built. It is not.** Both
`HANDOFF_02` section 2 and `PRODUCT.md` state there is no escrow table and no
state machine. `public.escrows` exists, with an eight-state machine enforced by
a database trigger rather than only in TypeScript, four escrow purposes, an
audit trigger, an hourly timeout sweep, a locking settle function and an admin
resolution RPC behind `/admin/escrow`. The backend agent reached the same
conclusion independently from the other direction. What is true is narrower and
worse: **nothing routes a guest's payment into any of it.**

**My own brand sweep corrupted six historical records** by replacing a dead name
inside a sentence that was explicitly about the dead name. `PRODUCT.md` section 1
became "The product was Vallo. It is Vallo. The parts of Vallo that survive",
a tautology where a three-name history had been. `support-email.ts` came to say
the module used to hand out the address it hands out now. All six were found by
diffing against the pre-sweep tree rather than by reading, and restored. An
agent independently flagged the `PRODUCT.md` one, which is the reason to run
agents in parallel rather than after.

**I wrote a script to find other broken RPC call sites and it was wrong on three
of four findings.** It flagged `p_limit`, `decision_note` and `p_days` as
undeclared arguments. All three exist as optional parameters with defaults that
the generated `Args` block does not list. The script was thrown away rather than
committed, because a checker with that false positive rate teaches people to
ignore it. Only the two cases verified directly against the migration were acted
on.

**I misread a logo crop as clipped.** The first mark crop was judged to be
cutting the swoosh and it was not: the margins were tight, not clipping. The
correction is recorded in the commit rather than silently fixed.

**I wrote a UiIcon name that does not exist.** `alert` is not in the 60-glyph
set. Caught before commit and replaced with `close`, which is.

---

## 4. The twenty-five ratings

Out of 100, against a shipped competitor a Nigerian user could open today, not
against the last version of this platform. **A dimension is capped by its worst
user-visible failure.** Where a number comes from an agent it is marked, because
the agent that produced it saw more of that area than the lead did.

There was no prior written baseline. **This is the baseline.**

| # | Dimension | Score | The evidence, and the failure that caps it |
| ---: | --- | ---: | --- |
| 1 | Overall product readiness | **34** | A1. Renting cannot be paid for, selling has no screen, the catalogue is empty. Raised from A1's 31 only because the KYC blocker is now fixed |
| 2 | Frontend | **74** | A3. 183 components, 1,192 lines of tokens, real craft. Capped by a 1,343KB background painted on all 97 pages |
| 3 | UX | **54** | A1. Capped by the rent path ending at "message the agent" with no next step |
| 4 | UI | **68** | A3. Capped by `MomentScreen` having no failure variant, so nine failure surfaces paint the pending colour |
| 5 | Visual design | **76** | A3. The highest craft score here and it is deserved. Capped by two images covering eight scene types |
| 6 | Branding | **82** | Lead, re-rated after Track A. A3 scored 55 before it landed. Dead names gone from every user-visible string, new logo everywhere, one domain constant. Capped by the RentMe tagline still shipping and no ink variant |
| 7 | Backend | **72** | A2. Capped by two admin RPCs that were dead for 37 days and nothing detecting it |
| 8 | Database | **84** | A2. The strongest dimension. RLS everywhere, private schema, database-enforced idempotency, atomic settlement. Capped by nothing reading `cron.job_run_details` |
| 9 | Security | **68** | A2. Headers are genuinely strong. Capped by a stolen session being a permanent account takeover |
| 10 | Privacy | **41** | A2. Capped by bank account numbers written in plain text into `message_flags.matched` and retained indefinitely |
| 11 | Authentication | **62** | A2. Capped by `/reset-password` gating on "is there any session" rather than on a recovery factor |
| 12 | Performance | **55** | Lead, reconciling A2's 66 for the backend with A3's 52 for the client. The client number governs: the user meets it first |
| 13 | Accessibility | **58** | A1's floor, not A3's 61, because a dimension takes its worst measurement. Neither agent ran axe or a screen reader |
| 14 | Reliability | **58** | A2. Capped by nothing alerting on a failed cron job or a webhook log line |
| 15 | Scalability | **54** | A2. Capped by query patterns that are fine at 0 listings and untested at 10,000 |
| 16 | Admin panel | **61** | A2. 14 destinations and an audit log. Capped by the two dead actions, which is operations failing silently |
| 17 | Messaging | **45** | Lead, reconciling A1's 38 for the product with A3's 72 for the presentation. The trust trigger is the feature and it is built; the product around it is thin |
| 18 | Wallet and financial architecture | **76** | A2. Integer kobo throughout, a balanced ledger, locked rows. Capped by checkout having no pending state |
| 19 | Property and listing experience | **52** | Lead, reconciling A1's 47 with A3's 70. Discovery governs, because that is where a visitor arrives |
| 20 | Integrations | **64** | A2. Paystack has a 15-second timeout and the webhook now answers 503 rather than 200. Capped by no alerting |
| 21 | Legal and compliance readiness | **38** | Lead. The notice now names the right controller and the terms no longer promise escrow. Capped by NDPC registration not filed, no RC number, and a retention schedule nothing enforces |
| 22 | Production readiness | **44** | A2. Capped by there being no `.github/`, so nothing runs any check automatically and Vercel deploys from `main` |
| 23 | Differentiation | **44** | A1. First-party inventory and the trust ladder are real differentiators. Capped by none of them being reachable in a completed transaction |
| 24 | User retention potential | **26** | A1, and the lowest score in this audit. Nothing yet gives a Nigerian renter a reason to open this a second time |
| 25 | Overall Vallo standard | **48** | Lead, below A3's 64. A3 rated the surface it audited. The standard is "a product people would be surprised was built by a small team", and a product whose primary market cannot transact does not meet it |

**Mean 57.9.** The spread matters more than the mean: Database at 84 and
retention at 26 are the same product.

---

## 5. The recommendation count

**481 against a target of at least 400**, in `docs/audit/`. None padded, and all
three agents were told that inventing filler to reach a number was the one way
to fail outright.

| Priority | Count |
| --- | ---: |
| Critical | 30 |
| High | 166 |
| Medium | 228 |
| Nice-to-have | 54 |
| Future | 3 |
| **Total** | **481** |

| Report | Lines | Entries |
| --- | ---: | ---: |
| `AGENT1_RESEARCH_PRODUCT_UX_GROWTH.md` | 2,196 | 152 |
| `AGENT2_ENGINEERING_BACKEND_DB_SECURITY.md` | 3,665 | 157 |
| `AGENT3_FRONTEND_DESIGN_MOTION_QA.md` | 2,942 | 172 |

`RECOMMENDATIONS.md` and its 177 existing entries are untouched, not renumbered
and not discarded, as section 8 requires.

### Three corrections to the brief that came out of Track B

- **N-1 is DONE.** Signed-out browsing works. What remains is narrower:
  `lib/site/gated-href.ts` still wraps 21 links in a registration redirect on a
  premise its own comment states is stale, and 16 of those are now public.
- **W-1's dangerous half is fixed.** The webhook answers 503 and retries rather
  than answering 200 and losing the funding. Nothing alerts on the log line.
- **E-1 is substantially wrong**, as section 3 above sets out.

---

## 6. What is broken

In the order I would fix it.

1. **Renting cannot be paid for.** `RENTAL_MESSAGE` at two call sites. The
   company is named after this market. Because a review needs a CONFIRMED
   booking with a past checkout, no renter can leave a review either.
2. **Two admin actions were dead for 37 days.** Fixed this session. Migration
   `20260809054243` gave the public wrappers one argument fewer on purpose and
   neither call site was updated. PostgREST resolves by argument name, so both
   returned PGRST202 and both actions answered "service down". No agent could be
   verified.
3. **A stolen session is a permanent account takeover.** `/reset-password` gates
   on "is there any session", not on a recovery factor, and `updatePassword`
   revokes no other session. `end_other_sessions` exists and is not called.
4. **A declined payment was painted the pending colour.** Fixed this session.
5. **Bank account numbers in plain text.** `private.scan_message()` writes a
   ten-digit match into `message_flags.matched` and retains it indefinitely,
   and the admin view then loads up to 400 full message bodies with no audit row.
6. **Account deletion cannot complete** for anyone who has had a wallet, a
   booking or an escrow, and it orphans identity documents in storage while
   destroying the row that recorded whose they were.
7. **"Hide my activity" is read by nothing.** Four references, all in the schema
   file. The copy promises to keep reviews and stays off a public profile.
8. **The in-app "Reduce motion" setting is wired to nothing.** Zero CSS rules
   read the attribute it writes.

---

## 7. What is risky

- **The terms promised escrow until today.** That is the most serious thing this
  session found, and it was in a binding contract rather than marketing copy.
  The same sentence was live in the support bot, two welcome emails and the
  terms page OpenGraph description. All are fixed. **Holding client funds is CBN
  regulated and the corporate objects clause deliberately omits every payment
  and escrow word**, so restoring any holding promise needs a legal answer as
  well as a flow.
- **Nothing runs any check automatically.** There is no `.github/`, Vercel
  deploys from `main`, and this session's baseline found lint already failing.
- **Nothing reads `cron.job_run_details`.** Eight jobs, no alerting, and all
  schedules are UTC while Lagos is UTC+1.
- **The generated database types are not regenerated by anything**, which is how
  the two dead RPCs survived 37 days with a passing typecheck.
- **`vallo.ng` is a placeholder.** Nobody confirmed it is registered. It is in
  one constant so confirming it is a one line change.

---

## 8. What should be removed

- The Google and Apple OAuth code, per the standing decision. `RECOMMENDATIONS` N-4.
- `NativeRuntime.tsx`, defined and mounted in no layout. Confirmed twice.
- The four `*.tmp.mjs` scratch files at the repository root. Confirmed, and not
  removed this session because they are outside Track A's scope and deleting
  files nobody asked about is not a brand sweep.
- The 21 stale gated links in `lib/site/gated-href.ts`.
- **Not the escrow RPCs.** They were re-verified and the earlier suggestion to
  revoke them is refuted on both halves: they are `service_role` only and the
  feature exists. **Do not revoke.**

---

## 9. What takes Vallo from here to 100

In order, and the first is worth more than the rest combined.

1. **Close the rent loop.** Message, inspect, then pay, with the pay step
   actually existing. Add `COMPLETED` to `booking_status` so something can be
   released against. This is the product.
2. **Build the sale market**, which has a schema and no screen, on a platform
   meant to sell.
3. **One `ResultSheet`, used everywhere.** There are nine bespoke success
   surfaces and no shared confirmation component. Section 7 of
   `docs/BRAND_MARKS.md` is the pending inventory and section 7 of Agent 3's
   report is the full specification.
4. **Fix the privacy defects**, which are engineering and not paperwork:
   redact the flagged account numbers, make deletion complete, enforce the
   retention schedule that already exists as a document.
5. **Make it fast on a mid-range Android.** 1,343KB of background on every page
   is roughly 27 seconds before it settles on the stated target network. Every
   retention idea is worthless if the app takes that long to open.
6. **Give somebody a reason to come back.** Retention scored 26. The three
   assets that make it possible already ship: a social layer, a wallet, and an
   earned verification ladder. Nobody has connected any of them to a reason.
7. **Add a `.github/` that runs typecheck, lint, test and build**, and fix the
   54 lint errors rather than carrying them.

---

## 10. What was skipped, and why

The most important section in this file.

**Branch deletion did not happen.** All fourteen branches still exist. Every
delete returned HTTP 403, including the three fully merged ones. The git proxy
here permits pushing a branch and refuses deleting a ref, and the GitHub tooling
available has no delete operation. `docs/BRANCH_AUDIT.md` section 6b carries the
exact commands and the restore command for any branch later wanted.

**The migration was written and has not run.** The Supabase MCP tools cannot
reach project `uccixoonmbhrnyczyigt`: `list_projects` returns three projects in
a different organisation and `execute_sql` returns a permission error. The
sandbox cannot reach the host either. So
`20260915090000_the_database_stops_saying_rentme.sql` is mirrored in the
repository and **the database still says RentMe** in badge labels, wallet notes
and the handle guard. The file ends with three probes to run after applying,
because a migration succeeding does not mean the function works.

**Native application identifiers were not touched, deliberately.** `ng.rentme.app`
remains in `capacitor.config.ts`, `assetlinks.json`,
`apple-app-site-association`, the Android manifest and the iOS entitlements,
along with the `rentme.ng` deep link hosts. **This one stops and asks**, per
section 3.2: an application ID cannot be changed after a store listing exists.
The Capacitor `appName` display string did move to Vallo, because a display name
is reversible and it is what a person reads under the icon. **This needs a
decision before either store listing is created.**

**The tagline was left.** "Find it. Rent it. Love it." still ships in the page
title, the OpenGraph title, the email sign-off, the about hero and the landing
showcase. It is RentMe's tagline and "Rent it" is wrong on a platform meant to
sell, but a tagline is the most brand-loaded string in a product and inventing
one is not a rename. Three candidates, offered rather than applied: "Find it.
See it. Sign for it." / "Every home here has a real person behind it." / "The
honest way to find a home in Nigeria."

**No ink variant of the logo exists and none was faked.** The new mark is a
photographic render of a glass object lit from behind. An ink version is a new
render, not a filter, and cutting the glow out by hand leaves the halo the brief
forbids by name. One asset now serves both themes, carrying its own navy ground.

**The `nf-` CSS token prefix and the `nf/` ESLint namespace were left**, as
section 15.1 permits: internal, not user-visible, optional churn. The
user-visible `NF-SUP` support reference was changed, because a person reads it.

**No image was downloaded or looked at.** The network answers 403 to every image
host. `docs/IMAGERY.md` gives search pages rather than direct file URLs and says
why: an unverified direct link that has rotted costs more than a search term.

**Two Vault secret names were left**, `rentme_site_url` and
`rentme_reconcile_secret`. Renaming a Vault key stops the reconciliation job
until the founder recreates it in a dashboard this session cannot reach.

**Applied migrations were not edited.** One was swept by accident and reverted.

**I did not run the 82 Playwright specs.** They need a server on port 3210 and a
database this environment cannot reach. The 44 vitest files were run on every
commit.

**I did not render a single page myself.** Agent 3 got a dev server up and took
seven screenshots at 390px; the lead's verification was typecheck, test, build
and lint, plus opening every generated image file. Every generated icon was
looked at. No product screen was.

**I did not verify most of the 481 recommendations.** Three of the largest
claims were re-audited independently and all three held. The rest are the
agents' work, carrying their own evidence, and each report states near its top
what its agent did not check. Those sections are long and worth reading.

**The three agents never reached the live database.** Every database finding in
all three reports, and in this one, is from the migration files and the
generated types, not from live Postgres.
