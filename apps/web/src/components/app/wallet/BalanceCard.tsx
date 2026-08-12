"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { formatNumber, type Locale } from "@naijafinds/i18n";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { Odometer } from "@/components/site/Odometer";
import type { BalanceBreakdown, WalletEntry } from "@/lib/wallet/types";
import { formatKoboExact } from "./money";
import { Amount } from "@/components/ui/Amount";
import { BalanceBreakdownSheet } from "./BalanceBreakdownSheet";

/**
 * Wallet balance hero.
 *
 * The one place the user's money is stated, so it is stated exactly: integer
 * kobo split with integer arithmetic and rendered to the kobo, never a rounded
 * approximation. The card carries an eye toggle to mask the figure, in and out
 * totals for the last thirty days, and a sparkline of the running balance.
 * Every derived number below is summed as integer kobo; division appears only
 * when mapping values to sparkline pixel geometry, never in a money display.
 *
 * SIX LAYERS CAME OFF THIS CARD.
 *
 * It used to stack a conic shimmer, a hand-drawn white grid with two mask
 * gradients, a border-white/15 bg-white/5 eye button and the glass card's own
 * material, all under the largest number on the platform. Every one of those
 * layers was a raw literal: the conic ran three rgb() stops in cyan and two
 * blues that exist in no token, and the grid painted white lines that in
 * daylight were white lines on a white card.
 *
 * What is left is the balance, the two flow figures and the sparkline, on the
 * platform's ordinary card material. The one decorative layer that survives is
 * a single token-driven surface wash, because the balance is the hero of the
 * wallet and a completely flat panel under it read as unfinished. Texture is
 * not what makes a number feel important; size, spacing and silence are.
 */

const DAY_MS = 86_400_000;

function flowsLast30Days(entries: WalletEntry[]): { inMinor: number; outMinor: number } {
  const cutoff = Date.now() - 30 * DAY_MS;
  let inMinor = 0;
  let outMinor = 0;
  for (const e of entries) {
    if (e.status !== "COMPLETED") continue;
    if (new Date(e.createdAt).getTime() < cutoff) continue;
    if (e.direction === "credit") inMinor += e.amountMinor;
    else outMinor += e.amountMinor;
  }
  return { inMinor, outMinor };
}

/**
 * Running balance, oldest to newest, over COMPLETED entries, mapped onto a
 * 100 by 28 viewBox. Returns null when there are too few points for a line.
 */
