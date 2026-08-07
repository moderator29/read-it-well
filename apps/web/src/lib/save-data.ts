import "server-only";
import { headers } from "next/headers";

/**
 * Does this visitor want less data?
 *
 * Inbox item 246. Two signals say so and neither reaches the other's side of
 * the wire, so the platform reads both.
 *
 * `Save-Data: on` is a request header. Chrome and the Chromium browsers send
 * it when the reader has turned data saver on, which on an Android phone is a
 * switch in Settings rather than anything to do with this site. It arrives
 * before a byte is rendered, which is the only reason a background image can
 * be prevented rather than merely hidden: a `background-image` on an element
 * that is never painted is never fetched, but an `<img>` in the markup is
 * fetched whatever CSS says about it.
 *
 * `navigator.connection` is the other half, read on the client in the root
 * layout, and it covers the case the header cannot: a reader on a 2g or
 * slow-2g link who has not turned anything on. It arrives after the first
 * paint, so it can stop the heavy artwork and every animation and it cannot
 * stop an image the markup already asked for.
 *
 * Nothing here is a preference this product invents or stores. Item 36, the
 * data-saver toggle, is a different item and is not this one.
 */
export async function prefersLessData(): Promise<boolean> {
  const store = await headers();
  return store.get("save-data")?.toLowerCase() === "on";
}
