import type { Metadata } from "next";
import Link from "next/link";
import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { resolveSession } from "@/lib/actions/session";
import {
  getMyBusinesses,
  getPrimaryAccommodation,
  type MyAccommodation,
  type MyBusiness,
} from "@/lib/host/queries";
import { listBusinessPhotos, type BusinessPhoto } from "@/lib/stays/business-photos";
import {
  listAccommodationPhotos,
  type AccommodationPhoto,
} from "@/lib/stays/accommodation-photos";
import { authHref, returnHref } from "@/components/auth/auth-intent";
import { EmptyState, TYPE } from "@/components/app/Screen";
import { ButtonLink } from "@/components/ui/Button";
import { HostShell } from "@/components/host/HostShell";
import { BusinessPhotoManager } from "@/components/host/BusinessPhotoManager";
import { AccommodationPhotoManager } from "@/components/host/AccommodationPhotoManager";

export const metadata: Metadata = {
  title: "Photographs",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * /host/photos: where an owner's own photographs go up.
 *
 * WHY THIS IS A ROUTE OF ITS OWN RATHER THAN A STEP IN THE WIZARD. The wizard
 * is an application, and an application closes when it is sent: every write
 * behind it runs through `editableBusiness`, which refuses once a business is
 * SUBMITTED. Photographs are not an answer on a form, they are the venue's
 * content, and the onboarding script promises an owner they can go live the
 * day they sign and send their pictures during the week. A photograph surface
 * that shut the moment the application was sent would be shut for the entire
 * period the photographs actually arrive in.
 *
 * So the write path is `addBusinessPhoto`, which gates on ownership at any
 * status rather than on editability, and this screen is reachable from the
 * host's own standing page for every venue on the account.
 *
 * AND IT NOW SERVES BOTH SPINES, which is the whole reason a hotel could not
 * go live. A restaurant's photographs hang on its `businesses` row; a hotel's
 * or a shortlet's hang on the `accommodations` row under it, in
 * `accommodation_photos`, which had a table, a bucket, four storage policies
 * and a catalogue trigger and no writer anywhere in the application. The
 * submission gate refuses an accommodation with no photograph, so every hotel
 * and every shortlet stopped dead at the review step. One door, two spines,
 * decided by which table the chosen business's photographs actually live in,
 * because a second route would have been a second place for the cover rule to
 * drift.
 */
export default async function HostPhotosPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const locale = await getLocale();
  const t = getDictionary(locale);
  const session = await resolveSession();

  if (session.state !== "signed-in") {
    const next = returnHref("/host/photos", "", "list");
    return (
      <HostShell logoLabel={t.a11y.logoHome} fallback="/host">
        <EmptyState
          icon="camera"
          title="Photographs of your venue"
          body="Sign in to put your own photographs on your venue's page."
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

  const businesses = await getMyBusinesses();
  const chosen = businesses.find((row) => row.id === wanted) ?? businesses[0] ?? null;

  /* WHICH SPINE THIS VENUE'S PHOTOGRAPHS LIVE ON is decided by whether it has
     a property under it, not by its kind: a business of a stays kind that has
     not saved its property yet has nowhere to hang a photograph, and is told
     so rather than being shown a drop target that would fail on the server. */
  const accommodation =
    chosen && chosen.kind !== "restaurant" ? await getPrimaryAccommodation(chosen.id) : null;
  const photos: BusinessPhoto[] =
    chosen && !accommodation && chosen.kind === "restaurant"
      ? await listBusinessPhotos(chosen.id)
      : [];
  const propertyPhotos: AccommodationPhoto[] = accommodation
    ? await listAccommodationPhotos(accommodation.id)
    : [];

  return (
    <HostShell logoLabel={t.a11y.logoHome} fallback="/host">
      <HostPhotosBody
        userId={session.user.id}
        businesses={businesses}
        chosen={chosen}
        photos={photos}
        accommodation={accommodation}
        propertyPhotos={propertyPhotos}
      />
    </HostShell>
  );
}

/**
 * The screen, apart from its reads, so the whole thing can be drawn from
 * fixtures in the preview harness and read against the register at 390 dark.
 */
export function HostPhotosBody({
  userId,
  businesses,
  chosen,
  photos,
  accommodation = null,
  propertyPhotos = [],
}: {
  userId: string;
  businesses: MyBusiness[];
  chosen: MyBusiness | null;
  /** The venue's own photographs, on the business spine. */
  photos: BusinessPhoto[];
  /** The property under the chosen business, when it has one. */
  accommodation?: MyAccommodation | null;
  /** That property's photographs, on the accommodation spine. */
  propertyPhotos?: AccommodationPhoto[];
}) {
  if (!chosen) {
    return (
      <EmptyState
        icon="camera"
        title="No venue yet"
        body="Photographs hang on a venue, so there is one thing to do first. An application takes ten short steps at most and saves as you go."
        action={
          <ButtonLink href="/host/apply" variant="primary" size="lg">
            Start an application
          </ButtonLink>
        }
      />
    );
  }

  /* The subject of this screen: the property when there is one, the venue
     itself when there is not. One count and one sentence, so the heading never
     describes one spine while the manager below writes to the other. */
  const onRecord = accommodation ? propertyPhotos.length : photos.length;
  const subjectName = accommodation ? accommodation.name : chosen.name;

  return (
    <>
      <div className="nf-agent-head">
        <div>
          <h1 className="nf-agent-head__title">Photographs</h1>
          <p className={`mt-row ${TYPE.bodyLg}`}>
            {subjectName}
            {onRecord === 0
              ? " has no photographs yet, so its page shows a Vallo plate with a label saying so."
              : onRecord === 1
                ? " has one photograph, and it is the one guests see first."
                : ` has ${onRecord} photographs.`}
          </p>
        </div>
      </div>

      {/* Only drawn where there is a choice to make. One venue is the common
          case and a picker above it would be furniture. */}
      {businesses.length > 1 && (
        <nav className="mt-block flex flex-wrap gap-inline" aria-label="Your venues">
          {businesses.map((business) => (
            <Link
              key={business.id}
              href={`/host/photos?business=${business.id}`}
              className={`nf-chip${business.id === chosen.id ? " nf-chip--active" : ""}`}
              aria-current={business.id === chosen.id ? "page" : undefined}
            >
              {business.name}
            </Link>
          ))}
        </nav>
      )}

      <div className="mt-block">
        {accommodation ? (
          <AccommodationPhotoManager
            accommodationId={accommodation.id}
            userId={userId}
            photos={propertyPhotos.map((photo) => ({ id: photo.id, url: photo.url }))}
          />
        ) : chosen.kind === "restaurant" ? (
          <BusinessPhotoManager
            businessId={chosen.id}
            userId={userId}
            photos={photos.map((photo) => ({ id: photo.id, url: photo.url }))}
          />
        ) : (
          /* A stays business whose property has not been saved yet. The
             photographs hang on the property, so there is one thing to do
             first and it is named rather than drawn as an empty grid. */
          <EmptyState
            icon="camera"
            title="Save the property first"
            body="Photographs hang on the property itself, so the application asks for its name and pin first. Save the property there, and the photographs go up on the same step."
            action={
              <ButtonLink href="/host/apply" variant="primary" size="lg">
                Open the application
              </ButtonLink>
            }
          />
        )}
      </div>
    </>
  );
}
