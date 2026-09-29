"use client";

import { useState } from "react";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { Button } from "@/components/ui/Button";
import { addAccommodationDraft } from "@/lib/host/actions";
import { StaysHero, StaysNote, StaysPlate, StaysRow, StaysStepper } from "./StaysParts";
import type { StaysStepProps } from "./types";
import { countOf } from "@vallo/i18n/core";

/**
 * YOUR HOTEL. `GOVERNING-10` screen one, and `GOVERNING-09` screen four.
 *
 * WHAT WAS THERE. A step headed "The property" with a name box, a description
 * box, a star select, two time inputs, a rules textarea and a policy select,
 * all of them the platform's ordinary labelled field, none of them the drawn
 * screen. The render asks a hotelier five things and puts the hotel itself at
 * the top of the screen as a lit object, and it does not ask for a check-in
 * time on the same breath as the RC number.
 *
 * WHAT IS DRAWN AND WHAT IT IS WIRED TO, one by one, because three of the five
 * are not properties of the property at all:
 *
 *  - HOTEL NAME is `accommodations.name`, saved by `addAccommodationDraft`.
 *  - RC NUMBER is `businesses.cac_number`. It is the same answer the
 *    registration step asks for, shown here because the render shows it here,
 *    and saved through the same `saveHostDraft` the registration step uses.
 *    Two boxes, one column, and whichever is typed into last wins, which is
 *    the correct behaviour for one fact asked twice.
 *  - ADDRESS is the business's, asked in full on the business step. It is a
 *    ROW here and not a field: the render draws it with a pin and a chevron,
 *    which means "this is what you told us, open it to change it", and that is
 *    exactly what it does.
 *  - STAR RATING is `accommodations.star_rating`.
 *  - NUMBER OF ROOMS has no column anywhere in this database, and the note at
 *    the foot of the screen says what it actually does rather than pretending.
 *
 * THE ONE PLACE THE RENDER IS NOT FOLLOWED, and it is the star row's chevron.
 * `GOVERNING-10` draws a chevron at the right of the star rating, which means
 * a select. The stars ARE the control here, and a chevron beside them would be
 * an affordance that opens nothing. Everything else on the row, the five
 * marks, four lit and one hollow, the plate, the label, is the render.
 */
export function HotelStep({
  locale,
  draft,
  set,
  pending,
  fieldErrors,
  run,
  saveText,
  setNotice,
  goTo,
  advance,
  expectedRooms,
  onExpectedRooms,
}: StaysStepProps & {
  /**
   * The total a hotelier states before any room type exists.
   *
   * IT IS THE WIZARD'S AND NOT THIS SCREEN'S, because the room types step is
   * where it is spent: the first room type is created with it. See the note at
   * the foot of the screen, which tells the host the same thing.
   */
  expectedRooms: number;
  onExpectedRooms(next: number): void;
}) {
  const [name, setName] = useState(draft.accommodation?.name ?? draft.name ?? "");
  const [stars, setStars] = useState<number | null>(draft.accommodation?.starRating ?? null);

  /* The rooms actually on sale, which is the sum of the room types. Until
     there is one, the number is the hotelier's own stated total. */
  const onSale = draft.roomTypes.reduce((total, room) => total + room.unitsTotal, 0);
  const rooms = draft.roomTypes.length > 0 ? onSale : expectedRooms;

  /* TWO LINES, AS DRAWN: the street, then where it is. The state joins the
     second line rather than taking a third, which is how the render writes
     "Plot 12, Admiralty Way / Lekki, Lagos" and how anybody writes an address
     on an envelope. */
  const addressLines = [draft.address, [draft.area, draft.city, draft.stateCode].filter(Boolean).join(", ")]
    .map((line) => line.trim())
    .filter(Boolean);

  const save = () =>
    run(
      () => addAccommodationDraft({ name, starRating: stars }),
      () => {
        setNotice({ tone: "ok", text: "Your hotel is saved." });
        advance();
      },
    );

  return (
    <>
      <StaysHero mark="stays-hotel-palms" />

      <StaysPlate label="Hotel name" htmlFor="stays-hotel-name">
        <input
          id="stays-hotel-name"
          className="nf-field nf-field--glass nf-stays-input"
          value={name}
          autoComplete="organization"
          onChange={(event) => setName(event.target.value)}
        />
      </StaysPlate>

      <StaysPlate label="RC number" htmlFor="stays-hotel-rc">
        <input
          id="stays-hotel-rc"
          className="nf-field nf-field--glass nf-stays-input"
          value={draft.cacNumber}
          inputMode="text"
          aria-invalid={fieldErrors.cacNumber ? true : undefined}
          onChange={(event) => set("cacNumber", event.target.value)}
        />
        {fieldErrors.cacNumber ? (
          <p className="nf-stays-plate__note" role="alert">
            {fieldErrors.cacNumber}
          </p>
        ) : null}
      </StaysPlate>

      <StaysPlate label="Address">
        <button
          type="button"
          onClick={() => goTo("business")}
          className="nf-stays-row w-full"
          aria-label="Change the address"
        >
          <UiIcon name="location" size={20} className="shrink-0 text-[var(--nf-brand-secondary)]" />
          <span className="min-w-0 flex-1 text-left">
            {addressLines.length > 0 ? (
              addressLines.map((line) => (
                <span key={line} className="nf-stays-row__value block">
                  {line}
                </span>
              ))
            ) : (
              <span className="nf-stays-row__meta">Not given yet. Open the business step to add it.</span>
            )}
          </span>
          <UiIcon name="chevron-right" size={20} className="shrink-0 text-[var(--nf-content-muted)]" />
        </button>
      </StaysPlate>

      <StaysPlate label="Star rating">
        <div
          role="radiogroup"
          aria-label="Star rating"
          className="nf-stays-stars mt-[var(--nf-space-xs)]"
        >
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={stars === n}
              aria-label={countOf(n, "stars", locale)}
              onClick={() => setStars(stars === n ? null : n)}
              className="grid h-11 w-9 place-items-center"
            >
              <UiIcon name="star" size={28} filled={stars !== null && n <= stars} />
            </button>
          ))}
        </div>
        <p className="nf-stays-plate__note">
          {stars === null
            ? "No star rating claimed. Leave it that way unless a body has actually rated the hotel."
            : "A claimed rating. It renders as a claim and not as a badge until it is checked."}
        </p>
      </StaysPlate>

      <StaysPlate label="Number of rooms">
        <StaysRow
          trailing={
            <StaysStepper
              label="rooms"
              value={rooms}
              min={1}
              max={999}
              showValue={false}
              onChange={onExpectedRooms}
              disabled={draft.roomTypes.length > 0}
            />
          }
        >
          <span className="nf-stays-row__value text-[length:var(--nf-text-h4)] font-semibold">{rooms}</span>
        </StaysRow>
        <p className="nf-stays-plate__note">
          {draft.roomTypes.length > 0
            ? "This is the total across the room types you have saved. Change it by changing a room type on the next screen."
            : "The total you expect. The next screen is where the rooms actually go on sale, and what you enter there is what guests can book."}
        </p>
      </StaysPlate>

      <Button
        variant="primary"
        size="lg"
        full
        trailingIcon="chevron-right"
        onClick={() => saveText({}, save)}
        disabled={pending || name.trim().length < 2}
        loading={pending}
      >
        Continue
      </Button>

      <StaysNote>
        Nothing here is on sale yet. A hotel goes on the shelf when a person on our team has read
        the application, and you can come back to this screen until then.
      </StaysNote>
    </>
  );
}
