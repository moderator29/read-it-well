# `probe-elevation.mjs` was deleted rather than repaired

It summed alpha times spread per rung and called the result "how much darker the
area under this thing gets". The axis is backwards. An object further from a
surface casts a shadow that is LARGER, SOFTER and FAINTER: alpha FALLS as height
rises. So a physically correct ladder looks non-monotonic under a sum of ink, and
a ladder that is monotonic in ink has top rungs too dark to read as high.

It reported `--nf-elev-5` as a defect in the light theme on exactly that basis:
rung 5 has a lower peak alpha than rung 4, 0.12 against 0.18, over a larger
offset, 32px against 24px, which is the correct shape for a higher surface. The
probe marked it down for being right.

It was also comparing rung 3, whose shadow points UP because it is the bottom
sheet's rung, against neighbours that cast down.

DELETED RATHER THAN GIVEN A SANITY CASE, because a sanity case cannot fix a
measure that is answering the wrong question, and a probe that runs and prints a
confident table is more dangerous than no probe. What replaced it:

- `probe-elevation-profile.mjs` models the penumbra and reports contact, reach
  and peak, and says which rungs cast which way.
- `probe-elevation-rendered.mjs` renders the rungs, screenshots them and samples
  the composited pixels, which is the only measure that cannot be argued with.

Both carry the argument above in their headers.
