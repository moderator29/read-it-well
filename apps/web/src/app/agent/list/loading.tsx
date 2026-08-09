import { AgentScreenSkeleton, AgentTitleSkeleton } from "@/components/agent/AgentScreenSkeleton";
import { Skeleton } from "@/components/ui/Skeleton";

/**
 * The wait, on the listing wizard.
 *
 * A step header above a form. The fields are the tall part, so the placeholder gives them the height a real input has rather than the height of a line of text.
 */
export default function LoadingListingWizard() {
  return (
    <AgentScreenSkeleton label="Loading the listing wizard">
      <AgentTitleSkeleton />
      <div className="space-y-row">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="nf-card p-card">
            <Skeleton width="50%" height="1.0625rem" radius="sm" />
            <Skeleton className="mt-inline" width="100%" height="0.875rem" radius="sm" />
            <Skeleton className="mt-inline" width="100%" height="0.875rem" radius="sm" />
          </div>
        ))}
      </div>
    </AgentScreenSkeleton>
  );
}
