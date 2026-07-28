import type { Metadata } from "next";
import { getDictionary } from "@naijafinds/i18n";
import { getLocale } from "@/lib/locale";
import { ComingSoon, Ske } from "@/components/app/ComingSoon";

export const metadata: Metadata = { title: "Settings" };

/**
 * Settings destination.
 *
 * Reserved so the rail and tab bar never dead-end here (Master Rule 55). The
 * `(app)` layout supplies the navigation; this page shows what the surface
 * will be, with a skeleton preview of the controls badged as such.
 */
export default async function SettingsPage() {
  const locale = await getLocale();
  const t = getDictionary(locale);

  return (
    <ComingSoon
      title={t.nav.settings}
      icon="settings"
      promise="Language, notifications, privacy and payment preferences, all in one panel."
      preview={
        <ul className="divide-y divide-[var(--nf-border-subtle)]">
          {[0, 1, 2].map((i) => (
            <li key={i} className="flex items-center justify-between gap-4 py-3.5 first:pt-0 last:pb-0">
              <div className="min-w-0 flex-1 space-y-2">
                <Ske className="h-3.5 w-2/5" />
                <Ske className="h-3 w-3/5" />
              </div>
              {/* Toggle silhouette. */}
              <div
                aria-hidden="true"
                className="relative h-6 w-11 shrink-0 rounded-full bg-[color-mix(in_oklab,var(--nf-content-primary)_9%,transparent)]"
              >
                <div className="absolute left-1 top-1 h-4 w-4 rounded-full bg-[color-mix(in_oklab,var(--nf-content-primary)_22%,transparent)]" />
              </div>
            </li>
          ))}
        </ul>
      }
    />
  );
}
