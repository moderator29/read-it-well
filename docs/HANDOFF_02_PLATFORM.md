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
per section 30, either make the call or surface it, depending on which kind of
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

## 3. Phase 1: digest

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

## 4. Phase 2: the wide survey

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

## 5. Phase 3: the rating

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

## 6. Phase 4: the research standard

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

## 7. Phase 5: the 400 recommendation mission

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

## 8. Phase 6: prioritise

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

## 9. Phase 7: build

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

## 10. Phase 8: test, and Phase 9: sweep again

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

## 11. Frontend and design: make it next-gen

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

## 12. The design system

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

## 13. Motion

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

## 14. Removing the old identity

The product is **Vallo**. The registered company is **VALLO SPACES LTD** and it
appears only on legal surfaces. **RentMe** and **NaijaFinds** are dead working
names. HANDOFF 01 section 5 is the authority on which name goes where.

Roughly 190 files reference `rentme` and roughly 190 reference `naijafinds`.
This is not a find and replace. Do it in this order, because the order is what
keeps the build green.

1. **User-visible copy first.** Strings, page titles, metadata, alt text, email
   templates, empty states, headers, footers, navigation, auth pages, error
   messages. Highest value, lowest risk
2. **Assets.** Logos, background graphics, favicon and app icons, placeholder
   imagery, and every old logo reference in the product UI. The current logo
   paths are `/brand/rentme-logo.png` and `rentme-logo-ink.png`, the second being
   the ink recolour that CSS swaps in for the light theme. Both need renaming and
   every reference updating together
3. **Domains.** `rentme.ng` appears in the legal pages and in metadata. It must
   become the live Vallo domain, and a stale domain in a privacy notice is the
   legal defect described in HANDOFF 01 section 4.2
4. **The npm scope, last and deliberately.** `@naijafinds/web`,
   `@naijafinds/i18n`, `@naijafinds/design-tokens` and the root `package.json`
   name. This touches every import in the tree and is the one that can break the
   build in a hundred files at once. **Do it as its own commit, with nothing else
   in it**, so a revert is clean
5. **Native app identifiers.** `apps/web/android` and `apps/web/ios` carry bundle
   identifiers and display names. Changing an application ID after a store
   listing exists is not reversible, so **confirm with the founder before
   touching these**, and read `docs/MOBILE.md` first

**Do not blindly rename legal references.** Some strings must remain the
registered company name, and some, like the commented explanation of the dead
`support@rentme.ng` mailbox in the privacy file, are historical records that
should be updated in substance rather than string-replaced.

**The visual brand did not change with the name.** Section 11 still applies in
full.

---

## 15. Security sweep

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

## 16. Authentication and account safety

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

## 17. Database and backend

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

## 18. The admin panel

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

## 19. Property, messaging, money

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

## 20. Inspections, bots and smart features

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

## 21. Integrations

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

## 22. Retention, growth and performance

### Retention

Think about why someone would download the app, return to it, trust it,
recommend it and stay. Then research the mechanisms: better onboarding,
personalisation, discovery, saved searches, smart notifications, useful
reminders, better recommendations, sharing, network effects, trust signals,
verification, progress systems, useful history, receipts, wallet utility,
messaging, personalised dashboards, re-engagement, referrals, value loops.

**No dark patterns.** No manufactured urgency, no fake scarcity, no fake social
proof, no notification designed to manipulate rather than inform. Retention comes
from real value, and on a platform whose entire pitch is trust, a manipulative
pattern costs more than it earns.

### Performance

It should feel fast on a mid-range Android phone on a Nigerian mobile network,
which is the actual target, not a laptop on fibre.

Audit initial load, navigation, images, fonts, API calls, database queries,
bundle size, rendering, caching, lazy loading, mobile performance, network
behaviour, and behaviour on a poor or intermittent connection. There is a
`save-data.ts` in the tree already, which is the right instinct; verify it is
actually honoured.

---

## 23. The small things, which are most of the work

Do not skip these because they are small. They are what "premium" is made of.

Misaligned icons, bad spacing, inconsistent radii, inconsistent typography,
awkward copy, buttons that do not look clickable, poor disabled states, missing
hover states, missing focus states, poor mobile layouts, broken scroll behaviour,
unclear navigation, bad forms, missing validation, poor error messages, poor
loading states, poor empty states, excessive confirmations, confusing flows,
unnecessary steps.

**Zero "sample", "preview", "demo" or "not live" strings anywhere in UI copy.**

---

## 24. The agent protocol: three, and never more

**Maximum three agents at a time.** A large fleet once burned an enormous amount
of usage for very little gain, and the founder has been explicit and repeated
about this.

Suggested separation:

1. **Research, product and UX**
2. **Engineering, backend and security**
3. **Frontend, design and QA**

### The contract every agent works under

- **Strict non-overlapping file scopes, agreed in writing before it starts.** No
  two agents in the same area
- **Agents never run git.** They never commit and never push. **The lead
  commits**
- **The lead re-audits before committing.** Two independent passes on everything.
  If the lead's audit finds a problem, it goes back
- Work items **one by one**, closed completely and verified, then the next. Never
  a batch of half-finished items
- Each agent gets the house rules in its prompt, every time: zero em dashes,
  integer kobo, the `ActionResult` envelope, `BrandIcon` and `UiIcon` only, 390px
  first, dark default, no fees, no orange
- Each agent reports honestly what it did **not** do. A quiet skip is worse than a
  stated one
- **Do not trust an agent's success report at face value. Verify it yourself.**
  That has caught real problems more than once

The main session synthesises. No duplicated work, no chaotic parallel changes, no
two agents editing the same file.

---

## 25. The decision standard

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

## 26. Working with the founder

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

## 27. The standard

Not "the app works". The standard is:

**"Vallo feels like a product people would be surprised was built by a small
team."**

Beautiful, fast, reliable, secure, private, trustworthy, premium, simple, deep,
useful, modern, scalable, differentiated, seamless. Coherent from the first
screen to the last database operation.

No loose ends. No fake completeness. No abandoned flows. No legacy branding. No
unnecessary complexity. No careless security. No generic design. No "good enough".

---

## 28. Start here

1. Read `docs/HANDOFF_01_COMPANY.md`, then `docs/PRODUCT.md`, then
   `docs/HANDOFF.md`, then `RECOMMENDATIONS.md`
2. Confirm the branch and the working tree are clean
3. Run the baseline: `npm run typecheck`, `npm run lint`, `npm run test`,
   `npm run build`. **Record what fails before changing anything**, so a
   pre-existing failure is never mistaken for one you caused
4. Digest, then survey, then rate. Write the rating to a file
5. Present: **where we are, what is missing, what is broken, what is risky, what
   should be removed, what should be upgraded, what should be built, what should
   be tested, and what takes Vallo from 0 to 100**
6. Then wait for the word before building the large pieces
7. Then execute. Then sweep again
