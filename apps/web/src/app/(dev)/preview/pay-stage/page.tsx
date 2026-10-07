/* Storyboard harness for the pay stage (components/app/payments/PaymentStage,
   round 5, money being committed): the real component, one card, each face on
   a button so the sequence can be watched and screenshotted.

     /preview/pay-stage          the controls
     ?play=1                     step committing, processing, paid by itself

   The timed "play" is this harness only. In the product every face change
   comes from a server answer, never a clock. Theme and motion come from the
   app's own cookies. Closed outside development by the preview layout. */
import { PayStagePreview } from "./PayStagePreview";

export default async function Page({ searchParams }: { searchParams: Promise<{ play?: string }> }) {
  const { play } = await searchParams;
  return <PayStagePreview play={play === "1"} />;
}
