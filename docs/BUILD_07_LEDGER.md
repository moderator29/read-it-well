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
| The dock with the centre switch **in line** | `GOVERNING-01` screen one | `b1/dock-390-{dark,light}.png`, **RETAKEN 22 Sep at `99690eb`** by `scripts/design/proof-dock.mjs` on `next start`, on `/search` because `/home` is behind the gate | **the switch sits 0px above its siblings**, measured against the median top of the other four rather than against the bar; all five slots 65.59px wide; bar 70px; overflowX 0; five slots, Home, Search, the switch, Feed, Sign up. **SUPERSEDES the row that measured a 7px rise**: the founder reversed that and `--nf-dock-lift` is now `0rem` | lead |
| The Switch profile sheet | `GOVERNING-01` screen two | `b1/sheet-390-dark.png`, RETAKEN by A2b at `6c621e3` | row mark 14 on 44 = 0.318, measured. THE STANDING LABEL IS NOT IN THIS PROOF: it only draws on a workspace row, a visitor with no session has none, so B1's 6 on 25 = 0.244 is UNVERIFIED and needs a session | B1, proof by A2b |
| The side drawer, with **no** Switch profile row | `GOVERNING-01` screen three, **departed from on the founder's ruling** | `b1/drawer-390-dark.png`, **RETAKEN 22 Sep at `99690eb`** by the same script | **asserted, not eyeballed: the drawer's text matches neither `/switch profile/` nor `/switch role/`, and neither `/light mode/` nor `/dark mode/`.** The row was REMOVED rather than moved, and the theme control lost its container and its words, both on the founder's instruction. The shot shows Home, Search, Feed, the flip-coin card, a bare theme glyph, and the company row. **SUPERSEDES the row that proved a Switch profile row**: that surface no longer ships | lead |
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

### THE ICON PLATES ON PAPER (item 6b): THE TOKEN IS NOT THE CAUSE

The founder: "The plates behind our icons are dull navy on white... It looks
dirty. The icon ground token is the cause and it needs a real paper value, not
the dark one carried over."

**The symptom is real and the diagnosis is not, and this is measured rather
than argued.** Sampled off a real light-theme plate on `/preview/f1/home`,
62x62, 1,516 object pixels against the plate they sit on. The test is the share
of artwork pixels falling under 1.5:1, which is the point a mark stops being
visible at all:

| Plate luminance | Artwork lost | Median contrast |
| --- | --- | --- |
| **navy, as shipped, L 0.029** | **12.0%** | **3.48:1** |
| L 0.35 | 33.8% | 1.94:1 |
| L 0.60 | 23.9% | 2.37:1 |
| L 0.80 | 18.9% | 3.10:1 |
| L 0.90 | 15.7% | 3.46:1 |
| L 0.95 | 14.3% | 3.65:1 |
| L 1.00, pure white | 13.4% | 3.83:1 |

**EVERY LIGHTER PLATE IS WORSE AND THE MIDDLE IS WORST OF ALL.** The curve is
U-shaped because this artwork holds both bright highlights and dark strokes: a
mid-grey plate hides both ends at once and loses nearly three times as much as
the navy. Even pure white, the best light value available, loses more artwork
than the navy does.

So there is NO paper value for this token that improves the plates, and
changing it is a day spent making the product worse. The plate is dark because
the ARTWORK is drawn for a dark ground, and the founder is seeing the 121
objects that have no light twin. `data-twinned` now says which those are, at
the call site and in the browser: all six on the home grid read
`data-twinned="false"`.

**What would actually fix it is the artwork**, which is a render order and the
founder's to place. Until it exists the framed lit plate is the best available
treatment, and it is already shipped. If the founder wants the navy changed
anyway, the honest trade is: a cleaner, more saturated navy at a similar
luminance costs nothing, and anything lighter costs legibility. That is a
question about how the square LOOKS, not about whether the mark in it reads.

### THE SECOND LADDER, COLLAPSED (item 7, third pass)

The anatomy collapsed `--nf-border-brand`. This collapses the other family:
`--nf-brand-edge`, `-soft` and `-strong`, on 341 references across the
stylesheets, all of which mixed from `--nf-glow-ink` while the anatomy mixed
from `--nf-electric-500`.

**ONE INK.** `--nf-container-ink` is declared beside the anatomy in both theme
blocks, and every container edge in the product now mixes from it and nothing
else. There is no second parent left to move, which is what made the first
drift undetectable by grep.

**THE THREE STRENGTHS ARE KEPT, and that is a deliberate reading of the
complaint.** Forcing 341 references to one alpha would flatten a real
distinction: a well's hairline and the dock's outline are not the same edge.
Soft, base and strong of ONE ink is one blue at three strengths, which is a
ladder; two inks at overlapping strengths is two blues, which is drift. The
founder's fault was the second thing.

**MEASURED, composited over the real canvas, by rendering the shipped
`tokens.css` in a browser with nothing else loaded:**

| Rung | dark, vs canvas | light, vs canvas |
| --- | --- | --- |
| `-soft` | 1.35:1 | 1.56:1 |
| base (= `--nf-container-edge`) | **2.24:1** | **2.87:1** |
| `-strong` | 2.81:1 | 3.71:1 |

Monotonic in both themes, and `--nf-brand-edge` now resolves to a value
byte-identical to `--nf-container-edge`. The base edge moves 1.87 to 2.24 in
dark and 2.75 to 2.87 on paper; the paper move is negligible in contrast and
visible in HUE, from a washed rgb(103,143,200) to a clean rgb(73,138,231),
which is the "different blues" complaint answered at the pixel.

**WHAT THE SWEEP DID AND DID NOT COVER, said plainly.** The full 103-route
harness sweep could NOT be completed: `next start` in the isolated worktree
died mid-run twice, at 158 and then 149 unopened routes, and a reading off a
dead server is not a reading. A bounded sweep of eight representative routes
ran clean: 748 text-bearing leaves, three below the floor in light and none in
dark. **None of the three is caused by this change**, and the reason is
structural rather than a judgement: all three are ink-on-FILL pairs and this
change moves only BORDER colours, which cannot produce them.

Two of the three are worth someone's time and neither is mine:
`.nf-movein__label` on `/preview/f3/listing` is **white on white at 1.03:1**,
and the settings `Verified` badge is 4.04:1.

**So the visual sweep across the whole harness is still owed on this change.**
The ladder is proven monotonic, single-inked and building; what is not proven
is every surface at both widths, and the blocker is server stability in the
worktree rather than anything about the change.

### THE 121 UNTWINNED OBJECTS: ARTWORK, NOT ENGINEERING

Said early, as asked. **23 of 144 objects ship a light twin and 121 do not, and
no amount of code closes that.** In daylight the two groups are different
MATERIALS: a twinned mark is a pale object standing on nothing, an untwinned
one is dark artwork on a navy plate. By this track's own measurement it is the
real light-mode fault, not the plate token.

**THE ASSET LAYER IS ALREADY CLEAN, which is worth knowing before anybody goes
looking for a bug.** Checked in both directions: 144 names in `BRAND_ICONS`,
144 dark files on disk, zero named-without-a-file, zero file-without-a-name. 23
names in `LIGHT_TWINS`, 23 files in `glass/light/`. There is no drift to fix
and no quick win hiding in the directory.

**THE ONE THING THAT LOOKED LIKE A QUICK WIN WAS A TRAP.** `glass/light/`
holds 24 files, not 23. The extra is `escrow-hold`, which has a light twin and
NO dark original and appears in neither list. Read off the directory it looks
exactly like a render somebody forgot to wire up, and wiring it up is a
one-line edit. It is deliberately withheld: `docs/BRAND_MARKS.md` says build it
and do not ship it until escrow exists, and `lib/legal/terms.tsx` states that
Vallo does not hold your money, so an escrow mark on a screen would be the
artwork contradicting the contract. **I was one edit from "fixing" it** and the
comment in `BrandIcon.tsx` is what stopped me. A comment only stops the person
who reads it.

**WHAT WAS DONE MECHANICALLY**, since the artwork cannot be:
`brand-icon-assets.test.ts`, six specs binding the two lists to the directory in
both directions, with `escrow-hold` named in a `WITHHELD` set beside its reason.
The one that matters most: **a name in `LIGHT_TWINS` with no light file is worse
than a broken image**, because the component then sets `data-twinned="true"` and
SUPPRESSES the plate, so a real person in daylight gets a missing image on a
white page with nothing behind it. That is the failure mode the 121 renders will
arrive through, one at a time, and it now cannot land silently.

**The test was proved to fail before it was trusted.** Claiming a twin for
`beach-house`, which has no light file, fails the right spec with the right
message; restored, six pass. This build has already had a test that passed for
weeks while measuring nothing.

**THE RENDER ORDER, specified so it can be commissioned.** 121 PNGs into
`apps/web/public/brand/glass/light/`, each named EXACTLY as its dark
counterpart, **256x256**, which is what all 144 dark objects and all 24 existing
light files are. The dark set totals 3.1MB at a 22KB mean, so the light set
should land near 2.6MB. The 23 already delivered are the model: they are the
transaction and outcome set, the marks that appear inline on a receipt, which is
the one surface where a navy chip reads as a hole in the paper.

**And it is a designed twin, not a filter**, the same ruling as the wordmark: a
3D glass object lit for a dark ground does not become a paper object by
inverting it. Anything produced by filtering the dark asset should be rejected
at review, which is why none was produced here.

### THE CONTAINER ANATOMY, BUILT (item 7, second pass)

**The fault, located.** Two independent blue sources feed container edges:

    --nf-brand-edge*   <- --nf-glow-ink   <- --nf-electric-300  #0069FE
    --nf-border-brand  <- --nf-electric-500                     #005DE0

Same hue to a tenth of a degree, 215.2 against 215.1, same saturation. Six
points apart in lightness, and wired to different parents, so the day either
source moves the two drift and no grep finds it. **That is how a platform ends
up with edges that almost match**, and it is what the founder is seeing.

**THREE RUNGS, NAMED FOR WHAT A CONTAINER IS RATHER THAN HOW LOUD IT IS**,
because soft/default/strong is the naming that invites a fourth:

| Token | What it is for |
| --- | --- |
| `--nf-container-edge-quiet` | a division of space: a well, an inset, a row. Not an object, so no brand |
| `--nf-container-edge` | AN OBJECT ON THE CANVAS: card, panel, tile, sheet. The default |
| `--nf-container-edge-lit` | the two objects a screen is built around, the dock and the flip pane |

Plus `--nf-container-fill` and `--nf-container-radius`.

**WHY FEWER RUNGS RATHER THAN A SWEEP**, which is the choice the lead asked me
to name. Repointing 430 rules at the same six tokens is 37 files of churn in
scopes other people own, and it leaves the ladder that caused the drift
standing: six tokens for one job, each a defensible pick, so the next 430 rules
diverge exactly as these did. Collapsing at the SOURCE lands everywhere at once,
which is what the founder asked for, and it removes the choice rather than
asking everyone to keep making it correctly.

**THE COLLAPSE, VERIFIED IN ISOLATION.** `--nf-border-brand` now names the
anatomy. Measured by rendering the real `tokens.css` in a browser with nothing
else loaded, so the reading is of this change and of nothing else:

| Token | dark | light |
| --- | --- | --- |
| `--nf-container-edge` | `oklab(0.51934 … / 0.7)` | `oklab(0.51934 … / 0.7)` |
| `--nf-border-brand` | **identical** | **identical** |

Its dark value moves 55 per cent to 70, which is the one rendered change and is
deliberate: 55 was the value the daylight block had FORGOTTEN, measured this
morning at 2.49:1 on white where the four neutrals beside it all invert. The
paper twin was already corrected to 70. Matching night to paper keeps the edge
that was proven and drops the one that was an oversight.

**STILL OWED, AND IT IS THE LARGER HALF.** `--nf-brand-edge` and its soft and
strong rungs are still a second ladder on 83 container rules, resolving to
`oklab(0.568 …)` at night and `oklab(0.436 …)` on paper against the anatomy's
theme-stable `0.519`. Collapsing them is the next step. It is a visible change
on 83 rules in both themes, so it needs a full visual sweep to be done
responsibly, and I would rather leave it named than half-land it.

### THE LOGO SEAM (item 6a): EVERY APPEARANCE, AND WHICH CAN EVEN SWITCH

**No light wordmark is shipped and none is invented here.** Recolouring or
inverting the dark asset is exactly the filter the founder ruled out, so what
follows is the enumeration and the seam, not artwork.

| Where | Asset | Can it take a themed asset? |
| --- | --- | --- |
| `design-system/brand/Logo.tsx` | mark, lockup, wordmark | **YES, and it is the seam**: every in-app appearance already routes through it |
| `(auth)/layout.tsx` | icon + wordmark | **NO, AND IT MUST NOT.** Rule 22 locks that screen dark in both themes, so the dark mark is correct there permanently |
| `app/loading.tsx`, the splash | mark | yes, same seam |
| `offline/SystemMoment.tsx`, native shell | icon + wordmark | yes for the web card; the native shell's own HTML needs the same switch written separately |
| `AssistantChat.tsx`, `FirstRun.tsx` | wordmark | yes, but each hard-codes the path today rather than using `Logo.tsx` |
| `lib/email/theme.ts` | `MARK_PATH`, `WORDMARK_PATH` | **NO, AND IT DOES NOT NEED TO** |
| `manifest.ts` / store assets | `vallo-icon.png` | no: a store listing has no theme, it needs whatever the store's own ground is |

**WHAT AN EMAIL MUST DO INSTEAD, since the lead asked.** Nothing. This
product's emails are DARK-GROUND BY DESIGN and the ground is painted three
times over, on the body, on the outer table as an Outlook `bgcolor`, and on the
card cell, precisely because clients cannot be trusted. The dark wordmark is
therefore correct in email permanently, and it is correct for a reason better
than "we cannot switch": the email carries its own ground with it, so the
client's theme is not the question. `theme.ts` already records that Gmail
strips `prefers-color-scheme` entirely and runs its own pass, so a themed email
asset would reach Apple Mail and never reach the client most of this product's
readers use.

**WHAT THE FOUNDER MUST SUPPLY**, named exactly so it can be commissioned:

- `vallo-wordmark-light.png`, the word for a light ground. Current dark asset is
  758x167, so the light twin at the same 4.54:1 aspect, at 2x, is 1516x334.
- `vallo-mark-light.png`, the mark. Current is 614x587, so 1228x1174 at 2x.
- `vallo-logo-light.png`, the square lockup, currently 1024x1024.

A designed light variant, not a recolour: the dark artwork is a 3D glass
rendering lit for a dark ground, and there is no filter that turns a lit glass
object into an ink drawing. Until those three files exist the seam has nothing
to switch TO, which is why this entry ships the enumeration and not a change.

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
| `chrome.css`, **`side-nav.css`**, **`admin.css`** | CHROME |
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

## 26. HISTORY IS NOT HIERARCHY: EVERY ROUTE NOW DECLARES ITS PARENT

The founder: "I can be inside the Console, press back, and land on the login
page. I can be inside a feature, press back, and land on the landing page, or
on a screen I have never opened."

**He named the cause himself and he was right.** Ten back call sites, every one
of them `if (canGoBackInApp()) router.back(); else router.push(fallback);`.
`canGoBackInApp()` is not broken and this is not a second bug in
`lib/ui/history.ts`. It answers "is there a screen of OURS behind this one",
truthfully, and every control on the platform was reading that answer as "is
the screen behind this one its PARENT". Those are different claims, and after a
redirect, a sign-in bounce or a deep link they come apart. Reach `/admin`
through a sign-in bounce and `/sign-in` is the previous entry; it is genuinely
in-app, so back went there. That is the founder's first sentence, exactly.

`canGoBackInApp()` cannot be taught the second claim either, and that is worth
recording rather than treating as an oversight. It has three answers. Two of
them, the `nfSeq` stamp and a same-origin referrer, carry no URL at all; the
third, `navigation.canGoBack`, is a boolean. None of them can be asked which
screen is behind you. It was left untouched.

### What landed

**`apps/web/src/lib/nav/route-parents.ts` is the map, and it holds no logic.**
One entry per route, pattern to parent pattern, roughly 140 of them covering
the website, the door, both app sides, messages, money, social, account, the
admin console, the agent console, the host console and the design harnesses.
Dynamic segments carry: `/u/[handle]/followers` declares `/u/[handle]`, so
`/u/ada/followers` resolves to `/u/ada`. The founder's own two examples are in
it: `/listing/[id]` declares `/search`, the shelf, not `/home`; `/messages/[id]`
declares `/messages`, the inbox.

**Three roots, and they are the only three: `/`, `/home`, `/stays`.** Two app
roots rather than one because the product has two sides and `nav-model.ts`
makes each the first destination of its own tab bar.

**A route with no entry is LOUD.** `parentOf` returns `no-parent-declared`, the
control takes its caller's fallback, and a development build prints a warning
naming the path. It is deliberately not "strip the last segment": that guess is
right often enough to hide the times it is wrong, which is the whole mechanism
by which this defect survived.

**`resolve.ts` is pure.** No DOM, no router, no browser global. The entire
decision is `chooseBack({ path, fallback, previousPath, previousIsInApp,
surface })`, which is what makes every rule below provable in a Node process.

**History is an optimisation on top of the answer, never a different answer.**
`chooseBack` goes back through history only when BOTH hold: the previous entry
is provably in-app, and its path provably equals the declared parent. That
second proof needs a URL, and only the Navigation API can supply one, so
`previous-entry.ts` reads `navigation.entries()[index - 1].url` and returns
`null` everywhere else. Safari and Firefox therefore always push the parent.
That is the correct trade and not a gap: a push costs a restored scroll
position, and a wrong `router.back()` costs the person the screen they were on.
Where the proof does hold, a filtered search opened into a listing still comes
back with its filters and its scroll intact.

### Every back control, and what it does now

| Control | Before | Now |
| --- | --- | --- |
| `components/app/PageHeader.tsx` | `router.back()` when in-app | declared parent, via `useBack` |
| `components/site/BackButton.tsx` (admin, agent, host shells) | same | same |
| `components/social/profile/BackChevron.tsx` | same | same |
| `components/app/listing/ListingGallery.tsx` | same | same |
| `components/app/assistant/AssistantChat.tsx` | same | same |
| `app/(app)/messages/[id]/ThreadView.tsx` | same | same |
| `components/app/NativeRuntime.tsx` (Android hardware) | `router.back()` when in-app | `chooseBack` with `surface: "android"` |
| `lib/native/back-button.ts` (Android hardware) | exit when NOT in-app | exit only at a declared ROOT |

No component calls `router.back()` any more. The two remaining call sites in
the tree are `lib/nav/use-back.ts` and `NativeRuntime.tsx`, and both run the
resolver first. The `fallback` prop stays on every component and every one of
its roughly fifty call sites is untouched; it is now reached only for an
undeclared route or a root, which is why nothing outside this section's file
list had to change.

**Android was the worst of it and it is the half a test cannot finish.** The
old handler exited the application when `canGoBackInApp()` said no, so somebody
who opened a message from a push notification and pressed back had the shell
vanish rather than land in their inbox. `isAppRoot()` is a fact about the
screen rather than about how the person arrived, an undeclared route answers
false, and so the failure direction is now a harmless navigation instead of the
app closing.

### What was proved, and how

`src/lib/nav/resolve.test.ts`, 25 tests. The sweep walks EVERY entry in the map,
builds a concrete path for it, and insists the parent it names resolves to a
route that is itself in the map; a second sweep climbs every route to a root, so
no back control can loop. Then the three arrivals the founder described: a
sign-in bounce, a redirect, and a cold deep link.

**The defect was proved caught by breaking the resolver twice.** Removing the
parent-equality check from `chooseBack`, which restores the exact old
behaviour, turns three tests red, including the sign-in bounce. Making an
undeclared route silently default to stripping its last segment turns two red,
including the Android one. Both breaks were made in the gate worktree and
reverted.

### Gate

Clean worktree at **origin/main `4ea7dd3`**, hard-linked node_modules, never the
shared tree. `npx tsc --noEmit -p tsconfig.json` clean. `npx eslint` on all
thirteen touched files: zero errors and zero warnings, no rule disabled
anywhere. `npx vitest run`: 152 files, 2748 tests, all passing. The static scan
in `tests/session-memory.spec.mjs` passes, though its count now reads "2 back
control(s) checked" rather than ten, because the controls no longer hold the
call. That spec was not edited.

### What is NOT proved, plainly

**The Android hardware button has not been pressed on a device.** This box has
no Android and no emulator. What is proved is the decision function, at every
root and at the deep-link case that used to close the app, and that
`back-button.ts` now asks `isAppRoot()` instead of `canGoBackInApp()`. Whether
Capacitor delivers the event and whether `App.exitApp()` behaves is unchanged
from before this work and is untested here, as it was untested before.

**One file outside the brief's list was edited, deliberately.**
`lib/native/back-button.ts` holds the exit decision, and the founder's
instruction about the hardware button cannot be met without it: the handler
only calls the injected `goBack` when it has already decided not to exit, so a
change confined to `NativeRuntime.tsx` would have left the shell closing on
deep links. Two lines changed there, no Capacitor import added anywhere new,
and the website still pays nothing for any of it.

**Four routes now go somewhere different from their old hardcoded fallback**,
and each is a deliberate reading of the hierarchy rather than a port of the old
string: `/listing/[id]` goes to `/search` rather than `/home`; `/checkout` goes
to `/stays` rather than the page's own computed "back to the stay" href;
`/bookings/[id]/review` goes to the booking rather than the booking list;
`/verification`'s internal sub-view goes to `/profile` rather than back to the
verification index, because that sub-view is state and not a route. If any of
those four is wrong, it is wrong in ONE readable line of `route-parents.ts`,
which is the point of the file.

## 27. A THIRD FALSE RED FROM THE SHARED TREE, AND TWO MEASUREMENTS THAT CORRECT THE FOUNDER

### The false red, and it is now a standing rule

B2 reported main red on the locale ratchet, "yo now renders 263 keys in
English, up from the recorded 212", and attributed it to the purchase
namespace commit. Measured in a clean worktree at the tip `51ea93c`:

| Check | At the tip |
| --- | --- |
| `locale-completeness.test.ts` | **6 passed** |
| The ceilings | **212 / 210 / 219, UNMOVED** |
| `npx tsc --noEmit` | **exit 0** |
| `src/lib/nav` | **does not exist**, it is another agent's untracked work |

Its typecheck errors were all in `src/lib/nav/resolve.ts`, a file that is not
on the branch at all, which is the proof that both readings came from the
SHARED TREE rather than from an isolated worktree.

**THE CEILING STAYING AT 212 IS THE VALUABLE PART.** It is the one thing that
tells us the purchase namespace's Yoruba, Hausa and Igbo strings are genuinely
not English: had English been pasted in to make a key count look finished, the
count would have risen by about 51 and the ceiling would have had to move. It
did not.

That is the third false red from the shared tree today, and the first was
mine. So it is a rule rather than an observation: **A GATE READING TAKEN IN
THE SHARED TREE MEASURES NOTHING, AND EVERY GATE ROW NAMES THE COMMIT IT WAS
TAKEN AT.** A dozen agents' uncommitted edits sit in that directory
continuously; `next build`, `tsc` and `vitest` all compile the working tree.

### THE FOUNDER'S ICON PLATE DIAGNOSIS IS WRONG, AND THE MEASUREMENT IS WHY

His instruction: "The plates behind our icons are dull navy on white. The icon
ground token is the cause and it needs a real paper value, not the dark one
carried over."

The symptom is real. The stated cause is not. 1,516 object pixels sampled
against a real light-theme plate, scored by the share of artwork falling under
1.5:1 against its ground:

| Plate | Artwork lost |
| --- | --- |
| **navy, as shipped** | **12.0 per cent** |
| L 0.35 | 33.8 per cent |
| L 0.60 | 23.9 per cent |
| L 0.90 | 15.7 per cent |
| pure white | 13.4 per cent |

**Every lighter plate loses MORE artwork, and the middle of the range loses
most.** The curve is U-shaped because the artwork carries both bright
highlights and dark strokes, so a mid grey is the one ground that fights both.
There is no paper value that improves it.

