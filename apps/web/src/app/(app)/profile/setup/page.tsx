import type { Metadata } from "next";
import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { getSide } from "@/lib/side";
import { isSide, type Side } from "@/lib/side.constants";
import { AddWorkspaceChooser } from "@/components/supply/AddWorkspaceChooser";

export const metadata: Metadata = {
  title: "Add a workspace",
  robots: { index: false, follow: false },
};

/**
 * ADD A WORKSPACE: the chooser the switch profile sheet opens.
 *
 * WHAT STOOD HERE AND WHY IT CHANGED. This page offered two cards, "List or
 * sell your own property" and "Work as an agent or estate manager", reached
 * from a navigation row reading "Become an agent". The row and the page were
 * both right that a marketplace with no supply has exactly one conversion that
 * matters and that it must be findable. They were wrong about what it is.
 *
 * Most of the supply this platform now wants is landlords who are not agents
 * and never will be, and the only door into the supply side was marked
 * "become an agent". That is the whole of the defect HANDOFF 09 section 6A.2
 * names, and this page is the half of the fix that a person can see.
 *
 * WHY IT IS UNDER `/profile` AND NOT `/agent`. Everything under `/agent` is
 * role gated and the entire audience for this page is people who do not have
 * that role yet. Putting the front door of a flow inside the room it leads to
 * is how you build a page nobody can open. That reasoning is inherited from
 * what stood here and it is still right.
 *
 * THE SIDE COMES FROM THE URL AND THEN FROM THE COOKIE, the same order
 * `sideOfPath` uses everywhere else, because this route is shared by both
 * sides and the sheet that opens it already knows which one the reader is on.
 * Property offers three doors: I own the property, I am an agent, we are a
 * registered firm. Stays offers three different ones: we are a hotel, I run a
 * shortlet, we are a restaurant.
 */
export default async function AddWorkspacePage({
  searchParams,
}: {
  searchParams: Promise<{ side?: string }>;
}) {
  const [{ side: asked }, locale, cookieSide] = await Promise.all([
    searchParams,
    getLocale(),
    getSide(),
  ]);
  const t = getDictionary(locale);
  const side: Side = isSide(asked) ? asked : cookieSide;

  /* No `PageHeader`. `GOVERNING-02` draws a bare back control, the progress
     row, and then the screen's name in display type, so the chooser owns its
     whole top the way `RegisterShell` owns the top of the three forms it leads
     into. A `PageHeader` here would set that name small on the top row and
     draw a second, competing heading under it. */
  return <AddWorkspaceChooser t={t} side={side} />;
}
