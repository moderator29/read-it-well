# Addendum: autonomous execution and complete product upgrade

Source: the founder's message of 7 October 2026, the one that asked for the
handoffs to be deleted and rewritten. The third follow-up addendum, sections 1 to 20.

This file is the founder's own words. It is not a summary and it has not been
edited for content. The only change made to it is mechanical: the em dash is
forbidden everywhere under `docs/` by `apps/web/scripts/check-no-em-dash.mjs`,
so every em dash has been replaced with a hyphen. Nothing was cut, softened,
reordered or paraphrased.

---

THIRD FOLLOW-UP ADDENDUM

AUTONOMOUS EXECUTION + COMPLETE PRODUCT UPGRADE + NO-BLIND-SPOTS REQUIREMENT

This addendum is mandatory.

It strengthens the previous Master Prompt and Follow-Up Addendums.

The objective is to ensure that the entire Vallo upgrade is executed autonomously, comprehensively, and continuously, without requiring the user to supervise routine decisions or repeatedly answer questions.

⸻

1. ALL THREE IMPLEMENTATION SESSIONS MUST WORK AUTONOMOUSLY

Sessions 2, 3, and 4 must operate as autonomous engineering sessions.

Do not repeatedly ask the user:
	•	what to inspect
	•	which files to modify
	•	which feature to implement
	•	whether you can inspect the repository
	•	whether you can inspect Supabase
	•	whether you can inspect Vercel
	•	whether you can inspect GitHub
	•	whether you can run tests
	•	whether you can investigate existing implementation
	•	whether you can fix obvious issues
	•	whether you should improve something clearly required by the approved strategy.

Use the available authorized project access and proceed.

Do not expose secrets.

Do not perform destructive or irreversible actions casually.

For normal implementation, investigation, testing, refactoring, auditing, documentation updates, UI work, and debugging:

DO THE WORK.

⸻

2. NEVER STOP JUST BECAUSE YOU HAVE A QUESTION

If a session encounters something it genuinely cannot resolve independently, do not simply stop and ask the user in chat.

First:
	1.	Investigate the repository.
	2.	Inspect related implementation.
	3.	Inspect database/schema/configuration where relevant.
	4.	Search existing documentation.
	5.	Check dependencies.
	6.	Check previous session reports.
	7.	Determine whether the decision can reasonably be made from the established Vallo strategy.
	8.	Make the safest production-quality decision if possible.

Only escalate a genuinely blocking decision.

⸻

3. MANDATORY RESPONSE FILE PROTOCOL

Every session must maintain a written communication channel through the repository.

Session 1

Session 1 must choose and clearly establish the filenames for:
	•	Session 1 findings/output
	•	Session 2 instructions
	•	Session 3 instructions
	•	Session 4 instructions
	•	ongoing decisions/blockers if required.

For example:

SESSION-1-RESPONSE.md

SESSION-2-HANDOFF.md

SESSION-3-HANDOFF.md

SESSION-4-HANDOFF.md

But Session 1 may choose better filenames if the repository already has a documentation convention.

The chosen filenames must be explicitly stated in the Session 1 output.

⸻

Sessions 2, 3 and 4

If a session needs to communicate anything back to the user or to the next session, it must write it into the designated response/handoff Markdown file.

For example:

response.md

or whatever filename Session 1 establishes.

Do not rely on the user remembering information from the chat.

The repository should contain the authoritative execution record.

⸻

4. EVERY SESSION MUST LEAVE A COMPLETE STATE BEHIND

At the end of each session, document:

Completed

What was actually implemented.

Changed

Important files/systems/components changed.

Tested

What tests/checks were actually run.

Failed

Anything that failed.

Remaining

Anything intentionally unfinished.

Decisions

Important architectural/product decisions made.

Risks

Anything that could still cause problems.

Next Session

Exactly what the next session needs to know.

Do Not Repeat

Work already completed so the next session does not unnecessarily redo it.

⸻

5. THE UPGRADE IS NOT LIMITED TO THE FEATURES LISTED IN THE PROMPTS

This is extremely important.

Do not interpret the previous prompts as:

“Only implement the explicitly listed features.”

The prompts describe the strategic direction.

The actual mission is:

Upgrade the entire existing Vallo platform wherever the audit shows it is incomplete, outdated, inconsistent, broken, poorly designed, poorly implemented, or below the required production standard.

The existing application contains many areas.

Some may not have been explicitly mentioned in the strategy documents.

Those areas must still be discovered and audited.

