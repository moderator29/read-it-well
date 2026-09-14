# HANDOFF 01: the company, the obligations and the way we work

**This is the first of two handoffs. It governs the company, the money, the law
and the standards. The second, `docs/HANDOFF_02_PLATFORM.md`, governs the
codebase.**

Read this one first even if your work is entirely technical. It is shorter, and
it contains the rules that decide whether a technical choice is allowed at all.

Written 14 September 2026, the day the CAC application went in.

### What a session on this handoff is for

Company formation follow-through, the investor relationship, the agreements, the
solicitor, NDPC and SCUML registration, the privacy and data governance work, and
the policy surfaces in the product that those obligations require. Legal and
commercial correctness, written down, so nothing is carried only in the founder's
head.

### What a session on this handoff must not do

Do not start the platform rebuild here. Do not rate the codebase, do not open
`RECOMMENDATIONS.md` as a work queue, do not redesign anything. That is
`HANDOFF_02` and it is a separate session on purpose, because mixing the two
produces a session that finishes neither.

The one overlap is deliberate and it runs in this direction only: where a legal
obligation requires a change in the product, this handoff **specifies** it and
`HANDOFF_02` **builds** it. Section 4 is that specification.

---

## 1. What the company is

**VALLO SPACES LTD.** A private company limited by shares, registered under CAMA
2020. The application was submitted to the Corporate Affairs Commission on
**14 September 2026**.

| | |
| --- | --- |
| Registered name | VALLO SPACES LTD |
| Platform brand | **Vallo** |
| CAC application ID | 12485150 |
| Name reservation code | 17893407603, valid 60 days from approval |
| Share capital | ₦1,000,000, in 1,000,000 ordinary shares of ₦1 |
| Registered office | Plot 5, Zone 6, Dutse Alhaji, Bwari Area Council, FCT, Abuja |
| Principal activity | Real estate. Specific activity: real estate activities |
| Portal account | `puffnutz` on icrp.cac.gov.ng |

NinjaFinds and RentMe were working names. The platform is **Vallo**; the
registered name carries only the corporate suffix the Commission requires.

### Shareholding as filed

Percentages at the Commission are of **today's issued capital**, not of the fully
diluted picture in the agreement. The team pool does not exist yet and Samuel's
later tranches have not been issued.

| Holder | Role | Shares | % |
| --- | --- | ---: | ---: |
| Omojuni Oluwaseyifunmi Ebenezer | Founder, CEO | 523,000 | 52.3% |
| Adetiba Kareem Tunde | Co-Founder, CTO | 297,000 | 29.7% |
| Samuel Soledayo Babatola | Co-Founder, CGO | 180,000 | 18.0% |

All three are directors from incorporation. All three are Persons with
Significant Control. No company secretary was appointed, which CAMA 2020 permits
for a small company.

**Samuel's 18% was allotted in advance.** He has paid US$1,000 of the US$5,500
Tranche 1. The founder chose to credit him the full Tranche 1 entitlement anyway,
because Samuel sent the first money against his own lawyer's advice. Clause 3.2.1
of the agreement carries a 30-day adjustment right if the balance does not arrive.

### The objects, and why they are narrow

The first draft of the objects clause included **payment, escrow and wallet
services**. The CAC portal's classifier read those words as a regulated payments
business, demanded a designated-company type, and pushed the minimum share
capital to ₦500,000,000. The objects were rewritten to remove every payment and
escrow word, and the filing went through.

**Do not add regulated objects back to the memorandum before the licence exists.**
When the wallet is licensed, the object is added by special resolution. That is
the correct order regardless of the portal.

---

## 2. The money

Three documents govern this and they must stay consistent with each other. All
three are HTML artifacts, not files in this repository. The founder holds the
links.

### Co-Founder and Investment Agreement

Three parties, dated 14 September 2026, governed by Nigerian law, arbitration in
Abuja under the Arbitration and Mediation Act 2023.

- **Valuation** US$250,000, fixed for twelve months
- **Investment Capital** up to US$20,000, buying 0.4% per US$1,000 to a maximum of 8%
- **Co-Founder Equity** 13% to Samuel, earned by service, not payment
- **Target fully diluted** 44% founder, 25% CTO, 21% CGO, 10% team pool
- **Vesting** four years, twelve-month cliff, on founder and co-founder equity only.
  Investment equity never vests
