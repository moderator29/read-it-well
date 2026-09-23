import CheckoutPreview from "../../../f3/checkout/page";
import { ResultPreview } from "../pay-pending/ResultPreview";

/** The checkout with the failed sheet open over it. */
export default async function SweepPayFailed() {
  return (
    <>
      <CheckoutPreview />
      <ResultPreview kind="failed" />
    </>
  );
}
