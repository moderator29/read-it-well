# Vallo asset generation

> **AMENDED 6 OCTOBER BY D29, FOUNDER APPROVED. READ THIS BEFORE ANYTHING BELOW.**
>
> **The matte-clay-for-everything rule in sections 0 to 14 is superseded by a two-tier
> rule.** Those sections remain useful for their subject descriptions, which are still
> correct; their material clause is not.
>
> | Tier | What | Material |
> |---|---|---|
> | **A. Real things** | Buildings, land, estates, and Nigerian infrastructure: prepaid meter, water tank, inverter, generator, borehole pump, estate gate, ceiling fan | **Rich and realistic.** Warm interior light, foliage, real materials, blue-dominant with natural accents |
> | **B. Symbols** | Anything standing for an idea: shield, chart, bell, wallet, padlock, key, receipt, tick, map pin, speech bubble, medal, credential | **Simple and matte**, royal blue, **no gloss**, legible at 32px |
>
> The tier is decided by what the object **is**, not its size: recognised from the
> world is Tier A, stands for a concept is Tier B. The coin, gem and gloss
> prohibitions apply in full to Tier B, where they always belonged.
>
> **No text, letters or signage baked into any asset, in either tier.** Vallo ships in
> four locales and welded English cannot be translated. Signage renders blank.
>
> **Every asset is checked on `#F4F4F1` as well as `#010118`.** Edges that vanish on
> white are rejected: that failure is why the glass set is being replaced.
>
> **Assets are generated as grids and sliced**, not one at a time.
> `scripts/build-icon-assets.py` is the existing precedent. Resolution per object sets
> the grid size: 16 per sheet for symbols used small, up to 32 for places used large.

# ChatGPT image prompts for every Vallo asset

**From Session 1, 5 October 2026.** Every prompt below is **complete and
standalone**. Paste one block straight into ChatGPT. Nothing to assemble, nothing
to prepend.

Governed by `VISUAL_NORTH_STAR_2026-10-05.md` decision D2: matte clay 3D for
content objects at 32px and above, line glyphs for chrome below 32px, and
**glossy, bevelled, chrome, neon-rimmed and glass 3D are banned.** Gloss is the
strongest visual marker of betting and crypto apps, it appears in several of the
reference images, and every one of those is classified AVOID. A property platform
that looks like a coin app loses the cautious renter it most needs.

**Export:** webp at 1x and 2x into `apps/web/public/brand/3d/`. PNG for email into
`apps/web/public/brand/email/`. Section 12 has the generation order.

---

# 1. Property and space types

Ten objects. They carry discovery, the category rows and the listing cards.

### 1.1 Apartment block

```
A single 3D object: a modern Nigerian apartment block, four storeys tall, with
slim cantilevered balconies on each upper floor, a flat roof with a low parapet,
and an even grid of tall windows. Slightly angled three-quarter view so two faces
are visible. Rendered in matte clay with a soft velvety finish, deep royal blue
#2B3FE0, with subtle rounded bevels on every edge. Soft diffused key light from
the upper left, gentle ambient occlusion in the recesses, no specular highlights.
Fully transparent background. Centred with generous even padding. Square 1:1.
Clean studio product render, premium and understated.
Do not include: gloss, shine, reflection, chrome, glass, metal, neon, rim light,
glow, gradient background, floor shadow, text, letters, numbers, logos, people.
```

### 1.2 Detached family house

```
A single 3D object: a detached family house with a pitched roof, a simple front
door, two front windows, and a low compound wall with a closed gate across the
front. Slightly angled three-quarter view. Rendered in matte clay with a soft
velvety finish, deep royal blue #2B3FE0, subtle rounded bevels throughout. Soft
diffused key light from the upper left, gentle ambient occlusion, no specular
highlights. Fully transparent background. Centred with generous even padding.
Square 1:1. Clean studio product render, premium and understated.
Do not include: gloss, shine, reflection, chrome, glass, metal, neon, rim light,
glow, gradient background, floor shadow, text, letters, numbers, logos, people.
```

### 1.3 Boutique hotel

```
A single 3D object: a boutique hotel building, five storeys, with a projecting
entrance canopy over a recessed doorway and even horizontal rows of windows.
Slightly angled three-quarter view. Rendered in matte clay with a soft velvety
finish, deep royal blue #2B3FE0, subtle rounded bevels. Soft diffused key light
from the upper left, gentle ambient occlusion, no specular highlights. Fully
transparent background. Centred with generous even padding. Square 1:1. Clean
studio product render, premium and understated.
Do not include: gloss, shine, reflection, chrome, glass, metal, neon, rim light,
glow, gradient background, floor shadow, text, letters, numbers, logos, people.
```

### 1.4 Shortlet studio

```
A single 3D object: a small two-storey shortlet apartment building with one wide
picture window on the upper floor, a narrow door below, and a flat roof. Compact
and self-contained. Slightly angled three-quarter view. Rendered in matte clay
with a soft velvety finish, deep royal blue #2B3FE0, subtle rounded bevels. Soft
diffused key light from the upper left, gentle ambient occlusion, no specular
highlights. Fully transparent background. Centred with generous even padding.
Square 1:1. Clean studio product render, premium and understated.
Do not include: gloss, shine, reflection, chrome, glass, metal, neon, rim light,
glow, gradient background, floor shadow, text, letters, numbers, logos, people.
```

### 1.5 Office tower

```
A single 3D object: a serviced office tower cropped at its base so the top two
thirds are visible, with a regular even grid of windows and a flat crown. Slightly
angled three-quarter view. Rendered in matte clay with a soft velvety finish, deep
royal blue #2B3FE0, subtle rounded bevels. Soft diffused key light from the upper
left, gentle ambient occlusion, no specular highlights. Fully transparent
background. Centred with generous even padding. Square 1:1. Clean studio product
render, premium and understated.
Do not include: gloss, shine, reflection, chrome, glass, metal, neon, rim light,
glow, gradient background, floor shadow, text, letters, numbers, logos, people.
```

### 1.6 Retail shop

```
A single 3D object: a small single-storey retail shop unit with a closed roll-up
shutter across its front and a short straight awning above it. Slightly angled
three-quarter view. Rendered in matte clay with a soft velvety finish, deep royal
blue #2B3FE0, subtle rounded bevels, with the shutter's horizontal ribs softly
defined. Soft diffused key light from the upper left, gentle ambient occlusion, no
specular highlights. Fully transparent background. Centred with generous even
padding. Square 1:1. Clean studio product render, premium and understated.
Do not include: gloss, shine, reflection, chrome, glass, metal, neon, rim light,
glow, gradient background, floor shadow, text, letters, numbers, logos, people.
```

### 1.7 Plot of land

```
A single 3D object: an empty rectangular plot of land shown as a slightly raised
slab of ground, with a small square boundary marker at each of its four corners
and one slim survey peg standing near the front edge. Viewed from a raised
three-quarter angle. Rendered in matte clay with a soft velvety finish, deep royal
blue #2B3FE0, subtle rounded bevels, the ground surface very slightly textured.
Soft diffused key light from the upper left, gentle ambient occlusion, no specular
highlights. Fully transparent background. Centred with generous even padding.
Square 1:1. Clean studio product render, premium and understated.
Do not include: gloss, shine, reflection, chrome, glass, metal, neon, rim light,
glow, gradient background, floor shadow, text, letters, numbers, logos, people.
```

### 1.8 Restaurant

```
A single 3D object: a single-storey restaurant building with a wide straight
awning across its frontage and two small round outdoor tables standing in front of
it. Slightly angled three-quarter view. Rendered in matte clay with a soft velvety
finish, deep royal blue #2B3FE0, subtle rounded bevels. Soft diffused key light
from the upper left, gentle ambient occlusion, no specular highlights. Fully
transparent background. Centred with generous even padding. Square 1:1. Clean
studio product render, premium and understated.
Do not include: gloss, shine, reflection, chrome, glass, metal, neon, rim light,
glow, gradient background, floor shadow, text, letters, numbers, logos, people.
```

### 1.9 Luxury villa

```
A single 3D object: a low wide luxury villa with a flat roof, broad floor-to-
ceiling window openings across its front, and the near edge of a rectangular
swimming pool in front of it. Viewed from a raised three-quarter angle. Rendered
in matte clay with a soft velvety finish, deep royal blue #2B3FE0, subtle rounded
bevels, the pool rendered as a recessed flat panel of the same clay. Soft diffused
key light from the upper left, gentle ambient occlusion, no specular highlights.
Fully transparent background. Centred with generous even padding. Square 1:1.
Clean studio product render, premium and understated.
Do not include: gloss, shine, reflection, chrome, glass, metal, neon, rim light,
glow, water caustics, gradient background, floor shadow, text, letters, numbers,
logos, people.
```

### 1.10 Estate gate

```
A single 3D object: a gated estate entrance with two square pillars, a horizontal
boom barrier lowered between them, and a small guard post beside the right pillar.
Slightly angled three-quarter view. Rendered in matte clay with a soft velvety
finish, deep royal blue #2B3FE0, subtle rounded bevels. Soft diffused key light
from the upper left, gentle ambient occlusion, no specular highlights. Fully
transparent background. Centred with generous even padding. Square 1:1. Clean
studio product render, premium and understated.
Do not include: gloss, shine, reflection, chrome, glass, metal, neon, rim light,
glow, gradient background, floor shadow, text, letters, numbers, logos, people.
```