- **Commencement Date** the Business Day Tranche 1 clears in full
- **Launch commitment** 40 days from Commencement

Tranches are released by milestone, never by calendar:

| Tranche | Amount | Released when |
| --- | --- | --- |
| 1 | US$5,500 (US$5,000 required) | On signature |
| 2 | To be agreed | Platform live on both App Store and Play Store |
| 3 | Balance | 2,000 registered users and 200 agent applications |

### Clauses that exist because Samuel's lawyer asked for them

His counsel reviewed the agreement over two days and raised five items and three
gray areas. Every one is now in the document. If a future conversation touches
these, they are load bearing and were negotiated:

| Clause | What it does |
| --- | --- |
| 2.3.2 | Express right to withhold or part-release any tranche whose milestone is unmet, with no liability and no breach |
| 2.4.1 | Founder may reallocate freely **within** the Tranche 1 budget provided the total holds and substitutions are recorded |
| 2.4.2 | Tranche 1 accounted for **on request**; Tranches 2 and 3 reported in full as a matter of course |
| 2.4.3 | Money above the US$20,000 cap is a fresh investment priced on the company as it then stands, not at the locked US$250,000 |
| 2.6 | From the day the company account opens, all capital goes there. Before that, held on trust by the founder |
| 2.7 | Founder's Stipend, a disclosed budget line. Any increase beyond budget is a Reserved Matter |
| 2.8 | Company Expenses: travel, the Akure trips, filings, devices, subscriptions |
| 3.2.1 | Samuel's Tranche 1 equity allotted in advance, with a 30-day adjustment right |
| 4.1 | Registration commenced and submitted 14 September, funded by the founder |
| 4.4 | NDPA 2023 and SCUML obligations |
| 7.3 | Reserved Matters, including expenditure over US$1,000 **outside** an approved budget |
| 8.3 | Founder sole signatory day to day; CTO added above US$1,000; CGO has full online visibility |
| 10.4 | Indemnity from the founder: fraud, wilful misconduct, gross negligence, misapplication of funds, IP breach |
| 10.5 | No diversion of corporate opportunity, with a trust remedy |
| 10.6 | IP warranty from founder and CTO, with indemnity |
| 10.7 | Performance, 30-day cure, then a Reserved Matter |

### Budget

First tranche is **US$5,500 exactly**, verified by summing the line items rather
than trusting the stated total. Floor is US$4,700 if the social campaign is
deferred, which is the only deferrable line.

Notable entries: Claude Code at US$800, Anthropic API at US$500, social campaign
US$800, founder stipend US$600 over four months, contingency US$400. The
post-launch re-audit and seven non-essential APIs were moved to Tranche 2 to fund
the raised engineering tier.

**US$6,380 already spent** by the founder and CTO from personal resources since
early 2025. Not a debt of the company and not being reclaimed.

Payment accounts before the company account exists: Access Bank 1602526794, OPay
7050743084, both Omojuni Oluwaseyifunmi Ebenezer. The budget document tells
Samuel to confirm by voice before every transfer.

### Solicitor engagement

Samuel's family lawyer, an Abuja practitioner, is being brought in as **Company
Solicitor**. He reviewed the Founders' Agreement for Samuel first, and he
unblocked the CAC filing twice without being retained.

The engagement was originally drafted with a 3% equity grant. **That was removed.**
Samuel felt it was too much and proposed a salary basis instead, and the founder
agreed. It is now a retainer with the fee line left deliberately blank for the
solicitor to name, with a stated preference for payment every two months. Clause
3.5 says plainly that equity was considered and independence was chosen instead.

The engagement does not take effect until he has delivered his review to Samuel.
That timing is written into the document at clause 4.2 and it is the thing that
keeps the offer from reading as an inducement. **Do not send the engagement
before that review is delivered.**

---

## 3. Regulatory: NDPC, SCUML, tax

### NDPC and the Nigeria Data Protection Act 2023

The platform holds identity documents, addresses, NINs and payment data at scale.
That makes Vallo a **data controller of major importance**, which is not a
judgement call, it follows from the volume and sensitivity of what the agent
verification flow collects.

What that means in practice:

- **Registration with the NDPC** before Launch. Clause 4.4 commits to it and the
  budget carries US$120 for it
