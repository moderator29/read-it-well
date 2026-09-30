import type { ReactNode } from "react";
import { Skeleton } from "@/components/ui/Skeleton";
import { LoadingShell } from "@/components/app/ScreenSkeleton";

/**
 * The host workspace's frame, for the wait.
 *
 * `HostShell` renders inside each host page (it awaits the identity and the
 * dictionary), so a host `loading.tsx` has to draw the frame itself or the
 * sidebar and the bar would vanish for the wait and come back with the page.
 * This mirrors the shell by class, not by measurement: `nf-host`, the
 * workspace sidebar (`nf-desk-side`, drawn from 1024px exactly as the real
 * one is), the `nf-host__col nf-soft-top` column, the navy workspace bar with
 * the back and bell circles, the destination chips under it below 1024px,
 * and `nf-host__body` (40rem, or 76rem with `wide`, as the page asks).
 */
export function HostScreenSkeleton({
  label,
  wide = false,
  children,
}: {
  /** Announced politely while the screen waits. */
  label: string;
  /** The page renders `HostShell wide`. */
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="nf-host">
      <aside aria-hidden="true" className="nf-desk-side">
        <Skeleton height="3rem" radius="lg" />
        <div className="mt-md space-y-2xs">
          <Skeleton className="mb-xs" width="4rem" height="0.75rem" radius="sm" />
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} height="2.5rem" radius="md" />
          ))}
        </div>
      </aside>
      <div className="nf-host__col nf-soft-top">
        <header data-theme="dark" className="nf-ws-bar nf-glass nf-glass--chrome nf-safe-top sticky top-0 z-40">
          <div className="nf-ws-bar__row">
            <Skeleton circle width="2.75rem" className="shrink-0" />
            <Skeleton width="8rem" height="1rem" radius="sm" className="max-w-[40%]" />
            <Skeleton circle width="2.75rem" className="ml-auto shrink-0" />
          </div>
          {/* HostNav's chip row: small chips, below 1024px only. */}
          <div aria-hidden="true" className="flex gap-xs overflow-hidden px-gutter pb-xs lg:hidden">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} width="6rem" height="2.25rem" radius="pill" className="shrink-0" />
            ))}
          </div>
        </header>
        <LoadingShell label={label} className={wide ? "nf-host__body nf-host__body--wide" : "nf-host__body"}>
          {children}
        </LoadingShell>
      </div>
    </div>
  );
}

/** `nf-agent-head` (the Tables and Rooms screens): an `nf-h1` title and a
 *  body-large line under it. */
export function HostHeadSkeleton() {
  return (
    <div className="nf-agent-head" aria-hidden="true">
      <div className="min-w-0 flex-1">
        <Skeleton width="13rem" height="2rem" radius="sm" className="max-w-full" />
        <Skeleton className="mt-row" width="85%" height="1.125rem" radius="sm" />
        <Skeleton className="mt-2xs" width="55%" height="1.125rem" radius="sm" />
      </div>
    </div>
  );
}
