import type { Metadata } from "next";
import { SiteHead } from "@/components/site/SiteHead";
import Link from "next/link";
import { PRIVACY_SECTIONS as sections } from "@/lib/legal/privacy";

export const metadata: Metadata = {
  title: "Privacy policy",
  description:
    "How Vallo collects, uses, protects and shares personal data, and your rights under the Nigeria Data Protection Act 2023.",
};

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
        <p className="nf-site-badge">Last updated: 28 July 2026</p>
      </SiteHead>
    <div className="nf-shell pb-section">
      <div className="mx-auto max-w-3xl">

        {/* ---------------------------------------------------- document */}
        <div className="nf-panel nf-panel--card block nf-rise mt-block p-card-lg" style={{ animationDelay: "100ms" }}>
          <div className="space-y-block">
            {sections.map((s) => (
              <section key={s.title}>
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
