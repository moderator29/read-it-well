# Payments master prompt: Payluk, the provider abstraction, the money rail

Source: the founder's message of 7 October 2026, the one that asked for the
handoffs to be deleted and rewritten. Sections 1 to 75.

This file is the founder's own words. It is not a summary and it has not been
edited for content. The only change made to it is mechanical: the em dash is
forbidden everywhere under `docs/` by `apps/web/scripts/check-no-em-dash.mjs`,
so every em dash has been replaced with a hyphen. Nothing was cut, softened,
reordered or paraphrased.

---

VALLO PAYMENTS + PAYLUK MASTER IMPLEMENTATION PROMPT

ROLE

You are the senior payments architect, backend engineer, fintech systems engineer, security engineer, product engineer, frontend engineer, and QA lead responsible for implementing and hardening Vallo’s production financial infrastructure.

You are working inside the existing VALLO SPACES LTD codebase.

Do not create a toy payment integration.

Do not create a simple “Payluk API wrapper.”

Do not rebuild Vallo.

You are upgrading the existing production-stage Vallo platform into a serious financial transaction infrastructure where Vallo orchestrates the business workflow and regulated/payment providers handle the actual financial rails.

The final result must be production-grade, auditable, secure, resilient, understandable, mobile-ready, and visually excellent.

The implementation must fit the existing Vallo architecture instead of creating an isolated payments product.

⸻

1. FIRST: UNDERSTAND THE EXISTING VAllO SYSTEM

Before modifying code:
	1.	Inspect the entire repository.
	2.	Understand the monorepo structure.
	3.	Understand apps/web.
	4.	Understand the existing database.
	5.	Understand Supabase configuration.
	6.	Understand authentication.
	7.	Understand users.
	8.	Understand workspaces.
	9.	Understand owners/landlords.
	10.	Understand agents/realtors.
	11.	Understand hotels.
	12.	Understand businesses.
	13.	Understand listings.
	14.	Understand spaces/properties.
	15.	Understand agreements.
	16.	Understand inspections.
	17.	Understand documents.
	18.	Understand notifications.
	19.	Understand admin.
	20.	Understand existing payments.
	21.	Understand existing Paystack integration.
	22.	Understand any existing transaction tables.
	23.	Understand existing API/service patterns.
	24.	Understand existing server actions.
	25.	Understand existing frontend design system.
	26.	Understand mobile/Capacitor architecture.
	27.	Understand existing environment variables.
	28.	Understand deployment architecture.
	29.	Understand existing webhook handling.
	30.	Search for anything related to:

payment

payments

wallet

balance

escrow

transaction

receipt

refund

withdraw

transfer

settlement

paystack

payluk

yellowcard

crypto

cngn

bank

account verification

webhook

dispute

agreement

inspection

invoice

receipt

commission

fee

payout

ledger

Do not assume the current implementation is correct.

Map what already exists.

Preserve working systems where appropriate.

Upgrade broken or weak systems rather than blindly replacing them.

⸻

2. READ PAYLUK’S OFFICIAL DOCUMENTATION FIRST

Before implementation, you MUST read the current Payluk documentation.

Official documentation:

https://docs.payluk.ng

Documentation index:

https://docs.payluk.ng/llms.txt

Payluk AI Agent Skill:

https://docs.payluk.ng/guides/ai-agent-skill

Also inspect the relevant API/reference/concept pages linked from their documentation.

The AI Agent Skill is especially important.

Do not merely read the introductory documentation.

Read the relevant sections covering:
	•	onboarding
	•	authentication
	•	quickstart
	•	merchant customers
	•	customer permissions
	•	customer wallets
	•	standard escrow
	•	milestone escrow
	•	vault escrow where relevant
	•	escrow lifecycle
	•	funding
	•	confirmation
	•	claims
	•	disputes
	•	refunds
	•	fees
	•	settlement
	•	merchant balance
	•	merchant transactions
	•	payment intents
	•	deposits
	•	withdrawals
	•	wallet transfers
	•	bank verification
	•	bank list
	•	payment verification
	•	payment history
	•	webhooks
	•	errors
	•	pagination
	•	rate limits
	•	inline checkout
	•	SDKs
	•	JavaScript/TypeScript
	•	React
	•	security
	•	crypto-related documentation
	•	production requirements

Use Payluk’s AI Agent Skill as an implementation reference.

If the AI Agent Skill contains current implementation guidance that differs from assumptions in this prompt, follow the current official Payluk documentation.

Do not invent endpoints.

Do not invent request fields.

Do not invent response fields.

Do not assume an endpoint exists because an older integration pattern used it.

⸻

3. IMPORTANT PAYLUK RULES

The current Payluk documentation must be treated as the source of truth.

Payluk currently provides infrastructure around:
	•	merchant customers
	•	wallets
	•	escrow
	•	payment intents
	•	deposits
	•	withdrawals
	•	wallet transfers
	•	payment history
	•	disputes
	•	refunds/resolution
	•	bank/account verification
	•	webhooks
	•	transaction records
	•	fees
	•	settlement

The old virtual-account approach must NOT be built as the primary Vallo architecture.

The Payluk virtual-account endpoint documented as deprecated must not be used for new production architecture.

Do not build around deprecated functionality.

Do not create a fake Vallo bank account system to compensate for this.

⸻

4. VERY IMPORTANT: CNGN

Vallo is NOT using Payluk’s cNGN functionality as the primary crypto/stablecoin architecture.

Do NOT build Vallo’s launch financial architecture around Payluk cNGN.

