# App Store and Google Play screenshots: the handbook

Produced on 30 September 2026: the second round, after a premium review of the first. This records what is in `docs/store/screenshots/`, how every image was made, the sizes each store takes, and which images to submit. Everything in it can be regenerated with two commands (section 8).

**The short version.** There are 35 images for each store, in store order, made to DESIGN.md section 6a (`scripts/marketing/DESIGN.md`):

- every image sits on one night ground, the headline is at the top, and the app is shown big, whole and straight on;
- the App Store images use the handset with the camera island, at 1320 x 2868, and the phone's frame is 82% of the image's width;
- the Google Play images use the Android handset with the punch hole, at 1440 x 2560, and the phone's frame is 66% of the width;
- the frame of every phone is lit so it reads as a bright line on the dark ground;
- the app's screen is laid on flat, as sharp as the capture allows;
- two images carry a card that has just arrived, and two pairs share one tilted phone across their seam;
- Play also has a 1024 x 500 feature graphic.

---

## 1. What is here

```
docs/store/screenshots/
├── app-store/              35 images, 01-...png to 35-...png, 1320 x 2868, 24-bit RGB PNG, no alpha
├── google-play/            35 images, the same names, 1440 x 2560 (9:16), 24-bit RGB PNG, no alpha, each under 8 MB
│   └── feature-graphic.png 1024 x 500, 24-bit RGB PNG, no alpha
├── app-store-overview.jpg        the 35 App Store images side by side, as the store shows them
├── google-play-overview.jpg      the same for Google Play
├── app-store-overview-grid.jpg   the 35 seven to a row, with their file names, for review
└── google-play-overview-grid.jpg
```

