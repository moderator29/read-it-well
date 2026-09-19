import Image from "next/image";
import Link from "next/link";
import type { Dictionary, Locale } from "@vallo/i18n";
import { Amount } from "@/components/ui/Amount";
import { ActionBar } from "@/components/ui/ActionBar";
import { ButtonLink } from "@/components/ui/Button";
import { UiIcon, type UiIconName } from "@/design-system/icons/UiIcon";
import { BrandIcon, type BrandIconName } from "@/design-system/icons/BrandIcon";
import { ListingGallery } from "@/components/app/listing/ListingGallery";
import { MediaFrame } from "@/components/app/MediaFrame";
import { ICON, Section, Stack, TYPE } from "@/components/app/Screen";
import { RoomTypes, type ReserveBase } from "./RoomTypes";
import { ROOM_CATEGORY_KEY, roomFromMinor, stayFromMinor, type StayDetail } from "./detail-model";

type StaysCopy = Dictionary["stayDetail"];

const STAR_LABEL: Record<number, string> = { 1: "1 star", 2: "2 star", 3: "3 star", 4: "4 star", 5: "5 star" };

const BUSINESS_OBJECT: Record<string, BrandIconName> = {
  hotel: "hotel",
  serviced_apartments: "serviced-apartment",
  guest_house: "bungalow",
  resort: "beach-house",
  shortlet_operator: "shortlet",
};

const BUSINESS_LABEL: Record<string, string> = {
  hotel: "Hotel",
  serviced_apartments: "Serviced apartment",
  guest_house: "Guest house",
  resort: "Resort",
  shortlet_operator: "Shortlet",
};

/**
 * The glyph for an amenity the read names in words ("Air conditioning",
 * "Wi-Fi"). BB0C2C85 draws each tile with its own glyph; the label is
 * matched by its words, and anything unrecognised takes the shield, which is
 * honest for a fact the property stated.
 */
const AMENITY_GLYPHS: [RegExp, UiIconName][] = [
  [/wi-?fi|internet/i, "wifi"],
  [/air|a\/c|cool/i, "sparkle"],
  [/kitchen|cook/i, "kitchen"],
  [/park/i, "parking"],
  [/pool|swim/i, "pool"],
  [/breakfast|restaurant|dining|meal/i, "utensils"],
  [/gym|fitness|power|generator|electric/i, "bolt"],
  [/tv|television|screen/i, "picture"],
  [/bed|room service|linen/i, "bed"],
  [/bath|shower|tub/i, "bath"],
  [/balcon|terrace|view/i, "building-apartment"],
  [/desk|work/i, "document"],
  [/laundry|clean/i, "sparkle"],
];

export function amenityGlyph(label: string): UiIconName {
  for (const [pattern, icon] of AMENITY_GLYPHS) if (pattern.test(label)) return icon;
  return "verified";
}

