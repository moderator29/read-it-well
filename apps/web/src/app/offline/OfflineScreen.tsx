import "./offline.css";
import type { ReactNode } from "react";

/**
 * THE OFFLINE SCREEN: the stage, the one Island, and what the phone holds
 * beneath it (`offline.css` says why it looks like this). Server safe and
 * hook-free, so it renders from the precached document with no network.
 *
 * The mark is Vallo's own app icon, `/pwa/icon-192.png`, which the service
 * worker precaches beside this document, so it draws with no network (the
 * optimiser's hashed URLs are not in the offline cache, so it is a plain
 * img). It is decorative; the title names the state.
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
        {/* eslint-disable-next-line @next/next/no-img-element -- precached, offline */}
        <img src="/pwa/icon-192.png" alt="" width={56} height={56} className="nf-offline__mark" decoding="async" />
        <h1 className="nf-offline__title">{title}</h1>
        <p className="nf-offline__body">{body}</p>
        {action}
      </section>
      {children ? <div className="nf-offline__held">{children}</div> : null}
    </main>
  );
}
