# HANDOFF 08: the new week

**Written 22 September 2026 by the planning session, for the build session.**

This handoff does not replace `docs/HANDOFF_05_UPGRADED_WIDE_PLATFORM_BUILD.md`.
That brief is still live and five of the seven workers stay on it. This file is
the SECOND brief: the new work the founder added this week, plus the re-audit
findings that the build session must fold into what it is already doing.

**Read in this order before touching anything:**

1. This file, whole.
2. `docs/PLATFORM_SURVEY_2026-09-22.md`: what is actually live, measured today.
3. `docs/research/UNFINISHED_WORK_AUDIT.md`: the eight tracks and the ranked table.
4. `docs/HANDOFF_05_UPGRADED_WIDE_PLATFORM_BUILD.md`: the standing brief.
5. `docs/DESIGN_DIRECTION.md`: the frontend law, Rule 4 above all.
6. `docs/BUILD_05_LEDGER.md` section 0: the twenty rules and the stop list.

The founder's standing rules have not changed and they are absolute. Zero em
dashes anywhere, code, copy, docs and commits. British spelling. Money is
integer kobo. No fees in copy. Escrow is promised nowhere. One blue family.
390px dark first. The shape law: every control carrying text is a rounded
rectangle, zero capsules, and the test is the ratio of radius to short side,
never the name of the token.

---

## 0. The one sentence that governs this whole week

**Nobody leaves Vallo.**

The founder's words: *"I want to make payment paystack is up but would take me
to another link to complete it, it should happen on our platform you feel me
check all areas too that have or stuffs like this would happen and tell it to
build it all no leaving our platform only if you want to receive email."*

Read it as law. Every payment, every verification, every document, every map,
every share, every support route, every third party integration completes
INSIDE our own chrome. The single permitted departure is the user's own mail
application, because they asked to be emailed. If a flow cannot be kept
in-app, it is not shipped until it can be, and the reason is written down.

This is not only the founder's taste. A native application that hands the user
to a browser to finish paying is the shape Apple reads as a web wrapper under
guideline 4.2, and it is the shape that loses payments: every hop out of the
app is a place a Nigerian data connection drops the session.

---

## 1. What the re-audit found, and what it costs

`docs/PLATFORM_SURVEY_2026-09-22.md` has the full measurement. The four
findings that change the plan:

### 1.1 The shop is empty and the window advertises stock

64 listings, 64 published, **64 of 64 flagged `is_demo`**. Zero bookings, zero
escrows, one wallet, two wallet entries. `public.platform_stats()` counts
PUBLISHED listings with no `is_demo` filter, so the landing page's stats band
and the category tiles advertise example stock as real supply.

**Build instruction.** Add the `is_demo` filter to `platform_stats()` in a new
migration, and make every count surface in the product read the filtered
number. Then make the honest zero state beautiful rather than sad: a stats
band that has nothing true to print prints the thing that IS true (the cities
covered, the verification promise, the fact that listing is open), and the
category tiles drop their counts rather than printing a lie. Nothing anywhere
says demo, sample, preview or coming soon: rule 13 still binds.

**Founder instruction, and it is the real one:** real listings are his to get.
That is in the chat message, not here.

### 1.2 The dead brand is inside the running engine

Fifteen live database functions and three `public.badges` rows still say
RentMe, including functions on the money path that write it into text a user
reads. The full list is in the survey, section 2.1. All eight cron jobs are
named `rentme_*` as well.

**Build instruction.** One migration, `the_engine_stops_saying_rentme`, that
rewrites all fifteen function bodies, updates the three badge rows, and
renames the eight cron jobs. Then apply
`20260915090000_the_database_stops_saying_rentme.sql`, which has been sitting
unapplied and closes the `/u/vallo` handle hole and the handle refusal
message. Probe both inside a rolled-back transaction first, as every migration
on this project is probed. Then grep the whole repository and the whole
database again and record the count as zero in the ledger.

### 1.3 Four escrow money paths are live with no product behind them

