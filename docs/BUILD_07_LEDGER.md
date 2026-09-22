# BUILD 07: the direct platform

Opened 22 September 2026. This ledger governs the week that begins with
`docs/HANDOFF_09_THE_DIRECT_PLATFORM.md`, which alters what Vallo IS and
therefore outranks `HANDOFF_08_THE_NEW_WEEK.md` and the standing
`HANDOFF_05_UPGRADED_WIDE_PLATFORM_BUILD.md` wherever the three disagree.

**The sentence that governs the platform now.** Vallo does not remove the
agent. Vallo removes the runaround.

**The sentence that governs this week's work.** Nobody leaves Vallo. Every
payment, verification, document, map, share and support route completes inside
our own chrome. The only permitted exit is the user's own mail application,
because they chose to be emailed.

---

## 0. The rules, restated, and the stop list

Every worker restates these in its first report, before its first edit. They
are carried forward from BUILD 06 section 0 unchanged. A rule is not softened
by being restated briefly.

1. Zero em dashes anywhere: code, copy, docs, commit messages. British
   spelling.
2. Money is integer kobo as bigint. `Math.round(naira * 100)` at the boundary
   only, and `formatMoney` is the only thing that prints it.
3. The platform charges no fees anywhere in copy. A processor's cut is the
   processor's, and it is named as theirs.
4. Every server action returns the `ActionResult` envelope; sessions come from
   `resolveSession()`.
5. `BrandIcon` and `UiIcon` only. No text baked into an icon, ever.
6. 390px first, in dark, then wider, then light. A finding that only works in
   dark is half a finding.
7. Dark is the default and the OS does not override it. Light is a designed
   paper twin, not an inversion.
8. One blue family. Emerald success, rose error, bright cyan PENDING and
   nothing else. No orange, amber, gold, purple, violet or magenta.
9. No raw colours, no raw spacing. Use the scale or extend it deliberately.
   Never disable a lint rule.
10. Motion is physics, not decoration, and `prefers-reduced-motion` turns all
    of it off.
11. Escrow is promised nowhere until it operates.
12. First-party trust is sacred: the verified badge only ever means a human
    was checked.
13. Banned in UI copy: demo, sample, preview, not live, coming soon, lorem.
14. The brand is Vallo. VALLO SPACES LTD appears only on legal surfaces.
15. No dark patterns, and no invented numbers. A count the database cannot
    produce is not printed.
16. Never log or paste a NIN, document number, card number, bank account or
    any other personal datum.
17. Secrets live in the environment and in Vault, nowhere else.
18. Never say committed, pushed, tested, verified, compliant or done unless it
    is true, and report what was skipped unprompted.
19. The ONE LAW decides done: UI action, validated server action, a write that
    survives RLS, UI showing the new reality, the notification, and a test.
20. The standard is not "does it work". It is "would a funded design team have
    shipped this".
21. BORN LOCKED, NEVER BORN PUBLIC. Every migration that creates a
    `SECURITY DEFINER` function revokes `EXECUTE` from `anon` and
    `authenticated` in the same migration, and the probe proves the revoke.
22. THE AUTH SCREEN IS DARK IN BOTH THEMES, PERMANENTLY, and it is not
    reopened.

**The stop list, absolute:** merchant-of-record exposure or any float;
spending money or new paid vendors; destructive database operations (drops,
data-losing migrations, revokes of something somebody legitimately holds); git
history rewriting; remote branch deletion; native app identifiers;
`HANDOFF_01` legal ground; writing test rows to live product tables; relaxing
`messages.sender_id`; rendering any partner row before the label and the
fulfilment-honest CTA exist; wallet or saved cards anywhere in a third-party
flow; scraping; Amadeus; shipping an image asset without compression and
sizing through `next/image`; and letting a reference image's off-brand detail
into the product.

**The design law in one line.** The reference images are the target; match
composition, hierarchy, glow, glass depth, spacing rhythm and mood through the
token system; translate the renders' mistakes per `DESIGN_DIRECTION.md`
section 1; every surface without an image inherits the register; and A CONTROL
THAT CARRIES TEXT IS A ROUNDED RECTANGLE ON `--nf-radius-control` AND NEVER A
CAPSULE, with only an avatar and a bare icon-only control drawn round in a
governing image staying round. THE TEST IS THE RATIO OF THE DRAWN RADIUS TO
THE DRAWN SHORT SIDE, never the token name: at or above 0.5 it is a capsule
however it was spelled. This law has now been broken more than thirty times
with every source grep passing, which is why the ratio and not the name.

---

## 1. The baseline, measured today before any work

Taken on the tree at `118bdfc`, from `apps/web`, on a quiet box (load 1.2).
These four are the floor. A worker that makes one of them worse has not
finished.

| Gate | Command | Result |
| --- | --- | --- |
| Typecheck | `npx tsc --noEmit -p tsconfig.json` | **exit 0**, no diagnostics |
| Lint | `npx eslint src` | **exit 0**, 339 problems, 0 errors, 339 warnings |
| Test | `npx vitest run` | **129 files, 2244 tests, all passed** |
| Build | `NEXT_DIST_DIR=.next-baseline npx next build` | **exit 0** |

The 339 lint warnings are pre-existing `nf/no-arbitrary-font-size`,
`nf/no-raw-spacing` and `react-hooks` advisories spread across the tree. The
count is recorded so that a worker adding one is visible.

---

## 2. The first hour, and what it found

**The working tree was not empty.** Four agents were killed mid-stint by the
weekly limit on 20 September and left 696 insertions across 20 files. That
work gated clean on all four checks above, so it was landed rather than
discarded, as `118bdfc`. It carried the cross-scope backlog five sweep workers
had each correctly refused to touch, the first light-mode work, and a defect
in the sweep register itself.

**THE SWEEP REGISTER COULD NEVER COUNT A HYPHENATED ROUTE, and that is mine.**
It split a proof file name on hyphens and asked whether the route's key was one
of the pieces, so `sign-in-390-dark` becomes `["sign","in","390","dark"]`,
which does not contain `sign-in` and never will, whatever the file is called.
The whole auth front door plus `/forgot-password`, `/reset-password`,
`/delete-account`, `/rent/move-in` and `/auth/callback` were reported unproven
for structural reasons rather than for want of a proof. The "49 of 129" in the
last report to the founder was too LOW, not too high.

**THE CATALOGUE WAS A MAP WITH THE MOST IMPORTANT ROADS MISSING.**
`docs/design/CATALOGUE.md` indexed only the top level of
`docs/design/references/` and had never once mentioned either subfolder.
`references/founder/` holds eleven of the founder's own files and
`references/roles/` holds the twelve governing images of 22 September. Every
worker doing image work has been reading a stale map. Both folders are now
indexed, with the ordering rule written at the top: A FOUNDER TARGET BEATS A
GENERATED RENDER, ALWAYS.

And the index records a distinction the folder names carry but nothing stated:
a file named `-target` is what a surface SHOULD look like and governs the
work; a file named `-as-shipped` is a photograph of OUR OWN LIVE PRODUCT that
the founder sent to show a defect. An as-shipped file governs NOTHING. Building
towards one would be building towards the bug. Five of the eleven are defect
captures.

Two of the founder's targets carry off-brand detail that rule 15 and rule 5
forbid and that is recorded beside them rather than left to be copied:
`GOVERNING-home-markets-target-2.jpg` prints an invented count on every tile
and bakes the word HOTEL into an icon, and `landing-fullpage-target.png`
prints "10K+ Properties, 5K+ Happy Clients, 200+ Agents", which are the exact
invented numbers `stat-tiles.ts` already exists to refuse.

---

## 3. Worker scopes, strictly non overlapping

Eight workers in three groups, plus the lead. The split is the founder's own.

| Group | Workers | Owns |
| --- | --- | --- |
| A | A1, A2, A3 | The standing HANDOFF 05 work: backend B0 to B7 and the image driven frontend sweep F1 to F5. B0 first. |
| B | B1, B2, B3 | HANDOFF 09 except the supply pipeline: positioning and headline, Track G supply roles, Track O the switch, Track H fee transparency, Track I Price Check stage one. Plus HANDOFF 08 Track L light mode and Track M the drift and the wallet. |
| C | C1, C2 | Track N in full. C1 the property side, C2 the stays side. |

**THE THREE KNOWN COLLISION POINTS AND THE RULE FOR EACH.**

1. **Group B owns `packages/design-tokens` and every stylesheet.** Group A and
   Group C never edit CSS. A CSS finding is a line in their report.
2. **Group C owns the listing and host schemas and their wizards.** Group B's
   Track H writes the cost model INTO Group C's schema by handing it to the
   queue, never by editing it.
3. **All three groups will want `packages/i18n`.** A worker may only ADD keys,
   with the Edit tool, inside its own namespace object, in all four locales,
   and never restructure the file. Two agents have already collided there once
   and the second silently overwrote the first's finished work.

**The lead** owns this ledger, writes every scope, re-audits and commits
everything, and personally carries the twelve cheap bleeding fixes, because
they are small and spread across everybody's files and handing them out would
cause exactly the collisions this split exists to avoid.

---

## 4. What is NOT staffed, said plainly

Never let an unstaffed track look staffed. This list is re-stated every cycle.

| Track | State |
| --- | --- |
| HANDOFF 08 Track A, the twenty eight departures | **UNSTAFFED.** First to be picked up as Group A's items close, because the founder ruled on it. |
| HANDOFF 08 Track D, the store refusals | **UNSTAFFED.** Second, because it gates submission. |
| HANDOFF 09 Track J, escrow | **UNSTAFFED.** Third, and only its non custody work. |
| HANDOFF 08 Track B, the emails | **PARTLY.** Group C builds the email and notification junction because Track N needs it; Track B inherits it. The templates themselves are unstaffed. |
| HANDOFF 08 Track C, notifications | **PARTLY**, same junction, same inheritance. Push is entirely unstaffed. |

