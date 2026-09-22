/*
 * COMPARE WHAT WE DREW AGAINST WHAT THE REFERENCE MEASURES.
 *
 * `sample-reference.mjs` answers half the founder's second ruling: it reads
 * the governing PNGs and says what colour is actually in them. This answers
 * the other half. It opens OUR page on a production server, screenshots it,
 * and samples the same kind of point off our own pixels, so a surface is
 * closed on a number rather than on somebody's impression of a number.
 *
 * WHY PIXELS AND NOT COMPUTED STYLES. A computed style is what was written,
 * not what the browser drew. A border declared `rgba(0,105,254,.35)` composites
 * over whatever is behind it; a glass panel puts a blur between the token and
 * the eye; a shadow bleeds over both. The founder is comparing pixels with his
 * eyes, so the check has to compare pixels too. This is the same lesson as the
 * unlayered `*` border reset, which read correctly in the source and resolved
 * to white 8% in the browser.
 *
 * WHY A PRODUCTION SERVER. `next dev` does not hydrate reliably on this box:
 * same route, same binary, four minutes apart, "React has not hydrated" on dev
 * and clean on `next start`. Every proof comes off `next build && next start`.
 *
 * Usage:
 *   node scripts/design/compare-surface.mjs --base http://127.0.0.1:3170 [--surface dock] [--json]
 *   node scripts/design/compare-surface.mjs --base ... --scan ".nf-tabbar" --url /preview/lead/dock --axis x
 *   node scripts/design/compare-surface.mjs --base ... --shape-sweep --routes /wallet,/settings --theme both
 *
 * `--theme dark|light|both` picks the theme every page is opened in, and it
 * defaults to dark. Until 22 September this script had no theme switch at all,
 * which is half the reason the paper twin had never been tested once.
 *
 * `--scan` prints a scanline across an element instead of running the checks,
 * which is how you find an empty spot to sample before you write a check down.
 */
import { chromium } from "playwright-core";

const arg = (name, fallback = null) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
};
const BASE = arg("base", "http://127.0.0.1:3170").replace(/\/$/, "");
const JSON_OUT = process.argv.includes("--json");

/*
 * THE THEME, WHICH THIS SCRIPT DID NOT HAVE AND WHICH IS WHY NOTHING IN THE
 * BUILD HAS EVER LOOKED AT PAPER.
 *
 * The founder's report on light mode was five root causes deep and every one
 * of them had survived because the only two browser-driven checks in the tree
 * ran in the default theme: this script had no theme switch at all, and the
 * contrast probe covered four elements on one route. A ratio is not
 * theme-neutral either - a light rule can change a control's padding, its
 * font, whether its label wraps, and therefore its drawn short side and
 * therefore its ratio.
 *
 * `--theme dark|light|both`. `both` sweeps each route in each theme and
 * reports the theme on every line, because a breach that exists on paper only
 * is still a breach and a reader has to be told which theme they are looking
 * at.
 *
 * HOW THE THEME IS SET, AND WHY IT IS SET TWICE. `settings-store.ts:219` and
 * the before-paint script in the root layout read `nf_theme` from storage and
 * put `data-theme="light"` on the root, with NO attribute for dark. So an
 * init script seeds storage before the first byte of the document, which is
 * what stops the page painting dark and then correcting itself, and the
 * attribute is set again after load in case a route rendered before the seed
 * landed. Both, because either alone has a hydration race in it.
 */
const THEME_ARG = arg("theme", "dark");
const THEMES = THEME_ARG === "both" ? ["dark", "light"] : [THEME_ARG];
for (const t of THEMES) {
  if (t !== "dark" && t !== "light") {
    console.error(`--theme takes dark, light or both. Got "${t}".`);
    process.exit(2);
  }
}

const PHONE = { width: 390, height: 844 };
const DESKTOP = { width: 1536, height: 1024 };

/*
 * THE EXPECTED COLUMN IS NOT AN OPINION. Every `want` below is a hex that
 * `sample-reference.mjs` read out of a governing PNG, and the `from` names
 * which sample it is, so a disagreement is settled by re-running the sampler
 * rather than by arguing. Where the reference cannot answer (a surface it
 * never draws) there is no check here, because inventing a target and then
 * passing it is worse than admitting the reference is silent.
 *
 * TOLERANCE. `tol` is the largest allowed distance on any one channel. Eight
 * is about the width of a JPEG-ish gradient wobble in these images and is well
 * under the quarter-of-a-rung error that the dock edge turned out to be
 * (#003C94 against #012E78 is 28 on blue). A check that needs a tolerance
 * above sixteen is not a check, it is a wish.
 */
