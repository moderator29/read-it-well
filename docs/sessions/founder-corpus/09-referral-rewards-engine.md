# Referral and rewards: the locked architecture

Source: the founder's message of 7 October 2026, the one that asked for the
handoffs to be deleted and rewritten. The founder's refinement followed by the engine specification. The message
contained this specification three times over; it appears here once.

This file is the founder's own words. It is not a summary and it has not been
edited for content. The only change made to it is mechanical: the em dash is
forbidden everywhere under `docs/` by `apps/web/scripts/check-no-em-dash.mjs`,
so every em dash has been replaced with a hyphen. Nothing was cut, softened,
reordered or paraphrased.

---

Yes bro. This is the Referral + Rewards architecture I would lock in as the baseline for Vallo.

I would make one important refinement before implementation:

Do not treat the ₦76 and ₦80 withdrawal threshold as permanent product rules. Treat them as campaign configuration.

That way Vallo can launch with ₦76 if the economics work, then change the reward or minimum withdrawal without rewriting the referral engine.

What I would consider the final architecture

                    VALLO REFERRAL ENGINE
                           │
          ┌────────────────┼────────────────┐
          │                │                │
      ATTRIBUTION     QUALIFICATION      RISK/FRAUD
          │                │                │
          └────────────────┼────────────────┘
                           │
                    REWARDS LEDGER
                           │
              ┌────────────┴────────────┐
              │                         │
        USER EXPERIENCE             ADMIN CONTROL
              │                         │
       Invite & Earn              Referral Center
       Referrals                  Campaigns
       Rewards                    Fraud Center
       Withdraw                   Risk Graph
       Receipts                   Analytics
       Notifications              Payouts
              │                         │
              └────────────┬────────────┘
                           │
                    WITHDRAWAL ENGINE
                           │
                        Paystack
                           │
                     Bank payout

And the most important lifecycle remains:

REFERRAL LINK
      ↓
ATTRIBUTED
      ↓
ACCOUNT CREATED
      ↓
EMAIL + PHONE VERIFIED
      ↓
RISK CHECK
      ↓
REAL PRODUCT ACTIVATION
      ↓
QUALIFIED
      ↓
REWARD PENDING
      ↓
REVIEW WINDOW
      ↓
AVAILABLE
      ↓
WITHDRAWAL REQUEST
      ↓
ELIGIBILITY CHECK
      ↓
PAYSTACK
      ↓
WEBHOOK CONFIRMATION
      ↓
PAID

With abuse paths branching off at any point:

                    ↓
              UNDER REVIEW
                    ↓
              APPROVED / REJECTED
                    ↓
                  REVERSED

One thing I would add

The referral engine should have a Referral Qualification Policy Engine, rather than hard-coding:

email verified + phone verified + one action = qualified.

For example, campaigns should be able to define:

Campaign A
₦76
Qualification:
phone verified
email verified
onboarding completed
meaningful activity

Campaign B
₦150
Qualification:
phone verified
business profile completed
business verified

Campaign C
₦300
Qualification:
phone verified
legitimate property owner
space successfully published

That makes the system much more powerful as Vallo expands.

And the anti-fraud system should be a graph, not just rules

The system should continuously correlate:

User
├── phone
├── email
├── device
├── network
├── referral
├── referred users
├── payout account
├── activity
└── rewards

                    ↓

              RISK GRAPH

So if 15 accounts appear within a short period, share strong device relationships, refer each other, and eventually withdraw to the same payout destination, Vallo can identify the cluster without automatically accusing every shared-network user of fraud.

That is much stronger than an email === email check.

And financially

Keep these completely separate:

Vallo customer money
        ↓
Payment / escrow infrastructure


Vallo referral rewards
        ↓
Rewards ledger
        ↓
Withdrawal
        ↓
Paystack payout

A referral reward is not a Vallo wallet balance.

The ledger is authoritative, and Paystack is only the payout rail.

⸻

The end result

A normal user sees something extremely simple:

Invite & Earn

Bring people to Vallo and earn rewards when they become qualified users.

Available
₦1,824

