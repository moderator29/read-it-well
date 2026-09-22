import { getDictionary, type Locale } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { OwnerDoneScreen } from "@/components/supply/OwnerRegisterForm";

/**
 * The owner form's fourth screen, as somebody who has just filed sees it.
 *
 * The route behind it needs a session and a filed row, and the proof server
 * has neither, so the harness renders the REAL component with a fixture
 * reference rather than a picture of one. The three screens before it need no
 * session and are photographed on the route itself.
 *
 * `mark: false` is deliberate: this draws the screen as the person who
 * answered "I have none of these" sees it, which is the answer this whole
 * build exists for and the state most owners will be in.
 */
export const dynamic = "force-dynamic";

export default async function PreviewOwnerDone() {
  const locale: Locale = await getLocale();
  const t = getDictionary(locale);
  /* `nf-shell` and the section padding are what `AppShell` puts around every
     page, restated here because the harness renders without the shell. */
  return (
    <div className="nf-shell py-section-tight">
      <OwnerDoneScreen
        t={t}
        filed={{ reference: "VL-AGT-00042", mark: false, attached: true }}
      />
    </div>
  );
}
