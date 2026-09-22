# HANDOFF 09: the direct platform

**Written 22 September 2026 by the planning session, on the founder's ruling of
the same day. This is the THIRD live brief and it does not replace either of
the others.**

- `docs/HANDOFF_05_UPGRADED_WIDE_PLATFORM_BUILD.md` is the standing build brief:
  the backend B0 to B7 and the image driven frontend sweep F1 to F5.
- `docs/HANDOFF_08_THE_NEW_WEEK.md` is the fix and harden brief: nobody leaves
  Vallo, the emails, the notifications, the store refusals, the interface
  uniqueness, light mode, and the design drift.
- **This file is the direction change.** It alters what Vallo IS, not only what
  it does. Where it contradicts either of the others, this one wins, and the
  contradiction is named here rather than left for somebody to discover.

**Read this file whole before you plan. Then read the three research files it
rests on, in this order:**
`docs/research/ROLE_ARCHITECTURE_RESEARCH.md`,
`docs/research/VALUATION_ENGINE_RESEARCH.md`,
`docs/research/ESCROW_END_TO_END_RESEARCH.md`.
Every one of them carries an honesty log naming what its agent could not
verify. Read those logs. They tell you what you must prove yourself before you
build on it, and in two places they name things a lawyer must confirm before a
single string ships.

---

## 0. What changed, and why

The founder's co-founder made an argument and the founder agrees with it. In
his words: most Nigerians would deal DIRECTLY with the landlord if they were
given the option, because the current experience is agent fees stacked on
agent fees, chains of agents on one property, scattered listings and unclear
costs. He calls it **the runaround**. He also argued that "Real Estate
reimagined" tells a first time visitor nothing about what Vallo helps them do.

Both are correct, and acting on the first one changes the shape of the
platform, because today the supply side of this product has exactly one shape:
an agent.

**Vallo is not anti-agent.** Agents hold most of the supply in this market and
a platform that insults its own suppliers on its front page has no supply. The
position is narrower and truer than that: **Vallo does not remove the agent, it
removes the runaround.** You always know who you are dealing with, what you
will actually pay, and whether the property is real.

---

## 1. The thesis: three ideas that are one system

Three things arrived together and they are not three features. They need each
other, and building any one of them alone wastes most of its value.

1. **Direct from owner** removes the fee and the chain. That is the promise.
2. **Escrow** is what makes the promise safe to accept. Take the agent out of a
   Nigerian rental and you remove the only thing standing between a tenant and
   a man who collects two years rent and disappears. Something has to take his
   place. Escrow is that thing.
3. **Price Check** is how the owners arrive. A person who types an address to
   see what their flat is worth has just told us they own property and are
   thinking about money. They are one tap from listing it.

So the loop is: the estimate brings the owner in, the direct model is why they
stay, and escrow is why the tenant trusts it. Supply is the single thing this
platform most lacks, with 64 listings that are all examples and zero
transactions ever. **This loop is the supply strategy.** Build it as one.

---

## 2. The words

### 2.1 The headline, founder approved

> **Rent, buy or stay.**
> **Without the runaround.**
>
> Verified homes, land, hotels and shortlets across Nigeria. See what you will
> actually pay before you call anybody, and deal with the owner directly where
> there is one.

Three things about it are deliberate and none of them is a preference.

**No umbrella noun.** "Space", "place" and every other word that tries to
cover homes, land, hotels, shortlets, offices and restaurant tables in one
syllable is vague by construction. The verbs are concrete, and they are
already the product: the landing search control says Buy, Rent, Stay. **The
headline and the control now say the same three words**, so the headline
teaches the control and the control proves the headline. Keep them in step for
ever; if one changes, the other changes in the same commit.

**Nigeria, not Africa.** We are in Bwari with 64 example listings. Claiming a
continent is exactly the puffery the headline exists to escape. The word
changes when the fact changes.

**The supporting line names the only two things no competitor can say.** Every
portal claims verified listings and search by price. Nobody publishes the
agency fee, because hiding it is how they earn. Those two clauses are the
position, so they are load bearing copy, not decoration.

### 2.2 The ghost in the search control

`components/site/landing/SearchPill.tsx:33` declares three segments.
`app/css/landing.css:927` declares `repeat(4, minmax(0, 1fr))`. The empty
fourth track takes about 79.5px at 390px, roughly twenty three per cent of the
control, and it is **the corpse of the Invest segment**, which was removed from
the component because Vallo sells no investment product. The comment at the top
of that same file still explains why Invest went. Nobody removed it from the
CSS, and the whole thing switches to flex above 640px, which is why every
desktop review missed it for weeks.

