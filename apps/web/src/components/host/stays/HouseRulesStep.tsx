"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Switch } from "@/components/ui/Switch";
import { addAccommodationDraft } from "@/lib/host/actions";
import {
  HOUSE_RULES,
  clockLabel,
  halfHours,
  houseRulesOn,
  mergeHouseRules,
  type HouseRuleId,
} from "@/lib/host/stays-setup";
import { StaysGlyph, StaysNote, StaysPlate, StaysTile, StaysTiles } from "./StaysParts";
import type { StaysStepProps } from "./types";

/**
 * HOUSE RULES AND CANCELLATION. `GOVERNING-11` screen two.
 *
 * WHAT WAS THERE. A textarea labelled "House rules (optional)" and a select
 * labelled "Cancellation policy", both of them buried at the bottom of the
 * hotel's property step. A shortlet host's two most consequential answers, the
 * ones a guest argues about later, were the two least prominent controls in
 * the flow.
 *
 * THE FOUR TOGGLES WRITE SENTENCES, NOT BOOLEANS, and that is the whole design
 * of this screen. `accommodations.house_rules` is text that a guest reads on
 * the stay page. Four new boolean columns would have meant a second place
 * where rules live and a translation back into English at read time; instead
 * each switch owns one line, `lib/host/stays-setup.ts` owns the wording, and
 * `mergeHouseRules` keeps every line the host wrote themselves. A host who
 * typed "The generator runs from 7pm" on the old step still has it after
 * turning a switch off here, which is the failure this function exists to
 * prevent.
 *
 * THE THREE CANCELLATION TILES ARE THE PLATFORM'S OWN POLICIES AND NOT THREE
 * WORDS. `GOVERNING-11` draws Flexible, Moderate and Strict with a refund
 * sentence under each. Those sentences are `cancellation_policies.summary`,
 * written once in the database and read here, so nothing on this screen is a
 * refund promise typed into a component. Where the estate publishes fewer than
 * three policies, fewer than three tiles are drawn: an empty tile offering a
 * policy that does not exist would be the invented number rule broken in the
 * most expensive possible place.
 */
export function HouseRulesStep({
  draft,
  policies,
  pending,
  run,
  setNotice,
  advance,
}: StaysStepProps) {
  const existing = draft.accommodation?.houseRules ?? "";
  const [on, setOn] = useState<HouseRuleId[]>(() => {
    const saved = houseRulesOn(existing);
    return existing.trim().length > 0
      ? saved
      : HOUSE_RULES.filter((rule) => rule.onByDefault).map((rule) => rule.id);
  });
  const [checkIn, setCheckIn] = useState(draft.accommodation?.checkInFrom || "14:00");
  const [checkOut, setCheckOut] = useState(draft.accommodation?.checkOutBy || "11:00");
  const [policy, setPolicy] = useState(draft.accommodation?.cancellationPolicyId ?? "");

  const times = halfHours();

  const save = () =>
    run(
      () =>
        addAccommodationDraft({
          name: draft.accommodation?.name ?? draft.name,
          houseRules: mergeHouseRules(existing, on),
          checkInFrom: checkIn,
          checkOutBy: checkOut,
          ...(policy ? { cancellationPolicyId: policy } : {}),
        }),
      () => {
        setNotice({ tone: "ok", text: "Your rules and cancellation are saved." });
        advance();
      },
    );

  return (
    <>
      <div className="flex flex-col gap-[var(--nf-space-xs)]">
        {HOUSE_RULES.map((rule) => {
          const lit = on.includes(rule.id);
          return (
            <div key={rule.id} className="nf-stays-rule">
              <StaysGlyph icon={rule.mark} />
              <span className="nf-stays-rule__label">{rule.label}</span>
              <Switch
                checked={lit}
                aria-label={rule.label}
                disabled={pending}
                onCheckedChange={(next) =>
                  setOn((current) =>
                    next ? [...current, rule.id] : current.filter((id) => id !== rule.id),
                  )
                }
              />
            </div>
          );
        })}
      </div>

      {/*
        TWO TIMES SIDE BY SIDE IN ONE PLATE, as drawn. They are half hours
        rather than a free time input because check-in is a half hour in every
        property anybody has ever stayed in, and a native select is the only
        control that gets a phone's own wheel.
      */}
      <section className="nf-stays-plate">
        <div className="grid grid-cols-2 gap-[var(--nf-space-md)]">
          <div>
            <label className="nf-stays-plate__label" htmlFor="stays-check-in">
              Check in time
            </label>
            <select
              id="stays-check-in"
              className="nf-field nf-field--glass nf-stays-select"
              value={checkIn}
              disabled={pending}
              onChange={(event) => setCheckIn(event.target.value)}
            >
              {times.map((time) => (
                <option key={time} value={time}>
                  {clockLabel(time)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="nf-stays-plate__label" htmlFor="stays-check-out">
              Check out time
            </label>
            <select
              id="stays-check-out"
              className="nf-field nf-field--glass nf-stays-select"
              value={checkOut}
              disabled={pending}
              onChange={(event) => setCheckOut(event.target.value)}
            >
              {times.map((time) => (
                <option key={time} value={time}>
                  {clockLabel(time)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/*
        THE REFUND SENTENCE IS UNDER THE GRID AND NOT INSIDE EACH TILE, which
        is the one place this screen departs from `GOVERNING-11` screen two.
        The render puts a short subtitle in every tile because its subtitles
        are three words long. Ours are `cancellation_policies.summary`, real
        sentences written for a guest, and three of them in three 100px columns
        at 390 came back from the browser as nine lines of two-word wrapping
        with a tick badge sitting on top of the first title. Refund terms are
        the last text on this platform that may be squeezed, so the names are
        the tiles and the chosen policy says its whole sentence under them.
      */}
      <StaysPlate
        label="Cancellation policy"
        note={
          policies.length === 0
            ? "This estate publishes no cancellation policies yet, so there is nothing to choose from. A rate cannot be sold without one."
            : (policies.find((option) => option.id === policy)?.summary ??
              "Pick one. A rate cannot be sold without a cancellation policy.")
        }
      >
        {policies.length > 0 && (
          <StaysTiles label="Cancellation policy" columns={Math.min(3, policies.length)}>
            {policies.slice(0, 3).map((option) => (
              <StaysTile
                key={option.id}
                title={option.name}
                selected={policy === option.id}
                onSelect={() => setPolicy(option.id)}
                variant="text"
              />
            ))}
          </StaysTiles>
        )}
      </StaysPlate>

      <Button
        variant="primary"
        size="lg"
        full
        trailingIcon="chevron-right"
        onClick={save}
        loading={pending}
        disabled={pending}
      >
        Continue
      </Button>

      <StaysNote>
        The rules you switch on are written onto the property word for word, and a guest reads them
        before they book. Anything you typed yourself stays where it is.
      </StaysNote>
    </>
  );
}
