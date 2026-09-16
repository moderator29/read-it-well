# HANDOFF 03: the frontend, and making Vallo look like what it is

**This is the third handoff. `HANDOFF_01` is the company, the law and the
standards. `HANDOFF_02` is the platform and the full transformation. This one is
the frontend revamp, and it is the one the world sees.**

Read 01 and 02 first. Everything in them still binds. This document does not
replace them, it goes deeper on one thing.

Written 16 September 2026.

---

## 0. Why this document exists

**The frontend is the product, to everybody who is not us.**

Nobody opens Vallo and admires the row-level security. They see a landing page,
a property card, a button, an icon, the spacing between two things. Within four
seconds they have decided whether this is a real company or a weekend project,
and every decision after that is coloured by it.

Right now parts of the platform read as the second thing. Not because the
engineering is weak, it is genuinely strong, but because the surface has been
built in layers by different passes with different ideas, and it shows.

**The standard is this: somebody opening Vallo should assume a funded design
team built it.** Not "good for a small team". Not "impressive for an AI build".
Indistinguishable from a product with a design department.

That is the whole brief. Everything below serves it.

---

## 1. What is different now, and it changes the direction

Three things landed between `HANDOFF_02` and this document. Each one moves the
visual target.

### 1.1 There is a real logo, and it has a language

The Vallo logo is a **glass tile**: rounded square, deep navy-black ground,
electric blue rim light, outer glow, a skyline of glass towers with an orbital
swoosh, and a chrome wordmark. It is at `apps/web/public/brand/vallo-logo.png`
with `vallo-icon`, `vallo-mark` and `vallo-wordmark` derived from it.

**That is now the house language.** Glass, depth, electric blue, light that
comes from inside the object rather than from a lamp above it.

### 1.2 The icon system is being replaced, not extended

Ten unique icon sheets are at the repository root, roughly 200 marks, all in
that same glass language. They are listed in full in section 4.

**The 87 objects currently in `apps/web/public/brand/icons/` are soft matte
white clay on white plinths.** Completely different language. The two cannot
coexist in one product, so this is a replacement of the whole `BrandIcon` layer.

**`docs/BRAND_MARKS.md` currently tells you to match new marks to the clay set.
That instruction is now wrong** and that file needs rewriting. It was correct
when it was written and the world moved.

### 1.3 The slogan changed

**"Real Estate reimagined!"**

The old one, "Find it. Rent it. Love it.", is still in `app/layout.tsx` twice in
metadata, `(site)/about/page.tsx`, `components/site/landing/SignatureShowcase.tsx`,
`lib/email/theme.ts` as `SIGN_OFF`, and referenced in
`design-system/brand/Logo.tsx`.

---

## 2. The visual direction

### 2.1 In one paragraph

Deep navy-black ground. Electric blue that genuinely glows rather than just
being a blue fill. Glass surfaces with real depth, edge light and interior
refraction. Generous space. Type that is confident and quiet. Motion that feels
expensive and calm. Nothing decorative that is not carrying meaning. It should
feel like a premium financial product that happens to sell houses, not like a
listings site with effects applied.

### 2.2 The words that decide a judgement call

**Yes:** classy, premium, clean, modern, fast, seamless, elegant, slick,
considered, confident, quiet, deep, tactile, legendary.

**No:** cluttered, childish, over-designed, generic SaaS, template, noisy,
gimmicky, busy, cheap, AI slop.

When a choice is close, ask which list it lands in. That is usually the answer.

### 2.3 Glass, and where it earns its place

Glass is the signature and it is also the easiest thing to ruin.

**Use it for:** the confirmation sheet, status marks and badges, the tab bar and
floating navigation, modal and sheet surfaces, elevated cards that need to sit
above artwork, and the small containers that hold an icon.

**Do not use it for:** long-form reading surfaces, dense tables, every card in a
grid, form fields, or anything where text must be read for more than a few
seconds. Text on glass over a photograph is unreadable at the exact moment
somebody is deciding to trust you with money.

**The rule:** glass is for surfaces that float. Content that is read sits on a
solid ground. A page where everything is glass is a page where nothing is.

**And it must be cheap.** A frosted panel that costs 16ms of paint on a
mid-range Android on a Lagos network is a regression, not a flourish. Measure it.

