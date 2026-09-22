# Role architecture research

**Vallo: what the supply side of the property marketplace should declare it is,
how it proves it, what it must disclose about cost, and how a person switches
between the product and their business.**

Written 22 September 2026 by a read-only research session. Nothing was run
against the database, no product code was changed, and this is the only file
written. Every claim about our code carries a `path:line` read in this session.
Every claim about Nigerian law or market practice carries a citation; where a
source could only be reached through the search index rather than fetched
directly, it is marked **(via search)**, and the honesty log at the end lists
every host the egress proxy refused.

**This is product-requirements research and it is not legal advice.** The
Nigerian position on estate agency is layered (federal profession, state
authority, local government), parts of it are a bill rather than a law, and
enforcement is uneven. Where that is true, this document says so in the line
rather than in a footnote.

Ground truth read first, in this order: `docs/PRODUCT.md` (sections 3, 4 and 5),
`docs/research/HOST_ONBOARDING_RESEARCH.md` (all of it, and it is the model this
document follows), `docs/PLATFORM_SURVEY_2026-09-22.md` section 1,
`supabase/migrations/20260728152104_agents_core.sql`,
`supabase/migrations/20260805095946_an_agent_climbs_a_verification_ladder.sql`,
`supabase/migrations/20260809052558_verification_becomes_a_real_review_and_only_for_the_side_that_is_paid.sql`,
`supabase/migrations/20260809044514_what_it_actually_costs_to_move_in.sql`,
`apps/web/src/components/roles/roles.ts`, `apps/web/src/lib/side.constants.ts`
and `apps/web/src/lib/trust/verification.ts`.

## The verdict, before the evidence

The founder's co-founder is right about the market and one step wrong about the
model.

**Right:** the supply side must declare what it is, prove it, and be filterable
by it. Owner-direct against intermediary is the single most useful cut this
product can offer a Nigerian renter, and it is the cut nothing in the codebase
can make today.

**One step wrong:** three peer roles on the property side is one too many.
`REALTOR or FIRM` is not a peer of `AGENT`. It is an `AGENT` with an
incorporated entity behind them. The two do the same job (introduce a property
they do not own, for a fee), owe the same per-listing proof (a mandate), take
the same fee position, and differ only in whether a company stands behind the
person. A superset of proof is a **branch in a form**, not a role, and this
codebase already implements exactly that branch twice
(`apps/web/src/components/verification/kyc.ts:149`,
`apps/web/src/lib/agent/application.ts:132`). Worse, a firm is an
**organisation** and owner and agent are **person** types; putting them in one
list is the same category error as putting "Stays" in the list beside
"personal" and "agent".

The recommendation, stated once here and argued through Parts 2 and 3:

- **Two person roles on the property side: OWNER and AGENT.** Beside HOST on
  the stays side. An agent optionally carries a `firm_id`.
- **The firm is an entity, not a role.** It is a `public.businesses` row with
  `kind = 'agency'`, a value the enum already holds
  (`supabase/migrations/20260918080804_m01_stays_enums_and_cancellation_policies.sql:48`),
  with its own registration ladder already built
  (`supabase/migrations/20260918120500_m15_a_business_climbs_a_verification_ladder.sql:18`)
  and a new staff roster so standing is inherited rather than re-proved.
- **Three onboarding forms remain**, because the form branches on the firm flag.
  The founder's instinct about three forms is correct; the instinct about three
  roles goes one step past it.
- **The listing, not the person, carries three values**: `owner`, `agent`,
  `firm`. "Listed by the owner", "listed by Chidi Okeke, agent" and "listed by
  Acme Properties Ltd" are three genuinely different things a searcher filters
  on, and that is where the three belongs.
- **No fourth role.** A developer's relation to what they sell is *owner* (they
  own the land the units sit on), plus an off-plan disclosure the schema already
  half-carries (`build_condition = 'off_plan'`,
  `supabase/migrations/20260809044600_a_sale_has_a_price_and_a_title.sql:79`). A
  property manager's relation is *agent* with a management mandate rather than a
  letting mandate. Both are a **mandate kind** and a **flag**, not a role.

---

# PART 1. WHAT EXISTS

## 1.1 `public.agents`, the eleven columns

Created in `supabase/migrations/20260728152104_agents_core.sql:76`. The live
shape, read from the generated types at
`apps/web/src/lib/supabase/database.types.ts:556`, is eleven columns:

| Column | Where it came from | What it means |
| --- | --- | --- |
| `id uuid pk` | `20260728152104_agents_core.sql:77` | The FK hub. Nine tables point here. |
| `user_id uuid not null unique` | `:78` | **One agents row per human, enforced by a UNIQUE.** This single constraint is the reason a person cannot be an owner of one property and an agent for another today. |
| `application_id uuid` | `:79` | The application that produced it, nullable on delete. |
| `display_name text not null` | `:80` | What the workspace chrome prints. |
| `type public.agent_type` | `:81`, enum at `:28` | `'individual'` or `'business'`. **The whole of the current role model.** |
| `status public.agent_application_status` | `:82`, enum at `:18` | Seven values shared with listings and applications. |
| `verified boolean` | `:83`, redefined `20260919230000_p2_...:287` | The badge. Now derived: `verification_tier >= 1`. |
| `verification_tier smallint` | `20260805095946_an_agent_climbs_a_verification_ladder.sql:51` | 0 to 4, derived by trigger, never written by hand. |
| `is_demo boolean` | `20260809081841_the_example_lister_is_marked_and_can_never_earn_a_badge.sql:24` | The platform's own example lister. Constrained so it can never be verified (`:42`). |
| `created_at`, `updated_at` | `20260728152104:84` | Maintained by trigger at `:118`. |

**What is missing and is the whole of this project:** there is no column
anywhere on this table that says whether this person owns what they list. There
is no column that says which firm they work for. `type` carries
`individual | business`, which is a statement about the shape of their
*enterprise*, not about their *relationship to a property*, and the UI has been
quietly reading it as the latter for months (section 1.9).

## 1.2 The application, and its six steps

`public.agent_applications`, `20260728152104_agents_core.sql:33`. A separate
state machine from `agents` on purpose (header comment at `:3`): a person
applies once, is verified once, then lists many properties.

Columns, grouped as the wizard groups them:

- **Reference:** `reference text unique`, `NF-AGT-#####` from a sequence (`:31`, `:36`).
- **Type and status:** `type` and `status` (`:37`, `:38`).
- **Step 1, Personal:** `full_name`, `phone`, `email`, `residential_address`, `state_code`, `city` (`:40` to `:45`).
- **Step 2, Identity:** `id_type`, `id_number` (`:47`, `:48`).
- **Step 3, Business:** `business_name`, `business_rc` (`:50`, `:51`), extended later by `business_tax_id`, `business_email`, `business_phone`, `business_established_on`, `business_address` (`20260809052558_verification_becomes_a_real_review_and_only_for_the_side_that_is_paid.sql:155`).
- **Step 5, Payout:** `bank_name`, `account_number`, `account_name` (`:53` to `:55`).
- **Step 6, Review:** `agree_terms`, `submitted_at`, `reviewed_at`, `reviewer_id`, `review_notes` (`:57` to `:61`).
- **Constraints:** a Nigerian phone shape (`:65`) and a ten-digit NUBAN (`:67`). A plausibility bound on the business establishment date (`20260809052558:163`).

**Step 4, Documents, has no columns here.** It is `public.agent_documents`.

## 1.3 `public.agent_documents`, and the review machinery on it

Created bare at `20260728152104_agents_core.sql:90` (four columns), then turned
into a real review workflow by
`20260809052558_verification_becomes_a_real_review_and_only_for_the_side_that_is_paid.sql`.
The live shape, `apps/web/src/lib/supabase/database.types.ts:405`:

- `application_id` **made nullable** at `20260809052558:80`, with the reason
  stated in the file: "A seller who lists a property they own is not applying to
  be an agent and has no `agent_applications` row, and the old NOT NULL made it
  literally impossible for them to file a document." **That change was made in
  anticipation of exactly the work this document specifies.**
- `uploader_id` (`:84`), `subtype` (`:86`, enum at `:62` with ten values
  including `cac_certificate` and `business_address_proof`), `issued_on` (`:90`,
  so the three-month rule on an address proof is checkable).
- `review_status` / `reviewed_by` / `reviewed_at` / `rejection_reason`
  (`:92` to `:95`), with a constraint at `:113` that **a rejection must carry a
  reason of at least eight characters.**
- `supersedes_id` (`:100`): re-submission is a new row, never an edit.
- `kind` constrained to `('identity', 'address', 'business')` at `:103`.
- The decision function `private.review_kyc_document` at `:387`, which moves the
  ladder rung only when **every** document of that kind is approved (`:450`).

This is the single most reusable asset in the codebase for Part 3.

## 1.4 The verification ladder, the tier and the badge

**The ladder as data:** `apps/web/src/lib/trust/verification.ts:19` declares
`VERIFICATION_RUNGS = ["identity", "address", "payout", "in_person"]`, with a
`RungDefinition` per rung carrying a guest-facing `meaning` and a reviewer-facing
`evidence` (`:38` to `:74`) and `TIER_NAME` at `:87`. The file's own header
argues why one definition is read by both the console and the public standards
page: "A ladder whose public description and internal checklist are written
separately is a ladder that ends up promising the guest something the reviewer
never looked at" (`:5`).

**The ladder as schema:** `public.agent_verification_checks`,
`20260805095946_an_agent_climbs_a_verification_ladder.sql:31`. One row per rung
per agent, `unique (agent_id, kind)` at `:39`. The tier is computed by
`private.agent_tier` at `:59` as **the count of rungs passed with no gap below
them**, so a passed in-person check with no identity check behind it promotes
nobody (`:57`). Kept in step by an AFTER trigger at `:111`.

**The badge:** `20260919230000_p2_a_verified_agent_means_a_person_was_checked.sql`
makes `agents.verified` derived: `private.derive_agent_badge` at `:294` sets it
to `verification_tier >= 1`, a CHECK at `:316` refuses any other state, and the
social badge award at `:321` reads the tier rather than the approval. The
published copy every listing surface reads is `public.agent_badges.verified`
(`apps/web/src/lib/listings/supabase-repository.ts:826` and `:863`;
`apps/web/src/lib/messages/live.ts:151`).

**`agent_badges` itself is a live table whose creating migration is not in this
repository.** It is referenced by
`supabase/migrations/20260918130452_m09_catalogue_entries_and_stays_search.sql:152`
and `:494` and by
`supabase/migrations/20260919220000_p3_a_restaurant_can_carry_photographs.sql:355`,
typed at `apps/web/src/lib/supabase/database.types.ts:376` as
`{ agent_id, verified, verified_at, updated_at }` with a one-to-one FK to
`agents`, and named in `docs/HANDOFF_04_MARKETPLACE.md:154` as "written only by
`private.sync_agent_badge`". No `create table` for it exists under
`supabase/migrations/`. Honesty log item 1.

## 1.5 `public.agent_trust(uuid)`

`supabase/migrations/20260804142006_people_places_and_standing.sql:200`, with the
formula spelled out in the comment above it (`:186` to `:193`):

- 30 points for "verified and approved as an agent" (`:250`);
- 30 for completed stays at 1.5 each, capped at twenty (`:252`);
- 20 for median first-response time (`:253` to `:259`);
- 20 for the average review as a share of five stars (`:260`).

It **returns no row at all** for somebody who is not an agent (`:259` of the
comment; the `where exists (select 1 from me)` at `:265`), a behaviour
`apps/web/src/lib/social/profile-extras.ts:214` documents and handles. It is
deliberately granted to `anon` and `authenticated`
(`20260804142006:266`), a grant a later migration went out of its way not to
disturb (`20260919230000_p2_...:188`).

**Two of its four terms cannot score a landlord.** "Completed deals" counts
`bookings` rows with `status = 'CONFIRMED'` and a past `check_out` (`:219` to
`:224`), and `docs/PRODUCT.md:52` states the rule for the rent market: "Message
the agent, inspect the property, then pay. **No Reserve button, ever.**" A
landlord letting annually therefore produces no bookings and no reviews, and
tops out at 50 of 100 no matter how well they behave. The function is not
neutral between the roles; it is an agent scoreboard wearing a general name.

## 1.6 Suspension

`public.agent_suspensions`,
`20260805110426_an_admin_can_stop_an_agent_and_let_them_back.sql:38`. One live
stop per agent (`:69`), a required reason (`:41`), the prior status of every
withdrawn listing recorded as jsonb so a reinstatement restores exactly rather
than publishing a draft (`:44`), and the count of confirmed stays still ahead
(`:48`), which are recorded and never cancelled (`:19`). The console surface is
`apps/web/src/app/admin/stops/`.

## 1.7 The `/agent` workspace, route by route

Eighteen files under `apps/web/src/app/agent/`:

| Route | Page | What it is |
| --- | --- | --- |
| `/agent/dashboard` | `dashboard/page.tsx` | The numbers, read live under RLS. Three honest empty states and no invented figures (`:42`). Renders `KycBanner` from `getKycStanding` (`:76`). |
| `/agent/listings` | `listings/page.tsx` | The lister's own listings. |
| `/agent/listings/[id]/calendar` | `[listingId]/calendar/page.tsx` | Per-night availability. |
| `/agent/list` | `list/page.tsx` | The eight-step wizard, or the pitch for a non-agent (`:57`). Resumes the most recent open draft when no `?id=` (`:33`). |
| `/agent/bookings` | `bookings/page.tsx` | Reservations board. |
| `/agent/inspections` | `inspections/page.tsx` | Inspections for the lister. |
| `/agent/messages` | `messages/page.tsx` | The workspace inbox. |
| `/agent/reviews` | `reviews/page.tsx` | Reviews and `ReplyForm`. |
| `/agent/earnings` | `earnings/page.tsx` | Earnings. |
| `/agent/analytics` | `analytics/page.tsx` | Analytics. |
| `/agent/verification` | `verification/page.tsx` | The ladder, shown to the person being judged. Will not invent a submission flow, will not recompute the tier, will not soften a failure (`:29` to `:41`). |
| `/agent/settings` | `settings/page.tsx` | Settings and `PayoutAccounts`. |

