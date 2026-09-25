# Track M ledger: the platform feels alive

25 September 2026. The record of the motion, landing and shell pass. The plan it followed is `docs/TRACK_M_MOTION_PLAN.md`. Nothing here touches payments, migrations or the money rules. Every sentence about money on the new surfaces is read from `apps/web/src/lib/money/copy.ts`.

## What the founder asked for, and where it landed

| Ask | Where it is |
|---|---|
| Pump.fun drawer: full panel, the person unboxed at the top, plain rows | `AppRail.tsx`, `app/css/shell-m.css` |
| Theme as a feature row, not a bare switch | `ThemeRow` in `components/site/ThemeControl.tsx` |
| No round avatar at the top right | `AppShell.tsx` (the bell stands alone) |
| A premium capsule dock with a sub-nav, six icons | `MobileTabBar.tsx` plus `DockMore.tsx` (the round sixth slot opens a tray of eight destinations) |
| Pump.fun sub-tabs | Underlined words on the profile and account strips (`social.css`, `profile.css`) |
| "Entering heaven, like a door" | `BrandAssemble` splash, the verified door, sign-out panels, return glow (`components/motion`, `app/css/threshold.css`) |
| Welcome and onboarding motion | Headlines arrive word by word out of depth (`DepthWords`), steps push forward |
| Motion settings with real options | Settings, Appearance, Motion: Cinematic, Standard, Calm, Off, plus switches for the splash, the doors and living backgrounds, a live preview and a replay (`MotionSettings.tsx`, `lib/motion/motion-pref.ts`, `app/css/motion-pref.css`) |
| Use the platform's icons, not black and white | Glass objects in the drawer rows, the tray, the Appearance row and the motion levels (`lib/nav/glass-glyph.ts`) |
| Light mode as sharp as dark; the logo wrapper's edges moving like snakes | Two lights chase round the light-mode logo plate in opposite directions (`light.css`) |
| Showreel reference: horizontal and vertical motion | The cinema kit (below) on the landing |
| Inner areas: agent, landlord, hotel and restaurant flows | `app/css/flow-m.css` over the shared flow pieces |
| Many animations in the feed | `app/css/feed-m.css` |
| Em dashes are forbidden | The last two in the UI replaced with words; 1,654 removed from 17 repo markdown files |
| Push done work to main | Main fast-forwarded after every verified batch |

## The shell

- **Drawer.** Full height, flush to the edge, rounded only where it faces the app. The person sits bare at the top: a 64px face, the name, the handle and "View profile" as a text link. Rows are plain with a quiet current-row bar and a glass object for each destination. The row groups rise in turn when the drawer opens.
- **Header.** The avatar is gone. On the profile page the settings gear moved under the bell, because with the side tag beside the lockup the header row had no room left at 390px.
- **Dock.** A true pill with a spring-driven highlight and a pop on the current icon. The sixth round slot opens a tray that rises out of it: Messages, Plans, Saved, AI Assistant, Agreements, Price Check, Settings, and Help and support. A guest sees the three that make sense signed out. The tray closes on Escape, on an outside tap and on arrival.
- **Between pages.** A 240ms fade on the page root (opacity only, so pinned bars inside a page never ride with it). Under Cinematic the page also rises into place.

## Thresholds

| Moment | What happens | Where |
|---|---|---|
| App open | The mark turns in depth, VALLO assembles letter by letter out of blur, and two leaves part on the page. Once per session, decided before first paint. | `app/layout.tsx`, `BrandAssemble.tsx` |
| A new account verified | A tick draws, "Welcome to Vallo." arrives out of depth, an arch of light opens and the view passes through it. | `Verifying.tsx`, `VerifyCodeForm.tsx` |
| Signing out | The page recedes and two panels close on the mark, then part on the front door. | `SettingsHub.tsx`, `AccountSection.tsx` |
| Back after ten minutes away | The page settles forward once and the header mark breathes. | `ThresholdStage.tsx` |

None of these runs under reduced motion, data saving, Calm or Off, and each can be switched off on its own in Settings.

## The motion setting

