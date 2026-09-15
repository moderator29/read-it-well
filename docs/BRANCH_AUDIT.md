# Branch audit, 15 September 2026

Written before a single branch was deleted, because that is what makes a delete
reversible. **Every head SHA below is recorded. A deleted branch can be restored
from its SHA with `git branch <name> <sha>` for as long as the object survives
in the remote, and GitHub keeps unreferenced objects for a period after a
branch is removed.** Without the SHA the delete is final, which is the whole
reason this file exists and is pushed first.

Counted live with `git fetch origin --prune` on 15 September 2026. Fifteen
remote branches, being `main` plus fourteen others.

---

## 1. The finding that changes how this audit reads

`docs/HANDOFF_02_PLATFORM.md` section 3.3 lists ten branches as "commits ahead
of main", the largest at 474. That number is real but it does not mean what it
looks like it means, and acting on the surface reading would have been a
mistake.

**Ten of the fourteen branches share no common ancestor with `main` at all.**

```
$ git merge-base origin/main origin/claude/master-autonomous-engineering-os-c4guqi
(empty, exit 1)
$ git diff origin/main...origin/claude/master-autonomous-engineering-os-c4guqi
fatal: no merge base
```

`main` has **84 commits** and its root commit is `423d52bc67b8dd609bf2cdecd1ec523bb9d399c5`,
dated **7 August 2026**, with the message "Merge main". Every one of the ten
stale branches roots at `1bc88091`, a different and older root.

So the history was restarted on 7 August. `main` was created as a fresh orphan
snapshot of the project as it then stood, and the pre-restart history was left
behind on the branches that were open at the time. **"474 commits ahead" is not
474 commits of held-back work. It is the entire pre-restart history of the
project, the content of which was folded into `main`'s root commit.**

This is why `git rev-list --count origin/main..<branch>` returns a large number
for every one of them and why none of them can be merged without
`--allow-unrelated-histories`. It is also strong independent evidence for the
founder's rule that everything which needs to be in `main` is already in `main`.

### What each branch would do to `main` if it were adopted

Measured with `git diff --shortstat origin/main..<branch>`, which reads as "what
changes if `main`'s tree became this branch's tree".

| Branch | Files | Insertions | Deletions |
| --- | ---: | ---: | ---: |
| `claude/master-autonomous-engineering-os-c4guqi` | 583 | 17,040 | **62,756** |
| `claude/platform-premium-ui-audit-vtpvtc` | 821 | 17,866 | **86,352** |
| `claude/rentme-social-and-polish` | 823 | 22,211 | **90,921** |
| `fix/main-social-regressions` | 1,042 | 25,610 | **133,669** |
| `claude/rentme-social-design-je796y` | 1,047 | 25,750 | **133,994** |
| `primitives-wip` | 1,195 | 23,861 | **175,207** |
| `integration/rentme-next` | 1,224 | 24,219 | **189,183** |
| `claude/rentme-loop-closure-pb0ird` | 1,309 | 19,945 | **202,865** |
| `claude/repo-cleanup-1spitz` | 1,347 | 14,770 | **227,188** |
| `feat/naijafinds-brand-system` | 1,380 | 6,792 | **236,701** |

Every single one is overwhelmingly deletion. They are all strictly **older and
smaller** snapshots of the same project. The deletion column is how much of the
current platform each one would remove. Nothing in this table is held-back work.

---

## 2. What is on those branches and not on `main`

The union of files present on at least one stale branch and absent from `main`
is **57 files**. Rather than accept that as 57 pieces of lost work, each was
read. They fall into five groups and **four of the five are things that were
deliberately deleted from the product.**

### 2.1 Third-party inventory code, deleted by decision (ADR-013)

```
apps/web/src/lib/inventory/index.ts, types.ts, http.ts, dedupe.ts, mapping.ts
apps/web/src/lib/inventory/providers/liteapi.ts, liteapi-prebook.ts, places.ts, amadeus.ts
apps/web/src/lib/inventory/**/*.test.ts
apps/web/src/app/api/partner-stay/route.ts
apps/web/src/components/app/listing/BookPartnerStay.tsx
apps/web/src/app/api/admin/inventory/route.ts
docs/HYBRID_INVENTORY.md
```

