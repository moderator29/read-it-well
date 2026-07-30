#!/usr/bin/env node
/**
 * Generate the RentMe Supabase auth email templates.
 *
 * Supabase sends one HTML template per auth action (confirm signup, magic link,
 * recovery, email change, invite). Left at their defaults they are plain and
 * unbranded. This script emits all five from one branded shell plus a set of
 * composable blocks, so the lockup, colour, glow and trust language stay
 * identical across every message and can be moved in one place when the brand
 * moves, rather than drifting as five hand-edited files.
 *
 * Output: supabase/templates/*.html. Apply them in the Supabase dashboard under
 * Authentication -> Email Templates, or via the Management API. See
 * supabase/README.md.
 *
 * DESIGN INTENT
 * The web product renders a dark navy-black canvas with edge-lit glass cards and
 * an electric blue glow. Email HTML cannot do backdrop-filter, box shadows are
 * unreliable and large artwork PNGs are too heavy to send, so the glass system
 * is rebuilt out of email-safe parts instead: a luminous gradient cap, a 1px
 * gradient ring drawn as table padding, a masthead panel a shade lighter than
 * the card, hairline dividers that fade at both ends, and soft inner panels for
 * the code box and notes. Depth comes from layered table backgrounds, not from
 * images. The only remote image is the logo cutout.
 *
 * EMAIL CLIENT RULES OBSERVED HERE (do not undo these)
 * - Table layout only. No flex, no grid, no positioning.
 * - Every layout and colour declaration is inline on the element. The single
 *   <style> block carries a light-mode courtesy only, and nothing in it is
 *   required for the message to read correctly.
 * - System font stack only, no web fonts.
 * - background-color is always declared BEFORE background-image, because the
 *   Word rendering engine in Outlook drops background-image and keeps the
 *   colour. Every gradient therefore has a deliberate solid fallback.
 * - Gradient-clipped text (the wordmark) declares a solid colour first, since
 *   many clients ignore background-clip and would otherwise render nothing.
 * - Container is 560px, fluid to 320px, and reads on a 390px Android screen.
 * - Every template keeps a plain-text fallback link, because clients strip
 *   buttons, and a hidden preheader so the inbox line is deliberate.
 */

import { mkdirSync, writeFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "..", "supabase", "templates");

/* ------------------------------------------------------------------------- *
 * Brand constants, sampled from the canonical background artwork and mirrored
 * from packages/design-tokens/src/tokens.css as literals, because email HTML
 * cannot read CSS custom properties. Deep navy-black canvas, dark neon blue,
 * electric blue glow. Never purple, violet, magenta, cyan or generic SaaS blue.
 * ------------------------------------------------------------------------- */
const BASE = "#010118"; // page canvas
const CARD = "#030327"; // card body
const PANEL = "#060640"; // masthead and inner panels
const PANEL_DEEP = "#04042E"; // inner panel base, one step down from PANEL
const EDGE = "#101A55"; // hairline and ring base
const EDGE_LIT = "#2A3A96"; // lit side of the ring
const GLOW = "#0C39EF"; // electric-400
const NEON = "#0010E0"; // electric-500, the brand primary and every solid fallback
const DEEP = "#000F98"; // electric-700, the foot of the CTA gradient
// electric-600 (#0010D0) is part of the sampled palette but is not needed here:
// the CTA gradient runs electric-400 to electric-500 to electric-700, verbatim
// from --nf-gradient-cta. Add it only if that token changes.
const SKY = "#5C7CFF"; // electric-300, the luminous highlight
const TEXT = "#FFFFFF";
const BODY = "#C6CDF2";
const SUBTLE = "#A7B0E2";
const MUTED = "#7C86C2";