**The gate is one function.** `getAgentContext()` at
`apps/web/src/lib/agent/listings-queries.ts:73` resolves the session, reads the
caller's own `agents` row under RLS (`:78`), and returns one of four states:
`unconfigured`, `signed-out`, `not-agent`, `agent`. Every workspace page
branches on it. The chrome's "verified agent" chip is derived from the tier and
not from the column (`:108`, with the reasoning at `:97`).

The chrome itself is `apps/web/src/components/agent/`: `AgentShell.tsx`,
`AgentNav.tsx`, `AgentRail.tsx`, `AgentMobileNav.tsx`, `agent-nav-model.ts`,
`KycBanner.tsx`, `ModeSwitcher.tsx`, `PayoutAccounts.tsx`, `ApplyWizard.tsx`,
`AgentScreenSkeleton.tsx` and two chart components.

The server library is `apps/web/src/lib/agent/`, twenty-five files, organised by
surface (`listings-*`, `bookings-*`, `calendar-*`, `reviews-*`, `payout-*`,
`analytics-*`, `messages-*`, `earnings-*`, `verification-*`), plus
`application.ts`, `application-status.ts`, `kyc-standing.ts` and `types.ts`.

## 1.8 The `nf_mode` cookie, and everything that reads it

`apps/web/src/lib/mode.constants.ts:8` declares `MODE_COOKIE = "nf_mode"`, and
`:10` declares `type Mode = "personal" | "agent"` with `DEFAULT_MODE =
"personal"` at `:12` and an `isMode` guard at `:14`.

Readers and writers, complete:

1. **`apps/web/src/lib/mode.ts:17`**, `getMode()`, the only server read. Its
   header already records the gap: "When auth lands this must additionally
   verify the user is an approved agent before honouring `agent`, so the mode is
   a view preference, never an authorisation" (`:11`).
2. **`apps/web/src/components/agent/ModeSwitcher.tsx:31`** writes the cookie and
   pushes `/agent/dashboard` or `/home` (`:33`). Two variants, a rail row and a
   "Choose your mode" picker.
3. **`apps/web/src/components/roles/RoleSwitcher.tsx:131`** writes it too, with
   `const mode = role.id === "renter" ? "personal" : "agent"`, and states the
   doctrine in the comment above: "The cookie is the view preference and nothing
   more" (`:126`).
4. **`apps/web/src/components/roles/roles.ts:190`**, `roleStateFrom(agent, mode)`,
   the only consumer of the value, mapping it to a current `RoleId` at `:213`
   with the explicit rule at `:205`: "an account with no `agents` row that
   somehow carries `nf_mode=agent` reads as a renter here, because that is what
   it is."
5. **`apps/web/src/app/(app)/profile/page.tsx:12`** imports `getMode` and feeds
   `roleStateFrom`.
6. **`apps/web/src/components/app/SideSync.tsx:18`** mentions it only to say the
   side cookie is written the same way.
7. **`apps/web/src/lib/side.constants.ts:12`** mentions it only to say it is a
   different axis and untouched here.

**Nothing under `/agent` reads `nf_mode` at all.** The workspace gate is
`getAgentContext()`, an RLS-bound read. The cookie decides what a control
displays and nothing else, which is the correct arrangement and the one Part 5
must preserve.

## 1.9 "Become an agent", end to end

The flow has been rewritten once already and the rewrite is documented in the
code. `apps/web/src/components/roles/RoleSwitcher.tsx:25` records what was
removed: an `/agents` marketing page "with a hero, three benefit cards, six
numbered step cards, an earnings tease, four FAQ cards and two calls to action",
and the argument for removing it (`:36`): "Nobody becomes an agent. Somebody
renting a flat in Yaba puts the family plot in Enugu up for sale and is now
doing both, on one account."

The flow as it stands:

1. **Entry points.** A drawer row, `apps/web/src/components/app/nav-model.ts:326`,
   `{ href: "/profile/setup", label: t.nav.becomeAgent, icon: "verified" }`,
   shown only when `signedIn && !isAgent && !stays` (`:325`). The
   switch-profile row on `/profile`
   (`apps/web/src/app/(app)/profile/page.tsx:234`). The listing pitch
   (`apps/web/src/app/agent/list/ListingPitch.tsx:71`). The dashboard's
   not-agent state (`apps/web/src/app/agent/dashboard/page.tsx:109`). The
   inspections empty state (`apps/web/src/app/agent/inspections/page.tsx:44`).
2. **Legacy URLs.** `apps/web/next.config.ts:116` redirects `/agents` to
   `/profile?switch=owner`, `/agents/apply` to `/profile/setup/owner` and
   `/agents/status` to `/profile/application`. Six surfaces still link `/agents`
   (`apps/web/src/components/site/SiteFooter.tsx:58`,
   `apps/web/src/components/app/home/HomeScreen.tsx:244`,
   `apps/web/src/app/(site)/about/page.tsx:168`,
   `careers/page.tsx:162`, `contact/page.tsx:177`, `docs/chapters.tsx:1724`).
3. **The chooser.** `apps/web/src/app/(app)/profile/setup/page.tsx:33`, two
   cards built from `ROLE_COPY`, with "What you will need" listed before the
   form (`:66`) and an honest timing sentence at `:100`.
4. **The role sheet.** `RoleSwitcher.tsx:70`. Three rows from `ROLE_ORDER`
   (`roles.ts:51`), a tick on the current one, an explicit "Not set up" or
   "Unverified" label (`:234`, `:239`), and a `RoleSetup` explanation behind any
   role the account has not got (`:298`).
5. **The application.** `apps/web/src/app/(app)/profile/setup/[role]/page.tsx:45`
   passes the role segment into `ApplyWizard`, which locks its type field:
   `TYPE_OF_ROLE = { owner: "individual", professional: "business" }`
   (`apps/web/src/components/agent/ApplyWizard.tsx:152`). Six steps
   (`:166`), every step stays mounted and merely hidden, and a server error
   walks the wizard back to the earliest offending step (`STEP_OF_FIELD`, `:72`).
   Documents upload straight to the private `agent-documents` bucket under
   `<uid>/<batch>/` (`:22`, `:91`), and drafts including document paths survive
   a closed tab (`:196`).
6. **The server action.** `apps/web/src/lib/agent/application.ts:98`. Validation
   is real (`:125`), business fields are required only for the business branch
   (`:132`), both sides of an ID are compulsory and a CAC certificate is
   compulsory for a business (`:152`), **every uploaded path must sit under the
   caller's own uid prefix or the whole submission is refused** (`:190`), and the
   row is written as `SUBMITTED` with `type: isBusiness ? "business" :
   "individual"` (`:219`).
7. **Approval.** An admin moves the application and creates the `agents` row.
   `agents` has no self-insert policy, by design
   (`20260728152104_agents_core.sql:16`).

**The role vocabulary already diverges in three places, which is the clearest
possible evidence that the model is missing.**

- `apps/web/src/components/roles/roles.ts:48` declares
  `RoleId = "renter" | "owner" | "professional"` and maps it onto
  `agents.type` at `:191`: `professional = type === 'business'`,
  `owner = type === 'individual'`. So a landlord and a one-person letting agency
  are the **same row** in the database and are told they are different things on
  the screen.
- `public.signup_role`
  (`supabase/migrations/20260809044737_a_person_says_what_they_came_here_to_do.sql:29`)
  has five values: `renter`, `buyer`, `landlord`, `seller`, `agent`. The file is
  explicit that this is "a DECLARATION ... It confers nothing" (`:9`) and that
  keeping it apart from `public.app_role` "is the whole design" (`:17`).
- `public.verification_is_required`
  (`20260809052558:493`) reads `signup_role in ('seller', 'landlord', 'agent')`,
  so the **only** place in the database that distinguishes a landlord from an
  agent is a self-declared enum that confers nothing, read by a function that
  gates verification.

Three vocabularies, three shapes, no single answer to "what is this person".

## 1.10 The listing wizard, `apps/web/src/app/agent/list/`

Four files: `page.tsx` (the gate and the data load), `ListingWizard.tsx`
(2,264 lines), `ListingPitch.tsx`, `loading.tsx`.

Eight steps, `ListingWizard.tsx:89`: `basics`, `photos`, `location`,
`amenities`, `utilities`, `pricing`, `guestView`, `submit`. Ten property types
in display order at `:108`, including `shop`, `office` and `land`. Drafts go to
both the platform and the device (`:68`). Photos upload to `listing-photos` under
`<uid>/<listing id>/` (`:72`).

The publish gate is `submitRequirements` in
`apps/web/src/lib/agent/listings-schema.ts:820`: title length, a minimum word
count on the description, a property type, a minimum photo count and a cover,
a canonical state, a city, an area, at least one amenity, and then "the money
gate, which is three different gates" (`:875`) branching on intent and property
type. For a sale it **requires a stated tenure** (`:889`), with the reasoning at
`:890`: "a sale listing that will not answer it is the shape of every land scam
there has ever been."

**Nothing in the gate, the wizard or the schema asks who the lister is to the
property.** A listing can be published today with a stated `certificate_of_occupancy`
tenure by a person who has never been inside the building.

## 1.11 Every RLS policy that mentions agents

Complete, from a scan of `supabase/migrations/*.sql`:

| Policy | File:line | Shape |
| --- | --- | --- |
| `agent_applications_insert_own` | `20260728152104:132` | `auth.uid() = user_id` |
| `agent_applications_select_own` | `:136` | `auth.uid() = user_id` |
| `agent_applications_update_draft` | `:140` | own **and** `status = 'DRAFT'` |
| `agent_applications_select_admin` | `:145` | staff |
| `agent_applications_review_admin` | `:149` | staff |
| `agents_select_own` | `:155` | `auth.uid() = user_id` |
| `agents_select_admin` | `:159` | staff |
| `agents_manage_admin` | `:163` | staff, `for all`. **No self-insert exists.** |
| `agent_documents_select_own` | `:169`, replaced `20260809052558:518` | uploader or application owner |
| `agent_documents_insert_own` | `:176`, replaced `20260809052558:535` | uploader, with an application in `DRAFT` or `SUBMITTED`, or none at all |
| `agent_documents_admin` / `_admin_review` | `:183`, `20260809052558:559` | staff read, staff update. **No uploader update or delete, by design** (`:551`). |
| `payout_accounts_own` | `:188` | through `agents.user_id` |
| `payout_accounts_admin_read` | `:199` | staff |
| `listings_select_published` | `20260728152229:160` | `status = 'PUBLISHED'` |
| `listings_owner_all` | `:164` | `exists (select 1 from public.agents a where a.id = listings.agent_id and a.user_id = auth.uid())` |
| `listings_admin_all` | `:169` | staff |
| `listing_amenities_select` / `_write` | `:180`, `:189` | via `private.owns_listing` |
| `listing_photos_select` / `_write` | `:194`, `:203` | via `private.owns_listing` |
| `availability_select` / `_write` | `:210`, `:219` | via `private.owns_listing` |
| `agent_verification_checks_admin_all` | `20260805095946:121` | staff |
| `agent_verification_checks_select_own` | `:133` | through `agents.user_id` |
| `agent_suspensions` | `20260805110426:78` onward | staff read all, agent reads their own, nobody writes |

The keystone is `private.owns_listing(uuid)` at `20260728152229:132`, a
SECURITY DEFINER function that joins `listings` to `agents` on `user_id`. Six
policies depend on it. It is the one function that has to learn about firms.

Two SECURITY DEFINER helpers also read `agents` for the public profile
projection: `20260804102930_social_public_identity_projection.sql:47` and
`20260804152426_a_public_profile_can_say_who_and_where.sql:101`, both asking
only `status = 'APPROVED'`.

## 1.12 The Host model on the Stays side

`apps/web/src/lib/host/` is seven files: `onboarding.ts` (500 lines),
`schema.ts` (195), `actions.ts` (744), `queries.ts` (297), plus `photos.ts` and
two test files. The routes are `apps/web/src/app/host/` (`page.tsx`,
`apply/`, `photos/`, `reservations/`, `transfer/`).

`onboarding.ts` is explicitly "the twin of `components/verification/kyc.ts`, for
the same reason: the flow branches" (`:4`). Three host types at `:29`,
`HostType = "individual" | "business" | "restaurant"`, each with a `title`, a
one-sentence `meaning` a person can recognise themselves in, and the set of
`business_kind` values that branch may choose (`:43` to `:62`). Five document
kinds at `:86`: `identity`, `registration`, `association`, `licence`, `hygiene`,
each with a `qualifies` list of named documents and a `caution` naming the one
thing people get wrong (`:104` to `:134`). The `association` spec at `:118` is
the closest thing in the codebase to a mandate: "A letter of authorisation on
the business's letterhead, or your employment ID. Not needed if you are named on
the CAC record."

