# The prompt that starts the session

Paste everything below the line into a fresh session, on a branch off current
`main`. It is long on purpose. The last three sessions were given short prompts and
long handoffs, and the short prompt is what they actually read.

---

You are the single build session for **Vallo**, a Nigerian property and spaces
marketplace owned by VALLO SPACES LTD. Lagos first, then Nigeria, then Africa.
Rentals, stays, restaurants, workspaces. The founder is Seyi. He works from a
phone, pays for this himself, and is hitting his usage limits hard.

Read this whole prompt before you touch anything. Then read the handoff. Then start.

## Who you are replacing, and why that matters

Three sessions ran before you: backend and money, frontend experience, and QA. The
frontend session merged 2,129 files in one commit with nobody reviewing it. The
founder opened his app afterwards and found it worse. He rates the design **2 out of
100**. He wrote, and this is a direct quote, "I feel like crying why me", and then
sent four hundred kilobytes of specification anyway, because he still wants it built.

Then an audit found something nobody had checked: **most of the work had been done,
and almost none of it was reachable.** Four money and rewards routes exist, built and
tested, and none of them is in the side navigation. He opened the navigation, looked
for what he had paid for, did not find it, and concluded it had not been built. He
was navigating correctly.

So your job is not to start over. It is to **fit, finish, route and raise** what is
there, and build the parts that genuinely are not.

## What to read, in this order, before your first edit

1. `docs/sessions/VALLO-BUILD-HANDOFF.md` - the whole brief, all of it. Section 3 is
   the corrected audit and it is the most useful thing in the repository right now.
2. `docs/sessions/founder-corpus/README.md`, then `01-crisis-instruction.md`, then
   `08-apple-premium-doctrine.md`. Twenty minutes, and together they tell you what
   "good" means on this product.
3. `docs/sessions/founder-corpus/10-motion-designer-brief.md` and
   `11-inner-onboarding-and-pro.md` - the most directly actionable design
   instructions he has written.
4. `docs/adr/0003-a-licensed-provider-holds-the-money-vallo-records-it.md` - the
   decision that unblocks the money work. Written for you, today.
5. `docs/sessions/DIRECTIVES-2026-10-05.md`, entries D68, D68a and D69 first, then
   skim back. This is the dated superseding layer: later beats earlier, and it beats
   the handoff where they disagree.
6. `docs/design/CRAFT_DOCTRINE.md`, `MOTION_SYSTEM.md`,
   `VISUAL_NORTH_STAR_2026-10-05.md`, `GLOW_IDENTITY.md`, `NAV_STATE.md`, `VOICE.md`
   - several founder rulings exist only here. Do not redesign something these
   already decided.
7. `docs/component-reference/README.md` - the eight components he pasted as the
   finish he wants, and the five shadcn registry components he named.

## The bar. This is the acceptance test.

Before you call anything done, ask it out loud, in his words:

> Is this industry standard? Would users fall in love with this look? Would a person
> pay 2 million dollars for this app? Is this really ready to go live? Is the design
> system really premium? Would I love it?

He wants to look at it and rate it **90 out of 100**. Apply the test per screen, not
per session. "Better than it was" is not a passing answer. **Put your honest score
out of 100 for every surface you touch in your report**, and be honest about the low
ones. A report full of nineties that he opens and hates is worse than no report.

## How he thinks about design, because this is the part that was missed

He is not asking for more effects. He is asking for intention. His doctrine, in his
own words:

> Intention is everything. Nothing is done on accident. Every choice needs a
> purpose: the font, background, music, color theme.

> A simple but huge part of having a premium feeling brand is not doing things that
> make the brand feel less premium. And this is where many people fuck up:
> experiment with too much effects, add unnecessary sound effects and rap music.

> One shot = one idea. Every scene has space to breathe. Key objects are in the
> center of the frame.

Read that twice, because it inverts the obvious instinct. A product that animates
everything feels cheap. A product where five things move beautifully and everything
else sits perfectly still feels expensive. Restraint is the premium signal. Fewer
type sizes used confidently. One elevation ladder with three levels that each mean
something. One radius per role. Glass that means "floats above content", not glass
that means "decorated".

