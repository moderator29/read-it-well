import type { Dictionary } from "@vallo/i18n/core";
import { BrandIcon } from "@/design-system/icons/BrandIcon";
import { ButtonLink } from "@/components/ui/Button";
import { AuthGate } from "@/components/auth/AuthGate";
import { VerifiedAgentBadge } from "./VerifiedAgentBadge";
import { ListerRoleLine } from "./ListerRoleLine";
import { listerHeading } from "./lister-role";
import type { ListingRole } from "@/lib/supply/roles";

/**
 * The agent card of 9E8B56ED, with what the product can honestly say.
 *
 * The render shows a named agent with a star rating and a review count. The
 * listing read carries no rating for a lister, so that is not invented: the
 * "Verified agent" pill appears only when a person checked them, and the
 * control is the real one, the conversation. A phone number is never printed;
 * the conversation is where the platform protects both sides.
 *
 * ---------------------------------------------------------------------------
 * THE HEADING USED TO CONTRADICT THE LINE UNDER IT, ON EVERY OWNER LISTING
 *
 * The name fallback was `t.catalogue.detail.agentRole`, the words "Agent on
 * Vallo", printed for EVERY listing whatever its `listing_role`. On an owner's
 * listing that put "Agent on Vallo" directly above "Listed by the owner". One
 * of those two sentences is false on every owner listing, and it was the one
 * drawn in the heavier weight at the top of the card.
 *
 * So the fallback now MATCHES THE ROLE, and where a role has no honest noun it
 * prints nothing rather than a wrong one:
 *
 *   agent   "Agent on Vallo", which is exactly what that listing is.
 *   owner   NOTHING. There is no honest noun that is not simply a repeat of
 *           "Listed by the owner" on the line below, and the owner sentence
 *           names nobody on purpose: the offer IS that there is no
 *           intermediary.
 *   firm    NOTHING. We know it is a firm and not WHICH firm, "Agent on Vallo"
 *           is false, and a generic "registered firm" would borrow a
 *           trust word for a claim no member of staff has checked yet.
 *           `listing_role` stays a claim until `ownership_verified_at` or
 *           `mandate_verified_at` is dated beside it.
 *
 * AND WHEN THE ROLE IS ABSENT THE CARD DRAWS EXACTLY WHAT IT DREW BEFORE. A
 * listing with no `listingRole` is the seed catalogue or an external shape,
 * which is the pre Track G state; changing that would be a regression dressed
 * as a fix, on surfaces this change was never about.
 *
 * ---------------------------------------------------------------------------
 * A NAME IS NOT A CHECK
 *
 * When `name` is present it is the heading, and it comes from
 * `public.listing_lister`, which publishes a display name and nothing else. It
 * says WHO, never whether anybody verified them. The badge beside it is the
 * only thing on this card that means a person here looked at a document.
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
  /** The lister's display name, when the read carries one. */
  name?: string | null;
  /**
   * WHAT THE LISTER IS TO THIS PROPERTY: `listings.listing_role`.
   *
   * Optional, and the card draws exactly what it drew before when it is
   * absent. That is deliberate rather than lazy: the seed catalogue and the
   * external shapes have no such column, and a listing that cannot say what
   * its lister is must not be given a noun by this component.
   */
  listingRole?: ListingRole | null;
}) {
  const copy = t.catalogue.detail;
  /* THE RULE LIVES IN `lister-role.ts` AND NOT HERE, because nothing that
     imports a `.tsx` file can be tested under this vitest config, and a rule
     that can only be grepped for is a rule that drifts. */
  const heading = listerHeading(listingRole, name, copy.agentRole);

  return (
    <div
      className="nf-agent-card"
      data-testid="agent-card"
      /* THE AGENT NOUN, CARRIED SO A PROOF DOES NOT HAVE TO HARDCODE IT.
         `scripts/probes/track_g_the_sentence_on_a_screen.mjs` asserts the
         NEGATIVE on an owner's listing: that this noun appears nowhere on the
         card. A harness holding its own copy of the words would keep passing
         after a copy change, which is the blind light this whole track has
         produced three times. It reads the noun off the page instead. */
      data-agent-noun={copy.agentRole}
    >
      <span className="nf-agent-card__avatar" aria-hidden="true">
        <BrandIcon name="user-check" fill />
      </span>
      <div className="min-w-0 flex-1">
        {/* The paragraph is dropped entirely when there is neither a heading
            nor a badge, so an owner's card does not carry an empty line where
            a name used to be. */}
        {(heading !== null || verified) && (
          <p className="flex flex-wrap items-center gap-inline-tight">
            {heading !== null && (
              <span className="nf-body font-semibold text-[var(--nf-content-primary)]">
                {heading}
              </span>
            )}
            {/* The badge opens the ladder rather than standing there being
                trusted. See `VerifiedAgentBadge`: the one claim the product
                rests on had nowhere to go from the screen where it matters. */}
            {verified && <VerifiedAgentBadge label={copy.verifiedAgent} />}
          </p>
        )}
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
