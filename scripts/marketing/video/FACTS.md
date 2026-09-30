# Facts file: the launch films

The only source for any number, name or claim that appears on screen in the mobile and desktop launch films. If it is not here, it does not go on screen. Everything here is either said in the voiceover, visible on a live screen captured on 30 September 2026, or a product rule from `scripts/marketing/DESIGN.md`.

## The voiceover (ElevenLabs, 87.6 s, as spoken; word timings in the audio kit's timings.json)

1. Finding a place in Nigeria shouldn't feel like a gamble.
2. Meet Vallo.
3. Homes, hotels, shortlets and restaurants… all in one app, with one account.
4. Looking for a home to rent or buy?
5. Search across Nigeria, filter by exactly what you need, and see the full move-in cost before you ever make a call.
6. Rent, fees, caution deposit… all added up, right there.
7. Talk straight to the owner, the landlord or the agent, right inside the app.
8. Share listings in the chat, plan an inspection, and keep every conversation in one place.
9. Planning a trip?
10. Browse hotels, shortlets and resorts… pick your dates… and book a room in a few taps.
11. Going out tonight?
12. Find a restaurant you love and reserve your table in seconds.
13. Owners, hosts, hotels and restaurants with the verified mark have been checked by a real person at Vallo… so you know who you're dealing with.
14. And when it's time to pay… Vallo never holds your money.
15. Your payment goes straight to the owner, the host or the business, through a licensed payment processor.
16. Got a question?
17. Ask the AI assistant about prices, areas or how renting works… any time of day.
18. And Vallo speaks your language: English, Hausa, Yorùbá and Igbo.
19. Have a property, a hotel or a restaurant?
20. Put it on Vallo and welcome guests from across the country.
21. Vallo.
22. Real estate, done right.

"Coming soon on iPhone and Android" was in the script but is not spoken.

## Names

- Vallo. vallospaces.com. The company is VALLO SPACES LTD.
- Languages: English, Hausa, Yorùbá, Igbo.
- The licensed payment processor: Paystack.
- Roles: owner, landlord, agent, host, hotel, restaurant.

## Numbers and places (all from live screens, all example stock labelled "Example" in the product)

