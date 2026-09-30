# Glass 3D objects still on screen: inventory for the clay replacement (30 September 2026)

The founder wants every glossy glass 3D object replaced with the new clay style: matte royal-blue clay, soft rounded forms, white details, one coral-orange accent, and a soft blue glow on navy. The style reference is `apps/web/assets-src/3d-2026-09-30/icon-sheet-stays-and-actions.png`. The old style is the translucent neon-blue glass, like the bell in `notifications-3d-bell-store.png`.

This file lists what is **rendered today** at `HEAD` c18441f8, not what is on disk. It was traced from code and then checked with playwright-core against `localhost:3000` at 390 px wide, in both themes.

**How to read the "Themes" column.** Dark is the default theme. Light is chosen by the user in the theme control. In light, every `BrandIcon` outside a "night island" sits on a small navy tile (`app/css/light.css`, "THE GLASS OBJECTS IN DAYLIGHT"), so the same glass file shows in both themes. The night islands are the drawer, the rail and the flip cover. They look dark in both themes.

## 1. Every glass object rendered today

Sizes are CSS px. "Box" is the wrapper the object fills: `BrandIcon` keeps a few percent of transparent margin, so the art itself draws slightly smaller than the box.

| Object file | What it depicts | Where it's rendered (screens · component) | Displayed size | Themes |
|---|---|---|---|---|
| `glass/keys-home.png` | A key on a ring with a house-shaped key tag | (a) Flip cover when turning to Property: the big mark, plus the first of three "miniature" objects · `flip/SideCover.tsx`. (b) The coin in the drawer and desktop rail foot, while on the Stays side · `SideSwitch.tsx`. (c) Every sign-in / sign-up / forgot / reset / start screen: the floating object under the curved top block · `auth/slate.tsx` (`AuthCurveBlock`) | (a) 128 scaled ×1.25 ≈ 160 mark; 40 in a 60 lit tile. (b) 32 in a 44 coin (38 on the desktop rail). (c) `clamp(72px, 24vw, 112px)`, 94 at 390 wide | (a)(b) both, night island. (c) **light only**: dark shows `light/keys-handover` instead |
| `glass/hotel.png` | A hotel block with a concierge bell in front | (a) Flip cover when turning to Stays: the big mark and the first miniature · `SideCover.tsx`. (b) The drawer and rail coin, while on the Property side · `SideSwitch.tsx` | (a) ≈160 mark; 40 miniature. (b) 32 | both (night island) |
| `glass/shortlet.png` | A beach umbrella, a sun lounger and a palm on a little island | (a) Stays flip cover miniature · `SideCover.tsx`. (b) Stays home (`/stays`), "Shortlets" door · `home/CategoryRow.tsx` (tiles variant) | (a) 40. (b) 64 box, 52 in light | both |
| `glass/serviced-apartment.png` | A tall apartment tower with balconies | Stays flip cover miniature · `SideCover.tsx` | 40 in a 60 tile | both (night island) |
| `glass/home-check.png` | A house with a tick badge | (a) Property flip cover miniature · `SideCover.tsx`. (b) "You're set up as an owner" done screen, `/profile/setup/owner` · `OwnerRegisterForm` → `RegisterShell.RegisterDone` | (a) 40. (b) 128 on a glow pool | both |
| `glass/land-plot.png` | A square plot of land with a map pin and two trees | Property flip cover miniature · `SideCover.tsx` | 40 in a 60 tile | both (night island) |
| `glass/hotel-room.png` | A double bed under five stars | Stays home (`/stays`), "Hotels" door · `CategoryRow.tsx` | 64 box, 52 in light | both |
| `glass/concierge-bell.png` | A reception or concierge bell | Stays home (`/stays`), "Restaurants" door · `CategoryRow.tsx` | 64, 52 in light | both |
| `glass/pin-map.png` | A folded map with a location pin | Stays home (`/stays`), "Nearby" door · `CategoryRow.tsx` | 64, 52 in light | both |
| `glass/card-lock.png` | A bank card with a padlock | (a) Settings, Payments (`/settings/payments`), "no saved cards" row · `PaymentMethodsPanel.tsx`. (b) Rent payment (`/rent/pay/[inspectionId]`): the saved card, card and large-amount options · `rent/pay/.../PayPanel.tsx`. (c) Booking checkout (`/checkout/[bookingId]`): the same three options · `checkout/.../PayPanel.tsx`. (d) Agent earnings (`/agent/earnings`), "can't add a payout account right now" note · `agent/PayoutAccounts.tsx` | (a) 48. (b) 48. (c) 32 in a large icon plate. (d) 32 | both |
| `glass/id-card-check.png` | An ID card with a tick, on its own rounded glass tile | Pay with crypto, "verify your identity first" card, on rent payment and checkout when a crypto offer applies · `payments/crypto/CryptoPayOption.tsx` | 32 in a large icon plate | both |
| `glass/flip-coin.png` | A round coin with the Vallo building mark | Pay with crypto option card (rent payment and checkout) · `CryptoPayOption.tsx` | 32 in a large icon plate | both |
| `glass/naira-hand.png` | An open hand holding up a naira coin | (a) Agent earnings (`/agent/earnings`), "No payout account yet" empty card · `PayoutAccounts.tsx`. (b) Checkout, the "recorded once" footnote · `checkout/[bookingId]/page.tsx` | (a) 64. (b) 20 | both |
| `glass/shield-check.png` | A shield with a tick | (a) Verification (`/verification`): header watermark, both branches · `PageScene`. (b) Move-in ledger (`/rent/move-in/[listingId]`), "pay after" note · `MoveInLedger.tsx` | (a) watermark, see note A. (b) 16 | both |
| `glass/calendar-check.png` | A calendar with a tick badge | (a) Header watermark on Bookings (`/bookings`), Checkout (`/checkout/[bookingId]`) and Review your stay (`/bookings/[id]/review`) · `PageScene`. (b) Checkout: the three "standing fact about the dates" notes · `HoldNote` in `checkout/[bookingId]/page.tsx` | (a) watermark, 191 measured on checkout. (b) 20 | both |
| `glass/calendar-clock.png` | A calendar with a clock badge | Checkout, the hold countdown card · `checkout/.../HoldCountdown.tsx` | 28 in a medium plate | both |
| `glass/cluster-home.png` | A cluster of office and apartment blocks | Firm registration (`/profile/setup/firm`): (a) at the top of the details step, (b) on the done screen · `FirmRegisterForm.tsx`, `RegisterDone` | (a) 176. (b) 128 | both |
| `glass/keys-tag.png` | A key on a ring with a blank luggage-style tag | Agent registration done screen (`/profile/setup/agent`) · `AgentRegisterForm` → `RegisterDone` | 128 | both |
| `glass/bell-badge.png` | A bell with a round "3" badge (the bell in the store render) | Notifications (`/notifications`), header watermark, all three branches · `PageScene` | watermark | both |
| `glass/bot.png` (reached through the alias `bot-chat`) | A friendly round robot head with headphones and an antenna | Inbox (`/messages`), header watermark, both branches · `PageScene` | watermark | both |
| `glass/search-ring.png` | A small magnifier inside a glowing ring | Saved searches (`/saved/searches`), header watermark · `PageScene` | watermark | both |
| `glass/globe-pin.png` | A globe with a location pin | Saved (`/saved`), header watermark · `PageScene` | watermark | both |
| `glass/seal-check.png` | A scalloped verification seal with a tick, on a rounded glass tile | Auth screens, the small second floating object · `auth/slate.tsx` | 42% of the object box, 39 at 390 wide | **light only** |
| `glass/light/seal-check.png` | Same seal, frosted daylight version with no tile | Auth screens, the same slot · `auth/slate.tsx` | 39 at 390 wide | **dark only** |
| `glass/light/keys-handover.png` | One hand passing a key down into another open hand | Auth screens, the main floating object · `auth/slate.tsx` | 94 at 390 wide (72–112) | **dark only** |
| `glass/modern-house.png` | A modern two-storey house with flat and pitched roofs | "You're in" arrival moment after an emailed code is accepted (sign-up / sign-in) · `auth/ArrivalMoment.tsx` (`VerifyCodeForm`) | 160 (10rem), with a drawn ring and tick over it | both |
| `session-b/inspection/house-check.webp` | A glowing outline house with a tick badge (a crop from a render) | Agent inspections (`/agent/inspections`), hero, over the card's corner · `InspectionHero` in `inspections/InspectionSheet.tsx` | 100 × 75; 136 wide on wide screens | both |

