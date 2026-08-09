# Known Gaps

Everything deliberately incomplete, with why and what unblocks it. Nothing here
is hidden behind a passing build.

This file is the honest absence list. What should be **done** about any of it is
`RECOMMENDATIONS.md`, which carries a priority and an approach on each. What the
product IS is `docs/PRODUCT.md`.

Last updated: 2026-08-09.

**Corrected 2026-08-09. Five entries were stale and every one of them named a
blocker that no longer exists.** `pg_cron` was listed as not enabled: it is
installed and running six jobs. The whole third-party inventory section
described providers that have been deleted from the codebase. The migration
mirror was reported as one genuinely missing file: that file is committed and
the current drift is eight cosmetic filename pairs. The suite was 79 specs and
is 83. The three hardcoded `en-NG` calls are now two, in one component. Each is
corrected in place below rather than removed, because the pattern matters: a
gaps file whose gaps are closed teaches the next reader to distrust the
document.

**An earlier correction, kept.** This file was last accurate on 2026-07-28 and
described a platform with no session layer, no search, no rate limiting, no
tests and a scaffolded light theme, every one of which had shipped.

---

## Genuinely still missing

**The product cannot express a sale.** RentMe is a marketplace for renting,
buying and selling. `public.listings` has no `sale_price_minor`, no
`listing_intent`, no `tenure` and no title document field; `price_period` is an
enum of exactly `night` and `year`. Buying and selling is zero percent modelled.
This is the largest gap in the platform and the cheapest moment it will ever be
to close, because there are zero listings. `RECOMMENDATIONS.md` P-1 has the
migration shape.

**Escrow is zero percent implemented.** No table, no ledger hold, no release
condition, no dispute path, no timeout. `wallet_entry_kind` carries no hold
state beyond the withdrawal hold. It is also, correctly, promised nowhere: a
grep for escrow across every `.ts`, `.tsx` and `.sql` file returns three hits,
all code comments, and one of them
(`apps/web/src/app/(site)/safety/page.tsx:27`) is the safety page explicitly
refusing to promise it. Do not undo that refusal. `RECOMMENDATIONS.md` E-1.

**`booking_status` has no `COMPLETED`.** It is `PENDING, CONFIRMED, CANCELLED`.
So "they stayed" is not a moment the schema records, which blocks escrow
release, the review prompt and two badges at once. It is one enum value and a
transition, and nothing else about escrow can be specified until it exists.

**Third-party inventory: built, then removed by the owner, and residue remains.**
This section used to describe a live Amadeus provider, a LiteAPI hotel feed and
Google Places restaurants. `apps/web/src/lib/inventory/` no longer exists,
`PartnerMeta` is gone from `lib/listings/types.ts`, and `source` is a
single-valued field. What is left behind: `public.places_cache` still holds 243
rows of cached Google Places data, `public.partner_stay_intents` still exists
empty, and the `hybrid_hotels` and `hybrid_restaurants` rows are still in
`public.feature_flags`. `RECOMMENDATIONS.md` S-2.

**A restaurant reservation cannot be paid for, and does not need to be yet.**
The loop is closed end to end: an agent lists a restaurant, a guest requests a
table from the listing page, `reservations_notify` tells the restaurant, the
host accepts or declines from the Tables section of `/agent/bookings`, and the
guest is notified of the answer. Both notifications go through `private.notify`,
so somebody who switched booking notifications off stays undisturbed.

What does not exist is money. There is no deposit, no card hold and no no-show
charge, so a table costs nothing to request and nothing to abandon. That is the
right starting point for a market where almost no restaurant takes a deposit
today, and nothing about the schema blocks adding one: a per-venue amount where
zero means free is a column and a checkout step, not a migration of anything
that already exists.

No aggregator was ever going to supply this, and both were checked properly
before being written off: resOS issues its key to a restaurant that already runs
resOS as its POS, so it is a per-merchant integration rather than an aggregator,
and OpenTable has no self-serve tier at all. The same research found the same
answer for shortlets: there is no Nigerian shortlet platform with self-serve
developer keys, which is why shortlets are ours to win rather than ours to
aggregate. (Archived detail: `docs/archive/DATA_SOURCES.md` section 3.)

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