`escrow_fund_from_wallet`, `escrow_confirm`, `escrow_request_release` and
`escrow_raise_dispute` are `SECURITY DEFINER` and executable by any signed-in
user over PostgREST. No surface opens an escrow and no surface releases one.
`escrow_fund_from_wallet` writes the note "Held in escrow by RentMe" into
`wallet_entries.metadata`, which breaks the dead-brand rule and the
no-escrow-promise rule in the same string.

**Build instruction.** `REVOKE EXECUTE ... FROM authenticated` on all four, in
a migration, with a comment saying why and saying plainly that the machinery
stays for the day escrow becomes a designed feature. Fix the note string in
the same pass. Do NOT delete the functions. Do NOT build an escrow product:
that is a founder decision and it has not been made.

### 1.4 One function leaks to strangers

`public.agent_trust(p_user uuid)` is executable by `anon`. Signed out, anyone
can read any user's trust score, deal count, median reply minutes, review
count and average. **Revoke `EXECUTE` from `anon`.** Keep the grant to
`authenticated`. `platform_stats()` keeps its anon grant on purpose.

### 1.5 The schema cannot be rebuilt from the repository

Four migrations are applied in the database with no file on disk. Three files
sit in `supabase/migrations/` never applied. Until those seven reconcile there
is no reproducible environment and no safe restore.

**Build instruction.** Dump the four orphan migrations out of
`supabase.schema_migrations` and write them into correctly named files with a
header saying they are transcribed from the live database. Read the three
unapplied files, decide each one on its merits, apply or archive with a
written reason. Then prove it: the ledger records a statement that the file
set and the applied set match, with the count.

---

## 2. Track A: nobody leaves Vallo

The full sweep is `docs/research/ON_PLATFORM_SWEEP.md`. That file is the work
list for this track and it is file-precise; this section is the ruling that
governs it.

**The rules.**

1. A payment never shows the user another company's URL bar. Whatever
   integration shape achieves that on both the web and inside a Capacitor
   WebView is the shape we take, and the sweep names it.
2. Sign in with Google and Sign in with Apple happen in our own surface, with
   the platform-native mechanism on native and without a full-page bounce on
   web.
3. A document, a receipt, an agreement or an identity file is viewed inside
   the product. We never hand a PDF to the operating system as the only way to
   read it.
4. A map never offers a "view larger map" that leaves.
5. Support, help and contact resolve inside the product. An email is offered
   as a choice, never as the only route, and it is the one permitted exit.
6. `@capacitor/browser` stays in the dependency list because there will always
   be a genuinely external link, a partner's own terms for example. Every
   remaining caller of it is listed in the ledger with the reason it is
   allowed to exist. The list is short and it is argued, not assumed.

### 2.7 What the sweep found, so nobody has to re-derive it

**Twenty eight departures.** Eight of them are money and all eight are a bare
`window.location.assign` to Paystack: the stay checkout and its 3-D Secure
fallback, the rent payment and its 3-D Secure fallback, the wallet top-up and
its 3-D Secure step, the add-a-card setup charge, and the crypto top-up.

**The half of the fix that is already written.** `initializeTransaction` in
`apps/web/src/lib/payments/paystack.ts` already returns Paystack's
`access_code` on every single transaction, and not one caller in the codebase
reads it. Verified independently: the only `accessCode` in the product is the
estate gate code on a listing. So the server half of an in-app checkout has
been built and thrown away on every payment this platform has ever
initialised. `PaystackPop.resumeTransaction(accessCode, callbacks)` from
`@paystack/inline-js` renders the checkout in an iframe on our own page with
our own URL bar, and closes all seven Paystack departures with no new server
call.

**The one directive that blocks it.** `apps/web/src/lib/security/csp.ts:368`
is `frame-src 'none'`, with a comment stating that we frame nothing and have
no embedded checkout. That changes, deliberately, narrowed to exactly the
Paystack origins and nothing else, with the reason written beside it in the
form that file already demands of itself. `security.test.ts` and
`tests/csp.spec.mjs` move with it. **A wildcard here would be a security
regression and is refused.**

