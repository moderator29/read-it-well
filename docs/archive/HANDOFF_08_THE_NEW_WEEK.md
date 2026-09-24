# HANDOFF 08: the new week

**Written 22 September 2026 by the planning session, for the build session.**

This handoff does not replace `docs/HANDOFF_05_UPGRADED_WIDE_PLATFORM_BUILD.md`.
That brief is still live and five of the seven workers stay on it. This file is
the SECOND brief: the new work the founder added this week, plus the re-audit
findings that the build session must fold into what it is already doing.

**A THIRD BRIEF NOW EXISTS AND IT OUTRANKS THIS ONE WHERE THEY DISAGREE:**
`docs/HANDOFF_09_THE_DIRECT_PLATFORM.md`, written the same day on the
founder's ruling. It changes what Vallo IS: the positioning, the supply
roles, the fee transparency layer, Price Check, and escrow end to end.
Read it after this file and before you plan.

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

**THE FOUNDER HAS SINCE MADE THAT DECISION: escrow is built, fully, end to
end.** See `docs/HANDOFF_09_THE_DIRECT_PLATFORM.md` section 6, which is the
governing text and which carries a hard regulatory gate on the custody path.

**Build instruction, unchanged by that decision.** `REVOKE EXECUTE ... FROM
authenticated` on all four, in a migration, and replace them with guarded
server actions. An unguarded money path with no product behind it is a hole
whatever the eventual structure turns out to be, so this does not wait on
anybody. Fix the dead brand note string in the same pass. Never delete the
functions.

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

### 5.1 The seven that will refuse us on submission one

Twenty five numbered work orders are in the research file with file and line.
These seven are the ones that decide whether we get in at all.

1. **Google sign-in cannot survive the native shell, and two of our own files
   say opposite things about it.** The Apple site association file
   deliberately excludes `/auth/*`, while `src/lib/native/deep-links.ts` says
   in its own words that OAuth is not survivable unless the callback is handed
   back to the app, because the PKCE verifier cookie lives in the web view's
   jar and not Safari's. A reviewer taps Continue with Google and comes back
   to a signed-out application. Include `/auth/callback*` ahead of the
   `/auth/*` exclusion, add the matching Android intent filter path prefix,
   and prove it on a device.

2. **Sign in with Apple is off while Google is on.** Guideline 4.8, automatic
   refusal. Either wire Apple properly or offer neither and rely on our own
   system alone. Wiring it is the right answer and it is already half written.

3. **The airplane mode test fails.** The offline card in
   `native-shell/index.html` is good and can never be reached in a shipping
   build, because `server.url` is set and no `errorPath` is configured.
   `server.errorPath` exists in the Capacitor CLI declarations. One line.

4. **A person cannot be reported or blocked inside a one to one
   conversation.** The database enforces blocks and only the social profile
   menu can create one. Apple 1.2 and Play's user generated content policy
   both require it on direct messaging. The content filter is fraud only: it
   matches account numbers and payment words and knows nothing about abuse or
   sexual content, and no image is moderated at all. There is no end user
   licence agreement anywhere in the repository, and sign up shows a passive
   terms notice rather than an acceptance. **This is the largest single piece
   of missing product in the store track.** It closes with: report and block
   in the thread, an acceptance at sign up recorded with its version and date,
   an abuse filter beside the fraud one, image moderation on upload, and a
   twenty four hour action commitment written into the terms and staffed.

5. **The iOS location purpose string is false.** `Info.plist` promises the
   position is never sent to Vallo, and two surfaces already send it, one of
   them storing a six decimal fix. The Android manifest compounds it by
   instructing whoever fills Play's data safety form to declare location not
   shared and not stored, which would be a false declaration to Google. Fix
   the string to describe what we actually do, fix the manifest comment, and
   make the data safety instruction match the code.

6. **`TravelTime` posts to `/api/travel-time`, which does not exist.**
   Verified: the API directory has no travel route. It renders twice on the
   listing page, so a reviewer grants a location permission and the control
   silently does nothing. Delete it. It is the cause of item 5 and it does not
   work.