### 2.4 Colour, and moving it closer to the logo

The palette rules from `HANDOFF_02` section 12 hold in full. One blue family.
Emerald for success, rose for error, bright cyan for attention and pending.
**No orange, amber, gold, purple, violet or magenta, ever.** A new accent is a
new depth of blue.

What changes is the **character** of the blue. The logo and the icons use a blue
that has light in it: an electric royal blue with a lit edge and a bloom around
it, not a flat brand fill. The interface should move toward that.

Specifically, and this is a brief for the audit rather than an instruction to
paint:

- **Primary buttons** should feel like they are lit from within, the way the
  logo tile is. Edge light, a considered glow, depth on press. Not a flat
  rectangle of brand colour
- **Backgrounds** should carry the depth the logo sits on. Navy-black that is
  not flat black, with the faintest gradient or field so the ground has
  dimension
- **Containers and cards** should share one elevation language with the icons
  rather than each surface inventing its own shadow
- **Focus, active and selected states** are where the glow belongs. They are
  moments, and a glow that is everywhere is a glow that means nothing

**Restraint is the whole trick.** The logo works because one object glows
against a dark ground. A screen where twelve things glow is a screen where the
eye has nowhere to rest, and it reads cheap immediately.

### 2.5 Both themes, and light is not an afterthought

**Dark is the default and the operating system does not override it.** Only a
stored choice moves the theme.

**Light is a designed twin, not a tint.** Flat neutral canvas, white cards,
neutral hairlines, brand blue only on active, focus and CTA. No blue-tinted
greys, no dark-only panel left stranded on white.

**The glass language has to survive the crossing, and that is the hardest
problem in this handoff.** An object that glows electric blue against black is
made for the dark. On white paper it can read as a dead sticker.

The founder has already solved it for one set: `CF5A4150` is the dark
transaction set and `C0F67033` is its light twin, the same 24 objects rendered
as frosted white glass with blue accents on a white ground. **That pairing is
the pattern.** Section 4.4 is the brief for extending it.

**Every recommendation in this revamp is judged in both themes.** A finding that
only works in dark is half a finding.

---

## 3. The landing page

This is the single highest-value surface in the product and it is where the new
assets land first.

### 3.1 What is there now

Thirteen components in `apps/web/src/components/site/landing/`:

`AgentsBand`, `CarouselRail`, `FeaturedCarousel`, `HowItWorks`, `MoodRow`,
`NumbersBand`, `PlatformConsole`, `PopularDestinations`, `ProductFrame`,
`SignatureShowcase`, `StoryRail`, `VoicesBand`, `WhyVallo`.

### 3.2 `StoryRail` is the one to look at first

It is the horizontal swipe carousel with the heading *"Swipe through what Vallo
does for you, from the first search to the keys in your hand."* Eight cards,
each with a large 3D render on a pale ground, a kicker, a title and a paragraph.

**Its own header comment says it used to paint eight `/brand/story-*.png`
renders at 6.6MB between them, with a CSS mask dissolving their white studio
ground into the paper.** That mask is a workaround for artwork that was never
cut out properly.

**The twelve new hero objects replace those eight renders.** They are drawn on
black with real glowing podiums, at hero scale, and they are far better suited
to this than what is there. Section 4.2 lists them.

### 3.3 What the audit must answer for the landing page

- Section order, and whether thirteen sections is the right number. Ruthlessly.
  A landing page that says everything says nothing
- Where the twelve hero objects go, at what size, in what order, and what copy
  sits with each one
- Whether `StoryRail` stays a swipe carousel at all, or becomes something better
  now that the artwork is stronger
- The hero itself, above the fold, on a 390px phone, in both themes
- Where **"Real Estate reimagined!"** lives and how it sits with the logo
- What a visitor understands in the first four seconds, and whether that is the
  thing we most want them to understand
- The trust strip, the numbers band, the social proof, and whether any of it is
  making a claim the product cannot support yet
- Performance. This page currently carries heavy artwork and it is the first
  impression on a slow network

**The old deployment still shows RentMe branding.** `main` has been rebranded
but the live Vercel deployment at the old address has not caught up. Check what
is actually deployed before reporting the landing page as still carrying the old
identity.

