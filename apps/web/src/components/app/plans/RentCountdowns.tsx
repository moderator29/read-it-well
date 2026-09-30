import type { SupabaseClient } from "@supabase/supabase-js";
import { formatDate, getDictionary, type Locale } from "@vallo/i18n";
import { resolveSession } from "@/lib/actions/session";
import type { RentChargeView } from "@/lib/bookings/queries";
import { lagosToday } from "@/lib/bookings/schema";
import { rentCountdown, type Countdown } from "@/lib/tenancy/countdown";
import { tenancyEnd } from "@/lib/tenancy/model";
import { RentCountdown } from "@/components/app/tenancy/RentCountdown";

/**
 * B10 ON PLANS: the rent countdown for each tenancy the reader is the TENANT
 * of, paid and running, above the tenancy cards.
 *
 * The figure is `rent_payments.rent_minor`, or the lister's latest renewal
 * offer when one exists (the same rule as the tenancy page). A tenancy that
 * was voided, has ended, or whose reads fail shows no card: the tenancy card
 * below still carries it, and a countdown is never guessed.
 */
export async function RentCountdowns({ tenancies, locale }: { tenancies: RentChargeView[]; locale: Locale }) {
  const running = tenancies.filter((t) => t.paid);
  if (running.length === 0) return null;
  const session = await resolveSession();
  if (session.state !== "signed-in") return null;
  const loose = session.supabase as unknown as SupabaseClient;
  const ids = running.map((t) => t.fileHref.replace("/tenancy/", ""));
  const today = lagosToday();

  let cards: { id: string; countdown: Countdown; endsOn: string }[] = [];
  try {
    const [payments, offers] = await Promise.all([
      loose.from("rent_payments").select("id, tenant_id, move_in, rent_period, rent_minor").in("id", ids),
      loose
        .from("tenancy_renewal_offers")
        .select("rent_payment_id, rent_minor, offered_at")
        .in("rent_payment_id", ids)
        .order("offered_at", { ascending: false }),
    ]);
    if (payments.error || !Array.isArray(payments.data)) return null;
    const offerFor = new Map<string, number>();
    if (!offers.error && Array.isArray(offers.data)) {
      for (const row of offers.data as { rent_payment_id: string; rent_minor: unknown }[]) {
        const minor = Number(row.rent_minor);
        if (!offerFor.has(row.rent_payment_id) && Number.isInteger(minor) && minor > 0) offerFor.set(row.rent_payment_id, minor);
      }
    }
    const rows = (payments.data as { id: string; tenant_id: string; move_in: string; rent_period: "month" | "quarter" | "year"; rent_minor: unknown }[])
      .filter((r) => r.tenant_id === session.user.id);
    const voids = await Promise.all(
      rows.map((r) =>
        loose
          .rpc("tenancy_is_void", { p_rent_payment: r.id })
          .then(({ data, error }) => (error ? true : data === true)),
      ),
    );
    cards = rows.flatMap((r, i) => {
      if (voids[i]) return [];
      const endsOn = tenancyEnd(r.move_in, r.rent_period);
      const countdown = rentCountdown({
        today,
        endsOn,
        rentMinor: Number(r.rent_minor),
        offerRentMinor: offerFor.get(r.id) ?? null,
      });
      return countdown ? [{ id: r.id, countdown, endsOn }] : [];
    });
  } catch {
    return null;
  }
  if (cards.length === 0) return null;
  const copy = getDictionary(locale).memberKit.rentCountdown;
  return (
    <div className="mb-md grid gap-md" data-testid="plans-rent-countdowns">
      {cards
        .sort((a, b) => a.countdown.daysLeft - b.countdown.daysLeft)
        .map((c) => (
          <RentCountdown
            key={c.id}
            countdown={c.countdown}
            endsOnLabel={formatDate(new Date(`${c.endsOn}T12:00:00+01:00`), locale, { day: "numeric", month: "long", year: "numeric" })}
            copy={copy}
            locale={locale}
            href={`/tenancy/${c.id}`}
            testId="plans-rent-countdown"
          />
        ))}
    </div>
  );
}