Pending
₦456

12 qualified referrals

Invite friends

Withdraw

But underneath that simple experience is:

Attribution → Qualification → Risk → Rewards Ledger → Review → Payout → Reconciliation → Fraud Intelligence → Admin

That is exactly the kind of hidden infrastructure Vallo needs.

And I would keep the core business rule as:

Vallo rewards genuine network growth, not account creation.

That protects the economics, keeps the referral program from becoming a Gmail-farming scheme, and gives Vallo a foundation that can later support consumer, owner, agent, hotel, restaurant, business, professional and space-specific referral campaigns.

Yes bro. This is the Referral + Rewards architecture I would lock in as the baseline for Vallo.

I would make one important refinement before implementation:

Do not treat the ₦76 and ₦80 withdrawal threshold as permanent product rules. Treat them as campaign configuration.

That way Vallo can launch with ₦76 if the economics work, then change the reward or minimum withdrawal without rewriting the referral engine.

What I would consider the final architecture

                    VALLO REFERRAL ENGINE
                           │
          ┌────────────────┼────────────────┐
          │                │                │
      ATTRIBUTION     QUALIFICATION      RISK/FRAUD
          │                │                │
          └────────────────┼────────────────┘
                           │
                    REWARDS LEDGER
                           │
              ┌────────────┴────────────┐
              │                         │
        USER EXPERIENCE             ADMIN CONTROL
              │                         │
       Invite & Earn              Referral Center
       Referrals                  Campaigns
       Rewards                    Fraud Center
       Withdraw                   Risk Graph
       Receipts                   Analytics
       Notifications              Payouts
              │                         │
              └────────────┬────────────┘
                           │
                    WITHDRAWAL ENGINE
                           │
                        Paystack
                           │
                     Bank payout

And the most important lifecycle remains:

REFERRAL LINK
      ↓
ATTRIBUTED
      ↓
ACCOUNT CREATED
      ↓
EMAIL + PHONE VERIFIED
      ↓
RISK CHECK
      ↓
REAL PRODUCT ACTIVATION
      ↓
QUALIFIED
      ↓
REWARD PENDING
      ↓
REVIEW WINDOW
      ↓
AVAILABLE
      ↓
WITHDRAWAL REQUEST
      ↓
ELIGIBILITY CHECK
      ↓
PAYSTACK
      ↓
WEBHOOK CONFIRMATION
      ↓
PAID

With abuse paths branching off at any point:

                    ↓
              UNDER REVIEW
                    ↓
              APPROVED / REJECTED
                    ↓
                  REVERSED

One thing I would add

The referral engine should have a Referral Qualification Policy Engine, rather than hard-coding:

email verified + phone verified + one action = qualified.

For example, campaigns should be able to define:

Campaign A
₦76
Qualification:
phone verified
email verified
onboarding completed
meaningful activity

Campaign B
₦150
Qualification:
phone verified
business profile completed
business verified

Campaign C
₦300
Qualification:
phone verified
legitimate property owner
space successfully published

That makes the system much more powerful as Vallo expands.

And the anti-fraud system should be a graph, not just rules

The system should continuously correlate:

User
├── phone
├── email
├── device
├── network
├── referral
├── referred users
├── payout account
├── activity
└── rewards

                    ↓

              RISK GRAPH

So if 15 accounts appear within a short period, share strong device relationships, refer each other, and eventually withdraw to the same payout destination, Vallo can identify the cluster without automatically accusing every shared-network user of fraud.

That is much stronger than an email === email check.

And financially

Keep these completely separate:

Vallo customer money
        ↓
Payment / escrow infrastructure


Vallo referral rewards
        ↓
Rewards ledger
        ↓
Withdrawal
        ↓
Paystack payout

A referral reward is not a Vallo wallet balance.

The ledger is authoritative, and Paystack is only the payout rail.

⸻

The end result

A normal user sees something extremely simple:

Invite & Earn

Bring people to Vallo and earn rewards when they become qualified users.

Available
₦1,824

Pending
₦456

12 qualified referrals

Invite friends

Withdraw

