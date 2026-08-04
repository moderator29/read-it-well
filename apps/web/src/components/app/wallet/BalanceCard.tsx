"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Locale } from "@naijafinds/i18n";
import { BrandIcon } from "@/design-system/icons/BrandIcon";
import { Odometer } from "@/components/site/Odometer";
import type { WalletEntry } from "@/lib/wallet/types";
import { formatKoboExact } from "./money";

/**
 * Wallet balance hero.
 *
 * The one place the user's money is stated, so it is stated exactly: integer
 * kobo split with integer arithmetic and rendered to the kobo, never a rounded
 * approximation. The card is the edge-lit glass material with an inner conic
 * shimmer and a fine grid texture, an eye toggle to mask the figure, in and
 * out totals for the last thirty days, and a sparkline of the running balance.
 * Every derived number below is summed as integer kobo; division appears only
 * when mapping values to sparkline pixel geometry, never in a money display.
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
  locale,
}: {
  balanceMinor: number;
  entries: WalletEntry[];
  locale: Locale;
}) {
  const [hidden, setHidden] = useState(false);
  const { kobo } = formatKoboExact(balanceMinor, locale);
  // Integer naira, no floats: the kobo remainder is stripped by the same
  // exact arithmetic as formatKoboExact, then the rest is a whole multiple
  // of 100 kobo, so dividing by 100 is always exact.
  const absMinor = Math.abs(balanceMinor);
  const koboRemainder = absMinor % 100;
  const wholeNaira = (absMinor - koboRemainder) / 100;
  const { inMinor, outMinor } = useMemo(() => flowsLast30Days(entries), [entries]);
  const points = useMemo(() => sparklinePoints(entries), [entries]);
  const flowIn = formatKoboExact(inMinor, locale);
  const flowOut = formatKoboExact(outMinor, locale);

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
      className="nf-card nf-balance-pulse relative overflow-hidden rounded-[var(--nf-radius-2xl)] p-5 sm:p-6"
    >
      {/* Inner conic shimmer, the light source sweeping the glass. Hidden in
          the light theme, where it would smear a white card. */}
      <div
        aria-hidden
        className="nf-wallet-sheen pointer-events-none absolute inset-0 opacity-60"
        style={{
          background:
            "conic-gradient(from 215deg at 78% 12%, rgb(0 200 255 / 0.18) 0deg, transparent 95deg, rgb(51 138 255 / 0.10) 175deg, transparent 250deg, rgb(0 102 255 / 0.16) 360deg)",
        }}
      />
      {/* Fine grid texture, fading out towards the foot of the card. Hidden in
          the light theme along with the sheen. */}
      <div
        aria-hidden
        className="nf-wallet-grid pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(rgb(255 255 255 / 0.035) 1px, transparent 1px), linear-gradient(90deg, rgb(255 255 255 / 0.035) 1px, transparent 1px)",
          backgroundSize: "22px 22px",
          maskImage: "linear-gradient(180deg, rgb(0 0 0) 0%, transparent 85%)",
          WebkitMaskImage: "linear-gradient(180deg, rgb(0 0 0) 0%, transparent 85%)",
        }}
      />

      <div className="relative flex items-start justify-between gap-4">
        <p
          id="nf-wallet-balance-label"
          className="text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-[var(--nf-content-muted)]"
        >
          Available balance
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setHidden((h) => !h)}
            aria-pressed={hidden}
            aria-label={hidden ? "Show balance" : "Hide balance"}
            className="grid h-11 w-11 place-items-center rounded-full border border-white/15 bg-white/5 text-[var(--nf-content-muted)] transition-colors hover:text-[var(--nf-content-primary)]"
          >
            <EyeGlyph off={hidden} />
          </button>
          <span className="h-12 w-12 shrink-0">
            <BrandIcon name="wallet-secure" fill />
          </span>
        </div>
      </div>

      <p className="relative mt-3 text-[var(--nf-content-primary)]">
        {hidden ? (
          <span className="text-[2.25rem] font-bold leading-none tracking-tight sm:text-[2.6rem]">
            {"₦"}
            {"••••••"}
          </span>
        ) : (
          <>
            <span className="text-[2.25rem] font-bold leading-none tracking-tight sm:text-[2.6rem]">
              {"₦"}
              <Odometer value={wholeNaira} locale={locale} className="nf-odometer-figure" />
            </span>
            <span className="text-[1.25rem] font-semibold text-[var(--nf-content-secondary)] sm:text-[1.4rem]">
              {kobo}
            </span>
          </>
        )}
      </p>
      <p className="relative mt-2 text-[0.78rem] leading-relaxed text-[var(--nf-content-muted)]">
        Naira wallet. Every movement is recorded to the kobo.
      </p>

      <div className="relative mt-4 grid grid-cols-2 gap-2">
        <div className="rounded-[var(--nf-radius-md)] border border-white/10 bg-white/[0.04] px-3 py-2">
          <p className="text-[0.66rem] font-semibold uppercase tracking-[0.1em] text-[var(--nf-content-muted)]">
            In, last 30 days
          </p>
          <p className="mt-0.5 text-[0.9rem] font-semibold text-[var(--nf-state-success)]">
            {hidden ? "••••" : `+${flowIn.whole}${flowIn.kobo}`}
          </p>
        </div>
        <div className="rounded-[var(--nf-radius-md)] border border-white/10 bg-white/[0.04] px-3 py-2">
          <p className="text-[0.66rem] font-semibold uppercase tracking-[0.1em] text-[var(--nf-content-muted)]">
            Out, last 30 days
          </p>
          <p className="mt-0.5 text-[0.9rem] font-semibold text-[var(--nf-content-primary)]">
            {hidden ? "••••" : `-${flowOut.whole}${flowOut.kobo}`}
          </p>
        </div>
      </div>

      {points && (
        <svg
          viewBox="0 0 100 28"
          preserveAspectRatio="none"
          aria-hidden
          className="nf-wallet-spark relative mt-4 h-9 w-full"
        >
          <polyline
            points={points}
            fill="none"
            stroke="rgb(56 189 248 / 0.9)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
            style={{ filter: "drop-shadow(0 0 5px rgb(56 189 248 / 0.75))" }}
          />
        </svg>
      )}
    </section>
  );
}

/** Small stroke glyph for the visibility toggle; decorative, labelled by the button. */
function EyeGlyph({ off }: { off: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M2 12s3.5-6.5 10-6.5S22 12 22 12s-3.5 6.5-10 6.5S2 12 2 12Z" />
      <circle cx="12" cy="12" r="2.6" />
      {off && <path d="M4 4l16 16" />}
    </svg>
  );
}
