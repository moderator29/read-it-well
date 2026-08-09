#!/usr/bin/env node
/**
 * Generate the RentMe Supabase auth email templates.
 *
 * Supabase sends one HTML template per auth action: confirm signup, magic link,
 * recovery, email change, invite. Left at their defaults they are plain and
 * unbranded. This script emits all five from one shell plus a set of composable
 * blocks, so the lockup, the colour and the language stay identical across
 * every message and move in one place when the brand moves, rather than
 * drifting as five hand-edited files.
 *
 * Output: supabase/templates/*.html. Apply them in the Supabase dashboard under
 * Authentication -> Email Templates, or via the Management API. See EM-3 in
 * RECOMMENDATIONS.md: today a regeneration does not reach production by itself.
 *
 * Run: node scripts/build-auth-emails.mjs
 *
 * WHY THESE FIVE MATTER MORE THAN THE OTHERS.
 *
 * They are the first email anybody ever gets from RentMe. A confirm-signup
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
 * the five generated files, and fails when a colour here is not a colour there.
 *
 * LIGHT FIRST, AND THIS IS A REVERSAL. These templates used to be dark: a navy
 * canvas with light text baked into the inline styles, matching the product's
 * dark default. That is the wrong call for email and it was changed on purpose.
 * A mail client is not a browser: some strip the `<style>` block, some apply
 * their own inversion to a palette they did not design, and Outlook renders
 * through Word. A dark email that half renders is black text on a black card,
 * which is unreadable in exactly the message carrying somebody's sign-in link.
 * So the inline layer, the one every client honours, is light, and dark is an
 * enhancement applied only where the media query works.
 *
 * EMAIL CLIENT RULES OBSERVED HERE (do not undo these)
 * - Table layout only. No flex, no grid, no positioning.
 * - Every layout and colour declaration is inline on the element. The single
 *   <style> block carries the dark-mode enhancement only, and nothing in it is
 *   required for the message to read correctly.
 * - System font stack only, no web fonts.
 * - background-color is always declared BEFORE background-image, because the
 *   Word rendering engine in Outlook drops background-image and keeps the
 *   colour. Every gradient therefore has a deliberate solid fallback.
 * - Container is 600px, fluid below that, and reads on a 360px Android screen.
 * - Every template keeps a plain-text fallback link, because clients strip
 *   buttons, and a hidden preheader so the inbox line is deliberate.
 * - THE MESSAGE MUST READ COMPLETELY WITH EVERY IMAGE BLOCKED. There is one
 *   image in the shell, the logo mark, it carries no words, and its alt is
 *   empty because the wordmark beside it is live text.
 *
 * COPY RULES (the same ones binding on lib/email/messages.ts)
 * - No em dash characters, anywhere.
 * - No emoji.
 * - British spelling, calm and plain.
 * - No legal or financial promise. Nothing here says money is protected or
 *   guaranteed, and nothing claims a listing has been checked.
 * - Nothing advertises inventory this platform does not have.
 */

import { mkdirSync, writeFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "..", "supabase", "templates");

/* ------------------------------------------------------------------------- *
 * The palette. Mirrored value for value from
 * apps/web/src/lib/email/theme.ts, which resolves them from
 * packages/design-tokens/src/tokens.css.
 *
 * These literals are correct. Do not "fix" them into CSS custom properties:
 * Gmail strips :root declarations, Outlook never supported them, and a var()
 * that resolves to nothing paints text the colour of its background.
 * ------------------------------------------------------------------------- */

/* Light, and it is the layer every client honours. */
const BASE = "#F4F5FB"; // the paper behind the card
const CARD = "#FFFFFF"; // the card
const EDGE = "#DEE1F0"; // hairlines and panel borders
const PANEL = "#F7F8FD"; // inset panels: the code box, the note, the rows
const TEXT = "#0A0A1F"; // headings
const BODY = "#3B4166"; // body copy, 9.4:1 on white
const MUTED = "#666C8E"; // small print, 4.7:1 on the canvas it sits on

