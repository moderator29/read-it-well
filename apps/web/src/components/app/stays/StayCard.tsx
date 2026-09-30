"use client";

import Image from "next/image";
import Link from "next/link";
import { formatRating, type Dictionary, type Locale } from "@vallo/i18n/core";
import { UiIcon, type UiIconName } from "@/design-system/icons/UiIcon";
import { Amount } from "@/components/ui/Amount";
import { MediaFrame } from "@/components/app/MediaFrame";
import { panelClass } from "@/components/ui/Panel";
import { SaveButton, useSaveControl } from "@/components/app/SaveControl";
import { amenityLabel } from "@/components/app/filters/amenities";
import type { StayCardData } from "./stay-card-model";

/**
 * The stay card of FD3DFE84: one across, the photograph with Verified and
 * the heart, then the name and place on the left with the nightly figure on
 * the right, the rating only when real reviews exist, and the amenity chips.
 */
const AMENITY_ICON: Record<string, UiIconName> = {
  wifi: "wifi",
  pool: "pool",
  breakfast: "utensils",
  kitchen: "kitchen",
  parking: "parking",
  security: "verified",
  gym: "bolt",
  ac: "sparkle",
  generator: "bolt",
};

export function StayCard({
  stay,
  locale,
  t,
  index,
  saved = false,
  canSavePlaces = false,
  eager = false,
}: {
  stay: StayCardData;
  locale: Locale;
  t: Dictionary;
  index?: number;
  /** Lit at rest, from the account's shortlist (`savedKeySet` and `isSaved`
      in `@/lib/saved/places`), decided on the server that read it. */
  saved?: boolean;
  /**
   * Whether the reader can actually write to `saved_places`, which means
   * whether they are signed in. A stay or a restaurant has no device half:
   * `saved_items` takes listing ids only, so there is nowhere for a
   * signed-out tap on a hotel to go. A control that cannot act is never
   * drawn, so the heart is simply absent for that reader rather than present
   * and refusing.
   */
  canSavePlaces?: boolean;
  /** The first card above the fold: its photograph loads at once and high
      (the page's largest paint; integration QA O5). One per page. */
  eager?: boolean;
}) {
  const copy = t.catalogue.stays;
  const save = useSaveControl(stay.id, saved, stay.place);
  const showSave = stay.place ? canSavePlaces : true;
  const chips = stay.amenities.slice(0, 4);
  const style = index !== undefined ? ({ "--card-i": Math.min(index, 5) } as React.CSSProperties) : undefined;

  return (
    <article
      className={panelClass({
        variant: "card",
        className: `nf-pcard nf-pcard--wide ${index !== undefined ? "nf-card-in" : ""}`,
      })}
      style={style}
      data-testid="stay-card"
    >
      {showSave && (
        <div className="nf-pcard__controls" data-theme="dark">
          <SaveButton saved={save.saved} pending={save.pending} onToggle={save.toggle} title={stay.title} surface="media" />
        </div>
      )}
      {save.note && (
        <p role="status" className="nf-pcard__note">
          {save.note.text}
        </p>
      )}
      <Link href={stay.href} className="flex h-full flex-col">
        <div className="nf-pcard__media" data-theme="dark">
          <div className="nf-pcard__photo">
            <MediaFrame
              hue={stay.hue}
              index={index ?? 0}
              kind={stay.kind}
              sizes="(max-width: 640px) 100vw, 50vw"
              priority={eager && !stay.photo && !stay.standIn}
            />
            {(stay.photo ?? stay.standIn) && (
              <Image
                src={stay.photo ?? stay.standIn!}
                alt=""
                fill
                sizes="(max-width: 640px) 100vw, 50vw"
                className="object-cover"
                {...(eager ? ({ loading: "eager", fetchPriority: "high" } as const) : {})}
              />
            )}
          </div>
          {stay.hours && (
            <span className={`nf-reg-open absolute bottom-xs left-xs z-[2] ${stay.hours.openNow ? "nf-reg-open--open" : "nf-reg-open--closed"}`}>
              <UiIcon name="history" size={12} />
              {stay.hours.label}
            </span>
          )}
          {stay.verified && (
            <span className="nf-badge nf-badge--verified nf-pcard__mark nf-pcard__mark--verified">
              <UiIcon name="verified" size={12} />
              {t.common.verified}
            </span>
          )}
          {stay.isDemo && (
            <span className="nf-badge nf-badge--example nf-pcard__mark nf-pcard__mark--example">
              <UiIcon name="info" size={12} />
              {t.catalogue.card.example}
            </span>
          )}
          {!stay.photo && <span className="nf-pcard__nophoto">{t.catalogue.card.noPhotos}</span>}
        </div>

        <div className="nf-pcard__body">
          <div className="nf-stay-card__head">
            <div className="min-w-0">
              <h3 className="nf-pcard__title" title={stay.title}>
                {stay.title}
              </h3>
              {stay.where && (
                <p className="nf-pcard__where mt-2xs">
                  <UiIcon name="location" size={12} />
                  <span>{stay.where}</span>
                </p>
              )}
              {stay.rating && (
                <p className="nf-stay-card__rating mt-2xs nf-numeric">
                  <UiIcon name="star" size={16} filled />
                  {formatRating(stay.rating.average, locale)}
                  <span className="font-normal text-[var(--nf-content-muted)]">
                    {copy.reviews.replace("{count}", String(stay.rating.count))}
                  </span>
                </p>
              )}
            </div>
            {stay.nightlyMinor !== null ? (
              <p className="nf-stay-card__price">
                <Amount
                  minorUnits={stay.nightlyMinor}
                  locale={locale}
                  currency={stay.currency}
                  glance
                  secondaryClassName="text-[0.6em] font-semibold opacity-70"
                />
                <span className="nf-stay-card__per">{copy.perNight}</span>
              </p>
            ) : (
              <p className="nf-pcard__sub shrink-0 text-right">{t.common.priceOnRequest}</p>
            )}
          </div>

          {stay.totalMinor !== null && stay.nights !== null && (
            <p className="nf-pcard__sub mt-2xs">
              {t.stays.totalForNights.replace("{nights}", String(stay.nights))}{" "}
              <Amount minorUnits={stay.totalMinor} locale={locale} currency={stay.currency} className="font-semibold text-[var(--nf-content-primary)]" />
            </p>
          )}

          {chips.length > 0 && (
            <ul className="nf-stay-card__chips">
              {chips.map((code) => (
                <li key={code} className="nf-stay-card__chip">
                  <UiIcon name={AMENITY_ICON[code] ?? "sparkle"} size={12} />
                  {amenityLabel(code)}
                </li>
              ))}
            </ul>
          )}
        </div>
      </Link>
    </article>
  );
}
