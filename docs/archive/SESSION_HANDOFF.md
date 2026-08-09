# Handoff

> **ARCHIVED 2026-08-09. This does not govern any current decision.** Where it
> disagrees with the code, the database, `docs/PRODUCT.md`, `RECOMMENDATIONS.md`,
> `ROADMAP.md`, `KNOWN_GAPS.md` or `ARCHITECTURE_DECISIONS.md`, this file is
> wrong. See `docs/archive/README.md` for why it was retired and what survived it.


Written at the end of the session that ended on `d22f76e`. Everything below
was verified against a running build, not read off the source. Where something
could not be verified it says so.

`main` is green: typecheck 0, lint 0 errors, build compiles, and every spec
listed in "The suite" passes.

---

## 1. Read these first

- `docs/HANDOFF.md` is the contract for this codebase. It outranks this file.
- `docs/POLISH_PASS.md` is the working list. Items carrying **DONE** have a
  spec named beside them; treat anything else as unverified rather than as
  untouched, because several are finished and were never marked.
- `docs/DEAD_ENDS.md` is the half-loop audit. M6 and M9 closed this session.

**THE ONE LAW.** A feature is DONE only when the full loop closes: a UI
action, a validated server action, a database write under RLS, the UI showing
the new reality after a reload, the notification or email the event deserves,
and a Playwright test proving it. A screen with no write path is a half. A
table with no screen is a half.

---

## 2. The two things blocking everything else

Neither is code. Both are the owner's to do, and most of the remaining work
cannot be verified until they are done.

### The supply chain has not started, and somebody HAS signed up

Counted live on 2026-08-07, correcting the `profiles 0` this section carried:

```
listings 0   agents 0   agent_applications 0   bookings 0   reviews 0
profiles 1   user_roles 2   audit_log 4   areas 6   posts 12
```

The owner's address sat in `public.admin_bootstrap` as `super_admin`, waiting,
and the row is now claimed: there is one profile holding two roles, and four
audit rows behind it. The signup trigger reads that table, so signing up is what
starts the whole supply chain: admin exists, agent gets approved, agent lists,
search has something to return. The first link is done. The second has not
happened, because nobody has applied to be an agent yet.

The twelve posts are not people. Every one is `author_kind = 'SYSTEM'`, which is
the designed cold start, and the six areas come from `seed_first_areas_lagos`.

Until then discovery is genuinely empty. That is correct now rather than
broken: the invented catalogue of twenty-three places was deleted this
session, because twenty-two of them carried `verified: true` with fabricated
ratings on addresses that do not exist.

### The partner feeds have never been seen working

`GOOGLE_PLACES_API_KEY` is set in the owner's Vercel project and is not in any
sandbox, so the provider has never returned a real venue to anyone. The
routing is proved by 11 unit tests against a stubbed Google; the live pull is
not proved at all. **Do not report it as working until you have seen a real
hotel come back.**

Amadeus is dead. The self-service portal was decommissioned on 17 July 2026 and
the keys were disabled with it. The code stays registered and keyless, costing
one string check per search.

**It is NOT "two variables away", and this sentence used to say it was.** That
reading is what kept 417 lines of dead code in the tree, because a module one
credential from working is worth keeping and a module that would have to be
rewritten is not. Amadeus Enterprise is a different portal, a different auth
flow and a different API surface, so reaching it would be writing a new
provider, not pasting a key. `KNOWN_GAPS.md` carries the same correction and
the comment in `lib/inventory/index.ts` was fixed to match. `LITEAPI_KEY`
replaces it.

---

## 3. What is genuinely still open

Roughly sixteen items. None is large. Most need a signed-in session and real
inventory to verify, which is why they were not attempted.

**Needs inventory before it can be built or checked**

| # | Item |
|---|---|
| 8 | Aspect-ratio boxes on every image, so nothing shifts under a thumb |
| 13 | Total price first, with a per-night toggle |
| 14 | Service charge and caution deposit as separate labelled figures. Note: **no caution deposit exists anywhere in the schema.** Do not invent one |
| 15 | The price breakdown stays expandable at every step of the booking wizard |
| 20 | Skeletons shaped like the real cards, using the stride ring |
| 22 | Search scroll position survives coming back from a listing |
| 31 | Long-press quick actions on a card: save, share, hide |
| 39 | A "search this area" chip when somebody pans the map |
| 42 | Map and list hover synchronised |
| 45 | Alt text required on listing photos, with guidance at upload |

**Can be done now, without inventory**

| # | Item |
|---|---|
| 7 | No sentence is truncated. 76 `truncate` sites; a name or handle is fine, a sentence is not. Best done as a browser spec that finds elements actually clipped, not as a source review |
| 18 | Every error says what happened and what to do next. A copy sweep |
| 26 | Undo instead of a confirm dialog on unsave and draft delete |
| 30 | The tab bar hides on scroll down, returns on scroll up |
| 34 | Self-host and preload the exact Inter subsets in use |
| 37 | `save-data` and connection-aware media |
| 47 | The cancellation policy as a timeline rather than a paragraph |
| 48 | Split `globals.css` into partials |

