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
| Leaked password protection | One click in the Supabase dashboard. Still disabled. |
| `NEXT_PUBLIC_MAPTILER_KEY` | Unset, so a commercial marketplace is serving non commercial basemap tiles. |
| Real supply | 64 listings, 64 published, 64 of 64 `is_demo`. The engine is real and the shop is empty. Ours is to stop the product claiming otherwise. |
| The deep link fingerprints | `assetlinks.json` carries two placeholder SHA-256 values and the Apple file carries `PLACEHOLDER_REPLACE_WITH_APPLE_TEAM_ID`. They come from his keystore and his developer account. Ours is to make the failure LOUD rather than silent. |
| A demo account for the stores | Both stores require credentials a reviewer can sign in with. Ours is the seeding script, ready the moment he supplies the login. |
| The solicitor's answer on custody | No code path that places the company in custody of third party naira ships until it is recorded here. |
| `agents.verified` | Now a derived copy of `agent_badges.verified`. Dropping the column is data-losing and on the stop list. |
| The completed credit colour | The render draws it cyan, ours is emerald, and our colour law reserves cyan for PENDING. Emerald stays and the render is recorded as carrying a mistake unless he rules otherwise. |
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
| `/cancellations` | none, inherits the register | `a2/cancellations-390-{dark,light}.png` | 0 breaches at 390 and 1536, dark and light | A2 |
| `/privacy` | none, inherits the register | `a2/privacy-390-{dark,light}.png` | 0 breaches at 390 and 1536 | A2 |
| `/terms` | none, inherits the register | `a2/terms-390-{dark,light}.png` | 0 breaches at 390 and 1536 | A2 |
| `/verification` | none, inherits the register | `a2/verification-390-{dark,light}.png` | 0 breaches at 390 and 1536 | A2 |
| The offline card, `apps/web/native-shell/index.html` | none, inherits the register; drawn to it for the first time | `a2/native-shell-no-connection-390-{dark,light}.png`, `a2/native-shell-no-server-390-{dark,light}.png` | measured in the browser: plate 0.27, button 0.28, card 0.07, note 0.12; the only circle is the explanatory glyph | A2 |
| The dock with the raised centre switch, on `/home` | `GOVERNING-01` screen one | `b1/dock-390-dark.png`, taken on `next start` at `6b7e21f` | dock object 18 on 52 = 0.346 | B1 |
| The Switch profile sheet | `GOVERNING-01` screen two | `b1/sheet-390-dark.png` | row marks 14 on 44 = 0.318; standing label 6 on 25 = 0.244 | B1 |
| The side drawer's Switch profile row | `GOVERNING-01` screen three | `b1/drawer-390-dark.png` | row 14 on 56 = 0.25 | B1 |


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

**What A2 did NOT close, said plainly.** `/welcome`, `/saved`,
`/saved/searches`, `/trips`, `/notifications`, `/profile/setup`,
`/legal/privacy`, `/legal/terms` and `/docs/[slug]` carry no row above.
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
Crypto `/crypto`, AI Assistant `/assistant`; the workspace rows Agent Mode
`/agent/dashboard` and Console `/admin` for those who hold them; and the tail,
Add a workspace `/profile/setup` and Settings `/settings`. On the Stays side
Stays `/stays`, Explore `/stays/search` and Trips `/trips` replace their three
twins. Plus the foot: Switch profile (new), the coin, the theme row and the
legal row. `b1/more-proof` walks the open drawer on a production server and
fetches every `href` it draws.

**B1's register extensions, recorded so they can be checked.** `GOVERNING-01`
and `02` govern everything this scope drew except three pieces of anatomy the
set uses everywhere and draws nowhere in isolation: the progress row of small
filled rectangles (`.nf-steprow`), the calm explanatory panel with its small
round glyph (`.nf-calmpanel`), and the workspace standing label
(`.nf-switch-standing`). All three are built from the register and the last is
the one the renders draw as a capsule.

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

---

## 9. Two faults in the lead's own method, found today

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