- **Annual compliance audit**, filed through a licensed Data Protection
  Compliance Organisation
- A privacy notice, a lawful basis for each category of processing, and a
  retention and destruction policy for identity documents

The existing agent verification flow uploads documents to a private
`agent-documents` bucket and admin review opens them through signed URLs. That
architecture is compatible with the Act. What is missing is the paperwork and the
retention policy, not the engineering.

The standalone `/verification` route still returns an honest stub. The working
KYC path is the agent application wizard. Do not present the platform as
verification-complete until that is resolved.

### SCUML

Real estate is a designated non-financial business under Nigeria's anti-money
laundering regime. **SCUML registration is required, not optional**, and Nigerian
banks will ask for the certificate before they operate a corporate account for a
property business. It is filed through the CAC portal after incorporation.

Sequence is fixed: **CAC certificate → SCUML → bank account.**

### Tax

TIN is generated automatically with the CAC registration. Company income tax
filings with FIRS follow. Directors carry personal liability for unremitted PAYE
and VAT, which is the most common way Nigerian directors get personally pursued.
Small companies are exempt from audit under CAMA 2020 at current turnover.

---

## 4. Privacy is a product requirement, not a policy page

The Nigeria Data Protection Act 2023 is the only regulation in this project that
changes what the code has to do. Everything else on this page is paperwork. This
section is not.

Treat it as a specification. `HANDOFF_02` builds from it.

### 4.1 What already exists and is genuinely good

Do not rewrite these. They were built deliberately and they are close to correct.

- **A real privacy policy**, twelve sections, at
  `apps/web/src/lib/legal/privacy.tsx`, rendered at `/privacy` and
  `/legal/privacy`. It names lawful bases per processing category, states
  retention, lists data subject rights, and commits to breach notification. It
  is written to the NDPA, not copied from a US template
- **Identity documents go to a private bucket.** Agent verification uploads to
  `agent-documents`, which is not public, and the admin reviewer opens each one
  through a short-lived signed URL. That is the architecture the Act wants
- **The rights channel points somewhere a person reads.** It used to say
  `support@rentme.ng`, a mailbox that does not exist, so every data subject
  request would have vanished while the sender believed they had asked. It now
  routes to the contact form, which writes a `support_tickets` row an admin
  works. The comment explaining this is still in the file. Leave it there

### 4.2 What is wrong today, and it is a legal defect not a nit

The policy names **RentMe** as the data controller. As of 14 September 2026 the
controller is **VALLO SPACES LTD**, a registered Nigerian company with a
registered office. A privacy notice that misidentifies the controller is a
defective notice under the Act, and it is the first thing an NDPC auditor checks.

Required in the notice before Launch:

| Item | Current | Required |
| --- | --- | --- |
| Controller identity | "RentMe" | VALLO SPACES LTD, with RC number once issued |
| Registered address | absent | Plot 5, Zone 6, Dutse Alhaji, Bwari Area Council, FCT, Abuja |
| Data Protection Officer | absent | A named contact point. The founder until someone is appointed |
| NDPC registration | absent | The registration number, once registered |
| Domain | rentme.ng | The live Vallo domain |

This is a text change in one file plus whatever the branding sweep touches. It is
small. It is also the difference between a compliant notice and a defective one,
so it does not get deferred behind a redesign.

### 4.3 The retention policy the Act requires, and nothing enforces

The notice states retention periods. **Nothing in the database enforces them.**
Identity documents uploaded during agent verification sit in `agent-documents`
indefinitely, including for applications that were rejected and will never be
reconsidered.

Under the Act, holding a rejected applicant's NIN slip and identity document
forever is storage without a lawful basis. The basis expired when the decision
was made.

What is needed, and this is an engineering task for `HANDOFF_02`:

- A written retention schedule per data category, approved before it is coded
- A scheduled purge of verification documents for applications in a terminal
  rejected state, after the appeal window closes. `pg_cron` is already running
  six jobs, so the mechanism exists
- The purge writes an audit row. Deleting personal data silently is its own
  problem when you later have to prove you deleted it
- Account deletion that actually deletes, or that anonymises and says so
  precisely. There is deletion code in `lib/profile/actions.ts`. Nobody has
  audited what it leaves behind

### 4.4 The rule for anything new

