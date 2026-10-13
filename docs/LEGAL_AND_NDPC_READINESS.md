# Legal pages and NDPC readiness

**This is a readiness assessment, not legal advice.** It records what the repository shows, with citations, and says UNKNOWN where the repository cannot answer; a Nigerian solicitor and the Data Protection Officer must confirm every conclusion before anyone relies on it.

Written 6 October 2026 on branch `claude/vallo-qa-release`. Method: directive D41 in `docs/sessions/DIRECTIVES-2026-10-05.md` ("Measure, never quote"), so every statement below was read from the tree or fetched, not copied from an older status document. NDPC means the Nigeria Data Protection Commission; NDPA means the Nigeria Data Protection Act 2023.

## 1. Which legal routes exist and return a page

Existence in the tree, and whether a signed-out visitor may reach it. The gate is `isPublicPath` in `apps/web/src/proxy.ts` (public first segments listed at lines 140 to 190 in the current file; the explanatory comment is at lines 100 to 130). On 6 October 2026 every route marked "live 200" below was also fetched from `https://www.vallospaces.com/<route>` and returned HTTP 200 with no redirect.

| Route | In the tree | Public (no sign-in) | Live on 6 Oct |
| --- | --- | --- | --- |
| `/privacy` | `apps/web/src/app/(site)/privacy/page.tsx`, text from `apps/web/src/lib/legal/privacy.tsx` | yes, `"privacy"` in the public segments | 200 |
| `/terms` | `apps/web/src/app/(site)/terms/page.tsx`, text from `lib/legal/terms.tsx` | yes | 200 |
| `/eula` | `(site)/eula/page.tsx`, `lib/legal/eula.tsx` | yes | 200 |
| `/disclaimer` | `(site)/disclaimer/page.tsx`, `lib/legal/disclaimer.tsx` | yes (`"disclaimer"`, proxy.ts:165) | 200 |
| `/cancellations` | `(site)/cancellations/page.tsx` | yes | 200 |
| `/safety` | `(site)/safety/page.tsx` | yes | 200 |
| `/standards` | `(site)/standards/page.tsx` | yes | 200 |
| `/delete-account` | `(site)/delete-account/page.tsx` | yes, deliberately (also carries the restore form) | 200 |
| `/help` | `(site)/help/page.tsx` (mounts the support chat) | yes | 200 |
| `/contact` | `(site)/contact/page.tsx` (the contact form writes a `support_tickets` row) | yes | 200 |
| `/legal/privacy`, `/legal/terms`, `/legal/disclaimer` | `apps/web/src/app/(app)/legal/*/page.tsx` | no, signed-in copies, set `noindex` | not tested (need a session) |
| A cookie page or cookie-consent route | does NOT exist | n/a | n/a |
| A dedicated data-rights or subject-access page | does NOT exist as a page | n/a | n/a |

Notes.

- **Cookies.** There is no cookie route and no consent banner. The only consent code found is the AI-assistant consent (`apps/web/src/app/(app)/settings/AiConsentCard.tsx`, `lib/ai/consent.ts`). Cookie terms live inside the privacy notice, section 9 (`lib/legal/privacy.tsx:467` to `:473`), which says only functional cookies are used, there is no third-party analytics and no advertising or tracking cookie. Whether a consent banner is legally required for functional-only cookies under the NDPA is UNKNOWN: the solicitor must answer. Session 1's table (`docs/sessions/SESSION-1-RESPONSE.md:151`) lists "no cookie consent" as a gap, which is a claim, not an answer.
- **Data rights.** There are three working channels but no single page that names them: (1) Settings, Privacy and Security, "Download your data", which calls `GET /api/account/export` (`apps/web/src/app/api/account/export/route.ts`, described in `docs/SUBJECT_ACCESS.md`); (2) self-serve deletion, explained at `/delete-account` and started in the app under Settings then Account; (3) the contact form at `/contact` for everything else (`privacy.tsx:425` to `:461`, section 8 of the notice). Section 8 of the notice states the rights and the right to complain to the NDPC.
- **Two copies of the legal text** (public and in-app) are rendered from the same `lib/legal/*.tsx` sources, so they cannot drift. The in-app copies are not indexed on purpose.

