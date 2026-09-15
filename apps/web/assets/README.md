# Native icon and splash sources

Generated. Do not hand edit.

`node scripts/build-native-icons.mjs` rebuilds every file here from
`apps/web/public/brand/vallo-icon.png`, which is the canonical app icon:
the glass tile cut from the founder's 1254x1254 render.
`npx @capacitor/assets generate` then fans these out into the Android and
iOS projects.

Nothing here is enlarged. Every target is a downscale or a one-to-one copy,
and the script fails if that ever stops being true.

`scripts/build-web-icons.mjs` is the matching record for the favicon and
the PWA icons under `apps/web/public/pwa`.