7. **The privacy policy claims analytics we do not do.** There is no analytics
   or crash SDK in the dependency list. The policy, the Apple privacy label
   and the Play data safety form cannot all be true at once. Make all three
   describe the same reality, and note that section 8 item 1 of this handoff
   adds first party analytics, so write it for what will be true on submission
   day, not for what is true this afternoon.

### 5.2 Two rulings

**Crypto goes dark for version one.** The `/crypto` routes return
`notFound()`, not merely an environment gate. A token price table inside a
property application invites the content aggregator refusal and the crypto
financial declarations on both stores, for zero launch value. B6 in
`HANDOFF_05` is therefore deferred, not cancelled, and the proxy work stops.

**The example listings are the sharpest edge in the store track.** The
syndication file's own comment says forty two; the live count today is sixty
four, and all sixty four are examples. A two word badge is not enough. The
detail page carries the full statement in words, the review notes disclose it
verbatim, and section 1.1 of this handoff removes them from every count. Play
has no review notes field, which means on Play the product itself has to be
honest without a covering letter.

### 5.3 What is already clear, so nobody spends a day on it

Account deletion is genuinely excellent and already meets Apple 5.1.1(v) and
Play's dual in-app plus web URL rule. Play target API 36 is met. No restricted
permissions, no media permissions. Release build hygiene is unusually good:
not debuggable, R8 on, backup off, unsigned when the keystore is absent.
Export compliance is pre-answered. The 16KB page size requirement is satisfied
because there are no native libraries. And Paystack for real world services is
the correct answer under Apple 3.1.3(e) and Play's physical services
exemption: the appeal text for the 3.1.1 argument is written out in the
research file, ready to paste.

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

### 6.5 What the research actually found, folded in

**The toggle the founder is seeing is the landing search control, and it is
not a switch.** `components/site/landing/SearchPill.tsx:33` declares three
segments, Buy, Rent and Stay. `app/css/landing.css:927` declares
`grid-template-columns: repeat(4, minmax(0, 1fr))`. The fourth track takes its
share and stays empty, so at 390px roughly **79.5px, about twenty three per
cent of the control, is dead track to the right of Stay**. It is phone only,
because `:935` swaps to flex above 640px, which is why every desktop review
missed it. Verified independently by this session. The fix is to drive the
count from `ORDER.length` through a custom property, exactly as
`.nf-glass-seg` in `app/social.css:588` already does.

Beside it: the same control's segments are `white-space: nowrap` with no
`min-inline-size: 0`, so the LABEL escapes even when the track is right, and
the dock's tab labels have the same defect. Both bite hardest in Hausa, Igbo
and Yoruba, where the words are longer. `minmax(0,1fr)` frees the track, never
the item: that sentence goes in the ledger because it is the root cause of
three separate defects.

**No switch knob escapes its track.** All three switch implementations are
geometrically contained. So the fix list is about segmented controls and
labels, not about switches, and nobody should spend an afternoon on the
switches.

**A capsule that passes every grep.** `components/social/feed/PostCard.tsx:472`
is 24px tall with a 14px radius, a ratio of **0.583**, which is a capsule. It
is spelled with our own rectangle token, so every text search passes and the
browser still draws a pill. This is precisely the failure
`DESIGN_DIRECTION.md` predicted when the shape law was written as a ratio. Two
more sit at 0.438 and ten more on the 0.35 watch line. **Run the ratio
scanner, not the grep.**

**Eleven ways to draw a segmented control.** Also three switch
implementations, six page header families, two duplicate console headers, 393
`<Button>` uses against 123 raw `nf-btn` class strings, four skeleton
materials, no toast primitive at all, and seventeen hardcoded English strings
in a four locale product. The uniqueness sweep is mostly deletion.

**The sign-in marks: this was a decision, and the founder has overruled it.**
`components/auth/AuthChoices.tsx:120` draws the literal character `G` in a
span, with a comment saying a typographic mark was chosen because the palette
holds one blue family. That is why it renders as a white disc with a dark
letter. There is no Google asset anywhere in the repository, and the Apple
button does not exist at all: `startAppleOAuth` is exported and imported by
nobody.

