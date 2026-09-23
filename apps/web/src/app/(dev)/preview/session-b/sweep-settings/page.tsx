import { Suspense } from "react";
import { getDictionary } from "@vallo/i18n";
import { AppShell } from "@/components/app/AppShell";
import { SweepSettingsHarness, routeFor } from "./Harness";

/**
 * `/preview/session-b/sweep-settings?v=<view>`: the settings group of the
 * platform sweep inside the real app shell, signed in, on fixture props.
 * Behind the preview gate in `../../layout.tsx`. The views are listed in
 * `./Harness.tsx`. `&drawer=1` opens the side drawer over it (the drawer
 * panel is `overlays.css`, this group's).
 */
export default async function SweepSettingsPreview({
  searchParams,
}: {
  searchParams: Promise<{ v?: string; drawer?: string }>;
}) {
  const { v = "hub", drawer } = await searchParams;
  return (
    <Suspense>
      <AppShell
        t={getDictionary("en")}
        userName="Seyi Omojuni"
        userHandle="seyifunmi"
        signedIn
        unreadNotifications={2}
        preview={{ route: routeFor(v), drawer: drawer === "1" }}
      >
        <SweepSettingsHarness v={v} />
      </AppShell>
    </Suspense>
  );
}
