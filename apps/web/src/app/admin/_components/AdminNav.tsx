"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Dictionary } from "@vallo/i18n";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { Chip } from "@/components/ui/Chip";
import { ADMIN_NAV, ADMIN_NAV_GROUPS, type AdminDestination } from "./nav";

type NavCopy = Dictionary["admin"]["nav"];

/**
 * Console navigation, one definition, two form factors.
 *
 * On desktop it is a banded rail. Below lg the same five bands live behind one
 * control that says where you are and how much work is waiting, and open out as
 * wrapping chips rather than a sideways scroller. Both forms read
 * `ADMIN_NAV_GROUPS`, so the order `nav.ts` argues for is the order both of them
 * show. The queue counts ride along as badges so an operator can see where the
 * work is without opening anything.
 *
 * The labels arrive from the layout, which is where the locale is resolved: a
 * client component never reads the dictionary itself.
 */
/**
 * A destination's words.
 *
 * Most come from the dictionary and follow the reader's language. The four
 * money sections carry an English label of their own until packages/i18n gains
 * their keys, and resolving the dictionary first means the moment those keys
 * land the hardcoded string stops being used without anybody editing this.
 */
function labelFor(item: AdminDestination, labels: NavCopy): string {
  const fromDictionary = (labels as Record<string, { label?: string } | undefined>)[item.key];
  return fromDictionary?.label ?? item.label ?? item.key;
}

/** The same, for the phone tab strip, where the words are shorter. */
function shortFor(item: AdminDestination, labels: NavCopy): string {
  const fromDictionary = (labels as Record<string, { short?: string } | undefined>)[item.key];
  return fromDictionary?.short ?? item.label ?? item.key;
}