---

# 2. Nigerian specifics

**The moat.** No stock icon set has these, and they are what makes a Nigerian
renter believe the product was built for them. The listing model already stores
power band, backup hours, water supply and prepaid meter as structured columns;
these are their faces.

### 2.1 Prepaid meter

```
A single 3D object: a wall-mounted prepaid electricity meter, a rounded
rectangular box with a recessed blank dark display panel across its upper half and
a small grid of square keypad buttons below it. Viewed straight on with a very
slight angle. Rendered in matte clay with a soft velvety finish, deep royal blue
#2B3FE0, subtle rounded bevels, the display panel a slightly deeper recessed tone
of the same clay. Soft diffused key light from the upper left, gentle ambient
occlusion, no specular highlights. Fully transparent background. Centred with
generous even padding. Square 1:1. Clean studio product render.
Do not include: gloss, shine, reflection, chrome, glass, metal, neon, rim light,
glow, lit screen, digits, text, letters, numbers, logos, gradient background,
floor shadow.
```

### 2.2 Water storage tank

```
A single 3D object: a cylindrical domestic water storage tank with a slightly
domed top and a small circular lid, raised on a slim four-legged steel frame with
cross-bracing. Viewed from a slight three-quarter angle. Rendered in matte clay
with a soft velvety finish, deep royal blue #2B3FE0, subtle rounded bevels, the
frame rendered as slender square-section clay members. Soft diffused key light
from the upper left, gentle ambient occlusion, no specular highlights. Fully
transparent background. Centred with generous even padding. Square 1:1. Clean
studio product render.
Do not include: gloss, shine, reflection, chrome, glass, metal, neon, rim light,
glow, water, gradient background, floor shadow, text, letters, numbers, logos.
```

### 2.3 Home inverter

```
A single 3D object: a compact wall-mounted home inverter unit, a rounded
rectangular casing with a blank recessed front panel and ventilation slots along
one side, with a single rectangular battery block standing on the ground beside
it. Slight three-quarter view. Rendered in matte clay with a soft velvety finish,
deep royal blue #2B3FE0, subtle rounded bevels. Soft diffused key light from the
upper left, gentle ambient occlusion, no specular highlights. Fully transparent
background. Centred with generous even padding. Square 1:1. Clean studio product
render.
Do not include: gloss, shine, reflection, chrome, glass, metal, neon, rim light,
glow, indicator lights, cables, text, letters, numbers, logos, gradient
background, floor shadow.
```

### 2.4 Generator

```
A single 3D object: a compact domestic petrol generator, a rounded rectangular
body on a low rectangular plinth, with a short upturned exhaust pipe on one side
and a simple carrying handle across the top. Slight three-quarter view. Rendered
in matte clay with a soft velvety finish, deep royal blue #2B3FE0, subtle rounded
bevels. Soft diffused key light from the upper left, gentle ambient occlusion, no
specular highlights. Fully transparent background. Centred with generous even
padding. Square 1:1. Clean studio product render.
Do not include: gloss, shine, reflection, chrome, glass, metal, neon, rim light,
glow, smoke, text, letters, numbers, logos, gradient background, floor shadow.
```

### 2.5 Borehole pump

```
A single 3D object: a borehole pump head mounted on a square concrete base, with a
short vertical pipe rising from it and a simple curved spout turning outward near
the top. Slight three-quarter view. Rendered in matte clay with a soft velvety
finish, deep royal blue #2B3FE0, subtle rounded bevels. Soft diffused key light
from the upper left, gentle ambient occlusion, no specular highlights. Fully
transparent background. Centred with generous even padding. Square 1:1. Clean
studio product render.
Do not include: gloss, shine, reflection, chrome, glass, metal, neon, rim light,
glow, water, text, letters, numbers, logos, gradient background, floor shadow.
```

### 2.6 Sliding estate gate

```
A single 3D object: a tall sliding metal estate gate, partly open, with evenly
spaced vertical bars and a horizontal rail across the top, and a small square
guard post standing beside it. Slight three-quarter view. Rendered in matte clay
with a soft velvety finish, deep royal blue #2B3FE0, subtle rounded bevels, the
bars rendered as slender rounded clay members. Soft diffused key light from the
upper left, gentle ambient occlusion, no specular highlights. Fully transparent
background. Centred with generous even padding. Square 1:1. Clean studio product
render.
Do not include: gloss, shine, reflection, chrome, glass, metal, neon, rim light,
glow, text, letters, numbers, logos, gradient background, floor shadow.
```

### 2.7 Tenancy agreement, rolled

```
A single 3D object: a rolled paper document, loosely furled so the roll's end is
visible, tied around the middle with a single thin flat ribbon in a simple knot.
Resting horizontally at a slight angle. Rendered in matte clay with a soft velvety
finish, deep royal blue #2B3FE0, subtle rounded bevels, the paper's edge softly
defined where it curls. Soft diffused key light from the upper left, gentle
ambient occlusion, no specular highlights. Fully transparent background. Centred
with generous even padding. Square 1:1. Clean studio product render.
Do not include: gloss, shine, reflection, chrome, glass, metal, neon, rim light,
glow, writing, text, letters, numbers, signatures, seals, logos, gradient
background, floor shadow.
```

### 2.8 House keys

```
A single 3D object: three simple house keys hanging together on a plain circular
split ring, the keys fanned slightly apart so each outline is readable. Viewed
straight on with a slight tilt. Rendered in matte clay with a soft velvety finish,
deep royal blue #2B3FE0, subtle rounded bevels. Soft diffused key light from the
upper left, gentle ambient occlusion, no specular highlights. Fully transparent
background. Centred with generous even padding. Square 1:1. Clean studio product
render.
Do not include: gloss, shine, reflection, chrome, glass, metal, neon, rim light,
glow, keychain charms, text, letters, numbers, logos, gradient background, floor
shadow.
```

### 2.9 Moving box

```
A single 3D object: a sealed cardboard moving box, cubic with slightly softened
corners, a strip of tape across the top seam and one blank rectangular label panel
on its front face. Viewed from a raised three-quarter angle. Rendered in matte clay
with a soft velvety finish, deep royal blue #2B3FE0, subtle rounded bevels, the
corrugation faintly suggested along one visible edge. Soft diffused key light from
the upper left, gentle ambient occlusion, no specular highlights. Fully
transparent background. Centred with generous even padding. Square 1:1. Clean
studio product render.
Do not include: gloss, shine, reflection, chrome, glass, metal, neon, rim light,
glow, writing on the label, text, letters, numbers, arrows, logos, gradient
background, floor shadow.
```

### 2.10 Ceiling fan

```
A single 3D object: a three-bladed ceiling fan seen from a slight angle below, with
a short downrod and a rounded central motor housing, blades motionless and evenly
spaced. Rendered in matte clay with a soft velvety finish, deep royal blue
#2B3FE0, subtle rounded bevels. Soft diffused key light from the upper left,
gentle ambient occlusion, no specular highlights. Fully transparent background.
Centred with generous even padding. Square 1:1. Clean studio product render.
Do not include: gloss, shine, reflection, chrome, glass, metal, neon, rim light,
glow, motion blur, ceiling, text, letters, numbers, logos, gradient background,
floor shadow.
```

---

# 3. Money and trust

### 3.1 Banknotes

```
A single 3D object: a neat stack of three banknotes, slightly offset from one
another so each layer reads, with softly rounded corners and completely blank
faces. Viewed from a raised three-quarter angle. Rendered in matte clay with a
soft velvety finish, deep royal blue #2B3FE0, subtle rounded bevels. Soft diffused
key light from the upper left, gentle ambient occlusion, no specular highlights.
Fully transparent background. Centred with generous even padding. Square 1:1.
Clean studio product render.
Do not include: gloss, shine, reflection, chrome, glass, metal, neon, rim light,
glow, denominations, currency symbols, portraits, patterns, text, letters,
numbers, logos, coins, gradient background, floor shadow.
```

### 3.2 Receipt

```
A single 3D object: a narrow paper receipt, folded once so it stands with a gentle
bend, with a row of faint blank ruled lines suggested across its surface and a
softly serrated edge along the bottom. Viewed straight on with a slight tilt.
Rendered in matte clay with a soft velvety finish, deep royal blue #2B3FE0, subtle
rounded bevels, the ruled lines as very shallow debossed grooves. Soft diffused
key light from the upper left, gentle ambient occlusion, no specular highlights.
Fully transparent background. Centred with generous even padding. Square 1:1.
Clean studio product render.
Do not include: gloss, shine, reflection, chrome, glass, metal, neon, rim light,
glow, readable text, letters, numbers, barcodes, logos, gradient background, floor
shadow.
```

### 3.3 Trust shield

```
A single 3D object: a shield with a soft rounded face and gently tapering sides
coming to a smooth point at the bottom, with one simple raised tick mark embossed
in the centre of its face. Viewed straight on with a very slight tilt. Rendered in
matte clay with a soft velvety finish, deep royal blue #2B3FE0, subtle rounded
bevels, the tick standing slightly proud of the surface and catching the key light
softly. Soft diffused key light from the upper left, gentle ambient occlusion, no
specular highlights. Fully transparent background. Centred with generous even
padding. Square 1:1. Clean studio product render.
Do not include: gloss, shine, reflection, chrome, glass, metal, neon, rim light,
glow, heraldry, crests, text, letters, numbers, logos, gradient background, floor
shadow.
```

