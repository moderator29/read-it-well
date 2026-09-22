import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { HostShell } from "@/components/host/HostShell";
import { StaysPreview } from "../StaysPreview";
import { shortletDraft } from "../fixtures";

/** GOVERNING-11 screen two. */
export const dynamic = "force-dynamic";

export default async function Page() {
  const locale = await getLocale();
  const t = getDictionary(locale);
  return (
    <HostShell logoLabel={t.a11y.logoHome} fallback="/host" chromeBack={false}>
      <StaysPreview
        panel="house-rules"
        title="House rules and cancellation"
        hint="Set your house rules and cancellation policy."
        draft={shortletDraft()}
        locale={locale}
        steps={9}
        current={5}
      />
    </HostShell>
  );
}
