# HANDOFF 02: the platform, and what it takes to get it to 100

**This is the second of two handoffs. It governs the codebase and the full
product transformation. The first, `docs/HANDOFF_01_COMPANY.md`, governs the
company, the money, the law and the standards.**

Read HANDOFF 01 before this one. It is shorter, and it contains the rules that
decide whether a technical choice is allowed at all. Everything in it is the
baseline this document inherits: the brand rules, the privacy specification, the
honesty standard, the way the founder works. None of it is dropped here.

Where the two disagree, HANDOFF 01 wins on anything legal, financial or
reputational. This one wins on anything technical.

---

## 0. The mission, in one line

**DIGEST, SURVEY, AUDIT, RATE, RESEARCH, RECOMMEND, PRIORITISE, BUILD, TEST,
SWEEP AGAIN.**

In that order, and the last step is not optional, because the second sweep finds
what the first one did not know to look for.

**Do not start by changing screens.** The platform looks finished and large parts
of it genuinely are. A session that opens a file and starts improving it will
improve the wrong file. Understand the whole thing first.

### What the objective actually is

Not "finish the features". The objective is that Vallo feels like a serious,
premium, next-generation platform: fast, seamless, beautiful, trustworthy,
useful, differentiated, secure and scalable. The standard is that someone using
it would be surprised it was built by a small team.

### What you are

Co-founder engineer. Also, where the work needs it: product strategist, CTO,
designer, security lead, researcher, compliance-minded partner, growth
strategist, quality control.

**Do not do only what was explicitly asked.** If something is missing, weak,
outdated, unsafe, unfinished, ugly, inefficient, legally risky, fragile or
strategically important, bring it forward and recommend the better answer. Then,
per section 27, either make the call or surface it, depending on which kind of
decision it is.

---

## 1. The reading list, and what not to trust

Read these before writing anything. Several of the most expensive mistakes in
this project's history were already written down in one of them.

| File | What it is |
| --- | --- |
| `docs/HANDOFF_01_COMPANY.md` | The company, the law, the standards. **First** |
| `docs/PRODUCT.md` | What the product is, in under 200 lines. Roles, taxonomy, terminology |
| `docs/HANDOFF.md` | The working contract: the ONE LAW, the owner rules, the gotchas |
| `RECOMMENDATIONS.md` | 177 open entries with evidence and priority. **The existing work queue** |
| `KNOWN_GAPS.md` | What is honestly missing and why. Do not rediscover these |
| `ARCHITECTURE_DECISIONS.md` | Why things are as they are. Read before proposing a rewrite |
| `ROADMAP.md` | What has landed. Context, not a plan |
| `docs/ICON_SYSTEM.md` | Two icon tiers. You WILL get this wrong without it |
| `docs/SOCIAL_DESIGN.md` | The social layer is BUILT. This is why it is shaped as it is |
| `docs/BADGES.md` | Earned standing. Shipped |
| `docs/ENVIRONMENT.md` | Every credential the code reads, and what breaks without it |
| `docs/DEPLOY.md` | The deploy runbook |
| `docs/DATABASE_AUDIT.md` | Live advisor findings, and the do-not-fix list |
| `docs/MOBILE.md` | Build, sign and ship the native applications |
| `docs/MOBILE_READINESS.md` | Store readiness, permissions, privacy inventory |

**`docs/archive/` governs nothing.** It is history. If it disagrees with the
code, the database or the list above, it is wrong. Two specific traps in there:

- `docs/archive/ui-audit/00-reference-brief.md` asked for tinted icon tiles,
  symbol effects everywhere, an island tab bar and photo chips. It is the direct
  cause of visual clutter that is still being removed. It is stamped superseded.
  **Do not read it as a brief**
- `docs/archive/SOCIAL_BUILD.md` and `docs/archive/SOCIAL_TODO.md` carry 157 unticked checkboxes against
  work that shipped in August. **An empty box in the archive is not a gap**

### The rule that outranks the documents

**Read the code and the live database, not the document about them.** Every file
above has been wrong at some point, and each time the cost was a session spent
building something that already existed or fixing something that was not broken.
When a document and the database disagree, the database is right and the document
gets corrected in the same session.

---

## 2. Where the platform actually is

Counted on 14 September 2026. These are the survey's starting numbers, not its
conclusions.

| | |
| --- | --- |
| TypeScript and TSX | 153,466 lines across `apps/` and `packages/` |
| Pages | 97 `page.tsx` under the App Router |
| API routes | 9 `route.ts` |
| Components | 183 `.tsx` under `src/components` |
| Database migrations | 167 |
| Playwright specs | 82 |
| Unit test files | 44 |
| Open recommendations | 177, being 34 P0, 90 P1, 53 P2 |
| Design tokens | 1,192 lines in `packages/design-tokens/src/tokens.css` |
| Brand objects | 87 3D renders in `apps/web/public/brand/icons/` |
| UI glyphs | 40 SVGs in `assets/icons/ui/` |
| Files naming a dead brand | roughly 190 for `rentme`, roughly 190 for `naijafinds` |

### The stack

Next.js 16 App Router with Turbopack, React 19, TypeScript strict with
`noUncheckedIndexedAccess`, Tailwind v4 using `@theme inline`. npm workspaces:
`apps/web`, `packages/design-tokens`, `packages/i18n`. Supabase on Postgres 17,
`eu-west-1`, with RLS on every table, SECURITY DEFINER functions in a `private`
schema, `pg_cron` running six jobs, `pg_net`, and Supabase Vault for secrets.
Capacitor native shells in `apps/web/android` and `apps/web/ios`.

### What is genuinely done, and must not be rebuilt

Each of these was proven end to end against live Postgres with real rows that
were then removed. Rebuilding any of them is the most expensive mistake available
in this codebase.

- Booking, wallet, payment, messaging, listing, admin and agent loops close
- Reserve holds the calendar, and an abandoned hold auto-releases only the nights
  it took
- Card checkout and wallet payment settle through one shared implementation, so
  the webhook and the return path cannot disagree
- `private.pay_booking_from_wallet` writes six things in one transaction: wallet
  debit, payment attempt, balanced zero-fee ledger row, booking transition, state
  event, calendar nights. All or nothing
- Agent verification documents upload to a private bucket and the admin reviewer
  opens them through short-lived signed URLs
- **The social layer is BUILT.** 20-plus tables, the `/around`, `/u`, `/post`,
  `/stories` and `/admin/social` route families. `docs/SOCIAL_DESIGN.md` explains
  the five ways the shape moved from the original plan
- Auth, RLS on every table, durable rate limiting, idempotency records,
  notification triggers, five branded auth emails

### What is not started, and is the largest hole

- **Buying and selling.** The product is meant to sell and `public.listings`
  cannot express a sale at all: no sale price, no intent, no tenure.
  `RECOMMENDATIONS.md` P-1. Free to fix today with zero listings, expensive
  later
- **Escrow.** Zero implementation. `RECOMMENDATIONS.md` E-1. It is correctly
  promised nowhere and **must stay promised nowhere until it exists**

---

## 3. Autonomous operating mode

**This session runs autonomously.** Do not stop after each step to report and
wait. Do not ask permission for work that is already described in this document.
The founder has said plainly that constantly stopping to check wastes more of his
time than a wrong reversible decision does.

Autonomous does not mean unaccountable. It means: decide, do, verify, record,
keep going, and tell the truth about what happened.

### 3.1 The two tracks run at the same time

The lead session and the agents work in parallel from the first hour. The lead
does not sit idle synthesising while three agents work.

**The lead session owns Track A**, the identity and legal work. It is bounded, it
is mostly mechanical, and it is the thing the founder can see immediately:

1. Repository and branch hygiene (3.3)
2. The full old-name sweep: RentMe and NaijaFinds out of everything (section 15)
3. The new Vallo logo in every place a logo appears (15.2)
4. The sample property imagery (15.4)
5. Terms, disclaimers and the privacy notice (HANDOFF 01 section 4)

**The three agents own Track B**, the 400-plus recommendation mission across the
whole platform (sections 5 through 9, and 25).

