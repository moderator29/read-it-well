"use client";

import { useState } from "react";
import { BrandIcon } from "@/design-system/icons/BrandIcon";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { ICON } from "@/components/app/Screen";
import { Sheet } from "@/components/ui/Sheet";
import { SupportChat } from "@/components/app/account/SupportChat";

/**
 * "Ask a question": the support chat, one tap from the top of the support home.
 *
 * The chat itself is the existing `SupportChat` (the grounded AI helper that
 * hands over to a person and files a real VAL-SUP ticket). On `/help` it sits
 * in the page as a collapsed card; here the whole row is the door and the
 * conversation opens in the shared `Sheet`, which owns the focus trap, the
 * scroll lock, Escape and the home-indicator inset.
 */
export function AskCard({ aiConsented }: { aiConsented: boolean }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        data-testid="support-ask"
        className="nf-panel nf-panel--card nf-card--interactive flex min-h-11 w-full cursor-pointer items-center gap-group border-[var(--nf-border-brand)] p-card-sm text-left"
      >
        <span className="block h-12 w-12 shrink-0" aria-hidden="true">
          <BrandIcon name="support-chat" fill />
        </span>
        <span className="min-w-0 flex-1">
          <span className="nf-body block font-semibold leading-tight text-[var(--nf-content-primary)]">
            Ask a question
          </span>
          <span className="nf-caption mt-row block text-[var(--nf-content-secondary)]">
            Our AI helper and the support team can help
          </span>
        </span>
        <UiIcon
          name="chevron-down"
          size={ICON.inline}
          className="-rotate-90 shrink-0 text-[var(--nf-content-muted)]"
        />
      </button>

      <Sheet open={open} onOpenChange={setOpen} title="Ask a question" closeLabel="Close" detents={[0.9]}>
        <SupportChat aiConsented={aiConsented} defaultOpen />
      </Sheet>
    </>
  );
}
