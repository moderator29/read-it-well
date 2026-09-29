import { notFound } from "next/navigation";

import { previewHarnessIsOpen } from "@/lib/preview-harness";
/* The staff console decks (f5, bc, bd, session-b) draw the console's own
   classes, which left `globals.css` for `app/admin/layout.tsx` (B-4). */
import "@/app/css/admin.css";

/**
 * The dev-only preview harness. Real components, fixture props, so a
 * signed-in surface can be screenshotted in a sandbox that has no session.
 * Never the proof of the ONE LAW, only the
 * proof of the look.
 *
 * WHY THIS IS NO LONGER A BARE `NODE_ENV === "production"` CHECK. It used to
 * be, and that turned out to close the only door the founder's own proof rule
 * can go through. His fifth point on the shape ruling is that every proof is
 * retaken on a server that actually hydrates, and `next dev` does not hydrate
 * reliably on this box; `next start` does, and `next start` is production, so
 * the harness 404ed on the only server a proof counts from.
 *
 * `previewHarnessIsOpen` carries the reasoning and, more to the point, carries
 * a test. The short version: an explicit opt in, AND never on Vercel whatever
 * the opt in says, so a variable set by mistake in project settings cannot put
 * fixture pages full of invented listings and invented money on
 * vallospaces.com.
 */
export default function PreviewLayout({ children }: { children: React.ReactNode }) {
  if (!previewHarnessIsOpen(process.env)) notFound();
  return <>{children}</>;
}
