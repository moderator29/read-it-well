/**
 * V-42. THE OWNER'S BUILDINGS AND THE MANDATE PITCH, READ WITHOUT TRUSTING.
 *
 * Pure parsers for what `my_buildings`, `mandate_briefs` and
 * `mandate_pitches_for` return, and the grouping the page draws. Client-safe;
 * the reads that call the database are in `portfolio-queries.ts`.
 */

export type BuildingUnit = {
  listingId: string;
  place: string;
  bedrooms: number | null;
  propertyType: string | null;
  letState: "let" | "vacant";
  tenancyEndsOn: string | null;
  achievedRentMinor: number | null;
  rentPeriod: "year" | "quarter" | "month" | null;
  otherListers: string[];
  mandateHolders: string[];
  invitationId: string | null;
  invitationStatus: "open" | "awarded" | null;
  pitchCount: number;
};

export type MandateBrief = {
  invitationId: string;
  place: string;
  bedrooms: number | null;
  propertyType: string | null;
  askingMinMinor: number;
  askingMaxMinor: number;
  rentPeriod: "year" | "quarter" | "month";
  expiresAt: string;
  pitched: boolean;
  awarded: boolean;
};

export type MandatePitch = {
  pitchId: string;
  agentName: string;
  verifiedTier: number;
  onValloSince: string | null;
  letsThroughVallo: number;
  liveListings: number;
  note: string;
  awardedAt: string | null;
};

const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v : null);
const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v)) ? Number(v) : null);
const names = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && x.trim().length > 0) : []);
const period = (v: unknown): "year" | "quarter" | "month" | null => (v === "year" || v === "quarter" || v === "month" ? v : null);

export function readBuildings(data: unknown): BuildingUnit[] {
  if (!Array.isArray(data)) return [];
  return data.flatMap((row): BuildingUnit[] => {
    if (!row || typeof row !== "object") return [];
    const r = row as Record<string, unknown>;
    const id = str(r.listing_id);
    if (!id) return [];
    return [
      {
        listingId: id,
        place: str(r.place_name) ?? "",
        bedrooms: num(r.bedrooms),
        propertyType: str(r.property_type),
        letState: r.let_state === "let" ? "let" : "vacant",
        tenancyEndsOn: str(r.tenancy_ends_on),
        achievedRentMinor: num(r.achieved_rent_minor),
        rentPeriod: period(r.rent_period),
        otherListers: names(r.other_listers),
        mandateHolders: names(r.mandate_holders),
        invitationId: str(r.invitation_id),
        invitationStatus: r.invitation_status === "open" || r.invitation_status === "awarded" ? r.invitation_status : null,
        pitchCount: num(r.pitch_count) ?? 0,
      },
    ];
  });
}

export function readBriefs(data: unknown): MandateBrief[] {
  if (!Array.isArray(data)) return [];
  return data.flatMap((row): MandateBrief[] => {
    if (!row || typeof row !== "object") return [];
    const r = row as Record<string, unknown>;
    const id = str(r.invitation_id);
    const min = num(r.asking_min_minor);
    const max = num(r.asking_max_minor);
    const expires = str(r.expires_at);
    if (!id || min === null || max === null || !expires) return [];
    return [
      {
        invitationId: id,
        place: str(r.place_name) ?? "",
        bedrooms: num(r.bedrooms),
        propertyType: str(r.property_type),
        askingMinMinor: min,
        askingMaxMinor: max,
        rentPeriod: period(r.rent_period) ?? "year",
        expiresAt: expires,
        pitched: r.pitched === true,
        awarded: r.awarded === true,
      },
    ];
  });
}

export function readPitches(data: unknown): MandatePitch[] {
  if (!Array.isArray(data)) return [];
  return data.flatMap((row): MandatePitch[] => {
    if (!row || typeof row !== "object") return [];
    const r = row as Record<string, unknown>;
    const id = str(r.pitch_id);
    const note = str(r.note);
    if (!id || !note) return [];
    return [
      {
        pitchId: id,
        agentName: str(r.agent_name) ?? "A verified agent",
        verifiedTier: num(r.verified_tier) ?? 0,
        onValloSince: str(r.on_vallo_since),
        letsThroughVallo: num(r.lets_through_vallo) ?? 0,
        liveListings: num(r.live_listings) ?? 0,
        note,
        awardedAt: str(r.awarded_at),
      },
    ];
  });
}

/** Units grouped by place, in the order the database returned them. */
export function groupByPlace(units: readonly BuildingUnit[]): { place: string; units: BuildingUnit[] }[] {
  const groups = new Map<string, BuildingUnit[]>();
  for (const unit of units) {
    const list = groups.get(unit.place) ?? [];
    list.push(unit);
    groups.set(unit.place, list);
  }
  return [...groups.entries()].map(([place, list]) => ({ place, units: list }));
}

/** Naira typed by a person into minor units, or null. "2,500,000" and "2.5m" both read. */
export function nairaToMinor(raw: string): number | null {
  const text = raw.trim().toLowerCase().replace(/[₦,\s]/g, "").replace(/^ngn/, "");
  const m = text.match(/^(\d+(?:\.\d+)?)(k|m)?$/);
  if (!m) return null;
  const base = Number(m[1]);
  const scale = m[2] === "m" ? 1_000_000 : m[2] === "k" ? 1_000 : 1;
  const naira = base * scale;
  if (!Number.isFinite(naira) || naira <= 0 || naira > 10_000_000_000) return null;
  return Math.round(naira * 100);
}
