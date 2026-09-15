# Property scene photographs

Drop a photograph in here named after the scene it is for, and the next build
picks it up. There is no code to edit.

Accepted names: `house`, `villa`, `terrace`, `shortlet`, `flats`, `tower`,
`hotel`, `shop`. Accepted extensions, best first: `.avif`, `.webp`, `.jpg`,
`.jpeg`, `.png`. An AVIF wins over a JPG of the same name, so dropping one in
beside the other upgrades the scene without deleting anything.

`land` is not on the list and must not be. A plot has nothing built on it, so a
photograph of a building on a land listing would be the picture contradicting
the listing. `MediaFrame` draws land instead and that drawing is a statement.

A scene with no file here keeps the stand-in it has today, so these can be
filled in one at a time.

**`docs/IMAGERY.md` names a specific, correctly licensed image for each scene**,
says why, and records the licence each source carries. Read it first.

`scripts/build-scene-manifest.mjs` is what reads this directory. It runs from
`apps/web`'s `prebuild`, it never fails a build, and it warns when a file is
large enough to matter on a Nigerian mobile network.
