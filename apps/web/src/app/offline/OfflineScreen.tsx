import "./offline.css";
import type { ReactNode } from "react";
import { VectorMark } from "@/components/auth/VectorMark";

/**
 * THE OFFLINE SCREEN: the stage, the one Island, and what the phone holds
 * beneath it (`offline.css` says why it looks like this). Server safe and
 * hook-free, so it renders from the precached document with no network.
 *
 * The mark is the inline vector (`VectorMark`): the offline page cannot fetch
 * an image, and the optimiser's hashed URLs are not in the offline cache, so
 * nothing here is a request. It is decorative; the title names the state.
 */
export function OfflineScreen({
  title,
  body,
  action,
  children,
}: {
  title: string;
  body: string;
  /** The one action. */
  action: ReactNode;
  /** What the phone holds for somebody with no signal; draws nothing for most. */
  children?: ReactNode;
}) {
  return (
    <main id="main" className="nf-offline" data-theme="dark">
      <section className="nf-island nf-offline__island" role="status" aria-live="polite" data-state-kind="offline">
        <VectorMark size={56} className="nf-offline__mark" />
        <h1 className="nf-offline__title">{title}</h1>
        <p className="nf-offline__body">{body}</p>
        {action}
      </section>
      {children ? <div className="nf-offline__held">{children}</div> : null}
    </main>
  );
}