**Every new field that holds personal data needs a lawful basis before it is
added to a table.** Not after. If you cannot name the basis in one sentence, the
field does not get added.

Three specific prohibitions, which follow from what the platform does:

1. **Never log a NIN, a document number, a card number or a bank account number**,
   in application logs, in error reports, in an analytics event, or in a Sentry
   breadcrumb. Redact at the boundary
2. **Never widen a bucket policy to make a debugging session easier.** The
   verification bucket is private and every read is signed. If a screen cannot
   see a document, fix the signing, not the policy
3. **Never send personal data to a third party service that is not in the
   privacy notice's sharing section.** Adding an analytics or AI vendor is a
   notice change first and an integration second

### 4.5 A data controller of major importance

This is not a judgement call. It follows from the volume and sensitivity of what
the agent verification flow collects: government identity documents, NINs,
addresses and payment data, at scale.

That designation carries three live obligations:

- **Registration with the NDPC** before Launch. Clause 4.4 of the agreement
  commits to it and the budget carries US$120 for it
- **An annual compliance audit**, filed through a licensed Data Protection
  Compliance Organisation
- **A Data Protection Officer**, named and reachable

The engineering is largely right. The paperwork does not exist. Do not let a
session confuse the two and report the platform as compliant because the bucket
is private.

### 4.6 Terms of Service

There is a terms document at `apps/web/src/app/(site)/terms` and
`/legal/terms`. It has the same controller-identity defect as the privacy
notice, and the same fix applies.

Beyond the name, terms have to correspond to what the platform actually does,
and the platform does several things that generic terms do not cover. These need
to be in there before Launch, and each one exists because the product has that
surface:

- **User-generated listings.** Who is responsible for the accuracy of a listing,
  and what the platform does when one is wrong
- **The verification ladder.** What a verified badge means and, more importantly,
  what it does not mean
- **Messaging.** Acceptable use, and the fact that a database trigger flags
  account numbers and payment keywords to admin. Users should know that
- **The wallet.** What a balance is, what it is not, and that it is not a bank
  deposit
- **Savings.** Only once it exists. Do not write terms for a feature that is not
  built
- **Inspections.** What the platform arranges and what it does not guarantee
- **Bots and AI output.** Anything the assistant generates is assistance, not
  advice, and is not a substitute for viewing a property
- **Prohibited activity, suspension and termination**, and the route to appeal
- **Intellectual property** in listings and in user content
- **Dispute handling and applicable law.** Nigerian law, consistent with the
  agreement

**The platform charges no fees anywhere.** Terms must not introduce one by
accident. If a payment processor takes something, it is labelled as the
processor's.

**Do not invent provisions.** Where a clause has real legal consequence, it goes
to the solicitor. Section 2 explains who he is and when he can be engaged.

### 4.7 Disclaimers

Disclaimers are for places a user could reasonably misunderstand what the
platform is doing. They are not a substitute for building the thing safely.

Where they are needed, and why:

| Surface | The misunderstanding to prevent |
| --- | --- |
| Listing details | That the platform inspected or endorsed the property |
| The verified badge | That verification is a guarantee against fraud |
| Wallet balance | That it is a bank deposit or is insured |
| Any payment screen | That the platform holds the money in escrow. **It does not. Escrow is zero percent built** |
| Assistant and bot output | That generated text is advice or a valuation |
| Inspection booking | That the platform is present at the inspection |
| Third-party links and maps | That the platform controls that data |

**A disclaimer never licenses a weak product.** If the honest disclaimer would be
alarming, the feature needs work, not better wording.

### 4.8 The data lifecycle, in twelve questions

A serious company can answer all twelve about every category of data it holds.
Vallo can answer some of them today. The rest is the gap.

| Stage | The question | Where Vallo stands |
| --- | --- | --- |
| Collection | What enters the system, and under what basis | Documented in the notice. Good |
| Processing | What happens to it | Documented. Good |
| Storage | Where it lives | Supabase, eu-west-1. Documented |
| Access | Who can read it | RLS on every table. Strong |
| Sharing | Who receives it | Listed in the notice. Must be updated when a vendor is added |
| Retention | How long it is kept | **Stated in the notice, enforced nowhere.** Section 4.3 |
| Deletion | How it is removed | Code exists. **Never audited for what it leaves behind** |
| Backup | What happens to copies | Supabase managed. Not documented anywhere |
| Logs | What is recorded | **Not inventoried.** Redaction is a rule in 4.4, not a verified fact |
| Analytics | What is measured | Not inventoried |
| Security | How it is protected | Strong in the database. Weakest at the edges |
| User control | What a user can see, change, export, delete | Rights are stated. The export path is not built |

