# Native icon and splash sources

Generated. Do not hand edit.

`node scripts/build-native-icons.mjs` rebuilds every file here from
`apps/web/public/brand/rentme-logo.png`, which is the canonical cutout.
`npx @capacitor/assets generate` then fans these out into the Android and
iOS projects. The script explains the scale factors and why none of them
upscales the mark.
