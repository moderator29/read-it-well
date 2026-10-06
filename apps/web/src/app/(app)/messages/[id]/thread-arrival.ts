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
 *     (`opened`) and nothing else. The set is never added to, so a bubble's
 *     class cannot change under it when the realtime echo of my own send
 *     lands (which used to take the class off and cut the arrival short);
 *   - the echo is merged by `mergeEcho`, which keeps the bubble that is
 *     already on screen, whichever of the send result and the echo came first.
 */

/** The prefix of the id an optimistic bubble is born with. */
export const LOCAL_PREFIX = "local-";

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

/**
 * A message row arriving over realtime joins the list.
 *
 *   - The send result landed first: the bubble already has the row's id, so
 *     the echo changes nothing (and the bubble's arrival is left alone).
 *   - The echo landed first and it is mine: the row takes the place of my
 *     optimistic bubble (the oldest still sending or waiting with the same
 *     words) AND its `clientKey`, so React keeps the element and the arrival
 *     already playing on it. The result, when it lands, finds the real id
 *     present and has nothing left to adopt.
 *   - Anything else, a message from the other side or from another device of
 *     mine, is appended and arrives like any new message.
 *
 * KNOWN EDGE, ACCEPTED: the pairing is by words, since an echo carries no
 * client id. If my other device sends the same words while my own send is
 * still pending, that echo can claim my optimistic bubble. Nothing is lost:
 * my own echo then finds no temporary bubble and is appended, so both
 * messages show; only which of the two plays its arrival in place differs.
 */
export function mergeEcho<
  T extends ArrivalBubble & { body: string; imageUrl: string | null; state?: "sending" | "failed" | "waiting" },
>(prev: readonly T[], echo: T): T[] {
  if (prev.some((m) => m.id === echo.id)) return [...prev];
  if (echo.mine) {
    const at = prev.findIndex(
      (m) =>
        m.mine &&
        m.id.startsWith(LOCAL_PREFIX) &&
        (m.state === "sending" || m.state === "waiting") &&
        m.imageUrl === null &&
        m.body === echo.body,
    );
    if (at !== -1) {
      const next = [...prev];
      next[at] = { ...echo, clientKey: bubbleKey(prev[at]!) };
      return next;
    }
  }
  return [...prev, echo];
}
