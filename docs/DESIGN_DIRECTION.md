# The Vallo design direction: the images are the law

Written 18 September 2026 on the founder's ruling. This file governs the
entire frontend visual sweep. **The reference images in
`docs/design/references/` are the target: the shipped product must look as
close to identical to them as the web can honestly render.** The founder's
words: "make it looks almost exactly if not exactly", "this frontend work is
the most important part for this build". `docs/design/CATALOGUE.md` maps
every file in that folder to its area, flags duplicates (keepers marked) and
lists the off-brand details that must be translated rather than copied.

## 1. How to work from a reference image

1. **Open the image and look at it before building the surface, and again
   after.** Claude Code reads images; every frontend worker builds with the
   governing image open and re-audits the shipped screen against it side by
   side. A surface is not done until a screenshot of the built page and the
   reference read as the same design.
2. **Match composition, hierarchy, glow, spacing rhythm, glass depth, and
   mood exactly.** Implement through the token system (the render's glass is
   our `.nf-glass` ladder, its glow is our glow scale, its type is our
   Poppins and Inter). Where the render's geometry disagrees with a token,
   extend the token system deliberately (new depth, new glow rung) rather
   than hardcoding, and record it in the ledger.
3. **Translate, never copy, the render's mistakes.** AI renders contain
   impossibilities: garbled text, fake blur, inconsistent spacing, and
   occasional off-brand details flagged in the catalogue. The rules that
   OVERRIDE any render, always: one blue family (any warm hue in a render
   becomes its blue-family equivalent: gold rating stars ship blue, the
   off-brand crypto render's gold and orange are ignored entirely and the
   crypto surface is built in the register), no text baked into icons
   (the "HOTEL"-lettered icon in three renders is never cropped or
   copied), real copy never lorem (the garbled AI text in the landing
   fullpage renders is never transcribed; write real copy in its place),
   honest data never invented counts, and no logic errors copied (one
   render pairs yearly rent with nightly date pickers; the market decides
   the panel, as built). **Control shape follows the governing image, by
   the founder's identical-to-images ruling**: where a render shows pill
   chips and capsule buttons, ship them; where it shows rectangles, ship
   rectangles; extend the radius tokens to carry both and record the
   amendment of the old 14px control law in the ledger. The
   neon edge-glow around phone frames in the renders is presentation
   framing for the image, not UI chrome; do not draw a glowing border
   around the real viewport.
4. **Areas with no reference inherit the register.** Every page the images
   do not cover (edit profile, notifications, verification, host wizard,
   agent console, stories, help, checkout and everything else) is designed
   in the same language: same glass, same glow discipline, same card
   anatomy, same rhythm, so the whole product reads as one object. The
   founder: "the ones we didn't create image should be done too in this
   idea".

## 2. The five governing images (founder-chosen, named in the folder)

- **`GOVERNING-landing-desktop-hero.png`**: the landing page's top. The
  built landing hero follows it: full-bleed dusk villa photograph (the
  matching background plate is in the asset set), glass top nav with logo
  left and Sign in / Get started right, breadcrumb overline
  (PROPERTY / STAYS / INVEST / MANAGE), the two-line headline with gradient
  "reimagined.", sub-line, two CTAs (Explore Properties primary, Explore
  Stays glass), city chips, the floating glass SEARCH PILL with
  Buy / Rent / Stay / Invest segments, a floating verified listing card on
  the photo, and beneath the fold the trusted-stats band and the
  "Everything you need in one platform" glass feature grid. **This is a
  desktop composition: derive the 390px version from it** (stacked, photo
  as the hero background with the calm left-third rule, search pill full
  width, feature grid two-up), keeping every element and the exact mood.
- **`GOVERNING-landing-desktop-fullpage.png`**: the whole landing scroll:
  feature chip row, community band with layered floating listing cards
  (including one honest Third party tag), How Vallo Works four steps,
  Explore-by-category photo tile grid, the Stays band, the take-Vallo-
  with-you app band, and the footer with newsletter field. The rebuilt
  landing follows this section order and treatment on desktop and phone.
- **`GOVERNING-feed-plus-bloom.png`**: the social feed. Location chip
  header, story ring row with "Your story" +, For You / Following glass
  toggle, post cards (avatar, verified tick, handle, time, text, photo,
  heart/repost/reply/share counts), and THE + BUTTON: a floating glass
  circle bottom-right above the dock that blooms open into three glass
  lozenge actions (Post, Story, Review) fanned on a curve with line
  glyphs. The founder: "make it exactly how it's please, when click it
  should be exactly like that". Build the bloom with real spring physics,
  reduced-motion fallback, and the three actions wired to the real
  composers.
