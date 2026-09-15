import { formatDate, formatMoney } from "@naijafinds/i18n";

import {
  DARK,
  FONT_MONO,
  FONT_SANS,
  GLOW,
  GRADIENT,
  GRADIENT_CAP,
  LIGHT,
  LOGO_SIZE,
  MAX_WIDTH,
  PAD_X,
  SIGN_OFF,
  SKY,
} from "./theme";
import { BRAND_ORIGIN } from "@/lib/brand-domain";

/**
 * The Vallo transactional email shell.
 *
 * ONE DESCRIPTION, TWO RENDERINGS.
 *
 * Every message in this system is written once, as a list of blocks, and this
 * module renders that list twice: as HTML for the client that can draw it, and
 * as plain text for the one that cannot. Nothing is written twice by hand,
 * which is the only way the two stay in step. A text alternative maintained
 * separately is a text alternative that is wrong within a month, and a wrong
 * one is worse than none: it is what a screen reader reads, what a text-only
 * client shows, and what a spam filter compares against the HTML.
 *
 * WHY THERE IS A TEXT PART AT ALL, since almost every client renders HTML. A
 * message with no text/plain part scores worse with every major spam filter,
 * because a missing alternative is a bulk-mail signature. On a platform whose
 * emails carry a verification code and a wallet receipt, landing in spam is
 * not a cosmetic failure.
 *
 * LIGHT AND DARK.
 *
 * This shell used to be dark only: `color-scheme: dark`, a navy canvas, and
 * light text baked into inline styles. In a light-mode inbox that is a black
 * rectangle sitting among white ones, and in the clients that force their own
 * inversion it becomes an unpredictable third thing.
 *
 * So the HTML is now light by default and dark by preference. The mechanics
 * are the ones email actually supports rather than the ones a browser would
 * use. Inline styles carry the light palette, because inline is the only thing
 * every client honours. A `<style>` block in the head carries a
 * `prefers-color-scheme: dark` override, and every rule in it is `!important`,
 * because a stylesheet rule cannot otherwise beat an inline attribute. Clients
 * that strip `<style>` (older Outlook, some webmail) get the light version,
 * which is a complete and correct email rather than a degraded one.
 *
 * `color-scheme: light dark` tells Apple Mail and iOS not to invert anything
 * themselves, which is what stops a hand-built dark palette being inverted
 * back into a light one that nobody designed.
 *
 * NO TEXT IN IMAGES, ANYWHERE. The only image in the shell is the logo mark,
 * and it carries no words: the wordmark beside it is live text. An image with
 * copy baked into it is unreadable with images off, which is the default in a
 * large share of inboxes, and it is unreadable to a screen reader always.
 *
 * NO EMOJI as section markers, headings or bullets. They render as tofu in
 * some clients, as a colour glyph the design did not choose in others, and
 * they are read aloud in full by a screen reader in the middle of a sentence
 * about money.
 *
 * Everything interpolated goes through escapeHtml first: listing titles, names
 * and references come from the database or a form, and a stray angle bracket
 * must never be able to reshape the markup.
 *
 * THE PALETTE, THE TYPE STACK AND THE MEASUREMENTS ALL LIVE IN `theme.ts`,
 * which is also what `scripts/build-auth-emails.mjs` mirrors, so the first
 * email somebody ever gets from Vallo and the twentieth are the same design.
 * That file explains at length why literal hex is correct in an email and must
 * not be "fixed" into a CSS custom property.
 */

/** The site the emails link back to. Absolute, no trailing slash. */
const DEFAULT_SITE_URL = BRAND_ORIGIN;

export function siteUrl(): string {
  const configured = (process.env.NEXT_PUBLIC_SITE_URL ?? "").trim();
  const base = configured.length > 0 ? configured : DEFAULT_SITE_URL;
  return base.replace(/\/+$/, "");
}

/** An absolute URL for an in-app path such as "/wallet". */
export function appUrl(path: string): string {
  return siteUrl() + (path.startsWith("/") ? path : "/" + path);
}

/** Escape text for HTML. Every interpolated value passes through here. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/* -------------------------------------------------------------- formatting */

/**
 * Money for humans. Integer kobo in, naira out, always through formatMoney so
 * a raw minor-unit integer can never reach a reader. formatMoney renders whole
 * naira; when an amount carries kobo they are appended, so a receipt stays
 * exact to the last kobo rather than quietly rounding.
 */