The founder's ruling stands and it is also the correct one on the rules: a
typographic substitute is itself a violation of Google's branding terms. So
the real marks ship, drawn as images rather than inline SVG precisely so no
future `currentColor` sweep can recolour them. **Brand wins on the mark, our
radius wins on the button corner**, and Apple's own guidance explicitly
permits matching the corner radius to the rest of the application. "Continue
with Google" is already one of the permitted strings and is already our copy.
Re-verify both companies' current branding pages before shipping: the research
agent's egress could not reach either one.

**The admin console already is the mockup, except for the graphs.** Nineteen
destinations, the queue frame with search, date disclosure, status chips and
cursor pagination, and the shared furniture are all built. There is not one
chart under `app/admin`.

**Add no charting dependency.** Build inline SVG charts under
`components/ui/charts/`, extending the two hand rolled charts already living
in `components/agent/charts/`. The reasoning is measured, not aesthetic: every
console page is a server component today and the popular libraries' charts are
client components, our theme lives in CSS custom properties which a canvas
library cannot read without a flash, and every library's categorical default
ships the four banned hues. The bundle table is in the research file.

**A four slot categorical chart palette cannot be built inside our colour
law**, and that was proven with a validator rather than argued: emerald
against rose fails colour blind separation, blue against cyan fails the normal
vision floor. So charts are single series with a sequential blue ramp for
magnitude, plus one stacked status bar using the existing status four, which
already passes and already carries a shape and a word beside the colour.

**Build the charts in this order and refuse the one that would lie.** Start at
`/admin/audit`, because `audit_log` is the only table with real history. The
overview trend is refused until a `queue_snapshots` table exists, because the
queue counts are point in time and a trend drawn from them would be
fabricated. Two caps in the existing queries would also make a chart lie and
are named in the research file.

Two loose ends found on the way: `/admin/switches` draws buttons rather than
switches, and the revenue queries have no page in the admin navigation at all.

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

## 8A. Track L: light mode, which has never been tested once

**The full survey is `docs/research/LIGHT_MODE_SURVEY.md`, 1,588 lines with 378
citations. It is the work list. This is the ruling.**

The founder's report, verbatim: "our light mode in our platform is so fucking
worst ... images not showing icons bad containers color so bad switch stays
that's showing icon don't show ... it's many many areas".

He is right, and it is not many small bugs. It is **five root causes**, and one
of them explains most of the symptoms at once.

### 8A.1 Eighty four per cent of the object artwork has no light version

Counted from disk rather than from the documentation: **144 objects, 23 with a
light twin, so 121 have none.** `docs/ICON_SYSTEM.md:18` says 103 and 23, and
`glass.css:989` states the exit condition as `103 - LIGHT_TWINS.size`. The live
arithmetic is `144 - 23`, so the stated finish line has moved fifty one per
cent further away than the file tracking it believes.

**Nothing 404s.** `BrandIcon.tsx:431-444` only applies the night treatment when
an object is twinned, so an untwinned object keeps painting its dark artwork.
What kills it is the chip underneath: `--nf-icon-ground` is `transparent` at
night and a dark navy on paper, verified at `tokens.css:771` and `:2990`.
Measured across all 121, the median object pixel falls from 2.42:1 against the
night canvas to **1.60:1 against the navy chip, a thirty three per cent median
loss**, and 45 of them fall below 1.5:1. The chip itself is 13.47:1 against the
white page, so the eye resolves the square and not the object inside it. 89 of
100 static call sites take that chip.

**The fix model already exists in the product**: `glass.css:1073-1077` is the
one place the chip was designed in deliberately rather than inherited, which is
why the founder's home page tiles are the one thing in his screenshots that
reads correctly. Follow that pattern.

Commissioning the missing light artwork is a separate, larger job and is named
in the founder's list, not here. What this session does is make the 121
untwinned objects **legible on paper without new artwork**, and record which
surfaces still need the real thing.

### 8A.2 Eleven light rules are invalid CSS and are thrown away

