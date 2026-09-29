# Founder requests trace, 29 September 2026

Every request, bug and design instruction the founder gave in this session, plus every issue the agents found and left open. Each one is checked against the current tree. Agents' reports were not taken on trust.

## Sources

- **Transcript.** `/root/.claude/projects/-home-user-read-it-well/1f6b951d-e7a6-5422-90c7-ea17c43968d4.jsonl` is the only transcript in the project folder, so no older session belongs to this effort.
  - 21 founder `user` turns, two of them compaction summaries.
  - 17 more founder messages that arrived mid-turn as `queued_command` attachments.
  - 11 image batches, in `/root/.claude/uploads/1f6b951d-…/`.
- **Reference images.** `docs/design/references/2026-09-29/` refs 01–24, and its README.
- **Audit docs.** `docs/HANDOFF_2026-09-29.md`, `docs/E2E_AUDIT_2026-09-29.md`, `docs/SUCCESS_MOMENTS.md`, `docs/PASSCODE.md`, `docs/ICON_SYSTEM.md` and `docs/BRAND_MARKS.md`.
- **Verification screenshots.** Taken at 390px in light and dark, in `/tmp/claude-0/-home-user-read-it-well/1f6b951d-e7a6-5422-90c7-ea17c43968d4/scratchpad/trace/`, called `trace/` below. Each is named `<screen>-390-<theme>.png`.
- **Earlier screenshots.** `scratchpad/e2e/` holds the E2E audit's.

**Status key**

| Status | Meaning |
|---|---|
| DONE | Verified in code, and on screen where possible |
| PARTIAL | Built, but a named part is missing |
| NOT DONE | Not built |
| FOUNDER ACTION | Only the founder can close it |
| SUPERSEDED | A later founder message reversed it; that later message is cited |
| FIXED NOW | Was PARTIAL or NOT DONE, and this audit fixed it |

The latest founder message wins wherever two conflict.

---

## A. Design and UX instructions (the round-3 taste list)

