# The Vallo motion system

**Written by Session 1, 6 October 2026.** The complete motion specification. It
incorporates the motion designer's brief, reconciles it with what this repository
actually contains, and defines every moment in the product.

---

## 0. The finding you need before you read anything else

**The motion designer's brief says to pull from `scripts/marketing/video/engine/` and
to reference its GSAP and CustomEase setup rather than rebuilding it.**

**That engine is not in this repository.** Verified on 6 October: there is no
`scripts/marketing/video/` directory at any path, no `gsap` or `CustomEase` dependency
in any `package.json`, and no match for `CustomEase` anywhere in the tree or in git
history.

It presumably lives in the separate marketing and video project. **A session told to
reference it will waste an hour looking for it and then invent something.** So this
document does the reconciliation once, here.

### What this repository does have, which is substantial

A mature CSS-driven motion system, already shipped and already wired through the
product:

| | |
|---|---|
| **Duration tokens** | `instant` 90, `fast` 160, `base` 240, `slow` 380, `entrance` 520, `deliberate` 620, `cinematic` 900, `press` 120 |
| **Ease tokens** | `standard`, `entrance`, `exit`, `spring`, `press` |
| **Components** | `BrandAssemble`, `DepthWords`, `ThresholdStage`, `Reveal`, `CountUp`, `RouteTransition`, `LoopGate`, `FeatureGlyph`, `useInView`, `useMotionGate` |
| **Libraries** | `nav-origin` (grow from the tapped element), `photo-morph`, `scroll-loop`, `threshold`, `motion-pref`, `iteration-quiet` |
| **Stylesheets** | `motion.css`, `motion-kit.css`, `route-motion.css`, `press-motion.css`, `signature-motion.css`, `motion-pref.css`, `docs-motion.css` |
| **Reduced motion** | Every duration token collapses to 1ms under `prefers-reduced-motion`, which is better than most products manage |

**`BrandAssemble` and `DepthWords` already exist**, and they are close to exactly what
the startup sequence needs: a mark assembling, and words arriving from depth.

### The designer's five curves, mapped to what is already here

The five named curves are cubic-beziers. **Four of them already exist under different
names**, so the vocabulary is adopted without adding a dependency:

| Designer's name | Intent | Vallo token |
|---|---|---|
| **`land`** | Snap in | `--nf-ease-entrance` `cubic-bezier(0.16, 1, 0.3, 1)` |
| **`leave`** | Ease out | `--nf-ease-exit` `cubic-bezier(0.4, 0, 1, 1)` |
| **`glide`** | Smooth float | `--nf-ease-standard` `cubic-bezier(0.22, 0.61, 0.36, 1)` |
| **`drift`** | Slow settle | `--nf-ease-spring` `cubic-bezier(0.34, 1.28, 0.64, 1)` at `cinematic` |
| **`whip`** | Fast flick | **New.** `--nf-ease-whip: cubic-bezier(0.7, 0, 0.2, 1)` at `instant` or `fast` |

**Add `whip` as the one new token and alias the other four to the designer's names in
comments**, so a conversation with him and a conversation with the code use the same
words.

### The GSAP decision

**Do not add GSAP to the application bundle.** Core plus CustomEase is roughly 70KB
gzipped, this product runs in a Capacitor WebView on budget Android over Nigerian
mobile networks, and the repository already enforces a weight budget
(`scripts/check-weight.mjs`). Ninety-five per cent of the motion in section 2 is
entrance, exit, press, stagger and transform, all of which CSS and the Web Animations
API do natively and cheaply.

**Two exceptions, both dynamically imported so they never touch first load:**

1. **The Get Started scroll choreography**, where several elements are driven from one
   scroll position on a shared timeline. Hand-rolling that is where CSS genuinely gets
   worse than a library.
2. **The startup sequence**, if and only if `BrandAssemble` cannot carry it. Try the
   existing component first.

**Three.js is refused for the product.** A WebGL context plus a renderer on a budget
Android handset costs battery, memory and a visible first-frame delay, and the
founder's own directive says the data-saver path drops blur, let alone a 3D scene. The
3D feeling comes from **pre-rendered assets**, which the founder is generating right
now, moved with CSS 3D transforms. The marketing video engine can use Three.js freely:
it is not shipped to a phone.

---

## 1. The principles

From the designer's brief, adopted in full. These are the rules a session is judged
against.

1. **Every element has intent.** Nothing moves without a reason. Motion answers where
   something came from, what changed, or how far along it is.
2. **Entrances are fast, exits are slower.** `whip` and `land` in, `leave` and `drift`
   out. This is counter-intuitive and it is correct: arriving should feel decisive,
   leaving should feel unhurried.
