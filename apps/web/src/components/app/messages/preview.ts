import { sharePreview } from "./share";

/**
 * THE LINE UNDER A NAME IN THE INBOX: ONE SHORT LINE (founder, 11 October
 * 2026). Pure.
 *
 * A message can be two thousand characters with blank lines in it. The row
 * shows the start of it on one line: every run of spaces and line breaks
 * becomes one space, and anything past `max` characters is cut at the last
 * word that fits, with an ellipsis. The stylesheet still truncates at the
 * row's width, so this keeps the markup (and what a screen reader reads out)
 * short, not just what is painted. A shared card previews as its words.
 */
export const PREVIEW_MAX = 64;

/**
 * What a message deleted for everyone previews as. A sent message always has
 * words (the send refuses an empty one) and a photo carries its placeholder,
 * so an empty body is only ever one that `delete_message` blanked.
 */
export const DELETED_PREVIEW = "This message was deleted";

export function previewLine(body: string, max = PREVIEW_MAX): string {
  const shared = sharePreview(body);
  const flat = (shared ?? body).replace(/\s+/g, " ").trim();
  if (flat.length === 0) return DELETED_PREVIEW;
  if (flat.length <= max) return flat;
  const cut = flat.slice(0, max);
  const space = cut.lastIndexOf(" ");
  const head = space > max / 2 ? cut.slice(0, space) : cut;
  return `${head.trimEnd()}…`;
}