This is the LiteAPI, Google Places and Amadeus provider layer. `RECOMMENDATIONS.md`
S-2 records it being removed: 6,043 lines of provider code, the `places_cache`
table with its 243 rows of cached Google payloads, `partner_stay_intents`, and
the `hybrid_hotels` and `hybrid_restaurants` feature flags, all gone in migration
`20260809090000_nothing_here_came_from_somewhere_else` and commit `0ec6656`.

**First-party inventory only is the whole argument of the platform.** Restoring
any of this would undo the decision, not recover lost work.

### 2.2 The deleted icon components

```
apps/web/src/design-system/icons/Icon.tsx
apps/web/src/design-system/icons/Icon3D.tsx
apps/web/src/design-system/icons/glyphs.ts
apps/web/src/components/app/assistant/glyphs.tsx
```

`Icon` and `Icon3D` are **deleted, not retired**, and the pre-commit grep for
`Icon3D` is supposed to return empty. `docs/HANDOFF_02_PLATFORM.md` section 3.3
warned in advance that a six-week-old branch "could resurrect deleted
subsystems, the orange palette and the `Icon3D` component that is supposed to be
gone". **That warning is confirmed, with file paths.**

### 2.3 The superseded visual direction

```
apps/web/src/design-system/scenes/HeroIsland.tsx
apps/web/src/design-system/scenes/IsometricIsland.tsx
apps/web/src/components/app/filters/CategoryTiles.tsx
apps/web/src/components/app/DesktopDock.tsx
```

The island and tile language from `docs/archive/ui-audit/00-reference-brief.md`,
which is stamped superseded and is recorded as the direct cause of visual clutter
that is still being removed.

### 2.4 The fabricated catalogue

```
apps/web/src/lib/demo/bookings.ts
```

This repository once shipped twenty-three invented places, twenty-two of them
carrying `verified: true` with fabricated ratings on addresses that do not exist.
That is the single worst thing this codebase has done and it is not coming back.

### 2.5 Pre-restart versions of files `main` has since rewritten

```
apps/web/src/app/agents/page.tsx, agents/apply/page.tsx, agents/status/*
apps/web/src/app/home/page.tsx, search/page.tsx, auth/callback/route.ts
apps/web/src/components/auth/AuthPanel.tsx, ProviderMarks.tsx
apps/web/src/components/site/Onboarding.tsx
apps/web/src/components/app/messages/ConversationList.tsx, LiveThreadList.tsx
apps/web/src/components/app/wallet/WalletActions.tsx, SecurityNote.tsx
apps/web/src/components/app/listing/ListingPriceCard.tsx
apps/web/src/components/app/NotificationsList.tsx
apps/web/src/components/app/bookings/BookingsTabs.tsx
apps/web/src/lib/agent/repository.ts
apps/web/src/lib/maps/travel-time.ts and travel-time.test.ts
apps/web/src/app/api/travel-time/route.ts
docs/MASTER_TODO.md, docs/NEXT_SESSION_PROMPT.md, docs/POLISH_PASS.md
```

These exist on `main` under different paths, in rewritten form, or in
`docs/archive/`. Verified individually:

- **`TravelTime` is alive on `main`** at
  `apps/web/src/components/app/listing/TravelTime.tsx` and is imported and
  rendered by `apps/web/src/app/(app)/listing/[id]/page.tsx`. The branch version
  is the Google Routes API provider behind it, which went with ADR-013. This is
  the exact trap section 16 flags: do not delete, or restore, something because
  of how it looks from the outside.
- **`docs/MASTER_TODO.md`, `NEXT_SESSION_PROMPT.md`, `POLISH_PASS.md` and
  `HYBRID_INVENTORY.md` are all present on `main` in `docs/archive/`.** Nothing
  is lost.

### 2.6 The one genuine loss, and it is not adoptable as it stands

```
apps/web/tests/email-render.spec.mjs
```