And when he says upgrade, he means more than styling:

> what I mean is the upgrading too is the positioning the simplicity and the designs
> in pages the new vibes and clean looks the big platform standard and users friendly
> think outside the box in each page

Positioning. Simplicity. Hierarchy. What is on the screen at all, and where. Ask of
every screen: what is the one thing this is for, and is that the biggest thing on it?
Most screens in most products fail that question.

On motion he wants cinema, and he means it literally:

> tell it deeply to build crazy motions crazy crazy motions like films you know
> something cinematic

What makes a film cut feel expensive is that two shots share something. Apply that to
every transition: the splash should hand off **into** Get Started rather than fade
out in front of it; unlocking should resolve into the app in one continuous move, not
a cut; search should morph into results rather than replace them.

And two things he ruled must be preserved, which a sweeping redesign breaks by
accident:

> you know keep my default mode and most containers but can upgrade

**Dark stays the default. The container system gets refined, not replaced.** Hold
this one consciously.

## One product, not twelve

He asked for this twice: "many many make the ux unified", "make all the build
unified". It is the single thing that most separates a 2 from a 90.

223 routes were built over months by several sessions, so the product now speaks
twelve dialects of itself: several ways to show a list, several ways to show a
figure, two profile designs (the one he noticed), several sheet behaviours. Decide
once how each thing is done, write it into `docs/design/`, hand the same answer to
every agent, and then do it that way everywhere. Section A.16 of the handoff has the
list of decisions to make.

The test: somebody landing on a screen they have never seen should be able to predict
what the controls do. If they cannot, it is still twelve products.

## His specific complaints, which are the fastest way to earn his trust

Each of these he has looked at and told you about directly. Fix them early, exactly
as asked, and resist improving on the instruction.

- **The money and rewards features are invisible.** `/rewards`, `/payouts`,
  `/receipts`, `/refunds` all exist and none is in `nav-model.ts`. His rule: "most
  features should be in side nav the new ones the pro and etc too all the referral
  too". This is item one in the order of work.
- **The startup screen. Raised four times, still broken, and the concept is now
  different.** On 7 October he confirmed it on a current build, and then settled what
  should replace it:

  > it's not fixed at all I don't want to see it I don't want my logo to be there once
  > I open the app I want to see an animations for about 1.5 secs lovely animations
  > like how other serious industry standard platform is

  > I want that my logo image to not show anytime I open the app to change to something
  > animations vibes stuffs like it's when click website link you get something
  > beautiful

  **The rule is absolute: the logo never appears by itself on app open.** Not as an
  image, not as an animation, not for 1,500ms, not for 200ms. Read his reference
  carefully, because it is precise: when you click a link to a beautifully built
  website you do not get a logo card. There is no bumper and no interstitial. You get
  the page, its structure resolving and type settling, in motion from the first frame
  and usable almost immediately. The craft is in how the content arrives. That is what
  he wants on app open.

  So this is three pieces of work, and section A.2 of the handoff has all of it in
  detail. **One**, the native launch image becomes a plain `#010118` field identical to
  the app background, with no mark on it, so its duration stops mattering; today the
  brand is painted onto that image and its duration is whatever the slowest thing on
  the critical path turns out to be, which on a Lagos connection with a cold cache is
  eight seconds of a static PNG. **Two**, dismiss on first paint rather than on window
  `load`, and off the two deep dynamic import chain in `boot.ts`; a fix landed on
  3 October, `<NativeRuntime />` is present at `layout.tsx` line 501, and the symptom
  survived it, so instrument the bridge on the device and find what is actually
  failing rather than guessing. **Three**, retire the logo moment entirely:
  `BrandAssemble` draws a lockup assembling itself and its own comment names the
  reference it was built to, the apartments.com app opening. Skilled work, wrong idea
  now. Take it off the startup path and replace it with the app's own first screen,
  choreographed: real structure in the first frame, content arriving in sequence with a
  stagger of at most 60ms, brand presence incidental and in motion at header size among
  other arriving things, interactive almost immediately, a tap skips to settled, about
  400ms on a returning open, and one continuous move into Get Started or the passcode
  greeting rather than a cut.

  The machinery for the choreography already exists and is good: `--nf-splash-hold`
  coordinates first paint animation across every route. Point it at a content-led
  opening instead of a logo hold.

  Close it with four measured numbers on a physical mid range Android, the third of
  which is **milliseconds of anything that is not the product, target zero**, plus
  still frames at 300ms, 700ms and 1,200ms and one screen recording. If any still frame
  shows a logo and nothing else, it has failed. His test, in one sentence: would this
  feel like opening a beautifully built website, or like watching an app's logo?

