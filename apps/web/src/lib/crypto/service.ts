import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { recordAlert } from "@/lib/alerts";
import { announce } from "@/lib/notify/junction";
import { announceConfirmedStay } from "@/lib/bookings/arrival";
import type { AdminClient } from "@/lib/supabase/service";
import { findPair, refundAddressLooksValid, type AssetPair } from "./assets";
import { DecimalError, parseRate, quoteAgrees, toAtomic } from "./decimal";
import { cryptoMessage } from "./messages";
import { CryptoProviderError, type CryptoRampProvider, type ProviderEvent, type SettlementLeg } from "./provider";
import { cryptoReference } from "./reference";
import { transition, type CryptoState } from "./state-machine";
import { VIEW_COLUMNS, toCryptoView, type CryptoPaymentView } from "./view";

/**
 * Crypto payment orchestration. SERVER ONLY, and every figure it acts on is
 * read from the database, never from a browser.
 *
 * The three moves, each one refusing in a sentence rather than half-doing:
 *
 *   requestQuote   the booking's own stored naira total, for its own guest,
 *                  priced by the provider, sanity-checked against the
 *                  provider's own rate, written as a `quoted` row.
 *   startPayment   opens the payment attempt through the normal gate
 *                  (`crypto_open_attempt`, which reads the split from the
 *                  database and refuses while another payment of the charge is
 *                  in flight), builds the three settlement legs from that split
 *                  and asks the provider for its deposit address. The AMOUNTS
 *                  are the card split's; the DESTINATIONS are the crypto
 *                  rail's own: the lister's share to the lister's verified
 *                  payout bank account (read from the database), the Guarantee
 *                  contribution to the reserve's BANK account
 *                  (YELLOWCARD_RESERVE_*), and Vallo's commission to Vallo's
 *                  settlement account at the provider, which the founder has
 *                  confirmed pays out to Vallo's bank
 *                  (YELLOWCARD_PROVIDER_ACCOUNTS_ARE_BANK_PAYOUTS). None of
 *                  them is a Paystack subaccount and none is a provider balance
 *                  held for anybody.
 *   applyEvent     one provider report, applied once, in order, by the
 *                  database (`crypto_payment_apply`), then told to the payer.
 *
 * Nothing here holds, credits or moves money. Settlement is the provider's;
 * recording it is `private.settle_booking_charge`'s.
 */

type Loose = SupabaseClient;
const loose = (admin: AdminClient): Loose => admin as unknown as Loose;

export type ServiceResult<T> = { ok: true; data: T } | { ok: false; message: string };
const refuse = <T>(message: string): ServiceResult<T> => ({ ok: false, message });

export const CRYPTO_REFUSALS = {
  notOffered: "That asset and network are not offered for crypto payment.",
  notFound: "We could not find that charge on your account.",
  notPayable: "This charge cannot be paid right now. Open it again from your bookings.",
  alreadyPaid: "This charge is already paid, so there is nothing to pay again.",
  quoteFailed: "We could not get a crypto quote just now. Nothing has been paid. Try again, or pay another way.",
  quoteUnreadable: "The crypto quote did not add up, so we did not show it. Nothing has been paid. Try again in a moment.",
  quoteExpired: "That quote ran out. Get a new one; nothing has been paid.",
  refundAddress: "Enter a refund address on the same network you are paying from. If you send too much, or the quote runs out, the provider returns crypto there.",
  openFailed: "We could not open the crypto payment. Nothing has been paid.",
  providerRefused: "The crypto provider could not open this payment. Nothing has been paid. Try again, or pay another way.",
  notYours: "We could not find that crypto payment on your account.",
} as const;

const OPEN_REFUSALS: Record<string, string> = {
  reserve_not_set_up: "Payments are paused while Vallo finishes setting up the Guarantee reserve account. Nothing has been paid.",
  no_agreement: "Payment is not open yet. The agreement has to be confirmed by both of you and approved by Vallo first.",
  agreement_not_approved: "Payment opens once Vallo approves the agreement.",
  payee_not_set_up: "Crypto payment cannot open yet because the owner or agent has not finished setting up a verified payout account. Nothing has been paid.",
  amount_mismatch: "The amount on this charge does not match the approved agreement, so payment is paused. Contact support.",
  already_paid: CRYPTO_REFUSALS.alreadyPaid,
  in_flight:
    "Another payment for this charge is already under way, so a crypto payment was not opened. Nothing has been paid twice. Wait for it to finish, or open the payment you already started.",
  quote_expired: CRYPTO_REFUSALS.quoteExpired,
};