## 2. What the store listings promise, and whether each route exists

A dead privacy URL is an automatic rejection. Each URL the listing material promises, checked against the tree and live:

| Promise | Where it is promised | Route in tree | Live 6 Oct |
| --- | --- | --- | --- |
| Privacy Policy URL `https://www.vallospaces.com/privacy` | `docs/store/LISTING_COPY.md:72`, `docs/store/PRIVACY_LABELS.md:132`, `docs/VALLO_IOS_RELEASE_CHECKLIST.md` step 9, `docs/VALLO_ANDROID_RELEASE_CHECKLIST.md:41` | yes | 200 |
| Support URL `https://www.vallospaces.com/help` | `docs/store/LISTING_COPY.md:70`, iOS checklist step 9 | yes | 200 |
| Marketing URL `https://www.vallospaces.com` | `docs/store/LISTING_COPY.md:71` | yes (`(landing)/page.tsx`) | not separately fetched; the apex 308s to www (`docs/VALLO_NATIVE_RELEASE_AUDIT.md`, F-06) |
| Account deletion URL `https://www.vallospaces.com/delete-account` | `docs/store/PRIVACY_LABELS.md:66` and `:152`, Android checklist:41, `docs/STORE_SUBMISSION_NOTES.md` | yes | 200 |

So no store-promised URL is dead as of today. What this does NOT establish: that the privacy notice's content is complete enough for each store (see sections 3 and 5), and that the App Store Connect and Play Console fields actually hold these URLs. Whether the founder has entered them is UNKNOWN from the repository.

Three content problems that a reviewer or regulator could reach from those URLs:

1. **The privacy notice does not mention page-speed samples.** `web_vitals_samples` exists (`supabase/migrations/20260928225532_v80_speed_measured_on_the_phones_people_actually_use.sql:23`) and the store forms now declare it (`docs/store/PRIVACY_LABELS.md`), but `lib/legal/privacy.tsx` has no mention of speed, performance, page load or diagnostics (searched 6 Oct). The notice needs a sentence, and `PRIVACY_VERSION` (`lib/legal/versions.ts:41`, `2026-09-25`) moves with it, which in turn makes existing receipts stale and the reviewer account needs re-seeding (`docs/STORE_SUBMISSION_NOTES.md` section 2).
2. **Crash reporting.** Sentry is named in the notice "only when crash reporting is switched on" (`privacy.tsx:289`). Whether `SENTRY_DSN` is set in Vercel Production is UNKNOWN (last recorded NOT SET, `docs/THE_AUDIT.md:49`, 23 Sep).
3. **The controller is under-identified.** `COMPANY_NDPC_REGISTRATION` is `null` (`apps/web/src/lib/legal/company.ts`, the NDPC constant), so the notice says nothing about a registration (`privacy.tsx:58` to `:63` renders it only when set). That is honest, and better than implying one, but it is a gap (section 3 below). The RC number is set: RC 9870413 (`company.ts`, `COMPANY_RC_NUMBER`).

## 3. NDPC readiness: what exists, and what a review would still want

### 3.1 What already exists in the repository

