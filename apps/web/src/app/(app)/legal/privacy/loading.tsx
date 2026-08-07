import { Skeleton } from "@/components/ui/Skeleton";
import { LoadingShell, PageHeaderSkeleton } from "@/components/app/ScreenSkeleton";

/**
 * The wait, on the privacy policy.
 *
 * The same text as the public page, inside the product shell. Long prose, so the placeholder is paragraphs rather than cards.
 */
export default function LoadingLegalPrivacy() {
  return (
    <LoadingShell label="Loading the privacy policy" className="mx-auto w-full max-w-3xl">
      <PageHeaderSkeleton />
      <div className="space-y-3">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="nf-card p-4">
            <Skeleton width="35%" height="1.0625rem" radius="sm" />
            <Skeleton className="mt-2.5" width="95%" height="0.875rem" radius="sm" />
          </div>
        ))}
      </div>
    </LoadingShell>
  );
}
