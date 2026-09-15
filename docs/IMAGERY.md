# Imagery: the shortlist, the licences, and how to drop it in

Written 15 September 2026, for HANDOFF 02 section 15.4.

**This is a shopping list, not a delivery.** Read the next section before
anything else, because the constraint it describes is the reason this file
exists instead of eight new files in `public/brand/scenes/`.

---

## 1. Why this is a list and not the images

**The network policy in this environment answers 403 to every image host.** It
is recorded in the header of `apps/web/src/components/app/MediaFrame.tsx` and it
was still true when this file was written. No session running here can download
a photograph, from Unsplash or anywhere else, however much it would like to.

So the deliverable is the part a session can actually do well: choose, verify
the licence, say exactly what each image is for, and wire the code so that
dropping the files in is the only remaining step.

### What is already wired

`scripts/build-scene-manifest.mjs` runs before every build of `apps/web`. It
reads `apps/web/public/brand/scenes/` and writes the manifest that `MediaFrame`
imports. **There is no code to edit.**

1. Download an image from the table in section 4.
2. Save it as `apps/web/public/brand/scenes/<scene>.jpg`, where `<scene>` is one
   of: `house`, `villa`, `terrace`, `shortlet`, `flats`, `tower`, `hotel`,
   `shop`. AVIF or WebP is preferred and wins automatically over a JPG of the
   same name.
3. Build.

A scene with no file keeps the stand-in it has today, so these can land one at a
time and a missing file never breaks a page.

---

## 2. The licence position, and why Pinterest is not on this list

**Pinterest is a mood board, not a source.** Almost everything on it is somebody
else's copyrighted photograph reposted without a licence, usually stripped of
its attribution. This is a public commercial landing page for a registered
Nigerian company, so an image whose licence cannot be established is a liability
with no upside. Use Pinterest to decide what good looks like and then find the
licensed equivalent on one of the three below.

| Source | Licence | What it permits | The catch |
| --- | --- | --- | --- |
| **Unsplash** | Unsplash Licence | Free for commercial use, no attribution required | May not be sold as a standalone image, and may not be used to build a competing photography service. Neither applies here |
| **Pexels** | Pexels Licence | Free for commercial use, no attribution required | Identifiable people and private property may need a release for some uses. Architecture is fine; avoid faces |
| **Pixabay** | Pixabay Content Licence | Free for commercial use, no attribution required | Same person and trademark caution. Quality is more variable than the other two, so it is third choice |

**None of the three requires attribution.** Credit the photographer anyway where
there is a natural place for it: it costs nothing and it is the decent thing.

### Three rules that are not about licensing

1. **Avoid recognisable faces.** A person in a photograph on a property listing
   reads as a resident or an agent, which is a claim about a real person who did
   not agree to it. Architecture and interiors only.
2. **Avoid recognisable branded buildings.** A specific landmark tower is
   identifiable, and an identifiable building on a listing card implies a
   relationship with its owner.
3. **Check the image is not itself a stock-photo cliché.** A grey American
   suburban house with a two-car garage is not what a Nigerian renter is looking
   for and it makes the product look imported.

---

## 3. What good looks like here

The brief, and it is more specific than "nice houses":

- **Nigerian and West African architecture wherever it can be found.** Duplexes
  with pierced screen walls, terrace rows, low-rise blocks with balconies,
  compound gates. Lagos, Abuja and Accra all appear on these sources.
- **Modern and aspirational, never generic American suburbia.** The audience is
  somebody deciding where to live in Lagos or Abuja, not a US listings site.
- **Warm natural light against the dark UI.** The interface is deep navy-black,
  so an image with warm evening or golden-hour light sits on it beautifully and
  a cold grey overcast one dies on it. This is the single most useful selection
  rule in this document.
- **Eight scene types, eight different images.** The whole point is that a grid
  of twenty cards stops being two pictures.
- **Landscape, and at least 2000px wide.** Every surface crops it differently.

### On the ones that are hardest to find

`shop` and `tower` are the two where search results go generic fastest. For
`shop`, search for a shopfront or a small commercial unit rather than a retail
interior. For `tower`, a mid-rise residential block at dusk beats a glass
corporate tower, which reads as an office and is usually a trademarked building.

---

## 4. The shortlist

**Read this before using the table.** The URLs below are search and topic pages,
not direct file links, and that is deliberate rather than a shortcut. This
session could not open a single one of them to confirm that a specific photo ID
still exists, is still licensed the same way, or looks the way a description
claims. **Handing over eight confident direct URLs that were never loaded is
exactly the failure mode this project has been burned by before**, and a dead or
wrong link in a list like this costs more than an honest search term.

So each row gives the source, a search that lands on the right kind of image in
one click, and what to pick out of the results. Choosing takes about a minute
per scene.