/* Signature gradients. Solid fallbacks are applied at every call site. */
// The product CTA gradient, verbatim from --nf-gradient-cta.
const GRADIENT_CTA = `linear-gradient(180deg,${GLOW} 0%,${NEON} 50%,${DEEP} 100%)`;
// Glossy inner highlight stacked over the CTA gradient. Two background layers:
// clients that support gradients get the sheen, Outlook gets solid NEON.
const GRADIENT_CTA_LIT = `linear-gradient(180deg,rgba(255,255,255,0.26) 0%,rgba(255,255,255,0.06) 45%,rgba(255,255,255,0) 46%),${GRADIENT_CTA}`;
// Wordmark and mark sit in one lockup, sharing the brand gradient.
const GRADIENT_WORDMARK = `linear-gradient(135deg,${SKY} 0%,${GLOW} 55%,${NEON} 100%)`;
// The luminous cap across the top of the card.
const GRADIENT_CAP = `linear-gradient(90deg,${DEEP} 0%,${GLOW} 26%,${SKY} 50%,${GLOW} 74%,${DEEP} 100%)`;
// The edge-lit ring, drawn as 1px of table padding around the card.
const GRADIENT_RING = `linear-gradient(160deg,${EDGE_LIT} 0%,${EDGE} 42%,#0A0F38 100%)`;
// Masthead glow, the email-safe stand-in for the ambient bloom behind the logo.
const GLOW_MASTHEAD = `radial-gradient(120% 150% at 50% -30%,rgba(12,57,239,0.55) 0%,rgba(6,6,64,0) 72%)`;
// Soft glow cushion under the CTA. No background-color, so Outlook renders an
// empty spacer row rather than a stray blue band.
const GLOW_CUSHION = `radial-gradient(60% 100% at 50% 0%,rgba(12,57,239,0.45) 0%,rgba(1,1,24,0) 78%)`;
// Hairline that fades out at both ends, so dividers read as light rather than
// as a drawn border. Falls back to the flat EDGE colour.
const HAIRLINE = `linear-gradient(90deg,rgba(92,124,255,0) 0%,rgba(92,124,255,0.75) 50%,rgba(92,124,255,0) 100%)`;
// Top highlight inside a panel, the email-safe version of the glass specular.
const HAIRLINE_INNER = `linear-gradient(90deg,rgba(92,124,255,0) 0%,rgba(92,124,255,0.5) 38%,rgba(92,124,255,0.5) 62%,rgba(92,124,255,0) 100%)`;

const FONT_SANS =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
const FONT_MONO =
  "'SFMono-Regular',ui-monospace,Menlo,Consolas,'Liberation Mono',monospace";

const LOGO = "{{ .SiteURL }}/brand/rentme-logo.png";
const STRAPLINE = "RentMe. Find it. Rent it. Love it.";

/* ------------------------------------------------------------------------- *
 * Primitives
 * ------------------------------------------------------------------------- */

/** Vertical rhythm. font-size:0 and matching line-height keep Outlook honest. */
function gap(h) {
  return `<div style="height:${h}px;line-height:${h}px;font-size:0;mso-line-height-rule:exactly;">&nbsp;</div>`;
}

/** Full-bleed fading hairline. Used between masthead, body and trust band. */
function rule() {
  return `<tr><td style="height:1px;line-height:1px;font-size:0;background-color:${EDGE};background-image:${HAIRLINE};mso-line-height-rule:exactly;">&nbsp;</td></tr>`;
}

/** Small uppercase label above the heading. Carries the purpose of the email. */
function kicker(text) {
  return `<p style="margin:0 0 12px;font-family:${FONT_SANS};font-size:11px;line-height:14px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:${SKY};">${text}</p>`;
}

/** Display heading. Tight tracking, generous leading, white for contrast. */
function heading(text) {
  return `<h1 style="margin:0 0 14px;font-family:${FONT_SANS};font-size:28px;line-height:34px;font-weight:700;letter-spacing:-0.022em;color:${TEXT};">${text}</h1>`;
}

/** The calm opening paragraph, one step larger and lighter than body copy. */
function lede(text) {
  return `<p style="margin:0;font-family:${FONT_SANS};font-size:16px;line-height:26px;color:${BODY};">${text}</p>`;
}

/** Supporting paragraph. */
function para(text) {
  return `<p style="margin:0;font-family:${FONT_SANS};font-size:14px;line-height:23px;color:${SUBTLE};">${text}</p>`;
}

