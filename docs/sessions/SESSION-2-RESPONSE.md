# Session 2 response: backend, money, trust, data

Branch: `claude/vallo-backend-money-trust`, cut from `main` at `ef12651`.
Kept current as work lands. Latest entry first under each heading.

## Status for other sessions

- **Session 3: `/open` is unblocked.** `apps/web/src/app/open/route.ts` now races
  `resolveSession()` against a 3000 ms deadline and falls back to the auth cookie,
  the same fix as `home-or-landing` at `f82f2148f`. Commit `0bf5a642e`. The route
  always answers a 307 with `no-store` within 3 s. Your startup animation can
  assume the first navigation completes.

## Note on where the brief lives

The four documents named in the brief (`DIRECTIVES-2026-10-05.md`,
`SESSION-2-HANDOFF.md`, `CROSS-SESSION-CONTRACT.md`,
`VALLO_PAYMENTS_ARCHITECTURE.md`) are **not on `main`**. They exist only on
`claude/rentme-v2-platform-audit-xuvg0a` (17 commits ahead of `main`). I read them
from there. This branch is cut from `main` as instructed, so it does not carry them;
whoever merges Session 1's branch brings them in. I do not edit them on this branch,
to avoid a cross-branch conflict; corrections to the payments architecture will be
written here as a separate file and noted.

## Payluk: what Session 1 got wrong

Open. The live documentation has not been read yet in this session. No Payluk code
has been written.

## The twelve questions (architecture section 7)

Open. **Question 3 (can a funded escrow be refunded without a dispute?) is still
unanswered**, and the cancellation path is not being built until it is.

## Migrations

None written or applied.

## Review passes per money change

No money change yet. `/open` is an auth-routing fix, not money; it was still checked
twice: the new test passes 5/5 against the new route and fails 3/5 against the old
one (the three deadline cases time out at 5 s), proving it catches the hang.

## Built plain for Session 3 to dress

Nothing yet.

## Blocked on the founder

- `PAYSTACK_GUARANTEE_SUBACCOUNT` (live). Not blocking: test mode reads
  `PAYSTACK_TEST_GUARANTEE_SUBACCOUNT`.
- Termii keys, for the phone gate switch-on.

## Classification of what was touched

| Item | Class |
|---|---|
| `app/open/route.ts` | HARDEN |

---

## Completed

- `/open` deadline with a test (acceptance criterion 1). Commit `0bf5a642e`.

## Changed

- `apps/web/src/app/open/route.ts`: deadline race plus cookie guess.
- `apps/web/src/app/open/route.test.ts`: new, five cases.

## Tested

- `vitest` unit project: 669 files, 8,634 passed, 1 skipped. DOM project: 162 passed.
- `tsc --noEmit` clean. `npm run lint` (eslint, CSS tokens, valuation words, em
  dash, migrations, claims) exit 0.

## Failed

- Nothing.

## Remaining

- Everything in handoff sections 7.1 (blocked_terms, supply unblocking) to 7.18.

## Decisions

- The timeout constant is private to the route file and mirrored in the test,
  because a Next.js route module may not export anything but handlers and route
  config. Recommendation: a later change can lift `signedInWithDeadline` into
  `lib/auth/` and have `home-or-landing` and `/open` share it; I copied the fix
  exactly, as the brief asked, rather than touch `home-or-landing` in the same
  commit.
- Working branch is the one the founder named (`claude/vallo-backend-money-trust`).

## Risks

- None from this change. Worst case on timeout is a wrong guess that `proxy.ts`
  corrects on the next request.

## Next Session

- Session 3: `/open` answers within 3 s, always.

## Do Not Repeat

- The `/open` deadline is done. Do not re-fix it.
