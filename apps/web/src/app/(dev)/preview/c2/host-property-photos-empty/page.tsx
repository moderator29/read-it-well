import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { HostShell } from "@/components/host/HostShell";
import { HostPhotosBody } from "@/app/host/photos/page";
import { C2_HOTEL, C2_HOTEL_PROPERTY, C2_OWNER } from "../fixtures";

/**
 * The same surface on the day a hotel signs: nothing has ever been uploaded.
 *
 * The state every hotel on the platform is in today, and the one the sentence
 * under the heading has to be honest about: a property with no photographs
 * shows a Vallo plate with a label saying so, and the drop target says "Add
 * the first photograph" rather than "Add another".
 */
export const dynamic = "force-dynamic";

export default async function PreviewC2HostPropertyPhotosEmpty() {
  const t = getDictionary(await getLocale());
  return (
    <HostShell logoLabel={t.a11y.logoHome} fallback="/host">
      <HostPhotosBody
        userId={C2_OWNER}
        businesses={[C2_HOTEL]}
        chosen={C2_HOTEL}
        photos={[]}
        accommodation={C2_HOTEL_PROPERTY}
        propertyPhotos={[]}
      />
    </HostShell>
  );
}
