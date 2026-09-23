import { Suspense } from "react";
import { getDictionary } from "@vallo/i18n";
import { AppShell } from "@/components/app/AppShell";
import { ProfileHarness } from "./Harness";

/**
 * `/preview/session-b/profile`: the profile inside the real app shell, signed
 * in (menu, lockup, bell, avatar and the dock) unless `?v=signedout`, which
 * shows the signed-out shell. Behind the preview gate in `../../layout.tsx`.
 */
export default async function ProfilePreview({
  searchParams,
}: {
  searchParams: Promise<{ v?: string }>;
}) {
  const { v } = await searchParams;
  const signedIn = v !== "signedout";
  return (
    <Suspense>
      <AppShell
        t={getDictionary("en")}
        userName="Seyi Omojuni"
        userHandle="seyifunmi"
        signedIn={signedIn}
        unreadNotifications={signedIn ? 2 : 0}
        preview={{ route: "/profile" }}
      >
        <ProfileHarness v={v} />
      </AppShell>
    </Suspense>
  );
}
