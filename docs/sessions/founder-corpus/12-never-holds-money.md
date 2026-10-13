# Why Vallo never holds customer money, and what that implies

Source: the founder's research message, the proven pattern he chose to follow.

This file is the founder's own words. It is not a summary and it has not been
edited for content. The only change made to it is mechanical: the em dash is
forbidden everywhere under `docs/` by `apps/web/scripts/check-no-em-dash.mjs`,
so every em dash has been replaced with a hyphen. Nothing was cut, softened,
reordered or paraphrased.

---

Yes - there is a proven pattern. Established platforms either (a) never hold customer money themselves (they route it through a licensed payment processor or bank partner), (b) hold it via a separately licensed payments/escrow entity (their own subsidiary or a third-party), or (c) use immediate settlement + separate protection products. Pure “we collect into our company account and release later” is the regulated custody/money-transmission model that triggers licences in Nigeria (and most jurisdictions).55
Platform-by-platform money-flow findings
1. Zillow (Rental Manager / online rent payments)
* Does the platform hold customer money? Briefly in the processing pipeline, but not as long-term custody.
* Who moves the money? Stripe (and Plaid for bank linking). Payments (ACH free for tenants; card fees) go to the landlord’s linked bank account after processing (typically 2-5 business days; “Fast Payments” can be faster).
* Licence: Zillow does not hold a money-transmitter licence for this; it operates through Stripe’s rails and identity verification. Landlords link their own deposit account.
* Timing: Rent is due on the set date; tenant initiates (or autopay). No pre-viewing hold of full rent for protection. Security deposits and one-time charges can be collected the same way.
* Disputes/refunds: Handled via the payment processor/bank rails; platform tools for requests/credits, but money is already moving or deposited.13
2. Apartments.com
* Similar to Zillow. Platform does not hold funds long-term.
* Money moved by their payment processor; ACH 3-5 business days, cards 2-3 days into landlord’s account. Free for landlords on ACH; tenants pay card fees (~2.75%).
* No independent money-transmitter posture for the core flow; funds deposit directly.
* Timing: Ongoing rent collection after lease setup; can collect deposits/move-in costs. No “inspect then release” hold of the full amount.
* Refunds follow normal payment-processor chargeback/refund paths.35
3. Realtor.com (via Avail)
* Same pattern: online rent collection deposits directly to the landlord’s bank (often 2-3 business days; FastPay next-day options).
* Processor handles movement; platform facilitates setup, reminders, late fees.
* No indication the platform itself is the licensed money transmitter for these flows.
* Timing and refunds mirror the Zillow/Apartments.com model.45
4. Airbnb (payments & payout timing)
* Platform does hold guest money from booking until release. Guest is charged at booking (or according to policy).
* Who moves it: Airbnb Payments entities (Airbnb Payments, Inc. in the US is a registered Money Services Business with FinCEN and holds state money-transmitter licences; EU entity is a licensed payment institution; other markets use local licensed partners/banks).
* Airbnb itself is structured with dedicated licensed payments subsidiaries rather than the marketplace operating company holding funds.
* Timing: Host payout initiated ~24 hours after scheduled check-in (not checkout) for most stays; 3-5+ business days to bank depending on method. Long stays (28+ nights) paid in instalments. New hosts or risk cases can be delayed.
* Disputes/cancellations: Funds still with Airbnb Payments at the relevant point; platform policies + payment-entity controls determine refund vs payout.0
5. Booking.com
* Two models: (1) Guest pays property directly, or (2) “Payments by Booking.com” - Booking collects and pays the property.
* In the facilitated model, Booking (or its payments partners) holds/collects; payout via bank transfer (daily/weekly/monthly after checkout in many cases) or virtual credit card. Stripe is used in some markets.
* Booking operates regulated payment facilitation where required; partners often handle local licensing.
* Timing relative to stay: Collection often before or around arrival; payout typically after checkout (or on check-in in some Stripe setups).
* Refunds: Handled by the collecting entity under Booking’s policies.25
6. Nigerian / African platforms
* PropertyPro / similar listing portals: Generally do not hold money. Tenant pays agent/landlord directly. No escrow protection → higher scam risk.76
* Spleet: Managed/furnished model + rent-now-pay-later financing. Platform (or partners) often pays landlord and collects from tenant in instalments; security deposits can involve escrow language with an appointed agent. More managed inventory than pure open marketplace.77
* RentSmallSmall / Muster / similar: Rent financing or managed models - platform or financier pays landlord upfront, tenant repays monthly. Custody sits with the licensed financing/payment side.
* Mushrooms.ng (and similar verification-first plays): Explicit escrow - seeker pays into platform escrow; funds released only after confirmed move-in / match to listing; full refund if mismatch. They describe holding the money until confirmation. This is the closest local analogue to the “protected until confirmed” promise, but it requires careful structuring (own licence, bank partner escrow, or processor-held funds) to stay compliant with CBN rules.115
* Stay Assist and some short-let players also advertise holding until check-in.
CBN reality: Holding customer funds (wallets, prolonged escrow, money transmission) generally requires an appropriate Payment Service Provider licence (PSSP/PSS, MMO, etc.). Capital/escrow deposits run from tens to hundreds of millions of naira depending on category. PSSPs process but are restricted from holding deposits the way MMOs can. Marketplaces that simply route via licensed processors stay lighter.56
7. General marketplaces (Etsy, Upwork, etc.)
* Upwork: Uses a dedicated licensed escrow entity (Upwork Escrow, California-licensed internet escrow agent). Client funds a milestone; money sits in escrow; released on approval (or auto-release rules). Separate licensed vehicle, not the main marketplace operating company treating funds as its own.96
* Etsy: Holds seller balances, applies reserves/holds (especially for new sellers), then deposits via payment partners. Structured with payment partners and risk reserves; not a pure bank, but regulated payment handling.
* Pattern: Condition-based release is done either via a licensed escrow/payment subsidiary or via the processor’s delayed-settlement / Connect-style features, not by parking money in an unlicensed company account.
The specific “money protected until confirmed” pattern that avoids your own banking/money-transmitter licence
Proven mechanisms (ranked by practicality for a Nigerian marketplace):
1. Payment-processor marketplace / split / delayed-settlement features (Paystack, Flutterwave, Stripe Connect equivalents)
    * Buyer pays; funds settle into sub-accounts or are held under the processor’s licence and control.
    * Platform defines the release trigger (inspection confirmed, check-in, stay completed) via API / webhooks / internal ledger.
    * Split at capture (percentage or flat to owner sub-account + platform fee) or capture-then-disburse on condition.
    * Platform never becomes the principal holder of the funds. Compliance burden stays largely with the licensed PSSP.
    * Note: Pure immediate split makes clawbacks harder; delayed payout / reserve models give more control for disputes but require careful legal framing so the platform is not deemed to be holding customer funds.87