const SURFACES = {
  dock: {
    url: "/preview/lead/dock",
    viewport: PHONE,
    note: "the five-slot dock over the product's own canvas, Home active",
    checks: [
      {
        name: "dock: the bar fill",
        selector: ".nf-tabbar",
        at: { fx: 0.5, fy: 0.12 },
        box: 3,
        want: "#000C2E",
        from: "chrome reference, dock: the bar fill",
        tol: 10,
      },
      {
        name: "dock: its top border",
        selector: ".nf-tabbar",
        at: "top-border",
        box: 2,
        want: "#012E78",
        from: "chrome reference, dock: its top border",
        tol: 12,
      },
      {
        name: "dock: the active slot ink",
        selector: ".nf-tab__link[aria-current] .nf-tab__icon",
        at: { fx: 0.5, fy: 0.5 },
        box: 3,
        want: "#0257FD",
        from: "chrome reference, dock: the active slot ink",
        tol: 24,
      },
      {
        name: "dock: a resting slot ink",
        selector: ".nf-tab__link:not([aria-current]) .nf-tab__icon",
        at: { fx: 0.5, fy: 0.5 },
        box: 3,
        want: "#001237",
        from: "chrome reference, dock: a resting slot ink",
        tol: 24,
      },
      {
        name: "canvas: the ground the dock floats on",
        selector: "main",
        at: { fx: 0.5, fy: 0.08 },
        box: 9,
        want: "#000612",
        from: "hero reference, canvas: the page ground below the fold",
        tol: 8,
      },
    ],
    shapes: [
      /*
       * THE SHAPE LAW, MEASURED AS A RATIO. A radius token says nothing on its
       * own: 32px is a rounded rectangle on a tall card and a semicircle on a
       * 66px bar. So this records the drawn radius as a fraction of the drawn
       * short side. Half is a capsule. The dock in the reference has visibly
       * straight ends, so anything at or above 0.5 here is the defect the
       * founder ruled on.
       */
      { name: "dock: the bar", selector: ".nf-tabbar", maxRatio: 0.45 },
      { name: "dock: the travelling pill", selector: ".nf-tabbar__pill", maxRatio: 0.45 },
      { name: "dock: a slot", selector: ".nf-tab__link", maxRatio: 0.45 },
      { name: "dock: the context island", selector: ".nf-dock-island", maxRatio: 0.45 },
    ],
  },

  /*
   * R1 SECOND PASS, the header. `founder/GOVERNING-home-markets-target.png`
   * draws NO bar behind the lockup row and NO hairline under it: its sample at
   * the lockup row reads #000311 against a canvas of #000312, a difference of
   * one on one channel, which is the reference saying "there is nothing here".
   */
  chrome: {
    url: "/preview/f1/chrome",
    viewport: PHONE,
    note: "the app header and the five-slot dock, signed in, Home active",
    checks: [
      {
        name: "header: any bar fill of its own",
        /* fx 0.70, not 0.50. A scan across this header at 390 shows the
           lockup, the bell and the avatar lighting most of the row; 0.60
           through 0.75 is the only run of empty ground in it, and an empty
           spot is the only place "is there a bar here" can be asked. */
        name2: null,
        selector: ".nf-app-header",
        at: { fx: 0.70, fy: 0.5 },
        box: 5,
        want: "#000311",
        from: "chrome reference, header: any bar fill behind the lockup row (there is none)",
        tol: 8,
      },
      {
        name: "canvas: the ground the header sits on",
        /* The control for the check above. If the header row and the page
           below it read the same, the header draws no bar of its own; if they
           differ, it does. Comparing the header against the reference alone
           cannot tell those apart. */
        selector: "main",
        at: { fx: 0.70, fy: 0.55 },
        box: 5,
        want: "#000312",
        from: "chrome reference, canvas: the screen ground beside the lockup",
        tol: 8,
      },
      {
        name: "header: a hairline under it, if any",
        selector: ".nf-app-header",
        at: "bottom-border",
        box: 2,
        want: "#000312",
        from: "chrome reference, header: the hairline under the header (there is none)",
        tol: 10,
      },
    ],
    shapes: [
      { name: "header: the hamburger", selector: ".nf-app-header__btn", maxRatio: 0.45 },
      { name: "header: the avatar (exempt, recorded)", selector: ".nf-app-header__avatar", maxRatio: 1 },
      { name: "dock: the bar", selector: ".nf-tabbar", maxRatio: 0.45 },
      { name: "dock: the context island", selector: ".nf-dock-island", maxRatio: 0.45 },
    ],
  },

  /*
   * R1 SECOND PASS. The in-app home at 390, which is the surface
   * `founder/GOVERNING-home-markets-target.png` actually draws, and the only
   * place the header, the dock, the market tiles, the search field and the
   * city chips can be read against the product's own ground.
   *
   * NOT `/preview/f1/home`. `app/(dev)/preview/layout.tsx` calls `notFound()`
   * when `NODE_ENV === "production"`, and `next start` is production, so every
   * preview route 404s on the only server the founder accepts a proof from.
   * `/home` renders signed out (its layout passes `signedIn` through rather
   * than redirecting), so it is the route that can actually be measured.
   *
   * Every `want` below is a hex `sample-reference.mjs --chrome` read out of
   * that PNG, re-run by R1 rather than copied from prose.
   */
  home: {
    url: "/preview/f1/home",
    viewport: PHONE,
    note: "the in-app home body: search field, market tiles, city chips, canvas",
    checks: [
      {
        name: "canvas: the screen ground",
        selector: ".nf-home",
        at: { fx: 0.5, fy: 0.002 },
        box: 5,
        want: "#000312",
        from: "chrome reference, canvas: the screen ground beside the lockup",
        tol: 8,
      },
      {
        name: "search field: top border",
        selector: ".nf-home__search",
        at: "top-border",
        box: 2,
        want: "#002E7A",
        from: "chrome reference, search field: top border",
        tol: 14,
      },
      {
        /*
         * HELD AGAINST THE PLATE, NOT AGAINST THE PLATE PLUS THE ARROW. W2.
         *
         * This used to want #3C7CFC, from `search submit: the rounded square
         * fill`, which is a 6px box on the CENTRE of the reference's button
         * and therefore mostly the white arrow glyph. Our sample point is at
         * fy 0.22, clear of our own arrow, so the check was holding a plate
         * against a plate-and-glyph average and reporting a 53-point miss
         * that was partly the harness's own doing. The new reference point
         * is the same plate above the glyph and inside both shoulders. The
         * old point is still printed by the sampler, because the second
         * audit cites it.
         */
        name: "search submit: the plate",
        selector: ".nf-home__search-go",
        at: { fx: 0.5, fy: 0.22 },
        box: 3,
        want: "#015FFD",
        from: "chrome reference, search submit: the plate, clear of the arrow glyph",
        tol: 20,
      },
      {
        name: "market tile: fill",
        selector: ".nf-home__market",
        at: { fx: 0.78, fy: 0.16 },
        box: 5,
        want: "#000C27",
        from: "chrome reference, market tile: fill",
        tol: 10,
      },
      {
        name: "market tile: top border",
        selector: ".nf-home__market",
        at: "top-border",
        box: 2,
        want: "#1A5CA5",
        from: "chrome reference, market tile: top border",
        tol: 16,
      },
      {
        name: "market tile: the plate behind the glyph",
        selector: ".nf-home__market-art .nf-brand-icon-ground",
        at: { fx: 0.5, fy: 0.5 },
        box: 3,
        want: "#0785FD",
        from: "chrome reference, market tile: the glyph plate behind the icon",
        tol: 24,
      },
      {
        name: "city chip: fill",
        selector: ".nf-home__city",
        at: { fx: 0.5, fy: 0.9 },
        box: 4,
        want: "#030C23",
        from: "chrome reference, city chip: fill",
        tol: 10,
      },
      {
        name: "city chip: top border",
        selector: ".nf-home__city",
        at: "top-border",
        box: 2,
        want: "#002051",
        from: "chrome reference, city chip: top border",
        tol: 14,
      },
    ],
    shapes: [
      { name: "market tile", selector: ".nf-home__market", maxRatio: 0.45 },
      { name: "city chip", selector: ".nf-home__city", maxRatio: 0.45 },
      { name: "the location chip", selector: ".nf-home__loc", maxRatio: 0.45 },
      { name: "search field", selector: ".nf-home__search", maxRatio: 0.45 },
      { name: "search submit", selector: ".nf-home__search-go", maxRatio: 0.45 },
      { name: "market tile: the glyph plate", selector: ".nf-home__market-art .nf-brand-icon-ground", maxRatio: 0.45 },
    ],
  },

  /*
   * W3, 19 September: THE DESKTOP HERO AT 1536, WHICH NOBODY HAD MEASURED.
   *
   * `GOVERNING-landing-desktop-hero.png` is the colour and glow authority for
   * the whole product and the landing at 1536 is the first thing a visitor
   * meets, and until now every colour check in this file was a phone check.
   * The hero image had been sampled; our own desktop rendering had not.
   *
   * WHY `/preview/f2` AND NOT `/`. They are the same tree: `app/page.tsx` and
   * the preview page both render `LandingBody` and both wrap it in the same
   * `SiteHeader`; only the DATA differs. On this box the catalogue read comes
   * back empty, so the shipped `/` draws no floating listing card at all, and
   * the card is one of the twenty points the reference names. A surface that
   * cannot show the element cannot be held to it. Every other check here
   * reads identically on `/`; the card is the only one that needs fixtures.
   *
   * THREE OF THE REFERENCE'S TWENTY POINTS HAVE NO COUNTERPART HERE, and
   * inventing one would be worse than saying so:
   *   - "card: stats tile fill" and "card: stats tile top border". The render
   *     draws four glass stat tiles under the hero. That band was removed
   *     from the landing on the founder's ruling of 19 September (the same
   *     three figures were printed twice on one page); the figures now sit in
   *     the community band as bare numerals, not as tiles, so there is no
   *     tile to sample.
   *   - the reference's feature TILES are ten separate glass plates; ours is
   *     one banded row of six cells divided by hairlines. The band's edge is
   *     checked against the tile's edge below, and the cell's interior
   *     against the tile's fill, which is the closest honest pairing, but
   *     the anatomy is not the same object and the numbers should be read
   *     with that in mind.
   *
   * AND THE HEADER CHECK CARRIES A CAVEAT THE OTHERS DO NOT. Both headers
   * float over a PHOTOGRAPH, and it is not the same photograph at the same
   * pixel, so a miss on that one check is not on its own proof of anything.
   * What IS proof is the step at the header's foot, and the reference has
   * none: a column down `GOVERNING-landing-desktop-hero.png` at x=470 walks
   * rgb(0 8 26) at y=2 to rgb(3 19 45) at y=128 without a single
   * discontinuity, which is the image saying the bar has no fill of its own.
   * The same column on ours steps rgb(40 53 98) at y=70 to rgb(4 16 50) at
   * y=90. That is a bar. It is recorded in the report rather than as a check
   * because a check needs one number and this needs two.
   */
  landing: {
    url: "/preview/f2",
    viewport: DESKTOP,
    note: "the desktop hero and the feature band at 1536, against the governing hero PNG",
    checks: [
      {
        name: "canvas: the page ground below the fold",
        /* A NEGATIVE FRACTION IS OUTSIDE THE ELEMENT ON PURPOSE. The page's
           own ground at 1536 is the gutter beside the feature band, and the
           band is the only element whose box locates it. -0.1 of 1168px puts
           the sample 117px to the left of the band, in the gutter. */
        selector: ".nf-landing-chiprow",
        at: { fx: -0.1, fy: 0.5 },
        box: 9,
        want: "#000612",
        from: "hero reference, canvas: the page ground below the fold",
        tol: 8,
      },
      {
        name: "header: the bar's own fill, over the photo",
        /* fx 0.293: the only empty run in our header row at 1536 is between
           the wordmark (ends 338) and the nav (starts 556). Read the caveat
           above before treating a miss here as a colour fault. */
        selector: ".nf-site-bar",
        at: { fx: 0.293, fy: 0.5 },
        box: 5,
        want: "#000D23",
        from: "hero reference, header: the bar's own fill, over the photo",
        tol: 10,
      },
      {
        name: "primary button: fill, top of the vertical ramp",
        /* fx 0.93 is past the trailing arrow and clear of the label. The
           reference's ramp is vertical, so all three of these share a column
           and differ only in height. */
        selector: ".nf-landing-hero .nf-btn--primary",
        at: { fx: 0.93, fy: 0.1 },
        box: 3,
        want: "#019BFE",
        from: "hero reference, primary button: fill, top of the vertical ramp",
        tol: 16,
      },
      {
        name: "primary button: fill, centre height",
        selector: ".nf-landing-hero .nf-btn--primary",
        at: { fx: 0.93, fy: 0.5 },
        box: 3,
        want: "#0567FA",
        from: "hero reference, primary button: fill, centre height",
        tol: 16,
      },
      {
        name: "primary button: fill, foot of the vertical ramp",
        selector: ".nf-landing-hero .nf-btn--primary",
        at: { fx: 0.93, fy: 0.9 },
        box: 3,
        want: "#005DFE",
        from: "hero reference, primary button: fill, foot of the vertical ramp",
        tol: 16,
      },
      {
        name: "primary button: the header's Get Started, fill under the label",
        selector: ".nf-site-nav .nf-btn--primary",
        at: { fx: 0.9, fy: 0.85 },
        box: 3,
        want: "#0068FE",
        from: "hero reference, primary button: the header's Get Started, fill under the label",
        tol: 16,
      },
      {
        name: "secondary button: Explore Stays, fill",
        selector: ".nf-landing-hero .nf-btn--glass",
        at: { fx: 0.9, fy: 0.15 },
        box: 5,
        want: "#212741",
        from: "hero reference, secondary button: Explore Stays, fill",
        tol: 16,
      },
      {
        name: "secondary button: Explore Stays, top border",
        selector: ".nf-landing-hero .nf-btn--glass",
        at: "top-border",
        box: 2,
        want: "#2B6BA4",
        from: "hero reference, secondary button: Explore Stays, top border",
        tol: 16,
      },
      {
        name: "chip: Lagos, fill",
        selector: ".nf-landing-city--lead",
        at: { fx: 0.9, fy: 0.5 },
        box: 3,
        want: "#083189",
        from: "hero reference, chip: Lagos, fill",
        tol: 16,
      },
      {
        name: "chip: Lagos, top border",
        selector: ".nf-landing-city--lead",
        at: "top-border",
        box: 2,
        want: "#1C5CC9",
        from: "hero reference, chip: Lagos, top border",
        tol: 16,
      },
      {
        name: "search container: fill, right of the segments",
        selector: ".nf-landing-pill",
        at: { fx: 0.87, fy: 0.5 },
        box: 6,
        want: "#1B395C",
        from: "hero reference, search container: fill, right of the segments",
        tol: 16,
      },
      {
        name: "search container: top border",
        selector: ".nf-landing-pill",
        at: "top-border",
        box: 2,
        want: "#2F629C",
        from: "hero reference, search container: top border",
        tol: 16,
      },
      {
        name: "search segment: Buy, active fill",
        selector: '.nf-landing-pill-seg[aria-checked="true"]',
        at: { fx: 0.87, fy: 0.5 },
        box: 3,
        want: "#124E9D",
        from: "hero reference, search segment: Buy, active fill",
        tol: 16,
      },
      {
        name: "search segment: Rent, resting fill",
        selector: '.nf-landing-pill-seg:not([aria-checked="true"])',
        at: { fx: 0.9, fy: 0.5 },
        box: 3,
        want: "#1F3A5D",
        from: "hero reference, search segment: Rent, resting fill",
        tol: 16,
      },
      {
        name: "card: the band behind the tiles",
        selector: ".nf-landing-chiprow",
        at: { fx: 0.02, fy: 0.5 },
        box: 6,
        want: "#000612",
        from: "hero reference, card: the band behind the tiles",
        tol: 8,
      },
      {
        name: "tile: feature tile fill",
        selector: ".nf-landing-chipcell",
        at: { fx: 0.06, fy: 0.06 },
        box: 5,
        want: "#000D2B",
        from: "hero reference, tile: feature tile fill",
        tol: 16,
      },
      {
        name: "tile: feature tile top border",
        selector: ".nf-landing-chiprow",
        at: "top-border",
        box: 2,
        want: "#001A41",
        from: "hero reference, tile: feature tile top border",
        tol: 16,
      },
      {
        name: "listing card: fill",
        selector: ".nf-landing-float",
        at: { fx: 0.93, fy: 0.88 },
        box: 3,
        want: "#172633",
        from: "hero reference, listing card: fill",
        tol: 16,
      },
    ],
    shapes: [
      { name: "primary button", selector: ".nf-landing-hero .nf-btn--primary", maxRatio: 0.45 },
      { name: "secondary button", selector: ".nf-landing-hero .nf-btn--glass", maxRatio: 0.45 },
      { name: "the lead city chip", selector: ".nf-landing-city--lead", maxRatio: 0.45 },
      { name: "the search container", selector: ".nf-landing-pill", maxRatio: 0.45 },
      { name: "the active search segment", selector: '.nf-landing-pill-seg[aria-checked="true"]', maxRatio: 0.45 },
      { name: "the floating listing card", selector: ".nf-landing-float", maxRatio: 0.45 },
    ],
  },
};

