import type { Dictionary } from "@vallo/i18n";
import { BrandIcon } from "@/design-system/icons/BrandIcon";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { ButtonLink } from "@/components/ui/Button";
import { AuthGate } from "@/components/auth/AuthGate";

/**
 * The agent card of 9E8B56ED, with what the product can honestly say.
 *
 * The render shows a named agent with a star rating and a review count. The
 * listing read does not carry the agent's name or a rating, so neither is
 * invented: the card names the role, the "Verified agent" pill appears only
 * when a person checked them, and the control is the real one, the
 * conversation. A phone number is never printed; the conversation is where
 * the platform protects both sides.
 */
export function ListingAgentCard({
  verified,
  t,
  messageHref,
  name,
}: {
  verified: boolean;
  t: Dictionary;
  messageHref: string;
  /** The agent's display name, when the read carries one. */
  name?: string | null;
}) {
  const copy = t.catalogue.detail;
  return (
    <div className="nf-agent-card" data-testid="agent-card">
      <span className="nf-agent-card__avatar" aria-hidden="true">
        <BrandIcon name="user-check" fill />
      </span>
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-inline-tight">
          <span className="nf-body font-semibold text-[var(--nf-content-primary)]">
            {name ?? copy.agentRole}
          </span>
          {verified && (
            <span className="nf-agent-card__pill">
              <UiIcon name="verified" size={11} />
              {copy.verifiedAgent}
            </span>
          )}
        </p>
        <p className="nf-caption mt-3xs text-[var(--nf-content-muted)]">
          {verified ? `${t.common.verified} before this listing went live` : "Manages this listing on Vallo"}
        </p>
      </div>
      <AuthGate action="message">
        <ButtonLink href={messageHref} variant="secondary" leadingIcon="chat-bubble" className="shrink-0">
          {copy.message}
        </ButtonLink>
      </AuthGate>
    </div>
  );
}
