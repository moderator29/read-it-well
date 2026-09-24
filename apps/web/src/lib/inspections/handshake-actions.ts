"use server";

/**
 * THE GATE HANDSHAKE'S THREE SERVER DOORS. V-35.
 *
 * All three are called only while the phone has signal: to build the pack
 * before the day, to name who shows it, and to hand over what happened at the
 * gate once signal returns. The gate itself calls none of them.
 *
 * Each goes through a SECURITY DEFINER function in
 * `20260924160100_v35_...sql` that authorises off `auth.uid()`: the seed
 * reaches only the requester, the lister and a named delegate, and only while
 * the inspection is CONFIRMED and until a day after the slot.
 *
 * Answers are codes, not sentences; `GateHandshake` maps them onto
 * `platform.gate` in the dictionary.
 */

import { z } from "zod";
import { resolveSession } from "../actions/session";
import { readHandshake, type HandshakeAnswer, type QueuedCheckin } from "../offline/pack";

type Loose = { rpc: (fn: string, args?: Record<string, unknown>) => Promise<unknown> };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const loose = (client: unknown) => client as any as Loose;

const id = z.string().uuid();

export async function prepareHandshake(inspectionId: unknown): Promise<HandshakeAnswer> {
  const parsed = id.safeParse(inspectionId);
  if (!parsed.success) return { state: "not_found" };
  const session = await resolveSession();
  if (session.state !== "signed-in") return { state: "failed" };
  try {
    const { data, error } = (await loose(session.supabase).rpc("inspection_handshake", {
      p_inspection: parsed.data,
    })) as { data: unknown; error: unknown };
    if (error) return { state: "failed" };
    return readHandshake(parsed.data, data);
  } catch {
    return { state: "failed" };
  }
}

export type DelegateAnswer = {
  state: "asked" | "cleared" | "not_eligible" | "closed" | "too_late" | "rate_limited" | "failed";
};

const delegateSchema = z.object({
  inspectionId: id,
  /* Empty clears the delegate. */
  email: z.union([z.literal(""), z.string().trim().email().max(254)]),
});

/**
 * Ask somebody to show an inspection. The answer never carries a name: the
 * database does not return one, so this cannot be used to learn who holds an
 * email address. The person named must accept before the seed reaches them.
 */
export async function nameDelegate(input: unknown): Promise<DelegateAnswer> {
  const parsed = delegateSchema.safeParse(input);
  if (!parsed.success) return { state: "not_eligible" };
  const session = await resolveSession();
  if (session.state !== "signed-in") return { state: "failed" };
  try {
    const { data, error } = (await loose(session.supabase).rpc("name_inspection_delegate", {
      p_inspection: parsed.data.inspectionId,
      p_email: parsed.data.email,
    })) as { data: unknown; error: unknown };
    if (error || !data || typeof data !== "object") return { state: "failed" };
    const status = (data as { status?: unknown }).status;
    if (status === "ok") return { state: "asked" };
    if (
      status === "cleared" ||
      status === "not_eligible" ||
      status === "closed" ||
      status === "too_late" ||
      status === "rate_limited"
    ) {
      return { state: status };
    }
    return { state: "failed" };
  } catch {
    return { state: "failed" };
  }
}

export type DelegationAnswer = { state: "accepted" | "declined" | "too_late" | "gone" | "failed" };

/** The person asked says yes or no. */
export async function answerDelegation(input: unknown): Promise<DelegationAnswer> {
  const parsed = z.object({ inspectionId: id, accept: z.boolean() }).safeParse(input);
  if (!parsed.success) return { state: "failed" };
  const session = await resolveSession();
  if (session.state !== "signed-in") return { state: "failed" };
  try {
    const { data, error } = (await loose(session.supabase).rpc("answer_inspection_delegation", {
      p_inspection: parsed.data.inspectionId,
      p_accept: parsed.data.accept,
    })) as { data: unknown; error: unknown };
    if (error || !data || typeof data !== "object") return { state: "failed" };
    const status = (data as { status?: unknown }).status;
    if (status === "accepted" || status === "declined" || status === "too_late") return { state: status };
    if (status === "not_found") return { state: "gone" };
    return { state: "failed" };
  } catch {
    return { state: "failed" };
  }
}

const checkinSchema = z
  .array(
    z.object({
      inspectionId: id,
      result: z.enum(["shown", "match", "mismatch", "skipped"]),
      observedAt: z.string().datetime({ offset: true }),
    }),
  )
  .max(50);

/**
 * Hand over the queue. Returns the check-ins the phone may forget: every one
 * the database took, and every one it refused for good (out of the window, a
 * result that does not fit the role, an inspection that is not theirs).
 * Only a failure to reach the database keeps a check-in queued.
 */
export async function recordCheckins(input: unknown): Promise<{ settled: QueuedCheckin[] }> {
  const parsed = checkinSchema.safeParse(input);
  if (!parsed.success) return { settled: [] };
  const session = await resolveSession();
  if (session.state !== "signed-in") return { settled: [] };
  const settled: QueuedCheckin[] = [];
  for (const checkin of parsed.data) {
    try {
      const { data, error } = (await loose(session.supabase).rpc("record_inspection_checkin", {
        p_inspection: checkin.inspectionId,
        p_result: checkin.result,
        p_observed_at: checkin.observedAt,
      })) as { data: unknown; error: unknown };
      if (error || !data || typeof data !== "object") continue;
      const status = (data as { status?: unknown }).status;
      if (status === "ok" || status === "out_of_window" || status === "bad_result" || status === "not_found") {
        settled.push(checkin);
      }
    } catch {
      /* Kept on the phone for the next time there is signal. */
    }
  }
  return { settled };
}
