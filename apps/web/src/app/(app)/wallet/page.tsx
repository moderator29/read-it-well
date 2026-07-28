import type { Metadata } from "next";
import { getDictionary } from "@naijafinds/i18n";
import { getLocale } from "@/lib/locale";
import { ComingSoon, Ske } from "@/components/app/ComingSoon";

export const metadata: Metadata = { title: "Wallet" };

/**
 * Wallet destination.
 *
 * Reserved so the rail and tab bar never dead-end here (Master Rule 55). The
 * `(app)` layout supplies the navigation; this page shows what the surface
 * will be, with a skeleton preview clearly badged as such. Deliberately no
 * mocked-up naira figures: money in this product is real integer kobo or it is
 * a skeleton bar, never an invented number.
 */
export default async function WalletPage() {
  const locale = await getLocale();
  const t = getDictionary(locale);

  return (
    <ComingSoon
      title={t.nav.wallet}
      icon="wallet"
      promise="Top up, pay for stays and track every naira, all inside one balance."
      preview={
        <div className="space-y-5">
          <div>
            <p className="text-[0.75rem] font-semibold uppercase tracking-wide text-[var(--nf-content-muted)]">
              Balance
            </p>
            <Ske className="mt-2 h-8 w-36" />
          </div>
          <div className="flex gap-3">
            <Ske className="h-10 flex-1 rounded-full" />
            <Ske className="h-10 flex-1 rounded-full" />
          </div>
          <div className="space-y-3 border-t border-[var(--nf-border-subtle)] pt-4">
            {[0, 1].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <Ske className="h-9 w-9 shrink-0 rounded-full" />
                <Ske className="h-3.5 flex-1" />
                <Ske className="h-3.5 w-16 shrink-0" />
              </div>
            ))}
          </div>
        </div>
      }
    />
  );
}