**Three things the sweep could not prove, and they are the first things to
test, not to assume.** Whether 3-D Secure renders inside that iframe rather
than opening a window. Whether `resumeTransaction` works without also passing
a public key, because if it needs one then `docs/ENVIRONMENT.md` and
`docs/DEPLOY.md` are both wrong today. And the inline library's behaviour
against a real card, because the sweep's egress could not reach Paystack's own
documentation and read the packaged library instead. Test all three with a
live test card before a line of UI is built on top of them.

**A live bug, found on the way.** `externalHttpUrl` returns `null` for a
same-origin URL, so `<Link href="/terms" target="_blank">` in the host wizard
escapes the WebView into the system browser. A host applicant is thrown out of
the application by our own legal page. Two lines.

**Three national identity documents are reviewed on somebody else's domain.**
The KYC, businesses and agents admin desks open signed Supabase Storage URLs
with `target="_blank"`, so an operator reads a person's ID on `supabase.co`
and the signed URL sits in the DOM. Build the in-app `DocumentViewer` and
route all three through it.

**Two props exist whose only purpose is to leave.** `StickyAction.external`
and `RowLink.external` have zero call sites. Delete them. A prop that exists
only to take a user off the platform should not be in this codebase.

**Four departures are genuinely impossible and are allowed to stay:** the
three `tel:` anchors, because a web application cannot place a call, and a
user's own profile link, because linking out is the entire feature. The
profile link gains an interstitial that names the destination host.

**The permitted exception, narrowed.** `mailto:` support through
`lib/support-email.ts` and its six consumers is the one exit the founder
allows. Even so, `/contact` becomes the default route and the mailbox is
offered beside it, not instead of it.

**Definition of done for this track.** A written table in the ledger, one row
per departure found in the sweep, each marked closed with its commit, or
marked open with the reason it cannot close and what it needs. Zero rows are
left silently.

---

## 3. Track B: the emails

The research, the constraints and the complete templates are in
`docs/research/EMAIL_AND_NOTIFICATIONS_RESEARCH.md`. Build what it specifies.

The founder's brief, verbatim: *"emails design our email to be perfect when
someone want to verify his email the code that would be sent should be
magnificent glass style lovely clean and all emails password reset and all
welcome email etc it should be lovely and welcoming."*

**What ships.**

1. A shared email shell: the Vallo lockup, the body card, the footer carrying
   VALLO SPACES LTD and RC 9870413, from `hello@vallospaces.com`.
2. The verification code email. The code is the hero: large, letter spaced,
   readable with images off, and selectable so a person can copy it.
3. The password reset email.
4. The welcome email.
5. Every other email the product already owes, on the same shell.

**The engineering constraints are not negotiable and they are in the research
file.** Glass in email is a painted illusion, not `backdrop-filter`. There are
no CSS custom properties: every colour is a literal hex. Layout is tables. The
product's SVG icon system does not survive an email client, so the research
file says what replaces it. Every email has a plain text alternative and a
preheader. Nothing is under 4.5:1 contrast and nothing depends on images
loading.

### 3.1 Three corrections that must be made before a template ships

**The blue in the research file is the OLD blue, and it is my error, not the
research agent's.** I briefed it with `#0C39EF` and `#5C7CFF`. Those values
were retuned on 19 September and the reason is written into
`packages/design-tokens/src/tokens.css:137` and `:239`: the old electric blue
failed contrast at 2.75:1 against the new 4.18:1, and the old quiet blue sat
thirteen degrees of hue away from its own family, towards violet, which the
palette forbids. The live tokens are `--nf-electric-400: #0C6AEF` at `:161`
and `--nf-brand-quiet: #5C9FFF` at `:267`. **Every hex in every email template
is re-derived from the live tokens before anything is sent.** An email cannot
read a CSS custom property, so the hex is baked, and that is exactly why it
goes stale: add the test that asserts the baked email hex still equals the
token, so this cannot happen a second time.

**The RC number is missing from our own legal line.**
`apps/web/src/lib/legal/company.ts:54` has `COMPANY_RC_NUMBER = null`, so
`COMPANY_FORMAL_NAME` renders with no RC anywhere in the product or in any
email. The company was incorporated on 18 September 2026 and the number is
**RC 9870413**, recorded in `docs/HANDOFF_01_COMPANY.md`. Set it. It is a
fact, not a decision. Three files move together and `shell.test.ts` asserts
the legal line, so the test moves with them.

