# Session B build ledger

Session B's own record. The other session's ledger is `docs/BUILD_07_LEDGER.md`
and Session B does not write in it. Scope: `docs/SESSION_B_SCOPE.md`.

Every surface gets three sections before it can be called finished:
1. **The chain**: control, server action, validation, policy, table, trigger,
   notification, query, screen. Every broken link named.
2. **The comparison**: the governing image against the built page at 390px dark,
   property by property, with measured numbers.
3. **Light mode**: the same surface on paper, checked.

## 1. Profile

(pending)

## 2. Get started

(pending)

## 3. Welcome back

(pending)

## 4. Wallet

(pending)

## 5. Send money

(pending)

## 6. Admin shell, overview, operations, analytics

(pending)

## 7. Admin review desks: listings queue, listing under review, moderation, verification

(pending)

## 8. Admin money desks: money, escrow, supply

(pending)

## 9. Inspection

(pending)

## 10. The welcome email

Owner: Session B worker "email", design and words only. The send is Session
A's and was not touched.

### The chain as it stands

1. **Trigger.** A person confirms their address. Two paths do that, both in
   `apps/web/src/lib/auth/actions.ts` (Session A): the six digit code path
   (`verifyOtp({ type: "signup" })`, then `welcomeOnce(data.user.id)`) and the
   emailed link path (`exchangeCodeForSession` / `verifyOtp({ token_hash })` /
   `setSession`, then `welcomeOnce(confirmed.user.id)`).
2. **Guard.** `apps/web/src/lib/notify/welcome.ts` `welcomeOnce` (Session A):
   refuses unless `auth.users.email_confirmed_at` is set and less than a day
   old; claims the send with a conditional update
   `profiles set welcomed_at = now() where id = $1 and welcomed_at is null
   returning signup_role`, so two confirmations race on the row and exactly one
   wins; releases the stamp if nothing was sent, so a missing Resend key does
   not burn the welcome.
3. **Recipient.** `contactForUser` in `lib/email/recipients.ts`: the auth
   address and `profiles.display_name` as the name.
