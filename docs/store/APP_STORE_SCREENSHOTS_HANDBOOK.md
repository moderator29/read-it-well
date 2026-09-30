# App Store and Google Play screenshots: the handbook

Produced on 30 September 2026. This records what is in `docs/store/screenshots/`, how every image was made, the sizes each store takes, and which images to submit. Everything in it can be regenerated with two commands (section 7).

**The short version.** There are 35 images for each store, in store order, made to DESIGN.md section 6a (`scripts/marketing/DESIGN.md`), the founder's ruling of 30 September 2026: every image on one night ground, a small line icon and the headline at the top, and the app, big, whole and straight on. The App Store images use the handset with the camera island at 1320 x 2868; the Google Play images use the Android handset with the punch hole at 1440 x 2560. Two images carry a card that has just arrived, and two pairs share one tilted phone across their seam. Play also has a 1024 x 500 feature graphic.

---

## 1. What is here

```
docs/store/screenshots/
├── app-store/              35 images, 01-...png to 35-...png, 1320 x 2868, RGB PNG, no alpha
├── google-play/            35 images, the same names, 1440 x 2560 (9:16), RGB PNG, no alpha, each under 8 MB
│   └── feature-graphic.png 1024 x 500, RGB PNG, no alpha
├── app-store-overview.jpg        the 35 App Store images side by side, as the store shows them
├── google-play-overview.jpg      the same for Google Play
├── app-store-overview-grid.jpg   the 35 seven to a row, with their file names, for review
└── google-play-overview-grid.jpg
```

Each file is named `<NN>-<slug>.png` after its place in the list (section 3), so the same number is the same image in both stores.

## 2. What to submit

The App Store takes up to 10 screenshots per display size; Google Play takes up to 8 per device type. The list is in store order, and the first three are what a person sees in search results before opening the listing, so the simplest submission is the first 10 (Apple) and the first 8 (Google), in order. If a pair is included, include both of its images, next to each other and in order.

A second choice, keeping one image per part of the product:

- **App Store (10):** `01`, `02`, `03`, `10` + `11` (the stays pair, with "Room booked"), `08`, `17`, `20`, `30`, `35`.
- **Google Play (8):** `01`, `02`, `03`, `10` + `11`, `08`, `20`, `30`; plus `feature-graphic.png`, which Play requires.

## 3. The 35

Every screen is the live product at <https://www.vallospaces.com>, in its dark theme, captured on 30 September 2026 as the QA member account (public pages signed out), and composited into a whole phone display with its status bar by `scripts/marketing/screens.mjs`. The capture ids are the files in `docs/marketing/source/` (see `capture-report.json` there).

| # | Headline | Line icon | Screen (capture id) | Notes |
|---|---|---|---|---|
| 01 | Find your next home in Nigeria | house | `home` | |
| 02 | Homes and stays, one account | circle-user-round | `welcome-1` | public |
| 03 | The full move-in cost, before you call | receipt-text | `listing-cost` | the villa's own move-in lines |
| 04 | Search homes across Nigeria | search | `search` | |
| 05 | Filter by exactly what you need | sliders-horizontal | `filters-villas` | Villas selected, Apply (3) |
| 06 | See every home up close | zoom-in | `listing` | |
| 07 | Share a home in one tap | share-2 | `listing-share` | |
| 08 | Talk straight to the owner | message-circle | `thread` | |
| 09 | Every conversation in one place | inbox | `messages` | |
| 10 | Hotels, shortlets and resorts | hotel | `stays` | pair with 11: one phone across the seam |
| 11 | Book a room in a few taps | bed-double | `stays` | card: "Room booked · Lagoon Crest Resort · 3 nights", Example |
| 12 | Pick your dates, see what's free | calendar-days | `stays-dates` | British dates |
| 13 | Find a restaurant you love | utensils | `restaurant` | pair with 14: one phone across the seam |
| 14 | Reserve your table in seconds | calendar-check | `restaurant` | |
| 15 | What's happening around you | megaphone | `around` | |
| 16 | Know the moment anything changes | bell | `notifications` | |
| 17 | Ask the AI assistant, any time of day | sparkles | `assistant-caution-2` | |
| 18 | Save favourites, compare later | heart | `saved` | |
| 19 | Everything, one tap away | layout-grid | `drawer` | |
| 20 | Vallo never holds your money | landmark | `payments` | |
| 21 | Cards and banks, in one place | credit-card | `payment-methods` | |
| 22 | A real person checks every verified mark | badge-check | `verification` | about people and businesses, never a listing |
| 23 | Lock Vallo with a passcode | lock-keyhole | `passcode-create` | step 1 of 2; nothing saved |
| 24 | Help from a real person | headset | `support` | |
| 25 | See what places nearby are asking | map-pin | `price` | |
| 26 | All your plans in one place | calendar-range | `plans` | |
| 27 | Run your listings from one workspace | layout-dashboard | `agent-dashboard` | |
| 28 | List your property on Vallo | house-plus | `agent-properties` | |
| 29 | Host your hotel or shortlet | key-round | `host-start` | |
| 30 | Your share goes straight to your bank | banknote | `host-bookings` | card: "Payment settled · Straight to your bank · ₦1,800,000", Example |
| 31 | Welcome back, sign in in seconds | log-in | `sign-in` | public |
| 32 | Vallo speaks your language | languages | `welcome-yo` | public; subline "English, Hausa, Yorùbá and Igbo." |
| 33 | Light or dark, your call | sun-moon | `appearance` | |
| 34 | Listings that speak for themselves | image | `listing-sale` | |
| 35 | Vallo. Real estate, done right. | the app icon | `home-recent` | subline "Coming soon on iPhone and Android." |