**The repository disagrees with itself about how Supabase sends auth mail.**
`docs/AUTH_EMAILS.md` documents custom SMTP as the chosen route and argues
against the hook. `apps/web/src/app/api/auth/email-hook/route.ts` is a
complete, signature verified Send Email Hook. Both cannot be live. **Establish
which one is actually configured before touching either**, then rewrite
`AUTH_EMAILS.md` to match reality and delete whichever path lost. Note the
consequence the research file records: custom SMTP imposes a thirty messages
per hour ceiling the moment it is saved, and the hook makes the five generated
templates dead weight. The configuration itself is a dashboard action and
therefore the founder's; the code and the document are this session's.

### 3.2 What the research found about our email layer

The machinery was never the gap. There is already a hand written Resend client
over `fetch` with no SDK, a block based renderer that emits HTML and plain
text from one description, and a twenty message catalogue. **Ten of those
twenty messages can never be reached by any code path**, and the reason is
structural rather than careless: every message that does send hangs off a
server action or an API route, and every message that does not belongs to an
event whose in-app notification is written by a database trigger. The email
layer and the trigger layer have never met. That junction is the real work of
Track B, and it is the same junction Track C needs for push, so build it once.

Two emails that do not exist anywhere and must: **"Your password was
changed"** and **"New sign-in on a new device"**. Those are security
obligations, not nice to have, and a marketplace moving money without them is
negligent.

**Do not invent copy.** The research file carries the approved copy. If a
sentence is missing, write it in the product's voice: short, warm, no
exclamation marks, no marketing adjectives, no em dashes.

---

## 4. Track C: notifications, fired up

The founder's instruction: fire up all the notifications.

The gap matrix is in the research file: every event, every channel, what is
built and what is missing. Work it from the top of that matrix down.

**The three legs.**

1. **In-app.** Already has a table and a surface. Prove the unread count is
   live, prove a new row reaches an open page without a manual refresh, and
   prove the deep target of every notification resolves to a real screen.
2. **Email.** Every event whose matrix row says a person would want to know
   while they are not in the app gets an email on the Track B shell. Every
   email is governed by a preference the user can turn off, and the preference
   surface is built in settings.
3. **Push.** Nothing exists today. This is the largest single piece of new
   work in this handoff and it is also the strongest answer to Apple's
   guideline 4.2, because a web wrapper cannot do it. The research file
   carries the token table schema, the permission request rules for iOS and
   for Android 13 and above, and the delivery path from a database trigger to
   a device.

**The permission rule, because it is the one everybody gets wrong.** We never
ask for notification permission on first launch. We ask at the moment the
person has just done the thing that makes a notification valuable, with one
sentence saying what we will send, and a refusal is remembered and respected
and never asked again from the same place.

---

## 5. Track D: the store rejection sweep

The full research is `docs/research/STORE_REJECTION_RISK_RESEARCH.md`: every
guideline, what our repository does today with path and line, the verdict, and
the fix. Work it in the order that file ranks.

**What the build session owns:** every row marked as a code fix.

**What the founder owns:** every row in that file's FOUNDER section. Those are
in his chat message and they are not this session's work. Do not block on
them; build everything that does not wait on them, which is nearly all of it.

**The two that are already known and are not waiting on research.**

1. **Deep links are dead.** `apps/web/public/.well-known/assetlinks.json`
   carries two placeholder SHA-256 fingerprints and the Apple site association
   file carries `PLACEHOLDER_REPLACE_WITH_APPLE_TEAM_ID`. The values are the
   founder's to supply. What the build session does now is make the failure
   loud: a check that fails the build, or a test that fails, rather than a
   placeholder that ships silently.
2. **Sign in with Apple is not configured while Google is offered.** Apple
   guideline 4.8 makes that an automatic rejection. `startAppleOAuth` exists
   and is never called. Wire it, and wire it inside our own surface per
   Track A rule 2.

---

## 6. Track E: the interface reads as one product

