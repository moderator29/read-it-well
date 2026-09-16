import type { Metadata } from "next";
import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import Link from "next/link";
import { PageHeader } from "@/components/app/PageHeader";
import { BrandIcon } from "@/design-system/icons/BrandIcon";
import { resolveSession } from "@/lib/actions/session";
import { listStates, readLocalGovernment, readOccupation } from "@/lib/places/queries";
import { PlaceForm } from "./PlaceForm";

export async function generateMetadata(): Promise<Metadata> {
  // Static metadata cannot read the locale cookie, and this tab title is the
  // same sentence as the page heading, so the two would have disagreed.
  return {
    title: getDictionary(await getLocale()).settings.place.screenTitle,
    robots: { index: false, follow: false },
  };
}

export const dynamic = "force-dynamic";

/**
 * Where you are, and what you do.
 *
 * Its own screen rather than three more rows crammed into the profile card.
 * The owner asked for this twice: not jam-packed. Three questions, each with
 * room to breathe, each backed by a real table, and the whole thing saves as
 * one write because the database checks the state and the local government
 * against each other.
 *
 * Reached from the chevron beside the city on home, and from the settings
 * screen. A person who is not signed in is told what this screen is for and
 * given the way in, rather than being shown an empty form that cannot save.
 */
export default async function PlacePage() {
  const t = getDictionary(await getLocale());
  const session = await resolveSession();
  const states = await listStates();

  const copy = t.settings.place;

  if (session.state !== "signed-in") {
    return (
      <div className="mx-auto max-w-lg">
        <PageHeader title={copy.screenTitle} fallback="/settings" />
        <div className="nf-card p-lg text-center sm:p-xl">
          <span className="mx-auto block h-16 w-16">
            <BrandIcon name="globe-pin" fill />
          </span>
          <h2 className="nf-h3 mt-md">{copy.accountTitle}</h2>
          <p className="mx-auto mt-xs max-w-[42ch] text-[var(--nf-text-body-sm)] leading-relaxed text-[var(--nf-content-secondary)]">
            {session.state === "unconfigured"
              ? copy.accountBodyUnconfigured
              : copy.accountBodySignedOut}
          </p>
          {session.state === "signed-out" && (
            <Link href="/sign-in" className="nf-btn nf-btn--primary mt-md w-full sm:w-auto">
              {t.common.signIn}
            </Link>
          )}
        </div>
      </div>
    );
  }

  const { data: profile } = await session.supabase
    .from("profiles")
    .select("state_code, lga_code, occupation_code")
    .eq("id", session.user.id)
    .maybeSingle();

  const stateCode = profile?.state_code ?? "";
  const lgaCode = profile?.lga_code ?? "";
  const occupationCode = profile?.occupation_code ?? "";

  const [lga, occupation] = await Promise.all([
    lgaCode ? readLocalGovernment(lgaCode) : Promise.resolve(null),
    occupationCode ? readOccupation(occupationCode) : Promise.resolve(null),
  ]);

  return (
    <div className="mx-auto max-w-lg">
      <PageHeader
        title={copy.screenTitle}
        subtitle={copy.screenSubtitle}
        fallback="/settings"
      />

      {states.length === 0 && (
        <p className="nf-card mb-md p-md text-[var(--nf-text-caption)] leading-relaxed text-[var(--nf-content-muted)]">
          {copy.statesUnavailable}
        </p>
      )}

      <PlaceForm
        t={t}
        states={states}
        initial={{ stateCode, lgaCode, occupationCode }}
        initialLabels={{
          lgaName: lga?.name ?? "",
          occupationName: occupation?.name ?? "",
        }}
      />
    </div>
  );
}
