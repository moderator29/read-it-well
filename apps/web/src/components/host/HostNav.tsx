"use client";

import { usePathname } from "next/navigation";
import { Chip, ChipRow } from "@/components/ui/Chip";
import { hostNavActive, hostNavItems, type HostNavLabels } from "./host-nav-model";

/**
 * The host workspace's navigation: one scrolling row of link chips under the
 * bar, on every width.
 *
 * Six destinations fit a desktop row and scroll on a phone, which is the
 * pattern the agent inbox's filters already use (`ChipRow` snaps, fades the
 * cut edge and bleeds to the screen edge), so the host learns nothing new. A
 * client component only for `usePathname`: `HostShell` is rendered by every
 * host page and none of them had to be told which one it is.
 */
export function HostNav({ labels }: { labels: HostNavLabels }) {
  const label = labels.workspace;
  const active = hostNavActive(usePathname());
  return (
    <nav
      aria-label={label}
      className="px-gutter pb-xs lg:hidden"
      /* The rail bleeds by the same gutter this nav is padded with. */
      style={{ "--nf-chiprow-bleed": "var(--nf-pad-shell)" } as React.CSSProperties}
    >
      <ChipRow label={label}>
        {hostNavItems(labels).map((item) => (
          <Chip
            key={item.href}
            behaviour="link"
            href={item.href}
            icon={item.icon}
            size="sm"
            selected={item.href === active}
          >
            {item.label}
          </Chip>
        ))}
      </ChipRow>
    </nav>
  );
}
