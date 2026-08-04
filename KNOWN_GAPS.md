# Known Gaps

Everything deliberately incomplete, with why and what unblocks it. Nothing here
is hidden behind a passing build.

Last updated: 2026-08-04.

**This file had rotted badly and was rewritten.** It was last accurate on
2026-07-28 and still described a platform with no session layer, no search, no
rate limiting, no tests and a scaffolded light theme, every one of which had
been built and shipped since. A gaps file that lists finished work as missing is
worse than no gaps file, because the next engineer either rebuilds something or
stops trusting the document. Every claim below was verified against the code on
the date above.

---

## Genuinely still missing

**No Content Security Policy.** Verified: nothing sets one in `next.config` or
middleware. It needs a nonce strategy compatible with Next streaming. The other
security headers are set at the edge. This is the largest outstanding security
item.

**`pg_cron` is not enabled.** It is a Supabase toggle, not code, and attempts to
enable it have been blocked. Until it lands, three things cannot run on a
schedule: the stale booking hold sweep (`private.release_stale_booking_holds`,
which exists and works when called), badge awarding, and the social layer's gist
expiry. Raise it with the owner rather than engineering around it.

**`payout_accounts` has no writer.** Verified: no insert or upsert anywhere in
`apps/web/src/lib`. The table and its RLS exist. An agent therefore cannot add
the bank account their earnings would be paid into, so withdrawal-to-bank is
open at the supply end even though the guest-side wallet loop is closed.

**Reviews have no writer.** The table exists and the read path renders. Nothing
creates a review after a completed stay.

**`getPlatformStats()` returns null on purpose.** The landing reference shows
figures like "Hotels 5,130+", which are mockup numbers. Publishing invented
inventory counts is misleading advertising, so the hero cards render label-only
and gain counts with no redesign once a real aggregate exists.

**Several agent workspace routes are still `AgentComingSoon` stubs**:
`/agent/messages`, `/agent/reviews`, `/agent/analytics`, `/agent/verification`,
`/agent/settings`. Bookings, earnings, listings and list are real.

**No `Accept-Language` negotiation.** Locale resolves from a cookie then falls
back to English, so a first-time visitor with a Yoruba browser still sees
English. `lib/locale.ts` carries a comment pointing here.

**No pluralisation rules.** `Intl.PluralRules` is not wired anywhere. Some
existing copy already needs it: the booking card renders "1 adults, 1 children".

**Yoruba, Hausa and Igbo need native review before launch.** The translations
are functional and use correct diacritics and hooked letters, but marketing copy
in particular should be rewritten by a native speaker rather than translated
literally. Every locale file carries this warning in its header.

**Motion system is partial.** Entrance, float, reveal and pulse exist. The full
system for sheets, map transitions and AI states is not built. Reduced motion is
honoured throughout via token collapse.

**`apps/web/src/lib/security/rate-limit.ts` contains a literal NUL byte**, so
tooling classifies it as binary and it disappears from `grep` and from GitHub
code search. The code works; the file is invisible to search. Worth rewriting
cleanly so nobody concludes the rate limiter does not exist.

---

## Resolved since the last version of this file

Recorded so nobody rebuilds them.

| Was listed as missing | Reality |
|---|---|
| No session layer | `lib/auth/actions.ts` has real `signInWithPassword`, `signUp`, sign-out and Google/Apple OAuth |
| No search, map, filters or pagination | `/search` has a real engine, `FilterDrawer`, `MapCanvas`, `MapDock` and a square filter opener |
| Light theme scaffolded, must not be exposed | Fully designed exchange-grade paper twin, shipped, and the default is dark |
| No rate limiting, bot protection or audit logging | Durable Postgres rate limiting (`private.consume_rate_limit`) plus idempotency records, both fail-open; `audit_log` exists |
| No test suite | 18 standalone Playwright specs under `apps/web/tests` |
| Saved is a stub with no write path | `toggleSave` writes `saved_items` under RLS |
| Seed rows carry a "Sample content" label | Removed. Owner rule: zero sample, preview or demo strings in UI copy |
| Branch `claude/repo-cleanup-1spitz` conflicts with the rules | Everything is on `main` now, which Vercel deploys |
| Admin navigation undecided, blocks every admin surface | Decided and built |
| Listing wizard step count undecided | Built |
| Location model blocked on LGA | Built on state, city, area |
| Service fee ownership undefined | Settled: the platform charges NO fees anywhere |

---

## Still open with the owner

**Repository is named `read-it-well`**, which does not match the product. Cosmetic,
but it surprises everyone who clones it.

**`PAYSTACK_SECRET_KEY` in the live environment could not be verified** from
here; only `.env.example` is visible and it is blank by design. The owner adds
env keys personally. Payment code is env-guarded and degrades honestly, so a
missing key is a designed state rather than a crash.
