# The Vallo launch films: brief and storyboard (v3.1)

v3 answers the second critique (`scratchpad/critic/storyboard-round2.md`) and brings in what the founder's reference film does well (`REFERENCES.md`), in Vallo's own form:
- chapter pills;
- type that moves as objects;
- the platform's own components floating as bodies around the device;
- a glossy pointer;
- results laid out as cards around the device;
- one night contrast beat.

It follows the founder's ruling on 3D icons: in the films they appear only as parts of real platform components, and small.

## v3.1 amendments (the third critique and the founder's "make it all clean"; these override the rows below)

**Clean first.** The founder's latest ask for everything is "clean, sharp, beautiful, premium, like a very big design team". Fewer moves, more air:
- Sparkles only at the logo (row 40) and the end card; none in the chapters.
- Rings only in rows 04, 19 and 23.
- At most one lifted body and one card beside the phone at a time.
- Whooshes only at a ground change (8.65, 79.62) or a chapter opener; none inside a chapter.

**Grounds** (`chapters.js` GROUND)
| Time | Ground | Rows |
|---|---|---|
| 0–8.65 | Night | 01–04 |
| 8.65–79.62 | Light | 05–34; rows 19–24 wear the warm wash, still light |
| 79.62–95.77 | Night: the contrast beat and the finale | 35–40 |
| 95.77–end | White end card | 41–42 |

- Row 23 is a warm dusk on the light ground: a peach-to-amber gradient, no navy, no bokeh. Row 24 uses `restaurant-light`.
- Rows 32–34 use `assistant-caution-2-lt`.
- In row 34 the phone leaves by 78.9, the ground falls to night, and the cut to the wall lands on the beat at 79.62 (not 79.4).

**Mobile boxes** (`layout.js`)
- The phone sits under the pill: PHONE_HERO is cx 540, cy 860, h 1080; PHONE_HIGH is cy 790, h 960.
- The pill is at y 290–360, on the phone's top bezel, so it covers the status bar and never a screen's heading.
- Opening big words land in WORDS (y 520–1040), before the phone rises or over a dimmed phone, never over a live screen.
- Lifted bodies go in BODY_LEFT or BODY_RIGHT. They overlap the phone's edge by 60 px at most and never cover screen text.
- Every screen y stated in the rows is superseded: compute it through the phone's real quad.
- CARD_SLOT and RECEIPT sit inside x 44–940.
- Captions are capped at x 140–940 and hidden while the same words are big (rows 14, 25, 31 and any like them).

**Captures**
- **The Maitama villa on light:** `listing-lt` / `d-listing-lt` for the listing, `listing-cost-light` for its cost section. `listing-light` / `d-listing-light` are the Karsana terrace for sale.
- **Filters:** `filters-lt` has been recaptured (the old one was an error page).
- **Dates:** `stays-dates` / `-lt` / `d-` are now signed in, reading 16/10/2026 and 19/10/2026. "69 stays" may show as captured, but is never lifted.
- **The assistant on light:** `assistant-caution-2-lt` / `d-assistant-caution-2-lt` (quoted in FACTS).
- **Welcome:** the welcome screens keep one theme, so every `welcome-*-lt` is dark. Never put them on a light ground.
- **The lock:** `lock` / `d-lock` show the real passcode lock ("Welcome back, omojuni · Enter your passcode"), as a member meets it before money moves. The product keeps it dark in both themes, like the welcome.

**Rows**
- **05:** the screen swaps on each word. No tile lighting here; row 20 owns it.
- **06:** no welcome screen, because it is dark. "One app." and "One account." land in WORDS. Then the phone shows a light screen with one real component that says two worlds, one account, for example the Property | Stays tabs of `messages-lt`, lifted as the one body.
- **07:** "Looking for" / "a **home**?" on two lines, no wider than 896 px at the real Poppins width, in WORDS before the phone rises.
- **09–10:** Apply opens the Maitama villa (`listing-lt`), then `listing-cost-light`. The on-screen total stays unreadable (below the fold or cropped) until the receipt lands it at 28.87.
- **13:** the odometer never shows a readable amount but ₦26,100,000. Each digit column spins with motion blur and stops, left to right.
- **14–18:** the pill reads "Talk straight to the **lister**". "Lister" is the product's own word ("ask the lister directly"), and the screens say "Message agent". Owner, landlord and agent stay the big words, as spoken.
- **16:** the card that flies is the Maitama villa, the one `listing-share-lt` shares. It never lands above a message already sent: end the beat on the press, with the sheet closing and the phone sliding right.
- **18–19, Signature 2:** it presses the product's real switch: `drawer-light`'s FLIP "Switch to Stays" on mobile, and the sidebar FLIP on desktop.
  - On desktop, frame the FLIP above y 1000 by raising the window or pushing in.
  - Row 18 ends on the inbox, and the drawer slides open at about 40.6.
  - The ring circles the words only.
- **21–22 become one row,** 45.58–49.04:
  - The phone is at h 760 (cx 540, cy 820), showing the date fields of `stays-dates-lt`.
  - The results sit as cards in the body boxes: the dates chip, "3 nights", "2 guests", and Lagoon Crest "₦150,000 per night".
  - "Room booked · Lagoon Crest Resort · 3 nights" (Example) stays readable for at least 1.5 s.
- **23:** a warm dusk (see Grounds). This is the third and last ring.
- **24:** `restaurant-light`. The table card flies off. It never becomes a role chip.
- **25:** the four role chips land fresh, not from the restaurant card.
- **27 and 31:** card 2's back is the same everywhere: the verified mark and "Checked by a real person at Vallo." In row 31 all three cards show their answer faces.
- **28:** the real lock (`lock`, always dark in the product) fills its dots on "pay". Not the passcode set-up. The ground stays light. Keep the dark screen inside the phone and let the dots be the one moment.
- **31:**
  - Card 3 swings in at 70.5 and turns at 70.9.
  - Cards 1 and 2 return between 71.0 and 71.3.
  - The full row holds from 71.3 to 72.4, then flies off from 72.4 to 72.69.
