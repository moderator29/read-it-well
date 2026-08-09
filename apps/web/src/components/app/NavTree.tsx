"use client";

import Link from "next/link";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { isCurrent, type NavLeaf, type NavSection } from "./nav-model";

/**
 * The navigation list, for both modes.
 *
 * Personal Mode and Agent Mode used to have two navigations that looked like
 * two products: one stroked glyph list with a brand-blue pill, one column of
 * 26px 3D tiles with an agent-green one. An agent switching between them was
 * learning a second interface for the same job. This renders both from the same
 * `NavSection[]`, with one prop deciding the accent.
 *
 * ---------------------------------------------------------------------------
 * IT IS NO LONGER A TREE, AND THAT IS THE CHANGE.
 *
 * This file used to render parents with children: a disclosure arrow, an open
 * set persisted per mode in localStorage, a seeded set so the group containing
 * the current page opened on arrival, a tree line down the children, and a rule
 * that the parent's label navigated while only the arrow expanded. Roughly a
 * third of the code and every hard part of it.
 *
 * All of it is gone, because the sub-navigation it served is gone. The rule
 * now, stated by the owner and applied everywhere: IF SOMETHING NEEDS CHILDREN
 * IT IS EITHER ITS OWN SCREEN OR IT DOES NOT BELONG IN NAVIGATION.
 *
 * What that removed, concretely. Five `/search?type=` rows that were one screen
 * with a query parameter changed. Three feed rows, the first of which pointed
 * at its own parent's href. Three profile rows for a destination that is
 * already a row at the top of the rail. An agent listings parent whose two
 * children were the list and the button on the list. An earnings parent whose
 * child was the chart on the earnings page.
 *
 * A person should not have to open a thing to find out whether what they want
 * is inside it. Every row here goes somewhere, immediately, and there is
 * nothing to discover.
 *
 * `NavNode` is still exported by `nav-model` and `children` is still on the
 * type. This file ignores it. Left in place rather than deleted because
 * removing a field from a shared type mid-wave changes two other files that are
 * not this one's to change; nothing constructs it any more.
 */

export function NavTree({
  sections,
  active,
  activeType = null,
  label,
  accent = "brand",
  onNavigate,
}: {
  sections: NavSection[];
  active: string;
  activeType?: string | null;
  label: string;
  /** `agent` swaps the active pill and glyph colour for the mode's own. */
  accent?: "brand" | "agent";
  onNavigate?: () => void;
}) {
  const row = (item: NavLeaf) => {
    const current = isCurrent(item.href, active, activeType);
    return (
      <li key={`${item.href}-${item.label}`}>
        <Link
          href={item.href}
          onClick={onNavigate}
          aria-current={current ? "page" : undefined}
          className={`nf-nav__row${current ? " nf-nav__row--on" : ""}`}
        >
          <span className="nf-nav__glyph" aria-hidden="true">
            {/* On the named scale, and a step up with it. This was a literal
                16, which is now the FLOOR of the scale rather than a middle
                step; `md` is 24 and is what a row this tall wants beside 16px
                type. */}
            <UiIcon name={item.icon} size="md" filled={current} />
          </span>
          <span className="nf-nav__label">{item.label}</span>
          {item.badge ? <span className="nf-nav__badge nf-numeric">{item.badge}</span> : null}
        </Link>
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
          <ul>{section.items.map(row)}</ul>
        </div>
      ))}
    </nav>
  );
}