| Item | Where | State, as read on 6 Oct |
| --- | --- | --- |
| Privacy notice written for the NDPA, with lawful bases (section 4), rights (section 8), breach statement (section 11), controller and DPO (opening) | `apps/web/src/lib/legal/privacy.tsx` | live; version `2026-09-25` |
| Named Data Protection Officer | `company.ts`, `DATA_PROTECTION_OFFICER = "Omojuni Oluwaseyifunmi Ebenezer"` | named; the founder holds it personally, described in the file as a disclosed arrangement |
| Retention and destruction schedule | `docs/RETENTION_SCHEDULE.md` | real but **its own header says "Status: DRAFT, not yet approved"**, written 14 September 2026, and it says most periods were sentences and not mechanisms when checked on 23 September; only the account purge (`/api/cron/account-purge`, daily 03:15, `apps/web/vercel.json:13`) and the price-check sweep were mechanisms at that time. It carries four open questions for a solicitor (section 7) and states that "I have not verified the statutory periods cited above against the text of the Acts". It is therefore not a current, approved schedule. Which later periods have since become code is UNKNOWN without reading each job; the SCUML five-year records are covered in `docs/COMPLIANCE_SCUML.md` |
| Subject access, self-serve and by request | `docs/SUBJECT_ACCESS.md`, `apps/web/src/lib/account/export.ts`, `app/api/account/export/route.ts` | real. The by-request route is a staff procedure with a 30 day send and an `audit_log` row (`account.subject_access`). Known limit: the export lists the retired money tables as `unavailable` and omits the newer money records (`deal_agreements`, `guarantee_claims`, payout accounts), per the file's own dated note of 29 September |
| Account deletion with a 30 day grace and anonymising purge | `/delete-account`, `docs/RETENTION_SCHEDULE.md` sections 3.2 and 5; the NDPA-rights channel concern about a `null` in a deletion message (section 5.3 of that file) | live; whether the `null` message bug was fixed is UNKNOWN (not re-read) |
| AML/CFT runbook for staff (sanctions, STR, never tip off) | `docs/COMPLIANCE_RUNBOOK.md`, `docs/COMPLIANCE_SCUML.md`, `docs/AML_COMPLIANCE_GAP.md` | real for money-laundering duties (SCUML/EFCC). This is NOT data-protection compliance and must not be read as such |
| Processor disclosure with an automated truth test | `lib/legal/privacy-truth.test.ts` | fails if the code calls a processor the notice does not name; it does not check this file's forms |
| Safety material | `docs/safety/BLOCKED_TERMS_PROPOSAL.md` | a proposal for the objectionable-content filter, not a data-protection document |
| Security grant state | `docs/security/GRANT_STATE.md` | a database-grant record; relevant evidence for "appropriate security measures", not a policy |

### 3.2 What a readiness review would still want

| Item | Finding | Who must answer |
| --- | --- | --- |
| **NDPC registration and its number** | NOT filed. `company.ts` says Vallo is a data controller of major importance because of what agent verification collects, so registration is required "before Launch rather than optional"; the number is `null`. That classification is the code's own comment, not a legal opinion. Whether registration and annual compliance-audit filing obligations apply, and at what thresholds, is UNKNOWN from the repository (it depends on the NDPC's current guidance on "major importance" classification and fees, which this assessment did not research) | Solicitor, then the founder to file. Tracked as K10 in `docs/sessions/FEATURE-REGISTER.md:374` and F.9 in `docs/research/STORE_REJECTION_RISK_RESEARCH.md:962` |
| **A DPO or contact who is not only the founder** | A named DPO exists (the founder). A role title with no reachable channel is a gap: the notice routes requests through `/contact` (`privacy.tsx:64` to `:66`, `SUPPORT_HREF = "/contact"`), and no dedicated DPO mailbox is configured (`SUPPORT_EMAIL` is null unless `NEXT_PUBLIC_SUPPORT_EMAIL` is set; recorded NOT SET on 23 Sep, current state UNKNOWN). Session 1 recommended a DPO who is not the founder (`docs/sessions/SESSION-1-RESPONSE.md:785`) | Founder, with the solicitor on whether the founder may hold the role |
| **Lawful basis record** | The notice states lawful bases per purpose (section 4, `privacy.tsx:215` onward). A separate record of processing activities (what is processed, on what basis, for how long, by which processor) was NOT found in `docs/`. The notice and `PRIVACY_LABELS.md` together approximate one but neither is the NDPA's accountability record | Solicitor to say what the Act requires in written form; DPO to keep it |
| **Retention schedule** | See 3.1: a DRAFT, unapproved, with unverified statutory periods and four open solicitor questions. Needs approval, then the notice reconciled to it ("the notice must not promise a period this schedule does not enforce", `RETENTION_SCHEDULE.md` section 6) | Founder to approve, solicitor to confirm section 7 |
| **Subject access route** | Exists and documented (`docs/SUBJECT_ACCESS.md`). Gaps: no single public page names the channels; newer money records are missing from the export; the 30 day by-request deadline is a house rule, and the NDPA's own response period was not verified here | DPO; solicitor on the response period |
| **Breach notification procedure** | The notice promises it: "we will notify the NDPC and affected users as the NDPA requires" (`privacy.tsx:510` to `:511`). **No breach-response procedure document was found.** A search of `docs/` for "incident response", "breach notification", "data breach" and "personal data breach" returned only `docs/archive/recommendations-inbox.md`. There is no runbook naming who decides, the clock, the NDPC submission route, or the template for affected users. The notice's promise currently rests on nothing written | Founder and DPO to write it; solicitor to supply the NDPA deadline and the NDPC route, which are UNKNOWN here |
| **Cross-border transfer basis** | The notice names Supabase (Ireland), Vercel (United States), Resend (United States), Anthropic (United States), Paystack and Yellow Card (Nigeria) (`privacy.tsx:255` onward). A transfer safeguard record per recipient was NOT found. AI transfers have a consent gate (`lib/ai/consent.ts`) | Solicitor |
| **Data protection impact assessment** | None found in `docs/`. Sensitive processing exists (NIN, government ID, business documents, precise location). Whether a DPIA is required is UNKNOWN | Solicitor and DPO |
| **Staff training and processor contracts** | Not in the repository. The notice says each provider is "under contract". The contracts and their data protection terms are UNKNOWN | Founder |
| **Cookie and tracking position** | Functional cookies only, per the notice. No consent banner (section 1). Whether this satisfies the NDPA is UNKNOWN | Solicitor |

