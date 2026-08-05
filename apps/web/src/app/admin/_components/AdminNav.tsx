"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Dictionary } from "@naijafinds/i18n";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { Chip, ChipRow } from "@/components/ui/Chip";
import { ADMIN_NAV } from "./nav";

type NavCopy = Dictionary["admin"]["nav"];

/**
 * Console navigation, one definition, two form factors.
 *
 * On desktop it is a compact rail; below lg the same eight destinations become
 * a scrollable tab strip pinned under the header, which is the only pattern
 * that keeps eight targets at thumb size on a 390px screen. The queue counts
 * ride along as badges so an operator can see where the work is without
 * opening anything.
 *
 * The labels arrive from the layout, which is where the locale is resolved: a
 * client component never reads the dictionary itself.
 */
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
    <nav aria-label={navLabel} className="hidden lg:block">
      <ul className="space-y-0.5">
        {ADMIN_NAV.map((item) => {
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
                <span className="flex-1 truncate">{labels[item.key].label}</span>
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
      so these eight destinations are 44pt to tap on a 390px screen without the
      rail getting any taller.
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
              {labels[item.key].short}
            </Chip>
          );
        })}
      </ChipRow>
    </nav>
  );
}
