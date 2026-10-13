import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { VisitLoading } from "@/components/app/inspections/visit/VisitStates";

/** The status screen's wait, shaped like the hero, the tiles and the lister. */
export default async function LoadingVisitStatus() {
  const t = getDictionary(await getLocale());
  return <VisitLoading label={t.visit.page.loading} status />;
}