- **`GOVERNING-chat-booking-card.png`**: messaging. Thread header with
  counterpart avatar, name, verified tick, context line and location; rich
  BOOKING CARD inline in the thread (photo, name, stars, location,
  check-in/check-out/guests grid, room row with price and nights chip,
  View booking details primary + Contact hotel glass buttons); bubbles
  (theirs glass-dark left, mine blue right with read ticks); composer with
  attach and send. Cards in chat are REAL and FORWARDABLE: listing and
  booking cards can be shared into any thread and render this way. The
  existing three thread faces restyle to this register.
- **`GOVERNING-flip-mid-turn.png`**: the side flip. The phone stays
  static; the SCREEN CONTENT rotates as a glass card mid-turn with a
  glowing edge, the incoming face carrying the glass building mark. The
  built `SideFlip` already does this mechanically; restyle the card edge,
  cover and glow to match this image's intensity.

## 3. Founder rulings on chrome (these override the renders where stated)

1. **The bottom dock has FIVE destinations plus context.** The renders show
   four; the founder chose five: on the Property side **Home, Search, Feed,
   More, Profile**; on the Stays side the first slot becomes **Stays**.
   "More" opens the side navigation drawer. The dock keeps the floating
   glass treatment, travelling active pill and per-side swap already
   built, restyled to the renders' dock look.
2. **The hamburger is incorporated even though the renders lack it.** The
   in-app header carries a hamburger (line glyph) that opens the side
   drawer, on every in-app page, both sides. Header anatomy: hamburger,
   logo lockup, bell with unread dot, avatar (per the feed render's
   header).
3. **The side drawer is a designed surface, per the drawer render** (see
   catalogue): user block at top (avatar, name, view profile), then the
   rows that are NOT in the dock: Messages, Notifications, Saved, Wallet,
   Bookings (Trips on Stays side), Inspections, AI Assistant, **Crypto**,
   workspace rows (Agent Mode where earned, Console where admin), Become
   an agent, Settings; at the foot the FLIP COIN as the star (two-faced
   glass coin, other side's mark, "Switch to Stays"/"Switch to Property"
   with one-line sub, edge tease on hover, spin on press) and the theme
   toggle beneath it.
4. **Crypto is a new side-nav feature.** A market surface driven by the
   CoinGecko API with GeckoTerminal for pair/DEX data: prices, movers,
   simple detail pages, in the glass register (this is also where wallet
   crypto funding via Yellow Card is surfaced). Server-side proxy route,
   key from the founder (`COINGECKO_API_KEY`), cached responses, graceful
   dark state until the key lands, display-only (no trading, no advice
   copy). No new colour: price-up is emerald, price-down is rose.
5. **Icons: the blue glass objects everywhere content icons appear.** The
   repo's glass pack (103 objects + light twins) is the source. Where a
   render uses a glass object we do not have (catalogue lists them), CROP
   it from the reference PNG, alpha-key it with the existing
   `scripts/cut-icon-ground.mjs` pipeline, file it through
   `scripts/icon-manifest.mjs` with a lowercase-hyphen name, and use it,
   provided it carries no baked text. Navigation stays on the stroked
   UiIcon tier restyled to the renders' line weight. No black-and-white
   content icons anywhere the renders show glass ones.
6. **Photography ships now.** The background plates and property photos in
   the reference folder (catalogue's ASSETS list) are the product's
   imagery: the landing hero plate behind the hero, the skyline plates
   behind sections, the aurora plate behind auth, and the property photos
   attached to the demo listings so cards and galleries finally show real
   rooms (bedroom, bathroom, kitchen, exteriors, hotel rooms, resort,
   restaurant). Wire them through the existing scene manifest and
   `listing_photos` seeding paths, sized and compressed properly
   (next/image, correct sizes, no multi-megabyte originals shipped raw).
7. **The wallet, profile, settings, stays and admin renders in the folder
   govern their surfaces** exactly as the five governing images do theirs;
   the catalogue names which file rules which page. Profile follows the
   new profile render (cover, avatar, counts, tabs); its children (edit
   profile, followers) inherit. Feed inner pages (post thread, place
   pages, stories) inherit the feed register.

## 4. The definition of done for every visual surface

A surface closes only when ALL of these hold:
1. Screenshot at 390px dark matches the governing image's composition,
   depth and mood side by side (the worker attaches the comparison to the
   ledger note).
2. The light theme is designed, not derived: same anatomy on paper per the
   existing light law.
3. Every control on the screen is FUNCTIONAL end to end (the ONE LAW):
   real action, real data, real state change, notification where deserved.
   Nothing ships as a picture of a feature.
4. Reduced motion, keyboard focus, live regions, safe areas and 44px taps
   survive the restyle.
5. Desktop is derived from the mobile character (rail world, wider grids),
   not invented fresh, except the landing which has its own desktop
   governing image.
6. `npx tsc --noEmit -p apps/web` and the narrow tests pass before the
   lead commits.
