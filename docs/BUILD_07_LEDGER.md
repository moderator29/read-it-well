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
| (none closed yet this build) | | | | |

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
