# Session 3 response: the experience upgrade

**Branch:** `claude/vallo-experience-upgrade`, cut from `main` at `ef1265135`.
**Started:** 6 October 2026. **Status:** in progress, kept current as work lands.

This file is Session 3's only voice. It is written as work happens, not at the end.

---

## 0. What was verified, and when

| Claim or assumption | Checked how | Finding |
|---|---|---|
| The reading list exists on `main` | `git ls-tree origin/main` | It did not. Read first from Session 1's branch with `git show`; **merged into this branch on the founder's correction (D39.6)** at `62e016577`. Documentation only, no conflict |
| The founder's component library source | `git grep` across every branch | Not in the repository at the start. **Now at `docs/design/component-library-source/`** (D39.1); ports are rebuilt from it |
| Session 2 has landed | Every remote branch searched, then re-checked | First check: no Session 2 branch existed. **Re-checked: `claude/vallo-backend-money-trust` exists with `SESSION-2-RESPONSE.md`** |
| The `/open` deadline (D31, request R-1) | Read commit `0bf5a642e` on Session 2's branch; **ran its own `route.test.ts` against the route this branch still carries** | **Verified.** `resolveSession()` races a 3000ms deadline with an auth-cookie fallback. Its test fails 3 of 5 against the old route, exactly as Session 2 claims. **R-1 withdrawn; the startup sequence is started** |
| Passcode default of four (D18) | Session 2's commit `b1afcbef4` | Landed on Session 2's branch in `lib/passcode/rules.ts`. Session 3 does not edit it; the passcode UI reads the constant |
| "Confirming with Payluk" is a typo for Paystack (raised by B2) | Session 2's `PAYLUK_LIVE_DOCS_FINDINGS.md` reference | **Wrong: Payluk is the escrow provider.** The copy stands as the handoff specifies, once Session 2 places it in `lib/money/copy.ts` |
| Vallo holds no money, so wallet and escrow contradict `copy.ts` (raised by B2) | Session 2's response, Payluk section | **Not a contradiction.** Escrow is held by Payluk, not Vallo, so "Vallo never holds it" stays true. The screens still wait for Session 2's financial reads |
| The 12 asset sheets | `git hash-object` | The root PNGs on `main` are byte-identical to `docs/design/assets-raw/2026-10-06/`; the merge moved them there |
| The branch to work on (D44) | Harness configuration against the kickoff prompt | **Mismatch, reported per D44.** The harness was configured for `claude/stoic-archimedes-5kdb2n`; the kickoff prompt names `claude/vallo-experience-upgrade`. The prompt's branch is used, cut from `main`; nothing was pushed to the harness branch |
| CI runs on this branch (D42) | Founder's note: Session 4's trigger fix `c2a8a5fdb`, draft PR #85 | CI is read on the PR rather than assumed. The local clean-worktree gate still runs before every push |
| The `source-map-js` advisory (D46) | `package-lock.json` on `origin/main` and here | Both at 1.2.1: Session 4's fix has not landed on `main` yet. **A red `Advisories` check on PR #85 is established as Session 4's** (D46) and resolves by merging `main` once it lands, keeping `framer-motion` and `source-map-js` 1.2.2 both |
| Every image folder (handoff item 9) | `git merge origin/main` and Session 1's branch | All present: `references/2026-10-05/` (79), the earlier rounds and the five `GOVERNING-*` frames in `references/`, `assets-raw/2026-10-06/` (12 sheets), `component-library-source/`, `CHATGPT_ASSET_PROMPTS.md`. The lead looked at the twelve canonical references, the twelve sheets and the five governing frames |
| Baseline gates on untouched `main` | typecheck, lint, test | **All green.** 690 files, 8,791 tests passed, 1 skipped |
| A wallet or escrow route to upgrade | `src/app/(app)` route list | **None exists.** Waits on Session 2 (requests R-3 to R-5) |

## 1. Agent ownership (declared before parallel work)

Six agents (D36). Two agents never hold one file. Agents do not run git: the lead
commits each unit by named paths, so a commit never sweeps in another agent's
half-finished file.

