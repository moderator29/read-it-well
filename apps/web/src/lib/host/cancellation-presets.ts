/**
 * THE CANCELLATION POLICIES A HOST PICKS FROM, AND HOW EVERY ONE IS SAID.
 *
 * Four presets, the shape Airbnb and Booking.com use: Flexible, Moderate, Firm
 * and Strict (`20261013062641_four_preset_cancellation_policies.sql`). The
 * refund tiers live in `cancellation_policies.rules` as
 * `[{hours_before, refund_bps}]`, and `refundLines` turns those tiers into the
 * sentences the host reads in the wizard and the guest reads on the stay page
 * and at checkout, so the words can never say something the tiers do not.
 *
 * Pure and client-safe: the wizard, the stay page and checkout all read it.
 */

import { countOf, type Locale } from "@vallo/i18n/core";

export const PRESET_ORDER = ["flexible", "moderate", "firm", "strict"] as const;
export type PresetCode = (typeof PRESET_ORDER)[number];

/** A policy as the screens hold it. `rules` is the jsonb, read defensively. */
export type PolicyLike = {
  id: string;
  name: string;
  summary: string;
  isFreeUntilHours: number | null;
  rules?: unknown;
  preset?: string | null;
};

export type RefundTier = { hoursBefore: number; refundBps: number };

/** The tiers in a policy's rules, most notice first, or [] when unreadable. */
export function refundTiers(rules: unknown): RefundTier[] {
  if (!Array.isArray(rules)) return [];
  const tiers: RefundTier[] = [];
  for (const entry of rules) {
    if (typeof entry !== "object" || entry === null) return [];
    const row = entry as Record<string, unknown>;
    const hours = row.hours_before;
    const bps = row.refund_bps;
    if (typeof hours !== "number" || !Number.isInteger(hours) || hours < 0) return [];
    if (typeof bps !== "number" || !Number.isInteger(bps) || bps < 0 || bps > 10_000) return [];
    tiers.push({ hoursBefore: hours, refundBps: bps });
  }
  return tiers.sort((a, b) => b.hoursBefore - a.hoursBefore);
}

/** "24 hours", "5 days": whole days when the hours are whole days. */
export function noticeWords(hours: number, locale: Locale = "en"): string {
  return hours > 0 && hours % 24 === 0 ? countOf(hours / 24, "days", locale) : countOf(hours, "hours", locale);
}

function refundWords(bps: number): string {
  if (bps >= 10_000) return "a full refund";
  if (bps <= 0) return "no refund";
  const percent = bps / 100;
  return `${Number.isInteger(percent) ? percent : percent.toFixed(1)}% back`;
}

/**
 * The policy's tiers, one plain sentence each, in the order a guest meets
 * them. Falls back to the policy's own summary when the tiers are unreadable,
 * so a screen always says something true.
 */
export function refundLines(policy: Pick<PolicyLike, "rules" | "summary">, locale: Locale = "en"): string[] {
  const tiers = refundTiers(policy.rules);
  if (tiers.length === 0) return [policy.summary];
  const lines: string[] = [];
  tiers.forEach((tier, index) => {
    const outcome = refundWords(tier.refundBps);
    const earlier = tiers[index - 1];
    if (index === 0) {
      lines.push(
        tier.hoursBefore > 0
          ? `Cancel at least ${noticeWords(tier.hoursBefore, locale)} before check-in: ${outcome}.`
          : `Cancel any time before check-in: ${outcome}.`,
      );
    } else if (tier.hoursBefore > 0 && earlier) {
      lines.push(
        `Cancel between ${noticeWords(tier.hoursBefore, locale)} and ${noticeWords(earlier.hoursBefore, locale)} before check-in: ${outcome}.`,
      );
    } else if (earlier) {
      lines.push(`Cancel less than ${noticeWords(earlier.hoursBefore, locale)} before check-in: ${outcome}.`);
    }
  });
  const last = tiers[tiers.length - 1];
  if (last && last.hoursBefore > 0) {
    lines.push(`Cancel less than ${noticeWords(last.hoursBefore, locale)} before check-in: no refund.`);
  }
  return lines;
}

