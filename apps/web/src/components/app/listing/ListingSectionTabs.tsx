"use client";

import { useEffect, useRef, useState } from "react";
import { BackControl } from "@/components/ui/BackControl";
import { InnerNav } from "@/components/ui/InnerNav";
import type { UiIconName } from "@/design-system/icons/UiIcon";

/**
 * Overview / Amenities / Location / Reviews, as anchors.
 *
 * Links, so a tab is a URL and works before hydration; the observer only
 * moves the underline as the page scrolls. Reduced motion changes nothing
 * here because nothing here moves on its own.
 */
export type SectionTab = { id: string; label: string; icon?: UiIconName };

/*
 * EVERY SECTION, ONE PULL AWAY (COMPONENT_LIBRARY "Glass navigation": space
 * detail across overview, costs, amenities, trust, location).
 *
 * The anchor row is furniture a member already knows (9E8B56ED draws it), so
 * it stays exactly where it was and still works before hydration. What it
 * could never hold is the page's long tail: the details, the walkthrough, the
 * photographs, who lists it. The InnerNav sits at the row's trailing end as a
 * 44px circle and lists every section on the page, with the one in view
 * marked, and its pull opens the list the way the founder likes. It is
 * second-level navigation inside the space, never the dock or the side nav.
 */
export type SectionIndex = {
  label: string;
  toggle: string;
  items: SectionTab[];
};

/*
 * THE WAY OUT TRAVELS WITH THE READER.
 *
 * The only back control on this page used to sit on the photograph, and the
 * page hides the dock, so one flick down the listing left a phone with no
 * visible way off the screen at all: the founder's "I can't leave it". The bar
 * now carries a back control of its own once it is stuck to the top. Its slot
 * is always reserved, so the tabs never shift sideways when it appears (no
 * layout shift); it only fades in, and it is `inert` and hidden from assistive
 * technology while the photograph's own back is still on screen, so a screen
 * reader never meets two.
 */
export function ListingSectionTabs({
  tabs,
  backFallback = "/search",
  index,
}: {
  tabs: SectionTab[];
  backFallback?: string;
  /** Every section on the page, for the InnerNav at the row's end. */
  index?: SectionIndex;
}) {
  const [active, setActive] = useState(tabs[0]?.id ?? "");
  const sentinel = useRef<HTMLSpanElement | null>(null);
  const [stuck, setStuck] = useState(false);

  useEffect(() => {
    const node = sentinel.current;
    if (!node || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry) setStuck(!entry.isIntersecting && entry.boundingClientRect.top < 0);
      },
      { threshold: 0 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  /* The spy watches every section the index names, not only the tabs, so
     the InnerNav marks the long-tail section in view too. */
  const watched = index ? index.items : tabs;
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const nodes = watched
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
  }, [watched]);

  return (
    <>
    <span ref={sentinel} className="nf-detail-tabs__sentinel" aria-hidden="true" />
    <nav
      className="nf-detail-tabs"
      aria-label="Sections"
      data-testid="section-tabs"
      data-stuck={stuck ? "" : undefined}
    >
      <BackControl
        fallback={backFallback}
        aria-hidden={stuck ? undefined : true}
        tabIndex={stuck ? undefined : -1}
        inert={!stuck}
        data-testid="tabs-back"
        className="nf-detail-tabs__back"
      />
      <div className="nf-detail-tabs__row">
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
      </div>
      {index && index.items.length > 0 && (
        <InnerNav
          label={index.label}
          toggleLabel={index.toggle}
          className="nf-detail-tabs__index"
          activeId={active}
          data-testid="section-index"
          items={index.items.map((item) => ({
            id: item.id,
            label: item.label,
            icon: item.icon,
            href: `#${item.id}`,
            onSelect: () => setActive(item.id),
          }))}
        />
      )}
    </nav>
    </>
  );
}
