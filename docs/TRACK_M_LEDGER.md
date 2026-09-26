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
| Light mode as sharp as dark; the logo wrapper's edges moving like snakes | Two lights chase round the light-mode logo plate in opposite directions (`light.css`); round two carried a moving light to every container and button in both themes (`edge-m.css`, below) |
| Showreel reference: horizontal and vertical motion | The cinema kit (below) on the landing |
| Inner areas: agent, landlord, hotel and restaurant flows | `app/css/flow-m.css` over the shared flow pieces |
| Many animations in the feed | `app/css/feed-m.css` |
| Em dashes are forbidden | The last two in the UI replaced with words; 1,654 removed from 17 repo markdown files |
| Push done work to main | Main fast-forwarded after every verified batch |

## The shell

- **Drawer.** Full height, flush to the edge, rounded only where it faces the app. The person sits bare at the top: a 64px face, the name and the handle (the face and name are the way to the profile). Rows are plain, with no chevrons, a quiet current-row bar and a glass object for each destination. There is no close X: the scrim, a swipe and Escape close it. The panel holds still and its rows scroll inside it, so the light on its edge stays on the edge. The row groups rise in turn when the drawer opens.
- **Header.** The avatar is gone, and so is the Property or Stays tag beside the lockup (a screen reader still hears which side it is on). The bell and the menu are a size smaller. On the profile page the settings gear sits under the bell.
- **Dock.** A pill of the platform's blue glass, and a round button of the same glass beside it. There is no highlight behind the current tab any more: the current tab is its glyph and label in deep brand blue, with a pop on arrival. The round button opens a tray that rises out of it: Messages, Plans, Saved, AI Assistant, Agreements, Price Check, Settings, and Help and support. A guest sees the three that make sense signed out. The tray closes on Escape, on an outside tap and on arrival.
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

- Every batch: typecheck, lint (including the CSS token gate, the claims gate and the valuation-word gate) and the full unit suite. The last full run was 5,758 passing, 1 skipped, over 501 files.
- A production build on every batch.
- Performance, from round two on: main-thread time on idle pages with the CPU slowed four times, read from the browser's own counters and traces.
- Screenshots at 390px and 1440px, dark and light:
  - the drawer, tray, motion settings, cinema bands, flows, feed and listing page;
  - slow-motion frame captures (the animation clock at a tenth or a fifth of real time) of the splash, the door and sign-out.

## Round two: the founder's iPhone screenshots

| Ask | What changed | Where |
|---|---|---|
| The welcome coin must show the real logo | Both faces carry `vallo-mark.png`, the artwork `LogoMark` draws | `WelcomeScene.tsx`, `welcome.css` |
| No whitish highlight in the dock; the current tab deep blue only | Highlight removed; glyph and label in brand blue | `shell-m.css`, `light.css` |
| Remove the Property and Stays tags in the header | Visible tag gone, screen-reader name kept | `AppShell.tsx` |
| The moving light on all containers and buttons, blue in light, silver at night | Every panel, door, full-size button, the dock capsule and round button, the drawer and the search filters | `edge-m.css` |
| Drawer: no "View profile", no chevrons, no X; its edge alive | All three removed; the panel holds still while rows scroll | `AppRail.tsx`, `shell-m.css` |
| The dock capsule and round button as glowing blue glass | Both themes | `shell-m.css`, `light.css` |
| A smaller bell | The bell and the menu a size down | `AppShell.tsx` |
| Light mode: no dark-blue plates behind icons | Glass objects stand alone with a soft blue shadow, and every object fades out at its canvas edge, so none shows a square on white | `light.css` |
| The light on the home and Stays search filters | Both filter controls carry it; the home hero's search row was also 26px too wide at 390px, which cut the filter button in half, and now fits | `edge-m.css`, `home.css` |
| A cleaner settings icon everywhere | `settings-gear` redrawn as three upright sliders; in the tray and drawer it is drawn at the glass objects' optical size | `UiIcon.tsx`, `shell-m.css` |
| Clearer icons on the "list a property" doors | Whole glass objects, larger: owner `modern-house`, agent `keys-tag`, firm `cluster-home`; each door's "what we will ask for" rows carry their own icons | `AddWorkspaceChooser.tsx` |
| No verified badge on the avatar circle | Removed on the profile and the public header; the badge beside the name stays | `AccountHero.tsx`, `ProfileHeader.tsx` |
| Home as four containers, Buy, Rent, Pay and List, smaller in light, the same on Stays | Four panel doors; Pay opens Agreements with the single word "Pay" | `HomeScreen.tsx`, `CategoryRow.tsx`, `home.css` |

