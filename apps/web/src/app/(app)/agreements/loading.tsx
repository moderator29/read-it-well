import { Skeleton } from "@/components/ui/Skeleton";
import { LoadingShell, PageHeaderSkeleton } from "@/components/app/ScreenSkeleton";

/**
 * Agreements, before they arrive (details pass): the large title, the two
 * lines about how paying works, the section label and the cards, each a
 * title over one meta line, the shape `page.tsx` draws. It replaces the
 * group's generic three rows, which moved the page when the list landed.
 */
export default function LoadingAgreements() {
  return (
    <LoadingShell label="Loading your agreements" className="nf-page nf-md">
      <PageHeaderSkeleton />
      <Skeleton className="mt-inline" width="92%" height="0.9375rem" radius="sm" />
      <Skeleton className="mt-2xs" width="70%" height="0.9375rem" radius="sm" />
      <Skeleton className="mb-block mt-inline" width="60%" height="0.8125rem" radius="sm" />
      <Skeleton className="mb-heading" width="9rem" height="1.125rem" radius="sm" />
      <ul className="grid gap-row">
        {Array.from({ length: 3 }, (_, i) => (
          <li key={i} className="nf-card block p-card">
            <Skeleton width="62%" height="1rem" radius="sm" />
            <Skeleton className="mt-xs" width="48%" height="0.8125rem" radius="sm" />
          </li>
        ))}
      </ul>
    </LoadingShell>
  );
}