### 3.3 Claims in shipped copy to reconcile

- `docs/RECOMMENDATIONS.md:1220` (`LG-1`) records "The landing page claims NDPA compliance as a fact", status OPEN. A search of `apps/web/src` on 6 October found no such sentence in the landing source, so either it was fixed without closing the row or it lives somewhere not searched. Do not claim "NDPA compliant" anywhere while registration is unfiled and the retention schedule is a draft. UNKNOWN which is true until the row's owner confirms.

## 4. D50 and D48: the provider abstraction never governs the legal surface

**Binding, from `docs/sessions/DIRECTIVES-2026-10-05.md` D50:** "The abstraction governs the product surface, never the legal surface." Where a provider name is required by a card-network rule, a banking rule, a provider agreement, a receipt, a KYC flow, the Terms or a transaction disclosure, it is shown. The Terms, receipts and KYC flows must name the actual provider holding or moving the money. A provider is never hidden to make the product look as if Vallo performs the function.

What the legal text says today (read 6 Oct):

| Surface | What it says | Assessment |
| --- | --- | --- |
| Terms section 4 (`lib/legal/terms.tsx:246` to `:287`) | `NO_CUSTODY_SENTENCE`: "Vallo never holds your money ... through our payment processor"; "no wallet and keeps no balance for you" | Consistent with the retired-custody position (`docs/MONEY_ARCHITECTURE.md`; migration `20260925163708_track_a1_vallo_never_holds_customer_money_custody_retired.sql`). **But the Terms say "our payment processor" and never name Paystack** (`terms.tsx:187`, `:255`, `:354`). Only the crypto leg is named: Yellow Card (`terms.tsx` section 4). D50 requires the Terms to name the provider. **Open finding.** The privacy notice does name Paystack and Yellow Card (`privacy.tsx:266` to `:270`) |
| Terms section 14, "The Vallo Guarantee" (`terms.tsx:519` to `:550`) | 1 to 2 percent "set aside ... in a reserve kept apart from Vallo's own money"; "An approved claim is paid ... from the reserve"; "not insurance ... creates no balance in your name" | **Needs counsel before launch.** The words "Vallo Guarantee" plus a pooled reserve that Vallo's staff decide claims against can read as Vallo holding and guaranteeing funds, which D50 condition 2 forbids ("No Vallo sentence says or implies Vallo holds, keeps, owns or guarantees it"). Who actually holds the reserve is stated in the architecture notes as "a separate Paystack subaccount" (`docs/MONEY_ARCHITECTURE.md:20`) and, for crypto, a bank payout to "the reserve's own bank account" (same file, lines 99 and 120), but the account holder's legal name and whether the reserve is Vallo's money in a separate account are UNKNOWN from the repository. The Terms do not say who holds it |
| Disclaimer section 3 (`lib/legal/disclaimer.tsx:71` to `:75`) | "We never hold your money ... not a bank, a wallet provider, an escrow agent or a licensed financial institution" | Consistent with no custody |
| Refund route (`lib/money/copy.ts`, `REFUND_ROUTE`) | "through our payment processor" | Same issue: unnamed in a sentence that also feeds the Terms and the help centre |
| Receipts and KYC flows | Not read in this assessment. Whether each names the provider (Paystack for card payments, the verification provider for NIN and ID) is UNKNOWN | Engineering to check each; the founder and counsel to approve wording |

