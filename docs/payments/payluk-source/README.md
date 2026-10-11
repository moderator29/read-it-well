# Payluk's own documentation, fetched 6 October 2026

**`docs.payluk.ng` is reachable from this environment.** Session 1 fetched it on
6 October after Session 2 reported the host blocked, which it no longer is. These
files are Payluk's pages verbatim, saved as `.txt` so the repository's em dash
check (which reads only `.md` under `docs/`) does not fail on a vendor's prose,
and so nobody edits a third party's documentation to satisfy our lint.

`index.txt` is Payluk's own `llms.txt`: the full page list, with a one-line
description each. Fetch any page not saved here as
`https://docs.payluk.ng/<path>.md`.

**Payluk publishes an agent skill** (`guides_ai-agent-skill.txt`) intended for
exactly this: installing it makes a coding agent integrate Payluk correctly on
the first attempt. Read it before writing the adapter.

## What these pages settle, which Session 1 could not settle before

Each of these replaces a guess in `VALLO_PAYMENTS_ARCHITECTURE.md`. Verify
against the file named, not against this summary.

1. **The fee is 2 percent of the escrow amount** on a merchant escrow, and 2.5
   percent for an escrow created in the Payluk app (`concepts_fees-and-settlement`).
   `whoPays` chooses buyer, seller or both. **This is new money leaving the
   transaction and the founder has not costed it:** the escrow rail would carry
   Payluk's 2 percent on top of the Vallo Guarantee's 1 to 2 percent, against a
   direct Paystack rail that carries only Paystack's fee and the Guarantee.

2. **Question 3 is answered, and the answer is bad for the cancellation flow.**
   The only documented route from a funded escrow back to the buyer is a
   **dispute** that the merchant resolves as `REFUNDED`
   (`concepts_dispute-resolution`). There is no plain cancel-and-refund. So a
   renter and a lister who simply agree to call it off must be put through a
   dispute Vallo then arbitrates, and the member-facing words for that need
   deciding before the flow is built.

3. **Keys are per-merchant secrets and are not public.** `sk_test_` is staging,
   `sk_live_` is production, each is rejected on the other host, and the
   documentation says to keep them server-side (`authentication`). There is no
   shared or public sandbox key to find.

4. **Approval gates the key.** Sign up, pass KYC, upgrade to a business account,
   and be approved; an unapproved business gets `403 Unauthorized Access`
   (`onboarding`, `essentials_errors`). This is founder work and it cannot be
   done by a session.

5. **Ten requests per minute per key, across all `/v1` routes**
   (`authentication`). That is a hard architectural constraint, not a detail: any
   design that calls Payluk per listing view, per search result or in a loop is
   already broken. It also bounds how fast a backfill or a reconciliation sweep
   can run. There is an IP allowlist available, and an empty allowlist admits
   every address.

6. **Webhooks exist** (`concepts_webhooks`), which contradicts the earlier note
   that Payluk had none. Read that page before designing the escrow state
   machine, and treat the webhook as the source of truth rather than polling,
   given the rate limit above.

7. **Milestone and vault escrows exist.** Milestones fund upfront and release in
   stages on buyer confirmation, which maps closely onto a rent schedule and is
   worth considering rather than modelling instalments ourselves.

## Added 7 October 2026, for the member money rail

Fetched verbatim from `docs.payluk.ng` by the money rail session, because the
adapter calls these routes and every request and response shape it relies on
should be checkable in the repository: `api-reference_merchant-customers_*`
(create, get, list with the `email` / `phone` lookup, customer wallet),
`api-reference_payments_*` (create payment intent, verify payment, payment
history, bank list, verify account number) and `concepts_merchant-customers`.

## Added 7 October 2026, for protected rental payments (D73 Part B)

Fetched verbatim for phases 11 and 12: `api-reference_escrow_*` (overview, create, claim funds, delete, verify payment token, list escrow transactions), `api-reference_milestone-escrow_*` (create, confirm, get milestones), `api-reference_payments_pay-escrow-buy`, `api-reference_disputes_*` (overview, buyer confirm payment standard) and `concepts_milestone-escrows`. `concepts_how-it-works` was fetched again and is unchanged.
