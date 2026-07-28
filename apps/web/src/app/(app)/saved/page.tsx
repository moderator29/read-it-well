import type { Metadata } from "next";
import { getDictionary } from "@naijafinds/i18n";
import { getLocale } from "@/lib/locale";
import { ComingSoon, Ske } from "@/components/app/ComingSoon";
import { UiIcon } from "@/design-system/icons/UiIcon";

export const metadata: Metadata = { title: "Saved" };

/**
 * Saved destination.
 *
 * Reserved so the rail and tab bar never dead-end here (Master Rule 55). The
 * `(app)` layout supplies the navigation; this page shows what the surface
 * will be, with a skeleton preview of the shortlist clearly badged as such.
 */
export default async function SavedPage() {
  const locale = await getLocale();
  const t = getDictionary(locale);

  return (
    <ComingSoon
      title={t.nav.saved}
      icon="favorites"
      promise="Every place you shortlist, kept together and ready to compare or book."
      preview={
        <div className="grid grid-cols-2 gap-4">
          {[0, 1].map((i) => (
            <div key={i} className="space-y-2.5">
              <div className="relative">
                <Ske className="aspect-[4/3] w-full rounded-[var(--nf-radius-md)]" />
                <span className="absolute right-2 top-2 text-[var(--nf-content-muted)]">
                  <UiIcon name="star" size={16} />
                </span>
              </div>
              <Ske className="h-3.5 w-4/5" />
              <Ske className="h-3 w-2/5" />
            </div>
          ))}
        </div>
      }
    />
  );
}
