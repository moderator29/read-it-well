"use client";

import { useEffect, useMemo, useState } from "react";
import { InnerNav, type InnerNavItem } from "@/components/ui/InnerNav";
import type { UiIconName } from "@/design-system/icons/UiIcon";
import { useMotionGate } from "@/components/motion/useMotionGate";
import "./admin-material.css";

/**
 * A DESK'S SECTIONS, IN THE GLASS PULL (COMPONENT_LIBRARY, "Glass navigation":
 * admin desks, where each desk has its own sections).
 *
 * The Money desk answers six questions on one page: the Guarantee, cautions,
 * refunds, reconciliation, tenancy charges and the payments ledger. This is
 * the second-level navigation for that: pull the toggle down (or tap it) and
 * the desk's own sections unfold; choosing one scrolls to it. It is NOT the
 * console's navigation, which is the rail and the phone drawer and does not
 * change (D28); it only knows the sections of the desk it sits on.
 *
 * SECTIONS ARE ANCHORS. Each is an element with an `id` on the desk page, so a
 * section is also a link (`/admin/money#refunds`) that a colleague can be sent,
 * and the page still reads top to bottom with scripts off. The open section is
 * tracked as the page scrolls (an intersection observer on the anchors) and is
 * the toggle's visible label, so the person always sees where on the desk they
 * are.
 *
 * It sticks under the console bar, a quiet glass strip, so the sections are one
 * thumb away however far the desk has scrolled. Quiet readers (reduced motion,
 * Calm, Off) jump instead of gliding.
 */
export type DeskSection = { id: string; label: string; icon?: UiIconName };

export function DeskSections({
  sections,
  label,
  toggleLabel,
}: {
  sections: readonly DeskSection[];
  label: string;
  toggleLabel: string;
}) {
  const { quiet } = useMotionGate();
  const [active, setActive] = useState(sections[0]?.id);

  useEffect(() => {
    const els = sections.map((s) => document.getElementById(s.id)).filter((el): el is HTMLElement => el !== null);
    if (els.length === 0 || typeof IntersectionObserver === "undefined") return;
    /* The section whose top has most recently passed the line a third of the
       way down the screen is the one being read. */
    const seen = new Map<string, number>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) seen.set(entry.target.id, entry.boundingClientRect.top);
        const above = [...seen.entries()].filter(([, top]) => top <= window.innerHeight * 0.34);
        const pick = above.sort((a, b) => b[1] - a[1])[0] ?? [...seen.entries()].sort((a, b) => a[1] - b[1])[0];
        if (pick) setActive(pick[0]);
      },
      { rootMargin: "0px 0px -60% 0px", threshold: [0, 1] },
    );
    for (const el of els) io.observe(el);
    return () => io.disconnect();
  }, [sections]);

  const items = useMemo<InnerNavItem[]>(
    () =>
      sections.map((section) => ({
        id: section.id,
        label: section.label,
        ...(section.icon ? { icon: section.icon } : {}),
        onSelect: () => {
          const el = document.getElementById(section.id);
          if (!el) return;
          el.scrollIntoView({ behavior: quiet ? "auto" : "smooth", block: "start" });
          setActive(section.id);
          try {
            window.history.replaceState(null, "", `#${section.id}`);
          } catch {
            /* A sandboxed frame may refuse; the scroll already happened. */
          }
        },
      })),
    [sections, quiet],
  );

  return (
    <div className="nf-admin-sections">
      <InnerNav
        label={label}
        toggleLabel={toggleLabel}
        items={items}
        activeId={active}
        currentLabel={sections.find((s) => s.id === active)?.label}
      />
    </div>
  );
}
