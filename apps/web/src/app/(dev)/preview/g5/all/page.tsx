import Link from "next/link";

import { previewEmails } from "../emails";

/**
 * Every email, listed with its subject and its plain-text twin, so a reader
 * can open each frame and check the two renderings say the same thing.
 */
export const dynamic = "force-dynamic";

export default function PreviewG5All() {
  const emails = previewEmails();
  return (
    <main id="main" className="nf-shell py-section">
      <h1 className="nf-h2">G5 emails</h1>
      <p className="nf-body-muted mt-xs">
        {emails.length} messages: the five auth templates the generator writes, then the
        transactional catalogue from its fixture matrix.
      </p>
      <ul className="mt-md flex flex-col gap-lg">
        {emails.map((email) => (
          <li key={email.slug} className="flex flex-col gap-xs">
            <Link className="nf-link-quiet text-[var(--nf-content-link)]" href={`/preview/g5?t=${email.slug}`}>
              {email.label}
            </Link>
            <span className="nf-caption">{email.subject}</span>
            <details>
              <summary className="nf-caption">Plain-text twin</summary>
              <pre className="nf-caption mt-xs whitespace-pre-wrap">{email.text}</pre>
            </details>
          </li>
        ))}
      </ul>
    </main>
  );
}
