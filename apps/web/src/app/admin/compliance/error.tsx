"use client";

import { useClientDictionary } from "@/lib/i18n/use-client-dictionary";
import { Button } from "@/components/ui/Button";
import { useErrorReport } from "@/lib/observability/use-error-report";

/**
 * A lane that threw. Never "no hits": the check could not run, and the desk
 * says so, so a failure can never read as a clean screening.
 */
export default function ComplianceError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const c = useClientDictionary().compliance.desk;
  const reference = useErrorReport(error, "client.compliance_boundary", "[vallo] compliance lane error");
  return (
    <div className="nf-console">
      <div className="nf-panel nf-panel--card nf-admin-card p-card-lg text-center" role="alert">
        <p className="nf-h4">{c.unavailableTitle}</p>
        <p className="nf-body mx-auto mt-row max-w-[48ch] text-content-2">{c.unavailableBody}</p>
        <div className="mt-group">
          <Button variant="secondary" onClick={reset}>
            {c.tryAgain}
          </Button>
        </div>
        <p className="nf-caption mt-row text-content-2">
          Reference <span className="nf-numeric select-all">{reference}</span>
        </p>
      </div>
    </div>
  );
}
