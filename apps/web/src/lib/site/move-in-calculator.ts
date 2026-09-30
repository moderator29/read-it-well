import { cashAtDoor } from "@/lib/listings/upfront";
import { parseNairaToKobo, MAX_MOVE_KOBO } from "@/lib/money/amount";
import { feeRuleFor, FEE_RULES, type FeeRule } from "@/lib/trust/fee-rules";

/**
 * A8. THE PUBLIC MOVE-IN CALCULATOR, AS ARITHMETIC.
 *
 * It prints only what the visitor typed. There is no "typical" fee in here:
 * the codebase holds exactly one published rule (`lib/trust/fee-rules.ts`,
 * Lagos State's maximums, with its source), and the calculator may offer to
 * fill those maximums in, labelled as the most the rule allows. Every other
 * figure is the visitor's own.
 *
 * THE MATHS IS THE LISTING'S. The total is `cashAtDoor` from
 * `lib/listings/upfront.ts`, the same function every rental card uses: one
 * year's move-in total, plus the rent for every further year the landlord
 * asks for up front. Money is integer kobo from the moment it is parsed.
 *
 * Client safe: data and pure functions only.
 */

export const FEE_LINES = ["agency", "legal", "caution", "agreement", "service"] as const;
export type FeeLine = (typeof FEE_LINES)[number];

/** One fee as typed: naira, or a percent of a year's rent. */
export type FeeInput = { mode: "amount" | "percent"; value: string };

export type MoveInInput = {
  rent: string;
  years: number;
  fees: Partial<Record<FeeLine, FeeInput>>;
};

export type MoveInLine = { key: "rent" | FeeLine; minor: number };

export type MoveInResult =
  | { state: "empty" }
  | { state: "invalid"; field: "rent" | FeeLine }
  | { state: "ok"; rentMinor: number; years: number; lines: MoveInLine[]; totalMinor: number };

export const YEAR_CHOICES = [1, 2, 3] as const;

/** Percent as typed ("10", "7.5") to integer basis points, or null. At most 100 percent. */
export function percentToBps(raw: string): number | null {
  const trimmed = raw.trim().replace(/%$/, "").trim();
  if (!/^\d{1,3}(\.\d{1,2})?$/.test(trimmed)) return null;
  const bps = Math.round(Number(trimmed) * 100);
  return bps <= 10_000 ? bps : null;
}

/** Basis points of a yearly rent, in kobo, rounded to the kobo. */
export function shareOf(rentMinor: number, bps: number): number {
  return Math.round((rentMinor * bps) / 10_000);
}

function feeMinor(input: FeeInput | undefined, rentMinor: number): number | null | "blank" {
  if (!input || input.value.trim() === "") return "blank";
  if (input.mode === "percent") {
    const bps = percentToBps(input.value);
    return bps === null ? null : shareOf(rentMinor, bps);
  }
  const minor = parseNairaToKobo(input.value);
  return minor === null || minor > MAX_MOVE_KOBO * 10 ? null : minor;
}

export function clampYears(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  return (YEAR_CHOICES as readonly number[]).includes(n) ? n : 1;
}

/**
 * The move-in total for what was typed. A blank fee is absent (not zero: the
 * line is simply not printed), a malformed one is named so the form can say
 * which field to fix.
 */
export function computeMoveIn(input: MoveInInput): MoveInResult {
  if (input.rent.trim() === "") return { state: "empty" };
  const rentMinor = parseNairaToKobo(input.rent);
  if (rentMinor === null || rentMinor <= 0 || rentMinor > MAX_MOVE_KOBO * 10) return { state: "invalid", field: "rent" };
  const years = clampYears(input.years);

  const fees: MoveInLine[] = [];
  for (const key of FEE_LINES) {
    const minor = feeMinor(input.fees[key], rentMinor);
    if (minor === null) return { state: "invalid", field: key };
    if (minor === "blank" || minor === 0) continue;
    fees.push({ key, minor });
  }
  const oneYear = rentMinor + fees.reduce((sum, line) => sum + line.minor, 0);
  const cash = cashAtDoor({
    intent: "rent",
    pricePeriod: "year",
    priceMinor: rentMinor,
    moveInCostMinor: oneYear,
    minimumTenancyMonths: years * 12,
  });
  const totalMinor = cash?.minor ?? oneYear;
  return {
    state: "ok",
    rentMinor,
    years,
    lines: [{ key: "rent", minor: rentMinor * years }, ...fees],
    totalMinor,
  };
}

/** The states the calculator offers, with the rule (if any) each one has. */
export const CALCULATOR_STATES: readonly { code: string; name: string }[] = [
  { code: "LA", name: "Lagos" },
  { code: "FC", name: "Abuja (FCT)" },
  { code: "RI", name: "Rivers" },
  { code: "OY", name: "Oyo" },
  { code: "EN", name: "Enugu" },
  { code: "OG", name: "Ogun" },
];

export function publishedRule(stateCode: string | null | undefined): FeeRule | null {
  return feeRuleFor(stateCode);
}

/** Every state with a published rule, so a test can hold the calculator to the data. */
export const RULE_STATES = FEE_RULES.map((rule) => rule.stateCode);

/** "10%" from basis points, dropping a trailing ".0". */
export function bpsLabel(bps: number): string {
  const whole = bps / 100;
  return `${Number.isInteger(whole) ? whole : whole.toFixed(1)}%`;
}

/** Read a calculator link's query into an input, tolerating anything. */
export function inputFromQuery(query: Record<string, string | string[] | undefined>): MoveInInput {
  const one = (key: string) => {
    const value = query[key];
    return (Array.isArray(value) ? value[0] : value)?.slice(0, 24) ?? "";
  };
  const fees: Partial<Record<FeeLine, FeeInput>> = {};
  for (const key of FEE_LINES) {
    const value = one(key);
    if (value) fees[key] = { mode: one(`${key}Mode`) === "percent" ? "percent" : "amount", value };
  }
  return { rent: one("rent"), years: clampYears(one("years") || 1), fees };
}

/** The shareable link for an input: only the figures, never anything about a person. */
export function queryFromInput(input: MoveInInput, state: string): string {
  const params = new URLSearchParams();
  if (input.rent.trim()) params.set("rent", input.rent.trim());
  if (input.years !== 1) params.set("years", String(input.years));
  if (state) params.set("state", state);
  for (const key of FEE_LINES) {
    const fee = input.fees[key];
    if (!fee || !fee.value.trim()) continue;
    params.set(key, fee.value.trim());
    if (fee.mode === "percent") params.set(`${key}Mode`, "percent");
  }
  const text = params.toString();
  return text ? `?${text}` : "";
}
