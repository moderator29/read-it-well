import Link from "next/link";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getDictionary, type Locale } from "@vallo/i18n";
import { resolveSession } from "@/lib/actions/session";
import { formatMoneyDate } from "@/lib/money/dates";

/**
 * The lister's way into their tenancy files. V-47.
 *
 * A tenant reaches /tenancy/[id] from Bookings; the lister, who also writes
 * reports, proposes deductions and returns the caution there, reaches it from
 * here on the workspace's bookings page. Only charges that settled are listed,
 * because a tenancy file opens at payment (its snapshot is the mark). Nothing at all renders for a lister
 * with no tenancy, and a failed read renders one honest line.
 */
export async function ListerTenancies({ locale }: { locale: Locale }) {
  const copy = getDictionary(locale).afterTheGate.tenancy;
  const session = await resolveSession();
  if (session.state !== "signed-in") return null;
  const db = session.supabase;

  const charges = await db
    .from("rent_payments")
    .select("id, listing_id, move_in")
    .eq("lister_id", session.user.id)
    .order("move_in", { ascending: false })
    .limit(50);
  if (charges.error) {
    return (
      <p className="nf-caption mt-lg" data-testid="lister-tenancies-failed">
        {copy.listerFailed}
      </p>
    );
  }
  const rows = charges.data ?? [];
  if (rows.length === 0) return null;

  const [paid, listings] = await Promise.all([
    // The lister cannot read the tenant's transactions; the snapshot is
    // written in the settlement's own transaction, so it marks a paid charge.
    (db as unknown as SupabaseClient)
      .from("tenancy_snapshots")
      .select("rent_payment_id")
      .in("rent_payment_id", rows.map((row) => row.id)),
    db.from("listings").select("id, title, area").in("id", rows.map((row) => row.listing_id)),
  ]);
  if (paid.error) {
    return (
      <p className="nf-caption mt-lg" data-testid="lister-tenancies-failed">
        {copy.listerFailed}
      </p>
    );
  }
  const settled = new Set(
    (Array.isArray(paid.data) ? (paid.data as { rent_payment_id?: unknown }[]) : []).map((row) => String(row.rent_payment_id)),
  );
  const names = new Map((listings.data ?? []).map((row) => [row.id, [row.title, row.area].filter(Boolean).join(", ")]));
  const tenancies = rows.filter((row) => settled.has(row.id));
  if (tenancies.length === 0) return null;

  return (
    <section className="mt-xl" data-testid="lister-tenancies">
      <h2 className="nf-h3">{copy.listerHeading}</h2>
      <p className="nf-body-sm mt-2xs text-[var(--nf-content-secondary)]">{copy.listerLede}</p>
      <ul className="mt-md grid gap-sm">
        {tenancies.map((row) => (
          <li key={row.id}>
            <Link href={`/tenancy/${row.id}`} className="nf-card block p-card">
              <span className="nf-body-sm block font-semibold">{names.get(row.listing_id) || copy.title}</span>
              <span className="nf-caption block nf-numeric">
                {copy.listerLine.replace("{date}", formatMoneyDate(row.move_in, locale) ?? row.move_in)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
