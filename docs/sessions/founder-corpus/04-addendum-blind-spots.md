# Addendum: the blind spot audit

Source: the founder's message of 7 October 2026, the one that asked for the
handoffs to be deleted and rewritten. The second follow-up addendum, sections 1 to 39.

This file is the founder's own words. It is not a summary and it has not been
edited for content. The only change made to it is mechanical: the em dash is
forbidden everywhere under `docs/` by `apps/web/scripts/check-no-em-dash.mjs`,
so every em dash has been replaced with a hyphen. Nothing was cut, softened,
reordered or paraphrased.

---

SECOND FOLLOW-UP ADDENDUM

FINAL BLIND-SPOT AUDIT, PRODUCT COMPLETENESS & EXECUTION-READINESS

This is a continuation of the Master Prompt and First Follow-Up Addendum.

Do not treat this as permission to start coding.

Your responsibility remains to understand, investigate, challenge, architect, prioritize, and produce the definitive execution prompts for Sessions 2, 3, and 4.

Before producing those prompts, perform one final independent audit specifically looking for things the previous audits may have missed.

The goal is simple:

Do not let Vallo enter implementation with an important structural, product, UX, financial, security, operational, or growth gap that we could have identified beforehand.

⸻

1. AUDIT THE PRODUCT AS A REAL BUSINESS, NOT JUST SOFTWARE

Ask:

If Vallo launches tomorrow in Nigeria, can a real person actually:

Discover → Understand → Trust → Contact → Visit → Decide → Pay → Sign → Move/Stay → Manage → Maintain → Review → Return?

And can the other side:

Create → Verify → Publish → Promote → Receive leads → Manage enquiries → Negotiate → Transact → Manage occupancy → Maintain → Analyse performance → Repeat?

Map both sides.

Identify every broken, manual, confusing, duplicated, or missing step.

Do not assume a feature existing in code means the workflow actually works.

⸻

2. AUDIT EVERY CORE ACTOR

Evaluate the experience and underlying systems for:

Consumers
	•	renter
	•	buyer
	•	home seeker
	•	hotel guest
	•	short-let guest
	•	restaurant/customer
	•	event-space customer
	•	commercial-space seeker
	•	diaspora user
	•	investor

Supply-side users
	•	landlord
	•	property owner
	•	agent
	•	realtor
	•	hotel operator
	•	short-let host
	•	restaurant/business owner
	•	commercial operator
	•	event venue operator
	•	warehouse operator
	•	service provider

Internal users
	•	admin
	•	verification staff
	•	trust & safety
	•	support
	•	finance
	•	operations
	•	compliance
	•	content/moderation
	•	analysts

Find any actor who currently has no proper workflow.

⸻

3. AUDIT THE SPACE LIFECYCLE

Vallo is supposed to understand a space throughout its lifecycle.

Verify the architecture supports:

Draft → Submitted → Verification → Published → Promoted → Viewed → Enquired → Viewed physically → Negotiated → Transacted → Occupied → Maintained → Renewed/Booked → Vacated → Relisted/Resold

Consider:
	•	stale listings
	•	unavailable spaces
	•	duplicate spaces
	•	ownership changes
	•	price changes
	•	availability changes
	•	verification expiry
	•	deleted listings
	•	archived listings
	•	cancelled bookings
	•	terminated agreements
	•	historical records

The system should preserve meaningful history rather than simply overwriting important state.

⸻

4. AUDIT IDENTITY VS ENTITY SEPARATION

Make sure Vallo clearly separates:
	•	User
	•	Person
	•	Business
	•	Workspace
	•	Property
	•	Space
	•	Listing
	•	Unit
	•	Building
	•	Room
	•	Booking
	•	Agreement
	•	Transaction
	•	Inspection
	•	Document
	•	Service
	•	Professional

Do not allow these concepts to become one giant generic object.

Determine the canonical relationships.

For example:

Building → Units → Spaces → Listings → Agreements → Transactions → Inspections → Maintenance history

Where appropriate.

⸻

5. AUDIT MULTI-SPACE AND MULTI-UNIT REALITY

Nigeria has:
	•	estates
	•	apartment buildings
	•	compounds
	•	malls
	•	office buildings
	•	hotels
	•	hostels
	•	shopping centres
	•	mixed-use developments
	•	land subdivisions

Check whether Vallo can properly represent:

one owner → many properties → many buildings → many units → many listings

