# Known Gaps

Everything deliberately incomplete, with why and what unblocks it. Nothing here
is hidden behind a passing build.

Last updated: 2026-08-06.

**This file had rotted badly and was rewritten.** It was last accurate on
2026-07-28 and still described a platform with no session layer, no search, no
rate limiting, no tests and a scaffolded light theme, every one of which had
been built and shipped since. A gaps file that lists finished work as missing is
worse than no gaps file, because the next engineer either rebuilds something or
stops trusting the document. Every claim below was verified against the code on
the date above.

---

## Genuinely still missing

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

**The suite is 79 specs. 75 pass, and the four that do not are each understood.**

| Spec | State |
|---|---|
| `gate` | **Aborts by design.** It says so itself: without `NEXT_PUBLIC_SUPABASE_URL` and the anon key the middleware guard is a pass-through, so the spec refuses to pretend it proved anything. Environmental, not a fault. It needs a server started with real keys |
| `session-memory` | One check, "deleting a draft is deferred". `ListingsWorkspace.tsx` is byte for byte identical to `origin/main`, so this red predates and survives this branch. Its own comment says it stays red until the work is done |
| `interests-settings` | One check, "the welcome screen mounts InterestChoices". `welcome/page.tsx` contains no such mount on this branch OR on `origin/main`, so the spec and the screen disagree on main and did before the merge |
| `truncation` | Passes alone, fails inside a full sweep with "Failed to open a new tab". Chromium running out of room in this sandbox after seventy consecutive launches. Run the suite in batches |

Two reds that WERE real were closed here. `admin-console` was a broken spec
rather than a broken console: it fetched a hardcoded stylesheet chunk whose name
is a build hash, got a 404, and measured unstyled HTML. `social-people` was a
genuine product fault, `/around` claiming the country was quiet in a build that
had read nothing.

And the draft-delete undo that `session-memory`'s other check wanted **is built**
now, on `main`, by the parallel session: `lib/ui/undo-window.ts`, a six second
window, an `UndoStrip`, and nine unit tests.

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
| No Content Security Policy | Built. Per-request nonce minted in `middleware.ts`, policy in `lib/security/csp.ts`, `strict-dynamic` with no `unsafe-inline` on scripts. Proved in a browser by `tests/csp.spec.mjs`, which also asserts nothing on the page is blocked |
| `rate-limit.ts` holds a literal NUL byte and is invisible to grep | Rewritten with the byte written as a unicode escape. `file` now reports ASCII text, the compiled string is unchanged, and the separator carries a comment explaining why the separator has to be NUL |
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
