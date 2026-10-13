/* Preview harness for the member's Vallo balance (the money layer): the real
   BalanceScreen from recorded figures and no movements, so the balance card,
   its one action and the move-money bar can be reviewed without an account.
   Every figure here is invented for design review.

     /preview/balance              a balance, confirmed this morning
     ?state=empty                  no balance figures yet

   Closed outside development by the preview layout. */
import { getLocale } from "@/lib/locale";
import { BalanceScreen } from "@/components/money/balance/BalanceScreen";
import type { BalanceFigures } from "@/lib/money/funds";

const AT = "2026-10-07T09:00:00Z";
const FIGURES: BalanceFigures = {
  available: { minor: 150_250_000, confirmedAt: AT },
  protected: { minor: 120_000_000, confirmedAt: AT },
  pending: { minor: 0, confirmedAt: null },
  processing: { minor: 0, confirmedAt: null },
  currency: "NGN",
};

export default async function PreviewBalancePage({ searchParams }: { searchParams: Promise<{ state?: string }> }) {
  const [{ state }, locale] = await Promise.all([searchParams, getLocale()]);
  return (
    <div className="mx-auto max-w-xl px-md pb-2xl">
      <p className="nf-caption mt-md text-[var(--nf-content-muted)]">Sample figures for design review; nothing here is a real balance.</p>
      <BalanceScreen
        figures={state === "empty" ? null : FIGURES}
        movements={[]}
        live
        locale={locale}
        now={Date.parse("2026-10-07T09:20:00Z")}
      />
    </div>
  );
}
