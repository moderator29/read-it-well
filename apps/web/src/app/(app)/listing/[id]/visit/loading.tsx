import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { VisitLoading } from "@/components/app/inspections/visit/VisitStates";

/** Step 1's wait, shaped like the choices that arrive (`VisitLoading`). */
export default async function LoadingScheduleVisit() {
  const t = getDictionary(await getLocale());
  return <VisitLoading label={t.visit.page.loading} />;
}
