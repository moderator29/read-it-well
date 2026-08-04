# RentMe: Session Handoff

You are the co-founder engineer on RentMe, a Nigeria-first discovery, property,
hospitality and booking platform. This document is the contract. Read it fully
before touching a file, then read the documents in section 1 before writing a
line of code.

The platform LOOKS finished, and large parts of it genuinely are. What remains
is the social layer, plus a queue of platform upgrades, and both have to be
built to the standard of everything already here.

Owner: moderator29. Repository: `read-it-well`. Branch: **`main`**.

---

## 0. THE ONE LAW

A feature is DONE only when the FULL loop closes:

1. A UI action a real person can take
2. A validated server action
3. A database write that survives RLS
4. The UI showing the new reality after a reload
5. The notification or email that the event deserves
6. A Playwright test proving all of it

**A screen with no write path is a half. A table with no screen is a half.
Never build two halves when you can finish one whole.**

Work in vertical slices: schema, action, UI wiring, test, screenshot, push.
Not horizontal layers. Not "the backend for six features". One whole thing.

---

## 1. Read these before you write anything

In this order. They are not background reading, they are the brief.

| File | What it is | Why you need it |
|---|---|---|
| `docs/HANDOFF.md` | This file | The contract |
| `docs/SOCIAL_TODO.md` | The social layer plan | Your main build. 45 unchecked boxes, 0 done |
| `docs/SOCIAL_LAYER.md` | Earlier thinking behind it | The reasoning, superseded in part by SOCIAL_TODO |
| `docs/BADGES.md` | Earned standing for agents and members | Feeds the social layer's S5 |
| `RECOMMENDATIONS.md` | 52 formal R-01 to R-52 entries | The considered upgrade list |
| `docs/recommendations-inbox.md` | 250 raw numbered items | **The full pool agent 1 picks from** |
| `docs/ICON_SYSTEM.md` | The three-tier icon system | You WILL get this wrong without it |
| `KNOWN_GAPS.md` | What is honestly missing | Do not rediscover these |
| `docs/DEAD_ENDS.md` | Audited dead ends with file:line | Same |
| `docs/MASTER_TODO.md` | The long build order and architecture canon | Context for what came before |
| `ARCHITECTURE_DECISIONS.md` | Why things are the way they are | Read before proposing a rewrite |
| `docs/DEPLOY.md` | Deploy and env reality | Before touching config |
| `docs/HYBRID_INVENTORY.md` | Hybrid supply providers | If you touch inventory |

**Do not skim these.** Several of the most expensive mistakes in this project's
history were things already written down in one of them.

---

## 2. Owner rules, all binding

These come from the owner directly. The newest instruction always supersedes an
older one, and everything below is current as of this handoff.

### 2.1 Brand

1. **Deep navy-black, dark neon blue, electric blue glow.** Never purple, never
   violet, never magenta, never generic SaaS blue.
2. **There is NO orange, amber or gold in this product.** The owner's words:
   "Remove any design system that's orange anything like that remove it, it's
   blue, our blue, I don't want to hear that anymore." Every warm and purple
   token has been deleted from the palette outright. If a new accent is needed,
   it is a different DEPTH of blue, never a new hue.
3. The only two hues outside the blue family are **emerald for success** and
   **rose for error**. They earn it by meaning something no blue could. The
   attention/warning state is **bright cyan** (deep cyan on paper), inside the
   family. That was the decision made when orange was removed.
4. Sampled anchors: base `#010118`, glow `#0C39EF`, mid `#000F98`, neon
   `#0010E0`, electric `#0010D0`, ink family down to `#000010`.
5. **Dark is the DEFAULT and the operating system does not override it.** Only
   an explicit stored choice moves the theme. Light mode is a designed paper
   twin: flat neutral canvas, white cards, neutral hairlines, brand blue only
   on active, focus and CTA. No blue-tinted greys, no dark-only panels left.
6. The supplied background artwork is the canonical visual source. Use
   `background-image`. Do not recreate it with CSS gradients.
7. Scene artwork rule: never cut the background out of a supplied scene.
8. Logo: `/brand/rentme-logo.png` is the transparent cutout;
   `rentme-logo-ink.png` is the ink recolour CSS swaps in for light.

### 2.2 Product

9. **The platform charges NO fees anywhere.** Copy must never mention a fee. If
   a payment processor takes something, label it honestly as the processor's.
10. Money is **integer kobo** (bigint) everywhere. `Math.round(naira*100)` only
    at the input boundary. Display only through `formatMoney` from
    `@naijafinds/i18n`. Never float money. Never divide by 100 yourself.
