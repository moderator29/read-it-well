# The founder's corpus

Every prompt the founder has written for Vallo, in his own words, deduplicated,
with nothing cut.

He asked for exactly this: "give it my prompts all of it but make it clean no
duplicates of stuffs". So the rules for this directory are:

- **Nothing is summarised.** These are his words, not a reading of them.
- **Nothing is softened or removed.** Where a prompt asks for something hard,
  something expensive or something another file disagrees with, it stays as
  written, and the disagreement is resolved in the handoff rather than by
  quietly editing him.
- **Duplicates are gone.** The referral and rewards specification arrived three
  times in one message. It appears here once.
- **One mechanical edit.** `apps/web/scripts/check-no-em-dash.mjs` fails the
  build on any em dash anywhere under `docs/`, so every em dash became a hyphen.
  That is the only change to any of these files.

## The files

| File | What it carries |
| --- | --- |
| `01-crisis-instruction.md` | The instruction that produced this whole directory, and the handoff next to it. Read it first. It sets the tone and the standard. |
| `02-master-prompt.md` | The master prompt. Sections 1 to 61: the vision, the Space Operating System, the feed as a strategic product, trust, true cost, payments, referrals, monetisation, promotion, analytics, premium features, design direction, motion, mobile, admin, security, what not to build, prioritisation. |
| `03-full-product-prompt.md` | The long form product prompt. Sections 0 to 87: every surface of the product in turn, from the space object and the Space Passport through agreements, inspections, the document vault, discovery, location intelligence, fraud radar, hospitality, maintenance, services, diaspora mode, market intelligence, workspaces, the admin control plane, event architecture, observability, media pipeline, personalisation and the store listings. |
| `04-addendum-blind-spots.md` | The blind spot audit addendum. Sections 1 to 39. What a plan is likely to miss and has to be checked for before it ships. |
| `05-addendum-autonomy.md` | The autonomy addendum. Sections 1 to 20. How a session is expected to work: never stop on a question, leave complete state behind, audit the whole breadth of the application, treat the admin panel as a major product, fix the startup experience, animate product wide, upgrade the landing page, keep the documents and the legal flows looking like one product. |
| `06-payluk-master-prompt.md` | The payments master prompt. Sections 1 to 75. Payluk, the provider abstraction, customer architecture, deposits, withdrawals, bank verification, transfers, standard and milestone escrow, the conditions engine, disputes, refunds, fees, receipts, the internal ledger, webhooks, idempotency, reconciliation, provider failure, the admin financial control plane, every money screen, Yellow Card, testing, rate limits, and the final standard. |
| `07-payluk-status-template.md` | The exact shape of the status report the money work has to hand back, and the thirteen step journey underneath it from DISCOVER to REPEAT. |
| `08-apple-premium-doctrine.md` | The five point doctrine on how a premium brand is actually made: branding, design, animation, music, sound. Short, and the most quotable thing in this directory. |
| `09-referral-rewards-engine.md` | Referral and rewards, locked. The attribution, qualification and risk graph architecture, the full lifecycle with its review window, the policy engine as a fixed registry of named checks, the campaign configuration model, and the budget cap. |
| `10-motion-designer-brief.md` | His motion designer's own prompt: five named easing curves, the card reveal system, the stagger rules, the parallax ratio, the payoff pop, and the page by page list of where to spend the motion. Plus the Get Started page brief and the complaint about the startup screen. |
| `11-inner-onboarding-and-pro.md` | Inner onboarding for individual features, the pro switch that only appears on a paid plan, the monotone Get Started direction, and the premium glass card shaped like a debit card. |
| `12-never-holds-money.md` | His research on why a marketplace should never hold customer money, and the proven pattern he chose. This is the origin of ADR 0002 and ADR 0003. |
| `13-provider-must-not-leak.md` | The rule that no provider name, no provider vocabulary and no provider failure mode may surface in the Vallo experience. |
| `14-fees-vat-and-withdrawals.md` | Commission at 2 percent, VAT at zero while unregistered, the withdrawal minimum, the referral reward figures as campaign configuration rather than product rules, and who pays the fee in a professional marketplace. |

## How to read it without drowning

It is roughly 400 kilobytes. Read in this order, and read `01` properly rather
than skimming it:

1. `01-crisis-instruction.md` and `08-apple-premium-doctrine.md`. Twenty minutes.
   Together they tell you what good means on this product.
2. `10-motion-designer-brief.md` and `11-inner-onboarding-and-pro.md`. These are
   the most directly actionable design instructions in the corpus.
3. `02-master-prompt.md` sections 37 to 46, then `05-addendum-autonomy.md` in
   full. Design direction, then how to work.
4. `06-payluk-master-prompt.md` and `09-referral-rewards-engine.md` before any
   money work.
5. The rest as the work reaches it. `03-full-product-prompt.md` is a reference to
   go back to per surface, not something to read front to back.

## Where these prompts contradict each other

They do, in a few places, because they were written over several days as
decisions changed. Every contradiction found so far is resolved in
`docs/sessions/DIRECTIVES-2026-10-05.md`, which is the dated superseding layer:
later entries beat earlier ones, and it beats everything in this directory where
the two disagree on a decision. Where it is silent, the newest prompt here wins.

If you find a contradiction that nothing resolves, decide it, write down what
you decided and why, and keep moving. Do not stop to ask.
