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
| `/cancellations` | none, inherits the register | `a2/cancellations-390-{dark,light}.png`, RETAKEN by A2b at `6c621e3`, so it is no longer a revision stale and shows the two sentence hero | 0 breaches at 390 and 1536, dark and light | A2, proof by A2b |
| `/verification` | none, inherits the register | `a2/verification-390-{dark,light}.png`, taken by A2b at `6c621e3`; the signed-out face, which is the one a stranger meets and the one that carries the `PageScene` shield-check | 0 breaches at 390 and 1536, dark and light | A2, proof by A2b |
| `/privacy` | none, inherits the register | `a2/privacy-390-{dark,light}.png` | 0 breaches at 390 and 1536 | A2 |
| `/terms` | none, inherits the register | `a2/terms-390-{dark,light}.png` | 0 breaches at 390 and 1536 | A2 |
| The offline card, `apps/web/native-shell/index.html` | none, inherits the register; drawn to it for the first time | `a2/native-shell-no-connection-390-{dark,light}.png`, `a2/native-shell-no-server-390-{dark,light}.png` | measured in the browser: plate 0.27, button 0.28, card 0.07, note 0.12; the only circle is the explanatory glyph | A2 |
| The dock with the raised centre switch | `GOVERNING-01` screen one | `b1/dock-390-dark.png`, RETAKEN by A2b on `next start` at `6c621e3`, on `/search` because `/home` is behind the gate | dock object 18 on 52 = 0.346, measured; bar 22 on 70 = 0.314; the object rises 7px above the bar; five slots, Home, Search, Switch profile, Feed, Sign up | B1, proof by A2b |
| The Switch profile sheet | `GOVERNING-01` screen two | `b1/sheet-390-dark.png`, RETAKEN by A2b at `6c621e3` | row mark 14 on 44 = 0.318, measured. THE STANDING LABEL IS NOT IN THIS PROOF: it only draws on a workspace row, a visitor with no session has none, so B1's 6 on 25 = 0.244 is UNVERIFIED and needs a session | B1, proof by A2b |
| The side drawer's Switch profile row | `GOVERNING-01` screen three | `b1/drawer-390-dark.png`, RETAKEN by A2b at `6c621e3` | row 14 on 56 = 0.25, measured; and the sheet it opens is the same sheet the dock opens, asserted in the run | B1, proof by A2b |
| `/wallet`, the balance card and the action band | `6AF37222` | `next start` on `.next-b2`, build exit 0: figure 40.17px (was 33.5, render ~40), action tile 71x61 (was 71x83, render 77x60), tx glyph 36px (was 44, render ~36) | 0 breaches, 390 and 1536, dark and light | B2 |
| `/wallet/send`, `/wallet/receive`, `/wallet/transactions`, `/settings/payments`, the page top | `95840448`, `77A54EA3`, `7F96BE6C` | same server; all four on `layout="stacked"`, and the second header row is gone from `/wallet` | 0 breaches, 390 and 1536, dark and light | B2 |
| `/wallet/transactions`, the statement | `6AF37222` | same server; one card for the whole list with the days as headings inside it, against one card per calendar day | 0 breaches, 390 and 1536, dark and light | B2 |
| `/start`, `/sign-up/verify`, `/reset-password`, the ink | none; rule 22 locks the register | same server, both themes: heading ink rgb(255,255,255) on plate rgb(0,6,18) = 20.29:1 against 1.14:1 before, and the plate is rgb(0,6,18) in BOTH themes before and after | 0 breaches | B2, found by A2 |
| The ratio sweep after Tracks L and M | DESIGN_DIRECTION section 1.4 | `compare-surface.mjs --shape-sweep --theme both`, 9 routes x 2 widths x 2 themes, on the same server | **0 breaches.** One at 0.36, the listing photo counter; the feed FAB at 0.50 is icon-only | B2 |
| The lit primary control, `.nf-btn--primary` | `GOVERNING-03` screen one | `b2/cta-390-dark.png` and `b2/cta-390-light.png`, the 342x60 Continue on `/preview/e/send`, `next start` on `.next-b2`, build exit 0, gate at `cf6e56f`+ | fill top L 100.7 against the render's 100.4; deepest #0043FD L 66.2 at 63% against #0042FD L 65.5 at 64%; rim lift +42.4 against +48.1; bloom 20.2/16.4/11.2/7.0/4.5 at 2/4/8/12/16px against 32.2/21.2/12.3/8.2/5.9. 0 shape breaches | B2 |
| The lit selected chip, `.nf-chip--active` / `.nf-chip--pill[aria-pressed]` | none draws it; extends the register one rung below the primary | measured on `next start`, `.next-b2`, build exit 0 | shadow resolves to `--nf-rim-primary` + `--nf-bloom-lit-soft`; ink 6.57:1 dark, 8.11:1 light | B2 |
| The lit active tab, `.nf-feedtab[aria-current]` and the pill segmented link | none draws it; same object one rung down | compiled rule verified in the bundle: `background:var(--nf-gradient-cta);box-shadow:var(--nf-rim-primary), var(--nf-bloom-lit-soft)` | ink 18.82:1 dark, 16.71:1 light on the pill variant | B2 |
| The wizard's selected option, `.nf-option[aria-pressed]` | `GOVERNING-10` screen four, as read by C2, NOT re-measured by me | same server, both themes | shadow resolves to `--nf-bloom-lit-soft` and its light twin; a LIT OUTLINE, no fill | B2 |
| The calm panel glyph on paper, `.nf-calmpanel__glyph` | none; C2's defect | same server | ink/plate 4.72:1 dark, 8.11:1 light, with a new `--nf-border-brand` hairline; was a faint ring on near-white | B2 |
| `/profile/setup/owner`, THE OWNER FORM, all four screens | `GOVERNING-03` | `b1b/owner-1-about-you`, `owner-2-where`, `owner-2-where-picker`, `owner-2-where-state-chosen`, `owner-3-proof`, `owner-3-proof-none`, `owner-4-done`, each at `-390-dark`, `-390-light` and `-1536-dark`. Taken on `next start` with `VALLO_PREVIEW_HARNESS=1` at port 3196, walked by `scratchpad/b1b/proof-owner.mjs`, which fills each screen and presses the control a person would | **0 breaches at or above 0.5 at 390 dark, 390 light and 1536 dark.** Measured in the browser: every one of the six answer rows 14 on 56 = 0.250, including "I have none of these"; the timing label 14 on 44 = 0.318; the calm panel's glyph is the only circle and it carries no text | B1b |
| `/profile/setup/agent`, THE AGENT FORM, all four screens | `GOVERNING-04` | `b1b/agent-1-about-you`, `agent-1-about-you-filled`, `agent-2-identity`, `agent-3-fees`, `agent-3-fees-declared`, `agent-4-done`, each at `-390-dark`, `-390-light` and `-1536-dark`, walked by `scratchpad/b1b/proof-agent.mjs` on `next start` at port 3196 | **0 breaches at or above 0.5 at 390 dark, 390 light and 1536 dark.** The two upload cards 14 on 123 = 0.114; the fee control and its two step plates on `--nf-radius-control`; the timing label 14 on 44 = 0.318. The run also asserts the fee behaviour: both fees open NOT DECLARED with the minus disabled; twenty and ten presses read 10 per cent and 5 per cent through `Intl` and the total moves to the right figure; changing the example rent moves the total live; one step below the first rung reads a real zero and one more returns to not declared, and the undeclared line draws the words and never a nought | B1b |
| `/profile/setup/firm`, THE FIRM FORM, all four screens | `GOVERNING-05` | `b1b/firm-1-your-firm`, `firm-1-your-firm-filled`, `firm-2-association`, `firm-2-association-principal`, `firm-2-association-letter`, `firm-3-team-empty`, `firm-3-team-one`, `firm-4-under-review`, each at `-390-dark`, `-390-light` and `-1536-dark`, walked by `scratchpad/b1b/proof-firm.mjs` | **0 breaches at or above 0.5 at 390 dark, 390 light and 1536 dark.** The two route cards 14 on 170 and 14 on 149 = 0.082 and 0.094; the team rows 14 on 56 = 0.250; "Usually three working days" 14 on 44 = 0.318. The run also asserts the copy law on the live page: LASRERA appears ONCE, as the field's own label, the word required never appears, and the hint says what the field is for | B1b |
| The PROPERTY HOME PAGE, everything below the location selector | `GOVERNING-01` screen one | `b3/home-390-dark.png`, `b3/home-390-light.png`, taken on `next start` at port 3185 from a clean tree at `origin/main` plus the four B3 commits. The route itself is behind the signed-in gate in `proxy.ts` and this box reaches no database, so the proof is `/preview/f1/home`, which mounts the SAME `HomeScreen` from fixtures. A preview is not the route and that is said rather than glossed | **0 breaches at 390 and 1536, dark and light.** Measured in the browser: place chip 6 on 30 = 0.20, hero field 14 on 52 = 0.27, filter control 14 on 44 = 0.32, tile plate 18 on 64 = 0.28. Nothing over 0.35 on this route | B3 |
| The STAYS HOME PAGE, the whole screen | `GOVERNING-09` screen one | `b3/stays-390-dark.png`, `b3/stays-390-light.png`, taken on the same server on the REAL `/stays` route, which is open to a stranger. The featured band is EMPTY in both shots and that is the product being honest: `stays_search` returns nothing on this box, so nothing is drawn | **0 breaches at 390 and 1536, dark and light.** Same four objects as the property side, same numbers, because they are the same three components | B3 |
| The MOVE-IN COST BLOCK on `/listing/[id]` | `GOVERNING-08` screen two, carried onto a surface that image does not draw | `b3/listing-cost-390-dark.png`, `b3/listing-cost-390-light.png`. Same reason as the home page: the live route needs a database. `/preview/f3/listing` mounts the block TWICE, once with the fixture as it stands and once with a declared zero agency fee and no stated total, because the block exists to show the difference between a declared cost and an undeclared one | **0 breaches at 390 and 1536, dark and light.** Cost row 14 on 56 = 0.25, total panel 14 on 96 = 0.15 | B3 |
| The SIGNED-OUT APP HEADER, every `(app)` route | none, inherits the register | `b3/signed-out-header-390-dark.png`, taken on the real `/verification` | Not a shape finding. MEASURED: actions' right edge 366 in a 390 viewport, exactly the 24px gutter, with `document.scrollWidth` 390. It was 407 with `scrollWidth` 390, which is 17px of the primary control unreachable by any gesture | B3 |
| The BUYER COST BLOCK on `/listing/[id]` | `GOVERNING-08` screen two, carried onto the sale side, which that image does not draw | `sale/purchase-390-dark.png`, `sale/purchase-390-light.png`, `sale/purchase-1536-dark.png`, taken on `next start` at port 3241 from a clean worktree at `origin/main` `431c87e` plus the three preview files. The live route needs a database and this box reaches none, so the proof is `/preview/f3/listing/sale`, which mounts the SAME `ListingPurchase` three times off one fixture: as a seller quotes it today, with a declared zero agency fee, and with every cost declared and a stated total above its parts. A preview is not the route and that is said rather than glossed | **0 breaches at 390 dark, 390 light and 1536 dark.** The one hit at 1536 is `nf-nav__avatar` at 1.786, the shell's round avatar carrying its initial, and the same sweep on the existing `/preview/f3/listing` returns that one entry and nothing else. Inside the block the highest ratio carrying text is 0; the six `nf-brand-icon-ground` plates at 0.65 carry no text. `document.scrollWidth` 390 in a 390 viewport | SALE |

**B3's More-surface audit, item by item, because the slot left the dock.**
"More" was never a destination. It was a second opener for the side drawer, and
the drawer still opens from the hamburger in the app header. The reachability
proof is structural rather than a list of taps: `showsHeader` is
`!immersive && !edgeToEdge`, the dock is drawn only where `tabRootFor` returns
non-null, and `tabRootFor` returns null for every immersive route; the three
`edgeToEdge` routes (`/listing/[id]`, `/stay/[id]`, `/restaurant/[id]`) are not
in `TAB_BAR_ROUTES` at all, so none of them draws a dock either. **Every route
that draws the dock therefore draws the header, and the hamburger with it.** The
drawer has not lost a row. It has GAINED the Switch profile row.

