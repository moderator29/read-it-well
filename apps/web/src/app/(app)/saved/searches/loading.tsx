import { CardRowsSkeleton, LoadingShell, PageHeaderSkeleton } from "@/components/app/ScreenSkeleton";

/**
 * The wait, on the saved searches.
 *
 * Three rows rather than four, because the list is short by nature: a person
 * keeps a handful of hunts, not a feed of them. The geometry is the row's own,
 * so the fold does not move when the real rows arrive.
 */
export default function LoadingSavedSearches() {
  return (
    <LoadingShell label="Loading your saved searches" className="mx-auto w-full max-w-2xl">
      <PageHeaderSkeleton />
      <CardRowsSkeleton rows={3} />
    </LoadingShell>
  );
}
