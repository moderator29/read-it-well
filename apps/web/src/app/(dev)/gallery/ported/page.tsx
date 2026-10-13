import { notFound } from "next/navigation";

import { previewHarnessIsOpen } from "@/lib/preview-harness";
import { PortedBoard } from "./PortedBoard";

/**
 * THE PORTED COMPONENTS, MOUNTED SO THEY CAN BE LOOKED AT.
 *
 * DragToConfirm, Unfold, SlidePagination, LiveIsland, InnerNav, BatchTray and the
 * illustrated action sheet, built from `docs/design/COMPONENT_LIBRARY.md`. Real
 * components, structural placeholders only (field labels and row names, never a
 * name, an amount or an id), so the material, the motion and both themes can be
 * checked in a browser without a session.
 *
 * GATED EXACTLY AS `../page.tsx` IS: `previewHarnessIsOpen` needs development, or
 * an explicit `VALLO_PREVIEW_HARNESS=1`, and refuses outright on Vercel whatever
 * that variable says. A 404, not a redirect, because a redirect tells a stranger
 * the route exists. The reasoning is written out in `app/(dev)/preview/layout.tsx`
 * and `lib/preview-harness.ts`.
 */
export default function PortedGalleryPage() {
  if (!previewHarnessIsOpen(process.env)) notFound();
  return <PortedBoard />;
}