**`pg_cron` IS enabled. This entry said the opposite for five days and so did
six other documents.** Verified live 2026-08-09: `pg_cron` 1.6.4, installed, with
six active jobs in `cron.job`. It was applied by
`supabase/migrations/20260804184423_the_scheduler_exists_now.sql`, which also
explains why it is `pg_cron` and not a Vercel cron: the Hobby plan allows one
invocation per day, and releasing a stale booking hold once a day means a real
bed nobody could book for a whole day.

| Job | Schedule (UTC) | Runs |
|---|---|---|
| `rentme-nightly-badges` | `20 2 * * *` | `private.sweep_badges()` |
| `rentme_release_stale_holds` | `*/15 * * * *` | `private.release_stale_booking_holds()` |
| `rentme_purge_rate_limits` | `30 * * * *` | `private.purge_rate_limits()` |
| `rentme_purge_idempotency` | `10 2 * * *` | `private.purge_idempotency_records()` |
| `rentme_announce_completed_stays` | `20 5 * * *` | `private.announce_completed_stays()` |
| `rentme-daily-note` | `0 6 * * *` | `private.post_daily_note()` |

**What is genuinely still missing here is monitoring.** Six unattended jobs write
to a live database and nothing alerts on a failure. `cron.job_run_details` carries
the outcome. All schedules are UTC and Lagos is UTC+1, which this project has
already been caught by once.

**`getPlatformStats()` returns null on purpose.** The landing reference shows
figures like "Hotels 5,130+", which are mockup numbers. Publishing invented
inventory counts is misleading advertising, so the hero cards render label-only
and gain counts with no redesign once a real aggregate exists.

**No agent workspace route is an `AgentComingSoon` stub any more.**
`/agent/analytics` was the last one and it now reads real figures. Verified by
grep: no file under `apps/web/src/app` imports the component. The component
itself is kept rather than deleted, because the rail will gain destinations
again and a placeholder that states plainly it is a placeholder is the designed
answer for that (Master Rules 17 and 55).

**`/agent/analytics` deliberately does not count three things, and one of them
is a product decision the owner still owns.** The page states all three on the
screen itself, under "What this page does not count", because silence about a
metric on an analytics surface is read as a zero rather than as an absence.

*Views.* Nothing on this platform counts a view of a listing. `post_views`
exists but belongs to the social feed and keys on `posts.id`, so it cannot be
joined to a listing at all. With no view count there is also no view-to-booking
conversion rate, which is the figure a host would most want. Adding view
counting is a real piece of work (a write path, a bot filter, a retention
policy) and it has not been started.

*Saves.* `saved_items` is owner-only by policy (`saved_items_own`, `for all
using auth.uid() = user_id`), so a host's own client cannot read it. The service
role could, and the analytics read deliberately does not: that policy was
written to be strict rather than left incomplete, and bypassing it to publish a
count of who fancied a flat is a privacy posture change, not an implementation
detail. Separately the number would be wrong anyway, because a signed-out
visitor's saves live in `localStorage` and a cookie (`lib/saved/local.ts`) and
never become rows, so a database count is short by an unmeasurable margin.
**Owner decision needed:** whether hosts should ever see an aggregate save count,
and if so whether the guest-facing copy on the save control should say so.

*Historical occupancy as a percentage.* Nights sold can be counted exactly. The
denominator cannot: a percentage of capacity needs to know how many listings
were published on each past night, and `listings` carries one `published_at` and
one current `status` rather than a history of either, so a listing paused last
March would silently rewrite last March's occupancy on every page load. The page
shows forward occupancy over the next 30 nights instead, where the denominator
is today's published count and today is a fact. A `listing_status_events` table
would make the historical figure answerable and does not exist.

**`/agent/verification` shows the ladder but cannot move anybody up it.** The
screen exists now: an agent sees all four rungs, which they have passed, which
failed, the reviewer's note in full, and what the next rung asks for. That
closes the half-loop where an admin could move somebody up the one ladder that
decides how much of the platform they can use and the only way the host found
out was a phone call.

What it still does not have is a way to send anything. There is no upload
control, because nothing behind the page accepts a document: the evidence for
every rung arrived with the application, and a rung is a decision a member of
staff records after reading it. So an agent who wants to move up is pointed at
support rather than at a form. Whether re-submitting evidence should be
self-serve is a product decision, not a missing screen.

