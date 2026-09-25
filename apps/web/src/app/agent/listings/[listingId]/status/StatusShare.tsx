"use client";

import { useState } from "react";
import type { Dictionary } from "@vallo/i18n/core";
import { Button, ButtonLink } from "@/components/ui/Button";

/**
 * V-71: the lister's two actions on their Status kit. Save the picture (for
 * the Status itself, which carries no link) and share their own link (for the
 * caption, or a chat). The OS share sheet where there is one, the clipboard
 * where there is not, and the link as selectable text when both refuse.
 */
export function StatusShare({
  path,
  imagePath,
  copy,
}: {
  path: string;
  imagePath: string;
  copy: Dictionary["frontDoor"]["status"];
}) {
  const [note, setNote] = useState<string | null>(null);

  async function share() {
    const url = `${window.location.origin}${path}`;
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ url });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setNote(copy.copied);
    } catch {
      setNote(url);
    }
  }

  return (
    <div className="flex flex-col gap-row">
      <ButtonLink href={imagePath} variant="primary" full download data-testid="status-download">
        {copy.download}
      </ButtonLink>
      <Button variant="secondary" full onClick={() => void share()} data-testid="status-share">
        {copy.shareLink}
      </Button>
      <p className="nf-caption text-[var(--nf-content-muted)]">
        {copy.linkLabel}: <span className="[overflow-wrap:anywhere]">{path}</span>
      </p>
      {note && (
        <p className="nf-body-sm text-[var(--nf-content-secondary)] [overflow-wrap:anywhere]" role="status">
          {note}
        </p>
      )}
    </div>
  );
}
