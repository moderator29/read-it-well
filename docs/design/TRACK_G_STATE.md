# Track G: what a listing says about who put it up

Written 23 September 2026, after the session that opened the name door. Every
row says what is true of the product **today**, not what is planned. Anything
resting on something this session did not independently confirm is marked
**UNPROVEN** and says why.

Track G is one rule: **a listing says which of the three kinds of supply it
came from, so a person searching can tell an owner from an agent from a firm.**
`supplyPrimer()` asserts that sentence to every user of the assistant and of
support, so it has to be true of the product and not only of the database.

---

## 0. The vocabulary, and where it lives

`apps/web/src/lib/supply/roles.ts` holds all of it, once:

| Constant | Values |
| --- | --- |
| `LISTING_ROLES` | `owner`, `agent`, `firm` |
| `LISTING_ROLE_SENTENCE` | "Listed by the owner", "Listed by {name}, agent", "Listed by {name}" |
| `LISTING_ROLE_FILTER_LABEL` | "Owner direct", "Agent", "Registered firm" |

`public.listings.listing_role` is a not-null enum on every row since Track G
migration 3. **All 64 live listings are `agent`**, and all 64 are `is_demo`.

---

## 1. The surfaces, one row each

| Surface | States the supply kind? | Correctly? | Can it? |
| --- | --- | --- | --- |
| `/listing/[id]` detail, agent card | **Yes**, all three roles | **Yes** | Yes, and it does |
| Listing card (home, search grid, featured band) | **No** | n/a | **Yes, data is ready.** Needs a founder decision on form: `GOVERNING-01` draws no slot for it |
| Map pin sheet (`MapDock`) | **No** | n/a | **Not yet.** `MapListing` is a deliberately narrow projection with no role field |
| Search filter drawer | **No** | n/a | **Not yet.** `LISTING_ROLE_FILTER_LABEL` has zero consumers and `ListingSearchFilter` has no role field. The database index exists |
| Public profile `/u/[handle]` | **No**, for a stranger | n/a | **No.** Same RLS wall the name hit, different door needed |
| Listing shared into a chat (`ChatCardData`) | **No** | n/a | **Yes, data is ready.** Same form decision as the card |
| Price Check share card | **No**, and correctly | n/a | It is about an AREA and carries no listing and no person. Nothing belongs here |
| Admin listings queue | **Yes** | Yes | Session B's surface; already reads `listerRole` through `lib/admin/reads/overview.ts` |
| `supplyPrimer()`, the assistant and support prompts | Asserts the rule | **Partly true**, see section 5 | |

---

## 2. What closed today, and how it was proved

### 2.1 The catalogue was refused to everybody, and Track G's own migration did it

`private.owns_listing(uuid)` is called by **17 RLS policies on 10 tables**
(listings, listing_photos, listing_videos, listing_amenities, listing_access,
listing_mandates, availability, reviews, agent_documents,
inspection_requests). A policy expression is evaluated **as the querying role**,
so the querying role needs EXECUTE on anything it calls.

`20260922230500_track_g_6_...` restated a rule 21 revoke over that function on
22 September. From then, `pg_proc.proacl` read `{postgres=X/postgres}` and
nothing else, and **every read of the catalogue by `anon` or by `authenticated`
raised `42501 permission denied for function owns_listing`.** Search, the
listing page, the map, the shortlist and the sitemap were dead for every reader
who was not staff.

Restored by `20260923103430`. The same migration granted `anon` the one column
privilege `listings.listing_role` never had, without which the signed-out
catalogue read still fails on the column Track G's read half selects.

**PROVED** as refusals and then as successes, on the live project, through
`apply_migration` with `set role` inside a transaction that rolls back:

- BEFORE: 8 assertions, 2 green controls (`agent_badges` and `amenities` read
  fine as the same `anon` role in the same transaction).
