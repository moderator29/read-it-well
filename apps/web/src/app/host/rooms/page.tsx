import type { Metadata } from "next";
import Link from "next/link";
import { countOf, getDictionary, type Dictionary, type Locale } from "@vallo/i18n";
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
import { HostInnerNav } from "@/components/host/HostInnerNav";
import { hostInnerNavCopy } from "@/components/host/host-inner-nav";

export async function generateMetadata(): Promise<Metadata> {
  return { title: getDictionary(await getLocale()).experienceHost.rooms.title, robots: { index: false, follow: false } };
}

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
          title={t.hostWorkspace.rooms.signedOutTitle}
          body={t.hostWorkspace.rooms.signedOutBody}
          action={
            <ButtonLink href={authHref(next, "sign-in")} variant="primary" size="lg">
              {t.common.signIn}
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
      <HostInnerNav active="rooms" {...hostInnerNavCopy(t)} />
      <HostRoomsBody
        copy={t.hostWorkspace}
        words={t.experienceHost.rooms}
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
  copy = getDictionary("en").hostWorkspace,
  words = getDictionary("en").experienceHost.rooms,
}: {
  businesses: MyBusiness[];
  chosen: MyBusiness | null;
  accommodation: MyAccommodation | null;
  rooms: MyRoomType[];
  locale: Locale;
  /** The host workspace words in the reader's language; English in the previews. */
  copy?: Dictionary["hostWorkspace"];
  /** The page's own words in the reader's language; English in the previews. */
  words?: Dictionary["experienceHost"]["rooms"];
}) {
  if (!chosen) {
    return (
      <EmptyState
        icon="hotel"
        title={copy.rooms.noPropertyTitle}
        body={copy.rooms.noPropertyBody}
        action={
          <ButtonLink href="/host/apply" variant="primary" size="lg">
            {copy.doors.startApplication}
          </ButtonLink>
        }
      />
    );
  }

  if (!accommodation) {
    return (
      <EmptyState
        icon="hotel"
        title={copy.rooms.saveFirstTitle}
        body={copy.rooms.saveFirstBody}
        action={
          <ButtonLink href="/host/apply" variant="primary" size="lg">
            {copy.doors.openApplication}
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
          <h1 className="nf-agent-head__title">{words.title}</h1>
          <p className={`mt-row ${TYPE.bodyLg}`}>
            {(rooms.length === 0 ? words.noTypes : onSale === 0 ? words.noneOnSale : words.someOnSale)
              .replace("{name}", accommodation.name)
              .replace("{types}", countOf(rooms.length, "roomTypes", locale))
              .replace("{onSale}", String(onSale))}
          </p>
        </div>
      </div>

      {/* Only drawn where there is a choice to make. One property is the
          common case and a picker above it would be furniture. */}
      {businesses.length > 1 && (
        <nav className="mt-block flex flex-wrap gap-inline" aria-label={copy.rooms.propertiesLabel}>
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
            title={copy.rooms.noRoomTypesTitle}
            body={copy.rooms.noRoomTypesBody}
            action={
              <ButtonLink href="/host/apply" variant="primary" size="lg">
                {words.addRoomType}
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
