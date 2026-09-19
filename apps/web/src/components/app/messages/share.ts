/**
 * A listing or a booking, shared into a chat, as a message body.
 *
 * WHY THE CARD RIDES A PLAIN MESSAGE. `message_attachments` carries one
 * shape: an image path with a width and a height. There is no attachment
 * kind and no row that can point at a listing or a booking, and that table
 * belongs to the messaging worker. Rather than wait, a shared card is sent
 * as an ordinary text message whose body is a Vallo path the thread page
 * recognises and expands into the rich card, exactly the way every messaging
 * product turns a link into a preview. The body is honest on every surface
 * that does not expand it: the inbox preview, the realtime row before a
 * refresh and a notification all read "Shared a listing" and a path that
 * opens the thing.
 *
 * THE SEAM. When `message_attachments` grows a `kind` and a `ref_id` (the
 * exact migration is in the F5 report), `shareBody` becomes the attachment
 * insert and `parseShare` reads the row instead of the text. Nothing else
 * in the thread changes, because everything above this file only ever sees
 * a `SharedRef`.
 *
 * Client-safe: no imports, pure string work, tested.
 */

/**
 * `stay` IS ITS OWN KIND, and it is not a listing with a different name.
 *
 * `/stay/<id>` takes an ACCOMMODATION id when a host has onboarded one and a
 * catalogue listing id otherwise, and the two live in different tables with
 * different readers. Sharing an accommodation-backed stay as a listing
 * resolved nothing, so the bubble fell back to a bare path: that is the seam
 * the founder hit. A third kind costs one branch in `resolveCard` and makes
 * the card real on both.
 */
export type SharedKind = "listing" | "booking" | "stay";

export type SharedRef = { kind: SharedKind; id: string };

const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";

/** The first line of a share body, which is also its inbox preview. */
export const SHARE_LEAD: Record<SharedKind, string> = {
  listing: "Shared a listing",
  booking: "Shared a booking",
  stay: "Shared a stay",
};

/** Where each kind opens. `/bookings/<id>` is the trips hub's own detail route. */
export function shareHref(ref: SharedRef): string {
  if (ref.kind === "listing") return `/listing/${ref.id}`;
  if (ref.kind === "stay") return `/stay/${ref.id}`;
  return `/bookings/${ref.id}`;
}

/** The body a share sends. Two lines: what it is, then the path that opens it. */
export function shareBody(ref: SharedRef): string {
  return `${SHARE_LEAD[ref.kind]}\n${shareHref(ref)}`;
}

/* Each segment is written exactly as `shareHref` writes it, so `bookings`
   plural and `stay` singular are both spelled out rather than inferred. */
const SHARE_RE = new RegExp(
  `^(?:Shared a (?:listing|booking|stay)\\n)?/(listing|bookings|stay)/(${UUID})$`,
  "i",
);

/**
 * The share a body carries, or null for an ordinary message.
 *
 * Strict on purpose: the whole body has to be the two lines above, or the
 * bare path. A sentence that happens to mention a listing path is prose and
 * stays prose.
 */
export function parseShare(body: string): SharedRef | null {
  const match = SHARE_RE.exec(body.trim());
  if (!match) return null;
  const segment = match[1]!.toLowerCase();
  const kind: SharedKind =
    segment === "listing" ? "listing" : segment === "stay" ? "stay" : "booking";
  return { kind, id: match[2]!.toLowerCase() };
}

/** What the inbox row says for a share, instead of printing a path. */
export function sharePreview(body: string): string | null {
  const ref = parseShare(body);
  return ref ? SHARE_LEAD[ref.kind] : null;
}
