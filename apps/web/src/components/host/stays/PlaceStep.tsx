"use client";

import { useHostCopy } from "@/components/host/host-copy";
import { useState } from "react";
import { formatMoney } from "@vallo/i18n/core";
import { Button } from "@/components/ui/Button";
import { addAccommodationDraft, setShortletPlaceDraft } from "@/lib/host/actions";
import { PLACE_TYPES, type PlaceTypeId } from "@/lib/host/stays-setup";
import { StaysCountRow, StaysNote, StaysPlate, StaysTile, StaysTiles } from "./StaysParts";
import type { StaysStepProps } from "./types";

/**
 * YOUR PLACE. `GOVERNING-11` screen one, the shortlet's first screen.
 *
 * WHAT A SHORTLET HOST MET BEFORE. The hotel's property step, then the hotel's
 * rooms step, which asked them to name a "room type", pick whether it was a
 * twin or a dorm, and say how many of it they had. Somebody letting one
 * two-bedroom flat in Lekki had to answer all three of those about their own
 * home, and the honest answer to every one of them was none of the above.
 *
 * THE THREE TILES WERE THE ONE THING THE DATABASE COULD NOT HOLD, AND NOW IT
 * CAN. `room_category` was `single | double | twin | suite | family | dorm`,
 * and an entire flat is not any of them.
 * `20260922190000_imgc_a_shortlet_is_not_a_hotel_room.sql` adds the three
 * additively and has been applied to the live estate. On an estate where it
 * has not, `setShortletPlaceDraft` turns Postgres's own `22P02` into a
 * sentence naming the file, rather than writing "double" onto somebody's
 * house.
 *
 * WHERE EACH ANSWER GOES, AND ONE OF THEM WAS WRONG ON THE FIRST PASS. The
 * place type is `room_types.category`, maximum guests is `room_types.sleeps`,
 * the nightly price is `room_types.base_rate_minor` in integer kobo, the beds
 * are `room_types.beds`, which is a jsonb ARRAY of `{kind, count}` and NOT the
 * object this screen first wrote, and the bedrooms are `room_types.bedrooms`,
 * a column of their own added by
 * `20260922200000_imgc_a_bedroom_is_not_a_bed.sql` because a bedroom is not a
 * bed. `units_total` is one, because a shortlet operator lets this place and
 * not fifty of it.
 *
 * THE COUNTS ARE STEPPERS AND NOT NUMBER BOXES, as drawn, and that is a
 * Nigerian mobile decision as much as a visual one: a stepper does not raise a
 * keyboard over the screen a host is reading.
 *
 */
