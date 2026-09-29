import { formatDate, formatMoney } from "@vallo/i18n/core";

import {
  BRAND,
  BUTTON_GLOW,
  BUTTON_GRADIENT,
  DARK,
  FONT_MONO,
  FONT_SANS,
  GRADIENT_CAP,
  HEADER,
  LEGAL_LINE,
  LOCKUP_HEIGHT,
  LOCKUP_PATH,
  LOCKUP_WIDTH,
  MAX_WIDTH,
  PAD_X,
  SIGN_OFF,
  SKY,
  WORDMARK_ALT,
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
 * DARK, LIKE THE PRODUCT (29 September 2026, founder ruling).
 *
 * Every message is the product's own dark mode: a navy ground, one deep navy
 * card with a hairline edge, the lockup on its navy band under a luminous
 * brand-blue rule, then one headline, short body copy, at most one primary
 * button and the secondary facts in an inset panel, then a footer on the
 * ground with the support and legal links. Table layout, every colour inline
 * on the element it paints and repeated as a `bgcolor` attribute for
 * Outlook's Word engine.
 *
 * READABLE WHATEVER THE READER'S CLIENT DOES WITH DARK MODE. The inline layer
 * is dark and complete, and the document declares `color-scheme: dark` so
 * Apple Mail and iOS Mail render it as written instead of inverting it.
 * Clients that run their own pass anyway (Gmail's iOS app can invert a whole
 * message) are handled by the palette itself: every ink keeps AA against its
 * ground both as written and inverted. `theme.ts` carries the palette and the
 * measurements, and `email-dark-paint.test.ts` holds every message to it.
 *
 * NO WORDS IN IMAGES BEYOND THE BRAND'S OWN. The shell carries one image,
 * the lockup, whose alt is the brand name, so with images off the reader sees
 * "Vallo" once, in its place. Every other word is live text. Copy baked into
 * a picture is unreadable with images off, which is the default in a large
 * share of inboxes, and unreadable to a screen reader always.
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
/**
 * EVERY SURFACE PAINTS ITS OWN GROUND, EXPLICITLY (track H, 25 September 2026).
 *
 * The shell's dark was carried by three layers: a `bgcolor` on the body and
 * the card, inline `background:` shorthands, and the `rm-*` classes under a
 * dark media query. Gmail strips the media query and runs its own dark pass,
 * Outlook's Word engine reads `bgcolor` and not the shorthand, and a cell with
 * no colour of its own takes whatever the client decides. So after a message
 * is composed, this walks every body, table, row and cell and makes the colour
 * explicit on each one, in BOTH forms every client honours:
 *
 *   - its own colour, from `background-color`, `background:` or `bgcolor`,
 *     written out as a `bgcolor` attribute AND an inline `background-color`;
 *   - or, where it has none, its container's colour, written the same way.
 *
 * So no cell ever relies on a class, and nothing inherits a white from the
 * client.
 *
 * AND THE GROUND CLASS TRAVELS WITH THE GROUND (29 September 2026). The
 * style block re-asserts the palette by class for the clients that restyle
 * by scheme, so a cell that inherits its colour also inherits the container's
 * `rm-base`, `rm-card`, `rm-panel` or `rm-head` class, and the two are always
 * repainted together rather than a cell being left behind. The mirror of this function lives in `scripts/build-auth-emails.mjs`
 * (a Node script that cannot import TypeScript); `email-dark-paint.test.ts`
 * checks the output of both.
 */
export function paintExplicit(html: string): string {
  const stack: { tag: string; bg: string | null; cls: string | null }[] = [];
  const HEX = /#[0-9a-fA-F]{6}\b/;
  const GROUND_CLASS = /\brm-(base|card|panel|head)\b/;
  return html.replace(/<(\/?)(body|table|tr|td)\b([^>]*)>/gi, (whole, close: string, rawTag: string, attrs: string) => {
    const tag = rawTag.toLowerCase();
    if (close) {
      for (let i = stack.length - 1; i >= 0; i--) {
        if (stack[i]!.tag === tag) {
          stack.length = i;
          break;
        }
      }
      return whole;
    }
    const style = /\bstyle="([^"]*)"/i.exec(attrs)?.[1] ?? null;
    const classAttr = /\bclass="([^"]*)"/i.exec(attrs)?.[1] ?? null;
    const own =
      (style && /background-color\s*:\s*(#[0-9a-fA-F]{6})/i.exec(style)?.[1]) ||
      (style && /background\s*:\s*(#[0-9a-fA-F]{6})/i.exec(style)?.[1]) ||
      /\bbgcolor="(#[0-9a-fA-F]{6})"/i.exec(attrs)?.[1] ||
      null;
    const parent = [...stack].reverse().find((s) => s.bg) ?? null;
    const bg = own ?? parent?.bg ?? null;
    /* The ground class travels with the ground. A cell with its own colour
       keeps its own class (or none: a button is blue in both schemes); a cell
       that only inherits a colour inherits the class that colour came with,
       so the dark scheme repaints it together with its container. */
    const ownClass = classAttr ? (GROUND_CLASS.exec(classAttr)?.[0] ?? null) : null;
    const cls = own ? ownClass : (ownClass ?? parent?.cls ?? null);
    stack.push({ tag, bg, cls });
    if (!bg || tag === "tr" || !HEX.test(bg)) return whole;
    /* Appended, never prepended: every existing attribute keeps its place,
       so a reader (or a test) looking for `<table role="presentation" ...`
       still finds it. A trailing "/" of a self-closing form stays last. */
    let next = attrs.replace(/\s*\/?\s*$/, "");
    const selfClose = /\/\s*$/.test(attrs) ? " /" : "";
    if (!/\bbgcolor="/i.test(next)) next += ` bgcolor="${bg}"`;
    if (style === null) next += ` style="background-color:${bg};"`;
    else if (!/background-color\s*:/i.test(style)) {
      const sep = style.trim().length === 0 || style.trim().endsWith(";") ? "" : ";";
      next = next.replace(/\bstyle="([^"]*)"/i, `style="$1${sep}background-color:${bg};"`);
    }
    if (!own && cls && !ownClass) {
      if (classAttr === null) next += ` class="${cls}"`;
      else next = next.replace(/\bclass="([^"]*)"/i, `class="$1 ${cls}"`);
    }
    return `<${rawTag}${next}${selfClose}>`;
  });
}

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
  | {
      kind: "button";
      label: string;
      href: string;
      /**
       * Print the destination underneath, selectable, as well as linking it.
       *
       * For the messages whose button IS the message: a password reset has no
       * other way in, so a stripped or mangled anchor is a dead end rather
       * than an inconvenience. Corporate mail gateways rewrite links, some
       * clients refuse a link in a message they score as suspicious, and a
       * reader forwarding to a desktop loses the tap entirely.
       */
      showUrl?: boolean;
    }
  /** A short value to be read out or typed in: a code, a reference. */
  | { kind: "code"; value: string }
  | { kind: "note"; text: string };

