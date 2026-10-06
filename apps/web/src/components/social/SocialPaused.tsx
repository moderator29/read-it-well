import { getDictionary } from "@vallo/i18n";
import { PageHeader } from "@/components/app/PageHeader";
import { PausedBack } from "@/components/social/PausedBack";
import { getLocale } from "@/lib/locale";
import { getSide } from "@/lib/side";
import { SIDE_HOME } from "@/lib/side.constants";
import { EmptyPanel } from "@/components/social/profile/EmptyPanel";
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
 * shared files, so the tab is still there and it leads
 * here rather than anywhere broken. That is the honest half, and the other half
 * is one condition in those two files.
 */
export async function SocialPaused({
  title = "Around",
}: {
  /** The page header's own title, so a paused profile still says whose it is. */
  title?: string;
}) {
  /* THE HOME OF THE SIDE THE MEMBER IS ON, decided here on the server. A literal
     `/home` sent a Stays member's shell over to Property, the bug the side-aware
     Back fixed (484438b5e), and "Search stays" went to the Property search. */
  const side = await getSide();
  const home = SIDE_HOME[side];
  const t = getDictionary(await getLocale());
  const search =
    side === "stays"
      ? { href: "/stays/search", label: "Search stays" }
      : { href: "/search", label: t.nav.search };

  return (
    <div className="mx-auto w-full max-w-2xl pb-4xl pt-md">
      {/* The declared parent of every paused social route is `/around`, which is
          paused too, so the ordinary back showed "Around is paused" twice. The
          back here is drawn by `PausedBack` and goes straight to the side's
          home; `fallback` is stated for the same destination. */}
      <PageHeader
        title={title}
        fallback={home}
        back={false}
        leading={<PausedBack href={home} label="Back to home" />}
      />
      <EmptyPanel
        icon="shield-check"
        title={SOCIAL_OFF_TITLE}
        body={SOCIAL_OFF_BODY}
        action={{ href: home, label: "Back to home" }}
        secondary={search}
      />
    </div>
  );
}