3. **Stagger children at most 60ms apart.** It should read as one organism, not a
   queue. At most six items; the seventh arrives with the sixth.
4. **Depth through parallax.** Background layers move at **0.6x** foreground speed.
5. **Payoff moments get one sharp impact and a subtle pop**: scale 1.0 to 1.04 to 1.0
   over 180ms, plus one haptic. Confirm, verify, unlock, release, earn. **Nothing else
   in the product is allowed to pop**, which is what keeps the payoff meaningful.
6. **Transform and opacity only.** Never animate layout, width, height, top or left.
7. **Deterministic.** Seeded variation where organic variety is wanted, never a raw
   random call, so a sequence looks the same on every run and can be tested.
8. **Reduced motion and data saver are features.** Everything collapses to instant or a
   160ms fade; blur drops to a solid surface.
9. **Nothing blocks interaction.** A person can always tap through an animation.
10. **Nothing loops forever** except the aurora and the assistant's thinking state.

---

## 2. The moment inventory

Every moment in the product, with its curve and duration. Session 3 builds against
this table.

### Entry and brand

| Moment | Spec |
|---|---|
| **App open** | Section 3. 1,500ms, once per cold start, skippable |
| **Get Started entrance** | Section 4 |
| **Route transition** | Grows from the tapped element's origin via `nav-origin`, folds back on Back. `land` 380ms |
| **Tab change** | Crossfade plus a 12px lift, `glide` 240ms |
| **Threshold: door** | After verify. Existing `ThresholdStage` |
| **Threshold: leave** | On sign-out. Existing |

### Figures and data

| Moment | Spec |
|---|---|
| **Figure arrival** | Counts from zero, `glide` 620ms, once per mount, never re-counting on re-render |
| **Odometer change** | Per digit, `land` 380ms, staggered 20ms left to right, only changed digits move |
| **Chart draw** | Line path draws `glide` 620ms; bars grow from baseline staggered 30ms |
| **Chart morph between periods** | Path interpolates `glide` 380ms |
| **Progress ring** | Sweeps `glide` 620ms |

### Controls

| Moment | Spec |
|---|---|
| **Press** | Sink 1px, `press` 120ms, bloom pulls in |
| **Primary action morph** | Rectangle to circle to tick. `whip` 160ms out, `land` 240ms into the tick, then the payoff pop |
| **Segmented pill** | Springs to the chosen segment, `drift` 240ms. Content crossfades `glide` 160ms |
| **Toggle** | `drift` 240ms |
| **Dock pill** | Springs to the tapped slot `drift` 240ms, arriving before the route |
| **Chip select** | Scale 1.0 to 1.03, `land` 160ms |

### Surfaces

| Moment | Spec |
|---|---|
| **Sheet entry** | Rises from below with `land` 380ms while the scrim blur ramps 0 to 12 |
| **Sheet exit** | `leave` 240ms |
| **Card entry on scroll** | 50 to 90px vertical float with overhang offset, `land` 520ms, children staggered 60ms |
| **Card press** | Scale 0.985, `press` 120ms |
| **List stagger** | First six only, 40ms apart, 12px lift and fade |
| **Skeleton to content** | Crossfade `glide` 160ms. Never a spinner |
| **Modal backdrop** | Blur fade `glide` 240ms |

### Payoff moments, which alone may pop

| Moment | Spec |
|---|---|
| **Payment confirmed** | Full-screen tick scales in over a radial wash, `land` 620ms, then the pop and one haptic |
| **Escrow released** | The same, with the amount counting up after the tick lands |
| **Verification passed** | Shield assembles, tick embosses, pop |
| **Badge or streak earned** | Sunburst behind the medal, `drift` 620ms, pop, then the share affordance rises |
| **Referral code revealed** | Ticket unfolds, dashed border draws, code lands. `land` 520ms |
| **Agreement approved** | Timeline fills to the final step, pop on the last node |

### Money, where motion must never mislead

| Moment | Spec |
|---|---|
| **Processing steps** | Each step ticks **when it actually completes**, never on a timer |
| **Balance change** | Odometer, and **only after the server confirms**. A balance never animates optimistically |
| **Held to released** | The held state crossfades to released `glide` 380ms, with the figure moving between columns |

**The hard rule: no money value may animate in a way that implies money moved when it
did not.** An optimistic animation on a failed payment is a lie told in motion.

### Content and feed

| Moment | Spec |
|---|---|
| **Photo open** | Shared-element zoom from the tapped thumbnail via `photo-morph` |
| **Gallery swipe** | Follows the finger, `drift` settle on release |
| **Favourite toggle** | Heart scales 1.0 to 1.2 to 1.0, `land` 240ms, with a haptic |
| **Pull to refresh** | The brand mark rotates with the drag and spins once on release |
| **Map pin drop** | Falls 12px and settles `drift`; the selected pin lifts |
| **Story progress** | Linear, honest to the real duration |

