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
 * DARK, IN THE LAYER EVERY CLIENT HONOURS (29 September 2026, founder ruling).
 *
 * "Every email must be dark mode, beautiful like our system dark mode, not
 * light mode." So the inline layer, the one layer no mail client strips, IS
 * the dark palette: navy ground, a deep navy card with a hairline edge, white
 * headings and the product's own mist inks. The light reading surface of the
 * morning of 29 September is retired, and with it the `LIGHT` palette and the
 * light link blue; nothing paints light any more.
 *
 * WHAT MAKES A DARK EMAIL SAFE. The failure to fear is a client that keeps the
 * light text and drops the dark ground, which happens when the ground lives
 * only on `<body>`. So the ground is painted on the body, on every table and
 * on every cell, as a `bgcolor` attribute (the form Outlook's Word engine has
 * honoured since 2007) AND an inline `background-color` (`paintExplicit` in
 * render.ts makes that true of every cell), and every text colour is inline
 * beside the ground it sits on.
 *
 * AND THE CLIENTS THAT RUN THEIR OWN DARK PASS. Gmail strips the media query.
 * Its Android app and Outlook leave an already dark message alone; its iOS
 * app may invert it all the way to light. The palette is chosen so that even
 * that worst case reads: every ink here clears AA against its ground as
 * written AND after `invert(1) hue-rotate(180deg)`, which is why the body and
 * muted inks moved onto the product's own mist rungs (the old `#7C86C2` small
 * print fell to 4.1:1 inverted). `email-dark-paint.test.ts` measures every
 * pair in every message, both ways, on every commit.
 *
 * Every value is a token rung of the product's dark theme, named beside it.
 */
export const DARK = {
  /** The ground behind the card. --nf-ink-950 (and --nf-surface-artwork). */
  ground: "#010118",
  /** The card, one rung lighter than the ground. --nf-ink-850 (--nf-surface-secondary). */
  card: "#000030",
  /** Inset panels: the code box, the receipt rows, the note. --nf-ink-800 (--nf-surface-elevated). */
  panel: "#000040",
  /**
   * Hairlines inside the card: row rules, panel borders and the card's own
   * edge. `#101A55` rotated onto the family's 215.2 degrees (22 September);
   * eight bits land it at 214.8, invisible on a one pixel line.
   */
  edge: "#102D55",
  /**
   * The lit rim: the edge that reads as glass on the sign-in render, drawn
   * along the top of the brand band. Rotated onto the family hue on 22
   * September from the retired violet `#2743C4`.
   */
  rim: "#2768C4",
  /** Headings and the strong values. --nf-mist-100 (--nf-content-primary). */
  text: "#FFFFFF",
  /** Body copy. --nf-mist-300 (--nf-content-secondary). 15.1:1 on the card, 15.1:1 inverted. */
  body: "#D5DEFF",
  /** Small print and row labels. --nf-mist-500 (--nf-content-muted). 7.4:1 on the card, 5.6:1 inverted. */
  muted: "#8E9CC4",
} as const;

/**
 * WHITE IN LIGHT MODE, AND THE DARK SHELL ONLY WHEN THE READER IS IN DARK
 * (founder directive D23, 6 October 2026, superseding the dark-everywhere
 * ruling of 29 September above for the INLINE layer).
 *
 * "In light mode every email is a white background. No grey wash, no dark
 * card on light. Receipts, statements and anything that is a document follow
 * the Paper register." So the layer no client strips is now this palette:
 * a white ground, a white card with one hairline edge, the document inks.
 * The DARK palette above is unchanged and is what the style block repaints
 * to under `prefers-color-scheme: dark` (and what Outlook.com's dark pass is
 * pointed back at), so a reader whose mail is dark still gets the product's
 * own night, never a client's guess at one. The five Supabase auth templates
 * are generated by `scripts/build-auth-emails.mjs` and still paint DARK
 * inline until that generator is moved onto this palette (W9 report, R-24).
 *
 * TWO REGISTERS ON ONE PALETTE (north star 16.5, Stage 9):
 *
 *   shell   notification and lifecycle mail. White here; in a dark-mode
 *           client the ground, the card and every ink flip to DARK by class
 *           (`rm-base`, `rm-card`, `rm-panel`, `rm-title`, `rm-body`,
 *           `rm-muted`, `rm-link`).
 *   paper   money and document mail, and every receipt. White here; in a
 *           dark-mode client the GROUND goes navy and the card stays paper
 *           (`rm-sheet`, `rm-sheet-panel`, `rm-ink`, `rm-ink-body`,
 *           `rm-ink-muted`, `rm-ink-link`), which is D28.1's document sheet
 *           on the dark desk, said in email.
 *
 * Every value is a document token from tokens.css, resolved to hex over the
 * white sheet, named beside it. Every ink clears AA on white as written AND
 * after Gmail's `invert(1) hue-rotate(180deg)`; `email-dark-paint.test.ts`
 * measures every pair in every message, both ways, plus the dark scheme.
 */
