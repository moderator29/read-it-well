import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { RespondToReview } from "@/components/agent/RespondToReview";
import { forRespond } from "@/components/agent/agent-copy";

/**
 * The answer to "needs more information", as a business sees it: an
 * identity slot, an address slot and a registration slot. Nothing is sent
 * from the harness unless a file is chosen and the button pressed.
 */
export const dynamic = "force-dynamic";

export default async function PreviewRespond() {
  const t = getDictionary(await getLocale());
  return (
    <div className="nf-shell py-section-tight">
      <div className="mx-auto max-w-2xl">
        <RespondToReview t={forRespond(t)} business />
      </div>
    </div>
  );
}