2. Third-party licensed escrow agent or bank escrow account
    * Funds go into an account controlled by a licensed escrow provider or bank under clear escrow instructions (release only on platform confirmation or dispute outcome).
    * Platform is the instruction-giver, not the custodian. Upwork’s model is the clean analogue.
3. Immediate payment to owner + separate guarantee / insurance / refund product
    * Money moves straight (or via processor) to the owner.
    * Platform sells or partners for a “protection guarantee” (insurance-backed or self-funded reserve) that refunds the guest/tenant if the property fails inspection or is not as described.
    * Avoids custody entirely. Marketing still supports “your money is protected.” Higher cost or underwriting work required.
Airbnb/Booking scale versions of (1)+(2) use their own licensed payments entities. Pure listing sites (many Nigerian portals, Zillow-style rent collection) use (1) with direct-to-owner settlement and no long hold.
Crypto angle
Accepting crypto that is immediately converted to Naira by a licensed VASP/off-ramp (Breet, Monica, Quidax, Busha, etc.) and then settled via the same fiat rails above does not remove the custody question - it adds a layer.
* The conversion/settlement provider (if licensed under SEC VASP framework / CBN rules) handles the crypto custody and FX.
* Once in Naira, the same “does the marketplace hold it?” rules apply. If the Naira sits in your company account pending inspection, you are back in regulated territory.
* Clean structure: crypto → licensed off-ramp → processor sub-account / escrow under the same delayed-release rules as card/bank payments.
* Real platforms in emerging markets do this via licensed on/off-ramps so the marketplace never custodians crypto or prolonged fiat. Holding crypto yourself or running an unlicensed wallet would add SEC/CBN obligations.110
Clear recommendation for Vallo (safest professional architecture without your own CBN money-transmitter / banking licence)
Primary architecture - processor-held / delayed-release marketplace payments:
* Integrate Paystack or Flutterwave (both licensed PSSPs) using their subaccount / split-payment / Connect-style features, or an equivalent delayed-disbursement + internal ledger model.
* Guest/tenant pays at booking or commitment. Funds are captured under the processor’s licence.
* Platform fee is taken; owner’s share is designated to their verified sub-account or held pending the release trigger.
* Release trigger: digital confirmation of inspection (for buy/rent) or check-in / stay completion (for short stays), plus any automated time-based rules.
* On dispute/cancellation: funds remain under processor control; platform issues refund instruction or routes to dispute flow. Owner is never paid until the condition is met.
* Owners complete KYC/onboarding into the processor’s system so money never lands in VALLO SPACES LTD’s operating account as customer funds.
* For extra protection, layer a small platform-funded or insurance-backed guarantee for edge cases the processor cannot cover.
Secondary / complementary options:
* Partner with a licensed Nigerian escrow provider or bank for formal escrow instructions on higher-value transactions.
* Or offer “pay owner immediately + optional protection plan” for users who prefer speed, keeping the protected-hold path as the default for trust.
Avoid: Collecting into your corporate bank account (or a company wallet) and manually releasing later. That is the model that triggers licensing risk.
Crypto path: Accept via a licensed off-ramp that converts and settles into the same processor/escrow rails. Never hold the crypto or the converted Naira yourself pending confirmation.
This gets you as close as possible to “your money is protected until you confirm the property/stay is as described” while keeping VALLO as a marketplace that orchestrates, not a money transmitter. It matches how Zillow/Apartments-style rent collection, processor-powered African marketplaces, and the regulated parts of Airbnb/Upwork actually work.
Engage Nigerian counsel (and the chosen PSP’s compliance team) early to document the flow, terms, and release conditions so the arrangement clearly falls under the processor’s licence rather than creating a de-facto unlicensed escrow. Capital and compliance costs of a full CBN PSP licence are high; the processor route is the professional, launch-ready path used by successful platforms.

This is grok response ::: 


Not useful. Let me try more specific.

Now Apartments.com and Realtor.com.

Short answer: yes, the pattern exists, and it has one rule. The conditional hold is fine, but the money has to sit with a licensed party, never in VALLO SPACES LTD’s own account. Every big platform that holds funds itself does it under its own licence. Every platform that avoids a licence lets a licensed processor or bank hold and move the money.

How the big platforms do it

Airbnb. Yes, it holds guest money, under its own licences. The guest is charged in full at booking, and the host payout is released about 24 hours after check-in. Stays of 28+ nights pay out monthly.  Its subsidiary Airbnb Payments is a FinCEN-registered money services business and holds money transmitter licences across US states.  In Europe the same role is played by a Luxembourg entity licensed as a payment institution.  The legal trick worth copying is the wording: Airbnb Payments acts as the host’s “limited payment collection agent,” so once the guest pays Airbnb Payments, their obligation to the host is satisfied.  Refunds before payout come from the funds Airbnb is already holding.