**The tracks must not collide.** Track A rewrites strings, assets and legal copy
across roughly 190 files. Track B reads the whole platform and writes findings.
So the rule is: **agents in Track B produce recommendations, they do not edit
files in Track A's path set** until Track A has landed and pushed. If an agent
finds a branding or legal defect, it files it as a recommendation addressed to
Track A rather than fixing it. Two writers in one file is how a session loses
work.

### 3.2 When to stop, and it is a short list

Keep going through everything else. Stop only for:

- A change to the agreements, the budget or anything the solicitor has seen
- Native app identifiers in `apps/web/android` and `apps/web/ios`, because an
  application ID cannot be changed after a store listing exists
- Deleting a remote branch that carries unmerged work (3.3)
- A destructive database change: a drop, a data-losing migration, a revoke
- Spending money, or adding a paid vendor
- A Supabase dashboard setting, which only the founder can reach
- Anything where the honest answer is "I do not have the information and cannot
  get it"

Everything else: decide it, do it, write down why.

### 3.3 Repository and branch hygiene

**Counted on 14 September 2026.** Fifteen remote branches. Verify before acting,
because this moves.

`main` is the deploy branch and Vercel builds from it. It is currently one commit
ahead of the working branch: `a41b9c1`, the founder's upload of the new Vallo
logo.

**Fully merged into `main`, so deleting them loses nothing.** Delete these
without asking:

- `origin/claude/greeting-4np7sj`
- `origin/claude/rentme-data-sourcing-arch-birz8q`
- `origin/claude/rentme-polish-pass-p4808t`

**Not merged, and this is where care is required.** Ten branches carry between 30
and 474 commits that are not in `main`, and all but the working branch are from
late July and early August:

| Branch | Commits ahead | Last commit |
| --- | ---: | --- |
| `claude/master-autonomous-engineering-os-c4guqi` | 474 | 2026-08-07 |
| `claude/platform-premium-ui-audit-vtpvtc` | 405 | 2026-08-06 |
| `claude/rentme-social-and-polish` | 402 | 2026-08-06 |
| `fix/main-social-regressions` | 219 | 2026-08-05 |
| `claude/rentme-social-design-je796y` | 214 | 2026-08-04 |
| `primitives-wip` | 197 | 2026-08-05 |
| `integration/rentme-next` | 153 | 2026-08-01 |
| `claude/rentme-loop-closure-pb0ird` | 116 | 2026-07-30 |
| `claude/repo-cleanup-1spitz` | 83 | 2026-07-30 |
| `feat/naijafinds-brand-system` | 30 | 2026-07-28 |

**Do not merge these into `main` wholesale.** A branch that is 474 commits ahead
and six weeks old diverged before the social layer shipped. Merging it would not
add work to `main`, it would fight `main` in hundreds of files and could
resurrect deleted subsystems, the orange palette and the `Icon3D` component that
is supposed to be gone. That is not hypothetical: `feat/naijafinds-brand-system`
is a brand system for a name the company no longer uses.

**The method, which is autonomous and does not lose work:**

1. For each unmerged branch, run `git log --oneline origin/main..<branch>` and
   `git diff --stat origin/main...<branch>`. Read what is actually in it
2. Classify it in writing, one of three ways:
   - **Superseded.** Everything in it reached `main` by another route, or it
     describes a system that has since been rebuilt. Most will be this
   - **Carries something real.** Name the specific commits or files worth having
   - **Unclear.** Cannot be determined from the log
3. **Anything real is cherry-picked onto the working branch**, verified against
   the ONE LAW, and pushed. Not merged wholesale
4. Write the verdict for all ten into `docs/BRANCH_AUDIT.md`: branch name, head
   SHA, commit count, verdict, reason. **The SHA is what makes a delete
   recoverable**, because a deleted branch can be restored from its SHA for as
   long as the reflog holds it
5. **Then delete**: the three merged branches immediately, and the superseded
   ones once `docs/BRANCH_AUDIT.md` is committed and pushed. Leave anything
   classified unclear alive and say so in the report
6. Finally bring the working branch up to date with `main` so the logo commit is
   present, and push to `main` once Track A is green

The founder asked for the branch list cleaned and the work on `main`. This is how
that happens without throwing away six weeks of history on a guess.

### 3.4 Never claim what did not happen

Four words that must be true when used: **committed**, **pushed**, **tested**,
**compliant**. A quiet skip is worse than a stated one. If a step was skipped,
say which and why in the final report, without being asked.

---

## 4. Phase 1: digest

Before any major change, understand the whole system. Not page by page as you
happen to open them. Deliberately, in this order.

1. The architecture: how a request becomes a row, and how a row becomes a screen
2. Frontend, backend, database, APIs, authentication, storage, integrations
3. Admin systems, settings, user flows, messaging, wallets, listings, property
   systems, receipts, sharing, bots, notifications
4. Security and the legal and compliance surfaces
5. Every major page, at 390px, in the dark theme, which is the default

Then classify every part of it into one of these, and write the classification
down rather than holding it:

what exists, what works, what partially works, what is mocked, what is
incomplete, what is broken, what is missing, what needs redesign, what needs
security hardening, what needs backend or database work, what needs compliance
attention, what needs better UX, what should be removed, what should be upgraded,
what should be added.

**A page existing does not mean the feature is done.** The ONE LAW in
`docs/HANDOFF.md` is the test: a UI action, a validated server action, a database
write that survives RLS, the UI showing the new reality after a reload, the
notification the event deserves, and a Playwright test proving all of it. Fewer
than six is not done.

**And do not delete something because it looks unused.** Confirm it is genuinely
dead first. A component imported once by a page that is itself rarely visited is
not dead code.

---

## 5. Phase 2: the wide survey

Sweep the whole platform, not the obvious pages. The obvious pages are the ones
already polished; the damage is in the surfaces nobody demos.

**Entry and identity.** Landing, onboarding, sign up, login, logout, password
reset, resend flows, email verification, two-step authentication, session
management, account recovery, account deletion.

**The person.** Profiles, account settings, privacy settings, security settings,
notification settings and the notifications themselves.

**Finding things.** Search, discovery, filters, the map, saved items, saved
searches, sharing, share cards.

**Property.** Listing cards, previews, detail pages, containers, images,
galleries, pricing, amenities, location presentation, availability, contact
actions, listing creation, editing, management, verification, reporting.

**Talking.** Conversations, threads, send and receive, read and delivery states,
attachments, media, message search, blocking, reporting, retention.

**Money.** Wallet, balances, transactions, receipts, savings, transfers, payment
flows, history, limits, confirmations, and every crypto surface that exists.

**Doing.** Inspections and the inspection workflow, rent flows, bots, assistants.

**Operating.** The admin panel, moderation, reports, user management, data
management, analytics, system controls, feature flags.

**Underneath.** Integrations, APIs, database, storage, background jobs, caching,
logging, monitoring, backups and recovery, deployment, repository hygiene,
environment and configuration safety.

**Everywhere.** Error states, empty states, loading states, mobile responsiveness
at 390px, accessibility, performance, security, privacy.

**Legal surfaces.** Terms, privacy policy, disclaimers, consent, data collection,
retention, deletion, account deletion, auditability. HANDOFF 01 section 4 is the
specification for these; this phase only inventories what exists.

And whatever else the sweep turns up, which is the point of doing it wide.

---

## 6. Phase 3: the rating

Rate the platform honestly on all twenty-five dimensions. **Realistic ratings,
not flattering ones.** A dishonest score wastes the session it was supposed to
direct, and the founder has asked for this explicitly.

Overall product readiness, Frontend, UX, UI, Visual design, Branding, Backend,
Database, Security, Privacy, Authentication, Performance, Accessibility,
Reliability, Scalability, Admin panel, Messaging, Wallet and financial
architecture, Property and listing experience, Integrations, Legal and compliance
readiness, Production readiness, Differentiation, User retention potential,
Overall Vallo standard.

### How to score so the number means something

- Score out of 100, and **state the evidence** for each. A score with no evidence
  is a feeling
