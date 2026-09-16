# Brand source artwork

Everything here is SOURCE: the files the founder supplied, before anything was
done to them. Nothing in this directory is served to a browser. What the product
serves lives in `apps/web/public/brand/`.

## `brand-sheets/`

Ten PNG sheets of commissioned glass objects, at the resolution they were
rendered. Twelve were supplied; two were byte-for-byte duplicates of two others
(`3C03D844` of `B04429B0`, and `6D730F28` of `ECFA9C34`, both confirmed by
checksum) and were removed rather than sliced twice.

They keep their original opaque filenames on purpose. A sheet is not something
anybody reads by name, the names are what the founder's own files are called, and
renaming them would break the one link back to the originals. What each sheet
contains is written down in `scripts/icon-manifest.mjs`, object by object.

| Sheet      | Objects | What it is |
| ---------- | ------: | ---------- |
| `0B2E4D21` | 25 | Actions and concepts, drawn in detail |
| `9795AD6E` | 25 | Places, drawn as scenes |
| `ECFA9C34` | 25 | The same places, drawn as single objects |
| `B04429B0` | 25 | Actions, drawn as single objects |
| `FDA04DD1` | 25 | Trust and money, drawn in detail |
| `2676C1FC` | 25 | Stays and trust, drawn as single objects |
| `CF5A4150` | 24 | Transactions and outcomes, on dark glass tiles |
| `C0F67033` | 24 | The same 24, as frosted white glass on white |
| `7EE388E5` |  6 | Hero scenes: the assistant, trips, schedule |
| `8DBE517E` |  6 | Hero scenes: property, reach, growth, trust, app, support |

## Turning a sheet into files the product can use

Three commands, from the repository root, in this order:

```
node scripts/slice-icon-sheets.mjs   # sheets      -> assets/brand-sliced
node scripts/cut-icon-ground.mjs     # sliced      -> assets/brand-cut  (alpha)
node scripts/name-icon-objects.mjs   # cut + names -> apps/web/public/brand/glass
```

The two intermediate directories are derived and git-ignored. The last command's
output is committed, because it is what gets served.

Each script carries its own reasoning at the top, including the approaches that
were tried and abandoned, which is the part worth reading before changing any of
the constants in them.

## Changing which drawing of an object wins

Most names are drawn on more than one sheet: `shield-check` exists four times.
`CANONICAL` in `scripts/icon-manifest.mjs` picks the one that becomes the file.
Edit that map and rerun the third command; never edit the pixels.