The four bolded rows are the honest answer to "are we NDPC ready". The engineering
is better than the paperwork, and both have holes.

---

## 5. Brand and naming: three names, three uses

This is the single most common thing to get wrong, and getting it wrong in a
legal document is expensive.

| Name | Where it is used | Where it must never be used |
| --- | --- | --- |
| **VALLO SPACES LTD** | Contracts, the privacy notice, terms, invoices, the bank, anything filed | Product UI. Nobody says "Ltd" in an app |
| **Vallo** | The product, the app stores, the domain, marketing, every user-facing string | Contracts, where the registered name is required |
| **RentMe**, **NaijaFinds** | Nowhere. Both are dead working names | Everywhere |

The corporate suffix exists because the Commission requires it. It is not part of
the brand.

**Both dead names are still in the codebase**, in roughly 190 files each, plus
the npm scope `@naijafinds/*`, the root `package.json` name, the logo asset
filenames and the `rentme.ng` domain in the legal pages. Removing them is a
`HANDOFF_02` task and it is listed there. It is mentioned here so that nobody
writes a new contract by copying a string out of the codebase.

**The visual brand did not change with the name.** Deep navy-black, dark neon
blue, electric blue glow. No orange, no amber, no gold, no purple. Emerald for
success and rose for error are the only two hues outside the blue family. Those
rules are in `docs/HANDOFF.md` section 2.1 and they survive the rename intact.

---

## 6. Security culture

The platform holds identity documents and moves money. Two consequences.

**Secrets live in the environment and in Supabase Vault. Nowhere else.** Never in
a file, never in a commit, never pasted into a document, never in a message to
Samuel or the solicitor. If a key is ever exposed, rotating it is the first
action and telling the founder is the second, in that order, and neither is
optional. `docs/ENVIRONMENT.md` lists every credential the code reads.

**The founder adds all environment keys personally.** Never block on a missing
one. Env-guard the client and degrade into an honest designed state. The one
exception is a payment webhook, where a missing key must never fail silently;
that is `RECOMMENDATIONS.md` W-1 and it is a P0.

**Bank and financial control is documented in the agreement and is not
negotiable by a session.** The founder is sole signatory day to day. The CTO is
added as second signatory above US$1,000. The CGO has full online visibility and
no signing authority. Clause 8.3. Nothing in the product should imply otherwise.

**Do not add a payment, escrow or wallet object to the corporate memorandum
before the licence exists.** Section 1 explains what that cost. The same caution
applies to public claims: the platform must never promise escrow in copy until
escrow exists, and it does not exist. `apps/web/src/app/(site)/safety/page.tsx`
refuses to promise it on purpose.

---

## 7. The standard: repository, engineering and company

**Branch.** All work in this session goes to
`claude/rentme-v2-platform-audit-xuvg0a`. Never push to a different branch
without being told. Never push to `main` directly.

**Commits.** Green snapshots, often, with a message that says what changed and
why. Zero em dashes in commit messages, same as everywhere else. Never commit
broken work and never hide a failure in a commit message.

**The company documents are not files in this repository.** The agreement, the
budget and the solicitor engagement are published HTML artifacts. The founder
holds the links and sends versioned copies to Samuel by Telegram. This handoff is
the durable record of what they say; it is not a substitute for them.

**They must stay consistent with each other and with the CAC filing.** The
shareholding in the agreement, the shareholding at the Commission, and anything
quoted to Samuel are the same numbers. A contradiction between them is the first
thing his lawyer will find, and his lawyer has already found things twice.

**When a document changes, this handoff changes in the same session.** The reason
this record was written at all is that none of this was recorded anywhere
and it was being carried in one person's head.


### 7.1 The real company standard

Every feature, before it ships, answers ten questions. Not the happy path only.

