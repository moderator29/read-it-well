import { Icon } from "@/design-system/icons/Icon";

/**
 * Wallet security note.
 *
 * States plainly how wallet money is protected and what ships with launch, so
 * the surface sets expectations honestly instead of implying protections that
 * are not live yet.
 */
export function SecurityNote() {
  return (
    <div className="nf-card flex items-start gap-3 p-4">
      <span className="h-7 w-7 shrink-0">
        <Icon name="secure" fill />
      </span>
      <p className="leading-tight">
        <span className="block text-[0.875rem] font-semibold">Your money is protected</span>
        <span className="mt-1 block text-[0.78rem] leading-relaxed text-[var(--nf-content-muted)]">
          Wallet writes happen only on our servers, never from a browser, and every movement is
          recorded in a permanent ledger. A transaction PIN and two-factor authentication ship with
          launch.
        </span>
      </p>
    </div>
  );
}
