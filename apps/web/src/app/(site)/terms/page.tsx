import type { Metadata } from "next";
import Link from "next/link";
import { BrandIcon } from "@/design-system/icons/BrandIcon";
import { TERMS_SECTIONS as sections } from "@/lib/legal/terms";

export const metadata: Metadata = {
  title: "Terms of service",
  description:
    "The rules for using RentMe: accounts, bookings, payments held until after inspection or check-in, refunds, agent listings and acceptable use.",
};

/**
 * Terms of service.
 *
 * A structured, honest document for the Nigerian context. It describes how the
 * platform actually works (payments held until after check-in or inspection,
 * free listing, commission on completed bookings) without inventing corporate
 * details that do not exist yet.
 */
export default function TermsPage() {
  return (
    <div className="nf-shell py-section">
      <div className="mx-auto max-w-3xl">
        {/* -------------------------------------------------------- hero */}
        <div className="nf-rise text-center">
          <span className="nf-chip mx-auto">
            <span className="inline-grid h-4 w-4 place-items-center">
              <BrandIcon name="shield-lock" fill />
            </span>
            Legal
          </span>
          <h1 className="nf-h1 mx-auto mt-heading max-w-[16ch]">Terms of service</h1>
          <p className="mx-auto mt-group max-w-[52ch] text-[var(--nf-content-secondary)]">
            The rules of the platform, in plain language: what you can expect from
            RentMe, and what RentMe expects from you.
          </p>
          <p className="nf-chip mx-auto mt-heading">Last updated: 28 July 2026</p>
        </div>

        {/* ---------------------------------------------------- document */}
        <div className="nf-card nf-rise mt-block p-card-lg" style={{ animationDelay: "100ms" }}>
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
  );
}