Drive the count from `ORDER.length` through a custom property, the way
`.nf-glass-seg` in `app/social.css:588` already does, so the track count can
never again disagree with the segment count. This is also HANDOFF 08 section
6.5; it is repeated here because it is the founder's own front page and he has
now seen it.

### 2.3 Where the words live

Copy this new is going to be edited. It goes in the dictionary in all four
locales like everything else, never inline, and the landing page reads it from
there. `docs/research/UNFINISHED_WORK_AUDIT.md` found 727 user visible strings
in 167 files that never reached the dictionary: do not add to that number.

---

## 3. Track G: the supply roles

**The full design is `docs/research/ROLE_ARCHITECTURE_RESEARCH.md`, five
parts. This section is the ruling and the reasoning. Do not start without
reading that file.**

### 3.1 The ruling

**Two person roles on the property side: OWNER and AGENT. Host stays exactly as
it is on the stays side. There is no third person role.**

The founder's instinct was three, and it was right about the thing that
matters, which is that there are **three different onboarding forms**. It was
one layer too high about where the third one lives. The evidence:

- A firm's proof set is a **superset** of an individual agent's: identity and
  mandate, plus incorporation and proof of association. A superset is a branch
  inside a form, not a separate role, and this codebase already implements
  exactly that branch in two places (`components/verification/kyc.ts:149`
  `stepsFor(business)`, and `lib/agent/application.ts:132`).
- Owner and agent are kinds of **person**. A firm is an **organisation**.
  Listing all three side by side is the same category error as putting Stays
  beside personal and agent.
- A firm is already modelled. `businesses.kind` carries `'agency'` and
  `business_verification_checks` already has a `registration` rung. A third
  person role would duplicate an incorporation ladder that exists and works.

**But three values belong at the LISTING level**, as `owner | agent | firm`,
because "listed by the owner", "listed by Chidi Okeke, agent" and "listed by
Acme Properties Ltd" are three different offers, and telling them apart is the
whole point of the exercise for the person searching.

**No fourth role, now or later.** A developer's relation to what it sells is
*owner* plus an off plan disclosure, and `build_condition = 'off_plan'`
already exists. A property manager's relation is *agent* with a management
mandate. Both are a mandate kind and a flag, and adding them later costs
nothing.

### 3.2 The structural finding that decides the schema

`agents.user_id` is `not null unique`. So a role column on a person makes the
founder's own example, a man who owns one flat and agents another,
**unrepresentable**. That is not a limitation to work around, it is the model
being wrong.

**Ownership is not a property of a person. It is a property of a pair: a
person and a property.** This codebase already reached the same conclusion
about a neighbouring problem and wrote it into a migration comment: the
verified badge has always meant the AGENT passed checks and has said nothing
about the PROPERTY.

So build **both axes**:

- **Person**: `agents.role`, `agents.firm_id`, and a `firm_members` table.
- **Pair**: `listings.listing_role`, a `listing_mandates` table, and ownership
  documents keyed to `listing_id`.

And **three badges for three subjects**: the person (`agents.verified`,
unchanged), the business (`businesses.verified`, already built), and the
property (new dated stamps beside the existing `address_verified_at` and
`physically_inspected_at`).

**Do not add a rung to the four rung person ladder.** `private.agent_tier`
counts over a fixed array that five surfaces read, so inserting a rung
renumbers everybody's tier silently. The research file says where the new
proof attaches instead.

### 3.3 What "agent" actually means in this codebase

Roughly **one part in ten** of the machinery named "agent" is genuinely about
intermediation. The other nine parts, `owns_listing`, the listing wizard, the
four rungs, suspensions, payouts, badges, all twelve workspace routes, and
`conversations.agent_id` which is really an `auth.users` id, are supply side
logic wearing an agent's name.

**That is good news.** Most of this change is renaming and generalising what
exists, not writing it again. Do the rename honestly and completely, and record
in the ledger which of the twelve workspace routes turned out to be genuinely
agent specific.

Three role vocabularies in the tree already disagree with each other:
`roles.ts:48` (`renter|owner|professional` mapped onto `agents.type`),
`public.signup_role` with five values that the code says "confer nothing", and
`verification_is_required`, which gates verification on that self declared
enum. Today a landlord and a one person agency are the same database row and
are told on screen that they are different things. Collapse the three
vocabularies into one.

### 3.4 The three forms, and the fact that shapes the owner one

