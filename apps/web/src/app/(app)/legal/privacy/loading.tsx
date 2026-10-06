import { PRIVACY_SECTIONS } from "@/lib/legal/privacy";
import { LoadingShell } from "@/components/app/ScreenSkeleton";
import { LEGAL_SKELETON_FRAME, LegalDocumentSkeleton } from "../LegalDocumentSkeleton";

/** The wait, on the privacy policy: the document's own paper shape (LegalDocumentSkeleton). */
export default function LoadingLegalPrivacy() {
  return (
    <LoadingShell label="Loading the privacy policy" className={LEGAL_SKELETON_FRAME}>
      <LegalDocumentSkeleton sections={PRIVACY_SECTIONS.length} />
    </LoadingShell>
  );
}
