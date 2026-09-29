# App Store and Google Play screenshots: the handbook

Produced on 29 September 2026. This records what is in `docs/store/screenshots/`, how every image was made, the sizes each store takes, and which images to submit. Everything in it can be regenerated with three commands (section 7).

**The short version.** There is a pool of 33 images for each store, 30 in the dark theme and 3 in the light, every one showing the live product inside a whole phone. The App Store images use a phone with a camera island at 1320 x 2868. The Google Play images use an Android phone at 1080 x 1920, and there is a 1024 x 500 feature graphic. Section 2 names the ten to submit to Apple and the eight to submit to Google.

---

## 1. What is here

```
docs/store/screenshots/
├── app-store/iphone-6.9/dark/     30 images, 1320 x 2868, PNG, no alpha
├── app-store/iphone-6.9/light/     3 images, 1320 x 2868, PNG, no alpha
├── google-play/phone/dark/        30 images, 1080 x 1920, PNG, no alpha
├── google-play/phone/light/        3 images, 1080 x 1920, PNG, no alpha
├── google-play/feature-graphic/    feature-graphic.png, 1024 x 500
├── source/                        the 30 live screen captures (WebP) and capture-report.json
└── overview.jpg                   every App Store image on one sheet, for choosing
```

Each file is named `<NN>-<slug>.png` after its place in the shot list (section 3), so the same number is the same image in both stores.

The 6.5" App Store size (1284 x 2778) is not kept here. Apple asks for it only when a 6.9" set is missing (section 4). `node scripts/store-screenshots/compose.mjs --device iphone-6.5` renders it in about two minutes if it is ever wanted.

## 2. What to submit

Both stores take far fewer images than the pool holds. The pool is for choosing; these are the picks. The order matters: the first three are what a person sees in search results before they open the listing.