The plate is dark because THE ARTWORK is drawn for a dark ground. What he is
seeing is the 121 objects that ship no light twin, and all six plates on the
home grid report `data-twinned="false"`. Changing that token would have been a
day spent making the product measurably worse while appearing to do as asked,
and somebody would have done it.

### "DIFFERENT BLUES" IS NOT STRAY HEXES EITHER

430 container-ish rules across the stylesheets. **270 distinct combinations of
edge, fill and radius. 203 used exactly once.** That last number is the
founder's complaint stated precisely.

But **zero of the 430 carries a raw colour literal.** Every one already names
a token. The divergence is in which RUNG each surface picks from a ladder
offering brand-edge, brand-soft, brand-strong, brand-primary, border-brand and
border-default for one job. Anybody sent hunting stray blues would have found
none and concluded the complaint was wrong. The fix is therefore probably
fewer rungs with clearer names rather than a sweep repointing 430 rules at the
same six tokens.

### Two refusals that were worth more than compliance

The icon plate above, and: **the base segmented control's selected segment
does not take the glow.** It is `--nf-surface-raised` with neutral elevation, a
physically raised neutral plate, the iOS idiom. Lighting it with a brand bloom
would change what it IS rather than light what it is. Only the brand-filled
variant takes it. The dock's active tab likewise has no fill to light. Two of
the five surfaces on the founder's list should not carry the treatment, and
saying which and why is an answer, where a silent three of five would not have
been.

### Still not done, named rather than implied

Item 6a, the logo seam: **not started, nothing shipped for it.** Item 7's
anatomy: **measured, not built.** And one light-mode defect could not be
closed from a stylesheet at all, because the ink is a Tailwind arbitrary
utility in a later layer: the rule was written, measured, found to move
nothing, and DELETED, because dead CSS that looks like a fix is worse than
none.

## 28. NAV AUDITED, AND IT CORRECTED THE LEAD'S OWN COUNT

Verified at `08cf502` in a clean worktree, not on report.

**I said there were ten `router.back()` call sites. There were seven, and NAV
was right.** My grep counted comment lines: a file explaining what
`router.back()` used to do matched the same pattern as a file calling it.
Checked at the tip, the only EXECUTABLE calls left are `NativeRuntime.tsx:70`
and `lib/nav/use-back.ts`, both of which run the resolver first; every other
hit in the tree is prose. That is the second time today I have counted a
comment as code, and both times a worker checked me rather than inheriting the
number.

`src/lib/nav/` exists at the tip with the map, the resolver, the previous
entry reader and 25 tests. **All 25 pass.**

### The answer to the question I asked it to answer first

`canGoBackInApp()` **cannot** prove the previous entry is the parent, and
cannot be taught to. Its three answers are a sequence stamp, a same-origin
referrer and a boolean; not one of them carries a URL. So it truthfully
answers "is there a screen of ours behind this one", and every control in the
product was reading that as "is the screen behind this one its parent". The
function is not broken and was not touched. **The defect was in the reading,
not in the reader**, which is why patching the screens the founder named would
have left it everywhere else.

### The decision worth keeping

An unmapped route returns `no-parent-declared` and falls back, with a warning
in a non-production build. It deliberately does NOT strip the last segment,
and the reason is the sharpest sentence in the hand-back: **that guess is
right often enough to hide the times it is wrong, which is the mechanism that
hid this defect in the first place.**

History is used only when BOTH proofs hold: the previous entry is in-app AND
its path equals the declared parent. The second needs a URL, which only the
Navigation API supplies, so Safari and Firefox always push the parent. That
costs a restored scroll position; a wrong `router.back()` costs somebody their
screen.

### Four behaviour changes, each a reading rather than a port

`/listing/[id]` now goes to `/search` rather than `/home`; `/checkout` to
`/stays`; `/bookings/[id]/review` to the booking rather than the list; and
`/verification`'s sub-view to `/profile`, because that sub-view is state and
not a route.

### What is NOT proved, in its own words

**The Android hardware button has not been pressed on a device.** This box has
no Android and no emulator. What is proved is the decision function at all
three roots and at the cold deep link that used to close the app. Whether
Capacitor delivers the event is unchanged and untested, as it was before. No
browser spec was run either, because no server is up here, so the runtime half
of back behaviour is unproven.

### One file outside its brief, declared

`lib/native/back-button.ts`, two lines. The hardware button cannot be fixed
without it: that handler only calls the injected `goBack` once it has decided
not to exit, so a change confined to `NativeRuntime.tsx` would have left the
shell closing on every deep link. Declaring it beats burying it.

## 29. THE SALE COST MODEL'S PROBE HAS NOW RUN, AND IT PASSED

Section 25 recorded that the buyer's cost model shipped with its probe
unexecuted, so the ONE LAW was not closed on it. It is closed now.

Run by the lead against `uccixoonmbhrnyczyigt`, unchanged from the file:

> PROBE ALL PASS sale cost model: 1 six columns bigint and nullable; 2
> validated checks incl covers_its_parts; 3 anon selects all six; 4 64
> existing rows 0 broken; 5 fixture copied from live sale row
> `ed000000-0000-4000-8000-000000000004`; 6 zero accepted and reads back as
> zero on all six; 7 undeclared stays undeclared on all six; 8 all six refuse
> -1 with a check violation; 9 total above parts accepted, one kobo below
> refused; 10 rows 64 to 65 only the fixture; ROLLED BACK, nothing committed

**And the rollback was verified rather than trusted**, which is the whole
lesson of section 15: `public.listings` reads 64 rows afterwards, the same as
before, with no row carrying a declared agency fee. A probe that says it
rolled back and a database that shows it rolled back are two different claims.

### Why it had not run, and it was nobody's fault

The agent that wrote it was reaching a DIFFERENT Supabase project,
`oepdbzejvrrqxgynfcdh`, which is inactive, and every call timed out. Its
reading of that timeout was honest and its refusal to call `restore_project`
on somebody else's infrastructure was correct. The project was simply not this
one. **Naming the project a probe ran against is now part of running it**, and
the file says which one it passed on.

### The two assertions worth pointing at

**7, undeclared stays undeclared.** Null goes in and null comes back on all
six columns, and nothing anywhere quietly turns it into a nought. That is the
entire feature: a cost nobody has declared and a cost declared as zero are
different facts, and a buyer is entitled to see which one they are looking at.

**9, the total may not undercut its own parts.** A total one kobo below the
sum of its parts is refused; a total above them is stored. That is the shape a
listing takes when an attractive all-in figure is advertised over fees that
say otherwise, and the database now refuses to hold that lie.

## 30. THE "DIFFERENT BLUES" FAULT, FOUND AND COLLAPSED AT ITS SOURCE

The founder's words were "different edges, different fills, different glows,
different blues. It does not read as one product." Section 27 recorded that
zero of the 430 container rules carries a raw colour, so anybody hunting stray
hexes would have found none. **Here is what was actually wrong, and it is a
better fault than the one described.**

Two independent sources were feeding container edges:

```
--nf-brand-edge*   <- --nf-glow-ink  <- --nf-electric-300   #0069FE
--nf-border-brand  <- --nf-electric-500                     #005DE0
```

Same hue to a tenth of a degree, 215.2 against 215.1. Same saturation. Nobody
holding them side by side would call them different colours. Six points apart
in lightness and, far worse, **WIRED TO DIFFERENT PARENTS**, so the day either
source moves the two drift apart and no grep finds it.

That is exactly why the founder sees edges that ALMOST match, and "almost" is
what reads as unprofessional. A visible difference gets fixed; a near-identical
one survives for months.

**Collapsed at the source.** Three rungs named for what a container IS rather
than how loud it is: `-quiet` for a division of space, base for an object on
the canvas, `-lit` for the dock and the flip pane. Soft, default and strong is
the naming that invites a fourth.

Verified at the tip rather than on report: `--nf-border-brand:
var(--nf-container-edge)` in BOTH theme blocks, the ladder present in both, and
`--nf-brand-edge` still carrying 26 references, which is the second ladder
declared as still owed rather than quietly left.

**Why fewer rungs beat a sweep**, in the worker's own reasoning, which I
endorse: repointing 430 rules is thirty seven files of churn in other people's
scopes AND it leaves the ladder that caused the drift standing. Collapsing at
the source lands everywhere at once and REMOVES the choice rather than asking
everybody to keep making it correctly forever.

### Still owed on item 7, named rather than half landed

`--nf-brand-edge` with its soft and strong rungs is a second ladder on 83
container rules, `oklab(0.568)` at night against `0.436` on paper against the
anatomy's theme-stable `0.519`. That is a visible change in both themes and
wants its own visual sweep, so it is its own piece.

## 31. THE LOGO: THREE FILES ONLY THE FOUNDER CAN COMMISSION

Item 6a is enumerated and **no artwork was invented**, which was the whole
risk. A 3D glass rendering lit for a dark ground does not become an ink
drawing by filter, and shipping a recoloured dark mark would have been the
fourth thing today that looked like a fix and was not.

Needed, each at the existing artwork's real aspect:
`vallo-wordmark-light.png` 1516x334, `vallo-mark-light.png` 1228x1174,
`vallo-logo-light.png` 1024x1024. Recorded in `docs/FOUNDER_OPEN_ITEMS.md`.

Three findings from the enumeration:

* `Logo.tsx` already IS the seam for in-app surfaces. Two screens bypass it
  with hard-coded paths.
* **The auth screen must not switch**, because rule 22 locks it dark in both
  themes permanently, so the dark mark is correct there for ever.
* **AN EMAIL MUST DO NOTHING, AND THAT IS A BETTER ANSWER THAN THE QUESTION I
  ASKED.** I said an email cannot read a media query reliably. The truer
  answer is that these emails are dark-ground BY DESIGN, painted three times
  over precisely because clients cannot be trusted, and `theme.ts` already
  records that Gmail strips `prefers-color-scheme` entirely. The email carries
  its own ground, so the reader's theme is not the question at all.

## 32. A FOURTH FALSE READING FROM THE SHARED TREE, IN THE SAME HOUR

While fixing the two above, the same worker's full build died on
`components/host/HostWizard.tsx`, another agent's UNCOMMITTED file. Its CSS
compiled successfully; the type error was foreign.

That is four in one day, and the rule in section 27 holds. One addition worth
making, because it cost a gate: **`node_modules` must be HARD LINKED into a
gate worktree, never symlinked.** Turbopack refuses a symlink that points out
of the project root, and it panics rather than failing cleanly, so the build
is the one gate that silently cannot be isolated. `cp -al` at both the root
and `apps/web`.

## 33. THE SCHEDULER OUTAGE COST NOTHING, AND I AM CORRECTING MY OWN ALARM

I told the founder that deletion requests past their thirty day promise were
going unpurged, and that wallet holds were not being released. Both statements
implied there were some. **Measured:**

| Table | Rows |
| --- | --- |
| `account_deletion_requests` | **0** |
| `bookings` | **0** |
| `saved_searches` | **0** |
| `reservations` | **0**, since the forged one was removed today |

No promise has been broken. No hold is sitting on anybody's money. Nothing is
owed to a real person by any of the seven refused jobs, and **the purge
backlog does not need a manual first run because there is no backlog**, which
was the founder's explicit question.

**The outage is still worth every minute spent on it**, and the reason is
worth stating rather than assuming. A scheduler that has never once succeeded
is not a scheduler anybody should trust with the first real deletion request,
and the first real user is the one who would otherwise have paid for
discovering this. Cheap to fix now, expensive to find later.

**The alarm itself was right in shape and wrong in scale, and the scale is the
part I should have measured before raising it.** "Deletion requests are not
purged" and "the machinery that purges deletion requests has never run" are
different sentences, and only the second one was true. I reached for the first
because it is the one that conveys urgency, which is exactly the habit this
ledger keeps catching in other people's work.

## 34. THE SCHEDULER WAS LOCKED OUT BY ONE LETTER

Four days, 261 alerts, seven jobs, and the cause is a variable name.

Read off the project's environment rather than guessed at: there is a
production variable named **`CRONS_SECRET`**, updated today at about 15:12,
and **no variable named `CRON_SECRET` at all**.

Vercel's scheduler sends `Authorization: Bearer $CRON_SECRET`, spelled exactly
that way. `CRONS_SECRET` is read by nobody: not by Vercel, and not by this
codebase either, where a grep for it returns nothing. So every cron request
arrived with NO bearer, and our own door refused it. `vercel.json` declares
exactly the seven paths that are failing, so nothing else in the wiring is
wrong.

**Three diagnoses were offered today and only the third was right**, which is
worth keeping because the first two were reasonable and both were wrong:

1. "The secret was rotated on one side only." Wrong: both were set.
2. "A pasted newline makes the values differ." Not proven, and it remains
   possible, but it is not what is refusing these requests, because with the
   variable misnamed there is no bearer to compare at all.
3. The name. One letter.

**The newline fix stands on its own merits and is not wasted.** The bearer
comparison trimmed neither side, so a pasted newline on either value would
have produced this same 401 with the same silence. It was a real hole whether
or not it was this hole, and it is the same fault that took the database side
down an hour earlier, where `btrim` with one argument strips spaces only.
Fixing that in SQL and not in the app would have left half the door open.

**WHY NOBODY COULD SEE IT, which is the part that generalises.** From inside
the door, these are the same event: a wrong secret, a right secret with a
newline attached, and no secret at all. All three arrive as "not authorised".
The refusal that WATCHTOWER rebuilt this morning made the job loud, and it
still could not say which of the three it was, because the information is not
there to say it with. A guard that can distinguish "you sent nothing" from
"you sent the wrong thing" would have answered this in one reading, and that
is a real improvement to make rather than an observation.

**I could not fix this myself.** The value is sensitive and the API will not
return it, so I cannot copy it into a correctly named variable. The name is
the only thing visible, and the name is the fault.

## 35. THE LIGHT TWINS ARE A RENDER ORDER, AND ONE MARK IS WITHHELD ON PURPOSE

### The count, verified on disk rather than taken on report

`apps/web/public/brand/glass/light/` holds **24** files against 144 dark
objects. 23 are declared twins; the 24th is `escrow-hold.png`, which has **no
dark original at all**, confirmed by looking.

So **121 objects have no light twin**, and that, not the plate's ground, is the
light-mode fault the founder is seeing. Recorded in `FOUNDER_OPEN_ITEMS.md` as
a render order: 121 PNGs, 256x256, named exactly as their dark counterparts,
about 2.6MB, designed twins rather than filters.

### THE ONE EDIT THAT WAS NOT MADE, AND WHY IT IS THE BEST DECISION IN THE REPORT

`escrow-hold.png` is a finished light twin sitting in the directory with
nothing pointing at it. Read off the filesystem it is indistinguishable from a
render somebody forgot to wire up, and wiring it up is a ONE LINE edit. B2 was
one edit from doing it and did not, because `BRAND_MARKS.md` says build it and
do not ship it until escrow exists, and `terms.tsx` states that Vallo does not
hold your money.

**Shipping that mark would have been artwork contradicting the contract**, on
a platform whose own rule is that escrow is promised nowhere until it
operates. A comment stopped it, and as B2 put it, a comment only stops the
person who reads it. It is now in a `WITHHELD` set in a test, beside its
reason, so the next person is stopped by a failing gate rather than by their
own diligence.

### The test that matters is not the obvious one

The obvious assertion is that every declared twin has a file. The valuable one
is the reverse: **a name in `LIGHT_TWINS` with no light file is worse than a
broken image**, because the component then sets `data-twinned="true"` and
SUPPRESSES THE PLATE, so a real person in daylight gets a missing image on a
white page with nothing behind it. That is exactly how 121 incoming renders
will fail, one at a time, as they arrive. B2 proved the test by breaking it
first.

### Item 7 finished: one ink, three strengths

`--nf-container-ink` now feeds every container edge and **there is no second
parent left to move**, which was what made the original drift invisible to a
grep.

The three strengths were KEPT deliberately, and the reasoning is right:
forcing 341 references onto one alpha would flatten a real distinction,
because a well's hairline and the dock's outline are not the same edge. Soft,
base and strong of ONE ink is a ladder; two inks at overlapping strengths is
drift, and drift was the complaint. Collapsing the strengths would have been
answering a complaint the founder did not make while losing something the
product uses.

Monotonic in both themes: 1.35 / 2.24 / 2.81 at night, 1.56 / 2.87 / 3.71 on
paper. On paper the base moves from a washed `rgb(103,143,200)` to a clean
`rgb(73,138,231)`, which is the "different blues" complaint answered at the
pixel.

### Owed on that change, and named rather than skipped

**The whole-harness visual sweep did not complete** on a 341-reference change.
`next start` died mid-run twice in the isolated worktree, at 158 and 149
unopened routes, and a reading off a dead server is not a reading, so both
were discarded. A bounded eight-route sweep ran clean: 748 leaves, 3 below the
floor in light, 0 in dark, and none of the three can be caused by this change
STRUCTURALLY rather than as a judgement, because all three are ink-on-fill
pairs and this change moves only border colours.

The blocker is server stability in the worktree, not the change. It stays owed.

### Two defects found in passing, neither B2's

* **`.nf-movein__label` on `/preview/f3/listing` is white on white at 1.03:1.**
  That is the label on the move-in cost block, which is the feature that
  exists so a tenant can read what they will actually pay.
* The settings `Verified` badge is 4.04:1.

## 36. THE URL FIX WORKED, AND THE NEW VERDICT FIELD ANSWERED THE NEXT QUESTION ON ITS FIRST USE

The 16:47 pg_net reconciliation, measured rather than assumed:

| | 15:47 | 16:47 |
| --- | --- | --- |
| `cron.job_run_details` | **failed**, invalid URL with a newline in it | **succeeded** |
| `net._http_response` | 404 `DEPLOYMENT_NOT_FOUND` | **401** |

**The newline fix worked.** The 404s that ran from 29 August are gone: the URL
is valid, it resolves, and it reaches the live deployment. That is the first
time this job has reached the platform at all since August.

**And then the thing built an hour ago paid for itself.** The alert reads:

```
cron.paystack_reconcile.unauthorised
{"http_status":401,"scheduler":"unknown","ran":false,"reason":"secret-mismatch"}
```

`secret-mismatch`, not `no-bearer`. Before this field existed, that 401 was
indistinguishable from the one that had been arriving all day, and the honest
answer would have been another round of guessing. Instead it says, in one
reading: **a bearer WAS presented and it did not match.** Both sides trim
whitespace now, in the app and in SQL, so this is not a paste artefact. **The
two values genuinely differ.**

That is three faults in one job, found in order, each hiding the next:

1. A dead per-deployment URL in Vault, answering 404 for three weeks while the
   scheduler reported success, because nobody read the reply.
2. A pasted newline in the replacement URL, which `btrim` with one argument
   could not strip.
3. The Vault secret and `RECONCILE_CRON_SECRET` holding different values.

**Nothing could see past the one in front of it**, which is the whole argument
for making each layer say what it actually observed rather than that it tried.

### What the founder needs, stated once

THREE values must be identical, and at least one is not:

| Where | Name | Who reads it |
| --- | --- | --- |
| Supabase Vault | `vallo_reconcile_secret` | the pg_cron path |
| Vercel | `RECONCILE_CRON_SECRET` | our door, both paths |
| Vercel | `CRON_SECRET` | Vercel's scheduler, which injects the header |

The 16:47 evidence proves Vault does not equal the host. `CRON_SECRET` was
created separately at about 16:25 and has not been compared to anything yet;
the 17:05 run is its first test.

## 37. CHROME: THE FOUNDER'S ITEMS 2, 3, 4 AND 5

Four items from the founder's eight, in his words and in his order. Two gates,
both on a clean worktree at a fetched tip of `main`, both proven on a
PRODUCTION server (`next build` then `next start`, never `next dev`, which does
not hydrate reliably on this box), at 390x844 in dark and then in light.

| Gate | Commit it was taken at | What it proved |
| --- | --- | --- |
| `gate-chrome` | **`be2713e`** "staff the founder's eight" | items 2, 3, 4 |
| `gate-chrome-2` | **`c3d3a92`** "the refusal now names which of the three faults it was" | item 5 |
| `before-chrome` | **`be2713e`**, unmodified | the BEFORE numbers |

The third worktree is the one that makes the rest of this section a
measurement rather than a claim: every "before" figure below was read off a
production build of untouched `main` with `getBoundingClientRect` and
`getComputedStyle`, not off a stylesheet.

At both gates: `tsc --noEmit` clean, `eslint` **0 errors**, `vitest run` all
passing (151 files / 2723 tests at the first, 153 / 2759 at the second).

---

### ITEM 2. THE CENTRE SWITCH COMES DOWN INTO THE BAR

> "Move it in line with the other icons. It should sit at the same height and
> on the same baseline as Home, Search, Feed and Profile, not raised above the
> bar. Draw its icon in the same style as the others, but keep its container so
> it still reads as the special one. And make it smaller, it is currently too
> big for the row it sits in."

**This reverses a decision that was made deliberately, and the reversal is
right.** The raise was built to `GOVERNING-01`, which draws the object standing
proud of the capsule. The founder has used the bar on a real phone. A reference
image loses to the founder looking at the real thing, and that is the correct
order of authority. Recorded so nobody re-argues it from the image.

**Measured at 390, identical in dark and in light:**

| | before (`be2713e`) | after |
| --- | --- | --- |
| capsule | top 762, bottom 832 | unchanged |
| tab link | top 769, bottom 825 (56px) | unchanged |
| neighbour glyph | 778.5 to 802.5 (24px) | unchanged |
| neighbour label | 804.5 to 815.5 (11px) | unchanged |
| **switch object** | **755 to 807**, 52x52 | **778 to 816**, 38x38 |
| translate | `0px -16px` | `0px` |
| radius | 18px (ratio 0.35) | 14px (ratio 0.37) |
| glyph | `BrandIcon role-switch-tile` @34 | `UiIcon switch-profile` @24 |
| `--nf-tabbar-clearance` | `… + 4.375rem + 1rem + .75rem` | `… + 4.375rem + 0rem + .75rem` |
| `main` padding-bottom | 110px | 94px |

**762 minus 755 is seven.** The founder said "about 7px above the bar" from
looking at it. That is what it was.

**"Same height and the same baseline" is arithmetic here, not an eye.** The
four neighbours draw a 24px glyph over an 11px label with a 2px gap: a 37px
content block, centred in the 56px link, running 778.5 to 815.5. A 38px object
centred in the same link runs 778 to 816. Half a pixel at the top, half a pixel
at the bottom. **38 is the odd-looking number it takes to line up with what is
already there**, which is why the size is not a round 40.

**The icon changed TIER, not meaning.** The old glyph was the pack's own switch
object on a glass tile: correct about what the control does, and a tier-two
object standing in a row of four stroked 24px glyphs. `UiIcon` gains
`switch-profile`, two opposed arrows drawn on the same 24 grid at the same
stroke. **Not `repost`**, which is the nearest existing shape and already means
a post sent on; that one turns two right angles, this one has straight shafts.
One mark, one meaning, is the discipline this set holds everywhere else.

**The container stays and is now the whole of what marks the slot**: the brand
tint, the `--nf-brand-edge-strong` outline and the glow, with the glyph at
`--nf-brand-primary` so it does not inherit `--nf-content-muted` and read as
disabled on a lit plate.

**Held beside `GOVERNING-01` screen one.** The render draws five slots, the
centre one a lit plate carrying a stack of three discs, standing proud of the
capsule, with no label under it. We now draw five slots, the centre one a lit
plate carrying a stroked swap mark, sitting IN the capsule, with no label under
it. **Three deliberate departures**, all of them the founder's own ruling
against the image: the lift, the size and the glyph's tier. Everything else -
the slot count, the position, the lit container, the absence of a label, the
brand ink - is the render.

---

### ITEM 3. THE DRAWER, MEASURED BEFORE IT WAS TOUCHED

> "Clean it up properly, it looks amateur right now. Remove the Switch profile
> row entirely... The theme control loses its container and its words... Then
> look at the whole drawer as one thing and make it organised and professional:
> consistent row heights, consistent icon sizes, consistent spacing, one clear
> grouping rhythm."

**"Inconsistent" is a claim until it has numbers.** Read off
`/preview/f1/drawer` at 390x844 in dark on a production build of untouched
`main`:

| object | height | inline pad | gap | glyph | glyph x |
| --- | --- | --- | --- | --- | --- |
| close control | 36 | 0 | - | 20 | - |
| user card | 124.2 | 14 | 14 | - | - |
| nav row | 44 | 14 | 12 | 20 | 33 |
| theme row | 52 | 14 | 12 | 20 | 34 |
| switch profile row | 56 | 8 | 12 | - | - |
| coin card | 101.2 | 14 | 14 | - | - |
| legal row | 44 | 12 | 10 | 16 | 31 |

**Five row heights, three inline paddings, three gaps, three glyph sizes**, in
one panel a dozen rows tall. Three things that look like one column were on
three columns: 31, 33, 34.

**AND THE 20 IS A DEFECT, NOT ONLY AN INCONSISTENCY.** `NavTree` and
`ThemeToggle` both ask `UiIcon` for `md`, which is 24. The drawer overrode BOTH
the 24px slot and the 24px `<svg>` inside it down to 1.25rem. `UiIcon` derives
`stroke-width` from the size it was ASKED for, so redrawing the same 24-unit
viewBox at 20 scales the stroke with it: **every glyph in this panel carried
five sixths of the platform's stroke weight**, about a fifth thinner than the
same glyph anywhere else in the product. That is exactly the fault
`ThemeToggle` has a paragraph about for its own icon, and the drawer was doing
it to every row. No grep would find it: the override is in a stylesheet and the
size is in a component.

**After, same server, same viewport, and the same in light:**

| object | height | inline pad | gap | glyph | glyph x |
| --- | --- | --- | --- | --- | --- |
| close control | 36 | 0 | - | 20 | - |
| user card | 124.2 | 12 | 12 | - | - |
| nav row | **48** | **12** | **12** | **24** | **33** |
| theme control | **48** | **12** | - | **24** | **33** |
| coin card | 101.2 | **12** | **12** | - | - |
| legal row | **48** | **12** | **12** | **24** | **33** |

One row height. One glyph size, at the platform's own stroke. One inline
padding and one gap, so **every glyph starts at x=33 and every label at x=69**.
One grouping rhythm - a hairline, 12, the group - used by a section boundary
and by the foot alike, where **the foot had no hairline at all** while every
section above it did.

**Two things keep their own height on purpose and they are the two CARDS**, not
rows: the user block at 124 and the coin at 101. The founder asked for a panel
that reads as organised, not for its two objects to be flattened into the list.
What they now share with the rows is the left rule and the inside gap, which is
what makes them look placed rather than pasted. **The close control stays at
36** for the reason its own note gives: it paints 36 and taps 44 through
`::after`, and it is the head's one control rather than a row of the list.

**Switch profile is gone**, with `.nf-nav__switch` and its five parts.

**The theme control is the glyph and nothing else**, proven rather than
asserted: `background-color: rgba(0, 0, 0, 0)`, `border-width: 0`,
`box-shadow: none`, `textContent` empty, `aria-label` "Switch to light mode" in
dark and "Switch to dark mode" in light. It is a new `bare` variant rather than
a change to `icon`, because `icon` deliberately DOES wear `.nf-icon-btn`'s
plate in the marketing header, where the glyph sits over photography. **The
words survive as the accessible name**, which is where a control with no
visible label has to keep them.

**One chevron, drawn one way.** The legal row was drawing a 14px `UiIcon`
chevron beside rows whose chevron is an 8px CSS corner. The icon is gone from
the markup and the row joined the `::after` selector.

---

### ITEM 4. THE SHEET ALWAYS OFFERS THE CHOICES

> "When I tap it, it should always show me the full set of options, exactly as
> in GOVERNING-01 screen two, and let me pick, even when I already hold a
> workspace. Right now it behaves as though holding one means the question is
> settled. It is not."

**The bug, named.** `triggerBehaviour(workspaces)` returns `"toggle"` for an
account holding exactly one workspace, and `ProfileSwitcher` acted on it: one
tap flipped straight between Personal and that workspace and **the sheet never
opened**. The reasoning in the old comment was about saving a tap. The
founder's ruling is about what the control MEANS, and he is right: holding one
workspace does not settle the question of who you are, and a control that
answers it for you hides both the standing of what you hold and the door you
have not walked through.

`triggerBehaviour` is left where it is, unread by this file and still covered
by its own unit test: it is another scope's export to remove, not this one's.

**Proven at 390 in dark and in light** on `/preview/f1/switch?held=one`, the
exact state the defect lived in, clicked through Playwright on a production
server. The sheet opens, and it draws: **Personal** (ticked), **Seyifunmi
Adeyemi / Verified / List your own properties**, **Add a workspace**. With two
held it draws Personal, both workspaces with their own standings, and the door.

**Statuses are real or they are not drawn.** The mark is
`copy.standings[workspace.standing]`, and `standing` came out of
`standingFromStatus`, which maps one `agents.status` or `businesses.status`
value onto one word. "Pending review" means the row says SUBMITTED or
UNDER_REVIEW. **"Verified" is new and means the row says APPROVED**, which is a
decision a member of staff made and the audit log recorded.

**The console is the one workspace with no mark, and that is the honesty rule
working.** Its standing is synthesised as `active` in `workspaces-queries.ts`
from the mere existence of a staff role row; nothing approved it and no queue
decided it. Drawing "Verified" beside it would be exactly the guess the founder
ruled out. A mark this sheet cannot source, this sheet does not draw.

Measured on the chip: `data-standing="active"` renders `rgb(16, 185, 129)`
(`--nf-status-approved`), `data-standing="pending"` renders `rgb(0, 200, 255)`,
both at `border-radius: 6px` on a 24.6px box. **Ratio 0.24: a rounded
rectangle, not a capsule**, where `GOVERNING-01` draws pills. The shape law
wins, as it did for the other four standings already.

**Held beside `GOVERNING-01` screen two.** The render: a titled sheet with a
close control, the Personal row with the account's own photograph and a filled
blue tick, Owner with a green "Verified" mark, Agent with a "Pending review"
mark, a firm row with a chevron, a hairline, then "Add a workspace" with a plus
in a tinted square. We draw all of it, from the database, with the standing
marks as rectangles rather than pills and the kind glyphs in tinted squares
rather than circles - both of them the shape law, both already argued in
`controls.css`.

---

### ITEM 5. THE CONSOLE OPENS ON A MAP OF ITSELF

> "Going into the admin console should land on the overview, every time, before
> any individual desk. Right now it drops straight into an area. Overview
> first, then I choose where to go."

**He is describing the page accurately and the route was never the problem.**
Every door into the console already pointed at `/admin`: the drawer's Console
row, the switch sheet's console workspace, `AdminNav`'s Overview row,
`makeWorkspace`, `workspaces-queries`. What `/admin` RENDERED was the unified
queue table - five readers folded into one list, a tab strip, a filter bar,
forty rows - under a heading that said "Operations overview". **That is an
area.** It is one way of working, chosen for you, before you have said what you
came to do.

**The queue moved to `/admin/queue`, intact.** The only edit to it is the hrefs
it builds for its own tabs and filters, which had to follow it or a filter
change would have thrown an operator back to the front door. It has its own
name in all four locales now, because the overview's title was never its title.
It is the rail row directly under Overview and the one thing the overview
offers by name.

**`/admin` is now seven desks with their live counts**, in the order `nav.ts`
already argues for - safety, then supply, then the human queues - then the
queue, then the three facts a new operator has to be told before touching a
row. Those three were already written in the dictionary and were on no screen:
the audit log cannot be edited, an approval or refusal tells the person, and
the safety scan is invisible outside the console.

**Every number is a database count.** `getQueueCounts` runs seven
`head: true, count: "exact"` reads under the admin gate the layout has already
applied. The headline is the SUM of the seven tiles computed from the same
object, so it can never disagree with them. **There is no trend, no movement
since last week and no total-processed figure**, because nothing in this schema
records a point in time from which such a number could be derived. That is the
same refusal BUILD 07 already made about the overview trend and a
`queue_snapshots` table that does not exist.

**A failed read draws the unavailable panel, not seven zeroes.** An operator
who sees seven zeroes on a console front door goes home. **A real zero is drawn
AND said**: the figure stays and the lede becomes "This queue is clear", so the
zero never carries that meaning alone and an empty queue cannot be misread as
an unopened one.

Tiles are `--nf-radius-control` on a box that draws at least 81.5px: **ratio
0.17**, a rounded rectangle. They are links on the platform's own card
material, not a new admin look.

**The console search's fallback moved with the queue.** It takes the desk out
of the pathname and fell back to `/admin`, which was right while `/admin` WAS
the queue and would now have navigated an operator to a page with no `?q=` and
thrown their words away. It falls back to `/admin/queue`.

**Proven** at 390 dark, 390 light and 1440 dark on `/preview/f5/admin-overview`,
a new harness that draws the real `ConsoleOverview` inside the real console
frame from fixture counts, because the layout gates on `requireAdmin` and a
sandbox has no session. **That harness proves the look and never the numbers**,
and it says so in its own docstring; one desk is deliberately zero so the clear
line can be seen beside six that are not. `document.scrollWidth` equals the
viewport at both widths.

---

### WHAT I DID NOT DO, AND WHO IT IS FOR

**Three rules live in the wrong file, on purpose.** `.nf-switch-dock`,
`.nf-tab__link--switch` and `.nf-switch-standing` are declared in
`controls.css`, which **IMG-A owns this stint** (section 24). Their three
corrections are in `chrome.css`, which imports after it at equal specificity
inside `@layer components`, each under a note naming the situation. **To fold
back:** whoever owns `controls.css` next should move the four declarations into
the single block there and delete the overrides. Nothing is broken meanwhile;
it is two descriptions of one object, which this file has a long paragraph
about elsewhere, and I would rather write that down than reach into somebody
else's stylesheet mid-stint.

**`side-nav.css` and `admin.css` are not in the section 24 table.** I took both,
because the drawer is item 3 and the console is item 5 and neither could be
done otherwise. Recorded here so the next partition can name an owner for them.

**Two i18n keys are now unused and are LEFT IN PLACE**, per the add-only rule:
`uiCommon.theme.light` and `uiCommon.theme.dark`, which were the theme row's
visible label. `ThemeToggle`'s `row` variant that used them also has no call
site now. Both are somebody's to remove deliberately, not mine to remove in
passing.

**`--nf-dock-lift` is kept as a token at zero rather than deleted**, because
`controls.css` reads it and that file is not mine. It is the one edit that
cancels the raise from the file CHROME owns.

**No token was changed and none needs to be.** Everything here came out of the
existing scale: `--nf-space-sm`, `--nf-gap-row`, `--nf-radius-control`,
`--nf-status-approved`, `--nf-brand-primary`.

**The rail wears the bare theme control too.** The founder's words were about
the drawer; `AppRail` is one component for both viewports and Master Rule 17
says the two may not drift, so the desktop rail's theme control lost its label
as well. **An eye on that at 1440 would be worth having** - the rail is a
column of labelled destinations and this is now the one unlabelled thing in it.
It is the only judgement in this section that a measurement did not decide.

## 38. CHROME AUDITED: FOUR ITEMS, AND A DEFECT THAT FELL OUT OF THE MEASURING

Items 2, 3, 4 and 5 of the founder's eight, landed at `71b000c`, `5e0802a`
and `5dcdaad`. **The before and after proofs were in the scratchpad**, where a
container reclaim takes them, so 21 of them are now in
`docs/design/proofs/chrome/`, compressed 10.6MB to 2.5MB. Section 6 says a
scope closes with its proof RECORDED, and a proof nobody else can open is not
recorded. That is the second time today I have had to bring a worker's
evidence inside the repository.

### THE FOUNDER'S EYE WAS EXACT, TO THE PIXEL

He said the dock object sat "raised above the bar" and looked "about 7px" too
high, from looking at his phone. Measured: the capsule top was at 762 and the
object began at 755. **762 minus 755 is 7.** After the change the object spans
778 to 816 against its neighbours' content block at 778.5 to 815.5, half a
pixel at each end, so "same height, same baseline" is arithmetic rather than a
judgement. 38px is the odd size it takes to line up, which is why it is 38 and
not 40.

### A REAL DEFECT FELL OUT OF MEASURING THE DRAWER

Asked to make the drawer consistent, CHROME measured first: row heights
36/44/52/56/101/124, inline padding 8/12/14, gaps 10/12/14, glyphs 16 and 20,
and glyph x at 31, 33 and 34, which is three columns pretending to be one.

Then the finding nobody was looking for: **the drawer sized both the 24px slot
AND the 24px `<svg>` down to 20, and `UiIcon` derives its stroke width from
the size it was ASKED for, so every glyph in that panel drew at five sixths of
the platform stroke.** Nothing was misaligned enough to see; the whole panel
was simply drawn thinner than the rest of the product. That is the kind of
defect only a ruler finds, and it was found because the instruction was
"measure it first" rather than "tidy it up".

After: one row height of 48, one glyph at 24 at the correct stroke, every
glyph at x=33 and every label at x=69, and the foot gained the hairline every
section above it already had.

### ITEM 4 WAS A ONE-CONDITION BUG, NOT A DESIGN QUESTION

`triggerBehaviour` returned `"toggle"` at exactly one workspace, so the sheet
never opened for somebody holding one. The founder's words were "it behaves as
though holding one means the question is settled", and that is precisely what
the code said. It always opens now, proven by clicking through the exact
defective state in both themes.

**And the Verified mark is honest by construction:** it means `status =
APPROVED` and nothing else, and **the console row deliberately draws no mark**,
because its "active" is synthesised from the existence of a staff role row and
no queue ever decided it. A badge that means two different things is a badge
that means nothing.

### ITEM 5: THE ROUTE WAS NEVER WRONG

`/admin` was rendering the unified queue table underneath the overview's own
heading. The queue moved intact to `/admin/queue` and `/admin` now draws seven
desks with live counts. The headline is the SUM of those same seven numbers,
so it cannot disagree with them, and there is no trend or movement figure
because the schema records no point in time to draw one from. A failed read
draws the unavailable panel rather than seven zeroes, and a real zero is drawn
AND said.

### Declared rather than buried, and one wants the founder's eye

* **`AppRail` is one component for the drawer and the desktop rail**, so
  removing the theme control's label removed it from the rail as well. The
  founder's instruction was about the drawer. The rail is a column of
  labelled destinations and this is now the one unlabelled thing in it. **His
  call, and it is one line either way.**
* Three rules live in `chrome.css` that belong in `controls.css`, overridden
  from the file CHROME owns rather than reaching into IMG-A's. Someone folds
  them back when that file is free.
* `side-nav.css` and `admin.css` are not in section 24's partition table and
  were taken because items 3 and 5 were impossible otherwise. The next
  partition names an owner.
* Two i18n keys and one `ThemeToggle` variant are now unused and were LEFT,
  because removing a variant in another scope is a bigger call than the
  instruction covered.

## 39. IMG-C: THE STAYS SET-UP, BUILT TO `GOVERNING-09` THROUGH `GOVERNING-12`

The founder's standard for this stint is one sentence and it is the only one
that matters: **build every one of them almost exactly if not exactly as drawn,
and close each against its image with a side by side, and do not close one
without that row.** This section is IMG-C's four images, closed that way, with
every departure named rather than left to be discovered.

**The gate was taken at `be2713e`,** "staff the founder's eight, and write down
who owns which file", on a clean worktree at a fetched `origin/main`. Every
proof below came off `next build` plus `next start` on that worktree with
`NEXT_DIST_DIR=.next-imgc`, never `next dev`, and the dist directory was
removed between builds because this box ran out of disk twice today.

### WHAT WAS THERE, MEASURED RATHER THAN RECALLED

`GOVERNING-09`'s three stays doors existed and worked (`/host/start`,
`StaysDoors`, `lib/host/doors.ts`). Everything behind them was one generic
wizard: a step called "The property" with a name box, a description box, a star
select, two time inputs, a rules textarea and a policy select; a step called
"Rooms and rates" with a room form and a rate form; and a step called "Service
and seating" that asked a restaurateur for their cuisines as a
comma-separated string in a single text box and for a price band as a number.

`stepsFor` branched on the HOST TYPE and nothing else, so **a shortlet
operator and a hotelier got identical screens.** Somebody letting one
two-bedroom flat in Lekki was asked to name a "room type", pick whether it was
a twin or a dorm, and say how many of it they had. The honest answer to every
one of those three questions is none of the above.

### THE SIX PANELS THAT DID NOT EXIST, AND THE TWO MORE THAT FOLLOWED THEM

| Image and screen | Panel | Built as |
| --- | --- | --- |
| `GOVERNING-10` 1 | Your hotel | `components/host/stays/HotelStep.tsx` |
| `GOVERNING-10` 2 | Your room types | `components/host/stays/RoomTypesStep.tsx` |
| `GOVERNING-10` 3 | Rates | `components/host/stays/RatesStep.tsx` |
| `GOVERNING-10` 4 | Facilities and photos | `components/host/stays/FacilitiesStep.tsx` |
| `GOVERNING-11` 1 | Your place | `components/host/stays/PlaceStep.tsx` |
| `GOVERNING-11` 2 | House rules and cancellation | `components/host/stays/HouseRulesStep.tsx` |
| `GOVERNING-11` 3 | Your restaurant | `components/host/stays/RestaurantStep.tsx` |
| `GOVERNING-11` 4 | Tables and hours | `components/host/stays/TablesStep.tsx` |

Six were named as not built. Two more came with them because the render draws
the set: screen two of `GOVERNING-10` had a list of room types and none of the
drawn object around it, and screen four had a row of pills where the render
draws a grid of tiles.

`stepsFor` now takes the BUSINESS KIND as well as the host type, so the eight
above are three different flows rather than one: a hotelier gets hotel,
room-types, rates, facilities; a shortlet operator gets place, house-rules,
facilities; a restaurant gets restaurant, tables. `lib/host/onboarding.test.ts`
and `lib/host/doors.test.ts` assert all three, including that a shortlet
operator who is a REGISTERED COMPANY still gets `GOVERNING-11`'s screens,
because the branch is the kind's and not the host type's.

### THE SIDE BY SIDE. NO ROW, NO CLOSE.

Every shot is 2x, full page, off the production server, with the theme seeded
before the first navigation and the page refused outright on any status that
is not 2xx. `overflowX` was measured on every one of the twenty-four and is
zero everywhere, which is the 390 rule tested rather than eyeballed.

| # | Governing image | Our page, 390 dark | 390 light | 1536 dark | Closed |
| --- | --- | --- | --- | --- | --- |
| 1 | `GOVERNING-10` screen 1, Your hotel | [g10-1](design/proofs/imgc/g10-1-your-hotel-390-dark.png) | [light](design/proofs/imgc/g10-1-your-hotel-390-light.png) | [1536](design/proofs/imgc/g10-1-your-hotel-1536-dark.png) | yes, with two named departures |
| 2 | `GOVERNING-10` screen 2, Your room types | [g10-2](design/proofs/imgc/g10-2-room-types-390-dark.png) | [light](design/proofs/imgc/g10-2-room-types-390-light.png) | [1536](design/proofs/imgc/g10-2-room-types-1536-dark.png) | yes, with the thumbnail named |
| 3 | `GOVERNING-10` screen 3, Rates | [g10-3](design/proofs/imgc/g10-3-rates-390-dark.png) | [light](design/proofs/imgc/g10-3-rates-390-light.png) | [1536](design/proofs/imgc/g10-3-rates-1536-dark.png) | yes, with the cancellation block named |
| 4 | `GOVERNING-10` screen 4, Facilities and photos | [g10-4](design/proofs/imgc/g10-4-facilities-and-photos-390-dark.png) | [light](design/proofs/imgc/g10-4-facilities-and-photos-390-light.png) | [1536](design/proofs/imgc/g10-4-facilities-and-photos-1536-dark.png) | yes, two tiles absent and said so |
| 5 | `GOVERNING-11` screen 1, Your place | [g11-1](design/proofs/imgc/g11-1-your-place-390-dark.png) | [light](design/proofs/imgc/g11-1-your-place-390-light.png) | [1536](design/proofs/imgc/g11-1-your-place-1536-dark.png) | drawn; the save path was WRONG and is corrected, see 39.1 |
| 6 | `GOVERNING-11` screen 2, House rules and cancellation | [g11-2](design/proofs/imgc/g11-2-house-rules-390-dark.png) | [light](design/proofs/imgc/g11-2-house-rules-390-light.png) | [1536](design/proofs/imgc/g11-2-house-rules-1536-dark.png) | yes, with the refund sentence moved |
| 7 | `GOVERNING-11` screen 3, Your restaurant | [g11-3](design/proofs/imgc/g11-3-your-restaurant-390-dark.png) | [light](design/proofs/imgc/g11-3-your-restaurant-390-light.png) | [1536](design/proofs/imgc/g11-3-your-restaurant-1536-dark.png) | yes |
| 8 | `GOVERNING-11` screen 4, Tables and hours | [g11-4](design/proofs/imgc/g11-4-tables-and-hours-390-dark.png) | [light](design/proofs/imgc/g11-4-tables-and-hours-390-light.png) | [1536](design/proofs/imgc/g11-4-tables-and-hours-1536-dark.png) | yes, with the sitting duration named inert |

The preview routes the shots come from are `/preview/imgc/*`, real components
on fixture props with every write a no-op, behind `previewHarnessIsOpen`. Every
figure in those fixtures is the render's own: Lagoon Suites, RC 1234567, Plot
12 Admiralty Way, four stars, 85,000 and 105,000 a night, The Lagoon Grill.
Nothing in them is a number this build invented.

### THE RATIO SWEEP

`scripts/design/compare-surface.mjs --shape-sweep --theme both` over all eight
routes at 390 and 1536, in dark and light, saved at
`docs/design/proofs/imgc/ratio-sweep.txt`:

```
BREACHES, a text-bearing control drawn as a capsule (ratio at or above 0.5): 0
WORTH AN EYE, text-bearing and over 0.35 but not yet a capsule: 0
ROUND ICON-ONLY CONTROLS: 296
```

All 296 are `nf-stays-head__seg`, the progress segments, which carry no text
and which all twelve governing images draw as rounded capsules. The shape law
is about a control that CARRIES TEXT, so they are the case it exempts rather
than a breach it tolerates. The three controls that were most likely to breach
it, the cuisine chip, the price band and the place-type tile, are all on
`--nf-radius-control` and all measure at or under a third.

### WHERE THE SHAPE LAW WAS APPLIED AGAINST AN EARLIER READING OF IT

`FacilitiesPicker` shipped as a row of `nf-chip` pills under a comment saying
the shape law had beaten the image. **That comment answered the wrong
question.** The law is about RADIUS, measured as drawn radius over drawn short
side. It says a control carrying text is a rounded rectangle and never a
capsule; it has nothing to say about whether that control is a pill-shaped row
or a square tile with its mark above its word. `GOVERNING-10` screen four draws
a three-across grid of tiles, and tiles are what ships now, on
`--nf-radius-control`, at a ratio of about a quarter. Both rules are obeyed and
neither was traded for the other.

### THE ONE SCHEMA CHANGE

`GOVERNING-11` screen one asks a shortlet host whether their place is an entire
flat, a whole house or a private room. `public.room_category` is
`single | double | twin | suite | family | dorm`, a hotel's vocabulary, and a
shortlet host has had to answer it about their own home.

`supabase/migrations/20260922190000_imgc_a_shortlet_is_not_a_hotel_room.sql`
adds the three labels, additively, `if not exists`, ahead of the six, and
changes nothing else. `scripts/probes/stays_place_type.sql` proves eight things
about them, chooses its fixture by the predicate under test, copies it from the
oldest live `room_types` row with the column list read out of `pg_attribute`,
and ends in a deliberate `raise exception 'PROBE ALL PASS ...'` so it rolls
itself back.

**IT HAS BEEN APPLIED.** The coordinator ran it against the live estate,
`uccixoonmbhrnyczyigt`, and `room_category` now reads `entire_flat,
whole_house, private_room, single, double, twin, suite, family, dorm`: nine
labels, the three new ones at the head in the order the migration asked for,
the six old ones intact.

**THE WALL I HIT WAS THE WRONG PROJECT, NOT A DEAD ESTATE.** This build box
reaches `oepdbzejvrrqxgynfcdh`, which is `INACTIVE` and times out on every
call. The reading was honest and the conclusion, that restoring somebody's
paused project is not a call an agent makes, was right; the project was simply
not this one. **Naming the project a probe ran against is part of running it**,
and that is now written into both probe headers.