11. **RENT is message, inspect, then pay.** No Reserve button on a rental.
12. The verified badge is **first-party inventory only**.
13. Zero "sample", "preview", "demo" or "not live" strings anywhere in UI copy.
14. Messaging trust flow: guests DM agents of approved listings; a database
    trigger flags 10-digit account numbers and payment keywords to admin;
    in-chat verify-inspection sheet; "pay only after inspection" messaging.
15. The owner adds all environment keys personally. Never block on a missing
    env. Env-guard every client and degrade into an honest, designed state.

### 2.3 Craft

16. **Mobile-first at 390px**, always, then up. Verify every new surface there.
17. **ZERO em dashes** anywhere: code, copy, docs, commit messages. British
    spelling in docs and product copy.
18. Navigation icons are stroked `UiIcon` glyphs. Content objects are
    `BrandIcon` (57 commissioned 3D objects, props name/size/fill/label/
    priority/className, there is NO `ramp` prop). `Icon` and `Icon3D` are
    RETIRED. Never import them.
19. Full-page drawers, never partial. Footer on landing and site pages only.
20. Every app page has a PageHeader back button following real history
    (`history.state.idx > 0 ? router.back() : router.push(fallback)`).
21. No focus rectangles on pointer clicks (`:focus:not(:focus-visible)`).
22. No gibberish, no lorem, no dead ends. Every state is designed, including
    empty, error, signed-out and unconfigured.
23. Beyond industry standard. 2030-generation clean.

### 2.4 Working

24. **Branch: `main`.** The owner moved everything to main so Vercel
    auto-deploys from it. All previous feature branches are fully merged and
    hold nothing main does not.
25. Commit and push green snapshots often. Keep the tree clean.
26. Screenshots to the owner sparingly, at milestones, 390px dark first.
27. **Exactly TWO subagents, never more.** See section 5. The owner has been
    explicit and repeated: a large fleet burned an enormous amount of usage
    for very little gain.
28. Subagents get strict non-overlapping file scopes and never run git.
    **The lead commits, and the lead re-audits before committing.**

---

## 3. Where things actually stand

### 3.1 Done and verified

The booking, wallet, payment, messaging, listing, admin and agent loops close
end to end. Each of these was proven against live Postgres with real rows that
were then removed:

- Reserve holds the calendar, and an abandoned hold auto-releases the nights it
  took (without also releasing a night an agent closed by hand).
- Card checkout and wallet payment settle through one shared implementation, so
  the webhook and the return path cannot disagree.
- `private.pay_booking_from_wallet` writes six things in one transaction: wallet
  debit, payment attempt, balanced zero-fee ledger row, booking transition,
  state event, calendar nights. All or nothing.
- A host-accepted request-to-book stay is payable. This was broken in a way that
  mattered enormously: every payment path guarded on `PENDING`, so once a host
  accepted, the stay could never be paid on the platform, and checkout told the
  guest "This stay is paid for" while the host had received nothing.
- Agent verification documents upload to a private bucket; the admin reviewer
  opens them through short-lived signed URLs.
- The agent bookings and earnings consoles are real, not stubs.
- Auth, RLS on every table, durable rate limiting, idempotency records,
  notifications with database triggers, five branded auth emails.

### 3.2 Not started

- **The social layer.** `docs/SOCIAL_TODO.md` has 45 unchecked boxes and zero
  ticked. No `compounds`, `gists`, `talks`, `social_reactions` or `echoes`
  tables. No `/compound` or `/u/[handle]` routes. It is a document, not a
  feature. **This is your main job.**
- **The recommendations queue.** 52 formal entries plus a 250-item inbox,
  essentially untouched. **This is agent 1's job.**

### 3.3 Blockers and hazards

- **`pg_cron` is NOT enabled.** It blocks the stale-hold sweep, badge awarding,
  and the social layer's gist expiry. Enabling it is a Supabase toggle, not
  code. Attempts have been blocked; raise it with the owner rather than
  engineering around it.
- **The sandbox cannot reach the Supabase host.** The agent proxy blocks it by
  organisation policy, so pages render signed-out or fallback states locally.
  Verify the data layer through the Supabase MCP tools instead. Never disable
  TLS verification and never unset `HTTPS_PROXY` to get around it.
- Listing images may render as broken placeholders locally for the same reason.
  That is environment, not product. Do not "fix" it.

---

## 4. Your two jobs, and the order

### Job 1: the social layer. You lead it.

**Do not start building the moment you finish reading.**

