import { notFound } from "next/navigation";

import { previewHarnessIsOpen } from "@/lib/preview-harness";

/**
 * THE GATE EVERY SYSTEM-GALLERY PAGE CALLS FIRST.
 *
 * Exactly the gate `../page.tsx` and `../ported/page.tsx` carry, written once:
 * `previewHarnessIsOpen` needs development, or an explicit
 * `VALLO_PREVIEW_HARNESS=1`, and refuses outright on Vercel whatever that
 * variable says. A 404 and never a redirect, because a redirect tells a
 * stranger the route exists. The reasoning is in `lib/preview-harness.ts` and
 * `app/(dev)/preview/layout.tsx`.
 *
 * Kept as a function so each `page.tsx` is two lines and a new family cannot
 * forget the gate: the line is the first thing in the file.
 */
export function openOrNotFound(): void {
  if (!previewHarnessIsOpen(process.env)) notFound();
}
