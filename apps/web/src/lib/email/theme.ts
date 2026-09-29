/**
 * The Vallo email theme: one palette, one set of measurements, two consumers.
 *
 * WHY THIS FILE IS THE ONE PLACE RAW HEX IS CORRECT.
 *
 * `packages/design-tokens/src/tokens.css` is the design system, and everywhere
 * else in this product a colour is a CSS custom property read from it. Email is
 * the exception, and it is not a style preference. Gmail's web client strips
 * `:root` custom property declarations, Outlook's Word engine never supported
 * them, and `var()` with no fallback resolves to nothing, which paints text the
 * same colour as its background. So an email carries literal hex, inline, on
 * the element.
 *
 * This file is where those literals are resolved from the tokens ONCE, with the
 * token each one came from named beside it. A future reader who sees hex in
 * `render.ts` or in `scripts/build-auth-emails.mjs` should not "fix" it into a
 * custom property: it would silently break every message. Change a value here,
 * and change it in tokens.css, and the parity test in `shell.test.ts` will tell
 * you if the auth generator has drifted away from both.
 *
 * TWO CONSUMERS, AND WHY THEY ARE NOT ONE MODULE.
 *
 *   1. `render.ts`, the transactional shell, imports this directly.
 *   2. `scripts/build-auth-emails.mjs`, which generates the five Supabase auth
 *      templates, mirrors these literals. It is a plain Node script that runs
 *      outside the Next build with no TypeScript loader, so it cannot import a
 *      `.ts` module. `shell.test.ts` reads the generator and the generated HTML
 *      as text and fails when a value there is not a value here, which is the
 *      guard that makes the duplication safe rather than merely tolerated.
 */

/**
 * DARK IN THE LAYER EVERY CLIENT HONOURS.
 *
 * The product is dark by default and the operating system does not override
 * it (BUILD_06 rule 7). The email follows the product: the inline styles, the
 * one layer no mail client strips, carry the navy ground, the glass card and
 * the white type of the sign-in render, so the first message anybody gets from
 * Vallo is the same object as the screen it sends them to.
 *
 * WHAT MAKES A DARK EMAIL SAFE, since the previous edition of this file argued
 * it was not. The failure it feared is a client that keeps the light text and
 * drops the dark background, which happens when the background lives only on
 * `<body>`. So the ground here is painted three times over, on the body, on
 * the outer table as a `bgcolor` attribute (the one form Outlook's Word engine
 * has honoured since 2007) and on the card cell, and every text colour is
 * inline beside the background it sits on. A client that strips the `<style>`
 * block loses nothing, because the block carries no layout and no legibility:
 * it only re-asserts this same palette under `prefers-color-scheme: dark`.
 *
 * AND THAT BLOCK IS NOT WHAT HOLDS GMAIL, WHICH THIS COMMENT USED TO CLAIM.
 * Gmail strips `@media (prefers-color-scheme: ...)` entirely and runs its own
 * dark-mode pass regardless of what the message declares, so the media query
 * reaches Apple Mail, iOS Mail and a handful of others and never reaches the
 * client most of this product's readers use. The inline layer above is the
 * only load bearing one. The query is kept because it is free and it helps the
 * clients that do honour it, and an `[data-ogsc]` twin is kept beside it for
 * Outlook.com, which strips standard media queries in webmail and rewrites
 * these same classes. Neither is leaned on.
 *
 * Every value is a token rung. No invented navy, no invented grey.
 */