4. **Template.** `welcome({ name, role })`, now in
   `apps/web/src/lib/email/welcome-message.ts`, re-exported from
   `messages.ts`. The version is picked from `profiles.signup_role`
   (`renter`, `buyer`, `landlord`, `seller`, `agent`, confirmed live as the
   enum's five values) and null gets the general version.
5. **Client.** `sendMessage` in `lib/email/client.ts` (Resend REST, HTML and
   text parts), wrapped in `bestEffortEmail`, which does nothing when
   `RESEND_API_KEY` is absent.
6. **Landing.** The button goes to `/welcome`, the first run screen (Session B
   "welcome" worker, its files untouched here). Signed in: the first run, or on
   to `/home` once it has been seen. Signed out on another device: the same
   slides ending on Sign in. The line under the button says exactly that and
   nothing more.

Live DB, read only: `profiles.welcomed_at`, `profiles.signup_role` and
`profiles.display_name` exist; the enum holds the five roles. No usernames live
on `profiles`; the only handle is `social_profiles.handle` (scope request E1).

Broken links found and fixed in the template: the old landlord and seller
buttons pointed at `/agent/listings/new` and the agent button at
`/agent/apply`. **Neither route exists** (no page, no redirect), so three of
the six versions sent a new lister to a 404. Every link now resolves; the test
file walks `apps/web/src/app` and fails if any allowed route loses its page.

### What changed

- `32687e3`: pure move of `welcome`, `WelcomeData`, `SignupRole` and the one
  helper only it used into `welcome-message.ts`; one re-export line in
  `messages.ts`; no caller changed; the whole email suite green.
- `ac5e07a`: the new design and words, the tests, the proofs.

**Design.** Its own document rather than the shared `compose()`, because the
shell's closed block set cannot draw tiles, numbered plates or a lit button.
Everything comes from `theme.ts` (palette, type stack, 600 max width, 40px
card padding, lockup, sign-off, legal line) and `render.ts` (`escapeHtml`,
`appUrl`, `siteUrl`, `greetingName`, `hello`), so it is the same family as
every other message and it passes every catalogue rule in `shell.test.ts`
(tables only, one style block, ground painted three times, exactly the two
lockup images, hidden inbox line, legal line once, under 40KB: about 21KB).

Top to bottom: the lit rim (the gradient cap rule, solid electric blue for
Outlook) on the navy glass card with its blue rim; the lockup; a small
letter-spaced eyebrow "Welcome to Vallo"; a two line headline, "Hello Ada." in
white and "Make yourself at home." in quiet blue, the email's echo of the first
run's "Two worlds. / One platform."; one sentence on what Vallo is; the two
worlds as glass tiles (Property, Stays) with a lit top edge, side by side at
600 and stacked at 375; the role's opening line; "Where to begin" over a glass
panel of three numbered steps (numbered plate on a rounded rectangle, title,
one or two sentences, a text link underlined as well as coloured); the lit
button "Step inside" to `/welcome`; one quiet line under it; the calm panel
with a small round glyph and the one safety sentence; the small print outside
the card (why you got this, "Change what Vallo emails you", sign-off, legal).

No glass object icons: `shell.test.ts` holds every message to exactly two
images, and a step number in live text survives images off, costs no bytes on
a metered connection and cannot carry words in a picture.

### The copy, every version

Shared by all six (HTML and text): eyebrow "Welcome to Vallo"; headline
"Hello {first name}." / "Make yourself at home."; "Vallo is one account with
two sides to it, and you can flip between them whenever you like."; tiles
"Property: Homes to rent, buy or sell." and "Stays: Hotels, shortlets and
restaurant tables."; section "Where to begin"; button "Step inside";
"Opening this on another device? Sign in there with this same address.";
footer "You are receiving this because you created a Vallo account with this
address." and "Change what Vallo emails you". Subject "Welcome to Vallo,
{first name}", or "Welcome to Vallo" with no usable name.

The plain text of each version, exactly as rendered (proof names used; the
general version is shown with no name to show the fallback):

**Renter.**

```
Subject: Welcome to Vallo, Adaeze

Vallo

Welcome to Vallo
----------------

Hello Adaeze.
Make yourself at home.

Vallo is one account with two sides to it, and you can flip between them
whenever you like.

Property: Homes to rent, buy or sell.
Stays: Hotels, shortlets and restaurant tables.

You told us you are looking for somewhere to live. Here is where we
would start.

Where to begin
--------------

1. Search where you want to live
   Filter by area and budget. Where a listing states its total move-in
   cost, sort by that rather than the rent, because the rent is rarely
   the whole of what it takes to move in.
   Search homes to rent: https://vallospaces.com/search?market=rent&sort=move-in-asc

2. Ask, then go and see it
   Message the lister from the listing and keep your questions in
   writing. When you are ready, request an inspection and see the place
   in person before any money moves.
   Your inspections: https://vallospaces.com/inspections

3. Keep what you like
   Save homes and searches as you go, so they are waiting for you when
   you come back.
   Your saved homes: https://vallospaces.com/saved

Step inside:
https://vallospaces.com/welcome
Opening this on another device? Sign in there with this same address.

One thing worth knowing from day one: nobody from Vallo will ever ask
you to pay outside Vallo. If somebody does, report them from the
listing.

You are receiving this because you created a Vallo account with this
address.
Change what Vallo emails you: https://vallospaces.com/settings/notifications

Vallo
VALLO SPACES LTD (RC 9870413), Abuja, Nigeria
https://vallospaces.com
```

**Buyer.**

```
Subject: Welcome to Vallo, Tunde

Vallo

Welcome to Vallo
----------------

Hello Tunde.
Make yourself at home.

Vallo is one account with two sides to it, and you can flip between them
whenever you like.

Property: Homes to rent, buy or sell.
Stays: Hotels, shortlets and restaurant tables.

You told us you are looking to buy. Here is where we would start, and
the one thing we would want you to know first.

Where to begin
--------------

1. Search property for sale
   Filter by area and price, and read each listing's title before its
   photographs.
   Browse property for sale: https://vallospaces.com/search?market=buy

2. Read the title first
   Every listing for sale states the title the seller claims, or says
   plainly that none was given. We record the claim and we cannot verify
   it. Have your lawyer search it at the land registry before any money
   moves.
   How Vallo thinks about safety: https://vallospaces.com/safety

3. See it in person
   Message the seller inside Vallo, keep every answer in writing, and
   inspect the property before you commit to anything.
   Your inspections: https://vallospaces.com/inspections

Step inside:
https://vallospaces.com/welcome
Opening this on another device? Sign in there with this same address.

One thing worth knowing from day one: nobody from Vallo will ever ask
you to pay outside Vallo. If somebody does, report them from the
listing.

You are receiving this because you created a Vallo account with this
address.
Change what Vallo emails you: https://vallospaces.com/settings/notifications

Vallo
VALLO SPACES LTD (RC 9870413), Abuja, Nigeria
https://vallospaces.com
```

**Landlord.**

```
Subject: Welcome to Vallo, Ngozi

Vallo

Welcome to Vallo
----------------

Hello Ngozi.
Make yourself at home.

Vallo is one account with two sides to it, and you can flip between them
whenever you like.

Property: Homes to rent, buy or sell.
Stays: Hotels, shortlets and restaurant tables.

You told us you have property to let. Here is how it gets onto Vallo.

Where to begin
--------------

1. Register as an owner
   A few short screens about you and the property. A person at Vallo
   reads every registration before listings go up, so what people see
   has somebody behind it.
   Register as an owner: https://vallospaces.com/profile/setup/owner

2. Verify who you are
   Identity, then address, then your payout account, then a check in
   person. Each step you complete shows on your listings.
   Start verification: https://vallospaces.com/verification

3. Put the whole cost in
   When your listing goes up, state the total a tenant needs to move in,
   not only the rent. Photographs earn a viewing; a walkthrough video
   answers the questions before anybody asks them.
   Open the listing form: https://vallospaces.com/agent/list

Step inside:
https://vallospaces.com/welcome
Opening this on another device? Sign in there with this same address.

Keep your conversations and payments inside Vallo. It is the record both
sides can point to if anything is ever in question.

You are receiving this because you created a Vallo account with this
address.
Change what Vallo emails you: https://vallospaces.com/settings/notifications

Vallo
VALLO SPACES LTD (RC 9870413), Abuja, Nigeria
https://vallospaces.com
```

**Seller.**

```
Subject: Welcome to Vallo, Ibrahim

Vallo

Welcome to Vallo
----------------

Hello Ibrahim.
Make yourself at home.

Vallo is one account with two sides to it, and you can flip between them
whenever you like.

Property: Homes to rent, buy or sell.
Stays: Hotels, shortlets and restaurant tables.

You told us you have property to sell. Here is how it gets onto Vallo,
starting with the part buyers read first.

Where to begin
--------------

1. Register as an owner
   A few short screens about you and the property. A person at Vallo
   reads every registration before listings go up, so what people see
   has somebody behind it.
   Register as an owner: https://vallospaces.com/profile/setup/owner

2. State the title you hold
   Buyers read the title before the price. Name the certificate of
   occupancy, governor's consent or deed you hold, and have the document
   to hand.
   Open the listing form: https://vallospaces.com/agent/list

3. Verify who you are
   Identity, then address, then your payout account, then a check in
   person. Each step you complete shows on your listings.
   Start verification: https://vallospaces.com/verification

Step inside:
https://vallospaces.com/welcome
Opening this on another device? Sign in there with this same address.

Keep your conversations and payments inside Vallo. It is the record both
sides can point to if anything is ever in question.

You are receiving this because you created a Vallo account with this
address.
Change what Vallo emails you: https://vallospaces.com/settings/notifications

Vallo
VALLO SPACES LTD (RC 9870413), Abuja, Nigeria
https://vallospaces.com
```

**Agent.**

```
Subject: Welcome to Vallo, Chinedu

Vallo

Welcome to Vallo
----------------

Hello Chinedu.
Make yourself at home.

Vallo is one account with two sides to it, and you can flip between them
whenever you like.

Property: Homes to rent, buy or sell.
Stays: Hotels, shortlets and restaurant tables.

You do this for a living, so here is the short route in.

Where to begin
--------------

1. Register as an agent or a firm
   Tell us who you are, where you work and what you charge. Agents are
   checked more closely than owners, because you handle other people's
   property, and a person at Vallo reads every registration.
   Choose agent or firm: https://vallospaces.com/profile/setup

2. Verify who you are
   Identity, then address, then your payout account, then a check in
   person. Each step you complete shows on your listings.
   Start verification: https://vallospaces.com/verification

3. List, and state the full cost
   Once you are approved, the listing form walks you through a property
   from the photographs to the total a tenant will actually pay to move
   in.
   Open the listing form: https://vallospaces.com/agent/list

Step inside:
https://vallospaces.com/welcome
Opening this on another device? Sign in there with this same address.

Keep your conversations and payments inside Vallo. It is the record both
sides can point to if anything is ever in question.

You are receiving this because you created a Vallo account with this
address.
Change what Vallo emails you: https://vallospaces.com/settings/notifications

Vallo
VALLO SPACES LTD (RC 9870413), Abuja, Nigeria
https://vallospaces.com
```

**General (no role declared), no name.**

```
Subject: Welcome to Vallo

Vallo

Welcome to Vallo
----------------

Hello there.
Make yourself at home.

Vallo is one account with two sides to it, and you can flip between them
whenever you like.

Property: Homes to rent, buy or sell.
Stays: Hotels, shortlets and restaurant tables.

You have not told us what brought you here, and you do not need to. Any
of these is a good place to begin.

Where to begin
--------------

1. Look for a home
   Rent or buy, filtered by area and budget, with the full move-in cost
   shown wherever the lister has stated it.
   Search homes: https://vallospaces.com/search

2. Find somewhere to stay
   Hotels, shortlets and restaurant tables live on the Stays side of the
   same account.
   Open Stays: https://vallospaces.com/stays

3. Have property to let or sell
   Register as an owner, an agent or a firm. A person at Vallo reads
   every registration before listings go up.
   Register your property: https://vallospaces.com/profile/setup

Step inside:
https://vallospaces.com/welcome
Opening this on another device? Sign in there with this same address.

One thing worth knowing from day one: nobody from Vallo will ever ask
you to pay outside Vallo. If somebody does, report them from the
listing.

You are receiving this because you created a Vallo account with this
address.
Change what Vallo emails you: https://vallospaces.com/settings/notifications

Vallo
VALLO SPACES LTD (RC 9870413), Abuja, Nigeria
https://vallospaces.com
```

### Client compatibility checklist

| Rule | How | Checked by |
|---|---|---|
| Table layout, no flex, grid, float or positioning | every block is a `role="presentation"` table | shell.test, welcome-message.test |
| Inline styles | every colour and size inline beside its background; style block carries nothing load bearing | shell.test (count), stripped proof |
| Bulletproof button | solid `background-color` first, gradient image over it; padding on the anchor; VML `v:roundrect` in `<!--[if mso]>` with the HTML anchor in `<!--[if !mso]><!-->` | welcome-message.test, stripped proof |
| Lit button | gradient, `border-top` in quiet blue plus inset highlight, bloom by `box-shadow` where rendered | welcome-message.test, 600 and 375 proofs |
| Shape law | 14px radius on a 52px button (0.27), plates 10px on 36px, tiles 16px; only the tiny info glyph is round (a shape, not a control) | proofs |
| Outlook conditionals | 600px ghost table for Word, VML button, `o:OfficeDocumentSettings` 96 dpi, `mso-line-height-rule` on fixed-height cells | markup |
| Dark mode | `color-scheme` meta pair, `:root { color-scheme: dark }`, `prefers-color-scheme` re-assertion, `[data-ogsc]` twin for Outlook.com; ground painted on body, outer table `bgcolor` and card | shell.test |
| No web fonts | system stack only | shell.test |
| Alt text | mark alt empty (decorative), wordmark alt "Vallo"; both sized so a blocked image keeps its box | tests, images-off proofs |
| 600px max, fluid, mobile stacking | `max-width:600px;width:100%`; at 480px and below the tiles stack, the button goes full width, the card and step panel tighten | 375 proofs |
| Preheader | hidden span first in the body with spacer entities, per version | tests |
| Plain text | own renderer, same words in the same order, every link printed as "Label: URL" | tests, `*-plain.txt` |
| Escaping | every interpolated value through `escapeHtml`; a name `<b>O'Neil&"Co"` renders as text | test |
| Weight | about 21KB of HTML, under the 40KB budget | tests |

Proofs in `docs/design/proofs/session-b/email/`: `{role}-600.jpg`,
`{role}-375.jpg`, `{role}-600-images-off.jpg`, `{role}-375-images-off.jpg` for
all six, `renter-fallback-600.jpg` (style block, gradients, shadows and radii
stripped: a rough stand in for Outlook's Word engine and Gmail's stripping),
and `{role}-plain.txt`. Rendered in Chromium through Playwright with the
lockup served from `apps/web/public`, dark colour scheme. The email has no
light variant by design (theme.ts: dark in the layer every client honours).

### Refused claims (from the old copy; none of them had evidence)

- "Every listing on Vallo was put up by a real person on Vallo." The live DB
  has 64 published listings, all example rows (`is_demo`), and zero real
  supply. False today.
- "Applications and verification documents are answered within 3 days." A
  schedule promise nobody can stand behind.
- "A verified agent's listings rank above an unverified one ... the only thing
  on this platform that money cannot buy." A ranking claim this worker could
  not find evidence for, so it does not ship.
- "Listings that state the total get far fewer wasted viewings." A statistic
  with no data behind it.
- "Vallo charges you nothing to list or to be verified." Dropped from the
  email rather than restated: rule 15 says Vallo charges no platform fee, but a
  pricing statement belongs to the founder's copy, not the welcome.
- The verification ladder "phone, identity document, address, physical
  inspection" was wrong: the rungs in `lib/trust/verification.ts` are
  identity, address, payout account and in person. The new copy says those.
- Nothing says insured, guaranteed, protected, vetted or checked; no count, no
  percentage; no stock or availability promise.

### Not verified

- **Real inbox rendering.** Not sent to any real client: Outlook desktop
  (Word), Outlook.com, Gmail web and app, Apple Mail and iOS Mail were not
  seen. The VML button, the Outlook ghost table and Gmail's dark-mode repaint
  are built to the known rules and proven only in markup and in the stripped
  Chromium render.
- **That the welcome sends at all in production.** It needs `RESEND_API_KEY`
  on the deployment; this worker cannot read it. Without it `welcomeOnce`
  releases the stamp and nothing leaves.
- **Every link as a signed-in person.** Routes proven to exist as pages by the
  test; not clicked through with a session.

## Skipped or not verified

(appended honestly as work proceeds)

- Welcome email (section 10): not rendered in any real mail client (Outlook,
  Gmail, Apple Mail); the Resend key in production not verified; links not
  clicked through signed in.
