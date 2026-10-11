import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { HostShell } from "@/components/host/HostShell";
import { HostRoomsBody } from "@/app/host/rooms/HostRoomsBody";
import { C2_HOTEL, C2_HOTEL_PROPERTY, C2_ROOM_TYPES_NO_NIGHTS } from "../fixtures";

/**
 * THE STATE EVERY HOTEL ON THIS PLATFORM WAS IN.
 *
 * Rooms saved, rates set, and not one night on sale, because nothing in the
 * application had ever written a `room_inventory` row and `stays_search`
 * treats a missing night as not offered. The screen has to say that in words a
 * host can act on rather than drawing a zero, because zero open rooms is a
 * closure somebody chose and no rows at all is a hotel nobody can find.
 */
export const dynamic = "force-dynamic";

export default async function PreviewC2HostRoomsNoNights() {
  const locale = await getLocale();
  const t = getDictionary(locale);
  return (
    <HostShell logoLabel={t.a11y.logoHome} fallback="/host">
      <HostRoomsBody
        businesses={[C2_HOTEL]}
        chosen={C2_HOTEL}
        accommodation={C2_HOTEL_PROPERTY}
        rooms={C2_ROOM_TYPES_NO_NIGHTS}
        locale={locale}
      />
    </HostShell>
  );
}
