import type { Metadata } from "next";
import { formatMoney } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { requireAdmin } from "@/lib/admin/guard";
import { readAgreementQueue } from "@/lib/admin/reads/agreements";
import { PageHead, Panel } from "../_components/panels";
import { AgreementQueue } from "./AgreementQueue";
import "./agreements.css";

export const metadata: Metadata = {
  title: "Agreements",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * THE GATE BETWEEN INSPECTION AND PAYMENT (Track A, 25 September 2026).
 *
 * An agreement reaches this queue only when the renter's inspection report
 * was submitted with its photos (for a rental) or the host accepted the stay,
 * and both parties confirmed the same version of the terms. Payment is not
 * available to anybody until a reviewer here approves it. Every decision is
 * written to `deal_agreement_events` and `audit_log` by the database, and both
 * parties hear about it by notification and by email.
 */
export default async function AgreementsDeskPage() {
  const locale = await getLocale();
  const access = await requireAdmin();
  if (access.state !== "admin") {
    return (
      <div className="nf-console">
        <PageHead title="Agreements" lede="Your account cannot open this desk." />
      </div>
    );
  }
  const queue = await readAgreementQueue(access.supabase);
  const now = requestTime();
  return (
    <div className="nf-console">
      <PageHead
        title="Agreements"
        lede="Approve or reject each agreement before payment opens. Check the inspection evidence, that the dates and the amount match the listing, and that a live mandate stands behind an agent. Both parties read a rejection's reason."
      />
      {queue.state !== "ok" ? (
        <Panel title="Waiting for review">
          <p className="nf-body">The queue could not be read just now. Nothing was changed. Refresh to try again.</p>
        </Panel>
      ) : (
        <>
          <Panel title={`Waiting for review (${queue.waiting.length})`} id="waiting">
            <AgreementQueue rows={queue.waiting} locale={locale} now={now} />
          </Panel>
          <Panel title="Recently decided" id="decided">
            {queue.decided.length === 0 ? (
              <p className="nf-body text-[var(--nf-content-secondary)]">No decisions yet.</p>
            ) : (
              <ul className="nf-admin-queue">
                {queue.decided.map((row) => (
                  <li key={row.id} className="nf-admin-queue-row nf-admin-queue-row--done">
                    <span className="font-semibold">{row.listingTitle}</span>
                    <span className="text-[var(--nf-content-secondary)]">
                      {" "}
                      · {row.renterName} ← {row.ownerName} · {formatMoney(row.amountMinor, locale)} ·{" "}
                      {row.status === "rejected" ? `sent back: ${row.decisionReason ?? ""}` : row.status}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </>
      )}
    </div>
  );
}

/** The request's clock, read once so every time on the page agrees. */
function requestTime(): number {
  return Date.now();
}