function isActive(pathname: string, href: string): boolean {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminRail({
  counts,
  labels,
  navLabel,
}: {
  counts: Record<string, number>;
  labels: NavCopy;
  navLabel: string;
}) {
  const pathname = usePathname();

  return (
    /*
      The rail is banded, and the bands are the whole point of this pass.
      Nineteen destinations in one unbroken column is nineteen labels to read
      before the eye finds the one it wants, and `nav.ts` had already spent
      several paragraphs arguing an order - safety, then supply, then people,
      then money, then settings - that was visible only to somebody reading
      `nav.ts`. Nothing moved. The headings just say out loud what the order
      already meant.

      `role="group"` with `aria-labelledby` rather than five separate `<nav>`
      elements: it is one navigation with five sections, and five landmarks
      would make a screen reader announce five menus.
    */
    <nav aria-label={navLabel} className="hidden lg:block">
      {ADMIN_NAV_GROUPS.map((group) => (
        <div
          key={group.key}
          role="group"
          {...(group.heading ? { "aria-labelledby": `admin-nav-${group.key}` } : null)}
          className="mt-group first:mt-0"
        >
          {group.heading && (
            <p id={`admin-nav-${group.key}`} className="nf-overline mb-inline-tight px-sm">
              {group.heading}
            </p>
          )}
          <ul className="space-y-3xs">
            {group.items.map((item) => {
              const active = isActive(pathname, item.href);
              const count = counts[item.key] ?? 0;
              return (
                <li key={item.key}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={[
                      "flex items-center gap-sm rounded-[var(--nf-radius-md)] px-sm py-sm text-[var(--nf-text-body-sm)] font-medium transition-colors",
                      active
                        ? "bg-[color-mix(in_oklab,var(--nf-brand-primary)_22%,transparent)] text-[var(--nf-content-primary)]"
                        : "text-[var(--nf-content-secondary)] hover:bg-[var(--nf-glass-fill)] hover:text-[var(--nf-content-primary)]",
                    ].join(" ")}
                  >
                    <UiIcon name={item.icon} size={20} className="shrink-0" />
                    {/* A destination's name does not clip. The rail is the
                        console's map and a clipped label is a map with a road
                        name half painted. */}
                    <span className="min-w-0 flex-1 [overflow-wrap:anywhere]">
                      {labelFor(item, labels)}
                    </span>
                    {count > 0 && (
                      /*
                        CYAN, NOT BRAND BLUE, AND THIS IS THE WHOLE REASON AN
                        OPERATOR SCANS THE RAIL.

                        The badge was `--nf-brand-primary` against an active row
                        filled with `color-mix(brand-primary 22%)`, so the count
                        of work waiting on the destination you are standing on
                        was the hardest one on the rail to see. It also said
                        "brand" rather than "attention", and attention is what a
                        work-waiting count means: cyan is this product's
                        attention colour by rule.
                      */
                      <span className="nf-numeric inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-[var(--nf-status-pending)] px-xs text-[var(--nf-text-overline)] font-bold text-[var(--nf-content-on-brand)]">
                        {count}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

export function AdminTabs({
  counts,
  labels,
  navLabel,
}: {
  counts: Record<string, number>;
  labels: NavCopy;
  navLabel: string;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const current = ADMIN_NAV.find((item) => isActive(pathname, item.href));
  const waiting = ADMIN_NAV.reduce((total, item) => total + (counts[item.key] ?? 0), 0);

  return (
    /*
      THE PHONE GOT A SCROLLER AND THE DESKTOP GOT THE THINKING.

      `nav.ts` spends several paragraphs arguing an order - safety, then supply,
      then people, then money, then settings - and the rail makes that visible
      as five bands. Below lg the same nineteen destinations were a single flat
      `ChipRow` over `ADMIN_NAV`, bands discarded, so reaching Switches meant
      swiping past eighteen chips with nothing on screen saying how many more
      there were or what order they were in. By this file's own account the
      console is used on a phone at eleven at night.

      ONE CONTROL THAT OPENS THE MAP, rather than a rail you drag through. Shut,
      it is a single row saying where you are and how much work is waiting
      anywhere, which is the two things an operator wants at a glance and is
      less vertical space than the scroller it replaces. Open, it is the rail's
      own five bands with their own headings, and the chips WRAP rather than
      scrolling sideways, so every destination is on screen at 390px at once.
      A person cannot choose a destination they cannot see.

      WHY A BUTTON AND STATE RATHER THAN `<details>`. A native disclosure needs
      no JavaScript and was the first attempt, and it stays open after a tap:
      client navigation keeps the DOM, so every destination you chose left the
      whole map hanging over the page you had just asked for. This component was
      already a client component for `usePathname`, so the state costs nothing
      that was not already being paid.
    */
    <nav
      aria-label={navLabel}
      className="-mx-md border-b border-[var(--nf-border-subtle)] px-md py-xs lg:hidden"
    >
      <button
        type="button"
        aria-expanded={open}
        aria-controls="admin-sections"
        onClick={() => setOpen((was) => !was)}
        className="flex w-full items-center gap-inline rounded-[var(--nf-radius-md)] px-row py-inline text-left text-[var(--nf-text-body-sm)] font-medium text-[var(--nf-content-primary)]"
      >
        <UiIcon name={current?.icon ?? "grid"} size={20} className="shrink-0" />
        {/* The label does not clip, for the same reason the rail's does not. */}
        <span className="min-w-0 flex-1 [overflow-wrap:anywhere]">
          {current ? labelFor(current, labels) : navLabel}
        </span>
        {waiting > 0 && (
          /* Everything waiting anywhere in the console, in the attention
             colour, so a shut control still answers "is there work". Cyan
             rather than brand blue for the same reason the rail's badge is:
             a work-waiting count means attention, not brand. */
          <span className="nf-numeric inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-[var(--nf-status-pending)] px-xs text-[var(--nf-text-overline)] font-bold text-[var(--nf-content-on-brand)]">
            {waiting}
          </span>
        )}
        <UiIcon
          name="chevron-down"
          size={16}
          className={`shrink-0 transition-transform${open ? " rotate-180" : ""}`}
        />
      </button>

      {open && (
        /* The tap closes the map on its way through, so choosing a destination
           does not leave the whole console hanging over the page it opened. */
        <div id="admin-sections" className="pb-inline pt-inline" onClick={() => setOpen(false)}>
          {ADMIN_NAV_GROUPS.map((group) => (
            <div
              key={group.key}
              role="group"
              {...(group.heading ? { "aria-labelledby": `admin-tabs-${group.key}` } : null)}
              className="mt-row first:mt-0"
            >
              {group.heading && (
                <p id={`admin-tabs-${group.key}`} className="nf-overline mb-inline-tight">
                  {group.heading}
                </p>
              )}
              <ul className="flex flex-wrap gap-inline-tight">
                {group.items.map((item) => {
                  const count = counts[item.key] ?? 0;
                  return (
                    <li key={item.key}>
                      <Chip
                        behaviour="link"
                        href={item.href}
                        selected={isActive(pathname, item.href)}
                        size="sm"
                        icon={item.icon}
                        {...(count > 0 ? { count } : null)}
                      >
                        {shortFor(item, labels)}
                      </Chip>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}
    </nav>
  );
}
