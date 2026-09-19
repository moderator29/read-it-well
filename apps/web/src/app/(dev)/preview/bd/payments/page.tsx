import { formatMoney, getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { adminUi } from "@/app/admin/_components/ui";
import { LookupPanel } from "@/app/admin/payments/LookupPanel";
import { ConsoleFrame } from "../ConsoleFrame";
import { LOOKUP, LOOKUP_TERM, SAVED_METHODS } from "../fixtures";

/**
 * The payment-method lookup panel on the payments desk, on the console
 * frame (278CC66A at 390px), from fixtures: the desk's head and tiles, then
 * the panel with a person found by handle, one live card, one removed card
 * and one bank account masked to its tail. The panel is the desk's own
 * `LookupPanel`, so what is screenshotted is what the desk draws.
 */
export const dynamic = "force-dynamic";

const BASE = "/preview/bd/payments";

export default async function PreviewPayments() {
  const locale = await getLocale();
  const t = getDictionary(locale);
  const ui = adminUi(t, locale);

  return (
    <ConsoleFrame t={t}>
      <ui.QueueHeader
        title="Payments"
        lede="Money that is stuck, short, or waiting on the provider. Everything here is read from the ledger itself rather than from a cached figure, so a number on this page is the number in the database."
      />
      <ui.StatRow>
        <ui.Stat
          label="Ledger shortfall"
          value={formatMoney(0, locale)}
          hint="Every wallet adds up"
          tone="success"
        />
        <ui.Stat
          label="Frozen by stuck holds"
          value={formatMoney(4_500_000, locale)}
          hint="1 withdrawal older than 30 minutes"
          tone="warning"
        />
        <ui.Stat
          label="Waiting on the provider"
          value={formatMoney(0, locale)}
          hint="Nothing unsettled in thirty days"
          tone="success"
        />
      </ui.StatRow>
      <LookupPanel
        term={LOOKUP_TERM}
        lookup={{ state: "ok", data: LOOKUP }}
        methods={{ state: "ok", data: SAVED_METHODS }}
        ui={ui}
        base={BASE}
      />
    </ConsoleFrame>
  );
}
