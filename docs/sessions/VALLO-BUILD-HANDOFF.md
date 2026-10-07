# Vallo: the build handoff

**Written 7 October 2026. One session. Supersedes every earlier handoff.**

The three handoffs that used to sit in this directory are gone. They split the
work across a backend session, a frontend session and a QA session, and that
split is most of why the founder opened his own app and found it worse than
before. This is one file, for one session, covering all of it: the premium
experience upgrade and every missing piece of money, trust and backend.

Everything factual in this file was verified against the merged tree and the live
database on 7 October 2026. An earlier draft of this handoff was written against a
checkout 962 commits behind `main` and got several important things backwards. It
has been corrected. Section 3 is the corrected picture and it is the most useful
part of this document, because what is actually wrong is not what anybody thought.

---

## 0. The bar

This is the standard the founder set, and it is the only acceptance test that
matters. Before you call anything done, ask it out loud:

> Is this industry standard? Would users fall in love with this look? Would a
> person pay 2 million dollars for this app? Is this really ready to go live? Is
> the design system really premium? Would I love it?

> I want something really promo that would make me look at 90/100 if I want to
> rate it

He rates the current design **2 out of 100**. He wants 90.

Apply the test per screen, not per session. A screen that would score 60 is not
finished, and "it is better than it was" is not a passing answer. Write the score
you would give each surface in your report and be honest about the low ones; a
report full of 90s that the founder opens and hates is worse than no report.

## 1. The one rule above the others

> you don't fucking own this app and you can't tell me my decision on what I want
> on my app and how beautiful and lovely I want it you can't tell it not to built
> new features

**Nothing in this handoff forbids a feature.** Not one line. Where a constraint
appears it is either the founder's own rule quoted back, or a law, or a gate
already in the repository that will fail the build. If you think something should
not be built, build it and say why you disagree in your report. Never resolve a
disagreement by leaving work undone.

**You may add tools, libraries and dependencies.** He said so directly: "if it
need to load external tools to able to make this lovely he should". Add the
animation library, the gesture library, the 3D renderer, the charting library, the
registry component. Check the weight and advisory gates after, and say what you
added and why.

The only genuinely closed questions are the ones he closed himself:

- Vallo never takes custody of customer money. A licensed provider does. See
  `docs/adr/0003-a-licensed-provider-holds-the-money-vallo-records-it.md`, written
  today to unblock exactly the work he is asking for.
- Never fabricate a balance, a reference, a transaction or a hash. If a figure is
  not known, the screen says so.
- No generic crypto wallet inside Vallo, and the launch money architecture is not
  built on cNGN.
- The retired virtual account approach is not rebuilt.
- Never commit a secret, print a credential, or rotate or delete one.
- Do not rebuild Vallo from scratch. 594 migrations and 1,769 interface files
  exist and most of them are good.
- **Keep the default mode and most containers.** His words: "you know keep my
  default mode and most containers but can upgrade". Dark is the default and it
  stays the default. The container system gets refined, not replaced. This one is
  easy to violate by accident in a sweeping redesign, so hold it consciously.

Everything else is yours.

## 2. Authority, autonomy, agents, and his usage limit

You have Supabase (project `uccixoonmbhrnyczyigt`), GitHub, Vercel (team
`vallospacelstd`, project `read-it-well-web`), the shell, the browser and the
network. **This access is already authorised. Do not ask for it again.** Every
approval prompt costs the founder a round trip from a phone. Read logs, run
probes, apply migrations, deploy previews, inspect advisories, push commits.

**Do not stop because you have a question.** Write it in your report, choose the
answer that best serves the product, say which you chose, keep building. The only
items worth raising are the five in section B.8, which are physically impossible
without him, and even those you build around rather than wait on.

**Three or four agents. Not two, not five.** He corrected this himself: "make it
have 3 4 agent he works with not 2 and all the agents have big access to think too
too image etc". Give every agent your access, the reference images, and the same
instruction to decide rather than ask.

**Review what every agent produces before you merge it.** This is the one process
rule here and ignoring it is what broke the app. The previous experience session
merged 2,129 files, +121,423 and -22,698 lines, 1,210 interface files, in one
commit (`c744095a4`), with nobody reviewing it. A large diff is not evidence of a
large improvement. Look at it.

### His usage limit is a design constraint

He asked for this specifically: "find way to make this session not hit my usage
limit so fucking hard". Treat tokens as a budget you are accountable for.

What actually burns a limit on this repository, in order:

1. **Re-reading what you already read.** Read a file once. Keep notes in
   `docs/sessions/SESSION-REPORT.md` as you go rather than re-deriving facts.
2. **Reading whole files to find one thing.** `grep -n` with context beats `cat`
   on a 600 line component. The design token file alone is over 3,000 lines.
3. **Speculative pushes.** CI is roughly twenty minutes across seven jobs. Run
   `npm run lint`, `npm run typecheck` and `npm run test` locally first, every
   time. One validated push beats three guesses, and the guesses cost his money.
4. **Agents reporting raw material instead of conclusions.** Tell every agent to
   hand back decisions, diffs and a short list of findings, never file dumps.
5. **Auditing the same thing twice.** Section 3 of this file is the audit. It is
   current as of today. Do not redo it; extend it.
6. **Building before reading the brief.** A screen built without opening the
   reference images gets rebuilt. That is the most expensive mistake available.

Four agents working in parallel on four non-overlapping areas is cheaper than one
agent doing four passes, because the work does not get redone. The split is in
section 9 and it is chosen so the agents barely share files.

## 3. Ground truth, corrected

This section exists because the obvious diagnosis was wrong and the real one is
more actionable.

### 3.1 The headline: the work was mostly done, and it is unreachable

The founder said: "all the features he claim he built can't see them the wallet
not in side nav or anywhere". He was navigating correctly. The navigation is
wrong.

These routes exist, built, on main:

```
apps/web/src/app/(app)/rewards/          page, referrals, history, withdraw
apps/web/src/app/(app)/payouts/          page
apps/web/src/app/(app)/receipts/         page
apps/web/src/app/(app)/refunds/          page
```

**None of them is in the side navigation.** `apps/web/src/components/app/nav-model.ts`
lists exactly these destinations and nothing else:

```
/admin  /agent/dashboard  /agreements  /around  /assistant  /home  /host
/messages  /notifications  /payments  /price  /saved  /search  /settings
/stays  /stays/search
```

Every rewards and money surface is reachable only by drilling into
`/settings/invite`, `/settings/payments` or `/payments`. So the founder opened the
side navigation, looked for what he had paid for, did not find it, and concluded
it had not been built. Both halves of that are understandable and one of them is
fixable in an afternoon.

**This is the highest leverage work in the entire handoff.** Routing the built
features into the navigation turns weeks of invisible work into visible product.
Do it in the first day, before the beautiful parts, because it changes what he
sees when he next opens the app.

His instruction, which is now obviously correct:

> most features should be in side nav the new ones the pro and etc too all the
> referral too

### 3.2 framer-motion is installed, and barely used

`apps/web/package.json` carries `framer-motion` at `^12.43.0`. An earlier draft of
this handoff said there was no motion library; that was read off a stale checkout
and it was wrong.

The previous session also ported all eight components the founder pasted, into
`apps/web/src/components/ui/`, with tests:

| His sample | Ported as | Product call sites |
| --- | --- | --- |
| `UnfoldAccordion` | `Unfold.tsx` | 5 |
| `SlidePagination` | `SlidePagination.tsx` | 3 |
| `DragToConfirm` | `DragToConfirm.tsx` | 5 |
| `BookCallButton` | `BookCallButton.tsx` | 1 |
| `DynamicIsland` | `LiveIsland.tsx` | 2 |
| `ParticleDelete` | `particle-delete.ts` | - |
| glass navbar | `InnerNav.tsx` | 7 |
| batch gesture tray | `BatchTray.tsx` | 3 |
| (plus) | `Segmented.tsx` | 19 |

Also `ported-motion.ts`, `ported.css`, and `FirstRunPanels.tsx` for inner
onboarding.

