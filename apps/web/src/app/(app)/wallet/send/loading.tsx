import { Skeleton } from "@/components/ui/Skeleton";
import { LoadingShell, PageHeaderSkeleton } from "@/components/app/ScreenSkeleton";

/**
 * The wait, on /wallet/send.
 *
 * The compose step's real geometry: the lede, the rolling figure at `nf-h0`
 * centred, one glass surface holding three fields at the 48px control height
 * and a two-column balance line, the consequence sentence, then the 56px
 * primary. The balance is read before anything renders, and a send page that
 * flashes a form with no ceiling under it reads as "we do not know how much
 * you have".
 */
export default function LoadingWalletSend() {
  return (
    <LoadingShell label="Loading send" className="mx-auto w-full max-w-2xl">
      <PageHeaderSkeleton />
      <Skeleton width="86%" height="1rem" radius="sm" />
      <Skeleton className="mt-inline-tight" width="52%" height="1rem" radius="sm" />

      <div className="mt-block flex justify-center">
        <Skeleton width="11rem" height="3rem" radius="sm" />
      </div>

      <div className="nf-card mt-block rounded-[var(--nf-radius-xl)] p-card sm:p-cell">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className={i === 0 ? "" : "mt-row"}>
            <Skeleton width="7rem" height="0.875rem" radius="sm" />
            <Skeleton className="mt-2xs" height="3rem" radius="lg" />
          </div>
        ))}
        <div className="mt-block grid grid-cols-2 gap-x-lg border-t border-[var(--nf-border-subtle)] pt-row">
          {Array.from({ length: 2 }, (_, i) => (
            <div key={i}>
              <Skeleton width="6rem" height="0.875rem" radius="sm" />
              <Skeleton className="mt-inline-tight" width="70%" height="1rem" radius="sm" />
            </div>
          ))}
        </div>
      </div>

      <Skeleton className="mt-row" width="80%" height="0.90625rem" radius="sm" />
      <Skeleton className="mt-block" height="3.5rem" radius="lg" />
    </LoadingShell>
  );
}
