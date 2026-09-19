import type { Metadata } from "next";
import Link from "next/link";
import { getDictionary } from "@vallo/i18n";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { getLocale } from "@/lib/locale";
import { getMyBookings } from "@/lib/bookings/queries";
import { PageHeader } from "@/components/app/PageHeader";
import { PageScene } from "@/components/app/PageScene";
import { MyBookings } from "./MyBookings";
import { BrandIcon, type BrandIconName } from "@/design-system/icons/BrandIcon";
import { Reveal } from "@/components/site/Reveal";
import { readInspectionsForRequester } from "@/lib/inspections/queries";
import { InspectionRows } from "@/components/app/inspections/InspectionRows";
import { EmptyActions } from "@/components/app/EmptyActions";
import { EmptyState, Row, RowList, Section, TYPE } from "@/components/app/Screen";

export const metadata: Metadata = { title: "Bookings" };

/**
 * Bookings.
 *
 * The trips hub: the account's real stays, grouped by status with cancellation
 * wired to the state machine, then a short strip explaining how booking works
 * so a first-time guest knows what to expect before they commit.
 *
 * ---------------------------------------------------------------------------
 * THE THIRD STATE WAS DEAD CODE THAT MANUFACTURED MONEY, AND IT IS GONE.
 *
 * This page had a fourth branch that assembled three stays out of catalogue
 * listings - `seed-2`, `seed-16`, `seed-7` - and handed each one a
 * `status: "confirmed"`, a nights count, a guest count and a naira total in
 * kobo. Real photography, a real Lagos locality and an invented booking on top
 * of them, which is the most believable false statement this product was
 * capable of making: a confirmed reservation is a claim that money has changed
 * hands.
 *
 * It was also unreachable. `getMyBookings` returns null in exactly one case,
 * which is a viewer who is not signed in, and `bookings` is in
 * `PRODUCT_SEGMENTS` in `middleware.ts`, so a signed-out visitor is sent to
 * `/sign-in` before this file runs. The branch's own comment said it "draws the
 * example stays that explain what this screen is for", which described a real
 * state once and stopped being true when the middleware rule landed. The one
 * remaining way to reach it is an environment where auth is not configured,
 * which is precisely the situation where inventing confirmed bookings with
 * totals is least defensible.
 *
 * It is answered honestly now: no session, no trips, so the screen says so and
 * offers the door rather than a specimen. That is the same answer the wallet
 * gives a signed-out reader about a balance, and for the same reason.
 *
 * `buildBookings`, `BOOKED_IDS`, `getBookedStays` and the catalogue read behind
 * them are gone with it, and so is the second billed search this page ran on
 * every visit to fill a list nobody could see.
 *
 * THE `unavailable` BRANCH IS UNTOUCHED AND MUST STAY THAT WAY. A read that
 * failed draws neither real trips nor examples, because both would be a lie:
 * "you have none" about an account that may have several, or a set of stays
 * that are not theirs.
 */
