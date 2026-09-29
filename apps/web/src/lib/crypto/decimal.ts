/**
 * Exact decimal arithmetic for crypto amounts and naira kobo.
 *
 * NO FLOATS FOR MONEY. A crypto amount is a decimal STRING at the asset's own
 * precision ("103.014695" USDT is six decimals, "0.00123456" BTC is eight), and
 * every calculation here runs on bigint in the asset's smallest unit (atomic
 * units: 1 USDT = 1_000_000, 1 BTC = 100_000_000). Naira is integer kobo.
 * A provider's JSON number is never trusted as a float: the parser takes a
 * string, or a number only when its canonical string form is exact.
 *
 * Client-safe: no server imports, so the quote card can format with it too.
 */

const DECIMAL_RE = /^(\d+)(?:\.(\d+))?$/;

/** The largest precision any supported asset has (ETH-family tokens go to 18). */
export const MAX_DECIMALS = 18;

export class DecimalError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DecimalError";
  }
}

function checkDecimals(decimals: number): void {
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > MAX_DECIMALS) {
    throw new DecimalError(`Asset precision must be an integer from 0 to ${MAX_DECIMALS}.`);
  }
}

/**
 * A provider value as a canonical decimal string, or null.
 *
 * Accepts a string, or a finite non-negative number whose own string form is
 * a plain decimal (no exponent). `1e-7` is refused rather than guessed at.
 */
export function asDecimalString(value: unknown): string | null {
  let text: string;
  if (typeof value === "string") text = value.trim();
  else if (typeof value === "number" && Number.isFinite(value) && value >= 0) text = String(value);
  else return null;
  return DECIMAL_RE.test(text) ? text : null;
}

/**
 * Parse a decimal string into atomic units at `decimals` precision.
 *
 * STRICT: more fractional digits than the asset has is refused, never
 * rounded, because "0.0000001 USDT" is not an amount anybody can send. Pass
 * `round: "up"` only where a price is being computed, never where a payment is
 * being read.
 */
export function toAtomic(value: string, decimals: number): bigint {
  checkDecimals(decimals);
  const match = DECIMAL_RE.exec(value.trim());
  if (!match) throw new DecimalError(`"${value}" is not a plain decimal amount.`);
  const whole = match[1] ?? "0";
  const fraction = match[2] ?? "";
  if (fraction.length > decimals) {
    throw new DecimalError(`"${value}" has more than ${decimals} decimal places.`);
  }
  return BigInt(whole + fraction.padEnd(decimals, "0"));
}

/**
 * Atomic units back to a decimal string, trailing zeros trimmed.
 *
 * `fixed: true` keeps every decimal place (the exact figure to send), which is
 * what goes on the payment instruction; the trimmed form is for reading.
 */
export function fromAtomic(atomic: bigint, decimals: number, options: { fixed?: boolean } = {}): string {
  checkDecimals(decimals);
  if (atomic < 0n) throw new DecimalError("An amount cannot be negative.");
  const digits = atomic.toString().padStart(decimals + 1, "0");
  const whole = digits.slice(0, digits.length - decimals) || "0";
  let fraction = decimals > 0 ? digits.slice(digits.length - decimals) : "";
  if (!options.fixed) fraction = fraction.replace(/0+$/, "");
  return fraction.length > 0 ? `${whole}.${fraction}` : whole;
}

/** A rate of naira per ONE whole unit of the asset, held exactly as num / 10^scale. */
export type Rate = { num: bigint; scale: number };

/** Parse a provider rate ("1650.25" naira per USDT) exactly. Must be positive. */
export function parseRate(value: string): Rate {
  const match = DECIMAL_RE.exec(value.trim());
  if (!match) throw new DecimalError(`"${value}" is not a plain decimal rate.`);
  const fraction = match[2] ?? "";
  if (fraction.length > MAX_DECIMALS) throw new DecimalError("The rate has too many decimal places.");
  const num = BigInt((match[1] ?? "0") + fraction);
  if (num <= 0n) throw new DecimalError("A rate must be above zero.");
  return { num, scale: fraction.length };
}

const TEN = 10n;
function pow10(n: number): bigint {
  return TEN ** BigInt(n);
}

function divCeil(a: bigint, b: bigint): bigint {
  return (a + b - 1n) / b;
}

/**
 * How much crypto pays `kobo` naira at `rate`, in atomic units, ROUNDED UP.
 *
 * Up, because the payee must receive the whole charge: rounding down would
 * leave the provider converting a fraction of a kobo short. The payer's
 * excess is below one atomic unit of the asset.
 *
 *   atomic = ceil(kobo * 10^decimals * 10^scale / (num * 100))
 */
export function cryptoForKobo(kobo: number, rate: Rate, decimals: number): bigint {
  checkDecimals(decimals);
  if (!Number.isSafeInteger(kobo) || kobo <= 0) throw new DecimalError("Kobo must be a positive whole number.");
  return divCeil(BigInt(kobo) * pow10(decimals) * pow10(rate.scale), rate.num * 100n);
}

/**
 * What `atomic` units of the asset are worth in kobo at `rate`, ROUNDED DOWN.
 *
 * Down, because this is used to judge whether a payment covers a charge, and
 * a payment is never credited with money it did not bring.
 */
export function koboForCrypto(atomic: bigint, rate: Rate, decimals: number): number {
  checkDecimals(decimals);
  if (atomic < 0n) throw new DecimalError("An amount cannot be negative.");
  const kobo = (atomic * rate.num * 100n) / (pow10(decimals) * pow10(rate.scale));
  if (kobo > BigInt(Number.MAX_SAFE_INTEGER)) throw new DecimalError("The amount is too large.");
  return Number(kobo);
}

/**
 * Whether a provider's quoted crypto amount agrees with its own rate.
 *
 * A sanity check, not a price: the provider is the one converting. It catches
 * a unit slip (an amount in kobo read as naira is 100 times off, a USDT amount
 * read at BTC precision is 100 times off) before a person is asked to send
 * anything. The tolerance is `toleranceBps` either side of the exact figure
 * for `kobo`, and never less than one atomic unit.
 */
export function quoteAgrees(
  quotedAtomic: bigint,
  kobo: number,
  rate: Rate,
  decimals: number,
  toleranceBps = 100,
): boolean {
  const exact = cryptoForKobo(kobo, rate, decimals);
  const slack = (exact * BigInt(toleranceBps)) / 10_000n;
  const allowed = slack > 1n ? slack : 1n;
  const diff = quotedAtomic > exact ? quotedAtomic - exact : exact - quotedAtomic;
  return diff <= allowed;
}

/** Compare two amounts already in atomic units: -1, 0 or 1. */
export function compareAtomic(a: bigint, b: bigint): -1 | 0 | 1 {
  return a < b ? -1 : a > b ? 1 : 0;
}
