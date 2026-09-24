# Store submission notes

Opened 23 September 2026 by Session A, because item 8 created two consequences
the founder accepted by name and there was nowhere to write them down. Nothing
in this file is a plan; it is the record of decisions already taken, plus the
one thing that is not done.

**Never put a credential in this repository.** This file names where each value
lives and who sets it, and never what it is. That applies to the reviewer
login, its password, and every key mentioned below.

The build and signing manual is `docs/MOBILE.md`. The state of readiness and
the founder's checklist to the stores is `docs/MOBILE_READINESS.md`. This file
is narrower: what the stores need to know about the platform being closed, and
the account they sign in with.

**The live checks are on a panel now (V-52).** `/admin/operations?tab=store`
runs, against the platform as it is this minute, the nine things a reviewer
checks by hand: the objectionable-content filter, report and block, the
reviewer login (it reads `STORE_REVIEWER_EMAIL` and `STORE_REVIEWER_PASSWORD`
from the server environment, falling back to the `SEED_REVIEWER_*` names the
seed script uses), the public deletion page, the two deep-link association
files, the processors the privacy notice must name, example labelling on the
landing page, the native start (V-11: the shell never opens on `/`), and the
native versions, which cannot be read from a server and say so: eight live
checks and one manual step. Each row says what it saw and the one thing to
fix. The same checks run every night (`/api/cron/store-readiness`) and raise
one alert when any is red. Prefer the panel to this file where the two
disagree; this file is prose and the panel is a measurement.

**A binary built before V-11 still opens on `/`.** The shell is kept off the
marketing page by the `ValloShell` mark it appends to its user agent, which is
set in `capacitor.config.ts` and baked in at `cap sync`. A build synced before
that change sends no mark, so the server cannot tell it from a browser. Rebuild
and resubmit both binaries after this change merges; do not submit an older
build.

---

## 0. The instruction this file exists for

The founder, 23 September 2026, in his own words:

> Remove "look around". You must sign in. Take the look around option off Get
> Started. Nothing inside the platform is visible without signing up or signing
> in. Two consequences I am accepting deliberately, so nobody treats them as
> bugs later. No listing will be indexed by Google, so the landing page becomes
> our only public surface. And both app stores will need the reviewer
> credentials, which makes the seeded demo account a hard requirement rather
> than a convenience. Write both into the store notes.

Both are written below. Neither is a defect and neither is to be "fixed"
without his word.

---

## 1. Consequence one: no listing will be indexed, and the landing page is our
   only public surface

### What is true now

`apps/web/src/proxy.ts` enumerates what a request with no session may have.
Everything else is refused before any page runs. A crawler is a request with no
session, so the closed set is closed to Google, Bing and every unfurler as
well.

Public, and the complete list:

| Surface | Why it is public |
| --- | --- |
| `/` | The landing page. The founder's named public surface. |
| `/about`, `/careers`, `/contact`, `/help`, `/docs`, `/docs/[slug]` | The company and support pages off the landing footer. A support page behind a login is a support page the person who most needs it cannot reach, and both stores require a working support URL. |
| `/terms`, `/privacy`, `/eula`, `/cancellations`, `/standards`, `/safety` | Legal and policy. A privacy notice nobody can read without an account is not a privacy notice. Both stores and any regulator must reach these cold. |
| `/delete-account` | Google Play requires a publicly reachable account-deletion URL that works without installing anything and without signing in. It also carries the restore form, which is the only step a person cannot perform signed in, because the account is banned for the grace window. |
| `/sign-in`, `/sign-in/email`, `/sign-up`, `/sign-up/email`, `/sign-up/verify`, `/forgot-password`, `/reset-password`, `/auth/callback`, `/start` | The doors. A lock with no door is a wall. `/auth/callback` is where every confirmation link lands and a session is the thing it is about to create. |
| `/welcome` | Get Started. First run is the first thing a reviewer and a stranger meet. |
| `/offline` | Served when there is no network at all, so it cannot depend on an auth call. |
| `/robots.txt`, `/sitemap.xml`, `/opengraph-image.png` | Fetched by machines that have no session and never will. |

Everything else needs an account. That includes the whole catalogue
(`/listing/[id]`, `/search`, `/stay/[id]`, `/stays`, `/restaurant/[id]`,
`/restaurants`, `/rent`, `/around`, `/price`), everything social (`/u/[handle]`,
`/post/[id]`, `/stories`), and every own-data surface and console.

### What went with it

**`apps/web/src/app/sitemap.ts` no longer reads the database.** It used to walk
`listings` and `accommodations` and emit a URL per published row. A sitemap
that names addresses a crawler is then refused at is worse than no sitemap:
Search Console reports each row as "Page with redirect" and the one honest
public surface is buried under the queue of bounces. The sitemap is now the
public page list and nothing else.

**`apps/web/src/app/robots.ts` names the closed trees.** That is a crawl
instruction and not a privacy control; the gate and RLS are what keep anything
private. It exists so a crawler does not spend our budget on redirects.

**`apps/web/src/app/(app)/layout.tsx` declares `robots: { index: false }` for
the whole consumer group.** The root layout says `index: true`, which was right
when browsing was open. Roughly half the routes under `(app)` carried no
directive of their own and went on inheriting an invitation to index a page the
gate refuses. No crawler can act on that, because the HTML is never served, but
a tag that contradicts the gate is a tag the next person reads and believes.

