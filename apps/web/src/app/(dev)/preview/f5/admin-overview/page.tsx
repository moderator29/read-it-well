import { getLocale } from "@/lib/locale";
import { getDictionary } from "@vallo/i18n";
import { OverviewView } from "@/app/admin/_components/OverviewView";
import { AdminPreviewFrame } from "../AdminPreviewFrame";
import {
  ALERTS,
  BY_ROLE,
  COLLECTED,
  COUNTS,
  JOBS,
  NOW,
  PULSE,
  SUPPLY,
} from "../../session-b/admin/fixtures";

/**
 * The console's front door as operators get it: the real `OverviewView`
 * inside the real `AdminFrame`, on the console fixtures, with the queue's
 * seven desk counts passed so "Needs attention" and the queue gauge
 * (plan item 14) can be seen. The real page gates on the admin guard and a
 * security key a headless sandbox cannot pass. Every figure here is a
 * fixture and says nothing about the real queue.
 */
export const dynamic = "force-dynamic";

export default async function PreviewAdminOverview() {
  const locale = await getLocale();
  const t = getDictionary(locale);
  return (
    <AdminPreviewFrame t={t}>
      <OverviewView
        locale={locale}
        now={NOW}
        range="12m"
        headingTo={null}
        openReviews={COUNTS.listings}
        pulse={PULSE}
        collected={COLLECTED}
        supply={SUPPLY}
        byRole={BY_ROLE}
        jobs={JOBS}
        alerts={ALERTS}
        queue={COUNTS}
      />
    </AdminPreviewFrame>
  );
}
