import { LoadingShell, PageHeaderSkeleton, SettingsGroupSkeleton } from "@/components/app/ScreenSkeleton";

/**
 * The wait, on privacy.
 *
 * The header with its line, then the privacy groups (switch rows), the
 * blocked people row and the data and deletion group.
 */
export default function LoadingPrivacySettings() {
  return (
    <LoadingShell label="Loading your privacy" className="mx-auto w-full max-w-2xl">
      <PageHeaderSkeleton subtitle />
      <div className="space-y-block">
        <SettingsGroupSkeleton rows={4} />
        <SettingsGroupSkeleton rows={2} />
        <SettingsGroupSkeleton rows={3} />
      </div>
    </LoadingShell>
  );
}