without duplicating everything.

This becomes especially important for:
	•	landlords
	•	hotels
	•	agents
	•	property managers
	•	developers
	•	enterprise customers.

⸻

6. AUDIT SEARCH AS A CORE INFRASTRUCTURE

Do not treat search as merely a frontend input.

Audit:
	•	full-text search
	•	location search
	•	geospatial search
	•	radius search
	•	category search
	•	price ranges
	•	amenities
	•	availability
	•	verified-only
	•	furnished/unfurnished
	•	bedrooms
	•	bathrooms
	•	commercial attributes
	•	hotel attributes
	•	restaurant attributes
	•	event-space attributes
	•	land attributes
	•	ranking
	•	relevance
	•	personalization
	•	typo tolerance
	•	synonyms
	•	Nigerian terminology
	•	neighbourhood aliases
	•	Lagos/Abuja locality variations
	•	future African markets

Also investigate whether search can eventually support:

“Find me a verified 2-bedroom around Lekki under ₦5m with reliable power and parking.”

That requires structured attributes, not just keyword matching.

⸻

7. AUDIT LOCATION INTELLIGENCE

Location is one of Vallo’s most important primitives.

Audit:
	•	address normalization
	•	coordinates
	•	neighbourhood
	•	district
	•	city
	•	state
	•	country
	•	landmarks
	•	geocoding
	•	reverse geocoding
	•	map provider
	•	distance calculation
	•	travel time
	•	route intelligence
	•	geofencing
	•	location privacy
	•	approximate vs exact address
	•	duplicate coordinates
	•	incorrect coordinates

Also investigate how Vallo should represent spaces where revealing the exact address publicly is unsafe or undesirable.

⸻

8. AUDIT DATA QUALITY

Create a formal concept of:

Listing Quality

and separately:

Trust / Verification

and separately:

Completeness

and separately:

Performance

Do not collapse everything into one meaningless score.

A beautiful listing can be unverified.

A verified listing can have poor content.

A complete listing can perform badly.

These should remain distinct concepts.

⸻

9. AUDIT THE MEDIA SYSTEM

Inspect the entire lifecycle of:
	•	images
	•	videos
	•	floor plans
	•	360 tours
	•	documents
	•	inspection photos
	•	verification evidence
	•	profile photos
	•	business logos
	•	menus
	•	certificates

Check:
	•	upload
	•	compression
	•	resizing
	•	thumbnails
	•	ordering
	•	deletion
	•	permissions
	•	storage
	•	CDN
	•	caching
	•	moderation
	•	EXIF/location metadata
	•	duplicate media
	•	broken media
	•	missing media
	•	upload retry
	•	poor network
	•	large files

A premium platform cannot feel slow because of media handling.

⸻

10. AUDIT NOTIFICATIONS AS A SYSTEM

Do not allow notifications to become random feature-by-feature implementations.

Create a unified notification architecture covering:
	•	push
	•	in-app
	•	email
	•	SMS where appropriate
	•	transactional notifications
	•	marketing notifications
	•	security alerts
	•	payment events
	•	agreement events
	•	booking events
	•	verification events
	•	referral events
	•	listing events
	•	price changes
	•	Space Watch
	•	maintenance
	•	support

Check:
	•	preferences
	•	quiet hours
	•	deduplication
	•	batching
	•	retries
	•	deep links
	•	read/unread
	•	notification history
	•	delivery status.

⸻

11. AUDIT DEEP LINKS AND ROUTING

Every important notification, share link, email, QR code, listing link, Space ID, and marketing link should lead to the correct destination.

Check:

Web → correct page.

iOS → correct native route.

Android → correct native route.

Logged out → authentication then intended destination.

Logged in → direct destination.

Deleted/expired content → useful fallback.

This is particularly important for:
	•	listings
	•	bookings
	•	agreements
	•	payments
	•	referrals
	•	notifications
	•	shared spaces
	•	Space Passport.

⸻

12. AUDIT OFFLINE AND BAD-NETWORK CONDITIONS

Nigeria cannot be treated as a permanently fast-network environment.

Test the architecture conceptually for:
	•	slow 3G/4G
	•	unstable connections
	•	request retries
	•	interrupted uploads
	•	interrupted payments
	•	offline navigation
	•	stale data
	•	optimistic UI
	•	duplicate submissions
	•	reconnecting
	•	partial failures

Especially:

Never allow a payment/action to appear successful simply because the frontend assumed it succeeded.

⸻

13. AUDIT AFRICA EXPANSION WITHOUT OVERENGINEERING IT

Nigeria is the launch market.

But avoid architecture that makes expansion painful.

Identify where the system needs abstractions for:
	•	country
	•	currency
	•	language
	•	timezone
	•	phone format
	•	address format
	•	payment provider
	•	KYC requirements
	•	verification requirements
	•	taxes
	•	legal documents
	•	property terminology
	•	local categories
	•	regulatory differences

Do not build every African country now.

Build the architecture so expansion does not require a rewrite.

⸻

14. AUDIT THE TRUST MODEL AGAIN

Ask the hardest question:

Why should a Nigerian user trust Vallo more than a random WhatsApp listing?

The answer must exist in the product.

Audit:
	•	identity
	•	ownership/authority
	•	document verification
	•	location verification
	•	inspection
	•	duplicate detection
	•	suspicious behaviour
	•	fraud signals
	•	verification dates
	•	expiry
	•	evidence
	•	reviewer/admin actions
	•	dispute history
	•	user reporting
	•	moderation

And ensure:

Paid promotion can never purchase trust.

⸻

15. AUDIT REVIEWS AND REPUTATION

Determine how Vallo handles:
	•	reviews
	•	ratings
	•	verified reviews
	•	transaction-linked reviews
	•	space reviews
	•	business reviews
	•	professional reviews
	•	owner responses
	•	review manipulation
	•	fake reviews
	•	retaliation
	•	moderation
	•	disputes
	•	deleted listings
	•	historical reviews

A review from someone who actually stayed, rented, bought, visited, or transacted should be treated differently from arbitrary commentary.

⸻

16. AUDIT THE REFERRAL/REWARDS ECONOMY

Verify the architecture for the previously defined referral concept:

₦76 per qualified referral as the current business hypothesis.

Do not assume the amount is final.

Audit:
	•	phone uniqueness
	•	account relationships
	•	device signals
	•	referral graph
	•	payout account relationships
	•	velocity
	•	suspicious clusters
	•	self-referrals
	•	pending period
	•	qualification
	•	reversals
	•	reward ledger
	•	withdrawal
	•	Paystack payout
	•	admin review
	•	campaign rules
	•	abuse prevention

Never allow:

“Create 10 Gmail accounts → earn money.”

The system should reward legitimate acquisition.

⸻

17. AUDIT MONETIZATION AS A SYSTEM

Do not scatter payment logic throughout the application.

Create an entitlement model capable of supporting:
	•	Boost
	•	Spotlight
	•	Featured
	•	Prime
	•	Vallo Verified
	•	Inspection
	•	Space Intelligence
	•	Concierge
	•	Agent Pro
	•	Owner Pro
	•	Hospitality Pro
	•	Business Pro
	•	future Vallo Plus
	•	future enterprise plans

Every paid feature should answer:

Who purchased it?
What did they receive?
When does it expire?
What happens after expiration?
Can it be refunded?
Can it be cancelled?
Can admin grant/revoke it?
What happens if payment fails?

⸻

18. AUDIT PROMOTION FAIRNESS

Vallo must never become:

“Pay more and pretend your space is better.”

Separate:

Trust

from

Visibility

from

Performance

A Featured listing can appear higher.

It cannot receive a fake verification badge.

It cannot fabricate reviews.

It cannot manipulate trust scores.

It cannot falsify availability.

⸻

19. AUDIT ANALYTICS AS PRODUCT INFRASTRUCTURE

Verify the event architecture supports:

Impression → View → Engagement → Save → Share → Contact → Viewing → Booking/Transaction

Across:
	•	property
	•	hotel
	•	restaurant
	•	short-let
	•	event venue
	•	office
	•	retail
	•	business.

Make sure analytics can distinguish:
	•	organic
	•	promoted
	•	referral
	•	search
	•	recommendation
	•	external
	•	direct.

And ensure metrics are privacy-safe and not misleading.

⸻

20. AUDIT AI PROPERLY

Do not simply add AI everywhere.

For every AI feature ask:
	1.	What data does it use?
	2.	What does it know?
	3.	What can it infer?
	4.	What can it not know?
	5.	What happens when it is wrong?
	6.	Can the user see why it made the recommendation?
	7.	Can the user verify important claims?
	8.	Are sensitive decisions being automated improperly?
	9.	Are hallucinated property facts possible?
	10.	Can AI accidentally expose private documents/data?

