"use client";

import { useState } from "react";
import { countOf, formatMoney } from "@vallo/i18n/core";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { Button } from "@/components/ui/Button";
import { Switch } from "@/components/ui/Switch";
import { addAccommodationDraft, addRatePlanDraft } from "@/lib/host/actions";
import { MEAL_PLANS, mealPlanLabel, noticeLabel } from "@/lib/host/stays-setup";
import { StaysNote, StaysPlate, StaysRow, StaysTile, StaysTiles } from "./StaysParts";
import type { StaysStepProps } from "./types";

/**
 * RATES. `GOVERNING-10` screen three.
 *
 * WHAT WAS THERE. A group headed "Its first rate" with a name box, a meals
 * select and a policy select, attached to the room type form, and no way at
 * all to see a rate once it had been saved. A hotel with two room types and
 * four rates could not read any of them back.
 *
 * THE DRAWN SCREEN IS A SCREEN ABOUT MONEY, so this one is too: a card per
 * room type, and inside it the nightly price of every plan that room is sold
 * on, in a list with a hairline between the rows. Every figure comes out of
 * `rate_plans.rate_minor`, which is integer kobo, and every figure is printed
 * by `formatMoney` and by nothing else.
 *
 * THE THUMBNAIL IS THE PROPERTY'S AND THE CODE SAYS SO. The render draws a
 * photograph of the room. `room_types` has no photographs: the only stay
 * imagery this database holds hangs on the accommodation. The property's cover
 * stands in where there is one, and the room's glass mark where there is not,
 * because inventing a picture of a room nobody has photographed is worse than
 * drawing a mark.
 *
 * THE CANCELLATION BLOCK IS DRAWN ONCE AND THE RENDER DRAWS IT PER CARD, which
 * is the one deliberate departure on this screen. `accommodations.
 * cancellation_policy_id` is a property-level column and the render's card is
 * the only room type it draws, so per card and once are the same picture there
 * and not here. Four copies of one control, all of them setting the same
 * column, is a control that lies about its own scope.
 *
 * FREE CANCELLATION IS NOT A BOOLEAN WE INVENTED. `cancellation_policies.
 * is_free_until_hours` is null when a policy is never free and a number of
 * hours when it is. The switch picks between those two sets and the row under
 * it picks which of the free ones, so the words on the screen are the words in
 * the column.
 */
