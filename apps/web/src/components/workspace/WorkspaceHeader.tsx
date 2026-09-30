import Link from "next/link";
import type { ReactNode } from "react";
import { BackButton } from "@/components/site/BackButton";
import { UiIcon } from "@/design-system/icons/UiIcon";

/**
 * THE ONE HEADER EVERY WORKSPACE DRAWS: the agent, landlord and firm console
 * (`AgentShell`) and the host console for hotels, shortlets, guest houses and
 * restaurants (`HostShell`).
 *
 * Back, the menu toggle, the page's own title, and the bell. Nothing else.
 *
 * WHAT WENT, AND WHY (founder, 29 September 2026, reference 24). The bar
 * carried the Vallo lockup, a centre pill naming the workspace, a boxed bell
 * and an "EN" select. Inside a workspace the lockup is the one thing a member
 * does not need told, the pill repeated what the drawer already says, and a
 * language picker in a working bar is a setting that belongs in Settings
 * (the only place it now exists). What is left is what a person uses every
 * minute: the way back, the way round the workspace, where they are, and
 * whether anything needs them.
 *
 * THE BELL is reference 23's: a bold line glyph, no plate behind it, and a
 * small dot when something is unread. The dot is a fact read on the server
 * (`getShellIdentity`), never a decoration, and the accessible name says the
 * count so a screen reader hears what the dot shows.
 *
 * A server component with no hooks, so both shells render it directly; the
 * menu toggle is passed in because each workspace's drawer carries its own
 * rows.
 */
export function WorkspaceHeader({
  back,
  menu,
  title,
  bell,
  end,
  children,
}: {
  /** Where back falls to when there is no proven previous screen. False draws none. */
  back: string | false;
  /** The drawer toggle, when the workspace has one on this width. */
  menu?: ReactNode;
  /** The page's name in this workspace. The page's own h1 keeps its heading. */
  title: ReactNode;
  bell: { href: string; label: string; unreadLabel?: string; unread: number };
  /** Anything a workspace must add at the right, before the bell. Keep it rare. */
  end?: ReactNode;
  /** A row under the bar (the host's destinations). */
  children?: ReactNode;
}) {
  const marked = bell.unread > 0;
  return (
    /* A NAVY ISLAND IN BOTH THEMES (founder, 29 September 2026: light mode
       mixes dark navy islands, the header first). `data-theme="dark"` gives
       everything inside the night palette, so back, the title and the bell
       are white on navy in light exactly as on the app header; light.css
       paints the solid ground. The drawer is a portalled Sheet, so it keeps
       the page's theme. */
    <header
      data-theme="dark"
      className="nf-ws-bar nf-glass nf-glass--chrome nf-safe-top sticky top-0 z-40"
    >
      <div className="nf-ws-bar__row">
        {back !== false ? <BackButton fallback={back} className="nf-ws-bar__btn" /> : null}
        {menu}
        <p className="nf-ws-bar__title">{title}</p>
        {end}
        <Link
          href={bell.href}
          aria-label={
            marked && bell.unreadLabel
              ? bell.unreadLabel.replace("{count}", String(bell.unread))
              : bell.label
          }
          className="nf-ws-bell nf-icon-btn nf-icon-btn--round nf-tap"
          data-unread={marked ? "" : undefined}
        >
          <UiIcon name="bell" size={24} className="nf-ws-bell__glyph" />
          {marked ? <span aria-hidden="true" className="nf-ws-bell__dot" /> : null}
        </Link>
      </div>
      {children}
    </header>
  );
}
