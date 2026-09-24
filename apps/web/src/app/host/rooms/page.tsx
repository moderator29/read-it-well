import type { Metadata } from "next";
import Link from "next/link";
import { getDictionary, type Locale } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { resolveSession } from "@/lib/actions/session";
import {
  getMyBusinesses,
  getMyRoomTypes,
  getPrimaryAccommodation,
  type MyAccommodation,
  type MyBusiness,
  type MyRoomType,
} from "@/lib/host/queries";
import { authHref, returnHref } from "@/components/auth/auth-intent";
import { EmptyState, TYPE } from "@/components/app/Screen";
import { ButtonLink } from "@/components/ui/Button";
import { HostShell } from "@/components/host/HostShell";
import { RoomNightsEditor } from "@/components/host/RoomNightsEditor";

export const metadata: Metadata = {
  title: "Rooms and nights",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * /host/rooms: how far ahead a hotel is bookable, and by how many rooms.
 *
 * THE QUESTION THIS SURFACE ANSWERS COULD NOT BE ASKED BEFORE IT.
 * `room_inventory` is one row per room type per night, and `stays_search`
 * treats a missing row as NOT OFFERED rather than as available, deliberately.
 * The table was created in M5 with its oversell lock, its two triggers and its
 * RLS, and no application file ever wrote to it or read from it: the only two
 * mentions in `apps/web/src` were comments. So every hotel on the platform was
 * invisible to every search that carried dates, and no host had any way to see
 * that, let alone change it.
 *
 * WHAT IS HONEST HERE. The night count is counted from the rows, never
 * inferred from the horizon constant: what the screen prints is what the table
 * holds. A room type with no rate plan is drawn as not on sale with the reason,
 * because the publish gate will not put it on the shelf and a host should learn
 * that here rather than from a reviewer. And the status of a room type is
 * shown as it is: DRAFT until the property is published, which is the reviewer's
 * act and not the host's.
 */
export default async function HostRoomsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const locale = await getLocale();
  const t = getDictionary(locale);
  const session = await resolveSession();

  if (session.state !== "signed-in") {
    const next = returnHref("/host/rooms", "", "list");
    return (
      <HostShell logoLabel={t.a11y.logoHome} fallback="/host">
        <EmptyState
          icon="hotel"
          title="Your rooms and your nights"
          body="Sign in to see how many rooms you have on sale and how far ahead guests can book them."
          action={
            <ButtonLink href={authHref(next, "sign-in")} variant="primary" size="lg">
              Sign in
            </ButtonLink>
          }
        />
      </HostShell>
    );
  }

  const params = await searchParams;
  const asked = params.business;
  const wanted = Array.isArray(asked) ? asked[0] : asked;

  const businesses = (await getMyBusinesses()).filter((row) => row.kind !== "restaurant");
  const chosen = businesses.find((row) => row.id === wanted) ?? businesses[0] ?? null;
  const accommodation = chosen ? await getPrimaryAccommodation(chosen.id) : null;
  const rooms = accommodation ? await getMyRoomTypes(accommodation.id) : [];

  return (
    <HostShell logoLabel={t.a11y.logoHome} fallback="/host">
      <HostRoomsBody
        businesses={businesses}
        chosen={chosen}
        accommodation={accommodation}
        rooms={rooms}
        locale={locale}
      />
    </HostShell>
  );
}

/**
 * The screen, apart from its reads, so the whole thing can be drawn from
 * fixtures in the preview harness and read against the register at 390 dark.
 */
export function HostRoomsBody({
  businesses,
  chosen,
  accommodation,
  rooms,
  locale,
}: {
  businesses: MyBusiness[];
  chosen: MyBusiness | null;
  accommodation: MyAccommodation | null;
  rooms: MyRoomType[];
  locale: Locale;
}) {
  if (!chosen) {
    return (
      <EmptyState
        icon="hotel"
        title="No property yet"
        body="Rooms hang on a property, so there is one thing to do first. An application takes ten short steps at most and saves as you go."
        action={
          <ButtonLink href="/host/apply" variant="primary" size="lg">
            Start an application
          </ButtonLink>
        }
      />
    );
  }

  if (!accommodation) {
    return (
      <EmptyState
        icon="hotel"
        title="Save the property first"
        body="Rooms and their nights hang on the property itself, so the application asks for its name and pin first. Save the property there, and the rooms follow on the next step."
        action={
          <ButtonLink href="/host/apply" variant="primary" size="lg">
            Open the application
          </ButtonLink>
        }
      />
    );
  }

  const onSale = rooms.filter((room) => room.nightsOnSale > 0).length;

  return (
    <>
      <div className="nf-agent-head">
        <div>
          <h1 className="nf-agent-head__title">Rooms and nights</h1>
          <p className={`mt-row ${TYPE.bodyLg}`}>
            {rooms.length === 0
              ? `${accommodation.name} has no room types yet, so there is nothing a guest could book.`
              : onSale === 0
                ? `${accommodation.name} has ${rooms.length} room type${rooms.length === 1 ? "" : "s"} and no nights on sale, so a search with dates on it will not find it.`
                : `${accommodation.name} has ${rooms.length} room type${rooms.length === 1 ? "" : "s"}, ${onSale} of them on sale.`}
          </p>
        </div>
      </div>

      {/* Only drawn where there is a choice to make. One property is the
          common case and a picker above it would be furniture. */}
      {businesses.length > 1 && (
        <nav className="mt-block flex flex-wrap gap-inline" aria-label="Your properties">
          {businesses.map((business) => (
            <Link
              key={business.id}
              href={`/host/rooms?business=${business.id}`}
              className={`nf-chip${business.id === chosen.id ? " nf-chip--active" : ""}`}
              aria-current={business.id === chosen.id ? "page" : undefined}
            >
              {business.name}
            </Link>
          ))}
        </nav>
      )}

      <div className="mt-block">
        {rooms.length === 0 ? (
          <EmptyState
            icon="hotel"
            title="No room types yet"
            body="A room type is a kind of room a guest books, such as a deluxe double. Add at least one, with how many there are and what a night costs, and the property can go on the shelf."
            action={
              <ButtonLink href="/host/apply" variant="primary" size="lg">
                Add a room type
              </ButtonLink>
            }
          />
        ) : (
          <RoomNightsEditor rooms={rooms} locale={locale} />
        )}
      </div>
    </>
  );
}
