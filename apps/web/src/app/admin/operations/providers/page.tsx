import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin/guard";
import { runProviderChecks } from "@/lib/admin/provider-checks";
import { UiIcon } from "@/design-system/icons/UiIcon";

export const metadata: Metadata = { title: "Provider checks", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

/**
 * Read-only checks of every outside provider, run on the live server
 * (`lib/admin/provider-checks.ts`). Admins only, and every visit re-runs them.
 */
export default async function ProviderChecksPage() {
  const access = await requireAdmin("operations");
  if (access.state !== "admin") notFound();
  const checks = await runProviderChecks();

  return (
    <div className="nf-console">
      <h1 className="mb-xs text-[length:var(--nf-text-title)] font-semibold">Provider checks</h1>
      <p className="mb-md text-[length:var(--nf-text-body-sm)] text-[var(--nf-content-secondary)]">
        Read-only. Nothing is charged or sent and no member sees anything. Refresh to run again.
      </p>
      <ul className="nf-queue-list">
        {checks.map((check) => (
          <li key={check.name} className="nf-panel nf-panel--card nf-admin-card mb-sm flex gap-sm p-md" data-testid="provider-check">
            <UiIcon
              name={check.ok ? "check" : "close"}
              size={20}
              aria-label={check.ok ? "Passed" : "Failed"}
              className={check.ok ? "shrink-0 text-[var(--nf-state-success)]" : "shrink-0 text-[var(--nf-state-error)]"}
            />
            <span>
              <span className="block font-semibold">{check.name}</span>
              <span className="block text-[length:var(--nf-text-body-sm)] text-[var(--nf-content-secondary)]">{check.detail}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