The schema behind it: `public.businesses`
(`supabase/migrations/20260918080928_m02_businesses.sql:58`) with `owner_id`,
`agent_id` (`:62`, "the verified human behind a first-party business; the badge
hangs here"), `kind`, `source`, `status` on the shared `listing_status` enum,
location, and two constraints tying the badge to first-party rows (`:87`,
`:90`). `public.business_verification_checks`
(`20260918120500_m15_...:18`) with rungs `identity`, `registration`, `payout`,
`on_site`, `private.business_tier` at `:84` using the same no-gap law, and a
derived `businesses.verified` at `:114`.

`docs/research/HOST_ONBOARDING_RESEARCH.md` is the founding document for all of
it. The five things it establishes that this document inherits wholesale:
identity of the human first and papers of the business second (section 1.6.1);
light review before visibility with slow checks continuing after go-live
(1.6.2); bank details as structural rather than an afterthought (1.6.3); the
property must be bookable-complete to publish (1.6.4); and nobody publishes with
zero human contact (1.6.5). Its section 3.6 sets the rung-naming pattern and its
rule that tier 0 is called "Approved" and never "unverified".

## 1.13 What is genuinely agent-specific, and what is supply-side wearing an agent name

This is the load-bearing inventory for Parts 2 and 3.

**Genuinely about an intermediary (six things, and only six):**

1. `agents.type = 'business'` and the `business_name` / `business_rc` fields on
   the application (`20260728152104:50`). An owner letting their own flat has no
   RC number and should never be asked for one.
2. `listings.agency_fee_minor` (`20260809044514:92`). The comment at `:115`
   already says zero is a meaningful answer.
3. The `agent_documents.kind = 'business'` branch and the
   `cac_certificate` / `business_address_proof` subtypes
   (`20260809052558:70`, `:72`).
4. The copy. `ROLE_COPY.professional` (`roles.ts:116`) and the FAQ at
   `apps/web/src/app/(site)/help/page.tsx:154`.
5. `agent_trust`'s response-time term (`20260804142006:253`), which measures how
   fast an intermediary answers enquiries. It is a fair thing to ask of a
   full-time agency and an unfair thing to ask of a landlord with a day job.
6. The word itself, in the URL `/agent/*`, the cookie value `nf_mode=agent`, the
   table name `agents`, and 2,000-odd identifiers across the codebase.

**Supply-side logic wearing an agent name (everything else):**

- `private.owns_listing` (`20260728152229:132`). "Does this account control this
  listing" is a question about supply, not about agency.
- The whole listing wizard and its publish gate. Nothing in
  `listings-schema.ts:820` is agent-shaped.
- The four verification rungs. `verification.ts:38` describes identity, address,
  payout and an in-person meeting. Every one of those is about **the human
  receiving money**, which is precisely the rule
  `20260809052558:3` states: "The person who must be identifiable is the person
  RECEIVING money and standing between somebody and a building."
- `agent_verification_checks`, `agent_suspensions`, `payout_accounts`,
  `agent_badges`, `agent_documents` (minus the business subtypes),
  `review_responses`.
- The `/agent` workspace, all twelve routes. A landlord with three flats needs
  listings, bookings, inspections, messages, reviews and earnings exactly as an
  agency does.
- `conversations.agent_id` (`20260728152458_engagement.sql:27`), which is a
  **`auth.users` id and not an `agents` id**. It is already role-neutral; only
  its name is wrong.
- `businesses.agent_id` (`20260918080928:62`), which already means "the verified
  human behind this supply entity" and has nothing to do with agency.

**The ratio is the finding.** Of the machinery attached to the word "agent",
roughly one part in ten is genuinely about intermediation. Nine parts in ten is
supply-side logic that has been carrying an agent's name since
`20260728152104_agents_core.sql` was written on 28 July.

## 1.14 What would have to change, and what is reused untouched

**Reused with no change at all:**

- `agent_verification_checks`, `private.agent_tier`, the sync trigger, the
  `VERIFICATION_LADDER` data and `TIER_NAME`. The person ladder is already
  role-neutral.
- `agent_documents` and `private.review_kyc_document`, including the
  supersedes chain and the rejection-needs-a-reason constraint.
- `payout_accounts`, `private.verify_payout_account` and `private.name_matches`
  (`20260809052558:204`), which is the free, already-paid-for automated rung.
- `agent_suspensions` and both of its functions.
- The eight-step listing wizard and its gate, plus every photo, amenity and
  availability policy.
- The whole `/agent` workspace shell and its twelve routes.
- `businesses` and `business_verification_checks` for the firm.

**Reused with a widening:**

- `agent_documents.kind`, which needs `ownership` and `mandate` beside
  `identity`, `address` and `business`, and a nullable `listing_id`.
- `private.owns_listing`, which needs a firm arm.
- `agent_trust`, which needs its "deals" term widened past `bookings`.
- `ROLE_COPY` and the switch sheet, which need a workspace list rather than a
  fixed three.

**Genuinely new:**

- A `supply_role` on the person and a `listing_role` on the listing.
- A mandate record, per listing.
- An ownership claim, per listing.
- A firm staff roster.
- The fee transparency layer of Part 4 on the sale side, which does not exist at
  all.

**Must be retired or renamed:**

- `agents.type`. Keep the column, derive it, stop reading it. This is exactly
  what was done to `agents.verified` in `20260919230000_p2_...` and the
  precedent is good.
- `nf_mode`'s value `agent`. Part 5.
- `RoleId = renter | owner | professional` in `roles.ts:48`, which is a third
  vocabulary and should become a view over the real one.

---

# PART 2. THE DATA MODEL

## 2.1 What the data actually is

`docs/PLATFORM_SURVEY_2026-09-22.md:26`, measured against the live project on
22 September 2026: **64 listings, 64 published, 64 of 64 `is_demo`. 0 bookings.
0 escrows. 1 wallet. 8 conversations. 6 profiles. 1 agent. 8 businesses.**

That single agent row is the platform's own example lister, marked by
`agents.is_demo` (`20260809081841:24`) and structurally forbidden from ever
being verified (`:42`) or holding a badge (`:65`).

**So there is no migration risk of the ordinary kind.** There is no real
landlord whose listings would be mislabelled, no agency whose fee disclosure
would change under them, and no booking, escrow or review that a role column
could invalidate. The survey calls the empty shop "the launch blocker nobody has
said out loud" (`:29`). The corollary for this work is the opposite of a
warning: **this is the last moment at which the supply model can be changed
cheaply.** Every week of real supply after launch makes it dearer.

## 2.2 The three options, weighed

### Option A. Extend `agents` with a role enum

Add `agents.role supply_role`, backfill from `type`, done.

**For:** one migration, no new tables, no FK changes, every existing policy
keeps working, the UI reads one more column. `roles.ts:190` already does the
equivalent mapping in TypeScript and would simply read the column instead.

**Against, and it is fatal on its own:** `agents.user_id` is `not null unique`
(`20260728152104:78`). One row per human means one role per human. The founder's
own stated case, "one human can genuinely be an owner of one property and an
agent for another", is **unrepresentable**. Dropping the UNIQUE would break
`getAgentContext`'s `maybeSingle()` (`listings-queries.ts:82`),
`shell-queries.ts:96`, `agent_trust`'s `me` CTE (`20260804142006:213`), the
`agents_select_own` policy's implicit assumption, and every `.eq("user_id",
...).maybeSingle()` in the codebase.

**Verdict:** necessary but not sufficient. Keep the role column; it is the right
answer to "what kind of supply account is this". It is the wrong answer to "what
is this person to this property".

### Option B. A `supply_profiles` table that `agents` becomes one kind of

Create `public.supply_profiles`, migrate `agents` into it, point nine foreign
keys at the new table.

**For:** the vocabulary would be honest. "Agent" would stop being the name of
the supply side.

**Against:** the cost is enormous and the benefit is a word. Nine tables carry
an `agent_id` FK (`payout_accounts`, `listings`, `review_responses`,
`agent_verification_checks`, `agent_suspensions`, `businesses`, `agent_badges`,
plus `agent_documents` through `agent_applications`). Twenty-three RLS policies
name `agents`. Three SECURITY DEFINER helpers read it. `database.types.ts` is
generated and every PostgREST embed string (`agent_badges(verified)` at
`apps/web/src/lib/messages/live.ts:151`) is a literal that would have to change
in step with a deploy. And it buys nothing that Option A plus a per-listing role
does not buy, because the multi-role problem is not solved by renaming the
single-row table.

**Verdict:** rejected as a physical change. **Accepted as a vocabulary change**:
create `public.supply_profiles` as a **view** over `agents`, so new code reads
the honest name while every FK, policy and trigger keeps pointing at the
physical table. This is cheap, reversible, and it is how the codebase already
handles `agent_badges` as "the published copy" of a derived fact
(`20260919230000_p2_...:290`).

### Option C. Role per listing: the relationship carries the role

Put the role on the relationship between a person and a property.

**For:** it is the only one of the three that is actually true. Ownership is not
a property of a person. It is a property of a *pair*. The codebase has already
worked this out once, in a comment that deserves quoting in full
(`supabase/migrations/20260809044629_the_facts_a_nigerian_listing_states.sql:21`):

> THE VERIFICATION BLOCK. Three timestamps and a person. The verified badge has
> meant "the AGENT passed checks" and has said nothing about the PROPERTY. Those
> are different promises and conflating them is how a verified agent's fictional
> listing gets a blue tick.

That is the whole argument for Option C, written eight weeks ago about a
different problem.

**Against on its own:** it cannot shape an onboarding form. The form asks for
proof before any listing exists. A person with no listings has no role under a
pure Option C, and the "add a workspace" flow of Part 5 would have nothing to
offer them. It also cannot carry firm membership, which is a fact about a person
and an organisation with no property in it.

**Verdict:** necessary and not sufficient, symmetrically with Option A.

## 2.3 The recommendation: both axes, because they answer different questions

The debate resolves the moment the two questions are separated.

| Question | Subject | Where the answer lives | What it shapes |
| --- | --- | --- | --- |
| What kind of supply account is this? | a person | `agents.role` | the onboarding form, the workspace, the copy |
| Does a company stand behind them? | a person and an organisation | `agents.firm_id` plus `firm_members` | one branch of the form, and inheritance |
| What is this person to **this** property? | a person and a property | `listings.listing_role` | the publish gate, the badge, the filter, the fee line |

And three badges for three subjects, which is the discipline
`20260809044629:21` already asked for:

1. **The person badge.** `agents.verified`, derived from the four-rung ladder.
   Means "a member of staff looked at a government document". **Unchanged.**
2. **The business standing.** `businesses.verified`, derived from the
   registration ladder. Means "the CAC record matches what they told us".
   **Already built** (`20260918120500_m15_...:114`).
3. **The property claim.** New timestamps on `listings`, beside the
   `address_verified_at` and `physically_inspected_at` that already exist
   (`20260809044629:89`). Means "somebody checked that this lister may offer
   this property".

**Do not add a rung to the person ladder.** `private.agent_tier`
(`20260805095946:59`) computes an ordered count over a fixed four-element array,
and the tier is read by `verification.ts`, `/agent/verification`,
`/admin/agents`, `/standards` and `(site)/docs/chapters.tsx:1777`. Inserting a
"registration" rung would renumber every existing tier and change what
"Fully verified" means for everyone. The firm's registration is a fact about a
different subject and belongs on the business ladder, which already has its own
`registration` rung (`20260918120500_m15_...:20`).

## 2.4 The SQL sketch

Written as it would be filed, in the house style: additive, nullable first,
constraints last, with the reasoning in the file.

### Migration 1. The two enums and the person role

```sql
-- Two enums, because there are two questions. supply_role answers "what kind
-- of supply account is this", which an onboarding form branches on.
-- listing_role answers "what is this person to THIS property", which a
-- searcher filters on and a publish gate demands proof for. One enum for both
-- would make the second question unanswerable for the human who owns one flat
-- and lets another for a cousin, which is the case this project exists for.

create type public.supply_role as enum ('owner', 'agent');

comment on type public.supply_role is
  'What kind of supply account a person runs on the property side. Two values, not three: a registered agency is an agent with a firm behind them (agents.firm_id), because the proof set for a firm is a SUPERSET of the individual agent''s and a superset is a branch in a form rather than a role.';

create type public.listing_role as enum ('owner', 'agent', 'firm');

comment on type public.listing_role is
  'What the lister is to THIS property. Three values here and two on the person, deliberately: "listed by the owner", "listed by Chidi Okeke, agent" and "listed by Acme Properties Ltd" are three different offers to a reader, while at the person level the last two are the same job with different paperwork behind it.';

alter table public.agents
  add column if not exists role public.supply_role,
  add column if not exists firm_id uuid references public.businesses(id) on delete set null;

-- The honest backfill is "everybody is an agent": that is what every existing
-- row applied to be, and the one live row is the example lister.
update public.agents set role = 'agent' where role is null;
alter table public.agents alter column role set not null;
alter table public.agents alter column role set default 'agent';

create index if not exists agents_firm_idx on public.agents (firm_id) where firm_id is not null;

alter table public.agents
  add constraint agents_firm_is_an_agency_chk
    check (firm_id is null or role = 'agent');

comment on column public.agents.type is
  'DEPRECATED. individual|business, which has never meant owner|agent. Kept and no longer read, the way agents.verified was kept and derived by 20260919230000. New code reads agents.role and agents.firm_id.';
```

That `firm_id` points at a row whose `kind = 'agency'` is a cross-row condition
and so a trigger, `private.agents_firm_must_be_an_agency()`, raising when the
named business is not a first-party agency.

### Migration 2. The firm's staff

```sql
-- A firm's standing is inherited by its staff, and inheritance needs a roster.
-- Without it, every employee of a fifteen-person agency uploads the same CAC
-- certificate and fifteen reviewers look at the same document.
--
-- Deliberately NOT a column on agents. Membership is a fact about a person AND
-- an organisation and it ends; a column on either one cannot carry when it
-- started, who admitted them, or that it was revoked on a Tuesday.

create table if not exists public.firm_members (
  id           uuid primary key default gen_random_uuid(),
  firm_id      uuid not null references public.businesses(id) on delete cascade,
  agent_id     uuid not null references public.agents(id) on delete cascade,
  -- 'principal' may admit and remove members and sign a mandate for the firm.
  -- 'staff' may list under the firm's standing and nothing else.
  member_role  text not null default 'staff' check (member_role in ('principal', 'staff')),
  status       text not null default 'pending' check (status in ('pending', 'active', 'revoked')),
  -- A revocation is an update of these three, never a delete: a listing
  -- published under inherited standing stays explicable after the person goes.
  admitted_by  uuid references auth.users(id) on delete set null,
  admitted_at  timestamptz not null default now(),
  revoked_by   uuid references auth.users(id) on delete set null,
  revoked_at   timestamptz,
  revoke_note  text check (revoke_note is null or length(revoke_note) <= 2000),
  unique (firm_id, agent_id),
  constraint firm_members_revoke_chk check ((status = 'revoked') = (revoked_at is not null))
);