/* Dark, applied only through prefers-color-scheme. */
const D_BASE = "#010118";
const D_CARD = "#030327";
const D_EDGE = "#101A55";
const D_PANEL = "#060640";
const D_TEXT = "#FFFFFF";
const D_BODY = "#C6CDF2";
const D_MUTED = "#7C86C2";

/* The brand blue, identical in both schemes. */
const GLOW = "#0C39EF"; // --nf-electric-400
const ELECTRIC = "#0010D0"; // --nf-electric-600
const SKY = "#5C7CFF"; // --nf-electric-300

/* Signature gradients. Solid fallbacks are applied at every call site. */
const GRADIENT = `linear-gradient(135deg,${GLOW} 0%,#0621E8 55%,${ELECTRIC} 100%)`;
const GRADIENT_CAP = `linear-gradient(90deg,${ELECTRIC} 0%,${GLOW} 28%,${SKY} 50%,${GLOW} 72%,${ELECTRIC} 100%)`;

const FONT_SANS =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
const FONT_MONO = "'SFMono-Regular',Consolas,'Liberation Mono',Menlo,monospace";

const MAX_WIDTH = 600;
const PAD_X = 40;
const LOGO_SIZE = 40;

const LOGO = "{{ .SiteURL }}/brand/rentme-logo.png";
const SIGN_OFF = "RentMe. Find it. Rent it. Love it.";

/* ------------------------------------------------------------------------- *
 * Primitives. Each one is the auth-side twin of a block in render.ts, with the
 * same measurements, so a reader who gets a confirm-signup on Monday and a
 * booking receipt on Tuesday is looking at one product.
 * ------------------------------------------------------------------------- */

/** Vertical rhythm. font-size:0 and a matching line-height keep Outlook honest. */
function gap(h) {
  return `<div style="height:${h}px;line-height:${h}px;font-size:0;mso-line-height-rule:exactly;">&nbsp;</div>`;
}

/**
 * Display heading. Matches render.ts heading() exactly.
 *
 * font-family is repeated here rather than inherited from body, because several
 * webmail clients rewrite the document and reset headings to a serif default,
 * which is the most visible way an email looks broken.
 */
function heading(text) {
  return `<h1 class="rm-title" style="margin:0 0 16px;font-family:${FONT_SANS};font-size:27px;line-height:1.22;font-weight:700;letter-spacing:-0.022em;color:${TEXT};">${text}</h1>`;
}

/** The opening paragraph. Matches render.ts paragraph(). */
function lede(text) {
  return `<p class="rm-body" style="margin:0;font-family:${FONT_SANS};font-size:16px;line-height:1.65;color:${BODY};">${text}</p>`;
}

/** A supporting paragraph, one step down in weight of attention. */
function para(text) {
  return `<p class="rm-body" style="margin:0;font-family:${FONT_SANS};font-size:15px;line-height:1.6;color:${BODY};">${text}</p>`;
}

/**
 * The one primary action. Matches render.ts button() exactly.
 *
 * background-color before background-image, so Outlook drops the gradient and
 * keeps a solid brand-blue button with white text rather than white on nothing.
 * Padding sits on the anchor so the whole pill is a tap target on a phone,
 * which is where nearly all of these are opened, and mso-padding-alt repeats
 * the geometry for the Word engine, which ignores padding on an inline-block.
 *
 * #FFFFFF is literal rather than themed: it is the text ON brand blue in both
 * schemes and must not flip with the colour scheme.
 */