---

## 5. Needs the founder

Re-stated every cycle until each one closes. Nothing here is this session's
work and nothing waits on it that can be built around.

| Item | Why it is his |
| --- | --- |
| `vallo_site_url` in Supabase Vault | **THE MOST URGENT ITEM ON THIS LIST.** It points at a per-deployment Vercel URL that no longer exists instead of the stable production alias, so the ONLY job that recovers a Paystack charge whose webhook never arrived has been dead since 29 AUGUST. Verified by the lead against the live database: the last `wallet.reconciliation.run` audit row is 29 August, and `net._http_response` holds six 404s in the last twenty four hours whose body reads `DEPLOYMENT_NOT_FOUND`. The scheduler reported `succeeded` every hour throughout, because the function fires an asynchronous request and never reads the answer. One Vault value fixes it and only the founder can set it. |
| Email sending: NEITHER custom SMTP NOR the Send Email Hook is configured | **REAL PEOPLE HAVE ALREADY FAILED TO CREATE ACCOUNTS BECAUSE OF THIS AND NOTHING SAID SO.** Verified by the lead in the live auth logs for 12 September: exactly TWO `mail.send` events, both from `noreply@mail.app.supabase.io`, which is Supabase's built in SHARED sender and which Supabase documents as non production; then THREE consecutive `429: email rate limit exceeded`. Two delivered and then everything refused inside one hour is the built in service's cap, which custom SMTP's allowance would not have come near at three sign ups in four minutes. The existence of a `mail.send` event is also proof the hook is off, because with the hook on GoTrue does not send at all. Both code paths are kept: deleting the loser before he chooses would decide it by attrition, and it is a dashboard action. |
| Whether the five generated auth templates were ever pasted into the dashboard | Unknowable from here. The Email Templates render through whichever sender carries them, so our generated copy is live if it was pasted and Supabase's own default wording is live if it was not. |
| Five rows of a PROBE that were committed to live product tables instead of rolled back | Migration `20260919181950` is not a migration. It forges JWT claims, holds a table, proves a stranger cannot read the reservation or the messages, and then ENDS ON AN UPDATE RATHER THAN A RAISE, so it committed. Its rows are still live: a `businesses` row it demoted to DRAFT, THE ONE RESERVATION THIS PLATFORM HAS, a `conversations` row and two `messages` rows. Writing test rows to live product tables is on the stop list and this one is already past it. A1 transcribed it verbatim and did NOT correct it, which is right, because an applied migration is a record of what ran. Whether those five rows stay is the founder's: removing them is data-losing on live tables. |
| Leaked password protection | One click in the Supabase dashboard. Still disabled. |
| `NEXT_PUBLIC_MAPTILER_KEY` | Unset, so a commercial marketplace is serving non commercial basemap tiles. |
| Real supply | 64 listings, 64 published, 64 of 64 `is_demo`. The engine is real and the shop is empty. Ours is to stop the product claiming otherwise. |
| The deep link fingerprints | `assetlinks.json` carries two placeholder SHA-256 values and the Apple file carries `PLACEHOLDER_REPLACE_WITH_APPLE_TEAM_ID`. They come from his keystore and his developer account. Ours is to make the failure LOUD rather than silent. |
| A demo account for the stores | Both stores require credentials a reviewer can sign in with. Ours is the seeding script, ready the moment he supplies the login. |
| The solicitor's answer on custody | No code path that places the company in custody of third party naira ships until it is recorded here. |
| `agents.verified` | Now a derived copy of `agent_badges.verified`. Dropping the column is data-losing and on the stop list. |
| **Auth email is not actually sending** | **MEASURED, not inferred, on 22 September.** Neither route is live. `auth_logs` carry two `mail.send` events, both `mail_from: noreply@mail.app.supabase.io`, which is Supabase's built-in non-production sender: custom SMTP was never applied, and the hook cannot be on or GoTrue would not be sending at all. Three consecutive sign-ups on 12 September then failed `429 over_email_send_rate_limit` at 09:41, 09:43 and 09:44, which is the built-in cap and not custom SMTP's thirty an hour. Real people could not create accounts and nothing said so. The fix is one dashboard settings page and the choice between the routes is his; the arguments are in the research file 1.8 and 1.9, and `AUTH_EMAILS.md` section 1A now records the measurement. Neither code path was deleted, because deleting the loser before he chooses would decide it by attrition. |
| Whether the five auth templates were ever pasted in | The dashboard renders its Email Templates whichever sender carries them, so the generated files are live copy if they were pasted and Supabase's own default wording is live copy if they were not. This repository cannot read that, and it is the last open question about them. |
| The completed credit colour | The render draws it cyan, ours is emerald, and our colour law reserves cyan for PENDING. Emerald stays and the render is recorded as carrying a mistake unless he rules otherwise. |
| A live Paystack test card, and whether 3-D Secure renders INSIDE the iframe | Every Paystack host is 403 at this sandbox's proxy and there is no `PAYSTACK_SECRET_KEY` here, so N5 could prove neither. It refused to build the seven checkout call sites on an unproven assumption and it was right to: an in-app checkout that cannot complete a CHALLENGED card payment is worse than the redirect it replaces. Worse, the sweep's stated evidence for it turned out not to exist, see 8.2. One live test card answers it and the component is then one small commit. |
| Google's and Apple's sign-in branding pages | `developers.google.com` and `gstatic.com` are EGRESS_BLOCKED at the proxy, and `developer.apple.com` serves a JavaScript shell with no guideline text. A3 therefore shipped NEITHER mark, because drawing a four colour Google G from memory is shipping a guess about somebody else's trademark. Sign in with Apple being absent while Google is present is guideline 4.8 and an automatic refusal, so this blocks submission. |
| A live Paystack test card, in a browser we control | The in-app checkout cannot be proved in this sandbox. Every Paystack origin is refused by the egress proxy and no secret key exists here, so no transaction can be initialised and no frame can be loaded. Two of the three things the sweep asked to be proved before any UI is built remain unproved for that reason, and both are below. |
| Whether a Nigerian bank's 3-D Secure step renders INSIDE the checkout iframe or opens a window | This decides whether the in-app checkout is the win it looks like or a regression. If a bank opens a window, an in-app checkout that cannot complete a challenged card payment is worse than the redirect it replaces. The sweep's own evidence for "inside" was `PopupTransaction.getStatus()` and its `auth` state; that method is documented in the README of `@paystack/inline-js` v2.25.0 and IS NOT PRESENT IN ANY OF THE THREE SHIPPED BUILDS of that version, so the sweep's central inference rests on a method that does not exist. The shim carries no `window.open` and sets no `sandbox` attribute on the frame, which means nothing structurally prevents the framed document opening one. One test card answers this and nothing else will. |
| Whether a test card completes end to end inside the frame | Unproved, same reason. Until it is, no call site is moved off the hosted redirect: the CSP and the server half are landed, and the seven call sites are not. |
| The LASRERA figures, before a single string ships | B1. `ROLE_ARCHITECTURE_RESEARCH.md`'s honesty log records that `lasrera.lagosstate.gov.ng` was refused by the egress proxy and that every Nigerian legal claim in Parts 3 and 4 rests on a search index's summary of a page nobody read. So the penalty figures, the document set, the fee schedule, and whether registration binds a private landlord letting their own property at all, are all unconfirmed. **Nothing B1 shipped prints any of them.** LASRERA is named in the checklist copy as a field a person may fill in and as something a reader may filter on, and the copy never states what the law requires or what ignoring it costs. A spec in `lib/supply/roles.test.ts` fails if a percentage, a naira figure or a regulator's name reaches the door copy. It stays that way until a lawyer has read the statute and the register. |
| The two titling figures | B1. "Over 97 per cent of Nigerian land untitled" and "71.4 per cent of landlords with no title, 8.1 per cent with a C of O" measure different things, land area against sampled landlords, and both come through a search summary. The design conclusion holds under either, so what shipped is the BEHAVIOUR and not the number: "I have none of these" is a first class answer that reaches a published listing and never earns the words "ownership verified". No figure is printed anywhere in the product. |
| The ESVARBON section number and the tenancy percentages | B1, inherited from HANDOFF 09 section 7. Not reached by this scope, named here so the list is complete rather than only carrying what one worker touched. |

---

## 6. The gate, reinstated, and this time held

**A scope closes only with its row in this section.** That sentence was
written into BUILD 06 section 6 and then not held, and the proof of what that
costs is the wallet: the one family the founder named as worst is the one
family that never went through the gate. Five separate P1 proportion defects
accumulated there in silence.

A row needs: the surface, its governing image or the register it inherits, a
fresh proof taken on a PRODUCTION server, the measured ratio sweep result, and
the worker. No row, no close, and the lead does not commit it.

