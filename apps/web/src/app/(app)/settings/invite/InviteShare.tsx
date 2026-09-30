"use client";

import { useState } from "react";
import type { Dictionary } from "@vallo/i18n/core";
import { Button, ButtonLink } from "@/components/ui/Button";

/** A5. The member's invite link: copy it, or send it on WhatsApp. */
export function InviteShare({ copy, url, code }: { copy: Dictionary["publicDoors"]["invite"]; url: string; code: string }) {
  const [copied, setCopied] = useState(false);
  const text = copy.shareText.replace("{url}", url);
  return (
    <div className="grid gap-sm">
      <div className="nf-pd-card">
        <p className="nf-section-label">{copy.linkLabel}</p>
        <p className="nf-numeric break-all font-semibold text-[var(--nf-content-primary)]" data-testid="invite-url">
          {url}
        </p>
        <p className="nf-caption text-[var(--nf-content-muted)]">
          {copy.codeLabel}: <span className="nf-numeric font-semibold">{code}</span>
        </p>
      </div>
      <Button
        type="button"
        variant="primary"
        size="lg"
        full
        leadingIcon="link"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 2400);
          } catch {
            setCopied(false);
          }
        }}
      >
        {copied ? copy.copied : copy.copy}
      </Button>
      <ButtonLink
        href={`https://wa.me/?text=${encodeURIComponent(text)}`}
        variant="secondary"
        size="lg"
        full
        leadingIcon="share"
        target="_blank"
        rel="noopener noreferrer"
      >
        {copy.whatsapp}
      </ButtonLink>
      <p className="nf-caption text-[var(--nf-content-muted)]">{copy.noReward}</p>
    </div>
  );
}