| Scene | Used for | Source and search | Pick the one that |
| --- | --- | --- | --- |
| `house` | Detached homes, the most common rental card | Unsplash, `https://unsplash.com/s/photos/modern-house-exterior-evening` | Is a detached two-storey house shot from the front corner at golden hour, with lit windows. Warm light is the requirement |
| `villa` | Larger detached property, upper end of the catalogue | Unsplash, `https://unsplash.com/s/photos/luxury-villa-exterior-dusk` | Shows a low, wide villa with a pool or a courtyard, at dusk. Avoid anything Mediterranean-white, which reads as a holiday let |
| `terrace` | Terrace rows, very common in Lagos and Abuja | Pexels, `https://www.pexels.com/search/terraced%20houses/` | Shows three or more units shoulder to shoulder, ideally with the repetition visible. This is the scene where West African results are best |
| `shortlet` | Nightly and short-stay listings | Unsplash, `https://unsplash.com/s/photos/modern-apartment-interior-warm` | Is an interior: a furnished living room with natural light. Shortlets are chosen on the inside, not the facade, and this is the one scene where an interior is right |
| `flats` | Blocks of flats, the standard urban rental | Pexels, `https://www.pexels.com/search/apartment%20building%20balconies/` | Shows a mid-rise block with balconies, four to eight storeys, shot from across the street |
| `tower` | Tall residential blocks | Unsplash, `https://unsplash.com/s/photos/residential-tower-dusk` | Is residential rather than corporate, at dusk with interior lights on. Avoid any single identifiable landmark |
| `hotel` | Hotels and serviced apartments | Unsplash, `https://unsplash.com/s/photos/boutique-hotel-exterior-night` | Reads as hospitality: a lit entrance, a canopy, a small forecourt. Boutique beats chain |
| `shop` | Shops, offices and commercial units | Pexels, `https://www.pexels.com/search/shopfront/` | Is a small commercial unit from the street, with glazing and a clear frontage. Not a mall interior |

### Searches worth running first, because they are better than any of the above

These return genuinely West African architecture and should be tried before the
generic searches in the table. Where one produces something good, use it.

- `https://unsplash.com/s/photos/lagos-architecture`
- `https://unsplash.com/s/photos/nigeria-building`
- `https://www.pexels.com/search/lagos%20nigeria/`
- `https://www.pexels.com/search/african%20architecture/`
- `https://unsplash.com/s/photos/accra-ghana-architecture`

The results are thinner than the generic searches, and some of what comes back
is documentary rather than aspirational, which is the wrong register for a
listing card. But one genuinely local image in the set is worth more than eight
imported ones, because it is the thing a Nigerian user notices immediately.

---

## 5. The landing page hero, which is its own decision

**This is the highest-value single image in the product and it should not be
chosen from a table.**

It is the first thing a visitor sees. Today `CityHero.tsx` reuses
`vallo-city.png` as a CSS background, which means the most important image on
the platform is the same picture as a listing card for an office floor.

Three reasons to treat it separately:

1. **It is the only image with no listing behind it.** Every other image in this
   document stands in for a property and carries the example mark. The hero
   stands for the platform, so it can be the best photograph available with no
   caveat attached to it.
2. **It sets the register for everything else.** If the hero is a warm Lagos
   evening, the whole product reads as Nigerian. If it is a grey glass tower,
   the product reads as imported.
3. **It is the one image worth paying for.** Everything else in this file is
   free and that is correct for stand-ins. A hero is the one place where a
   licensed image from a paid library, or an hour of a Lagos photographer's
   time, would return more than it costs. A commissioned photograph of a real
   Nigerian street at dusk would be genuinely ownable, and nobody else in this
   market has one.

### What to look for if it stays free

An elevated view of a Nigerian city at dusk, warm lights coming on, with
residential buildings rather than a business district. It has to survive a heavy
dark scrim and hold legible white text across the middle third, which rules out
anything busy or high-contrast in the centre.

Start at `https://unsplash.com/s/photos/lagos-skyline-dusk` and
`https://unsplash.com/s/photos/african-city-evening`.

### The performance constraint, which is not optional here

The current hero file is **1,343KB**, painted on all 97 pages, outside
`next/image`. On the stated target, a mid-range Android on a Nigerian mobile
network, that is most of a minute before the background settles, and this
document's own advice about warm light is worth nothing if the visitor has left.

Whatever is chosen: re-encode to AVIF, produce a separate narrower crop for
390px, and route it through `next/image` rather than a CSS `background-image`.
That is tracked as a recommendation in its own right, and it matters more than
which photograph wins.

---

## 6. What was not done, stated plainly

- **No image was downloaded, opened, or looked at.** Every URL above is a search
  page chosen from knowledge of these sources, not a file this session
  retrieved. The network blocks all of them.
- **No specific photo ID is given anywhere**, deliberately, for the reason in
  section 4: an unverified direct link that has rotted is worse than a search
  term that works.
- **The licences in section 2 are stated from knowledge of these three sources
  and were not re-read from their licence pages**, which are also unreachable.
  They are stable and widely relied upon, but confirm the Unsplash Licence text
  once before launch, since it is the only one with a restriction that could
  conceivably matter.
- **Nothing here has been seen against the actual UI.** The advice about warm
  light on a dark ground follows from the palette rather than from a screenshot
  of a candidate image in a card.
- The stand-ins are unchanged and the product looks exactly as it did.