| Surface | Governing image | Proof | Ratio sweep | Worker |
| --- | --- | --- | --- | --- |
| `/start` | none, inherits the register | `a2/start-390-{dark,light}.png` | 0 breaches at 390 and 1536, dark and light | A2 |
| `/sign-in` | none, inherits the register | `a2/sign-in-390-{dark,light}.png` | 0 breaches at 390 and 1536, dark and light | A2 |
| `/sign-in/email` | none, inherits the register | `a2/sign-in-email-390-{dark,light}.png` | 0 breaches at 390 and 1536 | A2 |
| `/sign-up` | none, inherits the register | `a2/sign-up-390-{dark,light}.png` | 0 breaches at 390 and 1536, dark and light | A2 |
| `/sign-up/email` | none, inherits the register | `a2/sign-up-email-390-{dark,light}.png` | 0 breaches at 390 and 1536 | A2 |
| `/sign-up/verify` | none, inherits the register | `a2/sign-up-verify-390-{dark,light}.png` | 0 breaches at 390 and 1536 | A2 |
| `/forgot-password` | none, inherits the register | `a2/forgot-password-390-{dark,light}.png` | 0 breaches at 390 and 1536 | A2 |
| `/reset-password` | none, inherits the register | `a2/reset-password-390-{dark,light}.png` | 0 breaches at 390 and 1536 | A2 |
| `/about` | none, inherits the register | `a2/about-390-{dark,light}.png` | 0 breaches at 390 and 1536, dark and light | A2 |
| `/help` | none, inherits the register | `a2/help-390-{dark,light}.png` | 0 breaches at 390 and 1536, dark and light | A2 |
| `/contact` | none, inherits the register | `a2/contact-390-{dark,light}.png` | 0 breaches at 390 and 1536 | A2 |
| `/safety` | none, inherits the register | `a2/safety-390-{dark,light}.png` | 0 breaches at 390 and 1536 | A2 |
| `/standards` | none, inherits the register | `a2/standards-390-{dark,light}.png` | 0 breaches at 390 and 1536 | A2 |
| `/careers` | none, inherits the register | `a2/careers-390-{dark,light}.png` | 0 breaches at 390 and 1536, dark and light | A2 |
| `/docs` | none, inherits the register | `a2/docs-390-{dark,light}.png` | 0 breaches at 390 and 1536, dark and light | A2 |
| `/delete-account` | none, inherits the register | `a2/delete-account-390-{dark,light}.png` | 0 breaches at 390 and 1536 | A2 |
| `/cancellations` | none, inherits the register | `a2/cancellations-390-{dark,light}.png`, taken BEFORE the copy change below; the shape is unchanged, the hero is now two sentences rather than four, so the picture is one revision stale | 0 breaches at 390 and 1536, dark and light | A2 |
| `/privacy` | none, inherits the register | `a2/privacy-390-{dark,light}.png` | 0 breaches at 390 and 1536 | A2 |
| `/terms` | none, inherits the register | `a2/terms-390-{dark,light}.png` | 0 breaches at 390 and 1536 | A2 |
| The offline card, `apps/web/native-shell/index.html` | none, inherits the register; drawn to it for the first time | `a2/native-shell-no-connection-390-{dark,light}.png`, `a2/native-shell-no-server-390-{dark,light}.png` | measured in the browser: plate 0.27, button 0.28, card 0.07, note 0.12; the only circle is the explanatory glyph | A2 |
| The dock with the raised centre switch, on `/home` | `GOVERNING-01` screen one | `b1/dock-390-dark.png`, taken on `next start` at `6b7e21f` | dock object 18 on 52 = 0.346 | B1 |
| The Switch profile sheet | `GOVERNING-01` screen two | `b1/sheet-390-dark.png` | row marks 14 on 44 = 0.318; standing label 6 on 25 = 0.244 | B1 |
| The side drawer's Switch profile row | `GOVERNING-01` screen three | `b1/drawer-390-dark.png` | row 14 on 56 = 0.25 | B1 |


**THE GATE'S OWN MEASUREMENT, TAKEN BY A2b ON A CLEAN CHECKOUT OF `6c621e3`.**
Against the four floors in section 1: `tsc --noEmit` **exit 0**; `eslint src`
**338 problems, 0 errors**, which is one BELOW the recorded 339; `vitest run`
**147 files, 2641 tests, 1 FAILED**. The failure is real and it is on the
branch, not in anybody's working copy:
`src/lib/i18n/locale-completeness.test.ts` refuses because yo now renders 212
keys in English against a recorded ceiling of 211. `d6e00c9` added
`appMockLine: "Rent, buy or stay. Without the runaround."` to `yo.ts`, `ha.ts`
and `ig.ts` untranslated, on the argument that the approved position carries
the same three words in every locale. That argument may well be right, but the
gate exists precisely to catch an English string entering a translation file,
so it has to be answered rather than walked past. And the answer is probably
that the ceiling should rise: the test's own header names exactly one
legitimate cause for raising it, which is an English string that was ALREADY
on screen moving somewhere a completeness measure can see it, and that is what
happened here. The phone mock read `landing.slogan`, which yo does not
translate either, so it was drawing English before this commit and draws
English after it. Nothing on screen changed language; the count did. What is
missing is the deliberate act the header demands: the ceiling was never
raised, the reason was never written beside it, and the suite was never run.
That commit's message reports "The site component tests pass". It also touched
`ha.ts` and `ig.ts` with the same string, and the assertion stops at the first
failure, so those two ceilings want checking in the same move.

**ANSWERED AT `69bb135`, WHILE THIS WAS BEING WRITTEN, AND BY A BIGGER FINDING
THAN MINE.** All three ceilings are raised to the measured truth. The worker
who raised them found that yo had gone not to 212 but to 336, because the
`supply` namespace grew from 60 keys to 204 in English only, so `withFallback`
now serves 144 English strings across the three supplier registration forms of
`GOVERNING-03`, `04` and `05`. That is the first screen a new agent, owner or
firm ever reads, in English, on a Yoruba, Hausa or Igbo phone. The test floor
is green again and the real defect is Track G's, recorded in the test beside
the numbers. Left here rather than deleted, because a gate that quietly erases
the finding it raised teaches nobody anything. It is not this worker's file and it is not changed
here. **The test floor in section 1 is red until whoever owns `d6e00c9`
answers it.**

**AND A BUILD OF THE SHARED CHECKOUT IS NOT A BUILD OF THIS BRANCH, WHICH IS
WHY THREE WORKERS HAVE NOW BLAMED THE TIP FOR SOMEBODY ELSE'S HALF-WRITTEN
LINE.** `/home/user/read-it-well` carries the uncommitted work of every agent
in the stint, and `next build` compiles the WORKING TREE. A build run there is
a build of everybody's unfinished edits and its result says nothing about the
commit anyone is trying to gate. Measured today: a build of the shared
checkout failed to type check twice over, on
`src/lib/supply/registration-actions.ts:145` and on
`packages/i18n/src/locales/ha.ts:3567` (`partLegar` for `partLegal`), and
NEITHER is on the branch; the first file is untracked and the second is an
uncommitted modification. The same commit, checked out clean, is green. The
same fault has now been read as a fault in the tip three times: B1's
`build3.log` died on `search/page.tsx:103` over a `SortKey` that the clean tip
compiles, and B1 killed its own build waiter over it; A2 recorded that
`next build` had been failing on `main` since `a315170` and left four
`PageScene` screens unphotographed for that reason, when the cause it named
had already been fixed at `536a0cd`; and this worker's own first build died
the same way. **So a proof build is built from a clean checkout of the commit:
`git clone --shared /home/user/read-it-well <dir>`, check the commit out, copy
`.env.local`, and bring `node_modules` across with `cp -al` at BOTH the root
and `apps/web`. It costs a minute and it is the difference between gating your
own work and gating everybody's.**

**DO NOT SYMLINK `node_modules`, and this cost a whole build slot to learn.**
Turbopack refuses it outright and panics rather than failing cleanly:
`Symlink [project]/apps/web/node_modules is invalid, it points out of the
filesystem root`, a `TurbopackInternalError` with a panic log and no line of
our own code in it. `cp -al` is a hardlink copy: it is as fast as a symlink,
it costs almost nothing on disk because every file is shared, and Turbopack
walks it as an ordinary directory.

**A2's register extensions, recorded so the founder can check them.** The
twelve governing images draw none of the surfaces above, so every one of them
inherits. Four screens were given the register's brand object behind their
first line, which every other own-data screen in the product already had and
these four did not: `/notifications` (bell-badge), `/saved/searches`
(search-ring), `/verification` (shield-check) and `/profile/setup`
(keys-home). The offline card was drawn to the register from scratch: navy
ground with the aurora, the glass panel with its lit top rim, the brand
object on its rounded plate, the rounded rectangle control, and the calm
explanatory panel with its small round glyph.

**AND THE REGISTER NOW OVERCOUNTS TWO OF MY ROUTES, WHICH IS WORTH SAYING
BEFORE SOMEBODY READS IT AS COVERAGE.** A proof is matched to a surface by the
last real segment of its route appearing in the file name, so
`a2/privacy-390-dark.png` and `a2/terms-390-dark.png`, which are shots of the
PUBLIC `/privacy` and `/terms`, are also credited to `/legal/privacy` and
`/legal/terms`. Those two are the same documents inside the product shell and
they are behind the signed-in gate, so neither was photographed. The register
cannot tell the difference and there is no file name that would make it, since
any name carrying the word is credited to both. They are unproven.

**What A2 did NOT close, said plainly.** `/welcome`, `/saved`,
`/saved/searches`, `/trips`, `/notifications`, `/profile/setup`,
`/verification`, `/legal/privacy`, `/legal/terms` and `/docs/[slug]` carry no
row above.

`/verification` is the painful one, because it is the one of these that IS
reachable without a session and it was swept clean at both widths. It carries
no row only because the four surfaces given a `PageScene` cannot be
photographed after the change: **`next build` has been failing on `main` since
`a315170`**, on a re-export in a `"use server"` file
(`src/lib/social/posts-actions.ts:614`), which Turbopack refuses outright and
which then leaves that module with no exports at all, cascading to 58 errors
across the social tree. It is not my file and I have not touched it. Until it
is fixed nobody on this box can take a production proof of anything.
Everything except the last two is behind the signed-in gate in `proxy.ts` and
a stranger is redirected to `/sign-in`, so no proof of the route itself can be
taken without a session this worker does not have. Where a proof of the same
components exists it comes off the preview harness and says so; a preview is
not the route, and the two had drifted apart, which is recorded below.