**Yoruba, Hausa and Igbo counted nouns need native review specifically.** The
plural entries added with `Intl.PluralRules` sit inside the same native review
the rest of those three files are waiting on, but two of them are worth naming.
Yorùbá and Igbo have a single CLDR plural category, so one form has to serve
every count, and the Igbo entries deliberately use the unmarked noun with the
numeral after it (`okenye {count}`, `nwa {count}`) rather than the plural-marked
`ndị okenye` and `ụmụaka` used elsewhere in that file, which would read as
"adults 1" beside a numeral. A native speaker should confirm that choice.

**The `agentAnalytics` block in Yoruba, Hausa and Igbo is a best effort and is
named here rather than passed off as verified.** Every one of its roughly fifty
strings was written for this change. The short labels reuse vocabulary already
established in each file (`ìbéèrè` / `buƙatu` / `arịrịọ` for requests, `ìbùgbé` /
`zama` / `obibi` for stays, `ìpín` / `rabo` / `òkè` for a share, `alẹ́` / `dare`
/ `abalị` for a night), so those carry the same confidence as the surrounding
booking and earnings copy.

The three `notCounted` paragraphs are the ones that need a native speaker most,
and they are flagged in a comment above the block in each file. They are not
labels, they are an argument for why a number is absent, and an argument is the
kind of writing that survives a literal translation least well. If any of them
reads as an apology rather than as a plain statement of what is and is not
recorded, it should be rewritten from the intent rather than corrected word by
word. The same applies to `requests.answerBody`, which explains a median in a
sentence, and to `emptyBody`, which has to say "a sample chart would tell you
about nobody" without sounding like a fault.

Two terms were left in a form that may not be idiomatic and are worth a specific
look: the Igbo section title `Ọnụọgụgụ` for "Analytics", and the Yoruba
`Ìdíwọ̀n` for a guest rating, neither of which had an established form anywhere
else in the file to copy.

**The reserve panel on a listing is still written in English in the component.**
Only the three sentences that state a count were moved into the dictionary
(`reserve.confirmedRange`, `reserve.capacityNote`, `reserve.totalForNights`),
because a counted noun cannot be pluralised without owning the words around it.
Roughly forty other strings in `ReservePanel.tsx`, and the `en-GB` date
formatter it uses for the stay range, are unchanged. The same is true of the
generated "about" paragraphs on `/listing/[id]`, the search history label built
in `/search`, the booking validation messages in `lib/bookings/actions.ts`, the
stay emails in `lib/email/messages.ts` and the "N nights selected" caption in
the agent calendar editor. All are correct English; none are localised.

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

**There are two sheet implementations and they are only now properly apart.**
`components/ui/Sheet.tsx` is the primitive, with a drag handle, detents and a
transform driven by `[data-open]`. `components/app/account/rows.tsx` carries an
older, simpler one that opens by animating, and it is what all eight surfaces
across `/profile` and `/settings` use. They shared the class name `.nf-sheet`
until this round, which made the older one unreachable under reduced motion;
the older family is now `.nf-rows-sheet` and `app/settings-rows.css` explains
why at length. **That fixed the bug, not the duplication.** Merging the two is
real work worth doing: one sheet, one set of mechanics, eight call sites to
migrate. It was not attempted here because the primitive belongs to another
session's file scope.

**963 em dashes remain in `docs/archive/ui-audit/`,** across ten files, against a house
rule that says zero anywhere including documentation. They are historical audit
records from a single session, and a mechanical replacement would produce
ungrammatical prose in documents nobody is going to reread. The live documents
are clean: `docs/ENVIRONMENT.md` was fixed this round, as were the four source
files and the one test comment that carried them. One of the four was
user-facing, the agent application wizard's step label. Note that three test
specs legitimately CONTAIN the character, because they are the guards that
search for it, and a sweep must not "fix" those.

**The suite is 83 node specs and 8 vitest files, counted 2026-08-09.** It was 79
and 5 within the last fortnight, so re-count rather than quoting this. The five
below were the known failures at the last full sweep. None was caused by
application code, and each was checked rather than assumed. **No CI runs any of
it:** there is no `.github/workflows` directory and Vercel deploys from `main`.