Especially audit:
	•	Space Intelligence Agent
	•	recommendations
	•	fraud/risk signals
	•	listing quality
	•	natural-language search
	•	summaries
	•	market intelligence
	•	AI Space Tour
	•	Furnish This Space.

⸻

21. AUDIT THE DATA/PRIVACY BOUNDARY

Explicitly map:

Public data
Private user data
Workspace data
Financial data
Identity data
Verification evidence
Legal documents
Inspection evidence
Internal/admin data
AI-accessible data

Determine who can see what.

Especially:
	•	tenant
	•	landlord
	•	agent
	•	buyer
	•	seller
	•	hotel staff
	•	business staff
	•	admin
	•	support
	•	verification staff.

⸻

22. AUDIT DELETION, RETENTION AND LEGAL HISTORY

Ask:

If a user deletes their account, what happens to:
	•	agreements?
	•	payments?
	•	receipts?
	•	inspections?
	•	disputes?
	•	reviews?
	•	listings?
	•	messages?
	•	referral records?
	•	financial records?

Do not casually delete legally or operationally important records.

Design proper retention/anonymization rules.

⸻

23. AUDIT SUPPORT AND DISPUTES

Vallo will eventually need users to say:

“This listing is fraudulent.”

“The landlord didn’t honour the agreement.”

“The property wasn’t as described.”

“The inspection evidence is wrong.”

“My payment is stuck.”

“My booking disappeared.”

“My reward wasn’t credited.”

Audit whether there is a unified case/ticket architecture.

Possible model:

Case → Parties → Evidence → Events → Internal notes → Resolution → Audit trail

⸻

24. AUDIT ADMIN AS THE OPERATING SYSTEM

The admin dashboard must not just be analytics.

It should allow authorized staff to operate Vallo.

Audit:
	•	users
	•	workspaces
	•	listings
	•	verification
	•	fraud
	•	reports
	•	disputes
	•	payments
	•	referrals
	•	promotions
	•	subscriptions
	•	support
	•	content
	•	feature flags
	•	system health
	•	audit logs.

Every sensitive action should be attributable.

⸻

25. AUDIT OBSERVABILITY

Ask:

If Vallo breaks at 2 AM, how does the team know?

Check:
	•	application errors
	•	API errors
	•	database errors
	•	failed jobs
	•	webhook failures
	•	payment failures
	•	notification failures
	•	slow requests
	•	crashes
	•	startup failures
	•	authentication failures
	•	unusual traffic
	•	fraud spikes
	•	storage failures

Determine what should trigger alerts.

⸻

26. AUDIT BACKUP AND DISASTER RECOVERY

This is often forgotten.

Verify strategy for:
	•	database backups
	•	restore testing
	•	point-in-time recovery
	•	media backup/redundancy
	•	secrets recovery
	•	deployment rollback
	•	failed migrations
	•	corrupted data
	•	provider outage
	•	Payluk outage
	•	Paystack outage
	•	map provider outage
	•	email/SMS/push outage.

Ask:

If Vallo’s production database was damaged today, what exactly happens?

If the answer is unclear, flag it.

⸻

27. AUDIT DEPENDENCY FAILURE

Vallo will depend on external services.

Map:
	•	Supabase
	•	Vercel
	•	Payluk
	•	Paystack
	•	maps/geocoding
	•	email
	•	SMS
	•	push
	•	AI providers
	•	storage/CDN
	•	analytics
	•	Apple
	•	Google
	•	other providers.

For every critical dependency determine:

What happens if it is unavailable for 5 minutes?
1 hour?
24 hours?

⸻

28. AUDIT RELEASE ENGINEERING

Before Session 2/3/4 prompts are generated, establish:
	•	CI
	•	lint
	•	type checking
	•	unit tests
	•	integration tests
	•	E2E
	•	migration checks
	•	build checks
	•	environment checks
	•	preview deployment
	•	production deployment
	•	rollback
	•	mobile builds
	•	TestFlight
	•	Play Store
	•	versioning
	•	release notes.

No “works on my machine” release process.

⸻

29. AUDIT THE MOBILE APP AS A REAL APP

Do not accept:

“It’s just the website inside a WebView.”

Vallo should feel intentional on mobile.