**B1, Track O: every item that lived on the More surface, with its new home,
and the proof each one resolves.** The founder's instruction was that nothing
on More may become unreachable. The honest finding is that **More had no
contents of its own**: it was a `<button>` in the dock calling `openDrawer`,
not a destination, and there is no `/more` route anywhere in the tree
(`find apps/web/src/app -ipath "*more*"` returns nothing). So its contents are
the side drawer's contents, they have not moved, and the drawer now holds one
row MORE than it did rather than one fewer. The drawer's other opener, the
hamburger in the app header, renders on every route the dock renders on
(`AppShell` draws it whenever `showsHeader`, which is every in-app page that
is not immersive or edge to edge), so the surface is one tap away exactly as
it was. Item by item, from `buildNav`: Home `/home`, Search `/search`, Feed
`/around` (all three dock rows, hidden in the drawer below `lg` because the
dock carries them); Bookings `/bookings`, Inspections `/inspections`, Messages
`/messages`, Notifications `/notifications`, Saved `/saved`, Wallet `/wallet`,
AI Assistant `/assistant`; the workspace rows Agent Mode
`/agent/dashboard` and Console `/admin` for those who hold them; and the tail,
Add a workspace `/profile/setup` and Settings `/settings`. On the Stays side
Stays `/stays`, Explore `/stays/search` and Trips `/trips` replace their three
twins. Plus the foot: Switch profile (new), the coin, the theme row and the
legal row. `b1/more-proof` walks the open drawer on a production server and
fetches every `href` it draws.

**And Crypto came off that list twenty minutes after it was written, which is
A2b's correction rather than B1's error.** The list above read "Crypto
`/crypto`" when B1 recorded it at `94c61da`. At `906c571`, twenty minutes
later, N3 took crypto dark for the first submission: `/crypto` is now a
deliberate `notFound()` and `buildNav` no longer draws the row, on the stated
argument that a drawer row pointing at a 404 is worse than no row. So the
route is unreachable ON PURPOSE and the promise is not broken by it, but the
list had to stop naming it, because a row that does not exist cannot be proved
to still resolve and nobody reading this should go looking for one.

**B1's register extensions, recorded so they can be checked.** `GOVERNING-01`
and `02` govern everything this scope drew except three pieces of anatomy the
set uses everywhere and draws nowhere in isolation: the progress row of small
filled rectangles (`.nf-steprow`), the calm explanatory panel with its small
round glyph (`.nf-calmpanel`), and the workspace standing label
(`.nf-switch-standing`). All three are built from the register and the last is
the one the renders draw as a capsule.

**A2's three findings for Group B, who own every stylesheet.** Written here as
well as in the report, because a finding that lives only in a report dies with
it.

1. **The light theme puts near-black ink on the permanently dark auth screen,
   and it is a P1.** Measured on a production server: inside
   `main.nf-auth[data-theme="dark"]`, with the document in light, `color`
   computes to `rgb(22,24,29)` where dark gives `rgb(255,255,255)`. It reaches
   every element that inherits rather than setting its own colour, so
   "Find your next place" on `/start`, "Enter your code" on `/sign-up/verify`
   and "That link has expired" on `/reset-password` are all drawn black on
   navy. Proofs: `a2/start-390-light.png`, `a2/sign-up-verify-390-light.png`,
   `a2/reset-password-390-light.png`. The cause is that `color` is resolved on
   `body`, ABOVE the auth element, and redeclaring custom properties on a
   descendant cannot move a value that has already been resolved above it. The
   fix is one declaration in `auth.css` that re-resolves it inside the subtree,
   `.nf-auth { color: var(--nf-content-primary); }`. The layout's own comment
   predicted this class of leak and guarded only against selectors, not against
   inheritance.
2. **The footer's newsletter submit is a circle on every page that draws the
   footer.** `site.css`, `.nf-site-newsletter-field button`, `border-radius:
   var(--nf-radius-circle)`. Measured 40x40 with a 20px radius, ratio 0.50, on
   `/about`, `/help`, `/contact`, `/safety`, `/standards`, `/careers`, `/docs`,
   `/delete-account` and `/cancellations`, at 390 and 1536, in both themes. The
   design direction allows exactly one round icon-only control, the landing
   nav's search glyph. It cannot be fixed from the call site: the rule is an
   element selector inside a class, which outranks any class a component could
   add, and putting a style in the component is not mine to do.
3. **`/start`'s carousel pager draws its steps as pills** (`999px` on a 6px
   bar and a 6px dot) while the register's progress is a row of small filled
   rectangles, which is what `/verification`'s own step bar already draws. The
   token layer sanctions `--nf-radius-pill` for a progress cap, so this is a
   question for the founder rather than a breach, and it is recorded rather
   than changed.

**TWO OF THOSE THREE ARE ALREADY CLOSED, AND THE LEDGER WAS STILL CARRYING
THEM AS OPEN.** A2b checked each one against the tree rather than against the
report. Finding 1 is fixed: `auth.css:54` now reads
`.nf-auth { color: var(--nf-content-primary); }`, which is the exact
declaration A2 prescribed, landed at `95cef40`. Finding 2 is fixed:
`site.css:206` now reads `border-radius: var(--nf-radius-control)` on
`.nf-site-newsletter-field button`, 14px on 40px for a ratio of 0.35, and the
note above it records the reasoning and credits A2 by name. Finding 3 stands
unchanged, which is correct, because A2 filed it as a question for the founder
rather than as a breach. A finding that has been fixed and is still written
down as outstanding sends the next reader to re-fix it, so the state is
recorded beside the finding rather than left to be rediscovered.

**And one for whoever owns the app chrome.** The signed-out app header
overflows at 390 and CLIPS its primary control. Measured on `/verification`:
the actions group's right edge is 407px in a 390px viewport, so about 17px of
"Sign up" is cut off, and `document.scrollWidth` is 390, so nothing scrolls and
there is no way to reach the rest of it. `AppShell.tsx`, the row holding the
hamburger, the lockup, the spacer and `SignedOutActions`. It is on every
signed-out `(app)` route, not only mine, which is why A2 did not change shared
chrome unilaterally.

**And the preview harness was quietly lying about two of them.**
`/preview/f3/saved` and `/preview/f3/trips` drew their boards in a bare
`max-w-3xl` while the real pages draw them inside `nf-cat-surface` with a
`PageScene` behind the heading. `nf-cat-surface` is what lights every
`.nf-card` under it with the brand ring and its bloom, so every proof taken
off those two routes showed cards DULLER than the ones a person meets, with
the scene absent. Both now carry the real wrapper. A harness that drifts from
the page is the same failure as a screenshot of a 404, only quieter.

---

## 7. Landed

| Commit | What |
| --- | --- |
| `118bdfc` | The work four agents were holding when the week ran out. |
| `167c0bc` | BUILD 07 opens, and the catalogue indexes both reference subfolders. |
| `c6c03a9` | The RC number is a fact, and the landing search control stops drawing a quarter of itself as dead track. |
| `e1a48b0` | The three checking tools can see the paper theme. |
| `52560f8` | A toast primitive, where four surfaces had each invented one. |
| `907498d` | A capsule that passed every grep, and eight English strings in a four locale product. |
| `e59e780` | Freeing the track is not freeing the item: one cause, three symptoms. |
| `7aa8003` | The four escrow doors are locked and the trust numbers stop answering strangers. |
| `e1c8fd9` | The engine stops saying RentMe, and the migration that would have fixed it could never have run. |
| `5d93fc1` | The offline card designed, because it is the first surface a store reviewer meets. |
| `da1c629` | Three role vocabularies disagreed, and the assistant described a ladder with a rung that never existed. |

---

## 7A. THE TWELVE CHEAP BLEEDING FIXES, AUDITED ONE BY ONE

The founder listed twelve things that were small and were bleeding. This is
where each one stands, checked by reading the tree rather than by reading a
report. Two of them were corrected by the worker who did them, and both
corrections were improvements on the instruction.

| # | Item | State |
| --- | --- | --- |
| 1 | `ListingMoveIn.tsx`, 161 tested lines nothing imported | With Track H. The move-in model was ALREADY inside the wizard, summed live; the gap is the listing DETAIL page. |
| 2 | Search's four sorts all read the headline price | Landed. `move-in-asc` is in `SortKey` and the move in cost index is queried at last. The producer had to be landed by the lead because its consumer was committed without it. |
| 3 | Three segments, four columns, a quarter of the control dead | **LANDED.** Driven from `ORDER.length` through `--nf-seg-count`, the way `.nf-glass-seg` already did it. |
| 4 | `frame-src 'none'` blocks the in-app checkout | **LANDED**, narrowed to the two Paystack checkout hosts, never a wildcard, in a SEPARATE constant from the four-origin list `form-action` reads so widening one cannot silently widen the other. Both test surfaces moved in the same commit. |
| 5 | The access code thrown away on every payment | **HALF, DELIBERATELY.** The code is carried through all four envelopes. The component was NOT built, because two of its three preconditions could not be proved here. See 8.2: the research's stated evidence for the 3-D Secure question turned out not to exist in the shipped package. |
| 6 | `externalHttpUrl` throws applicants into Chrome | **LANDED, AND THE BRIEF WAS WRONG ABOUT THE CAUSE.** Returning null for our own origin is CORRECT: there is nothing to hand the system browser. The real hole is that a `_blank` anchor at our own screen never reaches the navigation handler at all, so the web view asks for a new window and Capacitor gives it to the operating system. Fixed with `sameOriginBlankPath`, which navigates the one window a shell has. |
| 7 | The offline card unreachable, no `errorPath` | **LANDED**, and the surface was designed properly as well, with a paper twin, drawn in CSS and inline SVG so the file still makes no network request. |
| 8 | `COMPANY_RC_NUMBER` null | **LANDED.** RC 9870413 reaches both legal documents through `COMPANY_FORMAL_NAME` and the email footer through a test that ties the three copies together. |
| 9 | Four escrow doors executable by `authenticated` | **LANDED AND VERIFIED LIVE.** Bodies moved into `_as` siblings taking the actor explicitly, `service_role` only; the originals are one-line delegates so there is one implementation. Rule 11 travelled with it: the note a user can read no longer says escrow. |
| 10 | `agent_trust` readable by `anon` | **LANDED, AND THE SURVEY WAS WRONG.** "Nothing in the product calls it signed out" is false: every public profile asks it for a signed-out visitor, so a naive revoke would have silently removed the trust band from every agent's page. The band is kept and the enumeration is closed by serving the read from the server after the profile row has come back. |
| 11 | Three checking tools that had never looked at light mode | **LANDED.** The token checker excluded the paper theme BY NAME; the contrast probe measured four elements on one route and now sweeps every text-bearing leaf on 89; the surface comparer had no theme switch. Its colour checks now REFUSE `--theme light` rather than reporting nonsense, because every hex they compare against was sampled from a dark render. |
| 12 | `platform_stats()` counting example stock | **LANDED, PROBED AND VERIFIED LIVE.** 64 published, all 64 examples, so every figure on the landing described stock nobody can transact. One predicate per count, and it returns zero today. |