- **33–34:** no robot outside a component. The assistant's robot shows only where the screen shows it. "Prices", "Areas" and "How renting works" may land as plain type.
- **35:** the pill wall uses the product's own pill styling (radius, border and type as captured), in Vallo navy and electric.
- **36:** align the four welcome captures so their headlines share one y; the Igbo capture sits about 75 px higher. The in-place cuts must not jump.
- **37:** `host-start` on night.
  - The rows' 3D icons stay inside their rows, and nothing falls to the map.
  - "I am an agent" is never lit or lifted.
  - A cut on the beat goes to the map, whose own home rises.
- **38–39:**
  - Use `map3d.js`. Pass `land: 0.5` so the landing meets the impact at 88.77.
  - Cue the pops from `map.timing`.
  - Dim the canvas from 3.7 to 4.04 before the mark.
- **40:** no ring. The squiggle under "done right" stays.
- **Desktop D10–D12:** never lift the "Paid to / Kept by … Vallo Examples" column. Lift only line names and amounts.
- **Desktop scale:** a hero window is always at 1.111. A side window is the same smaller scale in D14, D16 and D26.

## Brief

- **For:** launching Vallo, a Nigerian app for homes, hotels, shortlets and restaurants, with one account.
- **Watching:**
  - Nigerians on X, Instagram, TikTok and YouTube, mostly on phones and often muted: people looking for a place, travellers, people going out;
  - owners, landlords, hosts, hotels and restaurants.
  - It is not an agents' tool.
- **At the end:** get the app (the ending) and remember vallospaces.com.
- **Two films, one voice and one soundtrack, compositions designed for each frame:**
  - **Mobile**, 1080 × 1920 at 60 fps: carried by the 3D phone (`phone3d/browser/live.js`).
  - **Desktop**, 1920 × 1080 at 60 fps: carried by the browser window at vallospaces.com, with a pointer doing every action and the camera pushing into what matters.
- **Length:** 101.54 s (44 bars at 104 BPM). The voice runs 2.31–95.24; the ending is silent (music only).
- **One clock:** `timeline.json`. `rows.py` prints and checks the rows (all on beats). Scenes anchor to `ctx.word()`, `ctx.beat()` and `ctx.bar()`.
- **Sources:**
  - brand: `../DESIGN.md`;
  - facts: `FACTS.md`, the only source for words and numbers on screen;
  - how the reference works: `REFERENCES.md`.

## The look

**Colour script.** Light and dark are separate chapters, never side by side inside one frame except at a transition.