`--nf-shadow-on-paper` at `tokens.css:1024` is a bare colour,
`rgb(18 21 26 / 0.18)`, with no length values. Eleven light theme rules write
it as the entire `box-shadow` value, verified in `threads.css` (six),
`admin.css` (three plus one inset) and `agent.css` (one). The grammar requires
the lengths, so **every one of those declarations is invalid and dropped by the
parser.**

At `admin.css:941-945` the dropped layer takes the flagged stat card's inset
rule down with it, so **the flagged admin card loses its flag on paper**, while
the comment above it explains why the flag matters. The fill beneath all eleven
measures 1.000:1. So admin, agent, host, messages and inspections have neither
fill nor shadow in light mode.

`check-css-tokens.mjs:456` already has the machinery for this and only tests for
a gradient in `box-shadow`. Changing `=== "gradient"` to `!== "shadow"` fails
all eleven today. Do that, then fix them.

**One caveat the survey states and this handoff repeats:** that a bare colour
in `box-shadow` is invalid follows from the CSS grammar and was not observed in
a browser. It is one line to confirm. Confirm it first.

### 8A.3 The container ladder collapses, and the glass fill inverts

`--nf-brand-edge`, the edge on every card, control, dock island and icon plate,
measures **2.53:1 on white**, under the 3:1 interface floor.
`--nf-edge-stride-base`, three quarters of every card's ring, measures
**1.31:1**. The light elevation rims are white on white and paint nothing. The
whole surface ladder spans 1.09:1. That is "containers color so bad", measured.

`--nf-glass-fill` is white at 7.5 per cent at night and **86 per cent on
paper**. Twenty three CSS rules plus `KycBanner.tsx:80` never got a light
override and now paint white on white, twelve of them row hovers, which is why
hovering a row in the drawer, messages, the share picker, wallet transactions,
settings, crypto and the admin rail does nothing visible on paper.
`light.css:686-706` already diagnoses this exact fault for the Tailwind utility
form and patches only that, and its call site list is stale in both directions.

### 8A.4 Four stylesheets have no paper twin

`side-flip.css` (590 lines), `chrome.css` (844) and `overlays.css` (328) have
no light version. `ambient.css` (644) correctly has none.

**The flip is the worst served surface in the product and
`DESIGN_DIRECTION.md:2` calls it the signature.**

### 8A.5 The founder's four screenshots, resolved

1. **The Stays cover.** `SideCover.tsx:76` draws
   `<BrandIcon name="hotel" size={128}>`, which takes the navy chip. The blue
   halo is `side-flip.css:273-278`, whose `drop-shadow` falls on the opaque
   chip and therefore renders a **square** glow. What looks like a step
   indicator is the three tile miniature, near white cards each holding a 40px
   navy chip, and the two that look flat measure 1.67:1 and 2.11:1.
2. **The drawer.** The avatar is the no photo initial on the brand gradient
   with a rim that flattens to the disc's own blue, so ring and disc merge. The
   coin is two faults stacked: the 44px coin is white at 95 per cent with a
   white rim on a white card, so it vanishes and leaves only the 30px navy chip
   inside it. **And `flip-coin`, the object commissioned for exactly that card,
   is used nowhere: the card draws `hotel` instead.** Console draws
   `shield-stop`, which `AppRail.tsx:207-213` forbids two lines earlier for the
   same reason.
4. **The dock.** `AppShell.tsx:252` reserves a fixed 96px while
   `--nf-tabbar-clearance` at `chrome.css:112` computes 80px plus the safe area
   inset, which is 114px on a notched phone. The token has five consumers and
   the app shell is not one of them. That is why the listing counts are clipped.

### 8A.6 The reason nobody caught any of it

**Nothing in the checks ever looks at paper.** `check-css-tokens.mjs:587-589`
excludes `[data-theme]` from the resting edge check **by name**, reasoning that
the default theme is the one that matters. `probe-contrast.mjs:33` measures four
elements on one route. `compare-surface.mjs` has no theme switch at all.

**So the theme every daylight user sees has never been tested once.** Fix the
three tools first, then fix what they find. A light defect that ships after
this week is a tooling failure, not an oversight.

Worst confirmed text failure is **1.00:1**, the settings hub avatar initials,
which are invisible. Then the example disclosure chip at 1.34:1, the switch
thumb when off at 1.09:1, the heart at 3.35:1.