export function PlaceStep({
  draft,
  locale,
  pending,
  fieldErrors,
  run,
  setNotice,
  advance,
}: StaysStepProps) {
  const hw = useHostCopy();
  const unit = draft.roomTypes[0] ?? null;
  /*
   * A studio has no separate bedroom and one bed, which is the smallest honest
   * place and therefore the right default for somebody starting.
   *
   * `bedrooms` COMES BACK NULL when nobody has been asked, which is every row
   * written before `20260922200000_imgc_a_bedroom_is_not_a_bed.sql` ran, so
   * null falls to the default rather than to zero: a host returning to a place
   * they saved before that migration is started at one bedroom and not told
   * their flat is a studio.
   */
  const saved = unit?.beds ?? null;
  const beds = {
    bedrooms: saved?.bedrooms ?? 1,
    beds: saved && saved.beds > 0 ? saved.beds : 1,
  };

  const [placeType, setPlaceType] = useState<PlaceTypeId | null>(
    PLACE_TYPES.some((type) => type.id === unit?.category)
      ? (unit?.category as PlaceTypeId)
      : null,
  );
  const [name, setName] = useState(unit?.name ?? draft.accommodation?.name ?? draft.name ?? "");
  const [bedrooms, setBedrooms] = useState(beds.bedrooms);
  const [bedCount, setBedCount] = useState(beds.beds);
  const [guests, setGuests] = useState(unit?.sleeps ?? 2);
  const [naira, setNaira] = useState(unit ? String(Math.round(unit.baseRateMinor / 100)) : "");

  const typed = Number.parseFloat(naira.replace(/[^0-9.]/g, ""));
  const kobo = Number.isFinite(typed) && typed > 0 ? Math.round(typed * 100) : 0;

  /*
   * THE PROPERTY IS CREATED HERE IF IT DOES NOT EXIST, because a unit hangs on
   * one and the render's screen never mentions it. The name the host gives the
   * place is the property's name, which is the truthful reading: for a
   * shortlet the place IS the property.
   */
  const save = () =>
    run(
      async () => {
        const property = await addAccommodationDraft({ name });
        if (!property.ok) return property;
        return setShortletPlaceDraft({
          accommodationId: property.data.accommodationId,
          placeType,
          name,
          bedrooms,
          beds: bedCount,
          maxGuests: guests,
          nightlyRateMinor: kobo,
        });
      },
      () => {
        setNotice({ tone: "ok", text: "Your place is saved." });
        advance();
      },
    );

  return (
    <>
      <StaysTiles label={hw.steps.shortletKind}>
        {PLACE_TYPES.map((type) => (
          <StaysTile
            key={type.id}
            title={type.title}
            mark={type.mark}
            selected={placeType === type.id}
            onSelect={() => setPlaceType(type.id)}
          />
        ))}
      </StaysTiles>

      <StaysPlate label={hw.steps.placeName} htmlFor="stays-place-name">
        <input
          id="stays-place-name"
          className="nf-field nf-field--glass nf-stays-input"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <p className="nf-stays-plate__note">
          The name guests see. It is also the name of the property this place is listed under.
        </p>
      </StaysPlate>

      <section className="nf-stays-plate">
        {/*
          THE THREE COUNTED QUESTIONS, in one plate with a hairline between
          them, as drawn. Bedrooms may be none, because a studio has none and
          refusing zero would make a studio unlistable.
        */}
        <div className="nf-stays-list">
          <StaysCountRow
            label={hw.steps.bedrooms}
            value={bedrooms}
            min={0}
            max={30}
            onChange={setBedrooms}
            disabled={pending}
          />
          <StaysCountRow
            label={hw.steps.beds}
            value={bedCount}
            min={1}
            max={60}
            onChange={setBedCount}
            disabled={pending}
          />
          <StaysCountRow
            label={hw.steps.maxGuests}
            value={guests}
            min={1}
            max={40}
            onChange={setGuests}
            disabled={pending}
          />
        </div>
      </section>

      <StaysPlate label={hw.steps.nightlyPrice} htmlFor="stays-place-rate">
        {/*
          THE NAIRA MARK SITS INSIDE THE PLATE, as drawn, rather than beside
          it: the render puts it on the value's own plate at the left. It is
          decoration and not a value, so it is hidden from a screen reader,
          which hears the field's own label instead.
        */}
        <div className="nf-field nf-field--glass nf-stays-input flex items-center gap-[var(--nf-space-xs)]">
          <span aria-hidden="true">{"₦"}</span>
          <input
            id="stays-place-rate"
            className="min-w-0 flex-1 bg-transparent text-[var(--nf-content-primary)] outline-none"
            inputMode="decimal"
            value={naira}
            aria-invalid={fieldErrors.nightlyRateMinor ? true : undefined}
            onChange={(event) => setNaira(event.target.value)}
          />
        </div>
        <p className="nf-stays-plate__note">
          {kobo > 0
            ? `Stored as ${formatMoney(kobo, locale)} a night.`
            : "What one night costs. This is what a guest pays, and this platform adds nothing to it."}
        </p>
      </StaysPlate>

      <Button
        variant="primary"
        size="lg"
        full
        trailingIcon="chevron-right"
        onClick={save}
        loading={pending}
        disabled={pending || placeType === null || name.trim().length < 2 || kobo <= 0}
      >
        Continue
      </Button>

      <StaysNote>
        Nothing is on sale yet. The next screen is your house rules and how a guest may cancel, and
        a person on our team reads the whole application before anything appears on the shelf.
      </StaysNote>
    </>
  );
}