const SURFACE = arg("surface", "dock");
const SCAN = arg("scan", null);
const FALLOFF = arg("falloff", null);
const SHAPE_SWEEP = process.argv.includes("--shape-sweep");
/*
 * THE TWIN SWEEP: A SET OF OBJECTS DRAWN SIDE BY SIDE IS ALL TWINNED OR NONE.
 *
 * 23 of the 144 glass objects ship a light twin and 121 do not. In dark that
 * distinction paints identically, because an untwinned object's chip is
 * transparent. On paper they are two different materials: a twinned mark is a
 * pale frosted object standing on nothing, an untwinned one is its dark
 * artwork on a framed navy plate. A row holding both is two artwork families
 * in one row, and it is invisible to everybody working in the default theme.
 *
 * It could not be checked from source, because the fact lived in a `Set`
 * inside `BrandIcon.tsx` and never reached the DOM. It does now, as
 * `data-twinned`, so this walks a real page and reports every container whose
 * own object children disagree. Theme-independent by construction: it reads
 * the attribute, not the paint, so one run answers for both themes.
 */
const TWIN_SWEEP = process.argv.includes("--twin-sweep");

/*
 * THE SHAPE SWEEP, AND IT IS THE ONLY CHECK THAT CAN SEE THE DEFECT.
 *
 * `check-css-tokens.mjs` rule 10 fails the build on a pill radius on a
 * control, and it is worth having, but it reads SOURCE TEXT and the shape law
 * has now been broken twice with it passing. `--nf-radius-sm` is 14px, which
 * is a tidy rectangle on a 56px button and a CAPSULE on a 28px chip.
 * `--nf-radius-2xl` is 32px, which is a card on a 300px panel and SEMICIRCULAR
 * ENDS on a 66px dock. Neither spelling contains the word pill.
 *
 * So the ratio is the test: the drawn radius over the drawn short side, read
 * off a real browser on a real production server. Half is a capsule. Anything
 * over `WARN_AT` is worth a human's eye even if it is not yet a capsule.
 *
 * WHAT IS EXEMPT, and the list is the design direction's list rather than a
 * convenience: an avatar, and a BARE ICON-ONLY control that is drawn round in
 * a governing image. Text-bearing is therefore the thing worth detecting, and
 * it is detected by asking the element whether it renders any non-whitespace
 * text, not by its class name. A dot, a spinner, a progress track, a switch,
 * a story ring and a skeleton are shapes rather than controls and the law does
 * not reach them, so they are excluded by selector.
 */