| Rows | Ground | Captures |
|---|---|---|
| 01–04 | Night: the brand art, deep navy | none |
| 05–18 | Mist (#F3F7FF to white), electric blue accents: the product in daylight | the light-theme captures (`*-light`, `*-lt`) |
| 19–22 | Warm light: mist washed with peach (#FFB27A at 25%), after the switch | the light stays captures |
| 23–24 | Night, warm city bokeh | dark `restaurant` |
| 25–31 | Mist | light captures; the passcode in its own dark frame |
| 32–34 | Day to night across the assistant chapter | dark `assistant-caution-2` at the end |
| 35–36 | Night: the pill wall (the contrast beat), then the welcome art | dark welcome screens |
| 37–40 | Night: host, the Nigeria model, the name | dark |
| 41–42 | White end card | light home |

**Type.**
- Poppins 700 or 800 for the big words, Inter 600 for everything else, and Instrument Serif italic for one word at most per chapter.
- Big words land one at a time, at slightly different heights and sizes (±6% size, ±40 px baseline). The key word is electric blue.
- Hand-drawn squiggle underlines (SVG, drawn on) appear twice in the film: under "right there" (row 13) and "done right" (row 40).
- On light grounds the type is navy #0B1230; on dark grounds it is white.

**Chapter pills.**
- Each chapter opens with its big words. They then shrink into a pill with the Vallo mark at the top centre, which stays while the product works under it:
  - mobile: y 236–316, the width of its text plus 56 px;
  - desktop: y 36–96.
- The pill's text changes by a quick vertical roll when a new chapter starts.

**The glossy pointer (both films).**
- A 44 px electric-blue sphere with a white highlight and a soft shadow. It is our own design; the reference's pointer is green and bean-shaped.
- It glides between targets with `glide`, dips (scaleY 0.82) on the press, and opens a ring. Every press has a visible result.
- On mobile it hovers just above the phone's glass and the tap ripple shows under the glass.

**Bodies.**
- The platform's own components, lifted off the live screen and floating in depth around the device: rows, chips, pills, toasts, tiles, buttons, fields.
- Each has a soft shadow, a slight tilt, a slow bob (4–8 px over 2–3 s), and depth by scale (far is smaller and dimmer).
- They are HTML re-drawn exactly from the capture (same text, sizes and colours), or cut from the capture image.

**3D icons.** Only where they are part of a component: the home tiles, the rows of "Add a workspace", an empty state. At most about 180 px.

**Sparkles and rings.**
- Plain four-point sparkles and dots in sky blue: a few per chapter, slowly turning.
- A thin ring that draws itself with a burst of dots and dashes, on three titles only: rows 04, 19 and 23.

**Captions.**
- Burned in from the word timings, on a navy glass pill 86% opaque; the word being said is sky blue.
- Mobile: centred at y 1290 (band 1230–1360). Desktop: centred at y 960.
- Off where the same words are big on screen (the "Capt." column).

**Safe zones.**
- **Mobile:** key content inside x 44–940 and y 285–1635. Any text or UI that must be read with captions on sits in y 130–1230, or in y 130–1430 with captions off.
- **Desktop:** key content above y 900 while captions are on.

## Boxes (stage px; phones are centre and height at zero rotation)

| Name | Mobile | Desktop |
|---|---|---|
| PHONE_HERO | cx 540, cy 760, h 1300 (display x 250–831, y 129–1391; display y above 2500 falls under the captions) | cx 1460, cy 540, h 900 (beside a window) |
| PHONE_HIGH | cx 540, cy 640, h 1180 (display y 67–1213: nothing under the captions) | none |
| WINDOW_HERO | none | x 160–1760, top y 120, width 1600 (scale 1.111; the window's lower part runs off the frame, as in the reference) |
| WINDOW_LEFT | none | x 80–1100, y 150, width 1020 |
| RIGHT_PANEL | none | x 1160–1840, y 150–880 |
| PILL | x centre 540, y 236–316 | x centre 960, y 36–96 |
| CARDS_OPEN (frame one) | three cards 620 × 170: (80, 330, −5°), (380, 540, 4°), (120, 750, −3°) | three cards 600 × 160: (140, 260), (320, 480), (180, 700) |
| CARD_SLOT (row 31) | three cards 300 × 360 at y 250–610: x 60, 390, 720 | three cards 520 × 300 at y 150–450: x 150, 700, 1250 |
| RECEIPT | x 90–990, y 240–1180 | x 560–1360 at full width over the dimmed page, y 140–880 |

## Chapter pills

| Rows | Pill (blue word in **bold**) | Opens with these big words |
|---|---|---|
| 07–09 | Find a **home** | "Looking for a **home**?" |
| 10–13 | The full cost, **up front** | the receipt itself |
| 14–18 | Talk to the **owner** | "Talk to the **owner**", wrapped around the phone |
| 19–22 | Book a **room** | "Planning a **trip**?" (in the ring) |
| 23–24 | Reserve a **table** | "Going out **tonight**?" (in the ring) |
| 25–27 | Checked by a **person** | the role chips |
| 28–31 | Straight to the **owner** | "Vallo never holds your **money**." |
| 32–34 | Ask **anything** | "Got a **question**?" |
| 35–36 | Speaks your **language** | the pill wall |
| 37–39 | Put it on **Vallo** | "Have a **property**?" |

Every phrase is FACTS wording, or the product's own ("Ask anything" is the assistant's subtitle).

## Mobile film

Times come from `rows.py`. Sound gains are offsets in dB from the kit's calibrated level (0 = the kit's level); the mixer caps every effect at the voice −6 LU.

| # | Time | Voice | On screen, and the key element's y | Lead → exit → carrier (landing box) | Sound (offset) | Capt. |
|---|---|---|---|---|---|---|
| 01 | 0.00–2.31 | music | **Frame one, finished.**<br>• The velvet-hills art at native size, anchored low: the house and hotel sit at y 900–1300 and the art fills to the bottom.<br>• The night sky is above.<br>• Three glass question cards float in the sky (CARDS_OPEN): "What will it really cost?", "Who am I talking to?", "Where does my money go?".<br>• Each card settles on a beat: 0.58, 1.15 and 1.73. | Slow push (scale 1.00→1.04), the cards drifting at three depths → it continues → the cards. | none (music) | none |
| 02 | 2.31–4.04 | Finding a place in Nigeria | "Finding a place" enters from the left (y 1000) and "in Nigeria" from the right (y 1130), in Poppins 700 at 108 px, on a navy scrim band (y 950–1210, 80%). The cards dim behind. | The words' entry (`land`) → on "shouldn't" (3.94) they leave in opposite directions → the cards gather at the centre. | whoosh_short −2 at 2.31 | off |
| 03 | 4.04–6.92 | shouldn't feel like a gamble. | The three cards stack at the centre and shuffle like playing cards: riffle, fan, swap. On "gamble" (5.14) they fan like a hand. On bar 3's last beat (6.35) the middle card rushes at the camera and turns: its back is the Vallo card, electric-blue glass. | The shuffle, then the rush (`whip`) → the card back fills the frame at 6.92 → the Vallo card. | card_slide 0 ×3 (4.1, 4.5, 4.9), whoosh_long 0 at 6.35 | on |
| 04 | 6.92–8.65 | Meet Vallo. | On the blue face, the Vallo mark lands at the centre (the drop), and a thin ring draws around it with a burst of dots. The wordmark rises under it on "Vallo" (7.19). | The mark's landing (`land`) → at 8.2 the ring widens and becomes a round window onto daylight → the phone. | impact_soft 0 at 6.92, sparkle −3 at 7.3 | off |
| 05 | 8.65–11.54 | Homes, hotels, shortlets and restaurants… | Through the ring: mist, and the phone rising to PHONE_HERO. Its screen changes on each word, and each word lands big above the phone (y 290–430, 128 px, alternating sides, key word in blue):<br>• `home-light` on "Homes" (8.65);<br>• `stays-light` on "hotels" (9.21) and again on "shortlets" (10.04), with its Hotels tile lit, then its Shortlets tile lit;<br>• `restaurant-light` on "restaurants" (10.94). | The phone's slow turn (ry −6°→6°) and the swaps → at 11.54 the screen goes to `welcome-1-lt` → the phone. | swipe −3 ×4 on the swaps | off |
| 06 | 11.54–15.00 | all in one app, with one account. | The phone shows `welcome-1-lt` ("Two worlds. One platform. … with a single account"). Its Property \| Stays pill is lifted off the screen as a body, shown large beside the phone (not flipped). "One app." enters from the left and "One account." from the right (y 290–430). Key element: the lifted pill at y 520–600. | The words and the lifted pill → the pill sinks back into the screen and the phone pushes in to the home screen → the phone. | pop −4 at 12.4 (the pill lifting) | off |
| 07 | 15.00–16.73 | Looking for a home to rent or buy? | The chapter's big words "Looking for a **home**?" at y 290–420, which shrink into the pill "Find a **home**" at 16.2. The phone (PHONE_HIGH) shows `home-light`. The pointer lands on **Rent** on "rent" (15.93), and the screen slides to `search-light` (16.31). The Rent tile is at y ≈ 650. | The press → the slide → the phone turns three-quarter right (cx 620). | whoosh_short −4 at 15.0, tap 0 at 15.93, swipe −2 at 16.31 | off, then on from 16.2 |
| 08 | 16.73–18.46 | Search across Nigeria, | The phone (cx 620, h 1180, ry −14°) scrolls the results. To its left, a thin electric outline of Nigeria draws itself, and five city dots light in time: Lagos, Abuja, Kano, Port Harcourt, Ibadan. Two result cards lift off the list as bodies: the Maitama villa ("₦26.1m to move in") and the Banana Island villa ("₦36.2m to move in"). | The scroll, the dots and the lifted cards → the pointer presses the filter button (18.30) → the filter sheet rises. | tap_soft −6 ×5 on the dots, tap 0 at 18.30 | on |
| 09 | 18.46–20.77 | filter by exactly what you need, | `filters-lt` on the phone (PHONE_HIGH), "Apply (52)". Two bodies are lifted large above the phone at y 330–560: the **Villas** tile and the **Apply** button. The pointer presses Villas on "exactly" (19.49): the tile lights and the lifted button's count rolls 52 → 3. The screen becomes `filters-villas-lt`. Apply is pressed on "need" (20.46). | The press, then the count → the Apply press opens straight into the Maitama villa's listing, one of the three, with no list → the listing. | toggle_on +3 at 19.49, counter_tick −2 at 19.6, tap 0 at 20.46 | on |
| 10 | 20.77–23.08 | and see the full move-in cost before you ever make a call. | `listing-light` on the phone (PHONE_HIGH). The pill changes to "The full cost, **up front**". The screen scrolls on "move-in" (21.74) to "What you will actually pay" (`listing-cost-light`). | The push toward the cost section → the lift waits for "call" → the receipt. | swipe −2 at 21.74 | on |
| 11 | 23.08–25.38 | (…ever make a call.) | **Signature 1 opens.** On "call" (23.83) the cost section lifts off the screen toward the camera as a glass receipt (RECEIPT). Its six line slots are empty and its total is blank. The phone sinks and dims (cy 1500, opacity 0.3). | The receipt's flight (`glide`, 1.1 s) → a slow settle → the receipt. | whoosh_short 0 at 23.83, card_slide −2 at 24.0 | on until 24.24 |
| 12 | 25.38–27.69 | Rent, fees, caution deposit… | The lines print as named, each a real line from the screen (FACTS), with the amount right-aligned by x 900 and the percentage and "(refundable)" on a smaller second line:<br>• "Rent · a year ₦18,000,000" on "Rent" (25.38);<br>• "Agency fee ₦1,800,000 · 10.0%", "Legal fee ₦1,800,000 · 10.0%" and "Agreement fee ₦900,000 · 5.0%" on "fees" (26.00 / 26.19 / 26.38);<br>• "Caution deposit ₦3,600,000 · refundable" on "caution" (26.60);<br>• "Service charge: not declared", grey, on "deposit" (27.04). | Each line slides in from the right under a light sweep → the lines settle → the receipt. | counter_tick 0 on each line (6) | on |
| 13 | 27.69–30.58 | all added up, right there. | On "all added up" (27.88) the five amounts fly one by one into the total slot, each with a tick. The total then rolls like an odometer (the digits spin, unreadable) and lands on **₦26,100,000** on "right" (28.87), with "Total to move in", the Example chip and a squiggle underline drawing under "right there". On "there" (29.19) card 1, "What will it really cost?", swings in from the top right and turns over: "₦26,100,000 to move in. Seen before a single call." | The landing, then the turn → card 1 flies out to the top right (it returns in row 31), and the receipt folds into the Maitama villa card → the villa card. | counter_tick −4 ×5, success 0 at 28.87, pop 0 at 29.3 | on |
| 14 | 30.58–33.46 | Talk straight to the owner, the landlord or the agent, | The villa card flies into the phone (PHONE_HIGH) and lands exactly on the Maitama card already in the live thread (`thread-light`). The words wrap around the phone, one at a time, at y 300–430 above it, each pushing the last out: "owner" from the left (31.48), "landlord" from the right (32.09), "agent" from the left (33.03). The pill changes to "Talk to the **owner**". | The words → the phone pushes in on the thread's lower half → the phone. | card_slide 0 at 30.8, pop_low −4 ×3 | on |
| 15 | 33.46–35.19 | right inside the app. | The composer bar is lifted off the screen as a body, large at y 820–940. The member's real message, "I like these two as well. Could we view all three on Saturday morning?", types into it. The pointer presses send on "app" (34.54), and the bubble flies into its place in the thread, with its tick. | The send → the bubble settles → the share sheet. | type_key −6 ×8 (33.5–34.3), tap 0 at 34.39, bubble_send 0 at 34.54 | on |
| 16 | 35.19–36.92 | Share listings in the chat, | `listing-share-lt` rises in the phone: "Send in a Vallo chat" is lifted as a body at y 700–780 and pressed on "listings" (35.51). The Banana Island villa card flies in an arc and drops into the thread, where it already sits in the real conversation. | The card's arc (`glide`) → it lands → the phone slides right (cx 700). | tap 0 at 35.51, card_slide −2 at 35.6, bubble_send −2 at 36.1 | on |
| 17 | 36.92–38.65 | plan an inspection, | A glass calendar card (x 60–620, y 300–820) swings in over the phone's left edge. Its page turns to **Saturday · 11:00 AM**, and on "inspection" (37.17) the time stamps in with "Inspection set" and the Example chip. | The page turn → the card shrinks → it docks into the conversation row (row 18). | card_slide −2 at 36.95, stamp 0 at 37.17 | on |
| 18 | 38.65–40.96 | and keep every conversation in one place. | The phone pulls back to PHONE_HERO with `messages-lt` (Inbox: Property \| Stays, then the Vallo Examples conversation). The calendar card docks into that row as its unread dot. At 40.3 the camera pushes toward the inbox's Property \| Stays tabs (display y 1010–1045, stage y ≈ 575–590). | The pull-back and the dock → the push → the tabs. | pop −2 at 39.2 | on |
| 19 | 40.96–42.69 | Planning a trip? | **Signature 2, the switch.** The Property \| Stays tabs grow out of the phone to fill the frame (x 60–1020, y 520–880) as the phone falls away. "Planning a **trip**?" sits above it (y 250–380) in a ring that draws with a burst. On "Planning" (41.54, the lift) the highlight slides from Property to Stays, and the ground behind wipes from mist to warm peach light, following the knob. | The knob's slide (`whip`, 0.45 s) → the pill shrinks to the pill "Book a **room**" at the top → the phone rises with `stays-lt`. | whoosh_long −2 at 40.96, toggle_on +4 at 41.54 | off |
| 20 | 42.69–45.58 | Browse hotels, shortlets and resorts… | On the warm ground, `stays-lt` on the phone (PHONE_HERO). Its Hotels tile lights on "hotels" (43.00) and Shortlets on "shortlets" (43.74). Each tile, with its own 3D icon (part of the product's tile), lifts as a body beside the phone. On "resorts" (44.54) Lagoon Crest Resort's card (the photo and name, from `stay-light`) rises out of the phone as a body above it (y 330–600). | The tiles lighting in time → the resort card turns over into a calendar (45.4) → the calendar. | tap_soft −2 ×2, card_slide −2 at 44.54 | on |
| 21 | 45.58–47.31 | pick your dates… | The calendar card (October 2026, x 90–990, y 280–1000). Taps on **16** ("dates", 45.72) and **19** (46.10), the range fills with a sweep, and a "3 nights" chip pops out. | The two taps and the sweep → the "16 Oct → 19 Oct · 3 nights" chip drops toward the phone → the chip. | tap 0 ×2, pop 0 at 46.39 | on |
| 22 | 47.31–49.04 | and book a room in a few taps. | The phone (PHONE_HIGH) shows only the date fields of `stays-dates-lt`, cropped above its results so no count or other price shows; the chip lands in them. **Results as cards around the phone:**<br>• the "16 Oct → 19 Oct" chip;<br>• "3 nights";<br>• "2 guests";<br>• Lagoon Crest Resort "₦150,000 per night";<br>• **notification card 1 of 2**, "Room booked · Lagoon Crest Resort · 3 nights" (Example), which comes off the calendar chip on "taps" (47.67), not off a real button. | The cards settle around the phone, each with its own small motion → they lift away and the frame darkens → night. | chime_notify 0 at 47.67, pop −4 ×3 | on |
| 23 | 49.04–50.77 | Going out tonight? | Night: navy with warm bokeh lights drawn in code (soft circles). "Going out **tonight**?" in a ring that draws with a burst (y 560–860, 150 px). The letters are windows onto a warm restaurant photo, shown at no more than 1.3× (atmosphere only, never named). | The push through the O of "Going" from 50.2 → the frame fills with warm light → the phone. | whoosh_short −2 at 49.04, whoosh_long −4 at 50.2 | off |
| 24 | 50.77–54.23 | Find a restaurant you love and reserve your table in seconds. | The phone (PHONE_HERO) rises with `restaurant` (Harbour Lights Kitchen: Victoria Island, seafood, smart casual, seats 80, opens at 18:00). Its notice ("This is an example listing. No such property is available …") stays readable at display y ≈ 1120–1260 (stage ≈ 620–680). The pill changes to "Reserve a **table**". On "reserve your table" (51.86) a free-standing glass card arrives beside the phone: "Table for 2 · Tonight, 8:00 PM · Harbour Lights Kitchen", with the Example chip. No tap on the captured page. | The card's arrival → the phone turns away, and the card turns over into the Restaurant role chip → the chip. | pop 0 at 51.86, stamp −2 at 52.37 | on |
| 25 | 54.23–57.69 | Owners, hosts, hotels and restaurants with the verified mark | Mist. Four role chips as big bodies land on their words:<br>• **Owner** (54.23), **Host** (54.78), **Hotel** (55.41) and **Restaurant** (56.29);<br>• each is the word in Poppins 700 at 88 px on a white glass pill (440–520 × 150), stacked on staggered x at y 330 / 520 / 710 / 900.<br>On "verified mark" (57.05) the product's own verified mark stamps in beside each word, one by one. No photos, no places. The pill reads "Checked by a **person**". | The chips landing in turn, then the marks → the chips slide into a column at the left and the phone rises at the right → the phone. | pop_low −2 ×4, stamp 0 ×4 (57.05–57.5) | on |
| 26 | 57.69–60.58 | have been checked by a real person at Vallo… | The phone (cx 700, h 1180) shows `verification-lt` ("Your ID, Government issued ID"). Beside it, three plain document pages (lines only, no names, no faces) turn one by one, the way a person reads. On "person" (59.32) the verified mark lands with "Checked by a person" and the Example chip, at y 1000–1110. | The page turns → the label rises → card 2. | card_slide −4 ×3, stamp +2 at 59.32 | on |
| 27 | 60.58–62.88 | so you know who you're dealing with. | Card 2, "Who am I talking to?", swings in from the top left and turns over on "who" (61.25): the verified mark and "Checked by a real person at Vallo." | The turn → card 2 flies out to the top left (it returns in row 31), and the mark on it spins off into a naira coin → the coin. | pop 0 at 61.25 | on |
| 28 | 62.88–64.62 | And when it's time to pay… | The coin (electric-blue enamel with ₦) spins down to the phone (PHONE_HIGH), where Vallo's real passcode keypad (`passcode-create-lt`) fills its dots on "pay" (63.79), as the app asks before money moves. The dots are lifted large above the phone as a body (y 300–380). | The dots filling → the coin springs up and the phone drops out → the coin. | type_key −6 ×4 (63.2–63.7), glass_clink −4 at 63.79 | on |
| 29 | 64.62–66.35 | Vallo never holds your money. | **Signature 3.** On the lift, "Vallo never" from the left (y 300) and "holds your **money**." from the right (y 420), at 98 px, inside the safe width. Below the type, clear of it, the path draws itself top to bottom:<br>• **Your card** (y 700);<br>• **Paystack** (y 920);<br>• **The owner's bank** (y 1140).<br>The Vallo mark sits beside the path at (840, 920) with an empty tray ring. The coin drops onto "Your card". The pill reads "Straight to the **owner**". | The type's entry → the type leaves upward at 66.2 → the path. | whoosh_short −2 at 64.62 | off |
| 30 | 66.35–69.81 | Your payment goes straight to the owner, the host or the business, | The coin runs the path. It passes Paystack on "goes straight" (67.22) and lands in the bank on "owner" (68.09). The last node's label changes as named: "Owner" (68.09), "Host" (68.70), "Business" (69.39). Vallo's tray stays empty. | The coin's run (`glide`) → the path shrinks to a thin line at y 1150 → the line. | whoosh_short −4 at 67.2, ding_pay 0 at 68.09, tap_soft −6 ×2 | on |
| 31 | 69.81–72.69 | through a licensed payment processor. | "Licensed payment processor" writes in under Paystack on "licensed" (70.23). Card 3, "Where does my money go?", swings in and turns over (71.2): "Straight to the owner, through Paystack." Cards 1 and 2 fly back in from where they left (top right, top left), and the three answered cards sit in a row (CARD_SLOT, y 250–610) above the thin path line until 72.69. Cards 1 and 2 show a tick and their question; card 3 shows its answer. | The row → at 72.5 the cards fly off in three directions → a big "?". | pop 0 at 71.2, success −2 at 71.9 | on |
| 32 | 72.69–74.42 | Got a question? | Mist. A huge "?" (Poppins 800, 760 px, electric gradient) drops to the centre (y 300–1100). From 73.4 it shrinks and slides down into the caret of the assistant's input bar, lifted as a body at y 900–990, as the phone rises around it (PHONE_HIGH, `assistant-lt`). The pill reads "Ask **anything**". | The "?" becomes the caret → the phone. | pop_low −2 at 72.69, whoosh_short −4 at 73.4 | on |
| 33 | 74.42–77.31 | Ask the AI assistant about prices, areas or how renting works… | The question "What is a caution deposit?" types into the lifted input bar and is sent (75.8). The screen becomes `assistant-caution-2`, the real answer, revealed top to bottom as it streams; that capture is dark, so the frame's ground dims toward evening. Three glass topic chips light above the phone in time: "Prices" (75.27), "Areas" (76.02), "How renting works" (77.04). The product's own 3D assistant robot peeks from behind the phone's edge. It is the assistant's icon, 140 px. | The typing and send → the answer's reveal → the answer rests. | type_key −6 ×10, tap 0 at 75.8, bubble_send −2 at 75.85 | on |
| 34 | 77.31–79.62 | any time of day. | The answer rests on the steady phone. Behind it the sky goes from day to night in 2 s, stars come out, and the robot gives a small nod. | The sky's turn → at 79.4 a cut on the beat → the wall. | sparkle −4 at 79.0 | on |
| 35 | 79.62–81.92 | And Vallo speaks your language: | **The contrast beat.** Night: a wall of rounded pills in deep navies fills the frame. They hold the product's own words from the welcome screens in all four languages ("Two worlds.", "Duniya biyu.", "Ayé méjì.", "Ụwa abụọ.", "One platform.", "Dandali ɗaya.", "Pèpéle kan.", "Otu ikpo okwu."). Three pills light in electric blue and carry "Speaks your **language**", then shrink into the pill. | The wall's slow drift → on "language:" (80.93) the lit pills part and the phone rises through them with `welcome-1` (dark) → the phone. | pop −2 ×3 (79.7–80.2) | off |
| 36 | 81.92–85.38 | English, Hausa, Yorùbá and Igbo. | The phone (PHONE_HIGH) holds English for under a second. The screen then cuts in place, on the beat, to Hausa (82.54, `welcome-ha`), Yorùbá (83.25, `welcome-yo`) and Igbo (84.13, `welcome-ig`). As each language is named, its name lands in the headline slot above the phone (y 330–450), replacing the last with a vertical roll. | The in-place cuts → the phone's screen turns to "Add a workspace" → the phone. | swipe −2 ×3 | off |
| 37 | 85.38–88.27 | Have a property, a hotel or a restaurant? | Night. `host-start` on the phone (PHONE_HIGH), with the pill "Put it on **Vallo**". The rows light as named and lift off as bodies beside the phone, each with its own 3D icon (part of the row):<br>• "I own the property" (85.58);<br>• "We are a hotel" (86.34);<br>• "We are a restaurant" (87.19). | The rows lighting → the "I own the property" row's house icon lifts off and falls → the map. | pop 0 ×3 | on |
| 38 | 88.27–90.00 | Put it on Vallo and welcome | **Signature 4.** The house lands on Lagos on a model of Nigeria: 3D, deep-blue velvet like the opening art, on a round plinth, camera at 45° (`scenes/map3d.js`). A small architectural home rises from Lagos. | The landing and the rise → the camera's slow orbit → the map. | impact_soft −4 at 88.77 | on |
| 39 | 90.00–92.31 | guests from across the country. | On the peak lift, five routes arc in from Abuja, Kano, Port Harcourt, Enugu and Ibadan to the home. Their city labels are HTML placed from the scene, and each lands with a soft pop. The camera stays between 35° and 50°. | The arcs → at 92.0 the home's pin lifts toward the camera → the pin. | pop −4 ×5 (90.0–91.2) | on |
| 40 | 92.31–95.77 | Vallo. Real estate, done right. | The pin becomes the Vallo mark at the centre (the logo hit), with the ring once more, and the wordmark rises. "Real estate, done right." writes in on the voice (93.46, 93.72, 94.44, 94.80). A squiggle underline draws under "done right". The velvet hills of frame one return behind. | The landing → at 95.5 the frame whitens from the centre → the end card. | impact_soft 0 at 92.31, sparkle −2 at 94.62 | off |
| 41 | 95.77–99.23 | silent (music) | The white end card. The Vallo mark and wordmark sit above, and two phones rise (island left, Android right, both on `home-light`) with a gentle turn toward each other. Under the wordmark is one pill button: "Coming soon on iPhone and Android" (pre-launch), or "Available on the App Store and Google Play" (live). | The phones' rise → hold with a slow drift → the phones. | whoosh_long −4 at 95.77 | none |
| 42 | 99.23–101.54 | silent (music) | Live version: the official badges **appear by a cut on bar 44 (99.23)** under the phones: App Store first, both black, the same height, never moved, scaled, tilted or faded. vallospaces.com is below them. Pre-launch version: vallospaces.com only. The phones keep drifting, and the music tail plays to the end with no fade on the picture. | The drift → end on the frame. | none | none |

## Desktop film

Its own devices:
- the window at scale 1.111, running off the frame's bottom;
- the glossy pointer doing every action;
- camera pushes of 2.5× or more onto every control that acts, with its result echoed large in RIGHT_PANEL;
- the sidebar's own "FLIP · Switch to Stays" button for Signature 2;
- cost rows that lift in place at full width for Signature 1.

Same clock, sound and captions (y 960). The captures are `d-*` (dark) and `d-*-lt` / `d-*-light` (light), at 1440 × 900 CSS px.

| # | On screen (the pointer's target, the push, the echo) | Lead → exit |
|---|---|---|
| 01 | **Frame one.** The velvet art at native size as a tall panel on the right (x 1080–1890, its left edge feathered into night). The three question cards cascade down the left half, each settling on a beat. | Slow push → continues. |
| 02 | "Finding a place" (y 700) and "in Nigeria" (y 820) on two lines on the left, on a scrim, entering from opposite sides. | Leave in opposite directions → the cards gather. |
| 03 | The cards deal across the width like a dealer's spread, and the centre card rushes at the camera. | The rush → the card back. |
| 04 | The mark with the ring and burst, then the horizontal wordmark lockup. | The ring widens into a round window onto daylight → the window. |
| 05 | The window rises (WINDOW_HERO). Its page changes on each word: `d-home-light`, `d-stays-lt` (Hotels lit), `d-stays-lt` (Shortlets lit), `d-restaurant-lt`. Each word sits big over the window on a white scrim pill at y 180–300, alternating left and right. | The swaps → `d-welcome-lt` → the window. |
| 06 | `d-welcome-lt`. The camera pushes 2× onto the Property \| Stays pill, which lifts off as a body to the right, not flipped. "One app." and "One account." land beside it. | The pill sinks back → the push-out. |
| 07 | "Looking for a **home**?" becomes the pill "Find a **home**". On `d-home-light` the pointer glides to **Rent**, the camera pushes 2.5× onto it, and the click on "rent" turns the page into `d-search-lt`. | The click → the page. |
| 08 | `d-search-full-full` scrolls under the window's viewport. Two result cards lift out as bodies to the right; a Nigeria outline draws behind them with the five city dots. | The pointer clicks "More" (the filters). |
| 09 | `d-filters-lt`. The camera pushes 2.5× onto the Villas tile, which the pointer clicks on "exactly". The Apply button is echoed large in RIGHT_PANEL, and its count rolls 52 → 3 (`d-filters-villas-lt`). Apply is clicked on "need", straight into the Maitama listing. | The click → the listing. |
| 10 | `d-listing-light`, scrolling to "What you will actually pay" (`d-listing-cost-lt`, the five real lines plus "Fees to the agent ₦4,500,000 · 25.0% of a year's rent"). The pill changes. | The lift waits for "call". |
| 11 | **Signature 1.** On "call" the page dims and the cost rows lift in place, at full width, toward the camera, restacking as the receipt (RECEIPT desktop) over the dimmed page. | The lift → the receipt. |
| 12 | The lines light as named: the same figures and timing as mobile, in one wide column with the percentages beside the amounts. | Each line's light → settle. |
| 13 | The amounts fly into the total, the odometer lands on ₦26,100,000 on "right", and the underline draws. Card 1 turns over at the right edge, then flies out to the top right. The receipt folds into the villa card. | The fold → the villa card flies to the window. |
| 14 | `d-thread-lt` (two panes). The villa card lands on the thread's Maitama card. "owner", "landlord", "agent" land one at a time in RIGHT_PANEL, the window at WINDOW_LEFT. The pill changes. | The words → a push 2.5× onto the composer. |
| 15 | The composer, echoed large at the bottom of RIGHT_PANEL, types the member's real message. The pointer clicks send, and the bubble flies into the thread. | The send → the share panel. |
| 16 | `d-listing-share-lt` on the left, the thread in RIGHT_PANEL. The pointer clicks "Send in a Vallo chat", and the Banana Island card arcs from the panel into the thread, where it sits in the real conversation. | The arc → it lands. |
| 17 | The calendar card in RIGHT_PANEL turns to Saturday · 11:00 AM: "Inspection set" with the Example chip. | The page turn → it docks into the inbox row. |
| 18 | `d-messages-lt` (Property tab). The calendar docks as the unread dot, and the camera pushes toward the sidebar's "FLIP · Switch to Stays". | The push → the button. |
| 19 | **Signature 2, the desktop switch.** "Planning a **trip**?" in the ring above the window. The pointer clicks the sidebar's real "Switch to Stays" button on "Planning" (41.54). The whole window turns over like a card (rotationY 180°), and its back is `d-stays-lt`. The ground wipes from mist to warm light as it turns. | The turn → the pill "Book a **room**". |
| 20 | `d-stays-lt` on the warm ground. The pointer passes over Hotels and Shortlets as named, and each tile lifts as a body with its own 3D icon. On "resorts" the Lagoon Crest card (`d-stay-lt`) rises out of the page. | The card → it turns over into a calendar. |
| 21 | The calendar in RIGHT_PANEL. The pointer clicks 16 and 19, the range fills, and "3 nights" pops out. | The chip → it drops toward the window. |
| 22 | `d-stays-dates-lt`, cropped to its date fields, with no results row. The chip lands. The results as cards around the window: the dates, "3 nights", "2 guests", Lagoon Crest "₦150,000 per night", and "Room booked · Lagoon Crest Resort · 3 nights" (Example) coming off the calendar chip. | The cards lift away → night. |
| 23 | "Going out **tonight**?" on one line across the night bokeh (170 px) in the ring, the letters as windows. | The push through the O → warm light. |
| 24 | `d-restaurant` (dark), with its notice readable. The pill changes. The free-standing "Table for 2 · Tonight, 8:00 PM · Harbour Lights Kitchen" card (Example) arrives in RIGHT_PANEL on "reserve". | The card turns over into the Restaurant chip. |
| 25 | The four role chips land across the frame in a staggered row (y 300–700), with the marks stamping on "verified mark". | The chips slide into a column at the left. |
| 26 | `d-verification-lt` in WINDOW_LEFT. The three pages turn in RIGHT_PANEL, then "Checked by a person" (Example) with the mark. | The label → card 2. |
| 27 | Card 2 turns over in RIGHT_PANEL, then flies out. The mark spins off into the coin. | The coin. |
| 28 | The coin falls to the window, where the passcode (`d-passcode-create-lt`) fills its dots on "pay". The dots are echoed large in RIGHT_PANEL. | The coin springs up. |
| 29 | **Signature 3.** "Vallo never holds your **money**." across the top (y 110–250), the words from opposite sides. The path runs left to right below it: **Your card** (x 300) → **Paystack** (x 960) → **The owner's bank** (x 1620), at y 560. The Vallo mark sits off the line below Paystack at (960, 760), with its empty tray. | The type leaves → the path. |
| 30 | The coin runs left to right. The last node's label changes: Owner, Host, Business. The tray stays empty. | The path thins to a line at y 800. |
| 31 | "Licensed payment processor" under Paystack. Card 3 turns over, and cards 1 and 2 fly back in: the three answered cards in a row (CARD_SLOT desktop) above the line until 72.69. | The cards fly off. |
| 32 | The huge "?" shrinks into the caret of the assistant's input, as the window rises around it (`d-assistant-lt`). | The caret → the window. |
| 33 | The question types in, echoed large in RIGHT_PANEL, and is sent. The screen becomes `d-assistant-caution-2` (the real answer), revealed top to bottom as the frame dims toward evening. The robot peeks. The three topic chips light. | The answer rests. |
| 34 | The sky behind the window goes from day to night. | A cut on the beat → the wall. |
| 35 | The pill wall across the 16:9 frame, with three pills lighting into "Speaks your **language**". | The pills part and the window rises with `d-welcome` (dark). |
| 36 | `d-welcome` cuts in place to `d-welcome-ha`, `d-welcome-yo` and `d-welcome-ig`. The language names land in RIGHT_PANEL. | → `d-host-start`. |
| 37 | `d-host-start` (dark). The pointer passes over "I own the property", "We are a hotel" and "We are a restaurant" as named, and each row lifts as a body with its own icon. | The house icon falls → the map. |
| 38 | **Signature 4.** The Nigeria model wide, centred in 16:9, the camera at 42°. The house lands on Lagos and the home rises. | The orbit starts. |
| 39 | The five routes arc in, with their labels. | The pin lifts toward the camera. |
| 40 | The mark, the horizontal wordmark lockup, and "Real estate, done right." with its underline. | The frame whitens → the end card. |
| 41 | The white end card: the browser window at vallospaces.com (`d-home-light`) rises at the left (x 120–1180), with the island phone beside it at the right (cx 1500, h 820). Under them, the pill "Coming soon on iPhone and Android" or the live line, and "vallospaces.com". | Hold with a drift. |
| 42 | Live version: the badges appear by a cut on bar 44 (99.23), App Store first, both black, the same height, never animated. Pre-launch version: no badges. | End on the frame. |

## Sound

- **Whooshes:** one soft whoosh per real scene change: rows 02, 03 (the long one), 07, 11, 19 (the long one), 23 (a short, then a long on the push), 29, 30 and 32, and 41 (the long one).
- **Small sounds** only on real on-screen actions: taps, the Villas toggle, the page turns, the stamps, the ticks, typing, the passcode dots.
- **The founder's toggles:** toggle_on on the Villas tile (row 09) and the big switch (row 19).
- **The ending is silent in voice only.** The music's outro plays under rows 41–42 to the last frame.

## Honesty notes (FACTS.md)

- Every figure on screen is in FACTS.md or is one of its named captures, unedited.
- The Example chip is on "Total to move in", "Inspection set", "Room booked", "Table for 2" and "Checked by a person".
- "Verified" is about owners, hosts, hotels and restaurants, never a place.
- No listing photo carries a mark.
- The money path never passes through Vallo.
- The brand photographs appear only as atmosphere and are never named as a place (their provenance isn't recorded in the repo).
- The restaurant and stay pages keep their notices readable; no "booked" or "reserved" result sits on a page that says it can't be.
- The assistant's words are its real answer (FACTS.md). The filter count is real (Apply 52 → 3).
- The store badges are the official files, unmodified, cut in by Apple's rules, and published only once Vallo is live in both stores.
