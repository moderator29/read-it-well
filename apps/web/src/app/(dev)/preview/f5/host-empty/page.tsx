import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { HostShell } from "@/components/host/HostShell";
import { HostStandingBody } from "@/app/host/page";
import { hostToday } from "@/app/host/today";

/**
 * Where a host stands before anything exists: no business, no application.
 * The screen that carried two primaries ("Start an application" and "Start");
 * it is drawn here so the one-primary rule can be read at 390 in both themes.
 */
export const dynamic = "force-dynamic";

export default async function PreviewHostEmpty() {
  const locale = await getLocale();
  const t = getDictionary(locale);
  const today = hostToday({ now: new Date(), rooms: null, tables: null, unread: 0, businesses: [], draft: null });
  return (
    <HostShell logoLabel={t.a11y.logoHome} wide>
      <HostStandingBody businesses={[]} draft={null} locale={locale} today={today} t={t} />
    </HostShell>
  );
}
