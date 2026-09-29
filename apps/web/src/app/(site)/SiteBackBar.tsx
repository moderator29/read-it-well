"use client";

import { usePathname } from "next/navigation";
import { BackButton } from "@/components/site/BackButton";
import { parentOf } from "@/lib/nav/resolve";

/**
 * The way back, on the public site.
 *
 * FOURTEEN ROUTES DECLARED A PARENT AND DREW NOTHING. `/about`, `/privacy`,
 * `/terms`, `/help`, `/safety`, `/standards`, `/eula`, `/careers`, `/contact`,
 * `/cancellations`, `/delete-account`, `/styleguide`, `/docs` and
 * `/docs/[slug]` all sit in `lib/nav/route-parents.ts` with `/` above them, and
 * not one of them mounted a control. The hierarchy was written down and then
 * never drawn, which from the reader's side is indistinguishable from there
 * being no hierarchy at all: a person who opened the privacy policy from an
 * email, or `/docs/listings` from a search engine, had the browser's own
 * history behind them and nothing of ours.
 *
 * ONE MOUNT, IN THE LAYOUT, RATHER THAN FOURTEEN EDITS. The `(site)` group is
 * exactly those fourteen pages; the landing page is `app/(landing)/page.tsx` and sits
 * OUTSIDE the group, so nothing here can put a back control on the root of the
 * site. A future page added to the group inherits the control on the day it is
 * added rather than on the day somebody notices.
 *
 * IT ASKS THE MAP RATHER THAN ASSUMING. `parentOf` is the same resolver the
 * control itself runs, so a route in this group with no declared parent, or one
 * marked `ROOT`, draws nothing at all. That is the second half of the rule this
 * directory exists for: a back control belongs on a screen with a parent, and
 * on no other kind of screen. A blanket arrow on every page in a group would be
 * the same guess as `router.back()`, one layer up.
 *
 * `fallback` is handed the resolved parent deliberately. `useBack` ignores it
 * whenever the route is declared, which is always here; passing it means that
 * if this component is ever mounted somewhere undeclared it still leads
 * somewhere sensible rather than to `/home`, which on the public site is behind
 * the sign-in wall.
 */
export function SiteBackBar() {
  const pathname = usePathname();
  const target = parentOf(pathname ?? "/");
  if (target.kind !== "parent") return null;

  return (
    <div className="nf-shell pt-sm">
      <BackButton fallback={target.href} />
    </div>
  );
}
