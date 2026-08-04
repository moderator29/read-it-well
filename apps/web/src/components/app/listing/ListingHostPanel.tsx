import type { Dictionary } from "@naijafinds/i18n";
import { BrandIcon } from "@/design-system/icons/BrandIcon";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { ButtonLink } from "@/components/ui/Button";

/**
 * Host panel.
 *
 * Agent accounts are not connected to listings yet, so this panel shows only
 * what is true today: the listing's verification status and how to reach the
 * agent. The display name and member since rows are rendered structurally with
 * honest values rather than a fabricated identity (Master Rule 8: seed data
 * is declared, never disguised). Real agent profiles slot straight in when the
 * agent repository joins listings to their owners.
 */
export function ListingHostPanel({
  verified,
  t,
  messageHref = "/messages",
}: {
  verified: boolean;
  t: Dictionary;
  /** Deep link into the conversation about this listing, when one exists. */
  messageHref?: string;
}) {
  return (
    <div className="nf-card p-5">
      <div className="flex items-center gap-4.5">
        <span className="block h-14 w-14 shrink-0">
          <BrandIcon name="user-check" fill />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[0.9375rem] font-semibold text-[var(--nf-content-primary)]">
            RentMe partner agent
          </p>
          <p className="mt-0.5 truncate text-[0.78rem] text-[var(--nf-content-muted)]">
            Manages this listing on RentMe
          </p>
        </div>
        {verified && (
          <span className="nf-badge nf-badge--success shrink-0">
            <UiIcon name="verified" size={12} strokeWidth={2.1} />
            {t.common.verified}
          </span>
        )}
      </div>

      <dl className="mt-4 grid gap-2 border-t border-[var(--nf-border-subtle)] pt-4 text-[0.8125rem]">
        {verified && (
          <div className="flex items-center justify-between gap-4">
            <dt className="text-[var(--nf-content-muted)]">Identity</dt>
            <dd className="font-semibold text-[var(--nf-content-secondary)]">
              Checked before going live
            </dd>
          </div>
        )}
        <div className="flex items-center justify-between gap-4">
          <dt className="shrink-0 text-[var(--nf-content-muted)]">Member since</dt>
          <dd className="text-right text-[var(--nf-content-secondary)]">
            Shown when the agent profile connects
          </dd>
        </div>
      </dl>

      <ButtonLink href={messageHref} variant="secondary" full className="mt-4">
        Message agent
      </ButtonLink>
    </div>
  );
}
