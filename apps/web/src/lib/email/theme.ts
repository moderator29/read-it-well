/**
 * The RentMe email theme: one palette, one set of measurements, two consumers.
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
 * LIGHT FIRST, AND THIS IS THE DECISION THAT MATTERS MOST.
 *
 * The product is dark by default. Its email is not, and inverting that on
 * purpose is the single most important thing in this file.
 *
 * A mail client is not a browser. Some honour a `<style>` block, some strip it,
 * some apply their own inversion to a palette they did not design, and Outlook
 * renders through Word. A dark email that half renders is black text on a black
 * card: not ugly, unreadable, and unreadable in exactly the message that
 * carries a sign-in code or a receipt. A light email that half renders is a
 * light email.
 *
 * So the inline styles, the layer every client honours, carry these values, and
 * the dark set below is an enhancement applied only where a media query works.
 */
export const LIGHT = {
  /** The paper behind the card. Daylight equivalent of --nf-surface-canvas. */
  base: "#F4F5FB",
  /** The card itself. */
  card: "#FFFFFF",
  /** Hairlines, panel borders, row rules. */
  edge: "#DEE1F0",
  /** Inset panels: receipt rows, the code box. */
  panel: "#F7F8FD",
  /** Headings. Near-black with the brand's navy in it, not pure black. */
  text: "#0A0A1F",
  /** Body copy. 9.4:1 on white. */
  body: "#3B4166",
  /** Small print and row labels. 4.8:1 on white, so it clears AA at 12px. */
  muted: "#6B7194",
} as const;

/**
 * The dark set, applied only through `prefers-color-scheme: dark`.
 *
 * Sampled from the artwork the product has used since its first screen:
 * --nf-ink-950 canvas, --nf-electric family glow. The same message must read as
 * the same brand in either inbox, which is why these are the daylight values'
 * counterparts rather than an independently invented dark theme.
 */
export const DARK = {
  /** --nf-ink-950 */
  base: "#010118",
  card: "#030327",
  edge: "#101A55",
  panel: "#060640",
  text: "#FFFFFF",
  body: "#C6CDF2",
  /** 5.6:1 on the dark card. */
  muted: "#7C86C2",
} as const;

/** --nf-electric-400. The brand blue, identical in both schemes. */
export const GLOW = "#0C39EF";
/** --nf-electric-600. The foot of the button gradient. */
export const ELECTRIC = "#0010D0";
/** --nf-electric-300. The luminous highlight in the header rule. */
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

/** The logo mark. Square, explicit width and height, so a blocked image
 * reserves exactly its own box rather than collapsing the lockup. */
export const LOGO_SIZE = 40;

/** The one sign-off, in both renderings and in all five auth templates. */
export const SIGN_OFF = "RentMe. Find it. Rent it. Love it.";