/**
 * Bulletproof CTA. Three nested tables, each one earning its place.
 *
 * - Outer table is full width and centres the pill.
 * - Middle table has no width, so it shrinks to the pill. That keeps the glow
 *   cushion in the row beneath exactly as wide as the button instead of
 *   spanning the whole column, which is what makes the glow read as coming off
 *   the button.
 * - background-color is declared before background-image, so Outlook drops the
 *   sheen and gradient and keeps solid electric blue. The 1px lit border stands
 *   in for the ring the web button gets from a box shadow, which email cannot
 *   be trusted to render.
 *
 * Padding sits on the anchor rather than on the cell so the entire pill is a
 * tap target on mobile, which is where nearly all of these links are opened.
 * mso-padding-alt repeats the same geometry for the Word engine. Legacy Outlook
 * desktop may draw a tighter pill: that degrades to a smaller solid blue button
 * with white text, which is acceptable, whereas moving the padding onto the
 * cell would shrink the tap target for every mobile reader. Do not swap them.
 */
function cta(label, href) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;">
                      <tr>
                        <td align="center" style="padding:0;">
                          <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                            <tr>
                              <td align="center" style="border-radius:16px;background-color:${NEON};background-image:${GRADIENT_CTA_LIT};border:1px solid ${GLOW};mso-padding-alt:18px 34px;">
                                <a href="${href}" target="_blank" style="display:inline-block;padding:17px 34px;font-family:${FONT_SANS};font-size:17px;line-height:21px;font-weight:700;letter-spacing:-0.01em;color:${TEXT};text-decoration:none;border-radius:16px;">${label}</a>
                              </td>
                            </tr>
                            <tr>
                              <td style="height:14px;line-height:14px;font-size:0;background-image:${GLOW_CUSHION};mso-line-height-rule:exactly;">&nbsp;</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>`;
}

/**
 * One-time code panel, for the flows where Supabase exposes {{ .Token }}.
 * Two nested tables: the outer one is the panel with its ring, the inner one
 * carries a 1px specular highlight along the top so the panel reads as inset
 * glass rather than as a plain box.
 */
function codeBox(introText) {
  return `<p style="margin:0 0 10px;font-family:${FONT_SANS};font-size:12px;line-height:16px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:${MUTED};">${introText}</p>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;">
                      <tr>
                        <td style="background-color:${PANEL_DEEP};background-image:linear-gradient(180deg,${PANEL} 0%,${PANEL_DEEP} 100%);border:1px solid ${EDGE};border-radius:16px;padding:0;">
                          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;">
                            <tr><td style="height:1px;line-height:1px;font-size:0;background-color:${EDGE};background-image:${HAIRLINE_INNER};mso-line-height-rule:exactly;">&nbsp;</td></tr>
                            <tr>
                              <td align="center" style="padding:18px 16px 20px;font-family:${FONT_MONO};font-size:26px;line-height:32px;font-weight:700;letter-spacing:0.26em;text-indent:0.26em;color:${TEXT};">{{ .Token }}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>`;
}

/**
 * Soft inner panel for a titled note. Used for reassurance on recovery and for
 * the security warning on email change. The accent stays inside the sampled
 * palette: there is no red or amber alert colour in this brand, so weight and
 * a lit left edge carry the emphasis instead.
 */
function notePanel({ title, text }) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;">
                      <tr>
                        <td style="background-color:${PANEL_DEEP};background-image:linear-gradient(135deg,rgba(12,57,239,0.22) 0%,rgba(4,4,46,0) 70%);border:1px solid ${EDGE};border-left:3px solid ${GLOW};border-radius:14px;padding:16px 18px;">
                          <p style="margin:0 0 6px;font-family:${FONT_SANS};font-size:13px;line-height:18px;font-weight:700;letter-spacing:-0.01em;color:${TEXT};">${title}</p>
                          <p style="margin:0;font-family:${FONT_SANS};font-size:13px;line-height:21px;color:${SUBTLE};">${text}</p>
                        </td>
                      </tr>
                    </table>`;
}

/**
 * Label and value rows inside one panel. Used on the email change template to
 * show the current address and the requested one, so the reader can audit the
 * change before confirming it.
 */
