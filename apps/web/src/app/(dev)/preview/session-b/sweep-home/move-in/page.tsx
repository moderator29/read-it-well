import MoveInPreview from "../../../f3/move-in/page";
import { SweepFrame } from "../Frame";

/** `/rent/move-in/[listingId]`, the Calculate Breakdown ledger, from the f3 fixture rental. */
export const dynamic = "force-dynamic";

export default async function SweepMoveIn() {
  return (
    <SweepFrame route="/rent/move-in/fixture">
      <MoveInPreview />
    </SweepFrame>
  );
}