const FAIL_AT = 0.5;
const WARN_AT = 0.35;
/*
 * R1'S SECOND PASS WIDENED THIS, and the reason is worth keeping: the sweep
 * reported `/` clean while `.nf-notif__count` was drawing a perfect circle
 * around the numeral "2" one route away. The list was written from the word
 * "control" and the shape law is not about controls by name, it is about
 * anything drawn with a corner and a label. So it now reaches badges, counts,
 * tags, segments and summaries, and it matches on class SUBSTRINGS rather than
 * on an inventory of exact class names, because an inventory is a list of the
 * faults somebody has already thought of.
 */
const CONTROL_SELECTOR = [
  "button",
  "a.nf-btn",
  "a.nf-site-nav-link",
  "a.nf-tab__link",
  "button.nf-tab__link",
  ".nf-btn",
  ".nf-icon-btn",
  ".nf-landing-pill-seg",
  ".nf-landing-city",
  ".nf-home__market",
  ".nf-home__city",
  ".nf-home__loc",
  "label",
  "summary",
  "[class*=chip]",
  "[class*=badge]",
  "[class*=count]",
  "[class*=tag]",
  "[class*=seg]",
  "[class*=pill]",
  "input:not([type=range]):not([type=checkbox]):not([type=radio])",
  "select",
  "[role=button]",
  "[role=tab]",
].join(",");
const SHAPE_EXEMPT = [
  ".nf-avatar",
  "[class*=avatar]",
  "[class*=skeleton]",
  "[class*=spinner]",
  "[class*=switch]",
  "[class*=story-ring]",
  "[class*=grip]",
  "[class*=progress]",
].join(",");

const browser = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium",
  /*
   * WITHOUT THESE, HEADLESS CHROMIUM SILENTLY DROPS `backdrop-filter`. It does
   * not warn and it does not fail: the glass simply renders as a flat fill, so
   * every glass surface measures wrong and the measurement looks authoritative.
   * That was the first of today's four harness lies.
   */
  args: ["--enable-unsafe-swiftshader", "--use-angle=swiftshader"],
});

const hex = ([r, g, b]) =>
  "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("").toUpperCase();
const parse = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));