**Note A, the `PageScene` watermark.** This is the largest glass use in the member app. The object bleeds off the top-right of the page heading at **16% opacity** behind a radial mask. On phones it is 62% of the header width, capped at 300 px (about 190–240 px at 390 wide). From the 640 px breakpoint it is 46%, capped at 380 px. So the clay renders for `bell-badge`, `bot`, `calendar-check`, `shield-check`, `search-ring` and `globe-pin` must hold up at about 400 px.

**Surfaces with no glass objects today:** the landing and marketing pages (`/`, `/about`, `/help`, `/for-hosts`; photographs and line glyphs only, checked in both themes), the Property home (`/home` draws its four doors as line-glyph plates, `variant="plates"`), admin, and every `State` / `EmptyState` / `ResultSheet` (all go through `glass-to-line.ts` to line glyphs). Also clean: every call site that takes a `BrandIconName` but draws `lineGlyphFor(...)`: `UploadCard`, `RegisterShell` rows, `AddWorkspaceChooser`, `HostWizard`, `StaysParts`, `StayCategoryTiles`, `SiteHead`, docs, careers, about, `ListingWizard` and `ListingSentForReview`. The same goes for emails (`lib/email`, logo lockup only), OG and share images (photographs and type), and `/welcome`: since c18441f8 all four Get started steps and the cold-start intro show the clay photographs in `public/brand/onboarding/`. The glass fallback in `FirstRun.tsx` and `WelcomeIntro.tsx` is still in the code but can no longer draw.