/** The booking as the payment paths may act on it. Read with the service role, ownership checked here. */
async function payableBooking(
  admin: AdminClient,
  bookingId: string,
  payerId: string,
): Promise<ServiceResult<{ id: string; totalMinor: number }>> {
  const { data, error } = await admin
    .from("bookings")
    .select("id, guest_id, status, total_minor, currency")
    .eq("id", bookingId)
    .maybeSingle();
  if (error) return refuse(CRYPTO_REFUSALS.notPayable);
  if (!data || data.guest_id !== payerId) return refuse(CRYPTO_REFUSALS.notFound);
  if (data.status !== "PENDING" && data.status !== "CONFIRMED") return refuse(CRYPTO_REFUSALS.notPayable);
  if (data.currency !== "NGN" || !Number.isSafeInteger(data.total_minor) || data.total_minor <= 0) {
    return refuse(CRYPTO_REFUSALS.notPayable);
  }
  const paid = await admin
    .from("transactions")
    .select("id")
    .eq("booking_id", bookingId)
    .eq("status", "SUCCESSFUL")
    .limit(1);
  if (paid.error) return refuse(CRYPTO_REFUSALS.notPayable);
  if ((paid.data ?? []).length > 0) return refuse(CRYPTO_REFUSALS.alreadyPaid);
  return { ok: true, data: { id: data.id, totalMinor: data.total_minor } };
}

export async function readCryptoPayment(client: Loose, match: { id?: string; reference?: string }): Promise<CryptoPaymentView | null> {
  let query = client.from("crypto_payments").select(VIEW_COLUMNS);
  if (match.id) query = query.eq("id", match.id);
  else if (match.reference) query = query.eq("reference", match.reference);
  else return null;
  const { data, error } = await query.maybeSingle();
  if (error || !data) return null;
  return toCryptoView(data as Record<string, unknown>);
}

/* -------------------------------------------------------------- quote */

export async function requestQuote(params: {
  admin: AdminClient;
  provider: CryptoRampProvider;
  enabled: readonly AssetPair[];
  bookingId: string;
  payerId: string;
  asset: string;
  network: string;
}): Promise<ServiceResult<CryptoPaymentView>> {
  const pair = findPair(params.asset, params.network);
  if (!pair || !params.enabled.includes(pair)) return refuse(CRYPTO_REFUSALS.notOffered);

  const booking = await payableBooking(params.admin, params.bookingId, params.payerId);
  if (!booking.ok) return booking;

  const reference = cryptoReference();
  let quote;
  try {
    quote = await params.provider.quote({ reference, amountMinor: booking.data.totalMinor, asset: pair.asset, network: pair.network });
  } catch {
    return refuse(CRYPTO_REFUSALS.quoteFailed);
  }

  /* The provider prices it; we only check that its figures agree with each
     other, at the asset's precision, so a unit slip never reaches a person. */
  try {
    const rate = parseRate(quote.rate);
    const atomic = toAtomic(quote.cryptoAmount, pair.decimals);
    if (!Number.isSafeInteger(quote.feeMinor) || quote.feeMinor < 0) return refuse(CRYPTO_REFUSALS.quoteUnreadable);
    if (!quoteAgrees(atomic, booking.data.totalMinor + quote.feeMinor, rate, pair.decimals)) {
      return refuse(CRYPTO_REFUSALS.quoteUnreadable);
    }
    if (Date.parse(quote.expiresAt) <= Date.now()) return refuse(CRYPTO_REFUSALS.quoteExpired);
  } catch (error) {
    if (error instanceof DecimalError) return refuse(CRYPTO_REFUSALS.quoteUnreadable);
    throw error;
  }

  const { data, error } = await loose(params.admin)
    .from("crypto_payments")
    .insert({
      reference,
      booking_id: booking.data.id,
      payer_id: params.payerId,
      provider: params.provider.id,
      provider_quote_id: quote.quoteId,
      asset: pair.asset,
      network: pair.network,
      asset_decimals: pair.decimals,
      amount_minor: booking.data.totalMinor,
      fee_minor: quote.feeMinor,
      rate_ngn: quote.rate,
      crypto_amount: quote.cryptoAmount,
      quote_expires_at: quote.expiresAt,
      state: "quoted",
    })
    .select(VIEW_COLUMNS)
    .single();
  if (error || !data) return refuse(CRYPTO_REFUSALS.quoteFailed);
  const view = toCryptoView(data as Record<string, unknown>);
  return view ? { ok: true, data: view } : refuse(CRYPTO_REFUSALS.quoteFailed);
}

