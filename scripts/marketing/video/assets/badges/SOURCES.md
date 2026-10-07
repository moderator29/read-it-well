# Store badges: where each file came from

Both files are the stores' own artwork, used unmodified, and only in the films' live ending (see `../../FACTS.md`, "The ending"), which is published only once Vallo is live in both stores.

| File | Source | Notes |
|---|---|---|
| `app-store-black.svg` | Apple's marketing resources, developer.apple.com (downloaded 30 September 2026) | Apple's file byte for byte ("Download_on_the_App_Store_Badge_US-UK_RGB_blk_4SVG_092917"). |
| `google-play-black.svg` | The English black "GET IT ON Google Play" badge (the current four-colour Play logo), taken from the npm package `@rewilok/app-store-badges` 0.1.3, `assets/google_play_badge/black/en.svg`, which redistributes Google's artwork under Google's brand guidelines | Google's own download page (play.google.com/intl/en_us/badges/) is blocked by this environment's network policy. The package's Apple file matches Apple's artwork path for path but is minified (title removed, viewBox rounded), so this Google file is Google's artwork with at most the same kind of processing. Before the live film is published, swap in the file from Google's badge page if anything differs. |

Apple's rules (read 30 September 2026): don't modify, angle or animate the badge; the App Store badge comes first; use the black badge when other stores' badges appear; the same height as other badges. Google's: don't modify the badge; it is the same size as or larger than other stores' badges.
