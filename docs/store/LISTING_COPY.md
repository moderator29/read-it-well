# Store listing copy: App Store and Google Play (STORE-20)

This is a draft for the founder to approve. Every sentence describes something
the app does on 24 September 2026. Anything that depends on a decision still
open is marked **[IF]** and must come out if the decision goes the other way.

The rules this copy follows:
- **No "verified" unless a person checked it.** "Verified agent" is backed:
  an admin approves an identity check on the KYC desk (`lib/trust/claims.ts`).
  "Verified homes" or "verified listings" is not backed, and is not used.
- **No counts.** There is no "thousands of listings". Today most of the
  catalogue is labelled example listings (STORE-11).
- **No escrow, no wallet, no "safe", no "secure", no "guaranteed", no
  "protected".** Vallo never holds customer money (Track A). "The Vallo
  Guarantee" may be named as a product, always with its limits (capped,
  reviewed, rentals and stays only).
- **No "best price" and no "cheapest".** The price check says what a place
  costs in total. It does not say it is a good deal.

Character limits are in brackets. The counts include spaces.

---

## App Store Connect

**Name** (30): `Vallo: Homes and Stays` (22)

**Subtitle** (30): `Rent, stay and see the cost` (27)

**Promotional text** (170, changeable without review):
> Find a home to rent in Nigeria, see the full move-in cost before you call anybody, and message the agent in the app. Book a stay or a table in the same place.

(163)

**Description** (4,000):

> Vallo is a Nigerian property app for finding a home to rent, booking a stay and planning what it will cost.
>
> SEE THE WHOLE COST FIRST
> A rental shows the rent and the move-in breakdown: agency and legal fees, caution deposit and service charge, added up. The price check tells you what a place usually costs in an area before you start.
>
> TALK TO THE AGENT, THEN INSPECT
> Message the agent in the app, ask for an inspection and keep the conversation in one thread. An agent with the verified mark has had their identity checked by a person at Vallo before listing.
>
> STAYS AND TABLES
> Book a night in an apartment, shortlet or hotel listed by its host, and request a table at a restaurant that lists itself on Vallo.
>
> YOUR AREA
> Follow areas and people, read and post updates, and share a listing with a friend.
>
> PAY WITHOUT VALLO HOLDING YOUR MONEY
> Inspect, confirm the agreement with the owner or agent, and pay once Vallo
> approves it. Their share goes straight to their bank. Vallo charges no
> inspection fee.
>
> ASK THE ASSISTANT
> Ask the assistant about areas, prices and how renting works. It tells you before the first message that it is an AI service run by Anthropic, and it asks you to agree. A person at Vallo is always available instead.
>
> NOTIFICATIONS
> Get a notification when somebody messages you or a booking changes. You choose which in Settings.
>
> Some listings in the app are examples, and each one is marked as an example. Vallo is for people aged 18 and over.

**Keywords** (100, comma-separated, no spaces after commas, do not repeat words from the name):
`rent,apartment,house,lagos,abuja,shortlet,agent,property,nigeria,inspection,flat,lease,hotel,naira` (99)

**What's New** (first version):
> The first version of Vallo on the App Store.

**Support URL**: `https://www.vallospaces.com/help`
**Marketing URL**: `https://www.vallospaces.com`
**Privacy Policy URL**: `https://www.vallospaces.com/privacy`

**Age rating questionnaire:** answer from what ships.
- User-generated content: yes.
- Messaging and chat: yes.
- Unrestricted web access: no.
- Gambling, contests, mature themes: none.

Apple will compute a rating. **Choose 18+ anyway**: the Terms require 18 and
over, and sign-up asks (STORE-19).

**Category:** primary Lifestyle, secondary Travel.

---

## Google Play Console

**App name** (30): `Vallo: Homes and Stays` (22)

**Short description** (80):
> Rent a home in Nigeria, see the full move-in cost, book stays and tables.

(74)

**Full description** (4,000): the App Store description above, unchanged.
Play allows the same text, and one text is easier to keep true.

**Category:** House & Home. **Tags:** Real estate, Travel & local.

**Contact details:**
- Email: `support@vallospaces.com`. **Create this mailbox before submission**
  (STORE-20), and set `NEXT_PUBLIC_SUPPORT_EMAIL` in Vercel so `/contact` shows
  it.
- Website: `https://www.vallospaces.com`.

**Target audience:** 18 and over only.

**Ads:** "No, my app does not contain ads."

**Financial features:** answer from what ships (STORE-09, `PRIVACY_LABELS.md`).

---

## Graphics (not text, so not here)

Produced on 29 September 2026: a pool of 33 screenshots for each store and the Play feature graphic, in `docs/store/screenshots/`. `APP_STORE_SCREENSHOTS_HANDBOOK.md` says which to submit. What follows is the brief they were made against.

- **App Store:** 6.9" screenshots (1320×2868), 3 to 10 of them. They must come
  from the shipped build (guideline 2.3.3), taken on a simulator or a device.
  No iPad set is needed, because the app is iPhone-only (STORE-13).
- **Play:** phone screenshots (at least 2, 1080×1920 or larger) and a 1024×500
  feature graphic. The feature graphic must not say "verified homes".
- Suggested order for the screenshots:
  1. a listing with its move-in breakdown;
  2. the price check;
  3. a message thread with an agent;
  4. booking a stay;
  5. the assistant with its disclosure.

  If a screenshot shows an example listing, its Example label must be visible.
