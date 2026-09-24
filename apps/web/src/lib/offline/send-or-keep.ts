import type { ActionResult } from "../actions/envelope";
import { enqueue, entryKey, makeCreateEntry, type CreateKind } from "./outbox";

/**
 * SEND NOW, OR KEEP IT FOR WHEN THERE IS SIGNAL. V-40.
 *
 * The one path every composer takes. A UUID is minted for this tap and sent
 * as the action's `tapKey`. Offline, or when the request never comes back,
 * the same tap is kept in the outbox under that same UUID, so if the lost
 * request did land, the replay gets the first answer rather than a twin.
 * A server's answer, yes or no, is final here: only a lost request is kept.
 */
export type SendOrKeep<T> =
  | { state: "sent"; result: ActionResult<T> }
  | { state: "kept"; key: string }
  | { state: "not_kept" };

export async function sendOrKeep<T>(
  kind: CreateKind,
  payload: { [key: string]: string | undefined },
  send: (tapKey: string) => Promise<ActionResult<T>>,
): Promise<SendOrKeep<T>> {
  const tapKey = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : null;
  const keep = async (): Promise<SendOrKeep<T>> => {
    const fields = Object.fromEntries(Object.entries(payload).filter(([, v]) => typeof v === "string"));
    const entry = tapKey ? makeCreateEntry(kind, tapKey, fields, Date.now()) : null;
    return entry && (await enqueue(entry)) ? { state: "kept", key: entryKey(kind, tapKey!) } : { state: "not_kept" };
  };
  if (typeof navigator !== "undefined" && navigator.onLine === false) return keep();
  try {
    return { state: "sent", result: await send(tapKey ?? "") };
  } catch {
    /* The request never came back: the network dropped under it. */
    return keep();
  }
}
