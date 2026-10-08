import "./offline.css";
import type { ReactNode } from "react";
import { MARK_SRC, markHeight } from "@/design-system/brand/Logo";

/**
 * THE OFFLINE SCREEN, MADE SMALL (8 October 2026). It is no longer what a
 * person sees when the signal drops: every page they have opened opens again
 * from the phone (`public/sw.js`), with a quiet line at the top that says so
 * (`ConnectionLine`). This screen is left for the one case nothing can cover,
 * a page this phone has never opened, asked for with no signal. So it is one
 * calm card, not a stage: Vallo's real mark (`/brand/vallo-mark.svg`, the one
 * artwork in the founder's own colours in both themes, D82), one line of
 * title, one of body, the retry, and the way back to what does work.
 *
 * Server safe and hook-free, so it renders from the precached document with
 * no network. The mark is a plain img of the file the service worker
 * precaches beside this document (the optimiser's addresses are not in the
 * offline cache). It is decorative; the title names the state.
 */
export function OfflineScreen({
  title,
  body,
  action,
  secondary,
  children,
}: {
  title: string;
  body: string;
  /** The one primary action. */
  action: ReactNode;
  /** The quiet way back to a page that works offline. */
  secondary?: ReactNode;
  /** What the phone holds for somebody with no signal; draws nothing for most. */
  children?: ReactNode;
}) {
  return (
    <main id="main" className="nf-offline" data-theme="dark">
      <section className="nf-island nf-offline__island" role="status" aria-live="polite" data-state-kind="offline">
        {/* eslint-disable-next-line @next/next/no-img-element -- precached, offline */}
        <img src={MARK_SRC} alt="" width={44} height={markHeight(44)} className="nf-offline__mark" decoding="async" />
        <h1 className="nf-offline__title">{title}</h1>
        <p className="nf-offline__body">{body}</p>
        {action}
        {secondary}
      </section>
      {children ? <div className="nf-offline__held">{children}</div> : null}
    </main>
  );
}
