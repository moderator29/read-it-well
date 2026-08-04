import type { ReactNode } from "react";

/**
 * The pinned action bar.
 *
 * References 3, 4, 8 and 11 all end the same way: the decision lives in a bar
 * welded to the bottom edge, blurred, with the content scrolling underneath it,
 * and it carries either one full-width primary or a ghost + solid pair.
 *
 * The platform had this shape exactly once, in the filter drawer. The listing
 * wizard's footer was fully solid, checkout had no pinned bar at all, and the
 * listing page's price bar was a floating card rather than a bar. Everything
 * else pushed its CTA into the document flow, where it scrolls away.
 *
 * This is deliberately the only way to pin a CTA. It owns three things call
 * sites kept getting wrong: the blur (so content reads as passing beneath),
 * the home-indicator inset, and the stacking level relative to the tab bar.
 */
export function ActionBar({
  children,
  /**
   * Set when the bar sits on a route that also shows the floating tab bar, so
   * it lifts clear of it. Off for immersive routes and full-screen flows, which
   * have no tab bar to avoid.
   */
  aboveTabBar = false,
  className,
}: {
  children: ReactNode;
  aboveTabBar?: boolean;
  className?: string;
}) {
  return (
    <div
      className={[
        "nf-glass nf-glass--strong nf-action-bar-pinned",
        "fixed inset-x-0 bottom-0 z-50",
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={
        aboveTabBar
          ? { paddingBottom: "var(--nf-tabbar-clearance)" }
          : undefined
      }
    >
      <div className="nf-shell flex items-center gap-3 px-4 py-3 sm:px-5">{children}</div>
    </div>
  );
}