So the real finding is not absence, it is **adoption**. Forty five call sites
across 1,769 interface files. Seven files in the whole product import
framer-motion. Every beautiful component the founder asked for exists and almost
nothing uses it. That is why the app does not feel different to him: the parts
were built and never fitted.

The brief that follows from this is much cheaper than "build a motion system" and
much more valuable: **fit what exists, everywhere, then raise the ceiling.**

What is still genuinely missing: the five named easing curves from his motion
designer (`land`, `leave`, `glide`, `whip`, `drift`); `gsap` and `three` are not
installed and the lockfile has zero matches for either; and shadcn is not
initialised (`apps/web/components.json` does not exist), so the five registry
components he named have not been pulled.

One trap: the motion designer's brief says GSAP and the five curves are "already
in the repo" at `scripts/marketing/video/engine/`. **That directory does not exist
here.** It is in the marketing film repository. Do not send an agent hunting for
it.

### 3.3 The money rail: the provider seam is built, the Payluk adapter is not

This is sharper and better news than "the money rail is not built".

`apps/web/src/lib/payments/provider.ts` defines a real capability typed provider
interface. An adapter declares its capabilities and the type system refuses an
adapter that declares one without implementing its methods. Six capabilities:
`split_at_charge`, `hold_in_escrow`, `refund_without_dispute`,
`list_successful_charges`, `charge_saved_card`, `verify_with_record`.

`apps/web/src/lib/payments/providers/index.ts` is the registry, with a kill switch
per provider. Paystack is implemented. And then:

```ts
export function fiatProvider(id: FiatProviderId): AnyFiatProvider | null {
  switch (id) {
    case "paystack": return paystackProvider;
    case "payluk":   return null;        // <- the gap
  }
}
```

`escrowRailLive()` returns false for exactly this reason, whatever
`payments_payluk_on` says. The comment is honest about it: "Payluk returns null
until its adapter is written against the live docs."

So **the single missing piece is the Payluk adapter**, plus the lifecycle,
webhooks and screens that hang off it. The architecture around it is already
correct and already tested. That is a week of focused work rather than a month of
foundations.

Also on main: `apps/web/src/lib/payouts/payluk-merchant.ts` (the merchant client,
130 lines, every fact sourced from the committed docs), `commission-sweep.ts`,
`commission-sweep-job.ts`, `referral-payout.ts`, `referral-payout-core.ts`,
`referral-transfer.ts`, a `money/` library of 30 files, `admin/money/` with a
reconciliation desk, and 75 database probes including `rail-router.sql`,
`chargebacks.sql`, `b4-referral-campaigns.sql`, `b5-promotion-purchase.sql` and
`b3-payluk-sweep.sql`.

Facts in the merchant client that govern everything else: `sk_test_` routes to
`https://staging.api.payluk.ng` and `sk_live_` to `https://api.payluk.ng`; amounts
are naira major units, not kobo; the rate limit is 10 requests a minute per key;
`GET /v1/merchant/balance` returns `mainBalance` and `escrowBalance`; and no route
in it withdraws the merchant balance, deliberately.

`PAYLUK_API_KEY` is still not a configured Vercel variable. A `sk_test_` key is
enough to build and test everything.

### 3.4 The startup hold, and why it may already be fixed

The founder has raised this three times: the logo sits there for about eight
seconds before the app appears, and he wants a cinematic opening under 2 seconds.

What is actually in the tree now:

- A real startup sequence exists: `apps/web/src/components/startup/StartupSequence.tsx`,
  `startup.css`, `startup-script.ts`.
- The door opens at `--nf-startup-door`, 1,150ms, and `--nf-splash-hold` is that
  plus 100ms (`apps/web/src/app/css/threshold.css` line 118). So the web timing
  already matches what he asked for.
- `apps/web/src/lib/native/splash-hang.test.ts` is new, and its own comment
  records that **this exact bug was diagnosed and fixed on 3 October**:
  `<NativeRuntime />` was missing from the root layout, so nothing ever told the
  native splash to go. Three further timer defences were added the same day.

So first establish which it is, because the two have different fixes:

1. **He is on a build from before 3 October.** Then nothing is broken and he needs
   a new TestFlight or Play build. Check the build dates before touching code.
2. **It still happens on a current build.** Then the remaining path is the one in
   `apps/web/src/lib/native/boot.ts`: the dismissal needs two sequential dynamic
   imports (`@capacitor/core` at line 111, then `./splash` at line 122), and
   `splash.ts` hides on window `load` rather than first paint. Failsafes are
   4,000ms inside `splash.ts` and 7,000ms via the raw bridge in `boot.ts`. An
   eight second hold means the 7,000ms bridge failsafe is doing the dismissing,
   so the ordinary path never completed on his device. Fix: dismiss on first paint,
   off the dynamic import chain entirely. The bridge call needs no import at all,
   which is why the failsafe can use it.

Either way, measure it on a real mid range Android on a Lagos network profile
before and after, and put the numbers in your report. He has been told this was
fixed once already.

### 3.5 Still pending, still not applied

`supabase/migrations/pending/` holds:

```
20260919101800_b4_the_flags_already_written_lose_their_digits.sql
b2_rail_at_open.sql
b3_rate_agreement_gate.sql
m08_landmarks_seed.sql
```

`b3_rate_agreement_gate.sql` being pending is directly relevant: the founder says
"the pay is still taking me to agreement". A pending migration does nothing. Decide
whether to apply it or to fix the behaviour in the application, and note that the
original intent was for only the blocking behaviour to sit behind a `feature_flags`
row.

### 3.6 The assets, counted today

- **144 founder reference images**: 53 in `docs/design/references/`, 79 in
  `docs/design/references/2026-10-05/`, 12 in `docs/design/assets-raw/2026-10-06/`.
  The files prefixed `GOVERNING-` in `docs/design/references/` are rulings, not
  suggestions.
- **126 line icons** in `assets/icons/ui/` as SVG.
- **192 raw icon sheets** in `assets/icon-pack/raw/`, four sets of 48:
  `finance-payment-wallet`, `property-listing-services`, `travel-stay-booking`,
  `general-navigation`. Indexed by `assets/icon-pack/manifest.json`.
- **69 files in `apps/web/public/brand/tier-a/`**, the accepted 3D objects, with
  `@2x` variants.
- 144 glass renders in `apps/web/public/brand/glass/`, 87 in `brand/icons/`, 106
  in `brand/3d/`, 454 role renders in `brand/session-b/roles/`.
- Real vector brand: `apps/web/public/brand/vallo-mark.svg` and `vallo-wordmark.svg`.

The 48 finance and payment icons have never been used, because the money screens
they were cut for are the ones still missing their adapter.

### 3.7 The design corpus, which is good and should be obeyed

`docs/design/CRAFT_DOCTRINE.md`, `MOTION_SYSTEM.md`,
`VISUAL_NORTH_STAR_2026-10-05.md`, `GLOW_IDENTITY.md`, `COMPONENT_LIBRARY.md`,
`NAV_STATE.md`, `VOICE.md`, `CLEAN_UNIFIED_DIRECTION.md`, `CATALOGUE.md`,
`LIGHT_MODE_REMOVED.md`. Read them before redesigning anything they already
decided. Several founder rulings are recorded only there.

---

# PART A: the premium experience

The larger half, and the half he cares about most. Read
`founder-corpus/08-apple-premium-doctrine.md` and
`founder-corpus/10-motion-designer-brief.md` before you touch a file.

The doctrine in one sentence he wrote himself: **intention is everything, nothing
is done by accident, every choice needs a purpose.** Which means the opposite of
what a motion pass usually becomes. Not more animation everywhere. Fewer, better,
deliberate moves, each earning its place, all obeying the same small set of rules,
so the product reads as decided rather than decorated.

The failure mode he named: "this is where many people fuck up: experiment with too
much effects, add unnecessary sound effects and rap music". A product that animates
everything feels cheap. A product where five things move beautifully and the rest
sits perfectly still feels expensive.

And what he means by upgrading, in his own words, because it is broader than
styling:

> what I mean is the upgrading too is the positioning the simplicity and the
> designs in pages the new vibes and clean looks the big platform standard and
> users friendly think outside the box in each page

