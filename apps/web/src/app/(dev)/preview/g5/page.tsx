import { notFound } from "next/navigation";

import { previewEmail } from "./emails";

/**
 * One email, filling the phone frame, so `verify-shots` proves the register:
 * `/preview/g5` is the confirm sign-up template and `/preview/g5?t=<slug>`
 * any other. The frame is an `srcdoc` iframe, which is the closest a browser
 * gets to a mail client: the email's own inline styles, no stylesheet from
 * this app leaking in, and the app's theme irrelevant to what is inside.
 * `/preview/g5/all` lists every slug.
 */
export const dynamic = "force-dynamic";

export default async function PreviewG5({
  searchParams,
}: {
  searchParams: Promise<{ t?: string }>;
}) {
  const { t } = await searchParams;
  const email = previewEmail(t);
  if (!email) notFound();

  return (
    <main id="main" className="h-dvh w-full">
      <h1 className="sr-only">{email.label}</h1>
      <iframe
        title={email.label}
        srcDoc={email.html}
        className="block h-full w-full border-0"
        sandbox=""
      />
    </main>
  );
}