Do not leave an existing screen untouched simply because it was not explicitly named in the prompt.

⸻

6. FULL APPLICATION-BREADTH AUDIT

Session 1 must create an actual inventory of the current platform.

Inspect:
	•	every route
	•	every dashboard
	•	every workspace
	•	every navigation item
	•	every major flow
	•	every modal
	•	every form
	•	every settings area
	•	every profile
	•	every listing workflow
	•	every admin page
	•	every mobile page
	•	every web page
	•	every authentication state
	•	every onboarding state
	•	every empty state
	•	every error state
	•	every loading state
	•	every success state
	•	every detail page
	•	every management page
	•	every document area
	•	every payment flow
	•	every notification surface.

Then classify each:

KEEP → UPGRADE → REWORK → COMPLETE → REPLACE → DEFER

Do not allow hidden/forgotten areas to escape the upgrade.

⸻

7. NAVIGATION AND BACK BUTTONS

Perform a dedicated navigation audit.

There are currently areas where navigation is incomplete or where users do not have an obvious way to return.

Audit every flow for:
	•	back button
	•	close button
	•	breadcrumb where useful
	•	browser back behaviour
	•	mobile back behaviour
	•	Android back
	•	iOS navigation
	•	modal dismissal
	•	nested pages
	•	deep links
	•	notification routing
	•	post-action return destination.

Every screen should have an intentional navigation model.

Do not mechanically add a back button everywhere.

Determine the correct navigation pattern for each context.

⸻

8. ADMIN PANEL MUST BE TREATED AS A MAJOR PRODUCT

The admin panel is not a secondary dashboard.

It is Vallo’s internal operating system.

Audit what actually exists today versus what the strategy requires.

The appropriate authorized super-admin should be able to see and operate the necessary areas, including where applicable:
	•	users
	•	businesses
	•	workspaces
	•	listings
	•	spaces
	•	verification
	•	identity checks
	•	property evidence
	•	reports
	•	fraud
	•	risk
	•	referrals
	•	rewards
	•	payouts
	•	transactions
	•	disputes
	•	agreements
	•	inspections
	•	documents
	•	support
	•	reviews
	•	moderation
	•	promotions
	•	subscriptions
	•	entitlements
	•	analytics
	•	system health
	•	feature flags
	•	audit logs
	•	configuration
	•	operational metrics.

Do not assume that because a database table exists, the admin actually has a usable control surface for it.

⸻

9. ADMIN MOBILE EXPERIENCE MUST BE REBUILT/UPGRADED

The current admin experience is not good enough on mobile.

Treat mobile admin as a first-class experience.

Audit and improve:
	•	navigation
	•	tables
	•	cards
	•	filters
	•	search
	•	detail pages
	•	actions
	•	approvals
	•	verification
	•	reports
	•	fraud review
	•	financial views
	•	audit logs
	•	charts
	•	responsive layouts
	•	touch targets
	•	sticky actions
	•	bottom sheets
	•	mobile-safe modals
	•	scrolling
	•	keyboard behaviour
	•	safe areas.

Do not simply shrink desktop tables onto a phone.

Design appropriate mobile workflows.

⸻

10. FIRST APP SCREEN / STARTUP EXPERIENCE

The uploaded reference image represents the current Vallo startup/splash experience:

deep navy background + centered glowing VALLO logo/icon.

This screen must be deliberately redesigned.

Do not simply leave it as a static image.

Create a premium startup sequence inspired by the current brand direction.

It should include appropriate:
	•	logo entrance
	•	subtle light/glow movement
	•	logo/icon animation
	•	refined timing
	•	transition into the actual application
	•	authentication-state restoration
	•	deep-link restoration
	•	appropriate loading state.

The experience should feel like a polished native application.

CRITICAL

The existing issue where the user can remain staring at the logo for a very long time must be investigated at the architectural level.

Do NOT solve it by:

“Show the splash for exactly 1.5 seconds.”

Instead identify why the app is taking so long.

Investigate:
	•	Capacitor startup
	•	WebView initialization
	•	remote origin/server URL
	•	native shell
	•	JavaScript boot
	•	Next.js hydration
	•	Supabase initialization
	•	authentication restoration
	•	session retrieval
	•	data preloading
	•	plugins
	•	deep links
	•	push initialization
	•	routing
	•	network requests
	•	blocking API calls
	•	splash configuration.

Target a fast premium startup experience while ensuring the actual app is ready.

The animation must never conceal a broken or slow initialization architecture.

⸻

