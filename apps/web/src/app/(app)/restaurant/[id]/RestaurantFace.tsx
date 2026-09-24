import type { ComponentProps } from "react";
import Link from "next/link";
import type { Dictionary, Locale } from "@vallo/i18n";
import { Amount } from "@/components/ui/Amount";
import { ButtonLink } from "@/components/ui/Button";
import { UiIcon, type UiIconName } from "@/design-system/icons/UiIcon";
import { ListingGallery } from "@/components/app/listing/ListingGallery";
import {
  DetailAboutCard,
  DetailCapsules,
  DetailPriceRow,
  DetailSpecStrip,
  type SpecPair,
} from "@/components/app/listing/DetailAnatomy";
import { ICON, Section, Stack, Surface, TYPE } from "@/components/app/Screen";
import { ReserveTable } from "../../listing/[id]/ReserveTable";
import { panelClass } from "@/components/ui/Panel";
import { ReportSheet } from "@/components/app/ReportSheet";
import { ExampleNotice } from "@/components/app/listing/ExampleNotice";

const WEEKDAY: Record<number, string> = {
  0: "Sunday",
  1: "Monday",
  2: "Tuesday",
  3: "Wednesday",
  4: "Thursday",
  5: "Friday",
  6: "Saturday",
};

export type RestaurantFaceProps = {
  locale: Locale;
  t: Dictionary;
  /** The gallery exactly as the route mounts it (photos, plates, heart). */
  gallery: ComponentProps<typeof ListingGallery>;
  title: string;
  /** "Area, City", or empty when the venue gave neither. */
  where: string;
  /** The open-now line `lib/stays/hours` computes, or null with no windows. */
  hours: { openNow: boolean; label: string } | null;
  specPairs: SpecPair[];
  /** A stated price per head; null for a venue that states none. */
  price: { minor: number; currency: string } | null;
  rating: { average: string; reviews: string } | null;
  capsules: { key: string; icon: UiIconName; label: string }[];
  aboutParagraphs: string[];
  host: ComponentProps<typeof DetailAboutCard>["host"];
  reserve: ComponentProps<typeof ReserveTable>;
  /** The venue's service windows, `HH:MM` or `HH:MM:SS`; null when unread. */
  windows: { id: string; weekday: number; opens: string; closes: string }[] | null;
  messageHref: string | null;
  /** The report control for this venue (STORE-P2-01): a catalogue listing is
      reported as a listing, an onboarded venue as a business. Absent in a
      static preview. */
  report?: { targetType: "listing" | "business"; targetId: string; signedIn: boolean };
  /** UX-09 / UI-P2-01: an example venue says so under its name, and offers no
      table to hold. */
  isExample?: boolean;
};

/**
 * THE RESTAURANT FACE, LIFTED OUT OF THE ROUTE SO ITS PROOF IS THE ROUTE.
 *
 * `/restaurant/[id]` reads two kinds of venue and flattens them into the props
 * below; everything it then draws lives here. The sweep's fixture harness
 * (`(dev)/preview/session-b/sweep-stays/restaurant`) mounts this same
 * component with fixture props, so the committed proof cannot drift from the
 * route again. It used to re-export an older harness that wrote its own lead
 * card on the pre-sweep 22px glass (the second audit's S-B).
 *
 * The anatomy is B047A0CE's third face of the one detail anatomy: the lit lead
 * card over the photograph, the bordered spec strip, the blue figure with its
 * unit and rating, the capsule row and the About card with its host row. What
 * differs is the foot: a restaurant's decision is a table, so the reservation
 * opens the run under the card and the week's hours close the page.
 */