function cta(label, href) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0;">
                      <tr>
                        <td align="center" style="border-radius:14px;background-color:${GLOW};background-image:${GRADIENT};mso-padding-alt:16px 34px;">
                          <a href="${href}" target="_blank" style="display:inline-block;padding:16px 34px;font-family:${FONT_SANS};font-size:16px;line-height:20px;font-weight:600;letter-spacing:-0.01em;color:#FFFFFF;text-decoration:none;border-radius:14px;">${label}</a>
                        </td>
                      </tr>
                    </table>`;
}

/**
 * The one-time code, for the flows where Supabase exposes {{ .Token }}.
 *
 * Offered UNDER the button rather than beside it. It is the same action by
 * another route, not a second action, and a reader who distrusts links in email
 * is right to, so this platform gives them a way through that involves pressing
 * nothing. Matches render.ts code(): letter-spacing puts a gap after the last
 * glyph too, so text-indent puts the same amount back on the front and the
 * string sits actually centred.
 */
function codeBox(introText) {
  return `<p class="rm-muted" style="margin:0 0 10px;font-family:${FONT_SANS};font-size:12px;line-height:16px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:${MUTED};">${introText}</p>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;">
                      <tr>
                        <td align="center" class="rm-panel rm-title" style="background:${PANEL};border:1px solid ${EDGE};border-radius:16px;padding:20px 16px;font-family:${FONT_MONO};font-size:26px;line-height:32px;font-weight:700;letter-spacing:0.2em;text-indent:0.2em;color:${TEXT};">{{ .Token }}</td>
                      </tr>
                    </table>`;
}

/**
 * A titled note in an inset panel. Used for the reassurance on recovery and the
 * security warning on email change.
 *
 * The accent is a lit left edge in brand blue rather than a red or amber alert
 * colour, because this brand has no alert hue and inventing one for an email is
 * how a palette starts drifting. Weight and position carry the emphasis.
 */
function notePanel({ title, text }) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;">
                      <tr>
                        <td class="rm-panel" style="background:${PANEL};border:1px solid ${EDGE};border-left:3px solid ${GLOW};border-radius:16px;padding:18px 20px;">
                          <p class="rm-title" style="margin:0 0 6px;font-family:${FONT_SANS};font-size:14px;line-height:20px;font-weight:700;letter-spacing:-0.01em;color:${TEXT};">${title}</p>
                          <p class="rm-body" style="margin:0;font-family:${FONT_SANS};font-size:14px;line-height:1.6;color:${BODY};">${text}</p>
                        </td>
                      </tr>
                    </table>`;
}

/**
 * Label and value rows in one panel. Matches render.ts rows().
 *
 * Used on the email change template so the reader can audit both addresses
 * before approving anything. word-break is on the value because an email
 * address is one long unbreakable token and will otherwise widen the table
 * past the viewport on a phone.
 */