Audit:
	•	startup
	•	splash
	•	auth restoration
	•	keyboard
	•	safe areas
	•	status bar
	•	gestures
	•	back navigation
	•	deep links
	•	push notifications
	•	file/photo picker
	•	camera
	•	location
	•	share sheet
	•	external links
	•	offline states
	•	network recovery
	•	WebView memory
	•	app lifecycle
	•	background/foreground
	•	logout/login
	•	session expiry.

And specifically resolve the current minutes-long startup problem from root cause.

⸻

30. AUDIT DESIGN SYSTEM GOVERNANCE

Make sure Session 3 does not create 30 different versions of:
	•	button
	•	card
	•	modal
	•	input
	•	tabs
	•	navigation
	•	badge
	•	dropdown
	•	toast
	•	empty state
	•	loading state.

Create a controlled component/token architecture.

Include:
	•	spacing
	•	typography
	•	colour
	•	elevation
	•	radius
	•	borders
	•	iconography
	•	motion
	•	breakpoints
	•	accessibility states
	•	dark mode
	•	light mode.

⸻

31. AUDIT THE REFERENCE IMAGE LIBRARY

The GitHub reference images must be treated as an actual research corpus.

Session 1 should:
	1.	Locate them.
	2.	Pull/open them.
	3.	Inspect them individually.
	4.	Categorize them.
	5.	Identify interaction patterns.
	6.	Identify visual patterns.
	7.	Identify information architecture.
	8.	Identify motion patterns where inferable.
	9.	Identify what is useful for Vallo.
	10.	Identify what should explicitly NOT be copied.

For each major reference:

BORROW → ADAPT → AVOID

Then create a cross-reference matrix.

Do not simply say:

“This looks nice.”

Extract the underlying product pattern.

⸻

32. AUDIT THE FEED/DISCOVER CONCEPT

The feed must not accidentally become a copy of X, Instagram, TikTok, or Facebook.

Its purpose is:

Make the physical world around the user continuously discoverable.

Audit:
	•	spaces
	•	businesses
	•	hotels
	•	restaurants
	•	events
	•	neighbourhoods
	•	price drops
	•	newly verified spaces
	•	market intelligence
	•	professionals
	•	useful local information
	•	discussions
	•	recommendations
	•	saved/watch activity.

Determine the right balance between:

utility + discovery + retention + commercial activity.

⸻

33. AUDIT GROWTH LOOPS

Ask how Vallo grows without relying entirely on paid advertising.

Potential loops:

User discovers space → shares space → recipient joins → searches → saves → contacts → transaction

Lister joins → lists space → shares → gets enquiries → lists more spaces

Verified professional → attracts clients → brings spaces/users

Referral → qualified user → activity → more referrals

Space Watch → price/availability change → return visit

Identify the strongest loops and ensure product architecture supports them.

⸻

34. AUDIT NETWORK EFFECTS

Determine what becomes more valuable as Vallo grows.

Examples:
	•	more verified spaces
	•	more professionals
	•	more transaction history
	•	better market intelligence
	•	better recommendations
	•	richer Space Passports
	•	better fraud detection
	•	better service marketplace
	•	more reviews
	•	stronger location intelligence.

Prioritize infrastructure that compounds.

⸻

35. AUDIT WHAT NOT TO BUILD

This is important.

Create a Kill / Defer List.

Anything that:
	•	does not support the Space OS thesis
	•	creates operational complexity without value
	•	is a vanity feature
	•	duplicates an existing capability
	•	can be added later
	•	distracts from trust/discovery/transaction/operation

should be explicitly deferred.

Vallo should not become bloated simply because something sounds impressive.

⸻

36. FINAL “COULD THIS FAIL?” EXERCISE

Before writing the Session 2/3/4 prompts, imagine:

Scenario A

10,000 users arrive in one day.

Scenario B

A fraudulent landlord uploads 500 listings.

Scenario C

Payluk goes down during a transaction.

Scenario D

Supabase has an incident.

Scenario E

A viral Vallo listing gets 100,000 views.

Scenario F

Someone creates 100 referral accounts.

Scenario G

A user loses network connection during payment.

Scenario H

A landlord disputes an inspection.

Scenario I

An admin account is compromised.

Scenario J

Apple rejects the app.

Scenario K

A user shares a listing with someone who doesn’t have Vallo.

Scenario L

Vallo expands from Lagos to Abuja, then Ghana.

