import { DISCLAIMER_SECTIONS } from "@/lib/legal/disclaimer";
import { LoadingShell } from "@/components/app/ScreenSkeleton";
import { LEGAL_SKELETON_FRAME, LegalDocumentSkeleton } from "../LegalDocumentSkeleton";

/**
 * The wait, on the disclaimer. It had none of its own and fell through to the
 * (app) group's generic screen; it waits in the document's paper shape now,
 * like its two siblings (LegalDocumentSkeleton).
 */
export default function LoadingLegalDisclaimer() {
  return (
    <LoadingShell label="Loading the disclaimer" className={LEGAL_SKELETON_FRAME}>
      <LegalDocumentSkeleton sections={DISCLAIMER_SECTIONS.length} />
    </LoadingShell>
  );
}