335 lines, on `claude/master-autonomous-engineering-os-c4guqi` at
`82de53e513e61c5538c763155ac09ff3bc2ba2ee`, and **absent from `main`**, which
carries 83 specs and no email spec at all. `RECOMMENDATIONS.md` S-4 still cites
`email-render.spec.mjs:266` as one of four specs enforcing the banned-word rule,
so the file is referenced by a document that believes it exists.

It is a good spec. It checks that no message carries an em dash, that the palette
anchors are the navy and electric blue ones with no purple family colour
anywhere, that no copy says fee, that no copy hedges with demo or sample or
preview, that the fragments are email safe with inline styles and no script, and
that nothing can send without `RESEND_API_KEY`.

**It was recovered and run against the current tree rather than assumed.**

```
$ node apps/web/tests/email-render.spec.mjs
48/74 checks passed, 26 failed
```

The failures read `found 0` over and over: 0 messages with a subject where it
expects 9, 0 send sites where it expects several, 0 of 6 palette anchors present.
A spec that finds zero of everything is not describing a broken product, it is
describing **a different product**. `src/lib/email/` was substantially rewritten
after this branch diverged and the spec's regexes no longer match the shape of
the source it reads.

**Decision: not cherry-picked.** Adopting it would put 26 failing checks into
`main`, and `docs/HANDOFF_02_PLATFORM.md` section 11 is explicit that a failing
spec means deciding honestly whether the product or the spec is wrong, and that
a test is never skipped or quarantined to reach green. Here the spec is wrong,
and rewriting 335 lines of assertions against the current email module is real
work, not a cherry-pick.

**It is filed as a recommendation instead, and the SHA above is how to get it
back.** The four copy invariants it enforces are worth having and nothing in the
tree enforces them today.

---

## 3. What was cherry-picked

One branch, `claude/rentme-v2-platform-audit-xuvg0a`, is not from the old
history. It branched from `5b389e4` on 14 September 2026 and carries five
commits of genuine, current work. **All five were cherry-picked onto the working
branch before anything was deleted.**

| SHA on the source branch | Commit |
| --- | --- |
| `fd91043` | docs: add COMPANY.md covering the corporate, capital and compliance side |
| `838f11c` | docs: split the handoff in two, company and platform |
| `eda0c4e` | docs: make HANDOFF 02 an autonomous two-track brief |
| `d6a7ad3` | legal: the controller is VALLO SPACES LTD, and a retention schedule |
| `edc8def` | docs: brand marks for the transaction set, and the real branch rule |

That brought in `docs/HANDOFF_01_COMPANY.md`, `docs/HANDOFF_02_PLATFORM.md`,
`docs/BRAND_MARKS.md`, `docs/RETENTION_SCHEDULE.md`,
`apps/web/src/lib/legal/company.ts` and the controller-identity corrections to
`privacy.tsx` and `terms.tsx`. All five applied cleanly with no conflict.

**Nothing else on any branch was judged worth cherry-picking**, and section 2
is the evidence for that rather than an assertion.

---

## 4. The register: every branch, its SHA, its verdict

`ahead` and `behind` are `git rev-list --count`. For the ten branches with no
merge base, `ahead` is the size of the unrelated history, not held-back work.
`merged` is `git merge-base --is-ancestor <branch> origin/main`.

### Keep

| Branch | Head SHA | Last commit | Verdict and reason |
| --- | --- | --- | --- |
| `main` | `a41b9c1b7d096ee3a105e01a1594c63881e68568` | 2026-09-14 | **Keep.** The deploy branch. Vercel builds from it. Head is the founder's upload of the new Vallo logo |
| `claude/zealous-brown-gn45mg` | (this session) | 2026-09-15 | **Keep.** The working branch for this session |
| `claude/rentme-v2-platform-audit-xuvg0a` | `edc8def575fcd6dc4b5305d928bec3bc7f11d7e9` | 2026-09-14 | **Keep for now, delete once Track A lands on `main`.** All five commits are cherry-picked, so it is superseded rather than lost, but it carried unmerged work at the moment this audit was written and section 3.2 of the handoff makes that a stop-and-ask. Its content reaches `main` through this session's push, at which point the delete is free |

### Delete: fully merged into `main`, nothing can be lost

`git merge-base --is-ancestor` returns true for all three. Each is an ancestor of
`main` and contributes zero commits `main` does not already have.

