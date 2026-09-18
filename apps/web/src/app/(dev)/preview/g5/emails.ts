import { readFileSync } from "node:fs";
import { join } from "node:path";

import { EVERY_MESSAGE } from "@/lib/email/fixtures";
import { siteUrl } from "@/lib/email/render";

/**
 * Every email the product can send, rendered for the harness.
 *
 * Two sources. The five Supabase auth templates are read from
 * `supabase/templates`, which is what the generator writes and what the
 * dashboard is pasted from, so the harness shows the file that ships rather
 * than a re-rendering of it. The transactional catalogue comes from the same
 * fixture matrix the tests render, so the harness and the specs look at one
 * list.
 *
 * Placeholders are filled with obviously invented values so the frame reads
 * as an email rather than as a template. The site origin is rewritten to the
 * harness's own so the lockup loads from this dev server: an `srcdoc` frame
 * resolves relative URLs against the page that holds it.
 */

export type PreviewEmail = {
  slug: string;
  label: string;
  subject: string;
  html: string;
  text: string;
};

const TEMPLATE_DIR = join(process.cwd(), "..", "..", "supabase", "templates");

const AUTH: readonly { slug: string; label: string; subject: string }[] = [
  { slug: "confirmation", label: "Auth: confirm sign-up", subject: "Confirm your email address" },
  { slug: "magic-link", label: "Auth: magic link", subject: "Your Vallo sign-in link" },
  { slug: "recovery", label: "Auth: password reset", subject: "Set a new Vallo password" },
  { slug: "email-change", label: "Auth: email change", subject: "Confirm your new address" },
  { slug: "invite", label: "Auth: invitation", subject: "You have been invited to Vallo" },
];

function fillAuth(source: string): string {
  return source
    .replace(/\{\{ \.SiteURL \}\}/g, "")
    .replace(/\{\{ \.ConfirmationURL \}\}/g, "https://vallo.ng/auth/confirm?token_hash=example")
    .replace(/\{\{ \.Token \}\}/g, "482913")
    .replace(/\{\{ \.NewEmail \}\}/g, "ada.obi@example.com")
    .replace(/\{\{ \.Email \}\}/g, "ada@example.com");
}

function readTemplate(name: string): string | null {
  try {
    return readFileSync(join(TEMPLATE_DIR, name), "utf8");
  } catch {
    return null;
  }
}

/** The origin `render.ts` baked into the message, swapped for the harness's. */
function relocate(html: string): string {
  return html.split(siteUrl()).join("");
}

export function previewEmails(): PreviewEmail[] {
  const auth: PreviewEmail[] = [];
  for (const { slug, label, subject } of AUTH) {
    const html = readTemplate(`${slug}.html`);
    const text = readTemplate(`${slug}.txt`);
    if (html === null) continue;
    auth.push({ slug, label, subject, html: fillAuth(html), text: fillAuth(text ?? "") });
  }

  const catalogue: PreviewEmail[] = EVERY_MESSAGE.map(({ name, message }) => ({
    slug: name.replace(/[^a-z0-9]+/gi, "-").toLowerCase(),
    label: `Catalogue: ${name}`,
    subject: message.subject,
    html: relocate(message.html),
    text: message.text,
  }));

  return [...auth, ...catalogue];
}

export function previewEmail(slug: string | undefined): PreviewEmail | null {
  const all = previewEmails();
  if (!slug) return all[0] ?? null;
  return all.find((email) => email.slug === slug) ?? null;
}