- AFTER: 10 assertions, 2 **opposite-shape** controls (`anon` still reads 0
  rows of `public.agents`, and is still refused `listings.supply_verified_by`),
  including a DRAFT row inserted and rolled back to prove the July failure mode
  filters rather than kills the read.

Evidence: `scripts/probes/track_g_catalogue_grants.sql` and `.log`.

### 2.2 The lister's name is published, and nothing else about them

`public.listing_lister`, added by `20260923103838`. A view, not a
SECURITY DEFINER function, and the migration argues the choice: a view's
exposure is readable from `pg_attribute` and `pg_class.relacl` for ever, where
a function's exposure is its body and no catalogue query tells you that; it has
no argument surface; the batched read shape beside `getAgentBadges` is
unchanged; and `agent_badges` already established the pattern.

**Every column it exposes, and nothing else:**

| Column | Why it is allowed out |
| --- | --- |
| `listing_id` | Already `listings.id`, already granted to `anon`, already the URL of the page the reader is standing on |
| `lister_name` | The agent's `display_name` for `agent`, the firm's `name` for `firm`, **NULL for `owner`** because that sentence names nobody by design. A display name is what a listing already implies, and it is the same name already shown in a message thread |

Not exposed, and asserted so: phone, email, address, NIN or any document
number, `user_id`, `agent_id`, `verification_tier`, `verified`, agent `status`,
`type`, `role` or `firm_id`, firm RC number, TIN, `representative_name`,
`representative_phone`. Bounded to `status = 'PUBLISHED'`, so the door opens
exactly as wide as the listing.

**Rule 21 has an exact twin here and it was handled the same way.**
`pg_default_acl` on this project grants `arwdDxtm` on every new relation in
`public` to `anon` and `authenticated`, and a non-invoker view **writes as its
owner**, so the view was born able to write to `public.agents` with RLS
bypassed. Revoked from `public`, `anon` and `authenticated` in the same
migration; SELECT granted back to the two reader roles **deliberately**,
because a stranger reading a public listing is anonymous and there is no other
role for them to be; read back inside the migration body.

**PROVED:** 12 assertions, 2 opposite-shape controls. INSERT, UPDATE and DELETE
through the view all refused to `anon`. A DRAFT publishes no name. **The same
row publishes no name as `owner` and a name as `agent`**, which is what makes
the owner assertion a measurement rather than a coincidence on an estate that
holds no owner listings. Evidence: `scripts/probes/track_g_name_door.sql` and
`.log`.

### 2.3 The card that contradicted itself

`ListingAgentCard` printed `t.catalogue.detail.agentRole`, "Agent on Vallo", as
the name fallback for **every** listing whatever its role. On an owner's
listing that put "Agent on Vallo" directly above "Listed by the owner".

The fallback now matches the role, and where a role has no honest noun it
prints nothing:

| Role | Heading when no name reaches the card |
| --- | --- |
| `agent` | the agent noun, which is exactly what that listing is |
| `owner` | **nothing**. No honest noun that is not a repeat of the line below |
| `firm` | **nothing**. We know it is a firm, not WHICH firm, and a generic "registered firm" would borrow a trust word for an unchecked claim |
| absent | the agent noun, **unchanged**: absent is the pre Track G state |

The rule lives in `components/app/listing/lister-role.ts` rather than in the
component, because nothing that imports a `.tsx` file can be tested under this
vitest config and a rule that can only be grepped for is a rule that drifts.

**PROVED** two ways. Unit: `lister-role-line.test.ts`, and the rule was
**mutated back to the old behaviour first** and two assertions failed, so they
bite. On a screen: `scripts/probes/track_g_the_sentence_on_a_screen.mjs` reads
the rendered DOM and asserts the **negative**, that the agent noun appears
nowhere on an owner's card, reading the noun off the page's own
`data-agent-noun` rather than holding a copy of the words.

---

## 3. UNPROVEN, and exactly why

