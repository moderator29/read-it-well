import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { HostShell } from "@/components/host/HostShell";
import { StaysPreview } from "../StaysPreview";
import { hotelDraft } from "../fixtures";

/** GOVERNING-10 screen four. */
export const dynamic = "force-dynamic";

export default async function Page() {
  const locale = await getLocale();
  const t = getDictionary(locale);
  return (
    <HostShell logoLabel={t.a11y.logoHome} fallback="/host" chromeBack={false}>
      <StaysPreview
        panel="facilities"
        title="Facilities and photos"
        hint="Show guests what the property has to offer, and where it is."
        draft={hotelDraft()}
        locale={locale}
        steps={10}
        current={7}
      />
    </HostShell>
  );
}