/**
 * WHAT EVERY POLICY MEANS IN NIGERIA, said under its tiers to host and guest.
 *
 * The deadlines are counted on the Lagos clock from check-in at the
 * property's own stated time (the frozen terms carry that hour), refunds are
 * paid in naira back through the payment provider the guest paid with, and a
 * caution deposit is never kept by a policy: it is returned under the rules
 * listed with it.
 */
export function policyFootLines(checkInFrom?: string | null): string[] {
  const time = checkInFrom && /^\d{2}:\d{2}/.test(checkInFrom) ? clock(checkInFrom.slice(0, 5)) : null;
  return [
    time
      ? `Deadlines are counted in Lagos time from check-in at ${time}.`
      : "Deadlines are counted in Lagos time from the property's check-in time.",
    "Refunds are paid in naira to the card or account you paid with, through our payment provider.",
    "A caution deposit is always returned under the rules listed with it, whatever the policy.",
  ];
}

function clock(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number) as [number, number];
  return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}

/** The whole hour of a stated check-in time, for the frozen terms; 15 when unknown. */
export function checkInHourOf(checkInFrom?: string | null): number {
  const hour = checkInFrom ? Number(checkInFrom.slice(0, 2)) : Number.NaN;
  return Number.isInteger(hour) && hour >= 0 && hour <= 23 ? hour : 15;
}

/**
 * The policies a host is offered: the four presets in their order when the
 * estate carries them, every policy otherwise (an estate where the preset
 * migration has not run still has something to choose).
 */
export function offeredPolicies<T extends PolicyLike>(policies: readonly T[]): T[] {
  const presets = policies
    .filter((policy) => PRESET_ORDER.includes(policy.preset as PresetCode))
    .sort(
      (a, b) =>
        PRESET_ORDER.indexOf(a.preset as PresetCode) - PRESET_ORDER.indexOf(b.preset as PresetCode),
    );
  return presets.length > 0 ? presets : [...policies];
}

/* ------------------------------------------------------- the restaurant's */

/**
 * How long a confirmed table is held for a late party, and how much notice a
 * restaurant asks for a cancellation. Requests, never charges: a table on
 * Vallo is free to ask for and the bill is paid at the restaurant.
 * Mirrors the CHECKs in `20261013090200_...`.
 */
export const HOLD_MINUTES = [10, 15, 20, 30] as const;
export const CANCEL_NOTICE_HOURS = [1, 2, 4, 24] as const;
export const DEFAULT_HOLD_MINUTES = 15;
export const DEFAULT_CANCEL_NOTICE_HOURS = 2;

/** The restaurant's house rules for a table, as the guest reads them. */
export function tableRuleLines(
  rules: { holdMinutes: number | null; cancelNoticeHours: number | null; sittingMinutes: number | null },
  locale: Locale = "en",
): string[] {
  const lines = ["Asking for a table is free. The restaurant confirms it when a table is free, and you pay the bill at the restaurant."];
  if (rules.cancelNoticeHours) {
    lines.push(`Please cancel at least ${noticeWords(rules.cancelNoticeHours, locale)} ahead if you cannot come.`);
  }
  if (rules.holdMinutes) {
    lines.push(`A table is held for ${rules.holdMinutes} minutes after the booked time.`);
  }
  if (rules.sittingMinutes) {
    lines.push(`A table is yours for about ${sittingWords(rules.sittingMinutes, locale)}.`);
  }
  return lines;
}

export function sittingWords(minutes: number, locale: Locale = "en"): string {
  if (minutes % 60 === 0) return countOf(minutes / 60, "hours", locale);
  return `${countOf(Math.floor(minutes / 60), "hours", locale)} ${minutes % 60} minutes`;
}