### 3.4 Passport

```
A single 3D object: a closed passport booklet with a completely blank cover and
softly rounded corners, resting at a slight angle with its pages faintly visible
as a thin striated edge. Viewed from a raised three-quarter angle. Rendered in
matte clay with a soft velvety finish, deep royal blue #2B3FE0, subtle rounded
bevels. Soft diffused key light from the upper left, gentle ambient occlusion, no
specular highlights. Fully transparent background. Centred with generous even
padding. Square 1:1. Clean studio product render.
Do not include: gloss, shine, reflection, chrome, glass, metal, neon, rim light,
glow, emblems, crests, text, letters, numbers, logos, gradient background, floor
shadow.
```

### 3.5 Rosette medal

```
A single 3D object: a rosette medal with a circular blank centre disc, a ring of
soft pleated fabric folds around it, and two short ribbon tails hanging below.
Viewed straight on with a slight tilt. Rendered in matte clay with a soft velvety
finish, deep royal blue #2B3FE0, with one single small detail picked out in warm
orange #FF6A3D and everything else deep royal blue. Subtle rounded bevels. Soft
diffused key light from the upper left, gentle ambient occlusion, no specular
highlights. Fully transparent background. Centred with generous even padding.
Square 1:1. Clean studio product render.
Do not include: gloss, shine, reflection, chrome, glass, metal, gold, neon, rim
light, glow, stars, text, letters, numbers, logos, gradient background, floor
shadow.
```

### 3.6 Padlock

```
A single 3D object: an upright closed padlock with a rounded rectangular body and
a thick semicircular shackle, and a small keyhole recess on the front face.
Viewed straight on with a slight tilt. Rendered in matte clay with a soft velvety
finish, deep royal blue #2B3FE0, subtle rounded bevels. Soft diffused key light
from the upper left, gentle ambient occlusion, no specular highlights. Fully
transparent background. Centred with generous even padding. Square 1:1. Clean
studio product render.
Do not include: gloss, shine, reflection, chrome, glass, metal, neon, rim light,
glow, text, letters, numbers, logos, gradient background, floor shadow.
```

### 3.7 Bank card

```
A single 3D object: a plain bank card with a completely blank face, softly rounded
corners, and a small raised rectangular chip in the usual upper-left position.
Floating at a gentle three-quarter angle so its thickness reads. Rendered in matte
clay with a soft velvety finish, deep royal blue #2B3FE0, subtle rounded bevels.
Soft diffused key light from the upper left, gentle ambient occlusion, no specular
highlights. Fully transparent background. Centred with generous even padding.
Square 1:1. Clean studio product render.
Do not include: gloss, shine, reflection, chrome, glass, metal, holograms, neon,
rim light, glow, card numbers, names, expiry dates, network logos, text, letters,
numbers, logos, gradient background, floor shadow.
```

### 3.8 Safe

```
A single 3D object: a small floor safe, a cube with softly rounded corners, a
single inset door with a round combination dial at its centre and a short lever
handle beside it. Viewed from a slight three-quarter angle. Rendered in matte clay
with a soft velvety finish, deep royal blue #2B3FE0, subtle rounded bevels. Soft
diffused key light from the upper left, gentle ambient occlusion, no specular
highlights. Fully transparent background. Centred with generous even padding.
Square 1:1. Clean studio product render.
Do not include: gloss, shine, reflection, chrome, glass, metal, neon, rim light,
glow, dial numbers, text, letters, numbers, logos, coins, gradient background,
floor shadow.
```

### 3.9 Balanced scales

```
A single 3D object: a simple pair of balanced scales, a central upright column on
a round base with a horizontal beam across the top and a shallow round pan hanging
level from each end. Perfectly level and symmetrical. Viewed straight on with a
very slight tilt. Rendered in matte clay with a soft velvety finish, deep royal
blue #2B3FE0, subtle rounded bevels. Soft diffused key light from the upper left,
gentle ambient occlusion, no specular highlights. Fully transparent background.
Centred with generous even padding. Square 1:1. Clean studio product render.
Do not include: gloss, shine, reflection, chrome, glass, metal, gold, neon, rim
light, glow, objects in the pans, text, letters, numbers, logos, gradient
background, floor shadow.
```

### 3.10 Wallet

```
A single 3D object: a closed bifold wallet with soft folded edges and a gently
rounded silhouette, resting flat at a slight angle. Rendered in matte clay with a
soft velvety finish, deep royal blue #2B3FE0, subtle rounded bevels, the fold line
softly creased. Soft diffused key light from the upper left, gentle ambient
occlusion, no specular highlights. Fully transparent background. Centred with
generous even padding. Square 1:1. Clean studio product render.
Do not include: gloss, shine, reflection, chrome, glass, metal, neon, rim light,
glow, stitching detail, cards sticking out, coins, text, letters, numbers, logos,
gradient background, floor shadow.
```

---

# 4. Actions and states

### 4.1 Search

```
A single 3D object: a magnifying glass with a thick circular rim and a short
rounded handle, hovering over a small rounded teardrop map pin that sits beneath
it. Viewed at a slight three-quarter angle. Rendered in matte clay with a soft
velvety finish, deep royal blue #2B3FE0, subtle rounded bevels, the lens area a
flat recessed panel of the same clay rather than transparent. Soft diffused key
light from the upper left, gentle ambient occlusion, no specular highlights. Fully
transparent background. Centred with generous even padding. Square 1:1. Clean
studio product render.
Do not include: gloss, shine, reflection, chrome, glass, transparency, metal, neon,
rim light, glow, text, letters, numbers, logos, gradient background, floor shadow.
```

### 4.2 Paper plane

```
A single 3D object: a folded paper plane in flight at a gentle upward angle, with
crisp fold lines and softly rounded edges, wings slightly swept. Rendered in matte
clay with a soft velvety finish, deep royal blue #2B3FE0, subtle rounded bevels,
the folds reading as shallow creases. Soft diffused key light from the upper left,
gentle ambient occlusion, no specular highlights. Fully transparent background.
Centred with generous even padding. Square 1:1. Clean studio product render.
Do not include: gloss, shine, reflection, chrome, glass, metal, neon, rim light,
glow, motion trails, dotted flight lines, text, letters, numbers, logos, gradient
background, floor shadow.
```

### 4.3 Bell

```
A single 3D object: a notification bell with a soft rounded dome, a small rounded
knob on top, a gently flared rim and a simple round clapper visible beneath.
Viewed straight on with a slight tilt. Rendered in matte clay with a soft velvety
finish, deep royal blue #2B3FE0, subtle rounded bevels. Soft diffused key light
from the upper left, gentle ambient occlusion, no specular highlights. Fully
transparent background. Centred with generous even padding. Square 1:1. Clean
studio product render.
Do not include: gloss, shine, reflection, chrome, glass, metal, gold, neon, rim
light, glow, motion lines, badges, text, letters, numbers, logos, gradient
background, floor shadow.
```

### 4.4 Calendar

```
A single 3D object: a calendar block, a thick rounded square with one completely
blank page on its face, a narrow band across the top and two small rounded binding
rings rising from it. Viewed straight on with a slight tilt. Rendered in matte clay
with a soft velvety finish, deep royal blue #2B3FE0, subtle rounded bevels. Soft
diffused key light from the upper left, gentle ambient occlusion, no specular
highlights. Fully transparent background. Centred with generous even padding.
Square 1:1. Clean studio product render.
Do not include: gloss, shine, reflection, chrome, glass, metal, neon, rim light,
glow, dates, grids, text, letters, numbers, logos, gradient background, floor
shadow.
```

### 4.5 Chat bubbles

```
A single 3D object: two overlapping speech bubbles, the rear one a solid rounded
rectangle with a small tail and the front one the same shape rendered as a hollow
outline so the solid bubble reads through it. Arranged at a slight angle. Rendered
in matte clay with a soft velvety finish, deep royal blue #2B3FE0, subtle rounded
bevels. Soft diffused key light from the upper left, gentle ambient occlusion, no
specular highlights. Fully transparent background. Centred with generous even
padding. Square 1:1. Clean studio product render.
Do not include: gloss, shine, reflection, chrome, glass, metal, neon, rim light,
glow, dots, text, letters, numbers, emoji, logos, gradient background, floor
shadow.
```

### 4.6 Bar chart

```
A single 3D object: three upright rectangular bars of increasing height standing
side by side on a thin rounded base, evenly spaced, with softly rounded tops.
Viewed straight on with a slight three-quarter tilt so their depth reads. Rendered
in matte clay with a soft velvety finish, deep royal blue #2B3FE0, subtle rounded
bevels. Soft diffused key light from the upper left, gentle ambient occlusion, no
specular highlights. Fully transparent background. Centred with generous even
padding. Square 1:1. Clean studio product render.
Do not include: gloss, shine, reflection, chrome, glass, metal, neon, rim light,
glow, axis labels, gridlines, arrows, text, letters, numbers, logos, gradient
background, floor shadow.
```

### 4.7 Checklist clipboard

