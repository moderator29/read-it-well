import { intlTag, type Locale } from "@naijafinds/i18n";

/**
 * Money, set the way the reference set sets money.
 *
 * Across the fifteen supplied references the hero figure is always two-tone:
 * the number itself lands at full weight and near-full contrast, and the part
 * that is not the number - the ".00", the "of 300", the "/8hrs", the "/night" -
 * drops to a muted colour at a smaller size. It is a small detail and it is one
 * of the strongest single tells separating a premium product from a competent
 * one.
 *
 * The platform had this exactly once, on the wallet balance. Every other price
 * on the platform - including the listing detail page, which is the screen that
 * sells the product - rendered as flat single-tone text.
 *
 * Two other things this fixes on the way past:
 *
 * 1. Tabular figures. Digits are proportional by default in Inter, so a column
 *    of prices visibly jitters as values change. Every Amount is tabular.
 *
 * 2. Locale-consistent assembly. `formatMoney` returns one opaque string, and
 *    the naira sign was additionally hard-coded in five places. Those disagreed:
 *    ha-NG emits "₦ 9,000,000" with a space, so the wallet hero and the ledger
 *    row directly beneath it rendered the same currency differently. Building
 *    from `formatToParts` means the symbol, the grouping and the spacing all
 *    come from the locale, once, here.
 */

export type AmountProps = {
  /** Minor units. Kobo for NGN, exactly as the database stores it. */
  minorUnits: number;
  locale?: Locale;
  currency?: string;
  /**
   * Renders the fractional part (kobo) in the muted tone. Off by default,
   * because most prices on the platform are whole naira and a permanent ".00"
   * is noise. On for ledgers and receipts, where exactness is the point.
   */
  showFraction?: boolean;
  /**
   * The trailing qualifier: "/night", "of 300", "total". Rendered in the muted
   * tone at the smaller size, which is what makes the pairing read as one
   * composed figure rather than two pieces of text.
   */
  suffix?: string;
  /** Short form for dense rows and chart labels: ₦9M rather than ₦9,000,000. */
  compact?: boolean;
  /** Tailwind classes for the PRIMARY figure. Size and weight live here. */
  className?: string;
  /** Overrides the muted part's classes when the default relative size is wrong. */
  secondaryClassName?: string;
};

export function Amount({
  minorUnits,
  locale = "en",
  currency = "NGN",
  showFraction = false,
  suffix,
  compact = false,
  className,
  secondaryClassName,
}: AmountProps) {
  const major = minorUnits / 100;

  const parts = new Intl.NumberFormat(intlTag[locale], {
    style: "currency",
    currency,
    minimumFractionDigits: showFraction ? 2 : 0,
    maximumFractionDigits: showFraction ? 2 : 0,
    notation: compact ? "compact" : "standard",
  }).formatToParts(major);

  /*
   * The split point is the decimal separator. Everything up to it - symbol,
   * any locale spacing, sign, integer digits and group separators - is the
   * primary figure. The separator and the fraction are secondary.
   */
  const splitAt = parts.findIndex((p) => p.type === "decimal");
  const primary = (splitAt === -1 ? parts : parts.slice(0, splitAt))
    .map((p) => p.value)
    .join("");
  const fraction =
    splitAt === -1 ? "" : parts.slice(splitAt).map((p) => p.value).join("");

  const muted = secondaryClassName ?? "text-[0.62em] font-semibold opacity-60";

  return (
    <span className={["nf-numeric", className ?? ""].filter(Boolean).join(" ")}>
      {primary}
      {fraction ? <span className={muted}>{fraction}</span> : null}
      {suffix ? <span className={muted}> {suffix}</span> : null}
    </span>
  );
}

/**
 * The non-money sibling: a bare figure with a muted unit or denominator.
 * Reference 2's "260 of 300", reference 6's "7h 52m", reference 13's "92 bpm".
 */
export function Figure({
  value,
  suffix,
  locale = "en",
  className,
  secondaryClassName,
}: {
  value: number | string;
  suffix?: string;
  locale?: Locale;
  className?: string;
  secondaryClassName?: string;
}) {
  const shown =
    typeof value === "number" ? value.toLocaleString(intlTag[locale]) : value;
  const muted = secondaryClassName ?? "text-[0.62em] font-semibold opacity-60";
  return (
    <span className={["nf-numeric", className ?? ""].filter(Boolean).join(" ")}>
      {shown}
      {suffix ? <span className={muted}> {suffix}</span> : null}
    </span>
  );
}