**Over ninety seven per cent of Nigerian land sits outside the formal
register. The national survey found 71.4 per cent of sampled landlords hold no
title document at all, and 8.1 per cent hold a Certificate of Occupancy.**

So a form that requires a C of O excludes roughly **nine owners in ten**, which
would destroy the supply side this entire brief exists to build.

**Therefore: "I have none of these" is a first class answer.** It reaches a
published listing. It simply never earns the words "ownership verified". The
ladder is dated, honest and visible: identity checked, address checked,
documents seen, physically inspected. A rung not reached is drawn as not
reached, with what it would take, never hidden and never implied.

The three forms, field by field, are specified in part 3 of the research file.
Build them from there. The governing sentence, which goes at the top of each
one in the ledger: **the form differs because the proof differs, and the proof
differs because what can go wrong differs.**

Two Nigerian facts the forms must carry, both marked in the research file as
resting on search summaries rather than primary documents, so **a lawyer
confirms them before any of it becomes product copy**: LASRERA registration is
mandatory for Lagos agents with penalties to ₦250,000 for an individual and
₦1,000,000 for a company, and it is recorded as a field plus a dated
attestation plus a search filter, never as a hard gate that would empty the
supply side. And mandate verification's only real check is a call back to the
named principal, because the document itself is a photograph.

### 3.5 The switch

**Role is not a fourth switch. Role is what MODE resolves into**, and
`roles.ts:190` `roleStateFrom(agent, mode)` already does exactly that. What is
missing is one bit of state.

There are three axes and they must never be confused:

1. **Side**, Property or Stays: the coin. What you are browsing. **Untouched.**
2. **Mode**, personal or working: whether you are using the platform or running
   a business on it.
3. **Role**, owner or agent or host: who you are when working.

The contract: `nf_mode` becomes `personal | working`, reading the old `agent`
value as legacy, plus a new `nf_workspace` key that is **opaque and never
authoritative**. `sideOfPath` and the coin do not move.

One "Switch profile" sheet, above the coin in `nf-nav__foot`, listing Personal,
then each workspace held, then "Add a workspace" which opens the role chooser
and then the matching form. **Pending, not approved and suspended rows are all
selectable and honestly labelled, never hidden**, because a person whose
application was refused must be able to see that it was refused.

**View preference is never authorisation.** Standing on the Owner desk must
never be what permits an owner action. The database decides, every time. The
research file names five specific places where this bites.

### 3.6 One source of truth

The AI assistant at `api/assistant/route.ts:123` already tells users the
verification ladder is "phone, identity, address, physical inspection". The
real ladder is identity, address, payout, in person. **There is no phone rung,
and the payout rung, which is the only automated one, is missing from what the
assistant says.** That is what drift costs.

Build `lib/supply/roles.ts` as the single source of truth, with
`docs/PRODUCT.md` section 4 as the prose source, and make all fifteen surfaces
named in the research file read from it: the assistant, the onboarding copy,
the help centre, the badges, the listing labels, the filters and the rest. A
second copy of this vocabulary anywhere is a defect.

### 3.8 The images for this track are in the repository, and they govern

The founder is generating a reference set for this track with the same tool
that produced the existing sixty one references. **They land in
`docs/design/references/roles/`, every governing one prefixed `GOVERNING-`.**

The set covers: the switch profile sheet, the add a workspace chooser, the
owner form, the agent form, the firm branch, the two workspace desks, the three
listing labels as they appear in search results, the full cost block, and a
small number of **light mode** targets, which this product has never had for
any surface.

**These images are the target and the rule is the founder's standing one:
almost identical if not identical.** `docs/DESIGN_DIRECTION.md` governs how to
match them, including the translation rules for any off brand detail a render
carries.

**First hour job for whoever owns this track: index
`docs/design/references/roles/` into `docs/design/CATALOGUE.md`, and index
`docs/design/references/founder/` at the same time**, because that older folder
holds eleven of the founder's own corrective targets, five of them GOVERNING,
and the catalogue has never mentioned it. See HANDOFF 08 section 8B.3. A
founder target beats a generated render, always.

**If the folder is empty when you start, build to this brief and to the
register, and leave the surface easy to re-match.** Do not wait for images, and
do not guess at a layout the brief does not describe.

### 3.7 This is the last cheap moment

64 listings, all examples. One agent row, the example lister. Zero bookings.
**Migration risk is as close to nil as it will ever be.** Every week of delay
makes this change more expensive and there is no version of the plan where it
gets cheaper.

---

## 4. Track H: what you will actually pay

This is the cheapest high value work in this entire brief, and most of it is
already written.

### 4.1 The component that is already built and is not on the screen

