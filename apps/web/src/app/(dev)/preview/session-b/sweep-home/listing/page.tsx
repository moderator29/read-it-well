import ListingPreview from "../../../f3/listing/page";
import { SweepFrame } from "../Frame";

/** `/listing/[id]` on a tenancy, as the f3 harness composes it from fixtures. */
export const dynamic = "force-dynamic";

export default async function SweepListing() {
  return (
    <SweepFrame route="/listing/fixture">
      <ListingPreview />
    </SweepFrame>
  );
}
