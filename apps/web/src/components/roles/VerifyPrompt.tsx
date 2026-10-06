import Link from "next/link";
import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { Icon3D } from "@/components/ui/Icon3D";
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
 * A server component: it is a link and some text. Its words are in the
 * locale files (`experienceSpeed.verifyPrompt`, Session 3 W13), not in this
 * file, so a Hausa or Yoruba reader falls back to English through the one
 * fallback path rather than through a string the translators never see; the
 * locale is read only once the row is known to draw, so a renter's page
 * pays nothing for it.
 */

export async function VerifyPrompt({
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
  const copy = getDictionary(await getLocale()).experienceSpeed.verifyPrompt;

  return (
    <div className={`nf-verify-row ${className ?? ""}`}>
      {/* The founder's 3D ID card (30 September): this row is a door to
          the identity step, so it carries the object, 48px in a fixed box. */}
      <span className="grid size-12 shrink-0 place-items-center" aria-hidden="true" data-art="id-check">
        <Icon3D name="id-check" size={48} />
      </span>

      <div className="min-w-0 flex-1">
        <p className="text-[length:var(--nf-text-row)] font-semibold leading-snug text-[var(--nf-content-primary)]">
          {copy.headline}
        </p>
        <p className="mt-3xs text-[length:var(--nf-text-caption)] leading-relaxed text-[var(--nf-content-secondary)]">
          {isProfessional ? copy.bodyProfessional : copy.bodyOwner}
        </p>
        {/*
          ONE action. A row with two is a row somebody has to make a decision
          about, and the decision here has already been made for them: there is
          exactly one thing to do next.
        */}
        <Link
          href={href}
          className="mt-sm inline-flex min-h-[44px] items-center gap-2xs text-[length:var(--nf-text-body-sm)] font-semibold text-[var(--nf-content-link)] underline-offset-4 hover:underline"
        >
          {copy.action}
          <UiIcon name="arrow-right" size="sm" />
        </Link>
      </div>
    </div>
  );
}