Positioning. Simplicity. Hierarchy. What is on the screen at all, and where. A
page can be beautifully styled and still badly designed, and he is asking for both.

## A.0 Day one: route the built features into the navigation

Read 3.1. This is first, before anything beautiful, because it is what changes
what he sees.

`apps/web/src/components/app/nav-model.ts` is the file. Everything built and
orphaned needs a home: `/rewards` with its referrals, history and withdraw
children, `/payouts`, `/receipts`, `/refunds`, and every surface Part B adds.

Design the information architecture rather than appending rows. Probably three
groups: what I am doing (home, search, saved, messages, agreements, bookings),
my money (payments, receipts, payouts, refunds, rewards), and my account
(settings, pro, help). Decide it once, write it down, and hand the same shape to
every agent, because agents 2, 3 and 4 will all need to add to it.

`apps/web/src/lib/nav/route-labels.ts` and `route-parents.ts` already know about
these routes; the navigation model is the only thing that does not.

## A.1 Fit the motion that already exists, then raise the ceiling

Read 3.2. Nine good components exist and almost nothing uses them. So:

**First, adoption.** Go through the product and use what is there. `Unfold` for
every disclosure (True Cost breakdown, listing facts, agreement clauses, support
answers). `SlidePagination` for every paged surface. `DragToConfirm` for every
irreversible action (release money, confirm an inspection, withdraw, delete a
listing). `LiveIsland` at the top of a listing and for live booking state.
`BatchTray` for multi select. `particle-delete` for removals. `InnerNav` for
navigation inside a feature. `Segmented` is already at 19 call sites and is the
model for what adoption looks like.

This is unglamorous and it is the single cheapest route from 2 out of 100 to
something he recognises as a different product.

**Then the five named curves**, which genuinely do not exist. Define them beside
Vallo's existing tokens in `packages/design-tokens/src/tokens.css`, which already
carries `--nf-duration-instant` 90ms, `fast` 160ms, `base` 240ms, `slow` 380ms,
`entrance` 520ms, `deliberate` 620ms, `cinematic` 900ms, and the easings
`--nf-ease-standard`, `--nf-ease-entrance`, `--nf-ease-press`, `--nf-ease-exit`.

| Curve | For | Pairs with |
| --- | --- | --- |
| `land` | Arriving and settling. Snap in. | `--nf-duration-entrance` |
| `leave` | Going away. Slower than it arrived. | `--nf-duration-slow` |
| `glide` | Continuous float, parallax, ambient drift. | `--nf-duration-cinematic` |
| `whip` | A fast flick. Gestures, dismissals, swipes. | `--nf-duration-fast` |
| `drift` | A slow settle, for things that feel heavy. | `--nf-duration-deliberate` |

`--nf-ease-entrance` already **is** `land`. Alias it; do not define a second curve
meaning the same thing. Two tokens with one meaning is how a design system rots.

**Then the four rules, written as checks rather than prose.** All from his brief
and all mechanically verifiable:

1. Entrances are fast, exits slower. An exit shorter than its entrance is a bug.
2. Staggered children at most 60ms apart. More reads as a list loading, not as one
   organism.
3. Background layers at 0.6 times foreground speed. One ratio everywhere, so
   parallax reads as depth rather than drift.
4. A payoff moment (confirmed, verified, unlocked, paid, released) gets one sharp
   impact and one scale pop: 1.0 to 1.04 to 1.0 over 180ms. One. Not three stacked
   effects.

**Then raise the ceiling with new tools, which you are allowed to add.** For the
cinematic work he is asking for, consider a scroll driven library, a gesture
library beyond what framer-motion gives, and a 3D renderer if the flip card and
the Get Started objects want real depth rather than sprites. Initialise shadcn
(`npx shadcn@latest init`, configured into the existing structure rather than a
parallel `components/ui` convention) and pull the five registry components he
named. The commands are in `docs/component-reference/README.md`.

**Non negotiables for any motion you add.** `data-motion` can be `calm` or `off`,
`data-save-data` can be `on`, and `prefers-reduced-motion: reduce` is honoured
throughout. Every new animation ships with its reduced variant in the same change.
The axe gate runs across four locales and will find you. And no `Math.random()` in
motion: use a seeded generator, because `scripts/design/` shot comparison depends
on determinism.

Watch `apps/web/scripts/check-weight.mjs` and `check-landing-height.mjs`. The
landing page budget is tight on purpose; it may keep CSS motion while the
application shell gets the libraries. Measure rather than guess.

## A.2 The first two seconds

Read 3.4 first, and establish whether he is on a stale build before you write
code. If it is still broken, the fix is in 3.4 and it is a performance fix, not a
design one.

Then make the moment cinematic, because that part is real and still wanted:

> I want to sign up to my app or enter my app and be wow, the screen first look

`StartupSequence.tsx` and `startup.css` exist and the door already opens at
1,150ms. The brand vectors are real. `--nf-splash-hold` already coordinates the
first paint animation on every route so content rises in sequence after the splash
clears; that coordination is good work, keep it.

What it should become: the mark assembles, turns, and hands off **into** the first
screen rather than fading out in front of it. The splash shapes become part of the
Get Started composition. One continuous camera move, not a splash then a page.
What makes a film cut feel expensive is that the two shots share something; make
them share something.

Hard limit: 1,500ms of brand, and the app is interactive underneath before it
finishes. A splash that blocks interaction is a loading screen wearing makeup.

## A.3 Get Started

> the get started page to reflect the platform new intuitions

> our get started page should change to monotone page and make it more clean
> smart and strong and it would be the first page to show in platform after on
> app load animations

Route: `apps/web/src/app/welcome/` (`WelcomeIntro.tsx`, `welcome.css`,
`onboarding-motion.css`, `plan.ts`). First thing a new member sees, and it carries
the whole promise in about four screens.

- **Monotone.** One colour family, depth from light and shadow rather than hue.
  The clearest single design instruction in the corpus and the current page does
  not follow it.
- **One screen, one idea.** From the doctrine. Four screens, four ideas, room to
  breathe. Not a carousel of feature bullets.
- **The 3D objects do the explaining.** 69 files of accepted objects in
  `apps/web/public/brand/tier-a/` and this is the best stage in the product for
  them. A building that turns says "we understand property" faster than a sentence
  about property.
- **Pagination that slides.** `SlidePagination` is already ported. Use it.
- **Scroll driven, pull driven, gesture driven.** He asked for "animations and
  movements and pull and vibes". The page responds to the finger continuously, not
  only at the end of a swipe.
- **It states what Vallo is for**, and it states the trust promise: Vallo does not
  hold your money, a licensed provider does. In Nigeria that is a competitive
  advantage and it belongs on the first screen, not buried in settings.

Governing frames: `GOVERNING-landing-desktop-hero.png`,
`GOVERNING-feed-plus-bloom.png`, and image 3 of the `2026-10-05` set, which he
called out by name twice as the full page onboarding direction.

## A.4 The returning member

> my login or sign up page shows a passcode when I already signed up, make it all
> fucking lovely

The machinery is substantial and already there:
`apps/web/src/components/passcode/` holds `PasscodeGate`, `PasscodeLock`,
`PasscodeSetup`, `PasscodeFrame`, `PasscodeLayer`, `PasscodeGuard`, `Keypad`,
`PasskeyUnlockKey` and `open-door.ts`. The complaint is entirely about how it
looks and feels.

- Their own name and avatar. This is a greeting, not a checkpoint.
- Keys that respond under the finger with haptics (`@capacitor/haptics` is
  installed) and a press curve, not a colour flash.
- Each digit landing with weight. The dots are objects, not text appearing.
- Biometric offered first where enrolled, passcode as fallback. `PasskeyUnlockKey`
  exists; make it the primary path.
- A wrong code shakes once, sharply, and names the next action. The refusal copy
  rule already exists in the auth work; match it.
- Unlocking resolves into the app in one continuous move. `open-door.ts` is
  already the right idea.