| Spec | State |
|---|---|
| `gate` | **Aborts by design** and says so: without `NEXT_PUBLIC_SUPABASE_URL` and the anon key the guard is a pass-through, so it refuses to pretend it proved anything. Environmental |
| `intent-tune` | `src/lib/interests/schema.ts` AND the spec itself are byte for byte identical to `origin/main`, so this is red on main |
| `interests-settings` | `welcome/page.tsx` carries no `InterestChoices` mount on this branch or on `origin/main`. Red on main |
| `session-memory` | One check. `ListingsWorkspace.tsx` is byte for byte identical to `origin/main`. Red on main |
| `truncation` | Passes alone. Chromium running out of room after seventy consecutive launches in this sandbox. Run the suite in batches |

**A sandbox trap that cost two full sweeps, written down so it costs nobody a
third.** `next start` on a port that is already held does NOT fail loudly: the
old server keeps serving and the new one exits, so a sweep silently measures the
PREVIOUS build. It read as 49 unrelated specs failing at once. Before trusting a
sweep, confirm exactly one `next-server` process and that `.next-*/BUILD_ID`
matches the build just made. Killing `next-server` alone is not enough either,
because `npm exec` respawns it; kill the `npm exec`, the `sh -c` and the
`next-server` together.

**Nine orphan modules, 1,276 lines, verified unimported but deliberately NOT
deleted.** Re-counted 2026-08-09 with exact module-path greps, not bare
identifiers. Each has zero import references:

| File | Lines |
|---|---|
| `components/app/messages/MessageThread.tsx` | 320 |
| `components/app/wallet/WalletActions.tsx` | 306 |
| `components/app/account/ProfileIdentityCard.tsx` | 201 |
| `lib/social/comments-queries.ts` | 149 |
| `components/agent/StatCard.tsx` | 100 |
| `components/agent/charts/DonutChart.tsx` | 78 |
| `components/agent/charts/AreaSparkline.tsx` | 67 |
| `lib/assistant/protocol.ts` | 34 |
| `lib/mode.ts` | 21 |

**Two that were on this list are no longer orphans and must not be deleted:**
`components/app/MomentScreen.tsx` now has 9 importers, and
`lib/platform-stats.ts` has 1. That is the reason the list is re-derived rather
than carried forward.

`WalletActions.tsx` is the heavy one and it takes four exports with it: it is the
only caller of `requestDeposit`, `requestWithdrawal` and `requestTransfer` in
`lib/wallet/actions.ts`, and `getStatement` there is imported by nothing at all.
The live wallet page renders `WalletDeck`, which uses different actions
entirely. Two implementations of the money surface is how a security fix lands
on the wrong one.

They were left in place because a parallel session was working in this tree and
several looked like components staged ahead of the screen that would mount them,
which is a normal way to build and a hostile thing to delete out from under
somebody. Whoever owns them should confirm and remove them, or wire them. The
evidence does not need re-deriving.

**`apps/web/tsconfig.json` carries ten dead `include` entries.** Parallel builds
add `".next-a1/types/**"` and friends as they are used, but `exclude` holds
`".next-*"`, and exclude filters include, so every one of those entries does
nothing. Only the default `.next/types` is live, because it has no dash. Not
harmful, and worth a tidy the next time somebody is in that file.

---

**`private.probe_as` was used again this round and the rows it created are
gone.** Four probe users, one held post, one held story, one held story comment
and one held bio were created to prove the moderation queue writes under RLS,
then deleted. Verified afterwards: `profiles`, `posts`, `stories`,
`social_profiles`, `notifications`, `risk_alerts` and `audit_log` were all back
to zero rows. The cleanup also removed one pre-existing `risk_alerts` row of
unknown origin; no migration seeds that table and the platform held no real
user data, so nothing of value was lost, but it is recorded here rather than
left to be noticed.

**Those tables are no longer at zero, and that is the platform working rather
than a probe left behind.** Counted live on **2026-08-09**: `profiles` 1 with 2
`user_roles`, `audit_log` 4, `areas` **7**, `posts` **18**, `badges` 15,
`user_badges` 1, `places_cache` 243, `local_governments` 774, `occupations` 749,
`states` 37. Every post is `author_kind = 'SYSTEM'`, which is the designed cold
start rather than anybody's content, and the daily note job adds one each
morning. `agents`, `agent_applications`, `listings`, `bookings`, `reviews`,
`wallets`, `wallet_entries`, `transactions`, `ledger_entries`, `events`,
`reservations` and `saved_searches` are all still empty, so the supply chain has
not started: somebody has an account, and nobody has applied to be an agent yet.