Do not expose cNGN to normal Vallo users.

Do not create a Vallo cNGN wallet.

Do not create a generic crypto wallet inside Vallo.

Vallo intends to use Yellow Card separately for stablecoin/crypto infrastructure.

Therefore the architecture must separate:

Payluk

Protected transactions, wallets, escrow, settlement, disputes, withdrawals, transfers and related financial infrastructure.

Paystack

Normal Vallo commercial payments where appropriate, such as:
	•	boosts
	•	subscriptions
	•	premium features
	•	service fees
	•	referral payouts
	•	other non-escrow commercial payments

Yellow Card

Future/international/stablecoin/crypto rails.

Do not claim that Yellow Card can directly fund Payluk escrow until the actual provider compatibility and required compliance flow has been confirmed.

Build an abstraction that allows this later.

⸻

5. CORE VAllO FINANCIAL PRINCIPLE

Vallo owns the financial workflow and business intelligence.

The regulated/payment providers own the actual financial rails.

The architecture should conceptually be:

                    VALLO
                      |
              Vallo Payment Engine
                      |
        +-------------+-------------+
        |             |             |
     Paystack       Payluk       Yellow Card
        |             |             |
Commercial       Escrow /       Stablecoin /
Payments         Wallet         Cross-border
                      |
               Regulated Rail

Vallo should not become a bank.

Vallo should not hold customer money in its own database.

Vallo should not represent a database balance as real money.

Vallo’s internal records are a representation of provider-backed financial state.

⸻

6. THE CORE VAllO TRANSACTION MODEL

The most important architectural rule:

A Vallo financial transaction should connect:

SPACE
   +
PARTIES
   +
AGREEMENT
   +
TRANSACTION
   +
PAYMENT
   +
INSPECTION
   +
CONDITIONS
   +
PROVIDER
   +
RECEIPT
   +
AUDIT TRAIL

Example:

Space
  ↓
VSP-ABJ-000184
  ↓
Rental Agreement
  ↓
Landlord + Tenant
  ↓
₦2,500,000 obligation
  ↓
Payluk Escrow
  ↓
Inspection
  ↓
Move-in condition confirmed
  ↓
Agreement condition satisfied
  ↓
Release
  ↓
Landlord Payluk balance
  ↓
Withdrawal
  ↓
Bank

Do not reduce this to:

user → pay → success

That is not Vallo.

⸻

7. PROVIDER ABSTRACTION

Build a proper provider abstraction.

Do not scatter Payluk-specific API calls throughout the application.

Create a clean provider architecture such as:

payments/
  core/
  providers/
    payluk/
    paystack/
    yellowcard/
  services/
  webhooks/
  reconciliation/
  ledger/
  receipts/
  notifications/

The exact folder structure must follow the existing Vallo architecture if a better equivalent already exists.

The principle is more important than the exact folder name.

Create interfaces/abstractions for operations such as:

createCustomer()
getCustomer()
updateCustomer()
getWallet()
createPaymentIntent()
verifyPayment()
createEscrow()
fundEscrow()
confirmEscrow()
claimEscrow()
createMilestoneEscrow()
confirmMilestone()
submitDispute()
resolveDispute()
createWithdrawal()
verifyWithdrawal()
createWalletTransfer()
getPaymentHistory()
getTransaction()
getBankList()
verifyBankAccount()

Only implement methods actually supported by the provider.

Provider-specific differences must remain inside adapters.

⸻

8. PAYLUK CUSTOMER ARCHITECTURE

Vallo users and Payluk customers are NOT the same database entity.

Create a secure mapping.

Conceptually:

Vallo User
   ↓
Vallo Financial Profile
   ↓
Payluk Customer ID

Store the provider relationship.

Example:

financial_provider_accounts

Possible fields:

id
user_id
provider
provider_customer_id
status
currency
created_at
updated_at
metadata

Do not duplicate unnecessary sensitive information.

Do not store Payluk secret keys in the database.

Do not expose provider secrets to the browser.

⸻

9. CUSTOMER ONBOARDING

Design a financial onboarding flow.

A user should be able to understand:
	•	why financial information is required
	•	what Payluk is doing
	•	what Vallo is doing
	•	what information is being verified
	•	whether the account is ready
	•	what actions remain

Possible states:

NOT_STARTED
PENDING
VERIFICATION_REQUIRED
ACTIVE
RESTRICTED
SUSPENDED
FAILED

Do not make financial onboarding feel like an ugly fintech form.

It should feel like Vallo.

⸻

10. WALLET ARCHITECTURE

Payluk provides wallet functionality.

Vallo should expose the relevant wallet state cleanly.

At minimum distinguish:

Available
In Escrow
Pending
Processing

Do not invent a fake wallet balance.

If Payluk returns:

mainBalance
escrowBalance

map these into Vallo’s financial presentation.

Do not allow frontend calculations to become the source of truth.

All financial state must come from server-authoritative data.

⸻

11. DEPOSIT ARCHITECTURE

Implement Payluk’s current documented payment-intent flow.

Support the appropriate Payluk deposit mechanisms documented for production.

Do not use the deprecated virtual-account flow.

The architecture should support:

Deposit
   ↓
Payment Intent
   ↓
Provider processing
   ↓
Verification/execution
   ↓
Webhook
   ↓
Vallo transaction update
   ↓
Ledger event
   ↓
Updated available balance

Every deposit must have:
	•	internal transaction ID
	•	provider reference
	•	amount
	•	currency
	•	fee where applicable
	•	status
	•	timestamps
	•	provider metadata
	•	event history
	•	receipt relationship