function detailPanel(rows) {
  const body = rows
    .map(
      ([label, value], i) => `<tr>
                              <td style="padding:${i === 0 ? "16px 18px 14px" : "14px 18px 16px"};${i === 0 ? "" : `border-top:1px solid ${EDGE};`}">
                                <p style="margin:0 0 4px;font-family:${FONT_SANS};font-size:11px;line-height:14px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:${MUTED};">${label}</p>
                                <p style="margin:0;font-family:${FONT_SANS};font-size:15px;line-height:22px;font-weight:600;color:${TEXT};word-break:break-all;">${value}</p>
                              </td>
                            </tr>`,
    )
    .join("\n                            ");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;">
                      <tr>
                        <td style="background-color:${PANEL_DEEP};background-image:linear-gradient(180deg,${PANEL} 0%,${PANEL_DEEP} 100%);border:1px solid ${EDGE};border-radius:16px;padding:0;">
                          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;">
                            <tr><td style="height:1px;line-height:1px;font-size:0;background-color:${EDGE};background-image:${HAIRLINE_INNER};mso-line-height-rule:exactly;">&nbsp;</td></tr>
                            ${body}
                          </table>
                        </td>
                      </tr>
                    </table>`;
}

/**
 * What you get next. Each row is a two-cell table: a small glowing dot and the
 * copy. Kept as text and CSS so nothing depends on remote images loading.
 *
 * The dot cell carries 6px more top padding than its text cell. Email HTML has
 * no way to centre a marker against the cap height of the first line, so the
 * offset is applied by hand. Adjust both numbers together if the type changes.
 */
function valueList(items) {
  const rows = items
    .map(
      (item, i) => `<tr>
                          <td width="26" style="width:26px;vertical-align:top;padding:${i === 0 ? "6px" : "16px"} 0 0;">
                            <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
                              <td style="width:9px;height:9px;line-height:9px;font-size:0;background-color:${GLOW};background-image:${GRADIENT_WORDMARK};border-radius:5px;mso-line-height-rule:exactly;">&nbsp;</td>
                            </tr></table>
                          </td>
                          <td style="vertical-align:top;padding:${i === 0 ? "0" : "10px"} 0 0;font-family:${FONT_SANS};font-size:14px;line-height:22px;color:${BODY};">
                            <span style="color:${TEXT};font-weight:600;">${item.title}</span> ${item.text}
                          </td>
                        </tr>`,
    )
    .join("\n                        ");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;">
                        ${rows}
                    </table>`;
}

/** Small print with the raw link, for clients that strip the button. */
function fallbackLink(href) {
  return `<p style="margin:0;font-family:${FONT_SANS};font-size:12px;line-height:19px;color:${MUTED};">
                      If the button does not work, copy this link into your browser:<br />
                      <a href="${href}" target="_blank" style="color:${SKY};text-decoration:underline;word-break:break-all;">${href}</a>
                    </p>`;
}

/**
 * The platform promise band, on the templates where it belongs. It is the
 * reason a first-time renter trusts the product, so it sits on the welcome,
 * the invitation and the sign-in link. It is deliberately absent from a
 * password reset, where the only job is to get someone calmly back in.
 */
function trustBand(lines) {
  const items = lines
    .map(
      (line, i) => `<tr>
                          <td width="18" style="width:18px;vertical-align:top;padding:${i === 0 ? "7px" : "13px"} 0 0;">
                            <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
                              <td style="width:6px;height:6px;line-height:6px;font-size:0;background-color:${SKY};border-radius:3px;mso-line-height-rule:exactly;">&nbsp;</td>
                            </tr></table>
                          </td>
                          <td style="vertical-align:top;padding:${i === 0 ? "0" : "6px"} 0 0;font-family:${FONT_SANS};font-size:13px;line-height:20px;color:${BODY};">${line}</td>
                        </tr>`,
    )
    .join("\n                        ");
  return `<td style="background-color:${PANEL_DEEP};background-image:${GLOW_MASTHEAD};padding:22px 32px 24px;">
                      <p style="margin:0 0 12px;font-family:${FONT_SANS};font-size:11px;line-height:14px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:${SKY};">How RentMe protects you</p>
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;">
                        ${items}
                      </table>
                    </td>`;
}

