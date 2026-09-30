import type { Metadata } from "next";
import { publicPageMetadata } from "@/lib/i18n/public-metadata";
import { SiteHead } from "@/components/site/SiteHead";
import Link from "next/link";
import { PRIVACY_SECTIONS as sections, PRIVACY_UPDATED } from "@/lib/legal/privacy";

/* A10: the title and description in the page's own language, with its
   canonical and hreflang (lib/i18n/public-metadata.ts; words in publicMeta). */
export async function generateMetadata(): Promise<Metadata> {
  return publicPageMetadata("privacy");
}

/**
 * Privacy policy.
 *
 * A real, structured document written for the Nigerian context and the
 * Nigeria Data Protection Act 2023 (NDPA), in plain language. No invented
 * registration numbers or addresses: where a formal detail does not exist yet
 * the document says how to reach us instead.
 */
export default function PrivacyPage() {
  return (
    <>
      <SiteHead
        plate="skyline-waterfront-dusk"
        icon="shield-lock"
        chip="Legal"
        title="Privacy policy"
        lede="How Vallo collects, uses and protects your personal data, and the rights the Nigeria Data Protection Act 2023 gives you over it."
      >
        <p className="nf-site-badge">Last updated: {PRIVACY_UPDATED}</p>
      </SiteHead>
    <div className="nf-shell pb-section">
      <div className="mx-auto max-w-3xl">

        {/* ---------------------------------------------------- document */}
        <div className="nf-panel nf-panel--card block nf-rise mt-block p-card-lg" style={{ animationDelay: "100ms" }}>
          <div className="space-y-block">
            {sections.map((s) => (
              <section key={s.title} id={s.id}>
                <h2 className="nf-h3">{s.title}</h2>
                <div className="mt-inline space-y-row text-[0.9375rem] leading-relaxed text-[var(--nf-content-secondary)] [&_li]:mt-inline [&_strong]:text-[var(--nf-content-primary)] [&_ul]:list-disc [&_ul]:space-y-inline [&_ul]:pl-heading">
                  {s.body}
                </div>
              </section>
            ))}
          </div>
        </div>

        {/* -------------------------------------------------- cross link */}
        <p className="mt-block text-center text-[0.875rem] text-[var(--nf-content-muted)]">
          See also our{" "}
          <Link href="/terms" className="font-semibold text-[var(--nf-content-link)] hover:underline">
            Terms of service
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
