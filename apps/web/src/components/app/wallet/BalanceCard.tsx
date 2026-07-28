import type { Locale } from "@naijafinds/i18n";
import { Icon } from "@/design-system/icons/Icon";
import { formatKoboExact } from "./money";

/**
 * Wallet balance hero.
 *
 * The one place the user's money is stated, so it is stated exactly: integer
 * kobo split with integer arithmetic and rendered to the kobo (an empty wallet
 * reads ₦0.00, never a rounded approximation). The card is the brand gradient
 * under a glass specular, matching the primary button material, so the balance
 * reads as the most important object on the page.
 */
export function BalanceCard({
  balanceMinor,
  locale,
}: {
  balanceMinor: number;
  locale: Locale;
}) {
  const { whole, kobo } = formatKoboExact(balanceMinor, locale);

  return (
    <section
      aria-labelledby="nf-wallet-balance-label"
      className="relative overflow-hidden rounded-[var(--nf-radius-2xl)] border border-white/20 p-5 shadow-[0_18px_44px_-14px_rgba(0,0,0,0.55)] sm:p-6"
      style={{ background: "var(--nf-gradient-brand)" }}
    >
      {/* Glass specular running off the top edge, same light logic as the icons. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/25 to-transparent"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/15 blur-2xl"
      />

      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p
            id="nf-wallet-balance-label"
            className="text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-white/75"
          >
            Available balance
          </p>
          <p className="mt-2 text-white">
            <span className="text-[2.25rem] font-bold leading-none tracking-tight sm:text-[2.6rem]">
              {whole}
            </span>
            <span className="text-[1.25rem] font-semibold text-white/80 sm:text-[1.4rem]">
              {kobo}
            </span>
          </p>
          <p className="mt-2 text-[0.78rem] leading-relaxed text-white/70">
            Naira wallet. Every movement is recorded to the kobo.
          </p>
        </div>
        <span className="h-7 w-7 shrink-0">
          <Icon name="wallet" fill />
        </span>
      </div>
    </section>
  );
}
