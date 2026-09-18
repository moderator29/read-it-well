# HANDOFF 06: what Vallo is after the true-face build

**Draft, opened 18 September 2026 by the Build 06 lead; completed at the
close of the session.** `docs/BUILD_06_LEDGER.md` is the commit-tied record
this file summarises. `docs/HANDOFF_05_UPGRADED_WIDE_PLATFORM_BUILD.md`
(third edition) was the brief; `docs/DESIGN_DIRECTION.md` remains the law of
the frontend; `docs/HANDOFF_04_MARKETPLACE.md` section 13 still binds every
worker.

## 1. What Vallo now is

(written at close)

## 2. What landed, with commits

(the ledger's section 4, condensed, at close)

## 3. What is proven

(the ledger's section 6 proofs and section 7 probes, at close)

## 4. What remains, file-precisely

(at close)

## 5. What needs the founder

1. The seeded login.
2. `COINGECKO_API_KEY`.
3. M6 and the landmark seed (drafted in `supabase/migrations/pending/`).
4. Leaked-password protection in the Supabase Auth dashboard (advisor
   warning, a dashboard switch, no code).
5. Inherited: the four `private` tables the advisor flags, the MapTiler key,
   LiteAPI and Booking.com for Phase F.

## 6. How the next session starts

1. `git pull origin main`.
2. Read this file, then `docs/BUILD_06_LEDGER.md`, then
   `docs/DESIGN_DIRECTION.md` and the catalogue beside the images.
3. Run the baseline and record it.
4. The preview harness at `/preview` (dev only) is how a signed-in surface
   is looked at without a session; `scripts/verify-shots.mjs` and
   `scripts/verify-desktop.mjs` take the pictures.