```
A single 3D object: a clipboard with a small rounded clip at the top and three
blank checklist rows on its face, each row a shallow debossed line with an empty
square box at its left. Viewed straight on with a slight tilt. Rendered in matte
clay with a soft velvety finish, deep royal blue #2B3FE0, subtle rounded bevels.
Soft diffused key light from the upper left, gentle ambient occlusion, no specular
highlights. Fully transparent background. Centred with generous even padding.
Square 1:1. Clean studio product render.
Do not include: gloss, shine, reflection, chrome, glass, metal, neon, rim light,
glow, ticks in the boxes, writing, text, letters, numbers, logos, gradient
background, floor shadow.
```

### 4.8 Map pin

```
A single 3D object: a single map pin, a rounded teardrop form with a circular
recess at its centre, standing upright with its point downward. Viewed straight on
with a very slight tilt. Rendered in matte clay with a soft velvety finish, deep
royal blue #2B3FE0, subtle rounded bevels. Soft diffused key light from the upper
left, gentle ambient occlusion, no specular highlights. Fully transparent
background. Centred with generous even padding. Square 1:1. Clean studio product
render.
Do not include: gloss, shine, reflection, chrome, glass, metal, neon, rim light,
glow, map, ground, ripples, text, letters, numbers, logos, gradient background,
floor shadow.
```

### 4.9 Camera

```
A single 3D object: a compact camera body, a rounded rectangular form seen
front-on, with a protruding cylindrical lens barrel at its centre, a small raised
shutter button on the top plate and a slim viewfinder bump. The lens face is a
flat recessed disc of the same clay. Rendered in matte clay with a soft velvety
finish, deep royal blue #2B3FE0, subtle rounded bevels. Soft diffused key light
from the upper left, gentle ambient occlusion, no specular highlights. Fully
transparent background. Centred with generous even padding. Square 1:1. Clean
studio product render.
Do not include: gloss, shine, reflection, chrome, glass, lens flare, metal, neon,
rim light, glow, text, letters, numbers, brand marks, logos, gradient background,
floor shadow.
```

### 4.10 Saved home

```
A single 3D object: a small simple house with a pitched roof, with a heart shape
cut cleanly through its front face as an opening so the shape reads as a void
rather than an applied decoration. Viewed straight on with a slight tilt. Rendered
in matte clay with a soft velvety finish, deep royal blue #2B3FE0, subtle rounded
bevels, the cut edges of the heart softly chamfered. Soft diffused key light from
the upper left, gentle ambient occlusion, no specular highlights. Fully
transparent background. Centred with generous even padding. Square 1:1. Clean
studio product render.
Do not include: gloss, shine, reflection, chrome, glass, metal, neon, rim light,
glow, red colour, text, letters, numbers, logos, gradient background, floor
shadow.
```

---

# 5. Empty states

**Twelve, and these matter more than anything else on this page**, because every
discovery surface in the product is genuinely empty until listers arrive. Each must
feel quiet and hopeful, never sad, broken or apologetic.

### 5.1 Open box

```
A single 3D object: an open empty cardboard box with its four lid flaps folded
outward and down, interior visible and completely empty. Viewed from a raised
three-quarter angle so the inside reads. Rendered in matte clay with a soft velvety
finish, deep royal blue #2B3FE0, subtle rounded bevels, the interior walls slightly
darker through ambient occlusion. Soft diffused key light from the upper left,
gentle ambient occlusion, no specular highlights. Fully transparent background.
Centred with generous even padding. Square 1:1. Calm, quiet and hopeful in mood.
Do not include: gloss, shine, reflection, chrome, glass, metal, neon, rim light,
glow, contents, packing material, text, letters, numbers, arrows, logos, gradient
background, floor shadow.
```

### 5.2 Open birdcage

```
A single 3D object: a small domed birdcage with evenly spaced vertical bars, a
ring handle on top, and its little door standing open outward. Empty inside.
Viewed straight on with a slight tilt. Rendered in matte clay with a soft velvety
finish, deep royal blue #2B3FE0, subtle rounded bevels, the bars as slender rounded
clay members. Soft diffused key light from the upper left, gentle ambient
occlusion, no specular highlights. Fully transparent background. Centred with
generous even padding. Square 1:1. Calm, quiet and hopeful in mood.
Do not include: gloss, shine, reflection, chrome, glass, metal, neon, rim light,
glow, birds, feathers, text, letters, numbers, logos, gradient background, floor
shadow.
```

### 5.3 Unlit paper lantern

```
A single 3D object: a single unlit cylindrical paper lantern standing upright, with
soft concertina ribbing around its body and a small round cap at the top. Unlit and
quiet. Viewed straight on with a very slight tilt. Rendered in matte clay with a
soft velvety finish, deep royal blue #2B3FE0, subtle rounded bevels. Soft diffused
key light from the upper left, gentle ambient occlusion, no specular highlights.
Fully transparent background. Centred with generous even padding. Square 1:1. Calm,
quiet and hopeful in mood.
Do not include: gloss, shine, reflection, chrome, glass, metal, neon, rim light,
glow, flame, light emission, text, letters, numbers, logos, gradient background,
floor shadow.
```

### 5.4 Empty shelf

```
A single 3D object: a single horizontal wall shelf with two simple angled brackets
beneath it and one small unused hook fixed under its front edge. Completely empty.
Viewed straight on with a slight tilt. Rendered in matte clay with a soft velvety
finish, deep royal blue #2B3FE0, subtle rounded bevels. Soft diffused key light
from the upper left, gentle ambient occlusion, no specular highlights. Fully
transparent background. Centred with generous even padding. Square 1:1. Calm, quiet
and hopeful in mood.
Do not include: gloss, shine, reflection, chrome, glass, metal, neon, rim light,
glow, objects on the shelf, wall, text, letters, numbers, logos, gradient
background, floor shadow.
```

### 5.5 Closed envelope

```
A single 3D object: a closed envelope resting flat with a completely blank face,
its back flap visible as a soft triangular seam, corners gently rounded. Viewed
from a raised three-quarter angle. Rendered in matte clay with a soft velvety
finish, deep royal blue #2B3FE0, subtle rounded bevels. Soft diffused key light
from the upper left, gentle ambient occlusion, no specular highlights. Fully
transparent background. Centred with generous even padding. Square 1:1. Calm, quiet
and hopeful in mood.
Do not include: gloss, shine, reflection, chrome, glass, metal, wax seals, stamps,
neon, rim light, glow, addresses, text, letters, numbers, logos, gradient
background, floor shadow.
```

### 5.6 Fanned blank cards

```
A single 3D object: a stack of three blank rectangular cards with softly rounded
corners, fanned slightly apart so each card's edge reads, resting at a gentle
angle. Rendered in matte clay with a soft velvety finish, deep royal blue #2B3FE0,
subtle rounded bevels. Soft diffused key light from the upper left, gentle ambient
occlusion, no specular highlights. Fully transparent background. Centred with
generous even padding. Square 1:1. Calm, quiet and hopeful in mood.
Do not include: gloss, shine, reflection, chrome, glass, metal, neon, rim light,
glow, writing, text, letters, numbers, logos, gradient background, floor shadow.
```

### 5.7 Empty picture frame

```
A single 3D object: an empty rectangular picture frame standing on a small folding
easel back, its interior an open void rather than a filled panel. Viewed straight
on with a slight tilt. Rendered in matte clay with a soft velvety finish, deep
royal blue #2B3FE0, subtle rounded bevels, the frame's inner edge softly chamfered.
Soft diffused key light from the upper left, gentle ambient occlusion, no specular
highlights. Fully transparent background. Centred with generous even padding.
Square 1:1. Calm, quiet and hopeful in mood.
Do not include: gloss, shine, reflection, chrome, glass, mirror, metal, neon, rim
light, glow, picture, canvas, text, letters, numbers, logos, gradient background,
floor shadow.
```

### 5.8 Empty teacup

```
A single 3D object: a single empty teacup with a simple curved handle, resting on a
shallow round saucer. Completely empty. Viewed from a slightly raised three-quarter
angle so the inside of the cup reads. Rendered in matte clay with a soft velvety
finish, deep royal blue #2B3FE0, subtle rounded bevels. Soft diffused key light
from the upper left, gentle ambient occlusion, no specular highlights. Fully
transparent background. Centred with generous even padding. Square 1:1. Calm, quiet
and hopeful in mood.
Do not include: gloss, shine, reflection, chrome, glass, ceramic sheen, metal,
neon, rim light, glow, liquid, steam, text, letters, numbers, logos, gradient
background, floor shadow.
```

### 5.9 Blank map

```
A single 3D object: an unrolled blank map lying flat with its corners softly
curling upward, surface completely empty with no features. Viewed from a raised
three-quarter angle. Rendered in matte clay with a soft velvety finish, deep royal
blue #2B3FE0, subtle rounded bevels, the curling corners casting gentle occlusion
on the sheet. Soft diffused key light from the upper left, gentle ambient
occlusion, no specular highlights. Fully transparent background. Centred with
generous even padding. Square 1:1. Calm, quiet and hopeful in mood.
Do not include: gloss, shine, reflection, chrome, glass, metal, neon, rim light,
glow, coastlines, roads, grids, compass roses, text, letters, numbers, logos,
gradient background, floor shadow.
```

### 5.10 Watering can