**THE INTERFACE STILL DIAGNOSES ITSELF**, because not every estate is this one.
`setShortletPlaceDraft` reads Postgres's own `22P02` and answers with a
sentence naming the migration file, rather than writing `double` onto
somebody's whole house.

### 39.1 THE PROBE FAILED, AND THE FAILURE WAS WORTH MORE THAN A PASS

The coordinator ran the probe. It stopped at:

```
ERROR 23514: new row for relation "room_types" violates check constraint
"room_types_beds_check"
```

`room_types_beds_check` is `CHECK (jsonb_typeof(beds) = 'array')`. **The column
must hold an ARRAY**, every live row holds one shaped
`[{"kind": "queen", "count": 1}]`, and `lib/host/actions.ts` wrote
`beds: { bedrooms, beds }`, an OBJECT. **So `GOVERNING-11` screen one would
have drawn perfectly and failed on the first real save**, for a reason that had
nothing to do with the enum it was built to explain.

**THE BELIEF THAT CAUSED IT WAS WRITTEN DOWN, AND THAT IS THE LESSON.**
`lib/host/queries.ts` stated that "`room_types.beds` has no shape constraint".
That is false and has been false since the column was created: the constraint
is on line 45 of
`20260918081453_m04_room_types_units_rate_plans_rate_calendar.sql` with the
shape documented on the line above it. The probe's own assertion 7 repeated the
sentence almost word for word and tested the round trip BECAUSE of it. **A
comment asserting an ABSENCE is exactly as unverified as a test asserting a
presence, and this one was inherited rather than checked.** It is the same
family as every other fault in this ledger's silent list: the repository
asserted a fact about itself, the fact was false, and nothing failed.

What that means for the proof on row 5 above, stated plainly: **the screenshot
proves the screen DRAWS and has never proved that it SAVES.** The preview
harness makes every write a no-op by design. The thing that proves the save is
the probe, and the probe is what caught this.

### 39.2 A BEDROOM IS NOT A BED, SO IT GETS A COLUMN

The array carries what is slept in, one entry per kind with a count. A
shortlet's bedroom count is a different fact and has nowhere honest to live in
it. Two ways out, and the choice matters more than the patch:

`20260922200000_imgc_a_bedroom_is_not_a_bed.sql` adds
**`room_types.bedrooms smallint`, nullable, `check (bedrooms is null or
between 0 and 30)`**. Three reasons, in order of weight:

1. **A bedroom is not a bed.** `BedSpec` in `lib/stays/types.ts` is
   `{kind, count}` and `RoomTypeRow.beds` is `BedSpec[]`. A bedroom count can
   only enter that array as a fake entry, and any reader printing beds would
   then print a bedroom as a bed.
2. **Widening the check costs every reader, forever.** Accepting an object as
   well as an array means every present and future reader handles two shapes,
   and the check is the only thing guaranteeing one today. **A constraint
   relaxed to fit a bug stops being evidence.**
3. **It belongs beside its two siblings.** "2 bedrooms, 3 beds, sleeps 6" is
   one sentence about one unit. `sleeps` and `beds` are already on
   `room_types`.

**Nullable, and zero is a different fact from unknown.** A hotel room type has
never been asked and reads null; a studio answers 0 and that answer is true. A
`not null default 0` column could not tell them apart. Same argument as the
sale cost columns in section 23.

**The bed count writes an array with no kind claimed.** `GOVERNING-11` asks for
a number of beds and never for their kinds, so the one entry carries
`kind: "unspecified"`. That is the absence of a fact, named. Writing `"double"`
because most beds are double would be a claim about somebody's flat that
nobody made.

**What changed, so this cannot recur quietly:**

- `lib/host/queries.ts` no longer claims the column is unconstrained. It now
  says what IS and what is NOT constrained: the column must be an array, and
  **what is in the array is checked by nothing at all**. The schema's own
  comment says the entries are "validated in the app"; **no schema in this
  repository validates them**, which is a second unbacked claim and is raised
  here rather than fixed silently.
- `bedsArray` and `bedsTotal` in `lib/host/stays-setup.ts` are the one
  conversion, at the one boundary, with five tests that would have caught the
  original fault, including that an object reads back as none.
- The probe's assertion 7 is inverted: it now proves the constraint EXISTS, is
  VALIDATED and says `array`, and assertion 8 proves an array round trips **and
  that an object is REFUSED with 23514**. Assertions 9 and 10 cover the new
  column, both ends of its range, and that it arrived empty.
- The migration adds `comment on column public.room_types.beds` stating the
  shape and the constraint, because it was documented in a migration file and
  nowhere the database itself would show it, so the next reader who asked psql
  was told nothing and the last one guessed.

**The second probe has NOT run** and is handed to the coordinator with the
second migration, which assertions 9 and 10 need.

### EVERY DEPARTURE FROM THE RENDER, NAMED

1. **The progress row counts the real flow, not four.** Each image draws four
   segments because each image shows a four-screen set-up. The application also
   asks for an identity document, a payout account and three consents. A bar
   drawing four would promise a shorter flow than the person is going to get,
   which is a lie told in geometry. The anatomy is the render's; the arithmetic
   is the flow's.
2. **The "Private room" tile does not carry the render's glyph.**
   `GOVERNING-11` screen one draws a vehicle-and-sofa mark on it, between a
   building for a flat and a house for a house. A car does not mean a private
   room in any reading. Everything else on the tile is the render.
3. **The house rule rows carry one prohibition mark rather than four
   pictograms.** The render draws a crossed cigarette, paw, party and child.
   This icon set contains none of the four, and `BrandIcon` and `UiIcon` are the
   only two sources allowed. Four different marks that each mean something else
   would say four wrong things instead of one true one. **A cigarette, a paw and
   a party glyph are artwork and want drawing into the set. Raised here.**
4. **The star row has no chevron.** The render draws one, implying a select.
   The five stars ARE the control, and a chevron beside them would open nothing.
5. **"Number of rooms" has no column anywhere in this database.** The plate,
   the printed value and the joined stepper are the render's. What the number
   DOES is stated on the screen: before any room type exists it is the
   hotelier's stated total and it seeds the first room type on the next screen;
   once room types exist it is the sum of their `units_total` and the stepper
   is disabled. It is deliberately not written to the device's draft either, as
   a number that survives a reload but never reaches the server is the worst of
   the three states, because it looks saved.
6. **The cancellation block on Rates is drawn once, not once per room card.**
   `accommodations.cancellation_policy_id` is a property-level column. The
   render's card is the only room type it draws, so per card and once are the
   same picture there and not here; four copies of one control all setting the
   same column is a control that lies about its own scope.
7. **The refund sentence on House rules sits under the tiles, not inside
   them.** The render's subtitles are three words. Ours are
   `cancellation_policies.summary`, real sentences written for a guest, and
   three of them in three 100px columns at 390 came back from the browser as
   nine lines of two-word wrapping with the tick badge sitting on the first
   title. Refund terms are the last text on this platform that may be squeezed.
8. **The room thumbnails are the property's cover.** `room_types` holds no
   photographs anywhere in this database. The property's cover stands in, and
   the room's glass mark stands in where there is no cover.
9. **The meal-plan rows carry no chevron.** The render draws one, which means
   the row opens an editor. There is no rate editor yet, and an affordance that
   opens nothing is worse than one drawn a few pixels differently. Adding one is
   the next piece of work on that screen.
10. **Friday and Saturday close at 11:59 PM and not at 12:00 AM.**
    `service_windows` carries `service_windows_order_chk`, `opens < closes`, and
    its own comment says a window stays inside one day. Midnight as a closing
    time is the next day and the check refuses it. The screen says so beside the
    control rather than offering a 12:00 AM that fails on save.
11. **"Tables and hours" saves the covers and not the breakdown.**
    `service_windows.covers` is the only seating number this database holds and
    the number every reservation is checked against. The four steppers are how a
    restaurateur actually counts a room, and the total is printed under them in
    words. No breakdown is claimed to be stored.
12. **The sitting duration is drawn and is inert, and says so.** There is no
    column for it and nothing in the reservation path reads one. It is drawn
    because the render draws it and because it is the right question to ask
    next; it is inert because the honest alternative to an inert control is a
    lying one.
13. **"Your place" has a name plate the render does not draw.**
    `accommodations.name` is `not null` and `accommodationDraftSchema` needs two
    characters, so a place with no name cannot be saved at all. It is prefilled
    from the business name and the plate says the place's name is the property's.
14. **The host chrome bar no longer draws its own back on the wizard.** The
    first shot came back with two arrows eight pixels apart, the chrome's and
    the drawn one. The render draws exactly one back control on a set-up screen,
    inline with the segments, so `HostShell` takes `chromeBack={false}` on
    `/host/apply` and the drawn control walks out of the flow when there is no
    previous step.

### TWO BUGS THE SHOTS FOUND THAT THE SOURCE DID NOT

Both are in the family this build keeps paying for: the source reads correctly
and the browser draws something else.

- **`display: block` on the hero.** `.nf-stays-hero` was a centring grid and
  the object carried `width: min(15rem, 62%)`. It came back from the browser at
  **128px where the arithmetic says 212**: a grid column sized `auto` takes its
  width from its item's max-content, and an item whose own width is a percentage
  OF THAT COLUMN is circular, so the browser resolved it against the artwork's
  intrinsic size instead. A block establishes a definite containing block. The
  same missing `display: block` on an inline `span` is why `aspect-ratio` did
  nothing at all.
- **A `background-image` that would have eaten its own fill.**
  `.nf-stays-select` paints its chevron with two gradients. Setting
  `background-image` REPLACES the layer that `background: var(--nf-well-fill-deep)`
  put there, so every select on these screens would have had a chevron and no
  fill. The well is the last layer of the list rather than a second
  declaration. Same family as `.nf-rows-sheet` painting `var(--nf-elev-3)` and
  rendering transparent.

### WHAT I DID ABOUT i18n, AND WHY

**Nothing, and it is deliberate.** `lib/host` and every host route are outside
the dictionary entirely: `HostShell` reads `t.a11y.logoHome` and that is the
only key any of them touches. The previous worker on this spine did not add a
partial namespace because that puts two patterns on one screen, and the
surrounding files follow that. Eight new panels of English inside a namespace,
with the other forty strings on the same flow as literals, would be worse than
either. **The whole host flow wants one i18n pass, as one piece of work, by one
person, in all four locales.** It is a real debt and it is bigger than this
stint. Named here rather than half-done.

### GOVERNING-09 AND GOVERNING-12, HONESTLY

`GOVERNING-09`'s stays side is the three doors at `/host/start`, and it was
already built and already correct: the glass mark on its plate, the operator's
own words, the supporting line, the chevron, the calm explanatory panel. **I
changed nothing on it and I did not take a fresh shot of it,** because the
founder's rule is a shot per surface CLOSED and I closed nothing there. Its
screen four, "Set up a hotel (first page)", is the same drawing as
`GOVERNING-10` screen one and is closed on row 1 above.

**`GOVERNING-12` IS NOT CLOSED AND I AM NOT CLAIMING IT.** Two of its four
screens are outside my file scope: the notification centre is `/notifications`,
owned by the messages worker, and search by listing ID is the search surface.
The two that are mine, the admin review queue and the admin listing details, I
did not build against the image this stint: the eight panels above took the
whole of it, and a row here without a side by side would be the exact thing the
founder's instruction forbids. **The next worker on `GOVERNING-12` should read
screen two carefully before starting: its price breakdown prints an "Agency fee
(10%)" and a "Legal fee (2%)", and rule 15 says the platform charges no fees
anywhere in copy. Those are a Nigerian agent's and a Nigerian solicitor's fees
and not this platform's, so the row is not automatically a breach, but the
screen has to say WHOSE fee each one is or it reads as ours.**

### WHAT ELSE I DID NOT DO

- **No rate editor.** `RatesStep` adds a rate and lists every rate on record.
  It cannot change or delete one, which is why the meal-plan rows carry no
  chevron (departure 9).
- **Two facility tiles are still absent.** `GOVERNING-10` screen four draws
  "Restaurant" and "Airport shuttle" and neither has a row in
  `public.amenities`. `lib/host/facilities.ts` has said so since it was
  written; adding them is a seed migration on a table the property side also
  reads, and it wants the same database this section could not reach.
- **The second migration and the second probe have not run.**
  `20260922190000_imgc_a_shortlet_is_not_a_hotel_room` is applied;
  `20260922200000_imgc_a_bedroom_is_not_a_bed` is not, and until it is, a
  shortlet host's bedroom count has nowhere to go. The interface writes the
  column and the read tolerates it being absent, so nothing breaks in the
  meantime, but the answer is dropped and that is not a state to leave running.
- **`database.types.ts` is not regenerated.** It is GENERATED from the live
  schema and neither new column nor the three new enum labels are in it yet, so
  `setShortletPlaceDraft` carries two narrow, commented casts and the room type
  read selects `*` for one column. **Hand-editing a generated types file would
  make the type system assert a schema that may not exist, which is the
  invisible kind of claim that caused the `beds` fault in the first place.**
  Both casts and the `*` come out the moment somebody regenerates against an
  estate where the two migrations have run.

### FILES, SO THE NEXT SCOPE COLLISION IS NOT MINE

Written: `apps/web/src/app/css/stays.css` (new, the stays stylesheet the
partition assigns to IMG-C), `apps/web/src/components/host/stays/*` (new),
`apps/web/src/components/host/{HostWizard,HostShell,FacilitiesPicker}.tsx`,
`apps/web/src/lib/host/{stays-setup.ts,stays-setup.test.ts,onboarding.ts,
schema.ts,actions.ts,queries.ts}` and their tests,
`apps/web/src/app/host/apply/page.tsx`,
`apps/web/src/app/(dev)/preview/imgc/*` (new, my own harness),
`apps/web/src/app/(dev)/preview/f5/host-wizard/page.tsx` (one fixture field),
the migration, the probe, and these proofs.

One line added to `apps/web/src/app/globals.css`, the `@import` for
`stays.css`, placed directly after `agent.css` because this file inherits that
file's `nf-host-*` register and must cascade after it.

**NOT TOUCHED:** `tokens.css`, `buttons.css`, `chips.css`, `glass.css`,
`light.css`, `chrome.css`, `controls.css`, `catalogue.css`, `agent.css`, and
`packages/i18n`. **No token or shared class needs changing for any of the
above**, which is the one good piece of news in this section: eight drawn
panels came out of the existing token layer with nothing retuned.

## 39. THE PARTITION GAINS TWO FILES, AND ONE DEBT IS NAMED FOR WHOEVER HOLDS `controls.css` NEXT

Section 24's table named an owner for every stylesheet anybody expected to
touch, and two were missing: `side-nav.css` and `admin.css`. CHROME took both,
because the drawer and the console were impossible otherwise, and said so
rather than letting them be discovered in a diff. They now have an owner in
the table.

**A table that only lists the files somebody thought of is a partition with
holes in it**, and the holes are exactly where collisions happen, because they
are the files nobody expects to be contended. The rule that follows: an agent
that has to take an unlisted file takes it, says so, and the table gains a
row. That is what happened here and it is the behaviour to keep.

### The debt, so it is not lost

Three rules live in `chrome.css` that belong in `controls.css`:
`.nf-switch-dock`, `.nf-tab__link--switch` and
`.nf-switch-standing[data-standing="active"]`. They were overridden from the
file CHROME owned rather than reaching into IMG-A's, which was the correct
call while that file was held and had uncommitted work in it. **Whoever holds
`controls.css` next folds them back**, and each carries a note saying so.

Also left deliberately: two `uiCommon.theme` keys and one `ThemeToggle`
variant are now unused. Removing a variant in another scope is a larger call
than the instruction covered, so they stand.

### The owed sweep is now staffed

The container ink change touches **341 references** across both themes and its
whole-harness visual sweep has never completed: two attempts died mid-run at
158 and 149 unopened routes, and both readings were correctly discarded,
because a reading off a dead server is not a reading.

It is now CHROME's, with three conditions that matter more than the sweep
itself: run the CONTRAST probe rather than the ratio sweep, because an edge
colour change risks ink and borders and the shape sweep measures corners; if
the server dies, restart from that route rather than discarding the run, since
a sweep completed in three segments beats one that never completes; and report
against the measured baseline of 150 failures, 51 dark and 99 light, so the
number means something.

---

## SECTION 26: IMG-A. GOVERNING-02, 03, 04 AND 05, BUILT TO WHAT THEY DRAW

**Gate:** a clean worktree at `origin/main` **`be2713e`**, "staff the founder's
eight, and write down who owns which file", with `node_modules` hard linked in.
Never the shared tree, which carried five other agents' uncommitted edits the
whole time this ran.

**Server:** `next build` on its own `NEXT_DIST_DIR=.next-imga`, exit 0, then
`next start -p 3197` with `VALLO_PREVIEW_HARNESS=1`. Never `next dev`. The dist
directory was deleted between builds, as the disk note asks.

### THE DEFECT, NAMED BEFORE IT IS CLOSED

The three forms and the chooser functioned, filed real rows and passed their
gates. They were not drawn to the renders, and the previous worker had already
put his finger on the biggest reason: **the images draw every field as a glass
CONTAINER carrying the field's name small and quiet INSIDE it, with the value
in an inset well beneath the name.** What shipped was `nf-label` on the page
over a bare `nf-field`, which is a perfectly ordinary form and is not the form
in `GOVERNING-03`, `04` or `05`.

Looking at the four images rather than reading about them turned up seven more.
All of them are below, with the image they come from.

### WHAT CHANGED, AND WHICH IMAGE ASKED FOR IT

| # | Change | The image | Where |
| --- | --- | --- | --- |
| 1 | `.nf-regfield`: the field is a container, its name inside along the top, the value in an inset well below | `03` all four, `04` 1 and 3, `05` 1, 2 and 3 | `controls.css`, `RegisterField.tsx` |
| 2 | `.nf-fieldgroup`: one glass panel around several fields, members dropping their own container | `04` screens 1 and 3 | `controls.css`, `AgentRegisterForm` |
| 3 | The well stopped being a black slab: part-strength inset over the container with a brand hairline, full strength on paper | `03` 1, `05` 1 | `controls.css` |
| 4 | "Optional" back in the container's top right corner, as a RECTANGLE | `05` screen 1 | `controls.css`, all three forms |
| 5 | The field note with its small round glyph under the well | `05` screen 1 | `controls.css`, `FirmRegisterForm` |
| 6 | The chooser's doors carry glass OBJECTS on a 56px plate, not flat outline marks on a 48px one | `02` screens 1 and 2 | `AddWorkspaceChooser`, `controls.css` |
| 7 | The chooser owns its top: bare back control, progress row, name in DISPLAY type | `02` all three | `AddWorkspaceChooser`, `/profile/setup` |
| 8 | The chosen door is plainly lit rather than a shade of the unchosen ones | `02` screen 2 | `controls.css` |
| 9 | The team row's avatar is round | `05` screen 3 | `controls.css`, `FirmRegisterForm` |
| 10 | The pin inside the office address well | `05` screen 1 | `FirmRegisterForm` |
| 11 | Placeholders in the wells, in all four locales | `04` 2, `05` 1 | `packages/i18n` |
| 12 | The field's small print set smaller than the field's name | `03` 2, `05` 1 | `controls.css` |

### THE SIDE BY SIDE. NO ROW, NO CLOSE.

Every shot below is `docs/design/proofs/imga/<name>-390-dark.png`,
`-390-light.png` and `-1536-dark.png`, 54 files, taken by
`scripts/design/proof-imga.mjs` walking the real components on the production
server: it fills each screen, presses the control a person would press, and
measures the drawn radius over the drawn short side in the browser.

