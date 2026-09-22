import "./profile.css";
import { Skeleton } from "@/components/ui/Skeleton";
import { LoadingShell } from "@/components/app/ScreenSkeleton";

/**
 * The wait, on your profile, in the page's own shape (`50E032EA`): the cover
 * band, the round face beside three lines, the two-segment control, four rows
 * and the Switch role row. Every block holds the height the real one will take,
 * so nothing under it moves when the data arrives.
 */
export default function LoadingProfile() {
  return (
    <LoadingShell label="Loading your profile" className="nf-pf">
      <div className="nf-pf-cover" aria-hidden="true" />
      <div className="nf-pf-id">
        <span className="nf-pf-skel-face">
          <Skeleton width="5.5rem" height="5.5rem" radius="none" />
        </span>
        <div className="nf-pf-id__text">
          <Skeleton width="70%" height="1.25rem" radius="sm" />
          <Skeleton className="mt-xs" width="40%" height="0.875rem" radius="xs" />
          <Skeleton className="mt-xs" width="85%" height="0.75rem" radius="xs" />
          <Skeleton className="mt-sm" width="60%" height="2rem" radius="sm" />
        </div>
      </div>
      <div className="nf-pf-body">
        <Skeleton width="100%" height="2.75rem" radius="md" />
        <div className="nf-pf-panel nf-pf-rows">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="nf-pf-skel-row">
              <Skeleton width="3.0625rem" height="3.0625rem" radius="sm" />
              <div className="flex-1">
                <Skeleton width="40%" height="0.8125rem" radius="xs" />
                <Skeleton className="mt-xs" width="75%" height="0.6875rem" radius="xs" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </LoadingShell>
  );
}