Each file is named `<NN>-<slug>.png` after its place in the list (section 3) and its headline, so the same number is the same image in both stores. Each store folder holds exactly these 35 (plus Play's feature graphic).

## 2. What to submit

The App Store takes up to 10 screenshots per display size; Google Play takes up to 8 per device type. The first three are what a person sees in search results before opening the listing. A pair (4 and 5, 10 and 11) goes in whole or not at all: both images, next to each other and in order, since on its own each half shows a phone cut at its edge.

- **App Store (10):** `01`, `02`, `03`, `04` + `05` (the stays pair, with "Room booked"), `07`, `08`, `12`, `17`, `18`.
- **Google Play (8):** `01`, `02`, `04` + `05`, `07`, `12`, `17`, `18`; plus `feature-graphic.png`, which Play requires.

These picks put the move-in total, the money rule ("Vallo never holds your money"), the inspection-fee rule and the host's side in the first swipe or two, and include the pair in the first swipe.

**Not yet:** leave `22` (the thread) out of any submission until the product tags listing cards shared into a chat with the Example label (section 6).

## 3. The 35

Every screen is the live product at <https://www.vallospaces.com>, in its dark theme, captured on 30 September 2026 as the QA member account (public pages signed out), and composited into a whole phone display with its status bar by `scripts/marketing/screens.mjs`. The capture ids are the files in `docs/marketing/source/` (see `capture-report.json` there).

| # | Headline | Screen (capture id) | Notes |
|---|---|---|---|
| 01 | Find your next home / in Nigeria | `home` | |
| 02 | The move-in total, / before you call | `listing-cost` | the villa's own move-in lines |
| 03 | Homes and stays, / one account | `welcome-1` | public |
| 04 | Hotels, shortlets / and resorts | `stays` | pair with 05: one phone across the seam, which passes clear of the area line and the hero's headline |
| 05 | Book a room / in a few taps | `stays` | card: "Room booked · Lagoon Crest Resort · 3 nights", Example |
| 06 | Search homes / across Nigeria | `search` | |
| 07 | See every home / up close | `listing` | |
| 08 | Ask the AI assistant / any time of day | `assistant-caution-2` | the assistant's own answer, unedited |
| 09 | Save favourites, / compare later | `saved` | |
| 10 | Find a restaurant / you love | `restaurant` | pair with 11; the seam passes 44 px clear of the restaurant's name |
| 11 | Hours, dress code / and seats, up front | `restaurant` | what the page shows: "Opens at 18:00", "Smart casual", "Seats 80" |
| 12 | Vallo never holds / your money | `support-money` | the help centre's own answer to "Does Vallo hold my money?"; header cleaned (section 6) |
| 13 | Light, water / and getting in | `listing-amenities` | the listing's own section of that name |
| 14 | Every verified mark, / checked by a person | `welcome-2` | public; "Verified means a person checked." |
| 15 | Help from / a real person | `support` | |
| 16 | Vallo speaks / your language | `welcome-yo` | public; subline "English, Hausa, Yorùbá and Igbo." |
| 17 | Vallo charges no / inspection fee | `support-inspection` | worded exactly so; the help centre's own answer; header cleaned |
| 18 | Have a property? / Put it on Vallo | `host-start` | card: "Payment settled · Straight to your bank · Lagoon Crest Resort · 3 nights", Example, no amount |
| 19 | See the stay / before you book | `stay` | Lagoon Crest Resort |
| 20 | Pick your dates, / see the price | `stays-dates` | British dates, 16/10/2026 to 19/10/2026 |
| 21 | Light or dark, / your call | `appearance` | |
| 22 | Talk to the owner / or the agent | `thread` | not for submission yet (section 2) |
| 23 | Filter by exactly / what you need | `filters-villas` | Villas selected, Apply (3) |
| 24 | Homes to buy, / not just to rent | `listing-sale` | the three bedroom terrace for sale in Karsana, ₦95,000,000 asking price (see "The order") |
| 25 | Six digits, / and you’re back in | `lock` | the passcode lock |
| 26 | Talk first. / Pay when sure. | `welcome-3` | public; the product's own words |
| 27 | Amenities and / rooms, all laid out | `stay-amenities` | broken after "and" to keep within the measure |
| 28 | Pick up where / you left off | `home-recent` | "Looked at recently"; header cleaned |
| 29 | Lock Vallo / with a passcode | `passcode` | the settings screen: "Vallo locks after 5 minutes away" |
| 30 | Your account / takes a minute | `sign-up` | public; the page's own "Your account takes a minute" |
| 31 | Every fee, / added up | `listing-cost-total` | "Total to move in ₦26,100,000" |
| 32 | Restaurants, / all in one place | `restaurants` | |
| 33 | Need a BQ? / Filter for it | `filters-detached-bq` | "Comes with a BQ" on, Apply (6) |
| 34 | Rent or buy, / in one search | `search-buy` | the search with Buy chosen |
| 35 | Vallo. Real estate, / done right. | `welcome-4` | public; the onboarding's last slide; subline "Homes, hotels, shortlets and restaurants." |

The layouts are in `scripts/marketing/store/shots/premium.mjs`.

**The order.** The first swipe shows 1, 2 and 3 and then a pair (4 and 5). No more than two screens without a photograph or artwork come in a row.

- The brief's own order would have put five screens without a photograph or artwork together (its 14 to 18), so the stretch from 13 to 21 was reordered within itself: listing-amenities 13, welcome-2 14, support 15, welcome-yo 16, support-inspection 17, host-start 18, the stay 19, stays-dates 20, appearance 21. The first swipe, the pairs, 12 and 18 keep the brief's places.
- The thread and the filters swapped (22 and 23), and so did the restaurants and the BQ filter (32 and 33), so photographs and text screens alternate at the end.
- Screens that look alike at store size sit far apart: the onboarding's two twins (03 and 16), the two filter sheets (23 and 33), the two searches (06 and 34) and the two move-in pages (02 and 31).
- **24 shows the Karsana terrace (`listing-sale`), not the Chevron Drive house (`listing-banana`) the brief named.** The example stock reuses its photographs, and the Chevron Drive house opens on the same photograph as the Maitama villa on 07, so 24 would have read as a repeat of 07. The Karsana terrace tells the same "for sale" story with its own photograph, and its price is in the facts file.

### The system (DESIGN.md section 6a)

- **One ground.** Every image sits on the same raster, a vertical gradient from `#050B3D` (the top row reads 5, 11, 61) to `#010118` (the last row reads 1, 1, 24). `compose.mjs` draws it pixel by pixel, not the browser, so it is identical in every file. Nothing else is drawn on it: no photographs, glows, textures or vignettes. On the one ground, the seams of the two pairs disappear.
- **One grid, no icon.** The headline sits at the top and is centred on its ink (a line's letters, not its type box, are centred, to the pixel). It is set in Poppins 600, tracking −0.03em, leading 1.08, white, on two lines, at the same size and on the same baselines in every image:
  - App Store: 112 px, the block from y 150, the phone from y 490 to 2768;
  - Play: 100 px, the block from y 130, the phone from y 470 to 2470.

  The cap height is 2.7% of the image's height in both stores, so the two sets read the same size in their store rows. No line is wider than the phone's frame plus 50 px: 1130 px on the App Store (the frame is 1080 px wide) and 996 px on Play (946). The widest, "checked by a person", is 1114 px and 995 px. Play's type is 100 px rather than 112 because at 112 that line and "Find your next home" would overrun its measure. `compose.mjs` fails any headline that would need shrinking to fit. Sublines appear only on 16 and 35, in Inter 500 at 62% white. The pairs set their headlines flush left, on the same baselines.
- **One phone, lit for the dark ground.**
  - Every image has the same handset, colour (black titanium) and light, from the 3D studio in `scripts/marketing/phone3d/`: the island handset on the App Store, the punch-hole handset on Play.
  - The studio's "night" light is a ring of light around the phone, a little in front of it and a little behind. Its frame's rounded front edge catches one continuous highlight on all four sides, the bottom included. Measured on the finished App Store images, it is at least 4 px wide at luminance 150 or more on every side, with peaks of 181 to 202. The Android's narrower edge takes a wider, brighter ring and reads at least 3 px wide.
  - There is no shadow, because on this ground it cannot read.
  - On the plain images the phone is straight on, at the same size and position, centred on its screen: the side buttons make the body's box lopsided, so the screen is centred rather than the box.
- **Screens laid on flat.**
  - For a straight-on phone, the capture is brought down to the display's size in one Lanczos step and laid into the display. The page is drawn twice, with the display black and with it white; the difference is exactly the part of the display that shows. This covers its rounded corners, the camera cut-out and a card drawn over it.
  - The screen then matches a direct Lanczos reduction of the capture: 0.99 of its edge energy and 0.98 of its fine detail.
  - The glass reflection is kept, at half the studio's default, and lifts the screen by about one level.
  - The two tilted phones keep the studio's own mapping of the capture.
- **Two cards, one rule.** 05 and 18 each carry one of DESIGN.md section 4's cards, opaque navy with the Example chip and no amount. The card arrives over the app's header, as a notification does:
  - It covers the bell whole on 05, and the menu and the logo whole on 18, and never sits partly on a button or a word.
  - It overhangs one edge of the phone: 70 px on the App Store (where the phone leaves about 120 px to the image's edge) and 80 px on Play.
- **Two pairs.** Each pair shares one phone, tilted by the 3D studio across its seam: 04 and 05 (the stays home, leaning right) and 10 and 11 (the restaurant, leaning left). Each phone is slid left of the seam so the seam cuts no name:
  - on the stays home it passes clear of the area line and the hero's headline, and between two words of the small line under it;
  - on the restaurant it passes 44 px clear of "Harbour Lights Kitchen".

  Across the two images the phone is whole; only the seam between them cuts it.
- **Files.** 24-bit truecolour PNG (IHDR colour type 2), no alpha, no palette.

## 4. The sizes each store takes

Checked against the stores' own pages on 29 September 2026.

**App Store** ([Screenshot specifications](https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications)):

| Display | Accepted portrait sizes | Required? |
|---|---|---|
| 6.9" | 1260 x 2736, 1290 x 2796, **1320 x 2868** | The top of the scaling chain: supply it and every smaller iPhone uses it |
| 6.5" | 1284 x 2778, 1242 x 2688 | Only if 6.9" is not supplied |
| iPad | various | Only if the app runs on iPad. Vallo is iPhone only |

One to ten screenshots per display size and language, in .png, .jpg or .jpeg, with no alpha channel. Every image here is RGB with no alpha, which `compose.mjs` checks as it writes each file.

**Google Play** ([Add preview assets](https://support.google.com/googleplay/android-developer/answer/9866151)):

| Asset | Rule |
|---|---|
| Phone screenshots | JPEG or 24-bit PNG, no alpha; each side 320 to 3,840 px; the long side at most twice the short side; up to 8 MB each. The images here are 1440 x 2560 (9:16) |
| Count | At least 2 to publish, up to 8 per device type |
| Promotion eligibility | At least 4 screenshots of at least 1080 px, 9:16 portrait or 16:9 landscape |
| Feature graphic | 1024 x 500, JPEG or 24-bit PNG, no alpha. Required |

## 5. How the set was checked

- Every image was looked at at full size, both halves.
- Both pairs were proofed side by side with a 40 px gap, as the stores show them.
- PIL checks on every file:
  - the size, mode RGB, IHDR colour type 2 at 8 bits;
  - far more than 256 colours;
  - the top row reads 5, 11, 61 and the bottom row 1, 1, 24;
  - the ground column at x 20 is identical in every image of a store;
  - every Play file is under 8 MB.
- `compose.mjs` also checked each image as it drew it:
  - every word and card is at least 40 px inside its image;
  - every headline line has at least 4.5:1 contrast;
  - no headline had to shrink.

## 6. Before you submit: things to know

- **Every listing, stay and restaurant on screen is example stock**, because that is all the platform holds today. Their own pages show the Example notice and cards show the Example tag; no image crops either out. The two cards (05, 18) carry the Example chip; their names and nights are illustrative, from DESIGN.md section 4, and neither shows an amount.
- **The QA account's home area is "Ibeju-Lekki, Lagos State"** (the founder's choice; `home`, `home-recent` and `stays` were recaptured with it on the evening of 30 September 2026, so their greeting reads "Good evening"). It shows on 01, 04, 05 and the feature graphic, and in a pill on the stays hero photograph.
- **The QA account's name is on screen:** "omojuni" on the home, stays, support and lock screens. No email address or phone number appears in any image.
- **Three headers were cleaned** (12, 17 and 28).
  - These captures were taken scrolled, and the app's translucent header let the labels scrolled under it show through as faint ghost text beside the logo.
  - `scripts/marketing/store/clean.mjs` finds the header's own parts (the status bar, the menu, the logo and the bell) on an unscrolled capture of the same header. It keeps them as captured and sets the rest of the band, where the ghost labels were, to the band's own colour. Nothing below the header's hairline is touched.
- **Listing cards shared into a chat carry no Example tag** (22). That is how the product draws a shared card today. Add the tag to the shared card in the product and recapture before submitting 22.
- **Product text that is shown but never lifted:**
  - "Kept by Vallo Examples" and "Paid to Vallo Examples" on the fee lines (02, 31): the example lister's name;
  - "Nobody can pay to be higher" (06, 34), a ranking promise that is not in the facts file, so it stays small and in place;
  - the counts "40 properties found" (06), "12 properties found" (34) and "69 stays" (20);
  - the onboarding art's "₦2,150,000" (35), labelled Example.

  None is repeated in a headline or a card.
- **The restaurant carries a "No photographs yet" chip** on its placeholder photograph (10, 33). That is the product's own label. Hiding it when a placeholder is shown, or capturing a restaurant with its own photographs, would be better.

## 7. What the captures wrote to production

Only to the QA member account, and only through the product's own screens: sign-ins (each writes a "New sign-in to Vallo" notification) and the assistant's consent and question (08). `scripts/marketing/capture/plan.mjs` lists every capture and its steps.

## 8. Regenerating

Everything lives in `scripts/marketing/`:

| File | What it does |
|---|---|
| `capture/plan.mjs`, `capture/run.mjs` | The live captures, into `docs/marketing/source/` |
| `screens.mjs` | Turns each capture into a whole phone display with its status bar, into `docs/marketing/screens/` |
| `phone3d/` | The 3D studio that draws the photoreal handsets; its `night` light is the ring used here (an option; the studio's defaults are unchanged) |
| `store/shots/premium.mjs` | The 35 images: the grid, the order, the pairs and the two cards |
| `store/clean.mjs` | Cleans the ghost labels out of the three scrolled headers |
| `store/compose.mjs` | Renders both stores: drawn at twice the size in Chromium on a transparent page, laid over the ground, brought down with a Lanczos filter, the flat screens laid in, written as 24-bit RGB PNG with no alpha. Checks every phone, word and card against the image's edges, every headline's contrast and measure |
| `store/overview.mjs` | Writes the two overview strips (`--bg` for another page colour) and, with `--grid`, the named review grids |

From the repository root, with the displays in place:

```bash
# Both stores and Play's feature graphic, at 2x (about 15 minutes on four CPUs with a warm phone cache, 25 cold).
node scripts/marketing/store/compose.mjs --feature
#   a few images, one store, or a quick proof folder that touches nothing here:
#   ... compose.mjs --only 5,18 --store app-store --proof /tmp/proof

# The overview strips and the named review grids.
node scripts/marketing/store/overview.mjs --grid
```

**To change the words:** edit the headline in `store/shots/premium.mjs` and run `compose.mjs --only <n>`. Keep to DESIGN.md section 2 (no em dashes, "verified" only about people, no promise or valuation words, no invented numbers), to two lines, and within the measure (the phone's width plus 50 px).