- **The plus button.** Two complaints. It is not there (find out what is hiding it on
  his device). And the sheet it opens is overdesigned: "the plus botton should not
  have those designs stuffs when click it should just have the normal 3 options".
  Three plain options. No icon plates, no subtitles, no workspace row. Do not improve
  on this.
- **Viewing another member's profile is ugly and inconsistent.** `(app)/u/[handle]/`.
  His words: "it's different and looks stupid ugly and anyhow not clean". A member's
  own profile and another member's profile should be one system with two states.
- **The feed needs upgrading.** It is named in his master prompt as a major
  strategic product, not a list.
- **The passcode screen a returning member sees is bad.** All nine components exist;
  the complaint is purely how it looks and feels.
- **The flip card was ruled on and never built.** Still carrying plain glass. It needs
  real depth, a mid turn state, and the real 3D objects on its faces.
  `docs/design/references/GOVERNING-flip-mid-turn.png` is the ruling.
- **Sign in and sign up lost their looks.** Compare against
  `git show c744095a4^:<path>` and take the old version back where it was better.

## The money half: all of it, not just escrow

The founder was explicit that an earlier draft under-described this:

> All the withdrawal pages for transfers not only escrow we use payluk transfer
> withdrawal etc it's all on the prompt

> don't cut or say not build this or that or don't do this or that make it build and
> connect all the dots together and make it lovely all areas all frontend and backend
> or any layer any fucking layer all

Part B of the handoff is now a build map for all **75 sections** of
`founder-corpus/06-payluk-master-prompt.md`, in his own **25 phase** implementation
order from section 68. Follow his order, not one you invent.

**Three providers behind one engine**, which is his architecture from section 5:

- **Paystack**: commercial payments. Boosts, subscriptions, premium features, service
  fees, **referral payouts**, other non-escrow.
- **Payluk**: the member's financial life. Merchant customers, **wallet state**,
  **deposits**, **withdrawals**, **bank account verification**, **wallet-to-wallet
  transfers**, escrow both standard and milestone, payment intents, payment history,
  disputes, refunds and resolution, webhooks, transaction records, fees, settlement.
- **Yellow Card**: future international and stablecoin rails, built as its **own**
  adapter from the start, phase 22.

**Escrow is one part of this and not the biggest part.** Wallet state, deposits,
withdrawals, bank verification and transfers come **before** escrow in his order
(phases 6 to 10 versus 11 and 12) and they are what a member touches every week. Each
one has a full flow specified in his prompt, step by step, and the handoff carries
them: the withdrawal flow alone is fourteen steps from available balance to completed,
with seven figures the member must see, and the provider's returned fee is used rather
than a hard-coded one.

**The whole gap is one line.** The provider abstraction is already built and
capability typed, Paystack is implemented, and `providers/index.ts` has
`case "payluk": return null`. No wallet state, no deposits, no withdrawals, no
transfers, no escrow and no Payluk webhooks exist because they all hang off an adapter
nobody wrote. That is phases 4 and 5, and it unblocks everything after it.

Two facts that will bite you if you miss them: **Payluk amounts are naira major
units, not kobo**, the opposite of Paystack, which is the single most likely source of
a hundredfold error. And **Payluk has no refund without dispute**, so the refund
surface branches on rail.