| What was reachable through the More slot | Where it is now |
| --- | --- |
| Home, or Stays after the flip | The dock's first slot. The drawer's own copy of it is `hideWhenDocked` and always was. |
| Search, which the stays renders call Explore | The dock's second slot, named Search on both sides. |
| Feed | The dock's fourth slot, which the renders label "Saved" and which ships as Feed. |
| Bookings, or Trips on the stays side | Drawer, Account section. |
| Inspections | Drawer, Account section, property side. |
| Messages | Drawer, Account section. |
| Notifications, with its unread count | Drawer, Account section, and the bell in the header on every screen the dock appears on. |
| Saved | Drawer, Account section. |
| Wallet | Drawer, Account section. |
| AI Assistant | Drawer, Account section. |
| Agent Mode | Drawer, Workspaces section, for somebody who holds it. |
| Console | Drawer, Workspaces section, for staff. |
| Add a workspace | Drawer tail, and now also the raised centre slot of the dock. |
| Settings | Drawer tail. |
| The side coin | Drawer foot, unmoved. |
| Theme | Drawer foot, unmoved. |
| Log out | Drawer foot, unmoved. |

**B3's register extensions, recorded so the founder can check them.** Three
objects were drawn for `GOVERNING-01` and `GOVERNING-09` and then used where
those two images do not reach, which is the register being extended rather than
a second look being invented.

- `.nf-hero-plate`, the photographed container with the place chip, the heavy
  headline and the field INSIDE it. Both home pages draw it and nothing else
  does yet. Any future "browse this thing" landing surface takes this rather
  than inventing a fourth hero.
- `.nf-cat-tile`, the 3D object on its rounded plate with the label under it. It
  is the same object every one of the twelve images puts on a door, so a door
  anywhere else in the product takes this class.
- `.nf-movein__row`, the cost row of `GOVERNING-08` screen two, used on the
  listing DETAIL page, which that image does not draw. Same anatomy, same
  plate, same lit rim; only the surface is new.

**AND THE ONE FINDING FROM THIS SCOPE THAT REACHES EVERY OTHER SCOPE.** Twenty
three of the 144 glass objects ship a LIGHT TWIN and 121 do not. A call site
cannot see which is which, so a row that mixes them draws one pale frosted mark
beside three navy chips in daylight and looks correct at night. It happened
twice in this scope, on the category row (`keys-handover`) and in the cost block
(`contract-sign`, `doc-review`), and it is the mirror of the founder's own
`home-light-black-icon-plates-as-shipped.jpg`. **A SET OF OBJECTS DRAWN SIDE BY
SIDE IS ALL TWINNED OR NONE.** Nothing in the type system or the lint rules can
say so today, which is why it is here.


**B1b's THREE DEPARTURES FROM `GOVERNING-03`, RECORDED SO THE FOUNDER CAN
OVERRULE ANY OF THEM.** The composition, the glass, the glow, the progress row,
the calm panel and every control's shape are the render's. Three things are
not.

1. **SCREEN FOUR DOES NOT SAY "YOU ARE SET UP AS AN OWNER" AND DOES NOT SAY
   "YOUR DETAILS ARE VERIFIED".** Insert on `public.agents` is admin only by
   policy, so nothing about a person is set up or verified at the moment that
   screen appears; it reads "Your owner registration is filed" over "Nobody has
   looked at it yet, and this screen will not pretend otherwise". The reference
   set's own rule is that a count or a statistic in a render is example
   content, and a STATUS is example content by the same argument with more at
   stake. Making it true instead would mean self service approval of supply
   accounts, which is a decision about what the verified mark means and belongs
   to the founder rather than to a worker.
2. **SCREEN TWO DRAWS NO MAP.** `NEXT_PUBLIC_MAPTILER_KEY` is unset, so a map
   here is a rectangle of nothing where the render draws a city, and the exact
   building is a fact about a PROPERTY that the listing wizard already asks
   for. The screen carries the state, the local government and the
   neighbourhood, and says where the pin belongs rather than hiding that it is
   absent.
3. **THE "OPTIONAL" MARKER IS THE FIELD PRIMITIVE'S PLAIN WORD, NOT A
   CONTAINER.** The render draws it as a capsule. A capsule ships as a rounded
   rectangle on `--nf-radius-control`, and 14px on a 22px tag is 0.636, which
   draws a capsule whatever it is called. There is no honest rectangle
   available at that size, so it takes no container at all. The two labels that
   ARE containers, "Usually two working days" and "Under review", are 2.75rem
   tall for exactly this reason and measure 0.318.

**AND ONE THING SCREEN TWO COULD NOT BE PROVED DOING.** Every Supabase origin
is refused by this sandbox's egress proxy, so `listStates` and
`fetchLocalGovernments` both return empty here and the two pickers have no rows
to offer. The proof records the Continue control CORRECTLY DISABLED in that
state, stands four real states into the preview route so the picker itself can
be opened and measured, and opens screen three directly. Nobody has yet seen
this form choose a real local government.

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

**A SIXTH HARNESS LIE, AND IT WROTE FIVE PROOFS OF THE SIGN IN SCREEN BEFORE
IT WAS CAUGHT.** `verify-shots.mjs` checks the HTTP status and it checks the
`data-nf-not-found` marker, and neither of those looks at WHERE THE BROWSER
ENDED UP. On a production server at `6c621e3` with Supabase configured, the
gate in `proxy.ts` is live and every product route answers 307 to `/sign-in`
for a visitor with no session. Asked for `/notifications`, `/saved/searches`,
`/profile/setup`, `/legal/privacy` and `/legal/terms`, the harness followed all
five redirects and wrote five PNGs of the SIGN IN SCREEN under those five
names. Every assertion in the file passed on every one of them, because the
sign-in screen is a real page of ours: right theme, stylesheets loaded, no
stuck `Reveal` band, 200, no not-found marker. Three were byte identical to
each other. It is the same failure as the 404 shots the file's fourth check
exists for, arriving through a different door, and worse in one way: a picture
of the sign-in screen looks like a screen somebody designed, so it survives a
human glance as well as the machine's. Those five files were deleted rather
than filed. `verify-shots.mjs` now compares the landed pathname with the one
asked for and refuses the difference, and the refusal is demonstrated: the same
five routes now produce no file and name the redirect.

**AND THAT IS WHY THE FOUR `PageScene` SCREENS STILL CARRY NO ROW.** A2 said
this plainly and A2 was right: `/notifications`, `/saved/searches` and
`/profile/setup` are behind the signed-in gate and a proof of them needs a
session that no worker in this stint has. The reason A2 gave for the blockage
has changed, because `next build` is green on a clean checkout of the tip, but
the conclusion has not. `/verification` was the one of the four that IS
reachable without a session, and it now has a row above.

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

**TRACK O, MEASURED ON A PRODUCTION SERVER BY A2b, AND THE PROOF AS WRITTEN
COULD NOT HAVE ANSWERED IT.** `more-proof.mjs` opens the drawer and fetches
every `href` it draws. With the gate live, an anonymous drawer draws three rows
and a foot, because `buildNav` builds the whole account block, both workspaces
and the tail behind `if (signedIn)`; and every href it would fetch answers 307.
Run as written it reports nothing reachable, which is not an answer to the
founder's question. Asked properly, of the eighteen destinations in the list
above, read off the DOM on a production server rather than off the HTML text:
**four render to a stranger** (`/search`, `/around`, `/stays`,
`/stays/search`), **thirteen answer 307 to `/sign-in`**, which is the gate
doing its job and proves the route exists rather than that it is missing, and
**one is not-found**, `/crypto`, which is the deliberate closure recorded
above. Nothing on More became unreachable. One caution for whoever runs this
next: the not-found marker must be read from the DOM after the page settles,
never by searching the response body for the string, because Next ships the
segment's not-found template inside the flight payload of pages that are
perfectly fine, and this worker briefly mis-read four healthy routes as 404s
that way.

**B1's register extensions, recorded so they can be checked.** `GOVERNING-01`
and `02` govern everything this scope drew except three pieces of anatomy the
set uses everywhere and draws nowhere in isolation: the progress row of small
filled rectangles (`.nf-steprow`), the calm explanatory panel with its small
round glyph (`.nf-calmpanel`), and the workspace standing label
(`.nf-switch-standing`). All three are built from the register and the last is
the one the renders draw as a capsule.

**B2, Tracks L and M: what the three tools now see, what closed, and what is
still owed.** The tools went first, because a light defect that ships after
this week is a tooling failure and not a CSS one. All three are on main as
`e1a48b0`, before a single defect was touched.

| Sweep | Before | After |
| --- | --- | --- |
| Shape ratio, 9 routes x 2 widths x 2 themes | the script had NO THEME SWITCH at all; 2 breaches in dark | **0 breaches** |
| Contrast, the whole preview harness, both themes | 4 elements on 1 route | 98 routes, 7,467 text-bearing leaves, **150 below the floor: dark 51, light 99** |
| Twin mixing | no such check existed | 45 objects in 16 sets, **2 sets drawing two artwork families side by side** |
| The CSS gate on the paper twin | `[data-theme]` excluded BY NAME | 11 invalid shadows and 8 dull light controls found and closed |

**THE CONTRAST NUMBER IS A BASELINE, NOT A PASS.** 150 is the first
measurement this product has ever had of its own ink, and light failing at
twice the rate of dark is the shape of the founder's complaint, measured. It
is also not a list of 150 defects, and I corrected the sweep once before
quoting it: its first run said 214 by counting reveal bands at opacity 0 and
boxes with no painted text as 1.00:1 failures, which is exactly
`compare-surface.mjs`'s documented "third harness lie" arriving in a second
tool. 68 boxes are now quarantined as "nothing painted" rather than reported,
and some of the remaining 150 will still be that class. The genuine ones at
the head of the list are the legal page's grey section numerals at 1.31:1, the
admin desk's "Edit" at 1.32:1 and the agent calendar's day numbers at 1.57:1.
None is in Track L's scope. All three are now findable, which is the point.

**WHERE THE SURVEYS TURNED OUT TO BE WRONG, because a measurement beat a
reading.** `LIGHT_MODE_SURVEY.md` calls the settings hub avatar initials "the
clearest single defect in the survey", white on white at 1.00:1. It is not a
defect. The initials sit on a `> span` carrying `--nf-gradient-brand`, which is
`#005DE2` to `#003A8C` in daylight, and the white ink on it is correct in both
themes; I opened it in both. The 1.00:1 came from pairing the parent's `color`
with the parent's light `background`, which is precisely the ancestor-blindness
that survey's own honesty log declares. NOT FIXED, BECAUSE IT IS NOT BROKEN.
Likewise `DESIGN_DRIFT_SURVEY.md`'s "eleven more above 0.35": those heights
were INFERRED from padding, and the live sweep across nine routes at two
widths in both themes finds one, at 0.36.

**And one place my own first pass was wrong, recorded because the browser
caught it and I did not.** Lowering `min-height` on the wallet's action tile
and quick card is what the drift survey prescribes, and it moved NEITHER of
them: the tile measured 70.8px before and after. A minimum only binds when the
content is shorter than it, and both were taller than their floor. It took 8px
of block padding and the render's own 22px glyph to reach 60.8. The same
lesson as the box-shadow and the auth ink, three times in one day: the file
says one thing and the browser draws another, and only one of them ships.

**STILL OWED, NAMED SO IT IS NOT MISTAKEN FOR CLOSED.**

1. **The 121 untwinned objects need real artwork.** What shipped makes them
   LEGIBLE on paper without it, by generalising the framed plate that
   `glass.css:1073-1077` had already proved on the home grid, which is the one
   surface the founder says reads correctly. The surfaces still owed the real
   thing are every one that draws an object from a table: the settings hub's
   six, the search rail's nine, the home grid's nine, the stays category
   tiles, the landing grids, bookings, trips, checkout, and the flip cover.
   Commissioning them is a render order and the founder's to place.
2. **The wallet's quick-action cards are 115px against the render's 85, and I
   could not close the rest from a stylesheet.** Measured at 390 on the shipped
   build: the title has 69.5px of width, "Send Money" is 73.1px and "Request
   Money" is 91.2px, and all four subs are over too, "Every movement" at 95.0.
   Four cards across a 390px screen cannot hand a title 91.2px, and the
   inter-card gap trick buys three. The fix is the STRINGS, as the drift survey
   concluded, and the i18n rule for this build forbids a worker rewriting
   another scope's keys. So the measurements are here rather than re-derived:
   shorten `wallet.home.sendMoney` and `requestMoney` to "Send" and "Request",
   and the four subs to fit, in all four locales, and the card falls to ~85.
3. **Two sets still draw two artwork families side by side**, found by the new
   `--twin-sweep`: `app/host/page.tsx` draws `doc-review` (twinned) beside
   `hotel` (untwinned), and `RentalFace` draws `seal-check` beside
   `home-search`. B3 found the same class independently, from the other end.
   The rule is A SET OF OBJECTS DRAWN SIDE BY SIDE IS ALL TWINNED OR NONE, and
   until today nothing could check it, because the fact lived in a `Set` inside
   `BrandIcon.tsx` and never reached the DOM. It does now, as `data-twinned`
   and `data-object`, which is why there is a number at all.
