# RentMe

Read this first. It says what the product is, who it is for, what a listing is,
who can do what, and which words we use. Everything else in `docs/` is detail
underneath it.

Three things are the source of truth, in this order: the **code**, the
**database**, and **this document**. Where a fourth document disagrees with any
of them, the fourth document is wrong. Where this document describes something
the code does not do yet, it is marked NOT BUILT and the work is in
`RECOMMENDATIONS.md`.

Last verified against the code and the live Supabase project
`uccixoonmbhrnyczyigt` on 2026-08-09.

---

## 1. What RentMe is

**A Nigeria first property marketplace for renting, buying and selling, with a
social layer, a naira wallet, escrow and a verification ladder.**

Everything on the platform was listed on the platform by a real person who
applied, was verified and was approved. There is no third-party inventory, no
Google Places feed, no hotel rate aggregator and no scraped stock. That is not a
gap, it is the whole argument: it is the only reason the verified badge, escrow
and an inspection can mean anything.

The product is mid pivot. It was NaijaFinds, a discovery, stay, food and
experience platform. It is RentMe. The parts of NaijaFinds that survive do so
because a Nigerian looking for a place to live also eats, travels and stays, and
because a hotelier or a restaurateur listing their own venue is a supplier like
any other. What does not survive is anybody else's inventory.

## 2. What it offers

| Market | What happens | Money |
|---|---|---|
| **Rent** | Annual tenancy. Message the agent, inspect the property, then pay. **No Reserve button, ever.** | Priced per year |
| **Buy and sell** | A property offered for sale, enquiry and inspection, then a transaction. **NOT BUILT.** `public.listings` carries no sale price and no sale intent | Not modelled |
| **Stay** | Nightly lodging: hotel, apartment, shortlet, villa, home. Reserve, hold, pay | Priced per night |
| **Eat** | A restaurant lists itself. A guest requests a table, the venue accepts or declines | Per head. No deposit, by design |
| **Around** | The social layer. Places, posts, stories, people, the assistant answering in comments | Free |
| **Wallet** | A naira wallet. Fund, withdraw, transfer, pay for a stay | Integer kobo, append-only ledger |

**The platform charges no fees anywhere.** The ledger enforces it:
`gross = platform + agent + processor`, and platform is always zero. Copy must
never mention a platform fee. If a payment processor takes something, it is
labelled as the processor's.

## 3. Role architecture

Four roles, in `public.app_role`: `user`, `agent`, `admin`, `super_admin`. A
person can hold more than one. Roles are read through helpers in a private,
non-exposed schema, never from a client.

- **Visitor, signed out.** Should be able to read the catalogue, a listing, a
  place and a public profile. Any action that needs an account raises sign up or
  sign in. **NOT BUILT AS DESCRIBED:** `apps/web/src/middleware.ts:37-67` today
  redirects a signed-out visitor away from 22 product segments including
  `/search`, `/listing` and `/around`. See RECOMMENDATIONS N-1.
- **Member (`user`).** Books, pays, saves, messages, posts, reviews, earns member
  badges. Created by the signup trigger.
- **Agent.** Applies through `/agents/apply`, uploads identity documents to a
  private bucket, is approved by an admin, then lists property, answers bookings,
  replies to reviews and is paid to a verified NUBAN account. Climbs the
  verification ladder in `public.agent_verification_checks`.
- **Admin and super admin.** The console at `/admin`, 14 destinations. Approves
  agents and listings, works the safety queues, grants and revokes standing,
  stops and unstops agents, flips kill switches. Every privileged action writes
  an append-only `audit_log` row. The first admin arrives through
  `public.admin_bootstrap`, an allow-list the signup trigger consults. No
  signed-in user can promote themselves.

## 4. Listing taxonomy

`public.property_type` is the database enum and it is the authority. Ten values:

| Value | Market | Price period |
|---|---|---|
| `rental` | Rent | year |
| `shop`, `office`, `land` | Commercial and land, let on a tenancy | year |
| `apartment`, `hotel`, `home`, `villa`, `shortlet` | Stay | night |
| `restaurant` | Eat | per head |

`ListingKind` in `apps/web/src/lib/listings/types.ts` carries one extra value,
`experience`, which the database enum does not have. One of the two is wrong.
See RECOMMENDATIONS P-2.

A listing moves through `public.listing_status`: `DRAFT`, `SUBMITTED`,
`UNDER_REVIEW`, `MORE_INFO_REQUIRED`, `APPROVED`, `PUBLISHED`, `REJECTED`,
`SUSPENDED`. Search reads `PUBLISHED` only. Admin approval is mandatory and is
the quality gate.

Every listing also answers the two questions a Nigerian asks first, as
structured columns rather than a tick box: `power_grid` (Band A through none),
`power_backup`, `power_backup_hours`, `water_supply`, `prepaid_meter`, and
`has_estate_access` for the gate.

