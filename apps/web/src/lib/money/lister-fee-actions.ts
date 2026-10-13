"use server";

/**
 * THE LISTER'S ACCEPTANCE, SENT TO BE RECORDED (D51, the agreement gate; D61).
 *
 * The screen (components/money/ListerFeeGate.tsx) shows the range and, only
 * while the `lister_fee_gate_blocking` flag is on, takes an explicit accept;
 * this sends exactly what was accepted. RECORDING IS SESSION 2'S: C2 REQUEST
 * 2 as revised by D61, `public.lister_fee_accept(...)` with the arguments
 * below, which re-derives every figure from the rate version and the terms
 * version, refuses a mismatch or a superseded version, and writes the actor
 * and the timestamp beside both rates as numbers and every figure shown. A
 * rate change never applies to an accepted listing; the lister is asked
 * again and keeps the accepted rate until they accept the new one (D51 rule
 * 3), so the record is versioned.
 *
 * Until it lands every call answers `unrecorded`. The wizard only calls this
 * when the flag is on, and then does not send the listing for review: an
 * acceptance nobody recorded is not an acceptance. With the flag off (its
 * state with no row) nothing is sent here and nothing waits.
 */

import { z } from "zod";
import { fail, ok, validate, type ActionResult } from "../actions/envelope";
import { NOT_CONFIGURED_MESSAGE, SIGNED_OUT_MESSAGE, resolveWriteSession } from "../actions/session";
import { FEE_ACCEPT_UNRECORDED, FEE_RATE_MOVED } from "./copy";
import type { ListerFeePolicy } from "./lister-fee";
import { readListerFeePolicy } from "./lister-fee-read";

const kobo = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const bps = z.number().int().nonnegative().max(9_999);
const AcceptanceSchema = z
  .object({
    listingId: z.string().uuid(),
    termsVersion: z.string().min(1).max(120),
    rateVersion: z.string().min(1).max(120),
    valloBps: bps,
    escrowProtectionBps: bps,
    directProcessorFeeCapMinor: kobo,
    capMinor: kobo.nullable(),
    priceMinor: kobo.positive(),
    valloMinor: kobo,
    escrowProtectionMinor: kobo,
    processorUpToMinor: kobo,
    receiveLowMinor: kobo,
    receiveHighMinor: kobo,
  })
  /* The worst case is the lower figure, and neither is above the price. The
     server re-derives every figure; this only refuses nonsense early. */
  .refine((a) => a.receiveLowMinor <= a.receiveHighMinor && a.receiveHighMinor <= a.priceMinor, {
    message: "The figures do not add up.",
  });

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
      p_terms_version: a.termsVersion,
      p_rate_version: a.rateVersion,
      p_vallo_bps: a.valloBps,
      p_escrow_protection_bps: a.escrowProtectionBps,
      p_direct_processor_fee_cap_minor: a.directProcessorFeeCapMinor,
      p_cap_minor: a.capMinor,
      p_price_minor: a.priceMinor,
      p_vallo_minor: a.valloMinor,
      p_escrow_protection_minor: a.escrowProtectionMinor,
      p_processor_up_to_minor: a.processorUpToMinor,
      p_receive_low_minor: a.receiveLowMinor,
      p_receive_high_minor: a.receiveHighMinor,
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
 * The rates in force for a saved listing, asked for by the wizard when it
 * reaches its submit step (the property type, and so any cap for a sale or
 * land row, is only known by then). Null whenever they cannot be read: the
 * gate then says so, and cannot be accepted.
 */
export async function fetchListerFeePolicy(listingId: unknown): Promise<ListerFeePolicy | null> {
  const id = z.string().uuid().safeParse(listingId);
  if (!id.success) return null;
  return readListerFeePolicy({ listingId: id.data, propertyType: null, listingIntent: null });
}