Booking.com. It runs two models. In the first, the guest pays the property directly. In the second, Booking charges the guest on the host’s behalf and pays the host later.  The guest is charged when the reservation becomes non-refundable under the cancellation policy.  Bank-transfer payouts go out after checkout, weekly or monthly.  In the US and Canada, Stripe serves as the payment provider for some partners.  Booking’s own annual report warns that regulators may decide parts of its business are money transmission requiring licences.  So even Booking treats holding money as a licensing risk.

Zillow Rental Manager. It never holds money conditionally. Zillow says it partners with Stripe and Plaid for processing.  Rent lands in the landlord’s account within up to 5 business days.  This is straight rent collection with no inspection-linked hold. Disputes are ordinary chargebacks or ACH returns through the processor.

Apartments.com. ACH rent takes about 3-5 business days and card payments about 2-3.  Its rent tool traces back to Cozy, which CoStar acquired. Cozy’s CEO stated the model plainly: Cozy never took custody of funds, and Stripe, a licensed money transmitter, moved the money on its behalf. 

Realtor.com. Its rentals run through Avail. Payments reach the landlord within three business days, or next-day with FastPay.  I couldn’t confirm Avail’s processor. The for-sale side is lead generation. Purchase money in US home sales goes through independent licensed escrow or title companies, not the portal.

Nigeria and Africa

The regulatory core is this: only Mobile Money Operators are permitted to hold customer funds, and payment-solution licences allow processing and aggregation without the capacity to hold funds.  An MMO licence needs ₦2bn in shareholder funds plus an equal escrow deposit.  That is why your current design is the problem.

	•	Spleet avoids custody by being a marketplace plus a lender. Its “rent now, pay later” pays rent upfront so the tenant can repay monthly.  That creates credit risk, not a custody question.
	•	Muster and Fibre use master-lease or managed models, so they are the landlord, not a middleman.
	•	EscrowPay, launched June 2026, is the cleanest local example of the bank-held pattern. Buyer payments sit in a designated account at Rubies Microfinance Bank rather than on EscrowPay’s books.  The buyer gets 48 hours to confirm or dispute, and silence auto-releases funds to the seller. 
	•	Dwelns and Mansior claim escrow for shortlets and inspections. Dwelns says host payouts are held until the guest physically verifies the apartment.  I couldn’t verify who legally holds the funds for either.
	•	Vesicash sells escrow APIs to Nigerian businesses, but I couldn’t confirm its current licensing.

General marketplaces

Upwork got its own licence. Upwork Escrow is a licensed Internet escrow agent under California regulators.  It holds escrowed cash in trust and must top the trust up from operating cash when there are shortfalls. 

Etsy uses the guarantee model instead of a hold. The seller gets paid normally, and Etsy committed at least $25M a year to refund buyers on qualifying orders up to $250.  The refund comes from Etsy’s own pocket, so no customer money is ever held conditionally.

So, the three real mechanisms

	1.	Processor-held delayed settlement. Split payments on Paystack or Flutterwave, with the host or landlord as a subaccount. Paystack subaccounts support auto, weekly, monthly, or manual payout schedules.  Money sits in the processor’s settlement pipeline under their licence, and you trigger release. Get Paystack or Flutterwave to confirm in writing that condition-based holds are within their terms. Some processors treat long holds as escrow they didn’t sign up for, especially on large rent amounts.
	2.	Bank or licensed-escrow custody. Use a tri-partite escrow agreement with a CBN-licensed bank or MFB (the EscrowPay model), or a licensed escrow provider. The bank is custodian, and release follows the agreed triggers.
	3.	Pay-through plus a guarantee. Money goes straight to the owner, and Vallo funds a capped refund guarantee from its take rate (the Etsy model), optionally insured.

Crypto

Crypto adds a second regulator rather than changing the custody answer. The SEC began licensing crypto exchanges in 2024, starting with provisional approvals for Quidax and Busha.  The Investments and Securities Act 2025 brought virtual asset providers further under SEC oversight.  If Vallo receives or holds crypto itself, you are drifting into VASP territory. SEC rules set a ₦500m minimum capital for digital asset exchanges. 

The clean setup is a licensed ramp that receives the crypto, converts it, and settles naira into the same processor or escrow rail. Vallo never touches a wallet. Real options include Busha Commerce, a gateway letting businesses accept crypto payments  and Yellow Card’s payments API for stablecoin on/off-ramp.  Cowrie and COINQVEST also let Nigerian merchants such as PayPorte accept crypto settled to naira bank accounts. 

Recommendation for Vallo

	•	Short stays: copy Airbnb’s timing, not its licence. Charge at booking through Paystack or Flutterwave split payments with the host on a manual or delayed subaccount. Auto-release 24 hours after check-in unless the guest flags an issue. Vallo’s commission splits automatically. Refunds go through the processor’s refund API from the held balance.
	•	Long-term rent: don’t collect a year’s rent before inspection. Take only a small inspection or booking fee first. After the tenant confirms, rent goes into a bank-held escrow account at a partner bank or MFB. Release on move-in confirmation, with a 48-72 hour auto-release.
	•	Sales: Vallo never touches purchase money. Use a bank escrow or the conveyancing lawyer’s client account, and earn a fee.
	•	Everywhere: add a capped “Vallo Guarantee” funded from your margin. Put “limited payment collection agent” language in your terms. Only use the word “escrow” in marketing where a licensed party really is the escrow agent. Crypto enters only through a licensed ramp that settles naira.

I’m not a lawyer. Before launch, get a Nigerian fintech counsel’s opinion on the agent-model wording, plus written sign-off from your processor and escrow bank.

A deeper investigation could verify current Paystack and Flutterwave hold terms, the licences behind Nigerian escrow providers, and post-2025 SEC crypto rules.