/* -------------------------------------------------------------- start */

type OpenAnswer = {
  status: string;
  amount_minor?: number;
  lister_share_minor?: number;
  guarantee_minor?: number;
  commission_minor?: number;
  lister_bank_code?: string;
  lister_account_number?: string;
  lister_account_name?: string;
};

/**
 * The three legs, from the database's split. They add up to the charge by
 * construction (`transactions_split_adds_up`), and are checked again here
 * before anything is sent, because a wrong leg is money to the wrong person.
 */
export function settlementLegs(
  answer: OpenAnswer,
  platform: NonNullable<ReturnType<CryptoRampProvider["platformDestinations"]>>,
): SettlementLeg[] | null {
  const lister = Number(answer.lister_share_minor);
  const guarantee = Number(answer.guarantee_minor);
  const commission = Number(answer.commission_minor);
  const total = Number(answer.amount_minor);
  if (![lister, guarantee, commission, total].every((n) => Number.isSafeInteger(n) && n >= 0)) return null;
  if (lister + guarantee + commission !== total || total <= 0) return null;
  if (!answer.lister_bank_code || !answer.lister_account_number || !answer.lister_account_name) return null;
  return [
    {
      role: "lister",
      amountMinor: lister,
      destination: {
        kind: "bank",
        bankCode: answer.lister_bank_code,
        accountNumber: answer.lister_account_number,
        accountName: answer.lister_account_name,
      },
    },
    { role: "guarantee_reserve", amountMinor: guarantee, destination: platform.reserve },
    { role: "vallo_commission", amountMinor: commission, destination: platform.vallo },
  ];
}

/** The legs' destinations as the event record keeps them. */
export function legDestinations(legs: readonly SettlementLeg[]): Record<string, unknown>[] {
  return legs.map((leg) => ({
    role: leg.role,
    amount_minor: leg.amountMinor,
    ...(leg.destination.kind === "bank"
      ? {
          kind: "bank",
          bank_code: leg.destination.bankCode,
          ...(leg.role === "lister"
            ? { account_last4: leg.destination.accountNumber.slice(-4) }
            : { account_number: leg.destination.accountNumber, account_name: leg.destination.accountName }),
        }
      : { kind: "provider_account", account_id: leg.destination.accountId }),
  }));
}

