import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { HostShell } from "@/components/host/HostShell";
import { HostTablesBody } from "@/app/host/reservations/page";
import { P3_EMPTY_BOARD } from "../fixtures";

/**
 * The state a venue is actually in on the day it signs: nothing has ever
 * arrived. Proved on its own because it is the FIRST thing a real owner sees,
 * and because an empty state dressed as a cleared queue would congratulate
 * somebody for work that never came.
 */
export const dynamic = "force-dynamic";

export default async function PreviewHostReservationsEmpty() {
  const t = getDictionary(await getLocale());
  return (
    <HostShell logoLabel={t.a11y.logoHome} fallback="/host">
      <HostTablesBody board={P3_EMPTY_BOARD} />
    </HostShell>
  );
}