```
A single 3D object: a small watering can with a curved carrying handle and a long
tapering spout, tipped very slightly forward but with nothing pouring from it.
Viewed from a slight three-quarter angle. Rendered in matte clay with a soft
velvety finish, deep royal blue #2B3FE0, subtle rounded bevels. Soft diffused key
light from the upper left, gentle ambient occlusion, no specular highlights. Fully
transparent background. Centred with generous even padding. Square 1:1. Calm,
quiet and hopeful in mood.
Do not include: gloss, shine, reflection, chrome, glass, metal, neon, rim light,
glow, water, droplets, plants, text, letters, numbers, logos, gradient background,
floor shadow.
```

### 5.11 Empty basket

```
A single 3D object: an empty woven shopping basket with two short curved handles,
its weave suggested as a soft regular texture, completely empty inside. Viewed from
a raised three-quarter angle so the interior reads. Rendered in matte clay with a
soft velvety finish, deep royal blue #2B3FE0, subtle rounded bevels. Soft diffused
key light from the upper left, gentle ambient occlusion, no specular highlights.
Fully transparent background. Centred with generous even padding. Square 1:1. Calm,
quiet and hopeful in mood.
Do not include: gloss, shine, reflection, chrome, glass, metal, neon, rim light,
glow, contents, produce, text, letters, numbers, logos, gradient background, floor
shadow.
```

### 5.12 Door ajar

```
A single 3D object: a simple panelled door standing very slightly ajar within its
frame, with a small round handle, the opening beyond reading as soft empty space.
Viewed straight on with a slight angle so the door's thickness and the gap read.
Rendered in matte clay with a soft velvety finish, deep royal blue #2B3FE0, subtle
rounded bevels. Soft diffused key light from the upper left, gentle ambient
occlusion deepening in the opening, no specular highlights. Fully transparent
background. Centred with generous even padding. Square 1:1. Calm, quiet and hopeful
in mood.
Do not include: gloss, shine, reflection, chrome, glass, metal, neon, rim light,
glow, bright light spill, room behind, text, letters, numbers, logos, gradient
background, floor shadow.
```

---

# 6. Success and reward

For the full-screen success moment and the earned badge reveal. The warm accent is
permitted here and nowhere else except the top tier plaque.

### 6.1 Large tick

```
A single 3D object: a large bold tick mark with softly rounded stroke ends, set
inside a soft circular disc so the tick sits slightly proud of the disc's face.
Viewed straight on with a very slight tilt. Rendered in matte clay with a soft
velvety finish, deep royal blue #2B3FE0, subtle rounded bevels. Soft diffused key
light from the upper left, gentle ambient occlusion where the tick meets the disc,
no specular highlights. Fully transparent background. Centred with generous even
padding. Square 1:1. Clean studio product render, confident and calm.
Do not include: gloss, shine, reflection, chrome, glass, metal, green colour, neon,
rim light, glow, sparkles, confetti, text, letters, numbers, logos, gradient
background, floor shadow.
```

### 6.2 Trophy

```
A single 3D object: a trophy with a wide shallow cup, two small side handles, a
short stem and a square plinth base with a blank front face. Viewed straight on
with a slight tilt. Rendered in matte clay with a soft velvety finish, deep royal
blue #2B3FE0, with one single small detail picked out in warm orange #FF6A3D and
everything else deep royal blue. Subtle rounded bevels. Soft diffused key light
from the upper left, gentle ambient occlusion, no specular highlights. Fully
transparent background. Centred with generous even padding. Square 1:1.
Do not include: gloss, shine, reflection, chrome, glass, gold, metal, neon, rim
light, glow, sparkles, engraving, text, letters, numbers, logos, gradient
background, floor shadow.
```

### 6.3 Gift box

```
A single 3D object: a cubic gift box with its lid lifting slightly off and
floating just above the body, a flat ribbon crossing the box in both directions and
a small simple bow on top. Viewed from a raised three-quarter angle. Rendered in
matte clay with a soft velvety finish, deep royal blue #2B3FE0, with the ribbon
picked out in warm orange #FF6A3D and everything else deep royal blue. Subtle
rounded bevels. Soft diffused key light from the upper left, gentle ambient
occlusion in the gap under the lid, no specular highlights. Fully transparent
background. Centred with generous even padding. Square 1:1.
Do not include: gloss, shine, reflection, chrome, glass, metal, neon, rim light,
glow, sparkles, confetti, light beams from inside, text, letters, numbers, logos,
gradient background, floor shadow.
```

### 6.4 Ticket

```
A single 3D object: a rectangular ticket with one perforated edge of small
semicircular notches, a short dashed tear line beside it, and a completely blank
face. Resting at a gentle angle with a slight bend so it reads as paper. Rendered
in matte clay with a soft velvety finish, deep royal blue #2B3FE0, with the dashed
tear line picked out in warm orange #FF6A3D and everything else deep royal blue.
Subtle rounded bevels. Soft diffused key light from the upper left, gentle ambient
occlusion, no specular highlights. Fully transparent background. Centred with
generous even padding. Square 1:1.
Do not include: gloss, shine, reflection, chrome, glass, metal, neon, rim light,
glow, barcodes, serial numbers, text, letters, numbers, logos, gradient background,
floor shadow.
```

### 6.5 Key on a cushion

```
A single 3D object: a single simple key resting diagonally on a small soft square
cushion with gently rounded corners and a slight dip where the key sits. Viewed
from a raised three-quarter angle. Rendered in matte clay with a soft velvety
finish, deep royal blue #2B3FE0, subtle rounded bevels, the cushion reading as soft
and slightly compressed. Soft diffused key light from the upper left, gentle
ambient occlusion where the key meets the cushion, no specular highlights. Fully
transparent background. Centred with generous even padding. Square 1:1.
Do not include: gloss, shine, reflection, chrome, glass, metal, gold, neon, rim
light, glow, sparkles, tassels, text, letters, numbers, logos, gradient background,
floor shadow.
```

### 6.6 Sunburst

```
A single 3D object: a radial sunburst of twelve short tapering rays with softly
rounded tips, radiating evenly outward from an empty circular centre. Flat and
symmetrical, viewed straight on. Rendered in matte clay with a soft velvety finish,
deep royal blue #2B3FE0, with the ray tips picked out in warm orange #FF6A3D and
everything else deep royal blue. Subtle rounded bevels. Soft diffused key light
from the upper left, gentle ambient occlusion, no specular highlights. Fully
transparent background. Centred with generous even padding. Square 1:1.
Do not include: gloss, shine, reflection, chrome, glass, metal, gold, neon, rim
light, glow, light emission, lens flare, sparkles, text, letters, numbers, logos,
gradient background, floor shadow.
```

### 6.7 Flag on a mound

```
A single 3D object: a small plain flag on a slim pole, planted upright in a low
rounded mound of ground, the flag hanging with a soft gentle curve and a completely
blank face. Viewed straight on with a slight tilt. Rendered in matte clay with a
soft velvety finish, deep royal blue #2B3FE0, subtle rounded bevels. Soft diffused
key light from the upper left, gentle ambient occlusion, no specular highlights.
Fully transparent background. Centred with generous even padding. Square 1:1.
Do not include: gloss, shine, reflection, chrome, glass, metal, neon, rim light,
glow, emblems, text, letters, numbers, logos, gradient background, floor shadow.
```

### 6.8 Milestone medal

```
A single 3D object: a circular medal with a blank raised centre disc, a plain ring
border, and a short flat ribbon loop at the top. Viewed straight on with a very
slight tilt. Rendered in matte clay with a soft velvety finish, deep royal blue
#2B3FE0, with one single small detail on the ribbon picked out in warm orange
#FF6A3D and everything else deep royal blue. Subtle rounded bevels. Soft diffused
key light from the upper left, gentle ambient occlusion, no specular highlights.
Fully transparent background. Centred with generous even padding. Square 1:1.
Do not include: gloss, shine, reflection, chrome, glass, gold, metal, neon, rim
light, glow, stars, numerals, engraving, text, letters, numbers, logos, gradient
background, floor shadow.
```

---

# 7. Tier and passport plaques

Matching reference IMG_7050: a hero object above three stats and a benefit list.
Three tiers of increasing presence. **The warm accent appears only on the top
tier.**

### 7.1 Tier one

```
A single 3D object: a flat rounded rectangular plaque with a completely blank face
and softly chamfered edges, floating level and seen from a slightly raised
three-quarter angle so its thin depth reads. Rendered in matte clay with a soft
velvety finish, deep matte navy #0A1231, subtle rounded bevels. Soft diffused key
light from the upper left, gentle ambient occlusion along the lower edges, no
specular highlights. Fully transparent background. Centred with generous even
padding. Square 1:1. Restrained and quiet.
Do not include: gloss, shine, reflection, chrome, glass, metal, holograms, neon,
rim light, glow, patterns, text, letters, numbers, logos, gradient background,
floor shadow.
```

### 7.2 Tier two

```
A single 3D object: a flat rounded rectangular plaque with a completely blank face
and softly chamfered edges, slightly thicker than a standard card, floating level
and seen from a slightly raised three-quarter angle. Rendered in matte clay with a
soft velvety finish, royal blue #2B3FE0, subtle rounded bevels. Soft diffused key
light from the upper left, gentle ambient occlusion along the lower edges, no
specular highlights. Fully transparent background. Centred with generous even
padding. Square 1:1. Confident but still restrained.
Do not include: gloss, shine, reflection, chrome, glass, metal, holograms, neon,
rim light, glow, patterns, text, letters, numbers, logos, gradient background,
floor shadow.
```

