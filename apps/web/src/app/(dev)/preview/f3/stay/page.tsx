import { getDictionary, type Locale } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { StayDetailView } from "@/app/(app)/stay/[id]/StayDetailView";
import { STAY } from "../fixtures";

/** /stay/[id] with the fixture stay, dated so the total column appears. */
export default async function StayPreview() {
  const locale: Locale = await getLocale();
  const t = getDictionary(locale);
  return (
    <StayDetailView
      detail={STAY}
      nights={4}
      checkIn="2026-10-02"
      checkOut="2026-10-06"
      guests={2}
      locale={locale}
      copy={t.stayDetail}
      instant
      t={t}
      datesHref="/preview/f3/stay"
      reserve={{ stayId: STAY.id, checkIn: "2026-10-02", checkOut: "2026-10-06", guests: 2, basePath: "/preview/f3/checkout" }}
    />
  );
}