create index firm_members_firm_idx  on public.firm_members (firm_id, status);
create index firm_members_agent_idx on public.firm_members (agent_id, status);
create index firm_members_admitted_by_idx on public.firm_members (admitted_by);
create index firm_members_revoked_by_idx  on public.firm_members (revoked_by);
```

A minimum of one principal is **not** enforced. A firm whose only principal
leaves is a real state and refusing it would trap the row; the admin queue
surfaces it instead, exactly as `20260919210000_p1` does for an ownerless
business.

### Migration 3. The listing's own role, and the proof that goes with it

```sql
alter table public.listings
  add column if not exists listing_role public.listing_role,
  -- Denormalised from agents.firm_id ON PURPOSE: an agent who leaves a firm
  -- next year must not silently restate who listed a property last year.
  add column if not exists firm_id uuid references public.businesses(id) on delete set null,
  -- The property claim, as TIMESTAMPS and not booleans, for the reason
  -- 20260809044629:86 gives about the other two: "an inspection from two years
  -- ago is not the same statement as one from last week".
  add column if not exists ownership_verified_at timestamptz,
  add column if not exists mandate_verified_at   timestamptz,
  add column if not exists supply_verified_by    uuid references auth.users(id) on delete set null;

-- All 64 rows are is_demo, so this backfill is cosmetic and re-runnable.
update public.listings set listing_role = 'agent' where listing_role is null;
alter table public.listings alter column listing_role set not null;

create index if not exists listings_role_published_idx
  on public.listings (listing_role, listing_intent, state_code, city)
  where status = 'PUBLISHED';
create index if not exists listings_firm_idx on public.listings (firm_id) where firm_id is not null;

alter table public.listings
  add constraint listings_firm_only_on_a_firm_row_chk
    check ((listing_role = 'firm') = (firm_id is not null)),
  -- An owner proves ownership; an intermediary proves a mandate. Both set
  -- would be a listing claiming to be two things at once.
  add constraint listings_one_supply_proof_chk
    check (ownership_verified_at is null or mandate_verified_at is null),
  add constraint listings_owner_proves_ownership_chk
    check (listing_role = 'owner' or ownership_verified_at is null),
  add constraint listings_agent_proves_mandate_chk
    check (listing_role <> 'owner' or mandate_verified_at is null);
```

### Migration 4. The mandate, and the widened document kinds

```sql
-- The mandate: what an intermediary has instead of ownership. Nigerian
-- guidance is to ask for written evidence that the owner instructed the agent
-- and to confirm with the owner directly (legaldoc.ng, via search). This table
-- is that advice made into a product step, and the document is only one field
-- of it: the principal's own name and reachable number are what make the
-- document checkable.

create table if not exists public.listing_mandates (
  id              uuid primary key default gen_random_uuid(),
  listing_id      uuid not null references public.listings(id) on delete cascade,
  -- A property manager is an agent with a management mandate, which is why
  -- this is a column and not a fourth role.
  kind            text not null check (kind in ('letting', 'sale', 'management')),
  principal_name  text not null check (length(btrim(principal_name)) between 2 and 160),
  principal_phone text check (principal_phone is null or principal_phone ~ '^\+234[7-9][0-9]{9}$'),
  -- Open mandates are ordinary in Nigeria and are also how one property ends
  -- up with four agents and four fees on it.
  exclusive       boolean,
  signed_on       date,
  expires_on      date,
  document_id     uuid references public.agent_documents(id) on delete set null,
  review_status   public.document_review_status not null default 'pending',
  reviewed_by     uuid references auth.users(id) on delete set null,
  reviewed_at     timestamptz,
  rejection_reason text,
  created_at      timestamptz not null default now(),
  constraint listing_mandates_dates_chk
    check (expires_on is null or signed_on is null or expires_on >= signed_on),
  -- The same law as agent_documents:113.
  constraint listing_mandates_rejection_has_a_reason
    check (review_status <> 'rejected'
           or (rejection_reason is not null and length(btrim(rejection_reason)) >= 8)),
  constraint listing_mandates_decision_has_a_decider
    check (review_status = 'pending' or (reviewed_by is not null and reviewed_at is not null))
);

create unique index listing_mandates_one_live
  on public.listing_mandates (listing_id) where review_status <> 'rejected';
create index listing_mandates_listing_idx  on public.listing_mandates (listing_id);
create index listing_mandates_reviewer_idx on public.listing_mandates (reviewed_by);
create index listing_mandates_document_idx on public.listing_mandates (document_id);

-- Ownership and mandate documents reuse agent_documents wholesale, because
-- every hard part of document review is solved there: the supersedes chain,
-- the rejection-reason constraint, the private bucket with uid-prefix checks,
-- and private.review_kyc_document. What it lacks is a way to say WHICH
-- PROPERTY a document is about, because until now no document was.
alter table public.agent_documents
  add column if not exists listing_id uuid references public.listings(id) on delete cascade;

alter table public.agent_documents drop constraint if exists agent_documents_kind_known;
alter table public.agent_documents
  add constraint agent_documents_kind_known
    check (kind in ('identity', 'address', 'business', 'ownership', 'mandate')),
  add constraint agent_documents_property_kinds_name_a_listing
    check (kind not in ('ownership', 'mandate') or listing_id is not null);

create index if not exists agent_documents_listing_idx
  on public.agent_documents (listing_id) where listing_id is not null;
```

The subtypes a Nigerian ownership claim comes in are added to
`public.document_subtype`: `certificate_of_occupancy`, `deed_of_assignment`,
`governors_consent`, `survey_plan`, `land_use_charge_receipt`, `gazette`,
`mandate_letter`, `lasrera_certificate`, `esvarbon_certificate`. **That block
must be its own migration**, committed before anything writes one of the values,
for the reason `20260805095946:16` already records: "A new enum value cannot be
used in the transaction that adds it."

### Migration 5. RLS, and the firm arm on `owns_listing`

```sql
-- private.owns_listing has had one arm since July: the listing's agent is me.
-- A firm needs a second: the listing was published under a firm I am an active
-- member of. Six policies depend on this function, so widening it here widens
-- all six with no policy edit, which is why it was written as a function
-- (20260728152229:131).
create or replace function private.owns_listing(target_listing_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.listings l
      join public.agents a on a.id = l.agent_id
     where l.id = target_listing_id and a.user_id = auth.uid()
  ) or exists (
    select 1 from public.listings l
      join public.firm_members m on m.firm_id = l.firm_id
      join public.agents a on a.id = m.agent_id
     where l.id = target_listing_id and l.firm_id is not null
       and m.status = 'active' and a.user_id = auth.uid()
  );
$$;

-- listings_owner_all is a policy rather than a call, so it needs the same
-- second arm. Replaced rather than added to, because two permissive policies
-- on one table are an OR nobody can read.
drop policy if exists listings_owner_all on public.listings;
create policy listings_owner_all
  on public.listings for all
  using (private.owns_listing(listings.id))
  with check (exists (select 1 from public.agents a
                       where a.id = listings.agent_id and a.user_id = (select auth.uid())));
```

**Note the asymmetry, and it is deliberate.** `using` admits a firm colleague to
read and amend a firm listing; `with check` still demands that the row's own
`agent_id` be the caller. A colleague may edit the firm's listing; nobody may
reassign a listing to themselves.

`firm_members` and `listing_mandates` each get RLS enabled with: a select policy
for the subject (their own membership; `private.owns_listing` for the mandate),
a select policy for an active principal of the same firm, an insert policy for
the listing's owner on mandates, and the staff `for all` pair every table in this
codebase carries. **There is no insert or update policy for membership at all:**
admission and revocation go through a SECURITY DEFINER function that writes an
`audit_log` row, exactly as verification does (`20260809052558:262`).

A published listing's mandate is **not** public. The reader is told a mandate was
seen and when; they are never shown the principal's phone number, which is the
exact thing that would let a reader bypass the agent and the exact thing an agent
would refuse to upload if we published it.

### Migration 6. The publish gate, in the database

```sql
-- A listing may not become PUBLISHED without a role and the proof that role
-- owes. A TRIGGER and not a CHECK, because the condition is cross-row.
create or replace function private.listing_supply_proof_gate()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status <> 'PUBLISHED' or new.is_demo then return new; end if;

  if new.listing_role = 'owner' then
    if not exists (select 1 from public.agent_documents d
                    where d.listing_id = new.id and d.kind = 'ownership'
                      and d.review_status <> 'rejected') then
      raise exception 'A listing published by the owner needs an ownership document on file.';
    end if;
  elsif not exists (select 1 from public.listing_mandates m
                     where m.listing_id = new.id and m.review_status <> 'rejected') then
    raise exception 'A listing published by an agent or a firm needs a mandate on file.';
  end if;
  return new;
