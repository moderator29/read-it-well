# Recommendations Inbox

> **ARCHIVED 2026-08-09. This does not govern any current decision.** Where it
> disagrees with the code, the database, `docs/PRODUCT.md`, `RECOMMENDATIONS.md`,
> `ROADMAP.md`, `KNOWN_GAPS.md` or `ARCHITECTURE_DECISIONS.md`, this file is
> wrong. See `docs/archive/README.md` for why it was retired and what survived it.


Status: AWAITING LEAD REVIEW. Nothing in this file is approved scope. Each item
is a candidate for promotion into `RECOMMENDATIONS.md` after review; promoted
items should gain the full problem/why/approach/phase treatment there. Items
deliberately avoid duplicating R-01 to R-20. 250 items, one line each. Items 151 to 250 were added in the 2026-07-29 handoff pass, covering the surfaces built since: the live map, the assistant, the wallet demo, the trust pipeline, the motion system and the daylight theme.

Prepared: 2026-07-28. Source: product strategy pass over MASTER_TODO,
ARCHITECTURE_DECISIONS, KNOWN_GAPS, intake status, the route tree and the
migration set.

---

1. [NIGERIA] Make pay-by-bank-transfer and USSD first-class checkout options beside cards, because most Nigerian consumers pay by transfer and a card-only checkout kills conversion at the last step.
2. [NIGERIA] Add a power supply disclosure field per listing (24/7, generator with stated hours, inverter, solar), because "is there light" is the first question every Nigerian guest asks and no competitor answers it structurally.
3. [NIGERIA] Add a water supply field (treated running water, borehole, pumped storage), because it is the second question guests ask and agents who answer it honestly will win bookings.
4. [NIGERIA] Model estate access data (gate name, security desk phone, access code released after confirmation), because Lagos and Abuja estates physically block guests who arrive without it.
5. [NIGERIA] Build a Detty December seasonal mode with curated collections and an early diaspora booking window opening in September, because December is the single largest demand spike of the year and early capture wins it.
6. [NIGERIA] Offer diaspora checkout in GBP, USD and CAD with naira settlement to agents, because diaspora relatives fund a large share of festive-season stays and currently have no clean way to pay.
7. [NIGERIA] Support a book-for-someone-else flow that separates payer identity from guest identity, because the diaspora sponsor abroad and the relative checking in locally are routinely two different people.
8. [NIGERIA] Add WhatsApp share cards and confirmation deep links, because WhatsApp is Nigeria's default messaging layer and booking details will be forwarded there whether the product supports it or not.
9. [NIGERIA] Send an SMS booking confirmation fallback via Termii, so a guest with no data still holds proof of booking when standing at the estate gate.
10. [NIGERIA] Store structured landmark addressing ("off Admiralty Way, opposite Shoprite") beside the street address, because street numbering is unreliable and landmarks are how directions actually work here.
11. [NIGERIA] Show the nearest bus stop and an estimated drop fare on listing detail, because guests without cars navigate by bus stop names, not by postcodes or pins.
12. [NIGERIA] Add traffic-aware check-in guidance (warn about Third Mainland and Lekki-Ajah peak windows), because a 6pm Friday arrival in Lekki is a materially different trip from a 10am one.
13. [NIGERIA] Launch a campus vertical of semester-priced student shortlets near UNILAG, UI, OAU and ABU, because campus demand is large, recurring, cash-backed by parents, and structurally underserved.
14. [NIGERIA] Maintain a festival demand calendar (Calabar Carnival, Ojude Oba, Kano Durbar, Felabration) that drives curated collections, turning predictable cultural moments into bookable inventory.
15. [NIGERIA] Freeze the quoted naira price at booking time and store the FX rate applied to any foreign payer, because naira volatility otherwise turns the gap between quote and charge into disputes.
16. [NIGERIA] Enable cash wallet top-up through POS agent networks, because agent-banking cash-in reaches users that no banking app or card rail ever will.
17. [NIGERIA] Ship long-weekend getaway collections around Sallah, Easter and Independence Day, because Nigerian public holidays are predictable demand spikes that cost nothing to market against.
18. [NIGERIA] Offer optional NIN-backed guest verification that unlocks Instant Book, because a verified guest identity removes the agent's hesitation about strangers arriving at the gate.
19. [NIGERIA] Add Nigerian Pidgin as an informal tone option for the AI assistant and campaign copy, because Pidgin is the lingua franca the four formal locales do not reach.
20. [NIGERIA] Ship a data-saver toggle that disables the ambient canvas, film grain and any autoplay media, because mobile data is bought in bundles and a respectful product does not burn them on decoration.
21. [UX] Display total price first (nightly plus cleaning plus service fee) with a per-night toggle, because fee surprise at the final step is the single biggest abandonment trigger in this category.
22. [UX] Support flexible date search ("any weekend in August"), because getaway planning starts with a mood and a budget, not a fixed pair of dates.
23. [UX] Add a recently-viewed rail on home and search, because it is the cheapest re-engagement surface and the data is already captured.
24. [UX] Build a compare tray for up to three listings side by side, because decision support beats forcing users to juggle tabs on a phone.
25. [UX] Show a visible countdown hold timer once payment starts, so the database no-double-booking guarantee reads as a fair race rather than a mystery failure. DONE 2026-07-30: shipped as `HoldCountdown.tsx` on `/checkout/[bookingId]`, counting down from the booking's `created_at` plus 48 hours.
26. [UX] Replace confirm dialogs with an undo window on unsave and draft delete, because undo is faster, kinder and less error prone than "are you sure".
27. [UX] Preserve full search state on back navigation, because losing filters after viewing one listing is the classic mobile discovery rage moment.
28. [UX] Give the guest picker child ages, not just counts, because capacity and pricing rules will need ages and the schema already models composition.
29. [UX] Prefill search with smart default dates (the upcoming weekend), because an empty date field is friction and the default is right often enough to pay for itself.
30. [UX] Offer one-tap rebook from any past stay, because repeat bookings are the highest-margin transaction and should be the shortest path in the product.
31. [UX] Generate a WhatsApp-formatted share card (photo, price, rating, deep link) from every listing, because a beautiful forwardable card is distribution the platform does not pay for.
32. [UX] Reveal the exact address and gate details only after confirmation, showing the area until then, because it protects agents from casing and matches the trust pattern guests already expect.
33. [UX] Use a +234 phone input mask with carrier-aware validation, because malformed numbers silently break OTP, SMS confirmations and agent callbacks downstream.
34. [UX] Allow fully anonymous browsing with sign-up prompted only at save or book, because the gate belongs in front of value, not in front of the front door.
35. [UX] Make every empty state offer a next action (broaden filters, show nearby areas, create an alert), because a dead end teaches users the inventory is thin even when it is not.
36. [UX] Synchronise map and list hover so a card highlight lights its pin and vice versa, because the two views must read as one surface, not two products.
37. [UX] Keep the price breakdown expandable at every step of the booking wizard, because a total the user can always interrogate is what makes "you won't be charged yet" believable.
38. [UX] Offer saved-search creation immediately after any filtered search with results, because intent is hottest at that moment and it seeds the alert system with real demand data.
39. [UX] Autosave the consumer booking draft (dates, guests, listing) across sessions, because Nigerian network drops mid-flow are routine and re-entry must cost nothing.
40. [UX] Write every error message as what happened plus what to do next in plain language, because raw codes and generic failures are where trust in a money product dies.
41. [UX] Ship skeleton screens shaped like real cards using the stride ring, because layout-faithful loading states make slow networks feel intentional rather than broken.
42. [UX] Pin a sticky mobile booking bar (price, dates, CTA) on listing detail, because on a phone the decision moment must never require scrolling back up.
43. [DESIGN] Add an automated glyph regression test that renders the naira sign and all four-language diacritics each release, because the supplied mockups themselves show ₦ falling back to a plain N.
44. [DESIGN] Publish a photo art-direction guide for agents (shot list, orientation, lighting, no filters), because inventory only looks premium if its photography does, and agents will follow a checklist.
45. [DESIGN] Build the empty-state illustration set from the existing 3D icon family, because reusing the signature objects keeps even the emptiest screen unmistakably NaijaFinds.
46. [DESIGN] Generate a per-listing OG image (photo, price, rating, brand frame), because every shared link then becomes a designed marketing asset instead of a bare URL.
47. [DESIGN] Deliver seasonal skins (Detty December) purely through layer-2 token overrides, because festive theming must never fork components or leak stray colours past the token system.
48. [DESIGN] Commission a custom dark map style matched to the design tokens, because a default Google map dropped inside the stride system would shatter the material language.
49. [DESIGN] Design a branded, naira-correct booking receipt as PDF and email, because the receipt is the artefact guests keep, forward and show at the gate.
50. [DESIGN] Lock status colour semantics (pending cyan, approved green, rejected red, verified brand blue) into layer-2 tokens, because the states already exist in the schema and icon pack and must never drift per screen.
51. [DESIGN] Choreograph the booking confirmation moment with restrained celebratory motion, because it is the emotional peak of the entire product and currently no motion system covers it.
52. [DESIGN] Extend the five branded auth emails into a full lifecycle set (confirmed, reminder, check-in day, review ask), because transactional email is the brand surface users see most often.
53. [DESIGN] Standardise compact naira display ("₦1.2m") for glanceable UI with exact kobo in breakdowns, all through formatMoney, because two ad hoc formats side by side read as a bug.
54. [DESIGN] Add a print stylesheet for receipts and booking details, because estate security and hotel front desks still ask for paper.
55. [TRUST] Escrow agent payouts until 24 hours after check-in, because paying only on real delivery is the single strongest structural defence against fake listings.
56. [TRUST] Award a verified-photo badge to images captured through the in-app camera with capture metadata, because camera-verified media is hard evidence the property exists as shown.
57. [TRUST] Run perceptual image hashing across all listings to flag stolen or duplicated photos, because recycled photo sets are the signature of the classic shortlet scam.
58. [TRUST] Restrict reviews to completed, paid stays only, because purchase-gated reviews are the only kind that resist farming and keep the distribution graph honest.
59. [TRUST] Use double-blind reviews with simultaneous reveal, because it removes retaliation pressure and yields honest ratings on both sides of the marketplace.
60. [TRUST] Show agent response rate and median response time on the public profile, because responsiveness is the best cheap predictor of a good stay and it pressures agents to improve.
61. [TRUST] Attach a safety card to every listing (nearest hospital, police post, estate security line), because safety information is a differentiator no Nigerian competitor offers structurally.
62. [TRUST] Provide an in-stay support line reachable in two taps during an active booking, because problems at 11pm on arrival night are where platform loyalty is won or lost.
63. [TRUST] Build the report flow with structured categories feeding the existing reports table, because triage at scale needs categorised signal, not free-text soup.
64. [TRUST] Detect off-platform payment steering in messages (account numbers, "pay me direct") and warn both sides, because disintermediation is simultaneously the revenue leak and the scam vector.
65. [TRUST] Run damage deposits through a workflow with timestamped photo evidence on both ends, because deposit disputes without evidence poison both sides against the platform.
66. [TRUST] Render the cancellation policy as a visual timeline (full refund until X, half until Y), because a policy the guest can see is a policy the guest will accept.
67. [TRUST] Add a session and device management screen with remote sign-out, because a wallet-bearing account on a lost phone must be recoverable by the user, not by support tickets.
68. [TRUST] Publish a verification tier ladder for agents (ID, address, bank, in-person) with visible badges, because a scannable trust gradient converts hesitant first-time bookers.
69. [TRUST] Verify listing addresses via a geotagged onboarding visit or utility bill, because properties that do not exist are the core fraud of this category and photos alone cannot disprove it.
70. [TRUST] Publish the trust and safety standards page with a stated response SLA, because the visible promise deters bad actors and gives first bookers a reason to try an unknown brand.
71. [AGENTS] Suggest pricing from comparable nearby listings at wizard step 5, because most new agents guess their price and mispriced supply hurts both sides.
72. [AGENTS] Add an occupancy heat view over the availability calendar, because agents manage by pattern recognition and a heat map shows the gaps a table hides.
73. [AGENTS] Provide saved quick replies in agent messaging, because the same five questions make up most guest chat and answer speed drives conversion.
74. [AGENTS] Auto-expire stale booking requests and immediately suggest alternatives to the guest, because a request dying silently loses the guest to WhatsApp and the booking to nobody.
75. [AGENTS] Let agents choose payout cadence (instant with a small fee, or free weekly), because cash-flow control is the feature small operators value most.
76. [AGENTS] Generate downloadable earnings statements as CSV and PDF, because agents need them for tax filings and loan applications and will stay for the paperwork alone.
77. [AGENTS] Compute a listing quality score with a concrete improvement checklist, because "add two more photos and a power description" converts better than an opaque ranking penalty.
78. [AGENTS] Add a pause mode that hides a listing without deleting it, because forcing delete-and-recreate for a renovation month destroys reviews and history.
79. [AGENTS] Support bulk calendar editing across multiple properties, because multi-listing operators are the highest-value supply and per-night-per-listing editing does not scale.
80. [AGENTS] Run an agent-to-agent referral programme paid into the wallet, because agents recruit better supply from their own networks than any sales team will.
81. [AGENTS] Offer a first-listing concierge (guided photos, description help) in early markets, because the quality of the first hundred listings defines the brand permanently.
82. [AGENTS] Show an area benchmark card (your occupancy and price versus the area median), because competitive context is what actually changes agent behaviour.
83. [AGENTS] Suggest the cover photo from engagement data once views accumulate, because the first image decides the click and agents pick it on sentiment.
84. [AGENTS] Add team roles (co-host, cleaner, finance-only view), because real operators are small businesses and one shared login is both a security hole and a support burden.
85. [AGENTS] Push instant new-booking alerts with a visible accept-SLA timer, because response latency is the marketplace's heartbeat and agents need to feel it.
86. [AGENTS] Launch agent academy micro-courses with completion badges shown on the profile, because education raises supply quality and the badge doubles as a trust signal.
87. [GROWTH] Pay referral credits into the naira wallet for both referrer and referee, because wallet credit recirculates as bookings while cash-out offers just leak.
88. [GROWTH] Make wishlists shareable and collaborative, because group trips are planned by committee and every shared list recruits new users.
89. [GROWTH] Support group split-pay on a single booking, because December house rentals are funded by contribution culture and the organiser should not front the money.
90. [GROWTH] Send price-drop and availability alerts on saved items, because saved-but-not-booked is the warmest audience the platform owns.
91. [GROWTH] Generate programmatic SEO location pages ("Shortlets in Lekki Phase 1") from live inventory, because local search intent is the cheapest durable acquisition channel.
92. [GROWTH] Emit schema.org structured data (LodgingBusiness, Offer, Review) on listing pages, because rich results win the click before any brand spend does.
93. [GROWTH] Allow guest checkout on the first booking with account creation afterwards, because forced registration before payment measurably taxes first-purchase conversion.
94. [GROWTH] Run winback campaigns with a small wallet credit for dormant users, because reactivation via owned wallet credit is far cheaper than re-acquisition via ads.
95. [GROWTH] Show live social proof ("booked 12 times this month") computed from real events only, because genuine urgency converts and the honesty rules already forbid the fake kind.
96. [GROWTH] Add corporate accounts with central billing and traveller management, because relocations, NGOs and energy-sector travel are steady high-value demand nobody serves well locally.
97. [GROWTH] Publish curator collections by local tastemakers with tracked links, because borrowed taste and borrowed audience beat generic category pages.
98. [GROWTH] Offer a waitlist on sold-out dates that converts to an alert on cancellation, because captured overflow demand is free revenue and a live demand signal for agents.
99. [GROWTH] Time the review ask to checkout day via push and WhatsApp, because review volume is the compounding asset and timing is most of the response rate.
100. [GROWTH] Give agents an embeddable booking widget for their Instagram bio links, because agents already market themselves and every embed markets the platform.
101. [ARCH] Implement a transactional outbox for booking and payment events, because alerts, emails and analytics need reliable events without dual-write inconsistency.
102. [ARCH] Require idempotency keys on every mutating endpoint, because mobile networks retry and the double-booking guard deserves a double-charging twin.
103. [ARCH] Build search on Postgres full-text plus trigram behind a SearchProvider interface, because it delivers real search now with a clean later port to dedicated infrastructure.
104. [ARCH] Adopt PostGIS for geo queries and server-side map clustering, because price pins at Lagos listing density will melt any client that clusters in the browser.
105. [ARCH] Stand up the image pipeline with on-upload transforms and a stored blurhash per photo, because retrofitting derivatives across thousands of listing photos is miserable and avoidable.
106. [ARCH] Move feature flags into the database with env fallback, because shipping dark and ramping gradually needs runtime control, not redeploys.
107. [ARCH] Add a job queue (pg_cron or a worker) for alerts, payout runs and review reminders, because request-path side effects are the first thing to fail under load.
108. [ARCH] Keep a webhook inbox table with signature verification, dedupe and replay, because Paystack redelivers and idempotent ingestion is what keeps the ledger trustworthy.
109. [ARCH] Define a typed analytics event schema in a shared package before instrumenting, because one vocabulary now prevents an unqueryable event swamp later.
110. [ARCH] Enforce the audit log as append-only by revoking UPDATE and DELETE at the database, because an editable audit trail proves nothing to a regulator or a dispute.
111. [ARCH] Write contract tests that run every provider adapter against both seed and real implementations, because that is what keeps the swap-without-rewrite promise honest.
112. [ARCH] Persist the full computed price breakdown as rows at booking time, because disputes are settled by what was shown, not by re-deriving prices that have since changed.
113. [ARCH] Add edge rate limiting on auth, search and messaging before public launch, because credential stuffing and scraping arrive with the first press mention.
114. [ARCH] Serve all media from a CDN with Lagos points of presence, because round trips to eu-west-1 dominate page load for the core audience.
115. [ARCH] Drive the booking state machine from an explicit transition table into booking_state_events, because ad hoc status flips are how impossible states are born.
116. [ARCH] Schedule nightly logical backups with a tested restore runbook, because backup targets are currently undefined and an untested restore is not a backup.
117. [MONEY] Run wallet and payments on one unified ledger, because a separate wallet balance field would reintroduce exactly the defect ADR-004 exists to kill.
118. [MONEY] Make refunds instant to the wallet with bank refund as the slower fallback, because refund speed is what converts a cancellation into a rebooking instead of churn.
119. [MONEY] Decide Paystack subaccount splits versus internal ledger settlement before the first live payment, because changing settlement topology after launch means migrating real money.
120. [MONEY] Model promo codes and vouchers as ledger entries, never as price mutations, because discounts outside the ledger silently corrupt revenue reporting.
121. [MONEY] Sell gift cards purchasable abroad and redeemable in naira, because it productises the diaspora sponsorship behaviour that already exists informally.
122. [MONEY] Offer deposit-now-balance-later on far-out bookings, because locking commitment early smooths agent cash flow and lifts conversion on big-ticket December stays.
123. [MONEY] Support corporate invoicing with NET payment terms, because business accounts will not exist without it and the ledger can carry receivables cleanly.
124. [MONEY] Build 7.5 percent VAT line-item readiness into the breakdown model even if launched at zero, because retrofitting tax into a live pricing model is a rewrite.
125. [MONEY] Put take-rate experimentation behind a flag per market and category, because one national rate is unlikely to be right for both Lekki shortlets and campus rooms.
126. [MONEY] Partner with a licensed lender for stay-now-pay-later rather than lending off the platform's own book, because peak-season ticket sizes exceed single-month cash for many guests.
127. [MONEY] Model an agent subscription tier (monthly fee for reduced commission) without building it, because it gives the deferred Pro decision (B-11) a concrete revenue thesis to evaluate.
128. [MONEY] Review any future wallet yield or cashback feature against CBN licensing rules first, because unlicensed deposit-taking is an existential regulatory risk, not a product detail.
129. [MOBILE] Ship a home-screen PWA with an offline shell before the Expo app lands, because it delivers app-like reach now without the store-review critical path.
130. [MOBILE] Cache the booking reference and QR code offline, because the moment it is needed is at a gate where signal is often worst.
131. [MOBILE] Add app shortcuts (long-press icon to Bookings, Wallet, Search), because regulars live in two screens and should reach them in one gesture.
132. [MOBILE] Put a biometric lock on wallet and payout screens, because phones are shared and borrowed here far more than Western threat models assume.
133. [MOBILE] Configure Universal Links and Android App Links, because a WhatsApp-shared listing that opens in the browser instead of the installed app wastes the install.
134. [MOBILE] Enforce an app size budget of roughly 40 MB in CI, because low-storage Android users uninstall the biggest app first when space runs out.
135. [MOBILE] Build a notification preference centre by channel and topic, because the alternative is users killing notifications entirely at the OS level.
136. [MOBILE] Support multi-select photo upload with background retry, because agents upload listing photos over flaky connections and a failed batch means an abandoned listing.
137. [MOBILE] Maintain a test matrix of common Nigerian devices (Tecno, Infinix, itel, low-RAM Androids), because the median customer device is not an iPhone and never will be.
138. [PERF] Render blurhash placeholders for every image from the stored hash, because perceived speed on 3G is decided by what appears in the first 200 milliseconds.
139. [PERF] Gate CI on Lighthouse runs under throttled 3G, because the median Nigerian connection is the target condition, not the edge case.
140. [PERF] Apply ISR or edge caching to listing and location pages, because discovery reads vastly outnumber writes and cached reads are the cheapest scale available.
141. [PERF] Prefetch listing detail on card press-down, because the touch-to-navigation gap is free time and using it makes the app feel instant.
142. [PERF] Debounce map searches and cancel in-flight requests on pan, because "search as I move the map" without cancellation floods both the network and the backend.
143. [PERF] Cache per-area listing counts and aggregates at the edge, because home and search hit the same aggregates on every load and should never touch Postgres for them.
144. [PERF] Enforce a per-route JavaScript bundle budget in CI, because bundle creep is invisible on office wifi and brutal on a Tecno over 3G.
145. [PERF] Self-host and preload the exact Inter subsets in use, because a third-party font fetch stalls first paint precisely on the high-latency links that matter most.
146. [A11Y] Integrate a visible focus ring with the stride treatment on every interactive element, because keyboard and switch users must be able to see focus on glass surfaces.
147. [A11Y] Give every icon-only control and 3D tile an accessible name, because a screen reader hearing "button, button, button" cannot book a stay.
148. [A11Y] Audit contrast of gradient text over glass in both themes against WCAG AA, because luminous-on-translucent is exactly where decorative treatments quietly fail readers.
149. [A11Y] Announce form errors, search result counts and booking status changes via aria-live regions, because silent state changes strand assistive technology users mid-transaction.
150. [A11Y] Require alt text on listing photos with inline guidance at upload, because accessible media must come from agents at the source, not from retrofitting.
151. [SEARCH] Add marker clustering to the live map once listings pass roughly 50, because overlapping price pins at city zoom turn the flagship map into noise.
152. [SEARCH] Draw the searched city's boundary softly on the map and dim outside it, because spatial focus tells users the platform actually understands "Lekki" as a place, not a keyword.
153. [SEARCH] Sync map viewport to the URL (lat, lng, zoom), because a shareable map position is a shareable apartment hunt, and WhatsApp is the sharing medium here.
154. [SEARCH] Add a "search this area" chip when the user pans the live map, because panning is intent, and forcing a retype throws that intent away.
155. [SEARCH] Persist the last chosen view (list or map) per user, because view preference is a stable trait, and re-picking it every session is friction.
156. [SEARCH] Add price histogram bars behind the future price filter slider, because seeing where the market clusters teaches users what their budget buys before they filter.
157. [SEARCH] Support typo-tolerant city matching (Lekki/Leki, Ibadan/Ibaban), because mobile keyboards mangle place names and a zero-result page for a typo is a lost session.
158. [SEARCH] Rank verified listings above unverified at equal relevance, because ranking is the strongest lever the platform has to make verification worth an agent's effort.
159. [SEARCH] Show "N people viewed this week" on high-traffic listings, because social proof on discovery surfaces converts browsers into bookers without a single new feature.
160. [SEARCH] Add recent-searches chips under the search bar from localStorage, because repeat hunting for the same city is the dominant pattern in a multi-week apartment search.
161. [MAP] Pick and license a production tile provider (MapTiler or self-hosted OpenFreeMap) before launch, because Carto's free tier is for non-commercial use and the map is now a flagship feature.
162. [MAP] Style map tiles to the brand (dark navy water, electric accents) via a custom vector style, because a stock basemap inside a neon platform breaks the spell the design works so hard for.
163. [MAP] Add a locate-me control that centres on the user with permission, because "what is near me right now" is the core mobile question the green-app reference answers and ours should too.
164. [MAP] Show a listing preview card docked at the map's foot when a pin is tapped, mirroring the reference app, because navigating away from the map to see one photo is a heavy penalty.
165. [MAP] Cache the last map tiles in the service worker for offline glance, because a renter standing outside a building with no data should still see where they are.
166. [ASSISTANT] Wire the assistant to the real listing repository so answers cite actual bookable places with links, because an assistant that hands back real inventory is the moat.
167. [ASSISTANT] Add tool-call style quick actions to answers (Book it, Message agent, Open map), because an answer that ends in a tap is worth ten that end in text.
168. [ASSISTANT] Stream responses token by token in the UI, because perceived intelligence is mostly perceived latency, and streaming makes the same answer feel twice as fast.
169. [ASSISTANT] Persist assistant threads to Supabase once auth lands, keyed to the user, because localStorage threads die with the browser and continuity is the product.
170. [ASSISTANT] Teach the assistant the trust rules (no fees, pay after inspection, flag account numbers), because it will be asked about payment safety and must answer as policy, not vibes.
171. [ASSISTANT] Add voice input on mobile, because typing "2 bedroom in Surulere under 400k with prepaid meter" is exactly the query people would rather say.
172. [ASSISTANT] Log anonymised assistant queries as demand signal, because "what people ask for and cannot find" is the highest-grade market research the platform will ever own.
173. [WALLET] Build the fund wallet flow against the ledger with a simulated provider behind a feature flag, because the full state machine can be proven end to end before a naira moves.
174. [WALLET] Add scheduled rent reminders with wallet balance checks, because annual rent in Nigeria is a planning problem and the wallet that helps plan it becomes the default wallet.
175. [WALLET] Show a spend breakdown ring by category (stays, food, experiences), because reflective money features raise session depth and make the wallet feel like a financial home.
176. [WALLET] Require a transaction PIN set-up before first wallet action, stored as a hash server-side, because device possession is not authorisation in a shared-phone market.
177. [WALLET] Export statements as branded PDF, because proof of payment is a cultural requirement here and screenshots of an app are weak evidence.
178. [WALLET] Add beneficiary management with nicknames for repeat transfers, because typing a 10-digit account number twice is once too many.
179. [MONEY] Reconcile the ledger nightly with a checksum job that alerts on drift, because a derived-balance design is only as trustworthy as its invariant checks.
180. [MONEY] Model escrow as ledger holds (authorise, capture, release) rather than balance edits, because inspection-gated payment is an escrow product and the ledger should say so.
181. [BOOKING] Implement the reserve flow writing real bookings under the GiST constraint with clear conflict errors, because "those dates just got taken" must be a designed moment, not a 500.
182. [BOOKING] Add a pre-booking availability calendar on listing detail, because showing blocked dates before the form saves the most common booking failure.
183. [BOOKING] Send booking lifecycle events to notifications (requested, confirmed, upcoming, complete), because the notifications page is built and silence there reads as abandonment.
184. [BOOKING] Add cancellation windows per listing with plain-language policy text, because disputes concentrate exactly where policies are vague.
185. [BOOKING] Support date-flexible search (+/- 2 days), because flexible travellers are the easiest inventory-matching wins the platform can take.
186. [TRUST] Ship the messaging trust migration and an admin flag queue in the same sprint, because a trigger that flags into a table nobody reads is compliance theatre.
187. [TRUST] Add in-thread education cards the first time money words appear ("Never pay before inspection"), because the moment of temptation is the only moment education works.
188. [TRUST] Rate-limit new conversations per guest per day at the database, because scraping agents' contacts through mass DMs is the obvious abuse of an open messaging surface.
189. [TRUST] Blur images in messages from unverified counterparties until tapped, because unsolicited image spam is a known harassment vector in rental messaging.
190. [TRUST] Add a one-tap report flow in threads that snapshots the conversation into the reports table, because evidence capture at report time is what makes moderation decidable.
191. [TRUST] Show an inspection status timeline on the booking (requested, scheduled, confirmed), because the pay-after-inspection promise needs a visible state machine to be believed.
192. [TRUST] Verify agent payout accounts against registered business names before first payout, because payout-name mismatch is the cleanest early fraud signal available.
193. [AGENTS] Build the agent listings CRUD with draft, submit, approve states next, because the marketplace cannot cold-start while inventory is seed data.
194. [AGENTS] Add a listing quality score (photos count, description length, amenities, verification) shown to the agent, because gamified completeness beats nagging for inventory quality.
195. [AGENTS] Give agents a response-time badge computed from message latency, because renters choose fast responders and agents chase visible metrics.
196. [AGENTS] Add a calendar sync stub (iCal import) for agents listing on multiple platforms, because double-booked inventory hurts RentMe's trust even when the clash happened elsewhere.
197. [AGENTS] Let agents pin three showcase photos that appear in search cards, because giving agents control of their shop window raises photo quality platform-wide.
198. [AGENTS] Build a lightweight agent mobile dashboard (today's messages, upcoming inspections, earnings), because agents run their business from a phone between viewings.
199. [ADMIN] Stand up the admin console shell (ref 04 rail) with risk alerts, message flags, agent approvals and reports as the first four queues, because every trust feature built so far terminates there.
200. [ADMIN] Add an admin impersonation-free "view as user" read-only mode, because support needs to see what the user sees without ever holding their session.
201. [ADMIN] Log every admin action to the audit table with actor, target and before/after, because an admin console without an audit trail is a liability, not a tool.
202. [ADMIN] Build a kill switch per feature (messaging, wallet, bookings) as database flags, because incident response needs a way to stop the bleeding without a deploy.
203. [DESIGN] Add a shared page-transition system with the View Transitions API (glow hand-off between routes), because the signature ripple was promised and route changes are where it pays.
204. [DESIGN] Convert the numbers band to odometer-roll digits, because mechanical rolling numerals read as premium in a way linear count-ups do not.
205. [DESIGN] Add skeleton-to-content morphs on listing grids, because layout-stable loading is the difference between "fast app" and "flickering app" on 3G.
206. [DESIGN] Introduce a subtle parallax between the ambient waves and page content on scroll, because depth between layers is the cheapest remaining "alive" upgrade.
207. [DESIGN] Give the villa hero a slow day-night light shift tied to the daypart grading, because the scene is now the platform's face and a face should not be frozen.
208. [DESIGN] Add hover video micro-loops on featured listing cards behind a reduced-motion and save-data gate, because motion sells rooms, but only for users who can afford the bytes.
209. [DESIGN] Build an empty-state illustration set in the neon-blue language, because empty states are currently text-first and they are the new user's first impression.
210. [DESIGN] Document the design system (tokens, glass, motion, icon rules) as a living styleguide route at /styleguide, because the next contributor should learn the language from the product itself.
211. [UX] Add pull-to-refresh on home, search and messages in the installed app, because it is the universal mobile gesture for "give me the latest" and its absence reads as broken.
212. [UX] Make the bottom tab bar auto-hide on scroll down and return on scroll up, because 52 recovered pixels of listing photo per card is worth the gesture.
213. [UX] Add haptic feedback (vibrate API) on save, book and send actions on Android, because tactile confirmation closes loops faster than toasts.
214. [UX] Keep search scroll position when returning from a listing, because losing your place in a 40-card list is the fastest way to end a hunting session.
215. [UX] Add a comparison tray for up to three saved listings with a side-by-side sheet, because apartment decisions are made in pairs and triples, not singly.
216. [UX] Offer "notify me when prices drop in Lekki" on empty and thin results, because a saved intent with a push channel converts a dead end into a future session.
217. [UX] Let users share a listing as a branded image card (photo, price, QR), because WhatsApp status is Nigeria's biggest discovery surface and screenshots are ugly ambassadors.
218. [UX] Add long-press quick actions on listing cards (save, share, hide), because power users grow in the dark and hiding unwanted results improves their feed permanently.
219. [UX] Show "you viewed this 3 days ago" markers on cards, because recognition beats recall when a hunt spans two weeks and forty tabs.
220. [UX] Add an explicit "hide my activity" privacy toggle that pauses view history and recents, because shared phones make browsing privacy a mainstream need, not an edge case.
221. [ARCH] Introduce a typed server-action result envelope (ok, error, fieldErrors) used by every mutation, because uniform error shape is what keeps thirty forms honest.
222. [ARCH] Add Zod schemas at every server boundary and infer the client types from them, because runtime validation at the edge is the only real defence once envs land.
223. [ARCH] Set up Sentry (or GlitchTip) with source maps and release tags before real users, because production bugs on Tecno devices will never be reproduced at a desk.
224. [ARCH] Add Playwright smoke tests for the six golden paths (land, search, listing, book, message, wallet) in CI, because the platform now has enough surface that regressions hide.
225. [ARCH] Wire a feature-flag table read at layout time with an in-memory TTL cache, because shipping dark and revealing later is how a two-person team releases safely.
226. [ARCH] Split `globals.css` into layered partials (ambient, glass, buttons, motion, light) via CSS imports, because the file passed 1,300 lines and merge accidents happen in monoliths.
227. [ARCH] Generate an OG-image route per listing (photo, price, neon frame), because link unfurls in WhatsApp groups are the platform's real landing pages.
228. [ARCH] Add bundle analysis to CI with a hard budget per route, because Leaflet just joined the bundle and the next library will too.
229. [ARCH] Precompute city floor prices into a tiny JSON at build (revalidated hourly), because the map should not scan the catalogue on every request once listings are live.
230. [ARCH] Move listing photos through an image proxy with width params and AVIF, because Unsplash today and Storage tomorrow both need the same resize pipeline.
231. [NIGERIA] Add prepaid-meter, borehole, generator and estate-security amenity filters, because these are the amenities Nigerian renters actually shortlist by.
232. [NIGERIA] Display service charge and caution deposit as separate labelled figures, because all-in pricing hides the two numbers that cause the most disputes.
233. [NIGERIA] Support annual and multi-year rent terms alongside nightly, because the long-let market is the volume market and nightly-only framing excludes it.
234. [NIGERIA] Add estate and street-level location hints without exact addresses pre-booking, because "Off Admiralty Way" is the granularity renters need and agents will share.
235. [NIGERIA] Localise number and currency formatting per locale files already shipped, because a Yoruba UI showing English number words is a half-kept promise.
236. [NIGERIA] Add NIN-based identity verification for agents via a KYC provider behind a flag, because government-ID verification is the trust ceiling-raiser the badge system needs.
237. [NIGERIA] Publish area guides (power reliability, flood risk, transport) as content pages, because relocation decisions hinge on this knowledge and owning it owns the search.
238. [NIGERIA] Partner-badge diaspora-friendly listings with virtual tour requirements, because renters abroad book sight-unseen and need a stronger evidence bar.
239. [GROWTH] Add a referral programme with wallet credit rewards on both sides, because the wallet already exists and referral credit is its cheapest acquisition loop.
240. [GROWTH] Build lightweight SEO city pages (stays in Lagos, restaurants in Abuja) from the catalogue, because organic search is free demand the seed data can already serve.
241. [GROWTH] Add an email capture on the landing FAQ and coverage map for "we are coming to your city", because expansion demand should be measured before it is built.
242. [GROWTH] Instrument the funnel (view, search, listing, message, book) with PostHog, because every growth argument from here on needs numbers, not opinions.
243. [GROWTH] Add "recently booked in Lagos" social proof ticker to the landing facts band, because motion plus proof is the strongest first-visit trust signal available.
244. [GROWTH] Ship a WhatsApp share button on every listing with a pre-written message, because the share is the growth loop and the pre-written text is its conversion rate.
245. [PERF] Lazy-load Leaflet only when map view is requested (dynamic import exists, verify no eager chunk), because list-view users should never pay the map's bytes.
246. [PERF] Add `save-data` and connection-aware media (skip Ken Burns, smaller images on 2G), because respecting the Data Saver header is respecting the actual user base.
247. [A11Y] Add a skip-to-map and map keyboard controls (arrow pan, +/- zoom), because the map is now a primary surface and must not be pointer-only.
248. [A11Y] Announce map pin counts and selected city via aria-live when the map filters, because visual-only state changes on the flagship feature exclude screen reader users.
249. [TRUST] Add device fingerprint and new-device email alerts once auth lands, because account takeover in a wallet product is the breach that ends trust permanently.
250. [TRUST] Write and publish a plain-language safety centre page (how payments work, how inspections work, how to report), because the trust pipeline deserves a front door users can read before they need it.