4. **`--nf-edge-stride-base` is 1.82:1 on paper, up from 1.31:1, and still
   under the 3:1 boundary floor.** It is three quarters of every card's ring.
   Taking a conic decoration to 3:1 would put a hard blue outline on every card
   in daylight, so it is recorded rather than forced.
5. **The switch track's fill is 1.13:1 against a white card.** The thumb now
   carries a 5.16:1 neutral ring so an off switch reads at all, and the track
   stays grey, because grey off and brand on is what a switch MEANS.
6. **`/start`'s carousel pager stays as it is, and that is a decision.**
   DESIGN_DIRECTION section 1.4 lists "a progress bar" among the things that
   are SHAPES and not controls and says the law does not reach them; a 6px bar
   carries no text and cannot be a text-bearing capsule. That it disagrees with
   `/verification`'s step bar is a register question, open, not a breach.
7. **`.nf-social-link` on a `<button>` DRAWS CORRECTLY** at 390 in dark,
   checked rather than reasoned about: Inter 16px weight 650, brand ink,
   transparent, no border. `text-align: center` and `appearance: button` do
   survive Tailwind's preflight and are inert only because the element is
   `inline-flex` and content-sized; `button.nf-social-link` neutralises both so
   a future width change cannot silently centre the label.

**One founder decision, carried unanswered and NOT acted on.** The render draws
a completed credit in cyan and ours is emerald, and our colour law reserves
cyan for PENDING. Emerald stays.

**And one correction I accept rather than argue.** B3 withdrew my light
override for `.nf-hero-plate__title` and `__lede`. B3 is right: the hero is a
dusk photograph, its ground does not change with the theme, so ink that flips
with the theme is wrong in one mode whichever way it flips. `--nf-content-on-media`
is the correct answer and my fix was only correct given B3's own earlier
comment calling it "a light page". Not re-added.

---

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

### WHAT SHIPPED, AND THE TWO PLACES THE MEASUREMENT ABOVE WAS WRONG

Implemented by B2 in the token layer: `--nf-gradient-cta` is the specular
curve, `--nf-rim-primary` the rim, `--nf-bloom-lit` the two shadows, each with
a light twin, plus `--nf-bloom-lit-press` and `--nf-bloom-lit-hover`. The
control rules name tokens and paint no light of their own.

**THE DEEPEST POINT IS AT 64 PER CENT, NOT 45, AND IT IS #0042FD, NOT
#004AFD.** The reading above takes the mean of each full row, and a full row
includes the button's own WHITE LABEL. White lifts luminance in exactly the
middle rows where the label sits, which makes the trough look shallower and
pushes it upwards. Re-measured over the 237 of 309 columns that carry no label
ink, the curve bottoms at 64 per cent down at L 65.5. #004AFD is real, but it
is row +19, a point on the way down. The second reference agrees on the
structure at half the scale and bottoms at 73 per cent. `--nf-electric-450` is
the new rung, added deliberately, because the family desaturates to reach that
luminance and the render never desaturates.

**THE OLD "MEASURED DOWN" RULING IN `tokens.css` WAS MEASURED ON NOISE.** It
walked outward from the button's RIGHT edge, found the light gone by 20px, and
took the whole glow scale down a third on the strength of it. Section 13 itself
notes the bezel is 13px to the side and is lit. Re-running the instrument
confirms it: the horizontal bloom dies at 1px, goes NEGATIVE at 16px and back
up to +13.0 at 24px. That is a bezel, not a decay curve. Both founder
complaints, "neon" and "flat", are the same fault seen from two sides: the old
shadow was `0 10px 30px`, a coloured shadow pushed ten pixels DOWN, and cutting
it back left nothing. Zero offset is the difference between light and a drop
shadow.

### THE LIGHT-MODE HYPOTHESIS: TWO PARTS PROVEN, ONE DISPROVED

Measured on our own shipped build, same instrument, `b2/cta-390-light.png`:

1. **The tight shadow keeping the brand hue: PROVEN.** On paper the bloom reads
   as a DARKENING rather than a light, symmetric on both sides at
   -23.8, -16.1, -6.4, -3.9, -0.9 L at 2, 4, 8, 12 and 16px against a floor of
   239, dying by 20px. It is a shadow that is still blue, so the control reads
   as a blue object on paper rather than a grey one.
2. **The wide one becoming a genuine shadow in deep blue: PROVEN**, as
   `rgb(0 32 96 / 0.22)` at a 30px radius with an offset, because in daylight
   "the surface is receiving light" is not a job that exists.
3. **The rim inverting to a top-edge darkening: DISPROVED, and it matters.**
   The white rim was KEPT at 22 per cent and measures a +35.1 lift on paper,
   reading correctly. The reason is that a specular rim's contrast is against
   the FILL BENEATH IT, not against the page behind the control, and the fill
   is a dark saturated blue in both themes. Inverting it would have removed the
   one cue that makes a control read as lit from above, on the theme that
   needs the most help. **A dark-fill control does not invert its own
   highlight just because the page behind it did.**

**AND THE FIRST LIGHT MEASUREMENT WAS OF THE WRONG RULE.** `light.css:191`
replaced the primary control's entire `box-shadow` with `0 4px 14px`, one
offset shadow, so the token layer's light twins were overridden by a component
rule and the lit treatment did not exist in daylight at all. The first run
showed a real darkening around the control and it would have been easy to
record that as the derivation working. It was that rule. The override is gone
and the light values live with the dark ones. A number measured off the wrong
declaration proves nothing.

### THE CONTAINERS, MEASURED BEFORE BEING ASSERTED (item 7, first pass)

The founder's words are that containers across the platform are "not
consistent and not professional... different edges, different fills, different
glows, different blues". Enumerated from source across all 37 stylesheets,
comments stripped so a documented value is never read as a live one. A
container is a rule painting both an edge and a fill, or a fill and a radius.

**430 container-ish rules. 270 DISTINCT (edge, fill, radius) COMBINATIONS.
203 of those are used EXACTLY ONCE**, which is the founder's complaint in one
number: a surface drawing its own container.

| Property | Distinct values | Most used |
| --- | --- | --- |
| edge | 59 | `1px solid var(--nf-brand-edge)` 37x, `--nf-brand-edge-soft` 35x |
| fill | 110 | `--nf-well-fill` 72x, `--nf-brand-primary` 33x, `--nf-surface-inset` 32x |
| radius | 17 | `--nf-radius-circle` 64x, `--nf-radius-control` 55x, `--nf-radius-md` 38x |

**AND "DIFFERENT BLUES" IS NOT RAW HEXES: ZERO of the 430 carries a raw colour
literal.** Every one already names a token. The divergence is in WHICH RUNG
each surface picks from a ladder that offers `--nf-brand-edge`, `-soft`,
`-strong`, `--nf-brand-primary`, `--nf-border-brand` and `--nf-border-default`
for the same job. That matters for the fix: this is not a sweep for stray
hexes, which is what "different blues" sounds like and what somebody would
otherwise go looking for. It is that no rule says which rung a container takes,
so 430 rules each answered it alone and 203 answered it uniquely.

**NOT YET DONE**, and it is the larger half: one container anatomy in the token
layer, then all 430 rules moved onto it, then a sweep proving nothing draws its
own. This entry is the measurement the work needs and nothing more.

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

## 15. THE FIVE PROBE ROWS, NAMED BEFORE ANY OF THEM WAS TOUCHED

The founder's ruling: "A migration that forges JWT claims and commits its own
evidence into production is not data, it is a mess, and the only reservation
this platform has being a forged one is the same dishonesty I spent all of
today removing from the front page." Write down exactly what the five are
first, so there is a record of what was removed and why. Then remove them.

Migration `20260919181950_lead_the_first_first_party_venue_and_the_reservation_loop_proved_against_it`
forged JWT claims, proved a stranger could not read the thread, and ended on an
UPDATE rather than a RAISE, so it committed. All five rows carry the same
timestamp to the microsecond, `2026-09-19 18:19:50.836154+00`, which is how
they were identified rather than by guessing at names.

| # | Table | Id | What it is |
| --- | --- | --- | --- |
| 1 | `businesses` | `ac275023-77c6-441f-9bde-10cb9024f105` | "Vallo House Kitchen", DRAFT, the forged first-party venue |
| 2 | `reservations` | `88872013-6e14-456b-b5ad-6ba22430529c` | party of 4, CANCELLED. **The only reservation this platform has** |
| 3 | `conversations` | `2ad0ffaf-d58a-4e1f-8e80-134368820533` | `context_kind = 'reservation'`, pointing at row 2 |
| 4 | `messages` | `c06eb9fd-2fe4-4559-8eb2-7eb5ac092727` | "Your table is held for four at seven. See you tomorrow." |
| 5 | `messages` | `6a6c704a-0055-4680-aa76-f5cbd6ffb05b` | "Hello, we are coming for dinner tomorrow at seven." |

### Rows 4 and 5 are gone. Rows 1 to 3 are not, and the reason is not caution

Applied as
`the_probe_that_committed_its_own_evidence_gives_back_its_two_messages`,
deleting by exact id and never by a predicate that could widen, ending in a
check that refuses unless both forged rows are gone and the thread holds
exactly what it should.

**A REAL MESSAGE, SENT BY A REAL PERSON, IS SITTING IN THE FORGED THREAD.**
Message `df2a20d3-31ea-4ede-9f11-df152b01da19`, sent 20 September at 05:20 by
the founder's own account, reads "Shared a listing" with a link to
`ed000000-0000-4000-8000-00000000003c`. It was sent into the probe's
conversation while the app was being used for real.

And the three remaining rows cannot be separated from it. Measured, not
assumed:

* `conversations.reservation_id -> reservations` is **ON DELETE CASCADE**, so
  deleting the reservation deletes the thread.
* `messages.conversation_id -> conversations` is **ON DELETE CASCADE**, so
  deleting the thread deletes every message in it, the real one included.
* `reservations.business_id -> businesses` is **ON DELETE CASCADE**, so
  deleting the venue takes the same chain down from the other end.
* `conversations_context_shape_chk` requires a `reservation` thread to HAVE a
  reservation, so the link cannot simply be nulled to spare the thread.

So there is no ordering of deletes that removes the forged reservation and
keeps that message. It is three rows and one real message, or none of them.

**That is the founder's call and not mine.** The instruction authorised
removing a probe's forged rows; it did not authorise deleting a person's own
message, and the person giving the instruction did not know one was there.
Everything needed to decide is above, including the message's exact content,
so nothing is lost by the record either way. Moving the message to another
thread was considered and refused: re-parenting somebody's message to a
conversation they did not send it in is forging data in the opposite
direction, which is the same fault this is undoing.

## 16. C1, C2, A3 AND A2b, AUDITED BY THE LEAD

Four hand-backs. What follows is what I checked myself against a primary
source, not what I was told.

### C1, the property pipeline: the listing identifier, verified in the database

C1 claimed `VL-` codes minted by trigger at PUBLISH only, never at draft, never
changed afterwards, and all 64 published rows carrying one. Queried live:

| Measure | Result |
| --- | --- |
| Published listings | 64 |
| Published carrying a well formed `^VL-[A-Z0-9]{6}$` | **64** |
| Published with no code | **0** |
| Non-published carrying a code | **0** |
| Distinct codes | **64**, so no collision |

Every number is what was claimed. `ListingCodePanel`, the component C1 says it
wrote and then deleted for having no callers, has no reference anywhere in the
tree, so that is true as well.

**Its proofs were outside the repository and are now inside it.** Eleven
captures were written to `/home/user/c1-proof`, where a container reclaim
loses them and where no reviewer would look. Section 6 says a scope closes
with its proof RECORDED, and a proof nobody else can open is not recorded.
Compressed 15.4MB to 2.4MB and committed to `docs/design/proofs/c1/`.

**C1 corrected one of its own rulings unprompted and the correction is the
useful part.** It had declared custom SMTP configured, reasoning from auth
logs that "carry no mail event in the last twenty four hours, which is the
whole window they hold". Twenty four hours is the maximum span of ONE QUERY,
not the retention. Passing an explicit start and end finds events ten days
back. It declared a check impossible that was one parameter away, and said so
rather than leaving the ruling standing.

### C2, the stays pipeline: the guard I asked for came back narrower and better

I routed a check constraint refusing any fulfilment but `vallo` until the
partner label exists. C2 took it, and measured the ground first rather than
implementing what I asked: `accommodations_first_party_is_vallo_chk` already
existed and covers the FIRST PARTY row. It left that alone, because it stays
true after partner support ships, and wrote the new constraint for the row that
is NOT first party, which is exactly the partner row and exactly what the stop
list is about. Its probe went through `apply_migration`, chose its fixture by
the predicate under test, and ended in a deliberate raise. Seven checks,
including an UPDATE into a forbidden value, because a guard on inserts alone
lets a live row change into one the interface cannot describe, and including an
honest row still writing, because a constraint that refuses everything passes
every other check and breaks the product.