end;
$$;
```

**Note what this gate deliberately does not demand:** that the proof has been
**approved**. It demands that it is **on file and not rejected**. That is the
Booking.com lesson `docs/research/HOST_ONBOARDING_RESEARCH.md` section 1.6
records and its section 3.3 turns into policy: go live fast on a light check,
keep verifying afterwards, and gate the **badge** rather than the shelf. A
listing whose ownership document is pending publishes, and says "ownership
document received, not yet checked" where a checked one would say "ownership
proven".
## 2.5 What the readers have to follow

| Reader | File:line | What changes |
| --- | --- | --- |
| `listings` reads | `apps/web/src/lib/listings/supabase-repository.ts:192`, `:258` | Add `listing_role`, `firm_id`, `ownership_verified_at`, `mandate_verified_at` to both select lists. |
| `Listing` view type | `apps/web/src/lib/listings/types.ts:136` | Add `listerRole`, `firmName`, `ownershipVerifiedAt`, `mandateVerifiedAt`. |
| The badge join | `supabase-repository.ts:826`, `:863` | Unchanged. The person badge stays the person badge. |
| `catalogue_entries` | `20260918130452_m09_...:152` | Add `lister_role` to the projection so the merged shelf can filter it. It is a rebuildable projection (`HOST_ONBOARDING_RESEARCH.md` section 5), so a wrong backfill is a rebuild. |
| `bookings` | `20260728152358_bookings_payments.sql` | **No change.** A booking points at a listing; who listed it is the listing's business. |
| `conversations` | `20260728152458_engagement.sql:27` | **No schema change.** `agent_id` is already an `auth.users` id. Rename to `supplier_id` in a later cosmetic migration, or leave it; it is a name, not a bug. |
| `reviews` | `20260728152458:14` | **No change.** Reviews hang off bookings and listings. |
| `review_responses` | `20260804133502:20` | **No change.** An owner replying to a review is the same act. |
| `agent_trust` | `20260804142006:200` | **Must change.** See below. |
| `verification_is_required` | `20260809052558:493` | **Should change.** It reads `profiles.signup_role`, a self-declared enum. It should read `exists (select 1 from public.agents ...)`, which it already does as its second arm at `:508`, and drop the first. |

### `agent_trust` must become `supply_trust`

```sql
-- supply_trust: the same four terms, with the two that only an agent could
-- ever score widened to what a landlord actually does.
--
--   30  the person badge (verification_tier >= 1), NOT "approved as an agent"
--   30  completed business: confirmed stays past checkout PLUS completed
--       inspections on their listings, one and a half points each, capped
--   20  median first response, unchanged
--   20  average review as a share of five stars, unchanged
--
-- The deals term is the change that matters. docs/PRODUCT.md:52 states there
-- is no Reserve button on a tenancy, ever, so a landlord letting annually
-- produces ZERO bookings and is structurally capped at 50 of 100 under the
-- function as written. An inspection is the tenancy market's completed
-- transaction and public.inspections has carried a state machine since
-- 20260809074952.
--
-- public.agent_trust is kept as a one-line wrapper calling this, with its
-- anon and authenticated grants intact (20260804142006:266), because
-- profile-extras.ts:230 calls it by name and 20260919230000_p2 went out of its
-- way twice not to disturb that grant.
```

## 2.6 The backwards-compatible sequence

1. **Enums and columns, nullable.** Migrations 1 and 3's `add column` halves,
   plus the `alter type add value` block **alone in its own migration**. Nothing
   reads them. The product is unchanged.
2. **Backfill and set `not null`.** 64 demo listings and 1 demo agent, so this
   is a no-op in substance.
3. **`firm_members` and `listing_mandates`**, with RLS, empty.
4. **The widened `private.owns_listing` and `listings_owner_all`.** Probe under
   `private.probe_as` the way `20260805095946:24` describes: an agent reads only
   their own; a firm colleague reads the firm's; a stranger reads none; a
   colleague cannot reassign `agent_id`.
5. **The wizard writes `listing_role`** and collects the proof. Ship the UI
   before the gate.
6. **The gate trigger.** Only once step 5 has been live long enough that no
   draft predates it.
7. **`supply_trust`**, with `agent_trust` as a wrapper.
8. **`public.supply_profiles` view** over `agents`, and new code reads it.
9. **`agents.type` commented as deprecated.** Never dropped: dropping it is
   data-losing on the stop path, which is the argument
   `docs/research/UNFINISHED_WORK_AUDIT.md:1092` already makes about
   `agents.verified`.

Steps 1 to 4 are reversible with a `drop column`. Step 6 is the only one that
can refuse a write, and it refuses only on `PUBLISHED`, which is an admin
transition.

---

# PART 3. THE THREE ONBOARDING FORMS

## 3.1 The principle

The form differs because the proof differs, and the proof differs because what
can go wrong differs. Stated as three failures:

| Role | The failure this role can cause | Therefore prove |
| --- | --- | --- |
| **Owner** | Somebody lets or sells a property that is not theirs, takes a year's rent or a deposit, and disappears. The property is real and the person offering it has no right to it. | That **this person** has a documented interest in **this property**. |
| **Agent** | Somebody with no instruction advertises a property they have seen, collects inspection and agency fees from four different people for the same flat, and remits nothing. The classic Nigerian "runaround". | That **this person** is who they say they are, and that **the owner of this property instructed them**. |
| **Firm** | A letterhead. An unregistered outfit calling itself Acme Properties Ltd, with staff who each collect their own fee. | That **the company exists and is in good standing**, and that **this person speaks for it**. |

Two things fall out of that table immediately. First, an owner's proof is
**per property** and an agent's is **per property plus per person**, while a
firm's is **per company, once**. Second, the firm's set is the agent's set plus
two items, which is the argument in the verdict: a superset is a branch.

## 3.2 What can be verified in Nigeria, honestly

Marked as **auto** (machine, no human), **desk** (a reviewer with a browser),
**human** (a reviewer's judgement on a document), or **cannot** (record it as a
claim and say so).

| Thing | Reality | Verification |
| --- | --- | --- |
| Bank account belongs to the person | Paystack `resolveAccountNumber` returns the name the bank holds. Already exported and already wired into `private.verify_payout_account` (`20260809052558:320`), with a name comparison that tolerates Nigerian name-order variance (`private.name_matches`, `:204`). | **auto** |
| CAC registration (RC or BN) | Free public search at `search.cac.gov.ng` returning registered name, RC number, address and an Active / Struck Off status. **Directors are not returned by the public search**; a Status Report through an accredited agent is needed for that (cacregister.com.ng, 9jadirectory.org, via search). | **desk** in v1, **auto** later behind the planned `IdentityProvider` (`docs/API_INVENTORY.md` section 6) |
| NIN / government ID | NIN, passport, driver's licence and PVC are the four the product already accepts (`apps/web/src/components/verification/kyc.ts:64`). Lookup APIs exist (Dojah, Smile ID) and are unpriced to us; `HOST_ONBOARDING_RESEARCH.md` section 3.5 records both as requiring provider confirmation. | **human** in v1 |
| Certificate of Occupancy | **The single most important honest number in this document.** Official data cited to the Federal Ministry of Housing and Urban Development puts over 97 per cent of Nigerian land outside the formal statutory register; the NLSS 2018/19 found 71.4 per cent of sampled landlords hold no title at all, with 8.1 per cent holding a C of O and 13.2 per cent a title deed (businessday.ng, via search). A product that requires a C of O from an owner excludes roughly nine owners in ten. | **human** on the document; **cannot** be confirmed as good title without a registry search |
| Governor's consent | Land Use Act 1978 section 22 makes it unlawful for a holder of a statutory right of occupancy to alienate without the Governor's consent, and section 26 makes an alienation in breach of it null and void (lawsofnigeria.placng.org, cjokoyelawview.com, via search). This is why `land_tenure` carries `governors_consent` as its own value (`20260809044600:52`). | **human** on the document; the codebase is already right that "only a lawyer at the land registry can" confirm it (`20260809044600:44`) |
| Deed of assignment / survey plan | The Lagos verification route is a search at the Lands Bureau at Alausa against the root of title plus a survey plan bearing a survey number and a registered surveyor's name (mondaq.com, bektu.com, via search). There is a Lagos eGIS portal at `landonline.lagosstate.gov.ng`. | **human**; a registry search is a paid, lawyer-led act Vallo does not perform |
| Land Use Charge / tenement receipt | Lagos Land Use Charge consolidates land rates, neighbourhood improvement charges and tenement rates, and the demand notice goes to the owner, the occupier or an authorised agent (`luc.lagosstate.gov.ng`, via search). **So a LUC receipt is weak evidence of ownership: a tenant may hold one.** | **human**, and scored low |
| Utility bill | Proves occupation, not ownership. The product already treats it as an **address** document and not an ownership one (`kyc.ts:68`). | **human**, address only |
| Mandate letter | A letter from the owner authorising an agent to let or sell. Nigerian guidance is explicitly to ask for written evidence of instruction and to confirm with the owner directly (legaldoc.ng, via search). | **human** on the document, **plus a call-back** to the principal, which is the only real check |
| LASRERA registration | Registration with the Lagos State Real Estate Regulatory Authority is required of individuals and companies dealing in real estate agency, property development, facility management and property management in Lagos; a corporate applicant must be CAC-incorporated first; penalties reach ₦250,000 for an individual and ₦1,000,000 for a company (lagosstate.gov.ng, lasrera.lagosstate.gov.ng, renthousesurulere.com, via search). | **desk** where a public register is searchable; otherwise a **dated attestation plus an optional certificate upload** |
| ESVARBON registration | ESVARBON is established under the Estate Surveyors and Valuers Registration Act, Cap E13 LFN 2007 (originally Decree 24 of 1975) and licenses anyone practising as, or holding themselves out as, an Estate Surveyor and Valuer. NIESV is the professional institution and does not issue practising licences (esvarbon.gov.ng, niesv.org.ng, via search). | **desk** against the board's register where reachable; **attestation with a number** otherwise. **Never a gate**, because most letting agents are not estate surveyors and are not required to be. |
| REDAN | The developers' umbrella body, founded 2002, advocacy and standards rather than a statutory regulator; it is itself asking for a compulsory annual certificate of good standing that does not yet exist (redanonline.org, nigeriahousingmarket.com, via search). | **field only**, never a rung |

**The rule that follows, and it is the honesty rule the founder asked for:** a
rung that says "identity checked, ownership not yet proven" is worth more than a
badge that lies. Three of the four things an owner can hand us cannot be turned
into a truth claim by anybody short of a lawyer at a registry. So the product
records **what was seen and when**, in the same timestamp discipline
`20260809044629:86` already uses, and never converts a document into a statement
about title.

## 3.3 Form A. OWNER or LANDLORD

**Who it is for, in the words the sheet uses:** "The property is mine. I want to
let it or sell it myself, with the enquiries coming to me."

**Seven screens.** Screens 1, 2, 5, 6 and 7 are shared with the other two forms;
3 and 4 are this form's own.

| # | Screen | Fields | Notes |
| --- | --- | --- | --- |
| 1 | **You** | First name, surname, phone (`PhoneField`, the shared `lib/phone.ts` rule), state, city, residential address | Exactly `ApplyWizard` step 0 plus step 2's location half. `email` comes from the session (`application.ts:222`). |
| 2 | **Your ID** | ID type (passport, driver's licence, NIN slip or card, PVC), ID number, front and back upload | `DOCUMENT_SPECS.identity` (`kyc.ts:61`) verbatim, including the caution "All four corners in frame". Two slots, both compulsory, as `application.ts:152` already enforces. |
| 3 | **The property, and what you hold on it** | A property picker or "I will add it next"; then **"What do you have for it?"** as a single-select list with a plain-words explanation under each: Certificate of Occupancy; Governor's Consent; registered Deed of Assignment; unregistered Deed of Assignment or purchase receipt; Gazette or excision; family or community allocation; **"I have none of these"** | **The screen this whole document is for.** The list reuses `public.land_tenure` (`20260809044600:52`) plus two values it lacks, and it MUST carry "I have none of these" as a first-class answer, because 97 per cent of Nigerian land is outside the register (section 3.2) and a form without that option is a form nine owners in ten abandon. Choosing it is not a refusal: it routes to screen 4's weaker set and to a lower rung, honestly labelled. |
| 4 | **Upload what you have** | One to three documents, each with a subtype and an `issued_on` date. Strong set: C of O, Governor's Consent, registered deed, survey plan. Weak set: purchase receipt, allocation letter, Land Use Charge receipt in the applicant's name, a utility bill in the applicant's name at the property | Writes `agent_documents` rows with `kind = 'ownership'`, the new subtypes, and `listing_id`. The uploader copy names the document, not the category, following `kyc.ts:54`. Each slot states what it does and does not prove: a Land Use Charge receipt's caution reads "A tenant can hold one of these, so on its own it shows occupation rather than ownership." |
| 5 | **Getting paid** | Bank (from `NIGERIAN_BANKS`), ten-digit NUBAN, account name | **Resolve before save.** `resolveAccountNumber` runs on blur, the resolved name is shown, and the question is "Is this you?". The resolved name is what is stored (`20260809052558:183`). A mismatch does not block; it flags the review (`:314`). |
| 6 | **Permissions** | Three separate ticks: accuracy of documents, terms and privacy, processing for identity and fraud checks | `CONSENTS` (`kyc.ts:240`) verbatim, and the reason it is three and not one is in that file at `:230`: under the NDPA the processing consent must be freely given and specific. |
| 7 | **Check and send** | `missingFrom()` prints exactly what is absent | `kyc.ts:278`, and its own comment at `:275`: "Complete all required fields is the least useful sentence in software." |

**Never asked of an owner:** a business name, an RC number, a TIN, a LASRERA
number, an ESVARBON number, a mandate, or an agency fee. Screen 3's alternative
branch (`business-question` in `kyc.ts:117`) does not exist on this form, because
the role was chosen a screen earlier in the switch sheet and asking twice is the
mistake `apps/web/src/app/(app)/profile/setup/[role]/page.tsx:24` already names.

**What a Nigerian owner will not have, and must not be punished for:** a survey
plan they can find; a Governor's consent on a family property; anything at all
if the land came through an excision. The "I have none of these" path must reach
a published listing. What it must not reach is the words "Ownership verified".

## 3.4 Form B. AGENT

**Who it is for:** "I list and let property for other people, and I charge a
fee for it."

Screens 1, 2, 5, 6 and 7 are identical to Form A. Screens 3 and 4 differ, and
one screen is added.

| # | Screen | Fields | Notes |
| --- | --- | --- | --- |
| 3 | **How you work** | "Do you have a registered business?" Yes routes to Form C. No continues here. Then: how long you have been doing this, the areas you cover (chips over `public.areas`), and **"Are you registered with LASRERA?"** with a number field and a certificate upload, both optional | The branch question is `kyc.ts:117` reused exactly, with `stepsFor(business)` growing the count from five to six the moment they answer yes (`:149`). **LASRERA is optional in the form and true in the law.** It is required of agents in Lagos and penalties are real (section 3.2), but a large share of working agents hold no number, and a hard gate on it would empty the supply side of the one city that matters most. The honest treatment is a field, a dated attestation, and a **filter** on the search side so a renter who wants only registered agents can have them. |
| 3b | **Your standing, if you have it** | ESVARBON number and certificate, optional | Shown only to somebody who says they are an estate surveyor and valuer. Rendered on the profile as a dated fact, never as a rung and never as the badge, exactly the treatment `HOST_ONBOARDING_RESEARCH.md` section 3.6 gives a hotel licence. |
| 4 | **Proof of address** | A utility bill, bank statement or tenancy agreement dated within three months | `DOCUMENT_SPECS.address` (`kyc.ts:68`) verbatim, including "It must be dated within the last three months. Anything older is refused." This screen exists on the agent form and not the owner form because address is the second rung of the person ladder and an intermediary who disappears is the specific harm it answers (`verification.ts:52`). |

**And then the part that is not in the onboarding form at all.** An agent's
per-property proof is a **mandate**, and a mandate belongs to a **listing**, not
to an application. It is therefore collected in the listing wizard, as a new
step between `location` and `amenities`:

| Field | Shape | Why |
| --- | --- | --- |
| "Who instructed you?" | Owner's name, required | The principal has to be nameable. |
| Owner's phone | `+234` shape, optional but strongly nudged | **The call-back is the only real verification.** A document is a photograph; a two-minute call to the person whose name is on it is a check. The nudge copy says so: "We may ring them to confirm. That is the whole point of it." |
| Mandate kind | letting, sale, management | A property manager is an agent with a management mandate. This is the field that makes a fourth role unnecessary. |
| Exclusive? | yes, no, not sure | "No" is the honest answer for most Nigerian mandates and it is **the field that exposes the runaround**: a property with four open mandates is a property four agents will charge four fees on. Part 4.7 turns this into a reader-facing line. |
| Signed on / expires on | dates, both optional | An expired mandate is a listing that should come down. |
| The letter | one upload, `kind = 'mandate'`, `subtype = 'mandate_letter'` | Qualifies: "A letter or message from the owner instructing you to let or sell this property. A signed letter, a headed note, or a written instruction you can show us." **Deliberately generous**, because a Lagos mandate is as often a WhatsApp message as a letterhead, and a form that only accepts letterhead is a form that gets forged letterhead. |

Publishing is allowed while the mandate is `pending`. The listing says
**"Mandate received, not yet checked"** and the badge stays dark.

## 3.5 Form C. FIRM

**Who it is for:** "I work for, or I run, a registered real estate business."

It is Form B **plus two screens**, and one of the two branches on whether the
firm already exists on Vallo.

| # | Screen | Fields | Notes |
| --- | --- | --- | --- |
| 3c | **Find your firm** | Search by name or RC number over `businesses` where `kind = 'agency'`. If found: "Ask to join" sends a request to the firm's principals (`firm_members` row, `status = 'pending'`). If not found: "Register it", which continues to 3d | **The inheritance screen, and the reason a firm is an entity rather than a role.** The fifteenth employee of an agency should not upload the CAC certificate the first fourteen uploaded. `firm_members` is what makes that possible and `agents.firm_id` is what makes it visible. |
| 3d | **The business** | Registered name as the CAC holds it; RC or BN number; TIN, explicitly optional; business phone, business email, website or social page; street, city, state | `BUSINESS_SECTIONS` (`kyc.ts:180`) verbatim, all three headings, and the argument for grouping rather than stacking is in that file at `:19`. TIN optional and never blocking, because CAC and NIN are the harmonised tax identity (`HOST_ONBOARDING_RESEARCH.md` section 2.2). |
| 3e | **Papers, and that you speak for it** | CAC certificate upload (`kind = 'business'`, `subtype = 'cac_certificate'`); then **proof of association**: a letter of authorisation on the firm's letterhead, or an employment ID, or nothing if a principal on Vallo admits you | `DOCUMENT_SPECS.association` in `apps/web/src/lib/host/onboarding.ts:118` is already written for exactly this and its caution applies unchanged: "It must name you and the business, and be signed." **The CAC public search does not return directors** (section 3.2), so "you are named on the CAC record" cannot be checked from the free portal and the letter or the principal's admission is the real route in v1. |

**A firm principal's own flow** is Form C with 3c skipped and one extra
question on 3e: "Are you a director or the owner of this business?" A yes makes
them `member_role = 'principal'` and gives them the roster.

**LASRERA for a company:** a corporate applicant must be CAC-incorporated before
it can register with LASRERA (lagosstate.gov.ng, via search), so the two are
asked in that order and the LASRERA field on 3d is shown after the RC number is
entered.

## 3.6 The rungs, and what the applicant sees

**The person ladder is untouched.** Four rungs, four meanings, one definition in
`apps/web/src/lib/trust/verification.ts:38`, read by `/agent/verification`,
`/admin/agents`, `/standards` and `(site)/docs/chapters.tsx:1777`. Every one of
the three roles climbs the same one, because every one of the three is a human
who will be sent money.

**Three new dated facts, on three different subjects, none of them a rung:**

| Fact | Subject | Column | What the reader is told |
| --- | --- | --- | --- |
| Registration | the firm | `businesses.verification_tier >= 2` (the existing `registration` rung, `20260918120500_m15_...:20`) | "Acme Properties Ltd is registered with the CAC. We checked the record on 4 October." |
| Ownership | the property | `listings.ownership_verified_at` | "The lister showed us a Certificate of Occupancy in their name for this address on 4 October. We are not a land registry and this is not legal advice on the title." |
| Mandate | the property | `listings.mandate_verified_at` | "We saw a written instruction from the owner and spoke to them on 4 October." |

**What the applicant sees at each stage**, and this is the copy that decides
whether they finish:

| State | What the person is told | What they can do |
| --- | --- | --- |
| Draft | "Nothing is submitted until you press the button on the last screen." (`kyc.ts:135`) | Everything, including closing the tab. Drafts survive, documents included (`ApplyWizard.tsx:196`). |
| Submitted | "Filed as NF-AGT-10023. A person reviews this, usually within two working days." | Build listings. Not publish. |
| Approved, tier 0 | **"Approved"**, never "unverified" (`verification.ts:85`). "A person has read your application. The verified mark appears once we have checked your ID." | Publish, with the badge dark. |
| Tier 1 | "Identity verified." The badge lights (`20260919230000_p2_...:290`). | Everything. |
| Ownership pending on a listing | **"Ownership document received, not yet checked."** | Publish. The listing carries the same words. |
| Ownership checked | "Ownership document seen, 4 October." | The listing may carry the owner-direct mark. |
| A rung failed | Failed, at the same weight as a passed one, with the reviewer's note in full underneath (`apps/web/src/app/agent/verification/page.tsx:39`). | Re-submit, as a new document that supersedes the old (`20260809052558:97`). |
| Suspended | The reason in the words the agent is shown, which is `not null` by constraint (`20260805110426:41`). Their listings are down and their confirmed stays are untouched (`:19`). | Read the reason. Appeal. |

## 3.7 What is reused, and the one place the existing machinery does not fit

**Reused unchanged:** `stepsFor` and `progressLabel` (`kyc.ts:149`, `:157`);
`DOCUMENT_SPECS` and `rejectFile` (`:60`, `:78`); `BUSINESS_SECTIONS` (`:180`);
`CONSENTS` (`:240`); `missingFrom` (`:278`); the uid-prefixed private bucket
upload and its server-side path check (`application.ts:190`); the draft restore
including document paths (`ApplyWizard.tsx:196`); the earliest-error walk-back
(`STEP_OF_FIELD`, `:72`); `private.review_kyc_document` and the supersedes chain;
`private.verify_payout_account` and `private.name_matches`; the four-rung ladder
and `TIER_NAME`.

**The one place it does not fit, and it is the important one.**
`agent_documents` has no concept of a property. Its `kind` check is
`('identity', 'address', 'business')` (`20260809052558:103`) and a row belongs to
an application or an uploader (`:120`), never to a listing. An ownership document
and a mandate are both **about a property**, and filing them against a person
would produce the exact failure `20260809044629:21` warns about: a verified
person's fictional listing wearing a tick. Migration 4 in Part 2 adds
`listing_id` and the two kinds, which is the smallest change that makes the
machinery fit rather than the machinery bending the model.

**The second place, smaller.** `ApplyWizard` hardcodes six steps and three
document slots (`ApplyWizard.tsx:167`, `application.ts:66`). Three forms of five,
six and eight steps cannot live in a hardcoded array. It should become the
`stepsFor`-style data model `apps/web/src/lib/host/onboarding.ts` already is on
the Stays side, which is the twin argument that file itself makes at `:4`.

---

# PART 4. THE FEE TRANSPARENCY LAYER

The platform charges nothing and the position is settled
(`docs/PRODUCT.md:59`: "The platform charges nothing today", and
`supabase/migrations/20260809051502_what_the_platform_charges_and_it_is_nothing.sql`).
What the platform can do is make the **third party's** costs visible before
anybody picks up a phone. That is the actual answer to the runaround, and it is
half built already.

## 4.1 What already exists, read in full

**The schema.**
`supabase/migrations/20260809044514_what_it_actually_costs_to_move_in.sql` adds
eleven columns to `listings` at `:74`: `rent_amount_minor`, `rent_period`,
`rent_negotiable`, `caution_deposit_minor`, `service_charge_minor`,
`service_charge_period`, `agency_fee_minor`, `legal_fee_minor`,
`agreement_fee_minor`, `total_move_in_cost_minor`, `minimum_tenancy_months`,
`available_from`, `furnished`. Three arguments in that file are load-bearing and
this document adopts all three:

1. The total is a **first-class column and not a generated one** (`:16`), for
   three reasons given in order of weight at `:19`: it is the number people shop
   on and a filter wants it indexed; the parts are not always known while the
   total is; and the parts do not always add up because some agents fold legal
   into agency and a derived figure would invent a breakdown nobody quoted.
2. The constraint runs **one direction only** (`:180`): the total may exceed the
   sum of the stated parts and may never undercut it.
3. **Zero is a real answer** (`:132`): "an agent waiving their commission should
   be able to say so, and a rendered 'no agency fee' is worth more to a reader
   than an absent row." The column comment at `:116` says it again.

Two partial indexes exist: `listings_move_in_cost_idx` (`:200`) on
`total_move_in_cost_minor` for published rent listings that carry it, and
`listings_rent_amount_idx` (`:206`).

**The library.** `apps/web/src/lib/listings/pricing.ts` resolves three money
stories on one row (`:6`). `headlinePrice` (`:101`) picks sale, then rate, then
rent, and never returns null (`:97`). `moveInParts` (`:233`) builds the parts in
the order a tenant meets them, **skipping anything unstated and keeping a stated
zero** (`:218`). `moveInTotal` (`:264`) returns `{ minor, stated }`, using the
lister's own total when there is one and the sum of the named parts otherwise,
and it tells the caller which of the two it gave back **so the caller can say
"from" rather than a flat figure** (`:262`).

**The wizard.** `ListingWizard.tsx:1832` is a bordered block headed "What it
costs to move in" (`:1846`) with six naira inputs (`:1854` to `:1915`), a
service-charge cycle select (`:1893`), and a "Total to move in" field whose hint
does live arithmetic against the parts (`:1921` to `:1930`) and prints the
resolved figure labelled either "as you stated it" or "from the parts above"
(`:1941`). The helper state is at `:482`: `partsSumMinor`, `statedTotalMinor`,
`moveInMinor`. The sub-copy at `:1848` is already correct: "Anything you leave
blank is shown as not stated, never as zero."

**The two components, and this is the finding.**

`ListingMoveInBlock.tsx` (95 lines) is **live**, rendered on the listing page at
`apps/web/src/app/(app)/listing/[id]/page.tsx:841`, gated to
`isRental && !isSale`. It prints one figure with the label "Move-in total" or
"Move-in from" (`:40`), the rent and its period beneath it (`:54`), and the
rooms tile. Three dictionary strings back it
(`packages/i18n/src/locales/en.ts:3721`).

`ListingMoveIn.tsx` (161 lines) is **dead**. Nothing imports it; the only
occurrence of the name in the codebase is its own export at `:75`. It is also
the better component: it prints the total, then a `Disclosure` labelled "What
makes up this figure" holding **every stated part as a line item** (`:117` to
`:156`), a total row, and two different closing sentences depending on whether
the total was stated or summed (`:151`). Its header states three refusals
(`:26`): it never recomputes the total from the parts, it never prints a fee
nobody stated, and it renders nothing at all when neither a total nor a part was
named (`:89`).

**So the breakdown exists, is correct, is written, and is not on the screen.**
A Nigerian renter looking at a Vallo listing today sees one number and cannot
find out what is in it. That is the single cheapest fix in this entire document.

## 4.2 The gaps, named

1. **The breakdown is invisible.** `ListingMoveIn` is unrendered (section 4.1).
2. **Nothing says who charges what.** A reader sees "Agency fee ₦450,000" and
   cannot tell whether it goes to the person they are messaging, to a firm, or
   to a second agent further down a chain.
3. **An owner's zero is not shown as a zero.** `agency_fee_minor = 0` is
   meaningful by design (`20260809044514:115`) and no surface renders it as
   "No agency fee". The wizard does not pre-fill it for an owner, because the
   wizard does not know what an owner is.
4. **There is no sale-side cost model at all.** `sale_price_minor` and `tenure`
   exist; agency fee on a purchase, legal fee, Governor's consent fee, stamp
   duty and registration fee do not. The column comment at
   `20260809044600:96` admits it: "a Nigerian purchase also carries agency,
   legal and consent fees, and those are the buyer's lawyer's business rather
   than something this platform can state." **That was true when the platform
   could not model a role. It is no longer a good enough answer**, because the
   consent and stamp duty percentages are published state rates and the buyer's
   surprise is the same surprise the rent side already fixed.
5. **Search cannot sort or filter on the honest number.** `SORTS`
   (`apps/web/src/lib/listings/search-params.ts:46`) offers `recommended`,
   `top-rated`, `price-asc` and `price-desc`, all of which read `priceMinor`
   from `headlinePrice` (`supabase-repository.ts:716`). The index on
   `total_move_in_cost_minor` exists and **nothing queries it**. The budget
   filter reads `min` and `max` against the headline (`search-params.ts:271`),
   so a renter with ₦6,000,000 to spend is shown 4.5m flats that need 7m.
6. **Nothing exposes the chain.** Whether one property carries one mandate or
   four is the mechanism of the runaround and the schema cannot ask.

## 4.3 Every cost a Nigerian tenant actually meets

| Cost | Who charges it | Typical | Column | Declared or computed |
| --- | --- | --- | --- | --- |
| Rent | landlord | the headline | `rent_amount_minor` + `rent_period` | declared, **required** |
| Agency fee | agent or firm | customarily 10 per cent of annual rent; the Lagos Tenancy Bill 2025 proposes a cap of 5 per cent and it is a **bill, not a law**, still with the House Committee on Housing as of September 2026 (leadership.ng, premiumtimesng.com, withinnigeria.com, via search) | `agency_fee_minor` | declared; **forced to 0 for `listing_role = 'owner'`** |
| Legal fee | the owner's or agent's lawyer | around 5 to 10 per cent, for preparing the tenancy agreement (nigeriahousingmarket.com, property360.africa, via search) | `legal_fee_minor` | declared, optional |
| Agreement fee | agent | a flat charge where it is billed separately from the legal fee | `agreement_fee_minor` | declared, optional |
| Caution or damage deposit | landlord | refundable in principle, commonly 10 per cent of annual rent or one month (ownkey.com, listmyproperty.ng, via search) | `caution_deposit_minor` | declared, optional, **flagged refundable** |
| Service charge | the estate | on its own cycle, which is frequently not the rent's | `service_charge_minor` + `_period` | declared, optional |
| Inspection or viewing fee | agent | not standard and widely charged anyway; one reported tenant paid ₦15,000 in viewing fees before securing a flat, on top of agency and legal each at 37.5 per cent of the rent and a 25 per cent deposit (nairametrics.com, via search) | **missing** | **new column**, declared, optional |
| Stamp duty on the tenancy | the state | around 0.78 per cent on an ordinary one-year residential tenancy; 6 per cent applies to leases above 21 years and 3 per cent to 7 to 21 years (FIRS position reported at nigeriatransporthub.com.ng, mondaq.com, via search) | **missing** | **computed**, shown as an estimate |

**The reported gap between the customary rate and the charged rate is the
product opportunity.** Customary is 10 per cent agency; reported real-world
cases run to 37.5 per cent, plus a separate 37.5 per cent "legal", plus viewing
fees (nairametrics.com, via search). A platform that prints the declared
percentage **as a percentage of the rent, beside the naira figure**, makes that
visible without accusing anybody.

## 4.4 Every cost a Nigerian buyer actually meets

None of this exists in the schema today.

| Cost | Typical | Proposed column | Declared or computed |
| --- | --- | --- | --- |
| Asking price | the headline | `sale_price_minor` (exists) | declared, required |
| Agency fee on a purchase | commonly 5 per cent of the price | `sale_agency_fee_minor` | declared; **0 for an owner** |
| Legal fee | commonly 5 to 10 per cent | `sale_legal_fee_minor` | declared, optional |
| Governor's consent fee | Lagos 2026 Blue Book, effective 1 May 2026: consent 1.5 per cent of assessed value, CGT 0.5 per cent, stamp duty 0.5 per cent, registration 0.5 per cent, **3 per cent aggregate** (estateintel.com, legit.ng, businessday.ng, via search) | `consent_fee_minor` | **computed from a rate table**, shown as an estimate |
| Stamp duty | 0.5 per cent of assessed value under the same schedule | `sale_stamp_duty_minor` | computed |
| Registration fee | 0.5 per cent | `sale_registration_fee_minor` | computed |
| Survey and searches | a lawyer's bill, unpredictable | none | **named in copy, never given a number** |

**Computed, and never stored as a promise.** The three statutory figures are
rates against an *assessed* value, not the asking price, and Lagos raised them
sharply in 2026 with industry estimates of up to a 300 per cent increase in
prime areas (businessday.ng, legit.ng, via search). So they live in a rate table
with effective dates, exactly as the platform's own fee policy already demands
of its own future fees (`docs/PRODUCT.md:78`: "Rates live in a table with
effective dates, never in code"), and they render as **"estimated, at the 2026
Lagos rate"** with the rate and the base beside the figure, which is the same
rule `docs/PRODUCT.md:80` sets for a platform fee.

## 4.5 The schema

```sql
-- Two new rent-side columns, six new sale-side ones, and a rate table.
alter table public.listings
  -- The fee everybody complains about and nobody lists. Zero is a real answer
  -- and is the answer an owner-direct listing gives.
  add column if not exists inspection_fee_minor bigint
    check (inspection_fee_minor is null or inspection_fee_minor >= 0),
  -- Refundability is a separate fact from the amount. A "refundable" caution
  -- that has never been refunded is the market's open secret, so the column
  -- records what the lister CLAIMS and the copy says so.
  add column if not exists caution_refundable boolean,

  add column if not exists sale_agency_fee_minor bigint
    check (sale_agency_fee_minor is null or sale_agency_fee_minor >= 0),
  add column if not exists sale_legal_fee_minor bigint
    check (sale_legal_fee_minor is null or sale_legal_fee_minor >= 0),
  -- The lister's own figure, when they have one. The estimate below is used
  -- only when this is null, and the reader is told which they are looking at.
  add column if not exists statutory_fees_minor bigint
    check (statutory_fees_minor is null or statutory_fees_minor >= 0),
  add column if not exists total_purchase_cost_minor bigint
    check (total_purchase_cost_minor is null or total_purchase_cost_minor >= 0);