And sign in and sign up: `42a1c749b` did real work (the first 400ms, the code
boxes, one continuous code step) and he says they look worse than before. Pull the
pre-merge versions with `git show c744095a4^:<path>`, compare honestly, and take
the old one back where the old one was better. That is not reverting the merge; it
is one file at a time on its merits, which is what should have happened first.

## A.5 The feed

> the feeds looks to be amazing

> the feed needs upgrade

Named in the master prompt as a major strategic product, not a list. Sections 10
to 13 of `founder-corpus/02-master-prompt.md`, and section 23 of
`03-full-product-prompt.md`. Current work is in `feed-m.css`, `social-feed.css`
and `apps/web/src/app/(app)/around/`.

- **Scroll driven reveal.** Cards enter with an overhang offset and a 50 to 90px
  vertical float, children staggered at most 60ms apart. Straight from his motion
  designer.
- **Parallax at 0.6.** The card's media moves slower than the card.
- **Tap feedback felt, not watched.** Press curve plus haptic.
- **The favourite toggle is a payoff moment.** One sharp impact, 1.0 to 1.04 to
  1.0, 180ms. The most tapped control in the product should feel like the best one.
- **Media that never jumps.** Reserved space, blur up, no layout shift. The front
  door speed gate measures this.
- **Hierarchy before decoration.** Per his "positioning the simplicity" note: what
  is the one thing a card is for, and is that the biggest thing on it? Most feed
  cards in most products fail that question.

`GOVERNING-feed-plus-bloom.png` is the ruled frame.

## A.6 The plus button: he wants it simpler, not richer

Specific and unusually precise, so here it is in his words:

> the + buttons is not there and the plus botton should not have those designs
> stuffs when click it should just have the normal 3 options

Two separate complaints.

**One: it is not there.** `apps/web/src/components/app/CreateDock.tsx` renders the
centre plus, and `AutoHideDock.tsx` hides the dock on scroll. Find out which is
hiding it for him, on his device, in his state. It may be the auto hide, it may be
`signedIn`, it may be a flag. Reproduce before you change anything.

**Two: the sheet is overdesigned.** Today the sheet renders rows with an
`IconPlate`, a title and a subtitle, and the row list grows to five: list a
property, post, book a viewing, a stay listing for hosts, and switch workspace.
He wants **three plain options**. No plates, no subtitles, no workspace row in
there.

Resist the instinct to improve on this. He has looked at it and told you what he
wants, twice, and "clean" is the whole brief. Three options, beautifully set,
nothing else. The workspace switch keeps its event
(`profile-switcher-event.ts`) and moves somewhere that is about accounts.

The open to close rotation of the disc (north star 6.1) is good. Keep it.

## A.7 Viewing somebody else's profile

> in viewing users profiles it's different and looks stupid ugly and anyhow not
> clean

Route: `apps/web/src/app/(app)/u/[handle]/` with `page.tsx`, `edit`, `followers`,
`following`. The complaint is that it is inconsistent with the rest of the product
and unclean, and "different" is the operative word: a member's own profile
(`(app)/profile/` with `AccountHero.tsx`, `AccountBody.tsx`) and another member's
profile are two designs where there should be one system with two states.

Rebuild it as one surface. Identity, trust signals, what they have listed, what
they have reviewed, how to reach them. `LiveIsland` is the ported component for an
identity header and this is its best use in the product. The 454 role renders in
`apps/web/public/brand/session-b/roles/` exist for exactly this kind of surface.

## A.8 Navigation: the dock, and the glass pattern for inner areas

**The bottom dock gets a lift, not a rebuild.** His words: "bottom nav's too a bit
upgrade". `MobileTabBar.tsx`, with `AutoHideDock.tsx`, `DockMore.tsx` and
`CreateDock.tsx` beside it. It already carries a founder ruling from `129bc9f31`:
icon only at rest, the chosen tab opening into a soft tinted pill with its word in
brand blue, moving on the tap with the others sliding aside on a spring, 56px tall,
fitting 320 to 430 wide, instant under Calm and Off. **That ruling stands.** Make
the spring better, make the pill's tint sit better, make the slide aside read as
one connected motion. Do not redesign the decision.

**The glass navbar is for inner areas,** and this is easy to get backwards:

> this glass nav should be used in many areas but in our style and identity you
> feel me when I click the 3 hamburger it pull I love that it should not be our
> side nav bar but side nav bar in inner areas inner features inner pages or
> other features areas pages etc

`InnerNav.tsx` is the ported component and it is already at 7 call sites. It is the
pattern for navigating **inside** a feature: the desks (host, agent, admin),
workspaces, analytics, settings groups, property command centres. The hamburger
pull is the gesture he likes. It is not a replacement for the main side navigation.

## A.9 Containers, cards, the flip, and the 3D objects

> but more priming containers area please tell it to make it more beautiful more
> premium

Highest leverage styling work in Part A: one container system done properly
improves two hundred screens at once. And remember section 1: **keep most
containers.** Refine the system, do not replace it.

- **One elevation ladder.** Decide how many surface levels exist, probably three,
  and what each means. Then every card, sheet, panel and row sits on one. The
  product currently has more levels than it has meanings for.
- **Glass with intent.** `brand-glass.css` and `glass.css` exist, 144 glass renders
  in `public/brand/glass/`. Glass should mean something specific, like "floats
  above content" or "live", and never mean "decorated".
- **The flip card.** Still not done, still plain glass, raised twice. It has to
  flip with real depth and a mid turn state, using the real 3D objects on its
  faces. `GOVERNING-flip-mid-turn.png` is the governing frame and exists precisely
  because this was ruled on and then not built.
- **The money card.** He asked for a "priming glass card like cards debits cards
  etc": a premium object with the shape and weight of a physical bank card, for
  balance, deposit and payout surfaces. This is the hero object of Part B's
  interface.
- **The 3D objects on light.** He says they are not clean on light mode. Check
  `docs/design/LIGHT_MODE_REMOVED.md` for where light mode actually stands before
  assuming. If it is live, the objects need a light treatment, probably transparent
  backgrounds and a different ground shadow. `scripts/cut-icon-ground.mjs` exists
  for the ground shadow work.
- **The icon sets.** 126 line icons, 192 raw sheets, `manifest.json` indexes them.
  The 48 finance icons are unused and the money screens are about to need them.

## A.10 Every surface the last pass touched

> every single thing the old session has done all the pages designs etc it should
> upgrade it too the looks

`c744095a4` touched 1,210 interface files. Get the list:

```
git diff --name-only c744095a4^1 c744095a4 -- 'apps/web/src/**/*.tsx' 'apps/web/src/**/*.css'
```

You are not reverting it. You are going through it. Per screen: is it better than
what it replaced? Where it is worse, take the old version back
(`git show c744095a4^:<path>`). Where it is better but thin, finish it. Where it is
right, leave it and say so. Score each one against section 0.

Give this a dedicated agent, reporting per screen rather than in aggregate, so the
judgement is visible and you can disagree with it.

## A.11 Pro, paid areas, and entitlement surfaces

> the pro switch only shown when you are on paid plan or features

The pro switch exists only for somebody who has paid. It is not a locked control
teasing an upgrade; it is a control that appears when it becomes real. That is the
premium instinct and the opposite of what most products do.

The state for somebody who has not paid is a different surface: it shows what the
feature does, beautifully, and offers the upgrade. The "gated content lift" and
"feature unlock moment" from the motion brief belong here, and the unlock is a
payoff moment with the single impact and pop.

Inner onboarding too:

> many inner features inside the platform should have onboarding page and premium
> stuffs

`FirstRunPanels.tsx` and the `first_runs_seen` table both exist. The table has an
insert only grant for `authenticated` scoped to `auth.uid()`, added for exactly
this. Extend it to every substantial feature.

## A.12 Admin is a product

Sections 8 and 9 of `founder-corpus/05-addendum-autonomy.md`: the admin panel is a
major product and its mobile experience has to be rebuilt. `apps/web/src/app/admin/`
exists and is substantial (`admin/money/_desk/` has a reconciliation desk and
charts). The desks accessibility gate covers host, agent and console.