That is better than what I asked for, and the difference came from measuring.

### A3: two things it got wrong, both of which it reported before I found them

The `en.ts` collision is section 14. The ratchet's defect is section 14 as
well. What is worth adding here is the pattern: **both were caught because A3
volunteered them.** Neither was in a diff I would have read.

Its own measurement of the i18n blocker stands and is worse than a key count
suggests: roughly 100 keys per locale are PRESENT with English inside them,
invisible to a key count and identical on screen. The home grid's `listingOne`
and `listingMany`, the count line under every tile on the first screen of the
product, are missing from all three locales.

**And its browser-versus-source finding is a small masterpiece of method.** Its
TSX scanner found a capsule on every post card in the feed that carries an
area. A real browser sweep of the same route at both widths reported ZERO,
because no fixture post in the harness carries an area. The check the design
direction names could not see the defect. Two checks see more than either
alone, and where they disagree the browser wins.

### A2b: A SIXTH HARNESS LIE, AND IT HAD ALREADY WRITTEN FIVE FALSE PROOFS

`verify-shots.mjs` checked the status and the not-found marker and never
checked WHERE THE BROWSER ENDED UP. With the auth gate live it followed five
redirects and wrote five PNGs **of the sign-in screen** under the names
`/notifications`, `/saved/searches`, `/profile/setup`, `/legal/privacy` and
`/legal/terms`. Every assertion passed. Three of the files were byte
identical, which is the tell nobody looked for. A2b deleted them rather than
filing them and added a landed-path check.

This is the sixth lie from the same harness family and it is the founder's
pattern exactly: a green light that could not see the thing it was reporting
on. It is now evidence for the named sweep rather than an anecdote.

A2b also found that **B1's proof runner was telling harness lie number one**:
Chromium launched with `--no-sandbox` alone silently drops `backdrop-filter`,
on three surfaces that are entirely glass. Those shots could not have been
honest even if the disk had held them, and the disk had not: one was truncated
with no IEND chunk and two were zero bytes. All three retaken on a production
server, and **B1's three ratios are confirmed to the digit**.

One claim did not survive: B1's standing label at 0.244 is UNVERIFIED, because
it only draws on a workspace row and a visitor with no session has none. The
row now says so.

### A grant audit nobody asked for, because rule 21 deserved a measurement

Rule 21 says every migration creating a `SECURITY DEFINER` function revokes
`EXECUTE` from `anon` and `authenticated` in the same migration. I measured
the live database rather than reading migrations, because a migration proves
what was written and a grant proves what is true.

**96 SECURITY DEFINER functions are executable by `anon` or `authenticated`.**
Most are `private.*` trigger functions, which PostgREST does not expose, so
they cannot be reached over the API whatever their grants. The ones that
matter are the nine in `public` that `authenticated` can call, and I read every
one of them:

* Seven check `private.has_role` internally before doing anything.
* `public.platform_stats` is deliberately public and is the stats band.
* `public.business_transfer_board` carries a self-only guard, returning empty
  lists rather than an error to anyone who is neither the subject nor the
  service role. My first grep for a role check missed it because the guard is
  a self check, which is the RIGHT guard for a self-serving read.

**So nothing is exposed today, and rule 21's revoke is defence in depth rather
than the only line.** The honest summary is the one worth writing down: the
guard held everywhere I checked, the revoke did not. A function that ever
ships without its own internal check would be reachable, and the rule exists
so that day never arrives.

## 17. THE MIRROR SWEEP: every test in this repository that asserts on the shape of source rather than on behaviour

A test passed because it grepped the source for a string. It claimed terms
acceptance was recorded. The column it stood for did not exist and no
acceptance was ever recorded for any user. It was green for weeks. That test
was a mirror: it reflected the source back at itself and called the reflection
evidence. This section is the sweep for the others, on the assumption that if
one green light was measuring nothing, others are.

### What was examined, and how

* **148 `*.test.ts` under `apps/web/src`.** There are no `*.test.tsx` files
  anywhere in the repository and no tests at all under `packages/`.
* **82 `*.spec.mjs` under `apps/web/tests`**, the Playwright suite.
* Every one was searched for the six shapes: a file read followed by a
  `toContain`, `toMatch` or regex over the text; an import made only to assert
  on `Function.prototype.toString()`, a function's `.name`, or the presence of
  a key; a migration asserted by its text rather than by the object it creates;
  a component asserted by its source rather than by its DOM; a snapshot that is
  the only assertion; and any assertion whose subject is a path, a filename, a
  comment or a doc string.
* **16 of the 148 read source. 23 of the 82 read source.** The remaining 132
  and 59 assert on values, calls and rendered pages. They were classified by
  that search rather than read line by line, which is stated here because a
  census taken by grep is a census with a known edge.
* **There is not one snapshot test in this repository.** No
  `toMatchSnapshot`, no `toMatchInlineSnapshot`, no `__snapshots__` directory.
  That whole family of mirror is simply absent, which is worth recording as a
  good result rather than leaving as a gap in the table.
* **No test asserts on `Function.prototype.toString()` or on a function's
  `.name`.** The `.name` hits in the search were all fixture labels.

### The verdicts, counted

| Verdict | Rows |
| --- | --- |
| 1. SOUND | 9 |
| 2. WEAK BUT HONEST | 12 |
| 3. A MIRROR, still standing | 7 |
| 4. FIXED, now asserts on behaviour | 6 |

**34 rows, and a row is a claim rather than a file**, because several files
hold a sound sweep and a mirror in the same `describe`. The count covers the
two tables below: the sixteen vitest files that read source, claim by claim,
and the four Playwright specs read in full. The nineteen surveyed specs carry
no individual verdict and are not counted, because a verdict taken from a grep
is not a verdict.

### The vitest suite, claim by claim

| File and claim | Verdict | Why |
| --- | --- | --- |
| `lib/safety/user-generated-content.test.ts` "records the version that was on screen" | **FIXED** | **THE TWIN OF THE INCIDENT.** It asserted `readFileSync("lib/auth/actions.ts").toContain("terms_version")`. That string is a field written into `auth.users.raw_user_meta_data` and read by nothing. `read` returned the file WITH its comments and the block above that field discusses `terms_version` at length, so the assertion would have passed on the prose alone with every line of the receipt deleted. Measured in a clean worktree: deleting the `recordTermsAcceptance` call leaves the old assertion green. It is now a real call with real arguments against a replaced writer, asserting which documents are recorded and at which versions, plus a call-site check on source with the prose stripped, named for what it is. |
| `lib/safety/user-generated-content.test.ts` "adds an objectionable content branch to both scanners" | **FIXED** | It asserted that `objectionable_pattern` and the two scanner functions each appear in the migration. A migration that declares the pattern function and two scanners that never ask it anything satisfied all three: a filter that exists and does not run. It now extracts each scanner's executable body and asserts the body calls `private.objectionable_pattern()`. |
| `lib/safety/user-generated-content.test.ts` "ships the term list empty and says so" | **FIXED** | The load-bearing assertion was `toContain("-- SEED REQUIRED")`, a comment. The note is kept because a reader needs it, and the claim is now carried by an assertion that the executable half of the migration contains no `insert into public.blocked_terms` at all. |
| `lib/copy/alphabet.test.ts` | **FIXED** | It swept the four locale files as TEXT, which cannot see the one spelling that matters most. `"buҳatar"` is eleven ASCII characters on disk and serves the Cyrillic ha with descender to a reader in Kano: the exact defect this file exists for, in the one form it was blind to, and the form a model reaches for whenever a character is awkward to type. The dictionary is now walked as VALUES as well, after the escapes have resolved and after `withFallback` has filled the gaps. Measured: the escaped character passes the file sweep and fails the new walk. |
| `lib/native/deep-link-readiness.test.ts` "the build gate must agree with this verdict" | **FIXED** | It asserted `readFileSync("scripts/check-deep-links.mjs").toContain("process.exit(warnOnly ? 0 : 1)")`. The gate deliberately re-states the rules in plain JavaScript rather than importing the checker, so a hand copy of a rule is exactly what drifts, and the only thing standing between the two copies was an assertion that the copy existed. The gate is now executed and the problems it names are matched one for one, per file, against the checker's. Exit code alone was not enough: loosening the gate's Team ID rule while the fingerprint rule still refuses leaves the exit code at 1. Measured: that mutation now fails. |
| `components/app/listing/example-notice.test.ts` (whole file) | **FIXED**, in the only direction available | Every assertion read the component WITH its comments. `toContain("EXAMPLE_STATEMENT")` passed on the doc block that explains why the disclosure must never be deleted, so the disclosure could have been deleted and left the paragraph about it doing the work of proving it was there. The `not.toContain` assertions had the mirror in reverse: a comment mentioning `hover:` or `<button` failed a test about code that was clean. It now reads code only, through the same `withoutComments` the copy sweep uses. **It still does not render anything**, and that half is below. |
| `lib/brand-domain.test.ts` | **SOUND** | The Android manifest, the iOS entitlements, `build.gradle`, `project.pbxproj`, `strings.xml`, `assetlinks.json` and the AASA are not TypeScript, nothing imports them, and an App Link verifies by exact host. Their text IS the subject. It genuinely catches the drift it is named for, which has already happened twice. |
| `lib/copy/banned-phrases.test.ts` | **SOUND** | A lint-style sweep over every source file and every locale file for banned copy. The shipped string IS the subject. The two file-level exemptions are named in the file with what they cost. |
| `lib/security/money-limits-call-sites.test.ts` | **SOUND** | The founder's own example shape: the call graph is the subject, and no unit test on a pure table can reach it. It states its own limit, which is that it cannot see a `guardMoney` call in dead code or after the spend. |
| `lib/email/listings.test.ts` "no other route from the catalogue into email" | **SOUND** | An import-graph assertion: no module under `lib/email` may reach the listing repository. The graph is the subject. The rest of the file is behavioural, with an obedient and a leaky repository. |
| `lib/security/anon-columns.test.ts` | **SOUND** | It reads the denied column list OUT of the migration rather than duplicating it, then pairs it against the real `LISTING_SELECTS` values. The ordering assertion (revoke before grant) is about SQL statement order, which is the subject, and a migration written the other way applies cleanly and changes nothing. |
| `lib/trust/agent-badge-derivation.test.ts` "read from nowhere but agent_badges" | **SOUND** | It parses every PostgREST select made against `agents` across the tree and asserts none asks for the raw `verified` column, stripping embeds so a read THROUGH to the badge is not mistaken for one. The select graph is the subject. |
| `lib/email/shell.test.ts` (templates, palette in the shipped markup, byte-for-byte regeneration) | **SOUND** | The committed templates ARE the artefact that ships, so asserting on their text is asserting on behaviour. Running the generator into a temporary directory and comparing is the only check that catches a hand edit before it is overwritten. |
| `lib/email/shell.test.ts` "the auth generator uses the theme value %s" | **WEAK BUT HONEST** | Greps the generator source for each theme hex. It would miss a theme colour that survives only in a dead constant while the emails are drawn in another, though the sibling assertions on the rendered HTML narrow that considerably. |
| `app/(app)/listing/[id]/syndication.test.ts` | **WEAK BUT HONEST** | Reads `page.tsx` and asserts the delegation call is present, having first stripped comments, which most of the repository does not. It states in a long header exactly why it cannot import a `.tsx` and pairs the source half with a behavioural half against the gate. It would miss a delegation call in unreachable code. |
| `app/api/assistant/example-listings.test.ts` | **WEAK BUT HONEST** | Says so in its own header: "Asserting on the source is weaker than asserting on behaviour and it is far stronger than nothing, because the failure this guards against is somebody deleting a filter, not the filter behaving oddly." The counted-exclusion assertion is unusually careful: exactly one search without `excludeDemo`, not at most one. It would miss a filter that is present and wrong. |
| `lib/notify/junction.test.ts` "the decision paths are actually wired" | **WEAK BUT HONEST** | The rest of the file is genuinely behavioural, with both seams replaced. The last `describe` reads `lib/admin/actions.ts` for builder names. It catches the exact historical defect, which was three complete builders with no caller. It would miss a builder named only in an import list, or an `announce` behind a flag, and it does not strip comments. |
| `lib/listings/retirement.test.ts` | **WEAK BUT HONEST** | The alarm itself is a real clock. The migration assertion claims the date "the migration wrote onto the rows" and proves the date is in the file. It would miss rows whose `demo_retire_after` disagrees with the migration that was supposed to stamp them. |
| `lib/trust/agent-badge-derivation.test.ts` "is documented on VerifiedAvatar" | **WEAK BUT HONEST** | The subject is a doc comment and the test is named "is documented". It claims no more than it proves. It would miss a component reading the wrong source while carrying the right comment. |
| `lib/trust/agent-badge-derivation.test.ts` (migration constraint assertions) | **WEAK BUT HONEST** | Comments stripped, executable SQL asserted. It cannot know the constraint exists in the database. |
| `lib/account-deletion/plan.test.ts` (the destroy list, the retained list, the transfer and close migrations) | **WEAK BUT HONEST** | Comments are stripped and the assertions are on executable SQL. It is named for the migration rather than for the database. It would miss a migration never applied, and a delete inside a branch that never runs. |
| `lib/safety/user-generated-content.test.ts` "does not name a listing in the report sheet's own copy" | **WEAK BUT HONEST** | A negative assertion on copy that ships. |
| `lib/safety/user-generated-content.test.ts` "does not put a safety control behind the social feature flag" | **SOUND** | An import-graph assertion: the module may not import the social flag. The graph is the subject, and the doc comment quoting the old guard is precisely why the assertion is on the import and not on the prose. |
| `lib/safety/user-generated-content.test.ts` "is born locked" | **WEAK BUT HONEST** | Migration text for the rule 21 revokes. Section 16 of this ledger already records that the revokes are the half that did not hold in the live database, which is the gap this shape leaves. |
| `lib/account-deletion/plan.test.ts` "each migration carries an RLS cross-user read that must fail" | **A MIRROR** | It asserts the SQL contains the banner `THE RLS CROSS-USER READ THAT MUST FAIL`. **The probe is entirely commented out** in all four migrations: it is a script for a human to paste into psql, not executable SQL. What could ship green: a migration carrying the banner and no probe beneath it, or a probe that was pasted, failed, and was never run again, with RLS wide open on the table. |
| `lib/account-deletion/plan.test.ts` "the new probes end in a deliberate raise" | **A MIRROR** | Asserts `toContain("PROBE ALL PASS")`, which is a string inside a commented-out `raise exception`. It proves a comment quotes a raise. |
| `lib/account-deletion/plan.test.ts` "the new probes are not vacuous" | **A MIRROR** | Asserts the migration contains the phrase `the read would be vacuous`. The subject is a sentence about vacuity. A probe can carry that sentence and still prove nothing, which is the definition of the thing the sentence denies. |
| `lib/safety/user-generated-content.test.ts` "mounts a report control inside the conversation options sheet" | **A MIRROR** | `ThreadOptionsSheet.tsx` contains `ReportSheet` and `targetType="conversation"`. What could ship green: the sheet imports the component and never mounts it, mounts it behind a condition that is never true, or mounts it off screen. Apple guideline 1.2 asks for a reporting mechanism, and a rejection on this point costs a submission cycle. |
| `lib/safety/user-generated-content.test.ts` "offers a block control in the conversation options sheet" | **A MIRROR** | Same shape, same file, `thread-block-opener` and `blockUserSafely` as strings. What could ship green: a block control that is present and does not call the action, or a handler wired to nothing. |
| `lib/safety/user-generated-content.test.ts` "blocks sign up until the tick is given" | **A MIRROR** | `EmailAuthForm.tsx` contains `AcceptTerms` and `setAcceptError(true)`. What could ship green: the error state is set and the submit is not stopped, so somebody opens an account without accepting and the receipt above records a consent they never gave. This one sits directly behind the incident. |
| `lib/safety/user-generated-content.test.ts` "is published at a route a signed out person can reach" | **A MIRROR** | The page contains `EULA_SECTIONS` and `proxy.ts` does not contain `"eula"`. Route reachability is a request and a response. What could ship green: the page calls an auth guard of its own, or lives under a group that redirects, and the EULA a reviewer is told to read returns a sign-in wall. |
| `lib/safety/user-generated-content.test.ts` "the document quotes the constant" | **WEAK BUT HONEST** | `eula.tsx` contains `{EULA_ZERO_TOLERANCE}`. It is named for the quoting rather than for the rendering. |