Claude chat own:: 


Yes. I dug into the actual payment terms, processor documentation, Nigerian regulatory material, and the current product documentation for the platforms you named. There is a real, proven architecture for giving users a “funds protected until condition X” experience without Vallo itself becoming the entity that holds the money. But there is an important distinction:

Using a licensed payment provider for ordinary collection/splitting is not automatically the same thing as outsourcing escrow. If Vallo’s own account receives the customer’s money and Vallo decides when to release it, you have recreated the custody problem.

The clean architecture is to make the licensed financial/escrow entity the actual holder and mover of the funds, while Vallo controls the business logic that tells that entity when the contractual condition has been satisfied.

⸻

1. What the big platforms actually do

Zillow Rental Manager

Zillow is actually a very useful example because its legal terms are unusually explicit.

Zillow says its rental payment feature uses Stripe Connect. Rental Managers have to establish a Stripe Connect account to receive payments. Zillow expressly says it does not hold money transferred through the Rentals Platform. It also uses third-party processors such as Chase for some other payment functions and Plaid for bank linking.  

Flow

Tenant → payment processor / Stripe Connect → landlord

Not:

Tenant → Zillow bank account → Zillow holds → landlord

Zillow’s own terms say payments are consummated outside Zillow and that Zillow isn’t the money transmitter/payment processor.  

What happens with disputes?

If a bank/card issuer initiates a reversal or chargeback, Zillow says the third-party processor can reverse or claim the funds from the relevant account.  

Important for Vallo

Zillow demonstrates the non-custodial rental collection model, but not your desired “hold until inspection/check-in” model.

⸻

2. Apartments.com

This one is even more interesting.

Apartments.com’s current terms explicitly say:

Apartments.com is a facilitation service and does not act as a payment processor or money transmitter.

For its Payment Portal, Apartments.com creates an account with its third-party payment processor on behalf of the user, and the payments are “consummated outside of Apartments.com.”  

The terms also specifically state:

“Apartments.com does not hold any money you transfer through the Payment Portal.”

The third-party processor handles the actual transmission and receipt.  

Flow

Tenant → third-party payment processor → rental manager

Apartments.com sits in the middle from a UX/API perspective, but not as the custodian of the funds.

Does it protect rent until inspection?

No.

It’s primarily a rent collection system, rather than an escrow product. Rent is paid according to the landlord/tenant’s lease obligations.

Disputes

Chargebacks/reversals are handled through the processor/payment rails, with the terms authorizing the processor to reverse or claim funds.  

Vallo lesson

If Vallo simply wants:

“Pay your landlord through Vallo”

this architecture is straightforward.

If Vallo wants:

“Your ₦2,000,000 stays protected until you inspect the house and approve it”

ordinary payment processing isn’t enough.

⸻

3. Realtor.com / Avail

Realtor.com’s rental payment functionality is tied to Avail.

Avail advertises online collection of:
	•	rent
	•	security deposits
	•	move-in fees
	•	other rental charges

and says it has processed more than $2 billion in rental payments.  

Avail’s payment system shows a conventional payment-collection model: the renter pays through the portal, the payment goes through the banking/payment system, and the landlord receives the funds according to the processing schedule. Current Avail documentation describes pending, withdrawn/paid and deposited states, with funds reaching the landlord’s verified bank account after processing.  

Key point

This is another example of:

marketplace/software layer ≠ money custodian

But it isn’t the same as an escrow guarantee.

⸻

4. Airbnb is different

Airbnb is probably the most relevant model for what Vallo wants to build.

Airbnb doesn’t merely provide a payment button.

Its payment subsidiaries actually provide regulated payment services.

Airbnb’s current Payments Terms say Airbnb Payments:
	•	collects payments from guests
	•	makes payouts to hosts
	•	acts as the host’s limited payment collection agent
	•	can refund guests
	•	handles payment-related regulatory obligations.  

Airbnb even identifies regulated entities in different jurisdictions. For example, Airbnb Payments UK is authorised and regulated by the UK’s Financial Conduct Authority as an Electronic Money Institution. Airbnb Payments Luxembourg is regulated by Luxembourg’s CSSF.  

So Airbnb didn’t solve the problem by saying:

“We’re a marketplace, therefore we’re allowed to hold the money.”

They created/operate regulated payment entities.

When does Airbnb collect?

Generally, Airbnb Payments collects the booking amount when the host accepts the reservation.  

When does the host get paid?

Airbnb says the typical host payout is released about 24 hours after the guest checks in.  

That’s extremely close to your desired UX:

Guest pays → Airbnb holds/controls payment → guest checks in → Airbnb releases host payout.

Refund

Airbnb Payments can refund the guest under Airbnb’s applicable cancellation/refund policies.  

This is the important lesson

The exact feature you want exists at massive scale.

But Airbnb achieves it through a payment infrastructure/legal structure capable of handling the money.

You shouldn’t copy Airbnb by simply putting the money into:

VALLO SPACES LTD’s bank account.

You copy the architecture, not necessarily the corporate structure.

⸻

5. Booking.com

Booking.com has another very useful model.

Booking.com has Payments by Booking.com (PbB).

Its documentation says Payments by Booking.com facilitates guest payments to properties and then pays the property using mechanisms such as:
	•	virtual credit cards
	•	bank transfers

It also supports properties where the guest pays the property directly at arrival, known as Pay at Property.  

Its accommodation agreement explicitly says Booking.com may engage a third-party Payment Processor to collect payments from guests and transfer/settle funds with accommodation providers.  

Therefore there are two models

Model A

Guest → Booking.com/payment processor → Booking.com-controlled payment flow → property payout

or

Model B

Guest → property at check-in

depending on the booking.

Booking.com’s payment APIs expose:
	•	payout amount
	•	payout status
	•	payout method
	•	commission
	•	bank-transfer information
	•	VCC information
	•	estimated amount property must collect from guest.  

