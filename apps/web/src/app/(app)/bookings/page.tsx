import type { Metadata } from "next";
import { getDictionary } from "@naijafinds/i18n";
import { getLocale } from "@/lib/locale";
import { ComingSoon, Ske } from "@/components/app/ComingSoon";

export const metadata: Metadata = { title: "Bookings" };

/**
 * Bookings destination.
 *
 * Reserved so the rail and tab bar never dead-end here (Master Rule 55). The
 * `(app)` layout supplies the navigation; this page shows what the surface
 * will be, with a skeleton preview of the trip list clearly badged as such.
 */
export default async function BookingsPage() {
  const locale = await getLocale();
  const t = getDictionary(locale);

  return (
    <ComingSoon
      title={t.nav.bookings}
      icon="booking"
      promise="Every trip in one place: upcoming stays, check-in details and receipts."
      preview={
        <ul className="space-y-4">
          {[0, 1].map((i) => (
            <li key={i} className="flex items-center gap-4">
              <Ske className="h-14 w-14 shrink-0 rounded-[var(--nf-radius-md)]" />
              <div className="min-w-0 flex-1 space-y-2">
                <Ske className="h-3.5 w-3/5" />
                <Ske className="h-3 w-2/5" />
              </div>
              <Ske className="h-6 w-20 shrink-0 rounded-full" />
            </li>
          ))}
        </ul>
      }
    />
  );
}