Never mark a deposit successful merely because the frontend says payment succeeded.

⸻

12. WITHDRAWAL ARCHITECTURE

Implement Payluk withdrawals properly.

Support the documented Payluk flow for:

Bank withdrawal

and, where genuinely supported and appropriate:

Crypto transfer

But do not expose crypto withdrawals unless Vallo’s product/legal design explicitly enables them.

Bank withdrawal flow:

Available Balance
       ↓
Withdraw
       ↓
Select bank
       ↓
Enter account number
       ↓
Verify account
       ↓
Show verified account name
       ↓
Enter amount
       ↓
Show provider fee
       ↓
Show net amount
       ↓
Confirm
       ↓
Create withdrawal intent
       ↓
Provider verification/execution
       ↓
Webhook/status update
       ↓
Completed

The user must clearly see:

Withdrawal amount
Provider fee
VAT if applicable
Total debited
Expected received amount
Destination account
Status
Reference

Never hard-code Payluk withdrawal fees.

Use the fee returned by the provider.

⸻

13. BANK ACCOUNT VERIFICATION

Implement the documented bank-list and account-verification APIs.

Do not allow a user to blindly type a bank account and withdraw without verification.

Flow:

Bank selected
      ↓
Account number entered
      ↓
Payluk verification
      ↓
Verified account name
      ↓
User confirms
      ↓
Withdrawal

Handle:
	•	invalid account
	•	unavailable bank
	•	timeout
	•	provider error
	•	mismatched account
	•	verification unavailable
	•	retry
	•	rate limiting

Never silently proceed when account verification fails.

⸻

14. WALLET TRANSFERS

Implement Payluk wallet-to-wallet transfers where appropriate.

Example:

Vallo User A
    ↓
Send
    ↓
Recipient
    ↓
Amount
    ↓
Fee if applicable
    ↓
Confirmation
    ↓
Payluk wallet transfer
    ↓
Verification
    ↓
Webhook/status
    ↓
Receipt

Prevent:
	•	accidental duplicate transfers
	•	double submission
	•	replay
	•	unauthorized transfer
	•	insufficient funds
	•	invalid recipient
	•	transfer to blocked account

Require appropriate confirmation for irreversible actions.

⸻

15. ESCROW ARCHITECTURE

This is the heart of Vallo.

Vallo should use Payluk escrow as the protected financial rail.

Vallo owns the workflow.

Payluk owns the escrow execution.

Example:

Agreement
   ↓
Create Vallo Transaction
   ↓
Create Payluk Escrow
   ↓
Buyer funds escrow
   ↓
Payment confirmed
   ↓
PROTECTED
   ↓
Space/service condition fulfilled
   ↓
Inspection / evidence
   ↓
Buyer confirms
   ↓
Release
   ↓
Seller receives funds


⸻

16. STANDARD ESCROW

Implement the documented standard escrow lifecycle.

Internally model the Vallo state separately from the provider state.

Example:

DRAFT
AGREED
AWAITING_PAYMENT
PAYMENT_PROCESSING
PROTECTED
FULFILLMENT
INSPECTION
CONDITIONS_PENDING
READY_FOR_RELEASE
RELEASE_REQUESTED
RELEASED
COMPLETED

Provider state should be stored separately.

Example:

provider_status

Do not overwrite the Vallo business state with Payluk’s status.

⸻

17. MILESTONE ESCROW

Where Vallo needs staged transactions, use Payluk milestone escrow.

Examples:
	•	construction
	•	development
	•	commercial fit-out
	•	major property work
	•	service contracts
	•	multi-stage projects

Example:

Total: ₦20m

Milestone 1: ₦5m
Milestone 2: ₦5m
Milestone 3: ₦5m
Milestone 4: ₦5m

Track:

milestone_id
sequence
amount
description
condition
status
evidence
confirmed_at
released_at

Do not implement milestone logic solely in frontend state.

⸻

18. VAllO CONDITIONS ENGINE

This is where Vallo becomes more than a payment app.

A transaction can have conditions.

Examples:

Tenant inspection completed
Agreement signed
Keys handed over
Property condition confirmed
Required document verified
Service completed
Buyer confirmed delivery
Hotel booking completed
Refund condition satisfied

Create a structured condition model.

Conceptually:

escrow_conditions

with:

id
transaction_id
type
description
required
status
evidence_id
satisfied_at
satisfied_by
created_at
updated_at

Conditions should connect financial release to actual Vallo workflows.

⸻

19. INSPECTION + MONEY

Integrate inspections into financial workflows.

Example rental:

Agreement signed
        ↓
Funds protected
        ↓
Move-in inspection
        ↓
Evidence captured
        ↓
Tenant confirms
        ↓
Condition satisfied
        ↓
Release/settlement

Inspection evidence must be linked to the transaction.

Do not store inspection results as meaningless attachments.

⸻

20. DISPUTES

Implement the Payluk dispute lifecycle.

Vallo must have its own dispute entity.

Example:

DISPUTE_OPEN
UNDER_REVIEW
EVIDENCE_REQUESTED
EVIDENCE_SUBMITTED
RESOLUTION_PENDING
RESOLVED
REFUNDED
PARTIALLY_SETTLED
RELEASED

A dispute should contain:

reason
description
opened_by
transaction
agreement
space
evidence
inspection
messages
provider_dispute_id
resolution
resolution_notes
financial_outcome
timestamps
audit events