`components/app/listing/ListingMoveIn.tsx` is 161 lines holding the full move
in cost breakdown behind a disclosure. **Nothing imports it.** Verified: the
only references anywhere in the tree are its own export line and two
documentation comments in `lib/rent/ledger.ts`.

What is actually live at `listing/[id]/page.tsx:841` is
`ListingMoveInBlock.tsx`, which shows **one number and no breakdown**.

So the honest cost breakdown exists, is correct, has tests behind it, and is
not on the screen. Put it on the screen. That is the single cheapest win in
this handoff and it is the visible proof of the new headline.

### 4.2 Search cannot sort on the honest number

`SORTS` in `lib/listings/search-params.ts:46` has exactly four keys,
`recommended`, `top-rated`, `price-asc`, `price-desc`, and every one of them
reads the headline price. Verified.

`listings_move_in_cost_idx` exists in the database and **nothing queries it**.

So a renter with ₦6,000,000 is being shown ₦4,500,000 flats that need
₦7,000,000 to move into. Add the sort, make it read the index, and make the
filter state say plainly which number it is sorting on. A silent switch between
two bases is worse than either one alone.

### 4.3 The full cost model

Every cost a Nigerian tenant or buyer actually meets, itemised and declared by
the lister before anybody picks up a phone: rent, agency fee, legal or
agreement fee, caution or damage deposit, service charge. **An owner listing
shows a zero agency fee, and that is the entire argument of this handoff made
visible in one line.**

**The sale side has no cost model at all today**: no agency, legal, Governor's
consent, stamp duty or registration columns exist. Build it.

Context for the numbers, from the research file and marked there as resting on
search summaries: customary agency in Nigeria is ten per cent, the Lagos
Tenancy Bill 2025 proposes a five per cent cap and was still in committee as of
September 2026, and reported real cases run to 37.5 per cent agency plus 37.5
per cent "legal" plus viewing fees on top. **We do not cap anybody's fee. We
publish it.** Publishing is the product.

**Honesty rule:** a cost the lister has not declared is drawn as not declared,
with the words, never as zero. Zero is a claim.

---

## 5. Track I: Price Check

**The full design is `docs/research/VALUATION_ENGINE_RESEARCH.md`, six parts.
Build from it. This section is the ruling.**

### 5.1 The name, and a word that never appears

**The feature is called Price Check.**

Under the Estate Surveyors and Valuers Act, section 16(1)(b), the offence is
using any name, title, addition or description **implying** authorisation to
practise. The offence is in the implication, not in the arithmetic. So the word
**valuation does not appear in this product at all**, except once, inside the
sentence that disclaims it.

Add the build failing lint rule the research file specifies, in the manner of
`check-css-tokens.mjs` rule 10, so the word cannot return through a future
commit. **A lawyer must confirm the section number before the disclaimer
ships**: the research agent could not reach the Act itself and read a third
party reproduction.

### 5.2 Rent before sale, and the gate

Three stages, and the second one splits:

**Stage one, now: the area report.** Not what your house is worth, but what
three bed flats in this area are asking right now. True from asking prices we
already hold, described as asking and never as sold. Beside it, the
neighbourhood power and water facts this platform collects structurally on
every listing and which nobody else in this market captures. **That part needs
no price data at all**, which matters, because of 5.3.

**Stage two, the rent estimate, sooner.** Annual rent is advertised far more
completely than sale evidence and disperses far less within a type and an area,
and one completed tenancy on our own rails produces one achieved rent.

**Stage two and a half, the sale estimate, much later.** A sale estimate needs
a sale flow this platform does not have. It does not ship until stage three has
actually run.

**Stage three, the flywheel, and it is closer than it looks.** The machinery
exists and is empty rather than missing: `bookings` already captures a priced
snapshot at booking time so later listing edits cannot rewrite history, and
`rent_payments` already records the six move in parts as stated plus the total
actually charged. **One completed tenancy is one achieved rent, which is one
more than anybody in Nigeria publishes.**

**The gate**, exactly as specified in part 3 of the research file: minimum five
comparables; an expanding radius ladder of 750m, 1500m, 3000m and no further;
exact property type and listing intent; a bedroom band of plus or minus one
that never crosses the zero boundary; 365 day recency with a 730 day hard cut;
and `is_demo = false` always.

**The range is the interquartile range of the actual comparables, scaled to the
subject. Never a fixed percentage.** Confidence is derived by a function of
count, dispersion, median age and radius, with the worst input deciding, and
**no input to it is settable from the product side**. Nine refusal states, each
with its copy and its next action.