async function openSurface(url, viewport, theme = THEMES[0]) {
  const page = await browser.newPage({
    viewport,
    deviceScaleFactor: 2,
    colorScheme: theme,
  });
  /* Seeded BEFORE the first navigation, so the before-paint script in the root
     layout reads it and the page is never painted in the wrong theme first. */
  await page.addInitScript((t) => {
    try {
      window.localStorage.setItem("nf_theme", t);
    } catch {
      /* A storage-blocked context still gets the attribute below. */
    }
  }, theme);
  const response = await page.goto(`${BASE}${url}`, {
    waitUntil: "networkidle",
    timeout: 60_000,
  });

  /*
   * WHAT THE BROWSER ACTUALLY GOT, BEFORE ANYTHING IS MEASURED ON IT.
   *
   * This is the seventh harness lie and it is the worst of them, because this
   * tool is the design law's only enforcement. `page.goto` returned a
   * response nobody read. A route that 404s, 500s, or redirects a signed out
   * visitor to `/sign-in` was swept exactly like a healthy one, and it
   * reported ZERO BREACHES, because a sign-in screen genuinely has no capsules
   * on it. Every "0 breaches at 390 and 1536" in the ledger came through here.
   * A clean sweep of a page that never rendered is the strongest false green
   * this build can produce: it is not a missing signal, it is a confident
   * wrong one.
   *
   * Its sibling `verify-shots.mjs` learned the same lesson the expensive way,
   * writing five PNGs of the sign-in screen under five other routes' names,
   * three of them byte identical, with every assertion passing.
   *
   * So: refuse rather than measure. A sweep that throws is a sweep somebody
   * fixes; a sweep that lies is one somebody quotes.
   */
  const status = response?.status() ?? 0;
  if (status < 200 || status >= 300) {
    throw new Error(
      `REFUSING TO SWEEP ${url}: the server answered ${status}. ` +
        `Measuring a page the browser never got is how a 404 reports zero breaches.`,
    );
  }

  /* WHERE IT LANDED, not where it was sent. A 307 to /sign-in is followed by
     the browser and arrives here as a healthy 200 on a different page, which
     is exactly the shape that wrote five false proofs. The query string is
     dropped because `?next=` is noise, and a trailing slash is not a
     difference. */
  const landed = new URL(page.url()).pathname.replace(/\/$/, "") || "/";
  const asked = new URL(`${BASE}${url}`).pathname.replace(/\/$/, "") || "/";
  if (landed !== asked) {
    throw new Error(
      `REFUSING TO SWEEP ${url}: the browser ended up at ${landed}. ` +
        `A gated route redirected, and the page measured would not be the page named.`,
    );
  }
  /* And again from here, because the seed above loses a race with any route
     that rendered before the init script landed. Dark carries NO attribute,
     which is the platform default and is how the token sheet is keyed. */
  await page.evaluate((t) => {
    if (t === "light") document.documentElement.setAttribute("data-theme", "light");
    else document.documentElement.removeAttribute("data-theme");
  }, theme);
  await page.waitForTimeout(200);
  /*
   * A Reveal band that never animates in is the third harness lie: the page is
   * "loaded" and the content is at opacity 0, so every sample reads the ground.
   * `scroll-behavior: smooth` in base.css makes `window.scrollTo(0, y)` a
   * silent no-op without a compositor, which is why this passes `instant`.
   */
  await page.evaluate(() => window.scrollTo({ top: 0, left: 0, behavior: "instant" }));
  /*
   * THE 900ms WAS A FIXED WAIT AND IT MADE THE GUARD THE FLAKIEST THING HERE.
   *
   * The guard itself is right: a band at opacity 0 means every sample under it
   * reads the ground. But on a loaded box the landing's second Reveal takes
   * about three seconds to run, so a single 900ms wait threw on a page that
   * was merely slow, and four sweeps in a row died on a route with nothing
   * wrong with it. Measured on /: one band under 0.5 at 1s, none at 3s.
   *
   * So it POLLS to a deadline instead. A page that settles is measured; a page
   * that genuinely never reveals still throws, which is the case the guard
   * exists for. R1.
   */
  let stuck = 0;
  const deadline = Date.now() + 12_000;
  for (;;) {
    await page.waitForTimeout(400);
    stuck = await page.evaluate(() =>
      [...document.querySelectorAll(".nf-reveal")].filter((el) => {
        const r = el.getBoundingClientRect();
        if (r.bottom < 0 || r.top > window.innerHeight) return false;
        return Number(getComputedStyle(el).opacity) < 0.5;
      }).length,
    );
    if (stuck === 0 || Date.now() > deadline) break;
  }
  if (stuck > 0) {
    throw new Error(
      `${url}: ${stuck} on-screen reveal band(s) still at opacity < 0.5. The page did not finish, so no sample from it counts.`,
    );
  }
  return page;
}

/** Sample the screenshot, not the DOM. Coordinates are CSS px; the shot is 2x. */
async function sampler(page) {
  const shot = (await page.screenshot({ type: "png" })).toString("base64");
  await page.evaluate(async (src) => {
    const img = new Image();
    img.src = "data:image/png;base64," + src;
    await img.decode();
    const c = document.createElement("canvas");
    c.width = img.naturalWidth;
    c.height = img.naturalHeight;
    const ctx = c.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(img, 0, 0);
    window.__shot = { ctx, w: img.naturalWidth, h: img.naturalHeight };
  }, shot);
  return async (cssX, cssY, size) =>
    page.evaluate(
      ({ x, y, size }) => {
        const { ctx, w, h } = window.__shot;
        const px = Math.round(x * 2);
        const py = Math.round(y * 2);
        /*
         * THE CLAMP THAT STOOD HERE INVENTED A FINDING, AND IT IS THE FIFTH
         * HARNESS LIE. W2, 19 September.
         *
         * It read `Math.min(w - 1, Math.max(0, ...))` on both axes. The
         * screenshot is the VIEWPORT, not the page, so any element below the
         * fold has a sample point past the bottom of the shot, and the clamp
         * quietly slid that point onto the LAST ROW OF THE SCREEN and
         * returned whatever was there, with no warning and no mark on the
         * output. At 390 the home's featured-cities row sits at y=920 in an
         * 844px viewport, so every city chip number in the second audit was
         * read off the bottom of the dock: the chip's border came back as
         * #040A26 with "no distinct edge row at all", and the audit filed it
         * as an edge that was not being drawn. Scrolled into view the same
         * border reads #01409F, which is not missing, it is seventy-eight
         * points TOO BRIGHT on blue. Same element, opposite defect, opposite
         * fix.
         *
         * A measurement that cannot be taken has to say so. Out of bounds now
         * returns null and the caller reports it as a miss with a reason,
         * which is the only honest answer; the check loop below scrolls an
         * element into view and re-shoots before it gets here, so in practice
         * this fires only for a point genuinely off the page.
         */
        const half = Math.max(0, Math.floor(size / 2));
        if (px - half < 0 || py - half < 0 || px + half >= w || py + half >= h) return null;
        const d = ctx.getImageData(px - half, py - half, size, size).data;
        let r = 0, g = 0, b = 0, n = 0;
        for (let i = 0; i < d.length; i += 4) { r += d[i]; g += d[i + 1]; b += d[i + 2]; n += 1; }
        return [Math.round(r / n), Math.round(g / n), Math.round(b / n)];
      },
      { x: cssX, y: cssY, size },
    );
}