1. Why does this exist, and who is it for
2. What personal data does it touch, and under what lawful basis
3. What risk does it introduce, to the user and to the company
4. How does it fail, and what does the user see when it does
5. How is it secured, and who can reach it
6. How is it supported when someone complains about it
7. How is it monitored, and what tells us it broke
8. What happens to its data when the user deletes their account
9. What does it cost to run, and does that scale
10. If we had to switch it off tomorrow, what breaks

A feature that cannot answer 4, 5 and 8 is not finished, however good it looks.

### 7.2 The quality standard

Professional, clean, secure, thoughtful, premium, responsible, scalable. In
practice that means four trades are never made:

- **Never trade correctness or security for speed of delivery.** Money and
  identity documents are involved
- **Never trade accessibility or usability for beauty.** A screen nobody can use
  is not a premium screen
- **Never trade simplicity for feature count.** Every surface added is a surface
  to maintain, secure and support
- **Never trade user trust for growth.** No dark patterns, no manufactured
  urgency, no fake scarcity, no fake social proof. The trust ladder is the
  product

### 7.3 Honesty in reporting

Four words that must be true when used:

- **"Committed"** only when it is actually committed
- **"Pushed"** only when the push returned success
- **"Tested"** only when the test was run and its output read
- **"Compliant"** only where it has actually been established, which for NDPC
  today means not yet

Never report a platform as production-ready without evidence. A quiet skip is
worse than a stated one, and the founder has said so directly.

### 7.4 The handoff boundary

This is Handoff 01. It establishes the company, the obligations and the
standards, and everything in it is the baseline that Handoff 02 inherits.

`docs/HANDOFF_02_PLATFORM.md` covers the codebase and the full product
transformation. When a session moves to it, nothing here is dropped: the brand
rules in section 5, the privacy specification in section 4, the standards in
section 7 and the working style in section 9 all still bind.

Where the two disagree, this one wins on anything legal, financial or
reputational. Handoff 02 wins on anything technical.

---

## 8. What happened on 14 September, and what it cost

The CAC filing took an entire day and most of it was fighting the portal. Recorded
here so nobody repeats it.

1. **Name reservation.** Vallo Homes was rejected as similar to an existing name.
   Vallo Technologies was taken. VALLO SPACES LTD cleared. ₦1,300 paid
2. **The Share Issue Capital wall.** The page would not save without selecting a
   "Type of Company", and every visible option was a regulated category. Three
   theories were tried and all three were wrong. **The answer was
   `ENTITY WITH SHARES BELOW FIVE MILLION`, the first entry at the very top of the
   dropdown.** Samuel's lawyer found it in one look
3. **Objects rewritten** to remove payment and escrow wording, as above
4. **A duplicate director.** The portal auto-creates a director row from the
   account profile and it sat alongside a manually added one. Remove the manual
   duplicate, use Sync with Portal Info on the portal row
5. **A date of birth timezone bug.** The picker sends local midnight, the server
   reads UTC, and Nigeria being UTC+1 shifts the date back a day. Set the machine
   to UTC+0 before entering dates, or verify at Preview
6. **PSC answers.** Direct holding Yes with the percentage for all three, indirect
   No for all three. Appoint or remove directors Yes for the founder only
7. **Payments.** CAC filing fee via Remita, then stamp duty of ₦8,678.25 to the
   Nigeria Revenue Service, RRR 2115-1277-3700. Submitted

### Still outstanding

- CAC approval, expected one to three working days
- Certificate, certified MEMART and status report to download
- SCUML registration
- Access Bank corporate account, both founders attending in person, with a board
  resolution naming signatories
- NDPC registration before Launch
- Balance of Tranche 1, US$4,500, within 30 days of incorporation under clause 3.2.1
- Register of Members and share certificates
- The solicitor engagement, once his review is delivered

---

## 9. How the founder works

Observed over a long session. This is not decoration; getting it wrong wastes his
time and he will say so.

**He wants the answer, not the reasoning.** Long replies get cut off mid-read.
Lead with the decision. If the reasoning matters, one line of it, after.

**No em dashes.** He asked for this explicitly and it applies to messages and
documents alike.

**Verify before asserting.** He has been burned by confident wrong answers,
including from this assistant. Three brand names were handed to him unchecked and
all three were already taken by real estate companies. The root cause was
batching several names into one search query, which returns the strongest match
and silently drops the rest. Check one thing at a time, and say plainly when
something has not been checked.