**One piece of good news worth saying out loud:** there is zero raw hex or
`rgb()` outside comments across all 37 stylesheets. Every single defect is a
correctly tokenised rule reaching for the wrong token on paper. The discipline
is sound; the light half of the map was never drawn.

---

## 8B. Track M: the drift from the reference images, and the wallet

**The full survey is `docs/research/DESIGN_DRIFT_SURVEY.md`. This is the
ruling.**

The founder: "a lot of areas that need fixing on the frontend that other
session did that didn't look like the files we told it to follow ... especially
the wallet features".

### 8B.1 The wallet, four compounding proportion defects, all P1

1. **The balance figure is about thirteen per cent short.** `wallet.css:74`
   paints `clamp(2rem, 8.6vw, 2.75rem)`, which is 33.5px at 390. The render
   measures about 40px. The file's own comments at `wallet.css:101` and
   `money.ts:8` both say 2.6rem, so the intent was right: **the clamp only
   reaches 2.6rem at a 484px viewport**, which no phone is.
2. **The action tiles have a flipped aspect.** Shipped 71 by 83, portrait. The
   render is 77 by 60, landscape. This is the single most visible difference on
   the surface.
3. **The quick action cards are fifty per cent too tall**, 127.5px against
   85px, which is why all four titles wrap onto two lines.
4. **Every money page draws a second header row** under the app bar, costing
   about 68px the render does not spend.

Beside those: send, receive, transactions and payments all use the inline page
top where three renders show the **stacked** one that `PageHeader.tsx:98`
already implements, which is one prop in four files. The statement draws one
card per calendar day where the render draws one card with hairlines. And
sixteen banned grey borders sit across the money family in violation of a rule
written at the top of `wallet.css:17`.

### 8B.2 The structural cause, which matters more than any of them

`BUILD_06_LEDGER.md` section 6 opens with the words **"a scope closes only with
its row here"**, and it has **no row for wallet, send, receive, transactions or
payments.** Thirteen screenshots sit in `docs/design/proofs/e/` with no verdict
ever written against a governing image.

**The one family the founder named as worst is the one family that never went
through the gate.** Reinstate the gate and hold it: a scope without its row is
not closed, and the lead does not commit it.

### 8B.3 The reference folder nobody indexed

**`docs/design/references/founder/` holds eleven images, five of them named
GOVERNING, and `docs/design/CATALOGUE.md` does not mention that folder once.**
Verified.

Those are the founder's own corrective targets, sent after he saw what shipped,
and they are invisible to every session that reads the catalogue. The drift
survey nearly filed two false findings against them, and in both cases the
shipped code was right and it is `DESIGN_DIRECTION.md` section 2 that has gone
stale.

**First hour job: index that folder into the catalogue and give it explicit
precedence over the older renders. A founder target beats a generated render,
always.**

### 8B.4 Three capsules that pass every name check

`.nf-nav__whocta` at **0.52**, which is the drawer's "View profile" and which
has a comment directly above it claiming it is not a capsule, plus a proof row
in the ledger calling it one. `.nf-nav__badge` at **0.77**.
`.nf-detail-capsule` at **0.56**. Eleven more sit above 0.35. No grep finds
them and rule 10 passes all of them. Only the ratio sweep sees them.

### 8B.5 Two things not to touch

**Off brand leaks: essentially none.** No gold or warm hues anywhere, the
lettered hotel icon never copied, no garbled render text, real brand names
correctly translated. That discipline held.

**Nine places where the shipped code is better than the image**, listed in the
survey specifically so nobody "corrects" them back. Read that list before
touching any governed surface.

### 8B.6 One founder decision, carried here unanswered

In the render, a completed credit is drawn in **cyan**, measured. Ours is
emerald. Our own colour law says emerald means success and cyan means pending,
so following the image breaks the semantics everywhere else. The catalogue
recorded that colour as emerald, which was a misreading.

**Recommendation: keep emerald, treat the render as carrying a mistake, and
record it in the catalogue's off brand table.** If the founder rules otherwise,
the whole status palette moves together or not at all.

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

