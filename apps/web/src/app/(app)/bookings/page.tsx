import type { Metadata } from "next";
import { getDictionary } from "@naijafinds/i18n";
import { getLocale } from "@/lib/locale";
import { getListingRepository } from "@/lib/listings/repository";
import type { Listing } from "@/lib/listings/types";
import { buildBookings } from "@/lib/demo/bookings";
import { getMyBookings } from "@/lib/bookings/queries";
import { PageHeader } from "@/components/app/PageHeader";
import { PageScene } from "@/components/app/PageScene";
import { BookingsTabs } from "@/components/app/bookings/BookingsTabs";
import { MyBookings } from "./MyBookings";
import { BrandIcon, type BrandIconName } from "@/design-system/icons/BrandIcon";
import { Reveal } from "@/components/site/Reveal";
import { readInspectionsForRequester } from "@/lib/inspections/queries";
import { InspectionRows } from "@/components/app/inspections/InspectionRows";
import { Row, RowList, Section, TYPE } from "@/components/app/Screen";

export const metadata: Metadata = { title: "Bookings" };

/**
 * The stays this account has booked: two upcoming weekends and one completed
 * trip, resolved from the live catalogue so every card carries real
 * photography, locality and pricing. Falls back to the first stays in the
 * catalogue if any id ever leaves the seed.
 */
const BOOKED_IDS = ["seed-2", "seed-16", "seed-7"];

async function getBookedStays(): Promise<Listing[]> {
  const repo = getListingRepository();
  const picked = await Promise.all(BOOKED_IDS.map((id) => repo.byId(id)));
  const stays = picked.filter((l): l is Listing => l !== null);
  if (stays.length >= BOOKED_IDS.length) return stays;
  /*
   * Our own inventory only, and this one is a correctness fix as much as a
   * cost one.
   *
   * Partner stock cannot be booked on this platform at all: there is no
   * checkout for inventory we do not own, which is why a partner card carries
   * a price and no Reserve button (docs/HYBRID_INVENTORY.md section 7). So a
   * partner hotel appearing in a list of stays is wrong twice over, and the
   * unfiltered search that fetched it was also spending two billed Places
   * requests on every visit to this page.
   */
  const pool = (await repo.search({}, { partners: false })).filter(
    (l) =>
      l.kind !== "restaurant" &&
      l.kind !== "experience" &&
      !stays.some((s) => s.id === l.id),
  );
  return [...stays, ...pool].slice(0, BOOKED_IDS.length);
}

/**
 * Bookings.
 *
 * The trips hub: status tabs over the booking list, then a short strip
 * explaining how booking works so a first-time guest knows what to expect
 * before they commit. When Supabase is configured and a user is signed in,
 * the list is their real bookings read under RLS, with cancellation wired to
 * the state machine; otherwise the seeded trips keep the surface alive.
 */
export default async function BookingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const locale = await getLocale();
  const t = getDictionary(locale);
  const params = await searchParams;
  const justBookedRaw = params.justBooked;
  const justBooked = typeof justBookedRaw === "string" ? justBookedRaw : undefined;

  const loaded = await getMyBookings(locale);
  /*
   * Three states, not two. Signed out draws the example stays that explain what
   * this screen is for; signed in draws real trips; and a read that FAILED
   * draws neither, because both of the others would be a lie: "you have none"
   * about an account that may have several, or a set of stays that are not
   * theirs.
   */
  const unavailable = loaded === "unavailable";
  const groups = unavailable ? null : loaded;
  const seeded = loaded === null ? buildBookings(await getBookedStays(), locale) : null;

  /*
   * THE VIEWINGS THIS PERSON HAS ASKED FOR.
   *
   * A booking is a stay that is paid for; an inspection is the step before
   * anybody pays for anything, and in the rental market it is the ONLY step
   * most people ever take. Somebody who has asked three agents to show them a
   * flat has three live things on this platform and, until now, no screen
   * showing any of them: the requests existed as sentences in three separate
   * chat threads.
   *
   * It sits ABOVE the trips because it is the live half of this screen. A
   * request waiting on an agent is something happening now; a stay in
   * September is a record. The section does not render at all when there is
   * nothing in it, so a person who only books hotels never sees it.
   */
  const inspections = await readInspectionsForRequester();

  const steps: { icon: BrandIconName; title: string; body: string }[] = [
    { icon: "calendar-check", title: "Choose your dates", body: "Pick check-in and check-out on a live calendar." },
    { icon: "shield-lock", title: "Confirm and pay", body: "Secure payment in naira. You are never charged early." },
    { icon: "luggage-check", title: "Enjoy your stay", body: "Check-in details arrive right here and by email." },
  ];

  return (
    <div className="mx-auto max-w-2xl">
      <div className="relative">
        <PageScene art="/brand/story-booking.png" />
      <PageHeader title={t.nav.bookings} />
      </div>

      {inspections.inspections.length > 0 && (
        <Reveal className="mb-8">
          <Section
            title="Your inspections"
            description="Whoever listed the property sees the same state you do."
          >
            <InspectionRows
              inspections={inspections.inspections}
              side="requester"
              locale={locale}
            />
          </Section>
        </Reveal>
      )}

      <Reveal>
        <div className="nf-card p-4 sm:p-5">
          {unavailable ? (
            <div className="py-6 text-center" data-testid="bookings-unavailable">
              <p className={TYPE.rowTitle}>We could not load your trips</p>
              <p className={`mx-auto mt-2 max-w-sm ${TYPE.body}`}>
                Something on our side did not answer just now. Nothing has changed about
                your bookings. Reload the page and they should come straight back.
              </p>
            </div>
          ) : groups ? (
            <MyBookings groups={groups} locale={locale} justBookedId={justBooked} />
          ) : (
            <BookingsTabs
              upcoming={seeded?.upcoming ?? []}
              past={seeded?.past ?? []}
              locale={locale}
            />
          )}
        </div>
      </Reveal>

      <Reveal delay={100}>
        {/* THREE CARDS BECAME THREE ROWS. Three steps of one process drawn as
            three bordered boxes is three objects where there is one sequence;
            one surface with hairlines between says "these belong together and
            they are in this order", which is the thing the reader needs. */}
        <h2 className="nf-group-label mt-8">How booking works</h2>
        <RowList boxed>
          {steps.map((s) => (
            <Row key={s.title} className="items-start">
              <span className="h-11 w-11 shrink-0">
                <BrandIcon name={s.icon} fill />
              </span>
              <span className="min-w-0 leading-tight">
                <span className={`block ${TYPE.rowTitle}`}>{s.title}</span>
                <span className={`mt-0.5 block ${TYPE.rowMeta}`}>{s.body}</span>
              </span>
            </Row>
          ))}
        </RowList>
      </Reveal>
    </div>
  );
}
