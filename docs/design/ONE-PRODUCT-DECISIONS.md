# One product, not twelve: the decisions (7 October 2026, D70)

Handoff section A.16 asks for each of these to be decided once, written down, and
handed to every agent. This file is that answer. It sharpens
`CLEAN_UNIFIED_DIRECTION.md` and does not replace it: where that file already ruled,
the ruling is cited rather than restated. Later entries in
`docs/sessions/DIRECTIVES-2026-10-05.md` beat this file.

Two founder rulings sit above every row: **dark stays the default**, and **the
container system is refined, not replaced.**

The test for whether this worked: somebody landing on a screen they have never seen
can predict what its controls do.

| Question | The one answer | Where it lives |
| --- | --- | --- |
| How does a list of things look? | `ListGroup` with its row variants (plain, with plate, with figure, with chevron). No page builds its own row. Grouped list spec: `CLEAN_UNIFIED_DIRECTION.md` section 5. | `components/ui/ListGroup.tsx` |
| How is a figure presented? | `Money` for any naira amount, `Amount` or `Odometer` when it counts, `HeroFigure` for the one big number a screen is for. Always `--nf-font-numeric` with tabular figures, so columns align. A currency is shown one way: the naira sign, grouped thousands, no kobo unless the amount has kobo. A change is a signed figure plus a word, never colour alone. | `components/ui/Money.tsx`, `HeroFigure.tsx` |
| How does a sheet arrive and leave? | `Sheet`, always. Arrival on the spring in `ported-motion.ts`, exit slower on `leave`, one backdrop (the existing scrim token). Hand rolled sheets are refused by `hand-rolled-sheets.test.ts`; keep it that way. | `components/ui/Sheet.tsx` |
| How does an identity appear? | One identity header with two states: **mine** (edit controls) and **theirs** (follow, message). Used on `/profile`, `/u/[handle]`, and the lister block on a listing. Never two designs for one person. | Agent 2 builds it; A.7 |
| How does back behave? | `BackControl` everywhere. On web it goes to the route parent from `lib/nav/route-parents.ts` when there is no history; on native it follows the hardware back. One control, one rule. | `components/ui/BackControl.tsx` |
| What does an empty state look like? | `State` with its four designed states: empty, loading, error, success. Empty states always offer the next step. Loading is a skeleton of the real structure, never a spinner on an empty field. | `components/ui/State.tsx`, `Skeleton.tsx` |
| How is something destructive confirmed? | `DragToConfirm`, everywhere. Money movements (withdraw, transfer, release) also use it. No browser `confirm()`, no dialog in one place and a drag in another. | `components/ui/DragToConfirm.tsx` |
| How does a page begin? | One entrance, coordinated by `--nf-splash-hold`: structure in the first frame, content rising with a stagger of at most 60ms, background at 0.6 times foreground speed. No page invents its own entrance. | `animation.css` and the route CSS that reads the hold |
| Where does a feature's navigation live? | Top level destinations in the side navigation (`nav-model.ts`, grouped below). Inside a feature, `InnerNav` (the glass bar). Never a second drawer. | `components/app/nav-model.ts`, `components/ui/InnerNav.tsx` |
| How is a paid feature gated? | One pattern: the feature is visible, its value is shown, and the gate is a single plain sheet saying what it costs and what it unlocks. Never hidden, never a dead button. | A.11 |
| How many type sizes on one screen? | At most four: one display or figure, one title, body, and caption. | `tokens.css` type scale |
| Elevation | Three levels, each with a meaning: **base** (the page), **raised** (a card in the page), **floating** (glass: above content, sheets, the dock, the island). Glass means "floats above content" and nothing else. | `tokens.css` |
| Radius | One per role: `--nf-radius-card`, `--nf-radius-control`, `--nf-radius-button`, `--nf-radius-badge`, `--nf-radius-island`, `--nf-radius-circle`. No literal radius. | radii guard |
| Motion | Five things move beautifully, everything else is still. Entrances on `land`, exits on `leave`. Reduced motion, Calm, Off and save-data get a settled frame. | `MOTION_SYSTEM.md` |
| Sound and haptics | Haptics on presses that matter (`@capacitor/haptics`). Audible sound only on payoff moments, off by default, respecting the silent switch. | A.14 |

## The side navigation, decided once

Every agent that adds a destination adds it to one of these groups and nowhere else.

| Group | Rows | Who sees it |
| --- | --- | --- |
| (no heading, hidden on phones because the dock carries it) | Home, Search, Feed | Everyone |
| Account | Plans, Messages, Notifications, Saved, Agreements, AI Assistant | Signed in |
| **Money** | Payments, Receipts, Payouts, Refunds, Rewards, Invite friends. The wallet and withdrawal surfaces join this group when the provider adapter stands behind them. | Signed in |
| (no heading) | Price check | Signed in, Property side |
| Workspaces | Agent mode, Host console, Console | Only to somebody who holds one |
| (no heading) | Add a workspace, Help and support, Settings | Signed in (Help for everyone) |

A destination that exists and is not in this table, and is not reachable from a row in
it within two taps, is a finding for the route audit (`docs/sessions/SESSION-REPORT.md`).
