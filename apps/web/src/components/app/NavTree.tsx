"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { UiIcon } from "@/design-system/icons/UiIcon";
import {
  containsCurrent,
  isCurrent,
  type NavLeaf,
  type NavNode,
  type NavSection,
} from "./nav-model";

/**
 * The navigation tree, for both modes.
 *
 * Personal Mode and Agent Mode used to have two navigations that looked like
 * two products: one stroked glyph list with a brand-blue pill, one column of
 * 26px 3D tiles with an agent-green one. An agent switching between them was
 * learning a second interface for the same job.
 *
 * This renders both from the same `NavSection[]`, with one prop deciding the
 * accent. Anything that changes about how navigation behaves, from the tree
 * line to the disclosure arrow to which parent opens on arrival, changes once.
 *
 * The open set is keyed by `storageKey`, so the two modes remember their own
 * groups rather than one clobbering the other.
 */

export function NavTree({
  sections,
  active,
  activeType = null,
  label,
  storageKey,
  accent = "brand",
  expandLabel,
  collapseLabel,
  onNavigate,
}: {
  sections: NavSection[];
  active: string;
  activeType?: string | null;
  label: string;
  /** Where this mode's open groups are remembered. */
  storageKey: string;
  /** `agent` swaps the active pill and glyph colour for the mode's own. */
  accent?: "brand" | "agent";
  expandLabel: string;
  collapseLabel: string;
  onNavigate?: () => void;
}) {
  const seeded = useMemo(() => {
    const open = new Set<string>();
    for (const section of sections) {
      for (const item of section.items) {
        if (containsCurrent(item, active, activeType)) open.add(item.href);
      }
    }
    return open;
  }, [sections, active, activeType]);

  const [open, setOpen] = useState<Set<string>>(seeded);

  // The stored set arrives after mount so the server and the first client
  // render agree; a mismatch here is a hydration error on every page.
  useEffect(() => {
    let stored: string[] = [];
    try {
      stored = JSON.parse(window.localStorage.getItem(storageKey) ?? "[]") as string[];
    } catch {
      stored = [];
    }
    setOpen(new Set([...seeded, ...(Array.isArray(stored) ? stored : [])]));
  }, [seeded, storageKey]);

  const toggle = useCallback(
    (href: string) => {
      setOpen((previous) => {
        const next = new Set(previous);
        if (next.has(href)) next.delete(href);
        else next.add(href);
        try {
          window.localStorage.setItem(storageKey, JSON.stringify([...next]));
        } catch {
          // Private browsing. The set holds for this session and no longer.
        }
        return next;
      });
    },
    [storageKey],
  );

  const leaf = (item: NavLeaf, depth: 0 | 1) => {
    const current = isCurrent(item.href, active, activeType);
    return (
      <li key={`${item.href}-${item.label}`} className={depth === 1 ? "nf-nav__child" : undefined}>
        <Link
          href={item.href}
          onClick={onNavigate}
          aria-current={current ? "page" : undefined}
          className={`nf-nav__row${current ? " nf-nav__row--on" : ""}`}
        >
          <span className="nf-nav__glyph" aria-hidden="true">
            <UiIcon name={item.icon} size={depth === 1 ? 14 : 16} filled={current} />
          </span>
          <span className="nf-nav__label">{item.label}</span>
          {item.badge ? <span className="nf-nav__badge nf-numeric">{item.badge}</span> : null}
        </Link>
      </li>
    );
  };

  const node = (item: NavNode) => {
    if (!item.children) return leaf(item, 0);

    const expanded = open.has(item.href);
    const current = isCurrent(item.href, active, activeType);
    const panelId = `nav-${storageKey}-${item.href.replace(/[^a-z0-9]/gi, "-")}`;

    return (
      <li key={item.href}>
        <div className={`nf-nav__row nf-nav__row--parent${current ? " nf-nav__row--on" : ""}`}>
          {/* The label navigates; only the arrow expands. A parent that merely
              toggles is a dead control the first time somebody taps the word. */}
          <Link
            href={item.href}
            onClick={onNavigate}
            aria-current={current ? "page" : undefined}
            className="nf-nav__parentlink"
          >
            <span className="nf-nav__glyph" aria-hidden="true">
              <UiIcon name={item.icon} size={16} filled={current} />
            </span>
            <span className="nf-nav__label">{item.label}</span>
          </Link>

          <button
            type="button"
            onClick={() => toggle(item.href)}
            aria-expanded={expanded}
            aria-controls={panelId}
            aria-label={`${expanded ? collapseLabel : expandLabel} ${item.label}`}
            className="nf-nav__disclose nf-tap"
          >
            <UiIcon name="chevron-right" size={14} className={expanded ? "rotate-90" : ""} />
          </button>
        </div>

        {expanded && (
          <ul id={panelId} className="nf-nav__children">
            {item.children.map((child) => leaf(child, 1))}
          </ul>
        )}
      </li>
    );
  };

  return (
    <nav
      aria-label={label}
      className={`nf-nav__scroll${accent === "agent" ? " nf-nav__scroll--agent" : ""}`}
    >
      {sections.map((section, index) => (
        <div key={section.heading ?? `section-${index}`} className="nf-nav__section">
          {section.heading && <h2 className="nf-nav__heading">{section.heading}</h2>}
          <ul>{section.items.map(node)}</ul>
        </div>
      ))}
    </nav>
  );
}