export const DARK = {
  /** The ground behind the card. --nf-ink-950. */
  ground: "#010118",
  /** The glass card, one rung lighter than the ground. --nf-ink-850. */
  card: "#000030",
  /** Inset panels: the code box, the receipt rows, the note. --nf-ink-800. */
  panel: "#000040",
  /**
   * Hairlines inside the card: row rules and panel borders.
   *
   * RE-DERIVED 22 SEPTEMBER, from `#101A55` at 231.3 degrees, by the same
   * rotation as the rim. At this lightness eight bits cannot land exactly on
   * the family angle: it draws at 214.8, which is half a degree out and
   * invisible on a one pixel hairline.
   */
  edge: "#102D55",
  /**
   * The card's rim: the lit edge that reads as glass on the sign-in render.
   * One blue, between --nf-electric-600 and the hairline, bright enough to be
   * a rim and dark enough not to compete with the button.
   *
   * RE-DERIVED 22 SEPTEMBER. It was `#2743C4`, which sat on 229.3 degrees of
   * hue: the retired violet family. It has no token of its own, so it was
   * rotated onto the family's measured 215.2 degrees with its saturation and
   * lightness untouched, which is the same rotation that took the tokens
   * themselves off violet. See the note above GLOW.
   */
  rim: "#2768C4",
  /** Headings and the strong values. */
  text: "#FFFFFF",
  /** Body copy. 12.9:1 on the card, measured. */
  body: "#C6CDF2",
  /** Small print and row labels. 5.8:1 on the card, 5.6:1 on the panel. */
  muted: "#7C86C2",
} as const;

/**
 * THE READING SURFACE IS LIGHT, UNDER A NAVY BRAND BAND (29 September 2026).
 *
 * The founder references of 29 September (`docs/design/references/2026-09-29/`,
 * plate 05) set the pattern for a light surface: a deep navy block at the top
 * carrying the brand, light surfaces below it for reading. Every message now
 * follows it. The inline layer, the only one every client keeps, is this light
 * palette; the `DARK` palette above is re-asserted over it by
 * `prefers-color-scheme: dark` for the clients that honour the query (Apple
 * Mail, iOS Mail, and others), so a reader in dark mode gets the designed
 * night rather than a client's guess.
 *
 * WHY LIGHT IS THE INLINE LAYER AND NOT DARK. A client that cannot be told
 * what to do in dark mode (Gmail's apps, which strip the media query and run
 * their own inversion) inverts what it is given. Inverting a light message
 * gives a dark one that still reads, because every text colour here sits well
 * inside AA on its own ground and so does its inverse. Inverting the old dark
 * message gave a light one whose small print measured 4.1:1, under AA; the
 * rendering sweep of 28 September measured that on every template.
 *
 * Every value is the light theme's own token (`:root[data-theme="light"]` in
 * tokens.css), named beside it, except the hairline, which is
 * `--nf-border-default` (11 13 23 at 12%) flattened onto white, because a mail
 * client has no alpha compositing it can be trusted with.
 */
export const LIGHT = {
  /** The ground around the card. --nf-surface-raised (light). */
  ground: "#F3F5F8",
  /** The card. --nf-surface-primary (light). */
  card: "#FFFFFF",
  /** Inset panels: the rows table, the code box. --nf-surface-secondary (light). */
  panel: "#F6F7F9",
  /** Hairlines: panel borders and row rules. --nf-border-default on white. */
  edge: "#E2E2E3",
  /** Headings and strong values. --nf-content-primary (light). 19.4:1 on the card. */
  text: "#0B0D17",
  /** Body copy. --nf-content-secondary (light). 11.0:1 on the card. */
  body: "#363C4A",
  /** Small print and row labels. --nf-content-muted (light). 6.1:1 on the card, 5.6:1 on the ground. */
  muted: "#5A6273",
} as const;

/**
 * The brand band's navy: `--nf-ink-950`, the same ground as the dark palette,
 * so the band and a dark-mode card are one family.
 */
export const HEADER = DARK.ground;

/** `--nf-brand-primary` (light). The button fill on a light surface. White on it measures 5.5:1. */
export const BRAND = "#005FE8";

/** The light button's gradient: `--nf-gradient-cta` (light), over `BRAND` as its solid fallback. */
export const GRADIENT_LIGHT = `linear-gradient(180deg,#0A6CF5 0%,${BRAND} 100%)`;

/** `--nf-brand-quiet` (light). Links and the brand as text on a light surface: 7.0:1 on the card, 6.4:1 on the ground. */
export const LINK = "#0050C8";