/** Convenience constructors, so a message reads as prose rather than as JSON. */
export const heading = (text: string): Block => ({ kind: "heading", text });
export const paragraph = (text: string): Block => ({ kind: "paragraph", text });
export const bullets = (items: readonly string[]): Block => ({ kind: "bullets", items });
export const rows = (list: readonly ReceiptRow[]): Block => ({ kind: "rows", rows: list });
export const button = (label: string, href: string, showUrl?: boolean): Block =>
  showUrl ? { kind: "button", label, href, showUrl } : { kind: "button", label, href };
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
      return `<h1 class="rm-title" style="margin:0 0 16px;font-family:${FONT_SANS};font-size:27px;line-height:1.22;font-weight:700;letter-spacing:-0.022em;color:${DARK.text};">${escapeHtml(block.text)}</h1>`;

    case "paragraph":
      return `<p class="rm-body" style="margin:0 0 20px;font-family:${FONT_SANS};font-size:16px;line-height:1.65;color:${DARK.body};">${escapeHtml(block.text)}</p>`;

    case "bullets": {
      const items = block.items
        .map(
          (item) =>
            `<li class="rm-body" style="margin:0 0 10px;padding-left:2px;color:${DARK.body};">${escapeHtml(item)}</li>`,
        )
        .join("\n                    ");
      return `<ul class="rm-body" style="margin:0 0 22px;padding:0 0 0 22px;font-family:${FONT_SANS};font-size:16px;line-height:1.65;color:${DARK.body};">
                    ${items}
                  </ul>`;
    }

    case "rows": {
      // The panel's padding lives on a cell, not on the table: Outlook drops
      // padding declared on a table element, which would push the rows flush
      // against the border.
      const cells = block.rows
        .map((row, index) => {
          const top = index === 0 ? "0" : `1px solid ${DARK.edge}`;
          const valueColour = row.strong ? DARK.text : DARK.body;
          const valueWeight = row.strong ? "700" : "500";
          const valueClass = row.strong ? "rm-title" : "rm-body";
          // The label column is held at 40% so a long value wraps inside its
          // own cell instead of squeezing the label to one word per line.
          return `<tr>
                          <td width="40%" class="rm-muted rm-rule" style="width:40%;padding:13px 12px 13px 0;border-top:${top};font-family:${FONT_SANS};font-size:13px;line-height:1.5;vertical-align:top;color:${DARK.muted};">${escapeHtml(row.label)}</td>
                          <td align="right" class="${valueClass} rm-rule" style="padding:13px 0;border-top:${top};font-family:${FONT_SANS};font-size:15px;line-height:1.5;font-weight:${valueWeight};vertical-align:top;color:${valueColour};">${escapeHtml(row.value)}</td>
                        </tr>`;
        })
        .join("\n                        ");

      return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;margin:0 0 26px;">
                    <tr>
                      <td class="rm-panel" style="background:${DARK.panel};border:1px solid ${DARK.edge};border-radius:16px;padding:6px 22px;">
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
       * The padding is on the anchor rather than on the cell, so the whole
       * button is a tap target on a phone, which is where most of these are
       * opened. mso-padding-alt repeats the geometry for Word, which ignores
       * padding on an inline-block.
       *
       * IT IS A ROUNDED RECTANGLE AND NEVER A CAPSULE. 14px of radius on a
       * 52px tall button is a ratio of 0.27 against the short side, well under
       * the 0.5 that makes a capsule however it was spelled, and 14px is
       * --nf-radius-control. Classic Outlook drops the radius and draws a
       * rectangle, which is a squarer version of the same shape rather than a
       * broken one, so the shape law holds in every client.
       *
       * The colour is written #FFFFFF rather than through the palette because
       * it is the text ON the brand blue in both schemes, not a themed value.
       */
      return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:12px 0 24px;">
                    <tr>
                      <td align="center" style="border-radius:14px;background-color:${BRAND};background-image:${BUTTON_GRADIENT};box-shadow:${BUTTON_GLOW};mso-padding-alt:16px 34px;">
                        <a href="${escapeHtml(block.href)}" target="_blank" style="display:inline-block;padding:16px 34px;font-family:${FONT_SANS};font-size:16px;line-height:20px;font-weight:600;letter-spacing:-0.01em;color:#FFFFFF;text-decoration:none;border-radius:14px;">${escapeHtml(block.label)}</a>
                      </td>
                    </tr>
                  </table>${
                    block.showUrl
                      ? `
                  <p class="rm-muted" style="margin:0 0 6px;font-family:${FONT_SANS};font-size:13px;line-height:1.6;color:${DARK.muted};">If the button does not work, copy this address into your browser:</p>
                  <p class="rm-link" style="margin:0 0 20px;font-family:${FONT_MONO};font-size:13px;line-height:1.6;word-break:break-all;color:${SKY};">${escapeHtml(block.href)}</p>`
                      : ""
                  }`;

    case "code":
      // Letter-spacing pushes the last glyph off centre, so text-indent puts
      // the same amount back on the left. Without it a six figure code reads
      // as though it were nudged right, which is the sort of thing somebody
      // notices without being able to say why.
      return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;margin:0 0 26px;">
                    <tr>
                      <td align="center" class="rm-panel rm-title" style="background:${DARK.panel};border:1px solid ${DARK.edge};border-radius:16px;padding:20px 16px;font-family:${FONT_MONO};font-size:26px;line-height:32px;font-weight:700;letter-spacing:0.2em;text-indent:0.2em;color:${DARK.text};">${escapeHtml(block.value)}</td>
                    </tr>
                  </table>`;

    case "note":
      return `<p class="rm-muted" style="margin:22px 0 0;font-family:${FONT_SANS};font-size:13px;line-height:1.6;color:${DARK.muted};">${escapeHtml(block.text)}</p>`;
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
  /**
   * One linked footer line, under the plain ones.
   *
   * For the messages that a preference can switch off. The settings card
   * promises those can be turned off, so the email that arrives because of one
   * says where that switch is, in the small print, where a reader looks for
   * it. It is NOT an unsubscribe: the outbox sends a List-Unsubscribe header
   * pointing at the same switch (OPS-14), but there is no one-click
   * unsubscribe yet, and saying "unsubscribe" and meaning "change a
   * preference" is the kind of promise a footer should not make.
   *
   * A transactional message that nothing can switch off leaves this unset,
   * because offering a switch that does not exist is worse than offering none.
   */
  footerLink?: { label: string; href: string };
};

