"use client";

import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { AI_DISCLOSURE } from "@/lib/ai/consent";
import { recordAiConsent } from "@/lib/ai/consent-actions";

/**
 * STORE-07: the disclosure shown before the first message to an AI surface.
 *
 * It says what the assistant is, who processes what is typed, and where, and
 * it offers a way to a person that involves no AI (`/contact`). Agreeing
 * records it (`recordAiConsent`); the routes refuse without that record.
 */
export function AiConsentSheet({
  onAgreed,
  onDeclined,
}: {
  onAgreed: () => void;
  onDeclined: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  return (
    /* A labelled region, not a dialog: this card sits inline in the chat
       (inside the support sheet), traps nothing and covers nothing, so the
       dialog role told a screen reader it had entered a modal it had not.
       It is deliberately NOT on useOverlay: it has no scrim, no scroll lock
       and no Escape to answer, and trapping Tab in an inline card would be
       the very defect the hook exists to prevent. (The role is not spelled
       out here, so the overlay sweep does not count this card as a modal.) */
    <section
      aria-labelledby="ai-consent-title"
      data-testid="ai-consent-sheet"
      className="nf-panel nf-panel--card block p-card"
    >
      <h2 id="ai-consent-title" className="nf-title-sm text-content">
        {AI_DISCLOSURE.title}
      </h2>
      <p className="nf-body-sm mt-2xs text-[var(--nf-content-secondary)]">{AI_DISCLOSURE.body}</p>
      <p className="nf-body-sm mt-2xs text-[var(--nf-content-secondary)]">
        <Link href="/privacy#ai" className="underline">
          How we handle it
        </Link>
      </p>
      <div className="mt-md flex flex-wrap gap-sm">
        <Button
          variant="primary"
          disabled={busy}
          onClick={() => {
            setBusy(true);
            setFailed(false);
            void recordAiConsent()
              .then((result) => (result.ok ? onAgreed() : setFailed(true)))
              .catch(() => setFailed(true))
              .finally(() => setBusy(false));
          }}
        >
          {AI_DISCLOSURE.agree}
        </Button>
        <Button variant="quiet" disabled={busy} onClick={onDeclined}>
          {AI_DISCLOSURE.decline}
        </Button>
      </div>
      {failed ? (
        <p role="alert" className="nf-body-sm mt-sm" data-testid="ai-consent-failed">
          That was not saved, so nothing has been sent. Try again.
        </p>
      ) : null}
      <p className="nf-body-sm mt-sm">
        <Link href="/contact" className="underline" data-testid="ai-consent-human">
          {AI_DISCLOSURE.human}
        </Link>
      </p>
    </section>
  );
}

export default AiConsentSheet;