Vallo lesson

Booking.com demonstrates that you can design the marketplace so that the financial institution/payment processor controls the actual funds movement while the marketplace controls the reservation/business state.

⸻

6. Nigerian/African examples

This is where the research becomes particularly interesting.

Quickteller Homes / Interswitch

There is a very close Nigerian precedent.

Interswitch’s Quickteller Homes documentation says that after a successful payment:

the funds are secured in an escrow account until the escrow code is provided to the host to initiate payout.

It also says the guest can check in through the dashboard.  

That’s essentially:

Guest pays

↓

Escrow

↓

Check-in

↓

Release

That is almost exactly the Vallo requirement.

And the important part is that Interswitch is a CBN-licensed payment infrastructure company, appearing on the CBN’s list of licensed switching/processing companies.  

So this is probably the most relevant Nigerian precedent I found.

There is a caveat: some older Quickteller Homes documentation says the escrow feature was temporarily unavailable at that point, while later support documentation describes the escrow flow for short lets. So Vallo should not assume this exact product is currently commercially available to third-party marketplaces without getting current confirmation from Interswitch.  

⸻

7. Flutterwave

Flutterwave has historically documented an actual Escrow Payments product.

Its documentation says that marketplace transactions can be put into escrow and later released through an API call to the settlement endpoint.  

The flow is basically:

Customer pays
      ↓
Flutterwave
      ↓
Escrow state
      ↓
Vallo tells Flutterwave "release"
      ↓
Seller/landlord settlement

That’s much closer to what you need than ordinary split payments.

Flutterwave also supports marketplace split payments, where incoming funds are divided between the platform and vendor subaccounts.  

However, there’s an important distinction:

Split payment ≠ escrow

A split payment might mean:

₦100,000 customer payment

        ↓

₦90,000 landlord
₦10,000 Vallo

immediately/according to settlement.

Escrow means:

₦100,000 customer payment

        ↓

LICENSED ESCROW / PAYMENT PROVIDER
        ↓
hold
        ↓
condition satisfied
        ↓
₦90,000 landlord
₦10,000 Vallo

For Vallo, you want the second architecture if you want to advertise genuine “funds protected until check-in/inspection.”

⸻

8. Paystack

Paystack supports marketplace transaction splitting.

Its current documentation explicitly describes the feature as useful for marketplaces and allows payment proceeds to be divided between the platform and subaccounts.  

But there is a very important warning for your project:

Paystack’s current prohibited-business documentation explicitly lists:

“Escrow services - holding funds on behalf of a buyer and seller until the conditions of a sale are met.”  

That means I would not architect Vallo’s proposed escrow around ordinary Paystack split payments.

Paystack can be useful for:

customer → Paystack → landlord + Vallo split

but don’t assume it gives you:

customer → Paystack escrow → Vallo authorises release

unless Paystack gives Vallo a specific contractual product that permits that structure.

⸻

9. Another Nigerian example: SafeHousings / Proppadi / newer platforms

There are Nigerian platforms currently advertising escrow-protected property transactions.

For example, SafeHousings advertises rent, buying, shortlets and hotels with payments held in escrow until the customer is satisfied.  

Proppadi similarly advertises an escrow-protected payment system for property transactions.  

There are also newer Nigerian rental products explicitly advertising escrow until keys/check-in, such as LANDLORDnU and GidiStay.  

However, their marketing claims do not by themselves tell us who legally holds the money or what licence/contractual arrangement sits underneath it.

That’s a critical distinction.

Don’t use:

“Competitor X says escrow”

as proof that Vallo can legally put money in its own bank account.

You need to identify the actual regulated entity behind the escrow account.

⸻

10. RentSmallSmall

RentSmallSmall is a different model.

It focuses heavily on flexible rent:
	•	monthly
	•	quarterly
	•	biannual

and describes a process of:

browse → schedule viewing → verify → pay → move in.  

Spleet similarly operates a marketplace for verified homes, flexible rent and shortlets, including a Rent Now Pay Later product.  

But I did not find sufficient public evidence showing that either currently operates the precise:

“customer money sits in regulated escrow until inspection/check-in”

architecture.

So I would not use them as the legal precedent for Vallo’s escrow mechanism.

⸻

11. The most important general marketplace example: Upwork

Upwork is exactly the kind of architecture you’re asking about.

Upwork has an entity called Payment Escrow Inc.

Its current legal terms say Payment Escrow establishes and maintains:
	•	Client Escrow Accounts
	•	Freelancer Escrow Accounts

and holds project funds according to the applicable escrow instructions.  

Even more importantly, Upwork’s terms explicitly state:

Upwork and Payment Escrow are not banks.

Instead, Payment Escrow holds escrow funds in a separate escrow trust account at a bank, segregated from Upwork’s operating accounts.  

And Payment Escrow itself holds a California escrow licence.  

That’s the model you should study.

Not:

Customer
   ↓
Vallo bank account
   ↓
Vallo database says "held"
   ↓
Vallo sends money to landlord

But:

Customer
   ↓
Licensed payment / escrow entity
   ↓
Segregated escrow/trust structure
   ↓
Vallo determines contractual condition
   ↓
Licensed entity releases funds

Vallo is the marketplace and transaction-orchestration layer.

The regulated company is the money layer.

⸻

12. Etsy

Etsy provides another interesting variation.

Etsy Payments allows sellers to have transaction funds reflected in a payment account and subsequently deposited into their bank account. Etsy also has reserves, holds and delays that can be imposed through its payment partners.  

Etsy can therefore have:

sale → payment account → reserve/hold → eventual seller availability

and it can instruct payment partners to maintain reserves.  

But Etsy’s model isn’t a direct analogue to property escrow because its release conditions are mainly payment/risk/order-fulfilment mechanisms rather than:

“Tenant confirms the apartment is as described.”

Still, it demonstrates an important principle:

A marketplace can have a user-facing balance/hold without necessarily being the institution providing the underlying regulated payment account.

⸻

13. The actual Nigerian regulatory picture

This is the part I would take very seriously before launch.

The CBN regulates Nigeria’s payment system and licenses payment service providers. Its current published list includes categories such as:
	•	switching/processing companies
	•	PSSPs
	•	mobile money operators
	•	payment service banks
	•	other payment service providers.  

Among the licensed switching/processing companies are:
	•	Flutterwave
	•	Paystack
	•	Interswitch
	•	Remita
	•	TeamApt
	•	Network International
	•	others.  

This is why your instinct is correct:

You don’t want VALLO SPACES LTD accidentally becoming the financial intermediary simply because the product architecture has a “Vallo Wallet” or “Vallo Escrow Balance.”

⸻

14. The crucial distinction: payment processing vs escrow

Think of these as three completely different architectures.

Architecture A - ordinary payment

Guest
 ↓
Licensed PSP
 ↓
Landlord

Vallo earns a commission.

This is relatively straightforward.

⸻

Architecture B - split payment

Guest
 ↓
Licensed PSP
 ↓
 ┌──────────────┐
 │              │
Landlord       Vallo

The PSP automatically divides the transaction.

Paystack and Flutterwave document versions of this.  

This is excellent for:

“Landlord gets 95%, Vallo gets 5%.”

But it doesn’t inherently solve:

“Landlord doesn’t get paid until check-in.”

⸻

Architecture C - regulated escrow

                    ┌───────────────┐
                    │ Vallo         │
                    │ marketplace   │
                    └───────┬───────┘
                            │
                       release command
                            │
Guest ── payment ──> LICENSED ESCROW
                         │
                         │
                     funds held
                         │
                    check-in / condition
                         │
                         ↓
                     Landlord

This is the architecture you’re actually looking for.

⸻

15. So can Vallo legally offer “your money is protected”?

Yes.

But I would phrase the answer more precisely:

Vallo can potentially offer that customer experience without obtaining its own payment licence if the actual receipt, safeguarding/holding, and movement of customer funds are performed by an appropriately licensed/authorised third-party financial institution under a structure that permits the specific escrow/marketplace use case.

That last part is important.

It’s not enough that the provider is “a payment company.”

The provider needs to be able to legally perform that particular function.

⸻

16. The mechanism I’d investigate first

For Vallo, I’d approach the Nigerian licensed payment providers with this exact requirement:

“Marketplace escrow / conditional settlement”

You want an API that provides something conceptually like:

CREATE_TRANSACTION

amount: ₦500,000
buyer: guest_123
seller: landlord_456
platform_fee: ₦25,000
currency: NGN
condition: CHECK_IN_CONFIRMATION

The provider creates:

Transaction:
VLO_12345

Status:
ESCROWED

Then Vallo receives:

payment.success

but does not receive the ₦500,000 into Vallo’s bank account.

Instead, the regulated provider holds it.

Your database stores:

booking.status = PAID_AND_PROTECTED

Then:

Check-in succeeds

Vallo calls:

RELEASE_ESCROW
transaction = VLO_12345

The regulated provider does:

₦475,000 → landlord
₦25,000 → Vallo

or whatever commercial split you’ve agreed.

⸻

17. What happens if the guest says “the property isn’t as described”?

Vallo shouldn’t physically move the money.

Instead:

Guest
 ↓
Dispute opened
 ↓
Vallo freezes transaction state
 ↓
Licensed provider continues holding funds
 ↓
Vallo investigates
 ↓
Decision according to contractual rules
 ↓
RELEASE or REFUND instruction

If refund:

Escrow
 ↓
Guest

If legitimate landlord payout:

Escrow
 ↓
Landlord

The key is:

The money never needs to enter Vallo’s operating account.

⸻

18. There is an important catch

Your UI should not imply that Vallo itself is an escrow institution if the legal entity actually holding the money is someone else.

For example, instead of:

“Vallo holds your money safely.”

I’d prefer something legally precise such as:

“Your payment is protected through our regulated payment partner and released according to Vallo’s booking protection terms.”

Then your legal documents can identify the actual provider.

This is similar to how major platforms separate their marketplace terms from payment terms.

⸻

19. Why I would NOT use Paystack simply because it has split payments

This is important enough to repeat.

Paystack supports marketplace splitting.  

But Paystack explicitly lists escrow services as a prohibited business.  

So:

Good

Guest ₦100k
↓
Paystack
↓
₦95k landlord
₦5k Vallo

Don’t assume

Guest ₦100k
↓
Paystack
↓
"hold for 7 days"
↓
Vallo decides when landlord gets paid

That requires a different contractual/product arrangement.

⸻

20. Flutterwave is more interesting for your use case

Flutterwave’s published developer documentation actually describes escrow functionality, including placing funds into escrow and settling them through an API.  

So I would put Flutterwave on the shortlist for a direct conversation with their enterprise/compliance team, but I would specifically ask:

“Is the escrow functionality currently available to Nigerian marketplace businesses, and under what legal entity, licence, contractual structure and settlement model?”

Don’t rely on an old API document alone.

⸻

21. Interswitch deserves serious investigation too

Because of the Quickteller Homes precedent.

Its support documentation explicitly describes:

payment → escrow → escrow code/check-in → host payout.  

And Interswitch is on the CBN’s licensed payment-provider list.  

For a Nigerian property marketplace, that’s a particularly relevant conversation.

⸻

22. Another possibility: licensed escrow/trust structure

There is a second route.

Instead of asking a PSP to provide a turnkey escrow API, Vallo could work with:

bank + licensed/qualified escrow/trust arrangement + payment processor

For example:

Guest
 ↓
