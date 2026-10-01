# App Store and Google Play screenshots: the handbook

Produced on 30 September 2026: the fifth round, after four premium reviews. This records what is in `docs/store/screenshots/`, how every image was made, the sizes each store takes, and which images to submit. Everything in it can be regenerated with two commands (section 8).

**The short version.** There are 35 images for each store, in store order, made to DESIGN.md section 6a (`scripts/marketing/DESIGN.md`):

- every image sits on one night ground, the headline is at the top, and the app is shown big, whole and straight on;
- the App Store images use the handset with the camera island, at 1320 x 2868, and the phone's frame is 82% of the image's width;
- the Google Play images use the Android handset with the punch hole, at 1440 x 2560, and the phone's frame is 66% of the width;
- the frame of every phone is lit so it reads as a bright line on the dark ground;
- the app's screen is laid on flat, as sharp as the capture allows;
- two images carry a card that has just arrived, and one pair (04 and 05) shares one tilted phone across its seam;
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

The App Store takes up to 10 screenshots per display size; Google Play takes up to 8 per device type. The first three are what a person sees in search results before opening the listing. The pair (04 and 05) goes in whole or not at all: both images, next to each other and in order, since on its own each half shows a phone cut at its edge.

- **App Store (10), in this upload order:** `01`, `02`, `03`, `04` + `05` (the pair, with "Room booked"), `06`, `07`, `08`, `12`, `13`.
- **Google Play (8):** `01`, `02`, `04` + `05`, `06`, `07`, `12`, `13`; plus `feature-graphic.png`, which Play requires.

The picks are the store order's first eight or ten, plus 12 and 13. They cover homes and the move-in total, one account, stays and booking, the money rule, a stay's own page, the assistant, the verified mark, and hosts with their payout.

- They never hold two screens that look alike. 06 ("Vallo never holds your money") and 25 ("Vallo charges no inspection fee") are the same help-centre page with a different answer open, so only one goes in.
- To show the inspection fee instead of the money rule, swap `06` for `25`.
- The critic's round-2 proposal put both in, at the old 12 and 17. It is adjusted here so twins are never both picked.

## 3. The 35

Every screen is the live product at <https://www.vallospaces.com>, in its dark theme, captured on 30 September 2026 as the QA member account (public pages signed out), and composited into a whole phone display with its status bar by `scripts/marketing/screens.mjs`. The capture ids are the files in `docs/marketing/source/` (see `capture-report.json` there).

| # | Headline | Screen (capture id) | Notes |
|---|---|---|---|
| 01 | Find your next home / in Nigeria | `home` | |
| 02 | The move-in total, / before you call | `listing` | the villa, its Example notice and "Move-in total ₦26,100,000"; no lister name in view |
| 03 | Homes and stays, / one account | `welcome-1` | public |
| 04 | Hotels, shortlets / and resorts | `stays` | the pair's left half; card "Room booked · Lagoon Crest Resort · 3 nights", Example |
| 05 | Book a room / in a few taps | `stays` | the pair's right half |
| 06 | Vallo never holds / your money | `support-money` | the help centre's own answer; header cleaned (section 6) |
| 07 | See the stay / before you book | `stay` | Lagoon Crest Resort |
| 08 | Ask the AI assistant / any time of day | `assistant-caution-2` | the assistant's own answer, unedited |
| 09 | Save favourites, / compare later | `saved` | recaptured; opens on the Chevron Drive house ("4 places saved"), whose photograph is the same stock living room as the Maitama villa on 02: the example stock's own repeat |
| 10 | Find a restaurant / you love | `restaurant` | |
| 11 | Every fee, / added up | `listing-cost` | the fee lines; not for submission until the lister is renamed (section 6) |
| 12 | Each verified mark, / checked by a person | `welcome-2` | public; "Verified means a person checked." |
| 13 | Have a property? / Put it on Vallo | `host-start` | card "Payment settled · Straight to your bank", Example, no amount |
| 14 | Search homes / across Nigeria | `search-villas` | the Map button sits over photographs, not over an Example chip |
| 15 | Six digits, / and you’re back in | `lock` | the passcode lock |
| 16 | Vallo speaks / your language | `welcome-yo` | public; subline "English, Hausa, Yorùbá and Igbo." |
| 17 | Power, water / and the gate | `listing-amenities` | recaptured; opens on the section "Light, water and getting in", with Light, Water and The gate |
| 18 | Pick your dates, / see the price | `stays-dates` | British dates, 16/10/2026 to 19/10/2026 |
| 19 | Homes to buy, / not just to rent | `listing-sale` | the Karsana terrace, ₦95,000,000 asking price |
| 20 | Real help, / from real people | `support` | |
| 21 | Inspect first, / then pay on Vallo | `welcome-3` | public; the screen's own claim ("book an inspection first. When you pay, pay on Vallo"), not its headline |
| 22 | Filter down / to what you need | `filters-villas` | Villas selected, Apply (3) |
| 23 | Light or dark, / your call | `appearance` | recaptured; the Theme label and the whole switch sit under the header; the "Appearance" title behind the header is cleaned out |
| 24 | Rooms, amenities, / all laid out | `stay-amenities` | recaptured; opens on the Amenities heading; the outline of the card above is blended out, column by column |
| 25 | Vallo charges no / inspection fee | `support-inspection` | worded exactly so; header cleaned; 06's twin, 19 places apart |
| 26 | Earn the / verified mark | `verification` | step 1 of 5, the ID upload; "verified" about a person |
| 27 | Back where / you left off | `home-recent` | recaptured; opens on "Looked at recently"; header cleaned |
| 28 | Ask about prices, / areas or renting | `assistant` | the assistant's start screen and its suggestion chips; 08's twin, 20 places apart |
| 29 | Restaurants, / all in one place | `restaurants` | shares a photograph with 10, 19 places apart |
| 30 | Lock Vallo / with a passcode | `passcode` | the settings screen; 15's twin, 15 places apart |
| 31 | Need a BQ? / Filter for it | `filters-detached-bq` | "Comes with a BQ" on, Apply (6); 22's twin, 9 places apart |
| 32 | One account / for all of Vallo | `sign-up` | public |
| 33 | The agent’s fees, / spelled out | `listing-cost-total` | "Fees to the agent: ₦4,500,000, 25.0% of a year's rent"; 11's twin; not for submission until the rename |
| 34 | Browse stays / before you sign up | `stays-dates-gb` | public (Sign in and Sign up in its header); 18's twin, 16 places apart |
| 35 | Vallo. Real estate, / done right. | `welcome-4` | public; subline "Homes, hotels, shortlets and restaurants." |

