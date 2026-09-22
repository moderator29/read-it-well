import type { Dictionary } from "@vallo/i18n";
import { BrandIcon } from "@/design-system/icons/BrandIcon";
import { ButtonLink } from "@/components/ui/Button";
import { AuthGate } from "@/components/auth/AuthGate";
import { VerifiedAgentBadge } from "./VerifiedAgentBadge";
import { ListerRoleLine } from "./ListerRoleLine";
import type { ListingRole } from "@/lib/supply/roles";

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
  listingRole,
}: {
  verified: boolean;
  t: Dictionary;
  messageHref: string;
  /** The agent's display name, when the read carries one. */
  name?: string | null;
  /**
   * WHAT THE LISTER IS TO THIS PROPERTY: `listings.listing_role`.
   *
   * Optional, and the card draws exactly what it drew before when it is
   * absent. That is deliberate rather than lazy: the column is live in the
   * database as of Track G migration 3, but the listing READ that would carry
   * it from the row to this prop lives in `lib/listings/types.ts` and
   * `lib/listings/supabase-repository.ts`, which are another group's files.
   * A prop that is absent draws nothing; a prop that is filled draws the
   * sentence. Nothing here guesses.
   */
  listingRole?: ListingRole | null;
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
          {/* The badge opens the ladder rather than standing there being
              trusted. See `VerifiedAgentBadge`: the one claim the product
              rests on had nowhere to go from the screen where it matters. */}
          {verified && <VerifiedAgentBadge label={copy.verifiedAgent} />}
        </p>
        {/*
          WHO PUT IT UP, ABOVE WHAT WE CHECKED ABOUT THEM.
          The role is the offer and the badge is the check, and the reader
          wants them in that order. Neither is allowed to imply the other:
          "Listed by the owner" says nothing about whether anybody looked at a
          document, and the verified badge still means a checked human only.
        */}
        {listingRole ? <ListerRoleLine role={listingRole} name={name} className="mt-3xs" /> : null}
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