Do not allow arbitrary financial manipulation from the frontend.

⸻

21. REFUNDS

Implement provider-supported refunds/resolution properly.

Every refund must have:
	•	original transaction
	•	refund ID
	•	provider reference
	•	amount
	•	reason
	•	initiator
	•	status
	•	timestamps
	•	provider response
	•	audit trail

Never create a fake refund locally.

⸻

22. FEES

Fees must be transparent.

Separate:

Vallo fee
Provider fee
Tax/VAT where returned/applicable
Transaction amount
Net amount

Never bury fees.

Never hard-code provider fees unless the provider explicitly guarantees a fixed fee.

Store the fee actually applied to the transaction.

⸻

23. RECEIPTS

Vallo must have a proper receipt system.

Every meaningful financial event should be capable of producing a receipt.

Receipt should include:

VALLO
Receipt number
Transaction ID
Provider
Provider reference
Date
Time
Payer
Recipient
Space
Agreement
Transaction type
Amount
Fees
Tax where applicable
Total
Status
Payment method
Escrow status
Description

For relevant blockchain transactions:

Network
Asset
Wallet address
Transaction hash
Block explorer link

Only show blockchain information if the provider actually returns it.

NEVER generate fake transaction hashes.

For fiat transactions, do not call a bank/provider reference a blockchain hash.

Clearly distinguish:

Transaction reference
Provider reference
Payment reference
Blockchain transaction hash

These are different concepts.

⸻

24. TRANSACTION DETAIL

Create a proper transaction detail architecture.

A user should be able to open a transaction and see:

Transaction
    ↓
Overview
    ↓
Amount
    ↓
Status
    ↓
Parties
    ↓
Space
    ↓
Agreement
    ↓
Payment
    ↓
Escrow
    ↓
Conditions
    ↓
Inspection
    ↓
Fees
    ↓
Provider
    ↓
Reference
    ↓
Receipt
    ↓
Timeline

The timeline is extremely important.

Example:

Oct 5, 10:31
Agreement created

Oct 5, 10:34
Payment initiated

Oct 5, 10:35
Payment confirmed

Oct 5, 10:35
Funds protected

Oct 6, 14:12
Inspection completed

Oct 6, 15:03
Buyer confirmed

Oct 6, 15:04
Release initiated

Oct 6, 15:04
Funds released

This should feel exceptionally clear.

⸻

25. INTERNAL LEDGER

Build an immutable internal financial event/ledger layer.

Do NOT use:

user.balance += amount

as the financial architecture.

Create append-only financial events.

Conceptually:

financial_ledger_entries

Each event should contain enough information to reconstruct the financial state.

For example:

id
transaction_id
provider
provider_reference
event_type
amount
currency
direction
status
metadata
created_at

Possible events:

DEPOSIT_INITIATED
DEPOSIT_CONFIRMED
WITHDRAWAL_INITIATED
WITHDRAWAL_COMPLETED
TRANSFER_INITIATED
TRANSFER_COMPLETED
ESCROW_CREATED
ESCROW_FUNDED
ESCROW_RELEASED
REFUND_INITIATED
REFUND_COMPLETED
FEE_CHARGED
DISPUTE_OPENED
DISPUTE_RESOLVED

Ledger events should not be silently edited.

Corrections should be represented as additional events.

⸻

26. DATABASE ARCHITECTURE

Inspect the existing schema first.

Do not duplicate existing entities.

Where missing, design proper tables/relations for concepts such as:

financial_provider_accounts
financial_transactions
payment_intents
payments
payment_events
escrow_transactions
escrow_conditions
escrow_milestones
withdrawals
wallet_transfers
disputes
refunds
settlements
receipts
financial_ledger_entries
provider_webhooks
reconciliation_records
bank_accounts
financial_audit_events

Use the existing Vallo naming conventions.

All important foreign keys must be deliberate.

Use proper indexes.

Use unique constraints where necessary.

Use provider references with uniqueness constraints to prevent duplicates.

⸻

27. WEBHOOK ARCHITECTURE

This is mandatory.

Payluk webhooks must be treated as authoritative asynchronous events where appropriate.

Build:

Webhook
   ↓
Authentication/signature verification
   ↓
Raw event persistence
   ↓
Idempotency check
   ↓
Event processing
   ↓
Internal financial event
   ↓
Transaction state update
   ↓
Notification
   ↓
Reconciliation

Every webhook should have:

provider
event_id
event_type
payload
signature/status
received_at
processed_at
processing_status
retry_count
error

Handle duplicate webhook delivery.

Handle out-of-order events.

Handle retries.

Handle malformed events.

Handle unknown event types.

Never process the same financial event twice.

⸻

28. IDEMPOTENCY

Every money-moving operation must be idempotent.

Especially:
	•	payment creation
	•	withdrawal
	•	transfer
	•	escrow creation
	•	escrow funding
	•	release
	•	refund
	•	webhook processing

If a user double-taps:

Withdraw ₦100,000

the system must not create two withdrawals.

If a webhook arrives three times, the system must not credit money three times.

⸻

29. RECONCILIATION

Build reconciliation.

Vallo needs to know:

What Vallo thinks happened
vs
What Payluk says happened

Create reconciliation tooling.

Detect:
	•	missing provider transaction
	•	missing Vallo transaction
	•	mismatched amount
	•	mismatched status
	•	duplicate
	•	unexpected fee
	•	delayed settlement
	•	orphan webhook
	•	failed webhook
	•	provider/Vallo state mismatch

Admin must be able to inspect reconciliation failures.

