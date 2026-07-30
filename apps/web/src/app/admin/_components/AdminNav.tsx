"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { ADMIN_NAV } from "./nav";

/**
 * Console navigation, one definition, two form factors.
 *
 * On desktop it is a compact rail; below lg the same eight destinations become
 * a scrollable tab strip pinned under the header, which is the only pattern
 * that keeps eight targets at thumb size on a 390px screen. The queue counts
 * ride along as badges so an operator can see where the work is without
 * opening anything.
 */
function isActive(pathname: string, href: string): boolean {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminRail({ counts }: { counts: Record<string, number> }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Admin console" className="hidden lg:block">
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
                <UiIcon name={item.icon} size={18} className="shrink-0" />
                <span className="flex-1 truncate">{item.label}</span>
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

export function AdminTabs({ counts }: { counts: Record<string, number> }) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Admin console"
      className="nf-scroll-x -mx-4 border-b border-[var(--nf-border-subtle)] px-4 lg:hidden"
    >
      <ul className="flex w-max items-center gap-1.5 py-2">
        {ADMIN_NAV.map((item) => {
          const active = isActive(pathname, item.href);
          const count = counts[item.key] ?? 0;
          return (
            <li key={item.key}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`nf-chip ${active ? "nf-chip--active" : ""} !py-1.5`}
              >
                <UiIcon name={item.icon} size={15} className="shrink-0" />
                {item.short}
                {count > 0 && (
                  <span className="nf-numeric inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--nf-brand-primary)] px-1 text-[0.625rem] font-bold text-[var(--nf-content-on-brand)]">
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