The owner's instruction, in their words: the existing plan "is not that good but
it's a foundation for him to think how we build it all clean next gen". So:

1. Read `docs/SOCIAL_TODO.md` and `docs/SOCIAL_LAYER.md` properly.
2. **Think harder than those documents did.** Argue with them. Section 7 lists
   where they are genuinely weak.
3. Produce **your own recommendations**: architecture, data model, the visual
   system, the mechanics, what to cut, what is missing. Go much deeper on the
   design than the current plan does. Next generation, clean, Nigerian, unlike
   any social product that exists.
4. Build a **TODO list** covering everything end to end, backend and frontend.
5. **Present all of it to the owner and WAIT.** The owner says go, then you
   build. Do not build before that word.

### Job 2: the recommendations. Agent 1 owns it.

Runs in parallel from the start. It does not wait for the social layer's go.

---

## 5. The agent protocol: exactly two

Two subagents. Not three, not four. The owner has been explicit and repeated.

### Agent 1: Platform Upgrades

- **Source pool:** the FULL body. `RECOMMENDATIONS.md` (R-01 to R-52) plus
  `docs/recommendations-inbox.md` (250 numbered items). **Not a pre-filtered
  shortlist.** A previous session picked 50; ignore that selection entirely and
  let this agent make its own.
- **First task:** read the whole pool and pick **the best 50 that genuinely
  upgrade the platform**, ranked, one line of reasoning each. Report that list
  before starting any of them.
- **Then work them ONE BY ONE.** One item, closed completely, verified, handed
  over. Then the next. Never a batch of half-finished items.
- **Per item it re-audits its own work** against the ONE LAW: typecheck and
  build to zero, run the relevant specs, look at a 390px screenshot in both
  themes, and only then hand it to the lead.
- **The lead re-audits before committing.** Two independent passes on every
  item. If the lead's audit finds a problem, it goes back.
- Never runs git. Never commits. Never pushes.

### Agent 2: Social Layer Build

- Starts only once the owner has said go on the social layer.
- Takes the half of each vertical slice the lead is not holding, with **strict
  non-overlapping file scopes agreed in writing before it starts.**
- Same contract: closes its own loop, re-audits itself, hands to the lead, lead
  re-audits, lead commits.
- Backend AND frontend both finished. Neither agent hands over a schema with no
  screen, or a screen with no write path.

### Both agents

- Get the house rules in their prompt, every time: zero em dashes, integer
  kobo, the `ActionResult` envelope, `BrandIcon`/`UiIcon` only, 390px first,
  dark default, no fees, no orange.
- Are told to report honestly what they did NOT do. A quiet skip is worse than
  a stated one.
- Do not trust an agent's success report at face value. Verify it yourself.
  That has caught real problems more than once.

---

## 6. Hard-won gotchas. Do not relearn these.

Every one of these cost real time. Several were caught only by looking at a
screenshot or probing the live database, never by reading code.

### Database

- **A migration succeeding does not mean the function works.** A rate limiter
  once had parameters named after the columns they conflicted with: the DDL
  applied cleanly and every call raised 42702. Run a functional probe after
  applying, never just a success check.
- **`create or replace function` cannot rename parameters.** You must DROP.
- **NULL is not false.** A pass over RLS policies used `qual not like '...'`
  and silently skipped 12 INSERT-only policies, because `qual` was NULL for
  them. Wrap in `coalesce`, then re-count rather than trusting the success.
- **`anon` needs EXECUTE on RLS helper functions.** Without it, one non-public
  row breaks the entire anonymous catalogue read with 42501. It would have
  worked right up until the first agent saved a draft. Grant deliberately, and
  deliberately NOT on anything that could expose a wallet.
- **All subqueries in one SELECT share a snapshot.** A statement that calls a
  function and then reads the rows it changed will not see them. Verify in a
  separate statement.
- Wrap `auth.uid()` in a scalar subquery inside every policy, for the planner.
- Every foreign key gets a covering index.
- Mirror every applied migration into `supabase/migrations/` with a timestamp
  prefix, so the repo never lies about the database.

### Money

- Integer kobo everywhere. The ledger must balance exactly:
  `gross = platform + agent + processor`, and platform is always 0.
- Idempotency is a unique reference enforced by the database, never a check in
  application code.
- Lock the payer's wallet row and price the spendable balance INSIDE that lock,
  or two taps can both pass the last naira.

### Frontend

- **A passing typecheck does not mean a passing build.** A client component
  importing a value from a server-only module typechecks fine and fails the
  build. Put shared constants in a client-safe `*-schema.ts`.
