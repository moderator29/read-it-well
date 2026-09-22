import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { HostShell } from "@/components/host/HostShell";
import { StaysPreview } from "../StaysPreview";
import { restaurantDraft } from "../fixtures";

/** GOVERNING-11 screen three. */
export const dynamic = "force-dynamic";

export default async function Page() {
  const locale = await getLocale();
  const t = getDictionary(locale);
  return (
    <HostShell logoLabel={t.a11y.logoHome} fallback="/host" chromeBack={false}>
      <StaysPreview
        panel="restaurant"
        draft={restaurantDraft()}
        locale={locale}
        steps={8}
        current={4}
      />
    </HostShell>
  );
}