export function money(minor: number): string {
  const abs = Math.abs(Math.trunc(minor));
  const kobo = abs % 100;
  const whole = formatMoney(abs - kobo);
  const signed = minor < 0 ? "-" + whole : whole;
  if (kobo === 0) return signed;
  return signed + "." + String(kobo).padStart(2, "0");
}

/** An ISO date (YYYY-MM-DD) as "3 Aug 2026". Read at midday UTC so the
 * calendar day never slips a day either side of the date line. */
export function prettyDate(isoDate: string): string {
  const parsed = new Date(isoDate + "T12:00:00Z");
  if (Number.isNaN(parsed.getTime())) return isoDate;
  return formatDate(parsed);
}

/** "3 Aug 2026 to 7 Aug 2026", the one date phrase every stay email uses. */
export function dateRange(checkIn: string, checkOut: string): string {
  return prettyDate(checkIn) + " to " + prettyDate(checkOut);
}

/**
 * A name we can greet somebody by, or null.
 *
 * THE BUG THIS EXISTS TO MAKE IMPOSSIBLE is "Hello ,". It happens the moment
 * a template interpolates a name that turned out to be an empty string, and it
 * is the single clearest signal an email can send that nobody is home. This
 * platform has three ways to arrive at one: a profile whose full_name was
 * never filled in, an OAuth provider that returned no name, and a signed-out
 * support ticket where the name field was submitted blank.
 *
 * Four rules, in order:
 *   1. Trim, and treat whitespace-only as absent.
 *   2. Reject anything that is an email address. Supabase's own metadata falls
 *      back to the address when a provider gives no name, so "Hello
 *      ada.obi@gmail.com" is a real thing this would otherwise print.
 *   3. First token only. "Adaeze Chinwe Obi" greets as "Adaeze", because a
 *      greeting is a first name and reading somebody their own full legal name
 *      back at them is what a bank letter does.
 *   4. Cap the length, so a pasted paragraph in a name field cannot become the
 *      subject line.
 */
export function greetingName(name?: string | null): string | null {
  const trimmed = (name ?? "").trim();
  if (trimmed.length === 0) return null;
  if (trimmed.includes("@")) return null;
  const first = trimmed.split(/\s+/)[0] ?? "";
  if (first.length === 0) return null;
  return first.length > 40 ? first.slice(0, 40) : first;
}

/**
 * "Hello Ada." or, with no usable name, "Hello there."
 *
 * The fallback is a real greeting rather than a bare "Hello." followed by a
 * sentence, because "Hello." on its own reads as a stub somebody forgot to
 * finish, which is the same impression "Hello ," gives for the same reason.
 */
export function hello(name?: string | null): string {
  const first = greetingName(name);
  return first === null ? "Hello there." : `Hello ${first}.`;
}

/* ------------------------------------------------------------------ blocks */

export type ReceiptRow = {
  label: string;
  value: string;
  /** Emphasise this row: the total line of a receipt, or a new balance. */
  strong?: boolean;
};

/**
 * One piece of a message.
 *
 * Deliberately a small closed set. Every block here renders sensibly in both
 * HTML and plain text, and a block that cannot is a block that does not
 * belong in an email: there is no "column", no "card grid" and no "image with
 * copy on it", because none of those survives the trip.
 */
export type Block =
  | { kind: "heading"; text: string }
  | { kind: "paragraph"; text: string }
  | { kind: "bullets"; items: readonly string[] }
  | { kind: "rows"; rows: readonly ReceiptRow[] }
  | { kind: "button"; label: string; href: string }
  /** A short value to be read out or typed in: a code, a reference. */
  | { kind: "code"; value: string }
  | { kind: "note"; text: string };

/** Convenience constructors, so a message reads as prose rather than as JSON. */
export const heading = (text: string): Block => ({ kind: "heading", text });
export const paragraph = (text: string): Block => ({ kind: "paragraph", text });
export const bullets = (items: readonly string[]): Block => ({ kind: "bullets", items });
export const rows = (list: readonly ReceiptRow[]): Block => ({ kind: "rows", rows: list });
export const button = (label: string, href: string): Block => ({ kind: "button", label, href });
export const code = (value: string): Block => ({ kind: "code", value });
export const note = (text: string): Block => ({ kind: "note", text });