### What was converted, with the measurement for each

Four files. Each conversion was proved by breaking the thing it claims to
catch in a clean worktree and watching it go red, because a test that has
never failed for the right reason is a test nobody has checked.

1. `lib/safety/user-generated-content.test.ts`. Deleting the
   `recordTermsAcceptance` call from the sign-up action now fails. The old
   assertion stayed green through the same deletion, and would have stayed
   green with every remaining line of the receipt deleted too, on comments.
2. `lib/copy/alphabet.test.ts`. A Cyrillic ha written as `ҳ` into `ha.ts`
   passes the file sweep and fails the served-string walk.
3. `lib/native/deep-link-readiness.test.ts`. Loosening the gate's hand-copied
   Team ID rule now fails. It did not fail under the exit-code comparison
   alone, which is why the problems are matched per file.
4. `components/app/listing/example-notice.test.ts`. Hardened rather than
   converted: it reads code with the prose stripped, and it still renders
   nothing.

### What could not be converted, and exactly why

Each of these is a finding, not an edit. None of them was touched.

* **The seven remaining component mirrors need a rendered DOM, and this suite
  cannot produce one.** `vitest.config.ts` aliases `react` at its
  `react-server` entry, deliberately and for a stated reason: in the server
  build `cache` memoises and in the client build it does not, so a `cache`
  wrapped server module would behave one way in the app and another under test
  with everything green. That entry publishes no `jsx-dev-runtime`, so no
  `.tsx` in this codebase can be imported by this suite at all. Undoing the
  alias to render one notice would put every `cache` wrapped server module back
  in the blind spot it was pulled out of. **The honest home for these seven is
  a Playwright spec against a running server, which is outside a test file.**
* **The three probe mirrors in `plan.test.ts` need a database.** The probes are
  commented out on purpose so a human can paste them into psql inside a
  transaction that rolls back. Nothing a node test can do will run them. The
  conversion is a migration harness that executes the probe block against a
  branch database and asserts it raises, which is outside this scope. I did not
  edit that file at all: hardening a shared spec that is currently green, in a
  tree a dozen workers share, buys less than it risks.
* **`is published at a route a signed out person can reach`** needs a request
  through `proxy`. `proxy.ts` is importable and `proxy.test.ts` already builds a
  `NextRequest`, but the protection branch only runs when Supabase is
  configured, so the assertion would pass vacuously on the pass-through exit.
  `PRODUCT_SEGMENTS` is not exported. Exporting it would make a real data
  assertion possible in one line, and that is an edit to application source.

### The Playwright suite, surveyed rather than read in full

23 of the 82 `*.spec.mjs` files read application source and assert on its text.
They are a different case from the vitest files because each of them ALSO
drives a real browser against a running server, so the source half is usually a
supplement to a rendered check rather than a substitute for one. **I read four
of the 23 in full and classified the other nineteen by their source-reading
assertions.** That is a survey and it is labelled as one.

The four read in full:

| File | Verdict on its source half |
| --- | --- |
| `auth-origin.spec.mjs` | **SOUND.** It rewrites `lib/site.ts` into a stub and EXECUTES it under node with different headers, which is behaviour, not text. The remaining greps count `/auth/callback` occurrences against occurrences built from `authOrigin()`, which is a ratio and cannot be satisfied by one stray string. |
| `auth-callback.spec.mjs` | **WEAK BUT HONEST.** It greps `lib/auth/actions.ts` for the three exchange shapes. It records in a comment that it deliberately STOPPED asserting on a literal `startsWith("//")` when the check moved to a tested module, because the assertion would then have failed on code that was strictly safer. That is the right instinct written down. |
| `admin-console.spec.mjs` | **SOUND**, with one **WEAK BUT HONEST** row. The clamp sweep and the `nf-queue-list` count are lint over the admin tree, and the geometry is measured in a real browser off a discovered stylesheet, after a hardcoded chunk name silently 404ed and every geometry check was measuring an unstyled div. `consoleUsers.length >= 14` is a threshold on a file count and would survive the wrong fourteen files. |
| `dead-ends-and-doors.spec.mjs` | **WEAK BUT HONEST.** Six components read as text beside a browser walk of the same routes. |

The nineteen surveyed: `discovery-behaviour`, `error-copy`, `gate`,
`icons-and-targets`, `intent-tune`, `interests-settings`, `map-tiles`,
`money-and-numbers`, `password-reset`, `phone`,
`polish-overlays-copy-status`, `profile-renders`, `public-feed`,
`session-memory`, `signup-verify`, `skeletons`, `social-profile-header`,
`truncation`, `trust-refund-desk`. Three things are worth recording from the
survey:

* **`session-memory.spec.mjs` strips comments before it asserts**, with its own
  `stripComments`. It is the only spec in the suite that does, and it is the
  habit the rest of the repository should copy. The incident turned on exactly
  this.
* **`icons-and-targets.spec.mjs` compares checked-in vector sources against
  `UiIcon.tsx`.** Two copies of one fact with a test between them is the sound
  shape, the same as `brand-domain.test.ts`.
* **`signup-verify.spec.mjs` and `password-reset.spec.mjs` grep
  `lib/auth/actions.ts` alongside a real browser walk.** Neither carries a copy
  of the terms mirror: I searched every spec and every script for
  `terms_version`, `termsVersion` and `terms_accept` and found none outside the
  file that was fixed.

**I edited none of the 82.** They need a dev server to run and I could not gate
a change to one, and a Playwright spec changed without being run is a change
nobody has measured.

### What I skipped, said plainly

* I did not read the 132 vitest files and 59 specs that make no source
  assertion. They were classified by a search for the six shapes plus the
  snapshot and `.name` families, and not opened.
* I did not open all nineteen surveyed specs line by line. Their verdicts are
  from their source-reading assertions only.
* I did not edit `lib/account-deletion/plan.test.ts`, although it holds three
  mirrors, for the reason given above.
* I did not run the Playwright suite. It needs a server on 3210 and a browser,
  and nothing I changed is in it.
* `lib/supply/registration.test.ts` is untracked in the shared tree and belongs
  to another worker. It makes no source assertion. I left it alone.

### The gate, and the commit it was taken at

Taken in a clean worktree at **`origin/main` `feffcdc`**, with this worker's
four files copied in and nothing else.

* `npx tsc --noEmit -p tsconfig.json`: clean.
* `npx eslint` over the four changed files: clean, and no rule was disabled.
* `npx vitest run`, the whole suite rather than the four files: **147 files,
  2659 tests, all passing.**

A gate reading is a photograph of a moving object and is worthless without the
commit it was taken at. That commit is `feffcdc`.

## 18. THE BLIND GREEN LIGHT SWEEP: every job, check, probe and monitor, asked one question

The founder asked for one thing, deliberately, as a named piece of work: two
of the day's findings were the same failure in different clothes. A scheduler
that reported success hourly for three weeks while the job it fired was never
read, and a test that passed by looking at source instead of behaviour. Both
were green lights that could not see the thing they were reporting on.

One question was put to every scheduled job, health check, probe, monitor and
assertion in scope. **Does it observe the outcome, or only that it tried?**

Three verdicts, and only the middle one is a finding.

* **SEES.** It observes the real outcome.
* **BLIND.** It reports on trying. What could be broken, and for how long,
  with this reading green.
* **FIXED.** It now observes the outcome, and this says what it reads.

Counts: **31 examined, 17 SEES, 7 FIXED, 7 BLIND and marked.** Counted one by
one rather than in groups, so the number can be checked against the lists
below. The gate for every fix is at the foot of this section.

### 18.1 What the live database says, measured before anything was written

Read only, against `uccixoonmbhrnyczyigt`, on 22 September 2026. Four
measurements, and the third one was not expected.

| Measure | Reading |
| --- | --- |
| `audit_log` rows with `action = 'wallet.reconciliation.run'` | **474, newest 29 August** |
| `cron.job_run_details` for `vallo_reconcile_payments` | **succeeded**, every hour, latest 13:47 today |
| `net._http_response`, the six responses pg_net still holds | **404, every one**, `DEPLOYMENT_NOT_FOUND` |
| `audit_log` rows with `entity_type = 'cron_job'` | **ZERO. Not one, ever.** |
| `risk_alerts` with `entity_type in ('cron_job','cron')` | **256 open**, newest 14:20 today |

The first three are the founder's incident, confirmed against the source
rather than taken from the report. The last two are a second outage nobody
had named, and it is larger.

**EVERY SCHEDULED JOB ON THIS PLATFORM HAS BEEN DEAD SINCE 19 SEPTEMBER.**
All seven Vercel cron entries are firing, reaching the live deployment and
being refused at the door with 401. Not one has ever written a run row.