But underneath that simple experience is:

Attribution → Qualification → Risk → Rewards Ledger → Review → Payout → Reconciliation → Fraud Intelligence → Admin

That is exactly the kind of hidden infrastructure Vallo needs.

And I would keep the core business rule as:

Vallo rewards genuine network growth, not account creation.

That protects the economics, keeps the referral program from becoming a Gmail-farming scheme, and gives Vallo a foundation that can later support consumer, owner, agent, hotel, restaurant, business, professional and space-specific referral campaigns.

Yes bro. Here is the full Vallo Referral + Rewards architecture we discussed, including the user side, backend, admin/fraud side, payout system, qualification, anti-farming, campaigns, and how it fits the rest of Vallo.

The key idea was that Vallo is not paying people simply because they created an account. We reward legitimate, qualified users who bring real people into Vallo and cause meaningful activation.

VALLO REFERRAL + REWARDS ENGINE

1. THE CORE MODEL

The basic concept you proposed was:

₦76 per qualified referral

with the original idea of:

₦80 minimum withdrawal

The ₦76 reward is the business hypothesis we discussed. The minimum withdrawal should ultimately be validated against payout economics, transfer fees, fraud exposure and campaign economics. We had also discussed that a higher minimum such as ₦1,000 could be economically cleaner, but ₦80 was your original concept and wasn’t locked as the final number.

The important part is:

Not this:

Invite person
↓
They create Gmail
↓
You get ₦76

Instead:

Invite person
        ↓
New person creates Vallo account
        ↓
Phone verified
        ↓
Email verified
        ↓
Anti-abuse checks
        ↓
Meaningful Vallo activation
        ↓
Referral becomes QUALIFIED
        ↓
₦76 reward created
        ↓
Review / risk window
        ↓
Reward becomes AVAILABLE
        ↓
User withdraws
        ↓
Paystack payout

That distinction is the entire point of the system.

⸻

2. WHAT COUNTS AS A REFERRAL?

A referral is a relationship between:

REFERRER
    ↓
REFERRED USER

Example:

Ebenezer
Referral code: VELLO-ABC123

    ↓

New user
Joined through the referral

But simply having the referral code attached to the new account does not automatically mean ₦76 is earned.

The referred user must become a legitimate Vallo user.

⸻

3. USER IDENTITY MODEL

One of the strongest rules we discussed:

One verified phone number = one personal Vallo account.

Email alone should NOT be considered sufficient identity.

Someone shouldn’t be able to do:

person@gmail.com
person2@gmail.com
person3@gmail.com
person4@gmail.com

and create ten accounts to farm their own referral program.

Phone verification becomes one of the strongest identity signals.

But don’t make the system so rigid that legitimate shared environments become impossible.

For example:
	•	family members
	•	shared Wi-Fi
	•	university networks
	•	offices
	•	public networks

can legitimately have multiple users.

Therefore:

Phone = strong identity signal

Device = risk signal

IP/network = risk signal

Bank account = strong payout relationship signal

Behaviour = risk signal

Referral graph = risk signal

⸻

4. REFERRAL CODE / LINK

Every eligible user receives:

Referral code
Referral link

Example:

vallo.app/r/EBENEZER76

or whatever final URL structure the product uses.

The user can share through:
	•	WhatsApp
	•	WhatsApp Status
	•	Instagram
	•	X
	•	Facebook
	•	Telegram
	•	copy link
	•	native share sheet
	•	SMS
	•	contacts

The referral link should deep-link properly into:

App
or
Web onboarding

and preserve attribution.

⸻

5. REFERRAL ATTRIBUTION

When somebody opens the referral link:

Referral link
      ↓
Referral attribution
      ↓
Signup
      ↓
Account created

Store the referral relationship server-side.

Example:

referral_id
referrer_user_id
referred_user_id
campaign_id
referral_code
source
attributed_at

Do not rely purely on browser/local storage.

The backend must ultimately determine the relationship.

⸻

6. REFERRAL LIFECYCLE

The full lifecycle we discussed:

INVITED
   ↓
SIGNED_UP
   ↓
