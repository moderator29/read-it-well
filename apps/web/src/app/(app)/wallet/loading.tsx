import { PageHeader } from "@/components/app/PageHeader";
import { HeroFigureWait, MoneyWait } from "@/components/app/money-history/MoneyWait";
import { BALANCE_TITLE, FIGURE_HINT, FIGURE_LABEL } from "@/lib/money/balance-copy";

/**
 * The balance, before the partner's figures arrive: the page itself, inert,
 * with only the figure as a slab, so nothing moves when it lands. No zero is
 * ever drawn in the meantime.
 */
export default function LoadingBalance() {
  return (
    <MoneyWait label="Loading your balance" className="nf-page nf-md nf-history">
      <PageHeader title={BALANCE_TITLE} fallback="/home" />
      <div className="mt-inline space-y-block">
        <HeroFigureWait caption={FIGURE_LABEL.available} sub={FIGURE_HINT.available} />
      </div>
    </MoneyWait>
  );
}