/**
 * The masthead. Not a logo line: a panel one shade lighter than the card, lit
 * from above by a radial glow, with the mark and the gradient wordmark locked
 * up as a single object and a purpose line beneath it. The wordmark declares a
 * solid GLOW colour before the gradient clip, so clients that ignore
 * background-clip still render readable text rather than nothing.
 */
function masthead(purpose) {
  return `<td style="background-color:${PANEL};background-image:${GLOW_MASTHEAD};padding:30px 32px 26px;">
                      <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                        <tr>
                          <td style="vertical-align:middle;padding-right:11px;">
                            <img src="${LOGO}" width="42" height="42" alt="RentMe" style="display:block;width:42px;height:42px;border:0;outline:none;text-decoration:none;" />
                          </td>
                          <td style="vertical-align:middle;">
                            <span style="font-family:${FONT_SANS};font-size:25px;line-height:30px;font-weight:700;letter-spacing:-0.03em;color:${SKY};background-image:${GRADIENT_WORDMARK};-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;">RentMe</span>
                          </td>
                        </tr>
                      </table>
                      <div style="height:14px;line-height:14px;font-size:0;mso-line-height-rule:exactly;">&nbsp;</div>
                      <p style="margin:0;font-family:${FONT_SANS};font-size:12px;line-height:16px;font-weight:600;letter-spacing:0.13em;text-transform:uppercase;color:${MUTED};">${purpose}</p>
                    </td>`;
}

/* ------------------------------------------------------------------------- *
 * The shared shell
 * ------------------------------------------------------------------------- */

/**
 * One shell for all five templates.
 *
 * @param preheader hidden inbox line
 * @param purpose   masthead purpose line, so each email announces its job
 * @param body      the middle: heading, lede, CTA, panels, fallback link
 * @param trust     optional array of promise lines for the trust band
 * @param footnote  the closing legal sentence, tuned per template
 */