| Agent | Model | Owns |
|---|---|---|
| **Lead** | strongest | This file, git, integration, the full gates before every push |
| **B1 Foundations and navigation** | strongest | `packages/design-tokens/src/tokens.css`, `apps/web/src/app/globals.css`, `src/app/css/{theme,glass,motion,buttons,controls,chips,chrome,typography,overlays,symbols,threshold,press-motion,signature-motion,motion-kit,route-motion}.css`, `src/app/side-nav.css`, every existing file in `src/components/ui/` except those named for B4 and B6, `src/components/motion/*`, `src/lib/motion/*`, `src/components/app/{MobileTabBar,AutoHideDock,CreateDock,DockMore,AppRail,NavTree,PageHeader,AppShell,BackControl}.tsx` |
| **B2 Money and documents** | strongest | `src/app/(app)/{checkout,pay,payments,record,rent,agreements,tenancy,bookings}/**`, `src/components/app/{money,money-history,payments,tenancy,agreements,bookings,confirm}/**`, `src/app/css/{money-surface,money-history,success,status-track}.css`, new `src/app/css/document.css` and `print.css` |
| **B3 Entry, brand, passcode** | strongest | `src/components/site/landing/{Hero.tsx,headline-coupling.test.ts}` (granted on request: the landing hero lives there, not in `app/(landing)`), `packages/i18n/src/locales/*`, `src/app/welcome/**`, `src/app/(auth)/**`, `src/app/(landing)/**`, `src/app/offline/**`, `src/components/passcode/**`, `src/components/auth/**`, `src/app/css/{auth,passcode,landing,landing-3d,landing-rooms,public-doors}.css`, `public/brand/**` (vector mark) |
| **B4 Charts and workspaces** | strongest | `src/components/ui/charts/**`, `src/app/host/**`, `src/app/agent/**`, `src/components/{host,agent,workspace}/**`, `src/app/css/agent.css` |
| **B5 Component library port** | mid | **New** files only in `src/components/ui/` (named in section 6), `src/lib/cn.ts`, new `src/app/css/ported.css`, new preview pages under `src/app/(dev)/gallery/` |
| **B6 Assets and clay** | mid, cheapest for the sweep | `scripts/{slice-icon-sheets,cut-icon-ground,icon-manifest,name-icon-objects}.mjs` and new asset scripts, `public/` asset output, `src/design-system/icons/**`, `src/components/ui/{Icon3D.tsx,icon-3d.ts,icon-3d.test.ts,state-art.ts,state-art.test.ts}` |

