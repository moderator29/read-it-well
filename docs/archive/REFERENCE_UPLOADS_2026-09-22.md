# The ten renders uploaded at 19:24 on 22 September 2026

Uploaded to the REPOSITORY ROOT as UUID filenames, in commit `dfbff2f`
("Add files via upload"). They are indexed here rather than moved, because a
second session is working on five of these surfaces right now and renaming a
file somebody is reading is how work gets eaten. **Proposed once Session B
confirms: move them under `docs/design/references/` with the names in the last
column.** Nothing should reference the UUIDs after that.

Each was opened and looked at to write this table. Nothing here is inferred
from a filename.

## The five that belong to SESSION B

| File | Screen | What it draws | Proposed name |
|---|---|---|---|
| `2A49E2F7-F99C-47D3-BB79-075DCC1A0F5D.png` | Get started | Mobile onboarding, "Two worlds. One platform.", Property and Stays glass tiles on a plinth, four dot pager, Get Started and Skip | `sb-01-get-started.png` |
| `55A56F21-0654-4F2D-984B-60A8CE97BB17.png` | Welcome back | Sign in, glass card, email field, Continue, Continue with Google, Sign up link | `sb-02-welcome-back.png` |
| `50E032EA-4141-4237-88D5-01B3720D87B6.png` | Profile | Cover photo, avatar with verified tick, follower counts, Belongings and Posts tabs, five rows, bottom dock | `sb-03-profile.png` |
| `6AF37222-1D2E-4200-AB23-E55A24AE5E4F.png` | Wallet | Total balance, Send/Receive/Top Up/Swap, Quick Actions, recent transactions | `sb-04-wallet.png` |
| `77A54EA3-BBB5-4BF4-B3A5-144C99CABAF7.png` | Send money | Available balance, recipient, bank, amount with four presets, narration, Send Money | `sb-05-send-money.png` |

### THREE THINGS IN THESE RENDERS MUST NOT SHIP, AND ONE OF THEM IS SERIOUS

The standing rule is that a reference image governs the SHAPE and never
licenses an off-brand or untrue detail. Three details in this set fail that
test and the first is not a style question.

1. **`77A54EA3` (Send money) carries an "NDIC INSURED" badge.** NDIC is the
   Nigeria Deposit Insurance Corporation and it insures deposits at licensed
   banks. Vallo is not a bank and holds no such cover. Drawing that badge on a
   money screen is a false statement about whether a person's money is
   protected, and it is the kind of claim a regulator reads literally. **It
   must not be drawn, in any wording, unless and until the founder produces
   evidence of cover.** The "256 BIT ENCRYPTION" badge beside it is a marketing
   claim about an implementation detail and should also go.
2. **`6AF37222` and `77A54EA3` both draw Buy Airtime, Pay Bills and Swap.**
   Vallo sells none of these. "Swap" additionally reads as crypto, which is a
   surface this build deliberately took dark. A tile that goes nowhere is the
   empty shop that HANDOFF 08 section 1.1 is entirely about.
3. **`55A56F21` (Welcome back) carries the slogan "Real Estate reimagined!".**
   The founder's own instruction on 22 September was to remove the auth screen
   slogan ENTIRELY, with no replacement. The render predates that ruling; the
   ruling wins.

## The five that belong to THIS SESSION

| File | Screens | What it draws |
|---|---|---|
| `5EAA44CB-5262-4781-8FE8-6704CE9A496C.png` | 1 | Admin console **Overview**, full desktop: four stat tiles, four cards, naira transacted over time, supply by type, new listings per month by Owner/Agent/Firm, recent alerts |
| `C1D98B3C-D7B7-4B2D-9182-79E0F89ED287.png` | 3 | Admin **Listings** review queue; **Listing under review** detail with move-in costs and lister verification; **Money** with float, escrow, settled, failed, reconciliation health and a ledger |
| `8E9602E2-0E75-4623-8813-A10D2165CE27.png` | 3 | Admin **Escrow** with live escrows and float total; **Verification** with the identity queue, funnel and provider performance; **Supply** by role with growth |
| `01F7DFC7-65F8-4EAB-B051-421B6AEA1214.png` | 3 | Admin **Moderation** with the report queue and breakdown; **Operations** with scheduled jobs, alerts and audit log; **Analytics** with demand vs supply and refusal reasons |
| `F6A8A482-657B-4836-B30A-1A0578BC3FBA.png` | 1 | Mobile **Property Inspection**: the property, date, assigned agent, an eight item checklist, notes, add photos, submit report |

**Eleven new screens of scope**, ten of them a desktop admin console with a
twelve item rail (Overview, Listings, Supply, Verification, Money, Escrow,
Bookings, Moderation, Support, Operations, Analytics, Settings), and none of
them started.

### Two observations worth making before anybody builds these

- **The admin renders show a platform with traffic.** 1,248 live listings,
  ₦18,450,000 transacted today, 137 moderation reports, 548 escrows. The real
  estate has zero bookings, zero reservations and zero deletion requests. These
  screens must be built so their EMPTY state is the designed state, not an
  afterthought, or the console becomes the same window advertising stock that
  HANDOFF 08 opens by condemning.
- **`01F7DFC7` Operations draws exactly the job desk this session spent the day
  repairing**: scheduled jobs with last run and status, alerts by severity, an
  audit log. The data behind it now exists and is honest. That screen is the
  cheapest of the ten to build and the most immediately useful.