/*
 * SCROLL THE THING INTO VIEW BEFORE PHOTOGRAPHING IT. W2.
 *
 * The companion to the clamp above. A surface is a list of checks and they do
 * not all fit on one screen: the home's canvas, search field and market tiles
 * are above the fold at 390 and its city chips are eighty pixels below it. The
 * sampler shoots the viewport, so the shot has to be retaken once the element
 * being measured is actually in it. Returns true when it moved the page, which
 * is the caller's signal that its screenshot is stale.
 *
 * `block: "center"` rather than `nearest`, so the element is not sitting under
 * the fixed dock or behind the app header, either of which would be measured
 * instead of it. `behavior: "instant"`, because `scroll-behavior: smooth` in
 * base.css makes an animated scroll a silent no-op without a compositor, which
 * is the same trap `openSurface` documents above.
 */
async function ensureInView(page, selector) {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return false;
    const r = el.getBoundingClientRect();
    if (r.top >= 0 && r.bottom <= window.innerHeight) return false;
    el.scrollIntoView({ block: "center", behavior: "instant" });
    return true;
  }, selector);
}

const surface = SURFACES[SURFACE];
if (!surface) {
  console.error(`no surface named "${SURFACE}". known: ${Object.keys(SURFACES).join(", ")}`);
  process.exit(2);
}

if (TWIN_SWEEP) {
  const routes = (arg("routes", surface.url) ?? surface.url).split(",").map((r) => r.trim());
  const mixed = [];
  let containers = 0;
  let objects = 0;
  for (const route of routes) {
    const p = await openSurface(route, PHONE, THEMES[0]);
    const found = await p.evaluate(() => {
      const grounds = [...document.querySelectorAll(".nf-brand-icon-ground[data-twinned]")];
      /* Group by the nearest ancestor that holds more than one of them: that
         is the "set drawn side by side" the rule is about. A single object on
         a surface of its own can never disagree with anything. */
      const byParent = new Map();
      for (const g of grounds) {
        let host = g.parentElement;
        while (host && host.querySelectorAll(".nf-brand-icon-ground[data-twinned]").length < 2) {
          host = host.parentElement;
        }
        if (!host) continue;
        if (!byParent.has(host)) byParent.set(host, []);
        byParent.get(host).push({
          object: g.dataset.object,
          twinned: g.dataset.twinned === "true",
        });
      }
      const out = [];
      for (const [host, kids] of byParent) {
        const twinned = kids.filter((k) => k.twinned);
        const bare = kids.filter((k) => !k.twinned);
        if (twinned.length && bare.length) {
          out.push({
            host:
              (typeof host.className === "string" ? host.className.split(/\s+/).slice(0, 3).join(".") : "") ||
              host.tagName.toLowerCase(),
            twinned: twinned.map((k) => k.object),
            untwinned: bare.map((k) => k.object),
          });
        }
      }
      return { mixed: out, containers: byParent.size, objects: grounds.length };
    });
    await p.close();
    containers += found.containers;
    objects += found.objects;
    for (const m of found.mixed) mixed.push({ route, ...m });
  }
  await browser.close();
  if (JSON_OUT) {
    console.log(JSON.stringify({ mixed, containers, objects }, null, 2));
  } else {
    console.log(
      `twin sweep: ${routes.length} route(s). ${objects} object(s) in ${containers} set(s) of two or more.\n`,
    );
    console.log(`SETS MIXING TWINNED AND UNTWINNED ARTWORK: ${mixed.length}`);
    for (const m of mixed) {
      console.log(`  ${m.route}  ${m.host}`);
      console.log(`      twinned:   ${m.twinned.join(", ")}`);
      console.log(`      untwinned: ${m.untwinned.join(", ")}`);
    }
    console.log(
      `\n${mixed.length === 0 ? "every set drawn side by side is all twinned or none." : `${mixed.length} set(s) draw two artwork families side by side. On paper that is visible; in dark it is not.`}`,
    );
  }
  process.exit(mixed.length === 0 ? 0 : 1);
}

