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

**`private.probe_as` was used again this round and the rows it created are
gone.** Four probe users, one held post, one held story, one held story comment
and one held bio were created to prove the moderation queue writes under RLS,
then deleted. Verified afterwards: `profiles`, `posts`, `stories`,
`social_profiles`, `notifications`, `risk_alerts` and `audit_log` are all back
to zero rows. The cleanup also removed one pre-existing `risk_alerts` row of
unknown origin; no migration seeds that table and the platform holds no real
user data, so nothing of value was lost, but it is recorded here rather than
left to be noticed.

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

**`pg_cron` is available but not installed**, and seven badges want it.
`first_stay`, `ten_stays` and `year_one` are the passage of a date rather than
an event any trigger can fire on. `booking_status` is PENDING, CONFIRMED,
CANCELLED, with no COMPLETED, so "they stayed" is not a moment the schema
records. `fast_responder` is a median that has to be recomputed, `local_guide`
is not yet defined in numbers, `photo_pro` needs a per-listing rejection
history nobody keeps, and `rentme_elite` depends on the other six plus a ninety
day clean window. The other seven badges award themselves from event triggers
today. Turning `pg_cron` on, or adding one authenticated maintenance route the
platform calls on a schedule, closes all seven. It is the owner's call which.

**`private.probe_as` exists for testing only.** It sets `request.jwt.claims` so
a probe can run as a real signed-in person under RLS, because a probe through
the service role bypasses RLS entirely and therefore cannot test a policy. It
is revoked from `public`, `anon` and `authenticated`, so only the service role
can reach it, and no application code calls it. Worth deleting before the
platform carries real people's data.

**Leaflet's stylesheet ships on every page; its JavaScript does not.** Measured
rather than assumed: the map's JS is properly lazy, exactly one chunk on the map
view and none anywhere else. But `import "leaflet/dist/leaflet.css"` is a static
import, so two stylesheets travel with every page in the app, including the list
view that never draws a map. It is about 10KB. Both clean fixes cost more than
they save: moving the import into the dynamic component makes the map render
unstyled for a frame, and hand-copying the rules into our own CSS creates a copy
that rots the next time Leaflet changes. Left as it is, on purpose, and written
down so nobody measures it a third time.

**A picture on a post that was taken down stops being readable, and its bytes
stay.** `posts_drop_media_on_remove` deletes the `post_media` rows as a post
reaches REMOVED, and after `a_picture_on_a_post_has_one_shape` an object no row
names cannot be signed for anybody, including the person who uploaded it. The
object itself is still in the `social-media` bucket. Deleting the
`storage.objects` row from SQL would leave the bytes untracked, which is worse,
so reclaiming them wants a sweep that goes through the storage API and deletes
every `social-media` object whose name no `post_media` row and no
`stories.image_path` mentions. Nothing is readable in the meantime; this is
storage cost, not exposure.
