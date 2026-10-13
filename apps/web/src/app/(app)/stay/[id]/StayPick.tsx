"use client";

import { allInMinor, doorLines, type DoorCharge } from "@/lib/stays/door-total";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { countOf, formatMoney, formatNumber, type Locale } from "@vallo/i18n/core";
import { StayCost } from "./StayCost";
import { StayFoot } from "./StayFoot";
import { planAcceptsNights, ratePlanTotalMinor, reserveHref, type ReserveBase, type StayDetail } from "./detail-model";

/**
 * THE INSTANT BOOKING'S ONE PIECE OF STATE: which room and rate the guest has
 * chosen (D73, 7 October 2026: a fixed-price stay books like a hotel booking
 * API flow, search, pick a room and rate, see the total, book and pay).
 *
 * The page's server render picks the starting rate exactly as Book now always
 * did (`bookNowChoice`: the cheapest rate that can be cancelled for free, else
 * the cheapest). The rate cards (`RoomTypes`) let the guest choose another;
 * the cost card and the anchored foot follow the choice. Nothing here prices
 * anything new: the total is `ratePlanTotalMinor` (rate times nights, the same
 * figure the rate card states) and the link is `reserveHref`, the same
 * checkout address the rate cards' Reserve buttons opened. Checkout prices the
 * booking again on the server, as it always has.
 */
export type StayPickValue = { roomId: string; planId: string } | null;

type Ctx = {
  pick: StayPickValue;
  setPick: (next: StayPickValue) => void;
  initial: StayPickValue;
};

const PickContext = createContext<Ctx | null>(null);

export function StayPickProvider({ initial, children }: { initial: StayPickValue; children: ReactNode }) {
  const [pick, setPick] = useState<StayPickValue>(initial);
  const value = useMemo(() => ({ pick, setPick, initial }), [pick, initial]);
  return <PickContext.Provider value={value}>{children}</PickContext.Provider>;
}

export function useStayPick(): Ctx | null {
  return useContext(PickContext);
}

function resolvePick(detail: StayDetail, pick: StayPickValue, nights: number | null) {
  if (!pick || nights === null || nights <= 0) return null;
  const room = detail.roomTypes.find((candidate) => candidate.id === pick.roomId);
  const plan = room?.ratePlans.find((candidate) => candidate.id === pick.planId);
  if (!room || !plan || !planAcceptsNights(plan, nights)) return null;
  const total = ratePlanTotalMinor(plan, nights);
  return total === null ? null : { room, plan, total };
}

/** The cost card (reference 8) for the chosen rate; nothing until one is chosen. */
export function StayCostLive({
  detail,
  nights,
  locale,
  strip,
  totalFor,
  notesForInitial,
  door = [],
  guests = 1,
}: {
  detail: StayDetail;
  nights: number | null;
  locale: Locale;
  strip: { checkIn: { label: string; value: string }; checkOut: { label: string; value: string }; totalLabel: string };
  /** "Total for {count} nights". */
  totalFor: string;
  /** Why Book now chose the starting rate; true only while that rate is the one chosen. */
  notesForInitial: readonly string[];
  /**
   * The charges this stay declared for the door (V-57). With them the guest
   * reads the whole cost before booking: the nights, each charge for these
   * dates and this party, and the all-in figure. Vallo adds nothing on top.
   */
  door?: readonly DoorCharge[];
  guests?: number | null;
}) {
  const ctx = useStayPick();
  const chosen = resolvePick(detail, ctx?.pick ?? null, nights);
  if (!chosen || nights === null) return null;
  const isInitial = ctx?.initial?.roomId === chosen.room.id && ctx?.initial?.planId === chosen.plan.id;
  const lines = doorLines(door, nights, guests ?? 1);
  return (
    <>
    <StayCost
      locale={locale}
      strip={strip}
      line={{
        label: [chosen.room.name, chosen.plan.name].filter(Boolean).join(" · "),
        sub: `${formatMoney(chosen.plan.rateMinor, locale)} × ${countOf(nights, "nights", locale)}`,
        minor: chosen.total,
      }}
      total={{ label: totalFor.replace("{count}", formatNumber(nights, locale)), minor: chosen.total }}
      notes={isInitial ? notesForInitial : []}
    />
    {lines.length > 0 && (
      <section className="nf-panel nf-panel--card block p-md" data-testid="stay-all-in" aria-label="Every cost">
        <p className="nf-body-sm font-semibold">At the door</p>
        <ul className="mt-xs grid gap-2xs">
          {lines.map((line) => (
            <li key={line.key} className="flex items-start justify-between gap-sm nf-body-sm">
              <span className="min-w-0">
                {line.label}
                <span className="block nf-caption">
                  {formatMoney(line.minor, locale)} per {line.perLabel}
                  {line.refundable ? ", returned under the listed rules" : ""}
                </span>
              </span>
              <span className="shrink-0 nf-numeric">
                {line.forStayMinor === null ? "As used" : formatMoney(line.forStayMinor, locale)}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-sm flex items-start justify-between gap-sm nf-body-sm font-semibold">
          <span>Everything for this stay</span>
          <span className="nf-numeric">{formatMoney(allInMinor(chosen.total, lines), locale)}</span>
        </p>
        <p className="mt-2xs nf-caption">
          The nights and every charge the host listed. Nothing else may be asked for at the door, and Vallo adds no fee.
        </p>
      </section>
    )}
    </>
  );
}

/** The anchored foot, following the chosen rate. */
export function StayFootLive({
  detail,
  nights,
  locale,
  reserve,
  fromMinor,
  datesHref,
  labels,
}: {
  detail: StayDetail;
  nights: number | null;
  locale: Locale;
  reserve: ReserveBase;
  /** The nightly figure the headline states, for the foot before a rate is chosen. */
  fromMinor: number | null;
  datesHref: string;
  labels: { book: string; pickDates: string; seeRooms: string; perNight: string; totalFor: string; noRate: string };
}) {
  const ctx = useStayPick();
  const chosen = resolvePick(detail, ctx?.pick ?? null, nights);
  if (chosen && nights !== null) {
    return (
      <StayFoot
        locale={locale}
        figureMinor={chosen.total}
        caption={labels.totalFor.replace("{count}", formatNumber(nights, locale))}
        action={{ label: labels.book, href: reserveHref(reserve, chosen.room.id, chosen.plan.id), gate: "pay" }}
      />
    );
  }
  const datesPicked = nights !== null && nights > 0;
  return (
    <StayFoot
      locale={locale}
      figureMinor={fromMinor}
      caption={fromMinor !== null ? labels.perNight : labels.noRate}
      action={datesPicked ? { label: labels.seeRooms, href: "#rooms", gate: null } : { label: labels.pickDates, href: datesHref, gate: null }}
    />
  );
}