11. COMPLETE FRONTEND UPGRADE USING THE REFERENCE IMAGE LIBRARY

The approximately 60 reference images already available in GitHub must be actively inspected.

Session 1 must ensure Session 3 receives explicit instructions to use them as a design/interaction research corpus.

The frontend upgrade must cover the whole application, not just selected screens.

Reference analysis should influence:
	•	navigation
	•	search
	•	cards
	•	space discovery
	•	listing detail
	•	maps
	•	Feed/Discover
	•	profiles
	•	dashboards
	•	forms
	•	checkout/payment
	•	notifications
	•	documents
	•	trust
	•	analytics
	•	admin
	•	onboarding
	•	empty states
	•	loading
	•	errors
	•	transitions
	•	animations
	•	mobile layouts
	•	responsive behaviour.

Extract patterns.

Do not clone another platform.

Vallo must emerge as its own product.

⸻

12. ANIMATION MUST BE PRODUCT-WIDE

Audit the entire application for appropriate motion.

Include where useful:
	•	onboarding
	•	startup
	•	Get Started
	•	navigation
	•	page transitions
	•	search
	•	filters
	•	map interactions
	•	cards
	•	Feed
	•	Space Passport
	•	verification
	•	booking
	•	payments
	•	agreements
	•	inspections
	•	dashboards
	•	notifications
	•	success states
	•	loading
	•	empty states
	•	error recovery.

Motion must remain:

premium + fast + purposeful + accessible + performant.

Support reduced-motion preferences.

Do not turn Vallo into a gaming interface.

⸻

13. LANDING PAGE MUST BE UPGRADED TO THE NEXT LEVEL

The landing page is part of the product.

Do not leave it as a generic marketing website.

Upgrade:
	•	hero
	•	typography
	•	visual hierarchy
	•	motion
	•	product storytelling
	•	cards
	•	scroll interactions
	•	feature demonstrations
	•	Space OS story
	•	Trust
	•	Discover
	•	Intelligence
	•	Transactions
	•	Operations
	•	ecosystem
	•	use cases
	•	audience sections
	•	social proof where legitimate
	•	CTA flows
	•	mobile experience.

Explore sophisticated patterns such as:
	•	editorial/“breaking news” style information moments
	•	dynamic cards
	•	product previews
	•	layered motion
	•	intelligent scroll transitions
	•	interactive space examples
	•	live-feeling discovery sections
	•	animated maps
	•	Space Passport demonstrations.

But maintain restraint.

The landing page should feel like a serious venture-backed technology product, not an over-designed template.

⸻

14. DOCUMENTATION MUST BE COMPLETELY UPDATED

All Vallo documentation must reflect the actual new direction.

Audit and update:
	•	product docs
	•	user docs
	•	workspace docs
	•	feature docs
	•	developer docs
	•	API documentation where applicable
	•	payment documentation
	•	verification documentation
	•	referral documentation
	•	trust documentation
	•	admin documentation
	•	onboarding documentation
	•	support documentation
	•	release documentation.

Remove outdated descriptions.

Remove contradictory terminology.

Make everything professionally structured and readable.

⸻

15. TERMS, PRIVACY AND LEGAL FLOWS

Audit all legal-facing content and flows.

This includes:
	•	Terms of Service
	•	Privacy Policy
	•	cookie/consent where applicable
	•	payment terms
	•	booking terms
	•	listing terms
	•	referral/rewards terms
	•	verification disclaimers
	•	user-generated content rules
	•	professional/service marketplace terms
	•	cancellation/refund language
	•	dispute language
	•	relevant agreements.

They must align with the new Vallo direction.

Do not invent legal claims or present Vallo as a regulated financial institution.

Where actual legal drafting/review is required, identify it clearly for professional/legal review rather than pretending engineering has provided legal advice.

⸻

16. DOCS + LEGAL + LANDING PAGE MUST LOOK LIKE ONE PRODUCT

Do not let:

App + website + docs + legal + admin

look like five unrelated products.

They should share:
	•	brand
	•	typography
	•	terminology
	•	design tokens
	•	tone
	•	navigation principles
	•	visual quality
	•	responsive behaviour.

⸻

17. FINAL COMPLETENESS CHECK

Before Session 1 generates the implementation prompts, ask:

“What parts of the current Vallo product did we fail to mention?”

Then actually inspect the repository to answer that question.

Do not rely only on the prompts.

The repository is the source of truth.

