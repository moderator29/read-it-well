"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Dictionary, Locale } from "@naijafinds/i18n";
import { AppRail } from "./AppRail";
import { MobileTabBar } from "./MobileTabBar";
import { LanguageSwitcher } from "@/components/site/LanguageSwitcher";
import { BackButton } from "@/components/site/BackButton";
import { Icon } from "@/design-system/icons/Icon";
import { UiIcon } from "@/design-system/icons/UiIcon";

/**
 * Personal Mode shell.
 *
 * The single wrapper for every consumer page, so the navigation is identical
 * everywhere rather than living on the home route alone (Master Rule 17). On
 * `lg` and up the sticky `AppRail` sits beside the content; below `lg` the rail
 * is gone and the fixed `MobileTabBar` carries navigation, with the main column
 * padded so nothing hides behind it. The active destination is read from the
 * current path here, so the highlight stays correct as the user moves around
 * without each page having to pass it in.
 */
export function AppShell({
  t,
  locale,
  userName,
  children,
}: {
  t: Dictionary;
  locale: Locale;
  userName: string;
  children: React.ReactNode;
}) {
  const active = usePathname();
  const [drawer, setDrawer] = useState(false);

  /* The drawer closes itself on navigation and locks page scroll while open. */
  useEffect(() => setDrawer(false), [active]);
  useEffect(() => {
    document.body.style.overflow = drawer ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [drawer]);

  return (
    <div className="flex min-h-dvh">
      <AppRail t={t} active={active} userName={userName} />

      {/* Mobile slide-in side navigation: the same rail, as a left drawer. */}
      {drawer && (
        <div className="fixed inset-0 z-[60] lg:hidden" role="dialog" aria-modal="true">
          <button
            type="button"
            aria-label={t.a11y.closeMenu}
            onClick={() => setDrawer(false)}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <div className="nf-rise absolute inset-y-0 left-0 w-[min(84vw,var(--nf-rail-width))] overflow-y-auto border-r border-[var(--nf-border-subtle)] bg-[var(--nf-surface-primary)] shadow-[var(--nf-shadow-float)]">
            <AppRail t={t} active={active} userName={userName} variant="drawer" />
          </div>
        </div>
      )}

      <main id="main" className="min-w-0 flex-1 pb-24 lg:pb-0">
        {/* ------------------------------------------------------- top bar */}
        <header className="nf-glass sticky top-0 z-40 border-b border-[var(--nf-border-subtle)]">
          <div className="flex h-[64px] items-center gap-3 px-4 sm:gap-4 sm:px-5 md:px-8">
            {/* Phones lead with the side navigation, exactly like the desktop left rail. */}
            <button
              type="button"
              aria-label={t.a11y.openMenu}
              aria-expanded={drawer}
              onClick={() => setDrawer(true)}
              className="nf-icon-btn h-10 w-10 lg:hidden"
            >
              <span className="flex w-4 flex-col gap-[5px]" aria-hidden="true">
                <span className="h-[2px] w-full rounded-full bg-current" />
                <span className="h-[2px] w-3/4 rounded-full bg-current" />
                <span className="h-[2px] w-full rounded-full bg-current" />
              </span>
            </button>
            {/* On phones, sub-pages also carry the way back. */}
            {active !== "/home" && <BackButton className="h-10 w-10 lg:hidden" />}

            <span className="nf-chip hidden sm:inline-flex">
              <UiIcon name="location" size={15} />
              Lagos, Nigeria
            </span>

            <div className="flex-1" />

            <LanguageSwitcher current={locale} label={t.a11y.languageSwitcher} compact />

            <Link href="/assistant" className="nf-btn nf-btn--primary gap-2 px-3 py-2 sm:px-3.5">
              <span className="h-6 w-6 sm:h-7 sm:w-7">
                <Icon name="ai-assistant" fill />
              </span>
              <span className="hidden sm:inline">{t.nav.aiAssistant}</span>
            </Link>
          </div>
        </header>

        <div className="nf-shell py-8">{children}</div>
      </main>

      <MobileTabBar t={t} active={active} />
    </div>
  );
}