---

## 4. The icon system

### 4.1 What was uploaded

Twelve PNG files at the repository root, UUID filenames, from commits `e44c5ca`,
`5ad1126` and `325fe24`. Around 1.5 to 1.9MB each.

**Two pairs are exact duplicates. Verify with `md5sum` before slicing anything.**

| Duplicate pair | Keep one |
| --- | --- |
| `ECFA9C34` and `6D730F28` | Same file |
| `B04429B0` and `3C03D844` | Same file |

**Ten unique sheets.**

### 4.2 The two hero sheets, 12 large objects

These are the landing page set. Large glass objects standing on **glowing
circular podiums** with reflections, drawn for hero scale, not for 24px.

| Sheet | Grid | The six objects |
| --- | --- | --- |
| `7EE388E5` | 2x3 | Bot holding a listing card, bot chat on a phone, bot with a house and speech bubble, calendar with plane and luggage, map pin with a stay card, calendar with a clock |
| `8DBE517E` | 2x3 | Villa with a location pin, plane orbiting a globe, growth chart with naira coins, shield with a house and a tick, phone with a calendar, 24/7 support headset |

### 4.3 The transaction set, and it comes in both themes

| Sheet | Ground | What it is |
| --- | --- | --- |
| `CF5A4150` | Glass tiles on black | The dark theme set, 24 marks |
| `C0F67033` | Frosted white glass on white | **The light twin. Same 24 objects, same order** |

**This is `docs/BRAND_MARKS.md` section 3 delivered almost item for item:**
payment sent, payment received, naira coins, payment failed, exchange, wallet
plus, wallet out, receipt with a tick seal, cash box, savings pot, ledger book,
seal check, seal pending with an hourglass, seal cross, hourglass, progress
ring, alert triangle, info round, clock expired, ID card verified, document
under review, document rejected, keys handover, contract with a pen.

**The existence of a matched light and dark pair is the most important thing in
this section.** It is the proof that the glass language can cross themes, and it
is the pattern every other sheet should follow.

### 4.4 The seven remaining sheets, dark only

`0B2E4D21`, `9795AD6E`, `6D730F28`, `3C03D844`, `FDA04DD1`, `2676C1FC`, and the
5x5 property and trust sets. Roughly 25 marks each: property types, trust
shields, money, calendars, keys, search, maps, bots, notifications.

**These have no light twin yet.** Working out what happens to them on the paper
theme is a real design question and section 2.5 is the brief. Options include
commissioning light twins the way the transaction set has one, a treatment that
works on both, or a container the icon sits inside. **Recommend, do not guess.**

### 4.5 The work, in order

1. **Deduplicate.** `md5sum` first. Ten unique sheets, not twelve
2. **Slice** each sheet into individual square PNGs at the highest quality the
   source allows. **Preserve the glow**, it is part of the mark, do not crop it
3. **Cut out the ground.** This is the hard part. A naive removal on a glowing
   object leaves a dark halo that looks filthy on any surface that is not pure
   black. **If a clean result is not achievable, say so, show one example, and
   recommend the alternative. Do not ship dirty cutouts**
4. **Name them** lowercase-hyphen, matching the existing convention wherever an
   equivalent exists, so a swap is a file change and not a code change.
   `shield-check` stays `shield-check`
5. **Build the replacement map.** Three tables: each of the 87 current objects
   and what replaces it; new icons with no current equivalent and where they go;
   current objects with no replacement and what happens to them
6. **Solve light theme** per 2.5 and 4.4
7. **Move the files off the repository root.** Twelve large PNGs with UUID names
   at the root is not where they live. Propose the structure: source sheets,
   sliced output, what is committed and what is build output

### 4.6 The rules that do not move

`docs/ICON_SYSTEM.md` is binding.

- **`UiIcon`** is the 40 stroked glyphs for navigation and controls. One stroke
  weight computed from the size, there is no `strokeWidth` prop. Sizes 12, 16,
  20, 24, 28, 32, nothing between
- **`BrandIcon`** is the 3D content objects. Props are `name`, `size`, `fill`,
  `label`, `priority`, `className`. There is no `ramp` prop
