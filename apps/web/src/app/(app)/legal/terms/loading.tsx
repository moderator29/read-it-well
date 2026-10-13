import { TERMS_SECTIONS } from "@/lib/legal/terms";
import { LoadingShell } from "@/components/app/ScreenSkeleton";
import { LEGAL_SKELETON_FRAME, LegalDocumentSkeleton } from "../LegalDocumentSkeleton";

/** The wait, on the terms: the document's own paper shape (LegalDocumentSkeleton). */
export default function LoadingLegalTerms() {
  return (
    <LoadingShell label="Loading the terms" className={LEGAL_SKELETON_FRAME}>
      <LegalDocumentSkeleton sections={TERMS_SECTIONS.length} />
    </LoadingShell>
  );
}