### States

| Moment | Spec |
|---|---|
| **Empty state** | The clay object settles in `drift` 520ms, then the copy fades |
| **Toast** | Rises 16px with a leading tick, `land` 240ms in, 2,400ms dwell, `leave` 160ms out |
| **Form error** | The field shakes 4px once, `whip` 160ms, message fades in beneath. Never a dialog |
| **Status change** | Label, colour and shape crossfade together `glide` 240ms |
| **Pro unlock** | The gated surface lifts 8px and its veil dissolves, `land` 380ms, then one pop |

---

## 3. The startup sequence

**The founder reports the logo screen currently sits for about eight seconds. The
target is 1.5 seconds of intentional, animated brand, then the product.**

### Root-cause first, because this is the whole point

**The eight seconds is not an animation duration. It is an unbounded network call.**
`app/open/route.ts` calls `resolveSession()` with no deadline, so the splash holds
until Supabase answers. **Session 2 fixes that before Session 3 builds this.** An
animation over an unbounded call is a longer hang with better production values, and
the founder's own instruction is that the fix must not be a timer.

### The sequence, 1,500ms

| Time | Beat | Curve |
|---|---|---|
| 0 to 120 | Navy ground, matching the native splash exactly so the handoff is invisible | none |
| 120 to 480 | The mark assembles: facets arrive from depth and lock, rotating 12 degrees to 0, scaling 0.86 to 1 | `land` |
| 380 to 720 | Wordmark letters arrive from depth, 24ms apart, blur 6 to 0 | `glide`, stagger 24ms |
| 640 to 900 | The edge light sweeps the lockup once, left to right | `glide` |
| 900 to 1,150 | The lockup settles and breathes once, scale 1.0 to 1.02 to 1.0 | `drift` |
| 1,150 to 1,500 | The door opens: the ground parts and Get Started is revealed beneath | `leave` |

**Use `BrandAssemble` and `DepthWords`, which already exist**, before writing anything
new. They were built for this.

**Rules.** Once per cold start, gated on sessionStorage and the native shell. **Tap to
skip at any point.** A 160ms crossfade under reduced motion. Inline, nonce-carrying and
CSS-only in the root layout so it never waits on a JavaScript chunk. The native splash
hides on first paint so the two never fight. `lib/motion/threshold.ts` gains an `open`
kind beside `door` and `leave`.

**If the app is ready before 1,500ms, the sequence still completes**, because a brand
moment cut short looks broken. **If it is not ready by 1,500ms, the sequence holds on
the settled lockup with the breath continuing**, and that is the only honest waiting
state. It never pretends to finish.

**Prerequisite: the vector mark.** A 614px raster scaled and rotated will be visibly
soft on a 3x screen, on the one screen that forms a first impression.

---

## 4. Get Started: the deep reference

Founder directive D13 made this monotone and the first screen after the animation,
which makes it **the most seen screen in the product**. This section is its full
specification.

**It is a reference, not a copy.** Vallo's version has more motion than anything the
references show.

### The composition

One screen, no scroll on a phone, four layers of depth:

| Layer | Content | Parallax |
|---|---|---|
| **4, furthest** | A very soft radial ground wash, one hue, almost invisible | 0.3x |
| **3** | A slow aurora drift, the existing one, heavily damped | 0.45x |
| **2** | The mark, small, top | 0.6x |
| **1, front** | The display line, the quiet line, the doors | 1.0x |

**Monotone.** One hue, no secondary colour, no glow, no gradient beyond the ground
wash. **The doors are the only contrast on the screen.**

### The entrance, 900ms after the door opens

| Time | Beat | Curve |
|---|---|---|
| 0 | Inherits the startup's final frame with the mark already in position. **No re-entrance of the mark**: it is continuous, and that continuity is the premium detail | |
| 0 to 240 | The ground wash blooms from the mark outward | `glide` |
| 120 to 520 | The display line arrives from depth, blur 4 to 0, lifting 16px | `land` |
| 240 to 620 | The quiet line fades and lifts 8px | `glide` |
| 420 to 780 | The primary door arrives from below, 24px, with its bloom settling behind it | `land` |
| 480 to 840 | The secondary door follows, staggered 60ms | `land` |
| 840 to 900 | The primary breathes once, 1.0 to 1.02 to 1.0 | `drift` |

### Alive, not animated

The screen must feel like it is breathing rather than playing a loop.

- **The aurora drifts continuously**, very slowly, never repeating visibly thanks to
  seeded variation.
