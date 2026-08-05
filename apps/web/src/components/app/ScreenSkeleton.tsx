import type { ReactNode } from "react";
import { Skeleton } from "@/components/ui/Skeleton";

/**
 * The pieces every `loading.tsx` is assembled from.
 *
 * There was no `loading.tsx` anywhere on this platform, which means every
 * navigation into a dynamic route showed the PREVIOUS screen until the data
 * landed and then replaced it wholesale. On a slow Nigerian connection that
 * reads as a tap that did nothing, followed by a page that jumps. `.nf-skeleton`
 * had been fully written for this and used zero times.
 *
 * These exist so the route files stay short enough to actually mirror their
 * screens. A loading file that is expensive to write gets written as a spinner,
 * and a centred spinner is the thing being replaced: it tells the user only that
 * something is happening, and then moves everything when it finishes.
 *
 * The announcement lives here too, once. `aria-busy` plus a polite live region
 * is what turns a pile of grey boxes into "loading" for a screen reader, and it
 * is the single easiest thing to forget per route.
 */
export function LoadingShell({
  /** Announced politely while the screen waits. English until the key lands. */
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={className} aria-busy="true" aria-live="polite">
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}

/**
 * `PageHeader`'s geometry, without `PageHeader`.
 *
 * The real header is a client component with a router-driven back button, and a
 * loading fallback must not pull the router in to draw a placeholder. The boxes
 * are the same size as the real ones - 36/40px round control, `nf-h2` title,
 * `mb-5 sm:mb-6` - so the title lands where the bar already was.
 */
export function PageHeaderSkeleton({ subtitle = false }: { subtitle?: boolean }) {
  return (
    <div className="mb-5 flex items-center gap-4 sm:mb-6">
      <Skeleton circle width="2.25rem" className="shrink-0 sm:hidden" />
      <Skeleton circle width="2.5rem" className="hidden shrink-0 sm:block" />
      <div className="min-w-0 flex-1">
        <Skeleton width="45%" height="1.375rem" radius="sm" />
        {subtitle ? <Skeleton className="mt-1.5" width="65%" height="0.8125rem" radius="sm" /> : null}
      </div>
    </div>
  );
}

/** The page title block used by the workspace screens: `nf-h1` plus a lede. */
export function TitleBlockSkeleton({ className }: { className?: string }) {
  return (
    <div className={className}>
      <Skeleton width="14rem" height="1.75rem" radius="sm" />
      <Skeleton className="mt-2" width="22rem" height="0.9375rem" radius="sm" />
    </div>
  );
}

/**
 * A stack of card rows, which is the shape of nearly every queue, ledger and
 * list on the platform. `rows` should match what the screen usually returns
 * rather than what it can return: the point is that the fold looks the same
 * before and after, and a list far longer than the viewport shifts nothing.
 */
export function CardRowsSkeleton({
  rows = 4,
  height = "5.5rem",
  className,
}: {
  rows?: number;
  height?: string;
  className?: string;
}) {
  return (
    <ul className={["space-y-3", className ?? ""].filter(Boolean).join(" ")}>
      {Array.from({ length: rows }, (_, i) => (
        <li key={i} className="nf-card p-4 sm:p-5">
          <div className="flex items-start gap-4">
            <Skeleton width="2.75rem" height="2.75rem" radius="md" className="shrink-0" />
            <div className="min-w-0 flex-1" style={{ minHeight: height }}>
              <Skeleton width="55%" height="0.9375rem" radius="sm" />
              <Skeleton className="mt-2" width="80%" height="0.75rem" radius="sm" />
              <Skeleton className="mt-2" width="35%" height="0.75rem" radius="sm" />
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
