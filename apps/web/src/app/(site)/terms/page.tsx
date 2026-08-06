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
          <h1 className="nf-h1 mx-auto mt-5 max-w-[16ch]">Terms of service</h1>
          <p className="mx-auto mt-4 max-w-[52ch] text-[var(--nf-content-secondary)]">
            The rules of the platform, in plain language: what you can expect from
            RentMe, and what RentMe expects from you.
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
          <Link href="/privacy" className="font-semibold text-[var(--nf-electric-300)] hover:underline">
            Privacy policy
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
