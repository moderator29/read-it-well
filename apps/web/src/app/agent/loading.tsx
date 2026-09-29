import { CardRowsSkeleton } from "@/components/app/ScreenSkeleton";
import { AgentScreenSkeleton, AgentTitleSkeleton } from "@/components/agent/AgentScreenSkeleton";

/**
 * The wait, for every agent console screen without a skeleton of its own
 * (SPEED-2): portfolio, notifications, the assistant and inspections had none,
 * so the nearest boundary was the root one and a console page waited on the
 * landing hero. `AgentShell` renders inside each page, so the frame is drawn
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
