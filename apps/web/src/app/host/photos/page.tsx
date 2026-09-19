import type { Metadata } from "next";
import Link from "next/link";
import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { resolveSession } from "@/lib/actions/session";
import { getMyBusinesses, type MyBusiness } from "@/lib/host/queries";
import { listBusinessPhotos, type BusinessPhoto } from "@/lib/stays/business-photos";
import { authHref, returnHref } from "@/components/auth/auth-intent";
import { EmptyState, TYPE } from "@/components/app/Screen";
import { ButtonLink } from "@/components/ui/Button";
import { HostShell } from "@/components/host/HostShell";
import { BusinessPhotoManager } from "@/components/host/BusinessPhotoManager";

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
  const photos: BusinessPhoto[] = chosen ? await listBusinessPhotos(chosen.id) : [];

  return (
    <HostShell logoLabel={t.a11y.logoHome} fallback="/host">
      <HostPhotosBody
        userId={session.user.id}
        businesses={businesses}
        chosen={chosen}
        photos={photos}
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
}: {
  userId: string;
  businesses: MyBusiness[];
  chosen: MyBusiness | null;
  photos: BusinessPhoto[];
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

  return (
    <>
      <div className="nf-agent-head">
        <div>
          <h1 className="nf-agent-head__title">Photographs</h1>
          <p className={`mt-row ${TYPE.bodyLg}`}>
            {chosen.name}
            {photos.length === 0
              ? " has no photographs yet, so its page shows a Vallo plate with a label saying so."
              : photos.length === 1
                ? " has one photograph, and it is the one guests see first."
                : ` has ${photos.length} photographs.`}
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
        <BusinessPhotoManager
          businessId={chosen.id}
          userId={userId}
          photos={photos.map((photo) => ({ id: photo.id, url: photo.url }))}
        />
      </div>
    </>
  );
}
