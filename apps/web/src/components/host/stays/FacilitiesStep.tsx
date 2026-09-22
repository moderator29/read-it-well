"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { addAccommodationDraft } from "@/lib/host/actions";
import { AccommodationPhotoManager } from "../AccommodationPhotoManager";
import { FacilitiesPicker } from "../FacilitiesPicker";
import { StaysNote, StaysPlate } from "./StaysParts";
import type { StaysStepProps } from "./types";

/**
 * FACILITIES AND PHOTOS. `GOVERNING-10` screen four, and the shortlet's twin
 * of it.
 *
 * THREE THINGS SHARE THIS STEP and only two of them are drawn. The render puts
 * the facility tiles and the photographs on one screen, which is what the first
 * two blocks are. The pin is the third and it is drawn nowhere in `GOVERNING-10`
 * or `GOVERNING-11`, while `missingFrom` refuses to submit a property without
 * it. Somewhere is where it had to go, and the screen that is already about
 * where a property is and what it looks like is the least wrong place. It is
 * said here rather than left for somebody to discover.
 *
 * THE UPLOADER APPEARS ONLY ONCE THE PROPERTY EXISTS, because a photograph
 * hangs on the property row: a drop target that could not name what it was
 * attaching to would fail on the server after the file had already gone up,
 * over a Nigerian mobile connection, which is the most expensive possible
 * moment to fail.
 */
export function FacilitiesStep({ draft, userId, pending, run, setNotice, advance }: StaysStepProps & {
  userId: string;
}) {
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");

  const locate = () => {
    if (!navigator.geolocation) {
      setNotice({ tone: "error", text: "This device will not give a location. Type it instead." });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLat(position.coords.latitude.toFixed(6));
        setLng(position.coords.longitude.toFixed(6));
      },
      () => setNotice({ tone: "error", text: "The location was refused. Type it instead." }),
    );
  };

  const savePin = () =>
    run(
      () =>
        addAccommodationDraft({
          name: draft.accommodation?.name ?? draft.name,
          latitude: Number(lat),
          longitude: Number(lng),
        }),
      () => setNotice({ tone: "ok", text: "The pin is saved." }),
    );

  if (!draft.accommodation) {
    return (
      <StaysNote>
        Save the property first and the facilities and photographs hang on it. Go back one screen.
      </StaysNote>
    );
  }

  return (
    <>
      <FacilitiesPicker
        accommodationId={draft.accommodation.id}
        chosen={draft.accommodation.facilities}
      />

      <AccommodationPhotoManager
        accommodationId={draft.accommodation.id}
        userId={userId}
        photos={draft.accommodation.photos}
      />

      <StaysPlate
        label="The pin on the map"
        note={
          draft.accommodation.hasPin
            ? "A pin is on record. Setting it again replaces it."
            : "Required before the property can go on the shelf. Stand at the property and use your location, or type the two numbers."
        }
      >
        <div className="grid grid-cols-2 gap-[var(--nf-space-sm)]">
          <div>
            <label className="nf-stays-plate__label" htmlFor="stays-lat">
              Latitude
            </label>
            <input
              id="stays-lat"
              className="nf-stays-input"
              inputMode="decimal"
              value={lat}
              onChange={(event) => setLat(event.target.value)}
            />
          </div>
          <div>
            <label className="nf-stays-plate__label" htmlFor="stays-lng">
              Longitude
            </label>
            <input
              id="stays-lng"
              className="nf-stays-input"
              inputMode="decimal"
              value={lng}
              onChange={(event) => setLng(event.target.value)}
            />
          </div>
        </div>
        <div className="mt-[var(--nf-space-sm)] flex gap-[var(--nf-space-xs)]">
          <Button variant="secondary" leadingIcon="location" onClick={locate} disabled={pending}>
            Use my location
          </Button>
          <Button
            variant="secondary"
            onClick={savePin}
            disabled={pending || lat.trim() === "" || lng.trim() === ""}
            loading={pending}
          >
            Save the pin
          </Button>
        </div>
      </StaysPlate>

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

      <StaysNote>
        The first photograph is the cover, and it is the one a guest sees on the shelf. Nothing here
        is published until a person on our team has read the application.
      </StaysNote>
    </>
  );
}