**The real `/listing/[id]` against live data has NOT been rendered in this
session.** This container's egress proxy refuses
`CONNECT uccixoonmbhrnyczyigt.supabase.co:443` with **403**, so the dev
server's Supabase client cannot reach the project at all, every listing read
returns null, and `/listing/[id]` answers **the not-found body at HTTP 200**.
That was measured, not assumed: the page was fetched, the DOM was read, and
`main` contained "This page has checked out".

So the evidence for Track G is in three parts and each one says what it is:

| Half | Where it was proved | Strength |
| --- | --- | --- |
| The database | LIVE project, as `anon` and as `authenticated`, rolled back, with controls | Strong. This is the real thing |
| The read, row to domain object | `lister-role-read.test.ts` over a real row shape | Strong for the mapping. Says nothing about the network |
| The screen | `/preview/track-g`, the REAL component with fixture props | Proves the copy and the composition. **Does not prove the read carries a name** |

**The join between them, live, is UNPROVEN from this box and needs a browser
that can reach the deployment.** `mcp__Vercel__web_fetch_vercel_url` was tried
against both the production alias and the latest production deployment and
answered "could not be found, or your Vercel connection may not have access to
it", so that route is closed here too.

The one thing that would close it: open one production listing page in a
browser after the next deploy and read the agent card. It should now show the
agent's name as the heading and "Listed by <name>, agent" under it, on all 64
rows.

**Also UNPROVEN:** that main is green. Every suite run in this session was in
the shared worktree with five other workers' edits in it, which per ledger
section 61 is a statement about that tree and not about main.

---

## 4. Not done, with the reason and the cost

### 4.1 The listing card does not say it, and the governing image draws no slot

The data is ready: `Listing.listerRole` and `Listing.listerName` reach every
surface that takes a `Listing`, which is the card, the featured band, the home
rail and the chat share card.

**It was deliberately not added.** `GOVERNING-01-switch-home-sheet-drawer.png`
draws the featured property card as: photo with the Verified mark, title,
locality, price and a facts row. **There is no lister line on it.** The
standing rule at the top of `docs/design/references/roles/README.md` is that
the images govern form, and adding a line the governing image does not draw is
inventing a slot rather than matching one. The card is also already dense at
390px: title, locality, price, a facts row and a power sub-line.

What it needs: the founder's word on whether a supply line belongs on the card
and, if so, in what form. The sentence form ("Listed by the owner") is long for
a card; `LISTING_ROLE_FILTER_LABEL` is the short form and was written for the
filter drawer, so using it on a card is a decision and not a shortcut.

### 4.2 Nobody can filter by supply kind

`LISTING_ROLE_FILTER_LABEL` has **zero consumers** anywhere in the tree. There
is no role field on `ListingSearchFilter`, no URL parameter, and no control in
the filter drawer. **The database is ready and the product is not:** Track G
migration 3 created the index `(listing_role, listing_intent, state_code,
city)` for exactly this query.

This is the single largest remaining gap against the Track G brief. "A person
searching can tell them apart" is weaker than "a person searching can ask for
only one of them".

### 4.3 A stranger cannot see what kind of supplier a profile is

`app/(app)/u/[handle]/page.tsx` already records it: the agent tabs need an
`agents` row, and `agents` is select-own plus admin, **so they resolve for the
agent themselves and for nobody else.** A stranger visiting an agent's profile
falls back to the member profile.

That is the same RLS wall the listing sentence hit, and the fix is the same
SHAPE but a different door: a published projection keyed on the profile rather
than on the listing. `listing_lister` cannot serve it, because it is keyed by
`listing_id` on purpose so that the door opens exactly as wide as a listing.

### 4.4 The map pin sheet

`MapListing` is a deliberately narrow projection, and its own doc comment says
why: it crosses the server to client boundary on every map render. Adding a
role costs one enum per pin. It is cheap, and it waits on 4.1, because a docked
card and a grid card must not disagree about whether the supply kind is shown.

### 4.5 Two lines on the agent card that were left alone, and why