The research is `docs/research/UI_UNIQUENESS_AND_ADMIN_RESEARCH.md`, parts one
to four. It is the work list. This section is the ruling.

### 6.1 The toggles that render outside their own areas

The founder is seeing controls whose moving part escapes its track. Part one
of the research file measures every toggle-like control in the product against
its own CSS and says which ones can escape and by how many pixels. Fix every
one, and add the regression guard so it cannot come back: the geometry is
asserted, not eyeballed.

### 6.2 The uniqueness sweep

Part two lists every place the same semantic control is drawn two different
ways. For each row: pick the canonical one, delete the other, and make every
caller use the survivor. This is deletion work as much as design work, and the
ledger records the line count that went away.

Also in this sweep: any control still shaped as a capsule. The test is
mechanical. Radius divided by short side, anything at or above 0.5 is a
capsule however it is spelled, and
`scripts/design/compare-surface.mjs --shape-sweep` is the only check that sees
it. Run it, record the number, drive it to zero.

### 6.3 The sign-in buttons show real brand marks

The Google button renders a white or generic G today and the Apple button is
generic. Part three says exactly why and exactly how to fix it, and it carries
the two companies' own branding rules, which are mandatory and which the
review process checks.

**Where brand rules and our shape law collide, the brand rules win on the mark
itself and our radius governs the button corner wherever the brand permits a
radius.** That is a narrow, written exception to Rule 4 and it is the only new
one.

### 6.4 The admin panel

The founder wants the admin surfaces we already have mixed with the console he
supplied as a reference: a left navigation, filter chips across the top, a
table with coloured status pills, pagination, and real analytics graphs. Part
four inventories what exists, recommends the charting approach, and says which
metrics each desk should draw from data we actually have.

**Charts obey the palette.** One blue family, emerald for good, rose for bad,
bright cyan for pending. No orange, amber, gold, purple, violet or magenta,
including inside a chart library's default theme, which is where they always
sneak in. A chart that needs six series gets six depths of blue.

**A chart never invents a number.** With one wallet and two wallet entries in
the database, most of these graphs draw an honest near-empty line, and that is
correct. An admin chart that fabricates a trend is worse than no chart.

---

## 7. Track F: the mobile landing page, answered

The founder's question: on mobile there is no landing page, and the landing
page is essential, so how is it done.

The measured answer is in the survey, section 4. It resolves into three pieces
of work.

1. **The web landing stays exactly as it is.** It is already responsive: 1,957
   lines of mobile-first CSS with escalations at 640 and 1024. On a phone
   browser it renders. Nothing to fix there beyond the stats honesty in 1.1.

2. **`/` stops being the answer for a signed-in person.** `/home-or-landing`
   already exists to resolve this and the root route does not use it. A
   signed-in person opening the application must land in the product. Make the
   root resolve by session, keeping the landing page as the signed-out answer,
   and keep it a 307 so no browser caches the wrong one.

3. **The native application opens on a native first-run, not on a brochure.**
   Build a first-run sequence in the app's own chrome that carries the landing
   page's substance: what Vallo is, the two sides and the coin that turns
   between them, what verified means, and the four things a person can do
   here. It is swipeable, it is skippable, it is seen once, and it ends on the
   choice to sign in, create an account, or look around first. `/welcome`
   already exists and is the natural home for it.

   The marketing landing stays reachable from inside the app in one honest
   place, About Vallo in the More surface, for the person who wants to read
   the pitch. It is never the front door of the application.

   **Why this is not optional:** a native application whose first screen is a
   marketing website is the exact shape Apple rejects under guideline 4.2.

---

## 8. What was missing from both lists

These are not in the founder's message and they are not in any earlier
handoff. They were found in this re-audit and they belong in this week.

1. **No product analytics of any kind.** There is crash reporting through a
   deliberately minimal Sentry transport and there is nothing else. On launch
   day nobody will be able to answer how many people reached checkout and left.
   This is not a reason to install a heavy vendor SDK: the same argument that
   kept `@sentry/nextjs` out applies. Specify and build a small first-party
   event table plus one server-side recorder, with a fixed allow list of event
   names and no personal data, and one admin desk that reads it. Rule 16 binds
   it absolutely.