### 5.3 The refusal is the feature

**On day one the gate refuses one hundred per cent of per property checks**,
because all 64 listings are examples and `is_demo = false` is in the
comparables predicate. That is the proof the gate works, not a bug to route
around.

It also means **stage one must carry real value on its own**, which is why 5.2
puts the area report and the power and water facts first.

And the refusal is itself a product: a refusal plus a notify me is a complete
honest experience that **also hands us a geocoded demand signal telling us
exactly where to go and recruit supply**. Price Check is the only feature on
this platform that is useful in an area where we have nothing.

### 5.4 The share rule, which is absolute

**No share artefact ever carries a specific address. Not for anybody. Not for a
person who has claimed and proven the property.**

The earlier draft of this rule allowed a proven owner to share their own
address. That was wrong, for three reasons. Ownership is not occupancy, so the
person actually at risk is the tenant, who consented to nothing. Proof of
ownership is either slow or weak, per 3.4. And cards are forwarded far past the
circle they were shared into.

Against 7,825 Nigerians kidnapped between July 2025 and June 2026, up sixty six
per cent, an address plus a naira figure is a target selection document.

**A specific property is shared in exactly one way: by publishing it as a
listing.** The share card is area level and type level. "Three bed apartments
in this area are asking ₦82m to ₦95m." The famous property variant is refused
by the same rule and needs no separate decision.

Enforce it in the schema the way this codebase already enforced a neighbouring
rule: `event_venue_kind` has no value for a private residence, and its comment
says the enum is what makes it unarguable rather than a policy somebody has to
remember. Do that here.

### 5.5 The facts the user gives us

**The co-founder's flow has the system identify the property's facts and the
user correct them. That inverts the honest order.** We hold nothing that maps
an address to a building, so a pre-filled guess would be four invented numbers
with the user asked to take ownership of them.

**The user states the facts.** The only place a pre-fill is honest is an
existing listing, where it is a read rather than a guess.

**Address entry is a map pin ladder, not a text field**, because there is no
geocoder in the tree and many Nigerian properties have no formal address: state,
LGA, area typeahead, draggable pin, and an optional free text line that is
stored and **never parsed**.

Two data facts that limit what stage one can say, and both need staged fixes:
`listings.area` is free text behind a two character minimum, so an area report
is only as good as a string somebody typed; and size in square metres and the
map pin are both optional with the publish gate asking for neither, so price
per square metre exists only on a self selected subset and **the coverage must
be printed beside every per square metre figure**.

### 5.6 Instrumentation, and the one lawful dataset

**Nothing in this product counts a view.** So every funnel metric this feature
needs has to be built. Use `price_check_events` as specified: a five character
geohash, **never a point and never an address**, admin read only, 24 month
retention. This is also the analytics gap named in HANDOFF 08 section 8 item 1;
build it once, for both.

There is one genuinely lawful published Nigerian government price dataset and
nobody uses it: the Lagos gazetted fair market values that assess Governor's
Consent fees, per square metre by named neighbourhood. A gazette is published
law, so citing it is lawful. It is five years stale and it is a tax base, so it
is **a floor and a sanity bound, never an estimate**. The research agent could
not obtain the gazette itself, so somebody must before it is used.

**Scraping stays forbidden**, with no conditional exceptions, and any vendor
whose data came from a crawl is refused.

---

## 6. Track J: escrow, end to end

**The full analysis is `docs/research/ESCROW_END_TO_END_RESEARCH.md`, six
parts and 2,064 lines. Read part 2 before you write a line of code.**

### 6.1 The founder has overruled two standing rules, and it is recorded here

Rule 11 of the build rules says escrow is promised nowhere. The stop list
forbids merchant of record exposure or any float. **Escrow is float.** The
founder has ruled that escrow is built fully end to end. That is his call and
it is recorded here so nobody has to guess later whether it was deliberate.

### 6.2 The gate, and it is hard

**The easiest path is the one that must never be taken by default.**

The machinery is complete enough that wiring one screen to
`escrow_fund_from_wallet` ships escrow in about a week. That path puts VALLO
SPACES LTD in custody of third party naira in its own settlement account.

`docs/HANDOFF_01_COMPANY.md:84` records that the company's first draft objects
clause included payment, escrow and wallet wording, that CAC's response raised
the minimum share capital to **₦500,000,000**, and that the objects were
rewritten to strip every payment and escrow word out. The company incorporated
with **₦1,000,000**. Line 465 of that same file already says never to add those
objects back before a licence exists.

