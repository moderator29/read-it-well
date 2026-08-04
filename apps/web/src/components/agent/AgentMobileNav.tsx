"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { Dictionary } from "@naijafinds/i18n";
import type { AgentProfile } from "@/lib/agent/types";
import { Logo } from "@/design-system/brand/Logo";
import { ModeSwitcher } from "./ModeSwitcher";
import { AgentIdentityCard, AgentModePill, AgentNavList, buildAgentNav } from "./AgentNav";

/**
 * Agent Mode mobile navigation: a hamburger in the top bar opening a slide-in
 * drawer, below lg only.
 *
 * Agent Mode has ten frozen destinations (Master Rule 17), double what a phone
 * tab bar can hold before targets shrink past thumb size, so the workspace
 * gets a drawer where Personal Mode gets its five-tab bar. The drawer reuses
 * the exact rail content via AgentNav, so the two form factors present one
 * identical IA. The panel stays mounted and slides via transform so opening
 * and closing animate; `inert` keeps the closed drawer out of the tab order
 * and away from assistive technology.
 */
export function AgentMobileNav({
  t,
  active,
  profile,
  unreadMessages = 0,
}: {
  t: Dictionary;
  active: string;
  /** The real agent behind this workspace, or null when nobody is. */
  profile: AgentProfile | null;
  /** Real unread count for the messages badge. Zero renders no badge. */
  unreadMessages?: number;
}) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  // Escape closes the drawer, matching every other dismissible surface.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, close]);

  // Lock page scroll while the drawer is up so the content behind stays put.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={t.a11y.openMenu}
        className="-ml-1 grid h-10 w-10 shrink-0 place-items-center rounded-[var(--nf-radius-md)] text-[var(--nf-content-secondary)] transition-colors hover:bg-[var(--nf-glass-fill)] hover:text-[var(--nf-content-primary)] lg:hidden"
      >
        {/* Tier one style hamburger glyph: 24 grid, stroked, currentColor. */}
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
          <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
      </button>

      <div
        role="dialog"
        aria-modal="true"
        aria-label={t.agent.mode.workspaceLabel}
        inert={!open}
        className={[
          "fixed inset-0 z-50 lg:hidden",
          open ? "" : "pointer-events-none",
        ].join(" ")}
      >
        {/* Backdrop: click to dismiss. Escape covers keyboard users, so this
            stays a plain surface rather than a focusable control. */}
        <div
          aria-hidden="true"
          onClick={close}
          className={[
            "absolute inset-0 bg-black/55 backdrop-blur-sm transition-opacity duration-300",
            open ? "opacity-100" : "opacity-0",
          ].join(" ")}
        />

        {/* Panel */}
        <div
          className={[
            "absolute inset-y-0 left-0 flex w-[18.5rem] max-w-[85vw] flex-col overflow-y-auto border-r border-[var(--nf-border-subtle)] bg-[var(--nf-surface-primary)] px-4 pt-5 shadow-[var(--nf-shadow-float)] transition-transform duration-300 ease-out",
            open ? "translate-x-0" : "-translate-x-full",
          ].join(" ")}
          style={{ paddingBottom: "calc(1.25rem + env(safe-area-inset-bottom))" }}
        >
          <div className="mb-2 flex items-center justify-between px-1">
            <Link href="/" aria-label={t.a11y.logoHome} onClick={close}>
              <Logo size={36} wordSize={18} />
            </Link>
            <button
              type="button"
              onClick={close}
              aria-label={t.a11y.closeMenu}
              className="-mr-1 grid h-10 w-10 place-items-center rounded-[var(--nf-radius-md)] text-[var(--nf-content-secondary)] transition-colors hover:bg-[var(--nf-glass-fill)] hover:text-[var(--nf-content-primary)]"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
                <path d="m6 6 12 12M18 6 6 18" />
              </svg>
            </button>
          </div>

          <AgentModePill label={t.agent.mode.agent} className="mb-5 ml-1" />

          <AgentNavList
            items={buildAgentNav(t, unreadMessages)}
            active={active}
            label={t.agent.mode.workspaceLabel}
            onNavigate={close}
          />

          <div className="mt-4 space-y-2">
            <AgentIdentityCard
              profile={profile}
              verifiedLabel={t.agent.mode.verifiedAgent}
              visitorLabel={t.agent.mode.visitor}
              signInLabel={t.agent.mode.signInToWorkspace}
            />
            <ModeSwitcher t={t} current="agent" variant="menu" />
          </div>
        </div>
      </div>
    </>
  );
}
