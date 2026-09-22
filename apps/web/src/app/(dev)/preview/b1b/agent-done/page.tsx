import { getDictionary, type Locale } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { AgentDoneScreen } from "@/components/supply/AgentRegisterForm";

/** The agent form's fourth screen, with a fixture reference. See the owner's. */
export const dynamic = "force-dynamic";

export default async function PreviewAgentDone() {
  const locale: Locale = await getLocale();
  const t = getDictionary(locale);
  return (
    <div className="nf-shell py-section-tight">
      <AgentDoneScreen t={t} filed={{ reference: "VL-AGT-00043", attached: true }} />
    </div>
  );
}