**`apps/web/src/app/sitemap.test.ts` holds the three statements to one
answer.** Every URL the sitemap emits is passed through `isPublicPath`, the
function the running middleware itself calls, and `robots.txt` is checked
against the same. The sitemap and the gate cannot drift apart again without a
red test naming the path.

### What is NOT affected, and must not be removed

`apps/web/src/lib/listings/syndication.ts` still governs the three remaining
ways a listing reaches a machine: the JSON-LD block, the Open Graph and Twitter
card, and email. The example listings are still refused at that gate. The
sitemap simply no longer has rows to pass through it.

### What it would take to put inventory back

Reopen the segment in `proxy.ts` FIRST. Restoring rows to the sitemap while the
gate is closed publishes a queue of refusals. The order matters.

---

## 2. Consequence two: the reviewer account is a hard requirement

### The plain answer, asked and answered on 23 September

**There is no working reviewer account today.** Checked against the live
project rather than inferred: seven accounts exist in `auth.users`, the oldest
from 7 August and the newest from 22 September, and none of them is the seeded
reviewer. `scripts/seed/store-reviewer.mjs` has **never been run**. The script
is complete and correct; it has simply never had the two values it refuses to
guess.

This mattered less while browsing was open, because a reviewer could open the
app and see the product without an account. After item 8 they cannot see one
screen of it. **Without this account, both submissions are rejected**, and it is
the first rejection reason rather than a late one: Apple's guideline 2.1 asks
for a demo account for anything behind a login, and Play's app access section
is a form field that cannot be left blank.

### What the script does, so nobody has to read it to trust it

`scripts/seed/store-reviewer.mjs`, run once with five environment values:

    SEED_REVIEWER_EMAIL=... SEED_REVIEWER_PASSWORD=... \
    NEXT_PUBLIC_SUPABASE_URL=... NEXT_PUBLIC_SUPABASE_ANON_KEY=... \
    SUPABASE_SERVICE_ROLE_KEY=... \
    node scripts/seed/store-reviewer.mjs

`--dry-run` reports what it would do and writes nothing. Run that first.

- It touches ONE account and creates no listing, booking or message. A seeding
  script that invents supply is a script that puts invented supply in front of
  a reviewer.
- It is idempotent. A second run finds the account, resets the password to the
  one in the environment, and changes nothing else.
- It confirms the email on creation, because a reviewer cannot open our
  confirmation mail.
- It records the terms and privacy receipts, so the account is not caught by
  the re-acceptance gate in front of the reviewer.
- **It never prints the password.** It prints the address, because that is the
  value the founder pastes into App Store Connect and Play Console.
- The last thing it does is sign in with the ANON key, exactly as the product
  would, and report whether a session came back. A seeded account nobody has
  signed into is the same unproven claim the script exists to end.

### Where the credential lives, and who sets it

| Value | Where it lives | Who sets it |
| --- | --- | --- |
| The reviewer login address | The founder's password manager, and the two store consoles. Never this repository. | The founder. |
| Its password | The same. Minimum twelve characters, enforced by the script, because this account is published to two app stores. | The founder. |
| `SUPABASE_SERVICE_ROLE_KEY` | The project's own settings and the deployment environment. It is passed to the script for one run and never written to a file. | The founder. |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Already in the deployment environment. | Already set. |

Nobody in a build session can do this part. It needs values only the founder
holds, and this container cannot reach the project over HTTPS in any case.

### What the reviewer will actually meet, stated honestly

Counted on the live database on 23 September rather than estimated:

| | |
|---|---|
| Published property listings | 64 |
| Of which example stock (`is_demo`) | **64** |
| Published accommodations | 5, all example stock |
| Real supply | **0** |

Every example listing renders the sanctioned statement on its own page: "This
is an example listing. No such property is available. Vallo has not verified
anything on this page." That is the honest posture and it is the one to declare
in the review notes rather than let a reviewer discover it. Both stores accept
a catalogue of clearly labelled examples; neither accepts one that pretends.

### What to write in the review notes field, both stores

Facts only, and each one true on the day of writing:

1. The account to sign in with, and that it is a standard consumer account with
   no special role.
2. That the whole product requires an account, so nothing can be assessed
   signed out beyond the landing page and the policy pages.
3. That the catalogue is currently example stock, labelled as such on every
   page, because the platform has not launched to supply yet.
4. The account deletion URL, `/delete-account`, and that deletion can also be
   started in the app under Settings then Account.
5. The support URL, `/help`, and the support address it carries.

---

## 3. Open, and named rather than left to be discovered

- **The reviewer account itself.** Not created. Founder only. Section 2.
- **The deep link back from a shared address.** The gate carries `next`
  through `/sign-in`, `/sign-in/email`, `/sign-up`, `/sign-up/email` and
  `/auth/callback`, so a shared listing opened signed out returns to that
  listing after signing in. One hop still drops it: the "New to Vallo? Sign up"
  swap link inside `components/auth/AuthChoices.tsx`, which is Session B's
  file. Filed as R16 in `docs/BUILD_07_LEDGER.md` section 49. Until it lands, a
  person who arrives at sign-in from a shared link and chooses to create an
  account instead finishes on `/home` rather than on the thing that was shared.
- **The native shell's first launch.** `capacitor.config.ts` loads the origin,
  so a store install opens `/`, the landing page, which is public and renders.
  Request W3 in `docs/SESSION_B_SCOPE.md` proposes pointing it at `/welcome`
  instead. Not done, not a blocker: `/` is public and carries Get Started.
- **The web manifest's `start_url` is `/`**, which is public, so an installed
  PWA still opens on a real screen rather than a sign-in wall.