**Wave 2 (founder's instruction on 6 October: "add 8 or 9 more agents"; this
supersedes D36's cap of six for this session).** Wave 1 had finished its files
before wave 2 started, so ownership transferred cleanly:

| Agent | Model | Owns |
|---|---|---|
| **W1 Landing and public site** | strongest | `components/site/**` (incl. the hero files from B3), `components/cinema/**`, `app/(landing)/**`, `app/(site)/**` except legal and policy wording (Session 4), `css/{landing,landing-3d,landing-rooms,public-doors,site,docs-motion,cinema}.css`, `experience-landing.en.ts`. May run sub-agents inside this |
| **W2 Discovery** | strongest | `app/(app)/{home,search,stays,restaurants,price,saved}/**`, `app/home-or-landing/**`, `components/app/{home,search,filters,price,saved-searches}/**`, `ListingCard.tsx` and its model, `css/{home,explore,catalogue,map,filter-tiles,list-views,stays}.css`, `experience-discover.en.ts` |
| **W3 Space detail** | strongest | `app/(app)/{listing,stay,restaurant}/**`, `components/app/listing/**`, `components/stays/**`, `css/{details,detail-m,photo-viewer,edge-m,inner-m}.css`, `experience-detail.en.ts` |
| **W4 Social and profiles** | mid | `app/(app)/{around,post,stories,u,profile}/**`, `components/social/**`, `components/app/around/**`, `components/share/**`, `social.css`, `social-feed.css`, `css/{feed-m,share-card,member-loop}.css`, `experience-social.en.ts` |
| **W5 Inbox and notifications** | mid | `app/(app)/{messages,notifications,assistant,support}/**`, `components/messages/**`, `components/app/{messages,threads,assistant}/**`, `components/support/**`, `css/threads.css`, `experience-inbox.en.ts` |
| **W6 Account** | mid | `app/(app)/{settings,verification}/**`, `components/app/account/**`, `components/verification/**`, `components/trust/**`, `components/app/trust/**`, `settings-rows.css`, `css/{trust-badge,member-kit,theme-control,status-track}.css`, `experience-account.en.ts` |
| **W7 Features and workspaces** | strongest | new `components/app/{feature-onboarding,artefact,pro,streaks,plans-premium}/**`, any first-run route, `app/host/**`, `app/agent/**`, `components/{host,agent,workspace}/**` (from B4), `experience-features.en.ts` |
| **W8 Admin** | mid | `app/admin/**`, `components/compliance/**`, `components/app/desk/**`, `css/{admin,decision-card,pixel}.css`, `experience-admin.en.ts` |
| **W9 Money wave 2 and email** | strongest | B2's former area plus `inspections`, `components/ui/SuccessSheet.tsx`, `app/email/**`, the presentation files of `lib/email`, `experience-money.en.ts` |
| **Auditor** | strongest | Read-only adversarial review of every unpushed commit before push |
| **W10 Foundations and navigation audit** | strongest | B1's former area: `tokens.css`, `globals.css`, the shared partials, the existing `components/ui/*` primitives (not SuccessSheet, not the B5 ports), `components/ui/charts/**`, `components/motion/**`, `lib/motion/**`, `lib/nav/**`, `lib/testing/browser-root.tsx`, the shell components, `experience-shell.en.ts`. The token owner from here |
| **W11 Auth and onboarding** | mid | `app/(auth)/**`, `components/auth/**`, `components/app/welcome/**`, `app/welcome/**` beyond Get Started, `app/offline/**`, `native-shell/**`, `css/auth.css`, the passcode settings frame, `experience-entry.en.ts` |
| **W12 Audit sweep** | mid | Read-only: the 24-point checklist on every route at 390, 768 and 1440 in both themes, findings routed per owner |
| **W13 Speed and the unowned surfaces** | strongest | Measures the production build (per-route first load, the framer-motion cost in the built client, the weight budgets D41 found null) and routes fixes per owner; owns `app/join/**`, `app/s/**`, `components/app/{briefs,doors,flip,status,arrival-check,after-gate,safety,offline}/**`, `components/roles/**`, `experience-speed.en.ts`. Added when B5 finished, to hold fourteen active |

**The founder then asked for fourteen agents active** until every surface is built,
audited and ready: W1 to W12, the auditor and B5 (re-opened to make one test
race-free), with the shell agent, the auth agent and the sweep added in the same
turn. `components/supply/**` went to W7 for the listing wizard.

**Wave 3 (fourteen held active as wave 2 agents finished).** Each took over a
finished owner's files, so no file had two holders:

| Agent | Owns |
|---|---|
| **A2 to A7 Auditors** | Read-only, one commit range each; A7 rolls over every range landing after it starts |
| **F1 Startup and passcode** | `components/startup/**`, `components/passcode/**`, `css/passcode.css` |
| **J1 Wiring** | First-run gates on invite and passport, SupportChat through AIResponse, the host wizard path |
| **G1 Gallery** | `app/(dev)/gallery/**`, `docs/design/COMPONENTS.md` |
| **H1 Claims lint** | `lib/trust/claims.ts` and its test |
| **W1b Docs and help** | `app/(site)/{docs,help,check,about,contact}/**`, `components/site/guides/**`, `SupplyPage.tsx`, then the policy pages |
| **W8b Admin depth** | W8's former area |
| **I1 Listing health and analytics** | The host and agent listing-health surfaces |
| **M2 Agreements and caution register** | B2's agreement files |
| **R1, R2 Raw-button migration** | Member areas (R1); discovery, detail and workspaces (R2), then A4's findings |
| **C1 Cleanup** | Agents' leftovers and the small items audits routed to nobody else |
| **T1 Dom tests** | New `*.dom.test.tsx` for W5, W7 and W8 surfaces |

**Copy without collisions.** Each wave-2 owner writes English only into its own
`packages/i18n/src/locales/experience-<area>.en.ts`, created and wired once by the
lead, so nine agents never edit `en.ts` at once. `experienceUi` holds the ported
components' shared labels.

The i18n locale files have one owner, B3. Every other agent that needs a key writes
it into its report and B3 or the lead adds it.

## 2. Requests to Session 2

Numbered per the contract handshake: what, the shape, who consumes it, whether it
blocks. Session 3 builds nothing behind these; the screens render the honest empty
state until they land.

| # | Need | Shape | Consumer | Blocks |
|---|---|---|---|---|
| R-1 | The `/open` deadline (D31) | | Startup sequence | **Withdrawn: landed and verified** (section 0) |
| R-2 | Money copy for processing and payment confirmation | In `lib/money/copy.ts`: the no-double-charge line (reference 7076's model, e.g. "Cancel is disabled while we confirm. We will never charge you twice."), and the handoff's step labels "Preparing secure payment", "Verifying payment", "Confirming with Payluk", "Protecting your funds", "Confirming withdrawal", "Waiting for bank confirmation". Session 3 may not write money sentences | `components/app/payments/PaymentSteps.tsx` | The specified copy only; steps already render from existing dictionary lines |
| R-3 | Wallet balance in four states | RPC `my_balance()` returning `{available_minor, escrow_minor, pending_minor, processing_minor}`, with "none" distinct from "failed" | Wallet overview (not built) | **Yes**, the wallet |
| R-4 | Escrow held state and release | `/escrow/[id]` read: `{held_minor, holder ('payluk'), release_condition, release_by, milestones[{name, condition, state, released_at}], dispute{state, opened_at, evidence[]}}` | Escrow held, release, milestones, dispute | **Yes**, escrow |
| R-5 | Withdrawal quote with the eight disclosures | `withdrawal_quote(amount_minor)` returning `{amount_minor, provider_fee_minor, vat_minor, total_debited_minor, expected_received_minor, destination{bank, account_last4, verified_name}, status, reference}` | Withdrawal confirm | **Yes**, withdrawal |
| R-6 | One transaction, completely | `my_payment_entry(entry_id)` returning `{amount_minor, status, provider, provider_ref, paid_at, booking_id, lines[], refunds[]}` | `/payments/[id]` transaction detail on the document sheet | **Yes**, the detail page |
| R-7 | Reference on the checkout receipt | `paid_at`, `provider_ref`, `provider` on `CheckoutView` | Checkout receipt state | No: the receipt prints without a reference until then |
| R-8 | Host analytics | RPC `host_analytics(p_business_id uuid default null, p_months int default 12)` returning monthly `{month 'YYYY-MM', requests, confirmed, cancelled, lapsed, nights_sold, gross_minor, host_share_minor}` plus `{offered_nights, booked_nights, blocked_nights}` for the next 30 nights, with the privacy floor of `lib/agent/analytics-queries.ts` | Host analytics (not built) | **Yes** |
| R-9 | Host earnings by month, complete | `my_host_earnings_by_month()` returning `{month, gross_minor, host_share_minor, stays}`, not paginated (charting one page of `readMyEarnings` would be wrong) | `/host/earnings` chart | **Yes**, that chart |
| R-10 | Agent daily series | `agent_daily_counts(p_from date, p_to date)` returning `{day, requests, confirmed, enquiries}` | `TrendLine` on agent analytics | No |
| R-50 | Whether a listing health score exists | If it does: `listing_health(p_listing uuid)` returning `{score smallint, components jsonb}` with its formula | Listing Health | No: no score is printed until then |
| R-51 | Floor plan storage | `listing_photos.kind = 'floor_plan'` or a `listing_floor_plans` table, plus the wizard upload | Listing Health's floor-plan line | No: it says "Not held" |
| R-52 | A photo quality signal | `listing_photos.{width, height, quality}` | Listing Health | No |
| R-53 | A price-guidance rule | `listing_price_position(p_listing)` returning `{area_median_minor, peers}` with a floor of five, and an approved rule for "adjust price" | Listing Health | No: price advice is stated as not given |
| R-54 | Funnel over any period | `listing_funnel(p_listing uuid, p_days int default 7)` | Funnel metrics beyond 7 days | No: they say "7 days only" |
| R-55 | Counters for shares and contact reveals | | Space Analytics | No: named as not counted |
| R-56 | Funnel totals in one read | `agent_funnel_totals(p_days)` | Overview for agents with more than 40 live listings | No: no total is printed past 40 |
| R-60 | Earned badges readable by a signed-out visitor | A definer view `(user_id, badge_code, granted_at, earned)` | Profiles | No |
| R-61 | A failed refund said as failed | `refunds.ts` maps `processorStatus === "failed"` to the "on its way" sentence; a failed refund needs its own line in `lib/money/copy.ts` | The booking money record | No, but it is an honesty gap (auditor A7) |
| R-40 to R-43 | Agreement and caution dates, a ruling-only sentence, staff read of versions, and version reads in `lib/agreements` | As in M2's report | Agreements and the caution register | No |

---

## 3. Surfaces touched, with the 24-point audit (north star section 12)

**P** pass, **F** fail, **N** not yet checked (with the reason). Points 19, 22 and 23
need a live app at 768 and 1440 in four locales; that pass is scheduled for the
audit sweep once the foundations land and is not claimed before it runs.

| Route | Agent | Pass | Not checked / note |
|---|---|---|---|
| `/tenancy/[id]` (the money block) | B2 | 1-6, 8, 9, 11, 14-18, 20, 21, 24 | 7: **deliberate deviation**, a receipt states settled money and does not count up. 10: unroll 380ms. 12: existing `loading.tsx`. 13: Calm/reduced 160ms fade, Off instant. N: 19, 22, 23 |
| `/agreements/[id]` | B2 | as above; 14 pass, total and lines on the sheet before Pay | N: 19, 22, 23 |
| `/agreements` | B2 | 6 (12px floor restored), 15, status by word + shape + colour | N: 19, 22, 23 |
| `/payments` | B2 | 6 (pill back from 11px to 12px), 15 | N: 19, 22, 23 |
| `/checkout/[bookingId]` (processing sheets) | B2 | 12 (no spinner; steps tick on real state) | 14 **F, honest**: a per-method fee cannot be shown because no fee data exists (R-2/R-7 area). Summary Island held until B1's `.nf-island` lands |
| `/host` | B4 | 1, 2, 4-8, 10, 12, 13, 15-18, 19 at 390 and 1440, 20, 21 | N: 3, 9, 11 (existing rows), 14 (no cost on screen), 19 at 768, 22, 23, 24 |
| `/agent/dashboard` | B4 | as `/host` | as `/host` |
| `/agent/analytics` | B4 | as `/host`; hatched empty months | as `/host` |
| `/agent/earnings` | B4 | as `/host`; a month before the first settlement shows a dash, never a zero | as `/host`; 3: Paper document treatment of the statement still to do |
| `/welcome` (Get Started) | B3 | 1, 3, 4, 5, 6, 9, 10 (900ms, breath ends 1,080), 11, 12, 13, 16, 18, 19 (360 and 390), 21, 23 | n/a: 2, 7, 8, 14, 15, 17. 20: night only by founder rule. N: 22, 24 |
| Passcode lock and setup | B3 | 1 (the dots), 3, 4, 6, 9, 11, 12 ("Checking" is real text), 13, 16, 19, 21, 23 | N: 20 (inline settings frame in Light), 22, 24 |
| `/` landing hero (copy only) | B3 | 1, 6, 16, 19 | Rest of the landing: W1 |
| Startup sequence | B3 | Contract in section 5 | Real-device timing N (Session 4) |
| Dock and side navigation | B1 | 1, 4, 6, 7, 8, 10, 11, 12, 13, 21 | N in a browser: 19, 20, 22, 23; 24 unchanged |

Craft doctrine section 8, flagship surfaces so far: the tenancy receipt and the
workspace homes. (1) every choice is reasoned in the code's comments; (2) removed: a
false "Paid in total", an 11px pill, duplicated confirmation sentences, a zero shown
for a failed read; (3) one subject each, the total paid and "what needs me"; (4) the
unroll carries the eye downward and the chrome stays still; (5) money is deliberate,
the workspace is quick; (6) no haptic added; (7) same containers and flow, better
material.

## 4. Components and primitives

| Component | Single definition | Porting checklist (12) |
|---|---|---|
| `DocumentSheet` (+ `DocHead`, `DocFigure`, `DocRows`, `DocState`, `DocPerforation`, `DocActions`) | `components/app/money/DocumentSheet.tsx` | 1-7, 10, 12 pass. 8 (768/1440) and 9 (Hausa) N. 11: lives in the money surface, not `components/ui`; candidate for promotion |
| Receipt printer (founder source) | Folded into `DocumentSheet` kind `receipt` | Paper kept; chassis, LEDs, barcode, every default value dropped |
| `PaymentSteps` (founder payment status) | `components/app/payments/PaymentSteps.tsx` | Infinite spinner replaced by real states; no timer |
| Chart system: `PeriodBars`, `TrendLine`, `CompareBars`, `ChartTable` | `components/ui/charts/` with rules in `chart-rules.ts` | Pure SVG, one hue, axe clean in Chromium |
| `TodayHero` | `components/workspace/TodayHero.tsx` | |
| Container tiers | Tokens `--nf-tier-{plate,card,island,sheet}-*`, `--nf-elevation-*` (tokens.css foundations block); classes `.nf-panel`/`.nf-card`, `.nf-panel--figure`, `.nf-island`, `.nf-sheet` | One edge per tier; Paper card is the blue shadow alone |
| Document tokens | `--nf-doc-*` in tokens.css, identical in both themes | |
| Figure, CountUp, Odometer | `components/ui/Amount.tsx`, `components/motion/CountUp.tsx`, `components/ui/Odometer.tsx`, `lib/motion/{ease,odometer}.ts` | Count once 620ms glide; roll changed digits only |
| Segmented, SegmentedPanel | `components/ui/Segmented.tsx` | WAAPI FLIP thumb, interruptible |
| Button `morph` | `components/ui/Button.tsx` | Opt-in; the arc draws once and holds, never spins |
| Toast | `components/ui/ToastHost.tsx`, `css/overlays.css`, `lib/ui/toast.ts` | Dwell 2,400ms |
| StatusChip | `components/ui/StatusChip.tsx` over `StatusPill` | success circle, pending hollow circle, failed square, protected hollow square, disputed diamond |
| SkeletonSwap | `components/ui/Skeleton.tsx` | 131 shaped `loading.tsx` already existed |
| MotionProvider | `components/app/MotionProvider.tsx` + `motion-features.ts` | The only LazyMotion; guarded by eslint and a test |
| DragToConfirm | `components/ui/DragToConfirm.tsx` | 12/12. `money` makes auto-reset a type error; confirmed only after the server resolves |
| Unfold | `components/ui/Unfold.tsx` | 12/12. Never hides price, fees, trust facts or money state |
| SlidePagination | `components/ui/SlidePagination.tsx` | 12/12. Desktop only; segments radius 14 |
| LiveIsland | `components/ui/LiveIsland.tsx` | 12/12. Never covers the dock |
| InnerNav (the founder's glass nav) | `components/ui/InnerNav.tsx` | 12/12. Inner areas only; the hamburger pull follows the finger |
| BatchTray | `components/ui/BatchTray.tsx` | 12/12 |
| ActionSheetIllustrated | `components/ui/ActionSheetIllustrated.tsx` | 12/12. Composes the existing Sheet |
| ParticleDelete | `components/ui/ParticleDelete.tsx` | 12/12. Deletes first, dissolves only on success; never money or an account |
| BookCallButton | `components/ui/BookCallButton.tsx` | 12/12. Marketing surfaces only |
| AIResponse | `components/ui/AIResponse.tsx` | 12/12. Thinking is the one permitted loop |
| Vector mark and wordmark | `public/brand/vallo-{mark,wordmark}.svg`, `components/auth/vector-mark.ts` | Hand-authored on the raster's viewBox |
| BrandIcon tiered map | `design-system/icons/object-assets.ts` | 106 objects, 60 glass names remapped, zero call-site edits |

The chart rules, so the next chart follows them: the question picks the chart
(amount per period: bars; movement over days: line; this against last: compare; a
share of a whole only when the parts are an honest whole, never a donut; one number:
a Figure, not a chart). One hue: brand for the series, muted grey for a comparison,
at most one state colour, a hatch for absence. Never colour alone: pattern, marker,
legend from two series, and a table copy always. Null is a hatched slot, zero has no
bar, any real value is at least 2px. Axis labels 12px minimum and tabular. One tab
stop per chart, arrows to move, a tap stays on touch, mirrored to a live region.

## 5. Motion as built (against MOTION_SYSTEM section 2)

| Moment | Specified | Shipped |
|---|---|---|
| Receipt and document unroll | `glide` | 380ms `--nf-ease-standard`; Calm and reduced 160ms fade; Off instant |
| Processing step tick | `land` 240ms | 240ms `--nf-ease-entrance`, once per real state change |
| Money values on a receipt | never misleading | not animated |
| Chart bars grow | baseline, 620ms `glide`, 30ms stagger | as specified |
| Line draw | 620ms `glide` | as specified (clip scale) |
| Chart period morph | 380ms `glide` | bars by transform; line interpolated in JS |
| Figure arrival on workspace homes | 620ms | existing `CountUp` |

## 6. framer-motion: the measured cost

Installed alone in `bfab37d1c` (12.43.0). Measured with esbuild, minified and
gzipped, React external:

| What | Bytes gzipped |
|---|---|
| Top-level `motion` + `AnimatePresence` (refused) | 42,522 |
| `LazyMotion` + `m` | 7,147 |
| `domAnimation` feature bundle | 24,089 |
| `LazyMotion` + `m` + hooks + `AnimatePresence` + `MotionConfig` | 28,385 |

**In the built application (W13, `next build`, Turbopack, gzip -9):**

| What | Bytes gzipped |
|---|---|
| First load on every route: the motion-dom value layer plus `LazyMotion` and `MotionConfig` | about 13,200 |
| The `domAnimation` feature chunk, fetched after paint on every route | 18,071 |
| Routes whose first load also carries the animation engine through a top-level `animate` import (InnerNav and the drag and pill components) | 36 routes, about +17,800 each |

The esbuild estimate of 7KB was low: Turbopack ships the whole value layer
wherever the provider mounts. After B5's fix no component renders an `m`
element, so the feature chunk is fetched on every page for nothing. **Raised
with the founder (see Decisions):** keep the one provider and load the
features only where an `m` component mounts, or drop `LazyMotion` until one
does.

The spec's "around 18KB" is not what 12.43 costs. **So the provider fetches
`domAnimation` in its own chunk after first paint** (`components/app/motion-features.ts`):
first load carries about 7KB, and `m` components render their initial state without
the features. The cost in the built application after the ports land is measured
with `next build` and recorded here when the ports are in.

---

## 7. The independent audit before push

An auditor agent reviewed every unpushed commit, read-only, against committed
content only. **Verdict: HOLD, on one blocker, now fixed.**

| # | Finding | Severity | Resolution |
|---|---|---|---|
| 1 | A right passcode reloaded the app about six seconds later: the unlock cookie makes Next re-render the gate in the action's response and unmount the lock before its 320ms door, and the door's untracked timers then refreshed and armed a reload on the unmounted lock | BLOCKER | **Fixed** by the lead (`6a0a26dd8`): timers tracked and cleared, `finish` inert once unmounted |
| 2 | Startup overlay had no absolute ceiling and no keyboard skip; a slow streamed response held the lockup over a usable shell | SHOULD | F1 |
| 3 | Tap-to-skip could click through to Get Started's invisible doors | SHOULD | F1 |
| 4 | The collapsed-rail flag on `<html>` leaked to the admin, agent and host sidebars | SHOULD | W10 |
| 5 | Biometric door ignored typed digits; focus fell to `body` on switching to the keypad | SHOULD | F1 |
| 6 | Ported framer components unusable before the lazy features load (only on the dev gallery today) | SHOULD | B5, before any surface wires them |
| 7 | The passcode lock's `showModal` cut the startup short on a locked cold start | SHOULD | F1 |
| 8 | Layout-property transitions in `nav-island.css` and `passcode.css`; the lockup snapping out of its hold scale; reduced motion skips rather than crossfades | NIT | W10, F1 |

**Recorded rather than changed, from the same audit:**
- `ec3f9f226` deleted the unused four-hue `DonutChart.tsx` inside the copy-module
  commit; the deletion is deliberate (the refused pattern, north star 9) and is
  named here because its commit message does not.
- **Flow-routing change, D28:** Get Started's "Get started" now carries
  `next=/welcome`, restoring the interests and arrival step a cold-start sign-up
  used to skip. No step was added or reordered.
- **For Session 4:** the Get Started legal line reads "By continuing you agree to
  our Terms and Privacy Policy. Terms · Privacy policy", saying it twice; legal
  wording is Session 4's to settle. The toast dwell of 2,400ms matches the motion
  inventory and pauses while touched, but deserves a screen-reader check.

### Later audits (A2 to A7), one commit range each

| Auditor | Range | Verdict | Deciding finding and resolution |
|---|---|---|---|
| A2 | W4 social, B5's fix, W6 account | PUSH | Twelve SHOULDs and NITs routed to R1 |
| A3 | W5 inbox, W7 features, W8 admin | HOLD | **B1:** Skip on a first run could land back on the first run for up to 30s (the router cache's stale window served the old redirect). **Fixed** in `043c4d1ff`: both exits replace the document. **S2:** `/host` showed the host first run to guests and marked it seen; now gated after the businesses read, hosts only (same commit). S1, S7, S9 to W8b; S3, S4, S6 to R1; S5, S8 to C1 |
| A4 | W2 discovery, W3 detail | PUSH | No blocker. Five SHOULDs to R2: the search pill morph drawn through `m.form` before features load, "Not seating on this day" when only today's times have passed, the area chart vanishing on an area change, home's three extra catalogue reads, a stay total with no button that opens it |
| A5 | W9 money and email, F1, W11, H1 | PUSH | No blocker. To F1: the code screen read a *verify* limit as a spent *send* (and did not count the first send); the refunded crypto payment printed as "Charge paid"; the shell behind a waiting lock was open to TalkBack; `/offline` reloaded itself forever |
| A6 | W10, J1, G1, W1, the deleted rooms | PUSH | No blocker. To B5: InnerNav took the overlay scroll lock and focus trap of a modal. To W1b: the example passport printed identity checks about an invented person; the mega menu dropped focus on Escape. To R1: the paused social screen sent a Stays member to Property |
| A7 | R2, the type fixes, `043c4d1ff`, then every later range | pending | |

## Completed

- Verified starting state; ownership declared before parallel work.
- Session 1's branch merged (D39.6); framer-motion installed alone; one LazyMotion
  provider with features loaded after first paint, an eslint guard and a test.
- B2: the document sheet and print stylesheet; tenancy receipt; agreement terms;
  agreements and payments status; real processing steps; history rows open their
  booking.
- B4: the chart system; workspace homes lead with "needs you today"; agent analytics
  and earnings on the chart system.

## Changed

See the commit log on `claude/vallo-experience-upgrade`: one commit per unit, each
message saying why.

## Tested

Baseline on `main`: typecheck, lint and 8,791 tests green. Every push is gated in a
clean worktree of the exact commit being pushed, so other agents' uncommitted work
never colours the result. Results per push are appended below.

## Failed

- An early attempt to tidy the asset move with `rm -rf` was refused by the harness;
  the files were moved to the scratchpad instead and nothing was lost.

## Remaining

- **In progress:**
  - R1: member buttons and A2's and A3's findings.
  - R2: A4's findings.
  - C1: cleanup and A3's S5 and S8.
  - W8b: admin depth and A3's S1, S7 and S9.
  - I1: listing health and analytics.
  - M2: the agreements and the caution register.
  - W1b: the policy pages on the document sheet.
  - B5: Button's non-morph `loading`, which still draws a spinner, plus the gallery index links.
  - T1: dom tests.
  - W12: the sweep at 390, 768 and 1440.
  - W13: the built app's per-route cost and framer-motion's cost after the ports.
  - A5, A6 and A7: audits.
- **Then:** the merge of `main` once Session 4's source-map-js fix lands (D46), the PR
  body rewrite Session 4 asked for, and host analytics once R-8 lands.

## Decisions

1. **Session 1's branch merged rather than read across** (D39.6, the founder's
   correction).
2. **framer-motion 12.43.0, not 14.0.0.** 14.0.0 is a major published four days
   earlier; an app that takes card payments adopts it when Dependabot proposes it,
   not on day four.
3. **The LazyMotion features load after first paint.** The measured cost is
   higher than the spec assumed; this keeps first load at about 7KB on budget
   Android without giving up a single component.
4. **The split is the rule**: CSS and Web Animations for a known track with a known
   end; framer-motion for gesture-driven, interruptible, spring or layout-shared
   motion. B2's receipt unroll and processing ticks are CSS for that reason.
5. **No count-up on a receipt.** A document states settled money; counting it up
   would animate a figure that is not changing (B2).
6. **A comparison series is grey plus a pattern, never a second blue.** The dataviz
   validator rejected the best blue pair on the normal-vision floor (B4).
7. **The startup sequence waited for R-1 and started the moment it was verified.**
8. **`nf-icon-btn` stays.** About 56 icon controls in discovery and the workspaces
   already share one class with a 44px target. Moving them onto `Button iconOnly`
   would only change the wrapper and risk their round glass, so R2 converted
   only what is a button role.
9. **BatchTray is not an overlay.** It docks over the list it acts on and leaves
   the page scrollable. It does not take the overlay registry's scroll lock.
10. **Chips that are actions stay raw.** `Chip behaviour="filter"` adds
   `aria-pressed`, which would announce "All places" or "Undo" as a toggle.
11. **Compare shows two at a time** (north star). A member who compared three
   earlier keeps their saved spaces but sees them two at a time (A4 NIT).
12. **The guides index keeps its cards** (W1b): each card carries a "Last
   reviewed" date, a trust fact a row would have dropped.
13. **UiIcon stays one shared chunk (8.4KB gz).** 178 call sites name a glyph
    at runtime, so a split cannot tree-shake. A common set plus a lazy rest
    would save at most about 5KB, and only on routes using common glyphs
    alone, while routes with rarer glyphs would wait on a second request (R2's
    measurement).
14. **The search pill flies only on a client-side arrival.** Its origins are
    native GET forms, so results arrive as server-painted HTML. Flying over
    that made the chips blink on slow phones, so the flight now plays only
    when results arrive by client navigation. Intercepting the forms to keep
    the flight is a separate decision.
15. **Haptics were not the weight W13 attributed.** The Capacitor bridge was
    already lazy and gated by `looksNative()`. Most of that chunk's 25KB is
    `next/image` (F1, measured), which F1 is now tracing.
16. **Home's stated-kind reads keep the catalogue's ceiling.** Capping at
    eighteen would have handed ranking only the newest rows (auditor A7), and
    ranking is Session 2's.


## Risks

- **Speed, measured by W13 against the built app.**
  - **A regression this session caused, being fixed:** `/messages/[id]` went from 343 to 750KB gz first load, because the thread's copy hook began pulling the whole client dictionary (8311e70f2, 213033eb4).
  - **The same pattern, earlier:** the full English dictionary (399KB gz) ships to 26 routes through client imports of `@vallo/i18n`. W13 and W8b are moving those to server-passed slices, behind a lint rule.
  - **Remaining, routed:**
    - the auth pages serialise the whole dictionary into their RSC payload;
    - `globals.css` is 113KB gz on every route and only 11 to 19% of its rules are used;
    - supabase-js (65KB gz) and zod (64KB gz) sit in first load on most routes.
  - **The weight check cannot fail:** every budget in `perf-budget.json` is null, and CI never sends `WEIGHT_COOKIE`. That is for Session 4.

- **The machine, not the work, became the limit.** Fourteen agents plus the
  gate on 4 cores and 15GB drove the load average to about 90 and the
  out-of-memory killer ended `tsc` (exit 137), browser tests ("Target crashed")
  and the lead's own gate. From 04:10 a resource rule binds every agent: no full
  typecheck, whole suite, build or dev server (the sweep and the speed agent
  excepted, one process each); targeted tests only; the full typecheck, lint and
  suite run once, serialized, in the lead's gate, which now waits for the load to
  fall before it starts. Nothing is pushed on an agent's partial verification.

- The perforation notches are painted in the canvas colour; on a page whose ground
  is not the bare canvas they read as dots rather than holes (B2).
- `print.css` relies on `:has()`, fine in current browsers, absent in very old ones.
- First-run exits are now full document loads. They are slower than a soft navigation by
  one server render, and they happen once per feature per device. A3 ruled a
  dead-looking Skip the worse failure.

## Next Session

(Written at the end.)

## Do Not Repeat

- Do not read a specification from another branch: merge the documentation branch
  (D39.6).
- Do not treat "build it without a library if you can" as a veto on a dependency the
  founder authorised (D39.3).
- Do not kill processes by pattern in a shared tree; another agent's test run is
  collateral.
- Do not commit a whole file because its reporting agent owns it: two agents
  can hold hunks in one file at once. b373f6889 and ebd47c30c committed W13's
  unfinished copy-scope hunks inside HostWizard with R2's chips, and the tree
  stopped building until 75e2f8345 and 339424273 took them back out (auditors A6
  and A7). Before staging, read the file's diff for lines the report does not
  describe, and stage by hunk when another agent is active in the same file.
- Do not make a prop required without grepping every caller, previews
  included (4707bdcb5).
- Do not assume a commit only carries its agent's lines: 03b4b1ce4 (the funnel
  retirement) also carried W8b's `calendar-model` import in `space-read.ts`,
  so it and the six commits after it do not build alone until 3ad213d95 adds
  that module; and 3ad213d95 carried B5's `catalogue.css` import lines in
  PulseCard and ProfileEditor (auditor A7). The tip builds; bisecting across
  that stretch does not. Recorded rather than rewritten, because the history is
  shared.