export async function startPayment(params: {
  admin: AdminClient;
  provider: CryptoRampProvider;
  paymentId: string;
  payerId: string;
  refundAddress: string;
  reserveCode: string | null;
  payer: { email: string | null; legalName: string | null };
}): Promise<ServiceResult<CryptoPaymentView>> {
  const admin = loose(params.admin);
  const { data: row, error } = await admin
    .from("crypto_payments")
    .select("id, reference, payer_id, state, asset, network, amount_minor, provider, provider_quote_id, quote_expires_at")
    .eq("id", params.paymentId)
    .maybeSingle();
  if (error || !row || row.payer_id !== params.payerId || row.provider !== params.provider.id) return refuse(CRYPTO_REFUSALS.notYours);

  /* A second tap on a payment already opened answers with it, not a second one. */
  if (row.state !== "quoted") {
    const existing = await readCryptoPayment(admin, { id: row.id });
    return existing ? { ok: true, data: existing } : refuse(CRYPTO_REFUSALS.openFailed);
  }
  if (Date.parse(row.quote_expires_at) <= Date.now()) return refuse(CRYPTO_REFUSALS.quoteExpired);

  const refundAddress = params.refundAddress.trim();
  if (!refundAddressLooksValid(row.network, refundAddress)) return refuse(CRYPTO_REFUSALS.refundAddress);

  const platform = params.provider.platformDestinations();
  if (!platform || !params.provider.isDirectSettlementReady()) return refuse(CRYPTO_REFUSALS.providerRefused);

  const opened = await admin.rpc("crypto_open_attempt", { p_payment: row.id, p_reserve_code: params.reserveCode ?? "" });
  if (opened.error) return refuse(CRYPTO_REFUSALS.openFailed);
  const answer = (opened.data ?? {}) as OpenAnswer;
  if (answer.status !== "ok") return refuse(OPEN_REFUSALS[answer.status] ?? CRYPTO_REFUSALS.openFailed);

  const legs = settlementLegs(answer, platform);
  if (!legs) {
    await applyEvent(params.admin, params.provider, {
      eventId: `app:legs:${row.reference}`,
      reference: row.reference,
      providerPaymentId: null,
      state: "failed",
      facts: { reason: "settlement_legs_invalid" },
    }, "app", { notify: false });
    return refuse(CRYPTO_REFUSALS.openFailed);
  }

  let payment;
  try {
    payment = await params.provider.createPayment({
      reference: row.reference,
      quoteId: row.provider_quote_id ?? "",
      asset: row.asset,
      network: row.network,
      amountMinor: row.amount_minor,
      refundAddress,
      payer: params.payer,
      settlement: legs,
    });
  } catch (err) {
    /* Nothing was issued, so nothing can arrive: the attempt is closed as
       failed and the charge stays payable another way. */
    await applyEvent(params.admin, params.provider, {
      eventId: `app:create-failed:${row.reference}`,
      reference: row.reference,
      providerPaymentId: null,
      state: "failed",
      facts: { reason: err instanceof CryptoProviderError ? "provider_refused" : "provider_unreachable" },
    }, "app", { notify: false });
    return refuse(CRYPTO_REFUSALS.providerRefused);
  }

  const applied = await applyEvent(params.admin, params.provider, {
    eventId: `app:issued:${row.reference}`,
    reference: row.reference,
    providerPaymentId: payment.providerPaymentId,
    state: "awaiting_payment",
    facts: {
      ...(payment.confirmationsRequired !== null ? { confirmationsRequired: payment.confirmationsRequired } : {}),
    },
  }, "app", {
    extra: {
      deposit_address: payment.depositAddress,
      deposit_memo: payment.depositMemo,
      hosted_url: payment.hostedUrl,
      refund_address: refundAddress,
      expires_at: payment.expiresAt,
      /* Where each leg was told to settle, kept on the event (append-only)
         so the record shows the real destinations, not only the amounts. The
         lister's account number is not repeated here: it is already on the
         payout account the database read it from. */
      settlement_destinations: legDestinations(legs),
    },
  });
  if (!applied.ok) return refuse(CRYPTO_REFUSALS.openFailed);
  const view = await readCryptoPayment(admin, { id: row.id });
  return view ? { ok: true, data: view } : refuse(CRYPTO_REFUSALS.openFailed);
}

/* -------------------------------------------------------------- apply */

export type ApplyOutcome =
  | "applied"
  | "updated"
  | "stale"
  | "refused"
  | "duplicate"
  | "amount-mismatch"
  | "unknown-reference"
  | "wrong-provider"
  | "bad_request";

/** The facts as the database function reads them (snake case, strings for crypto). */
export function factsForDb(event: ProviderEvent, extra: Record<string, unknown> = {}): Record<string, unknown> {
  const f = event.facts;
  const out: Record<string, unknown> = { ...extra };
  if (event.providerPaymentId) out.provider_payment_id = event.providerPaymentId;
  if (f.confirmations !== undefined) out.confirmations = f.confirmations;
  if (f.confirmationsRequired !== undefined) out.confirmations_required = f.confirmationsRequired;
  if (f.txHash) out.tx_hash = f.txHash;
  if (f.cryptoReceived) out.crypto_received = f.cryptoReceived;
  if (f.cryptoOverpaid) out.crypto_overpaid = f.cryptoOverpaid;
  if (f.cryptoRefunded) out.crypto_refunded = f.cryptoRefunded;
  if (f.refundTxHash) out.refund_tx_hash = f.refundTxHash;
  if (f.settledMinor !== undefined) out.settled_minor = f.settledMinor;
  if (f.reason) out.reason = f.reason;
  for (const key of Object.keys(out)) if (out[key] === null || out[key] === undefined) delete out[key];
  return out;
}