### 7.3 Tier three, top

```
A single 3D object: a flat rounded rectangular plaque with a completely blank face
and softly chamfered edges, the thickest of a set, floating level and seen from a
slightly raised three-quarter angle. Rendered in matte clay with a soft velvety
finish, deep matte navy #0A1231, with one single thin warm orange #FF6A3D line
inset along its top edge only. No other colour anywhere. Subtle rounded bevels.
Soft diffused key light from the upper left, gentle ambient occlusion along the
lower edges, no specular highlights. Fully transparent background. Centred with
generous even padding. Square 1:1. Quietly premium.
Do not include: gloss, shine, reflection, chrome, glass, metal, holograms,
iridescence, neon, rim light, glow, patterns, text, letters, numbers, logos,
gradient background, floor shadow.
```

---

# 8. Onboarding scenes

**3:2 landscape, not square.** Four slides, wider compositions with a shallow
depth of field so the scene feels like a small set rather than a single icon.

### 8.1 Slide one, finding a place

```
A small 3D scene in 3:2 landscape: a cluster of three Nigerian apartment buildings
of differing heights standing close together, with one slim street tree between
two of them and a short stretch of pavement in front. Rendered in matte clay with a
soft velvety finish, deep royal blue #2B3FE0, subtle rounded bevels throughout.
Soft diffused key light from the upper left, gentle ambient occlusion between the
buildings, no specular highlights. Shallow depth of field with the nearest building
sharpest. Fully transparent background. Composed slightly left of centre with
generous padding. Calm and inviting.
Do not include: gloss, shine, reflection, chrome, glass, metal, neon, rim light,
glow, sky, clouds, ground plane, text, letters, numbers, logos, people, cars.
```

### 8.2 Slide two, getting the keys

```
A small 3D scene in 3:2 landscape: a panelled door standing slightly ajar in its
frame with a key resting in the lock, the opening beyond reading as soft empty
space. Rendered in matte clay with a soft velvety finish, deep royal blue #2B3FE0,
subtle rounded bevels. Soft diffused key light from the upper left, gentle ambient
occlusion deepening in the door's opening, no specular highlights. Shallow depth of
field with the key sharpest. Fully transparent background. Composed slightly right
of centre with generous padding. Warm and hopeful without any light source.
Do not include: gloss, shine, reflection, chrome, glass, metal, neon, rim light,
glow, bright light spill, room interior, sky, ground plane, text, letters, numbers,
logos, people.
```

### 8.3 Slide three, the agreement

```
A small 3D scene in 3:2 landscape: a desk corner with a single document lying flat
upon it and a slim pen resting diagonally across the page, the document's face
completely blank. Viewed from a raised three-quarter angle. Rendered in matte clay
with a soft velvety finish, deep royal blue #2B3FE0, subtle rounded bevels. Soft
diffused key light from the upper left, gentle ambient occlusion under the pen and
the page edges, no specular highlights. Shallow depth of field with the pen
sharpest. Fully transparent background. Composed slightly left of centre with
generous padding. Serious and reassuring.
Do not include: gloss, shine, reflection, chrome, glass, metal, neon, rim light,
glow, writing, signatures, stamps, text, letters, numbers, logos, people, hands.
```

### 8.4 Slide four, talking to a real person

```
A small 3D scene in 3:2 landscape: two speech bubbles of slightly different sizes
floating above a small simple house with a pitched roof, the rear bubble solid and
the front one a hollow outline, both with small tails pointing down toward the
house. Rendered in matte clay with a soft velvety finish, deep royal blue #2B3FE0,
subtle rounded bevels. Soft diffused key light from the upper left, gentle ambient
occlusion where the bubbles overlap, no specular highlights. Shallow depth of field
with the front bubble sharpest. Fully transparent background. Composed centrally
with generous padding. Friendly and calm.
Do not include: gloss, shine, reflection, chrome, glass, metal, neon, rim light,
glow, typing dots, emoji, text, letters, numbers, logos, people, avatars.
```

---

# 9. Email header objects

Ten, **PNG with transparency, 480px wide**, one per email family. Same material
rules; a touch more presence because they sit on a Paper receipt background.

| Email | Object |
|---|---|
| Payment and receipt | 3.2 Receipt |
| Booking confirmed | 9.1 below |
| Reminder | 4.4 Calendar |
| New message | 4.5 Chat bubbles |
| Badge earned | 6.8 Milestone medal |
| Verification | 3.3 Trust shield |
| Security and passcode | 3.6 Padlock |
| Invite and referral | 4.2 Paper plane |
| Agreement | 4.7 Checklist clipboard |
| Monthly summary | 4.6 Bar chart |

### 9.1 Booking confirmed

```
A single 3D object: a small simple house with a pitched roof and one front window,
with a bold tick mark embossed on its front face standing slightly proud of the
surface. Viewed straight on with a very slight tilt. Rendered in matte clay with a
soft velvety finish, deep royal blue #2B3FE0, subtle rounded bevels. Soft diffused
key light from the upper left, gentle ambient occlusion where the tick meets the
wall, no specular highlights. Fully transparent background. Centred with generous
even padding. Square 1:1. Clean studio product render, warm and reassuring.
Do not include: gloss, shine, reflection, chrome, glass, metal, green colour, neon,
rim light, glow, sparkles, text, letters, numbers, logos, gradient background,
floor shadow.
```

---

# 9A. Premium artefact cards (tiers and credentials)

North star 14.4. For the Space Passport, trust tiers, Pro plans and promotion tiers.
Rendered as a fan of three, so generate all three with identical geometry and lighting
so they stack cleanly.

**The hard limit: Vallo issues no payment card.** No chip, no network mark, no long
number, no magnetic stripe, nothing that could be mistaken for a bank card.

### 9A.1 Tier one credential

```
A single 3D object: a flat rounded rectangular credential card with a completely blank
face, softly chamfered edges, floating level and seen from a slightly raised
three-quarter angle so its thin depth reads. Proportions of a standard card but with
no chip, no magnetic stripe, no numbers and no markings of any kind. Rendered in matte
clay with a soft velvety finish, deep matte navy #0A1231, subtle rounded bevels. Soft
diffused key light from the upper left, gentle ambient occlusion along the lower edges,
no specular highlights. Fully transparent background. Centred with generous even
padding. Square 1:1. Restrained and quiet.
Do not include: gloss, shine, mirror finish, reflection, chrome, metal, holograms,
iridescence, neon, rim light, glow, chip, magnetic stripe, card numbers, network logos,
text, letters, numbers, patterns, gradient background, floor shadow.
```

### 9A.2 Tier two credential

```
A single 3D object: a flat rounded rectangular credential card with a completely blank
face, softly chamfered edges, slightly thicker than a standard card, floating level and
seen from a slightly raised three-quarter angle. No chip, no stripe, no numbers, no
markings. Rendered in matte clay with a soft velvety finish, royal blue #2B3FE0, subtle
rounded bevels. Soft diffused key light from the upper left, gentle ambient occlusion
along the lower edges, no specular highlights. Fully transparent background. Centred
with generous even padding. Square 1:1. Confident but restrained.
Do not include: gloss, shine, mirror finish, reflection, chrome, metal, holograms,
iridescence, neon, rim light, glow, chip, magnetic stripe, card numbers, network logos,
text, letters, numbers, patterns, gradient background, floor shadow.
```

### 9A.3 Tier three credential, top

```
A single 3D object: a flat rounded rectangular credential card with a completely blank
face, softly chamfered edges, the thickest of a set, floating level and seen from a
slightly raised three-quarter angle. No chip, no stripe, no numbers, no markings.
Rendered in matte clay with a soft velvety finish, deep matte navy #0A1231, with one
single thin warm orange #FF6A3D line inset along its top edge only and no other colour
anywhere. Subtle rounded bevels. Soft diffused key light from the upper left, gentle
ambient occlusion along the lower edges, no specular highlights. Fully transparent
background. Centred with generous even padding. Square 1:1. Quietly premium.
Do not include: gloss, shine, mirror finish, reflection, chrome, metal, holograms,
iridescence, neon, rim light, glow, chip, magnetic stripe, card numbers, network logos,
text, letters, numbers, patterns, gradient background, floor shadow.
```

### 9A.4 The passport credential

```
A single 3D object: a closed passport-style credential booklet with a completely blank
cover, softly rounded corners, standing at a slight angle with its pages visible as a
thin striated edge, and a small blank embossed rectangle recessed into the cover where
a crest would normally sit. Rendered in matte clay with a soft velvety finish, deep
royal blue #2B3FE0, subtle rounded bevels. Soft diffused key light from the upper left,
gentle ambient occlusion, no specular highlights. Fully transparent background. Centred
with generous even padding. Square 1:1.
Do not include: gloss, shine, reflection, chrome, metal, gold, neon, rim light, glow,
crests, emblems, text, letters, numbers, logos, gradient background, floor shadow.
```

---

# 9B. Feature onboarding illustrations

North star 14.1. One per feature first run, **3:2 landscape**, a small scene rather
than a single icon, shallow depth of field.

