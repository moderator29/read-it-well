import type { Metadata } from "next";
import { getDictionary } from "@naijafinds/i18n";
import { getLocale } from "@/lib/locale";
import { ComingSoon, Ske } from "@/components/app/ComingSoon";
import { UiIcon } from "@/design-system/icons/UiIcon";

export const metadata: Metadata = { title: "Profile" };

/**
 * Profile destination.
 *
 * Reserved so the rail and tab bar never dead-end here (Master Rule 55). The
 * `(app)` layout supplies the navigation; this page shows what the surface
 * will be, with a skeleton preview of the account card badged as such.
 */
export default async function ProfilePage() {
  const locale = await getLocale();
  const t = getDictionary(locale);

  return (
    <ComingSoon
      title={t.nav.profile}
      icon="profile"
      promise="Your details, travel preferences and verification status in one place."
      preview={
        <div className="space-y-5">
          <div className="flex items-center gap-4">
            <Ske className="h-16 w-16 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1 space-y-2">
              <Ske className="h-4 w-1/2" />
              <Ske className="h-3 w-2/3" />
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-[var(--nf-radius-md)] border border-[var(--nf-border-subtle)] p-3 text-[0.8125rem] text-[var(--nf-content-muted)]">
            <UiIcon name="verified" size={16} className="shrink-0" />
            Identity verification will live here
          </div>
          <div className="space-y-3">
            <Ske className="h-3.5 w-full" />
            <Ske className="h-3.5 w-5/6" />
          </div>
        </div>
      }
    />
  );
}
