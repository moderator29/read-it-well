# The roles icon pack

Every 3D glass object and glass icon tile drawn in the twelve renders in
`docs/design/references/roles/`, cut by `scripts/design/session-b-crops.mjs`
(block roles). Do not edit these files by hand: change the script and re-run
`node scripts/design/session-b-crops.mjs --surface roles`.

**Key.** The shared pipeline's own `keyRender` from `scripts/cut-icon-ground.mjs`
(read from that file and evaluated, not copied): a two-pass plane fit of the
ground on a ring at the box edge, subtracted only to find how much of each
pixel's brightest channel is object, then the brightest-channel key with all
three channels scaled by one number so the hue is the render's hue. Then
`dropEdgeStrays` and `squareWithMargin`, the same 10 per cent margin as the
pack's 41 render crops.

**Files per object.** `<name>.png` and `<name>.webp` at native size (the
square edge column), `<name>-256.png` and `<name>-256.webp` at the pack's 256
edge. Where native is under 256 the 256 file is an upsample (Lanczos) and reads
exactly as soft as the native number says; nothing sharper was invented.

**Sizes, honestly.** Native is the object's longer side in render pixels. At
a 3x phone a crop is pin sharp up to native / 3 CSS px and acceptably soft to
native / 2. So: 40 to 60 native (the glyph tiles, orbs and amenities) belong
in 20 to 32 CSS px slots; 70 to 115 (the doors, the plinth objects) up to
40 to 56; the four hero objects (`owner-set-up-house`, `agent-key-plinth`,
`firm-building-plinth`, `review-sent-house`) up to 96 to 120.

**Duplicates.** Checked against all 144 objects in `public/brand/glass`: none of
them is the same drawing as any object here (the nearest, `home-ring`,
`key-ring`, `chart-ring`, `building-chip`, `doc-shield`, `pin-map`,
`land-plot`, `duplex`, `bungalow`, `mini-flat`, `shop-retail`,
`office-space`, `id-card-check`, `hotel-bed`, `concierge-bell`, `info`,
`home-check`, `camera`, are different drawings in a different style), so
nothing was skipped as already filed. Within the set, where two screens draw
the same object only the larger drawing was cut, and its row names both screens.

