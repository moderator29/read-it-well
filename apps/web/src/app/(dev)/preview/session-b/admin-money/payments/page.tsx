import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { adminUi } from "@/app/admin/_components/ui";
import { PaymentsCharts, PaymentsKpis, PaymentsTable } from "@/app/admin/payments/PaymentsFlow";
import { DeskHead, CalmNote, Panel } from "@/app/admin/money/_desk/Desk";
import "@/app/admin/money/_desk/desk.css";
import { Frame } from "../Frame";
import { paymentsDesk } from "../fixtures";
export const dynamic = "force-dynamic";
export default async function P({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams; const full = sp.state === "full";
  const locale = await getLocale(); const t = getDictionary(locale); const ui = adminUi(t, locale);
  const desk = paymentsDesk(full, sp.outcome, sp.kind);
  return (
    <Frame t={t}>
      <div className="nf-console nf-md">
        <DeskHead title="Payments" lede="Money coming in, and anything stuck, short or waiting on the provider." />
        <PaymentsKpis desk={desk} />
        <PaymentsCharts desk={desk} locale={locale} />
        <PaymentsTable desk={desk} params={{ state: sp.state, outcome: sp.outcome, kind: sp.kind }} locale={locale} ui={ui} />
        <Panel title="Health" hint="Money that is stuck, short, or waiting on the provider">
          <CalmNote kind="clear" title="The money is where it should be" fills="No wallet is overdrawn, no withdrawal is held past its window, and the provider has settled everything it was sent in the last thirty days." creates="An overdrawn wallet, a stuck hold or an unsettled payment appears here the moment one exists." />
        </Panel>
      </div>
    </Frame>
  );
}