The research agent's reading of the CBN categories is that holding customer
funds is reserved to Mobile Money Operators, with capital requirements in the
billions. **That reading rests on search summaries, because the CBN site was
unreachable from the research session.** It must be confirmed.

**So: no code path that places VALLO SPACES LTD in custody of third party funds
ships until the founder returns his solicitor's answer.** That answer is on the
founder's list. The two structures that survive are a bank or trustee holding
the funds, or a licensed provider as principal with Vallo acting as its agent.

**The same question reaches further than escrow.** The wallet already holds
customer balances. If holding customer funds is the regulated act, the wallet
is already standing in that territory and escrow only makes it larger. One
wallet with two entries exists today, so nothing is at stake yet. Say so in the
ledger and do not let it be forgotten.

### 6.3 What is built before the answer arrives, and it is most of it

Everything that is not custody. Work part 5 of the research file:

- **The nine fixes that come before any feature work**, including the dead
  brand string "Held in escrow by RentMe" that
  `public.escrow_fund_from_wallet` writes into `wallet_entries.metadata`.
- **The four functions any signed in user can call today over PostgREST**,
  `escrow_fund_from_wallet`, `escrow_confirm`, `escrow_request_release` and
  `escrow_raise_dispute`. Revoke `EXECUTE` from `authenticated` and replace
  them with guarded server actions. The other four, `escrow_hold`,
  `escrow_open`, `escrow_release` and `escrow_refund`, are already service role
  only and stay that way. **This revocation happens now and is not waiting on
  the solicitor**, because an unguarded money path with no product behind it is
  a hole whatever the eventual structure is.
- **The float is nowhere booked as a liability.** Fix it. Escrowed money is
  segregated in the books and never mixed with company revenue, which the
  append only ledger already supports.
- **The invariant that has never been asserted anywhere**: the ledger's escrow
  float equals the sum over live escrow rows. Assert it, in a test and in a
  scheduled check.
- **The nine concurrency probes**, written on the two session pattern that
  proved the oversell gate in `scripts/probes/m5_oversell.sh`. No naira moves
  until all nine pass.
- The whole product surface: the proposal in a thread, both parties' view while
  held, release, confirm, the auto release countdown, refund, dispute and its
  evidence, the admin resolution desk, receipts, and the notification and email
  at every state change, on the Track B shell from HANDOFF 08.

### 6.4 What escrow is actually for

Do not escrow everything. The research file's verdicts, per transaction: **yes
to the agency fee first**, yes to the purchase deposit through a trustee only,
**never to the purchase balance**, no to the caution deposit where an evidence
record is the better answer, no to first rent, no to the inspection fee, not
yet to stays, no to restaurant reservations.

Its argument on the direct model is worth quoting into the ledger: escrow is
the door, not the foundation, and it should be sized to that job.

---

## 6A. Track N: the supply pipeline, and the founder's own biggest worry

**Read `docs/research/LISTING_PIPELINE_AUDIT.md` in full before touching any of
this.** It audits the whole chain on both sides, from the first keystroke to a
listing appearing in search, and it opens with the two sections that matter
most: what is already built that the founder has never seen, and what is
genuinely missing.

### 6A.1 What is built, so nobody rebuilds it

**The property listing wizard is serious.**
`apps/web/src/app/agent/list/ListingWizard.tsx` is 2,264 lines. It does NOT use
tick boxes for light and water: somebody deliberately replaced them with
enumerations, and `listings-schema.ts:351` says why, that a tick box cannot
tell a Band A feeder apart from a generator. So a lister states their power
grid band, backup type, backup hours, water supply as treated mains or borehole
or none, and whether the meter is prepaid. Fifteen amenity chips. Photos to a
`listing-photos` bucket with a cover. Video at 50MB with a `listing_videos`
table and a check constraint. Status already runs DRAFT, MORE_INFO_REQUIRED,
REJECTED, APPROVED, PUBLISHED. Admin already has `listings`, `moderation` and
`reference` desks.

**Finish it and make it reachable. Do not rebuild it.**

### 6A.2 Why the founder cannot see it, which is the real defect

`apps/web/src/app/agent/list/page.tsx` has three honest states: an approved
agent gets the seven step wizard, and everybody else gets a pitch and a route
to apply. The navigation offers "List Apartment" only to approved agents;
everybody else sees "Become an agent" pointing at `/profile/setup`.

**There is exactly ONE `agents` row in the entire database and it is the
example lister.** So the founder and his co-founder are signed in, are not
agents, and the product is correctly showing them the door rather than the
room.

