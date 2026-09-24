import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin/guard";
import { RecoveryDesk, type RecoveryRow } from "./RecoveryDesk";

export const metadata: Metadata = {
  title: "Account recovery",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * SEC-15: the desk for moving an account to a new address when its owner has
 * lost the mailbox. The gates are the database's (NIN on file, 72 hours, a
 * super admin who is not the account's owner, an audit row per step); this
 * page shows the requests and offers only the next step each one allows.
 */
export default async function AccountRecoveryPage() {
  const access = await requireAdmin();
  if (access.state !== "admin") return null;

  const { data, error } = await access.supabase
    .from("email_recovery_requests" as never)
    .select(
      "id, user_id, old_email, new_email, status, evidence_ref, opened_at, eligible_at, completed_at, cancelled_at, cancel_reason, last_error, opened_notice_at, completed_notice_at",
    )
    .order("opened_at", { ascending: false })
    .limit(50);

  return (
    <div className="mx-auto max-w-3xl px-md py-lg">
      <h1 className="nf-h2">Account recovery</h1>
      <p className="mt-sm text-[length:var(--nf-text-body-sm)] text-[var(--nf-content-secondary)]">
        For a person who has lost the mailbox on their account. A super admin opens a request with the
        NIN the person gives, which must match an approved identity on file. The old address is told at
        once. After 72 hours, a different super admin from the account&apos;s owner can complete it; any
        admin can cancel it before then. Every step is in the audit log.
      </p>
      {error ? (
        <p className="mt-md text-[length:var(--nf-text-body-sm)]">The requests could not be read just now.</p>
      ) : (
        <RecoveryDesk rows={(data ?? []) as unknown as RecoveryRow[]} isSuperAdmin={access.isSuperAdmin} />
      )}
    </div>
  );
}