export default async function BookingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const locale = await getLocale();
  const t = getDictionary(locale);
  /* Every word on this screen, in the reader's language. It shipped as English
     literals in the markup; see the note in `MyBookings`. */
  const copy = t.catalogue.bookings;
  const params = await searchParams;
  const justBookedRaw = params.justBooked;
  const justBooked = typeof justBookedRaw === "string" ? justBookedRaw : undefined;

  const loaded = await getMyBookings(locale);
  /*
   * Three states, and each one says a different true thing. Signed in draws
   * real trips. No session draws the door. A read that FAILED draws neither,
   * because both of the others would be a lie: "you have none" about an account
   * that may have several, or a set of stays that are not theirs.
   */
  const unavailable = loaded === "unavailable";
  const groups = unavailable ? null : loaded;

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
    { icon: "calendar-check", title: copy.step1Title, body: copy.step1Body },
    { icon: "shield-lock", title: copy.step2Title, body: copy.step2Body },
    { icon: "luggage-check", title: copy.step3Title, body: copy.step3Body },
  ];

  return (
    <div className="nf-cat-surface mx-auto max-w-2xl">
      <div className="relative">
        <PageScene art="calendar-check" />
      <PageHeader title={t.nav.bookings} />
      </div>

      {inspections.inspections.length > 0 && (
        <Reveal className="mb-block">
          <Section
            title={copy.inspectionsTitle}
            description={copy.inspectionsBody}
          >
            <InspectionRows
              inspections={inspections.inspections}
              side="requester"
              locale={locale}
            />
          </Section>
        </Reveal>
      )}

      {/*
        THE OUTER CARD IS GONE, AND IT WAS BREAKING THE ONE HARD RULE.

        Everything below was wrapped in an `nf-card p-4 sm:p-5`, and every stay
        `MyBookings` renders inside it is itself an `nf-card`. A raised surface
        holding raised surfaces is the single rule the surface language has no
        exceptions to, and the effect on screen was exactly what the rule
        predicts: a bordered, blurred box with three more bordered, blurred
        boxes inside it, so the eye had to work out which edge meant what. The
        stays are the objects. The page is the ground they sit on.
      */}
      <Reveal>
        {unavailable ? (
          <div className="py-heading text-center" data-testid="bookings-unavailable">
            <p className={TYPE.rowTitle}>{copy.unavailableTitle}</p>
            <p className={`mx-auto mt-row max-w-sm ${TYPE.body}`}>{copy.unavailableBody}</p>
          </div>
        ) : groups ? (
          <MyBookings groups={groups} locale={locale} justBookedId={justBooked} />
        ) : (
          /*
            NO SESSION. Reachable only where auth is not configured, because the
            middleware sends a signed-out visitor to /sign-in before this file
            runs. It used to be three invented confirmed bookings with naira
            totals; it is the door now, which is the only honest thing a trips
            hub can say to somebody it cannot identify. "Trips" is a banned
            synonym for Stay in `PRODUCT.md` section 7 and it was in eleven
            user-facing strings; the vocabulary exists so the product sounds
            like one product.
          */
          <EmptyState
            icon="calendar-check"
            title={copy.signedOutTitle}
            body={copy.signedOutBody}
            action={
              <EmptyActions
                primary={{ label: copy.signIn, href: "/sign-in" }}
                secondary={{ label: copy.findStay, href: "/search" }}
              />
            }
            data-testid="bookings-signed-out"
          />
        )}
      </Reveal>

      {/*
        WHERE THE OTHER HALF OF THE RECORD IS (R3 finding F-08).

        /bookings and /trips read the same account and were drawing the same
        stays under two names with neither screen complete. The split, written
        down here and in the report: THIS screen is the RECORD, what the
        account has committed to and what is owed on it, which is why the
        tenancies and the inspections lead it; /trips is the same commitments
        on a DATE SPINE, which is the question "what is next" rather than
        "what do I have". Each says the other exists in one sentence rather
        than a second navigation block, so neither is a dead end and nobody
        has to guess which screen holds their table.
      */}
      <Reveal delay={80}>
        <p
          data-testid="bookings-cross-link"
          className={`mt-block flex flex-wrap items-center gap-inline ${TYPE.rowMeta}`}
        >
          <span>{copy.alsoOnTrips}</span>
          <Link
            href="/trips"
            className="inline-flex items-center gap-2xs font-semibold text-[var(--nf-content-link)] underline-offset-4 hover:underline"
          >
            {copy.openTrips}
            <UiIcon name="arrow-right" size={16} />
          </Link>
        </p>
      </Reveal>

      <Reveal delay={100}>
        {/* THREE CARDS BECAME THREE ROWS. Three steps of one process drawn as
            three bordered boxes is three objects where there is one sequence;
            one surface with hairlines between says "these belong together and
            they are in this order", which is the thing the reader needs. */}
        <h2 className="nf-group-label mt-block">{copy.howTitle}</h2>
        <RowList boxed>
          {steps.map((s) => (
            <Row key={s.title} className="items-start">
              <span className="block h-11 w-11 shrink-0">
                <BrandIcon name={s.icon} fill />
              </span>
              <span className="min-w-0 leading-tight">
                <span className={`block ${TYPE.rowTitle}`}>{s.title}</span>
                <span className={`mt-inline-tight block ${TYPE.rowMeta}`}>{s.body}</span>
              </span>
            </Row>
          ))}
        </RowList>
      </Reveal>
    </div>
  );
}
