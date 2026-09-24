import Image from "next/image";
import { countOf, formatMoney, formatNumber, type Dictionary, type Locale } from "@vallo/i18n";
import { Amount } from "@/components/ui/Amount";
import { ReportSheet } from "@/components/app/ReportSheet";
import { ExampleNotice } from "@/components/app/listing/ExampleNotice";
import { ButtonLink } from "@/components/ui/Button";
import { UiIcon, type UiIconName } from "@/design-system/icons/UiIcon";
import { BrandIcon, type BrandIconName } from "@/design-system/icons/BrandIcon";
import { ListingGallery } from "@/components/app/listing/ListingGallery";
import { MediaFrame } from "@/components/app/MediaFrame";
import { ICON, Section, Stack, TYPE } from "@/components/app/Screen";
import { RoomTypes } from "./RoomTypes";
import { StayDatesForm } from "./StayDatesForm";
import {
  DetailAboutCard,
  DetailAvailabilityCard,
  DetailCapsules,
  DetailPriceRow,
  DetailSpecStrip,
  type DetailDateField,
  type SpecPair,
} from "@/components/app/listing/DetailAnatomy";
import {
  ROOM_CATEGORY_KEY,
  cheapestBookable,
  maxSleeps,
  reserveHref,
  roomFromMinor,
  stayFromMinor,
  type ReserveBase,
  type StayDetail,
} from "./detail-model";
import { panelClass } from "@/components/ui/Panel";

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
  saved = false,
  signedIn,
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
  /** Whether this accommodation is already on the account's shortlist, read
      on the server from `saved_places` so the heart is lit before hydration
      and stays lit through a reload. */
  saved?: boolean;
  /** Whether the reader is signed in. When given, the page carries a report
      control for the place (STORE-P2-01); a static preview passes nothing. */
  signedIn?: boolean;
}) {
  const from = stayFromMinor(detail, nights);
  const total = from !== null && nights !== null ? from * nights : null;
  const where = [detail.area, detail.city].filter(Boolean).join(", ");
  const catalogue = t.catalogue.stays;
  const businessKind = detail.businessKind ?? "hotel";
  const detailCopy = t.catalogue.detail;

  /*
   * THE SPEC STRIP, from what this record actually states.
   *
   * B047A0CE draws three pairs and its example is "4 Beds | 5 Baths |
   * 2 Living Rooms", which is a RENTAL's vocabulary. An accommodation carries
   * none of those columns: `room_types` states who a room sleeps and what it
   * is, and `accommodations` states the class and the check-in time. So the
   * strip is the same shape filled with this record's own facts, in the order
   * a guest compares them, and a fact the property did not state is simply not
   * a cell. Inventing a bathroom count to match a render is the exact failure
   * the direction's "translate, never copy" rule exists to prevent.
   */
  const sleeps = maxSleeps(detail);
  const specCandidates: SpecPair[] = [];
  if (sleeps !== null) {
    specCandidates.push({
      key: "sleeps",
      icon: "bed",
      label: copy.sleeps.replace("{count}", formatNumber(sleeps, locale)),
    });
  }
  if (detail.roomTypes.length > 0) {
    specCandidates.push({
      key: "rooms",
      icon: "building-apartment",
      label:
        detail.roomTypes.length === 1
          ? copy.roomTypesOne
          : copy.roomTypes.replace("{count}", formatNumber(detail.roomTypes.length, locale)),
    });
  }
  if (detail.starRating) {
    specCandidates.push({
      key: "class",
      icon: "sparkle",
      label: STAR_LABEL[detail.starRating] ?? `${detail.starRating} star`,
    });
  }
  if (detail.checkInFrom) {
    specCandidates.push({
      key: "check-in",
      icon: "history",
      label: `${catalogue.checkIn} ${detail.checkInFrom.slice(0, 5)}`,
    });
  }

  /* The capsules: the first four amenities the property named, each with the
     glyph its words earn. Never a facility nobody claimed. */
  const capsules = detail.amenities.map((amenity) => ({
    key: amenity,
    icon: amenityGlyph(amenity),
    label: amenity,
  }));

  /*
   * WHAT "BOOK NOW" HONESTLY MEANS HERE.
   *
   * With dates picked and a room that takes the party, it means the cheapest
   * rate that can actually be booked, and the link is the real first-party
   * checkout `reserveHref` builds, the same URL the room rows build. Without
   * dates it means "pick your dates", because a checkout with no dates is a
   * checkout that refuses. With dates and nothing bookable it means "see the
   * rooms", because the refusal belongs where the reader can do something
   * about it. Three states, three honest destinations, no dead button.
   */
  const datesPicked = Boolean(checkIn && checkOut && nights !== null && nights > 0);
  const bookable = datesPicked ? cheapestBookable(detail, nights, guests) : null;
  const action = bookable
    ? {
        label: detailCopy.bookNow,
        href: reserveHref(reserve, bookable.room.id, bookable.plan.id),
        gate: "pay" as const,
      }
    : datesPicked
      ? { label: catalogue.seeRooms, href: "#rooms", gate: null }
      : { label: copy.pickDates, href: datesHref, gate: null };

  const fields: DetailDateField[] = [
    {
      key: "check-in",
      label: catalogue.checkIn,
      value: dateLabel(checkIn, locale) ?? detailCopy.selectDate,
      href: datesHref,
    },
    {
      key: "check-out",
      label: catalogue.checkOut,
      value: dateLabel(checkOut, locale) ?? detailCopy.selectDate,
      href: datesHref,
    },
    {
      key: "guests",
      label: catalogue.guests,
      value: copy.guests.replace("{count}", formatNumber(guests, locale)),
      href: datesHref,
      icon: "user",
    },
  ];

  return (
    <div className="nf-cat-surface">
      <ListingGallery
        listingId={detail.id}
        title={detail.name}
        hue={0}
        kind="hotel"
        photos={detail.photos.map((photo) => photo.url)}
        backFallback="/stays"
        mark={{ label: catalogue.title, icon: "bed" }}
        /* `detail.id` is an ACCOMMODATION id, not a listing id, so the share
           path has to be told or it builds `/listing/<accommodationId>`,
           which resolves to nothing. See `components/app/messages/share.ts`. */
        shareKind="stay"
        /* And the heart writes to `saved_places` under the accommodation kind
           rather than to `saved_items`, whose foreign key can never accept
           this id. It refused every tap on this page until now. */
        place={{ kind: "accommodation", id: detail.id }}
        initialSaved={saved}
      />

      <div className="mx-auto max-w-2xl pb-section">
        {/* ------------------------------------------------ the headline
            B047A0CE's order exactly: the name, the pin line, the bordered
            strip of spec pairs, then the figure in blue with its unit and the
            rating on the same row, then the capsules. The card is lit glass
            and overlaps the photograph, as every lead card here does. */}
        <div className={panelClass({ variant: "card", className: "nf-detail-lead relative z-10 -mt-xl block sm:-mt-2xl" })}>
          <h1 className="nf-h2 [text-wrap:balance]">{detail.name}</h1>
          {/* UX-09 / UI-P2-01: said here, one tap deeper than the shelf card,
              where the booking would have happened. */}
          {detail.isExample && (
            <ExampleNotice variant="page" className="mt-row" statement={t.examples.statement} />
          )}
          {where && (
            <p className={`mt-inline-tight flex items-center gap-inline-tight ${TYPE.body}`}>
              <UiIcon name="location" size={ICON.inline} className="shrink-0 text-[var(--nf-brand-secondary)]" />
              {where}
            </p>
          )}

          <DetailSpecStrip pairs={specCandidates} />

          {from !== null ? (
            <DetailPriceRow
              figure={
                <span data-testid="stay-from">
                  <Amount
                    minorUnits={from}
                    locale={locale}
                    secondaryClassName="text-[0.6em] font-semibold opacity-70"
                  />
                </span>
              }
              unit={catalogue.perNight}
              /* Drawn only where real review rows stand behind it. */
              rating={
                detail.rating && detail.rating.count > 0
                  ? {
                      average: formatNumber(detail.rating.average, locale, {
                        minimumFractionDigits: 1,
                        maximumFractionDigits: 1,
                      }),
                      reviews: catalogue.reviews.replace(
                        "{count}",
                        formatNumber(detail.rating.count, locale),
                      ),
                    }
                  : null
              }
            />
          ) : (
            <p className={`mt-md ${TYPE.rowMeta}`}>{copy.noRate}</p>
          )}

          <DetailCapsules items={capsules} label={t.catalogue.detail.amenities} />
        </div>

        {/* ------------------------------------- about, and who hosts it */}
        <div className="mt-block">
          <DetailAboutCard
            title={catalogue.aboutThisStay}
            paragraphs={detail.description ? [detail.description] : []}
            host={
              detail.hostName
                ? {
                    name: detail.hostName,
                    role: BUSINESS_LABEL[businessKind] ?? "Host",
                    verified: detail.hostVerified === true,
                    verifiedLabel: detailCopy.verifiedHost,
                    messageHref: detail.isExample ? null : `/messages/new?listing=${detail.id}`,
                    messageLabel: detailCopy.message,
                  }
                : null
            }
          />
        </div>

        {/* --------------------------------------- dates and the party */}
        {detail.isExample ? (
          /* An example has nothing to book, so there is no Book now to press
             and be refused at checkout. The same consequence line the
             property page draws. */
          <div className="mt-block" data-testid="stay-not-bookable">
            <div className={panelClass({ variant: "card", className: "block p-card" })}>
              <p className={TYPE.rowMeta}>
                {t.examples.stayNotBookable}
              </p>
              <ButtonLink href="/stays" variant="primary" className="mt-block w-full">
                {t.examples.browseStays}
              </ButtonLink>
            </div>
          </div>
        ) : (
        <div className="mt-block" data-testid="stay-dates-row">
          <DetailAvailabilityCard
            title={detailCopy.checkAvailability}
            fields={fields}
            action={action}
            note={
              total !== null && nights !== null
                ? `${copy.totalFor.replace("{count}", formatNumber(nights, locale))}: ${formatMoney(total, locale)}`
                : copy.pickDatesForTotal
            }
          />
          <StayDatesForm
            action={`/stay/${detail.id}`}
            checkIn={checkIn}
            checkOut={checkOut}
            guests={guests}
            copy={{
              title: copy.datesTitle,
              checkIn: catalogue.checkIn,
              checkOut: catalogue.checkOut,
              guests: catalogue.guests,
              submit: copy.datesSubmit,
            }}
          />
        </div>
        )}

        <Stack className="mt-block">
          {/* ------------------------------------------------ amenities */}
          {detail.amenities.length > 0 && (
            <Section title={t.catalogue.detail.amenities}>
              <ul className="nf-amenity-grid" data-testid="stay-amenities">
                {detail.amenities.map((amenity) => (
                  <li key={amenity} className={panelClass({ variant: "card", className: "nf-amenity-tile" })}>
                    <UiIcon name={amenityGlyph(amenity)} size={ICON.inline} />
                    <span>{amenity}</span>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {/* The description and the host row moved up into the About card
              above, which is where B047A0CE puts them. A second copy here
              would be the same paragraph twice on one screen. */}

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
                  ? countOf(detail.roomTypes.length, "roomTypes", locale)
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
            {detail.isExample ? (
              <p className={TYPE.rowMeta} data-testid="rooms-example">
                {t.examples.roomsExample}
              </p>
            ) : detail.roomTypes.length > 0 ? (
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

          {signedIn !== undefined && (
            <div className="py-md" data-testid="stay-report">
              <ReportSheet
                targetType="business"
                targetId={detail.id}
                targetLabel={detail.name}
                signedIn={signedIn}
              />
            </div>
          )}
        </Stack>
      </div>

      {/*
        NO PINNED FOOT ON THIS FACE.

        It used to carry one, and an audit caught the fault: the
        foot painted over the amenity tiles at 390, and it quoted a total a
        second time under a card that already stated it. Neither B047A0CE nor
        BB0C2C85 ends on a pinned bar; both end on the availability card's own
        full-width action, which is where the decision now lives. Nothing was
        lost with it: the same three destinations (the checkout, the dates, the
        rooms) are on the card above.
      */}
    </div>
  );
}