**One request that was never fully stated**

The owner asked that "district should feed instantly" and the sentence cut
off. That area is the social layer. Ask what was meant rather than guessing.

---

## 4. Do not walk into these

Every one of these has already cost this project real time.

**A parallel session is working in the same tree.** It owns the visual and
premium-UI layer: `components/app/`, `AppShell`, `AppRail`, `MobileTabBar`,
the primitives in `components/ui/`. Check `git log -1 -- <file>` before
touching anything there. This session duplicated its overlay conversion and
its icon-scale sweep, both landed, mine conflicted across six files and were
dropped. Rebase often, and when you conflict with work that is already on
main and passing, take main's.

**A static scan of source is a guess; the running artefact is the answer.**
Four instances so far. A JSX scan reported 42 unnamed controls where the DOM
had 0. A rect-based hit test called every 40px button a failure when a
pseudo-element already carried the target. `elementFromPoint` returned null
for everything below the fold and read as unreachable. A contrast probe
scored against `rgba(0,0,0,0)` because its background walk stopped at
`<body>`.

**A grep that matches one syntax misses the other.** A sweep for `href="`
walked past a dozen `href: "` inside object literals and the job was reported
finished. Match both.

**Database traps.** RLS `WITH CHECK` runs AFTER before-triggers. A new enum
value cannot be USED in the transaction that adds it. A plpgsql body is only
parsed when it runs. A statement cannot see rows written by its own trigger.
`case ... end` over bare literals is `text` and will not coerce to an enum. An
`on delete set null` FK plus an UPDATE-refusing trigger locks a person out of
deleting their account.

**A probe through the service role bypasses RLS and therefore cannot test a
policy.** Use `set local role authenticated` with the `private.probe_as(uuid)`
helper. Read an existing migration that uses it before writing one.

**`pkill -f "next start"` matches nothing.** The process is `next-server`.

---

## 5. What shipped this session

Security, and the worst one was mine: a migration I wrote granted
`grant_staff_role` to `authenticated`, and it authorises off its own argument
rather than the caller, so any signed-in user could pass a super admin's uuid
and become super admin. Revoked to `service_role`, with a second check inside
the function. Also fixed: an open redirect in the auth callback where the URL
parser treats `\` as a path separator, an unrate-limited `fileSupportTicket`
that was an open relay for the sending domain, and no rate limits at all on
sign-in, sign-up or password reset.

The product moved behind a session. Twenty-one marketing links pointed into
it; the lock is in middleware because a link is not a lock. Signing in returns
you to what you were opening, across all five hops including the OAuth round
trip.

Privacy and Terms became real in-product pages at `/legal/*`, sharing one
source with the public copies, so the back button returns to the screen you
were reading from rather than the marketing site.

Hotels now come from Google Places using `includedType: "lodging"` rather
than `hotel`, because this market is full of guest houses and resorts that
never carry the narrow type. All 36 states and the FCT are searchable, up
from six; growing that list exposed a matcher that put Taraba and Asaba in
Abia because both contain "aba".

A `/docs` site of twelve chapters, with its figures imported from the modules
that own them. A `/styleguide` where every swatch paints its own token. The
map became keyboard operable. Empty states stopped telling three different
nothings the same story.

---

## 6. The suite

Run the server first, then the specs against it.

```
npm run build && (cd apps/web && npx next start -p 3210 &)
BASE_URL=http://localhost:3210 node apps/web/tests/<name>.spec.mjs
cd apps/web && npx vitest run     # 66 unit tests, no server needed
```

There are 78 node specs and 66 vitest tests as of 2026-08-07. This said 21 unit
tests, which was the count on the day it was written; the number is checked
rather than remembered now, because a suite that is quoted from memory is a
suite somebody assumes they have run.

Green as of `d22f76e`, which is a snapshot of that day rather than a list to
maintain: `icons-and-targets`, `polish-overlays-copy-status`, `styleguide`,
`map-keyboard`, `listing-detail`, `filters`, `discovery-behaviour`,
`light-and-water`, `money-and-numbers`, `i18n`.

Four specs skip loudly when the catalogue is empty and say so on the console.
That is deliberate. **If you make them pass by putting invented listings
back, you have undone the point.**

---

## 7. House rules, non-negotiable

- **Zero em dashes.** Anywhere. Commas, colons, full stops.
- Never the words "demo", "sample" or "preview" in user-facing copy.
- One blue family. **No orange, amber, gold, purple or magenta.** Dark is
  default, both themes must work, mobile-first at 390px.
- Money is integer kobo. **The platform charges no fees**, and the ledger
  enforces it: `gross = platform + agent + processor`, platform always zero.
- `BrandIcon` for content, `UiIcon` for navigation. The third tier is retired.
- Icon sizes are 12, 16, 20, 24, 28, 32. Nothing between.
- Every interactive target reaches 44px of pressable area, which is not the
  same as being painted 44px tall.
- Agents never run git. The lead commits.
