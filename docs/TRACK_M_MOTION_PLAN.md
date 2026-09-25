# Track M: motion plan and reference check

25 September 2026. This is the plan, written before the full pass as the founder asked. Nothing in it touches payments, migrations or earlier tracks. Brand colours, logo and the icon set stay exactly as they are.

## 1. The references

### Reference sites

- **apartments.com, Airbnb and Zillow could not be opened live.** This environment's network policy blocks all three, and it returns `EGRESS_BLOCKED`. The notes below come from their published write-ups and from well-known patterns, not from a live inspection.
  - **Apartments.com:** its redesign put a single city, state or zip search first, added natural-language AI search, and rebuilt property maps.
  - **Airbnb:** it describes motion as "conversational". Transitions keep context between states; flourishes are short and small. Other patterns:
    - a category icon strip that animates only the selected icon;
    - a search bar that expands into its full form;
    - photo carousels on cards;
    - a heart that pops on save;
    - a floating "Show map" pill that swaps list and map.
  - **Zillow:** a list and map split, a sticky filter bar, a save-search control, a sort menu, and cards that lift slightly on hover.
- **If the founder wants a specific apartments.com moment copied, a screen recording or screenshots are the only way it reaches me.**

### The 4 trading-app screenshots (received)

These are the side-drawer, bottom-capsule and sub-tab reference.

| Screen | What I take from it |
|---|---|
| Side drawer | Full-panel dark, with no card around the profile. The avatar sits unboxed at the top, then the name, @handle and a one-line bio. Below that, grouped sections of plain icon rows with no tiles or boxes. |
| Account screen | Grouped rows (Account, Wallet, Preferences) with a leading icon, a label and a chevron. A toggle is a full row, not a bare switch. This is the model for the theme row. |
| Profile page | A sub-tab strip (Open, Closed, Replies, Rewards) under the header: text tabs with a sliding underline. |
| Home feed | A floating capsule of 4 icons, with a separate round button beside it rather than inside it. The header carries a balance and a bell only. |

**Question for the founder:** are these 4 the full set for the side nav and bottom nav? The Track M message said more images were coming. Until you confirm, I will not change the side nav or bottom nav.

### The apartments.com splash (4 frames, sent after the first draft)

The frames are at 3.53 s, about 4 s, 4.58 s and 5.67 s. From them:

- **The mark turns.** The pinwheel rotates in 3D, and its petals shear and fold with motion blur. It settles flat and sharp.
- **The wordmark arrives letter by letter.** Each new letter comes in from depth: first blurred, grey and slightly stretched, then black and sharp. The letters behind it are already settled ("Apa" sharp, the "r" still blurred).
- **The whole lockup zooms.** It starts small, grows as the letters arrive, and ends at full size, centred on a clean field.
- **The effect** is a brand that assembles itself in front of you, not one that fades in. It feels expensive because blur, scale and rotation all resolve together.

The founder's direction: users should feel they are **entering** something, like passing through a door into somewhere better. This applies:

- on first open;
- after sign-up and verification;
- on onboarding and the welcome screens;
- when coming back to the app;
- on the landing page.

The motion should be serious and alive.

## 1a. Threshold moments (new, from that direction)

`LogoMark` and `LogoLockup` are already separate components (`design-system/brand/Logo.tsx`), so the mark and each letter of the wordmark can be animated without changing the logo itself.

| Moment | What happens | Length |
|---|---|---|
| **App open (splash)** | The Apartments-style assembly, using Vallo's own mark. The mark turns in 3D with motion blur and settles. The letters of "Vallo" arrive one at a time from depth (blur 8 px to 0, grey to ink, scale 1.15 to 1). The lockup zooms from 0.86 to 1. Then the whole field **opens like a door**: two light panels part from the centre with a soft glow in the gap, and the home screen comes forward through the gap (scale 0.96 to 1, blur to sharp). | About 1.6 s. It plays once per cold start. A tap skips it. It never blocks content that is already loaded. |
| **Sign-up verified: "The door"** | The strongest moment in the product. The verification tick draws, and the brand glow gathers behind it. A doorway shape (a tall rounded arch of light) opens from the centre, and the camera **moves through it**: the content scales past the viewer and fades, and the welcome screen arrives from depth beyond. A single line zooms and sharpens into place: "Welcome to Vallo, [name]." | About 2.2 s, once per account |
| **Welcome and onboarding** | Each step's headline arrives word by word from depth (the letter technique, applied to words). Illustrations and icons settle with a small spring. Moving to the next step is a forward push in depth, not a sideways slide. | 520 to 620 ms per step |
| **Coming back to the app** | After more than 10 minutes away, a short re-entry: the mark pulses once in the header and the screen settles forward from 0.98 with a glow sweep. This is not the full splash. Under 10 minutes, nothing happens, so it never nags. The browser cannot animate while you leave, so the effect is on the return. | About 600 ms |
| **Landing page intro** | The hero headline assembles word by word from depth and blur, like the wordmark. The aurora brightens behind it as it lands. The store badges and search rise in last. | About 1.2 s, once per visit |
| **Sign out** | The reverse door: the content recedes into depth and the panels close on the mark. | About 700 ms |

Threshold rules:

- Each moment plays **once** per trigger and can always be skipped with a tap.
- None of them delays an action.
- Under reduced motion, every one of them becomes a 160 ms cross-fade with the final text shown.
- On data saver or a slow device (few CPU cores, or low device memory), the blur is dropped and only opacity and scale remain.