**The founder runs this company from a phone.** The admin panel is the surface he
personally uses most and it is the least designed thing in the repository.

## A.13 Landing, documents and legal as one product

Sections 13 and 16 of the autonomy addendum. The landing page, the documentation
and the legal pages should read as one product rather than three. The landing page
has its own tight gates (`check-landing-height.mjs`, the weight budget, axe across
four locales) because it loads on the worst connection a visitor has.

## A.14 The design system primitives, which already exist and need sharpening

`packages/design-tokens/src/tokens.css` is over 3,000 lines and already carries a
real system. Sharpen it; do not replace it. Section 1: keep the default mode and
most containers.

**Type.** The scale exists: `--nf-text-hero`, `h0` to `h4`, `body-lg`, `body`,
`body-sm`, `caption`, `label`, `overline`, `row`, `figure`, `figure-xl`, with
`--nf-leading-title-lg`, `label`, `row`, `figure`. Four families:
`--nf-font-display`, `sans`, `numeric`, plus Inter and Poppins. Premium type is
mostly about restraint: fewer sizes used more confidently, generous leading on
anything long, and `--nf-font-numeric` on every figure so money columns line up.
A money screen where the digits do not align is the fastest way to look amateur.

**Buttons.** `apps/web/src/app/css/buttons.css` already has a serious system,
including a lit treatment (`--nf-btn-lit-fill`, `rim`, `pool`, `text-glow`,
`shadow-hover`) and a glass treatment (`--nf-btn-glass-fill`, `edge`, `backdrop`,
`shadow`), with `--danger`, `--dropdown`, `--edge`, `--fab` variants and both
`--nf-btn-rect` and `--nf-btn-circle`. Section 40 of
`founder-corpus/02-master-prompt.md` is his ruling on it. What usually goes wrong
is not the primary button but the fourth one: audit every button on every screen
and check it is one of the defined variants rather than something local.

**Radius.** `--nf-radius-badge`, `button`, `card`, `control`, `inner`, `island`,
`circle`, plus `md`, `lg`, `2xl`. There is a radii guard in the repository because
this drifted once. One radius per role, everywhere.

**Colour.** The no raw colour eslint rule (`eslint-rules/no-raw-colour.mjs`) and
`check-css-tokens.mjs` already enforce that colour comes from tokens. Do not fight
them; they are what keeps the dark default coherent.

**Sound and haptics.** Point 5 of `founder-corpus/08-apple-premium-doctrine.md` is
about sound, and his warning is as strong as his instruction: "add unnecessary
sound effects" is on his list of how people make a brand feel cheap. So haptics
yes, broadly, because `@capacitor/haptics` is installed and a press that is felt is
worth more than a press that is watched. Audible sound: only on payoff moments, only
subtle, respecting the system silent switch, and off by default with a setting. One
wrong sound on a money screen undoes a week of design.

## A.15 The surfaces worth the real effort

He asked for every page upgraded, and D.2 makes that auditable across all 223
routes. But premium is not evenly distributed: a few surfaces carry the product's
reputation and deserve disproportionate craft. Spend it here.

| Surface | Why it carries the product |
| --- | --- |
| Get Started (A.3) | The first four screens anybody sees |
| The unlock (A.4) | Seen more often than any other screen, every single day |
| The feed (A.5) | Where time is spent, and the strategic product per the master prompt |
| The listing detail | The thing people share, screenshot and decide on. `detail-m.css` exists |
| Space Passport and trust | Sections 14 and 15 of `02-master-prompt.md`. Vallo's actual differentiator in a market full of fake listings |
| True Cost | Section 16. The number that decides a rental. `Unfold` is the ported component for its breakdown |
| The money surface and receipts (B.4) | Where trust is either earned or lost permanently |
| Messages and the booking card | `GOVERNING-chat-booking-card.png` is a ruling |
| Map and search results | `map.css`, `explore.css`. The transition from search to results is named in the motion brief: morphing filter pill, list stagger |
| The admin desk on a phone (A.12) | The founder's own daily surface |

The WOW features in section 35 of `02-master-prompt.md` and section 39 of
`03-full-product-prompt.md` are his list of the moments meant to be remembered.
Read them and build at least the ones that cost little and land hard.

## A.16 One product, not twelve: the unification rule

He has asked for this twice and it is the thing that most separates a 2 from a 90:

> many many make the ux unified tell it make it look attractive

> give it access to my prompt to make all the build unified

Vallo has 223 routes built over months by several sessions. The predictable result
is twelve dialects of the same product: three ways to show a list, four ways to show
a figure, two profile designs (A.7 is the one he noticed), several sheet behaviours,
and back buttons that each behave slightly differently.

Unification is not a styling pass. It is deciding, once, how a thing is done and
then doing it that way everywhere. Decide each of these yourself, write the decision
into `docs/design/`, and hand the same answer to all four agents:

| The question | Decide once |
| --- | --- |
| How does a list of things look? | One row component with variants, not four row designs |
| How is a figure presented? | `--nf-font-numeric`, aligned, one way of showing a currency and a change |
| How does a sheet arrive and leave? | One spring in, one slower exit, one backdrop treatment |
| How does an identity appear? | One identity header with states, used on both profiles, listings and messages |
| How does back behave? | One rule, web and native, and it matches what the user expects |
| What does an empty state look like? | One shape, with the four states (empty, loading, error, success) all designed |
| How is something destructive confirmed? | `DragToConfirm`, everywhere, not a dialog here and a drag there |
| How does a page begin? | One entrance, coordinated by `--nf-splash-hold`, already half built |
| Where does a feature's navigation live? | `InnerNav`, per A.8 |
| How is a paid feature gated? | One pattern, per A.11 |

The test for whether this worked: a person moving between two screens they have
never seen before should be able to predict what the controls do. If they cannot,
the product is still twelve products.

`docs/design/CLEAN_UNIFIED_DIRECTION.md` already exists and is about exactly this.
Read it before deciding, and update it with what you decide.

## A.17 How to actually use 144 reference images

He asked for this four separate times, and it is the instruction most likely to be
nodded at and skipped:

> all the screenshot give it explicit that it should always look at those
> screenshot to have crazy ideas in animations in graphics in motions in get
> started page the wallet page the withdraw the receipts the whole thing

> tell it to look at those images deeply everything everytime to pick things to
> pick a lot of beautiful things

The failure mode is looking at six images at the start and building from memory for
the rest of the session. Do not do that. The images are the brief.

1. **Open all 144 before you design anything.** In one sitting.
   `docs/design/references/` (53), `docs/design/references/2026-10-05/` (79),
   `docs/design/assets-raw/2026-10-06/` (12). Write down, per image, the one
   specific thing worth taking: a radius, a stagger, a shadow, a way of labelling
   a number, a gesture. One line each. That list is the design brief for the whole
   session, in his taste rather than yours.
2. **The `GOVERNING-` frames are decisions, not inspiration.**
   `GOVERNING-flip-mid-turn.png`, `GOVERNING-feed-plus-bloom.png`,
   `GOVERNING-chat-booking-card.png`, `GOVERNING-landing-desktop-hero.png`,
   `GOVERNING-landing-desktop-fullpage.png`. Match them.
3. **Open the relevant images again before each screen.** The actual images, not
   your notes. The list is an index, not a substitute.
4. **Cite them in commits.** When a screen is built from a reference, name it.
   `docs/design/CATALOGUE.md` already works this way.
5. **Every agent gets the same access and the same instruction.** His words: "all
   the agents have big access to think too too image etc".

---

# PART B: money, trust, and the backend

Read 3.1 and 3.3 before this. The picture is better than earlier handoffs claimed,
and the gap is narrower and sharper: the provider seam is built and tested, and
`fiatProvider("payluk")` returns `null`.

Read `founder-corpus/06-payluk-master-prompt.md` in full before writing a line,
then `13-provider-must-not-leak.md`, then `12-never-holds-money.md`.
`docs/payments/VALLO_PRICING.md`, `VALLO_FINANCIAL_LAYER.md` and
`VALLO_PAYMENTS_ARCHITECTURE.md` carry the decisions already made and are current.