**Light theme.** No render draws these on paper, and a night object on white
goes green and washed, with its faint bloom showing as a pale square. So each
object also ships `<name>-day.png` / `.webp` and `-day-256`: the same key
with the faint bloom (alpha under 50) dropped and every pixel re-inked on the
brand ramp by how lit it was, `#9CC2FF` for the glass body to `#06379A` for
the brightest edges. On paper it sits bare, or on the PALE icon tile of
`docs/design/GLOW_IDENTITY.md` section 4. Never on a dark plate (the light
survey's condemned defect). It is a derived rendition, not commissioned light
artwork. See `docs/design/proofs/session-b/identity/roles-pack-paper.png`.

## Objects

| Name | Render | Box (left, top, w, h) | Native px | Square edge | Screen | What it is |
| --- | --- | --- | ---: | ---: | --- | --- |
| `home-buy-tile` | `GOVERNING-01` | 77, 387, 75, 76 | 76 | 91 | 01 home | House glyph on a lit glass tile, the home Buy quick tile |
| `home-rent-tile` | `GOVERNING-01` | 159, 387, 75, 76 | 76 | 91 | 01 home | Key glyph on a lit glass tile, the home Rent quick tile |
| `home-manage-tile` | `GOVERNING-01` | 241, 387, 75, 76 | 76 | 91 | 01 home | Building glyph on a lit glass tile, the home Manage quick tile |
| `home-invest-tile` | `GOVERNING-01` | 405, 387, 75, 76 | 76 | 91 | 01 home | Rising chart glyph on a lit glass tile, the home Invest quick tile |
| `switch-owner-orb` | `GOVERNING-01` | 1080, 582, 74, 74 | 74 | 89 | 01 sheet, 01 drawer | House glyph in a glass orb, the Owner workspace (drawer Switch profile row; the sheet's Owner row draws the same orb smaller) |
| `switch-agent-orb` | `GOVERNING-01` | 578, 497, 62, 64 | 64 | 77 | 01 sheet | Key glyph in a glass orb, the Agent workspace row |
| `switch-firm-orb` | `GOVERNING-01` | 578, 587, 62, 64 | 64 | 77 | 01 sheet | Building glyph in a glass orb, the firm workspace row |
| `switch-add-orb` | `GOVERNING-01` | 578, 708, 62, 64 | 64 | 77 | 01 sheet, 05, 09 | Plus in a glass orb, Add a workspace (05 team and 09 sheet draw the same orb) |
| `door-owner-house` | `GOVERNING-02` | 112, 294, 114, 110 | 114 | 137 | 02 chooser | 3D glass house on its glass tile, the I own the property door |
| `door-agent-key` | `GOVERNING-02` | 114, 446, 108, 96 | 108 | 130 | 02 chooser | 3D glass key on its glass tile, the I am an agent door |
| `door-firm-building` | `GOVERNING-02` | 114, 583, 112, 104 | 112 | 134 | 02 chooser | 3D glass office block on its glass tile, the registered firm door |
| `ask-person-tile` | `GOVERNING-02` | 1078, 303, 84, 86 | 86 | 103 | 02 what we will ask | Person glyph on a glass tile, Who you are |
| `ask-pin-tile` | `GOVERNING-02` | 1078, 439, 84, 86 | 86 | 103 | 02 what we will ask | Map pin on a glass tile, Where the property is |
| `ask-doc-shield-tile` | `GOVERNING-02` | 1078, 573, 84, 86 | 86 | 103 | 02 what we will ask | Document with a shield on a glass tile, What proves it is yours |
| `ask-clock-tile` | `GOVERNING-02` | 1077, 711, 54, 56 | 56 | 67 | 02 what we will ask | Clock on a small glass tile, About five minutes |
| `owner-house-orb` | `GOVERNING-03` | 282, 146, 76, 78 | 78 | 94 | 03 about you | House glyph in a lit glass orb, the owner registration header |
| `owner-shield-tile` | `GOVERNING-03` | 56, 585, 56, 62 | 62 | 74 | 03 about you | Split shield on a glass tile, We check who you are |
| `owner-map-pin` | `GOVERNING-03` | 552, 336, 54, 62 | 62 | 74 | 03 where do you own | Glass map pin, drawn over the map |
| `doc-certificate-orb` | `GOVERNING-03` | 810, 284, 52, 52 | 52 | 62 | 03 proof of ownership | Document glyph in a glass orb, Certificate of Occupancy (Deed and I have none of these draw the same) |
| `doc-consent-orb` | `GOVERNING-03` | 810, 400, 52, 52 | 52 | 62 | 03 proof of ownership | Document with a seal in a glass orb, Governor's consent |
| `doc-survey-orb` | `GOVERNING-03` | 810, 457, 52, 52 | 52 | 62 | 03 proof of ownership | Plan sheet in a glass orb, Survey plan |
| `doc-utility-orb` | `GOVERNING-03` | 810, 513, 52, 52 | 52 | 62 | 03 proof of ownership | Bill sheet in a glass orb, Utility bill in your name |
| `ownership-proof-orb` | `GOVERNING-03` | 1043, 148, 72, 72 | 72 | 86 | 03 proof of ownership | House outline with a key in a dark glass orb, the proof of ownership header |
| `info-orb` | `GOVERNING-03` | 816, 666, 40, 40 | 40 | 48 | 03, 04, 05, 08 info panels | Lit round info glyph, the calm info panel |
| `owner-set-up-house` | `GOVERNING-03` | 1228, 222, 212, 168 | 212 | 254 | 03 submitted | 3D glass house with a tick badge on a glowing plinth, You are set up as an owner |
| `agent-id-card` | `GOVERNING-04` | 459, 360, 94, 90 | 94 | 113 | 04 prove who you are | 3D glass ID card, Take a photo of your ID |
| `agent-selfie-orb` | `GOVERNING-04` | 462, 495, 88, 92 | 92 | 110 | 04 prove who you are | Person in a lit glass orb, Take a selfie |
| `agent-key-plinth` | `GOVERNING-04` | 1210, 240, 228, 150 | 228 | 274 | 04 submitted | 3D glass key on a glass plinth, We are checking your details |
| `firm-building-plinth` | `GOVERNING-05` | 1200, 280, 248, 178 | 248 | 298 | 05 your firm, 05 under review | 3D glass office block on a glowing plinth (05 screen 1 draws the same smaller) |
| `firm-letter` | `GOVERNING-05` | 446, 311, 88, 88 | 88 | 106 | 05 prove you work here | 3D glass letter on a stand, Upload a letter from your principal |
| `firm-stamp` | `GOVERNING-05` | 448, 452, 82, 94 | 94 | 113 | 05 prove you work here | 3D glass rubber stamp, Have your principal confirm you |
| `list-rent-house` | `GOVERNING-06` | 60, 278, 90, 94 | 94 | 113 | 06 what are you listing | 3D glass house on a plinth, To rent (tick badge retouched out) |
| `list-sale-sign` | `GOVERNING-06` | 176, 282, 82, 86 | 86 | 103 | 06 what are you listing | 3D glass for-sale sign on a plinth, For sale (the lettering on the board retouched blank) |
| `list-land-plot` | `GOVERNING-06` | 279, 280, 84, 90 | 90 | 108 | 06 what are you listing | Glass land plot with a tree, Land |
| `type-flat` | `GOVERNING-06` | 66, 508, 70, 72 | 72 | 86 | 06 property type | Glass apartment block, Flat |
| `type-duplex` | `GOVERNING-06` | 178, 508, 70, 72 | 72 | 86 | 06 property type | Glass two-storey house, Duplex |
| `type-bungalow` | `GOVERNING-06` | 287, 510, 70, 72 | 72 | 86 | 06 property type | Glass bungalow, Bungalow |
| `type-self-contain` | `GOVERNING-06` | 68, 638, 70, 70 | 70 | 84 | 06 property type | Glass small house, Self contain |
| `type-shop` | `GOVERNING-06` | 176, 645, 70, 68 | 70 | 84 | 06 property type | Glass shop front with an awning, Shop |
| `type-office` | `GOVERNING-06` | 288, 648, 70, 68 | 70 | 84 | 06 property type | Glass office block, Office |
| `room-bedrooms` | `GOVERNING-06` | 806, 258, 56, 58 | 58 | 70 | 06 the rooms | Bed glyph on a soft glass tile, Bedrooms |
| `room-bathrooms` | `GOVERNING-06` | 806, 343, 56, 60 | 60 | 72 | 06 the rooms | Shower glyph on a soft glass tile, Bathrooms |
| `room-toilets` | `GOVERNING-06` | 806, 425, 56, 60 | 60 | 72 | 06 the rooms | Toilet glyph on a soft glass tile, Toilets |
| `room-size` | `GOVERNING-06` | 806, 512, 56, 66 | 66 | 79 | 06 the rooms | Measured square glyph on a soft glass tile, Size |
| `room-furnishing` | `GOVERNING-06` | 806, 616, 56, 64 | 64 | 77 | 06 the rooms | Sofa glyph on a soft glass tile, Furnishing |
| `room-floor` | `GOVERNING-06` | 806, 712, 56, 62 | 62 | 74 | 06 the rooms | Stair glyph on a soft glass tile, Floor |
| `condition-fair` | `GOVERNING-06` | 1182, 312, 56, 56 | 56 | 67 | 06 condition | House glyph in a glass orb, Fair condition |
| `condition-good` | `GOVERNING-06` | 1352, 312, 74, 58 | 74 | 89 | 06 condition | Glass house, Good condition |
| `condition-new` | `GOVERNING-06` | 1182, 444, 58, 62 | 62 | 74 | 06 condition | Glass house with a bow, New |
| `condition-off-plan` | `GOVERNING-06` | 1352, 444, 76, 62 | 76 | 91 | 06 condition | Glass tower crane, Off plan |
| `light-bulb-plinth` | `GOVERNING-07` | 282, 152, 94, 114 | 114 | 137 | 07 light | 3D glass light bulb on a plinth, the Light step header |
| `power-sun` | `GOVERNING-07` | 64, 306, 42, 42 | 42 | 50 | 07 light | Sun glyph, 24 hours |
| `power-clock-orb` | `GOVERNING-07` | 228, 306, 42, 42 | 42 | 50 | 07 light | Alarm clock in a glass orb, 16 to 20 hours (8 to 12 draws the same) |
| `none-orb` | `GOVERNING-07` | 228, 411, 42, 42 | 42 | 50 | 07 light, 07 water | Prohibition circle in a glass orb, Less than 8 hours, None, No running water |
| `power-inverter` | `GOVERNING-07` | 64, 642, 42, 42 | 42 | 50 | 07 light | Inverter glyph, Inverter |
| `power-solar` | `GOVERNING-07` | 229, 643, 44, 40 | 44 | 53 | 07 light | Solar panel glyph, Solar |
| `water-drop-plinth` | `GOVERNING-07` | 650, 162, 94, 90 | 94 | 113 | 07 water | 3D glass water drop on a plinth, the Water step header |
| `water-borehole` | `GOVERNING-07` | 604, 324, 54, 52 | 54 | 65 | 07 water | Borehole pump on a base, Borehole (water source) |
| `water-well` | `GOVERNING-07` | 444, 440, 50, 50 | 50 | 60 | 07 water | Well with a bucket, Well |
| `amenity-parking` | `GOVERNING-07` | 818, 280, 60, 46 | 60 | 72 | 07 amenities | Car glyph, Parking |
| `amenity-security` | `GOVERNING-07` | 934, 278, 48, 50 | 50 | 60 | 07 amenities | Shield glyph, Security |
| `amenity-water-heater` | `GOVERNING-07` | 1044, 278, 46, 50 | 50 | 60 | 07 amenities | Water heater glyph, Water heater |
| `amenity-air-conditioning` | `GOVERNING-07` | 818, 388, 60, 40 | 60 | 72 | 07 amenities | Split unit glyph, Air conditioning |
| `amenity-wifi` | `GOVERNING-07` | 928, 384, 52, 48 | 52 | 62 | 07 amenities | Wi-Fi glyph, WiFi |
| `amenity-fitted-kitchen` | `GOVERNING-07` | 1036, 382, 52, 50 | 52 | 62 | 07 amenities | Cooker glyph, Fitted kitchen |
| `amenity-wardrobe` | `GOVERNING-07` | 826, 488, 44, 50 | 50 | 60 | 07 amenities | Wardrobe glyph, Wardrobe |
| `amenity-balcony` | `GOVERNING-07` | 930, 488, 50, 50 | 50 | 60 | 07 amenities | Balcony glyph, Balcony |
| `amenity-gated-estate` | `GOVERNING-07` | 1036, 490, 54, 48 | 54 | 65 | 07 amenities | Gate glyph, Gated estate |
| `amenity-borehole` | `GOVERNING-07` | 828, 596, 44, 50 | 50 | 60 | 07 amenities | Wellhead glyph, Borehole (amenity) |
| `amenity-generator` | `GOVERNING-07` | 928, 600, 52, 46 | 52 | 62 | 07 amenities, 07 light | Generator glyph, Generator (the backup power row draws the same smaller) |
| `amenity-running-water` | `GOVERNING-07` | 1040, 596, 52, 48 | 52 | 62 | 07 amenities, 07 water | Tap glyph, Running water (Treated mains draws the same tap) |
| `amenity-pop-ceiling` | `GOVERNING-07` | 818, 700, 60, 42 | 60 | 72 | 07 amenities | Recessed ceiling glyph, POP ceiling |
| `amenity-tiled-floor` | `GOVERNING-07` | 926, 704, 56, 42 | 56 | 67 | 07 amenities | Floor tiles glyph, Tiled floor |
| `amenity-garden` | `GOVERNING-07` | 1046, 698, 42, 52 | 52 | 62 | 07 amenities | Potted plant glyph, Garden |
| `media-camera-plinth` | `GOVERNING-07` | 1444, 166, 54, 66 | 66 | 79 | 07 photos | Glass camera on a small plinth, the Photos step header |
| `media-video-tile` | `GOVERNING-07` | 1188, 606, 48, 52 | 52 | 62 | 07 photos | Film strip glyph on a glass tile, Video walkthrough |
| `price-rent-house` | `GOVERNING-08` | 436, 292, 52, 52 | 52 | 62 | 08 what a tenant pays | House glyph on a soft glass tile, Rent (annual) |
| `price-agency-person` | `GOVERNING-08` | 436, 367, 52, 48 | 52 | 62 | 08 what a tenant pays | Person at a desk glyph on a soft glass tile, Agency fee |
| `price-legal-doc` | `GOVERNING-08` | 436, 440, 52, 52 | 52 | 62 | 08 what a tenant pays | Document and pen glyph on a soft glass tile, Legal fee |
| `price-caution-shield` | `GOVERNING-08` | 436, 514, 52, 52 | 52 | 62 | 08 what a tenant pays | Shield glyph on a soft glass tile, Caution deposit |
| `price-service-gear` | `GOVERNING-08` | 436, 594, 52, 52 | 52 | 62 | 08 what a tenant pays | Gear glyph on a soft glass tile, Service charge |
| `price-total-coins` | `GOVERNING-08` | 437, 682, 64, 68 | 68 | 82 | 08 what a tenant pays | Stacked coins on a glass tile, Total to move in |
| `review-sent-house` | `GOVERNING-08` | 1238, 168, 186, 146 | 186 | 223 | 08 listing ID | 3D glass house with a tick badge on a glowing plinth, Sent for review |
| `stays-hotels-bed` | `GOVERNING-09` | 76, 472, 94, 74 | 94 | 113 | 09 stays home | 3D glass bed on a plinth, Hotels |
| `stays-shortlets-house` | `GOVERNING-09` | 248, 470, 94, 72 | 94 | 113 | 09 stays home | 3D glass house on a plinth, Shortlets |
| `stays-restaurants-cloche` | `GOVERNING-09` | 82, 604, 90, 74 | 90 | 108 | 09 stays home | 3D glass cloche on a plinth, Restaurants |
| `stays-nearby-pin` | `GOVERNING-09` | 258, 604, 76, 74 | 76 | 91 | 09 stays home, 06 where is it | 3D glass map pin on a plinth, Nearby (06 where is it draws the same pin on its disc, over the map, where it cannot be keyed clean) |
| `stays-switch-person-orb` | `GOVERNING-09` | 434, 292, 70, 70 | 70 | 84 | 09 switch profile | Person in a glass orb, Personal (stays sheet) |
| `stays-switch-hotel-orb` | `GOVERNING-09` | 434, 396, 70, 70 | 70 | 84 | 09 switch profile | Hotel block in a glass orb, a hotel workspace |
| `stays-door-hotel` | `GOVERNING-09` | 806, 280, 92, 94 | 94 | 113 | 09 stays doors | Glass hotel block in a glass orb, We are a hotel |
| `stays-door-shortlet` | `GOVERNING-09` | 806, 402, 92, 94 | 94 | 113 | 09 stays doors | Glass bed in a glass orb, I run a shortlet |
| `stays-door-restaurant` | `GOVERNING-09` | 806, 524, 92, 94 | 94 | 113 | 09 stays doors | Glass cloche in a glass orb, We are a restaurant |
| `facility-pool` | `GOVERNING-10` | 1192, 278, 52, 42 | 52 | 62 | 10 facilities | Pool ladder glyph, Pool |
| `facility-gym` | `GOVERNING-10` | 1302, 278, 54, 40 | 54 | 65 | 10 facilities | Dumbbell glyph, Gym |
| `facility-parking` | `GOVERNING-10` | 1413, 278, 52, 42 | 52 | 62 | 10 facilities | Car glyph, Parking (hotel) |
| `facility-restaurant` | `GOVERNING-10` | 1199, 364, 38, 48 | 48 | 58 | 10 facilities | Fork and knife glyph, Restaurant |
| `facility-airport-shuttle` | `GOVERNING-10` | 1305, 366, 50, 46 | 50 | 60 | 10 facilities | Minibus glyph, Airport shuttle |
| `facility-generator` | `GOVERNING-10` | 1416, 366, 46, 46 | 46 | 55 | 10 facilities | Generator with a bolt glyph, Generator (hotel) |
| `facility-wifi` | `GOVERNING-10` | 1214, 457, 54, 44 | 54 | 65 | 10 facilities | Wi-Fi glyph, WiFi (hotel) |
| `facility-air-conditioning` | `GOVERNING-10` | 1382, 456, 46, 46 | 46 | 55 | 10 facilities | Snowflake glyph, Air conditioning (hotel) |
| `add-tile` | `GOVERNING-10` | 443, 556, 44, 44 | 44 | 53 | 10 room types | Plus on a small glass tile, Add a room type |
| `shortlet-entire-flat` | `GOVERNING-11` | 86, 186, 66, 64 | 66 | 79 | 11 your place | Glass apartment block on a plinth, Entire flat (tick badge retouched out) |
| `shortlet-whole-house` | `GOVERNING-11` | 196, 188, 62, 60 | 62 | 74 | 11 your place | Glass house on a plinth, Whole house |
| `shortlet-private-room` | `GOVERNING-11` | 293, 188, 62, 60 | 62 | 74 | 11 your place | Glass object on a plinth captioned Private room; the render drew a car |
| `restaurant-plate-orb` | `GOVERNING-11` | 812, 108, 110, 106 | 110 | 132 | 11 your restaurant | Plate, fork and knife before a glass cloche, Your restaurant header |
| `notify-listing-live` | `GOVERNING-12` | 813, 261, 54, 54 | 54 | 65 | 12 notification centre | House on a lit glass tile, Your listing is live |
| `notify-message` | `GOVERNING-12` | 813, 345, 54, 54 | 54 | 65 | 12 notification centre | Speech bubble on a glass tile, New message |
| `notify-viewed` | `GOVERNING-12` | 813, 416, 54, 54 | 54 | 65 | 12 notification centre | Eye on a glass tile, Your listing was viewed |
| `notify-approved` | `GOVERNING-12` | 813, 486, 54, 54 | 54 | 65 | 12 notification centre | Tick in a ring on an emerald glass tile, Listing approved |
| `notify-reminder` | `GOVERNING-12` | 813, 553, 54, 54 | 54 | 65 | 12 notification centre | Bell on a glass tile, Reminder |
| `notify-follower` | `GOVERNING-12` | 813, 619, 54, 54 | 54 | 65 | 12 notification centre | Person on a glass tile, New follower |
| `notify-system` | `GOVERNING-12` | 813, 750, 54, 54 | 54 | 65 | 12 notification centre | Info glyph on a glass tile, System update |
| `admin-avatar-orb` | `GOVERNING-12` | 307, 96, 40, 42 | 42 | 50 | 12 review queue | Person in a glass orb, the review desk's admin chip |

## Stage (cut with its ground, feathered, not keyed)

| Name | Render | Box (left, top, w, h) | Source px | Screen | What it is |
| --- | --- | --- | --- | --- | --- |
| `hotel-scene` | `GOVERNING-10` | 55, 256, 310, 122 | 310 x 122 | 10 your hotel, 09 set up a hotel | The glowing glass hotel before its palms and pool at night, Your hotel header (09 draws the same scene smaller). Three small lettering-like panels on the facade retouched blank |

## Suggested `RENDER_CROPS` entries for `scripts/icon-manifest.mjs`

Paste inside `RENDER_CROPS`. The `render` path is relative to
`docs/design/references/`, as every existing entry is. Three need a
treatment the manifest pipeline does not have yet: `list-rent-house` and
`shortlet-entire-flat` (a tick badge retouched out), `list-sale-sign` (the
board's lettering retouched blank), and `owner-map-pin` (a `keep` mask against the drawn map). Until
the slicer grows a retouch step, take those four from this folder rather than
re-cutting them raw.

```js
  /* roles/: the platform identity pack (Session B, docs/SESSION_B_SCOPE.md section 10). */
  "home-buy-tile": {
    render: "roles/GOVERNING-01-switch-home-sheet-drawer.png",
    box: { left: 77, top: 387, width: 75, height: 76 },
    native: 76,
    what: "House glyph on a lit glass tile, the home Buy quick tile",
  },
  "home-rent-tile": {
    render: "roles/GOVERNING-01-switch-home-sheet-drawer.png",
    box: { left: 159, top: 387, width: 75, height: 76 },
    native: 76,
    what: "Key glyph on a lit glass tile, the home Rent quick tile",
  },
  "home-manage-tile": {
    render: "roles/GOVERNING-01-switch-home-sheet-drawer.png",
    box: { left: 241, top: 387, width: 75, height: 76 },
    native: 76,
    what: "Building glyph on a lit glass tile, the home Manage quick tile",
  },
  "home-invest-tile": {
    render: "roles/GOVERNING-01-switch-home-sheet-drawer.png",
    box: { left: 405, top: 387, width: 75, height: 76 },
    native: 76,
    what: "Rising chart glyph on a lit glass tile, the home Invest quick tile",
  },
  "switch-owner-orb": {
    render: "roles/GOVERNING-01-switch-home-sheet-drawer.png",
    box: { left: 1080, top: 582, width: 74, height: 74 },
    native: 74,
    what: "House glyph in a glass orb, the Owner workspace (drawer Switch profile row; the sheet's Owner row draws the same orb smaller)",
  },
  "switch-agent-orb": {
    render: "roles/GOVERNING-01-switch-home-sheet-drawer.png",
    box: { left: 578, top: 497, width: 62, height: 64 },
    native: 64,
    what: "Key glyph in a glass orb, the Agent workspace row",
  },
  "switch-firm-orb": {
    render: "roles/GOVERNING-01-switch-home-sheet-drawer.png",
    box: { left: 578, top: 587, width: 62, height: 64 },
    native: 64,
    what: "Building glyph in a glass orb, the firm workspace row",
  },
  "switch-add-orb": {
    render: "roles/GOVERNING-01-switch-home-sheet-drawer.png",
    box: { left: 578, top: 708, width: 62, height: 64 },
    native: 64,
    what: "Plus in a glass orb, Add a workspace (05 team and 09 sheet draw the same orb)",
  },
  "door-owner-house": {
    render: "roles/GOVERNING-02-add-workspace-chooser.png",
    box: { left: 112, top: 294, width: 114, height: 110 },
    native: 114,
    what: "3D glass house on its glass tile, the I own the property door",
  },
  "door-agent-key": {
    render: "roles/GOVERNING-02-add-workspace-chooser.png",
    box: { left: 114, top: 446, width: 108, height: 96 },
    native: 108,
    what: "3D glass key on its glass tile, the I am an agent door",
  },
  "door-firm-building": {
    render: "roles/GOVERNING-02-add-workspace-chooser.png",
    box: { left: 114, top: 583, width: 112, height: 104 },
    native: 112,
    what: "3D glass office block on its glass tile, the registered firm door",
  },
  "ask-person-tile": {
    render: "roles/GOVERNING-02-add-workspace-chooser.png",
    box: { left: 1078, top: 303, width: 84, height: 86 },
    native: 86,
    what: "Person glyph on a glass tile, Who you are",
  },
  "ask-pin-tile": {
    render: "roles/GOVERNING-02-add-workspace-chooser.png",
    box: { left: 1078, top: 439, width: 84, height: 86 },
    native: 86,
    what: "Map pin on a glass tile, Where the property is",
  },
  "ask-doc-shield-tile": {
    render: "roles/GOVERNING-02-add-workspace-chooser.png",
    box: { left: 1078, top: 573, width: 84, height: 86 },
    native: 86,
    what: "Document with a shield on a glass tile, What proves it is yours",
  },
  "ask-clock-tile": {
    render: "roles/GOVERNING-02-add-workspace-chooser.png",
    box: { left: 1077, top: 711, width: 54, height: 56 },
    native: 56,
    what: "Clock on a small glass tile, About five minutes",
  },
  "owner-house-orb": {
    render: "roles/GOVERNING-03-register-owner.png",
    box: { left: 282, top: 146, width: 76, height: 78 },
    native: 78,
    what: "House glyph in a lit glass orb, the owner registration header",
  },
  "owner-shield-tile": {
    render: "roles/GOVERNING-03-register-owner.png",
    box: { left: 56, top: 585, width: 56, height: 62 },
    native: 62,
    what: "Split shield on a glass tile, We check who you are",
  },
  "owner-map-pin": {
    render: "roles/GOVERNING-03-register-owner.png",
    box: { left: 552, top: 336, width: 54, height: 62 },
    native: 62,
    what: "Glass map pin, drawn over the map",
  },
  "doc-certificate-orb": {
    render: "roles/GOVERNING-03-register-owner.png",
    box: { left: 810, top: 284, width: 52, height: 52 },
    native: 52,
    what: "Document glyph in a glass orb, Certificate of Occupancy (Deed and I have none of these draw the same)",
  },
  "doc-consent-orb": {
    render: "roles/GOVERNING-03-register-owner.png",
    box: { left: 810, top: 400, width: 52, height: 52 },
    native: 52,
    what: "Document with a seal in a glass orb, Governor's consent",
  },
  "doc-survey-orb": {
    render: "roles/GOVERNING-03-register-owner.png",
    box: { left: 810, top: 457, width: 52, height: 52 },
    native: 52,
    what: "Plan sheet in a glass orb, Survey plan",
  },
  "doc-utility-orb": {
    render: "roles/GOVERNING-03-register-owner.png",
    box: { left: 810, top: 513, width: 52, height: 52 },
    native: 52,
    what: "Bill sheet in a glass orb, Utility bill in your name",
  },
  "ownership-proof-orb": {
    render: "roles/GOVERNING-03-register-owner.png",
    box: { left: 1043, top: 148, width: 72, height: 72 },
    native: 72,
    what: "House outline with a key in a dark glass orb, the proof of ownership header",
  },
  "info-orb": {
    render: "roles/GOVERNING-03-register-owner.png",
    box: { left: 816, top: 666, width: 40, height: 40 },
    native: 40,
    what: "Lit round info glyph, the calm info panel",
  },
  "owner-set-up-house": {
    render: "roles/GOVERNING-03-register-owner.png",
    box: { left: 1228, top: 222, width: 212, height: 168 },
    native: 212,
    what: "3D glass house with a tick badge on a glowing plinth, You are set up as an owner",
  },
  "agent-id-card": {
    render: "roles/GOVERNING-04-register-agent.png",
    box: { left: 459, top: 360, width: 94, height: 90 },
    native: 94,
    what: "3D glass ID card, Take a photo of your ID",
  },
  "agent-selfie-orb": {
    render: "roles/GOVERNING-04-register-agent.png",
    box: { left: 462, top: 495, width: 88, height: 92 },
    native: 92,
    what: "Person in a lit glass orb, Take a selfie",
  },
  "agent-key-plinth": {
    render: "roles/GOVERNING-04-register-agent.png",
    box: { left: 1210, top: 240, width: 228, height: 150 },
    native: 228,
    what: "3D glass key on a glass plinth, We are checking your details",
  },
  "firm-building-plinth": {
    render: "roles/GOVERNING-05-register-firm.png",
    box: { left: 1200, top: 280, width: 248, height: 178 },
    native: 248,
    what: "3D glass office block on a glowing plinth (05 screen 1 draws the same smaller)",
  },
  "firm-letter": {
    render: "roles/GOVERNING-05-register-firm.png",
    box: { left: 446, top: 311, width: 88, height: 88 },
    native: 88,
    what: "3D glass letter on a stand, Upload a letter from your principal",
  },
  "firm-stamp": {
    render: "roles/GOVERNING-05-register-firm.png",
    box: { left: 448, top: 452, width: 82, height: 94 },
    native: 94,
    what: "3D glass rubber stamp, Have your principal confirm you",
  },
  "list-rent-house": {
    render: "roles/GOVERNING-06-list-property-1-the-property.png",
    box: { left: 60, top: 278, width: 90, height: 94 },
    native: 94,
    what: "3D glass house on a plinth, To rent (tick badge retouched out)",
  },
  "list-sale-sign": {
    render: "roles/GOVERNING-06-list-property-1-the-property.png",
    box: { left: 176, top: 282, width: 82, height: 86 },
    native: 86,
    what: "3D glass for-sale sign on a plinth, For sale (the lettering on the board retouched blank)",
  },
  "list-land-plot": {
    render: "roles/GOVERNING-06-list-property-1-the-property.png",
    box: { left: 279, top: 280, width: 84, height: 90 },
    native: 90,
    what: "Glass land plot with a tree, Land",
  },
  "type-flat": {
    render: "roles/GOVERNING-06-list-property-1-the-property.png",
    box: { left: 66, top: 508, width: 70, height: 72 },
    native: 72,
    what: "Glass apartment block, Flat",
  },
  "type-duplex": {
    render: "roles/GOVERNING-06-list-property-1-the-property.png",
    box: { left: 178, top: 508, width: 70, height: 72 },
    native: 72,
    what: "Glass two-storey house, Duplex",
  },
  "type-bungalow": {
    render: "roles/GOVERNING-06-list-property-1-the-property.png",
    box: { left: 287, top: 510, width: 70, height: 72 },
    native: 72,
    what: "Glass bungalow, Bungalow",
  },
  "type-self-contain": {
    render: "roles/GOVERNING-06-list-property-1-the-property.png",
    box: { left: 68, top: 638, width: 70, height: 70 },
    native: 70,
    what: "Glass small house, Self contain",
  },
  "type-shop": {
    render: "roles/GOVERNING-06-list-property-1-the-property.png",
    box: { left: 176, top: 645, width: 70, height: 68 },
    native: 70,
    what: "Glass shop front with an awning, Shop",
  },
  "type-office": {
    render: "roles/GOVERNING-06-list-property-1-the-property.png",
    box: { left: 288, top: 648, width: 70, height: 68 },
    native: 70,
    what: "Glass office block, Office",
  },
  "room-bedrooms": {
    render: "roles/GOVERNING-06-list-property-1-the-property.png",
    box: { left: 806, top: 258, width: 56, height: 58 },
    native: 58,
    what: "Bed glyph on a soft glass tile, Bedrooms",
  },
  "room-bathrooms": {
    render: "roles/GOVERNING-06-list-property-1-the-property.png",
    box: { left: 806, top: 343, width: 56, height: 60 },
    native: 60,
    what: "Shower glyph on a soft glass tile, Bathrooms",
  },
  "room-toilets": {
    render: "roles/GOVERNING-06-list-property-1-the-property.png",
    box: { left: 806, top: 425, width: 56, height: 60 },
    native: 60,
    what: "Toilet glyph on a soft glass tile, Toilets",
  },
  "room-size": {
    render: "roles/GOVERNING-06-list-property-1-the-property.png",
    box: { left: 806, top: 512, width: 56, height: 66 },
    native: 66,
    what: "Measured square glyph on a soft glass tile, Size",
  },
  "room-furnishing": {
    render: "roles/GOVERNING-06-list-property-1-the-property.png",
    box: { left: 806, top: 616, width: 56, height: 64 },
    native: 64,
    what: "Sofa glyph on a soft glass tile, Furnishing",
  },
  "room-floor": {
    render: "roles/GOVERNING-06-list-property-1-the-property.png",
    box: { left: 806, top: 712, width: 56, height: 62 },
    native: 62,
    what: "Stair glyph on a soft glass tile, Floor",
  },
  "condition-fair": {
    render: "roles/GOVERNING-06-list-property-1-the-property.png",
    box: { left: 1182, top: 312, width: 56, height: 56 },
    native: 56,
    what: "House glyph in a glass orb, Fair condition",
  },
  "condition-good": {
    render: "roles/GOVERNING-06-list-property-1-the-property.png",
    box: { left: 1352, top: 312, width: 74, height: 58 },
    native: 74,
    what: "Glass house, Good condition",
  },
  "condition-new": {
    render: "roles/GOVERNING-06-list-property-1-the-property.png",
    box: { left: 1182, top: 444, width: 58, height: 62 },
    native: 62,
    what: "Glass house with a bow, New",
  },
  "condition-off-plan": {
    render: "roles/GOVERNING-06-list-property-1-the-property.png",
    box: { left: 1352, top: 444, width: 76, height: 62 },
    native: 76,
    what: "Glass tower crane, Off plan",
  },
  "light-bulb-plinth": {
    render: "roles/GOVERNING-07-list-property-2-light-water-media.png",
    box: { left: 282, top: 152, width: 94, height: 114 },
    native: 114,
    what: "3D glass light bulb on a plinth, the Light step header",
  },
  "power-sun": {
    render: "roles/GOVERNING-07-list-property-2-light-water-media.png",
    box: { left: 64, top: 306, width: 42, height: 42 },
    native: 42,
    what: "Sun glyph, 24 hours",
  },
  "power-clock-orb": {
    render: "roles/GOVERNING-07-list-property-2-light-water-media.png",
    box: { left: 228, top: 306, width: 42, height: 42 },
    native: 42,
    what: "Alarm clock in a glass orb, 16 to 20 hours (8 to 12 draws the same)",
  },
  "none-orb": {
    render: "roles/GOVERNING-07-list-property-2-light-water-media.png",
    box: { left: 228, top: 411, width: 42, height: 42 },
    native: 42,
    what: "Prohibition circle in a glass orb, Less than 8 hours, None, No running water",
  },
  "power-inverter": {
    render: "roles/GOVERNING-07-list-property-2-light-water-media.png",
    box: { left: 64, top: 642, width: 42, height: 42 },
    native: 42,
    what: "Inverter glyph, Inverter",
  },
  "power-solar": {
    render: "roles/GOVERNING-07-list-property-2-light-water-media.png",
    box: { left: 229, top: 643, width: 44, height: 40 },
    native: 44,
    what: "Solar panel glyph, Solar",
  },
  "water-drop-plinth": {
    render: "roles/GOVERNING-07-list-property-2-light-water-media.png",
    box: { left: 650, top: 162, width: 94, height: 90 },
    native: 94,
    what: "3D glass water drop on a plinth, the Water step header",
  },
  "water-borehole": {
    render: "roles/GOVERNING-07-list-property-2-light-water-media.png",
    box: { left: 604, top: 324, width: 54, height: 52 },
    native: 54,
    what: "Borehole pump on a base, Borehole (water source)",
  },
  "water-well": {
    render: "roles/GOVERNING-07-list-property-2-light-water-media.png",
    box: { left: 444, top: 440, width: 50, height: 50 },
    native: 50,
    what: "Well with a bucket, Well",
  },
  "amenity-parking": {
    render: "roles/GOVERNING-07-list-property-2-light-water-media.png",
    box: { left: 818, top: 280, width: 60, height: 46 },
    native: 60,
    what: "Car glyph, Parking",
  },
  "amenity-security": {
    render: "roles/GOVERNING-07-list-property-2-light-water-media.png",
    box: { left: 934, top: 278, width: 48, height: 50 },
    native: 50,
    what: "Shield glyph, Security",
  },
  "amenity-water-heater": {
    render: "roles/GOVERNING-07-list-property-2-light-water-media.png",
    box: { left: 1044, top: 278, width: 46, height: 50 },
    native: 50,
    what: "Water heater glyph, Water heater",
  },
  "amenity-air-conditioning": {
    render: "roles/GOVERNING-07-list-property-2-light-water-media.png",
    box: { left: 818, top: 388, width: 60, height: 40 },
    native: 60,
    what: "Split unit glyph, Air conditioning",
  },
  "amenity-wifi": {
    render: "roles/GOVERNING-07-list-property-2-light-water-media.png",
    box: { left: 928, top: 384, width: 52, height: 48 },
    native: 52,
    what: "Wi-Fi glyph, WiFi",
  },
  "amenity-fitted-kitchen": {
    render: "roles/GOVERNING-07-list-property-2-light-water-media.png",
    box: { left: 1036, top: 382, width: 52, height: 50 },
    native: 52,
    what: "Cooker glyph, Fitted kitchen",
  },
  "amenity-wardrobe": {
    render: "roles/GOVERNING-07-list-property-2-light-water-media.png",
    box: { left: 826, top: 488, width: 44, height: 50 },
    native: 50,
    what: "Wardrobe glyph, Wardrobe",
  },
  "amenity-balcony": {
    render: "roles/GOVERNING-07-list-property-2-light-water-media.png",
    box: { left: 930, top: 488, width: 50, height: 50 },
    native: 50,
    what: "Balcony glyph, Balcony",
  },
  "amenity-gated-estate": {
    render: "roles/GOVERNING-07-list-property-2-light-water-media.png",
    box: { left: 1036, top: 490, width: 54, height: 48 },
    native: 54,
    what: "Gate glyph, Gated estate",
  },
  "amenity-borehole": {
    render: "roles/GOVERNING-07-list-property-2-light-water-media.png",
    box: { left: 828, top: 596, width: 44, height: 50 },
    native: 50,
    what: "Wellhead glyph, Borehole (amenity)",
  },
  "amenity-generator": {
    render: "roles/GOVERNING-07-list-property-2-light-water-media.png",
    box: { left: 928, top: 600, width: 52, height: 46 },
    native: 52,
    what: "Generator glyph, Generator (the backup power row draws the same smaller)",
  },
  "amenity-running-water": {
    render: "roles/GOVERNING-07-list-property-2-light-water-media.png",
    box: { left: 1040, top: 596, width: 52, height: 48 },
    native: 52,
    what: "Tap glyph, Running water (Treated mains draws the same tap)",
  },
  "amenity-pop-ceiling": {
    render: "roles/GOVERNING-07-list-property-2-light-water-media.png",
    box: { left: 818, top: 700, width: 60, height: 42 },
    native: 60,
    what: "Recessed ceiling glyph, POP ceiling",
  },
  "amenity-tiled-floor": {
    render: "roles/GOVERNING-07-list-property-2-light-water-media.png",
    box: { left: 926, top: 704, width: 56, height: 42 },
    native: 56,
    what: "Floor tiles glyph, Tiled floor",
  },
  "amenity-garden": {
    render: "roles/GOVERNING-07-list-property-2-light-water-media.png",
    box: { left: 1046, top: 698, width: 42, height: 52 },
    native: 52,
    what: "Potted plant glyph, Garden",
  },
  "media-camera-plinth": {
    render: "roles/GOVERNING-07-list-property-2-light-water-media.png",
    box: { left: 1444, top: 166, width: 54, height: 66 },
    native: 66,
    what: "Glass camera on a small plinth, the Photos step header",
  },
  "media-video-tile": {
    render: "roles/GOVERNING-07-list-property-2-light-water-media.png",
    box: { left: 1188, top: 606, width: 48, height: 52 },
    native: 52,
    what: "Film strip glyph on a glass tile, Video walkthrough",
  },
  "price-rent-house": {
    render: "roles/GOVERNING-08-list-property-3-money-and-id.png",
    box: { left: 436, top: 292, width: 52, height: 52 },
    native: 52,
    what: "House glyph on a soft glass tile, Rent (annual)",
  },
  "price-agency-person": {
    render: "roles/GOVERNING-08-list-property-3-money-and-id.png",
    box: { left: 436, top: 367, width: 52, height: 48 },
    native: 52,
    what: "Person at a desk glyph on a soft glass tile, Agency fee",
  },
  "price-legal-doc": {
    render: "roles/GOVERNING-08-list-property-3-money-and-id.png",
    box: { left: 436, top: 440, width: 52, height: 52 },
    native: 52,
    what: "Document and pen glyph on a soft glass tile, Legal fee",
  },
  "price-caution-shield": {
    render: "roles/GOVERNING-08-list-property-3-money-and-id.png",
    box: { left: 436, top: 514, width: 52, height: 52 },
    native: 52,
    what: "Shield glyph on a soft glass tile, Caution deposit",
  },
  "price-service-gear": {
    render: "roles/GOVERNING-08-list-property-3-money-and-id.png",
    box: { left: 436, top: 594, width: 52, height: 52 },
    native: 52,
    what: "Gear glyph on a soft glass tile, Service charge",
  },
  "price-total-coins": {
    render: "roles/GOVERNING-08-list-property-3-money-and-id.png",
    box: { left: 437, top: 682, width: 64, height: 68 },
    native: 68,
    what: "Stacked coins on a glass tile, Total to move in",
  },
  "review-sent-house": {
    render: "roles/GOVERNING-08-list-property-3-money-and-id.png",
    box: { left: 1238, top: 168, width: 186, height: 146 },
    native: 186,
    what: "3D glass house with a tick badge on a glowing plinth, Sent for review",
  },
  "stays-hotels-bed": {
    render: "roles/GOVERNING-09-stays-home-switch-and-doors.png",
    box: { left: 76, top: 472, width: 94, height: 74 },
    native: 94,
    what: "3D glass bed on a plinth, Hotels",
  },
  "stays-shortlets-house": {
    render: "roles/GOVERNING-09-stays-home-switch-and-doors.png",
    box: { left: 248, top: 470, width: 94, height: 72 },
    native: 94,
    what: "3D glass house on a plinth, Shortlets",
  },
  "stays-restaurants-cloche": {
    render: "roles/GOVERNING-09-stays-home-switch-and-doors.png",
    box: { left: 82, top: 604, width: 90, height: 74 },
    native: 90,
    what: "3D glass cloche on a plinth, Restaurants",
  },
  "stays-nearby-pin": {
    render: "roles/GOVERNING-09-stays-home-switch-and-doors.png",
    box: { left: 258, top: 604, width: 76, height: 74 },
    native: 76,
    what: "3D glass map pin on a plinth, Nearby (06 where is it draws the same pin on its disc, over the map, where it cannot be keyed clean)",
  },
  "stays-switch-person-orb": {
    render: "roles/GOVERNING-09-stays-home-switch-and-doors.png",
    box: { left: 434, top: 292, width: 70, height: 70 },
    native: 70,
    what: "Person in a glass orb, Personal (stays sheet)",
  },
  "stays-switch-hotel-orb": {
    render: "roles/GOVERNING-09-stays-home-switch-and-doors.png",
    box: { left: 434, top: 396, width: 70, height: 70 },
    native: 70,
    what: "Hotel block in a glass orb, a hotel workspace",
  },
  "stays-door-hotel": {
    render: "roles/GOVERNING-09-stays-home-switch-and-doors.png",
    box: { left: 806, top: 280, width: 92, height: 94 },
    native: 94,
    what: "Glass hotel block in a glass orb, We are a hotel",
  },
  "stays-door-shortlet": {
    render: "roles/GOVERNING-09-stays-home-switch-and-doors.png",
    box: { left: 806, top: 402, width: 92, height: 94 },
    native: 94,
    what: "Glass bed in a glass orb, I run a shortlet",
  },
  "stays-door-restaurant": {
    render: "roles/GOVERNING-09-stays-home-switch-and-doors.png",
    box: { left: 806, top: 524, width: 92, height: 94 },
    native: 94,
    what: "Glass cloche in a glass orb, We are a restaurant",
  },
  "facility-pool": {
    render: "roles/GOVERNING-10-set-up-hotel.png",
    box: { left: 1192, top: 278, width: 52, height: 42 },
    native: 52,
    what: "Pool ladder glyph, Pool",
  },
  "facility-gym": {
    render: "roles/GOVERNING-10-set-up-hotel.png",
    box: { left: 1302, top: 278, width: 54, height: 40 },
    native: 54,
    what: "Dumbbell glyph, Gym",
  },
  "facility-parking": {
    render: "roles/GOVERNING-10-set-up-hotel.png",
    box: { left: 1413, top: 278, width: 52, height: 42 },
    native: 52,
    what: "Car glyph, Parking (hotel)",
  },
  "facility-restaurant": {
    render: "roles/GOVERNING-10-set-up-hotel.png",
    box: { left: 1199, top: 364, width: 38, height: 48 },
    native: 48,
    what: "Fork and knife glyph, Restaurant",
  },
  "facility-airport-shuttle": {
    render: "roles/GOVERNING-10-set-up-hotel.png",
    box: { left: 1305, top: 366, width: 50, height: 46 },
    native: 50,
    what: "Minibus glyph, Airport shuttle",
  },
  "facility-generator": {
    render: "roles/GOVERNING-10-set-up-hotel.png",
    box: { left: 1416, top: 366, width: 46, height: 46 },
    native: 46,
    what: "Generator with a bolt glyph, Generator (hotel)",
  },
  "facility-wifi": {
    render: "roles/GOVERNING-10-set-up-hotel.png",
    box: { left: 1214, top: 457, width: 54, height: 44 },
    native: 54,
    what: "Wi-Fi glyph, WiFi (hotel)",
  },
  "facility-air-conditioning": {
    render: "roles/GOVERNING-10-set-up-hotel.png",
    box: { left: 1382, top: 456, width: 46, height: 46 },
    native: 46,
    what: "Snowflake glyph, Air conditioning (hotel)",
  },
  "add-tile": {
    render: "roles/GOVERNING-10-set-up-hotel.png",
    box: { left: 443, top: 556, width: 44, height: 44 },
    native: 44,
    what: "Plus on a small glass tile, Add a room type",
  },
  "shortlet-entire-flat": {
    render: "roles/GOVERNING-11-set-up-shortlet-and-restaurant.png",
    box: { left: 86, top: 186, width: 66, height: 64 },
    native: 66,
    what: "Glass apartment block on a plinth, Entire flat (tick badge retouched out)",
  },
  "shortlet-whole-house": {
    render: "roles/GOVERNING-11-set-up-shortlet-and-restaurant.png",
    box: { left: 196, top: 188, width: 62, height: 60 },
    native: 62,
    what: "Glass house on a plinth, Whole house",
  },
  "shortlet-private-room": {
    render: "roles/GOVERNING-11-set-up-shortlet-and-restaurant.png",
    box: { left: 293, top: 188, width: 62, height: 60 },
    native: 62,
    what: "Glass object on a plinth captioned Private room; the render drew a car",
  },
  "restaurant-plate-orb": {
    render: "roles/GOVERNING-11-set-up-shortlet-and-restaurant.png",
    box: { left: 812, top: 108, width: 110, height: 106 },
    native: 110,
    what: "Plate, fork and knife before a glass cloche, Your restaurant header",
  },
  "notify-listing-live": {
    render: "roles/GOVERNING-12-review-desk-notification-search-by-id.png",
    box: { left: 813, top: 261, width: 54, height: 54 },
    native: 54,
    what: "House on a lit glass tile, Your listing is live",
  },
  "notify-message": {
    render: "roles/GOVERNING-12-review-desk-notification-search-by-id.png",
    box: { left: 813, top: 345, width: 54, height: 54 },
    native: 54,
    what: "Speech bubble on a glass tile, New message",
  },
  "notify-viewed": {
    render: "roles/GOVERNING-12-review-desk-notification-search-by-id.png",
    box: { left: 813, top: 416, width: 54, height: 54 },
    native: 54,
    what: "Eye on a glass tile, Your listing was viewed",
  },
  "notify-approved": {
    render: "roles/GOVERNING-12-review-desk-notification-search-by-id.png",
    box: { left: 813, top: 486, width: 54, height: 54 },
    native: 54,
    what: "Tick in a ring on an emerald glass tile, Listing approved",
  },
  "notify-reminder": {
    render: "roles/GOVERNING-12-review-desk-notification-search-by-id.png",
    box: { left: 813, top: 553, width: 54, height: 54 },
    native: 54,
    what: "Bell on a glass tile, Reminder",
  },
  "notify-follower": {
    render: "roles/GOVERNING-12-review-desk-notification-search-by-id.png",
    box: { left: 813, top: 619, width: 54, height: 54 },
    native: 54,
    what: "Person on a glass tile, New follower",
  },
  "notify-system": {
    render: "roles/GOVERNING-12-review-desk-notification-search-by-id.png",
    box: { left: 813, top: 750, width: 54, height: 54 },
    native: 54,
    what: "Info glyph on a glass tile, System update",
  },
  "admin-avatar-orb": {
    render: "roles/GOVERNING-12-review-desk-notification-search-by-id.png",
    box: { left: 307, top: 96, width: 40, height: 42 },
    native: 42,
    what: "Person in a glass orb, the review desk's admin chip",
  },
```