| # | When (UTC) | Founder's words (short) | Status | Evidence |
|---|---|---|---|---|
| 1 | 09-29 02:45 | "side nav glowing and glass" | SUPERSEDED in part by #4 (03:07): glass and glow now sit on the panel in dark only | `app/css/shell-m.css:565-625`: `:root:not([data-theme="light"]) :is(.nf-drawer--left,.nf-nav--rail)`, the panel gradient, edge light and glow |
| 2 | 03:04 | "On side nav should be this our icon [glass] not those 2d" | SUPERSEDED by #4 (03:07: "let side nav be like this don't change it") | n/a |
| 3 | 03:04 | "change the workplace icon to a more bold and visible one" | SUPERSEDED together with #2 (the drawer keeps line icons). The line set was made bolder by ICONS2 | `design-system/icons/UiIcon.tsx` (`uiIconStrokeWidth`) |
| 4 | 03:07 | "let side nav be like this [blue 2D line icons]" | DONE | `components/app/NavTree.tsx:109-116` (`UiIcon`, filled when current); `shell-m.css:127-131` (the brand-blue glyph) |
| 5 | 03:07 | Profile rows (Saved, Agreements…): 2D icon in the same tile shape, blue | DONE | `app/(app)/profile/AccountBody.tsx:98-104` (`IconPlate` plus `UiIcon`); `light.css` `.nf-plate--brand`. Screenshot: `trace/profile-390-{light,dark}.png` |
| 6 | 02:47 | "Hope you didn't remove this icons? And profile ones" (home glass tiles) | DONE. The home Buy, Rent, Pay and List tiles keep the glass. Profile rows moved to 2D per #5 | `trace/home-390-light.png` |
| 7 | 02:56, 03:02 | Glass icons in light: "bring back their background container… branding colour" | DONE | `app/css/light.css:229-290` ("THE GLASS OBJECTS IN DAYLIGHT: EVERY ONE ON A NAVY TILE") |
| 8 | 02:56 | "our logo should have a wrapper with… snakes around it moving in the edges **all areas** or place our logo is on light mode" | **FIXED NOW** (was PARTIAL) | Before: the navy pill was everywhere, but the moving lap ran only in the header, site bar and rail. The drawer, site menu, footer, app panel, side cover and staff access screen had a still rim. Now `light.css:100-114` laps every `.nf-logo` in light, still stops under reduced motion, data saving and Calm/Off (`:125-141`), and `docs/BRAND_MARKS.md` §8 carries a superseded note. Computed: `.nf-logo::before` animation is `nf-logo-lap` (home and landing, light) |
| 9 | 23:51 (09-28), 02:45 | Light mode: dark branded top block (ref 05), mix navy islands into light | DONE | `light.css:145-160` (app header and site bar), `:185-225` (home top block), `profile.css:653-660` (profile hero), `light.css:296-305` plus `MobileTabBar.tsx:385` (dock). Screenshots: `trace/home-390-light.png`, `trace/profile-390-light.png` |
| 10 | 03:31, 03:44 | Light-mode dock: dark neon blue capsule, white icons; "don't leave it how it was" | DONE (on the branch; production shows it after merge and deploy) | `MobileTabBar.tsx:385` (`data-theme="dark"`), `light.css:296-305`. Computed `.nf-tabbar` colour is white in light. `trace/home-390-light.png` |
| 11 | 03:44 | Dock centre becomes "+" (ref 17), opens Create; capsule really premium | DONE | `components/app/CreateDock.tsx:53-100`: the rows are List, Post (`/around?compose=1`), Book a viewing (`/search`), a host's stay, and Switch workspace. `.nf-dock-plus` renders 44×44. E2E `flow-15-create-sheet-*.png`. My scripted tap did not open the sheet in this run (the screenshot shows the closed dock); E2E flow 19 opened it with Escape-close |
| 12 | 03:44 | Tray icons (right-hand More) to 2D | DONE | `components/app/DockMore.tsx:91,109` (`UiIcon`) |
| 13 | 03:44 | Bottom-nav icons upgraded to premium 2D | DONE | `MobileTabBar.tsx:427` (`UiIcon`, filled when active) |
| 14 | 03:55, 04:50 | Bold 2D icons at pump.fun weight | DONE | `UiIcon.tsx` `uiIconStrokeWidth` (2.25 at 24, up to 3); `docs/ICON_SYSTEM.md` |
| 15 | 03:55 | Listing glass icons (fees, amenities) become premium 2D | DONE | `components/app/listing/DetailGlyph.tsx` on `IconPlate`; `trace/listing-390-{light,dark}.png` |
| 16 | 04:22 (lead catch), 03:55 | Main header bell: small, no container, like pump.fun | DONE | `app/css/shell-m.css:873-916` (a bare 22px glyph in a 44px target, no border, fill or glow); `AppShell.tsx:449` |
| 17 | 03:55 | Workspaces: remove logo, middle pill and language; small bare bell | DONE | `components/workspace/WorkspaceHeader.tsx:53-70` (back, drawer, title, bell only); `app/css/agent.css:103-135`. Computed `.nf-ws-bar .nf-logo` is null. `trace/agent-390-*.png`, `trace/host-390-*.png` |
| 18 | 03:55 | Inner Settings and AI in every workspace | DONE | `components/agent/agent-nav-model.ts:89-90`; `components/host/host-nav-model.ts:79-80`; pages `app/agent/{assistant,settings}`, `app/host/{assistant,settings,notifications}` |
| 19 | 03:55 | "translate icon… should not be in anywhere in platform [except] settings" | DONE | The only writer of `LOCALE_COOKIE` is `components/app/account/SettingsGroups.tsx:175`. There is no other language control in `src`. A side effect: signed-out visitors follow their browser language |
| 20 | 03:31 | Slate auth, full page, "98%" to refs 12–14, light and dark inversion | PARTIAL | Built: `components/auth/slate.tsx`, a navy curve in light and a white curve in dark, full-bleed. Screenshots: `trace/signin-390-light.png`, `trace/signin-email-390-dark.png`. What differs from the reference: Slate puts email, password, Forgot, Login and the "Or" provider row on ONE screen, but Vallo's `/sign-in` is email-first and then `/sign-in/email`. The provider row is hidden until #21 is switched on. A product call is below (B-1) |
| 21 | 03:31 | Google and Apple sign up / login | PARTIAL, needs FOUNDER ACTION | The doors exist (`components/auth/SocialDoors.tsx`). Policy is in `lib/auth/providers.ts:110-117`: Google is off unless `VALLO_SOCIAL_SIGN_IN=google`, and Apple is off until the Supabase provider is on. There is a code gap, **NOT DONE**: no terms and 18+ step for a new social account (the precondition in `providers.ts:88-99`; `recordTermsAcceptance` is only called for email, `lib/auth/actions.ts:482`). Brief B-2 |
| 22 | 03:31 | Sign-up in 2 steps (Next, then the rest) | DONE | `components/auth/EmailAuthForm.tsx`; E2E flow 5; `trace/signup-email-390-*.png` |
| 23 | 03:31 | Welcome intro like ref 11 | DONE | `components/app/welcome/WelcomeStage.tsx`, `trace/welcome-390-{light,dark}.png` |
| 24 | 03:44 | "Get started" not skippable, leads to the options page | DONE | `app/(auth)/start/route.ts` → `/welcome?next=/sign-up` → `/sign-up` options (`trace/signup-options-390-light.png`). Android Back is covered (`5049c1c5`). The tour's Skip was relabelled (E2E L-5, `FirstRun.tsx:118`) |
| 25 | 03:31 | Passcode: 6 digits by default, 4 optional, end to end | DONE | `lib/passcode/rules.ts:15` (`DEFAULT_PASSCODE_LENGTH = 6`); `PasscodeSetup.tsx:208,250` (the 4 or 6 toggle); `PasscodeLayer` in `app/(app)/layout.tsx`, `app/agent/layout.tsx`, `app/host/layout.tsx` and `app/admin/layout.tsx`; migration `20260929034124_passcode_member_app_lock_code_bcrypt_only.sql`; `/settings/passcode`; `trace/passcode-390-*.png` |
| 26 | 03:44 | Success screens everywhere (payments, inspections, approvals, listing submitted, applications), with 2 agents | DONE; the card-save exclusion is closed (B-6) | `lib/ui/success-moments.ts` (39 moments), `components/ui/SuccessSheet.tsx`, 26 call sites; `docs/SUCCESS_MOMENTS.md`; `trace/success-390-*.png`. Money success is gated on server settlement (`800cbb94`). Forged flags use a one-shot cookie (`1dc539af`). Saving a card (the ₦100 check) now gets "Card saved" once Paystack verifies it: see B-6 |
| 27 | 02:45 | Landing Journey ("four steps") horizontal and smaller on mobile | DONE | `app/css/landing-rooms.css:849-878` (`.nf-steps` swipe row under 40rem). Computed height is 343px at 390 |
| 28 | 02:45 (by implication) | Bento as a horizontal swipe row | DONE | `landing-rooms.css:1015-1043` (`.nf-bento-gate`), 234px at 390 |
| 29 | 01:54 | Remove the phone mockups | DONE | There is no mockup component or class in `components/site/landing/` or the landing CSS |
| 30 | 04:22 | "make the landing page so fucking clean" | PARTIAL (in progress) | The landing agent's round 3 and its second audit were still running at the time of writing. Overflow at 390 is 0 in both themes (`trace/landing-390-*.png`) |
| 31 | 04:22 | Loading, skeletons, why the platform is slow | PARTIAL | Root cause fixed: a remote auth check on every tap. `proxy.ts` now verifies the JWT locally with `getClaims` (`cba7f586`), and the forged-token hole is closed (`9a8e9d29`). About 25 routes got skeletons. zod is off the hot pages (`241112a1`). Still open: B-3 (a full reload flashes the landing loader), B-4 (129 KB of global CSS), and the Vercel region and Fluid check (founder) |
| 32 | 23:51 | "all icons clean… appealing looks" | DONE through #4–#15 | as above |
| 33 | 23:51 | "all emails enhancement and add more clean emails… every event" | PARTIAL | The redesign and 13 event templates are built (`lib/email/*`). Their triggers are deliberately held in `supabase/migrations/pending/email_lifecycle_triggers.sql` until the deploy. The lead applies them after PR #67 merges |
| 34 | 23:51 | "solid motions inside platform" | PARTIAL | The motion kit exists and was refined per area (the dock pill, sheets, drawer stagger, the logo lap, success burst). There was no dedicated in-app motion pass, because it was queued behind the design pass (see #45) |
| 35 | 23:51 | In-platform customer service and queries | DONE | `app/(app)/support/{page,new,messages,messages/[id]}`, `components/support/*`; migrations `20260929000412`, `000849`, `010610`, `013912` |
| 36 | 23:51 | The full crypto payment flow | DONE in code, off by flag: FOUNDER ACTION | Migrations `20260929001617_crypto_pay_1…`, `012438_crypto_pay_2…`. It stays off until the SEC VASP question and the Yellow Card confirmations are answered |
| 37 | 09-28 23:25 | Light mode: logo wrapped oddly and not bright enough | SUPERSEDED by #8 (the pill with a lap, by the founder's choice) | `light.css:28-141` |
| 38 | 23:25 | Re-sweep icons that are invisible or low contrast in light | DONE | The light tiles (#7), `DetailGlyph`, "Not declared" rows at full weight on grey (ICONS2 audit) |
| 39 | 23:25 | Icon system upgrade (consistent stroke and size, modern) | DONE | Lucide-based `UiIcon`, 81+ names; `docs/ICON_SYSTEM.md`, `THIRD_PARTY_NOTICES.md` |
| 40 | 23:25 | Auth sign-in and sign-up full page | DONE | #20 |
| 41 | 23:25 | Mobile sizing accuracy | DONE | `260b53ea`; 28 public pages × 9 widths, no overflow; E2E: 49 routes × 4 combinations, 0px overflow |
| 42 | 23:25 | Landing: motion, structure, horizontal-scroll overflow | DONE for overflow; structure and motion are #30 | E2E flow 31 |
| 43 | 23:40 | Light-mode lockup for the logo; resolve the clash between glossy 3D tiles and flat line icons | DONE | #8, #7, #5 (glass on navy tiles, line icons on plates, never mixed in one row set) |
| 44 | 23:40 | Glow and glass overuse (104 glow shadows, 66 blurs): one primary action per screen, restrained glow | **NOT DONE** | There was no dedicated reduction pass. The stylesheets now hold about 181 `--nf-glow` references and 131 `backdrop-filter`s (`grep` over `app/css`); the round added glow to islands, the dock and the logo, at the founder's asks. Brief B-5 |
| 45 | 23:40 | Button and card consolidation (27 button classes, 28 card roots, 371 raw buttons) | PARTIAL, one piece **FIXED NOW** | The shared layer existed from earlier sweeps. This round, 11 files still wrote the undefined `nf-btn--secondary`, including the member-facing agreement cancel (`AgreementControls.tsx:135`), which drew as a bare grey bar. They are now `nf-btn--glass`, and the `NOT_YET` allow-list in `components/ui/button-classes.test.ts` is emptied (3/3 pass). 429 raw `<button>` remain; brief B-5 |
| 46 | 09-29 01:54 | Landing "feel alive, professional" | see #30 | |

## B. Functional, backend and process requests

| # | When | Request | Status | Evidence |
|---|---|---|---|---|
| 47 | 09-28 22:17 | Initial audit program (phases 1–12, six discovery agents, four implementers, final report) | DONE for round 1 | Report artifact `https://claude.ai/artifact/JRRg6KRBRM4zGpWv69F8zg`; `docs/THE_AUDIT*.md` |
| 48 | 22:17 | Listing steps fail to advance: find the root cause | DONE | The autosave wiped the title error, so Next looked dead; fixed round 1. The wizard and photo gate are in `app/agent/list/ListingWizard.tsx` and `lib/listings/photo-gate.ts` |
| 49 | 22:17 | Verification: "question could not be loaded", "cannot accept documents" | DONE in code; founder to test | `submitVerification` built (round 1); the founder does one real signed-in KYC submission (#80) |
| 50 | 22:17 | Payments: never trust client success | DONE | Server settlement checks; success is gated (#26) |
| 51 | 22:17 (screenshots) | Drawer icons and avatar missing on iPhone | DONE in code; founder to confirm on device | Eager load plus an initial under the photo (round 1). Not verifiable without a real iPhone |
| 52 | 22:23 | Boundaries: no RLS weakening, no custody, no live Paystack, no fabrication, commit incrementally | Held | No RLS was disabled; the custody event trigger is intact; no Paystack call was made; everything is snapshotted and pushed |
| 53 | 23:25 | Add babatolasam@gmail.com as super_admin with the verified badge, audited, confirmed live | DONE | `supabase/migrations/20260928232759_staff_role_changes_are_audited_and_a_second_super_admin.sql` (confirmed live by the lead at 23:34) |
| 54 | 23:25 | The admin console: find missing ops areas; every staff scope surfaces what it needs | DONE | `docs/ADMIN_CONSOLE.md`; member file (`app/admin/people`), support desk, moderation; `requireAdmin(scope)` on `app/api/documents/[id]/route.ts:74-75`, `lib/landlord/admin-actions.ts:39…`, `lib/compliance/beneficial-ownership-actions.ts:93` |
| 55 | 23:25 | Feed "+" shows 3 options not fully visible at 390 | DONE | `components/social/bloom/physics.ts:85-112` (`BLOOM_FAN_SHIFT_X`, `BLOOM_EDGE_GUTTER`); measured at 390, 360 and 430 |
| 56 | 23:25 | Inspections, agreements and social depth | DONE | Migration `20260928233552_a_booked_viewing_opens_its_truth_questions…`; feed fixes `458b2585` |
| 57 | 23:25 | Listing bugs in the agent workspace and wherever the components are reused | DONE | `lib/listings/photo-gate.ts`, `lib/agent/listings-edit-state.ts` (+tests) |
| 58 | 23:25 | Load time and "try again": database root cause | DONE | `perf_db_1…5` migrations (role check once per statement, FK indexes, one shell query, dated search 119 → 24 ms) |
| 59 | 23:25 | Emails correct in any client light or dark | DONE (automated); PARTIAL (real clients) | `lib/email/shell.test.ts`. Real mail-client checks were not possible from the sandbox |
| 60 | 23:25 | Notification model, unread, grouping, routing (no native push) | DONE | `/verify` link fixed; unread counts `20260929001906`; the host bell routes to `/host/notifications` |
| 61 | 23:25, 23:40 | No Capacitor/store engineering; Apple is personal first, then a company transfer | DONE (docs) | `docs/store/*`, `VALLO_IOS_RELEASE_CHECKLIST.md` |
| 62 | 23:40 | Merge PR #66 | DONE | Merged (01:55) |
| 63 | 23:40 | `is_platform_staff` / `is_checked_person`: a definer wrapper | DONE | `20260929000714_db2_the_badge_is_derived_behind_one_definer…` |
| 64 | 23:40 | Password reset code fallback | DONE | `app/(auth)/forgot-password/code`, `components/auth/ResetCodeForm.tsx` |
| 65 | 23:40 | Photo check uses the long edge; clarify the HEIC message on Android | Long edge DONE (`lib/listings/photo-gate.ts:67`). HEIC copy **FIXED NOW** | `packages/i18n/src/locales/en.ts:2578-2579`: the text named only the iPhone. It now covers both: iPhone Camera, Formats, Most Compatible; Android, High efficiency pictures off; or share as JPEG. Hausa, Yoruba and Igbo fall back to English (#83) |
| 66 | 23:40 | Host workspace row in the drawer (it was opening the agent dashboard) | DONE | `components/app/nav-model.ts` `isHost` → `/host`; `AppShell`/`AppRail` wiring |
| 67 | 23:40 | Abandoned Paystack attempt: 2 h pending, duplicate attempts | DONE | `20260928235605_pay_attempts_1…`, `235824_pay_attempts_2…` |
| 68 | 23:40 | Unread counts correct; blocked-accounts list | DONE | `20260929001906…`; `app/(app)/settings/privacy/blocked` |
| 69 | 23:40 | Per-row RLS rewrite (agents, listings, stays_search) | DONE | `perf_db_1`, `perf_db_2` |
| 70 | 23:40 | Shell: 9 DB calls down to one plus `getClaims` | DONE | `perf_db_4…` (`public.shell_context()`), `lib/actions/session.ts`, `lib/app/shell-queries.ts` |
| 71 | 23:40 | Twelve custom dialogs moved onto the shared Sheet | DONE | `components/ui/hand-rolled-sheets.test.ts` |
| 72 | 23:40 | Migration integrity plus a CI check | DONE | `scripts/check-migrations.mjs`, `APPLIED.txt`, `RENAMED.txt`, the ci.yml step |
| 73 | 23:40 | Stale docs ("dark only", live wallet) | DONE | Banners on `THE_AUDIT.md:5`, `THE_HUNDRED.md:5`; the terms have no wallet (`lib/legal/terms.tsx:64`) |
| 74 | 23:40 | A member reply bumps the support ticket in the queue | DONE | `20260929001306_db2_a_member_reply_moves_the_ticket_up…`; reading does not move it (`010610`) |
| 75 | 23:40 | SCUML rebuilt on live tables, complete | DONE in code; keys and sanctions lists are FOUNDER ACTION | `scuml_17`, `6`, `7`, `8`, `20_15` migrations; `docs/COMPLIANCE_SCUML.md`; double-audited |
| 76 | 23:40 | Money backlog (caution, flatmate split, refund clock, move-in quote, step-up) | DONE | `money_v13`, `v24`, `v36_v47`, `v54`, `v86` migrations; double-audited |
| 77 | 23:40 | Paystack sandbox: build with env placeholders | DONE; keys are FOUNDER ACTION | `lib/payments/paystack-mode.ts:17-54` (`PAYSTACK_TEST_SECRET_KEY`) |
| 78 | 23:40 | Verify `VALLO_PUBLIC_CATALOGUE` end to end on production | PARTIAL | Checked in this audit on production with a signed-out GET: `/search`, `/stays` and `/restaurants` answer 200; `/home` answers 307 to sign-in; `/api/map/listings` without a valid query answers 400. The per-IP rate limit was not load-tested (by rule, no hammering of production), and no detail page was sampled |
| 79 | 09-29 00:06 | Public repo: run full CI on main and fix any regressions | DONE | main green; database probes 54/54 once the secret was added |
| 80 | 23:40 | KYC: the founder tests after merge | FOUNDER ACTION | |
| 81 | 01:12, 01:37, 01:40, 04:30 | Process: keep agents running, re-audit twice before commit, auto-resume at 03:20 UTC, CI for all | DONE | `docs/HANDOFF_2026-09-29.md`; WIP snapshots; the send_later resume |
| 82 | 04:50 | "audit all end to end… let me see the sign in and sign up… icons bold" | DONE | `docs/E2E_AUDIT_2026-09-29.md`; screenshots sent; `trace/signin-*`, `trace/signup-*` |
| 83 | 09:52 | This trace | DONE | this file |

## C. Issues the agents found and left open

| # | Issue | Status | Evidence / next step |
|---|---|---|---|
| C-1 | Listings: exact coordinates are readable signed out; address, landmark and review notes are readable by any member | FOUNDER ACTION (a Supabase test branch) | It broke live on 24 September when tried; do not apply blind |
| C-2 | Leaked-password protection is off | FOUNDER ACTION | Supabase Auth dashboard |
| C-3 | E2E M-1: the checkout and rent pay bar covers the last paragraph | DONE | `app/(app)/checkout/[bookingId]/PayPanel.tsx:459-470` (the spacer is the last child); the same in `rent/pay/[inspectionId]/PayPanel.tsx:326-335` |
| C-4 | E2E M-2: host nav was English only | DONE | `components/host/host-nav-model.ts:26-60` (`hostNavLabels(t)`) |
| C-5 | E2E L-1: the saved-card row wraps | DONE | `components/app/payments/SavedCardPicker.tsx` (+ `saved-card-picker.dom.test.tsx`) |
| C-6 | E2E L-2: admin refusals without a next step; raw codes | DONE | `6e86e7b9` (business, email-recovery, kyc and member actions; `draft-matches.ts`; `device-alert-actions.ts`) |
| C-7 | E2E L-3: the sign-in password placeholder showed the sign-up rule | DONE | `sign-in-neutral.test.ts`; `trace/signin-email-390-dark.png` says "Your password" |
| C-8 | E2E L-4: `/auth/callback?error` used a streamed meta refresh | DONE | `proxy.ts:410-465` (a real 307) |
| C-9 | E2E L-5: the tour opened from sign-up said Skip | DONE | `FirstRun.tsx:118-127` |
| C-10 | E2E L-6: a stale `/start` comment; `/styleguide` gated while listed in robots | Comment DONE (`SiteHeader.tsx`); styleguide belongs to the spec refresh | |
| C-11 | E2E L-7: the verify button did not match | DONE | `VerifyCodeForm.tsx:196` (`AuthPillButton`) |
| C-12 | E2E L-8: React state update before mount (flaky under load) | Open, low | Watch on a production build |
| C-13 | E2E L-9, L-10: preview-only realtime socket and profile harness | Open, dev-only | |
| C-14 | E2E L-11: 67 of 88 browser specs are stale | In progress (spec-refresh agent) | `apps/web/tests/*` |
| C-15 | O-1: the Turbopack dev cache reached 24 GB and filled the disk | Ops | Clear `apps/web/.next/dev/cache/turbopack` between sessions (disk 36% now) |
| C-16 | A full reload into the app flashes the landing loading screen | NOT DONE | Brief B-3 |
| C-17 | The member (non-agent) desktop rail is about 27px too tall at 1440×900, so Settings is cut off | NOT DONE (low) | Auto-scroll to the current row mitigates it (`NavTree.tsx:86-97`). Tighten `.nf-nav--rail` row padding under `max-height: 56rem` |
| C-18 | 129 KB of shared CSS blocks first paint | NOT DONE | Brief B-4 |
| C-19 | Saving a card (the ₦100 check) always reads pending, so it gets no success card | DONE (B-6, tests with mocked Paystack only; no live call) | `confirmCardSetup` in `lib/payments/methods-actions.ts`, rules in `lib/payments/card-setup.ts`, "Card saved" moment; see B-6 |
| C-20 | A forged `?done=` stays visible in the address bar (it opens nothing) | Open, cosmetic | `router.replace` the param away on site pages |
| C-21 | Feed follow-ups: video posts; deleting your own story comment; report notifications don't link to the post (letter-case mismatch) | (a) DONE in code, (b) DONE in code and switched on by a migration awaiting approval, (c) BRIEF only | See B-7. Migration `supabase/migrations/pending/20260929120000_b7_report_links_and_own_story_comment_removal.sql` is NOT applied |
| C-22 | 12 dev-only preview pages overflow at small widths | Open, dev-only | |
| C-23 | `apps/web/scripts/write-shell-config.mjs:40` `console.log` | Not a bug | A CLI script reporting what it wrote |
| C-24 | Crypto HMAC timestamp check | Waits on the provider's docs | FOUNDER ACTION (Yellow Card) |
| C-25 | Email lifecycle triggers are in `pending/` | Lead action after deploy | #33 |
| C-26 | Store screenshots on main show the old auth design | FOUNDER / native session | Retake after deploy |
| C-27 | Product calls: "Book a viewing" in Create goes to `/search`; a sent-back stay agreement can only be cancelled; who may submit the rental report; the repeated "One account" headlines (the landing agent is writing distinct heads) | FOUNDER ACTION | |
| C-28 | Hausa, Yoruba and Igbo translations for the new strings (auth, passcode, success, HEIC) | FOUNDER ACTION | They fall back to English |
| C-29 | QA member and admin passwords, so signed-in flows are tested with real data | FOUNDER ACTION | E2E "Limits" |
| C-30 | Vercel: confirm the function region is dub1 and Fluid Compute is on; MCP access to `read-it-well-web` | FOUNDER ACTION | |
| C-31 | Store reviewer passcode seed | FOUNDER ACTION at submission | `docs/store/STORE_SUBMISSION_NOTES.md` |
| C-32 | **New.** The workspace bar is white in light mode, while the app header is a navy island | Open, taste call | `trace/agent-390-light.png`. The founder asked for navy islands on "header", and the workspaces follow `nf-glass--chrome`. If he wants the navy band there too: add `data-theme="dark"` to `WorkspaceHeader.tsx:53` plus the same ground rule as `light.css:156-160` |
| C-33 | **New.** The listing preview's Amenities section rendered empty in a full-page capture | Needs a look (likely a reveal animation that never fired in a full-page shot) | `trace/listing-390-light.png` |

---

## Fix briefs for what remains

**B-1. Slate sign-in on one screen (#20).** The reference puts email, password, Forgot, the pill button, "Or" and the provider circles on one screen. Vallo splits it: `/sign-in` asks for the email, then `/sign-in/email`.
- **Product call:** keep the email-first split (it serves account-enumeration neutrality and magic-link routing), or collapse it to one screen.
- **If collapsing:** render `components/auth/fields.tsx`'s password field on `/sign-in`, post to the same `signInWithPassword` action, and keep the neutral refusal.
- **Owner:** auth. **Size:** medium.
- **CLOSED (29 Sep):** collapsed to one screen. `/sign-in` draws `EmailAuthForm` (email, password, Forgot, pill, "Or", round doors) posting to the same `signInWithEmail` (both rate limits, the neutral refusal, `next` re-checked). The notice lookup and first-run gate are unchanged; a prefilled address (`?email=` or the old chooser cookie) still gets the "google"-only lookup, and "none" still draws the plain password step. `/sign-in/email` forwards to `/sign-in` carrying `next`, `email` and `notice`. E2E specs moved to `#email` + `#password` on one screen. Shots: scratchpad `authB/signin-*-390-{light,dark}.png`.

**B-2. The social account terms step (#21).** This must exist before Google or Apple is switched on.
- **The step:** after `verifyEmailLinkOrCode` / the OAuth callback succeeds and `socialProviderOfSession` is non-null for a profile with no `terms_accepted_at`, redirect to a new `/sign-up/finish` screen. It uses `AcceptTerms` plus the 18+ tick and calls `recordTermsAcceptance(user.id, "signup_social", …)`.
- **Enforcement:** block `/home` in `proxy.ts` until the step is done (reuse the first-run gate pattern in `app/(auth)/sign-in/first-run-gate.ts`).
- **Tests:** in `lib/auth/providers.test.ts` and the callback.
- **Then, founder:** enable Apple in Supabase, and set `VALLO_SOCIAL_SIGN_IN=google` with the Google provider on.
- **Size:** medium.
- **CLOSED (29 Sep), code side:** `/sign-up/finish` (`FinishSetupForm`: name prefilled from the provider, the 18+ tick and the terms tick) calls `finishSocialSetup`, which refuses without the current terms version and `18+` on the server, writes `recordTermsAcceptance(user.id, "signup_oauth", { ageConfirmed: true })`, reads the receipt back before moving on, then lands on `next` with the "account-created" success cookie. The callback and `signInWithAppleIdToken` route a social-only account with no complete record there. The gate is in `proxy.ts` (runs on every navigation, unlike a layout): social-only accounts without the service-role `app_metadata.vallo_setup_done` flag read their own `terms_acceptances` rows under RLS; never holds the step, `/legal/*`, public pages, `/api`, or server actions (sign-out); a failed read lets through. No migration: the existing table, RLS select-own policy and writer are reused. The founder steps above still stand.

**B-3. The landing loader flash on a full reload (C-16).**
- **Cause:** `app/loading.tsx` (the landing-shaped skeleton) wraps every segment, including `(app)`.
- **Fix:** move `/` and its loader into a `(site)` or `(landing)` route group, so `(app)/loading.tsx` is the only boundary above app routes. Check `node_modules/next/dist/docs/` for route-group loading semantics in this Next version first.
- **Size:** medium; touches the landing agent's area, so sequence it after that agent.

**B-4. Global CSS weight (C-18).**
- **The weight:** `globals.css` bundles 55 partials, about 129 KB.
- **Fix:** move route-only partials (`landing*.css`, `admin.css`, `agent.css`, `passcode.css`, `success.css`, `price-check.css`, `inspection.css`) to imports from their route layouts.
- **Checks:** re-run `check-css-tokens.mjs` (it parses from `globals.css`, so it needs a list of entry points) and measure with `next build`.
- **Size:** medium.

**B-5. Glow, glass and button reduction (#44, #45).**
- **Goal, per screen:** one primary lit action; cards on `--nf-elev-*` without glow; glass only on chrome, sheets and the dock.
- **Method:** start from `grep -n "var(--nf-glow" app/css/*.css` (181) and `backdrop-filter` (131), screen by screen, with before and after pairs at 390 in both themes.
- **Buttons:** move the 429 raw `<button>`s that carry an `nf-btn` class onto `components/ui/Button`, file group by file group, with `button-classes.test.ts` guarding.
- **Size:** large (a dedicated design agent).

**B-6. The saved-card ₦100 check (C-19). CLOSED 29 September.**
- **Why it always read pending:** the in-app checkout confirmed the setup with `paymentState`, which only knows booking references (`rm-book-`) and reads the booking settlement's `transactions` row. A card setup is an `rm-fund-` charge and never has one. Worse, nothing filed the card: the webhook treats every `rm-fund-` charge as a retired wallet top-up and refunds it without reading `save_card`.
- **The fix:** `confirmCardSetup(reference)` (`lib/payments/methods-actions.ts`), judged by `judgeCardSetupCharge` (`lib/payments/card-setup.ts`). It asks Paystack's verify and files the card only when all of these hold: our own audit row says this person opened this setup; the charge's metadata (written by our server) names this person and `purpose: card-setup`; the status is `success` (or `reversed`, because the webhook refund can land first); NGN; exactly ₦100; a reusable token. The card is written by the existing service-role `savePaymentMethodFromCharge`, keyed on the card signature, so a repeat is a refresh. "A card was saved" is announced once. The panel shows `SuccessSheet` "Card saved" on `saved` only; pending keeps the confirming state; a refused check says what happens to the ₦100.
- **The ₦100 is unchanged:** the webhook still refunds every `rm-fund-` charge to the card in full (`wallet_retired`), and the sweep does the same for one the webhook missed. Nothing is credited. The copy now says so before the tap ("We charge ₦100 to check the card and return it to the same card in full") and after ("goes back to the same card").
- **Counted:** new money-limit row `confirmCardSetup` (`card_setup_confirm`, 30 in 10 minutes), because every poll is a Paystack verify.
- **Tests:** `lib/payments/card-setup.test.ts`, with mocked Paystack answers for success, reversed, pending (six statuses and a timeout), failed, wrong user (by metadata, and by our own record, where Paystack is never asked), wrong amount, wrong currency and a non-reusable token. No test can reach Paystack.
- **Left:** the webhook itself still does not file the card, so a person who closes the tab before the confirm lands gets the ₦100 back and no card. Filing it there means touching the retired-wallet `rm-fund-` branch, which was out of bounds for this pass. A founder check with sandbox keys is still worth doing once they exist.

**B-7. The feed follow-ups (C-21). CLOSED 29 September, except (c), which is a brief.**
- **(a) The report notification link. DONE.** `private.notify_report()` links with a case-sensitive `when 'post'`; the social actions wrote `POST`, `STORY_COMMENT` and `SOCIAL_PROFILE`, so every social "Report received" linked to `/notifications`. The actions now write lower case from one place (`lib/social/report-kinds.ts`), which fixes post reports against the live trigger with no migration. The reporter's own list has words for all three. The link carries an id only and opens the post page, which renders the same not found for a removed, held or blocked post as for one that never existed, so a reporter sees nothing policy hides. The pending migration (below) makes the trigger case-insensitive, links a story comment to its story and a profile to `/u/<handle>`, lower-cases old rows and repoints the notifications they already sent.
- **(b) Deleting your own story comment. DONE in code; switched on by the migration.** Deletion stays soft (`status = REMOVED`, like posts and stories), because `parent_id` cascades and a hard delete would take other people's replies. So there is still no DELETE policy, by design. The author could already do the update under `story_comments_update_own`, but the status trigger would then tell them their comment "broke the rules". The migration silences that for a self-deletion and adds `public.remove_own_story_comment(uuid)`, SECURITY INVOKER (held to the caller's RLS: own row, LIVE only). `deleteStoryComment` calls it; until the migration is applied it answers "Deleting a comment is not switched on yet." The comments sheet already had the menu item; `StoryViewer` now passes `onDelete`. A held comment still cannot be deleted by its author (the policy covers LIVE only; widening it would let an author touch a row a moderator is deciding). Tests: `lib/social/feed-followups.test.ts`.
- **Migration awaiting approval (NOT applied):** `supabase/migrations/pending/20260929120000_b7_report_links_and_own_story_comment_removal.sql`. It weakens no policy, adds no delete policy, and reads itself back.
- **(c) Video in posts and stories. NOT BUILT: the pipeline does not exist.** What exists: the `social-media` bucket already accepts `video/mp4`, `video/quicktime`, `video/webm` up to 50 MB (`20260809051809`, applied), and listings have a resumable (tus) uploader (`lib/agent/resumable-upload.ts`, `VideoWalkthrough.tsx`) with a poster stored separately. What does not: any transcode (no ffmpeg, no edge function, no provider), any way for `post_media` to say a row is a video (it has only `storage_path`, `width`, `height`, `position`), duration or poster columns, a `stories` video column (`image_path` is `not null`), a client picker that accepts video (`POST_IMAGE_TYPES` is three image types), and moderation for video (the scanner reads text; photos are reviewed as stills).
  - **Decisions for the founder:** (1) transcode or not. Serving the phone's original `.mov` means HEVC files that Android and Chrome cannot play; a hosted service (Mux, Cloudflare Stream) costs per minute stored and streamed, and a self-run ffmpeg worker needs somewhere to run. (2) Length and size caps (suggest 60 seconds, 50 MB, matching the bucket). (3) Whether stories get video at all, or posts only. (4) How video is moderated before it is public (held until a person looks, like a scanned comment, is the cautious default).
  - **Build, once decided:** a migration adding `kind` (`image`\|`video`), `mime_type`, `duration_seconds` and `poster_path` to `post_media` (and a nullable `video_path` on `stories`, relaxing `image_path` to "one of the two"), with the object's real size and type read back from storage, as `addVideo` does for listings; reuse `resumableUpload` in the composer; a transcode step that writes an H.264 MP4 and a poster and only then marks the row playable; a `<video>` card with the poster, muted autoplay off by default and no preload on cellular; the CSP `media-src` entry for the signed URLs; and purge and account-deletion coverage (both already list the `social-media` bucket). **Size:** large, one agent for the pipeline and one for the UI, after the decision.

---

## Counts

Items 1–83 in sections A and B (founder requests), plus 33 agent-found items in section C.

| Status | Founder requests (A+B) | Agent-found (C) |
|---|---|---|
| DONE | 58 | 13 (C-19 closed by B-6) |
| FIXED NOW (in this audit) | 3 (#8 logo lap everywhere; #45 undefined button class; #65 HEIC copy) | 0 |
| PARTIAL | 10 (#20, 21, 30, 31, 33, 34, 45 rest, 59, 78 and parts of 75/77 by keys) | 1 (C-21: migration awaiting approval, video is a brief) |
| NOT DONE | 1 (#44 glow reduction) plus the code half of #21 | 3 (C-16, 17, 18) |
| FOUNDER ACTION | 5 (#21 providers, 36, 49/80, 51 device check, 75/77 keys) | 10 (C-1, 2, 24, 26–31) |
| SUPERSEDED | 4 (#1 in part, #2, #3, #37) | 0 |
| Open, low / dev / ops / taste | n/a | 16 |

The counts overlap where an item has a code half and a founder half; each such item is counted once, under its code status.
