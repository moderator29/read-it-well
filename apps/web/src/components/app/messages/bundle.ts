/**
 * Photo bundles: consecutive photo-only messages from one sender, sent in the
 * same minute, drawn as one bubble with a three-up strip and a +n plate.
 *
 * WHY THIS IS DERIVED AT RENDER TIME. A photo lands as its own message row
 * (see `attachImage`), so somebody sending six pictures of a flat sends six
 * messages, and six full-width bubbles in a row is the thing the render
 * (9E06F51C) does not draw. Nothing about the rows changes; the thread just
 * reads a run of them as one act, which is what the sender meant.
 *
 * Pure, so it is tested rather than trusted.
 */

export type BundleInput = {
  id: string;
  mine: boolean;
  body: string;
  timeLabel: string;
  imageUrl: string | null;
  state?: "sending" | "failed";
};

export type Bundle<T extends BundleInput> = {
  /** The first message, which carries the id the row is keyed on. */
  lead: T;
  /** Every message in the run, the lead included. */
  items: T[];
};

/** The body a photo-only message carries, as `attachImage` writes it. */
const PHOTO_BODY = "\u{1F4F7} Photo";

function isPhotoOnly(m: BundleInput): boolean {
  return m.imageUrl !== null && (m.body.trim().length === 0 || m.body === PHOTO_BODY);
}

/** True when two consecutive photo-only messages read as one act. */
function joins(prev: BundleInput, next: BundleInput): boolean {
  return (
    isPhotoOnly(prev) &&
    isPhotoOnly(next) &&
    prev.mine === next.mine &&
    prev.timeLabel === next.timeLabel &&
    prev.state === undefined &&
    next.state === undefined
  );
}

export function bundlePhotos<T extends BundleInput>(messages: T[]): Bundle<T>[] {
  const out: Bundle<T>[] = [];
  for (const message of messages) {
    const last = out[out.length - 1];
    if (last && joins(last.items[last.items.length - 1]!, message)) {
      last.items.push(message);
    } else {
      out.push({ lead: message, items: [message] });
    }
  }
  return out;
}
