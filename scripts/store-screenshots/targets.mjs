/**
 * The pixel sizes each store accepts, checked against the stores' own pages on
 * 29 September 2026. docs/store/APP_STORE_SCREENSHOTS_HANDBOOK.md cites the
 * source for every number; change the two together.
 *
 * App Store: a 6.9" set is the one Apple scales down to every smaller iPhone,
 * and 6.5" becomes required only when 6.9" is missing, so 6.9" is the set
 * kept here and 6.5" renders on request. Vallo is iPhone only, so there is no
 * iPad set.
 *
 * Google Play: 9:16 portrait at 1080 x 1920 is the size Play names for
 * promotion eligibility (sides 320 to 3840 px, long side at most twice the
 * short side, JPEG or 24-bit PNG, no alpha, 8 MB each).
 */
/* `committed: false` targets render on request (`--device iphone-6.5`) and
   are not kept in the repository: Apple asks for 6.5" only when 6.9" is
   missing, and each set is about 45 MB of PNG. */
export const TARGETS = [
  /* `frames` picks the phone: "apple" draws the handset with the camera
     island (and uses Apple's bezel where one is in frames/), "neutral" draws
     the Android handset with a punch hole. */
  { store: "app-store", device: "iphone-6.9", width: 1320, height: 2868, statusTime: "9:41", frames: "apple" },
  { store: "app-store", device: "iphone-6.5", width: 1284, height: 2778, statusTime: "9:41", frames: "apple", committed: false },
  { store: "google-play", device: "phone", width: 1080, height: 1920, statusTime: "10:00", frames: "neutral" },
];

/** Play requires a feature graphic to publish; it carries no screenshot. */
export const FEATURE_GRAPHIC = { store: "google-play", device: "feature-graphic", width: 1024, height: 500 };

/**
 * The phone the live screens are captured as: 440 x 956 points at 3x, the
 * 6.9" iPhone. The native shell draws the status bar above the web view
 * (`overlaysWebView: false` in apps/web/capacitor.config.ts), so the web view
 * is the screen minus the 62 point status bar, and the compositor draws that
 * bar back in the theme's own colour, exactly as the shell does.
 */
export const CAPTURE = {
  widthPt: 440,
  screenHeightPt: 956,
  statusBarPt: 62,
  scale: 3,
};
CAPTURE.webviewHeightPt = CAPTURE.screenHeightPt - CAPTURE.statusBarPt;
