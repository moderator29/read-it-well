#!/usr/bin/env node
/**
 * Generate the RentMe Supabase auth email templates.
 *
 * Supabase sends one HTML template per auth action (confirm signup, magic link,
 * recovery, email change, invite). Left at their defaults they are plain and
 * unbranded. This script emits all of them from one branded shell so the
 * lockup, colour and glow stay identical across every message and can be
 * regenerated when the brand moves, rather than drifting as five hand-edited
 * files.
 *
 * Output: supabase/templates/*.html. Apply them in the Supabase dashboard under
 * Authentication -> Email Templates, or via the Management API. See
 * supabase/README.md.
 *
 * Email client reality drives every choice here: table layout, fully inline
 * styles, no external CSS, no web fonts (system stack), and a bulletproof
 * button whose electric blue gradient degrades to solid brand blue on Outlook.
 * The wordmark uses gradient-clipped text with a solid blue fallback for the
 * same reason. The logo image points at {{ .SiteURL }}/brand/rentme-logo.png so
 * it resolves once the site is deployed, with the styled wordmark as the alt
 * and visual fallback.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "..", "supabase", "templates");

// Brand constants, sampled from the canonical background artwork. Deep
// navy-black canvas, dark neon blue, electric blue glow. Never purple.
const BASE = "#010118";
const CARD = "#030327";
const EDGE = "#101A55";
const PANEL = "#060640";
const GLOW = "#0C39EF";
const ELECTRIC = "#0010D0";
const TEXT = "#FFFFFF";
const BODY = "#C6CDF2";
const MUTED = "#7C86C2";
const GRADIENT = `linear-gradient(135deg,${GLOW} 0%,#0621E8 55%,${ELECTRIC} 100%)`;
const FONT_SANS =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

/**
 * The shared shell. `body` is the per-template middle: heading, lede, the
 * call-to-action button and any action-specific note.
 */
function shell({ preheader, body }) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="dark" />
    <meta name="supported-color-schemes" content="dark" />
    <title>RentMe</title>
  </head>
  <body style="margin:0;padding:0;background:${BASE};color:${BODY};font-family:${FONT_SANS};">
    <span style="display:none!important;visibility:hidden;opacity:0;height:0;width:0;overflow:hidden;mso-hide:all;">${preheader}</span>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BASE};">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;width:100%;">
            <!-- electric hairline, the glow edge -->
            <tr><td style="height:4px;line-height:4px;font-size:0;background-image:${GRADIENT};background-color:${GLOW};border-radius:20px 20px 0 0;">&nbsp;</td></tr>
            <tr>
              <td style="background:${CARD};border:1px solid ${EDGE};border-top:0;border-radius:0 0 20px 20px;padding:40px 40px 36px;">
                <!-- lockup -->
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="vertical-align:middle;padding-right:12px;">
                      <img src="{{ .SiteURL }}/brand/rentme-logo.png" width="40" height="40" alt="" style="display:block;width:40px;height:40px;border:0;" />
                    </td>
                    <td style="vertical-align:middle;">
                      <span style="font-size:22px;font-weight:700;letter-spacing:-0.02em;color:${GLOW};background-image:${GRADIENT};-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;">RentMe</span>
                    </td>
                  </tr>
                </table>
                <div style="height:28px;line-height:28px;font-size:0;">&nbsp;</div>
                ${body}
              </td>
            </tr>
            <!-- footer -->
            <tr>
              <td style="padding:24px 40px 8px;">
                <p style="margin:0 0 6px;font-size:12px;line-height:18px;color:${MUTED};">
                  You are receiving this because an account action was requested for {{ .Email }}. If this was not you, you can safely ignore this email and no changes will be made.
                </p>
                <p style="margin:0;font-size:12px;line-height:18px;color:${MUTED};">
                  RentMe. Find it. Rent it. Love it.
                </p>
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