export function RatesStep({
  draft,
  policies,
  locale,
  pending,
  fieldErrors,
  run,
  setNotice,
  advance,
}: StaysStepProps) {
  const cover = draft.accommodation?.photos[0]?.url ?? null;
  const free = policies.filter((policy) => policy.isFreeUntilHours !== null);
  const strict = policies.filter((policy) => policy.isFreeUntilHours === null);
  const chosen =
    policies.find((policy) => policy.id === draft.accommodation?.cancellationPolicyId) ?? null;
  const isFree = chosen !== null && chosen.isFreeUntilHours !== null;

  const setPolicy = (id: string, said: string) =>
    run(
      () =>
        addAccommodationDraft({
          name: draft.accommodation?.name ?? "",
          cancellationPolicyId: id,
        }),
      () => setNotice({ tone: "ok", text: said }),
    );

  if (draft.roomTypes.length === 0) {
    return (
      <StaysNote>
        There is nothing to price yet. Add a room type on the previous screen and its rates appear
        here.
      </StaysNote>
    );
  }

  return (
    <>
      {draft.roomTypes.map((room) => (
        <article key={room.id} className="nf-stays-card">
          <div className="nf-stays-card__head">
            <span className="nf-stays-thumb">
              {cover ? (
                /* eslint-disable-next-line @next/next/no-img-element -- a storage
                   URL on a surface that is never indexed and never prerendered;
                   the optimiser would proxy it for no gain. */
                <img src={cover} alt="" />
              ) : (
                <UiIcon name="bed" size={24} />
              )}
            </span>
            <span className="min-w-0 flex-1">
              <span className="nf-stays-card__title block">{room.name}</span>
              <span className="nf-stays-row__meta">
                {countOf(room.unitsTotal, "rooms", locale)}, sleeps {room.sleeps}
              </span>
            </span>
          </div>

          {room.rates.length > 0 ? (
            <div className="nf-stays-list">
              {room.rates.map((rate) => (
                <StaysRow
                  key={rate.id}
                  trailing={
                    <span className="nf-stays-price">
                      {formatMoney(rate.rateMinor, locale)}
                      <span className="nf-stays-price__unit">/ night</span>
                    </span>
                  }
                >
                  <span className="nf-stays-row__value">{mealPlanLabel(rate.mealPlan)}</span>
                </StaysRow>
              ))}
            </div>
          ) : (
            <p className="nf-stays-plate__note">
              No rate yet. This room cannot be booked until it has one.
            </p>
          )}

          <RateEditor
            roomTypeId={room.id}
            baseRateMinor={room.baseRateMinor}
            taken={room.rates.map((rate) => rate.mealPlan)}
            policyId={chosen?.id ?? policies[0]?.id ?? ""}
            locale={locale}
            pending={pending}
            fieldErrors={fieldErrors}
            run={run}
            setNotice={setNotice}
          />
        </article>
      ))}

      <StaysPlate label="Cancellation">
        <div className="nf-stays-list">
          <StaysRow
            trailing={
              <Switch
                checked={isFree}
                aria-label="Free cancellation"
                disabled={pending || (isFree ? strict.length === 0 : free.length === 0)}
                onCheckedChange={(next) => {
                  const pick = next ? free[0] : strict[0];
                  if (!pick) return;
                  setPolicy(
                    pick.id,
                    next ? "Guests can cancel free of charge." : "This rate is not refundable.",
                  );
                }}
              />
            }
          >
            <span className="nf-stays-row__value">Free cancellation</span>
          </StaysRow>

          {isFree && (
            <StaysRow>
              {/*
                THE RENDER'S SECOND ROW, "Cancel up to / 2 days before
                arrival", with its chevron. The chevron is a select's rather
                than a link's, because this row is a CHOICE between the free
                policies the platform actually publishes and not a page that
                opens: an affordance that goes nowhere is worse than one that
                is drawn a few pixels differently.
              */}
              <label className="nf-stays-row__meta block" htmlFor="stays-free-until">
                Cancel up to
              </label>
              <select
                id="stays-free-until"
                className="nf-field nf-field--glass nf-stays-select"
                value={chosen?.id ?? ""}
                disabled={pending}
                onChange={(event) =>
                  setPolicy(event.target.value, "The cancellation window is saved.")
                }
              >
                {free.map((policy) => (
                  <option key={policy.id} value={policy.id}>
                    {noticeLabel(policy.isFreeUntilHours ?? 0)} before arrival
                  </option>
                ))}
              </select>
            </StaysRow>
          )}
        </div>
        <p className="nf-stays-plate__note">
          {chosen ? chosen.summary : "No policy chosen yet. A rate needs one before it can be sold."}
        </p>
      </StaysPlate>

      <Button
        variant="primary"
        size="lg"
        full
        trailingIcon="chevron-right"
        onClick={advance}
        disabled={pending || !chosen}
      >
        Continue
      </Button>

      <StaysNote>
        {chosen
          ? "The policy is the property\u2019s and applies to every room in it. Every price here is what a guest pays for the night, and this platform adds nothing to it."
          : "Choose a cancellation policy before going on. A rate cannot be sold without one."}
      </StaysNote>
    </>
  );
}

/**
 * ADD ONE RATE TO ONE ROOM.
 *
 * The meal plans already sold on this room are not offered again: a room
 * cannot have two room-only rates, and letting somebody create one only to
 * meet a unique-index refusal they cannot act on is the failure this whole
 * build keeps finding. When all four are taken the editor says so and draws
 * nothing.
 */
