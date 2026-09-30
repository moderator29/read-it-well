# The Vallo launch films: brief and storyboard (v2)

v2 answers the first storyboard critique (`scratchpad/critic/storyboard-round1.md`, in the ledger):
- one clock;
- a handoff for every cut;
- honest results;
- a desktop film designed for its own frame;
- captions clear of the platform overlays;
- a sound column;
- the store ending by Apple's rules.

## Brief

- **What it is for:** launching Vallo, a Nigerian app for homes, hotels, shortlets and restaurants, with one account.
- **Who is watching:**
  - Nigerians on X, Instagram, TikTok and YouTube: renters and buyers tired of guessing costs, travellers, people going out;
  - owners, landlords, hosts, hotels and restaurants who could list.
  - Mostly on a phone, often with the sound off.
  - It is for everyone looking for a place, not an agents' tool.
- **What they should do at the end:** get the app (the ending) and remember vallospaces.com.
- **Two films, one voice and one soundtrack, different compositions:**
  - **Mobile**, 1080 × 1920 at 60 fps, is carried by the 3D phone (`phone3d/browser/live.js`, island model).
  - **Desktop**, 1920 × 1080 at 60 fps, is carried by a browser window at vallospaces.com, with the pointer doing every action.
- **Length:** 101.54 s, which is 44 bars at 104 BPM. The voice runs from 2.31 to 95.24 s, and the ending is silent (music only).
- **One clock:** `timeline.json`, written by `voiceplan.py` from the aligned voice.
  - Rows start and end on beats (`rows.py` prints and checks the table below).
  - Scenes anchor to words and beats through `ctx.word()`, `ctx.beat()` and `ctx.bar()`, never to typed-in seconds.
  - The music is rendered to the same grid: the drop on bar 4 ("Meet Vallo"), and lifts on bars 12, 19, 29 and 40.
- **Brand:** `scripts/marketing/DESIGN.md`. **Facts:** `FACTS.md` is the only source for anything on screen.

## Motion rules

1. The thing in front becomes the transition: it moves toward the camera while the next scene waits underneath.
2. One object carries the story: the phone on mobile, the window on desktop. The three question cards are the spine, and they come back to be answered.
3. One main movement leads (named in each row), with smaller ones overlapping under it.
4. Things land slowly enough to read, leave fast, and nothing moves linearly. The eases are `land`, `leave`, `glide` and `whip` (engine/core.js).
5. A cut only where size, direction and subject match. Carried objects land on the same pixels on both sides (the boxes are given in the rows).
6. Every action has a visible result drawn from real screens or from FACTS.
7. Type is motion. Big words enter from opposite sides and sit on a scrim over pictures. Every type row names its words, entry, exit and what the exit reveals.
8. Scale varies (close, wide, overhead, full-frame type), and no layout is used twice. There are at most two notification cards per film.
9. Frame one is a finished picture. The film makes sense with the sound off.

## The spine and the signature moments

- **The spine: three doubts, three answers.** Frame one holds three question cards: "What will it really cost?", "Who am I talking to?", "Where does my money go?".
  - Each card comes back at its moment and turns over to its answer: cost in row 13, people in row 27, money in row 31.
  - In row 31 all three sit answered, side by side.
- **Signature 1: the bill that adds itself up (rows 11–13).** The cost section lifts off the listing as an empty receipt. Each line prints as it is named: the rent, then the three fees, then the refundable caution deposit. One stroke adds them into ₦26,100,000 on "right there".
- **Signature 2: two worlds, one switch (row 19).** The app's own Property | Stays control grows to fill the frame. One slide of it turns the whole night-blue film warm for the travel half.
- **Signature 3: money that never stops at Vallo (rows 28–31).** A naira coin goes from your card, through Paystack, straight into the owner's bank. Vallo sits beside the path, not on it, and its tray stays empty the whole way.
- **Signature 4: the country comes to one door (rows 38–40).** Nigeria as a velvet model on a plinth, in the material of the opening art. A home rises in Lagos, and guests' routes arc in from five cities. Its pin lifts off and becomes the Vallo mark.

## Frames, safe zones, captions

**Mobile, 1080 × 1920**
- Key content stays inside the 4:5 feed crop, y 285–1635, and x 44–940: the platform buttons sit on the right.
- Phone UI that must be read sits between y 130 and 1430.
- The captions band is y 1230–1360, centred at 1290. Big type and pop-ups stay out of it while captions are on.

**Desktop, 1920 × 1080**
- The captions band is y 915–1005, centred at 960, and the window's hero box ends above it.

**Captions**
- They are burned in from the word timings: white on a navy glass pill, the word being said in sky blue, words to come dimmed.
- They are hidden only where the same words are the big type (the Captions column).