For each, identify architectural/product weaknesses.

⸻

37. FINAL PRIORITY FRAMEWORK

After all audits, classify every finding:

P0

Launch blocker / security / financial integrity / data corruption / critical workflow failure.

P1

Core product weakness that materially affects launch quality.

P2

Important improvement that should follow immediately after launch.

P3

Future opportunity.

Then map each item to:

Session 2 / Session 3 / Session 4 / Later

⸻

38. MOST IMPORTANT OUTPUT

Only after completing this entire audit should you generate the final execution package.

Produce:

SESSION 2 - MASTER EXECUTION PROMPT

A complete Claude Code prompt for the backend/core systems team.

Maximum 4 agents.

Include:
	•	exact mission
	•	architecture
	•	ownership
	•	tasks
	•	dependencies
	•	implementation sequence
	•	database work
	•	APIs
	•	security
	•	payments
	•	Payluk
	•	Paystack
	•	referrals
	•	rewards ledger
	•	entitlements
	•	analytics
	•	notifications
	•	fraud/risk
	•	observability
	•	testing
	•	migration rules
	•	acceptance criteria
	•	forbidden changes
	•	handoff requirements.

⸻

SESSION 3 - MASTER EXECUTION PROMPT

A complete Claude Code prompt for frontend/product experience.

Maximum 4 agents.

Include:
	•	design system
	•	reference intelligence
	•	entire app UI/UX
	•	Discover/Feed
	•	search
	•	maps
	•	space detail
	•	Space Passport
	•	trust
	•	dashboards
	•	workspaces
	•	payments
	•	referrals
	•	analytics
	•	admin UX where appropriate
	•	onboarding
	•	animations
	•	startup
	•	mobile
	•	light/dark
	•	responsive
	•	accessibility
	•	empty/loading/error states
	•	performance
	•	new product surfaces
	•	landing/docs
	•	acceptance criteria.

⸻

SESSION 4 - MASTER EXECUTION PROMPT

A complete Claude Code prompt for final QA/release.

Maximum 4 agents.

It must independently verify:
	•	backend
	•	frontend
	•	workflows
	•	auth
	•	permissions
	•	payments
	•	referral abuse
	•	financial integrity
	•	database integrity
	•	mobile
	•	startup
	•	deep links
	•	notifications
	•	performance
	•	accessibility
	•	security
	•	responsive behavior
	•	light/dark
	•	animations
	•	broken routes
	•	edge cases
	•	regression
	•	production deployment
	•	TestFlight
	•	Play Store
	•	final release readiness.

Session 4 must not assume Sessions 2 and 3 succeeded.

It must verify the actual product.

⸻

39. FINAL RULE

The three execution prompts must be specific enough that the next Claude Code session can begin work without asking:

“What exactly should I do?”

The prompts should tell them:

What to inspect → why it matters → what to change → what not to change → how to implement it → how to test it → how to know it is finished.

And Session 1 must use the actual Vallo repository and current implementation as the source of truth, not invent architecture that already exists or recommend rebuilding functioning systems unnecessarily.

The final output of Session 1 should therefore be:

Vallo Master Audit → Final Strategy → Architecture Decisions → Prioritized Backlog → Session 2 Execution Prompt → Session 3 Execution Prompt → Session 4 Execution Prompt → Dependencies → Acceptance Criteria → Release Gates → Deferred/Kill List.

Do not begin implementation yourself.

⸻

One important addition I intentionally made here

The biggest things I wanted to catch in this second pass were entity architecture, multi-unit properties, search infrastructure, location intelligence, media, notifications/deep links, offline/network failure, privacy boundaries, reviews/reputation, disaster recovery, dependency failure, growth loops, network effects, and the “what should we NOT build?” discipline.

Those are exactly the kinds of things that can be absent from a beautiful product plan while becoming painful technical debt later.

So yes: I would use this as the Second Follow-Up.

Then the package is:

Master Prompt + Follow-Up #1 + Follow-Up #2

and Session 1 uses all three before producing the actual executable Session 2, Session 3, and Session 4 prompts.


Yes, I feel you completely. And yes, the image confirms the first app screen you mean: the dark navy screen with the centered glowing VALLO logo. That startup experience needs to be redesigned and animated, while also fixing the underlying long startup delay. It should not just be a cosmetic timer.

Here is the addendum I would give Session 1. This should sit after the three existing prompts/addendums.

⸻