**D48 (shipped copy telling members Vallo holds their money).** D48 locates the offending strings in `packages/i18n/src/locales/experience-features.en.ts` (lines 149 to 168) on `origin/claude/vallo-experience-upgrade`, with wiring in `components/app/feature-onboarding/first-runs.ts`. On this branch (`claude/vallo-qa-release`) that file does not exist and a search of `apps/web/src` and `packages` for "your wallet", "Open my wallet", "Open escrow" and "held in escrow" found only code comments, a dev fixture string (`app/(dev)/preview/f4/fixtures.ts:389`, a preview harness) and a crypto error line about the user's own crypto wallet (`packages/i18n/src/locales/crypto-pay.en.ts:103`). **No legal page on this branch implies that Vallo holds customer funds.** The risk is on the experience branch and it must be removed there before that branch merges; this assessment did not read that branch. The legal pages here say the opposite, which is correct for today's rail.

**The coming collision.** D50 allows a balance held by a licensed provider (Payluk is the target) under four conditions, one of which is that the words come from `lib/money/copy.ts`, per rail, and that ADR-0003 is accepted. If that ships, the Terms, the privacy notice's processor list, `docs/store/PRIVACY_LABELS.md` ("Vallo holds no money (Track A)", Part B), the Play financial-features declaration and the receipts all change together, and the Terms must then name the provider that holds the balance and say the member's money sits in an account with that provider and not with Vallo. Until then, "Payluk is the target, not the state" (D41); do not write Payluk into any legal page ahead of a live rail.

## 5. Actions, in order of consequence

1. Name Paystack (and Yellow Card where offered) in the Terms wherever they say "our payment processor", and have counsel confirm who holds the Guarantee reserve and rewrite Terms section 14 to say it. Founder decision, counsel wording, engineering edit in `lib/legal/terms.tsx` and `lib/money/copy.ts`.
2. Add the page-speed sentence to the privacy notice and bump `PRIVACY_VERSION`; re-run the reviewer seed afterwards (`docs/STORE_SUBMISSION_NOTES.md`).
3. Read Vercel Production for `SENTRY_DSN`; answer the store crash questions to match (`docs/store/PRIVACY_LABELS.md`).
4. Write the breach-response procedure. It is promised in the notice and does not exist.
5. Approve `docs/RETENTION_SCHEDULE.md` and get the solicitor's answers to its four questions; then reconcile the notice.
6. Decide NDPC registration with counsel and file; put the number in `company.ts`.
7. Decide whether a DPO other than the founder is needed and set up a mailbox or channel that a person watches.
8. Check the receipt and KYC flows for provider naming (D50) and report what each says.

## 6. UNKNOWN register

| UNKNOWN | Why the repository cannot answer | Who answers |
| --- | --- | --- |
| Whether NDPC registration and annual audit filing apply, thresholds, fees, deadlines | Needs the NDPC's current published guidance and legal advice; not in the repository | Solicitor |
| The NDPA deadline and route for breach notification | Not in the repository | Solicitor |
| Whether a cookie banner is required | Legal question | Solicitor |
| Whether a DPIA is required | Legal question | Solicitor and DPO |
| Who legally holds the Guarantee reserve | Architecture notes say a Paystack subaccount; the account holder is not recorded | Founder, from the Paystack dashboard and bank records |
| Whether receipts and KYC flows name the providers | Not read | Engineering |
| Whether `SENTRY_DSN` is set | Needs a read of Vercel Production | Founder |
| Whether the store console URL fields are filled | App Store Connect and Play Console are not visible | Founder |
| Whether any NDPC filing, processor contract or staff training record exists | Held outside the repository, if at all | Founder |
| Whether the `null` support-email message in the deletion path was fixed | Not re-read in this assessment | Engineering |
| Current wording of the experience branch's copy (D48) | That branch was not read | Session 3 |