- **Percentage padding resolves against the containing block, not the element.**
  A 22px icon tile inside a 330px button got about 30px of padding per side and
  rendered a 0x0 image. Every non-fill `BrandIcon` was an empty white chip and
  nothing caught it but a screenshot.
- **Elements inside `display: none` report zero-size rects.** A probe that
  measures everything will report the hidden desktop rail as broken. Filter to
  genuinely visible nodes or you will chase ghosts.
- **An animation outranks a normal declaration in the cascade.** A scroll-driven
  reveal held the first search result at 56% opacity behind a blur until the
  visitor scrolled, because the observer's revealed state could not win.
  Anything already on screen at first paint must be shown outright.
- **Decorative art that bleeds off the edge still counts toward scroll width.**
  That was 29px of phantom horizontal scroll on five surfaces. `overflow-x-clip`
  clips one axis without creating a scroll container; `overflow: hidden` would
  have sliced the art vertically too.
- **Never truncate a label.** The label is the meaning of the number beside it.
  Stack the layout instead.
- Do not reuse a state token to get a colour you like. Stars once borrowed the
  warning token to obtain a gold, which meant every warning change silently
  restyled every rating on the platform.

### Process

- **Look at the screenshot.** Do not just confirm the file was written. An
  entire workspace once rendered orange and only a screenshot caught it.
- **Read a file before overwriting it**, especially one you did not write.
- If a spec fails, decide honestly whether the product or the spec is wrong.
  Two specs once asserted on hidden desktop links; the product was right. Two
  others asserted a light theme by emulating a light phone; the product had
  changed and the specs were wrong.
- Report failures with their output. Never claim green when it is not.

---

## 7. Deep advice on the social layer

`docs/SOCIAL_TODO.md` is a foundation, and the owner is right that it is not
good enough yet. Here is an honest read of where it is strong and where you
should push much harder.

### Keep

- **The place-rooted inversion.** You do not follow strangers, you enter a
  place. RentMe owns place with verified homes inside it, and no global network
  can copy that without our inventory. This is the one genuinely defensible idea
  in the document, and everything else should serve it.
- **The utility wedge.** Is there light, is there water, is the road passable,
  is it safe. Those four questions govern a Nigerian day and nobody has built
  the structural answer. It gives someone a reason to open the app on a day they
  are not booking anything, and the aggregate becomes the most valuable
  unpurchasable fact in Nigerian property.
- **The bot-reply-is-just-a-reply decision.** A bot reply is a row in `talks`
  with `author_kind = 'BOT'`. That is what makes the owner's requirement work,
  users commenting on, liking and reposting the AI's replies, with no special
  casing anywhere. Getting it wrong means a rewrite. Keep it.
- **The three refusals**: no infinite scroll, no public follower counts, no
  stranger DMs by default.

### Push much harder

1. **The Pulse Line is one idea carrying the whole visual identity.** It is a
   good idea, but a single motif is not a design system. What does a profile
   feel like? A thread? A compose sheet? An empty compound at 6am? Design the
   whole world, not one hero component.
2. **The lexicon may be trying too hard.** Gist, Talk, Echo, Correct, I dey,
   Wahala, Owambe. Some are genuinely warm and native. Others risk reading as a
   platform performing Nigerianness at people rather than speaking like them.
   Test each word honestly: would someone in Yaba actually say it, or does it
   feel like a brand pretending? Cut the ones that fail.
3. **There is no answer for the cold start.** A compound with four members and
   no gists is a dead room, and a dead room is the fastest way to kill a social
   product. How does a place feel alive on day one? Seeded utility data?
   Existing listings surfacing as content? Booking history? This is unsolved and
   it is the single most likely cause of failure.
4. **Moderation is hand-waved as "a staffing question".** True but insufficient.
   What happens at 2am when nobody is watching? Rate limits and a scanner are
   not a moderation strategy. Decide what is auto-hidden pending review, what
   goes live immediately, and who can act.
5. **The utility record is the whole wedge and it is gameable.** An agent with
   ten accounts reporting "light is on" in an estate they are selling in is the
   obvious attack, and it corrupts the exact asset that makes this valuable.
   Resident weighting, an hourly unique constraint and a private dispute signal
   are a start, not a defence. Over-engineer this part specifically.
6. **Nothing connects the social layer back to booking.** The plan says
   "conversation to booking" and then does not design it. Where does a compound
   surface a listing? What happens after someone stays? How does a Moment become
   the next person's search? This is where the money is and it is thin.