function shell({ preheader, purpose, body, trust, footnote }) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <!-- Dark first. Declaring both schemes stops Apple Mail and Outlook.com
         force-inverting the artwork colours, and lets the light-mode courtesy
         below apply cleanly where it is supported. -->
    <meta name="color-scheme" content="dark light" />
    <meta name="supported-color-schemes" content="dark light" />
    <title>RentMe</title>
    <style>
      /* Enhancement only. Nothing here is required for layout or legibility:
         every colour and dimension that matters is inline on the element.
         In light mode the card stays dark on purpose, because the mark is a
         cutout for dark surfaces and the brand is dark first. Only the paper
         behind the card and the text sitting on that paper change, which keeps
         the risk to two declarations. !important is needed because inline
         styles otherwise win. */
      @media (prefers-color-scheme: light) {
        /* Paper white with no blue wash, per the brand canon for light mode.
           body is repainted alongside .rm-canvas because the canvas table is
           only as tall as its content: leaving body navy left a dark strip
           below the footer wherever the message was shorter than the window,
           which read as a rendering fault rather than a design. */
        body { background-color: #F5F6F8 !important; }
        .rm-canvas { background-color: #F5F6F8 !important; }
        .rm-outer-text { color: #3B4477 !important; }
      }
    </style>
  </head>
  <body style="margin:0;padding:0;width:100%;background-color:${BASE};color:${BODY};font-family:${FONT_SANS};-webkit-font-smoothing:antialiased;">
    <!-- Hidden preheader. The trailing entities stop clients pulling body copy
         into the inbox line after it. -->
    <div style="display:none!important;visibility:hidden;opacity:0;height:0;width:0;max-height:0;max-width:0;overflow:hidden;font-size:1px;line-height:1px;color:${BASE};mso-hide:all;">${preheader}&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="rm-canvas" style="width:100%;background-color:${BASE};">
      <tr>
        <td align="center" style="padding:32px 14px 40px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:560px;">

            <!-- Luminous cap. The glow edge of the card, brightest at centre.
                 background-color first: Outlook keeps the solid electric blue. -->
            <tr>
              <td style="height:5px;line-height:5px;font-size:0;background-color:${GLOW};background-image:${GRADIENT_CAP};border-radius:22px 22px 0 0;mso-line-height-rule:exactly;">&nbsp;</td>
            </tr>

            <!-- Edge-lit ring. 1px of padding on a gradient cell is the only
                 email-safe way to draw the lit border the web card gets from a
                 multi-background ring. -->
            <tr>
              <td style="background-color:${EDGE};background-image:${GRADIENT_RING};padding:1px;border-radius:0 0 22px 22px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;background-color:${CARD};border-radius:0 0 21px 21px;">

                  <tr>
                    ${masthead(purpose)}
                  </tr>
                  ${rule()}

                  <tr>
                    <td style="background-color:${CARD};background-image:linear-gradient(180deg,#04042C 0%,${CARD} 38%,#020220 100%);padding:34px 32px 32px;">
                      ${body}
                    </td>
                  </tr>
${
  trust
    ? `                  ${rule()}
                  <tr>
                    ${trustBand(trust)}
                  </tr>
`
    : ""
}                </table>
              </td>
            </tr>

            <!-- Outer footer. Sits on the canvas rather than in the card, so it
                 reads as small print by position as well as by size. -->
            <tr>
              <td style="padding:24px 26px 0;">
                <p class="rm-outer-text" style="margin:0 0 10px;font-family:${FONT_SANS};font-size:12px;line-height:19px;color:${MUTED};">${footnote}</p>
                <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td style="vertical-align:middle;padding-right:8px;">
                      <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
                        <td style="width:16px;height:2px;line-height:2px;font-size:0;background-color:${GLOW};background-image:${GRADIENT_WORDMARK};border-radius:1px;mso-line-height-rule:exactly;">&nbsp;</td>
                      </tr></table>
                    </td>
                    <td style="vertical-align:middle;">
                      <p class="rm-outer-text" style="margin:0;font-family:${FONT_SANS};font-size:12px;line-height:18px;font-weight:600;letter-spacing:0.01em;color:${SUBTLE};">${STRAPLINE}</p>
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
 * The five templates. Each one is written for its own moment, not as the same
 * shell with swapped words: the purpose line, kicker, heading, panels and
 * closing sentence all change with the job the email is doing.
 * ------------------------------------------------------------------------- */

const TRUST_DISCOVERY = [
  "Chats and payments stay inside RentMe, so there is no reason to move a conversation off the platform.",
  "Pay only after you have inspected a place and you are happy with it.",
  "Every listing carries a verified host and a real location before it is published.",
];

const templates = {
  // Confirm signup: a welcome. Warm, forward looking, and it explains what the
  // account unlocks rather than only asking for a click.
  "confirmation.html": {
    preheader: "One tap and your RentMe account is ready to go.",
    purpose: "Welcome to RentMe",
    body:
      kicker("Confirm your email") +
      heading("Your account is one tap away") +
      lede(
        "Confirm this email address and your RentMe account is ready. From there you can discover verified stays, homes, restaurants and experiences right across Nigeria.",
      ) +
      gap(28) +
      cta("Confirm my email", "{{ .ConfirmationURL }}") +
      gap(14) +
      codeBox("Or enter this code") +
      gap(28) +
      valueList([
        {
          title: "Search with confidence.",
          text: "Verified homes, stays and places, mapped to real neighbourhoods.",
        },
        {
          title: "Talk to hosts directly.",
          text: "Every conversation is kept inside RentMe and stays on the record.",
        },
        {
          title: "Save what you love.",
          text: "Build shortlists, follow prices and pick up exactly where you left off.",
        },
      ]) +
      gap(26) +
      fallbackLink("{{ .ConfirmationURL }}"),
    trust: TRUST_DISCOVERY,
    footnote:
      "This confirmation was requested for {{ .Email }}. If it was not you, ignore this message and no account will be activated.",
  },

  // Magic link: quick and frictionless. Short lede, the link first, everything
  // else kept out of the way. The trust line is a single reminder, not a band
  // of three, because the reader is mid sign-in.
  "magic-link.html": {
    preheader: "Your single-use RentMe sign-in link is ready.",
    purpose: "Sign in to RentMe",
    body:
      kicker("One tap, no password") +
      heading("Here is your sign-in link") +
      lede(
        "No password needed. Tap below and you are straight back into RentMe.",
      ) +
      gap(26) +
      cta("Sign in to RentMe", "{{ .ConfirmationURL }}") +
      gap(14) +
      codeBox("Or enter this code") +
      gap(22) +
      para(
        "This link works once and expires shortly, so use it while it is fresh. It signs in the account for {{ .Email }} only.",
      ) +
      gap(24) +
      fallbackLink("{{ .ConfirmationURL }}"),
    trust: [
      "Chats and payments stay inside RentMe. Nobody from RentMe will ever ask you for this link or your password.",
    ],
    footnote:
      "If you did not ask to sign in, ignore this message. The link expires on its own and nothing changes.",
  },

  // Recovery: calm and reassuring. No urgency, no alarm colour, and an explicit
  // panel saying that doing nothing is safe. No trust band here: the only job
  // is getting someone back in without worry.
  "recovery.html": {
    preheader: "A calm way back into your RentMe account.",
    purpose: "Account security",
    body:
      kicker("Password reset") +
      heading("Let us get you back in") +
      lede(
        "It happens. Choose a new password below and you will be back into your RentMe account in a moment.",
      ) +
      gap(28) +
      cta("Choose a new password", "{{ .ConfirmationURL }}") +
      gap(14) +
      codeBox("Or enter this code") +
      gap(26) +
      notePanel({
        title: "Did not request this?",
        text: "Then there is nothing to do. Your current password still works, this link expires by itself, and your account stays exactly as it is.",
      }) +
      gap(24) +
      fallbackLink("{{ .ConfirmationURL }}"),
    footnote:
      "This reset was requested for {{ .Email }}. For your security the link can only be used once.",
  },

  // Email change: a security confirmation. The reader audits the change before
  // approving it, so both addresses are shown in a panel, and the emphasis is
  // on authorising rather than on welcoming.
  "email-change.html": {
    preheader: "Approve the email address change on your RentMe account.",
    purpose: "Security confirmation",
    body:
      kicker("Email address update") +
      heading("Confirm your new email address") +
      lede(
        "A request was made to move your RentMe account to a new email address. Check the details below, then approve the change.",
      ) +
      gap(26) +
      detailPanel([
        ["Current address", "{{ .Email }}"],
        ["New address", "{{ .NewEmail }}"],
      ]) +
      gap(26) +
      cta("Confirm the change", "{{ .ConfirmationURL }}") +
      gap(14) +
      notePanel({
        title: "If you did not request this",
        text: "Do not tap the button. Your address stays as it is until the change is approved. Sign in and update your password, and contact RentMe support if anything still looks wrong.",
      }) +
      gap(24) +
      fallbackLink("{{ .ConfirmationURL }}"),
    trust: [
      "RentMe will never ask you to confirm an account change through a link sent by anyone other than us.",
      "Your sign-in details and your conversations stay inside RentMe.",
    ],
    footnote:
      "This request was made on the account for {{ .Email }}. The change only takes effect once it is confirmed.",
  },

  // Invite: an invitation, so it reads as an offer rather than an instruction.
  // Someone already inside RentMe put this reader's name forward, and the copy
  // is warm about it.
  "invite.html": {
    preheader: "Someone has invited you to join RentMe.",
    purpose: "Your invitation",
    body:
      kicker("Welcome to RentMe") +
      heading("A place on RentMe is waiting") +
      lede(
        "You have been invited to join RentMe, where people across Nigeria find verified homes, stays, restaurants and experiences. Accept below and your account is set up in a moment.",
      ) +
      gap(28) +
      cta("Accept your invitation", "{{ .ConfirmationURL }}") +
      gap(14) +
      valueList([
        {
          title: "Set your own pace.",
          text: "Choose a password, add a photo, and browse as much as you like first.",
        },
        {
          title: "Everything in one place.",
          text: "Listings, conversations and bookings all sit inside your account.",
        },
        {
          title: "Nothing is shared without you.",
          text: "Your details stay private until you choose to reach out to a host.",
        },
      ]) +
      gap(26) +
      para(
        "This invitation was sent to {{ .Email }}. It is personal to you, so please keep the link to yourself.",
      ) +
      gap(24) +
      fallbackLink("{{ .ConfirmationURL }}"),
    trust: TRUST_DISCOVERY,
    footnote:
      "If you were not expecting an invitation, you can ignore this message and no account will be created.",
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