- Score against a shipped competitor a Nigerian user could open today, not
  against the last version of this platform. Improvement is not the scale
- **A dimension is capped by its worst user-visible failure.** Authentication
  cannot score 85 if password reset dead-ends. One broken flow is the score
- Anything that only works when signed in with a seeded account scores as
  broken, because that is not how a visitor arrives
- Where a previous session's score exists, say whether it moved and why. A
  previous audit ran in conversation and was never written to a file, so there is
  no prior baseline in the repository. **This rating becomes the baseline**

### Then answer five questions, in plain language

1. Where are we now
2. What is holding us back
3. What are the biggest risks
4. What are the biggest opportunities
5. What would move Vallo from its current state to 100 out of 100

Write the rating to a file so the next session can measure against it. That is
the gap that made this rating necessary.

---

## 7. Phase 4: the research standard

Think like the best people in each discipline: product and UX researchers,
frontend, backend and database engineers, security engineers, product and brand
designers, growth and retention teams, startup strategists.

**Do not copy competitors.** Study what makes excellent products excellent, then
decide what actually makes sense for a Nigeria-first property platform with a
social layer and a wallet. Most of what a Western rental app does assumes
infrastructure that is not there.

Look for industry standards, modern UX patterns, modern security practice, modern
architecture, modern design systems, emerging platform patterns, better
onboarding, better retention, better trust, better performance, better mobile,
better property experiences, better communication, better financial UX, better
admin tooling, better privacy controls.

The question is not "what does the competition do". It is:

**"What would make Vallo feel like the product people wish already existed?"**

### Two constraints on research that are specific to this platform

- **All inventory is first party.** Everything on Vallo was listed on Vallo. No
  Google Places, no LiteAPI, no external feed. The verified badge, the
  verification ladder and escrow only mean anything because there is a real
  person behind every listing. ADR-013. A research finding that proposes an
  external inventory feed is out of scope by decision, not by oversight
- **The platform charges no fees anywhere.** Any monetisation research has to
  work around that, and copy must never mention a fee. If a processor takes
  something, it is labelled as the processor's

---

## 8. Phase 5: the 400 recommendation mission

Target **at least 400** meaningful recommendations, and do not stop there
artificially. If the sweep genuinely produces 500 or 600, keep them. If it
produces 380 real ones and 20 invented ones to reach the number, it has failed.

**400 does not mean 400 features.** Most of them should be small. The mix that
makes a platform feel premium is overwhelmingly small things.

Draw from: tiny UX improvements, micro-interactions, copy, spacing, visual
hierarchy, loading states, empty states, error states, accessibility,
performance, security, database hardening, backend, APIs, architecture, the
design system, navigation, settings, new features, missing tools, missing
integrations, missing workflows, admin tooling, retention mechanisms, growth
mechanisms, trust mechanisms, compliance, data protection, operations, developer
experience, testing, monitoring, deployment, documentation, automation, AI and
bot opportunities, messaging, wallet and savings, property experience, sharing,
receipts, inspection workflows, notifications, personalisation, search and
discovery, onboarding, monetisation where appropriate, scalability, reliability,
brand consistency.

### The format, and it is not negotiable

`RECOMMENDATIONS.md` already holds 177 entries in a working format: what is wrong
today with evidence, what to do, why it matters, and a priority. **New entries
match it. Existing entries are not discarded and not renumbered.** They were
written against real evidence and several are P0.

Every recommendation carries:

| Field | Meaning |
| --- | --- |
| Evidence | The file, the line, the query, the screenshot. Not "it feels slow" |
| Action | What to do, specifically enough that someone else could do it |
| Reason | Why it matters, in user or risk terms |
| Impact | What improves, and for whom |
| Effort | Rough, honestly |
| Risk | What could break |
| Priority | Critical, High, Medium, Nice-to-have, Future |

**Every recommendation has a reason.** An entry that cannot say why it matters is
a preference, and preferences are how a codebase accumulates churn.

### Five buckets

Critical, High priority, Medium, Nice-to-have, Future and experimental. Critical
means a user loses money, loses data, is exposed, or is blocked from the core
loop. Nothing else is critical, however annoying.

---

## 9. Phase 6: prioritise

Sort by what actually gets the platform to launch, not by what is interesting.

The four largest open P0s, and they sit in different domains so they can be
worked in parallel:

1. **P-1.** The data model cannot express a sale, on a platform meant to sell
2. **N-1.** Signed-out visitors are locked out of the whole product, which is the
   opposite of the stated rule and defeats every discovery item behind it
3. **W-1.** A missing service role key silently kills both money settlement paths
   and answers HTTP 200, so a paid funding is lost with no retry and no log
4. **E-1.** Escrow is zero percent built. Do not let a marketing pass promise it
   first

Plus, from HANDOFF 01 section 4, two that are legal rather than technical and are
small enough to do immediately: the controller identity in the privacy notice and
terms, and the retention purge for rejected verification documents.

### How the last large piece was approached, and it worked

**Do not start building the moment you finish reading.** Argue with the plan
first, produce your own recommendation, present it, and wait for the word. That
is how the social layer went from a weak document to a shipped subsystem, and it
is how the sale market and escrow should go too.

---

## 10. Phase 7: build

### The ONE LAW

A feature is DONE only when the full loop closes: a UI action a real person can
take, a validated server action, a database write that survives RLS, the UI
showing the new reality after a reload, the notification or email the event
deserves, and a Playwright test proving all of it.

**A screen with no write path is a half. A table with no screen is a half. Never
build two halves when you can finish one whole.**

Work in vertical slices: schema, action, UI wiring, test, screenshot, push. Not
horizontal layers, and never "the backend for six features".

### Non-negotiables while building

- **Integer kobo** everywhere, as bigint. `Math.round(naira * 100)` only at the
  input boundary. Display only through `formatMoney` from `@naijafinds/i18n`.
  Never float money, never divide by 100 by hand
- The `ActionResult` envelope for every server action. `resolveSession()` for
  session resolution
- `BrandIcon` and `UiIcon` only. `Icon` and `Icon3D` are deleted, not retired
- 390px first, dark theme default, then up and then light
- **Zero em dashes** in code, copy, docs and commit messages. British spelling in
  docs and product copy
- No raw colours and no raw spacing. The custom ESLint rules `nf/no-raw-colour`
  and `nf/no-raw-spacing` enforce it; do not disable a rule to land a change
- Never commit broken work, never dump a huge unfinished change, never hide a
  failure

---

## 11. Phase 8: test, and Phase 9: sweep again

### Test

Run them. `npm run typecheck`, `npm run lint`, `npm run test`, `npm run build`,
and the relevant Playwright specs from the 82 that exist. Read the output rather
than checking it exited zero.

- **A passing typecheck does not mean a passing build.** A client component
  importing a value from a server-only module typechecks fine and fails the
  build
- **Look at the screenshot.** An entire workspace once rendered orange and only a
  screenshot caught it. A 22px icon tile once rendered 0x0 across the whole
  product and nothing but a screenshot caught that either
- If a spec fails, decide honestly whether the product or the spec is wrong.
  **Never skip, disable or quarantine a test to get to green**

### Sweep again

After the first pass closes, sweep the platform again. The expectation is that
the second sweep finds things the first one did not know to look for, because by
then you understand the system. That is not a failure of the first sweep. It is
the reason there is a second one.

---

## 12. Frontend and design: make it next-gen

The direction: **classy, premium, clean, modern, fast, seamless, elegant.
2030-level. Apple-level polish.**

Not cluttered, not childish, not over-designed, not generic SaaS, not a template,
not visually noisy.

What that means concretely: excellent spacing, strong hierarchy, beautiful
typography, clean containers, refined cards, subtle depth, elegant motion,
excellent transitions, thoughtful micro-interactions, beautiful responsive
behaviour, strong information architecture, clear affordances, and premium empty,
loading and error states.

**Glass and translucency are allowed where they earn it.** Do not turn everything
to glass because it is trendy. The interface stays fast, readable, accessible and
functional first. A surface that costs 16ms of paint for a frosted panel nobody
asked for is a regression.

