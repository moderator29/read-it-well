"use client";

import { useState } from "react";
import type { Dictionary, Locale } from "@vallo/i18n";
import { Amount } from "@/components/ui/Amount";
import { ButtonLink } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { StatusPill } from "@/components/ui/StatusPill";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { ICON, Row, RowList, TYPE } from "@/components/app/Screen";
import {
  MEAL_PLAN_KEY,
  ROOM_CATEGORY_KEY,
  orderedRooms,
  planAcceptsNights,
  ratePlanTotalMinor,
  roomFromMinor,
  type StayDetail,
  type StayRatePlan,
  type StayRoomType,
} from "./detail-model";

/**
 * THE ROOMS, AS ROWS.
 *
 * A hotel is a list of rooms and a room is a list of rates, and the mistake
 * every booking site makes is drawing that as a wall of cards with a price in
 * each corner. Rows: the name, who it sleeps, what the rate includes, and the
 * price, in one boxed list, the way the rest of this product draws a run of
 * like things. Tapping one opens its rate plans, which is the only place a
 * choice actually has to be made.
 *
 * WHAT THE RATE INCLUDES IS ON THE ROW, not behind the tap, because it is the
 * difference between two numbers that otherwise look like the same room at
 * two prices.
 */

type StaysCopy = Dictionary["stayDetail"];

/** The checkout link's ingredients: the stay, the dates and the party. */
export type ReserveBase = {
  stayId: string;
  checkIn?: string;
  checkOut?: string;
  guests: number;
  /** The route the link lands on; the real checkout unless a harness says otherwise. */
  basePath?: string;
};

/* THE FIRST-PARTY CHECKOUT, ALWAYS. This lane never borrows a step from the
   third-party one: a room on Vallo is reserved and paid for on Vallo. */
export function reserveHref(base: ReserveBase, roomTypeId: string, ratePlanId: string): string {
  const search = new URLSearchParams({ stay: base.stayId, room: roomTypeId, rate: ratePlanId });
  if (base.checkIn && base.checkOut) {
    search.set("checkIn", base.checkIn);
    search.set("checkOut", base.checkOut);
  }
  search.set("guests", String(base.guests));
  return `${base.basePath ?? "/checkout"}?${search.toString()}`;
}

export function RoomTypes({
  detail,
  guests,
  nights,
  locale,
  copy,
  reserve,
}: {
  detail: StayDetail;
  guests: number;
  nights: number | null;
  locale: Locale;
  copy: StaysCopy;
  /**
   * What the first-party checkout link is built from, as data: this is a
   * client component under a server page, and a function cannot cross that
   * line. The link itself is assembled here by `reserveHref`.
   */
  reserve: ReserveBase;
}) {
  const [open, setOpen] = useState<StayRoomType | null>(null);
  const rooms = orderedRooms(detail, guests);

  return (
    <>
      <RowList boxed>
        {rooms.map((room) => {
          const from = roomFromMinor(room, nights);
          const fits = room.sleeps >= guests;
          const includes = room.ratePlans[0]
            ? copy.meal[MEAL_PLAN_KEY[room.ratePlans[0].mealPlan]]
            : null;
          return (
            <Row key={room.id} tappable className="items-start">
              <button
                type="button"
                onClick={() => setOpen(room)}
                className="flex w-full items-start gap-sm text-left"
                aria-label={copy.seeRates.replace("{room}", room.name)}
              >
                <span className="nf-role-mark mt-3xs shrink-0" aria-hidden="true">
                  <UiIcon name="bed" size={ICON.row} />
                </span>

                <span className="min-w-0 flex-1">
                  <span className={`block ${TYPE.rowTitle}`}>{room.name}</span>
                  <span className={`mt-3xs block ${TYPE.rowMeta}`}>
                    {copy.category[ROOM_CATEGORY_KEY[room.category]]}
                    {" · "}
                    {copy.sleeps.replace("{count}", String(room.sleeps))}
                    {room.sizeSqm ? ` · ${room.sizeSqm} m²` : ""}
                  </span>
                  {includes && <span className={`mt-3xs block ${TYPE.rowMeta}`}>{includes}</span>}
                  {!fits && (
                    <span className="mt-2xs block">
                      <StatusPill tone="neutral">{copy.tooSmall}</StatusPill>
                    </span>
                  )}
                </span>

                <span className="shrink-0 text-right">
                  {from !== null ? (
                    <>
                      <span className={`block ${TYPE.label}`}>{copy.from}</span>
                      <span className="nf-numeric block nf-body font-semibold text-[var(--nf-content-primary)]">
                        <Amount minorUnits={from} locale={locale} />
                      </span>
                      <span className={`block ${TYPE.caption}`}>{copy.perNight}</span>
                    </>
                  ) : (
                    <span className={`block ${TYPE.rowMeta}`}>{copy.noRate}</span>
                  )}
                </span>
              </button>
            </Row>
          );
        })}
      </RowList>

      {open && (
        <RatePlanSheet
          room={open}
          nights={nights}
          locale={locale}
          copy={copy}
          reserve={reserve}
          onClose={() => setOpen(null)}
        />
      )}
    </>
  );
}

