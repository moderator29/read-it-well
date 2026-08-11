"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Dictionary } from "@naijafinds/i18n";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { Chip, ChipRow } from "@/components/ui/Chip";
import { ADMIN_NAV, ADMIN_NAV_GROUPS, type AdminDestination } from "./nav";

type NavCopy = Dictionary["admin"]["nav"];

/**
 * Console navigation, one definition, two form factors.
 *
 * On desktop it is a banded rail; below lg the same destinations become a
 * scrollable tab strip pinned under the header, which is the only pattern that
 * keeps nineteen targets at thumb size on a 390px screen. The strip is flat
 * because a single scrolling row has nowhere to put a heading, and it reads
 * `ADMIN_NAV`, which is derived from the bands rather than written beside them.
 * The queue counts ride along as badges so an operator can see where the work
 * is without opening anything.
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
            <p id={`admin-nav-${group.key}`} className="nf-overline mb-inline-tight px-3">
              {group.heading}
            </p>
          )}
          <ul className="space-y-0.5">
            {group.items.map((item) => {
              const active = isActive(pathname, item.href);
              const count = counts[item.key] ?? 0;
              return (
                <li key={item.key}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={[
                      "flex items-center gap-3 rounded-[var(--nf-radius-md)] px-3 py-2.5 text-[0.875rem] font-medium transition-colors",
                      active
                        ? "bg-[color-mix(in_oklab,var(--nf-brand-primary)_22%,transparent)] text-[var(--nf-content-primary)]"
                        : "text-[var(--nf-content-secondary)] hover:bg-[var(--nf-glass-fill)] hover:text-[var(--nf-content-primary)]",
                    ].join(" ")}
                  >
                    <UiIcon name={item.icon} size={20} className="shrink-0" />
                    <span className="flex-1 truncate">{labelFor(item, labels)}</span>
                    {count > 0 && (
                      <span className="nf-numeric inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--nf-brand-primary)] px-1.5 text-[0.6875rem] font-bold text-[var(--nf-content-on-brand)]">
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

  return (
    /*
      The tab strip is a chip rail, so it is the shared one.
      `!py-1.5` used to force the chip's height back DOWN, which is the tell
      that somebody had tried to fix the touch target by inflating the box and
      then had to undo it to keep the strip reading as a strip. `Chip` settles
      that argument: it paints at its own height and grows only its hit region,
      so every destination is 44pt to tap on a 390px screen without the rail
      getting any taller.
    */
    <nav
      aria-label={navLabel}
      className="-mx-4 border-b border-[var(--nf-border-subtle)] px-4 py-2 lg:hidden"
    >
      <ChipRow bleed={false} snap={false}>
        {ADMIN_NAV.map((item) => {
          const count = counts[item.key] ?? 0;
          return (
            <Chip
              key={item.key}
              behaviour="link"
              href={item.href}
              selected={isActive(pathname, item.href)}
              size="sm"
              icon={item.icon}
              {...(count > 0 ? { count } : null)}
            >
              {shortFor(item, labels)}
            </Chip>
          );
        })}
      </ChipRow>
    </nav>
  );
}