/**
 * Drop the blocks that turned out to have nothing in them.
 *
 * A message often has an optional half: gate details the host never recorded,
 * a reason nobody typed. Building the list with `...(x ? [block(x)] : [])` at
 * every site is noise, so a message may pass null and this removes it. An
 * empty rows block is removed too: a panel with no rows in it renders as a
 * bordered box containing nothing, which reads as a bug and, worse, reads as
 * though the answer were "none".
 */
function usable(blocks: readonly (Block | null | undefined | false)[]): Block[] {
  const out: Block[] = [];
  for (const block of blocks) {
    if (!block) continue;
    if (block.kind === "rows" && block.rows.length === 0) continue;
    if (block.kind === "bullets" && block.items.length === 0) continue;
    out.push(block);
  }
  return out;
}

/* -------------------------------------------------------------- html parts */

function htmlBlock(block: Block): string {
  switch (block.kind) {
    case "heading":
      // font-family is repeated on the h1 because several clients reset heading
      // fonts to a serif default and inheritance from body does not save it.
      return `<h1 class="rm-title" style="margin:0 0 16px;font-family:${FONT_SANS};font-size:27px;line-height:1.22;font-weight:700;letter-spacing:-0.022em;color:${LIGHT.text};">${escapeHtml(block.text)}</h1>`;

    case "paragraph":
      return `<p class="rm-body" style="margin:0 0 20px;font-family:${FONT_SANS};font-size:16px;line-height:1.65;color:${LIGHT.body};">${escapeHtml(block.text)}</p>`;

    case "bullets": {
      const items = block.items
        .map(
          (item) =>
            `<li style="margin:0 0 10px;padding-left:2px;">${escapeHtml(item)}</li>`,
        )
        .join("\n                    ");
      return `<ul class="rm-body" style="margin:0 0 22px;padding:0 0 0 22px;font-family:${FONT_SANS};font-size:16px;line-height:1.65;color:${LIGHT.body};">
                    ${items}
                  </ul>`;
    }

    case "rows": {
      // The panel's padding lives on a cell, not on the table: Outlook drops
      // padding declared on a table element, which would push the rows flush
      // against the border.
      const cells = block.rows
        .map((row, index) => {
          const top = index === 0 ? "0" : `1px solid ${LIGHT.edge}`;
          const valueColour = row.strong ? LIGHT.text : LIGHT.body;
          const valueWeight = row.strong ? "700" : "500";
          const valueClass = row.strong ? "rm-title" : "rm-body";
          // The label column is held at 40% so a long value wraps inside its
          // own cell instead of squeezing the label to one word per line.
          return `<tr>
                          <td width="40%" class="rm-muted rm-rule" style="width:40%;padding:13px 12px 13px 0;border-top:${top};font-family:${FONT_SANS};font-size:13px;line-height:1.5;vertical-align:top;color:${LIGHT.muted};">${escapeHtml(row.label)}</td>
                          <td align="right" class="${valueClass} rm-rule" style="padding:13px 0;border-top:${top};font-family:${FONT_SANS};font-size:15px;line-height:1.5;font-weight:${valueWeight};vertical-align:top;color:${valueColour};">${escapeHtml(row.value)}</td>
                        </tr>`;
        })
        .join("\n                        ");

      return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;margin:0 0 26px;">
                    <tr>
                      <td class="rm-panel" style="background:${LIGHT.panel};border:1px solid ${LIGHT.edge};border-radius:16px;padding:6px 22px;">
                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;">
                          ${cells}
                        </table>
                      </td>
                    </tr>
                  </table>`;
    }

    case "button":
      /*
       * Bulletproof, in the specific sense the word has in email.
       *
       * The gradient is a background IMAGE over a solid brand blue declared
       * FIRST, so Outlook's Word engine, which drops background images and
       * keeps colours, still draws a blue button with white text rather than
       * white text on nothing.
       *
       * The padding is on the anchor rather than on the cell, so the whole pill
       * is a tap target on a phone, which is where most of these are opened.
       * mso-padding-alt repeats the geometry for Word, which ignores padding on
       * an inline-block.
       *
       * The colour is written #FFFFFF rather than through the palette because
       * it is the text ON the brand blue in both schemes, not a themed value.
       */
      return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:10px 0 6px;">
                    <tr>
                      <td align="center" style="border-radius:14px;background-color:${GLOW};background-image:${GRADIENT};mso-padding-alt:16px 34px;">
                        <a href="${escapeHtml(block.href)}" target="_blank" style="display:inline-block;padding:16px 34px;font-family:${FONT_SANS};font-size:16px;line-height:20px;font-weight:600;letter-spacing:-0.01em;color:#FFFFFF;text-decoration:none;border-radius:14px;">${escapeHtml(block.label)}</a>
                      </td>
                    </tr>
                  </table>`;

    case "code":
      // Letter-spacing pushes the last glyph off centre, so text-indent puts
      // the same amount back on the left. Without it a six figure code reads
      // as though it were nudged right, which is the sort of thing somebody
      // notices without being able to say why.
      return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;margin:0 0 26px;">
                    <tr>
                      <td align="center" class="rm-panel rm-title" style="background:${LIGHT.panel};border:1px solid ${LIGHT.edge};border-radius:16px;padding:20px 16px;font-family:${FONT_MONO};font-size:26px;line-height:32px;font-weight:700;letter-spacing:0.2em;text-indent:0.2em;color:${LIGHT.text};">${escapeHtml(block.value)}</td>
                    </tr>
                  </table>`;

    case "note":
      return `<p class="rm-muted" style="margin:22px 0 0;font-family:${FONT_SANS};font-size:13px;line-height:1.6;color:${LIGHT.muted};">${escapeHtml(block.text)}</p>`;
  }
}

/* -------------------------------------------------------------- text parts */

/** Wrap to a readable measure. Long URLs are left whole so they stay clickable. */
function wrap(text: string, width = 72): string {
  const words = text.split(/\s+/).filter((w) => w.length > 0);
  const lines: string[] = [];
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

function textBlock(block: Block): string {
  switch (block.kind) {
    case "heading":
      // Underlined with dashes rather than shouted in capitals: a screen
      // reader spells out an all-caps word letter by letter.
      return `${block.text}\n${"-".repeat(Math.min(block.text.length, 72))}`;

    case "paragraph":
      return wrap(block.text);

    case "bullets":
      return block.items.map((item) => wrap(`- ${item}`)).join("\n");

    case "rows":
      // "Label: value", one per line. Not column-aligned: alignment padding
      // depends on a monospaced font, and a proportional one turns it into
      // ragged nonsense.
      return block.rows.map((row) => `${row.label}: ${row.value}`).join("\n");

    case "button":
      return `${block.label}:\n${block.href}`;

    case "code":
      return block.value;

    case "note":
      return wrap(block.text);
  }
}

/* ------------------------------------------------------------------- shell */

export type ComposeOptions = {
  /** The inbox preview line. Never rendered in the body. Required. */
  preheader: string;
  /** The message, block by block. Nulls are dropped. */
  blocks: readonly (Block | null | undefined | false)[];
  /** Muted footer lines above the sign-off. Plain text, escaped here. */
  footerLines?: readonly string[];
};

export type Composed = {
  html: string;
  /** The text/plain alternative. Always present, always from the same blocks. */
  text: string;
};

/**
 * The dark override.
 *
 * Every declaration is `!important` because it has to beat an inline style
 * attribute, and there is no other way round that in email. Classes rather
 * than element selectors, so a client that supports the media query but has
 * rewritten the markup still matches.
 */
const DARK_STYLE = `
      :root { color-scheme: light dark; supported-color-schemes: light dark; }
      @media (prefers-color-scheme: dark) {
        .rm-base   { background: ${DARK.base} !important; }
        .rm-card   { background: ${DARK.card} !important; border-color: ${DARK.edge} !important; }
        .rm-panel  { background: ${DARK.panel} !important; border-color: ${DARK.edge} !important; }
        .rm-title  { color: ${DARK.text} !important; }
        .rm-body   { color: ${DARK.body} !important; }
        .rm-muted  { color: ${DARK.muted} !important; }
        .rm-rule   { border-top-color: ${DARK.edge} !important; }
        .rm-brand  { color: ${SKY} !important; }
      }`;

/**
 * Render one message, twice.
 *
 * The HTML is a table layout with fully inline styles, no external stylesheet
 * and no web fonts, because that is what survives Outlook, Gmail's clipping
 * and every webmail in between. The text is the same blocks in the same order.
 */
export function compose(options: ComposeOptions): Composed {
  const blocks = usable(options.blocks);
  const footerLines = options.footerLines ?? [];

  const body = blocks.map(htmlBlock).join("\n                ");

  const footer = footerLines
    .map(
      (line) =>
        `<p class="rm-muted" style="margin:0 0 8px;font-family:${FONT_SANS};font-size:13px;line-height:20px;color:${LIGHT.muted};">${escapeHtml(line)}</p>`,
    )
    .join("\n                ");

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="light dark" />
    <meta name="supported-color-schemes" content="light dark" />
    <title>Vallo</title>
    <style>${DARK_STYLE}
    </style>
  </head>
  <body class="rm-base" style="margin:0;padding:0;width:100%;background:${LIGHT.base};color:${LIGHT.body};font-family:${FONT_SANS};-webkit-font-smoothing:antialiased;">
    <!-- The hidden inbox line. The trailing spacer entities stop a client
         pulling the first sentence of body copy in after it, so what the
         reader sees beside the subject is a line somebody wrote. -->
    <span style="display:none!important;visibility:hidden;opacity:0;height:0;width:0;max-height:0;max-width:0;overflow:hidden;font-size:1px;line-height:1px;mso-hide:all;">${escapeHtml(options.preheader)}&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;</span>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="rm-base" style="width:100%;background:${LIGHT.base};">
      <tr>
        <td align="center" style="padding:36px 16px 44px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:${MAX_WIDTH}px;width:100%;">
            <!-- The glow edge: a luminous rule capping the card, brightest at
                 its centre. background-color before background-image, so
                 Outlook keeps a solid electric blue instead of nothing. -->
            <tr><td style="height:4px;line-height:4px;font-size:0;background-color:${GLOW};background-image:${GRADIENT_CAP};border-radius:20px 20px 0 0;mso-line-height-rule:exactly;">&nbsp;</td></tr>
            <tr>
              <td class="rm-card" style="background:${LIGHT.card};border:1px solid ${LIGHT.edge};border-top:0;border-radius:0 0 20px 20px;padding:${PAD_X}px ${PAD_X}px 36px;">
                <!-- The lockup. The mark is an image and carries NO words, so
                     its alt is deliberately empty: the wordmark beside it is
                     live text. With images blocked a reader sees "Vallo" once,
                     in brand blue, rather than "Vallo Vallo" or a broken
                     image icon where the brand should be. -->
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="vertical-align:middle;padding-right:12px;">
                      <img src="${siteUrl()}/brand/vallo-mark.png" width="${LOGO_SIZE}" height="${LOGO_SIZE}" alt="" style="display:block;width:${LOGO_SIZE}px;height:${LOGO_SIZE}px;border:0;outline:none;text-decoration:none;" />
                    </td>
                    <td style="vertical-align:middle;">
                      <span class="rm-brand" style="font-family:${FONT_SANS};font-size:23px;line-height:28px;font-weight:700;letter-spacing:-0.025em;color:${GLOW};">Vallo</span>
                    </td>
                  </tr>
                </table>
                <div style="height:32px;line-height:32px;font-size:0;mso-line-height-rule:exactly;">&nbsp;</div>
                ${body}
              </td>
            </tr>
            <!-- The footer sits on the canvas OUTSIDE the card, so it reads as
                 small print by position as well as by size. -->
            <tr>
              <td style="padding:26px ${PAD_X - 12}px 0;">
                ${footer}
                <table role="presentation" cellpadding="0" cellspacing="0" style="margin:12px 0 0;">
                  <tr>
                    <td style="vertical-align:middle;padding-right:9px;">
                      <table role="presentation" cellpadding="0" cellspacing="0"><tr>
                        <td style="width:18px;height:2px;line-height:2px;font-size:0;background-color:${GLOW};background-image:${GRADIENT};border-radius:1px;mso-line-height-rule:exactly;">&nbsp;</td>
                      </tr></table>
                    </td>
                    <td style="vertical-align:middle;">
                      <p class="rm-muted" style="margin:0;font-family:${FONT_SANS};font-size:13px;line-height:20px;font-weight:600;color:${LIGHT.muted};">${SIGN_OFF}</p>
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

  /*
   * The text part.
   *
   * The preheader is NOT repeated at the top: in HTML it is a hidden preview
   * line, and in text there is nothing to preview because the reader is
   * already looking at the whole message. Repeating it would print the same
   * sentence twice.
   */
  const text =
    [
      "Vallo",
      "",
      blocks.map(textBlock).join("\n\n"),
      "",
      ...(footerLines.length > 0 ? [footerLines.map((l) => wrap(l)).join("\n"), ""] : []),
      SIGN_OFF,
      siteUrl(),
    ].join("\n") + "\n";

  return { html, text };
}
