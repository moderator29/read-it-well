import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { getQueueCounts } from "@/lib/admin/queries";
import { adminUi } from "./_components/ui";
import { ConsoleOverview } from "./_components/ConsoleOverview";

export const dynamic = "force-dynamic";

/**
 * What the console opens on, every time: the overview, before any desk.
 *
 * This page's whole job is the READ. It runs `getQueueCounts` under the same
 * admin gate the layout has already applied, and hands the result to
 * `ConsoleOverview`, which is where the argument for this surface is written
 * and where the drawing lives.
 *
 * THE UNREADABLE CASE IS DRAWN AS UNREADABLE. If the counts do not come back
 * the page says so instead of rendering seven zeroes, because seven zeroes on
 * a console front door means "there is no work" and an operator who reads
 * that goes home.
 */
export default async function AdminOverviewPage() {
  const locale = await getLocale();
  const t = getDictionary(locale);
  const counts = await getQueueCounts();

  if (counts.state !== "ok") {
    const ui = adminUi(t, locale);
    return (
      <div className="nf-console">
        <ui.QueueHeader title={t.admin.overview.title} lede={t.admin.overview.lede} />
        <ui.QueueUnavailable />
      </div>
    );
  }

  return <ConsoleOverview t={t} locale={locale} counts={counts.data} />;
}