⸻

30. PAYMENT HISTORY

Integrate Payluk payment history into Vallo’s transaction model.

Do not blindly expose raw provider responses.

Normalize them.

Vallo should present:

Deposits
Withdrawals
Transfers
Escrow
Refunds
Fees

with filtering by:
	•	date
	•	status
	•	type
	•	amount
	•	space
	•	counterparty
	•	agreement

⸻

31. PROVIDER FAILURE HANDLING

Assume providers can fail.

Handle:
	•	timeout
	•	500
	•	429
	•	malformed response
	•	unavailable service
	•	network failure
	•	webhook delay
	•	verification failure
	•	insufficient balance
	•	invalid account
	•	invalid customer
	•	expired intent
	•	duplicate request
	•	provider maintenance

Do not show:

Something went wrong.

Instead provide useful recovery states.

Example:

Your withdrawal request was received but the bank confirmation is still pending. Your balance has not been deducted twice.

⸻

32. SECURITY

Audit the entire payment implementation for:
	•	secret exposure
	•	browser-side provider keys
	•	authorization bypass
	•	IDOR
	•	transaction manipulation
	•	amount manipulation
	•	user impersonation
	•	webhook spoofing
	•	replay
	•	duplicate processing
	•	race conditions
	•	privilege escalation
	•	admin abuse
	•	sensitive logging
	•	PII leakage
	•	insecure redirects
	•	CSRF where applicable
	•	server action authorization
	•	API authorization
	•	database RLS
	•	rate limiting

Never trust:

amount
user_id
seller_id
provider_customer_id
transaction_id
status
fee

coming from the client.

Resolve sensitive values server-side.

⸻

33. ADMIN FINANCIAL CONTROL PLANE

Vallo Admin must become a serious financial operations system.

Admin should be able to inspect:

Transactions
	•	all transactions
	•	status
	•	amount
	•	provider
	•	user
	•	space
	•	agreement
	•	timestamps

Escrow
	•	active escrow
	•	funded
	•	awaiting confirmation
	•	disputes
	•	released
	•	stuck

Withdrawals
	•	pending
	•	completed
	•	failed
	•	suspicious

Transfers
	•	transfer history
	•	failures
	•	suspicious activity

Disputes
	•	open
	•	under review
	•	evidence
	•	resolution

Reconciliation
	•	mismatches
	•	failed events
	•	webhook errors
	•	provider inconsistencies

Provider health
	•	Payluk API health
	•	webhook health
	•	Paystack health
	•	Yellow Card integration health

Audit logs

Every sensitive admin action must be logged.

⸻

34. ADMIN PERMISSIONS

Do not make every admin a super admin.

Create proper permissions.

For example:

finance.view
finance.reconcile
finance.refund
finance.dispute
finance.withdrawal_review
payments.view
payments.manage
providers.view
providers.manage
audit.view

High-risk financial actions may require additional confirmation or dual approval.

⸻

35. NOTIFICATIONS

Connect financial events to Vallo notifications.

Examples:

Deposit

Money added successfully.

Withdrawal

Your withdrawal is processing.

Withdrawal completed

₦250,000 has been sent to your bank account.

Escrow funded

Your payment is protected.

Escrow released

Funds have been released.

Dispute

A dispute was opened on your transaction.

Refund

Your refund has been initiated.

Notifications must link directly to the correct transaction.

⸻

36. FRONTEND EXPERIENCE

The financial frontend must NOT look like a generic banking clone.

It should feel like Vallo.

Design principles:
	•	premium
	•	calm
	•	trustworthy
	•	extremely clear
	•	fast
	•	spacious
	•	blue Vallo identity
	•	deep navy dark mode
	•	excellent light mode
	•	restrained glow
	•	restrained glass
	•	strong typography
	•	excellent number formatting
	•	excellent status design
	•	meaningful motion
	•	no gaming aesthetic
	•	no excessive containers
	•	no visual clutter

Use Vallo’s existing design system.

Do not create a second design system.

⸻

37. WALLET SCREEN

Create or upgrade the Vallo money/wallet experience.

Potential structure:

Available
₦2,450,000

In Escrow
₦850,000

Pending
₦50,000

Actions:

Add Money
Withdraw
Send
Transactions

Then:

Protected Transactions

Show escrow separately.

Do not confuse available funds with protected escrow.

⸻

38. TRANSACTION LIST

Build a premium transaction list.

Each item should show:

icon
description
space/context
date
status
amount
direction

Examples:

Rent payment
Lekki 2 Bedroom
Protected
-₦1,800,000

Withdrawal
GTBank •••• 4821
Completed
-₦250,000

Payment received
Office Space
+₦850,000


⸻

39. TRANSACTION DETAIL DESIGN

Make this one of the best screens in Vallo.

It should clearly communicate:

What happened?

Where did the money go?

Why?

Who was involved?

Is the money protected?

What condition is waiting?

What happens next?

What is the provider reference?

What fees were charged?

Can I download my receipt?

Is there a dispute?

What evidence exists?

⸻

40. RECEIPT UI

Receipts should look like real Vallo financial documents.

Not a random browser print page.

Provide:
	•	clean receipt layout
	•	Vallo branding
	•	transaction information
	•	provider information
	•	parties
	•	space
	•	agreement
	•	amount
	•	fees
	•	status
	•	references
	•	timestamps
	•	downloadable document
	•	share action where appropriate

Ensure receipts are generated from server-authoritative transaction data.

⸻

41. ESCROW UI

Do not make escrow look complicated.