-- The same one-direction constraint the rent side already has (20260809044514:180).
alter table public.listings
  add constraint listings_total_purchase_covers_its_parts check (
    total_purchase_cost_minor is null
    or total_purchase_cost_minor >=
         coalesce(sale_price_minor, 0)
       + coalesce(sale_agency_fee_minor, 0)
       + coalesce(sale_legal_fee_minor, 0)
       + coalesce(statutory_fees_minor, 0)
  );

-- Statutory rates, by state, with effective dates, because a rate in code is a
-- rate nobody can correct without a deploy and a rate with no date is a rate
-- that silently rewrites last year's listings.
create table if not exists public.statutory_rates (
  id            uuid primary key default gen_random_uuid(),
  state_code    text not null references public.states(code),
  kind          text not null check (kind in
                  ('consent', 'stamp_duty', 'registration', 'capital_gains', 'tenancy_stamp_duty')),
  basis         text not null check (basis in ('assessed_value', 'annual_rent')),
  rate_bps      integer not null check (rate_bps between 0 and 10000),
  effective_from date not null,
  effective_to   date,
  source_note   text not null,
  unique (state_code, kind, effective_from)
);

comment on table public.statutory_rates is
  'What the STATE charges on a property transaction, in basis points, by state, with effective dates and a note naming where the figure came from. Never a promise: the base is an assessed value the state decides, so every figure computed from this renders as an estimate with its rate and base shown beside it.';
