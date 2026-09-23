import type { ReactNode } from "react";
import Link from "next/link";
import type { Dictionary } from "@vallo/i18n";
import { LogoMark } from "@/design-system/brand/Logo";
import { UiIcon } from "@/design-system/icons/UiIcon";
import {
  AdminRail,
  AdminRailFoot,
  AdminTabs,
  ConsoleSearch,
  IdentityBlock,
  type AdminIdentity,
} from "./AdminNav";
import { ConsoleClock } from "./ConsoleClock";

/**
 * The console chrome, drawn from what the layout hands it and nothing else,
 * so the access gate and the reads stay in `admin/layout.tsx` and the frame
 * can be drawn on its own.
 */
export function AdminFrame({
  identity,
  counts,
  unread,
  navLabel,
  navLabels,
  searchLabel,
  bellLabel,
  shell,
  children,
}: {
  identity: AdminIdentity;
  counts: Record<string, number>;
  unread: number;
  navLabel: string;
  navLabels?: Dictionary["admin"]["nav"];
  searchLabel: string;
  bellLabel: string;
  /** The console's own copy (`admin.shell`), in the reader's language. */
  shell?: Dictionary["admin"]["shell"];
  children: ReactNode;
}) {
  const badges = counts;
  const brand = (
    <Link href="/admin" className="nf-admin-brand" aria-label={shell?.nav.brandHome ?? "Vallo console overview"}>
      <LogoMark size={40} />
      <span className="nf-admin-brand__word" aria-hidden="true">
        Vallo
      </span>
    </Link>
  );

  return (
    <div className="nf-admin">
      {/* The rail is a full-height lit column as every render draws it: the
          aside stretches the whole page, and its contents ride a sticky inner
          column the viewport's height, so Settings and the operator stay
          pinned at the foot however far the desk scrolls. */}
      <aside className="nf-admin-rail" aria-label={navLabel}>
        <div className="nf-admin-rail__inner">
          <div className="nf-admin-rail__brand">{brand}</div>
          <div className="nf-admin-rail__scroll">
            <AdminRail counts={badges} labels={navLabels} navLabel={navLabel} shell={shell} />
          </div>
          <AdminRailFoot identity={identity} counts={badges} shell={shell} />
        </div>
      </aside>

      <div className="nf-admin-main">
        <header className="nf-admin-bar nf-safe-top">
          <AdminTabs
            counts={badges}
            labels={navLabels}
            shell={shell}
            navLabel={navLabel}
            identity={identity}
            brand={brand}
          />
          <span className="nf-admin-bar__brand">{brand}</span>
          <ConsoleSearch label={searchLabel} placeholder={shell?.bar.search ?? "Search anything..."} />
          <span className="nf-admin-bar__spacer" />
          <ConsoleClock />
          <Link
            href="/notifications"
            className="nf-admin-icon-btn nf-admin-bell"
            aria-label={
              unread > 0
                ? `${bellLabel}, ${unread} unread`
                : bellLabel
            }
          >
            <UiIcon name="bell" size={20} />
            {unread > 0 && <span className="nf-admin-bell__dot" aria-hidden="true" />}
          </Link>
          <span className="nf-admin-bar__me">
            <IdentityBlock identity={identity} compact />
          </span>
        </header>

        <main id="main" className="nf-admin-body">
          {children}
        </main>
      </div>
    </div>
  );
}
