import "server-only";

import { resolveSession } from "../actions/session";
import { blockersFrom, readingFrom, EMPTY_READING, type Blocker, type BlockerReading } from "./preconditions";
import { reauthMethodFor, type ReauthMethod } from "./reauthenticate";
import { asRecord, callDeletionRpc } from "./rpc";
import type { DeletionStatus } from "./constants";

/**
 * What the Account section needs to draw the deletion control, in one read.
 *
 * Both calls go through the caller's OWN RLS-bound client.
 * `public.account_deletion_blockers` and `public.open_account_deletion` are
 * SECURITY DEFINER and refuse to answer about anybody but the caller, so this
 * needs no service key and cannot be turned into a door onto another person's
 * money or another person's countdown.
 *
 * NEVER THROWS. A settings screen that 500s because the deletion probe failed
 * has taken away a working screen to protect a control nobody was using yet.
 * A failed read comes back as `unavailable`, which the section draws as an
 * honest "we cannot check this right now", and the delete control stays
 * visible because hiding it would be the dark pattern the rules forbid.
 */

export type OpenDeletion = {
  requestId: string;
  status: DeletionStatus;
  requestedAt: string;
  purgeAfter: string;
};

export type DeletionScreen = {
  state: "signed-out" | "unavailable" | "ready";
  /** The open request, when the thirty day window is running. */
  open: OpenDeletion | null;
  reading: BlockerReading;
  blockers: Blocker[];
  /** How this account proves it is still them. */
  method: ReauthMethod;
};

const SIGNED_OUT: DeletionScreen = {
  state: "signed-out",
  open: null,
  reading: EMPTY_READING,
  blockers: [],
  method: "password",
};

function openFrom(value: unknown): OpenDeletion | null {
  const row = asRecord(value);
  const requestId = row["request_id"];
  const status = row["status"];
  const purgeAfter = row["purge_after"];
  const requestedAt = row["requested_at"];
  if (typeof requestId !== "string" || typeof status !== "string") return null;
  if (typeof purgeAfter !== "string" || typeof requestedAt !== "string") return null;
  if (status !== "SCHEDULED" && status !== "PURGING") return null;
  return { requestId, status, requestedAt, purgeAfter };
}

export async function readDeletionScreen(): Promise<DeletionScreen> {
  const session = await resolveSession();
  if (session.state !== "signed-in") return SIGNED_OUT;

  const { supabase, user } = session;
  const method = reauthMethodFor(user);

  const [blockersAnswer, openAnswer] = await Promise.all([
    callDeletionRpc(supabase, "account_deletion_blockers", { p_user: user.id }),
    callDeletionRpc(supabase, "open_account_deletion", { p_user: user.id }),
  ]);

  if (!blockersAnswer.ok) {
    return { state: "unavailable", open: null, reading: EMPTY_READING, blockers: [], method };
  }

  const reading = readingFrom(blockersAnswer.data);
  return {
    state: "ready",
    open: openAnswer.ok ? openFrom(openAnswer.data) : null,
    reading,
    blockers: blockersFrom(reading),
    method,
  };
}