```

`statutory_rates` is world-readable (it is published policy) and staff-writable
only.

## 4.6 Validation, and the honesty rules

1. **A stated zero and an unstated fee are different facts.** Already the rule
   in `pricing.ts:218` and `ListingMoveIn.tsx:32`. Extend it to every new
   column. An unstated fee renders as **"Not stated"**, never as ₦0 and never as
   a blank.
2. **The total is never recomputed from the parts.** `moveInTotal` (`:264`)
   already gets this right and the label changes to "from" when it summed
   (`ListingMoveInBlock.tsx:40`).
3. **An owner listing forces agency to zero.** When `listing_role = 'owner'` the
   wizard pre-fills `agency_fee_minor = 0`, disables the field, and shows one
   line: "You are listing this yourself, so there is no agency fee. If somebody
   else is charging one, you are listing as an agent." That sentence is the
   whole product, in the form, at the moment of truth. The database backs it:

```sql
alter table public.listings
  add constraint listings_owner_charges_no_agency_fee
    check (listing_role <> 'owner' or coalesce(agency_fee_minor, 0) = 0);
```

4. **Percentages are printed beside naira, on the fee lines that have a
   customary rate.** "Agency fee ₦450,000 (10 per cent of the rent)". The
   arithmetic is the reader's own and the platform is not accusing anybody; it
   is stating the rent, the fee and their ratio, which is exactly what a tenant
   works out on the back of an envelope after the inspection.
5. **A statutory figure is always labelled as an estimate** with its rate, its
   base and its date, and never folded into a declared total.
6. **The refundable claim is the lister's.** "The lister says this deposit is
   refundable." Never "refundable".
7. **Nothing is published without an answer to the rent-side total.** Extend
   `submitRequirements` (`listings-schema.ts:820`): for
   `intent = 'rent'` and a tenancy property type, **either**
   `total_move_in_cost_minor` **or** at least the rent plus one fee must be
   stated. A listing that names only a rent goes to the shelf saying
   "Move-in cost not stated" and is **sorted last** under the move-in sort,
   which is a fair and self-correcting penalty.

## 4.7 The reader's surfaces

**On the card.** One line under the headline: **"₦7.0m to move in"** or
**"Move-in cost not stated"**, plus the owner-direct mark where it applies. The
card model is `apps/web/src/components/app/listing-card-model.ts`.

**On the listing page.** Render `ListingMoveIn` (the dead component) beneath
`ListingMoveInBlock` (the live one), or better, fold the disclosure into the
block. The breakdown gains three lines it does not have:

- a **who** column: "Agency fee ₦450,000, charged by Acme Properties Ltd";
- a **not stated** row for each unnamed fee, so absence is visible rather than
  invisible;
- the honest closing sentence already written at `ListingMoveIn.tsx:151`.

**The owner-direct block**, which is the new thing:

> **Listed by the owner. No agency fee.**
> Chidi Okeke owns this property and is letting it directly. We saw a
> Certificate of Occupancy in his name for this address on 4 October. We are not
> a land registry, so this is what we saw and not advice on the title.

**The agent block:**

> **Listed by an agent.** Agency fee ₦450,000, which is 10 per cent of the
> yearly rent. We saw a written instruction from the owner on 4 October and
> spoke to them.
> *One of several agents on this property.* (rendered only when
> `listing_mandates.exclusive = false`)

That last line is the runaround, named, from a field the lister volunteered.

**On search.** Two additions:

- a **sort key** `move-in-asc`, added to `SORTS`
  (`search-params.ts:46`), ordering on `total_move_in_cost_minor` with its
  existing index (`20260809044514:200`), nulls last;
- a **filter chip** "Listed by the owner", reading `listing_role = 'owner'`
  against the new `listings_role_published_idx`, sitting beside the existing
  filter set in `apps/web/src/components/app/filters/FilterDrawer.tsx`.

The budget filter should read the move-in total rather than the rent when the
sort is `move-in-asc`, and say which it is filtering on. A silent switch between
two bases is worse than either one.

---

# PART 5. THE CONTROL

## 5.1 The three axes, and the one rule that keeps them apart

| Axis | Question | State | Today |
| --- | --- | --- | --- |
| **SIDE** | What am I browsing? | `nf_side`, `property` or `stays` | Built. `apps/web/src/lib/side.constants.ts:19`, `:21`, read by `getSide()` (`side.ts:20`), overridden by `sideOfPath` (`side.constants.ts:58`), switched by the coin (`SideSwitch.tsx:27`) through the flip (`flip/SideFlip.tsx`). |
| **MODE** | Am I using the product or running a business on it? | `nf_mode`, `personal` or `agent` | Built, and **misnamed**. `mode.constants.ts:10` calls the working value `agent`, so the axis carries a role's name. |
| **ROLE** | Who am I when working? | nowhere | Not built. Derived in TypeScript from `agents.type` (`roles.ts:191`). |

**The rule, stated three times in the codebase already and never to be broken:**
a view preference is never an authorisation.
`side.constants.ts:15`: "THE SIDE IS A VIEW PREFERENCE, NEVER AN AUTHORISATION.
Nothing reads it to decide what somebody may do." `side.ts:14` repeats it.
`mode.ts:14` says the same of the mode. `roles.ts:205` enforces it in the
mapping. The workspace gate is an RLS-bound read of the caller's own `agents`
row (`listings-queries.ts:78`), and the nav is built from another
(`shell-queries.ts:96`, failing closed at `:123`).

## 5.2 The hypothesis, tested: role is what MODE resolves into

**Confirmed, and the code is already most of the way there.**
`roleStateFrom(agent, mode)` (`roles.ts:190`) takes the cookie and the account's
own facts and returns a current role: if the mode is `agent` and the account is
a business, `professional`; if individual, `owner`; otherwise `renter`
(`:213`). That is exactly "mode resolves into a role". `RoleSwitcher.choose`
(`:112`) then writes the cookie back, mapping any non-renter role to
`nf_mode=agent` (`:131`).

The three symptoms of the missing third axis are all visible in that one file:

1. **The cookie cannot say which workspace.** Two people, one an owner and one
   an agent, both carry `nf_mode=agent`. A person who is both could not be
   represented, because `agents.user_id` is unique (Part 2.2).
2. **The role list is fixed at three** (`ROLE_ORDER`, `:51`) and one of the
   three, `renter`, is not a workspace at all. Its `href` is `/home`
   (`:88`), which is the personal mode.
3. **Stays is missing from it entirely.** A Host has no row in the sheet, so
   there is one switch-profile surface that knows about two of the product's
   three supply shapes.

**So role is not a fourth switch. It is what the second one resolves into, and
the second one needs one more bit of state to resolve correctly.** The coin
keeps doing exactly what it does now and nothing in `SideFlip` or
`sideOfPath` changes.

## 5.3 The cookie contract

```
nf_side       property | stays                      unchanged
nf_mode       personal | working                    'agent' accepted on read, written as 'working'
nf_workspace  supply:<agents.id>
              | firm:<businesses.id>
              | stays:<businesses.id>
              | admin                               new, only meaningful when nf_mode=working
```

- `nf_mode` takes a new value `working` and **keeps reading `agent`** as a
  synonym for one release, so no signed-in person is thrown back to personal
  mode by a deploy. `isMode` (`mode.constants.ts:14`) widens to accept all
  three; `getMode` normalises `agent` to `working`.
- `nf_workspace` is an **opaque key, never an authorisation**. The server
  resolves it against the caller's own RLS-bound reads on every request, and an
  unresolvable key falls back to the person's single workspace, or to personal
  mode when they have none. A hand-edited cookie changes what a control
  displays and nothing else, which is the doctrine `RoleSwitcher.tsx:126`
  already states.
- **The URL wins over the cookie**, exactly as `sideOfPath`
  (`side.constants.ts:58`) already does for the side. A deep link to
  `/agent/listings/abc` resolves the workspace from the listing's own owner, not
  from the cookie. A workspace the caller does not hold is a refusal from the
  route's own gate, not a redirect to a different workspace.
- Cookie attributes follow `writeSideCookie` (`side.constants.ts:68`):
  `path=/`, one year, `samesite=lax`. Not `HttpOnly`, because the switch writes
  it on the client, which is how both existing cookies work.

## 5.4 The control, and where it lives

**One sheet, called "Switch profile", opened from the side navigation and from
the bottom navigation.** It replaces `RoleSwitcher`'s fixed three rows with a
list built from what the account actually holds:

```
  Personal                               [tick, when nf_mode=personal]
  Using Vallo for yourself

  WORKSPACES
  Chidi Okeke, owner                     Property
  Acme Properties Ltd                    Property, firm    [Pending]
  Sunrise Apartments                     Stays
  Operations console                     Staff

  + Add a workspace