The one number here that is not the platform working is `places_cache` at 243.
Those are cached Google Places rows from the third-party inventory layer that has
since been deleted from the codebase. `RECOMMENDATIONS.md` S-2.

---

## Resolved since the last version of this file

Recorded so nobody rebuilds them.

| Was listed as missing | Reality |
|---|---|
| `/agent/messages` is a coming-soon stub | Real. `AgentInbox.tsx` over `lib/agent/messages-queries.ts`, replying through the existing thread route and the existing `sendMessage` action |
| `/agent/reviews` is a coming-soon stub | Real. `ReviewsWorkspace.tsx` and `ReplyForm.tsx` over `lib/agent/reviews-queries.ts`, answering through `lib/agent/reviews-actions.ts` |
| `/agent/settings` is a coming-soon stub | Real. Notification preferences over the one `profiles.settings` document, plus the payout accounts and a deliberately read-only trading identity |
| `20260729174306_rls_initplan_and_fk_index` is applied with no committed file | It has a file. The mirror has drifted elsewhere instead, recorded below |
| `payout_accounts` has no writer | `lib/agent/payout-actions.ts` adds, defaults and removes accounts through the agent's own RLS-bound client, re-resolving the account name against the bank rather than trusting the form |
| Reviews have no writer | Guests write from `/bookings/[bookingId]/review`; hosts answer through `lib/agent/reviews-actions.ts` |
| `rate-limit.ts` holds a literal NUL byte and is invisible to grep | Rewritten with the byte written as a unicode escape. `file` now reports ASCII text, the compiled string is unchanged, and the separator carries a comment explaining why it has to be NUL |
| No session layer | `lib/auth/actions.ts` has real `signInWithPassword`, `signUp` and sign-out. Google and Apple OAuth were also built and are being removed by owner decision: `RECOMMENDATIONS.md` N-4 |
| No search, map, filters or pagination | `/search` has a real engine, `FilterDrawer`, `MapCanvas`, `MapDock` and a square filter opener |
| Light theme scaffolded, must not be exposed | Fully designed exchange-grade paper twin, shipped, and the default is dark |
| No rate limiting, bot protection or audit logging | Durable Postgres rate limiting (`private.consume_rate_limit`) plus idempotency records, both fail-open; `audit_log` exists |
| No test suite | 83 standalone node specs under `apps/web/tests` plus 8 vitest files |
| `pg_cron` is not enabled | Installed 2026-08-04, six active jobs. See the section above |
| Badges are a thinking document with nothing implemented | 15 rows in `public.badges`, swept nightly by `private.sweep_badges` |
| Third-party hotel and restaurant feeds are the growth plan | Deleted from the product. Everything on RentMe was listed on RentMe |
| Saved is a stub with no write path | `toggleSave` writes `saved_items` under RLS |
| Seed rows carry a "Sample content" label | Removed. Owner rule: zero sample, preview or demo strings in UI copy |
| A working branch conflicted with the branch rules | Everything is on `main` now, which Vercel deploys |
| Admin navigation undecided, blocks every admin surface | Decided and built |
| Listing wizard step count undecided | Built |
| Location model blocked on LGA | Built on state, city, area |
| Service fee ownership undefined | Settled: the platform charges NO fees anywhere |
| No `Accept-Language` negotiation | Wired. `lib/locale.ts` resolves cookie, then `Accept-Language`, then English. The header parser is `parseAcceptLanguage`/`matchAcceptLanguage` in `packages/i18n/src/negotiate.ts`: no dependency, q values honoured and ordered, `yo-NG` matched on its primary subtag, `q=0` and `*` handled. Covered by `apps/web/src/lib/accept-language.test.ts` |
| No pluralisation rules, and the booking card renders "1 adults, 1 children" | Wired. `plural()` and `formatParty()` in `packages/i18n` select through `Intl.PluralRules` on the same `intlTag` map `formatMoney` uses, so the categories come from the locale: `one`/`other` for English and Hausa, `other` alone for Yorùbá and Igbo. The dictionary carries a `counts` block in all four files. Every party, guest and night count on the admin stay board and detail, the host booking card, the guest bookings deck (signed in and signed out), checkout and the listing reserve panel and sticky bar now goes through it. Covered by `apps/web/src/lib/plurals.test.ts` |

