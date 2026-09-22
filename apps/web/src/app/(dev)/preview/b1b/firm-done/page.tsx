import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { FirmDoneScreen } from "@/components/supply/FirmRegisterForm";

/** The firm form's fourth screen, with a fixture reference. See the owner's. */
export const dynamic = "force-dynamic";

export default async function PreviewFirmDone() {
  const locale = await getLocale();
  const t = getDictionary(locale);
  return (
    <div className="nf-shell py-section-tight">
      <FirmDoneScreen t={t} filed={{ reference: "VL-AGT-00044", attached: true }} />
    </div>
  );
}
