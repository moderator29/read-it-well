# STRUCK, 23 SEPTEMBER 2026

**The founder removed light mode from the platform.** Everything in this
directory measured daylight: the plate an untwinned brand object stood on, the
ink ladder against four light surfaces, which surfaces drew an object with no
light twin, and `/preview/g2` shot in both themes. None of those questions
exists any more.

The files are kept and NOT deleted. Two of them say true things that do not
depend on a theme, and both were expensive to establish:

- `model-vs-chromium.mjs` shows that compositing these PNGs offline is a model
  of what Chromium paints, mean 1.41 of 255. That is a fact about the artwork's
  alpha key and it is the licence for any future offline measurement of it.
- `measure-object-ground.mjs` composites the objects over an arbitrary ground.
  Point it at any ground and it still answers.

`ink-ladder.mjs` and `sweep-untwinned.mjs` are void: one measures light
surfaces that no longer exist, the other counts light twins that are no longer
drawn. `shot-plate.mjs` still shoots `/preview/g2`, but the plate it was named
for is gone and both of its shots are now the same picture.

`docs/design/LIGHT_MODE_REMOVED.md` is the record.

---

# Paper proofs: daylight, measured

Five files about one theme: **what daylight actually measures, rather than what
the stylesheets say it should.**

| file | what it answers |
|---|---|
| `measure-object-ground.mjs` | every untwinned brand object composited over every candidate plate, offline, with the contrast distribution of each |
| `model-vs-chromium.mjs` | whether that offline composite is a model of the paint, or only arithmetic |
| `sweep-untwinned.mjs` | which SURFACES draw an object with no light twin, read off the rendered DOM |
| `shot-plate.mjs` | the picture, `/preview/g2` in both themes |
| `ink-ladder.mjs` | every token the stylesheets use as `color:`, resolved in a browser, against all four light surfaces |

`ink-ladder.mjs` is the ten-second question to ask before the half-hour one.
If the daylight ink ladder were too pale, the light-theme text failures would be
a handful of tokens rather than a list of elements. **It is not**: on 23
September every ink meant to be read on paper cleared 4.5:1 on all four light
surfaces, the palest of them at 4.56:1. So the failures the whole-harness sweep
reports are about the SURFACE an element ended up on, not the colour of the
words. Read the note at the top of that file before calling any row a defect.

## The order they have to be run in

`model-vs-chromium.mjs` first, or the rest is unverified arithmetic. It draws
one object on one plate in Chromium, composites the same object over the same
modelled ground in Node, and prints the disagreement. **Measured 23 September:
mean 1.41 of 255, largest 39**, the largest on the artwork's own resampled
edges. Then `measure-object-ground.mjs`, which is the decision, and
`sweep-untwinned.mjs`, which turns object names into surfaces a person visits.

The two browser files need a PRODUCTION server with `VALLO_PREVIEW_HARNESS=1`:

```
cd apps/web && npm run build
VALLO_PREVIEW_HARNESS=1 ../../node_modules/.bin/next start -p 3184
```

`next dev` does not hydrate reliably on this box, so no proof from it counts,
and Chromium has to be launched with `--enable-unsafe-swiftshader
--use-angle=swiftshader` or it drops `backdrop-filter` in silence and the shot
is of a different design.

## Why the artwork can be modelled at all

`scripts/cut-icon-ground.mjs` keyed these objects out of renders of glowing
objects on black, which is additive light: alpha is the brightest channel and
the colour is unpremultiplied by it. The stored pixel is therefore exactly the
`(colour, alpha)` pair a browser composites, and `out = a*C + (1-a)*G` is the
same arithmetic Chromium runs. That is the whole reason a number computed in
Node is allowed to decide a design question here, and it is why
`model-vs-chromium.mjs` exists rather than being assumed.

## The two regimes, and reporting only one of them is how this gets argued about

`measure-object-ground.mjs` prints both.

**ALL** is every pixel the key kept. It includes the bloom, and the bloom is a
ramp that fades into whatever it is on by design, so a large share of it sits
near the ground however good the ground is. It is the right regime for asking
**has this got better**, because it is the regime the September survey's
"1.60:1 median, 45 under 1.5:1" was taken in.

**BODY** is the pixels at half alpha and up: the object's own material, which
is the part a person is trying to read. It is the right regime for asking **is
this legible**.

A ground that improves one and not the other has not improved anything.

## What the measurement decided

The plate was one flat navy doing two jobs that pull opposite ways: the ground
the object is composited against, where darker is strictly better, and the edge
the page sees, where darker reads as a hole punched in white paper. It had been
retuned twice in opposite directions, and both retunes were right about the
thing they were looking at.

It is now lit from its edge. See `--nf-icon-plate` in
`packages/design-tokens/src/tokens.css` for the table and the argument, and
`docs/FOUNDER_ARTWORK_NEEDED.md` for the objects a render order still has to
cover.

## The shots

`shots/g2-light-before.png` and `shots/g2-light-after.png` are `/preview/g2` in
daylight either side of the plate change, both taken on a production build of
the tree at the time.

`shots/g2-dark-unchanged.png` is the night theme, and it is ONE file rather than
a pair on purpose: the before and after shots of the night theme came back
byte for byte identical, `md5 cec6a8e0`, which is the strongest available
statement that nothing about the default theme moved. `--nf-icon-plate` is
`none` at night, exactly as `--nf-icon-ground` was `transparent`.

A caution for whoever takes the next one. `/preview/g2` draws 164 lazy images
and `networkidle` fires before they have all decoded when the box is busy. An
undecoded image leaves an EMPTY plate in the shot, which looks exactly like a
plate that hides its object; the first after-shot taken here looked like a
regression and was a loading artefact. `shot-plate.mjs` waits four seconds for
that reason.