| Branch | Head SHA | Ahead | Last commit | Verdict and reason |
| --- | --- | ---: | --- | --- |
| `claude/greeting-4np7sj` | `5b389e48f469c5aef13a5a4a2dc6968865e97dc5` | 0 | 2026-08-12 | **Delete.** Merged. This SHA is literally `main`'s parent commit |
| `claude/rentme-data-sourcing-arch-birz8q` | `4c5e35d60b6d018ded7bf3c062295f86c82849fe` | 0 | 2026-08-07 | **Delete.** Merged. Ancestor of `main` |
| `claude/rentme-polish-pass-p4808t` | `5157d3979073d2dcf79d1e9c4cb6c736c2d66d39` | 0 | 2026-08-07 | **Delete.** Merged. Ancestor of `main` |

### Delete: pre-restart history, superseded by `main`'s root snapshot

No merge base with `main`. Every one is a strictly older and smaller snapshot,
and adopting any would delete between 62,756 and 236,701 lines of the current
platform. Contents assessed in section 2.

| Branch | Head SHA | Commits | Last commit | Verdict and reason |
| --- | --- | ---: | --- | --- |
| `claude/master-autonomous-engineering-os-c4guqi` | `82de53e513e61c5538c763155ac09ff3bc2ba2ee` | 474 | 2026-08-07 | **Delete.** Unrelated history. Would remove 62,756 lines. Carries `Icon3D`, the inventory providers and the demo bookings. Holds `email-render.spec.mjs`, recovered, run, 26 of 74 checks fail against the current tree, filed as a recommendation instead |
| `claude/platform-premium-ui-audit-vtpvtc` | `dd4bfc8c8f9c75760ad0ff96e151b8889979c146` | 405 | 2026-08-06 | **Delete.** Unrelated history. Would remove 86,352 lines. The UI direction on it is the superseded reference brief, stamped as the cause of clutter still being removed |
| `claude/rentme-social-and-polish` | `a39411c762c2b6e8c731b4387f7a8afd6de6dedd` | 402 | 2026-08-06 | **Delete.** Unrelated history. Would remove 90,921 lines. Predates the social layer that shipped in August, so it is the plan, not the build |
| `fix/main-social-regressions` | `72fd5272f07deb7023dc16b42e23d59ba66d2456` | 219 | 2026-08-05 | **Delete.** Unrelated history. Would remove 133,669 lines. Fixes regressions in a version of the social layer that no longer exists |
| `claude/rentme-social-design-je796y` | `de313f8b396aa897f7d58324444041bee9126d3a` | 214 | 2026-08-04 | **Delete.** Unrelated history. Would remove 133,994 lines. Superseded by `docs/SOCIAL_DESIGN.md`, which records the five ways the shipped shape moved from this plan |
| `primitives-wip` | `4eeed21adb772e4e1d3becbcbb1736aa0326244b` | 197 | 2026-08-05 | **Delete.** Unrelated history. Would remove 175,207 lines. `components/ui/` now holds 12 settled primitives |
| `integration/rentme-next` | `ba5613813cc0559a77e626e1957c29817ce87908` | 153 | 2026-08-01 | **Delete.** Unrelated history. Would remove 189,183 lines. An integration branch for an integration that the 7 August restart performed |
| `claude/rentme-loop-closure-pb0ird` | `45c1ad1e0ddbc2b6a203cd4aaabca9251598dcc9` | 116 | 2026-07-30 | **Delete.** Unrelated history. Would remove 202,865 lines. The loops it was closing are closed and proven end to end against live Postgres |
| `claude/repo-cleanup-1spitz` | `06772da2767bc648408454096cf49984ff6e0d00` | 83 | 2026-07-28 | **Delete.** Unrelated history. Would remove 227,188 lines |
| `feat/naijafinds-brand-system` | `bb9d7c9b6b17cf549529dc91d3620077e352b435` | 30 | 2026-07-28 | **Delete.** Unrelated history. Would remove 236,701 lines. It is a brand system for **NaijaFinds**, a name the company no longer uses. The brand is Vallo and the registered company is VALLO SPACES LTD |

---

## 5. What was actually done, in order