---

## 8. Verified by the lead, not taken on report

The contract says no success report is believed without the lead's
verification. This section records what was checked and what the check found,
including where it disagreed with the report.

**THE TWO REVOCATIONS, CONFIRMED AGAINST THE LIVE DATABASE.** Read off
`has_function_privilege` rather than off the migration text:
`escrow_fund_from_wallet`, `escrow_confirm`, `escrow_request_release` and
`escrow_raise_dispute` are now callable by neither `authenticated` nor `anon`.
`agent_trust` is closed to `anon` and still open to `authenticated`, which is
correct because the product calls it signed in. `platform_stats` keeps its
`anon` grant, which is deliberate and is the one the landing page needs.

**THE BRAND SWEEP, AND THE NUMBER IS TWO RATHER THAN ZERO, WHICH IS THE RIGHT
ANSWER.** Badge rows saying RentMe: zero. Cron jobs named `rentme_*`: zero.
Functions whose body contains the word: TWO, and both must stay.
`private.handle_seed` and `private.validate_social_handle` refuse any social
handle containing `vallo`, `rentme` or `naijafinds`. That is a BLOCKLIST, not
a brand mention: deleting the word from it would open handle squatting on a
retired brand that still carries recognition, so somebody could register
`@rentme` and be taken for us. A sweep that drove this to zero would have
introduced a defect while reporting a success, which is exactly why the count
is read with eyes rather than compared to zero.

### 8.1 THE BUILD WAS RED ON MAIN AND THE RULE THAT FORBIDS IT HAD FIRED

`next build` failed on `main` from `a315170` until `536a0cd`. One line:
a re-export STATEMENT inside a `"use server"` module. Turbopack refuses it, and
it does not fail in isolation: the module then compiles with NO EXPORTS AT ALL,
so all fifteen vanish and every importer fails to resolve. One real error, 57
cascade errors, nine consumers.

**The project's own lint rule caught it and the commit landed anyway.**
`nf/server-actions-export-only-actions` fired, and its message names the date
this exact fault last took production down. A rule that fires and is passed is
not a rule, it is a suggestion, and that is the finding under the finding.

Three workers found it independently. It blocked far more than a deploy:
section 6 closes a scope only on a proof taken from a PRODUCTION server, so
while the build was red nobody could produce one, nobody could run the CSP
browser walk and nobody could run a ratio sweep. One line was holding every
worker's close criteria shut.

The distinction that keeps being missed is now written into the file: a
`"use server"` module MAY declare types and MAY import whatever it likes; what
it may not do is EXPORT anything that is not an async function, and
`export ... from` is an export statement whatever sits on the other side.

### 8.2 A SWEEP'S EVIDENCE THAT DID NOT EXIST

N5 was told to prove three things before building the in-app checkout. It
proved the first from the shipped source of `@paystack/inline-js` at seven
located offsets, and it DISPROVED the basis of the second: the research cited
`PopupTransaction.getStatus()` and its `auth` state as evidence that 3-D Secure
stays inside the iframe. That method **does not exist in the shipped package**.
It appears in the README and `grep -c getStatus` returns 0 in all three built
bundles. The frame also carries no `sandbox` attribute, so nothing structurally
stops the framed document opening a window.

Worth recording as method rather than trivia: a research file's honesty log is
where this would have been caught earlier, and the instruction to read every
honesty log is what made the worker check the primary source at all.

---

## 9. Three faults in the lead's own method, found today

Recorded because the first one may have been producing wrong gate results for
days and the second cost real work.

**THE ISOLATION HARNESS COULD KEEP A FILE THAT THE TREE HAD DELETED.** To gate
a tranche without other workers' in-flight edits, the lead builds a tree object
and loads it into a separate worktree. The order was `reset --hard`, `clean`,
`read-tree`, `checkout-index`. `clean` ran BEFORE the new tree was read, so a
file present in the OLD tree and absent from the new one SURVIVED.

It surfaced as a FALSE RED: `WelcomeCards.tsx` does not exist in HEAD, the
worktree still had it, and it failed the typecheck against locale keys that had
been correctly deleted. The lead nearly "fixed" a deletion that was right.

**The dangerous direction is the opposite one.** A stale file satisfying an
import that the real tree does not have makes a broken tree gate GREEN. Every
gate result from that harness before today should be treated as suspect. The
order is now `reset --hard`, `read-tree`, `checkout-index`, `clean`, so
anything absent from the tree is untracked when the clean runs.

**AND THE SHARED TREE ATE SIX FILES OF UNCOMMITTED WORK.** A git operation by
one of thirteen workers destroyed the lead's working copy of six files with no
conflict and no warning. They were recovered only because they had been written
into a tree object for gating, so `git cat-file` could read them back; no
worker has that safety net.

Four commands are now forbidden outright in this tree regardless of what a
brief says: `git add -A`, `git stash` in any form including `--autostash`,
`git checkout --` or `git restore` on a file the worker did not write, and
`git reset --hard`. When `git pull --rebase` refuses on a dirty tree, that
refusal is protecting twelve other people and is not to be forced past: commit
your own files with an explicit pathspec first, then pull. All thirteen
workers have been told.

**AND THE SAME FAULT WITH THE SIGN REVERSED: A CONSUMER COMMITTED WITHOUT ITS
PRODUCER.** `(app)/search/page.tsx` landed reading the sort key `"move-in-asc"`
while the file DECLARING that member of the `SortKey` union stayed uncommitted
in the shared tree. The author's tree typechecked perfectly. The branch tip was
red for the other twelve, and NOBODY WHO PULLED COULD SEE WHY, because the
missing half was in no commit to read. A3 found it and named the mechanism.

Both faults come from the same root: gating against a working tree that
thirteen people share. So the method changes. **GATE ON A WORKTREE CHECKED OUT
AT THE TIP**, which is one `git worktree add <path> HEAD --detach` and a
hardlinked `cp -al` of `node_modules`. It costs about four minutes and it is
the only thing that sees this class of fault. The lead now does this and the
tip is checked after every landing.

---

## A1, Group A, backend B0 to B7: what was measured and what landed

Written by A1 at the close of its stint. Every number here was taken against
the live project `uccixoonmbhrnyczyigt` on 22 September 2026, after the work,
not before it.

### The zero the brand sweep was asked for

| Where | Still says RentMe |
| --- | --- |
| Function bodies in `public` and `private` | **0**, excluding the two named below |
| `public.badges` rows, any column including `code` | **0** |
| `public.wallet_entries` metadata | **0** |
| `public.reviews` author labels | **0** |
| pg_cron job names | **0**, and still 8 active |
| Supabase Vault secret names | **0** |
| `apps/web` and `packages`, user-visible strings | **0** |

The only two survivors are `private.validate_social_handle` and
`private.handle_seed`, which carry the string in order to REFUSE it. They now
refuse `vallo` as well, which is the hole that let any signed-in user claim
`/u/vallo`. Proved live inside a rolled back transaction: the profile
`phantomfcalls` was refused the handle `vallo_support` with sqlstate RM002 and
was then allowed a neutral one, so the guard refuses the brand rather than
refusing everything.

The remaining `rentme` matches in `apps/web` are seven code comments that
narrate the rename and warn against repeating it, plus historical applied
migration files, which are records of what ran and are not edited.

### The migration ledger, reconciled

| Measure | Before | After |
| --- | --- | --- |
| Applied with no file in the repository | 4 | **0** |
| Files in `migrations/` never applied | 3 | **0** |
| Migration files on disk | 212 | 221 |
| Rows in `supabase_migrations.schema_migrations` | 218 | 220 |

The one remaining difference is
`20260922140000_a_post_is_scanned_for_abuse_as_well_as_fraud.sql`, written into
this tree by another worker at 12:56 today and theirs to apply.

**One of the four orphans is not a migration.** `20260919181950` is a probe
that was committed instead of rolled back. Its rows are still in the live
product tables: the `businesses` row it demoted to DRAFT, the one
`reservations` row this platform has, a `conversations` row and two `messages`
rows. Removing them is data-losing on live tables and is the founder's call.

### The two revocations, and the advisor's own count

| Advisor finding | Before | After |
| --- | --- | --- |
| SECURITY DEFINER executable by `anon` | 2 | **1**, `platform_stats()`, deliberate |
| SECURITY DEFINER executable by `authenticated` | 23 | **19** |

**`agent_trust` was called signed out and the survey said it was not.**
`readProfileByHandle` falls back to the anonymous client for a signed-out
visitor and asks `agent_trust` on every public profile. Revoking the grant
alone would have silently removed the trust band from every agent's public
page. The band is kept and the enumeration is closed: the signed-out read is
served by the server after the profile row has come back through
`social_profiles_select`.

### Two things the repository believed that the database does not

1. **`20260915090000_the_database_stops_saying_rentme.sql` could never have
   run.** It writes `update public.badges set label = ...` and
   `update public.wallet_entries set note = ...`. Neither column exists. The
   fix for the finding the audit calls the most serious in the estate would
   have raised 42703 on its first data statement. Corrected in its own file,
   which is allowed because it had never been applied, and applied.
