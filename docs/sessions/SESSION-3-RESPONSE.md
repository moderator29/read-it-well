# Session 3 response: the experience upgrade

**Branch:** `claude/vallo-experience-upgrade`, cut from `main` at `ef1265135`.
**Started:** 6 October 2026. **Status:** in progress, kept current as work lands.

This file is Session 3's only voice. It is written as work happens, not at the end.

---

## 0. Before any work: what was verified

| Claim or assumption | Checked how | Finding |
|---|---|---|
| The reading list exists on `main` | `git ls-tree origin/main` | **It does not.** `DIRECTIVES-2026-10-05.md`, `SESSION-3-HANDOFF.md`, the north star, the craft doctrine, the component library, the motion system and the contract live only on Session 1's branch `claude/rentme-v2-platform-audit-xuvg0a` (18 commits ahead of `main`, 0 behind). Read from there with `git show`. Not merged into this branch: Session 1's documents are Session 1's to land |
| Session 2's response file | Every remote branch searched | **No Session 2 branch and no `SESSION-2-RESPONSE.md` exist.** Nothing Session 2 owns has landed |
| The `/open` deadline fix (D31) | `apps/web/src/app/open/route.ts` | **Not landed.** `resolveSession()` is still awaited with no deadline. Per the contract the startup sequence is **not started**. Request R-1 below |
| The founder's component library source | `git grep DragToConfirm` across every branch | **The source is not in the repository**, only its description in `COMPONENT_LIBRARY.md`. The ports are therefore Vallo-native builds against that specification rather than edits of pasted code, which also removes any risk of the hardcoded hex, lucide, invented data and spinners reaching the tree |
| The 12 asset sheets | `git hash-object` | The 12 PNGs at the repository root on `main` are byte-identical to `docs/design/assets-raw/2026-10-06/` on Session 1's branch |
| Baseline gates on untouched `main` | `npm run typecheck`, `npm run lint`, `npm test` | **All green.** 690 test files, 8,791 tests passed, 1 skipped |
| A wallet or escrow surface to upgrade | `src/app/(app)` route list | **None exists.** Both depend on Session 2's financial schema (contract section 5) |

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

The i18n locale files have one owner, B3. Every other agent that needs a key writes
it into its report and B3 or the lead adds it.

## 2. Requests to Session 2

Numbered per the contract handshake. Each says what, the shape, who consumes it,
and whether it blocks.

| # | Need | Shape | Consumer | Blocks |
|---|---|---|---|---|
| R-1 | The `/open` deadline (D31) | `resolveSession()` in `app/open/route.ts` bounded by a deadline that is not a timer pretending to be readiness; on deadline, route to the signed-out start and let the client resolve | The startup sequence, MOTION_SYSTEM section 3 | **Yes**, the startup sequence only. Everything else proceeds |

(Further requests are appended as agents report them.)

---

## Completed

(In progress.)

## Changed

(In progress.)

## Tested

Baseline on `main` before any change: typecheck, lint and 8,791 tests green.

## Failed

(None yet.)

## Remaining

(In progress.)

## Decisions

1. **Branch from `main`, read the specs from Session 1's branch rather than merging
   it.** The founder's prompt says to branch from `main`; merging Session 1's 18
   commits here would make this branch carry another session's work.
2. **The startup sequence waits for R-1**, exactly as the contract orders. Its
   prerequisites (the vector mark, the `open` threshold kind, Get Started built to
   inherit the settled lockup) do not wait.

## Risks

(In progress.)

## Next Session

(In progress.)

## Do Not Repeat

(In progress.)