**The defect is that the only door into the supply side is marked "become an
agent", when most of the supply this platform now wants is landlords who are
not agents and never will be.** That is Track G's whole purpose, and Track N
depends on Track G landing first.

### 6A.3 Corrections to the first draft of this section

Two things this handoff said before the audit ran are wrong, and both are
corrected here rather than quietly edited away.

**In-app notifications already fire.** `lib/admin/actions.ts:354` and `:477`
insert into `notifications` for all four listing decisions and all three
registration decisions. This handoff said the approval loop was silent. It is
not. **The EMAILS are silent**, which is a different and smaller thing.
`docs/research/EMAIL_AND_NOTIFICATIONS_RESEARCH.md:1775-1776` is wrong on this
same point and the audit corrects it there too.

**The stays side is not empty, it is blocked.** There IS a nine step
`HostWizard`, and **restaurants work end to end**, with the best written
publish gate in the repository. The break is narrower and worse than "not
built", and it is in 6A.4.

**And the move-in fee model is already inside the listing wizard**
(`ListingWizard.tsx:1854-1950`), summed live. Track H's remaining work is the
listing DETAIL page, where `ListingMoveIn.tsx` is still the component nothing
imports.

### 6A.4 What is genuinely missing

**1. A host can fill in nine steps and can never press send.** This is the
worst defect found anywhere in this platform and it is a hard dead end.

`lib/host/onboarding.ts:470` blocks submission when the accommodation has no
photograph. **No accommodation photo upload exists anywhere in the
application.** The table, the bucket, the RLS and the catalogue trigger are all
built; no app code writes to them. `HostWizard.tsx:690` says so in its own
words on the screen: photo upload for properties arrives with the next host
release. So the gate demands a photograph and the product offers no way to give
it one. Every hotel and every shortlet is stopped here, permanently.

**Fix this first. It is one upload surface and it unblocks the entire stays
supply side.**

**2. Nothing ever publishes a room type.** They are inserted as DRAFT at
`lib/host/actions.ts:471` and nothing moves them on, while the catalogue reads
price, sleeps and categories from PUBLISHED room types only. **So a live hotel
projects a null price.**

**3. Nothing ever writes `room_inventory`**, and `stays_search` treats a
missing row as not offered, **so a dated hotel search returns nothing.**

Those three together are why the stays side has no supply and cannot get any.

**4. There is no listing identifier**, and the precedent exists and was never
applied: `agent_applications.reference` is already `NF-AGT-#####`, which also
carries the dead brand prefix and is renamed in the same pass.

Build it as `VL-` plus six characters from a thirty character alphabet
**excluding I, L, O, U, 0 and 1**. **Random, never sequential**, because a
sequence leaks the size of the catalogue and invites enumeration. A Postgres
column default with a retry plus a unique index, so uniqueness is the
database's promise and not the application's. Six display sites. A
`byReference` repository method. And a normaliser that short circuits the
existing `?q=` search box, so a person types the code into the field they
already use and lands on the listing, with a line above the result saying it
was found by ID.

**5. Video is built at every layer except the two a human touches.** Bucket,
table, Zod schemas, `addVideo` and `removeVideo` actions, the repository join,
signed URL batching, the CSP entry, and `Listing.videos` on the model. **Zero
`.tsx` callers and zero `<video>` elements in the entire product.** The
approval email already advertises walkthroughs that cannot be uploaded or
watched.

**6. No email fires on any listing or registration decision.**
`listingApproved`, `listingRejected` and `welcome` all exist unwired.

**7. The reviewer cannot see what the lister filled in.** `LISTING_COLUMNS` at
`lib/admin/queries.ts:779-780` omits power, water, size, toilets, access and
video. So the reviewer is judging a listing without its utilities, which is the
part of a Nigerian listing that decides whether anybody wants it.

**8. Smaller, all named in the audit.** The sale side has no cost model. The
admin queue has no pager and caps at thirty. `addPhoto` skips the storage read
back that `addVideo` performs. The photo limit says 50MB in the schema and 10MB
in the bucket. Three amenity codes exist in the interface and not in the
database. And the "Approved" copy tells a lister to press a button that only an
admin has.

### 6A.5 The chain, measured

The audit names **42 links** from the first keystroke to a card in search:
**32 sound, 5 weak, 5 missing.** None of the five missing is an architecture
failure. Every one is a last mile where the table, the action, the policy and
the index all exist and nobody built the control or the call site.

**The stays chain, by contrast, breaks at link 14.**

That is the honest answer to the founder's question about whether frontend,
backend, architecture and database are connected. On the property side they
are, and the gaps are call sites. On the stays side they are not yet joined.