The layouts are in `scripts/marketing/store/shots/premium.mjs`.

**The order.** The first swipe shows 1, 2 and 3 and then the pair (4 and 5). No more than two screens without a photograph or artwork come in a row. Screens that look alike at store size sit at least nine places apart, and never both in the picks:

- 06 and 25 (help centre);
- 08 and 28 (assistant);
- 11 and 33 (fee lines);
- 15 and 30 (passcode);
- 18 and 34 (stay dates);
- 22 and 31 (filter sheet);
- 10 and 29 (a shared photograph).

The Maitama living-room photograph, which the example stock reuses for several listings, leads 02. It also leads 09 (the Chevron Drive house uses the same stock photograph) and 14's first card, and appears twice on 27. That is the example stock's own repeat.

**Changes from round 2:**

- **The restaurant pair is gone.** A search over 450 poses of `restaurant` and `restaurants` found none whose seam crosses no word, so 10 is a plain image and 11 is a different screen.
- **The thread (round 2's 22) is cut.** Its shared listing cards carry no Example tag.
- **02 now shows `listing`**, so position 2 no longer reads "Kept by / Paid to Vallo Examples".
- **Search is `search-villas`**, whose Map button hides no Example chip. `search-buy` is cut.
- **Headlines rewritten:**
  - "Each verified mark" and "Back where you left off", for line spacing;
  - "Rooms, amenities, / all laid out", so line 1 no longer ends on "and";
  - "Inspect first, then pay on Vallo" and "One account for all of Vallo", so they no longer repeat the screen's own words;
  - "Real help, from real people", for line spacing on Play;
  - in round 4, "Power, water / and the gate" (17) and "Filter down / to what you need" (22), for line spacing and so 17 no longer copies its section's title.

### The system (DESIGN.md section 6a)

- **One ground.** Every image sits on the same raster, a vertical gradient from `#050B3D` (the top row reads 5, 11, 61) to `#010118` (the last row reads 1, 1, 24). `compose.mjs` draws it pixel by pixel, not the browser, so it is identical in every file. Nothing else is drawn on it: no photographs, glows, textures or vignettes. On the one ground, the pair's seam disappears.
- **One grid, no icon.** The headline sits at the top and is centred on its ink (a line's letters, not its type box, are centred, to the pixel). It is set in Poppins 600, tracking −0.03em, leading 1.08, white, on two lines, at the same size and on the same baselines in every image:
  - App Store: 112 px, the block from y 140, the phone from y 490 to 2768;
  - Play: 100 px, the block from y 130, the phone from y 470 to 2470.

  The cap height is 2.7% of the image's height in both stores, so the two sets read the same size in their store rows. No line is wider than the phone's frame plus 50 px: 1130 px on the App Store (the frame is 1080 px wide) and 996 px on Play (946). The widest, "checked by a person", is 1114 px and 995 px. Play's type is 100 px rather than 112 because at 112 that line and "Find your next home" would overrun its measure. `compose.mjs` fails any headline that would need shrinking to fit. Sublines appear only on 16 and 35, in Inter 500 at 60% white (30 px on the App Store, 34 on Play), at least 60 px above the phone's rim. The pair sets its headlines flush left, on the same baselines.
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
- **Two cards, one rule.** 04 and 13 each carry one of DESIGN.md section 4's cards: opaque navy, the Example chip, no amount, two lines, 1.3 times round 2's size (a 45 px title), so they read at store size.
  - Each overhangs the phone's left edge (50 px on the App Store, 80 on Play past the rim beside the header). It keeps at least 64 px from the image edge and at least 20 px from the camera and from every control it leaves uncovered. `compose.mjs` fails any card that breaks that.
  - Its shadow is limited, so the ground next to every image edge stays pixel-identical.
  - On 13 the card sits 25 px under the camera and at least 20 px under the status bar's clock and icons: y 659 on the App Store (under the island), y 596 on Play (24 px under the clock, since the punch hole is level with it). It covers the menu and the logo whole and stays clear of the bell and the back button.
  - On 04 the card lies over the tilted phone's rim. Its right edge sits 24 px from the menu button. Where its rounded top corner meets the rim (the corner at 45 degrees), it overlaps the rim by 19 px on the App Store and 20 px on Play. It sits 24 px below the header's middle, where the rim runs further left, so both hold.
- **One pair.** 04 and 05 share one phone, tilted by the 3D studio across their seam (the stays home, leaning right). The phone slides left until the seam crosses no word: it passes clear of the area line and the hero's headline, and between two words of the small line under it. Across the two images the phone is whole; only the seam between them cuts it.
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
- The pair was proofed side by side with a 40 px gap, as the stores show them.
- PIL checks on every file:
  - the size, mode RGB, IHDR colour type 2 at 8 bits;
  - far more than 256 colours;
  - the top row reads 5, 11, 61 and the bottom row 1, 1, 24;
  - the whole top and bottom rows, and eight points on the corners and mid-edges, are identical in every image of a store (the pair's seam sides excepted);
  - every Play file is under 8 MB.
- `compose.mjs` also checked each image as it drew it:
  - every word and card is at least 40 px inside its image;
  - every headline line has at least 4.5:1 contrast;
  - no headline had to shrink;
  - every card keeps 20 px from the camera and from the controls it leaves uncovered;
  - the space between a headline's two lines, measured column by column, is at least 16 px (App Store) or 14 px (Play).

## 6. Before you submit: things to know

- **Every listing, stay and restaurant on screen is example stock**, because that is all the platform holds today. Their own pages show the Example notice and cards show the Example tag; no image crops either out. The two cards (04, 13) carry the Example chip; their names and nights are illustrative, from DESIGN.md section 4, and neither shows an amount.
- **The QA account's home area is "Ibeju-Lekki, Lagos State"** (the founder's choice). It shows on 01, 04 and the feature graphic, and in a pill on the home and stays hero photographs.
- **The QA account's first name, "omojuni", is on screen** on the home greetings (01, 04) and on 20 ("Hi omojuni") and 15 ("Welcome back, omojuni"). No email address or phone number appears in any image.
- **Four headers were cleaned (06, 23, 25 and 27), and one capture patched (24):** the outline of the card above, under the status bar, is blended out column by column between the clean rows above and below it. `clean.mjs` holds the patch.
  - These captures were taken scrolled, and the app's translucent header let what scrolled under it show through as faint ghost text.
  - `scripts/marketing/store/clean.mjs` finds the header's own parts (the status bar, the menu, the logo and the bell) on an unscrolled capture of the same header. It keeps them as captured and sets the rest of the band to the band's own colour. Nothing below the header's hairline is touched.
- **Product text that is shown but never lifted:**
  - "Kept by / Paid to Vallo Examples" on the fee lines (11, 33): the example lister's name;
  - "Nobody can pay to be higher" (14), a ranking promise that is not in the facts file;
  - "within 1 day, and within 4 hours" (20);
  - "5 minutes away" (30);
  - the counts "52 properties found" (14) and "69 stays" (18, 34);
  - the onboarding art's "₦450,000" (21) and "₦2,150,000" (35), both labelled Example.

  None is repeated in a headline or a card.
- **Four product fixes, for a later recapture.** None blocks this set:
  1. An Example tag on listing cards shared into a chat. The thread can then return, under "Talk to the owner / or the agent".
  2. Rename the example lister from "Vallo Examples" to "Example Lettings". 11 and 33 can then be submitted, and "Kept by / Paid to Vallo" no longer reads as Vallo taking fees.
  3. No "No photographs yet" chip printed on a photograph (10, 29). Show placeholder art with the chip, or relabel it "Illustrative photo".
  4. Translate the onboarding buttons. The Yorùbá slide on 16 still says "Continue".

## 7. What the captures wrote to production

Only to the QA member account, and only through the product's own screens: sign-ins (each writes a "New sign-in to Vallo" notification) and the assistant's consent and question (08, 28). `scripts/marketing/capture/plan.mjs` lists every capture and its steps.

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
