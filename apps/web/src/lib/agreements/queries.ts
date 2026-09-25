import "server-only";

import { resolveSession } from "../actions/session";

/**
 * The agreements a person is a party to, read under their own RLS.
 */

export type AgreementSummary = {
  id: string;
  kind: "rent" | "stay";
  status: string;
  listingId: string;
  listingTitle: string;
  amountMinor: number;
  role: "renter" | "owner";
  updatedAt: string;
};

export type AgreementDetail = AgreementSummary & {
  termsVersion: number;
  terms: Record<string, unknown>;
  inspectionId: string | null;
  bookingId: string | null;
  renterName: string;
  ownerName: string;
  youConfirmedCurrent: boolean;
  otherConfirmedCurrent: boolean;
  decisionReason: string | null;
  submittedAt: string | null;
  decidedAt: string | null;
  paidAt: string | null;
  claimWindow: { opens: string; closes: string } | null;
  events: { at: string; action: string; note: string | null }[];
  claims: { id: string; status: string; requestedMinor: number; approvedMinor: number | null; reason: string | null; createdAt: string }[];
};

export async function readMyAgreements(): Promise<AgreementSummary[] | null> {
  const session = await resolveSession();
  if (session.state !== "signed-in") return null;
  const { data, error } = await session.supabase
    .from("deal_agreements")
    .select("id, kind, status, listing_id, amount_minor, renter_id, updated_at")
    .order("updated_at", { ascending: false })
    .limit(100);
  if (error) return null;
  const rows = data ?? [];
  const listingIds = [...new Set(rows.map((r) => r.listing_id))];
  const { data: listings } = listingIds.length
    ? await session.supabase.from("listings").select("id, title").in("id", listingIds)
    : { data: [] as { id: string; title: string | null }[] };
  const title = new Map((listings ?? []).map((l) => [l.id, l.title ?? ""]));
  return rows.map((r) => ({
    id: r.id,
    kind: r.kind === "stay" ? "stay" : "rent",
    status: r.status,
    listingId: r.listing_id,
    listingTitle: title.get(r.listing_id) || "A property",
    amountMinor: r.amount_minor,
    role: r.renter_id === session.user.id ? "renter" : "owner",
    updatedAt: r.updated_at,
  }));
}

function lagosStart(date: string | null): number | null {
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  // Lagos is UTC+1 all year.
  return Date.parse(`${date}T00:00:00+01:00`);
}

export async function readAgreement(id: string): Promise<AgreementDetail | null> {
  const session = await resolveSession();
  if (session.state !== "signed-in") return null;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const { data: a } = await session.supabase.from("deal_agreements").select("*").eq("id", id).maybeSingle();
  if (!a) return null;
  const [listing, people, events, claims, policy] = await Promise.all([
    session.supabase.from("listings").select("title").eq("id", a.listing_id).maybeSingle(),
    session.supabase.from("profiles").select("id, display_name").in("id", [a.renter_id, a.owner_id]),
    session.supabase
      .from("deal_agreement_events")
      .select("created_at, action, note")
      .eq("agreement_id", a.id)
      .order("created_at", { ascending: true }),
    session.supabase
      .from("guarantee_claims")
      .select("id, status, requested_minor, approved_minor, decision_reason, created_at")
      .eq("agreement_id", a.id)
      .order("created_at", { ascending: false }),
    session.supabase.from("money_policy").select("claim_window_hours").maybeSingle(),
  ]);
  const name = new Map((people.data ?? []).map((p) => [p.id, p.display_name ?? ""]));
  const role = a.renter_id === session.user.id ? "renter" : "owner";
  const terms = (a.terms ?? {}) as Record<string, unknown>;
  const start = lagosStart(
    (typeof terms.move_in === "string" ? terms.move_in : null) ?? (typeof terms.check_in === "string" ? terms.check_in : null),
  );
  const hours = policy.data?.claim_window_hours ?? 72;
  const mine = role === "renter" ? a.renter_confirmed_version : a.owner_confirmed_version;
  const theirs = role === "renter" ? a.owner_confirmed_version : a.renter_confirmed_version;
  return {
    id: a.id,
    kind: a.kind === "stay" ? "stay" : "rent",
    status: a.status,
    listingId: a.listing_id,
    listingTitle: listing.data?.title || "A property",
    amountMinor: a.amount_minor,
    role,
    updatedAt: a.updated_at,
    termsVersion: a.terms_version,
    terms,
    inspectionId: a.inspection_id,
    bookingId: a.booking_id,
    renterName: name.get(a.renter_id) || "The renter",
    ownerName: name.get(a.owner_id) || "The owner or agent",
    youConfirmedCurrent: mine === a.terms_version,
    otherConfirmedCurrent: theirs === a.terms_version,
    decisionReason: a.decision_reason,
    submittedAt: a.submitted_at,
    decidedAt: a.decided_at,
    paidAt: a.paid_at,
    claimWindow:
      start !== null
        ? { opens: new Date(start).toISOString(), closes: new Date(start + hours * 3_600_000).toISOString() }
        : null,
    events: (events.data ?? []).map((e) => ({ at: e.created_at, action: e.action, note: e.note })),
    claims: (claims.data ?? []).map((c) => ({
      id: c.id,
      status: c.status,
      requestedMinor: c.requested_minor,
      approvedMinor: c.approved_minor,
      reason: c.decision_reason,
      createdAt: c.created_at,
    })),
  };
}