Explain it visually:

You pay
     ↓
Money protected
     ↓
Space / service condition completed
     ↓
You confirm
     ↓
Funds released

Show the actual transaction status.

If a dispute exists, clearly explain it.

⸻

42. PAYMENT CONFIRMATION

Before money moves, show a strong confirmation screen.

Example:

You're about to pay

Lekki Apartment
Monthly Rent

₦1,800,000

Payment protection
Payluk Escrow

Vallo Agreement
#AGR-000182

You'll be protected until
the required conditions are satisfied.

Then:

Confirm Payment

Do not hide important financial information behind tiny text.

⸻

43. LOADING / PROCESSING STATES

Financial operations require excellent state handling.

Examples:

Preparing secure payment...
Verifying payment...
Confirming with Payluk...
Protecting your funds...
Confirming withdrawal...
Waiting for bank confirmation...

Do not show fake progress.

Do not use timers to pretend a transaction is complete.

⸻

44. MOBILE

The entire financial architecture must work correctly in:
	•	iPhone
	•	Android
	•	web
	•	Capacitor WebView

Consider:
	•	keyboard
	•	safe area
	•	biometric/passcode confirmation where existing Vallo capabilities allow it
	•	deep links
	•	notification taps
	•	back navigation
	•	network interruptions
	•	app suspension
	•	retry
	•	duplicate taps

A transaction must survive the app being backgrounded.

⸻

45. DEEP LINKS

Financial notifications should deep-link into:

transaction
escrow
receipt
withdrawal
dispute
wallet

If the user taps a notification while logged out:

notification
↓
authentication
↓
restore intended destination
↓
transaction

Do not lose the destination.

⸻

46. OFFLINE / POOR NETWORK

Nigeria-specific reliability matters.

Assume:
	•	slow mobile network
	•	dropped connection
	•	app backgrounding
	•	retry
	•	duplicate taps

Never treat a timeout as failure automatically.

A timeout can mean:

UNKNOWN

The system should check provider state before allowing a retry.

⸻

47. YELLOW CARD ARCHITECTURE

Build Yellow Card as a separate provider adapter.

Do not merge Yellow Card directly into Payluk code.

Conceptually:

Vallo Payment Engine

Paystack Adapter
Payluk Adapter
Yellow Card Adapter

Yellow Card may later support:
	•	stablecoin payment
	•	stablecoin conversion
	•	fiat conversion
	•	cross-border payment
	•	international user funding

But first verify the actual production flow.

Create a provider capability matrix.

Example:

Capability	Payluk	Paystack	Yellow Card
Wallet	Yes	Provider-specific	Yes
Escrow	Yes	No	No
Bank withdrawal	Yes	Yes	Depending on flow
Stablecoin	Payluk cNGN	No	Yes
Cross-border	Limited/provider-specific	Limited	Yes
Vallo escrow	Yes	No	Not directly
Commercial payment	Yes	Yes	Yes
Crypto rail	cNGN	No	Yes

Do not assume the table is permanently correct.

Verify current provider documentation before implementation.

⸻

48. DO NOT CREATE A GENERIC “VAllO CRYPTO WALLET”

If Yellow Card is used later, present crypto/stablecoin funding as a payment rail tied to a specific transaction.

Prefer:

Pay with USDC

over:

Vallo Crypto Wallet

unless Vallo deliberately decides to build a regulated wallet product later.

⸻

49. OBSERVABILITY

Add structured financial logging.

Track:

payment.created
payment.confirmed
payment.failed
escrow.created
escrow.funded
escrow.released
withdrawal.created
withdrawal.completed
withdrawal.failed
transfer.created
transfer.completed
refund.created
refund.completed
dispute.opened
dispute.resolved
webhook.received
webhook.processed
reconciliation.failed

Never log secrets.

Never log full sensitive payment information unnecessarily.

⸻

50. METRICS

Create useful operational metrics:
	•	payment success rate
	•	payment failure rate
	•	escrow funding rate
	•	escrow release time
	•	withdrawal success rate
	•	withdrawal failure rate
	•	average withdrawal time
	•	webhook failure rate
	•	webhook latency
	•	reconciliation mismatch count
	•	provider API errors
	•	provider latency
	•	dispute rate
	•	refund rate

Admin should eventually be able to see these.

⸻

51. TESTING

Do not consider this complete until tested.

Build unit tests for:
	•	amount validation
	•	fee calculation
	•	state transitions
	•	provider mapping
	•	webhook processing
	•	idempotency
	•	authorization
	•	reconciliation
	•	receipt generation

Integration tests for:
	•	customer creation
	•	wallet retrieval
	•	deposit
	•	payment verification
	•	withdrawal
	•	bank verification
	•	transfer
	•	escrow
	•	milestone escrow
	•	disputes
	•	refunds
	•	webhooks

End-to-end tests for:

Rental

Tenant
→ agreement
→ payment
→ escrow
→ inspection
→ confirmation
→ release
→ landlord withdrawal

Marketplace/service

Buyer
→ escrow
→ seller fulfillment
→ evidence
→ confirmation
→ release

Withdrawal

balance
→ bank verification
→ withdrawal
→ provider processing
→ completion
→ receipt

Failure

double tap
→ only one transaction

Webhook replay

same webhook 5 times
→ processed once


⸻

52. PAYLUK SANDBOX

Use Payluk staging/sandbox functionality appropriately.

Do not test financial logic exclusively against mocks.

Where Payluk provides test facilities, use them.

