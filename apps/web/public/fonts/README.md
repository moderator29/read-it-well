# The fonts, and where they came from

Seven woff2 files. Inter in three subsets, Poppins in two weights and two
subsets. They are the exact files Google Fonts serves, taken out of a
`next build` that used `next/font/google` and checked in here so nothing at
build time depends on reaching `fonts.gstatic.com`.

Both faces are under the SIL Open Font License 1.1, which permits hosting them
ourselves. Inter is by Rasmus Andersson, Poppins by Indian Type Foundry and
Jonny Pinhorn.

| File | Face | Subset | Bytes |
|---|---|---|---|
| `inter-latin.woff2` | Inter, variable 100 to 900 | latin | 48,432 |
| `inter-latin-ext.woff2` | Inter, variable 100 to 900 | latin-ext | 85,272 |
| `inter-vietnamese.woff2` | Inter, variable 100 to 900 | vietnamese | 10,280 |
| `poppins-600-latin.woff2` | Poppins 600 | latin | 7,992 |
| `poppins-600-latin-ext.woff2` | Poppins 600 | latin-ext | 5,552 |
| `poppins-700-latin.woff2` | Poppins 700 | latin | 7,848 |
| `poppins-700-latin-ext.woff2` | Poppins 700 | latin-ext | 5,448 |

Why these seven and not the nineteen that were being built, which subset holds
the Yoruba and Igbo vowels, and why Poppins 500 and 800 are gone: all of it is
written down in `src/app/css/fonts.css`, next to the rules it explains.

## If one of these ever changes

They are served with `cache-control: immutable` for a year, set in
`next.config.ts`. The name is the cache key, so a replacement file must be
given a new name. Overwriting one in place means a returning visitor keeps the
old bytes until the cache expires.