```

Placement. The side navigation's foot already holds the two controls that
"change how the product looks rather than where you are"
(`AppRail.tsx:183`): the coin and the theme row. **Switch profile is the third
and it goes above the coin**, because it is the bigger question of the three:
the coin turns the shelf over, this changes who you are on it. On the bottom
navigation it is the profile island, which already opens `/profile`
(`MobileTabBar.tsx:14` shows the island as the sixth element); a long press or
a chevron on the island opens the sheet. The `/profile` row stays, because a
settings surface should list everything the account has.

The sheet is the existing `Sheet` with `detents={[0.6, 0.92]}`
(`RoleSwitcher.tsx:185`) and the same row anatomy the file argues for at `:48`:
rows in one surface with inset hairlines, an icon in a tinted circle, a label, a
one-line description, a tick on the current one. "No card per row: three roles
drawn as three cards is three borders, three radii and three shadows for one
list of three things."

## 5.5 Every state

| Workspaces held | Personal row | Workspace rows | "Add a workspace" | The trigger in the nav |
| --- | --- | --- | --- | --- |
| **Zero** | Present, ticked | None. One line instead: "You have no workspaces yet. Add one to start listing property or taking bookings." | Present, primary | Reads "Start listing", which is what `nav-model.ts:326` already offers, and opens the sheet rather than navigating |
| **One** | Present | The one, with its side and role | Present, quiet | Reads the workspace's name. Tapping the trigger **toggles directly** between personal and that workspace, with the sheet on a long press. One tap for the only two states somebody has. |
| **Several** | Present | All, grouped by side, Property before Stays, the console last | Present, quiet | Reads the current profile's name and always opens the sheet |

**Pending.** A workspace whose application is `SUBMITTED` or `UNDER_REVIEW`
appears in the list with a **Pending** label and is **selectable**. This is
deliberate and it is already the product's position: `roles.ts:159` keeps
`setUp` and `verified` as separate booleans precisely because "a seller
mid-review is set up and not verified, and that is a real, common, WORKING
state: they can fill in a listing, they cannot publish it." Selecting it enters
the workspace, which shows `KycBanner` (`dashboard/page.tsx:76`) and a publish
control that explains rather than refuses silently.

**Rejected.** Labelled **Not approved**, selectable, and the workspace opens on
`/agent/verification`, which shows the failed rung at the same weight as a
passed one with the reviewer's note in full (`verification/page.tsx:39`).

**Suspended.** Labelled **Suspended**, selectable, and the workspace opens on a
screen carrying the suspension reason, which is `not null` by constraint
(`20260805110426:41`). Their listings are already down and their confirmed stays
are untouched (`:19`), so the screen says both. **The sheet never hides a
suspended workspace**, because a person who has been stopped and cannot find out
why is the failure the whole suspension design exists to prevent.

**Revoked firm membership.** The firm row disappears from the list and the
person's own agent workspace remains. Listings they published under the firm
stay with the firm, because `listings.firm_id` is denormalised for exactly this
reason (Part 2.4, Migration 3).

## 5.6 Where "view preference is never authorisation" bites

Five places, named, because each one is a bug waiting to be written:

1. **The nav must not be built from the cookie.** `buildNav`
   (`nav-model.ts:106`) takes `isAgent` and `isAdmin` as booleans resolved from
   RLS-bound reads (`shell-queries.ts:96`, `:101`), never from `nf_mode`. The
   workspace list in the sheet must come from the same place. Building it from
   `nf_workspace` would offer somebody a door into a room they do not have.
2. **The route gate stays where it is.** Every `/agent/*` page calls
   `getAgentContext()` (`listings-queries.ts:73`) and branches on its four
   states. Nothing may short-circuit that on the cookie.
3. **`nf_workspace` must be re-resolved every request.** A firm membership
   revoked at 10am must stop resolving at 10:01, not at cookie expiry in a year.
   The resolution is a join through `firm_members` with `status = 'active'`, so
   a revocation is immediate by construction.
4. **A publish is never gated on the cookie.** The publish gate is
   `submitRequirements` plus the new trigger (Part 2.4, Migration 6), both
   server side. A person in personal mode who somehow posts a publish must be
   refused by RLS, not by a missing button.
5. **The badge is never a function of the current workspace.** It is
   `agent_badges.verified`, derived from the tier. Somebody switching into a
   firm workspace does not acquire the firm's standing; the firm's standing is
   rendered as the **firm's**, beside the person's own.

## 5.7 Accessibility and honesty of the control

- The trigger is a `button` with `aria-haspopup="dialog"`, as
  `RoleSwitcher.tsx:145` already does, and its accessible name is the current
  profile plus what the control does, never an icon alone.
- The current row carries `aria-current="true"` (`:216`) and a visible tick.
- Pending, Not approved and Suspended are **text**, not colour alone.
  `RoleSwitcher.tsx:235` already renders "Not set up" and "Unverified" as
  uppercase text labels.
- Switching announces itself. The flip already has a live region
  (`SideFlip.tsx:31`, "Switching to Stays"); the profile switch needs the twin.
- **A workspace that is not set up is a question, never a navigation**
  (`RoleSwitcher.tsx:113`), and the explanation behind it itemises what will be
  asked for as a checklist rather than a paragraph, for the reason given at
  `:284`: a checklist "can be CHECKED, which is what somebody deciding whether
  to start actually wants to do".
- The sheet never lies about what an account holds. "Not set up" on a row is
  the truth and looks different from a row that is set up (`:230`).

## 5.8 What has to change in the code

| File | Change |
| --- | --- |
| `apps/web/src/lib/mode.constants.ts:10` | `Mode` becomes `personal | working`; `isMode` accepts `agent` as legacy |
| `apps/web/src/lib/mode.ts:17` | `getMode` normalises `agent` to `working`; new `getWorkspace()` reads `nf_workspace` |
| new `apps/web/src/lib/workspaces.ts` | `resolveWorkspaces()`, RLS-bound: the caller's `agents` row, their active `firm_members`, their `businesses`, their staff role. One cached read, the `getShellIdentity` pattern (`shell-queries.ts:71`) |
| `apps/web/src/components/roles/roles.ts` | `RoleId` retires; `ROLE_COPY` becomes copy per **workspace kind** (owner, agent, firm, host, console) plus the personal row |
| `apps/web/src/components/roles/RoleSwitcher.tsx` | Becomes `ProfileSwitcher`, list built from `resolveWorkspaces()` |
| `apps/web/src/components/agent/ModeSwitcher.tsx` | Retired. Two controls doing one job is the duplication `SideSwitch.tsx:18` already complains about |
| `apps/web/src/components/app/AppRail.tsx:189` | `ProfileSwitcher` above `SideSwitch` in `nf-nav__foot` |
| `apps/web/src/components/app/MobileTabBar.tsx` | The profile island gains the sheet |
| `apps/web/src/components/app/nav-model.ts:325` | The `becomeAgent` tail row becomes "Start listing", opening the sheet on zero workspaces |
| `apps/web/src/lib/side.constants.ts:55` | `STAYS_PATHS` gains `/firm` if a firm console is separately routed; otherwise unchanged |

## 5.9 One thing to be careful about: Stays and Property are not symmetric

`buildNav` shows the agent workspace only when `!stays` (`nav-model.ts:262`),
and the comment explains why: "the mode cookie is left alone and the row returns
on the flip back" (`:258`). A profile switcher that lists a Property workspace
while the reader is on the Stays side either has to flip the coin for them or
show them a row that does nothing.

**Recommendation: selecting a workspace on the other side flips the coin too**,
through the existing `useSideFlip` (`SideFlip.tsx`), so the transition is the
product's own signature animation rather than a jump. The sheet says so on the
row: "Sunrise Apartments, Stays" with the side named. One control, two cookies,
one animation, and the reader watches it happen.

## 5.10 The single source of truth, and every surface that must read it

**The precedent already exists and works.**
`apps/web/src/lib/trust/verification.ts` is one file of data read by five
surfaces: the console (`admin/agents/page.tsx:6`), the agent's own ladder
(`agent/verification/page.tsx:13`), the public standards page
(`(site)/standards/page.tsx:10`), the in-product docs
(`(site)/docs/chapters.tsx:7`) and the specs
(`lib/trust/agent-badge-derivation.test.ts`). Its header states the reason
(`:5`): a ladder whose public description and internal checklist are written
separately ends up promising something the reviewer never looked at.

**And the drift it prevents is already visible where it is absent.** The AI
assistant's system prompt at `apps/web/src/app/api/assistant/route.ts:123`
tells every user that the ladder is "phone, then identity document, then
address, then a physical inspection of the property". The ladder is identity,
address, payout, in person (`verification.ts:19`). There is no phone rung and
there never was; the payout rung, which is the strongest automated check the
platform has, is missing from what the assistant says. One hardcoded paragraph,
already wrong, already shipped.

**Recommendation: one new module, `apps/web/src/lib/supply/roles.ts`**, built
exactly like `verification.ts`: client-safe, importing nothing, exporting data.
It holds the role ids, the listing-role ids, the label and one-line description
of each, what each one proves and how, the document specs per role, the copy for
each rung and each dated fact, and the sentence each role's listing shows a
reader. **`docs/PRODUCT.md` section 4 is the prose source of truth** (it already
claims that job at `:6`: "Three things are the source of truth, in this order:
the code, the database, and this document"), and `lib/supply/roles.ts` is the
machine-readable one the product reads.

Every surface that must read from it, and none of them may hold its own copy:

| Surface | File | What it takes |
| --- | --- | --- |
| The switch-profile sheet | `components/roles/RoleSwitcher.tsx` | labels, descriptions, icons, setup checklists |
| The setup chooser | `app/(app)/profile/setup/page.tsx:45` | the same, as cards |
| The three forms | `components/agent/ApplyWizard.tsx` | steps per role, document specs |
| The listing wizard | `app/agent/list/ListingWizard.tsx` | the listing-role step, the mandate step, the owner fee rule |
| The listing page | `components/app/listing/ListingAgentCard.tsx` | "Listed by the owner" / "Listed by an agent" and the fee sentence |
| The card and map pin | `components/app/listing-card-model.ts` | the owner-direct mark |
| The filter drawer | `components/app/filters/FilterDrawer.tsx` | the role filter's label and help |
| The agent's own ladder | `app/agent/verification/page.tsx` | the dated facts beside the four rungs |
| The console | `app/admin/agents/page.tsx`, `app/admin/kyc/` | what a reviewer is being asked to confirm, per role |
| The public standards page | `app/(site)/standards/page.tsx` | what each role's marks mean to a reader |
| The in-product docs | `app/(site)/docs/chapters.tsx` | the same, in the chapter |
| The help centre | `app/(site)/help/page.tsx:154` | **currently wrong**: it describes the six-step agent application as the only route in |
| The AI assistant | `app/api/assistant/route.ts:101`, `:123` | **currently wrong**: the ladder is misdescribed and the roles are prose |
| The dictionary | `packages/i18n/src/locales/*.ts` | every string above, in four languages. `roles.ts:39` already admits this copy is not in the dictionary yet and calls it "a real gap and it is stated rather than hidden" |
| The specs | `lib/trust/agent-badge-derivation.test.ts` is the model | a test that fails when a surface holds its own copy |

**The assistant is the one that needs a mechanism rather than a habit.** A
system prompt is a hardcoded string by nature. The fix is to build the roles
paragraph of `SYSTEM_PROMPT` from `lib/supply/roles.ts` at module load, so the
assistant's description of the ladder cannot drift from the ladder again.

---

## Honesty log

**Egress-blocked hosts.** Every `WebFetch` in this session was refused by the
network egress proxy. Blocked, by name: `lasrera.lagosstate.gov.ng`,
`pavestoneslegal.com`, `ownkey.com`, `www.mondaq.com`, `www.gelias.com`,
`www.premiumtimesng.com`, `nairametrics.com`, `oal.law`, `businessday.ng`,
`www.esvarbon.gov.ng`, `www.cac.gov.ng`. **Every Nigerian legal and market claim
in Parts 3 and 4 therefore rests on the search index's summaries of the named
pages, and is marked "(via search)" inline.** No primary source was read
directly. A lawyer should check every figure in section 3.2 and Part 4 against
the statute, the Blue Book and the LASRERA register before any of it is printed
in the product.

**UNVERIFIED.** That the Lagos Tenancy and Recovery of Premises Bill 2025 is
still a bill and not a law (reported so as of September 2026, not confirmed
against the House of Assembly record); the 5 per cent commission cap in it; the
exact LASRERA registration document set and fee schedule (the portal was
unreachable); whether LASRERA registration is required of a private landlord
letting their own property, as opposed to a practitioner (the sources address
practitioners and are silent on owners); the 2026 Lagos Blue Book percentages
(1.5 consent, 0.5 CGT, 0.5 stamp duty, 0.5 registration) and their effective
date of 1 May 2026; the 0.78 per cent tenancy stamp duty figure; whether the
ESVARBON register is publicly searchable; whether any Nigerian identity or CAC
lookup API is contracted (none is, per `docs/API_INVENTORY.md` section 6).

**Two different titling figures are quoted in section 3.2 and they do not
agree.** "Over 97 per cent of land untitled" (attributed to the Federal Ministry
of Housing and Urban Development) and "71.4 per cent of sampled landlords
without title, 8.1 per cent with a C of O" (NLSS 2018/19) measure different
things: land area against sampled landlords. Both are quoted as reported; the
design conclusion (do not require a C of O) holds under either.

**Repository claims I could not close.** `public.agent_badges` is a live table
whose `create table` is not in `supabase/migrations/`; it is evidenced only by
`apps/web/src/lib/supabase/database.types.ts:376` and by three later migrations
and three docs that reference it. `private.sync_agent_badge`, named in
`docs/HANDOFF_04_MARKETPLACE.md:154`, is likewise absent from the migrations
directory. I did not query the database to resolve either.

**Row counts are second-hand.** The 64 listings, 64 demo, 1 agent, 8 businesses
figures come from `docs/PLATFORM_SURVEY_2026-09-22.md:26`, dated the same day as
this document. Nothing was run against the database in this session.

**Not measured.** How many of the 25 files under `apps/web/src/lib/agent/` would
actually need editing for the two-role change; I inventoried the surfaces, not
the diff. The cost of the `supply_profiles` view in PostgREST embeds. Whether
`catalogue_entries` can carry `lister_role` without a rebuild (the projection is
rebuildable by design, but I did not read its rebuild function).

**Opinion, clearly marked as opinion.** The verdict in the preamble (two person
roles, not three; the firm as an entity; no fourth role) is a design judgement
from the evidence in Parts 1 and 3, not a finding. The founder may reasonably
decide that a Nigerian renter wants to see "firm" as a first-class choice in the
switch sheet, in which case the listing-level `firm` value can be surfaced as a
third card in the setup chooser without changing a line of the data model
proposed here. That is the test of whether this design is right: the three forms
survive either decision, and only the vocabulary moves.

**Not legal advice.** Nothing in Part 3 or Part 4 is a compliance opinion. The
regulatory picture is layered and partly contested, the tenancy bill is in
committee, and a Nigerian lawyer should review the role definitions, the
attestation wording and every statutory percentage before launch.

**Nothing was run against the database, no product code was modified, git was
not run, and this file is the only one written.**
