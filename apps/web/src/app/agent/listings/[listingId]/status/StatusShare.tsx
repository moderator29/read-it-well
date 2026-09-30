"use client";

import { useShare } from "@/lib/ui/use-copy";
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
  /* Details pass: the one share path (native sheet, Web Share, then the
     clipboard with the one toast). */
  const shareLink = useShare();

  async function share() {
    await shareLink({ url: `${window.location.origin}${path}` });
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
    </div>
  );
}