function dateLabel(iso: string | undefined, locale: Locale): string | null {
  if (!iso) return null;
  const parsed = new Date(`${iso}T12:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return null;
  return new Intl.DateTimeFormat(locale === "en" ? "en-GB" : undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(parsed);
}

/**
 * The stay detail, to BB0C2C85 and 84054CE9.
 *
 * The photo hero, the name with the nightly figure beside it, the check-in,
 * check-out and guests row (each a link back to the date picker, since the
 * dates ride the URL), the amenity tiles, About, the Property Type card,
 * the room tiles, and Book This Stay to the rooms whose rates carry the
 * real first-party checkout. A rating appears only with reviews behind it,
 * and this read carries none, so none is drawn.
 */
export function StayDetailView({
  detail,
  nights,
  checkIn,
  checkOut,
  guests,
  locale,
  copy,
  t,
  datesHref,
  reserve,
}: {
  detail: StayDetail;
  nights: number | null;
  checkIn?: string;
  checkOut?: string;
  guests: number;
  locale: Locale;
  copy: StaysCopy;
  t: Dictionary;
  datesHref: string;
  reserve: ReserveBase;
}) {
  const from = stayFromMinor(detail, nights);
  const total = from !== null && nights !== null ? from * nights : null;
  const where = [detail.area, detail.city].filter(Boolean).join(", ");
  const catalogue = t.catalogue.stays;
  const businessKind = detail.businessKind ?? "hotel";

  return (
    <div>
      <ListingGallery
        listingId={detail.id}
        title={detail.name}
        hue={0}
        kind="hotel"
        photos={detail.photos.map((photo) => photo.url)}
        backFallback="/stays"
        mark={{ label: catalogue.title, icon: "bed" }}
      />

      <div className="mx-auto max-w-2xl pb-[calc(var(--nf-action-bar-height,4.5rem)+var(--spacing-block))]">
        {/* ------------------------------------------------ the headline
            The render's order: the name, the place, then the figure on its
            own line with the stars beside it. It used to put the figure in
            the title's right-hand column, which on a phone squeezed a long
            property name into half the width. The card is lit glass and it
            overlaps the photograph, as every lead card on this platform
            now does. */}
        <div className="nf-glass nf-glass--card nf-detail-lead relative z-10 -mt-xl sm:-mt-2xl">
          <h1 className="nf-h2 [text-wrap:balance]">{detail.name}</h1>
          {where && (
            <p className={`mt-inline-tight flex items-center gap-inline-tight ${TYPE.body}`}>
              <UiIcon name="location" size={ICON.inline} className="shrink-0 text-[var(--nf-brand-secondary)]" />
              {where}
            </p>
          )}
          <div className="nf-stay-price-row mt-md">
            {from !== null ? (
              <p className="nf-stay-card__price" data-testid="stay-from">
                <Amount
                  minorUnits={from}
                  locale={locale}
                  secondaryClassName="text-[0.6em] font-semibold opacity-70"
                />
                <span className="nf-stay-card__per">{catalogue.perNight}</span>
              </p>
            ) : (
              <p className={`shrink-0 ${TYPE.rowMeta}`}>{copy.noRate}</p>
            )}
            {/* The class the property carries, from its own record. A guest
                rating is never drawn here: this read carries no reviews, and
                an invented count is the one thing a stars row must not be. */}
            {detail.starRating && (
              <p className="nf-stay-card__rating">
                <UiIcon name="star" size={14} filled />
                {STAR_LABEL[detail.starRating] ?? `${detail.starRating} star`}
              </p>
            )}
          </div>
        </div>

        {/* --------------------------------------- dates and the party */}
        <div className="nf-stay-facts mt-md" data-testid="stay-dates-row">
          <Link href={datesHref} className="nf-stay-fact">
            <UiIcon name="calendar-booking" size={ICON.inline} />
            <span className="min-w-0">
              <span className="nf-stay-fact__label">{catalogue.checkIn}</span>
              <span className="nf-stay-fact__value">{dateLabel(checkIn, locale) ?? catalogue.pickDate}</span>
            </span>
            <UiIcon name="chevron-right" size={16} />
          </Link>
          <Link href={datesHref} className="nf-stay-fact">
            <UiIcon name="calendar-booking" size={ICON.inline} />
            <span className="min-w-0">
              <span className="nf-stay-fact__label">{catalogue.checkOut}</span>
              <span className="nf-stay-fact__value">{dateLabel(checkOut, locale) ?? catalogue.pickDate}</span>
            </span>
            <UiIcon name="chevron-right" size={16} />
          </Link>
          <Link href={datesHref} className="nf-stay-fact">
            <UiIcon name="user" size={ICON.inline} />
            <span className="min-w-0">
              <span className="nf-stay-fact__label">{catalogue.guests}</span>
              <span className="nf-stay-fact__value">{copy.guests.replace("{count}", String(guests))}</span>
            </span>
            <UiIcon name="chevron-right" size={16} />
          </Link>
          {total !== null && nights !== null && (
            <div className="nf-stay-fact">
              <UiIcon name="wallet" size={ICON.inline} />
              <span className="min-w-0">
                <span className="nf-stay-fact__label">{copy.totalFor.replace("{count}", String(nights))}</span>
                <span className="nf-stay-fact__value nf-numeric">
                  <Amount minorUnits={total} locale={locale} />
                </span>
              </span>
            </div>
          )}
        </div>

        <Stack className="mt-block">
          {/* ------------------------------------------------ amenities */}
          {detail.amenities.length > 0 && (
            <Section title={t.catalogue.detail.amenities}>
              <ul className="nf-amenity-grid" data-testid="stay-amenities">
                {detail.amenities.map((amenity) => (
                  <li key={amenity} className="nf-glass nf-glass--tile nf-amenity-tile">
                    <UiIcon name={amenityGlyph(amenity)} size={ICON.inline} />
                    <span>{amenity}</span>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {/* ---------------------------------------------------- about */}
          {detail.description && (
            <Section title={catalogue.aboutThisStay}>
              <div className="nf-detail-panel">
                <p className={`${TYPE.body} leading-relaxed [overflow-wrap:anywhere]`}>{detail.description}</p>
              </div>
            </Section>
          )}

          {/* ---------------------------------------------- property type */}
          <div className="nf-stay-type" data-testid="stay-type">
            <span className="nf-stay-type__object" aria-hidden="true">
              <BrandIcon name={BUSINESS_OBJECT[businessKind] ?? "hotel"} fill />
            </span>
            <span className="min-w-0">
              <span className={`block ${TYPE.label}`}>{catalogue.propertyType}</span>
              <span className={`block ${TYPE.rowTitle}`}>{BUSINESS_LABEL[businessKind] ?? "Hotel"}</span>
              <span className={`mt-3xs block ${TYPE.rowMeta}`}>
                {detail.roomTypes.length > 0
                  ? `${detail.roomTypes.length} ${detail.roomTypes.length === 1 ? "room type" : "room types"}`
                  : copy.noRoomsYet}
                {detail.checkInFrom ? ` · ${copy.checkIn} ${detail.checkInFrom.slice(0, 5)}` : ""}
                {detail.checkOutBy ? ` · ${copy.checkOut} ${detail.checkOutBy.slice(0, 5)}` : ""}
              </span>
            </span>
          </div>

          {/* ------------------------------------------------ room tiles */}
          {detail.roomTypes.length > 0 && (
            <ul className="nf-room-tiles" data-testid="room-tiles">
              {detail.roomTypes.map((room, index) => {
                const photo = detail.photos[index % Math.max(1, detail.photos.length)];
                const rate = roomFromMinor(room, nights);
                return (
                  <li key={room.id}>
                    <a href="#rooms" className="nf-room-tile">
                      <span className="nf-room-tile__media block">
                        <MediaFrame hue={index} index={index} kind="hotel" sizes="(max-width: 640px) 50vw, 25vw" />
                        {photo && detail.photos.length > 0 && (
                          <Image src={photo.url} alt="" fill sizes="(max-width: 640px) 50vw, 25vw" className="object-cover" />
                        )}
                      </span>
                      <span className="nf-room-tile__body">
                        <UiIcon name="bed" size={16} />
                        <span className="min-w-0">
                          <span className="nf-room-tile__name">{copy.category[ROOM_CATEGORY_KEY[room.category]]}</span>
                          <span className="nf-room-tile__value">
                            {room.name}
                            {rate !== null ? "" : ""}
                          </span>
                        </span>
                      </span>
                    </a>
                  </li>
                );
              })}
            </ul>
          )}

          <Section id="rooms" title={copy.roomsTitle} description={copy.roomsDescription} className="scroll-mt-28">
            {detail.roomTypes.length > 0 ? (
              <RoomTypes
                detail={detail}
                guests={guests}
                nights={nights}
                locale={locale}
                copy={copy}
                reserve={reserve}
              />
            ) : (
              <p className={TYPE.rowMeta}>{copy.noRoomsYet}</p>
            )}
          </Section>

          {/* The policy, in its own words. A refund rule this screen rewrote
              is a refund rule nobody can be held to. */}
          {detail.policy && (
            <Section title={copy.policyTitle}>
              <div className="nf-detail-panel">
                <p className={TYPE.rowTitle}>{detail.policy.name}</p>
                <p className={`mt-inline ${TYPE.body} leading-relaxed`}>{detail.policy.summary}</p>
                {detail.policy.freeUntilHours !== null && (
                  <p className={`mt-row flex items-start gap-inline-tight ${TYPE.rowMeta}`}>
                    <UiIcon name="verified" size={ICON.inline} className="mt-3xs shrink-0 text-[var(--nf-state-success)]" />
                    <span className="min-w-0">{copy.freeUntil.replace("{hours}", String(detail.policy.freeUntilHours))}</span>
                  </p>
                )}
              </div>
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
              <p className="nf-detail-foot__figure nf-numeric">
                <Amount
                  minorUnits={total ?? from}
                  locale={locale}
                />
              </p>
              <p className="nf-detail-foot__caption">
                {total !== null && nights !== null ? copy.totalFor.replace("{count}", String(nights)) : catalogue.perNight}
              </p>
            </>
          ) : (
            <p className={TYPE.rowMeta}>{copy.noRate}</p>
          )}
        </div>
        <ButtonLink href="#rooms" variant="primary" size="lg" leadingIcon="calendar-booking" className="shrink-0" data-testid="book-this-stay">
          {catalogue.bookThisStay}
        </ButtonLink>
      </ActionBar>
    </div>
  );
}
