"use client";

import { formatNumber, formatRating, type Dictionary, type Locale } from "@vallo/i18n/core";
import { Amount } from "@/components/ui/Amount";
import { SaveButton, useSaveControl } from "@/components/app/SaveControl";
import { StackCardFace } from "@/components/app/listing/StackCardFace";
import type { StayCardData } from "./stay-card-model";
import "@/app/css/catalogue.css";

/**
 * A stay, hotel or restaurant as a card in the featured stack (the travel-app
 * reference). The same facts `StayCard` draws, in the stack's face: the
 * place's own photograph (or its labelled stand-in), the heart only for a
 * reader who can save, the star rating only from real reviews and never on an
 * example, and the price in the market's own unit (a night, a head) or none.
 */
export function StayStackCard({
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
  index: number;
  saved?: boolean;
  canSavePlaces?: boolean;
  eager?: boolean;
}) {
  const save = useSaveControl(stay.id, saved, stay.place);
  const showSave = stay.place ? canSavePlaces : true;
  const isTable = stay.kind === "restaurant";
  const rating =
    stay.rating && stay.rating.count > 0 && !stay.isDemo
      ? { average: formatRating(stay.rating.average, locale), count: formatNumber(stay.rating.count, locale) }
      : null;
  const price =
    stay.nightlyMinor !== null ? (
      <>
        <Amount minorUnits={stay.nightlyMinor} locale={locale} currency={stay.currency} glance />
        <span className="font-normal opacity-75"> {isTable ? t.restaurantPage.perHead : t.catalogue.stays.perNight}</span>
      </>
    ) : null;

  return (
    <StackCardFace
      href={stay.href}
      title={stay.title}
      where={stay.where}
      photo={stay.photo ?? stay.standIn ?? null}
      kind={stay.kind}
      hue={stay.hue}
      index={index}
      rating={rating}
      price={price}
      openLabel={t.catalogue.stays.stack.open}
      photoNote={stay.photo ? undefined : t.catalogue.card.noPhotos}
      eager={eager}
      heart={
        showSave ? (
          <SaveButton saved={save.saved} pending={save.pending} onToggle={save.toggle} title={stay.title} surface="media" />
        ) : undefined
      }
    />
  );
}