/**
 * The rates for one room.
 *
 * Each plan states what it includes, what it costs for THIS stay (not per
 * night, because the total is the thing being decided), and the cancellation
 * policy's own sentence. A plan that cannot take these dates is drawn as
 * refused, with the reason, rather than left out: "why can I not book the
 * cheap one" is answered on the screen instead of at the payment step.
 */
function RatePlanSheet({
  room,
  nights,
  locale,
  copy,
  reserve,
  onClose,
}: {
  room: StayRoomType;
  nights: number | null;
  locale: Locale;
  copy: StaysCopy;
  reserve: ReserveBase;
  onClose: () => void;
}) {
  return (
    <Sheet open onOpenChange={(next) => !next && onClose()} title={room.name} detents={[0.62, 0.92]}>
      {room.description && <p className={TYPE.body}>{room.description}</p>}

      {room.ratePlans.length === 0 ? (
        <p className={`mt-row ${TYPE.rowMeta}`}>{copy.noRatesYet}</p>
      ) : (
        <ul className="mt-row space-y-row">
          {room.ratePlans.map((plan) => (
            <li key={plan.id}>
              <PlanCard
                plan={plan}
                nights={nights}
                locale={locale}
                copy={copy}
                href={reserveHref(reserve, room.id, plan.id)}
              />
            </li>
          ))}
        </ul>
      )}
    </Sheet>
  );
}

function PlanCard({
  plan,
  nights,
  locale,
  copy,
  href,
}: {
  plan: StayRatePlan;
  nights: number | null;
  locale: Locale;
  copy: StaysCopy;
  href: string;
}) {
  const total = ratePlanTotalMinor(plan, nights);
  const accepts = planAcceptsNights(plan, nights);
  const refusal =
    accepts || nights === null
      ? null
      : nights < plan.minStayNights
        ? copy.minStay.replace("{count}", String(plan.minStayNights))
        : copy.maxStay.replace("{count}", String(plan.maxStayNights ?? 0));

  return (
    <div className="nf-card rounded-[var(--nf-radius-lg)] p-card-sm">
      <div className="flex items-start justify-between gap-row">
        <div className="min-w-0">
          <p className={TYPE.rowTitle}>{plan.name}</p>
          <p className={`mt-3xs ${TYPE.rowMeta}`}>{copy.meal[MEAL_PLAN_KEY[plan.mealPlan]]}</p>
        </div>
        <div className="shrink-0 text-right">
          <span className="nf-numeric block nf-body font-semibold text-[var(--nf-content-primary)]">
            <Amount minorUnits={plan.rateMinor} locale={locale} />
          </span>
          <span className={`block ${TYPE.caption}`}>{copy.perNight}</span>
        </div>
      </div>

      {/* The cancellation policy in its own words, from the policy's summary
          column. Not paraphrased here: a refund rule a screen rewrote is a
          refund rule nobody can be held to. */}
      {plan.policy && (
        <p className={`mt-row flex items-start gap-inline-tight ${TYPE.rowMeta}`}>
          <UiIcon
            name="verified"
            size={ICON.inline}
            className={`mt-3xs shrink-0 ${
              plan.policy.freeUntilHours !== null ? "text-[var(--nf-state-success)]" : ""
            }`}
          />
          <span className="min-w-0">{plan.policy.summary}</span>
        </p>
      )}

      {refusal ? (
        <p role="status" className={`mt-row ${TYPE.rowMeta}`}>
          {refusal}
        </p>
      ) : total !== null ? (
        <div className="mt-row flex items-end justify-between gap-row">
          <p className="min-w-0">
            <span className={`block ${TYPE.label}`}>
              {copy.totalFor.replace("{count}", String(nights ?? 0))}
            </span>
            <span className="nf-numeric block nf-h3 text-[var(--nf-content-primary)]">
              <Amount minorUnits={total} locale={locale} />
            </span>
          </p>
          {/* The FIRST-PARTY checkout, always. This lane never borrows a step
              from the third-party one. */}
          <ButtonLink href={href} variant="primary" className="shrink-0">
            {copy.reserve}
          </ButtonLink>
        </div>
      ) : (
        <p className={`mt-row ${TYPE.rowMeta}`}>{copy.pickDatesForTotal}</p>
      )}
    </div>
  );
}