The layouts are in `scripts/marketing/store/shots/premium.mjs`.

### The system (DESIGN.md section 6a)

- **One backing.** Every image of a store sits on the same ground, a vertical gradient from `#050B3D` to `#010118`, identical pixel for pixel. Nothing else is drawn on it: no photographs, glows, textures or vignettes. On the one ground the set reads as one strip, and the seams of the two pairs disappear.
- **One grid.** A lucide line icon (64 px on the App Store images, 70 on Play; sky `#8FD3FF`; 3 px of stroke), then the headline, centred, in Poppins 600 at 112 px (122 on Play), tracking −0.03em, line height 1.05, white, two lines, on the same baseline and at the same size in every image: `compose.mjs` fails any headline that would need shrinking to fit. Four headlines from the brief were tightened for that reason (15, 21, 22 and the line break of 35). Sublines only on 32 and 35, in Inter 500 at 60% white.
- **One phone.** The same handset, colour (black titanium), light and contact shadow in every image, from the 3D studio in `scripts/marketing/phone3d/`: the island handset on the App Store images, the punch-hole handset on Play. On the plain images it is straight on, at the same scale and position, centred on its screen (optical centring: the side buttons make the body's box lopsided).
- **Extras on two images only.** 11 and 30 each carry one of DESIGN.md section 4's cards, opaque navy glass with the Example chip, placed over the header or clear screen, never over rows of text.
- **Two pairs.** 10 and 11 share one phone tilted by the 3D studio across their seam (the stays home); 13 and 14 share another, tilted the other way (the restaurant). Each keeps its own icon and headline, set left on the same baseline, so the words run on across the seam. Across the two images the phone is whole; only the seam between them cuts it.

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

## 5. Before you submit: things to know

- **Every listing, stay and restaurant on screen is example stock**, because that is all the platform holds today. Their own pages show the Example notice and cards show the Example tag; no image crops either out. The two cards (11, 30) carry the Example chip; their amounts and names are illustrative, from DESIGN.md section 4.
- **30 shows the host's bookings page, not the earnings page.** The earnings page reads ₦0.00 ("No guest has paid yet"), which would contradict a "Payment settled · ₦1,800,000" card beside it. The bookings page says, in the product's own words, that "your share goes straight to your default bank account", and shows no amount of its own.
- **Listing cards shared into a chat carry no Example tag** (08). That is how the product draws a shared card today. Either add the tag to the shared card in the product and recapture, or leave 08 out of a submission until then.
- **Counts on screen are the product's own:** "40 properties found" (04) and "69 stays" (12) are what the live pages show over the example stock. Neither is repeated in a headline or card.
- **The QA account's name is on screen:** "omojuni" on the home, stays and support screens, and the handle "@omojuni_phantom" in the menu (19). No email address or phone number appears in any image.
- **The agent and host screens (27 to 30) are what a member sees before approval**: the pitch and the empty workspaces. There is no agent or host QA account, and none was created.
- **Price Check (25) shows the question, not an answer.** With only example listings it declines to give a figure, as it should.

## 6. What the captures wrote to production

Only to the QA member account, and only through the product's own screens: sign-ins (each writes a "New sign-in to Vallo" notification, visible in 16), the assistant's consent and questions (17), and the first step of "Change passcode" (23), which saves nothing. `scripts/marketing/capture/plan.mjs` lists every capture and its steps.

## 7. Regenerating

Everything lives in `scripts/marketing/`:

| File | What it does |
|---|---|
| `capture/plan.mjs`, `capture/run.mjs` | The live captures, into `docs/marketing/source/` |
| `screens.mjs` | Turns each capture into a whole phone display with its status bar, into `docs/marketing/screens/` |
| `phone3d/` | The 3D studio that draws the photoreal handsets |
| `store/shots/premium.mjs` | The 35 images: the system, the pairs and the two cards |
| `store/compose.mjs` | Renders both stores: drawn at twice the size in Chromium, brought down with a Lanczos filter, written as RGB PNG with no alpha. Checks every phone, word and card against the image's edges and every headline's contrast |
| `store/overview.mjs` | Writes the two overview strips, and with `--grid` the named review grids |

From the repository root, with the displays in place:

```bash
# Both stores and Play's feature graphic, at 2x (about 25 minutes on four CPUs).
node scripts/marketing/store/compose.mjs --feature
#   a few images, one store, or a quick proof folder that touches nothing here:
#   ... compose.mjs --only 10,30 --store app-store --res 1 --proof /tmp/proof

# The overview strips and the named review grids.
node scripts/marketing/store/overview.mjs --grid
```

**To change the words:** edit the headline in `store/shots/premium.mjs` and run `compose.mjs --only <n>`. Keep to DESIGN.md section 2 (no em dashes, "verified" only about people, no promise or valuation words, no invented numbers) and to two lines.
