import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { HostShell } from "@/components/host/HostShell";
import { HostPhotosBody } from "@/app/host/photos/page";
import { C2_HOTEL, C2_HOTEL_PROPERTY, C2_PROPERTY_PHOTOS, C2_OWNER } from "../fixtures";

/**
 * A hotel's photograph manager with three photographs on record.
 *
 * THE SURFACE THAT DID NOT EXIST. `accommodation_photos` had a table, a
 * bucket, four storage policies and a catalogue trigger since M3 and no writer
 * anywhere in the application, while the submission gate refused an
 * accommodation with no photograph. This is the screen that closes it, read
 * here at 390 in dark against the register.
 *
 * The images are the lead's own filed plates rather than bucket objects,
 * because this sandbox has no session and therefore no uploads. What is being
 * read is the surface: the cover's place in the grid, the take-down control
 * beside each one, and the drop target under them.
 */
export const dynamic = "force-dynamic";

export default async function PreviewC2HostPropertyPhotos() {
  const t = getDictionary(await getLocale());
  return (
    <HostShell logoLabel={t.a11y.logoHome} fallback="/host">
      <HostPhotosBody
        userId={C2_OWNER}
        businesses={[C2_HOTEL]}
        chosen={C2_HOTEL}
        photos={[]}
        accommodation={C2_HOTEL_PROPERTY}
        propertyPhotos={C2_PROPERTY_PHOTOS}
      />
    </HostShell>
  );
}