PSP
 ↓
designated escrow/trust account
 ↓
contractual condition
 ↓
release instruction
 ↓
Landlord

This is closer to the Upwork model.

The critical point is that Vallo should not simply open a normal corporate current account and call it “Vallo Escrow.”

The account, beneficial ownership, instructions, segregation and legal relationship would need to be structured appropriately by Nigerian counsel and the bank/regulated provider.

⸻

23. What about simply paying the landlord immediately and offering a guarantee?

This is the third model you mentioned.

It looks like:

Guest pays
 ↓
Landlord immediately gets paid
 ↓
Vallo offers "Property Protection"
 ↓
If property is materially misrepresented
 ↓
Vallo/insurer refunds guest

This is much easier from a money-flow perspective because you’re no longer holding the customer’s money.

But there’s a major commercial difference.

You are no longer genuinely saying:

“Your money is held until you’re satisfied.”

You’re saying:

“Your payment has been made, but you have a contractual refund/protection right.”

That can be a perfectly legitimate product, potentially involving insurance, a guarantee or Vallo’s own refund policy, but it is not escrow.

⸻

24. The crypto question is important

Crypto does not automatically make the custody problem disappear.

In fact, it can introduce another regulatory layer.

Suppose:

Guest
 ↓
USDT
 ↓
Vallo wallet
 ↓
convert to NGN
 ↓
Vallo bank account

Vallo has potentially introduced:
	•	digital asset custody
	•	digital asset transfer
	•	conversion
	•	fiat settlement

into the architecture.

That can be more complicated than ordinary card/bank payments.

Nigeria’s SEC framework covers VASPs and specifically includes activities involving reception, transmission, execution, custody and other virtual/digital-asset services.  

The SEC is actively operating an ARIP pathway for VASPs, and its current participant list includes entities such as Busha and Quidax.  

So I would not build a Vallo crypto wallet/custody layer yourself simply to accept USDT.

⸻

25. But crypto can be outsourced in almost exactly the same way

There are already crypto payment infrastructures designed around:

crypto → local currency settlement.

For example, Yellow Card currently offers APIs allowing businesses to accept stablecoins and convert them into local fiat, including NGN. Its infrastructure supports stablecoin payments, local currency settlement and KYC/compliance functions.  

Its documentation describes:

Customer pays USDT/USDC
        ↓
Yellow Card infrastructure
        ↓
conversion
        ↓
NGN
        ↓
local payout

and supports Nigeria among its African corridors.  

BitPay is another example internationally: customer pays crypto, BitPay converts it and settles local fiat to the merchant’s bank account.  

So Vallo could theoretically have:

Guest
 ↓
USDT / USDC
 ↓
licensed/regulated crypto payment infrastructure
 ↓
NGN
 ↓
regulated payment settlement
 ↓
Landlord

without Vallo ever holding crypto.

⸻

26. But there’s an even better crypto architecture for Vallo

If you want crypto and protected payments, don’t do:

Guest
 ↓
Vallo crypto wallet
 ↓
Vallo holds USDT
 ↓
Vallo decides when landlord gets paid

Instead:

Guest
 ↓
Crypto payment provider
 ↓
regulated/contractual holding layer
 ↓
condition satisfied
 ↓
crypto converted to NGN
 ↓
Landlord's bank account

Or:

Guest
 ↓
Crypto provider
 ↓
USDT → NGN immediately
 ↓
regulated escrow/payment provider
 ↓
check-in
 ↓
landlord

The second model is probably easier operationally because your actual marketplace ledger remains denominated in NGN, rather than having Vallo maintain crypto balances.

⸻

27. What I’d build for Vallo

If this were my architecture decision, I would separate Vallo into four layers.

Layer 1: Vallo marketplace

Vallo owns:

Users
Properties
Listings
Bookings
Viewing
Inspection
Check-in
Disputes
Ratings
Contracts
Notifications
Commission calculation

No customer money.

⸻

Layer 2: licensed payment infrastructure

Something like:

Flutterwave / Interswitch / another CBN-authorised provider

handles:

Card
Bank transfer
USSD
Payment confirmation
Refund
Settlement
KYC/payment compliance


⸻

Layer 3: conditional funds / escrow

For transactions where Vallo promises:

“Funds are protected until check-in”

use a provider that contractually supports actual escrow/conditional settlement.

The money remains with that provider/escrow structure.

Not Vallo.

⸻

Layer 4: Vallo’s transaction ledger

Your database can still show:

₦2,000,000

PAID
PROTECTED
AWAITING CHECK-IN

But that’s an accounting/status record, not a Vallo wallet containing ₦2,000,000.

That’s an extremely important architectural distinction.

⸻

28. The architecture I’d recommend

For Vallo’s short-stay/rental side:

                  VALLO
        Marketplace / Booking Layer
                    │
                    │
             Payment Intent
                    │
                    ▼
       ┌─────────────────────────┐
       │ Licensed PSP / Escrow   │
       │ Provider                │
       └────────────┬────────────┘
                    │
             CUSTOMER PAYS
                    │
                    ▼
             FUNDS PROTECTED
                    │
             ┌──────┴──────┐
             │             │
          CHECK-IN       DISPUTE
             │             │
             ▼             ▼
          RELEASE       REFUND/
             │          HOLD
             ▼
          LANDLORD

Vallo’s backend decides:

booking.status

The financial provider decides:

where the actual money is


⸻

29. Your product UX could still be excellent

You could show:

Before payment

Payment Protection

Your payment is protected until check-in. The property owner receives their funds after successful check-in according to Vallo’s protection terms.

Then:

After payment

₦850,000 Protected

✓ Payment received

✓ Property confirmed

✓ Funds protected

○ Awaiting check-in

Then after check-in:

✓ Check-in confirmed

✓ Host payout initiated

