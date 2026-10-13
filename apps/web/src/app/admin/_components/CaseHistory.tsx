"use client";

import type { ReactNode } from "react";
import { Unfold } from "@/components/ui/Unfold";
import "./admin-material.css";

/**
 * A CASE'S HISTORY, FOLDED (COMPONENT_LIBRARY, "Unfold accordion": "admin case
 * history").
 *
 * A person file, a stay or a listing carries a long list of what happened to it,
 * newest first. It is the second job of the page (north star 16.6: an overview
 * answers what needs me, an inner page answers one question completely), and a
 * reviewer who is deciding needs the facts above it, not forty lines of events
 * between them and the decision. So the history is one Unfold: its title and
 * the number of entries are always on the page, and the entries open in place
 * when wanted, with the keyboard behaviour and the quiet-motion rules the
 * component already has.
 *
 * WHAT NEVER GOES BEHIND IT. Money, price, trust facts and a decision's state:
 * those stay on the page. This holds only the chronological record, which the
 * audit log keeps in full regardless of whether anyone opens it. The entries are
 * the server's children, rendered once on the server; this only decides whether
 * they are shown.
 */
export function CaseHistory({
  title,
  hint,
  children,
  defaultOpen = false,
  testId,
}: {
  title: string;
  /** "12 entries": a real count, from the list this wraps. */
  hint?: string;
  children: ReactNode;
  defaultOpen?: boolean;
  testId?: string;
}) {
  return (
    <Unfold
      className="nf-admin-casehistory"
      data-testid={testId}
      headingLevel={2}
      defaultValue={defaultOpen ? ["history"] : []}
      items={[{ id: "history", title, ...(hint ? { hint } : {}), icon: "history", content: children }]}
    />
  );
}