EMAIL_VERIFIED
   ↓
PHONE_VERIFIED
   ↓
RISK_CHECK
   ↓
ACTIVATING
   ↓
QUALIFIED
   ↓
REWARD_PENDING
   ↓
REVIEW WINDOW
   ↓
APPROVED
   ↓
AVAILABLE
   ↓
WITHDRAWAL_REQUESTED
   ↓
PROCESSING
   ↓
PAID

Alternative failure paths:

UNDER_REVIEW
REJECTED
REVERSED


⸻

7. REFERRAL STATUS MODEL

We discussed these statuses:

Pending

Referral exists but qualification hasn’t happened.

Qualified

The referred user satisfied the qualification requirements.

Approved

Vallo’s system/risk layer has approved the reward.

Available

Reward is now available to the referrer for withdrawal.

Processing

Withdrawal has been requested and payout is being processed.

Paid

Money successfully paid.

Reversed

A previously credited reward was later invalidated because the referral was determined to be fraudulent or otherwise ineligible.

Under Review

Something triggered a fraud/risk review.

You can also internally maintain:

REJECTED
EXPIRED
CANCELLED

without necessarily exposing all of those states to users.

⸻

8. WHAT MAKES A REFERRAL QUALIFIED?

This is important.

Qualification should require meaningful activity.

At minimum, the system can consider:

Account created
+
Email verified
+
Phone verified
+
Risk checks passed
+
Meaningful Vallo activity

“Meaningful activity” should be defined by the current referral campaign.

For example:

General Vallo referral

Could require onboarding completion + legitimate product activity.

Property campaign

Could require the user to complete a legitimate property-search journey.

Business campaign

Could require a legitimate business onboarding/listing.

Marketplace campaign

Could require a legitimate transaction/action.

The architecture should support configurable qualification rules rather than hard-coding one rule forever.

⸻

9. DO NOT REWARD SIGNUP ALONE

This is one of the most important anti-abuse rules.

Don’t:

Signup = ₦76

Instead:

Signup
→ Verification
→ Activation
→ Risk check
→ Qualification
→ Reward

That dramatically reduces Gmail/account farming.

⸻

10. REWARD LEDGER

Do not simply do:

user.referral_balance += 76

Build a proper rewards ledger.

Conceptually:

rewards
reward_events
reward_balances
reward_withdrawals
reward_reversals
reward_adjustments

A reward event might be:

reward_id
referrer_user_id
referred_user_id
campaign_id
amount
currency
reason
status
created_at
available_at
approved_at
paid_at

Example:

REF-000184

Referrer:
User A

Referred:
User B

Reward:
₦76

Status:
Pending

Then later:

Qualified
→ Approved
→ Available


⸻

11. NEVER USE THE REWARDS BALANCE AS A BANK BALANCE

The referral balance is an internal Vallo rewards entitlement.

Don’t represent it as a regulated financial wallet.

Use language such as:

Rewards Balance

rather than implying:

Vallo Wallet

until there is a separate regulated wallet product.

⸻

12. USER REFERRAL DASHBOARD

This should be a beautiful Vallo-native experience.

Something like:

Invite & Earn

Your Rewards

₦1,824
Available

₦456
Pending

12
Qualified referrals

Then:

Your link

vallo.com/r/EBENEZER

[Copy Link]

[Share]

⸻

13. REFERRAL DASHBOARD SECTIONS

Overview
	•	available rewards
	•	pending rewards
	•	total earned
	•	qualified referrals
	•	successful payouts

Invite
	•	referral link
	•	referral code
	•	share buttons
	•	WhatsApp
	•	copy link
	•	QR code

Referrals

List:

John
Joined
✓ Qualified
₦76

Mary
Joined
Pending

Chris
Under review

Do not expose sensitive fraud reasons.

Rewards

Transaction-style history:

+₦76
Qualified referral
Oct 6

+₦76
Qualified referral
Oct 5

-₦500
Rewards withdrawal
Oct 5

Withdraw

Show:

Available:
₦1,824

Minimum withdrawal:
₦X

