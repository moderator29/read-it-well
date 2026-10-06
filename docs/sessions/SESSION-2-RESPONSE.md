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

Read in full from the live docs on 6 October 2026 (92 pages plus `openapi.json`) once
the founder opened `docs.payluk.ng`. Full evidence, with a page citation per claim:
**`docs/payments/PAYLUK_LIVE_DOCS_FINDINGS.md`**. Bluntly:

1. **"No failure webhooks exist."** False. Every `payment.*` event has `.failed` and
   `.reversed` counterparts. Only `escrow.*` has none. The whole "reconciliation is
   the only way to see a failure" premise was built on a missing page.
2. **"The fee is undocumented."** False since 2 October: Payluk takes 2% of a merchant
   escrow, plus any commission Vallo sets, split by `whoPays`.
3. **"No cNGN."** False. cNGN (BEP-20 on BSC) is a live deposit and checkout rail.
   The founder's "stay off Payluk cNGN" ruling is a real constraint, not a moot one.
4. **Missed the rate limit entirely: 10 requests per minute per secret key, every
   route.** This is the largest design constraint in the integration. Reconciliation
   polling, refunds and webhooks-driven reads all share that budget.
5. **Understated the super-admin scope.** Only the escrow, milestone and category
   routes accept an ordinary business key; everything else needs super-admin.
6. **Claim timing wrong:** a seller may claim only one day after the delivery window.
7. **Dispute flow wrong:** resolve appears not to need the seller's reply (inferred
   from the official example; to confirm on staging). Milestones release strictly in
   order, and each may name its own beneficiary.
8. **`pk_live_` prefix** is not in the docs. It came from npm.

What Session 1 got right: hosts and key prefixes, the IP allowlist, Payluk not
arbitrating disputes, no idempotency key, the HMAC-SHA512 signature in
`x-payluk-signature`, `mainBalance` and `escrowBalance`, and virtual accounts now
answering `410 Gone`.

## The twelve questions (architecture section 7)

Answered: 2, 3, 4 (largely), 8, 11, 12. Partly: 1, 5, 7, 9. Open: 6 (payout timing and
limits) and 10 (KYC tiers), each needing Payluk in writing. Detail per question in the
findings file, section 2.

### Question 3, called out: NO

**A funded standard or milestone escrow cannot be refunded without a dispute.** There
is no refund or cancel route (the only cancel is for vault escrows), and a funded
escrow cannot be edited or deleted. The only way money returns to a guest is: Vallo
opens a dispute **as the guest** (`submit-dispute` with the guest's `customer-id`),
then resolves it `REFUNDED`. Consequences:

- every routine cancellation notifies the host of a "dispute";
- on the majority reading of contradictory docs, **the guest loses Payluk's fee on
  every refund** whatever `whoPays` says, unless Vallo makes them whole;
- each refund spends at least 2 of the 10 requests a minute;
- after `COMPLETED` or `CLAIMED`, no refund is possible through the escrow at all.

**Recommendation (Decisions, for the founder):** do not fund a booking's escrow until
its free-cancellation window has closed. An unfunded escrow can be deleted freely, so
a cancellation inside the frozen terms never touches Payluk's dispute path. Collect
on Paystack at booking as today and move into escrow when the window closes, or hold
the booking unpaid until then. The cancellation path is **not** being built until the
founder picks. Two staging tests close the remaining doubt: resolving from `DISPUTED`
without a seller reply, and the fee actually returned on a refund for each `whoPays`.

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
- **Question 3 design choice** (see above): fund escrow after the free-cancellation
  window, or accept dispute-shaped cancellations and the guest fee loss. Blocks the
  escrow cancellation path only.
- **A Payluk staging secret key (`sk_test_...`)** in the environment as
  `PAYLUK_TEST_SECRET_KEY`, for the staging tests and acceptance criterion 10.

## Classification of what was touched

| Item | Class |
|---|---|
| `app/open/route.ts` | HARDEN |
| `lib/passcode/rules.ts` default | UPGRADE |
| Supply unblocking (SUP-05) | KEEP, verified |
| `blocked_terms` | COMPLETE (retire, refuse tier, staff surface) |

---

## Completed

- `/open` deadline with a test (acceptance criterion 1). Commit `0bf5a642e`.
- Passcode defaults to four digits, six one tap away (criterion 21). `b1afcbef4`.
- Payluk live documentation read; Session 1's architecture corrected in
  `docs/payments/PAYLUK_LIVE_DOCS_FINDINGS.md`; question 3 answered (no).
- Supply unblocking: **already built** (SUP-05, migration `20260924001655`). An
  applicant answers at `/profile/application`, the row returns to SUBMITTED, and the
  admin agents desk shows the answer. The brief was out of date. **VL-AGT-10016 is
  waiting on the founder to answer it there**, not on code.

## Changed

- `apps/web/src/app/open/route.ts`: deadline race plus cookie guess.
- `apps/web/src/app/open/route.test.ts`: new, five cases.

## Tested

- `vitest` unit project: 669 files, 8,634 passed, 1 skipped. DOM project: 162 passed.
- `tsc --noEmit` clean. `npm run lint` (eslint, CSS tokens, valuation words, em
  dash, migrations, claims) exit 0.

## Failed

- Passcode, first attempt: backed out when a test re-run was refused; the founder
  then cleared the tests and it landed (`b1afcbef4`).
- The live re-run of the listing-insert probe (`s1-owner-writes-keep-working`) timed
  out at the MCP's 60 s limit with no result. Verified afterwards: nothing recorded,
  no residue. To be re-run.

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
