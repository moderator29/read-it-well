import Link from "next/link";
import { BackButton } from "@/components/site/BackButton";

/** The email harness index (track H). One entry today: the welcome email. */
export default function PreviewEmailIndex() {
  return (
    <main className="nf-shell py-section">
      <BackButton fallback="/preview" />
      <h1 className="nf-h2 mt-sm">Emails</h1>
      <ul className="mt-md flex flex-col gap-xs">
        <li>
          <Link className="nf-link" href="/preview/email/welcome">
            Welcome, every version, at phone and desktop width with its plain text
          </Link>
        </li>
      </ul>
    </main>
  );
}
