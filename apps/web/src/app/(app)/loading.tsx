import { CardRowsSkeleton, LoadingShell, PageHeaderSkeleton } from "@/components/app/ScreenSkeleton";

/**
 * The wait, for every in-app screen that has no skeleton of its own (SPEED-2).
 *
 * WHY THIS FILE EXISTS. Without it the nearest boundary above an `(app)` page
 * was the ROOT `loading.tsx`, which sits above this group's layout and draws
 * the landing hero. Two things followed. A client navigation from one tab to,
 * say, `/agreements` had no boundary below the shared shell to show, so the
 * router waited for the whole server render with nothing changing on screen:
 * the tap appeared not to register. And a hard load of such a page painted
 * the marketing hero before the app shell, then swapped.
 *
 * Here the shell (rail, top bar, tab bar) stays put because the group layout
 * is above this boundary, and the page area shows the shape nearly all of
 * these screens share: `mx-auto max-w-2xl`, a `PageHeader` with its subtitle,
 * then panel-card rows. Any route with a closer `loading.tsx` keeps its own.
 */
export default function LoadingAppScreen() {
  return (
    <LoadingShell label="Loading" className="mx-auto w-full max-w-2xl">
      <PageHeaderSkeleton subtitle />
      <CardRowsSkeleton rows={3} />
    </LoadingShell>
  );
}