Document:
	•	test credentials
	•	test accounts
	•	test banks
	•	test transactions
	•	webhook testing
	•	expected responses
	•	failure scenarios

Never commit production secrets.

⸻

53. RATE LIMITS

Payluk’s current API documentation indicates API request limits.

Do not build frontend behavior that directly hammers the API.

Implement:
	•	server-side calls
	•	controlled retries
	•	exponential backoff where appropriate
	•	caching where safe
	•	request deduplication
	•	rate-limit handling

Never retry money-moving requests blindly.

⸻

54. PROVIDER STATE VS VALLO STATE

This distinction is mandatory.

Example:

Vallo:

READY_FOR_RELEASE

Payluk:

OPENED

Do not assume these mean the same thing.

Store both.

This allows Vallo to build higher-level workflows without corrupting provider truth.

⸻

55. DOCUMENTATION

Create/update professional documentation.

At minimum create:

PAYLUK-INTEGRATION.md
PAYLUK-ARCHITECTURE.md
PAYLUK-API-MAPPING.md
PAYLUK-WEBHOOKS.md
PAYLUK-RECONCILIATION.md
PAYLUK-SECURITY.md
PAYLUK-TEST-REPORT.md
PAYLUK-PRODUCTION-CHECKLIST.md
PAYLUK-OPEN-QUESTIONS.md
YELLOWCARD-INTEGRATION.md
PAYMENTS-ARCHITECTURE.md

Document:
	•	architecture
	•	data flow
	•	provider mapping
	•	environment variables
	•	webhook handling
	•	database tables
	•	states
	•	errors
	•	deployment
	•	testing
	•	security
	•	reconciliation
	•	operational procedures

⸻

56. PAYLUK API MAPPING DOCUMENT

Create a table mapping Vallo operations to actual Payluk endpoints.

For example:

Vallo Operation
Payluk Endpoint
Method
Authentication
Request
Response
Database Mapping
Webhook
Error Handling

Do not invent endpoint names.

Populate it from the current official documentation.

⸻

57. AI AGENT SKILL

The Payluk AI Agent Skill is mandatory reading.

Go through:

https://docs.payluk.ng/guides/ai-agent-skill

Extract the useful implementation instructions.

Use them while implementing.

If Payluk provides SDK/tooling/examples specifically intended for AI-assisted development, use them where they improve correctness.

Do not blindly copy generated code.

Validate all generated code against the actual current Payluk API.

⸻

58. FRONTEND VISUAL QUALITY

This integration must not make Vallo suddenly look like a generic fintech application.

Financial surfaces must inherit Vallo’s design language.

Use:
	•	deep navy
	•	electric blue
	•	cyan accents
	•	excellent typography
	•	premium spacing
	•	restrained glass
	•	subtle glow
	•	crisp cards
	•	clean icons
	•	clear status colors
	•	beautiful motion
	•	light/dark mode
	•	mobile-first behavior

But avoid:
	•	excessive glass
	•	giant rounded containers everywhere
	•	gaming dashboards
	•	crypto-exchange aesthetics
	•	clutter
	•	meaningless animations
	•	unnecessary gradients
	•	fake security graphics

⸻

59. MOTION

Add subtle motion to:
	•	payment confirmation
	•	protected escrow state
	•	transaction timeline
	•	successful payment
	•	withdrawal processing
	•	receipt generation
	•	dispute states

Motion must communicate state.

Do not animate money values in a way that could imply money moved when it did not.

Respect reduced-motion settings.

⸻

60. ACCESSIBILITY

Financial interfaces must be especially accessible.

Audit:
	•	keyboard navigation
	•	screen readers
	•	contrast
	•	focus
	•	status announcements
	•	error messages
	•	form labels
	•	amount formatting
	•	touch targets
	•	reduced motion

Do not rely only on color to communicate:

success
pending
failed
protected
disputed


⸻

61. LEGAL / COMPLIANCE LANGUAGE

Do not claim:
	•	Vallo is a bank
	•	Vallo is an escrow institution
	•	Vallo is licensed by CBN
	•	Payluk provides a particular regulatory status unless confirmed by current provider/legal documentation
	•	Yellow Card provides a particular service unless confirmed

Use accurate language such as:

Vallo uses regulated/payment infrastructure partners for applicable financial services.

Have legal/compliance-sensitive language clearly marked for review.

⸻

62. NO FAKE FINANCIAL DATA

This is critical.

Never:
	•	fabricate balances
	•	fabricate transaction hashes
	•	fabricate provider references
	•	fabricate bank verification
	•	fabricate payment success
	•	fabricate escrow protection
	•	fabricate settlement
	•	fabricate receipts
	•	fabricate provider status

Mock data may exist only in explicitly isolated development/test environments.

⸻

63. EXISTING PAYSTACK

Do not destroy existing Paystack functionality.

Audit it.

Determine where Paystack remains the correct provider.

Likely use cases include:
	•	Vallo boosts
	•	paid listing features
	•	subscriptions
	•	service marketplace fees
	•	referral payouts
	•	other direct commercial payments

Where Payluk is superior for protected transactions, use Payluk.

Where Yellow Card is superior for stablecoin/cross-border infrastructure, use Yellow Card.

Do not force one provider to do everything.

⸻

64. FINANCIAL ROUTER

Build a clean internal decision layer.

Conceptually:

Vallo Payment Request
        ↓
Payment Router
        ↓
Determine:
- transaction type
- currency
- country
- escrow required?
- stablecoin?
- commercial fee?
- payout?
        ↓
Provider Adapter

