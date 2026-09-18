import { getDictionary } from "@vallo/i18n";
import { MobileTabBar } from "@/components/app/MobileTabBar";

/** The five-slot dock over a dark canvas, Home active, unread on Profile. */
export default function DockPreview() {
  const t = getDictionary("en");
  return (
    <main className="min-h-dvh bg-[var(--nf-surface-canvas)]">
      <MobileTabBar t={t} side="property" active="/home" unreadNotifications={3} signedIn />
    </main>
  );
}
