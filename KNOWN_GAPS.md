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

**`lib/inventory/providers/amadeus.ts` is dead code, 417 lines of it.** Amadeus
decommissioned its Self-Service portal on 17 July 2026 and disabled the keys
with it, so the endpoints this provider calls now answer 401 to everybody,
permanently. It is still registered, still permanently keyless, and costs one
synchronous string check per search. The comment in `inventory/index.ts` used to
say it was "two environment variables away" from working, which was the reason
nobody deleted it; that is now corrected, because Amadeus Enterprise is a
different portal, a different auth flow and a different API surface, so reaching
it would be a new provider rather than a credential. Deleting somebody's
complete module is the owner's call, so it is recorded here rather than removed.
`LITEAPI_KEY` replaces it (`providers/liteapi.ts`, and docs/DATA_SOURCES.md).

**No partner hotel can be booked, only priced.** `providers/liteapi.ts` maps
search and rates; it does not call `POST /rates/prebook` or `POST /rates/book`,
so partner hotel cards carry a naira price and no Reserve button. This is a stop
rather than an omission: the checkout settles money against a first-party
`bookings` row, and there is no row for stock we do not own. What closing it
needs is costed in docs/HYBRID_INVENTORY.md section 7.

**Restaurants can be discovered but not booked.** Google Places fills the
category with real venues; nothing takes a table reservation. No aggregator
fixes this (resOS issues its key to a restaurant that already runs resOS as its
POS, and OpenTable has no self-serve tier), so it wants a slot engine of ours,
which means new tables and a migration. Not started.

**The Content Security Policy is reported, not enforced.** It exists now:
`lib/security/csp.ts` builds it, the middleware serves it with a per-request
nonce on all three of its exits, and the root layout nonces its two before-paint
scripts. Verified against a running server: the nonce in the header matches
every one of the 67 script tags in the document, and no script is left without
one, because Next propagates the nonce to its own scripts once it sees the
header.

What remains is the decision to enforce, which is deliberately the owner's and
deliberately not automatic. `CSP_ENFORCE` is unset, so violations are reported
to `/api/csp-report` and logged rather than blocked. A wrong policy does not
degrade, it white-screens, and the reports are the only honest way to find the
directive nobody predicted. Set it to `true` once the `[csp]` lines stop
appearing across real traffic.

**`pg_cron` is not enabled.** It is a Supabase toggle, not code, and attempts to
enable it have been blocked. Until it lands, three things cannot run on a
schedule: the stale booking hold sweep (`private.release_stale_booking_holds`,
which exists and works when called), badge awarding, and the social layer's gist
expiry. Raise it with the owner rather than engineering around it.

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

**The restaurant copy in Yoruba, Hausa and Igbo is mine, not a speaker's.**
Eight strings across `interests.markets`, `interests.hints`, `admin.propertyType`
and `agent.list.propertyTypes`. Where the word already existed in a locale it was
reused rather than retranslated, so the labels carry each file's own verified
noun (`Ilé oúnjẹ`, `Gidan abinci`, `Ụlọ oriri`) and the Yoruba plural takes the
`Àwọn` marker the same block uses eight times. The hints and blurbs are new
sentences and are the ones to check: they use the standard loanword for table
(`tábìlì`, `tebur`, `tebul`) and a literal rendering of "priced per head". They
are honest placeholders, not finished copy.

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
| `payout_accounts` has no writer | `lib/agent/payout-actions.ts` adds, defaults and removes accounts through the agent's own RLS-bound client, re-resolving the account name against the bank rather than trusting the form |
| Reviews have no writer | Guests write from `/bookings/[bookingId]/review`; hosts answer through `lib/agent/reviews-actions.ts` |
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

**Three counts in the social layer are formatted with a hardcoded `en-NG`, and
it currently changes nothing.** `PlacePicker` (a member count and a result
total) and `PostCard` (a view count in a `title`) call
`toLocaleString("en-NG")` rather than `formatNumber(value, locale)`. The
equivalent calls on `/around` and `/around/[slug]` are fixed, because those are
server components and the locale is one `getLocale()` away.

These three are not, and the fix is not worth what it costs today. Measured
across every locale the platform ships:

    en  842   1,234   12,500   1,234,567
    yo  842   1,234   12,500   1,234,567
    ha  842   1,234   12,500   1,234,567
    ig  842   1,234   12,500   1,234,567

All four are identical, because all four use Latin digits and comma grouping,
so the hardcoded tag produces the same string as the correct call for every
reader the product has. There is no client locale hook and no locale context,
only `<html lang>`, so fixing these three means either inventing a context or
threading a prop through several social components for a change nobody can see.

Worth doing the moment either of two things happens: a locale is added that
groups or digits differently (Arabic and most Indic locales do), or a context
appears for another reason and these become one line each. **Not** worth doing
as its own piece of work. Note that the same defect on *money* was real and was
fixed: `ha-NG` writes `₦ 5,000` with a space, so currency did differ where
integers do not.
