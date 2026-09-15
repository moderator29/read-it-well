/**
 * The cancellation policy, as data rather than as a paragraph.
 *
 * One schedule governs every stay on the platform. It lives here, client-safe,
 * so the listing, the booking, the safety centre and the admin refund desk all
 * read the same three numbers and none of them can drift into telling somebody
 * a different story about their own money.
 *
 * Two rules that are easy to lose sight of and are the whole point:
 *
 * 1. Nothing has been taken until a stay is paid for. An unpaid hold can be
 *    let go at any hour for nothing, and the calendar reopens.
 * 2. Money is integer kobo. A refund is computed here, in kobo, and never by a
 *    percentage typed into a form somewhere.
 */

/** The three refund outcomes, most generous first. */
export type RefundTier = "full" | "half" | "none";

export type CancellationStop = {
  tier: RefundTier;
  /**
   * How many whole hours before check-in this stop closes. `null` means the
   * stop runs from check-in onwards and never closes.
   */
  closesHoursBeforeCheckIn: number | null;
  /** Basis points of the stay refunded, out of 10,000. Integer arithmetic. */
  refundBasisPoints: number;
  label: string;
  /** The line under the label, written for the guest, not for a lawyer. */
  detail: string;
};

/**
 * 72 hours, not 24. A Lagos guest cancelling a Friday stay on Wednesday
 * evening still leaves the host a whole working day to re-let the nights,
 * which is the only thing that makes a full refund fair to both sides.
 */
export const FULL_REFUND_HOURS = 72;

/** The schedule, in the order a person meets it. */
export const CANCELLATION_STOPS: CancellationStop[] = [
  {
    tier: "full",
    closesHoursBeforeCheckIn: FULL_REFUND_HOURS,
    refundBasisPoints: 10_000,
    label: "Everything back",
    detail:
      "Cancel more than 72 hours before check-in and the full amount you paid returns to your Vallo wallet, usually within minutes.",
  },
  {
    tier: "half",
    closesHoursBeforeCheckIn: 0,
    refundBasisPoints: 5_000,
    label: "Half back",
    detail:
      "Inside the last 72 hours, half comes back to you. The other half stays with the host, whose nights are now very hard to re-let.",
  },
  {
    tier: "none",
    closesHoursBeforeCheckIn: null,
    refundBasisPoints: 0,
    label: "Nothing back",
    detail:
      "Once check-in day has started the stay is the host's to keep. If you never got in, or the place was not what was listed, do not cancel: report it, and a person looks at the booking.",
  },
];

/** Hours between now and check-in. Negative once check-in has passed. */
function hoursUntil(checkInIso: string, now: Date): number {
  // A check-in date with no time is 15:00 in Lagos, the platform's standard
  // arrival hour. Written as a fixed offset because Nigeria does not observe
  // daylight saving and never has.
  const stamp = checkInIso.length <= 10 ? `${checkInIso}T15:00:00+01:00` : checkInIso;
  const checkIn = new Date(stamp).getTime();
  if (Number.isNaN(checkIn)) return 0;
  return (checkIn - now.getTime()) / 3_600_000;
}

export type RefundOutcome = {
  tier: RefundTier;
  stop: CancellationStop;
  /** What returns to the guest, in kobo. */
  refundMinor: number;
  /** What stays with the host, in kobo. Always `paidMinor - refundMinor`. */
  retainedMinor: number;
  hoursBeforeCheckIn: number;
};

/**
 * What a cancellation is worth right now.
 *
 * `paidMinor` is what the guest actually settled, in kobo. An unpaid hold
 * passes zero and correctly gets a zero refund of a zero payment, which is the
 * honest answer rather than a special case.
 */
