/**
 * ONE ORDER FOR A LISTING'S PHOTOS AND VIDEOS, KEPT IN TWO TABLES.
 *
 * The lister arranges photos and walkthroughs in one row, the first of which is
 * the cover and has to be a photo. The two kinds live in their own tables:
 * `listing_photos.position` is unique per listing and held to 0..9, and
 * `listing_videos.position` is any number from zero up. So the shared order is
 * stored without a schema change, like this:
 *
 *   - a PHOTO's position is its rank among the photos (0 is the cover, which is
 *     what every reader of `listing_photos` already takes position 0 to mean);
 *   - a VIDEO's position is its place in the whole row.
 *
 * `mergeMedia` rebuilds the row from the two: each video goes to the place it
 * names (never ahead of the cover while there is a photo, and clamped when the
 * row has since grown shorter), and the photos fill the remaining places in
 * rank order. A video written before this scheme (position 0, 1, 2 among the
 * videos) lands just after the cover, which is where the walkthrough sat.
 */

export type MediaKind = "photo" | "video";

export type Placed<T> = T & { position: number };

export type MediaEntry<P, V> = { kind: "photo"; item: P } | { kind: "video"; item: V };

export function mergeMedia<P, V>(photos: readonly Placed<P>[], videos: readonly Placed<V>[]): MediaEntry<P, V>[] {
  const total = photos.length + videos.length;
  const slots: (MediaEntry<P, V> | null)[] = Array.from({ length: total }, () => null);
  const first = photos.length > 0 ? 1 : 0;
  const byPosition = <T extends { position: number }>(list: readonly T[]) =>
    list
      .map((entry, index) => ({ entry, index }))
      .sort((a, b) => a.entry.position - b.entry.position || a.index - b.index)
      .map(({ entry }) => entry);

  /* Videos keep their order among themselves: each takes the place it names
     or the one after the video before it, and the tail is pulled back inside
     the row when the row has grown shorter. */
  const ordered = byPosition(videos);
  const at = ordered.map((video) => Math.max(first, Math.trunc(video.position)));
  for (let i = 1; i < at.length; i += 1) at[i] = Math.max(at[i]!, at[i - 1]! + 1);
  for (let i = at.length - 1; i >= 0; i -= 1) {
    const ceiling = i === at.length - 1 ? total - 1 : at[i + 1]! - 1;
    at[i] = Math.min(at[i]!, ceiling);
  }
  ordered.forEach((video, i) => {
    slots[at[i]!] = { kind: "video", item: video };
  });

  const ranked = byPosition(photos);
  let next = 0;
  for (let i = 0; i < total; i += 1) {
    if (slots[i] === null) {
      const photo = ranked[next];
      next += 1;
      if (photo) slots[i] = { kind: "photo", item: photo };
    }
  }
  return slots.filter((slot): slot is MediaEntry<P, V> => slot !== null);
}

/**
 * The row with a photo first. Taking a photo off the front, or a dropped
 * reorder, can leave a video at the head; the first photo is brought forward,
 * which is what the stored order reads back as anyway.
 */
export function photoFirst<T extends { kind: MediaKind }>(row: readonly T[]): T[] {
  if (row.length === 0 || row[0]!.kind === "photo") return [...row];
  const at = row.findIndex((entry) => entry.kind === "photo");
  if (at < 0) return [...row];
  const next = [...row];
  const [photo] = next.splice(at, 1);
  next.unshift(photo!);
  return next;
}

/** Whether moving one item from `from` to `to` keeps a photo at the head. */
export function canMove<T extends { kind: MediaKind }>(row: readonly T[], from: number, to: number): boolean {
  if (from === to || from < 0 || to < 0 || from >= row.length || to >= row.length) return false;
  const next = [...row];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved!);
  return next[0]!.kind === "photo";
}

/** The positions to store for a row: each photo's rank, each video's place. */
export function storedPositions<T extends { kind: MediaKind; id: string }>(
  row: readonly T[],
): { photos: string[]; videos: { id: string; position: number }[] } {
  const photos: string[] = [];
  const videos: { id: string; position: number }[] = [];
  row.forEach((entry, index) => {
    if (entry.kind === "photo") photos.push(entry.id);
    else videos.push({ id: entry.id, position: index });
  });
  return { photos, videos };
}
