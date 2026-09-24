"use client";

import { useClientDictionary } from "@/lib/i18n/use-client-dictionary";
import { Button } from "@/components/ui/Button";

/**
 * A lane that threw. Never "no hits": the check could not run, and the desk
 * says so, so a failure can never read as a clean screening.
 */
export default function ComplianceError({ reset }: { error: Error; reset: () => void }) {
  const c = useClientDictionary().compliance.desk;
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
      </div>
    </div>
  );
}