---

## Still open with the owner

**The migration mirror has drifted, and the drift is now entirely cosmetic.**
House rule: every applied migration is mirrored into `supabase/migrations/` with
its timestamp prefix, so the repository never lies about the database. Diffed
filename by filename on 2026-08-09: **120 versions applied, 120 files
committed**, disagreeing on eight entries each way. Every one is the same
migration under two prefixes, six of them a hand-rounded timestamp against the
real one. The two whose names also differ were read and matched by content:
`20260805183000_the_answers_most_people_here_give.sql` is the server's
`occupations_common_rank`, and
`20260807110000_saying_that_address_is_already_signed_up.sql` is the server's
`signup_method_for_email`. `RECOMMENDATIONS.md` T-4 has the full table.

**The one that was not cosmetic is closed.**
`20260807101114_the_last_foreign_key_without_a_covering_index` was recorded
server side with no file. The file is committed and present on both sides.

The fix is renaming eight files and adding a CI check that diffs the two lists.
Until that check exists, a diff by filename reports eight problems where there
is really one habit, which is exactly how the one real problem hid for a week.

**Repository is named `read-it-well`**, and the root `package.json` still
describes the product as "NaijaFinds. Nigeria-first discovery, stay, food and
experience platform." Cosmetic, and it surprises everyone who clones it.
`RECOMMENDATIONS.md` S-1.

**`PAYSTACK_SECRET_KEY` and `SUPABASE_SERVICE_ROLE_KEY` in the live environment
could not be verified from here**, and the second one matters far more than this
entry used to suggest. Payment code is env-guarded, but a missing service role
key does not degrade honestly on the webhook: it answers HTTP 200 with no log, so
Paystack never retries and a paid funding is lost. That is the most probable
cause of the reported wallet failure. `RECOMMENDATIONS.md` W-1.

**The badge criteria that needed a scheduler are met and the criteria that need
new data are not.** `pg_cron` is installed and `private.sweep_badges` runs
nightly, so this entry's premise is gone. What is still true is the data:
`booking_status` has no `COMPLETED`, so "they stayed" is not a moment the schema
records; `photo_pro` needs a per-listing rejection history nobody keeps;
`local_guide` is not yet defined in numbers; and `rentme_elite` depends on the
other six plus a ninety day clean window. Those are schema and definition gaps,
not scheduling gaps. `public.badges` holds 15 rows and `public.user_badges`
holds 1.

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

**Two counts in the social layer are formatted with a hardcoded `en-NG`, and it
currently changes nothing.** Re-measured 2026-08-09: this said three and one of
them moved. `PostCard` is **fixed** and now calls `formatNumber(n, locale)`.
What remains is `apps/web/src/components/social/PlacePicker.tsx:322` (a member
count) and `:341` (a result total), plus one at
`apps/web/src/app/(site)/docs/chapters.tsx:1361`, which is a documentation page
rather than a social component. The equivalent calls on `/around` and
`/around/[slug]` were always fine, because those are server components and the
locale is one `getLocale()` away.

The fix is not worth what it costs today. Measured across every locale the
platform ships:

    en  842   1,234   12,500   1,234,567
    yo  842   1,234   12,500   1,234,567
    ha  842   1,234   12,500   1,234,567
    ig  842   1,234   12,500   1,234,567

All four are identical, because all four use Latin digits and comma grouping,
so the hardcoded tag produces the same string as the correct call for every
reader the product has. `PlacePicker` is a client component and there is no
locale hook and no locale context, only `<html lang>`, so fixing it means either
inventing a context or threading a prop for a change nobody can see.

Worth doing the moment either of two things happens: a locale is added that
groups or digits differently (Arabic and most Indic locales do), or a context
appears for another reason and these become one line each. **Not** worth doing
as its own piece of work. Note that the same defect on *money* was real and was
fixed: `ha-NG` writes `₦ 5,000` with a space, so currency did differ where
integers do not.