Also in this round:
- The owner and agent forms had two back controls; the form's own is the one kept.
- "Vallo charges nothing" was not true for a lister, whose share carries the 1 to 2 percent Guarantee contribution. The help centre, the About card, the docs, the standards line and the assistant, support and bot prompts now say what is taken and where it goes, from one sentence in `lib/money/copy.ts`.

## Performance: fast, with no loading feel

The founder saw the loading skeleton on Search and asked for the app to be "clean fast and sharp".

**What a page carries.** Every in-app page shipped the whole dictionary (365 KB of JSON) because the layout handed it to the shell, a client component, and several pages handed it to client cards as well. The shell and the heavy client components now receive only the namespaces their import graphs can reach (`lib/i18n/shell-dictionary.ts`, `lib/i18n/slice.ts`). A test walks each component's import graph and fails when a slice misses a namespace. First-load HTML, measured locally:

| Page | Before | After |
|---|---|---|
| Profile | 501 KB | 179 KB |
| Home | 608 KB | 347 KB |
| Stays | 560 KB | 259 KB |
| Settings | 479 KB | 281 KB |
| Price Check | 464 KB | 169 KB |
| Listing | 577 KB | 291 KB |
| Search | 1,437 KB | 1,078 KB |

**No skeleton between tabs.** The dock prefetches its four tabs whole, not only up to their loading skeleton, except under data saving. The client router keeps a dynamic page for 30 seconds, so going back and forth between tabs does not show the skeleton.

**The moving lights cost nothing.** The first build of the round-two light turned a conic gradient with an animated custom property. That can only run on the main thread, so every frame re-matched styles and repainted every ring. With the CPU slowed four times to stand in for a mid-range phone, the idle page's main thread was busy:

| Page | Lights | First build | Now |
|---|---|---|---|
| Home | 23 | 60% | under 1% |
| Stays | 23 | 70% | about 1% |
| Search | 108 | 96% | under 1% |
| Settings | 19 | 47% | under 1% |
| Feed | 4 | 22% | under 1% |

Two changes got it there:
- Each light is now a short line painted once and moved by the compositor with `translate` and `scale` (`edge-m.css`). The round dock button's ring is turned whole.
- React listens for `animationiteration` on its root and on every portal container, and while anything listens the browser wakes the main thread on every lap of every looping animation. Nothing in Vallo handles that event, so a before-paint script refuses that one listener type (`lib/motion/iteration-quiet.ts`). A test fails the day something in the app starts using it.

**Every language on every page, gone.** The i18n package had one entry, and it imported all four dictionaries, so a client component that needed only `formatMoney`, or a back button that needed the word "Back", shipped every word of English, Yoruba, Hausa and Igbo to the browser: a 709 KB chunk (220 KB gzipped) on the landing page and nearly every route.
- `@vallo/i18n/core` carries the locale list, the Intl tags and every formatter, `countOf` included, with no dictionary; 347 files moved to it.
- The few words client components on the main routes read come from the root layout in a small client copy (`lib/i18n/client-copy`, about 7 KB), in the reader's language from the first paint.
- Result on the build: 119 of 131 user-facing routes no longer load the chunk, including the landing page, Home, Search, Stays, Around, Settings, Profile, Saved, Messages, the listing, stay and restaurant pages, and sign-in and sign-up. Tests guard the light entry and the layouts' client code.
- Measured on vallospaces.com after the deploy: the landing page's JavaScript went from 1,381 KB to 722 KB, and sign-in's from 1,368 KB to 705 KB.

