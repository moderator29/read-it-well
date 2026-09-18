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
}: {
  children: ReactNode;
  fallback?: string;
  logoLabel: string;
}) {
  return (
    <div className="nf-host">
      <header className="nf-glass nf-glass--chrome nf-safe-top sticky top-0 z-40">
        <div className="flex h-header-sm items-center gap-inline px-gutter sm:h-header">
          <BackButton fallback={fallback} className="h-10 w-10 shrink-0" />
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
