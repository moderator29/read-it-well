"use client";

import Link from "next/link";
import { useCallback, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { useOverlay } from "@/lib/ui/use-overlay";
import type { Dictionary } from "@vallo/i18n";
import type { AgentProfile } from "@/lib/agent/types";
import { Logo } from "@/design-system/brand/Logo";
import { ModeSwitcher } from "./ModeSwitcher";
import { AgentIdentityCard, AgentModePill } from "./AgentNav";
import { buildAgentNav } from "./agent-nav-model";
import { NavTree } from "@/components/app/NavTree";
import { UiIcon } from "@/design-system/icons/UiIcon";

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
/** Nothing to subscribe to: the store only answers "is this the client". */
const noSubscribe = () => () => {};

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
  const drawerRef = useRef<HTMLDivElement | null>(null);
  const close = useCallback(() => setOpen(false), []);

  /* Escape, the Tab trap, the counted scroll lock and the focus return. The
     drawer had the first two and trapped nothing, so Tab walked out of an open
     workspace menu into the page it was covering. */
  useOverlay({ open, onClose: close, panelRef: drawerRef });

  /*
   * THE DRAWER IS PORTALLED TO THE BODY. It sits in the workspace's top bar,
   * whose glass (`nf-glass--chrome`) carries a backdrop blur, and a backdrop
   * filter makes an element the containing block for its `position: fixed`
   * descendants. So the "full screen" drawer was 60px tall, the height of the
   * bar, with no scrim, found in the platform sweep's second pass. Rendering
   * it on the body puts the fixed box back against the viewport.
   */
  const mounted = useSyncExternalStore(
    noSubscribe,
    () => true,
    () => false
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={t.a11y.openMenu}
        className="nf-icon-btn nf-tap -ml-2xs h-10 w-10 shrink-0 lg:hidden"
      >
        {/* The panel toggle, matching Personal Mode. Three stacked lines say
            "a list is behind this" and say it identically whatever opens; this
            says a panel arrives beside the content. */}
        <UiIcon name="panel-left" size={20} />
      </button>

      {mounted &&
        createPortal(
          <div
            ref={drawerRef}
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
                "absolute inset-0 bg-[var(--nf-overlay-backdrop)] backdrop-blur-sm transition-opacity duration-300",
                open ? "opacity-100" : "opacity-0",
              ].join(" ")}
            />

            {/* Panel */}
            <div
              className={[
                "nf-panel nf-agent-drawer absolute inset-y-0 left-0 flex w-[18.5rem] max-w-[85vw] flex-col overflow-y-auto rounded-l-none px-md pt-5 transition-transform duration-300 ease-out",
                open ? "translate-x-0" : "-translate-x-full",
              ].join(" ")}
              style={{
                paddingBottom: "calc(1.25rem + env(safe-area-inset-bottom))",
              }}
            >
              <div className="mb-xs flex items-center justify-between px-2xs">
                <Link href="/" aria-label={t.a11y.logoHome} onClick={close}>
                  <Logo size={44} wordSize={22} />
                </Link>
                <button
                  type="button"
                  onClick={close}
                  aria-label={t.a11y.closeMenu}
                  className="nf-icon-btn -mr-2xs h-10 w-10"
                >
                  <UiIcon name="close" size="sm" />
                </button>
              </div>

              <AgentModePill
                label={t.agent.mode.agent}
                className="mb-5 ml-2xs"
              />

              <NavTree
                sections={buildAgentNav(t, unreadMessages)}
                active={active}
                label={t.agent.mode.workspaceLabel}
                accent="agent"
                onNavigate={close}
              />

              <div className="mt-md space-y-xs">
                <AgentIdentityCard
                  profile={profile}
                  verifiedLabel={t.agent.mode.verifiedAgent}
                  visitorLabel={t.agent.mode.visitor}
                  signInLabel={t.agent.mode.signInToWorkspace}
                />
                <ModeSwitcher t={t} current="working" variant="menu" />
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