function sparklinePoints(entries: WalletEntry[]): string | null {
  const settled = entries
    .filter((e) => e.status === "COMPLETED")
    .slice()
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  if (settled.length < 2) return null;

  let running = 0;
  const values = settled.map(
    (e) => (running += e.direction === "credit" ? e.amountMinor : -e.amountMinor),
  );
  const min = Math.min(...values);
  const span = Math.max(...values) - min || 1;
  return values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * 100;
      const y = 26 - ((v - min) / span) * 24;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

export function BalanceCard({
  balanceMinor,
  entries,
  breakdown,
  locale,
  usdRate,
}: {
  balanceMinor: number;
  entries: WalletEntry[];
  /**
   * What the headline figure is made of.
   *
   * The card still states ONE number. This only drives the control that opens
   * the breakdown, and the label on that control, which reads "Money in
   * escrow" when there is some and "Breakdown" when there is not - so somebody
   * whose balance just dropped by a deposit can see where it went without
   * having to guess that a generic control would tell them.
   */
  breakdown: BalanceBreakdown;
  locale: Locale;
  /**
   * Naira per one US dollar. Optional on purpose.
   *
   * This wallet states real money, so a rate is either a real rate or it is
   * not shown. There is deliberately no fallback constant: a hard-coded FX
   * figure would put an invented number where a user reads their balance,
   * which is the one place on the platform that must never be approximated.
   * With no rate configured the toggle does not render at all.
   */
  usdRate?: number | null;
}) {
  const [hidden, setHidden] = useState(false);
  const [inUsd, setInUsd] = useState(false);
  const { kobo } = formatKoboExact(balanceMinor, locale);
  // Integer naira, no floats: the kobo remainder is stripped by the same
  // exact arithmetic as formatKoboExact, then the rest is a whole multiple
  // of 100 kobo, so dividing by 100 is always exact.
  const absMinor = Math.abs(balanceMinor);
  const koboRemainder = absMinor % 100;
  const wholeNaira = (absMinor - koboRemainder) / 100;
  const { inMinor, outMinor } = useMemo(() => flowsLast30Days(entries), [entries]);
  const points = useMemo(() => sparklinePoints(entries), [entries]);

  // A brief light pulse plays through the card the moment the balance moves:
  // upward when money lands, downward when it leaves. Detected client-side
  // by comparing against the previous render's balance, since a deposit,
  // withdrawal or transfer all arrive as a fresh server-rendered prop after
  // the page refreshes behind its drawer.
  const prevBalance = useRef<number | null>(null);
  const [pulse, setPulse] = useState<"up" | "down" | null>(null);
  useEffect(() => {
    const prev = prevBalance.current;
    prevBalance.current = balanceMinor;
    if (prev === null || prev === balanceMinor) return;
    setPulse(balanceMinor > prev ? "up" : "down");
    const timer = setTimeout(() => setPulse(null), 1200);
    return () => clearTimeout(timer);
  }, [balanceMinor]);

  return (
    <section
      aria-labelledby="nf-wallet-balance-label"
      data-pulse={pulse ?? undefined}
      /*
        THE PANEL IS SHORTER, and every millimetre came off padding rather than
        off content. It was `p-card` stepping to `p-cell`, which is the widest
        pair on the scale, wrapped around a figure that is already the largest
        numeral in the product: the balance sat in the middle of a tall box with
        as much empty room above and below it as the number itself occupied.
        A hero does not need a frame that size to be read as one; it is the
        largest thing on the screen either way.
      */
      className="nf-card nf-balance-pulse relative overflow-hidden rounded-[var(--nf-radius-xl)] p-card-sm sm:p-card"
    >
      {/* The one surviving decorative layer: the platform's surface wash, which
          lifts the top of the card off the bottom of it. It is a token, so it
          is a neutral wash on paper rather than the white-on-white nothing the
          hand-written version resolved to. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ background: "var(--nf-gradient-surface)" }}
      />

      <div className="relative flex items-start justify-between gap-md">
        <p
          id="nf-wallet-balance-label"
          className="nf-body-sm font-semibold text-[var(--nf-content-muted)]"
        >
          Available balance
        </p>
        {/*
          TWO CONTROLS IN THIS CORNER, AND IT WAS TWO CONTROLS AND A PICTURE.

          A 44px wallet object sat at the end of this row, at the same size and
          on the same baseline as the eye button and the currency toggle beside
          it. Three things of one size in a line read as three controls, so the
          decoration was being scanned as a button that does not respond, in the
          top right corner of the screen where somebody's money is stated.

          The object is not needed to say what the card is. The label says
          "Available balance", the figure carries a naira sign and is the
          largest numeral on the platform, and the page title two rows up says
          Wallet. Nothing about the identity of this surface was resting on it.
        */}
        <div className="flex items-center gap-inline">
          {usdRate ? (
            <button
              type="button"
              onClick={() => setInUsd((v) => !v)}
              aria-pressed={inUsd}
              aria-label={inUsd ? "Show balance in naira" : "Show balance in US dollars"}
              className="nf-chip min-h-11 px-row font-bold"
            >
              {inUsd ? "$" : "\u20A6"}
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => setHidden((h) => !h)}
            aria-pressed={hidden}
            aria-label={hidden ? "Show balance" : "Hide balance"}
            className="nf-icon-btn h-11 w-11 rounded-[var(--nf-radius-control)]"
          >
            <EyeGlyph off={hidden} />
          </button>
        </div>
      </div>

      {/*
        The hero figure. This was already the one two-tone numeral on the whole
        platform, and it stays two-tone - the kobo just drops further, to the
        muted ink at 62% of the figure's size, which is the ratio the reference
        set uses. Bigger, tighter and with the kobo further back reads as one
        composed number rather than two sizes of text.

        This is the one money figure on the platform NOT set through <Amount>:
        the whole-naira part is an Odometer that rolls to its new value when
        money moves, and Amount renders a static string. The flow tiles below
        and every ledger row underneath it do go through Amount.
      */}
      <p className="nf-numeric relative mt-row leading-none text-[var(--nf-content-primary)]">
        {hidden ? (
          <span className="text-[2rem] font-bold tracking-[-0.03em] sm:text-[2.35rem]">
            {inUsd ? "$" : "\u20A6"}
            {"\u2022\u2022\u2022\u2022\u2022\u2022"}
          </span>
        ) : inUsd && usdRate ? (
          /*
             The converted view. Deliberately NOT an Odometer: the roll animation
             means "your balance changed", and switching display currency has not
             changed anyone's balance. It is also rendered through <Amount> so the
             cents fall back to the muted tone exactly like the kobo do.
          */
          <Amount
            minorUnits={Math.round(balanceMinor / usdRate)}
            locale={locale}
            currency="USD"
            showFraction
            className="text-[2rem] font-bold tracking-[-0.03em] sm:text-[2.35rem]"
            secondaryClassName="text-[0.62em] font-semibold text-[var(--nf-content-muted)]"
          />
        ) : (
          <>
            <span className="text-[2rem] font-bold leading-none tracking-tight sm:text-[2.35rem]">
              {"₦"}
              <Odometer value={wholeNaira} locale={locale} className="nf-odometer-figure" />
            </span>
            <span className="text-[1.38rem] font-semibold text-[var(--nf-content-muted)] sm:text-[1.68rem]">
              {kobo}
            </span>
          </>
        )}
      </p>
      <p className="nf-caption relative mt-inline">
        {inUsd && usdRate
          ? /* `toLocaleString()` with no argument reads the BROWSER's locale,
               not the app's, so this line grouped the rate "1.600" on a German
               phone while every other figure on the same card used commas.
               There is one number formatter on this platform. */
            `Converted at \u20A6${formatNumber(usdRate, locale)} to $1. Your wallet is held in naira.`
          : "Naira wallet. Every movement is recorded to the kobo."}
      </p>

      {/*
        WHERE THE REST OF THE MONEY IS.

        One control, under the figure, not a second and third figure beside it.
        An escrow hold is a debit, so the headline drops when somebody pays a
        deposit into escrow and this card had no way to say where it went. See
        BalanceBreakdownSheet for why the breakdown is behind a tap rather than
        on the face of the card.
      */}
      <div className="relative mt-row">
        <BalanceBreakdownSheet breakdown={breakdown} locale={locale} hidden={hidden} />
      </div>

      {/*
        THE TWO FLOWS LOST THEIR BOXES.

        They were two rounded, bordered, inset-filled tiles side by side INSIDE
        the glass card, which is two more containers drawn around one idea with
        two parts, on the one surface on the platform that should be the calmest
        thing a person sees. The reference does not box these; nor does any
        bank. What separates two facts read across is a hairline and alignment,
        which is what `nf-cells` exists for and what it does here: one rule
        between them, inset from the surface's own edges, and nothing else.

        The labels come up with it. They were `nf-caption` uppercase and tracked
        out, which is 13px shouting; a fact's label is a label, so it takes
        body-sm in sentence case and the figure above it does the work.

        Money out is painted in the error ink rather than neutral. A ledger
        where credits are green and debits are the same colour as the label is
        the exact tell the reference wallets avoid: the eye should be able to
        find money leaving without reading a sign.
      */}
      {/*
        THE PERIOD IS SAID ONCE, ABOVE BOTH COLUMNS.

        It was "In, last 30 days" and "Out, last 30 days", and the second one
        wrapped to two lines on a 390px screen while the first did not - so the
        two figures underneath sat at different heights and the pair stopped
        reading as a pair. The period is the same for both, and a fact repeated
        in two labels is a fact that belongs above them.
      */}
      <p className="nf-overline mt-block">Last 30 days</p>
      <div className="nf-cells nf-cells--pair relative mt-row">
        <div className="pr-lg">
          <p className="nf-body-sm text-[var(--nf-content-muted)]">In</p>
          <p className="nf-numeric mt-inline-tight text-[length:var(--nf-text-body-lg)] font-semibold text-[var(--nf-state-success)]">
            {hidden ? (
              "••••"
            ) : (
              <>
                +<Amount minorUnits={inMinor} locale={locale} showFraction />
              </>
            )}
          </p>
        </div>
        <div className="pl-lg">
          <p className="nf-body-sm text-[var(--nf-content-muted)]">Out</p>
          <p className="nf-numeric mt-inline-tight text-[length:var(--nf-text-body-lg)] font-semibold text-[var(--nf-state-error)]">
            {hidden ? (
              "••••"
            ) : (
              <>
                -<Amount minorUnits={outMinor} locale={locale} showFraction />
              </>
            )}
          </p>
        </div>
      </div>

      {points && (
        /*
         * The sparkline.
         *
         * Was a bare polyline with its stroke hard-coded to rgb(56 189 248) -
         * a sky blue that belongs to no token, sits outside the brand family,
         * and is close to invisible on the light theme's near-white card. It
         * also carried a permanent glow filter and no area fill, so it read as
         * a stray scribble rather than a chart.
         *
         * It now takes the brand ink through currentColor, so both themes are
         * handled by one rule, and gains the gradient area fill the reference
         * chart has under its line. The fill is what turns a line into a chart.
         */
        <svg
          viewBox="0 0 100 28"
          preserveAspectRatio="none"
          aria-hidden
          className="nf-wallet-spark relative mt-block h-9 w-full text-[var(--nf-brand-secondary)]"
        >
          <defs>
            <linearGradient id="nf-wallet-spark-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="currentColor" stopOpacity="0.28" />
              <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
            </linearGradient>
          </defs>
          {/* Closed down to the baseline so the gradient has an area to fill. */}
          <polygon points={`0,28 ${points} 100,28`} fill="url(#nf-wallet-spark-fill)" />
          <polyline
            points={points}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      )}
    </section>
  );
}

/**
 * The visibility toggle's mark.
 *
 * This was the second of two inline eyes on the platform - a slightly different
 * curve at strokeWidth 2 against the auth field's 1.7, doing the same job on
 * another screen. Both are the platform glyph now.
 */
function EyeGlyph({ off }: { off: boolean }) {
  return <UiIcon name={off ? "eye-off" : "eye"} size="xs" />;
}
