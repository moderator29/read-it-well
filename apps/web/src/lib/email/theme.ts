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
 * it only re-asserts this same palette under `prefers-color-scheme: dark`,
 * which is what stops Gmail's own dark-mode pass recolouring a palette it did
 * not design.
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
  /** Hairlines inside the card: row rules and panel borders. */
  edge: "#101A55",
  /**
   * The card's rim: the lit edge that reads as glass on the sign-in render.
   * One blue, between --nf-electric-600 and the hairline, bright enough to be
   * a rim and dark enough not to compete with the button.
   */
  rim: "#2743C4",
  /** Headings and the strong values. */
  text: "#FFFFFF",
  /** Body copy. 12.9:1 on the card. */
  body: "#C6CDF2",
  /** Small print and row labels. 5.6:1 on the card, 5.2:1 on the panel. */
  muted: "#7C86C2",
} as const;

/**
 * --nf-electric-400. The brand blue.
 *
 * As a FILL it is the button, the cap rule and the footer dash, and white on
 * it reads at 7:1. As TEXT on the navy card it measures only 2.7:1, which fails
 * even the relaxed large-text threshold, so any link or brand word set in blue
 * uses SKY below instead. One blue family, two depths.
 */
export const GLOW = "#0C39EF";
/** --nf-electric-600. The foot of the button gradient. */
export const ELECTRIC = "#0010D0";
/**
 * The luminous highlight in the cap rule and the brand blue as text: 5.5:1 on
 * the card, 5.2:1 on the panel. The first stop of --nf-gradient-brand.
 */
export const SKY = "#5C7CFF";

/**
 * The primary action's gradient.
 *
 * Always paired with `background-color:${GLOW}` declared FIRST at every call
 * site. Outlook's Word engine drops `background-image` and keeps the colour, so
 * the fallback is a solid brand-blue button with white text rather than white
 * text on nothing.
 */
export const GRADIENT = `linear-gradient(135deg,${GLOW} 0%,#0621E8 55%,${ELECTRIC} 100%)`;

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
 * An email ends with the brand making one claim, and this is the one. The
 * slogan is deliberately identical in every locale, the way a wordmark is;
 * see `landing.slogan` in packages/i18n. It cannot import from there because
 * the email renderer stays dependency-free by design, so the string is
 * duplicated knowingly and this comment is the tie between the two.
 */
export const SIGN_OFF = "Vallo. Real Estate reimagined!";

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