**A THIRD BRIEF ARRIVED AFTER THAT SPLIT WAS WRITTEN, AND SEVEN WORKERS NO
LONGER COVERS THE GROUND.** `docs/HANDOFF_09_THE_DIRECT_PLATFORM.md` adds four
tracks: the supply roles, the fee transparency layer, Price Check and escrow.
Two more tracks arrived in this file as well: Track L, light mode, and Track M,
the reference drift.

**Raise to nine workers if the session can carry nine.** The allocation:

- **Worker 8: Track G and Track H**, the supply roles and the fee transparency
  layer. One worker because Track H is the visible proof of Track G and they
  touch the same listing surfaces. **This is the largest single scope in any of
  the three briefs and it is the positioning**, so it gets the strongest worker.
- **Worker 9: Track J**, escrow end to end, everything in HANDOFF 09 section
  6.3, and nothing from 6.2 until the solicitor's answer is in the ledger.
- **Track L, light mode, goes to Worker 7**, because it is the token layer and
  Worker 7 already owns the token layer. It starts with the three checking
  tools, because HANDOFF 08 section 8A.6 is why nobody caught any of it.
- **Track M, the drift and the wallet, goes to the enhancement worker** if
  `HANDOFF_05` section 2's tenth worker still exists, and to Worker 7
  otherwise. Its first hour job is indexing
  `docs/design/references/founder/` into the catalogue, because until that
  happens every worker on the image sweep is reading a stale map.
- **Track I, Price Check, waits** until Track H and Track G are landed, per
  HANDOFF 09 section 8. Do not open it early. Its stage one instrumentation is
  shared with HANDOFF 08 section 8 item 1, so build that analytics table once,
  for both, whoever gets there first.

**If the session genuinely cannot run more than seven**, keep the seven, and
take the order in HANDOFF 09 section 8 literally rather than starting
everything. Report which tracks are not staffed rather than letting them look
staffed.
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

## 9.1 The size of the work, counted

The audit and recommendation worker is tracking **157 distinct build items**
across the five research files, plus a notification matrix of forty events
against three channels of which nine cells are built. The breakdown, so the
number can be checked rather than believed:

| Source | Items | Of which |
| --- | --- | --- |
| `UNFINISHED_WORK_AUDIT.md`, ranked table | 40 | 12 block launch, 17 hurt launch, 11 below that |
| `STORE_REJECTION_RISK_RESEARCH.md`, work orders | 25 | 7 refuse us on submission one |
| `ON_PLATFORM_SWEEP.md` | 32 | 24 departures to close, 8 half built flows, plus 4 permanent exceptions not counted here |
| `UI_UNIQUENESS_AND_ADMIN_RESEARCH.md` | 32 | 8 toggle and geometry defects, 24 uniqueness inconsistencies |
| `EMAIL_AND_NOTIFICATIONS_RESEARCH.md` | 28 | 10 built but unreachable, 18 not built at all |
| `LIGHT_MODE_SURVEY.md` | 5 root causes, 121 twinless objects, 23 white-on-white rules, 11 invalid shadows, 4 untwinned stylesheets | the five root causes are the unit that matters |
| `DESIGN_DRIFT_SURVEY.md` | 8 pick-up blocks | 4 wallet P1s inside block A |
| `ROLE_ARCHITECTURE_RESEARCH.md` | the whole of Track G | 3 forms, 2 axes, 3 badges, 15 surfaces on one vocabulary |
| `VALUATION_ENGINE_RESEARCH.md` | the whole of Track I | 3 stages, 9 refusal states |
| `ESCROW_END_TO_END_RESEARCH.md` | 15 defects plus 9 probes | E-1 to E-15, and no naira moves until all 9 pass |
| **Total, the countable rows** | **157** | the five newer files are tracks, not rows, and are counted by their own completion |

A further **16 items belong to the founder**, listed in the store research
file's founder section. They are not this session's work and nothing waits on
them except deep links, Sign in with Apple's credentials, and the store
enrolments.

The audit worker reports this count every time it reports, with the number
closed and the number still open. A count that does not move for two cycles is
itself a finding.

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