This gives you essentially the Airbnb/Quickteller Homes/Upwork experience without making VALLO SPACES LTD itself the escrow wallet.

⸻

30. For long-term rentals

I’d actually separate the architecture from short stays.

For example:

Viewing

Free / small viewing fee

↓

Application

Identity/KYC/income verification

↓

Approval

↓

Lease signed

↓

Rent/deposit payment

↓

Licensed payment provider

↓

Contractual settlement

For ordinary rent collection, you don’t necessarily need escrow at all.

The landlord can receive rent according to the lease.

For security deposits, however, you need to be particularly careful because deposit handling can have its own legal implications depending on the structure and jurisdiction.

⸻

31. For property purchases

I’d be even more conservative.

Don’t put:

₦100m property purchase
        ↓
Vallo corporate account

at any stage.

Use a lawyer/bank/regulated escrow arrangement for the purchase transaction.

Vallo can coordinate:
	•	buyer
	•	seller
	•	verification
	•	title documentation
	•	inspection
	•	transaction milestones
	•	payment instructions

while the actual purchase funds sit with the appropriate regulated/legal escrow structure.

That is much closer to how a professional property transaction should be structured.

⸻

32. One thing I would NOT do

I would not create:

“Vallo Wallet”

where users see:

Available balance
Protected balance
Pending balance

and where those balances correspond to actual customer funds held in Vallo’s bank account.

That is exactly the architecture I’d avoid if your goal is to stay outside direct payment/custody licensing.

You can have a transaction ledger without having a customer wallet.

⸻

33. The providers I’d investigate first

For Vallo Nigeria, I’d have your legal/compliance team contact these parties and ask specifically about conditional marketplace settlement/escrow, rather than generic payment processing:

1. Interswitch

Because of the documented Quickteller Homes escrow/check-in flow.  

2. Flutterwave

Because its documentation explicitly describes marketplace escrow and API-controlled release.  

3. Other CBN-authorised payment providers

The CBN’s current list provides the universe of licensed providers.  

4. A Nigerian bank + properly structured escrow arrangement

Especially for high-value property purchases.

5. Crypto provider separately

For USDT/USDC, investigate an infrastructure provider such as Yellow Card rather than Vallo operating its own crypto wallet/custody layer.  

⸻

34. What I would ask the provider before signing anything

Send them something very close to this:

VALLO SPACES LTD operates a Nigerian property marketplace connecting property owners with tenants and guests. We require a conditional marketplace payment flow where a customer pays for a property/stay, funds are held by the regulated payment/escrow provider, and funds are released to the property owner only after a defined contractual event such as check-in or customer confirmation. Vallo itself must not receive, custody or control the customer funds.

Please confirm whether you support:
	1.	Marketplace escrow/conditional settlement
	2.	NGN transactions
	3.	API controlled release
	4.	Partial/full refunds while funds remain protected
	5.	Dispute freezes
	6.	Split settlement between property owner and Vallo
	7.	KYC/KYB for property owners
	8.	Chargeback handling
	9.	Segregation/safeguarding of customer funds
	10.	The exact Nigerian licence/regulatory basis under which the funds are held
	11.	Whether VALLO SPACES LTD itself ever becomes the recipient/holder of customer funds
	12.	Whether your legal terms permit a property marketplace to advertise the flow as “escrow” or “payment protection.”

Question 10 is particularly important.

Don’t just ask:

“Are you CBN licensed?”

Ask:

“Under which licence and legal entity is the customer’s money held during the conditional period?”

That’s the real question.

⸻

35. My recommendation for Vallo

Given everything above, I would not launch Vallo with your current design of:

Guest pays → Vallo’s own bank account → Vallo holds money → Vallo releases landlord.

Instead, I’d use this architecture:

Vallo = marketplace + transaction orchestration

Licensed PSP/escrow provider = money movement + custody/conditional holding

Bank/regulated escrow arrangement = high-value property transactions

Crypto provider = crypto acceptance/conversion, if you add it

The core flow:

                 Vallo
                   │
              Booking created
                   │
                   ▼
          Licensed payment provider
                   │
              Customer pays
                   │
                   ▼
       ┌─────────────────────────┐
       │ REGULATED HOLD / ESCROW │
       └────────────┬────────────┘
                    │
             Check-in occurs
                    │
                    ▼
             Vallo confirms
                    │
                    ▼
       Provider releases funds
             ↙             ↘
        LANDLORD          VALLO
         payout          commission

That is the architecture I would pursue.

And there is genuine precedent for it: Airbnb’s regulated payment entities use a guest-payment/host-payout model with payout around check-in; Upwork uses a dedicated licensed escrow entity; Quickteller Homes has documented a Nigerian escrow/check-in flow; and Flutterwave has documented API-based marketplace escrow.  

The key is that Vallo should not try to become the escrow institution by putting the money in its own account.

One final point: this is a product/regulatory architecture, not a substitute for a Nigerian fintech lawyer’s written opinion. Before you launch the protected-payment feature, I would have Nigerian counsel review the exact money flow, contracts, provider agreement, customer terms and advertising language. The fact that a PSP is licensed does not by itself guarantee that a particular escrow arrangement is covered by that licence.

For crypto, I would keep it completely outside Vallo’s own custody: USDT/USDC → regulated crypto/payment infrastructure → NGN conversion → regulated settlement, rather than ever having Vallo control the customer’s crypto. Nigeria’s SEC currently regulates VASP activity, including reception, transmission and custody-related activities, so adding crypto can create a second regulatory perimeter rather than solving the first one.  

Bottom line: the professional Vallo architecture is not “don’t hold money because holding is illegal.” It is “design the system so Vallo never needs to be the entity holding the money in the first place.” The regulated provider/escrow entity should hold it, and Vallo should control the transaction state and release instruction, subject to the provider’s legal framework.

Chat gpt own::
