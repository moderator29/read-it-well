"use client";

import { useState } from "react";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { Button } from "@/components/ui/Button";
import { setRestaurantProfileDraft } from "@/lib/host/actions";
import { CUISINES, PRICE_BANDS } from "@/lib/host/stays-setup";
import { StaysHero, StaysNote, StaysPlate, StaysTile, StaysTiles } from "./StaysParts";
import type { StaysStepProps } from "./types";

/**
 * YOUR RESTAURANT. `GOVERNING-11` screen three.
 *
 * WHAT WAS THERE. A group called "The venue" with the cuisines asked for as a
 * comma-separated string in a single text box, and a price band asked for as a
 * number. A restaurateur in Lekki typing `Nigerian, Continental` into a box
 * and hoping the comma was the right separator is how a facet column fills up
 * with `nigerian`, `Nigerian `, `Nigerian food` and ` continental`, and a
 * cuisine filter that can never group any of them.
 *
 * THE CHIPS FIX A DATA PROBLEM AND NOT A VISUAL ONE. `restaurant_profiles.
 * cuisines` is a free text array, so the six chips are an OFFER and not a
 * whitelist: a venue that is none of them can still say what it is, and that
 * is why the list lives in `lib/host/stays-setup.ts` beside the note that says
 * so. What the chips buy is that six restaurants serving the same food write
 * the same word.
 *
 * THE PRICE BAND IS FOUR MARKS AND NEVER A PRICE. `price_band` is an integer
 * one to four. No band on this screen carries a range in naira, because this
 * platform has never measured what a band costs in any Nigerian city and a
 * printed range would be an invented number on a screen a restaurateur would
 * reasonably believe.
 *
 * THE ADDRESS IS A ROW WITH A CHEVRON, as drawn, and it opens the business
 * step where the address was actually asked for. It is the restaurant twin of
 * the same row on `GOVERNING-10` screen one.
 */
export function RestaurantStep({
  draft,
  set,
  pending,
  run,
  saveText,
  setNotice,
  goTo,
  advance,
}: StaysStepProps) {
  const [cuisines, setCuisines] = useState<string[]>(draft.restaurant?.cuisines ?? []);
  const [band, setBand] = useState<number | null>(draft.restaurant?.priceBand ?? null);

  /* TWO LINES, AS DRAWN: the street, then where it is. The state joins the
     second line rather than taking a third, which is how the render writes
     "Plot 12, Admiralty Way / Lekki, Lagos" and how anybody writes an address
     on an envelope. */
  const addressLines = [draft.address, [draft.area, draft.city, draft.stateCode].filter(Boolean).join(", ")]
    .map((line) => line.trim())
    .filter(Boolean);

  const save = () =>
    saveText({}, () =>
      run(
        () => setRestaurantProfileDraft({ cuisines, priceBand: band }),
        () => {
          setNotice({ tone: "ok", text: "Your restaurant is saved." });
          advance();
        },
      ),
    );

  return (
    <>
      <StaysHero mark="concierge-bell" inline>
        <div className="min-w-0">
          <p className="nf-stays-title mt-0">Your restaurant</p>
          <p className="nf-stays-hint">Tell us about your restaurant.</p>
        </div>
      </StaysHero>

      <StaysPlate label="Restaurant name" htmlFor="stays-restaurant-name">
        <input
          id="stays-restaurant-name"
          className="nf-stays-input"
          value={draft.name}
          autoComplete="organization"
          onChange={(event) => set("name", event.target.value)}
        />
      </StaysPlate>

      <StaysPlate label="Cuisine">
        <div className="nf-stays-chips" role="group" aria-label="Cuisine">
          {CUISINES.map((cuisine) => {
            const chosen = cuisines.includes(cuisine);
            return (
              <button
                key={cuisine}
                type="button"
                aria-pressed={chosen}
                className="nf-stays-chip"
                onClick={() =>
                  setCuisines((current) =>
                    chosen ? current.filter((one) => one !== cuisine) : [...current, cuisine],
                  )
                }
              >
                {cuisine}
              </button>
            );
          })}
        </div>
        <p className="nf-stays-plate__note">
          {cuisines.length === 0
            ? "Pick every one that describes the food. It is how a guest finds you."
            : `${cuisines.length} chosen.`}
        </p>
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

      <StaysPlate label="Price band">
        <StaysTiles label="Price band" columns={4}>
          {PRICE_BANDS.map((option) => (
            <StaysTile
              key={option.value}
              title={option.marks}
              selected={band === option.value}
              onSelect={() => setBand(option.value)}
              variant="band"
            />
          ))}
        </StaysTiles>
        <p className="nf-stays-plate__note">
          {band === null
            ? "Four bands, cheapest to dearest. A band is not a price and none is printed anywhere."
            : (PRICE_BANDS.find((option) => option.value === band)?.meaning ?? "")}
        </p>
      </StaysPlate>

      <Button
        variant="primary"
        size="lg"
        full
        trailingIcon="chevron-right"
        onClick={save}
        loading={pending}
        disabled={pending || draft.name.trim().length < 2}
      >
        Continue
      </Button>

      <StaysNote>
        Nothing here puts a table on sale. The next screen is your opening hours and how many people
        you seat, and a person on our team reads the application before the venue goes on the shelf.
      </StaysNote>
    </>
  );
}