export function refundForCancellation(
  paidMinor: number,
  checkInIso: string,
  now: Date = new Date(),
): RefundOutcome {
  const hours = hoursUntil(checkInIso, now);

  const stop =
    CANCELLATION_STOPS.find(
      (candidate) =>
        candidate.closesHoursBeforeCheckIn !== null &&
        hours > candidate.closesHoursBeforeCheckIn,
    ) ?? CANCELLATION_STOPS[CANCELLATION_STOPS.length - 1]!;

  const paid = Math.max(0, Math.trunc(paidMinor));
  const refundMinor = Math.round((paid * stop.refundBasisPoints) / 10_000);

  return {
    tier: stop.tier,
    stop,
    refundMinor,
    retainedMinor: paid - refundMinor,
    hoursBeforeCheckIn: hours,
  };
}

/**
 * The refund a stop is worth against a given total, in kobo. Used by the
 * timeline to show real figures for a real listing rather than percentages.
 */
export function refundAtStop(stop: CancellationStop, totalMinor: number): number {
  const total = Math.max(0, Math.trunc(totalMinor));
  return Math.round((total * stop.refundBasisPoints) / 10_000);
}

/* ------------------------------------------------------------------------- */
/*  Why a stay was cancelled, and what that does to the schedule              */
/* ------------------------------------------------------------------------- */

/**
 * The four cases /cancellations actually names.
 *
 * Three of them override the schedule to a full refund, because the page says
 * in plain words that they do: a host cancelling, a place that is not what was
 * listed, and a guest who could not get in. The schedule only ever governs a
 * cancellation the guest chose.
 *
 * These four strings are also the check constraint on `booking_refunds.reason`
 * in the database, so a reason that is not one of them cannot be recorded at
 * all. Keep the two in step.
 */
export const CANCELLATION_REASONS = [
  {
    code: "guest_choice",
    label: "The guest is cancelling",
    detail:
      "The published schedule decides the amount: everything back more than 72 hours out, half inside that, nothing once check-in day has started.",
    overridesToFull: false,
  },
  {
    code: "host_cancelled",
    label: "The host cancelled",
    detail:
      "Everything comes back, whatever the hour. The schedule never applies to a cancellation the guest did not choose.",
    overridesToFull: true,
  },
  {
    code: "not_as_listed",
    label: "The place was not what was listed",
    detail:
      "A standards matter rather than a cancellation. Full refund once a person has looked at it, which is what this decision is.",
    overridesToFull: true,
  },
  {
    code: "no_access",
    label: "The guest could not get in",
    detail:
      "A gate that would not open, an estate with no record of them, a key nobody brought. Full refund once it is confirmed.",
    overridesToFull: true,
  },
] as const;

export type CancellationReason = (typeof CANCELLATION_REASONS)[number]["code"];

/** The four codes on their own, for a schema to validate against. */
export const CANCELLATION_REASON_CODES = CANCELLATION_REASONS.map(
  (reason) => reason.code,
) as unknown as readonly [CancellationReason, ...CancellationReason[]];

export function cancellationReason(code: CancellationReason) {
  return CANCELLATION_REASONS.find((reason) => reason.code === code) ?? CANCELLATION_REASONS[0];
}

/**
 * What a cancellation is worth given WHY it is happening.
 *
 * This is the one function the refund desk calls, so the console can never
 * compute a figure the published policy does not already promise. It can be
 * more generous than the schedule, in the three cases the page names and only
 * those, and it can never be less generous than the schedule: there is no code
 * path here that returns below `refundForCancellation`.
 */
export function refundForReason(
  reason: CancellationReason,
  paidMinor: number,
  checkInIso: string,
  now: Date = new Date(),
): RefundOutcome {
  const scheduled = refundForCancellation(paidMinor, checkInIso, now);
  if (!cancellationReason(reason).overridesToFull) return scheduled;

  const paid = Math.max(0, Math.trunc(paidMinor));
  const full = CANCELLATION_STOPS[0]!;
  return {
    tier: "full",
    stop: full,
    refundMinor: paid,
    retainedMinor: 0,
    hoursBeforeCheckIn: scheduled.hoursBeforeCheckIn,
  };
}
