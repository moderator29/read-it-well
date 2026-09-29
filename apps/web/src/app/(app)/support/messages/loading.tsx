import { LoadingShell } from "@/components/app/ScreenSkeleton";
import { TicketListSkeleton } from "@/components/support/SupportSkeletons";

/** The wait on the support inbox: rows in the shape they arrive in. */
export default function LoadingSupportMessages() {
  return (
    <LoadingShell label="Loading your support conversations" className="mx-auto w-full max-w-2xl">
      <TicketListSkeleton />
    </LoadingShell>
  );
}
