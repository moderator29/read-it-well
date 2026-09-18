import { notFound } from "next/navigation";

/**
 * The dev-only preview harness. Real components, fixture props, so a
 * signed-in surface can be screenshotted in a sandbox that has no session.
 * 404 in production, exactly like `(dev)/gallery`. See BUILD_06_LEDGER
 * section 5. Never the proof of the ONE LAW, only the proof of the look.
 */
export default function PreviewLayout({ children }: { children: React.ReactNode }) {
  if (process.env.NODE_ENV === "production") notFound();
  return <>{children}</>;
}
