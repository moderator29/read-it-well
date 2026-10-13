import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { OpenApplicationNotice } from "@/components/supply/OpenApplicationNotice";

/**
 * What a setup form shows while an application is still open, with a fixture
 * reference. The route needs a session and an open row; the harness has
 * neither.
 */
export const dynamic = "force-dynamic";

export default async function PreviewOpenApplication() {
  const t = getDictionary(await getLocale());
  const r = t.supply.register;
  return (
    <div className="nf-shell py-section-tight">
      <OpenApplicationNotice
        heading={r.owner.title}
        reference="VL-AGT-00042"
        copy={{ title: r.openTitle, body: r.openBody, action: r.trackIt }}
      />
    </div>
  );
}
