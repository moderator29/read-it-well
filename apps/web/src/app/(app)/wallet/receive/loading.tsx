import { Skeleton } from "@/components/ui/Skeleton";
import { LoadingShell, PageHeaderSkeleton } from "@/components/app/ScreenSkeleton";

/**
 * The wait, on /wallet/receive.
 *
 * Three reads before the screen can name the person: the session, the
 * ledger and the social identity. The card's real geometry is reserved: a
 * label, the handle at `nf-h3`, a label, the email, a sentence; then the
 * request surface with two 48px fields and a pair of buttons; then the
 * incoming strip at the wallet home's row height.
 */
export default function LoadingWalletReceive() {
  return (
    <LoadingShell label="Loading receive" className="mx-auto w-full max-w-2xl">
      <PageHeaderSkeleton />
      <Skeleton width="84%" height="1rem" radius="sm" />
      <Skeleton className="mt-inline-tight" width="40%" height="1rem" radius="sm" />

      <div className="nf-card mt-block rounded-[var(--nf-radius-xl)] p-card sm:p-cell">
        <Skeleton width="7rem" height="0.875rem" radius="sm" />
        <Skeleton className="mt-inline-tight" width="9rem" height="1.4375rem" radius="sm" />
        <Skeleton className="mt-block" width="8rem" height="0.875rem" radius="sm" />
        <Skeleton className="mt-inline-tight" width="60%" height="1rem" radius="sm" />
        <Skeleton className="mt-inline" width="92%" height="0.90625rem" radius="sm" />
      </div>

      <div className="nf-card mt-group rounded-[var(--nf-radius-xl)] p-card sm:p-cell">
        <Skeleton width="9rem" height="1.1875rem" radius="sm" />
        {Array.from({ length: 2 }, (_, i) => (
          <div key={i} className="mt-row">
            <Skeleton width="6rem" height="0.875rem" radius="sm" />
            <Skeleton className="mt-2xs" height="3rem" radius="lg" />
          </div>
        ))}
        <div className="mt-block grid grid-cols-2 gap-row">
          <Skeleton height="3rem" radius="lg" />
          <Skeleton height="3rem" radius="lg" />
        </div>
      </div>

      <div className="mt-block">
        <Skeleton width="9rem" height="0.8125rem" radius="sm" />
        <ul className="mt-heading divide-y divide-[var(--nf-divider)]">
          {Array.from({ length: 3 }, (_, i) => (
            <li key={i} className="flex items-center gap-md py-row">
              <Skeleton width="2.5rem" height="2.5rem" radius="sm" className="shrink-0" />
              <div className="min-w-0 flex-1">
                <Skeleton width="55%" height="1rem" radius="sm" />
                <Skeleton className="mt-inline-tight" width="35%" height="0.8125rem" radius="sm" />
              </div>
              <Skeleton width="4.5rem" height="1rem" radius="sm" className="shrink-0" />
            </li>
          ))}
        </ul>
      </div>
    </LoadingShell>
  );
}