export type Applied = {
  ok: boolean;
  outcome: ApplyOutcome | "error";
  state: CryptoState | null;
  chargeOutcome: string | null;
};

/**
 * Apply one report. The DATABASE decides (idempotency, order, amount); this
 * only carries the report there and, when it changed something, tells the
 * payer and the desk. Throws only when the database could not be asked, so a
 * webhook can answer 500 and be retried.
 */
export async function applyEvent(
  adminClient: AdminClient,
  provider: CryptoRampProvider,
  event: ProviderEvent,
  source: "webhook" | "reconcile" | "app",
  options: { notify?: boolean; extra?: Record<string, unknown> } = {},
): Promise<Applied> {
  const admin = loose(adminClient);
  const { data, error } = await admin.rpc("crypto_payment_apply", {
    p_reference: event.reference,
    p_provider: provider.id,
    p_event_id: event.eventId,
    p_source: source,
    p_to_state: event.state,
    p_facts: factsForDb(event, options.extra),
  });
  if (error) throw new Error(`crypto_payment_apply: ${error.message}`);
  const answer = (data ?? {}) as { outcome?: string; state?: string; charge?: { outcome?: string; reason?: string } };
  const outcome = (answer.outcome ?? "error") as Applied["outcome"];
  const state = (answer.state ?? null) as CryptoState | null;
  const chargeOutcome = answer.charge?.outcome ?? null;

  if (outcome === "amount-mismatch") {
    await recordAlert({
      kind: "crypto.settlement_amount_mismatch",
      severity: "critical",
      detail: { reference: event.reference, settled_minor: event.facts.settledMinor ?? null },
      subjectId: event.reference,
    });
  }
  if (chargeOutcome === "refund-due" || chargeOutcome === "unknown-reference") {
    /* The provider settled naira for a charge that could not be applied (paid
       twice, cancelled, amount wrong). The naira is with the lister, not with
       Vallo, so returning it is a person's job with the provider and lister. */
    await recordAlert({
      kind: "crypto.return_needed",
      severity: "critical",
      detail: { reference: event.reference, reason: answer.charge?.reason ?? chargeOutcome },
      subjectId: event.reference,
    });
  }

  const changed = outcome === "applied";
  if (changed && state === "settled" && chargeOutcome === "settled") {
    const view = await readCryptoPayment(admin, { reference: event.reference });
    if (view) await announceConfirmedStay(adminClient, { bookingId: view.bookingId });
  }
  if (changed && options.notify !== false && state) {
    await tellPayer(adminClient, provider, event.reference, state);
  }
  return { ok: outcome === "applied" || outcome === "updated" || outcome === "duplicate" || outcome === "stale", outcome, state, chargeOutcome };
}

/** The in-app row and the email for one state. Never throws. */
async function tellPayer(adminClient: AdminClient, provider: CryptoRampProvider, reference: string, state: CryptoState): Promise<void> {
  try {
    const admin = loose(adminClient);
    const view = await readCryptoPayment(admin, { reference });
    if (!view) return;
    const { data } = await admin.from("crypto_payments").select("payer_id").eq("reference", reference).maybeSingle();
    const payerId = (data as { payer_id?: string } | null)?.payer_id;
    if (!payerId) return;
    const message = cryptoMessage(state, view, { providerName: provider.displayName });
    if (!message) return;
    await announce(adminClient, {
      recipient: { kind: "user", userId: payerId },
      notice: { kind: "booking", title: message.title, body: message.body, href: `/pay/crypto/${reference}` },
      email: message.email
        ? (contact) => cryptoMessage(state, view, { name: contact.name, providerName: provider.displayName })?.email ?? message.email!
        : null,
    });
  } catch {
    /* A message that could not be sent never undoes a recorded payment. */
  }
}

/** What the reconcile job would do with a report, for the tests and the desk. */
export function wouldApply(from: CryptoState, event: ProviderEvent): ReturnType<typeof transition> {
  return transition(from, event.state);
}
