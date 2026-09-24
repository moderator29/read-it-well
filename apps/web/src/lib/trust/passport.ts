import { formatDate, formatNumber, type Dictionary, type Locale } from "@vallo/i18n";

/**
 * THE RENTER PASSPORT (V-100), AS LINES. Pure.
 *
 * Every fact is one Vallo wrote itself: a confirmed phone (V-50), a NIMC
 * match with its date (V-49), inspections attended as recorded by the gate
 * handshake (V-35), tenancies paid through Vallo, and the joining month. A
 * false, a null or a zero prints NOTHING: a passport never says "no phone" or
 * "0 inspections", because an absence is not a fact about a person.
 */

export type PassportFacts = {
  phoneConfirmed: boolean;
  nimcMatchedAt: string | null;
  inspectionsAttended: number;
  tenancies: number;
  memberSince: string | null;
};

export type PassportLine = { key: "phone" | "nimc" | "attended" | "tenancies" | "since"; text: string };

type Copy = Dictionary["trustVisible"]["passport"];

function whole(v: unknown): number {
  return typeof v === "number" && Number.isInteger(v) && v > 0 ? v : 0;
}

function iso(v: unknown): string | null {
  return typeof v === "string" && Number.isFinite(Date.parse(v)) ? v : null;
}

export function passportFrom(row: unknown): PassportFacts | null {
  const r = Array.isArray(row) ? row[0] : row;
  if (!r || typeof r !== "object") return null;
  const o = r as Record<string, unknown>;
  return {
    phoneConfirmed: o.phone_confirmed === true,
    nimcMatchedAt: iso(o.nimc_matched_at),
    inspectionsAttended: whole(o.inspections_attended),
    tenancies: whole(o.tenancies),
    memberSince: iso(o.member_since),
  };
}

export function passportLines(facts: PassportFacts | null, copy: Copy, locale: Locale): PassportLine[] {
  if (!facts) return [];
  const out: PassportLine[] = [];
  if (facts.phoneConfirmed) out.push({ key: "phone", text: copy.phone });
  if (facts.nimcMatchedAt) {
    const date = formatDate(new Date(facts.nimcMatchedAt), locale, {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "Africa/Lagos",
    });
    out.push({ key: "nimc", text: copy.nimc.replace("{date}", date) });
  }
  if (facts.inspectionsAttended === 1) out.push({ key: "attended", text: copy.attendedOne });
  else if (facts.inspectionsAttended > 1) {
    out.push({ key: "attended", text: copy.attended.replace("{count}", formatNumber(facts.inspectionsAttended, locale)) });
  }
  if (facts.tenancies === 1) out.push({ key: "tenancies", text: copy.tenancyOne });
  else if (facts.tenancies > 1) {
    out.push({ key: "tenancies", text: copy.tenancies.replace("{count}", formatNumber(facts.tenancies, locale)) });
  }
  if (facts.memberSince) {
    const month = formatDate(new Date(facts.memberSince), locale, { month: "long", year: "numeric", timeZone: "Africa/Lagos" });
    out.push({ key: "since", text: copy.since.replace("{month}", month) });
  }
  return out;
}

/** "Shown in 3 conversations", or the none line. */
export function sharedInLine(count: number, copy: Copy): string {
  if (count <= 0) return copy.sharedInNone;
  return count === 1 ? copy.sharedInOne : copy.sharedIn.replace("{count}", String(count));
}