**Correct yourself fast and move on.** He does not want an apology. He wants the
corrected fact. Several times a stated diagnosis turned out wrong; the right move
was one sentence naming the correction, then the fix.

**He decides. He is not asking permission.** Where a concern is genuine, raise it
once, plainly, then do what he asked. He has overridden advice and been right.

**Three things were declined in this session, and each needed a substitute:**

- Writing a fabricated deadline to pressure Samuel. Substituted four true urgency
  reasons that worked
- Helping conceal personal spending inside the investor's US$5,500. Substituted a
  disclosed founder stipend, which is legal, which Samuel accepted, and which got
  him the same money
- Discouraging Samuel from using his lawyer. That lawyer then unblocked the
  filing twice

The pattern that works: name the problem in one or two sentences, offer the thing
that achieves his actual goal, then build it.

**On messages to Samuel.** Warm, direct, brotherly. Never passive-aggressive,
never guilt. He cuts anything that reads as pressure. He asks for them short and
means it. He will paste them verbatim, so they must be sendable as written.

---

## 10. The people

- **Omojuni Oluwaseyifunmi Ebenezer** (Seyi). Founder and CEO. Abuja. Runs
  everything day to day, sole bank signatory, full time on the platform
- **Adetiba Kareem Tunde.** Co-Founder and CTO. Akure. Second signatory above
  US$1,000
- **Samuel Soledayo Babatola.** Co-Founder and CGO. Huddersfield, UK. Nigerian
  citizen, holds a Nigerian passport. Owns the diaspora market and growth
  partnerships. Expects 5 to 10 hours a week. Has indicated he may invest beyond
  the US$20,000 cap
- **The solicitor.** Samuel's family lawyer, Abuja. Not yet retained
- **Joewi and Daniel.** Building the front end, working free, colleagues the
  founder has known personally. They are the schedule constraint, not the money

---

## 11. The queue for a session on this handoff

In order. Each one is either blocked on something external or is a document to
write, which is why this is a separate session from the platform work.

### Blocked on the Commission

1. **CAC approval.** Expected one to three working days from 14 September.
   Download the certificate, the certified MEMART and the status report the
   moment they are available
2. **RC number into the documents.** The agreement, the privacy notice and the
   terms all need it once it exists

### Blocked on the certificate

3. **SCUML registration.** Required, not optional, because real estate is a
   designated non-financial business. Filed through the CAC portal after
   incorporation
4. **Access Bank corporate account.** Both founders in person, with a board
   resolution naming signatories per clause 8.3. The sequence is fixed:
   certificate, then SCUML, then bank
5. **Clause 2.6 takes effect** the day that account opens. All capital goes
   there. Until then the founder holds it on trust

### Not blocked. Can be done now

6. **Register of Members and share certificates**, 523,000 / 297,000 / 180,000.
   CAMA 2020 requires the register from incorporation
7. **The privacy notice correction** in section 4.2. Controller identity,
   registered address, DPO contact. This is the smallest item on the list and
   the one with legal weight
8. **The retention schedule** in section 4.3, written and approved, so
   `HANDOFF_02` can implement it rather than invent it
9. **NDPC registration.** Before Launch, budgeted at US$120
10. **The solicitor engagement**, and only once he has delivered his review to
    Samuel. Clause 4.2 of the engagement makes that the effective date and it is
    what keeps the offer from reading as an inducement. **Do not send it early**
11. **Balance of Tranche 1**, US$4,500, within 30 days of incorporation under
    clause 3.2.1. Samuel has paid US$1,000 and holds his full 18% in advance

### Standing

12. Keep the agreement, the budget, the engagement and the CAC filing saying the
    same numbers. Section 7

---

## 12. If you only remember five things

1. The company is **VALLO SPACES LTD**. The product is **Vallo**. RentMe and
   NaijaFinds are dead and must not appear in anything new
2. **NDPA compliance is engineering work, not a policy page.** Section 4 is a
   specification and the retention gap in 4.3 is real
3. **Certificate, then SCUML, then bank.** That order is fixed and skipping a
   step wastes a trip
4. The clauses in section 2 were negotiated against a real lawyer who read them
   twice. **They are load bearing.** Do not casually redraft one
5. The founder wants the answer first and the reasoning second, in one line, with
   **no em dashes**. Verify before asserting, and say plainly when something has
   not been checked