1. `git fetch origin --prune`, and the branch list counted live rather than
   taken from the handoff.
2. Head SHA, commit count, last commit date and merged state recorded for all
   fourteen non-`main` branches, before any delete.
3. Merge base checked per branch, which is what surfaced the unrelated-history
   finding in section 1.
4. `git diff --shortstat` per branch against `main`, to measure what adopting
   each one would cost rather than guess.
5. The 57 files unique to the stale branches listed and read, and grouped in
   section 2.
6. `email-render.spec.mjs` recovered, executed, its output read, and the working
   copy removed again. Not adopted, and the reason is stated rather than the
   file quietly dropped.
7. Five commits cherry-picked from `claude/rentme-v2-platform-audit-xuvg0a`.
8. This file written and pushed **before** the first delete.

## 6. What was not done

- **The 474 commits were not read individually.** Nor were the other nine
  histories, commit by commit. What was read is the complete set of files each
  branch holds that `main` does not, which is the set that could contain
  something lost. Reading 2,393 commits across ten abandoned histories is not a
  proportionate use of a session and the handoff says so directly.
- **No claim is made that every line on those branches is worthless.** The claim
  is narrower and it is evidenced: every file on them that `main` lacks was
  either deliberately deleted by a recorded decision, or is a superseded version
  of a file `main` has rewritten, or is the one stale spec in section 2.6.
- The restore window on a deleted remote branch was not tested. The SHAs are
  recorded on the assumption that recovery is wanted quickly if at all.

---

## 6b. The deletes did not happen, and why

**This section was added after the attempt. Nothing in the register above has
been carried out: all fourteen branches still exist on the remote.**

`docs/BRANCH_AUDIT.md` was committed and pushed first, as section 5 says, and
then every delete was refused:

```
$ git push origin --delete claude/greeting-4np7sj
error: RPC failed; HTTP 403 curl 22 The requested URL returned error: 403
```

The same 403 for all three fully merged branches, which are the safest deletes
available: each is an ancestor of `main` and contributes nothing `main` does not
already have. **The refusal is the environment, not the branches.** The git
proxy in this session permits pushing a branch and refuses deleting a ref, and
the GitHub tooling available here has `create_branch` and `list_branches` but no
delete-branch operation at all. There is no third route.

**So the branches are not deleted and this file does not claim they are.** The
analysis stands, the SHAs are recorded, and the verdicts are ready to act on.

### To carry it out, from a machine with normal push rights

```
git fetch origin --prune

# The three that are fully merged. Nothing can be lost.
git push origin --delete claude/greeting-4np7sj
git push origin --delete claude/rentme-data-sourcing-arch-birz8q
git push origin --delete claude/rentme-polish-pass-p4808t

# The ten from the pre-restart history. Section 2 is the evidence.
git push origin --delete claude/master-autonomous-engineering-os-c4guqi
git push origin --delete claude/platform-premium-ui-audit-vtpvtc
git push origin --delete claude/rentme-social-and-polish
git push origin --delete fix/main-social-regressions
git push origin --delete claude/rentme-social-design-je796y
git push origin --delete primitives-wip
git push origin --delete integration/rentme-next
git push origin --delete claude/rentme-loop-closure-pb0ird
git push origin --delete claude/repo-cleanup-1spitz
git push origin --delete feat/naijafinds-brand-system

# And this one only once Track A is on main, which makes it fully merged.
git push origin --delete claude/rentme-v2-platform-audit-xuvg0a
```

They can also be deleted from the repository's Branches page on GitHub, which
is the same operation through a different door.

**To undo any one of them**, take its head SHA from section 4 and run
`git push origin <sha>:refs/heads/<branch-name>`. That is what the SHAs are for
and it is why this file was written before anything was attempted rather than
after.

---

## 7. Going forward

**One working branch at a time.** Fourteen branches accumulated because each
session opened its own and none closed it. Merge to `main` and delete the branch
in the same session that created it.

And **do not restart the history again.** The 7 August restart is why this audit
needed to establish, from first principles, that ten branches were not holding
six weeks of work hostage. A squash merge or a fresh orphan snapshot saves a
little noise now and costs exactly this later.