export const LIGHT = {
  /** The ground: white, with no wash. --nf-doc-bg. */
  ground: "#FFFFFF",
  /** The card: the same white, bounded by its hairline. --nf-doc-bg. */
  card: "#FFFFFF",
  /** Inset panels (the code, the callout). --nf-doc-bg-inset. */
  panel: "#F4F6FA",
  /** Hairlines and the card's one edge. --nf-doc-hairline (ink at 10%) over white. */
  edge: "#E6E6E8",
  /** The lit rim, kept as the brand rule under the header. The family blue. */
  rim: "#0C6AEF",
  /** Headings, figures, strong values. --nf-doc-ink. 20.6:1 on white. */
  text: "#010118",
  /** Body copy. --nf-doc-ink-muted (68%) over white. 7.6:1. */
  body: "#525262",
  /** Small print and row labels. --nf-doc-ink-faint (56%) over white. 4.8:1, on white only. */
  muted: "#71717E",
} as const;

/**
 * The brand blue as text on paper: `--nf-doc-accent`, the light theme's
 * solid primary. 5.5:1 on white.
 */
export const LINK = "#005FE8";

/**
 * The three state inks a document carries (--nf-doc-success, --nf-doc-
 * attention, --nf-doc-error). Each is said beside a word and a shape, never
 * alone: the palette is one hue and colour may not be the only signal.
 */
export const PAPER_STATE = {
  success: "#047857",
  attention: "#0E7490",
  error: "#C8102E",
} as const;

/**
 * The slogan, quiet under the wordmark (D1: "Space, without the runaround."
 * goes on receipts and emails, beside the wordmark, in English in every
 * locale as the wordmark is). Mirrors the i18n `slogan` key; the renderer is
 * dependency-free, so it is carried here and `shell.test.ts` holds it equal.
 */
export const SLOGAN = "Space, without the runaround.";

/**
 * The brand band's navy: the ground itself, `--nf-ink-950`, which is also the
 * navy tile the lockup picture carries, so the lockup sits on the band with no
 * seam.
 */
export const HEADER = DARK.ground;

/**
 * The button fill. `#005FE8`, the product's primary blue as a solid: white on
 * it measures 5.5:1, which is more headroom than GLOW's 4.9:1 for the one
 * label in the message that must never be missed.
 */
export const BRAND = "#005FE8";

/** The button's gradient: `--nf-gradient-cta` flattened to two stops, over `BRAND` as its solid fallback. */
export const BUTTON_GRADIENT = `linear-gradient(180deg,#0A6CF5 0%,${BRAND} 100%)`;

/**
 * The button's glow on the navy card: `BRAND` at 70%, below the button. A
 * client that drops `box-shadow` (most of Outlook) loses nothing it needed.
 */
export const BUTTON_GLOW = "0 10px 26px -10px rgba(0,95,232,0.7)";

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

/**
 * WHAT THE DARK SCHEME MAKES OF EACH CLASS, in one table the style block and
 * the paint test both read, so the two cannot disagree. The shell classes go
 * to DARK; the sheet classes stay paper.
 */
export const SCHEME_DARK_GROUND: Readonly<Record<string, string>> = {
  "rm-base": DARK.ground,
  "rm-card": DARK.card,
  "rm-panel": DARK.panel,
  "rm-sheet": LIGHT.card,
  "rm-sheet-panel": LIGHT.panel,
};
export const SCHEME_DARK_INK: Readonly<Record<string, string>> = {
  "rm-title": DARK.text,
  "rm-body": DARK.body,
  "rm-muted": DARK.muted,
  "rm-link": SKY,
  "rm-ink": LIGHT.text,
  "rm-ink-body": LIGHT.body,
  "rm-ink-muted": LIGHT.muted,
  "rm-ink-link": LINK,
};
/** And the light scheme, which is the inline layer re-asserted. */
export const SCHEME_LIGHT_GROUND: Readonly<Record<string, string>> = {
  "rm-base": LIGHT.ground,
  "rm-card": LIGHT.card,
  "rm-panel": LIGHT.panel,
  "rm-sheet": LIGHT.card,
  "rm-sheet-panel": LIGHT.panel,
};
export const SCHEME_LIGHT_INK: Readonly<Record<string, string>> = {
  "rm-title": LIGHT.text,
  "rm-body": LIGHT.body,
  "rm-muted": LIGHT.muted,
  "rm-link": LINK,
  "rm-ink": LIGHT.text,
  "rm-ink-body": LIGHT.body,
  "rm-ink-muted": LIGHT.muted,
  "rm-ink-link": LINK,
};
