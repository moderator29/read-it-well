"use client";

import { PersonTier } from "./PersonTier";
import type { PersonTier as PersonTierValue } from "@/lib/admin/reads/shapes";
import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { Dictionary } from "@vallo/i18n/core";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { NavIcon } from "./AdminGlyph";
import {
  ADMIN_NAV,
  ADMIN_PRIMARY,
  ADMIN_SECONDARY,
  ADMIN_SETTINGS,
  countFor,
  currentDestination,
  isActiveHref,
  isSectionActive,
  countLabelFor,
  labelFor,
  type ShellCopy,
  type AdminDestination,
} from "./nav";

type NavCopy = Dictionary["admin"]["nav"];

/**
 * The console rail, drawn the way the four admin renders draw it: twelve line
 * glyph rows, the open one a lit blue rounded rectangle, Settings on its own
 * above the operator at the foot. One definition (`nav.ts`) serves the
 * desktop rail and the phone drawer, so the two cannot come to disagree.
 */
function Row({
  item,
  counts,
  shell,
  active,
  child = false,
}: {
  item: AdminDestination;
  counts: Record<string, number>;
  shell?: ShellCopy;
  active: boolean;
  child?: boolean;
}) {
  const count = countFor(item, counts);
  const label = labelFor(item, shell);
  const counted = countLabelFor(item, shell);
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={`nf-admin-nav__row${child ? " nf-admin-nav__row--child" : ""}${active ? " nf-admin-nav__row--on" : ""}`}
    >
      <NavIcon icon={item.icon} size={child ? 16 : 20} />
      <span className="min-w-0 flex-1 [overflow-wrap:anywhere]">{label}</span>
      {count > 0 && (
        <span
          className="nf-admin-nav__count"
          title={`${count} ${counted}`}
          aria-label={`${count} ${counted}`}
        >
          {count}
        </span>
      )}
    </Link>
  );
}