The old "Reduce motion" switch set a root flag that no stylesheet read, so it had never done anything. It is replaced. The level is stored in the `nf_motion` cookie, so the server paints it on the root and the first frame already obeys:

- **Cinematic** lengthens the duration ladder by about a quarter, and pages rise into place.
- **Standard** is the designed default.
- **Calm** shortens every duration, stops every loop after one pass, turns the depth arrivals into plain fades, and turns off the splash and the doors.
- **Off** lands every animation and transition in its final state.

The operating system's own reduced-motion setting still outranks all four.

## The cinema kit (`components/cinema`, `app/css/cinema.css`)

| Piece | What it does |
|---|---|
| TruchetField | The showreel's pattern in Vallo blue: quarter-circle arcs that link into loops. Waves of tiles turn outward every few seconds, a turning tile brightens, and the pointer turns the tiles it passes. Canvas, sleeps between waves, pauses off screen. |
| HorizontalReel | "A day on Vallo". On a wide screen the section pins and vertical scrolling drives six frames sideways, with slower photographs inside them, a counter and a progress rule. On a phone it is a snap scroller. |
| VerticalColumns | Three columns of brand photography drifting up and down at three speeds. Mood only: no prices, names or claims. |
| KineticType | The category names at display size in two rows sliding apart with the scroll, solid and outlined, with the mark between them. |
| ReelHud | The page as a two-minute film: a timecode, the chapter under the middle of the screen, and a scrub bar. Desktop shows the labels; phones show the bar only. |

All scroll-driven pieces share one read-then-write scroll frame (`lib/motion/scroll-loop.ts`), and all of them ask `lib/motion/gate.ts` whether they may move.

## Inner areas

- **Supplier flows** (owner, agent and firm registration, add a workspace, the hotel, shortlet and restaurant set-ups, the listing wizard):
  - each step pushes forward in depth with its heading out of depth;
  - the step bar fills, and the current bar carries a sheen;
  - the step's glass object pops in and floats;
  - the choice doors rise in turn and settle when chosen;
  - the done screens land with a ring of light, and the listing ID glints once.
- **Feed:**
  - posts rise in on a view timeline;
  - photographs settle from a slight zoom;
  - the heart pops with a burst ring;
  - repost turns;
  - story rings carry a travelling light.
- **Listing page:**
  - the gallery marks slide in;
  - the price arrives out of depth;
  - sections rise as they scroll in;
  - amenity and spec tiles pop in;
  - the booking bar's content rises into the bar;
  - the duplicated "Photos" heading was removed.
- **Everywhere:**
  - page titles arrive out of depth;
  - empty states rise in turn and their picture floats;
  - settings groups, notifications and inbox rows stagger in;
  - the bell swings once when something is unread.

## The landing (the second agent's pass, merged)

- Rooms added:
  - the protection band;
  - the journey (pinned, with a phone);
  - the bento;
  - the AI showcase;
  - two worlds;
  - cities;
  - the Nigeria map;
  - the FAQ with FAQPage data;
  - a final call to action.
- The official coloured store badges.
- List, grid and map view toggles on the list views.
- The cinema bands sit between those rooms:
  - the kinetic words under the hero;
  - the Truchet field after the protection band;
  - the wall of places after the bento;
  - the day reel between the two worlds and the categories;
  - with the HUD framing the page.

## Verification

- Every batch: typecheck, lint (including the CSS token gate, the claims gate and the valuation-word gate) and the full unit suite. The last full run was 5,701 passing, 1 skipped.
- A production build on every batch.
- Screenshots at 390px and 1440px, dark and light:
  - the drawer, tray, motion settings, cinema bands, flows, feed and listing page;
  - slow-motion frame captures (the animation clock at a tenth or a fifth of real time) of the splash, the door and sign-out.

## Open

- The second agent is finishing three items:
  - the landing following the chosen theme (it is a night stage in both themes today);
  - `LandingFx` reading the motion setting;
  - the product docs pass, with motion, an update to every feature including the assistant, and no em dashes.
- **Real-device check.** Every check so far ran in Chromium. A pass on a physical iPhone and a mid-range Android is still worth doing, for the splash and the pinned reel in particular.
