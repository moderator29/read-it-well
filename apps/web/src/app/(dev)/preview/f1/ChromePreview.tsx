"use client";

import type { Dictionary } from "@vallo/i18n";
import { AppShell } from "@/components/app/AppShell";
import type { Side } from "@/lib/side.constants";

/**
 * The chrome, on a stage, so it can be photographed.
 *
 * `AppShell` reads two things from the browser that a screenshot harness
 * cannot set: the current route, and whether the side drawer is open. The
 * harness loads a URL and shoots, so without this the drawer - the largest
 * surface F1 owns and the one with a governing reference image of its own
 * (`docs/design/references/BCD39CA8...`) - could never be held beside that
 * image at all. `preview` is the shell's one dev-only prop and this is its
 * only call site.
 *
 * The content behind the chrome is deliberately plain: the point of these
 * pages is the header, the dock and the drawer, and a busy page would make it
 * harder to see what the glass is doing rather than easier. It is REAL
 * content shapes (cards on the shared ladder) rather than grey boxes, so the
 * blur and the lit edges have something honest to sit over.
 */
export function ChromePreview({
  t,
  route,
  side = "property",
  drawer = false,
  signedIn = true,
}: {
  t: Dictionary;
  route: string;
  side?: Side;
  drawer?: boolean;
  signedIn?: boolean;
}) {
  return (
    <AppShell
      t={t}
      side={side}
      userName="Seyifunmi"
      userHandle="seyifunmi"
      unreadNotifications={5}
      signedIn={signedIn}
      isAgent
      preview={{ route, drawer }}
    >
      <div className="flex flex-col gap-md">
        <h1 className="nf-h2">{t.nav.home}</h1>
        {["Lekki Phase 1, Lagos", "Ikoyi, Lagos", "Maitama, Abuja"].map((where) => (
          <article key={where} className="nf-glass nf-glass--card p-md">
            <h2 className="nf-h4">{where}</h2>
            <p className="nf-body-sm mt-2xs text-[var(--nf-content-secondary)]">
              A card on the shared glass ladder, so the chrome above and below it has a
              real surface to float over.
            </p>
          </article>
        ))}
      </div>
    </AppShell>
  );
}