if (SHAPE_SWEEP) {
  /*
   * One or more routes, each swept at both widths, because the ratio changes
   * with the layout: a control that is a rectangle at 1536 can be a capsule at
   * 390 when its label wraps away and its height collapses.
   */
  const routes = (arg("routes", surface.url) ?? surface.url).split(",").map((r) => r.trim());
  const widths = (arg("widths", "390,1536") ?? "390,1536").split(",").map((w) => Number(w.trim()));
  let worst = 0;
  const findings = [];
  /*
   * A REFUSED ROUTE IS RECORDED, NOT FATAL, AND THAT IS WHY THIS SWEEP HAD ONLY
   * EVER COVERED NINE ROUTES OF NINETY-EIGHT.
   *
   * `openSurface` refuses correctly on a non-2xx, on a redirect and on a page
   * that never revealed, and every one of those refusals used to throw straight
   * out of this loop and end the whole run. So the first gated route in the list
   * stopped the sweep, and the only way anybody could get an answer was to hand
   * it a short list of routes they already knew were open. The law's own
   * definition of done asks for a sweep of the platform that returns zero, and a
   * sweep that dies on route ten cannot answer it either way.
   *
   * Refusals are now collected and PRINTED as their own section, with the
   * reason. A refused route is not a clean route: it is a route nothing is
   * claimed about, and the run's exit code says so.
   */
  const refused = [];
  for (const route of routes) {
    for (const width of widths) {
     for (const theme of THEMES) {
      const vp = { width, height: width < 900 ? 844 : 1024 };
      let p;
      try {
        p = await openSurface(route, vp, theme);
      } catch (e) {
        refused.push({ route, width, theme, why: String(e.message).split("\n")[0] });
        continue;
      }
      const found = await p.evaluate(
        ({ control, exempt, failAt, warnAt }) => {
          const out = [];
          for (const el of document.querySelectorAll(control)) {
            if (el.closest(exempt)) continue;
            const r = el.getBoundingClientRect();
            if (r.width < 8 || r.height < 8) continue;
            const cs = getComputedStyle(el);
            if (cs.visibility === "hidden" || cs.display === "none") continue;
            /*
             * A PERCENTAGE RADIUS IS NOT A PIXEL RADIUS, and `parseFloat` does
             * not know that. `border-radius: 26%` computes as the string
             * "26%", and parseFloat gives 26, which this then divided by a
             * 28px side and called 0.93: a capsule that does not exist. The
             * real figure is 26 per cent of 28, which is 7.3px and a ratio of
             * 0.26. `--nf-radius-squircle` is 26% and `--nf-radius-circle` is
             * 50%, so every icon plate and every avatar in the product was
             * being measured this way. It reports both ways: a percentage on a
             * small element invents a breach, and on a large one it hides one.
             * R1, measured on the home market tile's glyph plate.
             */
            const short = Math.min(r.width, r.height);
            if (short <= 0) continue;
            const rawRadius = cs.borderTopLeftRadius;
            const radius = rawRadius.includes("%")
              ? ((parseFloat(rawRadius) || 0) / 100) * short
              : parseFloat(rawRadius) || 0;
            const ratio = radius / short;
            if (ratio < warnAt) continue;
            /*
             * Text-bearing is the thing the law turns on, and it is asked of
             * the element rather than assumed from its class. An input has no
             * text node, so its value and its placeholder count as its text.
             *
             * AND SCREEN-READER-ONLY TEXT DOES NOT COUNT, WHICH R1 FOUND THE
             * HARD WAY. The sweep's one breach on the landing was a 44x44
             * search button at ratio 0.50, reported as a text-bearing capsule
             * because its label is `<span class="sm:sr-only">Search</span>`.
             * Nobody SEES that word. The element may well still be wrong, but
             * it is wrong under the icon-only clause, which has a different
             * test and a different fix, and filing it as a text breach sends
             * the reader to the wrong paragraph of the law. The shape law is
             * about what is drawn, so the text test has to be about what is
             * drawn too.
             */
            const hidden = (node) => {
              const cs = getComputedStyle(node);
              if (cs.display === "none" || cs.visibility === "hidden") return true;
              /* The sr-only recipe: clipped to nothing and taken out of flow. */
              const w = parseFloat(cs.width) || 0;
              const h = parseFloat(cs.height) || 0;
              if (cs.position === "absolute" && w <= 1 && h <= 1) return true;
              return cs.clipPath === "inset(50%)" || cs.clip === "rect(0px, 0px, 0px, 0px)";
            };
            const visibleText = (node) => {
              let out = "";
              for (const child of node.childNodes) {
                if (child.nodeType === Node.TEXT_NODE) out += child.nodeValue;
                else if (child.nodeType === Node.ELEMENT_NODE && !hidden(child)) {
                  out += visibleText(child);
                }
              }
              return out;
            };
            const text = (
              el.value ||
              el.getAttribute("placeholder") ||
              visibleText(el) ||
              ""
            ).replace(/\s+/g, " ").trim();
            const label = el.className && typeof el.className === "string" ? el.className.split(/\s+/).slice(0, 3).join(".") : el.tagName.toLowerCase();
            out.push({
              tag: el.tagName.toLowerCase(),
              label,
              text: text.slice(0, 40),
              hasText: text.length > 0,
              w: Math.round(r.width),
              h: Math.round(r.height),
              radius: Math.round(radius * 10) / 10,
              ratio: Math.round(ratio * 100) / 100,
              capsule: ratio >= failAt,
            });
          }
          return out;
        },
        { control: CONTROL_SELECTOR, exempt: SHAPE_EXEMPT, failAt: FAIL_AT, warnAt: WARN_AT },
      );
      await p.close();
      for (const f of found) {
        findings.push({ route, width, theme, ...f });
        if (f.hasText && f.ratio > worst) worst = f.ratio;
      }
     }
    }
  }
  await browser.close();
  const breaches = findings.filter((f) => f.hasText && f.capsule);
  const watch = findings.filter((f) => f.hasText && !f.capsule);
  const roundIcons = findings.filter((f) => !f.hasText && f.capsule);
  if (JSON_OUT) {
    console.log(JSON.stringify({ breaches, watch, roundIcons, refused }, null, 2));
  } else {
    console.log(
      `shape sweep: ${routes.join(", ")} at ${widths.join("px, ")}px in ${THEMES.join(" and ")}\n`,
    );
    const line = (f) =>
      `  ${f.route} @${f.width} ${f.theme}  ${f.label}  "${f.text}"  ${f.w}x${f.h}  radius ${f.radius}px  ratio ${f.ratio.toFixed(2)}`;
    console.log(`BREACHES, a text-bearing control drawn as a capsule (ratio at or above ${FAIL_AT}): ${breaches.length}`);
    breaches.forEach((f) => console.log(line(f)));
    console.log(`\nWORTH AN EYE, text-bearing and over ${WARN_AT} but not yet a capsule: ${watch.length}`);
    watch.forEach((f) => console.log(line(f)));
    console.log(`\nROUND ICON-ONLY CONTROLS, allowed only where a governing image draws them round: ${roundIcons.length}`);
    roundIcons.forEach((f) => console.log(line(f)));
    console.log(
      `\nROUTES REFUSED, so nothing is claimed about them either way: ${refused.length}`,
    );
    refused.forEach((r) => console.log(`  ${r.route} @${r.width} ${r.theme}: ${r.why}`));
    const opened = new Set(findings.map((f) => `${f.route}|${f.width}|${f.theme}`)).size;
    console.log(
      `\nCOVERED: ${routes.length} route(s) asked for, ${refused.length} refusal(s), ` +
        `${opened} route/width/theme combination(s) actually measured.`,
    );
    console.log(
      `\n${breaches.length === 0 ? "no text-bearing control is a capsule." : `${breaches.length} text-bearing control(s) are capsules. The shape law is broken here.`}`,
    );
  }
  process.exit(breaches.length === 0 ? 0 : 1);
}

/* The colour checks below compare our pixels against hexes sampled out of the
   governing PNGs, and every one of those renders is a DARK render, so a light
   run would be measuring our paper twin against night targets. `--theme light`
   is therefore honest for `--shape-sweep` and for `--scan`, and for the colour
   checks it is refused rather than quietly reporting nonsense. */
if (!SCAN && !FALLOFF && THEMES[0] !== "dark") {
  console.error(
    "the colour checks compare against hexes sampled from the governing renders, which are all dark.\n" +
      "Run them with --theme dark. --theme light and --theme both are for --shape-sweep and --scan.",
  );
  process.exit(2);
}
const page = await openSurface(
  SCAN || FALLOFF ? arg("url", surface.url) : surface.url,
  surface.viewport,
  THEMES[0],
);
/* `let`, because a check whose element is below the fold scrolls the page
   and the shot has to be retaken. See `ensureInView`. */
let sample = await sampler(page);

/*
 * THE GLOW, AS A CURVE, BECAUSE ONE SAMPLE CANNOT TELL A RADIUS FROM A SPREAD.
 *
 * `sample-reference.mjs` walks rightward from the primary button's edge in the
 * governing PNG and prints the series. This walks the SAME line on our own
 * page, off a production screenshot, so the two curves can be laid beside each
 * other. The founder's ruling was that ours is "hotter, wider and more
 * saturated", and every word of that is a statement about the SHAPE of this
 * series rather than about any one number in it.
 *
 * It prints a blue EXCESS alongside the hex: b - (r + g) / 2. Both walks cross
 * a photograph, and a twilight sky is itself blue, so the raw channel says
 * little; what the glow adds is the excess above whatever the ground already
 * carries, and the distance at which that excess returns to the ground is how
 * wide the glow is.
 *
 *   node scripts/design/compare-surface.mjs --base ... --surface landing \
 *     --falloff ".nf-landing-hero .nf-btn--primary"
 */
