import { Skeleton } from "@/components/ui/Skeleton";
import { LoadingShell, PageHeaderSkeleton } from "@/components/app/ScreenSkeleton";

/**
 * The wait, on notifications.
 *
 * The route reads the signed-in user's own rows and then hands them to a live
 * subscription, so there is always a server round trip before the first item.
 * Rows are reserved with their unread dot, because a list that arrives and then
 * grows a leading dot on half its rows shifts every line of text sideways.
 *
 * IT WAS DRAWING SIX CARDS FOR A LIST THAT HAS NONE.
 *
 * `LiveNotifications` renders hairline rows on the ground, and has for some
 * time. This skeleton reserved six separate `nf-card` surfaces with 16px
 * padding, so the wait and the screen it stands in for were two different
 * designs: six bordered boxes dissolved into an undivided list, which is a
 * layout shift dressed as a transition. A skeleton that does not match its
 * screen is worse than no skeleton, because it teaches the eye the wrong shape
 * and then corrects it.
 */
export default function LoadingNotifications() {
  return (
    <LoadingShell label="Loading your notifications" className="mx-auto w-full max-w-2xl">
      <PageHeaderSkeleton />

      <ul className="divide-y divide-[var(--nf-border-subtle)]">
        {Array.from({ length: 6 }, (_, i) => (
          <li key={i} className="flex items-center gap-md py-group">
            {/* The kind glyph sits on the surface at ICON.row, so the reserved
                box is 24px square rather than the 36px disc the rows stopped
                drawing when the plate came off them. */}
            <Skeleton width="1.5rem" height="1.5rem" radius="sm" className="shrink-0" />
            <div className="min-w-0 flex-1">
              <Skeleton width="60%" height="1rem" radius="sm" />
              <Skeleton className="mt-inline-tight" width="85%" height="0.90625rem" radius="sm" />
            </div>
            <Skeleton circle width="0.625rem" className="shrink-0" />
          </li>
        ))}
      </ul>
    </LoadingShell>
  );
}
