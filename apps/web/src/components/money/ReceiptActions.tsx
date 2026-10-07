"use client";

import { Button, ButtonLink } from "@/components/ui/Button";
import { UiIcon } from "@/design-system/icons/UiIcon";

/**
 * Under a receipt (PREMIUM-STANDARD references 4 and 7): one filled
 * "Download receipt" and, under it, one quiet way on. The download is the
 * browser's own print dialog, where "Save as PDF" lives on every platform:
 * print.css prints the page's one printable sheet and nothing else, so the
 * PDF is the receipt on screen, never a second rendering of it.
 */
export function ReceiptActions({ back, testId }: { back?: { href: string; label: string }; testId?: string }) {
  return (
    <div className="nf-receipt-actions" data-testid={testId}>
      <Button variant="primary" size="lg" full onClick={() => window.print()} data-testid={testId ? `${testId}-download` : undefined}>
        <UiIcon name="document" size={18} />
        Download receipt
      </Button>
      {back ? (
        <ButtonLink href={back.href} variant="ghost" size="lg" full>
          {back.label}
        </ButtonLink>
      ) : null}
    </div>
  );
}
