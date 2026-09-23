import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { adminUi } from "@/app/admin/_components/ui";
import { BookingsDesk } from "@/app/admin/bookings/BookingsDesk";
import "@/app/admin/money/_desk/desk.css";
import { Frame } from "../Frame";
import { bookingsDesk } from "../fixtures";
export const dynamic = "force-dynamic";
export default async function P({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams; const full = sp.state === "full";
  const locale = await getLocale(); const t = getDictionary(locale); const ui = adminUi(t, locale);
  return (<Frame t={t}><BookingsDesk desk={bookingsDesk(full)} t={t} ui={ui} common={t.admin.common} query={{}} params={{ state: sp.state }} locale={locale} waitingTables={0} /></Frame>);
}
