import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { HostShell } from "@/components/host/HostShell";
import { StaysPreview } from "../StaysPreview";
import { hotelDraft } from "../fixtures";

/** GOVERNING-10 screen one. */
export const dynamic = "force-dynamic";

export default async function Page() {
  const locale = await getLocale();
  const t = getDictionary(locale);
  return (
    <HostShell logoLabel={t.a11y.logoHome} fallback="/host" chromeBack={false}>
      <StaysPreview
        panel="hotel"
        title="Your hotel"
        hint="Tell us about your hotel and its basic details."
        draft={hotelDraft()}
        locale={locale}
        steps={10}
        current={4}
      />
    </HostShell>
  );
}
