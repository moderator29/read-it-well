#!/usr/bin/env node
/**
 * Generate the NaijaFinds Supabase auth email templates.
 *
 * Supabase sends one HTML template per auth action (confirm signup, magic link,
 * recovery, email change, invite). Left at their defaults they are plain and
 * unbranded. This script emits all of them from one branded shell so the
 * lockup, colour and gradient stay identical across every message and can be
 * regenerated when the brand moves, rather than drifting as five hand-edited
 * files.
 *
 * Output: supabase/templates/*.html. Apply them in the Supabase dashboard under
 * Authentication -> Email Templates, or via the Management API. See
 * supabase/README.md.
 *
 * Email client reality drives every choice here: table layout, fully inline
 * styles, no external CSS, no web fonts (system stack), and a bulletproof
 * button whose brand gradient degrades to solid violet on Outlook. The wordmark
 * uses gradient-clipped text with a solid-violet fallback for the same reason.
 * The logo image points at {{ .SiteURL }}/brand/logo.png so it resolves once the
 * site is deployed, with the styled wordmark as the alt and visual fallback.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "..", "supabase", "templates");

// Brand constants, mirrored from packages/design-tokens/src/tokens.css. Kept as
// literals because email HTML cannot read CSS custom properties.
const INK_950 = "#06040E";
const INK_900 = "#0A0718";
const INK_800 = "#151029";
const INK_700 = "#241D42";
const VIOLET_500 = "#8B5CF6";
const MIST_200 = "#E3DEF7";
const MIST_300 = "#C4BCE4";
const MIST_500 = "#7C739F";
const GRADIENT =
  "linear-gradient(90deg,#8B5CF6 0%,#6366F1 18%,#D946A6 42%,#EF4444 62%,#F97316 80%,#FBBF24 100%)";
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
    <title>NaijaFinds</title>
  </head>
  <body style="margin:0;padding:0;background:${INK_950};color:${MIST_200};font-family:${FONT_SANS};">
    <span style="display:none!important;visibility:hidden;opacity:0;height:0;width:0;overflow:hidden;mso-hide:all;">${preheader}</span>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${INK_950};">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;width:100%;">
            <!-- gradient hairline, the stride -->
            <tr><td style="height:4px;line-height:4px;font-size:0;background-image:${GRADIENT};background-color:${VIOLET_500};border-radius:20px 20px 0 0;">&nbsp;</td></tr>
            <tr>
              <td style="background:${INK_900};border:1px solid ${INK_700};border-top:0;border-radius:0 0 20px 20px;padding:40px 40px 36px;">
                <!-- lockup -->
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="vertical-align:middle;padding-right:12px;">
                      <img src="{{ .SiteURL }}/brand/mark.png" width="36" height="36" alt="" style="display:block;width:36px;height:36px;border:0;" />
                    </td>
                    <td style="vertical-align:middle;">
                      <span style="font-size:22px;font-weight:700;letter-spacing:-0.02em;color:${VIOLET_500};background-image:${GRADIENT};-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;">NaijaFinds</span>
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
                <p style="margin:0 0 6px;font-size:12px;line-height:18px;color:${MIST_500};">
                  You are receiving this because an account action was requested for {{ .Email }}. If this was not you, you can safely ignore this email and no changes will be made.
                </p>
                <p style="margin:0;font-size:12px;line-height:18px;color:${MIST_500};">
                  NaijaFinds. Discover Nigeria, and beyond.
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

/** Bulletproof CTA. Gradient background image over a solid violet fallback. */
function button(label, href) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 4px;">
                  <tr>
                    <td align="center" style="border-radius:12px;background-color:${VIOLET_500};background-image:${GRADIENT};">
                      <a href="${href}" target="_blank" style="display:inline-block;padding:14px 30px;font-family:${FONT_SANS};font-size:15px;font-weight:600;color:#0A0718;text-decoration:none;border-radius:12px;">${label}</a>
                    </td>
                  </tr>
                </table>`;
}

function heading(text) {
  return `<h1 style="margin:0 0 14px;font-size:24px;line-height:1.25;font-weight:700;letter-spacing:-0.02em;color:#FFFFFF;">${text}</h1>`;
}

function lede(text) {
  return `<p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:${MIST_300};">${text}</p>`;
}

/** Small print with the raw link, for clients that strip the button. */
function fallbackLink(href) {
  return `<p style="margin:22px 0 0;font-size:12px;line-height:1.6;color:${MIST_500};">
                  If the button does not work, copy and paste this link into your browser:<br />
                  <a href="${href}" target="_blank" style="color:${MIST_300};word-break:break-all;">${href}</a>
                </p>`;
}

/** A boxed one-time code, for the flows that also expose {{ .Token }}. */
function codeBox() {
  return `<p style="margin:18px 0 4px;font-size:13px;line-height:1.5;color:${MIST_500};">Or enter this code:</p>
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="background:${INK_800};border:1px solid ${INK_700};border-radius:10px;padding:12px 20px;font-family:'SFMono-Regular',Consolas,monospace;font-size:22px;font-weight:700;letter-spacing:0.3em;color:#FFFFFF;">{{ .Token }}</td>
                  </tr>
                </table>`;
}

const templates = {
  "confirmation.html": {
    preheader: "Confirm your email to finish setting up your NaijaFinds account.",
    body:
      heading("Confirm your email") +
      lede("Welcome to NaijaFinds. Confirm this email address to activate your account and start discovering stays, homes, restaurants and experiences across Nigeria.") +
      button("Confirm email", "{{ .ConfirmationURL }}") +
      codeBox() +
      fallbackLink("{{ .ConfirmationURL }}"),
  },
  "magic-link.html": {
    preheader: "Your NaijaFinds sign-in link.",
    body:
      heading("Sign in to NaijaFinds") +
      lede("Tap the button below to sign in. This link is single-use and expires shortly, so use it soon.") +
      button("Sign in", "{{ .ConfirmationURL }}") +
      codeBox() +
      fallbackLink("{{ .ConfirmationURL }}"),
  },
  "recovery.html": {
    preheader: "Reset your NaijaFinds password.",
    body:
      heading("Reset your password") +
      lede("We received a request to reset the password for your NaijaFinds account. Choose a new password using the button below. If you did not ask for this, ignore this email and your password stays unchanged.") +
      button("Reset password", "{{ .ConfirmationURL }}") +
      codeBox() +
      fallbackLink("{{ .ConfirmationURL }}"),
  },
  "email-change.html": {
    preheader: "Confirm your new email address for NaijaFinds.",
    body:
      heading("Confirm your new email") +
      lede("A request was made to change the email on your NaijaFinds account to {{ .NewEmail }}. Confirm the change with the button below.") +
      button("Confirm change", "{{ .ConfirmationURL }}") +
      fallbackLink("{{ .ConfirmationURL }}"),
  },
  "invite.html": {
    preheader: "You have been invited to NaijaFinds.",
    body:
      heading("You are invited to NaijaFinds") +
      lede("You have been invited to join NaijaFinds. Accept the invitation to set up your account and get started.") +
      button("Accept invitation", "{{ .ConfirmationURL }}") +
      fallbackLink("{{ .ConfirmationURL }}"),
  },
};

mkdirSync(OUT_DIR, { recursive: true });
for (const [name, spec] of Object.entries(templates)) {
  writeFileSync(join(OUT_DIR, name), shell(spec), "utf8");
  process.stdout.write(`wrote supabase/templates/${name}\n`);
}
