import "./profile.css";
import "@/components/app/identity/identity.css";
import { Panel } from "@/components/ui/Panel";
import { Skeleton } from "@/components/ui/Skeleton";
import { LoadingShell } from "@/components/app/ScreenSkeleton";

/**
 * The wait, on your profile, in the header's own shape (`IdentityHeader`):
 * the cover band, the card with the round face beside the name, the role
 * line and the handle and the counts across its foot, then the two tabs,
 * four rows and the Switch role row. Every block holds the height the real
 * one will take, so nothing under it moves when the data arrives.
 */
export default function LoadingProfile() {
  return (
    <LoadingShell label="Loading your profile" className="nf-pf">
      <div className="nf-profile-top nf-identity" aria-hidden="true">
        <div className="nf-social-cover nf-social-cover--profile nf-social-skeleton" />
        <div className="nf-profile-identity nf-island">
          <span className="nf-pf-skel-face">
            <Skeleton width="5rem" height="5rem" radius="none" />
          </span>
          <div className="nf-profile-text">
            <Skeleton width="70%" height="1.25rem" radius="sm" />
            <Skeleton className="mt-xs" width="45%" height="0.875rem" radius="xs" />
            <Skeleton className="mt-xs" width="35%" height="0.75rem" radius="xs" />
          </div>
          <div className="nf-profile-text nf-identity__about">
            <Skeleton width="85%" height="0.75rem" radius="xs" />
            <Skeleton className="mt-sm" width="60%" height="2rem" radius="sm" />
          </div>
        </div>
      </div>
      <div className="nf-pf-body">
        <Skeleton width="100%" height="2.75rem" radius="md" />
        <div className="nf-pf-panel nf-pf-rows">
          {Array.from({ length: 4 }, (_, i) => (
            <Panel key={i} as="div" variant="card" className="nf-pf-skel-row">
              <Skeleton width="3rem" height="3rem" radius="md" />
              <div className="flex-1">
                <Skeleton width="40%" height="0.8125rem" radius="xs" />
                <Skeleton className="mt-xs" width="75%" height="0.6875rem" radius="xs" />
              </div>
            </Panel>
          ))}
        </div>
      </div>
    </LoadingShell>
  );
}
