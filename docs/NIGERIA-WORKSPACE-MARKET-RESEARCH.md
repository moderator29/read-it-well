# Nigeria workspace market research

13 October 2026. Short on purpose: it serves the build plan in [proposal/VALLO-UPGRADE-PROPOSAL.md](proposal/VALLO-UPGRADE-PROPOSAL.md). Each fact names its source. Where sources disagree, both are given. Nothing below is a statistic of ours. Existing deeper notes live in `docs/research/` and `docs/PRODUCT.md`; this file does not repeat them.

How to read it: **Fact** = stated by the cited source (the source may be a vendor or the press, which is said). **Hypothesis** = my inference for Vallo, to be tested.

## 1. Landlords and tenants

Facts
- Lagos Tenancy Law 2011 bars a landlord from taking more than one year's rent in advance from a new tenant (section 4). Sources disagree on the cap for sitting tenants (six months versus one year), so check the gazetted text before quoting it. [The Nigeria Lawyer](https://thenigerialawyer.com/revisiting-lagos-state-tenancy-law-five-years-after/), [BusinessDay](https://businessday.ng/?p=103387), [OAL review of the 2025 draft bill](https://oal.law/?p=1006020).
- A Lagos Tenancy and Recovery of Premises Bill (2025) was reported in the press with stricter advance-rent limits and higher penalties; whether it has passed is not confirmed by any source found. [AllAfrica, November 2025](https://allafrica.com/stories/202511030381.html), [OAL](https://oal.law/?p=1006020).
- Spleet offered monthly, quarterly and six-month rent plans and a rent financing product; it reported landlord onboarding lagging tenant demand. [TechCabal](https://techcabal.com/2021/01/19/nigerian-property-tech-market/), [Techloy](https://www.techloy.com/nigerian-proptech-spleet-closes-2-6-million-seed-round/).
- SmallSmall's CEO cited a survey of almost 3,000 people in Lagos in which most wanted to pay rent monthly (company-reported survey). [The Condia](https://thecondia.com/smallsmall-proptech-3-million-seed/).

Hypotheses
- Most of a landlord's real tenancies started outside Vallo. Without a way to record them (LANDLORD-01), the landlord workspace stays empty for the people who own the most units.
- Recorded rent must never look like a Vallo payment, or it undermines receipts and the "Vallo never holds money" rule. Hence the separate table and the "recorded by you" label.

## 2. Agents and realtors

Facts
- Lagos officials state that real estate practice without LASRERA registration is not permitted, and enforcement drives are ongoing. [Guardian](https://guardian.ng/news/lagos-to-capture-database-of-real-estate-practitioners/), [VON](https://von.gov.ng/?p=135395), [Ripples Nigeria](https://www.ripplesnigeria.com/lagos-govt-goes-after-unregistered-real-estate-agents/).
- Reported agency fee figures conflict: officials cited a range up to 10 percent; a 2025 bill was reported with a 5 percent cap. [Ripples Nigeria](https://www.ripplesnigeria.com/lagos-govt-goes-after-unregistered-real-estate-agents/), [Leadership](https://leadership.ng/lagos-caps-commission-at-5-in-new-tenancy-bill-to-rein-in-estate-agents/).
- Guides warn that fake "inspection fees" and photos of other people's properties are common rental scams. These are consumer guides, not police statements. [Uni2Study](https://www.uni2study.com/articles/avoid-rent-scams-fake-agents-nigerian-student), [Nigeria Housing Market](https://www.nigeriahousingmarket.com/guides/top-5-real-estate-scams-in-nigeria).
- PropertyPro.ng is described as charging agents a subscription to list and offering listing and lead tools (secondary profile). Nigeria Property Centre has served owners and agents since 2011 with listings and price trend data. [Dealroom](https://app.dealroom.co/companies/tolet), [Nigeria Housing Market](https://www.nigeriahousingmarket.com/proptech/nigeria-property-centre).

Hypotheses
- Vallo's "free to list, viewings never take money" rule is a direct answer to the inspection-fee scam; it should be said on the visit screens (see screenshot notes in the proposal).
- Agents already run leads in WhatsApp. The win is not a full CRM but one date and one reminder per lead (AGENT-01), in the thread they already use.

## 3. Hotels

Facts
- Cloudbeds' help centre documents a housekeeping list of room statuses with assignment and bulk actions, and an arrivals report; its mobile app lists arrivals, departures and in-house stays for today and tomorrow. [Cloudbeds housekeeping](https://myfrontdesk.cloudbeds.com/hc//articles/25695101078427), [Cloudbeds arrivals report](https://myfrontdesk.cloudbeds.com/hc/en-us/articles/25906062205979), [App Store](https://apps.apple.com/us/app/id1671866717).
- Hotels.ng is a Nigerian online travel agency that charges hotels a commission per booking; sources disagree on how many hotels it lists. No source showed it selling hotel back-office software. [Dealroom](https://app.dealroom.co/companies/hotels_ng), [PhocusWire](https://www.phocuswire.com/Founders-story-how-to-capture-an-emerging-market-with-an-online-travel-agency).

Hypotheses
- Small Nigerian hotels run the front desk on paper or WhatsApp. A phone-first Today screen with arrivals, in house and departures (HOTEL-01) is the smallest useful step toward a PMS, and it uses inventory Vallo already holds safely.

## 4. Short-lets

Facts
- Airbnb lets hosts set preparation time between reservations in the calendar's availability settings, and suggests hosts ask how long cleaning takes. [Airbnb, manage your calendar](https://www.airbnb.com/resources/hosting-homes/a/manage-your-calendar-654), [Airbnb, availability settings](https://www.airbnb.com/resources/hosting-homes/a/navigating-every-step-of-the-booking-process-322).
- Channel managers treat preparation time differently (Guesty notes it does not sync to direct booking sites). [Guesty help](https://help.guestyforhosts.com/hc/en-gb/articles/9350425467421), [Lodgify help](https://help.lodgify.com/hc/en-us/articles/360017308859).
- A vendor blog says Lagos HORC consumption tax (5 percent) and VAT apply to short-lets, and that property managers acting for owners must register with LASRERA. Not confirmed from a government source. [Ownkey](https://ownkey.com/ng/blog/how-to-manage-short-let-airbnb-nigeria).

Hypotheses
- Preparation nights (SHORTLET-01) must be enforced in the database like the existing overlap rule, or iCal imports and instant booking will defeat it.

## 5. Restaurants

Facts
- OpenTable sends reservation reminders by email, text and in-app; on its Core plan the reminder lets the diner confirm. It also offers card-required holds and cancellation policies. [OpenTable Ireland](https://www.opentable.ie/restaurant-solutions/?p=71238).
- OpenTable has published lower no-show rates for online than phone bookings in older data (about 4.4 to 4.6 percent, UK 2018 and US figures). These are dated and from other markets. [OpenTable UK press](https://press.opentable.co.uk/opentable-turns-the-tables-on-no-shows/), [Restaurant Hospitality](https://restaurant-hospitality.com/marketing/opentable-seeks-reduce-no-shows).
- OpenTable announced a tool that lets restaurants flag a likely no-show from past reservation activity, and a policy that deactivates accounts after repeated no-shows. [Restaurant Dive 2020](https://www.restaurantdive.com/news/opentable-launches-initiative-to-combat-diner-no-shows/602034/), [Restaurant Dive UK](https://restaurantdive.com/news/opentable-to-ban-repeat-no-shows-in-the-uk/548856).
- SevenRooms markets guest profiles with tags and spend history, alerts for check-ins and no-shows, and (per third-party reviews) waitlist and floor-plan table management. [SevenRooms table management](https://sevenrooms.com/platform/table-management/), [G2](https://www.g2.com/products/sevenrooms/).

Hypotheses
- With deposits off (HANDOFF rule), reminders (RESTAURANT-02) and a visible kept or missed count (RESTAURANT-06) are Vallo's two tools against no-shows. Both are free to the diner.
- Walk-ins matter more than bookings for most Nigerian restaurants; a waitlist (RESTAURANT-04) earns daily use of the host app.

## 6. AI assistants that act

Facts
- The OWASP Top 10 for LLM Applications (2025) ranks prompt injection first and lists Excessive Agency; guidance pairs least-privilege tools with human approval for high-impact actions. Sources found are secondary summaries; check the OWASP project page for exact wording. [Confident AI summary](https://www.confident-ai.com/blog/owasp-top-10-2025-for-llm-applications-risks-and-mitigation-techniques), [Breachlock](https://www.breachlock.com/?p=14996).

Hypotheses
- Binding approval to a hash of the exact arguments, and running the same server action the screen uses, is what makes AI-03 safe; prompt wording is not a control.

## 7. Not verified

- Current PropertyPro.ng and Nigeria Property Centre agent pricing and feature lists (no 2025 or 2026 source found).
- Any official short-let registration category in Lagos.
- Current OpenTable or Resy no-show figures for 2026. Resy was not researched in depth this pass.
