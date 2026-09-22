import Link from "next/link";
import type { ReactNode } from "react";
import { BackButton } from "@/components/site/BackButton";
import { LogoMark } from "@/design-system/brand/Logo";

/**
 * The Host surfaces' shell: the glass chrome with the way back and the
 * lockup, then a single column. The wizard lives outside the consumer shell
 * on purpose, as the agent application does: a person in the middle of
 * uploading their CAC certificate does not need the dock under their thumb.
 */
export function HostShell({
  children,
  fallback = "/home",
  logoLabel,
  chromeBack = true,
}: {
  children: ReactNode;
  fallback?: string;
  logoLabel: string;
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
}) {
  return (
    <div className="nf-host">
      <header className="nf-glass nf-glass--chrome nf-safe-top sticky top-0 z-40">
        <div className="flex h-header-sm items-center gap-inline px-gutter sm:h-header">
          {chromeBack ? (
            <BackButton fallback={fallback} className="h-10 w-10 shrink-0" />
          ) : null}
          <Link href="/" aria-label={logoLabel}>
            <LogoMark size={30} />
          </Link>
          <span className="nf-caption ml-inline-tight font-semibold text-[var(--nf-brand-secondary)]">Host</span>
        </div>
      </header>
      <main id="main" className="nf-host__body">
        {children}
      </main>
    </div>
  );
}
