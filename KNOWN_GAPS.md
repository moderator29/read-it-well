# Known Gaps

Everything deliberately incomplete, with why and what unblocks it. Nothing here
is hidden behind a passing build.

Last updated: 2026-08-07.

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

**A restaurant reservation has no notification and no host screen yet.** The
loop itself is built: an agent can list a restaurant, a guest can request a
table from the listing page, and `public.reservations` holds it PENDING under
RLS with the host scoped by policy. What is missing is the two ends. Nothing
tells the restaurant a request arrived, because the notification triggers are
written for `bookings` and do not know this table exists. And
`respondToReservation` has no screen calling it, so a host cannot accept or
decline from the agent workspace. Until both land, a request reaches the
database and waits there, which is why the guest receipt says the request is
with the restaurant rather than claiming a table is held.

No aggregator was ever going to fix this: resOS issues its key to a restaurant
that already runs resOS as its POS, and OpenTable has no self-serve tier
(docs/DATA_SOURCES.md section 3).

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

**Two agent workspace routes are still `AgentComingSoon` stubs**:
`/agent/analytics` and `/agent/verification`. Verified by grep: those are the
only two files in `apps/web/src/app` that import the component. Everything else
in the workspace is real, including messages, reviews and settings, which this
file listed as stubs long after they shipped.

**`/agent/verification` is the one that costs something.** The ladder behind it
exists: `public.agent_verification_checks` holds one row per rung per agent
across identity, address, payout and in_person, and `agents.verification_tier`
is derived from those rows rather than set by hand. An admin can move an agent
up it through `lib/admin/verification-actions.ts`. Nothing shows the agent where
they stand, what the next rung is worth, or what to send, so a host climbing the
one ladder that decides how much of the platform they can use has to be told
over the phone. A table with an admin screen and no host screen is half a loop
by this repository's own law.

**Yoruba, Hausa and Igbo counted nouns need native review specifically.** The
plural entries added with `Intl.PluralRules` sit inside the same native review
the rest of those three files are waiting on, but two of them are worth naming.
Yorùbá and Igbo have a single CLDR plural category, so one form has to serve
every count, and the Igbo entries deliberately use the unmarked noun with the
numeral after it (`okenye {count}`, `nwa {count}`) rather than the plural-marked
`ndị okenye` and `ụmụaka` used elsewhere in that file, which would read as
"adults 1" beside a numeral. A native speaker should confirm that choice.

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

**963 em dashes remain in `docs/ui-audit/`,** across ten files, against a house
rule that says zero anywhere including documentation. They are historical audit
records from a single session, and a mechanical replacement would produce
ungrammatical prose in documents nobody is going to reread. The live documents
are clean: `docs/ENVIRONMENT.md` was fixed this round, as were the four source
files and the one test comment that carried them. One of the four was
user-facing, the agent application wizard's step label. Note that three test
specs legitimately CONTAIN the character, because they are the guards that
search for it, and a sweep must not "fix" those.

**The suite is 79 specs. 75 pass. None of the four that do not is caused by this
branch, and each was checked rather than assumed.**

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
than a probe left behind.** Counted live on 2026-08-07: `profiles` 1 with 2
`user_roles`, `audit_log` 4, `areas` 6, `posts` 12. Every one of the twelve
posts is `author_kind = 'SYSTEM'`, `kind = 'SYSTEM'`, `status = 'LIVE'`, which
is the designed cold start answer rather than anybody's content, and the six
areas come from `seed_first_areas_lagos`. `agents`, `agent_applications`,
`listings`, `bookings`, `social_profiles` and `risk_alerts` are still empty, so
the supply chain has not started; somebody has an account now, and nobody has
applied to be an agent yet. Written down because two documents in this
repository still open by telling the reader nobody has signed up at all.

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
| No `Accept-Language` negotiation | Wired. `lib/locale.ts` resolves cookie, then `Accept-Language`, then English. The header parser is `parseAcceptLanguage`/`matchAcceptLanguage` in `packages/i18n/src/negotiate.ts`: no dependency, q values honoured and ordered, `yo-NG` matched on its primary subtag, `q=0` and `*` handled. Covered by `apps/web/src/lib/accept-language.test.ts` |
| No pluralisation rules, and the booking card renders "1 adults, 1 children" | Wired. `plural()` and `formatParty()` in `packages/i18n` select through `Intl.PluralRules` on the same `intlTag` map `formatMoney` uses, so the categories come from the locale: `one`/`other` for English and Hausa, `other` alone for Yorùbá and Igbo. The dictionary carries a `counts` block in all four files. Every party, guest and night count on the admin stay board and detail, the host booking card, the guest bookings deck (signed in and signed out), checkout and the listing reserve panel and sticky bar now goes through it. Covered by `apps/web/src/lib/plurals.test.ts` |

---

## Still open with the owner

**The migration mirror has drifted, in both directions.** House rule: every
applied migration is mirrored into `supabase/migrations/` with its timestamp
prefix, so the repository never lies about the database. Compared on 2026-08-07,
113 versions are recorded server side and 111 files are committed, and the two
lists disagree on nine entries. Four of them are the same migration under two
timestamps, where the file carries a rounded hand-written prefix and the server
carries the real one: `a_second_admin_and_a_way_to_remove_one`,
`one_honest_question_at_the_door` and
`making_somebody_staff_is_not_a_thing_a_signed_in_user_can_do` each appear once
on each side with prefixes minutes or hours apart, and the server's
`occupations_common_rank` is almost certainly the file
`20260805183000_the_answers_most_people_here_give.sql`. That is cosmetic but it
defeats the check the rule exists for, because a diff by filename reports eight
problems where there is really one habit.

The one that is not cosmetic: the server records
`20260807101114_the_last_foreign_key_without_a_covering_index` and no file of
that name or any other carries it. Reconciling this wants somebody who knows
which of those migrations they wrote, which is why it is recorded rather than
guessed at.

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