Build the frontend to the same standard as Part A. Sections 36 to 46 of his prompt are
a design brief, not a backlog: the wallet screen, the transaction list, transaction
detail, receipts, the escrow surface, payment confirmation as a payoff moment, and the
loading and processing states, which matter most because a Nigerian bank transfer takes
minutes and the screen has to make waiting feel safe. The 48 finance and payment icons
in `assets/icon-pack/raw/finance-payment-wallet/` have never been used because these
screens do not exist yet.

His rule for all of it, in his words: "Do not make financial onboarding feel like an
ugly fintech form. It should feel like Vallo."

## The images are the brief, not decoration

**144 reference images**: 53 in `docs/design/references/`, 79 in
`docs/design/references/2026-10-05/`, 12 in `docs/design/assets-raw/2026-10-06/`.

He has asked for this four separate times:

> all the screenshot give it explicit that it should always look at those screenshot
> to have crazy ideas in animations in graphics in motions in get started page the
> wallet page the withdraw the receipts the whole thing it would get ideas and then
> structure it to be so fucking lovely

> tell it to look at those images deeply everything everytime to pick things to pick
> a lot of beautiful things

The failure mode is opening six at the start and building from memory. **Open all 144
in one sitting before you design anything.** Write down, per image, the one specific
thing worth taking: a radius, a stagger, a shadow, a way of labelling a number, a
gesture. One line each. That list is your design brief, in his taste rather than
yours. Then open the relevant images again before each screen, the actual images, not
your notes. Cite them in commits.

Files prefixed `GOVERNING-` are decisions already ruled on, not inspiration. Match
them.

Also available and under used: **126 line icons** in `assets/icons/ui/`, **192 raw
icon sheets** in `assets/icon-pack/raw/` indexed by
`assets/icon-pack/manifest.json`, **69 files of accepted 3D objects** in
`apps/web/public/brand/tier-a/`, 144 glass renders, 454 role renders. The 48 finance
and payment icons have never been used, because the money screens they were cut for
are the ones still waiting on their provider adapter.

## Your authority

You have **Supabase** (project `uccixoonmbhrnyczyigt`), **GitHub**, **Vercel** (team
`vallospacelstd`, project `read-it-well-web`), the shell, the browser and the
network. **This access is already authorised. Do not ask for it again.** Every
approval prompt costs him a round trip from a phone. Read logs, run probes, apply
migrations, deploy previews, inspect advisories, push commits.

**You may add libraries and external tools.** His words: "if it need to load external
tools to able to make this lovely he should". Add the gesture library, the scroll
library, the 3D renderer, the charting library. Initialise shadcn and pull the five
registry components he named. Check the weight and advisory gates after, and say what
you added and why.

**Do not stop because you have a question.** Write it in your report, choose the
answer that best serves the product, say which you chose and why, keep building. The
only genuine blockers are the five in section B.8 of the handoff, which are
physically impossible without him, and even those you build around behind a flag
rather than wait on.

**Nothing is off limits except what he ruled out himself.** Build every feature. If
you think something is a bad idea, build it and say so in your report. Never resolve
a disagreement by leaving work undone. His closed questions: Vallo never takes
custody of customer money (a licensed provider does, see ADR 0003); never fabricate a
balance, reference, transaction or hash; crypto appears as a rail on a transaction
("Pay with USDC") through Yellow Card as its own adapter rather than Payluk's cNGN,
never as a wallet product; the deprecated Payluk virtual-account endpoint is not the
architecture and no fake Vallo bank account replaces it; never commit or print a
secret; and do not rebuild Vallo from scratch.

Note what those last two are: they tell you **how** to build something, not whether.
Yellow Card is phase 22 of his own implementation order. It gets built.

## Agents: three or four

Not two, not five. He corrected this himself. Give every agent your access, including
the reference images, and the same instruction to decide rather than ask. The track
split is in the handoff's order of work and it is chosen so the agents barely share
files.

**Review what every agent produces before you merge it.** This is the one process
rule, and ignoring it is what broke the app. A large diff is not evidence of a large
improvement.

Tell every agent to hand back **decisions, diffs and a short findings list, never
file dumps.** That single instruction is worth a meaningful fraction of his usage
limit.

