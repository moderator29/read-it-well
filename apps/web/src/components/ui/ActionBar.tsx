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
  glow = false,
  leading,
  className,
}: {
  children: ReactNode;
  aboveTabBar?: boolean;
  /**
   * The listing render's bar: the top edge is the brand rim and the bar
   * blooms upward into the content above it. Off by default; a screen
   * matching a render switches it on.
   */
  glow?: boolean;
  /**
   * The block at the bar's leading edge, before the buttons: the render's
   * price figure with its label beneath. `figure` is already formatted (money
   * only ever through `formatMoney`); the bar never touches a number.
   */
  leading?: { figure: ReactNode; label?: string };
  className?: string;
}) {
  return (
    <div
      className={[
        "nf-glass nf-glass--strong nf-action-bar-pinned",
        glow ? "nf-action-bar-pinned--lit" : "",
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
      <div className="nf-shell flex items-center gap-row px-gutter py-sm">
        {leading ? (
          <div className="nf-action-bar__lead">
            <span className="nf-action-bar__lead-figure">{leading.figure}</span>
            {leading.label ? (
              <span className="nf-action-bar__lead-label">{leading.label}</span>
            ) : null}
          </div>
        ) : null}
        {children}
      </div>
    </div>
  );
}