### The brand rules, which survive any redesign

These come from the owner directly and they are not open.

1. **Deep navy-black, dark neon blue, electric blue glow.** Never purple, never
   violet, never magenta, never generic SaaS blue
2. **There is no orange, amber or gold in this product.** Every warm and purple
   token has been deleted from the palette. If a new accent is needed, it is a
   different depth of blue, never a new hue
3. The only two hues outside the blue family are **emerald for success** and
   **rose for error**. The attention state is **bright cyan**, inside the family
4. Anchors: base `#010118`, glow `#0C39EF`, mid `#000F98`, neon `#0010E0`,
   electric `#0010D0`, ink down to `#000010`
5. **Dark is the default and the operating system does not override it.** Only a
   stored choice moves the theme. Light is a designed paper twin: flat neutral
   canvas, white cards, neutral hairlines, brand blue only on active, focus and
   CTA. No blue-tinted greys
6. Supplied background artwork is canonical. Use `background-image`. Do not
   recreate it with CSS gradients, and never cut the background out of a supplied
   scene
7. Full-page drawers, never partial. Footer on landing and site pages only
8. Every app page has a PageHeader back button that follows real history
9. No focus rectangles on pointer clicks
10. No gibberish, no lorem, no dead ends. Every state is designed, including
    empty, error, signed-out and unconfigured

### Two hard-won frontend traps

- **Percentage padding resolves against the containing block, not the element.**
  A 22px icon tile inside a 330px button got 30px of padding per side and
  rendered 0x0
- **Decorative art that bleeds off the edge still counts toward scroll width.**
  That was 29px of phantom horizontal scroll on five surfaces. `overflow-x-clip`
  clips one axis without creating a scroll container

---

## 13. The design system

Strengthen the system rather than adding components. There are 183 components
and 1,192 lines of tokens already; the risk is not too few parts, it is parts
that disagree.

Audit and standardise: colours, typography, spacing, radius, shadows, borders,
buttons, inputs, cards, modals, sheets, navigation, tabs, menus, toasts, alerts,
badges, icons, tables, lists, empty states, loading states, skeletons, responsive
behaviour, motion.

**Do not create one-off components.** Before building a new one, find the three
places that already do something similar and decide whether the honest answer is
a variant of an existing component.

### Two rules with scar tissue behind them

- **Never reuse a state token to get a colour you like.** Stars once borrowed the
  warning token to obtain a gold, which meant every warning change silently
  restyled every rating on the platform
- **Never truncate a label.** The label is the meaning of the number beside it.
  Stack the layout instead

### The icon system, which is the easiest thing here to get wrong

Two tiers, and they do not mix. `docs/ICON_SYSTEM.md` is required reading.

- **`UiIcon`**: 40 stroked glyphs for navigation and controls. One stroke weight,
  computed from the size, and there is no `strokeWidth` prop. One size scale:
  12, 16, 20, 24, 28, 32, nothing between
- **`BrandIcon`**: 87 commissioned 3D objects for content. Props are `name`,
  `size`, `fill`, `label`, `priority`, `className`. There is no `ramp` prop
- `Icon` and `Icon3D` are **deleted**. The pre-commit grep for `Icon3D` must
  return empty
- `TrustIcon` is six marks on the landing trust strip and nowhere else

---

## 14. Motion

Motion where it improves the experience: page transitions, shared-element-like
transitions, subtle card interactions, modal and sheet behaviour, navigation
transitions, loading transitions, success feedback, micro-interactions.

It should feel **expensive, calm, intentional and elegant.** Never distracting.

Performance and accessibility outrank it. Honour `prefers-reduced-motion`
properly, meaning the interface still communicates state change without the
animation, not that the animation is simply removed and the user is left guessing.

**One trap, and it cost real time.** An animation outranks a normal declaration in
the cascade. A scroll-driven reveal held the first search result at 56% opacity
behind a blur until the visitor scrolled, because the observer's revealed state
could not win. **Anything already on screen at first paint must be shown
outright**, not revealed.

---

## 15. Removing the old identity, and standing up the new one

This is Track A and the lead session owns it. It is the most visible work in the
session and it is bounded, which is exactly why it runs in parallel with the
agents rather than after them.

The product is **Vallo**. The registered company is **VALLO SPACES LTD** and it
appears only on legal surfaces. **RentMe** and **NaijaFinds** are dead working
names. HANDOFF 01 section 5 is the authority on which name goes where.

### 15.1 The name sweep

Roughly 190 files reference `rentme` and roughly 190 reference `naijafinds`.
This is not a find and replace. Do it in this order, because the order is what
keeps the build green, and **commit after each step** so any one of them can be
reverted alone.

1. **User-visible copy first.** Strings, page titles, metadata, alt text, email
   templates, empty states, headers, footers, navigation, auth pages, error
   messages, the offline page, the PWA manifest, the service worker. Highest
   value, lowest risk
2. **Assets and their references** (15.2)
3. **Domains.** `rentme.ng` appears in the legal pages and in metadata. It must
   become the live Vallo domain, and a stale domain in a privacy notice is the
   legal defect described in HANDOFF 01 section 4.2
4. **The npm scope, last and deliberately.** `@naijafinds/web`,
   `@naijafinds/i18n`, `@naijafinds/design-tokens` and the root `package.json`
   name and description. This touches every import in the tree and is the one
   that can break the build in a hundred files at once. **Do it as its own
   commit, with nothing else in it**, so a revert is clean
5. **Native app identifiers.** `apps/web/android` and `apps/web/ios` carry bundle
   identifiers and display names. Changing an application ID after a store
   listing exists is not reversible, so **this one stops and asks**, per section
   3.2. Read `docs/MOBILE.md` first

**Do not blindly rename legal references.** Some strings must remain the
registered company name. And some are historical records rather than branding:
the comment in `apps/web/src/lib/legal/privacy.tsx` explaining that
`support@rentme.ng` never existed and that every NDPA request sent there vanished
is a record of a real bug. **Update it in substance, do not string-replace it.**

**Search for more than the two words.** Old copy hides in: `rent me`, `rent-me`,
`RentMe`, `NaijaFinds`, `naija`, `nf-` token prefixes, the `nf/` ESLint rule
namespace, alt text, `aria-label`s, JSON-LD, OpenGraph tags, email subject lines,
seed data and test fixtures. The `nf-` CSS token prefix and the `nf/` lint rules
are internal, not user-visible, so renaming them is optional churn. **Leave them
unless the sweep is otherwise complete**, and say that you left them.

### 15.2 The new logo

**The founder has already uploaded it.** It is on `main` as commit `a41b9c1`, at
the repository root, named `00C4432C-058C-4607-9273-3E23301F106B.png`. First job
is to move it somewhere sane and give it a real name.

What it is: a glass app-icon tile, rounded square, deep navy-black ground with an
electric blue rim light and outer glow. Inside it, a stylised skyline of five
glass towers with an orbital swoosh curving under them, and the **VALLO**
wordmark beneath in the same brushed chrome and blue. It is a premium 3D studio
render, and it matches the brand rules in section 12 exactly: navy-black,
electric blue, no orange, no purple.

The old logo is `/brand/rentme-logo.png` with `/brand/rentme-logo-ink.png` as the
ink recolour that CSS swaps in for the light theme. **The uploaded file is one
asset and the product needs a set.** Derive it:

| Asset | From the upload | Used by |
| --- | --- | --- |
| App icon, square with the tile | The upload as it is | PWA, native, favicon, store listings |
| Wordmark on transparent | Mark plus wordmark, tile removed | Headers, navigation, footer |
| Mark only, transparent | The skyline and swoosh alone | Compact headers, avatars, the tab bar |
| Ink variant | The same, recoloured for light | The light theme, exactly as the old ink file worked |
| Favicon set | 16, 32, 180, 192, 512 | `apps/web/public/` and the manifest |

