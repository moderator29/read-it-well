import Link from "next/link";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { needsVerification, type RoleState } from "./roles";

/**
 * "You have not verified yet."
 *
 * ONE ROW. An icon, a headline, a sentence, one action. It is not a modal, it
 * does not cover anything, it has no dismiss cross, and it does not block a
 * single thing the person can otherwise do.
 *
 * WHY THOSE CONSTRAINTS ARE THE DESIGN. A seller who has applied and is waiting
 * is in a perfectly good state: they can draft listings, read their messages,
 * set up payouts. The only thing they cannot do is publish. A modal in front of
 * that person on every visit says "you are broken", which is both untrue and
 * the fastest way to teach somebody to dismiss anything we show them. A row
 * that is always there, calm, in the same place, says "this is still
 * outstanding" every time they look and costs them nothing when they are busy
 * with something else.
 *
 * It also does not go away on its own. There is no local "dismissed" flag,
 * because the only thing that should remove this is the verification
 * completing. A dismissible prompt for a mandatory step is a prompt that will
 * be dismissed once and then never seen again by the exact person who most
 * needs it.
 *
 * IT NEVER RENDERS FOR A RENTER OR BUYER. `needsVerification` is false for them
 * by construction, so this returns null and the surface has no idea it exists.
 * That is not a caller's responsibility to remember.
 *
 * A server component: it is a link and some text.
 */

export function VerifyPrompt({
  role,
  /** Where the verification flow lives. */
  href = "/verification",
  className,
}: {
  role: RoleState;
  href?: string;
  className?: string;
}) {
  if (!needsVerification(role)) return null;

  const isProfessional = role.id === "professional";

  return (
    <div className={`nf-verify-row ${className ?? ""}`}>
      <span className="nf-verify-row__mark" aria-hidden="true">
        <UiIcon name="verified" size="md" />
      </span>

      <div className="min-w-0 flex-1">
        <p className="text-[0.9375rem] font-semibold leading-snug text-[var(--nf-content-primary)]">
          {HEADLINE}
        </p>
        <p className="mt-1 text-[0.8125rem] leading-relaxed text-[var(--nf-content-secondary)]">
          {isProfessional ? BODY_PROFESSIONAL : BODY_OWNER}
        </p>
        {/*
          ONE action. A row with two is a row somebody has to make a decision
          about, and the decision here has already been made for them: there is
          exactly one thing to do next.
        */}
        <Link
          href={href}
          className="mt-2.5 inline-flex items-center gap-1 text-[0.875rem] font-semibold text-[var(--nf-content-link)] underline-offset-4 hover:underline"
        >
          {ACTION}
          <UiIcon name="arrow-right" size="sm" />
        </Link>
      </div>
    </div>
  );
}

const HEADLINE = "Finish verifying your identity";
const BODY_OWNER =
  "Your listings stay as drafts until we have confirmed who you are and that the property is yours. It takes about ten minutes.";
const BODY_PROFESSIONAL =
  "Your listings stay as drafts until we have confirmed your identity and your business. It takes about fifteen minutes.";
const ACTION = "Verify now";