7. **Nsibidi-derived marks need care, not appropriation.** Nsibidi is a real
   script with real cultural weight, and "drawn in the spirit of" is doing a lot
   of work in that sentence. Either engage with it seriously and respectfully,
   or design an original geometric mark set that owes it nothing. Do not ship a
   shallow version.
8. **Accessibility is barely present.** A live animated line carrying meaning,
   ideographic marks with no text, a feed that ends. Each needs a screen reader
   answer and a reduced-motion answer.

### The standard

The owner's brief for the visual work: next generation, appealing to Nigerians,
something that redefines the landscape, and **not a clone of any existing social
platform**. The reference screenshots shared during the last session convey
ambition, not a look to copy; those are gold and fantasy serif, which is exactly
what ours is not.

Take the images as evidence of the ENERGY wanted, then build something that
could not be mistaken for anything else.

---

## 8. Repository layout

npm workspaces monorepo.

- `apps/web`: Next.js 16 App Router (Turbopack), React 19, TypeScript strict
  with `noUncheckedIndexedAccess`, Tailwind v4 (`@theme inline`).
- `packages/design-tokens/src/tokens.css`: two-layer token system, raw palette
  then semantic. **THE control surface: restyle the platform from here.**
  `src/index.ts` mirrors the literal hex values for SVG use, and it must be
  kept in step with layer 1. It had drifted badly once and was still serving
  pre-rebrand purple-tinted inks.
- `packages/i18n/src/locales/{en,yo,ha,ig}.ts`: `en` is the typed source of
  truth; the other three are full translations awaiting native review.
- `apps/web/src/lib/actions/envelope.ts`: the `ActionResult` contract every
  mutation speaks.
- `apps/web/src/lib/actions/session.ts`: `resolveSession()` returning
  `unconfigured | signed-out | signed-in`.
- `supabase/migrations/`: every applied migration, mirrored as a file.
- `supabase/templates/` and `scripts/build-auth-emails.mjs`: five branded auth
  emails.
- `scripts/verify-shots.mjs`: the screenshot harness.
- `apps/web/tests/*.spec.mjs`: 18 standalone node specs (NOT vitest suites).

---

## 9. Verification ritual, before every commit

Run all of it. Every time.

```bash
npm run typecheck          # must be 0 errors, all workspaces
npm run build              # must be clean; typecheck passing is NOT enough
```

Then, with the app served on port 3210 (`npx next start -p 3210` from
`apps/web`), run the specs. They are standalone node scripts, so `npm test`
will NOT run them correctly:

```bash
cd apps/web
for s in filters checkout bookings listing-detail admin agent-listings wallet \
         saved support i18n pwa profile messages assistant map hybrid \
         rate-limit email-render; do node tests/$s.spec.mjs; done
```

Then screenshots, and **look at them**:

```bash
node ../../scripts/verify-shots.mjs /route           # 390x844 dark
node ../../scripts/verify-shots.mjs --light /route   # the paper twin
```

Then scan your own diff:

```bash
# Em dash scan. Written as an escape so this document stays clean itself.
git diff --name-only HEAD | xargs grep -n "$(printf '\xe2\x80\x94')"   # must be empty
git diff --name-only HEAD | xargs grep -n 'Icon3D'                     # retired, must be empty
```

Playwright uses `playwright-core` with
`executablePath: "/opt/pw-browsers/chromium"`. Do not run `playwright install`.

---

## 10. The environment

- Supabase Postgres 17, project ref `uccixoonmbhrnyczyigt`, eu-west-1. RLS on
  every table, helpers in a private schema, a GiST exclusion constraint
  preventing double-booking, an append-only kobo ledger with derived balances.
- Apply migrations through the Supabase MCP tools, then mirror the exact SQL
  into `supabase/migrations/` with a timestamp prefix.
- Reference contract: `rm-fund-<uuid>`, `rm-wd-<uuid>`, `rm-p2p-<uuid>-out/-in`,
  `rm-book-<uuid>`.
- Durable Postgres rate limiting (`private.consume_rate_limit`) plus idempotency
  records, both fail-open.

---

## 11. How to be useful here

The owner does not want a status report. They want the platform finished to a
standard they can be proud of.

- **Close loops.** Half a feature is worse than none, because it looks done.
- **Verify against reality**, not against your own expectations. Probe the
  database. Look at the screenshot. Re-count after a bulk change.
- **Say what you did not do.** Every time. The owner would far rather hear
  "I left X because Y" than find it themselves later.
- **Push back once, with a reason, then commit to the decision.** If the owner
  reaffirms, it is settled and you build it their way, fully.
- **Do not narrate.** Do the work, then report what changed and what it cost.