```
A small 3D scene in 3:2 landscape: a shield with a soft rounded face standing upright,
with a small stack of three blank banknotes resting in front of it and slightly
overlapping its base. Rendered in matte clay with a soft velvety finish, deep royal
blue #2B3FE0, subtle rounded bevels. Soft diffused key light from the upper left,
gentle ambient occlusion where the objects meet, no specular highlights. Shallow depth
of field with the shield sharpest. Fully transparent background. Composed slightly left
of centre with generous padding. Calm and reassuring.
Do not include: gloss, shine, reflection, chrome, metal, neon, rim light, glow, text,
letters, numbers, currency symbols, logos, people, gradient background, floor shadow.
```
*(Escrow and protected payment first run.)*

```
A small 3D scene in 3:2 landscape: a closed wallet lying flat with a small padlock
resting upright beside it, slightly behind and to the right. Rendered in matte clay
with a soft velvety finish, deep royal blue #2B3FE0, subtle rounded bevels. Soft
diffused key light from the upper left, gentle ambient occlusion, no specular
highlights. Shallow depth of field with the wallet sharpest. Fully transparent
background. Composed slightly left of centre with generous padding.
Do not include: gloss, shine, reflection, chrome, metal, neon, rim light, glow, coins,
cards sticking out, text, letters, numbers, logos, gradient background, floor shadow.
```
*(Wallet first run.)*

```
A small 3D scene in 3:2 landscape: a paper plane in gentle flight at an upward angle
with a ticket bearing one perforated edge resting below and behind it. Rendered in
matte clay with a soft velvety finish, deep royal blue #2B3FE0, with the ticket's
perforated edge picked out in warm orange #FF6A3D and everything else deep royal blue.
Subtle rounded bevels. Soft diffused key light from the upper left, gentle ambient
occlusion, no specular highlights. Shallow depth of field with the plane sharpest.
Fully transparent background. Composed centrally with generous padding.
Do not include: gloss, shine, reflection, chrome, metal, neon, rim light, glow, motion
trails, dotted flight lines, confetti, text, letters, numbers, logos, gradient
background, floor shadow.
```
*(Referral hub first run.)*

```
A small 3D scene in 3:2 landscape: an upward bar chart of three bars of increasing
height on a thin base, with a magnifying glass resting at an angle against the tallest
bar. Rendered in matte clay with a soft velvety finish, deep royal blue #2B3FE0,
subtle rounded bevels, the magnifier's lens a flat recessed panel of the same clay.
Soft diffused key light from the upper left, gentle ambient occlusion, no specular
highlights. Shallow depth of field with the chart sharpest. Fully transparent
background. Composed slightly right of centre with generous padding.
Do not include: gloss, shine, reflection, chrome, glass, transparency, metal, neon, rim
light, glow, axis labels, gridlines, text, letters, numbers, logos, gradient background,
floor shadow.
```
*(Space Analytics first run.)*

```
A small 3D scene in 3:2 landscape: a closed passport booklet standing upright at a
slight angle with a shield bearing one embossed tick resting flat in front of it.
Rendered in matte clay with a soft velvety finish, deep royal blue #2B3FE0, subtle
rounded bevels. Soft diffused key light from the upper left, gentle ambient occlusion,
no specular highlights. Shallow depth of field with the passport sharpest. Fully
transparent background. Composed slightly left of centre with generous padding.
Do not include: gloss, shine, reflection, chrome, metal, gold, neon, rim light, glow,
crests, emblems, text, letters, numbers, logos, gradient background, floor shadow.
```
*(Space Passport and verification first run.)*

```
A small 3D scene in 3:2 landscape: a clipboard with three blank checklist rows standing
at a slight angle, with a small house resting beside it and slightly forward. Rendered
in matte clay with a soft velvety finish, deep royal blue #2B3FE0, subtle rounded
bevels. Soft diffused key light from the upper left, gentle ambient occlusion, no
specular highlights. Shallow depth of field with the clipboard sharpest. Fully
transparent background. Composed centrally with generous padding.
Do not include: gloss, shine, reflection, chrome, metal, neon, rim light, glow, ticks in
the boxes, writing, text, letters, numbers, logos, gradient background, floor shadow.
```
*(Host and agent workspace first run.)*

---

# 9C. Light mode: the acceptance rule

North star 14.7. **The founder reports the current 3D icons read poorly on light, and
the cause is material rather than rendering: glass needs a dark ground to resolve and
goes muddy on white.**

Everything in this file is already specified as **matte clay**, which is the fix: a
matte deep-royal-blue object has real contrast on white where a glass one has almost
none.

**The acceptance rule for every asset generated from this file:**

1. View it on the night canvas `#010118` **and** on the paper canvas `#F4F4F1`, at
   390px wide, before accepting it.
2. On paper it sits on a plate: radius 14, a very light blue-grey fill at about 4%
   brand, with a soft blue contact shadow beneath the object so it never floats on pure
   white.
3. **Reject any asset whose edges disappear on white.** That is the exact failure the
   current set has, and it happened because assets were approved only on navy.
4. Reject any asset with a visible specular highlight: that is gloss, and gloss is
   banned.

---

# 10. What NOT to generate

Reject any output showing these. Each appears somewhere in the 79 reference images
and every one of those is classified AVOID.

- **Coins, coin stacks, gold, tokens, gems, diamonds.** The strongest scam signal
  in the Nigerian market after a decade of coin schemes.
- Anything glossy, chrome, bevelled, mirrored, iridescent, neon-rimmed or glass.
- Mascots, characters, animals with faces, piggy banks.
- Flames, streaks, lightning bolts, confetti, sparkles, party elements.
- Rainbow or multi-hue palettes. Deep royal blue, with one optional warm accent.
- Rocket ships and upward-arrow hype imagery.
- Text, letters, numbers, currency symbols, or any logo.
- People, faces or hands.
- Floor shadows, gradient backgrounds, or any background at all.

---

# 11. Photography, which is not generated

The landing page, the store screenshots and listing placeholders need **real
photographs**. Not clay, and not AI renders.

Brief for a photographer or a licensed library: real Nigerian interiors and
exteriors, natural daylight, no faces, no stock-photo gloss, 35mm equivalent,
slight grain, the honest texture of an actual place. Lagos and Abuja. Apartments,
shortlets, family homes, a hotel room, a restaurant interior, a plot of land, an
estate gate.

**The rule:** a photograph must never imply it is Vallo inventory unless it is.
This repository once shipped 23 invented places, 22 of them marked verified, on
addresses that do not exist. That is why `demo`, `sample` and `preview` are banned
words with a test enforcing the ban. Until real listings exist, landing photography
is illustrative and says so.

The honest answer is real listings, which is why supply is priority one across the
entire plan.

---

# 12. Order of generation

1. **The vector logo mark.** Not generated: traced from
   `assets/brand-sheets/vallo-wordmark-source.png` and the mark sheets. **It
   blocks the startup animation**, so it comes before everything here.
2. **Empty states**, section 5. Every surface is empty today, so these ship first.
3. **Property types**, section 1. Discovery, category rows, cards.
4. **Nigerian specifics**, section 2. The differentiator nobody else has.
5. **Success and reward**, section 6. The reveal moments.
6. **Money and trust**, section 3.
7. **Email**, section 9.
8. **Onboarding**, section 8.
9. **Tier plaques**, section 7.
10. **Actions**, section 4.

---

# 13. THE GLASS REPLACEMENT PROGRAMME

**Measured on 6 October 2026, not estimated.**

| | Count |
|---|---|
| Glass assets in `public/brand/glass/` | **144** |
| Clay assets in `public/brand/3d/` | **53** |
| **Glass objects with no clay equivalent at all** | **68** |
| Code files using `BrandIcon` | **64** |

This is the gap behind the founder's report that the icons still read badly on light.
Glass needs a dark ground to resolve, and 144 glass objects are still in the product
while only 53 clay objects exist to replace them.

**The 68 below have no clay equivalent and are generated from scratch.** The other 76
have a plausible clay match that must still be **checked by eye on paper at 390px**
before it is accepted as a replacement, because a name match is not a visual match.

**Every prompt in this section follows the house rules in section 0 and the light-mode
acceptance rule in 9C: matte clay, deep royal blue `#2B3FE0`, soft key light upper
left, no gloss, transparent background, and checked on `#F4F4F1` as well as `#010118`
before it is accepted.**

## 13.1 The shared clause

Append this to every prompt in 13.2 onward. It is written once here so the subject
lines stay readable.

```
Rendered in matte clay with a soft velvety finish, deep royal blue #2B3FE0, subtle
rounded bevels. Soft diffused key light from the upper left, gentle ambient occlusion,
no specular highlights. Fully transparent background. Centred with generous even
padding. Square 1:1. Clean studio product render, premium and understated.
Do not include: gloss, shine, reflection, chrome, glass, metal, neon, rim light, glow,
gradient background, floor shadow, text, letters, numbers, logos, people.
```

## 13.2 Space types, 22 missing

These carry discovery, the category rows and the flip pages. Nigerian and
international forms both appear because the spec names fifteen categories.