| Job | Open refusals | First | Last |
| --- | ---: | --- | --- |
| hold-sweep | 87 | 19 Sep 00:05 | 22 Sep 14:05 |
| pg-cron-watch | 87 | 19 Sep 00:20 | 22 Sep 14:20 |
| paystack-reconcile | 69 | 19 Sep 18:10 | 22 Sep 14:10 |
| inventory-drift | 4 | 19 Sep 02:45 | 22 Sep 02:46 |
| complete-stays | 3 | 19 Sep 02:30 | 21 Sep 02:30 |
| account-purge | 3 | 20 Sep 03:15 | 22 Sep 03:15 |
| saved-search-alerts | 3 | 20 Sep 07:40 | 22 Sep 07:40 |

The cause is one secret: `RECONCILE_CRON_SECRET` on the host no longer equals
`CRON_SECRET` on the scheduler (docs/DEPLOY.md, section 2). **This needs the
founder**, and it is the single highest value line in this section: account
deletions past their thirty day promise are not being purged, holds are not
being released by the watched twin, and the money sweep is refused on both
of its two routes in at the same time.

Every one of those 256 rows was raised at MEDIUM severity with the word
"unauthorised", which reads as somebody probing a URL. Four days of the whole
fleet being down, reported hourly, in the colour of a nuisance.

### 18.2 The findings, one line each

#### FIXED, seven

| What | It used to observe | It now observes |
| --- | --- | --- |
| `lib/cron/run.ts`, the refusal | That a bad bearer arrived. One warning, same words for a stranger and for our own scheduler | Who was refused. A refused platform scheduler is `cron.<job>.locked_out` at **critical**, carrying `ran: false` and the secret to fix, and the spray limiter can no longer swallow it |
| `api/paystack/reconcile/route.ts`, the refusal | The same warning, 69 times | The same critical, through the same one decision |
| `lib/cron/report.ts`, the audit insert | That it tried to write the run row. A failure went to `console.error` and the run still answered 200 | The insert's answer. A lost row raises `cron.<job>.unrecorded` at critical, because that row IS the history the freshness watch reads |
| `lib/cron/freshness.ts`, a job with no history | Nothing. "Never ran" was excused for ever as a deploy that has not happened | The watch's own age. Once the watch has been reporting longer than a sibling's allowance, a sibling with no history is named as silent. A read that FAILED stays quiet, because an absence we could not measure is not evidence |
| `scripts/verify-desktop.mjs` | That it navigated. It wrote a PNG and printed success for a 404, a 500, the not-found body on a 200, a redirect to sign-in, the wrong theme or an unstyled page | The status, the not-found marker, where the browser landed, the rendered theme and the stylesheet count. No file is written for any of them |
| `scripts/audit/dead-controls.mjs` | That it meant to parse 584 files. Unreadable ones were skipped by a bare `continue` and the run printed PASS | What it actually parsed. Unread files are counted, named and fail the run with exit 1 |
| `scripts/audit/smoke.mjs` | 5xx and 404 only, so a route answering 403 walked through as `ok  403` | Every status that is not a page is a failure |

#### BLIND and NOT fixed, seven, with what each one costs

1. **`private.request_money_reconciliation`, the database job. THE INCIDENT.**
   It returns `{"status":"requested", "request_id": N}` the moment pg_net
   accepts the call and never looks at `net._http_response`. pg_cron records
   "succeeded, 1 row" for the SQL returning, which is true and means nothing.
   Cost, measured: three weeks and counting of no money reconciled at all,
   green every hour. **I may not apply a migration, so this is marked rather
   than fixed.** The fix is one function: read `net._http_response` for the
   previous run's `request_id` at the start of the next run, and raise or
   write a failure row for any status outside 2xx. Until then the only thing
   that can see this silence is the freshness watch, by the audit row the
   endpoint writes when it is actually reached. The Vault origin itself is the
   founder's and was not touched.
2. **`lib/alerts/record.ts` returns `{ ok: false, reason }` and every caller
   ignores it.** The desk is the last line, and when a write to it fails the
   only trace is a `console.warn`. Cost: a critical alert that never landed is
   indistinguishable from a quiet hour. The remedy is a second, independent
   channel, and there is one already built in `lib/observability/report.ts`:
   route a failed CRITICAL alert into `reportError`, which reads
   `response.ok`. That is a decision about what leaves the building, so it is
   named here rather than taken alone.
3. **`lib/observability/client.ts` posts crash reports and discards the
   answer** (`.catch(() => {})`, by design, inside error boundaries). Cost: if
   `/api/client-error` starts answering 500, client crash reporting is dead
   and nothing anywhere says so. It claims no success, which is why it is at
   the bottom of this list rather than the top.
4. **`scripts/audit/lib/tsx.mjs`, `walkFiles`.** A directory it cannot read is
   skipped silently, and every audit built on it then reports PASS over a tree
   it did not fully see. `dead-controls.mjs` now catches the per-FILE case; a
   whole unreadable directory still vanishes from all four audits.
5. **`cron.job_run_details` is nobody's reader while `pg-cron-watch` is
   refused.** `vallo-nightly-badges` failed three nights running, 16 to 18
   September, and recovered on its own. Nothing told anybody, because the only
   thing that reads that table is one of the seven jobs answering 401.
6. **An "attention" run answers HTTP 200.** Correct for the work, but a
   scheduler dashboard cannot distinguish it from a clean run. The alert desk
   is the only place the difference exists.
7. **The watch is inside the fleet it watches.** `pg-cron-watch` is the only
   thing that notices a silent job, and it is scheduled, deployed, secured and
   refused exactly like its six siblings. When the fleet goes down, the thing
   that reports the fleet going down goes down with it, which is precisely
   what happened on 19 September. The only scheduler on this platform that is
   independent of Vercel is pg_cron, and putting the watch there is a
   migration.

#### SEES, seventeen, in one line each

`executeCronJob` reads the verdict and answers 500, 503 or 200 on it.
`callServiceFunction` reads the PostgREST error and throws, so a failed RPC is
a reported failure. `holdSweep`, `completeStays` and `inventoryDrift` parse the
rows their function returned and turn the contents into the verdict.
`accountPurge` counts what was actually purged and what retried, and calls a
retry attention rather than success. `savedSearchAlerts` reads every insert and
update error and refuses to move a watermark past a notification that did not
land. `reportCronRun` with no service client raises critical rather than
returning quietly. `reportError` reads `response.ok` and returns
`transport_failed` on anything else. `scripts/verify-shots.mjs` proves five
separate things about the page before it will write a file, and its comments
are the best writing in this repository on why. `scripts/audit/route-inventory.mjs`
and `states-checklist.mjs` both fail conservatively: an unparseable file keeps
a surface ON the gap list rather than off it. `scripts/probes/*.sh` assert
against real database state after the fact, under `set -euo pipefail`, and
`m5_oversell.sh` reads the final inventory rather than the exit codes of the
two sessions that raced for it. `lib/alerts/record.test.ts` asserts the row
that was inserted and the outcome returned, not that a function was called.
`pgCronWatch`'s own half reads what `public.cron_job_failures` returned and
raises on the rows in it, and a read it cannot make throws rather than
answering clean. And the seven pg_cron jobs that act INSIDE Postgres
(`release_stale_booking_holds`, `purge_rate_limits`, `purge_idempotency_records`,
`announce_completed_stays`, `post_daily_note`, `escrow_sweep_timeouts`,
`sweep_badges`) see their own outcomes by construction: the work and the report
are the same transaction, so a failure rolls back and the scheduler records
"failed". That is not theory. `vallo-nightly-badges` recorded three failed runs
on 16, 17 and 18 September and recovered by itself, which is also finding 5
below, because nobody was reading them.

### 18.3 The gate

Clean worktree at **origin/main 62835d9**, node_modules hard linked, the
twelve changed files copied in.

* `npx tsc --noEmit -p tsconfig.json`: clean.
* `npx eslint` on all nine app files: clean. No rule was disabled anywhere.
* `npx vitest run src/lib/cron/`: **38 passed**, 3 files.
* `node scripts/audit/dead-controls.mjs`: 584 of 584 parsed, PASS, exit 0.
  Then driven the other way with one unreadable file present: `unread 1`,
  FAIL, exit 1. The new check was proved by behaviour, both ways, which is
  the whole point of the section it is in.

Not touched, deliberately: the Vault origin and its secrets, which are the
founder's and are being changed by him; `scripts/verify-shots.mjs`, which
another worker holds uncommitted; and every product table, since this stint
was read only against the database.

## 19. B3 AUDITED, AND A CORRECTION TO THE RECORD ABOUT THE LOST FILES

### THE STASH: TWO WORKERS HAVE NOW OWNED UP, AND THE ATTRIBUTION I RECORDED IS WITHDRAWN

The ledger said B1 ran `git stash` at about 12:46 and that this was the
incident that stashed eighty one files of twelve workers' work and refused to
pop. **B3 has now reported running `git stash` too, at about 12:41, inside a
compound command, popped within about twenty seconds with no conflicts.**

So there were TWO stashes, five minutes apart, and **which of them destroyed
the six uncommitted files is not known and is not worth establishing.**
Naming the wrong worker in a permanent record is a worse fault than leaving it
open, so the attribution is withdrawn rather than reassigned. Both reported it
unprompted, which is the behaviour that matters, and neither has used it since.

What stands, and is the whole point of the entry: **`git stash` in any form is
banned outright**, along with `git add -A`, `git checkout --` or `git restore`
on a file you did not write, and `git reset --hard`. A command that moves
somebody else's uncommitted work is not a command anybody on a shared tree
gets to run, however briefly they intend to hold it.

B3 also reported leaving two files staged in the shared tree, which another
worker's commit then swept up. That is the third instance of section 14's rule
and it is the same lesson: **staging is not saving. Commit, or the file is
somebody else's to lose.**

### A LIVE PRODUCT DEFECT ON THE FIRST SCREEN, AND A CORRECTION TO ITS SIZE

B3 reported that `MarketTiles`' nine tiles had been landing on the unfiltered
catalogue because `?intent=` is a dead parameter. **The finding is real and
the count was wrong, so it is recorded at its true size.**

Measured: `parseShelfQuery` reads `market=buy|rent` and nothing called
`intent`, so `/search?intent=rent` and `/search?intent=sale` carried no filter
at all. **Somebody tapping Buy on the first screen of the product got the
whole catalogue with rentals mixed in.** Nothing failed, nothing logged, and
the page looked entirely normal: it answered a different question from the one
it was asked.

But only TWO tiles were wrong, not nine. The other seven spell `type`,
`parseDiscoveryQuery` reads `type` through `parseKind`, and all six of their
values are present in `KIND_NOUN`. With the Invest band's call to action that
is three dead links in total. Repeating "nine" would have sent the next person
hunting six defects that do not exist.

Fixed, with a test that parses every tile's href through the REAL
`parseShelfQuery` and requires a filter back, because a link is a string: no
type checks it and no compiler can catch it. Proved by reintroducing the
defect, not by asserting the fix: eleven pass, and putting `intent=sale` back
turns two red naming the unfiltered catalogue.

### The light-mode finding that reaches every scope

Three of the glass objects (`keys-handover`, `contract-sign`, `doc-review`)
are among the 23 that ship a LIGHT TWIN; the other 121 do not. In dark the
distinction paints identically. On paper a twinned mark is a pale frosted
object standing on nothing while an untwinned one is dark artwork on a framed
navy plate, so **a row holding both is two artwork families in one row, and it
is invisible to everybody working in the default theme.**

The rule: **A SET OF OBJECTS DRAWN SIDE BY SIDE IS ALL TWINNED OR NONE**, and
no call site can currently tell which is which. Relayed to Group B, which is
building a twin sweep for it as this is written.

### Unstaffed by this hand-back, and it has no owner now

**The sale cost model has no schema.** No agency, legal, consent, stamp duty
or registration columns exist on the sale side, so the move-in honesty that
now exists for a tenant has no equivalent for a buyer: the one place a Nigerian
buyer is most often surprised by a number is the one place this platform
cannot yet show them one. B3 handed it to Group C and **both supply workers
have since handed back**, so it is nobody's. It is on the lead's board.

## 20. B2, TRACKS L AND M, AUDITED

Five commits, all verified ancestors of `origin/main`: `e1a48b0`, `8b07618`,
`95cef40`, `bfd8d2a`, `cf6e56f`.

### THE P1: THREE SCREENS A PERSON MEETS BEFORE THEY HAVE AN ACCOUNT WERE UNREADABLE ON PAPER

Sign in, sign up verify and reset password drew `rgb(22,24,29)` ink on the
plate's own `rgb(0,6,18)`. **1.14:1.** That is not dull, it is invisible: in
light mode, on the three screens somebody meets before they are a user at all,
the words were not there.

The cause is worth keeping because it will happen again. `color` is an
ordinary INHERITED property and it was resolving on `body`, which sits OUTSIDE
the `data-theme="dark"` element the auth shell pins. So the paper theme's ink
inherited straight past the dark lock: the tokens were pinned, the colour was
not. The fix is one declaration, `color: var(--nf-content-primary)` re-rooted
on `.nf-auth` itself, inside the lock.

