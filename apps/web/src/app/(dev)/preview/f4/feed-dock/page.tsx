import { getDictionary } from "@vallo/i18n";
import { MobileTabBar } from "@/components/app/MobileTabBar";
import { FeedPreview } from "../FeedPreview";

/**
 * The feed with the plus closed and the real dock under it, so a proof can
 * tap the plus the way a thumb does and measure the three plates against the
 * viewport and the dock together. `feed-bloom` mounts the fan already open
 * and has no dock, which is the picture but not the geometry.
 */
export default function FeedDockPreview() {
  const t = getDictionary("en");
  return (
    <main className="min-h-dvh bg-[var(--nf-surface-canvas)]">
      <FeedPreview bloomOpen={false} />
      <MobileTabBar t={t} side="property" active="/around" signedIn />
    </main>
  );
}
