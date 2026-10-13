import type { ActionResult } from "../actions/envelope";
import type { VisitMode } from "./visit";

/**
 * SENDING A VISIT, ONCE. Client-safe and pure apart from what it is handed.
 *
 * Two doors, one per path, both the existing server actions:
 *
 *   slot   `bookViewingSlot`: the lister opened this time, so the database
 *          books it CONFIRMED in one write.
 *   ask    `requestInspection`: a suggested time the lister confirms. With
 *          no signal it is kept on the phone by the outbox (`sendOrKeep`)
 *          and sends itself later, exactly as the old sheet did.
 *
 * ONE TAP IS ONE VISIT, ON BOTH SIDES OF THE WIRE. A second call while the
 * first is in flight answers "busy" and sends nothing. And the TAP KEY IS
 * KEPT for the same choice until it succeeds: a retry after an answer that
 * never arrived carries the same key, so the server's replay guard
 * (`oncePerTap`) answers with the first booking instead of filing a second
 * one or refusing with "you already asked". A different choice gets a new
 * key.
 */

export type VisitChoice = {
  listingId: string;
  mode: VisitMode;
  /** `slot`: an open time the lister set. `ask`: a time suggested to them. */
  kind: "slot" | "ask";
  /** ISO instant. */
  at: string;
  note: string;
};

export type VisitSubmitOutcome =
  | { state: "done"; id: string }
  | { state: "kept" }
  | { state: "notKept" }
  | { state: "failed"; error: string; phoneGate?: boolean }
  | { state: "busy" };

type Sent<T> = { state: "sent"; result: ActionResult<T> } | { state: "kept"; key: string } | { state: "not_kept" };

export type VisitSubmitDeps = {
  book: (input: { listingId: string; slotAt: string; note?: string; mode: VisitMode; tapKey: string }) => Promise<ActionResult<{ id: string }>>;
  request: (input: { listingId: string; when: string; note?: string; mode: VisitMode; tapKey: string }) => Promise<ActionResult<{ id: string }>>;
  /** `sendOrKeep("request_inspection", ...)`, so a request asked offline is kept. */
  sendOrKeep: (
    payload: { [key: string]: string | undefined },
    send: () => Promise<ActionResult<{ id: string }>>,
  ) => Promise<Sent<{ id: string }>>;
  newKey: () => string;
};

export function createVisitSubmitter(deps: VisitSubmitDeps): (choice: VisitChoice) => Promise<VisitSubmitOutcome> {
  let inFlight = false;
  let held: { signature: string; key: string } | null = null;

  return async function submit(choice) {
    if (inFlight) return { state: "busy" };
    inFlight = true;
    const note = choice.note.trim();
    const signature = JSON.stringify([choice.listingId, choice.mode, choice.kind, choice.at, note]);
    if (!held || held.signature !== signature) held = { signature, key: deps.newKey() };
    const tapKey = held.key;
    try {
      if (choice.kind === "slot") {
        const result = await deps.book({ listingId: choice.listingId, slotAt: choice.at, mode: choice.mode, tapKey, ...(note ? { note } : {}) });
        if (!result.ok) return { state: "failed", error: result.error, ...(result.gate === "phone" ? { phoneGate: true } : {}) };
        held = null;
        return { state: "done", id: result.data.id };
      }
      const fields = { listingId: choice.listingId, when: choice.at, mode: choice.mode, ...(note ? { note } : {}) };
      const sent = await deps.sendOrKeep(fields, () => deps.request({ ...fields, tapKey }));
      if (sent.state === "kept") {
        held = null;
        return { state: "kept" };
      }
      if (sent.state === "not_kept") return { state: "notKept" };
      if (!sent.result.ok) return { state: "failed", error: sent.result.error, ...(sent.result.gate === "phone" ? { phoneGate: true } : {}) };
      held = null;
      return { state: "done", id: sent.result.data.id };
    } catch {
      return { state: "failed", error: "" };
    } finally {
      inFlight = false;
    }
  };
}