[ Withdraw ]


⸻

14. USER REFERRAL PROGRESS

Make it motivating without becoming scammy.

Example:

3 more qualified referrals to unlock your next campaign bonus.

Or:

5 qualified referrals
✓
10 qualified referrals
○

This is a campaign mechanic, not an MLM/downline structure.

⸻

15. CAMPAIGNS

The referral engine should support campaigns.

Example:

Launch Campaign

₦76 per qualified referral

Invite 5

Bonus
₦X

City Campaign

Lagos Launch

Lister Campaign

Invite a verified property owner.

Business Campaign

Bring a legitimate business onto Vallo.

Campaign configuration should include:

campaign_id
name
description
start_date
end_date
reward_amount
qualification_rules
maximum_rewards
eligible_users
country
city
category
bonus_rules
status


⸻

16. NO MLM / DOWNLINE MODEL

Very important.

Vallo referral should NOT become:

I invite A
A invites B
B invites C
I earn from B
B invites D
I earn from D

No pyramid/downline system.

The reward should be for direct legitimate referrals unless Vallo deliberately introduces a separate ambassador structure later.

⸻

17. AMBASSADOR / SCOUT LAYER

We discussed that later Vallo could introduce something like:

Vallo Ambassador

or:

Vallo Scout

But it should be based on legitimate contribution.

For example:

Consistent qualified referrals
+
good account standing
+
low fraud rate
+
useful local contribution

Potential benefits:
	•	higher campaign eligibility
	•	early access
	•	special badges
	•	local discovery opportunities
	•	promotional tools
	•	business onboarding opportunities

Not:

Earn passive money from people underneath you.

⸻

18. ANTI-SELF-REFERRAL ENGINE

This needs to be a real system, not:

if email === referrerEmail

because that is useless.

Evaluate multiple signals.

Identity
	•	verified phone
	•	email
	•	account identity
	•	profile information

Device
	•	device relationship
	•	device reuse
	•	device fingerprint/risk signals where lawful and appropriate

Network
	•	IP
	•	network relationship
	•	rapid account creation

But:

IP must NOT be an automatic ban.

Many legitimate Nigerians share:
	•	Wi-Fi
	•	mobile networks
	•	office networks
	•	university networks
	•	family networks.

Use it as a risk signal.

⸻

19. PAYOUT BANK RELATIONSHIP

This is a very useful anti-farming signal.

Suppose:

Account A
→ reward
→ Bank account X

and:

Account B
→ reward
→ Bank account X

and:

Account C
→ reward
→ Bank account X

That doesn’t automatically prove fraud.

But it should increase risk.

Especially if combined with:
	•	same device
	•	same phone relationship
	•	same network
	•	same referral graph
	•	immediate activity
	•	repeated account creation.

Then:

Under Review

rather than automatic ban.

⸻

20. REFERRAL GRAPH

This should be one of the more powerful admin tools.

Imagine:

                  User A
                 /      \
                /        \
             User B     User C
              /           \
          User D          User E

The system can identify suspicious clusters.

Example:

10 accounts
      ↓
same device
      ↓
same payout account
      ↓
same referral chain
      ↓
created within 20 minutes

That should trigger a high-risk cluster.

⸻

21. REFERRAL VELOCITY

Track:
	•	referrals per hour
	•	referrals per day
	•	account creation velocity
	•	reward velocity
	•	repeated devices
	•	repeated networks
	•	unusual geographic patterns
	•	unusually high conversion

Example:

Normal:

3 referrals in 2 days

Potentially suspicious:

47 accounts in 18 minutes

Don’t hard-code arbitrary numbers without testing.

Make thresholds configurable.

⸻

22. BEHAVIOURAL QUALIFICATION

Look at whether the referred user behaves like a real Vallo user.

Signals could include:
	•	onboarding completed
	•	searches
	•	listing views
	•	saves
	•	space interactions
	•	inquiries
	•	legitimate listing activity
	•	booking/payment activity where appropriate
	•	profile completion
	•	time between signup and activity

Don’t require users to perform pointless actions simply to farm rewards.

