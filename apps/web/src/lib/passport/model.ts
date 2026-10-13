import { toBadgeTier, type BadgeTier } from "@/lib/trust/badge-tier";
import { BUSINESS_KINDS, type RoleWord } from "@/lib/profile/role-line";
import { parseReplyBand, type ReplyBand } from "@/lib/listings/reply-band";

/**
 * THE VALLO PASSPORT, AS DATA. Pure and client-safe.
 *
 * Every member has one, whatever their side. It carries only facts Vallo
 * itself recorded: the photo, the name, the role, the day the account was
 * made, the verification level, completed rentals and stays, reviews, the
 * reply time and a stated language. It never carries a phone number, an
 * email, an ID document number, a date of birth or a home address, and no
 * field of this type could hold one.
 *
 * WHERE EACH LINE COMES FROM (the SQL is `pass02_vallo_passport_read.sql`):
 *
 *   photo          social_profiles.avatar_path
 *   role           agents.role (approved) and the kind of each published business
 *   joined         auth.users.created_at, the exact day
 *   verification   public.person_badge (private.badge_tier_for)
 *   rentals        rent_payments on a confirmed or completed booking, either side
 *   stays          bookings checked out, either side, never a rent payment twice
 *   reviews        reviews and reservation_reviews on what they list, hidden ones left out
 *   response       public.lister_reply_band (eight conversations in ninety days)
 *   languages      social_profiles.pidgin_ok, the one language a member states
 *
 * HIDDEN MEANS ABSENT, AT THE SOURCE. The database function nulls every line
 * its owner switched off before the row leaves it, so a hidden line is a null
 * here and nowhere is there a value to filter. Absent also covers "nothing
 * recorded": a zero count, no reviews, no band. An absence is never printed
 * as "none" or "0", because it is not a fact about a person.
 */

/** The lines an owner can switch off, in the order they are drawn. */
export const PASSPORT_LINES = [
  "photo",
  "role",
  "joined",
  "verification",
  "rentals",
  "stays",
  "reviews",
  "response",
  "languages",
] as const;

export type PassportLineKey = (typeof PASSPORT_LINES)[number];

export function isPassportLine(value: unknown): value is PassportLineKey {
  return typeof value === "string" && (PASSPORT_LINES as readonly string[]).includes(value);
}

/** What an owner chose. No row means the defaults: on, every line shown. */
export type PassportSettings = {
  enabled: boolean;
  hidden: PassportLineKey[];
};

export const DEFAULT_SETTINGS: PassportSettings = { enabled: true, hidden: [] };

export function settingsFrom(row: unknown): PassportSettings {
  const r = (Array.isArray(row) ? row[0] : row) as Record<string, unknown> | null | undefined;
  if (!r || typeof r !== "object") return { ...DEFAULT_SETTINGS, hidden: [] };
  const hidden = Array.isArray(r.hidden_lines) ? r.hidden_lines.filter(isPassportLine) : [];
  return {
    enabled: r.enabled === false ? false : true,
    hidden: PASSPORT_LINES.filter((line) => hidden.includes(line)),
  };
}

/** The facts a reader may see. `null` is hidden or not recorded. */
export type PassportFacts = {
  userId: string;
  handle: string | null;
  name: string | null;
  photo: string | null;
  roles: RoleWord[] | null;
  joinedAt: string | null;
  tier: BadgeTier | null;
  rentals: number | null;
  stays: number | null;
  reviewCount: number | null;
  reviewAverage: number | null;
  replyBand: ReplyBand | null;
  pidginOk: boolean | null;
};

const ROLE_WORDS: readonly RoleWord[] = [
  "renter",
  "landlord",
  "agent",
  "agency",
  "hotel",
  "servicedApartments",
  "guestHouse",
  "resort",
  "shortletHost",
  "restaurant",
];

/** The kinds the SQL maps; kept beside the words so a test can hold the two together. */
export const BUSINESS_KIND_COUNT = BUSINESS_KINDS.length;

function whole(v: unknown): number | null {
  const n = typeof v === "string" && /^\d+$/.test(v) ? Number(v) : v;
  return typeof n === "number" && Number.isInteger(n) && n > 0 ? n : null;
}

function iso(v: unknown): string | null {
  return typeof v === "string" && Number.isFinite(Date.parse(v)) ? v : null;
}

function text(v: unknown): string | null {
  return typeof v === "string" && v.trim().length > 0 ? v : null;
}

function rating(v: unknown): number | null {
  const n = typeof v === "string" ? Number(v) : v;
  return typeof n === "number" && Number.isFinite(n) && n >= 1 && n <= 5 ? Math.round(n * 10) / 10 : null;
}

/**
 * One row of `passport_read` or `my_passport`, as facts. Null for no row (a
 * refused read) or a row with no subject.
 */
export function factsFrom(row: unknown): PassportFacts | null {
  const r = (Array.isArray(row) ? row[0] : row) as Record<string, unknown> | null | undefined;
  if (!r || typeof r !== "object" || typeof r.subject_id !== "string") return null;
  /* The database's order is the role line's order; only the words are checked. */
  const roles = Array.isArray(r.roles)
    ? (r.roles as unknown[]).filter((word): word is RoleWord => ROLE_WORDS.includes(word as RoleWord))
    : null;
  return {
    userId: r.subject_id,
    handle: text(r.handle),
    name: text(r.display_name),
    photo: text(r.photo),
    roles: roles && roles.length > 0 ? roles : null,
    joinedAt: iso(r.joined_at),
    tier: r.verification === null || r.verification === undefined ? null : toBadgeTier(r.verification),
    rentals: whole(r.rentals),
    stays: whole(r.stays),
    reviewCount: whole(r.review_count),
    reviewAverage: whole(r.review_count) === null ? null : rating(r.review_average),
    replyBand: parseReplyBand(r.reply_band),
    pidginOk: r.pidgin_ok === true ? true : null,
  };
}

/**
 * What a reader would see if `hidden` were applied: the same rule the database
 * applies, used for the owner's live preview and nowhere else. A reader's data
 * is never filtered with this, because it has already been cut at the source.
 */
export function withHidden(facts: PassportFacts, hidden: readonly PassportLineKey[]): PassportFacts {
  const off = new Set<PassportLineKey>(hidden);
  return {
    ...facts,
    photo: off.has("photo") ? null : facts.photo,
    roles: off.has("role") ? null : facts.roles,
    joinedAt: off.has("joined") ? null : facts.joinedAt,
    tier: off.has("verification") ? null : facts.tier,
    rentals: off.has("rentals") ? null : facts.rentals,
    stays: off.has("stays") ? null : facts.stays,
    reviewCount: off.has("reviews") ? null : facts.reviewCount,
    reviewAverage: off.has("reviews") ? null : facts.reviewAverage,
    replyBand: off.has("response") ? null : facts.replyBand,
    pidginOk: off.has("languages") ? null : facts.pidginOk,
  };
}

/** Which lines have something recorded behind them, for the owner's switches. */
export function recordedLines(facts: PassportFacts): PassportLineKey[] {
  const out: PassportLineKey[] = [];
  if (facts.photo) out.push("photo");
  if (facts.roles) out.push("role");
  if (facts.joinedAt) out.push("joined");
  if (facts.tier) out.push("verification");
  if (facts.rentals) out.push("rentals");
  if (facts.stays) out.push("stays");
  if (facts.reviewCount) out.push("reviews");
  if (facts.replyBand) out.push("response");
  if (facts.pidginOk) out.push("languages");
  return out;
}