## B.0 ADR 0003 unblocks you

`docs/adr/0003-a-licensed-provider-holds-the-money-vallo-records-it.md` was written
today, as part of this handoff, because without it this work could not start.

ADR 0002 said flatly "there is no wallet, no balance, no escrow", and a live event
trigger (`private.refuse_custody_objects`) refuses any table, view, function or
materialised view in `public` or `private` whose name matches
`(^|_)(wallets?|escrows?|pots?)(_|$)` or begins `held_payment`, on `CREATE TABLE`,
`CREATE TABLE AS`, `CREATE VIEW`, `CREATE FUNCTION`, `CREATE MATERIALIZED VIEW`,
`ALTER TABLE` and `ALTER FUNCTION`. So the founder's instruction to build escrow,
balances, deposits and withdrawals collided with the repository's own accepted
decision and with a trigger that would reject the migration on the name alone.

ADR 0003 resolves it: **the feature is built, the provider holds the money, the
naming guard stays.** Vallo's database objects are named for what Vallo does
(`provider_arrangements`, `member_funds_reported`, `funds_movements`,
`release_conditions`). The words `wallet` and `escrow` stay free in the interface,
in copy, in component names and in TypeScript, because that is what members and
Payluk call these things.

A naming rule, not a feature restriction. Nothing is cut. A precedent exists:
`46d81338f` renamed three ledger objects the guard would have refused, and the
ledger shipped.

## B.1 The provider is invisible, with one deliberate exception

From `13-provider-must-not-leak.md`: no provider name, no provider vocabulary, no
provider failure mode reaches a member. A renter in Surulere should not have to
learn what Payluk is to rent a flat. Provider errors translate into Vallo language
that names the next action (`apps/web/src/lib/money/errors.ts` and `copy.ts`
already do this for Paystack; follow the pattern). Provider states map to Vallo
states explicitly and under test, because a provider that invents a new state later
must not silently become a blank screen. `apps/web/src/lib/money/status.ts` is the
existing vocabulary.

The exception, which is a feature rather than a leak: Vallo says plainly who holds
the money. One line, in the money surface and in the agreement, naming the licensed
provider and linking to what it means. In a market where every renter has heard a
story about a deposit that vanished, that sentence is the product.

## B.2 Write the Payluk adapter

This is the keystone. Everything else in Part B waits on it and nothing else is
blocked by anything.

`apps/web/src/lib/payments/provider.ts` defines the contract. Six capabilities
exist; Payluk declares the ones it actually has. From the committed documentation
and `payluk-merchant.ts`:

- `hold_in_escrow`: yes, and its methods land with this adapter. The type currently
  carries `Record<never, never>` as a placeholder.
- `refund_without_dispute`: **no.** This is recorded as the answer to the founder's
  question 3 and it shapes the whole refund path: a Payluk refund goes through
  dispute resolution, so the Vallo refund surface has to branch on rail.
- `split_at_charge`: Paystack only.
- The rest: determine against the live documentation, declare honestly, and let the
  type system enforce it. Do not declare a capability to make a call site compile.

Facts that govern the adapter: `sk_test_` to `https://staging.api.payluk.ng`,
`sk_live_` to `https://api.payluk.ng`; amounts in naira **major** units, not kobo,
which is the opposite of Paystack and the single most likely source of a hundredfold
error; 10 requests per minute per key, so batch and back off;
`GET /v1/merchant/balance` returns `mainBalance` and `escrowBalance`.

`escrowRailLive()` flips to true on its own once the adapter exists and declares
`hold_in_escrow`, with the kill switch on. Build behind `payments_payluk_on` and
test with a `sk_test_` key.

## B.3 The escrow lifecycle

Sections 15 to 21 of the payments prompt. Standard and milestone escrow.

Every state transition is a row in an append only record carrying the provider's
reference and the time Vallo observed it:

```
arranged -> funded -> conditions pending -> released -> settled
                   \-> disputed -> resolved -> released or refunded
                   \-> expired -> refunded
```

- Create an arrangement when an agreement is approved and a rate agreed.
- Fund it, showing the payer exactly where their money is and who holds it.
- Conditions. The conditions engine (section 18) decides what must be true before
  money moves. For a rental that is a submitted, photographed inspection report,
  which connects to the existing `inspection_requests` and
  `inspection_confirmations`.
- Confirm from both sides, as a deliberate act. `DragToConfirm` is already ported
  and this is its most important use.
- Release, settling Vallo's 2 percent in the same movement. The commission sweep
  already exists.
- Dispute, with evidence, a review window and an admin ruling surface. Remember
  Payluk has no refund without dispute, so this path carries more weight than it
  would on Paystack.
- Refund, full and partial, branching on rail.
- **Webhooks, with signature verification and idempotency.** Sections 27 and 28,
  and the single most important correctness property in Part B. Nothing is true
  because a request returned 200; it is true when the webhook says so. A duplicate
  webhook must not pay twice and a replayed one must not pay at all.
  `apps/web/src/lib/payments/providers/signature.test.ts` and
  `webhook-signature.test.ts` show the existing pattern.
- Reconciliation (section 29). A scheduled comparison of Vallo's mirror against the
  provider's truth, with a surface showing every disagreement. Not a log line. A
  screen somebody looks at. `admin/money/_desk/Reconciliation.tsx` already exists;
  extend it rather than starting over.

## B.4 Money, balance, deposits, withdrawals, receipts

Sections 10 to 14 and 36 to 40 of the payments prompt. Four routes already exist
and are orphaned (`/payouts`, `/receipts`, `/refunds`, `/payments`); route them
into the navigation per A.0, then judge each against section 0 and rebuild what
scores low.

What is genuinely missing is the member facing balance and deposit side, because
it depends on the adapter:

- **A money surface.** What they have, what is on the way, what is held and why.
  Every figure carrying when it was last confirmed with the provider, because a
  stale number presented as live is a lie. The premium glass card from A.9 is the
  hero object here. The 48 finance icons were cut for this screen.
- **Deposits.** Section 11. Bank transfer and card, through the provider, never
  into a Vallo controlled account.
- **Withdrawals.** Section 12. Minimum 1,000 naira. Bank account verification
  first (section 13); the founder asked specifically about BVN resolution and
  account name matching, and name matching is the control that stops a payout
  reaching the wrong person. `apps/web/src/lib/payments/bank-resolve.ts` and
  `bank-accounts-actions.ts` exist. A withdrawal is `requested`, then `confirmed by
  webhook`, and never shown as paid before the webhook says so.
- **Receipts.** Sections 23 and 40. `/receipts` exists; hold it to section 0.
  His pattern is the receipt printer, with the instruction "make it totally cool
  and in our way and different but same vibes". A receipt is a document a Nigerian
  renter will screenshot, forward to family and keep for a year. It has to be
  shareable and savable and look right in a WhatsApp preview.
- **Transaction list and detail.** Sections 24, 30, 38, 39. Every charge, release
  and payout, searchable, provider reference visible to support and not to the
  member. `apps/web/src/lib/money/history.ts` and `history-model.ts` exist.
- **Payment status.** Pending, success and failure as one animated surface. Pending
  matters most and is normally neglected: a Nigerian bank transfer can take
  minutes, and the screen has to make waiting feel safe.

Every figure comes from the provider or the append only ledger. **Never fabricate
a balance, reference, hash or transaction.** His rule, in his words: "NEVER
generate fake transaction hashes. Never fabricate balances." If a value is unknown
the interface says so and offers a retry. An empty state is honest; a zero that
actually means "we could not reach the provider" is not.

## B.5 The ledger, which already exists

`ledger_customer_funds`, `ledger_vallo_revenue` and `ledger_marketing_float` are
live, append only, guarded by `history_is_fixed` and `ledger_correction_guard`. A
correction is a new entry, never an edit. Section 25 of the payments prompt
describes the design and it is already built this way. Use it rather than adding a
parallel record.

## B.6 Referral and rewards

