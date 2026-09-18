import { TERMS_SECTIONS } from "@/lib/legal/terms";
import { LegalDocument } from "@/app/(app)/legal/LegalDocument";

/**
 * The in-app legal reader with the real terms. `/legal/*` needs a session
 * (the proxy holds the door on it), so the same component is mounted here
 * inside the shell's content wrapper for the look. The chrome above and
 * below it is the app shell's and is not drawn here.
 */
export default function PreviewLegal() {
  return (
    <main id="main" className="min-h-dvh">
      <div className="nf-shell py-section-tight">
        <LegalDocument
          title="Terms of service"
          intro="The agreement between you and Vallo when you use the platform, book a place, or list one."
          updated="28 July 2026"
          sections={TERMS_SECTIONS}
          otherHref="/legal/privacy"
          otherLabel="Privacy policy"
        />
      </div>
    </main>
  );
}