**Handoff boxes**

These are stage px. A phone box is its centre and its height at zero rotation.

| Name | Mobile | Desktop |
|---|---|---|
| PHONE_HERO | cx 540, cy 820, h 1400 (display about x 227–853, y 147–1493) | cx 1480, cy 520, h 860 (beside a window) |
| PHONE_LOW | cx 540, cy 1180, h 1180 (leaves y 120–560 for type) | none |
| PHONE_CLOSE | h 2300, framed on the named part | none |
| WINDOW_HERO | none | x 320–1600, y 64–914 (1280 wide, scale 0.889) |
| WINDOW_LEFT | none | x 80–1100, y 150–827 (1020 wide, split screen) |
| RIGHT_PANEL | none | x 1160–1840, y 150–827 |
| CARD_SLOT (the question cards' answered row) | three cards 300 × 360 at y 700, x 60 / 390 / 720 | three cards 520 × 300 at y 330, x 150 / 700 / 1250 |

## Mobile film

The times below are printed by `rows.py`. Sound names are the audio kit's; gains are for the mix. Captions: **on** = shown at y 1290; **off** = the big type says it.

| # | Time (beats) | Voice | On screen | For | Lead → exit → carrier (landing box) | Sound | Capt. |
|---|---|---|---|---|---|---|---|
| 01 | 0.00–2.31 (0–4) | music | **Frame one, finished.** The velvet-hills art (`step-1-dark`, native size, top-anchored, feathered into navy below). Three glass question cards float at three depths: "What will it really cost?" (x 70–700, y 360), "Who am I talking to?" (x 330–1010, y 640), "Where does my money go?" (x 110–790, y 920). | The doubt of looking for a place. | A slow push-in (scale 1.00→1.05), the cards drifting at three speeds → it continues → the cards. | Music intro only. | none |
| 02 | 2.31–4.04 (4–7) | Finding a place in Nigeria | "Finding a place" slides in from the left (y 1060) and "in Nigeria" from the right (y 1190), Poppins 700 at 116 px, on a navy scrim band (y 1000–1330, 80%). The cards dim behind. | The hook. | The words' entry (0.55 s `land`) → the words leave fast in opposite directions on "shouldn't" (3.94) → the cards gather at the centre. | whoosh_short −10 at 2.31 | off |
| 03 | 4.04–6.92 (7–12) | shouldn't feel like a gamble. | The three cards stack at the centre and shuffle like playing cards: riffle, fan and swap. On "gamble" (5.14) they fan like a hand. On bar 3's last beat (6.35) the middle card rushes at the camera and turns: its back is the Vallo card, electric-blue glass. | "Gamble", made visible. | The shuffle, then the rush (`whip`) → the card back fills the frame at 6.92 → the Vallo card. | card_slide −12 ×3 (4.1, 4.5, 4.9), whoosh_long −8 at 6.35 | on |
| 04 | 6.92–8.65 (12–15) | Meet Vallo. | On the blue card face the Vallo mark lands at the centre with a ring of light (the drop), and the wordmark rises under it on "Vallo" (7.19). | The name. | The mark landing (scale 1.2→1, `land`) → at 8.3 the ring of light widens into a round window → through it, the phone. | impact_soft −4 at 6.92 | off |
| 05 | 8.65–11.54 (15–20) | Homes, hotels, shortlets and restaurants… | Through the ring, the phone rises (PHONE_LOW, front) and its screen changes on each word: `home` on "Homes" (8.65), `stays` on "hotels" (9.21), `stay` (Lagoon Crest) on "shortlets" (10.04), `restaurants` on "restaurants" (10.94). Each word lands big above the phone (y 180–460, 150 px), entering from alternating sides and pushing the last one out the other way. | Breadth, all in the app itself. | The phone's slow turn (ry −8°→8°) with the screen swaps → at 11.54 the screen swaps to welcome slide 1 → the phone. | swipe −14 ×4 on the swaps | off |
| 06 | 11.54–15.00 (20–26) | all in one app, with one account. | `welcome-1` on the phone: "Two worlds. One platform. Flip between Property and Stays with a single account." Its Property \| Stays pill (redrawn in HTML exactly over the captured one) slides to Stays on "one app" (12.38) and back on "account" (13.67). "One app." enters from the left (y 250), "One account." from the right (y 400). | One place, one account. | The pill's two slides → the words leave upward, and the phone turns to three-quarter and pushes in → the phone. | toggle_on −6 at 12.38, toggle_off −6 at 13.67 | off |
| 07 | 15.00–16.73 (26–29) | Looking for a home to rent or buy? | PHONE_CLOSE on `home`, framed on "Find your next home" and the Buy, Rent, Pay, List tiles. A tap on **Rent** on "rent" (15.93), a ripple, then the screen slides to `search` (16.31). | Every tap has a result. | The tap → the slide → the phone pulls back to three-quarter right (cx 640). | tap −6 at 15.93, swipe −12 at 16.31 | on |
| 08 | 16.73–18.46 (29–32) | Search across Nigeria, | The phone (cx 640, h 1300, ry −14) scrolls `search-full`. Behind it on the left, a thin electric outline of Nigeria draws itself, and dots light in time: Lagos, Abuja, Kano, Port Harcourt, Ibadan. | The range, and a first look at the map of row 39. | The scroll with the dots → a tap on the filter button (18.30) → the filter sheet rises. | tap_soft −16 ×5 on the dots, tap −8 at 18.30 | on |
| 09 | 18.46–20.77 (32–36) | filter by exactly what you need, | The filter sheet (`filters`, "Apply (52)") on the phone, which turns front (PHONE_HERO). Above it (y 150–420) the **Villas** tile is shown large and switches on at "exactly" (19.49). The screen becomes `filters-villas`, and the button's count drops from **Apply (52)** to **Apply (3)**. Apply is tapped at "need" (20.46). | Control, with a real result. | The tile turning on, then the count → the Apply tap → the results slide in (cards only) and the first card, the Maitama villa, grows → the villa card. | toggle_on −4 at 19.49, counter_tick −12 at 19.6, tap −6 at 20.46 | on |
| 10 | 20.77–23.08 (36–40) | and see the full move-in cost before you ever make a call. | The villa card becomes `listing`. The phone scrolls on "move-in" (21.74) to "What you will actually pay" (`listing-cost`). | The promise. | The push-in toward the cost section → on "call" (23.83) the section starts to lift → the receipt. | swipe −12 at 21.74 | on |
| 11 | 23.08–25.38 (40–44) | (pause) | **Signature 1 opens.** The cost section lifts off the screen toward the camera as a glass receipt (x 90–990, y 200–1180). Its six line slots are empty, and its total reads "₦ …". The phone sinks and dims (cy 1500, opacity 0.3). | The lift-off is the transition, and the pause is the drum roll. | The receipt's flight (`glide`, 1.1 s) and a slow settle → it floats → the receipt. | whoosh_short −8 at 23.08, card_slide −10 at 23.3 | none |
| 12 | 25.38–27.69 (44–48) | Rent, fees, caution deposit… | The lines print as they are named (FACTS figures):<br>• on "Rent" (25.38): "Rent (a year) ₦18,000,000";<br>• on "fees" (26.00, 26.19, 26.38): "Agency fee ₦1,800,000 · 10.0%", "Legal fee ₦1,800,000 · 10.0%", "Agreement fee ₦900,000 · 5.0%";<br>• on "caution" (26.60): "Caution deposit (refundable) ₦3,600,000";<br>• on "deposit" (27.04), small and grey: "Service charge: not declared".<br>Labels are Inter 600 at 46 px, amounts tabular and right-aligned. | See every part. | Each line slides in from the right under a light sweep → the lines settle → the receipt. | counter_tick −10 on each line (6) | on |
| 13 | 27.69–30.58 (48–53) | all added up, right there. | On "all added up" (27.88) a bright rule sweeps down the receipt and the total counts up to **₦26,100,000**. It lands on "right" (28.87) with "Total to move in" and the Example chip. On "there" (29.19) the first question card swings in from the left beside the total and turns over: "₦26,100,000 to move in. Seen before a single call." | The result, and the first doubt answered. | The sweep and the count → the receipt and the card shrink into one chat bubble (30.2) → the bubble flies to the phone rising at PHONE_HERO. | counter run 28.1–28.87, success −4 at 28.87, pop −8 at 29.3 | on |
| 14 | 30.58–33.46 (53–58) | Talk straight to the owner, the landlord or the agent, | The bubble lands in the live thread (`thread`: Vallo Examples, "Mini flat in Yaba", the villa cards). The phone moves to PHONE_LOW. Above it, one at a time, on a scrim pill (110 px): "owner" from the left (31.48), "landlord" from the right (32.09), "agent" from the left (33.03). Each pushes the last out. | Straight to the person. | The words' alternating entries → the phone turns front and pushes in to the composer → the phone. | bubble_send −6 at 30.8, pop_low −12 ×3 | on |
| 15 | 33.46–35.19 (58–61) | right inside the app. | Close on the thread (PHONE_CLOSE, lower half). The member's real message, "I like these two as well. Could we view all three on Saturday morning?", types into the composer, is sent on "app" (34.54), rises into its place in the thread, and its tick shows. | An action and its result. | The send → the bubble settles → the share sheet rises. | type_key −16 ×8 (33.5–34.3), tap −8 at 34.39, bubble_send −6 at 34.54 | on |
| 16 | 35.19–36.92 (61–64) | Share listings in the chat, | The share sheet (`listing-share`: "Send in a Vallo chat", "Share elsewhere") rises in the phone. "Send in a Vallo chat" is tapped on "listings" (35.51). The Maitama villa card flies out in an arc and drops into the thread. | Sharing, with a result. | The card's arc (`glide`) → the card lands → the phone slides right (cx 700). | tap −8 at 35.51, card_slide −10 at 35.6, bubble_send −8 at 36.1 | on |
| 17 | 36.92–38.65 (64–67) | plan an inspection, | A glass calendar card (x 60–620, y 300–820) swings in over the phone's left edge. Its page turns to **Saturday · 11:00 AM**, and on "inspection" (37.17) the time stamps in with "Inspection set" and the Example chip. | Planning, with a result. | The page turn → the card shrinks → it docks into the conversation row (row 18). | card_slide −10 at 36.95, stamp −8 at 37.17 | on |
| 18 | 38.65–40.96 (67–71) | and keep every conversation in one place. | The phone pulls back to PHONE_HERO and shows `messages` (Inbox: Property \| Stays, then the Vallo Examples conversation). The calendar card docks into that row as its unread dot. At 40.3 the camera pushes toward the inbox's Property \| Stays pill. | Order, all in one place. | The pull-back and the dock → the push to the pill → the pill. | pop −10 at 39.2 (dock) | on |
| 19 | 40.96–42.69 (71–74) | Planning a trip? | **Signature 2.** The Property \| Stays pill grows out of the phone to fill the frame (x 60–1020, y 700–1100), and the phone falls away behind it. On "Planning" (41.54, the lift) the highlight slides from Property to Stays. Behind it the ground wipes from night navy to warm dusk, following the knob. | A change of world, with one switch. | The knob's slide (`whip`, 0.45 s) → the pill shrinks to the "Stays" chip on the stays screen of the phone rising at PHONE_HERO → the pill becomes the chip. | whoosh_long −10 at 40.96, toggle_on −2 at 41.54 | on |
| 20 | 42.69–45.58 (74–79) | Browse hotels, shortlets and resorts… | On the dusk ground, `stays` ("Great stays. Better experiences.") on the phone. The Hotels tile lights on "hotels" (43.00) and Shortlets on "shortlets" (43.74). On "resorts" (44.54) Lagoon Crest Resort's photo card (from `stay`) rises out of the phone and floats above it (x 140–940, y 150–520). | Choice. | The tiles lighting in time → the resort card turns over into a calendar (45.4) → the calendar. | tap_soft −12 ×2, card_slide −10 at 44.54 | on |
| 21 | 45.58–47.31 (79–82) | pick your dates… | The calendar card (October 2026, x 90–990, y 160–900). Taps on **16** ("dates", 45.72) and **19** (46.10). The range fills with a sweep and a "3 nights" chip pops out. | An action and its result. | The two taps and the sweep → the "16 Oct → 19 Oct · 3 nights" chip drops into the phone → the chip. | tap −8 ×2, pop −8 at 46.39 | on |
| 22 | 47.31–49.04 (82–85) | and book a room in a few taps. | The phone shows `stays-dates` (check-in 16/10/2026, check-out 19/10/2026, 2 guests), and the chip lands in the date fields. "Show prices for these dates" is tapped on "few" (47.33). **Notification card 1 of 2:** "Room booked · Lagoon Crest Resort · 3 nights" (Example) drops over the phone's top edge on "taps" (47.67). It never sits over a page that says "No such property is available". | The result. | The tap → the card → the card lifts out of the top as the frame darkens → night. | tap −6 at 47.33, chime_notify −4 at 47.67 | on |
| 23 | 49.04–50.77 (85–88) | Going out tonight? | Full-frame type over the night skyline (`skyline-waterfront-dusk`, with a scrim): "Going out" from the left (y 520), "tonight?" from the right (y 700), 170 px. The letters are windows: Harbour Lights Kitchen shows through them. | A change of mood. The type reveals the next scene. | The push into the O of "Going" from 50.2 → the O fills the frame with the restaurant → the restaurant photo. | whoosh_short −10 at 49.04, whoosh_long −10 at 50.2 | off |
| 24 | 50.77–54.23 (88–94) | Find a restaurant you love and reserve your table in seconds. | The photo settles as the hero of `restaurant` (Harbour Lights Kitchen: Victoria Island, seafood, smart casual, seats 80, opens at 18:00) on the phone rising at PHONE_HERO. On "reserve your table" (51.86) a glass strip is written onto the restaurant's own card: "Table for 2 · Tonight, 8:00 PM", with the Example chip. | The result, on the place itself (not another notification). | The strip → the phone turns away, and the restaurant card turns over into the Restaurant role card → the card. | tap −8 at 51.9, stamp −8 at 52.37 | on |
| 25 | 54.23–57.69 (94–100) | Owners, hosts, hotels and restaurants with the verified mark | Four role cards fill the frame (2 × 2, each 470 × 520, y 180–1260), each landing on its word:<br>• **Owner** (villa photo) on "Owners", 54.23;<br>• **Host** (living room) on "hosts", 54.78;<br>• **Hotel** (resort pool) on "hotels", 55.41;<br>• **Restaurant** (from row 24) on "restaurants", 56.29.<br>The role word sits big on a scrim at each card's top. On "verified mark" (57.05) the product's own verified mark stamps in beside each word, one by one. It is never on a house or a room. | Trust, and it is about people and businesses. | The cards landing in turn, then the marks → the grid tilts back and the Owner card turns over into the phone → the phone. | pop_low −12 ×4, stamp −10 ×4 (57.05–57.5) | on |
| 26 | 57.69–60.58 (100–105) | have been checked by a real person at Vallo… | The phone (PHONE_HERO) shows `verification` ("Your ID, Government issued ID"). Beside it, three plain document pages (lines only, no names, no faces) turn one by one, the way a person reads. On "person" (59.32) the verified mark lands with "Checked by a person" and the Example chip. | The mechanism: a person, not a machine. | The page turns → the mark and label rise → the second question card. | card_slide −12 ×3, stamp −6 at 59.32 | on |
| 27 | 60.58–62.88 (105–109) | so you know who you're dealing with. | The second card, "Who am I talking to?", swings in from the right and turns over on "who" (61.25): the verified mark and "Checked by a real person at Vallo." | The second doubt answered. | The turn → the mark on the card spins off it and becomes a naira coin → the coin. | pop −8 at 61.25 | on |
| 28 | 62.88–64.62 (109–112) | And when it's time to pay… | The coin (electric-blue enamel, ₦ embossed) spins down onto the **Pay** tile of `home` on the phone, and the tile is tapped on "pay" (63.79). | The moment of paying. | The coin's fall → the tap → the coin springs up and the phone drops out of frame → the coin. | glass_clink −14 at 63.3, tap −6 at 63.79 | on |
| 29 | 64.62–66.35 (112–115) | Vallo never holds your money. | **Signature 3.** On the lift, "Vallo never" from the left (y 230) and "holds your money." from the right (y 370), 104 px. Below the type, clear of it, the path draws itself top to bottom: **Your card** (y 620) → **Paystack** (y 900) → **The owner's bank** (y 1180). The Vallo mark sits beside the path at (850, 900) with an empty tray ring. The coin drops onto "Your card". | The promise, with its mechanism in the picture. | The type's entry → the type leaves upward at 66.2 → the path. | whoosh_short −10 at 64.62 | off |
| 30 | 66.35–69.81 (115–121) | Your payment goes straight to the owner, the host or the business, | The coin runs the path. It passes Paystack on "goes straight" (67.22) and lands in the bank on "owner" (68.09). The last node's label changes as named: "Owner" (68.09), "Host" (68.70), "Business" (69.39). Vallo's tray stays empty. | How the money moves. | The coin's run (`glide`) → the Paystack node grows → the node. | whoosh_short −12 at 67.2, ding_pay −6 at 68.09, tap_soft −14 ×2 | on |
| 31 | 69.81–72.69 (121–126) | through a licensed payment processor. | Under "Paystack", "Licensed payment processor" writes in on "licensed" (70.23). The third card, "Where does my money go?", swings in and turns over (71.2): "Straight to the owner, through Paystack." The two answered cards slide in beside it, all three answered in a row (CARD_SLOT). | The third doubt answered, and the spine closes. | The turn, then the row → the cards fly off in three directions (72.5) → a big "?". | pop −8 at 71.2, success −6 at 71.9 | on |
| 32 | 72.69–74.42 (126–129) | Got a question? | A huge "?" (Poppins 700, 900 px, electric gradient) drops to the centre. From 73.4 it shrinks and slides down into the text caret of the assistant's input bar, as the phone rises around it to PHONE_HERO. | Into the assistant. | The "?" turning into the caret → the phone. | pop_low −10 at 72.69, whoosh_short −10 at 73.4 | on |
| 33 | 74.42–77.31 (129–134) | Ask the AI assistant about prices, areas or how renting works… | `assistant` on the phone. "What is a caution deposit?" types into the input and is sent (75.8). The screen becomes `assistant-caution`: the question, then the real answer, revealed top to bottom as it streams. Three glass topic chips light above the phone in time: "Prices" (75.27), "Areas" (76.02), "How renting works" (77.04). | An action and a real answer. | The typing and send → the answer's reveal → the answer rests. | type_key −16 ×10, tap −8 at 75.8, bubble_send −8 at 75.85 | on |
| 34 | 77.31–79.62 (134–138) | any time of day. | The answer rests on the steady phone. Behind it the sky goes from morning gold through day blue to night (2 s), and stars come out. | Any time. | The sky's turn → the stars line up with the stars of the welcome art → the welcome screen. | sparkle −12 at 79.0 | on |
| 35 | 79.62–81.92 (138–142) | And Vallo speaks your language: | `welcome-1` (English) on the phone, with a slow push in on "Two worlds. One platform." | The setup. | The push → on "English" the headline changes language in place → the phone. | none | on |
| 36 | 81.92–85.38 (142–148) | English, Hausa, Yorùbá and Igbo. | The screen changes language in place: English (81.90), Hausa (82.54, `welcome-ha`), Yorùbá (83.25, `welcome-yo`), Igbo (84.13, `welcome-ig`). Each language's name lands big above the phone, alternating sides. | The four languages. | The in-place swaps → the phone's screen turns to "Add a workspace" → the phone. | swipe −12 ×3 | off |
| 37 | 85.38–88.27 (148–153) | Have a property, a hotel or a restaurant? | `host-start` ("Add a workspace") on the phone. Rows light as named: "I own the property" on "property" (85.58), "We are a hotel" on "hotel" (86.34), "We are a restaurant" on "restaurant" (87.19). A sticker pops beside each lit row: house 1f3e1, hotel 1f3e8, plate 1f37d-fe0f. This is the film's only use of stickers. | The supply side. | The rows lighting → the house sticker lifts off and falls → the map. | pop −8 ×3 | on |
| 38 | 88.27–90.00 (153–156) | Put it on Vallo and welcome | **Signature 4.** The house falls onto Lagos on a model of Nigeria: 3D, deep-blue velvet like the opening art, on a round plinth, camera at 45°. A small architectural home rises from Lagos. | Reach. | The fall and the rise → the camera starts a slow orbit → the map. | impact_soft −10 at 88.77 | on |
| 39 | 90.00–92.31 (156–160) | guests from across the country. | On the peak lift, five routes arc in from Abuja, Kano, Port Harcourt, Enugu and Ibadan to the home. Their city labels are HTML placed from the scene, and each lands with a soft pop. The camera stays between 35° and 50°. | The country comes to one door. | The arcs → at 92.0 the home's pin lifts toward the camera → the pin. | pop −12 ×5 (90.0–91.2) | on |
| 40 | 92.31–95.77 (160–166) | Vallo. Real estate, done right. | The pin becomes the Vallo mark at the centre (the logo hit), and the wordmark rises. "Real estate, done right." writes in word by word on the voice (93.46, 93.72, 94.44, 94.80). The velvet hills of frame one return behind. | The name and the promise. | The mark's landing → the mark and wordmark rise to the top third → the ending. | impact_soft −4 at 92.31, sparkle −12 at 94.62 | off |
| 41 | 95.77–98.65 (166–171) | silent (music) | Two phones rise side by side (island left, Android right, both on the dark `home`) and turn gently toward each other. Above them: "Coming soon on iPhone and Android" (the pre-launch version) or "Available on the App Store and Google Play" (the live version). | The call to action. | The phones rising → hold with a slow drift → the phones. | whoosh_long −14 at 95.77 | none |
| 42 | 98.65–101.54 (171–176) | silent (music) | Live version: the official badges **appear by a cut** on bar 44 (98.65). They sit under the phones: App Store first, both black, the same height, never moved, scaled, tilted or faded. vallospaces.com is below them. Pre-launch version: vallospaces.com only. The phones keep drifting. The music tail plays to the end; no fade on the picture. | Where to get it. | The phones' drift → end on the frame. | none (music tail) | none |

## Desktop film

Same rows, same sound, same captions (at y 960). Every composition is made for 16:9. The window is the carrier and the pointer does every action. The window shows `d-*` captures at 1440 × 900 CSS px.

| # | On screen | Lead → exit → carrier (landing box) |
|---|---|---|
| 01 | **Frame one.** The velvet-hills art at native size as a tall panel on the right (x 1080–1890, y 0–1080, feathered on its left edge into navy). The three question cards cascade down the left half: x 120–760 / 300–940 / 160–800 at y 250, 470 and 690. | A slow push-in, the cards drifting → continues. |
| 02 | "Finding a place in Nigeria" on one line across the left, on a scrim (y 820–960, 104 px). "Finding a place" enters from the left, "in Nigeria" from the right. | The words' entry → they leave in opposite directions. |
| 03 | The three cards shuffle across the width like a dealer's spread, then the centre card rushes at the camera. | The rush → the card back fills the frame. |
| 04 | The Vallo mark and wordmark as a horizontal lockup at the centre, with the ring of light. | The ring widens into a round window → through it, the window. |
| 05 | The browser window rises (WINDOW_HERO). Its page changes on each word: `d-home`, `d-stays`, `d-stay`, `d-restaurants`. Each word lands big to the left of the window's top edge on a scrim, alternating in from above and below. | The page swaps → `d-welcome` → the window. |
| 06 | `d-welcome` (slide 1) in the window, which shrinks to WINDOW_LEFT. The pointer clicks the Property \| Stays pill twice (toggle). "One app." and "One account." stack in RIGHT_PANEL, entering from the right. | The two clicks → the panel words leave → the window returns to WINDOW_HERO. |
| 07 | `d-home`. The pointer glides to **Rent** and clicks on "rent"; the page becomes `d-search`. | The click → the page change. |
| 08 | Split screen. `d-search-full` scrolls in WINDOW_LEFT. The Nigeria outline draws in RIGHT_PANEL and the same five city dots light in time. | The scroll and dots → the pointer clicks "More" (filters). |
| 09 | `d-filters` in the window. The pointer clicks **Villas** on "exactly", and the button's count changes from Apply (52) to Apply (3), the same count as the mobile capture. Apply is clicked on "need". | The click and the count → the results slide in, and the Maitama villa grows into its listing. |
| 10 | `d-listing`, then a scroll to `d-listing-cost` ("What you will actually pay", with the five real lines). | The scroll → the cost table's rows start to lift. |
| 11 | **Signature 1.** Split screen: the listing slides into WINDOW_LEFT. The real cost rows peel off the captured table one by one and restack large in RIGHT_PANEL as an empty receipt. | The peel → the receipt. |
| 12 | The receipt's lines light as named, with the same figures and timing as mobile, set in two columns across RIGHT_PANEL. | Each line's light → settle. |
| 13 | The total counts to ₦26,100,000 on "right". The first card turns over beside it. Both shrink into a chat bubble. | The count → the bubble flies to the window's left edge. |
| 14 | `d-thread` (two panes: the conversation list and the thread) in WINDOW_HERO. The bubble lands in the thread. "owner", "landlord", "agent" land one at a time in the space above the window's top edge (y 20–60 is too tight), so the window drops to y 150–1000 for this row and the words sit at y 40–130. | The words → the pointer moves to the composer. |
| 15 | The member's real message types into the composer and the pointer clicks send; the bubble rises into place. | The send → the share panel. |
| 16 | `d-listing-share`. The pointer clicks "Send in a Vallo chat", and the villa card arcs across the screen into the thread. | The arc → it lands. |
| 17 | The calendar card enters RIGHT_PANEL (the window shifts to WINDOW_LEFT). The page turns to Saturday · 11:00 AM: "Inspection set" with the Example chip. | The page turn → the card docks into the inbox row. |
| 18 | `d-messages` (Property tab). The calendar docks as the unread dot, then a push to the Property \| Stays tabs. | The push → the pill. |
| 19 | **Signature 2.** The pill grows across the frame (x 360–1560, y 390–690). The knob slides to Stays on "Planning", and the world turns from navy to dusk. | The knob → the pill shrinks to the window's Stays chip. |
| 20 | `d-stays` with its panoramic hero in WINDOW_HERO on the dusk ground. The pointer passes over Hotels and Shortlets as named. On "resorts" the Lagoon Crest card rises out of the page. | The card → it turns over into a calendar. |
| 21 | The calendar in RIGHT_PANEL. The pointer clicks 16 and 19, the range fills, and "3 nights" pops out. | The chip → it drops into `d-stays-dates`. |
| 22 | `d-stays-dates` (16/10/2026 to 19/10/2026, 2 guests). The pointer clicks "Show prices". **Notification card 1 of 2:** "Room booked · Lagoon Crest Resort · 3 nights" (Example) slides in at the window's top right. | The card → it lifts off and the frame goes to night. |
| 23 | "Going out tonight?" on one line across the night skyline, 190 px, the letters as windows onto the restaurant. | The push into the O → the restaurant photo. |
| 24 | `d-restaurant` (Harbour Lights Kitchen). The pointer clicks reserve, and the "Table for 2 · Tonight, 8:00 PM" strip (Example) is written onto the restaurant card. | The strip → the card turns over into the Restaurant role card. |
| 25 | Four role cards in a row across the frame (each 400 × 560, y 220–780), landing on their words; then the verified marks stamp in beside the role words. | The marks → the Owner card turns over into the window. |
| 26 | `d-verification` in WINDOW_LEFT. Three document pages turn in RIGHT_PANEL, then "Checked by a person" (Example) with the mark. | The label → the second card. |
| 27 | The second card turns over in RIGHT_PANEL: "Checked by a real person at Vallo." | The mark spins off into the coin. |
| 28 | The coin falls onto the Pay tile of `d-home` and the pointer clicks it. | The click → the coin rises and the window drops away. |
| 29 | **Signature 3.** "Vallo never holds your money." across the top (y 120–260), words from opposite sides. The path runs left to right below it: **Your card** (x 300) → **Paystack** (x 960) → **The owner's bank** (x 1620), at y 640. The Vallo mark sits beside the path at (960, 880), below Paystack and off the line, with its empty tray. | The type → it leaves → the path. |
| 30 | The coin runs the path, left to right. The last node's label changes: Owner, Host, Business. The tray stays empty. | The run → the Paystack node. |
| 31 | "Licensed payment processor" under Paystack. The third card turns over, and the three answered cards sit in a row (CARD_SLOT desktop). | The row → the cards fly off. |
| 32 | The huge "?" at the centre shrinks into the caret of the assistant's input, as the window rises around it. | The caret → the window. |
| 33 | `d-assistant` in the window. The question types in and is sent; the screen becomes `d-assistant-caution` and the real answer is revealed as it streams. The three topic chips light in RIGHT_PANEL. | The answer → it rests. |
| 34 | The sky behind the window goes from morning to night, and stars come out. | The stars → the welcome art. |
| 35 | `d-welcome` (English) in WINDOW_HERO. | Push in on the headline. |
| 36 | The window's page changes language in place: `d-welcome-ha`, `d-welcome-yo`, `d-welcome-ig`. The language names land big in RIGHT_PANEL (the window at WINDOW_LEFT). | The swaps → `d-host-start`. |
| 37 | `d-host-start` ("Add a workspace"). The pointer passes over "I own the property", "We are a hotel" and "We are a restaurant" as named, and the three stickers pop beside them. | The house sticker falls → the map. |
| 38 | **Signature 4.** The Nigeria model, wide (16:9 framing: the plinth centred, camera at 42°). The house lands on Lagos and the home rises. | The camera orbit starts. |
| 39 | The five routes arc in, their labels placed from the scene. | The pin lifts toward the camera. |
| 40 | The mark and the horizontal wordmark lockup, then "Real estate, done right." writes in on the voice. | Lockup → it rises. |
| 41 | The browser window at vallospaces.com (`d-home`) rises at the left (x 120–1180), with the island phone beside it at the right (cx 1500, h 820). "Real estate, done right. On the web today at vallospaces.com" sits under the window. | Hold, with a drift. |
| 42 | Live version: the badges appear by a cut under the phone, App Store first, both black, the same height, never animated. Pre-launch version: "Coming soon on iPhone and Android" in their place. | End on the frame. |

## Sound

- **Whooshes:** one short, soft whoosh per real scene change and no more (rows 02, 03, 11, 19, 23, 29, 30, 32). Rows 19, 23 and 41 get the long one.
- **Small clicks, pops and ticks** only on real on-screen actions: taps, toggles, the page turns, the stamps, the counter.
- **The founder's toggles:**
  - toggle_on and toggle_off on the Property \| Stays pill (row 06);
  - the Villas tile (row 09);
  - the big switch (row 19).
- **The ending is silent in voice only.** The music's outro plays under rows 41–42 to the last frame.
- **Levels:** effects sit just above the music in their own band, under the voice; the mixer caps them.

## Honesty notes (from FACTS.md)

- Every figure on screen is in FACTS.md.
- Every illustrative card carries the Example chip:
  - "Room booked" (row 22);
  - "Inspection set" (row 17);
  - "Table for 2" (row 24);
  - "Checked by a person" (row 26);
  - "Total to move in" (row 13, as the product labels its example stock).
- "Verified" is about owners, hosts, hotels and restaurants, never a place.
- The money path never passes through Vallo.
- The assistant's words are its real answer, captured on 30 September 2026.
- The store badges are Apple's and Google's official files, unmodified. They appear only in the live version, published only once Vallo is in both stores.
- No reviews, ratings, counts or savings.