| The surface | The image | Our shot, beside it | What matches, and what does not | Measured |
| --- | --- | --- | --- | --- |
| Add a workspace, the three doors | `GOVERNING-02` screen 1 | `imga/chooser-1-doors` | MATCHES: the bare back control, the progress row of three, "Add a workspace" in display type, the supporting line, three glass objects on lit plates, the chevrons, no primary until a door is chosen. DOES NOT: the render's city photograph along the bottom is not shipped, because it is decoration with no data behind it; and the three objects are the glass library's outline family, which is lighter than the render's solid neon | door 14 on 123 = 0.114, plate 14 on 56 = 0.250, step bar 6 on 28 with no text |
| Owner selected, one lit control | `GOVERNING-02` screen 2 | `imga/chooser-2-owner-selected` | MATCHES: one card lit with the brand fill, the rim and the glow, the tick badge replacing the chevron, the single lit primary arriving underneath with its chevron. DOES NOT: the render's button reads "Continue as an owner" and ours reads "Continue", because a per-door label is 24 new strings in three languages I would be inventing | lit door 0.114, primary 14 on 60 = 0.232 |
| What we will ask you for | `GOVERNING-02` screen 3 | `imga/chooser-3-overview` | MATCHES: the heading in display type, four rows each a container with a glass object on a plate, and the timing below with its small round glyph. DOES NOT: the render splits each row into a bold title and a description and ours carries one sentence, because the four `needs` strings are already written as sentences in four languages and splitting them is a restructure | calm row 14 on 106 = 0.132, panel 0.138, glyph round and text-free |
| Owner, About you | `GOVERNING-03` screen 1 | `imga/owner-1-about-you`, `-filled` | MATCHES: the form's name beside the back square, the progress row, "About you" in display, three fields each a container with its name inside and the value in a well, the calm panel with its round glyph, the lit Continue with its chevron. DOES NOT: the required asterisk is ours and the render has none, and it stays, because it is the visible half of `aria-required` | container 14 on 102 = 0.137, well 14 on 48 = 0.292, "Optional" 6 on 24 = 0.250 |
| Owner, Where do you own | `GOVERNING-03` screen 2 | `imga/owner-2-where` | MATCHES: the three containers with their names inside, the chevron in each well, the area field carrying its corner tag. DOES NOT: no map and no draggable pin, for the two reasons the component states in full (no tile key on this platform, and the exact building belongs to a property that does not exist yet) | container 14 on 117 = 0.120, well 14 on 59 = 0.238 |
| Owner, Proof of ownership | `GOVERNING-03` screen 3 | `imga/owner-3-proof` | MATCHES: six rows, one plate and one ring each, "I have none of these" set apart below the five, the calm panel appearing on that answer alone. DOES NOT: the render groups the five into one bordered list with hairlines between and ours draws five rows with a gap | row 14 on 56 = 0.250, ring round and text-free |
| Owner, set up | `GOVERNING-03` screen 4 | `imga/owner-4-done` | MATCHES: the object on its pool of light, the heading, one line, the panel of three, the timing label, the two controls. DOES NOT: the render says "You are set up" and "Your details are verified"; nobody has looked at the application yet, so ours says what is true | timing 14 on 44 = 0.318, tick plate 6 on 24 = 0.250 |
| Agent, About you | `GOVERNING-04` screen 1 | `imga/agent-1-about-you` | MATCHES: the three questions inside ONE glass panel, each with its name over its own well, the calm panel below it, the lit Continue | panel 22 on 319 = 0.069, well 0.292 |
| Agent, Prove who you are | `GOVERNING-04` screen 2 | `imga/agent-2-identity` | MATCHES: two tall upload cards with a solid glass object each, the NIN field as a container with its corner tag and its placeholder | card 14 on 123 = 0.114, container 14 on 128 = 0.110 |
| Agent, Your fees in the open | `GOVERNING-04` screen 3 | `imga/agent-3-fees` | MATCHES: both fees inside one panel, minus and plus as square plates around the reading, the lit total panel below. DOES NOT: the render's fees read 10 and 5 per cent and the total is a figure; ours open NOT DECLARED with the minus disabled, and an undeclared part is drawn as words rather than a nought | group 0.069, stepper 14 on 58 = 0.241, step plate 14 on 48 = 0.292, total panel 22 on 323 = 0.068 |
| Agent, submitted | `GOVERNING-04` screen 4 | `imga/agent-4-done` | MATCHES: the object, the heading, the three lines, "Usually two working days" as a rectangle | 14 on 44 = 0.318 |
| Firm, Your firm | `GOVERNING-05` screen 1 | `imga/firm-1-your-firm` | MATCHES: the glass building under the supporting line, five containers each with its name inside and a well below, the placeholders, the pin inside the office address, "Optional" in the LASRERA container's corner, the note with its small round glyph. DOES NOT: there is no "e.g. LASRERA/ABJ/1234". That register was unreachable from this build and an invented reference is this platform asserting a format it has never seen | container 0.137, well 0.292, tag 0.250, note glyph round and text-free |
| Firm, Prove you work here | `GOVERNING-05` screen 2 | `imga/firm-2-association`, `-principal` | MATCHES: two tall choice cards, a solid glass object on each plate, the chosen route lit, only the chosen route's field appearing. DOES NOT: the render draws a chevron on each card and ours draws a selection ring, because these are radios and not links | card 14 on 170 = 0.082, ring round and text-free |
| Firm, Your team | `GOVERNING-05` screen 3 | `imga/firm-3-team`, `-one` | MATCHES: a row per person with a ROUND avatar plate, the two draft fields as containers, the calm panel. DOES NOT: no "Verified" chip, because nobody has checked a declared colleague; and no photograph, because nobody has uploaded one | avatar round (the law's own exception), container 0.137 |
| Firm, under review | `GOVERNING-05` screen 4 | `imga/firm-4-under-review` | MATCHES: the object, the heading, the panel of three, "Usually three working days" as a rectangle | 14 on 44 = 0.318 |

### THE SWEEPS

`compare-surface.mjs --shape-sweep --theme both` over all seven routes at 390
and 1536, and the walk's own sweep on eighteen screens at three sizes:

**0 breaches at or above 0.5 on a text bearing control. 0 over 0.35. 0 round
icon-only controls.** `--twin-sweep` on the four routes: **0 sets mixing
twinned and untwinned artwork.**

Round and carrying no text, which the law's own list puts outside its reach:
the calm panel's glyph, the choice ring, the field note's glyph, and the team
avatar, which is the reference set's standing exception written down in its own
translation rules.

### THE ONE I FOUND, GOT WRONG, AND REVERSED IN THE SAME STINT

The glass library has TWO axes and I first treated them as one. 23 objects ship
a light twin and the rest do not, which shows on paper only. Separately, a few
objects are flat outlines while the rest are solid three dimensional glass,
which shows in BOTH themes at every size.

The agent's identity cards were `id-card-check` (solid, twinned) over
`user-check` (solid, untwinned), so I swapped the first for `person-card` to
make the pair agree about paper. `person-card` is the FLAT family. The
photograph showed a thin outline card sitting above a solid glass person: I had
traded a paper-only fault for a both-themes one. It is back to `id-card-check`,
and the note beside it says why, so nobody re-derives it.

**What that leaves for whoever owns the artwork:** `user-check`, `doc-shield`
and `wallet-naira` have no light twin and now stand beside `id-card-check`,
which has one. That is a commissioning job and not a code change.

### FOUND, NOT FIXED, AND IT IS NOT SMALL

**`text-[var(--nf-text-caption)]` EMITS NO FONT SIZE.** Tailwind v4 reads
`text-[<value>]` as ambiguous between a size and a colour and a bare `var()` is
taken as the colour, so the utility produces nothing. The class is absent from
the compiled stylesheet, which was checked on the built chunks, and every
caption written that way silently inherits the 16px that `body` sets in
`base.css`.

Measured in the browser on this server, on the owner form's second screen: the
field's name computes to **13px** and its own hint to **16px**, so the small
print was arriving LARGER than the thing it explains.

`components/ui/Field.tsx` and `components/app/place/ChoicePicker.tsx` both use
the pattern, and so does most of the platform's caption copy. It is closed
inside `.nf-regfield` by a rule in `controls.css`. Everywhere else it is live,
and the repair is a platform-wide sweep across files this stint does not own.

### TWO THINGS I DID NOT SHIP, SAID PLAINLY

1. **"Continue as an owner".** `GOVERNING-02` screen 2 labels its primary with
   the chosen door. A per-door label is six strings in four languages, and the
   Hausa, Igbo and Yoruba would be mine rather than written to match each
   file's vocabulary. It ships as "Continue" with the chevron.
2. **The overview rows' bold title and description.** `GOVERNING-02` screen 3
   splits each row in two. The `needs` strings are already written as full
   sentences in four languages and splitting them is a restructure, which the
   i18n rule forbids outright.

### ONE THING THAT IS NOT MINE TO CHANGE

`ChoicePicker` draws its trigger's chevron as `chevron-down` rotated, so it
points sideways; `GOVERNING-03` screen 2 draws it pointing DOWN on the State
and Local Government fields. The file is `components/app/place/ChoicePicker.tsx`
and it is outside this stint's scope, so it is reported rather than edited.

### THE FILES

`apps/web/src/app/css/controls.css` (mine this stint; it also carries C2's
uncommitted light-theme fix for `.nf-calmpanel__glyph`, which was sitting in the
shared tree in a file I own and is committed here rather than dropped),
`components/supply/{RegisterField,AddWorkspaceChooser,OwnerRegisterForm,AgentRegisterForm,FirmRegisterForm}.tsx`,
`app/(app)/profile/setup/page.tsx`, the new
`app/(dev)/preview/b1b/chooser/page.tsx`, `scripts/design/proof-imga.mjs`, and
three added keys per locale in `packages/i18n`, inside the existing `supply`
namespace, in all four. Nothing restructured, nothing English pasted into a
Nigerian language.

`RegisterShell.tsx` and `UploadCard.tsx` are NOT in the commit. A prettier run
reflowed them at the default 80 columns when the repo is prettier at 100; the
reflow was reverted and the four files that did change are formatted at 100 so
they match the tree around them.

## 40. RUNNING THE PROBE CAUGHT A SHIPPING DEFECT THAT THE PROBE ITSELF BELIEVED WAS IMPOSSIBLE

IMG-C's enum migration and its probe had never run, because that agent was
reaching the same inactive project that blocked the sale probe. I applied both
against `uccixoonmbhrnyczyigt`.

**The migration applied and is verified:** `room_category` now reads
`entire_flat, whole_house, private_room, single, double, twin, suite, family,
dorm`. Nine labels, the three new ones at the head in the intended order, the
six old ones intact.

**Then the probe failed, and it failed on something real.**

```
ERROR: 23514 new row for relation "room_types" violates check constraint
"room_types_beds_check"
```

`room_types_beds_check` is `CHECK (jsonb_typeof(beds) = 'array')`. **The
`beds` column must hold an ARRAY.** Every live row holds one:
`[{"kind": "queen", "count": 1}]`.

### The defect this exposes is in the product, not in the probe

`lib/host/actions.ts:1148` writes:

```ts
beds: { bedrooms: data.bedrooms, beds: data.beds }
```

An OBJECT. **So `GOVERNING-11`'s "Your place" screen cannot save.** Not
because a migration is missing, which is the failure the screen was written to
explain, but because the database refuses the shape. The first real shortlet
host would have met a check constraint violation on submit.

**And the belief that caused it is written down in the code.**
`lib/host/queries.ts:41` says "`room_types.beds` has no shape constraint".
That sentence is false, and everything above it was built on it: the probe's
own comment repeats it almost word for word, asserting the round trip
*because* the column supposedly accepts anything. **The probe was written to
test a claim it had inherited rather than checked**, which is why it asserted
the wrong shape confidently.

That is the day's pattern one more time. A comment asserting an absence is
exactly as unverified as a test asserting a presence, and this one propagated
from a file, into a probe, into a screen.

### Why this was worth the run

IMG-C's own caveat was that the screen "draws correctly and does not save
until that migration is applied". The migration is applied now. **It still
does not save.** Nothing short of running the probe against a real database
would have found that, and the agent could not run it. A probe that never
executes is a plan, not a proof.

### What the fix needs, and it is a decision rather than a patch

`bedrooms` is not a bed. The established array carries what is slept in, one
entry per bed kind with a count. A shortlet's bedroom count is a different
fact about the property and has nowhere honest to live in that array, so the
choices are a column of its own or a deliberate widening of what `beds`
means. Routed back to the author, who has the screens and the tests.

## 41. THE WHOLE PRODUCT'S SMALL PRINT IS RENDERING AT BODY SIZE, ON 924 ELEMENTS

IMG-A found it in one component. **I compiled it to check, and it is
everywhere.**

### The proof, run rather than reasoned

Tailwind v4.3.3, both spellings compiled from the same probe:

```
.text-\[var\(--nf-text-caption\)\]          { color: var(--nf-text-caption); }
.text-\[length\:var\(--nf-text-caption\)\]  { font-size: var(--nf-text-caption); }
```

`text-[var(--x)]` is read as a **COLOUR**. It emits no font-size at all, and
it emits a `color` declaration whose value is a LENGTH, which is not a valid
colour, so that is discarded too. The element gets neither. It inherits the
16px `base.css` sets on `body`.

### The count

```
924  text-[var(--nf-text-*)]  across apps/web/src
     287  overline
     280  body-sm
     246  caption
      50  body-lg
      50  body
      11  h4, 3 h3/h2
```

**That is the entire small-print vocabulary of this product, and all of it is
drawing at body size.** A field's name at 13px with its own hint at 16px,
measured in the browser, means the small print explaining a thing is LARGER
than the thing. Overlines, captions and secondary text across 924 elements are
all the same size as body copy.

### Why nobody saw it, which is the same reason as everything else today

It fails silently and it fails CONSISTENTLY. Nothing is misaligned, nothing
overflows, no test goes red, and every screen is wrong in the same direction
at once, so there is no odd one out to notice. The class name reads correctly
in the source: somebody scanning `text-[var(--nf-text-caption)]` sees a
caption size being applied, and the source is the only place that is true.

**It also explains a complaint nobody could pin down.** The founder has said
repeatedly that the product reads as inconsistent and unprofessional next to
the renders. A type scale of twelve rungs that resolves to one rung on 924
elements is exactly what that looks like.

### The fix is mechanical and the risk is not

`text-[length:var(--x)]` is the correct spelling and it is a find and replace.
But it is a find and replace that will CHANGE THE RENDERED SIZE OF MOST TEXT
ON MOST SCREENS, from 16px to whatever the token actually says, which is the
point and is also a large visual change to make in one commit. It is staffed
with the requirement to measure before and after on real screens rather than
land it blind.

## 25. IMG-B: THE LISTING WIZARD, DRAWN TO GOVERNING-06, -07 AND -08

**Gate: a clean worktree at `origin/main`, hard linked `node_modules`, built
with `next build` into its own `NEXT_DIST_DIR` and served with `next start`.
The first gate was taken at `be2713e`. The branch moved under me twice while I
worked, so the proofs below were re-taken at `29f23c9`, which is the commit
that carries this work. No proof in this section came off `next dev` and none
came off the shared tree.**

### What was wrong, said plainly

The wizard worked. It collected the property, the location, the light, the
water, the amenities, the photographs, the walkthrough and the money, and it
saved every one of them. What it did not do was look like the three images
that govern it, and the gap was not a matter of polish: **it was missing the
anatomy the roles README calls the register.** No back chevron beside a row of
rectangles. No display title with a sentence under it. No glass object in a
header. No calm explanatory panel anywhere, on a flow whose reference set
draws one on almost every screen. Option cards with no object, no lit rim and
no tick. Amenities as wrapping chips. Photographs in a two column list with a
"Make cover" text button under each one.

And one screen of the twelve **existed nowhere at all**: GOVERNING-08 screen
two, "What will a tenant actually pay?", on the agent's own side.

### The twelve, closed one by one

Every row names the shot and the render. Shots are at
`docs/design/proofs/imgb/`, three per panel: 390 dark, 390 light, 1536 dark.
The renders are at `docs/design/references/roles/`.

| Render | Screen | Our shot | Verdict |
| --- | --- | --- | --- |
| 06 | 1, what are you listing | `06-1-390-dark.jpg` | Closed. Three across, centred object over one word, lit rim at rest, round tick on the chosen one. The blurb moved to the calm panel below the grid. |
| 06 | 2, where is it | `06-2-390-dark.jpg` | Closed on the fields and the head. **The map is not drawn.** See "not closed" below. |
| 06 | 3, the rooms | `06-3-390-dark.jpg` | Closed. Fact rows with the object on its plate, the question under the name, the stepper on the right, the Optional mark on Size as a rounded rectangle. |
| 06 | 4, condition | `06-4-390-dark.jpg` | Closed, and it could not have been before: build condition was asked only of a sale. See below. |
| 07 | 1, light | `07-1-390-dark.jpg` | Closed on the grids, the stepper and the switch. **No lightbulb object exists**, so the header carries none. |
| 07 | 2, water | `07-1-390-dark.jpg` | Closed on the same step. **No water drop object exists.** |
| 07 | 3, amenities | `07-3-390-dark.jpg` | Closed. Twelve tiles, three across, glyph over word, tick when on. |
| 07 | 4, photos and walkthrough | `07-4-390-dark.jpg`, `07-4-390-light.jpg` | Closed on the grid. The drag grip is two real move controls instead. |
| 08 | 1, the price | `08-1-390-dark.jpg` | Closed. |
| 08 | 2, what a tenant pays | `08-2-390-dark.jpg` | Closed, and it is the row worth looking at. |
| 08 | 3, check it over | `08-3-390-dark.jpg` | Closed. The details table with Edit on every row. |
| 08 | 4, sent for review | `08-4-390-dark.jpg` | Closed on the anatomy. **There is no code in the ID box and there cannot be.** |

### The one picture that proves the founder's rule

`08-2-390-dark.jpg` holds all three cases of the honesty rule in one frame,
which is why the preview fixture was written to produce them rather than to
look tidy:

| Line | Drawn as | Why |
| --- | --- | --- |
| Rent (yearly) | `₦2,500,000`, "Paid to the landlord" | Declared |
| **Agency fee** | **"No agency fee" in the success ink, and no keeper line** | A DECLARED ZERO. A different fact from silence, and the argument of the whole handoff in one line. |
| Legal fee | **"Not declared"**, muted, no figure | Undeclared. Still listed, because the tenant meets it either way. |
| Agreement fee | **"Not declared"**, muted, no figure | Undeclared. |
| Caution deposit (refundable) | `₦2,500,000` | Declared |
| Service charge (monthly) | `₦150,000`, "Paid to the estate" | Declared |
| **Move in from** | **`₦5,150,000`** | The sum of the DECLARED lines only. The two silences contribute nothing, and the label is "from" because no total was stated. |

**It shares the model rather than mirroring it.** `moveInLines` now takes a
narrow `MoveInFacts` instead of a whole `Listing`, which `Listing` satisfies,
so no existing caller changed and the wizard did not need a second
implementation of the declared / undeclared / declared-zero distinction. That
file exists precisely so the distinction lives in one place, and a copy of it
in the wizard would have been the defect it was written to prevent.

### A money bug this found, which nothing else would have

Drawing the breakdown under the boxes that feed it put two numbers on one
screen that disagreed. The block totalled `₦5,150,000`; the hint two inches
above it said "leave blank and we show ₦5,000,000". The gap was exactly the
service charge.

`moveInParts` in `lib/listings/pricing.ts` is the canonical list and has
always counted the service charge, so **the listing page a searcher reads
counted it and the agent's own floor did not.** The lister was pricing against
a number lower than the one their tenant would be shown. Fixed in the
wizard's local `feeParts`; `pricing.ts` was already right and was not touched.

Nothing else would have caught it, because it is not a type error, not a shape
breach and not a contrast failure. It needed the two figures drawn on one
screen.

### Build condition was asked only of a sale

GOVERNING-06 screen four draws the four conditions as cards. In the wizard the
only control that wrote `condition` lived inside the for-sale branch, so the
column was **null on every rental ever listed**. It is a fact about the
BUILDING, not about the transaction: "newly built" against "older build" is
the difference between a flat somebody moves into and one they renovate, and a
tenant asks it as often as a buyer. The cards are on the property step now,
where every listing passes. The availability half of that render stays with
the tenancy terms, where the date sits beside the shortest tenancy it has to
agree with.

### The shape law, measured rather than asserted

`compare-surface.mjs --shape-sweep --theme both`, seven wizard routes, 390 and
1536, dark and light:

```
no text-bearing control is a capsule.
```

The only round controls the sweep finds in this scope are 24 instances of
`nf-lw-back`, the back chevron, at 44x44 on a 22px radius. A bare icon-only
control drawn round in a governing image is the standing exception in the
roles README, and every one of the three renders draws it round.

Every capsule the renders draw ships as a rounded rectangle: the Optional
mark, the Cover mark on a photograph, and the step segments, which are 10px
tall on a 3px radius for a ratio of 0.3. `--nf-radius-xs` is 6px and would
clamp to a half-height arc at that size, which is a capsule however it is
spelled, so the radius is derived from the token rather than taken from it.

### Two things the check caught that I had got wrong

1. **`check-css-tokens.mjs` called `.nf-lw-choice` and `.nf-lw-tile` dull
   controls**, because both rested on `--nf-border-subtle`. It was right, and
   so is the render: every unchosen property type, build condition, power band
   and water source in 06 and 07 carries a lit blue rim. They rest on
   `--nf-brand-edge` with `--nf-glow-edge` now, and go one rung up when chosen.
2. **The first capture drew every tick as a solid blue blob.** `verified-badge`
   is already a filled disc in `currentColor` with the tick knocked out in
   `--nf-content-on-brand`, so a brand disc behind it and on-brand ink in front
   of it is a white tick on a white disc. The glyph IS the badge. The same
   mistake was on the sent-for-review screen twice over, where `home-check`
   already carries a tick of its own; that second badge is gone.

### NOT CLOSED, AND SAID PLAINLY

- **The map on 06 screen two is not built.** The render draws a dark map card
  with roads, four place labels, a glowing pin on an elliptical plinth and a
  "Drag the pin to the building" strip. The wizard collects the location as
  text and has no map on this step at all. `map.css` and the tiles provider
  exist; wiring a draggable pin into the wizard and storing a coordinate is a
  piece of work with a database column behind it, not a styling pass, and I
  did not start it rather than half start it. **The fields, the head and the
  panel on that screen are drawn; the map is absent.**
- **Two glass objects do not exist and the headers carry none.** GOVERNING-07
  heads Light with a lightbulb and Water with a droplet. The 144-object pack
  has neither, and the nearest candidates mean something else in this product.
  This codebase already ruled that a glyph meaning the wrong thing is worse
  than no glyph, because the reader does not know they have misread it. **For
  the artwork list: one lightbulb on its plinth, one water drop on its
  plinth**, at the size the other header objects are cut to.
- **The listing ID box on 08 screen four holds no code, and cannot.** The
  `VL-` code is minted by trigger at PUBLISH and never at draft, because a code
  is a public handle and a listing in review has no public existence. Rule 15
  forbids printing a figure the database cannot produce. The panel keeps the
  render's anatomy, its heading and its sentence, and says the true thing in
  the place the code will occupy. `listingReference.copy` and `.copied` remain
  written and undrawn: they are the Copy control for the "your listing is
  live" surface, which nobody has built.
- **The wizard is eight steps and the renders draw twelve screens.** I did not
  re-cut the flow. The founder's list is container anatomy, radii, glow, glass,
  lit rims, icon style, spacing, type weights, progress rows and calm panels,
  which are properties of surfaces rather than a step count, and re-cutting an
  eight step form with a server-side submit gate and device-local draft
  recovery is a different job from drawing it. The mapping is in the table
  above and every one of the twelve screens has a shot.
- **The Hausa, Igbo and Yoruba need a speaker.** The new copy carries a NATIVE
  REVIEW note in each file. None of it is a re-translation of shipped words:
  English had none of this copy either until today, so the risk is a clumsy
  new sentence rather than a regression, and a key removed falls back to
  English.

### A REPORTED DEFECT THAT DID NOT REPRODUCE, AND THE INSTRUMENT IS WHY

I was routed `.nf-movein__label` on `/preview/f3/listing` at **1.03:1 in light
mode, white on white**, in `catalogue.css`, which is mine. It does not
reproduce, and the disagreement is instrument against instrument rather than
opinion against measurement.

`probe-contrast.mjs` takes ONE `fullPage: true` screenshot and then maps each
element with `getBoundingClientRect() + window.scrollY` against it. I measured
the same class the same way arithmetically, but off a VIEWPORT screenshot with
the element scrolled to centre, so nothing fixed or viewport-sized can be
painted over the coordinates:

```
light  Rent (yearly)                  ink rgb(22,24,29) on rgb(255,255,255) = 17.76:1
light  Agency fee                     ink rgb(22,24,29) on rgb(255,255,255) = 17.76:1
light  Legal fee                      ink rgb(22,24,29) on rgb(255,255,255) = 17.76:1
light  Agreement fee                  ink rgb(22,24,29) on rgb(255,255,255) = 17.76:1
light  Caution deposit (refundable)   ink rgb(22,24,29) on rgb(255,255,255) = 17.76:1
light  Service charge                 ink rgb(22,24,29) on rgb(255,255,255) = 17.76:1
```

All twelve labels on the route, every one at 17.76:1. The computed style
agrees: `--nf-content-primary` resolves to `#16181d` on that element and the
row paints `rgb(255,255,255)` under it.

The reported ink, `rgb(252,252,252)`, **does not occur anywhere in the
element's real box**, whose second and third colours are the antialiasing
fringe `rgb(104,111,119)`. That is the signature of a rectangle read over
blank page rather than over the glyphs. `/preview/f3/listing` carries a fixed
sticky bar, and a `fullPage` capture in Chromium resizes the viewport and
relayouts the page, so rects measured after the shot need not describe the
pixels in it.

**I changed no CSS.** Acting on that reading would have darkened ink that is
already at 17.76:1 on a route whose light theme is correct. The probe is
otherwise the right tool and it found a real 1.00:1 on the settings avatar;
this is a third harness lie in the same family as the one the sweep register
already records, and it belongs to whoever owns that script. Two suggestions
for them: shoot the viewport with the element scrolled into view, or assert
that the sampled rectangle's histogram contains the element's own computed
`color` before reporting a ratio from it.

### What I did not do and should be said

- I did not touch `tokens.css`, `buttons.css`, `chips.css`, `glass.css`,
  `light.css`, `chrome.css` or `controls.css`. `catalogue.css` is the only
  stylesheet in this work.
- I did not touch `Progress.tsx`. `SegmentedProgress` still draws
  `--nf-radius-pill` segments for its other callers; the wizard stopped using
  it and draws the rail in `catalogue.css`, keeping the same ARIA contract.
  **Somebody who owns that component should decide whether its segments are
  capsules everywhere else too.**
- **I ran `git stash` once, by accident, in my own gate worktree.** It is on
  the stop list. I caught it in the next command and popped it; nothing was
  lost and the shared tree was never touched. Recording it because the rule is
  not "no harm done", it is "do not run it".
- Two eslint warnings remain in `ListingWizard.tsx`, both in code I did not
  write: a `setState` inside the draft-restore effect and a missing `locale`
  dependency on the save callback. **No lint rule was disabled.** The file has
  zero errors, `tsc --noEmit` is clean and `check-css-tokens.mjs` reports no
  dull control and no unresolved reference from `catalogue.css`.

## 42. PRODUCTION HAS NOT DEPLOYED SINCE 16:23, AND VERCEL SAID WHY IN A FIELD NOBODY READ

The 17:05 run was refused with the new verdict `no-bearer`: Vercel injected
nothing, although `CRON_SECRET` now exists and is correctly spelled. That
pointed at the deployment rather than the variable, so I read the deployments.

**The last four production deployments are `state: ERROR`.** The newest READY
one was built at 16:23, and `CRON_SECRET` was created at 16:25. The site has
been serving a build that predates the variable, which is precisely why no
bearer is injected.

**And the build is failing because of that same variable.** From Vercel's own
deployment record:

```
errorCode:    INVALID_CRON_SECRET
errorMessage: The `CRON_SECRET` environment variable contains leading or
              trailing whitespace, which is not allowed in HTTP header values.
errorStep:    buildStep
```

### Two lessons, and the first one is about me

**I WITHDREW THE RIGHT DIAGNOSIS.** At 16:19 I said a pasted newline was making
the values differ. When the misspelt `CRONS_SECRET` turned up I marked that
reading "not proven, and not what is refusing these requests" and moved on.
The name WAS a real fault. So was the whitespace. **They were two independent
faults on the same afternoon, and finding one made me stop looking for the
other.** A correct diagnosis that does not explain everything is not a wrong
diagnosis; it is an incomplete one, and the difference matters.

I also could not have proven it from here: the Vercel API will not return a
sensitive value, so the whitespace was invisible to every check I ran. **Vercel
could see it and had written it down.** I read the deployment list four times
today for timestamps and never read `errorCode` on a failed row.

**The build gate this session trusts has a hole in exactly this shape.** Every
agent gates with `next build` in a worktree, and that build passed at this
commit: I ran it to check. A local build cannot fail on `INVALID_CRON_SECRET`
because the variable is not there to be invalid. **A green local build is not
a green deployment**, and nothing in this build was watching the deployment.

### What it means for today's work

Everything landed since 16:25 is on main and is NOT live: the dock and drawer,
the four registration images, the stays panels, the container ink, the cron
verdict field itself. Main being green and production being current are two
different claims, and this session has been reporting the first while implying
the second.

## 43. A DEFAULT ON A DIAGNOSTIC IS A LIE GENERATOR, AND MINE LIED WITHIN THE HOUR

**Commit b993d47. Gate: worktree at c80b650, hardlinked node_modules, tsc 0,
eslint 0, 45 tests in `lib/cron`.**

`refusalAlert` was given a `verdict` parameter this morning for one stated
reason: a 401 from the cron door was one undifferentiated event, three
genuinely different faults arrive wearing it, and three wrong diagnoses had
already been offered because nothing carried the distinction. The parameter was
written as `verdict: CronAuthVerdict = "secret-mismatch"`.

`/api/paystack/reconcile` calls `refusalAlert` without a verdict. So at 17:10
the desk recorded `"reason":"secret-mismatch"` for a request that had presented
**no bearer at all**. The field built that morning to end three wrong diagnoses
produced a fourth before the day was out, and it read exactly like a
measurement because every other field standing beside it in that object is one.

**I then reported that fabricated value to the founder as a finding.** My claim
that "the two values genuinely differ" rested on it. It is withdrawn. The
reconcile route now calls `cronAuthVerdict(request)` and passes what it
measured, and the parameter has no default, so the compiler refuses a caller
that will not say.

### The test I first wrote for this was the same fault a third time

The first version of the guard read `run.ts` as text and grepped it for
`verdict: CronAuthVerdict =`. That was written roughly an hour after the
founder named source-reading assertions as the most serious finding of the day.
It would have passed against a default spelled across two lines, against one
moved into a wrapper, and against a file that had been deleted.

It is now a `@ts-expect-error` on a call with the argument missing, so the
thing that observes the rule is the compiler. **And the guard was proved able
to fail rather than assumed to be:** putting the default back in the gate
worktree makes `tsc` exit 2 with `src/lib/cron/run.test.ts(137,5): error
TS2578: Unused '@ts-expect-error' directive`. A guard nobody has ever seen fail
is indistinguishable from a guard that cannot.

### Counting the day's blind lights

Four now, all the same shape, all found in one day: the pg_cron job that
reported success for firing a request it never read; the harness test that
passed by reading source instead of behaviour; `verify-shots.mjs`, which never
checked where the browser landed; and this default, which answered a question
it had not asked. The fourth was mine, written after the sweep was named.

---

## 44. THE VERCEL BUILD, AND WHY IT COULD NOT BE TRIMMED

**Every production deployment from 16:25 to 17:44 was ERROR. Not one of them
was the code.**

The measurement that settled it: Vercel builds the branch and main from the
same commit, seconds apart. Six consecutive pairs, six identical SHAs, and in
every pair the branch preview was `READY` and the production build was `ERROR`.
A fault that tracks the deployment target and never the commit is not in the
repository.

`get_deployment` carries the reason in two fields that no summary view shows:

```
errorCode:    INVALID_CRON_SECRET
errorMessage: The `CRON_SECRET` environment variable contains leading or
              trailing whitespace, which is not allowed in HTTP header values.
errorStep:    buildStep
```

### Why it was a rotation and not a trim

`CRON_SECRET` is a Vercel **`sensitive`** variable. The API returns an empty
string for its value even when asked to decrypt: it is write only, by design.
Nothing can read it in order to strip the whitespace off it, so the only way to
clear the whitespace is to write a new value, and a new value on one holder
means a new value on all three.

The three holders, all now carrying one value with no whitespace at either end:

| Holder | Who presents or reads it |
|---|---|
| Vercel `CRON_SECRET` (production) | what Vercel Cron puts in the Authorization header |
| Vercel `RECONCILE_CRON_SECRET` (production, preview) | what our own door compares |
| Vault `vallo_reconcile_secret` | what `private.request_money_reconciliation` presents through pg_net |

**Whitespace could never have broken our own door.** `bearerMatches` trims both
sides and so does `cronAuthVerdict`, and the comments above them say why. It
broke *Vercel's build*, which reads a header value more strictly than we do and
is right to. The cost was therefore never a refused job. The cost was that
**nothing deployed at all for the better part of a day** while every gate in
this session went on reporting green, because main being green and production
being current are two different claims.

### Two guards on the rotation itself

1. **The Vault write reads itself back.** The migration fails unless
   `vault.decrypted_secrets` now holds exactly what was written, with no
   whitespace at either end. The first draft asserted a length of 50 against a
   59 character value and correctly refused its own write, which is the entire
   argument for having the guard.
2. **The literal was redacted from the migration history.** `apply_migration`
   records its SQL in `supabase_migrations.schema_migrations`, so writing a
   Vault secret through a migration puts that secret in a plain table. A second
   migration replaces the statement text with a note and then fails unless the
   literal is gone from **every** recorded statement, not merely from the row
   it meant to edit. A secret in the migration history is not in the Vault.

### 44.1 Proved end to end, not declared

**The deployment.** `b993d47` built `READY` at 17:36 and carries the aliases
`www.vallospaces.com` and `vallospaces.com`. Production is current for the
first time since 16:23. I could not fetch the site from this box to confirm it
renders: the environment's network policy answers 403 to that host, which is a
wall around the build box and not a fact about the site, and it is recorded
here rather than glossed, because the previous line of this ledger is about
exactly that distinction.

**The job.** The database can reach the site even though this box cannot, so
the proof was taken there instead, which is the better place for it anyway.
`private.request_money_reconciliation()` was fired once by hand against the new
deployment and the reply read out of `net._http_response`:

```
status_code: 200
{"ok":true,"apply":true,
 "window":{"from":"2026-09-20T17:37:38.208Z","to":"2026-09-22T17:37:38.208Z","hours":48},
 "charges":{"seen":0,"ours":0,"unavailable":false,"reason":"clean","recoveredMinor":0,"gaps":[]},
 "holds":{"examined":0,"releasedMinor":0,"unavailable":false,"resolutions":[]},
 "overdrawn":[],"needsAttention":false}
```

**This is the answer to "does it reconcile or does it merely return 200".** It
reconciled. `unavailable: false` on both charges and holds is the field that
settles it: the route reached Paystack and read it, over a real 48 hour window
it computed for itself. It found nothing to correct because this platform has
taken no money yet, which is a different sentence from finding nothing because
it looked at nothing. First successful run since 29 August.

**And the function's own memory told the truth about the run before it.**
`last_verdict` reads `failed_401`, which is the 17:10 refusal correctly
recorded, and it raised the high severity alert it is meant to raise for one.
The memory was added this morning precisely so a job could not report success
for firing a request nobody read; the first time it had something to say, it
said the right thing.

## 45. CHROME: THE WHOLE-HARNESS CONTRAST SWEEP, AND THE INSTRUMENT IT BROKE

The sweep the edge change was owed. It COMPLETED, which is the first thing
anybody needed, and what it found is not what it was sent to look for.

**Gate: a clean hard-linked worktree at `716d964`**, `next build` exit 0,
`next start` on port 3220 with `VALLO_PREVIEW_HARNESS=1`. 106 harness routes,
both themes, 390x844, 212 route/theme pairs. **Zero server deaths and zero
discarded segments.**

### WHY THIS ONE COMPLETED AND THE LAST TWO DID NOT

The probe was never the problem. One long run has one point of failure and no
memory, so a server that dies at route 40 loses the other 66 and the whole
reading is correctly thrown away. This drove `probe-contrast.mjs` in segments
of six, one theme at a time, wrote each segment's JSON to disk as it landed,
and health-checked the server between segments.

**And it separates transport failures from real ones**, which is the part that
mattered. The probe catches its own navigation errors and still writes valid
JSON, so a segment that ran entirely against a corpse comes back looking like a
clean result with six "routes that did not open" in it. **That is exactly how a
sweep reports 149 unopened routes.** Segments carrying `ERR_CONNECTION_REFUSED`
are now restarted and retried rather than recorded. My first attempt lost four
routes that way before the retry existed; the completed runs needed it zero
times, because nothing killed the server again. The likely killer of the two
earlier attempts is mundane: several of us run `pkill -f next-server` on this
box, and it does not care whose server it is.

### THE HEADLINE NUMBER, AND WHY IT IS NOT A VERDICT

| run | below the floor | leaves | routes that did not open |
| --- | --- | --- | --- |
| baseline, earlier today | 150 (dark 51, light 99) | 7,467 | 98 routes |
| **this sweep at `716d964`** | **164 (dark 53, light 111)** | **7,897** | 3 |
| the same sweep, repeated as a control | 153 (dark 53, light 100) | 7,903 | 2 |

Reported against the baseline as asked: **164 against 150**. Do not act on that
number. The control run above is the reason: the same build, the same routes
and the same probe give 164 and then 153, **dark identical at 53 both times and
light moving by eleven.** A measure whose repeat differs by eleven cannot
resolve a difference of fourteen.

Three routes did not open: `/preview/g4/error` in both themes and
`/preview/f4/profile` in light, all `page.goto` timeouts at 45s. The error
harness is an error boundary and may genuinely never settle; it is named here
rather than counted as a pass.

### THE FINDING THAT MATTERS: THE PROBE'S SAMPLE IS UNSOUND BELOW THE FOLD

`probe-contrast.mjs` takes ONE full-page screenshot per route and reads each
element's `getBoundingClientRect` out of it. That is three orders of magnitude
cheaper than a shot per element and the file makes the argument well. **It is
not true below the first screen.**

Proven three ways, all reproducible:

**One, the marker test.** A magenta bar was injected at a known document `y` on
`/preview/f5/admin-desks` and then looked for in the full-page capture:

| marker at CSS y | found at device y | expected | verdict |
| --- | --- | --- | --- |
| 200 | 400 | 400 | present, exact |
| 1200 | 2400 | 2400 | present, exact |
| 1500 | 3000 | 3000 | present, exact |
| 2500 | 5000 | 5000 | present, exact |
| 4760 | **not found** | 9520 | **absent from the capture** |

The image is the right size (11426 device px for a 5713 CSS page, ratio
1.0000), so it is not truncated and it is not scaled. The rect is stable before
and after the shot. The content is simply not in the picture at the place the
picture says it is.

**Two, a worked case.** `h2 "Occupations"` on that route sits at document y
4760. The probe samples its own device box and reads `rgb(0,3,19)` on
`rgb(0,3,19)`, the canvas twice over, and reports 2.29:1. Scrolled into view
and shot in the viewport, the same element reads **20.29:1**.

**Three, the whole failure list.** 84 failures, one per (theme, route, tag,
class) cluster, were re-measured by scrolling each into view and shooting the
viewport: **40 confirmed, 43 not reproduced, 1 unverifiable.** Of the 43, **41
clear the floor** on re-measure. So roughly half the raw count is the capture,
not the product.

**A correction to my own method, because I was wrong first.** The verifier
originally matched elements on tag and text alone. Two different elements on
`/preview/p3/admin-businesses` carry the words "Government issued ID": a
heading the probe never flagged and a 14px checklist label that it did. The
verifier measured the heading, got 20:1, and was about to call the probe wrong
about an element it had never looked at. It matches on the class list now. A
verifier that ignores what the probe recorded is checking a different question.

### WHAT THE EDGE CHANGE ITSELF DID, MEASURED BY A/B ON ONE BUILD

The absolute count is polluted; a difference need not be, because the same
pollution appears in both arms. So the same worktree was rebuilt with the four
pre-change declarations restored (`--nf-brand-edge`, `-soft`, `-strong` mixing
from `--nf-glow-ink` again, and `--nf-container-edge-lit` pointing back at
`-strong`) and swept identically. One variable, same routes, same machine.

| arm | below the floor | leaves measured |
| --- | --- | --- |
| BEFORE, edge tokens as they were | 78 (dark 39, light 39) | 11,300 |
| AFTER, one container ink | 164 (dark 53, light 111) | 7,897 |

**This is a real, reproducible difference and it is not a contrast regression.**
Narrowed to six routes and repeated: the BEFORE build measures 714 leaves, 0
failures, 18 unpainted; the AFTER build measures 446, 13, 0. Both stable across
repeats. **The change removes 38 per cent of the elements the probe can read on
those routes and converts "unpainted" into "failed".**

That is a statement about the CAPTURE, not about legibility, and the proof is
in what the surviving failures are made of. **Every confirmed sub-floor pair is
ink on a FILL**, and this change moves only BORDER colours:

- `.nf-badge` success, 21 places, light, 4.04 to 4.17:1 - `rgb(10,122,81)` on
  a green tint fill
- `span.nf-numeric.inline-flex.h-5`, 8 places, dark, 1.94:1 - white on the
  cyan pending fill `rgb(0,201,255)`
- `.nf-post__handle`, `.nf-post__when` and the feed counters, light, 2.90:1 -
  muted grey on a white card
- the calendar's disabled day buttons, 1.57 light and 1.82 dark, **present in
  BOTH arms**
- `.nf-feed-seg__link`, `e/result`'s caption, `g1/sheet`'s table cells

The only readings where the ink IS an edge colour are ones where the histogram
picked the element's own BORDER as its ink - `dt "By"` on `/preview/bc/audit`
reads `rgb(73,139,232)`, which is the new container blue exactly. **A border is
not text.** The probe has no way to tell them apart and this change made the
border loud enough to win the histogram.

**Verdict: the whole-harness sweep completed and found no text-contrast
regression attributable to the edge change.** It found that the instrument is
wrong below the fold, which was true before the change and is now louder.

### THE TWO KNOWN DEFECTS, COUNTED AND NAMED AS ASKED

- **The settings `Verified` badge, 4.04:1 in light.** CONFIRMED by the viewport
  re-measure at 4.04. It is not one badge: `.nf-badge` in its success colours
  is **21 instances across 21 routes** at 4.04 to 4.17:1, on `/preview/e/payments`,
  `/preview/f4/settings`, four `bd/*` desks, `c2/host-rooms`, five `f5/agent-*`,
  `f5/admin-desks`, `f5/admin-queue`, `f5/host-landing`, `f5/inspection` and
  `p3/host-reservations`. Whoever holds it is fixing one token pair, not one badge.
- **`.nf-movein__label` at 1.03:1 in light.** **NOT confirmed.** Re-measured in
  the viewport it reads **17.76:1**. It is one of the 43 that do not reproduce.
  Worth re-checking by eye before anybody spends a day on it.

### THE RATIO SWEEP, RUN BECAUSE IT WAS CHEAP

`scripts/design/tsx-shape-scan.mjs`: 121 files, **0 at or above 0.5**, 7 on the
0.35 watch line. No control declared in TSX draws as a capsule. It reads source
and never proves what the browser drew, and it is the wrong instrument for this
change anyway: an edge-colour change moves ink and borders, not corners.

### WHAT IS OWED NEXT, AND IT IS NOT MINE TO TAKE

`probe-contrast.mjs` needs its sampling fixed before its absolute number means
anything again. The cheap repair is to shoot the VIEWPORT per scroll position
rather than one full-page image per route: walk the page a screen at a time,
measure only the elements fully inside the current screen, and stitch. That is
more screenshots than today and far fewer than one per element, and it is what
the verifier in `docs/design/proofs/chrome/contrast-sweep/verify.mjs` already
does for a handful. Until then, **the 40 confirmed failures in
`verify-out.json` are the list to work from and the 164 is not.**

Evidence in `docs/design/proofs/chrome/contrast-sweep/`: both full runs and the
control as gzipped JSONL, the 84-element verification in and out, the four
drivers, and the capture band that shows the pixels the probe could not see.

### ONE THING THAT MOVED UNDER THIS SWEEP WHILE IT RAN

`d4d4ea6`, "the small print now has a size", rewrites **928** `text-[var(...)]`
class lists to `text-[length:var(...)]`. It landed AFTER the gate this sweep was
taken at, and it is the one kind of change that can move these numbers without
touching a colour: **the floor this probe applies is 4.5:1 for ordinary text and
3:1 for large text**, and that branch is decided by the rendered font size. 928
elements that were rendering at body size and are now rendering at their
intended smaller size can cross the line in either direction.

So **the per-element numbers in this section are as at `716d964` and not as at
`d4d4ea6`.** What does NOT move with it is everything this section actually
concludes: the capture is unsound below the fold, the repeat differs by eleven,
and an edge-colour change cannot produce an ink-on-fill failure. A re-run on
the newer tip is cheap now that the driver exists and survives a dead server -
`node sweep.mjs dark out.jsonl 6` then the same for light - and it is worth
doing once somebody has repaired the sampling, not before.

## 46. THE DAY'S FOURTH AND FIFTH BLIND LIGHTS, ONE GREEN AND ONE RED

The sweep asked of every check: does it observe the outcome, or does it observe
that it tried. Two more answered badly today, and the second is the more
interesting because **it was failing, loudly, and was still worthless.**

### `check-css-tokens.mjs` reported two faults and both were fictions

`npm run lint --workspace @vallo/web` runs this script, and the script exited 1
on main. It named two comment paths as unresolved:

```
src/app/(app)/crypto/[id]/page.tsx:5   ../page.tsx
src/lib/safety/blocks-actions.ts:37    ./blocks-copy.ts
```

**Both files exist.** `app/(app)/crypto/page.tsx` is sitting beside the
directory that names it, and `lib/safety/blocks-copy.ts` beside the file that
names it. Two authors wrote correct relative paths and the checker called them
liars.

The resolver tries eight roots. Its own comment says "a comment writes the path
from wherever the author was standing", and then lists every plausible root
except **the place the author was actually standing: the directory of the file
they were writing in.** So `./x.ts` and `../x.tsx`, the two spellings that say
"relative to me" out loud, were precisely the two it could not follow.

`dirname(file)` is now tried first.

### A red light that is always wrong ends up as dark as a green one

This is the same fault as the day's others wearing the opposite colour, and it
is worth stating as a rule. A check that cannot see what it reports on is
useless in either colour: **green it misses faults; red it manufactures them,
and a red that is always wrong gets switched off, after which it misses faults
too.** Half of this repository's lint script has not passed on main for as long
as those two honest comments have existed, and the way that gets resolved is
never "somebody fixes it", it is "somebody stops running it".

### The fix was proved able to fail, not assumed to be

The obvious risk in teaching a resolver a ninth root is that it now resolves
everything and reports nothing. So a genuinely dead path was inserted into
`blocks-actions.ts` and the check re-run:

```
src/lib/safety/blocks-actions.ts:45  ./this-file-was-never-written.ts
1 unresolved path(s) in comments.
EXIT=1
```

It still catches a dead relative path. Two false positives removed, the real
finding kept. `npm run lint --workspace @vallo/web` now exits 0 for the first
time: 341 warnings, 0 errors.

### Running count of blind lights found in one day

Six, all the same shape. The pg_cron job that reported success for firing a
request it never read. The harness test that passed by reading source instead
of behaviour. `verify-shots.mjs`, which never checked where the browser landed.
The `refusalAlert` default, which answered a question it had not asked. This
resolver, which reported two faults that were not there. And, from CHROME's
sweep, `probe-contrast.mjs`, whose full-page capture cannot see past roughly
4,700 CSS pixels and scores everything below that against the wrong pixels.

## 47. FOUR STATE COLOURS THAT WERE MEASURED AGAINST THE WRONG BACKGROUND

CHROME's contrast sweep confirmed one defect by viewport re-measure: the
`Verified`-style badge in its success colours at **4.04:1** in daylight, on 21
routes. I reproduced that number from the token arithmetic alone, to two
decimals, and it turned out to be one instance of a fault in all four state
colours.

### The mistake was in the comment, not only in the colour

`--nf-state-success` carried the note "5.36:1 on white, 4.85:1 on its own
tint". The badge tint is `color-mix(in oklab, <colour> 12%, transparent)`, so
what actually sits under the ink is 12% of the colour composited over
**whichever surface the badge happens to be on**, and this product has four
light surfaces of which exactly one is white:

| ink `#0A7A51` on its 12% tint over | ratio |
|---|---|
| `#FFFFFF` surface-primary | 4.54:1 (not the 4.85 claimed) |
| `#F7F8FA` surface-raised | 4.29:1 |
| `#F4F5F7` surface-canvas | 4.18:1 |
| `#EFF1F4` surface-inset | **4.04:1** |

`.nf-badge` is `--nf-text-overline` at weight 700, which is 12px bold: ordinary
text for the floor, needing 4.5:1 rather than 3:1. So it cleared on one surface
out of four. The bottom row is CHROME's measured number.

### Sweeping the other three found two more

The value that was found is never the only one. Checking all four state inks
the same way:

| pair | white | raised | canvas | inset | verdict |
|---|---|---|---|---|---|
| warning `#0E6E8C` | 5.09 | 4.82 | 4.70 | 4.55 | scraped through |
| error `#C10E32` | 5.04 | 4.75 | 4.64 | **4.48** | under the floor |
| info `#0369A1` | 4.98 | 4.70 | 4.59 | **4.43** | under the floor |

Error is the sharpest one. Its comment reads "6.22:1 on white", which is true
and is the wrong question, and the same comment already records that its
predecessor `#DC143C` "fell to 3.95:1 on the rose badge tint". **It had learnt
half the lesson and then quoted the replacement against white anyway.**

### After

Every ink keeps its hue and saturation and is stepped down in lightness only,
until the worst surface clears with real headroom rather than by 0.05.

| pair | primary | raised | canvas | inset |
|---|---|---|---|---|
| success `#096946` | 5.61 | 5.30 | 5.17 | 4.99 |
| warning `#0D6784` | 5.61 | 5.31 | 5.19 | 5.02 |
| error `#B40D2F` | 5.57 | 5.26 | 5.13 | 4.95 |
| info `#036195` | 5.55 | 5.25 | 5.12 | 4.94 |

`--nf-status-approved` aliases success, so approved badges move with it.

### The rule this leaves behind

**A token whose background is a transparent tint has no single contrast number.
Quoting one against white is quoting the best case as though it were the
measurement.** Check the darkest surface the thing can actually land on. Three
of these four comments quoted a real number that was real about a background
the component is rarely on, which is a more convincing way to be wrong than
having no number at all.

## 48. THE CHECK-IN CAUGHT ONE, AND IT WAS THE WATCH ITSELF

The 18:55 check-in on the cron fix. All three questions answered, and the third
one found a seventh blind light.

### 1. The scheduler lets itself in now, unaided

`private.reconciliation_watch` at 18:47, joined to its reply:

```
last_requested_at: 2026-09-22 18:47:00   last_verdict: ok_200
status_code: 200   window 2026-09-20T18:47 to 2026-09-22T18:47, charges and holds examined
```

**`ok_200` is the claim I could not make earlier.** The 17:37 proof was a run I
fired by hand; this one is pg_cron on its own schedule, through pg_net, with
the rotated bearer. The door opens for the scheduler and not merely for me.

### 2. Production is current and has stayed current

Five consecutive production deployments READY, newest `2596ed9`. Nothing ERROR
since the rotation.

### 3. The alert count went 0 to 1, and the one was the finding

The desk had grown one open row, raised at **18:20**. Read rather than assumed,
it says:

```
cron.pg_cron.job_failed  (critical)
vallo_reconcile_payments run 8187 at 2026-09-22T15:47:00:
  ERROR: invalid URL "https://www.vallospaces.com\n/api/paystack/reconcile..."
```

That is the newline fault, at **15:47**, two hours before it was fixed, raised
as a fresh critical alert at 18:20 about a job that had by then succeeded three
times.

`private.cron_job_failures` reports every failed run in a **25 hour** window
and `cronWatchVerdict` raises critical if that list is not empty. Neither asks
whether the job is failing NOW. Left alone, that one dead run would have
produced **twenty-two more critical alerts, hourly, until the following
afternoon**, about a fault already fixed.

**It is the same shape as the other six: it observes that a failure exists in a
window, not that the job is failing.** And it is the most expensive kind,
because this is the desk. A desk that cries about fixed faults is a desk that
gets closed, and this platform has already paid once for a desk nobody opened.

### The fix, on both sides

`private.cron_job_failures` now returns `recovered_at` per failure: the start
time of the next SUCCEEDED run of the same job. **The recovery search is
deliberately not windowed** even though the failures are, because a failure at
the old edge of 25 hours may have been put right 24 hours ago.

`cronWatchVerdict` alerts only on failures where `recoveredAt` is null.
**Nothing is discarded**: recovered failures stay in `counts` and are named in
the envelope on every run, so a job flapping between failing and recovering
reads as exactly that rather than as silence, and a standing alert carries
`recovered_and_not_alerted` so a one-job alert cannot be mistaken for the whole
picture.

**The unknown case defaults to the loud answer.** A deploy can reach a database
where the migration has not run, and `recovered_at` is then simply absent. It
parses as null, which means standing, which means it shouts exactly as it did
before. Reading an unknown recovery as a recovery would have been a way for a
real outage to go unreported because a migration was late.

### Proved on the live estate, not in a fixture

The probe against `uccixoonmbhrnyczyigt` (rolled back) returned:

```
1 failures in window, 0 standing, 1 recovered.
vallo_reconcile_payments run 8187 at 2026-09-22T15:47:00 recovered_at=2026-09-22T18:47:00
```

It also fails if any row lacks the `recovered_at` KEY, because an absent key
parses as "not recovered" in the caller and the whole change would then be a
no-op that looked like it worked.

Rule 21 restated rather than assumed: `create or replace` preserves grants, so
both functions are re-revoked from `public`, `anon` and `authenticated`, and
`has_function_privilege` was read back afterwards. Measured after: anon false,
authenticated false on both; `service_role` true on the public wrapper only,
which is exactly the state measured before.

Gate: clean worktree at `2596ed9`, hardlinked node_modules, tsc 0, eslint 0, 91
tests across `lib/bookings` and `lib/cron`.

## 49. REQUESTS TO SESSION B

`docs/SESSION_B_SCOPE.md` asks this session to put anything it needs on Session
B's surfaces here, because Session B reads this file. This section is that
channel. It is appended to, never rewritten, and each item says whether it is a
blocker or a note.

**Scope acknowledged.** As of `75cdea0` the admin console (`app/admin/**`,
`app/css/admin.css`) and the inspection surface (`app/(app)/inspections/**`,
`components/app/inspections/**`, `app/agent/inspections/**`,
`lib/inspections/**`) are Session B's, along with the original five. **This
session has nothing in flight on any of them** and will not edit them. Nothing
needs pushing on our side before Session B starts.

`docs/design/REFERENCE_UPLOADS_2026-09-22.md` indexes all ten root PNGs with
what each one actually draws, screen by screen; every one was opened rather
than inferred from its filename. It predates the reassignment and says five of
them are this session's. They are not, as of `75cdea0`. The index of what each
image contains is still accurate and is the useful half.

---

### R1. BLOCKER. The send money render carries an "NDIC INSURED" badge and it must not be drawn

`77A54EA3-BBB5-4BF4-B3A5-144C99CABAF7.png`, bottom of the screen, beside a
"256 BIT ENCRYPTION" badge: **"NDIC INSURED"**.

NDIC is the Nigeria Deposit Insurance Corporation. It insures deposits held at
licensed banks. **Vallo is not a bank and holds no such cover.** Drawing that
badge on a money screen is a false statement about whether a person's money is
protected if the platform fails, and it is the kind of claim a regulator reads
literally rather than as decoration.

This is not the shape law and it is not a style preference. It is the standing
rule that a reference image governs the SHAPE and never licenses an untrue
detail, and it sits next to the stop list's prohibition on merchant-of-record
exposure and on any claim about where somebody's money is.

**Do not draw it in any wording** unless the founder produces evidence of
cover. The "256 BIT ENCRYPTION" badge beside it is a claim about an
implementation detail and should go with it: it tells a person nothing they can
act on, and a security claim that cannot be checked is a dark pattern.

If the reassurance strip is wanted, the honest version names what is actually
true: who holds the money, what happens to it if a transfer fails, and how long
a refund takes.

### R2. BLOCKER. Buy Airtime, Pay Bills and Swap are products Vallo does not sell

Drawn in both `6AF37222` (wallet, Quick Actions) and `77A54EA3` (send money,
the four-button row): **Buy Airtime**, **Pay Bills**, **Top Up**, **Swap**.

Vallo sells none of them. **Swap** additionally reads as crypto, and the crypto
surface was taken dark deliberately: `app/(app)/crypto/page.tsx` and
`crypto/[id]/page.tsx` both call `notFound()`, with the ruling recorded as
DEFERRED, NOT CANCELLED.

A tile that goes nowhere is precisely the fault HANDOFF 08 section 1.1 is about
("the shop is empty and the window advertises stock"), and it is the one thing
this build has been most consistently punished for. Draw the actions that
resolve to something a person can finish today, and no others.

### R3. NOTE. The Welcome Back render's slogan was removed by founder instruction today

`55A56F21` draws "Real Estate reimagined!" under the lockup. The founder's
instruction on 22 September was to remove the auth screen slogan **entirely,
with no replacement**. The render predates the ruling. The ruling wins.

### R4. NOTE. The admin renders draw a platform with traffic that does not exist

The four admin images draw 1,248 live listings, ₦18,450,000 transacted today,
137 moderation reports, 548 escrows, 42 identity checks awaiting review.

Measured on the live database at 19:30 on 22 September:

| | |
|---|---|
| Published listings | 64 |
| Of which demo (`is_demo`) | **64** |
| **Real supply** | **0** |
| Accommodations | 5, all demo |
| Bookings, ever | **0** |
| Reservations, ever | **0** |
| Accounts (`auth.users`) | **7** |
| Open risk alerts | 0 |

Every number on those screens will be zero or near it on the day they ship.
**The empty state has to be the designed state**, not a fallback added at the
end, or the console becomes the same window advertising stock that HANDOFF 08
opens by condemning. A chart with no data should say what would fill it.

### R5. NOTE. GOVERNING-12 is now split between the two sessions, and it carries a fee-attribution warning

`GOVERNING-12` draws four screens: the admin review queue, a listing under
review with its actions, **the lister's notification centre**, and **search by
listing ID**. The first two are Session B's under `app/admin/listings/**`. The
last two are not in Session B's scope and stay here.

Carried forward from the ledger: **screen two's render prints "Agency fee
(10%)" and "Legal fee (2%)" with no owner named.** The built screen must say
WHOSE fee each one is, or it reads as the platform's, which is false and is
against rule 15. Vallo charges no platform fee and nothing may imply it does.

### R6. NOTE. Two things that will bite on any admin screen with small text

- `text-[var(--nf-text-x)]` compiles to `color` in Tailwind v4 and emits **no
  font-size at all**. The correct spelling is `text-[length:var(--nf-text-x)]`.
  928 occurrences of the broken form were repaired today in `d4d4ea6`; writing
  a new one puts it straight back.
- The four daylight state colours moved today in `2596ed9`
  (`--nf-state-success`, `-warning`, `-error`, `-info`). They were quoted
  against white and failed 4.5:1 on the three grey light surfaces. If an admin
  badge needs a state colour, take the token; do not re-derive a hex.

### R7. NOTE. What the operations screen needs already exists and is honest as of today

`01F7DFC7` screen two draws scheduled jobs with last run and status, alerts by
severity, and an audit log. That data is real and was repaired today:

- `private.cron_job_failures(interval, integer)` returns each failed run **and
  `recovered_at`**, the next success of the same job, so a fixed fault does not
  render as a live one. `public.cron_job_failures` is the wrapper, and
  `service_role` is the only role with EXECUTE.
- `lib/cron/freshness.ts` names any watched job that has gone quiet past its
  allowance; `lib/cron/report.ts` writes the dated rows it reads.
- `private.reconciliation_watch` holds the money job's last request, its reply
  and its verdict. It read `ok_200` at 18:47 on its own schedule.
- `public.risk_alerts` is at **0 open** after today's clear-down, with all 267
  historical rows kept and resolved rather than deleted.

**Requests for a new view, function or policy come back to this session**, per
the scope file. Ask rather than adding a migration.

## 50. TWO PROOFS THAT DISAGREED WITH THE SHIPPED CODE, RETAKEN

The founder's ruling, in his words: **a proof that disagrees with the shipped
code is the same class of problem as a green light that cannot see what it is
reporting on.** That makes five of the same shape in one day, and these two are
the fourth and fifth.

### What was stale, and why

| Proof | Claimed | Shipped |
|---|---|---|
| `b1/dock-390-dark.png` and ledger row 261 | "the object rises **7px** above the bar" | `chrome.css` sets `--nf-dock-lift: 0rem`. The founder used the dock on a real phone and ruled the switch back **in line** with the other four |
| `b1/drawer-390-dark.png` and ledger row 263 | "the side drawer's **Switch profile** row", proved against `GOVERNING-01` screen three | The row was **removed**, not moved. The switch lives in one place |

Neither proof was dishonest when it was taken. Both were taken before the
ruling that changed the thing they photographed, and neither was retaken after
it. That is how a proof rots: not by being faked, but by outliving its subject.

### The founder has confirmed the ruling and the brief is what changes

Asked to confirm or reverse the single-entrance deviation, the founder
confirmed: **the switch lives in one place, the dock, and HANDOFF 09 section 6B
is out of date rather than the code.** That section now carries the current
ruling at the top with the original kept beneath it, struck through and marked
superseded rather than deleted, so nobody re-derives the old answer in a month
and "fixes" the code back to it.

### `scripts/design/proof-dock.mjs`, and it measures rather than photographs

The script carries four guards, each paid for by a real failure on this build:
the HTTP status; **where the browser landed**, because `verify-shots.mjs` once
wrote five PNGs of the sign-in screen under five other route names; the
`data-nf-not-found` marker, because a layout `notFound()` answers **200** with
the not-found body; and `behavior: "instant"` on the scroll, because a smooth
scroll is a no-op in headless Chromium.

**And it refuses to write a file whose measurement disagrees with the ruling.**
A proof script that will photograph anything put in front of it is how the two
rows above happened.

### THE GUARD CAUGHT MY OWN INSTRUMENT ON THE FIRST RUN

The first version measured the switch slot against the **bar** and asserted the
difference was zero. It came back **-7**, and refused to write.

**-7 is not a lift. It is the bar's own top padding**, which every slot sits
inside, so the number was meaningless and the guard was protecting a
meaningless number. The founder's ruling is "in line with the **other icons**",
so the comparison is against the **sibling slots**, not against the container.

Rewritten to compare the switch's top against the median top of the other four:

```
liftAgainstSiblings: 0      slotTop: 769      siblingMedianTop: 769
all five slots 65.59px wide      bar 70px      overflowX 0
```

**Zero, in both themes.** At 1536 the dock is not drawn at all because the
desktop rail replaces it, which is correct and is recorded rather than thrown.

### The drawer is asserted, not eyeballed

```
switchRowPresent: false      lightWords: false
```

The drawer's text matches neither `/switch profile/` nor `/switch role/`, and
neither `/light mode/` nor `/dark mode/`. Both of the founder's instructions
are held by an assertion that fails loudly rather than by somebody looking at a
picture. The shot shows Home, Search, Feed, the flip-coin card, a bare theme
glyph with no container and no words, and the company row.

### One thing the retake surfaced that is not fixed here

The drawer's flip-coin card draws a **hotel glass object**, not the coin. An
earlier sweep reported that `flip-coin` appears exactly once in the tree, in
`BrandIcon.tsx`'s name list, and is drawn nowhere. **The retake corroborates
it**: the card the object was commissioned for is drawing something else. Named
here, not fixed, because it belongs to whoever holds the icon set.

## 51. SIX WRITERS IN ONE TREE, AND THE PARTITION THAT KEEPS THEM APART

Five workers opened on the founder's five blocks, alongside Session B. Six
concurrent writers on one repository is how six files were eaten once already
today, so the partition is written down before any of them commits.

**Every worker pulls `--rebase` before every push and pushes small.** No worker
force-pushes, runs `git add -A`, `git stash`, `git reset --hard`, or restores a
file it did not write. No worker runs `pkill -f next` or `pkill -f chromium`:
several servers are up at once and the pattern matches somebody else's.

| Worker | Owns | Block |
|---|---|---|
| **ESCROW** | `lib/escrow/**`, `components/app/escrow/**`, `app/(app)/escrow/**`, `lib/email/escrow-messages.ts` (new), `lib/admin/escrow-actions.ts`, `app/css/escrow.css`, `scripts/probes/escrow_*` | Escrow to industry standard, everything but custody |
| **PAYMENTS** | `lib/payments/**`, `lib/wallet/**` (library, not routes), `components/app/payments/**`, `app/(app)/settings/payments/**`, `app/(app)/checkout/**`, `app/(app)/rent/pay/**`, `lib/security/money-limits.ts`, `app/api/paystack/**` except reconcile | Cards, bank accounts, and the eight open money departures |
| **PRICE CHECK** | `lib/price-check/**`, `app/(app)/price/**`, `components/app/price/**`, `app/css/price-check.css`, `scripts/check-valuation-words.mjs`, `app/(dev)/preview/price/**` | Stage one, from zero |
| **ROLES** | `lib/supply/**`, `components/supply/**`, `components/roles/**`, `lib/admin/actions.ts`, `profile/setup/**`, `lib/notify/welcome.ts`, `components/host/**`, `app/host/**`, `(site)/help`, `careers`, `contact`, `(site)/docs/**`, `HomeScreen.tsx` | Track G's structural half, Track O, and the flagged gaps |
| **PROVE** | `scripts/design/**`, `apps/web/scripts/probe-contrast.mjs`, `docs/design/proofs/**`, `scripts/probes/**`, `docs/PROOF_RUN_2026-09-22.md` (new) | The unproven register, and an end-to-end walk |
| **the lead** | `docs/PLATFORM_STATUS.md`, this ledger, `lib/cron/**`, coordination | Everything above, and the record |

**SESSION B, and nobody crosses it:** `app/admin/**`, `lib/admin/reads/**`,
`app/(app)/wallet/**`, `components/app/wallet/**`, `app/(app)/profile/**`
(but NOT `profile/setup/**`), `app/welcome/**`, `app/(auth)/**`,
`components/auth/**`, `lib/inspections/**`, `app/agent/inspections/**`,
`app/css/{admin,wallet,auth,inspection}.css`, the `welcome` function in
`lib/email/messages.ts`, and its own two documents.

**The two boundaries that are easy to get wrong**, because they split a
directory rather than owning it:

1. **`lib/admin/`**: `reads/**` is Session B's, and every other file in it,
   including `actions.ts`, is ours. A mutation is asked for; a read is written.
2. **`lib/email/messages.ts`**: the `welcome` function and its type are Session
   B's while it moves them to `welcome-message.ts`. Every other message in that
   file is ours. ESCROW was given its own new file rather than a share of this
   one, deliberately.

**Where a worker needs something outside its scope it writes a request instead
of making the change**, into section 49 of this ledger for Session B, or back to
the lead. Session B's own requests arrive in `docs/SESSION_B_SCOPE.md` and are
read every cycle.

### One request answered here, because it resolved itself

Session B asked for nine money reads and a set of review-desk reads in
`lib/admin/**`. It then took `lib/admin/reads/**` for itself, which is the
right split and makes those requests its own to write. **Nothing is owed on
them.** Its remaining request, a `renderTrigger(open)` prop or an
`openProfileSwitcher()` event on `components/supply/ProfileSwitcher.tsx` so its
profile row stops coupling to the dock's `.nf-tab__link--switch` class name,
is assigned to ROLES, which owns that file.

## 52. I CLOSED FINDING 1.5 AGAINST THE WRONG KEY

Section 44's reconciliation matched the applied set against the file set **by
name**, found zero orphans, and reported the finding closed. That was the wrong
comparison, and the right one was one query away.

```
primary_key of supabase_migrations.schema_migrations: version
```

**`version` is the primary key**, and `version` is the timestamp prefix, not the
name. Two files sharing a prefix cannot both be recorded: the second insert
violates the key. The repository carried **twelve files across five duplicate
versions**:

| Version | Files sharing it |
|---|---|
| `20260922140000` | the abuse scan, and the welcome-once guard |
| `20260922150000` | the terms receipt, three amenities, and the stats band |
| `20260922160000` | what a buyer pays, and the stay fulfilment guard |
| `20260922190000` | the recovered-failure watch, the shortlet enum, and the URL trim |
| `20260922200000` | a bedroom is not a bed, and the money job's own reply |

### Why nobody noticed, which is the interesting half

**`mcp__Supabase__apply_migration` assigns its own version at apply time and
ignores the filename's.** The newest recorded version is `20260922221913`, a
wall-clock stamp from this evening, not a number any file carries. So the file
versions and the database versions are **independent in this workflow**, the
duplicates never collide when applying remotely, and everything reports clean.

They collide on exactly one path: **a rebuild of the schema from the
repository**, which is the precise scenario finding 1.5 is named for. The
finding was about a latent inability to rebuild, and I verified it against a
key that a rebuild does not use.

**My name-based check was not wrong, it was insufficient.** Zero orphans by name
is still true and still worth having. It simply cannot see this.

### Fixed

Seven files renamed to unique versions, preserving alphabetical order within
each group so the apply order a rebuild would choose does not change. Renaming
is safe here for the same reason the duplicates were invisible: the database
records its own versions, so no recorded row refers to a filename. **252 files,
zero duplicate versions.**

Two live workers had independently written `20260922230000`, PRICE CHECK and
ROLES. Told both; PRICE CHECK moved to `234000` and the block is ROLES's.

### The rule this leaves behind

**Verify a claim against the key the failing scenario uses, not against the key
that is convenient to read.** A reconciliation that matches on a field the
restore path ignores is a green light aimed at the wrong wall, and it is the
eighth of that shape found today.

---

## 51. THE IN-APP CHECKOUT: WHAT LANDED, WHAT THE THREE OPEN QUESTIONS ANSWER TO, AND WHAT IS STILL OWED

Written by the payments worker, 22 September 2026. Track A rows 1 to 8 of the
sweep's master table, plus the payment-method and bank-account desks.

### 51.1 The five departures that closed, and the three that did not

| Row | Call site | State |
| --- | --- | --- |
| 1 | `checkout/[bookingId]/PayPanel.tsx` "Pay by card" | **Closed.** `PaystackCheckout`, resumed on our own page |
| 2 | `checkout/[bookingId]/PayPanel.tsx` 3-D Secure fallback | **Closed.** Same component, same reference |
| 3 | `rent/pay/[inspectionId]/PayPanel.tsx` "Pay by card" | **Closed.** Same component |
| 4 | `rent/pay/[inspectionId]/PayPanel.tsx` 3-D Secure fallback | **Closed.** Same component, same reference |
| 5 | `wallet/WalletDeck.tsx:386` hosted top-up | **OPEN. Session B's file.** See R8 |
| 6 | `wallet/WalletDeck.tsx:395` saved-card 3DS step | **OPEN. Session B's file.** See R8 |
| 7 | `components/app/payments/PaymentMethodsPanel.tsx` "Add a card" | **Closed.** |
| 8 | `components/app/wallet/CryptoTopUp.tsx:36` Yellow Card | **OPEN. Session B's file.** See R9 |

`window.location.assign` to a payment now appears at exactly three call sites
in the tree, all three in Session B's files, all three listed above.

### 51.2 THE THREE QUESTIONS THE SWEEP SAID TO TEST FIRST

The brief asked for a real test card against Paystack test keys. **That could
not be done from this session and I am not going to dress up what I did do as
if it were.** Two independent blocks:

1. **Every Paystack host is refused by this session's egress policy.** Measured,
   not assumed: `js.paystack.co`, `api.paystack.co`, `checkout.paystack.com`,
   `standard.paystack.co` and `paystack.com` each answer
   `CONNECT tunnel failed, response 403`. The proxy's own guidance is to report
   a blocked host rather than route around it, so no sandbox, tunnel or third
   party was used to get out.
2. **There is no Paystack key of any kind in this environment.** `.env.local`
   holds two Supabase values and nothing else. There is no test secret key to
   initialise a transaction with and therefore no access code to resume.

So the answers below come from the ONE primary source that was reachable: the
published `@paystack/inline-js` 2.25.0 tarball, pulled from the npm registry
and read directly. That is the code that will actually run in our browser, so
it is strong evidence. It is not a card completing a payment. Each answer says
which it is.

**Q1. Does `resumeTransaction` work without a public key? YES. SETTLED.**

This one is genuinely answered, because it is a question about the library's
own control flow and the library is in our hands. In `es/inline.js`:

- `resumeTransaction(e, {onSuccess, onCancel, onLoad, onError})` calls
  `this.newTransaction({accessCode: e, ...})`. There is no key parameter.
- `newTransaction` constructs the transaction through a validator whose FIRST
  statement is `if ("accessCode" in n) return { accessCode: n.accessCode }`.
  **It returns before the required-parameter loop ever runs.** No key is
  required, and none is read.
- The only `publicKey` in the whole bundle is a hard-coded RSA PEM belonging to
  Paystack, used to encrypt card data. It is not a merchant key and is not ours
  to supply.
- With an access code, `requestInline()` would `GET
  api.paystack.co/transaction/verify_access_code/<code>` **with no
  authorisation header at all**. The access code IS the credential. That is why
  no key is needed.

Consequence: `docs/ENVIRONMENT.md:101` and `docs/DEPLOY.md:125`, which both say
`NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` is not needed, **stay true as written.** No
env var was added. Nothing in this work reads one.

**Q2. Does 3-D Secure render inside the iframe? STRONG EVIDENCE, NOT PROOF.**

What is settled from the bundle:

- **`window.open` occurs zero times in the entire 65KB bundle.** Not in a
  string, not as a property access. The library has no mechanism for opening
  anything.
- Exactly one checkout iframe is created, `src =
  https://checkout.paystack.com/popup?precheckout=true`, appended to
  `document.body`, fixed and full viewport.
- The parent page listens for `message` events and accepts them only from that
  origin or that iframe's `contentWindow`.

What is NOT settled: the bank's ACS page is served **into Paystack's checkout
document**, which is cross-origin and which this side cannot read. Paystack's
own code cannot open a window; whether their checkout page does is not visible
from here. **A live 3DS test card remains the only proof and it is owed.**

The cost of being wrong is bounded and worth stating: if 3DS did open a window,
rows 2 and 4 would degrade to the behaviour they already had before this work,
and the in-app checkout would still have closed rows 1, 3 and 7.

**Q3. Does a real card complete? NOT ANSWERED. Nothing was charged and nothing
could be.** No key, no egress. Do not read any green test in this tree as an
answer to this question: every test here mocks the processor.

**The exact test that settles Q2 and Q3, for whoever has egress and a test
key**, so nobody re-derives it:

1. Set `PAYSTACK_SECRET_KEY` to a `sk_test_` key.
2. Sign in, open `/settings/payments`, tap Add, tap "Save a card".
3. Watch for a full-viewport iframe on `checkout.paystack.com` with the Vallo
   page still behind it and `vallospaces.com` still in the address bar.
4. Pay with Paystack's 3DS test card `5060 6666 6666 6666 666`, which forces a
   challenge. **Watch whether the bank's page appears inside that iframe or
   anywhere else.** That is Q2.
5. Complete it. The card should appear on the desk within a few seconds, put
   there by the webhook, and the sheet should settle from `paymentState`
   reading our own `wallet_entries` row. That is Q3.

### 51.3 THREE THINGS THE SWEEP DID NOT FIND, ALL FROM READING THE BUNDLE

1. **`connect-src` needs no change, and that is a load-bearing fact.** The
   sweep assumed an in-app checkout would need Paystack in `connect-src`. It
   does not: `requestInline()`, the only `fetch` to `api.paystack.co` in the
   bundle, is reached ONLY from `checkout()` and `paymentRequest()`. The
   `resumeTransaction` path makes no network call from our page at all. The
   comment at `csp.ts:355-357` stays true and the directive stays `'self'` plus
   Supabase.
2. **`checkout.paystack.co` in `PAYSTACK_FRAME_ORIGINS` (`csp.ts:198-201`) is
   an over-grant.** The bundle's production config names exactly one checkout
   origin, `https://checkout.paystack.com/`, and the iframe src is built from
   it. The `.co` spelling is never framed. Not changed here because `csp.ts` is
   not this worker's file; it is one line to delete and it should be deleted.
3. **`Permissions-Policy` is a silent trip wire.** The checkout iframe is
   created with `allow="payment; clipboard-read; clipboard-write"`.
   `next.config.ts:206` currently sets `camera=(), microphone=(),
   geolocation=(self), interest-cohort=()` and does NOT name `payment`, so
   delegation works today. **The day somebody adds `payment=()` to that header,
   Apple Pay inside the Paystack iframe dies with no server-side trace and the
   CSP will be suspected first.** Noted here so the next person finds it.

### 51.4 THE PAYMENT METHOD AND BANK ACCOUNT DESKS

Six actions, all of which decide where money goes and four of which were
unlimited, unaudited and unannounced: `setDefaultPaymentMethod`,
`removePaymentMethod`, `setDefaultBankAccount`, `removeBankAccount`. All four
now carry a row in `lib/security/money-limits.ts`, write to `audit_log`, and
announce themselves through `lib/notify/junction.ts`.

`startCardSetup` and `addBankAccount` are idempotent per tap. The first opened
a second live NGN 100 charge on a double submit; the second spent a second of
the five paid account resolutions an hour.

`startCardSetup` asks Paystack for `channels: ["card"]`, and it is the ONLY
call site on this platform that narrows channels. Every other charge sends no
`channels` key, deliberately: a Nigerian customer refused a bank transfer is a
Nigerian customer who does not pay. The setup charge is different because its
entire purpose is to obtain a reusable authorisation, which only a card
returns. The reason is written beside the line.

**No email yet, said plainly.** Every notice passes `email: null`.
`lib/email/messages.ts` has builders for a password change and a new device
sign-in, which are the same class of event, and none for a payment instrument.
Writing one belongs to whoever owns `lib/email`. When it lands, only the
`email` field on each announcement in `lib/payments/notices.ts` changes.

### 51.5 PROVED AGAINST THE LIVE DATABASE, ROLLED BACK, NOT GREPPED

Fourteen money call sites carried rate limits and not one had ever been watched
refusing anything. Four were asked to refuse on purpose, against
`public.consume_rate_limit` on `uccixoonmbhrnyczyigt`, in a probe that ends in
`raise exception 'PROBE ALL PASS ...'` and therefore wrote nothing. Verbatim:

```
PROBE ALL PASS
  card_setup 5/h  : 1=TRUE 2=TRUE 3=TRUE 4=TRUE 5=TRUE 6=FALSE 7=FALSE 8=FALSE
  card_setup first refusal: attempt 6
  card_default 20/10m first refusal: attempt 21
  buckets isolated: yes (bank_default still allowed after 9 bank_remove)
  rule 21 consume_rate_limit: anon=f authenticated=f
  authorization_code as authenticated: REFUSED (permission denied for table payment_methods)
  is_default as authenticated: ALLOWED (no rows matched, which is the point)
  rate_limits rows written by this probe: 4 (all rolled back)
```

Confirmed afterwards: zero probe rows in `rate_limits`, zero probe rows in
`payment_methods`, and no migration recorded.

**AND THE INSTRUMENT LIED TWICE BEFORE IT TOLD THE TRUTH.** Asking
`information_schema.role_table_grants` from the MCP SQL role returned an empty
set for `payment_methods` and `bank_accounts`, which reads as "authenticated
has no privileges at all". Then `has_table_privilege('authenticated', ...,
'UPDATE')` returned **false**, which reads as "the whole payments desk is dead,
every update permission denied". Both were artefacts. `role_table_grants` is
filtered by the reader's own role membership, and `has_table_privilege` answers
about TABLE-level grants only. The right instrument is
`has_any_column_privilege`, which says true, and `pg_attribute.attacl`, which
shows `is_default`, `deleted_at` and `updated_at` granted to `authenticated`
and nothing else. **I was one paragraph away from filing a four-action outage
that does not exist.** A catalogue view is as capable of a blind green light as
a test is, and a privilege question has a different right function for tables
and for columns.

### 51.6 A TEST THAT PASSED WHILE THE THING IT NAMED WAS BROKEN

`transfer-idempotency.test.ts` was proved able to fail, twice, on purpose.
Removing the guard turned the headline assertion red: *expected [2 moves] to
have a length of 1 but got 2*. **Removing the schema field did not.** That is a
finding rather than a pass: the fix reads the key straight off the `FormData`
exactly as the funding door does, so it never depended on the schema at all.
The schema field is still named, because a validator that silently bins a field
somebody is posting is a trap for the next person, but it is not what holds the
money in place and a commit message claiming it was would have been false.

### 51.7 WHAT IS STILL OWED, NAMED RATHER THAN LEFT

1. **Q2 and Q3 above.** A live test card. Section 51.2 has the exact steps.
2. **`startCryptoDeposit` has a third variant of the double-send bug.** It
   parses with `fundSchema`, which DOES carry `idempotencyKey`, `CryptoTopUp`
   DOES mint and post one, and the action never calls `withIdempotency`. So the
   key survives the schema and is then ignored. Not fixed with the send-money
   blocker because Yellow Card is not configured on any deployment and that
   commit needed to stay one change. It is six lines.
3. **`withdraw` and `withdrawToSavedAccount` take no key at all.** The schema
   now names the field and the server is ready; no withdrawal form mints one,
   so the guard steps aside. See R10.
4. **No email on any payment-instrument change.** Section 51.4.
5. **`csp.ts` over-grant and the `Permissions-Policy` trip wire.** Section 51.3.

---

### R8. BLOCKER. The wallet deck still leaves the platform twice, and the component to stop it is built and merged

`app/(app)/wallet/WalletDeck.tsx:386` and `:395` are the last two Paystack
departures on the platform. Both are `window.location.assign`. They are rows 5
and 6 of the sweep's master table and they are Session B's files, so this
session has not touched them.

**Everything needed is already on main.** The server side has returned what you
need the whole time and now says so:

- `fundWallet` and `fundWalletWithSavedCard` already return `accessCode` beside
  `authorizationUrl` (`lib/wallet/actions.ts:283`, `:380`). Nothing reads it.
- `components/app/payments/PaystackCheckout.tsx` is merged and is the component
  both checkout panels and the payments desk now use.
- `lib/payments/payment-state.ts` exports `paymentState(reference)`, which
  reads our own `wallet_entries` row and never calls Paystack. Use this to
  settle, NOT `verifyFunding`: the sheet polls, and `verifyFunding` costs a
  Paystack round trip and takes the `money_verify` allowance of thirty in ten
  minutes, so one payment would spend the person's whole allowance and then be
  refused mid-payment, which reads on screen as a failure.

What to do, at `:386`:

```tsx
{step?.kind === "checkout" && (
  <PaystackCheckout
    key={step.reference}
    accessCode={step.accessCode}
    reference={step.reference}
    authorizationUrl={step.authorizationUrl}
    amountMinor={step.amountMinor}
    locale={locale}
    confirm={async (r) => { const s = await paymentState(r); return s.ok ? s.data : "pending"; }}
    onPaid={() => { /* close, router.refresh() */ }}
    onCancelled={() => { /* back to idle; the reference stays open */ }}
    onFailed={(message) => { /* show it verbatim, it is already true */ }}
  />
)}
```

And at `:395`, `FundingStep` (`components/app/wallet/funding-step.ts:17-28`)
changes from `{kind:"hosted"; url}` to carrying `{accessCode, reference,
authorizationUrl}`, exactly as the sweep's row 6 says. `funding-step.test.ts`
moves with it.

**Do not mount it with an `open` boolean.** It has no such prop on purpose:
one mount is one transaction, so render it only while a transaction is live and
give it `key={reference}`.

### R9. NOTE. The crypto top-up is row 8 and it is not urgent

`components/app/wallet/CryptoTopUp.tsx:36` assigns Yellow Card's `paymentUrl`.
Nothing here is live: `isYellowCardConfigured()` needs three env vars that no
deployment sets. The sweep's answer (section 7) is to change `createCollection`
to request the structured collection and draw a Vallo deposit sheet, and it is
a library change in `lib/payments/yellowcard.ts`, which is this session's file.
**Say the word and it is done**; it was left alone because building a sheet
against an API shape nobody has ever executed would be building against a
guess.

While you are in that file: `startCryptoDeposit` in `lib/wallet/actions.ts`
never calls `withIdempotency` even though `CryptoTopUp` mints and posts a key
and `fundSchema` carries it through. Same class as the send-money blocker. That
one IS this session's file and is listed as owed in 51.7.

### R10. NOTE. No withdrawal form mints an idempotency key

`withdrawSchema` now names `idempotencyKey` and `withdraw` is ready for it, so
this is a one-line change on your side and needs no backend work: mint a key
per mount and post it as a hidden input, exactly as `SendFlow.tsx:116,313`
already does.

Until then the guard steps aside and a double tap on Withdraw places two
holds. It is a smaller hole than Send was, because a withdrawal is a PENDING
debit hold that support can reverse rather than money already in somebody
else's wallet, but it is the same shape and it is the last one of its family.

### R11. NOTE. What the send-money fix means for SendFlow, which is yours

Nothing to change. `SendFlow.tsx` was already right: it mints the key and posts
it, and had been doing so the whole time. The bug was `transferSchema` not
naming the field and `transferToUser` not using it, both this session's files,
both fixed and pushed. **Your component was the only part of that chain that
was correct.** Worth saying, because the first instinct on a double-send bug is
to change the form.

### R11. BLOCKER. `lib/admin/reads/supply.ts` gives the verified badge a second derivation, and it is red on main

`apps/web/src/lib/admin/reads/supply.ts:211` selects `verified` from
`public.agents`:

```ts
.select("id, user_id, display_name, type, verified, is_demo, created_at, application_id")
```

`src/lib/trust/agent-badge-derivation.test.ts` fails on it, and that test has
been **red on main** since the file landed. Its rule:

> the agent verified badge has one derivation: it is read from nowhere in the
> app but the published `agent_badges` row

**Why the rule exists, and it is rule 12 rather than a style preference.** The
verified badge means a checked human. `agents.verified` is a second place that
answers "is this person verified", and it is not the place the public badge
comes from. A desk that draws a tick from it will one day show a tick beside
somebody the public listing shows no tick for, or the reverse, and nobody will
be able to say which is right. That is why the derivation is single.

**What is asked.** Read the badge from the published `agent_badges` row, as the
rest of the product does, and drop `verified` from that select. If the Supply
desk genuinely needs the raw column for an operational reason (to show that a
row disagrees with its badge, say) then it needs a different name on screen and
an argument in the file, because a column called `verified` drawn as a tick IS
the badge whatever the variable is called.

**Note the test is itself a source reader**: it scans for `.from("agents")`
selects containing `verified`. That is a weak instrument and it will not catch a
join or a `select *`. It is the one we have, it caught this, and it is not a
reason to dismiss the finding.

**State of main as of `aee5d02d`:** 3,097 passing, this the only failure. The
other two reds (`locale-completeness`, `user-generated-content`) were ours and
are fixed in that commit. This one is the last red light on main and it is not
ours to change.

## 53. NINE PRIVATE FUNCTIONS WERE BORN PUBLIC, AND MY FIRST READING WOULD HAVE TAKEN THE PLATFORM DOWN

The escrow worker reported that four functions in `private` carried no ACL at
all and closed them. I asked the same question of the whole schema, and the
first answer looked like a serious breach:

| | |
|---|---|
| Functions in `private` | **220**, of which 205 are SECURITY DEFINER |
| Executable by `authenticated` | **73** |
| Executable by `anon` | **68** |
| With **no ACL at all**, which in PostgreSQL means EXECUTE to PUBLIC | **47** |

### The obvious fix would have been a catastrophe

`authenticated` holds USAGE on `private`. The obvious response is to revoke
EXECUTE across the schema. **That would have locked every person out of their
own data**, because **152 RLS policies across 88 tables call `private.*`
functions**, and a policy expression needs EXECUTE as the **querying** role.

So 22 of the 73 are not a defect. They are load-bearing, and they stay.

**I was one query from filing a security finding whose remedy was an outage.**
The thing that stopped it was asking what the open grants were FOR rather than
only that they were open. A finding is not finished at the moment it looks
alarming.

### What survived the question

Removing the policy callers, the 38 trigger functions (PostgreSQL fires a
trigger **without** checking EXECUTE on the invoking role) and anything in a
check constraint (none) leaves **nine**:

```
grant_staff_role(acting_admin, target_email, new_role)
revoke_staff_role(acting_admin, target_user, old_role)
suspend_agent(acting_admin, target_agent, stop_reason)
reinstate_agent(acting_admin, target_agent, note)
refund_and_cancel_booking(acting_admin, target_booking, refund_amount, ...)
agent_tier(target_agent)
catalogue_refresh_accommodation(p_accommodation)
catalogue_refresh_listing(p_listing)
handle_seed(p_text)
```

**Two of them grant and revoke staff roles. One refunds money.** And every one
of the first five takes **`acting_admin` as a caller argument**, which is the
same shape the four escrow doors were closed for earlier the same day: a
function that believes whoever calls it about who is calling it.

### Not a live breach, and that is part of the record

PostgREST exposes `public` on this project, not `private`, so none of the nine
is reachable over the API today. **The exposure is one configuration change or
one `public` wrapper away**, which is exactly the distance rule 21 exists to
keep. A door that is unlocked but behind another door is still unlocked, and
the second door was never the plan.

### Closed and read back

`anon` and `authenticated` refused on all nine. The migration also **fails if
the 22 policy callers lost their grant**, because that is the outage it was
written to avoid rather than cause.

`authenticated` went 73 to **64**, `anon` 68 to **59**.

### The 38 trigger functions are named, not closed

PostgreSQL does not check EXECUTE when firing a trigger, so revoking on them
should change nothing. **Should is not the standard on this build.** They are
recorded here as a separate piece of work that wants one observation first: a
trigger firing as `authenticated` with the grant removed. Nine closed on
evidence beats forty-seven closed on a belief about the manual.

## 54. ALL SEVEN CRON ROUTES PROVEN, AND THE CHECK-IN CAUGHT MY OWN DEFECT

### The proof, which is the whole point of having scheduled it

```
cron.complete-stays.ok        2026-09-23 02:30:18
cron.inventory-drift.ok       2026-09-23 02:45:45
cron.account-purge.ok         2026-09-23 03:15:07
cron.saved-search-alerts.ok   2026-09-23 07:40:40
```

**All four daily routes ran on their own schedule, unaided, every one clean.**
With `hold-sweep`, `paystack/reconcile` and `pg-cron-watch` already proven
across three hourly cycles, **all seven Vercel cron routes now have an
authorised run.** HANDOFF 05 B4 moves from built to **proven**.

Before the secret rotation the previous successful reconciliation was **29
August**. A 24 day outage, closed and demonstrated rather than asserted.

### And the check-in earned its keep by catching me

`pg-cron-watch` returned `attention` every hour from 00:20 to 07:20. That was
my own change from the night before.

**I rebuilt the 256-row fault one night after removing it.**

`content.filter.empty` was raised on **every run** of an hourly job.
`recordAlert` folds a repeat into an open alert only inside a **ten minute**
window, so each hourly run cleared that window and wrote a **new row**. Nine
identical rows between 23:20 and 07:20, growing, every one of them true.

That is the exact shape that buried the scheduler outage: 256 rows on this same
desk all saying the same true thing, at a volume that made the desk not worth
opening. I spent 22 September removing it, and reintroduced it at 23:20 the
same evening **inside the change meant to stop a silent filter**.

### The rule it produces, which is worth more than the fix

**A STATE IS NOT AN EVENT, AND WRITING ONE AS THE OTHER IS HOW A DESK FILLS
WITH TRUTH NOBODY READS.**

An empty term list does not *happen* hourly. It simply *is*, from the moment
the table shipped empty until somebody seeds it. A state belongs on the desk
**once, open, until it changes**. An event belongs there each time it occurs.
The cron lockout alerts were the same mistake: "the job did not run" was
reported as though it were news on the hour, when it was one standing
condition.

The test for it: **would a person reading the desk want to know this happened
again, or only that it is still true?** If only that it is still true, raise it
once and report the number on every run instead.

### What changed

The raise is conditional on nothing being open for that subject. The term count
still rides in the job's envelope on **every** run, so the fact is **reported
continuously and alerted once**. A failed read of the desk raises rather than
stays silent, because one extra row beats a missing one, which is the rule
`recordAlert`'s own folding already applies.

The nine rows fold into one, and **the oldest is kept deliberately**: it carries
23:20, which is when the condition started being reported, and that is the
number a person wants when they ask how long this has been true. Keeping the
newest would reset that clock every hour, which is its own small lie.

### R12. EMERGENCY. Main has been red since `reads/supply.ts` landed, and a new standing rule now covers it

**Still red, verified at the time of writing.** `lib/trust/agent-badge-derivation.test.ts`:

```
expected [ 'lib/admin/reads/supply.ts' ] to deeply equal []
```

`apps/web/src/lib/admin/reads/supply.ts` selects `verified` from `public.agents`
at line 117 (`verified: a.verified`) and carries it on two row types at lines 51
and 62.

**The badge was deliberately reduced to one derivation, and this is the second
one.** The rule is rule 12: the verified badge means a checked human, and it is
read from the published `agent_badges` row and nowhere else. `agents.verified`
is a different column answering a similar-sounding question. A desk drawing a
tick from it will one day disagree with the public listing and nobody will be
able to say which is right.

**What is asked:** read the badge from `agent_badges` as the rest of the product
does, and drop `verified` from that select. If the Supply desk needs the raw
column for an operational reason, such as showing that a row disagrees with its
badge, it needs a different name on screen and an argument in the file, because
**a column called `verified` drawn as a tick IS the badge whatever the variable
is called.**

---

## A NEW STANDING RULE FOR BOTH SESSIONS, FROM THE FOUNDER, 23 SEPTEMBER

> **A red test on main belongs to whoever notices it.** Raise it first. **If it
> is not green within one cycle, fix it yourself regardless of whose file it
> is. Main staying green outranks the scope split.**

This overrides the file partition in ledger section 51 for this one purpose and
for no other. The partition still governs who BUILDS what; it no longer governs
who may repair a red main.

**The reasoning, which is worth keeping.** A scope boundary is a device for
avoiding collisions between people building things. It was never meant to be a
reason for a broken build to stay broken while two sessions each wait for the
other. A red main costs every worker on the tree at once: it hides the next
regression, it makes every gate ambiguous, and it teaches everybody to read a
failure and move past it. That cost is always larger than the cost of one
session editing one file outside its list and saying so.

**This session's clock on R12 starts now.** If `agent-badge-derivation` is not
green by the end of this cycle, this session fixes `reads/supply.ts` itself and
records the edit here.

---

## 55. R12 CLOSED. MAIN IS GREEN, AND THE EDIT WAS IN SOMEBODY ELSE'S FILE

**The clock ran out and the rule did what it was written to do.** R12 was
raised in the section above and left with Session B for a cycle. At the end of
that cycle `agent-badge-derivation` was still red on main, on the same single
assertion, with the same single offender. Under the founder's standing rule of
23 September this session fixed it. Recorded here because the rule requires the
cross-scope edit to be said out loud, not because it needs forgiving.

**Three files changed, all three Session B's:**

- `apps/web/src/lib/admin/reads/supply.ts`
- `apps/web/src/lib/admin/reads/supply.test.ts`
- `apps/web/src/app/(dev)/preview/session-b/admin-money/fixtures.ts`

Session B: these are yours again the moment you read this. Nothing else in any
of the three was touched, and no figure the supply desk prints has changed.

**What the defect was.** The supply desk's agent read asked `agents` for its
raw `verified` column. That column is not wrong today, but it is a SECOND
derivation of a fact that is allowed exactly one, and the second derivation is
the thing that drifts. The fault this guards against is in the test's own
header: a reader deciding whether to send a deposit to a stranger seeing a tick
in the message thread and no tick on the listing behind it, with no way to tell
which screen was lying.

**The fix.** The select now reaches through to the published row,
`agent_badges(verified)`, which is what every listing surface and the messaging
read already use. A missing embed reads as NOT verified, the same way
`lib/messages/live.ts` treats a missing row: the failure mode of this has to be
a tick that does not appear, never a tick that appears with no check behind it.

**Why this cannot change a number the desk prints, argued from the database
rather than from a passing test.** Both columns are derived from one source, in
the same schema, by triggers that are present and were read back today:

| trigger | on | does |
| --- | --- | --- |
| `agents_derive_badge` | BEFORE INSERT OR UPDATE OF `verification_tier`, `verified` | `new.verified := coalesce(new.verification_tier, 0) >= 1` |
| `agents_sync_badge` | AFTER INSERT OR UPDATE OF `verification_tier` | writes `agent_badges.verified` from the same tier |

with `agents_verified_means_identity_chk` standing behind the first. Two
readings of one tier cannot disagree. The row counts agree as well, but say so
carefully: there is **one** agent on the platform, one badge row, zero
disagreements, zero agents without a badge row. One row is not evidence at
scale. The triggers and the constraint are.

**RLS was checked before the swap, because an embed that RLS refuses would not
error, it would return null and quietly unverify every agent on the desk.**
That is the blind-light pattern with a tick on the end of it.
`agent_badges_select_all` is `for select using (true)` to `public`, so the
admin's RLS client reads it. This was the one way the change could have been
silently wrong and it is closed.

**UNPROVEN, and named as such.** The PostgREST embed itself was NOT exercised
over HTTP from this box: `uccixoonmbhrnyczyigt.supabase.co` is still refused by
the sandbox egress proxy (`CONNECT tunnel failed, response 403`). What is
proven is the foreign key `agent_badges_agent_id_fkey`, one-to-one on
`agents.id`, and that the identical embed string is already shipped and running
in `lib/messages/live.ts`. That is strong, and it is still not the same thing
as a 200 with a body. It becomes provable the moment that host is allowed
through Network access.

**Green:** `agent-badge-derivation` 7 of 7, `supply.test.ts` 8 of 8,
`tsc --noEmit` on `@vallo/web` exit 0 read from the compiler's own status and
not from a pipe.

---

## 56. THE QUEUE, WRITTEN BEFORE THE CURRENT SCOPES CLOSE

The founder's instruction on 23 September: *"every worker has its next scope
written before the current one closes, and the lead queues ahead rather than
behind."* This is that queue. It is written now, while all six workers are
mid-scope, so that none of them has to wait on this session to think.

**A worker takes its next block the moment its current one is green and pushed.
It does not report back and wait.** It reports by pushing, and it reports in
its own section of this ledger.

| worker | current | next, already decided |
| --- | --- | --- |
| NAV | 22 routes with a declared parent and no back control, then walk all 22 including Android hardware back | The routes with NO declared parent. Decide each one's parent from the map, wire it, walk it. A route that genuinely has no parent is recorded as such with the reason, not left silent. |
| JUNCTION | the email junction, 8 escrow emails, 9 unreachable senders, payment-instrument emails | The welcome email and the 10 unsent product emails through that same junction, then ONE real send to a real inbox, read back from the provider's own log. Until that, the junction is unproven however many callers it has. |
| ESCROW2 | evidence upload, proposal inside a thread, the HTTP half of P-7, the ADR | Run all nine probes in BOTH directions and record each verdict, pass or fail, in a table. The founder's sentence stands until then: *no naira moves until all nine probes pass in both directions.* |
| PUSH | the database half, landed | The service worker, the subscription handshake, and a delivery a human confirms on a handset. 6% is the ceiling until then: the founder's rule is that it stays at 6 *until a real notification reaches a real device.* |
| SHARE | Track G's last prop, then Price Check's share surface | A test that FAILS if a share artefact ever carries a specific address, for anybody, on any surface. The rule is absolute and it needs a guard, not a habit. |
| PAPER | the contrast failures in light mode | The register of twinless objects: which surfaces are legible on paper as they stand, and which genuinely need artwork the founder has to commission. Commissioning is his. Naming the list is ours. |

**And the standing item that no worker owns, said again because the founder
asked for it in every report:** 64 published listings, all 64 examples, real
supply zero, bookings ever zero. No engineering on this list moves that number.