**Rules while doing this.** Never cut the background out of the supplied render
by hand and leave halos; if a transparent version cannot be produced cleanly,
say so rather than shipping a bad cutout. The glass tile is designed to sit on
dark; on the light theme use the ink variant, not the tile on white. And every
place the old logo is referenced gets updated in the same commit as the rename,
or the product ships with broken images.

### 15.3 What else is in `/brand/`

Ten more assets carry the old name and most are in active use:
`rentme-bg.png`, `rentme-city.png`, `rentme-villa.png`, `rentme-map.png`,
`rentme-assistant.png`, `ai-banner.png`, and eight `story-*.png` files. Rename
the files and update every reference together. `grep -rn "rentme-" apps/web/src`
is the list.

### 15.4 The sample property imagery

**Read `apps/web/src/components/app/MediaFrame.tsx` before touching any of
this.** The header comment explains the current design and it was a deliberate
decision, not laziness.

What exists: two architectural images do all the work. `rentme-villa.png` covers
house, villa, terrace and shortlet; `rentme-city.png` covers flats, tower, hotel
and shop; land deliberately keeps a drawing, because a plot has nothing built on
it and putting a house on it would make the picture contradict the listing. The
same building is framed six ways by the listing's own hue so twenty cards do not
look identical, and **every one carries the example mark on the card and the full
sentence on its detail page.**

The founder wants better houses: best-of-the-best architectural photography, the
kind of thing you would find on Pinterest, used as samples on the landing page
and in the property containers. That is the right instinct and the current two
images are the weakest part of the visual product. **Three things constrain how
it gets done, and none of them is a reason not to do it.**

1. **The network blocks image hosts.** The MediaFrame comment records that this
   environment answers 403 to every image host, and that is still true. **A
   session cannot download photography.** So the deliverable is a shortlist, not
   a download: specific images, direct URLs, the licence each one carries, and
   what each is for, written to `docs/IMAGERY.md` so the founder can pull them in
   one sitting. Then wire the code to accept them by filename so dropping the
   files in is the only remaining step
2. **Pinterest is not a source.** Almost everything on it is someone else's
   copyrighted photograph reposted without licence, and this is a public
   commercial landing page for a registered company. Use sources whose licence
   actually permits commercial use: **Unsplash, Pexels and Pixabay**, all of
   which carry genuinely world-class architectural and interior photography for
   free. Pinterest is fine as a **mood reference** for deciding what good looks
   like. It is not fine as a file source. Record the licence next to every
   entry in `docs/IMAGERY.md`
3. **A real photograph on a listing is a claim about that property.** On the
   landing page, the hero, the city scenes and marketing surfaces, premium
   photography is right and should be used freely. On a **listing card or a
   listing detail page** it is a stand-in for a property it is not a picture of,
   so it stays labelled exactly as it is labelled today. Upgrade the image
   quality; **do not remove the example mark.** HANDOFF 01 section 4.7

What good looks like for this platform: Nigerian and West African architecture
where it can be found, modern and aspirational rather than generic American
suburbia, warm natural light against the dark UI, a mix of detached houses,
terraces, apartment towers and interiors, and enough variety that eight scene
types each get their own image instead of two images covering eight.

**The landing page hero is the highest-value single image in the product.** It is
the first thing a visitor sees and it currently reuses `rentme-city.png` as a CSS
background in `CityHero.tsx`. Treat it as its own decision.

### 15.5 Terms, disclaimers and privacy

These are Track A because they are text, they are quick, and one of them is a
legal defect today. **HANDOFF 01 section 4 is the full specification.** In short:

- The privacy notice names **RentMe** as the data controller. The controller is
  **VALLO SPACES LTD**. Section 4.2 has the exact table of what to change:
  controller identity, registered address, a named DPO contact, NDPC number when
  it exists, and the live domain
- Terms need the clauses in section 4.6 that match what the platform actually
  does: user-generated listings, what a verified badge means and does not mean,
  the messaging trigger, the wallet, inspections, bot output, suspension and
  appeal, IP, and Nigerian law
- Disclaimers per section 4.7, and the table there says which surface needs
  which. **Escrow is the one that matters most: it does not exist and nothing may
  imply it does**
- **Do not invent legal provisions.** Where a clause carries real legal
  consequence, write it, mark it clearly for the solicitor, and say so in the
  report

**The visual brand did not change with the name.** Section 12 still applies in
full.

---

## 16. Security sweep

The platform holds government identity documents and moves money. This section is
not a checklist to tick, it is the one where a miss is unrecoverable.

Sweep for: authentication weaknesses, authorisation weaknesses, broken access
control, data leakage, sensitive data exposure, insecure endpoints, weak session
handling, password handling, password reset vulnerabilities, email verification
weaknesses, 2FA weaknesses, rate limiting, brute force protection, enumeration
risk, injection, XSS, CSRF, SSRF, file upload risk, storage permissions, database
exposure, secrets exposure, logging of sensitive data, excessive collection,
excessive privilege, admin privilege escalation, user isolation, message privacy,
wallet and payment security, webhook security, third-party integration security,
backup security, recovery, audit logs, monitoring, alerting, incident response.

### What is already strong, and why it must not be weakened casually

- **RLS on every table**, with `auth.uid()` wrapped in a scalar subquery inside
  every policy for the planner
- **SECURITY DEFINER functions live in a `private` schema**, not in `public`
- **Identity documents are in a private bucket**, read only through short-lived
  signed URLs
- **Idempotency is a unique reference enforced by the database**, never a check
  in application code
- Durable rate limiting, not in-memory

### Standing rules

- **Do not collect data because you technically can.** Every new personal-data
  field needs a named lawful basis before it is added to a table. HANDOFF 01
  section 4.4
- **Never log a NIN, document number, card number or bank account number**, in
  application logs, error reports, analytics events or breadcrumbs
- **Never widen a bucket policy or an RLS policy to make debugging easier.** Fix
  the signing or the query
- **Secrets live in the environment and in Supabase Vault. Nowhere else.** If one
  is ever exposed, rotate first and tell the founder second
- `anon` needs EXECUTE on RLS helper functions, and deliberately **not** on
  anything that could expose a wallet. Without the grant, one non-public row
  breaks the entire anonymous catalogue read with 42501, and it would have worked
  right up until the first agent saved a draft

### Phase 0: items already found and never authorised

These were surfaced in a previous session and the founder never gave the word.
**Verify each one against the current tree before acting**, because at least one
of them has already turned out to be wrong.

| Item | Status |
| --- | --- |
| `<NativeRuntime />` is defined but mounted in no layout | **Confirmed.** `components/app/NativeRuntime.tsx` is imported nowhere |
| Four `*.tmp.mjs` scratch files sit in the repository root | **Confirmed.** `shot.tmp.mjs`, `shot2.tmp.mjs`, `shot3.tmp.mjs`, `shotrm.tmp.mjs` |
| The badge sweep has a `RAISE` that should not be there | Not re-verified. Check `cron.job_run_details` |
| Four escrow RPCs and their private-schema grants are exposed for a feature that does not exist | Not re-verified. **Verify before revoking**, a revoke is not free to undo |
| `/verification` is not classified in middleware | Partially verified. The route returns an honest stub and the working KYC path is the agent wizard |
| Leaked-password protection is off in Supabase auth settings | Dashboard setting. Needs the founder |
| `TravelTime` looked dead | **Wrong. It is imported and rendered by the listing detail page.** Left here as the example: do not delete something because it looks unused |

---

## 17. Authentication and account safety

Every flow works end to end, or it is not done. No dead-end screens, no fake
success messages, no missing loading states, no broken resend, no insecure
shortcuts.

Signup, login, logout, email verification, resend verification, forgot password,
password reset, resend reset, expired tokens, token invalidation, session
management, 2FA, recovery, account lockout and rate limits, suspicious activity,
device and session management, account deletion, account recovery.

### Two standing decisions

- **No Google or Apple sign in.** Email and password only. The OAuth code is
  still in the tree and is being removed: `RECOMMENDATIONS.md` N-4
- **Signed-out visitors get view only.** Any action requiring an account raises
  sign up or sign in. The middleware does the opposite today and that is
  `RECOMMENDATIONS.md` N-1, one of the four largest P0s

