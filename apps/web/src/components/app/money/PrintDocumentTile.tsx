"use client";

import { ActionTile } from "@/components/ui/ActionTile";

/**
 * Print the page's document sheet, or save it as a PDF through the browser's
 * own dialog (print.css decides what reaches the paper). One renderer for the
 * screen and the paper, so the printed receipt cannot disagree with the one
 * on screen; a separate PDF service would be a second place for it to drift.
 *
 * The label is passed in, in the caller's words, so this file holds no copy.
 */
export function PrintDocumentTile({ label, testId }: { label: string; testId?: string }) {
  return <ActionTile icon="document" label={label} onClick={() => window.print()} data-testid={testId} />;
}
