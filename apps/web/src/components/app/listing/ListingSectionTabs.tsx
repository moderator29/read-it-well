"use client";

import { useEffect, useState } from "react";

/**
 * Overview / Amenities / Location / Reviews, as anchors.
 *
 * Links, so a tab is a URL and works before hydration; the observer only
 * moves the underline as the page scrolls. Reduced motion changes nothing
 * here because nothing here moves on its own.
 */
export type SectionTab = { id: string; label: string };

export function ListingSectionTabs({ tabs }: { tabs: SectionTab[] }) {
  const [active, setActive] = useState(tabs[0]?.id ?? "");

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const nodes = tabs
      .map((tab) => document.getElementById(tab.id))
      .filter((node): node is HTMLElement => node !== null);
    if (nodes.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setActive(visible.target.id);
      },
      { rootMargin: "-40% 0px -50% 0px", threshold: [0, 0.25, 0.5] },
    );
    for (const node of nodes) observer.observe(node);
    return () => observer.disconnect();
  }, [tabs]);

  return (
    <nav className="nf-detail-tabs" aria-label="Sections" data-testid="section-tabs">
      {tabs.map((tab) => (
        <a
          key={tab.id}
          href={`#${tab.id}`}
          aria-current={active === tab.id ? "true" : undefined}
          onClick={() => setActive(tab.id)}
        >
          {tab.label}
        </a>
      ))}
    </nav>
  );
}
