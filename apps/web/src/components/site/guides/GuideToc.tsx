"use client";

import { useEffect, useState } from "react";

/**
 * The guide's table of contents on a wide screen: a sticky column beside the
 * article, the section being read marked in the brand ink with a rule at its
 * edge. The mark follows the reader (read at most once a frame from a
 * passive scroll listener; nothing animated), and above the first section
 * none is marked. Without script every link still works and none is marked.
 */
export function GuideToc({ label, sections }: { label: string; sections: readonly { id: string; title: string }[] }) {
  const [current, setCurrent] = useState<string | null>(null);

  useEffect(() => {
    const els = sections.map((section) => document.getElementById(section.id)).filter((el): el is HTMLElement => el !== null);
    /* The section being read is the last one whose top has passed the line
       under the header; above the first one, none is. Read once a frame at
       most, from a passive scroll listener. */
    let frame = 0;
    const pick = () => {
      frame = 0;
      let found: string | null = null;
      for (const el of els) if (el.getBoundingClientRect().top <= 120) found = el.id;
      setCurrent(found);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(pick);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [sections]);

  return (
    <nav className="nf-guide-toc" aria-label={label}>
      <p className="nf-section-label">{label}</p>
      <ol className="nf-guide-toc__list">
        {sections.map((section) => (
          <li key={section.id}>
            <a href={`#${section.id}`} className="nf-guide-toc__link" aria-current={current === section.id ? "location" : undefined}>
              {section.title}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
