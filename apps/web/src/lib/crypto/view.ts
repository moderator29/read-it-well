import { findPair } from "./assets";
import { isCryptoState, type CryptoState } from "./state-machine";

/**
 * A crypto payment as the payer's screen draws it. Client-safe.
 *
 * Built from the `crypto_payments` row the payer reads under their own RLS,
 * never from anything a browser sent. Crypto figures stay decimal strings.
 */
export type CryptoPaymentView = {
  id: string;
  reference: string;
  bookingId: string;
  state: CryptoState;
  asset: string;
  network: string;
  assetName: string;
  networkName: string;
  decimals: number;
  networkWarning: string;
  amountMinor: number;
  feeMinor: number;
  rate: string;
  cryptoAmount: string;
  cryptoReceived: string | null;
  cryptoOverpaid: string | null;
  cryptoRefunded: string | null;
  depositAddress: string | null;
  depositMemo: string | null;
  hostedUrl: string | null;
  refundAddress: string | null;
  txHash: string | null;
  refundTxHash: string | null;
  confirmations: number | null;
  confirmationsRequired: number | null;
  expiresAt: string;
  settledAt: string | null;
  providerPaymentId: string | null;
  createdAt: string;
};

/**
 * The columns the view needs, in one place, for every select that builds one.
 * The `numeric` columns are cast to text IN THE QUERY, so an 18-decimal amount
 * never passes through a JavaScript number on its way to the screen.
 */
export const VIEW_COLUMNS =
  "id, reference, booking_id, state, asset, network, asset_decimals, amount_minor, fee_minor, rate_ngn:rate_ngn::text, crypto_amount:crypto_amount::text, crypto_received:crypto_received::text, crypto_overpaid:crypto_overpaid::text, crypto_refunded:crypto_refunded::text, deposit_address, deposit_memo, hosted_url, refund_address, tx_hash, refund_tx_hash, confirmations, confirmations_required, quote_expires_at, settled_at, provider_payment_id, created_at";

const text = (value: unknown): string | null => (typeof value === "string" && value.length > 0 ? value : null);
const count = (value: unknown): number | null => (typeof value === "number" && Number.isSafeInteger(value) ? value : null);

/**
 * PostgREST returns `numeric` as a JSON number or a string depending on size.
 * Either way it is turned into a decimal string at the asset's precision and
 * never used as a float for arithmetic.
 */
export function numericText(value: unknown, decimals: number): string | null {
  if (typeof value === "string" && /^\d+(\.\d+)?$/.test(value)) return trimTo(value, decimals);
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
    return trimTo(value.toFixed(Math.min(decimals, 20)), decimals);
  }
  return null;
}

function trimTo(value: string, decimals: number): string {
  const [whole, fraction = ""] = value.split(".");
  const cut = fraction.slice(0, decimals).replace(/0+$/, "");
  return cut.length > 0 ? `${whole}.${cut}` : (whole ?? "0");
}

export function toCryptoView(row: Record<string, unknown>): CryptoPaymentView | null {
  const state = row["state"];
  const decimals = count(row["asset_decimals"]);
  const id = text(row["id"]);
  const reference = text(row["reference"]);
  const bookingId = text(row["booking_id"]);
  const asset = text(row["asset"]);
  const network = text(row["network"]);
  const amountMinor = count(row["amount_minor"]);
  const expiresAt = text(row["quote_expires_at"]);
  if (!isCryptoState(state) || decimals === null || !id || !reference || !bookingId || !asset || !network || amountMinor === null || !expiresAt) {
    return null;
  }
  const cryptoAmount = numericText(row["crypto_amount"], decimals);
  const rate = numericText(row["rate_ngn"], 18);
  if (!cryptoAmount || !rate) return null;
  const pair = findPair(asset, network);
  return {
    id,
    reference,
    bookingId,
    state,
    asset,
    network,
    assetName: pair?.assetName ?? asset,
    networkName: pair?.networkName ?? network,
    decimals,
    networkWarning: pair?.warning ?? `Send ${asset} on the ${network} network only.`,
    amountMinor,
    feeMinor: count(row["fee_minor"]) ?? 0,
    rate,
    cryptoAmount,
    cryptoReceived: numericText(row["crypto_received"], decimals),
    cryptoOverpaid: numericText(row["crypto_overpaid"], decimals),
    cryptoRefunded: numericText(row["crypto_refunded"], decimals),
    depositAddress: text(row["deposit_address"]),
    depositMemo: text(row["deposit_memo"]),
    hostedUrl: text(row["hosted_url"]),
    refundAddress: text(row["refund_address"]),
    txHash: text(row["tx_hash"]),
    refundTxHash: text(row["refund_tx_hash"]),
    confirmations: count(row["confirmations"]),
    confirmationsRequired: count(row["confirmations_required"]),
    expiresAt,
    settledAt: text(row["settled_at"]),
    providerPaymentId: text(row["provider_payment_id"]),
    createdAt: text(row["created_at"]) ?? expiresAt,
  };
}
