import type { Metadata } from "next";
import Link from "next/link";
import { BrandIcon } from "@/design-system/icons/BrandIcon";
import { PRIVACY_SECTIONS as sections } from "@/lib/legal/privacy";

export const metadata: Metadata = {
  title: "Privacy policy",
  description:
    "How RentMe collects, uses, protects and shares personal data, and your rights under the Nigeria Data Protection Act 2023.",
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
    <div className="nf-shell py-12 sm:py-16">
      <div className="mx-auto max-w-3xl">
        {/* -------------------------------------------------------- hero */}
        <div className="nf-rise text-center">
          <span className="nf-chip mx-auto">
            <span className="inline-grid h-4 w-4 place-items-center">
              <BrandIcon name="shield-lock" fill />
            </span>
            Legal
          </span>
          <h1 className="nf-h1 mx-auto mt-5 max-w-[16ch]">Privacy policy</h1>
          <p className="mx-auto mt-4 max-w-[52ch] text-[var(--nf-content-secondary)]">
            How RentMe collects, uses and protects your personal data, and the
            rights the Nigeria Data Protection Act 2023 gives you over it.
          </p>
          <p className="nf-chip mx-auto mt-5">Last updated: 28 July 2026</p>
        </div>

        {/* ---------------------------------------------------- document */}
        <div className="nf-card nf-rise mt-10 p-5 sm:p-8" style={{ animationDelay: "100ms" }}>
          <div className="space-y-8">
            {sections.map((s) => (
              <section key={s.title}>
                <h2 className="nf-h3">{s.title}</h2>
                <div className="mt-2.5 space-y-3 text-[0.9375rem] leading-relaxed text-[var(--nf-content-secondary)] [&_li]:mt-1.5 [&_strong]:text-[var(--nf-content-primary)] [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5">
                  {s.body}
                </div>
              </section>
            ))}
          </div>
        </div>

        {/* -------------------------------------------------- cross link */}
        <p className="mt-8 text-center text-[0.875rem] text-[var(--nf-content-muted)]">
          See also our{" "}
          <Link href="/terms" className="font-semibold text-[var(--nf-electric-300)] hover:underline">
            Terms of service
          </Link>
          , or{" "}
          <Link href="/contact" className="font-semibold text-[var(--nf-electric-300)] hover:underline">
            contact us
          </Link>{" "}
          with any question.
        </p>
      </div>
    </div>
  );
}
