import type { Metadata } from "next";
import Link from "next/link";
import { formatMoney, getDictionary, plural, type Locale } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { authHref, returnHref } from "@/components/auth/auth-intent";
import { EmptyState, TYPE } from "@/components/app/Screen";
import { ButtonLink } from "@/components/ui/Button";
import { Amount } from "@/components/ui/Amount";
import { HostShell } from "@/components/host/HostShell";
import { readHostRoomBookings, type HostRoomBooking } from "@/lib/host/room-bookings";
import { stayDateLabel } from "@/lib/stays/date-label";
import { RoomRequestAnswer } from "./RoomRequestAnswer";

export const metadata: Metadata = { title: "Room bookings", robots: { index: false, follow: false } };

export const dynamic = "force-dynamic";

/**
 * /host/bookings: ROOM BOOKINGS 1. Guests' requests for rooms at this host's
 * hotels, to accept or decline, and the stays that follow.
 *
 * A request holds its rooms from the moment it is made. Accepting draws up
 * the stay agreement: the host and the guest confirm its terms, Vallo checks
 * it, and then the guest pays by card, split by Paystack straight to the
 * host's bank account (the one set as default in payment settings). Declining
 * gives the nights back at once. Unanswered requests lapse on their own.
 */
export default async function HostRoomBookingsPage() {
  const locale = await getLocale();
  const t = getDictionary(locale);
  const read = await readHostRoomBookings();

  if (read.state === "signed-out") {
    return (
      <HostShell logoLabel={t.a11y.logoHome} fallback="/host">
        <EmptyState
          icon="hotel-bed"
          title="Your room bookings"
          body="Sign in to see the rooms guests have asked for at your hotel, and to accept or decline them."
          action={
            <ButtonLink href={authHref(returnHref("/host/bookings", "", "list"), "sign-in")} variant="primary" size="lg">
              Sign in
            </ButtonLink>
          }
        />
      </HostShell>
    );
  }

  return (
    <HostShell logoLabel={t.a11y.logoHome} fallback="/host">
      <div className="mx-auto max-w-2xl">
        <h1 className="nf-h2">Room bookings</h1>
        <p className={`mt-xs mb-block ${TYPE.body}`}>
          Accept a request and the stay agreement is drawn up for you and the guest to confirm. Once it is approved on
          Vallo, the guest pays by card and your share goes straight to your default bank account.
        </p>
        {read.state === "unavailable" ? (
          <p className="nf-body" role="alert">
            Your room bookings could not be read just now. Nothing has changed. Refresh to try again.
          </p>
        ) : read.waiting.length + read.upcoming.length + read.past.length === 0 ? (
          <EmptyState
            icon="hotel-bed"
            title="No room requests yet"
            body="When a guest asks for one of your rooms, the request appears here and we tell you straight away."
          />
        ) : (
          <>
            <Section title="Waiting for you" rows={read.waiting} locale={locale} answer />
            <Section title="Accepted" rows={read.upcoming} locale={locale} />
            <Section title="Past and closed" rows={read.past} locale={locale} />
          </>
        )}
      </div>
    </HostShell>
  );
}

const STATUS_WORD: Record<string, string> = {
  PENDING: "Waiting for you",
  CONFIRMED: "Accepted",
  CANCELLED: "Cancelled",
  COMPLETED: "Stayed",
  NO_SHOW: "No-show",
};

const AGREEMENT_WORD: Record<string, string> = {
  awaiting_parties: "Agreement waiting for you or the guest to confirm",
  in_review: "Agreement with Vallo for checking",
  approved: "Agreement approved: the guest can pay",
  rejected: "Agreement sent back",
  cancelled: "Agreement cancelled",
  paid: "Paid",
};

function Section({
  title,
  rows,
  locale,
  answer,
}: {
  title: string;
  rows: HostRoomBooking[];
  locale: Locale;
  answer?: boolean;
}) {
  if (rows.length === 0) return null;
  const counts = getDictionary(locale).counts;
  return (
    <section className="mt-block" aria-label={title}>
      <h2 className="nf-h4">{title}</h2>
      <ul className="mt-xs grid gap-xs">
        {rows.map((b) => (
          <li key={b.id} className="nf-panel nf-panel--card p-card" data-testid="host-room-booking">
            <p className="font-semibold">
              {b.room} &middot; {plural(b.rooms, counts.rooms, locale)} &middot; {b.hotel}
            </p>
            <p className={TYPE.rowMeta}>
              {stayDateLabel(b.checkIn) ?? b.checkIn} to {stayDateLabel(b.checkOut) ?? b.checkOut} &middot;{" "}
              {plural(b.nights, counts.nights, locale)} &middot; {plural(b.guests, counts.guests, locale)}
            </p>
            <p className={TYPE.rowMeta}>
              {b.guestName}
              {b.arrivingName ? `, for ${b.arrivingName}` : ""} &middot; <Amount minorUnits={b.totalMinor} locale={locale} />
            </p>
            <p className="nf-caption mt-2xs">
              {b.paid ? "Paid" : b.agreement ? (AGREEMENT_WORD[b.agreement.status] ?? b.agreement.status) : STATUS_WORD[b.status] ?? b.status}
              {b.agreement && !b.paid ? (
                <>
                  {" "}
                  &middot;{" "}
                  <Link href={`/agreements/${b.agreement.id}`} className="underline">
                    Open the agreement
                  </Link>
                </>
              ) : null}
            </p>
            {answer ? (
              <RoomRequestAnswer
                bookingId={b.id}
                summary={{
                  guestName: b.guestName,
                  room: b.room,
                  hotel: b.hotel,
                  dates: `${stayDateLabel(b.checkIn) ?? b.checkIn} to ${stayDateLabel(b.checkOut) ?? b.checkOut}`,
                  stay: `${plural(b.nights, counts.nights, locale)} · ${plural(b.guests, counts.guests, locale)}`,
                  total: formatMoney(b.totalMinor, locale),
                  listingTitle: b.hotel,
                  checkIn: b.checkIn,
                  checkOut: b.checkOut,
                  nights: b.nights,
                  totalMinor: b.totalMinor,
                }}
              />
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
