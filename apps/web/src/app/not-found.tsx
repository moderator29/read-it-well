import Link from "next/link";
import { Icon3D } from "@/design-system/icons/Icon3D";
import { LogoMark } from "@/design-system/brand/Logo";

/**
 * 404.
 *
 * Says what happened and offers the next step, per the no dead ends rule.
 * Deliberately static so it renders even when data sources are unavailable.
 */
export default function NotFound() {
  return (
    <main
      id="main"
      className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-5 text-center"
    >
      <div className="nf-aurora" aria-hidden="true" />

      <div className="relative z-10">
        <Link href="/" aria-label="NaijaFinds home">
          <LogoMark size={64} />
        </Link>

        <p className="nf-numeric nf-display mt-6 nf-gradient-text">404</p>

        <h1 className="nf-h2 mt-2">We could not find that page</h1>
        <p className="mx-auto mt-3 max-w-[42ch] text-[var(--nf-content-secondary)]">
          The link may be out of date, or the page may have moved. Discovery is still
          waiting for you.
        </p>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/" className="nf-btn nf-btn--primary nf-btn--lg">
            Back to home
          </Link>
          <Link href="/search" className="nf-btn nf-btn--glass nf-btn--lg gap-2">
            <Icon3D name="search" size={20} variant="bare" />
            Search
          </Link>
        </div>
      </div>
    </main>
  );
}