- `Icon` and `Icon3D` are **deleted**, not retired
- **The two tiers never mix in one row**
- If the new packs imply `UiIcon` should change too, **say so as a
  recommendation**, do not act on it

---

## 5. The confirmation system

`HANDOFF_02` section 24 is the full brief and it stands. What changes is that
the artwork now exists: `CF5A4150` and `C0F67033` are exactly this set, in both
themes.

**The reference the founder supplied** is a confirmation sheet from another
product: white sheet, scalloped orange rosette with a white tick, "Successful!",
the amount, two buttons. **The anatomy is right. The execution is everything
this brand is not:** it is orange, it is on white, and the rosette is a generic
sticker.

Take the anatomy. Rebuild it in glass and electric blue.

**One sheet component, driven by state, used by every flow.** Not a bespoke
success screen per flow, which is what exists today.

1. **The mark**, a glass object at generous size. This is the emotional payload
2. **The verdict** in one or two words. "Payment sent". "Under review". Not
   "Successful!" with an exclamation mark, which reads cheap
3. **The fact**: the amount, the property, the date. What gets screenshotted
4. **The consequence**: one line saying what happens next and when. **This is
   the line most products skip and it is the one that removes fear**
5. **Two actions at most**, one primary and one quiet

Colour by meaning and only these: electric blue for brand and primary action,
emerald for success, bright cyan for attention and pending, rose for failure.
**Pending is cyan, never orange.** That was decided when orange was removed.

**Pending is the most neglected state in this product and the most anxious one
for somebody who has just sent money.** Find every place money moves and
establish what the person sees between tapping and settling.

---

## 6. The live database is the truth

The Supabase MCP is connected. Project `uccixoonmbhrnyczyigt`, Postgres 17,
`eu-west-1`.

**Read it before auditing any screen.** An empty state is not theoretical, it is
what a real person is seeing right now.

Counted 16 September 2026. **Verify these, they move:**

| Table | Rows |
| --- | ---: |
| `listings` | 64 |
| **`listing_photos`** | **0** |
| `bookings`, `availability`, `reviews`, `transactions` | 0 |
| `posts` | 66 |
| `areas` | 9 |
| `profiles` | 6 |
| `agents` | 1 |
| `agent_applications` | 0 |
| `stories` | 0 |
| `wallet_entries` | 2 |
| `audit_log` | 482 |

**Sixty-four listings and zero photographs.** Every property card and every
listing page in the product is rendering a stand-in right now. The card has to
be judged against that reality, not against an imagined listing with ten
photographs. Read `MediaFrame.tsx` before writing a word about it, and say what
the card should look like with no photo, with one, and with ten.

---

## 7. Every surface, and nothing is skipped

Every page. Every tab. Every modal. Every popup. Every sheet. Every drawer.
Every empty state. Every loading state. Every skeleton. Every error state. Every
disabled state. Every hover, focus and active state. Every form. Every
validation message. Every transition. Every scroll behaviour.

**The unglamorous screens are where it looks cheap.** Nothing is skipped because
it is small or because nobody demos it. The admin panel gets the same standard
as the landing page.

### What to interrogate

**Foundation.** Spacing rhythm and whether a scale is actually being obeyed.
Type scale, weights, line heights, measure, hierarchy. Radius, border, shadow
and elevation consistency. Grid and alignment, optical rather than mathematical
centring. Colour token discipline. Contrast in both themes.

**Components.** The property preview card, line by line, because it is the most
important component in the product: shape, image treatment, information
hierarchy, price prominence, badge placement, trust signals, hover, press,
loading, saved state, and how twenty of them look together in a grid. What is a
card versus a panel versus a sheet, and whether that is consistent anywhere.
Buttons in every variant, size and state, and whether a disabled one reads as
disabled. Inputs, selects, toggles, steppers. Navigation, tab bar, rail,
headers, back behaviour, deep-link returns. Tables and lists, especially admin.
Badges, chips, pills, status indicators. Avatars, media frames, galleries.

**Flow and feel.** Page transitions. Micro-interactions worth having and ones
that would be noise. Perceived speed, skeleton quality, optimistic UI. Scroll
behaviour, sticky elements, safe areas, gesture conflicts. The number of taps to
do the five most common things. Where a flow dead-ends, loops, or asks twice.