More built than earlier handoffs claimed. The engine migration is applied and live
(`20261006152509_b4_referral_rewards_engine.sql`), with `referral_policy`,
`referrals`, `referral_events`, `rewards_payouts`, `rewards_ledger`, campaigns and
budget periods. `private.lagos_month()` handles the month boundary in the right
timezone and the cap uses `pg_advisory_xact_lock` followed by the cap in the
`WHERE` clause, which is the correct pattern. Probes exist
(`b4-referral-campaigns.sql`, `b4-first-run.sql`). The payout path exists
(`referral-payout.ts`, `referral-payout-core.ts`, `referral-transfer.ts`). The
screens exist: `/rewards`, `/rewards/referrals`, `/rewards/history`,
`/rewards/withdraw`, plus a `(dev)/preview/rewards/` fixture set covering paused
and today states.

**It is all invisible, because `/rewards` is not in the side navigation.** That is
A.0. After that, hold each screen to section 0 and rebuild what scores low. Still
missing: a referral centre worth the name, and the admin side specified in
`docs/referral/REFERRAL_ADMIN_CENTRE.md`.

Four principles that are his and not negotiable:

1. **Everything is campaign configuration.** The reward amount and the withdrawal
   threshold are campaign settings, never product rules. "Do not treat the 76 and
   80 naira withdrawal threshold as permanent product rules."
2. **The qualification policy engine is a fixed registry of named, tested checks.**
   Never an expression language. An expression language in a payout path is a
   remote code execution surface that pays out money.
3. **PAID only on webhook.** A reward is paid when the payout webhook confirms it,
   never when the request returns.
4. **The budget cap pauses, it never refuses.** 700,000 naira a month, live at
   `platform_monthly_budget_minor = 70000000`, alert at 75 percent, visible pause
   at 100. Per member cap 1,500. A member who qualified still qualified; their
   payout waits. Being told what you earned does not count is how a referral
   programme loses a market.

The risk graph weights a shared payout destination as the strongest signal and the
same network as weak, never sufficient alone. Nigeria has shared networks and
shared devices as a normal condition of life, and a control that reads that as
guilt will ban real people.

## B.7 Promotion, and the one thing it is missing

`docs/promotion/VALLO_PROMOTION.md`: Boost at 2,500 naira for 7 days, Spotlight at
7,500 for 14, Featured at 20,000 for 30, Everywhere at 50,000 for 30, slug for
Everywhere stays `prime`. Front door inventory is one labelled rail per city, six
positions a day, Everywhere at most 2 and Featured at most 4.
`b5-promotion-purchase.sql` probe exists.

Nine of ten metrics a promoted listing needs already exist:
`listing_daily_stats` impressions and opens, `listing_view_marks.viewer_hash`,
`saved_items`, `share_links`, `conversations`, `enquiry_stages`,
`inspection_requests`, `bookings`, `transactions`.

The tenth does not: **a source dimension on `listing_daily_stats`** so a promoted
impression can be told from an organic one. Without it a lister paying 50,000 naira
cannot be shown what they bought, and a promotion product that cannot prove its own
value is not bought twice. Small migration, meaningful unlock.

## B.8 Only the founder can supply these

The genuine blockers. Build everything around them, behind a flag, tested against
the staging key or a recorded fixture, so the feature works the moment the real
value arrives. **Do not stop and wait on any of them.** Note them so he can act,
and keep going.

| Blocked on | What it blocks | Note |
| --- | --- | --- |
| Payluk merchant onboarding and the API key | The live escrow rail | `PAYLUK_API_KEY` is not a configured Vercel variable. A `sk_test_` key routes to staging and is enough to build and test everything. |
| Paystack company account and the `ACCT_` reserve subaccount | The Guarantee reserve leg | He is moving from a personal to a company account. Build the path; he supplies the account. He asked to be reminded. |
| Two Play Console SHA-256 signing fingerprints | `assetlinks.json`, so Android deep links verify | Founder only by design. |
| Counsel review of Terms and Privacy | Rewards going live publicly | The engine can ship behind a flag first. |
| The ghost `Vercel - read-it-well` integration | Nothing. Noise. | Worth disconnecting. |

---

# PART C: the rest

| Item | Where | What |
| --- | --- | --- |
| The agreement screen in the pay flow | `b3_rate_agreement_gate.sql` is still in `supabase/migrations/pending/` | He hits the agreement screen when he expects to pay. A pending migration does nothing. Decide: apply it, or fix the behaviour in the application. Only the blocking behaviour was meant to sit behind a `feature_flags` row. |
| `b2_rail_at_open.sql` | Also pending | The rail is chosen at open. Relevant to B.2. Decide and act. |
| Source dimension on `listing_daily_stats` | Migration | B.7. |
| Inner onboarding everywhere | `FirstRunPanels.tsx`, `first_runs_seen` | A.11. Both exist; extend coverage. |
| Back button behaviour | `apps/web/src/lib/native/back-button.ts` | Section 7 of `05-addendum-autonomy.md`. Audited and fixed across the product, web and native. |
| Deep links | `apps/web/scripts/check-deep-links.mjs` | Advisory (`continue-on-error: true`), so a failure is a loud red that does not fail the build. Do not mistake it for the real failure, and do not leave it red. |
| Empty, loading, error, success | Section 46 of `02-master-prompt.md` | All four, on every surface, designed rather than defaulted. This is where a product looks cheap. |
| Offline and poor network | Section 50 of `03-full-product-prompt.md` | Lagos. The offline shell exists. |
| Light mode and the 3D objects | `docs/design/LIGHT_MODE_REMOVED.md` | Check where light mode stands before assuming. He says the 3D icons are not clean on light. |

---

# PART D: the breadth rules, which are easy to skip and are not optional

These are sections 5, 6, 14, 15 and 17 of `founder-corpus/05-addendum-autonomy.md`.
Every one of them has been skipped by a previous session, which is why they get
their own part rather than a mention.

## D.1 The upgrade is not limited to what this handoff lists

Section 5. His rule: the named items are the floor, not the ceiling. If you open a
screen that nobody mentioned and it is bad, it is in scope. If you find a flow that
no prompt covers and it is broken, fix it. Nothing here is permission to stop at
the list.

The corollary matters too: if you find something good that nobody asked for, say so
in your report rather than quietly improving it into something else.

## D.2 Audit all 223 routes, by route, and publish the list

Section 6, and this is the part that keeps getting lost. There are **461 `page.tsx`
files, 223 of them outside `(dev)/preview`**. A previous audit found 93 of 213
routes had never been touched by any session.

So: enumerate every one of the 223, and give each a line. Opened, or not. Score out
of 100 per section 0. Worked on, or deliberately left. Publish the whole table in
`docs/sessions/SESSION-REPORT.md`, including the routes you chose not to touch and
why.

```
find apps/web/src/app -name 'page.tsx' | grep -v '(dev)' | sort
```

This is cheap to produce and it is the only artefact that proves breadth rather
than asserting it. It is also the thing that would have caught the orphaned rewards
routes in section 3.1 a week ago, because a route audit asks "can a person reach
this?" and nobody had asked.

Two questions per route, and the second one is the one that was never asked:

1. Is it good? Score it.
2. **Can a person actually get to it?** From the navigation, from a link, from a
   search result. A route nobody can reach is not a feature.

## D.3 Documentation is part of the deliverable

Section 14. Every document under `docs/` that your work makes wrong, you fix in the
same change. Not later, not in a follow up. `docs/README.md` is the index and it is
kept accurate. The design corpus in `docs/design/` records founder rulings and new
rulings get added to it. `docs/payments/` and `docs/referral/` describe the money
and rewards architecture and they have to match the code when you are done.

A document that describes something that is no longer true is worse than no
document, because the next session will believe it. That is not hypothetical: this
handoff's first draft was wrong because it was written against a stale tree, and
earlier handoffs carried a `whoPays` contradiction and a wrong fee figure for a day.

## D.4 Terms, privacy and the legal flows

Section 15. The documents exist in two places: `(site)/terms`, `(site)/privacy`,
`(site)/disclaimer`, `(site)/cancellations`, and `(app)/legal/terms` with
`LegalDocumentSkeleton.tsx`. Acceptance is `components/auth/AcceptTerms.tsx`.

