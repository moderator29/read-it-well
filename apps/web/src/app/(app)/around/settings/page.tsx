import type { Metadata } from "next";
import Link from "next/link";
import { getDictionary } from "@vallo/i18n";
import { PageHeader } from "@/components/app/PageHeader";
import { ButtonLink } from "@/components/ui/Button";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { getLocale } from "@/lib/locale";
import { resolveSession } from "@/lib/actions/session";
import {
  listMyAreas,
  listMyProposals,
  listOpenAreas,
  listOpenLgaPlaces,
} from "@/lib/social/areas-queries";
import { AREA_COPY, type AreaStatus } from "@/lib/social/areas-schema";
import { AROUND_UNCONFIGURED } from "../copy";
import { getPlaceTree } from "@/lib/social/place-tree";
import { PlacePicker } from "@/components/social/PlacePicker";
import { AroundFab } from "@/components/social/AroundFab";
import { AreaRow, ProposalsAnswered, ProposalsWaiting } from "./PlaceRows";
import { SocialPaused } from "@/components/social/SocialPaused";
import { isSocialEnabled } from "@/lib/social/flag";

export const metadata: Metadata = { title: "Feed settings" };

/**
 * The directory of places.
 *
 * This screen used to BE `/around`, and that was the fault the owner named: the
 * bottom navigation said Around and handed back a list of rooms rather than the
 * conversation happening in them. A directory is a thing you use twice, when
 * you arrive and when you move house. A feed is a thing you use every day. The
 * everyday one now owns the tab and this one sits one control behind it.
 *
 * Nothing about the directory itself changed in the move. The country comes
 * first: every one of Nigeria's 36 states and the FCT is a container, every one
 * of the 774 local governments is a container behind it, and tapping one puts
 * you inside it whether or not anybody has been there before. Underneath it,
 * the places you are in, then everything open, busiest first, because a
 * directory sorted by newest sends the first visitor to the emptiest room.
 *
 * Signed out this renders in full rather than behind a wall: the gate belongs
 * in front of value, not in front of the front door. Opening a place nobody has
 * been in is a write and asks for an account at the moment it matters; walking
 * into one that is already open never does.
 *
 * The route is a static segment under `/around`, so Next resolves it before
 * `/around/[slug]`. A place whose slug were literally "manage" would be
 * shadowed by this page; `slugifyArea` builds every slug as `city-name`, so
 * that collision cannot arise from the propose form, and the admin who could
 * hand-write one would be doing it deliberately.
 */
export default async function AroundManagePage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string | string[] }>;
}) {
  if (!(await isSocialEnabled())) return <SocialPaused />;

  const [params, locale, session, open, mine, proposals, tree, openLgas] = await Promise.all([
    searchParams,
    getLocale(),
    resolveSession(),
    listOpenAreas(),
    listMyAreas(),
    listMyProposals(),
    getPlaceTree(),
    listOpenLgaPlaces(),
  ]);

  const t = getDictionary(locale);

  const rawState = Array.isArray(params.state) ? params.state[0] : params.state;
  const initialStateCode =
    typeof rawState === "string" && /^[A-Za-z]{2}$/.test(rawState)
      ? rawState.toUpperCase()
      : null;

  const signedIn = session.state === "signed-in";
  const unconfigured = session.state === "unconfigured";
  const mineIds = new Set(mine.map((area) => area.id));
  const others = open.filter((area) => !mineIds.has(area.id));
  const openProposals = proposals.filter((p) => p.status === "PROPOSED");
  const answered = proposals.filter((p) => p.status === "REJECTED");

  return (
    <div
      className="mx-auto w-full max-w-3xl pt-md"
      style={{ paddingBottom: "var(--nf-tabbar-clearance)" }}
      data-testid="around-settings"
    >
      {/* No subtitle. `PageHeader` clamps one to two lines, and at 390px the
          title itself already wraps to two, so a second line under it came back
          ellipsised. The sentence below the header says the same thing with
          room to say it. */}
      <PageHeader
        title={t.social.manage}
        fallback="/around"
        actions={
          <ButtonLink href="/around/new" variant="secondary" size="sm" leadingIcon="sparkle">
            Suggest a place
          </ButtonLink>
        }
      />

      <p className="mb-md text-[length:var(--nf-text-body-sm)] leading-relaxed text-[var(--nf-content-muted)]">
        {AREA_COPY.what}
      </p>

      {/* Places are one half of Around and people are the other, and until this
          line existed the second half had no front door at all: a handle was
          reachable only if you already knew it. */}
      <Link
        href="/u"
        className="mb-lg inline-flex items-center gap-xs text-[length:var(--nf-text-body-sm)] font-semibold text-[var(--nf-brand-secondary)]"
      >
        <UiIcon name="user" size={15} />
        Find people
      </Link>

      {/* One sentence, not two. Without keys the country cannot be read at all,
          so the picker would say the same thing in different words directly
          underneath this card, and a screen that apologises twice for one fact
          reads as a screen nobody looked at. */}
      {unconfigured ? (
        <p
          className="nf-panel nf-panel--card mb-lg block text-[length:var(--nf-text-body-sm)] leading-relaxed text-[var(--nf-content-secondary)]"
          /* Named so a spec can tell the two honest answers apart: the picker
             itself, or this sentence in its place. Without the hook a run with
             no keys looks identical to a run where the picker silently went
             missing. */
          data-testid="around-settings-unconfigured"
        >
          {AROUND_UNCONFIGURED.settingsBody}
        </p>
      ) : (
        <PlacePicker
          tree={tree}
          open={openLgas}
          signedIn={signedIn}
          initialStateCode={initialStateCode}
        />
      )}

      <ProposalsWaiting proposals={openProposals} />

      <ProposalsAnswered proposals={answered} />

      <section className="mb-xl">
        <h2 className="mb-sm nf-section-label">
          Your places
        </h2>
        {mine.length > 0 ? (
          <ul className="flex flex-col gap-xs">
            {mine.map((area) => (
              <AreaRow key={area.id} area={area} joined signedIn={signedIn} locale={locale} />
            ))}
          </ul>
        ) : (
          <p className="nf-panel nf-panel--card block text-[length:var(--nf-text-body-sm)] leading-relaxed text-[var(--nf-content-muted)]">
            {signedIn ? AREA_COPY.joinedNone : "Sign in to keep your places here."}
          </p>
        )}
      </section>

      <section>
        <h2 className="mb-sm nf-section-label">
          Open places
        </h2>
        {others.length > 0 ? (
          <ul className="flex flex-col gap-xs">
            {others.map((area) => (
              <AreaRow key={area.id} area={area} joined={false} signedIn={signedIn} locale={locale} />
            ))}
          </ul>
        ) : (
          <div className="nf-panel nf-panel--card items-center p-lg text-center">
            <p className="text-[length:var(--nf-text-body-sm)] leading-relaxed text-[var(--nf-content-muted)]">
              {open.length > 0
                ? "You are in every place that is open so far."
                : AREA_COPY.noneOpenYet}
            </p>
            <ButtonLink href="/around/new" variant="primary" size="sm" className="mt-md">
              Suggest a place
            </ButtonLink>
          </div>
        )}
      </section>

      {/* The dock travels with the social layer and was on this screen when it
          was `/around`. No place is known from here, so Drop gist opens with
          the picker. */}
      <AroundFab />
    </div>
  );
}

export const dynamic = "force-dynamic";

// Kept so a future reader does not have to work out why the list is not cached:
// membership is per viewer and the whole page changes shape when you join, so
// caching it would show one person another person's shelf.
export type { AreaStatus };
