import { Skeleton } from "@/components/ui/Skeleton";
import { LoadingShell, SettingsGroupSkeleton } from "@/components/app/ScreenSkeleton";

/**
 * The wait, on the email preferences door (a link from an email, read by
 * its token). The door page's own column (`nf-shell`, `nf-door-page`): the
 * logo, the title, the line naming the address, the switch rows and the
 * caption under them.
 */
export default function LoadingEmailPreferences() {
  return (
    <main id="main" className="nf-shell">
      <LoadingShell label="Loading your email choices" className="nf-door-page">
        <Skeleton width="7.5rem" height="2.5rem" radius="md" />
        <Skeleton width="70%" height="1.75rem" radius="sm" />
        <Skeleton width="85%" height="1rem" radius="sm" />
        <SettingsGroupSkeleton rows={4} label={false} className="w-full" />
        <Skeleton width="60%" height="0.75rem" radius="sm" />
      </LoadingShell>
    </main>
  );
}