**Copy.** Headlines, subheads, empty states, button labels, error messages,
confirmations. **Copy is design.** Where it is weak, write the better version,
do not just note it.

---

## 8. The documents this work must update

The repository currently describes a product that is changing underneath it.
**When this work lands, these change in the same session.** A document that
contradicts the code is worse than no document.

| File | What changes |
| --- | --- |
| `docs/BRAND_MARKS.md` | **Rewrite.** It says to match the matte clay set. That is now wrong. It becomes the glass system: the ten sheets, the naming, the light and dark pairing |
| `docs/ICON_SYSTEM.md` | The `BrandIcon` tier is a different set of artwork. Tier rules survive, the inventory does not |
| `docs/HANDOFF_02_PLATFORM.md` | Section 12 gains the logo-derived colour direction from 2.4. Section 15.2 and 15.4 gain what actually landed. Section 24 points at the real artwork |
| `docs/HANDOFF.md` | Section 2.1 brand rules gain glass, the logo language and the slogan |
| `docs/PRODUCT.md` | The slogan, and any description of how the product presents itself |
| `docs/IMAGERY.md` | How the new artwork changes what photography is still needed |
| `RECOMMENDATIONS.md` | Not rewritten and not renumbered. The frontend work has its own file |

**Write the new direction into the documents in the founder's voice and the
house style: no em dashes, British spelling, plain sentences that say what is
true.** A document that reads like marketing is a document nobody trusts.

---

## 9. How this session runs

### Two agents, audit only

**Two agents. They recommend, they do not implement.** Nothing ships until the
founder reads the brief and gives the word.

**Agent 1: public and discovery.** Landing page and every section of it, all
`(site)` pages, auth, onboarding, profile setup, search, discovery, filters,
map, saved items, the property preview card, the listing detail page, the social
layer, marketing metadata and share previews.

**Agent 2: in-app, money and operator.** App shell, navigation, drawers, sheets,
modals, toasts, menus, wallet and savings, every success, pending, verified and
failed state, booking, checkout, payment, inspection, messaging, the agent
console, **the entire admin panel**, settings, profile and the verification
wizard.

**Strict non-overlapping scope, agreed in writing before either starts.**

### The contract

- Both agents **restate the rules before starting**. An agent that has not
  restated them has not read them
- **Read-only on the codebase.** They write their report and nothing else
- **Brutally honest.** No flattering assessments. If a screen is ugly, say it is
  ugly and say why. The founder makes decisions on this
- **Recheck before asserting.** Open the file again. A confident wrong finding
  costs more than a missing one
- Every finding carries: file and line, what is wrong, what to do, why it
  matters, impact, effort, risk, priority
- **Say plainly what was not checked**
- **No padding.** If the honest number is 200, give 200
- **Agents never run git.** The lead commits, and the lead re-audits first

### The lead

The lead runs the icon work in section 4 in parallel, because it is mechanical
and bounded. It may slice, cut out, name, organise and commit the files. **It
may not rewire a single `BrandIcon` call site** until the founder gives the word.

---

## 10. The deliverable

1. **`docs/FRONTEND_REVAMP.md`**, every finding from both agents, organised by
   surface, seven fields each. Committed and pushed
2. **The icon replacement map**, the three tables from 4.5, and the light theme
   recommendation
3. **The documents in section 8 updated**
4. **A brief in chat that is actually readable.** Where the frontend stands,
   honestly rated. The five things making it look like an AI app. The biggest
   opportunities. What the icon situation is. What was found for the landing
   page. What could not be done and why
5. **The top 30 picked**, ranked, each saying what changes, what it costs and
   why it is in the thirty. Highest visual and trust impact first
6. **Then stop.** Not a line of implementation until the word is given

**Never say committed, pushed or tested unless it is true. Say what was
skipped.**

---

## 11. The standard, one more time

Not "the app works". Not "it looks fine".

**Somebody opens Vallo and assumes a funded design team built it.**

Beautiful, fast, reliable, coherent from the first screen to the last. No loose
ends, no fake completeness, no abandoned flows, no legacy branding, no generic
design, no "good enough".

This is the foundation. Get it right and everything built on top of it inherits
the quality.
