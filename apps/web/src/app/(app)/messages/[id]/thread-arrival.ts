/**
 * WHEN A MESSAGE ARRIVES, AND THAT IT ARRIVES ONCE.
 *
 * A sent message shows at once as an optimistic bubble under a temporary id
 * and later ADOPTS the database row's id. The arrival motion
 * (`.nf-msg-in--mine`, motion.css) must play exactly once across that: it
 * would replay if the bubble remounted when its id changed (React keys by id)
 * or if the class were decided afresh from the new id. So:
 *
 *   - the bubble's React key is `bubbleKey`: a `clientKey` written at adoption
 *     (the temporary id it was born with) that survives the id change, so the
 *     element is the same element and its animation is never restarted;
 *   - `arrivalClass` is decided against the ids the thread had when it opened
 *     (`opened`), plus any id whose bubble is already on screen by another
 *     road (the realtime echo of my own send), which are added to that set.
 */

export type ArrivalBubble = {
  id: string;
  mine: boolean;
  /** The id the bubble was born with; survives adoption so the element and its key do not change. */
  clientKey?: string;
};

/** The React key of a bubble: stable across the temporary id becoming the real one. */
export function bubbleKey(m: Pick<ArrivalBubble, "id" | "clientKey">): string {
  return m.clientKey ?? m.id;
}

/** The arrival class for a bubble: none for what the thread opened with. */
export function arrivalClass(opened: ReadonlySet<string>, m: Pick<ArrivalBubble, "id" | "mine">): string {
  if (opened.has(m.id)) return "";
  return m.mine ? " nf-msg-in--mine" : " nf-msg-in--theirs";
}

/**
 * The temporary bubble takes the real row's id, keeping its key. When the
 * real row is already in the list (the realtime echo landed first) the
 * temporary one is dropped instead, as it always was.
 */
export function adoptBubble<T extends ArrivalBubble & { state?: unknown; timeLabel: string }>(
  prev: readonly T[],
  tempId: string,
  realId: string,
  timeLabel?: string,
): T[] {
  /* Adopting an id the bubble already has changes nothing. */
  if (tempId === realId) return [...prev];
  if (prev.some((m) => m.id === realId)) return prev.filter((m) => m.id !== tempId);
  return prev.map((m) =>
    m.id === tempId
      ? { ...m, id: realId, clientKey: m.clientKey ?? tempId, state: undefined, timeLabel: timeLabel ?? m.timeLabel }
      : m,
  );
}
