import type { Metadata } from "next";
import { getDictionary } from "@naijafinds/i18n";
import { getLocale } from "@/lib/locale";
import { PageHeader } from "@/components/app/PageHeader";
import { BookingsTabs } from "@/components/app/bookings/BookingsTabs";
import { Icon, type IconName } from "@/design-system/icons/Icon";
import { Reveal } from "@/components/site/Reveal";

export const metadata: Metadata = { title: "Bookings" };

/**
 * Bookings.
 *
 * The trips hub: status tabs over the booking list (honest empty states until
 * real bookings exist), then a short strip explaining how booking works so a
 * first-time guest knows what to expect before they commit.
 */
export default async function BookingsPage() {
  const locale = await getLocale();
  const t = getDictionary(locale);

  const steps: { icon: IconName; title: string; body: string }[] = [
    { icon: "booking", title: "Choose your dates", body: "Pick check-in and check-out on a live calendar." },
    { icon: "secure", title: "Confirm and pay", body: "Secure payment in naira. You are never charged early." },
    { icon: "experience", title: "Enjoy your stay", body: "Check-in details arrive right here and by email." },
  ];

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title={t.nav.bookings} />

      <Reveal>
        <div className="nf-card p-4 sm:p-5">
          <BookingsTabs />
        </div>
      </Reveal>

      <Reveal delay={100}>
        <h2 className="nf-overline mb-3 mt-8">How booking works</h2>
        <ul className="grid gap-2.5 sm:grid-cols-3">
          {steps.map((s) => (
            <li key={s.title} className="nf-card flex items-start gap-3 p-4 sm:flex-col">
              <span className="h-9 w-9 shrink-0">
                <Icon name={s.icon} fill />
              </span>
              <span className="leading-tight">
                <span className="block text-[0.875rem] font-semibold">{s.title}</span>
                <span className="mt-1 block text-[0.78rem] leading-relaxed text-[var(--nf-content-muted)]">
                  {s.body}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </Reveal>
    </div>
  );
}