export function RestaurantFace({
  locale,
  t,
  gallery,
  title,
  where,
  hours,
  specPairs,
  price,
  rating,
  capsules,
  aboutParagraphs,
  host,
  reserve,
  windows,
  messageHref,
  report,
  isExample = false,
}: RestaurantFaceProps) {
  const copy = t.restaurantPage;
  return (
    <div className="nf-cat-surface">
      <ListingGallery {...gallery} />

      <div className="mx-auto max-w-2xl px-gutter pb-section">
        <div className={panelClass({ variant: "card", className: "nf-detail-lead relative z-10 -mt-xl block sm:-mt-2xl" })}>
          <div className="flex flex-wrap items-center gap-xs empty:hidden">
            {hours && (
              <span className={`nf-reg-open ${hours.openNow ? "nf-reg-open--open" : "nf-reg-open--closed"}`} data-testid="open-now">
                <UiIcon name="history" size={12} />
                {hours.label}
              </span>
            )}
          </div>
          <h1 className="nf-h2 mt-row [text-wrap:balance]">{title}</h1>
          {isExample && <ExampleNotice variant="page" className="mt-row" statement={t.examples.statement} />}
          {where && (
            <p className={`mt-inline-tight flex items-center gap-inline-tight ${TYPE.body}`}>
              <UiIcon name="location" size={ICON.inline} className="shrink-0 text-[var(--nf-brand-secondary)]" />
              {where}
            </p>
          )}

          <DetailSpecStrip pairs={specPairs} />

          {price && price.minor > 0 && (
            <DetailPriceRow
              figure={<Amount minorUnits={price.minor} locale={locale} currency={price.currency} />}
              unit={copy.perHead}
              /* Real rows only: the rating is averaged from `reviews`, so this
                 is absent until somebody has actually reviewed the venue. */
              rating={rating}
            />
          )}

          <DetailCapsules items={capsules} label={t.catalogue.detail.amenities} />
        </div>

        <div className="mt-block">
          <DetailAboutCard title={copy.aboutTitle} paragraphs={aboutParagraphs} host={host} />
        </div>

        <Stack className="mt-block">
          {/* THE RESERVATION, FIRST. Not a panel beside the description. */}
          {isExample ? (
            <Section title={copy.reserveTitle}>
              <Surface>
                <p className={TYPE.rowMeta} data-testid="restaurant-not-bookable">
                  {t.examples.restaurantNotBookable}
                </p>
                <ButtonLink href="/restaurants" variant="primary" className="mt-row w-full">
                  {t.examples.browseRestaurants}
                </ButtonLink>
              </Surface>
            </Section>
          ) : (
            <Section title={copy.reserveTitle} description={copy.reserveBody}>
              <ReserveTable {...reserve} />
            </Section>
          )}

          <Section title={copy.gettingThereTitle}>
            <Surface>
              {where && (
                <p className={`flex items-start gap-inline-tight ${TYPE.body}`}>
                  <UiIcon name="location" size={ICON.inline} className="mt-3xs shrink-0" />
                  <span className="min-w-0">{where}</span>
                </p>
              )}
              <p className={`mt-row ${TYPE.rowMeta}`}>{copy.threadLine}</p>
              <Link
                href="/restaurants"
                className={`mt-row inline-flex items-center gap-inline-tight ${TYPE.rowMeta} font-semibold text-[var(--nf-content-link)] underline-offset-4 hover:underline`}
              >
                {t.stays.restaurantsTitle}
                <UiIcon name="arrow-right" size={ICON.inline} />
              </Link>
            </Surface>
          </Section>

          {/*
            THE HOURS, AS THE FOOT OF THE PAGE.

            `lib/stays/hours` answers "is it seating right now" on the Lagos
            clock from the venue's own service windows, and that one line is
            the last thing this page says, under the week it is computed from.
            A venue that has published no windows says so plainly: not "coming
            soon", not an empty week grid, and above all not an "Open now" pill
            this page cannot stand behind, because a guessed badge sends
            somebody across Lagos to a locked door.
          */}
          <Section title={copy.hoursTitle}>
            <Surface>
              {hours && (
                <p
                  className={`nf-reg-open ${hours.openNow ? "nf-reg-open--open" : "nf-reg-open--closed"} mb-row`}
                  data-testid="hours-open-now"
                >
                  <UiIcon name="history" size={12} />
                  {hours.label}
                </p>
              )}
              {windows && windows.length > 0 ? (
                <ul className="divide-y divide-[var(--nf-divider)]" data-testid="service-windows">
                  {windows.map((window) => (
                    <li key={window.id} className={`flex items-center justify-between gap-sm py-xs ${TYPE.body}`}>
                      <span className="font-medium text-[var(--nf-content-primary)]">{WEEKDAY[window.weekday] ?? window.weekday}</span>
                      <span className="nf-numeric">
                        {window.opens.slice(0, 5)} to {window.closes.slice(0, 5)}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <>
                  <p className={TYPE.body}>{copy.hoursUnknown}</p>
                  <p className={`mt-row ${TYPE.rowMeta}`}>{copy.hoursAsk}</p>
                </>
              )}
              {messageHref && (
                <ButtonLink href={messageHref} variant="secondary" className="mt-row">
                  {copy.message}
                </ButtonLink>
              )}
            </Surface>
          </Section>

          {report && (
            <div className="py-md" data-testid="restaurant-report">
              <ReportSheet
                targetType={report.targetType}
                targetId={report.targetId}
                targetLabel={title}
                signedIn={report.signedIn}
              />
            </div>
          )}
        </Stack>
      </div>
    </div>
  );
}