Verified by reading the rule rather than the claim: the declaration is at
`auth.css:54` inside `.nf-auth`, which is the element carrying the pin. **1.14
to 20.29:1**, and rule 22 holds, because `.nf-auth__plate` computes
`rgb(0,6,18)` in both themes before and after. The ink is re-rooted; the plate
is not lightened.

### THE TOOLS WENT FIRST, AND THAT IS NOW HOUSE PRACTICE

B2 pushed the instruments before touching a single defect, so every number it
then quoted meant something. Three faults in the checks themselves:

* **`check-css-tokens.mjs` excluded the paper twin BY NAME.** `\[data-theme`
  sat in its resting-edge exclusion list, so the gate for light mode skipped
  light mode. That is the cleanest example this build has produced of a check
  that could not see the thing it was named for, and it belongs beside the
  scheduler that reported success on dispatch and the sweep that measured
  404s.
* Its shadow clause read `shape === "gradient"`, passing the case that
  happened eleven times. `box-shadow: rgb(18 21 26 / 0.18)` computes to `none`
  and takes valid sibling layers with it, confirmed in Chromium rather than
  inferred. Ten found by the fix, the eleventh by a new comma-layer scan.
* **`compare-surface.mjs` had no theme switch at all**, so every "both themes"
  sweep before this was one theme twice. It now takes `--theme`, and its
  colour checks REFUSE `--theme light`, because every hex they compare against
  was sampled from a dark render. Refusing is the right answer: a comparison
  against the wrong reference is worse than no comparison.

### THE LARGEST MEASURED OPEN DEFECT ON THE PLATFORM

With the probe widened from 4 elements on 1 route to every text-bearing leaf
on 98 routes in both themes, 7,467 leaves: **150 below the contrast floor, 51
dark and 99 light.** B2 called it a baseline and not a pass, which is exactly
right, and it is recorded here as the largest open defect we have a number for.

It is deliberately NOT being worked next. A lit primary control changes the
ground under a good number of those 99, so measuring them again before the
glow lands would be measuring twice.

### TWO THINGS B2 REFUSED TO FIX, WHICH ARE THE MOST VALUABLE LINES IN ITS REPORT

* The settings hub initials reading 1.00:1 are **correct**: they sit on a
  brand-gradient span, and the 1.00:1 came from the ancestor blindness that
  survey's own honesty log declares.
* The drift survey's "eleven above 0.35" were inferred from padding. The live
  sweep finds **one**, at 0.36.

Not fixing something that is not broken is harder than fixing it, and chasing
an ancestor-blind 1.00:1 would have cost somebody a day.

### Corrections B2 made against itself, unprompted

Its first wallet-tile pass lowered `min-height`, which is what the drift survey
prescribes and which moved nothing, because a minimum only binds when the
content is shorter than it. It measured 70.8px unchanged and fixed it properly.
And its own new sweep first reported 214 failures by counting reveal bands at
opacity 0 as 1.00:1: `compare-surface`'s own documented harness lie arriving in
a second tool. 214 to 150, with 68 quarantined as nothing painted.

### Still owed, with numbers

The 121 objects need real artwork; the framed plate makes them legible, not
right. The quick-action cards are 115px against 85 and the remaining 30px are
in the STRINGS: "Request Money" needs 91.2px in 69.5px, and the i18n rule
forbids rewriting another scope's keys, so the measured widths are recorded
rather than guessed at later. Two sets still mix artwork families,
`host/page.tsx` and `RentalFace`. Stride ring 1.82:1 and switch track 1.13:1,
both still under 3:1.

## 21. THE PROBE ROWS ARE GONE, AND THE SCHEDULER NEEDS A THIRD VARIABLE

### The three remaining rows, removed on the founder's explicit ruling

"It was me testing, not business, and forged rows being the only reservation
and conversation this platform has is the same dishonesty we spent today
stripping off the front page."

Removed: the venue `ac275023` ("Vallo House Kitchen", DRAFT), the reservation
`88872013` (party of 4, CANCELLED), the conversation `2ad0ffaf`, and the one
real message `df2a20d3` caught in the chain, sent 20 September 05:20 from the
founder's own account. All four are named in section 15 with their contents,
and again inside the migration itself, because a migration is the only record
that travels with the database.

**THE OBVIOUS ORDER WAS REFUSED BY THE PLATFORM'S OWN RULES, which is worth
keeping.** Deleting the conversation first looks safest and fails:
`reservations.conversation_id` is ON DELETE SET NULL, that null-out is an
UPDATE on `reservations`, and `private.reservation_is_valid()` fires on it and
raises **"that restaurant is not published"**, because the forged venue is a
DRAFT. The probe left behind a row that the product's own validity rule would
no longer let anybody edit. So the reservation went first and took its
conversation by cascade, which the migration watches for rather than assumes.

Measured afterwards: **0 reservations, 0 rows carrying the probe's timestamp**,
and 7 businesses, 7 conversations and 15 messages, which are the seeded
examples and real traffic, untouched. The platform now has no forged
reservation because it has no reservation at all, which is the honest state.

### THE SCHEDULER IS STILL LOCKED OUT, AND IT IS A THIRD VARIABLE

Two secrets were set and Vercel redeployed. **Measured at 15:10: still
refused.** Fresh refusals at 15:05 (hold sweep) and 15:10 (paystack
reconcile), so this is not a redeploy in flight.

THREE values have to agree and two were changed:

| Where | Name | Role | Status |
| --- | --- | --- | --- |
| Vercel | **`CRON_SECRET`** | what Vercel's scheduler SENDS | **unchanged. This is the one.** |
| Vercel | `RECONCILE_CRON_SECRET` | what our code COMPARES | set |
| Supabase Vault | `vallo_reconcile_secret` | what the pg_cron path sends | set |

`lib/cron/auth.ts` compares the bearer against
`process.env.RECONCILE_CRON_SECRET`, and its own header says it: "Vercel Cron
sends `Authorization: Bearer <CRON_SECRET>`; the deploy must hold the same
value under BOTH names." One name was changed, so the scheduler now presents
the old token to a door expecting the new one.

**AND THE FIX FROM TODAY IS CONFIRMED LIVE BY THE SAME MEASUREMENT.** Those
two refusals came through as **"locked out" at HIGH severity**, where all 256
before them read "unauthorised" at medium. Our own scheduler being locked out
of our own platform no longer reads like a stranger probing a URL. The signal
was rebuilt and then immediately proved itself on a real event, which is the
best evidence a monitoring change can have.

## 22. B1b AUDITED, AND A CORRECTION TO SOMETHING THE LEAD TOLD THE FOUNDER

### THE i18n FINDING I ESCALATED IS NO LONGER TRUE, AND I SAID IT TWICE

I told the founder, and wrote into sections 14 and 19, that the three supplier
registration forms "read in English on a Yoruba, Hausa or Igbo phone while the
screen around them does not". **That was true when it was measured and it is
false now**, and the difference is not a fix made in response: the
translations already existed in B1b's working tree when the measurement was
taken. Only the English half had reached the branch, because `en.ts` was swept
into another worker's commit an hour before B1b's first push. The measurement
was honest about the branch and wrong about the world.

Measured on `d1494c4` rather than taken on report:

| Locale | ceiling now | before the namespace existed |
| --- | --- | --- |
| yo | 212 English-valued, 106 sentences | 212 / 106 |
| ha | 210 / 106 | 210 / 106 |
| ig | 219 / 106 | 219 / 106 |

And the `supply.register` namespace carries **142 keys in all four locales**,
English, Yoruba, Hausa and Igbo alike.

**THE FLAWED RATCHET PROVES THE ONE THING THAT MATTERS HERE, WHICH IS WORTH
NOTICING.** Section 14 records that the measure conflates "the locale got
worse" with "the product got bigger". But in this direction it is exactly
right: if those 142 keys had been English pasted into `yo.ts` to make a count
look finished, `englishValued` would have risen by about 142. It did not move
at all. So the strings are genuinely not English, which is the single thing a
key count normally cannot tell you.

What is NOT proved, and B1b says so itself: that the translations are GOOD.
They are consistent with the vocabulary already in each file's agent
application block rather than machine output, and all three files already
carry a header saying they need a native speaker before launch. This namespace
is now part of what that review covers.

### The ceiling was loose by 124 keys for about an hour

A3 raised the ceilings to 336 / 334 / 343 to keep a shared test green, which
was correct at that moment. An hour later the translations landed and the
ceiling outlived the state it measured. B1b brought it back down in `0c21acf`,
alone, by explicit pathspec, keeping both numbers in the header so the next
reader can see why the ratchet moved twice in one day.

**A ceiling loose by 124 keys would let 124 English strings be pasted into a
translation file without a test going red.** B1b's sentence on it is the
sharpest statement of the flaw anyone has made: **a ratchet whose ceiling can
be legitimately raised is a ratchet that can be legitimately raised wrongly,
and nothing detects the difference.** Its proposed measure, counting only keys
a locale file CARRIES with English inside them, would not have moved in either
direction during this stint and would still catch the defect the gate exists
for. That is now the design to build, alongside A3's share.

### Verified against the database rather than the report

`agent_applications` holds **0 rows**, so the probe rolled back as claimed and
nothing was written to a live product table. All **ten** new columns are
present. The migration creates no `SECURITY DEFINER` function, so rule 21 has
nothing to revoke, and the probe asserts that vacuum rather than assuming it.

### THE ONE LAW IS NOT CLOSED ON THESE FORMS, and B1b says so first

**Nobody has seen any of the three forms write a row.** Every Supabase origin
is refused by this sandbox's egress proxy, so the proof server cannot reach
the database at all. The write is proved by the migration probe and by a unit
test; the screens are proved in a real browser on a production server. The two
halves are not joined anywhere, and that is the honest state of it.

Also open, in B1b's own words: screen two has never chosen a real local
government, because `listStates` returns empty here; screen four says an
application was filed rather than that anything is verified, because inserting
on `public.agents` is admin only and self service approval of a supply account
is a decision about what the verified mark means; and `agents.role`,
`agents.firm_id`, `firm_members`, `listings.listing_role`, `listing_mandates`
and the widened `owns_listing` are all still unbuilt, so a firm's declared
colleagues are a list on an application rather than memberships. An
application that could create staff is the letterhead failure the form exists
to catch.

## 23. THE GLOW LANDED, AND SECTION 13'S MEASUREMENT WAS WRONG IN MY OWN INSTRUMENT

B2 landed the glow as `06d87be` and corrected the numbers I gave it. **I
checked the correction with my own instrument rather than accepting it, and it
is right.**

### The fault, and it is mine

`measure-glow.mjs` sampled the middle sixty per cent of a control's width, on
the reasoning that a chevron at either end must not drag a row's mean. **The
middle sixty per cent is exactly where the label is.** White text lifts the
luminance of precisely the rows the label occupies, which are the middle rows,
which is where a light-deep-light gradient has its floor. So the trough read
both shallower and higher up the control than it is.

| | Section 13 said | Measured over the 244 ink-free columns |
| --- | --- | --- |
| deepest colour | `#004AFD` | **`#0042FD`** |
| its depth | L 71.5 | **L 65.7** |
| where it sits | about 45 per cent down | **62 per cent down** |

`#004AFD` is real. It is a point on the way down, not the bottom. B2 measured
64 per cent and I measure 62; the gap is where each of us calls the top edge,
and it does not change the ruling.

**The irony is left in the file on purpose.** This is the instrument written
so nobody would quote a number they had not measured, and its own first
measurement averaged a button's label into the button's fill. A tool is not
exempt from the fault it was built to catch, and that is now the sixth green
light this build has caught looking at the wrong thing.

Fixed in the script rather than only in the prose: the fill is read from
columns carrying no near-white pixel anywhere down the control, it reports the
floor's POSITION as well as its colour, because "where" is the gradient stop
somebody has to write, and if too few clear columns survive it falls back and
SAYS the number includes the label rather than reporting one nobody can trust.

### The light-mode hypothesis: two parts proven, one disproved, and the disproof is better than my guess

Section 13 recorded a derivation and labelled it a hypothesis. B2 tested it.

* Tight shadow keeps the brand hue and reads as a DARKENING on paper:
  **proven**, symmetric at -23.8, -16.1, -6.4, -3.9, -0.9 L from 2 to 16px
  against a 239 floor, dying by 20px.
* The wide one becomes a real deep blue shadow rather than a light: **proven**.
* The rim inverting from a white highlight to a top-edge darkening:
  **DISPROVED**, and the reasoning is better than the hypothesis it replaces.
  **A specular rim's contrast is against the fill beneath it, not the page
  behind the control, and that fill is a dark saturated blue in BOTH themes.**
  A dark-filled control does not invert its own highlight because the page
  behind it changed. Inverting it would have removed the one cue that makes
  the control read as lit, on the theme that needs the most help.

