import type { Dictionary, Locale } from "@vallo/i18n";
import { Amount } from "@/components/ui/Amount";
import { ActionBar } from "@/components/ui/ActionBar";
import { ButtonLink } from "@/components/ui/Button";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { ListingGallery } from "@/components/app/listing/ListingGallery";
import { FactGrid, ICON, Section, Stack, Surface, TYPE, type Fact } from "@/components/app/Screen";
import { RoomTypes } from "./RoomTypes";
import { stayFromMinor, type StayDetail } from "./detail-model";

/**
 * THE STAY, AS A SHOWCASE.
 *
 * Gallery edge to edge, exactly as the listing page draws it: `AppShell`
 * already treats `/stay/[id]` as an edge-to-edge route, so the hero meets
 * the screen with no gutter and the page's own padding starts underneath it.
 *
 * THE TOTAL IS THE HEADLINE. Not the nightly rate with the total in small
 * print underneath, which is the pattern that makes a person arrive at
 * checkout with a different number in their head to the one on the button.
 * Where dates are chosen the headline is what this stay costs, all in; where
 * they are not, the headline says so and offers the dates, because a total
 * with no dates behind it would be an invention.
 *
 * The policy is the policy's own sentence, from its `summary` column, shown
 * verbatim. The rooms are rows. The bar at the bottom carries the from-price
 * and the way in, and it never leaves the screen.
 */

type StaysCopy = Dictionary["stayDetail"];