/** The twelve rows, the open section's desks under it, and every desk at the foot. */
export function AdminRail({
  counts,
  navLabel,
  shell,
}: {
  counts: Record<string, number>;
  labels?: NavCopy;
  navLabel: string;
  shell?: ShellCopy;
}) {
  const pathname = usePathname() ?? "/admin";
  return (
    <nav aria-label={navLabel} className="nf-admin-nav">
      <ul className="nf-admin-nav__list">
        {ADMIN_PRIMARY.map((item) => {
          const sectionOpen = isSectionActive(pathname, item);
          const onParent = isActiveHref(pathname, item.href);
          return (
            <li key={item.key}>
              <Row item={item} counts={counts} shell={shell} active={sectionOpen} />
              {sectionOpen && item.children && item.children.length > 0 && (
                <ul className="nf-admin-nav__children" aria-label={labelFor(item, shell)}>
                  {item.children.map((child) => (
                    <li key={child.key}>
                      <Row
                        item={child}
                        counts={counts}
                        shell={shell}
                        active={!onParent && isActiveHref(pathname, child.href)}
                        child
                      />
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
      <AllDesks counts={counts} shell={shell} pathname={pathname} />
    </nav>
  );
}

/**
 * Every desk that is not one of the twelve rows, behind one disclosure, so a
 * desk is never an orphan reachable only by typing its address.
 */
function AllDesks({
  counts,
  shell,
  pathname,
}: {
  counts: Record<string, number>;
  shell?: ShellCopy;
  pathname: string;
}) {
  const allWaiting = (n: number) =>
    (shell?.nav.allDesksWaiting ?? "{count} waiting across the desks below").replace("{count}", String(n));
  const waiting = ADMIN_SECONDARY.reduce((total, item) => total + countFor(item, counts), 0);
  return (
    <details className="nf-admin-nav__more">
      <summary className="nf-admin-nav__row nf-admin-nav__row--child">
        <UiIcon name="grid" size={16} className="shrink-0" />
        <span className="min-w-0 flex-1">{shell?.nav.allDesks ?? "All desks"}</span>
        {waiting > 0 && (
          <span
            className="nf-admin-nav__count"
            title={allWaiting(waiting)}
            aria-label={allWaiting(waiting)}
          >
            {waiting}
          </span>
        )}
        <UiIcon name="chevron-down" size={16} className="nf-admin-nav__more-chev shrink-0" />
      </summary>
      <ul className="nf-admin-nav__children">
        {ADMIN_SECONDARY.map((item) => (
          <li key={item.key}>
            <Row
              item={item}
              counts={counts}
              shell={shell}
              active={isActiveHref(pathname, item.href)}
              child
            />
          </li>
        ))}
      </ul>
    </details>
  );
}

export type AdminIdentity = {
  name: string;
  role: string;
  initial: string;
  avatarUrl: string | null;
  /** The operator's published badge tier (`public.person_badge`), for the shared slot. */
  tier?: PersonTierValue | null;
};

export function IdentityBlock({ identity, compact = false }: { identity: AdminIdentity; compact?: boolean }) {
  return (
    <span className={`nf-admin-id${compact ? " nf-admin-id--compact" : ""}`}>
      <span className="nf-admin-id__avatar" aria-hidden="true">
        {identity.avatarUrl ? (
          // A person's own uploaded picture, sized by CSS; next/image would need
          // every storage host allow-listed for a 36px circle.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={identity.avatarUrl} alt="" />
        ) : (
          <UiIcon name="user" size={20} />
        )}
      </span>
      <span className="nf-admin-id__text">
        <span className="nf-admin-id__name">
          {identity.name}
          <PersonTier tier={identity.tier} size="sm" />
        </span>
        <span className="nf-admin-id__role">{identity.role}</span>
      </span>
    </span>
  );
}

/** Settings and the operator, which the renders pin to the rail's foot. */
export function AdminRailFoot({
  identity,
  counts = {},
  shell,
}: {
  identity: AdminIdentity;
  counts?: Record<string, number>;
  shell?: ShellCopy;
}) {
  const pathname = usePathname() ?? "/admin";
  return (
    <div className="nf-admin-rail__foot">
      <Row item={ADMIN_SETTINGS} counts={counts} shell={shell} active={isSectionActive(pathname, ADMIN_SETTINGS)} />
      <Link href="/profile" className="nf-admin-rail__me">
        <IdentityBlock identity={identity} />
        <UiIcon name="chevron-right" size={16} className="shrink-0 text-[var(--nf-content-muted)]" />
      </Link>
    </div>
  );
}

/**
 * The console search. Enter searches the desk under the cursor through that
 * desk's own `?q=`; on a page with no desk of its own (the overview, the
 * charts) it searches the unified queue. Command-K or Control-K focuses it.
 */
export function ConsoleSearch({ label, placeholder }: { label: string; placeholder: string }) {
  const pathname = usePathname() ?? "/admin";
  const router = useRouter();
  const input = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        input.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const segments = pathname.split("/").filter(Boolean);
  const NO_SEARCH = new Set(["operations", "analytics", "settings"]);
  const base =
    segments.length >= 2 && !NO_SEARCH.has(segments[1] ?? "")
      ? `/${segments[0]}/${segments[1]}`
      : "/admin/queue";

  return (
    <form
      role="search"
      className="nf-admin-bar__search"
      onSubmit={(event) => {
        event.preventDefault();
        const q = input.current?.value.trim() ?? "";
        router.push(q ? `${base}?q=${encodeURIComponent(q)}` : base);
      }}
    >
      <UiIcon name="search" size={16} className="nf-admin-bar__search-glyph" />
      <label className="sr-only" htmlFor="admin-console-search">
        {label}
      </label>
      <input id="admin-console-search" ref={input} type="search" placeholder={placeholder} />
    </form>
  );
}

/**
 * The phone's way into the same map: a menu button in the console bar that
 * opens the rail as a drawer. The drawer closes on the way through a link, on
 * Escape and on the scrim, and it hands focus back to the button.
 */
export function AdminTabs({
  counts,
  navLabel,
  identity,
  brand,
  shell,
}: {
  counts: Record<string, number>;
  labels?: NavCopy;
  navLabel: string;
  identity?: AdminIdentity;
  brand?: ReactNode;
  shell?: ShellCopy;
}) {
  const closeLabel = shell?.nav.closeMenu ?? "Close the console menu";
  const pathname = usePathname() ?? "/admin";
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement | null>(null);
  const panel = useRef<HTMLDivElement | null>(null);
  const current = currentDestination(pathname);
  /* Every queue once, however many rows carry it. */
  const waiting = [...new Set(ADMIN_NAV.flatMap((item) => item.countKeys ?? []))].reduce(
    (total, key) => total + (counts[key] ?? 0),
    0,
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        button.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panel.current?.querySelector<HTMLElement>("a, button, summary")?.focus();
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open]);

  return (
    <>
      <button
        ref={button}
        type="button"
        className="nf-admin-menu"
        aria-expanded={open}
        aria-controls="admin-drawer"
        aria-label={`${navLabel}${current ? `, ${labelFor(current, shell)}` : ""}${waiting > 0 ? `, ${waiting} waiting` : ""}`}
        onClick={() => setOpen(true)}
      >
        <UiIcon name="menu" size={20} />
        {waiting > 0 && <span className="nf-admin-menu__dot" aria-hidden="true" />}
      </button>
      {open && (
        <div className="nf-admin-drawer" id="admin-drawer">
          <button
            type="button"
            className="nf-admin-drawer__scrim"
            aria-label={closeLabel}
            onClick={() => {
              setOpen(false);
              button.current?.focus();
            }}
          />
          <div
            ref={panel}
            className="nf-admin-drawer__panel"
            role="dialog"
            aria-modal="true"
            aria-label={navLabel}
          >
            <div className="nf-admin-drawer__head">
              {brand}
              <button
                type="button"
                className="nf-admin-icon-btn"
                aria-label={closeLabel}
                onClick={() => {
                  setOpen(false);
                  button.current?.focus();
                }}
              >
                <UiIcon name="close" size={20} />
              </button>
            </div>
            <div
              className="nf-admin-drawer__scroll"
              onClick={(event) => {
                /* A chosen destination closes the drawer on its way through. */
                if ((event.target as HTMLElement).closest("a")) setOpen(false);
              }}
            >
              <AdminRail counts={counts} shell={shell} navLabel={navLabel} />
            </div>
            {identity && (
              <div
                onClick={(event) => {
                  if ((event.target as HTMLElement).closest("a")) setOpen(false);
                }}
              >
                <AdminRailFoot identity={identity} counts={counts} shell={shell} />
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