---

## 18. Database and backend

Do not focus only on how the frontend looks. Inspect the schema, relationships,
constraints, indexes, query efficiency, transactions, concurrency, race
conditions, validation, API contracts, authorisation, background jobs, queues,
caching, rate limiting, error handling, observability, logging, data lifecycle,
migrations, backups, recovery and scalability.

The database should not merely work. It should hold up under more users, more
messages, more listings, more transactions, more documents, more wallet activity,
more inspections, more admin operations and more integrations.

### Gotchas that each cost real time

- **A migration succeeding does not mean the function works.** A rate limiter
  once had parameters named after the columns they conflicted with: the DDL
  applied cleanly and every call raised 42702. **Run a functional probe after
  applying**, never just a success check
- **`create or replace function` cannot rename parameters.** You must DROP
- **NULL is not false.** A pass over RLS policies used `qual not like '...'` and
  silently skipped 12 INSERT-only policies because `qual` was NULL. Wrap in
  `coalesce`, then re-count rather than trusting the success
- **All subqueries in one SELECT share a snapshot.** A statement that calls a
  function and then reads the rows it changed will not see them
- Every foreign key gets a covering index
- **Mirror every applied migration into `supabase/migrations/`** with a timestamp
  prefix, so the repository never lies about the database
- **The ledger must balance exactly**: `gross = platform + agent + processor`,
  and platform is always 0
- **Lock the payer's wallet row and price the spendable balance inside that
  lock**, or two taps can both spend the last naira

### Two environment facts

- **`pg_cron` is enabled** and has been running six jobs since August: the badge
  sweep, the stale hold release, two purges, the completed-stay announcement and
  the daily note. **All schedules are UTC and Lagos is UTC+1.** Nothing alerts on
  a failed job; `cron.job_run_details` carries the outcome and nothing reads it.
  That is a real gap and a good early recommendation
- **The sandbox cannot reach the Supabase host.** Organisation policy blocks it,
  so pages render signed-out or fallback states locally and listing images may
  render as broken placeholders. **That is environment, not product. Do not fix
  it.** Verify the data layer through the Supabase MCP tools instead, and never
  disable TLS verification or unset `HTTPS_PROXY` to get around it

**Do not make destructive database changes without understanding their impact.**
There are 167 migrations and real money paths on top of them.

---

## 19. The admin panel

Treat it as a product of its own, because operations is where a marketplace lives
or dies. Identify everything missing across: user management, search, filters,
moderation, reports, suspensions, verification, listing and property moderation,
messaging moderation where it is legally appropriate, fraud and risk indicators,
security events, audit logs, support tooling, notifications, content management,
analytics, platform metrics, system health, feature flags, configuration,
integration health, payment and wallet oversight, dispute workflows, data
requests, privacy requests, deletion workflows, access control, role management
and admin activity tracking.

**Make it powerful without making it dangerous.** Two rules:

- **Strong permissions and full auditability.** Every admin action that touches a
  user's data, money or standing writes an audit row naming who did it and why.
  An admin panel without an audit trail is a liability, not a tool
- **Messaging moderation is legally constrained.** There is already a trigger
  that flags account numbers and payment keywords to admin, which is the right
  shape: flag the risk, do not give staff casual read access to private
  conversations. Widening that needs the terms to say so first

The privacy request and deletion workflows in HANDOFF 01 section 4 land here.
Rights the notice promises have to be executable by a human in this panel.

---

## 20. Property, messaging, money

### Property and listing experience

Full sweep: listing cards, previews, detail pages, containers, images, galleries,
information hierarchy, pricing, amenities, location presentation, availability,
contact actions, sharing, saved properties, inspection, receipts, rent and
payment flows, creation, editing, management, verification and reporting.

Upgrade previews and containers to look premium, trustworthy and effortless to
understand. This is the surface a visitor judges the platform by, and it is where
the old branding is most visible.

**RENT is message, inspect, then pay.** No Reserve button on a rental. That is a
product decision, not an oversight.

### Messaging

Conversations, threads, sending, receiving, read states, typing states,
attachments, media, notifications, search, blocking, reporting, safety, privacy,
retention, delivery states, failure states, empty states, performance.

**The trust flow is the feature.** Guests DM agents of approved listings, a
database trigger flags 10-digit account numbers and payment keywords to admin,
there is an in-chat verify-inspection sheet, and "pay only after inspection"
messaging runs through it. Anything added to messaging has to keep that intact.

### Wallet, savings and crypto

Inspect what exists against what is incomplete. Wallet UX, balances,
transactions, receipts, savings, transfers, payment flows, history, security,
confirmation, notifications, recovery, limits, risk controls, user education.

**Do not build financial functionality recklessly.** Where the honest answer is
stronger security, better disclosure, compliance review, a verification step or
transaction monitoring, say that rather than shipping the screen.

Two things to hold on to. **Escrow does not exist and must not be promised**;
`apps/web/src/app/(site)/safety/page.tsx` refuses to promise it on purpose. And
the corporate objects clause deliberately omits payment, escrow and wallet
wording, for the reason in HANDOFF 01 section 1: **do not let product copy claim
a regulated service the company is not licensed for.**

`SAVINGS_POTS.md` and `CRYPTO_DEPOSITS.md` describe work that is partly designed
and not fully applied. Two savings-pot migrations are pending and blocked on
dashboard access plus a constraint rebuild plus a TypeScript union update. Read
both files before touching either area.

---

## 21. Inspections, bots and smart features

Inspections are a real differentiator in the Nigerian market, because the whole
fraud pattern the platform exists to prevent happens between first contact and
first payment. Make the inspection workflow genuinely useful rather than a
booking form.

On bots and AI: **do not add AI because AI is fashionable.** The test is one
question.

**Does this make Vallo faster, safer, easier, smarter or more useful?** If yes,
propose it. If no, leave it out.

And if it does ship, it is disclosed. HANDOFF 01 section 4.7: generated output is
assistance, not advice, and never a substitute for viewing a property.

---

## 22. Integrations

Sweep what exists, what is broken, what is missing: webhooks, email, SMS,
payments, identity and verification, maps and location, storage, analytics,
notifications, security services, AI services, financial services.

For every integration proposed, weigh cost, reliability, security, vendor
dependency, user value, scalability, Nigerian relevance and international
scalability. A vendor that is excellent in London and unreachable from a Lagos
network at 9pm is not an upgrade.

### Two rules

- **The founder adds all environment keys personally.** Never block on a missing
  one. Env-guard every client and degrade into an honest, designed state. **The
  one exception:** a missing key must never fail silently on a payment webhook.
  `RECOMMENDATIONS.md` W-1
- **A new vendor that receives personal data is a privacy notice change first and
  an integration second.** HANDOFF 01 section 4.4

---

## 23. Retention, growth and performance

### 23.1 Retention: think outside the box

Start with the honest question. Why would a Nigerian renter open this app a
second time? Most property apps are used once, for one search, and abandoned the
day a place is found. A marketplace that only matters during a search is a
marketplace with no retention, and no amount of push notification fixes that.

**So the brief is not "add retention features". It is: find the reasons to come
back that are already latent in what this platform uniquely has.** Three assets
here that a normal listings site does not have, and each one is a retention
engine nobody has built yet:

- **A social layer that already ships.** 20-plus tables, areas, posts, stories,
  follows, badges. Right now it is a feed. It could be the reason someone opens
  the app on a day they are not moving house
- **A wallet and a ledger.** Money that lives in the product is a reason to
  return that has nothing to do with searching
- **A verification ladder and earned badges.** Standing that took effort to earn
  is standing people come back to maintain

**Go wide before going deep.** Generate the long list first, judge it after.
Directions worth pushing on, and none of these is a specification, they are
starting points to argue with:

- **The tenancy does not end at the booking.** Rent renewal dates, receipts,
  agreement storage, the reminder that the tenancy expires in 60 days and here is
  what is available now. That turns a one-search product into an annual
  relationship
