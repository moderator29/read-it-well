import Link from "next/link";
import { PageHeader } from "@/components/app/PageHeader";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { SUPPORT_HREF, SUPPORT_IS_EMAIL, SUPPORT_LABEL } from "@/lib/support-email";
import "@/app/css/system.css";

/**
 * A legal document, read from inside the product: a designed reading
 * surface rather than a card of paragraphs.
 *
 * The same text as the marketing page and a different frame, which is the
 * whole point. Tapping Privacy in the side navigation used to hand a
 * signed-in person to `(site)/privacy`: a different shell, a different
 * header, and no way back into the product except the browser's own back
 * button. So the document comes to them. `PageHeader` carries the platform
 * back flow already, so a person reading the refund rules from a checkout
 * screen lands back on that checkout screen.
 *
 * THE ANATOMY. The header with its back control, the last-updated line, a
 * glass table of contents (every section a 44px row with its number in the
 * brand ink, anchored to the section), then the sections as measured prose
 * on the canvas with hairlines between them and a quiet way back to the
 * contents under each. The prose is not boxed: a card around twelve
 * sections of terms reads as a form to be filled in, and this is a text to
 * be read.
 *
 * The content itself lives in `lib/legal/`, imported by both routes, because
 * a legal text that says two different things in two places is not a legal
 * text. The registered name of the operator appears only inside that text,
 * where the document is legal text (rule 14); everything this frame draws
 * says Vallo.
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
    <div className="mx-auto w-full max-w-3xl pb-3xl pt-md">
      <PageHeader title={title} subtitle={intro} fallback="/settings" />

      <p className="nf-legal__meta">
        <span>Last updated</span>
        <time>{updated}</time>
      </p>

      <nav id="legal-contents" aria-labelledby="legal-contents-title" className="nf-legal__toc">
        <p id="legal-contents-title" className="nf-overline nf-legal__toc-title">
          Contents
        </p>
        <ol>
          {sections.map((section, index) => (
            <li key={section.title}>
              <a href={`#${anchor(section.title)}`}>
                <span className="nf-legal__num" aria-hidden="true">
                  {index + 1}
                </span>
                <span>{section.title}</span>
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <div className="nf-legal__body">
        {sections.map((section, index) => (
          <section
            key={section.title}
            id={anchor(section.title)}
            aria-labelledby={`${anchor(section.title)}-title`}
            className="nf-legal__section"
          >
            <h2 id={`${anchor(section.title)}-title`} className="nf-h3 nf-legal__heading">
              <span className="nf-legal__num" aria-hidden="true">
                {index + 1}
              </span>
              <span>{section.title}</span>
            </h2>
            <div className="nf-legal__prose">{section.body}</div>
            <a href="#legal-contents" className="nf-legal__top nf-tap">
              <UiIcon name="arrow-up" size={16} />
              Contents
            </a>
          </section>
        ))}
      </div>

      {/* Both links stay inside the product. Sending somebody to /terms from
          here would undo the entire reason this page exists. */}
      <p className="nf-legal__foot">
        See also our <Link href={otherHref}>{otherLabel}</Link>, or{" "}
        <a href={SUPPORT_HREF}>{SUPPORT_IS_EMAIL ? SUPPORT_LABEL : "the contact form"}</a>{" "}
        with any question.
      </p>
    </div>
  );
}

/** A stable fragment id from a section title: lowercase, hyphenated, ASCII. */
function anchor(title: string): string {
  return (
    "s-" +
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
  );
}