if (FALLOFF) {
  const rect = await page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  }, FALLOFF);
  if (!rect) { console.error(`falloff: no element matches ${FALLOFF}`); process.exit(2); }
  const edge = rect.x + rect.w;
  const to = Number(arg("reach", "58"));
  const step = Number(arg("step", "2"));
  const y = rect.y + rect.h / 2;
  const series = [];
  for (let d = -4; d <= to; d += step) {
    const rgb = await sample(edge + d, y, 3);
    const excess = Math.round(rgb[2] - (rgb[0] + rgb[1]) / 2);
    series.push({ d, hex: hex(rgb), rgb, excess });
  }
  await browser.close();
  if (JSON_OUT) {
    console.log(JSON.stringify({ selector: FALLOFF, edge: Math.round(edge), y: Math.round(y), series }, null, 2));
  } else {
    console.log(`falloff: ${FALLOFF} at ${BASE}${arg("url", surface.url)}`);
    console.log(`right edge at x=${Math.round(edge)}, walking rightward at y=${Math.round(y)}\n`);
    console.log("  d(px)  colour    rgb                blue excess over the local ground");
    for (const p of series) {
      const bar = "#".repeat(Math.max(0, Math.min(60, Math.round(p.excess / 3))));
      console.log(`  ${String(p.d).padStart(4)}   ${p.hex}  rgb(${p.rgb.join(" ").padEnd(11)})  ${String(p.excess).padStart(4)}  ${bar}`);
    }
  }
  process.exit(0);
}

if (SCAN) {
  const axis = arg("axis", "x");
  /* In view before the rect is read, for the reason set out on the clamp: a
     scan of an element below the fold used to print the bottom row of the
     screen over and over and look like a perfectly flat surface. That is what
     "a scan down the chip finds no distinct edge row at all" was. W2. */
  if (await ensureInView(page, SCAN)) {
    await page.waitForTimeout(400);
    sample = await sampler(page);
  }
  const rect = await page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  }, SCAN);
  if (!rect) { console.error(`scan: no element matches ${SCAN}`); process.exit(2); }
  console.log(`scan ${SCAN}  box ${Math.round(rect.w)}x${Math.round(rect.h)} at ${Math.round(rect.x)},${Math.round(rect.y)}`);
  for (let f = 0; f <= 1.0001; f += 0.05) {
    const x = axis === "x" ? rect.x + rect.w * f : rect.x + rect.w / 2;
    const y = axis === "x" ? rect.y + rect.h / 2 : rect.y + rect.h * f;
    const got = await sample(x, y, 3);
    console.log(`  ${axis}=${f.toFixed(2)}  ${got ? hex(got) : "off the screenshot, not read"}`);
  }
  await browser.close();
  process.exit(0);
}

const readRect = (page, selector) =>
  page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  }, selector);

const rows = [];
for (const check of surface.checks) {
  /*
   * IN VIEW FIRST, THEN THE RECT, THEN THE SHOT. W2, and the order matters:
   * scrolling changes every rect on the page, so a rect read before the
   * scroll names a place the element is no longer standing.
   */
  if (await ensureInView(page, check.selector)) {
    await page.waitForTimeout(400);
    sample = await sampler(page);
  }
  const rect = await readRect(page, check.selector);
  if (!rect || rect.w === 0) {
    rows.push({ ...check, got: null, delta: null, pass: false, why: "no element matches, or it draws nothing" });
    continue;
  }
  let x, y;
  if (check.at === "top-border") {
    x = rect.x + rect.w / 2;
    y = rect.y + 0.5;
  } else if (check.at === "bottom-border") {
    /* The last row of the element's own box. A header that draws no hairline
       reads as whatever is behind it; one that draws a hairline reads as the
       hairline, which is the whole question the reference settles. */
    x = rect.x + rect.w / 2;
    y = rect.y + rect.h - 0.5;
  } else {
    x = rect.x + rect.w * check.at.fx;
    y = rect.y + rect.h * check.at.fy;
  }
  const got = await sample(x, y, check.box ?? 3);
  if (!got) {
    /* The sampler refuses a point outside the shot rather than clamping it
       onto the edge of the screen and returning a colour from somewhere
       else. See the long note on the clamp. */
    rows.push({
      ...check,
      got: null,
      delta: null,
      pass: false,
      why: "the sample point is off the screenshot, so no colour was read",
    });
    continue;
  }
  const want = parse(check.want);
  const delta = Math.max(...got.map((v, i) => Math.abs(v - want[i])));
  rows.push({ ...check, got: hex(got), delta, pass: delta <= check.tol, why: null });
}

const shapes = [];
for (const s of surface.shapes ?? []) {
  const drawn = await page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    /* Percentages, for the reason spelled out in the sweep above. */
    const raw = getComputedStyle(el).borderTopLeftRadius;
    const short = Math.min(r.width, r.height);
    const radius = raw.includes("%") ? ((parseFloat(raw) || 0) / 100) * short : parseFloat(raw) || 0;
    return { radius, short };
  }, s.selector);
  if (!drawn) { shapes.push({ ...s, ratio: null, pass: false }); continue; }
  const ratio = drawn.short > 0 ? drawn.radius / drawn.short : 0;
  shapes.push({ ...s, radius: drawn.radius, short: drawn.short, ratio, pass: ratio <= s.maxRatio });
}

await browser.close();

if (JSON_OUT) {
  console.log(JSON.stringify({ surface: SURFACE, url: surface.url, rows, shapes }, null, 2));
} else {
  console.log(`surface: ${SURFACE}  ${BASE}${surface.url}  (${surface.note})`);
  console.log(`viewport: ${surface.viewport.width}x${surface.viewport.height} at 2x\n`);
  const pad = Math.max(...rows.map((r) => r.name.length));
  for (const r of rows) {
    const mark = r.pass ? "ok  " : "MISS";
    const got = r.got ?? "-------";
    const d = r.delta === null ? "  -" : String(r.delta).padStart(3);
    console.log(`${mark} ${r.name.padEnd(pad)}  ours ${got}  reference ${r.want}  worst channel ${d}  (${r.why ?? r.from})`);
  }
  if (shapes.length) {
    console.log("\nshape, as a ratio of the drawn radius to the drawn short side. 0.5 is a capsule.");
    for (const s of shapes) {
      const mark = s.pass ? "ok  " : "MISS";
      console.log(
        s.ratio === null
          ? `${mark} ${s.name}  no element`
          : `${mark} ${s.name}  radius ${s.radius}px on a ${Math.round(s.short)}px side = ${s.ratio.toFixed(2)}  (must be at or under ${s.maxRatio})`,
      );
    }
  }
  const bad = rows.filter((r) => !r.pass).length + shapes.filter((s) => !s.pass).length;
  console.log(`\n${bad === 0 ? "all checks match the reference." : `${bad} check(s) do not match the reference.`}`);
}
process.exit(0);
