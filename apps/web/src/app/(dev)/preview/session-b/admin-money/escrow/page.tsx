import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { adminUi } from "@/app/admin/_components/ui";
import { EscrowDesk } from "@/app/admin/escrow/EscrowDesk";
import "@/app/admin/money/_desk/desk.css";
import { Frame } from "../Frame";
import { NOW, disputeEvidence, escrowDesk, floatHistory, health } from "../fixtures";
export const dynamic = "force-dynamic";
export default async function P({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams; const full = sp.state === "full";
  const locale = await getLocale(); const t = getDictionary(locale); const ui = adminUi(t, locale);
  return (<Frame t={t}><EscrowDesk locale={locale} ui={ui} common={t.admin.common} query={{}} params={{ state: sp.state }} desk={escrowDesk(full)} health={health(!full)} evidence={disputeEvidence(full)} float={floatHistory(full)} now={NOW} /></Frame>);
}