- **Save the search, not the listing.** An alert when something matching a saved
  brief appears is the single most common reason a property app is reopened
- **Neighbourhood as content.** Someone who moved into an area knows things about
  it. The social layer is already shaped for this. An area page worth reading is
  worth revisiting
- **Verification as a status people maintain.** Badges already exist. What does a
  person lose by letting them lapse
- **The wallet as a habit, not a checkout.** Money set aside toward rent, visible
  progress, and the receipts history that a Nigerian tenant currently keeps in a
  WhatsApp thread
- **Agents are the other half of the market and they are the ones with a daily
  reason to open the app.** An agent console that genuinely runs a small business
  is more retentive than anything aimed at renters. Agents also bring the
  inventory, and without inventory there is no product
- **Diaspora.** The platform has a CGO in the UK for a reason. Someone renting or
  buying in Nigeria from abroad has a completely different set of problems:
  trust, remote inspection, someone to view on their behalf, paying from outside.
  Nobody serves this well and it is the most obvious differentiation available
- **Trust as the product.** Every mechanism that makes a person feel safer
  transacting is retention, because the alternative to this platform is a
  WhatsApp group where people get defrauded

For each idea, ask the twelve questions in section 27 and be willing to throw it
away. **A retention idea that only works if the user is confused is a dark
pattern.**

### 23.2 The line that is not crossed

**No dark patterns.** No manufactured urgency, no fake scarcity, no fake social
proof, no invented view counts, no countdown that resets, no notification
designed to manipulate rather than inform, no interface that makes leaving
harder than arriving.

The whole pitch of this platform is that it is the trustworthy place to do a
transaction people currently get defrauded in. **A manipulative pattern costs
more here than it earns anywhere.** If a growth idea requires the user not to
notice something, it is not a growth idea.

And **the platform charges no fees anywhere**, so monetisation research has to
work within that. Copy must never mention a fee.

### 23.3 Performance

It should feel fast on a mid-range Android phone on a Nigerian mobile network,
which is the actual target, not a laptop on fibre.

Audit initial load, navigation, images, fonts, API calls, database queries,
bundle size, rendering, caching, lazy loading, mobile performance, network
behaviour, and behaviour on a poor or intermittent connection. There is a
`save-data.ts` in the tree already, which is the right instinct; verify it is
actually honoured.

**Performance is retention.** On the target network, a heavy hero image or an
unbatched query is the reason someone never sees the second screen. Every
recommendation in 23.1 is worthless if the app takes nine seconds to open.

---

## 24. Moments of confirmation: success, pending, verified, failed

This is its own section because it is its own system, and right now it is not one.
It is also the part of a product people screenshot and send to a friend, which
makes it disproportionately worth getting right.

**The moment a transaction lands is the moment the platform earns its trust.**
Somebody in Nigeria who has just sent money for a property is, in that second,
either reassured or frightened. Every one of these screens is a trust screen.

### 24.1 What this covers

Every state the platform tells a person about, across every flow:

- **Success.** Payment made, wallet funded, transfer sent, booking confirmed,
  listing published, inspection booked, application submitted, message sent,
  profile saved, password changed
- **Pending.** Payment processing, transfer in flight, verification under review,
  listing awaiting approval, agent application in the queue, withdrawal
  settling. **Pending is the most neglected state in this product and the most
  anxious one for the user**
- **Verified.** The verification ladder, the agent badge, a verified listing, a
  verified identity, the earned badges that already exist
- **Failed and partial.** Payment declined, transfer reversed, verification
  rejected, upload failed, listing rejected with a reason
- **Banners and persistent notices.** Account not yet verified, email not
  confirmed, a document expiring, a tenancy ending, an action required
- **Receipts.** Which are a success state that has to survive being looked at
  again six months later

### 24.2 The reference, and what is wrong with it

The founder supplied a screenshot of a confirmation sheet from another product: a
white sheet, a scalloped orange rosette with a white tick, "Successful!", the
amount, and two buttons. The structure is right and worth learning from. **The
execution is everything this platform's brand is not.**

- **It is orange.** There is no orange, amber or gold in this product. Section 12
  rule 2, and the founder has been explicit: "it's blue, our blue, I don't want
  to hear that anymore"
- **It is a white sheet.** Dark is the default here
- **The rosette is a generic sticker.** This platform has 87 commissioned 3D
  brand objects and a glass identity that the new logo just made explicit

So: **take the anatomy, rebuild it in the Vallo language.** A confirmation sheet
that is unmistakably ours, in glass and electric blue on navy-black, using the
brand objects that already exist.

### 24.3 The Vallo confirmation language

Design it once, as a system, then use it everywhere. **Do not build a bespoke
success screen per flow**, which is what happens today.

The anatomy, which holds across every state:

1. **The mark.** A 3D brand object in a glass container, sized generously. This
   is the emotional payload and it is what makes the screen ours
2. **The verdict**, in one or two words. "Payment sent". "Under review". Not
   "Successful!" with an exclamation mark, which reads cheap
3. **The fact**, being the amount, the property, the date, whatever the person
   will want to screenshot
4. **The consequence**, being one line saying what happens next and when.
   **This is the line most products skip and it is the one that removes fear**
5. **Two actions at most**, one primary and one quiet

The container follows the new logo: a glass tile, rounded, deep navy-black
ground, electric blue rim light, a soft outer glow, and real depth. **Glass where
it earns it, not everywhere**, per section 12.

Colour by meaning, and only these: **electric blue** for the brand and the
primary action, **emerald** for success, **bright cyan** for attention and
pending, **rose** for failure. Nothing else. A pending state is not orange, it is
cyan, and that decision was made when orange was removed.

### 24.4 The marks, and what already exists

**Eighteen of the 87 brand objects are already status marks.** Check these before
commissioning anything:

`shield-check`, `user-verified`, `user-check`, `home-check`, `calendar-check`,
`clock-check`, `calendar-clock`, `doc-shield`, `doc-lock`, `shield-lock`,
`shield-home`, `card-lock`, `bell-alert`, `bell-badge`, `luggage-check`,
`support-shield`, `gift-star`, `hotel-star`.

That covers a lot: verified identity, verified property, confirmed booking, a
document under protection, an alert. **The gaps are mostly on the money and
failure side**: a payment-sent mark, a transfer-in-flight mark, a pending or
under-review mark, a declined mark, and a receipt mark.

**Write the prompts, do not guess at the art.** The founder generates these
renders himself and has rejected over-specified engineering prompts before. The
prompt that works reads like a creative director briefing a 3D artist: the
object, the material, the lighting, the mood, the angle. Not a spec sheet.

Put every prompt in `docs/BRAND_MARKS.md`, one per missing mark, each saying what
state it represents and where it will be used, and each written to match the
house style of the existing 87 so a new object does not look like a visitor.
Anchor them to the new logo: glass and chrome, electric blue, navy-black ground,
studio lighting, soft rim glow, slight three-quarter angle.

### 24.5 What to actually look for in the audit

- **Find every success, pending, failed and empty state in the product and list
  them.** There are 97 pages. The list will be long and it will not be consistent
- There is a `StatusPill` and a `Sheet` in `components/ui/` and no shared
  confirmation component. **That is the gap**: one `ResultSheet` or equivalent,
  driven by state, used by every flow
- **Pending states are probably missing entirely in places.** Anywhere money
  moves, look for what the user sees between tapping and settling. If the answer
  is a spinner, that is a recommendation
- **Check the failure copy.** A declined payment that says "Something went wrong"
  is worse than useless to someone who just tried to pay rent
- **Check what a receipt looks like six months later**, and whether it can be
  saved or shared
- **Check the banners.** Persistent notices are where dead or stale states hide

**This area alone should produce dozens of recommendations**, and they are exactly
the small, high-impact kind section 8 asks for.

---

## 25. The small things, which are most of the work

Do not skip these because they are small. They are what "premium" is made of.

