"use client";

import { useState } from "react";
import { countOf, formatMoney } from "@vallo/i18n/core";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { Button } from "@/components/ui/Button";
import { addAccommodationDraft, addRoomTypeDraft } from "@/lib/host/actions";
import { StaysNote, StaysPlate, StaysRow, StaysStepper, StaysTile, StaysTiles } from "./StaysParts";
import type { StaysStepProps } from "./types";

/** The six `room_category` values a hotel room can be, in the drawn order. */
const ROOM_KINDS = [
  { value: "single", label: "Single" },
  { value: "double", label: "Double" },
  { value: "twin", label: "Twin" },
  { value: "suite", label: "Suite" },
  { value: "family", label: "Family" },
  { value: "dorm", label: "Dorm" },
] as const;

/**
 * YOUR ROOM TYPES. `GOVERNING-10` screen two.
 *
 * WHAT WAS THERE AND WHAT THE RENDER ADDS. A list of saved room types did
 * exist, added earlier in this build, and it is the one drawn thing on these
 * four images that was already right in substance. What it was not was the
 * drawn OBJECT: the render gives each room a thumbnail, two facts with their
 * own small marks, a chevron, and an "Add a room type" row at the foot of the
 * list with a plus in a plate. That row is how somebody understands that the
 * list is a list they can grow, and a form sitting under a heading is not.
 *
 * THE THUMBNAIL IS THE PROPERTY'S. `room_types` has no photographs anywhere in
 * this database, so the property's cover stands in and the room's glass mark
 * stands in where there is no cover. Stated here and again in `RatesStep`,
 * because a reader of either screen deserves to know which picture they are
 * actually looking at.
 *
 * THE COUNT AND THE SLEEPS ARE STEPPERS IN THE EDITOR, as everywhere else in
 * this set: a number box raises a keyboard over the screen somebody is reading.
 */