function detailPanel(rows) {
  const cells = rows
    .map(
      ([label, value], i) => `<tr>
                            <td width="40%" class="rm-muted rm-rule" style="width:40%;padding:13px 14px 13px 0;${i === 0 ? "" : `border-top:1px solid ${EDGE};`}font-family:${FONT_SANS};font-size:13px;line-height:1.5;vertical-align:top;color:${MUTED};">${label}</td>
                            <td align="right" class="rm-title rm-rule" style="padding:13px 0;${i === 0 ? "" : `border-top:1px solid ${EDGE};`}font-family:${FONT_SANS};font-size:15px;line-height:1.5;font-weight:700;vertical-align:top;word-break:break-all;color:${TEXT};">${value}</td>
                          </tr>`,
    )
    .join("\n                          ");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;">
                      <tr>
                        <td class="rm-panel" style="background:${PANEL};border:1px solid ${EDGE};border-radius:16px;padding:6px 22px;">
                          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;">
                          ${cells}
                          </table>
                        </td>
                      </tr>
                    </table>`;
}

/**
 * A short list of what is true about this platform.
 *
 * Plain list markup rather than a table of dots and copy. The old version drew
 * a 9px gradient square beside each line, which is decoration that costs a
 * table, two cells and a hand-tuned vertical offset per row, and which a screen
 * reader announces as nothing at all. A list is a list.
 */
function pointList(items) {
  const list = items
    .map((item) => `<li style="margin:0 0 10px;">${item}</li>`)
    .join("\n                        ");
  return `<ul class="rm-body" style="margin:0;padding:0 0 0 22px;font-family:${FONT_SANS};font-size:15px;line-height:1.6;color:${BODY};">
                        ${list}
                      </ul>`;
}

/** Small print with the raw link, for clients that strip the button. */
function fallbackLink(href) {
  return `<p class="rm-muted" style="margin:0;font-family:${FONT_SANS};font-size:13px;line-height:1.6;color:${MUTED};">
                      If the button does not work, copy this link into your browser:<br />
                      <a href="${href}" target="_blank" class="rm-brand" style="color:${GLOW};text-decoration:underline;word-break:break-all;">${href}</a>
                    </p>`;
}

/**
 * The band of plain facts, on the templates where it belongs.
 *
 * NOT a promise band. It used to be headed "How RentMe protects you" and to
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
  // The band closes the card, so it carries the card's side borders and its
  // bottom radius. The card above it drops both, which is why the two are
  // written as one decision in shell() rather than independently here.
  return `<td class="rm-panel" style="background:${PANEL};border:1px solid ${EDGE};border-radius:0 0 20px 20px;padding:24px ${PAD_X}px 26px;">
                      <p class="rm-muted" style="margin:0 0 12px;font-family:${FONT_SANS};font-size:11px;line-height:14px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:${MUTED};">${title}</p>
                      <ul class="rm-body" style="margin:0;padding:0 0 0 20px;font-family:${FONT_SANS};font-size:14px;line-height:1.6;color:${BODY};">
                          ${items}
                      </ul>
                    </td>`;
}

/**
 * The lockup and the purpose line.
 *
 * The mark is an image carrying no words and its alt is EMPTY on purpose: the
 * wordmark beside it is live text. With images blocked a reader sees "RentMe"
 * once, in brand blue, rather than "RentMe RentMe" or a broken image icon where
 * the brand should be. The purpose line beneath says what this particular email
 * is for, which is the one piece of hierarchy an auth message needs that a
 * transactional one does not: the reader did not ask for this and has half a
 * second to decide it is real.
 */
function masthead(purpose) {
  return `<table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="vertical-align:middle;padding-right:12px;">
                      <img src="${LOGO}" width="${LOGO_SIZE}" height="${LOGO_SIZE}" alt="" style="display:block;width:${LOGO_SIZE}px;height:${LOGO_SIZE}px;border:0;outline:none;text-decoration:none;" />
                    </td>
                    <td style="vertical-align:middle;">
                      <span class="rm-brand" style="font-family:${FONT_SANS};font-size:23px;line-height:28px;font-weight:700;letter-spacing:-0.025em;color:${GLOW};">RentMe</span>
                    </td>
                  </tr>
                </table>
                <div style="height:26px;line-height:26px;font-size:0;mso-line-height-rule:exactly;">&nbsp;</div>
                <p class="rm-muted" style="margin:0 0 10px;font-family:${FONT_SANS};font-size:11px;line-height:14px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:${MUTED};">${purpose}</p>`;
}

/**
 * The dark override, identical to the one in render.ts down to the class names.
 *
 * Every declaration is !important because it has to beat an inline style
 * attribute, and there is no other way round that in email. Classes rather than
 * element selectors, so a client that supports the media query but has
 * rewritten the markup still matches.
 */
const DARK_STYLE = `
      :root { color-scheme: light dark; supported-color-schemes: light dark; }
      @media (prefers-color-scheme: dark) {
        .rm-base   { background: ${D_BASE} !important; }
        .rm-card   { background: ${D_CARD} !important; border-color: ${D_EDGE} !important; }
        .rm-panel  { background: ${D_PANEL} !important; border-color: ${D_EDGE} !important; }
        .rm-title  { color: ${D_TEXT} !important; }
        .rm-body   { color: ${D_BODY} !important; }
        .rm-muted  { color: ${D_MUTED} !important; }
        .rm-rule   { border-top-color: ${D_EDGE} !important; }
        .rm-brand  { color: ${SKY} !important; }
      }`;

/* ------------------------------------------------------------------------- *
 * The shared shell
 * ------------------------------------------------------------------------- */

/**
 * One shell for all five templates, and the same shell the product's
 * transactional email uses.
 *
 * @param preheader hidden inbox line
 * @param purpose   masthead purpose line, so each email announces its job
 * @param body      the middle: heading, lede, CTA, panels, fallback link
 * @param facts     optional {title, lines} band of plain, checkable statements
 * @param footnote  the closing sentence, tuned per template
 */
function shell({ preheader, purpose, body, facts, footnote }) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="light dark" />
    <meta name="supported-color-schemes" content="light dark" />
    <title>RentMe</title>
    <style>${DARK_STYLE}
    </style>
  </head>
  <body class="rm-base" style="margin:0;padding:0;width:100%;background:${BASE};color:${BODY};font-family:${FONT_SANS};-webkit-font-smoothing:antialiased;">
    <!-- The hidden inbox line. The trailing spacer entities stop a client
         pulling the first sentence of body copy in after it, so what the
         reader sees beside the subject is a line somebody wrote. -->
    <span style="display:none!important;visibility:hidden;opacity:0;height:0;width:0;max-height:0;max-width:0;overflow:hidden;font-size:1px;line-height:1px;mso-hide:all;">${preheader}&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;</span>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="rm-base" style="width:100%;background:${BASE};">
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
              <td class="rm-card" style="background:${CARD};border:1px solid ${EDGE};border-top:0;${facts ? "" : "border-radius:0 0 20px 20px;"}padding:${PAD_X}px ${PAD_X}px 36px;">
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
            <!-- The footer sits on the canvas OUTSIDE the card, so it reads as
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
 * verified: verification on RentMe is a ladder, it is visible on a profile, and
 * most listers have not climbed it.
 */
const FACTS_MARKETPLACE = {
  title: "Worth knowing before you start",
  lines: [
    "Every listing was put up by a real person on RentMe. Nothing is imported from an outside feed, so there is always somebody to message.",
    "The rent is rarely the whole number. Caution deposit, agency, legal, agreement and service charge are normal here, so plan around the total move-in cost.",
    "Keep chats and payments inside RentMe, and pay only after you have inspected a place in person.",
  ],
};

const templates = {
  // Confirm signup: the first email anybody gets from RentMe. Its job is to
  // confirm an address, and its second job is to be obviously real.
  "confirmation.html": {
    preheader: "Confirm this address and your RentMe account is ready.",
    purpose: "Confirm your email",
    body:
      heading("Confirm your email address") +
      lede(
        "You are one step from a RentMe account. Confirm this address and you can search, message a lister and save the places you like.",
      ) +
      gap(28) +
      cta("Confirm my email", "{{ .ConfirmationURL }}") +
      gap(28) +
      codeBox("Or enter this code") +
      gap(28) +
      fallbackLink("{{ .ConfirmationURL }}"),
    facts: FACTS_MARKETPLACE,
    footnote:
      "This confirmation was requested for {{ .Email }}. If it was not you, ignore this message. No account is activated and nothing further happens.",
  },

  // Magic link: quick and frictionless. The link first, everything else out of
  // the way, and one security line rather than a band, because the reader is
  // mid sign-in and wants to be finished.
  "magic-link.html": {
    preheader: "Your single-use RentMe sign-in link is ready.",
    purpose: "Sign in to RentMe",
    body:
      heading("Here is your sign-in link") +
      lede("No password needed. Open this and you are back into RentMe.") +
      gap(28) +
      cta("Sign in to RentMe", "{{ .ConfirmationURL }}") +
      gap(28) +
      codeBox("Or enter this code") +
      gap(24) +
      para(
        "This link works once and expires shortly, so use it while it is fresh. It signs in the account for {{ .Email }} and no other.",
      ) +
      gap(24) +
      notePanel({
        title: "Nobody should ever ask you for this",
        text: "RentMe will never ask you for this link, this code or your password. Not by phone, not by message, not by email. If somebody does, they are not us.",
      }) +
      gap(24) +
      fallbackLink("{{ .ConfirmationURL }}"),
    footnote:
      "If you did not ask to sign in, ignore this message. The link expires on its own and nothing about your account changes.",
  },

  // Recovery: calm, no urgency, no alarm colour, and an explicit statement that
  // doing nothing is safe. No facts band: the only job is getting somebody back
  // in without worrying them.
  "recovery.html": {
    preheader: "A way back into your RentMe account.",
    purpose: "Password reset",
    body:
      heading("Set a new password") +
      lede(
        "Somebody asked to reset the password on this account. If that was you, choose a new one and you are back in.",
      ) +
      gap(28) +
      cta("Choose a new password", "{{ .ConfirmationURL }}") +
      gap(28) +
      codeBox("Or enter this code") +
      gap(26) +
      notePanel({
        title: "If this was not you",
        text: "There is nothing to do. Your current password still works, this link expires by itself, and your account stays exactly as it is.",
      }) +
      gap(24) +
      fallbackLink("{{ .ConfirmationURL }}"),
    footnote:
      "This reset was requested for {{ .Email }}. The link can only be used once.",
  },

  // Email change: a security confirmation. The reader audits the change before
  // approving it, so both addresses are shown, and the emphasis is on
  // authorising rather than on welcoming.
  "email-change.html": {
    preheader: "Approve the email address change on your RentMe account.",
    purpose: "Security confirmation",
    body:
      heading("Confirm your new email address") +
      lede(
        "A request was made to move your RentMe account to a new address. Check both below, then approve the change.",
      ) +
      gap(26) +
      detailPanel([
        ["Current address", "{{ .Email }}"],
        ["New address", "{{ .NewEmail }}"],
      ]) +
      gap(26) +
      cta("Confirm the change", "{{ .ConfirmationURL }}") +
      gap(26) +
      notePanel({
        title: "If you did not request this",
        text: "Do not open the link. Your address stays as it is until the change is approved. Sign in, change your password, and contact RentMe support if anything still looks wrong.",
      }) +
      gap(24) +
      fallbackLink("{{ .ConfirmationURL }}"),
    footnote:
      "This request was made on the account for {{ .Email }}. The change only takes effect once it is confirmed from this message.",
  },

  // Invite: an offer rather than an instruction. Somebody already inside
  // RentMe put this reader's name forward, and the copy is warm about it
  // without promising them anything.
  "invite.html": {
    preheader: "Somebody has invited you to join RentMe.",
    purpose: "Your invitation",
    body:
      heading("You have been invited to RentMe") +
      lede(
        "RentMe is a Nigerian property marketplace for renting, buying and selling, and for short stays. Accept below and your account is set up in a moment.",
      ) +
      gap(26) +
      cta("Accept your invitation", "{{ .ConfirmationURL }}") +
      gap(28) +
      pointList([
        "Browse as much as you like before you tell anybody anything about yourself.",
        "Listings, conversations and bookings all sit in one account.",
        "Your details stay private until you choose to message a lister.",
      ]) +
      gap(24) +
      para(
        "This invitation was sent to {{ .Email }}. It is personal to you, so please keep the link to yourself.",
      ) +
      gap(24) +
      fallbackLink("{{ .ConfirmationURL }}"),
    facts: FACTS_MARKETPLACE,
    footnote:
      "If you were not expecting an invitation, ignore this message. No account is created and nothing further happens.",
  },
};

mkdirSync(OUT_DIR, { recursive: true });
for (const [name, spec] of Object.entries(templates)) {
  const path = join(OUT_DIR, name);
  writeFileSync(path, shell(spec), "utf8");
  process.stdout.write(
    `wrote supabase/templates/${name} (${statSync(path).size} bytes)\n`,
  );
}