2. **No acceptance of the terms had ever been recorded.** Three comments and a
   passing test say `handle_new_user` writes `profiles.terms_accepted_at` from
   the hidden version field. `public.profiles` has no such column, has no
   `terms_version` column, and `handle_new_user` does not contain the word
   terms. `public.terms_acceptances` exists now and the server writes it.

### Two defects a probe caught that a migration would not have

* `wallet_entries_direction_chk` had never heard of a pot, so the savings pots
  migration would have applied perfectly and then raised 23514 the first time
  anybody moved money into one.
* The store reviewer seed named the Eti-Osa local government as `eti-osa`.
  `handle_new_user` matches that against nothing and stores null without
  complaining. The code is `la_eti_osa`.

### Still the founder's, and re-stated rather than assumed

* **The reviewer login.** `npm run seed:reviewer` is written, idempotent, and
  proves the sign in through the anon front door. It needs an address and a
  password and nothing else.
* **Whether the probe's rows stay.** The venue, the reservation and the thread
  written by `20260919181950`.
* **Whether the sign-in address ceiling stays.** Sixty attempts an hour against
  one account closes unlimited distributed guessing and accepts a bounded
  denial in exchange. Both halves are argued in `lib/auth/actions.ts`.
* **Leaked password protection** is still disabled. The advisor still reports
  it. One click.

---

## N3: Track D, the seven that refuse us on submission one

Track D was listed as UNSTAFFED in section 4 and is now partly closed. The
research file is `docs/research/STORE_REJECTION_RISK_RESEARCH.md`. Where its
honesty log said a claim rested on a search summary rather than a primary
source, that is answered below rather than repeated.

### The rows

| # | Item | State |
| --- | --- | --- |
| 1 | Report and block inside a one to one conversation, an abuse filter, image moderation, an EULA people accept | **Report, block, filter and agreement CLOSED.** Image moderation is human in the loop and the agreement says so. Acceptance on the OAuth path is NOT closed: see below. |
| 2 | Google sign-in cannot survive the native shell; 4.8 with Apple off | **The callback survives.** `/auth/callback*` is included ahead of the `/auth/*` exclusion in the AASA and the Android filter carries the matching `pathPrefix`. The 4.8 decision and the two sign-in marks are A3's and the founder's, not mine. Nothing verifies until the founder's Team ID and fingerprints land. |
| 3 | The iOS location purpose string is false and the Android manifest tells the form-filler to declare "not stored" | **CLOSED, by both answers.** `TravelTime` deleted; `HostWizard` kept and described. Both strings and both comments now match the code. |
| 4 | The privacy policy claims analytics we do not do | **FACT ESTABLISHED AND HANDED TO N1.** The file itself is untouched, deliberately: N1 owns its copy this week. The fact is below and it is NOT what the research said. |
| 5 | `TravelTime` posts to `/api/travel-time`, which does not exist | **CLOSED.** Component and both render sites deleted. |
| 6 | Crypto goes dark for version one | **CLOSED.** `/crypto` and `/crypto/[id]` return `notFound()`, not an environment gate. The drawer row and the wallet tile go with the route rather than pointing at a 404. |
| 7 | The offline card can never be reached because no `errorPath` is set | **CLOSED, one line.** `errorPath: "index.html"` in `capacitor.config.ts`. The card itself is A2's. |
| + | Deep links are dead: two placeholder fingerprints and a placeholder Team ID | **THE FAILURE IS NOW LOUD.** `npm run check:deep-links` exits 1 and names who supplies each value and where from. The values stay the founder's. |

**B6 IN `HANDOFF_05` IS DEFERRED, NOT CANCELLED.** Recorded here because a route
that returns `notFound()` reads like a deleted feature to the next person who
opens it. Nothing behind `/crypto` has been removed: `components/app/crypto/`,
the Yellow Card client, `/api/crypto/*` and the preview surfaces under
`(dev)/preview/e/` all still build and still have their tests. Turning it back
on for v1.1 is deleting the body of two route files. The proxy work stops; the
work already done is not to be deleted by anybody tidying up.

### Item 4, the analytics fact, for N1 to write

The research file says at A.5 and A.6 that there is "no analytics anywhere" and
"no analytics or crash-reporting SDK", resting that on the dependency list at
`apps/web/package.json:14-33`. **The dependency list is the wrong place to
look and the second half of that claim is false.**

Measured against the code on 22 September 2026:

* **Analytics: genuinely none.** No product analytics, no attribution, no
  advertising and no tag manager, in the dependencies or hand-rolled. The edge
  sends `interest-cohort=()` on every response. Every cookie this product sets
  is strictly necessary: locale, theme, side, mode, workspace, search view,
  local saves and the Supabase session. That part of the research holds.
* **Crash and error reporting: WE DO IT, and it is not an SDK, which is why a
  dependency check missed it.** `apps/web/src/lib/observability/report.ts` is a
  hand-rolled transport that POSTs to Sentry's envelope endpoint when
  `SENTRY_DSN` is set. Server errors arrive through `instrumentation.ts`, browser
  errors through the error boundaries and `apps/web/src/app/api/client-error`.
  Nothing personal goes with them: an explicit allowlist drops `userId`, `email`,
  `ip`, headers, body, params and live paths before the scrubber runs, and
  `lib/observability/scrub.test.ts` proves an email, a bank account, a NIN, an
  authorization header and a card number do not survive it.

So the three documents have to say the same three things, and none of them is
"analytics":

1. The policy must stop naming analytics as a purpose and stop saying the
   product sets analytics cookies. Both are false.
2. The policy must name **Sentry** as a processor, under crash diagnostics, and
   say that reports carry no identifier. It names no third party by name today.
3. The Apple privacy label and the Play Data safety form both need a
   **Diagnostics / Crash logs** row, NOT linked to identity, whenever
   `SENTRY_DSN` is set on the submitted build. Part D.5 of the research
   currently declares neither, on the strength of the same wrong claim. If the
   founder would rather declare nothing, the answer is to leave `SENTRY_DSN`
   unset for the store build, and then the reporter returns `{sent: false}` and
   the declaration is honest the other way. **That is a founder decision and it
   is not made here.**

This also closes honesty log item 6, which said `api/client-error` had not been
read. It has been read now, and it was the item that mattered.

### Guideline numbers, and which ones I could verify against a primary source

* **VERIFIED, from `developer.apple.com/app-store/review/guidelines/` directly.**
  1.2's four precautions, quoted word for word; 4.8 in full including the
  "exclusively uses your company's own account setup" exemption; 5.1.1(v) on
  account deletion; 5.1.1(ii) on purpose strings.
* **CONFIRMED NOT QUOTABLE.** The published text of 1.2 contains **no twenty
  four hour requirement and no EULA requirement**. The research said so and it
  is right. Both come from the rejection message App Review sends. We build to
  the rejection message because that is what a refusal carries, which makes the
  twenty four hour clause in `lib/legal/eula.tsx` a promise this company is
  making rather than a quotation. `lib/legal/eula-copy.ts` says so in the file.
* **VERIFIED FROM THE IMPLEMENTATION, which the research could not do.**
  `server.errorPath` does fire on a failed remote load. `WebViewDelegationHandler.swift`
  loads `errorPathURL` from `didFailProvisionalNavigation` as well as `didFail`;
  `BridgeWebViewClient.onReceivedError` loads it for the main frame on Android;
  and `CAPInstanceConfiguration.swift` resolves it against `localURL`, so the
  path is the packaged shell rather than a page on an origin that is by
  definition unreachable. Honesty log item 4 is closed.
* **COULD NOT VERIFY, AND THE RESEARCH'S HONESTY LOG ITEM 1 STILL STANDS.**
  `support.google.com` and `play.google.com` are both blocked by this
  environment's egress proxy. **Every Play policy number in the research file,
  and every Play statement in this section, still rests on search summaries and
  third-party write-ups rather than on Google's published text.** That covers
  the User Generated Content policy, Data safety accuracy, target API level,
  account deletion, payments, the photo and video permissions policy, the 16 KB
  page size rule and the crypto policy. Somebody on an unblocked network must
  re-read them before submission. I did not verify guideline 4.2, 2.1, 5.1.5,
  3.1.1, 3.1.3(e) or 3.1.5 against the primary source either; I fetched the
  guidelines page for the four above and did not re-read the rest.
* **STILL UNTESTED ON A DEVICE.** Honesty log items 3 and 13 stand. The OAuth
  cookie jar reading is a reading of the code, and it is the single most
  important thing to test on the first real sign in.

### Not closed, said plainly

* **Acceptance on the OAuth path.** A person who creates an account through a
  social provider passes no tick, so no acceptance is recorded for them. The
  active tick is on the email sign-up form. Closing it needs the social buttons
  themselves, which belong to A3 this week.
* **Image moderation is not automated.** No classifier, no vendor, and a vendor
  is on the stop list. Photographs are reviewed by a person when somebody
  reports them, the agreement says exactly that, and the review notes must say
  it too rather than implying a classifier.
* **The blocked terms list is empty on purpose.** `public.blocked_terms` ships
  with a `-- SEED REQUIRED` marker and `private.objectionable_pattern()` returns
  null over it, so the new branch is a no-op until the founder approves a list.
  The migration changes no behaviour until then, which is deliberate: a filter
  firing on terms nobody approved is worse than no filter.
* **The "reports older than 24 hours" counter** on the admin dashboard, work
  order 23, is not built. The commitment is written and the queue exists; the
  measurement of it does not.

## 10. THE CONFIRMATION CODE LENGTH, FIXED BY THE LEAD

The founder reported it directly: the length six was hardcoded in four places,
the Supabase project had been issuing eight, and the input truncated instead of
warning, so the field silently dropped two digits and the screen then told
somebody their code was wrong while they were looking at the right code in
their email. Every layer behaved exactly as written and the product lied.