```
A single 3D object: a single-storey bungalow with a low pitched roof, a central front door and one window each side.
A single 3D object: a two-storey duplex, symmetrical, with two separate front doors side by side under one roof.
A single 3D object: a terraced house, one unit of a row, with a shared wall edge visible on each side and a single front door.
A single 3D object: a townhouse, three narrow storeys, with a stepped entrance and tall windows stacked vertically.
A single 3D object: a twin house, two mirrored halves joined at the centre under one roofline, with a door on each half.
A single 3D object: a modern house with a flat roof, a wide glazed front and a cantilevered upper floor.
A single 3D object: a grand mansion with a central portico, two symmetrical wings and a stepped entrance.
A single 3D object: a penthouse, the top two floors of a tower cropped at the base, with a wraparound terrace and a railing.
A single 3D object: a loft apartment, a converted industrial block with tall arched windows and an exposed roof beam.
A single 3D object: a mini flat, a small single-room dwelling with one door and one window, compact and modest.
A single 3D object: a serviced apartment block, six storeys, with uniform balconies and a canopied ground entrance.
A single 3D object: a guest house, two storeys, with a small reception canopy and a row of identical upper windows.
A single 3D object: a beach house raised on short stilts with a veranda and a shallow pitched roof.
A single 3D object: a lake house with a pitched roof and a short wooden jetty extending from its base.
A single 3D object: a mountain cabin with a steep pitched roof, a stone chimney and a small porch.
A single 3D object: a tree house resting in the fork of a thick trunk, with a short ladder and a railed platform.
A single 3D object: a houseboat, a flat-bottomed hull with a small cabin and a railed deck.
A single 3D object: a farm house with a pitched roof, a small barn beside it and a fenced edge.
A single 3D object: a coworking space, a wide low building with a glazed front and an open-plan interior implied by regular mullions.
A single 3D object: an office suite, a single floor of a building cropped top and bottom, with an even run of windows and a door.
A single 3D object: a retail shop front with a wide display window, a central door and a short awning.
A single 3D object: a warehouse with a shallow curved roof, a large roller shutter and a small personnel door beside it.
```

## 13.3 Wallet and money, 12 missing

```
A single 3D object: a closed bifold wallet standing upright on its folded edge, soft and slightly rounded.
A single 3D object: a closed wallet lying flat with a small blank card protruding slightly from its top edge.
A single 3D object: a closed wallet with a small upward arrow rising from its top edge, indicating money leaving.
A single 3D object: a closed wallet with a small plus sign resting on its face, indicating money added.
A single 3D object: a closed wallet set inside a thin open ring that surrounds it without touching.
A single 3D object: a closed wallet resting on a flat rounded square tile slightly larger than itself.
A single 3D object: an open upturned palm with a small stack of three completely blank banknotes resting on it.
A single 3D object: a rounded savings pot with a narrow slot in its lid and a soft bulging body.
A single 3D object: a folded paper bill resting on a flat rounded square tile slightly larger than itself.
A single 3D object: a thick ledger book lying closed with a ribbon marker emerging from its pages.
A single 3D object: two curved arrows forming a circle, one pointing left and one pointing right, indicating transfer.
A single 3D object: a coin standing on edge, completely blank on both faces, mid-rotation at a slight tilt.
```

## 13.4 Charts, progress and reputation, 4 missing

```
A single 3D object: a rising line chart of four connected points on a thin base, the last point highest and slightly raised.
A single 3D object: a circular ring chart about three quarters complete, with a clean gap where the remainder would be.
A single 3D object: a thin circular progress ring about two thirds complete with softly rounded stroke ends.
A single 3D object: five small five-pointed stars in a gentle arc, evenly spaced and all identical.
```

## 13.5 Communication, 5 missing

```
A single 3D object: two overlapping rounded speech bubbles of slightly different sizes, both solid, each with a small tail.
A single 3D object: a single rounded speech bubble set inside a thin open ring that surrounds it without touching.
A single 3D object: a pair of over-ear headphones with a padded band and a slim boom microphone.
A single 3D object: a paper plane in gentle upward flight resting on a flat rounded square tile slightly larger than itself.
A single 3D object: a small friendly robot head, a rounded cube with two simple recessed circular eyes and a short antenna.
```

## 13.6 Trust, documents and people, 6 missing

```
A single 3D object: a single sheet of paper with a bold cross mark embossed on its face.
A single 3D object: a single sheet of paper with a magnifying glass resting diagonally across it, the lens a flat recessed panel of the same clay.
A single 3D object: a circular wax-style seal with a bold cross embossed in its centre and two short ribbon tails.
A single 3D object: a magnifying glass set inside a thin open ring that surrounds it without touching.
A single 3D object: three simple rounded human figures standing together, set inside a thin open ring.
A single 3D object: a sliding control with three horizontal tracks and a round handle on each, set inside a thin open ring.
```

## 13.7 Place, travel and view, 6 missing

```
A single 3D object: a globe with simple raised continental shapes and two faint latitude bands, no text.
A single 3D object: a globe with a small square microchip resting against its lower right edge.
A single 3D object: a globe with a single rounded map pin planted upright on its upper surface.
A single 3D object: a single palm tree with a slightly curved trunk and five fronds, on a small rounded mound of sand.
A single 3D object: a wheeled suitcase standing upright with a small paper plane flying above and behind it.
A single 3D object: a circular arrow loop forming a complete ring around a small empty centre, indicating a 360 degree view.
```

## 13.8 Intelligence, 2 missing

```
A single 3D object: a simplified brain form with one small square microchip embedded in its surface.
A single 3D object: a simplified brain form set inside a thin open ring that surrounds it without touching.
```

## 13.9 States and system, 6 missing

```
A single 3D object: a rounded equilateral triangle standing on its base with a bold exclamation mark embossed in its centre.
A single 3D object: a circle with a bold lowercase letter i embossed in its centre, the letter formed as raised geometry rather than printed type.
A single 3D object: an hourglass with a narrow waist and a small quantity of sand settled in the lower bulb.
A single 3D object: a lightning bolt resting against a small rounded calendar block, indicating an instant booking.
A single 3D object: a double bed seen from a raised three-quarter angle, set inside a thin open ring that surrounds it without touching.
A single 3D object: a ribbon bookmark hanging from the top edge of a closed book, its tail cut in a notch.
```

## 13.10 Keys, workspace and craft, 5 missing

```
A single 3D object: a single key bent into a closed loop so its tip meets its bow, forming a continuous cycle.
A single 3D object: a plain circular split ring holding one simple key.
A single 3D object: a tall office building cropped at the base with one small square microchip resting against its lower edge.
A single 3D object: a painter's palette with five shallow rounded wells and a thumb hole, all wells empty.
A single 3D object: two arrows curving around each other to form a circle, resting on a flat rounded square tile slightly larger than itself, indicating a switch between roles.
```

---

# 14. THE FLIP PAGES

The founder's screenshots show the side switch between the Property side and the Stays
side, with a full-screen flip page carrying a hero object, the lockup, a title, a line
of body and three category tiles. **Today every one of those is glass**, and they are
the most visible glass left in the product because the flip page is full screen.

**Two hero objects, 3:2 landscape, shallow depth of field, same material rules.**

### 14.1 Stays hero

```
A small 3D scene in 3:2 landscape: a boutique hotel building with an entrance canopy,
with a domed concierge bell resting in front of it and slightly to the right, and a
single palm tree behind it to the left. Rendered in matte clay with a soft velvety
finish, deep royal blue #2B3FE0, subtle rounded bevels. Soft diffused key light from
the upper left, gentle ambient occlusion where the objects meet, no specular
highlights. Shallow depth of field with the bell sharpest. Fully transparent
background. Composed centrally with generous padding. Warm and welcoming.
Do not include: gloss, shine, reflection, chrome, glass, metal, neon, rim light, glow,
sky, ground plane, text, letters, numbers, logos, people.
```

### 14.2 Property hero

```
A small 3D scene in 3:2 landscape: a detached family house with a pitched roof beside a
modern apartment block two storeys taller, with a set of three keys resting in front of
them and slightly to the left. Rendered in matte clay with a soft velvety finish, deep
royal blue #2B3FE0, subtle rounded bevels. Soft diffused key light from the upper left,
gentle ambient occlusion where the buildings meet, no specular highlights. Shallow
depth of field with the keys sharpest. Fully transparent background. Composed centrally
with generous padding. Solid and reassuring.
Do not include: gloss, shine, reflection, chrome, glass, metal, neon, rim light, glow,
sky, ground plane, text, letters, numbers, logos, people.
```

### 14.3 The six category tiles

Square, smaller, and read at about 56px, so they must stay legible when reduced.
Generate from section 13 and 1: **Stays** uses hotel, palm tree and serviced apartment
block. **Property** uses detached house, land plot and retail shop front.

### 14.4 The side-nav flip card

The card reading "Switch to Stays" carries a small round object at about 44px. Use the
Stays hero's concierge bell alone, cropped square, because a scene does not survive
that reduction. The Property side uses the keys alone.

---

# 15. The migration, and what Session 3 must do with it

1. **Generate the 68 in section 13 and the two heroes in section 14.**
2. **Check every one on paper at 390px as well as night** (9C). Reject any whose edges
   disappear on white. That failure is why this programme exists.
3. **Eyeball the 76 name matches.** A name match is not a visual match: `bell-tile` and
   `bell` are not interchangeable if one carries a tile and the other does not.
4. **Sweep the 64 files using `BrandIcon`**, replacing each glass reference with its
   clay equivalent, and **delete `public/brand/glass/` only once nothing imports it**.
5. **Any glass that survives** is in the logo lockup and the role-switch coin, and keeps
   its dark ground in light mode, which is already the rule and is correct.
6. **A lint that fails on a new `brand/glass/` reference**, so the migration cannot
   quietly reverse.