The qualification event should represent real product activation.

⸻

23. FRAUD RISK SCORE

Create an internal referral risk score.

Example:

LOW
MEDIUM
HIGH
CRITICAL

Signals can contribute to risk.

But the risk score should be:

Internal only.

Do not show:

Fraud score: 87%

to users.

Instead:

Pending

or:

Your reward is currently being reviewed.

⸻

24. REWARD HOLD PERIOD

After qualification:

₦76
↓
Pending review
↓
Available

The review window gives Vallo time to detect:
	•	account deletion
	•	fraud
	•	duplicate account
	•	suspicious behaviour
	•	chargeback-like behavior
	•	abuse patterns

The exact duration should be configurable.

⸻

25. REVERSALS

Suppose:

User earns ₦76
↓
Reward becomes available
↓
Later referral is determined invalid

Don’t delete the history.

Create:

REWARD_REVERSED

with:
	•	original reward
	•	reversal reason
	•	timestamp
	•	audit event
	•	admin/system actor

The ledger remains reconstructable.

⸻

26. WITHDRAWAL

When the user requests withdrawal:

Rewards Balance
      ↓
Withdrawal Request
      ↓
Eligibility Check
      ↓
Fraud / account check
      ↓
Payout account verification
      ↓
Paystack transfer
      ↓
Webhook
      ↓
Paid

Do not directly subtract money and assume Paystack succeeded.

⸻

27. PAYSTACK PAYOUT ARCHITECTURE

For referral rewards, we discussed using Paystack as the payout rail.

Conceptually:

Vallo Rewards Ledger
        ↓
Withdrawal Service
        ↓
Paystack Adapter
        ↓
Transfer
        ↓
Paystack webhook/status
        ↓
Vallo reconciliation
        ↓
Reward withdrawal = PAID

Paystack is the payout infrastructure.

Vallo owns:
	•	reward balance
	•	eligibility
	•	fraud checks
	•	withdrawal request
	•	ledger
	•	status
	•	receipt
	•	reconciliation.

⸻

28. PAYOUT STATES

Use something like:

REQUESTED
ELIGIBILITY_CHECK
PROCESSING
PROVIDER_PROCESSING
PAID
FAILED
REVERSED
UNDER_REVIEW

Never mark:

Paid

until there is provider-confirmed evidence.

⸻

29. REFERRAL PAYOUT RECEIPT

Every completed reward withdrawal should have a Vallo receipt.

Example:

VALLO

REWARDS PAYOUT

Receipt
VRP-2026-000184

Amount
₦760

Source
Referral Rewards

Status
Paid

Date
...

Destination
•••• 4821

Transaction reference
...


⸻

30. ADMIN REFERRAL CENTER

This is where Vallo’s admin system becomes powerful.

Create:

Referral & Rewards

Dashboard:

Total referrals
Qualified
Pending
Under review
Approved
Available
Paid
Reversed

Metrics:

Total rewards issued
Total rewards paid
Pending liability
Fraud prevented
Average qualification rate
Average payout


⸻

31. ADMIN REFERRAL TABLE

Columns:

Referral ID
Referrer
Referred user
Campaign
Date
Qualification
Reward
Risk
Status
Payout

Filters:
	•	date
	•	campaign
	•	status
	•	risk
	•	city
	•	country
	•	reward amount
	•	referrer
	•	referred user

⸻

32. REFERRAL DETAIL ADMIN PAGE

Clicking a referral should show:

Referral

Referrer
User A

Referred user
User B

Campaign
Launch Campaign

Reward
₦76

Status
Under Review

Qualification
✓ Phone verified
✓ Email verified
✓ Activation completed

Risk signals
Device relationship
Network relationship
Referral velocity

Payout
Not yet paid

Sensitive information should only be available to authorized staff.

⸻

33. FRAUD CENTER

Separate from the normal referral table.

Create:

Referral Fraud Center

Show:

High-risk clusters
Suspicious referrals
Repeated devices
Repeated payout accounts
Referral velocity alerts
Self-referral candidates
Duplicate accounts
Reward abuse


