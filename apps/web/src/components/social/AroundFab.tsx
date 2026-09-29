import { resolveSession } from "@/lib/actions/session";
import { getLocale } from "@/lib/locale";
import { getMyBookings } from "@/lib/bookings/queries";
import { listMyAreas } from "@/lib/social/areas-queries";
import { isSocialEnabled } from "@/lib/social/flag";
import { CreateBloom, type BloomArea, type ReviewableStay } from "./bloom/CreateBloom";

/**
 * The way to make something, from anywhere on the social layer.
 *
 * A server component for one reason: the bloom opens with real lists rather
 * than fetching them after the tap. It resolves the session, the places this
 * person is actually in (for the composer's place picker), and the stays they
 * may review right now (for the Review lozenge), and hands all three to
 * `CreateBloom`, which is everything a person touches.
 *
 * Signed out, the bloom still renders and its actions lead to sign-in. It is
 * absent only when the platform is unconfigured, because then there is
 * genuinely nothing behind it, and when the social switch is off, because a
 * create control whose every action then refuses is worse than none.
 */
export async function AroundFab({
  currentAreaId,
  initialOpen = false,
}: {
  /** Preselected when the bloom is opened from inside a place. */
  currentAreaId?: string;
  /**
   * Open the bloom on arrival: the dock's Create sheet sends "Post to the
   * feed" here as `/around?compose=1` (`CreateDock`).
   */
  initialOpen?: boolean;
}) {
  if (!(await isSocialEnabled())) return null;

  const session = await resolveSession();
  if (session.state === "unconfigured") return null;

  const signedIn = session.state === "signed-in";
  const [mine, bookings] = signedIn
    ? await Promise.all([listMyAreas(), getMyBookings(await getLocale())])
    : [[], null];

  /* Only places that are actually open. `posts_insert_self` refuses a post
     into anything that is not ACTIVE, so offering a paused place would be
     offering a refusal. */
  const areas: BloomArea[] = mine
    .filter((area) => area.status === "ACTIVE")
    .map((area) => ({ id: area.id, name: area.name, city: area.city }));

  /* `reviewable` mirrors `reviews_insert_own`, so the picker never offers a
     stay the database would refuse. A dropped read is an empty list here: the
     sheet then says nothing can be reviewed and points at the bookings list,
     which says the true thing about the read in its own words. */
  const reviewable: ReviewableStay[] =
    bookings && bookings !== "unavailable"
      ? bookings.completed
          .filter((stay) => stay.reviewable)
          .map((stay) => ({ bookingId: stay.id, title: stay.title, dateRange: stay.dateRange }))
      : [];

  return (
    <CreateBloom
      signedIn={signedIn}
      areas={areas}
      currentAreaId={
        currentAreaId && areas.some((a) => a.id === currentAreaId) ? currentAreaId : undefined
      }
      reviewable={reviewable}
      initialOpen={initialOpen}
    />
  );
}
