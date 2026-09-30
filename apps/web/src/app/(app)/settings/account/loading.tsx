import { LoadingShell, PageHeaderSkeleton, SettingsGroupSkeleton } from "@/components/app/ScreenSkeleton";

/**
 * The wait, on account information.
 *
 * The header with its line, then the page's stacked sections (`space-y-block`):
 * the account group (name, email, password, the way out) and the place card.
 */
export default function LoadingAccountSettings() {
  return (
    <LoadingShell label="Loading your account" className="mx-auto w-full max-w-2xl">
      <PageHeaderSkeleton subtitle />
      <div className="space-y-block">
        <SettingsGroupSkeleton rows={4} />
        <SettingsGroupSkeleton rows={3} />
      </div>
    </LoadingShell>
  );
}
