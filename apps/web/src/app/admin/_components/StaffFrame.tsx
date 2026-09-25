import Link from "next/link";
import type { ReactNode } from "react";
import { STAFF_SCOPE_LABEL, type StaffAccess, type StaffScope } from "@/lib/admin/guard";

/**
 * TRACK K: THE RESTRICTED CONSOLE A STAFF MEMBER SEES.
 *
 * Not the operator's rail with rows hidden: a separate, short frame that
 * names only the desks this person was given, plus the handbook. Nothing on
 * it links anywhere else, and every desk it links to asks the database again
 * (`requireAdmin(scope)`), so a hand-typed address to any other desk answers
 * with the refusal it always gave.
 */
export const STAFF_DESK: Record<StaffScope, string> = {
  listing_approval: "/admin/listings",
  kyc_review: "/admin/kyc",
  moderation: "/admin/queue",
  support: "/admin/support",
  agreements: "/admin/agreements",
  guarantee: "/admin/agreements#claims",
};

export function StaffFrame({ staff, name, children }: { staff: StaffAccess; name: string; children: ReactNode }) {
  return (
    <div className="nf-console nf-staff-frame" data-testid="staff-console">
      <header className="nf-panel nf-panel--card block p-card">
        <p className="nf-caption text-[var(--nf-content-secondary)]">Vallo console · staff</p>
        <p className="font-semibold">{name}</p>
        <nav aria-label="Your desks" className="mt-inline">
          <ul className="flex flex-wrap gap-xs">
            <li>
              <Link className="nf-btn nf-btn--secondary nf-btn--sm" href="/admin">
                Console
              </Link>
            </li>
            <li>
              <Link className="nf-btn nf-btn--secondary nf-btn--sm" href="/admin/handbook">
                Handbook
              </Link>
            </li>
            <li>
              <Link className="nf-btn nf-btn--secondary nf-btn--sm" href="/settings/help">
                Help and support
              </Link>
            </li>
            {staff.handbookAcknowledged
              ? staff.scopes.map((scope) => (
                  <li key={scope}>
                    <Link className="nf-btn nf-btn--secondary nf-btn--sm" href={STAFF_DESK[scope]}>
                      {STAFF_SCOPE_LABEL[scope]}
                    </Link>
                  </li>
                ))
              : null}
          </ul>
        </nav>
        {!staff.handbookAcknowledged ? (
          <p className="nf-body mt-inline" role="status">
            Read and acknowledge the staff handbook to unlock your desks.
          </p>
        ) : null}
      </header>
      <div className="mt-block">{children}</div>
    </div>
  );
}

/** The console's front page for a staff member. */
export function StaffHome({ staff }: { staff: StaffAccess }) {
  return (
    <section className="nf-panel nf-panel--card block p-card" data-testid="staff-home">
      <h1 className="nf-h2">Your console</h1>
      <p className="nf-body mt-inline">
        Your access: {staff.scopes.map((s) => STAFF_SCOPE_LABEL[s]).join(", ")}. Every decision you make is written to
        the audit log with your name.
      </p>
      {staff.handbookAcknowledged ? (
        <ul className="mt-block grid gap-xs">
          {staff.scopes.map((scope) => (
            <li key={scope}>
              <Link href={STAFF_DESK[scope]} className="font-semibold text-[var(--nf-content-link)] hover:underline">
                Open {STAFF_SCOPE_LABEL[scope]}
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="nf-body mt-block">
          <Link href="/admin/handbook" className="font-semibold text-[var(--nf-content-link)] hover:underline">
            Read the staff handbook
          </Link>{" "}
          first. Your desks unlock the moment you acknowledge it.
        </p>
      )}
    </section>
  );
}