export function StayDetailView({
  detail,
  nights,
  checkIn,
  checkOut,
  guests,
  locale,
  copy,
  datesHref,
  reserveHref,
}: {
  detail: StayDetail;
  nights: number | null;
  checkIn?: string;
  checkOut?: string;
  guests: number;
  locale: Locale;
  copy: StaysCopy;
  /** Back to the stays search, dates and guests carried. */
  datesHref: string;
  reserveHref: (roomTypeId: string, ratePlanId: string) => string;
}) {
  const from = stayFromMinor(detail, nights);
  const total = from !== null && nights !== null ? from * nights : null;
  const where = [detail.area, detail.city].filter(Boolean).join(", ");

  const facts: Fact[] = [
    ...(detail.checkInFrom
      ? [{ label: copy.checkIn, value: detail.checkInFrom.slice(0, 5), icon: "key" as const }]
      : []),
    ...(detail.checkOutBy
      ? [{ label: copy.checkOut, value: detail.checkOutBy.slice(0, 5), icon: "history" as const }]
      : []),
    ...(detail.starRating
      ? [{ label: copy.rating, value: `${detail.starRating}`, icon: "star" as const }]
      : []),
  ];

  return (
    <div>
      <ListingGallery
        listingId={detail.id}
        title={detail.name}
        hue={0}
        kind="hotel"
        photos={detail.photos.map((photo) => photo.url)}
        backFallback="/stays"
      />

      {/* The bar is fixed, so the page reserves its height rather than letting
          it sit over the last section. */}
      <div className="mx-auto max-w-2xl px-gutter pb-[calc(var(--nf-action-bar-height,4.5rem)+var(--spacing-block))] pt-block">
        <h1 className="nf-h1 [text-wrap:balance]">{detail.name}</h1>
        {where && (
          <p className={`mt-inline-tight flex items-center gap-inline-tight ${TYPE.body}`}>
            <UiIcon name="location" size={ICON.inline} className="shrink-0" />
            {where}
          </p>
        )}

        {/* ------------------------------------------------ the headline */}
        <Surface className="mt-block">
          {total !== null && nights !== null ? (
            <>
              <p className={TYPE.label}>
                {copy.totalFor.replace("{count}", String(nights))}
              </p>
              <p className="nf-numeric mt-inline-tight">
                <Amount
                  minorUnits={total}
                  locale={locale}
                  showFraction
                  className="nf-h0 tracking-tight text-[var(--nf-content-primary)]"
                />
              </p>
              <p className={`mt-inline ${TYPE.rowMeta}`}>
                {copy.everythingIncluded}
              </p>
              <p className={`mt-row ${TYPE.rowMeta}`}>
                {checkIn && checkOut ? `${checkIn} → ${checkOut} · ` : ""}
                {copy.guests.replace("{count}", String(guests))}
                {" · "}
                <a
                  href={datesHref}
                  className="font-semibold text-[var(--nf-content-link)] underline-offset-4 hover:underline"
                >
                  {copy.changeDates}
                </a>
              </p>
            </>
          ) : (
            <>
              <p className={TYPE.sectionTitle}>{copy.pickDatesTitle}</p>
              <p className={`mt-inline ${TYPE.body}`}>{copy.pickDatesBody}</p>
              <ButtonLink href={datesHref} variant="primary" className="mt-row">
                {copy.pickDates}
              </ButtonLink>
            </>
          )}
        </Surface>

        <Stack className="mt-block">
          {detail.description && (
            <Section title={copy.aboutTitle}>
              <p className={`${TYPE.body} leading-relaxed [overflow-wrap:anywhere]`}>
                {detail.description}
              </p>
            </Section>
          )}

          <Section id="rooms" title={copy.roomsTitle} description={copy.roomsDescription} className="scroll-mt-28">
            {detail.roomTypes.length > 0 ? (
              <RoomTypes
                detail={detail}
                guests={guests}
                nights={nights}
                locale={locale}
                copy={copy}
                reserveHref={reserveHref}
              />
            ) : (
              <p className={TYPE.rowMeta}>{copy.noRoomsYet}</p>
            )}
          </Section>

          {facts.length > 0 && (
            <Section title={copy.theDetails}>
              <FactGrid facts={facts} />
            </Section>
          )}

          {detail.amenities.length > 0 && (
            <Section title={copy.amenitiesTitle}>
              <ul className="grid grid-cols-2 gap-y-row sm:grid-cols-3">
                {detail.amenities.map((amenity) => (
                  <li key={amenity} className={`flex items-center gap-inline-tight ${TYPE.body}`}>
                    <UiIcon name="verified" size={ICON.inline} className="shrink-0" />
                    {amenity}
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {/* The policy, in its own words. A refund rule this screen rewrote
              is a refund rule nobody can be held to. */}
          {detail.policy && (
            <Section title={copy.policyTitle}>
              <Surface>
                <p className={TYPE.rowTitle}>{detail.policy.name}</p>
                <p className={`mt-inline ${TYPE.body} leading-relaxed`}>{detail.policy.summary}</p>
                {detail.policy.freeUntilHours !== null && (
                  <p className={`mt-row flex items-start gap-inline-tight ${TYPE.rowMeta}`}>
                    <UiIcon
                      name="verified"
                      size={ICON.inline}
                      className="mt-3xs shrink-0 text-[var(--nf-state-success)]"
                    />
                    <span className="min-w-0">
                      {copy.freeUntil.replace("{hours}", String(detail.policy.freeUntilHours))}
                    </span>
                  </p>
                )}
              </Surface>
            </Section>
          )}

          {detail.houseRules && (
            <Section title={copy.houseRulesTitle}>
              <p className={`${TYPE.body} leading-relaxed`}>{detail.houseRules}</p>
            </Section>
          )}
        </Stack>
      </div>

      <ActionBar aboveTabBar>
        <div className="min-w-0 flex-1">
          {from !== null ? (
            <>
              <p className={TYPE.label}>{total !== null ? copy.totalLabel : copy.from}</p>
              <p className="nf-numeric nf-body font-semibold text-[var(--nf-content-primary)]">
                <Amount minorUnits={total ?? from} locale={locale} />
                {total === null && <span className={TYPE.caption}> {copy.perNight}</span>}
              </p>
            </>
          ) : (
            <p className={TYPE.rowMeta}>{copy.noRate}</p>
          )}
        </div>
        <ButtonLink href="#rooms" variant="primary" size="lg" className="shrink-0">
          {copy.seeRooms}
        </ButtonLink>
      </ActionBar>
    </div>
  );
}
