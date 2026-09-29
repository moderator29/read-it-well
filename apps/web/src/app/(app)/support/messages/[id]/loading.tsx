import { LoadingShell } from "@/components/app/ScreenSkeleton";
import { ThreadSkeleton } from "@/components/support/SupportSkeletons";

/** The wait on one support conversation: the status card and the bubbles. */
export default function LoadingSupportThread() {
  return (
    <LoadingShell label="Loading the conversation" className="mx-auto w-full max-w-2xl">
      <ThreadSkeleton />
    </LoadingShell>
  );
}
