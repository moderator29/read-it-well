"use client";

import { createContext, useContext, useMemo, useState } from "react";

/**
 * The chosen stay, shared by every control that depends on it.
 *
 * The reserve panel renders twice on one page (inline on phones, in the sticky
 * aside from `lg` up) and the sticky bottom bar has to quote the same total the
 * panel is about to charge. Three copies of the same date state would drift, so
 * the dates, the blocked-night check and the derived total live here once and
 * every consumer reads the same truth.
 *
 * Money stays in integer kobo throughout; only the formatter ever sees naira.
 */

const MS_PER_DAY = 86_400_000;

export function nightsBetween(checkIn: string, checkOut: string): number {
  const a = Date.parse(`${checkIn}T00:00:00Z`);
  const b = Date.parse(`${checkOut}T00:00:00Z`);
  if (Number.isNaN(a) || Number.isNaN(b)) return 0;
  return Math.round((b - a) / MS_PER_DAY);
}

export function addDaysIso(iso: string, days: number): string {
  const t = Date.parse(`${iso}T00:00:00Z`);
  if (Number.isNaN(t)) return iso;
  return new Date(t + days * MS_PER_DAY).toISOString().slice(0, 10);
}

export type StayDatesValue = {
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
  /**
   * How many guests this place takes, or null when that is not a knowable
   * thing about it. The host's own number where they declared one, the
   * two-per-bedroom convention where they did not.
   */
  capacity: number | null;
  setCheckIn: (value: string) => void;
  setCheckOut: (value: string) => void;
  setAdults: (value: number) => void;
  setChildren: (value: number) => void;
  /** Today in Lagos, computed on the server. */
  today: string;
  /** Nightly rate in kobo. */
  priceMinor: number;
  /** Nights in the current pick, 0 when the dates are incomplete. */
  nights: number;
  /** True when a booked or blocked night falls inside the pick. */
  clash: boolean;
  /** What is wrong with the current pick, in a sentence, or null. */
  hint: string | null;
  /** True when the pick is complete, legal and bookable. */
  ready: boolean;
  /** Rate times nights, in kobo. Zero until a full stay is picked. */
  subtotalMinor: number;
  /** Charged once per stay. Zero when the host charges neither. */
  cleaningMinor: number;
  serviceMinor: number;
  /**
   * What the guest will actually be asked for: subtotal plus both fees.
   *
   * This used to be the subtotal under the name "total", and the panel printed
   * it against a row labelled Total while `reserve()` went on to charge
   * subtotal plus cleaning plus service. The guest saw one number and was
   * billed a bigger one.
   */
  totalMinor: number;
};

const StayDatesContext = createContext<StayDatesValue | null>(null);

export function StayDatesProvider({
  today,
  blockedDates,
  priceMinor,
  cleaningMinor = 0,
  serviceMinor = 0,
  capacity,
  children,
}: {
  today: string;
  blockedDates: string[];
  priceMinor: number;
  /** Charged once per stay, in kobo. Default zero: most listings charge none. */
  cleaningMinor?: number;
  serviceMinor?: number;
  /** The host's declared capacity, or null when the place declares none. */
  capacity: number | null;
  children: React.ReactNode;
}) {
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  // Two adults is the common case, but never more than the place takes: a
  // one-guest studio must not open with a party the host would turn away.
  const [adults, setAdults] = useState(() => Math.max(1, Math.min(2, capacity ?? 2)));
  const [childCount, setChildCount] = useState(0);

  const blocked = useMemo(() => new Set(blockedDates), [blockedDates]);
  const nights = checkIn && checkOut ? nightsBetween(checkIn, checkOut) : 0;

  // A stay occupies every night in [checkIn, checkOut); any blocked night in
  // that range makes the pick impossible and says so before the round trip.
  const clash = useMemo(() => {
    if (!checkIn || nights < 1 || nights > 365) return false;
    for (let i = 0; i < nights; i += 1) {
      if (blocked.has(addDaysIso(checkIn, i))) return true;
    }
    return false;
  }, [blocked, checkIn, nights]);

  const value = useMemo<StayDatesValue>(() => {
    const hint =
      checkIn && checkIn < today
        ? "Check-in cannot be in the past. Pick today or later."
        : checkIn && checkOut && nights < 1
          ? "Check-out must be after check-in."
          : nights > 365
            ? "Stays can be up to 365 nights. Shorten the dates."
            : clash
              ? "Some of those nights are already taken. Pick different dates."
              : null;
    const ready = Boolean(checkIn && checkOut) && nights >= 1 && nights <= 365 && !hint;
    return {
      checkIn,
      checkOut,
      adults,
      children: childCount,
      capacity,
      setCheckIn,
      setCheckOut,
      setAdults,
      setChildren: setChildCount,
      today,
      priceMinor,
      nights,
      clash,
      hint,
      ready,
      subtotalMinor: nights >= 1 ? priceMinor * nights : 0,
      cleaningMinor: nights >= 1 ? cleaningMinor : 0,
      serviceMinor: nights >= 1 ? serviceMinor : 0,
      /* The same sum `reserve()` writes into `total_minor`, and the same order:
         nights, then the once-per-stay fees. If these two ever disagree the
         guest is the one who finds out. */
      totalMinor: nights >= 1 ? priceMinor * nights + cleaningMinor + serviceMinor : 0,
    };
  }, [
    adults,
    capacity,
    checkIn,
    checkOut,
    childCount,
    clash,
    cleaningMinor,
    nights,
    priceMinor,
    serviceMinor,
    today,
  ]);

  return <StayDatesContext.Provider value={value}>{children}</StayDatesContext.Provider>;
}

/** The stay, for controls that are always inside the provider. */
export function useStayDates(): StayDatesValue {
  const value = useContext(StayDatesContext);
  if (!value) {
    throw new Error("useStayDates must be used inside a StayDatesProvider");
  }
  return value;
}

/**
 * The stay, for controls that also render on pages without one: a rental and a
 * partner listing have no date picker at all, so their bar reads null here.
 */
export function useStayDatesOptional(): StayDatesValue | null {
  return useContext(StayDatesContext);
}