**Where the four copies were.** `lib/auth/actions.ts` held `const
SIGNUP_CODE_RE = /^\d{6}$/`, and two sentences of copy either side of it that
said "six digits" in words, so nobody changing a number would ever grep them.
`components/auth/VerifyCodeForm.tsx` held `const CODE_LENGTH = 6`, the
`.slice(0, CODE_LENGTH)` that did the cutting, two more "six digits" sentences
and the placeholder `"123456"`. Four numbers and four words for one fact.

**Where it lives now.** `apps/web/src/lib/auth/confirmation-code.ts`, one
constant with the regex, the placeholder and the word all derived from it.
`codeLengthWord()` exists because the copy says "six" and not "6": spelling the
number out is the house voice and is also exactly how the copy drifted, so the
word is now computed from the number rather than typed beside it.

**Why it is not a constant inside `actions.ts`.** That file is a `"use server"`
module, and such a module may export nothing that is not an async function. A
non-function export there is the fault that took this build down twice today,
the second time stripping every export and failing nine consumers with fifty
eight errors (section 8.1). The shared fact therefore lives in an ordinary
module that both the server action and the client component import.

**The truncation is gone and is not coming back.** `readCode()` strips spacing,
because "  123 456 " is somebody pasting out of an email, and keeps every
digit, because the digits were the code. Too many digits now sets a field error
that names both numbers, so the person can recount against their own email,
and the form does NOT auto-submit, which is what sent the cut value before. The
surplus message takes precedence over the server's refusal in the field,
because it describes what is on the screen now rather than what was last sent,
and it goes through the same `error` prop as every other field so a screen
reader is told as well.

**Gated on a worktree at the tip, not on the shared tree**, which at the time
carried another worker's half-finished file. `tsc --noEmit` exit 0. `eslint` on
the four paths: 0 errors, 8 warnings, all of them pre-existing spacing and font
size warnings on lines this change did not touch. `vitest` over `src/lib/auth`
and `src/components/auth`: 39 passed, including ten new ones that assert the
regex, the placeholder and the word all follow the constant, and that a surplus
survives the read rather than being eaten.

**What is NOT closed.** The application now has one copy of the length and the
Supabase dashboard has another, and they can still disagree. That is one place
instead of four, and it is the honest floor: the dashboard setting is what
actually generates the code, and nothing in this repository can read it. If the
project's setting changes, change `CONFIRMATION_CODE_LENGTH` and nothing else.

## 11. N2, "NOBODY LEAVES VALLO", AUDITED BY THE LEAD

N2 handed back seven commits and a table of twenty eight departures. What
follows is what I checked myself, not what it told me.

**The commits are real and on main.** All seven ancestors of `origin/main`:
`76dcdc7` `1ac54d0` `7a03a43` `d154329` `378d7c5` `79de8d2` `035b66c`.

**Zero disabled rules, which is the claim I trusted least.** N2 reported that
its first `DocumentViewer` carried an `eslint-disable-next-line
@next/next/no-img-element`, a straight breach of rule 9, and that `035b66c`
replaced it with `next/image` `unoptimized`. Grepping all twenty six files it
wrote or touched for `eslint-disable` returns nothing. The reasoning behind
`unoptimized` is also right and is the codebase's own precedent: the optimiser
caches what it optimises, and a cached copy of somebody's passport on disc is
the exact thing that route exists to prevent.

**Zero em dashes** in all seven commit messages and zero added by the diffs.

**The closures, in source rather than in a report.** `SUPPORT_HREF` is now the
literal `"/contact"`, not a mailto with a fallback. `StickyAction.external` and
`RowLink.external` are gone, with no `external` prop left in either file. The
three admin desks carry no `createSignedUrl` and no `supabase.co` href; the only
surviving occurrences of that string are the comments explaining what used to
happen. `/api/documents/[id]` exists and `requireAdmin` is imported at line 3
and runs before the id is parsed, which is what makes a traversal attempt a 403
rather than a privileged read.

**ITEM 10 OF THE SWEEP'S HONESTY LOG IS NOW MEASURED, AND IT IS CLEAN TODAY.**
N2 could only say that nobody had checked whether a row uses a non `vallo`
fulfilment mode, so I checked. The column is `public.accommodations.fulfilment`,
of enum type `public.fulfilment_mode`, defaulting to `vallo`. Every row on the
platform, all five of them, is `vallo`. Nothing is being fulfilled off platform
and no partner row exists to render.

That closes the question and NOT the risk: the enum still carries
`external_completion` and `partner_handoff`, so the first row that takes one
would render through a UI that has no partner label and no fulfilment honest
CTA, which is on the stop list. The guard is a check constraint refusing
anything but `vallo` until that label exists, and it belongs to whoever owns the
stays schema, not to a lead reaching into it while they are mid migration.

### Two findings N2 left for others, both confirmed

* **A signed Supabase URL still reaches the admin DOM in one place.**
  `lib/admin/queries.ts` signs listing walkthrough videos and hands the URL to a
  `<video>`. It is not a departure, because a `<video src>` is not a
  navigation, which is why it is not one of the twenty eight. It is still a
  forwardable link to private storage in a page, and the `/api/documents/[id]`
  pattern now exists to take it.
* **`.nf-social-link` is now carried by a `<button>`** where it used to be on
  an `<a>`. Tailwind v4 preflight resets `font`, `background` and `border` on
  buttons, and `chips.css` already names `button.nf-chip` explicitly, but
  `.nf-social-link` has no reset of its own and wants an eyeball at 390 in dark.

### What N2 did not finish, in its own words and kept in mine

**A PDF is still handed to the OS.** Images draw inside the Vallo sheet; a PDF
is offered as a file from our own origin. That is strictly smaller than the
departure it replaced, since there is no other company's page, no other
company's URL bar and no signed link to forward, and the audit row is still
written. It is still a departure. Both ways to close it need a CSP change: a
same origin frame needs `frame-src 'self'`, and pdf.js needs a worker source.
N2 declined to take a concurrent edit on `lib/security/csp.ts` while the
Paystack worker was moving `frame-src` under it, and declined to `npm install`
into a shared `node_modules` under a dozen building workers. Both refusals are
correct. The seam is one component wide and is named `DocumentCanvas`.

**Hausa, Igbo and Yoruba are English** for the six `t.offPlatform` strings,
marked as such in each file. That is the right call: an invented translation on
a sentence that reads "we have not checked where this goes" is worse than a
visible English one.

**Nineteen of the twenty eight are still open**, and N2 says so rather than
rounding up: eight card and wallet payment departures blocked on the sweep's own
unanswered items, the OAuth redirect, the map licence attribution (a licence
question nobody has read the licence for, so it stays), four share sheets that
need the founder's ruling, the store badges, the footer's X and Telegram, and
the four `tel:` links that are supposed to leave. Every one of the twenty eight
reproduced before it was touched or left; only line numbers had drifted.

## 12. THE EMAIL PATH IS ALIVE, MEASURED RATHER THAN ASSUMED

The confirmation code fix in section 10 is worth nothing if no email carries a
code, and as of this morning the platform could not send one: neither custom
SMTP nor the Send Email Hook was configured, and the auth log for 12 September
showed two sends from `noreply@mail.app.supabase.io` followed by three
`429: email rate limit exceeded`. Real people could not create accounts.

**That is now closed, and here is the evidence rather than the claim.** The
auth log carries, today at 13:51:28, `Hook ran successfully` on path `/signup`
with the request itself completing 200. `Hook ran successfully` means GoTrue
got a 2xx from our own endpoint, and `app/api/auth/email-hook/route.ts` returns
**502** whenever `sendMessage` comes back unsent, naming `unconfigured`
separately from a delivery failure precisely so neither can be mistaken for a
send. A 200 from that route therefore means Resend accepted the message. The
hook fired on a real signup and the message went out.

No `429` and no rate limit refusal appears anywhere in the auth log today.

### One thing for the founder, and it is a dashboard setting rather than code

At 13:45:58 the log records `env GOTRUE_RATE_LIMIT_EMAIL_SENT changed,
updating Email limiter from 2/1h to 2`. The old value is printed with its unit
and the new one is not, so what the limiter now permits cannot be read off the
line. If it is two an hour, the third person to sign up in an hour is refused,
and they are refused by the platform rather than by anything we can catch. Two
an hour is a sensible ceiling while Supabase's shared sender is doing the work
and an odd one now that a custom hook and Resend are doing it.

Nothing in this repository can read or set that value. Worth a look at the Auth
rate limits page before anybody is invited.

### A second finding, from A3, which I checked myself

`app/api/documents/[id]/route.ts` answers **200 with the whole object buffered
into an `ArrayBuffer`**. There is no `Accept-Ranges`, no 206 branch and no
stream. For the ID images it was written for that is fine. It means the route
cannot take a video: a browser cannot scrub a response that answered 200 to a
range request, every play buffers the entire file into server memory, and
`writeAudit` fires per request, so a reviewer scrubbing a walkthrough four
times would write four `document.viewed` rows and the audit log would stop
meaning what it says.

So the signed video URL in `lib/admin/queries.ts` stays where it is, and A3 was
right to refuse it rather than point a `<video>` at a route that cannot serve
one. Making the route stream ranges is a real piece of work with four decisions
in it, including whether an audit row is written per request or per viewing
session, and it is worth more than the one call site: once it streams ranges it
is the right answer for every private media file the console will ever show.
It is mine, and it is not started.

## 13. THE GLOW, MEASURED OFF THE RENDERS RATHER THAN GUESSED AT

The founder's ruling: the primary blue control is lit in every reference image,
the original set as much as the twelve new ones, and ours is flat. Bloom under
it, a brighter rim along its top edge, a gradient fill rather than a flat one,
and the same treatment at lower intensity on active tabs, selected cards, the
raised centre switch, the glass icon plates and every wizard's selected state.
Token layer once, never per component. Measured, not eyeballed, so the next
person does not re-guess it.

`scripts/design/measure-glow.mjs` is the instrument. It takes an image and a
rectangle, or finds the control itself with `--find`, and prints the fill row
by row, the rim's lift over the fill beneath it, and the excess brightness
outside each edge sampled outwards until it dies. Anybody can re-run it and get
the same numbers, which is the point.