### 6A.6 The order

1. Accommodation photo upload, because it unblocks every hotel and shortlet.
2. Publish room types and seed room inventory, because without them a hotel
   that does get through shows no price and cannot be found by date.
3. The listing reference, end to end.
4. Wire the four emails.
5. Video, with a resumable upload, because 50MB on a Nigerian connection will
   not survive a single POST.
6. The utilities on the admin card.
7. `ListingMoveIn` on the listing detail page.
8. The misleading approved copy.

---

## 6B. Track O: the switch, its placement, and both sides

The founder has ruled where it lives, and it is two places.

**In the bottom navigation, as the CENTRE slot**, raised, and visually the most
important control in the bar, carrying the coin. The five slots today are Home,
Search, Feed, More, Profile: the centre becomes the switch and the displaced
item moves. Decide which and write the reason in the ledger.

**And in the side drawer**, as a "Switch profile" row near the foot above the
theme row, showing the current profile and a chevron.

**Both open the same sheet. One sheet, two entrances.**

**The Stays side gets its own**, in the same two places, opening the same
sheet, whose "Add a workspace" chooser offers three different doors on that
side: we are a hotel, I run a shortlet, we are a restaurant.

**Six registration processes across the two sides, and six creation flows
behind them.**

Section 3.5 still governs all of it: role is not a switch of its own, it is
what MODE resolves into; the coin keeps doing only what it does now; and view
preference is never authorisation.

---

## 7. Founder gated, and what is not

**Gated, and named in the founder's own list:** the solicitor's answer on
custody, which gates only the custody path in 6.2; the bank and accountant
conversations; the lawyer's confirmation of the ESVARBON section number before
the Price Check disclaimer ships, and of the NDPA sections and the LASRERA and
tenancy figures before any of them becomes product copy; and the Lagos gazette
itself before its numbers are used.

**Not gated, which is nearly everything:** the roles, the forms, the switch,
the fee transparency, the whole of Price Check stage one, the Price Check
refusal machinery, and every escrow item in 6.3. Build all of it. Nothing in
this handoff waits on a founder answer except the four things named above, and
each of them blocks one narrow thing rather than a track.

---

## 8. Order, because there is a date

The founder is aiming to be live before the tenth of next month, on a budget
that does not stretch to everything at once. **This order exists so that each
stage is launchable on its own rather than everything being half done on the
tenth.** If you must drop something, drop from the bottom, and say in the
ledger what you dropped.

1. **Track H in full.** It is days, not weeks, most of it is already written,
   and it is the visible proof of the new headline. Start here.
2. **The headline and the search control ghost.** Hours.
3. **Track G.** The roles, the forms, the switch, the single source of truth.
   This is the largest piece and it is the positioning, and 3.7 says it only
   gets more expensive.
4. **Track J's 6.3 list**, everything that is not custody.
5. **Track I stage one**, the area report and the refusal with notify me,
   including the instrumentation, which HANDOFF 08 also needs.
6. **Track I stage two**, the rent estimate, when the gate can actually pass.
7. **Track J custody**, when and only when the solicitor has answered.
8. **Track I stage two and a half**, the sale estimate, after launch.

---

## 9. Definition of done

1. The headline ships in all four locales from the dictionary, the search
   control has three tracks for three segments, and a test asserts the two
   counts cannot diverge.
2. A person can hold owner and agent standing at once, on different properties,
   and the database represents it without a special case.
3. Three onboarding forms exist, and an owner with no title document reaches a
   published listing without any surface claiming their ownership is verified.
4. Every listing declares what a person will actually pay, the breakdown is on
   the screen, and search can sort on it.
5. The switch profile sheet lists every workspace a person holds, including the
   refused and suspended ones, and no workspace selection ever authorises
   anything.
6. One vocabulary for roles and rungs, read by all fifteen surfaces, and the
   assistant stops describing a ladder that does not exist.
7. Price Check ships under that name, the word valuation appears nowhere but in
   its own disclaimer, a lint rule holds it there, the gate refuses honestly,
   and no share artefact anywhere carries an address.
8. Escrow's nine probes pass, the float is booked as a liability, the invariant
   is asserted, the four functions are revoked, and no custody path is live
   without the solicitor's answer recorded in the ledger.
9. `docs/BUILD_07_LEDGER.md` carries all of it, and the close out tells the
   founder plainly what is live, what is proven, and what still needs his word.

**The bar has not moved and it now has a sentence: Vallo does not remove the
agent, it removes the runaround. Everything in this file is that sentence made
real. Build it.**
