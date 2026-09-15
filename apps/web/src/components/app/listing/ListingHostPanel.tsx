import type { Dictionary } from "@naijafinds/i18n";
import { BrandIcon } from "@/design-system/icons/BrandIcon";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { ButtonLink } from "@/components/ui/Button";
import { AuthGate } from "@/components/auth/AuthGate";
import { ICON, TYPE } from "@/components/app/Screen";

/**
 * Who listed this place, and how to reach them.
 *
 * Agent accounts are not connected to listings yet, so this states only what is
 * true today: that a Vallo agent manages the listing, whether the listing
 * carries our verification, and the one control that reaches them. Real agent
 * profiles slot straight in when the agent repository joins listings to their
 * owners.
 *
 * ---------------------------------------------------------------------------
 * TWO CHANGES, AND THE SECOND ONE IS A JUDGEMENT CALL.
 *
 * First, the surface. This was an `.nf-card` inside the detail page's glass
 * content sheet, containing a `border-t` block of its own: three surfaces deep
 * around two sentences. It is now a section on the ground, with the heading
 * supplied by the page.
 *
 * Second, a row went. There was a definition row reading "Member since / Shown
 * when the agent profile connects", which is a developer's note about our own
 * schema wearing the costume of a fact about a person. A reader learns nothing
 * from it, and a row whose value is an explanation of why there is no value is
 * worse than no row. That is not a capability being removed - nothing was ever
 * reachable through it - it is a placeholder being retired. What IS true about
 * the agent is still stated, and the moment the profile join lands, the real
 * name, the real join date and the real response time belong here.
 * ---------------------------------------------------------------------------
 */
export function ListingHostPanel({
  verified,
  t,
  messageHref = "/messages",
}: {
  verified: boolean;
  t: Dictionary;
  /** The route that finds or opens the thread about this listing. */
  messageHref?: string;
}) {
  return (
    <div>
      <div className="flex items-center gap-4">
        <span className="block h-16 w-16 shrink-0">
          <BrandIcon name="user-check" fill />
        </span>
        <div className="min-w-0 flex-1">
          <p className={TYPE.rowTitle}>Vallo partner agent</p>
          <p className={`mt-1 ${TYPE.rowMeta}`}>Manages this listing on Vallo</p>
          {verified && (
            <p className={`mt-2 flex items-center gap-2 ${TYPE.body}`}>
              <UiIcon
                name="verified"
                size={ICON.inline}
                className="shrink-0 text-[var(--nf-status-verified)]"
              />
              <span className="font-medium text-[var(--nf-content-secondary)]">
                {t.common.verified} before this listing went live
              </span>
            </p>
          )}
        </div>
      </div>

      {/* Contacting the person who listed the place is an action, so it gates
          and carries the intent home with it: signing in lands the reader back
          in this conversation rather than on a generic screen. */}
      <AuthGate action="message">
        <ButtonLink href={messageHref} variant="secondary" full className="mt-5">
          Message agent
        </ButtonLink>
      </AuthGate>
    </div>
  );
}
