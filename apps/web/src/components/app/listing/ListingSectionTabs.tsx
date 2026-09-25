"use client";

import { useEffect, useRef, useState } from "react";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { useBack } from "@/lib/nav/use-back";
import { useClientCopy } from "@/lib/i18n/client-copy";

/**
 * Overview / Amenities / Location / Reviews, as anchors.
 *
 * Links, so a tab is a URL and works before hydration; the observer only
 * moves the underline as the page scrolls. Reduced motion changes nothing
 * here because nothing here moves on its own.
 */
export type SectionTab = { id: string; label: string };

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
}: {
  tabs: SectionTab[];
  backFallback?: string;
}) {
  const [active, setActive] = useState(tabs[0]?.id ?? "");
  const t = useClientCopy();
  const back = useBack(backFallback);
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
    <>
    <span ref={sentinel} className="nf-detail-tabs__sentinel" aria-hidden="true" />
    <nav
      className="nf-detail-tabs"
      aria-label="Sections"
      data-testid="section-tabs"
      data-stuck={stuck ? "" : undefined}
    >
      <button
        type="button"
        onClick={back}
        aria-label={t.common.back}
        aria-hidden={stuck ? undefined : true}
        tabIndex={stuck ? undefined : -1}
        inert={!stuck}
        data-nav-back=""
        data-testid="tabs-back"
        className="nf-detail-tabs__back"
      >
        <UiIcon name="arrow-left" size={18} />
      </button>
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
    </nav>
    </>
  );
}
