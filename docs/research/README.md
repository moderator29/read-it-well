# Research: evidence, not documentation

These reports were written during the build, between August and 23 September
2026, to answer a specific question at a specific moment: what an integration
would cost, where the design drifted from the references, why the example
listings stopped showing, what the stores would reject. Each one records what
was measured and what was recommended **at the time it was written**.

They are kept here, rather than in `../archive/`, because code comments and
`apps/web/scripts/check-deep-links.mjs` cite them by path, and because several
live decisions point back at them for their reasons.

How to read them:

- **They are evidence behind decisions, not specifications.** Nothing here
  describes how the platform works today. The code, the database and the live
  documents indexed in [`../README.md`](../README.md) do.
- **Where one disagrees with a live document or the code, the live document or
  the code wins.** Many of the defects these reports describe have since been
  fixed; [`../THE_AUDIT.md`](../THE_AUDIT.md) is the later, checked record.
- **Do not update them to match the code.** The only edits made to them since are
  path updates when a file they cite moved. A report that is edited after the
  fact stops being evidence of what was known when the decision was made. If a
  report's conclusion is now wrong, say so in the live document that replaced it.
- **Two facts changed after every report here was written (25 September 2026).**
  Vallo no longer holds customer money: the wallet, escrow, pots, withdrawals
  and held payments are retired, payments are split by Paystack at the moment
  of payment, and protection is the Vallo Guarantee
  ([`../MONEY_ARCHITECTURE.md`](../MONEY_ARCHITECTURE.md),
  [ADR 0002](../adr/0002-vallo-never-holds-customer-money.md)). Light mode,
  removed on 23 September, was restored and ships as a Light / Dark / System
  choice ([`../design/LIGHT_MODE_REMOVED.md`](../design/LIGHT_MODE_REMOVED.md)).
  `ESCROW_END_TO_END_RESEARCH.md` in particular describes a design that was
  retired.

| Report | Question it answered |
|---|---|
| [API_INVENTORY_RESEARCH.md](API_INVENTORY_RESEARCH.md) | API and integration inventory: the research |
| [DESIGN_DRIFT_SURVEY.md](DESIGN_DRIFT_SURVEY.md) | Design drift survey: the shipped frontend against the reference images |
| [DISCOVERY_A_SURFACES.md](DISCOVERY_A_SURFACES.md) | DISCOVERY A: SURFACES, JOURNEYS AND THE PROPERTY/STAYS EXPERIENCE |
| [DISCOVERY_B_SYSTEMS.md](DISCOVERY_B_SYSTEMS.md) | Discovery B: systems, money, trust and operations |
| [DISCOVERY_C_BRAND_DESIGN.md](DISCOVERY_C_BRAND_DESIGN.md) | Discovery C: brand, design system, assets and responsive truth |
| [EMAIL_AND_NOTIFICATIONS_RESEARCH.md](EMAIL_AND_NOTIFICATIONS_RESEARCH.md) | Email and notifications: what exists, what it should look like, what is missing |
| [ESCROW_END_TO_END_RESEARCH.md](ESCROW_END_TO_END_RESEARCH.md) | Escrow, end to end: what it actually takes |
| [EXAMPLES_VISIBILITY_PROBE.md](EXAMPLES_VISIBILITY_PROBE.md) | Where the example listings stopped showing |
| [HOST_ONBOARDING_RESEARCH.md](HOST_ONBOARDING_RESEARCH.md) | Host onboarding research |
| [LIGHT_MODE_SURVEY.md](LIGHT_MODE_SURVEY.md) | Light mode survey: what is broken on paper, and why |
| [LISTING_PIPELINE_AUDIT.md](LISTING_PIPELINE_AUDIT.md) | The listing pipeline, audited end to end |
| [MARKETPLACE_ARCHITECTURE_RESEARCH.md](MARKETPLACE_ARCHITECTURE_RESEARCH.md) | Marketplace architecture research |
| [MOBILE_STRATEGY_RESEARCH.md](MOBILE_STRATEGY_RESEARCH.md) | Mobile strategy research: Capacitor shell versus a React Native rewrite |
| [ON_PLATFORM_SWEEP.md](ON_PLATFORM_SWEEP.md) | On-platform sweep |
| [ROLE_ARCHITECTURE_RESEARCH.md](ROLE_ARCHITECTURE_RESEARCH.md) | Role architecture research |
| [STORE_REJECTION_RISK_RESEARCH.md](STORE_REJECTION_RISK_RESEARCH.md) | Store rejection risk research: Vallo on the App Store and Google Play |
| [TWO_MODE_BACKEND_RESEARCH.md](TWO_MODE_BACKEND_RESEARCH.md) | Two-side backend research |
| [TWO_MODE_FRONTEND_RESEARCH.md](TWO_MODE_FRONTEND_RESEARCH.md) | Two-side frontend research: Property and Stays |
| [UI_UNIQUENESS_AND_ADMIN_RESEARCH.md](UI_UNIQUENESS_AND_ADMIN_RESEARCH.md) | UI uniqueness, the toggle defect, the sign-in marks, and the admin console |
| [UNFINISHED_WORK_AUDIT.md](UNFINISHED_WORK_AUDIT.md) | The unfinished work audit |
| [VALUATION_ENGINE_RESEARCH.md](VALUATION_ENGINE_RESEARCH.md) | Valuation engine research: what Vallo can honestly estimate, and when |
