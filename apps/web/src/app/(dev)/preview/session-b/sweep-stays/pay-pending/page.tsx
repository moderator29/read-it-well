import CheckoutPreview from "../../../f3/checkout/page";
import { ResultPreview } from "./ResultPreview";

/** The checkout with the pending sheet open over it. */
export default async function SweepPayPending() {
  return (
    <>
      <CheckoutPreview />
      <ResultPreview kind="pending" />
    </>
  );
}