/**
 * THE LOCKUP ON ITS OWN NAVY, AS ONE PICTURE (29 September 2026).
 *
 * The brand band is painted navy three ways (a `bgcolor`, an inline colour and
 * a flat gradient image, which some clients leave alone when they invert). A
 * client that inverts it anyway turns the band pale, and a lockup drawn on
 * transparency would then sit light blue on pale grey. So the lockup is a
 * single image that carries its own navy tile, rounded, generated by
 * `scripts/build-email-lockup.mjs` from the two brand files. Mail clients do
 * not invert pictures, so whatever happens to the band the lockup stays the
 * brand on navy: on the band it is seamless, on an inverted band it reads as a
 * navy badge.
 *
 * It is the brand name, so its alt is the brand name: with images blocked the
 * reader sees "Vallo" once, in white on the navy band.
 */
export const LOCKUP_PATH = "/brand/vallo-email-lockup.png";
export const LOCKUP_WIDTH = 198;
export const LOCKUP_HEIGHT = 56;

/**
 * `--nf-electric-400`. The brand blue.
 *
 * THE WHOLE BLUE FAMILY WAS RE-DERIVED FROM THE LIVE TOKENS ON 22 SEPTEMBER,
 * AND THIS IS THE NOTE THAT SAYS WHY, BECAUSE IT WILL HAPPEN AGAIN OTHERWISE.
 *
 * The accent ramp was rotated onto a measured hue of 215.2 degrees on 19
 * September and `tokens.css` records the reason at `:1611`: the old value was
 * "a different and more violet blue". These email literals were baked BEFORE
 * that rotation, so for three days every message this product sent was drawn
 * in a blue the product itself had retired, and nothing could see it: an email
 * cannot read a custom property, so the two copies of the fact had no test
 * between them.
 *
 * The derivation is not a fresh choice of colour. Rotating each old email blue
 * onto 215.2 degrees, saturation and lightness untouched, reproduces the live
 * token EXACTLY:
 *
 *   GLOW      #0C39EF (228.1 deg) -> #0C6AEF == --nf-electric-400
 *   ELECTRIC  #0010D0 (235.4 deg) -> #0056D0 == --nf-electric-600
 *   SKY       #5C7CFF (228.2 deg) -> #5C9FFF == --nf-brand-quiet
 *
 * which is the proof that this palette and the screen palette were always the
 * same colours, and that only the rotation was missed here.
 *
 * `shell.test.ts` now READS `packages/design-tokens/src/tokens.css` and fails
 * when these three stop matching it. That test is the point of the exercise: a
 * duplicated fact with no test between the copies is a fact that WILL be half
 * updated, and this palette is the proof.
 *
 * WHAT THE ROTATION COST, STATED PLAINLY. As a FILL, white on GLOW measured
 * 7.38:1 on the old violet and measures 4.86:1 now, because the family angle
 * is a lighter blue at the same saturation. It clears the 4.5:1 normal-text
 * threshold and nothing in this system sets small text on brand blue, so the
 * button label is compliant, but it is a real loss and it is recorded rather
 * than rounded away.
 *
 * As TEXT on the navy card GLOW went the other way, 2.73:1 to 4.15:1, which
 * is the improvement `tokens.css:137` was rotated FOR and measures here within
 * rounding of the 2.75 and 4.18 it records. It still misses 4.5:1, so a link
 * or a brand word set in blue goes on using SKY below, which improved from
 * 5.55:1 to 7.54:1. One blue family, two depths.
 */
export const GLOW = "#0C6AEF";
/** `--nf-electric-600`. The foot of the button gradient. Was `#0010D0`. */
export const ELECTRIC = "#0056D0";
/**
 * `--nf-brand-quiet`. The luminous highlight in the cap rule, and the brand
 * blue as text: 7.5:1 on the card, 7.3:1 on the panel, both measured. Also the
 * first stop of `--nf-gradient-brand`. Was `#5C7CFF`.
 */
export const SKY = "#5C9FFF";

/**
 * The primary action's gradient.
 *
 * Always paired with `background-color:${GLOW}` declared FIRST at every call
 * site. Outlook's Word engine drops `background-image` and keeps the colour, so
 * the fallback is a solid brand-blue button with white text rather than white
 * text on nothing.
 *
 * The middle stop has no token of its own and was `#0621E8` at 232.8 degrees.
 * It was rotated onto the family's 215.2 with the rest of the ramp, and it
 * lands between GLOW and ELECTRIC on every channel, which is what a middle
 * stop has to do.
 */
