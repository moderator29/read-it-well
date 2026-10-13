import type { Metadata } from "next";
import Link from "next/link";
import { SiteHead } from "@/components/site/SiteHead";
import { DocumentSheet } from "@/components/app/money/DocumentSheet";
import { HOST_AGREEMENT_SECTIONS, HOST_AGREEMENT_VERSION } from "@/lib/legal/host-agreement";
import "@/app/css/site.css";

export const metadata: Metadata = {
  title: "Host Agreement",
  description: "What a host of a stay or a restaurant on Vallo agrees to: only listed charges, plain cancellation rules, and honest records.",
};

/**
 * The Host Agreement, beside the Terms of service and the Privacy policy.
 * Every host agrees to all three before their business is created; see
 * `lib/legal/host-agreement.tsx`.
 */
export default function HostAgreementPage() {
  return (
    <>
      <SiteHead
        plate="skyline-waterfront-dusk"
        icon="shield-lock"
        chip="Legal"
        title="Host Agreement"
        lede="What you agree to when you host a stay or a restaurant on Vallo, in plain language."
      >
        <p className="nf-site-badge">Version {HOST_AGREEMENT_VERSION}</p>
      </SiteHead>
      <div className="nf-shell pb-section">
        <div className="mx-auto max-w-3xl">
          <DocumentSheet kind="document" printable className="mt-block nf-legal-sheet">
            <div className="space-y-block">
              {HOST_AGREEMENT_SECTIONS.map((s) => (
                <section key={s.title}>
                  <h2 className="nf-h3">{s.title}</h2>
                  <div className="mt-inline space-y-row text-[length:var(--nf-text-body)] leading-relaxed text-[var(--nf-content-secondary)] [&_li]:mt-inline [&_strong]:text-[var(--nf-content-primary)] [&_ul]:list-disc [&_ul]:space-y-inline [&_ul]:pl-heading">
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
            and{" "}
            <Link href="/privacy" className="font-semibold text-[var(--nf-content-link)] hover:underline">
              Privacy policy
            </Link>
            .
          </p>
        </div>
      </div>
    </>
  );
}
