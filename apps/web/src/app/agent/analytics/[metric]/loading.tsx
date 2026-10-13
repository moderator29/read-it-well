import { AgentScreenSkeleton } from "@/components/agent/AgentScreenSkeleton";
import { FigureCardSkeleton, InnerHeadSkeleton } from "@/components/agent/intel/IntelSkeletons";

/**
 * The wait, on one figure's own page: its head, then the figure card at its
 * finished size (period control, figure, plot, the rows by listing), so the
 * card the page lands in is the card already drawn.
 */
export default function LoadingMetric() {
  return (
    <AgentScreenSkeleton label="Loading this figure">
      <div className="mx-auto max-w-3xl">
        <InnerHeadSkeleton />
        <FigureCardSkeleton rows={3} />
      </div>
    </AgentScreenSkeleton>
  );
}