function RateEditor({
  roomTypeId,
  baseRateMinor,
  taken,
  policyId,
  locale,
  pending,
  fieldErrors,
  run,
  setNotice,
}: {
  roomTypeId: string;
  baseRateMinor: number;
  taken: string[];
  policyId: string;
  locale: StaysStepProps["locale"];
  pending: boolean;
  fieldErrors: Record<string, string>;
  run: StaysStepProps["run"];
  setNotice: StaysStepProps["setNotice"];
}) {
  const open = MEAL_PLANS.filter((plan) => !taken.includes(plan.id));
  const [adding, setAdding] = useState(false);
  const [plan, setPlan] = useState(open[0]?.id ?? "room_only");
  const [naira, setNaira] = useState("");

  if (open.length === 0) {
    return (
      <p className="nf-stays-plate__note">Every meal plan on this room already has a price.</p>
    );
  }

  /* Naira typed in a box to integer kobo, once, at the boundary. The room's
     own base rate stands in when the box is empty, because that is a figure
     the host has already given rather than one this screen made up. */
  const typed = Number.parseFloat(naira.replace(/[^0-9.]/g, ""));
  const kobo =
    Number.isFinite(typed) && typed > 0 ? Math.round(typed * 100) : naira.trim() ? 0 : baseRateMinor;

  if (!adding) {
    return (
      <button
        type="button"
        className="nf-stays-row w-full"
        onClick={() => setAdding(true)}
        disabled={pending}
      >
        <span className="nf-stays-glyph">
          <UiIcon name="plus" size={16} />
        </span>
        <span className="min-w-0 flex-1 text-left">
          <span className="nf-stays-row__value">Add a rate</span>
        </span>
        <UiIcon name="chevron-right" size={20} className="shrink-0 text-[var(--nf-content-muted)]" />
      </button>
    );
  }

  return (
    <div className="mt-[var(--nf-space-sm)]">
      <StaysTiles label="What the night includes" columns={2}>
        {open.map((option) => (
          <StaysTile
            key={option.id}
            title={option.label}
            meaning={option.meaning}
            selected={plan === option.id}
            onSelect={() => setPlan(option.id)}
            variant="text"
          />
        ))}
      </StaysTiles>

      <label className="nf-stays-plate__label mt-[var(--nf-space-sm)] block" htmlFor={`rate-${roomTypeId}`}>
        Nightly price
      </label>
      <input
        id={`rate-${roomTypeId}`}
        className="nf-field nf-field--glass nf-stays-input"
        inputMode="decimal"
        value={naira}
        placeholder={String(Math.round(baseRateMinor / 100))}
        aria-invalid={fieldErrors.rateMinor ? true : undefined}
        onChange={(event) => setNaira(event.target.value)}
      />
      <p className="nf-stays-plate__note">
        {kobo > 0 ? `Stored as ${formatMoney(kobo, locale)} a night.` : "Enter what a night costs."}
      </p>

      <div className="mt-[var(--nf-space-sm)] flex gap-[var(--nf-space-xs)]">
        <Button variant="secondary" size="lg" onClick={() => setAdding(false)} disabled={pending}>
          Cancel
        </Button>
        <Button
          variant="primary"
          size="lg"
          full
          loading={pending}
          disabled={pending || kobo <= 0 || !policyId}
          onClick={() =>
            run(
              () =>
                addRatePlanDraft({
                  roomTypeId,
                  name: mealPlanLabel(plan),
                  mealPlan: plan,
                  cancellationPolicyId: policyId,
                  rateMinor: kobo,
                }),
              () => {
                setAdding(false);
                setNaira("");
                setNotice({ tone: "ok", text: `${mealPlanLabel(plan)} is priced.` });
              },
            )
          }
        >
          Save this rate
        </Button>
      </div>
    </div>
  );
}