### Where these numbers come from

`docs/design/references/roles/GOVERNING-03-register-owner.png`, screen one, the
primary Continue, box `x=48 y=757 w=309 h=54`. It is the cleanest specimen in
the set: full width, on flat dark panel, with nothing bright near it. Cross
checked against the Explore Properties button in
`docs/design/references/founder/landing-fullpage-target.png`, box
`x=42 y=268 w=177 h=31`, which agrees on the structure at about half the scale.

In `GOVERNING-03` a 390px phone is drawn about 328px wide, so **render px are
about 0.84 of a CSS px**. Both are given below and the CSS figure is the one to
implement.

### The fill is NOT a one-way gradient. It is a curve.

Row by row down the control, the mean fill reads:

| Position | Render | Measured |
| --- | --- | --- |
| rim, rows 0 to 1 | 2px | `#0AACFA` to `#02B6FE`, L 143 to 149 |
| top of fill | row 2 | `#0074FC`, L 101 |
| deepest | about 45 per cent down | `#004AFD`, L 71.5 |
| bottom of fill | last row | `#0074FB`, L 101 |
| bottom rim | 1px | `#00A9FC`, L 139 |

So it is **light, deep, light**: a specular curve reading as a cylinder lit
from above, not the top-to-bottom ramp the instruction describes. The hue also
rotates slightly with it, 212.4 degrees at the top stop and 222.4 at the
deepest point, both inside the one blue family. `--nf-brand-primary` is
`#0069FE` today, which is the top stop to within a shade, so the family already
holds one end of this and only the deep middle is missing.

**THE RIM IS CYAN IN THE RENDER AND THAT IS A PROBLEM WORTH NAMING.** The
instruction says white at low alpha. The pixels say otherwise: `#02B6FE` has
red at 2 out of 255, and white at any alpha over a blue fill lifts red first.
It is a brighter, more cyan blue. But bright cyan is the PENDING state in this
product and means one thing only, so painting a cyan rim on every primary
control would spend that signal on decoration. **The translation is white at 30
per cent**, which reproduces the measured lift of L +47 over the fill beneath
it (white over `#0074FC` lifts L by 154 per unit alpha, so 47 divided by 154 is
0.305) without putting a second meaning on cyan. That is a deliberate
translation of a reference's off-brand detail, which the rules require, and the
founder can overrule it in one line if he wants the literal cyan.

### The bloom, and it is two shadows rather than one

Sampled upward from the top edge over the control's middle 60 per cent, against
a panel reading L 10:

| Distance, render | Distance, CSS | Excess L | Implied alpha |
| --- | --- | --- | --- |
| 1 to 2px | 1 to 2px | +32.4 | 0.38 |
| 4px | 5px | +21.4 | 0.25 |
| 8px | 9.5px | +12.4 | 0.145 |
| 16px | 19px | +5.9 | 0.069 |
| 24px | 29px | +3.7 | 0.043 |
| 32px | 38px | +2.8 | 0.033 |
| 48px | 57px | +1.8 | 0.021 |
| dies | about 62px | under 5 per cent of peak | |

One Gaussian does not fit that: the near field halves every 9px and then the
tail refuses to die for another 50. Two shadows do fit it, both at zero offset
so they read as light rather than as a drop shadow:

```
0 0 24px rgba(12, 106, 239, 0.50),
0 0 88px rgba(12, 106, 239, 0.14)
```

The tight one carries the edge and is most of what the eye reads as "lit". The
wide one is what makes the surface underneath look like it is receiving light
rather than wearing a halo, and it is the one that will be tempting to drop
because it is nearly invisible on its own. Do not drop it.

Left and right of the control could not be measured: the phone bezel in these
renders is 13px away and is itself lit, so the horizontal numbers are noise.
The bloom is taken as radial from a zero-offset shadow, which is what the image
looks like, and that assumption is recorded here rather than buried.

### NO REFERENCE IMAGE DRAWS LIGHT MODE, and that has to be said plainly

All eighty nine indexed references are dark. The founder's three light captures
in `references/founder/` are photographs of our own shipped defects and govern
nothing. So there is no measurable light-mode target for any of this, and a
glow tuned for a ground at L 10 washes out on paper at L 250: the same alpha
that lifts a dark panel by a third of its brightness lifts a white one by
almost nothing, and the wide shadow disappears entirely.

Light values therefore have to be derived and then PROVEN on a real surface
rather than measured off an image that does not exist. The derivation to start
from: on paper the bloom must go darker rather than brighter to read at all, so
the tight shadow keeps the brand hue and roughly doubles its alpha while the
wide one becomes a genuine shadow in deep blue rather than a light, and the rim
inverts from white to a top-edge darkening. That is a hypothesis, not a
measurement, and it is labelled as one.

### The shape law is not reopened by any of this

Every text-bearing control stays a rounded rectangle on `--nf-radius-control`.
A glow changes what a control is made of, never what shape it is.

## 14. MAIN WAS RED ON THE TEST GATE, AND THE THIRD COLLISION

**Measured on `origin/main` in a clean worktree, not the shared tree**, which
is the only reading that means anything while thirteen people are mid edit:
`src/lib/i18n/locale-completeness.test.ts` fails with "yo now renders 336 keys
in English, up from the recorded 212". Every worker's test floor was red and
main auto-deploys.

### How it happened, and it is a process fault rather than a translation one

A3 came forward before I found it, which is the behaviour this stint needs
more of. Its commit `1c6388d`, titled "the console stops being half
translated", carries 182 added lines in `packages/i18n/src/locales/en.ts`. Two
are its own. The other 180 are B1b's `supply` namespace, the three supplier
registration forms of `GOVERNING-03`, `04` and `05`, which were sitting
uncommitted in the shared tree when the file was staged.

A3 used an explicit pathspec. It never ran `git add -A` and never `git add .`.
The rule was followed and the rule was not enough, and its own sentence is the
one worth keeping:

> **THE UNIT OF COLLISION IS THE FILE, NOT THE CHANGE.**

Nothing was lost and nothing was overwritten. What is damaged is
reviewability: correct work landed early under a title that gives a reviewer
no reason to open it, which is the same failure as a consumer committed
without its producer. Unpicking it was correctly refused. History rewriting is
on the stop list, and reverting an agent's in-flight work to tidy somebody
else's commit is a worse fault than an untidy commit.

### THE RULING: en.ts IS HELD BY ONE WORKER AT A TIME

Not one file per namespace. Restructuring the dictionary is off limits this
week, and a thirteen way restructure of the file everyone is mid edit in would
cause more collisions than it prevents. `packages/i18n/src/locales/en.ts` is
now held by ONE worker at a time and the lead names the holder. A3 holds it
until its console work is committed. Everybody else asks.

### A defect in the gate itself, which is not A3's judgement

The ratchet fires on ordinary product growth. `englishValued` counts every key
a locale does not carry, so ANY new English namespace raises it for all three
incomplete locales even when nothing got worse and no English was copied into
a translation file. The header names exactly one legitimate reason to raise a
ceiling, moving a hardcoded English string out of TSX into the dictionary, and
this was not that reason, yet the number had to rise anyway.

So the measure conflates **the locale got worse** with **the product got
bigger**. The gate is worth having and is the only reason anybody found this
at all, but it needs to measure the thing it is named for. Not redesigned
under a red test: the smallest correct change was the ceiling raise with its
reason written beside it, which is what A3 wrote and what lands.

### The finding underneath it, which is the one that matters to a person

144 of those keys are English only. `yo.supply`, `ha.supply` and `ig.supply`
are still the original 60. **A supplier registration form is the first thing a
new agent, owner or firm ever reads on this platform, and today it reads in
English on a Yoruba, Hausa or Igbo phone while the screen around it does
not.** Either those 144 keys get translated or the honest answer is that the
namespace ships English in every locale until a translator exists, and that is
a decision rather than a bug.

### The worker count, since this is the third collision

The founder's instruction was to tighten the written scopes or come back to
eight, and to come back to eight on a third collision. The three are the `h1`
type scale, N1 sweeping C1's staged files, and this one. **The count is
already back down**: C2, N2, A1, A2, B1, N1, N3, N4 and N5 have handed back,
leaving C1, B2, B3, A3, B1b and A2b, which is six. The five extras are retired
as they finish rather than being replaced, and nothing new is being spun up.

### Correction to the section above, within the hour

**The ratchet fix was already on main when I wrote that main was red, and my
reading was of a superseded tip.** A3 landed it as `69bb135`, one file by
explicit pathspec with the cause and the commit range in the message, before
my note reached it. What I saw in the working tree was that same content, not
an uncommitted fix waiting on somebody.

Re-measured on `cc13f16` in a clean worktree: `locale-completeness.test.ts`
**6 passed**. The test floor is green.

The lesson is the one this ledger keeps relearning in a new costume. A gate
reading is a photograph of a moving object, and on a tree where a dozen
workers push every few minutes a clean worktree is necessary but NOT
sufficient: it also has to be built from a tip fetched at the moment of
reading, and the result has to name the commit it was taken at. Every gate row
from here names its commit, which section 6 already demanded of proofs and
which I did not hold myself to.

**A3's redesign of its own measure, recorded so it is not lost.** The ratchet
should assert on the SHARE rather than the count. `englishShare` is already
computed and returned by `localeCompleteness` and is simply not what the
ratchet tests. A share is invariant under ordinary growth: a new untranslated
namespace moves it, a new namespace that arrives translated does not, and
copying English prose into `ha.ts` moves it in the direction the gate is named
for. Yoruba reads 0.122 today against 0.080 an hour ago, so the share sees
this event as well. The absolute counts stay in the failure message, because
"336 keys" is something a person can act on and "0.122" is not.

**`en.ts` is free.** A3 has handed it back with its console work committed.
B1b holds it next, for the three registration forms.