**Brand marks, not counted, and the founder's call.** The logo itself is glass: `vallo-mark.png`, `vallo-icon.png` (the app tile used for the native splash in `android/.../splash.png` and `ios/.../Splash.imageset`, and for the PWA icons), `vallo-wordmark.png` and `vallo-email-lockup.png` (every email header). These are the identity, not content objects. Whether they go clay is a separate brand decision.

## 2. To create, de-duplicated and grouped (26 objects)

Every prompt shares one base, taken from the clay sheet: *"soft matte 3D clay icon, rounded chunky forms, royal-blue body with white details and a single coral-orange accent, soft blue rim glow, centred on a transparent background, no text, three-quarter front view."* Size notes say the largest slot each one fills. A ★ marks a subject the founder's clay sheet already draws, or one sliced into `public/brand/3d/` (buy, rent, pay, list, hotel, shortlet, restaurant, local-talks). Those may need only a re-export or a colour check rather than a new render.

### Property types (6)
1. **keys-home ★** (the sheet's key with a coral house tag / `3d/rent`). A blue house key on a ring with a coral house-shaped tag. Up to 160 px (flip cover).
2. **home-check**. A small white-walled house with a blue roof and a round coral badge with a white tick. Up to 128 px.
3. **modern-house**. A modern two-storey home, one flat and one pitched roof section, big lit windows. 160 px.
4. **cluster-home**. Three or four office and apartment blocks of different heights standing together on a round base. 176 px.
5. **serviced-apartment**. One tall slim apartment tower with rows of balconies. 40 px.
6. **land-plot**. A flat square plot of grass with a dashed boundary, two small trees and a coral map pin. 40 px.

### Stays and venues (7)
7. **hotel ★** (the sheet's hotel with three stars / `3d/hotel`). A hotel block with a coral awning, round trees either side and three coral stars above. Up to 160 px.
8. **shortlet ★** (the sheet's villa with a pool and palm / `3d/shortlet`). A small holiday house with a pool, palm tree and coral sun lounger on a base. 64 px.
9. **hotel-room**. A double bed with two pillows, five small coral stars above the headboard. 64 px.
10. **concierge-bell ★** (the sheet's cloche with fork and knife / `3d/restaurant`). A domed serving cloche with a coral band, white fork and knife beside it. Used for "Restaurants". 64 px.
11. **pin-map ★** (the sheet's pin on a folded map). A folded map with a big blue location pin. Drop the chat bubble here, because this door means "nearby". 64 px.
12. **calendar-check**. A desk calendar with rings on top and a coral badge with a white tick. Up to 400 px (watermark).
13. **calendar-clock**. The same calendar with a coral clock badge instead of the tick. 28 px.

### Money and payments (3)
14. **card-lock**. A blue bank card at an angle with a coral padlock in front. 48 px.
15. **naira-hand**. An open white hand holding up a blue coin marked with the naira sign ₦. 64 px.
16. **flip-coin**. A thick round blue coin standing on its edge, face showing the Vallo building-bars mark (the mark can be composited later). 32 px.

### Trust and verification (4)
17. **shield-check**. A rounded blue shield with a white tick. Up to 400 px (watermark).
18. **seal-check**. A scalloped round verification seal, blue, with a white tick. One clay render replaces both the glass tile and the `light/` twin. 40 px.
19. **id-card-check**. A white ID card with a blue portrait silhouette and text lines, and a coral tick badge. 32 px.
20. **keys-handover**. One hand passing a blue key down into another open hand below it. 112 px. Or retire it, and let `keys-home` fill the auth slot in both themes.

### Messaging and notifications (2)
21. **bell-badge**. A rounded blue bell with a coral circle badge on its shoulder. The store render shows "3"; a blank badge is safer for reuse. Up to 400 px (watermark).
22. **bot**. A friendly round robot head, white face plate, two dot eyes, a smile, headphones and a short antenna with a coral tip. Up to 400 px (watermark).

### Account and profile (3)
23. **keys-tag**. A blue key on a ring with a plain coral luggage-style tag (the agent's key). 128 px.
24. **search-ring**. A magnifying glass, blue rim and white lens, with a coral handle. Drop the ring, since the clay style needs no disc. Up to 400 px (watermark).
25. **globe-pin**. A blue globe with white meridian lines and a coral location pin on top. Up to 400 px (watermark).

### Scenes and heroes (1)
26. **house-check (inspection hero)**. A house with a coral tick badge, drawn wider than tall (about 4:3) so it can overhang the corner of the inspections hero card. 136 px wide. Note that the six watermark objects and the two flip-cover marks above are scene-sized uses: render them at 512 px or more.

## 3. Present but never rendered, so the founder can skip them

**`BrandIcon` registry: 120 of 144 names are never drawn as glass.** They are either unused or only reach the screen as their `glass-to-line.ts` line twin. The list: alert-triangle, apartment-block, bank-column, beach-house, bed-ring, bell-tile, bill-tile, booking-instant, bookmark-ribbon, brain-chip, brain-ring, building-chip, bungalow, calendar-grid, calendar-home, calendar-ring, calendar-time, camera, card-tile, chart-growth, chart-ring, chat-duo, chat-ring, city-ring, clock-check, clock-expired, coin-naira, container-home, contract-sign, coworking-space, doc-cross, doc-home, doc-lock, doc-review, doc-shield, duplex, farm-house, gift, gift-star, globe, globe-chip, guest-house, headset, heart-home, home-lock, home-ring, home-search, hotel-bed, hotel-star, hourglass, house-boat, info, inspect-ring, key-cycle, key-ring, keys-handover (the root file; only the `light/` twin is drawn), lake-house, ledger-book, listing-search, loft, luggage-check, luggage-plane, manage-ring, mansion, map-route, map-spot, mini-flat, mountain-cabin, naira-coins, office-space, palette, palm-tree, payment-failed, payment-received, payment-sent, penthouse, people-ring, person-card, phone-tile, progress-ring, receipt-check, report-stats, reviews, role-switch-tile, savings-pot, seal-cross, seal-pending, search-home, send-plane-tile, serviced-block, shared-apartment, shield-check-tile, shield-home, shield-lock, shield-ring, shop-retail, stays-hotel-palms, studio-apartment, support-chat, support-shield, tag-hash, tag-percent, terrace-house, tour-360, townhouse, transfer-arrow, tree-house, twin-house, user-check, user-verified, villa, wallet, wallet-chip, wallet-naira, wallet-out, wallet-plus, wallet-ring, wallet-secure, wallet-tile, warehouse.

**Aliases.** Of the seven `LEGACY_ALIASES`, only `bot-chat` (resolving to `bot`) reaches a glass render. `bell-alert`, `chat`, `bot-home`, `listing-review`, `homes-sparkle` and `house-sparkle` only ever resolve to line glyphs. The two "needs commissioning" notes in `BrandIcon.tsx` (a group of recommended homes, and one recommended home) therefore need no clay.

**Other folders and components:**
- `public/brand/glass/hero/` (all 12, including `hero-property` and `hero-protected`) was only drawn by the Get started / intro glass fallback. It is replaced by the onboarding photographs and is now unreachable.
- `public/brand/glass/light/`: 22 of 24 are unused. Only `keys-handover` and `seal-check` are drawn (auth slate, dark theme). `escrow-hold` is withheld on purpose.
- `public/brand/icons/` (84 files) is the older white-clay pack. Nothing references it.
- `public/brand/scenes/*.jpg` are photographs, not glass. They are listing stand-in photos via `MediaFrame` and the landing, and they stay.
- `public/brand/session-b/roles/` (114 objects: doors, orbs, types, amenities, notify tiles and more), `session-b/send/`, `session-b/signin/` and `session-b/welcome/stage-*` are referenced by nothing outside dev previews.
- `session-b/welcome/coin-face.webp` (`WelcomeCoin`) was only drawn on Get started step 4, which is now a photograph.
- `session-b/inspection/glyph-*` and `room-*` are drawn on the inspection sheet, but they are flat line glyphs on round plates, not 3D objects, so they are out of scope.
- `SceneBanner.tsx` renders `BrandIcon`, but it has no live caller (dev previews only).
- Get started objects no longer drawn: `hero-app`, `chat-duo`, `receipt-check`, `search-home`, `user-check`, `user-verified`, `stays-hotel-palms`, and the intro's `keys-home` / `receipt-check` satellites. The paths are still in `FirstRun.tsx` and `WelcomeIntro.tsx`, but `STEP_PHOTOS_READY` is all `true`.

## Method
- Read `design-system/icons/BrandIcon.tsx` (144 names, 7 aliases) and `glass-to-line.ts`.
- Listed every `<BrandIcon` JSX site outside `(dev)` and tests (19 sites), and resolved each name through props, maps and data: `COVER` in `SideCover`, the doors in `/stays`, the `PayPanel` option icons, the `RegisterDone` `object` props, and the `PageScene` `art` props.
- Grepped every literal `/brand/glass`, `/brand/session-b` and CSS `url()`.
- Checked the light-theme rules in `light.css`, `home.css` and `auth.css`.
- Confirmed with playwright-core at 390 × 844 against the running server: `/`, `/welcome` and the auth routes in both themes. Member screens were checked through the dev previews that mount the live components (`/preview/lead/flip`, `/preview/f3/checkout`, `/preview/f3/move-in`, `/preview/session-b/sweep-stays/stays`, `/preview/b1b/firm`, `/preview/b1b/firm-done`, `/preview/f5/inspection`, `/preview/lead/drawer`).