**App Store, 10 images (6.9" display, from `app-store/iphone-6.9/`):**

1. `01-find-your-next-home` (the product's front door)
2. `02-full-move-in-cost` (the listing and its move-in total, on a property photograph)
3. `03-book-a-stay` (the Stays side, two phones)
4. `06-search-homes-across-nigeria`
5. `31-share-listings-in-the-chat` (messages, with listings shared as cards)
6. `13-reserve-a-table` (restaurants)
7. `11-ask-the-assistant`
8. `30-vallo-never-holds-your-money` (the move-in breakdown, and the product's promise about money)
9. `21-speak-your-language` (the app in Yoruba)
10. `25-real-estate-done-right` (the closing brand card)

**Google Play, 8 images (from `google-play/phone/`), plus the feature graphic:**

1. `01-find-your-next-home`
2. `02-full-move-in-cost`
3. `03-book-a-stay`
4. `06-search-homes-across-nigeria`
5. `31-share-listings-in-the-chat`
6. `13-reserve-a-table`
7. `30-vallo-never-holds-your-money`
8. `21-speak-your-language`

Play also requires `google-play/feature-graphic/feature-graphic.png`.

Good alternates, all of the same quality: `12-save-your-favourites`, `19-all-your-plans-in-one-place`, `08-message-the-agent`, `24-stays-for-every-trip`, `07-filter-by-what-you-need`. The agent and host images (`14` to `17`) show the pitch a member sees before being approved; they suit a later listing aimed at listers better than the launch listing.

**Read section 6 before submitting `05`**: it shows another member's post.

## 3. The shot list, as produced

Every screen is the live product at <https://www.vallospaces.com>, captured on 29 September 2026 while signed in as the QA member account, except `20` and `21`, which are public. Routes with an id are shown as `<id>`.

| # | Headline | Theme | Layout | Live screen(s) |
|---|---|---|---|---|
| 01 | Find your next home in Nigeria | dark | hero | `/home` |
| 02 | The full move-in cost, before you call | dark | photo (villa-exterior-sunset) | `/listing/<id>` |
| 03 | Book a stay in a few taps | dark | duo | `/stay/<id>`, `/stays` |
| 04 | Hotels, resorts and shortlets | dark | photo (resort-pool-deck) | `/stay/<id>` |
| 05 | Hear what's happening around you | dark | hero | `/around` (the feed) |
| 06 | Search homes across Nigeria | dark | card | `/search?market=rent` |
| 07 | Filter by exactly what you need | dark | tilt | `/search?filters=open` |
| 08 | Message the agent, keep it in one thread | dark | hero | `/messages/<id>` |
| 09 | Every conversation in one inbox | dark | duo | `/messages`, `/messages/<id>` |
| 10 | Know the moment anything changes | dark | tilt | `/notifications` |
| 11 | Ask the AI assistant about any listing | dark | hero | `/assistant` |
| 12 | Save your favourites, compare them later | dark | photocard (villa-pool-portrait) | `/saved` |
| 13 | Reserve a table in the same app | dark | photo (restaurant-02-lounge) | `/restaurants` |
| 14 | Run your listings from one workspace | dark | card | `/agent/dashboard` |
| 15 | Put your property on Vallo | dark | tilt | `/agent/list` |
| 16 | Track your application step by step | dark | hero | `/profile/application` |
| 17 | Host your hotel or shortlet | dark | photo (tower-entrance-dusk) | `/host` |
| 18 | See what places nearby are asking | dark | tilt | `/price?state=LA&area=Lekki&...` (Price Check) |
| 19 | All your plans in one place | dark | tilt | `/profile` |
| 20 | Homes and stays, one account | dark | hero | `/welcome` |
| 21 | Speak your language | dark | card | `/welcome` with the language set to Yoruba |
| 22 | Stays that fit your trip | dark | hero | `/stays/search?filters=open` |
| 23 | Verify with confidence | dark | tilt | `/verification` |
| 24 | Stays for every trip | dark | photo (skyline-waterfront-dusk) | `/stays/search?in=...&out=...&guests=2` |
| 25 | Vallo. Real estate, done right. | dark | brand | none: icon, wordmark and line |
| 26 | A lighter way to browse | light | hero | `/home` |
| 27 | Listings that speak for themselves | light | photocard (villa-exterior-gate) | `/listing/<id>` |
| 28 | Search, beautifully | light | duo | `/search?market=rent`, `/home` |
| 29 | Found the one? Message the agent | dark | duo | `/listing/<id>`, `/messages/<id>` |
| 30 | Vallo never holds your money | dark | hero | `/listing/<id>`, scrolled to its move-in breakdown |
| 31 | Share listings right in the chat | dark | photocard (villa-pool-skyline-01) | `/messages/<id>` |
| 32 | Book a table in a few taps | dark | tilt | `/restaurant/<id>` |
| 33 | You choose what reaches you | dark | hero | `/settings/notifications` |

The layouts, all of which show whole phones: **hero** (one phone, straight, as large as the image allows), **tilt** (one phone turned a little in 3D, with a glass object beside it), **photo** (a property photograph behind, the phone in front), **photocard** (a photograph on a tilted card behind the phone), **card** (an inset rounded panel holding the words and the phone), **duo** (two phones leaning toward each other) and **brand**.

`scripts/store-screenshots/shots.mjs` is the authority: each shot there carries its exact capture steps and a `note` wherever the screen or the words needed a decision.

### How the pool got here

The brief asked for 25 images in four styles, dark and light. That set was built first, then reworked twice on the founder's direction the same night: screens from inside the product's important areas rather than help pages; phones with a camera island; mostly dark; mostly one phone to an image; many compositions; and, after the second round, **every phone whole**, with nothing cropped by the edge of the image or zoomed past it. The founder's own picks from the rounds (the angled pair of stays phones, the tilted profile phone with a glass calendar beside it, the saved listing on a photograph card) set the style of the final pool.

### Where the words differ from the brief, and why

A store listing is copy a person reads, so it answers to the same rules as the product: `apps/web/src/lib/trust/claims.ts` (no promise word without a mechanism), `apps/web/scripts/check-valuation-words.mjs` (no valuation language), `docs/store/LISTING_COPY.md`, and the founder's rule against em dashes.

| Brief | Produced | Why |
|---|---|---|
| Verified listings you can trust | The full move-in cost, before you call | Only a person is verified, never a listing, and every live listing is labelled example stock |
| Payments split safely, Vallo never holds your money | Vallo never holds your money | "Safely" is an unbacked claim word; the rest is the product's own promise (`NO_CUSTODY_SENTENCE` in `lib/money/copy.ts`) |
| Protected by the Vallo Guarantee | Not used | "Protected" is an unbacked claim word, and the Guarantee screen needs a paid agreement, which the QA account does not have |
| Know what an area is really worth | See what places nearby are asking | "Worth" implies a valuation, which Vallo is not licensed to give; Price Check reports asking prices |
| Message hosts, hotels and restaurants | Message the agent, keep it in one thread | The QA account's conversation is with a listing's agent; no real venue exists yet to message |
| List your property in minutes | Put your property on Vallo | Applying takes about two minutes and review 24 to 48 hours, so "in minutes" would overstate it |
| Book stays instantly | Book a stay in a few taps | Instant booking applies only to listings marked Instant |
| Real inspections before you pay; Agreements both sides confirm | Not used | Neither screen exists for the QA account: inspections are refused on example listings, and an agreement follows an inspection |

## 4. The sizes each store takes

Checked against the stores' own pages on 29 September 2026.

**App Store** ([Screenshot specifications](https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications), [Upload app previews and screenshots](https://developer.apple.com/help/app-store-connect/manage-app-information/upload-app-previews-and-screenshots)):

| Display | Accepted portrait sizes | Required? |
|---|---|---|
| 6.9" | 1260 x 2736, 1290 x 2796, **1320 x 2868** | The top of the scaling chain: supply it and every smaller iPhone uses it |
| 6.5" | 1284 x 2778, 1242 x 2688 | Only if 6.9" is not supplied |
| 6.3", 6.1", 5.5" and smaller | various | Optional; scaled down from the size above |
| iPad | various | Only if the app runs on iPad. Vallo is iPhone only |

One to ten screenshots per display size and language, in .png, .jpg or .jpeg. Apple's words: "Images can't include alpha channels or transparencies." Every image here is RGB with no alpha, which `compose.mjs` checks as it writes each file.

**Google Play** ([Add preview assets](https://support.google.com/googleplay/android-developer/answer/9866151)). That page could not be opened from the build environment, so these figures come from the search index of the page itself and should be glanced at once in a browser:

| Asset | Rule |
|---|---|
| Phone screenshots | JPEG or 24-bit PNG, no alpha; each side 320 to 3,840 px; the long side at most twice the short side; up to 8 MB each |
| Count | At least 2 to publish, up to 8 per device type |
| Promotion eligibility | At least 4 screenshots of at least 1080 px, 9:16 portrait (1080 x 1920) or 16:9 landscape |
| Feature graphic | 1024 x 500, JPEG or 24-bit PNG, no alpha. Required |

## 5. Where every part of an image comes from

| Part | Source |
|---|---|
| The screens | Live production, captured by `capture.mjs` (section 7) as the QA member account, at 440 x 894 points and 3x, the 6.9" iPhone's web view. The user agent carries `VALLO-NATIVE`, the mark the store shell sends, so the server renders what the app gets. Stored as WebP at quality 95 in `source/`, with the route and time of every capture in `source/capture-report.json` |
| The status bar | Drawn by `templates.mjs` in the theme's colour, as the native shell draws it above the web view (`overlaysWebView: false`), showing full signal, Wi-Fi and battery |
| The phones | Drawn by `templates.mjs`, with no maker's marks: a handset with a camera island on the App Store images, an Android handset with a punch hole on the Play images. App Store Review Guideline 2.3.10 keeps other platforms' imagery out of App Store metadata, so each store sees its own kind of phone |
| Headlines | Poppins 600 and 700, and Inter for the rare subline: the product's own font files from `apps/web/public/fonts` |
| Colours | `packages/design-tokens/src/tokens.css`: canvas `#010118`, electric `#0069FE`, `#0056D0`, `#003F98`, quiet `#5C9FFF` |
| Logo, icon, wordmark | `apps/web/public/brand/vallo-icon.png` and `vallo-wordmark.png` |
| Glass objects | `apps/web/public/brand/glass/`, the brand's own glass set (`docs/BRAND_MARKS.md`) |
| Property photographs | `apps/web/public/brand/photos/`, the photographs the product already serves (licences in `docs/IMAGERY.md`) |

**Apple's official product bezels are not used yet.** Apple publishes them at <https://developer.apple.com/design/resources/>, but this build environment's network policy refuses `devimages-cdn.apple.com`, and Apple's licence for them covers only apps on the App Store while the company is in the Developer Program, which waits on Vallo's enrolment. `scripts/store-screenshots/frames/README.md` says how to add one in a single command; the compositor then uses it on shot 01 automatically and keeps it upright, whole and uncovered, as Apple requires.

## 6. Before you submit: things to know

- **Every listing and stay on screen is example stock**, because that is all the platform holds today. Listing and stay pages show their Example notice; cards show an Example tag. `docs/store/LISTING_COPY.md` requires the label to be visible, and it is, except in one place below.
- **Listing cards shared into a chat carry no Example tag** (shots `08`, `09`, `29`, `31`). That is how the product draws a shared card today, not a choice made here. Either add the tag to the shared card in the product and recapture, or prefer shots without shared cards until then.
- **`05` shows a post by another member (@kida)** alongside the Vallo account's own and the founder's. Submit it only if that account is one of the founder's or its owner agrees.
- **The QA account's name is on screen**: "omojuni" on the home screens and "omojuni PHANTOM" on the profile. No email address or phone number appears in any image; the Settings screen was captured scrolled past the card that shows the email.
- **Price Check (`18`) shows the question, not an answer.** With only example listings it declines to give a figure, as it should. The screen is the form, filled in for Lekki.
- **The agent and host screens (`14` to `17`) are what a member sees before approval**: the pitch, the empty workspace, the application status. There is no agent or host QA account, and none was created.
- **No image shows a person's hand holding the phone.** The founder asked for some. No licensed photograph of one is available: the build environment cannot reach Unsplash, Pexels or Pixabay, and a drawn hand would look worse than none. A licensed photograph with the phone's four screen corners marked can be added as a new layout.
- **No money moved and there are no "balance transactions".** Vallo has no wallet or balance by design (`docs/MONEY_ARCHITECTURE.md`), and a payment is a real Paystack charge that needs an approved agreement.

### What the capture wrote to production

Only to the two QA accounts, and only through the product's own screens:

- **Sign-ins.** Ten sign-ins to the QA member account and one to the QA admin account. Each writes a "New sign-in to Vallo" notification and security email to that account (one of them is visible in shot `10`). They can be ended from `/settings/devices`.
- **First run.** The interests question was skipped once on the QA member's profile.
- **Favourites.** Three example listings saved to the QA member's favourites (shots `12` and `19` show them).
- **The enquiry thread.** At the founder's request, the QA member shared two saved listings into its existing rental enquiry with the example lister, using the share picker, and sent one message: "I like these two as well. Could we view all three on Saturday morning?" A conversation in Vallo is always between a guest and a listing's agent, and every live listing's agent is the example account, so the thread has one side.

No listing, booking, agreement, payment or account was created.

## 7. Regenerating and extending

Everything lives in `scripts/store-screenshots/`:

| File | What it does |
|---|---|
| `shots.mjs` | The shot list: each shot's words, layout, ground and capture steps |
| `targets.mjs` | The store sizes |
| `capture.mjs` | Signs in and captures the live screens into `source/` |
| `templates.mjs` | The layouts, as HTML and CSS |
| `compose.mjs` | Renders every shot at every size: drawn at twice the size in Chromium, brought down with a Lanczos filter, written as RGB PNG with no alpha |
| `overview.mjs` | Writes `overview.jpg` |
| `frames/` | Where Apple's official bezel goes, and the script that measures it |

From the repository root, after `npm ci`:

```bash
# 1. Capture. Credentials come from the environment only; nothing writes them down.
QA_MEMBER_EMAIL=... QA_MEMBER_PASSWORD=... node scripts/store-screenshots/capture.mjs
#    one or a few shots:  ... capture.mjs --only 8,9

# 2. Compose every shot at every committed size (about 5 minutes).
node scripts/store-screenshots/compose.mjs
#    a few shots, one size, or a proof folder that touches nothing committed:
#    ... compose.mjs --only 1,2 --device iphone-6.9 --proof /tmp/proof

# 3. The overview sheet.
node scripts/store-screenshots/overview.mjs
```

Without the two QA values, `capture.mjs` captures the public screens only and lists what it skipped. It needs Chromium: `/opt/pw-browsers/chromium` in the build environment, or `CHROMIUM_PATH` pointing at a local Chrome.

**To add a shot:** add an entry to `SHOTS` with a new number, its headline (two lines), `mode`, `layout`, `ground` or `photo`, and its capture `steps`. Capture it with `--only <n>` and compose it with `--only <n>`. Run the headline past the rules in section 3 first.

**To change the words only:** edit `shots.mjs` and run `compose.mjs --only <n>`. No capture is needed.

**To refresh the screens** once there is real supply: run all three steps. The file names stay the same, so a store submission can be updated image for image.
