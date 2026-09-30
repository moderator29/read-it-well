"use client";

import { Button } from "@/components/ui/Button";

/** Prints the statement page; the print stylesheet drops the chrome (host-desk.css). */
export function PrintButton() {
  return (
    <Button variant="secondary" size="md" leadingIcon="file-text" onClick={() => window.print()}>
      Print or save as PDF
    </Button>
  );
}
