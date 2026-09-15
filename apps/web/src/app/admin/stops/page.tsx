import type { Metadata } from "next";
import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { getStopsDesk } from "@/lib/admin/suspension-queries";
import { adminUi } from "../_components/ui";
import { StopsDesk } from "./StopsDesk";

export async function generateMetadata(): Promise<Metadata> {
  const t = getDictionary(await getLocale());
  return { title: t.admin.nav.stops.label, robots: { index: false, follow: false } };
}

export const dynamic = "force-dynamic";

/**
 * Stops: taking an agent off the platform, and putting them back.
 *
 * `public.agent_suspensions` has recorded every stop since 20260805110426 and
 * `suspend_agent` and `reinstate_agent` have been able to write them for just
 * as long. Nothing has ever called either one and nothing has ever shown the
 * table. A stop was a thing the database could do and the platform could not.
 *
 * This is the surface for both halves of it. There is no separate confirmation
 * step, deliberately: a confirm dialog on a decision this size adds a click and
 * removes nothing, because the thing that actually prevents a mistake is seeing
 * what will happen, which is on the card. The reason field is the real gate,
 * and it is required.
 */
export default async function AdminStopsPage() {
  const locale = await getLocale();
  const t = getDictionary(locale);
  const ui = adminUi(t, locale);

  const read = await getStopsDesk();

  if (read.state !== "ready") {
    return (
      <div className="nf-console">
        <ui.QueueHeader
          title={t.admin.nav.stops.label}
          lede="Agents taken off the platform, and everything a stop took down."
        />
        <ui.QueueUnavailable />
      </div>
    );
  }

  return (
    <div className="nf-console">
      <ui.QueueHeader
        title={t.admin.nav.stops.label}
        lede="Agents taken off the platform, and everything a stop took down. A stop is not a deletion: their listings come back where they were the moment it is lifted, and confirmed stays are never cancelled."
        count={read.stopped.length}
      />
      <StopsDesk stopped={read.stopped} trading={read.trading} />
    </div>
  );
}
