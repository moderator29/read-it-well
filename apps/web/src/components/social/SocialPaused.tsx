import { PageHeader } from "@/components/app/PageHeader";
import { ProfileNotice } from "@/components/social/profile/ProfileNotice";
import { SOCIAL_OFF_BODY, SOCIAL_OFF_TITLE } from "@/lib/social/flag";

/**
 * What every social route renders when the kill switch is thrown.
 *
 * One component for all ten of them, because ten hand-written paused screens
 * drift apart and this codebase has watched that happen with empty states
 * already. It is a page, not an error: the app's own header with a working way
 * back, the same designed notice the profile surfaces use, and two doors out.
 *
 * **It is not a 404 and it is not a 500.** A place somebody was reading five
 * minutes ago has not stopped existing, and telling them it has would be a lie
 * that also loses their trust in whatever they wrote there. The copy says what
 * is true: switched off for a moment, nothing deleted, the rest of the product
 * works.
 *
 * `docs/SOCIAL_DESIGN.md` section 7.7 asks for the tab to be absent rather than
 * for a broken page. The tab lives in `AppRail` and `MobileTabBar`, which are
 * shared files this scope does not own, so the tab is still there and it leads
 * here rather than anywhere broken. That is the honest half, and the other half
 * is one condition in two files the lead holds.
 */
export function SocialPaused({
  title = "Around",
  fallback = "/home",
}: {
  /** The page header's own title, so a paused profile still says whose it is. */
  title?: string;
  fallback?: string;
}) {
  return (
    <div className="mx-auto w-full max-w-2xl pb-24 pt-4">
      <PageHeader title={title} fallback={fallback} />
      <ProfileNotice
        icon="shield-check"
        title={SOCIAL_OFF_TITLE}
        body={SOCIAL_OFF_BODY}
        primary={{ href: "/home", label: "Back to home" }}
        secondary={{ href: "/search", label: "Search stays" }}
      />
    </div>
  );
}