- **The primary door has a slow bloom pulse**, 4 seconds, barely perceptible, enough
  that the eye registers the screen as live.
- **Device tilt**, where the sensor allows, moves the layers by their parallax ratios
  at most 6px. **Off under reduced motion and off on data saver.**
- **Nothing else moves** until touched.

### Pull and touch

- **Pull down** past the top stretches the ground wash and the mark by 0.6x the drag,
  settling on `drift` release. The brand rewards curiosity and does nothing else.
- **Press on a door** sinks 1px with its bloom pulling in, `press` 120ms.
- **Release into the flow** morphs the pressed door into the next screen's origin via
  `nav-origin`, so the route grows out of the thing that was tapped.

### Prohibited here specifically

No carousel. No phone mock. No feature list. No social proof, because there is none
yet that is true. No looping video. No more than one route onward besides sign in.
**Nothing that would make this screen need scrolling on a phone.**

---

## 5. The other surfaces the designer named

**Pro and premium areas.** The unlock moment is a payoff: the gated surface lifts 8px
and its veil dissolves `land` 380ms, then one pop and one haptic. **The Pro switch
itself is absent for a member without entitlement**, so there is nothing to animate for
them. Never animate a locked state invitingly: that is an advertisement pretending to
be an interface.

**Cards.** Scroll-driven reveal with overhang offset and a 50 to 90px float, `land`
520ms, children staggered 60ms. Press sinks 0.985. Favourite toggles with a scale pop
and a haptic. The move-in total counts up when the card first enters, once.

**Bottom sheets and modals.** Spring entry from below `land` 380ms, backdrop blur
ramping 0 to 12 in parallel, exit `leave` 240ms. The grabber follows the finger on a
drag and settles on `drift`.

**Search to results.** The search pill morphs into the results header, the filter chips
cross-fade, and results stagger in at 40ms. **The morphing pill is the signature of
this transition** and it is worth the care.

**The landing page.** Layered motion with the 0.6x parallax ratio, scroll-driven
section reveals, figures counting up as they enter, and the capsule edge light running
continuously. **Restraint: a serious venture-backed product, not an over-designed
template.**

**The wallet.** The balance odometer only after server confirmation. The held-to-
released crossfade. The withdrawal confirm morph. **Money motion is the most
conservative in the product**, because here a misleading animation is a lie.

---

## 6. The passcode screen

**The founder's assessment: it is bad right now.** It is also the screen a returning
member sees more than any other, which makes it the highest-frequency surface in the
product.

**Four digits by default** per D18, with six still offered.

**What it becomes.** The ground is quiet and monotone, matching Get Started so the two
feel like one family. A small mark at the top, then a short line naming who is signing
in. **The dots are the subject of the screen**, large and generously spaced, not a
cramped row.

**The motion is the whole thing here:**

- **Each digit lands** with a scale pop 1.0 to 1.15 to 1.0 on its dot, `land` 160ms,
  plus one light haptic. This is the single most repeated interaction in the product,
  so it must feel good on the thousandth repetition.
- **The keypad keys** sink on press, `press` 120ms, with a soft bloom.
- **A wrong code shakes** the dot row 6px once, `whip` 160ms, and the dots clear with a
  `leave` fade. **No red flash and no dialog.** The message appears quietly beneath.
- **The correct code** fills the last dot, holds 80ms, and **the door opens** into the
  app using the same threshold as the startup sequence, so unlocking and launching feel
  like the same gesture.
- **Biometric, where available**, is offered first and the keypad is the fallback, with
  the prompt rising on `land` 240ms.

**Never:** a spinner after the last digit, a red screen, a shaking dialog, a count of
remaining attempts shown before the final one, or a delay that is not real.

---

## 7. What Session 3 must do

1. **Add `--nf-ease-whip`** and alias the other four to the designer's names in
   comments, so code and conversation share a vocabulary.
2. **Build the moment inventory in section 2** as the one motion layer. Every moment
   defined once, used everywhere.
3. **Use the existing components first**: `BrandAssemble`, `DepthWords`,
   `ThresholdStage`, `Reveal`, `CountUp`, `nav-origin`, `photo-morph`, `scroll-loop`.
   They exist and they work.
4. **No GSAP in the application bundle.** Dynamic import only, and only for the Get
   Started scroll choreography and the startup sequence if `BrandAssemble` cannot
   carry it.
5. **No Three.js in the product.** Pre-rendered assets plus CSS 3D transforms.
6. **Record the shipped durations** against this table in the response file, so the
   built system can be compared with the specified one.
7. **Verify every moment under reduced motion and data saver**, on a real mid-range
   Android, not only in a simulator.
