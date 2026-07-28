"use client";

import { useRouter } from "next/navigation";
import { UiIcon } from "@/design-system/icons/UiIcon";

/**
 * Page header with the platform back flow.
 *
 * The pattern every big app uses: the back control lives at the top left OF THE
 * PAGE, next to its title, not floating in the global chrome. Back returns to
 * the previous in-app screen when one exists in this session's history
 * (Next.js tracks the index in history.state), and otherwise falls through to
 * `fallback`, so a deep link or fresh tab never strands the user or bounces
 * them out of the product.
 */
export function PageHeader({
  title,
  subtitle,
  fallback = "/home",
  backLabel = "Back",
  actions,
}: {
  title: string;
  subtitle?: string;
  fallback?: string;
  backLabel?: string;
  actions?: React.ReactNode;
}) {
  const router = useRouter();

  const back = () => {
    const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0;
    if (idx > 0) router.back();
    else router.push(fallback);
  };

  return (
    <div className="mb-5 flex items-center gap-3 sm:mb-6">
      <button type="button" aria-label={backLabel} onClick={back} className="nf-icon-btn h-9 w-9 sm:h-10 sm:w-10">
        <UiIcon name="arrow-left" size={17} />
      </button>
      <div className="min-w-0 flex-1">
        <h1 className="nf-h2 truncate">{title}</h1>
        {subtitle && (
          <p className="mt-0.5 truncate text-[0.8125rem] text-[var(--nf-content-muted)]">{subtitle}</p>
        )}
      </div>
      {actions}
    </div>
  );
}