| Screen | Facts |
|---|---|
| Four bedroom villa in Maitama, Abuja (listing) | Rent ₦18,000,000 a year · Agency fee ₦1,800,000 (10.0% of a year's rent) · Legal fee ₦1,800,000 (10.0%) · Agreement fee ₦900,000 (5.0%) · Caution deposit (refundable) ₦3,600,000 · Service charge not declared · Total to move in ₦26,100,000 · 4 beds, 4 baths |
| Search, rent | "40 properties found" |
| Filters | "Apply (52)" |
| Lagoon Crest Resort, Lekki, Lagos (stay) | ₦150,000 per night · sleeps 4 · 2 room types · 5 star |
| Harbour Lights Kitchen, Victoria Island, Lagos (restaurant) | seafood · smart casual · seats 80 · opens at 18:00 |
| Three bedroom terrace for sale in Karsana, Abuja | ₦95,000,000 asking price |
| Five bedroom villa on Banana Island, Lagos | ₦25,000,000 a year · 5 beds, 5 baths |
| Stays search | check in 16 Oct 2026, check out 19 Oct 2026 (3 nights), 2 guests |
| Nigerian cities for the map (places guests may come from; no counts) | Lagos, Abuja, Kano, Ibadan, Port Harcourt, Enugu, Benin City, Calabar, Kaduna, Jos |
| Desktop cost table (`d-listing-cost`) | the five lines above, plus "Fees to the agent: ₦4,500,000, 25.0% of a year's rent" (the three fees added up) |
| Filters | "Apply (52)" with every type (`filters`); "Apply (3)" with Villas selected (`filters-villas`, captured 30 Sep 2026) |
| Search results and "Looked at recently" (`search`, `search-full`, `search-villas`, `home-recent`, `d-search*`) | the example listings exactly as the live search shows them, each with its own price and its Example label (for instance the Maitama villa ₦26.1m to move in, rent ₦18m a year; the Banana Island villa ₦36.2m to move in, rent ₦25m a year; the Karsana terrace ₦95m). Any price shown comes from these captures, unedited. |
| Welcome, slide 1, in four languages | English "Two worlds. One platform."; Hausa "Duniya biyu. Dandali ɗaya."; Yorùbá "Ayé méjì. Pèpéle kan."; Igbo "Ụwa abụọ. Otu ikpo okwu." (`welcome-1`, `welcome-ha`, `welcome-yo`, `welcome-ig` and the `d-` twins) |
| Add a workspace (`host-start`) | "We are a hotel", "I run a shortlet", "We are a restaurant", "I own the property: List it yourself. No agency fee.", "I am an agent" |
| The thread (`thread`) | the member's own message "I like these two as well. Could we view all three on Saturday morning?", with Vallo Examples about "Mini flat in Yaba" |

## The assistant's answer (captured 30 September 2026, shown unedited)

Question: "What is a caution deposit?"

- Mobile (`assistant-caution`): "A caution deposit is a refundable sum a landlord or agent asks for when you move in, to cover any damage to the property beyond normal wear and tear during your tenancy. It sits on top of the rent itself, along with things like agency fee, legal fee, agreement fee and service charge, so it's part of your real move in cost, not the rent alone. If you're looking at a specific listing, tell me which one and I'll check whether it states a total move in cost or just the rent."
- Desktop (`d-assistant-caution`): "A caution deposit is a refundable sum a landlord asks for upfront, on top of the rent, to cover any damage or unpaid bills at the end of the tenancy. It's separate from agency, legal and agreement fees, which are also common extras in Nigeria. So when you see a rent figure, the actual move in cost can be higher once you add these. Where a listing states a total move in cost, I'll always quote that alongside the rent; where it doesn't, I'll flag that extra costs exist but aren't stated, so you can ask the lister directly before committing. Want me to search for a place and check what it says about move in costs?"
- Mobile, second capture with the field unfocused (`assistant-caution-2`, preferred): "A caution deposit is a refundable sum a landlord or agent asks for upfront when you move in, held against any damage to the property during your tenancy. It sits alongside the rent itself and is one of the extra costs (with agency fee, legal fee, agreement fee and service charge) that Nigerian rentals usually carry on top of the headline rent figure. Where a listing states its total move in cost, I'll quote that so you can plan properly. Where it doesn't, I'll flag that these extras exist even though the amount isn't stated. Want me to search for rentals somewhere specific?"
- Desktop, second capture (`d-assistant-caution-2`, preferred): "A caution deposit is a refundable sum a landlord asks for upfront, on top of the annual rent, to cover any damage or unpaid bills when you eventually move out. It is separate from agency, legal and agreement fees, and is one of the extra costs that make the total move in cost higher than the rent shown on a listing. If you are budgeting for a place, tell me and I can check whether it states a total move in cost, or just the rent."
- The suggestion chips under the input ("Two bedroom in Lekki under 5m a year", "What will it cost me to move in?") are the product's own and may show.

## The three questions and their answers (the films' spine)

| Card | Answer on its back | Answered in |
|---|---|---|
| What will it really cost? | ₦26,100,000 to move in. Seen before a single call. | row 13 |
| Who am I talking to? | Checked by a real person at Vallo. | row 27 |
| Where does my money go? | Straight to the owner, through Paystack. | row 31 |

## Claims allowed on screen

- Homes, hotels, shortlets and restaurants in one app, with one account.
- See the full move-in cost before you call: rent, fees and caution deposit added up.
- Talk straight to the owner, the landlord or the agent inside the app. Share listings in the chat. Plan an inspection.
- Book a room in a few taps. Reserve a table.
- Owners, hosts, hotels and restaurants with the verified mark have been checked by a real person at Vallo. (Never "verified listing".)
- Vallo never holds your money. Your payment goes straight to the owner, the host or the business, through a licensed payment processor.
- Ask the AI assistant about prices, areas or how renting works, any time of day.
- English, Hausa, Yorùbá and Igbo.
- Real estate, done right.
- Vallo charges no inspection fee (confirmed by the founder, 30 September 2026; also on the live landing page).

## Illustrative pop-ups (always with a small "Example" chip, as the product labels its example stock)

"Inspection set · Saturday, 11:00 AM" · "Room booked · Lagoon Crest Resort · 3 nights" · "Table for 2 · Tonight, 8:00 PM" · "Checked by a person" · "Payment settled · straight to the owner's bank" (stills only) · "New message" (stills only; never "the owner replied" over a thread with an agent)

The illustrative calendar in the films shows October 2026 with 16 to 19 selected (3 nights) and, for the inspection, Saturday 11:00 AM.

## The ending (silent, no voice)

- "Available on the App Store and Google Play" with the official badges exactly as Apple and Google supply them. Apple's "Download on the App Store" badge from developer.apple.com; Google's current "Get it on Google Play" badge from play.google.com. **Publish this version only once Vallo is live on both stores**: both companies allow their badges only for apps available in their store.
- Apple's marketing guidelines (read 30 September 2026): don't modify, angle or animate the badge; one App Store badge per video; the black badge when other stores' badges appear; the App Store badge first; the badge subordinate to the main message. So the badges appear by a cut, both black, the same height, App Store first, and never move, scale, tilt or fade.
- A "Coming soon on iPhone and Android" version of the same ending, for posting before launch, with no badges.
- vallospaces.com (the web app is live today).

## Never on screen

Ratings, reviews, testimonials, user or listing counts other than the ones above, savings, prices not above or not in the captures named above, "Is it still available?" (the example stock is not available), "safe", "secure", "protected", "guaranteed", "verified listing", valuation words, a real person's name or face, email addresses, phone numbers.