## 5. Trust

Four things carry the trust, and they are separate on purpose.

1. **The verified badge** is first party inventory only and it means an admin
   approved the listing.
2. **The verification ladder** is about the agent, not the listing. Rungs are
   recorded in `agent_verification_checks`; `agents.verification_tier` is the
   count of rungs passed with no gap below.
3. **Badges** are earned standing, 15 defined in `public.badges`, split into an
   AGENT ladder and a MEMBER ladder, awarded nightly by `private.sweep_badges`
   and grantable by an admin with a mandatory reason and an audit row.
4. **Escrow** is the promise that money is held until the thing happens.
   **NOT BUILT. Zero implementation. No table, no ledger hold, no release
   condition.** It is also, correctly, not promised anywhere in user-facing copy:
   `apps/web/src/app/(site)/safety/page.tsx:27` says in a comment that the page
   makes "no promise of an escrow that is not built", and it keeps that promise.
   See RECOMMENDATIONS E-1.

The standing safety rule, stated on `/rent`, on every rental detail and in first
message education: keep every chat and payment inside RentMe, deals made outside
are not protected by us, pay only after you have inspected the property. A
database trigger flags ten digit account numbers and payment keywords in
messages, listing text, reviews and posts into an admin queue.

## 6. Terminology

Use these words. Do not invent synonyms.

| Word | Means | Not |
|---|---|---|
| **Listing** | One property, venue or place offered by one agent | Property, unit, item |
| **Agent** | A verified supplier who lists | Host, landlord, vendor, seller |
| **Member** | A signed-in person who is not an agent | User, customer, guest, unless they are actually staying |
| **Guest** | A member who has booked a stay | |
| **Stay** | A nightly booking | Trip, reservation, unless it is a restaurant table |
| **Reservation** | A restaurant table request | |
| **Around** | The social layer | Feed, community, compound. A compound is a different thing in Nigerian property |
| **Place** | A named area inside Around, backed by a local government | Hub, district, neighbourhood |
| **Post** | Anything somebody writes in Around | Gist, talk, echo. The lexicon was tested and cut |
| **Story** | A picture post that expires | |
| **Standing** | Badges and trust, as a whole | Reputation, score, karma |
| **Stop** | An admin suspending an agent's ability to trade | Ban, block. Block is a member muting another member |
| **The console** | `/admin` | Dashboard, backend, admin panel |
| **Workspace** | `/agent/*` | Portal, host dashboard |

Money is always **integer kobo**, a bigint, and only `formatMoney` from
`@naijafinds/i18n` turns it into naira on screen. Never float money. Never
divide by 100 by hand.

British spelling in documentation and product copy. **Zero em dashes anywhere.**

## 7. Language and theme

Four locales ship: English, Yorùbá, Hausa and Igbo. `en` is the typed source of
truth; the other three are complete and awaiting native review. `Accept-Language`
is negotiated, plurals go through `Intl.PluralRules`.

**Dark is the default and the operating system does not override it.** Only an
explicit stored choice moves the theme. Light mode is a designed paper twin:
flat neutral canvas, white cards, neutral hairlines, brand blue only on active,
focus and calls to action. Both are real themes and both must be verified.

The brand is one blue family. Deep navy-black, dark neon blue, electric blue
glow. Anchors: base `#010118`, glow `#0C39EF`, mid `#000F98`. **No orange, amber,
gold, purple or magenta.** The only two hues outside the family are emerald for
success and rose for error; the attention state is bright cyan.

**No Google or Apple sign in.** Email and password only. **NOT BUILT AS
DESCRIBED:** `startGoogleOAuth` and `startAppleOAuth` still exist in
`apps/web/src/lib/auth/actions.ts:660` and `:664` and are rendered by
`components/auth/AuthChoices.tsx:102`, gated on `NEXT_PUBLIC_AUTH_PROVIDERS`.
See RECOMMENDATIONS N-4.

## 8. Where the platform actually stands

Counted live on 2026-08-09, project `uccixoonmbhrnyczyigt`:

```
profiles 1   user_roles 2   agents 0   agent_applications 0
listings 0   bookings 0   reviews 0   wallets 0   wallet_entries 0
transactions 0   ledger_entries 0
posts 18 (all author_kind SYSTEM)   areas 7   badges 15   user_badges 1
audit_log 4   local_governments 774   occupations 749   states 37
71 tables in public, RLS on every one
```

**The supply chain has not started.** One person has an account, holding the two
bootstrap roles. Nobody has applied to be an agent, so nothing is published, so
discovery is genuinely empty. That is correct rather than broken: the invented
catalogue of twenty-three places was deleted because twenty-two of them carried
`verified: true` with fabricated ratings on addresses that do not exist.
