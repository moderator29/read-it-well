# Vallo documentation

This index lists the live documentation, grouped by what you are trying to do. When a document disagrees with the code or the database, the code and the database are right, and the document should be fixed in the same change that finds the error.

For setup, architecture and the repository layout, start with the [repository README](../README.md).

## Understand the product

| Document | What it is for |
|---|---|
| [PRODUCT.md](PRODUCT.md) | What Vallo is, who it serves, what a listing is, who can do what, and the vocabulary. Read it first |
| [THE_AUDIT.md](THE_AUDIT.md) | The two-pass pre-store audit of 23 September 2026: every finding with evidence and fix, store readiness, the order of work, and (section 11) what only the founder can do |
| [THE_AUDIT_FIXES.md](THE_AUDIT_FIXES.md) | How each finding in THE_AUDIT was closed: the change, the evidence and the review |
| [THE_HUNDRED.md](THE_HUNDRED.md) | The hundred ranked recommendations of 23 September 2026 (V-01 to V-100). Code comments cite their IDs |
| [RECOMMENDATIONS.md](RECOMMENDATIONS.md) | The register of findings and open work. Code comments cite its IDs |
| [ONE_PERSON_MANY_ACCOUNTS.md](ONE_PERSON_MANY_ACCOUNTS.md) | How one person holding several accounts or workspaces is handled at each gate |
| [BADGES.md](BADGES.md) | Earned badges for agents and members |
| [SOCIAL_DESIGN.md](SOCIAL_DESIGN.md) | The design record for the social layer (Around) |
| [PRICE_CHECK_STAGE_ONE_STATE.md](PRICE_CHECK_STAGE_ONE_STATE.md) | Price Check: what is built and what the numbers say |

## Decisions

| Document | What it is for |
|---|---|
| [ARCHITECTURE_DECISIONS.md](ARCHITECTURE_DECISIONS.md) | ADR-001 to ADR-014 in one file |
| [adr/0002-vallo-never-holds-customer-money.md](adr/0002-vallo-never-holds-customer-money.md) | Vallo never holds customer money (supersedes ADR 0001) |
| [adr/0001-held-payments-custody-purpose-and-the-float.md](adr/0001-held-payments-custody-purpose-and-the-float.md) | Superseded: held payments (escrow), kept as history |
| [API_INVENTORY.md](API_INVENTORY.md) | The third-party integration plan |

## Money

| Document | What it is for |
|---|---|
| [MONEY_ARCHITECTURE.md](MONEY_ARCHITECTURE.md) | **How money moves now**: split at payment, the agreement gate, refunds, the Vallo Guarantee, crypto |
| [archive/retired-custody/](archive/retired-custody/README.md) | The retired wallet, escrow and held-payment documents, kept as history |

## Run and deploy it

| Document | What it is for |
|---|---|
| [ENVIRONMENT.md](ENVIRONMENT.md) | Every credential the code reads, what breaks without it, and where to get it |
| [DEPLOY.md](DEPLOY.md) | The deploy runbook: Vercel, Supabase dashboard steps, Paystack, cron secrets, launch checklist |
| [ADMIN_CONSOLE.md](ADMIN_CONSOLE.md) | The operations handbook for the admin console (a unit test reads this file) |
| [ONBOARDING_A_RESTAURANT.md](ONBOARDING_A_RESTAURANT.md) | What to collect from a restaurant owner, and why |
| [security/GRANT_STATE.md](security/GRANT_STATE.md) | The grant state of the live database |
| [safety/BLOCKED_TERMS_PROPOSAL.md](safety/BLOCKED_TERMS_PROPOSAL.md) | A proposed starter list for the abuse filter |
| [COMPLIANCE_RUNBOOK.md](COMPLIANCE_RUNBOOK.md) | What staff do for each AML/CFT (SCUML) obligation, and in what order |
| [schema/NAMES.md](schema/NAMES.md) | Schema names that mislead, and what they actually hold (a unit test checks it) |
| [SUBJECT_ACCESS.md](SUBJECT_ACCESS.md) | How a person gets a copy of their data: the self-serve export and the by-request route |
| [RETENTION_SCHEDULE.md](RETENTION_SCHEDULE.md) | Data retention and destruction schedule (Nigeria Data Protection Act 2023) |

## Mobile

