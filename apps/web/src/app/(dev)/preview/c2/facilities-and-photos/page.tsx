import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { HostShell } from "@/components/host/HostShell";
import { FacilitiesPicker } from "@/components/host/FacilitiesPicker";
import { AccommodationPhotoManager } from "@/components/host/AccommodationPhotoManager";
import { TYPE } from "@/components/app/Screen";
import { C2_HOTEL_PROPERTY, C2_OWNER, C2_PROPERTY_PHOTOS } from "../fixtures";

/**
 * Facilities and photographs, as `GOVERNING-10` screen four pairs them.
 *
 * Both halves of that screen sit on the wizard's property step in the product;
 * they are drawn together here so the pair can be read against the render at
 * 390 in dark without an application in progress.
 *
 * THE FACILITY CONTROLS ARE ROUNDED RECTANGLES. The render draws glowing tiles
 * with soft ends; `nf-chip` draws 14px on a 44px control, a ratio of 0.32, and
 * the folder's README names these tiles among the capsules it translates.
 */
export const dynamic = "force-dynamic";

export default async function PreviewC2FacilitiesAndPhotos() {
  const t = getDictionary(await getLocale());
  return (
    <HostShell logoLabel={t.a11y.logoHome} fallback="/host">
      <div className="nf-agent-head">
        <div>
          <h1 className="nf-agent-head__title">Facilities and photos</h1>
          <p className={`mt-row ${TYPE.bodyLg}`}>Show guests what your hotel has to offer.</p>
        </div>
      </div>
      <div className="mt-block flex flex-col gap-md">
        <FacilitiesPicker
          accommodationId={C2_HOTEL_PROPERTY.id}
          chosen={["pool", "parking", "generator", "wifi", "ac"]}
        />
        <AccommodationPhotoManager
          accommodationId={C2_HOTEL_PROPERTY.id}
          userId={C2_OWNER}
          photos={C2_PROPERTY_PHOTOS.map((photo) => ({ id: photo.id, url: photo.url }))}
        />
      </div>
    </HostShell>
  );
}
