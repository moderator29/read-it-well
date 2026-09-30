/* Screenshot harness for the success moment (docs/SUCCESS_MOMENTS.md,
   founder reference 54): the real `SuccessSheet` and `SuccessScreen`.

     /preview/success                        the index: every moment, both shapes
     ?moment=<id>&shape=sheet|page           one moment (defaults: stayPaid, sheet)
     ?v=success|submitted|approved           the older three, kept for old links
     &still=1                                the final frame, no animation

   Theme and motion come from the app's own cookies (nf_theme, nf_motion).
   Closed outside development by the preview layout's own guard. */
import { getDictionary } from "@vallo/i18n";
import type { SuccessMomentId } from "@/lib/ui/success-moments";
import { Preview, PREVIEW_MOMENTS } from "./Preview";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ v?: string; moment?: string; shape?: string; still?: string }>;
}) {
  const { v, moment, shape, still } = await searchParams;
  const ids = Object.keys(getDictionary("en").success.moments) as SuccessMomentId[];
  const fromV: SuccessMomentId | null =
    v === "submitted" ? "listingSubmitted" : v === "approved" ? "listingLive" : v === "success" ? "stayPaid" : null;
  const chosen = ids.find((id) => id === moment) ?? fromV;
  return (
    <Preview
      moment={chosen}
      ids={ids.length ? ids : PREVIEW_MOMENTS}
      shape={shape === "page" ? "page" : "sheet"}
      still={still === "1"}
    />
  );
}