**What a tap downloads.** The per-page dictionary slices were checked by an import walker that also counted things that cannot read a dictionary in the browser: server actions (Settings carried the 57 KB `admin` namespace because a server action calls Supabase's `auth.admin.deleteUser`), `supabase.auth` calls, comments and types. With those skipped, the slices shrank:

| Slice | Before | After |
|---|---|---|
| Settings screen | 137 KB | 47 KB |
| Listing card | 104 KB | 55 KB |
| Stay card | 45 KB | 8 KB |
| Price Check | 42 KB | 13 KB |

A tap to Settings now downloads 30 KB for its page where it was 105 KB, and a tap to Home 40 KB where it was 73 KB.

**The shell's words, typed.** `AppShell` carried twelve whole namespaces (58 KB) in the HTML of every full in-app load. `ShellDictionary` is now a precise type carrying only the lines the shell draws (about 4 KB), and the shell and every component it hands `t` to take that type, so a read of anything not carried does not build. Full-page HTML, before and after: Home 383 KB to 278 KB, Settings 297 KB to 165 KB, Search 1,209 KB to 1,006 KB.

**Search draws 24 first.** The grid drew every result at once (52 cards, a megabyte of HTML, 52 client cards to hydrate). It draws 24, and a "Show 24 more" link, prefetched as it scrolls into view, draws the next 24 in place with no loading state and no scroll jump. The count, map and filter drawer keep the whole list. Search's HTML went from 1,030 KB to 621 KB.

**The server answers sooner.** Some pages made their database reads one after another before sending a byte. The listing page made about fifteen, the inbox a chain of five, and the listing, stay and restaurant pages each read the same listing up to three times. Reads that need only the listing now go out together, the ones that need the reader's session follow together, and one listing lookup is shared across a request. Measured on production (navigation payload):

| Page | First byte before | After | Complete before | After |
|---|---|---|---|---|
| Listing | 682 ms | 360 ms | 1,053 ms | 632 ms |
| Inbox | 443 ms | 410 ms | 1,364 ms | 577 ms |
| Restaurant (venue) | 679 ms | 496 ms | 838 ms | 643 ms |

**Prices in Yoruba, Hausa and Igbo.** Node writes the naira sign for these locales, while Chromium's trimmed locale data writes "NGN", and Node spaces the Hausa sign. So every price on those pages was a hydration mismatch: React discarded the server's HTML and redrew the page in the browser, and the reader saw "₦" turn into "NGN". Money is now built from one normalised set of parts (the narrow sign, no space beside it) in `formatMoney` and `<Amount>`. The four languages hydrate clean on the main routes.

**Measured live after the deploys** (a fresh sign-in, full-page HTML): Home 383 KB to 306 KB, Settings 297 KB to 176 KB, Search 1,209 KB to 676 KB.

**Still worth doing, not started:**
- The CSS bundle is about 715 KB (104 KB gzipped) and blocks the first paint. About a sixth of it is the landing's alone (landing, landing rooms, cinema) and about a quarter is in-app screens the landing never shows (the feed, threads, wallet, admin). Splitting it by route would save roughly 15 to 25 KB gzipped per first load, but it reorders a cascade that `globals.css` says must not move, so it needs a before-and-after screenshot diff across both themes first.
- Twelve secondary routes still load the dictionaries: payments, checkout, tenancy, the agent and host desks, and the assistant. Payments were left alone by the Track M rule.
- The landing's HTML is about 628 KB.

## Open

- **Real-device check.** Every check so far ran in Chromium at phone size. A pass on a physical iPhone and a mid-range Android is still worth doing, for the splash, the pinned reel and the moving lights in particular.
- **Android hardware back on the owner and agent forms** follows the route's parent, so from any step it leaves the form rather than stepping back one screen. This was true before this round; fixing it means giving each step its own history entry, or having the form claim the back key.
- **After Continue on a long form step** the next step opens scrolled down, with its title under the app header. This also predates this round.
- **Translations.** Hausa, Yoruba and Igbo show the English word "Pay" on the home tile until a native speaker supplies one.
