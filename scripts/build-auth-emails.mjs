#!/usr/bin/env node
/**
 * Generate the Vallo Supabase auth email templates.
 *
 * Supabase sends one HTML template per auth action: confirm signup, magic link,
 * recovery, email change, invite. Left at their defaults they are plain and
 * unbranded. This script emits all five from one shell plus a set of composable
 * blocks, so the lockup, the colour and the language stay identical across
 * every message and move in one place when the brand moves, rather than
 * drifting as five hand-edited files.
 *
 * Output: supabase/templates/<name>.html, and beside each one
 * supabase/templates/<name>.txt, the plain-text twin rendered from the SAME
 * block list, so the two cannot drift. Apply the HTML in the Supabase dashboard
 * under Authentication -> Email Templates, or via the Management API. The
 * dashboard takes HTML only; the .txt is the readable source of each message
 * and the text part for the day the Send Email Hook replaces SMTP (see
 * AUTH_EMAILS.md). Today a regeneration does not reach production by itself.
 *
 * Run: node scripts/build-auth-emails.mjs
 *
 * WHY THESE FIVE MATTER MORE THAN THE OTHERS.
 *
 * They are the first email anybody ever gets from Vallo. A confirm-signup
 * message arrives before the reader has any opinion of this product at all, so
 * it is not a utility, it is the first impression. It is also the message a
 * phishing kit will imitate, which is why the copy here never asks for
 * anything, never threatens, and always says plainly what happens if the reader
 * does nothing.
 *
 * ONE DESIGN, TWO GENERATORS.
 *
 * `apps/web/src/lib/email/render.ts` builds every transactional message. This
 * script builds these five. They must look like the same product, so every
 * value below is mirrored from `apps/web/src/lib/email/theme.ts`, which is the
 * source of truth and explains why literal hex is correct in an email.
 *
 * The duplication is real and it is deliberate: this is a plain Node script
 * that runs outside the Next build with no TypeScript loader, so it cannot
 * import a `.ts` module. What makes it safe rather than merely tolerated is
 * `apps/web/src/lib/email/shell.test.ts`, which reads theme.ts, this script and
 * the generated files, and fails when a colour here is not a colour there.
 *
 * DARK, IN THE REGISTER. The product is dark by default and the operating
 * system does not override it, so the email follows: navy ground, glass card
 * with a lit rim, blue button, the lockup, exactly the sign-in screen the
 * message sends the reader to. theme.ts explains what makes a dark email safe
 * where a half-dark one is not: the ground is painted on the body, on the outer
 * table as a bgcolor attribute and on the card cell, every text colour is
 * inline beside the background it sits on, and the one <style> block carries
 * nothing the message depends on.
 *
 * EMAIL CLIENT RULES OBSERVED HERE (do not undo these)
 * - Table layout only. No flex, no grid, no positioning.
 * - Every layout and colour declaration is inline on the element. The single
 *   <style> block re-asserts the palette for Gmail's dark-mode pass and
 *   nothing in it is required for the message to read correctly.
 * - System font stack only, no web fonts.
 * - background-color is always declared BEFORE background-image, because the
 *   Word rendering engine in Outlook drops background-image and keeps the
 *   colour. Every gradient therefore has a deliberate solid fallback.
 * - Container is 600px, fluid below that, and reads on a 360px Android screen.
 * - Every template keeps a plain-text fallback link, because clients strip
 *   buttons, and a hidden preheader so the inbox line is deliberate.
 * - THE MESSAGE MUST READ COMPLETELY WITH EVERY IMAGE BLOCKED. The shell
 *   carries two images and both are the lockup: the mark, decorative, alt
 *   empty; the wordmark, alt "Vallo". Every other word is live text.
 *
 * COPY RULES (the same ones binding on lib/email/messages.ts)
 * - No em dash characters, anywhere.
 * - No emoji.
 * - British spelling, calm and plain.
 * - No legal or financial promise. Nothing here says money is protected or
 *   guaranteed, and nothing claims a listing has been checked.
 * - Nothing advertises inventory this platform does not have.
 * - English. The product dictionary carries four locales (en, ha, ig, yo) and
 *   is English-first; Supabase renders one template per action with no locale
 *   input, so these are written once, in English, like the transactional
 *   catalogue. See AUTH_EMAILS.md, "The language question".
 */