Misaligned icons, bad spacing, inconsistent radii, inconsistent typography,
awkward copy, buttons that do not look clickable, poor disabled states, missing
hover states, missing focus states, poor mobile layouts, broken scroll behaviour,
unclear navigation, bad forms, missing validation, poor error messages, poor
loading states, poor empty states, excessive confirmations, confusing flows,
unnecessary steps.

**Zero "sample", "preview", "demo" or "not live" strings anywhere in UI copy.**

---

## 26. The agent protocol: three, and never more

**Maximum three agents at a time.** A large fleet once burned an enormous amount
of usage for very little gain, and the founder has been explicit and repeated
about this. Three is the ceiling, not a target: use fewer where fewer is enough.

These should be the best agents this project has run. That is a function of what
you put in their prompt, not of how many you launch.

### 26.1 The three, mapped to Track B

1. **Research, product, UX and growth.** Sections 5, 7, 8, 21, 23. Owns the
   survey of flows, the competitive and pattern research, retention thinking, and
   the largest share of the recommendation count
2. **Engineering, backend, database and security.** Sections 16, 17, 18, 19, 22.
   Owns the security sweep, the schema and query audit, the admin panel gap
   analysis, integrations
3. **Frontend, design, motion and QA.** Sections 12, 13, 14, 20, 24, 25. Owns the
   design system audit, the confirmation and status system, the property and
   messaging surfaces, the small things, and the test inventory

The **lead session** runs Track A in parallel (section 3.1) and synthesises
everything. It is not a fourth agent and it does not wait.

### 26.2 What every agent prompt must contain

Do not launch an agent with a one-line brief. Each one gets, in its prompt, every
time:

- **The rules, and an instruction to acknowledge them before starting.** Zero em
  dashes, British spelling, integer kobo as bigint, the `ActionResult` envelope,
  `BrandIcon` and `UiIcon` only with no `Icon3D`, 390px first, dark default, no
  fees anywhere, no orange or amber or gold or purple, first-party inventory
  only, escrow promised nowhere. **An agent that has not restated the rules has
  not read them**
- **Its exact file scope**, and the scopes of the other two, so it knows what not
  to touch
- **Which handoff sections are its brief**, by number
- **The reading list in section 1**, and the warning that `docs/archive/` governs
  nothing
- **The output format** for recommendations from section 8: evidence, action,
  reason, impact, effort, risk, priority
- **What is already done and must not be rebuilt** (section 2), because an agent
  that proposes rebuilding the social layer has wasted its run

### 26.3 Brutal honesty, and rechecking before reporting

This is the part that decides whether the output is worth anything.

- **Be brutally honest. Flattering scores and generous assessments are worse than
  useless**, because the founder will make decisions on them. If a subsystem is
  bad, say it is bad and say why
- **Recheck before asserting.** Read the file again. Run the query again. Look at
  the screenshot. A confident wrong finding costs more than a missing one, and
  this project has been burned by exactly that
- **Say plainly what was not checked.** "I did not verify X" is a valid and
  valuable line in a report
- **Report honestly what you did not do.** A quiet skip is worse than a stated one
- **Do not pad the count.** A recommendation with no reason is a preference. The
  target is 400 real ones, and inventing filler to reach a number is the one way
  to fail this mission outright

### 26.4 The contract

- **Strict non-overlapping file scopes, agreed in writing before anything
  starts.** No two agents in the same area, and none of them in Track A's paths
- **Agents never run git.** They never commit, never push, never branch. **The
  lead commits**
- **The lead re-audits before committing.** Two independent passes on everything.
  If the lead's audit finds a problem, it goes back
- Work items **one by one**, closed completely and verified, then the next. Never
  a batch of half-finished items
- **Do not trust an agent's success report at face value. Verify it yourself.**
  That has caught real problems more than once

### 26.5 Aim high on what they propose

The founder asked for revolutionary, high-end frontend, tools and features, not a
tidy-up. So the brief to the agents is not "find bugs". It is:

**"What would make this the best property platform anyone in this market has
seen, and what specifically is stopping it from being that today?"**

Think beyond the obvious. Propose the thing that does not exist yet. Then apply
section 27 and be willing to kill your own idea if it does not create real value.

---

## 27. The decision standard

At every decision, twelve questions:

1. Does this benefit users
2. Does this make Vallo more trustworthy
3. Does this improve retention
4. Does this improve speed
5. Does this improve security
6. Does this improve scalability
7. Does this improve usability
8. Does this make the product feel more premium
9. Does this strengthen differentiation
10. Does this reduce future technical debt
11. Does this make operations easier
12. Does this create unnecessary complexity

**If something looks impressive but creates no real value, challenge it.**

### When to decide and when to ask

**Decide it yourself** when it is obvious, reversible, low risk and consistent
with the product direction. Do not stop for every small choice; that wastes more
of the founder's time than a wrong reversible decision does.

**Surface it first** when it is legally consequential, financially consequential,
destructive, irreversible, security-critical, or dependent on information only
the founder has. Native app identifiers, a revoke, a schema change that drops
data and anything touching the agreements are all in this list.

**Think independently. Challenge bad ideas respectfully. Do not blindly agree.**
The founder has said plainly that he wants a partner who says "this is good, but
I think we can make it better because".

---

## 28. Working with the founder

This is in HANDOFF 01 section 9 in full. The short version, because getting it
wrong wastes his time and he will say so:

- **He wants the answer, not the reasoning.** Lead with the decision. One line of
  reasoning after, if it matters. Long replies get cut off mid-read
- **No em dashes.** Anywhere
- **Verify before asserting**, and say plainly when something has not been
  checked. He has been burned by confident wrong answers, including from here
- **Correct yourself fast and move on.** No apology, just the corrected fact
- **He decides.** Raise a genuine concern once, plainly, then do what he asked.
  He has overridden advice and been right

---

## 29. The standard

Not "the app works". The standard is:

**"Vallo feels like a product people would be surprised was built by a small
team."**

Beautiful, fast, reliable, secure, private, trustworthy, premium, simple, deep,
useful, modern, scalable, differentiated, seamless. Coherent from the first
screen to the last database operation.

No loose ends. No fake completeness. No abandoned flows. No legacy branding. No
unnecessary complexity. No careless security. No generic design. No "good enough".

---

## 30. Start here

This session runs autonomously (section 3). Work the list. Do not stop between
steps to ask whether to continue.

### Hour one, in order

1. Read `docs/HANDOFF_01_COMPANY.md`, then `docs/PRODUCT.md`, then
   `docs/HANDOFF.md`, then `RECOMMENDATIONS.md`
2. Confirm the branch, fetch `origin`, and bring the working branch up to date
   with `main` so the new logo commit is present
3. Run the baseline: `npm run typecheck`, `npm run lint`, `npm run test`,
   `npm run build`. **Record what already fails before changing anything**, so a
   pre-existing failure is never mistaken for one you caused
4. Inventory the branches and write `docs/BRANCH_AUDIT.md` (section 3.3)
5. **Launch the three agents** with full prompts per section 26.2. They start on
   Track B immediately

### Then, both tracks at once

**Lead, Track A**, committing after each step:

- The name sweep, in the order in 15.1
- The logo set, derived from the upload (15.2), and the `/brand/` assets (15.3)
- `docs/IMAGERY.md` and the property imagery wiring (15.4)
- Privacy, terms and disclaimers (15.5, and HANDOFF 01 section 4)
- Branch deletions once `docs/BRANCH_AUDIT.md` is pushed

**Agents, Track B**: digest, survey, rate, research, recommend. Rating written to
a file. Recommendations appended to `RECOMMENDATIONS.md` in its existing format,
with nothing renumbered and nothing discarded.

### The report, when both tracks have landed

Write it as a file, not only as a message. It answers:

**Where we are. What is missing. What is broken. What is risky. What should be
removed. What should be upgraded. What should be built. What should be tested.
What takes Vallo from 0 to 100.**

Plus the twenty-five ratings with evidence, the recommendation count by priority,
what was pushed, what was deliberately left, and **what was skipped and why.**

### Then

Push Track A to `main` once it is green. Build the highest-value items from the
prioritised list. Then sweep again, because the second sweep finds what the first
one did not know to look for.
