import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { adminUi } from "@/app/admin/_components/ui";
import { MoneyDesk } from "@/app/admin/money/MoneyDesk";
import "@/app/admin/money/_desk/desk.css";
import { Frame } from "../Frame";
import { NOW, health, moneyDesk, moneyRead, rentCharges } from "../fixtures";
export const dynamic = "force-dynamic";
export default async function P({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams; const full = sp.state === "full";
  const locale = await getLocale(); const t = getDictionary(locale); const ui = adminUi(t, locale);
  return (
    <Frame t={t}>
      <MoneyDesk locale={locale} ui={ui} common={t.admin.common} query={{}} params={{ state: sp.state }} narrowed={false} read={moneyRead(full)} desk={moneyDesk(full, Number(sp.page ?? 1) || 1)} refunds={{ state: "ok", data: { rows: [], full: false, totals: { refundedMinor: 0, count: 0, notCredited: 0 } } }} disputes={{ state: "ok", data: { disputes: [], open: [], settled: [], full: false, totals: { heldMinor: 0, openCount: 0, disputeCount: 0 } } }} health={health(!full)} rent={rentCharges(full)} now={NOW} />
    </Frame>
  );
}
