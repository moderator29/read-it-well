# Vallo documentation

This index lists the live documentation, grouped by what you are trying to do. When a document disagrees with the code or the database, the code and the database are right, and the document should be fixed in the same change that finds the error.

For setup, architecture and the repository layout, start with the [repository README](../README.md).

## Understand the product

| Document | What it is for |
|---|---|
| [PRODUCT.md](PRODUCT.md) | What Vallo is, who it serves, what a listing is, who can do what, and the vocabulary. Read it first |
| [PLATFORM_STATUS.md](PLATFORM_STATUS.md) | The latest measured state of the platform: what works, what is proven, what is not |
| [RECOMMENDATIONS.md](RECOMMENDATIONS.md) | The register of findings and open work. Code comments cite its IDs |
| [ONE_PERSON_MANY_ACCOUNTS.md](ONE_PERSON_MANY_ACCOUNTS.md) | How one person holding several accounts or workspaces is handled at each gate |
| [BADGES.md](BADGES.md) | Earned badges for agents and members |
| [SOCIAL_DESIGN.md](SOCIAL_DESIGN.md) | The design record for the social layer (Around) |
| [PRICE_CHECK_STAGE_ONE_STATE.md](PRICE_CHECK_STAGE_ONE_STATE.md) | Price Check: what is built and what the numbers say |

## Decisions

| Document | What it is for |
|---|---|
| [ARCHITECTURE_DECISIONS.md](ARCHITECTURE_DECISIONS.md) | ADR-001 to ADR-014 in one file |
| [adr/0001-held-payments-custody-purpose-and-the-float.md](adr/0001-held-payments-custody-purpose-and-the-float.md) | Held payments (escrow): custody, the purpose gate and the float |
| [escrow/RELEASE_CONDITION.md](escrow/RELEASE_CONDITION.md) | A decision paper on release conditions for the agency fee leg. Nothing in it is implemented |
| [API_INVENTORY.md](API_INVENTORY.md) | The third-party integration plan |

## Money

| Document | What it is for |
|---|---|
| [WITHDRAWAL_PATH.md](WITHDRAWAL_PATH.md) | What happens after money leaves a wallet: doors, webhook, sweeper and email |
| [wallet/CRYPTO_DEPOSITS.md](wallet/CRYPTO_DEPOSITS.md) | Crypto top-ups through Yellow Card |
| [wallet/SAVINGS_POTS.md](wallet/SAVINGS_POTS.md) | Savings pots |
| [escrow/PROBE_STATE.md](escrow/PROBE_STATE.md) | The escrow probes and what they prove |

## Run and deploy it

| Document | What it is for |
|---|---|
| [ENVIRONMENT.md](ENVIRONMENT.md) | Every credential the code reads, what breaks without it, and where to get it |
| [DEPLOY.md](DEPLOY.md) | The deploy runbook: Vercel, Supabase dashboard steps, Paystack, cron secrets, launch checklist |
| [ADMIN_CONSOLE.md](ADMIN_CONSOLE.md) | The operations handbook for the admin console (a unit test reads this file) |
| [ONBOARDING_A_RESTAURANT.md](ONBOARDING_A_RESTAURANT.md) | What to collect from a restaurant owner, and why |
| [security/GRANT_STATE.md](security/GRANT_STATE.md) | The grant state of the live database |
| [safety/BLOCKED_TERMS_PROPOSAL.md](safety/BLOCKED_TERMS_PROPOSAL.md) | A proposed starter list for the abuse filter |
| [RETENTION_SCHEDULE.md](RETENTION_SCHEDULE.md) | Data retention and destruction schedule (Nigeria Data Protection Act 2023) |

## Mobile

| Document | What it is for |
|---|---|
| [MOBILE.md](MOBILE.md) | Building, signing and shipping the iOS and Android apps |
| [MOBILE_READINESS.md](MOBILE_READINESS.md) | Why the native apps load the live origin, and store posture |
| [STORE_SUBMISSION_NOTES.md](STORE_SUBMISSION_NOTES.md) | Decisions taken for App Store and Play Store submission |

## Notifications and email

| Document | What it is for |
|---|---|
| [push/FIRST_NOTIFICATION.md](push/FIRST_NOTIFICATION.md) | See a push notification work end to end |
| [push/THE_FORTY_EVENTS.md](push/THE_FORTY_EVENTS.md) | Every notification event, walked through |
| [email/WHAT_SENDS.md](email/WHAT_SENDS.md) | What sends email, what refuses, and what is unproven |
| [../supabase/README.md](../supabase/README.md) | The auth email templates: how to generate and apply them |

## Design

| Document | What it is for |
|---|---|
| [DESIGN_DIRECTION.md](DESIGN_DIRECTION.md) | The design direction. The reference images govern the UI |
| [design/CATALOGUE.md](design/CATALOGUE.md) | An index of every reference image in `design/references/` |
| [design/GLOW_IDENTITY.md](design/GLOW_IDENTITY.md) | The glow system, measured |
| [design/LIGHT_MODE_REMOVED.md](design/LIGHT_MODE_REMOVED.md) | Why light mode was removed |
| [design/NAV_STATE.md](design/NAV_STATE.md) | Where back goes, per route (generated) |
| [design/audits/](design/audits/) | Design audits cited by the code |
| [BRAND_MARKS.md](BRAND_MARKS.md) | The glass brand marks |
| [ICON_SYSTEM.md](ICON_SYSTEM.md) | The icon tiers and their rules |
| [IMAGERY.md](IMAGERY.md) | Photography shortlist and licences |
| [i18n/LOCALE_STATE.md](i18n/LOCALE_STATE.md) | The state of the Yoruba, Hausa and Igbo drafts |

## Company

[archive/HANDOFF_01_COMPANY.md](archive/HANDOFF_01_COMPANY.md) is archived, but it is still the only written record of the company's obligations: registration, data protection and money rules. Lift that content into a live document before relying on it.

## Research and history

- [research/](research/) holds research reports and audits written during the build. They are evidence behind decisions, not specifications. Where one disagrees with a live document above, the live document wins.
- [archive/](archive/) holds retired documents and the scaffolding of earlier build sessions: handoffs, ledgers, sprint notes and audits. It is kept for history and governs nothing. Its [README](archive/README.md) explains more.

A number of top-level files belong to build sessions that are still running: `HANDOFF_04`, `HANDOFF_05`, `HANDOFF_07`, `HANDOFF_08`, `HANDOFF_09`, the `BUILD_*_LEDGER.md` files, `SESSION_B_SCOPE.md`, `SESSIONS_CLOSE_OUT.md`, `BUILT_VS_PROVEN.md`, `FOUNDER_OPEN_ITEMS.md`, `FOUNDER_ARTWORK_NEEDED.md`, `PROMPTS_*.md`, `PROOF_RUN_*.md`, `PLATFORM_SURVEY_*.md`, `design/SWEEP.md`, `design/TRACK_G_STATE.md` and `design/REFERENCE_UPLOADS_*.md`. They move to `archive/` when those sessions close. They are working notes, not documentation.
