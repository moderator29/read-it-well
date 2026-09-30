# Vallo marketing: the design brief

Everything in `scripts/marketing/` makes pictures of the live product for other people to see: App Store and Google Play screenshots, the first month of social posts, and the launch video. This is the one brief all of it follows, so that 100 images and a video look like one brand.

## 1. What Vallo is, in one breath

A Nigerian app for homes, hotels, shortlets and restaurants, with one account: rent or buy a home and see the full move-in cost before calling anyone, talk straight to the owner, landlord or agent inside the app, book a room, reserve a table, and pay without Vallo ever holding the money. English, Hausa, Yorùbá and Igbo. It is for everyone looking for a place and for owners, hosts, hotels and restaurants; it is **not** an agents' tool first.

## 2. Copy rules (non-negotiable; these are the product's own rules)

- **No em dashes** anywhere (the founder's rule, enforced in the product).
- **"Verified" only about people and businesses, never about listings or homes.** Say "owners, hosts, hotels and restaurants with the verified mark have been checked by a real person at Vallo". Never "verified listings", "verified homes".
- **No promise words without a mechanism:** no "safe", "safely", "secure", "protected", "guaranteed", "insured". "Vallo never holds your money" is true and may be said. Money moves "straight to the owner, the host or the business, through a licensed payment processor" (Paystack may be named).
- **"Vallo charges no inspection fee."** Confirmed by the founder on 30 September 2026, and on the live landing page ("No inspection fee"). It is about Vallo's own charges: say "Vallo charges no inspection fee", never that nobody will ask for one.
- **No valuation words:** never "worth", "valuation", "appraisal", "value of your home". Price Check shows what places nearby are *asking*.
- **No invented numbers:** no user counts, ratings, reviews, testimonials, "#1", "best", "cheapest", "thousands of listings". Amounts shown in pop-up cards are illustrative and must match amounts visible on the captured screens where one is shown (the example villa: rent ₦18,000,000 a year, move-in total ₦26,100,000; Lagoon Crest Resort ₦150,000 a night).
- **Launch line:** "Coming soon on iPhone and Android." Never draw Apple or Google logos, and never draw or imitate their store badges. The one exception is the films' live ending (video/FACTS.md, "The ending"): Apple's and Google's official badge files, unmodified, by their rules, published only once Vallo is in both stores.
- **Never show** an email address, a phone number, or a real person's name. The QA account's first name "omojuni" on the home greeting is acceptable; its email is not (the Settings capture is scrolled past it).
- Every listing, stay and restaurant live today is labelled Example on its own page. Do not crop an Example notice out on purpose, and do not claim anything on screen is available.

## 3. Brand

| Token | Value | Use |
|---|---|---|
| Ink | `#010118` | the app's night canvas |
| Deep navy | `#02063F` → `#010118` | dark grounds |
| Electric | `#0069FE` (600 `#0056D0`, 700 `#003F98`) | the brand blue, buttons, glows |
| Quiet blue | `#5C9FFF`, sky `#8FD3FF` | gradients on text, highlights |
| Paper | `#FFFFFF`, mist `#F3F7FF`, studio grey `#F2F3F6` | light grounds (like the reference mockups) |
| Warm accent | orange `#FF6B1A` → peach `#FFB27A` | sparingly: the orange of the onboarding art, sunsets in the photos |

- **Type:** Poppins 600/700 for headlines (tracking −0.03em, 2 lines max), Inter for everything else. Files: `apps/web/public/fonts/*.woff2` (Poppins 600/700 latin, Inter variable) and `scripts/marketing/node_modules/@fontsource/poppins` (other weights), `@fontsource/instrument-serif` for a rare editorial italic accent (one or two words, never a whole line), `@fontsource-variable/inter`.
- **Logo:** `apps/web/public/brand/vallo-icon.png` (app icon), `vallo-wordmark.png` (on dark), `vallo-wordmark-light.png` (on light), `vallo-mark.png`. Never recolour or stretch them.
- **Brand art:** `apps/web/public/brand/onboarding/step-1..4-dark.webp` (1080 × 1440): the product's own fuzzy 3D scenes (houses on blue velvet hills, a shield, chat bubbles and a lock, an orange arch with stairs). Use them as hero art and backgrounds; they match the reference mockups' style.
- **Photographs:** `apps/web/public/brand/photos/*.jpg` (dusk villas, pools, skylines, restaurants), the same photographs the product serves.
- **Stickers (the only decorative objects):** Microsoft Fluent 3D emoji, MIT licence, `scripts/marketing/node_modules/@lobehub/fluent-emoji-3d/assets/<codepoint>.webp` (256 px; never show larger than ~260 px on a 1320-wide canvas). Useful: house `1f3e0`, house with garden `1f3e1`, key `1f511`, bell `1f514`, calendar `1f4c5`, speech balloon `1f4ac`, check `2705`, sparkles `2728`, party popper `1f389`, plate `1f37d-fe0f`, bellhop bell `1f6ce-fe0f`, bed `1f6cf-fe0f`, luggage `1f9f3`, palm `1f334`, sunset `1f305`, cityscape `1f3d9-fe0f`, hotel `1f3e8`, credit card `1f4b3`, bank `1f3e6`, lock `1f512`, magnifier `1f50d`, pin `1f4cd`, Africa globe `1f30d`, robot `1f916`, light bulb `1f4a1`, blue heart `1f499`, star `2b50`, glowing star `1f31f`, rocket `1f680`, handshake `1f91d`, waving hand `1f44b`, mobile phone `1f4f1`, laptop `1f4bb`, megaphone `1f4e3`, memo `1f4dd`, clock `1f552`, clinking glasses `1f942`, stopwatch `23f1-fe0f`.
- **Line icons:** `scripts/marketing/node_modules/lucide-static/icons/<name>.svg` (ISC) inside pills and pop-up cards.
- **Do not use** the product's own glass objects (`brand/glass/`) or its 3D icon set (`brand/3d/`) as extra decoration. They may appear only where they are part of a captured screen.

## 4. Pop-up cards (the "You got paid!" moments)

Floating cards that overlap a phone's edge, like a notification that just arrived. Glass: white at 92% (on light) or navy `rgb(10 16 60 / .82)` with a 1.5 px `rgb(120 170 255 / .35)` edge (on dark), backdrop blur, radius 28–36 px, soft long shadow. An icon chip (Fluent sticker or lucide icon on a tinted circle), a bold title, one line under it, optional amount, optional "now". Only phrasing that describes what the product really does:

- "Payment settled · ₦1,800,000 straight to your bank" (for an owner; never "held" or "wallet")
- "Room booked · Lagoon Crest Resort · 3 nights"
- "Table for 2 · Tonight, 8:00 PM · Harbour Lights Kitchen"
- "New message · The owner replied"
- "Inspection set · Saturday, 11:00 AM"
- "Agreement confirmed by both of you"
- "Checked by a person · Verified mark added"
- "New home for your saved search"
- "Passcode on · Vallo locks when you step away"

## 5. Phones

- App Store images: the island handset (camera pill at the top). Google Play images: the Android handset (punch hole). Social posts: either.
- Photoreal phones come from the 3D studio in `scripts/marketing/phone3d/` (see its README). Screens are full displays with the status bar composited: `docs/marketing/screens/<id>-ios.png` and `<id>-android.png` (1320 × 2868), built by `scripts/marketing/screens.mjs` from the captures in `docs/marketing/source/`.
- **Store images show whole phones**, big and clear, never cut by the image edge (the founder's ruling). Close-up crops and steep angles belong to social posts and the video.

## 6. Quality bar

The references in the repo root (`IMG_6727.png` … `IMG_6739.jpeg`) and `docs/design/references/` set the bar: Dribbble-grade product renders, generous space, one idea per image, crisp type, real depth. Every image is reviewed at full size before it ships: no text touching an edge, nothing cropped by accident, no blurry screen, no two images alike.

## 7. Sizes and where files go

| Output | Size | Folder |
|---|---|---|
| App Store (6.9") | 1320 × 2868 PNG, no alpha | `docs/store/screenshots/app-store/` |
| Google Play phone | 1440 × 2560 PNG, no alpha, under 8 MB | `docs/store/screenshots/google-play/` |
| Play feature graphic | 1024 × 500 | `docs/store/screenshots/google-play/` |
| Instagram / Facebook feed | 1080 × 1350 (4:5) or 1080 × 1080 | `docs/marketing/social/` |
| Stories / Reels / TikTok cover | 1080 × 1920 | `docs/marketing/social/` |
| X and LinkedIn | 1600 × 900 | `docs/marketing/social/` |
| X header | 1500 × 500 | `docs/marketing/social/` |
| Launch video | 1920 × 1080, 60 fps, H.264 + AAC | `docs/marketing/video/` |

All stills are rendered at 2× in Chromium and brought down with a Lanczos filter, so they are sharp at every size.
