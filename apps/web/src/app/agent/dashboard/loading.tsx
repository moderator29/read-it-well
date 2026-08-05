import { Skeleton } from "@/components/ui/Skeleton";
import { AgentScreenSkeleton, AgentTitleSkeleton } from "@/components/agent/AgentScreenSkeleton";

/**
 * The wait, on the agent dashboard.
 *
 * This screen awaits the agent's profile, their listing counts, their bookings
 * and an earnings series before it renders anything - it is the heaviest read in
 * Agent Mode, and it is the landing screen after a sign-in, so it is the first
 * thing a new agent experiences.
 *
 * The stat wall is drawn at its real column counts (2 / 3 / 5) because those
 * change at breakpoints; a placeholder that guessed one count would reflow the
 * entire fold the moment the numbers arrived.
 */
export default function LoadingAgentDashboard() {
  return (
    <AgentScreenSkeleton label="Loading your dashboard">
      <AgentTitleSkeleton />

      <div className="nf-panel-sunken grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="nf-card flex flex-col gap-2 p-3.5 sm:gap-2.5 sm:p-4">
            <Skeleton width="2.25rem" height="2.25rem" radius="md" className="sm:hidden" />
            <Skeleton width="2.5rem" height="2.5rem" radius="md" className="hidden sm:block" />
            <Skeleton width="70%" height="0.75rem" radius="sm" />
            <Skeleton width="50%" height="1.25rem" radius="sm" />
          </div>
        ))}
      </div>

      {/* Earnings overview and the panel beside it, at the real 1.6fr / 1fr. */}
      <div className="mt-4 grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <section className="nf-card p-4 sm:p-5">
          <div className="mb-3 flex items-center justify-between">
            <Skeleton width="9rem" height="1.125rem" radius="sm" />
            <Skeleton width="5.5rem" height="2rem" radius="pill" />
          </div>
          <Skeleton width="8rem" height="1.75rem" radius="sm" />
          <Skeleton className="mt-2" width="5rem" height="0.8125rem" radius="sm" />
          {/* The sparkline's own box, so the card does not grow when it draws. */}
          <Skeleton className="mt-3" height="6.5rem" radius="md" />
        </section>

        <section className="nf-card p-4 sm:p-5">
          <div className="mb-3 flex items-center justify-between">
            <Skeleton width="7rem" height="1.125rem" radius="sm" />
          </div>
          <div className="space-y-3">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} height="2.5rem" radius="md" />
            ))}
          </div>
        </section>
      </div>
    </AgentScreenSkeleton>
  );
}