⸻

34. GRAPH VIEW

Give admins a relationship visualization:

          User A
        /   |   \
       /    |    \
      B     C     D
      |           |
      E           F

Clicking a node shows permitted information.

This is useful for finding coordinated abuse.

⸻

35. ADMIN ACTIONS

Authorized admins should be able to:
	•	approve
	•	reject
	•	place under review
	•	release reward
	•	reverse reward
	•	suspend referral eligibility
	•	adjust reward
	•	view evidence
	•	inspect relationship graph
	•	view payout history
	•	export reports

But sensitive actions should require:
	•	confirmation
	•	reason
	•	audit log

High-risk financial actions can require dual approval.

⸻

36. ADMIN MUST NEVER EDIT HISTORY

Don’t allow:

Change ₦76 to ₦500

directly on a historical reward.

Instead:

Original reward
₦76

Adjustment
+₦424

Reason
Approved campaign correction

Admin
...

Timestamp
...

Everything is auditable.

⸻

37. REFERRAL CAMPAIGN ADMIN

Admins should be able to create campaigns.

Example:

Campaign
Lagos Launch

Reward
₦76

Qualification
Verified + activated user

Start
Oct 1

End
Oct 31

Maximum rewards
...

Eligible users
All

Future campaigns can target:
	•	city
	•	user type
	•	property owners
	•	businesses
	•	agents
	•	hotels
	•	specific acquisition campaigns.

⸻

38. REWARD ECONOMICS DASHBOARD

Admin should know:

Invited
10,000

Signed up
4,500

Qualified
2,100

Rewards issued
₦159,600

Paid
₦140,000

Pending
₦19,600

Rejected
...

Fraud prevented
...

This lets Vallo determine whether referral acquisition is actually cheaper/better than paid acquisition.

⸻

39. REFERRAL ANALYTICS

Track the funnel:

Shares
↓
Clicks
↓
Signups
↓
Verified
↓
Activated
↓
Qualified
↓
Rewards
↓
Payout

Also:

Cost per qualified referral
Cost per activated user
Fraud rate
Qualification rate
Retention of referred users
Revenue generated by referred users

This is much more useful than simply counting signups.

⸻

40. REFERRAL QUALITY

Eventually rank referral sources based on the quality of the users they bring.

For example:

Referrer A
100 invites
60 qualified
45 retained

Referrer B
100 invites
12 qualified
4 retained

Referrer A is much more valuable.

This can later power the Ambassador/Scout system.

⸻

41. ANTI-ABUSE PRINCIPLE

Do not create a system that aggressively bans legitimate users because they share:
	•	Wi-Fi
	•	devices
	•	addresses
	•	networks
	•	families
	•	workplaces.

Instead:

Signals
↓
Risk engine
↓
Confidence
↓
Automatic qualification OR
temporary hold OR
manual review

This is much safer.

⸻

42. USER PRIVACY

Normal users should never be able to see:
	•	another person’s risk score
	•	device information
	•	IP information
	•	bank relationships
	•	internal fraud signals
	•	admin notes
	•	investigation data

Only show the status relevant to them.

⸻

43. REFERRAL NOTIFICATIONS

Notify the referrer:

Your referral joined Vallo

Then:

Your referral is now qualified

Then:

₦76 reward is available

Then:

Your rewards payout is processing

Then:

₦XXX rewards payout completed

The referred user can receive appropriate onboarding notifications, but don’t make them feel like a bounty.

⸻

44. SOCIAL SHARING

Make referral sharing actually good.

Example share message:

I’m using Vallo to discover and understand spaces without the runaround. Join me on Vallo.

Then the referral link.

Do not make it look like:

“Join this app so I can make money.”

The product should be the reason for the invitation.

⸻

45. REFERRAL LANDING EXPERIENCE

When a new person opens a referral link:

Someone invited you to Vallo.

Find your space.
Without the runaround.

Discover homes, hotels, short-lets,
businesses and more.

[ Get Started ]

Then preserve referral attribution through onboarding.

⸻

46. BACKEND ARCHITECTURE

Conceptually:

referrals/
    attribution
    qualification
    risk
    rewards
    campaigns
    withdrawals
    analytics
    notifications

Services:

ReferralService
ReferralQualificationService
ReferralRiskService
RewardsLedgerService
RewardWithdrawalService
ReferralCampaignService
ReferralAnalyticsService
ReferralFraudService
ReferralNotificationService

Use the existing Vallo architecture if equivalent services already exist.

⸻

47. DATABASE MODEL

Potential architecture:

referral_codes
referrals
referral_events
referral_campaigns
referral_qualification_rules
referral_risk_signals
referral_risk_cases
reward_accounts
reward_ledger_entries
reward_withdrawals
reward_payouts
reward_adjustments

Don’t blindly create duplicates. Inspect the existing schema first.

⸻

48. REWARDS LEDGER EXAMPLE

Imagine user has earned three referrals:

+₦76
Referral #001
Qualified

+₦76
Referral #002
Qualified

+₦76
Referral #003
Qualified

Ledger:

Opening balance       ₦0
Reward #001          +₦76
Reward #002          +₦76
Reward #003          +₦76
Available             ₦228

Then withdrawal:

Withdrawal           -₦228
Available             ₦0

Paystack confirms payout.

The entire history remains.

⸻

49. REFERRAL + VAllO ECOSYSTEM

The referral engine shouldn’t only acquire consumers.

Future campaign types:

Consumer referral

Bring a new Vallo user.

Owner referral

Bring a landlord/property owner.

Agent referral

Bring a legitimate agent.

Business referral

Bring a restaurant/hotel/business.

Space referral

Bring a legitimate space/listing.

Professional referral

Bring a verified service provider.

Each campaign can have different qualification rules and rewards.

⸻

50. IMPORTANT: TRUST MUST NOT BE FOR SALE

Referral rewards should never allow:

Pay to become verified.

And:

Referral reward ≠ verification.

Vallo Verified remains an independent trust system.

Someone cannot buy trust through referral activity.

⸻

51. REFERRAL + PAID PROMOTION

Keep separate:

Referral Rewards

and:

Listing Promotion

A user earns rewards for legitimate referrals.

A lister pays for:
	•	Boost
	•	Spotlight
	•	Featured
	•	Prime

depending on Vallo’s final promotion structure.

Do not allow rewards to manipulate trust ranking.

⸻

52. REFERRAL + VAllO MONEY

Keep the architecture separated:

Vallo Money
      ↓
provider-backed financial transactions

Vallo Rewards
      ↓
referral entitlements
      ↓
payout through supported provider

Do not mix customer transaction balances and rewards balances.

⸻

53. THE BIG PICTURE

The complete architecture becomes:

                    VALLO REFERRAL
                         │
              ┌──────────┴──────────┐
              │                     │
          USER SIDE             ADMIN SIDE
              │                     │
        Referral Link         Referral Center
        Referral Code         Campaigns
        Invite                 Analytics
        Progress               Fraud Center
        Rewards                Risk Graph
        Withdraw               Payouts
        Receipts               Reconciliation
              │                     │
              └──────────┬──────────┘
                         │
                  REFERRAL ENGINE
                         │
       ┌─────────────────┼─────────────────┐
       │                 │                 │
Attribution       Qualification       Risk/Fraud
       │                 │                 │
       └─────────────────┼─────────────────┘
                         │
                  REWARDS LEDGER
                         │
                  Withdrawal Engine
                         │
                    Paystack
                         │
                    Bank Payout


⸻

54. THE PRINCIPLE WE SHOULD KEEP

The best version of Vallo’s referral program is not:

“Come to Vallo and make money.”

It is:

“Bring people who genuinely need Vallo, and Vallo rewards you for helping the network grow.”

That keeps it aligned with the actual Vallo network effect.

And the system underneath should be sophisticated enough that someone cannot simply create 10 Gmail accounts, refer themselves 10 times, collect ₦760 and withdraw it.

The architecture should instead recognize:

real user → real activation → real referral → real reward → controlled payout.

That is the referral system we were building toward.
