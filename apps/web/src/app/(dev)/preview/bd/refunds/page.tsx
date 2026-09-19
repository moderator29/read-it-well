import { formatMoney, getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { QueueFilters } from "@/app/admin/_components/QueueFilters";
import { adminUi } from "@/app/admin/_components/ui";
import { RefundsPanel } from "@/app/admin/money/MoneyRows";
import { ConsoleFrame } from "../ConsoleFrame";
import { REFUNDS } from "../fixtures";

/**
 * The refund console on the money desk, on the console frame (278CC66A at
 * 390px), from fixture rows: the money desk's head, its one search control,
 * its tiles, then the refunds panel with where each refund's money is. The
 * panel is the desk's own `RefundsPanel`, so what is screenshotted is what
 * the desk draws.
 */
export const dynamic = "force-dynamic";

const BASE = "/preview/bd/refunds";

export default async function PreviewRefunds() {
  const locale = await getLocale();
  const t = getDictionary(locale);
  const ui = adminUi(t, locale);

  return (
    <ConsoleFrame t={t}>
      <ui.QueueHeader
        title="Money"
        lede="Every wallet, the ledger behind them, and anything stuck."
      />
      <QueueFilters
        base={BASE}
        query={{}}
        common={t.admin.common}
        searchLabel="Find a person, a wallet or a payment"
        searchPlaceholder="Name, wallet id or reference"
      />
      <ui.StatRow>
        <ui.Stat
          label="Settled"
          value={formatMoney(184_250_000, locale)}
          hint="Across the wallets listed below, newest first"
        />
        <ui.Stat
          label="Held pending"
          value={formatMoney(4_500_000, locale)}
          hint="Debits that have left a spendable balance and not settled"
          tone="warning"
        />
        <ui.Stat label="Wallets" value="12" hint="Newest first, up to forty" />
      </ui.StatRow>
      <RefundsPanel
        refunds={{ state: "ok", data: REFUNDS }}
        narrowed={false}
        locale={locale}
        ui={ui}
      />
    </ConsoleFrame>
  );
}