export type Composed = {
  html: string;
  /** The text/plain alternative. Always present, always from the same blocks. */
  text: string;
};

/**
 * THE STYLE BLOCK, SHARED BY EVERY DOCUMENT (the catalogue and the welcome).
 *
 * Nothing the message depends on lives here. The inline layer is the dark
 * palette and it is complete on its own; this block only holds it in place
 * for the clients that would otherwise adjust it:
 *
 *   1. `color-scheme: dark` tells Apple Mail and iOS Mail the message is
 *      already dark, so they render it as written rather than inverting it.
 *   2. The same palette is re-asserted by class, unconditionally and under
 *      both `prefers-color-scheme` queries, so a client that restyles by
 *      scheme lands on the designed dark either way. Every surface that paints
 *      a ground carries `rm-base`, `rm-card` or `rm-panel`, including the cells
 *      that only inherit one (`paintExplicit` copies the class down with the
 *      colour).
 *   3. OUTLOOK.COM runs its own dark pass and marks each element it repainted
 *      with `data-ogsb` (ground) or `data-ogsc` (ink). The rules keyed on them
 *      put the designed palette back, so its guess never replaces the design.
 *   4. A phone gets tighter card padding.
 *
 * WHAT IT DOES NOT REACH. Gmail strips media queries and, in its iOS app, may
 * invert the whole message. That is answered by the inline palette, whose
 * every ink keeps AA against its ground inverted as well as written.
 */
export function schemeStyle(extra = ""): string {
  const palette = `
        .rm-base   { background-color: ${DARK.ground} !important; }
        .rm-card   { background-color: ${DARK.card} !important; }
        .rm-panel  { background-color: ${DARK.panel} !important; }
        .rm-title  { color: ${DARK.text} !important; }
        .rm-body   { color: ${DARK.body} !important; }
        .rm-muted  { color: ${DARK.muted} !important; }
        .rm-link   { color: ${SKY} !important; }`;
  return `
      :root { color-scheme: dark; supported-color-schemes: dark; }
      @media (prefers-color-scheme: dark) {${palette}
      }
      @media (prefers-color-scheme: light) {${palette}
      }
      .rm-base[data-ogsb]  { background-color: ${DARK.ground} !important; }
      .rm-card[data-ogsb]  { background-color: ${DARK.card} !important; }
      .rm-panel[data-ogsb] { background-color: ${DARK.panel} !important; }
      [data-ogsc] .rm-title, .rm-title[data-ogsc] { color: ${DARK.text} !important; }
      [data-ogsc] .rm-body, .rm-body[data-ogsc]   { color: ${DARK.body} !important; }
      [data-ogsc] .rm-muted, .rm-muted[data-ogsc] { color: ${DARK.muted} !important; }
      [data-ogsc] .rm-link, .rm-link[data-ogsc]   { color: ${SKY} !important; }
      @media only screen and (max-width: 480px) {
        .rm-pad    { padding-left: 22px !important; padding-right: 22px !important; }
        .rm-outer  { padding-left: 8px !important; padding-right: 8px !important; }
      }${extra}`;
}

/** The document head: charset, viewport, both colour-scheme metas, the style block. */
export function documentHead(title: string, extraStyle = "", headExtra = ""): string {
  return `<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="dark" />
    <meta name="supported-color-schemes" content="dark" />
    <title>${escapeHtml(title)}</title>${headExtra}
    <style>${schemeStyle(extraStyle)}
    </style>
  </head>`;
}

/** The hidden inbox line, with spacer entities so a client does not pull body copy in behind it. */
export function preheaderHtml(text: string): string {
  return `<span style="display:none!important;visibility:hidden;opacity:0;height:0;width:0;max-height:0;max-width:0;overflow:hidden;font-size:1px;line-height:1px;mso-hide:all;">${escapeHtml(text)}&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;</span>`;
}

/**
 * The brand band: the lockup on deep navy at the top of the card, under the
 * lit rim, over the luminous brand-blue rule.
 *
 * Navy three ways: a `bgcolor` (Outlook's Word engine), an inline colour, and
 * a flat gradient of the same navy as a background image, which several
 * clients leave alone when they force a scheme. And the lockup is one picture
 * carrying its own navy tile (`LOCKUP_PATH` in theme.ts), hosted on the site
 * origin, so it stays the brand on navy whatever happens to the band.
 */
export function brandBandRow(): string {
  return `<tr>
              <td class="rm-base rm-pad" bgcolor="${HEADER}" style="background-color:${HEADER};background-image:linear-gradient(${HEADER},${HEADER});border-top:1px solid ${DARK.rim};border-radius:19px 19px 0 0;padding:24px ${PAD_X}px 22px;">
                <img src="${siteUrl()}${LOCKUP_PATH}" width="${LOCKUP_WIDTH}" height="${LOCKUP_HEIGHT}" alt="${WORDMARK_ALT}" style="display:block;width:${LOCKUP_WIDTH}px;height:${LOCKUP_HEIGHT}px;border:0;outline:none;text-decoration:none;font-family:${FONT_SANS};font-size:22px;line-height:${LOCKUP_HEIGHT}px;font-weight:700;letter-spacing:-0.025em;color:#FFFFFF;" />
              </td>
            </tr>
            <tr><td style="height:2px;line-height:2px;font-size:0;background-color:${BRAND};background-image:${GRADIENT_CAP};mso-line-height-rule:exactly;">&nbsp;</td></tr>`;
}

/** The pages every footer links, by the same three names everywhere. */
export const FOOTER_LINKS: readonly { label: string; path: string }[] = [
  { label: "Help and support", path: "/support" },
  { label: "Privacy", path: "/legal/privacy" },
  { label: "Terms", path: "/legal/terms" },
];

/** The footer links in the text part, one "Label: url" per line. */
export function footerLinksText(): string {
  return FOOTER_LINKS.map((l) => `${l.label}: ${appUrl(l.path)}`).join("\n");
}

/**
 * The footer: why this arrived, the one switch if there is one, the support
 * and legal links, the sign-off and the legal line. It sits on the ground
 * outside the card, so it reads as small print by position as well as size.
 */
export function footerRows(lines: readonly string[], link?: { label: string; href: string }): string {
  const p = (inner: string, margin = "0 0 8px") =>
    `<p class="rm-muted" style="margin:${margin};font-family:${FONT_SANS};font-size:13px;line-height:20px;color:${DARK.muted};">${inner}</p>`;
  const a = (label: string, href: string) =>
    `<a class="rm-link" href="${escapeHtml(href)}" target="_blank" style="color:${SKY};text-decoration:underline;">${escapeHtml(label)}</a>`;
  const reason = lines.map((line) => p(escapeHtml(line))).join("\n                ");
  const switchLine = link ? `\n                ${p(a(link.label, link.href))}` : "";
  const links = FOOTER_LINKS.map((l) => a(l.label, appUrl(l.path))).join("&nbsp;&nbsp;&middot;&nbsp;&nbsp;");
  return `<tr>
              <td class="rm-pad" style="padding:26px ${PAD_X}px 0;">
                ${reason}${switchLine}
                ${p(links, "14px 0 14px")}
                <p class="rm-title" style="margin:0;font-family:${FONT_SANS};font-size:13px;line-height:20px;font-weight:700;letter-spacing:0.02em;color:${DARK.text};">${SIGN_OFF}</p>
                <p class="rm-muted" style="margin:4px 0 0;font-family:${FONT_SANS};font-size:12px;line-height:18px;color:${DARK.muted};">${LEGAL_LINE}</p>
              </td>
            </tr>`;
}

/**
 * The whole document around a card's contents: ground, band, card, footer.
 * `cardClass` lets a document add its own phone rules to the card cell.
 *
 * The card is one cell with a hairline edge and a 20px radius wrapping the
 * band, the rule and the content, so the three read as one lit object on the
 * ground. Classic Outlook drops the radius and draws a square card, which is
 * the same design with corners.
 */
export function documentHtml(options: {
  title: string;
  preheader: string;
  card: string;
  footer: string;
  extraStyle?: string;
  headExtra?: string;
  htmlAttrs?: string;
  cardClass?: string;
}): string {
  return `<!doctype html>
<html lang="en"${options.htmlAttrs ?? ""} style="color-scheme:dark;background-color:${DARK.ground};">
  ${documentHead(options.title, options.extraStyle, options.headExtra)}
  <body class="rm-base" bgcolor="${DARK.ground}" style="margin:0;padding:0;width:100%;background-color:${DARK.ground};color:${DARK.body};font-family:${FONT_SANS};-webkit-font-smoothing:antialiased;-webkit-text-size-adjust:100%;">
    ${preheaderHtml(options.preheader)}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="rm-base" bgcolor="${DARK.ground}" style="width:100%;background-color:${DARK.ground};">
      <tr>
        <td align="center" class="rm-outer" style="padding:28px 12px 44px;">
          <!-- Outlook's Word engine ignores max-width, so it gets a fixed table. -->
          <!--[if mso]><table role="presentation" width="${MAX_WIDTH}" cellpadding="0" cellspacing="0" align="center"><tr><td><![endif]-->
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:${MAX_WIDTH}px;width:100%;">
            <tr>
              <td class="rm-card" bgcolor="${DARK.card}" style="background-color:${DARK.card};border:1px solid ${DARK.edge};border-radius:20px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;">
                  ${brandBandRow()}
                  <tr>
                    <td class="rm-card rm-pad${options.cardClass ? " " + options.cardClass : ""}" bgcolor="${DARK.card}" style="background-color:${DARK.card};border-radius:0 0 19px 19px;padding:34px ${PAD_X}px 36px;">
                      ${options.card}
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            ${options.footer}
          </table>
          <!--[if mso]></td></tr></table><![endif]-->
        </td>
      </tr>
    </table>
  </body>
</html>
`;
}

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

  const html = documentHtml({
    title: "Vallo",
    preheader: options.preheader,
    card: body,
    footer: footerRows(footerLines, options.footerLink),
  });

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
      // The same line in text, as "Label: url", because a bare label with no
      // address is a link a text reader cannot follow.
      ...(options.footerLink
        ? [`${options.footerLink.label}: ${options.footerLink.href}`, ""]
        : []),
      footerLinksText(),
      "",
      SIGN_OFF,
      LEGAL_LINE,
      siteUrl(),
    ].join("\n") + "\n";

  return { html: paintExplicit(html), text };
}