| Document | What it is for |
|---|---|
| [MOBILE.md](MOBILE.md) | Building, signing and shipping the iOS and Android apps. Section 7 is the Apple plan: the founder's personal account first, then an app transfer to the company account |
| [store/FOUNDER_CHECKLIST.md](store/FOUNDER_CHECKLIST.md), [store/FOUNDER_STEPS.md](store/FOUNDER_STEPS.md) | The founder's store steps, in plain language, and the console click paths |
| [store/LISTING_COPY.md](store/LISTING_COPY.md), [store/PRIVACY_LABELS.md](store/PRIVACY_LABELS.md) | Draft store listing copy and the store privacy answers |
| [MOBILE_READINESS.md](MOBILE_READINESS.md) | Why the native apps load the live origin, and store posture |
| [STORE_SUBMISSION_NOTES.md](STORE_SUBMISSION_NOTES.md) | Decisions taken for App Store and Play Store submission |
| [NATIVE_CI.md](NATIVE_CI.md) | The Android and iOS build workflows and the secrets they need |
| [VALLO_IOS_RELEASE_CHECKLIST.md](VALLO_IOS_RELEASE_CHECKLIST.md), [VALLO_ANDROID_RELEASE_CHECKLIST.md](VALLO_ANDROID_RELEASE_CHECKLIST.md) | Release checklists per platform |
| [VALLO_NATIVE_RELEASE_AUDIT.md](VALLO_NATIVE_RELEASE_AUDIT.md), [VALLO_NATIVE_TEST_MATRIX.md](VALLO_NATIVE_TEST_MATRIX.md) | The native release audit and the device test matrix |

## Notifications and email

| Document | What it is for |
|---|---|
| [push/FIRST_NOTIFICATION.md](push/FIRST_NOTIFICATION.md) | See a push notification work end to end |
| [push/THE_FORTY_EVENTS.md](push/THE_FORTY_EVENTS.md) | Every notification event, walked through |
| [email/WHAT_SENDS.md](email/WHAT_SENDS.md) | What sends email, what refuses, and what is unproven |
| [email/AUTH_EMAILS.md](email/AUTH_EMAILS.md) | The authentication emails: the Send Email Hook route, the templates and their design |
| [../supabase/README.md](../supabase/README.md) | The auth email templates: how to generate and apply them |

## Design

| Document | What it is for |
|---|---|
| [DESIGN_DIRECTION.md](DESIGN_DIRECTION.md) | The design direction. The reference images govern the UI |
| [design/CATALOGUE.md](design/CATALOGUE.md) | An index of every reference image in `design/references/`, including the four admin console renders in `design/references/admin/` |
| [design/GLOW_IDENTITY.md](design/GLOW_IDENTITY.md) | The glow system, measured |
| [design/LIGHT_MODE_REMOVED.md](design/LIGHT_MODE_REMOVED.md) | History: why light mode was removed on 23 September 2026. It was restored on 25 September and ships today (Light, Dark or System, default Dark) |
| [design/VOICE.md](design/VOICE.md) | How the product speaks in empty, loading, offline, failed and done states |
| [design/NAV_STATE.md](design/NAV_STATE.md) | Where back goes, per route (generated) |
| [design/audits/](design/audits/) | Design audits cited by the code |
| [BRAND_MARKS.md](BRAND_MARKS.md) | The glass brand marks |
| [ICON_SYSTEM.md](ICON_SYSTEM.md) | The icon tiers and their rules |
| [IMAGERY.md](IMAGERY.md) | Photography shortlist and licences |
| [TRACK_M_MOTION_PLAN.md](TRACK_M_MOTION_PLAN.md) | The motion plan and reference check of 25 September 2026 |
| [i18n/LOCALE_STATE.md](i18n/LOCALE_STATE.md) | The state of the Yoruba, Hausa and Igbo drafts |

## Company

[archive/HANDOFF_01_COMPANY.md](archive/HANDOFF_01_COMPANY.md) is archived, but it is still the only written record of the company's obligations: registration, data protection and money rules. Lift that content into a live document before relying on it.

## Research and history

- [research/](research/) holds research reports and audits written during the build. They are evidence behind decisions, not specifications. Where one disagrees with a live document above, the live document wins.
- [archive/](archive/) holds retired documents and dated build records: handoffs, build ledgers, sprint notes and one-off audits. It is kept for history and governs nothing. Its [README](archive/README.md) explains more.

Dated build records (handoffs, ledgers, scope files, close-out reports, proof runs, surveys and status reports) live in `archive/`, not at the top of `docs/`. New ones go straight there. The founder's still-open items are in [THE_AUDIT.md](THE_AUDIT.md) section 11.

`research/` is kept where it is, because code comments and one script cite files in it by path. Its [README](research/README.md) says what it is: evidence, not documentation.

`design/proofs/` is ignored by git. Screenshot runs written there by the scripts in `scripts/design/` stay on the machine that made them.