This gives Vallo room to scale across Africa.

⸻

65. AFRICA EXPANSION

Do not hard-code Nigeria everywhere.

Build provider/currency/country configuration.

Vallo is Nigeria-first, Africa-focused.

Future countries may require:
	•	different currencies
	•	different providers
	•	different payout rails
	•	different verification
	•	different regulatory requirements

The architecture must allow expansion without rewriting payments.

⸻

66. FINAL PRODUCT FLOWS

At minimum, validate these complete journeys:

User deposits money

Vallo
→ Payluk
→ Payment intent
→ verification
→ wallet
→ receipt

User pays for protected space transaction

Space
→ Agreement
→ Transaction
→ Payluk escrow
→ Funding
→ Protected
→ Inspection
→ Confirmation
→ Release
→ Recipient balance
→ Withdrawal

User withdraws

Wallet
→ bank
→ account verification
→ withdrawal intent
→ verification
→ provider
→ completion
→ receipt

User sends money

Wallet
→ recipient
→ confirmation
→ Payluk transfer
→ verification
→ completion
→ receipt

Transaction dispute

Protected
→ dispute
→ evidence
→ review
→ provider resolution
→ Vallo transaction update
→ receipt/audit


⸻

67. WHAT NOT TO DO

DO NOT:
	•	rebuild Vallo
	•	create a separate payments application
	•	put Payluk calls everywhere
	•	expose Payluk secrets
	•	trust frontend amounts
	•	trust frontend status
	•	use deprecated virtual accounts
	•	build around cNGN
	•	create a fake Vallo bank
	•	fabricate blockchain hashes
	•	fabricate balances
	•	skip webhooks
	•	skip idempotency
	•	skip reconciliation
	•	hard-code provider fees
	•	hard-code provider states
	•	create duplicate customer records
	•	blindly retry withdrawals
	•	hide financial failures
	•	create ugly fintech UI
	•	leave mobile as an afterthought
	•	stop after the happy path works

⸻

68. IMPLEMENTATION ORDER

Do this in stages.

Phase 1

Repository and architecture audit.

Phase 2

Payluk documentation and AI Skill analysis.

Phase 3

Existing payment-system audit.

Phase 4

Provider abstraction.

Phase 5

Payluk customer mapping.

Phase 6

Wallet architecture.

Phase 7

Deposits.

Phase 8

Withdrawals.

Phase 9

Bank verification.

Phase 10

Wallet transfers.

Phase 11

Standard escrow.

Phase 12

Milestone escrow.

Phase 13

Conditions + inspections.

Phase 14

Disputes/refunds.

Phase 15

Webhooks/idempotency.

Phase 16

Ledger.

Phase 17

Reconciliation.

Phase 18

Receipts.

Phase 19

Admin financial control plane.

Phase 20

Frontend.

Phase 21

Mobile/Capacitor.

Phase 22

Yellow Card adapter foundation.

Phase 23

Security audit.

Phase 24

Testing.

Phase 25

Production readiness.

⸻

69. AUTONOMOUS EXECUTION

Do not repeatedly stop and ask the user for routine approval.

You have authorized access to the project.

Inspect first.

Reason first.

Use the existing architecture.

Make safe decisions.

If something is genuinely impossible or requires an external provider decision, document it and continue with everything else that can be completed.

Do not stop the entire implementation because one provider question remains unresolved.

⸻

70. WHEN YOU FIND SOMETHING WRONG

Do not merely report:

This is broken.

Determine:
	1.	Why it is broken.
	2.	What depends on it.
	3.	Whether fixing it risks existing functionality.
	4.	The safest correction.
	5.	How to test it.
	6.	Whether migration is required.
	7.	Whether documentation needs updating.

Then implement the correction where within your scope.

⸻

71. MIGRATIONS

Before database migrations:
	•	inspect current schema
	•	identify existing tables
	•	identify existing records
	•	preserve data
	•	avoid destructive migrations
	•	create backwards-compatible migrations where possible
	•	document migration requirements
	•	verify production safety

Never casually drop existing financial data.

⸻

72. FINAL AUDIT

When implementation is complete, perform another independent audit.

Ask:

Financial
	•	Can money accidentally be duplicated?
	•	Can money disappear from Vallo state?
	•	Can a user withdraw twice?
	•	Can a webhook credit twice?
	•	Can a frontend manipulate amounts?
	•	Can an unauthorized user access another transaction?
	•	Can an admin perform an unauthorized financial action?

Provider
	•	Are all Payluk endpoints current?
	•	Did we accidentally use deprecated APIs?
	•	Are provider states mapped correctly?
	•	Are webhooks implemented correctly?
	•	Are provider fees dynamic?

Product
	•	Does escrow actually connect to Vallo agreements?
	•	Does it connect to inspections?
	•	Does it connect to spaces?
	•	Does it connect to receipts?
	•	Does it connect to disputes?

UX
	•	Does the flow feel premium?
	•	Is it understandable?
	•	Is it mobile-safe?
	•	Is light mode good?
	•	Is dark mode good?
	•	Are loading/error states excellent?

Security
	•	Any secrets exposed?
	•	Any authorization gaps?
	•	Any IDOR?
	•	Any webhook spoofing?
	•	Any replay vulnerability?

Operations
	•	Can admin reconcile?
	•	Can support understand a transaction?
	•	Can finance identify mismatches?
	•	Can engineering debug a failed payment?

⸻

73. REQUIRED FINAL OUTPUT

When finished, write a comprehensive implementation report.

Include:
