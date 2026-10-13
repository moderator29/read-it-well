/**
 * WHERE A POST WAS WRITTEN, held for the moment it lands in the feed.
 *
 * The composer lives in a sheet and the new post arrives in the feed after
 * the server refresh, a beat later and in a different subtree, so there is no
 * single React tree in which the two could share a `layoutId`. This is the
 * hand-off instead: the composer notes its own box and the new post's id as it
 * sends; the feed, when a card with that id first renders, takes the note and
 * flies the card from that box into its place (`FreshArrival`).
 *
 * Module state on purpose: one page, one composer, one flight at a time, and
 * nothing to persist. A note older than `FLIGHT_TTL_MS` is ignored, so a post
 * that took a slow network to appear simply appears.
 */
export type FlightNote = {
  postId: string;
  rect: { left: number; top: number; width: number; height: number };
  at: number;
};

export const FLIGHT_TTL_MS = 8000;

let note: FlightNote | null = null;

export function notePublished(postId: string, box: DOMRect | null, now = Date.now()): void {
  if (!box) return;
  note = {
    postId,
    rect: { left: box.left, top: box.top, width: box.width, height: box.height },
    at: now,
  };
}

/** The note for this post, once: taking it clears it. */
export function takeFlight(postId: string, now = Date.now()): FlightNote | null {
  if (!note || note.postId !== postId) return null;
  const found = note;
  note = null;
  return now - found.at <= FLIGHT_TTL_MS ? found : null;
}

/** Whether a flight is waiting for this post, without taking it. */
export function hasFlight(postId: string, now = Date.now()): boolean {
  return note !== null && note.postId === postId && now - note.at <= FLIGHT_TTL_MS;
}