export const GRADIENT = `linear-gradient(135deg,${GLOW} 0%,#0664E8 55%,${ELECTRIC} 100%)`;

/** The luminous rule capping the card, brightest at its centre. */
export const GRADIENT_CAP = `linear-gradient(90deg,${ELECTRIC} 0%,${GLOW} 28%,${SKY} 50%,${GLOW} 72%,${ELECTRIC} 100%)`;

/** System stack only. A web font in an email is a request that will not load. */
export const FONT_SANS =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
export const FONT_MONO = "'SFMono-Regular',Consolas,'Liberation Mono',Menlo,monospace";

/**
 * MEASUREMENTS.
 *
 * 600 is the number every email design converges on, and not by accident: it is
 * what the Outlook desktop reading pane fits without a horizontal scrollbar at
 * the default window size. Below that the table is fluid, so it reads on a
 * 360px Android screen, which is the screen most of this product's readers have.
 */
export const MAX_WIDTH = 600;

/** Card padding. Generous, because the brief is one clear action per message. */
export const PAD_X = 40;

/**
 * THE LOCKUP: the glass mark beside the wordmark, both hosted from the site
 * origin under /brand, both with an explicit box so a blocked image reserves
 * exactly its own space rather than collapsing the line.
 *
 * The mark (614x587) carries no words and is decorative, so its alt is empty.
 * The wordmark (758x167) IS the word, so its alt is the brand name: with
 * images off the reader sees "Vallo" once, in its place, rather than twice or
 * not at all.
 */
export const MARK_PATH = "/brand/vallo-mark.png";
export const MARK_WIDTH = 42;
export const MARK_HEIGHT = 40;
export const WORDMARK_PATH = "/brand/vallo-wordmark.png";
export const WORDMARK_WIDTH = 118;
export const WORDMARK_HEIGHT = 26;
export const WORDMARK_ALT = "Vallo";

/**
 * The one sign-off, in both renderings and in all five auth templates.
 *
 * IT IS THE BRAND AND NOT A CLAIM, from 22 September. It read "Vallo. Real
 * Estate reimagined!", which was the retired positioning and which was still
 * riding the foot of every message this platform sends: a booking
 * confirmation, a receipt, a confirmation code. The same line was removed
 * from the auth screen in this commit and from the landing page before it,
 * and leaving it in the mail would have meant the only place a person still
 * met the old positioning was the one surface nobody thinks to audit.
 *
 * A transactional email's last line should say who sent it, which the legal
 * line below already does, and nothing else. It does not need a claim, and a
 * claim that tells the reader nothing is worse than no claim.
 *
 * It stays identical in every locale, the way a wordmark is. It cannot import
 * from `packages/i18n` because the email renderer is dependency-free by
 * design, so `scripts/build-auth-emails.mjs` carries the same literal and
 * `shell.test.ts` asserts the two are equal.
 */
export const SIGN_OFF = "Vallo";

/**
 * The legal line under the sign-off.
 *
 * The brand is Vallo everywhere a person reads it; the company name appears
 * only on legal surfaces, and the foot of a transactional email is one: it is
 * the line that says who sent the message. Mirrors COMPANY_LEGAL_NAME in
 * `lib/legal/company.ts`, duplicated here for the same dependency-free reason
 * as the slogan, and asserted equal in shell.test.ts.
 *
 * THE RC NUMBER IS ON IT FROM 22 SEPTEMBER, because the company is now
 * incorporated and this is the line that says who sent the message. A
 * transactional email from a company that exists says which company that is;
 * it stood without one for the four days between the application going in and
 * the certificate being issued, which was correct for those four days.
 *
 * `shell.test.ts` now asserts that whenever `COMPANY_RC_NUMBER` is non-null
 * this line CONTAINS it, so the three copies of this string cannot drift apart
 * again silently. That assertion is the point: a duplicated fact with no test
 * between the copies is a fact that will be half updated.
 */
export const LEGAL_LINE = "VALLO SPACES LTD (RC 9870413), Abuja, Nigeria";
