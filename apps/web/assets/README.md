# Native icon and splash sources

Generated. Do not hand edit.

`node scripts/build-brand-logo.mjs` draws the icon sources here
(`icon-only.png`, `icon-foreground.png`, `icon-background.png`) from the
vector logo in `scripts/brand/logo-art.mjs`, and writes the Android
`mipmap-*` launcher icons and the iOS `AppIcon` directly.

`node scripts/build-native-icons.mjs` writes the launch images
(`splash.png`, `splash-dark.png` and every native `splash.png`): a plain
navy field with no mark (D68c).
