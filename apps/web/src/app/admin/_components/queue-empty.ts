import type { UiIconName } from "@/design-system/icons/UiIcon";

/* ------------------------------------------------- the three empty queues */

/**
 * Which of the three things an empty queue is.
 *
 * `cleared` is the only one that is good news and the only one that has to be
 * earned. `never` is a queue nothing has ever arrived at. `no-match` is the
 * result of the operator's own filter, and the queue behind it is untouched.
 */
export type QueueEmptyKind = "cleared" | "never" | "no-match";

/**
 * The mark and the ink for each, as data rather than as two nested ternaries in
 * the middle of some JSX.
 *
 * It is out here, exported and pure, for one reason: this decision was wrong for
 * a sprint and nothing could have caught it. Six pages drew an emerald tick over
 * "nothing matched your filter", which reads as "all clear" on a queue that may
 * hold hundreds of untouched rows, and the only way to see it was to look at the
 * screen. `queue-empty.test.ts` now pins the part that matters, which is that
 * exactly one of the three is allowed to be good news.
 */
export const QUEUE_EMPTY_MARK: Record<QueueEmptyKind, { icon: UiIconName; success: boolean }> = {
  cleared: { icon: "verified", success: true },
  never: { icon: "history", success: false },
  "no-match": { icon: "search", success: false },
};

/** Which of the three, from either of the two ways a page can say. */
export function queueEmptyKind(
  state: QueueEmptyKind | undefined,
  everHadRows: boolean,
): QueueEmptyKind {
  return state ?? (everHadRows ? "cleared" : "never");
}