import { mkdirSync, writeFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Where the files land. `supabase/templates` unless told otherwise.
 *
 * The override exists for one caller: `shell.test.ts` regenerates into a
 * temporary directory and diffs the result against what is committed. These
 * files are committed OUTPUT, and committed output rots in a specific way,
 * somebody fixes a typo in the HTML, the next person runs the generator, and
 * the fix vanishes with no diff to explain it. Comparing a fresh run against
 * the committed copy is the only thing that catches that before it happens.
 */
const OUT_DIR =
  process.env.VALLO_AUTH_EMAIL_OUT_DIR ?? join(__dirname, "..", "supabase", "templates");

/* ------------------------------------------------------------------------- *
 * The palette. Mirrored value for value from
 * apps/web/src/lib/email/theme.ts, which resolves them from
 * packages/design-tokens/src/tokens.css.
 *
 * These literals are correct. Do not "fix" them into CSS custom properties:
 * Gmail strips :root declarations, Outlook never supported them, and a var()
 * that resolves to nothing paints text the colour of its background.
 * ------------------------------------------------------------------------- */

const GROUND = "#010118"; // the ground behind the card, --nf-ink-950
const CARD = "#000030"; // the glass card, --nf-ink-850
const PANEL = "#000040"; // inset panels: the code box, the note, the rows
const EDGE = "#101A55"; // hairlines inside the card
const RIM = "#2743C4"; // the card's lit rim
const TEXT = "#FFFFFF"; // headings
const BODY = "#C6CDF2"; // body copy, 12.9:1 on the card
const MUTED = "#7C86C2"; // small print, 5.6:1 on the card

/* The brand blue, as a fill; SKY is the brand blue as text. */
const GLOW = "#0C39EF"; // --nf-electric-400
const ELECTRIC = "#0010D0"; // --nf-electric-600
const SKY = "#5C7CFF"; // the first stop of --nf-gradient-brand

/* Signature gradients. Solid fallbacks are applied at every call site. */
const GRADIENT = `linear-gradient(135deg,${GLOW} 0%,#0621E8 55%,${ELECTRIC} 100%)`;
const GRADIENT_CAP = `linear-gradient(90deg,${ELECTRIC} 0%,${GLOW} 28%,${SKY} 50%,${GLOW} 72%,${ELECTRIC} 100%)`;

const FONT_SANS =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
const FONT_MONO = "'SFMono-Regular',Consolas,'Liberation Mono',Menlo,monospace";

const MAX_WIDTH = 600;
const PAD_X = 40;

/* The lockup, hosted from the site Supabase is configured with. Boxes match
   theme.ts so the two generators draw the same line. */
const MARK = "{{ .SiteURL }}/brand/vallo-mark.png";
const MARK_WIDTH = 42;
const MARK_HEIGHT = 40;
const WORDMARK = "{{ .SiteURL }}/brand/vallo-wordmark.png";
const WORDMARK_WIDTH = 118;
const WORDMARK_HEIGHT = 26;
const WORDMARK_ALT = "Vallo";

/* The slogan, kept in step with SIGN_OFF in apps/web/src/lib/email/theme.ts
   and landing.slogan in packages/i18n. Three copies by design, because this
   generator and the renderer are both dependency-free; the email tests assert
   the rendered templates carry the renderer's value, which is what catches
   the three drifting apart. It caught exactly that on the day the slogan
   changed. */
const SIGN_OFF = "Vallo. Real Estate reimagined!";
/* The legal line, mirrored from LEGAL_LINE in theme.ts and asserted equal.
   Carries the RC number from 22 September; shell.test.ts asserts that this
   file, theme.ts and company.ts all agree, so the three cannot half update. */
const LEGAL_LINE = "VALLO SPACES LTD (RC 9870413), Abuja, Nigeria";

/* ------------------------------------------------------------------------- *
 * Blocks. Each template is a list of these, rendered twice: once as the HTML
 * Supabase sends, once as the plain-text twin. Each HTML primitive is the
 * auth-side twin of a block in render.ts, with the same measurements, so a
 * reader who gets a confirm-signup on Monday and a booking receipt on Tuesday
 * is looking at one product.
 * ------------------------------------------------------------------------- */

const heading = (text) => ({ kind: "heading", text });
const lede = (text) => ({ kind: "lede", text });
const para = (text) => ({ kind: "para", text });
const gap = (h) => ({ kind: "gap", h });
const cta = (label, href) => ({ kind: "cta", label, href });
const codeBox = (intro) => ({ kind: "code", intro });
const notePanel = (title, text) => ({ kind: "note", title, text });
const detailPanel = (rows) => ({ kind: "rows", rows });
const pointList = (items) => ({ kind: "list", items });
const fallbackLink = (href) => ({ kind: "fallback", href });

/** Vertical rhythm. font-size:0 and a matching line-height keep Outlook honest. */
function htmlGap(h) {
  return `<div style="height:${h}px;line-height:${h}px;font-size:0;mso-line-height-rule:exactly;">&nbsp;</div>`;
}

function htmlBlock(block) {
  switch (block.kind) {
    case "gap":
      return htmlGap(block.h);

    /*
     * Display heading. Matches render.ts heading() exactly. font-family is
     * repeated here rather than inherited from body, because several webmail
     * clients rewrite the document and reset headings to a serif default,
     * which is the most visible way an email looks broken.
     */
    case "heading":
      return `<h1 class="rm-title" style="margin:0 0 16px;font-family:${FONT_SANS};font-size:27px;line-height:1.22;font-weight:700;letter-spacing:-0.022em;color:${TEXT};">${block.text}</h1>`;

    /** The opening paragraph. Matches render.ts paragraph(). */
    case "lede":
      return `<p class="rm-body" style="margin:0;font-family:${FONT_SANS};font-size:16px;line-height:1.65;color:${BODY};">${block.text}</p>`;

    /** A supporting paragraph, one step down in weight of attention. */
    case "para":
      return `<p class="rm-body" style="margin:0;font-family:${FONT_SANS};font-size:15px;line-height:1.6;color:${BODY};">${block.text}</p>`;

    /*
     * The one primary action. Matches render.ts button() exactly.
     *
     * background-color before background-image, so Outlook drops the gradient
     * and keeps a solid brand-blue button with white text rather than white on
     * nothing. Padding sits on the anchor so the whole pill is a tap target on
     * a phone, which is where nearly all of these are opened, and
     * mso-padding-alt repeats the geometry for the Word engine, which ignores
     * padding on an inline-block. #FFFFFF is the text ON brand blue.
     */
    case "cta":
      return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0;">
                      <tr>
                        <td align="center" style="border-radius:14px;background-color:${GLOW};background-image:${GRADIENT};mso-padding-alt:16px 34px;">
                          <a href="${block.href}" target="_blank" style="display:inline-block;padding:16px 34px;font-family:${FONT_SANS};font-size:16px;line-height:20px;font-weight:600;letter-spacing:-0.01em;color:#FFFFFF;text-decoration:none;border-radius:14px;">${block.label}</a>
                        </td>
                      </tr>
                    </table>`;

    /*
     * The one-time code, for the flows where Supabase exposes {{ .Token }}.
     *
     * Offered UNDER the button rather than beside it. It is the same action by
     * another route, not a second action, and a reader who distrusts links in
     * email is right to, so this platform gives them a way through that
     * involves pressing nothing. Matches render.ts code(): letter-spacing puts
     * a gap after the last glyph too, so text-indent puts the same amount back
     * on the front and the string sits actually centred.
     */
    case "code":
      return `<p class="rm-muted" style="margin:0 0 10px;font-family:${FONT_SANS};font-size:12px;line-height:16px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:${MUTED};">${block.intro}</p>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;">
                      <tr>
                        <td align="center" class="rm-panel rm-title" bgcolor="${PANEL}" style="background:${PANEL};border:1px solid ${EDGE};border-radius:16px;padding:20px 16px;font-family:${FONT_MONO};font-size:26px;line-height:32px;font-weight:700;letter-spacing:0.2em;text-indent:0.2em;color:${TEXT};">{{ .Token }}</td>
                      </tr>
                    </table>`;

    /*
     * A titled note in an inset panel. Used for the reassurance on recovery
     * and the security warning on email change. The accent is a lit left edge
     * in brand blue rather than a red or amber alert colour, because this
     * brand has no alert hue and inventing one for an email is how a palette
     * starts drifting. Weight and position carry the emphasis.
     */
    case "note":
      return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;">
                      <tr>
                        <td class="rm-panel" bgcolor="${PANEL}" style="background:${PANEL};border:1px solid ${EDGE};border-left:3px solid ${GLOW};border-radius:16px;padding:18px 20px;">
                          <p class="rm-title" style="margin:0 0 6px;font-family:${FONT_SANS};font-size:14px;line-height:20px;font-weight:700;letter-spacing:-0.01em;color:${TEXT};">${block.title}</p>
                          <p class="rm-body" style="margin:0;font-family:${FONT_SANS};font-size:14px;line-height:1.6;color:${BODY};">${block.text}</p>
                        </td>
                      </tr>
                    </table>`;

    /*
     * Label and value rows in one panel. Matches render.ts rows(). Used on the
     * email change template so the reader can audit both addresses before
     * approving anything. word-break is on the value because an email address
     * is one long unbreakable token and will otherwise widen the table past
     * the viewport on a phone.
     */
    case "rows": {
      const cells = block.rows
        .map(
          ([label, value], i) => `<tr>
                            <td width="40%" class="rm-muted rm-rule" style="width:40%;padding:13px 14px 13px 0;${i === 0 ? "" : `border-top:1px solid ${EDGE};`}font-family:${FONT_SANS};font-size:13px;line-height:1.5;vertical-align:top;color:${MUTED};">${label}</td>
                            <td align="right" class="rm-title rm-rule" style="padding:13px 0;${i === 0 ? "" : `border-top:1px solid ${EDGE};`}font-family:${FONT_SANS};font-size:15px;line-height:1.5;font-weight:700;vertical-align:top;word-break:break-all;color:${TEXT};">${value}</td>
                          </tr>`,
        )
        .join("\n                          ");
      return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;">
                      <tr>
                        <td class="rm-panel" bgcolor="${PANEL}" style="background:${PANEL};border:1px solid ${EDGE};border-radius:16px;padding:6px 22px;">
                          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;">
                          ${cells}
                          </table>
                        </td>
                      </tr>
                    </table>`;
    }

    /*
     * A short list of what is true about this platform. Plain list markup: a
     * screen reader announces a list as a list, and a table of decorative dots
     * as nothing at all.
     */
    case "list": {
      const list = block.items
        .map((item) => `<li style="margin:0 0 10px;">${item}</li>`)
        .join("\n                        ");
      return `<ul class="rm-body" style="margin:0;padding:0 0 0 22px;font-family:${FONT_SANS};font-size:15px;line-height:1.6;color:${BODY};">
                        ${list}
                      </ul>`;
    }

    /** Small print with the raw link, for clients that strip the button. */
    case "fallback":
      return `<p class="rm-muted" style="margin:0;font-family:${FONT_SANS};font-size:13px;line-height:1.6;color:${MUTED};">
                      If the button does not work, copy this link into your browser:<br />
                      <a href="${block.href}" target="_blank" class="rm-brand" style="color:${SKY};text-decoration:underline;word-break:break-all;">${block.href}</a>
                    </p>`;
  }
  throw new Error(`unknown block ${block.kind}`);
}

/* ------------------------------------------------------------ the text twin */

/** Wrap to a readable measure. Placeholders and URLs are left whole. */
function wrap(text, width = 72) {
  const words = text.split(/\s+/).filter((w) => w.length > 0);
  const lines = [];
  let line = "";
  for (const word of words) {
    if (line.length === 0) line = word;
    else if (line.length + 1 + word.length <= width) line += " " + word;
    else {
      lines.push(line);
      line = word;
    }
  }
  if (line.length > 0) lines.push(line);
  return lines.join("\n");
}

/** Strip the little markup the copy carries (<br />, an anchor) for text. */
function plain(text) {
  return text.replace(/<br\s*\/?>/g, " ").replace(/<[^>]+>/g, "");
}

function textBlock(block) {
  switch (block.kind) {
    case "gap":
      return null;
    case "heading":
      // Underlined with dashes rather than shouted in capitals: a screen
      // reader spells out an all-caps word letter by letter.
      return `${block.text}\n${"-".repeat(Math.min(block.text.length, 72))}`;
    case "lede":
    case "para":
      return wrap(plain(block.text));
    case "cta":
      return `${block.label}:\n${block.href}`;
    case "code":
      return `${plain(block.intro)}: {{ .Token }}`;
    case "note":
      return `${block.title}\n${wrap(plain(block.text))}`;
    case "rows":
      // "Label: value", one per line. Not column-aligned: alignment padding
      // depends on a monospaced font, and a proportional one turns it into
      // ragged nonsense.
      return block.rows.map(([label, value]) => `${label}: ${value}`).join("\n");
    case "list":
      return block.items.map((item) => wrap(`- ${plain(item)}`)).join("\n");
    case "fallback":
      return `If the button does not work, copy this link into your browser:\n${block.href}`;
  }
  throw new Error(`unknown block ${block.kind}`);
}

/* ------------------------------------------------------------------------- *
 * The shared shell
 * ------------------------------------------------------------------------- */

/**
 * The band of plain facts, on the templates where it belongs.
 *
 * NOT a promise band. It used to be headed "How Vallo protects you" and to
 * claim every listing carried a verified host, which is not true: verification
 * is a ladder most listers have not climbed, and an email is the one surface
 * with no corrective. What is here now is what this platform can actually
 * stand behind, in the same words the transactional emails use.
 *
 * It is deliberately absent from a password reset, where the only job is to get
 * somebody calmly back in.
 */
function factBand(title, lines) {
  const items = lines
    .map((line) => `<li style="margin:0 0 8px;">${line}</li>`)
    .join("\n                          ");
  // The band closes the card, so it carries the card's rim and its bottom
  // radius. The card above it drops both, which is why the two are written as
  // one decision in shell() rather than independently here.
  return `<td class="rm-panel" bgcolor="${PANEL}" style="background:${PANEL};border:1px solid ${RIM};border-top:1px solid ${EDGE};border-radius:0 0 20px 20px;padding:24px ${PAD_X}px 26px;">
                      <p class="rm-muted" style="margin:0 0 12px;font-family:${FONT_SANS};font-size:11px;line-height:14px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:${MUTED};">${title}</p>
                      <ul class="rm-body" style="margin:0;padding:0 0 0 20px;font-family:${FONT_SANS};font-size:14px;line-height:1.6;color:${BODY};">
                          ${items}
                      </ul>
                    </td>`;
}

/**
 * The lockup and the purpose line.
 *
 * The mark carries no words and its alt is EMPTY; the wordmark is the word and
 * its alt is the brand name, so with images blocked a reader sees "Vallo" once,
 * in its place, rather than twice or as a broken image icon where the brand
 * should be. The purpose line beneath says what this particular email is for,
 * which is the one piece of hierarchy an auth message needs that a
 * transactional one does not: the reader did not ask for this and has half a
 * second to decide it is real.
 */
function masthead(purpose) {
  return `<table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="vertical-align:middle;padding-right:10px;">
                      <img src="${MARK}" width="${MARK_WIDTH}" height="${MARK_HEIGHT}" alt="" style="display:block;width:${MARK_WIDTH}px;height:${MARK_HEIGHT}px;border:0;outline:none;text-decoration:none;" />
                    </td>
                    <td style="vertical-align:middle;">
                      <img src="${WORDMARK}" width="${WORDMARK_WIDTH}" height="${WORDMARK_HEIGHT}" alt="${WORDMARK_ALT}" class="rm-brand" style="display:block;width:${WORDMARK_WIDTH}px;height:${WORDMARK_HEIGHT}px;border:0;outline:none;text-decoration:none;font-family:${FONT_SANS};font-size:22px;line-height:26px;font-weight:700;letter-spacing:-0.025em;color:${SKY};" />
                    </td>
                  </tr>
                </table>
                <div style="height:26px;line-height:26px;font-size:0;mso-line-height-rule:exactly;">&nbsp;</div>
                <p class="rm-muted" style="margin:0 0 10px;font-family:${FONT_SANS};font-size:11px;line-height:14px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:${MUTED};">${purpose}</p>`;
}

/**
 * The re-assertion block, identical to the one in render.ts down to the class
 * names. The inline layer already is this palette; the block holds it against
 * Gmail's dark-mode pass. Every declaration is !important because it has to
 * beat an inline style attribute, and there is no other way round that in
 * email. Classes rather than element selectors, so a client that supports the
 * media query but has rewritten the markup still matches.
 */
const DARK_STYLE = `
      :root { color-scheme: dark; supported-color-schemes: dark; }
      @media (prefers-color-scheme: dark) {
        .rm-base   { background: ${GROUND} !important; }
        .rm-card   { background: ${CARD} !important; border-color: ${RIM} !important; }
        .rm-panel  { background: ${PANEL} !important; border-color: ${EDGE} !important; }
        .rm-title  { color: ${TEXT} !important; }
        .rm-body   { color: ${BODY} !important; }
        .rm-muted  { color: ${MUTED} !important; }
        .rm-rule   { border-top-color: ${EDGE} !important; }
        .rm-brand  { color: ${SKY} !important; }
      }`;

/**
 * One shell for all five templates, and the same shell the product's
 * transactional email uses.
 *
 * @param preheader hidden inbox line
 * @param purpose   masthead purpose line, so each email announces its job
 * @param blocks    the middle: heading, lede, CTA, panels, fallback link
 * @param facts     optional {title, lines} band of plain, checkable statements
 * @param footnote  the closing sentence, tuned per template
 */
function shellHtml({ preheader, purpose, blocks, facts, footnote }) {
  const body = blocks.map(htmlBlock).join("\n                ");
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="dark" />
    <meta name="supported-color-schemes" content="dark" />
    <title>Vallo</title>
    <style>${DARK_STYLE}
    </style>
  </head>
  <body class="rm-base" bgcolor="${GROUND}" style="margin:0;padding:0;width:100%;background:${GROUND};color:${BODY};font-family:${FONT_SANS};-webkit-font-smoothing:antialiased;">
    <!-- The hidden inbox line. The trailing spacer entities stop a client
         pulling the first sentence of body copy in after it, so what the
         reader sees beside the subject is a line somebody wrote. -->
    <span style="display:none!important;visibility:hidden;opacity:0;height:0;width:0;max-height:0;max-width:0;overflow:hidden;font-size:1px;line-height:1px;mso-hide:all;">${preheader}&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;</span>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="rm-base" bgcolor="${GROUND}" style="width:100%;background:${GROUND};">
      <tr>
        <td align="center" style="padding:36px 16px 44px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:${MAX_WIDTH}px;width:100%;">

            <!-- The glow edge: a luminous rule capping the card, brightest at
                 its centre. background-color before background-image, so
                 Outlook keeps a solid electric blue rather than nothing. -->
            <tr>
              <td style="height:4px;line-height:4px;font-size:0;background-color:${GLOW};background-image:${GRADIENT_CAP};border-radius:20px 20px 0 0;mso-line-height-rule:exactly;">&nbsp;</td>
            </tr>

            <tr>
              <td class="rm-card" bgcolor="${CARD}" style="background:${CARD};border:1px solid ${RIM};border-top:0;${facts ? "border-bottom:0;" : "border-radius:0 0 20px 20px;"}padding:${PAD_X}px ${PAD_X}px 36px;">
                ${masthead(purpose)}
                ${body}
              </td>
            </tr>
${
  facts
    ? `            <tr>
              ${factBand(facts.title, facts.lines)}
            </tr>
`
    : ""
}
            <!-- The footer sits on the ground OUTSIDE the card, so it reads as
                 small print by position as well as by size. -->
            <tr>
              <td style="padding:26px ${PAD_X - 12}px 0;">
                <p class="rm-muted" style="margin:0 0 12px;font-family:${FONT_SANS};font-size:13px;line-height:20px;color:${MUTED};">${footnote}</p>
                <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td style="vertical-align:middle;padding-right:9px;">
                      <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
                        <td style="width:18px;height:2px;line-height:2px;font-size:0;background-color:${GLOW};background-image:${GRADIENT};border-radius:1px;mso-line-height-rule:exactly;">&nbsp;</td>
                      </tr></table>
                    </td>
                    <td style="vertical-align:middle;">
                      <p class="rm-muted" style="margin:0;font-family:${FONT_SANS};font-size:13px;line-height:20px;font-weight:600;color:${MUTED};">${SIGN_OFF}</p>
                    </td>
                  </tr>
                </table>
                <!-- The legal line. The brand is Vallo everywhere a person
                     reads; the company appears only where the law asks who
                     sent this, which is here. -->
                <p class="rm-muted" style="margin:10px 0 0;font-family:${FONT_SANS};font-size:12px;line-height:18px;color:${MUTED};">${LEGAL_LINE}</p>
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
`;
}

/**
 * The plain-text twin, from the same blocks in the same order. The preheader
 * is not repeated: in HTML it is a hidden preview line, and in text the reader
 * is already looking at the whole message.
 */
function shellText({ purpose, blocks, facts, footnote }) {
  const parts = [
    "Vallo",
    purpose,
    "",
    blocks
      .map(textBlock)
      .filter((part) => part !== null)
      .join("\n\n"),
    "",
  ];
  if (facts) {
    parts.push(`${facts.title}`, facts.lines.map((line) => wrap(`- ${line}`)).join("\n"), "");
  }
  parts.push(wrap(footnote), "", SIGN_OFF, LEGAL_LINE, "{{ .SiteURL }}");
  return parts.join("\n") + "\n";
}

/* ------------------------------------------------------------------------- *
 * The five templates. Each is written for its own moment rather than being the
 * same shell with swapped words: the purpose line, heading, panels and closing
 * sentence all change with the job the email is doing.
 * ------------------------------------------------------------------------- */

/**
 * The facts band, and every line in it is checkable.
 *
 * These are the same three claims `lib/email/messages.ts` makes in the welcome,
 * because they are the ones this platform can stand behind. There is no
 * guarantee here, no promise about money and no claim that anything has been
 * verified: verification on Vallo is a ladder, it is visible on a profile, and
 * most listers have not climbed it.
 */
const FACTS_MARKETPLACE = {
  title: "Worth knowing before you start",
  /*
   * BOTH SIDES, from the content truth sweep of 19 September. This band sat
   * at the foot of the first email anybody ever gets and described a property
   * marketplace and nothing else: three lines about rent, the move-in total
   * and inspecting before paying, on a product whose other half sells nights.
   * A reader invited by a friend to look for a room read a footer that did
   * not know the thing they came for existed.
   *
   * WHAT IT MAY AND MAY NOT SAY. `shell.test.ts` draws the line at the HARM
   * rather than at the nouns: naming what the product is for is allowed, an
   * unstandable count is not, an availability promise ("book a table
   * tonight") is not, a superlative ("the best hotels in Lagos") is not, and
   * "experiences" is banned outright because there is no experiences product
   * here at all: no table, no route, no screen. Every line below is written
   * to that line, and an email cannot be corrected once it has landed.
   */
  lines: [
    "Every listing was put up by a real person on Vallo. Nothing is imported from an outside feed, so there is always somebody to message.",
    "Vallo has two sides on one account. Property is renting, buying and selling; Vallo Stays is hotels, apartments, guest houses, resorts and restaurant tables. One naira wallet pays for both.",
    "On a tenancy the rent is rarely the whole number. Caution deposit, agency, legal, agreement and service charge are normal here, so the move-in total is printed in full before you commit.",
    "Keep chats and payments inside Vallo. Inspect a property before you pay for it, and pay for a stay at checkout rather than into anybody's account.",
  ],
};

const templates = {
  // Confirm signup: the first email anybody gets from Vallo. Its job is to
  // confirm an address, and its second job is to be obviously real.
  confirmation: {
    preheader: "Confirm this address and your Vallo account is ready.",
    purpose: "Confirm your email",
    blocks: [
      heading("Confirm your email address"),
      lede(
        "You are one step from a Vallo account. Confirm this address and you can search property, book a stay, hold a table, message a lister and save the places you like.",
      ),
      gap(28),
      cta("Confirm my email", "{{ .ConfirmationURL }}"),
      gap(28),
      codeBox("Or enter this code"),
      gap(28),
      fallbackLink("{{ .ConfirmationURL }}"),
    ],
    facts: FACTS_MARKETPLACE,
    footnote:
      "This confirmation was requested for {{ .Email }}. If it was not you, ignore this message. No account is activated and nothing further happens.",
  },

  // Magic link: quick and frictionless. The link first, everything else out of
  // the way, and one security line rather than a band, because the reader is
  // mid sign-in and wants to be finished.
  "magic-link": {
    preheader: "Your single-use Vallo sign-in link is ready.",
    purpose: "Sign in to Vallo",
    blocks: [
      heading("Here is your sign-in link"),
      lede("No password needed. Open this and you are back into Vallo."),
      gap(28),
      cta("Sign in to Vallo", "{{ .ConfirmationURL }}"),
      gap(28),
      codeBox("Or enter this code"),
      gap(24),
      para(
        "This link works once and expires shortly, so use it while it is fresh. It signs in the account for {{ .Email }} and no other.",
      ),
      gap(24),
      notePanel(
        "Nobody should ever ask you for this",
        "Vallo will never ask you for this link, this code or your password. Not by phone, not by message, not by email. If somebody does, they are not us.",
      ),
      gap(24),
      fallbackLink("{{ .ConfirmationURL }}"),
    ],
    footnote:
      "If you did not ask to sign in, ignore this message. The link expires on its own and nothing about your account changes.",
  },

  // Recovery: calm, no urgency, no alarm colour, and an explicit statement that
  // doing nothing is safe. No facts band: the only job is getting somebody back
  // in without worrying them.
  recovery: {
    preheader: "A way back into your Vallo account.",
    purpose: "Password reset",
    blocks: [
      heading("Set a new password"),
      lede(
        "Somebody asked to reset the password on this account. If that was you, choose a new one and you are back in.",
      ),
      gap(28),
      cta("Choose a new password", "{{ .ConfirmationURL }}"),
      gap(28),
      codeBox("Or enter this code"),
      gap(26),
      notePanel(
        "If this was not you",
        "There is nothing to do. Your current password still works, this link expires by itself, and your account stays exactly as it is.",
      ),
      gap(24),
      fallbackLink("{{ .ConfirmationURL }}"),
    ],
    footnote: "This reset was requested for {{ .Email }}. The link can only be used once.",
  },

  // Email change: a security confirmation. The reader audits the change before
  // approving it, so both addresses are shown, and the emphasis is on
  // authorising rather than on welcoming.
  "email-change": {
    preheader: "Approve the email address change on your Vallo account.",
    purpose: "Security confirmation",
    blocks: [
      heading("Confirm your new email address"),
      lede(
        "A request was made to move your Vallo account to a new address. Check both below, then approve the change.",
      ),
      gap(26),
      detailPanel([
        ["Current address", "{{ .Email }}"],
        ["New address", "{{ .NewEmail }}"],
      ]),
      gap(26),
      cta("Confirm the change", "{{ .ConfirmationURL }}"),
      gap(26),
      notePanel(
        "If you did not request this",
        "Do not open the link. Your address stays as it is until the change is approved. Sign in, change your password, and contact Vallo support if anything still looks wrong.",
      ),
      gap(24),
      fallbackLink("{{ .ConfirmationURL }}"),
    ],
    footnote:
      "This request was made on the account for {{ .Email }}. The change only takes effect once it is confirmed from this message.",
  },

  // Invite: an offer rather than an instruction. Somebody already inside
  // Vallo put this reader's name forward, and the copy is warm about it
  // without promising them anything.
  invite: {
    preheader: "Somebody has invited you to join Vallo.",
    purpose: "Your invitation",
    blocks: [
      heading("You have been invited to Vallo"),
      lede(
        "Vallo is a Nigerian property marketplace with two sides on one account: renting, buying and selling, and Vallo Stays for hotels, apartments, guest houses, resorts and restaurant tables. Accept below and your account is set up in a moment.",
      ),
      gap(26),
      cta("Accept your invitation", "{{ .ConfirmationURL }}"),
      gap(28),
      pointList([
        "Browse as much as you like before you tell anybody anything about yourself.",
        "Listings, conversations, bookings and trips all sit in one account.",
        "Your details stay private until you choose to message a lister.",
      ]),
      gap(24),
      para(
        "This invitation was sent to {{ .Email }}. It is personal to you, so please keep the link to yourself.",
      ),
      gap(24),
      fallbackLink("{{ .ConfirmationURL }}"),
    ],
    facts: FACTS_MARKETPLACE,
    footnote:
      "If you were not expecting an invitation, ignore this message. No account is created and nothing further happens.",
  },
};

mkdirSync(OUT_DIR, { recursive: true });
for (const [name, spec] of Object.entries(templates)) {
  for (const [ext, render] of [
    ["html", shellHtml],
    ["txt", shellText],
  ]) {
    const file = `${name}.${ext}`;
    const path = join(OUT_DIR, file);
    writeFileSync(path, render(spec), "utf8");
    process.stdout.write(`wrote supabase/templates/${file} (${statSync(path).size} bytes)\n`);
  }
}
