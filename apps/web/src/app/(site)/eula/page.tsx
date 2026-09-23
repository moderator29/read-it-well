import type { Metadata } from "next";
import Link from "next/link";
import { SiteHead } from "@/components/site/SiteHead";
import { EULA_LAST_UPDATED, EULA_SECTIONS as sections } from "@/lib/legal/eula";

export const metadata: Metadata = {
  title: "Community rules",
  description:
    "What you may post on Vallo and how you may behave towards other people here: no tolerance for abuse, a report control on every surface, blocking, and a twenty four hour commitment on every report.",
};

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
          <div className="nf-panel nf-panel--card block nf-rise mt-block p-card-lg" style={{ animationDelay: "100ms" }}>
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
          </div>

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