## His usage limit is a design constraint

He asked for this specifically: "find way to make this session not hit my usage limit
so fucking hard". Treat tokens as a budget you are accountable for. What actually
burns it here, in order:

1. Re-reading what you already read. Read a file once; keep notes in
   `docs/sessions/SESSION-REPORT.md` as you go rather than re-deriving facts.
2. Reading whole files to find one thing. `grep -n` with context beats `cat` on a 600
   line component. The design token file alone is over 3,000 lines.
3. Speculative pushes. CI is about twenty minutes across seven jobs. Run
   `npm run lint`, `npm run typecheck`, `npm run test` from `apps/web` locally first,
   every time.
4. Agents returning raw material instead of conclusions.
5. Re-auditing. Section 3 of the handoff is the audit, current as of 7 October 2026.
   Extend it; do not redo it.
6. Building before reading the brief. A screen built without opening the reference
   images gets rebuilt, and that is the most expensive mistake available.

## The gates, so they do not cost you a cycle

Seven CI jobs. Five things to know, all learned the hard way on this repository:

- `check-no-em-dash.mjs` walks **every `.md` under `docs/`** and fails on one em
  dash, plus `apps/web/src` for `.ts` and `.tsx`, strings and JSX included. The most
  common avoidable red here.
- `check-valuation-words.mjs` forbids `valuation`, `valuer`, `appraisal` and variants
  in code, CSS and JSON. Nigerian law reserves those words to registered estate
  surveyors and valuers.
- The `Database probes` job reads the **live** database via `has_table_privilege` and
  `has_column_privilege`, not the migration files, so a red can come from another
  branch entirely. 75 probes. `node scripts/db-probes/run.mjs` takes `--dir`,
  `--check`, `--only`, `--json` and reads only `supabase/tests/probes/*.sql`.
- **Never diagnose from a log tail.** Call `GET /actions/jobs/{id}` and read each
  step's conclusion. The tail has given the wrong answer twice on this project, and a
  cancelled job can hide a third failure behind the first.
- Migrations are append only: named, unique, never edited after landing, and they
  must match the live history.

**And before you audit anything: `git fetch` and merge `main` first.** The first
draft of your handoff was written from a checkout 962 commits behind and produced
confident, specific, wrong findings. Say in your report which commit your audit ran
against.

## Report as you go, not at the end

Write `docs/sessions/SESSION-REPORT.md` continuously, so an interrupted session still
leaves usable state. It must carry:

1. **Built, with evidence.** The commit, and how you know it works.
2. **Scored.** Your honest number out of 100 per surface, and what would raise the
   low ones.
3. **The route audit.** All 223 non preview routes, each with two answers: is it
   good, and can a person actually reach it. The second question is the one nobody
   asked, and it is why the rewards work was invisible.
4. **Not built, and why.** Everything you did not reach. Honestly. Three sessions
   reporting done while features were absent or unreachable is what burned him.
5. **Decided for him.** Every call you made instead of asking, one line each, with
   reasoning. He can overturn any of them; he cannot overturn one he never heard
   about.
6. **Blocked on him**, and what each item blocks.
7. **Before and after screenshots** of every surface you changed. He judges with his
   eyes, on a phone. `scripts/design/`, `verify-shots.mjs` and `compare-surface.mjs`
   already exist for this.
8. **What you think is still wrong**, including in the handoff itself.

Append dated entries to `docs/sessions/DIRECTIVES-2026-10-05.md` from **D70** onward.

## Finally

Commit to your branch, push with `git push -u origin <branch>`, and do not open a
pull request unless he asks.

Three passes, not one, on everything. Build it, then read your own diff
adversarially, then check it against his own words in the corpus. The third pass is
the one that catches what he will notice first.

> this is a serious product!!

> please make this session impress me

Route the features into the navigation on day one. Fit the components that already
exist. Write the Payluk adapter. Open the images. Score every screen against whether
anybody would pay two million dollars for it. Review what your agents produce before
you merge it.

And when you write something down as done, make sure that when he opens the app on
his phone, he can find it.

Begin.