- **"Manages this listing on Vallo"**, the unverified caption, is a hardcoded
  English string in a component that otherwise reads the dictionary. It is a
  pre-existing i18n debt, it is not false for any of the three roles, and
  replacing it means adding a key in four locales to a namespace two other
  sessions also write. Named rather than churned.
- **The named agent card repeats the name**: "Chidi Okeke" as the heading and
  "Listed by Chidi Okeke, agent" under it. That is what the three sentences and
  the render's composition produce together. Rewriting the sentence to avoid it
  would put a second copy of the vocabulary somewhere, which is the rule this
  whole module exists to hold. A form question for the founder.
- **A firm listing whose `businesses` row has no name publishes no supply kind
  at all**, because `LISTING_ROLE_SENTENCE.firm` is "Listed by {name}" and
  `fillLister` correctly refuses a bare template. Defensive only in practice,
  since a firm listing must carry a `firm_id` by constraint.

---

## 5. Is `supplyPrimer()`'s sentence true of the product now

> "A listing says which of the three it came from, so a person searching can
> tell them apart."

**Half true, and the honest reading is this.** On the detail page a reader now
gets all three, named, for the first time: owner shipped this week, agent and
firm ship with the name door. **On the surfaces a person actually SEARCHES
with, the card and the map and the filter drawer, it is still silent**, so
somebody scanning results cannot tell them apart until they open one.

The sentence is not withdrawn, because the claim it makes is about the listing
and the listing does now say it. But it should not be read as a claim about
search until 4.1 and 4.2 land, and this section exists so that nobody reads it
that way.

---

## 6. Two findings this session that are not Track G, recorded where they were found

1. **`public.businesses` hands `anon` a table-wide SELECT.** `pg_class.relacl`
   reads `anon=arwdDxtm`, and `businesses_select_published` lets an anonymous
   caller read **every column** of every published business: `cac_number`,
   `tin`, `representative_name`, `representative_phone`, `email`, `phone`,
   `address`, `review_notes`, `reviewer_id`, `consents`, `verification_tier`.
   Today nothing leaks, because all 7 published rows have those columns null
   (counted, not assumed). **The moment a firm registers through the Track G
   firm door, its RC number, its TIN and its representative's phone become
   world readable.** `public.listings` already shows the correct pattern on the
   same estate: a column-by-column grant, 64 entries in `pg_attribute.attacl`,
   with `address`, `landmark`, `review_notes` and `reviewer_id` held back. This
   was found because a probe control failed and the control was right.
   **Not fixed here:** narrowing it is a revoke, revokes are on the stop list
   without the founder, and it is not Track G.

2. **Three more policy callers are short a grant**, same shape as the outage in
   2.1 but latent: `private.attachment_path_access(text)`,
   `private.can_see_listing_access(uuid)` and
   `private.escrow_evidence_path_access(text, boolean)` are each executable by
   `authenticated` and **not** by `anon`, while the policies that call them
   apply to PUBLIC. Any anonymous statement that reaches those tables raises
   42501 rather than returning no rows. No shipping path does today. Recorded
   rather than granted, because widening a grant nobody asked for is the
   mistake in the other direction.

---

## 7. How to re-run every proof in this file

```
# the database halves, one block at a time, through apply_migration
scripts/probes/track_g_catalogue_grants.sql     # before and after, 8 + 10 assertions
scripts/probes/track_g_name_door.sql            # 12 assertions

# the unit halves
cd apps/web && npx vitest run \
  src/lib/listings/lister-role-read.test.ts \
  src/components/app/listing/lister-role-line.test.ts

# the screen half
cd apps/web && npx next dev -p 3210          # in one shell
node scripts/probes/track_g_the_sentence_on_a_screen.mjs \
  --base http://localhost:3210 /preview/track-g
node scripts/verify-shots.mjs --base http://localhost:3210 /preview/track-g
node scripts/verify-shots.mjs --light --base http://localhost:3210 /preview/track-g
```

Shots are filed in `docs/design/proofs/g-track/`.
