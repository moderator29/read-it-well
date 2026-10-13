import { formatDate, formatNumber, formatRating, type Dictionary, type Locale } from "@vallo/i18n/core";
import { roleLine, type RoleLineCopy } from "@/lib/profile/role-line";
import type { BadgeTier } from "@/lib/trust/badge-tier";
import { mrzLines, passportNumber } from "./identity";
import type { PassportFacts, PassportLineKey } from "./model";

/**
 * THE PASSPORT, WORDED. Pure, client-safe, and the only place a fact becomes a
 * sentence on the document, the card in a chat and the owner's preview, so the
 * three can never read differently.
 *
 * A line with nothing behind it is not in the result at all: no "0 rentals",
 * no "No reviews", no placeholder. Each stat carries the key of the line an
 * owner can switch off, so the settings list and the document agree.
 */

export type PassportCopy = Dictionary["passportV2"];

export type PassportStat = {
  key: Extract<PassportLineKey, "rentals" | "stays" | "reviews" | "response" | "languages">;
  label: string;
  /** The figure, or the sentence for a text stat. */
  value: string;
  /** A second small line under the figure (the average rating). */
  sub: string | null;
  figure: boolean;
};

export type PassportLevel = {
  tier: BadgeTier;
  label: string;
  meaning: string;
};

export type PassportView = {
  userId: string;
  handle: string | null;
  name: string;
  initial: string;
  photo: string | null;
  photoAlt: string;
  role: string | null;
  joined: string | null;
  number: string;
  level: PassportLevel | null;
  stats: PassportStat[];
  mrz: [string, string];
};

function firstLetter(name: string): string {
  const first = Array.from(name.trim())[0];
  return first ? first.toLocaleUpperCase() : "V";
}

export function levelOf(tier: BadgeTier | null, copy: PassportCopy): PassportLevel | null {
  if (tier === null) return null;
  if (tier === "gold") return { tier, label: copy.levelVerified, meaning: copy.levelVerifiedMeaning };
  if (tier === "platinum") return { tier, label: copy.levelVallo, meaning: copy.levelValloMeaning };
  return { tier, label: copy.levelMember, meaning: copy.levelMemberMeaning };
}

export function buildPassportView(
  facts: PassportFacts,
  copy: PassportCopy,
  roleCopy: RoleLineCopy,
  locale: Locale,
): PassportView {
  const name = facts.name ?? copy.fallbackName;
  const number = passportNumber(facts.userId);
  const stats: PassportStat[] = [];
  if (facts.rentals) {
    stats.push({ key: "rentals", label: copy.rentalsLabel, value: formatNumber(facts.rentals, locale), sub: null, figure: true });
  }
  if (facts.stays) {
    stats.push({ key: "stays", label: copy.staysLabel, value: formatNumber(facts.stays, locale), sub: null, figure: true });
  }
  if (facts.reviewCount) {
    stats.push({
      key: "reviews",
      label: copy.reviewsLabel,
      value: formatNumber(facts.reviewCount, locale),
      sub: facts.reviewAverage ? copy.reviewsAverage.replace("{rating}", formatRating(facts.reviewAverage, locale)) : null,
      figure: true,
    });
  }
  if (facts.replyBand) {
    const text = { hour: copy.responseHour, hours: copy.responseHours, day: copy.responseDay }[facts.replyBand];
    stats.push({ key: "response", label: copy.responseLabel, value: text, sub: null, figure: false });
  }
  if (facts.pidginOk) {
    stats.push({ key: "languages", label: copy.languagesLabel, value: copy.pidginWelcome, sub: null, figure: false });
  }
  return {
    userId: facts.userId,
    handle: facts.handle,
    name,
    initial: firstLetter(name),
    photo: facts.photo,
    photoAlt: copy.photoAlt.replace("{name}", name),
    role: facts.roles ? roleLine(facts.roles, roleCopy) : null,
    joined: facts.joinedAt
      ? formatDate(new Date(facts.joinedAt), locale, { day: "numeric", month: "long", year: "numeric", timeZone: "Africa/Lagos" })
      : null,
    number,
    level: levelOf(facts.tier, copy),
    stats,
    mrz: mrzLines(facts),
  };
}
