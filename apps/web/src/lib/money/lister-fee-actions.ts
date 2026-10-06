"use server";

/**
 * THE LISTER'S ACCEPTANCE, SENT TO BE RECORDED (D51, the agreement gate).
 *
 * The screen (components/money/ListerFeeGate.tsx) shows the arithmetic and
 * takes an explicit accept; this sends exactly what was accepted. RECORDING
 * IS SESSION 2'S: C2 REQUEST 2, `public.lister_fee_accept(p_listing,
 * p_rate_version, p_price_minor, p_fee_minor, p_receive_minor)`, which
 * re-derives the figures from the rate version, refuses a mismatch or a
 * superseded version, and writes member, timestamp and rate version against
 * the listing. A rate change never applies to an accepted listing; the
 * lister is asked again (D51 rule 3).
 *
 * Until it lands every call answers `unrecorded`, and the wizard does not send
 * the listing for review: an acceptance nobody recorded is not an acceptance.
 */

import { z } from "zod";
import { fail, ok, validate, type ActionResult } from "../actions/envelope";
import { NOT_CONFIGURED_MESSAGE, SIGNED_OUT_MESSAGE, resolveWriteSession } from "../actions/session";
import { FEE_ACCEPT_UNRECORDED, FEE_RATE_MOVED } from "./copy";
import type { ListerFeePolicy } from "./lister-fee";
import { readListerFeePolicy } from "./lister-fee-read";

const kobo = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const AcceptanceSchema = z
  .object({
    listingId: z.string().uuid(),
    rateVersion: z.string().min(1).max(120),
    priceMinor: kobo.positive(),
    feeMinor: kobo,
    receiveMinor: kobo,
  })
  .refine((a) => a.feeMinor + a.receiveMinor === a.priceMinor, { message: "The figures do not add up." });

export async function recordListerFeeAcceptance(input: unknown): Promise<ActionResult<{ recordedAt: string }>> {
  const parsed = validate(AcceptanceSchema, input);
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);
  const session = await resolveWriteSession();
  if (session.state === "unconfigured") return fail(NOT_CONFIGURED_MESSAGE);
  if (session.state === "signed-out") return fail(SIGNED_OUT_MESSAGE);
  const a = parsed.data;
  try {
    const { data, error } = await session.supabase.rpc("lister_fee_accept" as never, {
      p_listing: a.listingId,
      p_rate_version: a.rateVersion,
      p_price_minor: a.priceMinor,
      p_fee_minor: a.feeMinor,
      p_receive_minor: a.receiveMinor,
    } as never);
    if (error) return fail(FEE_ACCEPT_UNRECORDED);
    const row = (Array.isArray(data) ? data[0] : data) as { status?: unknown; recorded_at?: unknown } | null;
    if (row?.status === "rate_moved" || row?.status === "mismatch") return fail(FEE_RATE_MOVED);
    if (row?.status !== "recorded" || typeof row.recorded_at !== "string") return fail(FEE_ACCEPT_UNRECORDED);
    return ok({ recordedAt: row.recorded_at });
  } catch {
    return fail(FEE_ACCEPT_UNRECORDED);
  }
}

/**
 * The rate in force for a saved listing, asked for by the wizard when it
 * reaches its submit step (the property type, and so the rail, is only known
 * by then). Null whenever it cannot be read: the gate then cannot be accepted.
 */
export async function fetchListerFeePolicy(listingId: unknown): Promise<ListerFeePolicy | null> {
  const id = z.string().uuid().safeParse(listingId);
  if (!id.success) return null;
  return readListerFeePolicy({ listingId: id.data, propertyType: null, listingIntent: null });
}
