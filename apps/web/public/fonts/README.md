# The fonts, and where they came from

Eight woff2 files, in `v2/`. Inter in three subsets and the naira sign,
Poppins in two weights and two subsets. They began as the exact files Google
Fonts serves, taken out of a `next build` that used `next/font/google` and
checked in here so nothing at build time depends on reaching
`fonts.gstatic.com`.

## v2: the same pixels, fewer bytes (C6, R3-18 round 2)

Every file was re-cut by `scripts/fonts-recut.py` (fontTools): exactly the
codepoints Google's file carried, every layout feature a screen reaches
(kerning, `mark` and `mkmk` for the stacked Yoruba and Igbo marks, `ccmp`,
`locl`, `calt`, `tnum`, `pnum`), and nothing no screen draws: the fraction
features (`frac`, `numr`, `dnom`), the glyph names, and Inter's weight axis
below 400. No rule in the app asks for a weight under 400; `bolder` can reach
900, so the axis keeps 400 to 900. Rendered side by side at 400, 500, 600,
650, 700, 800 and 900, at 12, 16 and 28px, in Latin, Yoruba, Igbo and Hausa
with the naira and tabular figures, the old and new files differ in 0 pixels.
The folder is the new name the cache rule below asks for.

To cut them again (from Google's originals, or after a face is updated):

    python3 -m pip install fonttools brotli
    python3 apps/web/scripts/fonts-recut.py <folder of source woff2> apps/web/public/fonts/v3

Write to a new folder (`v3`), never over `v2`: the files are served
`immutable`, so a changed file needs a new path. Then check the new files draw
the same pixels as the old at 400 to 900 in all four languages before
pointing `src/app/css/fonts.css` and the preloads in `src/app/layout.tsx` at
them.

Both faces are under the SIL Open Font License 1.1, which permits hosting them
ourselves. Inter is by Rasmus Andersson, Poppins by Indian Type Foundry and
Jonny Pinhorn.

| File | Face | Subset | Bytes (was) |
|---|---|---|---|
| `v2/inter-latin.woff2` | Inter, variable 400 to 900 | latin | 33,788 (48,432) |
| `v2/inter-latin-ext.woff2` | Inter, variable 400 to 900 | latin-ext | 59,440 (85,272) |
| `v2/inter-vietnamese.woff2` | Inter, variable 400 to 900 | vietnamese | 7,468 (10,280) |
| `v2/inter-naira.woff2` | Inter, variable 400 to 900 | U+20A6 only (V-78) | 1,076 (1,216) |
| `v2/poppins-600-latin.woff2` | Poppins 600 | latin | 7,668 (7,992) |
| `v2/poppins-600-latin-ext.woff2` | Poppins 600 | latin-ext | 4,900 (5,552) |
| `v2/poppins-700-latin.woff2` | Poppins 700 | latin | 7,448 (7,848) |
| `v2/poppins-700-latin-ext.woff2` | Poppins 700 | latin-ext | 4,808 (5,448) |

Why these seven and not the nineteen that were being built, which subset holds
the Yoruba and Igbo vowels, and why Poppins 500 and 800 are gone: all of it is
written down in `src/app/css/fonts.css`, next to the rules it explains.

## If one of these ever changes

They are served with `cache-control: immutable` for a year, set in
`next.config.ts`. The name is the cache key, so a replacement file must be
given a new name. Overwriting one in place means a returning visitor keeps the
old bytes until the cache expires.

`inter-naira.woff2` is the one file not taken from Google Fonts: it was first cut
from `inter-latin-ext.woff2` with
`pyftsubset inter-latin-ext.woff2 --unicodes=U+20A6 --flavor=woff2 --layout-features='*'`
(fontTools), keeping the variable weight axis, so English pages draw the
naira sign without preloading the 85KB latin-ext file.