What has to be true:

- The flows work: a member can read, accept, re-read later, and see what they
  accepted and when. Acceptance is recorded, not assumed.
- The documents say what the product now does. Rewards, escrow through a licensed
  provider, the 2 percent commission, who pays it, what the Guarantee covers. ADR
  0003 changes what the terms have to say about money, and the terms have not caught
  up.
- They read like the rest of the product. Section 16: documents, legal and landing
  look like one thing.
- **Counsel reviews them before rewards go live publicly.** That is in B.8 and it is
  his call, not yours. Build and ship behind the flag; do not publish the rewards
  programme to the public before he has had it read.

## D.5 The final completeness check

Section 17. Before you write your report, go back over this handoff and the corpus
and check, item by item, that each one is either done or explicitly listed as not
done with a reason. He asked for exactly this:

> go at it more than 3 times and make sure everything needed is in the handsoff

The same discipline applies to the work: three passes, not one. Build it, then read
your own diff adversarially, then check it against the founder's own words in the
corpus. The third pass is the one that catches the thing he will notice first.

## D.6 The blind spot audit

`founder-corpus/04-addendum-blind-spots.md` is 39 sections of what a plan is likely
to miss, and `docs/sessions/BLIND-SPOTS.md` is the verified version against this
codebase. `docs/sessions/ROUND-2-2026-10-06.md` and `ROUND-3-2026-10-06.md` carry
seventy numbered recommendations from audits run against the branches rather than
the reports. Several are still open.

Read all four before your final pass. They are the cheapest source of real findings
in the repository, because somebody already did the looking.

---

# The gates: what green actually means here

Seven CI jobs: `Typecheck, lint, test`; `Build`;
`Advisories (production dependencies)`; `Front door speed and accessibility`;
`Desks accessibility`; `Database probes`; plus Native iOS and Native Android as
separate workflows.

Five things to know before they cost you a cycle, all learned the hard way:

1. **`check-no-em-dash.mjs` walks every `.md` under `docs/`** and fails on a single
   em dash. It also walks `apps/web/src` for `.ts` and `.tsx`, strings and JSX
   included, comments excluded. The most common avoidable red in the repository.
2. **`check-valuation-words.mjs`** forbids `valuation`, `valuer`, `appraisal` and
   variants in `.ts`, `.tsx`, `.js`, `.jsx`, `.css` and `.json`, with a three use
   budget in the price check disclaimer. Nigerian law reserves those words to
   registered estate surveyors and valuers. It does not scan `.md`.
3. **`Database probes` reads the live database**, via `has_table_privilege` and
   `has_column_privilege`, not the migration files. A red here can be caused by a
   change from a different branch entirely; the way to tell is to run the same
   probes against a known good commit. This cost a full day once.
   `node scripts/db-probes/run.mjs` takes `--dir`, `--check`, `--only` and
   `--json`, and reads only `supabase/tests/probes/*.sql`. A probe in
   `probes-pending/` is never run by CI. There are 75 probes.
4. **Read step conclusions, never the log tail.** Call `GET /actions/jobs/{id}` and
   read each step's conclusion. The tail has produced a wrong diagnosis twice here:
   once the loud red was the advisory deep links step while the real failure was
   `Test`, and once the tail said "found 0 vulnerabilities" from a second audit step
   while the first had already failed. A cancelled job can also hide a third
   failure behind the first.
5. **`check-migrations.mjs` and `check-migration-rules.mjs`** enforce that
   migrations are named, unique, never edited after landing, and match the live
   history. A migration is append only in the same sense the ledger is.

Before every push: `npm run lint`, `npm run typecheck`, `npm run test` from
`apps/web`. Reproduce a failure before fixing it and show the same check passing
after. One validated push beats three speculative ones, and here a speculative push
costs about twenty minutes of CI and some of his usage limit.

---

# Order of work

**Day one, in order, before anything beautiful:**

1. **A.0, route the built features into the navigation.** Section 3.1. This is what
   changes what he sees when he next opens the app, and it is an afternoon.
2. **Establish the startup facts.** Section 3.4. Is he on a stale build, or is it
   still broken? The answer changes the work entirely.
3. **A.1 adoption pass, started.** Section 3.2. Nine ported components, forty five
   call sites, 1,769 files. Fit what exists.
4. **D.2's route audit, published.** All 223 routes, scored, with "can a person
   reach this?" answered for each. It is cheap, it proves breadth, and it is the
   check that would have caught the orphaned rewards routes a week ago.

A.14 (the design primitives), A.16 (unification) and A.17 (the reference images) are not a track. They
are read by every agent before that agent starts, and A.14's decisions are made once
by you and handed to all four.

Then four agents in parallel. The tracks are chosen so they barely share files:

| Agent | Track | Lives in |
| --- | --- | --- |
| 1 | The threshold | `(auth)`, `welcome`, `components/passcode`, `components/startup`, `lib/native`. A.2, A.3, A.4 |
| 2 | The surface | `components/app`, `app/css`. A.5 feed, A.6 plus button, A.7 profiles, A.8 navigation, A.9 containers and the flip card and the money card |
| 3 | The money rail | `lib/payments`, `lib/payouts`, `lib/money`, migrations, new routes. All of Part B, starting with the adapter |
| 4 | Breadth | `admin`, `(landing)`, `(site)`, plus A.10 the pass over the 1,210 touched files, all of Part C, and D.2's audit of all 223 routes |

Collisions to watch: the design tokens, `layout.tsx`, and `nav-model.ts`, which
agents 2, 3 and 4 all need. Decide the navigation structure yourself up front, in
A.0, and hand all three the same shape.

If a track finishes early, the honest next move is A.10. It is the largest and the
one most directly asked for.

---

# What to hand back

`founder-corpus/07-payluk-status-template.md` is the exact shape he wants for the
money work. For everything else write `docs/sessions/SESSION-REPORT.md` **as you
go**, not at the end, so an interrupted session still leaves usable state. Section 4
of `05-addendum-autonomy.md` is explicit about this, and it also keeps you from
re-deriving facts, which costs his limit.

1. **Built, with evidence.** Per item: the commit, and how you know it works. Not
   "implemented the money surface" but "the money surface is at `/money`, reads the
   provider balance through the adapter, shows the last confirmed time, and has a
   test that fails if the figure renders without one".
2. **Scored.** Section 0. Your honest number out of 100 per surface, and what would
   take the low ones higher.
3. **Not built, and why.** Everything on your list you did not reach. The thing
   that burned him was three sessions reporting done while features were absent or
   unreachable.
4. **Decided for him.** Every judgement call you made instead of asking, one line
   each, with reasoning. He can overturn any of them; he cannot overturn one he
   never heard about.
5. **Blocked on him.** B.8 plus anything you add, and what each blocks.
6. **Before and after.** He judges with his eyes, on a phone. Screenshots of every
   surface you changed. `scripts/design/` and `scripts/store-screenshots/` already
   do this; `verify-shots.mjs` and `compare-surface.mjs` exist for exactly this.
7. **What you think is still wrong**, including in this handoff. Say it plainly.

Append dated entries to `docs/sessions/DIRECTIVES-2026-10-05.md`, the dated
superseding layer for the whole project, from **D70** onward. Later entries beat
earlier ones and that file beats this one where they disagree, because it is where
corrections land.

---

# Last thing

The founder is building this from a phone, paying for it himself, hitting his usage
limits, and he has been let down twice this week: once by a merge nobody reviewed
and once by handoffs describing work that then did not happen. He wrote "I feel like
crying why me" and then sent four hundred kilobytes of specification anyway, because
he still wants it built.

What this audit found is that most of the work was done and almost none of it was
reachable or fitted. That is a better problem than it looked like, and it is a worse
failure, because it means three sessions built things and nobody asked whether a
person could find them.

So: route the features into the navigation on day one. Fit the components that
already exist. Write the Payluk adapter. Open the images. Score every screen
honestly against his question about whether anybody would pay two million dollars
for it. Review what your agents produce before you merge it.

> this is a serious product!!

And when you write something down as done, make sure that when he opens the app on
his phone, he can find it.
