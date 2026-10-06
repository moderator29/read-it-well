import { CardRowsSkeleton } from "@/components/app/ScreenSkeleton";
import { AgentScreenSkeleton, AgentTitleSkeleton } from "@/components/agent/AgentScreenSkeleton";

/**
 * The wait, for every agent console screen without a skeleton of its own
 * (SPEED-2). Portfolio, notifications, the assistant and inspections waited
 * here on generic rows until R3-17 gave each its own shape (their
 * `loading.tsx`); what still lands here is a route added later without one. `AgentShell` renders inside each page, so the frame is drawn
 * here too: the rail from lg up, the sticky glass header, the title, rows.
 */
export default function LoadingAgentScreen() {
  return (
    <AgentScreenSkeleton label="Loading">
      <div className="mx-auto max-w-2xl">
        <AgentTitleSkeleton />
        <CardRowsSkeleton rows={3} />
      </div>
    </AgentScreenSkeleton>
  );
}
