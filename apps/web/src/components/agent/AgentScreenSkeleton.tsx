import type { ReactNode } from "react";
import { Skeleton } from "@/components/ui/Skeleton";
import { LoadingShell } from "@/components/app/ScreenSkeleton";

/**
 * Agent Mode's frame, for the wait.
 *
 * Personal Mode and the admin console both put their chrome in a `layout.tsx`,
 * so it survives a navigation and a `loading.tsx` only has to draw the content.
 * Agent Mode does not: every agent page renders `AgentShell` itself, because the
 * shell needs the dictionary and the agent's own profile, both of which are
 * awaited inside the page.
 *
 * The consequence for loading states is concrete. If an agent `loading.tsx`
 * drew only its content, the rail and the header would VANISH for the length of
 * the wait and then reappear, and the content would slide 264px sideways when
 * they did. So the frame is reproduced here: same rail width token, same header
 * height, same content padding.
 *
 * This is a stand-in, not the shell, and it should be deleted the day
 * `AgentShell` moves into `app/agent/layout.tsx` - which is the real fix, and is
 * an edit to existing files rather than a new one.
 */
export function AgentScreenSkeleton({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-dvh">
      {/* The rail: present from lg up, exactly as `AgentRail` is. */}
      <aside
        aria-hidden="true"
        className="sticky top-0 hidden h-dvh w-[var(--nf-rail-width)] shrink-0 flex-col border-r border-[var(--nf-border-subtle)] bg-[var(--nf-surface-primary)] px-4 py-5 lg:flex"
      >
        <Skeleton className="mb-5" width="8.5rem" height="2.375rem" radius="md" />
        <div className="space-y-2">
          {Array.from({ length: 7 }, (_, i) => (
            <Skeleton key={i} height="2.75rem" radius="md" />
          ))}
        </div>
      </aside>

      <main id="main" className="min-w-0 flex-1">
        {/* Real chrome, not a skeleton: the header is glass and sticky whether
            or not the page beneath it has arrived, and drawing a grey slab in
            its place would be a bigger change than leaving it empty. */}
        <header className="nf-glass nf-glass--chrome nf-safe-top sticky top-0 z-40">
          <div className="flex h-[60px] items-center gap-2 px-3 sm:h-[64px] sm:gap-4 sm:px-5 md:px-8">
            <Skeleton circle width="2.25rem" className="shrink-0 sm:hidden" />
            <Skeleton circle width="2.5rem" className="hidden shrink-0 sm:block" />
            <Skeleton width="9rem" height="1rem" radius="sm" className="max-w-[40%]" />
          </div>
        </header>

        <LoadingShell
          label={label}
          className="px-4 pb-[calc(2.5rem+env(safe-area-inset-bottom))] pt-6 sm:px-5 md:px-8 md:pt-7 lg:pb-10"
        >
          {children}
        </LoadingShell>
      </main>
    </div>
  );
}

/** The `mb-6` title + lede block every agent workspace opens with. */
export function AgentTitleSkeleton() {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <Skeleton width="12rem" height="1.75rem" radius="sm" />
        <Skeleton className="mt-2" width="20rem" height="0.9375rem" radius="sm" />
      </div>
      <Skeleton width="9rem" height="3rem" radius="pill" />
    </div>
  );
}