## 2. The motion system

Everything is built on the tokens that already exist in `packages/design-tokens/src/tokens.css`, so there is no second timing scale:

- `--nf-duration-*`: 90, 160, 240, 380, 620 and 900 ms;
- `--nf-ease-standard`, `-entrance`, `-exit`, `-spring` and `-press`.

### Hard rules

1. Motion only ever uses `transform` and `opacity`, so there is no layout thrash on low-end Android.
2. Nothing loops except the landing aurora and the AI demo, and both pause when they are off screen.
3. No entrance exceeds 620 ms, and no stagger runs past 6 items.
4. With reduced motion set:
   - every animation below becomes an instant state change, or a cross-fade of 160 ms or less;
   - the aurora is a still gradient;
   - the AI demo shows the finished conversation.

   The data-saver meter already in the app gets the same treatment.

### Motion by context

| Where | What moves | Duration and easing | Trigger | Reduced motion |
|---|---|---|---|---|
| Landing hero | The aurora gradient drifts slowly behind the headline, using the brand hues only | A 24 to 32 s loop, linear, GPU transform only | On load; paused off screen and in a background tab | A static gradient |
| Landing sections | Heading and content rise 16 px and fade in, with children staggered 60 ms apart | 520 ms (entrance) | Scroll into view, via `animation-timeline: view()` or an IntersectionObserver fallback | Shown at once |
| Landing feature icons | A single micro-motion per icon: the shield draws its tick, the key turns, the chat bubble types | 620 ms, once | The icon's card enters view, and again on hover | Static icon |
| AI chat showcase | A scripted conversation: the user bubble slides in, three typing dots, then the assistant reply streams in word by word with 2 listing cards folding in beneath | About 9 s per script, 3 scripts, rests 4 s between | Plays when on screen and pauses when off. It has a replay button and never autoplays with sound. | The final state of script 1, with the replay button hidden |
| FAQ (new) | The accordion height eases open and the chevron rotates 180 degrees | 240 ms (standard) | Tap. It is built on `<details>` so it works without JavaScript. | Instant |
| Store badges | None; they are the official coloured Apple and Google artwork, per their guidelines | Not applicable | Not applicable | Not applicable |
| Listing cards (search, rent and buy) | Lift of 2 px plus a stronger shadow on hover, and scale 0.98 on press. The save heart pops (spring). The photo carousel swipes. | 160 ms hover, 120 ms press, 380 ms spring | Hover, press and save | No lift or pop; the colour change stays |
| List view tools | View toggle (list, grid or map) with a sliding thumb, plus sort, save search and a floating "Map" pill on mobile | 240 ms | Tap | Instant |
| Results updating | The old results fade to 60% and the new ones fade in, with no layout jump; skeletons keep their size | 160 ms | A filter or sort change | Instant swap |
| Bottom capsule | The active indicator slides between tabs. The capsule hides on scroll down and returns on scroll up (AutoHideDock, as now). An optional sub-tab strip expands upward from the capsule. | 240 ms slide, 380 ms spring for the expand | Tap, and scroll direction | Instant; the dock stays visible |
| Sub-tabs (profile, inbox, bookings) | An underline slides to the active tab and the content cross-fades | 240 ms | Tap or swipe | Instant |
| Side drawer | The panel slides in from the edge over a fading scrim, and its rows stagger 30 ms apart (first 8 only) | 380 ms in, 240 ms out (exit ease) | Menu tap, or Escape and scrim tap to close | A fade of 160 ms or less |
| Page to page | Route content fades and rises 8 px | 240 ms | Navigation | None |
| Press, everywhere | Buttons and rows scale 0.98 | 120 ms (press) | Touch or click | None |

## 3. Shell changes (after the image confirmation)

- **Top-right avatar:** removed from the app header. The bell stays, and the profile is reached through the side drawer and the dock.
- **Side drawer:** the boxed card around the profile goes. The avatar sits bare at the top of the panel, then the name, handle and verification tick, as a clean full-panel layout. The nav groups become plain icon rows.
- **Theme toggle:** it becomes a feature row. It shows the icon, "Appearance" and the current value (Light, Dark or System), opens a 3-option sheet, and is laid out like the rows in the account-screen reference.
- **Bottom capsule:** a more premium floating capsule, with a glass surface, a hairline border and a sliding active pill. Search may become a separate round button beside it, as in the reference, if the founder confirms.
- **Consistency:** there are four places to unify:
  - one spacing rhythm, from the existing gap tokens;
  - one icon size per role: 20 px in rows, 24 px in the dock, 28 px as feature icons;
  - one stroke weight, from the existing UiIcon set;
  - the timing table above.

  They apply across the landing page, docs, home, AI chat and the core screens.

## 4. Order of work

1. Motion utilities and the reduced-motion and data-saver gate: one shared CSS partial. Then the threshold moments (splash, the door, welcome, return, sign out), which carry the most feeling.
2. Landing page: the aurora, reveals, icon micro-motion, the AI chat showcase, the FAQ and the official store badges.
3. Property list views: the view toggle, sort, save search, the map pill, card motion and the result-update motion.
4. Header avatar removal. This does not depend on the images.
5. **After confirmation:** the side drawer, theme row, bottom capsule and sub-tab layer.
6. Consistency sweep, then real-device checks at 390 px and 1440 px in light and dark, with reduced motion on and off.
