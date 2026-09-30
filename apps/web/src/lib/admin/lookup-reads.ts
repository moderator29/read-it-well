import "server-only";

import { requireAdmin, type StaffScope } from "./guard";
import { createAdminClient } from "../supabase/admin";
import { findUserByEmail } from "../supabase/service";
import { classifyLookup } from "./lookup-classify";

/**
 * The lookup box's reads (C6). Each section asks `requireAdmin(scope)` for
 * the desk it belongs to, exactly as that desk does, and is skipped when the
 * viewer may not open it: a support agent sees tickets and nothing they
 * could not already open. Only a title, a date and a link come back.
 */
export type LookupHit = { kind: string; title: string; sub: string; href: string };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Loose = any;

async function may(scope?: StaffScope): Promise<boolean> {
  const access = await requireAdmin(scope);
  return access.state === "admin";
}

const day = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleDateString("en-NG", { timeZone: "Africa/Lagos", day: "numeric", month: "short", year: "numeric" }) : "";

/** A status as a word ("PENDING_REVIEW" reads "Pending review"), never the raw column. */
export const said = (status: unknown): string => {
  const words = String(status ?? "").replace(/_/g, " ").trim().toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
};

export async function lookup(raw: string): Promise<{ kind: string; hits: LookupHit[]; skipped: string[] }> {
  const { kind, value } = classifyLookup(raw);
  const hits: LookupHit[] = [];
  const skipped: string[] = [];
  if (kind === "text" || value.length === 0) return { kind, hits, skipped };
  const db = createAdminClient() as Loose;

  const section = async (scope: StaffScope | undefined, label: string, run: () => Promise<void>) => {
    if (!(await may(scope))) {
      skipped.push(label);
      return;
    }
    try {
      await run();
    } catch {
      /* A section that failed shows nothing rather than something wrong. */
    }
  };

  if (kind === "ticket") {
    await section("support", "Support", async () => {
      const { data } = await db.from("support_tickets").select("id, reference, status, created_at").ilike("reference", value).limit(5);
      for (const t of data ?? []) hits.push({ kind: "Ticket", title: t.reference, sub: `${said(t.status)}, opened ${day(t.created_at)}`, href: `/admin/support?ticket=${t.id}` });
    });
  }

  if (kind === "uuid") {
    await section("operations", "Bookings", async () => {
      const { data } = await db.from("bookings").select("id, check_in, status").eq("id", value).limit(1);
      for (const b of data ?? []) hits.push({ kind: "Booking", title: `Booking, ${day(b.check_in)}`, sub: said(b.status), href: `/admin/bookings/${b.id}` });
    });
    await section("listing_approval", "Listings", async () => {
      const { data } = await db.from("listings").select("id, title, status").eq("id", value).limit(1);
      for (const l of data ?? []) hits.push({ kind: "Listing", title: l.title ?? "Untitled listing", sub: said(l.status), href: `/admin/listings/${l.id}` });
    });
    await section(undefined, "People", async () => {
      const { data } = await db.from("profiles").select("id, display_name, created_at").eq("id", value).limit(1);
      for (const p of data ?? []) hits.push({ kind: "Member", title: p.display_name ?? "Member", sub: `joined ${day(p.created_at)}`, href: `/admin/people/${p.id}` });
    });
    await section("support", "Support", async () => {
      const { data } = await db.from("support_tickets").select("id, reference, status").eq("id", value).limit(1);
      for (const t of data ?? []) hits.push({ kind: "Ticket", title: t.reference, sub: said(t.status), href: `/admin/support?ticket=${t.id}` });
    });
  }

  if (kind === "email") {
    await section(undefined, "People", async () => {
      const user = await findUserByEmail(value);
      if (user) hits.push({ kind: "Member", title: value, sub: "Account", href: `/admin/people/${user.id}` });
    });
  }

  if (kind === "listing") {
    await section("listing_approval", "Listings", async () => {
      const { data } = await db.from("listings").select("id, title, status, reference").ilike("reference", value).limit(5);
      for (const l of data ?? []) hits.push({ kind: "Listing", title: `${l.reference}, ${l.title ?? "Untitled"}`, sub: said(l.status), href: `/admin/listings/${l.id}` });
    });
  }

  if (kind === "payment") {
    await section("finance", "Payments", async () => {
      const { data } = await db.from("transactions").select("id, provider_ref, status, created_at").eq("provider_ref", value).limit(5);
      for (const t of data ?? []) hits.push({ kind: "Payment", title: t.provider_ref, sub: `${said(t.status)}, ${day(t.created_at)}`, href: `/admin/payments?q=${encodeURIComponent(t.provider_ref)}` });
    });
  }

  return { kind, hits, skipped };
}
