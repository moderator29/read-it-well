import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { getShellIdentity } from "@/lib/app/shell-queries";
import { getSide } from "@/lib/side";
import { resolveWorkspaces } from "@/lib/supply/workspaces-queries";
import { AppShell } from "@/components/app/AppShell";
import { InspectionFixture } from "../fixture";

export const dynamic = "force-dynamic";

/**
 * The inspection harness inside the real app shell (rule R-G), with
 * the same server facts `app/(app)/layout.tsx` hands it, so the first-screen
 * proof (Add Photos on the first 844px) is measured under the real header.
 * Run without a session it is the signed-out shell.
 */
export default async function SessionBInspectionInShell({
  searchParams,
}: {
  searchParams: Promise<{ side?: string; state?: string; rooms?: string }>;
}) {
  const params = await searchParams;
  const t = getDictionary(await getLocale());
  const [
    side,
    { userName, userHandle, unreadNotifications, avatarUrl, signedIn, isAgent, isAdmin },
    { workspaces, current },
  ] = await Promise.all([getSide(), getShellIdentity(), resolveWorkspaces()]);
  return (
    <AppShell
      t={t}
      side={side}
      userName={userName}
      userHandle={userHandle}
      unreadNotifications={unreadNotifications}
      avatarUrl={avatarUrl}
      signedIn={signedIn}
      isAgent={isAgent}
      isAdmin={isAdmin}
      workspaces={workspaces}
      currentProfile={current}
    >
      <InspectionFixture side={params.side} state={params.state} rooms={params.rooms} />
    </AppShell>
  );
}