2. **No seeded environment and therefore no demo account.** Both stores
   require credentials a reviewer can sign in with, and this repository has
   never had a signed-in session to look at. This has been asked of the
   founder repeatedly. Build the seeding script so that the moment he answers
   it takes one command.

3. **The terms of service acceptance is not recorded per user.** For a
   marketplace that moves money in Nigeria under the NDPA and under AML
   retention, the date and version a person accepted is a record you need
   before you need it, not after. One table, one write at sign-up, one row on
   the admin user panel.

4. **Nothing throttles authentication.** Money paths have rate limits on all
   nineteen. Sign-in, sign-up, password reset and the verification code
   resend, which are the four doors an attacker actually knocks on, are not in
   that list. Verify and close.

5. **The offline card is the first thing a reviewer on a bad hotel connection
   sees.** `apps/web/native-shell/index.html` is a fallback nobody has
   designed. It ships in the binary and it carries the brand. Give it the same
   care as a real surface.

6. **Backups and restore have never been tested.** Knowing the plan's
   retention is not the same as having restored once. This is a founder item
   and it is in the chat message.

---

## 9. How this session runs: seven workers

The founder's instruction: it is a new week, the session is back up, restart
every engine, restart every agent that died, and run seven agents. Five stay
on the initial handoff work. Two take the new work. One of the seven resumes
as the audit and recommendation agent.

**The split.**

- **Workers 1 to 5: `HANDOFF_05`, unchanged.** The backend items B0 to B7 and
  the image-driven frontend sweep F1 to F5. Everything that brief says still
  stands. B0 in particular is still first: the demo-reservation hole, the
  reservation thread binding, and the unaudited money-path commit `73e284e2`.
- **Worker 6: Track A and Track C.** Nobody leaves Vallo, and notifications
  end to end. These are one worker because they share the payment and delivery
  surfaces and would collide if split.
- **Worker 7: Track B and Track E.** The emails and the interface uniqueness,
  toggles, sign-in marks and the admin console. One worker because both are
  presentation and both touch the token layer.
- **The audit worker is worker 5 resuming its old post**, and it is not a
  builder. It re-audits every scope as it closes, it owns Track D's checklist,
  it keeps the ledger's verification column honest, and it re-audits every
  money path end to end including the four in section 1.3 and the nineteen
  rate-limited paths. It reports the count of open items every time it reports
  at all.

**The contract, unchanged and absolute.** Strict non-overlapping written file
scopes. Agents never run git. A finding outside your scope is a line in your
report, never an edit. No success report is believed without the lead's
verification. Every worker restates the twenty rules before its first edit.

**The ledger for this week is `docs/BUILD_07_LEDGER.md`.** Create it in the
first hour with the same anatomy: rules restated, scopes, queue, landed table
with commits, probes, pitches, and what needs the founder.

---

## 10. Definition of done

1. Every departure in `ON_PLATFORM_SWEEP.md` is closed or argued in writing.
2. The three emails ship on one shell, and every other email the product owes
   is on the same shell.
3. Push notifications deliver to a real device on both platforms, and every
   row of the notification matrix is built or written off with a reason.
4. Every code-fix row in `STORE_REJECTION_RISK_RESEARCH.md` is closed.
5. `--shape-sweep` returns zero. No toggle can escape its track, and a test
   says so.
6. The Google and Apple sign-in marks render correctly and comply with both
   companies' branding rules.
7. The admin console reads as the reference, with charts that obey the palette
   and never invent a number.
8. The native application opens on its own first-run and never on the landing
   page, and a signed-in person is never shown the marketing page by the root
   route.
9. The dead brand returns zero occurrences in the repository AND in the
   database.
10. The migration file set and the applied set match, and the ledger states
    the count.
11. `HANDOFF_05`'s own definition of done is unchanged and still applies to
    workers 1 to 5.
12. `BUILD_07_LEDGER.md` is maintained throughout, and a short honest
    close-out reaches the founder in his language: what is live, what is
    proven, what needs his word.

**The bar has not moved. Almost identical if not identical to the reference
images, alive, premium, and still honest and functional underneath. Both at
once. Build it.**
