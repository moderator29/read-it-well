# F6 audit proofs, 19 September 2026

Shot from `http://localhost:3109` (`NEXT_DIST_DIR=.next-f6 next dev -p 3109`),
390x844 at dsf 2 unless the name says 1280, with the theme written to
`nf_theme` the way `scripts/verify-shots.mjs` writes it. Files with `-gpu` in
the name came from that same harness with `--enable-unsafe-swiftshader
--use-angle=swiftshader` added to the Chromium launch, which is what fault 1
is about; the others came from `scripts/verify-shots.mjs` as it stands.

| File | Fault |
| --- | --- |
| `f6-00-harness-no-blur.png`, `f6-00-harness-with-blur.png` | 1. The shot harness renders no `backdrop-filter`. One page, one browser, two launch flags. |
| `f6-00-checkout-bar-no-blur-dark.png`, `f6-00-checkout-bar-blur-dark.png` | 1. The same thing on a real surface: the pinned bar shot as a washed strip you can read the page through, and shot as the frosted bar it is. |
| `f6-01-admin-queue-light.png`, `f6-01-admin-all-chip-white-on-white.png` | 2. The selected "All" status chip is white ink on a white plate, 1.21:1. |
| `f6-02-admin-count-41.png` | 11. The console badge says 41 where the queue tab beneath it says All (42). |
| `f6-03-listingcard-pill-collision.png`, `f6-03-search-grid-light.png` | 3. "For sale" and "No photographs yet" stacked on the same corner of a two-up card. |
| `f6-04-brandicon-chip-in-button-light.png`, `f6-04-brandicon-in-button-dark.png` | 4. The daylight navy chip paints inside a brand-filled button. |
| `f6-08-stays-selected-tile-light.png` | 4. The same chip inside the selected Hotels tile. |
| `f6-05-audit-date-column-light.png` | 5. The audit row's submitted-at column breaks one word per line, and repeats a timestamp the row already carries. |
| `f6-11-restaurant-nophotos-over-photo-light.png` | 6. "No photographs yet" over a full-bleed photograph; the amenity rail cuts "Outdoor" to "Outd". |
| `f6-06-invest-copy-over-photo-light.png` | 7. The invest band's sentence runs past the scrim onto the villa. |
| `f6-07-assistant-starter-clipped-light.png` | 8. A starter chip's sentence cut mid-word at the viewport edge. |
| `f6-09-crypto-coin-light.png` | 9. NGN/USD: the selected segment is a near-white capsule on a near-white track. |
| `f6-12-trips-cancel-and-date-wrap-light.png` | 10. Cancel as unstyled grey text; the price breaks the date across two lines. |
| `f6-14-stay-spec-strip-wrap-light.png` | 12. The spec strip wraps its middle cell to two lines where its neighbours hold one. |
| `f6-15-listing-stickybar-over-chips-light.png` | 13. The amenity rail sits under the pinned bar at rest and its last chip is cut by the viewport. |
