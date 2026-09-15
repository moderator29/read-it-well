import { intlTag, isGlanceCompact, type Locale } from "@vallo/i18n";

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
  /** Short form for dense rows and chart labels: ₦9m rather than ₦9,000,000. */
  compact?: boolean;
  /**
   * The glance rule, applied here rather than at the call site.
   *
   * `compact` is unconditional and belongs where the SPACE is fixed and tiny: a
   * map pin, a stat tile. A card in a scrolling list is different. A stay at
   * ₦95,000 a night must read ₦95,000, because that is the number somebody is
   * comparing against the card below it, but a rental at ₦4,500,000 a year is
   * written ₦4.5m by every Nigerian who has ever advertised one.
   *
   * One threshold, owned by `@vallo/i18n`, so a search page mixing nightly
   * stays and yearly rents gets both right with no per-card decision anywhere.
   */
  glance?: boolean;
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
  glance = false,
  className,
  secondaryClassName,
}: AmountProps) {
  const major = minorUnits / 100;
  const short = compact || (glance && isGlanceCompact(minorUnits));

  const parts = new Intl.NumberFormat(intlTag[locale], {
    style: "currency",
    currency,
    /*
     * Compact notation carries its precision in the fraction: ₦1,500 compacts
     * to "₦1.5K". Forcing maximumFractionDigits to 0 rounds that to "₦2K",
     * which is a DIFFERENT NUMBER rather than a shortened one. Compact is
     * therefore left on Intl's own default of one fractional digit.
     */
    ...(short
      ? { notation: "compact" as const }
      : {
          minimumFractionDigits: showFraction ? 2 : 0,
          maximumFractionDigits: showFraction ? 2 : 0,
        }),
  }).formatToParts(major);

  /*
   * The split point is the decimal separator: everything before it - symbol,
   * any locale spacing, sign, integer digits and group separators - is the
   * primary figure, and the separator plus the fraction are secondary.
   *
   * The magnitude suffix is the exception. In compact notation Intl emits it
   * AFTER the fraction, so a naive slice put the "M" of "₦9.00M" into the muted
   * tail and ₦9,000,000 read as ₦9. Anything following the fraction digits
   * belongs to the figure, not to the tail.
   */
  const splitAt = parts.findIndex((p) => p.type === "decimal");
  const lastFraction = parts.map((p) => p.type).lastIndexOf("fraction");

  const join = (from: number, to?: number) =>
    parts
      .slice(from, to)
      .map((p) => p.value)
      .join("");

  // head · fraction · tail, rendered in that order so the magnitude suffix
  // stays where the locale put it rather than being moved behind the kobo.
  const lower = (v: string) => (short ? v.replace(/[A-Za-z]+$/, (m) => m.toLowerCase()) : v);
  // With no fraction Intl puts the magnitude suffix at the end of the head
  // ("₦9M"), and with one it puts it after the fraction ("₦4.5M"), so both
  // ends get the same treatment.
  const head = lower(splitAt === -1 ? join(0) : join(0, splitAt));
  const fraction = splitAt === -1 ? "" : join(splitAt, lastFraction + 1);
  /* Intl emits an upper-case magnitude suffix ("₦4.5M"); the platform writes it
     lower ("₦4.5m"), which is how it is written on every Nigerian listing and
     what `formatMoney` already does. Same rule, one place. */
  const tail = lower(splitAt === -1 || lastFraction === -1 ? "" : join(lastFraction + 1));

  const muted = secondaryClassName ?? "text-[0.62em] font-semibold opacity-60";

  return (
    <span className={["nf-numeric", className ?? ""].filter(Boolean).join(" ")}>
      {head}
      {fraction ? <span className={muted}>{fraction}</span> : null}
      {tail}
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