export function RoomTypesStep({
  draft,
  locale,
  pending,
  fieldErrors,
  run,
  setNotice,
  advance,
  expectedRooms,
}: StaysStepProps & { expectedRooms: number }) {
  const cover = draft.accommodation?.photos[0]?.url ?? null;
  const [adding, setAdding] = useState(draft.roomTypes.length === 0);
  const [name, setName] = useState("");
  const [kind, setKind] = useState<(typeof ROOM_KINDS)[number]["value"]>("double");
  const [sleeps, setSleeps] = useState(2);
  /* The total the hotelier stated on the previous screen is where the first
     room type starts, because it is the only number they have given us. */
  const [units, setUnits] = useState(expectedRooms);
  const [naira, setNaira] = useState("");

  const typed = Number.parseFloat(naira.replace(/[^0-9.]/g, ""));
  const kobo = Number.isFinite(typed) && typed > 0 ? Math.round(typed * 100) : 0;

  const save = () =>
    run(
      async () => {
        /* A room hangs on a property. Creating it here means a hotelier who
           came straight to this screen is not sent back for a name. */
        const property = await addAccommodationDraft({
          name: draft.accommodation?.name ?? draft.name,
        });
        if (!property.ok) return property;
        return addRoomTypeDraft({
          accommodationId: property.data.accommodationId,
          name,
          category: kind,
          sleeps,
          unitsTotal: units,
          baseRateMinor: kobo,
        });
      },
      () => {
        setNotice({ tone: "ok", text: `${name} is saved. Price it on the next screen.` });
        setName("");
        setNaira("");
        setAdding(false);
      },
    );

  return (
    <>
      {draft.roomTypes.length > 0 && (
        <ul className="flex flex-col gap-[var(--nf-space-xs)]">
          {draft.roomTypes.map((room) => (
            <li key={room.id} className="nf-stays-card">
              <div className="nf-stays-card__head">
                <span className="nf-stays-thumb">
                  {cover ? (
                    /* eslint-disable-next-line @next/next/no-img-element -- a
                       storage URL on a surface that is never indexed and never
                       prerendered; the optimiser would proxy it for no gain. */
                    <img src={cover} alt="" />
                  ) : (
                    <UiIcon name="bed" size={24} />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="nf-stays-card__title block">{room.name}</span>
                  <span className="mt-[var(--nf-space-2xs)] flex items-center gap-[var(--nf-space-xs)]">
                    <UiIcon name="bed" size={16} className="text-[var(--nf-brand-secondary)]" />
                    <span className="nf-stays-row__meta">
                      {countOf(room.unitsTotal, "rooms", locale)}
                    </span>
                  </span>
                  <span className="flex items-center gap-[var(--nf-space-xs)]">
                    <UiIcon name="user" size={16} className="text-[var(--nf-brand-secondary)]" />
                    <span className="nf-stays-row__meta">
                      {countOf(room.sleeps, "guests", locale)}
                    </span>
                  </span>
                  <span className="nf-stays-row__meta block">
                    {room.rateCount === 0
                      ? "No rate yet"
                      : `${formatMoney(room.baseRateMinor, locale)} a night`}
                  </span>
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}

      {!adding ? (
        <button
          type="button"
          className="nf-stays-rule w-full"
          onClick={() => setAdding(true)}
          disabled={pending}
        >
          <span className="nf-stays-glyph">
            <UiIcon name="plus" size={20} />
          </span>
          <span className="nf-stays-rule__label text-left">Add a room type</span>
          <UiIcon name="chevron-right" size={20} className="shrink-0 text-[var(--nf-content-muted)]" />
        </button>
      ) : (
        <>
          <StaysPlate label="Name" htmlFor="stays-room-name">
            <input
              id="stays-room-name"
              className="nf-field nf-field--glass nf-stays-input"
              value={name}
              placeholder="Deluxe double"
              aria-invalid={fieldErrors.name ? true : undefined}
              onChange={(event) => setName(event.target.value)}
            />
            <p className="nf-stays-plate__note">What a guest sees when they pick a room.</p>
          </StaysPlate>

          <StaysPlate label="What kind of room">
            <StaysTiles label="What kind of room" columns={3}>
              {ROOM_KINDS.map((option) => (
                <StaysTile
                  key={option.value}
                  title={option.label}
                  selected={kind === option.value}
                  onSelect={() => setKind(option.value)}
                  variant="text"
                />
              ))}
            </StaysTiles>
          </StaysPlate>

          <section className="nf-stays-plate">
            <div className="nf-stays-list">
              <StaysRow
                trailing={
                  <StaysStepper
                    label="rooms of this kind"
                    value={units}
                    min={1}
                    max={999}
                    onChange={setUnits}
                    disabled={pending}
                  />
                }
              >
                <span className="nf-stays-row__value">How many of this room</span>
              </StaysRow>
              <StaysRow
                trailing={
                  <StaysStepper
                    label="guests"
                    value={sleeps}
                    min={1}
                    max={20}
                    onChange={setSleeps}
                    disabled={pending}
                  />
                }
              >
                <span className="nf-stays-row__value">Guests it sleeps</span>
              </StaysRow>
            </div>
          </section>

          <StaysPlate label="Nightly price" htmlFor="stays-room-rate">
            <input
              id="stays-room-rate"
              className="nf-field nf-field--glass nf-stays-input"
              inputMode="decimal"
              value={naira}
              aria-invalid={fieldErrors.baseRateMinor ? true : undefined}
              onChange={(event) => setNaira(event.target.value)}
            />
            <p className="nf-stays-plate__note">
              {kobo > 0
                ? `Stored as ${formatMoney(kobo, locale)} a night. The next screen is where the meal plans are priced.`
                : "What one night in this room costs."}
            </p>
          </StaysPlate>

          <div className="flex gap-[var(--nf-space-xs)]">
            {draft.roomTypes.length > 0 && (
              <Button
                variant="secondary"
                size="lg"
                onClick={() => setAdding(false)}
                disabled={pending}
              >
                Cancel
              </Button>
            )}
            <Button
              variant="primary"
              size="lg"
              full
              onClick={save}
              loading={pending}
              disabled={pending || name.trim().length < 2 || kobo <= 0}
            >
              Save this room type
            </Button>
          </div>
        </>
      )}

      {draft.roomTypes.length > 0 && !adding && (
        <Button
          variant="primary"
          size="lg"
          full
          trailingIcon="chevron-right"
          onClick={advance}
          disabled={pending}
        >
          Continue
        </Button>
      )}

      <StaysNote>
        {draft.roomTypes.length === 0
          ? "At least one room type is needed before the hotel can go on the shelf, and it needs a rate before a guest can book it."
          : "The picture on each room is the property's cover. This database holds no photograph of a single room type."}
      </StaysNote>
    </>
  );
}
