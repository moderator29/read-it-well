# Device showcase: 60 screens

`ios/` and `android/`, each with `dark/` and `light/`, 15 areas each: 2160 x 3840 JPEGs (quality 92) of a 3D handset with the real capture of the live platform on its display. The handset is a mock-up to present the product; it is not a screenshot from an App Store or Play Store build. The Android set uses the Android handset and its 10:00 status bar.

Order (same in all four sets): 01 home, 02 search, 03 filters, 04 listing, 05 cost, 06 price check, 07 stays, 08 stay, 09 restaurant, 10 saved, 11 messages, 12 verification, 13 assistant, 14 rewards, 15 workspace.

Rebuild: `node scripts/marketing/video/reels/showcase/run.mjs --scale 2` (renders PNGs; the JPEGs here were converted from them).
Captures: `docs/marketing/screenshots-2026-10`. Areas and words: `scripts/marketing/video/reels/showcase/areas.js`.
