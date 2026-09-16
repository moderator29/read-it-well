import Link from "next/link";
import { PageHeader } from "@/components/app/PageHeader";
import { SUPPORT_HREF, SUPPORT_IS_EMAIL, SUPPORT_LABEL } from "@/lib/support-email";

/**
 * A legal document, read from inside the product.
 *
 * The same text as the marketing page and a different frame, which is the
 * whole point. Tapping Privacy in the side navigation used to hand a signed-in
 * person to `(site)/privacy`: a different shell, a different header, the
 * marketing rail, and no way back into the product except the browser's own
 * back button, which returned them to the marketing site rather than to the
 * booking they were halfway through reading.
 *
 * So the document comes to them. `PageHeader` carries the platform back flow
 * already, which returns to the previous in-app screen when this session has
 * one and falls through to a sensible page when somebody arrived by deep link,
 * so a person reading the refund rules from a checkout screen lands back on
 * that checkout screen rather than on a landing page.
 *
 * The content itself lives in `lib/legal/`, imported by both routes, because a
 * legal text that says two different things in two places is not a legal text.
 */
export function LegalDocument({
  title,
  intro,
  updated,
  sections,
  otherHref,
  otherLabel,
}: {
  title: string;
  intro: string;
  updated: string;
  sections: { title: string; body: React.ReactNode }[];
  /** The sibling document, linked to its IN-PRODUCT route, never the site one. */
  otherHref: string;
  otherLabel: string;
}) {
  return (
    <div className="nf-shell pb-3xl pt-md">
      <PageHeader title={title} subtitle={intro} fallback="/settings" />

      <p className="nf-chip mt-md">Last updated: {updated}</p>

      <div className="nf-card mt-lg p-5 sm:p-xl">
        <div className="space-y-xl">
          {sections.map((section) => (
            <section key={section.title}>
              <h2 className="nf-h3">{section.title}</h2>
              <div className="mt-2.5 space-y-sm text-[var(--nf-text-body-sm)] leading-relaxed text-[var(--nf-content-secondary)] [&_li]:mt-1.5 [&_strong]:text-[var(--nf-content-primary)] [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5">
                {section.body}
              </div>
            </section>
          ))}
        </div>
      </div>

      {/* Both links stay inside the product. Sending somebody to /terms from
          here would undo the entire reason this page exists. */}
      <p className="mt-xl text-center text-[var(--nf-text-body-sm)] text-[var(--nf-content-muted)]">
        See also our{" "}
        <Link
          href={otherHref}
          className="font-semibold text-[var(--nf-content-link)] hover:underline"
        >
          {otherLabel}
        </Link>
        , or{" "}
        <a
          href={SUPPORT_HREF}
          className="font-semibold text-[var(--nf-content-link)] hover:underline"
        >
          {SUPPORT_IS_EMAIL ? SUPPORT_LABEL : "the contact form"}
        </a>{" "}
        with any question.
      </p>
    </div>
  );
}
