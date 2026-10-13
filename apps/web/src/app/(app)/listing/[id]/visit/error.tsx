"use client";

import { VisitError } from "@/components/app/inspections/visit/VisitStates";

/** Step 1's own failure: try again, or back to the listing (`VisitError`). */
export default function ScheduleVisitError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <VisitError {...props} />;
}
