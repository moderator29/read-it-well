import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { SupplyDesk } from "@/app/admin/supply/SupplyDesk";
import "@/app/admin/money/_desk/desk.css";
import { Frame } from "../Frame";
import { NOW, supplyDesk } from "../fixtures";
export const dynamic = "force-dynamic";
export default async function P({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams; const full = sp.state === "full";
  const locale = await getLocale(); const t = getDictionary(locale);
  return (<Frame t={t}><SupplyDesk supply={supplyDesk(full)} filter={{ examples: false, page: 1 }} params={{ state: sp.state }} locale={locale} pageSize={8} now={NOW} /></Frame>);
}