If a major area exists but is:
	•	unfinished
	•	broken
	•	inconsistent
	•	inaccessible
	•	visually outdated
	•	poorly responsive
	•	missing navigation
	•	missing permissions
	•	missing admin controls
	•	missing backend support
	•	missing mobile support
	•	missing loading/error states

it must be captured in the final plan.

⸻

18. SESSION 1 MUST PRODUCE REAL EXECUTION PROMPTS

The final Session 1 output must contain actual executable prompts, not generic handoff summaries.

It must produce:

SESSION 2 MASTER EXECUTION PROMPT

Backend/core/infrastructure.

SESSION 3 MASTER EXECUTION PROMPT

Frontend/product/design/mobile/experience.

SESSION 4 MASTER EXECUTION PROMPT

QA/release/security/performance/final polish.

Each must be detailed enough that the corresponding Claude Code session can begin execution without repeatedly asking the user what to do.

⸻

19. CROSS-SESSION AUTONOMY

Session 2 must read:
	•	Master strategy
	•	Session 1 output
	•	Session 2 prompt
	•	repository documentation
	•	any designated response/handoff files.

Session 3 must read:
	•	Master strategy
	•	Session 1 output
	•	Session 2 response/handoff
	•	Session 3 prompt
	•	actual current implementation.

Session 4 must read:
	•	Master strategy
	•	Session 1 output
	•	Session 2 response
	•	Session 3 response
	•	Session 4 prompt
	•	actual current implementation.

Never assume previous sessions completed something merely because they said they would.

Verify it.

⸻

20. FINAL RULE

The objective is not:

“Implement the features we discussed.”

The objective is:

Take the existing Vallo product and evolve the entire platform into the mature, premium, trustworthy, intelligent Space Operating System we have defined.

That means:

Existing areas + missing areas + unfinished areas + new strategic features + frontend evolution + backend hardening + mobile + admin + landing page + documentation + legal/product flows + animations + startup + accessibility + performance + security + production readiness.

Nothing important should be missed simply because it was not explicitly named earlier.

Audit the whole product. Find the gaps. Decide what belongs. Build the right thing. Verify it. Document it. Move forward autonomously.

⸻

This is the addendum I would use. It closes the exact gaps you just pointed out, especially the danger that Claude interprets the earlier prompts as a feature checklist instead of a mandate to upgrade the entire existing Vallo product.


Yes, I understand exactly.

You want one final addendum that tells Session 1: after analyzing the ~60 reference images and the entire Vallo frontend, it must identify every visual asset Vallo needs, not just UI components.

For example:
	•	3D illustrations
	•	onboarding artwork
	•	category graphics
	•	transparent PNG icons
	•	empty-state illustrations
	•	success/error graphics
	•	feature illustrations
	•	Space Passport graphics
	•	verification graphics
	•	payment graphics
	•	property/hotel/restaurant/short-let graphics
	•	landing-page visuals
	•	promotional graphics
	•	animated assets
	•	logos/brand variants
	•	decorative assets
	•	any other custom visual needed to make the product feel premium.

And if that becomes 30, 50, 100+ assets, that’s fine.

Session 1 should create a complete asset-generation specification, then give you copy-paste-ready prompts for ChatGPT/image generation for every required asset, with consistent style, dimensions, transparency requirements, naming, usage location, and visual relationships.

So yes, I get you. This should absolutely be the final addendum.

One extra one::



What you asked for is a master Payluk integration prompt that Claude Code can actually use to inspect Vallo, read Payluk’s entire documentation and AI Agent Skill, understand the architecture, then implement the whole financial infrastructure cleanly.

It needs to cover:
	•	architecture
	•	provider abstraction
	•	Payluk customer mapping
	•	wallets
	•	deposits
	•	withdrawals
	•	bank verification
	•	wallet transfers
	•	standard escrow
	•	milestone escrow
	•	disputes
	•	refunds
	•	fees
	•	settlement
	•	receipts
	•	transaction history
	•	references
	•	blockchain hashes where applicable
	•	webhooks
	•	idempotency
	•	reconciliation
	•	immutable ledger
	•	database schema
	•	API/service architecture
	•	frontend
	•	mobile
	•	admin
	•	security
	•	permissions
	•	notifications
	•	failure states
	•	testing
	•	observability
	•	documentation
	•	production deployment
	•	Yellow Card separation
	•	cNGN exclusion
	•	Payluk AI Agent Skill
	•	deprecated endpoints
	•	current API limitations
	•	and how all of this fits into Vallo’s Space + Agreement + Inspection + Transaction architecture.

That is the prompt you should send Claude Code.

Below is the proper version.

⸻