/** Bulletproof CTA. Gradient background image over a solid brand blue fallback. */
function button(label, href) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 4px;">
                  <tr>
                    <td align="center" style="border-radius:12px;background-color:${GLOW};background-image:${GRADIENT};">
                      <a href="${href}" target="_blank" style="display:inline-block;padding:14px 30px;font-family:${FONT_SANS};font-size:15px;font-weight:600;color:${TEXT};text-decoration:none;border-radius:12px;">${label}</a>
                    </td>
                  </tr>
                </table>`;
}

function heading(text) {
  return `<h1 style="margin:0 0 14px;font-size:24px;line-height:1.25;font-weight:700;letter-spacing:-0.02em;color:${TEXT};">${text}</h1>`;
}

function lede(text) {
  return `<p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:${BODY};">${text}</p>`;
}

/** Small print with the raw link, for clients that strip the button. */
function fallbackLink(href) {
  return `<p style="margin:22px 0 0;font-size:12px;line-height:1.6;color:${MUTED};">
                  If the button does not work, copy and paste this link into your browser:<br />
                  <a href="${href}" target="_blank" style="color:${BODY};word-break:break-all;">${href}</a>
                </p>`;
}

/** A boxed one-time code, for the flows that also expose {{ .Token }}. */
function codeBox() {
  return `<p style="margin:18px 0 4px;font-size:13px;line-height:1.5;color:${MUTED};">Or enter this code:</p>
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="background:${PANEL};border:1px solid ${EDGE};border-radius:10px;padding:12px 20px;font-family:'SFMono-Regular',Consolas,monospace;font-size:22px;font-weight:700;letter-spacing:0.3em;color:${TEXT};">{{ .Token }}</td>
                  </tr>
                </table>`;
}

const templates = {
  "confirmation.html": {
    preheader: "Confirm your email to finish setting up your RentMe account.",
    body:
      heading("Confirm your email") +
      lede("Welcome to RentMe. Confirm this email address to activate your account and start discovering stays, homes, restaurants and experiences across Nigeria.") +
      button("Confirm email", "{{ .ConfirmationURL }}") +
      codeBox() +
      fallbackLink("{{ .ConfirmationURL }}"),
  },
  "magic-link.html": {
    preheader: "Your RentMe sign-in link.",
    body:
      heading("Sign in to RentMe") +
      lede("Tap the button below to sign in. This link is single-use and expires shortly, so use it soon.") +
      button("Sign in", "{{ .ConfirmationURL }}") +
      codeBox() +
      fallbackLink("{{ .ConfirmationURL }}"),
  },
  "recovery.html": {
    preheader: "Reset your RentMe password.",
    body:
      heading("Reset your password") +
      lede("We received a request to reset the password for your RentMe account. Choose a new password using the button below. If you did not ask for this, ignore this email and your password stays unchanged.") +
      button("Reset password", "{{ .ConfirmationURL }}") +
      codeBox() +
      fallbackLink("{{ .ConfirmationURL }}"),
  },
  "email-change.html": {
    preheader: "Confirm your new email address for RentMe.",
    body:
      heading("Confirm your new email") +
      lede("A request was made to change the email on your RentMe account to {{ .NewEmail }}. Confirm the change with the button below.") +
      button("Confirm change", "{{ .ConfirmationURL }}") +
      fallbackLink("{{ .ConfirmationURL }}"),
  },
  "invite.html": {
    preheader: "You have been invited to RentMe.",
    body:
      heading("You are invited to RentMe") +
      lede("You have been invited to join RentMe. Accept the invitation to set up your account and get started.") +
      button("Accept invitation", "{{ .ConfirmationURL }}") +
      fallbackLink("{{ .ConfirmationURL }}"),
  },
};

mkdirSync(OUT_DIR, { recursive: true });
for (const [name, spec] of Object.entries(templates)) {
  writeFileSync(join(OUT_DIR, name), shell(spec), "utf8");
  process.stdout.write(`wrote supabase/templates/${name}\n`);
}