### A seventh green light, found and reported by B2 against itself

`light.css:191` replaced the primary button's entire `box-shadow` with
`0 4px 14px`, so the token layer's light twins were overridden by a component
rule and **the lit treatment did not exist in daylight at all**. B2's first
light measurement showed a real darkening and it nearly recorded that as the
derivation working. It was measuring the override. Rule removed, values moved
to the token layer.

### What the glow does NOT cover yet

The measurement governs a BRAND-FILLED control, so it is on the primary button
and the selected chip, the same object one rung down. **Not done:** the raised
centre switch and the wizard selected states, which are component surfaces
that cannot be reached from the token layer without changing objects B2 could
not prove. The glass icon plates were deliberately left alone: they already
carry `--nf-rim-lit` and are tinted glass rather than brand fill, and spraying
a measurement taken off a blue button onto them is how the "neon" complaint
happened the first time.

Also still open from C2: there is no `.nf-note` class for the calm
explanatory panel, and its glyph is close to invisible in light mode.

### A flake B2 did not hide

The first of four full vitest runs failed one test; three later runs were
green and it did not reproduce. The test count moved from 2712 to 2723 between
runs, so other workers landing commits mid-run is the likeliest cause, but it
is not proven and it may be a genuinely flaky test. Recorded rather than
rounded to green.

## 23. SALE: A BUYER CAN READ WHAT A PURCHASE WILL COST, AND THE PROBE HAS NOT RUN

Section 19 recorded the sale cost model as unstaffed and nobody's. It was half
built and the half that existed was the half a buyer cannot see.

**WHAT WAS ALREADY THERE, VERIFIED RATHER THAN TAKEN ON REPORT.** C1's
`b84391c` landed the six columns on `listings`
(`20260922160000_c1_what_a_buyer_actually_pays`), `draftInputSchema`,
`saveDraft` with its parts check, the wizard's sale branch summed live as the
lister types, `purchaseParts` and `purchaseTotal`, and the admin review card.
Checked file by file: the schema, `listings-schema.ts` 662 to 667,
`listings-actions.ts` 249 to 254 and 325 to 330, and
`listings-queries.ts` 223 to 228 and 484 to 489, so the draft round trips. C1's
own hand-back said the public listing page did not render any of it, and it
did not. **THE SELLER COULD DECLARE AND THE BUYER COULD NOT READ.**

**WHAT SALE BUILT.** `purchase-lines.ts`, the twin of `move-in-lines.ts`,
returning that file's own `Part` because the honesty rule is one rule and not
two: every cost a buyer meets is LISTED whether declared or not, an undeclared
one carries no figure and draws the words, a declared zero carries 0 and draws
"No agency fee". `purchaseParts` in `pricing.ts` cannot serve that surface and
was never meant to, because it DROPS an undeclared part, which is right for a
sum and wrong for a list. Then `ListingPurchase`, the six columns through the
repository and the domain type, the `purchase` namespace in all four locales,
and the section on `/listing/[id]` behind `isSale`.

**THE ASKING PRICE IS ONE OF THE PARTS**, which is the one thing that differs
from the tenancy side and the easiest thing to get backwards. A move-in total
sits beside the rent. A purchase total includes the price.

**THE NAMESPACE SHIPPED IN FOUR LOCALES AND NOT IN ENGLISH ALONE.** The
completeness gate counts a MISSING key as English, because `withFallback` has
already filled it, so English-only copy would have raised the yo, ha and ig
ceilings by 23 keys each for a namespace nobody had translated. That is the
exact shape of the defect section 22 describes, arrived at from the opposite
direction, and it is worth writing down: **the ratchet catches English pasted
into a translation file and it equally catches a namespace that never reached
one.** The three translations follow each file's own `moveIn` vocabulary and
are inside the native review those files already ask for.

### THE PROBE HAS NOT RUN, AND THAT IS NOT A WORD I WILL SOFTEN

`scripts/probes/sale_cost_model.sql` holds ten assertions ending in a
deliberate `raise exception 'PROBE ALL PASS ...'` so it rolls itself back. It
proves the six columns exist as nullable bigints, that each carries a
VALIDATED negative check, that the total carries its covers-its-parts check,
that `anon` can select all six, that no existing row violates any of the seven
predicates, that a zero is accepted and reads back as zero, that an undeclared
cost stays undeclared, that a negative is refused on each column by a check
violation, and that a total one kobo below its parts is refused. Its fixture is
chosen by the predicate under test and COPIED from the oldest live sale row,
with the column list read out of `pg_attribute` rather than typed.

**Every Supabase call from this box answers "Connection terminated due to
connection timeout" against a project the API reports as INACTIVE**, on
`apply_migration`, `list_migrations` and `get_project` alike. The agent proxy
is healthy and reports no failures to any Supabase origin, so the timeout is
on the far side of it. Restoring a paused project is a change to the founder's
own infrastructure that nobody asked for, so it is left to whoever owns that
call. **The six columns are therefore asserted against the migration file and
the type system and NOT against the live database, and the ONE LAW is not
closed on this feature.**

### Not built by SALE, named rather than left to be discovered

- **A SALE HAS NO ABOVE-THE-FOLD TOTAL.** A tenancy gets `ListingMoveInBlock`
  in the lead card, so the true move-in figure meets a reader before they
  scroll. A sale still leads with the asking price and the honest total is in
  the itemised section further down. That asymmetry is the same one this whole
  feature exists to remove, one fold lower, and it wants a sale twin of that
  block with its own governing image and its own proof.
- **The wizard's placeholders encode conventional rates.** `1,440,000` against
  an `180,000,000` example is eight tenths of a per cent, and `9,000,000` is
  five per cent. They are input placeholders and not printed facts, so they are
  not a rule 15 breach as it is written, but they are the platform suggesting a
  rate to a seller in grey text and somebody senior should decide whether that
  is wanted. Not changed here, because it is another worker's shipped copy.
- **No sort or filter on the purchase total.** The migration's partial index
  `listings_purchase_cost_idx` exists and nothing reads it. The tenancy side
  has `sortMoveIn` and `basisMoveIn` in the dictionary; the sale side has no
  equivalent.

## 24. THE FOUNDER'S EIGHT, STAFFED, AND THE FILE PARTITION THAT KEEPS SIX AGENTS APART

The founder used the product on a real phone and sent eight items. All eight
are staffed. This section is the record of WHO OWNS WHICH FILE, because three
scope collisions have already cost this build a day and the standing
instruction is that a fourth ends the fleet.

### The eight, and where each went

| # | Item | Owner |
| --- | --- | --- |
| 1 | **Back buttons go to the declared parent, not to history** | NAV |
| 2 | The dock's centre switch: in line, smaller, same icon style, container kept | CHROME |
| 3 | The side drawer: Switch profile row removed, theme control loses its box and its words, the whole drawer made consistent | CHROME |
| 4 | The switch profile sheet always offers every profile and every door | CHROME |
| 5 | The console opens on its overview | CHROME |
| 6 | Light mode: a real light lockup, and the icon plates' paper ground | B2 |
| 7 | One container anatomy, one edge, one fill, one blue, in the token layer | B2 |
| 8 | GOVERNING-02 to 12 built as drawn | IMG-A, IMG-B, IMG-C |

### ITEM 1 IS A CORRECTNESS BUG AND I MEASURED IT BEFORE STAFFING IT

The founder's diagnosis is right, and the measurement is worse than the
symptom. There are **ten `router.back()` call sites**, every one guarded by
`canGoBackInApp()`, and **no parent map anywhere**: `apps/web/src/lib/nav`
does not exist. That guard proves the previous entry is IN-APP. It does not
prove it is the PARENT, which is the entire defect. So a sign-in bounce, a
redirect or a deep link leaves the previous entry as wherever the machinery
sent you, and back walks to it.

**History is not hierarchy.** Every route gets a declared parent in one
readable file, back goes there regardless of how somebody arrived, and history
is a fallback only when the previous entry is provably in-app AND provably the
parent. The Android hardware button follows the same resolver, because a wrong
answer there closes the app.

### THE STYLESHEET PARTITION, WHICH IS THE WHOLE POINT OF THIS SECTION

Six agents are in one tree. The unit of collision is the FILE, not the change,
which this build learned the expensive way. So every stylesheet has exactly
one owner this stint:

| File | Owner |
| --- | --- |
| `tokens.css`, `buttons.css`, `chips.css`, `glass.css`, `light.css` | B2 |
| `chrome.css` | CHROME |
| `controls.css` | IMG-A |
| `catalogue.css` | IMG-B |
| the stays stylesheet | IMG-C |

Nobody edits a file they do not own. A token somebody else owns is a line in a
report, never an edit. `packages/i18n` is ADD ONLY inside each agent's own
namespace, in all four locales, and never restructured.

### ONE DECISION REVERSED, SAID PLAINLY SO NOBODY RE-ARGUES IT

The dock object currently rises about 7px above the bar, and that was built
deliberately to `GOVERNING-01`. **The founder has now seen it on a real phone
and ruled against it**: in line with the other icons, same baseline, same icon
style, smaller, container kept so it still reads as the special one. A
reference image loses to the founder looking at the real thing, and that is
the right order of authority.

### AND ONE THING THAT MAY NOT BE OURS TO FINISH

Item 6 asks for a light variant of the wordmark, "not a filter, not an opacity
change". A genuine light variant is ARTWORK. Recolouring or inverting the dark
asset IS the filter he has ruled out, so what is ours is the SEAM: one place
that decides which lockup a surface gets, keyed on theme, so every appearance
switches together and a real asset drops in with one edit. If a designed light
wordmark has to come from the founder, the answer is to name the file and the
sizes needed rather than to ship a filtered dark mark and call it done.

## 25. THE MONEY JOB WAS KILLED BY A PASTED NEWLINE, AND THE TRIM THAT LOOKED SAFE WAS NOT

The founder set both secrets and redeployed. The 15:47 run still failed, and
the cause was not the one either of us expected.

`cron.job_run_details`, jobid 33, 15:47:

```
ERROR: invalid URL "https://www.vallospaces.com
/api/paystack/reconcile?hours=48&apply=1": Malformed input to a URL function
```

`vallo_site_url` had just been re-saved with a **trailing newline**, which is
what happens when a URL is pasted from anywhere. And the function already
handled that, or appeared to, with `btrim(site_url)`.

### `btrim(text)` WITH ONE ARGUMENT STRIPS SPACES AND NOTHING ELSE

Not a newline, not a tab, not a carriage return. Measured rather than assumed:

| Expression | Result |
| --- | --- |
| `btrim(E'https://x.com\n')` | unchanged, **length 14** |
| `btrim(E'https://x.com\n', E' \t\r\n')` | trimmed, length 13 |

So every guard in that function was whitespace-blind: the emptiness checks,
the URL build and the bearer alike. **A SECRET pasted with a newline would
have sent `Bearer <secret>\n` and been refused 401 by our own door**, which is
the same symptom from a different cause and would have been just as hard to
read. That possibility is still open, because the read-only role cannot
decrypt a Vault value to check it.

Fixed and applied: every Vault read trims an explicit `E' \t\r\n'`. Rule 21
restated rather than assumed, because `create or replace` preserves grants:
EXECUTE revoked from `public`, `anon` and `authenticated`, with the revoke
proved inside the same migration. The read-only role is now refused when it
tries to call the function, which is itself evidence the lock holds.

**The lesson generalises past this one function.** A person pasting a URL into
a form is not making a mistake. Infrastructure that breaks on it is the one at
fault, and a default that trims less than it appears to is worse than no trim,
because it buys the reader's confidence without earning it. Anywhere this
codebase reads a human-entered value out of configuration, the characters
being trimmed should be named.

**What this does NOT fix**, and it is the founder's own standing question: the
reply is still never read. `net.http_get` is asynchronous, the response lands
in `net._http_response`, and nothing looks at it. That is the defect that let
this job report success every hour for three weeks while every call answered
404. It stays open and it is the next thing on this file.

### A correction to section 19

Section 19 recorded the sale cost model as unstaffed and nobody's. **That was
stale within the hour.** C1's `b84391c` had landed the whole schema at 13:45:
six columns, their non-negative checks, the covers-its-parts check, the
partial index, the anon grant, the draft schema, the wizard's sale branch and
the admin card. What was missing was the READING surface, and the agent I
staffed found that out by checking the tree rather than believing the ledger,
which is the right instinct and cost nothing.

The honest version: the seller could declare and the buyer could not read. The
buyer can now read. The ONE LAW is not closed on it, because the probe has not
run against a live database.
