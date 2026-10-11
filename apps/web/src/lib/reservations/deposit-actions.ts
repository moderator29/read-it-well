"use server";

/**
 * D75: the guest pays a restaurant's table deposit by card, on the direct rail.
 *
 * Off unless `restaurant_deposits` is on (the database checks it again). The
 * amount, the venue's share and Vallo's commission are the database's
 * (`reservation_deposit_open`, behind `reservation_deposits_00_gate`); this
 * file never computes money. The deposit row is written before Paystack is
 * called, so a webhook that beats the redirect has something to settle. A
 * second press resumes the first checkout instead of opening another.
 */

import { headers } from "next/headers";
import { z } from "zod";
import { fail, ok, type ActionResult } from "../actions/envelope";
import { NOT_CONFIGURED_MESSAGE, SIGNED_OUT_MESSAGE, resolveSession } from "../actions/session";
import { flagIsOn } from "../flags/read";
import { PaystackError, PaystackUnknownOutcome, currentPaystackMode } from "../payments/paystack";
import { assertProviderEnabled, openCheckout, paystackSeam } from "../payments/providers";
import { DEPOSIT_PREFIX } from "../payments/references";
import { getAdminClient } from "@/lib/supabase/service";
import { RESTAURANT_DEPOSITS_FLAG, depositRefusal } from "./deposits";

export type DepositCheckout = { reference: string; amountMinor: number; authorizationUrl: string; accessCode: string };

const idSchema = z.string().uuid();

async function siteOrigin(): Promise<string> {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  if (explicit.length > 0) return explicit.replace(/\/+$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  return host ? `${proto}://${host}` : "http://localhost:3000";
}

type Opened = {
  status?: string;
  reference?: string;
  amount_minor?: number;
  payee_subaccount_code?: string;
  lister_share_minor?: number;
  commission_minor?: number;
  authorization_url?: string | null;
  access_code?: string | null;
};

export async function payReservationDeposit(reservationId: string): Promise<ActionResult<DepositCheckout>> {
  const session = await resolveSession();
  if (session.state === "unconfigured") return fail(NOT_CONFIGURED_MESSAGE);
  if (session.state === "signed-out") return fail(SIGNED_OUT_MESSAGE);
  if (!idSchema.safeParse(reservationId).success) return fail(depositRefusal("not_found"));
  if (!(await flagIsOn(RESTAURANT_DEPOSITS_FLAG))) return fail(depositRefusal("switched_off"));
  const email = session.user.email ?? null;
  if (!email) return fail("Card payment needs an email address on your account. Add one to your profile and try again.");

  try {
    await assertProviderEnabled("paystack");
  } catch {
    return fail(depositRefusal("unavailable"));
  }
  const admin = getAdminClient();
  if (!admin) return fail(depositRefusal("unavailable"));

  const { data, error } = await (admin as unknown as {
    rpc: (fn: string, args: Record<string, unknown>) => PromiseLike<{ data: unknown; error: unknown }>;
  }).rpc("reservation_deposit_open", { p_reservation: reservationId, p_guest: session.user.id, p_mode: currentPaystackMode() });
  if (error || !data || typeof data !== "object") return fail(depositRefusal("unavailable"));
  const opened = data as Opened;

  if (opened.status === "pending" && opened.reference && opened.authorization_url) {
    return ok({
      reference: opened.reference,
      amountMinor: Number(opened.amount_minor),
      authorizationUrl: opened.authorization_url,
      accessCode: opened.access_code ?? "",
    });
  }
  if (opened.status !== "ok") return fail(depositRefusal(opened.status ?? "unavailable"));

  const reference = opened.reference ?? "";
  const amountMinor = Number(opened.amount_minor);
  const listerShareMinor = Number(opened.lister_share_minor);
  if (!reference.startsWith(DEPOSIT_PREFIX) || !Number.isSafeInteger(amountMinor) || amountMinor <= 0 || !opened.payee_subaccount_code) {
    return fail(depositRefusal("unavailable"));
  }

  const db = admin as unknown as {
    rpc: (fn: string, args: Record<string, unknown>) => PromiseLike<{ data: unknown; error: unknown }>;
    from: (t: string) => { update: (v: Record<string, unknown>) => { eq: (k: string, v: string) => PromiseLike<unknown> } };
  };
  try {
    const tx = await openCheckout(paystackSeam(), {
      reference,
      amountMinor,
      email,
      callbackUrl: `${await siteOrigin()}/bookings?side=tables&deposit=${encodeURIComponent(reference)}`,
      metadata: { kind: "reservation_deposit", reservation_id: reservationId, user_id: session.user.id },
      /* The same dynamic split a stay uses: the venue's share to the venue's
         own subaccount, Vallo's commission stays with Vallo. No reserve leg. */
      split: { listerSubaccount: opened.payee_subaccount_code, listerShareMinor, reserveSubaccount: null, guaranteeMinor: 0 },
    });
    try {
      await db.from("reservation_deposits").update({ authorization_url: tx.authorizationUrl, access_code: tx.accessCode }).eq("provider_ref", reference);
    } catch {
      // Best effort: without it a second press opens a fresh checkout after this one is closed.
    }
    return ok({ reference, amountMinor, authorizationUrl: tx.authorizationUrl, accessCode: tx.accessCode });
  } catch (e) {
    if (e instanceof PaystackUnknownOutcome) {
      /* The checkout may exist: the row stays pending and the webhook settles
         it if the guest pays. Never closed on a guess. */
      return fail(depositRefusal("outcome_unknown"));
    }
    if (e instanceof PaystackError) {
      await db.rpc("reservation_deposit_close", { p_reference: reference, p_status: "failed" });
      return fail(depositRefusal("unavailable"));
    }
    return fail(depositRefusal("outcome_unknown"));
  }
}
