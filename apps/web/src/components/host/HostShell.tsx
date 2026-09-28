import Link from "next/link";
import type { ReactNode } from "react";
import { BackButton } from "@/components/site/BackButton";
import { LogoMark } from "@/design-system/brand/Logo";
import { HostNav } from "./HostNav";
import { HOST_DASHBOARD } from "./host-nav-model";

/**
 * The Host surfaces' shell: the glass chrome with the way back, the lockup
 * and the row of host destinations (`HostNav`), then a single column. The
 * lockup goes to the host overview, not the consumer home: inside a
 * workspace the mark is the way to that workspace's front page, as the agent
 * rail's is. The wizard lives outside the consumer shell
 * on purpose, as the agent application does: a person in the middle of
 * uploading their CAC certificate does not need the dock under their thumb.
 */
export function HostShell({
  children,
  fallback = "/home",
  chromeBack = true,
  nav = chromeBack,
}: {
  children: ReactNode;
  fallback?: string;
  /**
   * @deprecated The mark now leads to the host overview and names itself so;
   * a "Vallo home" label on it would announce the wrong destination. Still
   * accepted so the host pages need no edit.
   */
  logoLabel?: string;
  /**
   * Whether the chrome bar draws its own way back.
   *
   * IT IS OFF FOR THE WIZARD AND THE REASON IS A COUNT. `GOVERNING-09` through
   * `GOVERNING-11` draw exactly ONE back control on a set-up screen, inline
   * with the progress segments, and the first shot of these panels came back
   * with two arrows stacked eight pixels apart: this one, which leaves the
   * flow, and the drawn one, which steps back through it. Two arrows in a
   * column is not a choice a person can make confidently. The wizard's own
   * head carries the single control and walks out of the flow when there is
   * no previous step, so nothing is lost.
   */
  chromeBack?: boolean;
  /**
   * Whether the bar carries the row of host destinations. Follows
   * `chromeBack` unless told otherwise: the flows that draw their own single
   * control (the wizard) are the ones a person should finish rather than
   * wander out of, so they get neither.
   */
  nav?: boolean;
}) {
  return (
    <div className="nf-host">
      <header className="nf-glass nf-glass--chrome nf-safe-top sticky top-0 z-40">
        <div className="flex h-header-sm items-center gap-inline px-gutter sm:h-header">
          {chromeBack ? (
            <BackButton fallback={fallback} className="h-10 w-10 shrink-0" />
          ) : null}
          <Link href={HOST_DASHBOARD} aria-label="Host overview">
            <LogoMark size={30} />
          </Link>
          <span className="nf-caption ml-inline-tight font-semibold text-[var(--nf-brand-secondary)]">Host</span>
        </div>
        {nav ? <HostNav label="Host workspace" /> : null}
      </header>
      <main id="main" className="nf-host__body">
        {children}
      </main>
    </div>
  );
}
