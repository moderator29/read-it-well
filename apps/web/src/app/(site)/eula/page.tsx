import type { Metadata } from "next";
import { publicPageMetadata } from "@/lib/i18n/public-metadata";
import Link from "next/link";
import { DocumentSheet } from "@/components/app/money/DocumentSheet";
import { SiteHead } from "@/components/site/SiteHead";
import { EULA_LAST_UPDATED, EULA_SECTIONS as sections } from "@/lib/legal/eula";
import "@/app/css/site.css";

/* A10: the title and description in the page's own language, with its
   canonical and hreflang (lib/i18n/public-metadata.ts; words in publicMeta). */
export async function generateMetadata(): Promise<Metadata> {
  return publicPageMetadata("eula");
}

/**
 * The community rules, which is the end user licence agreement.
 *
 * Titled for the person reading it rather than for the guideline that asks
 * for it. Nobody has ever wanted to read an "end user licence agreement", and
 * the document's whole purpose is that people read the first two sentences
 * and know where the line is. The licence clause is section 8 and the file is
 * `lib/legal/eula.tsx`, so it is findable by the name a reviewer searches for.
 *
 * One document, two renderings, exactly as the terms are: this page and the
 * sign up acceptance that links to it.
 */
export default function EulaPage() {
  return (
    <>
      <SiteHead
        plate="skyline-waterfront-dusk"
        icon="shield-lock"
        chip="Legal"
        title="Community rules"
        lede="What you may post here, how you may behave towards other people, and what we do about it when somebody does not."
      >
        <p className="nf-site-badge">Last updated: {EULA_LAST_UPDATED}</p>
      </SiteHead>
      <div className="nf-shell pb-section">
        <div className="mx-auto max-w-3xl">
          {/* THE DOCUMENT, ON PAPER (D28.1; Session 3, W1): the shared document
             sheet is the frame, a light sheet on the reader's theme that prints
             on its own (print.css). Only the frame changed; every word is the
             legal text exactly as it was. */}
          <DocumentSheet kind="document" printable className="mt-block nf-legal-sheet">
            <div className="space-y-block">
              {sections.map((s) => (
                <section key={s.title}>
                  <h2 className="nf-h3">{s.title}</h2>
                  <div className="mt-inline space-y-row text-[length:var(--nf-text-body-sm)] leading-relaxed text-[var(--nf-content-secondary)] [&_li]:mt-inline [&_strong]:text-[var(--nf-content-primary)] [&_ul]:list-disc [&_ul]:space-y-inline [&_ul]:pl-heading">
                    {s.body}
                  </div>
                </section>
              ))}
            </div>
          </DocumentSheet>

          <p className="mt-block text-center text-[length:var(--nf-text-body-sm)] text-[var(--nf-content-muted)]">
            See also our{" "}
            <Link href="/terms" className="font-semibold text-[var(--nf-content-link)] hover:underline">
              Terms of service
            </Link>{" "}
            and our{" "}
            <Link href="/privacy" className="font-semibold text-[var(--nf-content-link)] hover:underline">
              Privacy policy
            </Link>
            , or{" "}
            <Link href="/contact" className="font-semibold text-[var(--nf-content-link)] hover:underline">
              contact us
            </Link>{" "}
            with any question.
          </p>
        </div>
      </div>
    </>
  );
}
